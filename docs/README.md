# CIBAR 文件索引

## 兩份正式文件

| 文件 | 給誰看 |
| --- | --- |
| **`CIBAR-Technical-Specification.md`** | 工程與驗收人員：系統規格、架構、情境流程、驗收檢核 |
| **`CIBAR-教育訓練操作手冊.md`** | 刑事警察局／展場工作人員、教育訓練講師、現場操作人員：怎麼開、怎麼操作、怎麼教玩家、出狀況怎麼處理 |

兩份文件描述**同一套系統**，只是深度與讀者不同。**操作手冊刻意不含任何工程內容**（不談程式、架構、檔案路徑、建置或 Git）；系統行為改變時兩份都要更新。

## 正式規格書

**`CIBAR-Technical-Specification.md`** 是 CIBAR 的正式規格書，四者合一：

> **System Specification ＋ Architecture Reference ＋ Scenario Flow ＋ Acceptance Checklist**

本專案**不另外維護獨立的流程文件或 QA Checklist**。規格定義玩家應該經歷什麼，驗收就是逐步確認實際系統是否符合這個流程；兩者使用**同一組步驟編號**（`AR1-01`、`AR2-05`、…），流程一改就更新該情境的 Flow & Acceptance 表格，永遠不會不同步。

驗收表格式：**步驟｜階段｜測試重點與畫面/話術邏輯｜預期結果與跳轉邏輯｜測試結果（`☐ 通過` ／ `☐ 未通過`）**。跳轉邏輯以看得懂的文字描述，不寫步驟編號，也不寫毫秒等無法用肉眼直接驗證的數值。

> 先前存在的 `scenario-flow-spec.md`、`CIBAR-QA-Checklist.md`、`implementation-discrepancies.md` 與 `ar-checklists/*.csv` 已全部併入規格書並移除。

### 章節導覽

| # | 章節 | 用途 |
| --- | --- | --- |
| 1 | CIBAR System Overview | 系統目的、五個情境、整體體驗、共用入口流程與驗收 |
| 2 | System Architecture | Architecture Map、Scenario／App Module／Shared Experience／Character／Location／Localization／Asset 各層 |
| 3 | Architecture Principles | 六條原則與各自的落差 |
| 4 | Shared Modules Specification | LINE／Warning／Ending／反詐小測驗／Briefing／Phone・Call／Notification／對話引擎 |
| 5–9 | Scenario 01–05 | 每個情境的 Overview／Modules Used／Characters／Location／**Flow & Acceptance**／Branches／Acceptance Summary |
| 10 | Localization Specification | zh-TW／EN／JP |
| 11 | Asset Ownership | Shared／Scenario／App／Character／Source／Runtime |
| 12 | Cross-System Acceptance | 只放跨情境項目：裝置、PWA、共用模組一致性、session reset、語言切換、隨機化、定位、資安、建置 |
| 13 | Architecture Debt / Legacy Findings | 目前仍待整理的 legacy architecture |
| A–D | 附錄 | 執行環境與部署需求（Android App `IMPLEMENTED`）、建置與測試指令、程式位置索引、截圖清單 |

## 版本與發布（規則文件）

規格書寫的是「產品是什麼」；下面三份寫的是「哪一版、什麼時候發布、交給了誰」。
進行 build／release／OTA publish／交付前，以 `RELEASE_VERSIONING.md` 為準。

| 文件 | 用途 | 誰維護 |
| --- | --- | --- |
| `RELEASE_VERSIONING.md` | 版本編號（Shell／Web Bundle）、Release ID、OTA 發布流程、交付規則 | 人 |
| `RELEASE_HISTORY.md` | 每一次**正式發布**的紀錄（不是 changelog） | CI 自動附加 |
| `DELIVERY_HISTORY.md` | 每一次**實際交付**的紀錄（發布 ≠ 交付） | 交付當下由人填寫 |

版本號的單一事實來源是 `release/versions.json`；AI Agent 的操作規則在 repo 根目錄的 `CLAUDE.md`。

## 支援文件

| 文件 | 用途 | 狀態 |
| --- | --- | --- |
| `asset-architecture.md` | 素材歸屬的完整決策表 | 現行（規格書 §11 為摘要） |
| `CIBAR-教育訓練操作手冊.md` | 現場人員的操作手冊（設備、啟動、語言、定位、手勢、圖片辨識、五個情境操作、工作人員模式、FAQ、開場 SOP） | 現行（列於本頁最上方的正式文件） |
| `opening-animation.md` | App 開場動畫（純 CSS）的檔案、timeline、三語字級與跳過手勢 | 現行 |
| `design/CIB-Warning-*.md` | 防詐警示設計系統、行為契約、狀態規格、矩陣與落差報告 | 現行（矩陣與落差報告已加註重新掃描結果） |
| `location-mapping-audit.md`、`location-mapping/` | 所在地與司法警政機關對照 | 現行 |
| `localization-audit.md` | 五情境 × 三語的 localization 污染稽核：污染來源、定位資料的 locale-aware 架構、五道檢查工具 | 現行 |
| `hpe-brand-audit.md` | HPE 黑皮通品牌稽核 | 現行 |
| `line/inventory.md` | 共用 LINE 模組盤點 | 現行 |
| `shared-ui-ownership-audit.md` | 共用 UI 歸屬稽核 | 現行 |
| `app-module-migration.md` | App module 遷移紀錄 | 現行（HPE 段落已標註 `OUTDATED`） |
| `scenario03-audio-transcript-current.md` | Scenario 03 語音逐字稿 | 現行 |
| `ar-glasses-camera-diagnosis.md` | 眼鏡 RGB Camera → MJPEG → WebView → 圖片辨識的分層診斷（含 `/ar-scan` 診斷 overlay 與 logcat 讀法） | 現行 |
| `translations/` | 各情境三語文字對照存檔 | 參考用（以程式內字典為準） |
| `architecture-modularization-audit.md`、`app-module-architecture-audit.md` | 模組化**之前**的歷史稽核 | **`OUTDATED`**，已被規格書 §2／§3 取代；保留作決策紀錄 |
| `changelog.md` | 早期變更紀錄 | **`OUTDATED`**，僅供歷史參考 |
| `pr-screenshots/` | 歷次 PR 截圖存檔 | 部分 `OUTDATED`，見該目錄 README |
| `screenshots/` | 正式驗收截圖存放位置 | 待補拍（見規格書附錄 D） |

## 兩個重要前提

- **程式碼現況 > 舊文件內容。** 更新文件時一律以 `main` 分支的實際程式碼為準。
- **GitHub 不是 CIBAR 的正式架構。** Repository、Pull Request、branch、GitHub Actions、預覽發布以及開發期間使用的 AI 編碼代理工具，全部屬於 `Development workflow only`。CIBAR 的正式執行載體是**單一 Android App「反詐AR體驗」**（`IMPLEMENTED`，內建完整 web bundle、可全程離線、以 OTA 更新內容），見規格書 §2.11 與附錄 A。**「線上版／離線版」兩支 App 已不存在**，文件與現場說明都不得再提。

## 狀態標記

`IMPLEMENTED`（已完成）／`PARTIAL`（部分完成）／`PLANNED`（尚未完成，不得列為通過）／`LEGACY`（舊架構殘留）／`OUTDATED`（舊文件已不符現況）。
