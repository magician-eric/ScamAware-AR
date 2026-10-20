# ar-app — 給後續 session 的必讀

這個檔案記錄的是**已經害人繞過遠路的具體錯誤**。每一條都真的發生過，不是預防性的一般建議。

> 跨 repo 的工作規則（版本編號、OTA 發布、交付紀錄）在 [`../CLAUDE.md`](../CLAUDE.md) 與
> [`../docs/RELEASE_VERSIONING.md`](../docs/RELEASE_VERSIONING.md)。APK 的 `SHELL_VERSION`／
> `versionName`／`versionCode` 都是從 `release/versions.json` 推導出來的，不要在 `build.gradle`
> 裡寫死版本號。

## 1. 手勢來自 ToF 模組自己的引擎（方向鍵）與深度幀，不是 JJSDK 的 gesture event

`TofGestureEvent` / `setTofGestureListener` 那條路徑**在這副眼鏡上是死的**，而且不可能修好。

JJSDK 讀的是**韌體**填的 bitfield，閘門在 `TofManager.a()`：

```java
int acc = 0;
for (String part : firmware.split("\\.")) acc = acc * 16 + Integer.parseInt(part);
x = acc >= 290;      // 290 == 0x122 == "1.2.2"，十六進位打包
```

韌體低於 1.2.2 就永遠不會設那些 bit。**沒有任何 USB 授權時機、listener 順序或 lifecycle 修改能產生事件。**

實際會動的有兩條，**都不是** `TofGestureEvent`：

- **模組內建手勢引擎 → 眼鏡送鍵盤方向鍵。** 韌體 1.2.0 以上的 ToF 模組自己會認手勢，認到就從眼鏡的
  USB 鍵盤介面按下 Left／Right Arrow。JJSDK 連線時其實已經送了 `settofmode 1` 把引擎打開
  （SDK 的指令表是加密字串，解開後的握手是 `settofpwr 0` → `getfirmver` → `settofpwr 1` →
  `settofmode 1` → `settofconf 0`）。原廠手勢 App（`J-Reality-Gesture_v0.9.5.apk`）在這個模式下
  **手機端完全不跑演算法**（`DummyParseRunnable`），只送 `settofkey L keyleft`、`settofkey R keyright`
  這類按鍵對應，然後靠方向鍵。方向鍵經 Android 送進 WebView，由
  `webapp/src/lib/arInteraction/native/glassesKeyGestures.js` 接住（只在眼鏡 App 內生效）。
- **`TofGestureRecognizer`**：從 `setTofFrameListener` 拿到的原始 8×8 深度網格自己算
  （舊韌體時原廠 App 用 `libcalculate_gesture.so` 做同一件事，整段軌跡＋訊號強度）。

兩條在 `webapp` 的 `subscribeNativeGestures` 合流：兩個管道 1 秒內只算一次（不論方向，回程也擋掉）。外殼 1.2.2 起深度辨識的手勢帶 `recognizer: 2`，網頁 1.8.1 起與方向鍵**同時採用**；舊外殼沒有這個欄位，模組方向鍵一出現就只聽方向鍵（同 1.8.0）。深度辨識在現場出問題時，把 webapp 的 `DEPTH_ALONGSIDE_KEYS_FROM_RECOGNIZER` 改成 `Infinity` 發 OTA，就退回只聽方向鍵，不用重裝 APK。

### 深度辨識第二代（shell 1.2.2 起）

`TofHandExtractor` 先決定「這一張畫面裡哪裡是手」，`TofGestureRecognizer` 再看整段軌跡判斷方向：

- **背景學習**：手勢範圍（10–50 cm，1.2.5 起最近距離可調）以外的東西 1 秒學成背景；範圍內的東西要靜止 4 秒（剛辨識出手勢後
  要 10 秒，避免把停在原地的手學進去）。比鄰格背景還近、**而且比背景近至少 10 公分**（1.2.4 起，
  原本 6 公分）才算前景，已知物體邊緣閃爍不會被當成手。
  單格短暫掉值（強光常見）不會讓學習重來。
- **只追最近的一團**：最近、有鄰格支撐的那一格決定深度帶，只取帶內、可跨一格空隙相連的那一團。
- **訊號強度**：團內比最強那格弱很多的格子丟掉；位置用訊號加權，手只蓋半格時位置也能細到零點幾格。
- **手的大小**：比該距離下的手大太多（例如身體）就不是手。
- **頭在轉**：學到的近物退後、而且「手」就在那個深度 → 整個畫面在移動，這張不算。
- **軌跡**：切成一段一段；手離開時取最大的一段；折返或停住時只有夠大（≥2 格）且停在外側才立刻送。
  單一跳動、推／拉（距離變化 >35%）、25 cm 以外從沒完整出現在畫面中（像旁邊經過的人）都不算。
- **鎖定**：送出後要淨空 300 ms 才重新武裝；反方向且在 1.2 秒內開始的是回程，不算。
- **與模組合作**：眼鏡模組按方向鍵（`MainActivity.dispatchKeyEvent` → `onModuleGestureKey`）或韌體手勢
  會鎖住深度辨識，同一次揮手不會兩邊各算一次；兩邊都看到時會比對方向，連續 3 次相反且從未一致就自動翻轉左右。
- **不送過期的揮手**（1.2.3）：一段動作 0.25 秒沒有再往前就結束（不是「停在半徑內」——手舉著會抖，
  以前抖動讓那一段一直不結束，等手放下才送出，變成「記住上一個揮手、到下一題自動幫你選」）；
  結束超過 0.6 秒的動作一律不送。
- **紀錄檔**：`Android/data/<package>/files/tof-frames.txt`。1.2.3 起**每一張畫面都寫**（約 6 KB/s，
  4 MB 輪替一次，手機上隨時保有最近約 20 分鐘），中間夾著模組按鍵、深度辨識送出／否決的理由。
  「完全沒反應」的那一下也查得到。調參數就靠這個檔，**現場有問題先拉這個檔**。

### 背景牆、台下觀眾、雜訊（1.2.4 起）

現場玩家一定站在背景牆前面揮手，教室宣導時台下坐滿人。處理方式分四層，全部在 `TofHandExtractor`：

- **手要比背後的東西近 10 公分以上**（`FOREGROUND_MARGIN_MM = 100`）：牆、桌子是學到的背景，手貼著牆
  揮不算。掃描海報時人會站得很近，所以掃到之後畫面提示「請先退後一步，再往右揮手」（只在有眼鏡時）。
- **手勢最遠距離**（工作人員模式：50／40／35 公分，`GestureSettings`，存在 `cibar_gesture`
  SharedPreferences，重開 App 還在）：超過的人和東西完全不看。後面有觀眾時調近。
- **訊號過濾**（工作人員模式：自動／寬鬆 5%／標準 12%／嚴格 25%）：同一張畫面裡，比手勢範圍內第三強
  的回波弱於這個比例的格子直接忽略（用第三強不用最強，一兩個反光點定不了門檻）。**自動**看「沒有手的時候
  每張畫面有多少格在有讀值／沒讀值之間跳」：<10% 用 8%、10–25% 用 15%、≥25% 用 25%。
- **剛亮起的孤立格子要撐過一張畫面**：上一張沒讀值、這一張有，而且周圍前景鄰格少於 2 格 → 這一張先不算。
  整塊出現的手不受影響，第一張就算。
- 位置加權改成訊號**平方**：只被手擦到一點的格子幾乎不影響位置。

軌跡另外三條（`TofGestureRecognizer`）：

- **手停住可以接著揮**：送出後手沒放下、停住 600 ms，就重新開始追蹤；但之後的動作要至少每秒 3 格，
  手臂慢慢放鬆飄回去不算。回程規則（1.2 秒內反方向）照舊。
- **手刀擦過邊緣**：往前進方向的那一側離開畫面的動作，只要 0.9 格（原本 1.2 格）。
- **還沒過畫面中線就消失的不算**：手從旁邊伸進來又拿走、或手太靠近牆而「消失」，都不是揮手。

試過但拿掉的：「上下相鄰 2 格也算手」（給手刀用）。模擬時誤觸變多、成功率反而下降；手刀在 15–45 cm
本來就有 4 格以上高，不需要。

模擬（`TofScene` 隨機情境，1000 次揮手＋1800 次非揮手）：揮手 96.6%（15–30 cm 100%、30–42 cm 98%），
誤觸 0–3 次；手刀 15–30 cm 98%、30–42 cm 90%。

### 太近的雜訊：臉、眼鏡框、手碰眼鏡（1.2.5 起）

實機紀錄檔（使用者故意越揮越近）顯示：**什麼都沒放在前面時**，靠鼻子那三欄與下面兩排（臉頰）有 30–50%
的畫面讀到 1–9 cm——那是配戴者自己的臉、鏡框、蓋玻片。整份檔案所有讀值有約 27% 在 10 cm 以內。

- **手勢最近距離**（工作人員模式：5／10／15 公分，預設 **10**）：比它近的都不看。
- **太近就整張不算**：最近距離以內有 4 格以上（不含遮蔽格）→ 這一張是「手貼在眼鏡上」，不找手。
  沒有這條的話，貼近的手邊緣（手指、稍遠的掌心）落在 10–13 cm，會被當成另一隻手——拿實機紀錄重播時，
  光設 10 cm 還有 16 個 10 cm 的「手勢」，加上這條後一個都沒有。
- **自動遮蔽閃爍格子**：沒有手時，在手勢範圍內「有讀值／沒讀值」一直跳的格子（每張畫面平滑 0.03，
  ≥20% 遮蔽、<10% 解除，最多 24 格）不再當前景。即時感測畫面用斜線顯示。
- 有東西太近或太大時不更新雜訊統計與遮蔽（那不是空的畫面）。

用那份紀錄重播：1.2.4 報出 47 個手勢（多數在 3–9 cm），1.2.5 報出 23 個、全部 ≥11 cm。
模擬：15–42 cm 與 1.2.4 相同，非揮手誤觸 0/1800；8–10 cm 的揮手照設計不再算。

`setGestureSettings` 舊的兩參數呼叫保留（用預設最近距離），新的是 `setGestureRange(min, max, mode)`。

### 工作人員模式的手勢工具（1.2.4 起）

`StaffToolsBridge`（`window.__cibarStaffTools`，第三個 `addJavascriptInterface`，只給工作人員模式用）：

- `getGestureSettings()`／`setGestureSettings({ maxRangeCm, signalMode })`：只接受按鈕上的選項，
  其他值取最近的選項。改了會在紀錄檔寫一行「工作人員設定：…」。
- `liveFrame()`：最新一張 8×8（公分、訊號、哪幾格被當成手、目前雜訊與門檻），網頁每 150 ms 讀一次畫成格子。
- `shareTofLog()`：把 `tof-frames.1.txt`＋`tof-frames.txt` 接成一個檔（加上手機、版本、設定的標頭）放在
  cache，透過自己的 `TofLogProvider`（不依賴 androidx.core 的 FileProvider；不 export、只讀、只認匯出檔名）
  開分享選單（LINE、Email）。結果用 `cibarTofLogExport` 事件告訴網頁。開分享選單會讓 App 進背景、眼鏡暫停，
  回來後 `onStart` 重新連線——這是預期行為。

### 強光（黃光燈）下的揮手（1.2.8 起）

鹵素燈、投射燈這類黃光大多是紅外線，會淹沒 ToF：實機紀錄（2026-10-20 刑事警察局）沒手時訊號只剩 0–40
（平常數萬），手只有在 5–11 cm、而且只出現 2–3 張畫面時才看得到。因此：

- **只出現 2 張畫面、但水平移動 ≥3 格**的也算揮手（`TWO_FRAME_MIN_TRAVEL`）。閃爍或形狀改變移不到這麼遠。
- **推／拉要距離變化 >35% 而且 >8 cm**（`MIN_DEPTH_CHANGE_MM`）：11→6 cm 的斜向劃過不再被當成推。
- 用 6 份實機紀錄重播：預設 10 cm 下多認出的 27 下，20 下方向與手的移動一致、0 下相反、7 下看不出來；
  JVM 的誤觸模擬照樣通過。
- **「太近就整張不算」只數訊號 ≥200 的格子**（`TOO_NEAR_MIN_SIGNAL`）。強光會讓沒有東西的格子讀到 1–9 cm、
  訊號只有幾十（即時感測畫面上一堆紫色小數字）；以前這些格子湊滿 4 格就整張丟掉，強光下幾乎每張都被丟。
  真的貼在眼鏡前的手或臉訊號是幾千，照樣擋。重播 16 日的 5 份紀錄（預設 10 cm）：辨識數約翻倍
  （例如 62→114），多出的絕大多數與手的移動方向一致；20 日那份向左從 1 下變 8 下。
- 預設最近距離仍是 10 cm。**強光現場請在工作人員模式改成 5 公分**，否則 5–10 cm 的手全部看不到
  （那份紀錄：10 cm 只認到 5 下，5 cm 認到 17 下，約 28 次揮手）。

### 模組手勢引擎照原廠順序設定（1.2.9 起）

到 1.2.8 為止，**所有實機紀錄檔裡沒有任何一次模組方向鍵**，原廠 App 在同一副眼鏡上卻有反應。拆原廠
`TofManager.usbSerialRunnable` 的順序是：`settofpwr 0` → `getfirmver` → `settofmode 1`（韌體 ≥1.2.0）→
`settofkey …` → `settofpwr 1` → `settofconf 0`，也就是**感測器關著時**設定引擎與按鍵。我們以前是在串流中途只送
`settofkey`。1.2.9 起照原廠順序送（`ModuleGestureKeys.BEFORE` / `COMMANDS` / `AFTER`），並把韌體版本、每個指令
的回覆、眼鏡送來的**每一個按鍵**都寫進紀錄檔（`模組指令 … → OK`、`按鍵 KEYCODE_…`）。下一份紀錄檔先看這幾行。

### 插上眼鏡不再自動開 App（1.2.6 起）

manifest 的 `USB_DEVICE_ATTACHED` intent-filter 已移除：由插入眼鏡啟動的 App 會卡在空白首頁。
改成手動開 App；App 開著時插眼鏡照樣由 `JorjinHardwareManager` 的 receiver 接手，USB 權限走一般對話框。

### 沒插眼鏡時用手機鏡頭（1.2.3 起）

- 啟動時（不需要任何權限）就列舉 USB 判斷眼鏡在不在，USB 插拔時再更新，發給網頁
  `window.__cibarGlasses = { connected, camera, tof }`（事件 `cibarGlassesChange`）。
- `window.__jorjinCamera.available` 改成**眼鏡鏡頭真的插著**才是 true。以前只要 `GlassesCameraStream`
  物件存在就是 true（它永遠存在），沒插眼鏡時網頁會等眼鏡鏡頭 8 秒然後報鏡頭錯誤。
- `WebChromeClient.onPermissionRequest`：只有**沒插眼鏡鏡頭**、App 有相機權限、而且只要求影像時才允許
  `getUserMedia`（手機鏡頭）。插著眼鏡時一律拒絕——戴著眼鏡時手機鏡頭不能亮。
- 眼鏡在 App 開著時才插上：通知網頁，並且如果硬體還沒啟動就立刻啟動。

### 工作人員模式的現場燈光檢測（1.2.3 起）

- `TofEnvironmentMeter` 持續保留最近 2.5 秒的 ToF 畫面，`EnvironmentCheckBridge`（第二個
  `addJavascriptInterface`，只給工作人員模式用）讓網頁讀 `window.__cibarEnvironment.tofSnapshot()`：
  雜訊比例、手的偵測率、距離抖動、訊號。SDK 不給環境光數值，所以量的是光線造成的效果。
- 判斷門檻在網頁（`webapp/src/lib/environment/environmentCheck.js`），改門檻只要發線上更新。
- 網頁 1.9.2 起最後加 10 秒**誤觸測試**：不揮手、照常站在牆前轉頭說話，數這段時間被認成手勢的次數
  （1 次警告、2 次以上「會影響辨識」），建議調整上面的「手勢最遠距離」「訊號過濾」。

這些門檻是用模擬畫面（`TofScene`）與大量隨機情境調出來的，不是實機量出來的；實機紀錄檔回來後要再校一次。

**這件事真的害過驗收。** 以前只看了 `TofGestureEvent`（死的）和 `libcalculate_gesture.so`（閉源），
就自己寫了一個只比頭尾位置的深度辨識，沒發現原廠 App 靠的是模組送方向鍵；網頁正式版又刻意不聽鍵盤，
於是模組認出來的手勢全被丟掉。現場原廠 App 揮動正常、我們時好時壞，差別就在這裡。

從 shell 1.2.1 起，ToF 每次就緒（含 watchdog 重建後）都會用 `TofManager.execute` 送一次完整的按鍵對應
（`ModuleGestureKeys`：`L→keyleft`、`R→keyright`，`U／D／PUSH／PULL／HALT→keynone`）。**不可以省略**：
原廠 App 的預設對應是 `PULL→keyback`、`PUSH→keyenter`，模組會一直記得最後一次被設定的對應——有人走開、
把眼鏡拿下，模組就按「返回」，App 退到背景，看起來就是「放著不動就閃退」（見第 12 條）。

現場方向鍵沒進來時：先 `adb shell getevent -l` 看揮手時有沒有 `KEY_LEFT`／`KEY_RIGHT`，再看 Logcat 的
`模組手勢按鍵 settofkey … → OK／未確認`。進來了卻沒反應，在 WebView inspector 設
`__CIBAR_AR_GESTURE_DIAGNOSTICS__ = true`，看 `[JorjinGesture] ... eventId=jorjin-tof-key:...` 那一行。
`MainActivity.dispatchKeyEvent` 會把每一個按鍵和它來自哪個裝置寫進 Logcat（`按鍵 KEYCODE_… 來自 …`）。

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

## 12. 「放著不動就閃退」有三個不同的原因

三個看起來都一樣（App 自己不見），修法完全不同。shell 1.2.1 三個都處理了，並且每次啟動都把上一次
結束的原因（`ActivityManager.getHistoricalProcessExitReasons`）寫進 Logcat 與 `crash.txt`——
**先看那一行，不要猜**。也可以直接 `adb shell dumpsys activity exit-info com.bigxreality.jorjinverifier`。

- **模組按了返回鍵。** 原廠 App 設過的對應是 `PULL→keyback`；有東西離開感測器（人走開、眼鏡拿下）
  就送 Back，`MainActivity.onKeyDown` 讓 WebView 退一頁，在第一頁就把 App 退到背景。這種情況
  exit-info **不會**有紀錄（程序沒死），要看 Logcat 的 `按鍵 KEYCODE_BACK 來自 …`。修法是第 1 條的
  `ModuleGestureKeys`。
- **WebView 渲染程序死掉。** 它是獨立程序，頁面跑久了可能被系統回收或自己崩潰；App 沒處理
  `onRenderProcessGone` 的話，Android 會把**整個 App 一起殺掉**。現在 `WebLayerController` 會移除並
  釋放失效的 WebView、回傳 true，由 `MainActivity.onRendererGone` 冷啟動 CIBAR；一分鐘內第二次就不再
  重啟（`CrashRecovery`），避免無限重啟。失效後 WebView 只能 `destroy()`，所有用到它的方法都先檢查
  `rendererGone`——新增方法時也要。
- **眼鏡的鍵盤介面重新連線。** 眼鏡同時是 USB 鍵盤；鍵盤出現或消失是 `keyboard|navigation` 設定變更，
  沒宣告在 `configChanges` 的話 activity 會被銷毀重建：硬體釋放、CIBAR 從開場重來。
  `ProductionStartupTest` 釘住這幾個 configChanges。

## 13. OTA 發布後要確認 Pages 上的 `latest.json` 真的換了

merge 進 `main` 時 `deploy-pages.yml` 和 `ota-release.yml` 同時跑。Pages 部署用的是 **merge 當下**的
`release/ota/latest.json`（還是舊版），而 `ota-release.yml` 幾秒後才寫入新版，且那個 commit 是
`[skip ci]`，不會觸發重新部署——手機就一直看到舊版。1.7.8 與 1.7.9 都發生過。

發布後在 Actions 手動跑一次 `Deploy to GitHub Pages`（workflow_dispatch，ref=main），讓它從帶有新
`latest.json` 的 commit 重新部署。

## 建置

`dl.google.com` 在 Claude Code 沙箱被網路政策擋住，Android SDK 與 AGP 都拉不下來，`./gradlew` **無法在該環境執行**。改用：

- `org.robolectric:android-all`（Maven Central 拿得到）當 `android.jar` 用 `javac` 編譯
- `app/libs/jjsdk.aar` 若是 placeholder，用 `git cat-file blob ca510d9dc8680423da77be49aeb89eaa788e1bea > app/libs/jjsdk.aar` 還原（**不要 commit**）
- `androidx.webkit`（`WebViewAssetLoader`）同樣拉不下來，手動編譯時自己寫個 stub 即可；
  正式編譯還是靠 CI
- 更省事的做法：直接跑 `android/tools/run-jvm-tests.sh`，它會自己抓 `android-all`、JUnit、
  `org.json`，補上 `R` 與 `androidx.webkit` 的 stub，編完整個 module 並跑完所有單元測試
- 真正的建置（APK）由 CI 完成
