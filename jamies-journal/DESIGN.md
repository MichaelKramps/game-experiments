# diff guess key

A word-guessing game in a fake terminal. Guess a 5-letter key before your
tolerance runs out. The name reads as the command you'd run to compare your
guess against the key; the terminal prompt is `kramps@dgk ~ % diff guess key`
(the rules screen runs `diff --help`). The folder (`jamies-journal/`) and the
localStorage keys keep the old name so the URL and saved progress don't change.
Named on 2026-11-11, after a brief stint as "Kramps' Journal".

**History.** This started as Jamie's Journal, set in the Evergreen universe:
20 encrypted journal entries written by Jamie Taylor to Jo, each unlocked by
guessing its key. On 2026-11-11 the journal was removed completely (the
entries, list and reading screens are gone, and `entries.js` was deleted) and
it became a plain word-guessing game. The entries survive only in git history
up to commit 9231426 (an older draft; the 2026-11-10 rewrite was never
committed).

## Screens
- **Play** (the default screen). The tolerance bar, the guess table, the key
  prompt and the letter scratchpad. The status bar's right side shows the
  current streak (`streak 0` included). Actions: **Submit - Enter**,
  **Rules - Tab**. A game in progress is resumed on load.
- **Rules.** The rules text, written by Kramps (`RULES` in `game.js`).
  Action: **Play - Tab**, back to the game in progress.
- **End.** Shows the guess table and either KEY ACCEPTED (key and tolerance
  left) or ACCESS DENIED (the right answer), plus the win/streak stats.
  Action: **Play Again - Enter**, which starts a new key.

(A separate start screen with Play - Enter / Rules - Tab was tried briefly
on 2026-11-11 and dropped in favour of opening straight into the game.)

All actions are listed in the footer as "Label - Key" and can be clicked.

## Rules
The key is a common English word of exactly 5 letters, picked at random from
`words.js` (never the same as the previous game's key, 410 words). Guesses
must be real 5-letter words: any answer, or a word from `guesses.js` (4,429
accepted in all, plurals and past tenses included). Each guess shows:
- **Red letters**: the guess's letters that aren't in the key. Extra copies
  of a letter count as misses, like Mastermind, matched left to right
  (e.g. GEESE against SHEEP: G and the last E are red). Position never
  affects which copy is red.
- **Cost**: what the guess cost.

The game never says which letters are in the right spot. You work out the
order by guessing words.

**Tolerance.** Each game starts with **15 tolerance**, shown as a bar. A wrong
guess costs **1 per red letter**. A wrong guess with no red letters (all the
key's letters, wrong order) costs **1**. At 0 the game is lost.

Guesses that aren't letters only, aren't exactly 5 letters, aren't in the
word list ("not in word list") or repeat an earlier guess are rejected and
cost nothing.

**Word list.** On 2026-11-11 guesses went from "any 5 letters" to real words
only. The aim is that every commonly known word is accepted (GLEAN, QUALM,
FERAL), but not every obscure one. `guesses.js` is built by
`tools/build-guesses.py` from SCOWL 2020.12.07 (american), sizes up to 50,
minus offensive words. Size 50 is where the line was drawn: it still has
familiar words like FERAL, COUPE, DIVAN, with a few rare ones (FIRTH,
GELID); sizes 55+ are mostly British slang and obscure words (YONKS, BAIRN,
KRAAL). To change the cutoff, edit `MAX_SIZE` and re-run with a SCOWL
download (sourceforge.net/projects/wordlist).

**Letter scratchpad.** A panel beside the guesses (or below them on narrow
screens) shows A–Z. Clicking a letter cycles it neutral → out (red) →
included → neutral. It's only for the player's notes; the game never fills
it in. Marks belong to the current game.

## Balance history (all 2026-11-11)
The 10-guess limit became tolerance. At first the feedback was a LETTERS
count (letters shared with the key) plus a PLACED count, with 25 tolerance.
Red letters replaced the LETTERS count, and since they make letter-hunting
much easier, tolerance dropped to 15. Then PLACED was removed too, so there's
no positional feedback at all. We rejected a stricter cost (2 per miss, 1 per
misplaced letter): it kept pressure on placement, but the one-rule version is
easier to read. Rearranging the key's letters used to be free; once placement
feedback was gone, a wrong guess with no red letters was made to cost 1.

Simulation (red letters, no placement, before the 1-point rearranging cost):
a careful solver, guessing any English word that fits every clue, spends
about 13 (p95 20). It wins 70% of games at 15 and 97% at 20. A solver that
knows the key list spends about 8 and wins 99% at 15. A first guess costs
about 4. The 1-point cost for rearranging makes this a little harder.

## Persistence
`localStorage['jamies-journal-game']` holds the game in progress (key,
guesses, scratchpad marks) and the stats (played, wins, streak, best).
Tolerance is worked out from the saved guesses, so a refresh can't reset a
bad run. The old journal progress (`jamies-journal-progress`) is deleted on
load.

## Files
- `words.js`: the pool of keys (`KEY_WORDS`)
- `guesses.js`: extra accepted guesses (`EXTRA_GUESS_WORDS`), generated by
  `tools/build-guesses.py`; don't edit by hand
- `game.js`: the screens, the scoring and the rules text
- `index.html`: the page; the terminal window comes from the site shell
  (`KG.makeWindow` in `../os/os.js`), with its position and size saved in
  `localStorage['jamies-journal-window']`.
- `style.css`: the look. It should pass for ordinary work: a black-and-white
  terminal window on a plain desktop. On phones the window fills the screen.

## Open questions
- Whether to rename the folder to match the name.
