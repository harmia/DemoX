const fs = require('fs/promises');
const path = require('path');

const MOCK_DATA_PATH = path.join(__dirname, '..', 'data', 'mock-prices.json');

async function getSpotPricesNext24h(now = new Date()) {
  const content = await fs.readFile(MOCK_DATA_PATH, 'utf8');
  const data = JSON.parse(content);

  if (!Array.isArray(data.pricesEurPerMWh) || data.pricesEurPerMWh.length < 24) {
    throw new Error('Invalid mock pricing data. Expected 24 prices.');
  }

  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  return data.pricesEurPerMWh.slice(0, 24).map((eurPerMWh, index) => ({
    timestamp: new Date(start.getTime() + index * 60 * 60 * 1000).toISOString(),
    eurPerMWh,
  }));
}

module.exports = {
  getSpotPricesNext24h,
};
