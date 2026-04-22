const fs = require('fs/promises');
const path = require('path');

const MOCK_DATA_PATH = path.join(__dirname, '..', 'data', 'mock-prices.json');

const RESOLUTION_TO_MINUTES = {
  hourly: 60,
  '15min': 15,
};

function normalizeResolution(resolution) {
  if (resolution === '15min' || resolution === '15-minute' || resolution === 'quarter-hour') {
    return '15min';
  }
  return 'hourly';
}

function alignToResolution(date, minutes) {
  const aligned = new Date(date);
  aligned.setSeconds(0, 0);
  const currentMinutes = aligned.getMinutes();
  aligned.setMinutes(currentMinutes - (currentMinutes % minutes));
  return aligned;
}

function expandHourlyToQuarterHourly(hourlyPrices) {
  return hourlyPrices.flatMap((price) => [price, price, price, price]);
}

class MockPriceProvider {
  constructor(dataPath = MOCK_DATA_PATH) {
    this.dataPath = dataPath;
    this.name = 'mock';
  }

  async getPrices({ start = new Date(), horizonHours = 24, resolution = 'hourly' } = {}) {
    const normalizedResolution = normalizeResolution(resolution);
    const minutesPerSlot = RESOLUTION_TO_MINUTES[normalizedResolution];
    const requiredSlots = Math.ceil((horizonHours * 60) / minutesPerSlot);

    const content = await fs.readFile(this.dataPath, 'utf8');
    const data = JSON.parse(content);
    const hourlyPrices = Array.isArray(data.pricesEurPerMWh) ? data.pricesEurPerMWh : null;
    const quarterHourlyFromFile = Array.isArray(data.prices15MinEurPerMWh) ? data.prices15MinEurPerMWh : null;

    if (!hourlyPrices || hourlyPrices.length < 24) {
      throw new Error('Invalid mock pricing data. Expected 24 hourly prices.');
    }

    const sourcePrices = normalizedResolution === '15min'
      ? (quarterHourlyFromFile && quarterHourlyFromFile.length >= requiredSlots
        ? quarterHourlyFromFile
        : expandHourlyToQuarterHourly(hourlyPrices))
      : hourlyPrices;

    if (sourcePrices.length < requiredSlots) {
      throw new Error('Invalid mock pricing data. Not enough prices for requested horizon.');
    }

    const alignedStart = alignToResolution(start, minutesPerSlot);
    return sourcePrices.slice(0, requiredSlots).map((eurPerMWh, index) => ({
      timestamp: new Date(alignedStart.getTime() + index * minutesPerSlot * 60 * 1000).toISOString(),
      eurPerMWh,
    }));
  }
}

class NordPoolPriceProvider {
  constructor() {
    this.name = 'nordpool';
  }

  async getPrices(_options = {}) {
    throw new Error('Nord Pool provider is not implemented yet. Use provider=mock for now.');
  }
}

module.exports = {
  MockPriceProvider,
  NordPoolPriceProvider,
  normalizeResolution,
};
