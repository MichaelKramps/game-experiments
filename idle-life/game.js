const HOURS_PER_MONTH = 720; // 30-day month
const HOURS_PER_YEAR = HOURS_PER_MONTH * 12;
const TICK_MS = 1000 / 60;
const STARTING_AGE = 18;
const PART_TIME_JOB_PAY = 900; // half of the entry-level job
const INDEX_FUND_STARTING_PRICE = 100;
const INDEX_FUND_GROWTH_RATE = 0.07; // 7% APR share price appreciation, compounds every tick
const INDEX_FUND_DIVIDEND_YIELD = 0.02; // 2% APR dividend on current holdings value
const EXTRA_PAYMENT_AMOUNTS = [100, 1000, 10000];
const DEBT_INTEREST_RATE = 0.05; // 5% APR, compounds every tick

const MAX_JOB_UNITS = 1.5;
const FULLTIME_JOB_UNITS = 1;
const PARTTIME_JOB_UNITS = 0.5;
const SIDE_HUSTLE_UNITS = 0.5;
const BUSINESS_UNITS = 1.5;
const SIDE_HUSTLE_COST = 500;
const BUSINESS_COST = 20000;
const VENTURE_BASE_FAIL_CHANCE = 90; // percent, before attempt discount
const VENTURE_FAIL_CHANCE_PER_ATTEMPT = 5; // percent discount per prior attempt
const VENTURE_INCOME_BASE = 250; // side hustle $/mo scale; businesses scaled by VENTURE_BUSINESS_MULTIPLIER
const VENTURE_INCOME_PER_ATTEMPT = 25; // side hustle $/mo scale per prior attempt; businesses scaled by VENTURE_BUSINESS_MULTIPLIER
const VENTURE_BUSINESS_MULTIPLIER = 25;
const VENTURE_VALUE_MONTHS = 24; // a side hustle/business is valued at 2 years of its current monthly income
const SIDE_HUSTLE_DEVELOP_MONTHS = 3; // time before a side hustle's outcome is known
const BUSINESS_DEVELOP_MONTHS = 9; // time before a business's outcome is known
const EDUCATION_VENTURE_MULTIPLIERS = { community: 2, state: 4, private: 6 };
const UNIVERSITY_ENROLLMENT_YEARS = { community: 2, state: 4, private: 4 };
const FULLTIME_JOB_BASE_PAY = 1800; // no college
const APARTMENT_RENT_AMOUNT = -900;
const ADULT_DEPENDENT_COST = 600; // $/mo cost of living per adult dependent
const CHILD_DEPENDENT_COST = 400; // $/mo cost of living per child dependent

// Happiness is a 1-10 score bucketed into 5 levels, ordered lowest to highest.
const HAPPINESS_LEVELS = [
  { key: 'miserable', label: 'Miserable', min: 1, max: 2 },
  { key: 'unhappy', label: 'Unhappy', min: 3, max: 4 },
  { key: 'neutral', label: 'Neutral', min: 5, max: 6 },
  { key: 'happy', label: 'Happy', min: 7, max: 8 },
  { key: 'lovingLife', label: 'Loving Life', min: 9, max: 10 },
];

const HAPPINESS_BASE_SCORE = 6;
const HAPPINESS_MIN_SCORE = 1;
const HAPPINESS_MAX_SCORE = 10;

// Total job units -> happiness points. Covers every value reachable under
// the current 1.5-unit job cap (0, 0.5, 1, 1.5).
const JOB_WORKLOAD_HAPPINESS_POINTS = { 0: 2, 0.5: 1, 1: 0, 1.5: -1 };

// Single source of truth for every happiness modifier — add new ones here.
const HAPPINESS_MODIFIERS = [
  {
    key: 'debtFree',
    label: 'Debt Free',
    points: () => (state.debts.every((d) => d.principal <= 0) ? 2 : 0),
  },
  {
    key: 'cashFlowNegative',
    label: 'Cash Flow Negative',
    points: () => (state.cashFlow < 0 ? -2 : 0),
  },
  {
    key: 'jobWorkload',
    label: 'Job Workload',
    points: () => JOB_WORKLOAD_HAPPINESS_POINTS[totalJobUnits()] ?? 0,
  },
];
const FULLTIME_JOB_PAY_BY_EDUCATION = { community: 3600, state: 7200, private: 10800 };

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
  jobs: [],
  nextJobId: 1,
  sideHustleAttempts: 0,
  businessAttempts: 0,
  indexFundPrice: INDEX_FUND_STARTING_PRICE,
  indexFundShares: 0,
  indexFundBuyQuantity: 1,
  adultDependents: 1, // the player themself
  childDependents: 0,
  happiness: 'neutral',
  happinessScore: 6,
  happinessHours: { miserable: 0, unhappy: 0, neutral: 0, happy: 0, lovingLife: 0 },
  extraPaymentAmount: 1000,
  graduatesAtAge: null,
  housedAfterGraduation: false,
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
          s.jobs.push({ id: s.nextJobId++, type: 'fulltime', label: 'Entry-Level Job', units: FULLTIME_JOB_UNITS, amount: FULLTIME_JOB_BASE_PAY });
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
          s.jobs.push({ id: s.nextJobId++, type: 'fulltime', label: 'Entry-Level Job', units: FULLTIME_JOB_UNITS, amount: FULLTIME_JOB_BASE_PAY });
          s.cashFlowItems.push({ label: 'Apartment Rent', amount: APARTMENT_RENT_AMOUNT });
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
          s.graduatesAtAge = STARTING_AGE + UNIVERSITY_ENROLLMENT_YEARS.community;
          s.jobs.push({ id: s.nextJobId++, type: 'fulltime', label: 'Full-Time Job', units: FULLTIME_JOB_UNITS, amount: 0 });
          s.debts.push({
            label: 'Community College Tuition',
            principal: 20000,
            interestRate: DEBT_INTEREST_RATE,
            minPayment: 20000 * 0.01,
            interestPaid: 0,
            isTuition: true,
          });
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
          s.graduatesAtAge = STARTING_AGE + UNIVERSITY_ENROLLMENT_YEARS.state;
          s.jobs.push({ id: s.nextJobId++, type: 'fulltime', label: 'Full-Time Job', units: FULLTIME_JOB_UNITS, amount: 0 });
          s.debts.push({
            label: 'State University Tuition',
            principal: 60000,
            interestRate: DEBT_INTEREST_RATE,
            minPayment: 60000 * 0.01,
            interestPaid: 0,
            isTuition: true,
          });
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
          s.graduatesAtAge = STARTING_AGE + UNIVERSITY_ENROLLMENT_YEARS.private;
          s.jobs.push({ id: s.nextJobId++, type: 'fulltime', label: 'Full-Time Job', units: FULLTIME_JOB_UNITS, amount: 0 });
          s.debts.push({
            label: 'Private University Tuition',
            principal: 160000,
            interestRate: DEBT_INTEREST_RATE,
            minPayment: 160000 * 0.01,
            interestPaid: 0,
            isTuition: true,
          });
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

function indexFundValue() {
  return state.indexFundShares * state.indexFundPrice;
}

function indexFundMonthlyDividend() {
  return (indexFundValue() * INDEX_FUND_DIVIDEND_YIELD) / 12;
}

function costOfLivingMonthly() {
  return -((state.adultDependents * ADULT_DEPENDENT_COST) + (state.childDependents * CHILD_DEPENDENT_COST));
}

function recomputeCashFlow() {
  const jobsFlow = state.jobs.reduce((sum, j) => sum + j.amount, 0);
  const itemsFlow = state.cashFlowItems.reduce((sum, item) => sum + item.amount, 0);
  const debtPaymentsFlow = state.debts.reduce((sum, d) => sum - (d.principal > 0 && !isDebtPaymentPaused(d) ? d.minPayment : 0), 0);
  state.cashFlow = jobsFlow + itemsFlow + debtPaymentsFlow + indexFundMonthlyDividend() + costOfLivingMonthly();
}

function totalJobUnits() {
  return state.jobs.reduce((sum, j) => sum + j.units, 0);
}

function isStudent() {
  return Boolean(state.flags.university) && state.age < state.graduatesAtAge;
}

function getOccupation() {
  if (isStudent()) return 'Student';
  if (!state.jobs.length) return state.cashFlow > 0 ? 'Retired' : 'Unemployed';
  const ranked = [...state.jobs].sort((a, b) => (b.units - a.units) || (b.amount - a.amount));
  return ranked[0].label;
}

// Tuition debt still accrues interest while enrolled, but payments are
// deferred until graduation — no cash flow hit, no principal reduction.
function isDebtPaymentPaused(debt) {
  return Boolean(debt.isTuition) && isStudent();
}

function fullTimeJobPay() {
  if (isStudent()) return 0;
  return FULLTIME_JOB_PAY_BY_EDUCATION[state.flags.university] ?? FULLTIME_JOB_BASE_PAY;
}

function ventureFailChance(attempts) {
  return Math.max(0, VENTURE_BASE_FAIL_CHANCE - VENTURE_FAIL_CHANCE_PER_ATTEMPT * attempts);
}

// Success odds pool side hustle and business attempts together, so trying
// either kind improves the odds for both.
function totalVentureAttempts() {
  return state.sideHustleAttempts + state.businessAttempts;
}

// Maps a uniform 0-1 roll onto a cubic curve (x^3), which is still 0 at 0 and
// 1 at 1 but skews low: a 0.5 roll yields 0.125, a 0.8 roll yields 0.512.
function cubicRoll() {
  const raw = Math.random();
  const weighted = raw ** 3;
  return { raw, weighted };
}

// Reserves this venture's attempt number the moment the player commits (pays
// the cost and starts developing), so quitting/restarting later gets a fresh
// number even though the outcome isn't rolled until development finishes.
function startVentureAttempt(kind) {
  const attemptsKey = kind === 'business' ? 'businessAttempts' : 'sideHustleAttempts';
  const attemptsPrior = state[attemptsKey];
  state[attemptsKey] = attemptsPrior + 1;
  return { attemptsPrior, attemptNumber: attemptsPrior + 1 };
}

// Gambles on a side hustle/business attempt once its development period ends.
// Uses `attemptsPrior` = prior tries at this venture type (0-indexed, captured
// at start time), so the 9th attempt (8 prior) lands exactly on a 50% fail
// chance and the 19th (18 prior) is the first guaranteed-nonzero try.
function resolveVentureOutcome(kind, attemptsPrior) {
  const isBusiness = kind === 'business';
  const multiplier = isBusiness ? VENTURE_BUSINESS_MULTIPLIER : 1;
  // Success odds pool side hustle and business attempts together, for both
  // venture types — so trying either kind improves the odds for both, and
  // 18 combined attempts guarantees success for either kind.
  const failChance = ventureFailChance(totalVentureAttempts());
  const failRoll = Math.random() * 100;
  const isFailure = failRoll < failChance;
  const educationMultiplier = EDUCATION_VENTURE_MULTIPLIERS[state.flags.university] || 1;

  let baseRoll = { raw: 0, weighted: 0 };
  let attemptRoll = { raw: 0, weighted: 0 };
  let baseComponent = 0;
  let attemptComponent = 0;
  let amount = 0;

  if (!isFailure) {
    baseRoll = cubicRoll();
    attemptRoll = cubicRoll();
    baseComponent = VENTURE_INCOME_BASE * multiplier * baseRoll.weighted;
    attemptComponent = VENTURE_INCOME_PER_ATTEMPT * multiplier * attemptsPrior * attemptRoll.weighted;
    amount = (baseComponent + attemptComponent) * educationMultiplier;
  }

  console.log(`[${isBusiness ? 'Business' : 'Side Hustle'} attempt #${attemptsPrior + 1}] calculation:`, {
    combinedAttemptsForOdds: totalVentureAttempts(),
    failChancePercent: failChance,
    failRoll,
    isFailure,
    ...(isFailure ? {} : {
      ownAttemptsForReward: attemptsPrior,
      businessMultiplier: multiplier,
      educationMultiplier,
      baseRandomRaw: baseRoll.raw,
      baseRandomCubed: baseRoll.weighted,
      attemptRandomRaw: attemptRoll.raw,
      attemptRandomCubed: attemptRoll.weighted,
      baseComponent: `${VENTURE_INCOME_BASE} * ${multiplier} * ${baseRoll.weighted} = ${baseComponent}`,
      attemptComponent: `${VENTURE_INCOME_PER_ATTEMPT} * ${multiplier} * ${attemptsPrior} * ${attemptRoll.weighted} = ${attemptComponent}`,
      preEducationTotal: baseComponent + attemptComponent,
    }),
    finalAmount: amount,
  });

  return amount;
}

function isVentureJob(job) {
  return job.type === 'sidehustle' || job.type === 'business';
}

function ventureValue(job) {
  return job.amount * VENTURE_VALUE_MONTHS;
}

function ventureDisplayLabel(job) {
  return job.developing ? `Developing ${job.label}` : job.label;
}

function jobLineText(job) {
  const unitsText = `${job.units} job${job.units === 1 ? '' : 's'}`;
  if (job.developing) {
    const monthsRemaining = Math.max(0, job.developHoursRemaining / HOURS_PER_MONTH);
    return `${ventureDisplayLabel(job)} — ${unitsText}, ${monthsRemaining.toFixed(2)} months remaining`;
  }
  if (job.type === 'fulltime' && isStudent()) {
    const yearsRemaining = Math.max(0, state.graduatesAtAge - state.age);
    return `${job.label} (Studying) — ${unitsText}, ${yearsRemaining.toFixed(2)} years until graduation`;
  }
  return `${job.label} (${unitsText})`;
}

function jobLineNeedsLiveUpdate(job) {
  return Boolean(job.developing) || (job.type === 'fulltime' && isStudent());
}

function recomputeNetWorth() {
  const assetsValue = state.assets.reduce((sum, a) => sum + (a.value || 0), 0);
  const venturesValue = state.jobs.filter(isVentureJob).reduce((sum, j) => sum + ventureValue(j), 0);
  const debtsTotal = state.debts.reduce((sum, d) => sum + d.principal, 0);
  state.netWorth = state.cash + assetsValue + indexFundValue() + venturesValue - debtsTotal;
}

function advanceSimulation(deltaGameHours) {
  state.age += deltaGameHours / HOURS_PER_YEAR;

  state.indexFundPrice += state.indexFundPrice * INDEX_FUND_GROWTH_RATE * (deltaGameHours / HOURS_PER_YEAR);

  let debtPaidOff = false;
  state.debts.forEach((d) => {
    if (d.principal <= 0) return;
    const interest = d.principal * d.interestRate * (deltaGameHours / HOURS_PER_YEAR);
    const paymentPortion = isDebtPaymentPaused(d) ? 0 : d.minPayment * (deltaGameHours / HOURS_PER_MONTH);
    d.interestPaid += interest;
    d.principal += interest - paymentPortion;
    if (d.principal <= 0) {
      d.principal = 0;
      debtPaidOff = true;
    }
  });

  let ventureResolved = false;
  state.jobs.forEach((job) => {
    if (!job.developing) return;
    job.developHoursRemaining -= deltaGameHours;
    if (job.developHoursRemaining <= 0) {
      job.amount = resolveVentureOutcome(job.type, job.attemptsPrior);
      job.developing = false;
      delete job.developHoursRemaining;
      ventureResolved = true;
    }
  });

  let graduationOccurred = false;
  state.jobs.forEach((job) => {
    if (job.type !== 'fulltime') return;
    const newPay = fullTimeJobPay();
    if (newPay !== job.amount) {
      job.amount = newPay;
      graduationOccurred = true;
    }
  });

  if (state.flags.university && !isStudent() && !state.housedAfterGraduation) {
    state.home = 'Apartment';
    state.cashFlowItems.push({ label: 'Apartment Rent', amount: APARTMENT_RENT_AMOUNT });
    state.housedAfterGraduation = true;
    graduationOccurred = true;
  }

  recomputeCashFlow();

  const happinessScore = computeHappinessScore();
  const happinessLevel = happinessLevelForScore(happinessScore);
  const happinessLevelChanged = happinessLevel !== state.happiness;
  state.happiness = happinessLevel;
  state.happinessScore = happinessScore;
  state.happinessHours[happinessLevel] += deltaGameHours;

  state.cash += (state.cashFlow / HOURS_PER_MONTH) * deltaGameHours;
  recomputeNetWorth();

  return debtPaidOff || ventureResolved || graduationOccurred || happinessLevelChanged;
}

function tick() {
  const now = performance.now();
  const deltaGameHours = (now - state.lastTick) / 1000; // 1 real second = 1 game hour
  state.lastTick = now;

  const needsFullRender = advanceSimulation(deltaGameHours);

  renderStats();
  updateActiveTooltip();

  if (needsFullRender) {
    render();
  } else {
    updateDebtBalances();
    updateJobDevelopmentDisplays();
    updateActionAvailability();
    updateInvestmentDisplays();
    updateHappinessDisplay();
    updateScrollIndicator();
  }
}

const FAST_FORWARD_STEP_HOURS = 1; // simulate in small hourly steps so interest/growth compound the same as real-time ticking

function fastForward(totalHours) {
  let remaining = totalHours;
  while (remaining > 0) {
    const step = Math.min(FAST_FORWARD_STEP_HOURS, remaining);
    advanceSimulation(step);
    remaining -= step;
  }
  state.lastTick = performance.now();
  render();
}

function startIdle() {
  if (state.idleStarted) return;
  state.idleStarted = true;
  state.unlocked.assets = true;
  state.unlocked.cashFlow = true;
  state.lastTick = performance.now();
  setInterval(tick, TICK_MS);
  render();
}

function buildSectionCard(title, linesHtml) {
  const card = document.createElement('div');
  card.className = 'section-card';
  card.innerHTML = `<h3>${title}</h3>${linesHtml}`;
  return card;
}

function happinessLabel(key) {
  const level = HAPPINESS_LEVELS.find((l) => l.key === key);
  return level ? level.label : key;
}

function computeHappinessScore() {
  const total = HAPPINESS_BASE_SCORE + HAPPINESS_MODIFIERS.reduce((sum, m) => sum + m.points(), 0);
  return Math.max(HAPPINESS_MIN_SCORE, Math.min(HAPPINESS_MAX_SCORE, total));
}

function happinessLevelForScore(score) {
  const level = HAPPINESS_LEVELS.find((l) => score >= l.min && score <= l.max);
  return level ? level.key : 'neutral';
}

function happinessDisplayText() {
  return `${happinessLabel(state.happiness)} (${state.happinessScore}/10)`;
}

function buildHappinessCard() {
  return buildSectionCard('Happiness', `<div class="section-line"><span id="happiness-value" data-tooltip-type="happiness-history">${happinessDisplayText()}</span></div>`);
}

function updateHappinessDisplay() {
  const el = document.getElementById('happiness-value');
  if (el) el.textContent = happinessDisplayText();
}

function renderSections() {
  const leftEl = document.getElementById('col-left');
  const rightEl = document.getElementById('col-right');
  leftEl.innerHTML = '';
  rightEl.innerHTML = '';

  leftEl.appendChild(buildHappinessCard());

  if (state.unlocked.home) {
    leftEl.appendChild(buildSectionCard('Home', `<div class="section-line"><span>${state.home}</span></div>`));
    leftEl.appendChild(buildSectionCard('Occupation', `<div class="section-line"><span>${getOccupation()}</span></div>`));
  }

  if (state.unlocked.cashFlow) {
    const period = CASH_FLOW_PERIODS[state.cashFlowPeriod];
    const jobItems = state.jobs.map((j) => ({ label: ventureDisplayLabel(j), amount: j.amount }));
    const debtPaymentItems = state.debts
      .filter((d) => d.principal > 0 && !isDebtPaymentPaused(d))
      .map((d) => ({ label: `${d.label} Payment`, amount: -d.minPayment }));
    const dividendItems = state.indexFundShares > 0
      ? [{ label: 'Index Fund Dividends', amount: indexFundMonthlyDividend(), id: 'cashflow-index-fund-dividend' }]
      : [];
    const costOfLivingItems = (state.adultDependents + state.childDependents) > 0
      ? [{ label: 'Cost of Living', amount: costOfLivingMonthly() }]
      : [];
    const allItems = [...jobItems, ...state.cashFlowItems, ...debtPaymentItems, ...dividendItems, ...costOfLivingItems];
    const lines = allItems.length
      ? allItems.map((item) => {
          const amount = convertMonthlyToPeriod(item.amount, state.cashFlowPeriod);
          const idAttr = item.id ? ` id="${item.id}"` : '';
          return `<div class="section-line"><span>${item.label}</span><span class="${valueClass(amount)}"${idAttr}${moneyDataAttr(amount, period.suffix)}>${formatMoney(amount, period.suffix, period.decimals)}</span></div>`;
        }).join('')
      : '<div class="section-line"><span>No cash flow yet.</span></div>';
    rightEl.appendChild(buildSectionCard('Cash Flow', lines));
  }

  if (state.unlocked.assets) {
    const fundLine = state.indexFundShares > 0
      ? `<div class="section-line"><span>Index Fund (${state.indexFundShares} shares)</span><span class="neutral" id="asset-value-index-fund"${moneyDataAttr(indexFundValue(), '')}>${formatMoney(indexFundValue(), '', 2)}</span></div>`
      : '';
    const ventureLines = state.jobs
      .filter(isVentureJob)
      .map((j) => `<div class="section-line"><span>${ventureDisplayLabel(j)}</span><span class="neutral"${moneyDataAttr(ventureValue(j), '')}>${formatMoney(ventureValue(j), '', 2)}</span></div>`)
      .join('');
    const otherLines = state.assets.map((a) => `<div class="section-line"><span>${a.label}</span><span class="neutral"${moneyDataAttr(a.value || 0, '')}>${formatMoney(a.value || 0)}</span></div>`).join('');
    const lines = fundLine + ventureLines + otherLines || '<div class="section-line"><span>No assets yet.</span></div>';
    rightEl.appendChild(buildSectionCard('Assets', lines));
  }

  if (state.unlocked.debt) {
    const lines = state.debts.length
      ? state.debts.map((d, i) => `<div class="section-line"><span data-tooltip-type="debt-interest" data-debt-index="${i}">${d.label}</span><span class="negative" id="debt-balance-${i}"${moneyDataAttr(-d.principal, '')}>${formatMoney(-d.principal)}</span></div>`).join('')
      : '<div class="section-line"><span>No debt.</span></div>';
    rightEl.appendChild(buildSectionCard('Debt', lines));
  }
}

function updateInvestmentDisplays() {
  if (state.unlocked.assets) {
    const el = document.getElementById('asset-value-index-fund');
    if (el) {
      el.textContent = formatMoney(indexFundValue(), '', 2);
      applyMoneyDataAttrs(el, indexFundValue(), '');
    }
  }

  const priceEl = document.getElementById('index-fund-price-display');
  if (priceEl) priceEl.textContent = formatMoney(state.indexFundPrice * state.indexFundBuyQuantity, '', 2);

  const dividendEl = document.getElementById('cashflow-index-fund-dividend');
  if (dividendEl) {
    const period = CASH_FLOW_PERIODS[state.cashFlowPeriod];
    const amount = convertMonthlyToPeriod(indexFundMonthlyDividend(), state.cashFlowPeriod);
    dividendEl.textContent = formatMoney(amount, period.suffix, period.decimals);
    dividendEl.className = valueClass(amount);
    applyMoneyDataAttrs(dividendEl, amount, period.suffix);
  }
}

function updateDebtBalances() {
  if (!state.unlocked.debt) return;
  state.debts.forEach((d, i) => {
    const el = document.getElementById(`debt-balance-${i}`);
    if (!el) return;
    el.textContent = formatMoney(-d.principal);
    applyMoneyDataAttrs(el, -d.principal, '');
  });
}

function updateJobDevelopmentDisplays() {
  state.jobs.forEach((job) => {
    if (!jobLineNeedsLiveUpdate(job)) return;
    const el = document.getElementById(`job-line-${job.id}`);
    if (el) el.textContent = jobLineText(job);
  });
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

function renderSceneChoices() {
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

function makeActionButton(id, label, desc, onClick) {
  const btn = document.createElement('button');
  btn.className = 'choice-btn';
  btn.id = id;
  btn.innerHTML = `<div class="choice-label">${label}</div><div class="choice-desc">${desc}</div>`;
  btn.addEventListener('click', onClick);
  return btn;
}

const INDEX_FUND_BUY_QUANTITIES = [1, 10, 100];

function buildBuyIndexFundControl() {
  const btn = document.createElement('button');
  btn.className = 'choice-btn';
  btn.id = 'action-buy-index-fund';

  const labelEl = document.createElement('div');
  labelEl.className = 'choice-label';
  labelEl.textContent = 'Buy Index Fund Shares';

  const quantitySelect = document.createElement('select');
  quantitySelect.id = 'index-fund-quantity-select';
  quantitySelect.className = 'period-select';
  INDEX_FUND_BUY_QUANTITIES.forEach((qty) => {
    const option = document.createElement('option');
    option.value = qty;
    option.textContent = `${qty} Share${qty === 1 ? '' : 's'}`;
    if (qty === state.indexFundBuyQuantity) option.selected = true;
    quantitySelect.appendChild(option);
  });
  // Nested inside the button for layout, but must not trigger a purchase
  // when the player is just opening/choosing from the dropdown.
  ['click', 'mousedown', 'change'].forEach((eventName) => {
    quantitySelect.addEventListener(eventName, (e) => e.stopPropagation());
  });
  quantitySelect.addEventListener('change', (e) => {
    state.indexFundBuyQuantity = Number(e.target.value);
    render();
  });

  const descEl = document.createElement('div');
  descEl.className = 'choice-desc';
  descEl.innerHTML = `<span id="index-fund-price-display">${formatMoney(state.indexFundPrice * state.indexFundBuyQuantity, '', 2)}</span> total. Adds to your net worth as an asset.`;

  btn.appendChild(labelEl);
  btn.appendChild(quantitySelect);
  btn.appendChild(descEl);

  btn.addEventListener('click', () => {
    const qty = state.indexFundBuyQuantity;
    const totalCost = state.indexFundPrice * qty;
    if (state.cash < totalCost) return;
    state.cash -= totalCost;
    state.indexFundShares += qty;
    recomputeCashFlow();
    recomputeNetWorth();
    render();
  });
  btn.disabled = state.cash < state.indexFundPrice * state.indexFundBuyQuantity;

  return btn;
}

function buildExtraPaymentControl(debt, index) {
  const btn = document.createElement('button');
  btn.className = 'choice-btn';
  btn.id = `action-extra-payment-${index}`;

  const labelEl = document.createElement('div');
  labelEl.className = 'choice-label';
  labelEl.textContent = `Extra Payment on ${debt.label}`;

  const amountSelect = document.createElement('select');
  amountSelect.id = `extra-payment-amount-select-${index}`;
  amountSelect.className = 'period-select';
  EXTRA_PAYMENT_AMOUNTS.forEach((amt) => {
    const option = document.createElement('option');
    option.value = amt;
    option.textContent = formatMoney(amt);
    if (amt === state.extraPaymentAmount) option.selected = true;
    amountSelect.appendChild(option);
  });
  // Nested inside the button for layout, but must not trigger a payment
  // when the player is just opening/choosing from the dropdown.
  ['click', 'mousedown', 'change'].forEach((eventName) => {
    amountSelect.addEventListener(eventName, (e) => e.stopPropagation());
  });
  amountSelect.addEventListener('change', (e) => {
    state.extraPaymentAmount = Number(e.target.value);
    render();
  });

  const descEl = document.createElement('div');
  descEl.className = 'choice-desc';
  descEl.textContent = 'Pay toward the principal.';

  btn.appendChild(labelEl);
  btn.appendChild(amountSelect);
  btn.appendChild(descEl);

  btn.addEventListener('click', () => {
    const payment = Math.min(state.extraPaymentAmount, state.cash, debt.principal);
    if (payment <= 0) return;
    state.cash -= payment;
    debt.principal = Math.max(0, debt.principal - payment);
    recomputeCashFlow();
    recomputeNetWorth();
    render();
  });
  btn.disabled = state.cash < state.extraPaymentAmount;

  return btn;
}

function buildJobGroup() {
  const jobGroup = document.createElement('div');
  jobGroup.className = 'action-group';
  jobGroup.innerHTML = `<h4>Job (${totalJobUnits()}/${MAX_JOB_UNITS})</h4>`;

  state.jobs.forEach((job) => {
    const line = document.createElement('div');
    line.className = 'section-line';
    line.innerHTML = `<span id="job-line-${job.id}">${jobLineText(job)}</span>`;
    jobGroup.appendChild(line);

    if (job.developing) {
      const btn = makeActionButton(
        `action-quit-job-${job.id}`,
        `Quit ${ventureDisplayLabel(job)}`,
        'Still developing — you must wait for the outcome before you can quit.',
        () => {},
      );
      btn.disabled = true;
      btn.querySelector('.choice-label').style.color = '#ff5566';
      jobGroup.appendChild(btn);
      return;
    }

    const isEnrolledFulltime = job.type === 'fulltime' && isStudent();
    const sellable = isVentureJob(job) && ventureValue(job) > 0;
    jobGroup.appendChild(makeActionButton(
      `action-quit-job-${job.id}`,
      isEnrolledFulltime ? 'Drop Out of College' : (sellable ? `Sell ${job.label}` : `Quit ${job.label}`),
      isEnrolledFulltime
        ? 'Leaves school before graduating. You will be treated as though you never attended college — your tuition debt remains.'
        : (sellable
          ? `Adds ${formatMoney(ventureValue(job), '', 2)} to your cash. Frees up job slots.`
          : 'Frees up job slots. No refund on any starting cost already paid.'),
      () => {
        const proceedWithQuit = () => {
          if (sellable) state.cash += ventureValue(job);
          state.jobs = state.jobs.filter((j) => j.id !== job.id);
          recomputeCashFlow();
          recomputeNetWorth();
          render();
        };

        if (isEnrolledFulltime) {
          showConfirmModal(
            'Are you sure you want to drop out of college? You will be treated as though you never attended — your tuition debt remains, but you will not graduate or earn a degree.',
            () => {
              delete state.flags.university;
              state.graduatesAtAge = null;
              proceedWithQuit();
            },
            { confirmLabel: 'Drop Out', cancelLabel: 'Stay in School' },
          );
          return;
        }

        proceedWithQuit();
      },
    ));
  });

  const units = totalJobUnits();

  if (!state.jobs.some((j) => j.type === 'fulltime')) {
    const wouldExceed = units + FULLTIME_JOB_UNITS > MAX_JOB_UNITS;
    const studying = isStudent();
    const btn = makeActionButton(
      'action-fulltime',
      'Get a Full-Time Job',
      wouldExceed
        ? `Counts as 1 job — would exceed your ${MAX_JOB_UNITS} job limit. Quit a job first.`
        : studying
          ? `Counts as 1 job. You're still in school — this job won't pay until you graduate in ${Math.max(0, state.graduatesAtAge - state.age).toFixed(2)} years.`
          : `+${formatMoney(fullTimeJobPay(), '/mo')}. Counts as 1 job (max ${MAX_JOB_UNITS} at once).`,
      () => {
        state.jobs.push({ id: state.nextJobId++, type: 'fulltime', label: 'Full-Time Job', units: FULLTIME_JOB_UNITS, amount: fullTimeJobPay() });
        recomputeCashFlow();
        recomputeNetWorth();
        render();
      },
    );
    btn.disabled = wouldExceed;
    jobGroup.appendChild(btn);
  }

  if (!state.jobs.some((j) => j.type === 'parttime')) {
    const wouldExceed = units + PARTTIME_JOB_UNITS > MAX_JOB_UNITS;
    const btn = makeActionButton(
      'action-parttime',
      'Get a Part-Time Job',
      wouldExceed
        ? `+${formatMoney(PART_TIME_JOB_PAY, '/mo')}. Counts as 0.5 jobs — would exceed your ${MAX_JOB_UNITS} job limit. Quit a job first.`
        : `+${formatMoney(PART_TIME_JOB_PAY, '/mo')}. Counts as 0.5 jobs (max ${MAX_JOB_UNITS} at once).`,
      () => {
        state.jobs.push({ id: state.nextJobId++, type: 'parttime', label: 'Part-Time Job', units: PARTTIME_JOB_UNITS, amount: PART_TIME_JOB_PAY });
        recomputeCashFlow();
        recomputeNetWorth();
        render();
      },
    );
    btn.disabled = wouldExceed;
    jobGroup.appendChild(btn);
  }

  if (!state.jobs.some((j) => j.type === 'sidehustle')) {
    const wouldExceed = units + SIDE_HUSTLE_UNITS > MAX_JOB_UNITS;
    const failChance = ventureFailChance(totalVentureAttempts());
    const btn = makeActionButton(
      'action-sidehustle',
      'Start a Side Hustle',
      wouldExceed
        ? `Costs ${formatMoney(SIDE_HUSTLE_COST)}. Counts as 0.5 jobs — would exceed your ${MAX_JOB_UNITS} job limit. Quit a job first.`
        : `Costs ${formatMoney(SIDE_HUSTLE_COST)}. Counts as 0.5 jobs. Takes ${SIDE_HUSTLE_DEVELOP_MONTHS} months to find out if it pans out — ${failChance}% chance it earns $0/mo. Odds improve each time you try.`,
      () => {
        if (state.cash < SIDE_HUSTLE_COST || totalJobUnits() + SIDE_HUSTLE_UNITS > MAX_JOB_UNITS) return;
        state.cash -= SIDE_HUSTLE_COST;
        const { attemptsPrior, attemptNumber } = startVentureAttempt('sidehustle');
        state.jobs.push({
          id: state.nextJobId++,
          type: 'sidehustle',
          label: `Side Hustle (Attempt ${attemptNumber})`,
          units: SIDE_HUSTLE_UNITS,
          amount: 0,
          developing: true,
          developHoursRemaining: SIDE_HUSTLE_DEVELOP_MONTHS * HOURS_PER_MONTH,
          attemptsPrior,
        });
        recomputeCashFlow();
        recomputeNetWorth();
        render();
      },
    );
    btn.disabled = wouldExceed || state.cash < SIDE_HUSTLE_COST;
    jobGroup.appendChild(btn);
  }

  if (!state.jobs.some((j) => j.type === 'business')) {
    const wouldExceed = units + BUSINESS_UNITS > MAX_JOB_UNITS;
    const failChance = ventureFailChance(totalVentureAttempts());
    const btn = makeActionButton(
      'action-business',
      'Start a Business',
      wouldExceed
        ? `Costs ${formatMoney(BUSINESS_COST)}. Counts as 1.5 jobs — would exceed your ${MAX_JOB_UNITS} job limit. Quit a job first.`
        : `Costs ${formatMoney(BUSINESS_COST)}. Counts as 1.5 jobs. Takes ${BUSINESS_DEVELOP_MONTHS} months to find out if it pans out — ${failChance}% chance it earns $0/mo. Odds improve each time you try.`,
      () => {
        if (state.cash < BUSINESS_COST || totalJobUnits() + BUSINESS_UNITS > MAX_JOB_UNITS) return;
        state.cash -= BUSINESS_COST;
        const { attemptsPrior, attemptNumber } = startVentureAttempt('business');
        state.jobs.push({
          id: state.nextJobId++,
          type: 'business',
          label: `Startup Business (Attempt ${attemptNumber})`,
          units: BUSINESS_UNITS,
          amount: 0,
          developing: true,
          developHoursRemaining: BUSINESS_DEVELOP_MONTHS * HOURS_PER_MONTH,
          attemptsPrior,
        });
        recomputeCashFlow();
        recomputeNetWorth();
        render();
      },
    );
    btn.disabled = wouldExceed || state.cash < BUSINESS_COST;
    jobGroup.appendChild(btn);
  }

  return jobGroup;
}

function renderIdleActions() {
  document.getElementById('prompt').textContent = 'Life goes on. Keep building your income, assets, and pay down debt.';

  const choicesEl = document.getElementById('choices');
  choicesEl.innerHTML = '';

  choicesEl.appendChild(buildJobGroup());

  const investGroup = document.createElement('div');
  investGroup.className = 'action-group';
  investGroup.innerHTML = '<h4>Investments</h4>';
  investGroup.appendChild(buildBuyIndexFundControl());
  choicesEl.appendChild(investGroup);

  const activeDebts = state.debts.filter((d) => d.principal > 0);
  if (activeDebts.length) {
    const debtGroup = document.createElement('div');
    debtGroup.className = 'action-group';
    debtGroup.innerHTML = '<h4>Debt</h4>';
    state.debts.forEach((d, i) => {
      if (d.principal <= 0) return;
      debtGroup.appendChild(buildExtraPaymentControl(d, i));
    });
    choicesEl.appendChild(debtGroup);
  }
}

function updateActionAvailability() {
  const buyBtn = document.getElementById('action-buy-index-fund');
  if (buyBtn) buyBtn.disabled = state.cash < state.indexFundPrice * state.indexFundBuyQuantity;

  state.debts.forEach((d, i) => {
    const btn = document.getElementById(`action-extra-payment-${i}`);
    if (btn) btn.disabled = state.cash < state.extraPaymentAmount || d.principal <= 0;
  });

  const units = totalJobUnits();

  const sideHustleBtn = document.getElementById('action-sidehustle');
  if (sideHustleBtn) sideHustleBtn.disabled = state.cash < SIDE_HUSTLE_COST || units + SIDE_HUSTLE_UNITS > MAX_JOB_UNITS;

  const businessBtn = document.getElementById('action-business');
  if (businessBtn) businessBtn.disabled = state.cash < BUSINESS_COST || units + BUSINESS_UNITS > MAX_JOB_UNITS;
}

function render() {
  renderStats();
  renderSections();

  if (state.idleStarted) {
    renderIdleActions();
  } else {
    renderSceneChoices();
  }

  updateScrollIndicator();
}

document.getElementById('cashflow-period-select').addEventListener('change', (e) => {
  state.cashFlowPeriod = e.target.value;
  render();
});

document.getElementById('fast-forward-month').addEventListener('click', () => fastForward(HOURS_PER_MONTH));
document.getElementById('fast-forward-year').addEventListener('click', () => fastForward(HOURS_PER_YEAR));

const scrollContainerEl = document.getElementById('col-middle-scroll');
const scrollIndicatorEl = document.getElementById('scroll-down-indicator');

function updateScrollIndicator() {
  const hasMoreBelow = scrollContainerEl.scrollHeight - scrollContainerEl.scrollTop - scrollContainerEl.clientHeight > 4;
  scrollIndicatorEl.classList.toggle('visible', hasMoreBelow);
}

scrollContainerEl.addEventListener('scroll', updateScrollIndicator);
window.addEventListener('resize', updateScrollIndicator);
scrollIndicatorEl.addEventListener('click', () => {
  scrollContainerEl.scrollTo({ top: scrollContainerEl.scrollHeight, behavior: 'smooth' });
});

const modalOverlayEl = document.getElementById('modal-overlay');
const modalMessageEl = document.getElementById('modal-message');
const modalCancelBtn = document.getElementById('modal-cancel');
const modalConfirmBtn = document.getElementById('modal-confirm');

function showConfirmModal(message, onConfirm, options = {}) {
  const { confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = options;
  modalMessageEl.textContent = message;
  modalConfirmBtn.textContent = confirmLabel;
  modalCancelBtn.textContent = cancelLabel;
  modalOverlayEl.classList.add('visible');

  const cleanup = () => {
    modalOverlayEl.classList.remove('visible');
    modalConfirmBtn.removeEventListener('click', handleConfirm);
    modalCancelBtn.removeEventListener('click', handleCancel);
  };
  const handleConfirm = () => {
    cleanup();
    onConfirm();
  };
  const handleCancel = () => cleanup();

  modalConfirmBtn.addEventListener('click', handleConfirm);
  modalCancelBtn.addEventListener('click', handleCancel);
}

const tooltipEl = document.getElementById('tooltip');
let hoveredMoneyEl = null;

function tooltipTextFor(el) {
  if (el.dataset.tooltipType === 'debt-interest') {
    const debt = state.debts[Number(el.dataset.debtIndex)];
    if (!debt) return '';
    const ratePct = (debt.interestRate * 100).toFixed(1);
    return `${ratePct}% APR — ${formatMoneyFull(debt.interestPaid)} interest accrued to date`;
  }
  if (el.dataset.tooltipType === 'happiness-history') {
    const scoreLines = [
      `Score: ${state.happinessScore}/10 (${happinessLabel(state.happiness)})`,
      `Base: ${HAPPINESS_BASE_SCORE >= 0 ? '+' : ''}${HAPPINESS_BASE_SCORE}`,
      ...HAPPINESS_MODIFIERS.map((m) => {
        const points = m.points();
        return `${m.label}: ${points >= 0 ? '+' : ''}${points}`;
      }),
    ];
    const timeLines = HAPPINESS_LEVELS
      .map((level) => `${level.label}: ${(state.happinessHours[level.key] / HOURS_PER_YEAR).toFixed(2)} yrs`);
    return [...scoreLines, '', 'Time in each state:', ...timeLines].join('\n');
  }
  return formatMoneyFull(parseFloat(el.dataset.money), el.dataset.moneySuffix);
}

function updateActiveTooltip() {
  if (hoveredMoneyEl) tooltipEl.textContent = tooltipTextFor(hoveredMoneyEl);
}

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-money], [data-tooltip-type]');
  if (!el) return;
  hoveredMoneyEl = el;
  tooltipEl.textContent = tooltipTextFor(el);
  tooltipEl.style.display = 'block';
});

document.addEventListener('mouseout', (e) => {
  const el = e.target.closest('[data-money], [data-tooltip-type]');
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
