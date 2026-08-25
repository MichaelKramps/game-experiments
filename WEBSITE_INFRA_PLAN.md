# Website Infrastructure Plan — Decisions

## Context

This site (`game-experiments`) is deployed as a static site to Cloudflare via `wrangler.jsonc` (`assets.directory: "."`), updated by a plain `git push` to `main`. As of writing, there is **no backend, no database, no forms, no email service, and no payment integration** anywhere in the repo.

Separately, there's an agreed (out of scope here) business process: build small 1-hour narrative games on ~2-month cycles, validate demand via streamers/itch.io/Reddit/ads, and ask players who finish a demo to either back a Kickstarter or leave their email. This plan makes the **website** capable of supporting that process across three capabilities:

1. **Now** — capture and durably store emails from a "give us your email" CTA.
2. **Later** — grant access (download/play unlock) to Kickstarter backers and buyers.
3. **Eventually** — accept payments directly on the site (~$12 base price + tiers).

**Guiding principle**: every phase adds to the same Cloudflare Worker + D1 database rather than being a separate bolt-on system. Phase 1 ships a `subscribers` table; Phase 2 adds an unrelated `access_grants` table; Phase 3 adds Stripe routes that write into the `access_grants` table Phase 2 already created. Nothing gets ripped out between phases.

A key mechanical detail: the repo currently has **no `"main"` field** in `wrangler.jsonc`, meaning it's assets-only — no Worker code runs today. Adding backend behavior means adding a `"main"` entry pointing at a small Worker script; Cloudflare matches requests against static files first and only falls through to Worker code for paths that aren't files (e.g. `/api/subscribe`).

---

## Phase 1: Email Capture

**Decision: Cloudflare Worker + D1 (custom), not a managed ESP, to start.**

- Add `"main": "src/worker.js"` to `wrangler.jsonc`, plus a D1 binding.
- `src/worker.js` — fetch handler routing `POST /api/subscribe`; falls through to `env.ASSETS.fetch(request)` for everything else.
- `migrations/0001_create_subscribers.sql` — `subscribers(id, email UNIQUE, source, created_at, unsubscribed_at, unsub_token)`.
- `shared/signup-form.js` + `shared/signup-form.css` — vanilla-JS form + Cloudflare Turnstile widget, posts to `/api/subscribe`. Included via one `<script>` tag on any game's end screen. Establishes the repo's first `shared/` convention (Phase 2/3 UI reuses it).
- **Spam/bot protection**: Cloudflare Turnstile (verified server-side against `siteverify`, secret via `wrangler secret put TURNSTILE_SECRET_KEY`) + a hidden honeypot field + a per-IP rate limit via KV.
- `/api/unsubscribe?token=` — flips `unsubscribed_at` using an HMAC token embedded in every email footer. Should show a confirmation page and act on POST, not act immediately on GET, since email clients/scanners pre-fetch links and would otherwise trigger false unsubscribes.
- Always return the same generic response from `/api/subscribe` regardless of whether the email was new or already present, to avoid email-enumeration probing.
- All queries use D1's parameterized `.bind()` — never raw string-concatenated SQL.
- **GDPR / CAN-SPAM-lite**: one-click unsubscribe link in every email; a short consent line near the form; store only email + timestamp + source; honor unsubscribes immediately.
- **Future migration path**: once the list is large enough to justify it, port to a paid ESP (e.g. Buttondown) via CSV export from D1 (excluding rows with `unsubscribed_at` set) and bulk import — low friction since the list is cleanly single-opt-in.
- **Sending to the list** (distinct from storing it): D1 remains the source of truth; use a provider's broadcast/audience feature (e.g. Resend Broadcasts, introduced in Phase 3 anyway for transactional email) to actually send campaigns, rather than manual/BCC sending — manual sending from a personal account has a real risk of landing in spam due to missing domain authentication (SPF/DKIM/DMARC) and no List-Unsubscribe header.

---

## Phase 2: Access Granting

**Decision: email + access key (no accounts, no Google OAuth) — matches the itch.io/Humble Bundle industry pattern for one-time-purchase browser games.** Custom `access_grants` system for direct-site sales and Kickstarter backers; itch.io's native key feature for itch-originated purchases (no need to duplicate what itch already provides).

- `migrations/0002_create_access_grants.sql` — `access_grants(id, email, game_slug, access_key, granted_via ['kickstarter'|'purchase'|'manual'], created_at, redeemed_at, revoked_at)`.
- `migrations/0003_create_key_redemptions.sql` — `key_redemptions(id, access_grant_id REFERENCES access_grants(id), ip_address, redeemed_at)` — logs every redemption attempt, not just the first, so reuse of a key is visible.
- `/api/redeem` — validates the key, checks `revoked_at IS NULL`, logs a `key_redemptions` row, sets a signed httpOnly cookie scoped to that game.
- Downloads: full-game builds stored in an **R2 bucket**; the Worker issues a short-lived presigned URL only after validating the key (never a permanent public file URL).
- Play-gating: the Worker re-checks the key against D1 (including `revoked_at`) on each request to a gated game, rather than trusting a long-lived cookie blindly — this makes revocation take effect immediately.
- **Abuse detection & revocation — manual queries, no admin UI needed at this scale**:
  - Spot abuse: `SELECT access_key, COUNT(*) FROM key_redemptions WHERE date(redeemed_at) = date('now') GROUP BY access_key HAVING COUNT(*) > 5;`
  - Revoke: `UPDATE access_grants SET revoked_at = CURRENT_TIMESTAMP WHERE access_key = '...';`
  - Deliberately **not deleting rows** on revocation — deletion loses the audit trail and orphans the `key_redemptions` log that justified the decision.
- Known limitation, accepted deliberately: this does not prevent a shared key from being used by multiple people concurrently (no DRM). Matches itch.io's own model — hard concurrency limits create false-positive lockouts for legitimate buyers switching devices, which isn't worth it at this scale. Redemption logging + manual revocation is the chosen mitigation instead of automated blocking.
- **Action item**: `about.html` currently states "full games require a Google account to log in" — update this copy to describe the email+key model once this ships.

---

## Phase 3: Payments

**Decision: Stripe Checkout + a thin Worker layer** (not Gumroad) — plugs directly into the `access_grants` table from Phase 2, keeps fees near 2.9%+30¢ instead of ~10%, and keeps ownership of the customer relationship.

- `/api/create-checkout-session` — creates a Stripe Checkout session for the game's price. Stripe hosts the actual card form (never build raw card handling — PCI compliance).
- `/api/stripe-webhook` — verifies Stripe's webhook signature (critical: otherwise anyone could POST a fake "payment succeeded" event), then inserts a row into `access_grants` (`granted_via: 'purchase'`) and triggers a delivery email via **Resend** with the access key, reusing the Phase 2 redemption flow.
- The webhook, not the browser redirect back to the site, is the source of truth for "payment succeeded" — redirects can fail even when payment went through.
- **Tax decision: enable Stripe Tax's monitoring only, not active collection, at launch.** Monitoring is free and tracks sales per jurisdiction, alerting when a registration threshold is likely crossed (e.g. EU VAT's near-zero threshold for non-EU sellers, or a US state's economic nexus threshold). It does not calculate, collect, register, file, or remit tax on its own. Only once a jurisdiction is flagged should registration happen there, followed by turning on active collection for that specific jurisdiction. Stripe never escrows collected tax — it flows into the normal Stripe balance/payout along with revenue and must be manually set aside for filing.

---

## Concrete file/directory additions (cumulative across phases)

```
wrangler.jsonc                # add "main", d1_databases binding, (later) r2_buckets binding
package.json                  # new — wrangler + migration scripts
src/worker.js                 # fetch handler: routes /api/*, falls through to env.ASSETS.fetch()
src/routes/subscribe.js       # Phase 1
src/routes/unsubscribe.js     # Phase 1
src/routes/redeem.js          # Phase 2
src/routes/checkout.js        # Phase 3
src/routes/stripe-webhook.js  # Phase 3
migrations/0001_create_subscribers.sql
migrations/0002_create_access_grants.sql
migrations/0003_create_key_redemptions.sql
shared/signup-form.js         # included via <script> on game end-screens / mailing-list.html
shared/signup-form.css
mailing-list.html             # standalone landing page for Reddit/streamer/ad links
.dev.vars.example             # TURNSTILE_SECRET_KEY, STRIPE_SECRET_KEY, RESEND_API_KEY, etc.
```

Each game folder (`corrmail/`, `spellbolt/`, etc.) references `shared/signup-form.js` from its own end-screen rather than duplicating form markup.

## Critical files to touch
- `wrangler.jsonc` — add `main` + D1 binding
- `about.html` — update the "Google account" copy in Phase 2
- `free-games.html`, `full-games.html` — link `mailing-list.html` / signup CTA
- `_template/index.html` — reference for wiring `shared/signup-form.js` into future games consistently

## Verification
- **Phase 1**: deploy with `wrangler deploy`, submit the form from a real browser, confirm a row lands in D1 (`wrangler d1 execute game-experiments --command "select * from subscribers"`), confirm Turnstile blocks a scripted POST without a token, confirm the unsubscribe link flips the row.
- **Phase 2**: manually insert a test `access_grants` row, hit `/api/redeem` with the key, confirm the signed cookie is set and gates the target game's assets; confirm an invalid/reused key is rejected; confirm redemption count query and revoke query both work as expected.
- **Phase 3**: use Stripe's test-mode keys and card numbers to complete a full Checkout session against a local `wrangler dev` tunnel, confirm the webhook fires and creates the correct `access_grants` row, confirm the receipt/delivery email sends via Resend's sandbox.
