# EverSprint Battle System — Design

> **Status: implemented.** This design is built out in `game.js`/`index.html` (the "EverSprint" desktop app). Treat this doc as the source of truth for intended behavior; if the code and this doc ever disagree, that's a bug in one of them worth reconciling. A few implementation rulings on things this doc left ambiguous are called out inline below (search for "**Implementation note**").

## Overview

EverSprint is the in-fiction "work tracking" app inside Evergreen Mortal — a kanban board where routine (and eventually plot-relevant) work is represented as a card battle. A sprint runs Monday–Friday. **Performance** (0–100) is the single win/loss meter: hit 100 and you're promoted (win), hit 0 and you're fired (loss). This part is unchanged from the current implementation.

## Core Loop / Board Columns

Three columns, renamed from the original implementation:

- **Deck** — cards you own for this sprint that aren't currently in play.
- **Draft** (was "Hand") — today's randomly-sampled offer of cards.
- **Played** (was "Initialized") — cards currently deployed (Utility and Daemon cards live here while active).

**Each day:**

1. The game randomly samples **3 cards** from the Deck into the Draft.
2. The player **must** pick exactly one of the 3 — there is no passing on the daily draft.
3. The 2 unpicked cards return to the Deck. **The Deck reshuffles any time cards return to it**, so draws are genuinely random, never a fixed/predictable order.
4. **Turn order**: the day's mandatory Draft pick must be resolved *before* the player may Activate any Utility cards that day.
5. **No cap on Utility activations per day.** Once the daily draft pick is resolved, the player may Activate every off-cooldown Utility they have, in any order, as many times as card interactions allow — it's even possible for a single Utility to Activate multiple times in one day (e.g. via a Daemon like "When you Activate a card, Activate it twice") if the deck supports it. This is intentional; no artificial action-economy cap has been added.

## Card Types

Four types, each with a distinct lifecycle. Final names lean into a "things that run on a computer" theme (working title → final name):

### Script (was "Instant")
Choosing it from the Draft resolves it immediately — target chosen right then if the effect needs one. It then returns to the Deck along with the two cards that weren't picked. No delay, no presence in Played.

### Utility (was "Activate")
Moves into Played when picked. Can be Activated immediately upon deployment, choosing a target at that moment. After firing, it goes on a **cooldown defined per-card** ("Activate N" = N-day cooldown) before it can be Activated again. No cap on how many Utility cards can be deployed simultaneously. Stays in Played, repeatable all sprint, until it folds back to the Deck at sprint's end.

### Daemon (was "Passive")
Moves into Played when picked. No manual trigger — it reacts automatically to defined game events for the rest of the sprint. Stays in Played until sprint end (or until some other effect explicitly moves it), then returns to the Deck.

**Stacking rule**: multiple copies of the *same* Daemon do **not** stack. A "double" effect stays ×2 with two copies active, not ×4; a flat bonus (e.g. "+3 severity lowered") stays a single +3, not +6.

### Virus (was "Curse") — "Computer Virus"
The only curse card in the game. **Never appears in a starting deck** — it only enters a deck via the Infectious task ability (see below).

- Drafted and **picked** → destroyed permanently.
- Drafted and **declined** (a different card picked instead) → the copy returns to the deck, plus **2 new copies are added** (1 becomes 3).
- Multiple copies can appear in the same day's 3-card draft simultaneously if things spiral — this is intentional ("outbreak" days are acceptable).
- **All copies are wiped from the deck at sprint's end**, regardless of how many exist.

**Implementation note**: the drafted/declined split applies inside a bonus Draft-from-N too, not just the daily 3-card Draft. If a Virus is one of the N sampled cards and you play something else, that Virus counts as declined (returns + 2 new copies). If you decline the whole bonus prompt, every sampled card — Virus included — is treated as declined the same way. A Virus can also come up as one of the 2 cards an untyped "play N random cards from your deck" effect (e.g. Batch Job) forces into play; since there's no decline option there, it simply resolves as picked (destroyed).

## The "Play" Keyword

When a card effect says "play a random X from your deck" (or similar), the meaning depends on X's type:
- **Script** → resolves its effect immediately, as if drafted and chosen.
- **Utility / Daemon** → deploys it into Played, exactly as if it had been drafted and chosen normally (Utility becomes immediately Activate-able; Daemon starts passively ticking).

## The "Draft from N" Sub-Mechanic

Several cards trigger a bonus mini-draft: **immediately sample N random cards from the deck, choose 1, and play it** (following the same "play" rules as above for whatever type is chosen). This does **not** count against the day's mandatory 3-card Draft pick — it's a bonus action.

- These can **chain indefinitely** — if a bonus-drafted card is itself a "Draft from N" effect, it can trigger another bonus draft, and so on.
- **The player may always decline any bonus Draft-from-N prompt** and play nothing from it. This is both a genuine player choice and the built-in safety valve against decks that could otherwise force an infinite chain.

**Implementation note**: the Draft Squeeze task ability (see below) only shrinks the day's mandatory 3-card Draft — bonus Draft-from-N prompts always sample the card's own stated N regardless of Draft Squeeze.

## Rarity & Reward Odds

When a task is finished, the reward roll uses these odds:

| Rarity | Odds |
|---|---|
| Common | 74% |
| Uncommon | 25% |
| Rare | 1% |

Pool composition: **24 Common** (12 Script / 8 Utility / 4 Daemon), **12 Uncommon** (6 Script / 4 Utility / 2 Daemon), **3 Rare** (1 of each type), plus **Computer Virus as card #40** (outside the normal reward pool — see above for how it actually enters a deck). Total: 40 cards.

Each of the 40 cards below is a single unique named card, not a stack — the only way to end up with more than one copy of the same card is rolling it as a reward twice (or, for Computer Virus, the outbreak mechanic).

**Reward delivery**: finishing a task grants exactly **one** card, rolled against the odds above. The new card goes to the **Unused Cards** folder (the existing deckbuilder pool of owned-but-not-in-this-sprint cards, `sprintState.unused`) — not directly into the sprint's Deck.

**"Play a random X from your deck" with no eligible X**: if the deck contains no card of the required type, the effect simply does nothing (no fizzle penalty, no substitution).

### Starting Deck

No starting-deck composition was specified in the original design session, so a 10-card placeholder was chosen for the first sprint: **2× Quick Patch, 2× Broadcast Ping, 2× Debugger, 1× Priority Queue, 1× Background Sync, 1× Garbage Collection, 1× Force Quit**. This is first-draft content, same status as the rest of the numeric balance (see Open Items) — expect it to change. It's edited via the same Deck / Unused Cards editor as every other sprint's deck, so once Sprint 1 is underway, "starting deck" and "current deck" are the same folder.

### Common — Script (12)

1. **Parallel Execution** — Target task loses 5 severity for each Played card you have.
2. **Binary Split** — Target task loses half its severity (rounded up).
3. **Prefetch** — Add two new cards to your draft, then select another card to play. (Implemented as Draft from 2 — see "Draft from N" above.)
4. **Refresh Query** — Draw a new set of three cards to draft from, then select another card to play. (Implemented as Draft from 3.)
5. **Quick Patch** — Target task loses 15 severity.
6. **Broadcast Ping** — All tasks lose 5 severity.
7. **Deep Scan** — Draft from 5 (pick 1 of 5 random cards from your deck to play).
8. **Cascade Failure** — All tasks lose 5 severity for each card you Activated today.
9. **Force Quit** — Finish target task with severity 30 or less.
10. **Kill Top Process** — The task with the highest severity loses 25 severity.
11. **Garbage Collection** — The task with the lowest severity loses 50 severity.
12. **Buffer Overflow** — Target task with more than 70 severity loses 70 severity.

### Common — Utility (8)

1. **Debugger** — Activate 1: target task loses 5 severity.
2. **Search Index** — Activate 3: Draft from 2.
3. **Task Scheduler** — Activate 1: lower the Activate timer of another card by 1.
4. **Load Balancer** — Activate 2: All tasks lose 5 severity.
5. **Priority Queue** — Activate 2: The task with the highest severity loses 15 severity.
6. **Auto-Cleanup** — Activate 1: Finish all tasks under 10 severity.
7. **Cron Reset** — Activate 3: Lower the Activate timer of all cards by 1.
8. **Macro Runner** — Activate 3: Play a random Script card from your deck.

### Common — Daemon (4)

1. **Background Sync** — When you Activate a Utility, all tasks lose 2 severity.
2. **Signal Amplifier** — Whenever you lower the severity of a task, lower its severity by 3 more. (Must not trigger itself — this just adds 3 to whatever amount is being lowered, it doesn't re-fire on its own bonus.)
3. **Task Manager** — When you finish a task, Draft from 3.
4. **Autoloader** — When you Draft, add 2 cards to the Draft.

### Uncommon — Script (6)

1. **Force Terminate** — Finish target task with severity 50 or less.
2. **Full System Scan** — All tasks lose 1 severity for each card in your deck.
3. **Hard Reset** — Lower the Activate timer of all cards to 0.
4. **Purge** — All tasks with more than 50 severity lose 25 severity.
5. **Spawn Process** — Play a random Daemon from your deck.
6. **Auto-Install** — Play a random Utility from your deck.

### Uncommon — Utility (4)

1. **Hot Swap** — Activate 2: Put a Played card back in your deck, then Draft from 3.
2. **Batch Job** — Activate 4: Play 2 random cards from your deck.
3. **Load Shedding** — Activate 2: Lower the severity of all tasks by 5.
4. **Watchdog Timer** — Activate 1: The task with the highest severity loses 10 severity.

### Uncommon — Daemon (2)

1. **Just-In-Time Compiler** — When you run a Script, lower the Activate timer of a random card.
2. **Recursive Call** — When you run a Script, run it twice.

### Rare — Script (1)

1. **Root Access** — Play all other cards in this draft.

### Rare — Utility (1)

1. **Master Key** — Activate 1: Draft from 2.

### Rare — Daemon (1)

1. **Fork Bomb** — When you Activate a card, Activate it twice.

**Implementation note — multi-play auto-targeting**: Batch Job and Root Access can each cause more than one card to resolve back-to-back, which breaks down if two of them need a target at once (there's only one "choose a task" prompt at a time). Any target-needing card resolved this way auto-targets the current highest-severity eligible task instead of prompting the player — this only applies to the *other* cards a multi-play triggers, never to a card you draft and pick normally.

**Implementation note — Fork Bomb / Recursive Call scope**: these duplicate only the specific card's own effect body. They don't cause *other* Daemons' reactions (Background Sync, Retaliation, etc.) to also fire twice — those still trigger exactly once per real Activation or Script run, regardless of how many times Fork Bomb/Recursive Call replay the triggering card's own effect.

## Task / Enemy Agency

Tasks currently (in the shipped game) are pure damage sponges: static severity, no behavior except a passive Performance penalty if unresolved at week's end. The redesign gives them real agency:

### Random / roguelike sprints

Each sprint's task lineup is generated fresh at sprint start using a fixed algorithm:

1. **Eligible ability count** — count how many of the 12 task abilities (below) currently pass their Performance gate. This is always at least 4, since Business as Usual, Escalation, Retaliation, and Infectious are eligible at all Performance levels.
2. **Task count** — a random integer between 2 and `min(6, eligible ability count)`. The ceiling shrinks with the eligible pool so a sprint never needs more unique abilities than actually exist yet at the current Performance.
3. **Total severity budget** — `Performance × 2 × 1.1^(Performance / 10)`. This compounds faster than linear, so late-game lineups get dramatically more dangerous in total, not just proportionally more:

   | Performance | Total severity budget |
   |---|---|
   | 10 | ~22 |
   | 25 (sprint 1 start) | ~63.5 |
   | 50 | ~161 |
   | 75 | ~307 |
   | 100 | ~519 |

4. **Split** — each task gets a floor of 5 severity; the remaining budget is divided across all tasks using normalized random weights (an uneven, organic split, not an even one), then rounded to whole numbers with drift correction so the total still matches.
5. **Ability assignment** — one task is guaranteed the **Business as Usual** ability. Each remaining task gets a unique ability (no repeats within a sprint), drawn with equal probability from whichever of the other 11 abilities are currently eligible.
6. **Severity overrides** — a task with Business as Usual or Layered discards whatever severity the random split gave it and uses its own formula instead (see table below). This isn't compensated elsewhere — a sprint's realized total severity can end up under the nominal budget when either ability appears.
7. **Gain / loss** — independent of severity and ability: every task gets its own **gain** and **loss** values, each an independent random integer from 1 to 5. **Gain** is the Performance awarded when the task is finished (severity reaches 0). **Loss** is the Performance penalty applied if the task is still unresolved (per the existing passive end-of-sprint penalty described above; see Deadline Pressure for the ability that changes when it fires).

#### The 12 task abilities

Each ability also gets a flavor name for the task card itself, distinct from the ability name (e.g. a task with the Escalation ability is named "Runaway Process"):

| # | Ability | Task flavor name | Mechanic | Performance gate |
|---|---|---|---|---|
| 1 | Business as Usual | Routine Maintenance | Severity = Performance, calculated once at sprint start (overrides the random split); behaves as normal severity after that (can be raised/lowered like any other task) | all levels |
| 2 | Escalation | Runaway Process | Severity +x/day left unfinished, x = round(Performance/10) | all levels |
| 3 | Retaliation | Defensive Firewall | On any Utility Activation, severity +x, x = round(Performance/10) | all levels |
| 4 | Infectious | Compromised Server | At sprint start, adds x Computer Virus cards (1 under 50, 2 at 51–75, 3 over 75) | all levels |
| 5 | Armored | Hardened Legacy System | Takes half damage, universally, from any effect type | >35 |
| 6 | Absorption | Load Aggregator | Gains 10 severity whenever any other task's severity is lowered | >40 |
| 7 | Draft Squeeze | Resource Contention | Day's Draft samples 2 cards instead of 3 while alive | >50 |
| 8 | Sluggish Systems | Throttled Pipeline | All Utility cooldowns +1 while alive | >50 |
| 9 | Contagious | Spreading Outage | Every other task's severity +5/day while alive | >50 |
| 10 | Distraction | Decoy Ticket | Immune to `target`-type effects only (`all`/`highest` still work) | >60 |
| 11 | Deadline Pressure | Executive Escalation | Loss penalty fires every day *and* again at sprint end | >70 |
| 12 | Layered | Encrypted Vault | Severity starts at 5 (overrides the random split); can only be lowered by 1 per hit, regardless of card power, from then on | >80 |

Performance gates are checked once, at the moment a sprint's tasks are generated — an ability stays locked in for that task's whole life even if Performance later crosses back over the threshold.

**Implementation note — locked magnitudes, not just gates**: the same "checked once, locked for the task's life" rule extends to the *x* values above, not only to whether the ability is eligible in the first place. Escalation's and Retaliation's `x = round(Performance/10)`, and Infectious's virus count, are all rolled once at task generation and stored on the task — they do **not** silently recompute from Performance's current value later in the sprint (Performance can move a lot in five days). This also means the in-game ability description on a task always states its exact locked number (e.g. "Gains 6 severity every day it stays unfinished") rather than the general formula. Deadline Pressure's daily penalty is likewise just the task's own `loss` stat, already fixed at generation.

**Implementation note — severity display ceiling**: the severity budget formula routinely produces individual task severities well past 100 at high Performance (see the budget table above) — that's intended, not a bug. Each task's health-bar reference value (`maxSeverity`) tracks its own starting severity rather than a fixed 100, and only clamps the *bar's rendered width* at 100%; it never caps how much a task's real severity can grow from Contagious/Absorption/Retaliation/Escalation.

### Story / scripted sprints
Tied to the Jo/Marcus/Evergreen narrative, using the existing (currently empty) `SCRIPTED_TASKS_BY_WEEK` hook in `game.js`. These are hand-authored tasks that **can stack multiple effects**, unlike random-sprint tasks which get at most one — reserved for bigger, more memorable narrative set-pieces.

## Open / Unresolved Items

- No concrete story-sprint task has been designed yet (what it looks like tied to an actual plot beat, and how multi-ability stacking should read to the player).
- No numeric balance pass has been done — severity thresholds, cooldown lengths, ability gate thresholds, the severity-budget formula's constants, the starting deck, and the gain/loss 1–5 range are all first-draft guesses.
- The whole system has been smoke-tested (full sprint loop, deck editor persistence, Virus outbreak, high-Performance task generation) but not actually playtested for fun/balance versus just working correctly on paper.
