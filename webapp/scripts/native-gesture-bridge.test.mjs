// The native gesture binding, end to end - from the event the Android WebView
// actually dispatches to the action a scenario screen actually runs.
//
// The suites that came before this one each stop one layer short of the thing
// that was broken on the device:
//
//   test:gesture-tutorial   window 'jorjinGesture' -> the tutorial's own machine
//   test:gesture-bridge     dispatchARGesture(...) -> a scenario's action
//   THIS SUITE              window 'jorjinGesture' -> a scenario's action
//
// Nothing below calls `dispatchARGesture` directly, and nothing below calls a
// screen's handler directly. Every case starts by dispatching a real
// CustomEvent at a real EventTarget standing in for `window` - the same event
// android/.../GestureBridgeScript.java delivers, with the vendor's uppercase
// code and its running count - and then asks what the screen did. A binding
// that were still missing would fail every case in section 1 without a single
// assertion having to know it exists.
//
//   佐臻 ToF -> GestureBridgeScript -> window 'jorjinGesture'
//            -> jorjinGestureAdapter -> installJorjinGestureBridge
//            -> dispatchARGesture -> AR Interaction Contract -> the action
//
// Run: npm run test:native-gesture-bridge
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// This layer is documented in prose that names what it must never do, and
// that prose is not code.
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

// --- environment -------------------------------------------------------------

// Same shims the other AR suites install: lib/lang.js reads the language out
// of localStorage, and the adapter listens on `window`.
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
const windowEvents = new EventTarget();
globalThis.window = Object.assign(globalThis, {
  addEventListener: windowEvents.addEventListener.bind(windowEvents),
  removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
  dispatchEvent: windowEvents.dispatchEvent.bind(windowEvents),
});

const { mountSurface } = await import('./ar-surface-harness.mjs');
const {
  AR_GESTURE_REJECTIONS,
  getARGestureSnapshot,
  resetARGestureBridge,
  resetARInteractionContract,
  subscribeARGestureDispatch,
  useARInteraction,
} = await import('../src/lib/arInteraction/index.js');
const {
  JORJIN_GESTURE_EVENT,
  NATIVE_GESTURE_SOURCE,
} = await import('../src/lib/arInteraction/native/jorjinGestureAdapter.js');
const {
  formatNativeGestureDispatch,
  installJorjinGestureBridge,
} = await import('../src/lib/arInteraction/native/installJorjinGestureBridge.js');
const {
  NativeGestureBridge,
  isNativeGestureBridgeSuspended,
} = await import('../src/components/native/NativeGestureBridge.jsx');
const { GestureTutorial } = await import('../src/pages/gestureTutorial/GestureTutorial.jsx');
const { getGestureTutorialStrings } = await import('../src/pages/gestureTutorial/i18n.js');
const { resetLocation, resetNavigations, setLocation } = await import('./stubs/react-router-dom.mjs');

const R = AR_GESTURE_REJECTIONS;

// A story route - any route that is not the gesture tutorial. Which one is
// deliberately irrelevant: the binding is installed above the router and has
// no route knowledge at all, and this suite proves that by driving Scenario
// screens' geometries from several different pathnames.
const STORY_PATH = '/scenario01-investment/feed';
const TUTORIAL_PATH = '/gesture-tutorial';

// One real delivery from the glasses: the exact event shape
// GestureBridgeScript.deliver() builds. `count` is the vendor's own running
// counter, and passing an explicit one is how a duplicate delivery is
// reproduced - a repeat carries the count it already had.
let deliveries = 0;
function wave(code, count = null) {
  deliveries += 1;
  const detail = { gesture: code, label: code, count: count ?? deliveries, at: deliveries * 1000 };
  window.dispatchEvent(new CustomEvent(JORJIN_GESTURE_EVENT, { detail }));
  return detail;
}

// Re-delivering an event that was already delivered, byte for byte - what a
// re-installed bridge script or a re-rendering page can produce.
function redeliver(detail) {
  window.dispatchEvent(new CustomEvent(JORJIN_GESTURE_EVENT, { detail }));
}

// A bare screen that declares an interaction geometry and nothing else. The
// rules under test hold regardless of any scenario's story, and a screen with
// a story in it would only obscure which rule ran.
const surface = (declaration) => function TestSurface() {
  useARInteraction(typeof declaration === 'function' ? declaration() : declaration);
  return null;
};

// The production mount, at a route where it is live.
function mountBridge(pathname = STORY_PATH) {
  setLocation(pathname);
  return mountSurface(NativeGestureBridge);
}

// Every dispatch the Bridge made, for the cases that assert on *why* a
// gesture did nothing rather than only that it did nothing.
function recordDispatches() {
  const seen = [];
  const stop = subscribeARGestureDispatch((event) => {
    if (event.phase === 'dispatched') seen.push(event);
  });
  return { seen, stop };
}

test.beforeEach(() => {
  resetARInteractionContract();
  resetARGestureBridge();
  resetNavigations();
  resetLocation();
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  deliveries = 0;
  delete globalThis.__CIBAR_AR_GESTURE_DIAGNOSTICS__;
});

// =============================================================================
// 1. The three geometries, driven by real native events
//
// These are the rules of #346, unchanged and re-proved from the native entry
// point: two actions -> LEFT is the left one and RIGHT is the right one; one
// action -> RIGHT runs it and LEFT does nothing; no action -> neither does
// anything. There is no focus step, no SELECT, no confirm.
// =============================================================================

test('1. TWO_ACTION: a native LEFT runs the left action exactly once', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));
  const bridge = mountBridge();

  wave('LEFT');

  assert.deepEqual(ran, ['left'], 'a native LEFT runs the left action, and only it');
  bridge.unmount();
  screen.unmount();
});

test('1. TWO_ACTION: a native RIGHT runs the right action exactly once', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));
  const bridge = mountBridge();

  wave('RIGHT');

  assert.deepEqual(ran, ['right'], 'a native RIGHT runs the right action, and only it');
  bridge.unmount();
  screen.unmount();
});

test('1. TWO_ACTION: both sides are reachable, in either order, one wave each', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));
  const bridge = mountBridge();

  wave('RIGHT');
  wave('LEFT');
  wave('RIGHT');

  assert.deepEqual(ran, ['right', 'left', 'right']);
  bridge.unmount();
  screen.unmount();
});

test('1. ONE_ACTION: a native LEFT does nothing at all', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));
  const bridge = mountBridge();
  const { seen, stop } = recordDispatches();

  wave('LEFT');

  assert.deepEqual(ran, [], 'a one-action screen has no LEFT');
  assert.equal(seen.length, 1, 'the gesture still reached the Bridge - it was refused there');
  assert.equal(seen[0].accepted, false);
  assert.equal(seen[0].reason, R.DIRECTION_UNAVAILABLE);
  stop();
  bridge.unmount();
  screen.unmount();
});

test('1. ONE_ACTION: a native RIGHT runs the single action exactly once', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));
  const bridge = mountBridge();

  wave('RIGHT');

  assert.deepEqual(ran, ['action']);
  bridge.unmount();
  screen.unmount();
});

test('1. ZERO_ACTION: neither native gesture does anything on a display screen', () => {
  const screen = mountSurface(surface({ mode: 'display', surfaceId: 'test/display' }));
  const bridge = mountBridge();
  const { seen, stop } = recordDispatches();

  wave('LEFT');
  wave('RIGHT');

  assert.deepEqual(seen.map((event) => event.reason), [R.DIRECTION_UNAVAILABLE, R.DIRECTION_UNAVAILABLE]);
  assert.equal(seen.every((event) => event.accepted === false), true);
  stop();
  bridge.unmount();
  screen.unmount();
});

test('1. a side the screen currently disables is refused, not silently skipped', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual', disabled: true,
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));
  const bridge = mountBridge();
  const { seen, stop } = recordDispatches();

  wave('LEFT');
  wave('RIGHT');

  assert.deepEqual(ran, []);
  assert.deepEqual(seen.map((event) => event.reason), [R.DISABLED, R.DISABLED]);
  stop();
  bridge.unmount();
  screen.unmount();
});

// =============================================================================
// 2. One wave runs one action
// =============================================================================

test('2. the same delivery arriving twice runs the action once', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));
  const bridge = mountBridge();
  const { seen, stop } = recordDispatches();

  const detail = wave('RIGHT');
  redeliver(detail);

  assert.deepEqual(ran, ['action'], 'one wave, one action');
  assert.equal(seen.length, 2, 'the repeat did reach the Bridge');
  assert.equal(seen[0].accepted, true);
  assert.equal(seen[1].accepted, false);
  assert.equal(seen[1].reason, R.DUPLICATE_EVENT);
  stop();
  bridge.unmount();
  screen.unmount();
});

test('2. the event id the Bridge de-duplicates on is the vendor\'s own count and timestamp', () => {
  const screen = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => {},
  }));
  const bridge = mountBridge();
  const { seen, stop } = recordDispatches();

  // Both halves are load-bearing. `count` is the vendor's running total of
  // accepted gestures, and JorjinHardwareManager.start() resets it to zero
  // every time the activity returns to the foreground or the tester hits
  // 重新連接 - without reloading the WebView. An id built from `count` alone
  // would make the next n real waves after such a reset look like replays of
  // deliveries 1..n, and the page would sit there ignoring the player.
  // `at` is SystemClock.elapsedRealtime(), which keeps climbing across those
  // resets, so the pair stays unique through them - while a genuine replay,
  // same count and same timestamp, still collides and is still dropped.
  const detail = wave('RIGHT', 23);

  assert.equal(detail.count, 23);
  assert.equal(seen[0].eventId, `${NATIVE_GESTURE_SOURCE}:${detail.count}@${detail.at}`);
  assert.equal(seen[0].source, NATIVE_GESTURE_SOURCE);
  stop();
  bridge.unmount();
  screen.unmount();
});

test('2. a delivery replayed while its own action navigates cannot land on the next screen', () => {
  // The exact failure the binding has to make impossible: RIGHT runs Screen
  // A's action, that action navigates, and the same delivery comes back round
  // to a Screen B that is now on. Modelled here by doing the navigation for
  // real - unmounting A, mounting B - from inside A's own handler, and then
  // re-delivering the identical event.
  const ran = [];
  let detail = null;
  let screenB = null;

  const screenA = mountSurface(surface({
    mode: 'single',
    surfaceId: 'test/screen-a',
    action: () => {
      ran.push('a');
      screenA.unmount();
      screenB = mountSurface(surface({
        mode: 'dual', surfaceId: 'test/screen-b',
        left: () => ran.push('b-left'), right: () => ran.push('b-right'),
      }));
      redeliver(detail);
    },
  }));
  const bridge = mountBridge();

  detail = wave('RIGHT');

  assert.deepEqual(ran, ['a'], 'the second screen must not inherit the first screen\'s wave');
  bridge.unmount();
  screenB?.unmount();
});

test('2. a different delivery arriving while an action runs is refused as busy', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'dual',
    surfaceId: 'test/dual',
    left: () => { ran.push('left'); wave('RIGHT'); },
    right: () => ran.push('right'),
  }));
  const bridge = mountBridge();
  const { seen, stop } = recordDispatches();

  wave('LEFT');

  assert.deepEqual(ran, ['left'], 'a gesture recognised mid-action does not re-enter it');
  assert.equal(seen[1].accepted, false);
  assert.equal(seen[1].reason, R.BUSY);
  stop();
  bridge.unmount();
  screen.unmount();
});

// =============================================================================
// 3. expectedRevision - the wave belongs to the screen it was made on
// =============================================================================

test('3. the dispatch carries the contract revision current when the event arrived', () => {
  const screen = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => {},
  }));
  const bridge = mountBridge();
  const { seen, stop } = recordDispatches();

  const revision = getARGestureSnapshot().revision;
  wave('RIGHT');

  assert.equal(seen[0].revision, revision);
  assert.equal(seen[0].accepted, true, 'a revision read at the event is never stale by the time it is dispatched');
  stop();
  bridge.unmount();
  screen.unmount();
});

test('3. the revision is read from the snapshot at the native event, not held anywhere', async () => {
  // The staleness guard itself is the Bridge's, and test:gesture-bridge owns
  // it. What is this binding's to prove is that it feeds the guard, and that
  // it reads the revision when the event arrives rather than capturing one at
  // install time - which no synchronous dispatch can distinguish by
  // behaviour, because the read and the dispatch are one statement apart.
  const code = stripComments(await read('src/lib/arInteraction/native/installJorjinGestureBridge.js'));
  assert.match(code, /getARGestureSnapshot\(\)/, 'the snapshot is read');
  assert.match(code, /expectedRevision:\s*revision/, 'and handed to the Bridge as expectedRevision');
  // Read inside the subscription callback, not once at install time.
  const callback = code.slice(code.indexOf('subscribeNativeGestures'));
  assert.match(callback, /const\s*\{\s*revision\s*\}\s*=\s*getARGestureSnapshot\(\)/);
});

// =============================================================================
// 4. The vocabulary is two words
//
// The ToF module also emits UP, DOWN, PULL, PUSH, HALT, PRESENCE and SELECT.
// None of them may reach the Bridge at all - not as a rejected dispatch, not
// as a focus move, not as a confirm step.
// =============================================================================

test('4. no unsupported vendor gesture reaches the Bridge', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));
  const bridge = mountBridge();
  const { seen, stop } = recordDispatches();

  ['PUSH', 'HALT', 'SELECT', 'UP', 'DOWN', 'PULL', 'PRESENCE', 'CLICK', 'OK'].forEach((code) => wave(code));

  assert.deepEqual(ran, [], 'no unsupported gesture runs a story action');
  assert.deepEqual(seen, [], 'and none of them is even dispatched');
  stop();
  bridge.unmount();
  screen.unmount();
});

test('4. a malformed delivery is dropped rather than guessed at', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));
  const bridge = mountBridge();
  const { seen, stop } = recordDispatches();

  window.dispatchEvent(new CustomEvent(JORJIN_GESTURE_EVENT));
  window.dispatchEvent(new CustomEvent(JORJIN_GESTURE_EVENT, { detail: {} }));
  window.dispatchEvent(new CustomEvent(JORJIN_GESTURE_EVENT, { detail: { gesture: null } }));
  window.dispatchEvent(new CustomEvent(JORJIN_GESTURE_EVENT, { detail: { gesture: 42 } }));
  window.dispatchEvent(new CustomEvent(JORJIN_GESTURE_EVENT, { detail: { gesture: '' } }));

  assert.deepEqual(ran, []);
  assert.deepEqual(seen, []);
  stop();
  bridge.unmount();
  screen.unmount();
});

test('4. the vendor\'s casing and padding are a transport detail, not a third word', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));
  const bridge = mountBridge();

  wave(' left ');
  wave('Right');

  assert.deepEqual(ran, ['left', 'right']);
  bridge.unmount();
  screen.unmount();
});

// =============================================================================
// 5. The gesture tutorial keeps its own gestures
// =============================================================================

test('5. on /gesture-tutorial a native LEFT advances the tutorial and runs no story action', () => {
  localStorage.setItem('language', 'zh');

  // A story screen with a contract is deliberately still registered: the
  // tutorial does not declare one, so if the binding were live here the wave
  // would land on whatever contract was left behind. It must not.
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));
  const tutorial = mountSurface(GestureTutorial);
  const bridge = mountBridge(TUTORIAL_PATH);
  const { seen, stop } = recordDispatches();

  wave('LEFT');

  assert.equal(activeStepOf(tutorial.output), 'right', 'the tutorial consumed the wave');
  assert.deepEqual(ran, [], 'and the AR Interaction Contract ran nothing');
  assert.deepEqual(seen, [], 'the wave was never dispatched at the contract at all');
  stop();
  bridge.unmount();
  tutorial.unmount();
  screen.unmount();
});

test('5. the tutorial still completes on its own two waves while the binding is suspended', () => {
  localStorage.setItem('language', 'zh');
  const strings = getGestureTutorialStrings();
  const tutorial = mountSurface(GestureTutorial);
  const bridge = mountBridge(TUTORIAL_PATH);

  wave('LEFT');
  wave('RIGHT');

  assert.equal(completionOf(tutorial.output), strings.complete);
  bridge.unmount();
  tutorial.unmount();
});

test('5. the binding resumes the moment the player leaves the tutorial', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));
  const bridge = mountBridge(TUTORIAL_PATH);

  wave('RIGHT');
  assert.deepEqual(ran, [], 'suspended on the tutorial');

  setLocation('/ar-scan');
  bridge.rerender();
  wave('RIGHT');

  assert.deepEqual(ran, ['action'], 'live again on the next screen');
  bridge.unmount();
  screen.unmount();
});

test('5. exactly one route is excluded, and trailing slashes are not a different screen', () => {
  assert.equal(isNativeGestureBridgeSuspended(TUTORIAL_PATH), true);
  assert.equal(isNativeGestureBridgeSuspended(`${TUTORIAL_PATH}/`), true);
  [
    '/', '/language', '/ar-scan', '/scenario-menu', STORY_PATH,
    '/scenario02-romance/topup-warning', '/scenario03-police/final',
    '/scenario04-shopping/quiz', '/scenario05-atm/reveal',
    '/gesture-tutorial-x', '/x/gesture-tutorial',
  ].forEach((pathname) => {
    assert.equal(isNativeGestureBridgeSuspended(pathname), false, `${pathname} must be gesture-operable`);
  });
});

test('5. the excluded path is the path the router actually registers the tutorial at', async () => {
  const routes = stripComments(await read('src/routes.jsx'));
  assert.match(routes, /path:\s*'gesture-tutorial'/, 'the tutorial route');
  const component = stripComments(await read('src/components/native/NativeGestureBridge.jsx'));
  assert.match(component, /'\/gesture-tutorial'/, 'and the same path is the one the binding suspends on');
});

// =============================================================================
// 6. A screen with no contract, and the one /ar-scan declares for itself
// =============================================================================

test('6. with no active interaction a native gesture reports it and does nothing else', () => {
  const bridge = mountBridge('/ar-scan');
  const { seen, stop } = recordDispatches();

  wave('LEFT');
  wave('RIGHT');

  assert.deepEqual(seen.map((event) => event.reason), [R.NO_ACTIVE_INTERACTION, R.NO_ACTIVE_INTERACTION]);
  stop();
  bridge.unmount();
});

test('6. the scan screen declares its two geometries, and listens for no gesture itself', async () => {
  const scan = stripComments(await read('src/pages/arScan/ArScanHome.jsx'));
  // Recognising a printed card is not entering its scenario: the card is
  // offered, and the player takes the offer with the same RIGHT wave every
  // other one-action screen in the app uses. So the scan screen is two
  // surfaces, and the searching one is deliberately `display` - a wave with
  // nothing found must not guess a scenario.
  assert.match(scan, /mode: 'display', surfaceId: 'ar-scan\/scanning'/);
  assert.match(scan, /mode: 'single', surfaceId: 'ar-scan\/target-offer'/);
  // The image recogniser is not a gesture source, and this screen is not a
  // gesture consumer: it declares its geometry and the Bridge does the rest,
  // exactly like a story screen.
  assert.equal(/jorjinGesture|subscribeNativeGestures/.test(scan), false, 'the scan screen listens for no gesture itself');
});

// =============================================================================
// 7. The diagnostic line
// =============================================================================

test('7. the log line names the gesture, the delivery, the revision, the surface and the verdict', () => {
  // The ids here are written the way the adapter actually builds them,
  // `<count>@<at>`, so a line copied out of this test into a bug report looks
  // like a line off a real device rather than one from an older format.
  const accepted = formatNativeGestureDispatch({
    gesture: 'right', eventId: 'jorjin-tof:23@1000', revision: 105,
    surfaceId: 'scenario01/feed', accepted: true, reason: null,
  });
  assert.equal(
    accepted,
    '[JorjinGesture] native=RIGHT eventId=jorjin-tof:23@1000 revision=105 surface=scenario01/feed accepted=true reason=null',
  );

  const rejected = formatNativeGestureDispatch({
    gesture: 'left', eventId: 'jorjin-tof:24@2000', revision: 105,
    surfaceId: 'scenario01/feed', accepted: false, reason: R.DIRECTION_UNAVAILABLE,
  });
  assert.match(rejected, /accepted=false reason=direction-unavailable$/);

  // Every rejection the Bridge can report is a reason a line can carry, so a
  // device that shows RIGHT and does nothing always names the layer it
  // stopped at.
  Object.values(R).forEach((reason) => {
    assert.match(
      formatNativeGestureDispatch({ gesture: 'right', accepted: false, reason }),
      new RegExp(`reason=${reason}$`),
    );
  });
});

test('7. nothing is logged unless diagnostics are on, and it is console output only', () => {
  const screen = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => {},
  }));

  const original = console.info;
  const lines = [];
  console.info = (...args) => lines.push(args.join(' '));
  try {
    const quiet = installJorjinGestureBridge({ diagnostics: false });
    wave('RIGHT');
    quiet();
    assert.deepEqual(lines, [], 'a player\'s build says nothing');

    const loud = installJorjinGestureBridge({ diagnostics: true });
    wave('LEFT');
    loud();
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^\[JorjinGesture\] native=LEFT /);
  } finally {
    console.info = original;
  }

  screen.unmount();
});

test('7. the runtime switch reaches a binding that was installed before it was set', () => {
  // The binding is installed once, when the app starts, and stays installed.
  // A device with an already-built APK in it can only turn logging on after
  // that, so the switch has to be read per delivery - a value captured at
  // install time would make the runtime switch useless, which is the one job
  // it has.
  const screen = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => {},
  }));
  const bridge = mountBridge();

  const original = console.info;
  const lines = [];
  console.info = (...args) => lines.push(args.join(' '));
  try {
    wave('RIGHT');
    assert.deepEqual(lines, [], 'silent until it is switched on');

    globalThis.__CIBAR_AR_GESTURE_DIAGNOSTICS__ = true;
    wave('RIGHT');
    assert.equal(lines.length, 1, 'the very next gesture is logged');
    assert.match(lines[0], /^\[JorjinGesture\] native=RIGHT /);

    delete globalThis.__CIBAR_AR_GESTURE_DIAGNOSTICS__;
    wave('LEFT');
    assert.equal(lines.length, 1, 'and switching it back off silences it again');
  } finally {
    console.info = original;
  }

  bridge.unmount();
  screen.unmount();
});

test('7. the runtime diagnostics switch is off by default and read live', async () => {
  const { isARGestureDiagnosticsEnabled } = await import('../src/lib/arInteraction/debug/gestureDebugFlag.js');
  assert.equal(isARGestureDiagnosticsEnabled({}), false, 'off in a production build');
  assert.equal(isARGestureDiagnosticsEnabled({ VITE_AR_GESTURE_DEBUG: 'true' }), true);
  assert.equal(isARGestureDiagnosticsEnabled({ DEV: true }), true);

  globalThis.__CIBAR_AR_GESTURE_DIAGNOSTICS__ = true;
  assert.equal(isARGestureDiagnosticsEnabled({}), true, 'and switchable on a device that is already built');
  delete globalThis.__CIBAR_AR_GESTURE_DIAGNOSTICS__;
  assert.equal(isARGestureDiagnosticsEnabled({}), false);
});

test('7. the diagnostic text is not player-facing UI', async () => {
  const component = await read('src/components/native/NativeGestureBridge.jsx');
  // The mount renders nothing; there is no element, no text and no styling.
  assert.match(component, /return null;/);
  [/<div/, /<span/, /className=/, /style=/, /左揮/, /右揮/, /\[JorjinGesture\]/, /console\./].forEach((forbidden) => {
    assert.equal(forbidden.test(stripComments(component)), false, `the mount must not contain ${forbidden}`);
  });
});

// =============================================================================
// 8. Where the binding lives, and what it is not allowed to know
// =============================================================================

test('8. the app installs the binding once, above the router', async () => {
  const app = await read('src/App.jsx');
  assert.ok(app.includes('NativeGestureBridge'), 'App mounts the production binding');
  assert.ok(app.includes('ARGestureDebugOverlay'), 'and still mounts the DEV overlay beside it');
  // A sibling of the routed element, never a wrapper around it.
  assert.match(stripComments(app), /\{element\}\s*<NativeGestureBridge \/>/);
});

test('8. no screen listens for a native gesture except the tutorial', async () => {
  const { readdir } = await import('node:fs/promises');
  const src = new URL('../src/', import.meta.url);

  async function collect(dir, prefix = 'src') {
    const found = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) found.push(...await collect(new URL(`${entry.name}/`, dir), path));
      else if (/\.jsx?$/.test(entry.name)) found.push(path);
    }
    return found;
  }

  // Code only: several files explain the native stream in prose, and prose is
  // not a subscription.
  const files = [];
  for (const path of await collect(src)) {
    if (/jorjinGesture|subscribeNativeGestures/.test(stripComments(await read(path)))) files.push(path);
  }
  files.sort();

  assert.deepEqual(files, [
    // The adapter that owns the event name...
    'src/lib/arInteraction/native/installJorjinGestureBridge.js',
    'src/lib/arInteraction/native/jorjinGestureAdapter.js',
    // ...and the one page that runs its own machine on the same stream.
    'src/pages/gestureTutorial/GestureTutorial.jsx',
  ], 'a scenario that subscribed itself would be a second place deciding what a gesture means');
});

test('8. the binding knows nothing about scenarios, routes or the DOM', async () => {
  const code = stripComments(await read('src/lib/arInteraction/native/installJorjinGestureBridge.js'));
  [
    /scenario\s*0?\d/i, /blackpi/i, /mydondon/i, /meetu/i, /gugo/i, /coin-?winner/i,
    /\bpathname\b/, /useLocation/, /useNavigate/, /\/ar-scan/, /gesture-tutorial/,
    /surfaceId\s*===/, /switch\s*\(/, /startsWith\s*\(\s*['"]\//,
    /document\./, /querySelector/, /getElementById/, /\.click\(/, /createElement/,
    /setTimeout/, /setInterval/, /requestAnimationFrame/, /\breact\b/i,
  ].forEach((forbidden) => {
    assert.equal(forbidden.test(code), false, `the binding must not match ${forbidden}`);
  });

  // It contains no recogniser either: Android has already decided.
  ['mediapipe', 'tensorflow', 'handpose', 'getusermedia', 'mediadevices', 'camera', 'webxr']
    .forEach((forbidden) => assert.equal(code.toLowerCase().includes(forbidden), false, `must not contain ${forbidden}`));
});

test('8. the binding adds no gesture vocabulary and no selection step', async () => {
  const files = [
    'src/lib/arInteraction/native/installJorjinGestureBridge.js',
    'src/components/native/NativeGestureBridge.jsx',
  ];
  for (const file of files) {
    const code = stripComments(await read(file));
    [
      /\bSELECT\b/, /\bHALT\b/, /\bPUSH\b/, /\bPULL\b/, /\bUP\b/, /\bDOWN\b/,
      /\bfocus/i, /\bhighlight/i, /\bconfirm/i, /\bcursor/i, /\bcooldown/i, /\bdebounce/i,
    ].forEach((forbidden) => {
      assert.equal(forbidden.test(code), false, `${file} must not match ${forbidden}`);
    });
  }
});

test('8. the binding installs no global gesture API', () => {
  const stop = installJorjinGestureBridge();
  ['performGesture', 'swipeLeft', 'swipeRight', 'dispatchARGesture', 'arGesture', 'CIBAR']
    .forEach((name) => assert.equal(name in globalThis, false, `${name} must not be a global`));
  stop();
});

test('8. stopping the binding stops it', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));

  const stop = installJorjinGestureBridge();
  wave('RIGHT');
  stop();
  wave('RIGHT');

  assert.deepEqual(ran, ['action'], 'a stopped binding hears nothing');
  screen.unmount();
});

test('8. unmounting the mount stops it, and remounting does not double it', () => {
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));

  const first = mountBridge();
  first.unmount();
  wave('LEFT');
  assert.deepEqual(ran, [], 'an unmounted binding hears nothing');

  const second = mountBridge();
  wave('RIGHT');
  assert.deepEqual(ran, ['right'], 'and a remounted one hears each wave exactly once');
  second.unmount();
  screen.unmount();
});

// --- reading the rendered tutorial ------------------------------------------

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

// Which of the tutorial's two steps is live right now, and what its
// completion line says. The tutorial shows both steps at once and marks the
// one the player is on, so "the wave landed" reads off the active side rather
// than off a single swapped-out sentence.
function activeStepOf(tree) {
  const step = walk(tree).find((n) => typeof n.props?.className === 'string'
    && n.props.className.split(' ').includes('gesture-tutorial-step')
    && n.props.className.includes('is-active'));
  if (!step) return null;
  return step.props.className.includes('gesture-tutorial-step-left') ? 'left' : 'right';
}

function completionOf(tree) {
  const node = walk(tree).find((n) => typeof n.props?.className === 'string'
    && n.props.className.split(' ').includes('gesture-tutorial-status'));
  return textOf(node);
}
