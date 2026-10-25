'use strict';
// ── Category pages, local real run (23 Oct) ──────────────────────────────────
// Writes category pages for the Edens Edge fixture client with the real model, as the
// live app does, and saves every record and reader view under tests/quality-runs/category/<time>/.
//
//   node tools/category-run.js                              the Gardener base page and Gardener Winchester (the fixture pair)
//   node tools/category-run.js --keys /gardener,/tree-service  the pages named
//   node tools/category-run.js --all                        every category and location category page (base first)
//   node tools/category-run.js --trust-pack                 treat the landscaper trade facts pack as verified (its rows join the message)
//   node tools/category-run.js --no-claims                  skip the claims review
//   node tools/category-run.js --quality                    the rubric review and its rewrites too (quality-review.js; Opus, about 50p a page more)
//   node tools/category-run.js --practices all              tick every practice the niche lists (or --practices key1,key2), as the
//                                                           live client would have them ticked on Client Values
//
// Inputs: the live page map rows snapshot (tests/fixtures/data/edens-edge-v3-page-map.json), the live
// client values when tests/live-snapshots/edens-edge.json is there (else the fixture values), the
// Southampton dossier (tests/fixtures/southampton-dossier.md; a town dossier is read from
// tests/live-snapshots/dossiers/<town>.md when there is one) and the landscaper niche entry with
// its category_page_blocks. Needs ANTHROPIC_API_KEY in .env. About 40p to 80p a page.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY is not set in .env.'); process.exit(1); }

const Anthropic = require('@anthropic-ai/sdk');
const { newDb, DataType } = require('pg-mem');
const { makeCallModel } = require(path.join(root, 'anthropic-call.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const { createCategoryRunner, pagesInOrder } = require(path.join(root, 'category-run.js'));
const CG = require(path.join(root, 'category-generate.js'));
const P = require(path.join(root, 'trade-facts/pack.js'));
const A = require(path.join(root, 'allocation.js'));
const { buildCategoryReaderView } = require(path.join(root, 'category-reader.js'));
const E = require(path.join(root, 'tests/fixtures/data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const { rows } = require(path.join(root, 'tests/fixtures/data/edens-edge-v3-page-map.json'));

const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const flag = name => process.argv.includes(name);

(async () => {
  const snapFile = path.join(root, 'tests/live-snapshots/edens-edge.json');
  const snap = fs.existsSync(snapFile) ? JSON.parse(fs.readFileSync(snapFile, 'utf8')) : null;
  const cv = snap ? snap.cv : { ...E.ethanValues(), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], h1_override: 'Landscaper Southampton', coastal_city: 'yes' };
  if (arg('--practices')) {
    const { practicesFor } = require(path.join(root, 'practices.js'));
    const want = arg('--practices') === 'all' ? practicesFor(require(path.join(root, 'niche-library/landscaper.json'))).map(p => p.key) : arg('--practices').split(',').map(s => s.trim()).filter(Boolean);
    cv.confirmed_practices = [...new Set([...(cv.confirmed_practices || []), ...want])];
    console.log(`Practices ticked for this run: ${cv.confirmed_practices.join(', ')}`);
  }
  const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'].join('\n') };
  const niche = { ...landscaper, _source: 'landscaper', service_words: [] };
  const ctx = { ...contextFromPageMap({ rows, hand, cv, niche }), cv };
  const dossiers = [{ id: 'southampton', locationName: 'Southampton', text: fs.readFileSync(path.join(root, 'tests/fixtures/southampton-dossier.md'), 'utf8') }];
  const townDir = path.join(root, 'tests/live-snapshots/dossiers');
  if (fs.existsSync(townDir)) for (const f of fs.readdirSync(townDir).filter(f => f.endsWith('.md'))) dossiers.push({ id: f, locationName: f.replace(/\.md$/, '').replace(/[-_]/g, ' '), text: fs.readFileSync(path.join(townDir, f), 'utf8') });
  const packs = [path.join(root, 'calibration-packs'), root];
  let calibrationPack = { name: null, text: '' };
  for (const d of packs) if (fs.existsSync(d)) { const f = fs.readdirSync(d).find(x => /^Landscaper_Calibration_Pack.*.md$/i.test(x)); if (f) { calibrationPack = { name: f, text: fs.readFileSync(path.join(d, f), 'utf8') }; break; } }
  const trust = flag('--trust-pack');
  const tradeFacts = P.readPack('landscaper').exists ? { niche: 'landscaper', file: 'trade-facts/landscaper.md', verified: trust } : null;

  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const pool = new (mem.adapters.createPg().Pool)();
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);`);
  const v20Store = createV20Store(pool);
  const cid = crypto.randomUUID();
  // The homepage's ideas: the snapshot's homepage record when it carries one
  if (snap && snap.homepage) await v20Store.insert(cid, snap.homepage, { type: 'homepage', key: 'homepage' });

  const usage = {};
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const callModel = makeCallModel(client, CG.CATEGORY_MODEL, { onUsage: (model, r) => { const u = usage[model] = usage[model] || { calls: 0, input: 0, output: 0 }; u.calls++; u.input += r.input_tokens; u.output += r.output_tokens; } });
  const allocationRecord = { version: 1, pages: {} };
  const inputs = { ctx, niche, rows, dossiers, allocationRecord, calibrationPack, tradeFacts, reviews: Array.isArray(cv.hand_reviews) ? cv.hand_reviews : [], saveAllocation: async r => { Object.assign(allocationRecord, r); } };
  const runner = createCategoryRunner({
    pool, v20Store, loadInputs: async () => inputs,
    generate: async args => {
      const D = args.decisionsResult.decisions;
      let tf = args.tradeFacts;
      if (tf && D && tf.verified) { const pack = P.packForCategory(tf.niche, D.category, D.cards.map(c => c.name)); tf = { ...tf, markdown: pack.markdown, missing: pack.missing }; }
      return CG.generateCategoryPage({ ...args, tradeFacts: tf, callModel, claimsReview: !flag('--no-claims'), qualityReview: flag('--quality') });
    },
    allocate: args => A.runAllocation({ ...args, callModel: async (system, message) => {
      const r = await client.messages.create({ model: A.ALLOCATION_MODEL, max_tokens: 2048, system, messages: [{ role: 'user', content: message }] });
      return r.content.map(c => c.text || '').join('');
    } }),
  });
  const keys = flag('--all') ? null : (arg('--keys') ? arg('--keys').split(',').map(s => s.trim()) : ['/gardener', '/locations/winchester/gardener']);
  console.log(`Pages: ${(keys || pagesInOrder(rows).map(p => p.slug)).join(', ')}${trust ? ' (trade facts pack trusted)' : ' (trade facts left out: pass --trust-pack)'}`);
  const t0 = Date.now();
  const state = await runner.run(cid, { resume: false, keys });
  const dir = path.join(root, 'tests/quality-runs/category', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(dir, { recursive: true });
  for (const p of state.pages) {
    const found = await v20Store.latest(cid, { type: 'category', key: p.key });
    if (!found) continue;
    const name = p.key.replace(/^\/+/, '').replace(/[^a-z0-9]+/gi, '_');
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(found.record, null, 2));
    if (!found.record.error && !found.record.blocked) fs.writeFileSync(path.join(dir, `${name}.md`), buildCategoryReaderView(found.record, found.record.meta.client_values || {}));
    const V = found.record.VALIDATION || {};
    const Qr = found.record.QUALITY;
    console.log(`  ${p.key}: ${p.status}${V.status === 'run' ? ` (${V.block} BLOCK, ${V.flag} FLAG${found.record.CLAIMS ? `, claims ${found.record.CLAIMS.status}` : ''}${Qr && Qr.score != null ? `, quality ${Qr.score.toFixed(1)}${Qr.done ? ' DONE' : ` failing ${Qr.failed.join(', ')}`}` : ''})` : ''}${p.error ? `: ${p.error}` : ''}`);
    if (Qr && Qr.failures) for (const i of Qr.failures) console.log(`      QUALITY ${i.id} ${i.title}: ${(i.reasons || []).slice(0, 2).join(' | ')}`);
    if (Qr && Qr.other_problems) for (const o of Qr.other_problems) console.log(`      QUALITY other: "${o.quote}": ${o.why}`);
    for (const i of (V.issues || [])) console.log(`      ${i.type} ${i.check} · ${i.field}: ${i.message}`);
    for (const f of (found.record.FLAGS || [])) console.log(`      flag ${f.code}: ${f.msg}`);
  }
  const cost = Object.entries(usage).reduce((s, [m, u]) => s + (u.input * (/5-5/.test(m) ? 2 : 3) + u.output * (/5-5/.test(m) ? 10 : 15)) / 1e6, 0);
  console.log(`\nDone in ${Math.round((Date.now() - t0) / 1000)}s, about £${(cost * 0.78).toFixed(2)}. Written to ${path.relative(root, dir)}`);
})().catch(e => { console.error(e); process.exit(1); });
