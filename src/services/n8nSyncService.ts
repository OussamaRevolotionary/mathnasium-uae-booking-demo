/**
 * Google Calendar & WhatsApp sync — sent through an n8n webhook.
 * Staff-only concern: parents never see this.
 *
 * LIVE      → real JSON POST to the n8n Webhook URL (retries as opaque no-cors if CORS blocks
 *             the response, so the event still arrives).
 * SIMULATED → nothing leaves the browser; used when no URL is set so the demo never fails.
 */
import type { SyncConfig, SyncLogEntry, SyncPayload } from '../types/domain.ts';

export const DEFAULT_SYNC_CONFIG: SyncConfig = { webhookUrl: '', mode: 'SIMULATED' };

export function isValidWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function newEventId() {
  return `EVT_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

export function pendingEntry(payload: SyncPayload, config: SyncConfig): SyncLogEntry {
  const live = config.mode === 'LIVE' && isValidWebhookUrl(config.webhookUrl);
  return { id: payload.eventId, payload, status: 'PENDING', mode: live ? 'LIVE' : 'SIMULATED', targetUrl: live ? config.webhookUrl : null };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Never throws. */
export async function dispatch(entry: SyncLogEntry, timeoutMs = 8000): Promise<SyncLogEntry> {
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);
  if (entry.mode === 'SIMULATED' || !entry.targetUrl) {
    await sleep(300 + Math.random() * 400);
    return { ...entry, status: 'SIMULATED', httpStatus: 200, latencyMs: ms() };
  }
  const body = JSON.stringify(entry.payload);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(entry.targetUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok
      ? { ...entry, status: 'DELIVERED', httpStatus: res.status, latencyMs: ms() }
      : { ...entry, status: 'FAILED', httpStatus: res.status, latencyMs: ms(), error: `n8n answered HTTP ${res.status} — is the workflow active?` };
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') return { ...entry, status: 'FAILED', latencyMs: ms(), error: `No answer after ${timeoutMs / 1000}s` };
    try {
      await fetch(entry.targetUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body });
      return { ...entry, status: 'DELIVERED_OPAQUE', latencyMs: ms(), error: 'Sent, but the browser could not read n8n’s reply (CORS). Allow this site in the Webhook node’s “Allowed Origins”.' };
    } catch (err2) {
      return { ...entry, status: 'FAILED', latencyMs: ms(), error: (err2 as Error).message || 'Network error' };
    }
  }
}
