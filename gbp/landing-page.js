'use strict';

// ── Landing page signals (GBP SOP 2.4) ───────────────────────────────────────
// Fetches the site's homepage (redirects followed, utm parameters stripped) and marks
// the eight signals pass or fail against the final URL's HTML. Parsing is code only.
// fetchHtml(url) → { finalUrl, html } is injectable, so the fixture never fetches.

const SIGNALS = [
  ['title', 'Title contains the primary category and the town'],
  ['h1', 'H1 contains the primary category and the town'],
  ['map', 'A Google Maps iframe'],
  ['h2_secondary', 'An H2 or H3 names a secondary category'],
  ['reviews', 'A review widget (Trustindex, or a div or script naming Google reviews)'],
  ['address', 'The NAP address on the page'],
  ['phone', 'The NAP phone on the page'],
  ['jsonld', 'JSON-LD LocalBusiness with the NAP name and phone'],
];

const decode = s => String(s || '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(n));
const textOf = html => decode(String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const lc = s => String(s || '').toLowerCase();
const has = (hay, needle) => !!needle && lc(hay).includes(lc(needle));
const phoneDigits = s => { let d = String(s || '').replace(/\(0\)/g, '').replace(/[^\d+]/g, ''); if (d.startsWith('+44')) d = '0' + d.slice(3); else if (d.startsWith('0044')) d = '0' + d.slice(4); else if (d.startsWith('44') && d.length === 12) d = '0' + d.slice(2); return d.replace(/\D/g, ''); };
const normName = s => lc(s).replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const normAddress = s => lc(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

function stripUtm(url) {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (/^utm_/i.test(k) || k === 'gclid' || k === 'fbclid') u.searchParams.delete(k);
    return u.toString();
  } catch (_) { return url; }
}

async function fetchHtml(url, { fetchFn = global.fetch } = {}) {
  const res = await fetchFn(url, { redirect: 'follow', headers: { 'User-Agent': 'Copybot landing page check', Accept: 'text/html' } });
  const html = await res.text();
  if (!res.ok) throw Object.assign(new Error(`The site answered HTTP ${res.status} at ${res.url || url}.`), { status: 502 });
  return { finalUrl: res.url || url, html };
}

// Every phone number written in the page, as digits, the way the phone check compares
function pagePhones(html) {
  const text = textOf(html) + ' ' + [...String(html || '').matchAll(/href="tel:([^"]+)"/gi)].map(m => m[1]).join(' ');
  return new Set([...text.matchAll(/(?:\+44|0)[\d\s().-]{8,16}\d/g)].map(m => phoneDigits(m[0])).filter(d => d.length >= 10));
}

function jsonLdBlocks(html) {
  const out = [];
  for (const m of String(html || '').matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { out.push(JSON.parse(m[1].trim())); } catch (_) { /* a broken block is no block */ }
  }
  const flat = [];
  const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { flat.push(v); if (v['@graph']) walk(v['@graph']); } };
  out.forEach(walk);
  return flat;
}

const LOCAL_BUSINESS_TYPES = /LocalBusiness|HomeAndConstructionBusiness|GeneralContractor|Plumber|Electrician|RoofingContractor|HVACBusiness|Locksmith|HousePainter|MovingCompany|ProfessionalService|Organization/i;

// { url, primary, town, secondaries, nap: { name, phone, address }, hiddenAddress }
async function checkLandingPage({ url, primary, town, secondaries = [], nap = {}, hiddenAddress = false, fetchHtmlFn = fetchHtml, now = new Date() }) {
  if (!url) throw Object.assign(new Error('No site URL is saved for this client.'), { status: 400 });
  const target = stripUtm(url);
  const { finalUrl, html } = await fetchHtmlFn(target);
  const title = decode(((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim());
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => textOf(m[1]));
  const h23 = [...html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)].map(m => textOf(m[1]));
  const iframes = [...html.matchAll(/<iframe[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]);
  const text = textOf(html);
  const phones = pagePhones(html);
  const napDigits = phoneDigits(nap.phone);
  const ld = jsonLdBlocks(html);
  const biz = ld.filter(b => LOCAL_BUSINESS_TYPES.test(String(b['@type'])));
  const bizMatch = biz.find(b => normName(b.name) === normName(nap.name) && (!napDigits || phoneDigits(b.telephone) === napDigits));

  const addrNorm = normAddress(nap.address);
  const addrLine = addrNorm ? addrNorm.split(' ').slice(0, 4).join(' ') : '';   // the first line is enough: "12 high street hedge"
  const results = {
    title: { pass: has(title, primary) && has(title, town), found: title || '(no title)' },
    h1: { pass: h1s.some(h => has(h, primary) && has(h, town)), found: h1s.length ? h1s.join(' | ') : '(no H1)' },
    map: { pass: iframes.some(s => /google\.com\/maps|maps\.google\.|google\.[a-z.]+\/maps/i.test(s)), found: iframes.filter(s => /maps/i.test(s)).join(' | ') || `(no map iframe; ${iframes.length} iframe${iframes.length === 1 ? '' : 's'})` },
    h2_secondary: { pass: h23.some(h => secondaries.some(c => has(h, c))), found: h23.filter(h => secondaries.some(c => has(h, c))).join(' | ') || (h23.length ? `(none of ${h23.length} headings name a secondary category)` : '(no H2 or H3)') },
    reviews: { pass: /trustindex/i.test(html) || /<(div|section|script|iframe)[^>]*(google[\s_-]*reviews?|reviews?[\s_-]*widget|elfsight|reviewsio|trustpilot)/i.test(html) || /google reviews?/i.test(text), found: /trustindex/i.test(html) ? 'Trustindex' : (/google reviews?/i.test(text) ? '"Google reviews" on the page' : '(no review widget found)') },
    address: hiddenAddress ? { pass: true, found: '(hidden address client: none expected)' } : { pass: !!addrLine && normAddress(text).includes(addrLine), found: addrLine ? (normAddress(text).includes(addrLine) ? nap.address : `"${nap.address}" not found`) : '(no NAP address saved)' },
    phone: { pass: !!napDigits && phones.has(napDigits), found: napDigits ? (phones.has(napDigits) ? nap.phone : `${nap.phone} not found; page has ${[...phones].join(', ') || 'no phone'}`) : '(no NAP phone saved)' },
    jsonld: { pass: !!bizMatch, found: bizMatch ? `${bizMatch['@type']}: ${bizMatch.name}` : (biz.length ? `${biz.map(b => b['@type']).join(', ')} found, name or phone differ` : '(no LocalBusiness JSON-LD)') },
  };
  const signals = SIGNALS.map(([key, label]) => ({ key, label, pass: !!results[key].pass, found: results[key].found }));
  const fails = signals.filter(s => !s.pass).map(s => s.label);
  return { at: now.toISOString(), url: target, final_url: finalUrl, signals, fails, passed: signals.length - fails.length, of: signals.length };
}

module.exports = { checkLandingPage, fetchHtml, stripUtm, pagePhones, jsonLdBlocks, textOf, SIGNALS };
