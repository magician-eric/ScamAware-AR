// The ToF module's own gesture engine, reported as the glasses' arrow keys.
//
// The vendor's gesture app swipes reliably on the same glasses, phone and
// lighting where this app did not, and the difference was not the sensor:
// the module recognises the swipe itself and presses Left / Right Arrow on a
// USB keyboard interface, and nothing in CIBAR was listening on that channel.
// These cases pin the channel end to end - a real `keydown` on the window the
// Android WebView delivers to, through the merged native stream, into the
// Bridge and the tutorial - and pin just as hard what it must not become: a
// way for a desktop keyboard to drive the story, or a second delivery of a
// swipe the depth-frame recogniser already reported.
//
//   module engine -> HID Left/Right Arrow -> WebView -> window 'keydown'
//     -> glassesKeyGestures -> subscribeNativeGestures (merged with
//        'jorjinGesture') -> installJorjinGestureBridge / GestureTutorial
//
// Run: npm run test:glasses-key-gestures
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

// --- environment -------------------------------------------------------------

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
  AR_GESTURES,
  resetARGestureBridge,
  resetARInteractionContract,
  subscribeARGestureDispatch,
  useARInteraction,
} = await import('../src/lib/arInteraction/index.js');
const {
  CROSS_CHANNEL_WINDOW_MS,
  JORJIN_GESTURE_EVENT,
  NATIVE_GESTURE_SOURCE,
  resetNativeGestureStream,
  subscribeNativeGestures,
} = await import('../src/lib/arInteraction/native/jorjinGestureAdapter.js');
const {
  GLASSES_KEY_EVENT,
  GLASSES_KEY_SOURCE,
  isInsideGlassesShell,
  readGlassesKeyEvent,
} = await import('../src/lib/arInteraction/native/glassesKeyGestures.js');
const { startARGestureKeyboardAdapter } = await import('../src/lib/arInteraction/debug/keyboardGestureAdapter.js');
const { NativeGestureBridge } = await import('../src/components/native/NativeGestureBridge.jsx');
const { GestureTutorial } = await import('../src/pages/gestureTutorial/GestureTutorial.jsx');
const { getGestureTutorialStrings } = await import('../src/pages/gestureTutorial/i18n.js');
const { resetLocation, resetNavigations, setLocation } = await import('./stubs/react-router-dom.mjs');

const { LEFT, RIGHT } = AR_GESTURES;
const STORY_PATH = '/scenario01-investment/feed';
const TUTORIAL_PATH = '/gesture-tutorial';

// What Android publishes into the page (ShellBridgeScript.java). Only its
// presence matters here.
const SHELL = Object.freeze({ version: 1, shellVersion: '1.2.0' });

// A window of its own, with a clock of its own, for the cases about timing.
class FakeWindow extends EventTarget {}
function fakeWindow({ shell = true } = {}) {
  const target = new FakeWindow();
  if (shell) target.__cibarShell = SHELL;
  let clock = 10_000;
  return { target, now: () => clock, advance: (ms) => { clock += ms; } };
}

// The glasses' module pressing a key: exactly what the WebView dispatches.
function press(target, key, extra = {}) {
  const event = Object.assign(new Event(GLASSES_KEY_EVENT, { cancelable: true }), { key, ...extra });
  target.dispatchEvent(event);
  return event;
}

// Android's depth-frame recogniser delivering a gesture (GestureBridgeScript).
let deliveries = 0;
function wave(target, code) {
  deliveries += 1;
  target.dispatchEvent(new CustomEvent(JORJIN_GESTURE_EVENT, {
    detail: { gesture: code, label: code, count: deliveries, at: deliveries * 1000 },
  }));
}

function listen(options) {
  const heard = [];
  const stop = subscribeNativeGestures((reading) => heard.push(reading), options);
  return { heard, stop };
}

const surface = (declaration) => function TestSurface() {
  useARInteraction(declaration);
  return null;
};

function mountBridge(pathname = STORY_PATH) {
  setLocation(pathname);
  return mountSurface(NativeGestureBridge);
}

test.beforeEach(() => {
  resetARInteractionContract();
  resetARGestureBridge();
  resetNavigations();
  resetLocation();
  resetNativeGestureStream(window);
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  delete globalThis.__cibarShell;
  delete globalThis.__jorjinGestureBridge;
  deliveries = 0;
});

// =============================================================================
// 1. Reading the module's keys
// =============================================================================

test('1. outside the glasses app an arrow key is not a gesture, and is left alone', () => {
  const { target } = fakeWindow({ shell: false });
  const { heard, stop } = listen({ target });

  const left = press(target, 'ArrowLeft');
  const right = press(target, 'ArrowRight');

  assert.deepEqual(heard, [], 'a desktop keyboard must drive nothing');
  assert.equal(left.defaultPrevented, false, 'and the browser keeps its own arrow keys');
  assert.equal(right.defaultPrevented, false);
  stop();
});

test('1. inside the glasses app the module\'s ArrowLeft / ArrowRight are LEFT / RIGHT', () => {
  const { target, advance, now } = fakeWindow();
  const { heard, stop } = listen({ target, now });

  const left = press(target, 'ArrowLeft');
  advance(1500);
  const right = press(target, 'ArrowRight');

  assert.deepEqual(heard.map((r) => r.gesture), [LEFT, RIGHT]);
  assert.ok(heard.every((r) => r.source === GLASSES_KEY_SOURCE), 'tagged with the key channel');
  assert.ok(heard.every((r) => typeof r.eventId === 'string' && r.eventId.startsWith(`${GLASSES_KEY_SOURCE}:`)));
  assert.notEqual(heard[0].eventId, heard[1].eventId, 'each press is its own event');
  assert.equal(left.defaultPrevented, true, 'an arrow left to the WebView would scroll the page');
  assert.equal(right.defaultPrevented, true);
  stop();
});

test('1. either marker Android publishes is enough', () => {
  const bridgeOnly = new FakeWindow();
  bridgeOnly.__jorjinGestureBridge = { version: 1 };
  assert.equal(isInsideGlassesShell(bridgeOnly), true);
  const shellOnly = new FakeWindow();
  shellOnly.__cibarShell = SHELL;
  assert.equal(isInsideGlassesShell(shellOnly), true);
  assert.equal(isInsideGlassesShell(new FakeWindow()), false);
  assert.equal(isInsideGlassesShell(null), false);
});

test('1. the module\'s keys for gestures CIBAR does not speak are swallowed, not delivered', () => {
  const { target, now } = fakeWindow();
  const { heard, stop } = listen({ target, now });

  const swallowed = ['ArrowUp', 'ArrowDown', 'Enter'].map((key) => press(target, key));
  const untouched = ['a', 'Escape', 'Tab', ' '].map((key) => press(target, key));

  assert.deepEqual(heard, [], 'UP / DOWN / PUSH are not words CIBAR speaks');
  assert.ok(swallowed.every((event) => event.defaultPrevented), 'and must not scroll or press anything');
  assert.ok(untouched.every((event) => !event.defaultPrevented), 'keys the module never presses are left alone');
  stop();
});

test('1. an auto-repeat is one press; typing in a field is typing', () => {
  const { target, now } = fakeWindow();
  const { heard, stop } = listen({ target, now });

  const repeat = press(target, 'ArrowLeft', { repeat: true });
  assert.deepEqual(heard, []);
  assert.equal(repeat.defaultPrevented, true);
  stop();

  // The event's own target is what is read; nothing is looked up.
  const scope = { __cibarShell: SHELL };
  const field = { key: 'ArrowLeft', target: { tagName: 'INPUT' } };
  const editable = { key: 'ArrowRight', target: { isContentEditable: true } };
  assert.equal(readGlassesKeyEvent(field, scope), null, 'a software keyboard must keep moving the caret');
  assert.equal(readGlassesKeyEvent(editable, scope), null);
  assert.deepEqual(readGlassesKeyEvent({ key: 'ArrowRight', target: {} }, scope), { gesture: RIGHT });
});

test('1. the shell is read when the key arrives, not when the listener was installed', () => {
  const { target, now } = fakeWindow({ shell: false });
  const { heard, stop } = listen({ target, now });

  press(target, 'ArrowLeft');
  assert.deepEqual(heard, [], 'before Android publishes the shell, a key is just a key');

  target.__cibarShell = SHELL; // what onPageFinished does, after the app mounted
  press(target, 'ArrowLeft');
  assert.deepEqual(heard.map((r) => r.gesture), [LEFT]);
  stop();
});

// =============================================================================
// 2. One swipe, two channels, one delivery
// =============================================================================

test('2. before any key, jorjinGesture is delivered exactly as before', () => {
  const { target, now, advance } = fakeWindow();
  const { heard, stop } = listen({ target, now });

  wave(target, 'LEFT');
  advance(200);
  wave(target, 'RIGHT');

  assert.deepEqual(heard.map((r) => [r.gesture, r.source]), [[LEFT, NATIVE_GESTURE_SOURCE], [RIGHT, NATIVE_GESTURE_SOURCE]]);
  stop();
});

test('2. the depth recogniser first, then the module\'s key for the same swipe: one delivery', () => {
  const { target, now, advance } = fakeWindow();
  const { heard, stop } = listen({ target, now });

  wave(target, 'RIGHT');
  advance(CROSS_CHANNEL_WINDOW_MS - 1);
  const key = press(target, 'ArrowRight');

  assert.deepEqual(heard.map((r) => r.gesture), [RIGHT], 'one swipe must not turn two pages');
  assert.equal(key.defaultPrevented, true, 'the dropped key is still not left to scroll the page');
  stop();
});

test('2. the module\'s key first, then the depth recogniser: one delivery', () => {
  const { target, now, advance } = fakeWindow();
  const { heard, stop } = listen({ target, now });

  press(target, 'ArrowLeft');
  advance(100);
  wave(target, 'LEFT');

  assert.deepEqual(heard.map((r) => [r.gesture, r.source]), [[LEFT, GLASSES_KEY_SOURCE]]);
  stop();
});

test('2. once the module has pressed a key, jorjinGesture is no longer delivered', () => {
  const { target, now, advance } = fakeWindow();
  const { heard, stop } = listen({ target, now });

  press(target, 'ArrowRight');
  advance(60_000);
  wave(target, 'LEFT');
  wave(target, 'RIGHT');
  advance(2_000);
  press(target, 'ArrowLeft');

  assert.deepEqual(heard.map((r) => [r.gesture, r.source]), [
    [RIGHT, GLASSES_KEY_SOURCE],
    [LEFT, GLASSES_KEY_SOURCE],
  ], 'the module\'s engine is in charge; the depth recogniser\'s guesses are not passed on');
  stop();
});

test('2. a depth gesture well clear of the first key swipe is its own swipe', () => {
  const { target, now, advance } = fakeWindow();
  const { heard, stop } = listen({ target, now });

  wave(target, 'LEFT');
  advance(CROSS_CHANNEL_WINDOW_MS + 1);
  press(target, 'ArrowRight');

  assert.deepEqual(heard.map((r) => r.gesture), [LEFT, RIGHT]);
  stop();
});

test('2. consecutive key swipes are each delivered', () => {
  const { target, now, advance } = fakeWindow();
  const { heard, stop } = listen({ target, now });

  press(target, 'ArrowRight');
  advance(400);
  press(target, 'ArrowRight');
  advance(400);
  press(target, 'ArrowLeft');

  assert.deepEqual(heard.map((r) => r.gesture), [RIGHT, RIGHT, LEFT]);
  stop();
});

test('2. every subscriber hears the same decision', () => {
  const { target, now, advance } = fakeWindow();
  const a = listen({ target, now });
  const b = listen({ target, now });

  wave(target, 'RIGHT');
  advance(50);
  press(target, 'ArrowRight');

  assert.deepEqual(a.heard.map((r) => r.gesture), [RIGHT]);
  assert.deepEqual(b.heard.map((r) => r.gesture), [RIGHT], 'the second subscriber is not a second chance');
  a.stop();
  b.stop();
});

test('2. one subscriber throwing does not take the gesture from another', () => {
  const { target, now } = fakeWindow();
  const reported = [];
  const previous = globalThis.reportError;
  globalThis.reportError = (error) => reported.push(error);
  try {
    const stopThrowing = subscribeNativeGestures(() => { throw new Error('consumer bug'); }, { target, now });
    const { heard, stop } = listen({ target, now });
    press(target, 'ArrowLeft');
    assert.deepEqual(heard.map((r) => r.gesture), [LEFT]);
    assert.equal(reported.length, 1);
    stopThrowing();
    stop();
  } finally {
    if (previous === undefined) delete globalThis.reportError;
    else globalThis.reportError = previous;
  }
});

test('2. stopping the last subscription removes both listeners', () => {
  const { target, now } = fakeWindow();
  const { heard, stop } = listen({ target, now });
  stop();
  stop(); // idempotent

  const key = press(target, 'ArrowLeft');
  wave(target, 'RIGHT');
  assert.deepEqual(heard, []);
  assert.equal(key.defaultPrevented, false, 'with nobody listening the key is not swallowed either');

  const again = listen({ target, now });
  press(target, 'ArrowLeft');
  assert.deepEqual(again.heard.map((r) => r.gesture), [LEFT], 'and a later subscription hears it again');
  again.stop();
});

test('2. the DEV keyboard adapter steps aside inside the glasses app', () => {
  const { target } = fakeWindow();
  const dispatched = [];
  const stopTap = subscribeARGestureDispatch((event) => { if (event.phase === 'dispatched') dispatched.push(event); });
  const stop = startARGestureKeyboardAdapter({ target, enabled: true });
  press(target, 'ArrowLeft');
  assert.deepEqual(dispatched, [], 'the module\'s press is delivered by the native stream, once');
  stop();
  stopTap();
});

// =============================================================================
// 3. End to end: the module's key -> the Bridge / the tutorial
// =============================================================================

test('3. TWO_ACTION: the module\'s keys run the left and the right action', () => {
  globalThis.__cibarShell = SHELL;
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));
  const bridge = mountBridge();

  press(window, 'ArrowLeft');
  press(window, 'ArrowRight');

  assert.deepEqual(ran, ['left', 'right']);
  bridge.unmount();
  screen.unmount();
});

test('3. SINGLE_ACTION: the module\'s RIGHT runs it, its LEFT does nothing', () => {
  globalThis.__cibarShell = SHELL;
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));
  const bridge = mountBridge();

  press(window, 'ArrowLeft');
  assert.deepEqual(ran, []);
  press(window, 'ArrowRight');
  assert.deepEqual(ran, ['action']);
  bridge.unmount();
  screen.unmount();
});

test('3. a swipe both channels saw runs the action once', () => {
  globalThis.__cibarShell = SHELL;
  const ran = [];
  const screen = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));
  const bridge = mountBridge();

  wave(window, 'RIGHT');
  press(window, 'ArrowRight');

  assert.deepEqual(ran, ['action'], 'the page must turn once');
  bridge.unmount();
  screen.unmount();
});

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

function completionOf(tree) {
  const node = walk(tree).find((n) => typeof n.props?.className === 'string'
    && n.props.className.split(' ').includes('gesture-tutorial-status'));
  return textOf(node);
}

test('3. the gesture tutorial completes on the module\'s two keys', () => {
  globalThis.__cibarShell = SHELL;
  localStorage.setItem('language', 'zh');
  const strings = getGestureTutorialStrings();
  const tutorial = mountSurface(GestureTutorial);
  const bridge = mountBridge(TUTORIAL_PATH);

  press(window, 'ArrowRight');
  assert.notEqual(completionOf(tutorial.output), strings.complete, 'RIGHT first is still the wrong step');
  press(window, 'ArrowLeft');
  press(window, 'ArrowRight');

  assert.equal(completionOf(tutorial.output), strings.complete);
  bridge.unmount();
  tutorial.unmount();
});

test('3. in a desktop browser the arrow keys cannot pass the tutorial', () => {
  localStorage.setItem('language', 'zh');
  const strings = getGestureTutorialStrings();
  const tutorial = mountSurface(GestureTutorial);
  const bridge = mountBridge(TUTORIAL_PATH);

  press(window, 'ArrowLeft');
  press(window, 'ArrowRight');

  assert.notEqual(completionOf(tutorial.output), strings.complete);
  bridge.unmount();
  tutorial.unmount();
});

// =============================================================================
// 4. What the key channel must never become
// =============================================================================

test('4. only glassesKeyGestures.js names the key event in the native layer', async () => {
  const dir = new URL('../src/lib/arInteraction/native/', import.meta.url);
  const naming = [];
  for (const name of (await readdir(dir)).filter((n) => /\.jsx?$/.test(n)).sort()) {
    const code = stripComments(await read(`src/lib/arInteraction/native/${name}`));
    if (/['"]keydown['"]|['"]keyup['"]|['"]keypress['"]/.test(code)) naming.push(name);
  }
  assert.deepEqual(naming, ['glassesKeyGestures.js']);
});

test('4. the key reader translates; it does not synthesise, click or look anything up', async () => {
  const code = stripComments(await read('src/lib/arInteraction/native/glassesKeyGestures.js'));
  [
    'dispatchEvent', 'KeyboardEvent', 'new Event', '.click(', 'querySelector', 'document.',
    'setTimeout', 'setInterval', 'dispatchARGesture', 'addEventListener',
  ].forEach((forbidden) => {
    assert.equal(code.includes(forbidden), false, `glassesKeyGestures.js must not contain ${forbidden}`);
  });
  // Two gesture words and no third.
  ['SELECT', 'HALT', 'PUSH', 'PULL', 'PRESENCE', "'UP'", "'DOWN'"].forEach((forbidden) => {
    assert.equal(code.includes(forbidden), false, `glassesKeyGestures.js must not know ${forbidden}`);
  });
});
