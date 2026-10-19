'use strict';
// Fixture: page map v3 (page-map/plan-v3.js, page-map/generator.js, the one-click job).
// The services list rules: dedupe by plural / "services" / "&" vs "and" / word order, a merged
// service keeping both categories, fold on a category's candidate group including synonyms,
// fold on the exact category name, page-or-mention with the core flag forcing a page; service
// x town research batched and cached; a town service page only on volume, never on pattern;
// every remaining service a page by default (20 Oct 2026), Exclude making it a mention, the stem
// list in dedupe, copy_priority on service pages;
// the link planner for all six page types including the else-branches; the anchor text rule;
// no unlinked card; the export carrying the targets and the mentioned list. Stubbed DataForSEO.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const G = require(path.join(root, 'page-map/generator.js'));
const V3 = require(path.join(root, 'page-map/plan-v3.js'));
const C = require(path.join(root, 'h1-research/claims.js'));
const D = require(path.join(root, 'h1-research/dataforseo.js'));
const { ensureH1Tables, createH1Research } = require(path.join(root, 'h1-research/service.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const { ensureAllocationColumns } = require(path.join(root, 'fillout/allocation.js'));
const AS = require(path.join(root, 'fillout/additional-services.js'));
const S = require(path.join(root, 'tools/seed-edens-edge.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: page map v3 (services rules, town service pages, link planner) ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vol = m => new Map(Object.entries(m).map(([k, v]) => [k, { volume: v[0], cpc: v[1] }]));

// A small niche: two categories, services on both, approved synonyms
const cats = [
  { key: 'tree_service', name: 'Tree Service', rows: [
    { id: 'tree stump grinding', name: 'Tree stump grinding', kind: 'unique' }, { id: 'tree removal', name: 'Tree removal', kind: 'unique' }, { id: 'hedge trimming', name: 'Hedge trimming', kind: 'duplicate' },
    { id: 'tree planting', name: 'Tree planting', kind: 'unique' }, { id: 'crown reduction', name: 'Crown reduction', kind: 'unique' }, { id: 'pollarding', name: 'Pollarding', kind: 'unique' },
    { id: 'tree surgery', name: 'Tree surgery', kind: 'unique' }, { id: 'stump grinding & removal', name: 'Stump grinding & removal', kind: 'unique' }, { id: 'tree services', name: 'Tree services', kind: 'unique' } ] },
  { key: 'gardener', name: 'Gardener', rows: [
    { id: 'hedge trimming', name: 'Hedge trimming', kind: 'duplicate' }, { id: 'hedge trimming services', name: 'Hedge trimming services', kind: 'unique' }, { id: 'garden maintenance', name: 'Garden maintenance', kind: 'unique' },
    { id: 'lawn mowing', name: 'Lawn mowing', kind: 'unique' }, { id: 'removal and stump grinding', name: 'Removal and stump grinding', kind: 'unique' } ] },
];
cats[1].primary = true;
const resolved = { categories: cats, primary: 'gardener', primaryName: 'Gardener', crossRef: [], flags: [] };
const terms = { tree_service: ['tree surgeon'], gardener: ['garden maintenance'], _sitewide: [] };
const input = { resolved, baseTown: 'Southampton', otherTowns: 'Romsey\nWinchester', companyName: 'Acme Trees', terms, waiting: [] };
const table = {
  'tree service southampton': [20, 3], 'tree surgeon southampton': [320, 4], 'gardener southampton': [210, 3], 'garden maintenance southampton': [50, 3.6],
  'tree stump grinding southampton': [40, 2], 'tree removal southampton': [20, 1.5], 'hedge trimming southampton': [30, 6], 'tree planting southampton': [10, null],
  'tree stump grinding winchester': [20, 1], 'tree planting winchester': [20, 1.2], 'tree removal romsey': [20, 1], 'stump grinding and removal southampton': [25, 1], 'tree surgery southampton': [320, 4], 'gardener romsey': [50, 1.8], 'gardener winchester': [140, 2.4],
  'tree surgeon winchester': [140, 3.9], 'tree surgeon romsey': [50, 3.7],
};
// Every town launches in phase 1 here; launch phases have their own fixture (launch-phases.js)
const build = (extra = {}, opts = {}) => G.buildPageMap({ ...input, ...extra }, { volumes: vol({ ...table, ...(opts.table || {}) }), exclude: opts.exclude || new Set(), launchTowns: new Set(['romsey', 'winchester']), saved: opts.saved || [] });
const find = (m, slug) => m.rows.find(r => r.slug === slug);
const svcOf = (m, id) => m.services.find(s => s.id === id);

(async () => {
  const m = build();
  // ── Rule 1: dedupe ──
  chk('Dedupe by plural / "services" / "&" vs "and" / word order: "Stump grinding & removal" and "Removal and stump grinding" are one service; "Hedge trimming services" merges into "Hedge trimming"', svcOf(m, 'removal and stump grinding').outcome === 'merged' && svcOf(m, 'removal and stump grinding').into === 'stump grinding & removal' && svcOf(m, 'hedge trimming services').outcome === 'merged' && svcOf(m, 'hedge trimming services').into === 'hedge trimming', JSON.stringify(m.services.filter(s => s.outcome === 'merged').map(s => [s.name, s.intoName])), '');
  chk('The shorter name is kept and records merged_from; the merged service keeps both parent categories', svcOf(m, 'stump grinding & removal').merged_from.join() === 'Removal and stump grinding' && [...svcOf(m, 'stump grinding & removal').parents].sort().join() === 'gardener,tree_service', JSON.stringify(svcOf(m, 'stump grinding & removal')), '');
  chk('Dedupe keys: plural, "services", "&" as "and", word order and case all collapse', V3.dedupeKey('Garden designs') === V3.dedupeKey('garden design') && V3.dedupeKey('Gardening services') === V3.dedupeKey('Gardening') && V3.dedupeKey('Excavation & grading') === V3.dedupeKey('grading and excavation') && V3.dedupeKey('Tree Removal') === V3.dedupeKey('removal tree'), V3.dedupeKey('Excavation & grading'), '');
  // ── Rule 2: fold ──
  chk('Fold on a category candidate group including synonyms: "Tree surgery" (identical figures to the Tree Service synonym "tree surgeon", so one group) folds into Tree Service; "Garden maintenance" (the Gardener synonym) folds into Gardener', svcOf(m, 'tree surgery').outcome === 'folded' && svcOf(m, 'tree surgery').into === 'tree_service' && /tree surgeon/.test(svcOf(m, 'tree surgery').reason) && svcOf(m, 'garden maintenance').outcome === 'folded' && svcOf(m, 'garden maintenance').into === 'gardener' && /approved synonym/.test(svcOf(m, 'garden maintenance').reason), JSON.stringify([svcOf(m, 'tree surgery'), svcOf(m, 'garden maintenance')].map(s => [s.outcome, s.into, s.reason])), '');
  chk('Fold on the exact category name: "Tree services" folds into Tree Service, which keeps the keyword', svcOf(m, 'tree services').outcome === 'folded' && svcOf(m, 'tree services').into === 'tree_service' && !find(m, '/services/tree-services'), JSON.stringify(svcOf(m, 'tree services')), '');
  const noVol = build({}, { table: { 'tree surgeon southampton': [null, null], 'tree surgery southampton': [null, null] } });
  chk('Grouping by text needs no volume: "tree surgery" vs "tree surgeon" are different words, so without figures Tree surgery does not fold', noVol.services.find(s => s.id === 'tree surgery').outcome !== 'folded', noVol.services.find(s => s.id === 'tree surgery').outcome, '');
  const figs = build({}, { table: { 'tree surgery southampton': [320, 4] } });
  chk('…but identical volume and CPC with the synonym makes them one group, and it folds', figs.services.find(s => s.id === 'tree surgery').outcome === 'folded' && /identical Google Ads figures/.test(figs.services.find(s => s.id === 'tree surgery').reason), figs.services.find(s => s.id === 'tree surgery').reason, '');
  // ── Rule 3: page or mention ──
  chk('Every remaining service is a page by default, volume or not: Tree stump grinding (40), Tree planting (Winchester only), and Crown reduction, Pollarding, Lawn mowing with no volume anywhere', ['tree stump grinding', 'tree planting', 'crown reduction', 'pollarding', 'lawn mowing'].every(id => svcOf(m, id).outcome === 'page') && /by default/.test(svcOf(m, 'pollarding').reason) && /Winchester|winchester/.test(svcOf(m, 'tree planting').reason) && m.serviceCounts.mentioned === 0, JSON.stringify(m.services.map(s => [s.name, s.outcome])), '');
  chk('copy_priority on each service page: its best volume anywhere, else 0 (Tree stump grinding 40, Tree planting 20 from Winchester, Pollarding 0)', find(m, '/services/tree-stump-grinding').info.copy_priority === 40 && find(m, '/services/tree-planting').info.copy_priority === 20 && find(m, '/services/pollarding').info.copy_priority === 0 && svcOf(m, 'hedge trimming').copy_priority === 30, JSON.stringify(m.rows.filter(r => r.type === 'service').map(r => [r.title, r.info.copy_priority])), '');
  const ex = build({}, { exclude: new Set(['pollarding']) });
  chk('Exclude: an excluded service is mentioned on its category page with the reason "excluded at intake", no page, no card', ex.services.find(s => s.id === 'pollarding').outcome === 'mentioned' && ex.services.find(s => s.id === 'pollarding').reason === 'excluded at intake' && !find(ex, '/services/pollarding') && find(ex, '/tree-service').links.mentioned.includes('Pollarding') && !find(ex, '/tree-service').links.cards.some(c => /pollarding/.test(c.to)), JSON.stringify(ex.services.find(s => s.id === 'pollarding')), '');
  chk('Stems in dedupe: landscaping/landscape, fencing/fence, decking/deck, paving/pave, draining/drainage, planting/plant collapse; different words still differ', V3.dedupeKey('Landscape design') === V3.dedupeKey('Landscaping design') && V3.dedupeKey('Fencing') === V3.dedupeKey('Fence') && V3.dedupeKey('Decking repair') === V3.dedupeKey('Deck repairs') && V3.dedupeKey('Block paving') === V3.dedupeKey('Block pave') && V3.dedupeKey('Garden draining') === V3.dedupeKey('Garden drainage') && V3.dedupeKey('Tree planting') === V3.dedupeKey('Tree plants') && V3.dedupeKey('Fence building') !== V3.dedupeKey('Fencing installation'), [V3.dedupeKey('Landscape design'), V3.dedupeKey('Landscaping design')].join(' / '), '');
  const stemmed = V3.dedupe([{ id: 'landscape design', name: 'Landscape design', parents: ['gardener'] }, { id: 'landscaping design', name: 'Landscaping design', parents: ['landscape_gardener'] }, { id: 'fence building', name: 'Fence building', parents: ['deck_builder'] }, { id: 'fencing installation', name: 'Fencing installation', parents: ['gardener'] }]);
  chk('Stem merges: "Landscaping design" merges into "Landscape design" (both categories kept); "Fence building" and "Fencing installation" stay separate', stemmed.find(s => s.id === 'landscaping design').outcome === 'merged' && stemmed.find(s => s.id === 'landscape design').parents.join() === 'gardener,landscape_gardener' && /word forms/.test(stemmed.find(s => s.id === 'landscaping design').reason) && !stemmed.find(s => s.id === 'fence building').outcome && !stemmed.find(s => s.id === 'fencing installation').outcome, JSON.stringify(stemmed.map(s => [s.name, s.outcome])), '');
  chk('Counts: 1 homepage + 2 categories + 8 service pages + 2 towns + 4 location categories + 3 town service pages; of 13 names 2 merged, 3 folded, 0 mentioned', m.counts.service === 8 && m.counts.location === 2 && m.counts.location_category === 4 && m.counts.town_service === 3 && m.serviceCounts.names === 13 && m.serviceCounts.merged === 2 && m.serviceCounts.folded === 3 && m.serviceCounts.mentioned === 0, JSON.stringify([m.counts, m.serviceCounts]), '');

  // ── Town service pages ──
  const tsp = m.rows.filter(r => r.type === 'town_service');
  chk('Town service pages only where "<service> <town>" has volume: Tree Stump Grinding Winchester (20), Tree Planting Winchester (20), Tree Removal Romsey (20); nothing on pattern', tsp.map(r => r.slug).sort().join() === '/locations/romsey/tree-removal,/locations/winchester/tree-planting,/locations/winchester/tree-stump-grinding' && m.townServicePages.count === 3 && JSON.stringify(m.townServicePages.towns) === JSON.stringify({ Romsey: 1, Winchester: 2 }), JSON.stringify(tsp.map(r => r.slug)), '');
  chk('Cross-town keywords never group on figures alone: "tree removal romsey" and "tree stump grinding winchester", both 20/1.00, each keep their town service page', !!find(m, '/locations/romsey/tree-removal') && !!find(m, '/locations/winchester/tree-stump-grinding'), JSON.stringify(tsp.map(r => r.slug)), '');
  chk('Town service pages stay volume-gated: none for a town without volume (Hedge trimming anywhere, Tree stump grinding Romsey, Pollarding anywhere though it is a base page), none for a folded service', !find(m, '/locations/romsey/tree-stump-grinding') && !find(m, '/locations/romsey/hedge-trimming') && !find(m, '/locations/winchester/hedge-trimming') && !find(m, '/locations/romsey/pollarding') && !find(m, '/locations/winchester/pollarding') && !find(m, '/locations/romsey/tree-surgery') && m.rows.filter(r => r.type === 'town_service').length === 3, '', '');
  const owned = build({}, { table: { 'tree service romsey': [20, 1], 'tree surgeon romsey': [null, null] } });
  chk('A town service page never exists on pattern alone: when its keyword is owned by a page above it (identical figures make "tree removal romsey" one group with the Tree Service Romsey page\'s own keyword, which wins on page type), it is not created and the reason is kept', !find(owned, '/locations/romsey/tree-removal') && owned.droppedTownPages.some(d => d.slug === '/locations/romsey/tree-removal' && /Tree Service Romsey/.test(d.why)) && find(owned, '/locations/romsey/tree-service') && owned.decisions.get('location_category:/locations/romsey/tree-service').source === 'research', JSON.stringify(owned.droppedTownPages), '');
  const ts = find(m, '/locations/winchester/tree-planting');
  const decision = m.decisions.get(ts.page_key);
  chk('A town service page\'s H1 is its keyword by research (Tree Planting Winchester, 20), and the page ranks last in ownership', decision.source === 'research' && decision.h1 === 'Tree Planting Winchester' && decision.volume === 20 && C.TYPE_ORDER.town_service === 5, JSON.stringify([decision.source, decision.h1, decision.volume]), '');

  // ── The link planner, all six types ──
  const home = find(m, '/');
  chk('Homepage → every category page (cards) and every location page (areas); nothing else', home.links.cards.map(x => x.to).join() === '/tree-service,/gardener' && home.links.areas.map(x => x.to).join() === '/locations/romsey,/locations/winchester' && home.links_to.length === 4, JSON.stringify(home.links_to), '');
  const cat = find(m, '/tree-service');
  chk('Category → its base service pages (cards), every location category page for it (areas), breadcrumb Home; mentioned and folded services listed as text with no link', cat.links.cards.map(x => x.to).join() === '/services/tree-stump-grinding,/services/tree-removal,/services/hedge-trimming,/services/tree-planting,/services/crown-reduction,/services/pollarding,/services/stump-grinding-removal' && cat.links.areas.map(x => x.to).join() === '/locations/romsey/tree-service,/locations/winchester/tree-service' && cat.links.breadcrumb.map(x => x.to).join() === '/' && cat.links.mentioned.join() === 'Tree surgery,Tree services' && !cat.links_to.some(l => /tree-surgery|tree-services/.test(l)), JSON.stringify(cat.links), '');
  const svc = find(m, '/services/tree-planting');
  chk('Service page (base) → its category page (breadcrumb); areas block: the town service page where one exists (Winchester), else that town\'s location category page (Romsey); sibling base service pages (More services)', svc.links.breadcrumb.map(x => x.to).join() === '/,/tree-service' && svc.links.areas.map(x => `${x.anchor}→${x.to}`).join() === 'Romsey→/locations/romsey/tree-service,Winchester→/locations/winchester/tree-planting' && svc.links.more.map(x => x.to).sort().join() === '/services/crown-reduction,/services/hedge-trimming,/services/pollarding,/services/stump-grinding-removal,/services/tree-removal,/services/tree-stump-grinding', JSON.stringify(svc.links), '');
  const two = find(m, '/services/hedge-trimming');
  chk('A service on two tabs: first tab as breadcrumb, the other as "also under" (both category pages link to it); More services spans both categories', two.links.breadcrumb.map(x => x.to).join() === '/,/tree-service' && two.links.parents.map(x => x.to).join() === '/gardener' && find(m, '/gardener').links.cards.some(x => x.to === '/services/hedge-trimming') && two.links.more.some(x => x.to === '/services/stump-grinding-removal'), JSON.stringify(two.links), '');
  const loc = find(m, '/locations/romsey');
  chk('Location page → its location category pages (cards), homepage (breadcrumb), sibling location pages (areas)', loc.links.cards.map(x => x.to).join() === '/locations/romsey/tree-service,/locations/romsey/gardener' && loc.links.breadcrumb.map(x => x.to).join() === '/' && loc.links.areas.map(x => x.to).join() === '/locations/winchester', JSON.stringify(loc.links), '');
  const lcW = find(m, '/locations/winchester/tree-service'), lcR = find(m, '/locations/romsey/tree-service');
  chk('Location category page → its location page and base category page (breadcrumb); cards to the town service page where one exists for that town, else the base service page; sibling location category pages in the same town; mentioned as text', lcW.links.breadcrumb.map(x => x.to).join() === '/,/locations/winchester,/tree-service' && lcW.links.cards.map(x => x.to).join() === '/locations/winchester/tree-stump-grinding,/services/tree-removal,/services/hedge-trimming,/locations/winchester/tree-planting,/services/crown-reduction,/services/pollarding,/services/stump-grinding-removal' && lcW.links.more.map(x => x.to).join() === '/locations/winchester/gardener' && lcW.links.mentioned.join() === cat.links.mentioned.join() && lcR.links.cards.map(x => x.to).join() === '/services/tree-stump-grinding,/locations/romsey/tree-removal,/services/hedge-trimming,/services/tree-planting,/services/crown-reduction,/services/pollarding,/services/stump-grinding-removal', JSON.stringify([lcW.links.cards, lcR.links.cards]), '');
  chk('Town service page → its location category page and location page (breadcrumb); its base service page (body); siblings: town service pages in the same town where they exist, else the base pages; nothing in any other town; areas block unlinked', ts.links.breadcrumb.map(x => x.to).join() === '/,/locations/winchester,/locations/winchester/tree-service' && ts.links.body.map(x => x.to).join() === '/services/tree-planting' && ts.links.more.map(x => x.to).join() === '/locations/winchester/tree-stump-grinding,/services/tree-removal,/services/hedge-trimming,/services/crown-reduction,/services/pollarding,/services/stump-grinding-removal' && ts.links.areas.length === 0 && !ts.links_to.some(l => /romsey/.test(l)), JSON.stringify(ts.links), '');
  // Anchors and cards
  const townLevel = m.rows.filter(r => ['location', 'location_category', 'town_service'].includes(r.type));
  const h1s = new Set(['Tree Stump Grinding Southampton', 'Tree Planting Winchester', 'Tree Surgeon Southampton']);
  const anchors = townLevel.flatMap(r => Object.values(r.links).filter(Array.isArray).flat().filter(x => x && x.anchor).map(x => x.anchor));
  chk('Anchor text on every town-level page is the plain service or category name, never a destination H1', anchors.length > 0 && anchors.every(a => !h1s.has(a) && !/ (Southampton|Winchester|Romsey)$/.test(a) && !/^Home$/.test(a) || a === 'Home'), JSON.stringify(anchors.filter(a => / (Southampton|Winchester|Romsey)$/.test(a))), '[]');
  const slugs = new Set(m.rows.map(r => r.slug));
  chk('A card is never unlinked: every card, areas, more, body and breadcrumb target is a page in the plan', m.rows.every(r => ['cards', 'areas', 'more', 'body', 'parents', 'breadcrumb'].every(k => r.links[k].every(x => slugs.has(x.to)))), '', '');
  chk('links_to is the union of the sections and links_from its inverse', m.rows.every(r => r.links_to.every(t => find(m, t).links_from.includes(r.slug))) && home.links_from.includes('/tree-service') && find(m, '/services/tree-planting').links_from.includes('/locations/winchester/tree-planting'), '', '');

  // ── Export ──
  const csv = G.toCsv(m.rows);
  const head = csv.split('\r\n')[0];
  const lineOf = slug => csv.split('\r\n').find(l => l.includes(`,${slug},`)) || '';
  chk('The export carries, per page: breadcrumb, cards, areas block, more services, body links and the mentioned list', /,Breadcrumb,Cards,Areas Block,More Services,Body Links,Mentioned Services,Launch Phase,WordPress Status$/.test(head) && /Tree surgery/.test(lineOf('/tree-service')) && /Winchester → \/locations\/winchester\/tree-planting/.test(lineOf('/services/tree-planting')) && /\/services\/tree-planting/.test(lineOf('/locations/winchester/tree-planting')), lineOf('/services/tree-planting').slice(0, 200), '');
  chk('Town Service is a page type in the export and the old parser still reads the file', /^Town Service,Tree planting Winchester,/m.test(csv) && require(path.join(root, 'client-files.js')).parsePageMap(csv).length > 0, '', '');

  // ── The job with a stubbed API: service x town batched and cached ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, page_type TEXT NOT NULL, page_title TEXT NOT NULL, url_slug TEXT, h1 TEXT, copy_output TEXT);`);
  await ensureFilloutTables(pool); await ensureAudioBlobTable(pool); await ensurePriceTables(pool); await ensureAllocationColumns(pool); await AS.ensureAdditionalTables(pool); await ensurePageMapTables(pool); await ensureH1Tables(pool);
  const svcF = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: quiet });
  const FAKE = { DATAFORSEO_LOGIN: 'login-SECRET', DATAFORSEO_PASSWORD: 'pw-SECRET' };
  const live = { 'gardener southampton': [210, 3.12], 'hedge trimming southampton': [30, 6.49], 'tree stump removal romsey': [20, null], 'lawn care southampton': [30, 2.31], 'lawn care winchester': [20, 3.42] };
  const calls = [];
  const okReply = (keywords) => ({ ok: true, status: 200, json: async () => ({ status_code: 20000, cost: 0.09, tasks: [{ status_code: 20000, cost: 0.09, result: keywords.map(k => (k in live ? { keyword: k, search_volume: live[k][0], cpc: live[k][1] } : { keyword: k, search_volume: null, cpc: null })) }] }) });
  const searchVolume = async (kws, opts) => D.searchVolume(kws, { env: FAKE, fetchImpl: async (u, o) => { const b = JSON.parse(o.body)[0].keywords; calls.push(b.length); return okReply(b); } });
  let cacheLookup = async () => new Map();
  const store = createPageMapStore({ pool, filloutService: svcF, volumesFor: kws => cacheLookup(kws) });
  const h1 = createH1Research({ pool, filloutService: svcF, pageMapStore: store, searchVolume, log: quiet });
  cacheLookup = kws => h1.cached(kws);
  await pool.query(`INSERT INTO clients (name, trade) VALUES ('ednes edge testing', 'Landscaper')`);
  await S.seed(pool, { write: true, log() {} });
  const cid = (await pool.query(`SELECT id FROM clients WHERE name = 'ednes edge testing'`)).rows[0].id;
  for (const t of S.OTHER_TOWNS) await store.setLaunchTown(cid, t, true); // every town live here; phases have their own fixture
  const waitFor = async (id) => { for (let i = 0; i < 4000; i++) { const j = await h1.job(id); if (!['queued', 'building', 'researching'].includes(j.status)) return j; await sleep(15); } throw new Error('job never finished'); };
  const inputs = await require(path.join(root, 'page-map/store.js')).inputsFor(svcF, cid);
  const wanted = G.keywordsFor(inputs);
  const nTowns = G.cleanTowns(inputs.baseTown, inputs.otherTowns).towns.length;
  chk('The keyword universe covers every service in every town, both candidates ("<service> <town>", "<service> services <town>"), plus the pages\' own candidates', wanted.includes('tree stump removal romsey') && wanted.includes('tree stump removal services romsey') && wanted.includes('gardener kings worthy') && wanted.length > 25 * nTowns * 2, wanted.length, '');
  let job = await waitFor((await h1.start(cid, { kind: 'generate' })).id);
  const first = calls.slice();
  chk('Service x town research is batched into the fewest calls (1,000 keywords a call): one look-up before the pages are built, every call full but the last', job.status === 'complete' && first.length === Math.ceil(wanted.length / 1000) && first.slice(0, -1).every(n => n === 1000) && first.reduce((a, b) => a + b, 0) === wanted.length && job.keywords_fetched === wanted.length && job.cost === first.length * 0.09, JSON.stringify([first, wanted.length, job.keywords_fetched, job.cost]), '');
  let rows = await store.saved(cid);
  const byKey = k => rows.find(r => r.page_key === k);
  chk('With the landscaper library: 31 service pages (UK names); Tree Stump Removal Romsey and Lawn Care Winchester are the only town service pages, with their keywords as H1', rows.filter(r => r.type === 'service' && r.applies).length === 31 && rows.filter(r => r.type === 'town_service' && r.applies).length === 2 && byKey('town_service:/locations/romsey/tree-stump-removal').h1 === 'Tree Stump Removal Romsey' && byKey('town_service:/locations/winchester/lawn-care').h1 === 'Lawn Care Winchester' && rows.filter(r => r.type === 'town_service').every(r => r.h1_source === 'research'), JSON.stringify(rows.filter(r => r.type === 'town_service').map(r => [r.title, r.h1, r.h1_source])), '');
  chk('Tree stump removal: pattern H1 in Southampton (no volume there) and copy_priority 20 from Romsey; Hedge trimming priority 30; Mulching priority 0', byKey('service:/services/tree-stump-removal').h1 === 'Tree Stump Removal Southampton' && byKey('service:/services/tree-stump-removal').h1_source === 'pattern' && byKey('service:/services/tree-stump-removal').info.copy_priority === 20 && byKey('service:/services/hedge-trimming').info.copy_priority === 30 && byKey('service:/services/mulching').info.copy_priority === 0, JSON.stringify([byKey('service:/services/tree-stump-removal').info, byKey('service:/services/mulching').info.copy_priority]), '');
  const st = await store.state(cid);
  chk('The services outcomes and the library resolution are saved on the state for the Services step, with reasons and town volumes', st.services.length === 54 && st.library.records.length === 78 && st.library.file === 'landscaper.csv' && st.library.records.find(r => r.gbp_name === 'Tree stump grinding').outcome === 'absorbed' && st.services.find(s => s.id === 'tree stump removal').outcome === 'page' && st.services.find(s => s.id === 'tree stump removal').townVolumes.some(t => t.town === 'Romsey' && t.volume === 20) && st.services.find(s => s.id === 'mulching').copy_priority === 0 && st.counts.services.page === 31 && st.counts.services.mentioned === 0, JSON.stringify(st.counts), '');
  // Cached: a second job fetches nothing
  job = await waitFor((await h1.start(cid, { kind: 'generate' })).id);
  chk('Cached keywords are not re-fetched: regenerating makes no DataForSEO call', job.status === 'complete' && calls.length === first.length && job.keywords_fetched === 0 && job.cost === 0, JSON.stringify([calls.length, first.length, job.keywords_fetched]), '');
  // Exclude through the store, then regenerate: the page is retired and the service mentioned
  await store.setExclude(cid, 'pollarding', true); // not a service here: harmless
  await store.setExclude(cid, 'mulching', true);
  job = await waitFor((await h1.start(cid, { kind: 'generate' })).id);
  rows = await store.saved(cid);
  const stEx = await store.state(cid);
  chk('Excluding a service at intake retires its page at the next generation with the reason, and the outcome says "excluded at intake"; it is listed as text on its category page', byKey('service:/services/mulching') && !byKey('service:/services/mulching').applies && /excluded at intake/.test(byKey('service:/services/mulching').retired_reason) && stEx.services.find(s => s.id === 'mulching').outcome === 'mentioned' && stEx.services.find(s => s.id === 'mulching').reason === 'excluded at intake' && byKey('category:/gardener').info.links.mentioned.includes('Mulching') && !byKey('category:/gardener').links_to.includes('/services/mulching'), JSON.stringify([byKey('service:/services/mulching').retired_reason, stEx.services.find(s => s.id === 'mulching')]), '');
  await store.setExclude(cid, 'mulching', false);
  job = await waitFor((await h1.start(cid, { kind: 'generate' })).id);
  rows = await store.saved(cid);
  chk('Un-excluding brings the same page back (revived, not recreated), a page by default again', byKey('service:/services/mulching').applies && byKey('service:/services/mulching').h1 === 'Mulching Southampton' && (await store.state(cid)).services.find(s => s.id === 'mulching').outcome === 'page' && rows.filter(r => r.page_key === 'service:/services/mulching').length === 1, JSON.stringify(byKey('service:/services/mulching')), '');
  chk('Town service pages never exist on pattern alone through the job either: every town service row is by research', rows.filter(r => r.type === 'town_service' && r.applies).every(r => r.h1_source === 'research' && r.h1_volume > 10), JSON.stringify(rows.filter(r => r.type === 'town_service').map(r => [r.title, r.h1_source])), '');
  const csv2 = await store.csv(cid);
  chk('The stored export carries the sections: the Tree stump removal base page\'s areas block sends Romsey to the town page and the other towns to the location category pages', /Romsey → \/locations\/romsey\/tree-stump-removal/.test(csv2) && /Winchester → \/locations\/winchester\/tree-service/.test(csv2), '', '');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
