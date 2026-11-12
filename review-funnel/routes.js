'use strict';

// ── The Review Us page: the routes (12 Nov 2026) ─────────────────────────────────────────────
// mountPublic goes on the app BEFORE the login middleware, like the webhooks: the client's site
// has no login cookie. The long random token in the address is the auth, and says which client.
//   POST /api/public/review-feedback/:token   { stars, name, phone, email, feedback, page_url }
//        200 { ok: true } once stored; 400 with the reason; 404 for a token nobody has;
//        429 after 30 sends in an hour on one token
// mountApi goes after the login middleware:
//   GET  /api/clients/:id/review-funnel                          the Reviews tab's card
//   POST /api/clients/:id/review-funnel/send-to-site  { confirm: true, by }
//   POST /api/clients/:id/review-funnel/feedback/:fid/resend     sends the emails that did not go
//   POST /api/clients/:id/review-funnel/feedback/:fid/handled  { by }  a person passed it on themselves

const express = require('express');
const { PUBLIC_PATH } = require('./service');

const PER_HOUR = 30;

// The address this server was reached at, for when COPYBOT_URL is not set
function baseOf(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) return '';
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || (local ? 'http' : 'https');
  return `${proto}://${host}`;
}

function mountPublic(app, svc, { log = console, now = () => Date.now() } = {}) {
  const parse = express.json({ limit: '20kb', type: () => true });
  const hits = new Map(); // token → the times of its sends in the last hour
  app.post(`${PUBLIC_PATH}/:token`, parse, async (req, res) => {
    const token = String(req.params.token || '');
    const recent = (hits.get(token) || []).filter(t => now() - t < 3600000);
    if (recent.length >= PER_HOUR) return res.status(429).json({ error: 'Too many messages. Try again later.' });
    try {
      const r = await svc.receive(token, req.body, { baseUrl: baseOf(req) });
      recent.push(now());
      hits.set(token, recent);
      res.json({ ok: true, id: r.id });
    } catch (err) {
      if (!err.status || err.status >= 500) log.error('[review-funnel] feedback could not be stored:', err.message);
      res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not store the feedback.', errors: err.errors || undefined });
    }
  }, (err, _req, res, _next) => {
    res.status(err.status || 400).json({ error: 'The body must be JSON.' });
  });
  return PUBLIC_PATH;
}

function mountApi(app, svc, { log = console } = {}) {
  const wrap = fn => async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[review-funnel]', err.message); res.status(err.status || 500).json({ error: err.message }); }
  };
  app.get('/api/clients/:id/review-funnel', wrap(req => svc.view(req.params.id, { baseUrl: baseOf(req) })));
  app.post('/api/clients/:id/review-funnel/send-to-site', wrap(req => svc.sendToSite(req.params.id, { confirm: (req.body || {}).confirm === true, by: (req.body || {}).by || '', baseUrl: baseOf(req) })));
  app.post('/api/clients/:id/review-funnel/feedback/:fid/resend', wrap(req => svc.resend(req.params.id, req.params.fid, { baseUrl: baseOf(req) })));
  app.post('/api/clients/:id/review-funnel/feedback/:fid/handled', wrap(req => svc.markHandled(req.params.id, req.params.fid, { by: (req.body || {}).by || '', baseUrl: baseOf(req) })));
}

module.exports = { mountPublic, mountApi, baseOf, PER_HOUR };
