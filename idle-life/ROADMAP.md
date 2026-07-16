# Idle Life — Realism & Robustness Roadmap

Goal: make the economy more realistic and internally consistent. Phases are
ordered so each system is built on top of the ones it depends on, rather than
needing rework as later systems land.

## Phase 0 — Foundation
- Balance pass (light): review current job and investment values (job pay
  tiers, venture income scaling, index fund growth/dividend rate, mortgage
  and rental yields) so everything downstream measures against sane numbers.
- Career progression: raises, promotions, skill investment. Establishes how
  wages grow over real career growth, independent of inflation (Phase 3).

## Phase 1 — Lifestyle
- General lifestyle tier: cost-of-living tier (frugal/comfortable/lavish,
  etc.), replacing the current flat per-dependent cost.
- Social life: separate discretionary spending dimension (going out,
  entertainment, dining, hobbies/subscriptions) with its own cost/happiness
  tradeoff. Sets up a hook Phase 6 (Relationships) can use for dating
  opportunities.

## Phase 2 — Market
- Architecture: generic asset-class framework (risk/return/volatility/
  liquidity) replacing the hardcoded index-fund-only logic. Includes
  economic cycles (bull/bear) as the mechanism driving that volatility.
- Investment realism/depth: bonds, crypto, HYSA, and give index funds real
  volatility instead of smooth deterministic growth.

## Phase 3 — Systemic overlays
- Inflation: 3%/year on all expenses. Needs to land after Phase 1 so it
  sweeps every expense category that exists rather than being retrofitted
  repeatedly. Open question: do wages also inflate, or is real-terms
  erosion an intentional difficulty curve (career progression from Phase 0
  is the counterweight either way)?
- Taxes: on all earnings (job, venture, and — per Phase 2 — investment
  income taxed by type: ordinary vs. capital gains vs. qualified dividends
  vs. interest). Decide whether tax brackets are inflation-indexed.

## Phase 4 — Retirement accounts
401k/IRA-style tax-advantaged wrappers around the Phase 2 market system.
Needs Phase 3 (taxes) to exist first since retirement accounts are defined
by their tax treatment (pre-tax contributions, tax-deferred growth, Roth vs.
traditional, early-withdrawal penalties). Employer match ties back to the
jobs/career system from Phase 0.

## Phase 5 — Random events
Positive/negative events (job loss, medical bills, market crashes,
windfalls). Landing here — after career, lifestyle, market, taxes, and
retirement accounts all exist — means events can hook into real systems
(e.g. a market crash can hit retirement-held assets) from day one instead
of needing rework later.

## Phase 6 — Relationships
Dating/marriage/children. Landing last (before the capstone) because it
touches nearly everything already built: dual income (career), shared cost
of living (lifestyle), joint accounts (market/retirement), filing status
(taxes), and family-related events.
- Divorce: maybe — revisit once the relationship-status system exists and
  is rich enough to support it.

## Phase 7 — Capstone
Full balance pass across the whole system now that lifestyle, market,
events, inflation, taxes, retirement accounts, and relationships are all in.

---

## Backlog (not scheduled, no strong signal yet)
- Insurance (health/auto/home) as a recurring expense that offsets
  catastrophic one-off costs from Phase 5's events.
- Credit score affecting loan/mortgage access and rates.
- Persistence (save/load) — currently all state is in-memory only.
- End-of-life/legacy — no defined end state or win condition currently.
