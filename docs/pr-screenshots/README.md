# PR 截圖存檔

本目錄是各次 PR 當下的畫面存檔，**不是現行規格的畫面基準**。

- `scenario01-consistency-fix/`：Scenario 01 劇情時序與投資助理身分一致性修正的驗證存檔，中／英／日各 7 張，依序為：LINE 私訊標題（`投資小助理 ＋ 姓名`）、VIP 群組內同一位助理（同名同頭像）、GuGo 註冊畫面（**沒有**持股 CTA）、入金確認畫面（沒有 CTA）、入金完成畫面（沒有 CTA）、平台主畫面（CTA 才出現）、持股頁（CTA 已變為「前往下一步」）。
- `scenario01-en-jp/`：Scenario 01 英／日截圖。其中 `en-quiz.png` 為舊版測驗版面；現行為共用單題「反詐小測驗」。
- `final-global-css-ownership/`：`styles/global.css` 最終歸屬清理（`refactor: finalize global CSS ownership`）的改動前後像素比對存檔，43 個畫面 × mobile／desktop 共 86 張比對中 85 張 byte-identical，唯一差異與 baseline↔baseline 對照組相同。本目錄存 43 張 mobile ＋ 10 張代表性 desktop。
- `coin-winner-css-ownership/`：Coin Winner 樣式歸屬重構（`refactor: move Coin Winner styles into app ownership`）的改動前後像素比對存檔，16 個畫面 × mobile／desktop，diff 全為 0。
- `scenario02-video-autoplay-line-card/`：Scenario 02 第一／第二支影片自動播放修正的改動前後對照，以及 LINE 幣勝客網址預覽卡的新版畫面。拍攝環境無 H.264 解碼器，影片截圖的拍攝條件見該目錄 README。
- `shared-outcome-system/`：五情境共用 Outcome System 的驗收存檔——十個結算（詐騙成立／成功反詐 × 5）、五個詐騙疑點分析、兩個反詐小測驗銜接，每張各拍 `390×844` 與 `360×640` 兩個手機 viewport，共 34 張。以 production build ＋ `vite preview` 拍攝；細節見該目錄 README。
- `scenario05-en-jp/`：**OUTDATED（2026-08-20）**。`en-bankverify`／`jp-bankverify`、`en-cschat`／`jp-cschat`、`en-quiz-result`／`jp-quiz-result` 對應的「銀行驗證」「假客服」「測驗分數結果」畫面在現行 Scenario 05 已不存在（劇本已改為 SafeDeal 外部賣場、買東東查無訂單、HPE 寄件、買家失聯）。

正式驗收截圖請依 `../CIBAR-Technical-Specification.md` 附錄 D 的截圖清單 重新拍攝並放入 `../screenshots/`。
