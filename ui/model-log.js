'use strict';

// ── The model log (27 Oct 2026): one row per model call, for Settings' spend this month ──
// Written from anthropic-call.js's onUsage (every v20 call) and the few direct callers.
// Prices per million tokens in US dollars, kept in code; cost is stored in pence at the
// rate below so the Settings page adds it up without a lookup. The table is created at
// start-up (CREATE TABLE IF NOT EXISTS), add only.

const USD_TO_GBP = 0.78;
// [input, output, cache read, cache write] per million tokens, USD
const PRICES = {
  'claude-opus-5-5': [15, 75, 1.5, 18.75], 'claude-sonnet-5-5': [3, 15, 0.3, 3.75], 'claude-haiku-5-5': [0.8, 4, 0.08, 1],
  'claude-sonnet-4-6': [3, 15, 0.3, 3.75], 'claude-opus-4-6': [15, 75, 1.5, 18.75], 'claude-haiku-4-5': [0.8, 4, 0.08, 1],
};
const priceFor = model => { const m = String(model || ''); const k = Object.keys(PRICES).find(p => m.startsWith(p)); return k ? PRICES[k] : [3, 15, 0.3, 3.75]; };

function costPence(model, usage = {}) {
  const [i, o, cr, cw] = priceFor(model);
  const usd = ((usage.input_tokens || 0) * i + (usage.output_tokens || 0) * o + (usage.cache_read_input_tokens || 0) * cr + (usage.cache_creation_input_tokens || 0) * cw) / 1e6;
  return Math.round(usd * USD_TO_GBP * 100 * 100) / 100;
}

async function ensureModelLogTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS model_calls (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      client_id           UUID,
      page_type           TEXT,
      page_key            TEXT,
      call_type           TEXT,
      model               TEXT NOT NULL,
      input_tokens        INTEGER NOT NULL DEFAULT 0,
      output_tokens       INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens   INTEGER NOT NULL DEFAULT 0,
      cache_write_tokens  INTEGER NOT NULL DEFAULT 0,
      cost_pence          NUMERIC(10, 2) NOT NULL DEFAULT 0
    )`);
}

// The logger: callers pass what they know (client, page, call type); nothing waits on it
function createModelLog(pool, { log = console } = {}) {
  const context = { client_id: null, page_type: null, page_key: null, call_type: null };
  async function record({ model, usage = {}, client_id = null, page_type = null, page_key = null, call_type = null }) {
    if (!pool) return;
    try {
      await pool.query(`INSERT INTO model_calls (client_id, page_type, page_key, call_type, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_pence) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [client_id || context.client_id, page_type || context.page_type, page_key || context.page_key, call_type || context.call_type, String(model || 'unknown'), usage.input_tokens || 0, usage.output_tokens || 0, usage.cache_read_input_tokens || 0, usage.cache_creation_input_tokens || 0, costPence(model, usage)]);
    } catch (e) { log.error('[model-log] not written:', e.message); }
  }
  // anthropic-call.js's onUsage(model, usage), plain or tagged with the call type and page
  const onUsage = (model, usage) => { record({ model, usage }); };
  const tagged = (call_type, extra = {}) => (model, usage) => { record({ model, usage, call_type, ...extra }); };
  // Spend this month and by call type, for Settings
  async function spend({ now = new Date() } = {}) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const { rows } = await pool.query(`SELECT call_type, model, COUNT(*)::int AS calls, SUM(cost_pence)::float AS pence, SUM(input_tokens)::bigint AS input_tokens, SUM(output_tokens)::bigint AS output_tokens FROM model_calls WHERE at >= $1 GROUP BY call_type, model ORDER BY pence DESC`, [start]);
    const total = rows.reduce((n, r) => n + (Number(r.pence) || 0), 0);
    const { rows: last } = await pool.query(`SELECT at, client_id, page_type, page_key, call_type, model, input_tokens, output_tokens, cost_pence FROM model_calls ORDER BY at DESC LIMIT 20`);
    return { month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`, total_pence: Math.round(total * 100) / 100, calls: rows.reduce((n, r) => n + r.calls, 0), by: rows.map(r => ({ ...r, pence: Math.round((Number(r.pence) || 0) * 100) / 100, input_tokens: Number(r.input_tokens), output_tokens: Number(r.output_tokens) })), last };
  }
  return { record, onUsage, tagged, spend, context, costPence };
}

module.exports = { ensureModelLogTable, createModelLog, costPence, PRICES, USD_TO_GBP };
