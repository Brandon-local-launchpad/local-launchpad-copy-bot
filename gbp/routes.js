'use strict';

// ── GBP routes ───────────────────────────────────────────────────────────────
//   GET  /api/clients/:id/gbp            the saved record, readiness, file links
//   POST /api/clients/:id/gbp/generate   run the steps not yet done (description, services, products)
//   POST /api/clients/:id/gbp/clear      start again
//   GET  /clients/:slug/gbp/:file        description.txt, services.csv, products.csv, validation.json
//
// loadInputs(clientId) builds the inputs (gbp/inputs.js) from the live client; it throws
// with status 400 when the client has no v3 page map. callModel is anthropic-call.js's.

const { slugify } = require('../page-map/slugs');
const { createGbpStore } = require('./store');
const { runGbp, filesFor, STEPS } = require('./generate');
const { buildProfile } = require('./profile');
const { runCompetitorCheck, compareRuns, primaryReading, findDuplicates } = require('./competitors');
const { checkLandingPage, fetchHtml } = require('./landing-page');
const { searchPlaces, locateClient } = require('./places');
const SC = require('./scans');
const { checkProfile } = require('./profile-check');
const { namesMatch, phoneDigits } = require('./competitors');
const { createRankScans } = require('./rank-scans');
const PID = require('./place-id');

const CONTENT_TYPES = { 'description.txt': 'text/plain; charset=utf-8', 'services.csv': 'text/csv; charset=utf-8', 'products.csv': 'text/csv; charset=utf-8', 'validation.json': 'application/json; charset=utf-8', 'nap.json': 'application/json; charset=utf-8', 'note.txt': 'text/plain; charset=utf-8', 'competitors.json': 'application/json; charset=utf-8', 'duplicates.json': 'application/json; charset=utf-8', 'landing_page.json': 'application/json; charset=utf-8', 'scans.json': 'application/json; charset=utf-8', 'schedules.json': 'application/json; charset=utf-8', 'competitors_leadsnap.json': 'application/json; charset=utf-8', 'profile_check.json': 'application/json; charset=utf-8', 'rank_competitors.json': 'application/json; charset=utf-8' };

// nap.json and note.txt are built live from the inputs, the saved record, the competitor runs and the scan alerts (gbp/profile.js)
function profileFiles(I, record, competitors, scanAlerts = []) {
  const p = buildProfile({ inputs: I, record, competitors, scanAlerts });
  return { 'nap.json': JSON.stringify(p.nap, null, 2), 'note.txt': p.note };
}

// Batch 2 options: search(textQuery) → [place] (the Places client; the fixture records
// it), fetchPage(url) → { finalUrl, html }, saveClientValue(clientId, key, value)
// locate({ placeId, address, town }) → { lat, lng, from } or null: the client's position for the map signal
// Batch 3: leadsnap (leadsnap/client.js, or the fixture's recorded one); nothing LeadSnap
// is called on page load, only from the buttons
// directoryDomains(): the citation directory database's domains, so the competitor check skips every
// directory Copybot knows (citations/store.js domains(), 3 Nov 2026); without it the built-in list
// Rank scans (9 Nov 2026): localFalcon (localfalcon/client.js) runs them; rankProvider is
// RANK_SCAN_PROVIDER, local_falcon unless set to leadsnap. The LeadSnap scan routes stay, switched
// off by that config, and LeadSnap's old scans show as superseded history labelled with their
// source. The profile check stays on LeadSnap whatever the provider.
function mountGbpApi(app, { pool, loadInputs, callModel, log = console, search = q => searchPlaces(q), fetchPage = fetchHtml, saveClientValue = null, locate = null, leadsnap = null, directoryDomains = null, localFalcon = null, rankProvider = 'local_falcon', placeDetails = null }) {
  const locateFn = locate || (args => locateClient({ ...args, search }));
  const provider = rankProvider === 'leadsnap' ? 'leadsnap' : 'local_falcon';
  const lfOn = provider === 'local_falcon';
  const needLeadsnap = () => { if (!leadsnap) throw Object.assign(new Error('LeadSnap is not configured on this server (LEADSNAP_API_TOKEN).'), { status: 503 }); return leadsnap; };
  // The LeadSnap scan routes, only while RANK_SCAN_PROVIDER=leadsnap
  const needLeadsnapScans = () => { if (lfOn) throw Object.assign(new Error('LeadSnap rank scans are switched off: scans run through Local Falcon (RANK_SCAN_PROVIDER). The old LeadSnap scans are kept as history.'), { status: 409 }); return needLeadsnap(); };

  // The scans as the panel, the note and scans.json read them: the settings, the rows, the
  // monthly table against the baseline, the drop alerts, what is still pending
  const scansView = async (clientId, cv = null) => {
    const all = await store.scans(clientId);
    const split = SC.splitBySource(all, provider);
    const history = split.history;
    // Every row carries the one average rule and whether the client was found at any kept pin
    const scans = split.live.map(s => ({ ...s, average: SC.averageOf(s), not_in_top_20: SC.notInTop20(s), found_points: SC.foundCount(s) }));
    const saved = cv && cv.scan_settings && typeof cv.scan_settings === 'object' ? cv.scan_settings : null;
    // Settings of the other provider are history too: a Local Falcon client shows no LeadSnap lock
    const settings = saved && (saved.provider || 'leadsnap') === provider ? saved : null;
    const schedules = await store.schedules(clientId);
    if (!lfOn) await repairScheduleIds(clientId, schedules);
    const rankExtra = lfOn ? { claims: (await rank.claimsFor(clientId).catch(() => [])).slice(0, 36), rank_alerts: await rank.alerts(clientId).catch(() => []) } : {};
    return { provider, source_label: SC.SOURCES[provider], settings, previous_settings: saved && !settings ? { provider: saved.provider || 'leadsnap', locked_at: saved.locked_at || null } : null, scans, history: history.map(h => ({ ...h, source: SC.sourceOf(h), average: SC.averageOf(h), not_in_top_20: SC.notInTop20(h), found_points: SC.foundCount(h) })), average_rule: SC.AVERAGE_RULE, superseded: history.length, table: SC.monthlyTable(scans), alerts: SC.dropAlerts(scans), pending: scans.filter(SC.isPending).length, schedules, count: scans.length, ...rankExtra };
  };

  // The client's listing on LeadSnap: by the saved Google place id, else by name and phone
  async function leadsnapLocationFor(cv) {
    const ls = needLeadsnap();
    const byId = cv.gbp_place_id ? await ls.listLocations({ 'filter[place_id]': cv.gbp_place_id }) : [];
    let loc = byId[0] || null, how = loc ? 'the saved gbp_place_id' : '';
    if (!loc) {
      const all = await ls.listLocations();
      loc = all.find(l => cv.phone && l.primary_phone && phoneDigits(l.primary_phone) === phoneDigits(cv.phone)) || null;
      how = loc ? 'the phone number' : '';
      if (!loc) { loc = all.find(l => namesMatch(l.location_name || l.name, cv.company_name)) || null; how = loc ? 'the business name' : ''; }
    }
    return loc ? { location: loc, how } : null;
  }

  // The settings for a baseline: the saved locked ones, else built now (not saved until the run)
  async function scanSettingsFor(clientId, I, { fresh = false } = {}) {
    const cv = I.validatorCtx.cv || {};
    if (!fresh && cv.scan_settings && cv.scan_settings.locked) return { settings: cv.scan_settings, saved: true };
    const found = await leadsnapLocationFor(cv);
    let centre = null, place = null;
    const finite = v => Number.isFinite(Number(v)) && Number(v) !== 0;
    if (found) {
      const L = found.location;
      place = { google_place_id: L.place_id || cv.gbp_place_id || '', leadsnap_location_id: L.id, leadsnap_place_id: null, name: L.location_name || L.name || '', how: found.how };
      // A service area business often has no position on LeadSnap (0, 0 or null): the
      // listing by place id, else the address, else the main town, through Places
      if (finite(L.latitude) && finite(L.longitude)) centre = { lat: Number(L.latitude), lng: Number(L.longitude), from: `the GBP pin (LeadSnap location "${place.name}", matched by ${found.how})` };
      else {
        // No position on LeadSnap. A service area business (hidden address) has no pin by design:
        // it centres on the main town and says so. A storefront with no position is a warning the
        // confirm step shows, never a silent fallback. The record's gbp_address_type decides; when
        // it is blank, LeadSnap's own business_type (customer_location = service area) does.
        let sab = String(cv.gbp_address_type || '').toLowerCase() === 'service_area';
        let sabFrom = 'the record (gbp_address_type)';
        if (!cv.gbp_address_type && L.id) {
          try { const full = await needLeadsnap().getLocation(L.id); const bt = String((full.metadata || {}).business_type || '').toLowerCase(); if (bt) { sab = bt === 'customer_location'; sabFrom = `LeadSnap (business_type ${bt})`; } } catch (_) { /* unknown stays a storefront */ }
        }
        const loc = await locateFn({ placeId: '', address: sab ? '' : (cv.address || ''), town: I.town ? `${I.town}, UK` : '' });
        if (!loc) throw Object.assign(new Error(`The LeadSnap location "${place.name}" has no position, and the main town did not resolve, so there is no centre for the grid.`), { status: 400 });
        centre = sab
          ? { ...loc, from: `the main town (${I.town}): service area business, no pin by design`, note: `service area business, centred on the main town (per ${sabFrom})` }
          : { ...loc, from: `${loc.from} (the LeadSnap location "${place.name}" has no position)`, warning: `listing not activated in LeadSnap; grid will centre on the town (${loc.from})` };
      }
    } else {
      const loc = await locateFn({ placeId: cv.gbp_place_id || '', address: cv.address || '', town: I.town ? `${I.town}, UK` : '' });
      if (!loc) throw Object.assign(new Error('No centre for the grid: the client is not on LeadSnap under its place id, phone or name, and the address and main town did not resolve.'), { status: 400 });
      centre = loc;
      place = { google_place_id: cv.gbp_place_id || '', leadsnap_location_id: null, leadsnap_place_id: null, name: cv.company_name || '', how: 'not on LeadSnap: the centre is ' + loc.from };
    }
    if (!place.google_place_id) throw Object.assign(new Error("No Google place id for the client: save gbp_place_id on Client Values (the competitor check fills it when it finds the listing)."), { status: 400 });
    // The service area towns' positions, once, through Places, searched near the main town
    // (a bare "Chilworth, UK" finds the Surrey one, 70 km away). A town further than 50 km from
    // the centre, or more than three times the median distance of the towns, is the wrong town
    // or a council area: kept in the list, flagged, left out of the radius.
    const areas = [];
    for (const name of (I.serviceAreasPageMap || I.areas || [])) {
      try {
        const hits = await search(`${name} near ${I.town}, UK`);
        const hit = hits.find(p => p.location);
        if (!hit) { areas.push({ name, lat: null, lng: null, note: 'no position found' }); continue; }
        areas.push({ name, lat: hit.location.lat, lng: hit.location.lng, km: Math.round(SC.kmBetween(centre, hit.location) * 10) / 10, found: hit.name || hit.address || '' });
      } catch (e) { areas.push({ name, lat: null, lng: null, error: e.message }); }
    }
    const kms = areas.filter(a => a.lat !== null).map(a => a.km).sort((x, y) => x - y);
    const median = kms.length ? kms[Math.floor(kms.length / 2)] : 0;
    for (const a of areas) {
      if (a.lat === null) continue;
      if (a.km > 50 || (kms.length >= 3 && median > 0 && a.km > 3 * median)) {
        Object.assign(a, { found_lat: a.lat, found_lng: a.lng, lat: null, lng: null, note: `found ${Math.round(a.km)} km from the centre (${a.found || 'another place of that name'}; the towns sit ${median} km away on average); left out of the service area` });
      }
    }
    // The clipped grid from LeadSnap's grid-points endpoint (the hull plus 3 km as the polygon);
    // the local generator when that call fails, so the preview still shows a count
    const spacing = SC.spacingFor(cv.scan_area);
    const poly = SC.servicePolygon(centre, areas);
    let points = null, pointsNote = null;
    try {
      const got = await needLeadsnap().gridPoints({ lat: centre.lat, lng: centre.lng, grid_size: SC.GRID_MAX, grid_radius: spacing.spacing_m, polygon: poly.polygon.map(p => ({ lat: p.lat, lng: p.lng })) });
      const list = (got && (got.points || (got.data && got.data.points))) || [];
      if (list.length) points = list.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      else pointsNote = 'LeadSnap returned no points for the polygon; the grid was built here';
    } catch (e) { pointsNote = `LeadSnap grid-points failed (${e.message}); the grid was built here`; }
    const settings = SC.buildScanSettings({ clientName: I.name, primary: I.primary, keyword2: cv.scan_keyword_2 || '', scanArea: cv.scan_area || 'city', town: I.town, centre, areas, place, points });
    settings.areas = areas;
    settings.notes = [...(centre.note ? [centre.note] : []), ...areas.filter(a => a.note || a.error).map(a => `${a.name}: ${a.note || a.error}`), ...(pointsNote ? [pointsNote] : [])];
    settings.warnings = centre.warning ? [centre.warning] : [];
    settings.centre_kind = centre.warning ? 'town, storefront with no position' : centre.note ? 'town, service area business' : 'the GBP pin';
    return { settings, saved: false };
  }

  // Fetch a pending heatmap; store it when completed (scores, points, competitors)
  async function settleScan(clientId, row, settings, cv) {
    const ls = needLeadsnap();
    const h = await ls.getHeatmap(row.heatmap_id);
    const next = { ...row, ...SC.scanRow(h, { keyword: row.keyword, kind: row.kind, run_type: row.run_type, created_from: row.created_from }) };
    if (next.status === 'completed') {
      try { const comps = await ls.getHeatmapCompetitors(row.heatmap_id); next.competitors = SC.topCompetitors(comps, 10); } catch (e) { next.competitors_error = e.message; }
      if (row.kind === 'main' && row.run_type === 'baseline') {
        // The leader's Top 3% with the spacing line, from the same competitors response
        let leader = null;
        try { leader = SC.leaderLine(await ls.getHeatmapCompetitors(row.heatmap_id)); } catch (_) { leader = null; }
        next.leader = leader;
        await store.saveLeadsnapCompetitors(clientId, { at: new Date().toISOString(), keyword: row.keyword, heatmap_id: row.heatmap_id, competitors: next.competitors || [], leader });
      }
      // LeadSnap's own numeric place id, needed by the schedules, comes with the first completed heatmap
      if (h.place && h.place.id && settings && settings.place && !settings.place.leadsnap_place_id && saveClientValue) {
        settings.place.leadsnap_place_id = h.place.id;
        await saveClientValue(clientId, 'scan_settings', settings);
      }
    }
    await store.updateScan(clientId, row.heatmap_id, next);
    return next;
  }

  // The schedule's id and status from a create or list answer: the live API answers with an
  // array holding the schedule (the docs show it bare); data, schedule and heatmap_schedule
  // wrappers are read too
  function scheduleIdOf(made) {
    let o = made;
    if (Array.isArray(o)) o = o[0];
    if (o && typeof o === 'object') {
      if (o.data && typeof o.data === 'object') o = Array.isArray(o.data) ? o.data[0] : o.data;
      else if (o.schedule && typeof o.schedule === 'object') o = o.schedule;
      else if (o.heatmap_schedule && typeof o.heatmap_schedule === 'object') o = o.heatmap_schedule;
    }
    o = o && typeof o === 'object' ? o : {};
    return { id: o.id !== undefined && o.id !== null ? o.id : null, status: o.status || (o.schedule_config && o.schedule_config.status) || null };
  }
  // Stored items with no id get it from their raw create answer (no network), saved when any changed
  async function repairScheduleIds(clientId, data) {
    let changed = 0;
    for (const item of data.items || []) {
      if (item.schedule_id !== undefined && item.schedule_id !== null) continue;
      const found = scheduleIdOf(item.raw);
      if (found.id !== null) { item.schedule_id = found.id; item.status = found.status || item.status; item.id_from = 'the raw create answer'; changed++; }
    }
    if (changed) await store.saveSchedules(clientId, data);
    return changed;
  }
  // A stored schedule with no id gets it from LeadSnap's list, matched by name
  async function resolveScheduleIds(items) {
    const missing = items.filter(i => i.schedule_id === undefined || i.schedule_id === null);
    if (!missing.length) return 0;
    const ls = needLeadsnap();
    const listed = await ls.listSchedules();
    let fixed = 0;
    for (const item of missing) {
      const hit = listed.find(x => { const o = scheduleIdOf(x); const name = x.name || (x.heatmap_config && x.heatmap_config.name) || ''; return o.id !== null && name === item.name; });
      if (hit) { const o = scheduleIdOf(hit); item.schedule_id = o.id; item.status = o.status || item.status; item.id_from = 'the LeadSnap list, by name'; delete item.pause_error; fixed++; }
    }
    return fixed;
  }
  // The one monthly schedule, every keyword on the same clipped grid, once every baseline heatmap has completed
  async function ensureSchedules(clientId, settings, scans) {
    const ls = needLeadsnap();
    const data = await store.schedules(clientId);
    if (data.items.length) return data;
    const baseline = scans.filter(s => s.run_type === 'baseline');
    if (!baseline.length || baseline.some(s => s.status !== 'completed')) return data;
    if (!settings.place || !settings.place.leadsnap_place_id) return data;
    const keywords = settings.keywords.map(k => k.keyword);
    const body = SC.scheduleBody(settings, keywords, settings.points, { clientName: settings.client, baselineAt: baseline[0].created_at, locationId: settings.place.leadsnap_location_id });
    const made = await ls.createSchedule(body);
    // The live API wraps the created schedule (the docs show it bare): take the id wherever it sits,
    // and keep the raw answer so a missing id can be seen
    const found = scheduleIdOf(made);
    data.items.push({ keywords, keyword: keywords.join(', '), schedule_id: found.id, name: body.heatmap_config.name, status: found.status || 'active', repeat_on: body.schedule_config.repeat_on, created_at: new Date().toISOString(), raw: made });
    data.created_at = new Date().toISOString();
    await store.saveSchedules(clientId, data);
    return data;
  }
  const store = createGbpStore(pool);
  const rank = createRankScans({ pool, store, lf: localFalcon, locate: locateFn, search, saveClientValue: saveClientValue || (async () => {}), log });
  // The competitor runs as the panel, the note and competitors.json read them
  const competitorView = async clientId => {
    const runs = await store.competitorRuns(clientId);
    const hand = await store.competitorHand(clientId);
    const latest = runs[0] ? runs[0].run : null;
    const previous = runs[1] ? runs[1].run : null;
    return { latest, previous, comparison: compareRuns(latest, previous), hand, reading: latest ? primaryReading(latest, latest.primary, { hand }) : null, runs: runs.map(r => ({ at: r.run.at, keyword: r.run.keyword, average: r.run.average, count: (r.run.competitors || []).length })) };
  };
  const running = new Set();
  const wrap = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[gbp]', err); res.status(err.status || 500).json({ error: err.message }); }
  };
  const slugOf = async clientId => {
    const { rows } = await pool.query(`SELECT name FROM clients WHERE id=$1`, [clientId]);
    if (!rows.length) throw Object.assign(new Error('Client not found.'), { status: 404 });
    return slugify(rows[0].name);
  };
  const view = async (clientId, extra = {}) => {
    const slug = await slugOf(clientId);
    const found = await store.latest(clientId);
    const record = found ? found.record : null;
    const files = record ? Object.keys(filesFor(record)).reduce((o, f) => { o[f] = `/clients/${slug}/gbp/${f}`; return o; }, {}) : {};
    let readiness, profile = null, scans = null;
    const competitors = await competitorView(clientId);
    const duplicates = (await store.duplicates(clientId)) || { at: null, queries: [], duplicates: [], marks: {} };
    const landing = await store.landingPage(clientId);
    const leadsnapCompetitors = await store.leadsnapCompetitors(clientId);
    const rankCompetitors = await store.rankCompetitors(clientId);
    const profileCheck = await store.profileCheck(clientId);
    if (competitors.latest) files['competitors.json'] = `/clients/${slug}/gbp/competitors.json`;
    if (duplicates.at) files['duplicates.json'] = `/clients/${slug}/gbp/duplicates.json`;
    if (landing) files['landing_page.json'] = `/clients/${slug}/gbp/landing_page.json`;
    if (leadsnapCompetitors) files['competitors_leadsnap.json'] = `/clients/${slug}/gbp/competitors_leadsnap.json`;
    if (rankCompetitors) files['rank_competitors.json'] = `/clients/${slug}/gbp/rank_competitors.json`;
    if (profileCheck) files['profile_check.json'] = `/clients/${slug}/gbp/profile_check.json`;
    try {
      const I = await loadInputs(clientId);
      const cv = I.validatorCtx.cv || {};
      readiness = { ok: I.locked.length > 0, locked: I.locked.length, minServices: I.minServices, competitorCount: I.competitorCount, showPrices: I.showPrices, siteUrl: I.siteUrl, withCopy: Object.keys(I.included).length, flags: I.flags, town: I.town, name: I.name, ownPlaceId: cv.gbp_place_id || '', leadsnap: !!leadsnap, rank_provider: provider, local_falcon: !!localFalcon, scans_on: lfOn ? !!localFalcon : !!leadsnap };
      if (!I.locked.length) readiness.flags = [...I.flags, { code: 'GBP-NO-SERVICES', msg: 'The page map has no service pages.' }];
      if (!cv.gbp_place_id) readiness.flags = [...(readiness.flags || []), { code: 'GBP-NO-PLACE-ID', msg: 'Place ID missing: find and confirm the Google listing on the Record tab (Google listing). Rank scans match by place ID only.' }];
      scans = await scansView(clientId, cv);
      if (scans.count || scans.superseded) { files['scans.json'] = `/clients/${slug}/gbp/scans.json`; }
      if (scans.schedules.items.length) files['schedules.json'] = `/clients/${slug}/gbp/schedules.json`;
      // The profile fields, NAP, note and templates: live, so a changed value shows at once
      profile = buildProfile({ inputs: I, record, competitors, scanAlerts: scans.alerts });
      files['nap.json'] = `/clients/${slug}/gbp/nap.json`;
      files['note.txt'] = `/clients/${slug}/gbp/note.txt`;
    } catch (e) { readiness = { ok: false, error: e.message, flags: [] }; }
    // rules: the validator round the live app runs (3: the description's category cap and openings, 23 Oct)
    return { slug, record, files, readiness, profile, competitors, duplicates, landing, scans, leadsnapCompetitors, rankCompetitors, profileCheck, running: running.has(clientId), rules: 3, ...extra };
  };

  app.get('/api/clients/:clientId/gbp', wrap(async (req, res) => res.json(await view(req.params.clientId))));

  app.post('/api/clients/:clientId/gbp/generate', wrap(async (req, res) => {
    const { clientId } = req.params;
    if (running.has(clientId)) throw Object.assign(new Error('A GBP run is already in progress for this client.'), { status: 409 });
    running.add(clientId);
    try {
      const I = await loadInputs(clientId);
      if (!I.locked.length) throw Object.assign(new Error('The page map has no service pages, so there is nothing to build the GBP services from.'), { status: 400 });
      const found = await store.latest(clientId);
      // Resume a record with a step still to do; a finished one starts again from the description
      const allDone = found && STEPS.every(s => found.record.steps && found.record.steps[s] && found.record.steps[s].status === 'done');
      const before = found && !allDone ? found.record : null;
      const { record, failedStep } = await runGbp({ inputs: I, record: before, callModel, log: m => log.log(m) });
      await store.save(clientId, record);
      log.log(`[gbp] ${clientId}: ${failedStep ? `failed at ${failedStep}` : 'all three steps done'}`);
      res.json(await view(clientId, { failedStep }));
    } finally { running.delete(clientId); }
  }));

  app.post('/api/clients/:clientId/gbp/clear', wrap(async (req, res) => {
    await store.clear(req.params.clientId);
    res.json(await view(req.params.clientId));
  }));

  // ── Batch 2: the competitor check (then the duplicate finder), duplicate marks, the landing page check ──
  app.post('/api/clients/:clientId/gbp/competitors', wrap(async (req, res) => {
    const { clientId } = req.params;
    const I = await loadInputs(clientId);
    const cv = I.validatorCtx.cv || {};
    const dirs = directoryDomains ? await directoryDomains().catch(() => null) : null;
    const run = await runCompetitorCheck({ primary: I.primary, town: I.town, clientName: cv.company_name, clientPhone: cv.phone, ownPlaceId: cv.gbp_place_id || '', search, directoryDomains: dirs });
    await store.addCompetitorRun(clientId, run);
    // The client's own listing found here is not saved (9 Nov): only the place ID step's confirm on the Record tab sets gbp_place_id
    const dup = await findDuplicates({ clientName: cv.company_name, clientPhone: cv.phone, town: I.town, ownPlaceId: cv.gbp_place_id || (run.own && run.own.place_id) || '', search });
    const before = (await store.duplicates(clientId)) || { marks: {} };
    await store.saveDuplicates(clientId, { ...dup, marks: before.marks || {} });
    log.log(`[gbp] competitor check for ${clientId}: "${run.keyword}", ${run.competitors.length} competitors, ${run.skipped.length} skipped, ${dup.duplicates.length} possible duplicates`);
    res.json(await view(clientId));
  }));

  // The GBP primary category typed by hand for a competitor (blank clears it)
  app.put('/api/clients/:clientId/gbp/competitors/:placeId', wrap(async (req, res) => {
    const { clientId, placeId } = req.params;
    const value = String((req.body || {}).gbp_primary || '').trim().slice(0, 80);
    const hand = await store.competitorHand(clientId);
    if (value) hand[placeId] = { gbp_primary: value, at: new Date().toISOString() }; else delete hand[placeId];
    await store.saveCompetitorHand(clientId, hand);
    res.json(await view(clientId));
  }));

  // ── Batch 3: LeadSnap rank scans ──
  // Confirms the base URL and the token with list companies; the first call to make
  app.get('/api/leadsnap/ping', wrap(async (req, res) => {
    const ls = needLeadsnap();
    const t0 = Date.now();
    try {
      const companies = await ls.listCompanies();
      res.json({ ok: true, base_url: ls.baseUrl, companies: companies.length, first: companies[0] ? { id: companies[0].id, name: companies[0].name } : null, ms: Date.now() - t0 });
    } catch (e) { res.status(200).json({ ok: false, base_url: ls.baseUrl, error: e.message, leadsnap_status: e.leadsnap_status || null, ms: Date.now() - t0 }); }
  }));

  // The confirm step: the settings and the credit cost, nothing created
  app.post('/api/clients/:clientId/gbp/scans/preview', wrap(async (req, res) => {
    const { clientId } = req.params;
    const I = await loadInputs(clientId);
    // ?fresh=1: the settings a reset would lock, ignoring the current lock
    const fresh = String(req.query.fresh || '') === '1';
    if (lfOn) return res.json({ provider, ...(await rank.preview(clientId, I, { fresh })) });
    needLeadsnapScans();
    const { settings, saved } = await scanSettingsFor(clientId, I, { fresh });
    res.json({ provider, settings, saved, credits: SC.creditCost(settings) });
  }));

  // The baseline: one heatmap per keyword, settings saved and locked, rows pending until refresh
  async function runBaseline(clientId, I, settings) {
    const ls = needLeadsnap();
    settings.locked = true; settings.locked_at = new Date().toISOString();
    if (saveClientValue) await saveClientValue(clientId, 'scan_settings', settings);
    const created = [];
    for (const k of settings.keywords) {
      const h = await ls.createHeatmap(SC.heatmapBody(settings, k.keyword));
      const row = SC.scanRow(h, { keyword: k.keyword, kind: k.kind, run_type: 'baseline' });
      if (!row.created_at) { row.created_at = new Date().toISOString(); row.month = SC.monthOf(row.created_at); }
      await store.addScan(clientId, row);
      created.push({ keyword: k.keyword, heatmap_id: row.heatmap_id, status: row.status });
    }
    log.log(`[gbp] baseline scan for ${clientId}: ${created.length} heatmaps created (${SC.creditCost(settings)} credits)`);
    return created;
  }
  app.post('/api/clients/:clientId/gbp/scans/baseline', wrap(async (req, res) => {
    const { clientId } = req.params;
    if (!(req.body || {}).confirm) throw Object.assign(new Error('The baseline needs confirm: true (the confirm step shows the settings and the credit cost).'), { status: 400 });
    const I = await loadInputs(clientId);
    if (lfOn) { if (!localFalcon) throw Object.assign(new Error('Local Falcon is not configured on this server (LOCALFALCON_API_KEY).'), { status: 503 }); const created = await rank.baseline(clientId, I); log.log(`[gbp] Local Falcon baseline for ${clientId}: ${created.length} scans started`); return res.json(await view(clientId, { created })); }
    needLeadsnapScans();
    const existing = SC.live(await store.scans(clientId));
    if (existing.some(s => s.run_type === 'baseline')) throw Object.assign(new Error('A baseline exists for this client. Hard rule 8: the settings are locked; monthly scans come from the schedules. Use Reset baseline to start again.'), { status: 409 });
    const { settings } = await scanSettingsFor(clientId, I);
    const created = await runBaseline(clientId, I, settings);
    res.json(await view(clientId, { created }));
  }));

  // Reset baseline (Brandon, 23 Oct): pause the schedules, mark every stored scan superseded,
  // clear the lock and run a new baseline on fresh settings. The old rows stay stored.
  app.post('/api/clients/:clientId/gbp/scans/reset', wrap(async (req, res) => {
    const { clientId } = req.params;
    if (!(req.body || {}).confirm) throw Object.assign(new Error('The reset needs confirm: true (the confirm step shows the new settings and the credit cost).'), { status: 400 });
    if (lfOn) {
      if (!localFalcon) throw Object.assign(new Error('Local Falcon is not configured on this server (LOCALFALCON_API_KEY).'), { status: 503 });
      const r = await rank.reset(clientId, await loadInputs(clientId));
      log.log(`[gbp] Local Falcon baseline reset for ${clientId}: ${r.superseded} scans superseded, ${r.created.length} scans started`);
      return res.json(await view(clientId, { created: r.created, superseded: r.superseded, paused: [] }));
    }
    const ls = needLeadsnapScans();
    const I = await loadInputs(clientId);
    const cv = I.validatorCtx.cv || {};
    const at = new Date().toISOString();
    // Schedules: paused on LeadSnap and kept as the previous set (an id missing from the create
    // answer is looked up by name first)
    const sched = await store.schedules(clientId);
    await resolveScheduleIds(sched.items).catch(e => log.error('[gbp] schedule ids not resolved:', e.message));
    const paused = [];
    for (const item of sched.items) {
      if (item.schedule_id === undefined || item.schedule_id === null) { item.pause_error = 'no schedule id: not found on LeadSnap by name'; continue; }
      if (item.status !== 'paused') { try { await ls.pauseSchedule(item.schedule_id); item.status = 'paused'; item.paused_at = at; paused.push(item.schedule_id); } catch (e) { item.pause_error = e.message; } }
    }
    const previous = { ...sched, superseded_at: at };
    await store.saveSchedules(clientId, { items: [], last_fetch_at: null, previous: [...(sched.previous || []), previous] });
    // Scans: every live row superseded
    let superseded = 0;
    for (const row of SC.live(await store.scans(clientId))) { await store.updateScan(clientId, row.heatmap_id, { ...row, superseded: true, superseded_at: at }); superseded++; }
    // The lock cleared, then a fresh baseline
    if (saveClientValue) await saveClientValue(clientId, 'scan_settings', null);
    const I2 = { ...I, validatorCtx: { ...I.validatorCtx, cv: { ...cv, scan_settings: null } } };
    const { settings } = await scanSettingsFor(clientId, I2, { fresh: true });
    settings.reset_from = cv.scan_settings ? { locked_at: cv.scan_settings.locked_at || null, keywords: (cv.scan_settings.keywords || []).map(k => k.keyword) } : null;
    const created = await runBaseline(clientId, I2, settings);
    log.log(`[gbp] baseline reset for ${clientId}: ${paused.length} schedules paused, ${superseded} scans superseded, ${created.length} heatmaps created`);
    res.json(await view(clientId, { created, paused, superseded }));
  }));

  // Settle pending heatmaps (reads only); create the schedules once the baseline is complete
  app.post('/api/clients/:clientId/gbp/scans/refresh', wrap(async (req, res) => {
    const { clientId } = req.params;
    const I = await loadInputs(clientId);
    const cv = I.validatorCtx.cv || {};
    const settings = cv.scan_settings || null;
    if (lfOn) { const settled = localFalcon ? await rank.settle(clientId, settings) : []; return res.json(await view(clientId, { settled })); }
    const scans = SC.live(await store.scans(clientId));
    const settled = [];
    for (const row of scans.filter(s => s.status !== 'completed' && s.status !== 'failed')) {
      try { settled.push(await settleScan(clientId, row, settings, cv)); } catch (e) { settled.push({ ...row, error: e.message }); }
    }
    let schedules = null;
    if (settings) { try { schedules = await ensureSchedules(clientId, settings, SC.live(await store.scans(clientId))); } catch (e) { log.error('[gbp] schedules not created:', e.message); schedules = { error: e.message }; } }
    res.json(await view(clientId, { settled: settled.map(s => ({ heatmap_id: s.heatmap_id, status: s.status, error: s.error || null })), schedules_result: schedules }));
  }));

  // The monthly results: heatmaps for the client's place since the last fetch, each completed one stored
  app.post('/api/clients/:clientId/gbp/scans/fetch', wrap(async (req, res) => {
    const { clientId } = req.params;
    if (lfOn) {
      // The manual Fetch: every pending report read back (free); the daily job does the same
      if (!localFalcon) throw Object.assign(new Error('Local Falcon is not configured on this server (LOCALFALCON_API_KEY).'), { status: 503 });
      const I = await loadInputs(clientId);
      const settled = await rank.settle(clientId, (I.validatorCtx.cv || {}).scan_settings);
      return res.json(await view(clientId, { settled, added: settled.filter(x => x.status === 'completed') }));
    }
    const ls = needLeadsnapScans();
    const I = await loadInputs(clientId);
    const cv = I.validatorCtx.cv || {};
    const settings = cv.scan_settings;
    if (!settings || !settings.place || !settings.place.google_place_id) throw Object.assign(new Error('No baseline scan yet: run it first.'), { status: 400 });
    const data = await store.schedules(clientId);
    const since = data.last_fetch_at ? String(data.last_fetch_at).slice(0, 10) : String(settings.locked_at || settings.built_at).slice(0, 10);
    const known = new Set((await store.scans(clientId)).map(s => String(s.heatmap_id)));
    const ours = new Set(settings.keywords.map(k => k.keyword.toLowerCase()));
    const listed = await ls.listHeatmaps({ 'filter[google_place_id]': settings.place.google_place_id, 'filter[status]': 'completed', 'filter[created_at][start_date]': since, per_page: 100 });
    const added = [];
    for (const h of ls.rows(listed)) {
      if (known.has(String(h.id)) || !ours.has(String(h.keyword || '').toLowerCase())) continue;
      const k = settings.keywords.find(x => x.keyword.toLowerCase() === String(h.keyword).toLowerCase());
      const full = await ls.getHeatmap(h.id);
      const row = SC.scanRow(full, { keyword: k.keyword, kind: k.kind, run_type: 'monthly', created_from: 'schedule' });
      try { row.competitors = SC.topCompetitors(await ls.getHeatmapCompetitors(h.id), 10); } catch (e) { row.competitors_error = e.message; }
      await store.addScan(clientId, row);
      added.push({ heatmap_id: row.heatmap_id, keyword: row.keyword, month: row.month, top_3_percentage: row.top_3_percentage });
    }
    data.last_fetch_at = new Date().toISOString();
    await store.saveSchedules(clientId, data);
    log.log(`[gbp] fetched scans for ${clientId}: ${added.length} new since ${since}`);
    res.json(await view(clientId, { added }));
  }));

  // Pause every schedule from before a reset that is still active on LeadSnap (ids looked up by name)
  app.post('/api/clients/:clientId/gbp/schedules/pause-previous', wrap(async (req, res) => {
    const { clientId } = req.params;
    const ls = needLeadsnap();   // allowed with Local Falcon on: it only pauses old LeadSnap schedules
    const data = await store.schedules(clientId);
    const result = [];
    for (const set of data.previous || []) {
      await resolveScheduleIds(set.items).catch(e => log.error('[gbp] previous schedule ids not resolved:', e.message));
      for (const item of set.items) {
        if (item.status === 'paused') { result.push({ name: item.name, status: 'paused' }); continue; }
        if (item.schedule_id === undefined || item.schedule_id === null) { result.push({ name: item.name, status: 'unknown', error: 'not found on LeadSnap by name' }); continue; }
        try { await ls.pauseSchedule(item.schedule_id); item.status = 'paused'; item.paused_at = new Date().toISOString(); delete item.pause_error; result.push({ name: item.name, schedule_id: item.schedule_id, status: 'paused' }); }
        catch (e) { item.pause_error = e.message; result.push({ name: item.name, schedule_id: item.schedule_id, status: item.status, error: e.message }); }
      }
    }
    await store.saveSchedules(clientId, data);
    res.json(await view(clientId, { paused_previous: result }));
  }));

  app.post('/api/clients/:clientId/gbp/schedules/:scheduleId/:action', wrap(async (req, res) => {
    const { clientId, scheduleId, action } = req.params;
    if (!['pause', 'resume'].includes(action)) throw Object.assign(new Error('The action is pause or resume.'), { status: 400 });
    const ls = needLeadsnap();
    const result = action === 'pause' ? await ls.pauseSchedule(scheduleId) : await ls.resumeSchedule(scheduleId);
    const data = await store.schedules(clientId);
    const item = data.items.find(i => String(i.schedule_id) === String(scheduleId));
    if (item) { item.status = (result && result.status) || (action === 'pause' ? 'paused' : 'active'); item.updated_at = new Date().toISOString(); }
    await store.saveSchedules(clientId, data);
    res.json(await view(clientId));
  }));

  // ── The place ID step (gbp/place-id.js): find, check, confirm. Only the confirm writes. ──
  // placeDetails(placeId) → a place with its phone, for a pasted ID
  const clientValuesOf = async clientId => {
    const { rows } = await pool.query(`SELECT content FROM client_assets WHERE client_id=$1 AND asset_type='client_values' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    if (!rows.length) return {};
    try { return typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content || {}; } catch (_) { return {}; }
  };
  const placeView = async clientId => {
    const cv = await clientValuesOf(clientId);
    const { rows } = await pool.query(`SELECT name FROM clients WHERE id=$1`, [clientId]);
    if (!rows.length) throw Object.assign(new Error('Client not found.'), { status: 404 });
    let town = '';
    try { town = (await loadInputs(clientId)).town || ''; } catch (_) { town = ''; }
    const lookup = (await store.placeLookup(clientId)) || null;
    const name = cv.company_name || rows[0].name;
    return { place_id: cv.gbp_place_id || '', address_type: cv.gbp_address_type || '', confirmed: cv.gbp_place_confirmed || null, phone: cv.phone || '', name, town, query: [name, town].filter(Boolean).join(' '), lookup, places_on: !!search, details_on: !!placeDetails };
  };
  app.get('/api/clients/:clientId/place-id', wrap(async (req, res) => res.json(await placeView(req.params.clientId))));
  // One Places text search (no Local Falcon credits): the top matches, the phone match pre-selected
  app.post('/api/clients/:clientId/place-id/search', wrap(async (req, res) => {
    const { clientId } = req.params;
    const v = await placeView(clientId);
    const q = String((req.body || {}).q || v.query || '').trim().slice(0, 120);
    if (!q) throw Object.assign(new Error('No business name to search for: type one.'), { status: 400 });
    const found = PID.rankCandidates(await search(q), { phone: v.phone });
    const prev = (await store.placeLookup(clientId)) || {};
    await store.savePlaceLookup(clientId, { ...prev, at: new Date().toISOString(), q, ...found });
    log.log(`[gbp] place ID search for ${clientId}: "${q}", ${found.candidates.length} matches, ${found.phone_matches} with the record's phone`);
    res.json(await placeView(clientId));
  }));
  // A pasted place ID looked up (one Place Details call), so the person sees what they confirm
  app.post('/api/clients/:clientId/place-id/check', wrap(async (req, res) => {
    const { clientId } = req.params;
    const pid = String((req.body || {}).place_id || '').trim();
    if (!/^[A-Za-z0-9_-]{10,}$/.test(pid)) throw Object.assign(new Error('That does not look like a Google place ID (it usually starts ChIJ).'), { status: 400 });
    if (!placeDetails) throw Object.assign(new Error('Google Places is not configured on the server (GOOGLE_PLACES_API_KEY).'), { status: 503 });
    const v = await placeView(clientId);
    const p = await placeDetails(pid);
    const found = PID.rankCandidates([p], { phone: v.phone }).candidates[0] || null;
    const prev = (await store.placeLookup(clientId)) || {};
    await store.savePlaceLookup(clientId, { ...prev, checked: found ? { ...found, at: new Date().toISOString() } : null });
    res.json(await placeView(clientId));
  }));
  // The confirm: a person's click. Saves gbp_place_id and gbp_address_type, only for a place this step showed
  app.post('/api/clients/:clientId/place-id/confirm', wrap(async (req, res) => {
    const { clientId } = req.params;
    const b = req.body || {};
    if (b.confirm !== true) throw Object.assign(new Error('The place ID needs a person to confirm it (confirm: true).'), { status: 400 });
    if (!['service_area', 'storefront'].includes(b.address_type)) throw Object.assign(new Error('Choose the GBP address type: service_area (address hidden) or storefront.'), { status: 400 });
    if (!saveClientValue) throw Object.assign(new Error('Saving client values is not available here.'), { status: 503 });
    const lookup = (await store.placeLookup(clientId)) || {};
    const saved = await clientValuesOf(clientId);
    const current = saved.gbp_place_id && saved.gbp_place_confirmed && saved.gbp_place_confirmed.place_id === saved.gbp_place_id ? { ...saved.gbp_place_confirmed, place_id: saved.gbp_place_id, suggested_address_type: { value: saved.gbp_place_confirmed.suggested || '' } } : null;
    const shown = [...(lookup.candidates || []), ...(lookup.checked ? [lookup.checked] : []), ...(current ? [current] : [])].find(c => c.place_id === b.place_id);
    if (!shown) throw Object.assign(new Error('That place ID was not shown by the search or the check: search or check it first, then confirm.'), { status: 400 });
    await saveClientValue(clientId, 'gbp_place_id', shown.place_id);
    await saveClientValue(clientId, 'gbp_address_type', b.address_type);
    await saveClientValue(clientId, 'gbp_place_confirmed', { at: new Date().toISOString(), by: String(b.by || '').slice(0, 80) || null, place_id: shown.place_id, name: shown.name, address: shown.address, phone: shown.phone, phone_match: shown.phone_match, address_type: b.address_type, suggested: shown.suggested_address_type && shown.suggested_address_type.value });
    log.log(`[gbp] place ID confirmed for ${clientId}: ${shown.place_id} (${shown.name}), ${b.address_type}`);
    res.json(await placeView(clientId));
  }));

  // A rank scan alert cleared by hand (low credits, a skipped monthly scan)
  app.post('/api/rank-scans/alerts/:id/clear', wrap(async (req, res) => { await rank.clearAlert(req.params.id); res.json({ ok: true }); }));

  // Profile verification (SOP 3.10): the LeadSnap location against what Copybot built
  app.post('/api/clients/:clientId/gbp/verify-profile', wrap(async (req, res) => {
    const { clientId } = req.params;
    const ls = needLeadsnap();
    const I = await loadInputs(clientId);
    const cv = I.validatorCtx.cv || {};
    const found = await leadsnapLocationFor(cv);
    if (!found) throw Object.assign(new Error('The client is not on LeadSnap under its place id, phone or name.'), { status: 404 });
    const location = await ls.getLocation(found.location.id);
    const rec = await store.latest(clientId);
    const svc = rec && rec.record.steps.services && rec.record.steps.services.status === 'done' ? rec.record.steps.services.output.services.map(s => s.service) : I.locked.map(l => l.service);
    const result = checkProfile({ location, ours: { primary: I.primary, secondaries: I.secondaries, services: svc, hours: cv.hours || '' } });
    result.matched_by = found.how;
    result.services_source = rec && rec.record.steps.services && rec.record.steps.services.status === 'done' ? 'services.csv (locked and variants)' : 'the page map (no GBP services generated yet)';
    await store.saveProfileCheck(clientId, result);
    log.log(`[gbp] profile check for ${clientId}: ${result.counts.missing} missing, ${result.counts.extra} extra, ${result.counts.mismatch} mismatch`);
    res.json(await view(clientId));
  }));

  app.put('/api/clients/:clientId/gbp/duplicates/:placeId', wrap(async (req, res) => {
    const { clientId, placeId } = req.params;
    const mark = String((req.body || {}).mark || '');
    if (!['reported', 'ignore', ''].includes(mark)) throw Object.assign(new Error('The mark is "reported", "ignore" or blank.'), { status: 400 });
    const data = (await store.duplicates(clientId)) || { at: null, queries: [], duplicates: [], marks: {} };
    data.marks = data.marks || {};
    if (mark) data.marks[placeId] = { mark, at: new Date().toISOString() }; else delete data.marks[placeId];
    await store.saveDuplicates(clientId, data);
    res.json(await view(clientId));
  }));

  app.post('/api/clients/:clientId/gbp/landing-page', wrap(async (req, res) => {
    const { clientId } = req.params;
    const I = await loadInputs(clientId);
    const cv = I.validatorCtx.cv || {};
    const p = buildProfile({ inputs: I, record: null });
    // The client's position for the map signal: the saved listing, else the address, else the main town
    let location = null;
    try { location = await locateFn({ placeId: cv.gbp_place_id || '', address: cv.address || '', town: I.town ? `${I.town}, UK` : '' }); }
    catch (e) { log.error('[gbp] client location for the map check failed:', e.message); }
    const result = await checkLandingPage({ url: I.siteUrl, primary: I.primary, town: I.town, secondaries: I.secondaries, nap: { name: p.nap.name, phone: p.nap.phone, address: p.nap.address || cv.address || '' }, hiddenAddress: !p.nap.address, client: { placeId: cv.gbp_place_id || '', location }, fetchHtmlFn: fetchPage });
    await store.saveLandingPage(clientId, result);
    // The fails go on the client record, so the internal note reads them (a typed value is replaced)
    if (saveClientValue) await saveClientValue(clientId, 'landing_page_fails', result.fails.join('; '));
    log.log(`[gbp] landing page check for ${clientId}: ${result.passed} of ${result.of} pass at ${result.final_url}`);
    res.json(await view(clientId));
  }));

  app.get('/clients/:slug/gbp/:file', wrap(async (req, res) => {
    const { slug, file } = req.params;
    if (!CONTENT_TYPES[file]) throw Object.assign(new Error(`No such GBP file. The files are ${Object.keys(CONTENT_TYPES).join(', ')}.`), { status: 404 });
    const { rows } = await pool.query(`SELECT id, name FROM clients`);
    const client = rows.find(r => slugify(r.name) === slug);
    if (!client) throw Object.assign(new Error('No client with that slug.'), { status: 404 });
    const found = await store.latest(client.id);
    let files = found ? filesFor(found.record) : {};
    if (file === 'nap.json' || file === 'note.txt') { const I = await loadInputs(client.id); files = profileFiles(I, found ? found.record : null, await competitorView(client.id), (await scansView(client.id, I.validatorCtx.cv)).alerts); }
    if (file === 'competitors.json') { const c = await competitorView(client.id); if (c.latest) files = { 'competitors.json': JSON.stringify(c, null, 2) }; }
    if (file === 'scans.json') { const I = await loadInputs(client.id); const s = await scansView(client.id, I.validatorCtx.cv); const all = await store.scans(client.id); if (all.length) files = { 'scans.json': JSON.stringify({ provider: s.provider, settings: s.settings, table: s.table, alerts: s.alerts, scans: s.scans, superseded: s.history, claims: s.claims || [] }, null, 2) }; }
    if (file === 'schedules.json') { const s = await store.schedules(client.id); if (s.items.length) files = { 'schedules.json': JSON.stringify(s, null, 2) }; }
    if (file === 'competitors_leadsnap.json') { const c = await store.leadsnapCompetitors(client.id); if (c) files = { 'competitors_leadsnap.json': JSON.stringify(c, null, 2) }; }
    if (file === 'rank_competitors.json') { const c = await store.rankCompetitors(client.id); if (c) files = { 'rank_competitors.json': JSON.stringify(c, null, 2) }; }
    if (file === 'profile_check.json') { const p = await store.profileCheck(client.id); if (p) files = { 'profile_check.json': JSON.stringify(p, null, 2) }; }
    if (file === 'duplicates.json') { const d = await store.duplicates(client.id); if (d) files = { 'duplicates.json': JSON.stringify(d, null, 2) }; }
    if (file === 'landing_page.json') { const l = await store.landingPage(client.id); if (l) files = { 'landing_page.json': JSON.stringify(l, null, 2) }; }
    if (!(file in files)) throw Object.assign(new Error(found ? `${file} is not ready: that step has not passed yet.` : 'No GBP output has been generated for this client.'), { status: 404 });
    res.set('Content-Type', CONTENT_TYPES[file]);
    res.set('Content-Disposition', `inline; filename="${file}"`);
    res.send(files[file]);
  }));

  return { store, running, STEPS, rank };
}

module.exports = { mountGbpApi, CONTENT_TYPES };
