'use strict';

// ── Trade facts API ──────────────────────────────────────────────────────────
// GET  /api/trade-facts                 every pack: niche, generated, model, verified (who, when)
// GET  /api/trade-facts/:niche          one pack's state and its markdown
// POST /api/trade-facts/:niche/verify   { who } sets the flag on the pack as it is now
// POST /api/trade-facts/:niche/unverify clears it
// GET  /api/trade-facts/:niche/service/:service  the loader's markdown for one service page

const P = require('./pack');

const NICHE = /^[a-z0-9-]+$/;

function mountTradeFactsApi(app, service) {
  const send = (res, fn) => fn().then(r => res.json(r)).catch(err => res.status(err.status || 500).json({ error: err.message }));
  const niche = (req, res) => {
    const n = String(req.params.niche || '').toLowerCase();
    if (!NICHE.test(n)) { res.status(400).json({ error: 'Bad niche name.' }); return null; }
    return n;
  };

  app.get('/api/trade-facts', (_req, res) => send(res, async () => ({ packs: await service.list(), coreMissing: !require('fs').existsSync(P.CORE_FILE) })));

  app.get('/api/trade-facts/:niche', (req, res) => {
    const n = niche(req, res); if (!n) return;
    send(res, async () => ({ ...(await service.status(n)), text: P.readPack(n).text }));
  });

  app.post('/api/trade-facts/:niche/verify', (req, res) => {
    const n = niche(req, res); if (!n) return;
    send(res, () => service.verify(n, (req.body || {}).who));
  });

  app.post('/api/trade-facts/:niche/unverify', (req, res) => {
    const n = niche(req, res); if (!n) return;
    send(res, () => service.unverify(n));
  });

  app.get('/api/trade-facts/:niche/service/:service', (req, res) => {
    const n = niche(req, res); if (!n) return;
    send(res, async () => P.packForService(n, String(req.params.service || '')));
  });
}

module.exports = { mountTradeFactsApi };
