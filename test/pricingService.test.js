const test = require('node:test');
const assert = require('node:assert/strict');
const { getSpotPricesNext24h } = require('../src/pricingService');

test('generates next 24h timestamps from provided now', async () => {
  const now = new Date('2026-04-22T10:37:44.000Z');
  const prices = await getSpotPricesNext24h(now);

  assert.equal(prices.length, 24);
  assert.equal(prices[0].timestamp, '2026-04-22T10:00:00.000Z');
  assert.equal(prices[23].timestamp, '2026-04-23T09:00:00.000Z');
});
