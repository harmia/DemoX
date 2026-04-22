const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSchedule, summarizeHourRanges } = require('../src/scheduler');

function buildPrices() {
  const start = new Date('2026-04-22T00:00:00.000Z');
  const values = [100, 90, 80, 70, 60, 50, 40, 45, 55, 65, 75, 85];
  return values.map((eurPerMWh, i) => ({
    timestamp: new Date(start.getTime() + i * 60 * 60 * 1000).toISOString(),
    eurPerMWh,
  }));
}

test('selects cheapest hours inside time window', () => {
  const prices = buildPrices();
  const result = calculateSchedule(prices, {
    earliestStart: '2026-04-22T02:00:00.000Z',
    latestEnd: '2026-04-22T10:00:00.000Z',
    requiredHours: 3,
    chargingPowerKw: 11,
  });

  assert.equal(result.selectedHours.length, 3);
  assert.deepEqual(
    result.selectedHours.map((h) => h.eurPerMWh),
    [50, 40, 45]
  );
});

test('applies max price threshold', () => {
  const prices = buildPrices();
  assert.throws(() => calculateSchedule(prices, {
    earliestStart: '2026-04-22T00:00:00.000Z',
    latestEnd: '2026-04-22T05:00:00.000Z',
    requiredHours: 2,
    maxPriceEurPerMWh: 65,
  }), /Not enough eligible charging hours/);
});

test('summarizes non-contiguous hour ranges', () => {
  const ranges = summarizeHourRanges([
    { timestamp: '2026-04-22T02:00:00.000Z' },
    { timestamp: '2026-04-22T03:00:00.000Z' },
    { timestamp: '2026-04-22T06:00:00.000Z' },
  ]);

  assert.equal(ranges, '02:00–04:00, 06:00–07:00');
});

test('supports window crossing midnight via date range', () => {
  const prices = [
    { timestamp: '2026-04-22T22:00:00.000Z', eurPerMWh: 90 },
    { timestamp: '2026-04-22T23:00:00.000Z', eurPerMWh: 35 },
    { timestamp: '2026-04-23T00:00:00.000Z', eurPerMWh: 30 },
    { timestamp: '2026-04-23T01:00:00.000Z', eurPerMWh: 45 },
  ];

  const result = calculateSchedule(prices, {
    earliestStart: '2026-04-22T23:00:00.000Z',
    latestEnd: '2026-04-23T02:00:00.000Z',
    requiredHours: 2,
    chargingPowerKw: 11,
  });

  assert.deepEqual(
    result.selectedHours.map((h) => h.eurPerMWh),
    [35, 30]
  );
});
