/**
 * Sandbox by default: anonymous visitors never trigger external calls (n8n, AI).
 * Add ?live=1 to the URL to enable them.
 */
export const LIVE: boolean = (() => {
  try {
    return new URLSearchParams(window.location.search).get('live') === '1';
  } catch {
    return false;
  }
})();
