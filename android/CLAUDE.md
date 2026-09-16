# ar-app — 給後續 session 的必讀

這個檔案記錄的是**已經害人繞過遠路的具體錯誤**。每一條都真的發生過，不是預防性的一般建議。

> 跨 repo 的工作規則（版本編號、OTA 發布、交付紀錄）在 [`../CLAUDE.md`](../CLAUDE.md) 與
> [`../docs/RELEASE_VERSIONING.md`](../docs/RELEASE_VERSIONING.md)。APK 的 `SHELL_VERSION`／
> `versionName`／`versionCode` 都是從 `release/versions.json` 推導出來的，不要在 `build.gradle`
> 裡寫死版本號。

## 1. 手勢是從深度幀算出來的，不是 JJSDK 的 gesture event

`TofGestureEvent` / `setTofGestureListener` 那條路徑**在這副眼鏡上是死的**，而且不可能修好。

JJSDK 讀的是**韌體**填的 bitfield，閘門在 `TofManager.a()`：

```java
int acc = 0;
for (String part : firmware.split("\\.")) acc = acc * 16 + Integer.parseInt(part);
x = acc >= 290;      // 290 == 0x122 == "1.2.2"，十六進位打包
```

韌體低於 1.2.2 就永遠不會設那些 bit。**沒有任何 USB 授權時機、listener 順序或 lifecycle 修改能產生事件。**

實際會動的是 `TofGestureRecognizer`：從 `setTofFrameListener` 拿到的原始 8×8 深度網格自己算。原廠 App 也是這樣做的（它帶 `libcalculate_gesture.so`）。

**症狀長這樣就是這個原因**：`ToF State: Ready` + `Gesture Listener: Registered` + `原始事件 0`。三個都是真的，同時成立。看到就直接想深度幀，不要再查 USB 授權。

Logcat 的「ToF 深度幀」計數是用來分辨兩種失敗的：深度幀在跳但韌體手勢 0 → 連線與 parser 都健康，只有 module 的手勢引擎沉默。（以前這些數字畫在畫面上的診斷面板裡；面板已移除，同一份內容改看 `adb logcat -s JorjinVerifier JorjinToF`。）

## 2. JJSDK 的 listener 是 static

```java
private static TofIncomingFrameListener C;
private static TofGestureEventListener  D;
private static TofDevicesAttachListener E;

public void setTofGestureListener(l) { D = l; }              // putstatic
public void release() { ...; C = D = E = null; ... }         // putstatic
```

Process 全域。兩個 `TofManager` 不會各有一份 —— 後設的蓋掉先設的，**任何一個 instance** 呼叫 `release()` 就對**所有** instance 清掉。

而 `getTofState()` 是 `z && y`（instance 欄位）。所以一個還在收資料的 manager 可以持續回報 Ready，而它 frame 迴圈讀的 static listener 已經被另一個 instance 清成 null。

`CameraManager` 與 `TofManager` 也共用同一個 USB monitor：`d.a` 是 singleton（`private static volatile d.a p; public static d.a g();`）。

## 3. 先看有沒有別的分支已經解決了

`main` 曾經**缺少唯一能動的手勢 pipeline**，它躺在一條未合併的分支上（`claude/jorjin-tof-gesture-recognition-275iub`），而且那條分支第一個 commit 的標題就寫著答案。有一次 session 看到那條分支、判斷成「平行實驗」略過，然後在 `main` 上白繞了好幾輪。

**動手前先 `git log --all --oneline -S<關鍵字>`**，並且讀未合併分支的 commit 訊息。使用者手上那支能動的 APK 通常就是最快的線索 —— 拆開它的 dex 比對類別名稱。

## 4. Stacked PR 會擱淺

把 PR B 的 base 設成 PR A 的分支，當 A 先被 merge 並關閉時，**B 會被 merge 進那條已經沒用的分支，不是 `main`**。發生過一次，整個功能沒進 `main` 而 merge 通知看起來完全正常。

**PR 一律以 `main` 為 base。**

## 5. Merge 完要驗證 `main` 真的拿到東西

Merge 通知不保證內容進去了。發生過兩次：PR 在我推修正 commit 的**前一秒**被 merge，修正就掉了。

Merge 後一定要：

```bash
git fetch origin main && git merge-base --is-ancestor <fix-sha> origin/main
```

## 6. APK 要拆開看，不要相信 release 標籤

`debug-latest` 曾經掛著**少了整個功能**的 APK：兩個 `main` 的 CI run 搶同一個 rolling tag，贏的是最後跑完的那個，不是 commit 較新的那個。tag、網址、CI 全綠，完全看不出來。

（已用 `concurrency` group + 發布前檢查 commit 是否仍是分支 tip 修掉，見 `.github/workflows/build-android.yml`。）

交付前先驗證內容：

```bash
curl -sSL -o a.apk <url> && unzip -l a.apk | grep <預期檔案>
```

## 7. 要複製 SDK 行為就要一模一樣，包含它的缺陷

`TofFirmware.pack()` 曾經多做 `trim()`。`Integer.parseInt(" 2")` 會丟例外（Java 完全不容忍空白），所以 SDK 遇到帶空格的 component 是**跳過**它、閘門關閉；trim 之後反而 parse 成功、判定「已啟用」。

四種空白變體全部往同一個方向錯：**把不送手勢的 module 判成健康**。那比不印還糟，會害人回頭去查沒問題的程式。

## 8. MJPEG 沒有 boundary 就等於沒有畫面

`shouldInterceptRequest` 回的 `WebResourceResponse` 曾經只帶 `"multipart/x-mixed-replace"`，**沒有 boundary**。

`multipart/x-mixed-replace` 每一格是靠 `Content-Type` 的 `boundary=` 切開的。沒有它，瀏覽器解不出任何一張 JPEG：`<img>` 的 `naturalWidth` 永遠 0、`load` 事件永遠不來，頁面只能等自己的 8 秒 timeout，然後顯示「無法使用相機」。**相機、USB、JJSDK、JPEG 編碼全部是好的。**

`MjpegFraming.CONTENT_TYPE`（帶 boundary）當時就存在，`MjpegFramingTest` 還測了它 —— 只是**沒有任何程式碼把它送出去**。一個「有常數、有測試、沒被使用」的組合，看程式碼比看測試更容易漏掉。

`WebResourceResponse` 的 mimeType 參數依文件不得帶參數，所以 boundary 要走真正的 header：

```java
new WebResourceResponse(MJPEG_MIME_TYPE, null, 200, "OK", glassesCameraHeaders(), stream.newBody());
```

**症狀長這樣就直接想這裡**：Android 側 `MJPEG request intercepted` ＋ `first frame sequence=…` 都有印，頁面卻回 first-frame timeout。分層診斷見 `docs/ar-glasses-camera-diagnosis.md`。

## 9. ToF 正常不代表 RGB Camera 正常

兩顆是不同的 USB 裝置、不同的 SDK manager。手勢（ToF）好好的，RGB camera 可以完全沒在送 frame，反之亦然。查掃描／辨識問題時，先看 `RGB frames:` 這行有沒有在跳，不要拿手勢正常當作相機正常的證據。

## 10. 一支 APK，內容靠 OTA 更新 —— 不要把 flavor 加回來

`online` / `offline` 兩個 product flavor **已經刪掉了**（`src/online/`、`src/offline/` 也是）。
正式版只有一支：APK 內建完整的 `webapp/dist`，由本機 https origin 提供；有網路時在背景抓新的
web bundle，**下一次啟動**才換上。`AppIdentityTest` 與 build workflow 都會擋下 flavor 復活。

幾個會浪費時間的點：

**`INTERNET` 現在是必要的，但只給 OTA 用。** 以前離線版靠「沒有 `INTERNET` 權限」在 kernel 層
保證連不出去，那個保證沒有了。取而代之的保證在**使用網路的地方**：體驗載入的每一個 byte 都由
`shouldInterceptRequest` 從本機 bundle 回應（`WebLayerControllerTest` 釘住），
`audit-offline-web-assets.mjs` 在建置時擋下任何外部資源。`ACCESS_NETWORK_STATE` 仍然被
`tools:node="remove"` 拿掉：連上 Wi-Fi 不等於連得到網際網路，要知道就發請求。

**下載完成不可以 reload。** 唯一會換 bundle 並重新載入的路徑是 rollback（頁面載入失敗）。
更新完成只會把新版標成 `pending`，等下一次冷啟動。`ProductionStartupTest` 釘住這件事，
`OtaUpdater` 裡連 `WebView` 這個字都不准出現。

**角色是 `state.json` 裡的指標，不是三個叫 active/previous/pending 的目錄。** 用三次 rename
升版沒辦法在中途當機後保持一致；改寫一個小檔案（`.tmp` → fsync → rename）可以。
中途當機最壞只留下沒人指向的目錄，下次開機 GC 掉。**不要為了「比較好懂」改成目錄搬移。**

**版本號同一個 commit 必須算出同一個值。** `1.x.x-YYYYMMDD-NNN`，`NNN` 由 git 歷史算
（同一 UTC 日期到這個 commit 為止的 commit 數）。APK 建置與 OTA 發布是兩個 workflow，
兩邊都跑 `webapp/scripts/ota-version.mjs`；算出不同值的話，每一支剛裝好的手機都會為了拿到
自己內建的那一份而下載 80 MB。CI 有一步專門比對這兩個值。**checkout 要 `fetch-depth: 0`**，
淺層 clone 數不出 `NNN`。

**`latest.json` 一定最後才發布。** 指標先於 bundle 發布 = 手機下載 404；上傳沒完成就發布 =
手機下載半個檔案。兩種都是無聲的。`deploy-pages.yml` 的順序有測試釘住。

**手動更新是 CIBAR 頁面按的，不是 App 畫面上的按鈕。** `OtaControlBridge` 是全專案唯一的
`addJavascriptInterface`（`window.__cibarOtaControl`），給 webapp 的工作人員管理模式呼叫
檢查／下載／重新啟動；狀態走 `window.__cibarOtaStatus`（`OtaUpdateStatus`）。它安全的理由是這個
WebView 從不載入網路內容——每個 byte 都由 `shouldInterceptRequest` 從本機 bundle 回應，而那份
bundle 的 SHA-256 在安裝前就對過 manifest。**不要因為「多了操作」就在 Android 端加 dialog 或
progress bar**：第 11 條仍然成立，`ProductionStartupTest` 會擋。

**「重新啟動並套用更新」是重開 App，不是 reload。** 升版只發生在 `openForLaunch()`，而它只在
`onCreate` 跑；頁面 reload 什麼都不會升。順序也有意義：先 `hardware.stop()` 釋放共用的 USB
裝置，再 `startActivity` + `finish()`，否則新的 Activity 的 `onStart` 會在舊的 `onStop` 之前
搶相機與 ToF。

**MJPEG 一定要在 bundle 之前攔。** 相機端點刻意跟網頁同 origin（否則辨識用的 canvas 會被污染），
所以它就落在 `/ScamAware-AR/` 裡面。順序反過來的話，bundle 會用 404 回答相機請求，症狀跟第 8 條的
boundary bug 完全一樣：Android 側看起來一切正常，頁面回報沒有影格。
順序寫在 `WebLayerController.interceptionFor()`，有測試釘住。

**掛在 `/ScamAware-AR/` 不是隨便選的，而且不隨版本改變。** Vite 的 `base` 就是 `/ScamAware-AR/`，所以 `dist`
裡每個 asset URL 都是絕對路徑 `/ScamAware-AR/...`；掛在別的路徑就得再建一次 webapp。origin 每一版
都相同，這是 React Router 的 history、`localStorage` 與相機權限能跨版本留下來的原因。

**assets 由 build task 產生，不要手動複製。** `assembleDebug`/`assembleRelease` 會跑
`buildCibarWebapp`（webapp 自己的 `npm run build`）→ `bundleCibarWebAssets`（複製 + 禁網稽核 +
產生 `cibar-baseline-manifest.json`）。所以建 APK 一定需要 Node。

**baseline manifest 不可以放進 `assets/cibar/`。** 只有 `/ScamAware-AR/` 被掛出去，後面只有 `cibar/`；
放進去就等於把它交給頁面的 origin。CI 會擋。

**OTA 的邏輯全部寫成純 Java（`ota/` 套件，不含 `android.*`）。** 這不是潔癖：一個只能在手機上
跑的更新狀態機，等於沒有人在跑。`android/tools/run-jvm-tests.sh` 在沒有 Android SDK 的環境下
就能跑完 249 個測試，包含用真的 HTTP server 做的斷網、SHA 不符、下一次啟動生效與 rollback。

## 11. 正式 APK 不得出現任何工程 UI

啟動流程只有一條：`啟動 → Camera + ToF + Gesture Bridge → 直接進 CIBAR`。診斷首頁、ToF／手勢測試頁、
WebView 上方工具列、右上角 `Jorjin Gesture` overlay、模式切換都已刪除，`ProductionStartupTest`
會在建置時擋下重新加回來的按鈕、文字與模式選擇。

要看狀態就看 Logcat（`adb logcat -s JorjinVerifier JorjinToF JorjinGesture`），不要往畫面上加。

**刪 UI 的時候有兩樣東西不能一起刪**：

- `activity_main.xml` 的 `SurfaceView`（`cameraSurface`）。JJSDK 的相機畫進它的 holder，設成
  `GONE` 或刪掉，surface 就被銷毀，MJPEG 也跟著沒畫面。正確做法是用不透明的 WebView **蓋住**它。
- `MainActivity` 的初始化：相機權限、`setSurfaceHolder`、`web.setCameraStream(...)`、
  `hardware.start()`、`web.onGesture(...)`。這些以前是診斷頁順手做的，現在是 App 啟動流程做的。

## 建置

`dl.google.com` 在 Claude Code 沙箱被網路政策擋住，Android SDK 與 AGP 都拉不下來，`./gradlew` **無法在該環境執行**。改用：

- `org.robolectric:android-all`（Maven Central 拿得到）當 `android.jar` 用 `javac` 編譯
- `app/libs/jjsdk.aar` 若是 placeholder，用 `git cat-file blob ca510d9dc8680423da77be49aeb89eaa788e1bea > app/libs/jjsdk.aar` 還原（**不要 commit**）
- `androidx.webkit`（`WebViewAssetLoader`）同樣拉不下來，手動編譯時自己寫個 stub 即可；
  正式編譯還是靠 CI
- 更省事的做法：直接跑 `android/tools/run-jvm-tests.sh`，它會自己抓 `android-all`、JUnit、
  `org.json`，補上 `R` 與 `androidx.webkit` 的 stub，編完整個 module 並跑完所有單元測試
- 真正的建置（APK）由 CI 完成
