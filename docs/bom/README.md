# CIBAR 物料清單（BOM）

**完整 BOM 請開 [`CIBAR-BOM.xlsx`](CIBAR-BOM.xlsx)**（可填單價、採購套數自動計算金額，含全部檔案清單與 SHA-256）。這份 Markdown 是同一份資料的摘要，方便在 GitHub 上直接閱讀。

| 項目 | 內容 |
| --- | --- |
| 產品 | 反詐AR體驗（`com.bigxreality.jorjinverifier`）＋ 佐臻 AR 眼鏡展示組 |
| APK Shell Version | `1.2.0`（versionCode `10200`） |
| Web Bundle Version | `1.7.8`（最新正式 OTA Release `1.7.8-20260930.002`） |
| 快照基準 commit | `bd2ffc4`（2026-09-30） |
| repo 檔案 | 1,330 個 git 追蹤檔案，共 307.50 MB |
| 計量基準 | 每 1 套展示組 |

## Excel 工作表

| 工作表 | 內容 |
| --- | --- |
| 封面 | 基本資料、**採購套數**（輸入）、統計與金額合計、填寫說明 |
| BOM總表 | 階層式總 BOM：Level 0 展示組 → Level 1 硬體／軟體群組 → Level 2 品項與模組 |
| 硬體BOM | 四項硬體的規格、相容需求、數量、**單價**（輸入）與小計 |
| 軟體BOM | repo 內容依模組分類的料號，檔案數／大小由「檔案清單」公式彙總 |
| 第三方元件 | 第三方套件、SDK 與建置工具的版本、授權、是否出貨 |
| 檔案清單 | 全部 1,330 個檔案：路徑、所屬料號、類型、大小、SHA-256、交付形式 |

## 硬體 BOM（每套）

| 料號 | 品名 | 品牌／廠商 | 型號 | 數量 | 關鍵需求 |
| --- | --- | --- | --- | --- | --- |
| HW-001 | 佐臻 AR 眼鏡 | 佐臻股份有限公司（Jorjin Technologies） | J-Reality 系列 AR 眼鏡（須含 RGB 相機＋ToF 手勢模組；確切型號請依採購單填寫） | 1 副 | • 驅動：佐臻 JJSDK v1.3.3（CameraManager／TofManager）<br>• RGB 相機：USB UVC，CIBAR 以 640×480 影像進行圖卡辨識<br>• ToF：8×8 深度感測器，ToF 韌體須 ≥ v1.2.2（低於此版本不會產生手勢）<br>• USB 裝置 ID：ToF 0x0483:0x5740（舊版）、0x350E:0x3723、0x350E:0x3501；RGB 相機為 UVC video class<br>• 連接：USB-C 接手機，須具資料傳輸能力（純充電線無法枚舉裝置） |
| HW-002 | AR 眼鏡遮光片 | 佐臻（原廠配件） | 對應 HW-001 眼鏡型號之遮光片（確切型號請填寫） | 1 片 | • 須與 HW-001 眼鏡型號相容<br>• 安裝後請確認未遮擋 RGB 相機與 ToF 感測器 |
| HW-003 | AR 眼鏡收納包 | 佐臻（原廠配件） | 對應 HW-001 眼鏡型號之收納包（確切型號請填寫） | 1 個 | • 須可容納 HW-001 眼鏡本體與 HW-002 遮光片 |
| HW-004 | HTC 手機 | HTC（宏達國際電子） | HTC U23 | 1 支 | • Android 8.1 以上（App minSdk 27）<br>• USB-C 須支援 DisplayPort Alt Mode，且能供電給眼鏡<br>• 螢幕 1080×2400 直式（情境畫面以 HTC U23 實機比例設計）<br>• 預裝 App：反詐AR體驗（applicationId com.bigxreality.jorjinverifier）<br>• 體驗可全程離線；僅 OTA 更新內容時需要網路 |

教育訓練操作手冊 §2 另建議現場備品（未列入本 BOM）：展場辨識圖卡 5 張、具資料傳輸能力的 USB-C 線、耳機或喇叭、擦拭布、行動電源。

## 軟體 BOM（依 repo 內容）

| 料號 | 名稱 | 版本 | 交付形式 | 檔案數 | 大小（MB） |
| --- | --- | --- | --- | ---: | ---: |
| **SW-100** | **Android App「反詐AR體驗」APK Shell** | v1.2.0（versionCode 10200） | APK 內建 | 109 | 18.58 |
| SW-101 | 　Android 主程式 | v1.2.0 | APK 內建 | 24 | 0.20 |
| SW-102 | 　Android OTA 更新模組 | v1.2.0 | APK 內建 | 23 | 0.13 |
| SW-103 | 　Android 資源與 Manifest | v1.2.0 | APK 內建 | 11 | 0.26 |
| SW-104 | 　佐臻 JJSDK（jjsdk.aar） | v1.3.3 | APK 內建 | 1 | 7.42 |
| SW-105 | 　Android 建置設定與簽章 | AGP 8.7.3／Gradle 8.9 | 建置用（不出貨） | 11 | 0.08 |
| SW-106 | 　Android 單元測試與測試工具 | — | 開發／測試用（不出貨） | 38 | 0.31 |
| SW-107 | 　佐臻原廠 J-Reality-Gesture APK（參考用） | v0.9.5 | 開發／測試用（不出貨） | 1 | 10.18 |
| **SW-200** | **CIBAR Web Bundle（體驗內容）** | v1.7.8（Release 1.7.8-20260930.002） | Web Bundle（APK 內建＋OTA 更新） | 591 | 116.81 |
| SW-201 | 　平台核心（進入點／路由／Shell／共用函式庫） | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 25 | 0.10 |
| SW-202 | 　入口流程與工作人員管理模式 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 20 | 0.16 |
| SW-203 | 　AR 影像辨識與相機來源 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 10 | 0.08 |
| SW-204 | 　AR 手勢互動 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 18 | 0.10 |
| SW-205 | 　共用體驗元件 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 36 | 0.55 |
| SW-211 | 　模擬 App：GuGo Invest 股購投資 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 51 | 0.20 |
| SW-212 | 　模擬 App：MeetU 覓友 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 24 | 0.21 |
| SW-213 | 　模擬 App：幣勝客 Coin Winner | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 17 | 0.06 |
| SW-214 | 　模擬 App：LINE 對話外殼 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 4 | 0.02 |
| SW-215 | 　模擬 App：黑皮購物 BlackPi | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 29 | 0.17 |
| SW-216 | 　模擬 App：黑皮通 HPE Logistics | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 15 | 0.11 |
| SW-217 | 　模擬 App：買東東 MyDonDon（二手交易平台） | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 30 | 0.31 |
| SW-221 | 　Scenario 01 財富陷阱／假投資詐騙 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 27 | 38.66 |
| SW-222 | 　Scenario 02 戀愛劇本／假交友詐騙 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 35 | 1.31 |
| SW-223 | 　Scenario 03 權威陷阱／假檢警詐騙 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 104 | 10.63 |
| SW-224 | 　Scenario 04 黑箱包裹／假賣家詐騙 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 62 | 6.43 |
| SW-225 | 　Scenario 05 幽靈訂單／假買家詐騙 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 37 | 1.07 |
| SW-231 | 　共用多媒體素材 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 27 | 54.98 |
| SW-232 | 　AR 辨識圖卡資料集 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 2 | 0.84 |
| SW-233 | 　地區與司法警政機關資料 | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 4 | 0.01 |
| SW-234 | 　PWA 外殼（index.html／manifest／圖示／Service Worker） | v1.7.8 | Web Bundle（APK 內建＋OTA 更新） | 9 | 0.66 |
| SW-240 | 　Web 建置設定 | v1.7.8 | 建置用（不出貨） | 5 | 0.17 |
| **SW-300** | **開發、測試與發布工具** | — | 開發／測試用（不出貨） | 352 | 148.88 |
| SW-301 | 　Web 驗證與測試腳本 | — | 開發／測試用（不出貨） | 115 | 1.53 |
| SW-302 | 　素材原始檔 | — | 開發／測試用（不出貨） | 24 | 30.31 |
| SW-303 | 　CI/CD 工作流程 | — | 開發／測試用（不出貨） | 3 | 0.06 |
| SW-304 | 　版本與 OTA 發布紀錄 | Shell 1.2.0／Web 1.7.8 | 發布紀錄（不出貨） | 31 | 0.02 |
| SW-305 | 　GitHub Pages 預覽站台建置產物 | v1.7.8 | 開發預覽站台 GitHub Pages（不出貨） | 179 | 116.97 |
| **DOC-100** | **專案文件** | — | 文件 | 278 | 23.22 |
| DOC-101 | 　正式文件（規格書／教育訓練操作手冊） | — | 文件 | 2 | 0.31 |
| DOC-102 | 　工程與規範文件 | — | 文件 | 36 | 0.43 |
| DOC-103 | 　翻譯稿與所在地對照資料 | — | 文件 | 11 | 0.49 |
| DOC-104 | 　PR 驗收截圖 | — | 文件 | 229 | 22.00 |
| | **合計** | | | **1,330** | **307.50** |

## 第三方元件

| 元件 | 版本 | 授權 | 類別 | 出貨 |
| --- | --- | --- | --- | --- |
| @tensorflow/tfjs | 4.22.0 | Apache-2.0 | Web Runtime 套件 | 是（編入 Web Bundle） |
| i18next | 26.3.6 | MIT | Web Runtime 套件 | 是（編入 Web Bundle） |
| i18next-browser-languagedetector | 8.2.1 | MIT | Web Runtime 套件 | 是（編入 Web Bundle） |
| lightweight-charts | 5.2.1 | Apache-2.0 | Web Runtime 套件 | 是（編入 Web Bundle） |
| lucide-react | 1.31.0 | ISC | Web Runtime 套件 | 是（編入 Web Bundle） |
| mind-ar | 1.2.5 | MIT | Web Runtime 套件 | 是（編入 Web Bundle） |
| react | 19.2.8 | MIT | Web Runtime 套件 | 是（編入 Web Bundle） |
| react-dom | 19.2.8 | MIT | Web Runtime 套件 | 是（編入 Web Bundle） |
| react-i18next | 17.0.11 | MIT | Web Runtime 套件 | 是（編入 Web Bundle） |
| react-router-dom | 7.18.2 | MIT | Web Runtime 套件 | 是（編入 Web Bundle） |
| @tailwindcss/vite | 4.3.3 | MIT | Web 開發／建置工具 | 否 |
| @types/react | 19.2.17 | MIT | Web 開發／建置工具 | 否 |
| @types/react-dom | 19.2.3 | MIT | Web 開發／建置工具 | 否 |
| @vitejs/plugin-react | 6.0.3 | MIT | Web 開發／建置工具 | 否 |
| oxlint | 1.74.0 | MIT | Web 開發／建置工具 | 否 |
| tailwindcss | 4.3.3 | MIT | Web 開發／建置工具 | 否 |
| vite | 8.1.5 | MIT | Web 開發／建置工具 | 否 |
| 佐臻 JJSDK（jjsdk.aar） | 1.3.3 | 佐臻原廠授權 | Android 函式庫 | 是（APK 內建） |
| androidx.webkit:webkit | 1.12.1 | Apache-2.0 | Android 函式庫 | 是（APK 內建） |
| junit:junit | 4.13.2 | EPL-1.0 | Android 測試 | 否 |
| org.json:json | 20231013 | Public Domain | Android 測試 | 否 |
| Android Gradle Plugin | 8.7.3 | Apache-2.0 | Android 建置工具 | 否 |
| Gradle | 8.9 | Apache-2.0 | Android 建置工具 | 否 |
| Android SDK | compileSdk 35／targetSdk 30／minSdk 27 | Android SDK License | Android 建置工具 | 否 |
| JDK（Temurin） | 17 | GPL-2.0 w/ Classpath Exception | CI 建置環境 | 否 |
| Node.js | 22 | MIT | CI 建置環境 | 否 |

另有 203 個 runtime 間接相依 npm 套件（lockfile 共 315 個），版本以 `webapp/package-lock.json` 為準。

## 注意

- 這是 `bd2ffc4` 當下的快照。版本號的唯一來源仍是 [`release/versions.json`](../../release/versions.json)，以後版本或檔案異動時，BOM 需要重新產出。
- 眼鏡、遮光片、收納包的確切型號請依採購單填入 Excel 的黃底欄位；HTC U23 須確認支援 USB-C DisplayPort Alt Mode 並可對眼鏡供電。
- 發布 ≠ 交付：實際交付設備時仍要依 [`DELIVERY_HISTORY.md`](../DELIVERY_HISTORY.md) 記錄 APK SHA-256。
