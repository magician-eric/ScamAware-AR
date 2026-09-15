# Changelog

> **OUTDATED（2026-08-20）**：本檔內容停留在 Scenario 04 首版與「Sprint 0.2」的靜態 HTML 時期（`scanner.html`／`scene01_line_teacher.html`），與目前的 React SPA 架構已完全不符，僅保留作為歷史紀錄。現行規格請以 `CIBAR-Technical-Specification.md` 為準。

## scenario04-shopping（黑皮購物・網路購物詐騙）

- 新增情境三：網路購物詐騙完整互動流程（黑皮購物 App 模擬），含韓國保健食品／驚喜福袋兩條商品路線。
- 新增可維護的分支對話樹資料格式與通用對話引擎（`features/shopping/dialogueEngine.js`），支援玩家選擇、
  trust/suspicion/evidence/urgency/assertiveness/sellerPressure 等狀態分數、警訊旗標、已讀/已送達模擬、
  hub 式「再問一個問題」重複提問過濾、localStorage 對話進度恢復。
- 新增賣家售前／售後對話、黑皮安心客服對話、165 反詐騙模擬通話、退貨退款拖延、賣家失聯、證據保存中心、
  模擬報案資料整理、依玩家行為個人化的情境結算頁。
- 新增黑皮購物視覺系統（`styles/blackpi.css`）：品牌色彩、字體排印、按鈕／搜尋列／商品卡／底部導覽／
  聊天元件／訂單時間軸／退款元件等，套用 BlackPi Shopping App UI 設計規格，並手機直式優先、桌機置中顯示。
- 所有商品／開箱／證據照片皆採用集中管理、有清楚文字標示的佔位圖（`data/assetMap.js`）。
- 新增開發用 Debug Panel（`?debug=1`），正式網址不顯示。

## Sprint 0.2

- 移除首頁「開始調查」按鈕，首頁僅保留標題、簡短說明與語言選擇。
- 語言選擇後直接儲存語言代碼並進入 `scanner.html`。
- `scanner.html` 加入語言檢查，未選語言時自動導回首頁。
- `scanner.html` 加入約 1 秒 AI 初始化動畫。
- `scene01_line_teacher.html` 對話加入 typing indicator，並改為逐句顯示。
- LINE 對話速度調整為每則訊息約 1.5～2 秒，typing indicator 約 0.8～1 秒。
- 預留 FB / LINE / 廣告圖片路徑：
  - `assets/scenario01-investment/images/feed_bg.png`
  - `assets/scenario01-investment/images/ad_investment_01.png`
  - `assets/scenario01-investment/images/line_bg.png`
- 建立 `scenario01-investment` 素材資料夾，包含 `images/`、`audio/`、`video/`、`prompt/`。
