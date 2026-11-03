'use strict';
// ── Niche thin client run (3 Nov 2026) ───────────────────────────────────────
// Proves a niche entry on a thin client of that niche with the real model, as the live app
// would write it: one homepage, one category page and one service page (more with --services),
// each validated, with the reviewer's score. Nothing is saved to a database; the records and
// reader views go to tests/quality-runs/thin/<stem>/<time>/.
//
//   node tools/niche-thin-run.js cleaning --trust-pack
//   node tools/niche-thin-run.js roofer --trust-pack --emergency --services /services/roof-repairs,/services/roof-replacement
//   node tools/niche-thin-run.js dog-training --trust-pack --category /dog-trainer --quality
//
// Flags: --trust-pack   treat the niche's trade facts pack as verified FOR THIS LOCAL RUN ONLY. The
//                       production gate (trade-facts/store.js serviceGate, service-run.js) is not
//                       touched: a service page on an unverified pack is refused there, and
//                       tests/fixtures/trade-facts-gate.js proves it.
//        --emergency    the client confirms emergency call outs (cv.emergency_primary = yes)
//        --services     the service page slugs to write (default: the primary category's first page)
//        --category     the category page slug to write (default: the primary category)
//        --quality      the rubric review on the category and service pages too (the homepage always gets it)
//        --no-claims    skip the claims review
//        --model        another writer model
//        --skip-homepage / --skip-category / --skip-service
//
// The client: for the roofer, Kestrel Ridge (tests/fixtures/data/kestrel-ridge-thin-page.js, with
// Roof repair and Roof installation ticked); otherwise a thin template (no reviews, no logos, no
// owner section) in that niche, with the primary GBP category and, where the services config has
// two or more, one more category, three ticked services each. One category niches (Locksmith,
// Tiling, Scaffolding and others) get one category: nothing is invented. The page map comes from
// page-map/generator.js with the niche library and no search volumes (every page by default, no
// town service pages), and every page gets a stand in H1 since there is no H1 research.

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
const N = require(path.join(root, 'fillout/niches.js'));
const R = require(path.join(root, 'fillout/services/resolver.js'));
const { stemFor } = require(path.join(root, 'ui/library.js'));
const L = require(path.join(root, 'niche-library/library.js'));
const PM = require(path.join(root, 'page-map/generator.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const G = require(path.join(root, 'v20-generate.js'));
const Q = require(path.join(root, 'quality-review.js'));
const { buildReaderView } = require(path.join(root, 'v20-reader.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const { createCategoryRunner } = require(path.join(root, 'category-run.js'));
const { createServiceRunner } = require(path.join(root, 'service-run.js'));
const CG = require(path.join(root, 'category-generate.js'));
const SG = require(path.join(root, 'service-generate.js'));
const P = require(path.join(root, 'trade-facts/pack.js'));
const A = require(path.join(root, 'allocation.js'));
const { buildCategoryReaderView } = require(path.join(root, 'category-reader.js'));
const { buildServiceReaderView } = require(path.join(root, 'service-reader.js'));
const calibrationPacks = require(path.join(root, 'calibration-packs.js'));
const { slugify } = require(path.join(root, 'page-map/slugs.js'));

const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const flag = name => process.argv.includes(name);
const stem = process.argv[2];
if (!stem || stem.startsWith('--')) { console.error('Usage: node tools/niche-thin-run.js <stem> [--trust-pack] [--emergency] [--services /services/a,/services/b] [--category /slug] [--quality]'); process.exit(2); }
const entryFile = path.join(root, 'niche-library', `${stem}.json`);
if (!fs.existsSync(entryFile)) { console.error(`No entry: niche-library/${stem}.json`); process.exit(1); }

// The niche: its Fillout key and label, from the services config whose key maps to this stem
const configDir = path.join(root, 'fillout/services');
const config = fs.readdirSync(configDir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(configDir, f), 'utf8'))).find(c => c.nicheKey && stemFor(String(c.nicheKey).replace(/_/g, '-')) === stem) || null;
if (!config) { console.error(`No services config in fillout/services/ maps to ${stem}`); process.exit(1); }
const nicheKey = String(config.nicheKey).replace(/_/g, '-');
const nicheLabel = N.nicheLabel(nicheKey);
const entry = JSON.parse(fs.readFileSync(entryFile, 'utf8'));
const niche = { ...entry, _source: stem, service_words: [] };

// The thin client
const isRoofer = stem === 'roofer';
const K = isRoofer ? require(path.join(root, 'tests/fixtures/data/kestrel-ridge-thin-page.js')) : null;
const primaryCat = config.categories.find(c => c.key === config.primaryDefault) || config.categories[0];
const secondCat = config.categories.find(c => c !== primaryCat) || null;
const baseTown = isRoofer ? 'Bournemouth' : 'Southampton';
const otherTown = isRoofer ? 'Poole' : 'Romsey';
const companyName = isRoofer ? K.cv.company_name : `${nicheLabel.replace(/\s*\(.*\)$/, '').replace(/\//g, ' and ')} Test Co`;
const cv = isRoofer ? { ...K.cv } : {
  company_name: companyName, company_name_gbp_checked: true, phone: '023 8000 0000', email: '', address: '', gbp_address_type: 'service_area', hours: '',
  primary_category: primaryCat.name, year_founded: '2021', jobs_completed: '60', rating: '', review_count: '',
  guarantee_years: '', manufacturer_warranty: '', insurance_cover: '2m',
  differentiator_1: 'Family Run and Independent', differentiator_1_confirmed: true, differentiator_1_sentence: 'Family run and independent',
  differentiator_2: '', differentiator_2_confirmed: false, differentiator_2_sentence: '',
  verified_logos: [], free_quotes: 'yes', free_inspection: '', quote_method: '', price_list: '', response_time: '', same_day_available: '', out_of_hours_available: '', start_time: '',
  owner_name: 'Sam', owner_name_2: '', owner_qualification: '', owner_why: '', owner_promise: '', owner_pronoun: '',
  business_type: entry.business_type_default || 'A', emergency_primary: '', handles_planning: '', confirmed_practices: [], materials_methods: [], jobs_wanted: [], hand_reviews: [],
  coastal_city: 'yes', area_wide: '',
};
if (flag('--emergency')) cv.emergency_primary = 'yes';
// Kestrel's confirmed differentiator is "Photos of Every Fault Before We Quote"; the practice tick
// that says the same thing (photos_of_faults) goes with it, else the PRACTICE check blocks the
// sentence the differentiator invites (the live client ticks both on Client Values)
if (isRoofer) { cv.primary_category = cv.primary_category || primaryCat.name; cv.confirmed_practices = [...new Set([...(cv.confirmed_practices || []), 'photos_of_faults'])]; }

// Ticks: three services per category, the ones the library makes pages first (a tab whose first
// ticks are all folds, aliases or excludes would give no service page to write), then aliases,
// then the rest in config order (the roofer: Roof repair, Roof installation and the next two)
const libSet = L.loadLibrarySet(String(config.nicheKey).replace(/_/g, '-'));
const verdictOf = (c, s) => { const m = L.findEntries(libSet, s, [c.name]); return m.length ? m[0].entry.verdict : 'none'; };
const rank = { page: 0, alias: 1, none: 2, fold: 3, exclude: 4 };
const pick = (c, n) => c.services.map((s, i) => ({ s, i, r: rank[verdictOf(c, s)] })).sort((a, b) => a.r - b.r || a.i - b.i).slice(0, n).map(x => x.s);
const ticks = {};
if (isRoofer) ticks[primaryCat.tickGroup] = [...new Set(['Roof repair', 'Roof installation', ...pick(primaryCat, 4)])].filter(s => primaryCat.services.includes(s));
else { ticks[primaryCat.tickGroup] = pick(primaryCat, 3); if (secondCat) ticks[secondCat.tickGroup] = pick(secondCat, 3); }
const resolved = R.resolve(ticks, config);
if (!resolved.categories.length) { console.error('The resolver gave no category tabs for these ticks:', JSON.stringify(ticks)); process.exit(1); }

// The page map: the niche library, no volumes, stand in H1s
const lib = L.loadLibrarySet(nicheKey);
const map = PM.buildPageMap({ resolved, baseTown, otherTowns: otherTown, companyName, terms: { _sitewide: [] }, waiting: [] }, { volumes: new Map(), library: lib, launchTowns: new Set([slugify(otherTown)]), exclude: new Set(), saved: [] });
const primaryName = resolved.primaryName || primaryCat.name;
for (const r of map.rows) {
  if (r.h1) continue;
  r.h1 = r.type === 'homepage' ? `${primaryName} ${baseTown}` : r.type === 'category' || r.type === 'service' ? `${r.title} ${baseTown}` : r.type === 'location' ? `${primaryName} ${r.title}` : r.title;
  r.h1_source = 'pattern';
}
const rows = map.rows;
const hand = { baseTown, otherTowns: otherTown };
const ctx = { ...contextFromPageMap({ rows, hand, cv, niche }), cv };
const catRow = arg('--category') ? rows.find(r => r.slug === arg('--category')) : rows.find(r => r.type === 'category' && r.info.primary) || rows.find(r => r.type === 'category');
const serviceKeys = arg('--services') ? arg('--services').split(',').map(s => s.trim()).filter(Boolean)
  : isRoofer ? ['/services/roof-repairs', '/services/roof-replacement']
  : [(rows.find(r => r.type === 'service' && (r.info.parent_keys || []).includes(catRow && catRow.info.category_key)) || rows.find(r => r.type === 'service') || {}).slug].filter(Boolean);
const missing = serviceKeys.filter(k => !rows.some(r => r.slug === k));
if (missing.length) { console.error(`Not in the page map: ${missing.join(', ')}. Pages: ${rows.map(r => r.slug).join(', ')}`); process.exit(1); }

// The pack and the facts
const pack = calibrationPacks.tradeNameFor(nicheLabel) || calibrationPacks.tradeNameFor(primaryCat.name);
const packFile = pack ? calibrationPacks.fileForTrade(pack) : null;
const calibrationPack = packFile ? { name: pack, text: calibrationPacks.readPack(packFile) } : { name: null, text: '' };
const trust = flag('--trust-pack');
const factsPack = P.readPack(P.packNameFor(stem) || stem);
const tradeFacts = factsPack.exists
  ? (trust ? { niche: P.packNameFor(stem) || stem, file: factsPack.file, verified: true } : { niche: P.packNameFor(stem) || stem, file: factsPack.file, verified: false, message: `Service pages are blocked: the trade facts pack ${factsPack.file} is not verified for this local run (pass --trust-pack to treat it as verified here only).` })
  : null;

console.log(`Niche ${stem} (${nicheLabel}) · client "${companyName}" in ${baseTown} · tabs ${resolved.categories.map(c => `${c.name} (${c.rows.length})`).join(', ')}`);
console.log(`Pages in the map: ${rows.length} · calibration pack ${calibrationPack.name || 'none'} · trade facts ${tradeFacts ? (tradeFacts.verified ? 'trusted for this run' : 'present, not trusted') : 'none'} · emergency call outs ${cv.emergency_primary === 'yes' ? 'confirmed' : 'not confirmed'}`);
console.log(`Writing: homepage, ${catRow ? catRow.slug : '(no category)'}, ${serviceKeys.join(', ')}`);
if (!calibrationPack.name) console.log('WARNING: no calibration pack found for this niche; the pages are written without one.');

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const pool = new (mem.adapters.createPg().Pool)();
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB)`);
  const v20Store = createV20Store(pool);
  const cid = crypto.randomUUID();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const usage = {};
  const onUsage = (model, r) => { const u = usage[model] = usage[model] || { calls: 0, input: 0, output: 0, cache_read: 0, cache_write: 0 }; u.calls++; u.input += r.input_tokens; u.output += r.output_tokens; u.cache_read += r.cache_read_input_tokens || 0; u.cache_write += r.cache_creation_input_tokens || 0; };
  const PRICE = { 'claude-sonnet-4-6': [3, 15], 'claude-sonnet-5-5': [2, 10], 'claude-opus-5-5': [4, 20] };
  const cost = () => Object.entries(usage).reduce((s, [m, u]) => { const [i, o] = PRICE[m] || [5, 25]; return s + (u.input * i + u.cache_read * i * 0.1 + u.cache_write * i * 1.25 + u.output * o) / 1e6; }, 0);
  const writer = arg('--model');
  const callFor = dflt => makeCallModel(client, writer || dflt, { onUsage });
  const allocate = args => A.runAllocation({ ...args, callModel: async (system, message) => { const r = await client.messages.create({ model: A.ALLOCATION_MODEL, max_tokens: 2048, system, messages: [{ role: 'user', content: message }] }); return r.content.map(c => c.text || '').join(''); } });
  const dir = path.join(root, 'tests/quality-runs/thin', stem, new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const summary = [];
  const emergencyLine = block => ((block || '').match(/Emergency layout:[^\n]*/) || ['Emergency layout: (not in the block)'])[0].trim();

  // ── Homepage ──
  if (!flag('--skip-homepage')) {
    const DR = computeDecisions({ cv, niche, pages: ctx.pages, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, v20TestMode: true, allocationData: null, faqResearch: [], cardServices: ctx.cardServices || null });
    if (DR.gates.length) { console.log('HOMEPAGE GATES:', JSON.stringify(DR.gates)); summary.push(`homepage: gated (${DR.gates.map(g => g.code).join(', ')})`); }
    else {
      console.log(`\nHomepage · ${emergencyLine(DR.decisionsBlock)}`);
      const call = callFor(G.V20_MODEL);
      const record = await G.generateV20Homepage({ cv, niche, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, decisionsResult: DR, calibrationPack: calibrationPack.text, calibrationPackName: calibrationPack.name, callModel: call, qualityReview: false });
      fs.writeFileSync(path.join(dir, 'homepage.json'), JSON.stringify(record, null, 2));
      fs.writeFileSync(path.join(dir, 'homepage-decisions.txt'), DR.decisionsBlock + '\n');
      const V = G.validationContextFor({ cv, niche, decisions: DR.decisions, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, calibrationPack: calibrationPack.text });
      let line;
      if (record.blocked || record.error) line = `homepage: ${record.error || 'blocked'}`;
      else {
        const review = await Q.reviewPage({ record, V, D: DR.decisions, cv, niche, callModel: call });
        fs.writeFileSync(path.join(dir, 'homepage.md'), buildReaderView(record, record.meta.client_values || {}));
        fs.writeFileSync(path.join(dir, 'homepage-review.txt'), Q.formatReview(review) + '\n');
        const vs = record.VALIDATION || record.meta.validation || {};
        const blocks = vs.block != null ? vs.block : (vs.issues || []).filter(i => i.type === 'BLOCK').length;
        const flags = vs.flag != null ? vs.flag : (vs.issues || []).filter(i => i.type === 'FLAG').length;
        line = `homepage: ${blocks} BLOCK, ${flags} FLAG, reviewer ${review.score != null ? review.score.toFixed(1) : '?'} (${review.items ? review.items.filter(i => i.pass).length + '/' + review.items.length + ' items' : ''})`;
        await v20Store.insert(cid, record, { type: 'homepage', key: 'homepage' });
      }
      console.log('  ' + line); summary.push(line);
    }
  }

  // ── Category page ──
  const allocationRecord = { version: 1, pages: {} };
  const inputs = { ctx, niche, rows, dossiers: [], allocationRecord, calibrationPack, tradeFacts, reviews: [], saveAllocation: async r => { Object.assign(allocationRecord, r); } };
  const report = async (type, key, state) => {
    const st = (state.pages || []).find(p => p.key === key) || {};
    if (st.status === 'skipped') { const line = `${type} ${key}: skipped: ${st.error}`; console.log('  ' + line); summary.push(line); return; }
    const found = await v20Store.latest(cid, { type, key });
    if (!found) { const line = `${type} ${key}: ${st.status || 'no record'}${st.error ? ': ' + st.error : ''}`; console.log('  ' + line); summary.push(line); return; }
    const name = key.replace(/^\/+/, '').replace(/[^a-z0-9]+/gi, '_');
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(found.record, null, 2));
    if (!found.record.error && !found.record.blocked) fs.writeFileSync(path.join(dir, `${name}.md`), (type === 'category' ? buildCategoryReaderView : buildServiceReaderView)(found.record, found.record.meta.client_values || {}));
    const V = found.record.VALIDATION || {};
    const Qr = found.record.QUALITY;
    const line = `${type} ${key}: ${st.status}${V.status === 'run' ? ` (${V.block} BLOCK, ${V.flag} FLAG${found.record.CLAIMS ? `, claims ${found.record.CLAIMS.status}` : ''}${Qr && Qr.score != null ? `, reviewer ${Qr.score.toFixed(1)}` : ''})` : ''}${found.record.error ? ': ' + found.record.error : ''} · ${emergencyLine(found.record.meta && found.record.meta.decisions_block)}`;
    console.log('  ' + line); summary.push(line);
    for (const i of (V.issues || [])) if (i.type === 'BLOCK') console.log(`      BLOCK ${i.check} · ${i.field}: ${i.message}`);
    if (Qr && Qr.failures) for (const i of Qr.failures.slice(0, 6)) console.log(`      QUALITY ${i.id} ${i.title}: ${(i.reasons || []).slice(0, 1).join(' | ')}`);
    for (const f of (found.record.FLAGS || [])) if (/G-|F-BRIEF|F-FACTS|F-CARDS/.test(f.code)) console.log(`      flag ${f.code}: ${f.msg}`);
  };
  if (!flag('--skip-category') && catRow) {
    console.log(`\nCategory page ${catRow.slug}`);
    const runner = createCategoryRunner({
      pool, v20Store, loadInputs: async () => inputs,
      generate: async args => {
        const D = args.decisionsResult.decisions;
        let tf = args.tradeFacts;
        if (tf && D && tf.verified) { const pk = P.packForCategory(tf.niche, D.category, D.cards.map(c => c.name)); tf = { ...tf, markdown: pk.markdown, missing: pk.missing }; }
        return CG.generateCategoryPage({ ...args, tradeFacts: tf, callModel: callFor(CG.CATEGORY_MODEL), claimsReview: !flag('--no-claims'), qualityReview: flag('--quality'), qualityRounds: 2 });
      },
      allocate, log: () => {},
    });
    const state = await runner.run(cid, { resume: false, keys: [catRow.slug] });
    await report('category', catRow.slug, state);
  }

  // ── Service pages ──
  if (!flag('--skip-service') && serviceKeys.length) {
    console.log(`\nService pages ${serviceKeys.join(', ')}`);
    const runner = createServiceRunner({
      pool, v20Store, loadInputs: async () => inputs,
      generate: async args => SG.generateServicePage({ ...args, callModel: callFor(SG.SERVICE_MODEL), claimsReview: !flag('--no-claims'), qualityReview: flag('--quality'), qualityRounds: 2 }),
      allocate, log: () => {},
    });
    try {
      const state = await runner.run(cid, { resume: false, keys: serviceKeys });
      for (const k of serviceKeys) await report('service', k, state);
    } catch (e) {
      const line = `service pages: refused: ${e.message}`;
      console.log('  ' + line); summary.push(line);
    }
  }

  fs.writeFileSync(path.join(dir, 'summary.txt'), [`${stem} · ${companyName} · ${new Date().toISOString()}`, ...summary].join('\n') + '\n');
  console.log(`\n${stem}: ${summary.length} page(s) in ${Math.round((Date.now() - t0) / 1000)}s, about £${(cost() * 0.78).toFixed(2)}. Written to ${path.relative(root, dir)}`);
})().catch(e => { console.error(e); process.exit(1); });
