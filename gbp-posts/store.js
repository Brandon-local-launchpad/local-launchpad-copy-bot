'use strict';

// ── GBP Posts: two new tables ────────────────────────────────────────────────
//   gbp_post_batches   one batch: its size, status, the config it was written from, what it cost
//   gbp_posts          one post: its text, date, photo, CTA or offer, checks and status
// Dates are 'YYYY-MM-DD' text, UK days: a Postgres DATE comes back through a time zone and can shift a day.
// Publishing (Stage 3) has its own table and reads approved posts from here.

const json = v => JSON.stringify(v == null ? null : v);
const parseJson = v => (typeof v === 'string' ? JSON.parse(v) : v);

async function ensurePostTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gbp_post_batches (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      size          INTEGER NOT NULL,
      status        TEXT NOT NULL,
      start_date    TEXT,
      config_at     TEXT,
      config        JSONB,
      notes         JSONB,
      input_tokens  INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at   TIMESTAMPTZ,
      approved_by   TEXT
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gbp_posts (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      batch_id         UUID NOT NULL REFERENCES gbp_post_batches(id) ON DELETE CASCADE,
      client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      seq              INTEGER NOT NULL,
      post_date        TEXT NOT NULL,
      post_time        TEXT NOT NULL,
      topic            TEXT NOT NULL,
      prompt_n         INTEGER,
      prompt_label     TEXT,
      folder           TEXT,
      drive_file_id    TEXT,
      photo_name       TEXT,
      cta_type         TEXT,
      cta_url          TEXT,
      offer_title      TEXT,
      offer_start      TEXT,
      offer_end        TEXT,
      offer_redeem_url TEXT,
      body             TEXT,
      opening          TEXT,
      checks           JSONB,
      fails            INTEGER NOT NULL DEFAULT 0,
      warnings         INTEGER NOT NULL DEFAULT 0,
      edited           BOOLEAN NOT NULL DEFAULT FALSE,
      status           TEXT NOT NULL,
      error            TEXT
    )`);
}

const POST_COLS = ['seq', 'post_date', 'post_time', 'topic', 'prompt_n', 'prompt_label', 'folder', 'drive_file_id', 'photo_name', 'cta_type', 'cta_url', 'offer_title', 'offer_start', 'offer_end', 'offer_redeem_url'];
const toBatch = r => ({ ...r, config: parseJson(r.config), notes: parseJson(r.notes) || [] });
const toPost = r => ({ ...r, checks: parseJson(r.checks) || [], fails: Number(r.fails) || 0, warnings: Number(r.warnings) || 0 });

const readyByPool = new WeakMap();
function createPostStore(pool) {
  const ensure = () => {
    if (!readyByPool.has(pool)) readyByPool.set(pool, ensurePostTables(pool).catch(e => { readyByPool.delete(pool); throw e; }));
    return readyByPool.get(pool);
  };
  const one = async (sql, args) => { await ensure(); return (await pool.query(sql, args)).rows; };

  return {
    ensure,
    async createBatch(clientId, { size, start, config, notes, posts }) {
      const [b] = await one(`INSERT INTO gbp_post_batches (client_id, size, status, start_date, config_at, config, notes) VALUES ($1,$2,'writing',$3,$4,$5,$6) RETURNING id`,
        [clientId, size, start, (config && config.generated_at) || '', json(config), json(notes)]);
      for (const p of posts) {
        await pool.query(`INSERT INTO gbp_posts (batch_id, client_id, ${POST_COLS.join(', ')}, status) VALUES ($1,$2,${POST_COLS.map((_, i) => `$${i + 3}`).join(',')},'pending')`, [b.id, clientId, ...POST_COLS.map(c => p[c])]);
      }
      return b.id;
    },
    async batches(clientId) {
      const rows = await one(`SELECT * FROM gbp_post_batches WHERE client_id=$1 ORDER BY created_at DESC`, [clientId]);
      return rows.map(toBatch);
    },
    async batch(clientId, batchId) {
      const rows = await one(`SELECT * FROM gbp_post_batches WHERE client_id=$1 AND id=$2`, [clientId, batchId]);
      return rows.length ? toBatch(rows[0]) : null;
    },
    async posts(batchId) {
      const rows = await one(`SELECT * FROM gbp_posts WHERE batch_id=$1 ORDER BY seq`, [batchId]);
      return rows.map(toPost);
    },
    async post(clientId, postId) {
      const rows = await one(`SELECT * FROM gbp_posts WHERE client_id=$1 AND id=$2`, [clientId, postId]);
      return rows.length ? toPost(rows[0]) : null;
    },
    // Every post the client has, oldest first: what the next batch must not repeat
    async history(clientId) {
      const rows = await one(`SELECT prompt_n, drive_file_id, post_date, topic, opening, seq FROM gbp_posts WHERE client_id=$1 ORDER BY post_date, seq`, [clientId]);
      return rows;
    },
    async saveWritten(postId, r) {
      await ensure();
      await pool.query(`UPDATE gbp_posts SET body=$2, opening=$3, checks=$4, fails=$5, warnings=$6, status='written', error=NULL WHERE id=$1`, [postId, r.body, r.opening, json(r.checks), r.fails, r.warnings]);
    },
    async saveFailed(postId, message) {
      await ensure();
      await pool.query(`UPDATE gbp_posts SET status='failed', error=$2 WHERE id=$1`, [postId, message]);
    },
    async editPost(postId, f) {
      await ensure();
      await pool.query(`UPDATE gbp_posts SET body=$2, opening=$3, checks=$4, fails=$5, warnings=$6, edited=$7, drive_file_id=$8, photo_name=$9, post_date=$10, offer_start=$11, offer_end=$12, status='written', error=NULL WHERE id=$1`,
        [postId, f.body, f.opening, json(f.checks), f.fails, f.warnings, f.edited, f.drive_file_id, f.photo_name, f.post_date, f.offer_start, f.offer_end]);
    },
    async setPostDate(postId, u) {
      await ensure();
      await pool.query(`UPDATE gbp_posts SET post_date=$2, offer_start=$3, offer_end=$4 WHERE id=$1`, [postId, u.post_date, u.offer_start || '', u.offer_end || '']);
    },
    async setLinks(postId, l) {
      await ensure();
      await pool.query(`UPDATE gbp_posts SET cta_url=$2, offer_redeem_url=$3 WHERE id=$1`, [postId, l.cta_url, l.offer_redeem_url]);
    },
    async addUsage(batchId, usage) {
      await ensure();
      await pool.query(`UPDATE gbp_post_batches SET input_tokens = input_tokens + $2, output_tokens = output_tokens + $3 WHERE id=$1`, [batchId, usage.input_tokens || 0, usage.output_tokens || 0]);
    },
    async setStatus(batchId, status) {
      await ensure();
      await pool.query(`UPDATE gbp_post_batches SET status=$2 WHERE id=$1`, [batchId, status]);
    },
    async setStart(batchId, start) {
      await ensure();
      await pool.query(`UPDATE gbp_post_batches SET start_date=$2 WHERE id=$1`, [batchId, start]);
    },
    async approve(batchId, by) {
      await ensure();
      await pool.query(`UPDATE gbp_post_batches SET status='approved', approved_at=NOW(), approved_by=$2 WHERE id=$1`, [batchId, by || null]);
    },
    async unapprove(batchId) {
      await ensure();
      await pool.query(`UPDATE gbp_post_batches SET status='draft', approved_at=NULL, approved_by=NULL WHERE id=$1`, [batchId]);
    },
    async deleteBatch(batchId) {
      await ensure();
      await pool.query(`DELETE FROM gbp_posts WHERE batch_id=$1`, [batchId]);
      await pool.query(`DELETE FROM gbp_post_batches WHERE id=$1`, [batchId]);
    },
  };
}

module.exports = { ensurePostTables, createPostStore };
