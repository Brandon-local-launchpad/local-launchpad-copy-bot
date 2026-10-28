'use strict';

// ── Blog routes (stage 1: the settings and the inputs report) ────────────────
//   GET /api/clients/:id/blog-settings   { settings, inputs }: the three settings and every
//                                        blog input present or reported missing (blog/inputs.js)
//   PUT /api/clients/:id/blog-settings   { launch_date, status, search_console_property } → the same
// createBlogInputsLoader gathers the pieces from the database and the context the other page
// types use; each piece fails on its own (the report says what could not be read) so one
// missing part never hides the rest.

const { getBlogSettings, saveBlogSettings } = require('./db');
const { blogInputsFor } = require('./inputs');

// deps: pool, filloutService (record), pageMapStore (saved), loadV20Context(clientId) → { cv, niche, trade, nicheError },
//       tradeFactsGate(clientId, trade) → { verified, message, niche } or null
function createBlogInputsLoader({ pool, filloutService = null, pageMapStore = null, loadV20Context = null, tradeFactsGate = null }) {
  return async function loadBlogInputs(clientId) {
    const problems = [];
    const { rows: cs } = await pool.query(`SELECT id, name, trade, launch_date, status, search_console_property FROM clients WHERE id = $1`, [clientId]);
    if (!cs.length) throw Object.assign(new Error('Client not found.'), { status: 404 });
    const client = cs[0];
    // The client values: the saved JSON (the context below may refuse a client with no page map)
    let cv = {};
    try {
      const { rows } = await pool.query(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
      if (rows.length) cv = JSON.parse(rows[0].content);
    } catch (e) { problems.push(`client values not read: ${e.message}`); }
    let niche = null, trade = client.trade;
    if (loadV20Context) {
      try { const ctx = await loadV20Context(clientId, null); if (ctx) { niche = ctx.niche || null; trade = ctx.trade || trade; if (ctx.cv && Object.keys(ctx.cv).length) cv = { ...cv, ...ctx.cv }; if (ctx.nicheError) problems.push(ctx.nicheError); } }
      catch (e) { problems.push(`niche entry not loaded: ${e.message}`); }
    }
    let priceRows = [], fields = [];
    if (filloutService) {
      try { const rec = await filloutService.record(clientId); if (rec) { priceRows = (rec.prices && rec.prices.rows) || []; fields = rec.sections.flatMap(s => s.fields); } }
      catch (e) { problems.push(`onboarding record not read: ${e.message}`); }
    }
    let rows = [];
    if (pageMapStore) { try { rows = await pageMapStore.saved(clientId); } catch (e) { problems.push(`page map not read: ${e.message}`); } }
    let tradeFacts = null;
    if (tradeFactsGate) { try { tradeFacts = await tradeFactsGate(clientId, trade); } catch (e) { problems.push(`trade facts pack not checked: ${e.message}`); } }
    let dossiers = [];
    try {
      const { rows: d } = await pool.query(`SELECT metadata FROM client_assets WHERE client_id = $1 AND asset_type = 'geo_dossier' AND (metadata IS NULL OR NOT (metadata->>'superseded')::boolean)`, [clientId]);
      const seen = new Set();
      for (const r of d) { const m = (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) || {}; const n = m.location_name || ''; if (n && !seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); dossiers.push({ locationName: n }); } }
    } catch (e) { problems.push(`dossiers not read: ${e.message}`); }
    const inputs = blogInputsFor({ cv, client, priceRows, fields, niche, rows, tradeFacts, dossiers });
    return { ...inputs, problems };
  };
}

// The queue (stage 3), when a queue service is given:
//   GET  /api/clients/:id/blog/queue             every post with its decisions (no model call)
//   POST /api/clients/:id/blog/queue/build       the reserved topics dated and written to the page map
//   PUT  /api/clients/:id/blog/queue/:slug       { wording, approved } a person's approval or edit of the question
function mountBlogApi(app, { pool, loadBlogInputs, queue = null, runner = null }) {
  const wrap = fn => async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database not configured.' });
    try { res.json(await fn(req)); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };
  const view = async clientId => ({ settings: await getBlogSettings(pool, clientId), inputs: await loadBlogInputs(clientId) });
  app.get('/api/clients/:clientId/blog-settings', wrap(req => view(req.params.clientId)));
  app.put('/api/clients/:clientId/blog-settings', wrap(async req => { await saveBlogSettings(pool, req.params.clientId, req.body || {}); return view(req.params.clientId); }));
  if (queue) {
    app.get('/api/clients/:clientId/blog/queue', wrap(req => queue.view(req.params.clientId)));
    app.post('/api/clients/:clientId/blog/queue/build', wrap(req => queue.build(req.params.clientId)));
    app.put('/api/clients/:clientId/blog/queue/:slug(*)', wrap(req => queue.setWording(req.params.clientId, '/' + String(req.params.slug || '').replace(/^\/+/, ''), req.body || {})));
  }
  // The run (stage 4), when a runner is given: the same shape as the other page types' runs
  //   GET  /api/clients/:id/blog-pages              the posts with their records and the run state
  //   POST /api/clients/:id/blog-pages/run          { resume, keys, quality } starts the run in the background
  //   GET  /api/clients/:id/blog-pages/preview/:key the decisions block for one post, no model call
  if (runner) {
    app.get('/api/clients/:clientId/blog-pages', wrap(req => runner.view(req.params.clientId)));
    app.post('/api/clients/:clientId/blog-pages/run', wrap(async req => {
      const { resume = true, keys = null, quality = false } = req.body || {};
      if (runner.running.has(req.params.clientId)) throw Object.assign(new Error('A blog posts run is already in progress for this client.'), { status: 409 });
      runner.run(req.params.clientId, { resume: !!resume, keys: Array.isArray(keys) && keys.length ? keys : null, qualityReview: !!quality }).catch(err => console.error('[blog] run failed for', req.params.clientId, err));
      return { started: true };
    }));
    app.get('/api/clients/:clientId/blog-pages/preview/:key(*)', wrap(async req => {
      const key = '/' + String(req.params.key || '').replace(/^\/+/, '');
      const I = await queue.inputsFor(req.params.clientId);
      const rows = (await queue.rowsFor(req.params.clientId)).filter(r => r.applies !== false);
      const row = rows.find(r => r.slug === key);
      if (!row) throw Object.assign(new Error(`No post ${key} in the blog queue.`), { status: 404 });
      const { decisionsResult, ideasUsed } = await runner.prepare(req.params.clientId, I, row, rows, []);
      return { key, gates: decisionsResult.gates, flags: decisionsResult.flags, ideas: ideasUsed.length, decisionsBlock: decisionsResult.decisionsBlock };
    }));
  }
}

module.exports = { mountBlogApi, createBlogInputsLoader };
