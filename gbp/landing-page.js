'use strict';

// ── Landing page signals (GBP SOP 2.4) ───────────────────────────────────────
// Fetches the site's homepage (redirects followed, utm parameters stripped) and marks
// the eight signals pass or fail against the final URL's HTML. Parsing is code only.
// fetchHtml(url) → { finalUrl, html } is injectable, so the fixture never fetches.

const SIGNALS = [
  ['title', 'Title contains the primary category and the town'],
  ['h1', 'H1 contains the primary category and the town'],
  ['map', "A Google Maps iframe of the client's listing (its place id, or within 1 km of the address or main town)"],
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

// ── The map signal (Brandon, 23 Oct): a Google Maps iframe passes only when its src
// carries the client's place id, or coordinates within 1 km of the client's address or
// main town. A placeholder map fails with "map embed is not the client's listing". ──
const MAP_SRC_RE = /google\.com\/maps|maps\.google\.|google\.[a-z.]+\/maps/i;
function mapCoords(src) {
  const s = decode(String(src || ''));
  let m;
  // Embed "pb" format: !2d<lng>!3d<lat>
  if ((m = s.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/))) return { lat: parseFloat(m[2]), lng: parseFloat(m[1]) };
  // q=, ll=, center=, sll= as "lat,lng"
  if ((m = s.match(/[?&](?:q|ll|center|sll)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i))) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  // /@lat,lng,zoom in a maps URL
  if ((m = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),/))) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
}
function kmBetween(a, b) {
  const r = 6371, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}
// client: { placeId, location: { lat, lng, from } }
function mapSignal(iframes, client = {}) {
  const maps = iframes.filter(s => MAP_SRC_RE.test(s));
  if (!maps.length) return { pass: false, found: `(no map iframe; ${iframes.length} iframe${iframes.length === 1 ? '' : 's'})` };
  for (const src of maps) {
    if (client.placeId && decode(src).includes(client.placeId)) return { pass: true, found: `map embed carries the client's place id (${client.placeId})` };
    const coords = mapCoords(src);
    if (coords && client.location) {
      const km = kmBetween(coords, client.location);
      if (km <= 1) return { pass: true, found: `map embed at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}, ${km.toFixed(2)} km from ${client.location.from || 'the client'}` };
      return { pass: false, found: `map embed is not the client's listing: ${km.toFixed(1)} km from ${client.location.from || 'the client'} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` };
    }
  }
  const why = client.location || client.placeId ? 'no place id or coordinates in the src' : "the client's location is unknown (no place id, address or town resolved)";
  return { pass: false, found: `map embed is not the client's listing: ${why} (${maps[0].slice(0, 90)})` };
}

// { url, primary, town, secondaries, nap: { name, phone, address }, hiddenAddress, client: { placeId, location } }
async function checkLandingPage({ url, primary, town, secondaries = [], nap = {}, hiddenAddress = false, client = {}, fetchHtmlFn = fetchHtml, now = new Date() }) {
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
    map: mapSignal(iframes, client),
    h2_secondary: { pass: h23.some(h => secondaries.some(c => has(h, c))), found: h23.filter(h => secondaries.some(c => has(h, c))).join(' | ') || (h23.length ? `(none of ${h23.length} headings name a secondary category)` : '(no H2 or H3)') },
    reviews: { pass: /trustindex/i.test(html) || /<(div|section|script|iframe)[^>]*(google[\s_-]*reviews?|reviews?[\s_-]*widget|elfsight|reviewsio|trustpilot)/i.test(html) || /google reviews?/i.test(text), found: /trustindex/i.test(html) ? 'Trustindex' : (/google reviews?/i.test(text) ? '"Google reviews" on the page' : '(no review widget found)') },
    address: hiddenAddress ? { pass: true, found: '(hidden address client: none expected)' } : { pass: !!addrLine && normAddress(text).includes(addrLine), found: addrLine ? (normAddress(text).includes(addrLine) ? nap.address : `"${nap.address}" not found`) : '(no NAP address saved)' },
    phone: { pass: !!napDigits && phones.has(napDigits), found: napDigits ? (phones.has(napDigits) ? nap.phone : `${nap.phone} not found; page has ${[...phones].join(', ') || 'no phone'}`) : '(no NAP phone saved)' },
    jsonld: { pass: !!bizMatch, found: bizMatch ? `${bizMatch['@type']}: ${bizMatch.name}` : (biz.length ? `${biz.map(b => b['@type']).join(', ')} found, name or phone differ` : '(no LocalBusiness JSON-LD)') },
  };
  const signals = SIGNALS.map(([key, label]) => ({ key, label, pass: !!results[key].pass, found: results[key].found }));
  const fails = signals.filter(s => !s.pass).map(s => s.label);
  return { at: now.toISOString(), url: target, final_url: finalUrl, signals, fails, passed: signals.length - fails.length, of: signals.length, client_location: client.location || null };
}

module.exports = { checkLandingPage, fetchHtml, stripUtm, pagePhones, jsonLdBlocks, textOf, mapCoords, mapSignal, kmBetween, SIGNALS };
