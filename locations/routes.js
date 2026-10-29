'use strict';

// ── Location Determiner API ──────────────────────────────────────────────────────
// GET /api/clients/:clientId/locations/dry-run   the Stage 2 and 3 dry run: candidates,
//                                                 the keyword plan, counts and the estimate.
//                                                 Spends nothing (postcodes.io is free).
// POST /api/clients/:clientId/locations/run       { confirm: true }: buys the volumes and the
//                                                 SERPs the dry run planned, scores and tiers,
//                                                 saves the result (client_assets locations_run)
// GET  /api/clients/:clientId/locations/run       the latest saved run
// The review screen and the write to the page map come in Stages 5 and 6.

const { createPageMapStore } = require('../page-map/store');
const { createH1Research } = require('../h1-research/service');
const P = require('./places');
const S = require('./serp');
const { createLocationService } = require('./service');

function mountLocationsApi(app, { pool, filloutService, log = console }) {
  const pageMapStore = createPageMapStore({ pool, filloutService });
  const h1 = createH1Research({ pool, filloutService, pageMapStore, log });
  const places = P.createPlacesStore(pool);
  const serp = S.createSerpStore(pool);
  S.ensureSerpTables(pool).catch(err => log.error('[locations] serp table:', err.message));
  const svc = createLocationService({ pool, filloutService, pageMapStore, h1, places, serp, log });
  const wrap = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };
  app.get('/api/clients/:clientId/locations/dry-run', wrap(async (req, res) => {
    res.json(await svc.dryRun(req.params.clientId));
  }));
  app.post('/api/clients/:clientId/locations/run', wrap(async (req, res) => {
    if (!(req.body || {}).confirm) throw Object.assign(new Error('The run buys DataForSEO volumes and SERPs: send confirm: true after reading the dry run.'), { status: 400 });
    res.json(await svc.run(req.params.clientId));
  }));
  app.get('/api/clients/:clientId/locations/run', wrap(async (req, res) => {
    const r = await svc.latestRun(req.params.clientId);
    if (!r) return res.status(404).json({ error: 'No run saved for this client yet.' });
    res.json(r);
  }));
  return svc;
}

module.exports = { mountLocationsApi };
