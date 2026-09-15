// The five scenario entry screens, rendered.
//
// All five go through the one shared component
// (src/components/ui/ScenarioEntryBriefing.jsx), so what this file pins is
// what a player actually gets out of that single render, in all three
// languages:
//
//   * no 返回情境選單 link - the entry screen is the start of a run, and the
//     way out of it is the scenario itself, not a sideways exit. It is left
//     out of the render entirely rather than hidden, so it is not in the DOM,
//     not a tab stop, and not something the gesture controller can find when
//     it scans the screen for interactive elements;
//   * exactly one interactive element, and it is the start button pointing at
//     that scenario's own first story screen - the same route each scenario
//     went to before;
//   * nothing left behind where the link was: no empty anchor, no .home-link.
//
// `/scenario-menu` itself is deliberately untouched (route, page and the
// /ar-scan manual entry into it all still exist) - this is about the entry
// screen's own chrome, not about the menu.
//
// The key visual is not asserted here: the test loader stubs
// `import.meta.glob`, which is how src/lib/scenarioEntryHeroes.js resolves the
// artwork, so the image is verified in a real browser instead.
//
// Run with scripts/jsx-test-loader.mjs (npm run test:scenario-entry-briefing).
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Every scenario reads its run state out of storage on first render, and the
// language selector reads the player's choice out of the same place.
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};
globalThis.sessionStorage = globalThis.localStorage;
globalThis.performance ??= { now: () => 0 };

const ENTRIES = [
  { id: 'S01 財富陷阱', file: 'pages/scenario01/Briefing.jsx', route: '/scenario01-investment', start: '/scenario01-investment/feed' },
  { id: 'S02 戀愛劇本', file: 'pages/scenario02/Briefing.jsx', route: '/scenario02-romance', start: '/scenario02-romance/phone-desktop' },
  { id: 'S03 權威陷阱', file: 'pages/scenario03/Briefing.jsx', route: '/scenario03-police', start: '/scenario03-police/phone-home' },
  { id: 'S04 黑箱包裹', file: 'pages/scenario04/Briefing.jsx', route: '/scenario04-shopping', start: '/scenario04-shopping/phone-home' },
  { id: 'S05 幽靈訂單', file: 'pages/scenario05/Briefing.jsx', route: '/scenario05-atm', start: '/scenario05-atm/phone-home' },
];

const LANGS = ['zh', 'en', 'jp'];

// Every wording the link ever had, so a revert in one language alone is still
// caught.
const BACK_LABELS = ['返回情境選單', 'Back to scenarios', 'Back to Scenario Menu', 'シナリオ選択に戻る'];

// React emits a <link rel="preload"> for an image it is about to render; that
// hint is not part of the screen, so it is dropped before anything here looks
// at the markup.
const stripPreloads = (html) => html.replace(/<link\b[^>]*>/g, '');

// One screen, mounted at its real route so the render matches the app's.
function renderAt(Component, route) {
  return stripPreloads(renderToStaticMarkup(React.createElement(
    MemoryRouter,
    { initialEntries: [route] },
    React.createElement(Routes, null, React.createElement(Route, { path: route, element: React.createElement(Component) })),
  )));
}

for (const entry of ENTRIES) {
  for (const lang of LANGS) {
    test(`${entry.id} (${lang}) opens with the start button and nothing else`, async () => {
      memory.set('language', lang);
      const { Briefing } = await import(`../src/${entry.file}`);
      const html = renderAt(Briefing, entry.route);

      assert.equal(html.includes('/scenario-menu'), false, 'entry screen still points at /scenario-menu');
      assert.equal(html.includes('home-link'), false, 'entry screen still renders a .home-link');
      for (const label of BACK_LABELS) {
        assert.equal(html.includes(label), false, `entry screen still shows "${label}"`);
      }

      // The start CTA is untouched: same route the scenario always went to.
      assert.ok(html.includes(`href="${entry.start}"`), `start button no longer goes to ${entry.start}`);

      // ...and it is the only thing on the screen that can be clicked, tabbed
      // to, or picked up by the gesture controller.
      const interactive = html.match(/<(?:a|button)\b/g) ?? [];
      assert.equal(interactive.length, 1, `expected exactly one interactive element, found ${interactive.length}`);

      // Nothing left where the link was - no empty box still taking a click.
      assert.equal(/<a[^>]*>\s*<\/a>/.test(html), false, 'an empty anchor was left behind');
      assert.equal(/<div class="topbar"><div class="brand">[^<]*<\/div><\/div>/.test(html), true, 'the topbar is no longer brand-only');
    });
  }
}
