# Architecture / Modularization Audit

> **`OUTDATED`（2026-08-20）— 歷史稽核，已被取代。**
>
> 本報告的稽核日期為 2026-08-14，描述的是**模組化之前**的狀態（例如「`gugo-invest/` 是第二個獨立 Vite 應用、由 Scenario01 以 iframe 嵌入」「LINE 結構重複」「Character registry 是建議中的下一步」）。這些工作**都已完成**：GuGo Invest 已併入 `webapp/src/apps/gugo-invest/`、LINE 已由 `apps/line` 單一擁有、角色系統已落地於 `src/experience/characters/`。
>
> 目前的架構請以 `CIBAR-Technical-Specification.md` §2（System Architecture）與 §3（Architecture Principles）為準；仍未完成的項目見 `CIBAR-Technical-Specification.md` §13 Architecture Debt。本檔保留作為架構決策的歷史紀錄。

> Audit date: 2026-08-14  
> Scope: the React source under `webapp/`, Scenario01–Scenario05, and the standalone `gugo-invest/` application that Scenario01 embeds.  
> Method: static repository inspection only. This report does **not** refactor, rename, move, delete, or fix production code.

## Executive summary

The project is already partway toward **Shared Experience Framework + Scenario Data**, but the boundary is uneven. Scenario04 and Scenario05 have data-driven dialogue engines, durable state, branded component families, and scenario-local design systems. Scenario01 and Scenario02 are mostly page-owned scripts. Scenario03 has the richest shared session/configuration layer but a highly specialized audio/location-driven presentation. The root router is a single, explicit scene registry for all five scenarios.

The most important findings are:

1. **Do not begin with one universal `ChatScreen`.** There are at least five visually and semantically distinct surfaces: LINE, MeetU, BlackPi, MyDonDon, and the fake 速取便 support website. They can share headless behavior and small primitives, but their chrome, bubble semantics, message types, and choice placement must remain branded adapters.
2. **LINE is visually centralized but structurally duplicated.** Scenario01 `LineTeacher`/`VipGroup`, Scenario02 `PrivateChat`, and Scenario03 `LineChat` share `.line-*` CSS plus `IncomingMessage`/`OutgoingMessage`, yet repeat header and bubble assembly. A future `LineConversation` adapter can make LINE changes one-place changes without absorbing MeetU/MyDonDon.
3. **Character identity is the safest first pilot.** A registry can initially describe existing identities without changing rendering or random selection. Names, avatars, locale names, referral codes, roles, and aliases currently span JSX, i18n, stores, and asset-path constants. This is lower risk than replacing a live chat engine.
4. **Character randomization is already active and fragile.** Scenario01 and Scenario02 independently randomize the character still called `Emily` in source strings. Scenario03 independently generates officer/prosecutor identities. Scenario05 fixes Sophie but already reuses Scenario02's Sophie photo. Any registry must capture a resolved character snapshot per run, not re-roll per render.
5. **Persistence contracts are architecture, not implementation detail.** Language, location, character selections, dialogue checkpoints, route keys, return-to-chat nodes, order state, generated case data, and clocks all survive different lifetimes (`localStorage`, `sessionStorage`, IndexedDB mirror, URL params). Migration must preserve every key and payload shape until an explicit versioned migration exists.

## 1. Current Architecture

### 1.1 Repository/application boundary

- `webapp/src/main.jsx` mounts a React 19 SPA in `HashRouter`. `App.jsx` delegates entirely to `useRoutes(routes)`.
- `webapp/src/routes.jsx` is the central scene registry. Every scenario scene is a separate route beneath `AppShell`; there is no route generation from scenario data.
- `AppShell.jsx`, `StageClassContext.jsx`, and `useFitStage.js` provide a shared fixed-stage/mobile-viewport shell. Pages attach scenario-specific classes (`line-stage`, `police-stage`, `blackpi-stage`, `ghostorder-stage`) rather than owning viewport scaling.
- `gugo-invest/` is a second React/Vite application, with its own TypeScript store, i18next dictionaries, layouts, and routes. Scenario01's fake investment platform reaches/embeds that separately built experience. It is not a component subtree of `webapp` and must remain a clear integration boundary.
- Global visual ownership is currently split into `global.css` (base, Scenario01, Scenario02, LINE and shared shell), `scenario03.css`, `blackpi.css` (Scenario04), and `ghostorder.css` (Scenario05).

### 1.2 Scenario01 — fake investment

**Entry and flow.** `/scenario01-investment` renders `Briefing.jsx`. Explicit routes then lead through `Feed`, `VideoTeacher`, `LineTeacher`, `VipGroup`, the embedded platform registration/profit experience, decision/quiz pages, and stopped/scammed result pages. Navigation is page-owned `navigate()`/`Button to` wiring rather than a scenario controller.

**Pages/scenes.** The main interaction files are `Feed.jsx`, `VideoTeacher.jsx`, `LineTeacher.jsx`, `VipGroup.jsx`, `PlatformRegister.jsx`, `Profit.jsx`, `WithdrawFail.jsx`, `Quiz*.jsx`, `AiWarning02.jsx`, `Page165.jsx`, and result components. `GugoLogo.jsx` and `Scenario01ResultCard.jsx` are local presentation helpers.

**State.** There is no scenario-wide store. Most state is component-local React state. `LineTeacher` owns a bespoke async scripted/branching chat; `VipGroup` uses shared `useTypedMessages`. `useChatClock` persists chat start time in `sessionStorage`. The randomized assistant identity is also session-scoped. The embedded `gugo-invest` app owns a separate store and browser persistence.

**Language.** `scenario01/i18n.js` reads the app-wide `language` key and translates Chinese-source-string keys using `i18nEn.js`/`i18nJp.js`. It additionally replaces literal `Emily` after translation with a randomized locale-specific name.

**Assets.** Most runtime media is in `public/assets/scenarios/scenario-01`, resolved with `import.meta.env.BASE_URL`; `avatars.js` maps group senders to public asset URLs. The assistant deliberately points to Scenario02's `profiles/emily.webp`. A duplicate/bundled `src/assets/.../fbads.webp` also exists alongside public versions.

### 1.3 Scenario02 — romance scam

**Entry and flow.** `/scenario02-romance` renders `Briefing.jsx`, followed by simulated phone/MeetU browse-match-chat, LINE `PrivateChat`, fake trading pages, deposit/withdraw/top-up warnings, risk analysis, quiz, and endings. Routes are explicit and navigation remains page-owned.

**Pages/scenes.** The experience spans `PhoneDesktop`, `AppLanding`, `DatingBrowse`, `DatingMatch`, `DatingChat`, `PrivateChat`, platform pages, warning pages, quiz/result/ending pages, plus `meetu/*` branded components and local warning/avatar helpers.

**State.** `scenario02Store.js` stores progress route, resolved dating cards, Emily decision, platform mode, and a per-run randomized Emily character ID. Storage lifetimes are mixed intentionally: durable progress/card decisions use `localStorage`; run/chat state uses `sessionStorage`. Chat scripts are page-defined dialogue nodes consumed by the generic `useDialogueTree`, while `PrivateChat` also owns media-overlay and day/return behavior.

**Language.** Same Chinese-source-key dictionary pattern as Scenario01 (`i18n.js`, `i18nEn.js`, `i18nJp.js`). `getEmilyName` and referral code resolve from the persisted randomized character ID. Copy replacement depends on literal `Emily` appearing in translated values.

**Assets.** Public scenario-local folders contain MeetU brand images, Sophie/Lina/Emily profiles, chat photos, three Emily videos, and result mascots. Some original/source PNGs also remain under `src/assets/scenarios/scenario-02/images/source`.

### 1.4 Scenario03 — fake police/prosecutor

**Entry and flow.** `/scenario03-police` begins at `PhoneHome.jsx`; all Scenario03 routes are wrapped individually in `RequireLocationProfile`. Scenes simulate calls, LINE add/chat, a fake case site, prosecutor call, bank transfer and final decision, with `ending/:outcome` carrying the outcome in the URL.

**Pages/scenes.** The pages include `IncomingCall`, `CallStage1`, `LineAdd`, `LineIntro`, `CaseSite`, `ProsecutorCall`, `LineCustody`, `BankApp`, `FinalDecision`, `Hotline165`, and `Ending`. Specialized helpers include `DialogueLayer`, `ScriptedLineConversation`, `Countdown`, `HeadsUpNotification`, `PoliceFrame`, subtitles, and audio/script hooks.

**State.** `ScenarioSessionFactory.js` creates one session snapshot containing location-derived agencies, fictional officer/prosecutor names, phone/account/case numbers and deadlines, and persists it in `sessionStorage`. `scenario03Store.js` manages the current session and decision/choice history. `scenario03Dialogues.js`, `scenario03Choices.js`, and `scenario03Config.js` are substantial data/build-function layers. `useScriptPlayer` and `useScenarioAudio` coordinate timed dialogue/audio.

**Language.** Scenario03 differs architecturally: `i18n.js` contains a namespaced `STRINGS` object with functions and arrays for zh/en/JP instead of Chinese-source dictionaries. Dialogue/config builders resolve language at call time. Audio has separate base, `_en`, and `_jp` files.

**Assets.** Audio is public and scenario-local, organized by police/prosecutor and language suffix. Visual identity is largely glyph/CSS rather than portrait assets. Result mascots are public. Agency JSON is shared public data, read through the location subsystem.

### 1.5 Scenario04 — shopping/package scam

**Entry and flow.** `/scenario04-shopping` starts at `SimPhoneHome.jsx`, then enters the BlackPi app. Most routes carry a `:route` product-story key (`health` or `luckyBag`); outcome is also URL-addressable at `result/:route/:outcome`. The sequence is the largest: browse/search/product/cart, multiple seller/support chats, checkout/delivery/unboxing/returns/refund/evidence/165/report/result/ending and app-tab screens.

**Pages/scenes.** Approximately thirty page files are supported by `components/blackpi/*`, six `data/dialogueTrees/*`, products/config/asset registries, and `features/shopping/*` engines/helpers.

**State.** `shoppingStore.js` is the central durable state blob in `localStorage`, including route, order/return/refund/evidence scores/history. Each chat has a resumable `sessionStorage` checkpoint. `features/shopping/dialogueEngine.js` executes data nodes, conditions, effects, choices, typing/read delays, hubs, and checkpoints. This is presently the closest implementation to “framework + scenario data,” but it is coupled to Scenario04 speaker names, score semantics, and store APIs.

**Language.** Scenario-local Chinese-source dictionary modules (`i18n.js`, `i18nEn.js`, `i18nJp.js`) translate page JSX, dialogue-tree strings, and component copy. Chinese keys remain embedded throughout data and JSX.

**Assets.** Public scenario-local PNG/SVG assets are indexed by `assetMap.js`; product records reference those keys. BlackPi presentation is isolated in `blackpi.css`.

### 1.6 Scenario05 — ghost order / fake buyer and support

**Entry and flow.** `/scenario05-atm` starts at `ProductSelect.jsx`, then listing, ongoing MyDonDon buyer chat, order/shop/trade handoffs, fake support chat, bank verification, caught/scammed endings, reveal and quiz. Routes are explicit; dialogue data uses redirect/resume nodes to leave and return to buyer chat.

**Pages/scenes.** Page components are thin orchestration around `components/ghostorder/*`, `data/scenario05*.js`, `features/ghostorder/dialogueEngine.js`, and `scenario05Store.js`.

**State.** A durable `cibar-scenario05-state` blob holds selected product, generated IDs and awareness/outcome data; per-chat timeline/current/resume nodes live in `sessionStorage`. The dialogue engine is structurally similar to Scenario04's, but intentionally smaller and has redirect/resume semantics. Product and dialogue content are data-built by active language.

**Language.** Same dictionary strategy as Scenario01/02/04. Product objects instead contain `{zh,en,jp}` fields and are resolved by `getProduct`. Brand constants remain language-independent where required.

**Assets.** Scenario05 imports product/brand assets from `src/assets` through Vite and uses public result mascots. Sophie's registry path intentionally points to Scenario02's public profile asset rather than copying it.

### 1.7 Actual architecture differences

| Concern | S01 | S02 | S03 | S04 | S05 |
|---|---|---|---|---|---|
| Flow control | page routes + local async scripts | page routes + dialogue tree + store | session/config/script/audio builders | data dialogue engine + product route | data dialogue engine + redirects/resume |
| Persistence | minimal/session clocks | mixed local/session | generated session snapshot | durable domain state + chat checkpoints | durable domain state + chat checkpoints |
| i18n | Chinese lookup dictionaries | Chinese lookup + identity replacement | namespaced structured object | Chinese lookup dictionaries | lookup dictionaries + localized product fields |
| Chat brands | LINE | MeetU + LINE | LINE-like + phone/call | BlackPi + support/165 | MyDonDon + fake website |
| Asset loading | mostly public URL | mostly public URL | public URL/audio | public registry | Vite imports + public result/Sophie |
| Data maturity | low/medium | medium | high but specialized | high | high |

## 2. Duplicate Components

### 2.1 Chat inventory

| Surface | Primary files | Truly shared behavior | Must remain brand-specific |
|---|---|---|---|
| LINE 1:1 | `scenario01/LineTeacher.jsx`, `scenario02/PrivateChat.jsx`, `scenario03/components/LineChat.jsx`, `components/ui/Chat.jsx` | direction, row/meta placement, auto-scroll, timestamps/read receipt, typing lifecycle, message-kind dispatch | green/white bubbles, LINE header/icon layout, background, media previews, scenario-specific action footer |
| LINE group | `scenario01/VipGroup.jsx` | timeline reveal, system/date item, typing, auto-scroll, avatar | sender label/member count/group avatar and group-specific bubble row |
| MeetU | `scenario02/DatingBrowse.jsx` mini chat, `DatingChat.jsx`, `meetu/SuggestedReplies.jsx` | dialogue choices, scrolling, typing/timestamps | pink palette, MeetU header/logo, matching lifecycle and app navigation |
| BlackPi seller/support/165 | `components/blackpi/ChatScreen.jsx` plus Scenario04 chat pages | one existing in-scenario engine/surface; message dispatch; choice and checkpoint lifecycle | BlackPi header, evidence checklist, product card, shop status, score/effect semantics |
| MyDonDon buyer | `components/ghostorder/ChatScreen.jsx`, `pages/scenario05/BuyerChat.jsx` | engine timeline, scrolling, choices, typing | MyDonDon header/composer, quoted external cards, blue/grey bubble language |
| Fake support website | `components/ghostorder/CsChatSurface.jsx`, `pages/scenario05/CsChat.jsx` | same Scenario05 engine/timeline | browser chrome, masthead, ticket, sender-labeled square transcript; must not look like MyDonDon |
| Phone/call dialogue | Scenario03 `DialogueLayer`, call pages | sequencing and choice concepts only | audio/subtitles/call state; not a messenger and should not be forced into chat DOM |

The reusable concept is therefore **headless conversation state + composable primitives**, not one global visual `ChatScreen`. Scenario04 and Scenario05 engines overlap (timeline, pending choices, timeout queue, checkpoint, typing), but differ in state effects, read-status simulation, hub choices, completion, and redirect/resume. Extracting their scheduler immediately would be high risk; first document a common engine contract and add characterization tests.

### 2.2 Existing duplicates and near-duplicates

- Header markup is repeated in Scenario01 `LineTeacher` and `VipGroup`; Scenario02 `PrivateChat` and Scenario03 `LineChat` assemble the same `.line-header` vocabulary separately.
- LINE bubble markup (`.line-msg me/them`) is repeated at call sites, while row/time/read placement is already partly shared by `components/ui/Chat.jsx`.
- Typing dots are repeated as raw `<i />` triples under `.meetu-typing`, `.bp-typing`, `.md-typing`, and `.cs-typing`. Behavior is shared; theme class and accessible label differ.
- Every chat family implements the same scroll-to-bottom effect.
- `ProfileAvatar` is imported cross-scenario by Scenario01 and Scenario03 from Scenario02. Scenario05 has a second avatar implementation because its CSS/API and fixed Sophie identity differ.
- Scenario04 and Scenario05 each have a separate `PhoneShell`, `ChatScreen`, choice component, placeholder, store checkpoint code, and dialogue engine. Some shapes are parallel, but business semantics differ enough that a direct merge is unsafe.
- Quiz/ending/result implementations recur across scenarios, but content, branch inputs, mascots, scoring, and presentation vary. `FraudOutcomeResult` and warning registry/banner already represent useful shared convergence points.

### 2.3 UI primitive classification

#### A. Very suitable to extract or formalize

- `Avatar` image/fallback/loading primitive (keep branded wrappers).
- `BackButton` behavior/accessibility (icon size/style supplied by theme).
- headless `useConversationScroll`.
- headless `TypingIndicator` dot structure with class/theme slot.
- `Timestamp`/read-meta formatting and placement primitives.
- `ProgressIndicator` model (not one forced visual).
- generic `Modal`/`Toast` APIs already exist and can be adopted incrementally.
- media loading/error shell and image fallback.
- warning/outcome data contracts around existing `FraudWarningBanner` and `FraudOutcomeResult`.

#### B. Extractable with theme/slots

- `AppHeader`, `ChatHeader`, `MessageBubble`, `QuickReply`/`ChoiceButton`.
- `ConversationLayout` (header/scroll/footer slots).
- `ImageMessage`, `VideoMessage`, `SystemMessage`, link/notification cards.
- `BottomSheet`, `NotificationCard`, `WarningCard`, `QuizCard`.
- `ProductCard`: domain fields can be common, layout stays BlackPi/MyDonDon-specific.
- `PhoneShell`: safe-area/viewport frame may be shared, app/browser chrome cannot.

#### C. Not recommended to extract as a universal component

- entire MeetU matching/swipe screen.
- Scenario03 call, bank, fake case-site, audio/subtitle presentation.
- fake 速取便 `CsChatSurface` as a themed MyDonDon chat.
- BlackPi evidence checklist/debug/scoring UI.
- scenario-specific reveal and endings whose educational narrative depends on different state models.
- a universal “card” that absorbs product, case document, quoted-error, notification, and warning variants.

## 3. Character Architecture

### 3.1 Current character definitions

| Character/role | Gender | Type | Name source | Avatar source | Other coupled sources |
|---|---|---|---|---|---|
| Scenario01 assistant (source alias “Emily”) | female | investment assistant | six-locale-name pool in `scenario01/i18n.js`, selected by session key | `scenario01/avatars.js` points to Scenario02 `emily.webp` | literal `Emily` in dictionaries/messages; header `t(...)` replacement |
| Coach Chen | unspecified/male presentation | investment teacher | JSX/dialogue/i18n strings | `scenario01/images/Coach Chen.webp` via `avatars.js` | video files, Gugo copy, group messages |
| VIP members 阿凱/Jenny/股海小白/王先生/小雅/Kevin/財富自由ing | mixed/unspecified | fake social proof | `VipGroup.jsx` sender prefixes and translations | `VIP_GROUP_AVATARS` in `avatars.js` | sender is parsed from translated text; avatar lookup uses original Chinese sender |
| Sophie (Scenario02) | female | dating candidate | `PEOPLE` in `DatingBrowse.jsx` | `scenario-02/.../sophie.webp` | `MINI_ARCS`, translations |
| Lina | female | dating candidate | `PEOPLE` in `DatingBrowse.jsx` | `lina.webp` | `MINI_ARCS`, translations |
| Scenario02 lead (source alias “Emily”) | female | romance scammer | six-name pool + referral-code pool in `scenario02/i18n.js`; chosen/persisted by `scenario02Store.js` | `emily.webp` constants in multiple pages | headers, dialogue dictionaries, referral codes, videos, location-based bio, notifications, platform copy and endings |
| fake officer | male-only by documented pool | authority scammer | randomized paired zh/en and independent JP pools in `ScenarioSessionFactory.js` | glyph/emoji/CSS; no portrait | agency-derived LINE account name, calls, documents, notifications, dialogue/audio identity |
| fake prosecutor | male-only by documented pool | authority scammer | randomized locale pools in `ScenarioSessionFactory.js` | glyph/emoji/CSS | dialogue, case site, calls, documents and ending data |
| Scenario04 sellers | unspecified | seller/scammer | shop-name constants in chat/page/data files | mostly letter glyph (`賣`) | product route, dialogue trees, order and ending |
| BlackPi platform support / 165 agent | unspecified | support/adviser | speaker map and page/dialogue copy | gold/label avatars | dialogue engine speaker values and specialized message types |
| Sophie (Scenario05) | female | fake buyer | `scenario05Characters.js` | the same Scenario02 Sophie path | `BuyerChat`, `SophieAvatar`, buyer dialogue, relay/quoted messages, fixed status/profile copy |
| 張專員 | unspecified | fake support agent | JSX and Scenario05 dictionary strings | no portrait | masthead, `CsChatSurface`, ticket/script copy |

Character information is thus spread across JSX arrays, stores, i18n adapters/dictionaries, data modules, asset helpers, session factories, and dialogue text. There is no project-wide character contract.

### 3.2 Character Registry feasibility

A `characters/` registry is feasible if it begins as **metadata and resolution**, not a randomizer:

```js
{
  id: 'dating_sophie_01',
  roles: ['dating-candidate', 'marketplace-buyer'],
  gender: 'female',
  avatar: { src: '...', focalPoint: 'center 25%' },
  name: { zh: 'Sophie', en: 'Sophie', jp: 'Sophie' },
  aliases: ['sophie'],
  capabilities: { videoSet: null, referralCode: null },
}
```

Recommended separation:

- **Registry identity**: stable ID, locale names, gender/presentation, canonical avatar, alt text, allowed roles, optional media sets.
- **Role/casting record**: scenario role, app status, bio, job, scripted voice/tone, notification label.
- **Resolved run cast**: `{roleId, characterId, resolvedName, locale, assetSetVersion}` persisted with the scenario. Components receive this snapshot.
- **Dialogue templates**: refer to semantic interpolation (`{character.displayName}`), never replace literal `Emily` globally.

### 3.3 Can Scenario02 women safely supply Scenario05 BuyerChat?

**Asset reuse is already safe and active for Sophie:** Scenario05 references Scenario02's Sophie file without copying it. This proves a shared asset/identity record can remove a hidden cross-scenario path dependency without changing pixels.

**Random pool reuse is not yet safe.** Lina and the randomized Scenario02 lead cannot simply replace Sophie because:

- Scenario05 dialogue and support relay repeatedly identify Sophie by source text/translation.
- Scenario05's profile/status describe a four-year MyDonDon user and shared resale group, while Scenario02 profiles have different age/job/bio/dating context.
- Scenario02 lead identity has videos, referral codes, location-based bio, and a romance-scam voice; reusing only name/avatar would produce an incoherent role.
- Dialogue checkpoints currently serialize already-rendered text. Recasting after checkpoint creation can leave old-name messages under a new header.

Safe future approach: mark characters as eligible for `marketplace-buyer` only after each has a complete casting profile and run all rendered surfaces with a stable `castId`. Sophie can be the first and only pool member initially. Expand the pool only after tokenizing every identity occurrence and adding cross-language replay tests.

## 4. Chat Architecture

### 4.1 Recommended layering

The proposed tree is appropriate if “Chat Engine” is headless and adapters own brand semantics:

```text
conversation-core/
  schema                Message, Choice, Node, Transition, Checkpoint
  scheduler             cancellable delays/typing (later, after tests)
  useConversationScroll
  primitives/
    AvatarBase, MessageRow, Timestamp, TypingIndicator, SystemMessage

chat-apps/
  line/                 LineHeader, LineBubble, LineGroupRow, LineQuickReplies
  meetu/                MeetUHeader, MeetUBubble, MeetUSuggestedReplies
  blackpi/              BlackPiChat adapter + product/evidence message renderers
  mydondon/             MyDonDonChat adapter + quoted cards/composer
  suqubian-support/      standalone web transcript adapter
```

Closest current files:

- Engine/schema: `features/shopping/dialogueEngine.js`, `features/ghostorder/dialogueEngine.js`, `lib/dialogueTree.js`, `lib/typedMessages.js`.
- Conversation layout/scroll: `components/blackpi/ChatScreen.jsx`, `components/ghostorder/ChatScreen.jsx`, `components/ghostorder/CsChatSurface.jsx`.
- Header: repeated `.line-header` JSX plus `MeetUHeader.jsx`, `MyDonDonHeader.jsx` (non-chat), BlackPi/MyDonDon chat headers.
- Avatar: `scenario02/components/ProfileAvatar.jsx`, `ghostorder/Avatar.jsx`, BlackPi glyph avatars.
- Bubble/row/timestamp: `components/ui/Chat.jsx`, each `ChatScreen`'s local `Bubble`, Scenario03 `LineChat.jsx`.
- Image/video: Scenario02 `PrivateChat.jsx` (LINE thumbnails/overlays), BlackPi `AssetImage`/product-card message, MyDonDon link/fake-error cards.
- System message: `VipGroup`, BlackPi `Bubble`, MyDonDon `Bubble`, support `Entry`.
- Typing: raw markup in Scenario01/02, Scenario04, Scenario05.
- Quick replies: Scenario02 `SuggestedReplies`, Scenario04 `DialogueChoiceGrid`, Scenario05 `ChoiceList`.

### 4.2 LINE-specific audit

**Scenarios using LINE:** Scenario01 (`LineTeacher`, `VipGroup`), Scenario02 (`PrivateChat`; MeetU chat is not LINE), and Scenario03 (`LineAdd`, `LineIntro`, and `LineCustody`; `LineIntro` delegates to the shared LINE conversation shell). Scenario05 contains no LINE surface; it uses MyDonDon and a fake website.

**Multiplicity:** LINE is neither fully duplicated nor truly single-source.

- CSS is mostly single-source in `global.css` under `.line-*` selectors.
- row/time/read wrappers are single-source in `components/ui/Chat.jsx` for 1:1 screens.
- header JSX is copy-pasted/independently assembled across Scenario01 and the Scenario02/03 components.
- bubble DOM is repeatedly built by callers using `.line-msg`; media and group bubbles remain page-local.
- timestamps share `chatTime.js` in Scenario01/02; Scenario03 scripted timing is session/config-driven and does not use the identical clock model.
- quick reply is reused cross-brand from Scenario02's `SuggestedReplies` by Scenario01, but it still carries `.meetu-*` names/styles. Scenario03 choices are specialized and Scenario01 `VipGroup` has only a final CTA.

**One-place future LINE design:** introduce a `chat-apps/line` adapter whose public API accepts `identity`, `messages`, `typing`, `actions`, `mode: 'direct'|'group'`, and media renderer slots. It alone owns LINE header, row, bubble, timestamp/read meta, typing, quick-reply presentation, and LINE CSS tokens. Pages keep their engines and pass data. Migrate one screen at a time with DOM/screenshot parity. Do not make LINE the global chat primitive and do not fold MeetU/MyDonDon into it.

## 5. i18n Architecture

### 5.1 Current implementation

- App-wide locale is `zh`, `en`, or `jp`, persisted by `lib/lang.js` under `language` with legacy read fallback from `lang`.
- Locale is not route-based. `RequireLanguage` gates menu routes, but individual scenario routes generally read the stored value directly.
- Scenario01/02/04/05 use Chinese source sentences as keys with separate EN and JP dictionaries and Chinese fallback.
- Scenario03 uses one namespaced structured dictionary containing values, arrays, and interpolation functions.
- Scenario05 product/brand data additionally uses locale-field objects.
- `gugo-invest` independently uses i18next/react-i18next with JSON locales `zh-TW`, `en`, and `jp`.

### 5.2 Highest duplication/fragility

- The same `getScenarioXXLang`, `useScenarioXXLang`, `t`, and `useT` adapter is copied four times.
- Chinese source strings are duplicated between JSX/data and EN/JP dictionary keys; changing Chinese punctuation can silently fall back.
- Character substitution is a literal post-translation `replaceAll('Emily', ...)` in Scenario01/02.
- Scenario03's model is structurally incompatible with the others and includes dynamic agency/person functions; a wholesale i18n unification would be risky.
- Asset language selection uses a mixture of dictionary-driven labels, filename suffixes, explicit locale objects, and separate Gugo i18next configuration.

### 5.3 Target interaction with character/scenario data

Use stable semantic message IDs for **new or migrated data**, with locale content stored together or in keyed locale files. Character registry values are independently localized. Dialogue copy interpolates resolved cast/context tokens at render/build time. Persist canonical node/choice IDs and cast IDs, not localized strings; checkpoints may cache rendered text only for backward compatibility. Keep `jp` as the internal Japanese code and provide an explicit adapter only where i18next expects a language resource name.

Do not convert all existing dictionaries at once. Introduce a compatibility translator able to resolve existing Chinese keys and new semantic keys, then migrate per scenario/scene with completeness checks for zh/en/JP.

## 6. Asset Architecture

### 6.1 Inventory and patterns

- **Avatars:** Scenario01/02 public profile/group images; Scenario03 glyphs; Scenario04 glyph labels; Scenario05 Sophie references Scenario02 public image.
- **App logos:** Scenario01 Gugo locale logos; Scenario02 MeetU brand; Scenario05 MyDonDon/HPE imports; common app/PWA icons.
- **Chat/product images:** Scenario02 chat photos plus source PNGs; Scenario04 public product registry; Scenario05 Vite-imported products.
- **Video/audio:** Scenario01 teacher videos by locale; Scenario02 Emily video set; Scenario03 audio by speaker and locale suffix.
- **Icons:** mixed Lucide, PWA PNG icons, SVG décor and glyph/emoji identities.
- **Backgrounds:** common language/menu/AR backgrounds plus scenario-local feed/LINE and CSS gradients.

### 6.2 Issues

- Public and `src/assets` strategies coexist; both are valid but ownership/loading rules are implicit.
- Duplicate or source/generated variants exist (`fbads.webp`, Scenario02 source PNG vs runtime WebP, root built `assets/` copies). Root `assets/` appears to be deployment output and should not become an authoring source.
- Cross-scenario references encode ownership incorrectly: Scenario05 and Scenario01 point into `scenario-02` for reusable people.
- Filename conventions vary by spaces, Chinese names, hashed build names, lower/upper case, suffix locale conventions, and product keys.
- Scenario03 audio path logic is a high-value registry already; missing audio falls back to timed text and must retain that behavior.

### 6.3 Recommendation (no moves in this audit)

Create an asset manifest first, recording owner, semantic ID, source path, runtime URL strategy, locale, media type, dimensions/duration, character linkage, preload policy and consumers. Only after every reference is mapped should common identity assets move logically under shared ownership. Keep redirects/aliases or generated compatibility paths during physical migration. Add duplicate-by-hash and broken-reference CI checks; do not deduplicate merely by similar filename.

## 7. Coupling Risks

### 7.1 High risk

1. **`webapp/src/routes.jsx`:** every scene, legacy redirect, location guard, product/outcome URL parameter and deep-link contract is centralized here. Route changes can break stored progress, external kiosk links, return-to-chat navigation, and refresh behavior.
2. **`lib/shoppingStore.js` + `features/shopping/dialogueEngine.js` + `data/dialogueTrees/*`:** Scenario04 effects, scores, history, resumable chat and route-dependent ending are mutually coupled. Stored route key `health` is explicitly legacy but persisted.
3. **`lib/scenario05Store.js` + `features/ghostorder/dialogueEngine.js` + `data/scenario05Dialogues.js`:** redirect/resume checkpoints are timing-sensitive; changing generic persistence can overwrite `resumeNodeId` or lose the just-sent message.
4. **`lib/session/ScenarioSessionFactory.js`, location stores/resolver, Scenario03 dialogue/config builders:** generated names, agencies, phone/case/account/deadline data must remain stable for one run and consistent in all documents, calls and chats.
5. **`scenario02/PrivateChat.jsx`, `scenario02Store.js`, and `scenario02/i18n.js`:** long branching/day-based conversation, media autoplay, identity substitution, referral code, chat timestamps and return state converge here.
6. **`styles/global.css`:** it combines shared shell, Scenario01, Scenario02, LINE, results and staff/AR rules. Selector movement can affect multiple scenarios even when JSX seems local.
7. **`gugo-invest` integration:** it is a separately built app with independent routing/i18n/store. Treating it as an ordinary Scenario01 component risks broken base paths and persistence handoff.

### 7.2 Medium risk

1. `components/ui/Chat.jsx` and LINE callers: small API, but affects Scenario01/02/03 positioning and localized read labels.
2. `lib/chatTime.js`: shared time anchors/storage determine believable chat times; changes are visible across LINE screens and refreshes.
3. `components/blackpi/ChatScreen.jsx`: used by many Scenario04 conversations with special notice/checklist/product-card message kinds.
4. `components/ghostorder/ChatScreen.jsx` and `CsChatSurface.jsx`: both share an engine but deliberately communicate distinct application contexts.
5. Scenario i18n entry files/dictionaries: fallback prevents crashes but can silently show mixed-language text.
6. `AppShell`, `StageClassContext`, `useFitStage`: all screens rely on fixed 390×844-style stage scaling, safe areas and cleanup of per-route classes.
7. product/asset registries (`products.js`, `assetMap.js`, `scenario05Products.js`): route IDs, images, dialogue and order state must align.

### 7.3 Low risk / good early boundaries

1. Add a read-only character registry mapping existing IDs/paths/names while keeping old exports as adapters.
2. Add architecture contracts/types/JSDoc and inventory/validation tests without changing DOM.
3. Add a headless scroll hook behind one unchanged chat screen, with parity tests, after the character pilot.
4. Centralize repeated typing-indicator DOM behind theme classes after visual snapshots exist.
5. Add asset-manifest validation and locale completeness tooling without moving assets.

## 8. Special Rules That Must Not Break

| Rule | Current location | Migration invariant |
|---|---|---|
| GPS/location text | `staff/*`, `lib/location/*`, `RequireLocationProfile`, Scenario02 `DatingBrowse` city bio, Scenario03 session/config/dialogues, Scenario04 checkout | only staff flow calls geolocation; scenes read locked profile; retain IndexedDB + sync local mirror/fallback |
| Character randomization | Scenario01 `i18n.js`; Scenario02 `scenario02Store.js` + `i18n.js`; Scenario03 `ScenarioSessionFactory.js` | pick once per defined run lifetime; persist ID/snapshot; never re-roll on render/language lookup |
| Time display | `lib/chatTime.js`; Scenario03 session deadlines/countdowns; Scenario04 phone/order/call timers; generated IDs | preserve anchor/storage key/timezone/format and refresh behavior |
| Morning/evening/day chat | Scenario02 `DatingChat` time anchors and `PrivateChat` day script; Scenario01 group wording; Scenario03 generated deadlines | data migration must retain explicit time anchors and narrative day ordering |
| localStorage | `lib/lang.js`, Scenario02 progress, Scenario04/05 stores, location mirror, Gugo store | preserve keys/payloads or version/migrate them |
| session state | chat clocks, Scenario01/S02 identities, Scenario03 session, Scenario04/05 checkpoints | preserve lifetime differences and hard-refresh resume |
| language persistence | `lib/lang.js`, language page/guards, all scenario adapters, separate Gugo i18next | keep `jp`, legacy `lang` read, Chinese fallback and cross-app handoff |
| PWA | `webapp/public/manifest.json`, `sw.js`, icons; mirrored root deployment files | asset path/cache changes require install/offline/update testing |
| mobile viewport | `AppShell`, `useFitStage`, `StageClassContext`, global and scenario CSS safe-area rules | preserve resize/orientation/stage-class cleanup and 320–430px usability |
| scenario branch | page navigation, Scenario02 decisions, Scenario03 choices/outcome URL, Scenario04 product route/scores, Scenario05 awareness/endings | persist canonical IDs and verify every terminal outcome |
| image preload | Scenario01 `VipGroup` manual avatar preload; browser eager/lazy image behavior; AR/media assets | do not remove warm-cache behavior without measuring pop-in |
| video playback state | Scenario01 `VideoTeacher`; Scenario02 `PrivateChat`, `mediaAutoplay.js`, `useAutoMediaPreview.js`, video progress helpers | retain muted-autoplay fallback, ended/error paths, auto-open/close and cleanup |
| return-to-chat state | Scenario02 LINE/platform switch helpers; Scenario05 dialogue `redirectTo`/`resumeNodeId`; Scenario04 checkpoints | resume exact node/timeline once; no replay, skip or stale localized/cast header |
| audio playback state | Scenario03 `useScenarioAudio`, `useScriptPlayer`, dialogue audio keys | preserve cancellation, missing-audio timed fallback and locale file selection |

## 9. Proposed Shared Architecture

```text
src/
  experience/
    scenario-contract/       metadata, scene IDs, progress/outcome contracts
    conversation-core/       schema and headless utilities only
    characters/              registry, casting rules, resolved run snapshot
    i18n/                    locale adapter + interpolation contracts
    assets/                  semantic manifest/resolver
    ui-primitives/           unbranded, accessibility-first primitives
  chat-apps/
    line/
    meetu/
    blackpi/
    mydondon/
    suqubian-support/
  scenarios/
    scenario01...05/         content, orchestration, specialized interactions
```

This is a target dependency direction, not a requested folder move. Shared code must not import a scenario dictionary/store. App adapters may import core, and scenarios may import both. Scenario data references semantic `sceneId`, `characterRoleId`, `messageId`, `assetId`, choices/transitions and app adapter; it does not own generic DOM.

### 9.1 Scenario Shell assessment

The five scenarios broadly share entry/interaction/reveal-or-risk/quiz/ending, but not uniformly:

- Scenario01 and Scenario02 have explicit briefings and quizzes.
- Scenario03 begins directly on a simulated phone and has no equivalent quiz route; education is integrated into decision/hotline/ending.
- Scenario04 has a long commerce workflow, result then route-specific ending.
- Scenario05 has reveal then quiz/results after two endings.

Therefore build a **composable shell contract**, not a mandatory five-step wizard:

- `ScenarioShell`: viewport/safe-area/error boundary/exit policy; much is already `AppShell`.
- `ScenarioHeader`: optional, themed slot; not imposed inside fake apps.
- `ScenarioProgress`: consumes stable scene/progress metadata but may be hidden in immersion scenes.
- `ScenarioOutcome`: shared outcome data shape rendered by scenario theme; extend existing `FraudOutcomeResult`.
- `ScenarioQuiz`: shared question/answer model and accessibility behavior, with themed renderer and optional absence.

### 9.2 What should become scenario data

**Good candidates:** character casting references; simple linear/branching message nodes; choice labels/effects/next IDs; timestamps/system notices; product metadata; warning registry entries; quiz questions/explanations; result facts/CTAs; route-neutral scene metadata; localized asset references.

**Keep as React/components:** MeetU swipe/match gestures; media overlays/autoplay; Scenario03 calls/audio/subtitle synchronization/countdowns/fake documents/bank; Scenario04 order/return timers and evidence calculations; bank verification; AR scanning; complex visual charts; redirect/resume orchestration until its engine contract is tested.

Rule: data should describe **content and transitions**; React should own **interaction mechanics and branded presentation**. A data record must not become JSX-by-JSON with class names and arbitrary callbacks.

## 10. Incremental Modularization Plan

### Phase 0 — freeze contracts and build characterization coverage

- **Scope:** document route, persistence, locale, cast, dialogue and asset contracts; add tests/fixtures/screenshots without production behavior changes.
- **Files affected later:** `routes.jsx`, all stores, dialogue engines, `lang.js`, shell, key chat screens; initially tests/docs only.
- **Benefit:** makes silent regressions observable and supplies rollback baselines.
- **Risk:** low; inadequate fixture coverage may create false confidence.
- **Scenarios:** all five plus Gugo integration.
- **Regression:** enumerate every route/deep link; storage key snapshots; zh/en/JP smoke; 390×844 and narrow viewport; PWA build; every ending.
- **Rollback:** trivial—test/docs-only commits.

### Phase 1 — character registry compatibility layer (**recommended pilot**)

- **Scope:** register current characters and roles; retain old exports/functions as adapters; no random-pool expansion and no visible changes.
- **Files:** new registry plus adapters around `scenario01/avatars.js`/i18n identity, `scenario02Store.js`/i18n/`DatingBrowse`, Scenario03 session identity metadata, `scenario05Characters.js`/`Avatar.jsx`.
- **Benefit:** one semantic source for identity/avatar/locale capabilities; removes hidden cross-scenario ownership and prepares safe casting.
- **Risk:** medium if randomization timing or literal Emily replacement changes; keep old selection functions initially.
- **Scenarios:** chiefly 01, 02, 03 and 05; inventory only for 04 roles.
- **Regression:** same name/avatar across header/dialogue/notification/endings in zh/en/JP; reload/session reset; referral code; Scenario03 documents/calls; Scenario05 support relay.
- **Rollback:** easy if registry sits behind unchanged legacy exports.

### Phase 2 — asset manifest and validation, without moves

- **Scope:** assign semantic IDs/owners and validate paths, duplicates, media locale variants, dimensions and consumers.
- **Files:** asset data modules, build validation scripts/tests; existing assets remain in place.
- **Benefit:** prevents broken paths and enables later ownership cleanup.
- **Risk:** low; Vite-glob/public-base behavior must be modeled correctly.
- **Scenarios:** all, especially 01/02/03/05.
- **Regression:** production build, base-path preview, image/audio/video existence, missing-media fallback, preload behavior.
- **Rollback:** easy; manifest can be removed while legacy paths remain.

### Phase 3 — headless conversation primitives

- **Scope:** extract scroll-to-bottom, typing structure, row/meta/timestamp contracts and message-kind types; no engine merge.
- **Files:** `components/ui/Chat.jsx`, BlackPi/MyDonDon/Cs chat screens, Scenario01/02/03 LINE components.
- **Benefit:** removes safe mechanical duplication and proves theme-slot boundaries.
- **Risk:** medium: scroll timing, aria-live noise, CSS selector structure, StrictMode timer cleanup.
- **Scenarios:** all chat-using scenarios.
- **Regression:** long transcripts, choice appearance, incoming typing, refresh resume, reduced/narrow viewport, screen reader labels, DOM/visual snapshots.
- **Rollback:** easy per primitive because consumers migrate one at a time.

### Phase 4 — shared LINE adapter

- **Scope:** centralize LINE header, direct/group bubble rendering, timestamp/read meta, typing, quick replies and media slots; retain each page engine/data.
- **Files:** Scenario01 `LineTeacher`/`VipGroup`, Scenario02 `PrivateChat`, Scenario03 `LineChat` and LINE pages, relevant `global.css` selectors.
- **Benefit:** future LINE visual change occurs once while scenario narratives remain isolated.
- **Risk:** medium/high due to PrivateChat media, group sender/avatar parsing, and Scenario03 session cards.
- **Scenarios:** 01, 02, 03 only.
- **Regression:** pixel parity for direct/group/media/system/card messages; localized header wrap; read/times; video/photo overlay; group preload; return-to-chat.
- **Rollback:** moderate—screen-by-screen feature flag/legacy adapter makes rollback manageable.

### Phase 5 — branded app adapter contracts

- **Scope:** formalize MeetU, BlackPi, MyDonDon and fake-support adapters over core primitives; keep distinct CSS and special message renderer maps.
- **Files:** `scenario02/meetu`, `components/blackpi`, `components/ghostorder`, CSS families.
- **Benefit:** common accessibility/behavior fixes propagate while brands remain independent.
- **Risk:** medium; over-generalization could erase the deliberate app/site context switch.
- **Scenarios:** 02, 04, 05.
- **Regression:** brand screenshots, product/evidence/quoted-error/verify messages, choice layouts, no MyDonDon chrome on support site.
- **Rollback:** moderate if each adapter preserves previous public props.

### Phase 6 — dialogue engine contract, not immediate engine merge

- **Scope:** define common node/checkpoint/event interfaces; wrap Scenario04/05 engines; only then consider extracting scheduler/checkpoint utilities.
- **Files:** both dialogue engines/stores, `lib/dialogueTree.js`, dialogue data.
- **Benefit:** shared validation/tooling and future authoring without erasing business effects.
- **Risk:** high—timers, StrictMode cleanup, checkpoint races, localized serialized timelines, read receipts and redirects.
- **Scenarios:** 02, 04, 05 first; Scenario01 later; exclude Scenario03 audio player from forced adoption.
- **Regression:** refresh at every node, leave/return, rapid choices, disabled choices, hubs, scores/effects, every terminal, storage fixture compatibility.
- **Rollback:** moderate/hard; wrappers and dual-run fixture comparison are required.

### Phase 7 — scenario metadata/shell and outcome/quiz convergence

- **Scope:** add scene metadata/progress; converge compatible quiz/outcome models; keep optional stages and themed renderers.
- **Files:** scenario entry/config, quiz/result/ending pages, `FraudOutcomeResult`, router metadata adapter.
- **Benefit:** consistent navigation/progress/analytics and less repeated education-card plumbing.
- **Risk:** medium/high because scenario flows do not share a uniform lifecycle.
- **Scenarios:** all; Scenario03 uses an optional no-quiz configuration.
- **Regression:** deep links, browser back, every outcome/CTA, direct result refresh, language and mascot, immersive scenes hide global chrome.
- **Rollback:** moderate if metadata is additive and routes remain explicit.

### Phase 8 — selective scenario-data migration

- **Scope:** migrate simple scripts/questions/warnings scene-by-scene; leave specialized interaction components intact.
- **Files:** Scenario01 scripted chats, Scenario02 dialogue builders, Scenario03 already-data config (normalization only), Scenario04/05 dialogue/product/quiz data.
- **Benefit:** content editing and locale/cast validation without opening JSX.
- **Risk:** high if migration changes ordering/delay/effects or serializes UI implementation details.
- **Scenarios:** all, in the order 01 simple group → 05 existing data → 04 existing data → 02 media chat; Scenario03 only where already data-driven.
- **Regression:** node graph validation, unreachable/dead-end detection, three-locale completeness, scripted replay snapshots, all branches and media events.
- **Rollback:** easiest when each migrated scene keeps an adapter to the old component contract and lands in isolated commits.

## 11. Recommended Pilot

### Choose: Character Registry compatibility layer

This is the single best first pilot—not `ChatBubble`, LINE header, or QuickReply—because it can deliver architectural evidence with **zero DOM, CSS, timing, routing, or storage-key change**.

Initial pilot boundary:

1. Represent Sophie once with canonical shared asset metadata and two role castings (Scenario02 dating candidate, Scenario05 buyer).
2. Make existing Scenario05 `SOPHIE` and existing Scenario02 profile data resolve through compatibility adapters while preserving their exact current shapes.
3. Register Scenario01/02 randomized lead pools as metadata only; selection remains in current stores/functions.
4. Add validation that every character has zh/en/JP name resolution, an existing avatar or declared glyph fallback, unique ID, and role eligibility.

Why lowest risk:

- Sophie already shares one physical asset across scenarios and Scenario05 already has a small single-source character object.
- No live engine, chat DOM, theme CSS, route, timing or persisted payload needs to change.
- Legacy exports make rollback a one-commit revert.
- It directly tests the desired dependency direction: scenarios consume identities/roles as data rather than own cross-scenario asset paths.

Success criteria:

- visual snapshots and rendered copy are byte/pixel-equivalent before/after;
- Scenario02 Sophie mini arc and Scenario05 buyer show the same intended portrait but retain different bios/roles;
- no scenario imports assets from another scenario namespace directly;
- zh/en/JP character validation passes;
- reload/session behavior of randomized Scenario01/02 leads is unchanged;
- adding a second eligible marketplace-buyer casting requires registry/casting data, not edits across header/avatar/dialogue components (but do not enable random selection yet).

## 12. Regression Test Checklist

### Global

- [ ] `npm run lint`, dialogue/fake-phone validators, and `npm run build` pass in `webapp`.
- [ ] `npm run lint` and `npm run build` pass in `gugo-invest`.
- [ ] all explicit routes and legacy redirects render under `HashRouter` after direct refresh.
- [ ] language selection persists for zh/en/JP; legacy `lang` fallback still reads; Japanese is labeled `JP`.
- [ ] installed PWA/offline shell, manifest icons, service-worker update and base-path assets work.
- [ ] portrait/landscape resize, orientation change, safe areas, 320px narrow and nominal mobile stage retain scroll/tap access.

### Characters/i18n

- [ ] header, avatar alt, dialogue, notifications, cards, reveal, quiz and ending agree on the same resolved identity.
- [ ] locale switch/reload does not re-roll a character; a defined new run does.
- [ ] Scenario02 randomized name and referral code pair correctly.
- [ ] Scenario03 officer/prosecutor names stay consistent across calls, LINE, website, documents, bank prompts and ending.
- [ ] no unresolved `{character...}` token, literal source alias, missing JP entry, or mixed-language checkpoint appears.

### Chat

- [ ] incoming/outgoing alignment, timestamp/read placement, typing indicator, quick replies and auto-scroll match baseline.
- [ ] direct LINE, LINE group, MeetU, BlackPi, MyDonDon and fake support remain visually distinct.
- [ ] image/video/link/product/notice/system/checklist/fake-error/verify message kinds render correctly.
- [ ] refresh while typing, while choices show, and after choosing resumes without duplicate/missing messages.
- [ ] Scenario05 external handoff returns to exact buyer-chat node; fake support never adopts MyDonDon chrome.

### Scenario01

- [ ] feed → video → LINE assistant → VIP group → platform → quiz/endings paths work.
- [ ] assistant identity is stable for session; group avatars preload; teacher videos select correct locale/fallback.
- [ ] embedded Gugo registration/profit state survives intended return/reload.

### Scenario02

- [ ] Sophie and Lina mini arcs, Emily like/pass/reveal and forced education path all work.
- [ ] location-derived bio matches staff profile in zh/en/JP.
- [ ] LINE day sequence, time anchors, media auto-preview/autoplay/end/error, platform switch and return-to-chat work.
- [ ] every deposit/top-up/guarantee branch reaches correct result/risk/quiz/ending.

### Scenario03

- [ ] deep links without location profile are gated; configured agency names resolve everywhere.
- [ ] one session retains fictional identity/case/phone/account/deadline; restart creates a new coherent session.
- [ ] all locale audio files play; missing audio uses timed subtitle fallback; leaving scenes cancels playback/timers.
- [ ] decline/SMS/call choices, LINE add, documents, prosecutor call, bank/final/hotline and both outcome URLs work.

### Scenario04

- [ ] both `health` and `luckyBag` routes complete all seller/order/return/refund/support/165 paths.
- [ ] local durable state and per-chat session checkpoint remain backward-compatible.
- [ ] evidence inventory, warning flags, scores, history, return status, platform case and outcome calculation match fixtures.
- [ ] product/card assets and timed shipping/refund/call progress remain correct.

### Scenario05

- [ ] both products keep selected image/name/price through listing, chat, order and ending.
- [ ] generated order IDs and awareness/outcome state persist correctly.
- [ ] Sophie identity matches header, intro, dialogue, support relay, reveal and translations.
- [ ] caught/scammed endings, reveal, quiz and quiz result all remain reachable and correct.

## Final recommendation

Preserve the current branded vertical slices while introducing shared capability **from the bottom up**: first identity/asset contracts, then headless mechanical primitives, then a dedicated LINE adapter, and only later engine/shell/data convergence. The project will become maintainable by creating stable seams around working scenarios—not by replacing five finished experiences with one prematurely universal framework.
