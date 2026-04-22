let prices = [];
let selectedHourSet = new Set();

function localDateTimeInputValue(date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

function renderChart() {
  const chart = document.getElementById('chart');
  chart.innerHTML = '';

  const max = Math.max(...prices.map((p) => p.eurPerMWh));

  prices.forEach((price) => {
    const bar = document.createElement('div');
    const date = new Date(price.timestamp);
    const hourLabel = `${String(date.getHours()).padStart(2, '0')}`;

    bar.className = `bar ${selectedHourSet.has(price.timestamp) ? 'selected' : ''}`;
    bar.style.height = `${Math.max((price.eurPerMWh / max) * 190, 12)}px`;
    bar.title = `${hourLabel}:00 - ${price.eurPerMWh} €/MWh`;

    const label = document.createElement('span');
    label.textContent = hourLabel;
    bar.appendChild(label);
    chart.appendChild(bar);
  });
}

function updateModeFields() {
  const mode = document.getElementById('targetMode').value;
  document.getElementById('durationLabel').style.display = mode === 'hours' ? 'grid' : 'none';
  document.getElementById('energyLabel').style.display = mode === 'energy' ? 'grid' : 'none';
}

async function loadPrices() {
  const response = await fetch('/api/prices');
  const data = await response.json();
  prices = data.prices;
  renderChart();
}

function initDefaults() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  document.getElementById('earliestStart').value = localDateTimeInputValue(now);
  document.getElementById('latestEnd').value = localDateTimeInputValue(end);
}

async function submitSchedule(event) {
  event.preventDefault();
  document.getElementById('error').textContent = '';

  const mode = document.getElementById('targetMode').value;
  const payload = {
    earliestStart: new Date(document.getElementById('earliestStart').value).toISOString(),
    latestEnd: new Date(document.getElementById('latestEnd').value).toISOString(),
    chargingPowerKw: Number(document.getElementById('chargingPowerKw').value),
  };

  const maxPriceRaw = document.getElementById('maxPriceEurPerMWh').value;
  if (maxPriceRaw) payload.maxPriceEurPerMWh = Number(maxPriceRaw);

  if (mode === 'hours') {
    payload.requiredHours = Number(document.getElementById('requiredHours').value);
  } else {
    payload.requiredEnergyKWh = Number(document.getElementById('requiredEnergyKWh').value);
  }

  const response = await fetch('/api/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    document.getElementById('error').textContent = data.error || 'Scheduling failed.';
    return;
  }

  selectedHourSet = new Set(data.result.selectedHours.map((h) => h.timestamp));
  renderChart();

  document.getElementById('summary').textContent = `${data.result.summary} | Estimated cost: €${data.result.estimatedCostEur}`;
}

function initThemeToggle() {
  const key = 'ev-theme';
  const current = localStorage.getItem(key);
  if (current) document.documentElement.setAttribute('data-theme', current);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(key, next);
  });
}

async function init() {
  initThemeToggle();
  initDefaults();
  updateModeFields();
  await loadPrices();

  document.getElementById('targetMode').addEventListener('change', updateModeFields);
  document.getElementById('scheduleForm').addEventListener('submit', submitSchedule);
}

init();
