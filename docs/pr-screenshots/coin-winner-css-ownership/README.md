# Coin Winner CSS ownership — visual regression archive

`refactor: move Coin Winner styles into app ownership` 的驗收截圖。

這次改動只搬移 CSS 檔案歸屬，**沒有任何 selector、className、間距、字級、顏色、
圓角、陰影、動畫時長或斷點被修改**，所以驗收方式是「改動前後像素相同」，而不是
「看起來差不多」。

## 拍攝方式

- 以 `webapp` 的正式 `npm run build` 產物靜態serve，改動前（`origin/main`）與
  改動後各跑一次，同一組 scene、同一組 viewport、同一份角色 cast。
- Viewport：`mobile` 390×844（本目錄存檔為 1×；像素比對另以 2× 進行）、
  `desktop` 1280×900。
- 進入方式一律走現有 route 與現有 scenario state（以 `sessionStorage` 的
  `cibar-scenario02-platform-state` 播種），**未為了截圖改動任何 production code**。

## 比對結果

16 個畫面 × 2 個 viewport＝32 張，改動前後 **pixel diff 全部為 0**。

比對時關閉 CSS 動畫並固定角色 cast，否則 `07-deposit-success`（數字 count-up）與
`15-risk-disclosure`（角色名隨機選角）本來就會在同一版本的兩次拍攝之間有差異——
這一點已用 baseline↔baseline 的對照組確認過。

本目錄存放的是改動後、動畫照常播放的版本。

## 畫面對照

| 檔名 | 畫面 | 主要覆蓋的樣式 |
| --- | --- | --- |
| `01-landing` | 幣勝客品牌首頁 | `.bition-landing-*`、軌道與粒子動畫 |
| `02-registration` | 註冊 | `.bition-display-field`、`.bition-terms-static` |
| `03-home-dashboard` | 平台首頁 | `.bition-asset-card`、`.bition-strategy-card`、`.bition-pool-card`、`.bition-ticker`、`.bition-bottom-nav` |
| `04-home-strategy-tab` | 首頁—策略分頁 | `.bition-stat-row` |
| `05-strategy-detail` | 策略詳情 | `.bition-sub-header`、`.bition-card` |
| `06-deposit-form` | 入金 | `.bition-btn-primary` |
| `07-deposit-success` | 入金成功 | `.bition-deposit-success`、`.candlestick-chart`、`.trend-line`、`.bition-status-pill.running` |
| `08-profit-portfolio` | 收益／資產 | `.bition-asset-profit`、`.up`、`.bition-pulse`、`.bition-asset-trend` |
| `09-withdrawal-form` | 申請提領 | `.bition-stat-row` |
| `10-withdrawal-failed` | 提領失敗 | `.bition-withdraw-failed` |
| `11-verification-money` | 資金安全驗證金 | `.bition-card`、`.bition-btn-primary` |
| `12-deposit-warning` | 入金前強制警示 | `.bition-warning*`、`.bition-warn-btn*`（Scenario 02 擁有） |
| `13-hotline-165` | 165 專線浮層 | `.hotline165-*`、`.bition-btn-secondary` |
| `14-topup-warning` | 驗證金前強制警示 | 同 `12` |
| `15-risk-disclosure` | 教育揭露頁 | `.bition-disclosure-*`、`.bition-165-fixed-bar` |
| `16-warning-stopped` | 選擇停止付款 | `.bition-warn-btn-continue` |
