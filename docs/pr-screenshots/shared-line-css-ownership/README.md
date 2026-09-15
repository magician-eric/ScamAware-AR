# `refactor: consolidate shared LINE style ownership` — LINE 視覺回歸截圖

拍攝於本 PR 的 production build（`npm run build` + `vite preview`），Chromium／Playwright。

- `mobile/`：390×844 portrait（CIBAR 以手機／AR 為主要使用情境）
- `desktop/`：1280×800，縮圖後存檔

每個 Scenario 的 LINE 畫面都涵蓋 header、左側 NPC 訊息、右側玩家訊息（含已讀／時間）、
reply option、長對話可捲動狀態；Scenario 02 另含照片／影片訊息與 lightbox／全螢幕播放器
（本 PR 搬遷的 CSS），Scenario 03 另含 `line-add` 反詐警示與 `line-custody` 監管任務卡。

比對方式與結論見 PR 內文：整組 65 張 before／after 逐像素比對，
差異只出現在 typing 動畫相位、倒數計時器與警示橫幅進場動畫，
且同樣出現在 baseline↔baseline 的對照組，屬擷取時序而非樣式變更。
