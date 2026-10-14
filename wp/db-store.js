'use strict';

// ── WordPress push data in Postgres ─────────────────────────────────────────
// wp_connections: one site per client (address, user, encrypted Application
//   Password, staging flag, SEO plugin, optional homepage slug)
// wp_snapshots:   what the site held before each push (for rollback)
// wp_push_log:    every push, refusal, failure and rollback
// createDbStore(pool, clientId) has the same shape as wp/push-store.js.

async function ensureWpTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wp_connections (
      client_id        UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      url              TEXT NOT NULL,
      wp_user          TEXT NOT NULL,
      app_password_enc TEXT,
      staging          BOOLEAN NOT NULL DEFAULT false,
      seo              TEXT NOT NULL DEFAULT 'rankmath',
      homepage_slug    TEXT,
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS wp_snapshots (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      data        JSONB NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS wp_push_log (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      action      TEXT NOT NULL,
      result      TEXT NOT NULL,
      entry       JSONB NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function createDbStore(pool, clientId) {
  return {
    async saveSnapshot(s) {
      const { rows } = await pool.query(`INSERT INTO wp_snapshots (client_id, data) VALUES ($1, $2) RETURNING id`, [clientId, JSON.stringify(s)]);
      return rows[0].id;
    },
    async getSnapshot(id) {
      if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
      const { rows } = await pool.query(`SELECT data FROM wp_snapshots WHERE id = $1 AND client_id = $2`, [id, clientId]);
      return rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : null;
    },
    async appendLog(entry) {
      await pool.query(`INSERT INTO wp_push_log (client_id, action, result, entry) VALUES ($1, $2, $3, $4)`,
        [clientId, entry.action || 'push', entry.result || '', JSON.stringify(entry)]);
    },
    async listLog(limit = 50) {
      const { rows } = await pool.query(`SELECT id, created_at, entry FROM wp_push_log WHERE client_id = $1 ORDER BY created_at DESC LIMIT ${Math.min(200, Math.max(1, limit | 0))}`, [clientId]);
      return rows.map(r => ({ id: r.id, at: r.created_at, ...(typeof r.entry === 'string' ? JSON.parse(r.entry) : r.entry) }));
    },
  };
}

async function getConnectionRow(pool, clientId) {
  const { rows } = await pool.query(`SELECT * FROM wp_connections WHERE client_id = $1`, [clientId]);
  return rows[0] || null;
}

async function saveConnectionRow(pool, clientId, c) {
  await pool.query(
    `INSERT INTO wp_connections (client_id, url, wp_user, app_password_enc, staging, seo, homepage_slug, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (client_id) DO UPDATE SET url = $2, wp_user = $3,
       app_password_enc = COALESCE($4, wp_connections.app_password_enc),
       staging = $5, seo = $6, homepage_slug = $7, updated_at = NOW()`,
    [clientId, c.url, c.user, c.appPasswordEnc || null, !!c.staging, c.seo || 'rankmath', c.homepageSlug || null]
  );
}

module.exports = { ensureWpTables, createDbStore, getConnectionRow, saveConnectionRow };
