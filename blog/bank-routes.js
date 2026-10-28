'use strict';

// ── Blog question bank API ──────────────────────────────────────────────────────
// GET  /api/blog-bank                    every trade's bank: counts, warnings, approval, a run in progress
// GET  /api/blog-bank/:trade             one bank: its state, text and parsed topics
// POST /api/blog-bank/:trade/paste       { text } the reply pasted or uploaded from the Perplexity app
// POST /api/blog-bank/:trade/run         the Perplexity API run (background; GET shows its state)
// POST /api/blog-bank/:trade/approve     { who } the flag on the bank as it is now
// POST /api/blog-bank/:trade/unapprove   clears it
// GET  /api/blog-bank/prompt/:trade      the prompt as it would be sent (to paste into the Perplexity app)
// POST /api/blog-bank/:trade/load-file   the repo file blog-bank/<trade>.md saved over the row, unapproved
// POST /api/blog-bank/:trade/paa         the People also ask pass through DataForSEO (background; GET shows its state)
// GET  /api/blog-bank/:trade/paa-report  the last pass's report ({ text, date, cost, found, kept, … })

const B = require('./bank');

function mountBankApi(app, store, { trades = () => [] } = {}) {
  const send = (res, fn) => fn().then(r => res.json(r)).catch(err => res.status(err.status || 500).json({ error: err.message }));
  app.get('/api/blog-bank', (_req, res) => send(res, () => store.list(trades()).then(banks => ({ banks }))));
  app.get('/api/blog-bank/prompt/:trade', (req, res) => send(res, async () => ({ trade: req.params.trade, prompt: B.buildPrompt(String(req.params.trade || '').toLowerCase()) })));
  app.get('/api/blog-bank/:trade', (req, res) => send(res, async () => {
    const s = await store.status(req.params.trade);
    const r = await store.read(req.params.trade);
    const parsed = r.text ? B.parseBank(r.text) : null;
    return { ...s, text: r.text, topics: parsed ? parsed.topics : [], ranked: parsed ? parsed.ranked : [], rules: parsed ? parsed.rules : [], gaps: parsed ? parsed.gaps : [] };
  }));
  app.post('/api/blog-bank/:trade/paste', (req, res) => send(res, () => store.save(req.params.trade, (req.body || {}).text, { source: 'paste' })));
  app.post('/api/blog-bank/:trade/run', (req, res) => send(res, () => store.run(req.params.trade)));
  app.post('/api/blog-bank/:trade/load-file', (req, res) => send(res, () => store.loadFile(req.params.trade)));
  app.post('/api/blog-bank/:trade/paa', (req, res) => send(res, () => store.runPaa(req.params.trade)));
  app.get('/api/blog-bank/:trade/paa-report', (req, res) => send(res, async () => { const r = await store.paaReport(req.params.trade); if (!r) throw Object.assign(new Error('No People also ask report for this trade yet.'), { status: 404 }); return r; }));
  app.post('/api/blog-bank/:trade/approve', (req, res) => send(res, () => store.approve(req.params.trade, (req.body || {}).who)));
  app.post('/api/blog-bank/:trade/unapprove', (req, res) => send(res, () => store.unapprove(req.params.trade)));
}

module.exports = { mountBankApi };
