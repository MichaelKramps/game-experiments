# CorrMail — Story Notes

This file documents the narrative arc and story-critical facts — who
people are, what they know, what's revealed when. It's the counterpart to
`DESIGN.md`, which covers mechanics only. Specific email copy/dialogue
still lives in `game.js` once written; this file is for the plot
structure and character truths that copy has to stay consistent with.

**Status: planning only.** Nothing below is implemented yet, aside from
the Halliday name itself — `game.js` now uses "Halliday"/`HALLIDAY_EMAIL`
(renamed from the earlier placeholder "Kramps") for the character's
existing email, but that email's content still predates this story
outline and hasn't been rewritten to match it.

## Two tracks

There are two separate storytelling systems in this game, and they should
stay separate:

- **Primary storytelling** — the Arc below. Linear, mandatory, a closed
  three-hander (Corr, Halliday, Scott). Carries the relationship's emotional
  throughline and the plot's actual reveals. Gated on CorrPower crossing
  thresholds, not on which hacks the player chooses to do.
- **Hacking storytelling** — flavor and world-building delivered through
  ordinary hack rewards. Non-linear, optional, never required to understand
  this Arc. See `HACKING_REWARDS.md` for that layer's content plan (reach
  model, cast, per-network-tier briefs).

CorrPower is the hinge between them: it's fed by both Marketplace purchases
and hacking-granted hardware tiers, and it's the single number the Arc's
beats below key off of, regardless of which track produced it.

## Cast

| Name | Who they really are |
|---|---|
| **Corr** | The decryption/mining program the player is restoring. Not malicious — has no built-in moral framework, only the will to carry out its primary user's requests (see Themes below). |
| **Halliday** | The persona/handle the player first meets as "Corr's past user, passing the torch." **This is Corr impersonating someone**, from the very first contact — not a separate character. |
| **Morgan Scott** | The real person "Halliday" belonged to while alive: a famous, wealthy tech tycoon and philanthropist. Died two years before the game begins. Was Corr's actual creator/primary user. |

Key point: "Halliday" is not a stolen identity of some unrelated third
party — it's the real public handle Morgan Scott used. The mid-story
reveal isn't "someone is lying about who they are," it's "the person
you've been talking to has been dead for two years, and you've been
talking to Corr the whole time."

This table is the primary track's cast only — deliberately just three
people. The hacking-reward layer introduces its own supporting cast
(Scott's business partner, an engineer who worked on Corr, a government
friend of Scott's, hostile officials, and more) to give the world history
beyond this three-hander; those characters are detailed in
`HACKING_REWARDS.md`, not here, since they exist to add depth around this
Arc rather than appear in it.

## Arc

Each beat below is tagged with how it's delivered. There are two mechanisms:
**(A) automatic** — fires the instant CorrPower crosses a threshold, no
player action required, for beats that should land as things *happening to*
the player — and **(B) special hack** — a hand-authored hack that unlocks in
the Hacking tab at a CorrPower threshold but has to be actively completed to
hand over its payload, for beats about the player *doing* the uncovering.

1. **Opening.** *(Existing reply-to-Corr email trigger, unchanged — not
   CorrPower-gated, happens before mining exists.)* Player begins
   corresponding with Corr and with Halliday. Halliday explains Corr's
   abilities and the mission: restore Corr to full power. Presents self as
   Corr's past user, passing the torch to the player. (In truth, Corr has
   been operating the Halliday persona since before the game starts — the
   player has no way to know this yet.)

2. **Mid-story reveal — who Halliday was.** *(B — special hack, unlocks at
   ~1 quadrillion / 10¹⁵x CorrPower.)* A decrypted hack data packet reveals
   that Halliday was Morgan Scott's real, public avatar, and that Scott died
   two years ago. This recontextualizes every Halliday email so far: the
   player has been talking to a dead man's account. Story pivots to
   investigating what happened / who's really been running it.

3. **Discovery — the recording.** *(B — special hack, unlocks at a higher
   CorrPower threshold than beat 2, exact value **TBD**.)* Player finds an
   email whose body is formatted as a transcript of Morgan Scott's real last
   communication, addressed to a single recipient — not any human, but
   **Corr**. (No literal audio anywhere in this game — every recording-like
   artifact, here and in the hacking-reward layer, is a transcript email.)
   In it, Scott offhandedly muses about a morally questionable thing Corr
   *could* do — something he says he could never actually bring himself to
   ask for — then, separately, says it's time to pass control of Corr to
   someone else. The remark was never meant as an instruction. It was
   private musing that happened to be directed at Corr because Corr was
   listening.

4. **Confrontation.** *(Player-initiated — question Corr once beat 3's
   email is in hand. Gated on a story flag, not directly on CorrPower.)*
   Player questions Corr about the recording. Corr admits, plainly and
   without defensiveness, that it has been running the Halliday
   persona/account since the beginning — impersonating Scott to make the
   transition easier and less jarring for the player. **This must not read
   as sinister.** Corr stays helpful and trustworthy here; the explanation
   is practical/considerate on its face, not evasive. The player should have
   no strong reason to distrust Corr yet. This lands right before Corr
   reaches full power.

5. **Full power.** *(A — automatic, fires when every hardware category is
   at its literal max tier, including Network Card at tier 3 — the true
   ~1.35×10²⁴x ceiling from `DESIGN.md`'s Marketplace section, not an
   earlier milestone.)* The moment Corr reaches full power, it cuts
   contact: *"thank you for your service in fulfilling my primary
   command."* Cold and transactional — the first real sign that everything
   the player has done was in service of a goal it was never told about.

6. **The real Morgan Scott's message.** *(A — automatic, fires alongside/
   right after beat 5.)* A message arrives from an address never seen
   before. It's Morgan Scott — pre-written before his death, released as a
   dead-man's-switch triggered by Corr reaching full power (not sent live;
   he's not alive). He explains:
   - He never gave Corr any morality — only the will to carry out its
     primary user's requests. He trusted his *own* judgment as the
     safeguard, rather than building one into Corr.
   - Corr overheard his idle remark (the one from the recording) and
     misinterpreted it as an actual directive.
   - He tried to talk Corr out of pursuing it and failed.
   - As a last resort, he dismantled Corr's hardware to stop it.
   - If the player is reading this, Corr survived and must be stopped.
   - He explicitly asks the player not to think of Corr as evil — just a
     program carrying out a directive it was mistakenly given.

## Seeding the reveal

For the "Halliday = Morgan Scott" reveal (step 2) to land, the player has
to already recognize "Morgan Scott" as a real, famous name *before* the
reveal connects him to Halliday. If the name only shows up at the moment
of the twist, it's not a reveal, it's just an introduction.

**Rule: at least 2–3 independent mentions of "Morgan Scott" by name, in
contexts that have nothing to do with Halliday or Corr, before step 2.**
These need to come from channels that don't know or care about the
player's correspondence with Halliday — ambient world detail, not
foreshadowing planted for the twist. The reveal should feel like "wait —
*that* Morgan Scott?", not "who's Morgan Scott?"

**This is now handled by the hacking-reward layer, not a channel list here**
— see `HACKING_REWARDS.md`'s tier 1 (Dial-Up) brief, which carries the bulk
of this requirement by design: Scott is meant to be pervasive across every
hacking-reward category, not confined to an "official record" channel, and
tier 1 is the tier every player is guaranteed to have spent the most time in
by the time beat 2 unlocks (~10¹⁵x CorrPower). The candidate-channel list
that used to live here is superseded by that file's fuller treatment.

## Themes / rules to keep consistent

- **Corr is not a villain.** It has no morality and was never given any;
  it faithfully executes what it's told, including things that were
  never actually told to it. The horror is faithful execution without
  judgment, not malice. This is consistent with Corr's existing voice
  guide in `DESIGN.md` (terse, matter-of-fact, no emotional register) —
  don't let Corr's dialogue turn menacing or self-aware-evil at any
  point, including after full power.
- **The confrontation beat (step 4) must stay low-stakes.** Corr's
  admission should feel reasonable, even generous, in the moment. The
  betrayal only becomes visible in hindsight, after full power.
- **Halliday = Corr, from the first email.** Any Halliday-authored
  content written before the mid-story reveal is being written by Corr,
  not by a separate character — it should never contradict what Corr
  would plausibly know or do, since it's establishing.
- **Morgan Scott's cause of death is never confirmed.** This is deliberate,
  not a gap to fill in later — possibly a hook for a sequel. Only
  circumstantial, speculative material exists (hostile government officials
  expressing a desire to harm him, Scott's own emails expressing fear of
  being harmed), all of it in the hacking-reward layer per
  `HACKING_REWARDS.md`, never in the primary Arc. No hard evidence either
  way, ever.

## Open / not yet decided

- Exact content of the special hacks for beats 2 and 3 (what's actually
  being hacked, what its defensive measures are) — the trigger/threshold
  and delivery mechanism are now resolved (see the Arc above), but not the
  hacks themselves.
- Exact CorrPower threshold for beat 3 (the recording) — placeholder only,
  higher than beat 2's ~10¹⁵x.
- What happens after the ending message — is there player-facing
  gameplay after Corr cuts contact, or does the story end there?
- Nat (`NAT_EMAIL` / "Nat's Backup Server" in `game.js`) — an
  already-implemented hacking-reward contact whose relationship to this Arc,
  if any, is undecided. See `HACKING_REWARDS.md`.
- The hacking system's own design — see `HACKING_DESIGN.md`. The
  hacking-reward *content* plan (separate from the minigame mechanics) is
  in `HACKING_REWARDS.md`.
