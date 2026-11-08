'use strict';

// ── Review replies: new tables only ──────────────────────────────────────────
//   review_settings      one per client: the eight template fields, live from, auto post, the approver,
//                        the Lead Snap tick. The bundle.social team is bundle_connections' (Stage 3).
//   gbp_reviews          one per bundle.social review id: the review, Google's reply as last read, and ours
//   gbp_review_drafts    every draft, with its checks
//   gbp_review_actions   every queue action: who, when, the text, the ticks, the reason
//   gbp_review_replies   every reply posted: the text, when, the approval behind it, automatic or not
//   review_sync_runs     one per sync run, and review_sync_lock, which stops two runs overlapping
// Review status: new, drafting, queued, posting, posted, backlog, already_replied, no_reply.
// A flag on a queued review: review_changed, reply_rejected, draft_failed, post_failed.

const parseJson = v => (typeof v === 'string' ? JSON.parse(v) : v);
const FIELD_COLS = ['business_name', 'trade', 'main_services', 'service_area', 'contact_name', 'contact_role', 'direct_phone', 'direct_email'];
const SETTINGS_COLS = [...FIELD_COLS, 'phone_confirmed', 'email_confirmed', 'live_from', 'auto_post', 'approver_name', 'approver_email', 'leadsnap_checked', 'leadsnap_checked_at', 'leadsnap_checked_by'];
const REVIEW_COLS = ['team_id', 'external_review_id', 'reviewer_name', 'stars', 'comment', 'google_reply', 'google_reply_at', 'reply_state', 'policy_violation', 'create_time', 'update_time', 'deleted_at', 'status', 'flag', 'source', 'draft_id', 'posting_text', 'posting_at', 'posting_action', 'posting_auto', 'queued_at', 'alerted_at', 'notified_at', 'replied_stars', 'replied_update_time', 'last_error', 'raw'];

async function ensureReviewTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS review_settings (
      client_id           UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      ${FIELD_COLS.map(c => `${c} TEXT`).join(',\n      ')},
      phone_confirmed     BOOLEAN NOT NULL DEFAULT FALSE,
      email_confirmed     BOOLEAN NOT NULL DEFAULT FALSE,
      live_from           TEXT,
      auto_post           BOOLEAN NOT NULL DEFAULT FALSE,
      approver_name       TEXT,
      approver_email      TEXT,
      leadsnap_checked    BOOLEAN NOT NULL DEFAULT FALSE,
      leadsnap_checked_at TIMESTAMPTZ,
      leadsnap_checked_by TEXT,
      updated_at          TIMESTAMPTZ,
      updated_by          TEXT
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gbp_reviews (
      id                  TEXT PRIMARY KEY,
      client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      team_id             TEXT,
      external_review_id  TEXT,
      reviewer_name       TEXT,
      stars               INTEGER,
      comment             TEXT,
      google_reply        TEXT,
      google_reply_at     TEXT,
      reply_state         TEXT,
      policy_violation    TEXT,
      create_time         TEXT,
      update_time         TEXT,
      deleted_at          TEXT,
      status              TEXT NOT NULL,
      flag                TEXT,
      source              TEXT,
      draft_id            UUID,
      posting_text        TEXT,
      posting_at          TEXT,
      posting_action      UUID,
      posting_auto        BOOLEAN,
      queued_at           TEXT,
      alerted_at          TEXT,
      notified_at         TEXT,
      replied_stars       INTEGER,
      replied_update_time TEXT,
      last_error          TEXT,
      raw                 JSONB,
      first_seen_at       TEXT,
      updated_at          TEXT
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gbp_review_drafts (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id  TEXT NOT NULL,
      client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      source     TEXT NOT NULL,
      template   TEXT,
      model      TEXT,
      attempt    INTEGER,
      text       TEXT NOT NULL,
      ok         BOOLEAN NOT NULL,
      problems   JSONB,
      created_at TEXT NOT NULL
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gbp_review_actions (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id             TEXT NOT NULL,
      client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      action                TEXT NOT NULL,
      text                  TEXT,
      real_customer_checked BOOLEAN NOT NULL DEFAULT FALSE,
      reported              BOOLEAN NOT NULL DEFAULT FALSE,
      replace_existing      BOOLEAN NOT NULL DEFAULT FALSE,
      reason                TEXT,
      by_name               TEXT,
      at                    TEXT NOT NULL
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gbp_review_replies (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id   TEXT NOT NULL,
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      text        TEXT NOT NULL,
      posted_at   TEXT NOT NULL,
      action_id   UUID,
      automatic   BOOLEAN NOT NULL,
      by_name     TEXT,
      replaced    BOOLEAN NOT NULL DEFAULT FALSE,
      stars       INTEGER
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS review_sync_runs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      started_at  TEXT NOT NULL,
      finished_at TEXT,
      summary     JSONB
    )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS review_sync_lock (name TEXT PRIMARY KEY, holder TEXT, until TEXT)`);
  const { rows } = await pool.query(`SELECT name FROM review_sync_lock WHERE name='sync'`);
  if (!rows.length) await pool.query(`INSERT INTO review_sync_lock (name, holder, until) VALUES ('sync', NULL, NULL)`).catch(() => {});
}

const readyByPool = new WeakMap();
function createReviewStore(pool) {
  const ensure = () => {
    if (!readyByPool.has(pool)) readyByPool.set(pool, ensureReviewTables(pool).catch(e => { readyByPool.delete(pool); throw e; }));
    return readyByPool.get(pool);
  };
  const q = async (sql, args) => { await ensure(); return pool.query(sql, args); };
  const review = r => (r ? { ...r, raw: parseJson(r.raw) } : null);

  return {
    ensure,
    // ── Settings ──
    async settings(clientId) {
      const { rows } = await q(`SELECT * FROM review_settings WHERE client_id=$1`, [clientId]);
      return rows[0] || null;
    },
    async saveSettings(clientId, fields, { by = '', at }) {
      const { rows } = await q(`SELECT client_id FROM review_settings WHERE client_id=$1`, [clientId]);
      if (!rows.length) await pool.query(`INSERT INTO review_settings (client_id) VALUES ($1)`, [clientId]);
      const keys = Object.keys(fields).filter(k => SETTINGS_COLS.includes(k));
      await pool.query(`UPDATE review_settings SET ${[...keys.map((k, i) => `${k}=$${i + 2}`), `updated_at=$${keys.length + 2}`, `updated_by=$${keys.length + 3}`].join(', ')} WHERE client_id=$1`, [clientId, ...keys.map(k => fields[k]), at, by || null]);
    },
    async allSettings() {
      const { rows } = await q(`SELECT * FROM review_settings ORDER BY client_id`);
      return rows;
    },
    // ── Reviews ──
    async review(id) { const { rows } = await q(`SELECT * FROM gbp_reviews WHERE id=$1`, [id]); return review(rows[0]); },
    async reviews(clientId, { status = null } = {}) {
      const { rows } = await q(`SELECT * FROM gbp_reviews WHERE client_id=$1${status ? ' AND status=$2' : ''} ORDER BY create_time DESC`, status ? [clientId, status] : [clientId]);
      return rows.map(review);
    },
    async insertReview(clientId, fields, at) {
      const keys = Object.keys(fields).filter(k => REVIEW_COLS.includes(k));
      await q(`INSERT INTO gbp_reviews (id, client_id, first_seen_at, updated_at${keys.map(k => `, ${k}`).join('')}) VALUES ($1, $2, $3, $3${keys.map((k, i) => `, $${i + 4}`).join('')})`,
        [fields.id, clientId, at, ...keys.map(k => (k === 'raw' ? JSON.stringify(fields[k]) : fields[k]))]);
    },
    async updateReview(id, fields, at) {
      const keys = Object.keys(fields).filter(k => REVIEW_COLS.includes(k));
      await q(`UPDATE gbp_reviews SET ${[...keys.map((k, i) => `${k}=$${i + 2}`), `updated_at=$${keys.length + 2}`].join(', ')} WHERE id=$1`, [id, ...keys.map(k => (k === 'raw' ? JSON.stringify(fields[k]) : fields[k])), at]);
    },
    // Moves a review from one of `from` to `to`, for one caller only. True when this caller won.
    async claim(id, from, to, fields, at) {
      const keys = Object.keys(fields || {}).filter(k => REVIEW_COLS.includes(k));
      const r = await q(`UPDATE gbp_reviews SET status=$2, updated_at=$3${keys.map((k, i) => `, ${k}=$${i + 4}`).join('')} WHERE id=$1 AND status IN (${from.map((_, i) => `$${i + 4 + keys.length}`).join(', ')})`,
        [id, to, at, ...keys.map(k => fields[k]), ...from]);
      return r.rowCount === 1;
    },
    async queue() {
      const { rows } = await q(`SELECT r.*, c.name AS client_name FROM gbp_reviews r JOIN clients c ON c.id = r.client_id WHERE r.status IN ('queued', 'posting') ORDER BY r.queued_at ASC, r.create_time ASC`);
      return rows.map(review);
    },
    async counts(clientId) {
      const { rows } = await q(`SELECT status, count(*)::int AS n FROM gbp_reviews WHERE client_id=$1 GROUP BY status`, [clientId]);
      return Object.fromEntries(rows.map(r => [r.status, r.n]));
    },
    async queuedCount() {
      const { rows } = await q(`SELECT count(*)::int AS n FROM gbp_reviews WHERE status='queued'`);
      return rows[0].n;
    },
    // ── Drafts, actions, replies ──
    async addDraft(d) {
      const { rows } = await q(`INSERT INTO gbp_review_drafts (review_id, client_id, source, template, model, attempt, text, ok, problems, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [d.review_id, d.client_id, d.source, d.template || null, d.model || null, d.attempt || null, d.text, !!d.ok, JSON.stringify(d.problems || []), d.at]);
      return rows[0].id;
    },
    async draft(id) {
      if (!id) return null;
      const { rows } = await q(`SELECT * FROM gbp_review_drafts WHERE id=$1`, [id]);
      return rows[0] ? { ...rows[0], problems: parseJson(rows[0].problems) || [] } : null;
    },
    async draftsFor(reviewId) {
      const { rows } = await q(`SELECT * FROM gbp_review_drafts WHERE review_id=$1 ORDER BY created_at`, [reviewId]);
      return rows.map(r => ({ ...r, problems: parseJson(r.problems) || [] }));
    },
    async addAction(a) {
      const { rows } = await q(`INSERT INTO gbp_review_actions (review_id, client_id, action, text, real_customer_checked, reported, replace_existing, reason, by_name, at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [a.review_id, a.client_id, a.action, a.text || null, !!a.real_customer_checked, !!a.reported, !!a.replace_existing, a.reason || null, a.by || null, a.at]);
      return rows[0].id;
    },
    async action(id) {
      if (!id) return null;
      const { rows } = await q(`SELECT * FROM gbp_review_actions WHERE id=$1`, [id]);
      return rows[0] || null;
    },
    async actionsFor(reviewId) {
      const { rows } = await q(`SELECT * FROM gbp_review_actions WHERE review_id=$1 ORDER BY at`, [reviewId]);
      return rows;
    },
    async addReply(r) {
      await q(`INSERT INTO gbp_review_replies (review_id, client_id, text, posted_at, action_id, automatic, by_name, replaced, stars) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [r.review_id, r.client_id, r.text, r.at, r.action_id || null, !!r.automatic, r.by || null, !!r.replaced, r.stars || null]);
    },
    async repliesFor(reviewId) {
      const { rows } = await q(`SELECT * FROM gbp_review_replies WHERE review_id=$1 ORDER BY posted_at`, [reviewId]);
      return rows;
    },
    // The client's last replies, posted or waiting in the queue, newest first: a new opening must differ
    async recentTexts(clientId, limit = 10) {
      const { rows: posted } = await q(`SELECT text, posted_at AS at FROM gbp_review_replies WHERE client_id=$1 ORDER BY posted_at DESC LIMIT ${Number(limit)}`, [clientId]);
      const { rows: waiting } = await q(`SELECT d.text, d.created_at AS at FROM gbp_reviews r JOIN gbp_review_drafts d ON d.id = r.draft_id WHERE r.client_id=$1 AND r.status='queued' ORDER BY d.created_at DESC LIMIT ${Number(limit)}`, [clientId]);
      return [...posted, ...waiting].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, limit).map(r => r.text);
    },
    // ── The run lock and the runs ──
    async claimLock(holder, at, until) {
      const r = await q(`UPDATE review_sync_lock SET holder=$1, until=$2 WHERE name='sync' AND (until IS NULL OR until < $3)`, [holder, until, at]);
      return r.rowCount === 1;
    },
    async releaseLock(holder) { await q(`UPDATE review_sync_lock SET holder=NULL, until=NULL WHERE name='sync' AND holder=$1`, [holder]); },
    async startRun(at) { const { rows } = await q(`INSERT INTO review_sync_runs (started_at) VALUES ($1) RETURNING id`, [at]); return rows[0].id; },
    async finishRun(id, at, summary) { await q(`UPDATE review_sync_runs SET finished_at=$2, summary=$3 WHERE id=$1`, [id, at, JSON.stringify(summary)]); },
    async lastRun() {
      const { rows } = await q(`SELECT * FROM review_sync_runs ORDER BY started_at DESC LIMIT 1`);
      return rows[0] ? { ...rows[0], summary: parseJson(rows[0].summary) } : null;
    },
  };
}

module.exports = { ensureReviewTables, createReviewStore, FIELD_COLS, SETTINGS_COLS };
