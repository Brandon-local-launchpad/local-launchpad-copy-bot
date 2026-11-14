'use strict';

// ── QR codes: following a link (14 Nov 2026, Brandon) ────────────────────────────────────────
// The one place the QR codes subtab calls out: a GET that follows redirects hop by hop, to see
// where a link lands and what it answers. Used by the Prepare link checks (the review funnel
// and the website must answer 200). Nothing is sent but the GET; nothing is kept from the page.
//   follow(url, { fetchImpl, maxHops, timeoutMs, allowPrivate })
//     → { status, finalUrl, hops: [{ url, status }] }, or the same with error: why it stopped
// The 10 seconds cover the whole chain. A link to this machine or a private network is never
// fetched (allowPrivate is for the tests).

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';

// localhost, a .local or .internal name, or an address on a private or link-local range
function isPrivateHost(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || /\.(localhost|local|internal)$/.test(h)) return true;
  if (h.includes(':')) return h === '::1' || /^f[cde]/.test(h) || h.startsWith('::ffff:');
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

async function follow(start, { fetchImpl = globalThis.fetch, maxHops = 10, timeoutMs = 10000, allowPrivate = false } = {}) {
  const hops = [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let url = String(start || '');
  try {
    for (;;) {
      let at;
      try { at = new URL(url); } catch (_) { return { status: null, finalUrl: url, hops, error: 'it is not a full link' }; }
      if (!/^https?:$/.test(at.protocol)) return { status: null, finalUrl: url, hops, error: 'it is not a web link' };
      if (!allowPrivate && isPrivateHost(at.hostname)) return { status: null, finalUrl: url, hops, error: 'it points at a private address' };
      let res;
      try {
        res = await fetchImpl(at.href, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'en-GB,en;q=0.9' }, signal: ctrl.signal });
      } catch (err) {
        const reason = ctrl.signal.aborted ? `no answer in ${Math.round(timeoutMs / 1000)} seconds` : (err.cause && (err.cause.code || err.cause.message)) || err.message || 'the request failed';
        return { status: null, finalUrl: at.href, hops, error: reason };
      }
      // Only the status and the Location are wanted: the page itself is not read
      try { if (res.body && res.body.cancel) await res.body.cancel(); } catch (_) { /* already closed */ }
      hops.push({ url: at.href, status: res.status });
      const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (!location) return { status: res.status, finalUrl: at.href, hops };
      if (hops.length > maxHops) return { status: res.status, finalUrl: at.href, hops, error: `more than ${maxHops} redirects` };
      try { url = new URL(location, at.href).href; } catch (_) { return { status: res.status, finalUrl: at.href, hops, error: `a broken redirect to "${location}"` }; }
    }
  } finally { clearTimeout(timer); }
}

module.exports = { follow, isPrivateHost, UA };
