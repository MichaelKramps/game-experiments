// The site's Worker. Static files are served first; only requests that match
// no file (like /api/*) reach this script. See WEBSITE_INFRA_PLAN.md.

import { subscribe } from './routes/subscribe.js';
import { unsubscribe } from './routes/unsubscribe.js';
import { json } from './http.js';

const ROUTES = {
  '/api/subscribe': subscribe,
  '/api/unsubscribe': unsubscribe,
};

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const route = ROUTES[pathname];
    if (route) {
      if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
      try {
        return await route(request, env, ctx);
      } catch (err) {
        console.error(`${pathname} failed`, err);
        return json({ error: 'server_error' }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
