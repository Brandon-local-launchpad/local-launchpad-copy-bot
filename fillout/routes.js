'use strict';

// ── Fillout intake routes ───────────────────────────────────────────────────
// mountWebhook goes on the app BEFORE the login middleware and before the
// app-wide JSON parser: Fillout has no login cookie (the shared secret is the
// auth) and the webhook has its own 2 MB body limit. mountApi goes after the
// login middleware, with the rest of /api.

const express = require('express');
const I = require('./intake');

function mountWebhook(app, svc, { secret, log = console, limit = '2mb' } = {}) {
  const path = '/api/webhooks/fillout';
  // Keep the raw text so a body we cannot parse is still saved, not lost
  const parse = express.json({ limit, type: () => true, verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } });

  app.post(path, (req, res, next) => {
    if (!secret) { log.error('[fillout] FILLOUT_WEBHOOK_SECRET is not set; refusing the webhook'); return res.status(401).json({ error: 'Webhook not configured' }); }
    if (!I.secretMatches(I.secretFromRequest(req), secret)) return res.status(401).json({ error: 'Unauthorised' });
    next();
  }, parse, async (req, res) => {
    try {
      const payload = req.body;
      const sid = I.submissionId(payload);
      if (!sid) {
        const saved = await svc.saveRejected(req.rawBody, 'No submission.submissionId in body');
        log.error(`[fillout] body without submissionId saved as ${saved}`);
        return res.status(400).json({ error: 'No submission.submissionId', saved });
      }
      const r = await svc.receive(payload);
      res.status(200).json({ ok: true, id: r.id, duplicate: r.duplicate });
      if (!r.duplicate) setImmediate(() => svc.process(r.id));
      else log.info(`[fillout] duplicate delivery of ${sid} ignored (row ${r.id}, ${r.status})`);
    } catch (err) {
      log.error('[fillout] webhook failed before the payload could be saved:', err, '\nbody (first 2000 chars):', String(req.rawBody || '').slice(0, 2000));
      res.status(500).json({ error: err.message });
    }
  }, (err, req, res, _next) => {
    // The parser refused the body (too large, bad JSON). Never silently: log it,
    // and keep whatever text we have.
    const size = req.headers['content-length'] || '?';
    log.error(`[fillout] webhook body rejected: ${err.type || err.name} ${err.message} (content-length ${size})`);
    const text = req.rawBody || '';
    if (text) {
      svc.saveRejected(text, `${err.type || err.name}: ${err.message}`)
        .then(sid => log.error(`[fillout] rejected body kept as ${sid}`))
        .catch(e => log.error('[fillout] could not keep the rejected body:', e, '\nfirst 2000 chars:', text.slice(0, 2000)));
    } else {
      log.error('[fillout] no body text was available to keep');
    }
    res.status(err.status || 400).json({ error: err.message });
  });
  return path;
}

function mountApi(app, svc) {
  const wrap = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };

  app.get('/api/fillout/submissions', wrap(async (_req, res) => res.json({ submissions: await svc.listSubmissions() })));
  app.post('/api/fillout/submissions/:id/reprocess', wrap(async (req, res) => res.json(await svc.process(req.params.id))));

  app.get('/api/clients/:clientId/record', wrap(async (req, res) => {
    const rec = await svc.record(req.params.clientId);
    if (!rec) return res.status(404).json({ error: 'Client not found.' });
    res.json(rec);
  }));
  app.put('/api/clients/:clientId/record/:key', wrap(async (req, res) => {
    const body = req.body || {};
    if (!('value' in body)) return res.status(400).json({ error: 'Body needs {value}' });
    res.json(await svc.setField(req.params.clientId, req.params.key, body.value));
  }));
  app.get('/api/clients/:clientId/audio/:audioId', wrap(async (req, res) => {
    const a = await svc.audio(req.params.clientId, req.params.audioId);
    if (!a) return res.status(404).json({ error: 'No stored copy of this recording.' });
    res.setHeader('Content-Type', a.contentType);
    res.setHeader('Content-Length', a.buffer.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.end(a.buffer);
  }));
  // Price rows (fillout/prices.js): re-extract or retry, edit, add, delete, not applicable
  app.post('/api/clients/:clientId/prices/extract', wrap(async (req, res) => { const r = await svc.extractPrices(req.params.clientId, { force: true }); res.json({ ...r, prices: await svc.priceView(req.params.clientId) }); }));
  app.put('/api/clients/:clientId/prices/not-applicable', wrap(async (req, res) => { await svc.setPricesNotApplicable(req.params.clientId, !!(req.body && req.body.value)); res.json(await svc.priceView(req.params.clientId)); }));
  app.post('/api/clients/:clientId/prices', wrap(async (req, res) => res.json(await svc.addPriceRow(req.params.clientId, req.body || {}))));
  app.put('/api/clients/:clientId/prices/:rowId', wrap(async (req, res) => res.json(await svc.setPriceRow(req.params.clientId, req.params.rowId, req.body || {}))));
  app.delete('/api/clients/:clientId/prices/:rowId', wrap(async (req, res) => res.json(await svc.deletePriceRow(req.params.clientId, req.params.rowId))));
  app.post('/api/clients/:clientId/archive', wrap(async (req, res) => res.json(await svc.setClientFlags(req.params.clientId, { archived: true }))));
  app.post('/api/clients/:clientId/unarchive', wrap(async (req, res) => res.json(await svc.setClientFlags(req.params.clientId, { archived: false }))));
  app.post('/api/clients/:clientId/reviewed', wrap(async (req, res) => res.json(await svc.setClientFlags(req.params.clientId, { reviewed: req.body && req.body.reviewed === false ? false : true }))));
}

module.exports = { mountWebhook, mountApi };
