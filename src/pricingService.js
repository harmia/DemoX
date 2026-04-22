const { MockPriceProvider, NordPoolPriceProvider, normalizeResolution } = require('./priceProviders');

const providers = {
  mock: new MockPriceProvider(),
  nordpool: new NordPoolPriceProvider(),
};

function resolveProvider(providerName = 'mock') {
  const key = typeof providerName === 'string' ? providerName.toLowerCase() : 'mock';
  const provider = providers[key];
  if (!provider) {
    throw new Error(`Unknown price provider "${providerName}".`);
  }
  return provider;
}

async function getSpotPrices({
  now = new Date(),
  horizonHours = 24,
  resolution = 'hourly',
  provider = 'mock',
} = {}) {
  const selectedProvider = resolveProvider(provider);
  return selectedProvider.getPrices({
    start: now,
    horizonHours,
    resolution: normalizeResolution(resolution),
  });
}

async function getSpotPricesNext24h(now = new Date(), options = {}) {
  return getSpotPrices({
    now,
    horizonHours: 24,
    ...options,
  });
}

module.exports = {
  getSpotPrices,
  getSpotPricesNext24h,
  normalizeResolution,
};
