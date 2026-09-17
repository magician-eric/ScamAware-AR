// AR Interaction Contract (Gesture Contract) suite - src/lib/arInteraction.
//
// What this pins is the contract a future Gesture Bridge will be built
// against: for the screen that is on right now, which semantic actions may a
// LEFT or a RIGHT gesture run, and - just as important - when must a gesture
// run nothing at all. There is no gesture recognition here and none is
// required: the tests call the contract's own semantic entry point, exactly
// as a Bridge would once it has decided a wave happened.
//
// This is a different job from `audit:ar-interactions` / `test:ar-interactions`,
// which inventory interaction *definitions in source* and guard against
// regressions there. Those look at the whole tree; this looks at one live
// screen. Neither replaces the other and they stay separate tools.
//
// Run with scripts/register-gesture-contract-loaders.mjs: the shared JSX
// loader plus a react-router-dom stub, so real scenario screens can be
// mounted outside a <Router> (see scripts/stubs/react-router-dom.mjs).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { mountSurface } from './ar-surface-harness.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// lib/lang.js reads the player's language out of localStorage, and
// scenario05's store keeps its run state there. Nothing below depends on
// which language wins; the store contents are seeded per test.
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

const {
  AR_GESTURES,
  AR_INTERACTION_MODES,
  AR_MAX_ACTIONS,
  getCurrentARInteraction,
  performARInteraction,
  performARInteractionWithResult,
  registerARInteraction,
  releaseARInteraction,
  resetARInteractionContract,
  useARInteraction,
  validateARInteraction,
} = await import('../src/lib/arInteraction/index.js');

const { LEFT, RIGHT } = AR_GESTURES;


// A bare screen that declares nothing but a contract - used for the pure
// lifecycle rules, so those tests do not depend on any scenario's story.
const surface = (declaration) => function TestSurface() {
  useARInteraction(typeof declaration === 'function' ? declaration() : declaration);
  return null;
};

test.beforeEach(() => {
  resetARInteractionContract();
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// A. display -> 0 actions
// ---------------------------------------------------------------------------
test('A. display surface exposes no action at all', () => {
  const mounted = mountSurface(surface({ mode: 'display', surfaceId: 'test/display' }));

  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, AR_INTERACTION_MODES.DISPLAY);
  assert.equal(snapshot.leftAvailable, false);
  assert.equal(snapshot.rightAvailable, false);
  assert.equal(snapshot.surfaceId, 'test/display');

  assert.equal(performARInteraction(LEFT), false);
  assert.equal(performARInteraction(RIGHT), false);
  mounted.unmount();
});

test('A. no registered surface at all is display, not a crash', () => {
  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, AR_INTERACTION_MODES.DISPLAY);
  assert.equal(snapshot.surfaceId, null);
  assert.equal(performARInteraction(LEFT), false);
  assert.equal(performARInteraction(RIGHT), false);
});

// ---------------------------------------------------------------------------
// B. single -> RIGHT runs the one action, LEFT does not exist
// ---------------------------------------------------------------------------
test('B. single surface runs its action on RIGHT and has no LEFT', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'single',
    surfaceId: 'test/single',
    action: () => ran.push('action'),
  }));

  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, AR_INTERACTION_MODES.SINGLE);
  assert.equal(snapshot.leftAvailable, false);
  assert.equal(snapshot.rightAvailable, true);

  assert.equal(performARInteraction(LEFT), false);
  assert.deepEqual(ran, []);

  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(ran, ['action']);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// C. dual -> LEFT is the first action, RIGHT the second
// ---------------------------------------------------------------------------
test('C. dual surface maps LEFT to the first action and RIGHT to the second', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual',
    surfaceId: 'test/dual',
    left: () => ran.push('first'),
    right: () => ran.push('second'),
  }));

  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, AR_INTERACTION_MODES.DUAL);
  assert.equal(snapshot.leftAvailable, true);
  assert.equal(snapshot.rightAvailable, true);

  assert.equal(performARInteraction(LEFT), true);
  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(ran, ['first', 'second']);
  mounted.unmount();
});

test('C. the vocabulary is exactly LEFT and RIGHT - nothing else resolves', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual',
    left: () => ran.push('first'),
    right: () => ran.push('second'),
  }));

  ['up', 'down', 'scroll', 'select', '', null, undefined, 0, 2].forEach((gesture) => {
    assert.equal(performARInteraction(gesture), false, `gesture ${JSON.stringify(gesture)} must not resolve`);
  });
  assert.deepEqual(ran, []);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// D. unmount -> the action is gone
// ---------------------------------------------------------------------------
test('D. unmounting clears the contract and its actions', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual',
    surfaceId: 'test/leaving',
    left: () => ran.push('left'),
    right: () => ran.push('right'),
  }));
  assert.equal(getCurrentARInteraction().mode, AR_INTERACTION_MODES.DUAL);

  mounted.unmount();

  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, AR_INTERACTION_MODES.DISPLAY);
  assert.equal(snapshot.leftAvailable, false);
  assert.equal(snapshot.rightAvailable, false);
  assert.equal(snapshot.surfaceId, null);
  assert.equal(performARInteraction(LEFT), false);
  assert.equal(performARInteraction(RIGHT), false);
  assert.deepEqual(ran, []);
});

// ---------------------------------------------------------------------------
// E. surface replacement -> the previous screen's handler is unreachable
// ---------------------------------------------------------------------------
test('E. navigating from a dual screen to a single screen leaves only the new action', () => {
  const ran = [];
  const pageA = mountSurface(surface({
    mode: 'dual',
    surfaceId: 'test/page-a',
    left: () => ran.push('A.left'),
    right: () => ran.push('A.right'),
  }));
  pageA.unmount();
  const pageB = mountSurface(surface({
    mode: 'single',
    surfaceId: 'test/page-b',
    action: () => ran.push('B.action'),
  }));

  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, AR_INTERACTION_MODES.SINGLE);
  assert.equal(snapshot.surfaceId, 'test/page-b');
  assert.equal(snapshot.leftAvailable, false);

  // The previous page's LEFT must not still be wired to anything.
  assert.equal(performARInteraction(LEFT), false);
  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(ran, ['B.action']);
  pageB.unmount();
});

test('E. a late unmount of the outgoing screen cannot clear the incoming one', () => {
  // React is free to mount the next screen before running the previous
  // screen's cleanup. The newcomer must survive that ordering, and the
  // outgoing screen must still not leave its handlers behind.
  const ran = [];
  const pageA = mountSurface(surface({
    mode: 'dual',
    surfaceId: 'test/page-a',
    left: () => ran.push('A.left'),
    right: () => ran.push('A.right'),
  }));
  const pageB = mountSurface(surface({
    mode: 'single',
    surfaceId: 'test/page-b',
    action: () => ran.push('B.action'),
  }));
  pageA.unmount();

  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, AR_INTERACTION_MODES.SINGLE);
  assert.equal(snapshot.surfaceId, 'test/page-b');
  assert.equal(performARInteraction(LEFT), false);
  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(ran, ['B.action']);
  pageB.unmount();
});

test('E. every registration change moves the revision counter', () => {
  // The counter is what lets a Bridge turn one wave delivered over many
  // frames into one action, without this module debouncing anything itself.
  const start = getCurrentARInteraction().revision;
  const mounted = mountSurface(surface({ mode: 'single', action: () => {} }));
  const afterMount = getCurrentARInteraction().revision;
  mounted.unmount();
  const afterUnmount = getCurrentARInteraction().revision;

  assert.ok(afterMount > start, 'mounting must change the revision');
  assert.ok(afterUnmount > afterMount, 'unmounting must change the revision');
});

test('E. changing geometry without re-registering moves the revision too', () => {
  // The anti-fraud quiz is one registration whose geometry changes when it is
  // answered: `dual` becomes `single` with a different surfaceId, live,
  // through the same `read()`. That is a different interaction, so a gesture
  // recognised against the earlier one has to be able to tell.
  let answered = false;
  const mounted = mountSurface(surface(() => (answered
    ? { mode: 'single', surfaceId: 'test/answered', action: () => {} }
    : { mode: 'dual', surfaceId: 'test/asking', left: () => {}, right: () => {} })));

  const asking = getCurrentARInteraction();
  assert.equal(asking.mode, AR_INTERACTION_MODES.DUAL);

  answered = true;
  mounted.rerender();

  const after = getCurrentARInteraction();
  assert.equal(after.mode, AR_INTERACTION_MODES.SINGLE);
  assert.ok(after.revision > asking.revision, 'a changed geometry must move the revision');

  // A re-render that changes nothing but the handler closures is the same
  // interaction: inline arrow handlers are new objects every render, and a
  // counter that moved with them would call every gesture stale.
  const settled = getCurrentARInteraction().revision;
  mounted.rerender();
  assert.equal(getCurrentARInteraction().revision, settled);
  mounted.unmount();
});

test('E. performARInteractionWithResult keeps the action\'s own return value', async () => {
  const mounted = mountSurface(surface({
    mode: 'single', surfaceId: 'test/async', action: async () => 'done',
  }));

  const nothing = performARInteractionWithResult(LEFT);
  assert.deepEqual(nothing, { performed: false, result: undefined });

  const ran = performARInteractionWithResult(RIGHT);
  assert.equal(ran.performed, true);
  // The promise is handed back rather than dropped, which is what lets the
  // Gesture Bridge own it instead of leaving an unhandled rejection behind.
  assert.equal(typeof ran.result.then, 'function');
  assert.equal(await ran.result, 'done');
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// F. disabled -> the action does not run
// ---------------------------------------------------------------------------
test('F. a disabled surface runs nothing and reads as display', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual',
    surfaceId: 'test/disabled',
    disabled: true,
    left: () => ran.push('left'),
    right: () => ran.push('right'),
  }));

  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, AR_INTERACTION_MODES.DISPLAY);
  assert.equal(snapshot.leftAvailable, false);
  assert.equal(snapshot.rightAvailable, false);
  assert.equal(performARInteraction(LEFT), false);
  assert.equal(performARInteraction(RIGHT), false);
  assert.deepEqual(ran, []);
  mounted.unmount();
});

test('F. a single surface with a disabled CTA runs nothing', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'single',
    surfaceId: 'test/disabled-cta',
    disabled: true,
    action: () => ran.push('action'),
  }));

  assert.equal(getCurrentARInteraction().mode, AR_INTERACTION_MODES.DISPLAY);
  assert.equal(performARInteraction(RIGHT), false);
  assert.deepEqual(ran, []);
  mounted.unmount();
});

test('F. a side with no handler is unavailable without collapsing the other', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual',
    surfaceId: 'test/half',
    left: null,
    right: () => ran.push('right'),
  }));

  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.mode, AR_INTERACTION_MODES.DUAL);
  assert.equal(snapshot.leftAvailable, false);
  assert.equal(snapshot.rightAvailable, true);
  assert.equal(performARInteraction(LEFT), false);
  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(ran, ['right']);
  mounted.unmount();
});

test('F. availability is re-read at gesture time, not captured at mount', () => {
  let enabled = true;
  const ran = [];
  const mounted = mountSurface(surface(() => ({
    mode: 'single',
    surfaceId: 'test/live',
    disabled: !enabled,
    action: () => ran.push('action'),
  })));

  assert.equal(getCurrentARInteraction().mode, AR_INTERACTION_MODES.SINGLE);
  enabled = false;
  mounted.rerender();
  assert.equal(getCurrentARInteraction().mode, AR_INTERACTION_MODES.DISPLAY);
  assert.equal(performARInteraction(RIGHT), false);
  assert.deepEqual(ran, []);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// G. Shared 反詐小測驗 - the representative `dual` production surface
// ---------------------------------------------------------------------------
// Answering this screen does not end its interaction, it changes its
// geometry: the two options lock, but the 返回掃描 button is still a real
// story action. Two actions then one action, so `dual` then `single` - never
// `display`, which would mean the screen had nothing left to do.
const QUIZ_PROPS = {
  t: (zh) => zh,
  question: '對方要求你先付一筆保證金，你會怎麼做？',
  options: ['停止付款，查詢 165。', '先付保證金。'],
  correctIndex: 0,
  explanation: '解析',
};

// Walks the returned element tree for the 返回掃描 button, so the tests can
// check the tap path and the gesture path against each other rather than
// against a hardcoded route.
function findBackButton(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findBackButton(child);
      if (found) return found;
    }
    return null;
  }
  if (node.props?.className === 'antifraud-quiz-back') return node;
  return findBackButton(node.props?.children);
}

const mountQuiz = (ScenarioFinalDecision, props = {}) => {
  const answers = [];
  const mounted = mountSurface(ScenarioFinalDecision, {
    ...QUIZ_PROPS,
    ...props,
    onAnswer: (correct, index) => answers.push({ correct, index }),
  });
  return { mounted, answers };
};

test('G. the shared anti-fraud quiz is dual before an answer and single after', async () => {
  const { ScenarioFinalDecision } = await import('../src/components/ui/ScenarioFinalDecision.jsx');
  const { navigations, resetNavigations } = await import('./stubs/react-router-dom.mjs');
  resetNavigations();
  const { mounted, answers } = mountQuiz(ScenarioFinalDecision);

  const before = getCurrentARInteraction();
  assert.equal(before.mode, AR_INTERACTION_MODES.DUAL);
  assert.equal(before.leftAvailable, true);
  assert.equal(before.rightAvailable, true);

  // 1. Before answering: LEFT is option[0] - the safe/correct answer in all
  //    five scenarios.
  assert.equal(performARInteraction(LEFT), true);
  assert.deepEqual(answers, [{ correct: true, index: 0 }]);

  // 2. After answering: the two options are gone, so there is no LEFT.
  const after = getCurrentARInteraction();
  assert.equal(after.mode, AR_INTERACTION_MODES.SINGLE);
  assert.equal(after.leftAvailable, false);
  assert.equal(after.rightAvailable, true);
  assert.equal(performARInteraction(LEFT), false);

  // 4. And no gesture can produce a second answer.
  assert.equal(answers.length, 1, 'a second gesture must not produce a second answer');
  assert.deepEqual(navigations, [], 'answering must not have navigated on its own');

  // 3. After answering: RIGHT is the one remaining action - 返回掃描.
  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(navigations, [['/ar-scan']]);
  assert.equal(answers.length, 1);
  mounted.unmount();
});

test('G. RIGHT on the shared quiz picks option[1], the risky answer', async () => {
  const { ScenarioFinalDecision } = await import('../src/components/ui/ScenarioFinalDecision.jsx');
  const { resetNavigations } = await import('./stubs/react-router-dom.mjs');
  resetNavigations();
  const { mounted, answers } = mountQuiz(ScenarioFinalDecision, {
    options: ['安全作法', '有風險的作法'],
  });

  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(answers, [{ correct: false, index: 1 }]);
  assert.equal(getCurrentARInteraction().mode, AR_INTERACTION_MODES.SINGLE);
  mounted.unmount();
});

test('G. the quiz back button still navigates itself, unchanged', async () => {
  const { ScenarioFinalDecision } = await import('../src/components/ui/ScenarioFinalDecision.jsx');
  const { resetNavigations } = await import('./stubs/react-router-dom.mjs');
  resetNavigations();
  const { mounted } = mountQuiz(ScenarioFinalDecision);

  // 5. The tap path is a router link to `backTo`, before and after an
  //    answer, exactly as it was before the contract existed.
  const before = findBackButton(mounted.output);
  assert.ok(before, 'the 返回掃描 button must be rendered');
  assert.equal(before.props.to, '/ar-scan');
  assert.equal(before.props.onClick, undefined, 'the button must keep its own Link behaviour');

  performARInteraction(LEFT);
  const after = findBackButton(mounted.output);
  assert.equal(after.props.to, '/ar-scan');
  mounted.unmount();
});

test('G. the quiz gesture follows backTo, it does not hardcode /ar-scan', async () => {
  const { ScenarioFinalDecision } = await import('../src/components/ui/ScenarioFinalDecision.jsx');
  const { navigations, resetNavigations } = await import('./stubs/react-router-dom.mjs');
  resetNavigations();
  const { mounted } = mountQuiz(ScenarioFinalDecision, { backTo: '/scenario05-atm/quiz-back' });

  performARInteraction(LEFT);
  assert.equal(findBackButton(mounted.output).props.to, '/scenario05-atm/quiz-back');
  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(navigations, [['/scenario05-atm/quiz-back']], 'the gesture must go where the button goes');
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// H. Scenario 05 production surfaces - display-only, and a single CTA
// ---------------------------------------------------------------------------
test('H. OrderGone is display while processing and single once its CTA appears', async () => {
  const { navigations, resetNavigations } = await import('./stubs/react-router-dom.mjs');
  const { OrderGone } = await import('../src/pages/scenario05/OrderGone.jsx');
  resetNavigations();

  // The screen's processing beat ends on a timer; capture it instead of
  // waiting on the wall clock.
  const timers = [];
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (fn) => { timers.push(fn); return timers.length; };
  globalThis.clearTimeout = () => {};

  try {
    const mounted = mountSurface(OrderGone);

    // Waiting screen: nothing to do, and no button was added to give a
    // gesture something to do.
    const waiting = getCurrentARInteraction();
    assert.equal(waiting.mode, AR_INTERACTION_MODES.DISPLAY);
    assert.equal(waiting.leftAvailable, false);
    assert.equal(waiting.rightAvailable, false);
    assert.equal(waiting.surfaceId, 'scenario05/order-gone-processing');
    assert.equal(performARInteraction(LEFT), false);
    assert.equal(performARInteraction(RIGHT), false);

    timers.forEach((fn) => fn());

    // One story action: RIGHT runs it, and there is still no LEFT.
    const ready = getCurrentARInteraction();
    assert.equal(ready.mode, AR_INTERACTION_MODES.SINGLE);
    assert.equal(ready.leftAvailable, false);
    assert.equal(ready.rightAvailable, true);
    assert.equal(ready.surfaceId, 'scenario05/order-gone');

    assert.equal(performARInteraction(LEFT), false);
    assert.deepEqual(navigations, []);
    assert.equal(performARInteraction(RIGHT), true);
    assert.deepEqual(navigations, [['/scenario05-atm/ending-scammed']]);
    mounted.unmount();
  } finally {
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  }
});

test('H. HpeShip is a single CTA, and goes inactive while that CTA is disabled', async () => {
  const { HpeShip } = await import('../src/pages/scenario05/HpeShip.jsx');
  const seed = (patch) => globalThis.localStorage.setItem(
    'cibar-scenario05-state',
    JSON.stringify({ selectedProduct: 'tablet', shipStatus: 'idle', ...patch }),
  );

  seed({ shipStatus: 'idle' });
  const ready = mountSurface(HpeShip);
  const idle = getCurrentARInteraction();
  assert.equal(idle.mode, AR_INTERACTION_MODES.SINGLE);
  assert.equal(idle.leftAvailable, false);
  assert.equal(idle.rightAvailable, true);
  assert.equal(idle.surfaceId, 'scenario05/hpe-ship');
  ready.unmount();

  // Mid-montage the button is disabled; a gesture must not get past that.
  seed({ shipStatus: 'inTransit' });
  const montaging = mountSurface(HpeShip);
  const during = getCurrentARInteraction();
  assert.equal(during.mode, AR_INTERACTION_MODES.DISPLAY);
  assert.equal(during.rightAvailable, false);
  assert.equal(performARInteraction(RIGHT), false);
  montaging.unmount();
});

// ---------------------------------------------------------------------------
// The contract's own limits
// ---------------------------------------------------------------------------
test('more than two actions is reported as an AR contract violation', () => {
  assert.equal(AR_MAX_ACTIONS, 2);

  // A third choice, or an UP/DOWN/scroll action, has nowhere legal to go.
  ['third', 'up', 'down', 'scroll'].forEach((extra) => {
    const problems = validateARInteraction({ mode: 'dual', left: () => {}, right: () => {}, [extra]: () => {} });
    assert.equal(problems.length, 1, `'${extra}' must be reported`);
    assert.match(problems[0], new RegExp(`'${extra}'`));
  });

  assert.deepEqual(validateARInteraction({ mode: 'dual', left: () => {}, right: () => {} }), []);
  assert.deepEqual(validateARInteraction({ mode: 'single', action: () => {} }), []);
  assert.deepEqual(validateARInteraction({ mode: 'display' }), []);
  assert.equal(validateARInteraction({ mode: 'triple' }).length, 1);
  assert.equal(validateARInteraction(undefined).length, 1);
});

test('an unknown mode fails safe to display rather than guessing a geometry', () => {
  const ran = [];
  const warnings = [];
  const realWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    const mounted = mountSurface(surface({ mode: 'triple', left: () => ran.push('l'), right: () => ran.push('r') }));
    assert.equal(getCurrentARInteraction().mode, AR_INTERACTION_MODES.DISPLAY);
    assert.equal(performARInteraction(LEFT), false);
    assert.equal(performARInteraction(RIGHT), false);
    assert.deepEqual(ran, []);
    assert.ok(warnings.some((w) => w.includes('contract violation')), 'the violation must be reported');
    mounted.unmount();
  } finally {
    console.warn = realWarn;
  }
});

test('releasing a token that is no longer active is a no-op', () => {
  const first = registerARInteraction(() => ({ mode: 'single', surfaceId: 'first', action: () => {} }));
  const second = registerARInteraction(() => ({ mode: 'single', surfaceId: 'second', action: () => {} }));

  assert.equal(releaseARInteraction(first), false);
  assert.equal(getCurrentARInteraction().surfaceId, 'second');
  assert.equal(releaseARInteraction(second), true);
  assert.equal(getCurrentARInteraction().surfaceId, null);
  assert.equal(releaseARInteraction(second), false);
});

test('the snapshot is readable data only - no handler is ever exposed', () => {
  const mounted = mountSurface(surface({
    mode: 'dual',
    surfaceId: 'test/snapshot',
    left: function namedLeft() {},
    right: function namedRight() {},
  }));

  const snapshot = getCurrentARInteraction();
  assert.deepEqual(
    Object.keys(snapshot).sort(),
    ['active', 'declaredMode', 'leftAvailable', 'mode', 'presenting', 'revision', 'rightAvailable', 'surfaceId'],
  );
  Object.values(snapshot).forEach((value) => assert.notEqual(typeof value, 'function'));
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// What the contract layer must never contain
// ---------------------------------------------------------------------------
// Drops `//` and block comments. The three files scanned below contain no
// regex literal and no string holding `//`, so this stays exact for them.
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

test('the contract layer knows nothing about the DOM, a camera or any gesture SDK', async () => {
  const sources = await Promise.all([
    read('src/lib/arInteraction/interactionContract.js'),
    read('src/lib/arInteraction/useARInteraction.js'),
    read('src/lib/arInteraction/index.js'),
  ]);
  // Scanned with comments removed: this layer's whole point is documented in
  // prose that names the things it must never do, and that prose is not code.
  const code = stripComments(sources.join('\n'));

  // Gesture Bridge must reach React handlers, never the DOM.
  [
    'document.', 'querySelector', 'querySelectorAll', '.click(', 'getElementById',
    'getBoundingClientRect', 'dispatchEvent', 'data-gesture',
  ].forEach((forbidden) => {
    assert.equal(code.includes(forbidden), false, `contract layer must not contain ${forbidden}`);
  });

  // No device, vendor or recognition dependency of any kind.
  [
    'mediapipe', 'tensorflow', 'handpose', 'getusermedia', 'mediadevices',
    'navigator.', 'webxr', 'jorjin', '佐臻',
  ].forEach((forbidden) => {
    assert.equal(code.toLowerCase().includes(forbidden.toLowerCase()), false, `contract layer must not contain ${forbidden}`);
  });

  // React is the only runtime import in the whole layer.
  const imports = [...code.matchAll(/from '([^']+)'/g)].map((match) => match[1]);
  imports.forEach((specifier) => {
    assert.ok(
      specifier === 'react' || specifier.startsWith('./'),
      `contract layer must not import ${specifier}`,
    );
  });
});

test('the representative surfaces declare the contract in React, not through the DOM', async () => {
  const files = [
    'src/components/ui/ScenarioFinalDecision.jsx',
    'src/pages/scenario05/OrderGone.jsx',
    'src/pages/scenario05/HpeShip.jsx',
  ];
  const sources = await Promise.all(files.map(read));

  sources.forEach((raw, i) => {
    assert.ok(raw.includes('useARInteraction'), `${files[i]} must declare its contract`);
    const code = stripComments(raw);
    ['data-gesture', 'querySelector', '.click(', 'document.'].forEach((forbidden) => {
      assert.equal(code.includes(forbidden), false, `${files[i]} must not use ${forbidden}`);
    });
  });
});
