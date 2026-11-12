'use strict';

// ── Site audit API ────────────────────────────────────────────────────────────────
//   GET  /api/clients/:id/site-audit                     the tab: the scan, the URLs, the plan for each, the settings
//   POST /api/clients/:id/site-audit/scan                Scan old site (a background job; the tab polls)
//   POST /api/clients/:id/site-audit/scan/resume         carry on after a restart or a failure
//   GET  /api/clients/:id/site-audit/urls/:urlId         one URL: its links, keywords and saved text
//   PUT  /api/clients/:id/site-audit/urls/:urlId/matters  { matters: true | false | null, note }
//   PUT  /api/clients/:id/site-audit/urls/:urlId/decision { decision, new_url, redirect_type, note } or { reset: true }
//   POST /api/clients/:id/site-audit/approve             { url_ids } or { all: true }: approve what is suggested
//   POST /api/clients/:id/site-audit/urls/:urlId/page-map-change  { accept: true | false }: the slug proposal
//   POST /api/clients/:id/site-audit/page-map-changes/undo { identity }: back to the planned address
//   GET  /api/clients/:id/site-audit/export/:which       old-site-audit.csv or url-map.csv
//   GET  /api/clients/:id/site-audit/page-content?path=  the old text behind a new page, for the page view
//   GET  /api/clients/:id/site-audit/redirects           the push log, the latest snapshot, the latest checks
//   POST /api/clients/:id/site-audit/redirects/dry-run   what a push would do. Writes nothing
//   POST /api/clients/:id/site-audit/redirects/push      { confirm: true }: inactive, read back, snapshot
//   POST /api/clients/:id/site-audit/redirects/rollback  { snapshot_id, confirm: true }
//   POST /api/clients/:id/site-audit/redirects/validate  the pre launch check: the map, staging, the domain's forms
//   POST /api/clients/:id/site-audit/redirects/test      { confirm: true }: on at staging, request each, always off
//   POST /api/clients/:id/site-audit/redirects/after-launch  the launch day check: every version of the live domain in one
//                                                        hop, every old URL on the live site, the DNS against the snapshot.
//                                                        Read only. The first one marks the site launched (launch.js)
//   POST /api/clients/:id/site-audit/launch/dns-snapshot  the DNS before launch. Read only
//   POST /api/clients/:id/site-audit/launch/undo          { confirm: true }: not launched after all (before day 7 only)
//   POST /api/clients/:id/site-audit/search-console      { csv, filename } or { zip_base64, filename }
//   PUT  /api/clients/:id/site-audit/settings            the numbers on the Settings card
function mountSiteAuditApi(app, { pool, siteAudit, log = console }) {
  const fail = (res, err) => { if (!err.status || err.status >= 500) log.error('[site-audit]', err); res.status(err.status || 500).json({ error: err.message }); };
  const wrap = fn => async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database not configured.' });
    try { res.json(await fn(req)); }
    catch (err) { fail(res, err); }
  };
  const who = req => (req.body && req.body.who) || '';
  app.get('/api/clients/:id/site-audit', wrap(req => siteAudit.view(req.params.id)));
  app.post('/api/clients/:id/site-audit/scan', wrap(async req => { await siteAudit.start(req.params.id); return siteAudit.view(req.params.id); }));
  app.post('/api/clients/:id/site-audit/scan/resume', wrap(async req => { await siteAudit.resume(req.params.id); return siteAudit.view(req.params.id); }));
  app.get('/api/clients/:id/site-audit/urls/:urlId', wrap(req => siteAudit.urlDetail(req.params.id, req.params.urlId)));
  app.put('/api/clients/:id/site-audit/urls/:urlId/matters', wrap(req => { const b = req.body || {}; return siteAudit.setOverride(req.params.id, req.params.urlId, { matters: b.matters === undefined ? null : b.matters, note: b.note }); }));
  app.put('/api/clients/:id/site-audit/urls/:urlId/decision', wrap(req => siteAudit.setDecision(req.params.id, req.params.urlId, req.body || {}, who(req))));
  app.post('/api/clients/:id/site-audit/approve', wrap(req => siteAudit.approve(req.params.id, req.body || {}, who(req))));
  app.post('/api/clients/:id/site-audit/urls/:urlId/page-map-change', wrap(req => ((req.body || {}).accept === true ? siteAudit.proposalYes(req.params.id, req.params.urlId, who(req)) : siteAudit.proposalNo(req.params.id, req.params.urlId, who(req)))));
  app.post('/api/clients/:id/site-audit/page-map-changes/undo', wrap(req => siteAudit.proposalUndo(req.params.id, String((req.body || {}).identity || ''))));
  app.get('/api/clients/:id/site-audit/page-content', wrap(req => siteAudit.pageContent(req.params.id, req.query.path)));
  app.get('/api/clients/:id/site-audit/export/:which', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database not configured.' });
    const which = String(req.params.which).replace(/\.csv$/, '');
    if (!['old-site-audit', 'url-map'].includes(which)) return res.status(404).json({ error: 'There is no such export.' });
    try {
      const csv = await siteAudit.exportCsv(req.params.id, which);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${which}.csv"`);
      res.send(`﻿${csv}`);
    } catch (err) { fail(res, err); }
  });
  // The redirect push and the pre launch check. Staging only: the service refuses anything else.
  app.get('/api/clients/:id/site-audit/redirects', wrap(req => siteAudit.redirectsView(req.params.id)));
  app.post('/api/clients/:id/site-audit/redirects/dry-run', wrap(req => siteAudit.redirectsDryRun(req.params.id)));
  app.post('/api/clients/:id/site-audit/redirects/push', wrap(req => siteAudit.redirectsPush(req.params.id, { confirm: (req.body || {}).confirm === true, who: who(req) })));
  app.post('/api/clients/:id/site-audit/redirects/rollback', wrap(req => siteAudit.redirectsRollback(req.params.id, { snapshotId: (req.body || {}).snapshot_id, confirm: (req.body || {}).confirm === true, who: who(req) })));
  app.post('/api/clients/:id/site-audit/redirects/validate', wrap(req => siteAudit.validate(req.params.id)));
  app.post('/api/clients/:id/site-audit/redirects/after-launch', wrap(req => siteAudit.checkAfterLaunch(req.params.id)));
  app.post('/api/clients/:id/site-audit/launch/dns-snapshot', wrap(req => siteAudit.snapshotDns(req.params.id)));
  app.post('/api/clients/:id/site-audit/launch/undo', wrap(req => { if ((req.body || {}).confirm !== true) throw Object.assign(new Error('Undoing the launch needs confirming.'), { status: 400 }); return siteAudit.undoLaunch(req.params.id); }));
  app.post('/api/clients/:id/site-audit/redirects/test', wrap(req => siteAudit.testOnStaging(req.params.id, { confirm: (req.body || {}).confirm === true, who: who(req) })));
  app.post('/api/clients/:id/site-audit/search-console', wrap(async req => { const r = await siteAudit.uploadSearchConsole(req.params.id, req.body || {}); return { ...(await siteAudit.view(req.params.id)), uploaded: r.saved }; }));
  app.put('/api/clients/:id/site-audit/settings', wrap(req => siteAudit.saveSettings(req.params.id, req.body || {})));
}

module.exports = { mountSiteAuditApi };
