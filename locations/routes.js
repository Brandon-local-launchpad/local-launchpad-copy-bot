'use strict';

// ── Location Determiner API ──────────────────────────────────────────────────────
// GET /api/clients/:clientId/locations/dry-run   the Stage 2 and 3 dry run: candidates,
//                                                 the keyword plan, counts and the estimate.
//                                                 Spends nothing (postcodes.io is free).
// The run that buys volume and SERPs, the review screen and the write to the page map
// come in the later stages.

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
  return svc;
}

module.exports = { mountLocationsApi };
