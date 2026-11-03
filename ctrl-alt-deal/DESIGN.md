# Ctrl+Alt+Deal — game definition

Oct 26, 2026 · @Michael

## Overview

Ctrl+Alt+Deal is a solo deckbuilder built on five-card draw (video poker). Each hand you draw once and get paid a fixed amount by the paytable for the poker hand you make; there are no bets. Between hands you can spend that money to remove, duplicate or change cards, so strong hands come up more reliably, or to raise a hand's payout. Each level is a race: by the end of its 5th hand, that level's hands must have earned the boss's threshold. The bankroll carries into the next level, but earnings start again at $0, so money saved up can't carry you past a boss. The thresholds climb steeply, so you have to keep improving both to stay ahead.

- You win by beating the boss of level 8.
- You lose when a level's earnings are short of its boss's threshold after the boss hand.

(Changed 2026-11-02 from bets that grew 4x per level and boss hands that had to pay a target multiple; see Bankroll. Later the same day prizes were removed; boss credits, chained thresholds and bosses taking money were tried and removed again on 2026-11-03.)

## Glossary

| Term | Meaning |
|---|---|
| Run | One full game, from $40 to a win or a loss |
| Bankroll | The money you have right now |
| Level | A stage of the run. There are 8, and each has 5 hands |
| Hand | One deal, draw and payout |
| Earned this level | What this level's hands have paid so far (`run.earned`). Spending doesn't lower it and Interest doesn't add to it; it goes back to $0 when a new level starts |
| Boss hand | The 5th hand of each level. After it, earned this level must reach the level's threshold to move on (called "gate hand" in the code) |
| Threshold | What earned this level must reach after a level's boss hand |
| Payout | What a poker hand pays, in dollars. The engine keeps it as a multiple (Pair 1x) and pays $10 per 1x |
| Paytable | What each poker hand pays |
| Deck | Your cards. It starts as a standard 52-card deck and changes in the shop |
| Remove | Shop action that takes a card out of your deck permanently |
| Duplicate | Shop action that adds an identical copy of a card to your deck |

## Run structure

1. Start the run with a bankroll of $0 and a standard 52-card deck.
2. Each level has 5 hands, all played and paid the same way.
3. Hand 5 is the boss hand. As soon as it comes up (right after hand 4 is paid), on Normal and Hard the boss puts as many random cards into your deck as its level (see Bosses). After hand 5 is paid, earned this level is checked against the level's threshold.
   - **At or above the threshold:** you beat the boss, and the next level starts with the bankroll as it is and earned back at $0.
   - **Below it:** the run is lost.
4. Beating level 8's boss wins the run.
5. The shop is open between every hand, and spends from the bankroll. Spending doesn't count against the boss, which only looks at what the level earned.

## A hand, step by step

1. **Shop** (optional). Remove, duplicate or change the suit of cards, or increase a hand's payout.
2. **Shuffle.** Shuffle your entire deck. The deck is always reshuffled before every hand.
3. **Deal.** Deal 5 cards from the top of the deck. Dealing costs nothing.
4. **Hold.** Choose which cards to keep. You can discard at most (deck size − 5) cards, so the deck always has enough cards to refill your hand. With a 5-card deck you can't discard anything.
5. **Draw.** Replace each discarded card with the next card from the deck. There is only one draw per hand.
6. **Score.** Find every hand the final 5 cards make and add up their payouts (see Paytable). Anything below a pair pays $0.
7. **Pay out.** Add the payout to the bankroll. Nothing is ever taken away by a hand.

Cards used in a hand go back into the deck, so the next hand starts with the full deck again.

## Hand rankings

Duplicated cards mean a hand can hold identical cards, so some hands are possible here that aren't with a normal deck. A hand pays for every category it qualifies for (see Paytable); the highest-ranked one names it. The ranking order never changes between levels.

| Rank | Hand | Definition |
|---|---|---|
| 1 (best) | Five of a kind | 5 cards of the same rank |
| 2 | Straight flush | 5 consecutive ranks, all one suit |
| 3 | Four of a kind | 4 cards of the same rank |
| 4 | Full house | 3 of one rank and 2 of another |
| 5 | Flush | 5 cards of the same suit |
| 6 | Straight | 5 consecutive ranks |
| 7 | Three of a kind | 3 cards of the same rank |
| 8 | Two pair | 2 of one rank and 2 of another |
| 9 | Pair | 2 cards of the same rank. Any pair counts; there's no "jacks or better" rule |
| — | Nothing | Anything else. Always -1x |

- **Straights:** aces count high or low, so A-2-3-4-5 and 10-J-Q-K-A both count. Straights don't wrap around, so Q-K-A-2-3 isn't one.
- **Overlaps:** a hand that qualifies for several categories is paid for all of them, each once. A full house is also three of a kind, two pair and a pair; a full house in one suit is a flush as well. Four of a kind is also three of a kind and a pair (not two pair). Two pair pays Pair once, not twice. (Changed 2026-10-28; before, only the highest category paid.)

## Paytable

A hand pays every category it matches, added together. Each hand pays its base multiple × $10 (Pair $10, Flush $120), and each **Increase Hand Payout** adds the hand's base payout again, so Pair goes $10 → $20 → $30 and Four of a kind $350 → $700 → $1,050. Because Pair is part of every rank hand, upgrading Pair also raises Two pair, Three of a kind, Full house and so on. Nothing always pays $0 and can't be increased. (Changed 2026-10-27; earlier versions lowered payouts at every boss, then each upgrade added the hand's base again. Changed 2026-11-02 from multiples of a bet to dollars; Nothing used to lose the bet. Changed 2026-11-03 from doubling to adding the base.)

The bases (changed 2026-10-28) are set so each hand's **total** roughly follows how rarely a standard deck makes it, compressed for the rare hands so they don't run into the thousands. Odds are from a 400,000-hand simulation with a sensible hold strategy (keep pairs and better, else 4 to a flush, else 4 to an open straight, else redraw all).

| Hand | Own payout | Also pays | Total | Chance (standard deck) |
|---|---|---|---|---|
| Five of a kind | $1,100 | Four of a kind, Three of a kind, Pair | $1,500 | — |
| Straight flush | $780 | Flush, Straight | $1,000 | 0.01% |
| Four of a kind | $350 | Three of a kind, Pair | $400 | 0.24% |
| Full house | $80 | Three of a kind, Two pair, Pair | $150 | 1.2% |
| Flush | $120 | — | $120 | 1.1% |
| Straight | $100 | — | $100 | 1.1% |
| Three of a kind | $40 | Pair | $50 | 7.4% |
| Two pair | $20 | Pair | $30 | 13% |
| Pair | $10 | — | $10 | 50% |
| Nothing | $0 | — | $0 | 27% |

Totals in the table assume a hand in more than one suit; a one-suit full house, four of a kind or five of a kind adds Flush too. There's no separate Flush Five hand: five of one card pays Five of a kind plus Flush (removed 2026-10-29 as redundant). An unchanged standard deck averages about $18 a hand, about $88 over a level's 5 hands.

## Bosses

After the boss hand (the level's 5th), the level's 5 hands must have paid at least the threshold between them. Any build can get there, as long as it earns enough within the level. (Changed 2026-11-03 from checking the bankroll: a strong early run could bank far more than later thresholds, e.g. $20,000 by level 3, and coast to the end. Changed 2026-11-02; before, the boss hand alone had to pay a target multiple, 2x to 5,000x, and before 2026-10-27 it had to beat a named poker hand.)

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Threshold (Easy, Normal) | $20 | $100 | $200 | $750 | $2,000 | $4,000 | $8,000 | $16,000 |
| Threshold (Hard) | $20 | $100 | $250 | $1,000 | $3,000 | $8,000 | $15,000 | $25,000 |
| Cards added (Normal, Hard) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |

**Boss cards** (added 2026-10-28). When a level's boss hand comes up, right after hand 4 is paid, the boss adds as many cards to your deck as its level: 1 on level 1, up to 8 on level 8, 36 over a full run. Each card's rank and suit are picked at random, independently, so a card can match one you already own; it's then a copy (named like a Duplicate). They're permanent deck cards like any other. Because they arrive before the shop opens for the boss hand, you can see them and pay to delete or change them before dealing. The hand 4 result and the boss note in the Account window list them ("The boss put 3 random cards in your deck: 7H, KS, 2C."). Easy bosses add no cards.

**Locked cards** (2026-10-30 to 2026-11-03, removed). Boss cards used to be locked by chance (none on Easy, 50% on Normal, all on Hard): a locked card couldn't be deleted, duplicated or changed. They were added because, under the old bet economy, money stopped mattering by level 3–4 and every boss card could simply be deleted. Simulations under the 2026-11-03 rules showed difficulty made no difference to win rates (about 39% on all three), so locks were dropped and difficulty now changes boss cards and thresholds instead. Simulated win rates with locks, under the old bet economy (bots, 200 runs each):

| Deck | Easy | Normal | Hard |
|---|---|---|---|
| Standard (flush) | 47% | 28% | 14% |
| Numbers (flush) | 84% | 57% | 16% |
| Half (flush) | 62% | 41% | 23% |
| Face (four of a kind) | 100% | 88% | 38% |
| Straight (flush) | 55% | 39% | 33% |
| Flush Five | 100% | 84% | 42% |

**Thresholds** (set 2026-11-03 for earned-this-level, not yet simulated: Easy and Normal $20, $100, $200, $750, $2,000, $4,000, $8,000, $16,000; Hard takes the old Easy/Normal list, $20, $100, $250, $1,000, $3,000, $8,000, $15,000, $25,000. Everything below checked the bankroll. Earlier, set 2026-11-03: $20, $100, $250, $1,000, $3,000, $8,000, $15,000, $25,000 for Easy and Normal). Hard: $25, $125, $300, $1,500, $6,000, $15,000, $25,000, $50,000. Simulated without locks (standard deck, best of 4 bots, 10,000 runs each): Easy 63% win, Normal 39%, Hard about 3%, with Hard's level 8 ending 28% of runs (median bankroll there about $38,000). With locked cards still in, the standard deck's best bot won about 39% on every difficulty with these (10,000 runs per bot), with 4–7% of runs ending at most levels, 11% at level 2 and 13–14% at level 8. Before that (2026-11-02) they were $40, $100, $250, $600, $1,500, $4,000, $10,000, $25,000, with level 1 lowered to $20 when the start went to $0. Simulated 2026-11-03 with those (standard deck, best of 4 bots, 1,000 runs): about 23–27% win on every difficulty; runs end 6–8% at level 1, 10–12% at level 2, 3–7% at each of levels 3–7 and about 34% at level 8, whose $25,000 is close to the median bankroll there (about $23,000). Earlier note: level 1 at $40 had to be earned from nothing; an unchanged standard deck reaches $40 in 5 hands about 85% of the time even from $0. After that they grow about 2.5x a level, a bit more than one doubling per level, since income now grows only through payout increases and deck shaping. Level 8's $25,000 is about $5,000 a hand: a flush build gets there with 6 Flush increases ($120 × 64 = $7,680) if it makes a flush about two-thirds of the time.

Simulated (bots, 1,000 runs per deck, before any tuning, with the bankroll reset to $0 each level and prizes, so these predate the current rules), Normal averaged over all 9 deck/strategy combinations: 4% of runs end at level 1, 9% at level 2, 7% at level 3, 3–4% at each of levels 4–6, 9% at level 7, 14% at level 8, and 46% win. Under the old bet economy it was 13% at level 1 and 9% at level 8 with 50% wins, so losses moved late. Known issues from the same run: Face (four of a kind) and Flush Five win 93–100% even on Hard; difficulty matters little (Easy 50%, Hard 40%) because duplicating outnumbers locked cards; level 3 ($250) is a wall for big decks (Standard loses 19% there); the Straight deck loses 46% at level 2 because it can't make pairs. Raising level 1 to $80 brought back early losses (18% at level 1).

## Bankroll

(Added 2026-11-02, replacing bets.)

**Bankroll.** You start the run with $0, so the first hand has to earn something before you can shop. Every hand adds its payout, and the shop spends from it. There's no bet and no way to go broke: a hand that makes nothing pays $0, and spending your last dollar just leaves you at $0. Paytable totals that would cover what the level still needs to earn for its boss, on their own, are green.

**Earned this level.** Each hand's payout also adds to `run.earned`, which the boss checks. Spending doesn't lower it and Interest doesn't add to it. It starts at $0 on each new level and shows under Bankroll in the Account window.

**After the boss.** If earned this level reached the threshold, the next level starts with the whole bankroll and earned at $0; nothing is taken and nothing is awarded.

(History, all 2026-11-02 to 11-03: the bankroll first reset to $0 each level, and the money left over above the threshold picked a prize, one of the 3 dearest payout increases or free Delete / Duplicate / Change suit it could buy. Then boss credits replaced buying payout increases and prizes: boss N gave N credits that had to be spent, each doubling a hand's payout and the next threshold, which chained from $40 ($80, $320, $2,560, …), and the boss took its threshold out of the bankroll. All of that was removed; Increase Hand Payout is back in the shop.)

(Before 2026-11-02: each hand bet $10, $12, $14, $16, $20 on level 1, ×4 per level, paid bet × multiple, and the run ended at $0. Earlier still, you picked a bet between a minimum and maximum.)

## Shop

Open between every hand, with as many purchases per visit as you can afford.

- **Remove:** take any one card out of your deck permanently. Not available at 5 cards, the minimum deck size.
- **Duplicate:** add an exact copy (same rank and suit) of any card in your deck. Copies of copies are allowed. No maximum deck size.
- **Change suit:** change any one card to a suit of your choice; its rank stays. (Added 2026-10-27.)
- **Increase Hand Payout:** pick any hand type except Nothing and add its base payout to it (see Paytable). The paytable tags upgraded hands with the total factor (×2, ×3, …). Needs no card. The button has no price on it; it opens a list of hands showing each one's payout before and after and its own price (e.g. "Full house: $160 → $240   $3"). Hands you can't afford are greyed out. (Added 2026-10-27; per-hand prices 2026-10-28; briefly replaced by boss credits 2026-11-02.)

**Pricing.** Every action starts at $2. Each Remove, Duplicate or Change suit purchase raises that action's next price by 50%: `price(n) = ceil(2 × 1.5^(n − 1))`, where n counts this purchase.

Increase Hand Payout has a separate price for each hand, all starting at $2. Upgrading a hand multiplies that hand's next price by 1.5: `price = ceil(2 × 1.5^n)`, where n is how many times this hand has been upgraded ($2, $3, $5, $7, $11, …). Upgrading one hand doesn't change the others' prices. (Changed 2026-11-03; before, the upgraded hand went ×4 and every other hand ×1.5, and the upgrade doubled the payout. Before 2026-10-28, one price shared by all hands went up 2.5x per purchase.)

(Inflation, every price ×1.1 on Normal or ×1.2 on Hard per hand played, was added 2026-10-30 and removed 2026-11-02.)

All prices are computed from the unrounded formula each time, so rounding doesn't compound.

| Purchase # | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Price | $2 | $3 | $5 | $7 | $11 | $16 | $23 | $35 | $52 | $77 |

## UI: a file system

Two windows on the site shell (`KG.makeWindow`), in all three OS looks and both themes.

**Cards window (file browser).** Every card is a file, and card actions are normal file operations.

- Folders: **Deck** (every card you own, in one folder, sorted by suit then rank), **Hand** (the 5 cards dealt this hand). There is no Trash folder; replaced cards aren't shown anywhere after the draw. (Trash removed 2026-10-27.)
- **Deal:** the Deal button sits at the left of the Cards toolbar, where a file browser's up arrow and path would be (there are none; the sidebar is the only navigation). It's enabled between hands. (Moved from the Account window 2026-10-27.)
- Card files are named with words, like `eight-hearts.card` or `ace-clubs.card`. A duplicate gets the OS look's usual copy name. The file icon shows only the rank and suit letter (`8H`, `AC`, `10S`); no suit symbols appear anywhere in the game. Labels use a four-color deck: spades black, hearts red, diamonds blue, clubs green.
- **Replace:** click cards in Hand to select the ones you want to replace (click again to unselect). Unselected cards are held. There is no Delete step. (Changed 2026-10-27; the first version discarded with Delete or drag-to-Trash.)
- **Draw:** a toolbar button styled as Refresh replaces the selected cards. After that the hand is final. Once the hand is paid out (and before the first deal) the same button reads "Edit deck" and opens the Deck folder; it's greyed out only after the run ends.
- **Remove:** right-click a card in Deck → "Delete permanently — $X".
- **Duplicate:** right-click a card in Deck → "Duplicate — $X" (or copy and paste it).
- **Change suit:** select a card in Deck, press "Change suit $X" and pick one of the other three suits (also in the right-click menu). The file is renamed, e.g. `king-clubs.card` → `king-hearts.card`; if that card already exists it becomes a copy (`king-hearts - Copy.card`).
- Status bar: the deck's card count and the Delete, Duplicate and Change suit prices.

**Account window (game state).** Styled as a Properties panel: bankroll; earned this level against the threshold ("$0 / $20"); level and hand ("Level 3 of 8 · Hand 5 of 5 · Boss"); a row of five boxes for this level's hands, filled as you play, where the fifth is gold and shows how many cards the boss adds ("+3") instead of "5"; this level's threshold ("Earn $250 this level by hand 5"); a note box that appears only when there's something to say (during a hand, on boss hands, at the end of a run); the paytable, with each hand's own payout and its total in dollars, every hand the last hand matched marked, and totals that would cover what's still needed in green. The result line lists every match and the sum, e.g. "Full house · Full house $80 + Three of a kind $40 + Two pair $20 + Pair $10 = $150 · +$150", and after the boss what the level earned against the threshold ("Beat the boss: earned $310 of $250 needed"). (A recent-hands log, a "N more hands, then the boss" note and a paytable footnote were removed 2026-10-27.)

**Phones** (≤ 760px): each window is full-screen, so the two windows are two screens, with the Account screen first. Selecting is a tap; Remove and Duplicate come from a long-press menu.

## Run setup, unlocks and achievements (added 2026-10-29)

The full list of options and achievements, and how each achievement is read, is in `PROPOSAL-achievements-unlocks.md`. This section covers how they work in the game.

**Game setup.** A Game setup button in the Account window opens a dialog with dropdowns for starting deck, hand size (5–10) and difficulty, and checkboxes for game mechanics, shop tools and information displays. Locked options are greyed out: a dropdown shows "(locked)" and "N of M unlocked", and a locked checkbox names the achievement that unlocks it. Save keeps the setup in the profile, and every new run (New run, or New run in the won/lost dialog) starts with it straight away. The information displays also apply to the current run as soon as you save; every other setting stays as the run started. Anything still locked falls back to the default. Apart from the information displays, settings can't change once the run starts; they're saved on the run (`run.settings`), and runs saved before this feature load with the defaults.

**Achievements count everywhere except Easy.** On Easy only *Beat Easy mode* can be earned. The player is told in four places:
- **Setup dialog:** Easy reads "Easy (no achievements)". Picking it shows "Achievements are off on Easy mode, except Beat Easy mode." under Difficulty, and the button reads "Start run (no achievements)".
- **Account window:** a Run row lists the run's settings, and an Achievements row reads "On", or "Off (Easy mode) · only Beat Easy mode can be earned".
- **End-of-run dialog:** lists the achievements first earned that run, and on Easy says the run didn't count.
- **Achievements window** (button in the Account window): a banner on an Easy run.

Achievements are checked after every draw and purchase. A newly earned one pops up as a toast naming what it unlocked. Earned achievements and the last setup are kept in localStorage (`ctrl-alt-deal-profile`), separate from the run.

**Rules added for the options:**
- **Hand size:** deals that many cards; the best 5 (the ones that pay most) are scored, and the rest are dimmed after the hand. The minimum deck size is the hand size.
- **Extra draw:** if you replace cards on the first draw, you get a second draw; keeping the hand scores it right away. **No draw:** nothing can be replaced.
- **Straights may skip a rank:** each step of a straight may jump one rank (2-4-6-7-9); aces still play high or low, with no wrapping.
- **Interest:** after each hand, 10% of the bankroll (rounded down) is added and shown in the result line. It goes into the bankroll only, not earned this level, so it doesn't help against bosses.
- **Free Duplicate:** Duplicate costs $0 (shown as "Free") and also adds a random card. It still counts as duplicating.
- **Difficulty:** on Easy bosses add no cards; on Normal and Hard every boss adds as many cards as its level; Hard has higher thresholds (see Bosses). (Changed 2026-11-03; from 2026-10-30 boss cards were locked by chance by difficulty, and before that bosses added 0, the level or twice the level cards.) Boss cards carry a flag. Changing one (suit or rank) keeps it a boss card, and so does splitting it (both halves stay boss cards, and splitting isn't deleting). Only Delete counts as deleting it. A duplicate of a boss card isn't one.
- **Increase / Decrease rank:** one step, wrapping (A → 2, 2 → A). **Split card:** the card is replaced by its two neighbouring ranks in its suit (2 → A and 3). Each has its own price counter ($2, ×1.5).
- **Add 2x to card:** a gold "2x" tag on the card. Every 2x card in the final hand, scored or not, doubles the payout, except on Nothing; the doubled payout counts for the boss. One per card. Price $2, ×4 per purchase, because each one doubles whole hands. A duplicate of a 2x card keeps the 2x; split halves don't.
- **Double payout** (setting key `doubleBet`): every boss hand pays double, automatically; it stacks with 2x cards, and the paytable's green "would cover it" totals count it on the boss hand. (Was Double bet until 2026-11-02; until 2026-11-03 it was a toggle beside Deal for one hand per level.)
- **Deck properties:** an Account section with card counts by rank and suit, plus copies, boss cards and 2x cards. **Deck odds:** an Odds column in the paytable, the chance a fresh deal contains each hand: some 5 of the dealt cards make it, at any hand size, so a full house also counts toward Three of a kind, Two pair and Pair, and a 10-card deal with a flush and a separate pair counts for both (changed 2026-10-30; it first showed the chance each hand was the best one) (simulated from the current deck, 400–3,000 deals depending on hand size). **Draw odds:** during a hand, a strip under the banner with each rank's and suit's share of the cards left to draw. **Payout increase:** each hand in the Increase Hand Payout menu also shows how much more you'd win by making that hand ("Pair: $10 → $20 · +$10 if you make it"). Hands that include it gain the same amount.

## Constants

| Constant | Value |
|---|---|
| STARTING_BANKROLL | $0 (was $25 until 2026-11-02, then $40 until 2026-11-03). The bankroll carries over between levels |
| STARTING_DECK | Standard 52 cards |
| LEVELS | 8 |
| HANDS_PER_LEVEL | 5 (the 5th is the boss hand) |
| HAND_SIZE | 5 (6–10 unlockable; best 5 scored) |
| DRAWS_PER_HAND | 1 (2 with Extra draw, 0 with No draw) |
| MIN_DECK_SIZE | 5, or the hand size if bigger |
| PAYOUT_UNIT | $10 per 1x of payout |
| BOSS_TARGETS | Easy and Normal: $20, $100, $200, $750, $2,000, $4,000, $8,000, $16,000 |
| HARD_BOSS_TARGETS | Hard: $20, $100, $250, $1,000, $3,000, $8,000, $15,000, $25,000 |
| PAYOUT_BASE_PRICE | $2 (Increase Hand Payout, each hand) |
| SHOP_BASE_PRICE | $2 each for Remove, Duplicate, Change suit |
| SHOP_PRICE_GROWTH | ×1.5 per purchase, separate for each action |
| PAYOUT_GROWTH | ×1.5 to a hand's upgrade price when it's upgraded (other hands unchanged) |
| Base payouts | Pair 1x, Two pair 2x, Three of a kind 4x, Straight 10x, Flush 12x, Full house 8x, Four of a kind 35x, Straight flush 78x, Five of a kind 110x (each paid alongside the hands it contains) |

## Assumptions to confirm

1. The base payouts follow simulated standard-deck odds but haven't been playtested. Deck shaping changes the odds a lot (Change suit makes flushes easy), so late-game balance still depends on shop prices.
2. Boss targets for levels 2–7 (see Bosses) were filled in during the build.
3. Earned this level at the threshold check includes the boss hand's own payout, but not Interest.
4. Increase Hand Payout prices each hand separately (×1.5 per upgrade of that hand), and each upgrade adds the base, so payouts grow linearly while prices grow by 1.5x.
5. All money is in whole dollars. Shop prices round up.
6. You can discard at most (deck size − 5) cards, so the hand can always be refilled.

## Open questions

- **Balance.** Face and Flush Five decks win almost every run under fixed payouts, difficulty barely changes win rates, level 3 ($250) is steep for big decks and the Straight deck stalls at level 2 (see Bosses). The current rules (payout shop, bankroll carried over, no prizes) haven't been simulated. The simulator lives outside the repo.
- **Onboarding.** Probably a short first-run walkthrough of one hand and one shop purchase. Not built; content to be agreed first.

## Implementation (first build, 2026-10-26)

Files: `engine.js` (rules, no DOM; runs under node), `game.js` (both windows), `style.css`, `tools/check-engine.js` (`node ctrl-alt-deal/tools/check-engine.js`).

Decisions made while building, beyond the definition above:

- **Saving:** the run is saved to localStorage (`ctrl-alt-deal-run`) after every action, including mid-hand with the shuffled draw order, so reloading can't reshuffle a bad deal. Window positions are saved too.
- **Old saves:** runs saved before the bankroll reset (no `version: 2`) are dropped on load and a new run starts.
- **Copy names:** Value `king-clubs - Copy`, `king-clubs - Copy (2)`; Quality `king-clubs copy`, `king-clubs copy 2`; Power and phone `king-clubs (2)`, `king-clubs (3)`. Numbering is per rank+suit, so a copy of a copy is just the next number.
- **Folders:** just Deck and Hand, switched from the sidebar. There is no parent "Cards" folder, up arrow or path.
- **One Deck folder:** the definition's per-suit subfolders were dropped on 2026-10-27; every card sits directly in Deck.
- **Hand selection:** in Hand a click toggles whether a card will be replaced; the Draw button shows the count ("Draw 2"), and reads "Keep hand" when nothing is selected. The marks are saved with the run. In Deck a click selects one card (click again to unselect).
- **Shop buttons:** in Deck the toolbar shows, left to right, "Delete card $X", "Duplicate card $X" and "Change suit $X" and "Increase Hand Payout" (the card actions always show the current price; Increase Hand Payout shows prices per hand in its list; phones shorten them to Delete, Copy, Suit, Payout) in place of Draw. They light up only when a card is selected and you can afford the action. The right-click / long-press menu still works too.
- **Help banner:** the how-to text at the top of the Cards window (the shop hint, and the replace instructions during a hand) has an × that hides it until the page is reloaded. Hand results and run over still show. Not saved, so a fresh visit shows the help again.
- **Money format:** amounts under $1M show in full ($163,840); from $1M up they're shortened to three significant digits with M, B, T or Q ($1.23M, $48.3B), rounded down so the bankroll never looks bigger than it is.
- **Hand order:** Hand and the Account window's last hand are shown strongest first (aces left, 2s right), not in deal order.
- **After the draw** Hand keeps showing the final 5 cards (drawn ones animate in) with the result in a banner, until the next Deal.
- **Keyboard:** Ctrl/⌘+A in Hand selects every card to replace. Delete/Backspace in Deck asks to permanently delete (Shift+Delete skips the question). Ctrl/⌘+C then Ctrl/⌘+V duplicates. F5 or Ctrl/⌘+R draws while a hand is in play.
- **Phones:** the shell's bottom bar holds the site nav, so the game adds an Account / Cards tab strip along the top to switch screens. Deal is in the Cards toolbar, so a whole hand plays out on the Cards screen. The sidebar becomes a scrolling row of folders.
- **Bar icon:** `os/os.js` gained an `Account` icon for the taskbar.
- **Win/loss** show a dialog with a New run button; New run in the Account window asks first if a run is in progress.
