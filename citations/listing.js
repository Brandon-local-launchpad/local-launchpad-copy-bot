'use strict';

// ── Reading a listing page ────────────────────────────────────────────────────────
// fetchPage(url) gets the page as a browser would ask for it (a 15 s limit, redirects
// followed); a site that refuses, needs a login or times out comes back as { ok: false,
// reason } so the scan can put the row under needs review instead of guessing.
// extractNap(html, { domain }) reads what the listing says about the business:
//   JSON-LD first (LocalBusiness, Organization and their subtypes: name, telephone, address,
//   url), else the page title and headings for the name, every phone number in the text,
//   every postcode, the locality from the JSON-LD or the postcode line, and the external
//   links that are not the directory itself or a social or share link (the website candidates).

const { jsonLdBlocks, textOf } = require('../gbp/landing-page');
const { normPhone, POSTCODE_RE } = require('./nap');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Copybot citations check';
const SOCIAL_HOSTS = /(^|\.)(facebook|instagram|twitter|x|linkedin|youtube|tiktok|pinterest|google|apple|bing|whatsapp|wa|t|goo|gstatic|googleapis|cloudflare|cloudfront|wp|gravatar)\.(com|co\.uk|me|gl|net|org)$/i;
const LOGIN_WALL = /log in to (see|continue)|sign in to continue|please log in|create an account to|enable javascript and cookies|access denied|captcha|are you a robot/i;

async function fetchPage(url, { fetchFn = global.fetch, timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { redirect: 'follow', headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-GB,en;q=0.9' }, signal: ctrl.signal });
    const html = await res.text();
    if (!res.ok) return { ok: false, status: res.status, finalUrl: res.url || url, html, reason: res.status === 403 || res.status === 429 ? `the site refused the request (HTTP ${res.status})` : res.status === 404 || res.status === 410 ? 'the page is gone (HTTP 404)' : `HTTP ${res.status}` };
    if (LOGIN_WALL.test(textOf(html).slice(0, 4000)) && html.length < 60000) return { ok: false, status: res.status, finalUrl: res.url || url, html, reason: 'the page needs a login or a browser check' };
    return { ok: true, status: res.status, finalUrl: res.url || url, html };
  } catch (e) {
    return { ok: false, status: null, finalUrl: url, html: '', reason: e.name === 'AbortError' ? `no answer within ${Math.round(timeoutMs / 1000)}s` : `could not be reached: ${e.message}` };
  } finally { clearTimeout(t); }
}

const decode = s => String(s || '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(n)).replace(/\s+/g, ' ').trim();
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return ''; } };
const isBusiness = t => /LocalBusiness|Organization|Store|Service|Contractor|Plumber|Electrician|Roofing|HVAC|Locksmith|Painter|Moving|Landscap|Garden|Clean|Pest|Florist|Dentist|Corporation/i.test(String(t || ''));

function extractNap(html, { domain = '' } = {}) {
  const out = { name: '', names: [], phones: [], postcodes: [], address: '', locality: '', websites: [], source: 'text' };
  const text = textOf(html);
  // JSON-LD
  for (const b of jsonLdBlocks(html)) {
    const types = [].concat(b['@type'] || []).join(' ');
    if (!isBusiness(types)) continue;
    if (b.name && !out.name) { out.name = decode(b.name); out.source = 'jsonld'; }
    if (b.telephone) out.phones.push(...[].concat(b.telephone).map(decode));
    const a = b.address && typeof b.address === 'object' ? b.address : null;
    if (a) {
      const parts = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode].map(v => decode(v || '')).filter(Boolean);
      if (parts.length && !out.address) out.address = parts.join(', ');
      if (a.postalCode) out.postcodes.push(decode(a.postalCode).replace(/\s+/g, '').toUpperCase());
      if (a.addressLocality && !out.locality) out.locality = decode(a.addressLocality);
    } else if (typeof b.address === 'string' && !out.address) out.address = decode(b.address);
    if (b.url) out.websites.push(decode(b.url));
    if (b.sameAs) out.websites.push(...[].concat(b.sameAs).map(decode));
  }
  // The title and headings as name candidates
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  if (title) out.names.push(decode(title.replace(/<[^>]+>/g, ' ')));
  for (const m of String(html || '').matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)) { const t = decode(m[1].replace(/<[^>]+>/g, ' ')); if (t && t.length < 120) out.names.push(t); }
  const og = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) || [])[1];
  if (og) out.names.push(decode(og));
  if (out.name) out.names.unshift(out.name);
  out.names = [...new Set(out.names.filter(Boolean))];
  // Phones from the text and tel: links
  const telText = text + ' ' + [...String(html || '').matchAll(/href=["']tel:([^"']+)["']/gi)].map(m => decodeURIComponent(m[1])).join(' ');
  // Lazy, and the number must end before a non digit, so "07850 412717. 12 High St" gives the phone alone
  for (const m of telText.matchAll(/(?:\+44\s?\(?0?\)?\s?|0)\d[\d\s().-]{7,14}?\d(?!\d)/g)) { const d = normPhone(m[0]); if (d.length >= 10 && d.length <= 11) out.phones.push(m[0].trim()); }
  out.phones = [...new Set(out.phones)];
  // Postcodes
  for (const m of text.matchAll(POSTCODE_RE)) out.postcodes.push(`${m[1]}${m[2]}`.toUpperCase());
  out.postcodes = [...new Set(out.postcodes)];
  // The locality from the line before the first postcode when JSON-LD gave none
  if (!out.locality && out.postcodes.length) { const m = text.match(new RegExp(`([A-Z][a-zA-Z' -]{2,40}?),?\\s+${out.postcodes[0].slice(0, -3)}\\s?${out.postcodes[0].slice(-3)}`)); if (m) out.locality = m[1].trim(); }
  // External links: website candidates
  for (const m of String(html || '').matchAll(/href=["'](https?:\/\/[^"'#?\s]+)[^"']*["']/gi)) {
    const h = hostOf(m[1]);
    if (!h || (domain && (h === domain || h.endsWith('.' + domain))) || SOCIAL_HOSTS.test(h) || /\.(png|jpg|jpeg|gif|svg|css|js|ico|woff2?)$/i.test(m[1])) continue;
    out.websites.push(m[1]);
  }
  out.websites = [...new Set(out.websites)];
  out.text_length = text.length;
  return out;
}

module.exports = { fetchPage, extractNap, hostOf, UA };
