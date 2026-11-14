'use strict';

// ── The People list (the task board, stage 1; Brandon, 14 Nov 2026) ─────────────────────
// Who works in Copybot and which job each holds (team/owners.json roles). There are no
// logins yet: the app still has one shared password, and each browser remembers which
// person is using it (public/app/shell.js). So this is who a task belongs to, not who may
// see what. Nobody is deleted: a person who leaves is made inactive and keeps their history.
//   GET  /api/team               { roles, people }
//   POST /api/team/people        { name, role, email }
//   PUT  /api/team/people/:id    { name, role, email, active }
// Stage 2: the by hand steps a person has ticked (team_step_ticks) and the one off tasks added on a client (team_tasks).
// A tick or a task is never deleted: an undone tick and a done task keep their row.
//   POST /api/clients/:id/hand-steps/:key/done   { done, by }
//   POST /api/clients/:id/tasks                  { text, person_id | role, due, by }
//   POST /api/tasks/:id/done                     { done, by }

const R = require('./rules');

async function ensureTeamTables(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS team_people (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS team_step_ticks (
    client_id UUID NOT NULL,
    step_key TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT TRUE,
    done_by TEXT,
    done_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS team_tasks (
    id SERIAL PRIMARY KEY,
    client_id UUID NOT NULL,
    text TEXT NOT NULL,
    role TEXT NOT NULL,
    person_id INTEGER,
    due TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    done_by TEXT,
    done_at TIMESTAMPTZ
  )`);
  await seedPeople(pool);
}

// For the dashboard (ui/dashboard.js): per client, the by hand steps ticked and the open one off tasks
async function loadFacts(pool) {
  const ticks = new Map(), tasks = new Map();
  for (const r of (await pool.query(`SELECT client_id, step_key, done_by, done_at FROM team_step_ticks WHERE done = TRUE`)).rows) { if (!ticks.has(r.client_id)) ticks.set(r.client_id, {}); ticks.get(r.client_id)[r.step_key] = { by: r.done_by || '', at: r.done_at }; }
  const names = new Map((await pool.query(`SELECT id, name FROM team_people`)).rows.map(p => [p.id, p.name]));
  for (const r of (await pool.query(`SELECT id, client_id, text, role, person_id, due, created_by, created_at FROM team_tasks WHERE done_at IS NULL ORDER BY id`)).rows) { if (!tasks.has(r.client_id)) tasks.set(r.client_id, []); tasks.get(r.client_id).push({ id: r.id, text: r.text, role: r.role, person_id: r.person_id || null, person: names.get(r.person_id) || '', due: r.due || '', by: r.created_by || '', at: r.created_at }); }
  // The finished one off tasks, the newest first: the Done column of the boards
  const tasksDone = new Map();
  for (const r of (await pool.query(`SELECT id, client_id, text, role, person_id, done_by, done_at FROM team_tasks WHERE done_at IS NOT NULL ORDER BY done_at DESC`)).rows) { if (!tasksDone.has(r.client_id)) tasksDone.set(r.client_id, []); tasksDone.get(r.client_id).push({ id: r.id, text: r.text, role: r.role, person_id: r.person_id || null, done_by: r.done_by || '', done_at: r.done_at }); }
  return { ticks, tasks, tasksDone };
}

// The four Brandon named, once, on an empty table: after that the list is the team's to change
async function seedPeople(pool) {
  const { rows } = await pool.query(`SELECT COUNT(*) AS n FROM team_people`);
  if (Number(rows[0].n) === 0) for (const p of R.SEED_PEOPLE) await pool.query(`INSERT INTO team_people (name, role) VALUES ($1, $2)`, [p.name, p.role]);
}

const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });

function clean(body, { partial = false } = {}) {
  const b = body || {}, out = {};
  if (!partial || b.name !== undefined) { out.name = String(b.name || '').trim().slice(0, 80); if (!out.name) throw bad('A person needs a name.'); }
  if (!partial || b.role !== undefined) { out.role = String(b.role || '').trim(); if (!R.ROLES.includes(out.role)) throw bad(`The role must be one of: ${R.ROLES.join(', ')}.`); }
  if (b.email !== undefined) { out.email = String(b.email || '').trim().slice(0, 200) || null; if (out.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) throw bad('That email address does not look right.'); }
  if (b.active !== undefined) out.active = !!b.active;
  return out;
}

function createTeam({ pool }) {
  const person = r => ({ id: r.id, name: r.name, role: r.role, email: r.email || '', active: !!r.active });
  const list = async () => (await pool.query(`SELECT id, name, role, email, active FROM team_people ORDER BY active DESC, id`)).rows.map(person);
  const sameName = async (name, exceptId = 0) => (await list()).some(p => p.id !== exceptId && p.name.toLowerCase() === name.toLowerCase());

  async function add(body) {
    const p = clean(body);
    if (await sameName(p.name)) throw bad(`There is already a person called ${p.name}.`, 409);
    await pool.query(`INSERT INTO team_people (name, role, email) VALUES ($1, $2, $3)`, [p.name, p.role, p.email || null]);
    return list();
  }
  async function update(id, body) {
    const all = await list(), now = all.find(p => p.id === Number(id));
    if (!now) throw bad('No such person.', 404);
    const p = { ...now, ...clean(body, { partial: true }) };
    if (await sameName(p.name, now.id)) throw bad(`There is already a person called ${p.name}.`, 409);
    await pool.query(`UPDATE team_people SET name = $2, role = $3, email = $4, active = $5 WHERE id = $1`, [now.id, p.name, p.role, p.email || null, p.active]);
    return list();
  }
  // ── Stage 2 ──
  const who = b => String((b && b.by) || '').trim().slice(0, 80) || null;
  const clientThere = async id => { const { rows } = await pool.query(`SELECT id FROM clients WHERE id = $1`, [id]).catch(() => ({ rows: [] })); if (!rows.length) throw bad('Client not found.', 404); };

  // A by hand step ticked Done (or put back): one row per client and step, changed in place
  async function tickStep(clientId, key, body) {
    if (!R.handStep(key)) throw bad('No such step.', 404);
    await clientThere(clientId);
    const done = !body || body.done !== false;
    const { rows } = await pool.query(`SELECT step_key FROM team_step_ticks WHERE client_id = $1 AND step_key = $2`, [clientId, key]);
    if (rows.length) await pool.query(`UPDATE team_step_ticks SET done = $3, done_by = $4, done_at = NOW() WHERE client_id = $1 AND step_key = $2`, [clientId, key, done, who(body)]);
    else await pool.query(`INSERT INTO team_step_ticks (client_id, step_key, done, done_by) VALUES ($1, $2, $3, $4)`, [clientId, key, done, who(body)]);
    return { key, done };
  }

  // A one off task: for one person (it is then theirs alone), else for a job
  async function addTask(clientId, body) {
    const b = body || {}, text = String(b.text || '').trim().slice(0, 500);
    if (!text) throw bad('A task needs some words.');
    await clientThere(clientId);
    let role = String(b.role || '').trim(), personId = null;
    if (b.person_id) { const p = (await list()).find(x => x.id === Number(b.person_id) && x.active); if (!p) throw bad('No such person.', 404); personId = p.id; role = p.role; }
    if (!R.ROLES.includes(role)) throw bad('Say who the task is for.');
    const due = String(b.due || '').trim();
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw bad('The due date must be a date.');
    await pool.query(`INSERT INTO team_tasks (client_id, text, role, person_id, due, created_by) VALUES ($1, $2, $3, $4, $5, $6)`, [clientId, text, role, personId, due || null, who(b)]);
    const { rows } = await pool.query(`SELECT id FROM team_tasks WHERE client_id = $1 ORDER BY id DESC LIMIT 1`, [clientId]);
    return { id: rows[0].id, text, role, person_id: personId, due };
  }
  async function doneTask(id, body) {
    const { rows } = await pool.query(`SELECT id FROM team_tasks WHERE id = $1`, [Number(id) || 0]);
    if (!rows.length) throw bad('No such task.', 404);
    const done = !body || body.done !== false;
    if (done) await pool.query(`UPDATE team_tasks SET done_by = $2, done_at = NOW() WHERE id = $1`, [rows[0].id, who(body)]);
    else await pool.query(`UPDATE team_tasks SET done_by = NULL, done_at = NULL WHERE id = $1`, [rows[0].id]);
    return { id: rows[0].id, done };
  }

  return { list, add, update, view: async () => ({ roles: R.ROLE_LABELS, people: await list(), board: R.boardView() }), tickStep, addTask, doneTask };
}

function mountTeamApi(app, { team }) {
  const wrap = fn => async (req, res) => {
    if (!team) return res.status(503).json({ error: 'Database not configured.' });
    try { res.json(await fn(req)); } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };
  app.get('/api/team', wrap(() => team.view()));
  app.post('/api/team/people', wrap(async req => ({ roles: R.ROLE_LABELS, people: await team.add(req.body) })));
  app.put('/api/team/people/:id', wrap(async req => ({ roles: R.ROLE_LABELS, people: await team.update(req.params.id, req.body) })));
  app.post('/api/clients/:id/hand-steps/:key/done', wrap(req => team.tickStep(req.params.id, req.params.key, req.body)));
  app.post('/api/clients/:id/tasks', wrap(req => team.addTask(req.params.id, req.body)));
  app.post('/api/tasks/:id/done', wrap(req => team.doneTask(req.params.id, req.body)));
}

module.exports = { ensureTeamTables, seedPeople, loadFacts, createTeam, mountTeamApi };
