'use strict';

// ── The chase message (10 Nov 2026, Brandon; Stage 4 of the automation plan) ─────────────
// When a client's form is missing answers the build needs, Copybot drafts the message that
// asks for them. A person copies it and sends it: Copybot never sends anything to a client
// (Brandon, 10 Nov: drafts only). The wording is a fixed template, no model; the list is
// the record's own "Needs attention" (fillout/attention.js), so it never asks for an answer
// the client has given.
//   needed  the blank answers that block the build, by the form's own question
//   worth   up to WORTH_MAX of the answers worth chasing, offered as "if you have a minute"
// Copying it is recorded (client_chases) with what was missing then, so the tracker stops
// asking for CHASE_AGAIN_DAYS and shows when the client was last chased.

const WORTH_MAX = 6, CHASE_AGAIN_DAYS = 3;
const str = v => (v == null ? '' : String(v)).trim();
// The form's question as a line in a message: its hint in brackets and a trailing full stop go, long ones are cut at a word
const line = label => { let t = str(label).replace(/\s*\([^)]*\)\s*$/, '').replace(/[.:]\s*$/, '').trim(); if (t.length > 110) t = t.slice(0, 110).replace(/\s+\S*$/, '') + '…'; return t; };

async function ensureChaseTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_chases (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id  UUID NOT NULL,
      missing    TEXT NOT NULL,
      copied_by  TEXT,
      copied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
}

// rec: the record as filloutService.record returns it (with `attention`)
function chaseItems(rec) {
  const needed = [], worth = [];
  for (const a of (rec && rec.attention) || []) {
    if (a.code === 'blank_needed') for (const f of a.fields || []) needed.push({ key: f.key, label: line(f.label) });
    else if (a.code === 'no_prices') needed.push({ key: 'prices', label: 'Your prices for the services you offer (a rough from and to for each is fine)' });
    else if (a.code === 'blank_chase') for (const f of a.fields || []) worth.push({ key: f.key, label: line(f.label) });
    else if (a.code === 'most_wanted_no_price') worth.push({ key: a.field, label: line(a.msg.replace(/^Most-wanted job has no price:\s*/, 'A price for ')) });
  }
  return { needed, worth };
}

function chaseMessage({ firstName = '', business = '', needed = [], worth = [], formUrl = '', email = '' }) {
  if (!needed.length && !worth.length) return '';
  const bullets = list => list.map(x => `- ${x.label}`).join('\n');
  const shown = worth.slice(0, WORTH_MAX), more = worth.length - shown.length;
  const link = formUrl ? `${formUrl}${email ? `${formUrl.includes('?') ? '&' : '?'}email=${encodeURIComponent(email)}` : ''}` : '';
  const parts = [`Hi ${firstName || 'there'},`, `Thanks for filling in the onboarding form${business ? ` for ${business}` : ''}.`];
  if (needed.length) parts.push(`Before we can build your site we still need ${needed.length === 1 ? 'one answer' : `${needed.length} answers`} from you:\n\n${bullets(needed)}`);
  if (shown.length) parts.push(`${needed.length ? 'If you have a minute, these would make the site better too' : 'A few more answers would make the site better, if you have a minute'}:\n\n${bullets(shown)}${more > 0 ? `\n- and ${more} more on the form` : ''}`);
  parts.push(link
    ? `You can reply to this message with the answers, or fill in the form again with the same email address. Leave everything else blank: your earlier answers are kept.\n\n${link}`
    : 'You can reply to this message with the answers.');
  parts.push('Thanks,\nLocal Launchpad');
  return parts.join('\n\n');
}

function createChase({ pool, filloutService, formUrl = () => process.env.FILLOUT_FORM_URL || '', now = () => new Date() }) {
  const last = async clientId => (await pool.query(`SELECT copied_at, copied_by, missing FROM client_chases WHERE client_id = $1 ORDER BY copied_at DESC LIMIT 1`, [clientId])).rows[0] || null;
  async function view(clientId) {
    const rec = await filloutService.record(clientId);
    if (!rec) return { has_form: false, needed: [], worth: [], message: '', last: null };
    const { needed, worth } = chaseItems(rec);
    const fields = (rec.sections || []).flatMap(s => s.fields || []);
    const val = k => { const f = fields.find(x => x.key === k); return f && f.status === 'filled' ? str(typeof f.value === 'string' ? f.value : '') : ''; };
    const l = await last(clientId);
    return {
      has_form: true, needed, worth,
      message: chaseMessage({ firstName: val('full_name').split(/\s+/)[0] || '', business: val('business_name'), needed, worth, formUrl: formUrl(), email: val('business_email') }),
      last: l ? { copied_at: l.copied_at, copied_by: l.copied_by, days_ago: Math.floor((now() - new Date(l.copied_at)) / 86400000) } : null,
    };
  }
  async function copied(clientId, by = '') {
    const v = await view(clientId);
    await pool.query(`INSERT INTO client_chases (client_id, missing, copied_by, copied_at) VALUES ($1, $2, $3, $4)`, [clientId, JSON.stringify({ needed: v.needed.map(x => x.key), worth: v.worth.map(x => x.key) }), str(by).slice(0, 80) || null, now()]);
    return view(clientId);
  }
  return { view, copied };
}

function mountChaseApi(app, { chase }) {
  const wrap = fn => async (req, res) => { try { res.json(await fn(req)); } catch (err) { res.status(err.status || 500).json({ error: err.message }); } };
  app.get('/api/clients/:clientId/chase', wrap(req => chase.view(req.params.clientId)));
  app.post('/api/clients/:clientId/chase/copied', wrap(req => chase.copied(req.params.clientId, (req.body || {}).by)));
}

module.exports = { ensureChaseTables, chaseItems, chaseMessage, createChase, mountChaseApi, WORTH_MAX, CHASE_AGAIN_DAYS };
