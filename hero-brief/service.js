'use strict';

// ── The hero graphic brief: storage and routes (14 Nov 2026, Brandon) ────────────────────────
// One table (new, nothing else changed):
//   client_hero_briefs   one row per client: what a person typed on the card (the three brand
//                        colours, the headline position, the lighting, any line changed), and
//                        who last copied the text
// The record is read afresh on every view, so the text always carries today's Primary category
// and base town unless a person changed that line on the card. Nothing here writes to the record,
// makes a picture or sends anything anywhere: a person copies the text into ChatGPT.
//   GET  /api/clients/:id/hero-brief                  every field, what is missing, the text
//   PUT  /api/clients/:id/hero-brief  { set, reset }  save typed lines; reset puts a line back to the record's
//   POST /api/clients/:id/hero-brief/copied  { by }   a person copied the text

const R = require('./rules');
const { heroChoiceOf } = require('../images/pick');

const str = v => (v == null ? '' : String(v)).trim();
const bad = (m, status = 400) => Object.assign(new Error(m), { status });
const parse = v => (v == null ? null : typeof v === 'string' ? JSON.parse(v) : v);

async function ensureHeroBriefTables(pool) {
  // Already there: nothing to do (the tests' in-memory Postgres refuses a second CREATE TABLE IF NOT EXISTS)
  try { await pool.query(`SELECT 1 FROM client_hero_briefs LIMIT 1`); return; } catch (_) { /* not made yet */ }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_hero_briefs (
      client_id      UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      fields         JSONB NOT NULL,
      last_copied_at TIMESTAMPTZ,
      last_copied_by TEXT,
      updated_at     TIMESTAMPTZ NOT NULL
    )`);
}

// loadValues: clientId → Client Values (unconfirmed form values already blanked)
// baseTown:   clientId → the onboarding form's base town, or ''
// stemFor:    Primary category → the niche library file stem, or null
// formAnswer: (clientId, key) → the onboarding form's answer to hero_image or colours, or ''
function createHeroBrief({ pool, loadValues, baseTown = async () => '', stemFor = () => null, formAnswer = async () => '', now = () => new Date(), log = console }) {
  let ready = null;
  const q = async (sql, params) => {
    if (!ready) ready = ensureHeroBriefTables(pool).catch(err => { ready = null; throw err; });
    await ready;
    return pool.query(sql, params);
  };

  async function clientOf(clientId) {
    const { rows } = await q(`SELECT id, name FROM clients WHERE id = $1`, [clientId]);
    if (!rows.length) throw bad('Client not found.', 404);
    return rows[0];
  }
  async function rowOf(clientId) {
    const { rows } = await q(`SELECT * FROM client_hero_briefs WHERE client_id = $1`, [clientId]);
    const r = rows[0];
    return r ? { ...r, fields: parse(r.fields) || {} } : { fields: {}, last_copied_at: null, last_copied_by: null };
  }
  async function write(clientId, patch) {
    const next = { ...(await rowOf(clientId)), ...patch };
    const params = [clientId, JSON.stringify(next.fields), next.last_copied_at || null, next.last_copied_by || null, now().toISOString()];
    const { rows } = await q(`SELECT 1 FROM client_hero_briefs WHERE client_id = $1`, [clientId]);
    if (rows.length) await q(`UPDATE client_hero_briefs SET fields = $2, last_copied_at = $3, last_copied_by = $4, updated_at = $5 WHERE client_id = $1`, params);
    else await q(`INSERT INTO client_hero_briefs (client_id, fields, last_copied_at, last_copied_by, updated_at) VALUES ($1, $2, $3, $4, $5)`, params);
  }

  // A part of the record that cannot be read is left blank and said on the card, never a failure of the card
  async function recordOf(client) {
    const problems = [];
    const soft = async (what, fn, empty) => {
      try { return await fn(); }
      catch (err) { log.error(`[hero-brief] ${what} could not be read (${client.name}):`, err.message); problems.push(`${what} could not be read: ${err.message}`); return empty; }
    };
    const cv = (await soft('Client Values', () => loadValues(client.id), {})) || {};
    const town = await soft('The base town', () => baseTown(client.id), '');
    const stem = await soft('The niche', async () => stemFor(cv.primary_category), null);
    const hero = await soft('The hero answer on the form', () => formAnswer(client.id, 'hero_image'), '');
    const colours = await soft('The colours answer on the form', () => formAnswer(client.id, 'colours'), '');
    return { record: R.recordValues({ cv, baseTown: town, stem: stem || '' }), hero: str(hero), colours: str(colours), problems };
  }

  async function view(clientId) {
    const client = await clientOf(clientId);
    const [rec, row] = [await recordOf(client), await rowOf(clientId)];
    const built = R.build({ record: rec.record, saved: row.fields });
    return {
      client: { id: client.id, name: client.name },
      hero_choice: heroChoiceOf(rec.hero), hero_answer: rec.hero, colours_answer: rec.colours,
      fields: built.fields, missing: built.missing, ready: built.ready, text: built.text, problems: rec.problems,
      options: { headline_position: R.POSITIONS, lighting: R.LIGHTING },
      reference_image: R.SCENES.defaults.reference_image,
      last_copied: row.last_copied_at ? { at: new Date(row.last_copied_at).toISOString(), by: row.last_copied_by || '' } : null,
    };
  }

  async function save(clientId, { set = {}, reset = [] } = {}) {
    const client = await clientOf(clientId);
    const { record } = await recordOf(client);
    const fields = { ...(await rowOf(clientId)).fields };
    for (const [key, value] of Object.entries(set && typeof set === 'object' ? set : {})) {
      const v = R.clean(key, value);
      if (v === undefined) throw bad(`"${key}" cannot be saved as ${JSON.stringify(value)}.`);
      // Typed back to what the record says, or emptied: no override, so a later change on the record shows here
      if (R.AUTO.includes(key) && (!v || v === ((record[key] || {}).value || ''))) delete fields[key];
      else fields[key] = v;
    }
    for (const key of Array.isArray(reset) ? reset : []) delete fields[str(key)];
    await write(clientId, { fields });
    return view(clientId);
  }

  async function copied(clientId, { by = '' } = {}) {
    const v = await view(clientId);
    if (!v.ready) throw bad(`The brief is not ready to copy. ${v.missing[0]}`, 409);
    await write(clientId, { last_copied_at: now().toISOString(), last_copied_by: str(by).slice(0, 120) });
    return view(clientId);
  }

  return { view, save, copied };
}

function mount(app, svc, { log = console } = {}) {
  const wrap = fn => async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[hero-brief]', err.message); res.status(err.status || 500).json({ error: err.message }); }
  };
  const body = req => (req.body && typeof req.body === 'object' ? req.body : {});
  app.get('/api/clients/:id/hero-brief', wrap(req => svc.view(req.params.id)));
  app.put('/api/clients/:id/hero-brief', wrap(req => svc.save(req.params.id, { set: body(req).set, reset: body(req).reset })));
  app.post('/api/clients/:id/hero-brief/copied', wrap(req => svc.copied(req.params.id, { by: body(req).by || '' })));
}

module.exports = { createHeroBrief, ensureHeroBriefTables, mount };
