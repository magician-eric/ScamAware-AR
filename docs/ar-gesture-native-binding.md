# AR Gesture — Native Binding（佐臻 ToF → Scenario action）

> **這一層不辨識手勢。** 辨識在 Android 端已經完成（ToF 8×8 depth sensor → `GestureBridgeScript`）。這份文件描述的是把「已經辨識好的 LEFT／RIGHT」正式接上 AR Interaction Contract 的那一條線。

- **範圍**：`webapp/src/lib/arInteraction/native/installJorjinGestureBridge.js` ＋ `webapp/src/components/native/NativeGestureBridge.jsx`
- **測試**：`npm run test:native-gesture-bridge`
- **前置**：Phase 1 契約層、Phase 2 五情境 migration、Phase 3 Gesture Bridge（`docs/ar-gesture-phase3-bridge.md`）、#346 LEFT／RIGHT 規則（`docs/ar-gesture-left-right-actions.md`）

---

## 1. 這次修的是哪一段

實機上原本的狀況是：ToF 正常、WebView 收得到 `jorjinGesture`、`/gesture-tutorial` 可以用真手勢完成——但進 Scenario 01～05 之後 LEFT／RIGHT 完全沒有反應。

原因不在辨識，而是 native adapter 與 Gesture Bridge 之間**沒有接線**：`jorjinGestureAdapter.js` 已經能把 vendor code 轉成 canonical LEFT／RIGHT，但沒有任何 production code 呼叫 `dispatchARGesture(...)`，所以五個情境宣告的 AR Interaction Contract 永遠收不到 native gesture。唯一會消費 native event 的地方是手勢教學頁自己的 state machine。

```
佐臻 ToF（Android，已完成）
   │  'LEFT' / 'RIGHT' / 'PUSH' / ...
   ▼
GestureBridgeScript（Android，已完成）
   │  window CustomEvent 'jorjinGesture' { gesture, label, count, at }
   ▼
jorjinGestureAdapter.js（已完成）
   │  canonical LEFT / RIGHT ＋ eventId ＋ source
   ▼
installJorjinGestureBridge.js        ← 這次補上的一條線
   │  dispatchARGesture({ gesture, eventId, source, expectedRevision })
   ▼
gestureBridge.js（已完成）
   │  duplicate / stale / busy / availability
   ▼
interactionContract.js（已完成）
   │
   ▼
Scenario 的 semantic action
```

## 2. Production binding 放在哪裡

只有**一個**全域 binding，掛在 `src/App.jsx`，與 routed screen 平行（不是包在外面）：

```jsx
<>
  {element}
  <NativeGestureBridge />     {/* production */}
  <ARGestureDebugOverlay />   {/* DEV only */}
</>
```

- 五個情境、以及 shared ending／analysis／quiz 全部透過這一個掛載點取得手勢，沒有任何 scenario root component 自己 `window.addEventListener('jorjinGesture', ...)`。
- `NativeGestureBridge` render `null`：沒有元素、沒有樣式、沒有 context，玩家看不到任何東西。
- binding 本身（`installJorjinGestureBridge.js`）**不含 scenario 判斷、不含 route 判斷、不含 DOM selector**，責任只有一件事：subscribe native gestures → `dispatchARGesture`。route 的例外由掛載點決定，見 §4。

## 3. Native event 如何轉成 `dispatchARGesture`

```js
subscribeNativeGestures(({ gesture, eventId, source }) => {
  const { revision } = getARGestureSnapshot();   // ← 在收到 native event 的當下讀
  dispatchARGesture({ gesture, eventId, source, expectedRevision: revision });
});
```

- `gesture`：adapter 轉好的 canonical `left` / `right`。ToF 也會送 UP／DOWN／PULL／PUSH／HALT／PRESENCE／SELECT，adapter 一律丟掉，**連 dispatch 都不會發生**。
- `eventId`：`jorjin-tof:<count>`，count 是 Android 自己的流水號。Gesture Bridge 用它做 duplicate suppression——同一次揮手送兩次，action 只跑一次。
- `expectedRevision`：在 native event 抵達當下讀 `getARGestureSnapshot().revision`，交給 Bridge 做 stale interaction 判斷，避免「RIGHT → Scenario A 導頁 → 同一個 event 又落到 Scenario B」。
- Bridge 既有的 duplicate / stale / busy / availability 保護**直接沿用，沒有重寫**。

#346 的規則完全沒有動：TWO_ACTION 的 LEFT／RIGHT 各對一個 action，ONE_ACTION 的 LEFT ignore、RIGHT 執行唯一 action，ZERO_ACTION 兩者皆 ignore。沒有新增 focus、SELECT、HALT，也沒有「先選擇再確認」。

## 4. Gesture Tutorial 如何隔離

`/gesture-tutorial` 直接使用 `subscribeNativeGestures()` 跑自己的 `WAIT_LEFT → WAIT_RIGHT → COMPLETE`，而且刻意**不宣告** AR Interaction Contract——教學頁的 LEFT／RIGHT 是教學步驟，不是劇情選項。

所以全域 binding 在該 route 上 **suspend**：

```js
const SUSPENDED_PATHS = Object.freeze(['/gesture-tutorial']);
```

`NativeGestureBridge` 讀 `useLocation().pathname`，在教學頁不安裝 subscription，離開教學頁立刻恢復。同一個 LEFT 不會「教學收一次、Contract 又收一次」。

suspend 用 route list 而不是頁面上的旗標，是因為 binding 掛在 router 之上：教學頁還在 render 的那一瞬間，binding 就必須已經是停用狀態。

## 5. `/ar-scan` 與入口頁

圖片掃描頁不是劇情選項，本來就沒有宣告 AR Interaction Contract，所以 LEFT／RIGHT 得到 `no-active-interaction` 就結束，不會誤觸任何 story action。這次**沒有**為掃描頁新增任何 gesture action。`/language`、`/scenario-menu`、`/staff-setup` 同理。

## 6. Debug log（實機驗證用）

診斷模式下每一次 native delivery 會輸出一行 console：

```
[JorjinGesture] native=RIGHT eventId=jorjin-tof:23 revision=105 surface=scenario01/feed accepted=true reason=null
[JorjinGesture] native=LEFT  eventId=jorjin-tof:24 revision=105 surface=scenario01/feed accepted=false reason=direction-unavailable
```

`reason` 直接就是 Gesture Bridge 自己的 rejection code，所以「眼鏡顯示 RIGHT 但劇情沒動」可以一眼看出卡在哪一層：

| reason | 意思 |
| --- | --- |
| `null`（`accepted=true`） | action 已執行 |
| `no-active-interaction` | 當前畫面沒有宣告 AR Interaction Contract（`/ar-scan`、入口頁） |
| `direction-unavailable` | 設計上就沒有這一側（ONE_ACTION 的 LEFT、ZERO_ACTION 的兩側） |
| `disabled` | 這一側存在，但目前被畫面關掉（已作答的測驗、已送出的請求） |
| `duplicate-event` | 這一次 delivery 已經跑過了 |
| `stale-interaction` | event 辨識當下的畫面已經換掉 |
| `busy` | 上一個 action 還在執行中 |

開啟方式（預設全關，正式玩家看不到任何東西，也不會有任何玩家可見的 UI 文字）：

| 開關 | 用途 |
| --- | --- |
| `VITE_AR_GESTURE_DEBUG=true` | DEV 工具總開關，連帶開啟 log |
| `npm run dev`（`import.meta.env.DEV`） | 本機開發 |
| `globalThis.__CIBAR_AR_GESTURE_DIAGNOSTICS__ = true` | **已經打包好的 APK**：在 WebView inspector 執行這一行即可，不必重新 build。下一次手勢就生效 |

## 7. 測試

`npm run test:native-gesture-bridge`（34 cases）測的是**真正的入口**——每一個 case 都從 `window.dispatchEvent(new CustomEvent('jorjinGesture', ...))` 開始，沒有任何一個 case 直接呼叫 `dispatchARGesture()` 或直接呼叫畫面的 handler：

1. TWO_ACTION：native LEFT → 左 action 剛好一次；native RIGHT → 右 action 剛好一次
2. ONE_ACTION：native LEFT → 完全沒有動作（`direction-unavailable`）；native RIGHT → 唯一 action 剛好一次
3. ZERO_ACTION / disabled：兩側都不執行，並回報原因
4. duplicate：相同 `detail.count` 送兩次 → action 只跑一次；導頁後重播同一個 event → 不會落到下一個畫面；action 執行中的新 event → `busy`
5. tutorial isolation：在 `/gesture-tutorial` 送 LEFT → 教學狀態前進、AR Interaction Contract action = 0、連 dispatch 都沒有發生
6. unsupported gestures：PUSH／HALT／SELECT／UP／DOWN／PULL／PRESENCE 一律不 dispatch
7. `/ar-scan`：`no-active-interaction`
8. 結構規則：全 app 只有一個 binding、binding 不含 scenario／route／DOM／recogniser／timer、沒有掛任何全域 gesture API

## 8. 沒有動到的東西

Android（`android/`、ToF、8×8 recognizer、camera、MJPEG、`GestureBridgeScript`）、圖片辨識與 `__jorjinCamera`、五張 target、手勢教學 UI、五個情境劇情、按鈕排列、#346 interaction geometry、語言、Android packaging、離線化——全部維持原狀。
