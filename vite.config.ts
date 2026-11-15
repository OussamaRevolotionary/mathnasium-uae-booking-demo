import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// @ts-expect-error plain JS module shared with the Cloudflare Worker
import { askModel, configured } from './server/assistantCore.mjs';

/**
 * Local assistant endpoint: /api/assistant on the dev and preview servers.
 * Reads GEMINI_API_KEY or NVIDIA_API_KEY from .env.local (git-ignored), so the key stays on this computer.
 */
function assistantApi(env: Record<string, string>): Plugin {
  const handler = (req: any, res: any) => {
    const send = (body: unknown, status = 200) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    if (req.method === 'GET') return send({ ok: !!configured(env), ...(configured(env) || {}) });
    if (req.method !== 'POST') return send({ ok: false }, 405);
    let raw = '';
    req.on('data', (c: Buffer) => (raw += c));
    req.on('end', async () => {
      try {
        send(await askModel(env, JSON.parse(raw || '{}')));
      } catch {
        send({ ok: false, reason: 'bad_json' }, 400);
      }
    });
  };
  return {
    name: 'assistant-api',
    configureServer: (server) => void server.middlewares.use('/api/assistant', handler),
    configurePreviewServer: (server) => void server.middlewares.use('/api/assistant', handler),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // GitHub Pages serves the site from /<repo>/ — set PAGES_REPO=<repo> when building for it.
    base: process.env.PAGES_REPO ? `/${process.env.PAGES_REPO}/` : '/',
    plugins: [react(), tailwindcss(), assistantApi(env)],
    server: { port: 5173, host: true },
  };
});
