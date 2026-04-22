const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { getSpotPricesNext24h, normalizeResolution } = require('./pricingService');
const { calculateSchedule } = require('./scheduler');
const { readSchedules, saveSchedule } = require('./dataStore');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/prices', async (_req, res) => {
  try {
    const resolution = normalizeResolution(_req.query.resolution);
    const source = _req.query.provider || 'mock';
    const prices = await getSpotPricesNext24h(new Date(), { resolution, provider: source });
    res.json({ source, resolution, prices });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load prices.' });
  }
});

app.get('/api/schedules', async (_req, res) => {
  try {
    const schedules = await readSchedules();
    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load schedules.' });
  }
});

app.post('/api/schedules', async (req, res) => {
  try {
    const resolution = normalizeResolution(req.body.priceResolution);
    const provider = req.body.priceProvider || 'mock';
    const prices = await getSpotPricesNext24h(new Date(), { resolution, provider });
    const result = calculateSchedule(prices, req.body);

    const schedule = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      request: req.body,
      result,
    };

    await saveSchedule(schedule);
    res.status(201).json(schedule);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid schedule request.' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`EV scheduler running on http://localhost:${port}`);
});
