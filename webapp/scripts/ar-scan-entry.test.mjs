// The AR scan page as a scenario entry point: what happens between "a target
// was recognised" and "the player is in that scenario" - which is now a gap
// with the player in it, not a navigation.
//
// Four separate things are pinned here, all of them the parts that have no
// camera in them:
//
//   1. the sighting gate - every match is reported, and `lock()` is absolute;
//   2. the shared camera - reference counting around ONE open of whichever
//      camera this build got, so two consumers cannot open two;
//   3. the offer - a recognised target changes what the page SAYS and never
//      where the player IS. Entering is a wave or a tap, both of which run the
//      one handler; and an offer outlives a tracking gap but not an absence;
//   4. entry parity - an AR entry and a Scenario Menu click leave the
//      scenario in the same state, because both go through
//      prepareScenarioEntry() and there is no second initialisation path.
//
// (3) is the acceptance table of the recognition/entry split, case by case:
// scenery that is not a target, a target that is, doing nothing after one is
// found, a wave, a tap, a wobble, walking away, and all five cards.
//
// Note what (2) is not about. Hand gestures do not come from this camera:
// LEFT/RIGHT are produced by the glasses' ToF 8x8 depth sensor and arrive as
// semantic events (src/lib/arInteraction/gestureBridge.js), so no gesture
// code ever acquires an RGB frame. Which camera gets opened - the glasses'
// MJPEG stream or the browser's own camera - is
// scripts/ar-glasses-camera.test.mjs.
//
// Whether the camera frames actually contain a recognisable target is a
// different question, answered by scripts/ar-image-recognition.test.mjs
// against the real dataset.
//
// Run: npm run test:ar-scan-entry
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {
  UNSAFE_LocationContext as LocationContext,
  UNSAFE_NavigationContext as NavigationContext,
  UNSAFE_RouteContext as RouteContext,
} from 'react-router-dom';
import { createSightingGate } from '../src/lib/ar/imageRecognition.js';
import { IMAGE_TARGETS, targetIndexById } from '../src/lib/ar/scenarioTargetMap.js';
import { createTargetLock, TARGET_LOSS_TOLERANCE_MS } from '../src/lib/ar/targetLock.js';
import {
  __cameraSourceStateForTests,
  __resetCameraSourceForTests,
  acquireCameraSource,
} from '../src/lib/ar/cameraSource.js';
import { createFakeCameraScope } from './stubs/fake-camera-scope.mjs';
import { startCalls, resetStub } from './stubs/ar-image-recognition.mjs';

// --- harness -----------------------------------------------------------------

// A controllable clock, installed for the whole file. The page holds an offer
// for TARGET_LOSS_TOLERANCE_MS of silence and checks that on an interval, and
// a suite that waited out real seconds to see it would be both slow and
// flaky. `setTimeout` is deliberately left alone - `settle()` below is a real
// macrotask, waiting on the recogniser's real promise.
function installFakeClock() {
  let now = 1_000_000;
  const timers = new Set();
  const realSetInterval = globalThis.setInterval;
  const realClearInterval = globalThis.clearInterval;
  const realNow = Date.now;

  globalThis.setInterval = (fn, ms) => {
    const timer = { fn, ms, next: now + ms };
    timers.add(timer);
    return timer;
  };
  globalThis.clearInterval = (timer) => timers.delete(timer);
  Date.now = () => now;

  return {
    // Runs every interval that falls due in the window, in order, with
    // `Date.now()` reading the time each one actually fires at.
    advance(ms) {
      const until = now + ms;
      for (;;) {
        let due = null;
        for (const timer of timers) {
          if (timer.next <= until && (due === null || timer.next < due.next)) due = timer;
        }
        if (!due) break;
        now = due.next;
        due.next += due.ms;
        due.fn();
      }
      now = until;
    },
    restore() {
      globalThis.setInterval = realSetInterval;
      globalThis.clearInterval = realClearInterval;
      Date.now = realNow;
    },
  };
}

const clock = installFakeClock();
test.after(() => clock.restore());

// Stored entries have to be own enumerable properties, the way they are on a
// real Storage: the scenario stores clear a run with
// `Object.keys(localStorage).filter(k => k.startsWith(prefix))`, and a fake
// that hides its keys behind a Map makes that a silent no-op - which would
// have this file assert that a reset happened when none did.
function fakeStorage(initial = {}) {
  const storage = { ...initial };
  const method = (value) => ({ value, enumerable: false });
  Object.defineProperties(storage, {
    getItem: method((key) => (Object.hasOwn(storage, key) ? String(storage[key]) : null)),
    setItem: method((key, value) => { storage[key] = String(value); }),
    removeItem: method((key) => { delete storage[key]; }),
    clear: method(() => { Object.keys(storage).forEach((key) => delete storage[key]); }),
  });
  return storage;
}

function recordingRouter() {
  const visited = [];
  const record = (to) => visited.push(typeof to === 'string' ? to : to.pathname);
  return {
    visited,
    navigator: {
      push: record,
      replace: record,
      go: (n) => visited.push(`go(${n})`),
      createHref: (to) => (typeof to === 'string' ? to : to.pathname),
      encodeLocation: (to) => (typeof to === 'string' ? { pathname: to, search: '', hash: '' } : to),
    },
  };
}

const REACT_INTERNALS = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

// A minimal hooks runtime, with the one property the previous version of this
// file did not have: `setState` really re-renders. ArScanHome's whole subject
// is a state change a player can see - the prompt and the CTA appearing when a
// card is found and going away again when it is lost - and a dispatcher whose
// setter is `() => {}` would let every assertion below read the first render
// forever and pass on a page that never updates.
//
// Effects are collected per pass and flushed after it, so an effect that sets
// state (or a `setInterval` callback that does) re-renders the same way React
// would, and cleanups are kept for unmount.
function render(Component, { navigator }) {
  const hooks = [];
  const pending = [];
  const cleanups = [];
  let cursor = 0;
  let tree = null;

  const contexts = new Map([
    [LocationContext, {
      location: { pathname: '/ar-scan', search: '', hash: '', state: null, key: 'test' },
      navigationType: 'POP',
    }],
    [NavigationContext, { basename: '/', navigator, static: false }],
    [RouteContext, { outlet: null, matches: [], isDataRoute: false }],
  ]);

  const dispatcher = {
    useState(initial) {
      const slot = cursor;
      cursor += 1;
      if (hooks[slot] === undefined) {
        hooks[slot] = { value: typeof initial === 'function' ? initial() : initial };
      }
      const state = hooks[slot];
      return [state.value, (next) => {
        const value = typeof next === 'function' ? next(state.value) : next;
        if (Object.is(value, state.value)) return;
        state.value = value;
        update();
      }];
    },
    useRef(initial) {
      const slot = cursor;
      cursor += 1;
      if (hooks[slot] === undefined) hooks[slot] = { current: initial };
      return hooks[slot];
    },
    useEffect(callback, deps) {
      const slot = cursor;
      cursor += 1;
      const previous = hooks[slot];
      const changed = previous === undefined || !deps || !previous.deps
        || deps.length !== previous.deps.length
        || deps.some((value, index) => !Object.is(value, previous.deps[index]));
      hooks[slot] = { deps };
      if (changed) pending.push(callback);
    },
    useInsertionEffect: () => {},
    useLayoutEffect: (callback) => callback(),
    useMemo: (factory) => factory(),
    useCallback: (fn) => fn,
    useContext: (context) => (contexts.has(context) ? contexts.get(context) : null),
  };

  function update() {
    cursor = 0;
    const previous = REACT_INTERNALS.H;
    REACT_INTERNALS.H = dispatcher;
    try {
      tree = Component();
    } finally {
      REACT_INTERNALS.H = previous;
    }
    while (pending.length > 0) {
      const cleanup = pending.shift()();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    }
  }

  update();
  return {
    get tree() { return tree; },
    unmount: () => cleanups.splice(0).forEach((cleanup) => cleanup()),
  };
}

const settle = () => new Promise((resolve) => { setTimeout(resolve, 0); });

function walk(node, found = []) {
  if (Array.isArray(node)) { node.forEach((child) => walk(child, found)); return found; }
  if (!node || typeof node !== 'object') return found;
  found.push(node);
  walk(node.props?.children, found);
  return found;
}

// -1 from targetIndexById would make every `see()` below a no-op and every
// navigation assertion vacuous, so the ids are resolved once, loudly.
function targetIndex(id) {
  const index = targetIndexById(id);
  assert.notEqual(index, -1, `no target with id '${id}' in IMAGE_TARGETS`);
  return index;
}

const SCENARIO05_STATE_KEY = 'cibar-scenario05-state';
const DIRTY_SCENARIO05 = JSON.stringify({ selectedProduct: 'stroller', shipStatus: 'delivered', buyerId: 'someone' });

const { AR_GESTURES, performARInteraction, getCurrentARInteraction, resetARInteractionContract } =
  await import('../src/lib/arInteraction/index.js');
const { getArScanStrings } = await import('../src/pages/arScan/i18n.js');

// Every page mounted by a test, torn down after it. Not tidiness: the page
// runs an expiry interval, and a page left mounted would keep answering the
// shared fake clock in every test that came after it.
const mounted = [];
test.afterEach(() => {
  mounted.splice(0).forEach((page) => page.unmount());
});

async function mountArScan({ storage = fakeStorage(), session = fakeStorage() } = {}) {
  resetStub();
  resetARInteractionContract();
  globalThis.localStorage = storage;
  globalThis.sessionStorage = session;
  const { ArScanHome } = await import('../src/pages/arScan/ArScanHome.jsx');
  const router = recordingRouter();
  // Assigned onto the rendered handle rather than spread into a new object:
  // `tree` is a getter that has to keep reading the LATEST render, and
  // spreading would freeze it at whatever the mount produced - which would
  // quietly make every assertion about a state change read the first render.
  const page = Object.assign(render(ArScanHome, router), {
    visited: router.visited, storage, session,
  });
  await settle();
  page.recogniser = startCalls[0];
  mounted.push(page);
  return page;
}

// What the player is reading right now, and what they can press.
const nodeById = (page, id) => walk(page.tree).find((node) => node.props?.id === id) ?? null;
const textOf = (page, className) =>
  walk(page.tree).find((node) => node.props?.className === className)?.props?.children ?? null;
const promptOf = (page) => textOf(page, 'ar-scan-title');
const ctaOf = (page) => {
  const button = nodeById(page, 'enter-scenario-button');
  return button ? walk(button.props.children).find((node) => node.type === 'span')?.props?.children ?? null : null;
};
// The RIGHT wave, through the real contract the Gesture Bridge dispatches into.
const waveRight = () => performARInteraction(AR_GESTURES.RIGHT);

const ZH = getArScanStrings('zh');

// --- 1. the sighting gate ----------------------------------------------------

test('the gate reports every match, not just the first', () => {
  const seen = [];
  const gate = createSightingGate((index) => seen.push(index));

  assert.equal(gate.isLocked, false);
  // The same card still in front of the lens on the next frame, and the one
  // after that. Each is a fact about *now*, and the page needs all of them:
  // they are what keeps an offer alive while the player looks at it.
  assert.equal(gate.offer(0), true);
  assert.equal(gate.offer(0), true);
  // And a different card the player has swung towards.
  assert.equal(gate.offer(3), true);

  assert.deepEqual(seen, [0, 0, 3]);
  assert.equal(gate.isLocked, false, 'a match no longer closes the gate - only teardown does');
});

test('the gate is closed by lock() without reporting anything', () => {
  const seen = [];
  const gate = createSightingGate((index) => seen.push(index));
  gate.lock();
  assert.equal(gate.offer(4), false);
  assert.deepEqual(seen, [], 'a torn-down scanner reports nothing');
});

test('the gate ignores an index no target table entry covers', () => {
  const seen = [];
  const gate = createSightingGate((index) => seen.push(index));
  assert.equal(gate.offer(-1), false);
  assert.equal(gate.offer(IMAGE_TARGETS.length), false);
  assert.equal(gate.offer(2), true);
  assert.deepEqual(seen, [2]);
});

// --- 1b. the target lock -----------------------------------------------------

test('the lock reports only the changes a player can see', () => {
  const lock = createTargetLock();
  assert.equal(lock.selected, null);

  assert.equal(lock.see(1, 0), true, 'the first sighting is a change');
  assert.equal(lock.see(1, 16), false, 'the same card again is the steady state, not news');
  assert.equal(lock.see(1, 32), false);
  assert.equal(lock.selected, 1);

  assert.equal(lock.see(3, 48), true, 'a different card replaces the offer');
  assert.equal(lock.selected, 3, 'there is exactly one offer, never two');
});

test('an offer survives a gap in sightings and not an absence of them', () => {
  const lock = createTargetLock();
  lock.see(1, 0);

  // A wobble: no match for a moment, then the same card again.
  assert.equal(lock.expire(TARGET_LOSS_TOLERANCE_MS - 1), false);
  assert.equal(lock.selected, 1, 'a tracking gap must not take the offer away');
  lock.see(1, TARGET_LOSS_TOLERANCE_MS - 1);
  assert.equal(lock.expire(TARGET_LOSS_TOLERANCE_MS + 1), false, 'the sighting refreshed the offer');

  // Walking away: nothing at all for longer than the tolerance.
  assert.equal(lock.expire(TARGET_LOSS_TOLERANCE_MS * 2), true);
  assert.equal(lock.selected, null);
  assert.equal(lock.expire(TARGET_LOSS_TOLERANCE_MS * 3), false, 'nothing left to drop');
});

test('the tolerance is the 3-5s the flow asks for', () => {
  assert.ok(TARGET_LOSS_TOLERANCE_MS >= 3000 && TARGET_LOSS_TOLERANCE_MS <= 5000);
});

// --- 2. the shared camera ----------------------------------------------------

// The desktop path, because that is the one with a permission prompt behind
// it and therefore the one where a second open is visible to the player.
// The glasses path shares this exact code - see ar-glasses-camera.test.mjs.
const acquire = (label, fake) => acquireCameraSource(label, { scope: fake.scope });

test('two consumers of the camera produce exactly one camera open', async () => {
  __resetCameraSourceForTests();
  const fake = createFakeCameraScope();

  // Image recognition and a stand-in for a second frame consumer (a debug
  // recorder, a photo capture), taken in the same tick - the case that would
  // double-prompt if each opened its own stream.
  const [image, second] = await Promise.all([
    acquire('image-recognition', fake),
    acquire('frame-tap', fake),
  ]);

  assert.equal(fake.getUserMediaCalls.length, 1, 'the camera is opened once for both consumers');
  assert.equal(image.source, second.source, 'both consumers get the same frame source');
  assert.equal(__cameraSourceStateForTests().consumerCount, 2);

  // Image recognition finishing (the player took an offer) must not close the
  // camera the other consumer is still reading from.
  image.release();
  assert.deepEqual(fake.stoppedTracks, [], 'the camera stays live while another consumer holds it');
  assert.equal(__cameraSourceStateForTests().isOpen, true);

  second.release();
  assert.equal(fake.stoppedTracks.length, 1, 'the last release stops the camera');
  assert.equal(__cameraSourceStateForTests().isOpen, false);
});

test('a released reference is idempotent and does not close a re-opened camera', async () => {
  __resetCameraSourceForTests();
  const fake = createFakeCameraScope();

  const first = await acquire('image-recognition', fake);
  first.release();
  first.release(); // a component that releases from both an error and a teardown path
  assert.equal(fake.stoppedTracks.length, 1);

  const second = await acquire('image-recognition', fake);
  first.release();
  assert.equal(__cameraSourceStateForTests().isOpen, true, 'a stale reference cannot close a live camera');
  second.release();
});

test('a failed camera open is not cached as opening', async () => {
  __resetCameraSourceForTests();
  let attempts = 0;
  const fake = createFakeCameraScope({
    getUserMedia: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('NotAllowedError');
      return { getTracks: () => [{ stop: () => {} }] };
    },
  });

  await assert.rejects(() => acquire('image-recognition', fake));
  assert.equal(__cameraSourceStateForTests().consumerCount, 0, 'a failed acquire leaves no reference behind');
  // Returning to /ar-scan after granting permission has to be able to ask again.
  const retry = await acquire('image-recognition', fake);
  assert.equal(attempts, 2);
  retry.release();
});

// --- 3. the offer: recognition is not entry ----------------------------------

test('A. scenery that is not a target leaves the page searching, quietly', async () => {
  const page = await mountArScan();
  assert.ok(page.recogniser, 'the page started the recogniser');

  // The printed poster carries a hundred-odd 3D images that are not targets.
  // The recogniser simply never reports them - so this is what the page looks
  // like for the whole time a player is sweeping across them.
  clock.advance(TARGET_LOSS_TOLERANCE_MS * 3);

  assert.deepEqual(page.visited, [], 'nothing was entered');
  assert.equal(promptOf(page), ZH.scanning.headline);
  assert.equal(nodeById(page, 'enter-scenario-button'), null, 'nothing is on offer');
  // No failure of any kind is reported: not matching is the resting state.
  assert.equal(walk(page.tree).some((node) => node.props?.className === 'ar-scan-camera-error'), false);
});

test('B. a recognised target changes the prompt and enters nothing', async () => {
  const page = await mountArScan();
  page.recogniser.see(targetIndex('scenario2'));

  assert.deepEqual(page.visited, [], 'recognition must never navigate by itself');
  assert.equal(promptOf(page), ZH.targets.romance.headline);
  assert.equal(ctaOf(page), ZH.targets.romance.cta);
  assert.equal(page.recogniser.stopCount, 0, 'the camera keeps running - the player has not decided yet');
});

test('B. the prompt is story copy, never a recognition status', async () => {
  const page = await mountArScan();
  page.recogniser.see(targetIndex('scenario2'));

  const onScreen = [promptOf(page), ctaOf(page)].join(' ');
  for (const engineering of ['辨識', '偵測', 'Target', 'target', 'detect', 'Detect', 'recognis', 'recogniz', 'tracking']) {
    assert.equal(onScreen.includes(engineering), false, `the player is being shown "${engineering}"`);
  }
});

test('C. an offer left alone never enters its scenario', async () => {
  const page = await mountArScan();
  page.recogniser.see(targetIndex('scenario2'));

  // The card is still in front of the lens, so sightings keep arriving - the
  // steady state a player standing still in front of the poster produces.
  for (let elapsed = 0; elapsed < TARGET_LOSS_TOLERANCE_MS * 4; elapsed += 100) {
    page.recogniser.see(targetIndex('scenario2'));
    clock.advance(100);
  }

  assert.deepEqual(page.visited, [], 'no wave, no tap, no entry - at any delay');
  assert.equal(ctaOf(page), ZH.targets.romance.cta, 'and the offer is still standing');
});

test('D. a RIGHT wave takes the offer', async () => {
  const page = await mountArScan();
  page.recogniser.see(targetIndex('scenario2'));

  assert.equal(getCurrentARInteraction().mode, 'single', 'one action: take the offer');
  assert.equal(getCurrentARInteraction().leftAvailable, false, 'there is no LEFT on this screen');
  assert.equal(waveRight(), true);

  assert.deepEqual(page.visited, ['/scenario02-romance']);
  assert.equal(page.recogniser.stopCount, 1, 'the recogniser was stopped on the way out');
});

test('E. tapping the CTA takes the same offer through the same handler', async () => {
  const page = await mountArScan();
  page.recogniser.see(targetIndex('scenario2'));

  const cta = nodeById(page, 'enter-scenario-button');
  assert.ok(cta, 'the CTA is a real button a finger can reach');
  cta.props.onClick();

  assert.deepEqual(page.visited, ['/scenario02-romance']);
  assert.equal(page.recogniser.stopCount, 1);
});

test('E. the wave and the tap are literally the same function', async () => {
  const page = await mountArScan();
  page.recogniser.see(targetIndex('scenario4'));

  // Not "both navigate to the same place" - the same handler object. Two
  // navigation paths that agree today are two that can disagree tomorrow.
  const { ArScanHome } = await import('../src/pages/arScan/ArScanHome.jsx');
  const source = ArScanHome.toString();
  assert.match(source, /action: enterSelectedScenario/);
  assert.match(source, /onClick=\{enterSelectedScenario\}|onClick: enterSelectedScenario/);
});

test('F. a short tracking loss does not take the offer away', async () => {
  const page = await mountArScan();
  page.recogniser.see(targetIndex('scenario2'));

  // The glasses wobble: no match at all for a moment, well inside the
  // tolerance. The prompt must not blink out and back.
  clock.advance(TARGET_LOSS_TOLERANCE_MS - 200);
  assert.equal(ctaOf(page), ZH.targets.romance.cta, 'the offer flickered off on a wobble');

  // The card comes back, and the offer is good for another full tolerance.
  page.recogniser.see(targetIndex('scenario2'));
  clock.advance(TARGET_LOSS_TOLERANCE_MS - 200);
  assert.equal(ctaOf(page), ZH.targets.romance.cta, 're-seeing the same card must refresh the offer');
});

test('G. losing the target for longer than the tolerance goes back to searching', async () => {
  const page = await mountArScan();
  page.recogniser.see(targetIndex('scenario2'));

  clock.advance(TARGET_LOSS_TOLERANCE_MS * 2);

  assert.equal(promptOf(page), ZH.scanning.headline);
  assert.equal(nodeById(page, 'enter-scenario-button'), null, 'the CTA is gone with the offer');
  assert.deepEqual(page.visited, [], 'and losing a target is not an entry either');
});

test('G. with nothing on offer a RIGHT wave does nothing at all', async () => {
  const page = await mountArScan();

  // Before anything has ever been seen.
  assert.equal(getCurrentARInteraction().mode, 'display');
  assert.equal(waveRight(), false);
  assert.deepEqual(page.visited, []);

  // And after an offer has expired: no guess, and above all no falling back to
  // the last card that was seen.
  page.recogniser.see(targetIndex('scenario2'));
  clock.advance(TARGET_LOSS_TOLERANCE_MS * 2);
  assert.equal(getCurrentARInteraction().mode, 'display');
  assert.equal(waveRight(), false);
  assert.deepEqual(page.visited, [], 'a wave at an empty poster is not a choice');
});

test('H. every target offers, and enters, its own scenario and no other', async () => {
  const ROUTES = {
    investment: '/scenario01-investment',
    romance: '/scenario02-romance',
    authority: '/scenario03-police',
    fakeSeller: '/scenario04-shopping',
    fakeBuyer: '/scenario05-atm',
  };

  for (const [index, target] of IMAGE_TARGETS.entries()) {
    const page = await mountArScan();
    page.recogniser.see(index);

    assert.equal(promptOf(page), ZH.targets[target.scenario].headline, `${target.id} shows the wrong story`);
    assert.equal(ctaOf(page), ZH.targets[target.scenario].cta, `${target.id} offers the wrong CTA`);
    assert.deepEqual(page.visited, [], `${target.id} entered a scenario on its own`);

    waveRight();
    assert.deepEqual(page.visited, [ROUTES[target.scenario]], `${target.id} (index ${index}) did not enter ${target.scenario}`);
  }
});

test('a second target replaces the offer instead of adding one', async () => {
  const page = await mountArScan();

  // The player finds the romance card, does not take it, and sweeps on to the
  // shopping card. There is exactly one offer, and it is the card in view.
  page.recogniser.see(targetIndex('scenario2'));
  page.recogniser.see(targetIndex('scenario4'));

  assert.equal(promptOf(page), ZH.targets.fakeSeller.headline);
  assert.equal(ctaOf(page), ZH.targets.fakeSeller.cta);
  assert.equal(walk(page.tree).filter((node) => node.props?.id === 'enter-scenario-button').length, 1);
  assert.deepEqual(page.visited, []);

  waveRight();
  assert.deepEqual(page.visited, ['/scenario04-shopping'], 'the wave took the card in view, not the one before it');
});

test('a sighting arriving as the player leaves cannot enter a second scenario', async () => {
  const page = await mountArScan();
  page.recogniser.see(targetIndex('scenario1'));
  waveRight();

  // The glasses are still pointing at the poster while the router transitions,
  // and the stub has no gate of its own - so this is the page holding the line.
  page.recogniser.see(targetIndex('scenario3'));
  page.recogniser.see(targetIndex('scenario1'));
  waveRight();

  assert.deepEqual(page.visited, ['/scenario01-investment'], 'exactly one scenario was entered');
});

// --- 4. entry parity and the page's other way out ----------------------------

test('a taken offer enters its scenario through prepareScenarioEntry', async () => {
  const page = await mountArScan({ storage: fakeStorage({ [SCENARIO05_STATE_KEY]: DIRTY_SCENARIO05 }) });
  page.recogniser.see(targetIndex('scenario5'));
  waveRight();

  assert.deepEqual(page.visited, ['/scenario05-atm']);
  const entered = JSON.parse(page.storage.getItem(SCENARIO05_STATE_KEY));
  assert.equal(entered.selectedProduct, null, 'the previous run\'s product choice was cleared');
  assert.equal(entered.shipStatus, 'idle', 'the previous run\'s shipping progress was cleared');
  assert.ok(entered.scenarioStartedAt > 0, 'a new run was started - prepareScenarioEntry ran before navigating');
});

test('an AR entry and a Scenario Menu click leave the scenario in the same state', async () => {
  const viaAr = await mountArScan({ storage: fakeStorage({ [SCENARIO05_STATE_KEY]: DIRTY_SCENARIO05 }) });
  viaAr.recogniser.see(targetIndex('scenario5'));
  waveRight();

  const menuStorage = fakeStorage({ [SCENARIO05_STATE_KEY]: DIRTY_SCENARIO05 });
  globalThis.localStorage = menuStorage;
  globalThis.sessionStorage = fakeStorage();
  const { ScenarioMenu } = await import('../src/pages/ScenarioMenu.jsx');
  const { SCENARIO_ENTRIES } = await import('../src/data/scenarioEntries.js');
  const menuRouter = recordingRouter();
  const menu = render(ScenarioMenu, menuRouter);

  const buttons = walk(menu.tree).filter((node) => node.props?.className === 'scenario-button');
  assert.equal(buttons.length, SCENARIO_ENTRIES.length);
  buttons[SCENARIO_ENTRIES.findIndex((entry) => entry.route === '/scenario05-atm')].props.onClick();

  assert.deepEqual(menuRouter.visited, viaAr.visited, 'both entry points land on the same route');

  // Three fields are deliberately different on every run - a fresh timestamp,
  // a randomly drawn seller and a random shipment code - so the comparison is
  // over everything else, plus the requirement that both produced those three
  // at all. A second initialisation path would show up here as a different
  // key set or a stale field, not as a different random draw.
  const volatile = new Set(['scenarioStartedAt', 'characterCast', 'shipmentCodeSuffix']);
  const runState = (storage) => JSON.parse(storage.getItem(SCENARIO05_STATE_KEY));
  const stable = (state) => Object.fromEntries(Object.entries(state).filter(([key]) => !volatile.has(key)));
  const fromAr = runState(viaAr.storage);
  const fromMenu = runState(menuStorage);

  assert.deepEqual(Object.keys(fromMenu).sort(), Object.keys(fromAr).sort(), 'both entry points write the same run-state shape');
  assert.deepEqual(stable(fromMenu), stable(fromAr), 'both entry points leave identical run state - one initialisation path, not two');
  for (const key of volatile) {
    assert.ok(fromAr[key], `AR entry produced ${key}`);
    assert.ok(fromMenu[key], `menu entry produced ${key}`);
  }
});

test('the manual Scenario Menu entry still works and shuts the camera down', async () => {
  const page = await mountArScan();
  const manual = nodeById(page, 'manual-scenario-button');
  assert.ok(manual, '/ar-scan still offers the manual scenario selection');

  manual.props.onClick();
  assert.deepEqual(page.visited, ['/scenario-menu']);
  assert.equal(page.recogniser.stopCount, 1, 'leaving by hand releases the camera too');

  // And a target sighted in that same instant must not overtake the tap.
  page.recogniser.see(targetIndex('scenario2'));
  waveRight();
  assert.deepEqual(page.visited, ['/scenario-menu'], 'a late match cannot hijack a manual choice');
});

test('the manual entry is offered whether or not a card is on offer', async () => {
  const page = await mountArScan();
  assert.ok(nodeById(page, 'manual-scenario-button'), 'a player with no camera needs it while searching');
  page.recogniser.see(targetIndex('scenario3'));
  assert.ok(nodeById(page, 'manual-scenario-button'), 'and it must not vanish when a card is found');
});

test('leaving the page stops the recogniser and its expiry timer', async () => {
  const page = await mountArScan();
  page.recogniser.see(targetIndex('scenario2'));
  page.unmount();
  assert.equal(page.recogniser.stopCount, 1);

  // Nothing left running that could still touch an unmounted page.
  clock.advance(TARGET_LOSS_TOLERANCE_MS * 3);
  assert.deepEqual(page.visited, []);
});
