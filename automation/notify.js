'use strict';

// ── Emails to the person operating Copybot (10 Nov 2026, Brandon) ────────────────────────
// For a client with Automation on, one email each time the chain stops for a person: the
// towns are ready to approve, the pages are written, a step stopped or was refused,
// everything is done. Never one per page. And one digest a morning listing every such
// client with something waiting, so a missed email is not a missed client.
// To: the review approver saved for the client (review_settings.approver_email, the Reviews
// tab), else AUTOMATION_NOTIFY_EMAIL, else nobody. From listings@locallaunchpad.co.uk through
// the Gmail connection the listings inbox already has (citations/inbox/gmail.js send).
// These go to the operator only. Nothing here writes to a client.
// The link is COPYBOT_URL + /clients/<id>; with no COPYBOT_URL the email names the client page.

const DIGEST_HOUR_UK = 8, NEEDS_MAX = 8;
const str = v => (v == null ? '' : String(v)).trim();
const valid = a => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(a));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
const base = env => str(env.COPYBOT_URL).replace(/\/+$/, '');
const clientLink = (row, env) => (base(env) ? `${base(env)}/clients/${row.id}` : `Copybot, Clients, ${row.name}`);
const hello = name => (str(name) ? `Hi ${str(name).split(/\s+/)[0]},` : 'Hello,');

// What happened, in a line, by the kind of stop (automation/runner.js gives the kind)
function headline(row, stop, text) {
  const p = row.pages || { total: 0, written: 0 };
  if (stop === 'locations_approve') return 'the towns are ready to approve';
  if (stop === 'pages') return `the pages are written: ${p.written} of ${p.total} clean`;
  if (stop === 'finished') return 'everything Copybot can do by itself is done';
  if (stop.startsWith('failed:')) return 'automation has stopped';
  if (stop.startsWith('blocked:')) return 'a step is waiting on you';
  return str(text).replace(/\.$/, '').replace(/^./, c => c.toLowerCase());
}

function stopEmail({ to, name = '', row, stop, text = '', env = process.env }) {
  const needs = ((row.tracker && row.tracker.needs) || []);
  const lines = [hello(name), '', `${row.name}: ${headline(row, stop, text)}.`];
  if ((stop.startsWith('failed:') || stop.startsWith('blocked:')) && str(text)) lines.push('', str(text));
  if (needs.length) {
    lines.push('', 'Waiting on you now:', '', ...needs.slice(0, NEEDS_MAX).map(n => `- ${n.text}`));
    if (needs.length > NEEDS_MAX) lines.push(`- and ${needs.length - NEEDS_MAX} more`);
  }
  if (stop.startsWith('failed:')) lines.push('', 'Once it is sorted, press Try again on the client\'s tracker.');
  else if (stop !== 'finished') lines.push('', 'Copybot carries on by itself once this is done.');
  lines.push('', `Open the client: ${clientLink(row, env)}`);
  return { to, subject: `${row.name}: ${headline(row, stop, text)}`, text: lines.join('\n') };
}

// rows: the dashboard rows of the clients with Automation on that have something for a person
function digestEmail({ to, name = '', rows, env = process.env }) {
  const n = rows.length;
  const lines = [hello(name), '', `${plural(n, 'client is', 'clients are')} waiting on a person this morning:`];
  for (const r of rows) {
    const needs = r.tracker.needs;
    lines.push('', `${r.name} (${plural(needs.length, 'thing')})`, ...needs.slice(0, 3).map(x => `- ${x.text}`));
    if (needs.length > 3) lines.push(`- and ${needs.length - 3} more`);
    lines.push(clientLink(r, env));
  }
  if (base(env)) lines.push('', `The whole queue: ${base(env)}/dashboard`);
  return { to, subject: `Copybot: ${plural(n, 'client')} waiting on a person`, text: lines.join('\n') };
}

async function ensureNotifyTables(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS automation_digests (day TEXT PRIMARY KEY, sent INTEGER NOT NULL DEFAULT 0, at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}

// deps: pool, send({ to, subject, text }) or null, loadRows() → the dashboard rows, env, now(), log
function createNotifier({ pool, send, loadRows, env = process.env, now = () => new Date(), log = () => {} }) {
  // Who is told about a client: its review approver, else the one fallback address
  async function recipients() {
    const m = new Map();
    const rows = await pool.query(`SELECT client_id, approver_name, approver_email FROM review_settings`).then(r => r.rows).catch(() => []);
    for (const r of rows) if (valid(r.approver_email)) m.set(r.client_id, { to: str(r.approver_email), name: str(r.approver_name) });
    const fallback = valid(env.AUTOMATION_NOTIFY_EMAIL) ? { to: str(env.AUTOMATION_NOTIFY_EMAIL), name: '' } : null;
    return id => m.get(id) || fallback;
  }

  // One stop, one email. Returns true when sent, false when there is nobody to tell or no way to send.
  async function stopped({ row, stop, text }) {
    if (!send) return false;
    const who = (await recipients())(row.id);
    if (!who) return false;
    await send(stopEmail({ ...who, row, stop, text, env }));
    log(`[automation] emailed ${who.to}: ${row.name}, ${stop}`);
    return true;
  }

  // The morning digest: once a day from 8am UK, to each address its own clients
  async function digest() {
    if (!send) return { sent: 0, why: 'no way to send' };
    const t = now();
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false }).format(t));
    if (hour < DIGEST_HOUR_UK) return { sent: 0, why: 'before 8am' };
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(t);
    if ((await pool.query(`SELECT day FROM automation_digests WHERE day = $1`, [day])).rows.length) return { sent: 0, why: 'already sent today' };
    await pool.query(`INSERT INTO automation_digests (day, sent, at) VALUES ($1, 0, $2)`, [day, t]);   // claimed before sending, so a restart never sends it twice
    const rows = (await loadRows()).filter(r => !r.archived && r.automation && r.automation.enabled && r.tracker && r.tracker.needs.length);
    const who = await recipients();
    const byTo = new Map();
    for (const r of rows) { const w = who(r.id); if (!w) continue; if (!byTo.has(w.to)) byTo.set(w.to, { ...w, rows: [] }); byTo.get(w.to).rows.push(r); }
    let sent = 0;
    for (const g of byTo.values()) { try { await send(digestEmail({ to: g.to, name: g.name, rows: g.rows, env })); sent++; } catch (err) { log(`[automation] digest to ${g.to} failed: ${err.message}`); } }
    await pool.query(`UPDATE automation_digests SET sent = $2 WHERE day = $1`, [day, sent]);
    return { sent, clients: rows.length };
  }

  return { stopped, digest, recipients };
}

module.exports = { stopEmail, digestEmail, headline, createNotifier, ensureNotifyTables, DIGEST_HOUR_UK };
