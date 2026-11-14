'use strict';

// ── QR codes: the subtab's storage (14 Nov 2026, Brandon) ────────────────────────────────────
// One table (new, nothing else changed):
//   client_qr_codes   one row per client: the values typed on the QR codes subtab (the review
//                     funnel link, the Temporary URL tick, and the overrides of record values)
// view(clientId): the record is read afresh every time, so a field always carries the current
//   record value, except where a person has changed it on the tab.
// Nothing here writes to Client Values or any other part of the record.

const R = require('./rules');

const str = v => (v == null ? '' : String(v)).trim();
const bad = (m, status = 400, extra = {}) => Object.assign(new Error(m), { status }, extra);
const parse = v => (v == null ? null : typeof v === 'string' ? JSON.parse(v) : v);

async function ensureQrTables(pool) {
  // Already there: nothing to do (the tests' in-memory Postgres refuses a second CREATE TABLE IF NOT EXISTS)
  try { await pool.query(`SELECT 1 FROM client_qr_codes LIMIT 1`); return; } catch (_) { /* not made yet */ }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_qr_codes (
      client_id  UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      fields     JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
}

// loadValues: clientId → Client Values (unconfirmed form values already blanked)
// nicheLabel: clientId → the client's niche as the onboarding form names it, or ''
function createQrCodes({ pool, loadValues, nicheLabel = async () => '', now = () => new Date(), log = console }) {
  let ready = null;
  const q = async (sql, params) => {
    if (!ready) ready = ensureQrTables(pool).catch(err => { ready = null; throw err; });
    await ready;
    return pool.query(sql, params);
  };

  async function clientOf(clientId) {
    const { rows } = await q(`SELECT id, name FROM clients WHERE id = $1`, [clientId]);
    if (!rows.length) throw bad('Client not found.', 404);
    return rows[0];
  }
  async function savedOf(clientId) {
    const { rows } = await q(`SELECT fields FROM client_qr_codes WHERE client_id = $1`, [clientId]);
    return rows.length ? parse(rows[0].fields) || {} : {};
  }
  async function write(clientId, fields) {
    const params = [clientId, JSON.stringify(fields), now().toISOString()];
    const { rows } = await q(`SELECT 1 FROM client_qr_codes WHERE client_id = $1`, [clientId]);
    if (rows.length) await q(`UPDATE client_qr_codes SET fields = $2, updated_at = $3 WHERE client_id = $1`, params);
    else await q(`INSERT INTO client_qr_codes (client_id, fields, updated_at) VALUES ($1, $2, $3)`, params);
  }

  // What the record gives today. The niche that cannot be read is left blank, never a failure of the tab.
  async function recordOf(client) {
    const cv = (await loadValues(client.id)) || {};
    let label = '';
    try { label = await nicheLabel(client.id); } catch (err) { log.error(`[qr-codes] the niche could not be read (${client.name}):`, err.message); }
    return R.recordValues({ cv, clientName: client.name, nicheLabel: label });
  }

  async function view(clientId) {
    const client = await clientOf(clientId);
    const built = R.build({ record: await recordOf(client), saved: await savedOf(clientId) });
    return { client: { id: client.id, name: client.name }, ...built };
  }

  // set: { key: value } typed on the tab; reset: [key] back to the record's value.
  // A refused value saves nothing, and the error names its field.
  async function save(clientId, { set = {}, reset = [] } = {}) {
    const client = await clientOf(clientId);
    const record = await recordOf(client);
    const fields = { ...(await savedOf(clientId)) };
    for (const [key, value] of Object.entries(set && typeof set === 'object' ? set : {})) {
      const c = R.clean(key, value);
      if (!c) throw bad(`"${key}" is not a field on the QR codes tab.`);
      if (c.error) throw bad(c.error, 400, { field: key });
      // Typed back to what the record says: no override, so a later change on the record shows here
      if (R.AUTO.includes(key) && c.value === ((record[key] || {}).value || '')) delete fields[key];
      else if (key === 'website_temporary' && c.value === false) delete fields[key];
      else fields[key] = c.value;
    }
    for (const key of Array.isArray(reset) ? reset : []) if (R.AUTO.includes(str(key))) delete fields[str(key)];
    await write(clientId, fields);
    return view(clientId);
  }

  return { view, save };
}

// Behind the login, like every client tab:
//   GET /api/clients/:id/qr-codes                   the subtab: every field with its notes
//   PUT /api/clients/:id/qr-codes  { set, reset }   save values typed on the tab; reset puts a line back to the record's value
function mount(app, svc, { log = console } = {}) {
  const wrap = fn => async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[qr-codes]', err.message); res.status(err.status || 500).json({ error: err.message, ...(err.field ? { field: err.field } : {}) }); }
  };
  const body = req => (req.body && typeof req.body === 'object' ? req.body : {});
  app.get('/api/clients/:id/qr-codes', wrap(req => svc.view(req.params.id)));
  app.put('/api/clients/:id/qr-codes', wrap(req => svc.save(req.params.id, { set: body(req).set, reset: body(req).reset })));
}

module.exports = { createQrCodes, ensureQrTables, mount };
