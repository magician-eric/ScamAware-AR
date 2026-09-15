// TopupWarning is on the main line, so its buttons and its AR geometry have
// to be the same two things.
//
// Spec §13 AD-23 wired PrivateChat's s22-choice into
// /scenario02-romance/topup-warning, which turned this page from a URL-only
// screen into 成功反詐's real entrance. The AR Interaction Contract offers a
// screen at most two actions (LEFT, RIGHT), and RedWarning used to draw three
// buttons: 停止付款, 撥打反詐專線 165, and 我已了解，仍要繼續. On a page nobody
// reached that was harmless; on the main line it is a control a tap can
// operate and a gesture never can.
//
// This suite pins both halves of the fix together, because either one alone
// can regress silently: the markup must render exactly the two actions, and
// the contract those two map onto must stay dual -> single. It also pins that
// the opt-out is per instance - DepositWarning is off the main line (AD-24)
// and keeps its hotline button.
//
// Run with scripts/register-gesture-contract-loaders.mjs, which compiles the
// app's JSX and stubs react-router-dom so these screens mount outside a
// <Router> (see scripts/stubs/react-router-dom.mjs).
import assert from 'node:assert/strict';
import test from 'node:test';
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

const { AR_GESTURES, getCurrentARInteraction, performARInteraction, resetARInteractionContract } =
  await import('../src/lib/arInteraction/index.js');
const { LEFT, RIGHT } = AR_GESTURES;
const { navigations, resetNavigations } = await import('react-router-dom');

const { TopupWarning } = await import('../src/pages/scenario02/TopupWarning.jsx');
const { DepositWarning } = await import('../src/pages/scenario02/DepositWarning.jsx');
const { RedWarning } = await import('../src/pages/scenario02/components/RedWarning.jsx');

const HOTLINE_LABEL = '撥打反詐專線 165';

test.beforeEach(() => {
  resetARInteractionContract();
  resetNavigations();
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
});

// The <RedWarning> element a page hands its props to. Read out of the page's
// own render output rather than restated here, so what the contract test
// mounts below is literally what the page passes - a page that stopped
// passing hotline={false} cannot slip through by the test using its own copy
// of the props.
function redWarningPropsOf(Page) {
  const mounted = mountSurface(Page);
  const found = [];
  (function walk(node) {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!React.isValidElement(node)) return;
    if (node.type === RedWarning) found.push(node.props);
    React.Children.toArray(node.props?.children ?? []).forEach(walk);
  })(mounted.output);
  mounted.unmount();
  assert.equal(found.length, 1, `${Page.name} must render exactly one RedWarning`);
  return found[0];
}

const buttonsIn = (markup) => markup.match(/<button\b/g) ?? [];

// ---------------------------------------------------------------------------
// The markup: exactly the two actions the contract has
// ---------------------------------------------------------------------------
test('TopupWarning renders exactly two story actions, and no 165 button', () => {
  const markup = renderToStaticMarkup(React.createElement(TopupWarning));

  assert.ok(markup.includes('停止付款'), 'LEFT (停止付款) must be on screen');
  assert.ok(markup.includes('我已了解，仍要繼續'), 'RIGHT (我已了解，仍要繼續) must be on screen');
  assert.ok(
    !markup.includes(HOTLINE_LABEL),
    'TopupWarning must not render 撥打反詐專線 165 - a gesture has nothing to run it with',
  );
  assert.equal(
    buttonsIn(markup).length, 2,
    'TopupWarning offers exactly two buttons, one per gesture direction',
  );
});

test('TopupWarning turns the hotline off at the instance, not in the shared component', () => {
  assert.equal(redWarningPropsOf(TopupWarning).hotline, false);
  // AD-24: DepositWarning is deliberately off the main line and unchanged.
  const deposit = redWarningPropsOf(DepositWarning);
  assert.equal(deposit.hotline, undefined, 'DepositWarning must not opt out of the hotline');
  const markup = renderToStaticMarkup(React.createElement(DepositWarning));
  assert.ok(markup.includes(HOTLINE_LABEL), 'DepositWarning keeps its 165 button');
  assert.equal(buttonsIn(markup).length, 3, 'DepositWarning still offers three buttons');
});

// ---------------------------------------------------------------------------
// The contract those two buttons map onto
// ---------------------------------------------------------------------------
test('TopupWarning is dual, then single once the player stops', () => {
  const props = redWarningPropsOf(TopupWarning);
  const mounted = mountSurface(RedWarning, props);

  const open = getCurrentARInteraction();
  assert.equal(open.mode, 'dual');
  assert.equal(open.surfaceId, 'scenario02/topup-warning');
  assert.equal(open.leftAvailable, true);
  assert.equal(open.rightAvailable, true);

  // LEFT = 停止付款. It does not leave the screen, it collapses it to the one
  // remaining action.
  assert.equal(performARInteraction(LEFT), true);
  assert.deepEqual(navigations, [], '停止付款 does not navigate by itself');

  const stopped = getCurrentARInteraction();
  assert.equal(stopped.mode, 'single');
  assert.equal(stopped.surfaceId, 'scenario02/topup-warning/stopped');
  assert.equal(stopped.leftAvailable, false);
  assert.equal(performARInteraction(LEFT), false, 'there is no LEFT left to run');

  const markup = renderToStaticMarkup(mounted.output);
  assert.ok(markup.includes('查看結果'), 'the one remaining action is 查看結果');
  assert.equal(buttonsIn(markup).length, 1, 'the stopped state offers exactly one button');

  // RIGHT = 查看結果 -> 成功反詐.
  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(navigations, [['/scenario02-romance/stopped-result']]);
  mounted.unmount();
});

test('TopupWarning RIGHT continues into the scam, unchanged', () => {
  const mounted = mountSurface(RedWarning, redWarningPropsOf(TopupWarning));
  assert.equal(getCurrentARInteraction().mode, 'dual');
  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(navigations, [['/scenario02-romance/guarantee']]);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// The two Scenario 02 paths this page sits on
// ---------------------------------------------------------------------------
test('Scenario 02 safe and scam paths both run end to end from s22-choice', async () => {
  const { buildNodes } = await import('../src/pages/scenario02/PrivateChat.jsx');
  const byId = Object.fromEntries(buildNodes('zh').map((node) => [node.id, node]));
  const [left, right] = byId['s22-choice'].options;

  // safe: s22-choice LEFT -> TopupWarning -> 停止付款 -> 查看結果 -> StoppedResult
  assert.equal(byId[left.next].custom.route, '/scenario02-romance/topup-warning');
  const safe = mountSurface(RedWarning, redWarningPropsOf(TopupWarning));
  performARInteraction(LEFT);
  performARInteraction(RIGHT);
  assert.deepEqual(navigations, [['/scenario02-romance/stopped-result']]);
  safe.unmount();

  // scam: s22-choice RIGHT -> GuaranteePage -> ScammedResult
  resetNavigations();
  assert.equal(byId[right.next].custom.route, '/scenario02-romance/guarantee');
  const { GuaranteePage } = await import('../src/pages/scenario02/GuaranteePage.jsx');
  const guarantee = mountSurface(GuaranteePage);
  assert.equal(getCurrentARInteraction().surfaceId, 'scenario02/guarantee');
  const scammedMarkup = renderToStaticMarkup(guarantee.output);
  assert.ok(scammedMarkup.includes('完成驗證'));
  guarantee.unmount();
});
