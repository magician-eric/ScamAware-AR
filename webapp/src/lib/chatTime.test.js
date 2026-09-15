import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTimestamps, formatTime } from './chatTime.js';

const msg = (from = 'emily') => ({ kind: 'msg', from, text: 'message' });

test('scripted anchors retain dynamic dates and jump between same-day periods', () => {
  const start = new Date(2026, 7, 10, 16, 42);
  const timeline = [
    { kind: 'divider', label: 'Day 5' },
    { kind: 'time-anchor', time: '08:07' },
    msg(),
    msg('user'),
    { kind: 'time-anchor', time: '12:24' },
    msg(),
  ];

  const timestamps = computeTimestamps(timeline, start, { 'Day 5': 4 });
  assert.equal(timestamps[2].getDate(), 14);
  assert.equal(formatTime(timestamps[2]), '08:07');
  assert.equal(formatTime(timestamps[3]), '08:08');
  assert.equal(timestamps[5].getDate(), 14);
  assert.equal(formatTime(timestamps[5]), '12:24');
});

test('different branch lengths stay ordered and converge on the same anchor', () => {
  const start = new Date(2026, 7, 10, 9, 0);
  for (const branchLength of [1, 2, 4]) {
    const timeline = [
      { kind: 'divider', label: 'Day 10' },
      { kind: 'time-anchor', time: '13:05' },
      ...Array.from({ length: branchLength }, (_, i) => msg(i % 2 ? 'user' : 'emily')),
      { kind: 'time-anchor', time: '22:35' },
      msg(),
      msg('user'),
    ];
    const visible = computeTimestamps(timeline, start, { 'Day 10': 9 }).filter(Boolean);
    assert.equal(formatTime(visible.at(-2)), '22:35');
    assert.ok(visible.every((time, i) => i === 0 || time >= visible[i - 1]));
  }
});

test('persisted timeline metadata reconstructs identical times after resume', () => {
  const start = new Date(2026, 7, 10, 17, 42);
  const timeline = [
    { kind: 'divider', label: 'Day 12' },
    { kind: 'time-anchor', time: '23:18', key: 'day12-time' },
    msg(),
    { kind: 'video' },
    msg('user'),
  ];
  const before = computeTimestamps(timeline, start, { 'Day 12': 11 }).map((time) => time?.getTime() ?? null);
  const restored = JSON.parse(JSON.stringify(timeline));
  const after = computeTimestamps(restored, start, { 'Day 12': 11 }).map((time) => time?.getTime() ?? null);
  assert.deepEqual(after, before);
});
