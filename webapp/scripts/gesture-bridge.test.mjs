// AR Gesture Bridge suite - src/lib/arInteraction/gestureBridge.js (Phase 3).
//
// The question this suite answers is narrow and it is the whole of Phase 3:
// when something outside CIBAR says "the player waved LEFT", does exactly one
// semantic action run on exactly the screen that is on right now - and in
// every case where it must not run, does the Bridge say so instead of doing
// something?
//
// There is no gesture recognition anywhere in here and none is required.
// Every case below hands the Bridge a semantic LEFT or RIGHT that is treated
// as already recognised, which is precisely the input a hand-tracking adapter
// will hand it later.
//
// How this differs from the AR suites that already exist, none of which it
// duplicates:
//
//   audit:ar-interactions          - what interaction risk exists in source
//   test:ar-interactions           - the audit's own regression guard
//   test:gesture-contract          - the contract engine's correctness
//   test:ar-interaction-migration  - are the five Scenarios fully wired
//   test:gesture-bridge            - THIS: one event in, at most one action out
//
// The last third of the file drives *production* screens - one per scenario
// plus the three shared surfaces - through the Bridge rather than through a
// hand-written stub, because a Bridge that only ever meets test doubles has
// not been shown to drive CIBAR.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test, { mock } from 'node:test';

import { mountSurface } from './ar-surface-harness.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// Drops `//` and block comments, so the source scans below read code only:
// this layer's whole point is documented in prose that names the things it
// must never do, and that prose is not code.
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

// lib/lang.js reads the player's language out of localStorage and the
// scenario stores keep run state there; the BlackPi screens subscribe to
// window events. Same shims the other two AR suites install, plus a real
// EventTarget behind `window` so the keyboard adapter can be exercised for
// real instead of through a hand-rolled fake.
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

const {
  AR_GESTURE,
  AR_GESTURES,
  AR_GESTURE_OUTCOMES,
  AR_GESTURE_REJECTIONS,
  dispatchARGesture,
  getARGestureSnapshot,
  getCurrentARInteraction,
  resetARGestureBridge,
  resetARInteractionContract,
  subscribeARGestureDispatch,
  useARInteraction,
} = await import('../src/lib/arInteraction/index.js');

const {
  isARGestureDebugEnabled,
} = await import('../src/lib/arInteraction/debug/gestureDebugFlag.js');
const {
  resetARGestureKeyboardAdapter,
  startARGestureKeyboardAdapter,
} = await import('../src/lib/arInteraction/debug/keyboardGestureAdapter.js');

const { navigations, resetNavigations } = await import('./stubs/react-router-dom.mjs');

const { LEFT, RIGHT } = AR_GESTURES;
const R = AR_GESTURE_REJECTIONS;

// A bare screen that declares nothing but a contract, for the rules that must
// hold regardless of any scenario's story.
const surface = (declaration) => function TestSurface() {
  useARInteraction(typeof declaration === 'function' ? declaration() : declaration);
  return null;
};

// Unique per dispatch unless a case is deliberately reusing an id.
let ids = 0;
const nextId = () => `evt-${(ids += 1)}`;

test.beforeEach(() => {
  resetARInteractionContract();
  resetARGestureBridge();
  resetARGestureKeyboardAdapter();
  resetNavigations();
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// 1. The vocabulary is exactly two words
// ---------------------------------------------------------------------------
test('1. anything that is not a canonical LEFT/RIGHT is rejected as invalid', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));

  // Every dialect a native bridge or an SDK might speak. Converting these is
  // an adapter's job at the edge; the core accepts one spelling only.
  const notGestures = [
    'LEFT', 'Left', 'RIGHT', 'Right', 'swipeLeft', 'swipe_right', 'gesture_left',
    'up', 'down', 'tap', 'select', 'scroll', '', ' left', 'left ',
    0, 1, -1, null, undefined, true, {}, [], () => {},
  ];
  notGestures.forEach((gesture) => {
    const result = dispatchARGesture({ gesture, eventId: nextId() });
    assert.equal(result.accepted, false, `${JSON.stringify(String(gesture))} must not be accepted`);
    assert.equal(result.reason, R.INVALID_GESTURE);
    assert.equal(result.gesture, null);
  });
  assert.deepEqual(ran, [], 'no handler may run for a word outside the vocabulary');
  mounted.unmount();
});

test('1. the canonical vocabulary is the contract\'s own, not a second copy', () => {
  assert.equal(AR_GESTURE, AR_GESTURES, 'AR_GESTURE must be the same frozen object, not a parallel enum');
  assert.deepEqual({ ...AR_GESTURES }, { LEFT: 'left', RIGHT: 'right' });
  assert.ok(Object.isFrozen(AR_GESTURES));
});

test('1. a bare canonical gesture and a request object are the same dispatch', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));

  assert.equal(dispatchARGesture(LEFT).accepted, true);
  assert.equal(dispatchARGesture({ gesture: RIGHT }).accepted, true);
  assert.deepEqual(ran, ['left', 'right']);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 2 & 20. Nothing is registered
// ---------------------------------------------------------------------------
test('2. with no active interaction a gesture is rejected, not run', () => {
  const result = dispatchARGesture({ gesture: RIGHT, eventId: nextId() });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, R.NO_ACTIVE_INTERACTION);
  assert.equal(result.surfaceId, null);
});

test('20. dispatching with no contract at all never throws', () => {
  // Including the shapes an adapter could get wrong on its very first call.
  [undefined, null, {}, 'left', { gesture: LEFT }, { gesture: RIGHT, eventId: 'x' }].forEach((input) => {
    assert.doesNotThrow(() => dispatchARGesture(input));
  });
  assert.equal(getARGestureSnapshot().active, false);
});

// ---------------------------------------------------------------------------
// 3 & 4. display - a gesture must do nothing at all
// ---------------------------------------------------------------------------
test('3/4. a display surface rejects LEFT and RIGHT and advances nothing', () => {
  // The regression this pins is scenario 03's old "tap the screen to skip to
  // the next line of audio". A display surface means the player is watching,
  // and a gesture must not tap, advance, skip or continue anything.
  const mounted = mountSurface(surface({ mode: 'display', surfaceId: 'test/display' }));

  const left = dispatchARGesture({ gesture: LEFT, eventId: nextId() });
  const right = dispatchARGesture({ gesture: RIGHT, eventId: nextId() });
  assert.equal(left.accepted, false);
  assert.equal(left.reason, R.DIRECTION_UNAVAILABLE);
  assert.equal(right.accepted, false);
  assert.equal(right.reason, R.DIRECTION_UNAVAILABLE);
  assert.equal(left.mode, 'display');
  assert.deepEqual(navigations, [], 'a display surface must not navigate');
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 5 & 6. single - RIGHT is the one action, LEFT does not exist
// ---------------------------------------------------------------------------
test('5. single + LEFT is rejected and runs nothing - that is normal, not an error', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));

  const result = dispatchARGesture({ gesture: LEFT, eventId: nextId() });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, R.DIRECTION_UNAVAILABLE);
  assert.deepEqual(ran, []);
  mounted.unmount();
});

test('6. single + RIGHT runs the one action exactly once', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));

  const result = dispatchARGesture({ gesture: RIGHT, eventId: 'one-wave' });
  assert.equal(result.accepted, true);
  assert.equal(result.reason, null);
  assert.equal(result.gesture, RIGHT);
  assert.equal(result.surfaceId, 'test/single');
  assert.equal(result.mode, 'single');
  assert.deepEqual(ran, ['action']);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 7 & 8. dual - LEFT is the first action, RIGHT the second
// ---------------------------------------------------------------------------
test('7/8. dual maps LEFT to the left handler and RIGHT to the right handler', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));

  assert.equal(dispatchARGesture({ gesture: LEFT, eventId: nextId() }).accepted, true);
  assert.deepEqual(ran, ['left']);
  assert.equal(dispatchARGesture({ gesture: RIGHT, eventId: nextId() }).accepted, true);
  assert.deepEqual(ran, ['left', 'right']);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 9 & 10. One event runs one action
// ---------------------------------------------------------------------------
test('9/10. the same eventId is rejected the second time and its handler does not run again', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));

  const first = dispatchARGesture({ gesture: RIGHT, eventId: 'wave-1' });
  assert.equal(first.accepted, true);
  assert.deepEqual(ran, ['action']);

  // The same wave delivered again - three more frames of it.
  for (let i = 0; i < 3; i += 1) {
    const repeat = dispatchARGesture({ gesture: RIGHT, eventId: 'wave-1' });
    assert.equal(repeat.accepted, false);
    assert.equal(repeat.reason, R.DUPLICATE_EVENT);
  }
  assert.deepEqual(ran, ['action'], 'one event must run one action');
  mounted.unmount();
});

test('9. a duplicate id is refused even when the other direction is asked for', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));

  assert.equal(dispatchARGesture({ gesture: LEFT, eventId: 'wave-1' }).accepted, true);
  const rebranded = dispatchARGesture({ gesture: RIGHT, eventId: 'wave-1' });
  assert.equal(rebranded.accepted, false);
  assert.equal(rebranded.reason, R.DUPLICATE_EVENT);
  assert.deepEqual(ran, ['left']);
  mounted.unmount();
});

test('9. omitting the eventId opts duplicate protection out rather than faking it', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));

  // Two calls with no id are two events, and the result says which id each
  // one was given, so a caller can never mistake this for de-duplication.
  const a = dispatchARGesture({ gesture: LEFT });
  const b = dispatchARGesture({ gesture: LEFT });
  assert.equal(a.accepted, true);
  assert.equal(b.accepted, true);
  assert.notEqual(a.eventId, b.eventId);
  assert.deepEqual(ran, ['left', 'left']);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 11, 12 & 15. Stale gestures
// ---------------------------------------------------------------------------
test('11. an event recognised against an older revision is rejected as stale', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));

  const { revision } = getARGestureSnapshot();
  const fresh = dispatchARGesture({ gesture: LEFT, eventId: nextId(), expectedRevision: revision });
  assert.equal(fresh.accepted, true);

  const stale = dispatchARGesture({ gesture: LEFT, eventId: nextId(), expectedRevision: revision - 1 });
  assert.equal(stale.accepted, false);
  assert.equal(stale.reason, R.STALE_INTERACTION);
  assert.deepEqual(ran, ['left']);
  mounted.unmount();
});

test('12/15. a gesture recognised on page A never lands on page B', () => {
  const ran = [];
  const pageA = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/page-a',
    left: () => ran.push('A.left'), right: () => ran.push('A.right'),
  }));
  const seenOnA = getARGestureSnapshot();
  assert.equal(seenOnA.mode, 'dual');

  // The player walks off page A before the event is dispatched.
  pageA.unmount();
  const pageB = mountSurface(surface({
    mode: 'single', surfaceId: 'test/page-b', action: () => ran.push('B.action'),
  }));
  const onB = getARGestureSnapshot();
  assert.equal(onB.mode, 'single');
  assert.notEqual(onB.revision, seenOnA.revision);

  const late = dispatchARGesture({
    gesture: RIGHT, eventId: nextId(), expectedRevision: seenOnA.revision,
  });
  assert.equal(late.accepted, false);
  assert.equal(late.reason, R.STALE_INTERACTION);
  assert.deepEqual(ran, [], 'the late event must reach neither page A nor page B');

  // And page B is perfectly usable by a gesture recognised on page B.
  assert.equal(dispatchARGesture({
    gesture: RIGHT, eventId: nextId(), expectedRevision: onB.revision,
  }).accepted, true);
  assert.deepEqual(ran, ['B.action']);
  pageB.unmount();
});

test('12. a handler that navigates makes the events queued behind it stale', () => {
  // The race the Bridge exists to survive: RIGHT is accepted, its handler
  // changes the screen, and the next frame of the same wave arrives with the
  // revision it was recognised against.
  const ran = [];
  let stage = 'a';
  const Screen = function Screen() {
    useARInteraction(stage === 'a'
      ? { mode: 'dual', surfaceId: 'test/stage-a', left: () => ran.push('A.left'), right: () => { ran.push('A.right'); stage = 'b'; } }
      : { mode: 'dual', surfaceId: 'test/stage-b', left: () => ran.push('B.left'), right: () => ran.push('B.right') });
    return null;
  };
  const mounted = mountSurface(Screen);

  const before = getARGestureSnapshot();
  assert.equal(dispatchARGesture({
    gesture: RIGHT, eventId: 'wave-1', expectedRevision: before.revision,
  }).accepted, true);
  assert.deepEqual(ran, ['A.right']);

  // The identical event again: refused on identity alone, before revision is
  // even consulted.
  assert.equal(dispatchARGesture({
    gesture: RIGHT, eventId: 'wave-1', expectedRevision: before.revision,
  }).reason, R.DUPLICATE_EVENT);

  // A different frame of the same wave, stamped with the revision it saw.
  mounted.rerender();
  assert.equal(dispatchARGesture({
    gesture: RIGHT, eventId: 'wave-1-frame-2', expectedRevision: before.revision,
  }).reason, R.STALE_INTERACTION);

  assert.deepEqual(ran, ['A.right'], 'neither the old handler nor the new one may run a second time');
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 13 & 14. Disabled - the UI is off, so the gesture is off
// ---------------------------------------------------------------------------
test('13/14. a disabled surface rejects both directions, and says it is disabled', () => {
  const ran = [];
  let disabled = false;
  const mounted = mountSurface(surface(() => ({
    mode: 'dual', surfaceId: 'test/dual', disabled,
    left: () => ran.push('left'), right: () => ran.push('right'),
  })));

  assert.equal(dispatchARGesture({ gesture: LEFT, eventId: nextId() }).accepted, true);
  ran.length = 0;

  disabled = true;
  mounted.rerender();

  const left = dispatchARGesture({ gesture: LEFT, eventId: nextId() });
  const right = dispatchARGesture({ gesture: RIGHT, eventId: nextId() });
  assert.equal(left.accepted, false);
  assert.equal(left.reason, R.DISABLED, 'a declared-but-switched-off side is disabled, not absent');
  assert.equal(right.accepted, false);
  assert.equal(right.reason, R.DISABLED);
  assert.deepEqual(ran, []);
  mounted.unmount();
});

test('13/14. the Bridge cannot reach a handler the contract has withdrawn', async () => {
  // The Bridge never holds a handler: it reads availability from the
  // contract's snapshot and runs the action through the contract's own entry
  // point, so there is no path by which it could call a disabled action.
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', disabled: true, action: () => ran.push('action'),
  }));

  const snapshot = getARGestureSnapshot();
  assert.equal(snapshot.rightAvailable, false);
  assert.equal(snapshot.mode, 'display', 'an all-unavailable surface collapses to display');
  assert.equal(snapshot.declaredMode, 'single');
  assert.equal(dispatchARGesture({ gesture: RIGHT, eventId: nextId() }).reason, R.DISABLED);
  assert.deepEqual(ran, []);

  const source = await read('src/lib/arInteraction/gestureBridge.js');
  assert.ok(!/\.left\s*\(|\.right\s*\(|\.action\s*\(/.test(source), 'the Bridge must not call a declaration handler itself');
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 16 & 17. Async handlers
// ---------------------------------------------------------------------------
test('16. an async handler is awaited, and the dispatch reports when it settled', async () => {
  const ran = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const mounted = mountSurface(surface({
    mode: 'single',
    surfaceId: 'test/async',
    action: async () => { ran.push('start'); await gate; ran.push('end'); },
  }));

  const settled = [];
  subscribeARGestureDispatch((event) => { if (event.phase === 'settled') settled.push(event); });

  const result = dispatchARGesture({ gesture: RIGHT, eventId: 'async-1' });
  assert.equal(result.accepted, true);
  assert.deepEqual(ran, ['start'], 'the action starts synchronously');
  assert.deepEqual(settled, [], 'it has not settled yet');
  assert.equal(getARGestureSnapshot().busy, true);

  release();
  const outcome = await result.completion;
  assert.equal(outcome.status, AR_GESTURE_OUTCOMES.OK);
  assert.equal(outcome.error, null);
  assert.deepEqual(ran, ['start', 'end']);
  assert.equal(settled.length, 1);
  assert.equal(getARGestureSnapshot().busy, false);
  mounted.unmount();
});

test('16. the same event is not re-run while its async handler is still pending', async () => {
  const ran = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const mounted = mountSurface(surface({
    mode: 'single', surfaceId: 'test/async',
    action: async () => { ran.push('run'); await gate; },
  }));

  const first = dispatchARGesture({ gesture: RIGHT, eventId: 'async-1' });
  assert.equal(first.accepted, true);

  const again = dispatchARGesture({ gesture: RIGHT, eventId: 'async-1' });
  assert.equal(again.accepted, false);
  assert.equal(again.reason, R.DUPLICATE_EVENT, 'an unresolved promise must not reopen the event');

  // And a *different* event arriving mid-flight does not slip past either.
  const other = dispatchARGesture({ gesture: RIGHT, eventId: 'async-2' });
  assert.equal(other.accepted, false);
  assert.equal(other.reason, R.BUSY);

  release();
  await first.completion;
  assert.deepEqual(ran, ['run']);

  // Once it has settled the surface is usable again - this is a lock held by
  // the action, not a cooldown.
  assert.equal(dispatchARGesture({ gesture: RIGHT, eventId: 'async-3' }).accepted, true);
  mounted.unmount();
});

test('17. a rejected async handler is reported, not swallowed and not unhandled', async () => {
  const boom = new Error('handler exploded');
  const mounted = mountSurface(surface({
    mode: 'single', surfaceId: 'test/async-error',
    action: async () => { throw boom; },
  }));

  const seen = [];
  subscribeARGestureDispatch((event) => seen.push(event));

  const result = dispatchARGesture({ gesture: RIGHT, eventId: 'async-err' });
  assert.equal(result.accepted, true, 'the gesture was accepted; it is the action that failed');

  const outcome = await result.completion;
  assert.equal(outcome.status, AR_GESTURE_OUTCOMES.ACTION_ERROR);
  assert.equal(outcome.error, boom, 'the error itself is handed on, not flattened to a string');

  const settled = seen.find((event) => event.phase === 'settled');
  assert.equal(settled.outcome.status, AR_GESTURE_OUTCOMES.ACTION_ERROR);
  assert.equal(getARGestureSnapshot().busy, false, 'a failed action must not leave the Bridge locked');
  mounted.unmount();
});

test('17. a handler that throws synchronously is reported the same way', async () => {
  const boom = new Error('sync explosion');
  const mounted = mountSurface(surface({
    mode: 'single', surfaceId: 'test/sync-error',
    action: () => { throw boom; },
  }));

  const result = dispatchARGesture({ gesture: RIGHT, eventId: 'sync-err' });
  assert.equal(result.accepted, true);
  const outcome = await result.completion;
  assert.equal(outcome.status, AR_GESTURE_OUTCOMES.ACTION_ERROR);
  assert.equal(outcome.error, boom);
  assert.equal(getARGestureSnapshot().busy, false);

  // The next gesture still works: one broken action does not brick input.
  assert.equal(dispatchARGesture({ gesture: RIGHT, eventId: nextId() }).accepted, true);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 18. The snapshot is the contract, projected - never a second copy
// ---------------------------------------------------------------------------
test('18. getARGestureSnapshot agrees with getCurrentARInteraction at every step', () => {
  const agree = (label) => {
    const contract = getCurrentARInteraction();
    const bridge = getARGestureSnapshot();
    ['active', 'surfaceId', 'mode', 'declaredMode', 'revision', 'leftAvailable', 'rightAvailable']
      .forEach((key) => assert.equal(bridge[key], contract[key], `${label}: ${key} disagrees`));
  };

  agree('nothing mounted');
  const display = mountSurface(surface({ mode: 'display', surfaceId: 'test/display' }));
  agree('display');
  display.unmount();
  agree('after display unmounted');

  const dual = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual', left: () => {}, right: () => {},
  }));
  agree('dual');
  dispatchARGesture({ gesture: LEFT, eventId: nextId() });
  agree('after a dispatch');
  dual.unmount();
  agree('after unmount');
});

test('18. the snapshot exposes data only - never a handler', () => {
  const mounted = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/snapshot',
    left: function namedLeft() {}, right: function namedRight() {},
  }));
  const snapshot = getARGestureSnapshot();
  assert.deepEqual(
    Object.keys(snapshot).sort(),
    ['active', 'busy', 'declaredMode', 'leftAvailable', 'mode', 'revision', 'rightAvailable', 'surfaceId'],
  );
  Object.values(snapshot).forEach((value) => assert.notEqual(typeof value, 'function'));
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 19. Source metadata is debug data, never a code path
// ---------------------------------------------------------------------------
test('19. every source travels the identical dispatch path', () => {
  const sources = ['test', 'keyboard-debug', 'native', 'sdk', undefined, ''];

  sources.forEach((source) => {
    // Same rejection for every source: a display surface refuses them all.
    const display = mountSurface(surface({ mode: 'display', surfaceId: 'test/display' }));
    const rejected = dispatchARGesture({ gesture: RIGHT, eventId: nextId(), source });
    assert.equal(rejected.accepted, false, `source ${String(source)} must not bypass a display surface`);
    assert.equal(rejected.reason, R.DIRECTION_UNAVAILABLE);
    display.unmount();

    // Same acceptance for every source, and no source runs an action twice.
    const ran = [];
    const single = mountSurface(surface({
      mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
    }));
    const id = nextId();
    assert.equal(dispatchARGesture({ gesture: RIGHT, eventId: id, source }).accepted, true);
    assert.equal(dispatchARGesture({ gesture: RIGHT, eventId: id, source }).reason, R.DUPLICATE_EVENT);
    assert.deepEqual(ran, ['action'], `source ${String(source)} must not bypass the duplicate guard`);
    single.unmount();
  });
});

test('19. `source` is echoed for telemetry and is read nowhere else', async () => {
  const mounted = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => {},
  }));
  const result = dispatchARGesture({ gesture: RIGHT, eventId: nextId(), source: 'native' });
  assert.equal(result.source, 'native');
  mounted.unmount();

  // Structural proof rather than a sampling of values: nothing in the Bridge
  // branches on the source at all.
  const code = stripComments(await read('src/lib/arInteraction/gestureBridge.js'));
  assert.ok(code.includes('source'), 'the source is carried through');
  // No branch on a source name can exist if no source name exists in the file.
  assert.equal(/(['"])(native|sdk|keyboard[\w-]*|debug|test)\1/.test(code), false,
    'the Bridge must not name a gesture source');
});

// ---------------------------------------------------------------------------
// Dispatch events - what the DEV overlay and a future telemetry sink read
// ---------------------------------------------------------------------------
test('every dispatch is observable, and a listener cannot change the outcome', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));

  const seen = [];
  const stop = subscribeARGestureDispatch((event) => {
    seen.push(`${event.phase}:${event.accepted ? 'accepted' : event.reason}`);
    throw new Error('a broken listener must not break the dispatch');
  });

  assert.equal(dispatchARGesture({ gesture: LEFT, eventId: nextId() }).accepted, false);
  assert.equal(dispatchARGesture({ gesture: RIGHT, eventId: nextId() }).accepted, true);
  assert.deepEqual(seen, [
    'dispatched:direction-unavailable',
    'dispatched:accepted',
    'settled:accepted',
  ]);
  assert.deepEqual(ran, ['action']);

  stop();
  dispatchARGesture({ gesture: RIGHT, eventId: nextId() });
  assert.equal(seen.length, 3, 'unsubscribing stops delivery');
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// The debug flag and the DEV keyboard adapter
// ---------------------------------------------------------------------------
test('debug is off unless the flag is explicitly set to true', () => {
  assert.equal(isARGestureDebugEnabled({}), false, 'unset means off');
  assert.equal(isARGestureDebugEnabled({ VITE_AR_GESTURE_DEBUG: 'false' }), false);
  assert.equal(isARGestureDebugEnabled({ VITE_AR_GESTURE_DEBUG: '' }), false);
  assert.equal(isARGestureDebugEnabled({ VITE_AR_GESTURE_DEBUG: '1' }), false, 'only the string "true" turns it on');
  assert.equal(isARGestureDebugEnabled({ VITE_AR_GESTURE_DEBUG: 'true' }), true);
  assert.equal(isARGestureDebugEnabled(undefined), false, 'no build env at all means off');
  // The default argument is the build env, which carries no such variable in
  // this (production-equivalent) environment.
  assert.equal(isARGestureDebugEnabled(), false);
});

test('a production build never listens to the keyboard', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));

  const target = new EventTarget();
  // No `enabled` override: this is exactly the call the app makes, resolved
  // against the real flag.
  const stop = startARGestureKeyboardAdapter({ target });
  target.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowLeft' }));
  target.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowRight' }));

  assert.deepEqual(ran, [], 'a player pressing an arrow key must advance nothing');
  assert.equal(typeof stop, 'function');
  stop();
  mounted.unmount();
});

test('with debug on, ArrowLeft/ArrowRight drive the Bridge - not the DOM', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));

  const seen = [];
  subscribeARGestureDispatch((event) => { if (event.phase === 'dispatched') seen.push(event); });

  const target = new EventTarget();
  const stop = startARGestureKeyboardAdapter({ target, enabled: true });
  const press = (key, extra = {}) => target.dispatchEvent(Object.assign(new Event('keydown'), { key, ...extra }));

  press('ArrowLeft');
  press('ArrowRight');
  assert.deepEqual(ran, ['left', 'right']);
  assert.deepEqual(seen.map((event) => event.gesture), [LEFT, RIGHT]);
  assert.deepEqual(seen.map((event) => event.source), ['keyboard-debug', 'keyboard-debug']);
  assert.ok(seen.every((event) => typeof event.eventId === 'string' && event.eventId !== ''));
  assert.notEqual(seen[0].eventId, seen[1].eventId, 'each keypress is its own event');

  // No other key is a gesture, and auto-repeat from a held key is one press.
  ran.length = 0;
  ['Enter', ' ', 'a', 'ArrowUp', 'ArrowDown', 'Escape', 'Tab'].forEach((key) => press(key));
  press('ArrowLeft', { repeat: true });
  assert.deepEqual(ran, []);

  stop();
  press('ArrowLeft');
  assert.deepEqual(ran, [], 'stopping the adapter removes the listener');
  mounted.unmount();
});

test('an arrow key pressed inside a text field is typing, not a gesture', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual', surfaceId: 'test/dual',
    left: () => ran.push('left'), right: () => ran.push('right'),
  }));

  // The event's own target is what the adapter reads - it looks nothing up.
  class TextField extends EventTarget { get tagName() { return 'INPUT'; } }
  class Editable extends EventTarget { get isContentEditable() { return true; } }

  [new TextField(), new Editable()].forEach((target) => {
    const stop = startARGestureKeyboardAdapter({ target, enabled: true });
    target.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowLeft' }));
    target.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowRight' }));
    stop();
  });
  assert.deepEqual(ran, []);
  mounted.unmount();
});

test('the keyboard adapter obeys the contract, it does not talk past it', () => {
  // A single surface has no LEFT. ArrowLeft must therefore do nothing at all -
  // if the adapter were clicking a button or picking an element, it could.
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'single', surfaceId: 'test/single', action: () => ran.push('action'),
  }));

  const target = new EventTarget();
  const stop = startARGestureKeyboardAdapter({ target, enabled: true });
  target.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowLeft' }));
  assert.deepEqual(ran, []);
  target.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowRight' }));
  assert.deepEqual(ran, ['action']);
  stop();
  mounted.unmount();
});

test('the DEV overlay renders nothing and starts nothing while the flag is off', async () => {
  const { ARGestureDebugOverlay } = await import('../src/components/debug/ARGestureDebugOverlay.jsx');
  const mounted = mountSurface(ARGestureDebugOverlay, {});
  assert.equal(mounted.output, null, 'the overlay must not exist in a production build');
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// What this layer must never contain
// ---------------------------------------------------------------------------
const GESTURE_LAYER = [
  'src/lib/arInteraction/gestureBridge.js',
  'src/lib/arInteraction/debug/gestureDebugFlag.js',
  'src/lib/arInteraction/debug/keyboardGestureAdapter.js',
];

test('the gesture layer knows nothing about the DOM', async () => {
  for (const file of GESTURE_LAYER) {
    const code = stripComments(await read(file));
    [
      'document.', 'querySelector', 'querySelectorAll', 'getElementById', 'getElementsBy',
      '.click(', 'closest(', 'getBoundingClientRect', 'data-gesture', 'innerHTML',
      'createElement', 'MouseEvent', 'PointerEvent', 'TouchEvent',
    ].forEach((forbidden) => {
      assert.equal(code.includes(forbidden), false, `${file} must not contain ${forbidden}`);
    });
  }
});

test('the gesture layer knows nothing about any scenario', async () => {
  for (const file of GESTURE_LAYER) {
    const code = stripComments(await read(file));
    [
      /scenario\s*0?\d/i, /blackpi/i, /mydondon/i, /meetu/i, /gugo/i, /coin-?winner/i,
      /\bpathname\b/, /useLocation/, /useNavigate/, /\/ar-scan/, /route/i,
      /surfaceId\s*===/, /switch\s*\(/, /startsWith\s*\(\s*['"]\//,
    ].forEach((forbidden) => {
      assert.equal(forbidden.test(code), false, `${file} must not match ${forbidden}`);
    });
  }
});

test('the gesture layer contains no recognition, no camera and no SDK', async () => {
  for (const file of GESTURE_LAYER) {
    const code = stripComments(await read(file)).toLowerCase();
    [
      'mediapipe', 'tensorflow', 'handpose', 'handtracking', 'hand-tracking',
      'getusermedia', 'mediadevices', 'navigator.', 'webxr', 'jorjin', '佐臻',
      'camera', 'video', 'canvas', 'mindar', 'targets.mind', 'javascriptinterface',
    ].forEach((forbidden) => {
      assert.equal(code.includes(forbidden), false, `${file} must not contain ${forbidden}`);
    });
  }
});

test('the Bridge installs no global gesture API and no timer', async () => {
  const code = stripComments(await read('src/lib/arInteraction/gestureBridge.js'));
  [
    'window.', 'globalThis.', 'self.', 'setTimeout', 'setInterval',
    'requestAnimationFrame', 'Date.now', 'performance.now',
  ].forEach((forbidden) => {
    assert.equal(code.includes(forbidden), false, `the Bridge must not contain ${forbidden}`);
  });

  // Nor at runtime: importing it must leave the global object untouched.
  ['performGesture', 'swipeLeft', 'swipeRight', 'dispatchARGesture', 'arGesture', 'CIBAR'].forEach((name) => {
    assert.equal(name in globalThis, false, `${name} must not be a global`);
  });
});

test('the core Bridge is framework-agnostic - React lives only in the debug UI', async () => {
  for (const file of GESTURE_LAYER) {
    const code = stripComments(await read(file));
    const imports = [...code.matchAll(/from '([^']+)'/g)].map((match) => match[1]);
    imports.forEach((specifier) => {
      assert.ok(specifier.startsWith('.'), `${file} must not import ${specifier}`);
    });
    assert.equal(/\breact\b/i.test(code), false, `${file} must not mention React`);
  }
});

test('the app mounts the overlay as a sibling and adds no gesture UI', async () => {
  const app = await read('src/App.jsx');
  assert.ok(app.includes('ARGestureDebugOverlay'), 'the DEV overlay is mounted from App');

  // No gesture affordance anywhere in the production UI: no arrows, no hand
  // icons, no "wave left" copy. Phase 3 changes how the app can be driven,
  // never how it looks.
  const overlay = await read('src/components/debug/ARGestureDebugOverlay.jsx');
  assert.ok(overlay.includes('isARGestureDebugEnabled'), 'the overlay is behind the debug flag');
  assert.ok(overlay.includes("pointerEvents: 'none'"), 'the overlay must never intercept a touch');
  [/左揮/, /右揮/, /請做手勢/, /手勢教學/, /HandIcon/, /gesture-hint/].forEach((forbidden) => {
    assert.equal(forbidden.test(app), false, `App must not contain ${forbidden}`);
  });
});

// ---------------------------------------------------------------------------
// Integration: production surfaces, driven only through the Bridge
// ---------------------------------------------------------------------------
// Everything below dispatches LEFT/RIGHT at real screens. No handler is ever
// called directly, no element is looked up, and no scenario is special-cased
// in the Bridge to make any of it work.
const dispatchOn = (gesture, extra = {}) => dispatchARGesture({
  gesture, eventId: nextId(), expectedRevision: getARGestureSnapshot().revision, ...extra,
});

test('INT scenario01: the LINE assistant\'s two-way choice answers to LEFT and RIGHT', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const { LineTeacher } = await import('../src/pages/scenario01/LineTeacher.jsx');
    const mounted = mountSurface(LineTeacher);

    // The scripted opening plays out before the question appears; while it is
    // playing the screen is `display` and a gesture must do nothing.
    assert.equal(getARGestureSnapshot().surfaceId, 'scenario01/line-teacher');
    assert.equal(dispatchOn(RIGHT).reason, R.DIRECTION_UNAVAILABLE);

    for (let i = 0; i < 20 && getARGestureSnapshot().mode !== 'dual'; i += 1) {
      mock.timers.tick(2500);
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    }

    const snapshot = getARGestureSnapshot();
    assert.equal(snapshot.surfaceId, 'scenario01/line-teacher/need-choice');
    assert.equal(snapshot.mode, 'dual');
    assert.equal(snapshot.leftAvailable, true);
    assert.equal(snapshot.rightAvailable, true);

    assert.equal(dispatchOn(LEFT).accepted, true);
    // Answering ends the question: the same wave arriving again cannot answer
    // it a second time.
    assert.notEqual(getARGestureSnapshot().surfaceId, 'scenario01/line-teacher/need-choice');
    mounted.unmount();
  } finally {
    mock.timers.reset();
  }
});

test('INT scenario02: the deposit warning\'s stop/continue decision is a real dual', async () => {
  const { RedWarning } = await import('../src/pages/scenario02/components/RedWarning.jsx');
  const continued = [];
  const mounted = mountSurface(RedWarning, {
    surfaceId: 'scenario02/deposit-warning',
    title: 'x', body: 'y', primaryLabel: 'stop', secondaryLabel: 'continue',
    onContinue: () => continued.push('continue'),
  });

  const snapshot = getARGestureSnapshot();
  assert.equal(snapshot.surfaceId, 'scenario02/deposit-warning');
  assert.equal(snapshot.mode, 'dual');

  // RIGHT is 我已了解，仍要繼續 - the scam path the screen already offers.
  assert.equal(dispatchOn(RIGHT).accepted, true);
  assert.deepEqual(continued, ['continue']);
  mounted.unmount();

  // LEFT is 停止, which turns the screen into its stopped state - one action.
  const again = mountSurface(RedWarning, {
    surfaceId: 'scenario02/deposit-warning',
    title: 'x', body: 'y', primaryLabel: 'stop', secondaryLabel: 'continue',
    onContinue: () => continued.push('continue'),
  });
  assert.equal(dispatchOn(LEFT).accepted, true);
  const stopped = getARGestureSnapshot();
  assert.equal(stopped.surfaceId, 'scenario02/deposit-warning/stopped');
  assert.equal(stopped.mode, 'single');
  assert.equal(dispatchOn(LEFT).reason, R.DIRECTION_UNAVAILABLE);
  again.unmount();
});

test('INT scenario03: police-callback/answer answers to RIGHT only, and never to LEFT', async () => {
  // The #326/#327 flow: the prosecutor hangs up, the original officer calls
  // back as a separate call, and the player answers that call themselves.
  globalThis.sessionStorage.setItem('cibar-scenario03-state', JSON.stringify({
    prosecutorCallCompleted: true,
    policeCallbackStatus: 'idle',
  }));
  const { PoliceCallback } = await import('../src/pages/scenario03/PoliceCallback.jsx');
  const mounted = mountSurface(PoliceCallback);

  const ringing = getARGestureSnapshot();
  assert.equal(ringing.surfaceId, 'scenario03/police-callback/answer');
  assert.equal(ringing.mode, 'single');
  assert.equal(ringing.leftAvailable, false);
  assert.equal(ringing.rightAvailable, true);

  // LEFT must not answer, decline, hang up or skip anything.
  const left = dispatchOn(LEFT);
  assert.equal(left.accepted, false);
  assert.equal(left.reason, R.DIRECTION_UNAVAILABLE);
  assert.equal(getARGestureSnapshot().surfaceId, 'scenario03/police-callback/answer', 'LEFT changed the screen');
  assert.deepEqual(navigations, [], 'LEFT navigated somewhere');

  // RIGHT answers it - exactly once.
  assert.equal(dispatchOn(RIGHT).accepted, true);
  const inCall = getARGestureSnapshot();
  assert.equal(inCall.surfaceId, 'scenario03/police-callback');
  assert.equal(inCall.mode, 'display');

  // In-call is a display surface: the recording plays and no gesture skips
  // it, advances it, or jumps ahead to LINE or the bank.
  assert.equal(dispatchOn(LEFT).reason, R.DIRECTION_UNAVAILABLE);
  assert.equal(dispatchOn(RIGHT).reason, R.DIRECTION_UNAVAILABLE);
  assert.equal(getARGestureSnapshot().surfaceId, 'scenario03/police-callback');
  assert.deepEqual(navigations, [], 'a display surface must not navigate anywhere');
  mounted.unmount();
});

test('INT scenario04: the BlackPi message list is a real dual on the Bridge', async () => {
  const { BlackPiMessages } = await import('../src/pages/scenario04/blackpi/hosts.jsx');
  const mounted = mountSurface(BlackPiMessages);

  const snapshot = getARGestureSnapshot();
  assert.equal(snapshot.surfaceId, 'scenario04/messages');
  assert.equal(snapshot.mode, 'dual');
  assert.equal(snapshot.leftAvailable, true);
  assert.equal(snapshot.rightAvailable, true);

  const result = dispatchOn(RIGHT);
  assert.equal(result.accepted, true);
  assert.equal(result.surfaceId, 'scenario04/messages');
  mounted.unmount();
});

test('INT scenario05: the MyDonDon picker is a dual, and goes disabled the moment it is used', async () => {
  const { ProductSelect } = await import('../src/apps/mydondon/screens/ProductSelect.jsx');
  const picked = [];
  const mounted = mountSurface(ProductSelect, {
    products: [{ id: 'tablet', title: 'A' }, { id: 'headphones', title: 'B' }],
    onProductSelected: (id) => picked.push(id),
  });

  const before = getARGestureSnapshot();
  assert.equal(before.surfaceId, 'mydondon/product-select');
  assert.equal(before.mode, 'dual');

  assert.equal(dispatchOn(LEFT).accepted, true);
  assert.deepEqual(picked, ['tablet'], 'LEFT lists products[0]');

  // The screen's own anti-double-tap guard now applies to gestures too: the
  // sides are still declared, but neither is callable.
  const after = getARGestureSnapshot();
  assert.equal(after.declaredMode, 'dual');
  assert.equal(after.leftAvailable, false);
  assert.equal(after.rightAvailable, false);
  assert.equal(dispatchOn(LEFT).reason, R.DISABLED);
  assert.equal(dispatchOn(RIGHT).reason, R.DISABLED);
  assert.deepEqual(picked, ['tablet'], 'a second gesture must not list the other product');
  mounted.unmount();
});

test('INT shared: the Outcome and the clue analysis are single-RIGHT surfaces', async () => {
  const { ScenarioOutcome } = await import('../src/components/outcome/ScenarioOutcome.jsx');
  const outcome = mountSurface(ScenarioOutcome, {
    scenarioId: 'romance', state: 'scammed', title: 'x', analysisTo: '/analysis',
  });
  assert.equal(getARGestureSnapshot().surfaceId, 'shared/outcome');
  assert.equal(getARGestureSnapshot().mode, 'single');
  assert.equal(dispatchOn(LEFT).reason, R.DIRECTION_UNAVAILABLE);
  assert.deepEqual(navigations, [], 'LEFT must not leave the Outcome screen');
  assert.equal(dispatchOn(RIGHT).accepted, true);
  assert.deepEqual(navigations.at(-1), ['/analysis'], 'RIGHT goes where the button goes');
  outcome.unmount();

  resetNavigations();
  const { FraudClueAnalysis } = await import('../src/components/outcome/FraudClueAnalysis.jsx');
  const analysis = mountSurface(FraudClueAnalysis, {
    scenarioId: 'romance', clues: [{ title: 'x' }], quizTo: '/quiz',
  });
  assert.equal(getARGestureSnapshot().surfaceId, 'shared/fraud-clue-analysis');
  assert.equal(getARGestureSnapshot().mode, 'single');
  assert.equal(dispatchOn(LEFT).reason, R.DIRECTION_UNAVAILABLE);
  assert.deepEqual(navigations, []);
  assert.equal(dispatchOn(RIGHT).accepted, true);
  assert.deepEqual(navigations.at(-1), ['/quiz']);
  analysis.unmount();
});

test('INT shared: the anti-fraud quiz goes dual -> single, and cannot be answered twice', async () => {
  const { ScenarioFinalDecision } = await import('../src/components/ui/ScenarioFinalDecision.jsx');
  const answers = [];
  const mounted = mountSurface(ScenarioFinalDecision, {
    t: (value) => value,
    question: 'q',
    options: ['safe', 'risky'],
    correctIndex: 0,
    explanation: 'e',
    backTo: '/ar-scan',
    onAnswer: (correct, index) => answers.push([correct, index]),
  });

  const asked = getARGestureSnapshot();
  assert.equal(asked.surfaceId, 'shared/anti-fraud-quiz');
  assert.equal(asked.mode, 'dual');
  assert.equal(asked.leftAvailable, true);
  assert.equal(asked.rightAvailable, true);

  // LEFT is options[0], the safe answer.
  assert.equal(dispatchOn(LEFT).accepted, true);
  assert.deepEqual(answers, [[true, 0]]);

  // Answered: the two options are gone and 返回掃描 is the only action left.
  const answered = getARGestureSnapshot();
  assert.equal(answered.surfaceId, 'shared/anti-fraud-quiz-answered');
  assert.equal(answered.mode, 'single');
  assert.equal(answered.leftAvailable, false);
  assert.equal(answered.rightAvailable, true);
  assert.notEqual(answered.revision, asked.revision);

  // A LEFT that was recognised while the question was still open must not
  // land on the answered screen - and must not re-answer the question.
  const stale = dispatchARGesture({
    gesture: LEFT, eventId: nextId(), expectedRevision: asked.revision,
  });
  assert.equal(stale.accepted, false);
  assert.equal(stale.reason, R.STALE_INTERACTION);
  assert.deepEqual(answers, [[true, 0]], 'the quiz must not be answered twice');

  // A LEFT recognised now is simply unavailable: the answered screen has none.
  assert.equal(dispatchOn(LEFT).reason, R.DIRECTION_UNAVAILABLE);
  assert.deepEqual(navigations, []);

  // RIGHT goes back to the scan, through the same navigate the button uses.
  assert.equal(dispatchOn(RIGHT).accepted, true);
  assert.deepEqual(navigations.at(-1), ['/ar-scan']);
  mounted.unmount();
});

test('INT: leaving a production surface leaves nothing for a gesture to reach', async () => {
  const { ScenarioOutcome } = await import('../src/components/outcome/ScenarioOutcome.jsx');
  const mounted = mountSurface(ScenarioOutcome, {
    scenarioId: 'romance', state: 'scammed', title: 'x', analysisTo: '/analysis',
  });
  assert.equal(getARGestureSnapshot().rightAvailable, true);
  mounted.unmount();

  const result = dispatchARGesture({ gesture: RIGHT, eventId: nextId() });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, R.NO_ACTIVE_INTERACTION);
  assert.deepEqual(navigations, []);
});

test('INT: touch is untouched - every migrated surface still carries its own handlers', async () => {
  // Phase 3 adds a second input source; it removes none. These are the
  // screens driven through the Bridge above, checked for the onClick/Link the
  // player's finger uses.
  const files = [
    'src/components/ui/ScenarioFinalDecision.jsx',
    'src/components/outcome/ScenarioOutcome.jsx',
    'src/components/outcome/FraudClueAnalysis.jsx',
    'src/pages/scenario03/PoliceCallback.jsx',
    'src/pages/scenario02/components/RedWarning.jsx',
    'src/apps/mydondon/screens/ProductSelect.jsx',
  ];
  for (const file of files) {
    const source = await read(file);
    assert.ok(/onClick|<Button|<Link|onSelect|onPick/.test(source), `${file} lost its own touch handlers`);
    assert.ok(source.includes('useARInteraction'), `${file} must still declare its contract`);
  }
});
