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
//   node tools/niche-thin-run.js landscaper --client edens-edge --trust-pack --quality   (the real Edens Edge inputs)
//
// Flags: --trust-pack   treat the niche's trade facts pack as verified FOR THIS LOCAL RUN ONLY. The
//                       production gate (trade-facts/store.js serviceGate, service-run.js) is not
//                       touched: a service page on an unverified pack is refused there, and
//                       tests/fixtures/trade-facts-gate.js proves it.
//        --emergency    the client confirms emergency call outs (cv.emergency_primary = yes)
//        --services     the service page slugs to write (default: the primary category's first page)
//        --tick         extra service names for the primary category, comma separated: a tab service is
//                       ticked, any other name is a typed additional service confirmed under it, so a
//                       page the default ticks miss (Emergency scaffolding) is in the map for --services
//        --category     the category page slug to write (default: the primary category)
//        --client       edens-edge: the real Edens Edge client (the live page map rows snapshot, the live
//                       client values when tests/live-snapshots/edens-edge.json is there, the town
//                       dossiers), with the library's page flags laid onto the rows; default pages
//                       /paving-contractor and /services/patios
//        --quality      the rubric review on the category and service pages too (the homepage always gets it)
//        --no-claims    skip the claims review
//        --model        another writer model
//        --skip-homepage / --skip-category / --skip-service
//
// The thin client: for the roofer, Kestrel Ridge (tests/fixtures/data/kestrel-ridge-thin-page.js,
// with Roof repair and Roof installation ticked); otherwise a thin template (no reviews, no logos,
// no owner section) in that niche, with the primary GBP category and, where the services config
// has two or more, one more category, three ticked services each, the ones the library makes
// pages first. One category niches (Locksmith, Tiling, Scaffolding and others) get one category:
// nothing is invented. The page map comes from page-map/generator.js with the niche library and
// no search volumes (every page by default, no town service pages), and every page gets a stand
// in H1 since there is no H1 research. On Windows Git Bash, pass MSYS_NO_PATHCONV=1 so a slug
// such as /services/patios is not turned into a Program Files path.

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
const { categoryValidationContext } = require(path.join(root, 'validate-category.js'));
const { serviceValidationContext } = require(path.join(root, 'validate-service.js'));

const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const flag = name => process.argv.includes(name);
const stem = process.argv[2];
if (!stem || stem.startsWith('--')) { console.error('Usage: node tools/niche-thin-run.js <stem> [--trust-pack] [--emergency] [--services /services/a,/services/b] [--category /slug] [--client edens-edge] [--quality]'); process.exit(2); }
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
const libSet = L.loadLibrarySet(nicheKey);
const clientArg = arg('--client');
if (clientArg && clientArg !== 'edens-edge') { console.error(`Unknown client "${clientArg}": only edens-edge is known.`); process.exit(2); }
if (clientArg === 'edens-edge' && stem !== 'landscaper') { console.error('--client edens-edge runs on the landscaper entry: node tools/niche-thin-run.js landscaper --client edens-edge'); process.exit(2); }

// The library's page flags for a page title (the real client's rows predate the flags)
const flagsFor = title => { const m = L.findEntries(libSet, title, []); const own = m.find(x => x.own) || m[0]; return own ? L.targetFlags(own.lib, own.entry.target) : L.targetFlags(libSet.own, title); };
const decorate = rows => rows.map(r => {
  if (!['service', 'town_service'].includes(r.type)) return r;
  const fl = flagsFor(r.type === 'service' ? r.title : (r.info && r.info.service_name) || r.title);
  return { ...r, info: { ...r.info, emergency: !!(r.info.emergency || fl.emergency), desire_led: !!(r.info.desire_led || fl.desire_led), prose_name: r.info.prose_name || fl.prose_name || null, question_name: r.info.question_name || fl.question_name || null } };
});

// ── The client ──
let cv, rows, hand, companyName, baseTown, tabsLine, dossiers = [], allocationData = null, faqResearch = [], defaultCategory = null, defaultServices = null;
const isRoofer = stem === 'roofer';
if (clientArg === 'edens-edge') {
  const E = require(path.join(root, 'tests/fixtures/data/edens-edge-acceptance.js'));
  const snapFile = path.join(root, 'tests/live-snapshots/edens-edge.json');
  const snap = fs.existsSync(snapFile) ? JSON.parse(fs.readFileSync(snapFile, 'utf8')) : null;
  cv = snap ? { ...snap.cv } : { ...E.ethanValues(), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], h1_override: 'Landscaper Southampton', coastal_city: 'yes' };
  rows = decorate(JSON.parse(JSON.stringify(require(path.join(root, 'tests/fixtures/data/edens-edge-v3-page-map.json')).rows)));
  baseTown = 'Southampton';
  hand = { baseTown, otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'].join('\n') };
  companyName = cv.company_name;
  tabsLine = `the live page map rows (${rows.length}), ${snap ? 'the live client values snapshot' : 'the fixture client values'}`;
  dossiers = [{ id: 'southampton', locationName: 'Southampton', text: fs.readFileSync(path.join(root, 'tests/fixtures/southampton-dossier.md'), 'utf8') }];
  const townDir = path.join(root, 'tests/live-snapshots/dossiers');
  if (fs.existsSync(townDir)) for (const f of fs.readdirSync(townDir).filter(f => f.endsWith('.md'))) dossiers.push({ id: f, locationName: f.replace(/\.md$/, '').replace(/[-_]/g, ' '), text: fs.readFileSync(path.join(townDir, f), 'utf8') });
  allocationData = snap ? snap.allocated : null;
  faqResearch = snap && Array.isArray(snap.faqResearch) ? snap.faqResearch : [];
  defaultCategory = '/paving-contractor';
  defaultServices = ['/services/patios'];
} else {
  const K = isRoofer ? require(path.join(root, 'tests/fixtures/data/kestrel-ridge-thin-page.js')) : null;
  const primaryCat = config.categories.find(c => c.key === config.primaryDefault) || config.categories[0];
  const secondCat = config.categories.find(c => c !== primaryCat) || null;
  baseTown = isRoofer ? 'Bournemouth' : 'Southampton';
  const otherTown = isRoofer ? 'Poole' : 'Romsey';
  companyName = isRoofer ? K.cv.company_name : `${nicheLabel.replace(/\s*\(.*\)$/, '').replace(/\//g, ' and ')} Test Co`;
  cv = isRoofer ? { ...K.cv } : {
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
  // Kestrel's confirmed differentiator is "Photos of Every Fault Before We Quote"; the practice tick
  // that says the same thing (photos_of_faults) goes with it, else the PRACTICE check blocks the
  // sentence the differentiator invites (the live client ticks both on Client Values)
  if (isRoofer) { cv.primary_category = cv.primary_category || primaryCat.name; cv.confirmed_practices = [...new Set([...(cv.confirmed_practices || []), 'photos_of_faults'])]; }
  // Ticks: three services per category, the ones the library makes pages first (a tab whose first
  // ticks are all folds, aliases or excludes would give no service page to write), then aliases,
  // then the rest in config order (the roofer: Roof repair, Roof installation and the next two)
  const verdictOf = (c, s) => { const m = L.findEntries(libSet, s, [c.name]); return m.length ? m[0].entry.verdict : 'none'; };
  const rank = { page: 0, alias: 1, none: 2, fold: 3, exclude: 4 };
  const pick = (c, n) => c.services.map((s, i) => ({ s, i, r: rank[verdictOf(c, s)] })).sort((a, b) => a.r - b.r || a.i - b.i).slice(0, n).map(x => x.s);
  const ticks = {};
  // Kestrel ticks Roof repair (an emergency page), Roof installation (Roof replacement) and Skylight
  // installation (the desire led Roof window installation page), then the next pages in config order
  if (isRoofer) ticks[primaryCat.tickGroup] = [...new Set(['Roof repair', 'Roof installation', 'Skylight installation', ...pick(primaryCat, 4)])].filter(s => primaryCat.services.includes(s));
  else { ticks[primaryCat.tickGroup] = pick(primaryCat, 3); if (secondCat) ticks[secondCat.tickGroup] = pick(secondCat, 3); }
  const extraTicks = arg("--tick") ? arg("--tick").split(",").map(x => x.trim()).filter(Boolean) : [];
  // A name the tab carries is ticked; any other is a typed additional service confirmed under the
  // primary category (Emergency scaffolding is a free text intake name in the library)
  const typedTicks = extraTicks.filter(t => !primaryCat.services.includes(t));
  if (extraTicks.length) ticks[primaryCat.tickGroup] = [...new Set([...(ticks[primaryCat.tickGroup] || []), ...extraTicks.filter(t => primaryCat.services.includes(t))])];
  const resolved = R.resolve(ticks, config, typedTicks.length ? { additional: typedTicks.map(service => ({ service, categoryKey: primaryCat.key })) } : {});
  if (!resolved.categories.length) { console.error('The resolver gave no category tabs for these ticks:', JSON.stringify(ticks)); process.exit(1); }
  // The page map: the niche library, no volumes, stand in H1s
  const map = PM.buildPageMap({ resolved, baseTown, otherTowns: otherTown, companyName, terms: { _sitewide: [] }, waiting: [] }, { volumes: new Map(), library: libSet, launchTowns: new Set([slugify(otherTown)]), exclude: new Set(), saved: [] });
  const primaryName = resolved.primaryName || primaryCat.name;
  for (const r of map.rows) {
    if (r.h1) continue;
    r.h1 = r.type === 'homepage' ? `${require(path.join(root, 'niche-library/keyword')).homepageKeywordWord(entry, primaryName) || primaryName} ${baseTown}` : r.type === 'category' || r.type === 'service' ? `${r.title} ${baseTown}` : r.type === 'location' ? `${primaryName} ${r.title}` : r.title;
    r.h1_source = 'pattern';
  }
  rows = map.rows;
  hand = { baseTown, otherTowns: otherTown };
  tabsLine = `tabs ${resolved.categories.map(c => `${c.name} (${c.rows.length})`).join(', ')}`;
  if (isRoofer) defaultServices = ['/services/roof-repairs', '/services/roof-replacement'];
}
if (flag('--emergency')) cv.emergency_primary = 'yes';
const ctx = { ...contextFromPageMap({ rows, hand, cv, niche }), cv };
// --category takes a list: a service page needs its first parent's category page written, which
// may not be the category the test is about (Patios under Landscape Designer and Paving Contractor)
const catSlugs = arg('--category') ? arg('--category').split(',').map(s => s.trim()).filter(Boolean) : defaultCategory ? [defaultCategory] : [];
const catRows = catSlugs.length ? catSlugs.map(s => rows.find(r => r.slug === s)).filter(Boolean) : [rows.find(r => r.type === 'category' && r.info.primary) || rows.find(r => r.type === 'category')].filter(Boolean);
const catRow = catRows[0] || null;
const serviceKeys = arg('--services') ? arg('--services').split(',').map(s => s.trim()).filter(Boolean)
  : defaultServices ? defaultServices
  : [(rows.find(r => r.type === 'service' && (r.info.parent_keys || []).includes(catRow && catRow.info.category_key)) || rows.find(r => r.type === 'service') || {}).slug].filter(Boolean);
const missing = serviceKeys.filter(k => !rows.some(r => r.slug === k));
if (missing.length) { console.error(`Not in the page map: ${missing.join(', ')}. Pages: ${rows.map(r => r.slug).join(', ')}`); process.exit(1); }
if (catSlugs.length && catRows.length !== catSlugs.length) { console.error(`Not in the page map: ${catSlugs.filter(s => !rows.some(r => r.slug === s)).join(', ')}`); process.exit(1); }

// The pack and the facts
const pack = calibrationPacks.tradeNameFor(nicheLabel) || calibrationPacks.tradeNameFor(cv.primary_category);
const packFile = pack ? calibrationPacks.fileForTrade(pack) : null;
const calibrationPack = packFile ? { name: pack, text: calibrationPacks.readPack(packFile) } : { name: null, text: '' };
const trust = flag('--trust-pack');
const factsPack = P.readPack(P.packNameFor(stem) || stem);
const tradeFacts = factsPack.exists
  ? (trust ? { niche: P.packNameFor(stem) || stem, file: factsPack.file, verified: true } : { niche: P.packNameFor(stem) || stem, file: factsPack.file, verified: false, message: `Service pages are blocked: the trade facts pack ${factsPack.file} is not verified for this local run (pass --trust-pack to treat it as verified here only).` })
  : null;
const framing = r => r && r.info ? (r.info.emergency ? 'emergency page' : r.info.desire_led ? 'desire led page' : 'problem led page') : '';

console.log(`Niche ${stem} (${nicheLabel}) · client "${companyName}" in ${baseTown} · ${tabsLine}`);
console.log(`Pages in the map: ${rows.length} · calibration pack ${calibrationPack.name || 'none'} · trade facts ${tradeFacts ? (tradeFacts.verified ? 'trusted for this run' : 'present, not trusted') : 'none'} · emergency call outs ${cv.emergency_primary === 'yes' ? 'confirmed' : 'not confirmed'}`);
console.log(`Writing: homepage, ${catRows.length ? catRows.map(c => c.slug).join(' + ') : '(no category)'}, ${serviceKeys.map(k => `${k} (${framing(rows.find(r => r.slug === k))})`).join(', ')}`);
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
  // The folder carries the process id too (4 Nov 2026): two runs of one niche started in the same second
  // shared a folder and the second overwrote the first's pages
  const dir = path.join(root, 'tests/quality-runs/thin', clientArg ? `${stem}-${clientArg}` : stem, `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`);
  fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  const summary = [];
  const lineOf = (block, re) => ((block || '').match(re) || [''])[0].trim();
  const emergencyLine = block => lineOf(block, /Emergency layout:[^\n]*/) || 'Emergency layout: (not in the block)';
  const framingLine = block => lineOf(block, /Block 4 framing:[^\n]*/);

  // ── Homepage ──
  if (!flag('--skip-homepage')) {
    const DR = computeDecisions({ cv, niche, pages: ctx.pages, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, v20TestMode: true, allocationData, faqResearch, cardServices: ctx.cardServices || null });
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
        // Scored twice and averaged (Brandon, 4 Nov 2026): one reading hides a change under the spread
        const review = await Q.reviewPage({ record, V, D: DR.decisions, cv, niche, callModel: call });
        const review2 = flag('--one-reading') ? null : await Q.reviewPage({ record, V, D: DR.decisions, cv, niche, callModel: call }).catch(() => null);
        const scores = [review, review2].filter(r => r && r.score != null).map(r => r.score);
        if (scores.length === 2) review.score = Math.round(((scores[0] + scores[1]) / 2) * 100) / 100;
        const writingsH = [review, review2].filter(r => r && r.score_writing != null).map(r => r.score_writing);
        if (writingsH.length) review.score_writing = Math.round((writingsH.reduce((a, b) => a + b, 0) / writingsH.length) * 100) / 100;
        review.writings = writingsH;
        review.readings = scores;
        fs.writeFileSync(path.join(dir, 'homepage.md'), buildReaderView(record, record.meta.client_values || {}));
        fs.writeFileSync(path.join(dir, 'homepage-review.txt'), Q.formatReview(review) + (scores.length === 2 ? `\n(Two readings: ${scores.map(s => s.toFixed(1)).join(' and ')}; the score is their average.)\n` : '') + '\n');
        if (review2) fs.writeFileSync(path.join(dir, 'homepage-review-2.txt'), Q.formatReview(review2) + '\n');
        const vs = record.VALIDATION || record.meta.validation || {};
        const blocks = vs.block != null ? vs.block : (vs.issues || []).filter(i => i.type === 'BLOCK').length;
        const flags = vs.flag != null ? vs.flag : (vs.issues || []).filter(i => i.type === 'FLAG').length;
        const fpH = record.meta && record.meta.flag_pass; const fpTextH = fpH && fpH.before != null ? ` (flags ${fpH.before} to ${fpH.after}, ${fpH.kept} kept)` : '';
        const verdictH = `${require(path.join(root, 'verdict.js')).verdictLine(review.verdict)}, ${(review.edit_list || []).length} on the edit list`;
        line = `homepage: ${blocks} BLOCK, ${flags} FLAG${fpTextH}, ${verdictH}, reviewer ${review.score != null ? review.score.toFixed(1) : '?'}${review.readings && review.readings.length === 2 ? ` (${review.readings.map(s => s.toFixed(1)).join(', ')})` : ''}${review.score_writing != null ? `, writing only ${review.score_writing.toFixed(1)}${review.writings && review.writings.length === 2 ? ` (${review.writings.map(s => s.toFixed(1)).join(', ')})` : ''}` : ''} (${review.items ? review.items.filter(i => i.pass).length + '/' + review.items.length + ' items' : ''})`;
        await v20Store.insert(cid, record, { type: 'homepage', key: 'homepage' });
      }
      console.log('  ' + line); summary.push(line);
    }
  }

  // ── Category page ──
  // --quality scores a written page with the reviewer once, as the live app would be reviewed; it
  // never runs the rubric's rewrite rounds (the live app keeps them off, and a rewrite kept by
  // them can leave a page type rule broken). The decisions and facts of each page are kept for it.
  const stash = [];
  const reviewOf = async (type, key, record) => {
    // By slug where the decisions carry one, else by position (the pages are written in key order)
    const keysOf = type === 'category' ? catRows.map(c => c.slug) : serviceKeys;
    const s = stash.find(x => x.type === type && x.slug === key) || stash.filter(x => x.type === type)[keysOf.indexOf(key)] || null;
    if (!s) return null;
    const base = G.validationContextFor({ cv, niche, decisions: s.D, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, calibrationPack: calibrationPack.text, tradeFactsText: (s.tradeFacts && s.tradeFacts.markdown) || '' });
    const V = type === 'category' ? categoryValidationContext(base, s.D) : serviceValidationContext(base, s.D, { tradeFactsRows: (s.tradeFacts && s.tradeFacts.rows) || [] });
    return Q.reviewPage({ record, V, D: s.D, cv, niche, callModel: callFor(type === 'category' ? CG.CATEGORY_MODEL : SG.SERVICE_MODEL) });
  };
  const allocationRecord = { version: 1, pages: {} };
  const inputs = { ctx, niche, rows, dossiers, allocationRecord, calibrationPack, tradeFacts, reviews: Array.isArray(cv.hand_reviews) ? cv.hand_reviews : [], saveAllocation: async r => { Object.assign(allocationRecord, r); } };
  const report = async (type, key, state) => {
    const st = (state.pages || []).find(p => p.key === key) || {};
    if (st.status === 'skipped') { const line = `${type} ${key}: skipped: ${st.error}`; console.log('  ' + line); summary.push(line); return; }
    const found = await v20Store.latest(cid, { type, key });
    if (!found) { const line = `${type} ${key}: ${st.status || 'no record'}${st.error ? ': ' + st.error : ''}`; console.log('  ' + line); summary.push(line); return; }
    const name = key.replace(/^\/+/, '').replace(/[^a-z0-9]+/gi, '_');
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(found.record, null, 2));
    if (!found.record.error && !found.record.blocked) fs.writeFileSync(path.join(dir, `${name}.md`), (type === 'category' ? buildCategoryReaderView : buildServiceReaderView)(found.record, found.record.meta.client_values || {}));
    const V = found.record.VALIDATION || {};
    let Qr = found.record.QUALITY;
    if (flag('--quality') && !found.record.error && !found.record.blocked) {
      // Scored twice and averaged (Brandon, 4 Nov 2026): one reading hides a change under the spread
      try {
        const rv = await reviewOf(type, key, found.record);
        if (rv) {
          const rv2 = flag('--one-reading') ? null : await reviewOf(type, key, found.record).catch(() => null);
          const readings = [rv, rv2].filter(r => r && r.score != null).map(r => r.score);
          const score = readings.length === 2 ? Math.round(((readings[0] + readings[1]) / 2) * 100) / 100 : rv.score;
          const writings = [rv, rv2].filter(r => r && r.score_writing != null).map(r => r.score_writing);
          const score_writing = writings.length ? Math.round((writings.reduce((a, b) => a + b, 0) / writings.length) * 100) / 100 : null;
          Qr = { score, score_writing, readings, writings, done: rv.done, failures: (rv.items || []).filter(i => !i.pass), needs_fact: rv.needs_fact || [], verdict: `${require(path.join(root, 'verdict.js')).verdictLine(rv.verdict)}, ${(rv.edit_list || []).length} on the edit list` };
          fs.writeFileSync(path.join(dir, `${name}-review.txt`), Q.formatReview(rv) + (readings.length === 2 ? `\n(Two readings: ${readings.map(s => s.toFixed(1)).join(' and ')}; the summary score is their average.)\n` : '') + '\n');
          if (rv2) fs.writeFileSync(path.join(dir, `${name}-review-2.txt`), Q.formatReview(rv2) + '\n');
        }
      }
      catch (e) { console.log(`      reviewer failed: ${e.message}`); }
    }
    const block = found.record.meta && found.record.meta.decisions_block;
    const fp = found.record.meta && found.record.meta.flag_pass; const fpText = fp && fp.before != null ? ` (flags ${fp.before} to ${fp.after}, ${fp.kept} kept)` : '';
    const line = `${type} ${key}: ${st.status}${V.status === 'run' ? ` (${V.block} BLOCK, ${V.flag} FLAG${fpText}${found.record.CLAIMS ? `, claims ${found.record.CLAIMS.status}` : ''}${Qr && Qr.verdict ? `, ${Qr.verdict}` : ''}${Qr && Qr.score != null ? `, reviewer ${Qr.score.toFixed(1)}${Qr.readings && Qr.readings.length === 2 ? ` (${Qr.readings.map(s => s.toFixed(1)).join(', ')})` : ''}${Qr.score_writing != null ? `, writing only ${Qr.score_writing.toFixed(1)}${Qr.writings && Qr.writings.length === 2 ? ` (${Qr.writings.map(s => s.toFixed(1)).join(', ')})` : ''}` : ''}` : ''})` : ''}${found.record.error ? ': ' + found.record.error : ''} · ${emergencyLine(block)}${framingLine(block) ? ' · ' + framingLine(block) : ''}`;
    console.log('  ' + line); summary.push(line);
    for (const i of (V.issues || [])) if (i.type === 'BLOCK') console.log(`      BLOCK ${i.check} · ${i.field}: ${i.message}`);
    if (Qr && Qr.failures) for (const i of Qr.failures.slice(0, 6)) console.log(`      QUALITY ${i.id} ${i.title}: ${(i.reasons || []).slice(0, 1).join(' | ')}`);
    for (const f of (found.record.FLAGS || [])) if (/G-|F-BRIEF|F-FACTS|F-CARDS/.test(f.code)) console.log(`      flag ${f.code}: ${f.msg}`);
  };
  if (!flag('--skip-category') && catRows.length) {
    console.log(`\nCategory page${catRows.length > 1 ? 's' : ''} ${catRows.map(c => c.slug).join(', ')}`);
    const runner = createCategoryRunner({
      pool, v20Store, loadInputs: async () => inputs,
      generate: async args => {
        const D = args.decisionsResult.decisions;
        let tf = args.tradeFacts;
        if (tf && D && tf.verified) { const pk = P.packForCategory(tf.niche, D.category, D.cards.map(c => c.name)); tf = { ...tf, markdown: pk.markdown, missing: pk.missing }; }
        stash.push({ type: 'category', slug: D && D.slug, D, tradeFacts: tf });
        return CG.generateCategoryPage({ ...args, tradeFacts: tf, callModel: callFor(CG.CATEGORY_MODEL), claimsReview: !flag('--no-claims'), qualityReview: false });
      },
      allocate, log: () => {},
    });
    const state = await runner.run(cid, { resume: false, keys: catRows.map(c => c.slug) });
    for (const c of catRows) await report('category', c.slug, state);
  }

  // ── Service pages ──
  if (!flag('--skip-service') && serviceKeys.length) {
    console.log(`\nService pages ${serviceKeys.join(', ')}`);
    const runner = createServiceRunner({
      pool, v20Store, loadInputs: async () => inputs,
      generate: async args => { const D = args.decisionsResult.decisions; stash.push({ type: 'service', slug: D && D.slug, D, tradeFacts: args.tradeFacts }); return SG.generateServicePage({ ...args, callModel: callFor(SG.SERVICE_MODEL), claimsReview: !flag('--no-claims'), qualityReview: false }); },
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

  fs.writeFileSync(path.join(dir, 'summary.txt'), [`${stem}${clientArg ? ' · ' + clientArg : ''} · ${companyName} · ${new Date().toISOString()}`, ...summary].join('\n') + '\n');
  console.log(`\n${stem}: ${summary.length} page(s) in ${Math.round((Date.now() - t0) / 1000)}s, about £${(cost() * 0.78).toFixed(2)}. Written to ${path.relative(root, dir)}`);
})().catch(e => { console.error(e); process.exit(1); });
