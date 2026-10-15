// 現場環境檢測: the judgement the staff mode shows after its two windows.
import assert from 'node:assert/strict';
import test from 'node:test';

const {
  LEVEL,
  averageSummaries,
  judgeCamera,
  judgeEnvironment,
  judgeLightColour,
  judgeTof,
  readTofSnapshot,
  summarizePixels,
  worst,
} = await import('../src/lib/environment/environmentCheck.js');

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

test('dark and glaring scenes cost image recognition', () => {
  assert.equal(judgeCamera({ luma: 120, glare: 0.02, warmth: 1 }).level, LEVEL.GOOD);
  assert.equal(judgeCamera({ luma: 45, glare: 0, warmth: 1 }).level, LEVEL.WARN);
  assert.equal(judgeCamera({ luma: 20, glare: 0, warmth: 1 }).level, LEVEL.BAD);
  assert.equal(judgeCamera({ luma: 140, glare: 0.3, warmth: 1 }).level, LEVEL.BAD);
  assert.equal(judgeCamera(null).level, LEVEL.UNKNOWN);
});

test('a warm cast is a hint, never worse than a warning', () => {
  assert.equal(judgeLightColour({ luma: 120, glare: 0, warmth: 1.1 }).level, LEVEL.GOOD);
  assert.equal(judgeLightColour({ luma: 120, glare: 0, warmth: 2.4 }).level, LEVEL.WARN);
});

test('the overall verdict is the worst of the three, with all the advice', () => {
  const all = judgeEnvironment({ tofClear: clearQuiet, tofHand: handSteady, camera: { luma: 120, glare: 0, warmth: 1 } });
  assert.equal(all.overall, LEVEL.GOOD);
  assert.deepEqual(all.advice, []);
  const yellow = judgeEnvironment({ tofClear: { ...clearQuiet, noisyZoneRatio: 0.3 }, tofHand: handSteady, camera: { luma: 120, glare: 0, warmth: 2 } });
  assert.equal(yellow.overall, LEVEL.BAD);
  assert.equal(yellow.advice.length, 2);
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
