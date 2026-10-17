'use strict';

// ── Clients landing page API (niche tabs and allocation) ────────────────────
//   GET  /api/niches                      the niche list and the tab counts
//   GET  /api/clients                     every client with allocation fields, suggestion, duplicate flag
//   POST /api/clients                     name + niche_key + signed_on (trade still accepted for the old callers)
//   POST /api/clients/:id/allocate        {niche_key, signed_on} from New Clients (source confirmed)
//   POST /api/clients/:id/move            {niche_key}: Move to another niche (source manual)
// The list and create routes replace the ones server.js had; behaviour for old callers is kept.

const A = require('./allocation');
const N = require('./niches');

async function listClients(pool, { archived = false } = {}) {
  const { rows } = await pool.query(`SELECT * FROM clients ORDER BY created_at DESC`);
  const { rows: counts } = await pool.query(`SELECT client_id, COUNT(*)::int AS n FROM pages GROUP BY client_id`);
  const pageCount = new Map(counts.map(r => [r.client_id, r.n]));
  const { rows: reviewed } = await pool.query(`SELECT id, reviewed_at FROM clients`); // explicit, pg-mem returns it with * anyway
  const rv = new Map(reviewed.map(r => [r.id, r.reviewed_at]));
  const decorated = await A.decorate(pool, rows.map(c => ({ ...c, page_count: pageCount.get(c.id) || 0, reviewed_at: c.reviewed_at === undefined ? rv.get(c.id) : c.reviewed_at })));
  return {
    clients: decorated.filter(c => archived || !c.archived_at),
    tabs: A.tabs(decorated),
    niches: N.allNiches().map(n => ({ key: n.key, label: n.label })),
  };
}

function mountClientRoutes(app, pool) {
  const wrap = fn => async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database not configured.' });
    try { await fn(req, res); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };

  app.get('/api/niches', wrap(async (req, res) => {
    const { tabs, niches } = await listClients(pool, { archived: req.query.archived === '1' });
    res.json({ niches, tabs });
  }));

  app.get('/api/clients', wrap(async (req, res) => {
    res.json(await listClients(pool, { archived: req.query.archived === '1' }));
  }));

  app.post('/api/clients', wrap(async (req, res) => {
    const { name, trade, niche_key, signed_on } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required.' });
    const key = niche_key || (trade ? N.nicheKeyFor(trade) : null);
    if (!key) return res.status(400).json({ error: 'niche_key (or trade) is required.' });
    if (!N.nicheByKey(key)) return res.status(400).json({ error: `Unknown niche: ${key}` });
    const tradeValue = trade && !niche_key ? String(trade).trim() : N.nicheLabel(key);
    const { rows } = await pool.query('INSERT INTO clients (name, trade) VALUES ($1, $2) RETURNING *', [String(name).trim(), tradeValue]);
    // A client made by hand goes straight into its niche tab
    const allocated = await A.allocate(pool, rows[0].id, { nicheKey: key, signedOn: signed_on || A.toDate(new Date()), source: 'manual' });
    res.json({ ...rows[0], ...allocated, trade: tradeValue, niche_label: N.nicheLabel(key) });
  }));

  app.post('/api/clients/:id/allocate', wrap(async (req, res) => {
    const { niche_key, signed_on } = req.body || {};
    const row = await A.allocate(pool, req.params.id, { nicheKey: niche_key, signedOn: signed_on, source: 'confirmed' });
    res.json({ ...row, niche_label: N.nicheLabel(row.niche_key), tabs: (await listClients(pool)).tabs });
  }));

  app.post('/api/clients/:id/move', wrap(async (req, res) => {
    const row = await A.move(pool, req.params.id, (req.body || {}).niche_key);
    res.json({ ...row, niche_label: N.nicheLabel(row.niche_key), tabs: (await listClients(pool)).tabs });
  }));
}

module.exports = { mountClientRoutes, listClients };
