'use strict';

// ── The redesigned UI's own routes (27 Oct 2026) ──────────────────────────────
//   GET /api/dashboard            tiles, the clients table rows, what is running
//   GET /api/dashboard/running    what is running now (polled)
//   GET /api/dashboard/rankings   Top 3% per client per month from the stored scans
//   GET /api/clients/:id/summary  one client's row, what is running, the facts the pages are missing
//   PUT /api/clients/:id/assigned-to   { name }
//   GET /api/tasks                every open task across the clients with its owner and SOP (team/rules.js)
// and the app shell for every app path (public/app/index.html). Read only apart
// from assigned_to. Nothing here changes the pipeline.

const path = require('path');
const D = require('./dashboard');
const T = require('../team/rules');

const APP_PATHS = ['/dashboard', '/tasks', '/board', '/clients', '/clients/*', '/add-client', '/niches', '/niches/*', '/trade-facts', '/directories', '/reviews', '/prompts', '/settings'];

async function ensureUiColumns(pool) {
  await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_to TEXT`);
}

function mountUiApi(app, { pool, tradeFacts = null, runners = () => ({}), homepageRunning = () => null, formGaps = null }) {
  const wrap = fn => async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database not configured.' });
    try { res.json(await fn(req)); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };
  app.get('/api/dashboard', wrap(() => D.loadDashboard({ pool, tradeFacts, runners: runners(), homepageRunning: homepageRunning(), formGaps })));
  app.get('/api/dashboard/running', wrap(async () => { const d = await D.loadDashboard({ pool, tradeFacts, runners: runners(), homepageRunning: homepageRunning(), formGaps }); return { running: d.running, generated_at: d.generated_at }; }));
  app.get('/api/dashboard/rankings', wrap(req => D.loadRankings({ pool, months: Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 6)) })));
  // One client's dashboard row plus the facts the pages are missing (the client page header and Record tab)
  app.get('/api/clients/:id/summary', wrap(async req => {
    const d = await D.loadDashboard({ pool, tradeFacts, runners: runners(), homepageRunning: homepageRunning(), formGaps, clientId: req.params.id });
    if (!d.clients.length) throw Object.assign(new Error('Client not found.'), { status: 404 });
    return { row: d.clients[0], running: d.running, missing_facts: await D.loadMissingFacts({ pool, clientId: req.params.id }), stages: d.stages };
  }));
  // The task board: the Tracker's steps for a person on every client, plus the asks waiting on Brandon, each with the
  // role that does it. The screen filters by person; nothing is stored, so a task closes when its step is done.
  app.get('/api/tasks', wrap(async () => {
    const d = await D.loadDashboard({ pool, tradeFacts, runners: runners(), homepageRunning: homepageRunning(), formGaps });
    const blocks = T.tasksOf(d.clients);
    return { blocks, counts: T.counts(blocks), roles: T.ROLE_LABELS, generated_at: d.generated_at };
  }));
  app.put('/api/clients/:id/assigned-to', wrap(async req => {
    const name = String((req.body || {}).name || '').trim().slice(0, 80);
    const { rows } = await pool.query(`UPDATE clients SET assigned_to = $2 WHERE id = $1 RETURNING id, assigned_to`, [req.params.id, name || null]);
    if (!rows.length) throw Object.assign(new Error('Client not found.'), { status: 404 });
    return { id: rows[0].id, assigned_to: rows[0].assigned_to || '' };
  }));
}

function mountAppShell(app, publicDir) {
  const index = path.join(publicDir, 'app', 'index.html');
  app.get(APP_PATHS, (_req, res) => res.sendFile(index));
}

module.exports = { mountUiApi, mountAppShell, ensureUiColumns, APP_PATHS };
