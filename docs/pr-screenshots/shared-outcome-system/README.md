# Shared Outcome & Fraud Clue Analysis System

以 production build（`npm run build` → `npm run preview`）拍攝，Chromium，兩個手機 viewport：
`390×844` 與 `360×640`，共 34 張。

十個 Outcome（五情境 × 詐騙成立／成功反詐）：

| 檔名 | 畫面 | 路由 |
| --- | --- | --- |
| `01-s01-scammed` | S01 詐騙成立 | `#/scenario01-investment/scammed-result` |
| `02-s01-stopped` | S01 成功反詐 | `#/scenario01-investment/stopped-result` |
| `03-s02-scammed` | S02 詐騙成立 | `#/scenario02-romance/scammed-result` |
| `04-s02-stopped` | S02 成功反詐 | `#/scenario02-romance/stopped-result` |
| `05-s03-scammed` | S03 詐騙成立 | `#/scenario03-police/ending/failure` |
| `06-s03-verified` | S03 成功反詐 | `#/scenario03-police/ending/success` |
| `07-s04-scammed` | S04 詐騙成立 | `#/scenario04-shopping/result/health/fail` |
| `08-s04-stopped` | S04 成功反詐 | `#/scenario04-shopping/result/health/success` |
| `09-s05-scammed` | S05 詐騙成立 | `#/scenario05-atm/ending-scammed` |
| `10-s05-blocked` | S05 成功反詐 | `#/scenario05-atm/ending-caught` |

五個詐騙疑點分析與兩個測驗銜接：

| 檔名 | 畫面 | 路由 |
| --- | --- | --- |
| `11-analysis-s01` | S01 詐騙疑點分析 | `#/scenario01-investment/analysis` |
| `12-analysis-s02` | S02 詐騙疑點分析 | `#/scenario02-romance/risk-analysis` |
| `13-analysis-s03` | S03 詐騙疑點分析 | `#/scenario03-police/analysis` |
| `14-analysis-s04` | S04 詐騙疑點分析 | `#/scenario04-shopping/ending/health` |
| `15-analysis-s05` | S05 詐騙疑點分析 | `#/scenario05-atm/reveal` |
| `16-quiz-s01` | S01 反詐小測驗（Analysis 的下一步） | `#/scenario01-investment/quiz` |
| `17-quiz-s05` | S05 反詐小測驗（Analysis 的下一步） | `#/scenario05-atm/quiz` |

拍攝前只在 `localStorage` 預先寫入語言、`cibar-location-profile`（S03 的場地設定閘門）
與 `cibar-scenario05-state`（S05 的商品選擇），沒有改動任何劇情或畫面。
兩個 viewport 都確認過沒有水平溢出。
