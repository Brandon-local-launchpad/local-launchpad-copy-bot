'use strict';

// ── Citations API ─────────────────────────────────────────────────────────────────
// The directory database (the Directories page):
//   GET  /api/citations/directories?retired=1       every row, the counts, the seed state
//   POST /api/citations/directories                 add one by hand
//   PUT  /api/citations/directories/:id             edit (marks the row hand edited: the seed leaves it)
//   POST /api/citations/directories/:id/retire      { reason }
//   POST /api/citations/directories/:id/unretire
//   POST /api/citations/directories/reseed          re-read data/citations/ (rows edited by hand keep their values)
//   POST /api/citations/directories/fill-da         the DA column from DataForSEO for rows without one (spends)
//   GET  /api/citations/costs                       the DataForSEO and model spend log
// The client side (the Citations tab, the scan, the gaps) is mounted by mountClientCitationsApi
// in citations/client-routes.js.

const N = require('../fillout/niches');

//   GET  /api/citations/inbox                       the listings inbox: configured, the last poll, the latest emails
//   POST /api/citations/inbox/poll                  read the inbox now
function mountCitationsApi(app, { pool, store, inbox = null, log = console }) {
  const wrap = fn => async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database not configured.' });
    try { res.json(await fn(req)); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[citations]', err); res.status(err.status || 500).json({ error: err.message }); }
  };
  const counts = rows => {
    const c = { total: rows.length, active: rows.filter(r => !r.retired).length, retired: rows.filter(r => r.retired).length, by_tier: {}, no_da: rows.filter(r => !r.retired && r.da == null).length };
    for (const r of rows) if (!r.retired) c.by_tier[r.tier] = (c.by_tier[r.tier] || 0) + 1;
    return c;
  };
  const view = async () => {
    const rows = await store.list({ includeRetired: true });
    return { directories: rows, counts: counts(rows), seed: await store.seedState(), niches: N.allNiches().filter(n => n.key !== 'other') };
  };

  app.get('/api/citations/directories', wrap(view));
  app.post('/api/citations/directories', wrap(async req => ({ directory: await store.create(req.body || {}) })));
  app.post('/api/citations/directories/reseed', wrap(async () => ({ result: await store.seedDirectories({ force: true }), ...(await view()) })));
  app.post('/api/citations/directories/fill-da', wrap(async req => ({ result: await store.fillDa({ force: !!(req.body || {}).force }), ...(await view()) })));
  app.put('/api/citations/directories/:id', wrap(async req => ({ directory: await store.update(req.params.id, req.body || {}) })));
  app.post('/api/citations/directories/:id/retire', wrap(async req => ({ directory: await store.retire(req.params.id, (req.body || {}).reason || '') })));
  app.post('/api/citations/directories/:id/unretire', wrap(async req => ({ directory: await store.unretire(req.params.id) })));
  app.get('/api/citations/costs', wrap(async req => ({ costs: await store.costs({ clientId: req.query.client_id || null, limit: parseInt(req.query.limit, 10) || 50 }) })));
  // inbox: the poller, or a function returning it (server.js builds it after the client side)
  const ib = () => (typeof inbox === 'function' ? inbox() : inbox);
  app.get('/api/citations/inbox', wrap(async () => (ib() ? ib().status() : { configured: false, running: false, last_poll: null, emails: [] })));
  app.post('/api/citations/inbox/poll', wrap(async () => { if (!ib()) throw Object.assign(new Error('The listings inbox is not set up on this server.'), { status: 503 }); const r = await ib().poll(); return { result: r, ...(await ib().status()) }; }));
}

module.exports = { mountCitationsApi };
