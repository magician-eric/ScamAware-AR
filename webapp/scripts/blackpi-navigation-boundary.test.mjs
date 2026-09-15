// BlackPi (黑皮購物) is an App module inside Scenario 04: it renders the
// storefront and reports what the shopper did. Where any of that leads is the
// scenario's decision. #286 took the store out of the App; this file pins the
// other half - the App no longer knows that Scenario 04 has routes at all.
//
// The screens are rendered for real (scripts/jsx-test-loader.mjs, the same
// harness mydondon-boundary.test.mjs uses) and every button is pressed, so
// "the flow is unchanged" is checked as behaviour rather than as text: each
// screen must emit exactly the events listed here and nothing else. The route
// each event resolves to is then checked against the map Scenario 04 owns.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { promisify } from 'node:util';
import React from 'react';

import { BLACKPI_ROUTES } from '../src/pages/scenario04/blackpi/routes.js';

// The screens read the player's language and schedule their own timers;
// nothing here depends on either, only that reaching for them works.
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window = globalThis.window ?? {
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
};

const run = promisify(execFile);
const REPO = new URL('../', import.meta.url);
const SRC = new URL('src/', REPO);
const APP = new URL('apps/blackpi/', SRC);
const read = (path, base = SRC) => readFile(new URL(path, base), 'utf8');
const stripComments = (source) => source.replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

async function appSources(dir = '') {
  const out = [];
  for (const entry of await readdir(new URL(dir || '.', APP), { withFileTypes: true })) {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) out.push(...(await appSources(`${path}/`)));
    else if (/\.[jt]sx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

async function validateBoundaries() {
  try {
    const { stdout } = await run('node', ['scripts/validate-app-boundaries.mjs'], { cwd: REPO.pathname });
    return { ok: true, output: stdout };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

// --- rendering ---------------------------------------------------------------

// State hooks stubbed at their initial value: these screens hold no state
// worth simulating here - what is being checked is which event a tap reports,
// not what the screen repaints afterwards.
const REACT_INTERNALS = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
const STUBBED_HOOKS = {
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useRef: (initial) => ({ current: initial }),
  useEffect: () => {},
  useInsertionEffect: () => {},
  useLayoutEffect: () => {},
  useMemo: (factory) => factory(),
  useCallback: (fn) => fn,
  useContext: () => null,
};
function withStubbedHooks(body) {
  const previous = REACT_INTERNALS.H;
  REACT_INTERNALS.H = STUBBED_HOOKS;
  try { return body(); } finally { REACT_INTERNALS.H = previous; }
}

// Walks an element tree, expanding the presentation components it meets on
// the way (PhoneShell, BottomNav, ProductCard...), and collects every button.
function findButtons(node, found = []) {
  if (Array.isArray(node)) { node.forEach((child) => findButtons(child, found)); return found; }
  if (!node || typeof node !== 'object') return found;
  if (node.type === 'button') found.push(node);
  if (typeof node.type === 'function') {
    try { findButtons(node.type(node.props), found); return found; } catch { /* needs a real renderer */ }
  }
  findButtons(node.props?.children, found);
  return found;
}

// Renders a screen with a spy for every callback named in `events`, presses
// every button it draws, and returns the events that came back - callbacks
// first argument reduced to its product route, which is the only part of a
// payload any of these events carries.
function pressEveryButton(Component, props, events) {
  const seen = [];
  const spies = Object.fromEntries(events.map((name) => [
    name, (...args) => seen.push(args.length ? [name, args[0]?.route ?? args[0]] : [name]),
  ]));
  withStubbedHooks(() => {
    for (const button of findButtons(Component({ ...props, ...spies }))) button.props.onClick?.();
  });
  return seen;
}

const load = (path) => import(new URL(path, APP).pathname);
const { BottomNav } = await load('components/BottomNav.jsx');
const { Home } = await load('screens/Home.jsx');
const { Search } = await load('screens/Search.jsx');
const { SearchResults } = await load('screens/SearchResults.jsx');
const { ProductDetail } = await load('screens/ProductDetail.jsx');
const { Checkout } = await load('screens/Checkout.jsx');
const { PaymentSuccess } = await load('screens/PaymentSuccess.jsx');
const { Orders } = await load('screens/Orders.jsx');
const { OrderDetail } = await load('screens/OrderDetail.jsx');
const { Messages } = await load('screens/Messages.jsx');
const { Me } = await load('screens/Me.jsx');
const { Category } = await load('screens/Category.jsx');

const TAB_LABELS = ['首頁', '分類', '訊息', '訂單', '我的'];

// --- 1-3. the App knows no Scenario 04 route ---------------------------------

test('1. no BlackPi source names a scenario route', async () => {
  for (const path of await appSources()) {
    const code = stripComments(await read(path, APP));
    assert.doesNotMatch(code, /\/scenario\d+-/, `${path} must not name a scenario route`);
    assert.doesNotMatch(code, /\bAR\d+\b/, `${path} must not name a scenario step`);
  }
});

test('2. no BlackPi source imports a Scenario 04 page or route map', async () => {
  for (const path of await appSources()) {
    const source = await read(path, APP);
    for (const value of [...source.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((m) => m[1])) {
      assert.doesNotMatch(value, /pages\/scenario\d+/, `${path} must not import a scenario page`);
      assert.doesNotMatch(value, /scenario\d+Routes|blackpi\/routes/, `${path} must not import the scenario route map`);
    }
  }
});

test('3. no BlackPi source navigates; the App reports, the scenario routes', async () => {
  for (const path of await appSources()) {
    const source = await read(path, APP);
    assert.doesNotMatch(source, /from\s*['"]react-router/, `${path} must not import the router`);
    const code = stripComments(source);
    assert.doesNotMatch(code, /\buseNavigate\b|\bnavigate\(|\buseParams\b|\buseLocation\b|<NavLink|location\.pathname/,
      `${path} must not use the router`);
  }
});

// A prop or callback carrying a route is the same knowledge in a new place -
// onNavigate('/scenario04-shopping/orders') is not decoupling. Nor is a
// callback named after where it goes in the story rather than what happened.
test('no App prop or callback smuggles a route or a scenario step back in', async () => {
  for (const path of await appSources()) {
    const code = stripComments(await read(path, APP));
    for (const name of [...code.matchAll(/\bon[A-Z]\w*/g)].map((m) => m[0])) {
      assert.doesNotMatch(name, /scenario|AR\d|step\d|Scene|Chapter|Route$|Path$|Url$/i,
        `${path} declares a route-shaped callback: ${name}`);
    }
    assert.doesNotMatch(code, /\b(?:nextRoute|nextPath|targetRoute|routeTo|navigateTo)\b/,
      `${path} passes a route around instead of an event`);
  }
});

// --- 4. the bottom bar --------------------------------------------------------

test('4. the bottom bar reports nothing, and no screen wearing it can', async () => {
  // The bar draws all five tabs and offers none of them. It used to report the
  // tapped tab through onSelectTab and Scenario 04 turned that into a URL,
  // which is exactly how fake App chrome could carry a player out of the
  // scripted run; the whole mechanism is gone. Behaviour first: the bar draws
  // no button at all, so there is nothing for pressEveryButton to press.
  assert.deepEqual(pressEveryButton(BottomNav, { active: 'home' }, ['onSelectTab']), []);
  assert.equal(findButtons(BottomNav({ active: 'home' })).length, 0, 'a tab must not be a control');

  const bar = stripComments(await read('apps/blackpi/components/BottomNav.jsx'));
  assert.doesNotMatch(bar, /\bto:/, 'a tab must not carry a destination');
  assert.doesNotMatch(bar, /onSelectTab|onClick|onPointer|onTouch|onKey|tabIndex/,
    'a tab must not carry a handler or a tab stop');
  for (const label of TAB_LABELS) {
    assert.match(bar, new RegExp(label), `the bar lost the ${label} label`);
  }
  // Still scenery, not a removed footer: the labels above are drawn, and the
  // current screen's tab still paints as selected.
  assert.match(bar, /className=\{`bp-nav-btn\$\{isActive \? ' active' : ''\}`\}/,
    'the active tab must keep looking selected');

  // The shell has no callback left to pass through, and neither has any screen
  // that wears the bar: pressing every button each of them draws produces no
  // tab event, because there is no tab control on any of them.
  const shell = stripComments(await read('apps/blackpi/components/PhoneShell.jsx'));
  assert.doesNotMatch(shell, /onSelectTab/, 'the shell must not forward a tab handler');
  assert.match(shell, /<BottomNav active=\{nav\} \/>/, 'the shell tells the bar which tab to paint, and nothing else');

  for (const [name, Screen, props] of [
    ['Home', Home, {}],
    ['Orders', Orders, { order: { productRoute: 'health', status: 'paid' } }],
    ['Messages', Messages, { activeProductRoute: 'health' }],
    ['Me', Me, { activeProductRoute: 'health' }],
    ['Category', Category, {}],
  ]) {
    assert.deepEqual(pressEveryButton(Screen, props, ['onSelectTab']), [],
      `${name} must not report a tab`);
  }

  // ...and Scenario 04 no longer holds a map that could turn one into a URL.
  const routes = await import('../src/pages/scenario04/blackpi/routes.js');
  assert.equal('BLACKPI_TAB_ROUTES' in routes, false, 'the tab route map must stay gone');
  const hosts = stripComments(await read('pages/scenario04/blackpi/hosts.jsx'));
  assert.doesNotMatch(hosts, /BLACKPI_TAB_ROUTES|useTabNavigation|onSelectTab/,
    'no host may resolve a tab to a route again');
  // The five tab screens stay mounted and stay in the route map - what is gone
  // is the chrome that could reach them.
  for (const key of ['home', 'category', 'messages', 'orders', 'me']) {
    assert.equal(BLACKPI_ROUTES[key], `/scenario04-shopping/${key}`);
  }
});

// --- 5-13. every player flow lands where it always did -----------------------

// Every way out of every screen, as the screen reports it. Pressing every
// button a screen draws must produce exactly this list: a missing entry is a
// dead affordance, an extra one is a route the App decided to take itself.
const SCREEN_EVENTS = [
  // No ['onOpenSearch']: the 首頁 search pill is appearance only now, the same
  // as the pills on 搜尋 and 搜尋結果. The two hero cards are the whole screen.
  ['Home', Home, {}, [
    ['onSelectProduct', 'luckyBag'], ['onSelectProduct', 'health'],
  ]],
  ['Search', Search, {}, [
    ['onBack'],
    ['onSearchTerm', 'health'], ['onSearchTerm', 'luckyBag'],
    ['onSearchTerm', 'health'], ['onSearchTerm', 'luckyBag'],
  ]],
  ['SearchResults', SearchResults, { query: 'health' }, [
    ['onBack'], ['onSelectProduct', 'health'],
  ]],
  // No ['onBack'] here: the PDP draws no 返回 arrow, so 賣家聊聊 and 直接購買
  // are the only two ways off it - the same two the AR contract declares.
  ['ProductDetail', ProductDetail, { productRoute: 'health' }, [
    ['onContactSeller', 'health'], ['onBuy', 'health'],
  ]],
  ['Checkout', Checkout, { productRoute: 'health' }, [
    ['onBack'], ['onConfirmPayment', 'health'],
  ]],
  ['PaymentSuccess', PaymentSuccess, {}, [['onViewOrder']]],
  ['Orders', Orders, { order: { productRoute: 'health', status: 'paid' } }, [
    ['onOpenOrder', 'health'],
  ]],
  ['OrderDetail (已送達)', OrderDetail, { productRoute: 'health', order: { id: 'o', status: 'delivered', createdAt: 1 } }, [
    ['onBackToOrders'], ['onOpenUnboxing'],
  ]],
  ['OrderDetail (售後進行中)', OrderDetail, { productRoute: 'health', order: { id: 'o', status: 'delivered', createdAt: 1, disputeStatus: 'requested' } }, [
    ['onBackToOrders'], ['onContactSeller'],
  ]],
  ['Messages', Messages, { activeProductRoute: 'health' }, [
    ['onOpenSellerChat'], ['onOpenSupport'],
  ]],
  ['Me', Me, { activeProductRoute: 'health' }, [
    ['onOpenRefundCenter'], ['onOpenSupport'],
  ]],
];

// event -> the Scenario 04 route the host turns it into, i.e. the exact
// navigation the screen used to perform itself.
const EVENT_ROUTES = {
  onSelectProduct: ['product', '/scenario04-shopping/product/health'],
  onContactSellerFromPdp: ['sellerChat', '/scenario04-shopping/seller-chat/health'],
  onBuy: ['checkout', '/scenario04-shopping/checkout/health'],
  onConfirmPayment: ['paymentSuccess', '/scenario04-shopping/payment-success/health'],
  onViewOrder: ['order', '/scenario04-shopping/order/health'],
  onOpenOrder: ['order', '/scenario04-shopping/order/health'],
  onOpenUnboxing: ['unboxing', '/scenario04-shopping/unboxing/health'],
  onContactSeller: ['disputeChat', '/scenario04-shopping/dispute-chat/health'],
  onOpenSellerChat: ['sellerChat', '/scenario04-shopping/seller-chat/health'],
  onOpenSupport: ['platformSupport', '/scenario04-shopping/platform-support/health'],
  onOpenRefundCenter: ['refundCenter', '/scenario04-shopping/refund-center/health'],
  onBackToOrders: ['orders', '/scenario04-shopping/orders'],
  onGoHome: ['home', '/scenario04-shopping/home'],
  onIntroComplete: ['home', '/scenario04-shopping/home'],
  onSearchTerm: ['searchResults', '/scenario04-shopping/search-results/health'],
};

test('5-13. every screen still offers exactly the same ways out, as events', () => {
  for (const [name, Screen, props, expected] of SCREEN_EVENTS) {
    const events = [...new Set(expected.map(([event]) => event))];
    assert.deepEqual(pressEveryButton(Screen, props, events), expected, `${name} reports the wrong events`);
  }
});

test('5-13. the splash still advances on its own beat and only reports it', async () => {
  const splash = stripComments(await read('apps/blackpi/screens/Splash.jsx'));
  assert.match(splash, /const SPLASH_HOLD_MS = 1100;/, 'the 1.1s hold is the product behaviour');
  assert.match(splash, /setTimeout\(\(\) => advance\.current\?\.\(\), SPLASH_HOLD_MS\)/);
  assert.match(splash, /advance\.current = onIntroComplete/, 'an inline host arrow must not restart the beat');
});

test('5-13. Scenario 04 maps each event back to the route it used to navigate to', async () => {
  for (const [event, [key, expected]] of Object.entries(EVENT_ROUTES)) {
    const target = BLACKPI_ROUTES[key];
    const actual = typeof target === 'function' ? target('health') : target;
    assert.equal(actual, expected, `${event} must still resolve to ${expected}`);
  }
  assert.equal(BLACKPI_ROUTES.product('luckyBag'), '/scenario04-shopping/product/luckyBag');
  assert.equal(BLACKPI_ROUTES.searchResults('luckyBag'), '/scenario04-shopping/search-results/luckyBag');

  // Every route the map hands out is a route routes.jsx actually mounts.
  const routes = await read('routes.jsx');
  const declared = new Set([...routes.matchAll(/path: '([^']+)'/g)].map((m) => `/${m[1]}`));
  for (const value of Object.values(BLACKPI_ROUTES)) {
    const path = typeof value === 'function' ? value(':route') : value;
    assert.ok(declared.has(path), `${path} is not a registered route`);
  }
});

test('5-13. the host wires every event to its route, and nothing else holds one', async () => {
  const hosts = stripComments(await read('pages/scenario04/blackpi/hosts.jsx'));
  const wired = new Set(Object.keys(EVENT_ROUTES).map((e) => e.replace('FromPdp', '')));
  for (const event of wired) {
    assert.match(hosts, new RegExp(`${event}=\\{${event}\\}`), `${event} must be wired up`);
  }
  for (const [key] of Object.values(EVENT_ROUTES)) {
    assert.match(hosts, new RegExp(`BLACKPI_ROUTES\\.${key}\\b`), `nothing resolves BLACKPI_ROUTES.${key}`);
  }
  assert.match(hosts, /navigate\(BLACKPI_ROUTES\.home, \{ replace: true \}\)/, 'the splash still replaces its history entry');
  // 返回 stays a history step, not a route.
  assert.match(hosts, /const onBack = useCallback\(\(\) => navigate\(-1\), \[navigate\]\);/);

  // routes.js is the only module holding the literals; the store adapter
  // stayed about state.
  assert.match(await read('pages/scenario04/blackpi/routes.js'), /export const BLACKPI_ROUTES/);
  assert.doesNotMatch(stripComments(await read('pages/scenario04/blackpi/appState.js')), /\/scenario\d+-/,
    'the store adapter owns state, not routes');
});

// --- 14. #286 store boundary must not regress --------------------------------

test('14. BlackPi still never touches the Scenario 04 store', async () => {
  for (const path of await appSources()) {
    const source = await read(path, APP);
    for (const value of [...source.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((m) => m[1])) {
      assert.doesNotMatch(value, /(?:^|\/)(?:shoppingStore|scenario\d+Store)(?:\.[mc]?[jt]sx?)?$/i,
        `${path} must not import a scenario store`);
    }
    assert.doesNotMatch(stripComments(source), /getShoppingState|saveShoppingState|useShoppingState/,
      `${path} must not read or write the run state`);
  }
});

// --- the validator is what keeps all of this true ----------------------------

test('validate:boundaries passes on the tree as it stands', async () => {
  const result = await validateBoundaries();
  assert.ok(result.ok, `validate:boundaries should pass:\n${result.output}`);
  assert.match(result.output, /App\/scenario boundaries OK/);
});

// The rules are driven against the real validator with real files on disk,
// never a copy of its regexes, so a rule and its test cannot drift apart.
async function withFixture(name, body, check) {
  const dir = new URL('apps/blackpi/__boundary_fixture__/', SRC);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL(name, dir), body);
  try {
    await check(await validateBoundaries());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('validate:boundaries fails if BlackPi reaches for a scenario route again', async () => {
  const fixtures = [
    ['Regression1.jsx', "export const TAB = { to: '/scenario04-shopping/orders' };", /names a scenario route/],
    ['Regression2.jsx', "const go = (n) => `/scenario04-shopping/product/${n}`;\nexport { go };", /names a scenario route/],
    ['Regression3.jsx', 'export const NEXT = "/scenario04-shopping";', /names a scenario route/],
    ['Regression4.jsx', "import { BLACKPI_ROUTES } from '../../pages/scenario04/blackpi/routes';\nexport { BLACKPI_ROUTES };", /imports scenario/],
    ['Regression5.jsx', "import { useNavigate } from 'react-router-dom';\nexport const use = () => useNavigate();", /app navigates/],
    ['Regression6.jsx', 'export function go(navigate, to) { navigate(to); }', /app navigates/],
  ];
  for (const [name, body, expected] of fixtures) {
    await withFixture(name, body, (result) => {
      assert.equal(result.ok, false, `${name} should have failed validate:boundaries`);
      assert.match(result.output, expected, `${name} should be reported`);
      assert.match(result.output, new RegExp(name), `${name} should be named in the violation`);
    });
  }
  // ...and the tree is clean again afterwards.
  assert.ok((await validateBoundaries()).ok);
});

// --- telling a comment from a `//` that is not one ---------------------------
//
// Deciding where a comment starts means tracking strings, and getting it wrong
// drops everything after the mistaken `//` - so a route later on the SAME line
// vanishes and the rule reports nothing. Each case below is therefore written
// twice: once as two statements on one line, which is what actually exercises
// the parse, and once split over two lines, which must fail either way.
const NOT_A_COMMENT = [
  ['a protocol-relative URL', "const cdn = '//cdn.example/x';"],
  ['an https:// scheme', 'const cdn = "https://cdn.example/x";'],
  ['an http:// scheme', "const cdn = 'http://cdn.example/x';"],
  ['a template literal', 'const value = `//cdn.example/x`;'],
  ['a template literal holding an expression', 'const value = `//cdn.example/${id}`;'],
  ['a `//` inside a template expression', "const value = `x${cdn || '//cdn.example/x'}y`;"],
  ['`//` as ordinary text in a string', "const x = 'abc // not comment';"],
  ['an escaped quote before the `//`', "const x = 'it\\'s // fine';"],
  ['a string ending in an escaped backslash', "const x = 'ends with a backslash\\\\';"],
];
const ROUTE = "const next = '/scenario04-shopping/me';";

test('a `//` inside a string never hides a route later on the line', async () => {
  for (const [what, prelude] of NOT_A_COMMENT) {
    for (const [shape, body] of [['same line', `${prelude} ${ROUTE}`], ['next line', `${prelude}\n${ROUTE}`]]) {
      await withFixture('NotAComment.jsx', `${body}\nexport { next };`, (result) => {
        assert.equal(result.ok, false, `${what}, ${shape}: the route must still be caught`);
        assert.match(result.output, /names a scenario route/, `${what}, ${shape}: should be reported as a route`);
        assert.match(result.output, /NotAComment\.jsx/, `${what}, ${shape}: should name the file`);
      });
    }
  }
});

// A comment may still explain which URLs a screen is mounted on - the rule is
// about what the code does, not what its author is allowed to write down.
test('validate:boundaries leaves comments, prose and App-owned paths alone', async () => {
  const allowed = [
    ['a line comment quoting a route', "// '/scenario04-shopping/me'"],
    ['a line comment naming a route', '// Mounted by the host on /scenario04-shopping/home.'],
    ['a block comment quoting a route', "/*\n  '/scenario04-shopping/me'\n*/"],
    ['a route-shaped path inside a real URL', "export const X = 'https://example.com/scenario04-shopping-not-a-route';"],
    ['an App-owned asset path', "export const ASSET = '/assets/scenario04-hero.png';"],
    // The App's own dictionary. A scenario-named one is refused now, but by
    // the AD-14 localization rule, not by the route rule - see
    // 'an App may not import a Scenario dictionary' below.
    ['the App dictionary, which is not a route', "import { useT } from '../i18n';\nexport { useT };"],
    ['a plain scenario key', "export const KEY = 'scenario04';"],
    // A `${ ... }` expression is code again, so a comment inside one is still
    // a comment - which only holds if the walk descends into the expression
    // rather than skipping to the closing backtick.
    ['a comment inside a template expression', "export const V = `x${/* '/scenario04-shopping/me' */ 1}y`;"],
    // The three below are the mirror image of the cases above: here the `//`
    // really does start a comment, and the string before it must not swallow
    // it. An escape handled wrongly would leave the quoted route inside a
    // "string" and fail this.
    ['a comment after a protocol-relative URL', "export const A = '//cdn.example/x'; // '/scenario04-shopping/me'"],
    ['a comment after an escaped quote', "export const B = 'it\\'s fine'; // '/scenario04-shopping/me'"],
    ['a comment after an escaped backslash', "export const C = 'ends\\\\'; // '/scenario04-shopping/me'"],
  ];
  for (const [what, body] of allowed) {
    await withFixture('Allowed.jsx', body, (result) => {
      assert.ok(result.ok, `${what} must pass:\n${result.output}`);
    });
  }
});

// The scanner is not a JS parser, and the one thing it must never do is fail
// quietly: anything it cannot follow is handed back unstripped, so a bad parse
// over-reports rather than letting a route through. A regex character class -
// the construct most easily mistaken for a string - is the case in point.
test('a source the scanner cannot parse is still checked, not skipped', async () => {
  await withFixture('HardToParse.jsx', [
    "const QUOTES = /['\"]/;",
    "export const next = '/scenario04-shopping/me';",
  ].join('\n'), (result) => {
    assert.equal(result.ok, false, 'the route must still be caught');
    assert.match(result.output, /names a scenario route/);
  });
});
