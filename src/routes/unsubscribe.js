// POST /api/unsubscribe  — token in a JSON body (from unsubscribe.html) or in
// ?token= (one-click unsubscribe from mail clients, RFC 8058).
// Always answers { ok: true } so tokens can't be probed.

import { json } from '../http.js';

export async function unsubscribe(request, env) {
  let token = new URL(request.url).searchParams.get('token');
  if (!token && request.headers.get('Content-Type')?.includes('application/json')) {
    try {
      token = (await request.json()).token;
    } catch {
      // fall through with no token
    }
  }
  if (typeof token === 'string' && token) {
    await env.DB.prepare(
      'UPDATE subscribers SET unsubscribed_at = CURRENT_TIMESTAMP WHERE unsub_token = ?1 AND unsubscribed_at IS NULL',
    )
      .bind(token)
      .run();
  }
  return json({ ok: true });
}
