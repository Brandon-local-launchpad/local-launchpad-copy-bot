'use strict';
// Fixture: rank scans through Local Falcon (9 Nov 2026), on Edens Edge, with a fake Local Falcon
// client and pg-mem. Nothing calls the real API and nothing spends credits.
// Covers: the scoring from per point data over the kept pins only (Top 3%, average with not
// found as 21, the leader, market share); the clip; the preview (place id only, the centre and
// where it came from, the hidden address main town, the excluded towns, no town blocks, points
// paid and kept, credits, nothing run); nothing on page load; the baseline (confirm, the listing
// saved first, one scan per keyword, the claim, the lock); the read back; the monthly job (the
// run day, one scan per client, keyword and month claimed before the call, a failed call never
// retried, the balance first, low credits skip and alert, the daily lock); the reset; LeadSnap
// rows kept as labelled history and never in the table; the dashboard's running count.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const SC = require(path.join(root, 'gbp/scans.js'));
const RS = require(path.join(root, 'gbp/rank-scans.js'));
const { buildGbpInputs } = require(path.join(root, 'gbp/inputs.js'));
const { mountGbpApi } = require(path.join(root, 'gbp/routes.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const { scanReachMiles } = require(path.join(root, 'locations/rules.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const { rows } = require(path.join(__dirname, 'data/edens-edge-v3-page-map.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: rank scans through Local Falcon (Edens Edge) ===\n');

// ── Scoring and clipping, no network ──
{
  const pts = [
    { rank: 1, results: [{ rank: 1, place_id: 'own', name: 'Edens Edge' }, { rank: 2, place_id: 'A', name: 'Solent Landscapes' }, { rank: 3, place_id: 'B', name: 'Hampshire Gardens' }] },
    { rank: 2, results: [{ rank: 1, place_id: 'A', name: 'Solent Landscapes' }, { rank: 2, place_id: 'own', name: 'Edens Edge' }, { rank: 3, place_id: 'B', name: 'Hampshire Gardens' }] },
    { rank: 5, results: [{ rank: 1, place_id: 'A', name: 'Solent Landscapes' }, { rank: 2, place_id: 'C', name: 'Test Valley Turf' }, { rank: 3, place_id: 'B', name: 'Hampshire Gardens' }, { rank: 5, place_id: 'own', name: 'Edens Edge' }] },
    { rank: false, results: [{ rank: 1, place_id: 'A', name: 'Solent Landscapes' }, { rank: 2, place_id: 'C', name: 'Test Valley Turf' }] },
  ];
  const s = SC.scorePoints(pts, 'own');
  chk('Top 3% from the points: 2 of 4 = 50', s.top_3_percentage === 50 && s.top_3_points === 2 && s.total_points === 4, JSON.stringify(s), '50');
  chk('average: not found counts as 21 ((1 + 2 + 5 + 21) / 4 = 7.3)', s.average === 7.3, s.average, 7.3);
  chk('leader: Solent Landscapes, top 3 at all 4 points (100), the "too small" advice', s.leader.name === 'Solent Landscapes' && s.leader.top3 === 100 && /over 90: the map is too small, consider the next wider setting/.test(s.leader.line), s.leader.line, 'Solent 100');
  const A = s.competitors.find(c => c.google_place_id === 'A');
  chk('market share = a business\'s share of all top 3 places (A: 4 of 11 = 36.4); the client is not in the competitor list', A.market_share === 36.4 && !s.competitors.some(c => c.is_client) && s.competitors[0].google_place_id === 'A', JSON.stringify(s.competitors.map(c => [c.name, c.market_share])), 'A 36.4');
  const C = s.competitors.find(c => c.google_place_id === 'C');
  chk('a competitor\'s average counts its missing points as 21 (C: (21 + 21 + 2 + 2) / 4 = 11.5)', C.average === 11.5, C.average, 11.5);
  chk('ranks over 20, false and blank are not found', SC.rankOf(21) === null && SC.rankOf(false) === null && SC.rankOf('') === null && SC.rankOf('7') === 7, '', '');
  chk('radius = spacing x 6: 1000 m 6 km, 1500 m 9 km, 2000 m 12 km, 2500 m 15 km', [1000, 1500, 2000, 2500].map(SC.radiusKm).join() === '6,9,12,15', [1000, 1500, 2000, 2500].map(SC.radiusKm).join(), '6,9,12,15');
  const centre = { lat: 50.9, lng: -1.4 };
  const poly = SC.servicePolygon(centre, [{ lat: 50.9, lng: -1.4 }]).polygon;
  const grid = SC.gridPoints(centre, { grid_size: 13, spacing_m: 1500 });
  const cl = SC.clipToPolygon(centre, grid, poly);
  chk('the clip: a lone town plus 3 km keeps the points within 3 km of it out of the 169', grid.length === 169 && cl.kept.length > 0 && cl.kept.length < 30 && cl.kept.length + cl.dropped.length === 169 && cl.kept.every(p => SC.kmBetween(centre, p) <= 3.01), `${cl.kept.length} kept`, 'few kept, all within 3 km');
}

// ── A fake Local Falcon ──
const lfCalls = [];
let balance = 5000, saved = [], reportsByKey = {}, failNextRun = false, keyN = 0;
// The full 13 x 13 grid the run asked for: the client ranks 1 near the centre, worse further
// out and not found beyond 10 km; Solent Landscapes is always first where the client is not.
function fakeReport(body, key) {
  const c = { lat: Number(body.lat), lng: Number(body.lng) };
  const pts = SC.gridPoints(c, { grid_size: Number(body.grid_size), spacing_m: (Number(body.radius_km) * 1000) / 6 });
  return {
    report_key: key, place_id: body.place_id, keyword: body.keyword, grid_size: String(body.grid_size), radius: String(body.radius_km), measurement: 'km',
    solv: '99.00', arp: '1.00', atrp: '1.00', public_url: `https://localrankingtracker.com/scan-report/${key}/`,
    data_points: pts.map(p => {
      const km = SC.kmBetween(c, p);
      const rank = km < 3 ? 1 : km < 6 ? 4 : km < 10 ? 12 : false;
      const results = [{ rank: 1, place_id: rank === 1 ? body.place_id : 'ChIJ_comp_1', name: rank === 1 ? 'Edens Edge Landscaping' : 'Solent Landscapes' }, { rank: 2, place_id: 'ChIJ_comp_2', name: 'Hampshire Gardens' }];
      if (rank && rank > 1) results.push({ rank, place_id: body.place_id, name: 'Edens Edge Landscaping' });
      return { lat: String(p.lat), lng: String(p.lng), found: !!rank, rank, count: 20, results };
    }),
  };
}
const fakeLf = {
  account: async () => { lfCalls.push('account'); return { package: { name: 'Basic' }, permissions: { api_access: true }, credits: { total_usable_credits: balance } }; },
  listLocations: async q => { lfCalls.push('listLocations'); return saved.filter(l => !q || l.place_id === q); },
  addLocation: async pid => { lfCalls.push('addLocation'); saved.push({ place_id: pid, name: 'Edens Edge Landscaping', lat: '50.915', lng: '-1.41' }); return { message: 'added' }; },
  runScan: async body => {
    lfCalls.push('runScan');
    if (failNextRun) { failNextRun = false; throw Object.assign(new Error('Local Falcon /v2/run-scan/: timeout'), { status: 502 }); }
    const key = `rk${++keyN}`;
    reportsByKey[key] = fakeReport(body, key);
    balance -= Number(body.grid_size) ** 2;
    return { processing: true, report_key: key, report: null, body };
  },
  getReport: async key => { lfCalls.push('getReport'); return { processing: false, report: reportsByKey[key] }; },
  listReports: async () => { lfCalls.push('listReports'); return []; },
};
const spent = () => lfCalls.filter(c => c === 'runScan').length;

// ── Inputs (as gbp-job.js builds them) ──
const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Chilworth', 'Hedge End'].join('\n') };
const baseCv = { ...E.ethanValues(), gbp_place_id: 'ChIJ_edens_edge_own', gbp_address_type: 'service_area', scan_area: 'city' };
const ctx = contextFromPageMap({ rows, hand, cv: baseCv, niche: landscaper });
const I0 = buildGbpInputs({ cv: baseCv, niche: landscaper, rows, keyValueMap: ctx.keyValueMap, siteUrl: 'https://edensedge.co.uk/', serviceCopy: [] });
const townPositions = { Southampton: [50.9097, -1.4044], Romsey: [50.989, -1.4966], Winchester: [51.0632, -1.308], Eastleigh: [50.9697, -1.3503], 'Chandlers Ford': [50.984, -1.383], 'Hedge End': [50.912, -1.296] };

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, metadata JSONB, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  const { rows: [c] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge Landscaping', 'Landscaper') RETURNING id`);
  // An old LeadSnap scan, from before the move (no source field)
  const oldRow = { heatmap_id: 9001, keyword: 'landscaper', kind: 'main', run_type: 'baseline', status: 'completed', created_at: '2026-10-23T14:00:00Z', month: '2026-10', top_3_percentage: 36.1, average: 8.4, points: [{ lat: 50.9, lng: -1.4, rank: 3 }], superseded: false };
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'gbp_scan', 'scan.json', $2, $3)`, [c.id, JSON.stringify(oldRow), JSON.stringify({ heatmap_id: 9001 })]);

  let cv = { ...baseCv, scan_settings: { version: 2, locked: true, locked_at: '2026-10-23T14:00:00Z', grid_size: 13, spacing_m: 1500, keywords: [{ keyword: 'landscaper', kind: 'main' }], centre: { lat: 50.9, lng: -1.4 } } };
  const inputs = () => ({ ...I0, validatorCtx: { ...I0.validatorCtx, cv } });
  const saveClientValue = async (id, k, v) => { cv = { ...cv, [k]: v }; };
  const search = async q => { const town = q.replace(/ near .*$/, '').replace(/, UK$/, ''); if (town === 'Chilworth') return [{ name: 'Chilworth, Guildford', location: { lat: 51.214, lng: -0.534 } }]; return townPositions[town] ? [{ name: town, location: { lat: townPositions[town][0], lng: townPositions[town][1] } }] : []; };
  const locate = async ({ placeId, town }) => (placeId ? { lat: 50.92, lng: -1.41, from: 'the saved listing (Edens Edge Landscaping)' } : town ? { lat: 50.9097, lng: -1.4044, from: `the main town (${town})` } : null);
  const quiet = { log() {}, error() {} };
  const app = express(); app.use(express.json());
  const api = mountGbpApi(app, { pool, loadInputs: async () => inputs(), callModel: async () => { throw new Error('no model'); }, log: quiet, search, locate, saveClientValue, localFalcon: fakeLf });
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const req = (method, p, body = null) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => { let t = ''; res.on('data', d => { t += d; }); res.on('end', () => { let j = null; try { j = JSON.parse(t); } catch (_) {} resolve({ status: res.statusCode, json: j }); }); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
  const clients = async () => [{ client_id: c.id, name: 'Edens Edge Landscaping', cv }];
  try {
    // ── Page load ──
    lfCalls.length = 0;
    let r = await req('GET', `/api/clients/${c.id}/gbp`);
    let v = r.json;
    chk('page load calls nothing on Local Falcon', lfCalls.length === 0, lfCalls.join(), 'none');
    chk('the provider is Local Falcon; the old LeadSnap settings and scan are history, labelled LeadSnap, not in the table', v.scans.provider === 'local_falcon' && v.scans.settings === null && v.scans.previous_settings && v.scans.previous_settings.provider === 'leadsnap' && v.scans.history.length === 1 && v.scans.history[0].source === 'leadsnap' && v.scans.table.length === 0 && v.readiness.scans_on === true, JSON.stringify([v.scans.settings, v.scans.history.length, v.scans.table.length]), 'history 1, table 0');

    // ── Preview: the blocks ──
    cv = { ...cv, gbp_place_id: '' };
    r = await req('POST', `/api/clients/${c.id}/gbp/scans/preview`);
    chk('no place id: the scan is blocked with a clear message (place ID only, no phone or name)', r.status === 400 && /No Google place ID/.test(r.json.error) && /place ID only/.test(r.json.error), r.json && r.json.error, '400');
    cv = { ...cv, gbp_place_id: 'ChIJ_edens_edge_own' };
    const realSearch = search;
    const I1 = I0;
    // No town placed
    const app2 = express(); app2.use(express.json());
    const rank2 = RS.createRankScans({ pool, store: api.store, lf: fakeLf, locate, search: async () => [], saveClientValue, log: quiet });
    let blocked = null;
    try { await rank2.buildSettings(c.id, inputs(), { fresh: true }); } catch (e) { blocked = e; }
    chk('no service area town placed: blocked, never a 3 km circle', blocked && blocked.status === 400 && /blocked rather than shrunk to a 3 km circle/.test(blocked.message), blocked && blocked.message, 'blocked');

    // ── Preview: hidden address service area business ──
    lfCalls.length = 0;
    r = await req('POST', `/api/clients/${c.id}/gbp/scans/preview`);
    const p = r.json, s = p.settings;
    chk('preview: keyword "landscaper", 13 x 13, city 1500 m, radius 9 km, provider local_falcon', s.keywords.map(k => k.keyword).join() === 'landscaper' && s.grid_size === 13 && s.spacing_m === 1500 && s.radius_km === 9 && s.provider === 'local_falcon', JSON.stringify([s.keywords, s.radius_km]), '');
    chk('hidden address: the main town, and the confirm says it is the correct centre, no warning', s.centre.lat === 50.9097 && /main town \(Southampton\)\. The address is hidden \(service area business\), so the main town is the correct centre/.test(s.centre.from) && s.warnings.length === 0, s.centre.from, 'main town, correct');
    chk('the Surrey Chilworth (70 km) is left out of the map and listed', s.excluded_towns.some(t => t.name === 'Chilworth' && /km from the centre/.test(t.reason)) && !s.areas.find(a => a.name === 'Chilworth').lat, JSON.stringify(s.excluded_towns), 'Chilworth');
    chk('points paid 169, points kept fewer, credits 169 a keyword; the balance shown', p.points_paid === 169 && p.points_kept === s.points_kept && s.points_kept > 0 && s.points_kept < 169 && p.credits === 169 && p.balance.credits === 5000, JSON.stringify([p.points_paid, p.points_kept, p.credits, p.balance]), '169, <169, 169');
    chk('preview spends nothing: only free reads (saved locations, account)', spent() === 0 && !lfCalls.includes('addLocation'), lfCalls.join(), 'no runScan');

    // Storefront with the listing saved on Local Falcon: the GBP pin; a blank address type warns
    saved = [{ place_id: 'ChIJ_edens_edge_own', name: 'Edens Edge Landscaping', lat: '50.915', lng: '-1.41' }];
    cv = { ...cv, gbp_address_type: 'storefront' };
    let sf = (await req('POST', `/api/clients/${c.id}/gbp/scans/preview`)).json.settings;
    chk('storefront: the GBP pin from Local Falcon\'s saved listing', sf.centre.lat === 50.915 && /GBP pin \(Local Falcon's saved listing/.test(sf.centre.from) && sf.warnings.length === 0, sf.centre.from, 'GBP pin');
    cv = { ...cv, gbp_address_type: '' };
    sf = (await req('POST', `/api/clients/${c.id}/gbp/scans/preview`)).json.settings;
    chk('address type blank: the pin, with a warning to set service_area if the address is hidden', sf.centre.lat === 50.915 && sf.warnings.some(w => /GBP address type is blank/.test(w)), JSON.stringify(sf.warnings), 'warning');
    saved = [];
    cv = { ...cv, gbp_address_type: 'service_area', scan_keyword_2: 'Garden Design' };

    // ── Baseline ──
    r = await req('POST', `/api/clients/${c.id}/gbp/scans/baseline`, {});
    chk('baseline without confirm is 400 and runs nothing', r.status === 400 && spent() === 0, r.status, 400);
    lfCalls.length = 0;
    r = await req('POST', `/api/clients/${c.id}/gbp/scans/baseline`, { confirm: true });
    v = r.json;
    chk('baseline: the listing saved to Local Falcon first, then one scan per keyword (2)', lfCalls.indexOf('addLocation') > -1 && lfCalls.indexOf('addLocation') < lfCalls.indexOf('runScan') && spent() === 2, lfCalls.join(), 'addLocation then 2 runScan');
    chk('the settings locked, provider local_falcon, run day = today capped at 28, 338 credits a run', cv.scan_settings.locked && cv.scan_settings.provider === 'local_falcon' && cv.scan_settings.run_day === Math.min(28, RS.ukParts(new Date()).day) && cv.scan_settings.credits_per_run === 338, JSON.stringify([cv.scan_settings.run_day, cv.scan_settings.credits_per_run]), '');
    chk('two pending rows labelled Local Falcon; the dashboard counts them running', v.scans.pending === 2 && v.scans.scans.every(x => x.source === 'local_falcon' && x.status === 'processing') && SC.currentRows([oldRow, ...v.scans.scans]).filter(SC.isPending).length === 2, JSON.stringify(v.scans.scans.map(x => x.status)), '2 processing');
    const thisMonth = RS.ukParts(new Date()).month;
    let claims = await api.rank.claimsFor(c.id);
    chk('each scan was claimed for this month before it ran, with the points and credits', claims.length === 2 && claims.every(x => x.month === thisMonth && x.points_paid === 169 && x.credits === 169 && x.status === 'running'), JSON.stringify(claims.map(x => [x.month, x.status, x.points_paid])), '');
    r = await req('POST', `/api/clients/${c.id}/gbp/scans/baseline`, { confirm: true });
    chk('a second baseline is 409', r.status === 409 && spent() === 2, r.status, 409);

    // ── Read back ──
    lfCalls.length = 0;
    v = (await req('POST', `/api/clients/${c.id}/gbp/scans/refresh`)).json;
    const main = v.scans.scans.find(x => x.keyword === 'landscaper');
    const poly = cv.scan_settings.polygon, centre = cv.scan_settings.centre;
    chk('refresh reads only (getReport), spends nothing', spent() === 0 && lfCalls.every(x => x === 'getReport'), lfCalls.join(), 'getReport only');
    chk('completed: 169 paid, only the kept points stored, all inside the clip', main.status === 'completed' && main.points_paid === 169 && main.points.length === main.points_kept && main.points_kept === cv.scan_settings.points_kept && SC.clipToPolygon(centre, main.points, poly).dropped.length === 0, JSON.stringify([main.points_paid, main.points_kept, main.points.length]), '');
    const own = SC.scorePoints(main.points.map(x => ({ rank: x.rank })), '');
    chk('Top 3% and average are Copybot\'s from the kept points, not Local Falcon\'s solv 99', main.top_3_percentage === own.top_3_percentage && main.average === own.average && main.top_3_percentage !== 99, JSON.stringify([main.top_3_percentage, main.average]), 'own score');
    chk('the report\'s public URL replaces "Open on LeadSnap"', /localrankingtracker\.com\/scan-report\/rk1/.test(main.report_url), main.report_url, 'public_url');
    chk('the GBP tab\'s Top 5 by market share and the leader come from Copybot, labelled Local Falcon', v.rankCompetitors && v.rankCompetitors.source === 'local_falcon' && v.rankCompetitors.competitors.length >= 1 && v.rankCompetitors.leader && /Leader /.test(v.rankCompetitors.leader.line), JSON.stringify(v.rankCompetitors && v.rankCompetitors.leader), 'leader');
    chk('the table: Local Falcon only, the baseline month, the LeadSnap scan still history', v.scans.table.length === 2 && v.scans.table.every(t => t.source === 'local_falcon' && t.months.length === 1 && t.months[0].is_baseline) && v.scans.history.length === 1, JSON.stringify(v.scans.table.map(t => [t.keyword, t.source])), '');
    chk('the Location Determiner\'s reach still reads grid x spacing / 2 (6.1 miles at 1500 m)', scanReachMiles(cv.scan_settings) === 6.1, scanReachMiles(cv.scan_settings), 6.1);

    // ── The monthly job ──
    const runDay = cv.scan_settings.run_day;
    const now0 = new Date();
    const nextMonth = d => new Date(Date.UTC(now0.getUTCFullYear(), now0.getUTCMonth() + 1, d, 11, 0, 0));
    lfCalls.length = 0;
    let sum = await api.rank.runDaily({ now: new Date(), clients });
    chk('this month: the baseline is the month\'s scan, nothing runs', spent() === 0 && sum.started.length === 0, JSON.stringify(sum), 'nothing');
    if (runDay > 1) {
      sum = await api.rank.runDaily({ now: nextMonth(runDay - 1), clients });
      chk('next month, the day before the run day: nothing runs', spent() === 0, lfCalls.join(), 'nothing');
    }
    balance = 300;
    sum = await api.rank.runDaily({ now: nextMonth(runDay), clients });
    let al = await api.rank.alerts(c.id);
    chk('the balance is read first: 300 credits, 338 needed, skipped with an alert, nothing spent', spent() === 0 && sum.skipped.length === 1 && al.some(a => a.kind === 'low_credits' && /300 Local Falcon credits left, 338 needed/.test(a.message)), JSON.stringify(sum.skipped), 'skipped');
    balance = 5000;
    failNextRun = true;
    lfCalls.length = 0;
    sum = await api.rank.runDaily({ now: nextMonth(runDay), clients });
    const nm = RS.ukParts(nextMonth(runDay)).month;
    claims = await api.rank.claimsFor(c.id, nm);
    chk('on the run day: one scan per keyword, the first call failed and is recorded failed, the second ran', spent() === 2 && claims.length === 2 && claims.some(x => x.status === 'failed' && /timeout/.test(x.error)) && claims.some(x => x.status !== 'failed' && x.scan_id), JSON.stringify(claims.map(x => [x.keyword, x.status])), '1 failed, 1 ran');
    chk('every automatic scan logged with its points and credits and the balance before', claims.every(x => x.points_paid === 169 && x.credits === 169 && x.balance_before === 5000 && x.run_type === 'monthly'), JSON.stringify(claims.map(x => [x.points_paid, x.credits, x.balance_before])), '');
    lfCalls.length = 0;
    sum = await api.rank.runDaily({ now: nextMonth(runDay + 1 > 28 ? runDay : runDay + 1), clients });
    chk('the next day (a restart, a retry): no scan runs again that month, the failed one included', spent() === 0, lfCalls.join(), 'no runScan');
    chk('the next day reads the pending report back (free): the monthly row completes', (await api.store.scans(c.id)).some(x => x.run_type === 'monthly' && x.status === 'completed' && x.source === 'local_falcon'), '', 'monthly completed');
    v = (await req('GET', `/api/clients/${c.id}/gbp`)).json;
    const lt = v.scans.table.find(t => t.keyword === 'landscaper') || v.scans.table.find(t => t.months.length === 2);
    chk('the table has the baseline and next month, with the change against the baseline', v.scans.table.some(t => t.months.length === 2 && t.months[1].vs_baseline !== null), JSON.stringify(v.scans.table.map(t => t.months.map(m => m.month))), '2 months');

    // The daily lock: one run a day from 6am UK
    const day = new Date(Date.UTC(2027, 5, 15, 9, 0, 0));
    const t1 = await api.rank.dailyTick({ now: day, clients: async () => [] });
    const t2 = await api.rank.dailyTick({ now: new Date(day.getTime() + 3600000), clients: async () => [] });
    const t0 = await api.rank.dailyTick({ now: new Date(Date.UTC(2027, 5, 16, 3, 0, 0)), clients: async () => [] });
    chk('the daily tick runs once a day, and not before 6am UK', t1 && t2 === null && t0 === null, JSON.stringify([!!t1, t2, t0]), 'once');

    // Low credits across every client: a general alert
    balance = 100;
    await api.rank.runDaily({ now: nextMonth(runDay + 1 > 28 ? runDay : runDay + 1), clients });
    al = await api.rank.alerts();
    chk('low credits for a month of scans: a general alert', al.some(a => a.client_id === null && /credits are low: 100 left, 338 needed/.test(a.message)), JSON.stringify(al.map(a => a.message)), 'low');
    balance = 5000;

    // ── Reset ──
    lfCalls.length = 0;
    r = await req('POST', `/api/clients/${c.id}/gbp/scans/reset`, { confirm: true });
    v = r.json;
    chk('reset: every live scan superseded, the lock cleared and relocked, a new baseline per keyword, no campaign to pause', r.status === 200 && v.superseded === 4 && spent() === 2 && cv.scan_settings.locked && cv.scan_settings.reset_from && v.scans.scans.length === 2 && v.scans.scans.every(x => x.run_type === 'baseline' && x.created_from === 'reset'), JSON.stringify([r.status, v.superseded, spent()]), '');
    chk('the superseded rows stay as history, never in the table', v.scans.history.length === 4 && v.scans.table.length === 0, JSON.stringify([v.scans.history.length, v.scans.table.length]), '4 (2 baselines, 1 monthly, the old LeadSnap one), 0');

    // ── LeadSnap scan routes switched off ──
    r = await req('POST', `/api/clients/${c.id}/gbp/schedules/pause-previous`);
    chk('the LeadSnap profile and schedule tools still need the LeadSnap token, not the scan switch', r.status === 503, r.status, 503);

    // ── The Rankings tab's colours (static) ──
    const tab = require('fs').readFileSync(path.join(root, 'public/app/tabs/rankings.js'), 'utf8');
    chk('rank 11 to 20 red, grey only for not found, on the map and the PNG legend', /r > 20 \? 'x'/.test(tab) && /11 to 20 red · grey: not found in the top 20/.test(tab) && !/11 to 19 red/.test(tab), '', '');
  } finally { srv.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
