# App module migration

> **2026-08-20 重新掃描結果**：
>
> - `gugo-invest`、`coin-winner`、`blackpi`、`mydondon` 的敘述**仍與程式相符**；`routes.jsx` 確實只從各模組 public API 匯入畫面，`validate:boundaries` 掃描 304 個原始檔皆通過。
> - **OUTDATED**：下方「`apps/hpe-logistics` 為純追加、沒有 Scenario 04／05 整合與追蹤流程」已不成立。HPE 黑皮通目前實際被使用於：Scenario 04 `ReturnLogistics`（`HpeTrackingTimeline` 物流時間軸）、Scenario 05 `HpeShip`／`ShopCreate`（`HpeShell`／`HpeShipmentCard`），以及 `apps/blackpi/screens/OrderDetail`；`lib/scenario05Store.js` 亦引用其 state API。
> - **補充**：`apps/line` 亦為 App module（共用 LINE 對話外殼），本文原未列入。
> - **補充**：Scenario 05 的外部假交易網站品牌為 `SafeDeal`（`safe-deal.tw`），與 HPE（純物流）明確分離。
> - **PARTIAL**：`apps/hpe-logistics` 沒有自己的 i18n，字串由 consumer 以 `translate`／`backLabel` prop 注入，預設值為中文。

The main web application now composes simulated products through five explicit module boundaries:

- `apps/gugo-invest`: the whole GuGo Invest platform — brand, screens, charts, store, i18n and styles — plus unchanged storage keys, the reset contract, and public exports. This module is canonical: the standalone `/gugo-invest` app it came from, and the iframe adapter that used to stand in for it here, are both gone. Scenario 01 mounts the module directly, so there is no second package, Vite config or build anywhere in the repo.
- `apps/coin-winner`: the landing, registration, home, deposit, trading, and withdrawal platform screens plus its brand contract.
- `apps/blackpi`: marketplace shell and primitives, catalog, app screens, module styles, brand, and public API. Scenario 04 retains unboxing claims, evidence, dialogue, 165, reporting, outcomes, and endings.
- `apps/mydondon`: marketplace shell, brand assets, catalog, product selection/listing screens, chat UI, module styles, and public API. Scenario 05 retains the buyer narrative, Suqubian and fake-support sites, bank handoff, reveal, quiz, and endings.
- `apps/hpe-logistics`: an intentionally additive brand/base-shell/state API only. It has no Scenario 04 or Scenario 05 integration, tracking flow, shared logistics state machine, or Suqubian rename.

Existing scenario URLs and persistence keys are unchanged. `routes.jsx` imports App screens only from module public APIs. `validate:boundaries` rejects imports from an App into scenario paths and direct imports between different scenario page owners.

Root `assets`, `data`, and `icons` remain deployment output/runtime files; `webapp/public` remains the canonical public runtime asset tree. No generated root deployment files were treated as source or deleted. MyDonDon source assets moved out of the Scenario 05 asset tree; its remaining README documents the now-empty scenario image allocation.
