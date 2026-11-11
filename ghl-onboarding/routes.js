'use strict';

// ── Onboarding answers from GoHighLevel: the routes (11 Nov 2026) ──────────────────────────
// mountWebhook goes on the app BEFORE the login middleware and the app-wide JSON parser, like
// the Fillout webhook: GHL has no login cookie, the shared secret in X-LL-Secret is the auth.
//   POST /api/webhooks/ghl-onboarding     401 and nothing stored without the right secret;
//                                         otherwise the send is stored, answered 200 at once,
//                                         and processed afterwards (so GHL never retries)
// mountApi goes after the login middleware:
//   GET  /api/onboarding/unmatched                          the Dashboard card
//   POST /api/onboarding/events/:id/attach  { client_id }
//   GET  /api/clients/:id/onboarding                        the Record tab's card
//   PUT  /api/clients/:id/onboarding/:key   { value }       a person's correction (Hand)
//   POST /api/clients/:id/onboarding/steps/:kind/done  { done, by }

const crypto = require('crypto');
const express = require('express');

const PATH = '/api/webhooks/ghl-onboarding';
const HEADER = 'x-ll-secret';

// Constant time, whatever the lengths
function secretMatches(given, expected) {
  if (typeof given !== 'string' || !given || !expected) return false;
  const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

function mountWebhook(app, svc, { secret, log = console, limit = '100kb' } = {}) {
  const parse = express.json({ limit, type: () => true });
  app.post(PATH, (req, res, next) => {
    if (!secret) { log.error('[ghl-onboarding] GHL_ONBOARDING_SECRET is not set; refusing the webhook'); return res.status(401).json({ error: 'Webhook not configured' }); }
    if (!secretMatches(req.headers[HEADER], secret)) { log.error(`[ghl-onboarding] webhook refused: ${req.headers[HEADER] ? 'wrong' : 'no'} X-LL-Secret`); return res.status(401).json({ error: 'Unauthorised' }); }
    next();
  }, parse, async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'The body must be a JSON object.' });
    try {
      const r = await svc.receive(body);
      res.status(200).json({ ok: true, id: r.id });
      setImmediate(() => svc.process(r.id).catch(err => log.error('[ghl-onboarding] processing failed:', err.message)));
    } catch (err) {
      log.error('[ghl-onboarding] the send could not be stored:', err.message);
      res.status(500).json({ error: 'Could not store the send.' });
    }
  }, (err, _req, res, _next) => {
    log.error(`[ghl-onboarding] webhook body rejected: ${err.type || err.name} ${err.message}`);
    res.status(err.status || 400).json({ error: err.message });
  });
  return PATH;
}

function mountApi(app, svc) {
  const wrap = fn => async (req, res) => { try { res.json(await fn(req)); } catch (err) { res.status(err.status || 500).json({ error: err.message }); } };
  app.get('/api/onboarding/unmatched', wrap(async () => ({ events: await svc.unmatched() })));
  app.post('/api/onboarding/events/:id/attach', wrap(req => {
    const clientId = String((req.body || {}).client_id || '');
    if (!clientId) throw Object.assign(new Error('Pick a client.'), { status: 400 });
    return svc.attach(req.params.id, clientId);
  }));
  app.get('/api/clients/:clientId/onboarding', wrap(req => svc.view(req.params.clientId)));
  app.put('/api/clients/:clientId/onboarding/:key', wrap(req => {
    if (!req.body || !('value' in req.body)) throw Object.assign(new Error('Body needs {value}'), { status: 400 });
    return svc.edit(req.params.clientId, req.params.key, req.body.value);
  }));
  app.post('/api/clients/:clientId/onboarding/steps/:kind/done', wrap(req => svc.tick(req.params.clientId, req.params.kind, (req.body || {}).done !== false, (req.body || {}).by)));
}

module.exports = { mountWebhook, mountApi, secretMatches, PATH, HEADER };
