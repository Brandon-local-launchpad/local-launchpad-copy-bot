'use strict';

// ── v20 page records in the database ─────────────────────────────────────────
// Every version of every v20 page is one client_assets row (asset_type
// v20_page_record). metadata.page_type and metadata.page_key say which page it
// is: the homepage is ('homepage', 'homepage'); a category page will be
// ('category', its slug). Rows from before page types existed have no metadata
// and are the homepage.

const ASSET = 'v20_page_record';
const TYPE = `COALESCE(metadata->>'page_type', 'homepage')`;
const KEY = `COALESCE(metadata->>'page_key', 'homepage')`;
const parse = c => (typeof c === 'string' ? JSON.parse(c) : c);
const meta = m => (typeof m === 'string' ? JSON.parse(m) : m) || {};

function createV20Store(pool) {
  const row = r => ({ id: r.id, record: parse(r.content), at: r.uploaded_at, type: meta(r.metadata).page_type || 'homepage', key: meta(r.metadata).page_key || 'homepage' });
  return {
    async insert(clientId, record, { type, key }) {
      const { rows } = await pool.query(
        `INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, '${ASSET}', $2, $3, $4) RETURNING id`,
        [clientId, `${type}_${key}_v20.json`.replace(/[^a-zA-Z0-9_.-]+/g, '_'), JSON.stringify(record), JSON.stringify({ page_type: type, page_key: key })]
      );
      return rows[0].id;
    },
    // Newest first
    async versions(clientId, { type, key }, limit = 20) {
      const { rows } = await pool.query(
        `SELECT id, content, metadata, uploaded_at FROM client_assets WHERE client_id=$1 AND asset_type='${ASSET}' AND ${TYPE}=$2 AND ${KEY}=$3 ORDER BY uploaded_at DESC LIMIT ${Math.min(200, Math.max(1, limit | 0))}`,
        [clientId, type, key]
      );
      return rows.map(row);
    },
    async latest(clientId, page) {
      return (await this.versions(clientId, page, 1))[0] || null;
    },
    async byId(clientId, id) {
      if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
      const { rows } = await pool.query(`SELECT id, content, metadata, uploaded_at FROM client_assets WHERE id=$1 AND client_id=$2 AND asset_type='${ASSET}'`, [id, clientId]);
      return rows.length ? row(rows[0]) : null;
    },
    // Every page of a type the client has, with its latest version
    async pages(clientId, type) {
      const { rows } = await pool.query(
        `SELECT id, content, metadata, uploaded_at FROM client_assets WHERE client_id=$1 AND asset_type='${ASSET}' AND ${TYPE}=$2 ORDER BY uploaded_at DESC`,
        [clientId, type]
      );
      const seen = new Map();
      for (const r of rows.map(row)) if (!seen.has(r.key)) seen.set(r.key, r);
      return [...seen.values()];
    },
    // Patch a saved version's meta (the UI redesign's Approve: approved_at, approved_by)
    async setMeta(clientId, id, patch) {
      const found = await this.byId(clientId, id);
      if (!found) throw new Error('Record not found.');
      const out = { ...found.record, meta: { ...(found.record.meta || {}), ...patch } };
      await pool.query(`UPDATE client_assets SET content=$1 WHERE id=$2 AND client_id=$3`, [JSON.stringify(out), id, clientId]);
      return out;
    },
    // Put a claims result on a saved version (CLAIMS sits after VALIDATION)
    async saveClaims(clientId, id, CLAIMS) {
      const found = await this.byId(clientId, id);
      if (!found) throw new Error('Record not found.');
      const out = require('./v20-edit').placeClaims(found.record, CLAIMS);
      await pool.query(`UPDATE client_assets SET content=$1 WHERE id=$2 AND client_id=$3`, [JSON.stringify(out), id, clientId]);
    },
  };
}

module.exports = { createV20Store };
