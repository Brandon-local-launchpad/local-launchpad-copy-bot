'use strict';

// ── Legal pages API ─────────────────────────────────────────────────────────
// GET    /api/clients/:clientId/legal                 the filled pages and the hold; writes nothing
// POST   /api/clients/:clientId/legal/clear           { key, exceptions, note } Brandon clears that text
// PUT    /api/clients/:clientId/legal/wording/:page   { key, template } adjusted wording for this client
// DELETE /api/clients/:clientId/legal/wording/:page   { key } back to the master wording
// GET    /api/clients/:clientId/legal/dry-run         what a push would change; writes nothing
// POST   /api/clients/:clientId/legal/push            { confirm: true } all three pages or none
// POST   /api/clients/:clientId/legal/rollback        { confirm: true, snapshotIds }

function mountLegalApi(app, legal) {
  const send = (res, fn) => fn().then(r => res.json(r)).catch(err => res.status(err.status || 500).json({ error: err.message }));
  app.get('/api/clients/:clientId/legal', (req, res) => send(res, () => legal.status(req.params.clientId)));
  app.post('/api/clients/:clientId/legal/clear', (req, res) => send(res, () => legal.clear(req.params.clientId, req.body || {})));
  app.put('/api/clients/:clientId/legal/wording/:page', (req, res) => send(res, () => legal.setWording(req.params.clientId, req.params.page, req.body || {})));
  app.get('/api/clients/:clientId/legal/dry-run', (req, res) => send(res, () => legal.dryRun(req.params.clientId)));
  app.post('/api/clients/:clientId/legal/push', (req, res) => send(res, () => legal.push(req.params.clientId, req.body || {})));
  app.post('/api/clients/:clientId/legal/rollback', (req, res) => send(res, () => legal.rollback(req.params.clientId, req.body || {})));
  app.delete('/api/clients/:clientId/legal/wording/:page', (req, res) => send(res, () => legal.resetWording(req.params.clientId, req.params.page, req.body || {})));
}

module.exports = { mountLegalApi };
