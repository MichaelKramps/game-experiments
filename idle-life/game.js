const HOURS_PER_MONTH = 720; // 30-day month
const HOURS_PER_YEAR = HOURS_PER_MONTH * 12;
const TICK_MS = 1000 / 60;
const STARTING_AGE = 18;

const CASH_FLOW_PERIODS = {
  second: { suffix: '/sec', hours: 1 / 3600, decimals: 6 },
  minute: { suffix: '/min', hours: 1 / 60, decimals: 4 },
  hour: { suffix: '/hr', hours: 1, decimals: 2 },
  day: { suffix: '/day', hours: 24, decimals: 2 },
  week: { suffix: '/wk', hours: 24 * 7, decimals: 2 },
  month: { suffix: '/mo', hours: HOURS_PER_MONTH, decimals: 2 },
  year: { suffix: '/yr', hours: HOURS_PER_YEAR, decimals: 2 },
};

const state = {
  netWorth: 0,
  cash: 0,
  cashFlow: 0,
  cashFlowPeriod: 'month',
  age: STARTING_AGE,
  scene: 'start',
  flags: {},
  home: null,
  debts: [],
  assets: [],
  cashFlowItems: [],
  unlocked: { home: false, debt: false, assets: false, cashFlow: false },
  idleStarted: false,
  lastTick: 0,
};

function convertMonthlyToPeriod(monthlyAmount, periodKey) {
  const period = CASH_FLOW_PERIODS[periodKey];
  return (monthlyAmount / HOURS_PER_MONTH) * period.hours;
}

const scenes = {
  start: {
    prompt: "You've just become an adult. What's your next move?",
    choices: [
      {
        label: 'Get a Job',
        desc: 'Start earning right away.',
        next: 'job_housing',
        effect: () => {},
      },
      {
        label: 'Go to University',
        desc: 'Invest in your future first — costs money now, may pay off later.',
        next: 'university_choice',
        effect: () => {},
      },
    ],
  },

  job_housing: {
    prompt: 'You landed an entry-level job. Where will you live?',
    choices: [
      {
        label: 'Live at Home',
        desc: 'Family covers expenses. Job pays +$1,800/mo, no rent.',
        next: 'placeholder',
        effect: (s) => {
          s.home = 'Family Home';
          s.unlocked.home = true;
          s.cashFlowItems.push({ label: 'Entry-Level Job', amount: 1800 });
          s.unlocked.cashFlow = true;
          s.unlocked.assets = true;
        },
      },
      {
        label: 'Move into an Apartment',
        desc: 'More freedom. Job pays +$1,800/mo, rent costs -$900/mo.',
        next: 'placeholder',
        effect: (s) => {
          s.home = 'Apartment';
          s.unlocked.home = true;
          s.cashFlowItems.push({ label: 'Entry-Level Job', amount: 1800 });
          s.cashFlowItems.push({ label: 'Apartment Rent', amount: -900 });
          s.unlocked.cashFlow = true;
          s.unlocked.assets = true;
        },
      },
    ],
  },

  university_choice: {
    prompt: 'Which university will you attend?',
    choices: [
      {
        label: 'Community College',
        desc: '-$20,000. Affordable, but fewer connections.',
        next: 'placeholder',
        flag: 'university',
        flagValue: 'community',
        effect: (s) => {
          s.home = 'Community College';
          s.unlocked.home = true;
          s.debts.push({ label: 'Community College Tuition', amount: 20000 });
          s.unlocked.debt = true;
        },
      },
      {
        label: 'State University',
        desc: '-$60,000. Solid reputation, moderate debt.',
        next: 'placeholder',
        flag: 'university',
        flagValue: 'state',
        effect: (s) => {
          s.home = 'State University';
          s.unlocked.home = true;
          s.debts.push({ label: 'State University Tuition', amount: 60000 });
          s.unlocked.debt = true;
        },
      },
      {
        label: 'Private University',
        desc: '-$160,000. Prestige and connections, heavy debt.',
        next: 'placeholder',
        flag: 'university',
        flagValue: 'private',
        effect: (s) => {
          s.home = 'Private University';
          s.unlocked.home = true;
          s.debts.push({ label: 'Private University Tuition', amount: 160000 });
          s.unlocked.debt = true;
        },
      },
    ],
  },

  placeholder: {
    prompt: 'More of your life is still being written. Check back soon.',
    choices: [],
    startsIdle: true,
  },
};

const MONEY_TIERS = [
  { threshold: 1e12, divisor: 1e12, tierSuffix: 'T' },
  { threshold: 1e9, divisor: 1e9, tierSuffix: 'B' },
  { threshold: 1e6, divisor: 1e6, tierSuffix: 'M' },
  { threshold: 1e3, divisor: 1e3, tierSuffix: 'k' },
];

function isAbbreviated(n) {
  const abs = Math.abs(n);
  return MONEY_TIERS.some((t) => abs >= t.threshold);
}

function formatMoney(n, suffix, decimals) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const tier = MONEY_TIERS.find((t) => abs >= t.threshold);

  let numberText;
  if (tier) {
    const truncated = Math.trunc((abs / tier.divisor) * 1000) / 1000;
    numberText = `${truncated.toFixed(3)}${tier.tierSuffix}`;
  } else {
    const d = decimals || 0;
    numberText = abs.toLocaleString('en-US', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  return `${sign}$${numberText}${suffix || ''}`;
}

function formatMoneyFull(n, suffix) {
  const sign = n < 0 ? '-' : '';
  const formatted = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${formatted}${suffix || ''}`;
}

function moneyDataAttr(n, suffix) {
  if (!isAbbreviated(n)) return '';
  return ` data-money="${n}" data-money-suffix="${suffix || ''}"`;
}

function applyMoneyDataAttrs(el, n, suffix) {
  if (isAbbreviated(n)) {
    el.dataset.money = n;
    el.dataset.moneySuffix = suffix || '';
  } else {
    delete el.dataset.money;
    delete el.dataset.moneySuffix;
  }
}

function valueClass(n) {
  if (n > 0) return 'positive';
  if (n < 0) return 'negative';
  return 'neutral';
}

function recomputeCashFlow() {
  state.cashFlow = state.cashFlowItems.reduce((sum, item) => sum + item.amount, 0);
}

function recomputeNetWorth() {
  const assetsValue = state.assets.reduce((sum, a) => sum + (a.value || 0), 0);
  const debtsTotal = state.debts.reduce((sum, d) => sum + d.amount, 0);
  state.netWorth = state.cash + assetsValue - debtsTotal;
}

function tick() {
  const now = performance.now();
  const deltaGameHours = (now - state.lastTick) / 1000; // 1 real second = 1 game hour
  state.lastTick = now;

  state.age += deltaGameHours / HOURS_PER_YEAR;

  recomputeCashFlow();
  state.cash += (state.cashFlow / HOURS_PER_MONTH) * deltaGameHours;
  recomputeNetWorth();

  renderStats();
  updateActiveTooltip();
}

function startIdle() {
  if (state.idleStarted) return;
  state.idleStarted = true;
  state.lastTick = performance.now();
  setInterval(tick, TICK_MS);
}

function buildSectionCard(title, linesHtml) {
  const card = document.createElement('div');
  card.className = 'section-card';
  card.innerHTML = `<h3>${title}</h3>${linesHtml}`;
  return card;
}

function renderSections() {
  const leftEl = document.getElementById('col-left');
  const rightEl = document.getElementById('col-right');
  leftEl.innerHTML = '';
  rightEl.innerHTML = '';

  if (state.unlocked.home) {
    leftEl.appendChild(buildSectionCard('Home', `<div class="section-line"><span>${state.home}</span></div>`));
  }

  if (state.unlocked.cashFlow) {
    const period = CASH_FLOW_PERIODS[state.cashFlowPeriod];
    const lines = state.cashFlowItems.length
      ? state.cashFlowItems.map((item) => {
          const amount = convertMonthlyToPeriod(item.amount, state.cashFlowPeriod);
          return `<div class="section-line"><span>${item.label}</span><span class="${valueClass(amount)}"${moneyDataAttr(amount, period.suffix)}>${formatMoney(amount, period.suffix, period.decimals)}</span></div>`;
        }).join('')
      : '<div class="section-line"><span>No cash flow yet.</span></div>';
    rightEl.appendChild(buildSectionCard('Cash Flow', lines));
  }

  if (state.unlocked.assets) {
    const lines = state.assets.length
      ? state.assets.map((a) => `<div class="section-line"><span>${a.label}</span><span class="neutral"${moneyDataAttr(a.value || 0, '')}>${formatMoney(a.value || 0)}</span></div>`).join('')
      : '<div class="section-line"><span>No assets yet.</span></div>';
    rightEl.appendChild(buildSectionCard('Assets', lines));
  }

  if (state.unlocked.debt) {
    const lines = state.debts.length
      ? state.debts.map((d) => `<div class="section-line"><span>${d.label}</span><span class="negative"${moneyDataAttr(-d.amount, '')}>${formatMoney(-d.amount)}</span></div>`).join('')
      : '<div class="section-line"><span>No debt.</span></div>';
    rightEl.appendChild(buildSectionCard('Debt', lines));
  }
}

function renderStats() {
  document.getElementById('age-value').textContent = state.age.toFixed(4);

  const netWorthEl = document.getElementById('stat-networth');
  const cashEl = document.getElementById('stat-cash');
  const cashFlowEl = document.getElementById('stat-cashflow');

  netWorthEl.textContent = formatMoney(state.netWorth, '', 2);
  netWorthEl.className = `value ${valueClass(state.netWorth)}`;
  applyMoneyDataAttrs(netWorthEl, state.netWorth, '');

  cashEl.textContent = formatMoney(state.cash, '', 2);
  cashEl.className = `value ${valueClass(state.cash)}`;
  applyMoneyDataAttrs(cashEl, state.cash, '');

  const period = CASH_FLOW_PERIODS[state.cashFlowPeriod];
  const displayCashFlow = convertMonthlyToPeriod(state.cashFlow, state.cashFlowPeriod);
  cashFlowEl.textContent = formatMoney(displayCashFlow, period.suffix, period.decimals);
  cashFlowEl.className = `value ${valueClass(displayCashFlow)}`;
  applyMoneyDataAttrs(cashFlowEl, displayCashFlow, period.suffix);
}

function render() {
  renderStats();
  renderSections();

  const scene = scenes[state.scene];
  document.getElementById('prompt').textContent = scene.prompt;

  const choicesEl = document.getElementById('choices');
  choicesEl.innerHTML = '';
  scene.choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = `<div class="choice-label">${choice.label}</div><div class="choice-desc">${choice.desc}</div>`;
    btn.addEventListener('click', () => {
      choice.effect(state);
      if (choice.flag) state.flags[choice.flag] = choice.flagValue;
      state.scene = choice.next;
      recomputeCashFlow();
      recomputeNetWorth();
      render();
      if (scenes[state.scene].startsIdle) startIdle();
    });
    choicesEl.appendChild(btn);
  });
}

document.getElementById('cashflow-period-select').addEventListener('change', (e) => {
  state.cashFlowPeriod = e.target.value;
  render();
});

const tooltipEl = document.getElementById('tooltip');
let hoveredMoneyEl = null;

function tooltipTextFor(el) {
  return formatMoneyFull(parseFloat(el.dataset.money), el.dataset.moneySuffix);
}

function updateActiveTooltip() {
  if (hoveredMoneyEl) tooltipEl.textContent = tooltipTextFor(hoveredMoneyEl);
}

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-money]');
  if (!el) return;
  hoveredMoneyEl = el;
  tooltipEl.textContent = tooltipTextFor(el);
  tooltipEl.style.display = 'block';
});

document.addEventListener('mouseout', (e) => {
  const el = e.target.closest('[data-money]');
  if (el && el === hoveredMoneyEl) {
    hoveredMoneyEl = null;
    tooltipEl.style.display = 'none';
  }
});

document.addEventListener('mousemove', (e) => {
  if (!hoveredMoneyEl) return;
  tooltipEl.style.left = `${e.clientX + 14}px`;
  tooltipEl.style.top = `${e.clientY + 14}px`;
});

render();
