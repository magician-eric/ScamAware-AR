# global.css ownership finalisation — visual regression archive

`refactor: finalize global CSS ownership` 的驗收截圖。

這次改動只重新歸屬 CSS 檔案，**沒有任何 selector、className、間距、字級、顏色、
圓角、陰影、動畫時長或斷點被修改**，所以驗收方式是「改動前後像素相同」，而不是
「看起來差不多」。

## 拍攝方式

- 以 `webapp` 的正式 `npm run build` 產物靜態 serve，改動前與改動後各跑一次，
  同一組 scene、同一組 viewport、同一份角色 cast。
- **基準已於 merge 最新 main 後重拍**：改動前＝`origin/main` 已發佈的建置產物
  （`index-LyIlIucM.css`，含 #293），改動後＝本 branch merge 後的建置產物
  （`index-CvNqilsr.css`）。先前以 `index-Cw9BBfBw.css` ↔ `index-oJQ04sVN.css`
  比對的那一輪結論相同，只是基準較舊。
- Viewport：`mobile` 390×844、`desktop` 1280×900。
- 決定性：以 seeded PRNG 取代 `Math.random`、凍結 `Date`，並在 document 載入前
  就注入 `animation-duration:1ms` 的凍結樣式表——否則跑馬燈與 count-up 在
  **同一版本的兩次拍攝之間**本來就有差。
- 進入方式一律走現有 route，語言以既有的 `language` localStorage 鍵播種，
  **未為了截圖改動任何 production code**。

## 比對結果

43 個畫面 × 2 個 viewport ＝ **86 張**，改動前後 **85 張 byte-identical**。

唯一一張有差異的是 `desktop/33-s04-home`（23 px、佔 0.002%、最大色差 10）。
那個畫面上沒有任何一條本次搬動的 CSS，而且 **baseline↔baseline 的對照組跑出
完全相同的 23 px 差異**（先跑一次 `origin/main` 產物，再跑一次同一份產物），
所以它是擷取時序噪音，不是本次改動造成的。

| 比對 | 結果 |
| --- | --- |
| baseline ↔ baseline（對照組，同一份產物跑兩次） | 86 張中 85 張 byte-identical，`desktop/33-s04-home` 差 23 px |
| baseline ↔ 本次改動（merge 前，舊基準） | 86 張中 85 張 byte-identical，`desktop/33-s04-home` 差 23 px |
| **最新 main ↔ 本次改動（merge 後，現行基準）** | **86 張中 85 張 byte-identical，`desktop/33-s04-home` 差 23 px** |

另有兩層不依賴瀏覽器的證據：

- build 後的 CSS bundle 逐條比對，**倖存的每一條規則宣告 100% byte-identical**，
  且沒有任何 (selector, property) 的勝出宣告改變；差異只有 82 條移除（79 條死
  規則 ＋ 3 條被拆開／不再被 minifier 合併的 selector list）與 4 條新增（就是那
  3 條拆開後的等價形式）。
- 搬動可能造成的唯一 cascade 風險是「同 specificity、同 property、相對順序翻轉」
  的規則對。bundle 比對找出 66 對，逐一在真實 DOM 上驗證：**93 條 route 上沒有
  任何一個元素同時命中任何一對的兩邊**，因此翻轉不可能影響任何元素的計算樣式。

## merge 最新 main 之後更新過的截圖

`mobile/01-entry-language` 與 `desktop/01-entry-language` 已重拍。差異**不是本 PR
造成的**：#293 從語言選擇頁移除了那顆通往 `/staff-setup` 的可見地圖釘按鈕（Staff
Setup 為 staff-only，規格 2.7.2）。本 branch 先前把該按鈕的兩條 CSS 從
`styles/global.css` 搬到 `pages/entryScreens.css`，merge 時把 #293 的刪除套用在
新位置，兩邊意圖都保留。其餘 51 張與 merge 前的存檔逐像素相同。

## 本目錄存放的內容

- `mobile/`：43 個畫面全部，1× 解析度（像素比對另以 2× 進行，與
  `coin-winner-css-ownership/` 的慣例相同）。
- `desktop/`：代表性的 10 個畫面（規格書 §10 對 desktop 的要求是「至少代表性補
  一組」）。比對本身仍涵蓋全部 43 個 desktop 畫面。

## 畫面對照

| 檔名 | 畫面 | 主要覆蓋的搬移 |
| --- | --- | --- |
| `01-entry-language` | 語言選擇 | `pages/entryScreens.css`：`.scenario-selection-*`、`.language-button-*`、隱藏工作人員入口（#293 移除可見地圖釘按鈕後重拍） |
| `02-entry-ar-scan` | AR 掃描 | `pages/entryScreens.css`：`.ar-scan-*` |
| `03-entry-scenario-menu` | 情境選單 | `pages/entryScreens.css`：`.scenario-menu-stage`、`.scenario-overlay-button`、`.scenario-button-*` |
| `04-staff-setup` | 工作人員設定 | `pages/staff/staff.css`：`.staff-*`（含 `.staff-card h2`、`.staff-btn-row .btn`） |
| `05-s01-briefing` | S01 入口 | `components/ui/ScenarioEntryBriefing.css`：`.scenario-entry-*` ＋ 留在 global 的 `.hero`／`.topbar`／`.btns` |
| `06-s01-feed` | S01 假動態消息 | `styles/scenario01.css`：`.fb-*` 全組、`.feed-stage`、`.feed-scroll`、`@keyframes fbCommentsScroll` |
| `07-s01-video-teacher` | S01 影片廣告 | `styles/scenario01.css`：`.video-stage`、`.video-fullscreen-*` |
| `08-s01-line-teacher` | S01 LINE 對話 | `styles/scenario01.css`：`.ar-stage.line-stage`（原 global 的唯一 `line-` 例外） |
| `09-s01-platform-register` | S01 GuGo 嵌入 | `styles/scenario01.css`：`.gugo-stage`、`.gugo-embed-*`（含 `.gugo-embed-footer .btn`） |
| `10-s01-profit` | S01 獲利頁 | `styles/scenario01.css`：`.ar-stage.scroll-stage` |
| `11-s01-withdraw-fail` | S01 出金失敗 | `styles/scenario01.css`：`.withdraw-fail-card` |
| `12-s01-scammed-result` | S01 詐騙成立結算 | `components/results/FraudOutcomeResult.css`：無 theme 的基礎版面 |
| `13-s01-stopped-result` | S01 成功停手結算 | 同上，`.fraud-result-stopped` 的正向強調色 |
| `14-s01-quiz` | S01 反詐小測驗（未作答） | `components/ui/ScenarioFinalDecision.css`：`.antifraud-quiz-*`、`.quiz-option` |
| `15-s01-quiz-answered` | S01 反詐小測驗（已作答） | 同上，`.quiz-option.correct`／`.wrong`／`.quiz-explain` |
| `16-s02-briefing` | S02 入口 | `components/ui/ScenarioEntryBriefing.css` |
| `17-s02-phone-desktop` | S02 手機桌面 | `styles/scenario02.css`：`.ar-stage.meetu-stage` |
| `18-s02-dating-browse` | S02 交友滑卡 | `.ar-stage.meetu-stage` ＋ MeetU 模組樣式（未動） |
| `19-s02-dating-chat` | S02 站內聊天 | `styles/scenario02.css`：`.meetu-warning-marquee-*`、`@keyframes meetu-marquee-scroll` |
| `20-s02-private-chat` | S02 LINE 私訊 | `pages/scenario02/PrivateChat.css`：`.link-card*`、`.link-title`、`.link-brand`、`.link-url` |
| `21-s02-risk-analysis` | S02 教育揭露 | `styles/scenario02.css`：`.risk-card`、`.risk-disclosure-list` ＋ 留在 global 的 `.card` |
| `22-s02-scammed-result` | S02 詐騙成立結算 | `FraudOutcomeResult.css`：`.fraud-result-theme-romance` |
| `23-s02-stopped-result` | S02 成功停手結算 | 同上 |
| `24-s02-quiz` | S02 反詐小測驗 | `ScenarioFinalDecision.css` |
| `25-s03-briefing` | S03 入口 | `ScenarioEntryBriefing.css` |
| `26-s03-phone-home` | S03 手機桌面 | `components/ui/PhoneShell.css`：`.phone-shell-*`（含 `--phone-shell-home-indicator-height` 仍由 global 提供） |
| `27-s03-bank` | S03 銀行 App | `PhoneShell.css` ＋ `FraudWarningBanner` 的 `above-footer` 定位（讀同一個 CSS 變數） |
| `28-s03-ending-scammed` | S03 詐騙成立結算 | `FraudOutcomeResult.css`：`.fraud-result-theme-authority` ＋ `.fraud-result-embed` |
| `29-s03-ending-verified` | S03 查證成功結算 | 同上，`.fraud-result-theme-authority.fraud-result-verified` |
| `30-s03-quiz` | S03 反詐小測驗 | `ScenarioFinalDecision.css` |
| `31-s04-briefing` | S04 入口 | `ScenarioEntryBriefing.css` |
| `32-s04-phone-home` | S04 手機桌面 | 未動（S04 自有 shell） |
| `33-s04-home` | S04 黑皮購物首頁 | 未動（唯一有擷取噪音的畫面，見上） |
| `34-s04-result-scammed` | S04 詐騙成立結算 | `FraudOutcomeResult.css`：`.fraud-result-theme-package` |
| `35-s04-result-stopped` | S04 成功停手結算 | 同上，`.fraud-result-theme-package.fraud-result-stopped` |
| `36-s04-quiz` | S04 反詐小測驗 | `ScenarioFinalDecision.css` |
| `37-s05-briefing` | S05 入口 | `ScenarioEntryBriefing.css` |
| `38-s05-phone-home` | S05 手機桌面 | 未動（`shared/phone/PhoneHome.css`） |
| `39-s05-home` | S05 買東東首頁 | 未動 |
| `40-s05-ending-caught` | S05 及時識破結算 | `FraudOutcomeResult.css`：`.fraud-result-theme-order.fraud-result-blocked`（淺色） |
| `41-s05-ending-scammed` | S05 詐騙成立結算 | 同上（深色） |
| `42-s05-reveal` | S05 手法揭露 | 未動 |
| `43-s05-quiz` | S05 反詐小測驗 | `ScenarioFinalDecision.css` |
