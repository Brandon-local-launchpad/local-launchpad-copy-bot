'use strict';

// ── Publishing: three new tables ─────────────────────────────────────────────
//   bundle_connections   one per client: the team, the location, whether publishing is on
//   gbp_publish_items    one per post or Photo Drip photo: its date, status and bundle.social ids
//   gbp_publish_runs     one per day: the lock on the daily job, and what it did
// Item status: planned (a Photo Drip plan not approved), queued, sending, scheduled, posted, failed, deleted.

const parseJson = v => (typeof v === 'string' ? JSON.parse(v) : v);

async function ensurePublishTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bundle_connections (
      client_id        UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      source_team_id   TEXT,
      source_name      TEXT,
      team_id          TEXT,
      account_id       TEXT,
      channel_id       TEXT,
      location_name    TEXT,
      location_address TEXT,
      status           TEXT NOT NULL DEFAULT 'none',
      publishing_on    BOOLEAN NOT NULL DEFAULT FALSE,
      problem          TEXT,
      connected_at     TIMESTAMPTZ,
      checked_at       TIMESTAMPTZ
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gbp_publish_items (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      kind          TEXT NOT NULL,
      post_id       UUID,
      drive_file_id TEXT,
      file_name     TEXT,
      md5           TEXT,
      category      TEXT,
      due_date      TEXT NOT NULL,
      due_time      TEXT NOT NULL,
      status        TEXT NOT NULL,
      upload_id     TEXT,
      external_id   TEXT,
      media_name    TEXT,
      link          TEXT,
      attempts      INTEGER NOT NULL DEFAULT 0,
      error         TEXT,
      posted_at     TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gbp_publish_runs (
      run_date    TEXT PRIMARY KEY,
      started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      summary     JSONB
    )`);
}

const CONN_FIELDS = ['source_team_id', 'source_name', 'team_id', 'account_id', 'channel_id', 'location_name', 'location_address', 'status', 'publishing_on', 'problem', 'connected_at', 'checked_at'];
const ITEM_FIELDS = ['status', 'upload_id', 'external_id', 'media_name', 'link', 'attempts', 'error', 'posted_at', 'due_date', 'due_time'];

const readyByPool = new WeakMap();
function createPublishStore(pool) {
  const ensure = () => {
    if (!readyByPool.has(pool)) readyByPool.set(pool, ensurePublishTables(pool).catch(e => { readyByPool.delete(pool); throw e; }));
    return readyByPool.get(pool);
  };
  const q = async (sql, args) => { await ensure(); return pool.query(sql, args); };

  return {
    ensure,
    async connection(clientId) {
      const { rows } = await q(`SELECT * FROM bundle_connections WHERE client_id=$1`, [clientId]);
      return rows[0] || null;
    },
    async saveConnection(clientId, fields) {
      const { rows } = await q(`SELECT client_id FROM bundle_connections WHERE client_id=$1`, [clientId]);
      if (!rows.length) await pool.query(`INSERT INTO bundle_connections (client_id) VALUES ($1)`, [clientId]);
      const keys = Object.keys(fields).filter(k => CONN_FIELDS.includes(k));
      if (keys.length) await pool.query(`UPDATE bundle_connections SET ${keys.map((k, i) => `${k}=$${i + 2}`).join(', ')} WHERE client_id=$1`, [clientId, ...keys.map(k => fields[k])]);
    },
    async publishingClients() {
      const { rows } = await q(`SELECT client_id FROM bundle_connections WHERE publishing_on=TRUE`);
      return rows.map(r => r.client_id);
    },
    async items(clientId) {
      const { rows } = await q(`SELECT * FROM gbp_publish_items WHERE client_id=$1 ORDER BY due_date, due_time, created_at`, [clientId]);
      return rows;
    },
    async item(clientId, id) {
      const { rows } = await q(`SELECT * FROM gbp_publish_items WHERE client_id=$1 AND id=$2`, [clientId, id]);
      return rows[0] || null;
    },
    async addItem(i) {
      await q(`INSERT INTO gbp_publish_items (client_id, kind, post_id, drive_file_id, file_name, md5, category, due_date, due_time, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [i.client_id, i.kind, i.post_id || null, i.drive_file_id, i.file_name, i.md5 || '', i.category || '', i.due_date, i.due_time, i.status]);
    },
    async updateItem(id, fields) {
      const keys = Object.keys(fields).filter(k => ITEM_FIELDS.includes(k));
      await q(`UPDATE gbp_publish_items SET ${keys.map((k, i) => `${k}=$${i + 2}`).join(', ')}${keys.length ? ', ' : ''}updated_at=NOW() WHERE id=$1`, [id, ...keys.map(k => fields[k])]);
    },
    async removeItem(id) { await q(`DELETE FROM gbp_publish_items WHERE id=$1`, [id]); },
    // How many posts already sit on this UK day for this client. bundle.social support (7 Nov 2026):
    // the limit is per location, each client's team being its own; photos never count.
    async postsOnDay(clientId, day) {
      const { rows } = await q(`SELECT count(*)::int AS n FROM gbp_publish_items WHERE client_id=$1 AND kind='post' AND due_date=$2 AND status IN ('sending','scheduled','posted')`, [clientId, day]);
      return rows[0].n;
    },
    async lastRun() {
      const { rows } = await q(`SELECT * FROM gbp_publish_runs ORDER BY run_date DESC LIMIT 1`);
      return rows[0] ? { ...rows[0], summary: parseJson(rows[0].summary) } : null;
    },
    // True only for the first caller of the day
    async claimRun(day) {
      const { rows } = await q(`SELECT run_date FROM gbp_publish_runs WHERE run_date=$1`, [day]);
      if (rows.length) return false;
      await pool.query(`INSERT INTO gbp_publish_runs (run_date) VALUES ($1)`, [day]);
      return true;
    },
    async finishRun(day, summary) {
      await q(`UPDATE gbp_publish_runs SET finished_at=NOW(), summary=$2 WHERE run_date=$1`, [day, JSON.stringify(summary)]);
    },
  };
}

module.exports = { ensurePublishTables, createPublishStore };
