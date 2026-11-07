'use strict';
// ── GBP Posts, local real batch ──────────────────────────────────────────────
// A real batch with the real model and real Drive photos, written the way the live job writes one,
// and how much the posts repeat. Nothing goes to any database and nothing is published.
//
//   node tools/gbp-posts-run.js --record <record.json> --folder "<Drive link>" [--size 13]
//   node tools/gbp-posts-run.js --live "<client>" --folder "<Drive link>" [--size 13]
//     --live reads that client's saved Lead Snap config, in one read only transaction on the .env database
//
// Needs ANTHROPIC_API_KEY and GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE (or _JSON), in the environment or in
// --env <file>. Writes tests/quality-runs/gbp-posts/<client>/<time>/ (posts.md, batch.json). 13 posts cost about 5p (real run, 7 Nov 2026).

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
const envFile = arg('env') || path.join(root, '.env');
for (const line of (fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && ['ANTHROPIC_API_KEY', 'DATABASE_URL'].includes(m[1]) && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const Anthropic = require('@anthropic-ai/sdk');
const { makeCallModel } = require(path.join(root, 'anthropic-call.js'));
const { createDrive, parseFolderId } = require(path.join(root, 'drive/client.js'));
const { readClientPhotos } = require(path.join(root, 'drive/photos.js'));
const P = require(path.join(root, 'gbp-posts/plan.js'));
const { writePost, MODEL } = require(path.join(root, 'gbp-posts/write.js'));
const { comparePairs, withoutFactsAndCta } = require(path.join(root, 'leadsnap/autopost/preview.js'));
const { USD_TO_GBP, priceFor } = require(path.join(root, 'ui/model-log.js'));

const CONCURRENCY = 4;

async function liveRecord(name) {
  const { Client } = require('pg');
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    await db.query('BEGIN TRANSACTION READ ONLY');
    const { rows } = await db.query(`SELECT a.content, c.id FROM client_assets a JOIN clients c ON c.id = a.client_id WHERE lower(c.name) = lower($1) AND a.asset_type = 'leadsnap_autopost' ORDER BY a.uploaded_at DESC LIMIT 1`, [name]);
    await db.query('ROLLBACK');
    if (!rows.length) throw new Error(`No saved Lead Snap config for "${name}".`);
    return { record: typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content, clientId: rows[0].id };
  } finally { await db.end(); }
}

(async () => {
  const size = Number(arg('size') || 13);
  const folderId = parseFolderId(arg('folder'));
  if (!folderId) throw new Error('Give the Drive folder: --folder "<link>"');
  const got = arg('live') ? await liveRecord(arg('live')) : { record: JSON.parse(fs.readFileSync(arg('record'), 'utf8')), clientId: 'local-run' };
  const { record, clientId } = got;
  const read = await readClientPhotos({ drive: createDrive(), folderId });
  const plan = P.planBatch({ size, record, photos: read.files, history: [], clientId });
  console.log(`Planned ${plan.posts.length} posts from ${plan.start}. ${plan.posts.filter(p => p.topic === 'OFFER').length} Offer. Folders: ${[...new Set(plan.posts.map(p => p.folder))].length}.`);
  for (const n of plan.notes) console.log(`Note: ${n}`);

  const callModel = makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), MODEL);
  const promptOf = n => record.output.prompts.find(p => p.n === n);
  const openings = [];
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0 };
  const results = [];
  for (let i = 0; i < plan.posts.length; i += CONCURRENCY) {
    const earlier = [...openings];
    await Promise.all(plan.posts.slice(i, i + CONCURRENCY).map(async post => {
      const r = await writePost({ prompt: promptOf(post.prompt_n), intake: record.intake, earlierOpenings: earlier, callModel });
      results.push({ ...post, ...r });
      if (r.opening) openings.push(r.opening);
      usage.input_tokens += r.usage.input_tokens; usage.output_tokens += r.usage.output_tokens; usage.calls += r.usage.calls;
    }));
    console.log(`  ${Math.min(i + CONCURRENCY, plan.posts.length)} of ${plan.posts.length}`);
  }
  results.sort((a, b) => a.seq - b.seq);

  const [inM, outM] = priceFor(MODEL);
  const usd = (usage.input_tokens * inM + usage.output_tokens * outM) / 1e6;
  const fails = results.filter(r => r.fails), warned = results.filter(r => !r.fails && r.warnings);
  // How much the posts repeat: every pair, the whole batch, prompts reused included
  const { pairs, compared } = comparePairs(results.map(r => ({ ref: `P${r.seq}`, group: r.seq, text: r.body, body: withoutFactsAndCta(r.body, record.intake) })));
  const samePrompt = results.filter(r => results.some(o => o.seq !== r.seq && o.prompt_n === r.prompt_n)).length;
  const openingPairs = pairs.filter(p => p.type === 'opening');
  const phrasePairs = pairs.filter(p => p.type === 'phrase');
  const longest = [...phrasePairs].sort((a, b) => b.words - a.words).slice(0, 5);
  const dashes = results.filter(r => /[–—]/.test(r.body)).length;
  const chars = results.map(r => r.chars);

  const summary = [
    `${results.length} posts, ${usage.calls} model calls, $${usd.toFixed(3)} (${(usd * USD_TO_GBP * 100).toFixed(1)}p)`,
    `${fails.length} with a FAIL, ${warned.length} with warnings, ${results.length - fails.length - warned.length} clean`,
    `Characters: ${Math.min(...chars)} to ${Math.max(...chars)}. With a long or en dash: ${dashes}`,
    `Pairs compared: ${compared}. Sharing an opening: ${openingPairs.length}. Sharing 8+ words in a row, outside facts and CTA: ${phrasePairs.length}`,
    `Posts from a prompt used more than once: ${samePrompt}`,
    ...longest.map(p => `  ${p.refs.join(' & ')}: ${p.words} words: "${p.text}"`),
    ...openingPairs.slice(0, 5).map(p => `  Same opening ${p.refs.join(' & ')}: "${p.text}"`),
    ...fails.flatMap(r => r.checks.filter(c => c.level === 'fail').map(c => `  FAIL post ${r.seq}: ${c.label}: ${c.detail || ''}`)),
    ...warned.flatMap(r => r.checks.filter(c => c.level === 'warn').map(c => `  warn post ${r.seq}: ${c.label}: ${c.detail || ''}`)),
  ];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(root, 'tests/quality-runs/gbp-posts', String(record.intake.business || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-'), stamp);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'batch.json'), JSON.stringify({ plan: plan.notes, results, usage, usd }, null, 2));
  fs.writeFileSync(path.join(dir, 'posts.md'), [`# ${record.intake.business}: ${results.length} posts`, '', ...summary, '', ...results.flatMap(r => [`## ${r.seq}. ${r.post_date} ${r.topic === 'OFFER' ? `OFFER ${r.offer_title} to ${r.offer_end}` : r.cta_type}: ${r.prompt_label}`, `Photo: ${r.folder} / ${r.photo_name}. ${r.words} words, ${r.chars} characters.`, '', r.body, ''])].join('\n'));
  console.log(summary.join('\n'));
  console.log(`Saved: ${dir}`);
})().catch(e => { console.error(e.message); process.exit(1); });
