// 現場環境檢測: the judgement the staff mode shows after its two windows.
import assert from 'node:assert/strict';
import test from 'node:test';

const {
  FALSE_TRIGGER_MS,
  LEVEL,
  SWIPE_HAND,
  SWIPE_PLAN,
  averageSummaries,
  judgeEnvironment,
  judgeFalseTriggers,
  judgeLightColour,
  judgeSwipes,
  judgeTof,
  readTofSnapshot,
  summarizePixels,
  worst,
} = await import('../src/lib/environment/environmentCheck.js');

// Ten prompts answered: `misses` of them (from the end) got nothing.
function swipes(misses = 0, { edgeOnly = false } = {}) {
  return SWIPE_PLAN.map((planned, i) => {
    const missed = edgeOnly
      ? planned.hand === SWIPE_HAND.EDGE && i >= SWIPE_PLAN.length - misses
      : i >= SWIPE_PLAN.length - misses;
    return { ...planned, got: missed ? null : planned.gesture };
  });
}

const clearQuiet = { frames: 38, noisyZoneRatio: 0.02 };
const handSteady = { frames: 45, handSeenRatio: 1, handJitterMm: 3 };

function pixels(r, g, b, count = 100) {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i += 1) data.set([r, g, b, 255], i * 4);
  return data;
}

test('a quiet sensor and a steady hand: gestures are fine', () => {
  assert.equal(judgeTof(clearQuiet, handSteady).level, LEVEL.GOOD);
});

test('infrared noise with nothing in front is flagged', () => {
  assert.equal(judgeTof({ ...clearQuiet, noisyZoneRatio: 0.15 }, handSteady).level, LEVEL.WARN);
  const bad = judgeTof({ ...clearQuiet, noisyZoneRatio: 0.4 }, handSteady);
  assert.equal(bad.level, LEVEL.BAD);
  assert.ok(bad.advice.some((line) => line.includes('黃光')));
});

test('a hand that comes and goes, or jitters, is flagged', () => {
  assert.equal(judgeTof(clearQuiet, { ...handSteady, handSeenRatio: 0.7 }).level, LEVEL.WARN);
  assert.equal(judgeTof(clearQuiet, { ...handSteady, handSeenRatio: 0.3 }).level, LEVEL.BAD);
  assert.equal(judgeTof(clearQuiet, { ...handSteady, handJitterMm: 30 }).level, LEVEL.BAD);
  assert.equal(judgeTof(clearQuiet, { ...handSteady, handSeenRatio: 0, handJitterMm: 0 }).level, LEVEL.BAD);
});

test('no ToF at all is said plainly, not judged', () => {
  assert.equal(judgeTof(null, null).level, LEVEL.UNKNOWN);
  assert.equal(judgeTof({ frames: 0 }, { frames: 0 }).level, LEVEL.BAD);
});

test('pixels summarise to brightness, glare and warmth', () => {
  const grey = summarizePixels(pixels(128, 128, 128));
  assert.ok(Math.abs(grey.luma - 128) < 1);
  assert.equal(grey.glare, 0);
  assert.equal(grey.warmth, 1);
  assert.equal(summarizePixels(pixels(255, 255, 255)).glare, 1);
  assert.ok(summarizePixels(pixels(240, 180, 100)).warmth > 2);
  assert.equal(summarizePixels(new Uint8ClampedArray(0)), null);
});

test('the plan is five palm-facing swipes then five edge-on, directions alternating', () => {
  assert.equal(SWIPE_PLAN.length, 10);
  assert.equal(SWIPE_PLAN.filter((p) => p.hand === SWIPE_HAND.PALM).length, 5);
  assert.equal(SWIPE_PLAN.filter((p) => p.hand === SWIPE_HAND.EDGE).length, 5);
  for (let i = 1; i < SWIPE_PLAN.length; i += 1) {
    assert.notEqual(SWIPE_PLAN[i].gesture, SWIPE_PLAN[i - 1].gesture, 'each swipe starts where the last ended');
  }
});

test('the measured swipes are counted, by hand, and a wrong direction is a miss', () => {
  const nine = judgeSwipes(swipes(1));
  assert.equal(nine.rate, 0.9);
  assert.equal(nine.level, LEVEL.GOOD);
  assert.match(nine.detail, /實測 9\/10（90%）｜手掌朝前 5\/5｜手刀 4\/5/);
  const wrong = swipes(0).map((r, i) => (i === 0 ? { ...r, got: 'right' } : r));
  assert.equal(judgeSwipes(wrong).rate, 0.9);
  assert.equal(judgeSwipes(swipes(3)).level, LEVEL.BAD);
  assert.equal(judgeSwipes([]).level, LEVEL.UNKNOWN);
});

test('edge-on doing worse than palm-facing says so', () => {
  const result = judgeSwipes(swipes(2, { edgeOnly: true }));
  assert.ok(result.advice.some((line) => line.includes('手掌張開、朝向眼鏡')));
});

test('a warm cast is a hint, never worse than a warning', () => {
  assert.equal(judgeLightColour({ luma: 120, glare: 0, warmth: 1.1 }).level, LEVEL.GOOD);
  assert.equal(judgeLightColour({ luma: 120, glare: 0, warmth: 2.4 }).level, LEVEL.WARN);
});

const neutral = { luma: 120, glare: 0, warmth: 1 };
const yellowLamp = { luma: 120, glare: 0, warmth: 2 };
const noisy = { ...clearQuiet, noisyZoneRatio: 0.3 };

test('swipes work and the light is clean: the light does not get in the way', () => {
  const r = judgeEnvironment({ tofClear: clearQuiet, tofHand: handSteady, camera: neutral, swipes: swipes(0) });
  assert.equal(r.overall, LEVEL.GOOD);
  assert.equal(r.summary, '燈光不影響辨識。');
  assert.deepEqual(r.advice, []);
});

test('swipes work but the light is noisy: interference, still recognised', () => {
  const r = judgeEnvironment({ tofClear: noisy, tofHand: handSteady, camera: yellowLamp, swipes: swipes(1) });
  assert.equal(r.overall, LEVEL.WARN);
  assert.equal(r.summary, '燈光有干擾，但目前還能辨識。');
});

test('swipes fail and the light is noisy: the light is what is in the way', () => {
  const r = judgeEnvironment({ tofClear: noisy, tofHand: handSteady, camera: yellowLamp, swipes: swipes(4) });
  assert.equal(r.overall, LEVEL.BAD);
  assert.match(r.summary, /^燈光影響辨識/);
  assert.ok(r.advice.some((line) => line.includes('LED')));
});

test('swipes fail but the light is clean: it is not the light', () => {
  const r = judgeEnvironment({ tofClear: clearQuiet, tofHand: handSteady, camera: neutral, swipes: swipes(4) });
  assert.equal(r.overall, LEVEL.WARN);
  assert.match(r.summary, /^不是燈光的問題/);
  assert.ok(r.advice.some((line) => line.includes('30 公分')));
});

test('without the glasses there are no swipes, and the verdict says so', () => {
  const r = judgeEnvironment({ tofClear: null, tofHand: null, camera: neutral, swipes: [] });
  assert.equal(r.swipe.level, LEVEL.UNKNOWN);
  assert.match(r.summary, /未實測揮手/);
  assert.equal(worst(LEVEL.GOOD, LEVEL.UNKNOWN), LEVEL.UNKNOWN);
});

test('samples average, and missing ones are skipped', () => {
  const avg = averageSummaries([{ luma: 100, glare: 0, warmth: 1 }, null, { luma: 50, glare: 0.2, warmth: 2 }]);
  assert.equal(avg.samples, 2);
  assert.equal(avg.luma, 75);
  assert.equal(averageSummaries([null]), null);
});

test('the Shell bridge is read when present and never throws', () => {
  assert.equal(readTofSnapshot({}), null);
  assert.deepEqual(readTofSnapshot({ __cibarEnvironment: { tofSnapshot: () => ({ frames: 3 }) } }), { frames: 3 });
  assert.equal(readTofSnapshot({ __cibarEnvironment: { tofSnapshot: () => { throw new Error('gone'); } } }), null);
});

test('ten seconds of nobody swiping: none is good, one is a warning, two is bad', () => {
  assert.equal(judgeFalseTriggers({ count: 0, ms: FALSE_TRIGGER_MS }).level, LEVEL.GOOD);
  assert.equal(judgeFalseTriggers({ count: 1, ms: FALSE_TRIGGER_MS }).level, LEVEL.WARN);
  const bad = judgeFalseTriggers({ count: 3, ms: FALSE_TRIGGER_MS });
  assert.equal(bad.level, LEVEL.BAD);
  assert.match(bad.detail, /10 秒內沒有人揮手，誤觸 3 次/);
  assert.ok(bad.advice.some((line) => line.includes('手勢最遠距離')), 'the cure is named');
  assert.equal(judgeFalseTriggers(null).level, LEVEL.UNKNOWN);
});

test('false triggers make the verdict worse even when the light is fine', () => {
  const quiet = { tofClear: clearQuiet, tofHand: handSteady, camera: null, swipes: swipes(0) };
  assert.equal(judgeEnvironment({ ...quiet, falseTriggers: { count: 0, ms: FALSE_TRIGGER_MS } }).overall, LEVEL.GOOD);
  const one = judgeEnvironment({ ...quiet, falseTriggers: { count: 1, ms: FALSE_TRIGGER_MS } });
  assert.equal(one.overall, LEVEL.WARN);
  assert.match(one.summary, /誤觸了 1 次/);
  const many = judgeEnvironment({ ...quiet, falseTriggers: { count: 2, ms: FALSE_TRIGGER_MS } });
  assert.equal(many.overall, LEVEL.BAD);
  assert.ok(many.advice.some((line) => line.includes('訊號過濾')));
  assert.equal(judgeEnvironment(quiet).falseTrigger.level, LEVEL.UNKNOWN, 'not measured is not a failure');
  assert.equal(judgeEnvironment(quiet).overall, LEVEL.GOOD);
});
