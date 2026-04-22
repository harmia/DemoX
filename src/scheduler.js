function toThresholdEurPerMWh(maxPriceEurPerMWh, maxPriceCentsPerKWh) {
  if (typeof maxPriceEurPerMWh === 'number') return maxPriceEurPerMWh;
  if (typeof maxPriceCentsPerKWh === 'number') return maxPriceCentsPerKWh * 10;
  return null;
}

function contiguous(a, b) {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() === 60 * 60 * 1000;
}

function formatHour(isoString) {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function summarizeHourRanges(hours) {
  if (hours.length === 0) return '';

  const ranges = [];
  let start = hours[0];
  let prev = hours[0];

  for (let i = 1; i < hours.length; i += 1) {
    const current = hours[i];
    if (!contiguous(prev, current)) {
      const endHour = new Date(prev.timestamp).getTime() + 60 * 60 * 1000;
      ranges.push(`${formatHour(start.timestamp)}–${formatHour(new Date(endHour).toISOString())}`);
      start = current;
    }
    prev = current;
  }

  const finalEndHour = new Date(prev.timestamp).getTime() + 60 * 60 * 1000;
  ranges.push(`${formatHour(start.timestamp)}–${formatHour(new Date(finalEndHour).toISOString())}`);

  return ranges.join(', ');
}

function validateRequest(request) {
  const {
    earliestStart,
    latestEnd,
    requiredHours,
    requiredEnergyKWh,
    chargingPowerKw,
  } = request;

  const start = new Date(earliestStart);
  const end = new Date(latestEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid earliest start or latest end time.');
  }

  if (end <= start) {
    throw new Error('Latest end must be after earliest start.');
  }

  const hasHours = typeof requiredHours === 'number' && requiredHours > 0;
  const hasEnergy = typeof requiredEnergyKWh === 'number' && requiredEnergyKWh > 0;

  if (hasHours === hasEnergy) {
    throw new Error('Provide either required hours OR required energy (kWh).');
  }

  const power = typeof chargingPowerKw === 'number' && chargingPowerKw > 0 ? chargingPowerKw : 11;

  return { start, end, power, hasHours, hasEnergy };
}

function calculateSchedule(prices, request) {
  const {
    start,
    end,
    power,
    hasHours,
  } = validateRequest(request);

  const hoursNeeded = hasHours
    ? request.requiredHours
    : request.requiredEnergyKWh / power;

  const requiredSlots = Math.ceil(hoursNeeded);
  const maxPriceLimit = toThresholdEurPerMWh(request.maxPriceEurPerMWh, request.maxPriceCentsPerKWh);

  const withinWindow = prices.filter((p) => {
    const t = new Date(p.timestamp);
    return t >= start && t < end;
  });

  if (withinWindow.length === 0) {
    throw new Error('No pricing hours found inside selected time window.');
  }

  const filtered = maxPriceLimit === null
    ? withinWindow
    : withinWindow.filter((p) => p.eurPerMWh <= maxPriceLimit);

  if (filtered.length < requiredSlots) {
    throw new Error('Not enough eligible charging hours in selected window and price threshold.');
  }

  const selected = [...filtered]
    .sort((a, b) => (a.eurPerMWh - b.eurPerMWh) || (new Date(a.timestamp) - new Date(b.timestamp)))
    .slice(0, requiredSlots)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  let remainingHours = hoursNeeded;
  let estimatedCostEur = 0;

  for (const slot of selected) {
    const slotHours = Math.min(1, Math.max(remainingHours, 0));
    const energyKWh = slotHours * power;
    estimatedCostEur += energyKWh * (slot.eurPerMWh / 1000);
    remainingHours -= slotHours;
  }

  const summaryRanges = summarizeHourRanges(selected);

  return {
    selectedHours: selected,
    summary: `Charging scheduled: ${summaryRanges}`,
    estimatedCostEur: Number(estimatedCostEur.toFixed(2)),
    hoursNeeded: Number(hoursNeeded.toFixed(2)),
    chargingPowerKw: power,
  };
}

module.exports = {
  calculateSchedule,
  summarizeHourRanges,
};
