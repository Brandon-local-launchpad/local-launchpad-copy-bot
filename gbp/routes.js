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

const CONTENT_TYPES = { 'description.txt': 'text/plain; charset=utf-8', 'services.csv': 'text/csv; charset=utf-8', 'products.csv': 'text/csv; charset=utf-8', 'validation.json': 'application/json; charset=utf-8' };

function mountGbpApi(app, { pool, loadInputs, callModel, log = console }) {
  const store = createGbpStore(pool);
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
    let readiness;
    try {
      const I = await loadInputs(clientId);
      readiness = { ok: I.locked.length > 0, locked: I.locked.length, minServices: I.minServices, competitorCount: I.competitorCount, showPrices: I.showPrices, siteUrl: I.siteUrl, withCopy: Object.keys(I.included).length, flags: I.flags, town: I.town, name: I.name };
      if (!I.locked.length) readiness.flags = [...I.flags, { code: 'GBP-NO-SERVICES', msg: 'The page map has no service pages.' }];
    } catch (e) { readiness = { ok: false, error: e.message, flags: [] }; }
    return { slug, record, files, readiness, running: running.has(clientId), ...extra };
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

  app.get('/clients/:slug/gbp/:file', wrap(async (req, res) => {
    const { slug, file } = req.params;
    if (!CONTENT_TYPES[file]) throw Object.assign(new Error(`No such GBP file. The files are ${Object.keys(CONTENT_TYPES).join(', ')}.`), { status: 404 });
    const { rows } = await pool.query(`SELECT id, name FROM clients`);
    const client = rows.find(r => slugify(r.name) === slug);
    if (!client) throw Object.assign(new Error('No client with that slug.'), { status: 404 });
    const found = await store.latest(client.id);
    const files = found ? filesFor(found.record) : {};
    if (!(file in files)) throw Object.assign(new Error(found ? `${file} is not ready: that step has not passed yet.` : 'No GBP output has been generated for this client.'), { status: 404 });
    res.set('Content-Type', CONTENT_TYPES[file]);
    res.set('Content-Disposition', `inline; filename="${file}"`);
    res.send(files[file]);
  }));

  return { store, running, STEPS };
}

module.exports = { mountGbpApi, CONTENT_TYPES };
