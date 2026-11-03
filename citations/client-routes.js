'use strict';

// ── Citations API, the client side ────────────────────────────────────────────────
//   GET  /api/clients/:id/citations                        the Citations tab: NAP, email, tiers, rows, tiles
//   PUT  /api/clients/:id/citations/rows/:directoryId      { listed, live_url, nap_status, status, done_by, notes, onepassword_item, login_email }
//   POST /api/clients/:id/citations/scan                   Scan directories (stage 3): every row, or { directory_id } for one
//   GET  /api/clients/:id/citations/scan                   the running or latest scan
//   POST /api/clients/:id/citations/gaps                   Find gaps (stage 4)
//   GET  /api/clients/:id/citations/gaps                   the latest gap run
//   POST /api/clients/:id/citations/gaps/add               { domain, name, tier, priority } adds a gap to the database

//   GET  /api/clients/:id/citations/rows/:directoryId/pack  the prefilled submission pack (stage 7)
function mountClientCitationsApi(app, { pool, clientCitations, scanner = null, gaps = null, packs = null, log = console }) {
  const wrap = fn => async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database not configured.' });
    try { res.json(await fn(req)); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[citations]', err); res.status(err.status || 500).json({ error: err.message }); }
  };
  const full = async clientId => {
    const v = await clientCitations.view(clientId);
    if (scanner) v.scan = await scanner.status(clientId);
    if (gaps) v.gaps = await gaps.latest(clientId);
    return v;
  };
  app.get('/api/clients/:id/citations', wrap(req => full(req.params.id)));
  app.put('/api/clients/:id/citations/rows/:directoryId', wrap(async req => { await clientCitations.saveRow(req.params.id, req.params.directoryId, req.body || {}); return full(req.params.id); }));
  if (scanner) {
    app.post('/api/clients/:id/citations/scan', wrap(async req => { await scanner.start(req.params.id, { directoryId: (req.body || {}).directory_id || null }); return full(req.params.id); }));
    app.get('/api/clients/:id/citations/scan', wrap(req => scanner.status(req.params.id)));
  }
  if (packs) app.get('/api/clients/:id/citations/rows/:directoryId/pack', wrap(req => packs.packFor(req.params.id, req.params.directoryId)));
  if (gaps) {
    app.post('/api/clients/:id/citations/gaps', wrap(async req => { await gaps.run(req.params.id); return full(req.params.id); }));
    app.get('/api/clients/:id/citations/gaps', wrap(req => gaps.latest(req.params.id)));
    app.post('/api/clients/:id/citations/gaps/add', wrap(async req => { await gaps.addToDatabase(req.params.id, req.body || {}); return full(req.params.id); }));
  }
}

module.exports = { mountClientCitationsApi };
