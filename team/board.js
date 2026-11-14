'use strict';

// ── The task board, stage 4 (Brandon, 14 Nov 2026): how long a task has waited, and the
// morning email ───────────────────────────────────────────────────────────────────────────
// A task is not stored (it is a Tracker step: team/rules.js), so by itself it has no age.
// Every five minutes `tick` compares the open tasks with `team_task_log`: a task seen for
// the first time gets a row with when it opened, one no longer there gets when it closed.
// That gives "waiting 6 days" on a task (loadSince, read by ui/dashboard.js) and a history
// of what was done when. A row is never deleted.
// The morning email: once a day from 8am UK, to each active person on the People list who
// has an email there, their own open tasks, the longest waiting first. Nobody with no email
// or no tasks is written to, and nothing is ever sent to a client. TEAM_DIGEST_DISABLED=1
// stops it for everyone.
//   deps: pool, loadRows() → the dashboard's client rows, send({ to, subject, text }) or null,
//         people() → the People list, env, now(), log

const R = require('./rules');

const DIGEST_HOUR_UK = 8;
const DAY = 86400000;
const str = v => (v == null ? '' : String(v)).trim();
const valid = a => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(a));
const base = env => str(env.COPYBOT_URL).replace(/\/+$/, '');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;

async function ensureBoardTables(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS team_task_log (
    client_id UUID NOT NULL,
    step_key TEXT NOT NULL,
    owner TEXT,
    text TEXT,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS team_digests (
    day TEXT NOT NULL,
    person_id INTEGER NOT NULL,
    tasks INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ NOT NULL
  )`);
}

// Pure. open: the log's open rows [{ client_id, step_key }]; now: the tasks open now
// [{ client_id, key, owner, text }] → what to open and what to close
function diffLog(open, now) {
  const id = (c, k) => `${c}|${k}`;
  const was = new Set(open.map(r => id(r.client_id, r.step_key))), is = new Set(now.map(t => id(t.client_id, t.key)));
  return { opened: now.filter(t => !was.has(id(t.client_id, t.key))), closed: open.filter(r => !is.has(id(r.client_id, r.step_key))) };
}

// How long ago, in whole days; under a day is 0
const daysWaiting = (since, now = new Date()) => (since ? Math.max(0, Math.floor((new Date(now) - new Date(since)) / DAY)) : null);

// Every open task as flat rows (an ask sent with Tell Brandon keeps its own id, so two asks are two rows)
const flat = rows => R.tasksOf(rows).flatMap(b => b.steps.map(s => ({ client_id: b.client_id, key: s.key === 'ask' ? `ask_${s.ask_id}` : s.key, owner: s.owner, text: s.text })));

// For the dashboard: per client, when each open task opened
async function loadSince(pool) {
  const m = new Map();
  for (const r of (await pool.query(`SELECT client_id, step_key, opened_at FROM team_task_log WHERE closed_at IS NULL`)).rows) { if (!m.has(r.client_id)) m.set(r.client_id, {}); m.get(r.client_id)[r.step_key] = r.opened_at; }
  return m;
}

// The email: plain text, the client then its steps, the place to do them
function digestEmail({ person, blocks, env = process.env, now = new Date() }) {
  const total = blocks.reduce((n, b) => n + b.steps.length, 0), link = base(env);
  const lines = [`Morning ${person.name}.`, '', `${plural(total, 'task')} waiting on you in Copybot, on ${plural(blocks.length, 'client')}:`, ''];
  for (const b of blocks) {
    lines.push(b.client);
    for (const s of b.steps) { const d = daysWaiting(s.since, now); lines.push(`  - ${s.text}${d ? ` (waiting ${plural(d, 'day')})` : ''}${s.due ? ` (due ${s.due})` : ''}`); }
    if (link) lines.push(`  ${link}/clients/${b.client_id}`);
    lines.push('');
  }
  if (link) lines.push(`Your list: ${link}/tasks`);
  return { to: person.email, subject: `Copybot: ${plural(total, 'task')} waiting on you`, text: lines.join('\n').trim() };
}

function createBoard({ pool, loadRows, people, send = null, env = process.env, now = () => new Date(), log = () => {} }) {
  // The log kept in step with what is open now
  async function tick() {
    const tasks = flat(await loadRows());
    const open = (await pool.query(`SELECT client_id, step_key FROM team_task_log WHERE closed_at IS NULL`)).rows;
    const { opened, closed } = diffLog(open, tasks), at = now();
    for (const t of opened) await pool.query(`INSERT INTO team_task_log (client_id, step_key, owner, text, opened_at) VALUES ($1, $2, $3, $4, $5)`, [t.client_id, t.key, t.owner, str(t.text).slice(0, 500), at]);
    for (const r of closed) await pool.query(`UPDATE team_task_log SET closed_at = $3 WHERE client_id = $1 AND step_key = $2 AND closed_at IS NULL`, [r.client_id, r.step_key, at]);
    return { opened: opened.length, closed: closed.length, open: tasks.length };
  }

  // Once a day from 8am UK, to each person with an email and something to do
  async function digest() {
    if (!send) return { sent: 0, why: 'no way to send' };
    if (env.TEAM_DIGEST_DISABLED === '1') return { sent: 0, why: 'switched off' };
    const t = now();
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(t));
    if (hour < DIGEST_HOUR_UK) return { sent: 0, why: 'before 8am' };
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(t);
    const had = new Set((await pool.query(`SELECT person_id FROM team_digests WHERE day = $1`, [day])).rows.map(r => r.person_id));
    const due = (await people()).filter(p => p.active && valid(p.email) && !had.has(p.id));
    if (!due.length) return { sent: 0, why: had.size ? 'already sent today' : 'nobody on the People list has an email' };
    const rows = await loadRows();
    let sent = 0;
    for (const p of due) {
      const blocks = R.tasksOf(rows, { role: p.role, personId: p.id });
      const tasks = blocks.reduce((n, b) => n + b.steps.length, 0);
      await pool.query(`INSERT INTO team_digests (day, person_id, tasks, sent_at) VALUES ($1, $2, $3, $4)`, [day, p.id, tasks, t]);   // claimed before sending, so a restart never sends it twice
      if (!tasks) continue;
      try { await send(digestEmail({ person: p, blocks, env, now: t })); sent++; log(`[team] morning email to ${p.name}: ${plural(tasks, 'task')}`); }
      catch (err) { log(`[team] morning email to ${p.name} failed: ${err.message}`); }
    }
    return { sent };
  }

  return { tick, digest };
}

module.exports = { ensureBoardTables, createBoard, diffLog, daysWaiting, flat, loadSince, digestEmail, DIGEST_HOUR_UK };
