// Regression cover for the Final Audit's first fix batch (AUD-01 … AUD-07).
//
// One suite rather than seven, because the seven share a single subject: a
// control the player can see must be a control a gesture can reach, and a
// screen whose contract is `dual` must look like it has a LEFT and a RIGHT.
// Each block below states the failure it exists to catch.
//
// Run through scripts/register-gesture-contract-loaders.mjs, which compiles
// the app's JSX and stubs react-router-dom so these screens mount outside a
// <Router> (see scripts/stubs/react-router-dom.mjs).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test, { mock } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame ?? ((fn) => setTimeout(fn, 0));

const { AR_GESTURES, getCurrentARInteraction, performARInteraction, resetARInteractionContract } =
  await import('../src/lib/arInteraction/index.js');
const { LEFT, RIGHT } = AR_GESTURES;
const { navigations, resetNavigations } = await import('react-router-dom');

const src = (p) => readFile(new URL(`../src/${p}`, import.meta.url), 'utf8');

// Walks a mounted screen's element tree, including the prop slots this app
// puts elements in (LineConversation's after/quickReplies/footer, the shared
// result card's actions), which plain children traversal never reaches.
function findElements(node, pred, out = []) {
  if (Array.isArray(node)) { node.forEach((n) => findElements(n, pred, out)); return out; }
  if (!React.isValidElement(node)) return out;
  if (pred(node)) out.push(node);
  if (node.props?.children) React.Children.toArray(node.props.children).forEach((n) => findElements(n, pred, out));
  for (const slot of ['after', 'quickReplies', 'footer', 'actions']) {
    if (node.props?.[slot]) findElements(node.props[slot], pred, out);
  }
  return out;
}

// ---------------------------------------------------------------------------
// AUD-01 (P0) - a stalled or failed clip must stay operable by gesture
//
// The overlay's two recovery buttons were the only way out of a clip that
// never arrived, and the contract for the screen underneath stayed `display` -
// so on the glasses the scenario simply stopped. What makes this worth a
// behavioural test rather than a source assertion is the "same handler" half:
// the contract must call the overlay's own retryVideo / finishVideo, not a
// second copy of them, and only identity comparison can prove that.
// ---------------------------------------------------------------------------

// Drives the real PrivateChat timeline (mock timers) until it opens a video,
// and hands back both the page mount and the VideoOverlay element it created -
// component and props exactly as the page built them, so nothing here has to
// restate what the page passes down.
async function reachVideoOverlay() {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { PrivateChat } = await import('../src/pages/scenario02/PrivateChat.jsx');
  const page = mountSurface(PrivateChat);
  const isOverlay = (n) => typeof n.type === 'function' && /VideoOverlay/.test(n.type.name || '');
  for (let i = 0; i < 400; i += 1) {
    mock.timers.tick(1200);
    const found = findElements(page.output, isOverlay);
    if (found.length) return { page, element: found[0] };
    const choice = findElements(page.output, (n) => typeof n.props?.onChoose === 'function');
    if (choice.length) choice[0].props.onChoose(0);
  }
  page.unmount();
  throw new Error('PrivateChat never opened a video overlay');
}

test('AUD-01 PrivateChat hands the video overlay a recovery channel', async () => {
  resetARInteractionContract();
  const { page, element } = await reachVideoOverlay();
  try {
    assert.equal(typeof element.props.onRecoveringChange, 'function', 'the overlay must be able to report a stall/failure upward');
    assert.ok(element.props.recoveryRef, 'the overlay must be able to publish its own handlers upward');
    // While the clip is merely playing there is nothing to do: still display.
    assert.equal(getCurrentARInteraction().mode, 'display');
  } finally {
    page.unmount();
    mock.timers.reset();
  }
});

test('AUD-01 a failed clip reports itself and publishes its OWN retry/skip handlers', async () => {
  resetARInteractionContract();
  const { page, element } = await reachVideoOverlay();
  const VideoOverlay = element.type;
  const reported = [];
  const recoveryRef = { current: null };
  const overlay = mountSurface(VideoOverlay, {
    ...element.props,
    recoveryRef,
    onRecoveringChange: (v) => reported.push(v),
  });
  try {
    const video = findElements(overlay.output, (n) => n.type === 'video')[0];
    assert.ok(video, 'the overlay renders a <video>');
    video.props.onError({ currentTarget: { error: { code: 4, message: 'MEDIA_ERR_SRC_NOT_SUPPORTED' } } });

    assert.equal(reported.at(-1), true, 'a failed clip must report itself as recovering');
    assert.equal(typeof recoveryRef.current?.retry, 'function');
    assert.equal(typeof recoveryRef.current?.skip, 'function');

    // The published handlers ARE the buttons' handlers - not a reimplementation.
    const buttons = findElements(overlay.output, (n) => n.type === 'button');
    const onClicks = buttons.map((b) => b.props.onClick);
    assert.ok(onClicks.includes(recoveryRef.current.retry), 'LEFT must run the same function 重新播放 runs');
    assert.ok(onClicks.includes(recoveryRef.current.skip), 'RIGHT must run the same function 略過影片並繼續 runs');

    // No auto-skip timer was added: a failed clip waits for the player.
    const finished = [];
    const waiting = mountSurface(VideoOverlay, { ...element.props, recoveryRef: { current: null }, onRecoveringChange: () => {}, onFinished: (id) => finished.push(id) });
    findElements(waiting.output, (n) => n.type === 'video')[0].props.onError({ currentTarget: { error: { code: 4, message: 'x' } } });
    mock.timers.tick(120000);
    assert.deepEqual(finished, [], 'the error panel must not skip itself on a timer');
    waiting.unmount();
  } finally {
    overlay.unmount();
    page.unmount();
    mock.timers.reset();
  }
});

test('AUD-01 while recovering the chat is dual: LEFT replays, RIGHT skips', async () => {
  resetARInteractionContract();
  const { page, element } = await reachVideoOverlay();
  try {
    const calls = [];
    element.props.recoveryRef.current = { retry: () => calls.push('retry'), skip: () => calls.push('skip') };
    element.props.onRecoveringChange(true);
    page.rerender();

    const open = getCurrentARInteraction();
    assert.equal(open.mode, 'dual', 'a stalled/failed clip makes this a two-action screen');
    assert.equal(open.surfaceId, 'scenario02/private-chat/video-recovery');
    assert.equal(open.leftAvailable, true);
    assert.equal(open.rightAvailable, true);

    assert.equal(performARInteraction(LEFT), true);
    assert.deepEqual(calls, ['retry'], 'LEFT runs 重新播放');
    assert.equal(performARInteraction(RIGHT), true);
    assert.deepEqual(calls, ['retry', 'skip'], 'RIGHT runs 略過影片並繼續');

    // Recovered (or torn down): the chat goes back to its own geometry.
    element.props.onRecoveringChange(false);
    page.rerender();
    assert.notEqual(getCurrentARInteraction().surfaceId, 'scenario02/private-chat/video-recovery');
  } finally {
    page.unmount();
    mock.timers.reset();
  }
});

// ---------------------------------------------------------------------------
// AUD-02 - the ring screen's gesture must reach 接聽
//
// AUD-02 originally corrected a LEFT/RIGHT swap: the screen carried 接聽 and a
// 先傳簡訊查證 off-ramp, and bound LEFT to the second of them. The off-ramp has
// since been removed entirely (it was an extra manual step in front of the
// officer's conversation that always dead-ended back at this same 接聽), which
// settles the ordering question by deleting the pair. What survives of AUD-02
// is the part that still has content: this ring screen is `single`, its one
// action is 接聽, and RIGHT runs it. There is no LEFT left to get backwards.
// ---------------------------------------------------------------------------
test('AUD-02 IncomingCall is single, RIGHT = 接聽, and the SMS off-ramp is gone', async () => {
  resetARInteractionContract();
  resetNavigations();
  const { IncomingCall } = await import('../src/pages/scenario03/IncomingCall.jsx');

  const markup = renderToStaticMarkup(React.createElement(IncomingCall));
  assert.ok(markup.includes('接聽'), '接聽 is on screen');
  assert.ok(!markup.includes('先傳簡訊'), 'the 先傳簡訊查證 entry point is gone from the ring screen');

  const mounted = mountSurface(IncomingCall);
  try {
    const snapshot = getCurrentARInteraction();
    assert.equal(snapshot.mode, 'single');
    assert.equal(snapshot.leftAvailable, false, 'a single surface has no LEFT to bind');
    assert.equal(performARInteraction(LEFT), false);
    assert.deepEqual(navigations.flat(), [], 'LEFT does nothing on a single surface');
    assert.equal(performARInteraction(RIGHT), true);
    assert.deepEqual(navigations.flat(), ['/scenario03-police/call-stage1'], 'RIGHT answers the call');
  } finally {
    mounted.unmount();
  }
});

// ---------------------------------------------------------------------------
// AUD-03 / AUD-04 - the profit screen's dates and its headline
//
// Source-level, deliberately. GuGo Invest's React surface is TypeScript and
// scripts/jsx-test-loader.mjs only compiles .js/.jsx on purpose (see its own
// header) - putting TS into the shared loader to reach one screen is a bigger
// change than the fix. What is pinned here is the shape that can regress:
// the direction of the date arithmetic, and the floor under the month tier.
// The rendered numbers themselves are checked in the browser (see the PR).
// ---------------------------------------------------------------------------
test('AUD-03 the two multi-day profit tiers end today and start in the past', async () => {
  const s = await src('apps/gugo-invest/app/screens/ProfitOverview.tsx');
  assert.match(s, /function daysBefore\(date: Date, days: number\)/, 'ranges are built by counting back from a date');
  assert.match(s, /out\.setDate\(out\.getDate\(\) - days\)/, 'setDate keeps month/year rollover correct');
  const code = s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /setDate\([^)]*\+\s*\d/, 'no tier may be dated forward from today again');
  assert.match(s, /const twoWeekStart = daysBefore\(today, TWO_WEEK_SPAN_DAYS\)/);
  assert.match(s, /const monthStart = daysBefore\(today, ONE_MONTH_SPAN_DAYS\)/);
  // The range reads start-then-today, in that order, for both tiers.
  assert.match(s, /twoWeeks[\s\S]*?dateRange: `\$\{formatMonthDay\(twoWeekStart\)\}–\$\{formatMonthDay\(today\)\}`/);
  assert.match(s, /oneMonth[\s\S]*?dateRange: `\$\{formatMonthDay\(monthStart\)\}–\$\{formatMonthDay\(today\)\}`/);
  assert.doesNotMatch(s, /const \w+End = new Date\(today\)/, 'the old forward end-dates are gone');
});

test('AUD-04 the headline month return cannot leave the player below their principal', async () => {
  const s = await src('apps/gugo-invest/app/screens/ProfitOverview.tsx');
  const min = Number(/const MONTH_RETURN_MIN_PCT = (-?[\d.]+)/.exec(s)?.[1]);
  const max = Number(/const MONTH_RETURN_MAX_PCT = (-?[\d.]+)/.exec(s)?.[1]);
  assert.ok(Number.isFinite(min) && Number.isFinite(max), 'the month tier is bounded by named constants');
  assert.ok(min > 0, `the 帳面獲利 headline must stay positive, got a floor of ${min}`);
  assert.ok(max > min);
  assert.match(s, /const monthPct = randomRange\(MONTH_RETURN_MIN_PCT, MONTH_RETURN_MAX_PCT\)/);
  // The headline balance is still derived from that same bounded number, so a
  // positive floor really does mean totalAssets > principal.
  assert.match(s, /const finalValue = Math\.round\(PRINCIPAL \* \(1 \+ monthPct \/ 100\)\)/);
  // Today / two-week keep their full range - the platform is not "always up".
  assert.match(s, /const todayPct = randomRange\(-5, 7\)/);
  assert.match(s, /const twoWeekPct = randomRange\(-10, 22\)/);
});

// ---------------------------------------------------------------------------
// AUD-05 - the chart credit is text, not an exit from the app
// ---------------------------------------------------------------------------
test('AUD-05 the TradingView attribution cannot navigate anywhere', async () => {
  const s = await src('apps/gugo-invest/app/components/charts/ChartAttribution.tsx');
  const markup = s.slice(s.indexOf('export function ChartAttribution'));
  assert.ok(markup.includes('TradingView'), 'the credit wording stays - the library licence asks for it');
  assert.doesNotMatch(markup, /<a\b/, 'the credit must not be an anchor');
  assert.doesNotMatch(markup, /href=/, 'no href');
  assert.doesNotMatch(markup, /target=/, 'no target="_blank"');
  assert.doesNotMatch(markup, /onClick/, 'no click handler');
  assert.match(markup, /pointer-events-none/, 'it must not even take a tap');
});

test('AUD-05 nothing in src/ navigates the player out of CIBAR', async () => {
  // The whole point of AUD-05 is that a kiosk/AR build has no way back from an
  // external site, so this sweeps the tree rather than only the one file that
  // had the link. Comments are stripped first - the fixed file documents the
  // markup it used to have.
  const root = new URL('../src/', import.meta.url);
  const { readdir } = await import('node:fs/promises');
  const offenders = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const next = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
      if (entry.isDirectory()) { await walk(next); continue; }
      if (!/\.(jsx?|tsx?)$/.test(entry.name)) continue;
      const body = (await readFile(next, 'utf8'))
        .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      if (/href=["'{]?\s*["'`]?https?:/.test(body)) offenders.push(next.pathname.split('/src/')[1]);
    }
  }
  await walk(root);
  assert.deepEqual(offenders, [], 'a screen links out of the app');
});

// ---------------------------------------------------------------------------
// AUD-06 - a `dual` decision is drawn as a LEFT and a RIGHT
//
// Geometry lives in CSS, so this pins the CSS: each of the four surfaces gets
// a two-column rule, and none of them may be inside a media query - a width
// where the pair restacks teaches "top and bottom" for a contract that only
// speaks left and right.
// ---------------------------------------------------------------------------
const DUAL_GEOMETRY = [
  ['scenario01 withdraw-fail', 'styles/global.css', '.btns.btns-dual'],
  ['scenario02 TopupWarning', 'styles/scenario02.css', '.bition-warning-actions.is-dual'],
  // One rule for every scenario03 2-choice panel now: ChoicePanel applies it
  // to all of them (in-call 二選一 included) and FinalDecision reuses it.
  // .pol-call-decision is gone with the ring screen's off-ramp - that screen
  // no longer has a pair to lay out.
  ['scenario03 ChoicePanel + FinalDecision', 'styles/scenario03.css', '.pol-choices-split'],
];

test('AUD-06 every formal dual decision is laid out as two columns', async () => {
  for (const [label, file, selector] of DUAL_GEOMETRY) {
    const css = await src(file);
    const rule = new RegExp(`\\${selector}\\{([^}]*)\\}`).exec(css);
    assert.ok(rule, `${label}: ${selector} must declare its own layout`);
    assert.match(rule[1], /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/,
      `${label}: ${selector} must be two equal columns`);
  }
});

test('AUD-06 no dual decision restacks vertically at any width', async () => {
  for (const [label, file, selector] of DUAL_GEOMETRY) {
    const css = await src(file);
    // Every @media block in the file, and what it contains.
    for (const block of css.match(/@media[^{]*\{[\s\S]*?\n\}/g) ?? []) {
      assert.ok(!block.includes(selector),
        `${label}: ${selector} is touched inside a media query - the pair must stay side by side across 320px-430px`);
    }
  }
});

test('AUD-06 the surfaces really do carry the modifier, and DepositWarning does not', async () => {
  assert.match(await src('pages/scenario01/WithdrawFail.jsx'), /<ButtonGroup className="btns-dual">/);
  assert.match(await src('pages/scenario03/FinalDecision.jsx'), /className="pol-choices pol-choices-split"/);
  // ChoicePanel applies it unconditionally - no momentKey gate, which is what
  // used to leave the prosecutor's account question stacked.
  assert.match(await src('pages/scenario03/components/ChoicePanel.jsx'), /className=\{`pol-choices pol-choices-split/);
  // The shared RedWarning opts in per instance: TopupWarning (hotline off, two
  // actions) gets the columns; DepositWarning (hotline on, three buttons, off
  // the main line per AD-24) must keep its stack.
  const redWarning = await src('pages/scenario02/components/RedWarning.jsx');
  assert.match(redWarning, /bition-warning-actions\$\{hotline \? '' : ' is-dual'\}/);
});

test('AUD-06 the ring screen is down to one control, so there is no row to get wrong', async () => {
  const s = await src('pages/scenario03/IncomingCall.jsx');
  const body = s.slice(s.indexOf('return ('));
  assert.equal((body.match(/<button/g) ?? []).length, 1, 'the ring screen holds exactly one story action');
  assert.match(body, /pol-call-btn-answer/);
  assert.doesNotMatch(body, /pol-call-decision"|pol-call-inline-actions|smsAsk/);
  // The 對方不接受掛斷 caption stays - it is a caption, not an action.
  assert.match(body, /pol-call-decision-note/);
});

// ---------------------------------------------------------------------------
// AUD-07 - the storefront's fake controls stop being controls
// ---------------------------------------------------------------------------
// AUD-07 made both of these decoration. 加入收藏 is still exactly that. 分享
// has since been removed from the hero outright (a share glyph in the corner
// read as a way out of the scripted run), which is strictly stronger than
// AUD-07's rule - so what this asserts for 分享 is absence, and the
// decoration half now only has 加入收藏 to check.
test('AUD-07 加入收藏 is decoration, not a button - and 分享 is gone entirely', async () => {
  const s = await src('apps/blackpi/screens/ProductDetail.jsx');
  assert.ok(!/<button[^>]*加入收藏/.test(s), '加入收藏 must not be a <button>');
  assert.match(s, /<span className="[^"]*is-decorative"/, 'the heart stays as decoration');
  assert.doesNotMatch(s, /showToast\(t\('已加入收藏'\)\)/, 'the favourite toast is gone with the button');
  // Absence, not inertness: no glyph, no import, no hero chrome to hang it on.
  assert.doesNotMatch(s, /<Share2\b/, '分享 must not be rendered at all');
  assert.doesNotMatch(s, /\bShare2\b[^\n]*from 'lucide-react'|Share2,/, 'the Share2 icon is not even imported');
  assert.doesNotMatch(s, /bp-pdp-hero-actions|bp-pdp-hero-btn/, 'the hero corner chrome went with it');
  const css = await src('apps/blackpi/styles/index.css');
  assert.match(css, /\.bp-icon-btn\.is-decorative[\s\S]{0,80}pointer-events:none/, 'decoration cannot be tapped');
});

test('AUD-07 ProductDetail still offers exactly two story actions, and stays dual', async () => {
  resetARInteractionContract();
  const { ProductDetail } = await import('../src/apps/blackpi/screens/ProductDetail.jsx');
  const contacted = [];
  const bought = [];
  const props = { productRoute: 'health', onContactSeller: () => contacted.push(1), onBuy: () => bought.push(1) };

  const markup = renderToStaticMarkup(React.createElement(ProductDetail, props));
  // Every button that is a story action rather than gallery/accordion chrome.
  assert.ok(markup.includes('賣家聊聊'), '賣家聊聊 stays');
  assert.ok(markup.includes('直接購買'), '直接購買 stays');
  assert.ok(!/aria-label="分享"/.test(markup), '分享 is no longer an announced control');
  assert.ok(!/aria-label="加入收藏"/.test(markup), '加入收藏 is no longer an announced control');
  assert.ok(!/aria-label="返回"/.test(markup), '返回 is not on the PDP at all');

  const mounted = mountSurface(ProductDetail, props);
  try {
    const ar = getCurrentARInteraction();
    assert.equal(ar.mode, 'dual');
    assert.equal(ar.surfaceId, 'blackpi/product-detail');
    assert.equal(performARInteraction(LEFT), true);
    assert.deepEqual(contacted, [1], 'LEFT is 賣家聊聊');
    assert.equal(performARInteraction(RIGHT), true);
    assert.deepEqual(bought, [1], 'RIGHT is 直接購買');
  } finally {
    mounted.unmount();
  }
});
