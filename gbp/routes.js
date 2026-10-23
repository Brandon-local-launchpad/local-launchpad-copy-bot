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
const { searchPlaces } = require('./places');

const CONTENT_TYPES = { 'description.txt': 'text/plain; charset=utf-8', 'services.csv': 'text/csv; charset=utf-8', 'products.csv': 'text/csv; charset=utf-8', 'validation.json': 'application/json; charset=utf-8', 'nap.json': 'application/json; charset=utf-8', 'note.txt': 'text/plain; charset=utf-8', 'competitors.json': 'application/json; charset=utf-8', 'duplicates.json': 'application/json; charset=utf-8', 'landing_page.json': 'application/json; charset=utf-8' };

// nap.json and note.txt are built live from the inputs, the saved record and the competitor runs (gbp/profile.js)
function profileFiles(I, record, competitors) {
  const p = buildProfile({ inputs: I, record, competitors });
  return { 'nap.json': JSON.stringify(p.nap, null, 2), 'note.txt': p.note };
}

// Batch 2 options: search(textQuery) → [place] (the Places client; the fixture records
// it), fetchPage(url) → { finalUrl, html }, saveClientValue(clientId, key, value)
function mountGbpApi(app, { pool, loadInputs, callModel, log = console, search = q => searchPlaces(q), fetchPage = fetchHtml, saveClientValue = null }) {
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
    let readiness, profile = null;
    const competitors = await competitorView(clientId);
    const duplicates = (await store.duplicates(clientId)) || { at: null, queries: [], duplicates: [], marks: {} };
    const landing = await store.landingPage(clientId);
    if (competitors.latest) files['competitors.json'] = `/clients/${slug}/gbp/competitors.json`;
    if (duplicates.at) files['duplicates.json'] = `/clients/${slug}/gbp/duplicates.json`;
    if (landing) files['landing_page.json'] = `/clients/${slug}/gbp/landing_page.json`;
    try {
      const I = await loadInputs(clientId);
      readiness = { ok: I.locked.length > 0, locked: I.locked.length, minServices: I.minServices, competitorCount: I.competitorCount, showPrices: I.showPrices, siteUrl: I.siteUrl, withCopy: Object.keys(I.included).length, flags: I.flags, town: I.town, name: I.name, ownPlaceId: (I.validatorCtx.cv || {}).gbp_place_id || '' };
      if (!I.locked.length) readiness.flags = [...I.flags, { code: 'GBP-NO-SERVICES', msg: 'The page map has no service pages.' }];
      // The profile fields, NAP, note and templates: live, so a changed value shows at once
      profile = buildProfile({ inputs: I, record, competitors });
      files['nap.json'] = `/clients/${slug}/gbp/nap.json`;
      files['note.txt'] = `/clients/${slug}/gbp/note.txt`;
    } catch (e) { readiness = { ok: false, error: e.message, flags: [] }; }
    // rules: the validator round the live app runs (3: the description's category cap and openings, 23 Oct)
    return { slug, record, files, readiness, profile, competitors, duplicates, landing, running: running.has(clientId), rules: 3, ...extra };
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
    const result = await checkLandingPage({ url: I.siteUrl, primary: I.primary, town: I.town, secondaries: I.secondaries, nap: { name: p.nap.name, phone: p.nap.phone, address: p.nap.address || cv.address || '' }, hiddenAddress: !p.nap.address, fetchHtmlFn: fetchPage });
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
    if (file === 'nap.json' || file === 'note.txt') files = profileFiles(await loadInputs(client.id), found ? found.record : null, await competitorView(client.id));
    if (file === 'competitors.json') { const c = await competitorView(client.id); if (c.latest) files = { 'competitors.json': JSON.stringify(c, null, 2) }; }
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
