# Ctrl+Alt+Deal: achievements and unlocks (proposal)

Status: **built 2026-10-29.** How it works in the game is in DESIGN.md under "Run setup, unlocks and achievements". This file keeps the full option and achievement lists and the decisions behind them.

## Achievements

Each achievement unlocks exactly one option.

| Achievement | Unlocks |
|---|---|
| Have a deck of only number cards (2–10) | Numbers deck |
| Have a deck of only face cards (J–A) | Face deck |
| Have a deck with exactly 26 cards | Half deck |
| Make a straight | Straight deck |
| Win with a non-standard deck | Random deck |
| Win without deleting any boss cards | Corrupted deck |
| Have a deck of only 5 cards | Flush Five deck |
| Beat Normal mode with the standard deck | 6-card hands |
| Beat Normal mode without upgrading a hand until level 5 | 7-card hands |
| Beat Normal mode without changing a card's suit | 8-card hands |
| Beat Normal mode without duplicating a card | 9-card hands |
| Beat Normal mode without deleting a card | 10-card hands |
| Beat Hard mode with 5-card hands | Extra draw |
| Beat Easy mode with 10-card hands | No draw |
| Make a straight on the final boss | Straights may skip a rank |
| Reach $100,000 in your bankroll | Interest |
| Pay $15,000 to duplicate a card | Free Duplicate |
| Increase the payout for a straight to $1,000 | Increase rank |
| Make $10,000 from straights in one run | Decrease rank |
| Have 100 or more cards in your deck | Split card |
| Beat Normal mode without increasing the payout for a pair | Add 2x to card |
| Make over $20,000 on one hand | Double payout |
| Lose to a boss | Easy mode |
| Beat Normal mode | Hard mode |
| Finish a run (win or lose) | Deck properties |
| Make a straight flush | Deck odds |
| Make a flush five | Draw odds |
| Get a hand type to pay $10,000 | Payout increase |

(List revised 2026-11-03. Achievements whose meaning changed got new ids, so anything earned under an old meaning has to be earned again. Kept ids: the seven deck ones, Interest's, Big deck, Lose to a boss, Beat Normal mode and the four information ones.)

### How each achievement is read

- **"Make X"** means X is one of the hands you were paid for. Every hand that includes X counts, so a straight flush also makes a straight and a flush.
- **"Make a straight on the final boss"** means a paid straight on level 8's boss hand (its 5th), whether or not you beat the boss.
- **"Beat Normal mode …"** needs a won run on Normal. A Hard or Easy win doesn't count.
- **"Without upgrading a hand until level 5"** means your first Increase Hand Payout is bought on level 5 or later, or never.
- **"Without duplicating a card"** counts Free Duplicate as duplicating. **"Without deleting a card"** means Delete; Split card isn't deleting.
- **"Beat Easy mode with 10-card hands"** is the only achievement an Easy run can earn.
- **"Have a deck of …"** only needs to be true for a moment. It's checked after every deck change and after boss cards are added.
- **Number cards** are 2–10 and **face cards** are J, Q, K and A, the same split as the Numbers and Face decks.
- **Boss cards** are the cards a boss added.
  - A duplicate of a boss card is not a boss card.
  - Changing a boss card (Change suit, Increase rank, Decrease rank) doesn't delete it; it stays a boss card.
  - Any time a boss card leaves the deck, it counts as deleted.
- **"Payout for a straight"** is the Straight row's Total in the paytable. It's $100, and each upgrade adds $100, so 9 upgrades make $1,000.
- **"Make $10,000 from straights in one run"** adds up the Straight line of every hand in the run, with 2x cards and Double payout applied. The other lines of a hand that also has a straight (a straight flush's Flush and Straight flush lines) don't count.
- **"Get a hand type to pay $10,000"** uses any row's Total, which includes the hands it contains.
- **"Make over $20,000 on one hand"** uses what the hand paid, including 2x cards and Double payout, and needs more than $20,000.
- **"Pay $15,000 to duplicate a card"** means a single duplicate priced at $15,000 or more. With the base pricing ($2 × 1.5ⁿ), that's the 24th duplicate in a run ($22,446; the 23rd is $14,964).
- **"Make a flush five"** means a five of a kind in one suit, which pays Five of a kind and Flush. Flush Five is no longer a hand of its own (removed 2026-10-29).

## Unlocks

Each unlock is earned by an achievement. A locked option shows in the run setup dialog, greyed out, with the achievement that unlocks it.

### Starting decks (dropdown, one per run)

| Deck | Contents |
|---|---|
| Standard | The usual 52 cards. Always available. |
| Numbers | 2–10 in all suits (36 cards). |
| Face | J–A in all suits (16 cards). With only 4 ranks it can't make a straight until the deck is shaped. |
| Half | 2 of each rank, suits random (26 cards). |
| Straight | 1 of each rank, suits random (13 cards). |
| Random | 52 cards, each with a random rank and suit. |
| Corrupted | The full 52 plus 13 random cards (65 cards). |
| Flush Five | Copies of one random card, as many as the hand size (5 cards for 5-card hands). |

### Game mechanic adjustments

- **Hand size** (dropdown): 5 is the default. 6, 7, 8, 9 and 10 appear once unlocked. Only the best 5 cards are scored. The minimum deck size equals the hand size, so Delete stops there.
- **Extra draw** (toggle): a second draw each hand. It can't be on together with No draw.
- **No draw** (toggle): the dealt hand is final. It can't be on together with Extra draw.
- **Straights may skip a rank** (toggle): a straight still needs 5 cards, but each gap between cards may skip one rank, and this can happen more than once. For example 2-4-6-7-9 is a straight.
- **Interest** (toggle): after each hand you earn 10% of your bankroll.
- **Free Duplicate** (toggle): Duplicate costs nothing, but each use also adds a random card to the deck.

### Shop tools (toggles)

- **Increase rank** / **Decrease rank**: move a card's rank one step. Ranks wrap, so A goes up to 2 and 2 goes down to A.
- **Split card**: the card keeps its suit and becomes its two neighbouring ranks, wrapping at the ends. 2 becomes A and 3; A becomes K and 2.
- **Add 2x to card**: the card doubles the hand's total if it's anywhere in the final hand, even when it isn't part of the scored hand. It does nothing on Nothing (high card). A card can carry only one 2x, but several 2x cards in one hand stack (2x × 2x = 4x). The doubled total counts toward the boss target.
- **Double payout** (was Double bet): every boss hand pays double. (Until 2026-11-03 it was a once-per-level toggle for any hand.)

### Difficulty

- **Normal**: the default.
- **Easy** (unlock): bosses don't add cards to your deck.
- **Hard** (unlock): bosses add cards as on Normal, and every threshold is higher. (Locked boss cards were removed 2026-11-03.)

(Changed 2026-10-30: Normal now locks each boss card with a 50% chance. Before, Easy added no boss cards and Hard added 2 × level; now every difficulty adds as many as the level. See Locked cards in DESIGN.md.)

### Information displays (toggles)

- **Deck properties**: counts by rank and suit, copies, deck size.
- **Deck odds**: the chance a fresh deal from the current deck contains each hand (a full house counts toward Pair too).
- **Draw odds**: during a hand, the chance of drawing each rank and suit from what's left.
- **Payout increase**: in the upgrade menu, how much more money the hand would pay if you upgraded it.

There are no cosmetic unlocks.

## Which runs count for achievements

Only **Easy mode** stops a run from counting. Every other setting is allowed for achievements: any starting deck, any hand size, Extra draw, No draw, skip-rank straights, Interest, Free Duplicate, every shop tool and every information display.

The one exception is **Beat Easy mode with 10-card hands**, the only achievement an Easy run can earn.

### Settings lock at run start

- Every option above is chosen in a **Game setup dialog** opened from a button in the Account window. New run starts straight away with the saved setup (changed 2026-10-29 from opening the dialog on every New run).
- Once the run starts, its settings can't change, except the information displays, which apply to the current run when Game setup is saved (changed 2026-11-03). They don't affect achievements. They're stored on the run (`run.settings`), and the engine works out `run.countsForAchievements` once, at start.
- A saved run from before this feature loads as Standard deck, Normal, 5 cards, nothing on, so it counts.

### Telling the player

The player is told that a run won't count before it starts, while it's being played, and when it ends.

1. **In the Game setup dialog.** The Easy option reads "Easy (no achievements)". When Easy is picked, a warning line shows under Difficulty:
   > Achievements are off on Easy mode, except Beat Easy mode with 10-card hands.
2. **In the Account window, during the run.** A **Run** row lists the run's settings, for example "Face deck · Hard · Split card". On Easy, an **Achievements** row underneath says "Off (Easy mode)" in the warning colour. When the run counts, the row says "On".
3. **At the end of the run.** The won/lost dialog adds a line: "This run didn't count toward achievements (Easy mode)." A run that does count lists any achievements earned in it instead.
4. **On the achievements screen.** If the current run is on Easy, a banner at the top says achievements are off for it.


## What the build needed

- **Lifetime storage** (localStorage, separate from the run save): achievements earned, unlocks, the last setup choices, and any lifetime stats the achievements need.
- **Game setup dialog** opened from the Account window: deck dropdown, hand-size dropdown, difficulty, the toggles grouped as above with locked ones greyed out, the Easy warning line, and the Start button.
- **Engine**: `newRun(settings)`, starting-deck builders, boss card count by difficulty, best-5 scoring for larger hands, skip-rank straights, 2x cards, the new shop actions, interest, the draw count setting, Double payout, and the `countsForAchievements` check.
- **Achievements screen**: a new tab or file next to Account, listing each achievement, whether it's earned, and what it unlocks.
- The first build should get its UX agreed before any code (dialog layout, achievement screen, unlock toast).

## Simulation findings that bear on this

Scripts are in the session scratchpad, not the repo. Results come from a bot that plays worse than a person in the early game.

- **Standard deck odds per deal**: pair 49.5%, two pair 12.9%, trips 7.4%, straight 1.05%, flush 1.08%, full house 1.17%, quads 0.24%, nothing 26.6%.
- **5-card hands**: a flush build wins ~16–28% of runs and is near-certain at the final boss. A straight build never won.
- **7-card hands (best 5)**: a flush build wins 95% and a straight build 4.5%. Larger hands make runs much easier, yet they still count for achievements.
- **Straight ceiling**: decks of pure 5 ranks (20/40/100 cards) make a straight only 26%/20%/18% of the time. Skip-rank straights and rank tools are the levers that make straights viable.

## Decided (2026-10-29)

- An Easy run can earn only **Beat Easy mode** (since 2026-11-03, **Beat Easy mode with 10-card hands**).
- The minimum deck size equals the hand size. The Flush Five deck starts with as many copies as the hand size.
- The Flush Five deck stays as it is for now, even if it makes some achievements easy. It can be tuned later.
- "Make a pair on level 8" (was "Beat the final boss with a pair") counted any paid pair. Replaced 2026-11-03 by "Beat Normal mode with the standard deck".
- No Hard-only achievements for now. They may come later if the game gets popular.

## Decided while building (2026-10-29)

- **Split card on a boss card** isn't deleting it, and both halves stay boss cards.
- **Add 2x to card** costs $2, then ×4 per purchase, like a payout upgrade.
- **2x cards:** a duplicate of a 2x card keeps the 2x; split halves don't.
- **Free Duplicate** still counts as duplicating for "without duplicating a card".
- **Interest** is added after every hand except one that ends the run in a loss.
- **The achievements window** opens from a button in the Account window rather than being a separate tab.

## Open

- Starting-deck and shop-tool balance; these can be simulated now that they're built.
