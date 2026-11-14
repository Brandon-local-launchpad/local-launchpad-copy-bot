'use strict';

// ── The People list (the task board, stage 1; Brandon, 14 Nov 2026) ─────────────────────
// Who works in Copybot and which job each holds (team/owners.json roles). There are no
// logins yet: the app still has one shared password, and each browser remembers which
// person is using it (public/app/shell.js). So this is who a task belongs to, not who may
// see what. Nobody is deleted: a person who leaves is made inactive and keeps their history.
//   GET  /api/team               { roles, people }
//   POST /api/team/people        { name, role, email }
//   PUT  /api/team/people/:id    { name, role, email, active }

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
  await seedPeople(pool);
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
  return { list, add, update, view: async () => ({ roles: R.ROLE_LABELS, people: await list() }) };
}

function mountTeamApi(app, { team }) {
  const wrap = fn => async (req, res) => {
    if (!team) return res.status(503).json({ error: 'Database not configured.' });
    try { res.json(await fn(req)); } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };
  app.get('/api/team', wrap(() => team.view()));
  app.post('/api/team/people', wrap(async req => ({ roles: R.ROLE_LABELS, people: await team.add(req.body) })));
  app.put('/api/team/people/:id', wrap(async req => ({ roles: R.ROLE_LABELS, people: await team.update(req.params.id, req.body) })));
}

module.exports = { ensureTeamTables, seedPeople, createTeam, mountTeamApi };
