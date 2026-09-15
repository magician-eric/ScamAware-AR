# CIB Warning Matrix

> **2026-08-20 重新掃描結果**：
>
> - **未接線（Medium）**：`webapp/src/data/warnings/warningRegistry.js` 目前**全專案零 import**，畫面上的 `FraudWarningBanner` 各自硬編 `title`／`body`。下表的 parity 規則因此尚未有自動化保障。
> - **OUTDATED**：`S05-P` 的觸發點「銀行驗證：假客服要求操作銀行 App」在現行 Scenario 05 已不存在（劇本已改為 SafeDeal 外部賣場＋買家失聯），需重新定義觸發點。目前 Scenario 05 畫面上沒有任何 `FraudWarningBanner`。
> - **PARTIAL**：`S02-W2` 對應的 `DepositWarning` 在程式中刻意無入口（`CIBAR-Technical-Specification.md` §13 AD-24 `BY DESIGN`），現行入金警示改由 `apps/coin-winner/DepositPage.jsx` 內的 `FraudWarningBanner` 呈現。`S02-W3` 對應的 `TopupWarning` 已接回正常劇情（同文件 §13 AD-23 `RESOLVED`，入口為 `PrivateChat` 的 `s22-choice` LEFT）；因為它自此在主線上，頁面只保留「停止付款」／「我已了解，仍要繼續」兩顆按鈕（`RedWarning` 的 `hotline={false}`），以符合 AR 的 LEFT／RIGHT 二選一。`GuaranteePage.jsx` 內的 `FraudWarningBanner` 維持不變。
> - **仍有效**：`S01-W1`～`S01-W4`、`S03-W2`、`S04-P` 在程式中都能找到對應的 `FraudWarningBanner` 呈現點。

> 本表與 `webapp/src/data/warnings/warningRegistry.js` 必須同步。Existing / Proposed 表示目前 repository 是否已有對應的 Warning 呈現點，不代表既有呈現已符合目標規格；差異見 [Implementation Gaps](./CIB-Warning-Implementation-Gaps.md)。

| ID | Scenario | Scene | Trigger | Variant | Severity | Duration | Existing / Proposed | Following Interaction |
|---|---|---|---|---|---|---:|---|---|
| S01-W1 | S01 財富陷阱 | 投資老師影片 | 老師宣稱穩定高報酬／保證獲利 | Investment / Crypto | notice | 5s | Existing | 影片與進度繼續，之後進入 LINE 老師對話 |
| S01-W2 | S01 財富陷阱 | LINE VIP 群組 | 群組密集出現獲利截圖、短期收益及成功出金回報 | Chat / Messaging | high | 6s | Existing | 群組訊息繼續，後續平台註冊仍可操作 |
| S01-W3 | S01 財富陷阱 | 出金失敗 | 平台要求出金前另付保證金 | Investment / Crypto | block | 7s | Existing | 原畫面的停止付款／繼續等 Choice 仍可操作 |
| S01-W4 | S01 財富陷阱 | 高風險選擇結果 | 使用者選擇支付保證金 | Investment / Crypto | block | 7s | Existing | 原結果頁的 165 導引 CTA 仍可操作 |
| S02-W1 | S02 戀愛劇本 | MeetU／私人聊天 | 短期親密互動建立依附並開始引介投資 | Chat / Messaging | notice | 5s | Existing | 對話、媒體、auto advance 與回覆 Choice 繼續 |
| S02-W2 | S02 戀愛劇本 | 幣勝客首次入金 | 對方把感情、共同未來與入金綁定 | Investment / Crypto | high | 7s | Existing | 「完成入金」及後續自動返回聊天照常運作 |
| S02-W3 | S02 戀愛劇本 | 提領／風控保證金 | 平台以風控或安全驗證為由要求追加款項 | Investment / Crypto | block | 7s | Existing | 原提領流程與停止／繼續 Choice 仍可操作 |
| S02-W4 | S02 戀愛劇本 | 驗證金追加頁 | 提領前再要求安全驗證金、稅金或解凍金 | Investment / Crypto | block | 7s | Existing | 「完成驗證」與後續風險分析流程照常運作 |
| S03-W1 | S03 權威陷阱 | 假檢警通話 | 自稱檢警要求保密、移至 LINE 並以案件／凍結施壓 | Phone / Authority | high | 6s | Proposed | 通話、字幕、countdown 與接續 Choice 繼續 |
| S03-W2 | S03 權威陷阱 | 銀行 App 轉帳確認 | 假檢警要求把全額存款匯入「監管帳戶」 | Banking / Payment | block | 7s | Existing | 撥打 165／確認轉帳 Choice 仍可操作 |
| S04-P | S04 黑箱包裹 | 售後爭議對話 | 賣家收貨後片面更改退貨條件並拖延退款 | Shopping / Marketplace | high | 6s | Existing (proposed registry) | 對話、捲動與退貨／完成訂單 Choice 繼續 |
| S05-P | S05 幽靈訂單 | 銀行驗證 | 假客服要求賣家操作銀行 App 並以「驗證」名義轉帳 | Banking / Payment | block | 7s | Existing (proposed registry) | 「確認驗證」與「取消並離開」皆保持可操作 |

## Registry parity rule

- Matrix 的 12 個 ID 是封閉集合；新增、刪除或重新命名必須經 Review Board 並同步 Registry。
- `block` 只表示風險視覺強度，絕不表示阻擋 Scenario。
- S04-P、S05-P 保留 `P` 是 Review Board 的識別碼；即使已有局部 UI，也不擅自改成 `W1`。
