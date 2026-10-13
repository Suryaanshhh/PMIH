import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimatePlannedHours, peakAllocation, workingDays } from './allocation';

test('workingDays counts Monday to Friday only', () => {
  assert.equal(workingDays('2026-04-06', '2026-04-24'), 15); // Mon 6 Apr to Fri 24 Apr
  assert.equal(workingDays('2026-04-04', '2026-04-05'), 0); // Saturday and Sunday
  assert.equal(workingDays('2026-04-06', '2026-04-06'), 1); // single Monday
});

test('estimatePlannedHours uses percentage, weekly capacity and working days', () => {
  assert.equal(estimatePlannedHours(100, 40, '2026-04-06', '2026-04-24'), 120);
  assert.equal(estimatePlannedHours(30, 40, '2026-04-06', '2026-04-24'), 36);
  assert.equal(estimatePlannedHours(50, 20, '2026-04-06', '2026-04-10'), 10);
});

test('peakAllocation with no other allocations is just the target', () => {
  assert.deepEqual(peakAllocation({ start: '2026-04-06', end: '2026-04-24', pct: 50 }, []), { peak: 50, on: '2026-04-06' });
});

test('peakAllocation adds overlapping allocations', () => {
  const r = peakAllocation(
    { start: '2026-04-06', end: '2026-04-24', pct: 50 },
    [{ start: '2026-04-01', end: '2026-04-30', pct: 40 }, { start: '2026-04-06', end: '2026-04-24', pct: 30 }]
  );
  assert.deepEqual(r, { peak: 120, on: '2026-04-06' });
});

test('peakAllocation finds a peak that starts later inside the range', () => {
  const r = peakAllocation(
    { start: '2026-04-06', end: '2026-04-24', pct: 60 },
    [{ start: '2026-04-15', end: '2026-04-30', pct: 50 }]
  );
  assert.deepEqual(r, { peak: 110, on: '2026-04-15' });
});

test('peakAllocation ignores allocations that end before or start after the target', () => {
  const r = peakAllocation(
    { start: '2026-04-06', end: '2026-04-24', pct: 60 },
    [{ start: '2026-03-01', end: '2026-04-05', pct: 90 }, { start: '2026-04-25', end: '2026-05-31', pct: 90 }]
  );
  assert.deepEqual(r, { peak: 60, on: '2026-04-06' });
});

test('adjacent day is not an overlap for peak purposes', () => {
  const r = peakAllocation({ start: '2026-04-06', end: '2026-04-10', pct: 100 }, [{ start: '2026-04-11', end: '2026-04-17', pct: 100 }]);
  assert.equal(r.peak, 100);
});