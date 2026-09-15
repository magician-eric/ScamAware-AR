# CIB Warning Behavior Contract

> Status: **Normative**。所有 Scenario 01–05 Warning 未來實作均須遵守；資料項目的 `followingInteraction` 是描述，不是 Warning 可執行的 callback。

## Governing rule

**Warning observes the scenario. It does not control the scenario.**

Warning 是 presentation-only 的平行資訊層。它只可觀察 trigger、呈現五層風險資訊、收合及重新展開。Scenario 永遠是 route、stage、dialogue、timer、Choice、CTA 與紀錄的唯一 owner。

## Lifecycle

| Phase | Normative behavior |
|---|---|
| Placement | viewport **頂部浮動**，位於 safe area / platform header 下方；overlay 不進入文件或 flex flow，不推版。|
| Entry | 約 **280 ms**，由上滑入 + fade；建議 `ease-out`。Reduced motion 下取消位移。|
| Full display | 依 registry `duration` 顯示約 **5–7 秒**。計時只控制 Warning 自動收合，不控制 scenario。|
| Collapse | 到期後自動收成 **`⚠ 防詐提醒`** Pill；使用者亦可提早收合。|
| Reopen | Pill 可點擊及鍵盤啟動，重新展開同一則內容；重新展開不重播 trigger、不改 scenario state。|
| Exit/reset | Scene owner 卸載或新 warning 取代時才移除。切換語言不得改變 scenario state。|

同一時間原則上只顯示一則展開 Warning。事件密集時由 presentation queue 按發生順序呈現；不得合併或延遲 scenario 事件來配合 Warning。

## Coexistence / Interaction

Warning 出現、進場、展開、收合與重新展開期間，下列功能均必須保持正常：

- dialogue 繼續播放與新增訊息；
- timer 繼續；
- countdown 繼續；
- auto advance 繼續；
- scroll 繼續（Warning 自身若溢出可有獨立 scroll）；
- Choice 可操作；
- CTA 可操作；
- 原平台 navigation、media、通話與其他功能正常。

頂層 wrapper 應讓 pointer event 穿透；只允許 Warning 自身的「收合」與 Pill「重新展開」控制接收 pointer event。Warning 不使用 focus trap、backdrop、modal dialog 或全螢幕 hit target。遮擋無法避免時，應調整 Warning 尺寸/placement，而不是停用底層操作。

## Strict prohibition

Warning component（包括 hook、controller、動畫完成 callback 與 registry adapter）**不得**：

- navigate 或呼叫 navigation API；
- set route；
- set scenario stage / page / step；
- record scenario choice、分數、awareness、evidence 或 warningFlags；
- stop、pause、reset 或延長 timer / countdown / auto advance；
- 對 scenario action 呼叫 `stopPropagation()`；
- 對 scenario action 呼叫 `preventDefault()`；
- disabled、覆蓋、隱藏或取代 scenario Choice / CTA；
- 將收合或動畫完成視為繼續 scenario 的條件；
- 在 Warning 內提供「停止／繼續／轉帳／入金／取消／離開／撥打 165」等流程 CTA。

Warning 自身的 collapse/reopen event 只可更新 presentation-local state及可觀測性資料（例如無 scenario consequence 的曝光 telemetry）。不得將 Pill 操作記成 scenario choice。

## Timing and trigger semantics

- `duration` 單位為毫秒，容許值 5000–7000；代表自動收合延遲，不是警示存在期限。
- Trigger 由 Scenario 既有事件發出，Warning 只能訂閱。Registry 的 `triggerDescription` 是設計描述，**不會自行觸發 UI**。
- Trigger 發生前不預先改動 layout；發生後 Warning entry 與 Scenario 的 next action 可同時進行。
- Scene unmount 可取消 presentation timer；不得因此取消 Scenario 自己的 timer。

## Content contract

展開內容必須由 registry 的 `title`, `currentRisk`, `whyDangerous`, `memoryPoint`, `safeActionGuidance` 組成，順序固定。`severity` 只控制 danger emphasis，不賦予 blocking 能力。`followingInteraction` 供設計審查確認共存情境，不應 render 成 Warning control。

## Acceptance criteria

1. 進場動畫約 280 ms 且頂部浮動、不造成 layout shift。
2. 5–7 秒後仍保留可 reopen 的 `⚠ 防詐提醒` Pill。
3. 展開期間至少驗證 dialogue/timer/scroll 與 Choice/CTA 不受影響。
4. 搜尋 Warning implementation 不應找到 navigation、scenario setters 或 choice recording dependency。
5. 觸發前後 Scenario 的計時與結果在有/無 Warning 時相同。
