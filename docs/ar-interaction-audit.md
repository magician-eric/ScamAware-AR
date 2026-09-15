# AR Interaction Audit

Run `cd webapp && npm run audit:ar-interactions` to inventory JSX interaction definitions under `src/` and apply the focused regression guard.

The report includes the source file, nearest exported/component function, interaction type, line, cautious classification, and reason. Its header and totals deliberately say **SOURCE INTERACTION DEFINITIONS**: these are syntax-level definitions found in source, not rendered controls or a UI button count. Scenario totals are an inventory, **not** a “maximum two buttons” gate: existing quizzes, menus, language selection, and unfinished scenario work require manual review. Shared `apps/line` definitions appear once under **Shared / LINE** rather than being attributed to Scenario 03 or duplicated across Scenarios 01–03.

## Gate scope

The guard prevents regressions for:

- MeetU's display-only message/profile header icons and bottom navigation.
- Coin Winner PlatformHome's display-only notification/account header icons and bottom navigation (while retaining its tab presentation content).
- Scenario 01 Facebook's display-only like/comment/share action bar.
- Scenario 05 MyDonDon's display-only search/notification header, BuyerChat back chrome, BrowserChrome back/menu chrome, and MyDonDonOrders header back. The explicit **返回對話** CTA is positively required.
- GuGo Account, Markets, Portfolio, StockDetail, LanguageSwitcher, TopBar, registration, footer, and stock-row non-story interactions.
- MyDonDon footer tabs, LINE shared-back navigation, and the Scenario 03 subtitle button.

The rules reject control semantics (`button`, handlers, keyboard-button semantics, or links as applicable) and focused navigation callbacks; they do not remove presentation-only tab content or attempt to validate gesture contracts. BlackPi's Scenario 04 Search still contains an input on the current source tree, so it remains visible as the centralized `REPORT` exception and does not fail the audit.

## 與 AR Interaction Contract 的分工

這份稽核與 `npm run test:gesture-contract`（`webapp/src/lib/arInteraction/`，規格見 `CIBAR-Technical-Specification.md` §4.12）是**兩套責任不同的工具，刻意不合併**：

- 本稽核掃**整個 source tree** 的 interaction 定義，找出 interaction risk 與 regression。
- Gesture Contract 只回答**當下這一個 active 畫面**允許手勢做什麼（`display`／`single`／`dual`）。

`data-gesture-*` 在本稽核中仍屬未正式導入項目，Gesture Contract 也**沒有**引入它：契約走 React hook，不走 DOM metadata。

Classifications are heuristics only. `unknown/manual review` deliberately means **MANUAL REVIEW** rather than an assertion about story correctness. Temporary exceptions live only in `scripts/ar-interaction-known-exceptions.mjs`; they stay visible in output.
