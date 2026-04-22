# EV Spot Charging Scheduler (DemoX)

A simple, shippable web app for scheduling EV charging to the cheapest spot-price hours.

## Features

- Minimal modern UI (responsive + dark mode toggle)
- Inputs:
  - Earliest start and latest end (time window)
  - Required charging duration (hours) **or** required energy (kWh)
  - Charging power (kW)
  - Optional max price threshold (€/MWh)
- Spot-price chart for next 24h with selected charging hours highlighted
- Clear summary text + estimated cost
- Mock local spot-price dataset (`data/mock-prices.json`)
- Local persistence for schedules (`data/schedules.json`)
- Small scheduling module with unit tests

## Architecture (clean and easy to extend)

- `src/pricingService.js`: pricing provider abstraction (currently mock JSON; swap with Nord Pool integration later)
- `src/scheduler.js`: pure scheduling logic + validation
- `src/dataStore.js`: local persistence (JSON)
- `src/server.js`: Express API + static frontend hosting
- `public/`: minimal frontend UI and chart rendering

## Run locally

```bash
npm install
npm start
```

Open: `http://localhost:3000`

## Run tests

```bash
npm test
```

## API

- `GET /api/prices` → next 24h mock prices
- `GET /api/schedules` → stored schedules
- `POST /api/schedules` → calculates and stores schedule

Example `POST /api/schedules` body:

```json
{
  "earliestStart": "2026-04-22T20:00:00.000Z",
  "latestEnd": "2026-04-23T06:00:00.000Z",
  "requiredHours": 3,
  "chargingPowerKw": 11,
  "maxPriceEurPerMWh": 90
}
```
