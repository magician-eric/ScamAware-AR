// MyDonDon (買東東) must stay a marketplace app: it renders whatever the
// scenario that mounts it hands in, and reports interactions back as
// marketplace events. It must not read or write Scenario 05's run state, and
// it must not know a single Scenario 05 route.
//
// Run with scripts/jsx-test-loader.mjs, which compiles the JSX and stubs the
// two Vite-only import.meta features the source uses (see that file).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// lib/lang.js reads the player's language from localStorage; nothing here
// depends on which language wins, only that reading it works.
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const APP = 'src/apps/mydondon';

const { Home } = await import('../src/apps/mydondon/screens/Home.jsx');
const { Listing } = await import('../src/apps/mydondon/screens/Listing.jsx');
const { ProductSelect } = await import('../src/apps/mydondon/screens/ProductSelect.jsx');
const { MyDonDonOrders } = await import('../src/apps/mydondon/screens/MyDonDonOrders.jsx');

const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

// Renders one screen far enough to reach its event handlers, with state
// hooks stubbed at their initial value. These screens hold no state worth
// simulating - what is being checked is which callback a tap reports back,
// not what the screen repaints afterwards.
const REACT_INTERNALS = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
function renderWithStubbedState(Component, props) {
  const previous = REACT_INTERNALS.H;
  REACT_INTERNALS.H = {
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: () => {},
    useMemo: (factory) => factory(),
    useCallback: (fn) => fn,
    useContext: () => null,
  };
  try {
    return Component(props);
  } finally {
    REACT_INTERNALS.H = previous;
  }
}

const TABLET = {
  id: 'tablet', name: '10.9 吋二手平板', desc: '功能正常，外觀有輕微使用痕跡',
  price: 'NT$12,000', assetLabel: '商品照：二手平板電腦', image: 'tablet.webp',
};

// Walks an element tree - expanding the plain, hook-free presentation
// components it meets on the way - and returns every element matching a
// test. Enough to reach the handlers a screen hangs on its buttons.
function findAll(node, predicate, found = []) {
  if (Array.isArray(node)) { node.forEach((child) => findAll(child, predicate, found)); return found; }
  if (!node || typeof node !== 'object') return found;
  if (predicate(node)) found.push(node);
  if (typeof node.type === 'function') {
    try {
      findAll(node.type(node.props), predicate, found);
      return found;
    } catch {
      // A component that needs a real renderer (state, effects) - its own
      // rendering is covered by the markup tests above.
    }
  }
  findAll(node.props?.children, predicate, found);
  return found;
}

const buttonsOf = (element) => findAll(element, (node) => node.type === 'button');

test('MyDonDon screens render from scenario-supplied props alone', () => {
  const feed = render(Home, {});
  assert.ok(feed.includes('把閒置變現金'));

  const picker = render(ProductSelect, { products: [TABLET] });
  assert.ok(picker.includes('選擇要出售的商品'));
  assert.ok(picker.includes('10.9 吋二手平板') && picker.includes('NT$12,000'));

  const listing = render(Listing, {
    listing: TABLET,
    incomingMessage: { sender: { name: '林小姐', avatarPath: 'a.webp' }, preview: '你好～', time: '19:43' },
    onOpenConversation: () => {},
  });
  assert.ok(listing.includes('10.9 吋二手平板') && listing.includes('NT$12,000'));
  // The notice is a delayed beat, so nothing about the sender is on screen yet.
  assert.ok(!listing.includes('林小姐'));

  // No listing handed in - nothing to present, and no redirect of its own.
  assert.equal(render(Listing, { listing: null }), '');
});

test('MyDonDon keeps the main 刊登 CTA live and makes footer navigation presentational', () => {
  const taps = [];
  const feed = Home({ onSellItem: () => taps.push('sell'), nav: { onMessages: () => taps.push('messages') } });
  const [sell] = buttonsOf(feed).filter((button) => button.props.className === 'md-home-sell');
  sell.props.onClick();
  assert.deepEqual(taps, ['sell']);

  const tabs = findAll(feed, (node) => node.props?.className?.startsWith('md-nav-btn'));
  assert.equal(tabs.length, 5);
  assert.ok(tabs.every((tab) => tab.type === 'div' && !tab.props.onClick && tab.props.tabIndex == null));
  assert.deepEqual(taps, ['sell']);
});

test('MyDonDon reports 刊登 selection and publication as marketplace events', async () => {
  const events = [];
  const picker = renderWithStubbedState(ProductSelect, {
    products: [TABLET],
    onProductSelected: (id) => events.push(`selected:${id}`),
    onListingPublished: (id) => events.push(`published:${id}`),
    onBack: () => events.push('back'),
  });
  const pick = buttonsOf(picker).find((button) => button.props.className?.startsWith('md-pick'));
  pick.props.onClick();
  assert.deepEqual(events, ['selected:tablet'], 'the choice is reported the moment it is made');
  // The publish beat is the same tap, after the selected state has been read.
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.deepEqual(events, ['selected:tablet', 'published:tablet']);
  buttonsOf(picker).find((button) => button.props.className === 'md-icon-btn').props.onClick();
  assert.deepEqual(events.at(-1), 'back');
});

test('MyDonDon answers an order lookup with what it was given, and reports the way back', () => {
  const events = [];
  // The official-order detour: MyDonDon has no order on file for this run.
  const empty = MyDonDonOrders({ orders: [], onBack: () => events.push('back') });
  const emptyMarkup = renderToStaticMarkup(empty);
  assert.ok(emptyMarkup.includes('目前沒有新的交易訂單'));
  assert.ok(emptyMarkup.includes('目前沒有任何買家透過 MyDonDon 對這件商品下單。'));
  // The header arrow is display-only; the explicit primary CTA is the one
  // route back to the caller.
  const backButtons = buttonsOf(empty).filter((button) => typeof button.props.onClick === 'function');
  assert.equal(backButtons.length, 1);
  backButtons.forEach((button) => button.props.onClick());
  assert.deepEqual(events, ['back']);

  // Given orders, it lists them instead - the empty state is data, not a
  // hard-coded screen.
  const filled = renderToStaticMarkup(MyDonDonOrders({ orders: [{ id: 'o1', title: '訂單 A', detail: '已成立' }] }));
  assert.ok(filled.includes('訂單 A') && filled.includes('已成立'));
  assert.ok(!filled.includes('目前沒有新的交易訂單'));
});

test('MyDonDon never touches Scenario 05 state, characters or routes', async () => {
  const files = [
    'screens/Home.jsx', 'screens/PhoneHome.jsx', 'screens/ProductSelect.jsx',
    'screens/Listing.jsx', 'screens/MyDonDonOrders.jsx',
    'components/MyDonDonBottomNav.jsx', 'components/MyDonDonPushNotice.jsx',
    'components/ChatScreen.jsx', 'components/MyDonDonHeader.jsx',
  ];
  for (const file of files) {
    const source = await read(`${APP}/${file}`);
    const imports = [...source.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
    for (const specifier of imports) {
      assert.doesNotMatch(specifier, /scenario\d+Store/i, `${file} imports a scenario store`);
      assert.doesNotMatch(specifier, /data\/scenario\d+/i, `${file} imports scenario data`);
      assert.doesNotMatch(specifier, /pages\/scenario\d+/i, `${file} imports a scenario page`);
    }
    // Route strings are Scenario 05 orchestration, not marketplace UI.
    assert.ok(!source.includes('/scenario05-atm'), `${file} knows a Scenario 05 route`);
    assert.ok(!source.includes('useNavigate'), `${file} navigates by itself`);
  }
});

test('Scenario 05 owns the marketplace wrappers that supply the data and the steps', async () => {
  const listing = await read('src/pages/scenario05/MarketplaceListing.jsx');
  assert.ok(listing.includes('getProduct(state.selectedProduct, lang)'));
  assert.ok(listing.includes('getBuyer(getBuyerId())'));
  assert.ok(listing.includes("navigate('/scenario05-atm/chat')"));

  const picker = await read('src/pages/scenario05/MarketplaceProductSelect.jsx');
  assert.ok(picker.includes('saveScenario05State({ selectedProduct: id })'));
  assert.ok(picker.includes("navigate('/scenario05-atm/listing')"));

  // No callback may smuggle a scenario step back into the app's vocabulary.
  const routes = await read('src/routes.jsx');
  assert.ok(!routes.includes("from './apps/mydondon'"), 'routes mount the scenario wrappers, not the app screens');
  for (const source of [listing, picker, await read('src/pages/scenario05/MarketplaceHome.jsx')]) {
    assert.doesNotMatch(source, /on(?:GoTo)?Scenario\d+/i);
  }
});
