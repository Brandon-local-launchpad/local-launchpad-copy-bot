'use strict';

// ── Fetching politely ─────────────────────────────────────────────────────────────
// Read only: GET with no cookies, never a form, never a login. It says who it is, waits about a
// second between requests, and follows redirects by hand so every hop is on record. A redirect
// to another site is recorded and not followed. A page body is read only when it is text.

const zlib = require('zlib');

const UA = 'Copybot/1.0 (+https://locallaunchpad.co.uk; Local Launchpad site audit; read only)';
const MAX_BODY = 5 * 1024 * 1024;

const textual = ct => !ct || /text|html|xml|json/i.test(ct);

async function fetchOnce(url, { fetchImpl, timeoutMs = 20000, always = false } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-GB,en;q=0.9' }, signal: ctrl.signal });
    const contentType = (res.headers && res.headers.get('content-type')) || '';
    let text = '';
    if (always || textual(contentType)) {
      let buf = Buffer.from(await res.arrayBuffer());
      if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
      text = buf.subarray(0, MAX_BODY).toString('utf8');
    } else if (res.body && res.body.cancel) await res.body.cancel();
    return { status: res.status, location: (res.headers && res.headers.get('location')) || '', headers: res.headers, contentType, text };
  } catch (e) {
    return { status: null, error: e.name === 'AbortError' ? `no answer within ${Math.round(timeoutMs / 1000)} seconds` : (e.cause && e.cause.code) || e.message };
  } finally { clearTimeout(t); }
}

// Follows redirects within the site. ofSite(hostname) says what may be followed; wait() is called
// before every request. Returns { hops: [{ url, status }], finalUrl, status, headers, contentType,
// text, redirects, offsite, loop, error }.
async function fetchChain(start, { fetchImpl, wait = async () => {}, ofSite = () => true, maxHops = 10, timeoutMs, always = false } = {}) {
  const hops = [];
  const seen = new Set();
  let url = start;
  for (;;) {
    await wait();
    const r = await fetchOnce(url, { fetchImpl, timeoutMs, always });
    if (r.error) return { hops, finalUrl: url, status: null, error: r.error, redirects: hops.length };
    hops.push({ url, status: r.status });
    seen.add(url);
    if (r.status >= 300 && r.status < 400 && r.location) {
      let next;
      try { next = new URL(r.location, url); } catch (_) { return { hops, finalUrl: url, status: r.status, error: `a broken redirect to "${r.location}"`, redirects: hops.length }; }
      if (!ofSite(next.hostname)) return { hops, finalUrl: next.href, status: r.status, offsite: true, redirects: hops.length };
      if (seen.has(next.href)) return { hops, finalUrl: next.href, status: r.status, loop: true, redirects: hops.length };
      if (hops.length >= maxHops) return { hops, finalUrl: next.href, status: r.status, error: `more than ${maxHops} redirects`, redirects: hops.length };
      url = next.href;
      continue;
    }
    return { hops, finalUrl: url, status: r.status, headers: r.headers, contentType: r.contentType, text: r.text, redirects: hops.length - 1 };
  }
}

module.exports = { fetchOnce, fetchChain, UA };
