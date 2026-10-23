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

    // ── Batch 2: competitor runs (one row each), duplicate marks and the landing page check (one row each) ──
    async addCompetitorRun(clientId, run) {
      await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'gbp_competitor_run', 'competitors.json', $2)`, [clientId, JSON.stringify(run)]);
    },
    // Newest first
    async competitorRuns(clientId, limit = 24) {
      const { rows } = await pool.query(`SELECT id, content, uploaded_at FROM client_assets WHERE client_id=$1 AND asset_type='gbp_competitor_run' ORDER BY uploaded_at DESC LIMIT ${Math.min(200, Math.max(1, limit | 0))}`, [clientId]);
      return rows.map(r => ({ id: r.id, run: typeof r.content === 'string' ? JSON.parse(r.content) : r.content }));
    },
    async duplicates(clientId) { return one('gbp_duplicates', clientId); },
    async saveDuplicates(clientId, data) { return put('gbp_duplicates', 'duplicates.json', clientId, data); },
    async landingPage(clientId) { return one('gbp_landing_page', clientId); },
    async saveLandingPage(clientId, data) { return put('gbp_landing_page', 'landing_page.json', clientId, data); },
  };

  async function one(type, clientId) {
    const { rows } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id=$1 AND asset_type='${type}' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    return rows.length ? (typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content) : null;
  }
  async function put(type, filename, clientId, data) {
    const content = JSON.stringify(data);
    const { rows } = await pool.query(`SELECT id FROM client_assets WHERE client_id=$1 AND asset_type='${type}' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    if (rows.length) await pool.query(`UPDATE client_assets SET content=$1, uploaded_at=NOW() WHERE id=$2`, [content, rows[0].id]);
    else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, '${type}', $2, $3)`, [clientId, filename, content]);
  }
}

module.exports = { createGbpStore, ASSET };
