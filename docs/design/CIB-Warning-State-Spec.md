# CIB Warning UI State Spec

## Universal State Model

每一個 registry warning 均遵循同一套 A–E 狀態；狀態只屬於 Warning presentation，不是 Scenario stage。

| State | Warning state | Scenario invariant | Transition |
|---|---|---|---|
| **A. Event before warning** | 未顯示；無預留空間、無 backdrop | Event、dialogue、timer 與畫面照既有邏輯運作 | Scenario event 發出 observation signal → B |
| **B. Warning entering** | 頂部 overlay 以約 280ms 上滑 + fade；五層資訊完整 mount | 不暫停、不 focus trap、不攔截底層 input | 動畫結束 → C；reduced motion 可直接到 C |
| **C. Warning + scenario coexist** | 展開顯示；開始獨立 5–7s collapse timer | dialogue/timer/countdown/auto advance/scroll 全部繼續 | duration 到期或手動收合 → E；Scenario Choice 可直接發生 D |
| **D. Choice / CTA still usable** | Warning 可維持展開或 Pill；不回應 scenario action | 原 Choice / CTA 接收事件並按原邏輯轉換；Warning 不記錄、不導航 | 同 scene 留在 C/E；scene unmount 則 presentation 結束 |
| **E. Collapsed Pill** | 顯示 `⚠ 防詐提醒`，保留原 warning 內容 | Scenario 全功能持續 | activate Pill → C（不重觸發、不倒轉 Scenario） |

### State ownership

- Scenario 只提供可觀察事件與 scene lifecycle；Warning 不寫回 Scenario。
- `entering`, `expanded`, `collapsed` 可以是 component-local state；不得加入 scenario stage enum。
- 自動收合 timer 與 scenario timer 必須是不同 owner、不同 cleanup。
- B/C/E 均為 overlay，因此 A→B 與 C→E 不可造成 layout shift。

### Focus and pointer behavior

- B 不自動取得 focus；螢幕閱讀器以非 modal status 宣告。
- C 的 collapse control 與 E 的 reopen Pill 可操作；其餘卡片內容不是 action。
- Overlay 空白區 pointer-through；底層被卡片實際覆蓋的控制應透過 placement/尺寸避免，而非事件轉送 hack。
- D 可由滑鼠、觸控與鍵盤完成，Warning 不呼叫 `preventDefault` 或 `stopPropagation`。

## Per-warning exceptions

本批 12 項**沒有行為例外**。以下僅為外觀/時間參數，不改變 A–E：

- S01-W1、S02-W1 為 5 秒 notice；視覺較克制。
- S01-W2、S03-W1、S04-P 為 6 秒 high；使用明確左色條。
- 其餘 7 秒的 `block` 項目採最強 danger emphasis，但仍完全 non-blocking。
- S03-W1 使用 Phone / Authority OS notification placement；通話和 countdown 仍繼續。
- S03-W2、S05-P 必須避開銀行確認/取消控制；不得因 viewport 小而覆蓋 Choice。
- S04-P、S05-P 的 `P` 只是 Review Board ID，不代表不同 state machine。

若未來確需例外，必須記錄：ID、理由、受影響狀態、無障礙影響、Review Board 核准；不得以例外授權 Warning 控制 Scenario。

## Review checklist (per warning)

- [ ] A：trigger 前 layout 與 runtime 無差異。
- [ ] B：280ms entry 不阻塞事件。
- [ ] C：五層資訊可讀，scenario 動態內容仍更新。
- [ ] D：下一個 Choice / CTA 在展開與 Pill 兩態均可操作。
- [ ] E：5–7 秒自動收合，Pill 可重新展開相同內容。
