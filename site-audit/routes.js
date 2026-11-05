'use strict';

// ── Site audit API ────────────────────────────────────────────────────────────────
//   GET  /api/clients/:id/site-audit                     the tab: the scan, the URLs, the issues, the settings
//   POST /api/clients/:id/site-audit/scan                Scan old site (a background job; the tab polls)
//   POST /api/clients/:id/site-audit/scan/resume         carry on after a restart or a failure
//   GET  /api/clients/:id/site-audit/urls/:urlId         one URL: its links, keywords and saved text
//   PUT  /api/clients/:id/site-audit/urls/:urlId/matters { matters: true | false | null, note }
//   POST /api/clients/:id/site-audit/search-console      { csv, filename } or { zip_base64, filename }
//   PUT  /api/clients/:id/site-audit/settings            the numbers on the Settings card
function mountSiteAuditApi(app, { pool, siteAudit, log = console }) {
  const wrap = fn => async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database not configured.' });
    try { res.json(await fn(req)); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[site-audit]', err); res.status(err.status || 500).json({ error: err.message }); }
  };
  app.get('/api/clients/:id/site-audit', wrap(req => siteAudit.view(req.params.id)));
  app.post('/api/clients/:id/site-audit/scan', wrap(async req => { await siteAudit.start(req.params.id); return siteAudit.view(req.params.id); }));
  app.post('/api/clients/:id/site-audit/scan/resume', wrap(async req => { await siteAudit.resume(req.params.id); return siteAudit.view(req.params.id); }));
  app.get('/api/clients/:id/site-audit/urls/:urlId', wrap(req => siteAudit.urlDetail(req.params.id, req.params.urlId)));
  app.put('/api/clients/:id/site-audit/urls/:urlId/matters', wrap(req => { const b = req.body || {}; return siteAudit.setOverride(req.params.id, req.params.urlId, { matters: b.matters === undefined ? null : b.matters, note: b.note }); }));
  app.post('/api/clients/:id/site-audit/search-console', wrap(async req => { const r = await siteAudit.uploadSearchConsole(req.params.id, req.body || {}); return { ...(await siteAudit.view(req.params.id)), uploaded: r.saved }; }));
  app.put('/api/clients/:id/site-audit/settings', wrap(req => siteAudit.saveSettings(req.params.id, req.body || {})));
}

module.exports = { mountSiteAuditApi };
