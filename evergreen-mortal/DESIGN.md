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

**Stacking rule**: multiple copies of the *same* Daemon **do** stack — each additional copy in Played multiplies that Daemon's effect by however many copies are active (`daemonCount(id)` in `game.js`, not a plain presence check). A flat bonus (e.g. Signal Amplifier's "+3 severity lowered") becomes +6 with two copies, not a single +3; a triggered action (Task Manager's "Draft from 3") fires once per copy, so two copies queue two separate Draft-from-3 prompts back-to-back rather than one.

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

**Implementation note — queued drafts don't sample from the deck until they're actually shown**: only the bonus draft currently on screen has cards pulled out of the deck. A queued trigger (`bonusDraftQueue` in `game.js`) stores just its requested N, not sampled cards — `sampleAnyFromDeck(n)` (which is also what applies Autoloader/Query Sweep) only runs once that entry is promoted to the active draft (`advanceBonusDraftQueue`), by which point the previously-active draft has already resolved and returned its own cards to the deck (picked card destroyed/deployed, the rest back via `resolveDraftOutcome`). This matters because with 2+ drafts stacked, the deck should only ever be down the *current* draft's cards at any moment, not every queued draft's cards all at once — otherwise a small deck could get sampled past what it actually has available, or the same cards could effectively be "reserved" across multiple simultaneous drafts instead of being available again after each one resolves.

## Automation

Several cards let the player attack a task indirectly: instead of lowering its severity outright, they add **Automation** to it — a plain stacking counter on the task, separate from severity — which then ticks the task's severity down on its own every day.

- **Granting**: a card that "Adds N Automation" to a task simply adds N to that task's current total — cumulative, so a task already holding some just gets more. Granting is not itself a severity change, so unlike lowering severity it does **not** interact with Armored, Layered, Signal Amplifier, or Absorption; those only come into play at the daily tick (below). Targeting rules follow the same convention as everything else: a `target`-kind grant (e.g. Provision Task) is blocked by Distraction like any other single-target effect, while an `all`-kind grant (e.g. Rollout) still lands on Distraction tasks.
- **Daily tick**: once per day, at the same point in `endDay()` where Escalation and Contagious already apply, every task with Automation > 0 loses severity equal to its own Automation total. This *does* go through the shared severity-lowering path, so Signal Amplifier (+3), Armored (half, rounded up), Layered (max 1 per hit), and Absorption (triggers on other tasks) all apply to it exactly like any other source of damage — a heavily-Automated Layered task still only loses 1/day, and an Armored task only loses half your invested total each day.
- **Carryover**: a task's Automation persists if it carries over unfinished into the next sprint, same as its locked ability amounts — investment in a task isn't lost just because the sprint ended before it died.
- **General mechanic**: Automation is real task state (not a locked per-ability `abilityAmounts` slot), so any card or Daemon can read or add to it. Continuous Deployment (Daemon) and Fleet Sync (Utility) both top up Automation on tasks that already have some, on top of the Script cards that seed it in the first place.

## Rarity & Reward Odds

When a task is finished, the reward roll uses these odds:

| Rarity | Odds |
|---|---|
| Common | 74% |
| Uncommon | 25% |
| Rare | 1% |

Pool composition: **23 Common** (11 Script / 8 Utility / 4 Daemon), **12 Uncommon** (6 Script / 4 Utility / 2 Daemon), **3 Rare** (1 of each type), plus **Computer Virus** (outside the normal reward pool — see above for how it actually enters a deck). Total: 39 cards.

Each of the 39 cards below is a single unique named card, not a stack — the only way to end up with more than one copy of the same card is rolling it as a reward twice (or, for Computer Virus, the outbreak mechanic).

**Reward delivery**: finishing a task grants exactly **one** card, rolled against the odds above. The new card goes to the **Collection** folder (the existing deckbuilder pool of owned-but-not-in-this-sprint cards, `sprintState.unused`) — not directly into the sprint's Deck.

**"Play a random X from your deck" with no eligible X**: if the deck contains no card of the required type, the effect simply does nothing (no fizzle penalty, no substitution).

### Rarity indicator (UI)

Rarity is shown as a small solid-color corner-ribbon triangle (CSS border-triangle on a `::after` pseudo-element, `--rarity-common`/`--rarity-uncommon`/`--rarity-rare` in `index.html`), additive to (not replacing) the type indicator's colored left-border. Every card shows a ribbon, including Common — there's no "no ribbon" state for owned cards, so a missing ribbon always means Computer Virus (`rarity: null`), never "this card's rarity didn't render." Appears everywhere a card renders: the live board (`.sprint-card`, via `renderLibraryCard`/`renderDraftOptionCard`/`renderPlayedCard`), the Sprint Summary Rewards column (reuses `renderLibraryCard`, so no separate code path), and the deck editor (`.file-tile`, via `fileTile()`).

**Implementation note — same corner on both surfaces, badge moved instead**: both `.sprint-card` and `.file-tile` ribbons sit top-right. That corner was already occupied on `.file-tile` by the existing `×N` stack-count badge (`.file-count`), which used to deliberately hang outside the tile's bounds via negative offsets — resolved by moving `.file-count` to top-**left** (freeing top-right for the ribbon) *and* pulling it fully inside the tile (`top: 2px; left: 2px;`, no longer negative) so `.file-tile` could finally get `overflow: hidden` too, matching `.sprint-card` — without that, the ribbon's square corner poked out past the tile's 6px rounded corner instead of being clipped flush to it.

**Implementation note — the `overflow: hidden` regression**: giving `.sprint-card`/`.file-tile` `overflow: hidden` (for the ribbon corner-clip above) has a flexbox side effect — both are themselves flex items (inside `.board-column-body`/`.summary-section-body`, and `.file-folder-body`, respectively), and `overflow` values other than `visible` reset a flex item's *automatic minimum size* from content-based to `0`. With enough cards in one column to exceed its visible height, `flex-shrink` (default `1`) then compresses every card down to near-nothing instead of the column just scrolling — silently clipping all their text down to roughly one line. Fixed with an explicit `min-height: min-content;` on both, restoring content-based sizing (cards can no longer shrink below what their own text needs) while the ribbon's small corner-overhang is still clipped by `overflow: hidden` as intended. Any future flex item that gets `overflow: hidden` for some other reason should get the same `min-height: min-content` treatment, or it'll silently reproduce this exact bug.

### Copy Limits & Reward Exhaustion

Ownership of any single named card — counted across Deck, Collection, and Played combined, since all three are cards the player currently owns — is capped by rarity: **Common max 10, Uncommon max 5, Rare max 2**. Computer Virus is exempt (it's outside the reward pool entirely; see above).

The cap only constrains *collecting* copies, never *deploying* them — a player below the cap can always put every owned copy of a card into the Deck, subject only to the Deck's own size limit (see Deck Size below). There is no separate "copy limit" check on the Deck folder itself; it's enforced entirely at the point a reward is granted:

1. Roll the intended rarity as normal (74/25/1, or Special Task's 50/50 Rare/Uncommon — see below).
2. If any card of that rarity is below its cap, grant a random one of those eligible cards, same as today.
3. If *every* card of that rarity is at its cap, fall back to a substitute rarity: **Common → Uncommon, Uncommon → Rare, Rare → Uncommon**. (Not a symmetric cycle — Rare's fallback is Uncommon, not Common.)
4. If the substitute rarity is also fully maxed, the one rarity that is neither the original roll nor the substitute is guaranteed instead.
5. If all three rarities are fully maxed out, no reward is granted at all.

### Starting Deck

No starting-deck composition was specified in the original design session, so a 10-card placeholder was chosen for the first sprint: **2× Quick Patch, 2× Broadcast Ping, 2× Debugger, 1× Priority Queue, 1× Background Sync, 1× Garbage Collection, 1× Force Quit**. This is first-draft content, same status as the rest of the numeric balance (see Open Items) — expect it to change. It's edited via the same Deck / Collection editor as every other sprint's deck, so once Sprint 1 is underway, "starting deck" and "current deck" are the same folder. It sits exactly at the Deck's minimum size (see below), so it leaves no headroom below the floor.

### Deck Size

The Deck folder in the deckbuilder is bounded on both ends: a **minimum of 10** and a **maximum of 40** cards — but the two bounds are enforced differently. The **maximum** blocks the drop itself: the editor won't let you drag a card from Collection into an already-full Deck (shown as "Deck (40/40)" in the header), showing a "not allowed" cursor rather than the usual drop highlight (`isFolderDropBlocked` in `game.js`). The **minimum** doesn't block anything — the player can freely drag Deck below 10 cards. Instead, going below the minimum blocks *advancing to the next sprint*: the "Go to Next Sprint" button (`renderDeckEditor`) becomes disabled, turns red (`.day-btn-blocked`), and its label changes to "Deck must have 10 cards"; the Deck folder's own header text ("Deck (x/40)") also turns red (`.file-folder-header-warning`) as a second, persistent signal even after the player's attention has moved elsewhere. `advanceToNextSprint()` also re-checks the minimum itself as a defensive guard, not just relying on the button being disabled. Neither bound constrains the *live* sprint deck during play, which can already legitimately fall below 10 (cards out in Played) or exceed 40 (Computer Virus's outbreak duplication, Played cards folding back in at sprint's end) — those are unaffected.

### Display Order (deck editor)

Both the Deck and Collection folders display their (stacked, one-tile-per-owned-card grouping) contents in a fixed order, not insertion/roll order: **Script, then Utility, then Daemon**; within each type, **Common, then Uncommon, then Rare**; within each type+rarity group, alphabetical by name (`groupCardsByTemplate` in `game.js`, `CARD_SORT_TYPE_ORDER` + the existing `RARITIES` array). Computer Virus isn't covered by this ordering — see the Rarity indicator note above for why it's never actually present when the deck editor is shown.

### Common — Script (11)

1. **Provision Task** — Add 10 Automation to target task.
2. **Rollout** — Add 2 Automation to all tasks.
3. **Prefetch** — Add two new cards to your draft, then select another card to play. (Implemented as Draft from 2 — see "Draft from N" above.)
4. **Run Pipeline** — All tasks with at least 1 Automation lose 50 severity.
5. **Quick Patch** — Target task loses 15 severity.
6. **Broadcast Ping** — All tasks lose 5 severity.
7. **Deep Scan** — Random task gains 5 severity, then Draft from 5 (pick 1 of 5 random cards from your deck to play).
8. **Force Quit** — Finish target task with severity 30 or less.
9. **Kill Top Process** — The task with the highest severity loses 50 severity.
10. **Garbage Collection** — The task with the lowest severity loses 50 severity.
11. **Buffer Overflow** — Target task with more than 70 severity loses 70 severity.

### Common — Utility (8)

1. **Debugger** — Cooldown 1: target task loses 5 severity.
2. **Deploy Agent** — Cooldown 2: Add 5 Automation to target task.
3. **Task Scheduler** — Cooldown 1: lower the Activate timer of another card by 1.
4. **Load Balancer** — Cooldown 2: All tasks lose 5 severity.
5. **Priority Queue** — Cooldown 2: The task with the highest severity loses 15 severity.
6. **Auto-Cleanup** — Cooldown 1: Finish all tasks under 10 severity.
7. **Fleet Sync** — Cooldown 1: Add 5 Automation to all tasks with at least 1 Automation.
8. **Auto Resolve** — Cooldown 3: Finish target task with severity 20 or less.

### Common — Daemon (4)

1. **Background Sync** — When you Activate a Utility, all tasks lose 2 severity.
2. **Signal Amplifier** — Whenever you lower the severity of a task, lower its severity by 3 more. (Must not trigger itself — this just adds 3 to whatever amount is being lowered, it doesn't re-fire on its own bonus.)
3. **Task Manager** — When you finish a task, Draft from 3.
4. **Autoloader** — When you Draft, add 1 card to the Draft.

### Uncommon — Script (6)

1. **Force Terminate** — Finish target task with severity 50 or less.
2. **Full System Scan** — All tasks lose 1 severity for each card in your deck.
3. **Hard Reset** — Lower the Activate timer of all cards to 0.
4. **Purge** — All tasks with more than 50 severity lose 25 severity.
5. **Cascade Failure** — All tasks lose 5 severity for each Activate effect you triggered today.
6. **Remote Trigger** — Activate target Utility. Can target any Utility currently in Played, even one on cooldown — that's the point (an early/bonus trigger) — and the target's cooldown is left completely unaffected either way. Everything else about a real Activate still happens (Cascade Failure's tally, Retaliation, Activate-triggered Daemons).

### Uncommon — Utility (4)

1. **Hot Swap** — Cooldown 3: Draft from 3.
2. **Batch Job** — Cooldown 4: Play 2 random cards from your deck.
3. **Load Shedding** — Cooldown 2: Lower the severity of a random task by 30.
4. **Watchdog Timer** — Cooldown 1: Add 5 automation to the task with the highest severity.

### Uncommon — Daemon (2)

1. **Continuous Deployment** — Each time you Activate a Utility, add 1 Automation to all tasks.
2. **Chain Reaction** — When you run a Script, all tasks lose 5 severity.

### Rare — Script (1)

1. **Root Access** — Play all other cards in this draft.

### Rare — Utility (1)

1. **Master Key** — Cooldown 1: Draft from 2.

### Rare — Daemon (1)

1. **Query Sweep** — Each time you Draft, all tasks lose 5 severity.

**Implementation note — multi-play auto-targeting**: Batch Job and Root Access can each cause more than one card to resolve back-to-back, which breaks down if two of them need a target at once (there's only one "choose a task" prompt at a time). Any target-needing card resolved this way auto-targets the current highest-severity eligible task instead of prompting the player — this only applies to the *other* cards a multi-play triggers, never to a card you draft and pick normally.

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
7. **Gain / loss** — independent of severity and ability: every task carries a fixed **gain** of 1 and **loss** of 1. **Gain** is the Performance awarded when the task is finished (severity reaches 0). **Loss** is the Performance penalty applied if the task is still unresolved at sprint's end — and it fires **every sprint** the task remains open, not just once (see Deadline Pressure for the ability that fires it more often still, and Carrying tasks between sprints below for how a task can end up unresolved across more than one sprint in the first place). Not shown on the board itself (see below) since it's now the same for every task; still tracked per-task internally since Reassign and Deadline Pressure key off it.

#### The 12 task abilities

Each ability also gets a flavor name for the task card itself, distinct from the ability name (e.g. a task with the Escalation ability is named "Runaway Process"):

| # | Ability | Task flavor name | Mechanic | Performance gate |
|---|---|---|---|---|
| 1 | Business as Usual | Routine Maintenance | Severity = Performance, calculated once at sprint start (overrides the random split); behaves as normal severity after that (can be raised/lowered like any other task) | all levels |
| 2 | Escalation | Runaway Process | Severity +x/day left unfinished, x = round(Performance/10) | all levels |
| 3 | Retaliation | Defensive Firewall | On any Utility Activation, severity +x, x = round(Performance/10) | all levels |
| 4 | Infectious | Compromised Server | At sprint start, adds x Computer Virus cards (1 under 50, 2 at 51–75, 3 over 75). Finishing this task removes every Computer Virus copy currently in the deck | all levels |
| 5 | Armored | Hardened Legacy System | Takes half damage, universally, from any effect type | >35 |
| 6 | Absorption | Load Aggregator | Gains x severity whenever any other task's severity is lowered, x = round(Performance/10) | >40 |
| 7 | Draft Squeeze | Resource Contention | Day's Draft samples 2 cards instead of 3 while alive | >50 |
| 8 | Sluggish Systems | Throttled Pipeline | All Utility cooldowns +1 while alive | >50 |
| 9 | Contagious | Spreading Outage | Every other task's severity +5/day while alive | >50 |
| 10 | Distraction | Decoy Ticket | Immune to `target`-type effects only (`all`/`highest` still work) | >60 |
| 11 | Deadline Pressure | Executive Escalation | Loss penalty fires every day *and* again at sprint end | >70 |
| 12 | Layered | Encrypted Vault | Severity starts at 5 (overrides the random split); can only be lowered by 1 per hit, regardless of card power, from then on | >80 |

Performance gates are checked once, at the moment a sprint's tasks are generated — an ability stays locked in for that task's whole life even if Performance later crosses back over the threshold.

**Implementation note — locked magnitudes, not just gates**: the same "checked once, locked for the task's life" rule extends to the *x* values above, not only to whether the ability is eligible in the first place. Escalation's, Retaliation's, and Absorption's `x = round(Performance/10)`, and Infectious's virus count, are all rolled once at task generation and stored on the task — they do **not** silently recompute from Performance's current value later in the sprint (Performance can move a lot in five days). This also means the in-game ability description on a task always states its exact locked number (e.g. "Gains 6 severity every day it stays unfinished") rather than the general formula. Deadline Pressure's daily penalty is likewise just the task's own `loss` stat, already fixed at generation.

**Implementation note — 100 is a hard severity cap**: a task's severity can never exceed 100, full stop. This is enforced at every point severity can increase — the initial budget split, Escalation's daily gain, Retaliation's per-Activation gain, Contagious's daily spread, and Absorption's per-trigger gain — not just at generation. Each task's health-bar reference value (`maxSeverity`) tracks its own (already-capped) starting severity, so a task that starts below 100 and gets pushed upward by these abilities shows its bar filling in past the point it started at, capped visually at 100% once severity reaches the ceiling.

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
Usual task — severity locked to current Performance, gain/loss fixed at 1
as usual, behaves as normal severity after that — with two differences: its
name, and its reward. Finishing a Special Task skips the normal 74/25/1
Common/Uncommon/Rare odds entirely and rolls a straight **50/50 between Rare
and Uncommon** — never Common, never nothing.

**Visual indicator**: a Special Task's card gets a "Special" text badge next
to its name and a `--rarity-rare`-colored outline (`.special-task` in
index.html/game.js) — reusing the rarity ribbon's "rare" amber rather than
introducing a new color, since a Special Task's reward odds are themselves
rare-tier-or-better. Shown everywhere the task itself renders: the live "My
Tasks" board (`renderSprintTask`), Finished Tasks and the Sprint Summary's
Finished/Carried-over columns (both reuse `renderSprintTask`/
`renderFinishedTask`, so no separate code path). If a Special Task is also
currently targetable, the `.targetable` accent-green outline takes over
instead (targeting state is the more time-sensitive signal).

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

## Player Onboarding

Teaching the player the board's rules is being tackled in three stages (in this order): a one-time tutorial (implemented), rotating in-app tips (implemented), and a wider board/rewards/deck-builder UI pass (not yet implemented) focused on visual hierarchy — making what's urgent and actionable clear at a glance rather than relying on players reading dense text. Story-sprint signaling (how the player knows when a sprint is about to hand off into a story beat) is deferred until story/scripted sprints themselves are designed — see Open Items.

### First-sprint tutorial

A single-screen, one-time primer (`SPRINT_TUTORIAL_POINTS` / `showSprintTutorial` in `game.js`) shown the first time the player opens EverSprint with real tasks loaded — i.e. the moment `buildEverSprintApp`'s `tasksLoaded` check first passes. It's a dim scrim (`.sprint-tutorial-overlay`) covering and blocking the board, with one card listing exactly the facts needed to play a sprint at all:

1. Sprints run 5 days; complete the tasks assigned during it.
2. Each task has a Severity bar; reduce it to 0 to finish the task.
3. Draft a card at the start of each day and use cards to finish tasks.
4. Finishing tasks raises Performance; leaving tasks unfinished lowers it.
5. Reach 100 Performance for a promotion.

Deliberately left out: the fail condition (Performance hitting 0), the End-Week-only timing of Performance changes, the three card types' distinct behaviors, targeting, and every deeper mechanic (Automation, task abilities, Virus outbreaks, Reassign) — those are rolling-tips territory instead, so this stays a single short screen rather than a multi-step wizard.

Dismissing it (the only control is "Got it" — no Skip, since there's nothing to skip past on one screen) marks it seen (`sprintTutorialSeen`, persisted in the `evergreen-mortal-progress` localStorage blob alongside the rest of progress) so it never shows again. There's currently no in-app way to replay it once dismissed.

**Implementation note — no spotlighting**: an earlier version of this was a 5-step wizard that spotlighted board elements per step (CSS box-shadow ring via `.tutorial-spotlight`, deliberately kept beneath the scrim's z-index so the glow read through the translucency without covering the card's own buttons). That approach was replaced once the content was cut down to five tightly-related, non-visual facts — spotlighting made sense when steps pointed at specific board elements, not for a plain list. The `data-column` attributes added to board columns for that spotlighting remain in the markup but ended up unused by the rolling tips below, which turned out not to need spotlighting either.

### Rolling sprint tips

A pool of 18 short facts (`SPRINT_TIPS` in `game.js`) rotates through the board header's hint slot (`.sprint-hint`) every 30 seconds, one at a time in order, looping — covering the deeper mechanics the tutorial deliberately leaves out: card-type behavior and targeting, Automation, Reassign's cost, task carryover, Performance scaling with difficulty, Daemon stacking, Special Task, card rewards, deck copy limits and size bounds, and Draft-from-N as a search tool. `startTipRotation()` (re-armed on every `buildEverSprintApp` call, so there's only ever one timer) advances the index and writes the new tip directly into the DOM rather than triggering a full board re-render, and self-clears if the EverSprint window has since been closed (there's no per-app close hook in this codebase's window manager to unsubscribe from otherwise — see `createWindow`).

That hint slot used to show contextual prompts instead — "Choose a task to target.", "Choose a card to target.", "Bonus draft available — pick one or decline.", "Pick one card from today's Draft to continue." — computed from `sprintState.pendingTarget` / `pendingCardTarget` / `bonusDraft` / `dailyDraftResolved`. That hint *text* was removed outright (the tips fully own the slot now, all the time, including mid-target-selection or mid-bonus-draft) — but those four state flags themselves were untouched and still drive everything else they always did: which tasks/cards get the `.targetable` glow, which column shows the bonus draft options, whether End Day is enabled.

**Not yet covered by any tip**: the End-Week-only timing of Performance changes — flagged during design discussion as the rule most likely to confuse a new player (the score visibly doesn't react to finishing a task) — didn't make it into either the tutorial or this tip pool. Worth a tip whenever this list gets revisited.

### Column highlighting

A first small piece of the still-otherwise-unimplemented visual-hierarchy pass: the Draft and Played columns get the same accent-glow outline `.targetable` tasks/cards already use (`.board-column-highlight` in index.html), computed once per render in `renderEverSprintBoard` as `isDrafting`/`shouldHighlightPlayed`, to point at whichever column actually has something to do right now:

- **Draft** highlights whenever `isDrafting` — the daily mandatory pick isn't resolved yet, *or* a bonus draft is currently showing (a bonus draft renders inside the Draft column too, via `renderDraftColumnBody`, so both cases are "look at Draft").
- **Played** highlights whenever `!isDrafting && hasAvailableActions()` — nothing in Draft needs attention, and at least one deployed Utility is off cooldown. `hasAvailableActions()` is the same check the End Day button's own color already keys off of, so the two never disagree about what's actionable.

The two are mutually exclusive by construction (Played's condition is gated on `!isDrafting`), so at most one column is highlighted at a time.

### Sprint Log

A running, human-readable record of what happened during the sprint(s) so far — added so a stuck or confusing board state can be traced back after the fact instead of just guessed at. `logEvent(message)` (`game.js`) appends `{ week, day, text }` entries to `sprintState.log`, tagged with whatever `weekNumber`/`dayIndex` was current *at the moment logged* (so a log call placed before a day/week transition tags with the day that's ending, one placed after tags with the day that's starting — used deliberately at each transition, not just wherever was convenient). Capped at `SPRINT_LOG_MAX_ENTRIES` (300) — oldest entries drop off first — so a long play session can't grow it unbounded.

**What gets logged**: daily draft ready (with the 3 card names) and its pick, bonus draft open/queued/promoted/skipped-empty and its pick/decline, Computer Virus decline-and-duplicate, Utility activation, task finish/reassign, Special Task spawn, task assignment at sprint start, every Performance change (including the promoted/fired transition), and End Day/End Week transitions. Deliberately **not** logged: individual severity/Automation ticks from card and Daemon effects (Signal Amplifier, Query Sweep, Automation's daily tick, etc.) — these fire often enough that logging each one would bury the action-level events above in noise; the action that triggered them (an Activation, a draft pick, End Day) is what's logged instead.

**UI**: hidden by default behind a toggle button (`☰`, titled "Sprint Log") added to the window's own titlebar controls (`addSprintLogToggleButton`, next to minimize/maximize/close) rather than inside the board content — deliberately, since `everSprintBoardEl`'s contents get fully wiped and rebuilt on every `renderEverSprintBoard()` call (so anything placed inside it needs to be re-added every render, including across gameOver/summary/deck-editor/active-board phase changes) while the titlebar doesn't, and `rebuild()` (on window restore) only re-runs `build(contentEl)`, not `createWindow` itself, so the toggle only needs to be added once per window and is guarded against being added twice. The panel itself (`appendSprintLogPanel`) **is** re-added inside every `renderEverSprintBoard()` branch when `sprintLogOpen` is true — a scrim + scrollable card, auto-scrolled to the bottom (most recent entries) each time it opens, closeable via its own Close button or the titlebar toggle again.

## Open / Unresolved Items

- No concrete story-sprint task has been designed yet (what it looks like tied to an actual plot beat, and how multi-ability stacking should read to the player) — including how the player is cued that a sprint is about to shift into a story beat rather than routine work.
- The rolling tips pool doesn't cover Performance's End-Week-only timing, Virus outbreak behavior, or most individual task abilities beyond a generic "pay attention to task effects" nudge — candidates for future additions to `SPRINT_TIPS`.
- A visual-hierarchy pass across the sprint board, rewards/summary screen, and deck builder is planned but not yet implemented — today's layout leans on dense text rather than guiding the eye to what's urgent or actionable.
- No numeric balance pass has been done — severity thresholds, cooldown lengths, ability gate thresholds, the severity-budget formula's constants, the starting deck, the fixed gain/loss of 1, Reassign's 2× cost multiplier, Special Task's 50/50 Rare/Uncommon split, the 10–40 deck size range, the 10/5/2 copy limits, and Automation's grant/payoff amounts are all first-draft guesses undergoing active playtesting revision.
- The whole system has been smoke-tested (full sprint loop, deck editor persistence, Virus outbreak, high-Performance task generation) but not actually playtested for fun/balance versus just working correctly on paper.
