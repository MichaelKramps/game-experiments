# CorrMail — Design Notes

This file documents **mechanics and design decisions only** — the rules
and patterns that should stay consistent as more content gets added.
Actual implemented narrative content (email bodies, character voices in
practice, specific addresses, specific numbers) lives in `game.js` and
isn't duplicated here — read the code for "what does it currently say,"
read this file for "how does the system work / why was it built this
way." For the story arc, cast, and plot facts, see `STORY.md` — that
file is planning-only (mostly unimplemented) as of this writing.

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

**Status: hardware tier progression below is planning only, not
implemented.** Today's code still matches the original description: `PARTS`
in `game.js` is a static catalog of one-time purchases (`{ id, name, cost,
effect: {miningRate, power} }`), `buyPart()` refuses a repeat buy, and only
four of the seven hardware categories (`HARDWARE_LABELS` in `game.js`) have
any catalog content at all. The tiered-upgrade design below is what that
gets replaced with; see "Implementation" at the end of this section for what
specifically needs to change in code. Only `ownedPartIds` (a list of ids)
is persisted; the catalog itself is derived at render/recalc time by
looking ids up in `PARTS`. Algorithms (`ALGORITHMS`, currently empty)
follow the identical persisted-ids pattern and are meant for hacking
rewards specifically — nothing is purchasable with CorrCoin as an
algorithm today.

### Hardware tier progression

Each of the seven hardware categories has its own numbered tier ladder.
Buying a tier **replaces** whatever tier is currently owned in that
category (matches `DEFAULT_HARDWARE`'s one-slot-per-category shape) — this
is a genuine upgrade path, not a one-time purchase. Buying tier 3 after
already owning tier 2 in the same category is a normal, expected repeat
purchase.

Each tier's multiplier is `growth^(tier - 1)`, where `growth` is a
per-category constant — **not** a uniform curve. Tier 1 is always
`growth^0` = **1x for every category**, i.e. power-neutral: it's a
flavor/name change (and, for a not-yet-installed category, the moment
Corr actually gets that piece of hardware at all) but contributes nothing
to CorrPower yet. The multiplier ramp starts at tier 2. This was a
deliberate call: rather than every purchase being a guaranteed CorrPower
bump, the first tier in a category is cheap and mostly narrative — real
power gains start once you're investing further into a category.

| Category | Growth/tier | Tiers | Multiplier sequence (tier 1→max) | Max |
|---|---|---|---|---|
| CPU | ×5 | 10 | 1, 5, 25, 125, 625, 3125, 15625, 78125, 390625, 1953125 | 1,953,125x |
| RAM | ×3 | 10 | 1, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683 | 19,683x |
| Motherboard | ×2 | 10 | 1, 2, 4, 8, 16, 32, 64, 128, 256, 512 | 512x |
| GPU | ×4 | 10 | 1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144 | 262,144x |
| Power Supply | ×2 | 10 | 1, 2, 4, 8, 16, 32, 64, 128, 256, 512 | 512x |
| Storage | ×2 | 10 | 1, 2, 4, 8, 16, 32, 64, 128, 256, 512 | 512x |
| Network Card | ×2 | 3 | 1, 2, 4 | 4x |

Every purchasable category now shares the same 10-tier ceiling — Power
Supply and Storage originally capped at 5 tiers (16x) but were brought up
to match the rest, specifically so the shared cost-growth factor (see
Pricing below) could stay a single constant across every tier instead of
needing a rate change past tier 5. Network Card remains the only
shorter-ladder exception, since it isn't a normal Marketplace category at
all (see below). CPU (×5) and GPU (×4) are the steepest curves on
purpose — they're the categories meant to define an endgame
CorrCoin/CorrPower run. RAM (×3) is a notch behind. Everything else
compounds ×2/tier. Combined ceiling CorrPower, every category maxed, is
`1,953,125 × 19,683 × 512 × 262,144 × 512 × 512` ≈ **1.35 × 10²⁴x** (~1.35
septillion) — an intentionally absurd idle-game endpoint, consistent with
`HACKING_DESIGN.md`'s framing of the scale running "wide," though now far
past its old placeholder figure of "200,000x and beyond" (that line
should be read as superseded by this table).

**Tier 1, for every category, is pre-owned and never for sale.** This
generalizes what was originally a GPU-only exception: for all six
Marketplace categories (everything except Network Card, below), tier 1 is
just `DEFAULT_HARDWARE`'s existing entry for that category, formally
brought into the tier-number system. The Marketplace only ever sells tier
2 and up — every purchasable category has 9 purchasable items (10 tiers
minus the pre-owned tier 1). This is why the CPU/RAM/Motherboard tier
lists below don't reuse all ten names drafted in an earlier pass: with
tier 1 claimed by the already-coded default name, one item had to be
dropped from each of *those* categories' previous drafts to keep the tier
count at 10. Each drop favored keeping (a) the already-coded `PARTS`
entry as tier 2, the first purchasable item, and (b) the sci-fi/anomalous
top-tier item as the category's ceiling — the cut always came from a
mid-ladder item that was redundant with a neighbor. Power Supply and
Storage didn't need a drop — they were originally drafted as 5-tier
categories and simply gained 5 new tiers (6-10) when brought up to the
shared 10-tier ceiling, described below.

**CPU** (10 tiers, 9 purchasable) — 1. Intel 486DX2 66MHz *(pre-owned)* 2.
Intel Pentium 100MHz *(existing `PARTS` entry — first purchasable tier,
5x)* 3. Pentium II 300MHz 4. Pentium III 600MHz 5. AMD Athlon 1.2GHz 6.
Pentium 4 2.4GHz 7. Core 2 Duo E6600 8. Core i7-2600K 9. Ryzen 9 5950X 10.
Prototype Neuromorphic Processor — *dropped: Custom 64-Core Server Array
(redundant with tier 10's server/exotic flavor)*

**RAM** (10 tiers, 9 purchasable) — 1. 8MB *(pre-owned)* 2. 32MB *(existing
`PARTS` entry)* 3. 128MB 4. 512MB 5. 2GB 6. 8GB 7. 16GB 8. 32GB ECC 9. 1TB
Distributed Memory Cluster 10. Experimental Photonic Memory — *dropped:
128GB Server Array (redundant with tier 9's distributed/server flavor)*

**Motherboard** (10 tiers, 9 purchasable) — 1. AT Motherboard (1993)
*(pre-owned)* 2. ATX Motherboard (1997) 3. Socket 370 (1999) 4. Socket 478
(2002) 5. LGA775 (2005) 6. LGA1156 (2009) 7. AM4 (2017) 8. LGA1700 (2021)
9. Custom Server Backplane 10. Fabricated Prototype Board — No
Manufacturer Listed — *dropped: LGA1155 (2012), too close to tier 6's
LGA1156 (2009)*

**GPU** (10 tiers, 9 purchasable) — 1. S3 Trio64 *(pre-owned — Corr starts
with a GPU already installed, unlike Network Card below)* 2. Voodoo2 3.
GeForce 256 4. GeForce FX 5900 5. GeForce 8800 GTX 6. GeForce GTX 580 7.
GTX 1080 Ti 8. RTX 3090 9. Distributed Mining Rig (12x cards) 10. Custom
ASIC Cluster — unchanged from the earlier draft, since GPU's pre-owned
tier 1 was already decided last round.

**Power Supply** (10 tiers, 9 purchasable) — 1. 200W AT *(pre-owned)* 2.
300W ATX *(existing `PARTS` entry)* 3. 550W ATX 4. 850W Modular 5. 1200W
Server 6. 1600W Titanium 7. Dual 2000W Redundant 8. Liquid-Cooled 3000W
9. Experimental Zero-Point Power Tap 10. Fusion-Cell Power Cell — realistic
PSU history (ATX → server → redundant/enterprise → liquid-cooled) through
tier 8, then two increasingly exotic/sci-fi capstones at 9-10.

**Storage** (10 tiers, 9 purchasable) — 1. 340MB IDE *(pre-owned)* 2. 2GB
IDE *(existing `PARTS` entry)* 3. 40GB IDE 4. 500GB SATA 5. 2TB SSD Array
6. 8TB NVMe Array 7. 100TB Distributed Storage Cluster 8. 1PB Holographic
Storage 9. Quantum Dot Storage Matrix 10. Exabyte Crystal Storage Lattice —
IDE → SATA → SSD → NVMe → distributed cluster through tier 7, then
holographic/quantum/crystal capstones at 8-10.

Top-tier names lean sci-fi/anomalous on purpose — CorrPower's endgame is
tied to "full power" in `STORY.md`.

### Network Card — not a Marketplace item

Network Card is excluded from the cost-per-x system entirely: it's never
purchased with CorrCoin. Getting the first network card (tier 1, 56k
Dial-Up Modem) is what sets `hackingUnlocked` — the gate `NAV_TABS`
already declares in `game.js` but leaves "not wired to anything yet" per
its own comment. Since Hacking is locked until that happens, tier 1 can't
be a hack reward (nothing to reward from yet); it has to arrive some other
way — most likely a story email or a `TERMINAL_COMMANDS` entry, matching
the existing `mine init`/`marketplace init` pattern. Tiers 2–3 (Cable
Modem/DSL Router, Fiber Uplink) are open — **not yet decided** whether
they come from hack rewards (`reward.type === 'part'`, which already
exists as a delivery path) once Hacking is unlocked, or from another
story beat.

### Pricing

A per-category `costPerX` alone (cost scaling only with that category's
own multiplier) doesn't work: each category's multiplier only grows by
its own `growth` factor per tier (CPU ×5, GPU ×4, RAM ×3, everything else
×2), but buying tier 2 across all six categories at once multiplies
CorrPower by their **product** — `5 × 4 × 3 × 2 × 2 × 2` = **480x**. Since
every category's per-tier growth is a fixed ratio, that round-over-round
CorrPower jump is the same 480x for *every* round, not just the first
(total CorrPower after finishing round `t` is `480^(t-1)`). If prices only
grew at each category's own rate, the player would be earning far faster
than prices rise, and every successive round would take *less* time to
afford, not more — the opposite of the intended pacing.

The fix is a second, shared growth factor layered on top of a per-category
tier-2 base price, applied uniformly to **every** tier transition in
every category, tier 2 through tier 10:

```
cost(tier) = tier2Price × 800 ^ (tier - 2)
```

800 was chosen because it's above the 480x breakeven point — high enough
that each round is still a bigger grind than the last, not just barely
keeping pace with the income boost. This is a single flat rate all the
way to tier 10 now — an earlier pass tried switching to a lower growth
factor at tier 6 (because Power Supply/Storage originally capped at tier
5, changing the round-over-round CorrPower math past that point), but
bringing those two categories up to the same 10-tier ceiling as everyone
else (see the tier-progression table above) removed the need for a
second rate entirely.

Tier-2 base prices (chosen relative to each other, not yet playtested —
halved once already from an initial pass):

| Category | Tier 2 price |
|---|---|
| GPU | 125 |
| CPU | 75 |
| RAM | 50 |
| Motherboard | 40 |
| Storage | 30 |
| Power Supply | 10 |

Full cost table, every category now going to tier 10:

| Category | Tier 2 | Tier 3 | Tier 4 | Tier 5 | Tier 6 | Tier 7 | Tier 8 | Tier 9 | Tier 10 |
|---|---|---|---|---|---|---|---|---|---|
| CPU | 75 | 60K | 48M | 38.4B | 30.72T | 24.58 quadrillion | 19.66 quintillion | 15.73 sextillion | 12.58 septillion |
| GPU | 125 | 100K | 80M | 64B | 51.2T | 40.96 quadrillion | 32.77 quintillion | 26.21 sextillion | 20.97 septillion |
| RAM | 50 | 40K | 32M | 25.6B | 20.48T | 16.38 quadrillion | 13.11 quintillion | 10.49 sextillion | 8.39 septillion |
| Motherboard | 40 | 32K | 25.6M | 20.48B | 16.38T | 13.11 quadrillion | 10.49 quintillion | 8.39 sextillion | 6.71 septillion |
| Storage | 30 | 24K | 19.2M | 15.36B | 12.29T | 9.83 quadrillion | 7.86 quintillion | 6.29 sextillion | 5.03 septillion |
| Power Supply | 10 | 8K | 6.4M | 5.12B | 4.10T | 3.28 quadrillion | 2.62 quintillion | 2.10 sextillion | 1.68 septillion |

Note this makes each category's CorrCoin-per-multiplier-point *worse* at
higher tiers (price grows ×800/tier throughout, multiplier only grows
×2–5/tier) — that's intentional and required for the pacing goal above,
not a byproduct to fix later.

**Not yet decided:** whether hack rewards should ever grant a *Marketplace*
hardware tier directly (as opposed to CorrCoin/algorithms) now that
Network Card covers the "hardware as hack reward" case on its own.

### Implementation (not done yet)

Moving from today's code to this design touches more than just `PARTS`
data:

- `PARTS` entries need a `tier` field (starting at **2** — tier 1 never
  appears in `PARTS`, it's pre-owned); multiplier is derived as `growth **
  (tier - 1)` from a per-category `growth` constant (5/4/3/2 — see table
  above), not stored directly, so the curve stays correct if tier counts
  ever change. Cost is derived the same way: `tier2Price * 800 **
  (tier - 2)`, one flat rate for every tier — not stored as a flat number
  per entry, so the one constant (800) stays the only place that curve
  gets tuned. Replaces `effect: {miningRate, power}` entirely.
- CorrCoin/cost values reach into the septillions (10²⁴) by tier 10 —
  `game.js` has no compact-number formatting today (coin balance/prices
  are just rendered as plain numbers). A `formatCoins()`-style helper
  (short-scale suffixes or scientific notation) becomes necessary once
  this ships, the same way `formatDuration()` already exists for time.
- `buyPart()` needs to allow repurchasing within a category (currently
  refuses any id already in `ownedPartIds`) and needs tier-ordering rules
  (e.g. can't buy tier 3 before tier 2).
- `recalcStats()` needs to compute CorrPower as the **product** of each
  category's current multiplier (tier-1/default categories count as 1x),
  not a sum of `effect.miningRate`/`power` — this folds the separate
  `power` stat into CorrPower entirely, per `HACKING_DESIGN.md`.
- **Every category's `DEFAULT_HARDWARE` value is now formally tier 1**,
  not a separate concept. CPU/RAM/Motherboard/Power Supply/Storage already
  have real tier-1 names coded (486DX2, 8MB, AT Motherboard, 200W AT,
  340MB) — no change needed there. `DEFAULT_HARDWARE.gpu` is the one that
  needs to change, from `'none'` to `'S3 Trio64'`, since GPU now starts
  pre-owned like the rest. `DEFAULT_HARDWARE.network` stays `'none'` — the
  one category where tier 1 doesn't exist yet at game start and isn't
  purchasable at all (see "Network Card — not a Marketplace item" above).
- `PARTS` should only ever contain tier ≥2 entries for CPU, RAM,
  Motherboard, GPU, Power Supply, and Storage — **no Network Card entries
  at all**, since it's never bought with CorrCoin. Network Card tiers get
  granted directly (`deliverReward()` for hack rewards, or a
  `TERMINAL_COMMANDS`/email trigger for tier 1) rather than appearing in
  the Marketplace panel.
- `powerSquaresHtml()` (game.js:593) currently shows 1/10 filled if any
  part is owned in a category, 0/10 otherwise — a placeholder noted in its
  own comment. Since multiplier no longer scales linearly with tier (CPU
  tier 2 is 5x, GPU tier 2 is 4x, everything else's tier 2 is 2x-3x), the
  squares should represent **progress through that category's own tier
  ladder** (owned tier ÷ category max tier, scaled to 10 squares), not a
  literal reading of the multiplier itself.

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
anything else in the hacking flow. The planned replacement — CorrPower, a
turn-based action-budget minigame against per-computer defensive
measures — is designed (not implemented) in `HACKING_DESIGN.md`.

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
  it, consuming CorrPower per `HACKING_DESIGN.md`.
- Implement the Marketplace hardware tier progression above: `PARTS`
  restructured into per-category tier ladders, `buyPart()` supporting
  repeat/upgrade purchases, `recalcStats()` computing CorrPower as a
  product. See "Implementation" under Marketplace for the full list.
- Tune actual per-tier costs for the hardware progression (deferred until
  playtesting — see Marketplace section).
- Add real algorithm content to `ALGORITHMS` and at least one hack reward
  that grants one.
- Build out a real per-contact reply/story-trigger system if the story
  needs the player to write back to unlocked contacts, rather than just
  receive mail from them.
