/**
 * Cloudflare Worker: the hosted version of the assistant endpoint, for the public (GitHub Pages) demo.
 * The API key lives here as a Worker secret, never in the website.
 *
 * Deploy (once):  npx wrangler deploy server/worker.js --name mathnasium-assistant --compatibility-date 2025-01-01
 * Add the key:    npx wrangler secret put GEMINI_API_KEY --name mathnasium-assistant     (or NVIDIA_API_KEY)
 * Then build the site with  VITE_ASSISTANT_URL=https://mathnasium-assistant.<you>.workers.dev
 *
 * ALLOWED_ORIGIN (optional var) limits which website may call it, e.g. https://<user>.github.io
 */
import { askModel, configured } from './assistantCore.mjs';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN ? env.ALLOWED_ORIGIN.split(',').map((s) => s.trim()) : null;
    const cors = {
      'Access-Control-Allow-Origin': allowed ? (allowed.includes(origin) ? origin : allowed[0]) : '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (allowed && origin && !allowed.includes(origin)) return json({ ok: false, reason: 'origin' }, 403);
    if (request.method === 'GET') return json({ ok: !!configured(env), ...(configured(env) || {}) });
    if (request.method !== 'POST') return json({ ok: false }, 405);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, reason: 'bad_json' }, 400);
    }
    return json(await askModel(env, body));
  },
};
