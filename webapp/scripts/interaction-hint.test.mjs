// The shared 10-second inactivity hint - src/components/hints/ plus the
// read-only half of the AR Interaction Contract it reads
// (src/lib/arInteraction/inactivityHint.js, subscribeARInteraction).
//
// The question this suite answers: after a live choice has gone untaken for
// ten seconds, does the player get the RIGHT line at the RIGHT moment - and,
// just as important, do they get nothing at all every other time? Each group
// below closes one of the ways that could be untrue:
//
//   1. the clock    - nothing at 9s, the line at 10s, started from the moment
//                     the screen became operable and not from a render
//   2. the line     - three languages, and the direction it names is one the
//                     player can actually wave right now
//   3. the silence  - display-only, loading, transitioning, auto-playing, a
//                     video being watched, the tutorial: all say nothing
//   4. the lifetime - shown once, never blinking, gone when the choice is
//                     taken or the screen changes, and never inherited by the
//                     screen that follows
//   5. the harmlessness - it never acts for the player, never takes a touch,
//                     and never becomes a second copy of what a screen allows
//
// Timers are mocked (node:test's mock.timers), so the boundaries are tested at
// the millisecond rather than by waiting. Real screens are mounted for real
// through scripts/ar-surface-harness.mjs - the five scenarios reach the hint
// through the same contract they already declare, and nothing here calls the
// component's internals.
//
// Run: npm run test:interaction-hint
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test, { mock } from 'node:test';

import { mountSurface } from './ar-surface-harness.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

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
  AR_INTERACTION_MODES,
  getCurrentARInteraction,
  performARInteraction,
  resetARInteractionContract,
  subscribeARInteraction,
  useARInteraction,
} = await import('../src/lib/arInteraction/index.js');
const {
  INACTIVITY_HINT_DELAY_MS,
  INACTIVITY_HINTS,
  inactivityHintFor,
  inactivityHintKey,
} = await import('../src/lib/arInteraction/inactivityHint.js');
const { InteractionHint } = await import('../src/components/hints/InteractionHint.jsx');
const { getInteractionHintStrings } = await import('../src/components/hints/interactionHintI18n.js');

const { DISPLAY, SINGLE, DUAL } = AR_INTERACTION_MODES;
const { DUAL: HINT_DUAL, LEFT: HINT_LEFT, RIGHT: HINT_RIGHT } = INACTIVITY_HINTS;

const SOURCES = {
  hint: await read('src/components/hints/InteractionHint.jsx'),
  rules: await read('src/lib/arInteraction/inactivityHint.js'),
  i18n: await read('src/components/hints/interactionHintI18n.js'),
  css: await read('src/components/hints/InteractionHint.css'),
  contract: await read('src/lib/arInteraction/interactionContract.js'),
};

// --- driving it -------------------------------------------------------------

// A screen that declares whatever the test hands it, re-read live so a test
// can change what the screen allows without remounting it - exactly the way a
// real screen changes when a quiz is answered or a CTA is greyed out.
function screen(initial) {
  let declaration = initial;
  const Screen = function TestScreen() {
    useARInteraction(declaration);
    return null;
  };
  const mounted = mountSurface(Screen);
  return {
    mounted,
    // Re-declare, then re-render, the way a real screen's own setState would.
    declare(next) { declaration = next; mounted.rerender(); },
    rerender() { mounted.rerender(); },
    unmount() { mounted.unmount(); },
  };
}

const mountHint = () => mountSurface(InteractionHint);

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
// What the player can actually read on screen right now, or null for nothing.
const hintText = (mounted) => (mounted.output === null ? null : textOf(mounted.output));
const hintRoot = (mounted) => mounted.output;

// `tick` advances the mocked clock; every hint timer is a plain setTimeout.
const tick = (ms) => mock.timers.tick(ms);

test.beforeEach(() => {
  mock.timers.enable({ apis: ['setTimeout'] });
  resetARInteractionContract();
  globalThis.localStorage.clear();
});
test.afterEach(() => {
  mock.timers.reset();
});

// =============================================================================
// 1. the clock
// =============================================================================

test('the delay is ten seconds, written down once', () => {
  assert.equal(INACTIVITY_HINT_DELAY_MS, 10000);
  // And nowhere else: no scenario, no screen and no second component may carry
  // its own copy of this number.
  assert.equal([...stripComments(SOURCES.hint).matchAll(/10000|10_000/g)].length, 0);
  assert.ok(stripComments(SOURCES.hint).includes('INACTIVITY_HINT_DELAY_MS'));
});

test('nothing at nine seconds, the line at ten', () => {
  const t = getInteractionHintStrings('zh');
  const s = screen({ mode: DUAL, surfaceId: 'test/two-options', left: () => {}, right: () => {} });
  const hint = mountHint();

  assert.equal(hintText(hint), null, 'nothing the instant the choice appears');
  tick(INACTIVITY_HINT_DELAY_MS - 1);
  assert.equal(hintText(hint), null, 'still nothing at 9.999s - a player reading must not be interrupted');
  tick(1);
  assert.equal(hintText(hint), t[HINT_DUAL], 'and the line at exactly 10s');

  hint.unmount();
  s.unmount();
});

test('the count starts when the screen becomes operable, not when it renders', () => {
  const t = getInteractionHintStrings('zh');
  // A screen that is up, and busy: options not live yet.
  const s = screen({ mode: DUAL, surfaceId: 'test/loading', left: null, right: null });
  const hint = mountHint();

  tick(60_000);
  assert.equal(hintText(hint), null, 'a minute of a screen with nothing callable is not a minute of idling');

  // NOW the options go live. The ten seconds start here.
  s.declare({ mode: DUAL, surfaceId: 'test/loading', left: () => {}, right: () => {} });
  tick(INACTIVITY_HINT_DELAY_MS - 1);
  assert.equal(hintText(hint), null, 'the earlier wait must not be carried over');
  tick(1);
  assert.equal(hintText(hint), t[HINT_DUAL]);

  hint.unmount();
  s.unmount();
});

test('an ordinary re-render does not push the hint away', () => {
  const t = getInteractionHintStrings('zh');
  // Inline arrow handlers: new function objects on every render, the way every
  // real screen in this app declares. A clock that restarted on those would
  // never reach ten seconds on a screen that renders on a ticking clock.
  const s = screen({ mode: SINGLE, surfaceId: 'test/one-action', action: () => {} });
  const hint = mountHint();

  for (let elapsed = 0; elapsed < INACTIVITY_HINT_DELAY_MS - 1000; elapsed += 500) {
    s.declare({ mode: SINGLE, surfaceId: 'test/one-action', action: () => {} });
    tick(500);
  }
  assert.equal(hintText(hint), null);
  tick(1000);
  assert.equal(hintText(hint), t[HINT_RIGHT], 'the clock ran through every one of those re-renders');

  hint.unmount();
  s.unmount();
});

// =============================================================================
// 2. the line
// =============================================================================

test('the line names a direction the player can actually wave right now', () => {
  const cases = [
    ['both options live', { mode: DUAL, surfaceId: 'test/s', left: () => {}, right: () => {} }, HINT_DUAL],
    ['one action, taken by RIGHT', { mode: SINGLE, surfaceId: 'test/s', action: () => {} }, HINT_RIGHT],
    ['declared two, only RIGHT live', { mode: DUAL, surfaceId: 'test/s', left: null, right: () => {} }, HINT_RIGHT],
    ['declared two, only LEFT live', { mode: DUAL, surfaceId: 'test/s', left: () => {}, right: null }, HINT_LEFT],
  ];
  cases.forEach(([what, declaration, expected]) => {
    resetARInteractionContract();
    const s = screen(declaration);
    const hint = mountHint();
    tick(INACTIVITY_HINT_DELAY_MS);
    assert.equal(hintText(hint), getInteractionHintStrings('zh')[expected], what);
    hint.unmount();
    s.unmount();
  });
});

test('a half-disabled screen never points at the side that is switched off', () => {
  const t = getInteractionHintStrings('zh');
  const s = screen({ mode: DUAL, surfaceId: 'test/left-only', left: () => {}, right: null });
  const hint = mountHint();
  tick(INACTIVITY_HINT_DELAY_MS);

  const shown = hintText(hint);
  assert.equal(shown, t[HINT_LEFT]);
  // The two lines that would send the player at the dead side.
  assert.notEqual(shown, t[HINT_RIGHT], 'a live LEFT must never be described as a right swipe');
  assert.notEqual(shown, t[HINT_DUAL], 'and it must not be offered as a choice of two');

  hint.unmount();
  s.unmount();
});

test('all three languages, out of the shared selector', () => {
  const EXPECTED = {
    zh: {
      [HINT_DUAL]: '請向左或向右揮手，選擇你的答案。',
      [HINT_RIGHT]: '請向右揮手，繼續體驗。',
      [HINT_LEFT]: '請向左揮手，選擇左邊的選項。',
    },
    en: {
      [HINT_DUAL]: 'Swipe left or right to choose your answer.',
      [HINT_RIGHT]: 'Swipe right to continue.',
      [HINT_LEFT]: 'Swipe left to choose the option on the left.',
    },
    jp: {
      [HINT_DUAL]: '左右どちらかに手を振って、回答を選んでください。',
      [HINT_RIGHT]: '右に手を振って、次へ進んでください。',
      [HINT_LEFT]: '左に手を振って、左側の選択肢を選んでください。',
    },
  };
  Object.entries(EXPECTED).forEach(([lang, expected]) => {
    assert.deepEqual({ ...getInteractionHintStrings(lang) }, expected, `${lang} copy must match the spec`);
  });
  // An unknown language reads as Chinese, the same fallback the entry screens
  // use - and the Japanese locale code is 'jp', never 'ja'.
  assert.deepEqual(getInteractionHintStrings('fr'), getInteractionHintStrings('zh'));
  assert.equal(stripComments(SOURCES.i18n).includes("'ja'"), false);

  // Each language really reaches the screen, through the app-wide selector.
  Object.keys(EXPECTED).forEach((lang) => {
    resetARInteractionContract();
    globalThis.localStorage.setItem('language', lang);
    const s = screen({ mode: DUAL, surfaceId: 'test/s', left: () => {}, right: () => {} });
    const hint = mountHint();
    tick(INACTIVITY_HINT_DELAY_MS);
    assert.equal(hintText(hint), EXPECTED[lang][HINT_DUAL], `${lang} on screen`);
    hint.unmount();
    s.unmount();
  });
});

test('no Chinese, English or Japanese is written into the component', () => {
  const code = stripComments(SOURCES.hint);
  assert.equal(/[一-鿿぀-ヿ]/.test(code), false, 'the JSX must take its copy from the i18n module');
  assert.ok(code.includes('getInteractionHintStrings'));
});

// =============================================================================
// 3. the silence
// =============================================================================

test('every "do not count" state is a state with nothing callable on it', () => {
  // Each of these is one of the spec's own "must not start counting" cases,
  // expressed the way the screen that is in it already declares itself. The
  // point of the group is that the hint needs no list of screens, no route
  // matching and no DOM probing to get them right - a screen that is not ready
  // is a screen with nothing callable on it.
  const silent = [
    ['a display-only screen', { mode: DISPLAY, surfaceId: 'test/display' }],
    ['options not on screen yet', { mode: DUAL, surfaceId: 'test/pending', left: null, right: null }],
    ['every option disabled', { mode: DUAL, surfaceId: 'test/locked', left: () => {}, right: () => {}, disabled: true }],
    ['a choice made, screen mid-transition', { mode: SINGLE, surfaceId: 'test/sent', action: () => {}, disabled: true }],
    ['the story auto-playing', { mode: SINGLE, surfaceId: 'test/montage', action: () => {}, disabled: true }],
    ['a video being watched through', { mode: SINGLE, surfaceId: 'test/video', action: () => {}, presenting: true }],
  ];
  silent.forEach(([what, declaration]) => {
    resetARInteractionContract();
    const s = screen(declaration);
    const hint = mountHint();
    tick(INACTIVITY_HINT_DELAY_MS * 3);
    assert.equal(hintText(hint), null, `${what}: must say nothing`);
    hint.unmount();
    s.unmount();
  });

  // And with nothing registered at all - which is what the gesture tutorial is.
  const hint = mountHint();
  tick(INACTIVITY_HINT_DELAY_MS * 3);
  assert.equal(hintText(hint), null, 'no screen registered: must say nothing');
  hint.unmount();
});

test('the gesture tutorial never gets a hint, because it declares nothing', async () => {
  const { GestureTutorial } = await import('../src/pages/gestureTutorial/GestureTutorial.jsx');
  const { resetNavigations } = await import('./stubs/react-router-dom.mjs');
  resetNavigations();
  const tutorial = mountSurface(GestureTutorial);
  const hint = mountHint();

  assert.equal(getCurrentARInteraction().active, false, 'the tutorial does not declare itself to the contract');
  tick(INACTIVITY_HINT_DELAY_MS * 5);
  assert.equal(hintText(hint), null, 'and so the run-time hint can never appear on it');

  hint.unmount();
  tutorial.unmount();
});

test('a video holds the clock, and releases it the moment it stops', () => {
  const t = getInteractionHintStrings('zh');
  const s = screen({ mode: SINGLE, surfaceId: 'test/pitch', action: () => {}, presenting: true });
  const hint = mountHint();

  // Watching. The action is live the whole time - `presenting` is not
  // `disabled` - so a wave still works; it is only the hint that waits.
  assert.equal(getCurrentARInteraction().rightAvailable, true, 'the CTA stays callable during playback');
  assert.equal(performARInteraction('right'), true, 'and a wave really does run it mid-video');
  tick(60_000);
  assert.equal(hintText(hint), null);

  // It ends. Now the player is waiting, and the ten seconds start from here.
  s.declare({ mode: SINGLE, surfaceId: 'test/pitch', action: () => {}, presenting: false });
  tick(INACTIVITY_HINT_DELAY_MS - 1);
  assert.equal(hintText(hint), null);
  tick(1);
  assert.equal(hintText(hint), t[HINT_RIGHT]);

  hint.unmount();
  s.unmount();
});

// =============================================================================
// 4. the lifetime
// =============================================================================

test('it appears once and stays put - it never blinks and never repeats', () => {
  const t = getInteractionHintStrings('zh');
  const s = screen({ mode: DUAL, surfaceId: 'test/s', left: () => {}, right: () => {} });
  const hint = mountHint();

  tick(INACTIVITY_HINT_DELAY_MS);
  assert.equal(hintText(hint), t[HINT_DUAL]);

  // Five more windows go by, with the screen re-rendering throughout. The line
  // is the same line, continuously - not a second hint, and never off-and-on.
  for (let i = 0; i < 5; i += 1) {
    s.rerender();
    tick(INACTIVITY_HINT_DELAY_MS);
    assert.equal(hintText(hint), t[HINT_DUAL], `still the same single line after window ${i + 2}`);
  }

  hint.unmount();
  s.unmount();
});

test('taking the choice takes the hint away', () => {
  const t = getInteractionHintStrings('zh');
  let answered = false;
  const declare = () => (answered
    ? { mode: SINGLE, surfaceId: 'test/quiz-answered', action: () => {} }
    : { mode: DUAL, surfaceId: 'test/quiz', left: () => { answered = true; }, right: () => { answered = true; } });

  const s = screen(declare());
  const hint = mountHint();
  tick(INACTIVITY_HINT_DELAY_MS);
  assert.equal(hintText(hint), t[HINT_DUAL]);

  // The player waves left. The screen becomes a different interaction.
  performARInteraction('left');
  s.declare(declare());
  assert.equal(hintText(hint), null, 'the hint goes the instant the choice is taken');

  // And the next chance to act gets its own full ten seconds.
  tick(INACTIVITY_HINT_DELAY_MS - 1);
  assert.equal(hintText(hint), null);
  tick(1);
  assert.equal(hintText(hint), t[HINT_RIGHT], 'with the line the new geometry calls for');

  hint.unmount();
  s.unmount();
});

test('a hint never outlives the screen it belongs to', () => {
  const t = getInteractionHintStrings('zh');
  const first = screen({ mode: DUAL, surfaceId: 'test/first', left: () => {}, right: () => {} });
  const hint = mountHint();
  tick(INACTIVITY_HINT_DELAY_MS);
  assert.equal(hintText(hint), t[HINT_DUAL]);

  // Navigation, in the order React actually does it: the newcomer registers,
  // then the outgoing screen releases.
  const second = screen({ mode: SINGLE, surfaceId: 'test/second', action: () => {} });
  first.unmount();
  assert.equal(hintText(hint), null, 'the previous screen\'s hint must not carry over');

  tick(INACTIVITY_HINT_DELAY_MS);
  assert.equal(hintText(hint), t[HINT_RIGHT], 'and the new screen is counted from its own start');

  hint.unmount();
  second.unmount();
});

test('a timer armed on one screen cannot fire on the next', () => {
  const first = screen({ mode: DUAL, surfaceId: 'test/first', left: () => {}, right: () => {} });
  const hint = mountHint();

  tick(INACTIVITY_HINT_DELAY_MS - 1);        // 1ms from firing
  first.unmount();                            // ...and the screen goes
  const second = screen({ mode: DISPLAY, surfaceId: 'test/second' });
  tick(5000);
  assert.equal(hintText(hint), null, 'the armed timer must be cleared, not left to land on a display-only screen');

  hint.unmount();
  second.unmount();
});

test('an unmounted hint leaves no timer running', () => {
  // Counted for real: a pending clock that survives unmount is a leak that
  // would fire into a component that is no longer there.
  const realClear = globalThis.clearTimeout;
  let cleared = 0;
  globalThis.clearTimeout = (...args) => { cleared += 1; return realClear(...args); };
  try {
    const s = screen({ mode: SINGLE, surfaceId: 'test/s', action: () => {} });
    const hint = mountHint();
    tick(INACTIVITY_HINT_DELAY_MS - 1);        // armed, 1ms from firing
    assert.equal(hintText(hint), null);

    hint.unmount();
    assert.ok(cleared > 0, 'unmounting must clear the pending clock');

    // And the contract has no observer left to shout at: a screen that keeps
    // changing after the hint is gone must not reach it.
    const before = cleared;
    s.declare({ mode: DUAL, surfaceId: 'test/s2', left: () => {}, right: () => {} });
    tick(INACTIVITY_HINT_DELAY_MS * 2);
    assert.equal(hintText(hint), null, 'an unmounted hint stays silent');
    assert.equal(cleared, before, 'and arms nothing new');
    s.unmount();
  } finally {
    globalThis.clearTimeout = realClear;
  }
});

// =============================================================================
// 5. the harmlessness
// =============================================================================

test('the hint never acts for the player', () => {
  let ran = 0;
  const s = screen({
    mode: DUAL,
    surfaceId: 'test/s',
    left: () => { ran += 1; },
    right: () => { ran += 1; },
  });
  const hint = mountHint();

  tick(INACTIVITY_HINT_DELAY_MS * 10);
  assert.notEqual(hintText(hint), null, 'it is up');
  assert.equal(ran, 0, 'and it has chosen nothing - the player still decides');

  hint.unmount();
  s.unmount();
});

test('it is a notice, not a control', () => {
  const s = screen({ mode: DUAL, surfaceId: 'test/s', left: () => {}, right: () => {} });
  const hint = mountHint();
  tick(INACTIVITY_HINT_DELAY_MS);

  const nodes = walk(hintRoot(hint));
  // Nothing in it is interactive, and nothing carries a handler.
  nodes.forEach((node) => {
    assert.notEqual(node.type, 'button', 'the hint must not put a control on screen');
    assert.equal(node.props?.onClick, undefined);
    assert.equal(node.props?.onPointerDown, undefined);
  });
  const [root] = nodes;
  assert.equal(root.props.role, 'status');
  assert.equal(root.props['aria-live'], 'polite');

  // And it lets every touch through to the screen underneath, so the pointer
  // fallback each screen already has keeps working where the hint sits.
  assert.match(SOURCES.css, /\.interaction-hint\{[^}]*pointer-events:none/);
  assert.match(SOURCES.css, /\.interaction-hint-line\{[^}]*pointer-events:none/);
  // Out of flow, so no screen's layout or scrolling changes when it arrives.
  assert.match(SOURCES.css, /\.interaction-hint\{[^}]*position:fixed/);
  // Not a modal, not an alert, not a full-screen scrim.
  assert.equal(/\bmodal\b|\bbackdrop-filter:[^;}]*\bblur\b[^;}]*;[^}]*inset:0/.test(SOURCES.css), false);
  assert.equal(/\.interaction-hint\{[^}]*(?:top:0|inset:0|height:100)/.test(SOURCES.css), false, 'the hint must not cover the screen');

  hint.unmount();
  s.unmount();
});

test('it holds no second copy of what a screen allows', () => {
  const code = stripComments(SOURCES.hint) + stripComments(SOURCES.rules);
  // No DOM probing: the mode comes from the contract, never from counting
  // buttons or reading attributes off the page.
  [/querySelector/, /getElementById/, /document\./, /\.click\(/, /data-\w+/].forEach((forbidden) => {
    assert.equal(forbidden.test(code), false, `the hint must not use ${forbidden}`);
  });
  // No route or scenario knowledge: no per-scenario special case can hide here.
  [/scenario\s*0?\d/i, /pathname/i, /useLocation/, /useNavigate/, /\/ar-scan/].forEach((forbidden) => {
    assert.equal(forbidden.test(code), false, `the hint must not use ${forbidden}`);
  });
  // It reads the contract and subscribes to it; it never dispatches.
  assert.ok(stripComments(SOURCES.hint).includes('getCurrentARInteraction'));
  assert.ok(stripComments(SOURCES.hint).includes('subscribeARInteraction'));
  [/performARInteraction/, /dispatchARGesture/, /registerARInteraction/].forEach((forbidden) => {
    assert.equal(forbidden.test(code), false, `the hint must not call ${forbidden}`);
  });
  // And nothing about it leaked into the gesture bridge.
  const bridge = stripComments(SOURCES.contract);
  assert.equal(/INACTIVITY|hintFor|inactivityHint/.test(bridge), false, 'the contract must not know about the hint\'s rules');
});

test('`presenting` is read by the hint and by nothing that dispatches', async () => {
  const bridge = stripComments(await read('src/lib/arInteraction/gestureBridge.js'));
  assert.equal(/presenting/.test(bridge), false, 'the Gesture Bridge must not branch on it');

  // In the contract it is carried and reported, never consulted when deciding
  // whether an action runs.
  const contract = stripComments(SOURCES.contract);
  const dispatch = contract.slice(contract.indexOf('export function performARInteractionWithResult'));
  assert.equal(/presenting/.test(dispatch), false, 'dispatch must not consult it');

  // The behavioural half of the same claim.
  const s = screen({ mode: DUAL, surfaceId: 'test/s', left: () => {}, right: () => {}, presenting: true });
  const snapshot = getCurrentARInteraction();
  assert.equal(snapshot.presenting, true);
  assert.equal(snapshot.mode, DUAL, 'presenting does not collapse the geometry');
  assert.equal(snapshot.leftAvailable, true);
  assert.equal(snapshot.rightAvailable, true);
  assert.equal(performARInteraction('left'), true, 'and both directions still run');
  assert.equal(performARInteraction('right'), true);
  s.unmount();
});

// =============================================================================
// 6. the real screens
// =============================================================================

const QUIZ_PROPS = {
  t: (zh) => zh,
  question: '對方要求你先付一筆保證金，你會怎麼做？',
  options: ['停止付款，查詢 165。', '先付保證金。'],
  correctIndex: 0,
  explanation: '解析',
};

test('the shared anti-fraud quiz - every scenario ends on it - drives the hint', async () => {
  const t = getInteractionHintStrings('zh');
  const { ScenarioFinalDecision } = await import('../src/components/ui/ScenarioFinalDecision.jsx');
  const { resetNavigations } = await import('./stubs/react-router-dom.mjs');
  resetNavigations();

  const quiz = mountSurface(ScenarioFinalDecision, { ...QUIZ_PROPS, onAnswer: () => {} });
  const hint = mountHint();

  // Two options: the player is asked to pick a side.
  tick(INACTIVITY_HINT_DELAY_MS);
  assert.equal(hintText(hint), t[HINT_DUAL]);

  // They answer. The options lock and the screen becomes a one-action screen -
  // so the hint goes, and the next one names the direction that is now live.
  performARInteraction('left');
  quiz.rerender();
  assert.equal(hintText(hint), null, 'answering clears it immediately');
  tick(INACTIVITY_HINT_DELAY_MS);
  assert.equal(hintText(hint), t[HINT_RIGHT], 'and the follow-on action is a right swipe');

  hint.unmount();
  quiz.unmount();
});

test('the AR scan home stays quiet while it is looking, and speaks once a card is on offer', async () => {
  const t = getInteractionHintStrings('zh');
  // Two surfaces, exactly as ArScanHome declares them: nothing to do while
  // scanning, one action once a scenario card has been recognised.
  const s = screen({ mode: DISPLAY, surfaceId: 'ar-scan/scanning' });
  const hint = mountHint();
  tick(INACTIVITY_HINT_DELAY_MS * 3);
  assert.equal(hintText(hint), null, 'a player still holding up a card is not idling');

  s.declare({ mode: SINGLE, surfaceId: 'ar-scan/target-offer', action: () => {} });
  tick(INACTIVITY_HINT_DELAY_MS);
  assert.equal(hintText(hint), t[HINT_RIGHT]);

  hint.unmount();
  s.unmount();
});

test('the pitch video really does declare itself as presenting', async () => {
  const source = stripComments(await read('src/pages/scenario01/VideoTeacher.jsx'));
  assert.match(source, /presenting:\s*watchingPitch/);
  // It is held only while the pitch is actually running - not once it has
  // ended, stalled, been paused or failed, which are the moments a player
  // genuinely is waiting.
  assert.match(source, /playbackState === 'loading' \|\| playbackState === 'starting' \|\| playbackState === 'playing'/);
  assert.match(source, /onEnded=\{handleEnded\}/);
  // And it did not become a way to switch the CTA off.
  assert.equal(/disabled:/.test(source), false, 'the CTA must stay callable throughout the video');
});

test('the five scenarios reach the hint through the contract they already declare', async () => {
  // No scenario imports the hint, names it, or carries a timer of its own: one
  // clock for the whole run, held in one place.
  const { readdir } = await import('node:fs/promises');
  const roots = ['src/pages/scenario01', 'src/pages/scenario02', 'src/pages/scenario03', 'src/pages/scenario04', 'src/pages/scenario05', 'src/components/outcome', 'src/components/ui'];
  const files = [];
  const collect = async (dir) => {
    for (const entry of await readdir(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) {
      if (entry.isDirectory()) await collect(`${dir}/${entry.name}`);
      else if (/\.[jt]sx?$/.test(entry.name)) files.push(`${dir}/${entry.name}`);
    }
  };
  for (const root of roots) await collect(root);
  assert.ok(files.length > 50, 'the sweep must actually be reading the scenarios');

  for (const file of files) {
    const source = stripComments(await read(file));
    assert.equal(/InteractionHint|interactionHintI18n/.test(source), false, `${file}: no scenario may own a copy of the hint`);
    assert.equal(/INACTIVITY_HINT|inactivityHintFor/.test(source), false, `${file}: no scenario may run its own inactivity clock`);
  }

  // It is mounted exactly once, in the shell, beside the routed screen.
  const shell = await read('src/shell/AppShell.jsx');
  assert.match(shell, /<InteractionHint\b/);
  assert.equal([...shell.matchAll(/<InteractionHint\b/g)].length, 1);
});

// =============================================================================
// 7. the rules, on their own
// =============================================================================

test('the rules are pure functions over one snapshot', () => {
  const snap = (over) => ({ active: true, presenting: false, leftAvailable: false, rightAvailable: false, revision: 7, ...over });
  assert.equal(inactivityHintFor(snap({ leftAvailable: true, rightAvailable: true })), HINT_DUAL);
  assert.equal(inactivityHintFor(snap({ rightAvailable: true })), HINT_RIGHT);
  assert.equal(inactivityHintFor(snap({ leftAvailable: true })), HINT_LEFT);
  assert.equal(inactivityHintFor(snap({})), null);
  assert.equal(inactivityHintFor(snap({ active: false, rightAvailable: true })), null);
  assert.equal(inactivityHintFor(snap({ presenting: true, rightAvailable: true })), null);
  assert.equal(inactivityHintFor(null), null);
  assert.equal(inactivityHintFor(undefined), null);

  // The clock's identity is the contract's own revision, and nothing else.
  assert.equal(inactivityHintKey(snap({})), 7);
  assert.equal(inactivityHintKey(snap({ active: false })), null);
  assert.equal(inactivityHintKey(null), null);
});

test('the contract tells observers when the geometry moves, and only then', () => {
  let notified = 0;
  const stop = subscribeARInteraction(() => { notified += 1; });

  const s = screen({ mode: SINGLE, surfaceId: 'test/s', action: () => {} });
  getCurrentARInteraction();
  const afterRegister = notified;
  assert.ok(afterRegister > 0, 'registering a screen is a change');

  // New closures, same geometry: not a change.
  s.declare({ mode: SINGLE, surfaceId: 'test/s', action: () => {} });
  getCurrentARInteraction();
  assert.equal(notified, afterRegister, 'a re-render with the same geometry must not notify');

  // A real change: the action goes away.
  s.declare({ mode: SINGLE, surfaceId: 'test/s', action: null });
  getCurrentARInteraction();
  assert.ok(notified > afterRegister, 'losing the action is a change');

  stop();
  const quiet = notified;
  s.declare({ mode: DUAL, surfaceId: 'test/other', left: () => {}, right: () => {} });
  getCurrentARInteraction();
  assert.equal(notified, quiet, 'unsubscribing really stops it');
  s.unmount();
});

test('a screen that registered before the hint was listening is still picked up', () => {
  const t = getInteractionHintStrings('zh');
  // The ordering React actually produces: this component and the routed screen
  // render in the same pass, and the SCREEN's registration effect runs before
  // this one's subscription effect. A snapshot taken during render is stale by
  // the time the subscription exists, and the registration that would have
  // corrected it already happened with nobody listening.
  //
  // The component therefore starts from nothing and reads the contract back
  // immediately after subscribing. This test is what holds that: the screen is
  // registered FIRST and never re-renders afterwards, so a hint that trusted
  // its render-time read, or that waited to be notified, would stay silent for
  // ever.
  const s = screen({ mode: DUAL, surfaceId: 'test/already-there', left: () => {}, right: () => {} });
  const hint = mountHint();

  tick(INACTIVITY_HINT_DELAY_MS);
  assert.equal(hintText(hint), t[HINT_DUAL], 'the hint must read the contract back once it is listening');

  hint.unmount();
  s.unmount();
});

test('the component never reads the contract while rendering', () => {
  // The read has to sit inside the effect. A read in the render body - as a
  // `useState` initialiser, or inline - is the stale one described above.
  const code = stripComments(SOURCES.hint);
  const body = code.slice(code.indexOf('export function InteractionHint'));
  const effect = body.slice(body.indexOf('useEffect(() => {'), body.indexOf('}, []);') + 7);
  assert.ok(effect.includes('getCurrentARInteraction()'), 'the read must happen in the subscription effect');
  assert.ok(effect.includes('subscribeARInteraction'));
  // and nowhere else in the component
  assert.equal([...body.matchAll(/getCurrentARInteraction/g)].length, [...effect.matchAll(/getCurrentARInteraction/g)].length,
    'the contract must not be read outside the subscription effect');
  assert.equal(/useState\(getCurrentARInteraction/.test(body), false, 'and never as a render-time initialiser');
});

// =============================================================================
// 8. the band it sits in
// =============================================================================
//
// Nearly every screen in this app runs its content to within about 22px of the
// stage's bottom edge, so a strip laid over that edge covers a CTA, a chat's
// last line or a quiz's answer. The hint reserves a band instead, and these
// are the two halves of that: the hint says when it is up, and the stage gives
// up exactly that much of its own bottom padding while it is.

test('the hint tells the shell when it is up, so the band can be reserved', () => {
  const reported = [];
  const s = screen({ mode: DUAL, surfaceId: 'test/s', left: () => {}, right: () => {} });
  const hint = mountSurface(InteractionHint, { onVisibilityChange: (v) => reported.push(v) });

  assert.deepEqual(reported, [false], 'nothing reserved before the ten seconds are up');
  tick(INACTIVITY_HINT_DELAY_MS);
  assert.equal(reported.at(-1), true, 'the band is reserved when the line appears');

  // Taking the choice gives the band straight back.
  s.declare({ mode: DISPLAY, surfaceId: 'test/s' });
  assert.equal(reported.at(-1), false, 'and released the moment the hint goes');

  tick(INACTIVITY_HINT_DELAY_MS);
  assert.equal(reported.at(-1), false, 'a screen with nothing to do never reserves it');

  hint.unmount();
  assert.equal(reported.at(-1), false, 'and an unmounted hint leaves no band behind');
  s.unmount();
});

test('the shell reserves the band, and only while the hint is up', async () => {
  const shell = await read('src/shell/AppShell.jsx');
  // The class is on the stage, driven by what the hint reports - not by a
  // route, a scenario or a guess.
  assert.match(shell, /onVisibilityChange=\{setHintVisible\}/);
  assert.match(shell, /hintVisible \? ' has-interaction-hint' : ''/);

  // The stage gives up the band from its own bottom padding, so every screen
  // is laid out inside what is left rather than underneath the strip.
  assert.match(SOURCES.css, /\.app\.ar-stage\.has-interaction-hint\{[^}]*--interaction-hint-band:[^}]*padding-bottom:var\(--interaction-hint-band\)/);
  // The strip is exactly the band - one number, written once, so the two
  // cannot drift apart.
  assert.match(SOURCES.css, /\.interaction-hint\{[^}]*height:var\(--interaction-hint-band\)/);
  // Zero when the hint is not up: no screen loses anything the rest of the time.
  assert.match(SOURCES.css, /\.app\.ar-stage\{[^}]*--interaction-hint-band:0px/);
  // And it eases in and out, so the screen sharing the stage never jumps.
  assert.match(SOURCES.css, /\.app\.ar-stage\{[^}]*transition:padding-bottom \.28s/);
  assert.match(SOURCES.css, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\.app\.ar-stage\{transition:none\}/);
});
