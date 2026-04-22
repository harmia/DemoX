let prices = [];
let selectedHourSet = new Set();

function localDateTimeInputValue(date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

function formatHour(dateLike) {
  const date = new Date(dateLike);
  return `${String(date.getHours()).padStart(2, '0')}:00`;
}

function formatHourRange(timestamp) {
  const start = new Date(timestamp);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return `${formatHour(start)}–${formatHour(end)}`;
}

function updateTooltipPosition(event, tooltip) {
  const panel = document.querySelector('.chartPanel');
  const rect = panel.getBoundingClientRect();
  const x = Math.min(Math.max(event.clientX - rect.left, 28), rect.width - 28);
  const y = Math.max(event.clientY - rect.top - 8, 14);

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function renderChart() {
  const chart = document.getElementById('chart');
  const tooltip = document.getElementById('chartTooltip');
  chart.innerHTML = '';

  if (prices.length === 0) return;

  const max = Math.max(...prices.map((p) => p.eurPerMWh));

  prices.forEach((price) => {
    const bar = document.createElement('div');
    const date = new Date(price.timestamp);
    const hour = date.getHours();

    bar.className = `bar ${selectedHourSet.has(price.timestamp) ? 'selected' : ''}`;
    bar.style.height = `${Math.max((price.eurPerMWh / max) * 176, 12)}px`;
    bar.title = `${formatHourRange(price.timestamp)} • ${price.eurPerMWh} €/MWh`;

    bar.addEventListener('mouseenter', (event) => {
      tooltip.hidden = false;
      tooltip.textContent = bar.title;
      updateTooltipPosition(event, tooltip);
    });

    bar.addEventListener('mousemove', (event) => {
      updateTooltipPosition(event, tooltip);
    });

    bar.addEventListener('mouseleave', () => {
      tooltip.hidden = true;
    });

    if (hour % 3 === 0) {
      const label = document.createElement('span');
      label.textContent = String(hour).padStart(2, '0');
      bar.appendChild(label);
    }

    chart.appendChild(bar);
  });
}

function renderTimeline() {
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';

  prices.forEach((price) => {
    const slot = document.createElement('div');
    const date = new Date(price.timestamp);
    const hour = date.getHours();
    const isSelected = selectedHourSet.has(price.timestamp);

    slot.className = `timelineSlot ${isSelected ? 'on' : ''}`;
    slot.title = `${formatHourRange(price.timestamp)} • ${isSelected ? 'Charging ON' : 'Charging OFF'}`;

    if (hour % 3 === 0) {
      const tick = document.createElement('span');
      tick.className = 'tick';
      tick.textContent = String(hour).padStart(2, '0');
      slot.appendChild(tick);
    }

    timeline.appendChild(slot);
  });
}

function triggerUpdateAnimation() {
  const chart = document.getElementById('chart');
  const timeline = document.getElementById('timeline');
  const summary = document.getElementById('summary');

  [chart, timeline, summary].forEach((el) => {
    el.classList.remove('animate-update');
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.classList.add('animate-update');
  });

  window.setTimeout(() => {
    [chart, timeline, summary].forEach((el) => el.classList.remove('animate-update'));
  }, 900);
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
  renderTimeline();
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
  renderTimeline();
  triggerUpdateAnimation();

  document.getElementById('summary').textContent = `${data.result.summary} | Estimated cost: €${data.result.estimatedCostEur}`;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function initThemeToggle() {
  const key = 'ev-theme';
  const storedTheme = localStorage.getItem(key);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme(initialTheme);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem(key, nextTheme);
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
