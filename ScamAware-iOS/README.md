# ScamAware-iOS

ScamAware-AR 反詐體驗的**獨立 iOS 展示 App**，只給公司內部登記過的 iPhone 使用，**不上架 App Store**。

| 項目 | 值 |
| --- | --- |
| App 名稱（主畫面） | 反詐AR體驗（英：ScamAware AR／日：反詐欺AR体験） |
| Bundle ID | `com.bigxreality.scamaware.ios`（與 Android `com.bigxreality.jorjinverifier` 不同） |
| 版本 | `1.0.0`，唯一來源：[`version.json`](version.json)；建置號由 Codemagic 自動遞增 |
| 最低 iOS | 15.0，只支援 iPhone，直向 |
| 發布方式 | Ad Hoc 簽署 `.ipa`，由 Codemagic 雲端 Mac 建置 |
| 產物位置 | `dist/ios/<版本號>/ScamAware-iOS-v<版本號>-build<建置號>.ipa` |

## 目前狀態（2026-09-23）

| 階段 | 狀態 | 說明 |
| --- | --- | --- |
| **程式檢查完成** | ✅ 完成 | 在 Linux 上完成 web 建置、靜態規則檢查、離線素材稽核，並在桌面 Chromium 用假相機跑過 MindAR 辨識與主要流程。詳見 [`docs/VERIFICATION.md`](docs/VERIFICATION.md)。**Swift 原生碼尚未被編譯過**（這裡沒有 Xcode）。 |
| **雲端建置完成** | ❌ 尚未 | 還沒有 Codemagic 帳號與 Apple 簽章資料。設定已備好：[`codemagic.yaml`](codemagic.yaml)、[`docs/CODEMAGIC_SETUP.md`](docs/CODEMAGIC_SETUP.md)。**目前沒有任何可安裝的 IPA。** |
| **iPhone 實機驗證完成** | ❌ 尚未 | 需要先有簽署好的 IPA。檢查清單在 [`docs/VERIFICATION.md`](docs/VERIFICATION.md)。 |

需要你提供的東西：[`docs/NEEDED_FROM_YOU.md`](docs/NEEDED_FROM_YOU.md)。

## 保留與移除的功能

**保留**：五個反詐情境（投資、愛情、假檢警、假賣家、假買家）、中文／英文／日文、情境影片與音訊、
反詐測驗與分析、MindAR 圖卡辨識（改用 iPhone 後鏡頭）、手動選擇情境、工作人員場地設定（所在地）。
所有素材隨 App 打包，完全離線可用。

**移除**：佐臻 JJSDK、眼鏡連線、眼鏡相機 MJPEG 串流、ToF 深度感測、手勢辨識與手勢橋接、
手勢教學頁、掃描診斷面板、Android OTA 更新程式與更新面板、Service Worker。
所有操作改為螢幕點按；閒置提示文字從「揮手」改為「點選」。

詳細差異與日後如何重新同步內容：[`docs/PORTING_NOTES.md`](docs/PORTING_NOTES.md)。

## 架構

```
iPhone
└─ ScamAwareIOS.app（Swift，ios/ScamAwareIOS/）
   ├─ WebViewController   全螢幕 WKWebView；影片 inline／自動播放；相機權限；禁止離開 App 內容
   ├─ BundleSchemeHandler 以 app://localhost/ 提供 App 內的 www/（支援 Range，影片可播放與拖曳）
   └─ www/                web/ 建置出的 React + MindAR 網頁（建置時產生，不進 git）
```

用自訂 scheme（而不是 `file://`）的原因：`getUserMedia` 只在安全來源可用；這與 Capacitor 的做法相同。

## 目錄

```
ScamAware-iOS/
├─ version.json            iOS 版本號（唯一可以改版本的地方）
├─ project.yml             XcodeGen 專案定義（.xcodeproj 在雲端 Mac 上產生）
├─ codemagic.yaml          雲端建置：ios-compile-check（免帳號）、ios-adhoc（簽署 IPA）
├─ ios/ScamAwareIOS/       Swift 原生殼、Info.plist、App 圖示、三語權限說明
├─ ios/Config/             Version.xcconfig（由 scripts/set-version.sh 產生）
├─ web/                    從 ScamAware-AR/webapp 複製並改成 iOS 版的網頁程式與素材
├─ scripts/                建置、檢查、封裝、安裝頁產生器、瀏覽器煙霧測試
├─ docs/                   設定、安裝、驗證文件；image-targets/ 是要印出來的五張辨識圖卡
└─ dist/ios/<版本號>/       安裝說明、版本變更、已知限制（IPA 由雲端建置產生，不進 git）
```

## 在 Windows 上可以做的事

只需要 Node.js 20 以上（Git Bash 或 WSL 執行 `.sh`）：

```bash
cd ScamAware-iOS
bash scripts/build-web.sh          # 建置網頁、跑靜態檢查與離線稽核
cd web && npm run dev              # 用電腦瀏覽器預覽（相機會用電腦的鏡頭）
```

編譯 Swift、簽章、產生 IPA 只能在 macOS 上做 → 交給 Codemagic。

## 與原專案的關係

- 本目錄**不引用** `../webapp`、`../android`、`../release` 的任何檔案（`scripts/check-ios-port.mjs` 會擋）。
- 原專案的 `release/versions.json`、Android APK、OTA 更新、GitHub Actions workflow **都沒有被修改**。
  原專案的 workflow 只看 `android/**`、`webapp/**`，不會因為這個目錄建置 APK 或發 OTA。
- 建議把本目錄推到**獨立的私有 repo**（見 [`docs/CODEMAGIC_SETUP.md`](docs/CODEMAGIC_SETUP.md) 第 0 步），
  讓 iOS 與 Android 的發布歷史完全分開。
