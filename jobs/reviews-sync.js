'use strict';

// ── reviews-sync: the Railway cron service ───────────────────────────────────
// A second Railway service from this repo, start command `node jobs/reviews-sync.js`, cron schedule
// `0 */6 * * *`. It runs one sync (reviews/sync.js) and exits, as Railway's cron needs.
// Environment, as the web service: DATABASE_URL, BUNDLE_SOCIAL_API_KEY, ANTHROPIC_API_KEY, the Gmail
// three (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN) for the approver's emails,
// COPYBOT_URL for the link in them, and REVIEW_REPLIES_POSTING=1 only once posting is meant to happen.
// Without REVIEW_REPLIES_POSTING the run still imports and drafts; nothing posts.

const path = require('path');
const root = path.join(__dirname, '..');
// .env for a local run, the way server.js reads it; on Railway the service's variables are already set
try {
  require('fs').readFileSync(path.join(root, '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
} catch (_) {}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');
  if (!process.env.BUNDLE_SOCIAL_API_KEY) throw new Error('BUNDLE_SOCIAL_API_KEY is not set.');
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set.');
  const { pool } = require(path.join(root, 'db'));
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const { makeCallModel } = require(path.join(root, 'anthropic-call'));
    const modelLog = require(path.join(root, 'ui/model-log')).createModelLog(pool);
    const M = require(path.join(root, 'page-models')).reviews();
    const callModel = makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), M.model, { defaultEffort: M.effort, onUsage: modelLog.tagged('review replies') });
    const PUB = require(path.join(root, 'publisher'));
    const gmail = require(path.join(root, 'citations/inbox/gmail'));
    const mail = gmail.configured() ? gmail.createGmail() : null;
    const sync = require(path.join(root, 'reviews/sync')).createReviewSync({
      store: require(path.join(root, 'reviews/store')).createReviewStore(pool),
      publishStore: require(path.join(root, 'publisher/store')).createPublishStore(pool),
      getBundle: (() => { let b = null; return () => (b = b || PUB.createPublisher()); })(),
      callModel, model: M.model, effort: M.effort,
      notify: mail ? m => mail.send(m) : null,
    });
    if (!mail) console.log('[reviews-sync] the Gmail connection is not set, so no emails are sent');
    const r = await sync.runSync({ holder: `cron-${process.env.RAILWAY_DEPLOYMENT_ID || process.pid}` });
    if (!r.ran) { console.log(`[reviews-sync] ${r.reason}`); return; }
    for (const c of r.summary.clients) console.log(`[reviews-sync] ${c.client_id}: ${c.skipped ? `skipped (${(c.notes || []).join(' ')})` : c.error ? `error: ${c.error}` : `import ${c.import}, ${c.saved} saved, ${c.drafted} drafted, ${c.posted} posted, ${c.queued} queued${c.capacity != null ? `, ${c.capacity} imports left this month` : ''}${(c.notes || []).length ? `. ${c.notes.join(' ')}` : ''}`}`);
    console.log(`[reviews-sync] done: posting ${r.summary.posting ? 'on' : 'off'}, ${r.summary.emails} email(s)`);
  } finally { await pool.end().catch(() => {}); }
}

main().then(() => process.exit(0)).catch(err => { console.error('[reviews-sync] failed:', err.message); process.exit(1); });
