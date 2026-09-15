// The Language Select page is the on-site SETUP screen as well as the language
// picker: the host holds the device here, before anyone is handed the glasses,
// and where the session is being run has to be settled at this point. So the
// page carries exactly two kinds of control - the three language options
// (中文 / English / 日本語) and one visible entry into the existing location
// setup screen - and both are pinned here.
//
// That entry was removed once, on the reading that Staff Setup is staff-only
// (spec 2.7.2 / 10.1, AD-13) and nothing player-facing may lead to it. That
// left the one setup step every session needs behind a 5s hold on an unmarked
// patch of artwork, which is not an instruction a venue can be given. The
// entry is back, the screen behind it is unchanged, and it stays zh-TW
// (test 4) - restoring the door, not translating the room.
//
// The door is now a settings GEAR in the top-right corner rather than the
// wide 定位 pill it used to be: 定位 named one thing the screen does as
// though it were the whole of it, and put player-facing wording in the middle
// of the player's first screen. The icon carries no visible text in any
// language - only an aria-label - which is what tests 1c and 1e below pin.
//
// The hidden entry (5s long-press on the logo area) is kept as the
// maintenance back door and must keep working, so this file pins three
// directions: the gear leads to /staff-setup, nothing ELSE visible does, and
// the hold still does too.
//
// The page is rendered for real (scripts/jsx-test-loader.mjs, the same
// harness the App-module boundary tests use) and its handlers are invoked,
// so this is checked as behaviour, not as a grep over the source - though a
// couple of source-level assertions are kept as a second line of defence
// against the shortcut being reintroduced in a shape the renderer misses.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test, { mock } from 'node:test';
import React from 'react';
import {
  UNSAFE_LocationContext as LocationContext,
  UNSAFE_NavigationContext as NavigationContext,
  UNSAFE_RouteContext as RouteContext,
} from 'react-router-dom';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const SOURCE = 'src/pages/LanguageSelect.jsx';

// --- harness -----------------------------------------------------------------

function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

// A recorder in place of the history stack, so "where did this send the
// player" is checked rather than assumed. useNavigate() hands the resolved
// location object to navigator.push().
function recordingRouter() {
  const visited = [];
  const record = (to) => visited.push(typeof to === 'string' ? to : to.pathname);
  const navigator = {
    push: record,
    replace: record,
    go: (n) => visited.push(`go(${n})`),
    createHref: (to) => (typeof to === 'string' ? to : to.pathname),
    encodeLocation: (to) => (typeof to === 'string' ? { pathname: to, search: '', hash: '' } : to),
  };
  return { visited, navigator };
}

const REACT_INTERNALS = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

// Renders the page far enough to reach its handlers. The router contexts are
// supplied by identity, so useNavigate() runs its real implementation against
// the recorder above; every other context (StageClassContext) resolves to
// null, which its hook already treats as "no stage to update".
function renderPage(Component, { navigator }) {
  const contexts = new Map([
    [LocationContext, {
      location: { pathname: '/', search: '', hash: '', state: null, key: 'test' },
      navigationType: 'POP',
    }],
    [NavigationContext, { basename: '/', navigator, static: false }],
    [RouteContext, { outlet: null, matches: [], isDataRoute: false }],
  ]);
  const previous = REACT_INTERNALS.H;
  REACT_INTERNALS.H = {
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: () => {},
    useInsertionEffect: () => {},
    // useNavigate arms itself in a layout effect; a no-op here would leave
    // navigate() silently inert and every navigation assertion vacuous.
    useLayoutEffect: (cb) => cb(),
    useMemo: (factory) => factory(),
    useCallback: (fn) => fn,
    useContext: (ctx) => (contexts.has(ctx) ? contexts.get(ctx) : null),
  };
  try { return Component(); } finally { REACT_INTERNALS.H = previous; }
}

// Walks the returned element tree. The page renders host elements only, so
// there is nothing to expand on the way down.
function walk(node, found = []) {
  if (Array.isArray(node)) { node.forEach((child) => walk(child, found)); return found; }
  if (!node || typeof node !== 'object') return found;
  found.push(node);
  walk(node.props?.children, found);
  return found;
}

function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props?.children);
}

// An element the player can see and act on: not aria-hidden, and not inside
// an aria-hidden subtree.
function visibleNodes(root) {
  const out = [];
  const visit = (node, hidden) => {
    if (Array.isArray(node)) { node.forEach((child) => visit(child, hidden)); return; }
    if (!node || typeof node !== 'object') return;
    const isHidden = hidden || node.props?.['aria-hidden'] === true || node.props?.['aria-hidden'] === 'true';
    if (!isHidden) out.push(node);
    visit(node.props?.children, isHidden);
  };
  visit(root, false);
  return out;
}

async function page(storage = fakeStorage()) {
  globalThis.localStorage = storage;
  const { LanguageSelect } = await import('../src/pages/LanguageSelect.jsx');
  const router = recordingRouter();
  const tree = renderPage(LanguageSelect, router);
  return { tree, storage, ...router };
}

const LANGUAGES = [
  { code: 'zh', label: '🇹🇼 中文' },
  { code: 'en', label: '🇺🇸 English' },
  { code: 'jp', label: '🇯🇵 日本語' },
];

const STAFF_WORDS = /staff|staff-setup|location-shortcut|設定所在地|所在地設定|工作人員|設定地區/i;

// The restored staff entry: one class, one gear, no text. Its accessibility
// label is the ONE place the page is allowed to name staff setup - a screen
// reader announcing it is how a host finds this control, and nothing paints
// it on screen for a visitor to read (see test 1e).
//
// The label is localized like everything else this page says. It used to be a
// single zh-TW literal, on the reasoning that the screen behind it is zh-TW
// only (AD-13) - but the gear sits on the player's FIRST screen, and its
// accessible name is text a player's screen reader reads out. What is behind
// the door is a separate decision from what the door announces itself as.
const LOCATION_BUTTON_CLASS = 'language-location-button';
const STAFF_SETTINGS_LABELS = { zh: '工作人員設定', en: 'Staff settings', jp: 'スタッフ設定' };
const STAFF_SETTINGS_LABEL = STAFF_SETTINGS_LABELS.zh;
const ICON_CLASS = 'language-location-icon';

const languageButtons = (tree) => visibleNodes(tree)
  .filter((n) => n.type === 'button' && n.props?.className?.includes('language-button'));

// --- 1. exactly one visible entry leads to the location setup screen ---------

test('1a. the visible gear entry navigates to /staff-setup', async () => {
  const { tree, visited } = await page();
  const entry = visibleNodes(tree).find((n) => n.props?.className === LOCATION_BUTTON_CLASS);
  assert.ok(entry, 'the gear entry must be visible on the language home');
  assert.equal(entry.type, 'button', 'the gear entry must be a real button, not a decorated div');
  // Pointer Events on a <button> cover touch and mouse alike; onClick is what
  // both end up firing, so this is the whole "a finger can use it" contract.
  assert.equal(typeof entry.props.onClick, 'function', 'the gear entry must be clickable');
  entry.props.onClick();
  assert.deepEqual(visited, ['/staff-setup'], 'the gear entry must open the existing location setup screen');
});

test('1b. it is the ONLY visible control that navigates to /staff-setup', async () => {
  const { tree, visited } = await page();
  const visible = visibleNodes(tree);

  // Canary: if the walk ever stops finding the page, every assertion below
  // would pass on an empty list.
  assert.ok(visible.length > 5, 'render walk found nothing - the harness is broken, not the page');

  const clickable = visible.filter((n) => typeof n.props?.onClick === 'function');
  assert.ok(clickable.length > 0, 'no clickable element found - the harness is broken, not the page');

  let entries = 0;
  for (const node of clickable) {
    visited.length = 0;
    node.props.onClick();
    if (!visited.includes('/staff-setup')) continue;
    entries += 1;
    assert.equal(node.props.className, LOCATION_BUTTON_CLASS,
      `an unexpected control navigates to /staff-setup: ${JSON.stringify(node.props.className ?? node.type)}`);
  }
  assert.equal(entries, 1, 'there must be exactly one visible way into location setup');
});

test('1c. the entry is a labelled gear icon and draws no text in any language', async () => {
  for (const code of ['zh', 'en', 'jp']) {
    const { tree } = await page(fakeStorage({ language: code }));
    const entry = visibleNodes(tree).find((n) => n.props?.className === LOCATION_BUTTON_CLASS);
    // Nothing rendered inside it is text: the button holds the icon element
    // and nothing else, so there is no 定位 (or any other word) on screen.
    assert.equal(textOf(entry), '', `the entry must render no visible text in ${code}`);
    assert.equal(entry.props['aria-label'], STAFF_SETTINGS_LABELS[code],
      `the entry must be announced as ${STAFF_SETTINGS_LABELS[code]} in ${code}`);
    // An aria-label with nothing drawn under it is a control nobody can see.
    // The icon is a component (lucide's Settings), so it is checked by the
    // class the page dresses it with rather than by walking into it.
    const icon = walk(entry).find((n) => n.props?.className === ICON_CLASS);
    assert.ok(icon, `the entry must render the gear icon in ${code}`);
    assert.equal(String(icon.props['aria-hidden']), 'true', 'the glyph itself must not be announced twice');
  }
});

test('1c-2. the old 定位 wording is gone from the page entirely', async () => {
  const source = await read(SOURCE);
  const code = source.replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  assert.doesNotMatch(code, /定位|Location'|位置設定/, 'no 定位 label may survive in the rendered page');
  for (const lang of ['zh', 'en', 'jp']) {
    const { tree } = await page(fakeStorage({ language: lang }));
    for (const node of visibleNodes(tree)) {
      assert.doesNotMatch(textOf(node.props?.children ?? ''), /定位/, `visible text still reads 定位 in ${lang}`);
    }
  }
});

test('1d. no visible element carries the hidden staff hold handlers', async () => {
  const { tree } = await page();
  for (const node of visibleNodes(tree)) {
    assert.equal(typeof node.props?.onPointerDown, 'undefined',
      `a visible element carries the staff long-press: ${JSON.stringify(node.props?.className ?? node.type)}`);
  }
});

test('1e. nothing DRAWN advertises staff setup - the gear\'s aria-label is the one exemption', async () => {
  const { tree } = await page();
  for (const node of visibleNodes(tree)) {
    const isTheEntry = node.props?.className === LOCATION_BUTTON_CLASS;
    for (const field of ['aria-label', 'title', 'className', 'alt']) {
      const value = node.props?.[field];
      if (typeof value !== 'string') continue;
      // The gear's own aria-label is allowed to say 工作人員設定 and nothing
      // else is - including a `title` on that same button, which would put
      // the words back on screen as a hover tooltip.
      if (isTheEntry && field === 'aria-label') {
        assert.equal(value, STAFF_SETTINGS_LABEL, 'the entry carries exactly one approved label');
        continue;
      }
      assert.doesNotMatch(value, STAFF_WORDS, `visible ${field} advertises staff setup: ${value}`);
    }
    const text = typeof node.props?.children === 'string' ? node.props.children : '';
    assert.doesNotMatch(text, STAFF_WORDS, `visible text advertises staff setup: ${text}`);
  }
});

test('1f. the page source names /staff-setup exactly once', async () => {
  const source = await read(SOURCE);
  const code = source.replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  const hits = code.match(/['"`]\/staff-setup/g) ?? [];
  assert.equal(hits.length, 1, 'LanguageSelect must hold one route literal for the gear entry and no other');
});

test('1g. the gear entry is really styled, not an invisible element the walk can see', async () => {
  // src/pages/entryScreens.css is where this page's styling lives since the
  // global.css ownership cleanup. A class the renderer finds but the
  // stylesheet never positions is a control nobody on site can tap.
  const css = await read('src/pages/entryScreens.css');
  for (const rule of ['.language-location-entry', '.language-location-button', '.language-location-icon']) {
    assert.ok(css.includes(rule), `${rule} must be styled in entryScreens.css`);
  }
  const box = css.match(/\.language-location-entry\{([^}]*)\}/)?.[1] ?? '';
  // Top-right corner, which is where a host is told to look for it.
  assert.match(box, /top:[0-9.]+%/, 'the gear must be pinned near the top of the page');
  assert.ok(Number(box.match(/top:([0-9.]+)%/)[1]) < 10, 'the gear must sit in the TOP band, not mid-page');
  assert.match(box, /right:[0-9.]+%/, 'the gear must be pinned to the RIGHT edge');
  // A finger target, not just a glyph: 44px is the smallest square either
  // platform's guidance accepts, and the % width alone drops below that on a
  // narrow phone.
  assert.match(box, /min-width:44px/, 'the gear must keep a 44px floor on its tap target');
  assert.match(box, /min-height:44px/, 'the gear must keep a 44px floor on its tap target');
  // ...and it does not overlap the hidden 5s hold target, which owns the
  // LEFT 70% of the same top band. Both being in the corner region is fine;
  // both answering the same tap is not.
  const hidden = css.match(/\.scenario-selection-hidden-entry\{([^}]*)\}/)?.[1] ?? '';
  assert.match(hidden, /left:0/, 'the hidden hold target is still anchored left');
  const hiddenWidth = Number(hidden.match(/width:(\d+)%/)[1]);
  const entryRight = Number(box.match(/right:([0-9.]+)%/)[1]);
  const entryWidth = Number(box.match(/width:([0-9.]+)%/)[1]);
  assert.ok(100 - entryRight - entryWidth >= hiddenWidth,
    'the gear must start to the right of the hidden hold target, not on top of it');
  // The language options were not moved to make room for it.
  for (const [nth, top] of [[1, '41%'], [2, '60%'], [3, '79%']]) {
    assert.ok(css.includes(`.language-button-layer .scenario-overlay-button:nth-child(${nth}){top:${top}}`),
      `language button ${nth} must stay at ${top}`);
  }
});

// --- 2. the player-facing flow is untouched ----------------------------------

test('2a. the three language options are unchanged', async () => {
  const { tree } = await page();
  const buttons = languageButtons(tree);
  assert.equal(buttons.length, LANGUAGES.length, 'Language Select must offer exactly three options');
  assert.deepEqual(buttons.map(textOf), LANGUAGES.map((l) => l.label));
  // The gear is the only other button on the page - a fourth language
  // option, or any other control, is not.
  const all = visibleNodes(tree).filter((n) => n.type === 'button');
  assert.equal(all.length, LANGUAGES.length + 1, 'the page carries three languages plus the gear entry, nothing else');
});

test('2b. choosing a language stores it and enters the gesture tutorial', async () => {
  for (const { code, label } of LANGUAGES) {
    const { tree, storage, visited } = await page();
    const button = languageButtons(tree).find((n) => textOf(n) === label);
    assert.ok(button, `missing language option: ${label}`);

    button.props.onClick();
    assert.equal(storage.getItem('language'), code, `${label} must store language=${code}`);
    // The AR flow now starts with the gesture tutorial, which hands the
    // player on to /ar-scan itself (see pages/gestureTutorial/).
    assert.deepEqual(visited, ['/gesture-tutorial'], `${label} must enter the gesture tutorial and nowhere else`);
  }
});

test('2c. the stored language is reflected back as the active option', async () => {
  for (const { code, label } of LANGUAGES) {
    const { tree } = await page(fakeStorage({ language: code }));
    const active = languageButtons(tree).filter((n) => n.props.className.includes('is-active'));
    assert.equal(active.length, 1, `exactly one active option expected for ${code}`);
    assert.equal(textOf(active[0]), label);
  }
});

// --- 3. the hidden staff entry still works -----------------------------------

test('3a. holding the hidden entry for 5s opens /staff-setup', async () => {
  const { tree, visited } = await page();
  const entry = walk(tree).find((n) => n.props?.className === 'scenario-selection-hidden-entry');
  assert.ok(entry, 'the hidden staff entry must still exist');
  assert.equal(entry.props['aria-hidden'], 'true', 'the staff entry must stay hidden from the player');
  assert.equal(typeof entry.props.onPointerDown, 'function', 'the staff entry must still take a hold');

  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    entry.props.onPointerDown();
    assert.deepEqual(visited, [], 'the hold must not fire early');
    mock.timers.tick(5000);
    assert.deepEqual(visited, ['/staff-setup'], 'a completed hold must open staff setup');
  } finally {
    mock.timers.reset();
  }
});

test('3b. a normal tap on the hidden entry does nothing', async () => {
  const { tree, visited } = await page();
  const entry = walk(tree).find((n) => n.props?.className === 'scenario-selection-hidden-entry');

  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    for (const release of ['onPointerUp', 'onPointerLeave', 'onPointerCancel']) {
      entry.props.onPointerDown();
      mock.timers.tick(1000);
      entry.props[release]();
      mock.timers.tick(10000);
      assert.deepEqual(visited, [], `releasing via ${release} must cancel the hold`);
    }
  } finally {
    mock.timers.reset();
  }
});

test('3c. /staff-setup is still a registered route', async () => {
  assert.match(await read('src/routes.jsx'), /path: 'staff-setup'/,
    'the hidden entry must still lead to a real screen');
});

// --- 4. staff setup stays zh-TW only -----------------------------------------

// The fix is to take the staff screen out of the player-facing flow, not to
// translate it (AD-13 RESOLVED / BY DESIGN). Pinning this stops a future
// change from "fixing" the mismatch the other way round.
test('4. the staff screens are not wired into the player i18n layer', async () => {
  for (const file of ['StaffSetupScreen.jsx', 'StaffLocationSummary.jsx', 'StaffHandoffConfirm.jsx']) {
    const source = await read(`src/pages/staff/${file}`);
    assert.doesNotMatch(source, /\bfrom\s+['"][^'"]*i18n/, `${file} must stay zh-TW only`);
    assert.doesNotMatch(source, /getLanguage|useT\(|\bt\(/, `${file} must not follow the player's language`);
  }
});
