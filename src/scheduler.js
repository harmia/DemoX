function toThresholdEurPerMWh(maxPriceEurPerMWh, maxPriceCentsPerKWh) {
  if (typeof maxPriceEurPerMWh === 'number') return maxPriceEurPerMWh;
  if (typeof maxPriceCentsPerKWh === 'number') return maxPriceCentsPerKWh * 10;
  return null;
}

function contiguous(a, b, slotMs) {
  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() === slotMs;
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function inferSlotDurationMs(prices) {
  if (prices.length < 2) return 60 * 60 * 1000;
  const sorted = [...prices].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  let minPositiveDiff = Infinity;
  for (let i = 1; i < sorted.length; i += 1) {
    const diff = new Date(sorted[i].timestamp) - new Date(sorted[i - 1].timestamp);
    if (diff > 0 && diff < minPositiveDiff) {
      minPositiveDiff = diff;
    }
  }

  return Number.isFinite(minPositiveDiff) ? minPositiveDiff : 60 * 60 * 1000;
}

function summarizeSlotRanges(slots, slotMs) {
  if (slots.length === 0) return '';

  const ranges = [];
  let start = slots[0];
  let prev = slots[0];

  for (let i = 1; i < slots.length; i += 1) {
    const current = slots[i];
    if (!contiguous(prev, current, slotMs)) {
      const endTimestamp = new Date(prev.timestamp).getTime() + slotMs;
      ranges.push(`${formatTime(start.timestamp)}–${formatTime(new Date(endTimestamp).toISOString())}`);
      start = current;
    }
    prev = current;
  }

  const finalEndTimestamp = new Date(prev.timestamp).getTime() + slotMs;
  ranges.push(`${formatTime(start.timestamp)}–${formatTime(new Date(finalEndTimestamp).toISOString())}`);

  return ranges.join(', ');
}

function summarizeHourRanges(hours) {
  return summarizeSlotRanges(hours, 60 * 60 * 1000);
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

  const maxPriceLimit = toThresholdEurPerMWh(request.maxPriceEurPerMWh, request.maxPriceCentsPerKWh);

  const withinWindow = prices.filter((p) => {
    const t = new Date(p.timestamp);
    return t >= start && t < end;
  });

  if (withinWindow.length === 0) {
    throw new Error('No pricing hours found inside selected time window.');
  }

  const slotDurationMs = inferSlotDurationMs(withinWindow);
  const slotDurationHours = slotDurationMs / (60 * 60 * 1000);
  const requiredSlots = Math.ceil(hoursNeeded / slotDurationHours);

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
    const slotHours = Math.max(0, Math.min(slotDurationHours, remainingHours));
    const energyKWh = slotHours * power;
    estimatedCostEur += energyKWh * (slot.eurPerMWh / 1000);
    remainingHours -= slotHours;
  }

  const summaryRanges = summarizeSlotRanges(selected, slotDurationMs);

  return {
    selectedHours: selected,
    summary: `Charging scheduled: ${summaryRanges}`,
    estimatedCostEur: Number(estimatedCostEur.toFixed(2)),
    hoursNeeded: Number(hoursNeeded.toFixed(2)),
    chargingPowerKw: power,
    slotDurationMinutes: Math.round(slotDurationHours * 60),
  };
}

module.exports = {
  calculateSchedule,
  summarizeHourRanges,
};
