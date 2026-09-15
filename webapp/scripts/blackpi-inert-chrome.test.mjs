// BlackPi's fake App chrome, pinned inert against all three inputs.
//
// Scenario 04 puts the player inside 黑皮購物, a storefront that has to read as
// a real shopping App - a five-tab footer (首頁/分類/訊息/訂單/我的), a search
// pill, a header, a member page, a category grid. None of that is the story.
// The story is the two hero products, 賣家聊聊, 直接購買, 確認付款 and the
// 售後 chain that follows; everything else is scenery, and a player who can
// press scenery can walk out of the scripted run.
//
// The bar used to report the tapped tab (`onSelectTab`) and Scenario 04 turned
// that into one of five URLs; 首頁's search pill used to be a real button that
// opened 搜尋. Both are gone. This suite is what keeps them gone, and it checks
// the three inputs CIBAR actually ships against the same rule:
//
//   * pointer  - no control element, no handler, no tab stop, and CSS that
//                takes the pointer events away as a second lock;
//   * gesture  - the AR Interaction Contract each screen declares names only
//                its story actions, so LEFT/RIGHT can never reach the chrome;
//   * keyboard - nothing focusable and nothing editable to type into.
//
// The complement of scripts/gesture-never-replaces-pointer.test.mjs: that one
// says every declared story action must also be reachable by a finger, this
// one says the deliberately closed chrome must stay unreachable by every input
// - so a pointer-accessibility guard can never be satisfied by re-wiring a
// piece of chrome. Both product lines (health / luckyBag) run the same shared
// shell, and both are walked here.
//
// Run: npm run test:blackpi-inert-chrome
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import React from 'react';

import { mountSurface } from './ar-surface-harness.mjs';

const storage = () => {
  let data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    clear: () => { data = {}; },
    get length() { return Object.keys(data).length; },
    key: (i) => Object.keys(data)[i] ?? null,
  };
};
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = globalThis.window ?? globalThis;

const { AR_GESTURES, performARInteraction, resetARInteractionContract } =
  await import('../src/lib/arInteraction/index.js');
const { LEFT, RIGHT } = AR_GESTURES;

const src = (p) => readFile(new URL(`../src/${p}`, import.meta.url), 'utf8');
const stripComments = (source) => source.replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

const TAB_LABELS = ['首頁', '分類', '訊息', '訂單', '我的'];

// --- walking a mounted screen ------------------------------------------------
//
// mountSurface calls the screen's own function, so its hooks (and its AR
// contract declaration) run for real while its children stay uninvoked React
// elements. Presentational children are therefore expanded by hand, which is
// what reaches PhoneShell -> BottomNav.
//
// Those children hold hooks of their own (PhoneShell calls useStageClassName),
// so the expansion runs under a dispatcher that pins every hook at its initial
// value - the same technique blackpi-navigation-boundary.test.mjs uses. What
// is being read here is the markup a screen paints, not what it repaints after
// a tap.
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

function walk(node, out) {
  if (Array.isArray(node)) { node.forEach((n) => walk(n, out)); return out; }
  if (!React.isValidElement(node)) return out;
  out.push(node);
  // A component's children reach the tree through its own render output
  // (PhoneShell puts them next to the footer), so descending into both would
  // count every child twice.
  if (typeof node.type === 'function') {
    try { walk(node.type(node.props), out); } catch { /* needs a real renderer */ }
    return out;
  }
  React.Children.toArray(node.props?.children).forEach((n) => walk(n, out));
  return out;
}

function expand(node, out = []) {
  const previous = REACT_INTERNALS.H;
  REACT_INTERNALS.H = STUBBED_HOOKS;
  try { return walk(node, out); } finally { REACT_INTERNALS.H = previous; }
}

const classesOf = (node) => String(node.props?.className ?? '');
const handlersOf = (node) => Object.keys(node.props ?? {})
  .filter((k) => /^on[A-Z]/.test(k) && node.props[k] != null);
const textOf = (node) => expand(node)
  .flatMap((el) => React.Children.toArray(el.props?.children).filter((c) => typeof c === 'string'))
  .join('');

const SCREENS = ['Home', 'Category', 'Messages', 'Orders', 'Me'];
const PROPS = {
  Home: { onSelectProduct() {} },
  Category: {},
  Messages: { activeProductRoute: 'health', onOpenSellerChat() {}, onOpenSupport() {} },
  Orders: { order: { productRoute: 'health', status: 'paid', total: 1 }, onOpenOrder() {} },
  Me: { activeProductRoute: 'health', onOpenRefundCenter() {}, onOpenSupport() {} },
};

async function mount(name, overrides = {}) {
  const module = await import(`../src/apps/blackpi/screens/${name}.jsx`);
  return mountSurface(module[name], { ...PROPS[name], ...overrides });
}

// The footer as the screen actually renders it, tab elements and all.
function footerOf(page) {
  const nodes = expand(page.output);
  const bar = nodes.find((n) => /bp-bottom-nav/.test(classesOf(n)));
  const tabs = nodes.filter((n) => /\bbp-nav-btn\b/.test(classesOf(n)));
  return { bar, tabs };
}

// =============================================================================
// 1. the footer: five tabs, none of them a control
// =============================================================================

test('every screen wearing the bar draws all five tabs, and none is interactive', async () => {
  for (const name of SCREENS) {
    const page = await mount(name);
    try {
      const { bar, tabs } = footerOf(page);
      assert.ok(bar, `${name}: the footer must still be drawn - hiding it is not the fix`);
      assert.equal(tabs.length, 5, `${name}: the bar must still show all five tabs`);

      const labels = tabs.map((tab) => textOf(tab));
      for (const label of TAB_LABELS) {
        assert.ok(labels.some((text) => text.includes(label)), `${name}: the bar lost ${label}`);
      }

      for (const [i, tab] of tabs.entries()) {
        const where = `${name}/${TAB_LABELS[i]}`;
        // No pointer path: not a control element, no handler of any kind
        // (click, pointer, touch, mouse, key), and not in the tab order.
        assert.notEqual(tab.type, 'button', `${where} must not be a button element`);
        assert.notEqual(tab.type, 'a', `${where} must not be a link`);
        assert.deepEqual(handlersOf(tab), [], `${where} must carry no handler`);
        assert.equal(tab.props.tabIndex, undefined, `${where} must not be focusable`);
        assert.equal(tab.props.role, undefined, `${where} must not claim a control role`);
        assert.equal(tab.props.href ?? tab.props.to, undefined, `${where} must not carry a destination`);
        assert.equal(tab.props['aria-hidden'], 'true', `${where} must be hidden from assistive tech`);
      }

      // The visual selection survives: on 首頁, 首頁 is the highlighted tab.
      const active = tabs.filter((tab) => /\bactive\b/.test(classesOf(tab)));
      assert.equal(active.length, 1, `${name}: exactly one tab paints as selected`);
    } finally {
      page.unmount();
    }
  }
});

test('nothing can hand the bar a tab handler, at any layer', async () => {
  const bar = stripComments(await src('apps/blackpi/components/BottomNav.jsx'));
  assert.doesNotMatch(bar, /onSelectTab|onClick|onPointer|onTouch|onMouse|onKey|tabIndex|role=/,
    'BottomNav must carry no control semantics');
  assert.doesNotMatch(bar, /useNavigate|navigate\(|\bto:|href/, 'and no destination');
  assert.match(bar, /export function BottomNav\(\{ active \}\)/, 'its whole interface is which tab to paint');

  const shell = stripComments(await src('apps/blackpi/components/PhoneShell.jsx'));
  assert.doesNotMatch(shell, /onSelectTab/, 'PhoneShell must not forward a tab handler');

  const hosts = stripComments(await src('pages/scenario04/blackpi/hosts.jsx'));
  assert.doesNotMatch(hosts, /onSelectTab|useTabNavigation|BLACKPI_TAB_ROUTES/,
    'no Scenario 04 host may resolve a tab to a route');

  const routes = await import('../src/pages/scenario04/blackpi/routes.js');
  assert.equal('BLACKPI_TAB_ROUTES' in routes, false, 'the tab route map must stay gone');

  for (const name of SCREENS) {
    const source = stripComments(await src(`apps/blackpi/screens/${name}.jsx`));
    assert.doesNotMatch(source, /onSelectTab/, `${name} must not take a tab callback`);
  }
});

test('the CSS is the second lock: the bar takes no pointer events', async () => {
  const css = await src('apps/blackpi/styles/index.css');
  assert.match(css, /\.bp-bottom-nav\{[^}]*pointer-events:none/, 'the whole bar is inert to pointer input');
  assert.match(css, /\.bp-bottom-nav\{[^}]*user-select:none/, 'and cannot be dragged like text');
  assert.match(css, /\.bp-nav-btn\{[^}]*cursor:default/, 'a tab shows no pointer affordance');
  assert.match(css, /\.bp-nav-btn\{[^}]*pointer-events:none/, 'and takes no pointer events of its own');
  assert.match(css, /\.bp-nav-btn\.active\{color:var\(--bp-primary-dark\);font-weight:700\}/,
    'the selected tab still looks selected - that part was always the point');
});

// =============================================================================
// 2. the search bar: appearance only, on every screen that draws one
// =============================================================================

const SEARCH_SCREENS = [
  ['首頁', 'Home', { onSelectProduct() {} }],
  ['搜尋', 'Search', { onSearchTerm() {}, onBack() {} }],
  ['搜尋結果(health)', 'SearchResults', { query: 'health', onSelectProduct() {}, onBack() {} }],
  ['搜尋結果(luckyBag)', 'SearchResults', { query: 'luckyBag', onSelectProduct() {}, onBack() {} }],
];

test('no search bar in BlackPi can be focused, typed into, pressed or submitted', async () => {
  for (const [label, file, props] of SEARCH_SCREENS) {
    const module = await import(`../src/apps/blackpi/screens/${file}.jsx`);
    const page = mountSurface(module[file], props);
    try {
      const nodes = expand(page.output);

      // Nothing that can raise a keyboard or hold a caret. `readOnly` is not
      // enough and is deliberately not used: a readOnly field still focuses
      // and still opens the on-screen keyboard on iOS and Android.
      const editable = nodes.filter((n) => ['input', 'textarea', 'select'].includes(n.type));
      assert.equal(editable.length, 0, `${label}: no editable control may exist`);
      assert.equal(nodes.filter((n) => n.type === 'form').length, 0, `${label}: nothing to submit`);
      assert.equal(nodes.filter((n) => n.props?.contentEditable).length, 0, `${label}: nothing contenteditable`);

      const bar = nodes.find((n) => /bp-searchbar/.test(classesOf(n)));
      assert.ok(bar, `${label}: the pill is still drawn`);
      assert.notEqual(bar.type, 'button', `${label}: the pill must not be a control element`);
      assert.deepEqual(handlersOf(bar), [], `${label}: the pill must carry no handler`);
      assert.equal(bar.props.tabIndex, undefined, `${label}: the pill must not be focusable`);
      assert.equal(bar.props.role, undefined, `${label}: the pill must not claim a control role`);
      assert.match(classesOf(bar), /is-decorative/, `${label}: is-decorative is what removes the pointer events`);
      assert.ok(textOf(bar).length > 0, `${label}: the placeholder copy is what makes it read as a search bar`);
    } finally {
      page.unmount();
    }
  }
});

test('the whole storefront holds no editable control and no form', async () => {
  for (const name of ['Home', 'Search', 'SearchResults', 'ProductDetail', 'Checkout',
    'Orders', 'OrderDetail', 'Messages', 'Me', 'Category', 'PaymentSuccess', 'Splash']) {
    const source = await src(`apps/blackpi/screens/${name}.jsx`);
    assert.doesNotMatch(source, /<(input|textarea|select|form)[\s/>]/, `${name} must not render an editable control`);
    assert.doesNotMatch(stripComments(source), /\breadOnly\b/,
      `${name}: readOnly is not how BlackPi makes a field inert - it has no fields`);
  }
});

test('the CSS is the second lock for the pill too', async () => {
  const css = await src('apps/blackpi/styles/index.css');
  assert.match(css, /\.bp-searchbar\.is-decorative\{[^}]*pointer-events:none/, 'an inert pill takes no pointer events');
  assert.match(css, /\.bp-searchbar\{[^}]*cursor:default/, 'and shows no pointer affordance');
});

// =============================================================================
// 3. gesture: LEFT / RIGHT can never reach a piece of chrome
// =============================================================================
//
// The AR bridge does not scan the DOM - it performs whatever the mounted
// screen declared to the contract. So "a gesture cannot press a tab" is proved
// by firing both gestures at each screen and reading back what ran: either
// nothing (a `display` surface) or exactly the screen's own story actions,
// never a tab and never the search pill.

const GESTURE_EXPECTATIONS = [
  // screen, extra props, what LEFT and RIGHT are allowed to do
  ['Home', {}, ['product:luckyBag', 'product:health']],
  ['Category', {}, []],
  ['Messages', {}, []],
  ['Orders', {}, []],
  ['Me', {}, []],
];

test('LEFT and RIGHT on a chrome-bearing screen never navigate the chrome', async () => {
  for (const [name, extra, allowed] of GESTURE_EXPECTATIONS) {
    resetARInteractionContract();
    const fired = [];
    const spies = {
      onSelectProduct: (p) => fired.push(`product:${p?.route}`),
      onOpenSellerChat: () => fired.push('sellerChat'),
      onOpenSupport: () => fired.push('support'),
      onOpenOrder: () => fired.push('order'),
      onOpenRefundCenter: () => fired.push('refundCenter'),
      // The tab callback no longer exists; passing one anyway proves that even
      // a screen handed a tab handler has nothing that would call it.
      onSelectTab: (tab) => fired.push(`TAB:${tab}`),
      onOpenSearch: () => fired.push('SEARCH'),
    };
    const page = await mount(name, { ...extra, ...spies });
    try {
      performARInteraction(LEFT);
      performARInteraction(RIGHT);
      assert.deepEqual(fired.filter((e) => e.startsWith('TAB:')), [],
        `${name}: a gesture reached the tab bar`);
      assert.deepEqual(fired.filter((e) => e === 'SEARCH'), [],
        `${name}: a gesture reached the search bar`);
      if (allowed.length) {
        assert.deepEqual(fired, allowed, `${name}: a gesture must run exactly the screen's story actions`);
      }
    } finally {
      page.unmount();
      resetARInteractionContract();
    }
  }
});

test('no BlackPi surface declares a tab, a search pill or a header icon as a gesture action', async () => {
  const { AR_MIGRATION_INVENTORY } = await import('./ar-interaction-migration-inventory.mjs');
  const CHROME = /首頁分頁|分類分頁|訊息分頁|訂單分頁|我的分頁|搜尋列|搜尋欄|通知鈴|BottomNav 按鈕/;
  for (const row of AR_MIGRATION_INVENTORY.filter((r) => r.scenario === 'scenario04')) {
    for (const side of [row.left, row.right, row.action].filter(Boolean)) {
      assert.doesNotMatch(String(side), CHROME, `${row.surfaceId} declares chrome as a gesture action: ${side}`);
    }
  }
});

// =============================================================================
// 4. the story actions the chrome pass must not have taken with it
// =============================================================================
//
// "Seal the chrome" is only half the rule. The other half is that every
// control the run actually needs still works under a finger, and does the same
// thing a gesture does - on both product lines, through the one shared shell.

test('the two hero products still open their PDP under a pointer', async () => {
  for (const [index, expected] of [[0, 'luckyBag'], [1, 'health']]) {
    const opened = [];
    const page = await mount('Home', { onSelectProduct: (p) => opened.push(p.route) });
    try {
      // The host <button> ProductCard paints, not the ProductCard element
      // above it - expand() returns both.
      const cards = expand(page.output)
        .filter((n) => n.type === 'button' && /bp-product-card/.test(classesOf(n)));
      assert.equal(cards.length, 2, '首頁 draws exactly the two story products');
      cards[index].props.onClick();
      assert.deepEqual(opened, [expected], 'the card opens its own product line');
    } finally {
      page.unmount();
    }
  }
});

test('both product lines keep 賣家聊聊 and 直接購買 under a pointer and under a gesture', async () => {
  const { ProductDetail } = await import('../src/apps/blackpi/screens/ProductDetail.jsx');
  for (const route of ['health', 'luckyBag']) {
    // pointer
    const pressed = [];
    let page = mountSurface(ProductDetail, {
      productRoute: route,
      onContactSeller: (p) => pressed.push(`chat:${p?.route}`),
      onBuy: (p) => pressed.push(`buy:${p?.route}`),
    });
    try {
      const buttons = expand(page.output).filter((n) => n.type === 'button');
      const chat = buttons.find((b) => /bp-pdp-chat-btn/.test(classesOf(b)));
      const buy = buttons.find((b) => /bp-pdp-buy-btn/.test(classesOf(b)));
      assert.ok(chat && buy, `${route}: the PDP keeps both story CTAs`);
      chat.props.onClick();
      buy.props.onClick();
      assert.deepEqual(pressed, [`chat:${route}`, `buy:${route}`]);
    } finally {
      page.unmount();
    }

    // gesture - the same two actions, same order
    resetARInteractionContract();
    const waved = [];
    page = mountSurface(ProductDetail, {
      productRoute: route,
      onContactSeller: (p) => waved.push(`chat:${p?.route}`),
      onBuy: (p) => waved.push(`buy:${p?.route}`),
    });
    try {
      performARInteraction(LEFT);
      performARInteraction(RIGHT);
      assert.deepEqual(waved, [`chat:${route}`, `buy:${route}`],
        `${route}: LEFT is 賣家聊聊 and RIGHT is 直接購買, exactly as a finger has them`);
    } finally {
      page.unmount();
      resetARInteractionContract();
    }
  }
});

test('the story chain past the PDP still has its buttons', async () => {
  const { Checkout } = await import('../src/apps/blackpi/screens/Checkout.jsx');
  const { PaymentSuccess } = await import('../src/apps/blackpi/screens/PaymentSuccess.jsx');
  for (const route of ['health', 'luckyBag']) {
    const paid = [];
    const checkout = mountSurface(Checkout, { productRoute: route, onConfirmPayment: (p) => paid.push(p?.route), onBack() {} });
    try {
      const confirm = expand(checkout.output)
        .filter((n) => n.type === 'button')
        .find((b) => /確認付款/.test(textOf(b)) || /bp-btn-block/.test(classesOf(b)));
      assert.ok(confirm, `${route}: 確認付款 must stay pressable`);
      confirm.props.onClick();
      assert.deepEqual(paid, [route]);
    } finally {
      checkout.unmount();
    }
  }

  const viewed = [];
  const success = mountSurface(PaymentSuccess, { onViewOrder: () => viewed.push('order') });
  try {
    expand(success.output).filter((n) => n.type === 'button').forEach((b) => b.props.onClick());
    assert.deepEqual(viewed, ['order'], '查看訂單 must stay pressable');
  } finally {
    success.unmount();
  }
});
