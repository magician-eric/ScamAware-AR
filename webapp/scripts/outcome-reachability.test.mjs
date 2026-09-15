// Final-outcome reachability (spec §4.3, §13 AD-23).
//
// Every scenario ends on a final decision with two branches, and each branch
// has to arrive at a different one of that scenario's two結局. Ten cells, five
// scenarios: 詐騙成立 and 成功反詐, both actually walkable.
//
// This suite exists because the ownership suites could not see AD-23. They
// checked that a route string appeared in a file - `PrivateChat.jsx` mentions
// `/scenario02-romance/topup-warning`, `TopupWarning.jsx` mentions
// `/scenario02-romance/stopped-result` - and every such check passed while
// Scenario 02's 成功反詐 was unreachable: both options of `s22-choice` pointed
// at the same node, so the branch that would have led there did not exist. A
// route existing, a page existing and a file naming a URL are three facts that
// together still prove nothing about where a player can get to.
//
// So nothing here asserts `source.includes('/some-route')`. Each scenario gets
// its own small adapter that starts at that scenario's real final decision and
// derives where the two branches land:
//
//   S01  mount WithdrawFail, run the two branches of its declared final
//        decision, and read the navigation each one performs
//   S02  read s22-choice out of PrivateChat's dialogue tree, then run
//        RedWarning (as TopupWarning configures it) and GuaranteePage to the
//        end of each branch
//   S03  mount FinalDecision, run both branches; the safe one is decided on
//        the spot (撥打 165 IS the successful anti-fraud judgement) and lands
//        straight on the 成功反詐 outcome, the scammed one runs through the
//        post-transfer aftermath
//   S04  walk the platform-support tree to the two terminal nodes a real
//        choice separates, then mount PlatformSupportChat at each and read the
//        navigation its outcome effect performs
//   S05  read buyer.s07.explain out of the buyer tree and follow the two
//        branches through their redirects, running OrderGone at the end of the
//        scam one
//
// Failure modes this is built to catch, all of which used to pass:
//   * a final decision whose two branches converge on one node again (AD-23)
//   * an outcome route deleted, or repointed at something that is not an
//     outcome screen
//   * a final decision removed or bypassed, so no branch reaches an outcome
//   * a結局 that becomes URL-only again - a page still registered and still
//     rendering, that nothing in the story navigates to
//
// It deliberately builds no general traversal engine and normalises nothing
// across the five scenarios: each adapter is written against the architecture
// its scenario actually has (a dual AR surface, a dialogue tree, a redirect
// chain), which is what keeps it readable when one of them changes.
//
// Run with scripts/register-outcome-reachability-loaders.mjs - the JSX loader,
// the react-router-dom stub that records navigations, and a stub for GuGo
// Invest's TypeScript surface (see scripts/stubs/gugo-invest-app.mjs).
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
const { navigations, resetNavigations, setParams, resetParams } = await import('react-router-dom');

const { WithdrawFail } = await import('../src/pages/scenario01/WithdrawFail.jsx');
const { buildNodes } = await import('../src/pages/scenario02/PrivateChat.jsx');
const { TopupWarning } = await import('../src/pages/scenario02/TopupWarning.jsx');
const { GuaranteePage } = await import('../src/pages/scenario02/GuaranteePage.jsx');
const { RedWarning } = await import('../src/pages/scenario02/components/RedWarning.jsx');
const { FinalDecision } = await import('../src/pages/scenario03/FinalDecision.jsx');
const { Aftermath } = await import('../src/pages/scenario03/Aftermath.jsx');
const { updateScenario03State } = await import('../src/lib/scenario03Store.js');
const { BALANCE_TOTAL } = await import('../src/data/scenario03Config.js');
const { buildPlatformSupportTree } = await import('../src/data/dialogueTrees/platformSupport.js');
const { PlatformSupportChat } = await import('../src/pages/scenario04/PlatformSupportChat.jsx');
const { saveDialogueCheckpoint } = await import('../src/lib/shoppingStore.js');
const { buildBuyerTree } = await import('../src/data/scenario05Dialogues.js');
const { OrderGone } = await import('../src/pages/scenario05/OrderGone.jsx');

// ---------------------------------------------------------------------------
// The ten cells, spelled out
// ---------------------------------------------------------------------------
//
// The one thing this file enumerates. Everything else is derived: these are
// the destinations each scenario's two branches have to arrive at, and an
// adapter that produces anything else - the same URL twice included - fails.
const SCENARIOS = [
  { id: 'Scenario 01', scammed: '/scenario01-investment/scammed-result', safe: '/scenario01-investment/stopped-result' },
  { id: 'Scenario 02', scammed: '/scenario02-romance/scammed-result', safe: '/scenario02-romance/stopped-result' },
  { id: 'Scenario 03', scammed: '/scenario03-police/ending/failure', safe: '/scenario03-police/ending/success' },
  { id: 'Scenario 04', scammed: '/scenario04-shopping/result/health/fail', safe: '/scenario04-shopping/result/health/success' },
  { id: 'Scenario 05', scammed: '/scenario05-atm/ending-scammed', safe: '/scenario05-atm/ending-caught' },
];

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

// Several of these screens end a beat on a timer (a verification that
// "processes", a courier page that settles). Capture the callbacks instead of
// waiting on the wall clock, and restore the real ones afterwards so the test
// runner keeps its own. setInterval is answered but never fires: the only
// caller is scenario03's in-call seconds counter, which paints a number.
function withFakeTimers(run) {
  const real = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  };
  const queue = [];
  globalThis.setTimeout = (fn) => queue.push(fn);
  globalThis.clearTimeout = () => {};
  globalThis.setInterval = () => 0;
  globalThis.clearInterval = () => {};
  const settle = () => {
    let guard = 0;
    while (queue.length) {
      if (guard += 1, guard > 500) throw new Error('the screen\'s timers never settled');
      queue.shift()();
    }
  };
  try {
    return run(settle);
  } finally {
    Object.assign(globalThis, real);
  }
}

// A fresh screen, with nothing left over from the last one.
function mount(Component, props) {
  resetARInteractionContract();
  resetNavigations();
  return mountSurface(Component, props);
}

// The one route a just-run handler navigated to. "One" is part of the
// assertion: a branch that fires two navigations is not a branch.
function navigatedTo(what) {
  assert.equal(navigations.length, 1, `${what}: expected exactly one navigation, got ${JSON.stringify(navigations)}`);
  return navigations[0][0];
}

// Walks the elements a mounted screen returned, including the ones it passes
// as props (scenario01 hands its two buttons to the platform card as
// `actions`), and collects a prop off every element that carries it.
function propsInTree(node, name, found = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => propsInTree(child, name, found));
    return found;
  }
  if (!React.isValidElement(node)) return found;
  const props = node.props ?? {};
  if (props[name] !== undefined) found.push(props[name]);
  for (const value of Object.values(props)) propsInTree(value, name, found);
  return found;
}

// The single <RedWarning> a scenario02 warning page configures, read out of
// that page's own render output - so what is mounted below is literally the
// props the page passes, never a second copy written here.
function redWarningPropsOf(Page) {
  const mounted = mount(Page);
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

// ---------------------------------------------------------------------------
// Every destination an adapter produces has to be a real outcome screen
// ---------------------------------------------------------------------------
const routesSource = await readFile(new URL('../src/routes.jsx', import.meta.url), 'utf8');

const pageFiles = new Map();
for (const [, names, file] of routesSource.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(\.\/pages\/[^']+)'/g)) {
  for (const entry of names.split(',')) {
    const [original, alias] = entry.trim().split(/\s+as\s+/);
    if (original) pageFiles.set(alias ?? original, `src${file.slice(1)}.jsx`);
  }
}
const registeredRoutes = routesSource.split('\n').flatMap((line) => {
  const path = line.match(/path:\s*'([^']*)'/);
  if (!path) return [];
  return [{ path: `/${path[1]}`, elements: [...line.matchAll(/<(\w+)\s*\/>/g)].map(([, name]) => name) }];
});

// The page a URL actually lands on, resolved through routes.jsx the way the
// router would: a `:param` segment matches whatever is in that position.
function pageAt(url) {
  const wanted = url.split('/').filter(Boolean);
  for (const route of registeredRoutes) {
    const parts = route.path.split('/').filter(Boolean);
    if (parts.length !== wanted.length) continue;
    if (!parts.every((part, index) => part.startsWith(':') || part === wanted[index])) continue;
    const named = route.elements.find((name) => pageFiles.has(name));
    return named ? pageFiles.get(named) : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Scenario 01 - WithdrawFail's final decision
// ---------------------------------------------------------------------------
//
// The screen belongs to the platform; the decision does not (see that file's
// header). It declares one dual surface, and the two branches are run here.
function scenario01() {
  return withFakeTimers(() => {
    let buttons = null;
    const branch = (gesture) => {
      const mounted = mount(WithdrawFail);
      const contract = getCurrentARInteraction();
      assert.equal(contract.mode, 'dual', 'WithdrawFail is scenario01\'s two-way final decision');
      assert.equal(contract.surfaceId, 'scenario01/withdraw-fail/final-decision');
      // The two buttons the screen draws, read off its own output rather than
      // restated here.
      buttons = [...new Set(propsInTree(mounted.output, 'to'))].sort();
      assert.equal(performARInteraction(gesture), true);
      const to = navigatedTo(`S01 ${gesture}`);
      mounted.unmount();
      return to;
    };
    const scammed = branch(LEFT);
    const safe = branch(RIGHT);
    // Taps and gestures have to be the same decision: two buttons, going to
    // the same two places the two gestures do.
    assert.deepEqual(
      buttons, [scammed, safe].sort(),
      'scenario01\'s buttons and its gestures no longer lead to the same two結局',
    );
    return { scammed, safe };
  });
}

// ---------------------------------------------------------------------------
// Scenario 02 - s22-choice, then the screen each reply lands on
// ---------------------------------------------------------------------------
function scenario02(language = 'zh') {
  const byId = Object.fromEntries(buildNodes(language).map((node) => [node.id, node]));
  const decision = byId['s22-choice'];
  assert.ok(decision, 's22-choice is gone - Scenario 02 has no final decision');
  assert.equal(decision.options.length, 2, 's22-choice must offer exactly two replies');

  const [left, right] = decision.options;
  assert.notEqual(
    left.next, right.next,
    'both s22-choice replies lead to the same node - that is AD-23, and it deletes Scenario 02\'s 成功反詐 branch',
  );
  const platformRoute = (option, side) => {
    const node = byId[option.next];
    assert.ok(node, `s22-choice ${side} points at a node that does not exist (${option.next})`);
    assert.equal(node.custom?.kind, 'goto-platform', `s22-choice ${side} no longer hands over to a platform screen`);
    return node.custom.route;
  };

  return withFakeTimers((settle) => {
    // Safe: the reply hands over to the mandatory 驗證金 warning, 停止付款
    // collapses it to one action, and that action is 成功反詐.
    assert.equal(platformRoute(left, 'LEFT'), '/scenario02-romance/topup-warning');
    const warning = mount(RedWarning, redWarningPropsOf(TopupWarning));
    assert.equal(getCurrentARInteraction().mode, 'dual');
    assert.equal(performARInteraction(LEFT), true);
    assert.deepEqual(navigations, [], '停止付款 does not leave the screen by itself');
    assert.equal(getCurrentARInteraction().mode, 'single');
    assert.equal(performARInteraction(RIGHT), true);
    const safe = navigatedTo('S02 safe');
    warning.unmount();

    // Scam: the other reply hands over to the verification payment, which
    // always ends on the freeze notice and its one way on.
    assert.equal(platformRoute(right, 'RIGHT'), '/scenario02-romance/guarantee');
    const guarantee = mount(GuaranteePage);
    assert.equal(getCurrentARInteraction().surfaceId, 'scenario02/guarantee');
    assert.equal(performARInteraction(RIGHT), true);
    settle();
    assert.equal(getCurrentARInteraction().surfaceId, 'scenario02/guarantee/frozen');
    assert.equal(performARInteraction(RIGHT), true);
    const scammed = navigatedTo('S02 scam');
    guarantee.unmount();

    return { scammed, safe };
  });
}

// ---------------------------------------------------------------------------
// Scenario 03 - FinalDecision, plus the one screen a branch runs through:
// the post-transfer aftermath (scammed). The safe branch runs through
// nothing - 撥打 165 lands on the 成功反詐 outcome directly.
// ---------------------------------------------------------------------------
function scenario03() {
  return withFakeTimers((settle) => {
    const branch = (gesture) => {
      const mounted = mount(FinalDecision);
      const contract = getCurrentARInteraction();
      assert.equal(contract.mode, 'dual', 'FinalDecision is scenario03\'s two-way final decision');
      assert.equal(contract.surfaceId, 'scenario03/final-decision');
      assert.equal(performARInteraction(gesture), true);
      const to = navigatedTo(`S03 ${gesture}`);
      mounted.unmount();
      return to;
    };
    const viaAftermath = branch(LEFT);
    const safe = branch(RIGHT);
    assert.notEqual(viaAftermath, safe, 'both branches of scenario03\'s final decision go to the same place');
    assert.equal(viaAftermath, '/scenario03-police/aftermath', 'the scammed branch no longer skips the aftermath');
    assert.equal(safe, '/scenario03-police/ending/success', 'the safe branch no longer resolves on the decision itself');

    // 確認轉帳 leaves the run's state saying the transfer happened, which is
    // what lets the aftermath mount at all. Restore that here: `branch(RIGHT)`
    // above ran the 165 handler last, and this walker drives both branches out
    // of order on purpose.
    updateScenario03State({ transferAmount: BALANCE_TOTAL, ending: 'failure' });

    // The aftermath plays itself out - the prosecutor's "wait for our message",
    // the 幾天後 skip, both accounts gone - with nothing to press until the
    // last beat, and then exactly one way on.
    const after = mount(Aftermath);
    assert.equal(getCurrentARInteraction().mode, 'display', 'the aftermath asks the player for nothing while it plays');
    settle();
    const gone = getCurrentARInteraction();
    assert.equal(gone.mode, 'single', 'the last aftermath beat offers exactly one way on');
    assert.equal(gone.surfaceId, 'scenario03/aftermath/continue');
    assert.equal(performARInteraction(LEFT), false, 'the aftermath adds no second choice');
    assert.equal(performARInteraction(RIGHT), true);
    const scammed = navigatedTo('S03 aftermath');
    after.unmount();

    return { scammed, safe };
  });
}

// ---------------------------------------------------------------------------
// Scenario 04 - the platform-support tree, then the screen that reads it
// ---------------------------------------------------------------------------
//
// This scenario's final decision is data: the outcome is decided by which
// terminal node the conversation ends on, and PlatformSupportChat turns that
// node into a route. Both halves are derived - the terminals by walking the
// tree from its opening node, the routes by mounting the screen at each
// terminal and reading the navigation its outcome effect performs.
function scenario04() {
  const tree = buildPlatformSupportTree('zh');
  const byId = Object.fromEntries(tree.map((node) => [node.id, node]));
  const choicesOf = (node) => (typeof node.choices === 'function' ? node.choices({ warningFlags: [] }, []) : node.choices) ?? [];

  const terminalsFrom = (startId, seen = new Set()) => {
    if (seen.has(startId)) return new Set();
    seen.add(startId);
    const node = byId[startId];
    assert.ok(node, `the platform-support tree points at a node that does not exist (${startId})`);
    const found = new Set();
    if (node.terminal) found.add(node.id);
    for (const choice of choicesOf(node)) {
      for (const id of terminalsFrom(choice.nextNodeId, seen)) found.add(id);
    }
    if (node.autoNextNodeId) for (const id of terminalsFrom(node.autoNextNodeId, seen)) found.add(id);
    return found;
  };

  // The one node whose replies actually separate the two endings. Found by
  // what the branches lead to, not by its name: a tree that stopped
  // separating them anywhere has no such node and fails here.
  const decisions = tree.filter((node) => {
    const options = choicesOf(node);
    if (options.length < 2) return false;
    const perChoice = options.map((choice) => [...terminalsFrom(choice.nextNodeId)].sort().join('|'));
    return new Set(perChoice).size > 1;
  });
  assert.equal(
    decisions.length, 1,
    `expected exactly one node where scenario04's two endings part, found ${decisions.map((node) => node.id).join(', ') || 'none'}`,
  );

  const reachable = terminalsFrom('shared.platform.bot.opening');
  assert.equal(reachable.size, 2, `scenario04 reaches ${reachable.size} terminal nodes from its opening, not two`);
  const [decision] = decisions;
  assert.ok(
    [...reachable].every((id) => terminalsFrom(decision.id).has(id)),
    `${decision.id} does not reach both of scenario04's endings`,
  );

  return withFakeTimers((settle) => {
    const routeFor = (terminalId) => {
      globalThis.localStorage.clear();
      globalThis.sessionStorage.clear();
      // The conversation is placed at the terminal node it really ends on, so
      // the screen's own outcome effect does the deciding.
      saveDialogueCheckpoint('platform-health', {
        timeline: [], currentNodeId: terminalId, done: true, pendingChoicesNodeId: null,
      });
      setParams({ route: 'health' });
      const mounted = mount(PlatformSupportChat);
      settle();
      const to = navigatedTo(`S04 ${terminalId}`);
      mounted.unmount();
      resetParams();
      return to;
    };
    const routes = [...reachable].map((id) => [id, routeFor(id)]);
    const scammed = routes.find(([, to]) => to.endsWith('/fail'))?.[1];
    const safe = routes.find(([, to]) => to.endsWith('/success'))?.[1];
    return { scammed, safe, terminals: [...reachable].sort() };
  });
}

// ---------------------------------------------------------------------------
// Scenario 05 - buyer.s07.explain, and the redirects each reply runs through
// ---------------------------------------------------------------------------
//
// The buyer chat hands the player off to a real screen by navigating to a
// node's `redirectTo` (features/ghostorder/dialogueEngine.js), so following
// those is following the player.
function scenario05(product = { id: 'tablet', name: '10.9 吋二手平板' }) {
  const byId = Object.fromEntries(buildBuyerTree(product, 'zh').map((node) => [node.id, node]));
  const decision = byId['buyer.s07.explain'];
  assert.ok(decision, 'buyer.s07.explain is gone - Scenario 05 has no final decision');
  assert.equal(decision.choices.length, 2, 'buyer.s07.explain must offer exactly two replies');

  const [stop, ship] = decision.choices;
  assert.notEqual(stop.nextNodeId, ship.nextNodeId, 'both replies to the ghost order lead to the same node');

  // Follows autoNextNodeId and single-reply nodes until a node hands the
  // player off to a screen, and answers where that hand-off goes.
  const redirectFrom = (startId, what) => {
    let id = startId;
    for (let step = 0; step < 12; step += 1) {
      const node = byId[id];
      assert.ok(node, `${what}: the buyer tree points at a node that does not exist (${id})`);
      if (node.redirectTo) return { to: node.redirectTo, resumeAt: node.resumeNodeId };
      if (node.autoNextNodeId) { id = node.autoNextNodeId; continue; }
      assert.equal(node.choices?.length, 1, `${what}: ${id} is a fork this walk cannot follow`);
      id = node.choices[0].nextNodeId;
    }
    throw new Error(`${what}: no hand-off within 12 nodes of ${startId}`);
  };

  const safe = redirectFrom(stop.nextNodeId, 'S05 safe').to;

  // The scam branch is three hand-offs long: ship the item, come back to a
  // dead account, then go looking for the money.
  const ship1 = redirectFrom(ship.nextNodeId, 'S05 scam');
  assert.equal(ship1.to, '/scenario05-atm/hpe-ship', 'the scam branch no longer ships the item');
  assert.ok(ship1.resumeAt, 'the courier hand-off no longer comes back to the chat');
  const ship2 = redirectFrom(ship1.resumeAt, 'S05 scam');
  assert.equal(ship2.to, '/scenario05-atm/order-gone', 'the scam branch no longer ends at the vanished order');

  return withFakeTimers((settle) => {
    const mounted = mount(OrderGone);
    settle();
    assert.equal(getCurrentARInteraction().surfaceId, 'scenario05/order-gone');
    assert.equal(performARInteraction(RIGHT), true);
    const scammed = navigatedTo('S05 scam');
    mounted.unmount();
    return { scammed, safe };
  });
}

// ---------------------------------------------------------------------------
// The matrix
// ---------------------------------------------------------------------------
const ADAPTERS = {
  'Scenario 01': scenario01,
  'Scenario 02': scenario02,
  'Scenario 03': scenario03,
  'Scenario 04': scenario04,
  'Scenario 05': scenario05,
};

test('both outcomes of every scenario are reachable from its own final decision', async (t) => {
  let reachable = 0;
  for (const expected of SCENARIOS) {
    await t.test(expected.id, () => {
      const actual = ADAPTERS[expected.id]();
      assert.notEqual(
        actual.scammed, actual.safe,
        `${expected.id}: both branches of the final decision arrive at the same結局`,
      );
      assert.equal(actual.scammed, expected.scammed, `${expected.id}: the 詐騙成立 branch changed destination`);
      assert.equal(actual.safe, expected.safe, `${expected.id}: the 成功反詐 branch changed destination`);
      reachable += 2;
    });
  }
  assert.equal(reachable, 10, `outcome reachability is ${reachable}/10`);
});

test('every destination a branch arrives at is a registered outcome screen', async (t) => {
  for (const expected of SCENARIOS) {
    for (const [tone, url] of [['詐騙成立', expected.scammed], ['成功反詐', expected.safe]]) {
      await t.test(`${expected.id} ${tone}`, async () => {
        const file = pageAt(url);
        assert.ok(file, `${url} is not registered in routes.jsx - a branch leads nowhere`);
        const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
        assert.match(
          source, /<ScenarioOutcome[\s/>]/,
          `${url} lands on ${file}, which is not an outcome screen`,
        );
      });
    }
  }
});

// Scenario 02's dialogue tree is built per language, and AD-23 was a routing
// bug in that build - so the branch that used to be missing is checked in all
// three, not only the one the tests happen to run in.
test('Scenario 02\'s two branches survive translation', async (t) => {
  for (const language of ['zh', 'en', 'jp']) {
    await t.test(language, () => {
      const actual = scenario02(language);
      assert.equal(actual.scammed, '/scenario02-romance/scammed-result');
      assert.equal(actual.safe, '/scenario02-romance/stopped-result');
    });
  }
});

// The other product a Scenario 05 run can be drawn with walks the same tree,
// and a copy edit on one product's chat must not quietly reshape it.
test('Scenario 05 reaches both endings whichever item was listed', async (t) => {
  for (const product of [{ id: 'tablet', name: '10.9 吋二手平板' }, { id: 'stroller', name: '輕量型嬰兒手推車' }]) {
    await t.test(product.id, () => {
      const actual = scenario05(product);
      assert.equal(actual.scammed, '/scenario05-atm/ending-scammed');
      assert.equal(actual.safe, '/scenario05-atm/ending-caught');
    });
  }
});
