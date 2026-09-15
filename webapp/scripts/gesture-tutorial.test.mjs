// The gesture tutorial - src/pages/gestureTutorial/ plus the real input
// adapter it listens on (src/lib/arInteraction/native/jorjinGestureAdapter.js).
//
// The question this suite answers: does a player who reaches /ar-scan
// provably have completed the left step and then the right one, in that
// order, through one of the two inputs the tutorial accepts - and does each
// input reach the same step through the same state machine? Everything below
// exists to close one of the ways that could be untrue:
//
//   1. the flow      - /language sends the player here, this page sends them
//                      on to /ar-scan, and a finished scenario does not come
//                      back through here
//   2. the machine   - WAIT_LEFT ignores RIGHT, WAIT_RIGHT ignores LEFT
//   3. the input     - a real `jorjinGesture` event and the step's own panel
//                      are the two inputs, they run the identical transition,
//                      and nothing else moves the page: no keyboard, no timer,
//                      and no SELECT / HALT / PUSH
//   4. the copy      - all three languages, out of the i18n module, never
//                      hard-coded in the JSX
//   5. no way around - the only controls on the page are the two steps
//                      themselves; there is no skip, no link and no fourth
//                      way to reach COMPLETE
//
// The page is mounted for real (scripts/ar-surface-harness.mjs: real hooks,
// real effects, real cleanup) and driven by dispatching real CustomEvents at
// a real EventTarget standing in for `window` - the same events the Android
// WebView dispatches (android/.../GestureBridgeScript.java). Nothing here
// calls the page's internals directly, because a suite that did would prove
// nothing about the path a hand wave actually takes.
//
// Run: npm run test:gesture-tutorial
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test, { mock } from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// Drops `//` and block comments: this page is documented in prose that names
// the things it must never do, and that prose is not code.
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

// --- environment -------------------------------------------------------------

// lib/lang.js reads the chosen language out of localStorage, and the adapter
// listens on `window`. Same shims the AR suites install.
const storage = () => {
  let data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    clear: () => { data = {}; },
  };
};
globalThis.localStorage = storage();

const windowEvents = new EventTarget();
globalThis.window = Object.assign(globalThis, {
  addEventListener: windowEvents.addEventListener.bind(windowEvents),
  removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
  dispatchEvent: windowEvents.dispatchEvent.bind(windowEvents),
});

const { mountSurface } = await import('./ar-surface-harness.mjs');
const { navigations, resetNavigations } = await import('./stubs/react-router-dom.mjs');
const { GestureTutorial, GESTURE_TUTORIAL_COMPLETE_DELAY_MS } = await import('../src/pages/gestureTutorial/GestureTutorial.jsx');
const {
  GESTURE_TUTORIAL_INITIAL_STATE,
  GESTURE_TUTORIAL_STATES,
  GESTURE_TUTORIAL_STEP_COUNT,
  acceptsGesture,
  completedSteps,
  nextTutorialState,
} = await import('../src/pages/gestureTutorial/tutorialStateMachine.js');
const { getGestureTutorialStrings } = await import('../src/pages/gestureTutorial/i18n.js');
const {
  JORJIN_GESTURE_EVENT,
  readNativeGestureEvent,
  subscribeNativeGestures,
  toCanonicalGesture,
} = await import('../src/lib/arInteraction/native/jorjinGestureAdapter.js');

const { WAIT_LEFT, WAIT_RIGHT, COMPLETE } = GESTURE_TUTORIAL_STATES;

// The sources the rules below are read out of, once.
const SOURCES = {
  page: await read('src/pages/gestureTutorial/GestureTutorial.jsx'),
  machine: await read('src/pages/gestureTutorial/tutorialStateMachine.js'),
  adapter: await read('src/lib/arInteraction/native/jorjinGestureAdapter.js'),
};

// One real delivery from the glasses: the exact event shape
// GestureBridgeScript.deliver() builds, with the vendor's uppercase code.
// `count` is Android's running total of accepted gestures and `at` is
// `SystemClock.elapsedRealtime()`, which is why the clock below only ever
// climbs - including across a counter reset (see the reset test).
let deliveries = 0;
let clock = 10_000;
function wave(code, count = (deliveries += 1)) {
  clock += 700;
  window.dispatchEvent(new CustomEvent(JORJIN_GESTURE_EVENT, {
    detail: { gesture: code, label: code, count, at: clock },
  }));
}

// The native side restarting: JorjinHardwareManager.start() zeroes the
// accepted-gesture counter (activity foregrounded, or the 重新連接 button)
// while the WebView is only paused and resumed, never reloaded.
function nativeRestart() {
  deliveries = 0;
}

function mountTutorial(language = 'zh') {
  localStorage.setItem('language', language);
  resetNavigations();
  return mountSurface(GestureTutorial);
}

// --- reading the rendered page ----------------------------------------------

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

const nodesWithClass = (tree, name) => walk(tree).filter((n) => typeof n.props?.className === 'string' && n.props.className.split(' ').includes(name));
const stepsOf = (tree) => nodesWithClass(tree, 'gesture-tutorial-step');
const stepOf = (tree, side) => stepsOf(tree).find((n) => n.props.className.includes(`gesture-tutorial-step-${side}`));
const titleOf = (tree, side) => textOf(nodesWithClass(stepOf(tree, side), 'gesture-tutorial-step-title')[0]);
const instructionOf = (tree, side) => textOf(nodesWithClass(stepOf(tree, side), 'gesture-tutorial-step-instruction')[0]);
const ruleOf = (tree, side) => textOf(nodesWithClass(stepOf(tree, side), 'gesture-tutorial-step-rule')[0]);
const singleRuleOf = (tree) => textOf(nodesWithClass(tree, 'gesture-tutorial-single-rule')[0]);
const reminderOf = (tree) => textOf(nodesWithClass(tree, 'gesture-tutorial-reminder')[0]);
const pointerHintOf = (tree) => textOf(nodesWithClass(tree, 'gesture-tutorial-pointer-hint')[0]);
const statusOf = (tree) => textOf(nodesWithClass(tree, 'gesture-tutorial-status')[0]);
const arrowsOf = (tree) => nodesWithClass(tree, 'gesture-tutorial-arrow').map(textOf);
const activeSideOf = (tree) => ['left', 'right'].find((side) => stepOf(tree, side).props.className.includes('is-active')) ?? null;
const doneSidesOf = (tree) => ['left', 'right'].filter((side) => stepOf(tree, side).props.className.includes('is-done'));
const filledDotsOf = (tree) => nodesWithClass(tree, 'gesture-tutorial-dot').filter((n) => n.props.className.includes('is-done')).length;

// A finger on a phone or a mouse on a desktop: the panel's own onClick, the
// handler React would call for a real tap or click. A disabled control is
// never called by either, so this refuses to call one - which is what makes
// "the wrong side is inert to a finger" a property this suite can assert.
function press(page, side) {
  const step = stepOf(page.output, side);
  assert.ok(step, `no ${side} step panel on screen`);
  if (step.props.disabled) return false;
  step.props.onClick();
  return true;
}

// =============================================================================
// 1. the flow
// =============================================================================

test('language selection routes into the gesture tutorial, not straight to the scan', async () => {
  const source = stripComments(await read('src/pages/LanguageSelect.jsx'));
  assert.match(source, /navigate\('\/gesture-tutorial'\)/, 'the language screen must enter the tutorial');
  assert.doesNotMatch(source, /navigate\('\/ar-scan'\)/, 'the language screen must no longer skip the tutorial');

  const routes = stripComments(await read('src/routes.jsx'));
  assert.match(routes, /path: 'gesture-tutorial'/, 'the tutorial needs a route of its own');
  // Behind the same language gate as the rest of the flow: the page renders
  // in the language chosen on the previous screen, so arriving without one
  // has to send the player back to /language rather than default to Chinese.
  assert.match(routes, /path: 'gesture-tutorial', element: <RequireLanguage><GestureTutorial \/><\/RequireLanguage>/);
});

test('a completed tutorial enters the AR scan by itself, after the completion line', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const page = mountTutorial();
    wave('LEFT');
    wave('RIGHT');

    assert.deepEqual(navigations, [], 'the completion line must be readable before the page moves on');
    // Comfortably inside the 0.8-1.2s window the spec asks for.
    assert.ok(GESTURE_TUTORIAL_COMPLETE_DELAY_MS >= 800 && GESTURE_TUTORIAL_COMPLETE_DELAY_MS <= 1200);

    mock.timers.tick(GESTURE_TUTORIAL_COMPLETE_DELAY_MS - 1);
    assert.deepEqual(navigations, [], 'the page must not leave early');

    mock.timers.tick(1);
    assert.deepEqual(navigations, [['/ar-scan', { replace: true }]], 'the tutorial must hand the player to /ar-scan');

    // `replace`, so the browser's back gesture out of /ar-scan cannot land
    // the player back on a tutorial that is already complete.
    page.unmount();
  } finally {
    mock.timers.reset();
  }
});

test('leaving before the tutorial completes cancels the hand-off', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const page = mountTutorial();
    wave('LEFT');
    wave('RIGHT');
    page.unmount();
    mock.timers.tick(GESTURE_TUTORIAL_COMPLETE_DELAY_MS * 4);
    assert.deepEqual(navigations, [], 'an unmounted page must not navigate');
  } finally {
    mock.timers.reset();
  }
});

test('an unmounted tutorial stops listening to the glasses', () => {
  const page = mountTutorial();
  page.unmount();
  wave('LEFT');
  wave('RIGHT');
  assert.deepEqual(navigations, [], 'gestures after unmount must reach nothing');
});

test('the tutorial is on the way in only - nothing sends a player back to it', async () => {
  const sources = await Promise.all([
    'src/components/ui/ScenarioFinalDecision.jsx',
    'src/pages/arScan/ArScanHome.jsx',
    'src/pages/ScenarioMenu.jsx',
    'src/components/outcome/ScenarioOutcome.jsx',
  ].map(read));

  sources.forEach((source) => {
    assert.equal(stripComments(source).includes('/gesture-tutorial'), false, 'only /language may enter the tutorial');
  });

  // The scenario exit is unchanged: a finished scenario returns to the scan
  // screen directly, so the tutorial runs once per language selection.
  assert.match(await read('src/components/ui/ScenarioFinalDecision.jsx'), /backTo = '\/ar-scan'/);
});

test('re-entering the tutorial always starts at WAIT_LEFT', () => {
  const first = mountTutorial();
  wave('LEFT');
  assert.equal(activeSideOf(first.output), 'right');
  first.unmount();

  // A second player, or the same one coming back through /language: a fresh
  // mount, and nothing persisted anywhere for it to inherit.
  const second = mountTutorial();
  assert.equal(activeSideOf(second.output), 'left', 'the tutorial must not resume half-done');
  assert.deepEqual(doneSidesOf(second.output), []);
  assert.equal(filledDotsOf(second.output), 0);
  second.unmount();

  // Nothing outside the component holds the tutorial's progress, which is
  // what makes the reset above structural rather than incidental.
  const persisted = stripComments(SOURCES.page);
  ['localStorage', 'sessionStorage', 'Store', 'window.'].forEach((forbidden) => {
    assert.equal(persisted.includes(forbidden), false, `the tutorial must not keep state in ${forbidden}`);
  });
});

// =============================================================================
// 2. the state machine
// =============================================================================

test('WAIT_LEFT accepts LEFT and ignores RIGHT', () => {
  assert.equal(GESTURE_TUTORIAL_INITIAL_STATE, WAIT_LEFT);
  assert.equal(acceptsGesture(WAIT_LEFT, 'right'), false);
  assert.equal(nextTutorialState(WAIT_LEFT, 'right'), WAIT_LEFT, 'RIGHT must do nothing in WAIT_LEFT');
  assert.equal(nextTutorialState(WAIT_LEFT, 'left'), WAIT_RIGHT);
});

test('WAIT_RIGHT accepts RIGHT and ignores LEFT', () => {
  assert.equal(acceptsGesture(WAIT_RIGHT, 'left'), false);
  assert.equal(nextTutorialState(WAIT_RIGHT, 'left'), WAIT_RIGHT, 'LEFT must do nothing in WAIT_RIGHT');
  assert.equal(nextTutorialState(WAIT_RIGHT, 'right'), COMPLETE);
});

test('COMPLETE is final - a further wave changes nothing', () => {
  ['left', 'right'].forEach((gesture) => {
    assert.equal(nextTutorialState(COMPLETE, gesture), COMPLETE);
  });
});

test('no gesture outside the vocabulary can move the machine', () => {
  const outside = ['SELECT', 'HALT', 'PUSH', 'PULL', 'UP', 'DOWN', 'PRESENCE', 'select', 'tap', 'click', '', null, undefined, 0, 1];
  [WAIT_LEFT, WAIT_RIGHT].forEach((state) => {
    outside.forEach((gesture) => {
      assert.equal(nextTutorialState(state, gesture), state, `${JSON.stringify(gesture)} must not move ${state}`);
    });
  });
});

test('the progress dots follow the machine', () => {
  assert.equal(GESTURE_TUTORIAL_STEP_COUNT, 2);
  assert.equal(completedSteps(WAIT_LEFT), 0);
  assert.equal(completedSteps(WAIT_RIGHT), 1);
  assert.equal(completedSteps(COMPLETE), 2);
});

// --- the same rules, on the mounted page -------------------------------------

test('a real RIGHT is ignored on the mounted page until LEFT has happened', () => {
  const page = mountTutorial();
  const t = getGestureTutorialStrings('zh');

  // Both steps are on screen the whole time - the tutorial teaches which one
  // is live, it does not hide the other.
  assert.deepEqual(arrowsOf(page.output), ['←', '→'], 'both direction cues stay on screen');

  wave('RIGHT');
  wave('RIGHT');
  assert.equal(activeSideOf(page.output), 'left', 'RIGHT must not advance the first step');
  assert.deepEqual(doneSidesOf(page.output), []);
  assert.equal(filledDotsOf(page.output), 0);

  wave('LEFT');
  assert.equal(activeSideOf(page.output), 'right');
  assert.deepEqual(doneSidesOf(page.output), ['left']);
  assert.equal(filledDotsOf(page.output), 1);

  wave('LEFT');
  assert.equal(activeSideOf(page.output), 'right', 'LEFT must not advance the second step');
  assert.equal(filledDotsOf(page.output), 1);

  wave('RIGHT');
  assert.equal(statusOf(page.output), t.complete);
  assert.equal(activeSideOf(page.output), null, 'a finished tutorial has no live step');
  assert.deepEqual(doneSidesOf(page.output), ['left', 'right']);
  assert.equal(filledDotsOf(page.output), 2);
  page.unmount();
});

test('a native restart does not deafen the tutorial', () => {
  const page = mountTutorial();
  const t = getGestureTutorialStrings('zh');

  // A few waves land while the page is up...
  wave('RIGHT');
  wave('RIGHT');
  assert.equal(activeSideOf(page.output), 'left');

  // ...then the activity is backgrounded and foregrounded (or the tester hits
  // 重新連接): the native counter goes back to 1 while this page stays mounted
  // with everything it has already seen. The next real waves must still work.
  nativeRestart();

  wave('LEFT');
  assert.equal(activeSideOf(page.output), 'right', 'a wave after a native restart must not be read as a duplicate');
  wave('RIGHT');
  assert.equal(statusOf(page.output), t.complete);
  page.unmount();
});

test('one delivery runs one step, even if it arrives twice', () => {
  const page = mountTutorial();

  const detail = { gesture: 'LEFT', label: 'LEFT', count: 4242, at: 99_000 };
  window.dispatchEvent(new CustomEvent(JORJIN_GESTURE_EVENT, { detail }));
  window.dispatchEvent(new CustomEvent(JORJIN_GESTURE_EVENT, { detail }));

  assert.equal(activeSideOf(page.output), 'right', 'a repeated delivery must not count twice');
  assert.equal(filledDotsOf(page.output), 1, 'one delivery advances exactly one step');
  page.unmount();
});

// =============================================================================
// 3. the input path
// =============================================================================

test('the adapter speaks the vendor codes and only translates two of them', () => {
  assert.equal(toCanonicalGesture('LEFT'), 'left');
  assert.equal(toCanonicalGesture('RIGHT'), 'right');
  ['SELECT', 'HALT', 'PUSH', 'PULL', 'UP', 'DOWN', 'PRESENCE', 'CLICK', 'TAP', '', 'left-ish', null, undefined, 3]
    .forEach((code) => assert.equal(toCanonicalGesture(code), null, `${JSON.stringify(code)} must not be canonical`));
});

test('the adapter reads a real bridge event, and reports nothing for the rest', () => {
  const event = { detail: { gesture: 'RIGHT', label: '456右', count: 12, at: 8123456 } };
  assert.deepEqual({ ...readNativeGestureEvent(event) }, {
    gesture: 'right',
    eventId: 'jorjin-tof:12@8123456',
    count: 12,
    at: 8123456,
    source: 'jorjin-tof',
  });

  [{}, { detail: {} }, { detail: { gesture: 'HALT', count: 1 } }, { detail: { gesture: 'PUSH', count: 2 } }, null]
    .forEach((bad) => assert.equal(readNativeGestureEvent(bad), null));
});

test('the delivery id survives a native counter reset', () => {
  // Android's counter restarts at 1 on every hardware start; the elapsed-
  // realtime stamp does not, so the second `count: 1` must be a different
  // delivery rather than a duplicate of the first.
  const first = readNativeGestureEvent({ detail: { gesture: 'LEFT', count: 1, at: 5_000 } });
  const afterRestart = readNativeGestureEvent({ detail: { gesture: 'LEFT', count: 1, at: 90_000 } });
  assert.notEqual(first.eventId, afterRestart.eventId);

  // The same delivery seen twice is still the same delivery.
  const replay = readNativeGestureEvent({ detail: { gesture: 'LEFT', count: 1, at: 5_000 } });
  assert.equal(first.eventId, replay.eventId);
});

test('the adapter delivers only LEFT and RIGHT to its subscriber, and stops on unsubscribe', () => {
  const seen = [];
  const stop = subscribeNativeGestures((gesture) => seen.push(gesture.gesture));

  ['SELECT', 'HALT', 'PUSH', 'PULL', 'UP', 'DOWN', 'PRESENCE'].forEach(wave);
  assert.deepEqual(seen, [], 'no gesture outside the vocabulary may reach a subscriber');

  wave('LEFT');
  wave('RIGHT');
  assert.deepEqual(seen, ['left', 'right']);

  stop();
  wave('LEFT');
  assert.deepEqual(seen, ['left', 'right'], 'a stopped subscription must hear nothing');
});

test('the tutorial reacts to a real gesture event and to its own two panels, and to nothing else', () => {
  const code = stripComments(SOURCES.page);

  // The two inputs are the native gesture stream and the step panels' own
  // React onClick - the one handler a browser fires for a touch and for a
  // mouse click alike. Everything else is still shut out: no keyboard, no
  // hand-rolled DOM listener, no synthetic click, no debug hook.
  [
    'onPointerDown', 'onPointerUp', 'onMouseDown', 'onTouchStart', 'onTouchEnd',
    'onKeyDown', 'onKeyUp', 'onKeyPress', 'keydown', 'keyup', '.click(', 'querySelector',
    'document.', 'addEventListener', 'ArrowLeft', 'ArrowRight', 'startARGestureKeyboardAdapter',
    'isARGestureDebugEnabled', 'VITE_AR_GESTURE_DEBUG',
  ].forEach((forbidden) => {
    assert.equal(code.includes(forbidden), false, `the tutorial must not contain ${forbidden}`);
  });

  // Nothing that lets a player out of the tutorial without doing it.
  ['skip', 'Skip', 'bypass', 'fallback', 'unsupported', 'unavailable'].forEach((forbidden) => {
    assert.equal(code.includes(forbidden), false, `the tutorial must not contain ${forbidden}`);
  });

  // The only gesture words that appear are the two canonical ones, through
  // the contract's own constant - there is no SELECT / HALT / PUSH anywhere
  // in the tutorial, and no second vocabulary.
  ['SELECT', 'HALT', 'PUSH', 'PULL', 'PRESENCE'].forEach((forbidden) => {
    assert.equal(code.includes(forbidden), false, `the tutorial must not know about ${forbidden}`);
    assert.equal(stripComments(SOURCES.machine).includes(forbidden), false, `the state machine must not know about ${forbidden}`);
  });

  // Exactly one timer, and it is the hand-off to /ar-scan. Nothing here can
  // finish the tutorial on its own.
  assert.equal((code.match(/setTimeout/g) ?? []).length, 1);
  ['setInterval', 'requestAnimationFrame'].forEach((forbidden) => {
    assert.equal(code.includes(forbidden), false, `the tutorial must not contain ${forbidden}`);
  });
});

test('the tutorial is not wired into the AR Interaction Contract', () => {
  const code = stripComments(SOURCES.page) + stripComments(SOURCES.machine);
  // LEFT and RIGHT are steps here, not the two options a `dual` screen
  // offers - see tutorialStateMachine.js. Declaring the page to the contract
  // would make a wrong-direction wave "pick the other option".
  [
    'useARInteraction', 'registerARInteraction', 'performARInteraction', 'dispatchARGesture',
    'leftAction', 'rightAction', "mode: 'dual'", "mode: 'single'",
  ].forEach((forbidden) => {
    assert.equal(code.includes(forbidden), false, `the tutorial must not use ${forbidden}`);
  });
});

test('the adapter is a translator, not a recogniser', () => {
  const code = stripComments(SOURCES.adapter).toLowerCase();
  [
    'mediapipe', 'tensorflow', 'handpose', 'getusermedia', 'mediadevices', 'webxr',
    'camera', 'mindar', 'settimeout', 'setinterval', 'requestanimationframe',
    'keydown', 'pointerdown', 'touchstart', '.click(', 'queryselector', 'document.',
  ].forEach((forbidden) => {
    assert.equal(code.includes(forbidden), false, `the adapter must not contain ${forbidden}`);
  });
  // It knows no screen, no route and no scenario.
  [/scenario\s*0?\d/i, /\/ar-scan/, /usenavigate/i, /pathname/i].forEach((forbidden) => {
    assert.equal(forbidden.test(code), false, `the adapter must not match ${forbidden}`);
  });
});

// =============================================================================
// 4. three languages
// =============================================================================

const EXPECTED_COPY = {
  zh: {
    heading: '手勢教學',
    left: {
      title: '向左揮',
      instruction: '請將手掌張開，慢慢向左揮動',
      rule: '有兩個選項時，向左揮選擇左邊的答案',
    },
    right: {
      title: '向右揮',
      instruction: '請將手掌張開，慢慢向右揮動',
      rule: '有兩個選項時，向右揮選擇右邊的答案',
    },
    singleOption: '只有一個選項時，向右揮即可選擇',
    reminder: '請放慢揮手速度，揮動太快可能無法辨識',
    pointerHint: '手機或電腦操作時，也可以直接點擊畫面上的選項',
    complete: '手勢教學完成',
  },
  en: {
    heading: 'Gesture Tutorial',
    left: {
      title: 'Swipe left',
      instruction: 'Open your palm and sweep it slowly to the left',
      rule: 'When two options are on screen, swipe left to choose the one on the left',
    },
    right: {
      title: 'Swipe right',
      instruction: 'Open your palm and sweep it slowly to the right',
      rule: 'When two options are on screen, swipe right to choose the one on the right',
    },
    singleOption: 'When there is only one option, swipe right to choose it',
    reminder: 'Keep the motion slow — a fast swipe may not be recognised',
    pointerHint: 'On a phone or computer you can also just tap the option on screen',
    complete: 'Gesture tutorial complete',
  },
  jp: {
    heading: 'ジェスチャー練習',
    left: {
      title: '左に振る',
      instruction: '手のひらを開いて、ゆっくり左へ振ってください',
      rule: '選択肢が2つあるときは、左に振ると左側の答えを選べます',
    },
    right: {
      title: '右に振る',
      instruction: '手のひらを開いて、ゆっくり右へ振ってください',
      rule: '選択肢が2つあるときは、右に振ると右側の答えを選べます',
    },
    singleOption: '選択肢が1つだけのときは、右に振ると選べます',
    reminder: 'ゆっくり振ってください。速すぎると認識されないことがあります',
    pointerHint: 'スマートフォンやパソコンでは、画面の選択肢を直接タップしても操作できます',
    complete: 'ジェスチャー練習完了',
  },
};

test('every step, all three standing lines and the completion line have copy in all three languages', () => {
  Object.entries(EXPECTED_COPY).forEach(([lang, expected]) => {
    assert.deepEqual(JSON.parse(JSON.stringify(getGestureTutorialStrings(lang))), expected, `${lang} copy must match the spec`);
  });
  // An unknown language reads as Chinese, the same fallback the other entry
  // screens use.
  assert.deepEqual(getGestureTutorialStrings('fr'), getGestureTutorialStrings('zh'));
});

test('the page renders the language the player chose on the previous screen', () => {
  Object.entries(EXPECTED_COPY).forEach(([lang, expected]) => {
    const page = mountTutorial(lang);
    assert.equal(textOf(nodesWithClass(page.output, 'gesture-tutorial-heading')[0]), expected.heading);

    // Both steps read in the chosen language from the first frame, and all
    // three standing lines are up alongside them rather than waiting for a
    // mistake or for a later step.
    ['left', 'right'].forEach((side) => {
      assert.equal(titleOf(page.output, side), expected[side].title, `${lang}: ${side} title`);
      assert.equal(instructionOf(page.output, side), expected[side].instruction, `${lang}: ${side} instruction`);
      assert.equal(ruleOf(page.output, side), expected[side].rule, `${lang}: ${side} mapping rule`);
    });
    assert.equal(singleRuleOf(page.output), expected.singleOption, `${lang}: the one-option rule must be on screen`);
    assert.equal(reminderOf(page.output), expected.reminder, `${lang}: the slow-down reminder must be on screen`);
    assert.equal(pointerHintOf(page.output), expected.pointerHint, `${lang}: the tap hint must be on screen`);
    assert.equal(statusOf(page.output), '', 'nothing is complete yet');

    wave('LEFT');
    assert.equal(reminderOf(page.output), expected.reminder, `${lang}: the reminder is fixed, not per-step`);
    assert.equal(ruleOf(page.output, 'left'), expected.left.rule, `${lang}: a completed step keeps its rule on screen`);

    wave('RIGHT');
    assert.equal(statusOf(page.output), expected.complete);
    assert.equal(reminderOf(page.output), expected.reminder, `${lang}: the reminder stays up at the end too`);
    assert.equal(singleRuleOf(page.output), expected.singleOption, `${lang}: so does the one-option rule`);
    assert.equal(pointerHintOf(page.output), expected.pointerHint, `${lang}: and so does the tap hint`);
    page.unmount();
  });
});

test('the three standing lines are fixed - no state or input takes any of them off the screen', () => {
  const t = getGestureTutorialStrings('zh');
  const page = mountTutorial();
  const standing = () => [singleRuleOf(page.output), reminderOf(page.output), pointerHintOf(page.output)];
  const expected = [t.singleOption, t.reminder, t.pointerHint];

  assert.deepEqual(standing(), expected);
  wave('RIGHT');
  assert.deepEqual(standing(), expected, 'a wrong-direction wave must not disturb them');
  press(page, 'left');
  assert.deepEqual(standing(), expected);
  press(page, 'right');
  assert.deepEqual(standing(), expected, 'a finished tutorial still shows the rules it taught');
  page.unmount();
});

// The rules on screen are the app's real mapping, not a paraphrase of it. If
// the contract ever stopped meaning "LEFT is option[0], RIGHT is option[1],
// and a one-action screen has no LEFT", this copy would be a lie - so the two
// are asserted against each other rather than left to drift.
test('the rules the tutorial shows are the mapping the AR Interaction Contract actually implements', async () => {
  const { AR_INTERACTION_MODES, getCurrentARInteraction, performARInteraction, registerARInteraction, releaseARInteraction }
    = await import('../src/lib/arInteraction/interactionContract.js');

  // Two options on screen: LEFT takes the left-hand one, RIGHT the right-hand
  // one - which is exactly what both step panels tell the player.
  const taken = [];
  const dual = registerARInteraction(() => ({
    mode: AR_INTERACTION_MODES.DUAL,
    surfaceId: 'tutorial-copy/dual',
    left: () => taken.push('left option'),
    right: () => taken.push('right option'),
  }));
  assert.equal(performARInteraction('left'), true);
  assert.equal(performARInteraction('right'), true);
  assert.deepEqual(taken, ['left option', 'right option'], 'LEFT must pick the left answer and RIGHT the right one');
  releaseARInteraction(dual);

  // One option on screen: RIGHT takes it and there is no LEFT at all - which
  // is what the one-option line tells the player.
  const single = registerARInteraction(() => ({
    mode: AR_INTERACTION_MODES.SINGLE,
    surfaceId: 'tutorial-copy/single',
    action: () => taken.push('the one option'),
  }));
  assert.equal(getCurrentARInteraction().leftAvailable, false, 'a one-option screen must have no LEFT');
  assert.equal(performARInteraction('left'), false, 'LEFT must do nothing when there is one option');
  assert.equal(performARInteraction('right'), true);
  assert.deepEqual(taken, ['left option', 'right option', 'the one option']);
  releaseARInteraction(single);
});

test('no player-facing copy is hard-coded in the JSX', () => {
  const code = stripComments(SOURCES.page);
  // Any CJK or Japanese kana literal in the page would be copy that only one
  // of the three languages can read.
  assert.doesNotMatch(code, /[぀-ヿ一-鿿]/, 'the tutorial must take its words from ./i18n.js');
  Object.values(EXPECTED_COPY).forEach((strings) => {
    Object.values(strings).flatMap((entry) => (typeof entry === 'string' ? [entry] : Object.values(entry))).forEach((line) => {
      assert.equal(code.includes(line), false, `"${line}" belongs in the dictionary, not in the JSX`);
    });
  });
});

// =============================================================================
// 5. two inputs, one step - and no way past the steps
// =============================================================================

// The reason this section exists: on an iPhone (and on any phone or desktop
// browser) there is no ToF module, so a tutorial that only listened for waves
// would strand every non-glasses device on the first screen of the run. Touch
// and mouse are therefore a second input into the same two steps - never a
// skip past them, and never a second copy of the tutorial's rules.

test('a touch or a click completes the same two steps, in the same order', () => {
  const t = getGestureTutorialStrings('zh');
  const page = mountTutorial();

  // The wrong side is inert to a finger exactly as it is to a wave: the panel
  // is disabled, so a real tap on it reaches nothing at all.
  assert.equal(stepOf(page.output, 'right').props.disabled, true, 'the right step is not live yet');
  assert.equal(press(page, 'right'), false, 'tapping the second step must not skip the first');
  assert.equal(activeSideOf(page.output), 'left');
  assert.equal(filledDotsOf(page.output), 0);

  assert.equal(press(page, 'left'), true);
  assert.equal(activeSideOf(page.output), 'right', 'a tap must complete the left step');
  assert.deepEqual(doneSidesOf(page.output), ['left']);
  assert.equal(filledDotsOf(page.output), 1);

  // And the step just completed is now inert too - a second tap on it cannot
  // walk the tutorial backwards or forwards.
  assert.equal(stepOf(page.output, 'left').props.disabled, true);
  assert.equal(press(page, 'left'), false);
  assert.equal(filledDotsOf(page.output), 1);

  assert.equal(press(page, 'right'), true);
  assert.equal(statusOf(page.output), t.complete);
  assert.equal(filledDotsOf(page.output), 2);
  assert.deepEqual(navigations, [], 'the completion line is still readable');
  page.unmount();
});

test('a finished tutorial takes no further input from either source', () => {
  const page = mountTutorial();
  press(page, 'left');
  press(page, 'right');

  assert.equal(activeSideOf(page.output), null);
  ['left', 'right'].forEach((side) => {
    assert.equal(stepOf(page.output, side).props.disabled, true, `${side} must be inert once the tutorial is over`);
    assert.equal(press(page, side), false);
  });
  wave('LEFT');
  wave('RIGHT');
  assert.equal(filledDotsOf(page.output), GESTURE_TUTORIAL_STEP_COUNT, 'nothing after COMPLETE changes anything');
  page.unmount();
});

test('a tap and a wave are the same step - neither runs it twice', () => {
  const page = mountTutorial();

  // A finger lands on the left panel and a real LEFT arrives from the glasses
  // right behind it. The step is already behind the player, so the wave is the
  // same designed no-op a second wave always was - it cannot skip the right
  // step.
  press(page, 'left');
  wave('LEFT');
  assert.equal(activeSideOf(page.output), 'right', 'the second input must not advance a second step');
  assert.equal(filledDotsOf(page.output), 1);

  // And the other way round: a wave completes the right step, a click lands a
  // moment later on the panel that is now disabled.
  wave('RIGHT');
  assert.equal(filledDotsOf(page.output), 2);
  assert.equal(press(page, 'right'), false);
  assert.deepEqual(navigations, [], 'a duplicate input must not double-navigate');
  page.unmount();
});

test('the two inputs run the identical transition, not two copies of it', () => {
  // Same start state, one completed by hand and one by a wave: the page they
  // leave behind has to be indistinguishable, because both went through
  // `nextTutorialState`.
  const tapped = mountTutorial();
  press(tapped, 'left');
  const byTap = { active: activeSideOf(tapped.output), done: doneSidesOf(tapped.output), dots: filledDotsOf(tapped.output) };
  tapped.unmount();

  const waved = mountTutorial();
  wave('LEFT');
  const byWave = { active: activeSideOf(waved.output), done: doneSidesOf(waved.output), dots: filledDotsOf(waved.output) };
  waved.unmount();

  assert.deepEqual(byTap, byWave, 'touch/mouse and gesture must leave the tutorial in the same state');

  // Structurally, too: the page has exactly one call into the state machine,
  // so there is no touch-only branch for a later change to get wrong.
  const code = stripComments(SOURCES.page);
  assert.equal((code.match(/nextTutorialState\(/g) ?? []).length, 1, 'both inputs must share one transition call');
});

test('a tutorial completed by touch hands the player on exactly as a waved one does', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const page = mountTutorial();
    press(page, 'left');
    press(page, 'right');
    assert.deepEqual(navigations, []);
    mock.timers.tick(GESTURE_TUTORIAL_COMPLETE_DELAY_MS);
    assert.deepEqual(navigations, [['/ar-scan', { replace: true }]], 'touch must reach /ar-scan too');
    page.unmount();
  } finally {
    mock.timers.reset();
  }
});

test('the only controls on the page are the two steps themselves', () => {
  [WAIT_LEFT, WAIT_RIGHT, COMPLETE].forEach((target) => {
    const page = mountTutorial();
    if (target !== WAIT_LEFT) wave('LEFT');
    if (target === COMPLETE) wave('RIGHT');

    const steps = stepsOf(page.output);
    assert.equal(steps.length, GESTURE_TUTORIAL_STEP_COUNT, `${target}: one panel per step, no more`);
    steps.forEach((step) => {
      assert.equal(step.type, 'button', `${target}: a step must be a real button, reachable by touch and mouse`);
      assert.equal(step.props.type, 'button', `${target}: and never a form submit`);
    });

    walk(page.output).forEach((node) => {
      const isStep = steps.includes(node);
      // No link, no field, no form - and no second button beside the two
      // steps, so there is nothing here that skips them.
      assert.equal(['a', 'input', 'select', 'textarea', 'form', 'label'].includes(node.type), false,
        `${target}: the tutorial must render no ${node.type}`);
      if (!isStep) {
        assert.notEqual(node.type, 'button', `${target}: only a step may be a button`);
      }
      Object.keys(node.props ?? {}).forEach((prop) => {
        if (isStep && prop === 'onClick') return;
        assert.equal(/^on[A-Z]/.test(prop), false, `${target}: only a step may carry a ${prop} handler`);
      });
      assert.equal(node.props?.role, undefined, `${target}: nothing here needs a hand-rolled interactive role`);
      assert.equal(node.props?.tabIndex, undefined, `${target}: a <button> is focusable on its own`);
      assert.equal('href' in (node.props ?? {}), false, `${target}: the tutorial must render no link`);
    });
    page.unmount();
  });
});

// =============================================================================
// 6. the background
// =============================================================================

test('the tutorial reuses the language home Hero artwork, and adds no asset', async () => {
  const HERO = 'assets/shared/ui/scenario-menu-background.webp';
  assert.ok(SOURCES.page.includes(HERO), 'the tutorial must render the existing Hero image');
  assert.ok((await read('src/pages/LanguageSelect.jsx')).includes(HERO), 'and it must be the language home\'s own');

  // Full-bleed, contained rather than cropped (the masthead and 刑事熊 sit in
  // the corners), under a dark translucent scrim so the instruction stays
  // readable on the glasses.
  const css = await read('src/pages/entryScreens.css');
  assert.match(css, /\.gesture-tutorial-background\{[^}]*object-fit:contain/);
  assert.match(css, /\.gesture-tutorial-scrim\{[^}]*rgba\(2,9,22/);
});
