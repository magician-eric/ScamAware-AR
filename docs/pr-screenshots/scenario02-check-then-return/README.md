# Scenario 02 — 「先有動機才進平台」中後段驗收截圖

`fix(scenario02): motivate both mid-game Coin Winner trips from the LINE chat`
的驗收截圖。這次改的是 **中後段兩次進出幣勝客的劇情動機與 state 流向**，
不是文案替換，所以驗收方式是「整段順序跑一次，證明沒有無動機 teleport」。

## 拍攝方式

- `webapp` 正式 `npm run build` 產物，`vite preview` 靜態 serve。
- 430×900 @2x，Chromium（Playwright）。
- 以既有 route 與既有 state 進入：`sessionStorage` 播種
  `cibar-scenario02-platform-state`（已註冊、已入金）與
  `cibar-scenario02-privatechat-checkpoint`（`resumeId: 'day9-divider'`），
  **未為了截圖改動任何 production code**。
- 角色名由每次 run 的 cast 抽籤決定，所以不同張截圖可能是不同名字
  （樂樂／若若），這是既有行為，與本次改動無關。

## 第一段：第一次看到獲利

| # | 畫面 | 重點 |
|---|------|------|
| 01 | `01-line-she-asks-first-check.png` | 女方先在 LINE 開口：「老公，你去看一下，看看是不是已經開始賺錢了？」＝ 進平台的劇情動機。全劇第一次出現「老公」。 |
| 02 | `02-coin-winner-first-profit.png` | 幣勝客首頁 10,860 CIBDT／今日收益 +860，玩家親自看到獲利。 |
| 03 | `03-line-report-then-name-choice.png` | 回到 LINE：玩家「有耶，真的開始賺錢了。」→ 女方「太棒了！」→ 二選一（調情，不影響主線）。 |

## 第二段：查看獲利並準備提領

| # | 畫面 | 重點 |
|---|------|------|
| 04 | `04-line-she-asks-second-check.png` | 女方「老公，你再去看一下，現在賺多少了。」＋誘導「如果真的有賺，我們可以先提一部分出來。／剛好可以拿來付民宿跟吃飯。」 |
| 05 | `05-coin-winner-grown-profit.png` | 幣勝客首頁 38,640 CIBDT／今日收益 +28,640。 |
| 06 | `06-line-withdraw-choice.png` | 回到 LINE：玩家「我看了，快四萬了。」→ 女方回應 → 二選一「好啊，我去領看看。／再等等吧。」 |
| 07 | `07-line-withdraw-accept.png` | A：直接進原本的提領流程。 |
| 08 | `08-line-withdraw-decline-merges-back.png` | B：女方再說服兩句後由玩家「好吧，那我去看一下提領。」合流，沒有卡死、沒有另開長篇支線。 |
| 09 | `09-coin-winner-withdrawal.png` | 兩條分支都落在同一個 `s17-end` 提領頁，後續安全驗證金／詐騙教育節點原封不動。 |

## 兩段共同的驗收條件

- 每一次 `goto-platform` 前面都有一句女方的請求，回來後都有玩家的回報。
- 全程無重複訊息、無 loop、`returnTo`（`resumeId`）都落在對話中段而非 day divider。
- 續跑到 `scammed-result` 確認 Day 12 之後的詐騙教育節點未受影響。
