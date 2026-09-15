// Regression cover for the Final Audit's remaining Scenario 04 batch.
//
// Every block below exists for one recurring defect: a Scenario 04 screen
// showing the player something that looks pressable but is not part of the
// story - and, on the other side of the same coin, a screen whose two real
// story actions have to stay reachable, in the geometry the AR Interaction
// Contract promises.
//
// AUD-07 (PR #332) fixed two instances of this on the PDP (分享 / 加入收藏)
// and recorded a third it deliberately left - the shop row's 「進入商店」.
// This suite covers that one and the rest of the same family, plus the search
// bar's "appearance only" rule and the dual-choice geometry the whole
// 售前對話 → 退款/爭議 → 平台客服 chain depends on.
//
// Run through scripts/register-gesture-contract-loaders.mjs, which compiles
// the app's JSX and stubs react-router-dom so these screens mount outside a
// <Router> (see scripts/stubs/react-router-dom.mjs).
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

const { AR_GESTURES, getCurrentARInteraction, performARInteraction, resetARInteractionContract } =
  await import('../src/lib/arInteraction/index.js');
const { LEFT, RIGHT } = AR_GESTURES;

const src = (p) => readFile(new URL(`../src/${p}`, import.meta.url), 'utf8');
const PDP = 'apps/blackpi/screens/ProductDetail.jsx';

// Walks a mounted screen's element tree. Children only - none of the screens
// here put elements in prop slots.
function findElements(node, pred, out = []) {
  if (Array.isArray(node)) { node.forEach((n) => findElements(n, pred, out)); return out; }
  if (!React.isValidElement(node)) return out;
  if (pred(node)) out.push(node);
  if (node.props?.children) React.Children.toArray(node.props.children).forEach((n) => findElements(n, pred, out));
  return out;
}

const isHostTag = (node, tag) => node.type === tag;
// True when something matching `pred` sits at or under an aria-hidden element.
// Walks raw children rather than React.Children.toArray, which clones elements
// and so makes identity comparison useless for an ancestor check.
function isAriaHidden(node, pred, inherited = false) {
  if (Array.isArray(node)) return node.some((n) => isAriaHidden(n, pred, inherited));
  if (!React.isValidElement(node)) return false;
  const hidden = inherited || node.props?.['aria-hidden'] === 'true';
  if (hidden && pred(node)) return true;
  return isAriaHidden(node.props?.children ?? null, pred, hidden);
}
const hasHandler = (node) => Object.keys(node.props ?? {}).some((k) => /^on[A-Z]/.test(k) && node.props[k] != null);
const classesOf = (node) => String(node.props?.className ?? '');
const textOf = (node) => {
  const parts = [];
  findElements(node, () => true).forEach((el) => {
    React.Children.toArray(el.props?.children).forEach((c) => { if (typeof c === 'string') parts.push(c); });
  });
  return parts.join('');
};

async function mountPdp(overrides = {}) {
  const { ProductDetail } = await import(`../src/${PDP}`);
  return mountSurface(ProductDetail, {
    productRoute: 'health',
    onContactSeller: () => {},
    onBuy: () => {},
    onGoHome: () => {},
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// The known P2 #332 left behind - ProductDetail's 「進入商店」 shop row.
//
// It was a real <button> with a pointer cursor and no onClick whatsoever, so
// it was pressable, focusable and announced as a control, and did nothing.
// The fix is the one AUD-07 used: keep the storefront information, drop the
// interactivity. The CTA label goes with it, because a badge reading "enter
// the shop" IS the affordance - leaving it on an inert row would keep the
// same broken promise. Rendering, not source, is what these assert: the row
// must not be a button no matter how it is written.
// ---------------------------------------------------------------------------

test('進入商店 shop row is no longer an actionable button', async () => {
  resetARInteractionContract();
  const page = await mountPdp();
  try {
    const rows = findElements(page.output, (n) => /bp-pdp-shop-row/.test(classesOf(n)));
    assert.equal(rows.length, 1, 'the PDP still shows exactly one shop row');
    const [row] = rows;
    assert.notEqual(row.type, 'button', 'the shop row must not be a button element');
    assert.equal(hasHandler(row), false, 'the shop row must carry no event handler at all');
    assert.equal(row.props.onClick, undefined);
    assert.equal(row.props.role, undefined, 'and must not be given button semantics some other way');
    assert.equal(row.props.tabIndex, undefined, 'and must not be reachable by keyboard');
  } finally {
    page.unmount();
  }
});

test('the shop row keeps its seller information and drops only the CTA', async () => {
  resetARInteractionContract();
  const page = await mountPdp();
  try {
    const [row] = findElements(page.output, (n) => /bp-pdp-shop-row/.test(classesOf(n)));
    const text = textOf(row);
    assert.ok(text.includes('智選家電生活館'), 'the shop name is still shown');
    assert.ok(/商品/.test(text) && /件/.test(text), 'so are the shop stats');
    assert.ok(!text.includes('進入商店'), '「進入商店」 promises a storefront page this scenario does not have');
  } finally {
    page.unmount();
  }
});

test('no fake storefront page was invented to give 進入商店 something to do', async () => {
  const [pdp, routes] = await Promise.all([src(PDP), src('pages/scenario04/blackpi/routes.js')]);
  assert.ok(!/onEnterShop|onOpenShop|onSelectShop|shopRoute/.test(pdp), 'the PDP must not have grown a shop callback');
  assert.ok(!/\bshop\b\s*:/.test(routes), 'and Scenario 04 must not have grown a shop route');
});

// ---------------------------------------------------------------------------
// The rest of the same family, on the screens AUD-07 did not reach: Home's
// decor feed rows (a <button> whose one caller never passed an onClick),
// /me's 我的收藏 and 優惠券, and 分類's eight tiles. All four rendered as real
// controls that did nothing.
// ---------------------------------------------------------------------------

test('Home decor feed rows are not actionable', async () => {
  const { CompactProductRow } = await import('../src/apps/blackpi/components/CompactProductRow.jsx');
  const row = mountSurface(CompactProductRow, {
    product: { id: 'x', name: '大容量行動電源 20000mAh', assetKey: 'decor-powerbank', assetLabel: '', price: 1659 },
  });
  try {
    const root = row.output;
    assert.notEqual(root.type, 'button', 'a decorative filler row must not be a button element');
    assert.equal(hasHandler(root), false);
    assert.ok(/is-decorative/.test(classesOf(root)), 'and must say so, so the stylesheet can neutralise it');
  } finally {
    row.unmount();
  }
});

test('CompactProductRow no longer accepts a handler at all', async () => {
  const source = await src('apps/blackpi/components/CompactProductRow.jsx');
  assert.ok(/export function CompactProductRow\(\{ product \}\)/.test(source),
    'a row that still took an onClick prop would invite one back');
  assert.ok(!/onClick=/.test(source), 'and nothing in its markup binds one');
});

test('/me 我的收藏 and 優惠券 are not actionable', async () => {
  const { Me } = await import('../src/apps/blackpi/screens/Me.jsx');
  const page = mountSurface(Me, { activeProductRoute: 'health', onOpenRefundCenter: () => {}, onOpenSupport: () => {} });
  try {
    for (const label of ['我的收藏', '優惠券']) {
      const hits = findElements(page.output, (n) => textOf(n) === label && /bp-list-row/.test(classesOf(n)));
      assert.equal(hits.length, 1, `${label} is still on the member page`);
      assert.notEqual(hits[0].type, 'button', `${label} has nothing behind it and must not be a button element`);
      assert.equal(hasHandler(hits[0]), false);
    }
    // The two rows that DO lead somewhere must not have been caught by this.
    const live = findElements(page.output, (n) => isHostTag(n, 'button') && hasHandler(n));
    const labels = live.map(textOf).join('|');
    assert.ok(/黑皮退款中心/.test(labels), '退款中心 is a real entry point and stays a button');
    assert.ok(/黑皮安心客服/.test(labels), 'so does 客服');
  } finally {
    page.unmount();
  }
});

test('分類 tiles are not actionable', async () => {
  const { Category } = await import('../src/apps/blackpi/screens/Category.jsx');
  const page = mountSurface(Category, {});
  try {
    const tiles = findElements(page.output, (n) => /bp-card/.test(classesOf(n)));
    assert.ok(tiles.length >= 8, 'the category listing still renders its tiles');
    for (const tile of tiles) {
      assert.notEqual(tile.type, 'button', 'a category tile leads nowhere and must not be a button element');
      assert.equal(hasHandler(tile), false);
    }
  } finally {
    page.unmount();
  }
});

// ---------------------------------------------------------------------------
// The search bar: appearance only. No focus, no typing, no press.
// ---------------------------------------------------------------------------

test('no BlackPi search bar can be focused, typed into or pressed', async () => {
  // All three of them, not just 搜尋's: 首頁's pill was still a real button
  // that opened the search screen, which is a way out of the scripted run that
  // no story beat asks for.
  for (const [name, file, props] of [
    ['搜尋', 'Search', { onSearchTerm: () => {}, onBack: () => {} }],
    ['搜尋結果', 'SearchResults', { query: 'health', onSelectProduct: () => {}, onBack: () => {} }],
    ['首頁', 'Home', { onSelectProduct: () => {} }],
  ]) {
    const module = await import(`../src/apps/blackpi/screens/${file}.jsx`);
    const page = mountSurface(module[file], props);
    try {
      const editable = findElements(page.output, (n) => ['input', 'textarea', 'select'].includes(n.type));
      assert.equal(editable.length, 0, `${name}: the AR build keeps the pill and nothing that can take input`);
      const [bar] = findElements(page.output, (n) => /bp-searchbar/.test(classesOf(n)));
      assert.ok(bar, `${name}: the bar itself is still on screen - only its appearance was ever the point`);
      assert.notEqual(bar.type, 'button', `${name}: the bar must not be a control element`);
      assert.equal(hasHandler(bar), false, `${name}: and it must not be pressable either`);
      assert.equal(bar.props.tabIndex, undefined, `${name}: nor may it be in the tab order`);
      assert.ok(/is-decorative/.test(classesOf(bar)), `${name}: is-decorative is what takes the pointer events`);
      assert.ok(textOf(bar).length > 0, `${name}: the placeholder copy is what makes it read as a search bar`);
    } finally {
      page.unmount();
    }
  }
});

test('no Scenario 04 screen carries an editable control', async () => {
  const files = [
    'apps/blackpi/screens/Search.jsx', 'apps/blackpi/screens/SearchResults.jsx',
    'apps/blackpi/screens/Home.jsx', PDP, 'apps/blackpi/screens/Checkout.jsx',
    'apps/blackpi/screens/Me.jsx', 'apps/blackpi/screens/Category.jsx',
    'pages/scenario04/ReturnRequest.jsx', 'pages/scenario04/RefundCenter.jsx',
  ];
  for (const file of files) {
    const source = await src(file);
    assert.ok(!/<(input|textarea|select)[\s/>]/.test(source), `${file} must not render an editable control`);
  }
});

test('no search bar anywhere in BlackPi carries a pointer affordance', async () => {
  const css = await src('apps/blackpi/styles/index.css');
  assert.ok(/\.bp-searchbar\.is-decorative\{[^}]*pointer-events:none/.test(css), 'an inert bar takes no pointer events');
  assert.ok(/\.bp-searchbar\{[^}]*cursor:default/.test(css), 'and none of the three is a control, so the shared rule says so');
  assert.ok(!/button\.bp-searchbar/.test(css.replaceAll(/\/\*[\s\S]*?\*\//g, '')),
    'there is no button.bp-searchbar left to style');
});

// ---------------------------------------------------------------------------
// The other side of the coin: the PDP's two real story actions.
//
// The point of removing fake controls is that the real ones stay - and stay
// exactly two, in the geometry the contract declares. Nothing this batch
// touched may become a third gesture action.
// ---------------------------------------------------------------------------

test('the PDP is still dual, LEFT 賣家聊聊 / RIGHT 直接購買', async () => {
  resetARInteractionContract();
  const seen = [];
  const page = await mountPdp({
    onContactSeller: (p) => seen.push(['chat', p?.route]),
    onBuy: (p) => seen.push(['buy', p?.route]),
  });
  try {
    const contract = getCurrentARInteraction();
    assert.equal(contract.mode, 'dual');
    assert.equal(contract.surfaceId, 'blackpi/product-detail');

    performARInteraction(LEFT);
    performARInteraction(RIGHT);
    assert.deepEqual(seen, [['chat', 'health'], ['buy', 'health']],
      'LEFT is 賣家聊聊 and RIGHT is 直接購買 - the order the bottom bar shows them in');
  } finally {
    page.unmount();
  }
});

test('the bottom bar shows those two in that left-to-right order', async () => {
  resetARInteractionContract();
  const page = await mountPdp();
  try {
    const [bar] = findElements(page.output, (n) => /bp-pdp-bottom-bar/.test(classesOf(n)));
    assert.ok(bar, 'the sticky action bar is still there');
    const buttons = findElements(bar, (n) => isHostTag(n, 'button'));
    assert.equal(buttons.length, 2, 'exactly two controls - no cart, no third action');
    assert.ok(/bp-pdp-chat-btn/.test(classesOf(buttons[0])), 'first (LEFT) is 賣家聊聊');
    assert.ok(/bp-pdp-buy-btn/.test(classesOf(buttons[1])), 'second (RIGHT) is 直接購買');
  } finally {
    page.unmount();
  }
});

test('gesture and touch run the same handler, not two copies of it', async () => {
  resetARInteractionContract();
  const seen = [];
  const page = await mountPdp({
    onContactSeller: (p) => seen.push(['chat', p?.route]),
    onBuy: (p) => seen.push(['buy', p?.route]),
  });
  try {
    const [bar] = findElements(page.output, (n) => /bp-pdp-bottom-bar/.test(classesOf(n)));
    const [chat, buy] = findElements(bar, (n) => isHostTag(n, 'button'));
    chat.props.onClick();
    buy.props.onClick();
    const byTouch = [...seen];
    seen.length = 0;
    performARInteraction(LEFT);
    performARInteraction(RIGHT);
    assert.deepEqual(seen, byTouch, 'a wave and a tap must reach the same story action');
  } finally {
    page.unmount();
  }
});

test('the decorative controls were not wired into the contract as a third action', async () => {
  resetARInteractionContract();
  const calls = [];
  const page = await mountPdp({
    onContactSeller: () => calls.push('chat'),
    onBuy: () => calls.push('buy'),
  });
  try {
    // There are exactly two gestures, so "a third action" can only mean one of
    // three things, and all three are checked here: a third gesture in the
    // vocabulary, a third availability slot on the snapshot, or one of the
    // decorative controls having quietly taken over LEFT or RIGHT.
    assert.deepEqual(Object.values(AR_GESTURES).sort(), ['left', 'right']);
    const contract = getCurrentARInteraction();
    assert.equal(contract.leftAvailable, true);
    assert.equal(contract.rightAvailable, true);
    assert.deepEqual(Object.keys(contract).filter((k) => k.endsWith('Available')).sort(),
      ['leftAvailable', 'rightAvailable'], 'the contract has no slot a third action could live in');

    // Everything the AR contract can fire, fired: still only the two, still
    // 賣家聊聊 then 直接購買.
    for (const gesture of Object.values(AR_GESTURES)) performARInteraction(gesture);
    assert.deepEqual(calls, ['chat', 'buy'],
      '分享 / 收藏 / 進入商店 are decoration and must reach no gesture');
  } finally {
    page.unmount();
  }
});

// AUD-07 made 分享 and 加入收藏 inert. 分享 has since gone further and is not
// rendered at all (see the pinned-hero block below), so this only still has
// 加入收藏 to check - it is inside the scrolling half, not the hero, and it
// stays exactly as inert as AUD-07 left it.
test('AUD-07 stays fixed - 加入收藏 is still inert', async () => {
  resetARInteractionContract();
  const page = await mountPdp();
  try {
    const cls = 'bp-pdp-favorite';
    const [el] = findElements(page.output, (n) => classesOf(n).includes(cls));
    assert.ok(el, `${cls} is still on the PDP`);
    assert.notEqual(el.type, 'button', `${cls} must not be a button element`);
    assert.equal(hasHandler(el), false);
    assert.ok(isAriaHidden(page.output, (n) => classesOf(n).includes(cls)),
      `${cls} must not be announced as a control`);
  } finally {
    page.unmount();
  }
});

// ---------------------------------------------------------------------------
// The PDP frame: pinned hero, scrolling body, and no corner chrome.
//
// Both Scenario 04 product lines are this one screen, so every assertion here
// runs for both routes - that is the point of the loop, not thoroughness for
// its own sake: 'health' passing tells you nothing about 'luckyBag' unless
// something checks it.
//
// 返回 and 分享 are asserted ABSENT, not inert. Inert was AUD-07's answer for
// decoration; this is a different requirement - a back arrow is a way out of
// the scripted run, so it must not be on screen at all, and the share glyph
// beside it read as a second one.
// ---------------------------------------------------------------------------

const PDP_ROUTES = ['health', 'luckyBag'];

for (const route of PDP_ROUTES) {
  test(`PDP ${route}: the hero is pinned outside the scroller, the body scrolls`, async () => {
    resetARInteractionContract();
    const page = await mountPdp({ productRoute: route });
    try {
      const [app] = findElements(page.output, (n) => classesOf(n).split(/\s+/).includes('blackpi-app'));
      assert.ok(app, 'the screen still renders the app frame');
      const top = React.Children.toArray(app.props.children).filter(React.isValidElement);
      const classAt = (i) => classesOf(top[i]).split(/\s+/);

      // The hero is a direct child of the app frame, ahead of the scroller -
      // that adjacency IS the pinning, so assert the order, not just presence.
      const heroIndex = top.findIndex((n) => classesOf(n).split(/\s+/).includes('bp-pdp-hero'));
      const scrollIndex = top.findIndex((n) => classesOf(n).split(/\s+/).includes('bp-scroll'));
      assert.ok(heroIndex >= 0, 'the hero is a direct child of .blackpi-app, not of the scroller');
      assert.ok(scrollIndex >= 0, 'the PDP still has a scrolling region');
      assert.ok(heroIndex < scrollIndex, 'the pinned hero comes before the scroller');
      assert.ok(classAt(scrollIndex).includes('bp-pdp-scroll'), 'the scroller is the PDP scroll half');

      // Nothing may put the hero back inside the scroller.
      const scroller = top[scrollIndex];
      assert.equal(
        findElements(scroller, (n) => classesOf(n).split(/\s+/).includes('bp-pdp-hero')).length,
        0,
        'the hero must not be inside the scrolling region',
      );

      // The copy that must scroll really is the scroller's content.
      assert.ok(
        findElements(scroller, (n) => classesOf(n).split(/\s+/).includes('bp-pdp-body')).length === 1,
        'price / description / specs / reviews live inside the scroller',
      );

      // The image itself is in the pinned half.
      assert.ok(
        findElements(top[heroIndex], (n) => /bp-media|AssetImage/.test(classesOf(n)) || typeof n.type === 'function').length > 0,
        'the product image is in the pinned hero',
      );
    } finally {
      page.unmount();
    }
  });

  test(`PDP ${route}: no 返回 arrow and no 分享 button anywhere on the page`, async () => {
    resetARInteractionContract();
    const page = await mountPdp({ productRoute: route });
    try {
      const labelled = (label) => findElements(page.output, (n) => n.props?.['aria-label'] === label);
      assert.deepEqual(labelled('返回'), [], '返回 must not be rendered at all');
      assert.deepEqual(labelled('分享'), [], '分享 must not be rendered at all');

      // Not merely unlabelled: the corner-chrome classes are gone too, so
      // neither can come back as an unnamed glyph in the same spot.
      for (const cls of ['bp-pdp-hero-back', 'bp-pdp-hero-actions', 'bp-pdp-hero-btn']) {
        assert.deepEqual(
          findElements(page.output, (n) => classesOf(n).split(/\s+/).includes(cls)),
          [],
          `${cls} must not be on the PDP`,
        );
      }
    } finally {
      page.unmount();
    }
  });

  test(`PDP ${route}: 賣家聊聊 stays, and still opens the seller chat`, async () => {
    resetARInteractionContract();
    const opened = [];
    const page = await mountPdp({ productRoute: route, onContactSeller: (p) => opened.push(p.route) });
    try {
      const [chat] = findElements(page.output, (n) => classesOf(n).includes('bp-pdp-chat-btn'));
      assert.ok(chat, '賣家聊聊 is still on the PDP');
      assert.equal(chat.type, 'button', '賣家聊聊 is still a real button');
      chat.props.onClick();
      assert.deepEqual(opened, [route], '賣家聊聊 still reports the shopper opened this product line');
      // And it is still the LEFT half of the dual contract.
      assert.equal(getCurrentARInteraction().mode, 'dual');
      assert.equal(performARInteraction(LEFT), true);
      assert.deepEqual(opened, [route, route]);
    } finally {
      page.unmount();
    }
  });
}

// ---------------------------------------------------------------------------
// The two motions the PDP presents itself with, and the line between them.
//
// #363 pinned the hero and gave the copy its own scroller, but nothing moved
// on its own: the player had to drag. This screen is played through a headset
// as often as in the hand, so it now reads itself out - the hero's images
// travel sideways, the copy travels up - while both stay draggable.
//
// What is asserted here is the SHAPE that makes those motions possible and
// keeps them apart, because that is what a later edit can quietly undo: every
// image on one horizontal track (a slideshow swapping one <img> by index
// cannot slide), one rAF loop per axis with a cleanup, and nothing added that
// takes the screen away from the finger. The pixel-by-pixel behaviour is a
// browser matter and was verified in one.
// ---------------------------------------------------------------------------

for (const route of PDP_ROUTES) {
  test(`PDP ${route}: the hero holds every image at once, on one horizontal track`, async () => {
    resetARInteractionContract();
    const page = await mountPdp({ productRoute: route });
    try {
      const [hero] = findElements(page.output, (n) => classesOf(n).split(/\s+/).includes('bp-pdp-hero'));
      const [track] = findElements(hero, (n) => classesOf(n).split(/\s+/).includes('bp-pdp-gallery'));
      assert.ok(track, 'the gallery track is inside the pinned hero');
      const slides = findElements(track, (n) => classesOf(n).split(/\s+/).includes('bp-pdp-gallery-slide'));
      const pictures = findElements(track, (n) => n.props?.assetKey != null);
      assert.ok(slides.length > 1, `${route} puts each of its images on its own slide`);
      assert.equal(pictures.length, slides.length, 'one picture per slide, all of them mounted together');
      // A cross-fade renders one image and swaps its key; a carousel renders
      // them all side by side and moves the strip. This is the difference.
      const keys = pictures.map((n) => n.props.assetKey);
      assert.equal(new Set(keys).size, keys.length, 'the slides are distinct images, not one image re-keyed');
      assert.equal(
        findElements(track, (n) => /opacity/.test(JSON.stringify(n.props?.style ?? {}))).length,
        0,
        'no slide is faded: the gallery moves, it does not dissolve',
      );
      // The dots still name the same images, and press through the track.
      const dots = findElements(page.output, (n) => classesOf(n).split(/\s+/).includes('bp-pdp-dot'));
      assert.equal(dots.length, slides.length, 'one dot per image');
      assert.equal(typeof dots[1].props.onClick, 'function', 'a dot still travels to its image');
    } finally {
      page.unmount();
    }
  });

  test(`PDP ${route}: the action bar is outside the scroller, so it never scrolls away`, async () => {
    resetARInteractionContract();
    const page = await mountPdp({ productRoute: route });
    try {
      const [app] = findElements(page.output, (n) => classesOf(n).split(/\s+/).includes('blackpi-app'));
      const top = React.Children.toArray(app.props.children).filter(React.isValidElement);
      const bar = top.find((n) => classesOf(n).split(/\s+/).includes('bp-pdp-bottom-bar'));
      assert.ok(bar, 'the bottom bar is a direct child of the app frame');
      const scroller = top.find((n) => classesOf(n).split(/\s+/).includes('bp-pdp-scroll'));
      assert.equal(
        findElements(scroller, (n) => classesOf(n).split(/\s+/).includes('bp-pdp-bottom-bar')).length,
        0,
        'the moving copy must not carry 賣家聊聊 / 直接購買 away with it',
      );
      assert.ok(findElements(bar, (n) => classesOf(n).includes('bp-pdp-chat-btn')).length === 1,
        '賣家聊聊 is still in the bar');
    } finally {
      page.unmount();
    }
  });
}

test('each motion is one rAF loop that cleans itself up, and neither takes input away', async () => {
  const s = await src(PDP);
  // Two effects, two loops, two cleanups: nothing may keep running once the
  // player has walked on to the chat or the checkout.
  assert.match(s, /requestAnimationFrame/, 'the motion is frame-driven, not a setInterval nudging scrollBy');
  assert.doesNotMatch(s, /setInterval/, 'no interval-driven slideshow or scroll is left on this screen');
  assert.match(s, /cancelAnimationFrame/, 'the frame loop is cancellable');
  assert.match(s, /clearTimeout/, 'and so is the delay before it starts');
  // The rules the auto-play must not break to get its way.
  assert.doesNotMatch(s, /pointerEvents:\s*'none'/, 'auto-play must not switch off pointer input');
  assert.doesNotMatch(s, /preventDefault\(\)/, 'auto-play must not swallow the player\'s own gestures');
  assert.doesNotMatch(s, /touchAction/, 'no touch lock is added for the sake of the animation');
  const css = await src('apps/blackpi/styles/index.css');
  const gallery = css.match(/\.bp-pdp-gallery\{[^}]*\}/)?.[0] ?? '';
  assert.match(gallery, /display:flex/, 'the gallery is a strip of images side by side');
  assert.match(gallery, /overflow-x:auto/, 'which the browser scrolls sideways - so a finger can too');
  assert.match(css, /\.bp-pdp-gallery-slide\{[^}]*flex:0 0 100%/, 'each image takes exactly one frame');
  assert.doesNotMatch(gallery, /pointer-events:none/, 'the gallery stays touchable');
});

test('the pinned hero and the scroller are what the CSS actually says', async () => {
  const css = await src('apps/blackpi/styles/index.css');
  // flex:none on a column-flex child of .blackpi-app is the pinning.
  assert.match(css, /\.bp-pdp-hero\{[^}]*flex:none/, 'the hero does not flex, so it holds the top');
  assert.match(css, /\.bp-scroll\{[^}]*overflow-y:auto/, 'the scroller is the one that scrolls');
  assert.match(css, /\.bp-pdp-scroll\{/, 'the PDP names its scrolling half');
  // The corner-chrome rules went with the buttons they placed. Selectors
  // only - the prose above them still explains why they are gone.
  const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const rule of ['bp-pdp-hero-back', 'bp-pdp-hero-actions', 'bp-pdp-hero-btn']) {
    assert.ok(!selectors.includes(rule),
      `.${rule} must not still be styling something that no longer exists`);
  }
});

// ---------------------------------------------------------------------------
// The dialogue chain's dual geometry - AUD-06's rule, applied to the chats.
//
// Every Scenario 04 chat declares `dual` when the engine offers two replies,
// with LEFT = the first. A @media (max-width:359px) rule used to restack that
// pair into one column, so at 320px LEFT and RIGHT pointed at two buttons one
// above the other. The pair must read as a pair at every portrait width.
// ---------------------------------------------------------------------------

test('a two-reply row is two columns, at every portrait width', async () => {
  const css = await src('apps/blackpi/styles/index.css');

  // Nothing may restack it - not a media query, not a later override. Comments
  // are stripped first: the rule this replaced is quoted in the prose above it.
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const mediaBlocks = rules.match(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g) ?? [];
  for (const block of mediaBlocks) {
    assert.ok(!/\.bp-choice-grid\s*\{/.test(block),
      'left-is-one-reply / right-is-the-other must hold across the whole portrait range');
  }
  const rule = /\.bp-choice-grid\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)[^}]*\}/.exec(rules);
  assert.ok(rule, 'the two-reply grid is a genuine two-column pair');
  // The only narrowing left is opt-in, and applies to counts that are not a
  // LEFT/RIGHT pair: one reply, or three or more.
  assert.ok(rules.indexOf('.bp-choice-grid.bp-choice-grid-single') > rule.index);
  assert.ok(rules.indexOf('.bp-choice-grid.bp-choice-grid-stack') > rule.index);
});

test('the chats still declare dual with LEFT = the first reply', async () => {
  for (const file of ['SellerChat', 'DisputeChat', 'PlatformSupportChat', 'RefundDelayChat', 'ReturnAckChat']) {
    const source = await src(`pages/scenario04/${file}.jsx`);
    assert.ok(/mode: 'dual'/.test(source), `${file} declares dual for a two-reply node`);
    assert.ok(/left: \(\) => engine\.choose\(engine\.pendingChoices\[0\]\)/.test(source), `${file} LEFT is the first reply`);
    assert.ok(/right: \(\) => engine\.choose\(engine\.pendingChoices\[1\]\)/.test(source), `${file} RIGHT is the second`);
  }
});

test('a two-reply row renders exactly two buttons in choice order', async () => {
  const { DialogueChoiceGrid } = await import('../src/apps/blackpi/components/DialogueChoiceGrid.jsx');
  const chosen = [];
  const grid = mountSurface(DialogueChoiceGrid, {
    choices: [{ id: 'a', label: '我要退貨' }, { id: 'b', label: '我想先問退貨規則' }],
    onChoose: (c) => chosen.push(c.id),
  });
  try {
    const [row] = findElements(grid.output, (n) => /bp-choice-grid/.test(classesOf(n)));
    assert.ok(row, 'the grid renders');
    assert.ok(!/bp-choice-grid-single|bp-choice-grid-stack/.test(classesOf(row)),
      'a two-reply row takes neither single-column modifier');
    const buttons = findElements(row, (n) => isHostTag(n, 'button'));
    assert.equal(buttons.length, 2);
    assert.equal(textOf(buttons[0]), '我要退貨', 'the first choice is the LEFT one');
    assert.equal(textOf(buttons[1]), '我想先問退貨規則');
  } finally {
    grid.unmount();
  }
});
