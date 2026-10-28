'use strict';

// ── Every blog input, present or reported missing in plain words (stage 1) ──
// Pure: no database, no model. The route (blog/routes.js) gathers the pieces and the
// Record tab's Blog card shows the result; the fixture (tests/fixtures/blog-data.js)
// runs it on the test clients.
//   cv         the client values
//   client     the clients row: name, launch_date, status, search_console_property
//   priceRows  client_price_rows (fillout/prices.js): service, from_gbp, up_to_gbp, typical_gbp,
//              unit, what_moves_price, quote_only, unverified, deleted, source
//   fields     the onboarding record's fields [{ key, value, status }] (owner_name_title)
//   niche      the niche entry, or null
//   rows       the v3 page map rows (service pages carry their GBP names and what they absorbed)
//   tradeFacts { verified, message } from the service gate, or null
//   dossiers   [{ locationName }]
// The price list (Brandon, 28 Oct): the per service price rows, not the price_list URL value.
// A row is usable when it has a figure, is not quote only, and its figures were traced to the
// transcript (unverified rows are shown but never written into copy). A service with a usable
// row runs its cost guide in prices mode; the rest run on factors.

const { normService } = require('../fillout/prices');
const { blocksFor } = require('./blocks');

// The service page a price row names. fillout/prices.js matchService takes the first page
// whose words all sit in the row's (so "Flat roof replacement" lands on Roof Replacement when
// that page comes first); here the best page wins: the same stems, else the page sharing the
// most stems with the row, the row's first word (its head, "flat") breaking a tie, then page order.
function bestServiceFor(service, candidates) {
  const s = normService(service).split(' ').filter(Boolean);
  if (!s.length) return null;
  const key = s.join(' ');
  for (const c of candidates) if (normService(c.value) === key) return c;
  let best = null, bestScore = 0;
  for (const c of candidates) {
    const v = normService(c.value).split(' ').filter(Boolean);
    const shorter = v.length <= s.length ? v : s, longer = shorter === v ? s : v;
    if (shorter.length < 2 || !shorter.every(w => longer.includes(w))) continue;
    const score = v.filter(w => s.includes(w)).length * 10 + (v.includes(s[0]) ? 1 : 0);
    if (score > bestScore) { best = c; bestScore = score; }
  }
  return best;
}

const str = v => (v === null || v === undefined ? '' : String(v)).trim();
const isoDate = d => { if (!d) return ''; const s = d instanceof Date ? d.toISOString() : String(d); return s.slice(0, 10); };

// "Ethan, owner" / "Ethan - lead gardener" / "Ethan (owner)" / "Ethan" → { name, role }
function parseOwnerTitle(raw) {
  const s = str(raw).replace(/\s+/g, ' ');
  if (!s) return { name: '', role: '' };
  const m = s.match(/^([^,(\-–—:]+?)\s*(?:[,(\-–—:]\s*(.+?)\)?)?$/);
  if (!m) return { name: s, role: '' };
  const name = m[1].trim();
  const role = (m[2] || '').replace(/^(?:the\s+)?/i, '').trim();
  return { name, role };
}

// B13 with the amendment: owner name and role when owner_name is set; else the company name
function bylineFor({ name, role, company }) {
  if (name) return `By ${name}, ${role || 'owner'} at ${company || '[CV: company_name]'}`;
  return `By ${company || '[CV: company_name]'}`;
}

function usablePriceRow(r) {
  if (!r || r.deleted) return { usable: false, why: 'deleted' };
  if (r.quote_only) return { usable: false, why: 'quote only' };
  const figure = [r.from_gbp, r.up_to_gbp, r.typical_gbp].some(v => Number.isFinite(Number(v)) && Number(v) > 0);
  if (!figure) return { usable: false, why: 'no figure' };
  if (r.unverified) return { usable: false, why: 'unverified: the figure was not traced to the transcript' };
  return { usable: true, why: '' };
}

function priceText(r) {
  const n = v => (Number.isFinite(Number(v)) && Number(v) > 0 ? `£${Number(v).toLocaleString('en-GB')}` : '');
  const from = n(r.from_gbp), to = n(r.up_to_gbp), typ = n(r.typical_gbp);
  const range = from && to ? `${from} to ${to}` : from ? `from ${from}` : to ? `up to ${to}` : typ;
  return [range, r.unit ? str(r.unit) : ''].filter(Boolean).join(' ');
}

// The services with a page, each with its price row when one matches (the service's page
// title, its GBP names and what it absorbed are the names a row may use)
function matchPrices(rows, priceRows) {
  const services = rows.filter(r => r.type === 'service' && r.applies !== false).map(r => {
    const info = r.info || {};
    return { slug: r.slug, title: r.title, names: [r.title, ...(info.gbp_names || []), ...(info.absorbs || [])].filter(Boolean), phase: info.phase || 1 };
  });
  const candidates = services.flatMap(s => s.names.map(n => ({ key: s.slug, value: n })));
  const bySlug = new Map(services.map(s => [s.slug, { ...s, rows: [] }]));
  const unmatched = [];
  const shaped = (priceRows || []).filter(r => r && !r.deleted).map(r => {
    const u = usablePriceRow(r);
    const hit = bestServiceFor(str(r.service), candidates);
    const out = { id: r.id || null, service: str(r.service), text: priceText(r), unit: str(r.unit), what_moves_price: str(r.what_moves_price), quote_only: !!r.quote_only, unverified: !!r.unverified, usable: u.usable, why: u.why, page: hit ? hit.key : null, page_title: hit ? (bySlug.get(hit.key) || {}).title || '' : '' };
    if (hit && bySlug.has(hit.key)) bySlug.get(hit.key).rows.push(out); else unmatched.push(out);
    return out;
  });
  const list = [...bySlug.values()].map(s => {
    const usable = s.rows.filter(r => r.usable);
    const mode = usable.length ? 'prices' : 'factors';
    const why = usable.length ? '' : s.rows.length ? `${s.rows.map(r => r.why).filter(Boolean).join('; ') || 'no usable figure'}` : 'no price row names this service';
    return { slug: s.slug, title: s.title, mode, price: usable[0] || null, rows: s.rows, why };
  });
  return { services: list, rows: shaped, unmatched, withPrices: list.filter(s => s.mode === 'prices').length, anyUsable: shaped.some(r => r.usable) };
}

function blogInputsFor({ cv = {}, client = {}, priceRows = [], fields = [], niche = null, rows = [], tradeFacts = null, dossiers = [] } = {}) {
  const missing = [];
  const notes = [];
  const company = str(cv.company_name);
  const phone = str(cv.phone);

  // G-INPUT
  if (!company) missing.push('Company name: blank in the client values (G-INPUT: no post runs without it).');
  if (!phone) missing.push('Phone: blank in the client values (G-INPUT: no post runs without it).');

  // The owner: the client values first, else the onboarding form's "first name and job title"
  const formField = (fields || []).find(f => f && f.key === 'owner_name_title');
  const fromForm = parseOwnerTitle(formField && formField.value);
  let name = str(cv.owner_name), role = str(cv.owner_role), source = null, inferred = false;
  if (name) { source = 'client values'; if (!role) role = ''; }
  else if (fromForm.name) { name = fromForm.name; role = role || fromForm.role; source = 'onboarding form'; inferred = true; }
  if (name && !role && fromForm.name && fromForm.role && fromForm.name.toLowerCase() === name.toLowerCase()) { role = fromForm.role; inferred = true; }
  const owner = { name, role, source, inferred, form_value: str(formField && formField.value), byline: bylineFor({ name, role, company }) };
  if (!name) notes.push(`Owner name: blank, so the byline reads "By ${company || '[CV: company_name]'}" (B13).`);
  else if (inferred) notes.push(`Owner: "${name}${role ? `, ${role}` : ''}" read from the onboarding form's "${owner.form_value}"; confirm it on the Record tab (owner name and owner role).`);
  else if (!role) notes.push('Owner role: blank, so the byline says "owner" (B13).');

  // The schedule and the client's standing
  const launch = isoDate(client.launch_date);
  if (!launch) missing.push('Launch date: not set. The schedule (B10) is dated from it; until then the launch posts go up as drafts and nothing is scheduled.');
  const status = str(client.status).toLowerCase() || 'active';
  if (status === 'churned') notes.push('Status: churned. The daily job turns every scheduled post into a draft; published posts stay.');
  const searchConsole = str(client.search_console_property);
  if (!searchConsole) missing.push('Search Console property: not set (needed from month 6 for the Search Console batch; not before).');

  // The niche and its blog slots
  const nicheName = niche ? (niche._source || niche.trade || 'niche') : '';
  let slots = null;
  if (!niche) missing.push(`Niche entry: none for "${str(client.trade) || str(cv.primary_category) || 'this client'}" (the blog needs the homepage slots and the blog slots).`);
  else {
    slots = blocksFor({ niche, cv });
    for (const f of slots.flags) notes.push(f.msg);
    if (slots.seasonal && !slots.seasonal_topics.length) notes.push(`${nicheName} is seasonal but has no seasonal topics: local posts take the seasonal slots.`);
  }

  // The page map and the prices
  const live = (rows || []).filter(r => r.applies !== false);
  if (!live.length) missing.push('Page map: not generated. The cost guides, the primary links and the price matching read the service pages from it.');
  const prices = matchPrices(live, priceRows);
  if (!(priceRows || []).some(r => r && !r.deleted)) notes.push('Prices: no price rows on file, so every cost guide runs on what affects the cost (factors), with no figures anywhere.');
  else {
    const without = prices.services.filter(s => s.mode === 'factors');
    if (prices.withPrices) notes.push(`Prices: ${prices.withPrices} of ${prices.services.length} service page${prices.services.length === 1 ? '' : 's'} ha${prices.withPrices === 1 ? 's' : 've'} a usable price row (prices mode); the rest run on factors.`);
    else notes.push(`Prices: ${prices.rows.length} row${prices.rows.length === 1 ? '' : 's'} on file but none is usable for a service page (${[...new Set(prices.rows.map(r => r.why || 'no service page matches').filter(Boolean))].join('; ')}): every cost guide runs on factors.`);
    if (without.length && prices.withPrices) notes.push(`No price for: ${without.map(s => s.title).join(', ')}.`);
    if (prices.unmatched.length) notes.push(`Price rows naming no service page: ${prices.unmatched.map(r => `"${r.service}"`).join(', ')}.`);
  }

  // The trade facts pack and the dossiers
  const tf = tradeFacts ? { verified: !!tradeFacts.verified, message: str(tradeFacts.message), niche: tradeFacts.niche || null } : { verified: false, message: 'no trade facts pack found for this niche', niche: null };
  if (!tf.verified) missing.push(`Trade facts pack: ${tf.message || 'not verified'} (G-FACTS: question, decision and cost guide posts wait; local posts run without it).`);
  const towns = (dossiers || []).map(d => str(d.locationName || d.name)).filter(Boolean);
  if (!towns.length) notes.push('Dossiers: none saved, so there are no local posts (one per town with an unused dossier condition).');

  return {
    ready: !!(company && phone),
    owner,
    launch: { date: launch || null },
    status,
    search_console_property: searchConsole,
    business_type: slots ? slots.type : null,
    slots,
    prices,
    trade_facts: tf,
    dossiers: towns,
    page_map: { services: prices.services.length, rows: live.length },
    missing,
    notes,
  };
}

module.exports = { blogInputsFor, parseOwnerTitle, bylineFor, matchPrices, bestServiceFor, usablePriceRow, priceText };
