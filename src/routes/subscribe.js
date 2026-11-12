// POST /api/subscribe  { email, source, token, website }
//
// Always answers { ok: true } once the request is valid, whether the address
// was new, already subscribed, or caught by the honeypot, so the form can't be
// used to find out who is on the list.

import { json, normalizeEmail } from '../http.js';
import { sendWelcome } from '../email.js';

const OK = () => json({ ok: true });

export async function subscribe(request, env, ctx) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  if (env.SUBSCRIBE_LIMITER) {
    const { success } = await env.SUBSCRIBE_LIMITER.limit({ key: ip });
    if (!success) return json({ error: 'rate_limited' }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  // Hidden field people never see; bots fill it in.
  if (body.website) return OK();

  const email = normalizeEmail(body.email);
  if (!email) return json({ error: 'invalid_email' }, 400);

  if (!(await verifyTurnstile(env, body.token, ip))) return json({ error: 'verification_failed' }, 403);

  const source = typeof body.source === 'string' ? body.source.slice(0, 200) : null;

  // New address → insert. Previously unsubscribed → subscribe again.
  // Already subscribed → no change, and RETURNING gives no row.
  const row = await env.DB.prepare(
    `INSERT INTO subscribers (email, source, unsub_token) VALUES (?1, ?2, ?3)
     ON CONFLICT(email) DO UPDATE SET unsubscribed_at = NULL, source = excluded.source
       WHERE subscribers.unsubscribed_at IS NOT NULL
     RETURNING unsub_token`,
  )
    .bind(email, source, crypto.randomUUID())
    .first();

  if (row) ctx.waitUntil(sendWelcome(env, new URL(request.url).origin, email, row.unsub_token));
  return OK();
}

async function verifyTurnstile(env, token, ip) {
  if (typeof token !== 'string' || !token) return false;
  if (!env.TURNSTILE_SECRET_KEY) {
    console.error('TURNSTILE_SECRET_KEY is not set');
    return false;
  }
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', token);
  if (ip !== 'unknown') form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const out = await res.json();
  return out.success === true;
}
