'use strict';

// ── Review & Referral Cards: the routes (13 Nov 2026) ────────────────────────────────────────
// Behind the login, like every client tab:
//   GET  /api/clients/:id/card-brief                    the tab: every field, the readiness, the brief, the gallery
//   PUT  /api/clients/:id/card-brief  { set, reset }    save fields typed on the tab; reset puts a line back to the record's value
//   POST /api/clients/:id/card-brief/copied  { by }     a person copied the brief
//   POST /api/clients/:id/card-brief/signoff { key, ticked, by }

function mount(app, svc, { log = console } = {}) {
  const wrap = fn => async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[card-brief]', err.message); res.status(err.status || 500).json({ error: err.message }); }
  };
  const body = req => (req.body && typeof req.body === 'object' ? req.body : {});
  app.get('/api/clients/:id/card-brief', wrap(req => svc.view(req.params.id)));
  app.put('/api/clients/:id/card-brief', wrap(req => svc.save(req.params.id, { set: body(req).set, reset: body(req).reset })));
  app.post('/api/clients/:id/card-brief/copied', wrap(req => svc.copied(req.params.id, { by: body(req).by || '' })));
  app.post('/api/clients/:id/card-brief/signoff', wrap(req => svc.signoff(req.params.id, { key: body(req).key, ticked: body(req).ticked === true, by: body(req).by || '' })));
}

module.exports = { mount };
