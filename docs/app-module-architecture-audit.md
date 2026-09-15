# CIBAR 模擬 App 模組化架構盤點

> **`OUTDATED`（2026-08-20）— 歷史稽核，已被取代。**
>
> 本盤點描述的是 App module 抽離**之前**的狀態（「幣勝客沒有模組目錄」「BlackPi screens 仍藏在 Scenario04」「MyDonDon screens 仍以 scenario05 命名」「HPE 尚無可抽出的實作」）。目前 `apps/gugo-invest`、`apps/coin-winner`、`apps/blackpi`、`apps/mydondon`、`apps/meetu`、`apps/hpe-logistics`、`apps/line` 七個模組都已存在並由 `validate:boundaries` 把關。
>
> 其中 **§2 的 Ownership 判準（App owns / Scenario owns / 邊界 API）仍然有效**，並已被 `CIBAR-Technical-Specification.md` §2.4 與 §3 採用為正式原則。尚未達成該契約的部分（App 仍 import Scenario store、Coin Winner 樣式仍在全域）見 `CIBAR-Technical-Specification.md` §13 Architecture Debt。

> 盤點基準：`docs/app-module-architecture-audit` branch 建立時的 `9ae5b32`。本文件只描述邊界與遷移順序；本輪不移動程式、路由或素材。  
> 正式範圍：GuGo Invest／股購投資、幣勝客、BlackPi／黑皮購物、MyDonDon／買東東、HPE／黑皮通。

## 1. 結論摘要

目前五個品牌並不是五個對等模組：

* **GuGo Invest** 是獨立的 TypeScript + Vite SPA，由 Scenario01 以 iframe 載入；Scenario01 另外保留了接續劇情用的 GuGo 風格 UI。
* **幣勝客** 沒有模組目錄，投資平台 UI、資料與平台狀態散在 `pages/scenario02`、`lib/scenario02Store.js` 與全域 CSS；同一情境還混有 MeetU 交友 App。
* **BlackPi** 已有 `components/blackpi`、`styles/blackpi.css` 這兩個準模組，但 screens、商品資料、平台狀態、導覽與大量品牌文案仍藏在 Scenario04。
* **MyDonDon** 的元件、品牌 registry 與 assets 已有初步分層，但 screens、CSS、商品資料和 app state 仍以 `scenario05`／`ghostorder` 命名。
* **HPE** 尚無可直接抽出的單一實作。Scenario04 有「黑皮購物內建退貨物流」但沒有 HPE 品牌；Scenario05 有另一套名為「速取便」的交易／物流網站及假的客服網站。Scenario05 目錄雖存有 `hpe-*` 圖檔，現行程式未使用。**兩套不可互相覆蓋，且在產品命名確認前不可把速取便直接改稱 HPE。**

最大的結構性問題是 App route 與 scenario route 共用同一 URL namespace，例如 BlackPi 的首頁、分類、購物車與劇情結算都叫 `/scenario04-shopping/*`。模組化應先建立 ownership contract，再逐項抽離純 UI，不能先搬目錄再猜邊界。

## 2. Ownership 判準

### App owns

* **UI 與 layout**：品牌 shell、header、bottom nav、卡片、列表、表單、chat surface、空狀態、loading/error state。
* **brand**：名稱、色彩、字體、logo／wordmark／app icon 與品牌文案。
* **app navigation**：App 內 tab、返回、商品／訂單／帳戶等 domain route；不決定玩家下一幕劇情。
* **app components / assets**：可在不同 scenario 以 props/config 重用的元件與素材。
* **app data/state**：商品、行情、購物車、訂單、持股、帳戶、物流單等「App 在真實世界本來就會有」的 domain model；可使用 adapter persistence，但不知道詐騙分數與結局。

### Scenario owns

* **story order**：哪個 App screen 何時出現、跨 App／LINE／銀行／165 的 handoff。
* **fraud narrative**：騙徒身份、施壓話術、假連結、假客服、不可驗證報酬與退款拖延。
* **branching**：choice tree、route variant、警示觸發與結局條件。
* **education outcome / quiz**：證據盤點、風險解說、結果頁、測驗與教學回饋。
* **scenario-specific effects**：`trustScore`、`suspicionScore`、`warningFlags`、對話 checkpoint、角色 casting、動畫／通知時序等教案 runtime state。

### 邊界 API 建議

App module 不應 import `pages/scenarioXX`、scenario store 或結果元件。Scenario 用 controller/adapter 組裝 App：

```ts
type AppScreenProps<TData, TEvent> = {
  data: TData;
  onEvent(event: TEvent): void;
  locale: 'zh' | 'en' | 'jp';
};
```

例如 `BlackPiOrderDetail` 可發出 `{ type: 'request-return', orderId }`；Scenario04 controller 再決定導向退貨蒐證、寫入 warning flag 或啟動 story montage。App 不應自行知道 `/scenario04-shopping/ending/...`。

## 3. GuGo Invest／股購投資（Scenario01）

### 現況 inventory

| 類別 | 現況 |
| --- | --- |
| components | `gugo-invest/src/components/layout`（AppLayout、TopBar、PageHeader、BottomNav、OnboardingLayout）、`components/ui`（Button、Card、LanguageSwitcher、PriceChange、StockRow）、`components/charts`（AreaTrend、Donut、KLine、Sparkline）、`components/logo`（AppIcon、LogoHorizontal、LogoMark）。Scenario01 另有 `GugoLogo.jsx`。 |
| pages/screens | 獨立 App：Home、Markets、StockDetail、Portfolio、Account、onboarding/Register、InvestOffer。主站：`PlatformRegister` iframe host，及劇情用 Profit、WithdrawFail。 |
| CSS | 獨立 App 的 Tailwind import、theme/token 與少量 utilities 集中在 `gugo-invest/src/index.css`；主站 `global.css` 另有 iframe host 和 GuGo 風格 Profit/withdraw UI，已形成視覺重複。 |
| assets/logo/icons | `gugo-invest/public/logos/logo-{zh,en,jp}.png`、`favicon.svg`；主站 public 又有相同三語 logo。icon 大多為 `lucide-react`，LogoMark/AppIcon 為程式 SVG。 |
| store/hooks | `AppStoreContext` + `useAppStore` + `usePortfolioSummary`，localStorage key `gugo-invest-app-state`；i18next language detector 另存 `gugo-invest-language`。無獨立 hooks 目錄。 |
| data | `data/stocks.ts`、`klineGenerator.ts`，以及 stock/trade types、format utility、三語 JSON。行情與 K 線皆為模擬資料。 |
| navigation | 自己的 React Router：onboarding、home、markets、stock detail、portfolio、account；BottomNav 屬 App。Scenario01 透過 query `lang`、`route=/portfolio` 與 iframe footer 控制跨邊界流程。 |
| app-specific state | onboarding 完成、現金、持股、交易／量化配置、模擬市場資料，應由 GuGo module 擁有。 |
| scenario-specific logic | 老師／VIP 詐騙鋪陳、何時開啟 GuGo、固定投入金額的教案意義、iframe 之後的假收益、出金失敗、追加保證金、AI/165、quiz/ending，應留 Scenario01。 |

### 歷史特例與 standalone 判斷

Git 歷史顯示 GuGo 是為「build/deploy 並由 Scenario01 嵌入」後加入，之後才逐步補完整註冊、量化配置與投資頁面。現行特例包括：

1. 第二套 package/lockfile、React Router、i18next、TypeScript 與 Vite config。
2. production base 固定為 `/CIBAR/gugo-invest/dist/`，部署流程要獨立 build 再拷貝產物。
3. iframe 隔離 CSS/runtime；語言由主站 `zh` 映射成 `zh-TW` query；狀態無 shared context，只靠子 App localStorage。
4. Scenario01 的 `Profit`／`WithdrawFail` 沒在子 App 內，卻複製 GuGo 品牌外觀，因此「App 結束、scenario 恢復」的界線只靠 iframe footer。
5. React/Vite/lucide patch versions 與主站不同，且 GuGo 額外依賴 charts、i18next、Tailwind；這是部署隔離造成的成本，不是 domain 必要性。

**是否真的需要 standalone build：目前需要維持相容，但長期不需要。** 現行 URL、GitHub Pages base、iframe handoff 與 persistence 都依賴 standalone artifact，現在直接取消會破壞部署及既有 session；然而程式沒有跨 origin、安全 sandbox、獨立發布節奏或後端等必須使用 iframe 的需求。React 版本相容，UI/state 也能以 provider + nested routes 形式裝入主站。

**可統一為 App Module。** 建議先讓 GuGo export `GuGoAppRoutes`、`GuGoProvider`、`GuGoScreen` 與 storage adapter，再在主站做 in-process integration spike；確認 charts bundle、CSS scope、query/deep-link、reset 和三語後才移除 standalone build。本輪保留 `gugo-invest/` 原位且不改 iframe。

## 4. 幣勝客（Scenario02）

### 是否散在 Scenario02

是。沒有 `components/coin-winner`、品牌 data 或專屬 stylesheet；相關 UI 全在 `pages/scenario02`，style 在 `global.css` 的 `bition-*` selectors，平台狀態又只是 `scenario02Store.js` 的一部分。要注意 Scenario02 同時包含 **MeetU 交友 App、LINE 式私聊、幣勝客平台、警示／結果／quiz**，不能把整個目錄都視為幣勝客。

### 應歸 App 的項目

* **Screens**：PlatformLanding、PlatformRegister、PlatformHome、DepositPage、TradingPage、WithdrawalPage；若 GuaranteePage 是平台內「保證金付款」surface，外殼歸 App、詐騙要求與 block warning 歸 scenario。
* **Components/layout**：`bition-*` masthead/logo、asset dashboard、chart/market rows、deposit/withdraw forms、transaction list、platform cards/buttons。
* **CSS/brand**：`global.css` 中 `bition-*`／平台相關 selectors；「幣勝客 / BITION」文字、配色與未來的 logo/icon registry。目前 logo 是文字 lockup，未發現獨立圖檔或 App icon，應列為 asset gap，不應自行生成替代圖。
* **Data**：假幣資產、ticker、market trend、balance/transaction domain fixtures。現有多數直接寫在 screen 常數內，應先搬到 typed fixture。
* **Store/hooks**：`DEFAULT_PLATFORM_STATE`、`get/save/usePlatformState` 中的 registered、balance、deposits、withdrawal/trading domain state。
* **Navigation**：landing → register → home，以及 platform 內 deposit/trade/withdraw 的 app nav。

### 應留 Scenario02

Emily/MeetU/PrivateChat 全部、對方引導開平台的順序、首次入金與追加入金抉擇、民宿／感情承諾、保證金話術、`DepositWarning`／`TopupWarning`、RiskAnalysis、quiz、results/endings；`saveScenario02Progress`、dating cast/checkpoint/decision；以及 platform state 中若存在的「是否服從騙徒」「結局」欄位。Scenario controller 應以 commands（credit fake return、reject withdrawal 等）驅動 App fixture，而不是讓 App store保存 narrative branch。

## 5. BlackPi／黑皮購物（Scenario04）

### 藏在 Scenario04 的 UI

* **已半抽離 components**：AssetImage、BottomNav、PhoneShell、ProductCard、CompactProductRow、ChatScreen、Toast、Placeholder；DialogueChoiceGrid、ClaimVsActual、EvidenceMiniChecklist、DebugPanel 則偏 scenario/education，不應全部放進 App module。
* **純 App screens（優先抽）**：Splash、Home、Search、SearchResults、ProductDetail、Cart、Checkout、PaymentSuccess、Orders、OrderDetail、Messages、Category、Me。
* **可拆 shell 與 story 的 screens**：SellerChat、DisputeChat、ReturnRequest、ReturnEvidence、ReturnShipping、ReturnLogistics、RefundCenter、PlatformSupportChat。聊天／退貨／物流 UI 可歸 App，具體 dialogue tree、保存證據得分、退款拖延與失聯跳轉歸 Scenario04。
* **純 scenario/education screens**：SimPhoneHome（scenario handoff）、Unboxing 的分支/蒙太奇、RefundDelayChat 的詐騙節奏、EvidenceCenter、165 landing/call、ReportPrep、OutcomeResult、Ending。

### 其他 inventory

| 類別 | 現況與 ownership |
| --- | --- |
| CSS | `styles/blackpi.css` 462 行，`bp-*` 同時包含 App shell/card/nav/product/order 和 165、evidence、result 等 scenario selectors；需按 ownership 拆檔，不只搬整檔。 |
| assets | `public/assets/scenarios/scenario-04` 的兩條商品線圖片、decor SVG、unboxing/actual/review/package 圖。商品圖可成為 BlackPi demo catalog fixture；「貨不對版」actual/unboxed 與結果熊圖是 narrative/education assets。 |
| logo/icons | 現行 logo 是 Home 內 ShoppingBag icon + 文字「黑皮購物」，未發現正式 BlackPi logo/app icon 檔；lucide icons 散在頁面。需先建立 brand manifest，不能把 HPE/MyDonDon logo 代用。 |
| store/hooks | `shoppingStore.js` 混合 cart/order/return（App）和 scores、warningFlags、evidence、dialogue checkpoints、route branch（Scenario）。`useToast` 可共用；shopping dialogue engine 屬 Scenario04。 |
| data | `products.js` 含 catalog/domain 與兩條詐騙線線索；`scenarioConfig.js`、dialogueTrees、warnings 是 scenario。建議 catalog fixture 和 `Scenario04ProductClaims` 分開。 |
| navigation | BottomNav 的 home/category/messages/orders/me 是 App；所有 `/scenario04-shopping/...` route 現由中央 `routes.jsx` 宣告，包含 App nav 與 story transition。 |
| app-specific state | cart、selected product、order/payment/delivery/return record、platform ticket、會員偏好。 |
| scenario-specific state | selected fraud route (`health` legacy key / `luckyBag`)、scores、warning flags、evidence score/completeness、dialogue history/checkpoint、seller unreachable、165/outcome。 |

## 6. MyDonDon／買東東（Scenario05）

### 藏在 Scenario05 的 UI

* **已半抽離 components**：MyDonDonHeader、MyDonDonBottomNav、MyDonDonLogo、ChatScreen、Avatar、ProductPhoto、PhoneShell。`BrowserChrome` 是跨 website shell；`SuqubianSiteHeader` 是物流服務而非 MyDonDon；`CsChatSurface` 是假客服；`CibarResultBar` 是教育 UI。
* **純 App screens**：ProductSelect、Listing；BuyerChat 的 MyDonDon header/chat composer/message rendering 可歸 App，但 dialogue timeline/choices 不可。
* **非 MyDonDon**：OrderDetail、ShopCreate、ShopSelfCheck、TradeInfo 顯示 `suqubian.tw`「速取便」網站；CsChat 是仿冒客服網站；BankVerify 是銀行模擬。
* **純 scenario/education**：EndingCaught、EndingScammed、Reveal、Quiz、QuizResult。

### 其他 inventory

| 類別 | 現況與 ownership |
| --- | --- |
| CSS | `styles/ghostorder.css` 477 行，以 `.go-ctx-mydondon`、`.go-ctx-suqubian`、`.go-ctx-fakecs`、bank/CIBAR contexts 同檔隔離。設計已有正確的視覺邊界，但檔案 ownership 尚未分離。 |
| assets | `src/assets/scenarios/scenario-05/images` 含 tablet/stroller、六個 MyDonDon logo variant、兩個 `hpe-*`。前兩類可移入 MyDonDon catalog/brand；結果熊圖留 scenario。HPE 圖目前未被 brand registry 或 JSX import。 |
| logo/icons | `scenario05Brand.js` 用 glob 建立 MYDONDON/MYDONDON_LOGOS，MyDonDonLogo 有文字 fallback；icon 主要是 lucide。這個 registry 可直接成為 module brand contract。 |
| store/hooks | `scenario05Store.js` 混合 selectedProduct（App）、buyer/cast、choices、ticket/order IDs、dialogue checkpoint、ending（Scenario）。ghostorder dialogue engine 是 Scenario05。 |
| data | `scenario05Products.js` 是 App catalog fixture；`scenario05Brand.js` 是 App brand；characters/dialogues 是 scenario；OrderDetailText 是「速取便」UI copy，待 HPE 決策後歸 logistics module 或 scenario fixture。 |
| navigation | MyDonDon bottom nav 是 App，但目前大多為展示；中央 routes 把 MyDonDon → 速取便 → fake CS → bank → ending 串成 scenario order。 |
| app-specific state | 商品草稿、上架狀態、MyDonDon thread/unread（若未來實作）。 |
| scenario-specific state | 隨機買家、話術節點、玩家 choices、假 order/ticket ID、官方自查或點假客服、銀行操作、caught/scammed outcome、quiz。 |

## 7. HPE／黑皮通：Scenario04 與 Scenario05 對照

### 功能矩陣（現況，不把名稱相近視為同一產品）

| 能力 | Scenario04 | Scenario05 |
| --- | --- | --- |
| 物流 UI | 有，BlackPi 訂單進度、退貨寄件、退貨物流 | 有，`速取便` 建立賣場／交易服務外殼；主要是交易導流而非完整追蹤頁 |
| 物流 logo | 無獨立 HPE logo；使用 BlackPi 品牌/Truck icons | `SuqubianSiteHeader` 是文字 wordmark；目錄有 `hpe-logo-horizontal.webp` 但未使用 |
| 查件 | 有 order/return status 與「查看最新物流」 | 有交易異常詳情與 HPE 格式 order id；沒有一般 parcel lookup/search screen |
| 配送狀態 | 有 preparing/shipped/shipping/delivered，以及 return picked-up/in-transit/received | 僅文案表示付款與物流一起處理、超商取貨；沒有完整配送狀態 timeline |
| 退貨 | 完整申請、證據、寄件編號、簽收、退款追蹤 | 無退貨流程 |
| 物流卡片 | 有 order timeline、return cards | MyDonDon chat 內有「速取便訂單通知」quoted card 與交易異常 card |
| 物流 icon | lucide Truck/PackageCheck 等 | 目錄有 `hpe-delivery-icon.webp` 但未使用；現行 UI 使用一般 icons/CSS |
| 客服 | BlackPi platform support 與賣家 chat；是購物平台客服 | 有「速取便線上客服」連結，但落到 phishing `service-suqubian-tw.com` 的假客服；官方頁只提供安全提醒 |

### 可共享的 HPE UI（目標候選，不代表現況已共享）

前提是產品方先確認 **HPE／黑皮通是否等同現行「速取便」**、以及 BlackPi 的承運商是否也是 HPE。確認後才可建立：

* `HpeBrand`（正式名稱、三語名稱、logo、delivery icon、色彩）；
* `HpeBrowserShell`／header；
* `ShipmentCard`、`TrackingTimeline`、`TrackingLookup`；
* `DeliveryStatusBadge`、tracking/order number formatter；
* `ReturnShipmentCard`（接受 return model，不包含退款詐騙判斷）；
* `OfficialSupportEntry`（只接受受信任 URL/contact，不渲染 scenario 假站）。

### Scenario04-specific logic

商品貨不對版、兩商品 route、是否先留開箱證據、退貨申請附件、賣家簽收後拖延退款、平台介入、失聯、165、證據 completeness 與結局。即使改用 HPE tracking UI，這些 effect 與順序仍留 Scenario04；BlackPi order/refund 狀態透過 adapter 映射到 HPE shipment props。

### Scenario05-specific logic

假買家要求改用第三方交易物流、官方頁自查分支、偽造訂單失敗卡、相似網域、假「安全收款認證」客服、轉去銀行與 caught/scammed 結局。假的客服 surface 應留 Scenario05，最多以 HPE design tokens 製作刻意相似的 `FakeHpeSupportFixture`，絕不能 export 成 HPE 官方客服元件。

### 不覆蓋原則與待確認事項

1. 保留 Scenario04 的完整 reverse-logistics model；不要用 Scenario05 較薄的交易頁取代。
2. 保留 Scenario05 的 official/fake domain 對比；不要用 Scenario04 黑皮客服取代假客服劇情。
3. `hpe-*` assets 在命名、內容與品牌核准完成前標記為 **orphaned candidate assets**，不因檔名直接接線。
4. 若「速取便」不是 HPE，則它應成為 scenario-only fictional service，HPE module 需另建；若是舊稱，應先用 alias/deprecation mapping 遷移 i18n 和 URL，不做全文硬改。

## 8. Target architecture

依現行主站以 `webapp/src` 為 runtime root，建議：

```text
webapp/src/
├── apps/
│   ├── gugo-invest/          # 最後遷入；初期可只放 integration contract
│   │   ├── brand/ components/ screens/ data/ state/ routes/
│   ├── coin-winner/
│   │   ├── brand/ components/ screens/ data/ state/ routes/
│   ├── blackpi/
│   │   ├── brand/ components/ screens/ data/ state/ routes/
│   ├── mydondon/
│   │   ├── brand/ components/ screens/ data/ state/ routes/
│   └── hpe-logistics/
│       ├── brand/ components/ screens/ data/ state/ routes/
├── scenarios/
│   ├── scenario01-investment/
│   │   ├── controller/ story/ effects/ quiz/ outcomes/ fixtures/
│   ├── scenario02-romance/
│   ├── scenario04-shopping/
│   └── scenario05-ghost-order/
├── shared/
│   ├── ui/ phone/ browser/ i18n/ persistence/ feedback/
└── routes.jsx                # 只 compose app route groups + scenario routes
```

每個 App root 應 export 公開 barrel，scenario 不得 deep-import 私有檔。assets 應跟 ownership colocate（例如 `apps/mydondon/brand/assets`）；只有 scenario results、角色、詐騙商品實收照留 `scenarios/.../assets`。`public/assets/scenarios` 中需 runtime URL 的大型媒體可暫留，但以 manifest 表達 owner，避免第二次 asset cleanup 前搬動實體檔。

### State 分層

```text
App domain state       cart / order / listing / portfolio / shipment
Scenario runtime       currentNode / choices / warningFlags / outcome / cast
Integration adapter    maps scenario commands/events to App state; owns reset policy
Session/platform       locale / location / sound / shell (shared)
```

localStorage key 可先保持不變以免破壞既有資料；抽 module 時加 versioned adapter，而不是在元件中直接改 key。route 也先提供 compatibility aliases，再逐步由 `/scenarioXX-*` 轉為 module route group。

## 9. Migration order

1. **先定 contract 與測試護欄**：建立 App/Scenario ownership lint rule（至少禁止 `apps/**` import `scenarios/**`）、route inventory、storage snapshot、三語 smoke tests。零 UI 搬移。
2. **MyDonDon brand + primitives**：現有 registry、logo、header、bottom nav、ProductPhoto 邊界最清楚；先改命名 `ghostorder` → module imports，但保留 compatibility re-export。
3. **BlackPi primitives + catalog**：搬既有 `components/blackpi` 的純 App 部分與 `blackpi.css` App selectors；把 ClaimVsActual/Evidence/Debug 留 Scenario04。接著拆 catalog 與 fraud claims。
4. **幣勝客**：先建立缺少的 brand manifest/token，再抽 platform shell/screens/domain store；不要夾帶 MeetU 或 romance story。這一步可驗證「從 scenario 頁面抽出 App」的標準流程。
5. **HPE discovery + additive module**：產品確認 HPE/速取便關係後，以新的 shared interfaces 同時包住 Scenario04 tracking 與 Scenario05 official-site UI；先 adapter，不合併 state machine，不刪任何一套。補完 logo/icon 使用與 accessibility 後才遷 assets。
6. **Scenario04/05 controllers**：routes 改由 controllers 接 App events，將 dialogue/effects/outcomes 從 app screens 清出；維持舊 URL redirect 和 storage adapters。
7. **GuGo integration spike**：在不刪 standalone 的前提下試做 in-process route/provider、CSS scope、lazy-loaded charts、language/reset bridge；對照 iframe 版本做 visual/flow regression。
8. **GuGo 最後切換**：只有部署、deep link、refresh、portfolio persistence、三語及 Scenario01 全流程皆通過後，才把 `gugo-invest` 轉為 `apps/gugo-invest` 並移除第二個 build。若 bundle 或部署條件不允許，可長期保留 standalone，但仍使用同一 App contract。
9. **收尾**：移除 compatibility re-export、dead selectors、orphan assets 與舊 route；更新技術規格及 asset ownership index。

## 10. 驗收條件與風險清單

* 五個 App 都有 brand manifest、公開 component API、domain state schema、route group 與 asset owner。
* App module 不含 scenario number、詐騙分數、quiz、165 或 outcome navigation。
* Scenario01/02/04/05 原有 story order、所有分支、教育結果和三語不變。
* Scenario04 與 Scenario05 的物流流程可同時存在，測試明確覆蓋兩套；HPE migration 不以 snapshot 更新掩蓋差異。
* GuGo iframe 在正式切換前保持可建置；切換後仍保留 rollback window。
* 風險最高項依序是：HPE 品牌語意未決、混合 store 拆分、中央 routes deep links、CSS selector leakage、localStorage reset、GuGo Pages base/iframe handoff。

