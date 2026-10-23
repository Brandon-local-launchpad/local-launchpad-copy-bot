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

const CONTENT_TYPES = { 'description.txt': 'text/plain; charset=utf-8', 'services.csv': 'text/csv; charset=utf-8', 'products.csv': 'text/csv; charset=utf-8', 'validation.json': 'application/json; charset=utf-8', 'nap.json': 'application/json; charset=utf-8', 'note.txt': 'text/plain; charset=utf-8', 'competitors.json': 'application/json; charset=utf-8', 'duplicates.json': 'application/json; charset=utf-8', 'landing_page.json': 'application/json; charset=utf-8', 'scans.json': 'application/json; charset=utf-8', 'schedules.json': 'application/json; charset=utf-8', 'competitors_leadsnap.json': 'application/json; charset=utf-8', 'profile_check.json': 'application/json; charset=utf-8' };

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
function mountGbpApi(app, { pool, loadInputs, callModel, log = console, search = q => searchPlaces(q), fetchPage = fetchHtml, saveClientValue = null, locate = null, leadsnap = null }) {
  const locateFn = locate || (args => locateClient({ ...args, search }));
  const needLeadsnap = () => { if (!leadsnap) throw Object.assign(new Error('LeadSnap is not configured on this server (LEADSNAP_API_TOKEN).'), { status: 503 }); return leadsnap; };

  // The scans as the panel, the note and scans.json read them: the settings, the rows, the
  // monthly table against the baseline, the drop alerts, what is still pending
  const scansView = async (clientId, cv = null) => {
    const scans = await store.scans(clientId);
    const settings = cv && cv.scan_settings && typeof cv.scan_settings === 'object' ? cv.scan_settings : null;
    const schedules = await store.schedules(clientId);
    return { settings, scans, table: SC.monthlyTable(scans), alerts: SC.dropAlerts(scans), pending: scans.filter(s => s.status !== 'completed' && s.status !== 'failed').length, schedules, count: scans.length };
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
  async function scanSettingsFor(clientId, I) {
    const cv = I.validatorCtx.cv || {};
    if (cv.scan_settings && cv.scan_settings.locked) return { settings: cv.scan_settings, saved: true };
    const found = await leadsnapLocationFor(cv);
    let centre = null, place = null;
    const finite = v => Number.isFinite(Number(v)) && Number(v) !== 0;
    if (found) {
      const L = found.location;
      place = { google_place_id: L.place_id || cv.gbp_place_id || '', leadsnap_location_id: L.id, leadsnap_place_id: null, name: L.location_name || L.name || '', how: found.how };
      // A service area business often has no position on LeadSnap (0, 0 or null): the
      // listing by place id, else the address, else the main town, through Places
      if (finite(L.latitude) && finite(L.longitude)) centre = { lat: Number(L.latitude), lng: Number(L.longitude), from: `LeadSnap location "${place.name}" (matched by ${found.how})` };
      else {
        const loc = await locateFn({ placeId: place.google_place_id || '', address: cv.address || '', town: I.town ? `${I.town}, UK` : '' });
        if (!loc) throw Object.assign(new Error(`The LeadSnap location "${place.name}" has no position, and the address and main town did not resolve, so there is no centre for the grid.`), { status: 400 });
        centre = { ...loc, from: `${loc.from} (the LeadSnap location "${place.name}" has no position)` };
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
        Object.assign(a, { found_lat: a.lat, found_lng: a.lng, lat: null, lng: null, note: `found ${Math.round(a.km)} km from the centre (${a.found || 'another place of that name'}; the towns sit ${median} km away on average); left out of the radius` });
      }
    }
    const settings = SC.buildScanSettings({ clientName: I.name, primary: I.primary, town: I.town, jobsWanted: cv.jobs_wanted || [], locked: I.locked, categories: I.categories, centre, areas, place });
    settings.areas = areas;
    settings.notes = areas.filter(a => a.note || a.error).map(a => `${a.name}: ${a.note || a.error}`);
    return { settings, saved: false };
  }

  // Fetch a pending heatmap; store it when completed (scores, points, competitors)
  async function settleScan(clientId, row, settings, cv) {
    const ls = needLeadsnap();
    const h = await ls.getHeatmap(row.heatmap_id);
    const next = { ...row, ...SC.scanRow(h, { keyword: row.keyword, kind: row.kind, run_type: row.run_type, created_from: row.created_from }) };
    if (next.status === 'completed') {
      try { const comps = await ls.getHeatmapCompetitors(row.heatmap_id); next.competitors = SC.topCompetitors(comps, 10); } catch (e) { next.competitors_error = e.message; }
      if (row.kind === 'main' && row.run_type === 'baseline') await store.saveLeadsnapCompetitors(clientId, { at: new Date().toISOString(), keyword: row.keyword, heatmap_id: row.heatmap_id, competitors: next.competitors || [] });
      // LeadSnap's own numeric place id, needed by the schedules, comes with the first completed heatmap
      if (h.place && h.place.id && settings && settings.place && !settings.place.leadsnap_place_id && saveClientValue) {
        settings.place.leadsnap_place_id = h.place.id;
        await saveClientValue(clientId, 'scan_settings', settings);
      }
    }
    await store.updateScan(clientId, row.heatmap_id, next);
    return next;
  }

  // One monthly schedule per keyword once every baseline heatmap has completed
  async function ensureSchedules(clientId, settings, scans) {
    const ls = needLeadsnap();
    const data = await store.schedules(clientId);
    if (data.items.length) return data;
    const baseline = scans.filter(s => s.run_type === 'baseline');
    if (!baseline.length || baseline.some(s => s.status !== 'completed')) return data;
    if (!settings.place || !settings.place.leadsnap_place_id) return data;
    for (const s of baseline) {
      const body = SC.scheduleBody(settings, s.keyword, s.points || [], { clientName: settings.client, baselineAt: s.created_at, locationId: settings.place.leadsnap_location_id });
      const made = await ls.createSchedule(body);
      data.items.push({ keyword: s.keyword, kind: s.kind, schedule_id: made.id, name: body.heatmap_config.name, status: made.status || 'active', repeat_on: body.schedule_config.repeat_on, created_at: new Date().toISOString() });
    }
    data.created_at = new Date().toISOString();
    await store.saveSchedules(clientId, data);
    return data;
  }
  const store = createGbpStore(pool);
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
    const profileCheck = await store.profileCheck(clientId);
    if (competitors.latest) files['competitors.json'] = `/clients/${slug}/gbp/competitors.json`;
    if (duplicates.at) files['duplicates.json'] = `/clients/${slug}/gbp/duplicates.json`;
    if (landing) files['landing_page.json'] = `/clients/${slug}/gbp/landing_page.json`;
    if (leadsnapCompetitors) files['competitors_leadsnap.json'] = `/clients/${slug}/gbp/competitors_leadsnap.json`;
    if (profileCheck) files['profile_check.json'] = `/clients/${slug}/gbp/profile_check.json`;
    try {
      const I = await loadInputs(clientId);
      const cv = I.validatorCtx.cv || {};
      readiness = { ok: I.locked.length > 0, locked: I.locked.length, minServices: I.minServices, competitorCount: I.competitorCount, showPrices: I.showPrices, siteUrl: I.siteUrl, withCopy: Object.keys(I.included).length, flags: I.flags, town: I.town, name: I.name, ownPlaceId: cv.gbp_place_id || '', leadsnap: !!leadsnap };
      if (!I.locked.length) readiness.flags = [...I.flags, { code: 'GBP-NO-SERVICES', msg: 'The page map has no service pages.' }];
      scans = await scansView(clientId, cv);
      if (scans.count) { files['scans.json'] = `/clients/${slug}/gbp/scans.json`; }
      if (scans.schedules.items.length) files['schedules.json'] = `/clients/${slug}/gbp/schedules.json`;
      // The profile fields, NAP, note and templates: live, so a changed value shows at once
      profile = buildProfile({ inputs: I, record, competitors, scanAlerts: scans.alerts });
      files['nap.json'] = `/clients/${slug}/gbp/nap.json`;
      files['note.txt'] = `/clients/${slug}/gbp/note.txt`;
    } catch (e) { readiness = { ok: false, error: e.message, flags: [] }; }
    // rules: the validator round the live app runs (3: the description's category cap and openings, 23 Oct)
    return { slug, record, files, readiness, profile, competitors, duplicates, landing, scans, leadsnapCompetitors, profileCheck, running: running.has(clientId), rules: 3, ...extra };
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
    const run = await runCompetitorCheck({ primary: I.primary, town: I.town, clientName: cv.company_name, clientPhone: cv.phone, ownPlaceId: cv.gbp_place_id || '', search });
    await store.addCompetitorRun(clientId, run);
    // The client's own listing, found by phone or name on the first run, is remembered
    if (run.own && run.own.place_id && !cv.gbp_place_id && saveClientValue) await saveClientValue(clientId, 'gbp_place_id', run.own.place_id);
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
    const { settings, saved } = await scanSettingsFor(clientId, I);
    res.json({ settings, saved, credits: SC.creditCost(settings) });
  }));

  // The baseline: one heatmap per keyword, settings saved and locked, rows pending until refresh
  app.post('/api/clients/:clientId/gbp/scans/baseline', wrap(async (req, res) => {
    const { clientId } = req.params;
    if (!(req.body || {}).confirm) throw Object.assign(new Error('The baseline needs confirm: true (the confirm step shows the settings and the credit cost).'), { status: 400 });
    const ls = needLeadsnap();
    const I = await loadInputs(clientId);
    const existing = await store.scans(clientId);
    if (existing.some(s => s.run_type === 'baseline')) throw Object.assign(new Error('A baseline exists for this client. Hard rule 8: the settings are locked; monthly scans come from the schedules.'), { status: 409 });
    const { settings } = await scanSettingsFor(clientId, I);
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
    res.json(await view(clientId, { created }));
  }));

  // Settle pending heatmaps (reads only); create the schedules once the baseline is complete
  app.post('/api/clients/:clientId/gbp/scans/refresh', wrap(async (req, res) => {
    const { clientId } = req.params;
    const I = await loadInputs(clientId);
    const cv = I.validatorCtx.cv || {};
    const settings = cv.scan_settings || null;
    const scans = await store.scans(clientId);
    const settled = [];
    for (const row of scans.filter(s => s.status !== 'completed' && s.status !== 'failed')) {
      try { settled.push(await settleScan(clientId, row, settings, cv)); } catch (e) { settled.push({ ...row, error: e.message }); }
    }
    let schedules = null;
    if (settings) { try { schedules = await ensureSchedules(clientId, settings, await store.scans(clientId)); } catch (e) { log.error('[gbp] schedules not created:', e.message); schedules = { error: e.message }; } }
    res.json(await view(clientId, { settled: settled.map(s => ({ heatmap_id: s.heatmap_id, status: s.status, error: s.error || null })), schedules_result: schedules }));
  }));

  // The monthly results: heatmaps for the client's place since the last fetch, each completed one stored
  app.post('/api/clients/:clientId/gbp/scans/fetch', wrap(async (req, res) => {
    const { clientId } = req.params;
    const ls = needLeadsnap();
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
    if (file === 'scans.json') { const I = await loadInputs(client.id); const s = await scansView(client.id, I.validatorCtx.cv); if (s.count) files = { 'scans.json': JSON.stringify({ settings: s.settings, table: s.table, alerts: s.alerts, scans: s.scans }, null, 2) }; }
    if (file === 'schedules.json') { const s = await store.schedules(client.id); if (s.items.length) files = { 'schedules.json': JSON.stringify(s, null, 2) }; }
    if (file === 'competitors_leadsnap.json') { const c = await store.leadsnapCompetitors(client.id); if (c) files = { 'competitors_leadsnap.json': JSON.stringify(c, null, 2) }; }
    if (file === 'profile_check.json') { const p = await store.profileCheck(client.id); if (p) files = { 'profile_check.json': JSON.stringify(p, null, 2) }; }
    if (file === 'duplicates.json') { const d = await store.duplicates(client.id); if (d) files = { 'duplicates.json': JSON.stringify(d, null, 2) }; }
    if (file === 'landing_page.json') { const l = await store.landingPage(client.id); if (l) files = { 'landing_page.json': JSON.stringify(l, null, 2) }; }
    if (!(file in files)) throw Object.assign(new Error(found ? `${file} is not ready: that step has not passed yet.` : 'No GBP output has been generated for this client.'), { status: 404 });
    res.set('Content-Type', CONTENT_TYPES[file]);
    res.set('Content-Disposition', `inline; filename="${file}"`);
    res.send(files[file]);
  }));

  return { store, running, STEPS };
}

module.exports = { mountGbpApi, CONTENT_TYPES };
