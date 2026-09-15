# 眼鏡 RGB Camera → 掃描辨識：分層診斷

適用於「戴上佐臻眼鏡 → 進 `/ar-scan` → 眼鏡畫面沒出現／辨識沒啟動」這一類回報。

手勢（LEFT／RIGHT）**不在這條鏈上**：手勢來自 ToF 8×8 深度感測器，是另一顆硬體、另一條 native bridge。
**ToF 正常不代表 RGB Camera 正常**，反過來也一樣。這份文件只談 RGB Camera 這條鏈。

---

## 這條鏈長什麼樣

```
JJSDK CameraManager (USB UVC, RGBA)
  └─ JorjinHardwareManager.setCameraFrameListener      ← 「RGB frames:」
       └─ GlassesCameraStream.offerFrame(ByteBuffer)   ← 「accepted frames / rejected frames」
            └─ WebLayerController.shouldInterceptRequest ← 「MJPEG request intercepted」
                 └─ GlassesCameraStream.newBody() (multipart/x-mixed-replace)
                      └─ WebView <img src="…__jorjin-camera.mjpeg">   ← 「firstFrame」
                           └─ lib/ar/cameraSource.js  (FrameSource)   ← 「cameraSource」
                                └─ lib/ar/imageRecognition.js         ← 「imageRecognition / dataset / match」
```

descriptor（`window.__jorjinCamera`）是另一條、由 Android 往頁面注入的小路徑，它決定頁面走「眼鏡」還是「手機」：

```
WebLayerController.publishCameraDescriptor()
  → evaluateJavascript("window.__jorjinCamera={…}")   ← 「Jorjin Camera Descriptor:」
       → cameraSource.readGlassesCameraDescriptor()   ← 「descriptor」
```

---

## 根因（本次修正）

`shouldInterceptRequest` 回的 `WebResourceResponse` 只帶了媒體型別、**沒有帶 boundary**：

```java
// 修正前
new WebResourceResponse("multipart/x-mixed-replace", null, stream.newBody());
```

`multipart/x-mixed-replace` 的每一格由 `Content-Type` 的 `boundary=` 參數切開。沒有 boundary，瀏覽器就沒有任何依據把 body 切成一張一張 JPEG，於是：

- `<img>` **一張都解不出來** → `naturalWidth` 永遠是 0
- 沒有 `load` 事件 → 頁面只能等到自己的 8 秒 first-frame timeout
- 頁面顯示「無法使用相機」，**但相機、USB、JPEG 編碼全部是好的**

`MjpegFraming.CONTENT_TYPE`（帶 boundary）本來就存在，而且有單元測試 —— 只是從來沒被送出去。

修正後 boundary 走真正的 HTTP header（`WebResourceResponse` 的 mimeType 參數依文件不得帶參數）：

```java
new WebResourceResponse(MJPEG_MIME_TYPE, null, 200, "OK", glassesCameraHeaders(), stream.newBody());
// glassesCameraHeaders() → Content-Type: multipart/x-mixed-replace; boundary=jorjinframe
```

---

## 怎麼看每一層（不用接 Chrome DevTools）

### A. 螢幕上的 overlay

診斷面板 →「**開啟 CIBAR（掃描診斷模式）**」（＝ `CIBAR/?diag=1`）。
`/ar-scan` 會把整條鏈畫在畫面左上角，**第一個不是 ok 的那一層就是斷點**：

```
Descriptor:     ok    present=true available=true streamUrl=… width=640 height=480
Camera source:  ok    kind=glasses frameWidth=640 frameHeight=480
MJPEG:          opened url=…__jorjin-camera.mjpeg
Frame:          ok    frameWidth=640 frameHeight=480
Preview:        ok    mounted=IMG kind=glasses
Recognition:    ok    status=running targets=19
Dataset:        ok    targets=19
Last match:     pending
```

失敗時長這樣：

```
Frame:          fail  reason=no frame arrived within 8000ms naturalWidth=0
Stream probe:   fail  status=200 contentType=multipart/x-mixed-replace boundary=(none)
```

玩家模式（一般的「在 App 內開啟 CIBAR」）不會出現這個 overlay。
其他開啟方式：`npm run dev`、或在 WebView inspector 設 `window.__CIBAR_AR_SCAN_DIAGNOSTICS__ = true`。

### B. logcat

Overlay 的每一行同時也是 `console.info`，而 `WebLayerController` 的 `WebChromeClient` 會把 WebView console 轉進 logcat，所以**release APK 不用重編也看得到**：

```bash
adb logcat -s JorjinVerifier
```

會看到 Android 側與頁面側交錯的同一條鏈：

```
JorjinVerifier: RGB frames: 1 640x480 format=0
JorjinVerifier: GlassesCameraStream accepted frames: 1 width=640 height=480 bytes=1228800 rejected=0
JorjinVerifier: Jorjin Camera Descriptor: present available=true streamUrl=… width=640 height=480 hasFrame=true
JorjinVerifier: MJPEG request intercepted: … hasFrame=true width=640 height=480
JorjinVerifier: consumer connected: hasFrame=true width=640 height=480
JorjinVerifier: first frame sequence=137 width=640 height=480 jpegBytes=28714
JorjinVerifier: WebView console: [ar-scan] firstFrame: ok frameWidth=640 frameHeight=480 @…
```

計數只在里程碑印（1／30／120／每 300），30fps 時一秒一行以上就會把 logcat 沖掉，那比不印還糟。

---

## 依症狀往下查

| 看到什麼 | 斷在哪 | 去看哪裡 |
| --- | --- | --- |
| `RGB frames:` 完全沒出現 | JJSDK 沒在送 frame | `JorjinHardwareManager.startCamera`、USB 授權、`StartupMode` |
| `RGB frames:` 有，`accepted frames:` 沒有 | buffer 形狀不合（stride／像素格式） | `GlassesCameraStream.offerFrame` 的 `rejected frames:` 行有 `needed／capacity／remaining` |
| `Jorjin Camera Descriptor: missing` | Android 沒有 camera stream 可給 | `MainActivity.onCreate` 的 `web.setCameraStream(...)` |
| 頁面 `descriptor: fail present=false` | 注入沒到頁面 | `WebLayerController.publishCameraDescriptor`（`onPageFinished` ＋ 每次 route change） |
| 頁面 `descriptor: fail present=true available=false` | 注入到了，但 App 說沒有相機 | 同上，看 Android 的 descriptor 那行 |
| 沒有 `MJPEG request intercepted` | 頁面根本沒發 request，或 request 離開了 App | 頁面 `mjpegRequest` 那行；`WebLayerController.isGlassesCameraRequest` |
| 有 request、沒有 `first frame` | Android 這側沒 frame 或編碼失敗 | `consumer connected` 之後的 `MJPEG body ended: …` |
| `firstFrame: fail` ＋ `streamProbe boundary=(none)` | 就是本次的 boundary 根因 | `WebLayerController.glassesCameraHeaders()` |
| `streamProbe status=404` | request 跑去 GitHub Pages 了（沒被攔截） | `isGlassesCameraRequest` 的比對 |
| `firstFrame: ok`、`imageRecognition: fail` | 相機好了，辨識沒起來 | `lib/ar/imageRecognition.js` |
| `dataset: fail` | `.mind` 沒載到或數量對不上 | `npm run build:image-targets` |

**順序不要跳**：`.mind` 是最後一格，不是第一格。

---

## 眼鏡送出來的畫面本身對不對？

只有 debug 版 APK 會做這件事（`MainActivity.enableGlassesFrameDump`）：每 60 幀寫一張 JPEG 到 app cache，四張輪流覆蓋。

```bash
adb shell run-as com.bigxreality.jorjinverifier ls -l cache/glasses-frames
adb shell run-as com.bigxreality.jorjinverifier cat cache/glasses-frames/glasses-frame-0.jpg > frame.jpg
```

這是唯一能分辨「傳輸壞了」跟「眼鏡送出來的就是黑畫面／破圖」的方法 —— 下游每一層看到的就是這些 bytes。
release APK（tester 手上那支）不是 debuggable，所以永遠不會寫。

---

## 不會退讓的那條線

`window.__jorjinCamera.available === true` 之後，**`getUserMedia` 一次都不會被呼叫**。
眼鏡的串流失敗就是顯示錯誤，不會偷偷開手機後鏡頭 —— 戴著眼鏡的人身上亮起手機鏡頭，正是這整個模組存在的理由。
這條線由 `scripts/ar-glasses-camera.test.mjs` 與 `scripts/ar-scan-diagnostics.test.mjs` 一起釘住：診斷本身不得改變開哪一顆鏡頭。

User-Agent 只被用來決定「descriptor 還沒到時要等多久」（Android WebView 才等，最多 2 秒），**永遠不用來選鏡頭**。選鏡頭的只有 `available === true`。

---

## 相關檔案

| 檔案 | 角色 |
| --- | --- |
| `webapp/src/lib/ar/scanDiagnostics.js` | 記錄與 console 輸出（overlay 與 logcat 同一份資料） |
| `webapp/src/lib/ar/cameraSource.js` | descriptor → 選鏡頭 → MJPEG → first frame → 失敗時的 probe |
| `webapp/src/lib/ar/imageRecognition.js` | recognition／dataset／match |
| `webapp/src/pages/arScan/ArScanDiagnosticsOverlay.jsx` | 螢幕上的 overlay（玩家模式不顯示） |
| `android/app/src/main/java/…/WebLayerController.java` | `shouldInterceptRequest`、descriptor 注入 |
| `android/app/src/main/java/…/GlassesCameraStream.java` | RGBA → Bitmap → JPEG → MJPEG、debug 影像輸出 |
| `android/app/src/main/java/…/JorjinHardwareManager.java` | JJSDK camera lifecycle、RGB frame 計數 |
