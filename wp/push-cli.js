'use strict';
// Push a page record to WordPress, or roll a push back, from the command line.
//   npm run wp:push -- <record.json> [--reviewed] [--accept-claims] [--claims <claims.json>] [--seo rankmath|yoast] [--fake]
//   npm run wp:push -- --rollback <snapshotId> [--fake]
// Site: WP_URL, WP_USER, WP_APP_PASSWORD (and WP_STAGING=yes for a staging site),
// or --fake (the fake WordPress, with a draft homepage; a push and a rollback in
// one run show the whole cycle). The claims review runs here (one model call)
// unless --claims gives a saved result. Snapshots and the log go to .wp-push/.
// Drafts and staging only (refused otherwise).
const fs = require('fs');
const path = require('path');
const { push, rollback } = require('./push');
const { createFileStore, createMemoryStore } = require('./push-store');
const { runClaimsReview, factsFromRecord } = require('./claims-review');

const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

(async () => {
  const args = process.argv.slice(2);
  const opt = n => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
  let site, close = async () => {}, store;
  if (args.includes('--fake')) {
    const { createFakeWp, seedHomepage, listen } = require('../tests/fake-wp/fake-wp');
    const fake = createFakeWp({ pages: [seedHomepage()] });
    const { server, url } = await listen(fake.app);
    site = { url, user: 'copybot', appPassword: 'test-app-password-not-real' };
    store = createMemoryStore();
    close = () => new Promise(r => { console.log(`(fake site writes: ${fake.state.writes})`); server.close(r); });
  } else {
    if (!process.env.WP_URL) { console.error('Set WP_URL, WP_USER and WP_APP_PASSWORD (and WP_STAGING=yes for staging), or use --fake.'); process.exit(2); }
    site = { url: process.env.WP_URL, user: process.env.WP_USER, appPassword: process.env.WP_APP_PASSWORD, staging: process.env.WP_STAGING === 'yes' };
    store = createFileStore(path.join(root, '.wp-push'));
  }

  try {
    if (opt('--rollback') && !args.includes('--fake')) {
      const r = await rollback({ snapshotId: opt('--rollback'), site, store });
      console.log(r.ok ? 'Rolled back.' : `Rollback: ${r.error || 'read-back differs: ' + r.mismatches.join(', ')}`);
      return;
    }
    const file = args.find(a => /\.json$/.test(a) && a !== opt('--claims'));
    if (!file) { console.error('Usage: npm run wp:push -- <record.json> [--reviewed] [--accept-claims] [--claims file] [--fake]'); process.exit(2); }
    const record = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));

    let claims = opt('--claims') ? JSON.parse(fs.readFileSync(path.resolve(opt('--claims')), 'utf8')) : null;
    if (!claims) {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      claims = await runClaimsReview(record, factsFromRecord(record), async ({ system, message, maxTokens }) => {
        const r = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, system, messages: [{ role: 'user', content: message }] });
        return { text: r.content.map(c => c.text || '').join(''), usage: r.usage };
      });
    }
    console.log(`Claims review: ${claims.findings.length} finding(s)`);
    for (const f of claims.findings) console.log(`  - ${f.field}: "${f.quote}"\n      ${f.why}`);

    const r = await push({ record, recordId: path.basename(file), site, store, reviewed: args.includes('--reviewed'), seo: opt('--seo') || 'rankmath', claims, acceptClaims: args.includes('--accept-claims') });
    if (!r.ok && r.refusals && r.refusals.length) { console.log('Push REFUSED (nothing written):'); for (const x of r.refusals) console.log(`  - ${x}`); return; }
    if (r.error) { console.log(`Push FAILED: ${r.error} (snapshot ${r.snapshotId})`); return; }
    console.log(`Push: ${r.result}. ${r.dry.summary.added} added, ${r.dry.summary.changed} changed. Snapshot ${r.snapshotId}${r.mismatches.length ? `\nRead-back differs: ${r.mismatches.join(', ')}` : ''}`);
    if (args.includes('--fake')) {
      const rb = await rollback({ snapshotId: r.snapshotId, site, store });
      console.log(rb.ok ? 'Rolled back on the fake site: page and Client Values restored exactly.' : `Rollback: ${rb.error || rb.mismatches.join(', ')}`);
      console.log('Log:'); for (const l of await store.listLog()) console.log(`  ${l.action} → ${l.result}`);
    } else {
      console.log(`To undo: npm run wp:push -- --rollback ${r.snapshotId}`);
    }
  } finally { await close(); }
})().catch(e => { console.error('Push failed:', e.message); process.exit(1); });
