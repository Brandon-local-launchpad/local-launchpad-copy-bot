'use strict';

// ── Review & Referral Cards: the tab's storage (13 Nov 2026, Brandon) ────────────────────────
// One table (new, nothing else changed):
//   client_card_briefs   one row per client: the tab's own fields and its overrides of the
//                        record's values, who last copied the brief, and the sign-off ticks
// view(clientId): the record is read afresh every time, so the brief always carries the current
//   record values, except where a person has overridden one on the tab.
// Nothing here writes to Client Values or any other part of the record, and nothing is sent
// anywhere: a person copies the brief and pastes it into a new Claude chat.

const fs = require('fs');
const path = require('path');
const R = require('./rules');

const str = v => (v == null ? '' : String(v)).trim();
const bad = (m, status = 400) => Object.assign(new Error(m), { status });
const parse = v => (v == null ? null : typeof v === 'string' ? JSON.parse(v) : v);
const IMAGE_ROOT = path.join(__dirname, '..', 'public', 'card-templates');

async function ensureCardBriefTables(pool) {
  // Already there: nothing to do (the tests' in-memory Postgres refuses a second CREATE TABLE IF NOT EXISTS)
  try { await pool.query(`SELECT 1 FROM client_card_briefs LIMIT 1`); return; } catch (_) { /* not made yet */ }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_card_briefs (
      client_id      UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      fields         JSONB NOT NULL,
      signoff        JSONB NOT NULL,
      last_copied_at TIMESTAMPTZ,
      last_copied_by TEXT,
      updated_at     TIMESTAMPTZ NOT NULL
    )`);
}

// The gallery: the same for every client. A file that is not there is a null, and the tab
// shows "Example not added yet" in its place.
function templates(imageRoot = IMAGE_ROOT) {
  return R.TEMPLATES.map(t => ({
    id: t.id, name: t.name, look: t.look, best_for: t.best_for,
    images: R.IMAGE_SLOTS.map(([kind, side, label]) => {
      const rel = `${kind}/${t.stem}-${side}.webp`;
      return { kind, side, label, url: fs.existsSync(path.join(imageRoot, rel)) ? `/card-templates/${rel}` : null };
    }),
  }));
}

// loadValues: clientId → Client Values (unconfirmed form values already blanked)
// baseTown:   clientId → the onboarding form's base town, or ''
// pageRows:   clientId → the page map's rows
function createCardBrief({ pool, loadValues, baseTown = async () => '', pageRows = async () => [], imageRoot = IMAGE_ROOT, now = () => new Date(), log = console }) {
  let ready = null;
  const q = async (sql, params) => {
    if (!ready) ready = ensureCardBriefTables(pool).catch(err => { ready = null; throw err; });
    await ready;
    return pool.query(sql, params);
  };

  async function clientOf(clientId) {
    const { rows } = await q(`SELECT id, name FROM clients WHERE id = $1`, [clientId]);
    if (!rows.length) throw bad('Client not found.', 404);
    return rows[0];
  }
  async function rowOf(clientId) {
    const { rows } = await q(`SELECT * FROM client_card_briefs WHERE client_id = $1`, [clientId]);
    const r = rows[0];
    return r ? { ...r, fields: parse(r.fields) || {}, signoff: parse(r.signoff) || {} } : { fields: {}, signoff: {}, last_copied_at: null, last_copied_by: null };
  }
  async function write(clientId, patch) {
    const cur = await rowOf(clientId);
    const next = { ...cur, ...patch };
    const params = [clientId, JSON.stringify(next.fields), JSON.stringify(next.signoff), next.last_copied_at || null, next.last_copied_by || null, now().toISOString()];
    const { rows } = await q(`SELECT 1 FROM client_card_briefs WHERE client_id = $1`, [clientId]);
    if (rows.length) await q(`UPDATE client_card_briefs SET fields = $2, signoff = $3, last_copied_at = $4, last_copied_by = $5, updated_at = $6 WHERE client_id = $1`, params);
    else await q(`INSERT INTO client_card_briefs (client_id, fields, signoff, last_copied_at, last_copied_by, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`, params);
  }

  // What the record gives today. A part that cannot be read is left blank, never a failure of the tab.
  async function recordOf(client) {
    const soft = async (what, fn, empty) => { try { return await fn(); } catch (err) { log.error(`[card-brief] ${what} could not be read (${client.name}):`, err.message); return empty; } };
    const cv = (await loadValues(client.id)) || {};
    const town = await soft('the base town', () => baseTown(client.id), '');
    const rows = await soft('the page map', () => pageRows(client.id), []);
    return R.recordValues({ cv, clientName: client.name, baseTown: town, pageRows: rows });
  }

  async function view(clientId) {
    const client = await clientOf(clientId);
    const [record, row] = [await recordOf(client), await rowOf(clientId)];
    const built = R.build({ record, saved: row.fields, now: now() });
    return {
      client: { id: client.id, name: client.name },
      ...built,
      filename: `${R.slugOf(built.fields.business_name.value || client.name)}-card-brief.md`,
      options: { trades: [...R.TRADES, 'other'], sole: R.SOLE, logo_types: R.LOGO_TYPES, feels: R.FEELS },
      templates: templates(imageRoot),
      last_copied: row.last_copied_at ? { at: new Date(row.last_copied_at).toISOString(), by: row.last_copied_by || '' } : null,
      signoff: R.SIGNOFF.map(([key, label]) => ({ key, label, ...(row.signoff[key] ? { ticked: true, at: row.signoff[key].at, by: row.signoff[key].by || '' } : { ticked: false }) })),
    };
  }

  // set: { key: value } typed on the tab; reset: [key] back to the record's value (or the default)
  async function save(clientId, { set = {}, reset = [] } = {}) {
    const client = await clientOf(clientId);
    const record = await recordOf(client);
    const fields = { ...(await rowOf(clientId)).fields };
    for (const [key, value] of Object.entries(set && typeof set === 'object' ? set : {})) {
      const v = R.clean(key, value);
      if (v === undefined) throw bad(`"${key}" cannot be saved as ${JSON.stringify(value)}.`);
      // Typed back to what the record says: no override, so a later change on the record shows here
      if (R.AUTO.includes(key) && v === ((record[key] || {}).value || '')) delete fields[key];
      else fields[key] = v;
    }
    for (const key of Array.isArray(reset) ? reset : []) delete fields[str(key)];
    await write(clientId, { fields });
    return view(clientId);
  }

  async function copied(clientId, { by = '' } = {}) {
    await clientOf(clientId);
    const v = await view(clientId);
    if (v.readiness.level === 'red') throw bad(v.readiness.text, 409);
    await write(clientId, { last_copied_at: now().toISOString(), last_copied_by: str(by).slice(0, 120) });
    return view(clientId);
  }

  async function signoff(clientId, { key, ticked, by = '' } = {}) {
    await clientOf(clientId);
    if (!R.SIGNOFF.some(([k]) => k === key)) throw bad('That is not a sign-off box.');
    const cur = { ...(await rowOf(clientId)).signoff };
    if (ticked === true) cur[key] = { at: now().toISOString(), by: str(by).slice(0, 120) };
    else delete cur[key];
    await write(clientId, { signoff: cur });
    return view(clientId);
  }

  return { view, save, copied, signoff };
}

module.exports = { createCardBrief, ensureCardBriefTables, templates, IMAGE_ROOT };
