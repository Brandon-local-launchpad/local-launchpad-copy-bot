'use strict';

// ── Citations: one client's directory list ────────────────────────────────────────
// What the Citations tab shows for a client, built live from the directory database and
// the client's own records:
//   the master NAP record     gbp/profile.js buildNap on the client values (the same record
//                             the GBP tab shows, character for character)
//   the listings email        <client-slug>@listings.locallaunchpad.co.uk (invented, no set-up)
//   the tiers                 uk_core and uk_secondary for every client; trade_niche for the
//                             client's niche (clients.niche_key); location for the approved
//                             town list (locations/approved.js) through each town's council
//                             (the places table), county (the Places tab) and name. No
//                             approval: "approve the locations first" and no location rows.
//   service area businesses   rows with skip_for_service_area are hidden unless the client
//                             values say gbp_address_type = storefront
//   Facebook and Instagram    the page links from the onboarding record prefill the live URL
//   per row                   the saved client_citations row (listed, live URL, NAP status and
//                             the differing fields, status, done by, last scanned, notes, the
//                             1Password item name, the login email) or the blank defaults
//   the tiles and the banner  core and overall completion (listed = yes), NAP mismatches and
//                             unchecked, wrong location, needs review, waiting on client
// One location per client for now (client_citation_locations, the primary); the rows carry
// a location_id so a second location can come later without a schema change.

const { buildNap } = require('../gbp/profile');
const { normaliseName } = require('../locations/places');
const { slugify } = require('../page-map/slugs');

const LISTINGS_DOMAIN = 'listings.locallaunchpad.co.uk';
const TIERS = [['uk_core', 'UK Core'], ['uk_secondary', 'UK Secondary'], ['location', 'Location'], ['trade_niche', 'Trade / niche']];
const PRIORITY_ORDER = { P1: 0, P2: 1, P3: 2 };
const LISTED = ['yes', 'no', 'unchecked'];
const NAP_STATUS = ['match', 'mismatch', 'unchecked', 'needs_review'];
const STATUSES = [
  ['not_started', 'Not started'], ['submitted', 'Submitted'], ['awaiting_email', 'Awaiting email verification'], ['awaiting_approval', 'Awaiting approval'],
  ['live', 'Live'], ['wrong_location', 'Wrong location'], ['needs_fixing', 'Needs fixing'], ['waiting_on_client', 'Waiting on client'], ['client_declined', 'Client declined'],
];
const DONE_BY = ['va', 'client', 'client_decision'];
const ROW_FIELDS = ['listed', 'live_url', 'nap_status', 'nap_diffs', 'status', 'done_by', 'notes', 'onepassword_item', 'login_email'];

const str = v => (v == null ? '' : String(v)).trim();
const parse = v => { if (v == null || v === '') return null; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (_) { return null; } };
const json = v => (v == null ? null : JSON.stringify(v));
const listingsEmail = name => `${slugify(name)}@${LISTINGS_DOMAIN}`;

// Does a directory apply to this client? ctx: { nicheKey, councils, counties, towns } (Sets of normalised names)
function applies(dir, ctx) {
  const a = dir.applies_to || { kind: 'all' };
  const has = (set, list) => (list || []).some(x => set.has(normaliseName(x)));
  switch (a.kind) {
    case 'all': return true;
    case 'niches': return (a.niches || []).includes(ctx.nicheKey);
    case 'not_niches': return !(a.niches || []).includes(ctx.nicheKey);
    case 'councils': return has(ctx.councils, a.councils);
    case 'towns': return has(ctx.towns, a.towns);
    case 'areas': return has(ctx.counties, a.counties) || has(ctx.towns, a.towns);
    default: return false;
  }
}

function blankRow() { return { listed: 'unchecked', live_url: '', nap_status: 'unchecked', nap_diffs: [], status: 'not_started', done_by: null, last_scanned_at: null, scan: null, notes: '', onepassword_item: '', login_email: '', updated_at: null, saved: false }; }

// The tiles and the NAP banner from the rows shown
function stats(rowsByTier) {
  const all = Object.values(rowsByTier).flat();
  const core = rowsByTier.uk_core || [];
  const pct = (n, of) => (of ? Math.round((n / of) * 100) : 0);
  const listedCore = core.filter(r => r.row.listed === 'yes').length;
  const listedAll = all.filter(r => r.row.listed === 'yes').length;
  const mismatches = all.filter(r => r.row.nap_status === 'mismatch');
  return {
    core: { done: listedCore, of: core.length, pct: pct(listedCore, core.length) },
    overall: { done: listedAll, of: all.length, pct: pct(listedAll, all.length) },
    wrong_location: all.filter(r => r.row.status === 'wrong_location').length,
    nap: { mismatch: mismatches.length, unchecked: all.filter(r => r.row.nap_status === 'unchecked').length, match: all.filter(r => r.row.nap_status === 'match').length },
    needs_review: all.filter(r => r.row.nap_status === 'needs_review' || (r.row.scan && r.row.scan.confidence === 'low')).length,
    waiting_on_client: all.filter(r => r.row.status === 'waiting_on_client').length,
    banner: mismatches.map(r => ({ directory: r.directory.name, directory_id: r.directory.id, lines: (r.row.nap_diffs || []).map(d => `${d.field} mismatch: listing shows ${d.found || '(nothing)'}, expected ${d.expected || '(blank)'}`), text: `${r.directory.name}: ${(r.row.nap_diffs || []).map(d => `${d.field} mismatch: listing shows ${d.found || '(nothing)'}, expected ${d.expected || '(blank)'}`).join('; ') || 'NAP mismatch'}` })),
  };
}

// pool, store (citations/store.js), filloutService (record), placesStore (locations/places.js createPlacesStore),
// approvedTiers (locations/approved.js), clientValues(clientId) → cv, siteUrlFor(clientId) → url or ''
function createClientCitations({ pool, store, filloutService = null, placesStore = null, approvedTiers = null, clientValues, siteUrlFor = async () => '' }) {
  async function clientRow(clientId) {
    const { rows } = await pool.query(`SELECT id, name, trade, niche_key, archived_at FROM clients WHERE id = $1`, [clientId]);
    if (!rows.length) throw Object.assign(new Error('Client not found.'), { status: 404 });
    return rows[0];
  }
  async function recordFields(clientId) {
    if (!filloutService) return {};
    const rec = await filloutService.record(clientId).catch(() => null);
    if (!rec) return {};
    const out = {};
    for (const f of rec.sections.flatMap(s => s.fields)) if (f.value != null && f.value !== '') out[f.key] = typeof f.value === 'string' ? f.value.trim() : f.value;
    return out;
  }
  // The primary location row, made on first use
  async function primaryLocation(clientId) {
    const { rows } = await pool.query(`SELECT * FROM client_citation_locations WHERE client_id = $1 ORDER BY is_primary DESC, created_at LIMIT 1`, [clientId]);
    if (rows.length) return rows[0];
    await pool.query(`INSERT INTO client_citation_locations (client_id, label, is_primary) VALUES ($1, 'Primary', TRUE)`, [clientId]);
    return (await pool.query(`SELECT * FROM client_citation_locations WHERE client_id = $1 ORDER BY is_primary DESC, created_at LIMIT 1`, [clientId])).rows[0];
  }

  // Everything about the client the list needs
  async function context(clientId) {
    const client = await clientRow(clientId);
    const [cv, fields, siteUrl, approved] = await Promise.all([clientValues(clientId), recordFields(clientId), siteUrlFor(clientId), approvedTiers ? approvedTiers(pool, clientId).catch(() => null) : null]);
    const nicheKey = client.niche_key || 'other';
    const baseTown = str(fields.primary_town) || str(cv.main_town) || '';
    const storefront = str(cv.gbp_address_type).toLowerCase() === 'storefront' && str(cv.address);
    const serviceArea = !storefront;
    const nap = buildNap({ cv, site: siteUrl, areas: approved ? approved.gbp_areas : [] });
    // The territory: the base town plus the approved towns; their councils from the places table,
    // their counties from the Places tab
    const townNames = [baseTown, ...(approved ? approved.towns : [])].filter(Boolean);
    const placeRows = [];
    if (placesStore) {
      if (approved) { const byId = await placesStore.byIds([...approved.tier1, ...approved.tier2].map(t => t.place_id)); placeRows.push(...byId.values()); }
      if (baseTown) { const m = await placesStore.matchName(baseTown); const town = m.find(p => !p.is_admin_area) || m[0]; if (town) placeRows.push(town); }
    }
    const councilNames = [...new Set(placeRows.flatMap(p => String(p.lad_name || '').split(';').map(s => s.trim()).filter(Boolean)))];
    const counties = [...new Set([...(await store.countiesForCouncils(councilNames)).map(p => p.name), ...(await store.placesByNames(townNames)).map(p => p.county).filter(Boolean)])];
    return {
      client, cv, fields, siteUrl, approved, nicheKey, baseTown, serviceArea, storefront: !!storefront, nap,
      email: listingsEmail(client.name), slug: slugify(client.name),
      towns: townNames, councils: councilNames, counties,
      social: { facebook: str(fields.facebook), instagram: str(fields.instagram) },
      match: { nicheKey, councils: new Set(councilNames.map(normaliseName)), counties: new Set(counties.map(normaliseName)), towns: new Set(townNames.map(normaliseName)) },
    };
  }

  // The directories this client gets, by tier, with the saved row joined on
  async function view(clientId) {
    const ctx = await context(clientId);
    const location = await primaryLocation(clientId);
    const dirs = await store.list({ includeRetired: false });
    const { rows: saved } = await pool.query(`SELECT * FROM client_citations WHERE client_id = $1 AND location_id = $2`, [clientId, location.id]);
    const savedBy = new Map(saved.map(r => [r.directory_id, r]));
    const rowsByTier = {};
    for (const [tier] of TIERS) rowsByTier[tier] = [];
    for (const d of dirs) {
      if (!rowsByTier[d.tier]) continue;
      if (d.tier === 'location' && !ctx.approved) continue;
      if (d.skip_for_service_area && ctx.serviceArea) continue;
      if (!applies(d, ctx.match)) continue;
      const s = savedBy.get(d.id);
      const row = s ? { listed: s.listed, live_url: s.live_url || '', nap_status: s.nap_status, nap_diffs: parse(s.nap_diffs) || [], status: s.status, done_by: s.done_by || null, last_scanned_at: s.last_scanned_at, scan: parse(s.scan), notes: s.notes || '', onepassword_item: s.onepassword_item || '', login_email: s.login_email || '', updated_at: s.updated_at, saved: true } : blankRow();
      // Facebook and Instagram: the page links from onboarding prefill the live URL
      let live_url_source = row.live_url ? 'saved' : '';
      if (!row.live_url && d.domain === 'facebook.com' && ctx.social.facebook) { row.live_url = ctx.social.facebook; live_url_source = 'onboarding'; }
      if (!row.live_url && d.domain === 'instagram.com' && ctx.social.instagram) { row.live_url = /^https?:/i.test(ctx.social.instagram) ? ctx.social.instagram : `https://www.instagram.com/${ctx.social.instagram.replace(/^@/, '')}/`; live_url_source = 'onboarding'; }
      row.done_by_effective = row.done_by || d.done_by;
      row.login_email_effective = row.login_email || ctx.email;
      rowsByTier[d.tier].push({ directory: { id: d.id, key: d.key, name: d.name, url: d.url, domain: d.domain, tier: d.tier, type: d.type, da: d.da, cost: d.cost, cost_text: d.cost_text, priority: d.priority, verification_method: d.verification_method, done_by: d.done_by, skip_for_service_area: d.skip_for_service_area, needs_live_check: d.needs_live_check, notes: d.notes, applies_to: d.applies_to }, row: { ...row, live_url_source } });
    }
    for (const tier of Object.keys(rowsByTier)) rowsByTier[tier].sort((a, b) => (PRIORITY_ORDER[a.directory.priority] - PRIORITY_ORDER[b.directory.priority]) || a.directory.name.localeCompare(b.directory.name));
    const tiers = TIERS.map(([tier, label]) => ({ tier, label, rows: rowsByTier[tier], count: rowsByTier[tier].length, listed: rowsByTier[tier].filter(r => r.row.listed === 'yes').length, waiting: tier === 'location' && !ctx.approved ? 'approve the locations first' : tier === 'trade_niche' && ctx.nicheKey === 'other' ? 'the client has no niche yet' : '' }));
    return {
      client: { id: ctx.client.id, name: ctx.client.name, niche_key: ctx.nicheKey, slug: ctx.slug },
      nap: ctx.nap, email: ctx.email, site: ctx.siteUrl, base_town: ctx.baseTown, service_area: ctx.serviceArea,
      territory: { approved: !!ctx.approved, approved_at: ctx.approved ? ctx.approved.approved_at : null, towns: ctx.towns, councils: ctx.councils, counties: ctx.counties },
      location: { id: location.id, label: location.label, count: 1 },
      social: ctx.social,
      tiers, stats: stats(rowsByTier),
      options: { statuses: STATUSES, listed: LISTED, nap_status: NAP_STATUS, done_by: DONE_BY },
    };
  }

  // Save a row's fields (the first write makes the row)
  async function saveRow(clientId, directoryId, patch = {}, { now = new Date() } = {}) {
    const dir = await store.get(directoryId);
    if (!dir) throw Object.assign(new Error('Directory not found.'), { status: 404 });
    const location = await primaryLocation(clientId);
    const set = {};
    const bad = [];
    for (const k of ROW_FIELDS) {
      if (!(k in patch)) continue;
      let v = patch[k];
      if (k === 'listed') { v = str(v); if (!LISTED.includes(v)) bad.push('listed must be yes, no or unchecked'); }
      else if (k === 'nap_status') { v = str(v); if (!NAP_STATUS.includes(v)) bad.push('nap_status must be match, mismatch, unchecked or needs_review'); }
      else if (k === 'status') { v = str(v); if (!STATUSES.some(([s]) => s === v)) bad.push(`status must be one of ${STATUSES.map(([s]) => s).join(', ')}`); }
      else if (k === 'done_by') { v = str(v) || null; if (v && !DONE_BY.includes(v)) bad.push('done_by must be va, client or client_decision'); }
      else if (k === 'nap_diffs') v = json(Array.isArray(v) ? v : []);
      else v = str(v);
      set[k] = v;
    }
    if (bad.length) throw Object.assign(new Error(bad.join('; ')), { status: 400 });
    if ('live_url' in set && set.live_url && !/^https?:\/\//i.test(set.live_url)) throw Object.assign(new Error('The listing URL must start with http:// or https://'), { status: 400 });
    const { rows: ex } = await pool.query(`SELECT id FROM client_citations WHERE client_id = $1 AND location_id = $2 AND directory_id = $3`, [clientId, location.id, directoryId]);
    const cols = Object.keys(set);
    if (ex.length) { if (cols.length) await pool.query(`UPDATE client_citations SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')}, updated_at = $${cols.length + 2} WHERE id = $1`, [ex[0].id, ...cols.map(c => set[c]), now]); }
    else await pool.query(`INSERT INTO client_citations (client_id, location_id, directory_id${cols.map(c => `, ${c}`).join('')}, updated_at) VALUES ($1, $2, $3${cols.map((_, i) => `, $${i + 4}`).join('')}, $${cols.length + 4})`, [clientId, location.id, directoryId, ...cols.map(c => set[c]), now]);
    return rowFor(clientId, directoryId);
  }
  async function rowFor(clientId, directoryId) {
    const location = await primaryLocation(clientId);
    const { rows } = await pool.query(`SELECT * FROM client_citations WHERE client_id = $1 AND location_id = $2 AND directory_id = $3`, [clientId, location.id, directoryId]);
    const r = rows[0];
    return r ? { ...r, nap_diffs: parse(r.nap_diffs) || [], scan: parse(r.scan), saved: true } : null;
  }

  return { context, view, saveRow, rowFor, primaryLocation, applies, stats, listingsEmail, TIERS, STATUSES, LISTED, NAP_STATUS, DONE_BY, ROW_FIELDS };
}

module.exports = { createClientCitations, applies, stats, blankRow, listingsEmail, LISTINGS_DOMAIN, TIERS, STATUSES, LISTED, NAP_STATUS, DONE_BY, ROW_FIELDS };
