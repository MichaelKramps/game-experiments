# EverSprint Battle System — Design

> **Status: implemented.** This design is built out in `game.js`/`index.html` (the "EverSprint" desktop app). Treat this doc as the source of truth for intended behavior; if the code and this doc ever disagree, that's a bug in one of them worth reconciling. A few implementation rulings on things this doc left ambiguous are called out inline below (search for "**Implementation note**").

## Overview

EverSprint is the in-fiction "work tracking" app inside Evergreen Mortal — a kanban board where routine (and eventually plot-relevant) work is represented as a card battle. A sprint runs Monday–Friday. **Performance** (0–100) is the single win/loss meter: hit 100 and you're promoted (win), hit 0 and you're fired (loss). See "Performance Timing" below for when it actually moves.

## Performance Timing

Performance mostly only actually changes once per sprint, at End Week — not incrementally as things happen during the week. Finishing a task, Reassigning a carried-over task, and the final loss for anything still open at week's end all queue their contribution rather than applying it immediately; the whole sprint's net change is calculated and applied in one shot when the week ends (revealed on the Sprint Summary screen as "Performance N/100 (±M)"). This is why **promotion can only happen at the end of a sprint** — hitting 100 requires that sprint-end lump sum, since gains never move Performance mid-week on their own.

**Exception — Deadline Pressure.** Its daily loss tick is a deliberate carve-out: it applies for real, immediately, the moment it fires each day (on top of still getting hit again by the sprint-end lump sum if the task is still open then, per its "fires every day and again at sprint end" text). This means **firing (hitting 0) can still happen mid-sprint** — but only from this one live threat; every other source of Performance change is deferred to the week-end reveal.

**Implementation note — Special Task / Business as Usual severity across a sprint**: since Performance doesn't move mid-sprint (Deadline Pressure aside), every task that gets its severity from Business as Usual — including every Special Task spawned during the same sprint — locks to the *same* number, whatever Performance was at that sprint's start. Multiple Special Tasks in one sprint will all share identical severity; it only changes once the next sprint's opening Performance is revealed.

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
- Drafted and **declined** (a different card picked instead) → the copy returns to the deck, plus **1 new copy is added** (1 becomes 2).
- Multiple copies can appear in the same day's 3-card draft simultaneously if things spiral — this is intentional ("outbreak" days are acceptable).
- **All copies are wiped from the deck at sprint's end**, regardless of how many exist.
- **Finishing the Infectious task that spawned them also wipes every copy immediately** — you don't have to wait for sprint end if you clear the source.

**Implementation note**: the drafted/declined split applies inside a bonus Draft-from-N too, not just the daily 3-card Draft. If a Virus is one of the N sampled cards and you play something else, that Virus counts as declined (returns + 1 new copy). If you decline the whole bonus prompt, every sampled card — Virus included — is treated as declined the same way. A Virus can also come up as one of the 2 cards an untyped "play N random cards from your deck" effect (e.g. Batch Job) forces into play; since there's no decline option there, it simply resolves as picked (destroyed).

## The "Play" Keyword

When a card effect says "play a random X from your deck" (or similar), the meaning depends on X's type:
- **Script** → resolves its effect immediately, as if drafted and chosen.
- **Utility / Daemon** → deploys it into Played, exactly as if it had been drafted and chosen normally (Utility becomes immediately Activate-able; Daemon starts passively ticking).

## The "Draft from N" Sub-Mechanic

Several cards trigger a bonus mini-draft: **immediately sample N random cards from the deck, choose 1, and play it** (following the same "play" rules as above for whatever type is chosen). This does **not** count against the day's mandatory 3-card Draft pick — it's a bonus action.

- These can **chain indefinitely** — if a bonus-drafted card is itself a "Draft from N" effect, it can trigger another bonus draft, and so on.
- **The player may always decline any bonus Draft-from-N prompt** and play nothing from it. This is both a genuine player choice and the built-in safety valve against decks that could otherwise force an infinite chain.

**Implementation note**: the Draft Squeeze task ability (see below) only shrinks the day's mandatory 3-card Draft — bonus Draft-from-N prompts always sample the card's own stated N regardless of Draft Squeeze.

**Implementation note — simultaneous triggers queue, they don't clobber each other**: some effects can trigger more than one bonus draft in the same instant — e.g. an 'all'-kind effect like Broadcast Ping finishing two tasks at once with Task Manager ("when you finish a task, Draft from 3") deployed fires it twice. Each trigger gets its own separate Draft-from-N prompt, shown one after another (the UI shows "(+N more queued)" when there's a backlog) — none of them are dropped or merged into one.

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

### Deck Size Cap

The Deck folder in the deckbuilder is capped at **20 cards** — the editor won't let you drag a card from Unused Cards into an already-full Deck (shown as "Deck (20/20)" in the header), and a drag toward it shows a "not allowed" cursor rather than the usual drop highlight once it's full. This cap only applies to that deliberate, player-driven curation step. It doesn't constrain the *live* sprint deck during play, which can already legitimately exceed 20 through gameplay mechanics that add cards directly (Computer Virus's outbreak duplication, Played cards folding back in at sprint's end) — those are unaffected.

### Common — Script (12)

1. **Live Patch** — Target task loses 5 severity, then Draft from 3.
2. **Binary Split** — Target task loses half its severity (rounded up).
3. **Prefetch** — Add two new cards to your draft, then select another card to play. (Implemented as Draft from 2 — see "Draft from N" above.)
4. **Refresh Query** — Draw a new set of three cards to draft from, then select another card to play. (Implemented as Draft from 3.)
5. **Quick Patch** — Target task loses 15 severity.
6. **Broadcast Ping** — All tasks lose 5 severity.
7. **Deep Scan** — Draft from 5 (pick 1 of 5 random cards from your deck to play).
8. **Cascade Failure** — All tasks lose 5 severity for each Activate effect you triggered today.
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

1. **Hot Swap** — Activate 3: Draft from 3.
2. **Batch Job** — Activate 4: Play 2 random cards from your deck.
3. **Load Shedding** — Activate 2: Lower the severity of a random task by 25.
4. **Watchdog Timer** — Activate 1: The task with the highest severity loses 10 severity.

### Uncommon — Daemon (2)

1. **Query Sweep** — Each time you Draft, all tasks lose 5 severity.
2. **Recursive Call** — When you run a Script, run it twice.

### Rare — Script (1)

1. **Root Access** — Play all other cards in this draft.

### Rare — Utility (1)

1. **Master Key** — Activate 1: Draft from 2.

### Rare — Daemon (1)

1. **Fork Bomb** — When you Activate a card, Activate it twice.

**Implementation note — multi-play auto-targeting**: Batch Job and Root Access can each cause more than one card to resolve back-to-back, which breaks down if two of them need a target at once (there's only one "choose a task" prompt at a time). Any target-needing card resolved this way auto-targets the current highest-severity eligible task instead of prompting the player — this only applies to the *other* cards a multi-play triggers, never to a card you draft and pick normally.

**Implementation note — Fork Bomb / Recursive Call scope**: these duplicate only the specific card's own effect body. They don't cause *other* Daemons' reactions (Background Sync, Retaliation, etc.) to also fire twice, and don't restart the card's own cooldown a second time — those still trigger exactly once per real Activation or Script run, regardless of how many times Fork Bomb/Recursive Call replay the triggering card's own effect. **Exception**: a Fork Bomb replay does count as a real Activate for Cascade Failure's "Activate effects triggered today" tally — "Activate it twice" means two Activates happened, even though everything else about the Activation (cooldown, Retaliation, other Daemons) only fires once.

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

4. **Split** — each task gets a floor of 5 severity; the remaining budget is divided across all tasks using normalized random weights (an uneven, organic split, not an even one), then rounded to whole numbers with drift correction so the total still matches. **A single task's severity is capped at 100** — at high Performance the budget (see the table above) can suggest more than that for one task, and any excess from the split is simply not applied rather than pushed onto the task.
5. **Ability assignment** — one task is guaranteed the **Business as Usual** ability. Each remaining task gets a unique ability (no repeats within a sprint), drawn with equal probability from whichever of the other 11 abilities are currently eligible.
6. **Severity overrides** — a task with Business as Usual or Layered discards whatever severity the random split gave it and uses its own formula instead (see table below). This isn't compensated elsewhere — a sprint's realized total severity can end up under the nominal budget when either ability appears.
7. **Gain / loss** — independent of severity and ability: every task gets its own **gain** and **loss** values, each an independent random integer from 1 to 5. **Gain** is the Performance awarded when the task is finished (severity reaches 0). **Loss** is the Performance penalty applied if the task is still unresolved at sprint's end — and it fires **every sprint** the task remains open, not just once (see Deadline Pressure for the ability that fires it more often still, and Carrying tasks between sprints below for how a task can end up unresolved across more than one sprint in the first place).

#### The 12 task abilities

Each ability also gets a flavor name for the task card itself, distinct from the ability name (e.g. a task with the Escalation ability is named "Runaway Process"):

| # | Ability | Task flavor name | Mechanic | Performance gate |
|---|---|---|---|---|
| 1 | Business as Usual | Routine Maintenance | Severity = Performance, calculated once at sprint start (overrides the random split); behaves as normal severity after that (can be raised/lowered like any other task) | all levels |
| 2 | Escalation | Runaway Process | Severity +x/day left unfinished, x = round(Performance/10) | all levels |
| 3 | Retaliation | Defensive Firewall | On any Utility Activation, severity +x, x = round(Performance/10) | all levels |
| 4 | Infectious | Compromised Server | At sprint start, adds x Computer Virus cards (1 under 50, 2 at 51–75, 3 over 75). Finishing this task removes every Computer Virus copy currently in the deck | all levels |
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

**Implementation note — 100 is a hard severity cap**: a task's severity can never exceed 100, full stop. This is enforced at every point severity can increase — the initial budget split, Escalation's daily gain, Retaliation's per-Activation gain, Contagious's daily spread, and Absorption's +10 — not just at generation. Each task's health-bar reference value (`maxSeverity`) tracks its own (already-capped) starting severity, so a task that starts below 100 and gets pushed upward by these abilities shows its bar filling in past the point it started at, capped visually at 100% once severity reaches the ceiling.

### Carrying tasks between sprints

A task that's still unfinished when a sprint ends doesn't just disappear —
it stays a live task into the next sprint, **prepended ahead of that
sprint's own freshly-generated lineup** (so it's first in My Tasks). It keeps
whatever severity/abilities/locked ability amounts it already had, and
continues ticking normally (Escalation/Contagious/Retaliation keep applying
to it every day it's open, same as any other task — severity is still
capped at 100, see above). Its `loss` penalty fires again at the *new*
sprint's end if it's still unresolved then too, on top of whatever it's
already cost — carrying a task doesn't cap how many times it can drain
Performance, only how much each individual hit costs.

Because that carryover has no ceiling on its own — the backlog can only ever
grow, and an old task both keeps growing itself *and* keeps re-costing
Performance every sprint it survives — carried-over tasks get one thing
freshly-generated tasks don't: **Reassign**. At the cost of **2× that task's
`loss`** in Performance, the player can give up on a carried-over task and
remove it from My Tasks on the spot. This is a clean forfeit, not a shortcut
to finishing it — no gain, no card reward, no Infectious deck-wipe. It's
deliberately pricier than a single sprint's worth of loss so it's a real
tradeoff (cut losses now at a premium vs. keep grinding and risk the
recurring cost), not a free out — though per Performance Timing above, the
cost is queued like any other mid-sprint Performance change and only
actually lands (and can only end the game) at that sprint's End Week, not
the instant you click Reassign. Only tasks that actually carried over from a
previous sprint have this option; this sprint's own newly-generated tasks
don't.

### Clearing the board early — Special Task

Checked once per day, at End Day: if My Tasks is empty at the end of Monday,
Tuesday, Wednesday, or Thursday, one more task queues up for the day that's
just starting — **Special Task**. It's generated exactly like a Business as
Usual task — severity locked to current Performance, gain/loss rolled 1–5 as
usual, behaves as normal severity after that — with two differences: its
name, and its reward. Finishing a Special Task skips the normal 74/25/1
Common/Uncommon/Rare odds entirely and rolls a straight **50/50 between Rare
and Uncommon** — never Common, never nothing.

This is the answer to "what happens if you clear the board early": instead
of idle downtime, an empty board at day's end converts into one more
(better-rewarding) task rather than nothing. Checking only once per day (at
the End Day transition, not per-finish mid-day) is what naturally caps it at
one per day — clearing the board twice in the same day doesn't queue two.
Friday itself is never one of the four checked days (Friday's end is End
Week, not a day-to-day transition), but a Special Task queued from
Thursday's check is still there to work on through Friday like any other
task.

### Story / scripted sprints
Tied to the Jo/Marcus/Evergreen narrative, using the existing (currently empty) `SCRIPTED_TASKS_BY_WEEK` hook in `game.js`. These are hand-authored tasks that **can stack multiple effects**, unlike random-sprint tasks which get at most one — reserved for bigger, more memorable narrative set-pieces.

## Open / Unresolved Items

- No concrete story-sprint task has been designed yet (what it looks like tied to an actual plot beat, and how multi-ability stacking should read to the player).
- No numeric balance pass has been done — severity thresholds, cooldown lengths, ability gate thresholds, the severity-budget formula's constants, the starting deck, the gain/loss 1–5 range, Reassign's 2× cost multiplier, Special Task's 50/50 Rare/Uncommon split, and the 20-card deck size cap are all first-draft guesses.
- The whole system has been smoke-tested (full sprint loop, deck editor persistence, Virus outbreak, high-Performance task generation) but not actually playtested for fun/balance versus just working correctly on paper.
