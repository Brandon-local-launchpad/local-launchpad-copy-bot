'use strict';

// ── Location Determiner API ──────────────────────────────────────────────────────
// GET  /api/clients/:clientId/locations/dry-run   the Stage 2 and 3 dry run: candidates,
//                                                 the keyword plan, counts and the estimate.
//                                                 Spends nothing (postcodes.io is free).
// POST /api/clients/:clientId/locations/run       { confirm: true }: buys the volumes and the
//                                                 SERPs the dry run planned, scores and tiers,
//                                                 saves the result (client_assets locations_run)
// GET  /api/clients/:clientId/locations/run       the latest saved run
// Stage 5, the review (public/locations.html?id=<client>):
// GET  …/locations/review                         the latest run with the hand moves applied, the
//                                                 GBP areas, the client message, the approval
// POST …/locations/review/move                    { place_id, to: tier1|tier2|area_only|excluded|reset, note }
// POST …/locations/review/add                     { name | place_id, to }  a place by name, nearest the base
// GET  …/locations/review/suggest?q=              places of that name for the add box
// POST …/locations/review/client-reply            { declined: [place_id], note }  the client's unticks
// POST …/locations/review/approve                 { who }  writes client_location_tiers with approved_at
// GET  …/locations/review/message                 the client confirmation text
// The write to the page map and GBP service areas comes in Stage 6.

const { createPageMapStore } = require('../page-map/store');
const { createH1Research } = require('../h1-research/service');
const P = require('./places');
const S = require('./serp');
const { createLocationService } = require('./service');
const V = require('./review');

function mountLocationsApi(app, { pool, filloutService, log = console }) {
  const pageMapStore = createPageMapStore({ pool, filloutService });
  const h1 = createH1Research({ pool, filloutService, pageMapStore, log });
  const places = P.createPlacesStore(pool);
  const serp = S.createSerpStore(pool);
  S.ensureSerpTables(pool).catch(err => log.error('[locations] serp table:', err.message));
  V.ensureReviewTables(pool).catch(err => log.error('[locations] review table:', err.message));
  const svc = createLocationService({ pool, filloutService, pageMapStore, h1, places, serp, log });
  const review = V.createLocationReview({ pool, places, locations: svc, log });
  const wrap = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };
  const body = req => req.body || {};
  app.get('/api/clients/:clientId/locations/dry-run', wrap(async (req, res) => {
    res.json(await svc.dryRun(req.params.clientId));
  }));
  app.post('/api/clients/:clientId/locations/run', wrap(async (req, res) => {
    if (!body(req).confirm) throw Object.assign(new Error('The run buys DataForSEO volumes and SERPs: send confirm: true after reading the dry run.'), { status: 400 });
    res.json(await svc.run(req.params.clientId));
  }));
  app.get('/api/clients/:clientId/locations/run', wrap(async (req, res) => {
    const r = await svc.latestRun(req.params.clientId);
    if (!r) return res.status(404).json({ error: 'No run saved for this client yet.' });
    res.json(r);
  }));
  // Stage 5
  app.get('/api/clients/:clientId/locations/review', wrap(async (req, res) => res.json(await review.view(req.params.clientId))));
  app.post('/api/clients/:clientId/locations/review/move', wrap(async (req, res) => res.json(await review.move(req.params.clientId, body(req)))));
  app.post('/api/clients/:clientId/locations/review/add', wrap(async (req, res) => res.json(await review.addPlace(req.params.clientId, body(req)))));
  app.get('/api/clients/:clientId/locations/review/suggest', wrap(async (req, res) => res.json(await review.suggest(req.params.clientId, String(req.query.q || '')))));
  app.post('/api/clients/:clientId/locations/review/client-reply', wrap(async (req, res) => res.json(await review.clientReply(req.params.clientId, body(req)))));
  app.post('/api/clients/:clientId/locations/review/approve', wrap(async (req, res) => res.json(await review.approve(req.params.clientId, body(req)))));
  app.get('/api/clients/:clientId/locations/review/message', wrap(async (req, res) => {
    const v = await review.view(req.params.clientId);
    if (!v.ok) return res.status(409).json({ error: v.problems[0].msg });
    res.type('text/plain').send(v.message.text);
  }));
  return { svc, review };
}

module.exports = { mountLocationsApi };
