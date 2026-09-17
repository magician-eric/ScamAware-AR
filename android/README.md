# 反詐AR體驗（Android／佐臻 AR 眼鏡）

手機桌面上的名稱是 **反詐AR體驗**，就這一個。產品名沿用 CIBAR PWA 的正式中文名稱
（見 repo 根目錄的 `manifest.json`），而不是另取工程代號；`AppIdentityTest` 會把兩邊綁在一起，
網頁那邊改名而 Android 沒跟上就會讓建置失敗。

以 **JJSDK v1.3.3** 驅動佐臻 J-Reality AR 眼鏡的 RGB 相機與 ToF 手勢，並在同一個 App 內以 WebView
呈現 CIBAR。它只使用眼鏡的 `CameraManager` 與 `TofManager`，不會以 CameraX、手機鏡頭或影像辨識代替眼鏡硬體。

**網頁內容永遠來自這支手機。** APK 內建一份完整的 `webapp/dist`，掛在本機 https origin 上；
有網路時 App 會在背景檢查、下載並驗證新的 web bundle，於**下一次啟動**才切換。網路只用來
「取得新版檔案」，從來不是體驗的播放來源。

## 正式啟動流程

```text
啟動 APK → 決定這次用哪一份 web bundle（本機，不連網）
        → 相機權限 + 眼鏡 USB 授權 + 初始化 Camera + ToF + Gesture Bridge
        → 直接進入 CIBAR（首頁＋開場動畫 → 語言選擇 → …）
        → （此時才在背景檢查有沒有新版）
```

**一個畫面，零個按鈕。** 開啟 App 之後看到的就是 CIBAR 本身，沒有診斷首頁、沒有工程測試頁、
WebView 上方沒有工具列、右上角沒有手勢讀數。啟動模式固定為 **Universal = Camera + ToF**，
不提供選擇。

以前擋在中間的三個工程畫面全部移除了：

| 曾經的畫面 | 來源 | 現況 |
|---|---|---|
| 診斷首頁（反詐AR體驗／版本／versionCode／最後手勢／手勢次數／原始事件／模擬掃描） | `res/layout/activity_main.xml` 的 `diagnosticsLayer` + `MainActivity` | 已刪除 |
| ToF／手勢工程測試頁（ToF 深度網格／深度幀／亮區／距離 mm／開啟左右手勢測試頁／在 App 內開啟 CIBAR／掃描診斷模式／重新連接） | 同一個 `diagnosticsLayer` 的下半部 + `TofHeatmapView` + `StartupMode` | 已刪除 |
| WebView 上方工具列（返回診斷／網址／重新載入）與右上角 `Jorjin Gesture / Last: / Count:` | `activity_main.xml` 的 `webLayer` 工具列 + `GestureBridgeScript` 的 overlay | 已刪除 |

**底層能力一行都沒有動**：相機權限、USB 授權、`CameraManager`、`TofManager`、`TofGestureRecognizer`
（真正產生 LEFT／RIGHT 的深度幀辨識）、`GestureController` 防重複、`GlassesCameraStream` 的 MJPEG
以及 `GestureBridgeScript` 的 `jorjinGesture` 事件全部保留，只是改由 App 啟動流程直接帶起來，
狀態改寫進 Logcat（`adb logcat -s JorjinVerifier JorjinToF JorjinGesture`）而不是畫在使用者眼前。

## 一支 APK，Offline-first ＋ 背景 OTA

以前有兩支：線上版讀 GitHub Pages，離線版把同一份 build 包在 APK 裡。兩支在**斷網之前**行為
完全一樣，而斷網正是它被展示的時機——於是要在桌面上兩個只差一個字的名稱之間做選擇。

現在只有一支，走的是離線版的機制（完整 build 由本機 https origin 提供），再加上線上版
「內容不會過期」的性質：新版在背景抓下來，於**下一次啟動**換上。

| | 反詐AR體驗 |
|---|---|
| WebView origin | `https://appassets.androidplatform.net/ScamAware-AR/` |
| 網頁內容來源 | 手機上目前的 active bundle（APK 內建的，或 OTA 下載的） |
| 體驗需要網路 | **不要**（安裝後第一次啟動就可以全程斷網） |
| 桌面名稱 | **反詐AR體驗** |
| applicationId | `com.bigxreality.jorjinverifier` |
| versionName | `1.1.0+<run>.<sha>` |
| `INTERNET` 權限 | 有 —— **只用來抓 `latest.json` 與 `bundle.zip`** |
| 內容更新 | 有網路時自動抓，下一次啟動生效，不必重裝 APK |

`INTERNET` 只出現在一個地方：`OtaHttp` 對 `WebContentSource.UPDATE_LATEST_URL` 發出的請求。
體驗本身載入的每一個 byte 都由 `shouldInterceptRequest` 從本機 bundle 回應
（`WebLayerControllerTest.thePageAlwaysComesFromTheActiveBundleOnThisDevice` 釘住這一點），
`webapp/scripts/audit-offline-web-assets.mjs` 則在建置時擋下任何指向外部的資源。

### 四個角色：bundled / active / previous / pending

```text
bundled   APK 內的 assets/cibar/。永遠在、永遠不會被寫壞，是最後的退路。
active    這一次 session 實際使用的版本。
previous  上一個用過的版本，rollback 的目標。
pending   已下載並完整驗證、但這一次 session 不使用的版本；下一次啟動才生效。
```

實際存放（`WebBundleStore`）：

```text
<filesDir>/webbundle/
  state.json          誰是誰（atomic 寫入：寫 .tmp → fsync → rename）
  versions/<version>/ 一個驗證過的 bundle 一個目錄，寫完就不再更動
  staging/            下載與解壓縮的暫存區，開機時整個清掉
```

角色是指向 `versions/` 的指標，而不是三個叫做 active/previous/pending 的目錄。理由是原子性：
用三次 rename 來「升版」沒有辦法在中途當機後還保持一致，改寫一個小檔案可以——rename 在 POSIX
檔案系統上要嘛發生要嘛沒發生。中途當機最壞只會留下沒有人指向的目錄，下次開機被 GC 掉。

### 啟動流程與更新流程

```text
啟動
 ├─ WebBundleStore.openForLaunch()      ← 本機 stat + 一個小檔案寫入，不連網
 │    ├─ 清掉 staging/
 │    ├─ 上一次啟動沒把畫面載出來？ → rollback
 │    ├─ 有 pending？ → previous = active、active = pending
 │    └─ active 目錄不完整？ → 退回 previous，再不行退回 APK 內建
 ├─ web.show()                          ← CIBAR 立刻開始載入
 └─ ota.checkForUpdateInBackground()    ← 到這裡才碰網路（背景執行緒）
      ├─ GET latest.json（connect 8s / read 20s，最多 3 次）
      ├─ 決定：已是最新 / 已下載 / shellVersion 不夠 / 下載
      ├─ 下載 bundle.zip → 驗 SHA-256 → 解壓縮到 staging → 逐檔驗長度與 SHA-256
      ├─ 驗「這是不是一個完整的 CIBAR」（JS/CSS/.mind/.mp4/.mp3/圖片/index.html）
      └─ 全部通過 → rename 進 versions/ → 標成 pending（本次 session 不切換）
```

**下載完成不會 reload。** 唯一會換 bundle 並重新載入的路徑是 rollback，而 rollback 只在頁面
**載入失敗**時發生。`ProductionStartupTest` 釘住這個順序與這個限制。

### 版本編號

Web bundle 的版本（Release ID）是 `MAJOR.MINOR.PATCH-YYYYMMDD.NNN`，例如 `1.0.0-20260825.001`：

- `MAJOR.MINOR.PATCH` 來自 `release/versions.json` 的 `webBundleVersion`，由人手動決定並 review；
  規則見 [`docs/RELEASE_VERSIONING.md`](../docs/RELEASE_VERSIONING.md)。
- `YYYYMMDD` 是發布日期（臺北時間），`NNN` 是當天第幾次發布，從 `001` 起算。
- 這兩段**只有 `.github/workflows/ota-release.yml` 在 merge 進 main 之後才會產生**。
  PR 上不會有、也不該有 Release ID。

APK 內建的那一份 web bundle 因此**不可能**帶 Release ID——它是跟 Release ID 同一個 commit 建出來的。
它帶的是 `<webBundleVersion>-00000000.000`，日期與序號都是 0。手機比較的是
`MAJOR.MINOR.PATCH` 這一半（`BundleVersion.compareSemantic`），所以剛裝好的手機會認得線上那一份
就是自己內建的內容而**不下載**；等到 `webBundleVersion` 真的往上跳，才會被取代。

APK 自己另外有 `versionCode`／`versionName`，以及 **Shell Version**（`BuildConfig.SHELL_VERSION`，
同樣來自 `release/versions.json`）——native 能力的版本線，跟 Web Bundle 版本線各自獨立演進：
只改網頁不會動到 Shell。OTA 的 `latest.json` 與 manifest 會宣告 `minShellVersion`（`x.y.z`），
手機的 Shell Version 不夠就**不下載也不啟用**，繼續用現在這一份。

### rollback

```text
active 載不起來 → previous → APK 內建 baseline
```

兩條觸發路徑：

1. **同一次 session**：WebView 回報主框架載入失敗 → `WebLayerController.rollBack()` →
   `OtaController.rollbackAfterFailure()` → 換上 previous 並重新載入。使用者看到的是一次
   reload，而不是一片白畫面。
2. **下一次啟動**：連續兩次啟動都沒有把頁面載出來（`onPageFinished` 沒到）→ 自動退回。
   兩次而不是一次，因為「開了 App 又馬上關掉」不是壞掉的 bundle。

退回之後，壞掉的那一版不再被任何角色指向，下一次 GC 就會刪掉——它不能再被當成 pending 裝回來。

### 診斷

App 沒有畫面可以看（正式版一個按鈕都沒有），所以更新狀態走三個看不見的出口：

```bash
adb logcat -s JorjinOta
adb shell cat /sdcard/Android/data/com.bigxreality.jorjinverifier/files/ota-diagnostics.json
```

以及頁面裡的 `window.__cibarOta`（`onPageFinished` 之後注入，並發出 `cibarOtaReady` 事件）。
內容：`shellVersion`、`bundledVersion`、`activeVersion`、`previousVersion`、`pendingVersion`、
`latestRemoteVersion`、`lastUpdateCheck`、`lastSuccessfulUpdate`、`lastUpdateError`、
`lastRollbackReason`、`bundleSource`。

**體驗本身不得依賴它**：它在 first paint 時不存在，在桌面瀏覽器裡開發時也不存在。

### 內建的網頁內容怎麼來的

不是有人手動複製一份放著。`assembleDebug` / `assembleRelease` 會先跑 webapp 自己的建置：

```text
webapp/ 原始碼 → npm run build（含 webapp 自己的 prebuild 驗證）→ webapp/dist
             → app/build/generated/cibarWebAssets/cibar/ → 禁網稽核
             → 產生 cibar-baseline-manifest.json → APK 的 assets/
```

見 `app/build.gradle` 的 `buildCibarWebapp` 與 `bundleCibarWebAssets`。因為 APK 沒有跑過這條
路徑就產生不出來，所以「APK 內的網頁比網站舊」在結構上不可能發生。

`cibar-baseline-manifest.json` 刻意放在 `assets/` 根目錄而**不是** `assets/cibar/` 裡面：
只有 `/ScamAware-AR/` 這個前綴被掛出去，而它後面只有 `cibar/`，所以頁面的 origin 讀不到它。

### 為什麼不用 `file:///android_asset/`

`file://` 文件在現代 WebView 是 opaque origin，這個 App 會直接壞掉三件事：`.mind` 圖像辨識資料集
的 `fetch()` 會被拒絕、Vite 產生的 `<script type="module">` 會被 module loader 的 origin 檢查擋掉、
眼鏡 MJPEG 影格會變成 cross-origin 而污染辨識用的 canvas（`getImageData` 直接丟 SecurityError）。

所以用 `WebViewAssetLoader`（`androidx.webkit`）把同一批 bytes 掛在
`https://appassets.androidplatform.net/ScamAware-AR/`——一個真正的 https origin，語意跟 GitHub Pages 上
完全一樣。掛在 `/ScamAware-AR/` 而不是別的路徑，是因為 Vite 的 `base` 就是 `/ScamAware-AR/`：這樣打包的
就是「跟網站一模一樣的那一份 `dist`」，不需要為了離線再建一次。

**這個 origin 不隨版本改變**，OTA 換版也一樣。React Router 的 history、Vite 編出來的絕對資源
路徑、`localStorage`、相機權限授權全部跟著留下來，沒有任何一個會發現剛剛換過版。

`WebBundlePaths` 決定路徑對應、MIME type 與 SPA fallback（找不到檔案且路徑沒有副檔名 →
回 `index.html`）；`WebBundleResponder` 決定回什麼；`WebBundleAssetHandler` 只是把 Android 的
`WebResourceResponse` 接上去。CIBAR 走 HashRouter，所以 route 本來就不會打到 server，
SPA fallback 是為了 reload、deep link 與未來改用 path router 而存在。

### Service Worker

Native OTA 是這支 App 的版本控制來源，而 Service Worker 站在它**上面**：worker 會在
`shouldInterceptRequest` 之前攔截 fetch，並從 origin 的 Cache Storage 回應——而 origin 是刻意
每一版都相同的。所以一個殘留的 worker 會造成最難查的狀態：native 正確地跑著 v20、磁碟上是
v20、diagnostics 說 v20，畫面上是 v19；重裝 APK 也修不好，因為 Cache Storage 屬於 origin。

CIBAR 的 React build 本身不註冊 Service Worker（`webapp/public/sw.js` 本來就是舊靜態站的
kill switch），所以正常情況下什麼都不會發生。`ServiceWorkerGuardScript` 在每次
`onPageFinished` 注入，把這個 origin 上的 worker 全部 unregister、Cache Storage 全部清空——
代價是兩個會 resolve 成空陣列的 promise，換來的是這件事不可能發生。

### MJPEG 與本機資源的攔截順序

眼鏡相機端點 `__jorjin-camera.mjpeg` 刻意跟網頁同 origin（否則 canvas 會被污染），
所以它就落在 bundle 負責的 `/ScamAware-AR/` 前綴裡面。順序因此是固定的，
由 `WebLayerController.interceptionFor()` 決定並有測試釘住：

```text
/ScamAware-AR/__jorjin-camera.mjpeg  → GlassesCameraStream
其他 /ScamAware-AR/…                 → 目前的 active bundle
其他                          → 交給 WebView（體驗本身永遠不會走到這裡）
```

反過來問的話，bundle 會用「這個檔案不存在」的 404 回答相機請求，`<img>` 解不出任何一格，
頁面回報「相機壞了」——而相機、USB 與 JPEG 編碼全都是好的。

## 開場動畫

啟動流程的第一個畫面是首頁本身，上面疊著一段開場動畫：

```text
啟動 App →（首頁 ＋ 開場動畫）→ 語言選擇 →（之後完全不變）
```

- **實作位置：`webapp/src/pages/opening/`**（`OpeningHome.jsx` ／ `OpeningSequence.jsx` ／
  `OpeningSequence.css`）
- 純 CSS animation，沒有影片、沒有 Canvas、沒有 WebGL、沒有動畫套件，也沒有任何要下載的檔案。
- 動畫直接畫在首頁既有的背景圖上，結束時只是把 overlay unmount，底下的首頁 UI 露出來；
  **完全沒有換頁**，所以背景不會重新載入，也不會有黑屏／白屏。
- 全長 7 秒（SCAN → ASSEMBLE → LOCK → EXPAND → PROJECT → PULSE → REVEAL）。
  工作人員可以用右上角連點三下（1.5 秒內）跳過。

這裡以前放的是一支 `webapp/public/media/intro/intro.mp4`。影片的每一種失敗都發生在第一個
frame 之前——要下載、要 decode、autoplay 可以被拒絕，而且 Android WebView、iOS Safari、
Desktop Chrome 開同一支檔案所花的時間都不一樣——所以整支影片、它的 poster、它的投放資料夾
與所有播放邏輯都已經移除，不是改小、也不是留著當 fallback。

開場動畫期間背景可以同時做網路檢查與 OTA 下載，兩者互不阻塞；OTA 仍然遵守
「本次 session 不換版」的規則，不會因為下載完成而中斷開場動畫或重新載入 App。

## 支援功能

- 眼鏡 RGB 相機串流；影格以 MJPEG 送進 WebView 供 CIBAR 的影像辨識使用（同 origin，不會污染 canvas）。
- ToF 深度幀辨識手勢：UP、DOWN、LEFT、RIGHT、PULL、PUSH、HALT、PRESENCE。
- 僅處理 `ACTION_RECEIVED`，同一手勢有 300 ms 防重複。
- 相機權限與眼鏡 USB 授權在啟動流程中自動請求；ToF 已授權卻未就緒時 watchdog 重建 `TofManager`。
- 進入背景釋放兩套 SDK 資源，返回前景重建。
- 支援 `arm64-v8a` 與 `armeabi-v7a`，最低 Android 8.1（API 27），直向全螢幕。
- **CIBAR 顯示在本 APP 內的 WebView**，不跳 Chrome、不離開本 APP，所以相機與 ToF 全程不會被釋放；手勢以全域 `jorjinGesture` 事件送進網頁。

## CIBAR WebView 與手勢橋接

`MainActivity.onCreate()` 就呼叫 `WebLayerController.show()`，CIBAR 直接載入同一個 Activity 裡
佔滿全螢幕的 WebView（內容一律來自這支手機上目前的 active bundle）。
沒有中間頁、沒有按鈕，也沒有第二個可以載入的頁面。

**為什麼一定要放在 App 內**：用 Chrome 或任何外部瀏覽器開 CIBAR，本 Activity 就會進入
背景並執行 `onStop()` → `hardware.stop()`，相機被 release、ToF 被 close，手勢是在源頭就
停掉的，網頁端再怎麼改都救不回來。把網頁留在自己的 Activity 內，前景從未改變，`onStop()`
不會執行，硬體照常運作。

lifecycle 沒有為此放寬：`onStop()` / `onDestroy()` 依然照舊釋放相機與 ToF——眼鏡是共用的
USB 裝置，背景占著會讓其他 App（包含下一次啟動的自己）拿不到。改變的只是「打開網頁」不再
等於「離開前景」。相機的 `SurfaceView` 仍然留在 layout 裡、仍然是 `VISIBLE`，只是被不透明的
WebView 蓋住：`SurfaceView` 一旦設成 `GONE`，surface 會被銷毀，JJSDK 相機就會失去它正在繪製的
holder。**移除診斷 UI 時這一層不能一起刪。**

WebView 已開啟 JavaScript 與 DOM storage（CIBAR 是 React SPA，關掉就只會渲染出空的 root），
所有 `http`/`https` 導向都留在 WebView 內，其他 scheme（`tel:`、`mailto:`、`intent:`）一律
攔下並記錄，不會叫起外部 App。Android 返回鍵先走 WebView history（CIBAR 走 HashRouter，每個
route 都在裡面），走完就結束 APP——CIBAR 後面已經沒有別的畫面可以回。

### 網頁端要怎麼接

每一個通過防重複的手勢都會派送一個全域事件：

```javascript
window.addEventListener('jorjinGesture', (event) => {
  event.detail // { gesture: 'PUSH', label: '推進 PUSH', count: 12, at: 8123456 }
})
```

`detail.gesture` 是 `GestureLabels.code()` 的大寫代碼（`UP`／`DOWN`／`LEFT`／`RIGHT`／
`PULL`／`PUSH`／`HALT`／`PRESENCE`），與 CIBAR 自己的 AR Gesture Bridge 是同一套詞彙。
另外還有 `window.__jorjinGestureBridge`（`getLastGesture()`、`getGestureCount()`）供載入
較晚的頁面補讀狀態，以及每次載入完成派送一次的 `jorjinGestureBridgeReady`。

CIBAR 從啟動就在畫面上，所以每一個通過防重複的手勢都會實際派送給它。

**橋接不會在頁面上畫任何東西。** 它以前會在右上角掛一塊 `Jorjin Gesture / Last: / Count:` 的
唯讀讀數，那是工程 UI，已經移除；計數本身還在，頁面要看可以自己讀
`window.__jorjinGestureBridge.getGestureCount()`。Android 端則每 100 幀寫一行 Logcat。

**五個情境內容完全沒有改動**，webapp 一行都沒有動。

## 建置與 APK 產出

必要環境為 JDK 17、Android SDK 35 與 Android Studio（Ladybug 或更新版本建議）。repo 已含 `app/libs/jjsdk.aar`；此檔不可是空檔或 Git LFS placeholder。

此 AAR 是原廠提供的必要封閉源碼相依，不是 APP 的編譯產物。有效的原廠 AAR 已存在於 repository 歷史物件 `ca510d9dc8680423da77be49aeb89eaa788e1bea`；由於變更審查介面拒絕二進位 patch，Android Studio Sync 或任何 Gradle 指令會先在 `settings.gradle` 自動從該 Git 物件還原 `app/libs/jjsdk.aar`，不會在 PR 再加入一份二進位檔。淺層 clone 請先執行 `git fetch --unshallow`。`preBuild` 接著驗證 AAR 大小、ZIP 結構、`classes.jar` 及兩個必要 ABI；CI 另以 SHA-256 `95847781d88ebe35cd54da5e427a2fce4071208800f42401c7378762f4c0cdea` 防止錯誤檔案被發布。

另外需要 **Node.js 22 與 npm**：APK 內建的網頁內容是由 `webapp/` 自己的建置產生的，
沒有 Node 就產不出 APK（這是刻意的，見「內建的網頁內容怎麼來的」）。

```bash
# 單元測試 + 兩個 build type，就是 CI 做的事
# （第一次會先 npm ci + npm run build，比較久；webapp/dist 約 80 MB）
./gradlew clean testDebugUnitTest assembleDebug assembleRelease
```

APK 產出位置：

```text
app/build/outputs/apk/release/app-release.apk
app/build/outputs/apk/debug/app-debug.apk
```

CI 會把它們改名成交付用的檔名放到 `android/dist/`：

```text
android/dist/CIBAR-反詐AR體驗-<shell>-web<bundle>.apk        ← 手機安裝用
android/dist/CIBAR-反詐AR體驗-<shell>-web<bundle>-debug.apk  ← adb／Android Studio 偵錯用
android/dist/upload/CIBAR-<shell>-web<bundle>.apk           ← 上傳 GitHub Release 用的 ASCII 檔名副本

版本號取自 `release/versions.json`（`shellVersion` 與 `webBundleVersion`），
例如 `CIBAR-1.2.0-web1.7.6.apk`。
```

### 沒有 Android SDK 時怎麼跑測試

`dl.google.com` 在部分開發沙箱是連不到的，`./gradlew` 在那裡根本跑不起來。
`android/tools/run-jvm-tests.sh` 用 Maven Central 上的 `org.robolectric:android-all` 當
`android.jar`，用 `javac` 編整個 module 並跑完 `app/src/test/` 的每一個測試：

```bash
android/tools/run-jvm-tests.sh              # 全部
android/tools/run-jvm-tests.sh ota.WebBundleStoreTest
```

OTA 的每一個決策（版本比較、驗證、staging、下一次啟動生效、rollback、退回 APK 內建）都刻意
寫成不含 `android.*` 的純 Java，就是為了這件事：一個只能在手機上跑的狀態機，等於沒有人在跑。

Android Studio 可直接開啟 repo 根目錄，等待 Gradle Sync 後選 **Build > Build APK(s)**。
本機建置的 `versionName` 尾碼為 `+local`、`versionCode` 為基準值 1，兩者都低於任何 CI 建置，
因此不會蓋掉手機上的 CI 版本。

## 安裝與連接

**從 v1.0.2 開始，APK 用 repo 內的固定測試金鑰（`app/keystore/cibar-test.jks`）簽章**，
所以之後的版本可以直接覆蓋安裝。CI 每次建置都會比對憑證 SHA-256
（`36f730171eeed725b2128f92fc379f008e3fd6cf3fbaa8e21aa5c41afac93dff`），簽章一旦跑掉就讓建置失敗，
而不是讓測試者在手機上撞牆。

**但是從 v1.0.1（含）以前的舊版升上來，仍必須先移除舊版。** 那些 APK 是用 CI 每次執行各自產生的
debug 金鑰簽的，憑證都不一樣；Android 不允許以不同簽章覆蓋安裝，直接覆蓋會失敗並回報
`INSTALL_FAILED_UPDATE_INCOMPATIBLE`，手機上只會看到一句「應用程式未安裝」，不會說明原因。

```bash
adb uninstall com.bigxreality.jorjinverifier   # 未安裝過會回報 Failure，可忽略
adb install dist/CIBAR-反詐AR體驗-*.apk
```

手機直接操作時：**先長按舊版「佐臻 AR 硬體驗證」解除安裝，再安裝新的 APK。**

> 這把金鑰是刻意公開的測試金鑰（密碼就寫在 `app/build.gradle` 裡）。本 App 不上架任何商店、
> 只由我們自己從 GitHub Release 手動安裝，沒有需要被這把金鑰認證的散布通道。**不可以拿它簽任何
> 對外發布的版本**；上架用的正式金鑰必須另外保管、不進 git。

Release 內有兩個檔案，**手機安裝只會用到第一個**：

| 檔名 | 用途 |
|---|---|
| `CIBAR-<shell>-web<bundle>.apk` | **手機安裝用。** 桌面名稱「反詐AR體驗」。Actions artifact 內的檔名是 `CIBAR-反詐AR體驗-<shell>-web<bundle>.apk`。 |
| `CIBAR-<shell>-web<bundle>-debug.apk` | adb / Android Studio 偵錯用（debuggable，部分 ROM 會直接拒裝）。 |

**檔名裡沒有版本、commit 或 build number，而且每一版都一樣**——檔名要回答的只有「這是什麼」，
版本則在 APK 內的 `versionName` / `versionCode` 裡（`versionCode` 每次建置遞增，
所以同名的新 APK 一樣可以直接覆蓋安裝，手機不會判定為降級）。

`versionName` 形如 `1.1.0+123.abc1234`：`123` 是 CI run number、`abc1234` 是 commit；
`versionCode` 隨 run number 遞增，因此新版永遠不會被 Android 判定為 downgrade。
正式版不再把版本畫在畫面上（那是已移除的診斷首頁做的事）。要確認手上是哪一支：
Android「設定 > 應用程式 > 反詐AR體驗 > 應用程式資訊」看版本，或
`adb shell dumpsys package com.bigxreality.jorjinverifier | grep versionName`。

**APK 的版本跟畫面上的內容是兩回事。** 網頁內容由 web bundle 決定，它會自己更新；
要知道手機正在跑哪一份 bundle，看 `adb logcat -s JorjinOta` 或
`/sdcard/Android/data/com.bigxreality.jorjinverifier/files/ota-diagnostics.json`。

1. 確認手機為 Android 8.1 以上，USB-C 支援 **DisplayPort Alt Mode**，且可提供眼鏡足夠電力；供電不足時使用相容的供電/轉接配置。
2. 以 USB-C 連接 J-Reality 眼鏡並啟動 APP。
3. 首次啟動會出現**兩個**授權：Android 相機執行時權限，以及**眼鏡的 USB 裝置授權**，兩個都要允許（USB 那個可勾選記住裝置）。APP 不會自行偽造或繞過授權。

   JJSDK 透過 libusb/UVC 直接存取 `/dev/bus/usb`，Android 的相機權限**不會**授予這條路徑；沒有 USB 裝置授權時 `UsbManager.openDevice()` 回傳 null，畫面會顯示「鏡頭：已啟動」但影像幀永遠停在 0。因此 APP 會在啟動 SDK 前自行以 `UsbManager.requestPermission()` 取得授權，取得後才建立 `CameraManager`。
4. 確認預覽出現、解析度有效且影像幀持續增加，再於 ToF 前方測試手勢。
5. 中斷或授權後未啟動時，重新接妥並重開 App（正式版沒有「重新連接」按鈕，重啟就是重連）。

## ToF 測試限制

眼鏡必須是配有 ToF 的型號；內建手勢要求 **ToF 韌體 v1.2.2 以上**。APP 會嘗試透過 SDK 顯示韌體版本；顯示「無法確認」時需向設備管理者/佐臻確認版本。一般室內 LED 照明最適合先行測試；強烈日光、紅外線補光燈或其他紅外線光源可能干擾 ToF。DP Alt Mode 主要影響眼鏡顯示輸出，USB 資料連線及充足供電仍是 RGB/ToF 驗證的必要條件。

## 常見故障排除

| 畫面訊息/現象 | 處理方式 |
|---|---|
| 未取得相機權限 | 到 Android「設定 > 應用程式 > 反詐AR體驗 > 權限」允許相機，然後重新開啟 App（正式版沒有「重新連接」按鈕）。CIBAR 本身仍會顯示，只是沒有眼鏡影像。 |
| RGB 啟動失敗或解析度為空 | 拔插 USB-C、接受 USB 授權，關閉其他占用眼鏡相機的 APP，確認供電後重試。 |
| 眼鏡影像沒有進到 CIBAR | `adb logcat -s JorjinVerifier JorjinToF JorjinGesture` 看 `影像幀：` 那行有沒有在跳；沒跳就重開眼鏡與 App。正式版沒有畫面上的診斷面板，各層狀態都只在 Logcat。 |
| 安裝時顯示「應用程式未安裝」 | 手機上還留著 v1.0.1 以前的舊版（那些是每次 CI 各自產生的金鑰，簽章不同，無法覆蓋）。先移除舊版或 `adb uninstall com.bigxreality.jorjinverifier` 再安裝。v1.0.2 之後彼此可直接覆蓋。 |
| 安裝被拒且沒有說明原因 | 確認下載的是不帶 `-debug` 的那支 APK；另確認 APK 沒有宣告任何 `required="true"` 的 `uses-feature`（CI 會擋下這種建置）。 |
| 分不清手機上是不是最新版 | 到「設定 > 應用程式 > 應用程式資訊」看版本，比對 `versionName` 的 `+<run>.<commit>` 尾碼與 Release 標題。 |
| 未取得眼鏡 USB 授權 | 拔插 USB-C 後重開 App，並在系統授權視窗選允許。若先前誤按拒絕且勾了記住，需到「設定 > 應用程式 > 預設應用程式 > USB」清除預設值。 |
| 未偵測到眼鏡 | 換一條具資料傳輸能力的 USB-C 線（純充電線不會枚舉裝置），確認眼鏡供電充足後重開 App。 |
| ToF 不支援 | 確認眼鏡型號包含 ToF、韌體至少 v1.2.2、USB 授權及線材具資料傳輸能力。 |
| ToF 已中斷 | 檢查接頭/供電，避開僅充電線，接妥後重開 App。 |
| 手勢不穩定 | 改在室內 LED 環境，避開日光與紅外線光源，並確認韌體版本。 |
| 返回 APP 無畫面 | APP 在背景會刻意釋放硬體；返回後稍候初始化，必要時重開 App。 |
| 手勢沒有進到 CIBAR | `adb logcat -s JorjinVerifier` 看有沒有 `手勢：` 那幾行。有 Log 沒反應是網頁端；沒有 Log 就看 `ToF State`／`ToF 深度幀` 是不是停著。 |
| CIBAR 空白或載不出來 | 載入失敗時 WebView 自己會畫出錯誤頁（標題、錯誤碼與建議）；細節看 `adb logcat -s JorjinVerifier JorjinOta`。**這一定是本機 bundle 的問題，跟網路無關**——體驗不會從網路載入任何東西。App 會自動退回上一版或 APK 內建版本，請一併回報 `ota-diagnostics.json`。 |
| 更新一直沒生效 | 新版要**下一次啟動**才會換上，這是刻意的。`adb logcat -s JorjinOta` 會印出 `pending=` 是哪一版；若 `error=` 有值就照它說的處理（連不到伺服器、SHA 不符、shellVersion 不夠…）。 |

正式版不會把任何錯誤畫在使用者眼前（WebView 自己的載入失敗頁除外）；完整例外寫入 Logcat 與
`getExternalFilesDir()/crash.txt`。

## ToF 手勢如何在不開佐臻 App 的情況下運作

**ToF 是與 RGB 相機不同的 USB 裝置。** JJSDK 內部以 `vendorId & 0xFF | (productId & 0xFF) << 16`
查表辨識裝置：相機在 `c.a`、ToF 在 `c.k`。`c.k` 只有兩筆，對應
`0x0483:0x5740`（STM32 虛擬序列埠）與 `0x350E:0x3723`；原廠 `J-Reality-Gesture` 的
`res/xml/device_filter.xml` 列的是同一組 ToF 描述子，另外多一筆 `0x350E:0x3501`（JJSDK 1.3.3
未收錄）與 `0x0483:0xDF11`（DFU 韌體更新模式）。ToF 走的是 CDC-ACM，不是 UVC，所以
**取得相機的 USB 授權完全不代表 ToF 也有授權**。

JJSDK 雖然有自行補請求 ToF 授權的路徑（`d.a`），但那條路徑幾乎是一次性的：建構 manager 後
300 ms 只排程一次掃描，之後僅在 `USB_DEVICE_ATTACHED`/`DETACHED` 或 SDK 自己的
`com.jorjin.jjsdk.USB_PERMISSION` 廣播才重新排程，且所有請求都被同一個「已有請求進行中」旗標擋住，
一旦某個子系統的請求位元被清掉就不會再設回來。用**我們自己的**對話框拿到的授權不會重新觸發這條路徑，
於是 `TofManager` 常常從未拿到裝置、從未開啟 CDC 埠、也就從未送出任何手勢事件——
而相機因為剛好在正確的時機點持有授權，看起來一切正常。

因此 APP 現在的作法是：先枚舉全部 USB 裝置並以同一套規則分類，**在建立任何 SDK manager 之前**
自行取得相機與 ToF 兩個裝置的授權；等 SDK 那唯一一次掃描執行時，兩個裝置都已是 `hasPermission`，
第一輪就會把 ToF 交給 `TofManager`。此外 `AndroidManifest.xml` 也宣告了
`USB_DEVICE_ATTACHED` 與 `res/xml/device_filter.xml`，插上眼鏡時系統會直接把授權給本 APP。
若 ToF 已授權卻仍未就緒，watchdog 會重建 `TofManager`（其建構子會重新排程 SDK 的裝置探索），最多三次。

`TofManager.isDeviceSupportToF()` 的實作與名稱相反（尚未找到 ToF 時回傳 `true`），且裝置枚舉是非同步的，
所以絕不能用它決定是否釋放 ToF。手勢事件另外要求 ToF 韌體 **v1.2.2 以上**：SDK 會把版本字串折成整數，
低於門檻就整段不送 gesture callback，Logcat 的 **ToF Firmware** 因此是必看欄位。

全程不需要、也不會啟動、繫結或依賴原廠 `J-Reality-Gesture` App；repo 內的 APK 僅作靜態比對用途。

## 診斷：全部在 Logcat

正式版畫面上不顯示任何診斷資訊，但每一層仍然照舊回報，只是改寫進 Logcat。實機卡住時用：

```bash
adb logcat -s JorjinVerifier JorjinToF JorjinGesture
```

會看到同一套逐層狀態，判斷方式跟以前的面板一模一樣：

```text
JorjinVerifier: RGB Camera：Connected
JorjinVerifier: ToF USB：Detected　Permission：Granted
JorjinVerifier: ToF Manager：Opened
JorjinVerifier: ToF State：Ready　Firmware：1.2.2　Gesture Listener：Registered
JorjinVerifier: 影像幀：1,200　ToF 深度幀：860　手勢次數：12
JorjinVerifier: 手勢：向左 LEFT（深度幀）#13
```

`JorjinToF` 是 SDK 邊界追蹤（誰在什麼時間對哪一個 `TofManager` instance 做了什麼），
另有完整 USB 枚舉（vendorId／productId／deviceId／deviceClass／interface 數量與每個
interface 的 class/subclass/protocol／授權狀態），同一份內容也寫進 Logcat 的 `JorjinVerifier` tag。
每一筆手勢事件在防重複判斷**之前**就會寫入 Logcat 的 `JorjinGesture` tag：

```text
JorjinGesture: action=1 (ACTION_RECEIVED) gesture=5 label=PUSH timestamp=... raw=27
```

`ACTION_RECEIVED` 才會更新「最後手勢」；300 ms 防重複只針對相同的 (action, gesture) 組合，
被濾掉時也會留下一行 Log，所以「完全沒有手勢」與「有手勢但被濾掉」不會混淆。

## CI 與下載位置

`.github/workflows/build-android.yml` 會在 push、pull request 與手動觸發時跑單元測試，建置
`debug`／`release` 兩支 APK，接著**對即將發布的 APK 本身**做驗證：

- `unzip -t`：ZIP 結構完整，排除下載被截斷或封裝損壞。
- `apksigner verify --verbose --print-certs`：簽章有效，並印出簽署憑證。
- `aapt2 dump badging`：核對 package、`minSdk`／`targetSdk`、`versionCode`／`versionName`、ABI。
- 擋下任何 `required="true"` 的 `uses-feature`，以及 JJSDK AAR 會併入的 `opengles.aep`、
  錄音／儲存權限。**這類宣告會讓安裝程式直接拒裝且不顯示原因**，必須在 CI 就攔下來。
- 比對簽章憑證 SHA-256 是否等於 repo 內固定測試金鑰的指紋；不同就讓建置失敗，避免又出現
  `INSTALL_FAILED_UPDATE_INCOMPATIBLE`。
- 核對 `application-label` 是 `反詐AR體驗`，而且**不帶任何版本別字樣**（線上版／線下版／
  online／offline）。resource merging 有沒有真的生效是打包決定的，原始碼層級的測試看不到。
- 擋下 `online` / `offline` variant 復活：正式版只有一支 APK。

APK 是不是一個完整的離線體驗，也在 artifact 上驗，而不是相信建置腳本：

- 必須有 `assets/cibar/index.html`、`manifest.json`、JS、CSS、`.mind` 圖像辨識資料集、
  `.mp4`／`.mp3`／`.webp` 情境素材。（開場已經改成純 CSS 動畫，沒有 `media/intro/` 這個資料夾了。）
- 必須有 `assets/cibar-baseline-manifest.json`，而且它**不能**在 `assets/cibar/` 裡面
  （在裡面就等於把它暴露給頁面的 origin）。
- 那份 manifest 宣告的版本，必須等於同一個 commit 由 `webapp/scripts/ota-version.mjs` 算出來的
  OTA 版本。不相等的話，每一支剛裝好的手機都會為了拿到自己內建的那一份而下載 80 MB。
- 從 APK 裡解出來的 `index.html` 必須以 `/ScamAware-AR/` 為 base，否則它在手機上每個 asset 都會 404。
- 對 APK 內實際打包的網頁 bytes 重跑一次禁網稽核（Gradle 已對 staging 目錄跑過一次）。

Lint 在 APK 產出**之後**才執行且只作報告（`continue-on-error`），樣式類問題不會擋住可測試的
APK；報告另存為 **lint-report** Artifact。

每次 push 到 `main` 都會重建並覆蓋 `debug-latest` pre-release，因此該 tag 永遠對應最新的 `main`：

```text
push 到 main → Build Android APK → 驗證 APK → 上傳 Artifact → 更新 debug-latest Release
```

取得 APK 有兩種方式：

1. **GitHub Release（手機最方便）**：<https://github.com/magician-eric/ScamAware-AR/releases/tag/debug-latest>
   （`main` 用 `debug-latest`；其他分支各自發布 `debug-<branch>`，方便未合併前先拿去實機測。）
   直接用手機瀏覽器開啟，**點 Release 內文最上面的下載連結**即可安裝，不需解壓縮。
   Release asset 的檔名是 ASCII 的 `CIBAR-<shell>-web<bundle>.apk`：GitHub 的 release-asset API 會把
   `[A-Za-z0-9.+_-]` 以外的每一個字元換成點，中文檔名上傳完會變成 `CIBAR-...........apk`，
   內文裡的下載連結就失效了。中文名字改走 asset 的 label，桌面名稱仍然是 **反詐AR體驗**。
2. **Actions Artifact**：**Actions > Build Android APK > 該次成功執行 > Artifacts >
   CIBAR-AR-apk**。下載的是 zip，解壓縮後檔名就是 `CIBAR-反詐AR體驗-<shell>-web<bundle>.apk`。

- 手機安裝用：`CIBAR-<shell>-web<bundle>.apk`（artifact 內為 `CIBAR-反詐AR體驗-<shell>-web<bundle>.apk`）
- adb／Android Studio 偵錯用：`CIBAR-<shell>-web<bundle>-debug.apk`（artifact 內為 `CIBAR-反詐AR體驗-<shell>-web<bundle>-debug.apk`）
- Gradle 原始位置：`app/build/outputs/apk/<buildType>/app-<buildType>.apk`

舊的線上版／線下版 `applicationId` 不同（`…jorjinverifier.online`／`…jorjinverifier.offline`），
跟這一支不是同一個 App，會各自留在桌面上。確定不再需要就移除：

```bash
adb uninstall com.bigxreality.jorjinverifier.online
adb uninstall com.bigxreality.jorjinverifier.offline
```

手機直接安裝時，需先在 Android「設定 > 應用程式 > 特殊存取權 > 安裝未知應用程式」允許瀏覽器或
檔案管理員安裝。這是測試金鑰簽章的版本，無法上架。

## Web bundle 的發布（OTA）

APK 的 CI 不發佈 web bundle；那是 `.github/workflows/deploy-pages.yml` 的工作，在 merge 進
`main` 之後跑：

```text
PR merge → main
  → npm ci
  → 測試（offline audit 的測試、OTA publisher 的測試、開場動畫的測試）
  → npm run build
  → 禁網稽核（audit-offline-web-assets.mjs）
  → 算出版本（1.x.x-YYYYMMDD-NNN）
  → 產生 bundle.zip / manifest.json / sha256.txt / latest.json
  → 建立 GitHub Release web-<version> 並上傳前三個
  → 從外部把 bundle.zip 抓回來，比對 SHA-256、unzip -t
  → 最後才把 latest.json 放進 site/ 並部署 Pages
```

**`latest.json` 一定是最後才發布的。** 指標先於它指向的檔案發布出去，就是手機下載 404；
指標在上傳完成之前發布出去，就是手機下載半個壓縮檔。兩種都是無聲的——手機就是不會更新——
所以這個順序有測試釘住（`AppIdentityTest.theOtaPointerIsPublishedLast`）。

發布之後的位置：

```text
https://magician-eric.github.io/ScamAware-AR/ota/latest.json
https://magician-eric.github.io/ScamAware-AR/updates/releases/<version>/manifest.json
https://magician-eric.github.io/ScamAware-AR/updates/releases/<version>/sha256.txt
https://github.com/magician-eric/ScamAware-AR/releases/download/web-<version>/bundle.zip
```

`bundle.zip` 放在 GitHub Release 而不是 Pages 上，因為 Pages 每次部署都會整份換掉，
而舊版本的 bundle 必須在手機下載到一半時仍然存在。Pages 上只放目前這一版的 metadata；
歷史版本在 GitHub Releases 裡。

> CI 只能驗證程式、Manifest、ABI 與封裝。RGB 預覽、實際幀輸入、USB 授權流程、ToF 手勢、DP Alt Mode 和供電必須使用指定手機與眼鏡實機驗證。
> 「顯示 WebView 的同時硬體仍持續運作」以及「LEFT／RIGHT 真的切換本機測試頁」同樣**需要實機驗證**。
