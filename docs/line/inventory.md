# Shared LINE implementation inventory

> **2026-08-20 重新掃描結果**：遷移後的歸屬敘述仍與程式相符。目前 `apps/line` 的 consumer 為 `pages/scenario01/LineTeacher.jsx`、`pages/scenario01/VipGroup.jsx`、`pages/scenario02/PrivateChat.jsx`、`pages/scenario03/LineAdd.jsx`、`pages/scenario03/LineCustody.jsx` 與 `pages/scenario03/components/ScriptedLineConversation.jsx`，共 6 個檔案；`npm run validate:line` 通過。Scenario 04／05 的聊天畫面**不是** LINE（分別為 BlackPi 與 MyDonDon 的站內聊天），刻意不共用。

## Before migration

- Scenario01 `LineTeacher`: direct header, avatar, incoming/outgoing bubbles, timestamp/read metadata, typing dots, auto-scroll and quick replies; quick replies incorrectly came from MeetU.
- Scenario01 `VipGroup`: group header/member count, group avatar, sender avatars/names, system join item, typing and auto-scroll.
- Scenario02 `PrivateChat`: direct header, multi-day date/time items, text/image/video/link messages, previews/overlays, typing, choices, checkpoint return and auto-scroll.
- Scenario03 `LineAdd`: friend notification/profile. `LineIntro` used the scenario-local `LineChat` renderer for headers, rows, typing, timestamps, and cards; `LineCustody` is a separate task-data view.
- Common metadata was in `components/ui/Chat.jsx` and `lib/chatTime.js`; shared LINE selectors were mixed into `styles/global.css`. Character and story media remain scenario/Character System assets.

## Ownership after migration

`src/apps/line` owns header variants, avatar presentation, incoming/outgoing/system rows, timestamps/read receipts, typing, quick replies, scroll/background, footer, and media row shells. Scenarios retain scripts, state machines, casting, clocks, media preview/autoplay controllers, cards, warning/CTA behavior, navigation and storage.

## CSS ownership

`src/apps/line/styles/line.css` is the single owner of LINE's visual surface —
27 `line-*` classes plus the `.chat-row`/`.chat-time`/`.chat-read`/`.chat-meta`
row classes, which are scoped under the module's own `.line-app` root so the
module claims no unprefixed global name. It declares its own `--line-*` tokens
and its own `lineSlideIn`/`lineTypingDot` keyframes, so it never renders
differently depending on which other stylesheet happens to be loaded, and
`apps/line/index.js` imports it — Scenario pages never import LINE styles.

What Scenarios keep is their own, not LINE's: scenario02's story photo/video
messages, lightbox, fullscreen player and return-to-platform pill live in
`pages/scenario02/PrivateChat.css` (legacy `line-` prefixed names, but the
shared LINE component never renders them); scenario03 keeps
`.pol-line-card-slot`, `.pol-line-custody` and `.pol-line-heads-up` in
`styles/scenario03.css`. `styles/global.css` holds no LINE rule at all — the
one exception is `.ar-stage.line-stage`, a shell stage variant (peer of
`.meetu-stage`/`.police-stage`) that `apps/line` never renders.

Guarded by `npm run validate:shared-ui-ownership`, which derives LINE's class
surface from `apps/line/components/Line.jsx` rather than a hand-written list.

