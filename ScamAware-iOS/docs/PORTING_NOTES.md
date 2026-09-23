# 移植說明：從 ScamAware-AR/webapp 到 ScamAware-iOS/web

## 來源快照

- repo：`magician-eric/ScamAware-AR`，commit `817df36`（Web Bundle 1.7.6）
- 複製了：`webapp/src`、`webapp/public`、`index.html`、`vite.config.js`、`package.json`、
  `package-lock.json`、`.oxlintrc.json`、`.gitignore`
- 沒複製：`webapp/scripts`（Android／OTA 用的驗證與發布腳本；需要的離線稽核已改寫到 `scripts/`）、
  `asset-sources`（只取了五張辨識圖卡與 App 圖示原檔）

**之後兩邊不會自動同步。** Android 版改了情境內容，iOS 版要有人刻意重新複製並重跑本文件列的修改。

## 刪除的檔案

| 路徑 | 原本用途 |
| --- | --- |
| `src/components/native/NativeGestureBridge.jsx` | 眼鏡 ToF 手勢 → 互動契約 |
| `src/components/debug/` | 手勢除錯覆蓋層 |
| `src/lib/arInteraction/native/` | JJSDK 手勢轉接器 |
| `src/lib/arInteraction/debug/` | 鍵盤模擬手勢 |
| `src/pages/gestureTutorial/` | 手勢教學頁 |
| `src/lib/ota/`、`src/pages/staff/StaffVersionPanel.jsx` | Android OTA 更新控制與面板 |
| `src/pages/arScan/ArScanDiagnosticsOverlay.jsx` | 掃描診斷面板 |
| `public/assets/shared/ui/gesture/` | 手勢教學圖片 |
| `public/sw.js` | Service Worker（自訂 scheme 下不可用，也不需要） |
| `src/**/*.test.js` | 原專案的單元測試（依賴已刪除的模組或 Android 腳本） |

`src/lib/arInteraction/`（互動契約本身）**保留**：各情境畫面用它宣告「這一頁有哪些動作」，
沒有手勢輸入時它只是不會被觸發，按鈕的 `onClick` 照常運作。

## 修改的檔案

| 路徑 | 修改 |
| --- | --- |
| `src/App.jsx` | 不再掛載手勢橋接與除錯覆蓋層 |
| `src/routes.jsx` | `/gesture-tutorial` 改為轉址到 `/ar-scan` |
| `src/pages/LanguageSelect.jsx` | 選完語言直接到 `/ar-scan` |
| `src/lib/ar/cameraSource.js` | 只剩 iPhone 相機（`getUserMedia`，後鏡頭優先，1280×720）；移除眼鏡 MJPEG 路徑；加上 iOS 需要的 `playsinline`／`muted` 屬性 |
| `src/lib/ar/scanDiagnostics.js` | 診斷面板永遠關閉（紀錄仍保留） |
| `src/pages/arScan/ArScanHome.jsx` | 移除診斷面板 |
| `src/components/hints/interactionHintI18n.js` | 閒置提示三語改成「點選」 |
| `src/pages/staff/StaffSetupScreen.jsx` + 新增 `IosVersionPanel.jsx` | OTA 面板換成唯讀的 iOS 版本資訊 |
| `src/lib/releaseInfo.js`、`src/main.jsx` | 版本資訊改讀 iOS 的 `version.json` 與原生注入的 `window.__scamAwareIOS` |
| `vite.config.js` | `base: '/'`；版本改讀 `../version.json`（ScamAware-iOS 內） |
| `package.json` | 名稱改為 `scamaware-ios-web`，移除 Android 專用的 prebuild 驗證與測試腳本 |

`src/lib/ar/imageRecognition.js`（MindAR 辨識）**完全沒改**，辨識參數與 Android 版相同。

## 重新同步的步驟（當 Android 版內容更新時）

1. 在新的 webapp commit 上，把 `webapp/src`、`webapp/public` 覆蓋到 `ScamAware-iOS/web/`。
2. 重做上面「刪除」與「修改」兩張表（可以對照 `git diff` 本目錄上一版）。
3. `node scripts/check-ios-port.mjs`：會抓出漏刪的眼鏡／手勢／OTA 程式與漏掉的必要項目。
4. `bash scripts/build-web.sh`，再跑 `scripts/browser-smoke/`。
5. 更新本文件的「來源快照」、`version.json`、`dist/ios/<新版本>/CHANGELOG.md`。
