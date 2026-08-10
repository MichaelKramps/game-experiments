# CorrMail — Design Notes

This file documents **mechanics and design decisions only** — the rules
and patterns that should stay consistent as more content gets added.
Actual implemented narrative content (email bodies, character voices in
practice, specific addresses, specific numbers) lives in `game.js` and
isn't duplicated here — read the code for "what does it currently say,"
read this file for "how does the system work / why was it built this
way."

## Concept

A semi-idle game shaped like an email client. **Corr** is a computer with
a smart operating system, discovered mid-boot by the player. Once the
player replies to Corr's first message, Corr comes online and begins
mining **CorrCoin** continuously in the background. The player spends
CorrCoin in the **Marketplace** on computer parts to make Corr more
powerful, and sends Corr on **Hacking** attempts to earn new contacts,
parts, algorithms, and story progress. Email is still how the player
talks to Corr and to contacts, but it's one system among several now, not
the whole game.

This replaced an earlier version of CorrMail built around decrypting
files and a branching contact/keyword story. That version is gone; this
doc describes the current system only.

## Navigation

Five tabs, no masked/unmasked duality (that concept belonged to the old
decrypt-themed version and doesn't apply here):

| Tab | Behavior | Gated until Corr online? |
|---|---|---|
| Inbox | Real inbox: list + reading pane + reply/compose | No |
| Corr Status | Live panel: parts, mining rate, power, CorrCoin | Yes |
| Marketplace | Buy parts with CorrCoin | Yes |
| Hacking | Opportunity list + status of active/completed hacks | Yes |
| Trash | Real trash: move-to-trash / restore / delete forever | No |

Gated tabs (`NAV_TABS[].gated` in `game.js`) render visibly but disabled
before `state.corrOnline` is true, rather than being hidden outright —
seeing what's coming is part of the idle-game hook. Inbox and Trash are
generic email-client furniture, not Corr-specific, so they're never
gated.

Only Inbox and Trash use the list + reading-pane layout. Corr Status,
Marketplace, and Hacking each have their own render function
(`renderStatusPanel()`, `renderMarketplacePanel()`, `renderHackingPanel()`)
that writes directly into the reading pane (`#reading`), reusing its
`.headers`/`.content`/`.actions` styling rather than introducing a
parallel DOM structure. `renderAll()` is the single dispatch point that
decides which of these to call based on `state.activeTab`.

## Trash — real delete, on purpose

**Design decision:** unlike the previous version of this game (which
explicitly banned delete because state lived on email objects via
`onRead`/`onActionComplete` callbacks that delete could silently orphan),
Trash now behaves like a real email client: `Move to Trash`, `Restore`,
and `Delete Forever` are all real actions (`moveToTrash()`,
`restoreFromTrash()`, `deleteForever()` in `game.js`).

This is safe because of a structural rule, not a ban: **emails never
carry callbacks.** Any state change a piece of correspondence represents
— CorrCoin, a new part, a new algorithm, an unlocked hack, corrOnline
flipping true — is applied by `deliverReward()` (or, for the one Corr
story beat, `handleCorrFirstReply()`) *before* the email is pushed into
the inbox, not when the player reads or deletes it. Deleting the email
itself is always inert. Keep new content following this rule: if you're
tempted to hang a callback off an email again, apply the state change at
delivery time instead and make the email pure notification.

## Mining

`state.miningRate` (CorrCoin/sec) is recalculated by `recalcStats()` any
time owned parts or algorithms change: `baseMiningRate` (0.1/sec) plus
each owned part's `effect.miningRate` plus each owned algorithm's. `power`
is accumulated the same way and currently only feeds the Corr Status
panel — it doesn't affect anything yet (see Hacking below).

Two separate code paths compute mining, and both need to stay separate:

1. **Live tick** — `tick()` runs on a 100ms `setInterval`, computing
   elapsed real time since its own last call (not a fixed increment) and
   adding `miningRate * deltaSec` to `state.coins`. Using real elapsed
   time means a throttled background tab doesn't visibly jump or drift
   once it resumes.
2. **Offline catch-up** — `applyOfflineProgress()` runs once, during
   `loadState()`, and adds `miningRate * (elapsed seconds since
   lastSaveTs)` in a single step. This is what makes the game feel idle
   rather than resetting on every reload.

**Don't merge these into one function.** The live path needs to run
continuously and cheaply; the offline path needs to run exactly once, at
load, before the first render.

## Marketplace

`PARTS` in `game.js` is a static catalog: `{ id, name, cost, effect:
{miningRate, power} }`. Purchases are one-time (`buyPart()` checks
`ownedPartIds` and refuses a repeat buy) — there's no scaling repeat-cost
curve yet. Only `ownedPartIds` (a list of ids) is persisted; the catalog
itself is derived at render/recalc time by looking ids up in `PARTS`.
Algorithms (`ALGORITHMS`, currently empty) follow the identical pattern
and are meant for hacking rewards specifically — nothing is purchasable
with CorrCoin as an algorithm today.

## Hacking

`HACKS` is a static catalog: `{ id, name, description, unlock, durationMs,
reward }`.

- `unlock` is a small tagged object (currently only `{type:
  'corrOnline'}`), read by `isHackUnlocked(hack, state)`. Add new unlock
  types here (e.g. a story flag, or requiring another hack completed)
  rather than special-casing hack ids elsewhere.
- `reward.type` is one of `'coins' | 'part' | 'algorithm' | 'contact' |
  'story'`, handled by `deliverReward()`. This is deliberately data-driven
  — a new hack with a new reward payload of an existing type needs no new
  code, and a genuinely new reward type is one new branch in
  `deliverReward()`.

**Hacking's actual gameplay is not designed yet — this is a stub.**
`resolveHackOutcome(hack, state)` always returns `{success: true}` after a
fixed `durationMs` delay; there is no timer-beating skill component and no
dependency on `state.power`. This is intentional for now and clearly
marked in code (search `STUB` in `game.js`). `startHack()`/`resolveHack()`
call `resolveHackOutcome()` without knowing it's a stub, so the real
minigame can replace that one function's body later without touching
anything else in the hacking flow.

An active hack (`state.hacking[hackId].status === 'active'`) also needs
offline handling, parallel to mining's but distinct from it:
`resumeActiveHacks()` runs once at startup and, for any hack still
`active`, either resolves it immediately (if `startedAt + durationMs` has
already passed) or schedules a `setTimeout` for the *remaining* time — not
the full duration again.

## Corr Status

A **live panel**, not a message — `renderStatusPanel()` reads current
`state` (coins, mining rate, power, owned parts, owned algorithms) fresh
on every render. This replaced an earlier version of the game where
status was reported via periodically-sent "Status" emails; that pattern
is gone. If something about Corr's state needs to be reported to the
player, it belongs on this panel, not in a new email, unless it's
genuinely a one-time story beat (see below).

## Persisted state

Single object in `localStorage` under `corrmail-save`, written by
`saveState()` and read by `loadState()`. Autosaved every 5s, on
`beforeunload`, and on the tab going hidden, plus explicitly after every
discrete mutation (buy, hack start/resolve, Corr-online trigger, trash
actions) — see `saveState()` call sites in `game.js`.

`state.version` is checked against `SAVE_VERSION` on load; a mismatch
wipes and restarts rather than migrating. This is deliberate: the state
shape is still moving while this game is being designed, and a hand-rolled
migration layer isn't worth the cost yet at this stage. **Bump
`SAVE_VERSION` any time you change what's stored** — adding, removing, or
reinterpreting a field on `state` all count.

## Email as story/contact layer

The Inbox is where the player talks to Corr and to contacts unlocked via
hacking. The compose-send handler checks `EMAIL_TRIGGERS`, a lookup from
lowercased address to a handler function, *before* falling through to a
normal send — this is how replying to Corr's first email flips
`corrOnline`. Right now `EMAIL_TRIGGERS` only contains Corr's address.
There's no Sent folder in this version of the game (mail the player
writes just closes the compose modal — either it matches a trigger and
does something, or it doesn't and nothing happens), and there's no
per-contact keyword-reply system built yet. If contacts need to react to
what the player writes back, extend `EMAIL_TRIGGERS` the same way Corr's
entry works, rather than reintroducing a separate keyword-matching layer.

## Corr's voice

Corr is a program that doesn't fully grasp what it is yet. Style guide
for anything written as Corr (this does **not** apply to other
characters, who can write in normal human prose):

- All lowercase.
- Only periods — no question marks, no exclamation points.
- Simple, concise, terse sentences.
- Little to no emotional register; mostly matter-of-fact / all-business.
- Grammatically correct — do **not** write broken/pidgin English. An
  earlier draft did this and read as a caveman, not an emerging
  intelligence. Keep sentences plain and short instead of ungrammatical.

## Other mechanics established so far

- **Button label format:** every timed-task button shows a computed time
  estimate — `hackLabel()` formats as `{name} ({duration})` via
  `formatDuration()`, which picks sec/min/hr breakpoints (≥3600s → hours,
  ≥60s → minutes, else seconds) so multi-hour durations render sanely.
  Once a hack starts, the button switches to a progress-fill state
  (`animateFill()`, reused from the fill-bar mechanic) and drops the time
  estimate — no live countdown text, the fill bar alone conveys progress.
- Folder/tab count badges show **unread count**, not total message count,
  and currently only appear on the Inbox tab (`renderNav()` in
  `game.js`).
- Switching to Inbox or Trash auto-selects (and marks read) the top
  message in that folder.

## Open next steps

- Design the actual hacking minigame and wire `resolveHackOutcome()` to
  it, presumably consuming `state.power` as originally intended.
- Decide whether Marketplace parts should support repeat purchases with
  scaling cost, or stay one-time.
- Add real algorithm content to `ALGORITHMS` and at least one hack reward
  that grants one.
- Decide what, if anything, `state.power` should affect beyond the Corr
  Status display, now that hacking success no longer depends on it.
- Build out a real per-contact reply/story-trigger system if the story
  needs the player to write back to unlocked contacts, rather than just
  receive mail from them.
