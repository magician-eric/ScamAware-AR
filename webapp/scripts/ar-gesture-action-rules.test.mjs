// The whole-site LEFT/RIGHT rule, in one place.
//
// CIBAR's AR build has exactly one interaction rule, and it applies to every
// screen in all five Scenarios:
//
//   | 畫面可操作按鈕 | LEFT           | RIGHT          |
//   | 左右兩個按鈕   | 直接執行左側按鈕 | 直接執行右側按鈕 |
//   | 只有一個按鈕   | 無反應          | 直接執行唯一按鈕 |
//   | 沒有按鈕      | 無反應          | 無反應          |
//
// The gesture IS the confirmation. There is no focus, no selection, no
// highlight, no second gesture to commit - LEFT and RIGHT run the screen's own
// action immediately, the same action a tap runs.
//
// The other AR suites each own a piece of this and go deep on it:
//
//   test:gesture-contract      the contract engine (geometry, lifecycle, availability)
//   test:gesture-bridge        one event in, at most one action out (~47 cases)
//   test:ar-interaction-migration  are the five Scenarios fully wired
//   test:ar-dual-visual-order  does LEFT mean the button drawn on the left
//   audit:ar-gestures          the ZERO/ONE/TWO read-out across the five Scenarios
//
// This suite is the acceptance table itself: the rule stated once, executed
// end-to-end through the real Bridge and the real contract, plus the two
// site-wide invariants the audit asserts over every surface at once - nothing
// carries more than two actions, and a one-action screen never answers LEFT.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mountSurface } from './ar-surface-harness.mjs';
import { classify, violationsIn, ACTION_CLASSES } from './audit-ar-gesture-actions.mjs';
import { AR_MIGRATION_INVENTORY } from './ar-interaction-migration-inventory.mjs';
import { auditVisualOrder } from './ar-dual-visual-order.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SRC = join(ROOT, 'src');

// Every file that declares a contract, found by walking src/ rather than kept
// in a list: a list would go stale the moment a screen is migrated.
const contractFiles = (function walk(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { walk(path, found); continue; }
    if (!/\.[jt]sx?$/.test(entry.name)) continue;
    if (path.includes(join('lib', 'arInteraction'))) continue;
    if (readFileSync(path, 'utf8').includes('useARInteraction')) found.push(path);
  }
  return found;
}(SRC));

// Same storage/window shims the other AR suites install: lib/lang.js and the
// scenario stores read localStorage at import time.
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
  AR_GESTURE_REJECTIONS,
  dispatchARGesture,
  getARGestureSnapshot,
  resetARGestureBridge,
  resetARInteractionContract,
  useARInteraction,
} = await import('../src/lib/arInteraction/index.js');

const { LEFT, RIGHT } = AR_GESTURES;

const surface = (declaration) => function TestSurface() {
  useARInteraction(typeof declaration === 'function' ? declaration() : declaration);
  return null;
};

let ids = 0;
const wave = (gesture) => dispatchARGesture({ gesture, eventId: `wave-${(ids += 1)}`, source: 'test' });

test.beforeEach(() => {
  resetARInteractionContract();
  resetARGestureBridge();
});

// ---------------------------------------------------------------------------
// 兩顆按鈕: 向左揮 -> 左邊, 向右揮 -> 右邊
// ---------------------------------------------------------------------------
test('TWO_ACTION: LEFT runs the left action exactly once and never the right one', () => {
  const ran = [];
  const mounted = mountSurface(surface({
    mode: 'dual', surfaceId: 'rules/two', left: () => ran.push('left'), right: () => ran.push('right'),
  }));

  assert.equal(wave(LEFT).accepted, true);
  assert.deepEqual(ran, ['left']);

  assert.equal(wave(RIGHT).accepted, true);
  assert.deepEqual(ran, ['left', 'right']);

  // No confirmation step anywhere: the action ran on the wave itself, so a
  // second wave is a second decision, not a commit of the first.
  assert.equal(wave(LEFT).accepted, true);
  assert.deepEqual(ran, ['left', 'right', 'left']);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 一顆按鈕: 向左揮 -> 沒反應, 向右揮 -> 執行
// ---------------------------------------------------------------------------
test('ONE_ACTION: LEFT does nothing at all, RIGHT runs the one action exactly once', () => {
  const ran = [];
  const mounted = mountSurface(surface({ mode: 'single', surfaceId: 'rules/one', action: () => ran.push('only') }));

  const left = wave(LEFT);
  assert.equal(left.accepted, false);
  assert.equal(left.reason, AR_GESTURE_REJECTIONS.DIRECTION_UNAVAILABLE);
  assert.deepEqual(ran, [], 'LEFT must never reach a single screen\'s one action');

  assert.equal(wave(RIGHT).accepted, true);
  assert.deepEqual(ran, ['only']);

  // The contract does not merely refuse to run LEFT - it reports that this
  // screen has no LEFT side at all, which is what a debug overlay and a
  // future recogniser read.
  assert.equal(getARGestureSnapshot().leftAvailable, false);
  assert.equal(getARGestureSnapshot().rightAvailable, true);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 零顆按鈕: 左右都沒反應
// ---------------------------------------------------------------------------
test('ZERO_ACTION: neither LEFT nor RIGHT does anything', () => {
  const ran = [];
  const mounted = mountSurface(surface({ mode: 'display', surfaceId: 'rules/zero' }));

  for (const gesture of [LEFT, RIGHT]) {
    const result = wave(gesture);
    assert.equal(result.accepted, false);
    assert.equal(result.reason, AR_GESTURE_REJECTIONS.DIRECTION_UNAVAILABLE);
  }
  assert.deepEqual(ran, []);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// 一次揮動只消耗一次: 同一個 gesture 不得跨 navigation 觸發兩個 story node
// ---------------------------------------------------------------------------
test('one wave is spent once - it cannot fall through to the screen it opened', () => {
  const ran = [];
  let page = 'A';
  // Page A's RIGHT navigates to page B. Recognition delivers a wave over many
  // frames, so the same event arrives again while B is on screen; B's own
  // action must not run on it.
  const mounted = mountSurface(surface(() => (page === 'A'
    ? { mode: 'single', surfaceId: 'rules/page-a', action: () => { ran.push('A'); page = 'B'; mounted.rerender(); } }
    : { mode: 'single', surfaceId: 'rules/page-b', action: () => ran.push('B') })));

  const eventId = 'one-real-wave';
  assert.equal(dispatchARGesture({ gesture: RIGHT, eventId }).accepted, true);
  assert.deepEqual(ran, ['A']);
  assert.equal(getARGestureSnapshot().surfaceId, 'rules/page-b');

  const repeat = dispatchARGesture({ gesture: RIGHT, eventId });
  assert.equal(repeat.accepted, false);
  assert.equal(repeat.reason, AR_GESTURE_REJECTIONS.DUPLICATE_EVENT);
  assert.deepEqual(ran, ['A'], 'the same wave must not also answer page B');

  // A genuinely new wave does reach page B - the guard is per event, not a
  // blanket cooldown that would swallow the player's next real decision.
  assert.equal(wave(RIGHT).accepted, true);
  assert.deepEqual(ran, ['A', 'B']);
  mounted.unmount();
});

test('a wave recognised against the previous screen is dropped, not re-aimed', () => {
  const ran = [];
  let page = 'A';
  const mounted = mountSurface(surface(() => (page === 'A'
    ? { mode: 'single', surfaceId: 'rules/stale-a', action: () => { ran.push('A'); page = 'B'; mounted.rerender(); } }
    : { mode: 'dual', surfaceId: 'rules/stale-b', left: () => ran.push('B-left'), right: () => ran.push('B-right') })));

  const seenRevision = getARGestureSnapshot().revision;
  assert.equal(dispatchARGesture({ gesture: RIGHT, eventId: 'w1', expectedRevision: seenRevision }).accepted, true);
  assert.deepEqual(ran, ['A']);

  const late = dispatchARGesture({ gesture: LEFT, eventId: 'w2', expectedRevision: seenRevision });
  assert.equal(late.accepted, false);
  assert.equal(late.reason, AR_GESTURE_REJECTIONS.STALE_INTERACTION);
  assert.deepEqual(ran, ['A']);
  mounted.unmount();
});

// ---------------------------------------------------------------------------
// The site-wide invariants, over every surface in the five Scenarios at once
// ---------------------------------------------------------------------------
test('every AR story surface carries at most two actions', () => {
  const classified = classify();
  const over = classified.filter((row) => !(row.actionCount <= 2));
  assert.deepEqual(over.map((row) => `${row.surfaceId} (${row.actionCount})`), []);
  assert.equal(classified.length, AR_MIGRATION_INVENTORY.length);
});

test('every ONE_ACTION surface registers RIGHT only - none of them binds LEFT', () => {
  const single = classify().filter((row) => row.actionClass === 'ONE_ACTION');
  assert.ok(single.length > 0);
  assert.deepEqual(single.filter((row) => row.left !== null).map((row) => row.surfaceId), []);
  assert.deepEqual(single.filter((row) => row.right === null).map((row) => row.surfaceId), []);
});

test('the five-Scenario audit reports no violation of the LEFT/RIGHT rule', () => {
  assert.deepEqual(violationsIn(classify()), []);
});

// The check above reads the inventory. This one reads the source, so a screen
// cannot bind a LEFT onto a one-action geometry without the inventory noticing
// - the contract would ignore such a `left` anyway (see ALLOWED_KEYS in
// interactionContract.js), and a binding that looks live but is not is worse
// than one that fails.
test('no `single` declaration in the source tree names a left action', () => {
  const offenders = [];
  for (const file of contractFiles) {
    const source = readFileSync(file, 'utf8');
    // Each useARInteraction branch is one object literal; take the text from a
    // `mode: 'single'` up to the end of that literal and look for a left side.
    for (const match of source.matchAll(/mode:\s*'single'/g)) {
      const block = source.slice(match.index, source.indexOf('}', match.index) + 1);
      if (/\bleft\s*:/.test(block)) {
        offenders.push(`${relative(SRC, file)}: ${block.replace(/\s+/g, ' ').slice(0, 90)}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('every surface classifies as exactly one of ZERO / ONE / TWO_ACTION', () => {
  const classes = new Set(classify().map((row) => row.actionClass));
  assert.deepEqual([...classes].sort(), ['ONE_ACTION', 'TWO_ACTION', 'ZERO_ACTION']);
  assert.deepEqual(Object.values(ACTION_CLASSES).sort(), ['ONE_ACTION', 'TWO_ACTION', 'ZERO_ACTION']);
});

test('all five Scenarios are audited, and each one really has surfaces', () => {
  const classified = classify();
  for (const scenario of ['scenario01', 'scenario02', 'scenario03', 'scenario04', 'scenario05', 'shared']) {
    assert.ok(
      classified.some((row) => row.scenario === scenario),
      `${scenario} contributes no interaction surface to the audit`,
    );
  }
});

test('no dual surface has LEFT bound to the control drawn on the right', () => {
  const failures = auditVisualOrder(ROOT).filter((row) => !row.ok);
  assert.deepEqual(failures.map((row) => row.surfaceId), []);
});

// ---------------------------------------------------------------------------
// Touch is untouched: gestures reuse the screen's own handler, they do not
// add a second copy of the story.
// ---------------------------------------------------------------------------
test('a gesture runs the very same function object a tap runs', () => {
  const calls = [];
  // One handler, handed to the contract and (in a real screen) to onClick.
  const onContinue = () => calls.push('continue');
  const mounted = mountSurface(surface({ mode: 'single', surfaceId: 'rules/shared-handler', action: onContinue }));

  onContinue();                       // the tap path
  assert.equal(wave(RIGHT).accepted, true);  // the gesture path
  assert.deepEqual(calls, ['continue', 'continue']);
  mounted.unmount();
});
