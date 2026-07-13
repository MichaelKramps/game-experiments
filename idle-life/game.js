const HOURS_PER_DAY = 24;
const HOURS_PER_MONTH = HOURS_PER_DAY * 30; // 30-day month
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
const JOB_UNIT_LOCKED_MESSAGE = 'You must quit a job';
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

const HOME_TIERS = [
  { key: 'starter', label: 'Starter Home', price: 200000 },
  { key: 'midsize', label: 'Mid-size Home', price: 400000 },
  { key: 'luxury', label: 'Luxury Home', price: 800000 },
];
const HOME_DOWN_PAYMENT_RATIO = 0.2;
const HOME_MORTGAGE_RATE = 0.06; // 6% APR, amortized like a 30-year fixed mortgage
const HOME_MORTGAGE_TERM_YEARS = 30;
const HOME_APPRECIATION_RATE = 0.035; // 3.5% APR value appreciation, compounds every tick

const RENTAL_TIERS = [
  { key: 'single', label: 'Small Rental', price: 150000, selfManageJobUnits: 0.2 },
  { key: 'duplex', label: 'Duplex', price: 350000, selfManageJobUnits: 0.3 },
  { key: 'apartment', label: 'Apartment Complex', price: 800000, selfManageJobUnits: 0.4 },
];
const RENTAL_DOWN_PAYMENT_RATIO = 0.25;
const RENTAL_MORTGAGE_RATE = 0.065; // 6.5% APR, amortized like a 30-year fixed mortgage
const RENTAL_MORTGAGE_TERM_YEARS = 30;
const RENTAL_APPRECIATION_RATE = 0.035; // 3.5% APR value appreciation, compounds every tick
const RENTAL_GROSS_RENT_YIELD = 0.09; // APR gross rent as a fraction of current property value
const RENTAL_SELF_MANAGE_EXPENSE_RATIO = 0.2; // of gross rent, maintenance/vacancy
const RENTAL_MANAGEMENT_FEE_RATIO = 0.15; // of gross rent, extra cut when paying a management company

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

// state.home label -> happiness points. Anything unlisted (e.g. university
// housing while enrolled) defaults to neutral.
const HOME_HAPPINESS_POINTS = {
  'Childhood Home': -2,
  Apartment: -1,
  'Starter Home': 0,
  'Mid-size Home': 1,
  'Luxury Home': 2,
};

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
  {
    key: 'housing',
    label: 'Housing',
    points: () => HOME_HAPPINESS_POINTS[state.home] ?? 0,
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
  ownedHome: null,
  debts: [],
  assets: [],
  rentalProperties: [],
  nextRentalId: 1,
  rentalManagementChoice: 'managed',
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
          s.home = 'Childhood Home';
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

// Standard fixed-payment mortgage amortization, matching how a real 30-year
// fixed mortgage's payment is derived from principal/rate/term.
function calculateMortgagePayment(principal, annualRate, termYears) {
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  const growth = (1 + monthlyRate) ** numPayments;
  return (principal * monthlyRate * growth) / (growth - 1);
}

function rentalGrossRentMonthly(rental) {
  return (rental.value * RENTAL_GROSS_RENT_YIELD) / 12;
}

// Rent scales with the property's current (appreciated) value, same as how
// index fund dividends scale with current share value.
function rentalNetIncomeMonthly(rental) {
  const expenseRatio = rental.selfManaged
    ? RENTAL_SELF_MANAGE_EXPENSE_RATIO
    : RENTAL_SELF_MANAGE_EXPENSE_RATIO + RENTAL_MANAGEMENT_FEE_RATIO;
  return rentalGrossRentMonthly(rental) * (1 - expenseRatio);
}

function totalRentalNetIncomeMonthly() {
  return state.rentalProperties.reduce((sum, r) => sum + rentalNetIncomeMonthly(r), 0);
}

function recomputeCashFlow() {
  const jobsFlow = state.jobs.reduce((sum, j) => sum + j.amount, 0);
  const itemsFlow = state.cashFlowItems.reduce((sum, item) => sum + item.amount, 0);
  const debtPaymentsFlow = state.debts.reduce((sum, d) => sum - (d.principal > 0 && !isDebtPaymentPaused(d) ? d.minPayment : 0), 0);
  state.cashFlow = jobsFlow + itemsFlow + debtPaymentsFlow + indexFundMonthlyDividend() + totalRentalNetIncomeMonthly() + costOfLivingMonthly();
}

function totalJobUnits() {
  const jobUnits = state.jobs.reduce((sum, j) => sum + j.units, 0);
  const rentalUnits = state.rentalProperties
    .filter((r) => r.selfManaged)
    .reduce((sum, r) => sum + r.jobUnits, 0);
  return jobUnits + rentalUnits;
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

const PROGRESS_RING_SIZE = 44;
const PROGRESS_RING_RADIUS = 16;
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;

function developmentProgressFraction(job) {
  if (!job.developing || !job.developHoursTotal) return 0;
  const elapsed = job.developHoursTotal - job.developHoursRemaining;
  return Math.max(0, Math.min(1, elapsed / job.developHoursTotal));
}

function progressRingOffset(fraction) {
  return PROGRESS_RING_CIRCUMFERENCE * (1 - fraction);
}

function buildDevelopmentProgressIcon(job) {
  const offset = progressRingOffset(developmentProgressFraction(job));
  const center = PROGRESS_RING_SIZE / 2;
  return `<svg class="progress-ring" width="${PROGRESS_RING_SIZE}" height="${PROGRESS_RING_SIZE}" viewBox="0 0 ${PROGRESS_RING_SIZE} ${PROGRESS_RING_SIZE}" aria-label="Development progress">
    <circle class="progress-ring-bg" cx="${center}" cy="${center}" r="${PROGRESS_RING_RADIUS}" />
    <circle class="progress-ring-fill" id="job-progress-${job.id}" cx="${center}" cy="${center}" r="${PROGRESS_RING_RADIUS}" stroke-dasharray="${PROGRESS_RING_CIRCUMFERENCE}" stroke-dashoffset="${offset}" />
  </svg>`;
}

function buyHome(tier) {
  if (state.ownedHome) return;
  const downPayment = tier.price * HOME_DOWN_PAYMENT_RATIO;
  if (state.cash < downPayment) return;
  const financed = tier.price - downPayment;
  state.cash -= downPayment;
  const debt = {
    label: `${tier.label} Mortgage`,
    principal: financed,
    interestRate: HOME_MORTGAGE_RATE,
    minPayment: calculateMortgagePayment(financed, HOME_MORTGAGE_RATE, HOME_MORTGAGE_TERM_YEARS),
    interestPaid: 0,
    isMortgage: true,
  };
  state.debts.push(debt);
  state.ownedHome = { key: tier.key, label: tier.label, value: tier.price, debt };
  state.home = tier.label;
  state.cashFlowItems = state.cashFlowItems.filter((item) => item.label !== 'Apartment Rent');
  // Buying a home (even mid-college) must stop the graduation auto-apartment
  // logic from later overwriting it with a rented apartment.
  state.housedAfterGraduation = true;
  state.unlocked.debt = true;
}

function sellHome() {
  if (!state.ownedHome) return;
  const equity = Math.max(0, state.ownedHome.value - state.ownedHome.debt.principal);
  state.cash += equity;
  state.debts = state.debts.filter((d) => d !== state.ownedHome.debt);
  state.ownedHome = null;
  state.home = 'Apartment';
  state.cashFlowItems.push({ label: 'Apartment Rent', amount: APARTMENT_RENT_AMOUNT });
}

function buyRentalProperty(tier, selfManaged) {
  const downPayment = tier.price * RENTAL_DOWN_PAYMENT_RATIO;
  if (state.cash < downPayment) return;
  if (selfManaged && totalJobUnits() + tier.selfManageJobUnits > MAX_JOB_UNITS) return;
  const financed = tier.price - downPayment;
  state.cash -= downPayment;
  const debt = {
    label: `${tier.label} Mortgage`,
    principal: financed,
    interestRate: RENTAL_MORTGAGE_RATE,
    minPayment: calculateMortgagePayment(financed, RENTAL_MORTGAGE_RATE, RENTAL_MORTGAGE_TERM_YEARS),
    interestPaid: 0,
    isMortgage: true,
  };
  state.debts.push(debt);
  state.rentalProperties.push({
    id: state.nextRentalId++,
    key: tier.key,
    label: tier.label,
    value: tier.price,
    debt,
    selfManaged,
    jobUnits: tier.selfManageJobUnits,
  });
  state.unlocked.debt = true;
}

function sellRentalProperty(rental) {
  const equity = Math.max(0, rental.value - rental.debt.principal);
  state.cash += equity;
  state.debts = state.debts.filter((d) => d !== rental.debt);
  state.rentalProperties = state.rentalProperties.filter((r) => r !== rental);
}

function toggleRentalManagement(rental) {
  if (rental.selfManaged) {
    rental.selfManaged = false;
    return;
  }
  if (totalJobUnits() + rental.jobUnits > MAX_JOB_UNITS) return;
  rental.selfManaged = true;
}

function totalAssetsValue() {
  const assetsValue = state.assets.reduce((sum, a) => sum + (a.value || 0), 0);
  const venturesValue = state.jobs.filter(isVentureJob).reduce((sum, j) => sum + ventureValue(j), 0);
  const homeValue = state.ownedHome ? state.ownedHome.value : 0;
  const rentalsValue = state.rentalProperties.reduce((sum, r) => sum + r.value, 0);
  return indexFundValue() + assetsValue + venturesValue + homeValue + rentalsValue;
}

function totalDebtValue() {
  return state.debts.reduce((sum, d) => sum + d.principal, 0);
}

function recomputeNetWorth() {
  state.netWorth = state.cash + totalAssetsValue() - totalDebtValue();
}

function advanceSimulation(deltaGameHours) {
  state.age += deltaGameHours / HOURS_PER_YEAR;

  state.indexFundPrice += state.indexFundPrice * INDEX_FUND_GROWTH_RATE * (deltaGameHours / HOURS_PER_YEAR);

  if (state.ownedHome) {
    state.ownedHome.value += state.ownedHome.value * HOME_APPRECIATION_RATE * (deltaGameHours / HOURS_PER_YEAR);
  }
  state.rentalProperties.forEach((r) => {
    r.value += r.value * RENTAL_APPRECIATION_RATE * (deltaGameHours / HOURS_PER_YEAR);
  });

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
  const deltaGameHours = ((now - state.lastTick) / 1000) * HOURS_PER_DAY; // 1 real second = 1 game day
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

function buildCashFlowTotalRow() {
  const period = CASH_FLOW_PERIODS[state.cashFlowPeriod];
  const displayCashFlow = convertMonthlyToPeriod(state.cashFlow, state.cashFlowPeriod);

  const row = document.createElement('div');
  row.className = 'section-line total-line';

  const labelEl = document.createElement('span');
  labelEl.textContent = 'Total';

  const valueWrap = document.createElement('span');
  valueWrap.className = 'total-value-wrap';

  const valueEl = document.createElement('span');
  valueEl.id = 'cashflow-total-value';
  valueEl.className = valueClass(displayCashFlow);
  valueEl.textContent = formatMoney(displayCashFlow, period.suffix, period.decimals);
  applyMoneyDataAttrs(valueEl, displayCashFlow, period.suffix);

  const periodSelect = document.createElement('select');
  periodSelect.id = 'cashflow-period-select';
  periodSelect.className = 'period-select';
  Object.keys(CASH_FLOW_PERIODS).forEach((key) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `per ${key}`;
    if (key === state.cashFlowPeriod) option.selected = true;
    periodSelect.appendChild(option);
  });
  periodSelect.addEventListener('change', (e) => {
    state.cashFlowPeriod = e.target.value;
    render();
  });

  valueWrap.appendChild(periodSelect);
  valueWrap.appendChild(valueEl);
  row.appendChild(labelEl);
  row.appendChild(valueWrap);
  return row;
}

function buildAssetsTotalRow() {
  const total = totalAssetsValue();
  const row = document.createElement('div');
  row.className = 'section-line total-line';
  row.innerHTML = `<span>Total</span><span class="${valueClass(total)}" id="asset-total-value"${moneyDataAttr(total, '')}>${formatMoney(total, '', 2)}</span>`;
  return row;
}

function buildDebtTotalRow() {
  const total = -totalDebtValue();
  const row = document.createElement('div');
  row.className = 'section-line total-line';
  row.innerHTML = `<span>Total</span><span class="${valueClass(total)}" id="debt-total-value"${moneyDataAttr(total, '')}>${formatMoney(total)}</span>`;
  return row;
}

// Builds the Cash Flow line items ordered biggest positive to biggest
// negative, except a rental's mortgage payment always stays directly below
// that rental's rent regardless of the payment's own size, since they're
// really one purchase decision split into two lines.
function buildCashFlowLines() {
  const jobItems = state.jobs.map((j) => ({ label: ventureDisplayLabel(j), amount: j.amount }));
  const otherItems = state.cashFlowItems.map((item) => ({ label: item.label, amount: item.amount }));
  const dividendItems = state.indexFundShares > 0
    ? [{ label: 'Index Fund Dividends', amount: indexFundMonthlyDividend(), id: 'cashflow-index-fund-dividend' }]
    : [];
  const costOfLivingItems = (state.adultDependents + state.childDependents) > 0
    ? [{ label: 'Cost of Living', amount: costOfLivingMonthly() }]
    : [];

  const rentalMortgageDebts = new Set(state.rentalProperties.map((r) => r.debt));
  const standaloneDebtItems = state.debts
    .filter((d) => d.principal > 0 && !isDebtPaymentPaused(d) && !rentalMortgageDebts.has(d))
    .map((d) => ({ label: `${d.label} Payment`, amount: -d.minPayment }));

  const rentalGroups = state.rentalProperties.map((r) => {
    const incomeItem = {
      label: `${r.label} Rent (${r.selfManaged ? 'Self-Managed' : 'Managed'})`,
      amount: rentalNetIncomeMonthly(r),
      id: `cashflow-rental-${r.id}`,
    };
    const items = [incomeItem];
    if (r.debt.principal > 0 && !isDebtPaymentPaused(r.debt)) {
      items.push({ label: `${r.debt.label} Payment`, amount: -r.debt.minPayment });
    }
    return { sortAmount: incomeItem.amount, items };
  });

  const groups = [
    ...jobItems.map((item) => ({ sortAmount: item.amount, items: [item] })),
    ...otherItems.map((item) => ({ sortAmount: item.amount, items: [item] })),
    ...dividendItems.map((item) => ({ sortAmount: item.amount, items: [item] })),
    ...standaloneDebtItems.map((item) => ({ sortAmount: item.amount, items: [item] })),
    ...costOfLivingItems.map((item) => ({ sortAmount: item.amount, items: [item] })),
    ...rentalGroups,
  ];

  groups.sort((a, b) => b.sortAmount - a.sortAmount);
  return groups.flatMap((g) => g.items);
}

function renderSections() {
  const leftEl = document.getElementById('col-left');
  const rightEl = document.getElementById('col-right-scroll');
  leftEl.innerHTML = '';
  rightEl.innerHTML = '';

  leftEl.appendChild(buildHappinessCard());

  if (state.unlocked.home) {
    leftEl.appendChild(buildSectionCard('Home', `<div class="section-line"><span>${state.home}</span></div>`));
    leftEl.appendChild(buildSectionCard('Occupation', `<div class="section-line"><span>${getOccupation()}</span></div>`));
  }

  if (state.unlocked.cashFlow) {
    const period = CASH_FLOW_PERIODS[state.cashFlowPeriod];
    const allItems = buildCashFlowLines();
    const lines = allItems.length
      ? allItems.map((item) => {
          const amount = convertMonthlyToPeriod(item.amount, state.cashFlowPeriod);
          const idAttr = item.id ? ` id="${item.id}"` : '';
          return `<div class="section-line"><span>${item.label}</span><span class="${valueClass(amount)}"${idAttr}${moneyDataAttr(amount, period.suffix)}>${formatMoney(amount, period.suffix, period.decimals)}</span></div>`;
        }).join('')
      : '<div class="section-line"><span>No cash flow yet.</span></div>';
    const card = buildSectionCard('Cash Flow', lines);
    card.appendChild(buildCashFlowTotalRow());
    rightEl.appendChild(card);
  }

  if (state.unlocked.assets) {
    const assetItems = [];
    if (state.indexFundShares > 0) {
      assetItems.push({ label: `Index Fund (${state.indexFundShares} shares)`, value: indexFundValue(), id: 'asset-value-index-fund' });
    }
    state.jobs.filter(isVentureJob).forEach((j) => {
      assetItems.push({ label: ventureDisplayLabel(j), value: ventureValue(j) });
    });
    if (state.ownedHome) {
      assetItems.push({ label: state.ownedHome.label, value: state.ownedHome.value, id: 'asset-value-home' });
    }
    state.rentalProperties.forEach((r) => {
      assetItems.push({ label: r.label, value: r.value, id: `asset-value-rental-${r.id}` });
    });
    state.assets.forEach((a) => {
      assetItems.push({ label: a.label, value: a.value || 0 });
    });
    assetItems.sort((a, b) => b.value - a.value);
    const lines = assetItems.length
      ? assetItems.map((item) => {
          const idAttr = item.id ? ` id="${item.id}"` : '';
          return `<div class="section-line"><span>${item.label}</span><span class="neutral"${idAttr}${moneyDataAttr(item.value, '')}>${formatMoney(item.value, '', 2)}</span></div>`;
        }).join('')
      : '<div class="section-line"><span>No assets yet.</span></div>';
    const card = buildSectionCard('Assets', lines);
    card.appendChild(buildAssetsTotalRow());
    rightEl.appendChild(card);
  }

  if (state.unlocked.debt) {
    const debtItems = state.debts.map((d, i) => ({ label: d.label, principal: d.principal, index: i }));
    debtItems.sort((a, b) => b.principal - a.principal);
    const lines = debtItems.length
      ? debtItems.map(({ label, principal, index }) => `<div class="section-line"><span data-tooltip-type="debt-interest" data-debt-index="${index}">${label}</span><span class="negative" id="debt-balance-${index}"${moneyDataAttr(-principal, '')}>${formatMoney(-principal)}</span></div>`).join('')
      : '<div class="section-line"><span>No debt.</span></div>';
    const card = buildSectionCard('Debt', lines);
    card.appendChild(buildDebtTotalRow());
    rightEl.appendChild(card);
  }
}

function updateInvestmentDisplays() {
  if (state.unlocked.assets) {
    const el = document.getElementById('asset-value-index-fund');
    if (el) {
      el.textContent = formatMoney(indexFundValue(), '', 2);
      applyMoneyDataAttrs(el, indexFundValue(), '');
    }

    if (state.ownedHome) {
      const homeEl = document.getElementById('asset-value-home');
      if (homeEl) {
        homeEl.textContent = formatMoney(state.ownedHome.value, '', 2);
        applyMoneyDataAttrs(homeEl, state.ownedHome.value, '');
      }
    }

    state.rentalProperties.forEach((r) => {
      const rentalEl = document.getElementById(`asset-value-rental-${r.id}`);
      if (rentalEl) {
        rentalEl.textContent = formatMoney(r.value, '', 2);
        applyMoneyDataAttrs(rentalEl, r.value, '');
      }
    });

    const assetsTotalEl = document.getElementById('asset-total-value');
    if (assetsTotalEl) {
      const total = totalAssetsValue();
      assetsTotalEl.textContent = formatMoney(total, '', 2);
      assetsTotalEl.className = valueClass(total);
      applyMoneyDataAttrs(assetsTotalEl, total, '');
    }
  }

  const priceEl = document.getElementById('index-fund-price-display');
  if (priceEl) priceEl.textContent = formatMoney(state.indexFundPrice * state.indexFundBuyQuantity, '', 2);

  const costEl = document.getElementById('index-fund-cost-value');
  if (costEl) {
    const cost = state.indexFundPrice * state.indexFundBuyQuantity;
    costEl.textContent = formatMoney(cost, '', 2);
    applyMoneyDataAttrs(costEl, cost, '');
  }

  const dividendEl = document.getElementById('cashflow-index-fund-dividend');
  if (dividendEl) {
    const period = CASH_FLOW_PERIODS[state.cashFlowPeriod];
    const amount = convertMonthlyToPeriod(indexFundMonthlyDividend(), state.cashFlowPeriod);
    dividendEl.textContent = formatMoney(amount, period.suffix, period.decimals);
    dividendEl.className = valueClass(amount);
    applyMoneyDataAttrs(dividendEl, amount, period.suffix);
  }

  state.rentalProperties.forEach((r) => {
    const rentalFlowEl = document.getElementById(`cashflow-rental-${r.id}`);
    if (rentalFlowEl) {
      const period = CASH_FLOW_PERIODS[state.cashFlowPeriod];
      const amount = convertMonthlyToPeriod(rentalNetIncomeMonthly(r), state.cashFlowPeriod);
      rentalFlowEl.textContent = formatMoney(amount, period.suffix, period.decimals);
      rentalFlowEl.className = valueClass(amount);
      applyMoneyDataAttrs(rentalFlowEl, amount, period.suffix);
    }
  });
}

function updateDebtBalances() {
  if (!state.unlocked.debt) return;
  state.debts.forEach((d, i) => {
    const el = document.getElementById(`debt-balance-${i}`);
    if (!el) return;
    el.textContent = formatMoney(-d.principal);
    applyMoneyDataAttrs(el, -d.principal, '');
  });

  const totalEl = document.getElementById('debt-total-value');
  if (totalEl) {
    const total = -totalDebtValue();
    totalEl.textContent = formatMoney(total);
    totalEl.className = valueClass(total);
    applyMoneyDataAttrs(totalEl, total, '');
  }
}

function updateJobDevelopmentDisplays() {
  state.jobs.forEach((job) => {
    if (!jobLineNeedsLiveUpdate(job)) return;
    const el = document.getElementById(`job-line-${job.id}`);
    if (el) el.textContent = jobLineText(job);

    if (job.developing) {
      const ringEl = document.getElementById(`job-progress-${job.id}`);
      if (ringEl) ringEl.setAttribute('stroke-dashoffset', progressRingOffset(developmentProgressFraction(job)));
    }
  });
}

function renderStats() {
  document.getElementById('age-value').textContent = state.age.toFixed(4);

  const netWorthEl = document.getElementById('stat-networth');
  const cashEl = document.getElementById('stat-cash');

  netWorthEl.textContent = formatMoney(state.netWorth, '', 2);
  netWorthEl.className = `value ${valueClass(state.netWorth)}`;
  applyMoneyDataAttrs(netWorthEl, state.netWorth, '');

  cashEl.textContent = formatMoney(state.cash, '', 2);
  cashEl.className = `value ${valueClass(state.cash)}`;
  applyMoneyDataAttrs(cashEl, state.cash, '');

  updateCashFlowTotal();
}

function updateCashFlowTotal() {
  const cashFlowEl = document.getElementById('cashflow-total-value');
  if (!cashFlowEl) return;
  const period = CASH_FLOW_PERIODS[state.cashFlowPeriod];
  const displayCashFlow = convertMonthlyToPeriod(state.cashFlow, state.cashFlowPeriod);
  cashFlowEl.textContent = formatMoney(displayCashFlow, period.suffix, period.decimals);
  cashFlowEl.className = valueClass(displayCashFlow);
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

// costAmount is optional — when provided, a hidden .choice-cost element is
// included so the button can collapse into a "locked" price-tag row (see
// the `locked` CSS class) when the caller decides it's purely cash-gated.
function makeActionButton(id, label, desc, onClick, costAmount) {
  const btn = document.createElement('button');
  btn.className = 'choice-btn';
  btn.id = id;
  const costHtml = costAmount != null
    ? `<div class="choice-cost"${moneyDataAttr(costAmount, '')}>${formatMoney(costAmount, '', 2)}</div>`
    : '';
  btn.innerHTML = `<div class="choice-label">${label}</div><div class="choice-desc">${desc}</div>${costHtml}`;
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

  const cost = state.indexFundPrice * state.indexFundBuyQuantity;
  const costEl = document.createElement('div');
  costEl.className = 'choice-cost';
  costEl.id = 'index-fund-cost-value';
  costEl.textContent = formatMoney(cost, '', 2);
  applyMoneyDataAttrs(costEl, cost, '');

  btn.appendChild(labelEl);
  btn.appendChild(quantitySelect);
  btn.appendChild(descEl);
  btn.appendChild(costEl);

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
  const disabled = state.cash < cost;
  btn.disabled = disabled;
  btn.classList.toggle('locked', disabled);

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

  const costEl = document.createElement('div');
  costEl.className = 'choice-cost';
  costEl.textContent = formatMoney(state.extraPaymentAmount, '', 2);
  applyMoneyDataAttrs(costEl, state.extraPaymentAmount, '');

  btn.appendChild(labelEl);
  btn.appendChild(amountSelect);
  btn.appendChild(descEl);
  btn.appendChild(costEl);

  btn.addEventListener('click', () => {
    const payment = Math.min(state.extraPaymentAmount, state.cash, debt.principal);
    if (payment <= 0) return;
    state.cash -= payment;
    debt.principal = Math.max(0, debt.principal - payment);
    recomputeCashFlow();
    recomputeNetWorth();
    render();
  });
  const disabled = state.cash < state.extraPaymentAmount;
  btn.disabled = disabled;
  btn.classList.toggle('locked', disabled);

  return btn;
}

// Locks (minimizes) a venture button whenever cash OR job units block it.
// Money takes priority in the displayed reason — if affordable but job
// units are the only blocker, that's shown instead.
function applyVentureLockState(btn, costEl, cost, wouldExceed) {
  const moneyGated = state.cash < cost;

  if (moneyGated) {
    costEl.textContent = formatMoney(cost, '', 2);
    applyMoneyDataAttrs(costEl, cost, '');
  } else if (wouldExceed) {
    costEl.textContent = JOB_UNIT_LOCKED_MESSAGE;
    delete costEl.dataset.money;
    delete costEl.dataset.moneySuffix;
  }

  const disabled = moneyGated || wouldExceed;
  btn.disabled = disabled;
  btn.classList.toggle('locked', disabled);
}

// Locks (minimizes) a button that has no cost of its own — the job limit
// is the only thing that can ever gate it.
function applyJobUnitOnlyLockState(btn, costEl, gated) {
  if (gated) costEl.textContent = JOB_UNIT_LOCKED_MESSAGE;
  btn.disabled = gated;
  btn.classList.toggle('locked', gated);
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

      const wrapper = document.createElement('div');
      wrapper.className = 'developing-btn-wrap';
      wrapper.appendChild(btn);
      wrapper.insertAdjacentHTML('beforeend', buildDevelopmentProgressIcon(job));
      jobGroup.appendChild(wrapper);
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
    const costEl = document.createElement('div');
    costEl.className = 'choice-cost';
    costEl.id = 'fulltime-cost-value';
    btn.appendChild(costEl);
    applyJobUnitOnlyLockState(btn, costEl, wouldExceed);
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
    const costEl = document.createElement('div');
    costEl.className = 'choice-cost';
    costEl.id = 'parttime-cost-value';
    btn.appendChild(costEl);
    applyJobUnitOnlyLockState(btn, costEl, wouldExceed);
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
          developHoursTotal: SIDE_HUSTLE_DEVELOP_MONTHS * HOURS_PER_MONTH,
          attemptsPrior,
        });
        recomputeCashFlow();
        recomputeNetWorth();
        render();
      },
    );
    const costEl = document.createElement('div');
    costEl.className = 'choice-cost';
    costEl.id = 'sidehustle-cost-value';
    btn.appendChild(costEl);
    applyVentureLockState(btn, costEl, SIDE_HUSTLE_COST, wouldExceed);
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
          developHoursTotal: BUSINESS_DEVELOP_MONTHS * HOURS_PER_MONTH,
          attemptsPrior,
        });
        recomputeCashFlow();
        recomputeNetWorth();
        render();
      },
    );
    const costEl = document.createElement('div');
    costEl.className = 'choice-cost';
    costEl.id = 'business-cost-value';
    btn.appendChild(costEl);
    applyVentureLockState(btn, costEl, BUSINESS_COST, wouldExceed);
    jobGroup.appendChild(btn);
  }

  return jobGroup;
}

function buildHousingGroup() {
  const group = document.createElement('div');
  group.className = 'action-group';
  group.innerHTML = '<h4>Housing</h4>';

  const line = document.createElement('div');
  line.className = 'section-line';
  line.innerHTML = `<span>${state.home}</span>`;
  group.appendChild(line);

  if (state.ownedHome) {
    const equity = Math.max(0, state.ownedHome.value - state.ownedHome.debt.principal);
    group.appendChild(makeActionButton(
      'action-sell-home',
      `Sell ${state.ownedHome.label}`,
      `Adds ${formatMoney(equity, '', 2)} equity to your cash, pays off the remaining mortgage, and moves you back into a rented apartment.`,
      () => {
        showConfirmModal(
          `Are you sure you want to sell your ${state.ownedHome.label}? You will move back into an apartment and start paying rent again.`,
          () => {
            sellHome();
            recomputeCashFlow();
            recomputeNetWorth();
            render();
          },
          { confirmLabel: 'Sell', cancelLabel: 'Keep Home' },
        );
      },
    ));
  } else {
    HOME_TIERS.forEach((tier) => {
      const downPayment = tier.price * HOME_DOWN_PAYMENT_RATIO;
      const btn = makeActionButton(
        `action-buy-home-${tier.key}`,
        `Buy a ${tier.label}`,
        `${formatMoney(downPayment, '', 2)} down payment on ${formatMoney(tier.price, '', 2)}, financed at ${(HOME_MORTGAGE_RATE * 100).toFixed(1)}% APR. Ends your rent payments.`,
        () => {
          buyHome(tier);
          recomputeCashFlow();
          recomputeNetWorth();
          render();
        },
        downPayment,
      );
      const disabled = state.cash < downPayment;
      btn.disabled = disabled;
      btn.classList.toggle('locked', disabled);
      group.appendChild(btn);
    });
  }

  return group;
}

const RENTAL_MANAGEMENT_OPTIONS = [
  { value: 'self', label: 'Self-Managed' },
  { value: 'managed', label: 'Management Co.' },
];

function buildRentalBuyButton(tier) {
  const btn = document.createElement('button');
  btn.className = 'choice-btn';
  btn.id = `action-buy-rental-${tier.key}`;

  const labelEl = document.createElement('div');
  labelEl.className = 'choice-label';
  labelEl.textContent = `Buy ${tier.label}`;

  const managementSelect = document.createElement('select');
  managementSelect.id = `rental-management-select-${tier.key}`;
  managementSelect.className = 'period-select';
  RENTAL_MANAGEMENT_OPTIONS.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === state.rentalManagementChoice) option.selected = true;
    managementSelect.appendChild(option);
  });
  // Nested inside the button for layout, but must not trigger a purchase
  // when the player is just opening/choosing from the dropdown.
  ['click', 'mousedown', 'change'].forEach((eventName) => {
    managementSelect.addEventListener(eventName, (e) => e.stopPropagation());
  });
  managementSelect.addEventListener('change', (e) => {
    const newValue = e.target.value;
    if (newValue === 'self' && totalJobUnits() + tier.selfManageJobUnits > MAX_JOB_UNITS) {
      e.target.value = 'managed';
      showWarningModal(`You must quit a job before you can self-manage a new ${tier.label} — it would use ${tier.selfManageJobUnits} job units, exceeding your ${MAX_JOB_UNITS} job limit. Switch to Management Co. instead, or free up job units first.`);
      return;
    }
    state.rentalManagementChoice = newValue;
    render();
  });

  const downPayment = tier.price * RENTAL_DOWN_PAYMENT_RATIO;
  const selfManaged = state.rentalManagementChoice === 'self';
  const canSelfManageNew = totalJobUnits() + tier.selfManageJobUnits <= MAX_JOB_UNITS;
  const canAfford = state.cash >= downPayment;

  const descEl = document.createElement('div');
  descEl.className = 'choice-desc';
  descEl.textContent = selfManaged
    ? (canSelfManageNew
      ? `${formatMoney(downPayment, '', 2)} down payment on ${formatMoney(tier.price, '', 2)}. Uses ${tier.selfManageJobUnits} job units for better cash flow.`
      : `${formatMoney(downPayment, '', 2)} down payment. Uses ${tier.selfManageJobUnits} job units — would exceed your ${MAX_JOB_UNITS} job limit.`)
    : `${formatMoney(downPayment, '', 2)} down payment on ${formatMoney(tier.price, '', 2)}. No job units required, lower cash flow.`;

  const costEl = document.createElement('div');
  costEl.className = 'choice-cost';
  costEl.id = `rental-cost-${tier.key}`;

  btn.appendChild(labelEl);
  btn.appendChild(managementSelect);
  btn.appendChild(descEl);
  btn.appendChild(costEl);

  btn.addEventListener('click', () => {
    const buySelfManaged = state.rentalManagementChoice === 'self';
    const canSelfManageNow = totalJobUnits() + tier.selfManageJobUnits <= MAX_JOB_UNITS;
    if (buySelfManaged && !canSelfManageNow) {
      showWarningModal(`You must quit a job before you can self-manage a new ${tier.label} — it would use ${tier.selfManageJobUnits} job units, exceeding your ${MAX_JOB_UNITS} job limit. Switch to Management Co. instead, or free up job units first.`);
      return;
    }
    buyRentalProperty(tier, buySelfManaged);
    recomputeCashFlow();
    recomputeNetWorth();
    render();
  });
  applyRentalBuyLockState(btn, costEl, tier);

  return btn;
}

// Locks (minimizes) the button only when cash blocks the purchase — a
// job-unit shortfall doesn't prevent buying with Management Co. selected,
// and if the player picks Self-Managed without room, the click handler
// warns via modal instead of the button minimizing.
function applyRentalBuyLockState(btn, costEl, tier) {
  const downPayment = tier.price * RENTAL_DOWN_PAYMENT_RATIO;
  const moneyGated = state.cash < downPayment;

  if (moneyGated) {
    costEl.textContent = formatMoney(downPayment, '', 2);
    applyMoneyDataAttrs(costEl, downPayment, '');
  }

  btn.disabled = moneyGated;
  btn.classList.toggle('locked', moneyGated);
}

function buildRealEstateGroup() {
  const group = document.createElement('div');
  group.className = 'action-group';
  group.innerHTML = '<h4>Real Estate</h4>';

  state.rentalProperties.forEach((rental) => {
    const netFlow = rentalNetIncomeMonthly(rental) - rental.debt.minPayment;
    const line = document.createElement('div');
    line.className = 'section-line';
    line.innerHTML = `<span>${rental.label} (${rental.selfManaged ? 'Self-Managed' : 'Managed'})</span><span class="${valueClass(netFlow)}">${formatMoney(netFlow, '/mo', 2)}</span>`;
    group.appendChild(line);

    const canSelfManage = totalJobUnits() + rental.jobUnits <= MAX_JOB_UNITS;
    const toggleBtn = makeActionButton(
      `action-toggle-management-${rental.id}`,
      rental.selfManaged ? 'Hire a Management Company' : 'Self-Manage This Property',
      rental.selfManaged
        ? 'Frees up job units, but reduces your cash flow.'
        : `Uses ${rental.jobUnits} job units. Improves your cash flow.`,
      () => {
        if (!rental.selfManaged && !canSelfManage) {
          showWarningModal(`You must quit a job before you can self-manage ${rental.label} — it would use ${rental.jobUnits} job units, exceeding your ${MAX_JOB_UNITS} job limit.`);
          return;
        }
        toggleRentalManagement(rental);
        recomputeCashFlow();
        render();
      },
    );
    group.appendChild(toggleBtn);

    const equity = Math.max(0, rental.value - rental.debt.principal);
    group.appendChild(makeActionButton(
      `action-sell-rental-${rental.id}`,
      `Sell ${rental.label}`,
      `Adds ${formatMoney(equity, '', 2)} equity to your cash and pays off the remaining mortgage.`,
      () => {
        sellRentalProperty(rental);
        recomputeCashFlow();
        recomputeNetWorth();
        render();
      },
    ));
  });

  RENTAL_TIERS.forEach((tier) => {
    group.appendChild(buildRentalBuyButton(tier));
  });

  return group;
}

function renderIdleActions() {
  document.getElementById('prompt').textContent = '';

  const choicesEl = document.getElementById('choices');
  choicesEl.innerHTML = '';

  choicesEl.appendChild(buildJobGroup());
  choicesEl.appendChild(buildHousingGroup());

  const investGroup = document.createElement('div');
  investGroup.className = 'action-group';
  investGroup.innerHTML = '<h4>Stocks</h4>';
  investGroup.appendChild(buildBuyIndexFundControl());
  choicesEl.appendChild(investGroup);

  choicesEl.appendChild(buildRealEstateGroup());

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
  if (buyBtn) {
    const cost = state.indexFundPrice * state.indexFundBuyQuantity;
    const disabled = state.cash < cost;
    buyBtn.disabled = disabled;
    buyBtn.classList.toggle('locked', disabled);
  }

  state.debts.forEach((d, i) => {
    const btn = document.getElementById(`action-extra-payment-${i}`);
    if (btn) {
      const cashGated = state.cash < state.extraPaymentAmount;
      btn.disabled = cashGated || d.principal <= 0;
      btn.classList.toggle('locked', cashGated && d.principal > 0);
    }
  });

  const units = totalJobUnits();

  const fulltimeBtn = document.getElementById('action-fulltime');
  const fulltimeCostEl = document.getElementById('fulltime-cost-value');
  if (fulltimeBtn && fulltimeCostEl) {
    applyJobUnitOnlyLockState(fulltimeBtn, fulltimeCostEl, units + FULLTIME_JOB_UNITS > MAX_JOB_UNITS);
  }

  const parttimeBtn = document.getElementById('action-parttime');
  const parttimeCostEl = document.getElementById('parttime-cost-value');
  if (parttimeBtn && parttimeCostEl) {
    applyJobUnitOnlyLockState(parttimeBtn, parttimeCostEl, units + PARTTIME_JOB_UNITS > MAX_JOB_UNITS);
  }

  const sideHustleBtn = document.getElementById('action-sidehustle');
  const sideHustleCostEl = document.getElementById('sidehustle-cost-value');
  if (sideHustleBtn && sideHustleCostEl) {
    const wouldExceed = units + SIDE_HUSTLE_UNITS > MAX_JOB_UNITS;
    applyVentureLockState(sideHustleBtn, sideHustleCostEl, SIDE_HUSTLE_COST, wouldExceed);
  }

  const businessBtn = document.getElementById('action-business');
  const businessCostEl = document.getElementById('business-cost-value');
  if (businessBtn && businessCostEl) {
    const wouldExceed = units + BUSINESS_UNITS > MAX_JOB_UNITS;
    applyVentureLockState(businessBtn, businessCostEl, BUSINESS_COST, wouldExceed);
  }

  if (!state.ownedHome) {
    HOME_TIERS.forEach((tier) => {
      const btn = document.getElementById(`action-buy-home-${tier.key}`);
      if (btn) {
        const disabled = state.cash < tier.price * HOME_DOWN_PAYMENT_RATIO;
        btn.disabled = disabled;
        btn.classList.toggle('locked', disabled);
      }
    });
  }

  RENTAL_TIERS.forEach((tier) => {
    const btn = document.getElementById(`action-buy-rental-${tier.key}`);
    const costEl = document.getElementById(`rental-cost-${tier.key}`);
    if (btn && costEl) applyRentalBuyLockState(btn, costEl, tier);
  });
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

document.getElementById('fast-forward-month').addEventListener('click', () => fastForward(HOURS_PER_MONTH));
document.getElementById('fast-forward-year').addEventListener('click', () => fastForward(HOURS_PER_YEAR));

function setupScrollIndicator(scrollEl, indicatorEl) {
  const update = () => {
    const hasMoreBelow = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight > 4;
    indicatorEl.classList.toggle('visible', hasMoreBelow);
  };
  scrollEl.addEventListener('scroll', update);
  indicatorEl.addEventListener('click', () => {
    scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
  });
  return update;
}

const updateMiddleScrollIndicator = setupScrollIndicator(
  document.getElementById('col-middle-scroll'),
  document.getElementById('scroll-down-indicator-middle'),
);
const updateRightScrollIndicator = setupScrollIndicator(
  document.getElementById('col-right-scroll'),
  document.getElementById('scroll-down-indicator-right'),
);

function updateScrollIndicator() {
  updateMiddleScrollIndicator();
  updateRightScrollIndicator();
}

window.addEventListener('resize', updateScrollIndicator);

const modalOverlayEl = document.getElementById('modal-overlay');
const modalMessageEl = document.getElementById('modal-message');
const modalCancelBtn = document.getElementById('modal-cancel');
const modalConfirmBtn = document.getElementById('modal-confirm');

function showConfirmModal(message, onConfirm, options = {}) {
  const { confirmLabel = 'Confirm', cancelLabel = 'Cancel', hideCancel = false } = options;
  modalMessageEl.textContent = message;
  modalConfirmBtn.textContent = confirmLabel;
  modalCancelBtn.textContent = cancelLabel;
  modalCancelBtn.style.display = hideCancel ? 'none' : '';
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

function showWarningModal(message) {
  showConfirmModal(message, () => {}, { confirmLabel: 'OK', hideCancel: true });
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
