# Acts, Hours & Investigations — Design Proposal

> **Status: proposal — partly implemented.** **Hours & the Day Loop** is built for a single act (4 hours/day, 4-hour draft), and **Investigations** are built (Act 1's set, as checklists — one step and reward per pick, replies arriving next sprint); both are described in `DESIGN.md`. Acts, the Case Files archive and the deck-size change are not built yet, and several pieces are still open (see Open Questions at the bottom). `DESIGN.md` remains the source of truth for how the game currently behaves; once this proposal is implemented, the parts it changes should be folded into `DESIGN.md` and this file retired or trimmed to whatever's still unbuilt.

## Overview

Evergreen grows from a single promotion into the full game: **five acts, one per promotion**. Two new systems come with it:

- **Hours** — a daily resource spent on drafting, turning the draft from a fixed once-a-day step into something the player chooses to spend.
- **Investigations** — a new kind of card that lives in the deck and, when worked to completion, opens up new parts of the story.

**Design pillar: doing your job vs. finding out the truth.** Tasks remain the enemies, and finishing them is still how Performance (and promotion) is earned — that doesn't change. Investigations never touch Performance directly. Their cost is the work you *don't* get done while you're pursuing them: every draft pick spent on an investigation is a pick not spent on a work card.

## Acts & Promotion

- The game has **5 acts**; each promotion (reaching 100 Performance) ends one act and starts the next.
- **Performance resets to 10** after every promotion.
- Each act grants more daily resources. **Act 1 (intern) has 4 hours/day; Act 2 has 8 hours/day**, growing further in later acts. Exact later values are TBD.
- Resources come from two places: **promotions** (e.g. more daily hours) and **cards** (e.g. a card that reduces the hours a draft costs).

At the base draft cost of 4 hours, Act 1 plays almost exactly like the current game — one draft per day — so the already-playtested version becomes the intern act, and each promotion opens up something new.

**Deferred to implementation**: difficulty scaling and sprint generation per act. Today, task-ability Performance gates, the severity-budget formula, and story unlocks (`PERFORMANCE_MILESTONES` in `game.js`) are all keyed to a single 0–100 Performance climb. With Performance resetting every act, all three will need to become act-aware.

## Hours & the Day Loop

**Drafting costs hours; cards themselves cost nothing to play.** Base draft cost is **4 hours**.

The player chooses when to draft by clicking a Draft button — the day no longer opens straight into a draft:

```
Day start (cooldowns tick, hours = daily allotment + bank)
  │
  ▼
Free play ── activate Utilities, Reassign, etc. as much as you like
  │
  ├─ [Draft] (enabled if hours ≥ draft cost) ──► Draft modal: board locked, pick 1
  │                                               │  hours −= cost
  │                                               ▼
  │                                     (bonus drafts / targeting resolve)
  │                                               │
  └──────────────────◄──────── back to Free play ─┘
  │
  └─ [End Day] (enabled only when hours < draft cost) ──► bank remainder ──► next day
```

- **Utilities can be Activated any time a draft isn't open — including before the day's first draft.** This is a change from today, where the daily draft must be resolved before any Utility can fire. A Utility that came off cooldown overnight can be used to deal with a threat *before* the player decides what to look for in the draft.
- **While a draft is open, the board is locked** — the only thing the player can interact with is the draft. This matches how bonus drafts already behave.
- **Drafting is still mandatory**, in the sense that **End Day stays disabled as long as the player can afford another draft**. The day only ends once remaining hours are below the draft cost.
- **Bonus Draft-from-N prompts stay free** — they're card effects, and cards don't cost hours. (This makes Prefetch/Hot Swap/Master Key effectively "drafts you didn't pay for.")

### Banking

Unused hours at End Day **carry over to the next day** within the same sprint, and are **lost at End Week**.

Because the player can't end the day while they can still afford a draft, the bank is always *less than one draft's cost* — it only ever carries a remainder, so it can't be used to hoard whole days of drafts. Its job is to make sure odd leftover hours (from cost discounts, hour-draining effects, etc.) aren't wasted, just deferred.

Example with 8 hours/day and a discounted draft cost of 3:

| | Hours available | Draft cost | Drafts | Banked to tomorrow |
|---|---|---|---|---|
| Mon | 8 | 3 | 2 | 2 |
| Tue | 8 + 2 = 10 | 3 | 3 | 1 |
| Wed | 8 + 1 = 9 | 3 | 3 | 0 |
| … | | | | |
| Fri | whatever's left | | | lost at End Week |

### Edge cases (proposed rulings)

- **Deck smaller than the draft size** (e.g. 2 cards left, draft from 3) → draft from whatever's left, same as `sampleAnyFromDeck` behaves today.
- **Deck empty but hours remain** → drafting isn't possible, so End Day becomes available.
- **A draft offering only Computer Viruses and/or investigations** → still a mandatory pick. That's the deck-flood pressure working as intended.
- **Hours change mid-day** (a card grants hours, a task ability drains them) → the Draft and End Day buttons simply re-check against the current total.
- **Column highlighting**: the Draft button highlights whenever a draft is affordable; Played highlights whenever a Utility is off cooldown — possibly both at once now, rather than today's mutually-exclusive Draft/Played glow.

## Investigations

Investigations are a new kind of card. Instead of severity, each has **Information Needed** — a number that counts down to 0.

- **They live in the deck**, not in the My Tasks column. They show up in drafts like any other card.
- **Picking one in a draft lowers its Information Needed by 1.** It must actually be *picked* — merely appearing in a draft does nothing. This applies to every kind of draft: the daily draft and bonus Draft-from-N prompts alike. An investigation forced into play by an untyped "play N random cards" effect (Batch Job, Root Access) also counts as picked.
- After being picked, an investigation with Information Needed remaining returns to the deck like any other unplayed card.
- **When Information Needed reaches 0**, the card is removed from the deck, triggers its associated story content — **any number of emails and/or journal entries** — and is moved to an archive for historical reference (working name "Case Files"; exact UI TBD).
- **Locked into the Deck.** Investigations can't be moved to Collection in the deck editor, so the player can't dodge them.
- **They count toward deck size** (see Deck Size below).
- **Carryover is automatic** — they never leave the deck until completed, so an unfinished investigation simply persists into the next sprint.
- **No existing card interacts with them.** The current card pool's severity/automation/finish effects never touch an investigation. New cards will be designed specifically to interact with them.
- **No direct effect on Performance**, in either direction.

### How investigations enter the deck

There are several ways, and more may be added later:

- **Passing a Performance threshold** — the most common. This extends the existing `PERFORMANCE_MILESTONES` table in `game.js`, which already maps thresholds to emails and journal entries (each delivered once, guarded by the item's own `delivered` flag), with a third delivery type: investigation.
- **Finishing another investigation** — an investigation's completion payload can include further investigations alongside its emails and journal entries, so investigations can chain.

Both are the same idea: a trigger delivers a list of story items, and an investigation is one kind of story item.

- **No previews.** An investigation is invisible until it actually enters the deck — no teasers, no locked Case Files entries.
- **No cap.** Any number of investigations can be in the deck at once; managing a flooded deck is the player's problem (see below). Revisit if playtesting shows it's punishing.

### The deck-flood tension

Because investigations only progress when picked, and are locked into the deck:

- **A bigger deck means slower investigations** — they come up in drafts less often.
- **A smaller deck means faster investigations** — but every pick spent on one is a work card not picked.
- As investigations accumulate, the player either **adds more work cards** to keep drafts from getting flooded, or **spends picks clearing investigations** at the cost of work that doesn't get done.

## Deck Size (changed rule)

The 10–40 deck size bounds are now **both enforced only at the "Go to Next Sprint" gate**:

- A deck below 10 *or above 40* when starting a sprint must be fixed first. Investigations count toward both bounds and can't be removed, so e.g. a 40-card deck that gains an investigation means cutting a work card before the next sprint.
- **Mid-sprint growth past 40 is fine** (Computer Virus outbreaks, new investigations arriving, Played cards folding back at sprint's end).
- The deck editor still refuses drops into a deck that's already at or above 40, so the player can only remove cards until it's legal.

This differs from today, where the 40 max is enforced only on drop and the 10 min only at the gate.

## Card Pool Impact

The card pool will need a full pass — editing existing cards, cutting some, and adding many new ones — best done *after* the systems above are settled, so cards can be judged against them.

**Existing cards to look at first** (their wording or power assumes one draft per day):

- **Query Sweep** ("each time you Draft, all tasks lose 5") — now fires multiple times a day.
- **Autoloader** ("when you Draft, add 1 card") — applies to every draft.
- **Task Manager** — chained bonus drafts, now on top of multiple paid drafts.
- **Cascade Failure** ("for each Activate you triggered today") — longer days, more activations.
- **Task Scheduler / Hard Reset** — cooldown manipulation, now that activations are freer within a day.
- **Prefetch / Hot Swap / Master Key** — free Draft-from-N in a world where normal drafts cost hours.
- **Computer Virus** — declines happen multiple times per day, so outbreaks accelerate.
- **Resource Strain** (task ability) — "Draft samples 2 instead of 3" applies to every draft; wording fine, effect stronger.

**New card space:**

- **Investigation support** — e.g. search effects ("Draft from 3 investigation cards only"), extra progress ("when you pick an investigation, lower its Information Needed by 1 more").
- **Hours / draft-cost modifiers** — e.g. reduced draft cost, bonus hours.
- **Hour-draining task abilities** — e.g. "Mandatory Meeting: −2 hours every day while alive."

## Open Questions

- **Other investigation entry points** beyond thresholds and chains (e.g. story emails, finishing certain tasks, scripted sprints, act transitions).
- **Per-act milestones** — Performance resets to 10 each act, so thresholds need to be keyed by act (`PERFORMANCE_MILESTONES` is currently one 0–100 list).
- **When a chained investigation arrives mid-sprint** — straight into the live deck, or at sprint end.
- **Information Needed values** — hand-set per investigation, or scaled by act.
- **Investigation-support and hours-modifier card designs.**
- **What each promotion grants beyond hours** — ideas so far: larger draft size, deck-limit changes, rarity access (replacing the current Performance<30 Rare lockout), title-specific abilities (e.g. a manager can Reassign any task).
- **Difficulty scaling and sprint generation per act.**
- **Draft cost per act** — 4 hours base; does the base ever change between acts?
- **Case Files archive UI** — deck-editor folder vs. its own desktop app; likely doubles as a story index linking to the emails/journal entries each investigation unlocked.
