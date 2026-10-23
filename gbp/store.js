'use strict';

// ── GBP output storage ───────────────────────────────────────────────────────
// One client_assets row (asset_type 'gbp_output') per client, updated in place,
// holding the job record (gbp/generate.js). Railway's disk is wiped on each deploy,
// so the record lives here; the four files are served from it by gbp/routes.js at
// /clients/<slug>/gbp/<file>.

const ASSET = 'gbp_output';

function createGbpStore(pool) {
  return {
    async latest(clientId) {
      const { rows } = await pool.query(`SELECT id, content, uploaded_at FROM client_assets WHERE client_id=$1 AND asset_type='${ASSET}' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
      return rows.length ? { id: rows[0].id, record: typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content, at: rows[0].uploaded_at } : null;
    },
    async save(clientId, record) {
      const content = JSON.stringify(record);
      const found = await this.latest(clientId);
      if (found) await pool.query(`UPDATE client_assets SET content=$1, uploaded_at=NOW() WHERE id=$2`, [content, found.id]);
      else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, '${ASSET}', 'gbp.json', $2)`, [clientId, content]);
    },
    async clear(clientId) {
      await pool.query(`DELETE FROM client_assets WHERE client_id=$1 AND asset_type='${ASSET}'`, [clientId]);
    },
  };
}

module.exports = { createGbpStore, ASSET };
