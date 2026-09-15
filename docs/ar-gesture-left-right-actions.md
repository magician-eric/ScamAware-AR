# CIBAR AR Gesture Interaction — LEFT / RIGHT 直接執行

CIBAR 的 AR 版本只有兩個手勢，而且**手勢本身就是確認**。

| 畫面可操作按鈕 | LEFT | RIGHT |
| --- | --- | --- |
| 左右兩個按鈕 | 直接執行左側按鈕 | 直接執行右側按鈕 |
| 只有一個按鈕 | 無反應 | 直接執行唯一按鈕 |
| 沒有按鈕 | 無反應 | 無反應 |

## 我們不使用「選取 → 確認」

CIBAR **沒有**佐臻原本那套「上下左右移動選取 ＋ SELECT／停止確認」的操作模型。沒有 focus、沒有
selected、沒有 highlight、沒有游標、沒有 tabindex 巡覽、沒有第二個手勢來 commit。收到 LEFT 或
RIGHT，畫面自己原本的 `onClick` 就立刻執行——跟使用者用手指點下去是同一個 function。

也因此**單一按鈕永遠只接受 RIGHT**。一顆按鈕的畫面沒有「左邊」，LEFT 在那裡不是備援、不是
也可以觸發，而是根本不存在（見 `ALLOWED_KEYS`：`single` geometry 連 `left` 這個 key 都不允許
宣告）。

## 實作在哪裡

沒有第二套 DOM gesture system，這一版也沒有新增任何一套。既有的三層維持不變：

```
Gesture Recognizer（未實作；佐臻 / camera / SDK）
        |  semantic LEFT / RIGHT
        v
Gesture Bridge            webapp/src/lib/arInteraction/gestureBridge.js
        v
AR Interaction Contract   webapp/src/lib/arInteraction/interactionContract.js
        v
Scenario semantic action  各畫面自己的 onClick
```

每個畫面用 `useARInteraction` 明確註冊 semantic action，三種 geometry 之外沒有第四種：

```js
useARInteraction({ mode: 'display', surfaceId });                       // LEFT null / RIGHT null
useARInteraction({ mode: 'single',  surfaceId, action });               // LEFT null / RIGHT action
useARInteraction({ mode: 'dual',    surfaceId, left, right });          // LEFT left  / RIGHT right
```

Contract 從不碰 DOM：沒有 `querySelectorAll('button')`、沒有 `getBoundingClientRect()` 猜左右、
沒有 synthetic click、沒有 focus traversal。action 就是 React handler 本身，直接呼叫。

## 五情境 audit 結果

`npm run audit:ar-gestures`

| scenario | ZERO_ACTION | ONE_ACTION | TWO_ACTION | 合計 |
| --- | --- | --- | --- | --- |
| Shared（五情境共用） | 0 | 4 | 1 | 5 |
| Scenario 01 | 3 | 10 | 2 | 15 |
| Scenario 02 | 10 | 18 | 10 | 38 |
| Scenario 03 | 11 | 16 | 4 | 31 |
| Scenario 04 | 11 | 15 | 8 | 34 |
| Scenario 05 | 3 | 8 | 2 | 13 |
| **TOTAL** | **38** | **71** | **27** | **136** |

- **超過兩個 action 的畫面：沒有。**
- **視覺左右與 semantic mapping 相反的畫面：沒有。**

## 視覺位置必須與 Contract 一致

Contract 看不到畫面，這是刻意的分層。所以「LEFT 是不是玩家看到的左邊那顆」只能在別的地方驗，
而且必須是常設測試——之後有人把兩顆 JSX 按鈕對調，正是會靜悄悄把整個手勢語意反過來的那種改動。

`webapp/scripts/ar-dual-visual-order.mjs` 對 27 個 `dual` 畫面各問三件事，全部讀真實的 source 與
真實的 stylesheet：

1. **LAYOUT** — 排這一對按鈕的容器真的是左右兩軌（grid 兩欄，或不換行的 flex row），而且沒有任何
   `row-reverse` / `column-reverse` / `direction: rtl` / `order` 把順序翻掉。
2. **DRAW** — 在真正畫出這一對的檔案裡，左邊那顆寫在右邊那顆前面。
3. **BINDING** — 在宣告 contract 的檔案裡，`left:` 綁的就是前面那顆，`right:` 綁的是後面那顆，
   而且兩行是相鄰寫成一對的。

三件事同時成立，才等於「LEFT 就是左邊那顆」。任何一件破了，`npm run test:ar-dual-visual-order`
就會失敗並指名是哪個 surface。該套件也包含反向測試（故意把某個畫面的按鈕或綁定對調），證明這些
檢查真的會變紅，而不是永遠綠燈。

### 三個 `dual` 是直式清單（已記錄原因）

有三個畫面在視覺上沒有「左半邊／右半邊」可以對應，它們以 `axis: 'stack'` 記在 manifest 裡，
規則改為**閱讀順序：LEFT 是上面那個**。沒有寫理由的 stack 會讓 audit 失敗，所以決策列不會不知不覺
變成清單。

| surface | 為什麼是直式 |
| --- | --- |
| `scenario02/deposit-warning` | 這一頁保留「撥打反詐專線 165」夾在停止與繼續之間（AD-24：不在主線上），三顆按鈕的欄位放不成 1fr 1fr。165 只開教學浮層、不是 story action，所以 geometry 仍是 dual。主線的停損點 `scenario02/topup-warning` 關掉 165，是真正的左右兩欄。 |
| `scenario04/messages` | 訊息是收件匣：兩個對話串是整寬的列表列，不是決策列。賣家在上＝LEFT，黑皮客服在下＝RIGHT。把收件匣改成兩欄是改版面，不是修手勢。 |
| `scenario04/me` | 我的是會員選單，同上。黑皮退款中心在上＝LEFT，黑皮安心客服在下＝RIGHT。上方的音效開關是裝置設定、不是 story action，不列入 geometry。 |

## 防止連續誤觸

一次實際揮動只會觸發一次 action。Bridge 用的是**身分**而不是時間窗：

- **duplicate suppression** — 每個 dispatch 帶 `eventId`，同一個 id 第二次直接以
  `duplicate-event` 拒絕，handler 不會再被呼叫。id 在 action 執行**之前**就被消耗，所以「RIGHT →
  Page A action → 導頁 Page B → 同一個 RIGHT event → 又觸發 Page B action」不可能發生。
- **staleness** — adapter 帶著辨識當下看到的 `revision`；contract 只要動過，事件就以
  `stale-interaction` 丟掉，不會重新瞄準換上來的畫面。
- **re-entrancy** — accepted 的 dispatch 執行期間（包含 async handler 尚未 settle）進來的手勢回
  `busy`。這不是 cooldown，它由 action 自己撐開、action 一結束就放開，沒有任何 timer。

沒有 debounce/throttle 是刻意的：真實 recognizer 的 frame rate 與 hold duration 還不知道，時間窗
要等 Gesture Input Adapter 那一層再定，現在訂等於對著空氣訂。

## Touch 仍然完全保留

這一版不是把網站變成 gesture-only。手機／桌面的 tap、click 全部照舊，因為 contract 註冊的就是畫面
自己原本那個 handler——同一個 function object，不是複製一份劇情邏輯。

## 三語行為一致

中文／英文／日文只差文字。geometry 與 LEFT/RIGHT mapping 都宣告在 component 上，跟語系無關；同一個
story node 在三語下是同一個 `surfaceId`、同一個 semantic choice。

## 工具分工

| 指令 | 負責 |
| --- | --- |
| `npm run audit:ar-interactions` | source 層的互動風險盤點 |
| `npm run test:ar-interactions` | 上面那份盤點的回歸守門 |
| `npm run test:gesture-contract` | contract engine 本身的正確性 |
| `npm run test:gesture-bridge` | 一個 event 進來，最多跑一個 action |
| `npm run test:ar-interaction-migration` | 五情境是否已全面接線 |
| `npm run audit:ar-gestures` | 五情境 ZERO／ONE／TWO_ACTION 盤點（本文件的表） |
| `npm run test:ar-dual-visual-order` | LEFT 是不是玩家看到的左邊那顆 |
| `npm run test:ar-gesture-action-rules` | 全站規則本身的驗收測試 |

## 不在這一支範圍內

Android ToF recognizer、camera、MJPEG、`__jorjinCamera`、MindAR／圖片辨識、五張 target、手勢教學頁、
語言選擇流程、Android packaging、離線 APK、劇情文案、UI 美化——全部未更動。
