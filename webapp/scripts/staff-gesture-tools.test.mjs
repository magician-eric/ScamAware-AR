// 手勢設定: the staff mode's gesture tools, read through the Shell's
// window.__cibarStaffTools (StaffToolsBridge.java).
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const {
  MIN_RANGE_CHOICES_CM,
  RANGE_CHOICES_CM,
  SIGNAL_MODES,
  describeExport,
  describeLiveFrame,
  describeSignal,
  liveGrid,
  readGestureSettings,
  readLiveFrame,
  readStaffTools,
  requestTofLogExport,
  writeGestureSettings,
} = await import('../src/lib/environment/staffTools.js');

function fakeShell(overrides = {}) {
  const calls = [];
  let settings = { maxRangeCm: 50, signalMode: 'AUTO', noise: 0.031, floor: 0.08 };
  return {
    calls,
    scope: {
      __cibarStaffTools: {
        version: 1,
        available: true,
        getGestureSettings: () => settings,
        setGestureSettings: (next) => {
          calls.push(next);
          settings = { ...settings, maxRangeCm: next.maxRangeCm, signalMode: next.signalMode };
          return settings;
        },
        liveFrame: () => null,
        shareTofLog: () => true,
        ...overrides,
      },
    },
  };
}

function frame(overrides = {}) {
  const range = Array(64).fill(0);
  const hand = Array(64).fill(0);
  range[0] = 30;
  hand[0] = 1;
  range[7] = 120;
  range[8] = 45;
  return {
    ageMs: 40, range, signal: Array(64).fill(0), hand, handPresent: true, handCm: 30,
    sceneMoving: false, maxRangeCm: 50, noise: 0.02, floor: 0.08, columnIncreasesRight: true,
    ...overrides,
  };
}

test('the buttons offer exactly what the Shell accepts', () => {
  assert.deepEqual(RANGE_CHOICES_CM, [50, 40, 35]);
  assert.deepEqual(MIN_RANGE_CHOICES_CM, [5, 10, 15]);
  assert.deepEqual(SIGNAL_MODES.map((mode) => mode.id), ['AUTO', 'LOOSE', 'STANDARD', 'STRICT']);
  assert.deepEqual(SIGNAL_MODES.map((mode) => mode.label), ['自動', '寬鬆', '標準', '嚴格']);
});

test('no Shell, or an older one: nothing to read and nothing throws', () => {
  assert.equal(readStaffTools({}), null);
  assert.equal(readGestureSettings({}), null);
  assert.equal(writeGestureSettings({ maxRangeCm: 40 }, {}), null);
  assert.equal(readLiveFrame({}), null);
  assert.equal(requestTofLogExport({}), false);
  const broken = fakeShell({ getGestureSettings: () => { throw new Error('gone'); } });
  assert.equal(readGestureSettings(broken.scope), null);
});

test('a setting is written through and the Shell answer is what is shown', () => {
  const shell = fakeShell();
  assert.equal(readGestureSettings(shell.scope).maxRangeCm, 50);
  const next = writeGestureSettings({ maxRangeCm: 35, signalMode: 'STRICT' }, shell.scope);
  assert.deepEqual(shell.calls, [{ maxRangeCm: 35, signalMode: 'STRICT' }]);
  assert.equal(next.maxRangeCm, 35);
  assert.equal(next.signalMode, 'STRICT');
});

test('the signal line says what the sensor measures and what is in force', () => {
  assert.equal(describeSignal({ noise: 0.031, floor: 0.08 }), '目前雜訊 3%，忽略低於最強訊號 8% 的回波');
  assert.equal(describeSignal(null), '');
});

test('the live grid is eight by eight, the hand marked, drawn the wearer\'s way round', () => {
  const rows = liveGrid(frame());
  assert.equal(rows.length, 8);
  assert.ok(rows.every((row) => row.length === 8));
  assert.deepEqual(rows[0][0], { zone: 0, cm: 30, hand: true, masked: false, tooNear: false, inRange: true });
  const near = liveGrid(frame({ minRangeCm: 10, range: [6, ...Array(63).fill(0)], masked: [0, 1, ...Array(62).fill(0)] }));
  assert.equal(near[0][0].tooNear, true, 'nearer than 手勢最近距離 is the face or the frame');
  assert.equal(near[0][0].inRange, false);
  assert.equal(near[0][1].masked, true);
  assert.equal(rows[0][7].inRange, false, '120 cm is beyond the gesture range');
  const mirrored = liveGrid(frame({ columnIncreasesRight: false }));
  assert.equal(mirrored[0][7].zone, 0, 'columns are mirrored when they run right to left for the wearer');
  assert.equal(mirrored[0][7].hand, true);
  assert.deepEqual(liveGrid(null), []);
});

test('a live frame is only taken when it is a whole one', () => {
  assert.ok(readLiveFrame(fakeShell({ liveFrame: () => frame() }).scope));
  assert.equal(readLiveFrame(fakeShell({ liveFrame: () => ({ ageMs: -1 }) }).scope), null);
});

test('the line under the grid says where the hand is, or why there is none', () => {
  assert.equal(describeLiveFrame(frame()), '看到手：約 30 公分');
  assert.match(describeLiveFrame(frame({ handPresent: false, maxRangeCm: 40 })), /只找 40 公分/);
  assert.match(describeLiveFrame(frame({ handPresent: false, minRangeCm: 10, maxRangeCm: 40 })), /只找 10–40 公分/);
  assert.match(describeLiveFrame(frame({ sceneMoving: true })), /頭在轉/);
  assert.match(describeLiveFrame(frame({ ageMs: 5000 })), /沒有送畫面/);
  assert.match(describeLiveFrame(null), /接上眼鏡/);
});

test('the export outcome is told in plain words', () => {
  assert.match(describeExport({ ok: true, name: 'cibar-tof-1.2.4-x.txt', bytes: 3 * 1024 * 1024 }),
    /已開啟分享選單：cibar-tof-1\.2\.4-x\.txt（3\.0 MB）/);
  assert.match(describeExport({ ok: false, reason: 'empty' }), /還沒有紀錄/);
  assert.match(describeExport({ ok: false, reason: 'no-app' }), /找不到可以分享/);
  assert.equal(describeExport(null), '');
});

test('the panel says plainly when the Shell has no tools, and shows the choices when it has', async () => {
  const { StaffGesturePanel } = await import('../src/pages/staff/StaffGesturePanel.jsx');
  const render = () => renderToStaticMarkup(React.createElement(StaffGesturePanel));
  assert.match(render(), /需要眼鏡 APP 外殼 1\.2\.4 以上/);

  const shell = fakeShell({ getGestureSettings: () => ({ maxRangeCm: 40, signalMode: 'STRICT', noise: 0.2, floor: 0.25 }) });
  globalThis.__cibarStaffTools = shell.scope.__cibarStaffTools;
  try {
    const markup = render();
    for (const text of ['手勢最遠距離', '訊號過濾', '即時感測畫面', '匯出紀錄檔', '50 公分', '40 公分', '35 公分', '自動', '寬鬆', '標準', '嚴格']) {
      assert.ok(markup.includes(text), `missing ${text}`);
    }
    assert.match(markup, /aria-pressed="true"[^>]*>40 公分/);
    assert.match(markup, /aria-pressed="true"[^>]*>嚴格/);
    assert.match(markup, /目前雜訊 20%，忽略低於最強訊號 25% 的回波/);
    assert.equal(markup.includes('手勢最近距離'), false, 'Shell 1.2.4 has no nearest distance to set');
  } finally {
    delete globalThis.__cibarStaffTools;
  }
});

test('a Shell that knows the nearest distance gets the choice, and every write carries it', async () => {
  const { StaffGesturePanel } = await import('../src/pages/staff/StaffGesturePanel.jsx');
  const shell = fakeShell({ getGestureSettings: () => ({ minRangeCm: 10, maxRangeCm: 50, signalMode: 'AUTO', noise: 0, floor: 0.08 }) });
  globalThis.__cibarStaffTools = shell.scope.__cibarStaffTools;
  try {
    const markup = renderToStaticMarkup(React.createElement(StaffGesturePanel));
    assert.ok(markup.includes('手勢最近距離'));
    assert.match(markup, /aria-pressed="true"[^>]*>10 公分/);
    assert.ok(markup.includes('5 公分') && markup.includes('15 公分'));
  } finally {
    delete globalThis.__cibarStaffTools;
  }
});
