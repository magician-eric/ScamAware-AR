# CIB Warning Implementation Gap Report

> **2026-08-20 重新掃描結果**：本報告的 cross-cutting gap 清單**大致仍成立**——`FraudWarningBanner` 仍只有 `title`＋`body` 兩層內容，registry 仍未接線（零 import），`RedWarning`／`SafetyAlert` 等舊式 UI 仍存在。變動之處：Scenario 02 的 `DepositWarning`／`TopupWarning` 兩個「獨立 route warning」現已無入口（不再影響玩家流程，但檔案仍在）；Scenario 05 目前完全沒有共用警示呈現點。

> Audit baseline: repository state at 2026-08-13。本文只記錄「目前程式 vs Design System vs Review Board」差異，**不授權在本階段修正**。

## Executive summary

目前已有共用 `FraudWarningBanner`，具備 portal、頂部浮動、280ms entry、自動 Pill 與無 scenario action 的良好基礎；但內容模型仍只有 `title + body`，尚未落實五層資訊。另有舊式 route warning、全紅卡及 inline safety UI，造成 duplicate Warning UI 與行為不一致。Registry 本 PR 僅建資料、未接線。

## Cross-cutting gaps

| Gap | Current implementation | Target specification / Review Board | Impact |
|---|---|---|---|
| 五層內容缺失 | `FraudWarningBanner` props 只有 `title`、`body` | Title、Current risk、Why dangerous、Memory point、Safe-action guidance | 文案層級無法一致審查 |
| CTA 語意衝突 | Scenario 02 `RedWarning` / `SafetyAlert` 等舊 UI 含「繼續觀看」或流程 callback | Warning 卡內不得有停止／繼續等流程 CTA | Warning 可能控制或重複 scenario controls |
| Blocking warning | 部分 warning 是獨立 route/page，使用按鈕才前進；部分 severity 名稱為 `block` | Warning 只觀察、不得決定 route/stage；`block` 只表示視覺強度 | 中斷沉浸與計時 |
| Warning 在 flow 推版 | 舊 inline alert / marquee 位於聊天或頁面 flow | viewport 頂部 floating overlay | 可能推動訊息、表單或 Choice |
| 全螢幕／大面積紅 | `RedWarning` 與既有 `.warning` / ticker 採大紅 surface 或紅色跑馬燈 | danger 只用 icon、細框、左色條、關鍵詞；禁止大面積純紅 | 教材感、破壞平台沉浸 |
| Duplicate Warning UI | 共用 banner 與 Scenario-specific AiWarning/DepositWarning/TopupWarning/RedWarning/SafetyAlert 並存 | 一套行為 contract + 五種 platform skin | 同一風險的結構、時間與操作不一致 |
| 缺少完整 variant mapping | 共用元件有 `chat/invest/shopping/banking/phone` theme，但只用單一通用 layout/簡單顏色切換 | 各 Variant 的 placement、container、border、brand token、collapse、pill 明確跟隨平台 | 仍像跨平台貼上的通用 banner |
| Brand token 硬編碼 | 共用 CSS theme 直接宣告 accent/ink hex | 引用 Scenario 現有 MeetU/BITION/BlackPi/bank/phone tokens | 品牌 token 變更時會漂移 |
| Pill label 不完整 | 預設文字為「防詐提醒」，icon 以 SVG 分開 | 可見內容固定 `⚠ 防詐提醒`（語意等價 icon + label須通過可存取審查） | 規格與視覺快照可能不一致 |
| Reopen timing | reopen 只展開，不清楚 duration 是否重啟；目前 timer 已在首次 mount 後完成 | reopen 不重觸發 scenario；presentation 是否再次自動收合須統一測試 | 不同 mount timing 可能行為漂移 |
| Queue 未定義 | 多 warning 同時 active 時各自 portal render | 同時一則、presentation queue，不延遲 scenario | 可能疊卡遮擋 controls |
| warningFlags 未接 UI | Scenario 03/04 記錄多個 `warningFlags`，多數只供結尾/除錯/分數使用 | Registry trigger 應由 observable event 對應 presentation；不得由 Warning 寫 flag | 有風險資料但沒有對應即時 UI；未來接線須避免反向控制 |
| Registry 尚未接線 | 新 registry 是純資料且無 import consumer（本階段刻意如此） | 未來由獨立 presentation adapter 訂閱，不碰 scenario action ownership | 12 項目前不保證全數 render |
| 可存取性未完整驗證 | 共用 banner 有 live region；舊 alert/modal semantics 各異 | 非 modal、無 focus move、reduced motion、鍵盤 Pill、色彩非唯一線索 | 輔助技術體驗不一致 |

## Per-scenario audit

### Scenario 01 — 財富陷阱

- S01-W1/W2 已有影片 ticker / VIP 群組 banner 類呈現，但部分舊 ticker 為大面積紅色跑馬燈，且不是五層資訊。
- S01-W3 在 `WithdrawFail` 使用共用 banner；S01-W4 在 `QuizWrong` 使用 `severity="block"`。目前 body 合併所有理由與建議，缺 Memory point 的獨立層級。
- `AiWarning02` 是獨立 route/page 型警告，屬 duplicate / potentially blocking warning；Review Board 目標是 scenario 與 warning coexist。

### Scenario 02 — 戀愛劇本

- 私人聊天仍有 inline `SafetyAlert` 類型，可能在 flex/message flow 中推版，且具有內部操作語意。
- `DepositPage`、`GuaranteePage` 已疊加共用 banner，但 S02 的 `DepositWarning`、`TopupWarning`、`RedWarning` 仍是另一套 route/full-card warning。
- `RedWarning` 的「繼續觀看詐騙如何發展」由 Warning 觸發下一步，直接違反不 navigate / 不 set stage 的 contract。
- 既有警告文案未拆成 registry 五層，也沒有統一 presentation queue。

### Scenario 03 — 權威陷阱

- 多個 `warningFlags`（陌生來電、移至 LINE、要求保密、假文件、權威施壓等）已有資料但沒有對應 S03-W1 即時 Warning UI。
- `BankApp` 的 S03-W2 已使用 banking/phone banner，但仍只有 title/body；`severity="block"` 名稱容易被誤解為行為阻擋。
- 通話、字幕與 countdown 場景尚缺 OS-style Phone / Authority variant 的共存驗證。

### Scenario 04 — 黑箱包裹

- `DisputeChat` 已用對話 node 推導 S04-P 並呈現 shopping banner，但 config 是頁面內重複資料，未引用 registry。
- BlackPi 有完整 `--bp-*` tokens；共用 warning theme 目前硬編碼另一組 shopping accent/ink，未真正引用品牌 token。
- `warningFlags` 大多影響結尾評分/除錯，沒有相對應 Warning UI；需區分 gameplay flags 與 presentation trigger，避免未來 Warning 寫回 flags。

### Scenario 05 — 幽靈訂單

- `BankVerify` 已顯示 S05-P 類 banking banner，且底層確認/取消按鈕存在；仍需驗證小 viewport 下不遮擋以及兩個 CTA 持續可用。
- 共用 banking theme 未直接引用 Ghost Order 現有 bank tokens，且文案僅 title/body。
- Registry 的 `followingInteraction` 目前只是資料；符合本階段不得 trigger 的限制。

## Deferred implementation order (not part of this PR)

1. 先為共用 presentation component 增加五層純顯示 API 與 variant token mapping。
2. 建立只讀 event adapter / queue，禁止引入 navigate、store setter、choice recorder。
3. 逐場景以 feature flag 或測試遷移，移除 duplicate UI 前先做行為等價驗證。
4. 對 12 項執行 A–E state、timer、scroll、Choice/CTA、keyboard 與 reduced-motion 測試。
5. 另開 runtime PR；本規格 PR 不包含以上變更。
