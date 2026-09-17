# CIBAR - 刑事警察局 AR 反詐騙教育館

互動式反詐騙教育體驗，React + Vite 打造的手機直式網頁 App，模擬多種常見詐騙情境供展演使用。

## 專案文件

- **[CIBAR 系統規格書](docs/CIBAR-Technical-Specification.md)** — 唯一的正式文件，四者合一：System Specification ＋ Architecture Reference ＋ Scenario Flow ＋ Acceptance Checklist。五個 Scenario 的逐步流程與驗收使用同一組步驟編號（`AR1-01`…），測試結果直接勾選 `☐ 通過` ／ `☐ 未通過`；本專案不另外維護獨立的 QA Checklist。
- [文件索引](docs/README.md)

## 版本與發布規則

CIBAR 有**兩條互相獨立的版本線**：Android **APK Shell**（重裝才會更新）與 **OTA Web Bundle**
（不必重裝）。正式版本採 Semantic Version `MAJOR.MINOR.PATCH`，正式發布再加上發布日與當日序號，
組成完整 Release ID —— 例如 `1.0.3-20260825.002`。

| 修改內容 | Version |
| --- | --- |
| Bug / UI / 文案 / 圖片 / 影片修正 | PATCH |
| 新增相容功能 | MINOR |
| 不相容／重大架構改版 | MAJOR |
| 純 Web 更新 | Web Bundle only |
| Android Native 修改 | Shell + Web Bundle if applicable |

版本號**只在 [`release/versions.json`](release/versions.json) 修改**，Release ID 由 CI 在 merge 到
`main` 之後產生；PR 尚未 merge 不得把 production `latest.json` 指向該版本。

- **[版本編號、OTA 發布與交付紀錄規範](docs/RELEASE_VERSIONING.md)** —— build / release / OTA publish 前必讀
- [Release History](docs/RELEASE_HISTORY.md) —— 每一次**正式發布**（CI 自動維護）
- [Delivery History](docs/DELIVERY_HISTORY.md) —— 每一次**實際交付**（交付當下由人填寫）

## 執行方式

```bash
cd webapp
npm install
npm run dev      # 開發模式，預設 http://localhost:5173/ScamAware-AR/
npm run build    # 產生 dist/ 靜態檔案
npm run preview  # 預覽 build 結果
npm run lint     # oxlint 檢查
```

體驗入口為語言選擇 → AR 掃描首頁（辨識成功直接進情境，或手動選擇）→ 情境選單 → 五個 Scenario 之一 → 情境結算 → 反詐小測驗 → 返回 AR 掃描。

架構上，CIBAR 是一個共用的 Experience Platform 承載五個 Scenario：Scenario 只負責故事編排，模擬 App（GuGo Invest／Coin Winner／BlackPi／MyDonDon／HPE Logistics）、LINE 對話外殼、警示、結算、測驗、角色、所在地與素材都由平台層的共用模組提供。

> **GitHub 只是開發階段的 source control／collaboration environment**（`Development workflow only`）。CIBAR 最終的正式執行環境與部署方式尚未定案；`/ScamAware-AR/` base path 為目前的開發預覽值。詳見規格書附錄 A。

## 情境列表

情境選單上顯示的任務名稱與實際路由對應如下：

- 財富陷阱／假投資詐騙 → `scenario01-investment`
- 戀愛劇本／假交友詐騙 → `scenario02-romance`
- 權威陷阱／假檢警詐騙 → `scenario03-police`
- 黑箱包裹／假賣家騙買家（黑皮購物） → `scenario04-shopping`
- 幽靈訂單／假買家騙賣家 → `scenario05-atm`（路由沿用舊名，內容已是完整的假買家情境，非 ATM）

## scenario04-shopping（黑皮購物・網路購物詐騙）

模擬「黑皮購物」手機購物 App 的完整互動教育體驗，玩家可在其中完整走完：瀏覽／搜尋商品 → 詢問賣家 → 下單 →
收貨開箱 → 售後爭議 → 申請退貨 → 退款拖延 → 賣家失聯 → 黑皮客服 → 證據保存 → 165 反詐騙諮詢模擬 → 報案準備模擬 →
情境結算。全程在單一模擬 App 內完成，不會開啟真實外部通訊軟體、付款、物流或撥號頁面。

主要程式位置：

- `webapp/src/pages/scenario04/` - 所有畫面（首頁、搜尋、商品頁、各對話畫面、退貨/退款、165、結算…）
- `webapp/src/data/dialogueTrees/` - 對話樹資料（智慧掃拖機器人／VEXA FLEX X1 摺疊手機兩條路線、黑皮客服、165 模擬通話）
- `webapp/src/data/products.js` / `scenarioConfig.js` / `assetMap.js` - 商品、證據清單、佔位圖資料
- `webapp/src/features/shopping/dialogueEngine.js` - 通用分支對話引擎（含玩家選擇、效果分數、已讀/已送達、hub 式重複提問過濾）
- `webapp/src/lib/shoppingStore.js` - 情境狀態（localStorage 持久化，支援重整後恢復）
- `webapp/src/styles/blackpi.css` - 黑皮購物視覺系統（design tokens、元件樣式）

商品照片、開箱照片、證據照片目前皆為集中管理的文字標示佔位圖（`data/assetMap.js`），之後只需替換該檔案即可套用正式素材，
不需修改任何畫面程式碼。

開發模式除錯面板：在網址加上 `?debug=1`（例如 `#/scenario04-shopping/home?debug=1`）即可開啟，可查看目前路線、對話節點、
各項分數、警訊旗標、證據保存狀態，並可直接跳轉畫面或模擬特定劇情狀態；正式網址不會顯示。

本情境劇情與互動規格以 issue/PR 說明文字為準，僅套用黑皮購物 PDF 的視覺設計系統（色彩、字體、間距、元件規格），
不採用 PDF 中舊版劇情（例如加 LINE、私下轉帳、VIP 退款加速費等），皆已移除或替換為平台內完整流程。
