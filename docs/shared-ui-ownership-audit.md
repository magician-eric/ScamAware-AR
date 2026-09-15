# Shared UI ownership audit

> **2026-08-20 重新掃描結果**（以 `main` 實際程式為準）：
>
> - **仍有效**：`apps/line` 擁有完整 LINE 對話外殼，S01（直接＋群組）、S02（PrivateChat）、S03（LineAdd／LineIntro／LineCustody 經 `ScriptedLineConversation`）皆委派給 `LineConversation`；`validate:line` 持續把關。
> - **仍有效**：警示共用 `FraudWarningBanner`；S05 的 MyDonDon 結果條仍屬該產品流程，未併入共用結算。
> - **已擴大（本文原未記載）**：`FraudOutcomeResult` 現在是 S01–S04 共同的結算元件，S03 以 `embedded` + `theme="authority"` 內嵌在 `PoliceFrame` 內。
> - **新增共用（MISSING IN DOC）**：`components/ui/ScenarioEntryBriefing.jsx`（五情境共用 Briefing）與 `components/ui/ScenarioFinalDecision.jsx`（五情境共用「反詐小測驗」，單題三選項、回 `/ar-scan`）。
> - **PARTIAL**：本文列為 follow-up 的「中性手機桌面外殼」已建立為 `src/shared/phone/PhoneHome.jsx`，但目前**只有 Scenario 05（MyDonDon）使用**；S02 `PhoneDesktop`、S03 `PhoneHome`、S04 `SimPhoneHome` 仍各自實作。
> - **已解決（2026-08-21，§13 AD-07）**：`components/ghostorder/*`（`BrowserChrome`／`SuqubianSiteHeader`／`CibarResultBar`）確認 consumer 全在 Scenario 05，整組移至 `pages/scenario05/components/`，`components/ghostorder/` 已刪除；同批把只有 S03 `PoliceFrame` 使用的 `components/ui/PhoneShell` 移至 `pages/scenario03/components/`。`SuqubianSiteHeader` 的命名與現行 SafeDeal 品牌不一致仍未處理（見 `CIBAR-Technical-Specification.md` §13 AD-18）。

## LINE

Before this change, Scenario 01 used the shared `LineHeader`, incoming/outgoing bubbles, typing indicator, quick replies, and system-message primitives, but assembled both direct and VIP-group shells locally. Scenario 02's only actual LINE screen is `PrivateChat` (MeetU chats are not LINE); it used the same primitives while assembling its shell locally. Scenario 03 used shared header/bubble/typing primitives, but `components/LineChat.jsx` still owned the conversation DOM, a separate `pol-line-footer`, the choice placement, and disabled header actions.

`apps/line` now owns the complete conversation shell, body/scroll geometry, standard direct/group header, actions, transcript mapping, timestamps/read presentation, typing, quick-reply and footer slots, and LINE CSS. All three scenarios delegate to `LineConversation`. Scenario 03 retains only a scripted-player data adapter, choice behavior, and the neutral `pol-line-card-slot` containing its case/status/custody story cards. `LineAdd` remains scenario-owned because no other scenario has the same friend-request flow; it reuses `LineAvatar`, and extracting a one-consumer profile abstraction would not create meaningful product reuse.

## Other products and system surfaces

The audit found these already-correct shared owners:

- Result/ending outcome presentation is shared through `FraudOutcomeResult` across Scenarios 01–04. Scenario 05's MyDonDon result bar belongs to that product flow and should not be merged merely because it is an ending.
- Warning banners are shared through `FraudWarningBanner`; scenario adapters retain story triggers and copy.
- Scenario 05 browser pages consistently share one `BrowserChrome` because they represent the same browser/product journey. It is Scenario 05's own component (`pages/scenario05/components/BrowserChrome.jsx` since AD-07), not a shared-layer one: several pages of one scenario are still one owner.

Potential follow-ups, deliberately not changed here:

- Scenario 02 `PhoneDesktop`, Scenario 03 `PhoneHome`, and Scenario 04 `SimPhoneHome` model the same phone-system surface and merit a neutral phone-home shell audit. Their current icon sets, frame integration, and automatic navigation differ enough that merging them safely is outside a LINE-only visual change.
- Scenario 02 and Scenario 03 each implement a 165 call experience. They share a service identity but have materially different narrative forms (modal intervention versus full scripted call). A future shared call chrome could own keypad/call controls while keeping scripts local.
- Browser-like chrome outside Scenario 05 should be inventoried against `BrowserChrome` before reuse; visual similarity alone is insufficient when a page is an in-app webview rather than the same browser.
- Generic chat primitives across MeetU, marketplace, support, and LINE should remain product-owned. They are similar patterns, not the same app, so consolidating their visual chrome would weaken ownership.

No app module imports a scenario, and no scenario imports another scenario. No binary assets are part of this change.
