'use strict';

// ── Blog settings on the client (stage 1, 28 Oct 2026) ───────────────────────
// Three facts the blog needs that are not copy values: the launch date (B10 dates the
// schedule from it; no date means the launch posts go up as drafts), the client's
// status (active or churned: the daily job turns a churned client's scheduled posts
// into drafts) and the Search Console property (the month 6 batch reads it). They sit
// on the clients row, add only and idempotent at start-up like every migration here.

const STATUSES = ['active', 'churned'];

async function ensureBlogColumns(pool) {
  await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS launch_date DATE`);
  await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`);
  await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS search_console_property TEXT`);
  // The blog question bank per trade (blog/bank-store.js)
  await require('./bank-store').ensureBankTables(pool);
}

const isoDate = d => { if (!d) return null; const s = d instanceof Date ? d.toISOString() : String(d); return s.slice(0, 10); };

async function getBlogSettings(pool, clientId) {
  const { rows } = await pool.query(`SELECT id, name, launch_date, status, search_console_property FROM clients WHERE id = $1`, [clientId]);
  if (!rows.length) throw Object.assign(new Error('Client not found.'), { status: 404 });
  const r = rows[0];
  return { launch_date: isoDate(r.launch_date), status: r.status || 'active', search_console_property: r.search_console_property || '' };
}

// patch: { launch_date: 'YYYY-MM-DD' | '', status: 'active' | 'churned', search_console_property: string }
async function saveBlogSettings(pool, clientId, patch = {}) {
  const cur = await getBlogSettings(pool, clientId);
  const next = { ...cur };
  if (patch.launch_date !== undefined) {
    const v = String(patch.launch_date || '').trim();
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw Object.assign(new Error('Launch date must be a date, as YYYY-MM-DD.'), { status: 400 });
    if (v && Number.isNaN(Date.parse(v))) throw Object.assign(new Error(`"${v}" is not a real date.`), { status: 400 });
    next.launch_date = v || null;
  }
  if (patch.status !== undefined) {
    const v = String(patch.status || '').trim().toLowerCase();
    if (!STATUSES.includes(v)) throw Object.assign(new Error(`Status must be one of: ${STATUSES.join(', ')}.`), { status: 400 });
    next.status = v;
  }
  if (patch.search_console_property !== undefined) next.search_console_property = String(patch.search_console_property || '').trim();
  await pool.query(`UPDATE clients SET launch_date = $2, status = $3, search_console_property = $4 WHERE id = $1`,
    [clientId, next.launch_date, next.status, next.search_console_property || null]);
  return getBlogSettings(pool, clientId);
}

module.exports = { ensureBlogColumns, getBlogSettings, saveBlogSettings, STATUSES };
