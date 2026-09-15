# AR Gesture Bridge — Phase 3

> **Gesture Bridge DOES NOT recognize gestures.**
>
> 它不開相機、不載 SDK、不看手、不看 frame。它只**消費**一個「已經被辨識完成」的 semantic LEFT／RIGHT event，並把那一個決定轉成**最多一次**對 AR Interaction Contract 的呼叫。
>
> 辨識本身（佐臻 SDK／眼鏡 ToF depth sensor／native 手勢判讀）屬於後面的 Phase，Phase 3 一行都沒有做。
>
> **更正（硬體）**：本文件原本把辨識源寫成 camera／MediaPipe／hand tracking。實機不是這樣：LEFT／RIGHT 由眼鏡自己的 **ToF 8×8 depth sensor** 產生，是與 RGB camera 無關的獨立硬體，經 ar-app 的 native bridge 送進 WebView。RGB camera 只給圖片辨識用（`docs/ar-image-recognition.md` §2）。下面圖中的「camera」字樣屬於當時的假設，Bridge 的行為與介面不受影響——它本來就不辨識任何東西。

- **範圍**：`webapp/src/lib/arInteraction/gestureBridge.js` ＋ `webapp/src/lib/arInteraction/debug/`
- **測試**：`npm run test:gesture-bridge`
- **前置**：Phase 1 契約層（§4.12.1–4.12.7）、Phase 2 五情境全站 migration（`docs/ar-interaction-phase2-migration.md`）

---

## 1. Architecture

```
┌────────────────────────────────────────┐
│ Future Gesture Recognizer              │
│ 佐臻 SDK / ToF 8x8 depth sensor         │   ← 尚未開始
└──────────────────┬─────────────────────┘
                   │  semantic LEFT / RIGHT
                   ▼
┌────────────────────────────────────────┐
│ Gesture Input Adapter                  │   ← FUTURE PHASE
│ （Phase 3 的替身：DEV keyboard adapter）│      debounce / cooldown /
└──────────────────┬─────────────────────┘      gesture stabilization 在這一層
                   │  dispatchARGesture(...)
                   ▼
┌────────────────────────────────────────┐
│ Gesture Bridge                         │   ← PHASE 3（本文件）
│ 事件身分、staleness、可觀察的結果        │
└──────────────────┬─────────────────────┘
                   │  performARInteractionWithResult(gesture)
                   ▼
┌────────────────────────────────────────┐
│ AR Interaction Contract                │   ← PHASE 1 + PHASE 2
│ 「現在這個畫面允許什麼」的唯一 truth source│
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ Scenario semantic action                │
└────────────────────────────────────────┘
```

**不得跨層。** Bridge 只跟它上下的兩層說話：上面收 LEFT／RIGHT，下面呼叫 contract。它不認識任何 Scenario，也不認識任何裝置。

### 為什麼 Bridge 不能知道 Scenario

Bridge 裡面**沒有**、而且測試會擋住：

| 禁止 | 由哪個測試釘住 |
| --- | --- |
| `if (scenario01)`／`switch (route)`／`pathname.includes(...)` | `the gesture layer knows nothing about any scenario` |
| `surfaceId === '某個畫面'` → 特殊處理 | 同上 |
| `querySelector`／`element.click()`／`data-gesture-*` | `the gesture layer knows nothing about the DOM` |
| camera／SDK／MediaPipe／hand tracking／MindAR | `the gesture layer contains no recognition, no camera and no SDK` |
| `window.performGesture` 之類的全域 API | `the Bridge installs no global gesture API and no timer` |
| `import React` | `the core Bridge is framework-agnostic` |

Bridge 只知道兩個字：**LEFT** 與 **RIGHT**，以及「目前 active contract 是否允許這個方向」。GuGo／MeetU／Coin Winner／BlackPi／MyDonDon／LINE／銀行／Outcome／Quiz 這些名字，它一個都沒聽過。

---

## 2. Canonical gestures

正式語彙**只有一套**，而且就是 Phase 1 契約層自己的那一套 —— Bridge **re-export**，不另造第二份：

```js
import { AR_GESTURE } from '@/lib/arInteraction';   // === AR_GESTURES，同一個 frozen object

AR_GESTURE.LEFT   // 'left'
AR_GESTURE.RIGHT  // 'right'
```

正式 API **不接受**：`'LEFT'`、`'Left'`、`'swipeLeft'`、`'gesture_left'`、`0`、`1`、`'up'`、`'tap'`。以上一律 `invalid-gesture` rejected。

> 未來 Native Bridge／SDK 若說別的方言，**由它自己的 adapter 在邊界轉成 canonical gesture**，不是讓核心 Bridge 接受十種格式。方言活在邊緣，核心永遠只有一套字。

---

## 3. Event schema（dispatch 的輸入）

```js
dispatchARGesture('right');                       // 只有方向（沒有 duplicate 保護）

dispatchARGesture({
  gesture: 'right',          // 必填，canonical LEFT / RIGHT
  eventId: 'evt-123',        // 選填，但每個真實 adapter 都應該給
  expectedRevision: 100,     // 選填，辨識當下看到的 contract revision
  source: 'native',          // 選填，debug／telemetry only
});
```

| 欄位 | 型別 | 意義 |
| --- | --- | --- |
| `gesture` | `'left' \| 'right'` | 已經辨識完成的語意方向。其他值一律 `invalid-gesture`。 |
| `eventId` | `string?` | **一個 logical event 的身分**。同一個 id 只會執行一次 handler。省略時 Bridge 會給一個保證不重複的內部 id（等同**放棄** duplicate 保護），結果會回報實際使用的 id，所以呼叫端不可能誤以為有去重。 |
| `expectedRevision` | `number?` | 這個事件是**對著哪一版 interaction** 辨識出來的。與當下不符 → `stale-interaction`。省略則不做 staleness 檢查。 |
| `source` | `string?` | `test`／`keyboard-debug`／`native`／`sdk`…。**只用於 debug／telemetry**，不改變任何 gameplay：Bridge 內部沒有任何一行針對 source 分支，所有 source 走同一條 dispatch path（測試 `19. every source travels the identical dispatch path` 釘住）。 |

envelope 有兩種寫法（裸字串或 request object），但**gesture 語彙只有一套** —— 這才是重點。

---

## 4. Dispatch result（dispatch 的輸出）

`dispatchARGesture()` 回傳一個 frozen object，**永遠不 throw**：

```js
// accepted
{
  accepted: true,
  reason: null,
  gesture: 'left',
  eventId: 'evt-123',
  source: 'native',
  surfaceId: 'scenario02/deposit-warning',   // decision 當下的 snapshot
  mode: 'dual',
  revision: 12,
  completion: Promise<{ status, error }>,
}

// rejected
{
  accepted: false,
  reason: 'direction-unavailable',
  gesture: 'left',
  eventId: null,
  source: null,
  surfaceId: 'scenario03/police-callback/answer',
  mode: 'single',
  revision: 8,
  completion: null,
}
```

`accepted` 只回答「畫面的 action 有沒有被執行」。它不回答「action 成功了沒有」——那是 `completion` 的工作（§8）。

---

## 5. Rejection reasons

| reason | 什麼時候 |
| --- | --- |
| `invalid-gesture` | 送進來的不是 canonical LEFT／RIGHT |
| `no-active-interaction` | 目前沒有任何畫面向 contract 註冊 |
| `direction-unavailable` | 這個畫面**設計上就沒有**這個方向：`display` 的任何方向、`single` 的 LEFT |
| `disabled` | 這個方向**有宣告，但現在被關掉**：送出中的表單、鎖住的選項、畫面自己 disabled 的 CTA |
| `duplicate-event` | 同一個 `eventId` 已經 dispatch 過 |
| `stale-interaction` | `expectedRevision` 與當下 revision 不同 —— 事件屬於上一個畫面 |
| `busy` | 上一個被接受的 dispatch 的 action 還在執行中（含 async handler 尚未 settle） |

**rejected 是正常行為，不是 exception。** `single` 畫面收到 LEFT 就是 rejected；Bridge 不會 throw，也不會「找一個最接近的動作」來執行。

`busy` 不是 cooldown：它由 action 自己撐開、action 一結束就放掉，Bridge 裡**沒有任何 timer**。

---

## 6. `eventId` semantics — 一次 gesture 只能觸發一次

辨識器會在**很多個 frame** 上送出同一次揮手。Bridge 的保證是：

> **一個 logical event（一個 `eventId`）＝ 最多一次 handler 執行。**

- 第一次 → `accepted`，handler 執行一次
- 第二次（第三次、第 n 次）→ `rejected` / `duplicate-event`，**handler 完全不會再被呼叫**
- 同一個 id 換一個方向送 → 一樣 `duplicate-event`（身分先於方向）
- id 在**被接受的當下**就記帳，早於 handler 執行 —— 一個會導頁的 handler 就算把同一個事件繞回來，也只會撞到已用掉的 id

已見過的 id 保留最近 512 筆（bounded，不會無限成長）。

### Phase 3 刻意不做時間 debounce

**沒有** 300ms cooldown、**沒有** 500ms debounce、**沒有** 1 秒 throttle，Bridge 裡一行 timer 都沒有。

理由很簡單：真正佐臻 hand recognition 的 frame rate、gesture hold duration、SDK callback pattern **現在還不知道**，現在訂一個時間窗等於對著空氣訂。Phase 3 只處理**身分**：同一個 logical event ID 不得重複執行。真正的 debounce／cooldown／gesture stabilization 屬於後面的 Gesture Input Adapter。

---

## 7. `revision` / stale protection — 舊手勢不得打到新畫面

情境：

```
Page A   mode = dual     revision = 100
  └─ 外部偵測到 RIGHT（帶著 revision 100）
     ...事件真正 dispatch 前，玩家已經到了 Page B
Page B   mode = single   revision = 101
```

那個 RIGHT **不得**誤觸 Page B：

```js
dispatchARGesture({ gesture: 'right', eventId: 'evt-123', expectedRevision: 100 })
// → { accepted: false, reason: 'stale-interaction' }
```

### revision 什麼時候會變

Phase 3 一併把契約層的 `revision` 定義補完整。它現在在**兩種**情況變動：

1. **註冊／解除註冊**（畫面 mount／unmount）—— Phase 1 就有的。
2. **同一個註冊之下，resolved geometry 改變** —— Phase 3 新增。

第 2 點是必要的，因為好幾個真實畫面**不換頁也會換 interaction**：反詐小測驗作答前是 `dual`、作答後是 `single`，全程只有一次註冊。那是**不同的 interaction**，對著前者辨識出來的手勢不能落到後者上（§29 regression 就是這一條）。

geometry signature ＝ `surfaceId | declaredMode | mode | leftAvailable | rightAvailable`。

它**不會**因為 re-render 產生新的 handler closure 而變動 —— inline arrow handler 每次 render 都是新 object，若跟著它動，每一個手勢都會被判 stale。

---

## 8. Async handler

契約允許畫面的 handler 是 `async`。Bridge 因此**擁有**那個 promise，而不是把它丟掉：

```js
const result = dispatchARGesture({ gesture: 'right', eventId: 'evt-9' });
if (result.accepted) {
  const outcome = await result.completion;   // 永遠 resolve，永遠不 reject
  // { status: 'ok', error: null }
  // { status: 'action-error', error: <原本的 Error 物件> }
}
```

- handler pending 期間，**同一個 event** 不會因為 promise 還沒 resolve 就被重跑（`duplicate-event`）；**其他 event** 也擋在 `busy`。
- handler reject／同步 throw → `completion` 得到 `action-error`，`error` 是**原本的 Error 物件本身**（不吞掉、不壓成字串），同時派送給所有 dispatch listener。
- 不會產生 unhandled rejection，也不會讓一個壞掉的 action 把 Bridge 永久鎖住（`busy` 一定會被放掉）。

---

## 9. Snapshot API

```js
getARGestureSnapshot()
// {
//   active: true,
//   surfaceId: 'shared/anti-fraud-quiz',
//   mode: 'dual',
//   declaredMode: 'dual',
//   revision: 12,
//   leftAvailable: true,
//   rightAvailable: true,
//   busy: false,
// }
```

這是 `getCurrentARInteraction()` 的**投影**，不是快取：每次呼叫都重新讀契約。

**Gesture Bridge 不維護自己的 `currentSurface`／`currentMode`／`currentRevision`。** Contract 是唯一 truth source；第二份 state 正是「手勢打到上上個畫面」的標準成因。測試 `18. getARGestureSnapshot agrees with getCurrentARInteraction at every step` 逐欄比對釘住。

`mode` 與 `declaredMode` 的差別，就是 `direction-unavailable` 與 `disabled` 的差別：`declaredMode` 是畫面宣告的幾何，`mode` 是把 availability 套上去之後的結果（全部不可用時會塌成 `display`）。

另有 `subscribeARGestureDispatch(listener)` 供 DEV overlay／未來 telemetry 觀察每一次 dispatch（`phase: 'dispatched'` → `phase: 'settled'`）。listener 只能觀察，不能否決、改道或重入。

---

## 10. Debug keyboard adapter（DEV only）

Phase 3 還沒有辨識器，所以需要一個能**用手動方式驅動真正 Bridge** 的輸入源：

| 按鍵 | gesture |
| --- | --- |
| `ArrowLeft` | LEFT |
| `ArrowRight` | RIGHT |

`webapp/src/lib/arInteraction/debug/keyboardGestureAdapter.js`

它就是未來佐臻 adapter 的**替身**，所以形狀刻意做成一樣：辨識源決定方向 → 蓋上 `eventId` 與辨識當下的 `expectedRevision` → 交給 `dispatchARGesture`。就這樣。

**它不 synthetic click。** 沒有 `document.querySelector(...)`、沒有 `element.click()`、沒有合成 pointer event、不認識任何 Scenario。路徑是：

```
Keyboard → Gesture Bridge → AR Interaction Contract → 畫面自己的 semantic handler
```

如果它作弊去點按鈕，它就什麼都證明不了。

其他細節：`event.repeat`（按住不放的自動重複）算一次按下、其他按鍵都不是手勢、在 `input`／`textarea`／`contenteditable` 裡按方向鍵是打字不是手勢。

---

## 11. Debug overlay（DEV only）

`webapp/src/components/debug/ARGestureDebugOverlay.jsx`，由 `src/App.jsx` 以**兄弟節點**掛載（不包住路由畫面）。

它是工程用讀數，不是玩家 UI：

```
AR GESTURE DEBUG
Surface:  scenario03/police-callback/answer
Mode:     single
Revision: 8
LEFT:     OFF
RIGHT:    ON
Last:     RIGHT accepted
```

- 全部 inline style，**不碰任何 Scenario CSS**
- `pointer-events: none`，**永遠不會攔到玩家的觸控**
- flag 關閉時直接 `return null`，keyboard adapter 也不會啟動

---

## 12. Debug flag／Production behavior

```bash
VITE_AR_GESTURE_DEBUG=true npm run dev
```

| 情況 | keyboard adapter | overlay |
| --- | --- | --- |
| 沒設這個變數（**production 預設**） | **不啟動、不監聽 keyboard** | **不 mount** |
| `VITE_AR_GESTURE_DEBUG=false` / `''` / `'1'` | 不啟動 | 不 mount |
| `VITE_AR_GESTURE_DEBUG=true` | 啟動 | mount |

只有字串 `'true'` 會開；`repo` 內沒有任何 `.env`，所以 production build 解析為 `false`。**一般玩家按鍵盤不會觸發任何劇情。**

Bridge 本體**沒有** flag、沒有 debug 分支：debug source 與 native source 走完全相同的 dispatch path 與完全相同的守門。

### 不污染全域 window

Phase 3 **沒有**掛 `window.performGesture`／`window.swipeLeft`／`window.swipeRight`，也沒有為了測試把核心 handler 掛上 window。未來 Android WebView 若真的需要 window interface，那是下一階段 Native Adapter 的責任。

---

## 13. 玩家觸控完全不變

Gesture Bridge 是**第二種** input source，不是取代品：

```
Touch ─────────────┐
                   ▼
          semantic handler
                   ▲
     AR Interaction Contract
                   ▲
          Gesture Bridge
                   ▲
        Future 佐臻 recognizer
```

原本的 `onClick`／`<Link>` 一顆都沒有拔掉，正式 UI 也**沒有**加入任何 gesture 專用元素（← 左揮／右揮 →／請做手勢／手掌 icon／動畫教學）。正式畫面維持原樣。

---

## 14. Phase 3 / Phase 4 boundary

| | Phase 3（已完成） | Phase 4＋（尚未開始） |
| --- | --- | --- |
| semantic LEFT／RIGHT → contract | ✅ | |
| duplicate event 保護（`eventId`） | ✅ | |
| stale 保護（`expectedRevision`） | ✅ | |
| 可觀察的 dispatch result／rejection reason | ✅ | |
| async handler 與 `action-error` | ✅ | |
| DEV keyboard adapter ＋ overlay | ✅ | |
| debounce／cooldown／throttle／gesture stabilization | ❌ 刻意不做 | ✅ Gesture Input Adapter |
| 真正 hand tracking／gesture recognition | ❌ | ✅ |
| 佐臻 SDK／Android native／Kotlin/Java bridge／WebView `JavascriptInterface` | ❌ | ✅ Native Adapter |
| camera／MediaPipe／TensorFlow | ❌ | ✅ |
| `window` 上的 native interface | ❌ | ✅ Native Adapter |
| 圖片辨識／`/ar-scan`／MindAR／`targets.mind` | ❌ 完全未動 | — |

---

## 15. 測試

`npm run test:gesture-bridge`

**Unit（Bridge 本身）**：invalid gesture／no active interaction／display 兩向皆拒／single LEFT 拒 RIGHT 收一次／dual 兩向各自執行／duplicate eventId／stale revision／disabled 兩向／async handler 正常與錯誤／snapshot 與契約一致／source 不改行為／無 contract 不 crash。

**Integration（真正 production 畫面，全部只透過 Bridge dispatch，不直接呼叫 handler）**：

| 情境 | 畫面 | 幾何 |
| --- | --- | --- |
| Scenario 01 | `scenario01/line-teacher/need-choice` | dual |
| Scenario 02 | `scenario02/deposit-warning` → `/stopped` | dual → single |
| Scenario 03 | `scenario03/police-callback/answer` → `scenario03/police-callback` | single → display |
| Scenario 04 | `scenario04/messages` | dual |
| Scenario 05 | `mydondon/product-select` | dual → disabled |
| Shared | `shared/outcome` | single |
| Shared | `shared/fraud-clue-analysis` | single |
| Shared | `shared/anti-fraud-quiz` → `shared/anti-fraud-quiz-answered` | dual → single |

**Scenario 03 特別 regression**（#326／#327 剛修完的流程）：`police-callback/answer` 的 LEFT 一定 rejected 且不接聽、RIGHT 接聽；進入 `police-callback` display 後 LEFT／RIGHT 皆 rejected，不跳過語音、不跳 LINE、不跳銀行。

**Shared Quiz regression**：作答前 dual，LEFT／RIGHT 各自作答；作答後 single（LEFT unavailable、RIGHT 返回 `/ar-scan`）；帶著作答前 revision 的舊 dual event → `stale-interaction`，**不得在 answered state 重新作答**。
