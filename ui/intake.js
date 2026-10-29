'use strict';

// ── Add client wizard (27 Oct 2026): reading a website, finding the Google profile, merging
// the details, creating the client ───────────────────────────────────────────────────
//   POST /api/intake/read-website   { url }            → what the site says: name, location, phone, email, logo, socials, towns, services
//   GET  /api/intake/places?q=      text search through gbp/places.js (the key from the environment)
//   POST /api/intake/place-link     { link }           → the place behind a pasted Maps link (its name, searched)
//   POST /api/intake/merge          { website, place, email, phone } → the identity with a source per field, and any Fillout client it matches
//   POST /api/intake/create         { identity, sources, matchedClientId } → the client (new, or the matched one updated), its client values, the Fillout link
// The website read is one fetch of the page plus one model call (through anthropic-call.js),
// no new integration. Nothing here changes the pipeline: the client values it seeds are the
// same JSON the Record tab edits, with _sources on each value.

const { allocate } = require('../fillout/allocation');
const N = require('../fillout/niches');

const UK_PHONE = /(?:\+44\s?7\d{3}|\(?0\d{2,4}\)?)\s?\d{3,4}\s?\d{3,4}/g;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/g;
const SOCIAL = /https?:\/\/(?:www\.)?(facebook|instagram|x|twitter|linkedin|youtube|tiktok)\.com\/[^\s"'<>]+/gi;

const normPhone = p => String(p || '').replace(/[^\d+]/g, '').replace(/^\+44/, '0').replace(/^0044/, '0');
const normEmail = e => String(e || '').trim().toLowerCase();
const str = v => (v == null ? '' : String(v)).trim();

function stripHtml(html) {
  return String(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h\d>|<\/tr>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

// What a page says, with no model: the quick facts
function scrape(html, url) {
  const text = stripHtml(html);
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].replace(/\s+/g, ' ').trim();
  const meta = name => { const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`, 'i')); return m ? m[1].trim() : ''; };
  const phones = [...new Set((text.match(UK_PHONE) || []).map(p => p.replace(/\s+/g, ' ').trim()))].slice(0, 5);
  const emails = [...new Set((html.match(EMAIL) || []).map(normEmail))].filter(e => !/\.(png|jpg|svg|gif)$/.test(e)).slice(0, 5);
  const postcodes = [...new Set(text.match(POSTCODE) || [])].slice(0, 5);
  const socials = [...new Set((html.match(SOCIAL) || []).map(s => s.replace(/[),.]+$/, '')))].slice(0, 8);
  const abs = u => { try { return new URL(u, url).href; } catch (_) { return ''; } };
  const og = meta('og:image');
  const logoImg = (html.match(/<img[^>]+(?:src|data-src)=["']([^"']*logo[^"']*)["']/i) || [])[1];
  const icon = (html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i) || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i) || [])[1];
  const logo = abs(logoImg || og || icon || '');
  return { title, description: meta('description') || meta('og:description'), siteName: meta('og:site_name'), phones, emails, postcodes, socials, logo, text: text.slice(0, 12000) };
}

async function fetchPage(url, { fetchFn = global.fetch, timeoutMs = 15000 } = {}) {
  let u = str(url); if (!u) throw Object.assign(new Error('A website address is needed.'), { status: 400 });
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetchFn(u, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Copybot/1.0; +https://locallaunchpad.co.uk)', Accept: 'text/html,*/*' } });
    if (!r.ok) throw Object.assign(new Error(`The site answered ${r.status}.`), { status: 502 });
    const html = (await r.text()).slice(0, 2_000_000);
    return { url: r.url || u, html };
  } catch (e) {
    if (e.name === 'AbortError') throw Object.assign(new Error('The site took more than 15 seconds to answer.'), { status: 504 });
    throw e.status ? e : Object.assign(new Error(`The site could not be read: ${e.message}`), { status: 502 });
  } finally { clearTimeout(t); }
}

const EXTRACT_SYSTEM = `You read a UK tradesperson's website and return what it says about the business, as JSON only. Never invent: a field the page does not state is "". Keys:
name (the trading name as written), town (the main town or city the business is based in), area (the area it says it covers, in its words), phone (one number, as written), email, address (one line, if given), primary_category (the trade in Google Business Profile words, e.g. "Landscaper", "Roofing contractor"), services (an array of the services it names, each short), towns (an array of towns it names as served), socials (an array of social profile URLs), logo (the logo image URL if one is obvious), years (years trading or year founded, if stated), owner (the owner's first name if named).`;

async function readWebsite({ url, callModel = null, fetchFn = global.fetch }) {
  const page = await fetchPage(url, { fetchFn });
  const s = scrape(page.html, page.url);
  let model = null, modelError = null;
  if (callModel) {
    try {
      const message = `URL: ${page.url}\nTitle: ${s.title}\nDescription: ${s.description}\nPhones found: ${s.phones.join(', ') || 'none'}\nEmails found: ${s.emails.join(', ') || 'none'}\nPostcodes found: ${s.postcodes.join(', ') || 'none'}\nSocial links: ${s.socials.join(', ') || 'none'}\n\nPAGE TEXT:\n${s.text}`;
      const { text } = await callModel({ system: EXTRACT_SYSTEM, message, maxTokens: 1500, effort: 'low' });
      const raw = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      model = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    } catch (e) { modelError = e.message; }
  }
  const m = model || {};
  const out = {
    url: page.url, name: str(m.name) || s.siteName || s.title.split(/[|–-]/)[0].trim(), town: str(m.town), area: str(m.area), phone: str(m.phone) || s.phones[0] || '', email: normEmail(m.email) || s.emails[0] || '',
    address: str(m.address), primary_category: str(m.primary_category), services: Array.isArray(m.services) ? m.services.map(str).filter(Boolean).slice(0, 40) : [], towns: Array.isArray(m.towns) ? m.towns.map(str).filter(Boolean).slice(0, 40) : [],
    socials: [...new Set([...(Array.isArray(m.socials) ? m.socials.map(str) : []), ...s.socials])].filter(Boolean), logo: str(m.logo) || s.logo, years: str(m.years), owner: str(m.owner),
    found: { phones: s.phones, emails: s.emails, postcodes: s.postcodes, title: s.title }, modelError,
  };
  return out;
}

// The place behind a Google Maps link: a place id when the link carries one, else the name part searched
function placeFromLink(link) {
  const l = str(link);
  const pid = l.match(/(?:place_id|placeid)[=:]([A-Za-z0-9_-]{10,})/) || l.match(/!1s(ChIJ[A-Za-z0-9_-]+)/);
  if (pid) return { placeId: pid[1], query: null };
  const name = l.match(/\/maps\/place\/([^/@?]+)/);
  if (name) return { placeId: null, query: decodeURIComponent(name[1].replace(/\+/g, ' ')) };
  const q = l.match(/[?&]q=([^&]+)/);
  if (q) return { placeId: null, query: decodeURIComponent(q[1].replace(/\+/g, ' ')) };
  throw Object.assign(new Error('That does not look like a Google Maps link to a place.'), { status: 400 });
}

// Merge what the website, the Google profile and any Fillout record say: one value per field with its source
async function mergeIdentity({ pool, website = null, place = null, email = '', phone = '' }) {
  const pick = (...cands) => { for (const [src, v] of cands) { if (str(v)) return { value: str(v), source: src }; } return { value: '', source: '' }; };
  const W = website || {}, P = place || {};
  const id = {
    name: pick(['gbp', P.name], ['website', W.name]),
    address: pick(['gbp', P.address], ['website', W.address]),
    phone: pick(['gbp', P.phone], ['website', W.phone], ['hand', phone]),
    email: (() => { const e = pick(['hand', email], ['website', W.email]); return { value: normEmail(e.value), source: e.source }; })(),
    website: pick(['hand', W.url], ['gbp', P.website]),
    town: pick(['gbp', P.town], ['website', W.town]),
    primary_category: pick(['gbp', P.primary_type_label || P.primary_type], ['website', W.primary_category]),
    gbp_place_id: pick(['gbp', P.place_id]),
    rating: pick(['gbp', P.rating]), review_count: pick(['gbp', P.review_count]),
    hours: pick(['gbp', Array.isArray(P.hours) ? P.hours.join('; ') : P.hours]),
    logo: pick(['website', W.logo]), socials: (W.socials || []), services: W.services || [], towns: W.towns || [], area: pick(['website', W.area]), owner: pick(['website', W.owner]), years: pick(['website', W.years]),
    gbp_address_type: { value: P.place_id ? (P.service_area ? 'service_area' : 'storefront') : '', source: P.place_id ? 'gbp' : '' },
  };
  // A Fillout client with the same email or phone: merge into it, never a second client
  let matched = null;
  if (pool) {
    const e = normEmail(id.email.value), p = normPhone(id.phone.value);
    const { rows } = await pool.query(`SELECT c.id, c.name, c.niche_key, c.archived_at, s.business_email_norm FROM clients c LEFT JOIN fillout_submissions s ON s.client_id = c.id WHERE c.archived_at IS NULL`);
    const phones = await pool.query(`SELECT client_id, value FROM client_fields WHERE field_key = 'business_phone' AND status = 'filled'`).then(r => r.rows).catch(() => []);
    const byPhone = new Map(phones.map(r => [r.client_id, normPhone(typeof r.value === 'string' ? r.value : JSON.stringify(r.value))]));
    for (const c of rows) {
      if ((e && c.business_email_norm && c.business_email_norm === e) || (p && p.length >= 10 && byPhone.get(c.id) === p)) { matched = { id: c.id, name: c.name, niche_key: c.niche_key, by: e && c.business_email_norm === e ? 'email' : 'phone' }; break; }
    }
  }
  const nicheKey = id.primary_category.value ? N.suggestedNicheKey ? N.suggestedNicheKey(id.primary_category.value) : null : null;
  return { identity: id, matched, niche_key: (matched && matched.niche_key) || nicheKey || null, niches: N.allNiches().map(n => ({ key: n.key, label: n.label })) };
}

async function createClient({ pool, identity, sources = {}, nicheKey, businessType = 'A', existingSite = true, multiLocation = false, matchedClientId = null, filloutFormUrl = '' }) {
  const name = str(identity.name); if (!name) throw Object.assign(new Error('A business name is needed.'), { status: 400 });
  if (!nicheKey || !N.nicheByKey(nicheKey)) throw Object.assign(new Error('Pick the niche.'), { status: 400 });
  let clientId = matchedClientId;
  if (clientId) {
    const { rows } = await pool.query(`UPDATE clients SET name = $2 WHERE id = $1 RETURNING id`, [clientId, name]);
    if (!rows.length) throw Object.assign(new Error('The matched client no longer exists.'), { status: 404 });
  } else {
    const { rows } = await pool.query(`INSERT INTO clients (name, trade, source) VALUES ($1, $2, 'wizard') RETURNING id`, [name, N.nicheLabel(nicheKey)]);
    clientId = rows[0].id;
  }
  await allocate(pool, clientId, { nicheKey, signedOn: new Date().toISOString().slice(0, 10), source: 'confirmed' });
  // The client values: the identity seeded with a source per value; blanks never overwrite a value already there
  const { rows: cvRows } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
  const cv = cvRows.length ? JSON.parse(cvRows[0].content) : {};
  const srcMap = { ...(cv._sources || {}) };
  const set = (k, v, s) => { if (str(v) && !str(cv[k])) { cv[k] = str(v); srcMap[k] = s || sources[k] || 'hand'; } };
  set('company_name', identity.name, sources.name); set('phone', identity.phone, sources.phone); set('email', identity.email, sources.email); set('address', identity.address, sources.address);
  set('primary_category', identity.primary_category, sources.primary_category); set('gbp_place_id', identity.gbp_place_id, 'gbp'); set('gbp_address_type', identity.gbp_address_type, 'gbp');
  set('rating', identity.rating, 'gbp'); set('review_count', identity.review_count, 'gbp'); set('hours', identity.hours, 'gbp'); set('owner_name', identity.owner, 'website'); set('year_founded', /^\d{4}$/.test(str(identity.years)) ? identity.years : '', 'website');
  set('area_wide', identity.area, 'website');
  if (!str(cv.business_type) || cv.business_type === 'A') { cv.business_type = str(businessType) || 'A'; srcMap.business_type = 'hand'; }
  cv._sources = srcMap;
  cv._intake = { website: identity.website || '', existing_site: !!existingSite, multi_location: !!multiLocation, logo: identity.logo || '', socials: identity.socials || [], services_seen: identity.services || [], towns_seen: identity.towns || [], at: new Date().toISOString() };
  if (cvRows.length) await pool.query(`UPDATE client_assets SET content = $1, uploaded_at = NOW() WHERE id = $2`, [JSON.stringify(cv), cvRows[0].id]);
  else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'client_values.json', $2)`, [clientId, JSON.stringify(cv)]);
  const link = filloutFormUrl ? `${filloutFormUrl}${filloutFormUrl.includes('?') ? '&' : '?'}email=${encodeURIComponent(str(identity.email))}` : '';
  return { id: clientId, merged: !!matchedClientId, fillout_link: link, niche_label: N.nicheLabel(nicheKey) };
}

function mountIntakeApi(app, { pool, callModel = null, placesSearch = null, placeDetails = null, fetchFn = global.fetch, filloutFormUrl = () => process.env.FILLOUT_FORM_URL || '' }) {
  const wrap = fn => async (req, res) => { try { res.json(await fn(req)); } catch (err) { res.status(err.status || 500).json({ error: err.message }); } };
  app.post('/api/intake/read-website', wrap(req => readWebsite({ url: (req.body || {}).url, callModel, fetchFn })));
  app.get('/api/intake/places', wrap(async req => {
    if (!placesSearch) throw Object.assign(new Error('Google Places is not configured on the server (GOOGLE_PLACES_API_KEY).'), { status: 503 });
    const q = str(req.query.q); if (!q) throw Object.assign(new Error('Type the business name and town.'), { status: 400 });
    return { places: await placesSearch(q) };
  }));
  app.post('/api/intake/place-link', wrap(async req => {
    const { placeId, query } = placeFromLink((req.body || {}).link);
    if (placeId && placeDetails) return { places: [await placeDetails(placeId)].filter(Boolean) };
    if (!placesSearch) throw Object.assign(new Error('Google Places is not configured on the server.'), { status: 503 });
    return { places: await placesSearch(query || placeId) };
  }));
  app.post('/api/intake/merge', wrap(req => { if (!pool) throw Object.assign(new Error('Database not configured.'), { status: 503 }); const b = req.body || {}; return mergeIdentity({ pool, website: b.website, place: b.place, email: b.email, phone: b.phone }); }));
  app.post('/api/intake/create', wrap(req => { if (!pool) throw Object.assign(new Error('Database not configured.'), { status: 503 }); const b = req.body || {}; return createClient({ pool, identity: b.identity || {}, sources: b.sources || {}, nicheKey: b.niche_key, businessType: b.business_type, existingSite: b.existing_site !== false, multiLocation: !!b.multi_location, matchedClientId: b.matched_client_id || null, filloutFormUrl: filloutFormUrl() }); }));
}

module.exports = { mountIntakeApi, readWebsite, scrape, placeFromLink, mergeIdentity, createClient, normPhone, normEmail };
