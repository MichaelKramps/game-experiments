# Jo's Discovery

A short, story-driven autobattler deckbuilder in the Evergreen world. The
player is Jo Taylor, a new Evergreen employee, breaking into the company's
restricted records. She writes a **script** (a deck), orders it, and runs it
against Evergreen's security; the script plays out on its own while she watches.

All player agency is in the draft and the ordering. That hands-off feeling is
deliberate: in this world, things happen to people while they aren't in control.

**Where it sits.** A supplement to the main Evergreen game. It covers how Jo
learned Evergreen holds records for her sister, Mabel Taylor (#748210), and
ends with Jo writing the note Jamie later finds in the chest of Mabel's stories.

**Tone.** Quiet, clinical, increasingly personal. Records are cold internal
documents. The horror comes from what they imply and whose names appear, never
from gore or exposition.

Story canon from the main game applies (see Evergreen's notes): surname Taylor,
no glasses, Mabel not tied to Huntington's.

## Glossary (player-facing terms)

| Term | Meaning |
|---|---|
| Operation | One full playthrough: 25 hacks across five programs |
| Program | A secret Evergreen experiment; one chapter |
| Hack | One automated contest between Jo's script and the system |
| Extraction | A regular hack; winning recovers one encoded record |
| Decode | The fifth hack of a program; winning decodes its records |
| Cipher | The opponent in a Decode (e.g. SAPWOOD Cipher) |
| The system | The opponent in any hack |
| Script / Countermeasures | Jo's ordered deck / the system's deck |
| Cycle | One step of play: Jo's opener (1 card) or 2 cards from one side |
| Pass | One run through a deck, first card to last |
| Idle timeout | Penalty for a pass that never lowered the opponent's health |
| Recon | Pre-hack view of which card types the system has |
| Cover / Integrity | Jo's health (persists) / the system's health (per hack) |
| Traced | Cover reaches 0; the operation is lost |
| Compile / Maintenance / Tool | Card draft / upkeep choice / permanent passive |
| Archive | Every recovered record (`/records`) |
| Temporary | Keyword: the card leaves the script for the rest of the hack after it resolves |
| Counter | Keyword (stacks): when hit, deal 1 damage back and lose 1 |
| Firewall | Keyword (stacks): when hit, block the whole hit and lose 1 |

## Operation structure

25 hacks in fixed order: five programs × (four Extractions, then one Decode).
Hack numbers are global (1–25).

| Program | Hacks | Decode | Family name revealed |
|---|---|---|---|
| SAPWOOD | 1–5 | 5 | Jo Taylor |
| GRAFT | 6–10 | 10 | Marcus Odom |
| ROOTSTOCK | 11–15 | 15 | Reese Taylor |
| CANOPY | 16–20 | 20 | Jamie Taylor |
| EVERGREEN | 21–25 | 25 | Mabel Taylor |

**Flow of one hack:** Recon → order the script → run (watch, pause, change
speed, skip) → result → rewards (Compiles, Maintenance, Tool) → next hack.
After hack 25 the ending plays instead of rewards.

**Between hacks:** Cover, max Cover, the script and its order carry over.
Defense, both strengths, Firewall, Counter, the idle timeout cost and removed
Temporary cards all reset at the start of every hack, before Tools apply.

## Hack rules

- **Snake order:** Jo plays 1, system 2, Jo 2, system 2, … until one side's health is ≤ 0.
- **Damage** is base + attack strength, floored at 0. Every damage instance is
  its own hit (Zero-Day is two hits). Overflow is the one exception: it deals
  exactly your defense, with no attack strength.
- **A hit** is checked against **Firewall** first: if the target has any, the
  hit is fully blocked, Firewall drops by 1 and defense is untouched. Otherwise
  defense absorbs and any hit sets defense to 0 regardless of how much it
  absorbed. Defense stacks and persists until hit.
- **0 damage is not a hit:** it doesn't use Firewall, doesn't clear defense,
  doesn't trigger Counter and doesn't count toward the idle timeout.
- **Counter:** after a hit lands on a side with Counter (blocked or not), that
  side loses 1 Counter and deals 1 + its attack strength back. Counter damage
  behaves exactly like Attack damage: it uses Firewall, clears defense, counts
  for the idle timeout and can trigger the other side's Counter. Volleys end
  when a side runs out of Counter, takes 0 damage or hits 0 health.
- **Strengths** (attack, defense) start at 0, stack, and can go negative.
  Defense strength applies to every effect that gives defense; defense gained
  is floored at 0.
- **Temporary:** after the card resolves (and after the idle timeout check if
  it was the last card), it's removed from the script for the rest of the hack.
  A side's final remaining card is never removed.
- **Echo** copies the effect of the most recent card its side played that
  wasn't Echo (this hack, across passes). As the first card it does nothing.
  Copying a Temporary card makes that Echo Temporary. Conditions such as
  Payload's "last card" check Echo's own position.
- **Looping:** after its last card a deck starts over in the same order. Sides loop independently.
- **Idle timeout:** each side tracks whether its cards lowered the opponent's
  health this pass (removing only defense doesn't count). The flag resets when
  the side plays its first card. Right after its last card resolves, if the
  flag is false, that side loses its idle timeout cost (base 2; each Tarpit
  against it doubles it). It ignores and keeps defense; Firewall doesn't block it.
- **End:** the instant either health is ≤ 0, even mid-cycle. Safeguard: 1,000 card plays = loss for Jo.

Worked example (from the original doc; verified in the engine): Jo `Defend,
Attack, Attack, Defend` (Cover 30) vs `Attack, Defend, Defend` (Integrity 5)
ends in cycle 7 with Jo at 28 Cover. *(This used the original Attack 2 / Defend 2;
both are now 3, so the example no longer matches the current cards.)* *Correction:* the original table said
"System defense 4" at cycle 6; under the stacking rule it's 6. Same outcome.

## Cards

22 cards. Jo and the system draw from the same pool. Names are first drafts.

| Card | Rules text |
|---|---|
| Attack | Deal 3 damage. |
| Defend | Gain 3 defense. |
| Boost Attack | +1 to your attacks for the rest of this hack. |
| Boost Defense | +1 to your defense for the rest of this hack. |
| Overflow | Deal damage equal to your defense. Attack strength does not apply. |
| Payload | Deal 1 damage. If this is the last card in your script, deal 1 damage again. |
| Throttle | Lower the opponent's attack strength by 1. |
| Corrupt | Lower the opponent's defense strength by 1. |
| Tarpit | Double the opponent's idle timeout cost. |
| Siphon | Deal 1 damage. If it lowers health, gain 1 defense. |
| Echo | Copy the effect of your previous card that wasn't Echo. |
| Mirror | Double your defense. |
| Lockdown | Gain 20 defense. Temporary. |
| Zero-Day | Deal 1 damage, then deal 5 damage. Temporary. |
| Overclock | Double your attack strength. Temporary. |
| Harden | Double your defense strength. Temporary. |
| Tripwire | Gain 5 Counter. Temporary. |
| Watchdog | Gain 2 Counter. |
| Ping | Deal 1 damage. Gain 1 Counter. |
| Quarantine | Gain 5 Firewall. Temporary. |
| Filter | Gain 2 Firewall. |
| Sandbox | Gain 1 defense. Gain 1 Firewall. |

Starting script: Attack, Attack, Defend, Defend. A script must hold at least
2 non-Temporary cards (Echo counts as non-Temporary); no maximum. Cards are
data with an effect function (`data.js`); keyword reminders (`KEYWORDS`) show
when a card file is opened.

**How the set fits together.** Firewall beats big hits; small hits (Ping,
Siphon, Payload, Zero-Day's opener) strip Firewall; Counter punishes many
small hits; big hits beat Counter. Defense engine: Defend → Mirror → Overflow,
protected by Firewall. Strength engine: Boosts early, then Overclock / Harden.
Temporary cards are big one-offs; Echo after one doubles it, then both leave.

**Card availability.** Each Decode unlocks four cards. They're first offered
in the Compiles right after that Decode, and the system starts drawing them in
the next hack (`CARD_UNLOCK` in `data.js`).

| Unlocks | Pool size | Cards |
|---|---|---|
| From the start | 6 | Attack, Defend, Boost Attack, Boost Defense, Throttle, Corrupt |
| After hack 5 (SAPWOOD) | 10 | Payload, Lockdown, Zero-Day, Siphon |
| After hack 10 (GRAFT) | 14 | Watchdog, Filter, Tarpit, Overflow |
| After hack 15 (ROOTSTOCK) | 18 | Tripwire, Ping, Quarantine, Sandbox |
| After hack 20 (CANOPY) | 22 | Overclock, Harden, Mirror, Echo |

## The system

**Countermeasures:** hack *n* = 1 Attack + 2 Defend + (*n* − 1) cards drawn
uniformly from the pool as of hack *n*, shuffled once per hack (seeded). Hack 1 has 3 cards; hack 25 has 27.

**Integrity (placeholder):**

| Program | E1 | E2 | E3 | E4 | Decode |
|---|---|---|---|---|---|
| SAPWOOD | 5 | 6 | 7 | 9 | 12 |
| GRAFT | 10 | 11 | 12 | 14 | 18 |
| ROOTSTOCK | 15 | 16 | 17 | 19 | 24 |
| CANOPY | 20 | 21 | 22 | 24 | 30 |
| EVERGREEN | 25 | 26 | 27 | 29 | 40 |

**Recon** shows hack name, Integrity and the distinct card types. Never counts or order.

## Rewards

| Reward | When | Choice |
|---|---|---|
| Compile | After every hack 1–24 | 1 of 3 distinct cards from the pool as of the next hack; skippable |
| Second Compile | After even hacks | same |
| Maintenance | After every 3rd hack | Go Dark / New Alias / Refactor; skippable |
| Tool | After Decodes 5, 10, 15, 20 | 1 of up to 3 unowned Tools; skippable |

- **Go Dark:** restore ⌈max Cover / 3⌉. **New Alias:** +5 max Cover, restore 5.
  **Refactor:** remove one script card (only cards whose removal keeps 2 non-Temporary cards). Cover never exceeds max.
- **Tools:** Scrubber (+3 Cover at hack start, after resets), Replay (first card
  each hack resolves twice; still one card for position and timeout), Honeypot
  (when defense blocks a whole hit, defense → 0 then +1; never on timeout, and
  never on a Firewall block, since defense isn't touched),
  Rootkit (start with +1 attack), Air Gap (start with +1 defense), and:
  - **Redundancy:** if Jo's defense is 20+ when a hit lands, she loses only
    as much defense as the hit's damage instead of all of it. Checked before
    each hit. Honeypot doesn't also trigger on that hit.
  - **Skimmer:** when the system pays an idle timeout, Jo restores that much
    Cover (capped at max).
  - **Feedback:** when Jo actually restores Cover during a hack (Scrubber,
    Skimmer; not Maintenance, not at max Cover), she deals 1 damage. It
    behaves like Counter damage: attack strength applies, it uses Firewall
    and can trigger the system's Counter.
  - **Autopatch:** when a hit lowers Jo's Cover, she gains 1 defense
    (defense strength applies). Counter damage counts; the idle timeout doesn't.
  A full operation ends with 4 of 9 (one Tool offer after each of hacks 5,
  10, 15, 20; 3 random unowned Tools each).

## Story and records

Each program names someone closer to Jo and is further from consent than the
last. Jo isn't looking for Mabel; Mabel's appearance should land on her and
the player at the same moment.

- **Encoded records** keep the program name, document ID and six-digit
  patient numbers readable; everything else becomes same-length glyphs.
- After the Decode, all four records are readable, with an unscrambling
  animation the first time each is opened.
- Each record is one document with 3–5 subjects. The family member is always
  in R04. In EVERGREEN, #748210 is visible before the Decode.
- Wellness-exam scores follow Evergreen's rule: OVERALL = average of Focus,
  Stamina and Compliance. *(Jo's drafted panel had Compliance 38 / OVERALL 64,
  which breaks it; it's now Compliance 39 (+15) / OVERALL 68.)*

| Person | Patient # | Program |
|---|---|---|
| Jo Taylor | 619043 | SAPWOOD |
| Marcus Odom | 402277 | GRAFT |
| Reese Taylor | 748208 | ROOTSTOCK |
| Jamie Taylor | 748209 | CANOPY |
| Mabel Taylor | 748210 | EVERGREEN |

Recurring non-family numbers tie programs together (e.g. 617340 is referred
from SAPWOOD to GRAFT; ROOTSTOCK baselines reappear in CANOPY and EVERGREEN).

**What Jo may / must not learn**

| May learn | Must not learn |
|---|---|
| Employees are drugged via coffee and wellness checks | Marcus collected the family's samples or treated Mabel |
| Focus, Stamina and Compliance are manipulated | Mabel was born healthy (never label her healthy/baseline) |
| Civilians, including her parents, were tested unknowingly | Weekly treatment entries for #748210 |
| Evergreen runs a longevity program | The scale of the civilian trials |
| Mabel's blood was used, "atypical genetic structure" | The CEO, the childlike side effect, or whether it worked in humans |
| An employee record can read "resolved" | Cremation facilities or explicit killings |

**Jo's lines** (notepad, after each Decode): see `PROGRAMS[].line` in
`data.js`. EVERGREEN has none; it cuts to the ending.

## Ending

1. Terminal reports the EVERGREEN Cipher broken; the decoded R04 opens and
   holds on `Source 748210: Mabel Taylor`.
2. Notepad: Jo types *Evergreen has patient records for Mabel Taylor, Patient ID #748210*.
3. Terminal: `print: 1 page sent.`
4. Every window closes.
5. Notepad opens once more: *She folded the page and put it at the bottom of the chest, under Mabel's stories.*
6. Fade to the title card.

**Traced:** `Connection lost. Session terminated.`, then `reconnect` starts a new operation at hack 1.

## The build

It must look like work: three plain programs on a work computer, no card art,
no health bars.

- **Terminal:** recon prints on arrival; the next command is pre-filled and
  Enter runs it. Each line plays at ~1.5 s at 1×. During a hack: space pauses,
  `f` cycles speed (1/2/4/8×), Enter/Esc skips to the end.
  Jo's lines are white and the system's are pink. Health changes draw a text
  bar colored by whose bar it is. A card with several effects prints one line
  per effect, indented under the card; Counter responses print as indented
  `↳ counter` lines in the color of the side countering. Echo prints as
  `Echo→<card>`; Temporary cards are tagged `(temporary)`.
- **Status panel** (pinned under the log): Jo's Cover bar, defense and status
  on the left, the system's on the right. Status lists only what's active:
  Firewall, Counter, attack/defense strength and a raised idle timeout cost. It updates with
  every line and briefly flashes a value when it changes. Before a hack it
  previews Jo's Cover against the target's full Integrity.
- **Files:** `/script` (one file per card, `01_attack`; drag or ▲▼ to
  reorder), `/incoming` (offers one at a time; keep/run/install one, or press
  skip at the top), `/tools`, `/records/<PROGRAM>/R0n.rec`.
- **Folder notes:** every folder and open file shows a one-line note at the
  top saying what it's for and what to do there (it changes with state: an
  offer in `/incoming`, the script running, a refactor, encoded vs decoded).
- **Notepad:** the opening, Jo's lines and the ending, saved as dated notes.

### Files

- `data.js` — cards, Tools, Maintenance, Integrity table, Jo's lines, story text, tunables
- `records.js` — the 20 Archive documents
- `engine.js` — pure rules: seeded RNG, countermeasures, offers, `simulateHack()`
- `desktop.js` — the three windows (drag, resize, focus, layout saved)
- `game.js` — terminal, file system, notepad, flow, ending, save/load
- `debug.js` — debug panel and batch simulator

### Persistence

`localStorage['jos-discovery-save']` holds the operation (seed, hack, Cover,
script, Tools, phase, offer progress), the Archive, notes and terminal log.
A hack's inputs are saved before it plays, so reloading mid-hack replays the
same result instead of rerolling. Window layout and playback speed are saved
separately (`jos-discovery-windows`, `jos-discovery-settings`).

### Debug

Press `` ` `` (or open with `?debug`): jump to hack, set Cover, grant Tool,
decode all, reset windows/save, and a batch simulator reporting win rate and
average Cover by hack. Its heuristic drafts from a fixed preference list and
orders setup cards first (boosts, strength, debuffs, Counter/Firewall), then
alternates defense and offense, puts Echo after its best card and Payload
last. With the 4-card pool it completed ~48% of operations. With the 22-card
pool and the unlock schedule it completes ~7.5%, with the cliff in GRAFT
Extraction 4 through ROOTSTOCK. The system's Lockdown (20 defense) followed
by Overflow deals 20+ in one hit; Zero-Day deals 26% of all damage Jo takes
and the idle timeout 19%. The heuristic is crude (it front-loads every Boost,
never Refactors and never drafts Firewall in response), so treat these as
relative numbers.

## Open questions

| Question | Current default |
|---|---|
| Card names: plain or themed? | Plain |
| Does the Archive survive being Traced? | Yes (`ARCHIVE_PERSISTS_ON_TRACE` in `data.js`) |
| Can Maintenance and Tool offers be skipped? | Yes (`SKIPPABLE`) |
| Integrity values | Placeholder table |
| 27 countermeasures by hack 25: too long? | Keep; check pacing |
| Should Decodes play differently? | Same rules for now |
| Non-family record text | First draft written in `records.js`; needs a pass |
| Jo's journal lines | Drafts |
| Only 4 of 9 Tools per operation | Accepted; offers are random |
| Cards that remove other cards | After the first build |
| System Lockdown + Overflow one-shots (20+ damage) | Unresolved; see Debug |
| Card names | First drafts (see Cards) |
| Onboarding: how does a new player learn the rules? | Nothing beyond on-screen hints yet; to be designed |
