# CIB 防詐風險提醒 Design System

> Status: **Normative / Source of Truth**
>
> Scope: Scenario 01–05 的未來 Warning 呈現；本文件不授權變更現有 runtime。
>
> Companion specs: [Behavior Contract](./CIB-Warning-Behavior-Contract.md)、[Warning Matrix](./CIB-Warning-Matrix.md)、[State Spec](./CIB-Warning-State-Spec.md)、[Implementation Gaps](./CIB-Warning-Implementation-Gaps.md)。

## 1. 統一決議：Warning 不是流程 CTA

Design System 原先的「Primary CTA = 安全行動、Secondary CTA = 繼續體驗」應解讀為**整個 scenario 畫面的行動層級**，不可解讀成 Warning 卡片內的按鈕。Warning observes the scenario; it does not control the scenario.

Warning 本身只呈現風險資訊，固定五層資訊結構如下：

1. **Title**：辨識這是一則防詐提醒。
2. **Current risk**：指出使用者此刻看到的具體風險。
3. **Why dangerous**：解釋詐騙手法與後果。
4. **Memory point**：一條可帶走、可複述的辨識原則。
5. **Safe-action guidance**：用文字建議安全行動；不是 navigation、scenario action 或 CTA。

原 Scenario 畫面既有的「撥打 165、停止操作、取消、離開、繼續、確認轉帳、確認入金」等 Choice / CTA，才是流程的 interactive control。安全選項在 scenario 層級應優先於繼續體驗選項，但 Warning **不得新增第二套重複按鈕**。

## 2. 核心原則

- **統一結構，分裂外觀**：五層資訊與行為一致，外觀依平台變體調整。
- **資訊架構一致**：不可省略或任意換序；短文案也要保持五個語意欄位。
- **視覺層級一致**：Title → Current risk → Why dangerous → Memory point → Safe-action guidance。
- **安全行動 hierarchy 一致**：建議清楚可掃讀；真正的安全操作仍由 scenario 的 Choice / CTA 提供。
- **外觀跟隨平台**：沿用當下 Scenario 的字體、surface、radius、shadow 與品牌 token。
- **不破壞沉浸感**：頂部浮動、覆蓋而不推動版面；下方情境保持可見、持續運作。
- **拒絕教材感**：用當下事件與平台語彙說明，不做全螢幕講義、長篇條列或測驗式中斷。
- **危險色是語意，不是品牌**：僅標示 icon、色條、關鍵字或細框，不取代平台主色。

## 3. Anatomy 與 Typography

| Layer | 樣式基準 | 文案原則 |
|---|---|---|
| Title | 15–17 px、700–800、line-height 1.25 | 1 行為佳，最多 2 行；明確命名風險 |
| Current risk | 13–15 px、600–700、line-height 1.45–1.55 | 描述「現在發生什麼」，避免泛稱 |
| Why dangerous | 13–15 px、400–500、line-height 1.5–1.65 | 原因與可能後果各一個焦點 |
| Memory point | 13–15 px、700–800、line-height 1.45–1.55 | 一句可記憶規則；可用淡色 surface 或短色條強調 |
| Action guidance | 13–15 px、500–700、line-height 1.45–1.6 | 使用動詞文字提出建議；不得呈現成流程按鈕 |

字體必須繼承 Variant 所在 Scenario 的既有 font stack；不得為 Warning 載入新字型。中文避免小於 13 px，放大文字時允許卡片增高與內容捲動，不得截斷安全建議。

## 4. Spacing

- **Container padding**：手機 14–16 px；較寬 viewport 16–20 px。
- **Line height**：標題 1.25；正文 1.5（允許 1.45–1.65）；不可用緊密跑馬燈承載五層內容。
- **Title / icon spacing**：icon 與文字區 8–12 px；頂端對齊，避免 icon 隨全文垂直置中。
- **Content spacing**：相鄰資訊層 6–8 px；Memory point 前可用 10–12 px 建立段落；卡片與 viewport 邊緣至少 12 px，並計入 safe area。
- 展開寬度以平台內容寬為上限；建議 `min(viewport - 24px, 456px)`。不得因 Warning 改變底層 flex/grid 尺寸。

## 5. Icon

- 使用既有 icon library 的 **TriangleAlert / 三角警示 icon**，不另製品牌圖示。
- 展開態 20–24 px；Pill 14–16 px。
- 每一個 Warning 容器只出現一次；Memory point 與 guidance 不重複放警示 icon。
- 展開態置於 Title 左側並頂端對齊；Pill 置於文字左側。
- 裝飾 icon 應 `aria-hidden`；可存取名稱由容器文字或 Pill label 提供。

## 6. Border 與 danger emphasis

- **一般風險**：平台 surface + 1 px 低對比 border；不要讓警示看似另一個 App。
- **高風險 / 關鍵金流**：使用 4–7 px 左側 danger 色條；可搭配低透明度 danger tint。
- **Border** 適合淺色、卡片型平台；**左側色條**適合需要快速辨識但仍要保留平台背景的高風險時刻。兩者並用時，外框須保持低對比。
- Danger color 只用於 icon、左側色條、細框、Title/關鍵詞與極淡 tint；正文維持平台 ink token，以確保可讀性。
- **禁止大面積純紅**、全螢幕紅底、持續閃爍、紅色遮罩或以紅色取代品牌 surface。
- `severity: block` 是 registry 的風險等級相容值，不表示 UI 可以阻擋操作。

## 7. Platform Variants

所有 token 均引用現有 Scenario；下列名稱是來源而非新增 token。實作前若 token 改名，應映射至同一平台語意，不可重新發明品牌色。

### 7.1 Chat / Messaging

對應 MeetU、LINE、私人聊天。

- **Placement**：聊天 header 下方的 viewport 頂部浮層；不可插入 message list。
- **Container**：聊天卡片 / system notice 質感，使用現有淺色 surface、圓角與陰影。
- **Danger emphasis**：TriangleAlert + 窄色條；風險色只做語意提示。
- **Typography adjustment**：配合聊天密度，Title 15–16 px、正文 13–14 px。
- **Border**：1 px platform line；高風險加左側色條。
- **Brand token**：MeetU 引用 `--meetu-primary`, `--meetu-card`, `--meetu-text`, `--meetu-line`, `--meetu-font`；LINE 引用現有白色 header、聊天背景與訊息 ink，不把 LINE 綠誤作 danger。
- **Collapse state**：靠右頂部，保持 header 與最新訊息可見。
- **Pill style**：聊天 system pill；平台 surface、細框、完整標籤 `⚠ 防詐提醒`。

### 7.2 Investment / Crypto

對應幣勝客、入金、出金、假投資平台。

- **Placement**：平台 header 下方頂部浮動，不覆蓋主要資產標題或固定 navigation。
- **Container**：沿用 BITION 深色 surface 與既有 shadow/radius。
- **Danger emphasis**：danger 左色條、icon 與關鍵金額文字；不使用整卡紅底。
- **Typography adjustment**：Title 15–17 px；數字維持平台 tabular/financial treatment，正文 13–14 px。
- **Border**：深色 surface 上使用半透明 platform line，高風險加 5–7 px 色條。
- **Brand token**：引用 `.bition-*` 現有 `#050d1c` surface、`#eef6ff` ink、`#25d0ff` accent 與既有 danger token；cyan 是品牌/狀態色，不是 danger。
- **Collapse state**：右上、資產內容之上浮動，不改變圖表或 countdown 尺寸。
- **Pill style**：深色 platform surface + danger 細框；不用交易 CTA 樣式。

### 7.3 Shopping / Marketplace

對應黑皮購物、商品頁、買賣家對話、假客服。

- **Placement**：商城 header / chat header 下方浮動；不插入商品 grid、訂單或對話 flow。
- **Container**：白色 marketplace card，沿用 BlackPi radius/shadow。
- **Danger emphasis**：`--bp-error` 用於 icon、色條或關鍵詞；`--bp-warning` 僅用於較低風險提示。
- **Typography adjustment**：繼承 `--bp-font`；Title 15–16 px、正文 13–14 px。
- **Border**：`--bp-border` 外框；高風險 `--bp-error` 左色條。
- **Brand token**：`--bp-primary`, `--bp-primary-dark`, `--bp-bg`, `--bp-surface`, `--bp-border`, `--bp-text`, `--bp-error`, `--bp-font`。
- **Collapse state**：header 下方靠右，底層商品/Choice 仍可捲動及點擊。
- **Pill style**：`--bp-surface`、pill radius、`--bp-error` 細框；不使用主購買按鈕的 teal fill。

### 7.4 Banking / Payment

對應銀行 App、ATM、金流驗證、無卡提款、轉帳。

- **Placement**：銀行/支付 header 下方頂部浮動，避開 OS safe area。
- **Container**：沿用當下銀行或 Ghost Order 深色/淺色金融 surface；必須與付款表單分層。
- **Danger emphasis**：最高可見度的左色條及 Title 關鍵詞，但保持底層「取消／確認」並列可見。
- **Typography adjustment**：Title 16–17 px、正文 13–15 px；帳號或金額不可由 Warning 偽裝成可編輯欄位。
- **Border**：1 px 金融平台 border + 5–7 px danger 色條。
- **Brand token**：引用 Scenario 03 的 `.bank-*` / navy tokens及 Scenario 05 `ghostorder.css` 的 `.go-bank-*` 現有 token；不可另建「CIB 銀行紅」。
- **Collapse state**：右上浮動，不能遮住或取代安全取消 Choice。
- **Pill style**：克制的 OS/security badge；surface + border，不使用 danger-filled transaction button。

### 7.5 Phone / Authority

對應假檢警、通話與 OS-style notification。

- **Placement**：safe area 下方的頂部 OS-style notification；不能蓋住通話控制或 countdown。
- **Container**：系統通知卡（適量 blur、shadow、緊湊 radius），而非警方公文或全螢幕 modal。
- **Danger emphasis**：TriangleAlert 與窄色條；避免使用會讓假檢警更具權威的徽章或官方印章。
- **Typography adjustment**：Title 15–16 px、正文 13–14 px；最多以可捲動內容容納五層資訊。
- **Border**：半透明 OS border；高風險使用 5–7 px 左色條。
- **Brand token**：引用 Scenario 03 `scenario03.css` 的 phone/navy/surface/ink tokens；danger 僅用既有 danger value。
- **Collapse state**：狀態列下方靠右；通話、字幕、timer 全部持續。
- **Pill style**：OS notification chip，標籤固定 `⚠ 防詐提醒`，不模仿通話的接聽/掛斷按鈕。

## 8. Accessibility 與內容規則

- 展開訊息使用非 modal status semantics；不得移動 focus。Pill 必須是可鍵盤操作的 button 並有重新展開名稱。
- 色彩不可成為唯一風險線索；Title、icon 與文案共同表意。
- 尊重 `prefers-reduced-motion`，停用位移但仍可短暫 fade 或直接出現。
- 文案描述可觀察事件，不宣稱 AI 已證實犯罪；避免責備使用者。
- 本規格只定義未來目標；目前差異統一記錄於 Gap Report，不在本階段修正。
