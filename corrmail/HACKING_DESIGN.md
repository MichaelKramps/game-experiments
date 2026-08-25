# CorrMail — Hacking System Design

This file documents the planned design for the real hacking minigame and
the CorrPower/hardware system it depends on. It's a companion to
`DESIGN.md` (general mechanics) and `STORY.md` (narrative) — split out
because this system has enough of its own math and open questions to
warrant its own space. For what a story-flavored hack *reward* actually
contains (as opposed to the attempt mechanics below), see
`HACKING_REWARDS.md` — that file covers the reach model, cast, and
per-network-tier content plan for the world-building layer; this file
stays scoped to the minigame's math.

**Status: planning only, not implemented.** The current code
(`game.js`) has a stub — `resolveHackOutcome()` always succeeds after a
fixed delay, no real minigame, no dependency on power. See `DESIGN.md`'s
Hacking section for what's actually built today. This document describes
what the stub is meant to be replaced with.

## CorrPower

Corr's overall strength is a single multiplicative stat called
**CorrPower**, expressed as a multiple of baseline: `1x`, `5x`, `64x`,
`390,625x`, up through very large numbers — the ceiling with every
category maxed is roughly **1.35 × 10²⁴x**. The scale is meant to run
wide as the game progresses, standard idle-game escalation, and the
per-category growth rates below make it compound fast.

- Every hardware category (CPU, RAM, Motherboard, Power Supply, Storage,
  GPU, Network Card — see `DESIGN.md`'s Marketplace/hardware tier
  progression) has its own multiplier of `growth ^ (tier - 1)`, where
  `growth` is a **per-category constant, not uniform**: CPU ×5, GPU ×4,
  RAM ×3, Motherboard/Power Supply/Storage/Network Card ×2. Tier 1 is
  therefore always 1x (power-neutral) for every category — the ramp
  starts at tier 2. Every purchasable category shares the same 10-tier
  ceiling now (Power Supply/Storage originally capped at tier 5, but were
  brought up to match), so ceilings vary only by growth rate: CPU tops out
  at 1,953,125x, GPU at 262,144x, RAM at 19,683x, Motherboard/Power
  Supply/Storage at 512x each. Network Card is the one exception, capping
  at tier 3 (4x) since it isn't a normal Marketplace category at all — see
  `DESIGN.md`.
- Default/unupgraded hardware is 1x per category — including GPU, which
  Corr starts with already installed at tier 1 (unlike every other
  category, GPU tier 1 is never a `PARTS` purchase). Network Card is the
  one category with no starting hardware at all (`'none'`), also 1x in
  the product until the player gets one. Corr starts at 1x overall (all
  categories at their tier-1-or-absent default).
- Buying or earning an upgrade for a category **replaces** that
  category's multiplier — multipliers aren't additive within a category.
- **CorrPower = the product of every category's current multiplier.**
  Example: Motherboard 4x (tier 3) × CPU 25x (tier 3) × RAM 3x (tier 2) ×
  everything else 1x = 300x overall.
- CorrPower has two jobs: it scales CorrCoin mining speed directly, and
  it's the single number that determines hacking effectiveness (below).
  One upgrade path (Marketplace) feeds both loops.
- The Corr Status hardware UI shows both the raw multiplier (as `Nx`) and
  a box meter per row (`powerSquaresHtml()` in game.js), sized to that
  category's own max tier and filled by the literal owned tier number —
  Network Card's meter is 3 boxes, every other category's is 10. Since
  every purchasable category now shares the same 10-tier ceiling, tier
  number and box count line up directly there; only Network Card's
  shorter ladder needed the per-category sizing at all.

## Hacking overview

The Hacking tab has two halves:

- **Hacking opportunities** — computers the player has found and can
  attempt to hack. Corresponds to today's `HACKS` catalog.
- **Hacking algorithms** — the actions available to use *during* a hack
  attempt. Corresponds to today's (currently empty) `ALGORITHMS` catalog.
  Bought in the Marketplace, or found as hack rewards (`reward.type ===
  'algorithm'` already exists as a delivery path).

### Target computers

Each computer has **1 to 3 defensive measures**, drawn from three fixed
categories:

- Network Firewall
- Data Encryption
- Password Breaking

A computer never has more than one measure per category — there's no
"two Firewalls." Difficulty from having a tougher defense is expressed by
raising that single measure's strength, not by stacking duplicates.

Each measure has a **strength** value (its "health"). Most computers are
randomly generated (strength/category count rolled by difficulty tier);
some are hand-defined for story beats (e.g. the mandatory mid-story hack
in `STORY.md` — content not yet designed).

### The hack attempt — turn-based, not real-time

A hack attempt has an **action budget of 10** (originally pitched as "10
seconds," but it's not a real-time clock — think of it as 10 turns).
Each algorithm consumes some number of those actions (its `actionCost`)
when run. The player picks one algorithm at a time; after it resolves,
the game waits for the next pick — nothing ticks down while deciding.
This is a turn-based resource-budgeting puzzle, not a twitch challenge.

The player wins (gets the data) by clearing every defensive measure on
the target before the action budget runs out. Running out of actions
first means the hack fails — no data, no partial credit.

## The math

Each algorithm has:

- `category` — which defense type it targets (a single category, or
  possibly all three for a "multi-tool" style algorithm)
- `actionCost` — how many of the 10 actions it consumes to run
- `basePower` — its own base multiplier

Running an algorithm against a measure in its category:

```
reduction = algorithm.basePower × CorrPower
measure.strength -= reduction
```

A measure is cleared once cumulative reduction meets or exceeds its
strength.

**Rules, confirmed:**
- Overkill on the clearing hit is wasted — no spillover onto other
  measures.
- CorrPower is one global number that feeds every algorithm equally.
  Algorithms differentiate themselves through their own `basePower` and
  `actionCost`, not through hardware-category-specific synergies (e.g.
  Network Card multiplier doesn't specifically boost Firewall-breaking —
  that was considered and explicitly rejected in favor of simplicity).

### Example algorithm catalog (illustrative only — not the real catalog)

| Algorithm | Category | Action cost | Base power |
|---|---|---|---|
| Port Scanner | Firewall | 1 | 1.0 |
| Brute Force | Password Breaking | 2 | 2.5 |
| Cipher Break | Data Encryption | 3 | 4.0 |
| Multi-Tool | all three | 4 | 1.5 (per category) |

Cheap/focused algorithms allow many small swings; expensive ones hit
harder or cover more categories per action but eat the budget fast.
Multi-Tool trades per-category strength for action efficiency across
multiple measures — not strictly better, a real tradeoff.

### Worked example

CorrPower = 7.5x. Target has Firewall (strength 20) and Password
Breaking (strength 15), no Encryption measure.

1. Port Scanner → Firewall: 1.0 × 7.5 = 7.5 reduction (20 → 12.5). 1
   action spent, 9 left.
2. Port Scanner → Firewall: 12.5 → 5. 1 action, 8 left.
3. Port Scanner → Firewall: cleared (overkill wasted). 1 action, 7 left.
4. Brute Force → Password: 2.5 × 7.5 = 18.75, clears the 15-strength
   measure. 2 actions, 5 left.

Success, with 5 actions to spare — an easy target at this power level. A
tougher computer or lower CorrPower would eat much more of the budget, or
fail outright.

### Random generation sketch (illustrative only — not final)

Tie strength ranges and measure count to a difficulty tier per
opportunity:

- Tier 1: 1 measure, strength 5–15
- Tier 2: 2 measures, strength 10–30 each
- Tier 3: 3 measures, strength 20–60 each

## Open / not yet decided

- The real algorithm catalog — names, costs, base powers, how many exist,
  which are purchasable vs. hack-reward-only.
- The real strength-generation formula/tiers for randomly-generated
  computers (the sketch above is a placeholder shape, not tuned numbers).
- How a hack opportunity's difficulty tier is determined or communicated
  to the player before they commit to an attempt.
- Whether a failed hack (ran out of actions) has any consequence beyond
  "no data" — retry immediately, cooldown, or permanently lost
  opportunity.
- Design for the mandatory mid-story hack referenced in `STORY.md`
  (specific measures/strengths tied to that story beat).
- How this replaces the current stub in code: `resolveHackOutcome()`
  becomes the real turn-based attempt instead of an instant
  `{success: true}`, `HACKS` entries need real defensive-measure data
  instead of just a flat `durationMs`, and the Hacking panel UI needs an
  in-progress-attempt view (pick algorithm → see effect → pick again)
  that doesn't exist yet.
