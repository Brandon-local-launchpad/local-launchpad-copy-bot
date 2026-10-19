'use strict';
// Page map v3 dry run (page-map/plan-v3.js) for one client: the services list rules, town
// service pages, the ownership rules and the link planner, on the keyword cache plus at most
// ONE DataForSEO call for the "<service> <town>" keywords. Reads only (SELECT); stores nothing,
// not even the volumes it fetches. Prints the report and writes the full tables to
// docs/h1-research/<client>-page-map-v3-dry-run.md.
//
//   node tools/page-map-v3-dry-run.js "<client name>"|<client id>
//
// Needs DATABASE_URL, DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env or the environment.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
try { fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }); } catch (_) {}

const H = require(path.join(root, 'h1-research/research.js'));
const C = require(path.join(root, 'h1-research/claims.js'));
const D = require(path.join(root, 'h1-research/dataforseo.js'));
const { CACHE_DAYS } = require(path.join(root, 'h1-research/service.js'));
const { createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { createPageMapStore, inputsFor } = require(path.join(root, 'page-map/store.js'));
const V3 = require(path.join(root, 'page-map/plan-v3.js'));
const { keywordOf } = H;

async function dryRun(pool, who, { searchVolume = D.searchVolume, core = new Set() } = {}) {
  const svc = createFilloutService({ pool, audioStore: { put() { throw new Error('not used'); }, get() { return null; } }, log: { log() {}, info() {}, warn() {}, error() {} } });
  const store = createPageMapStore({ pool, filloutService: svc });
  const { rows: cs } = await pool.query(`SELECT id, name FROM clients`);
  const hits = cs.filter(c => c.id === who || String(c.name).trim().toLowerCase() === String(who).trim().toLowerCase());
  if (hits.length !== 1) throw new Error(`Expected one client matching "${who}", found ${hits.length}`);
  const client = hits[0];
  const saved = await store.saved(client.id);
  const st = await store.state(client.id);
  const input = await inputsFor(svc, client.id, { categoryTabRule: (st && st.category_tab_rule) || 'ticked_only' });
  if (!input.resolved || !input.resolved.categories.length) throw new Error('No category tabs for this client');
  const cats = input.resolved.categories.map(c => ({ key: c.key, name: c.name }));
  const ctx = { primaryName: input.resolved.primaryName, primaryKey: input.resolved.primary, baseTown: input.baseTown, categoryName: k => (cats.find(c => c.key === k) || {}).name, terms: H.searchTerms(input.niche) };
  const towns = require(path.join(root, 'page-map/generator.js')).cleanTowns(input.baseTown, input.otherTowns).towns;

  // The cache, fresh within 90 days
  const { rows: cached } = await pool.query(`SELECT keyword, volume, cpc, status, fetched_at FROM keyword_volumes WHERE location_code = $1`, [D.UK.location_code]);
  const fresh = Date.now() - CACHE_DAYS * 86400000;
  const volumes = new Map();
  for (const r of cached) if (r.status !== 'error' && new Date(r.fetched_at).getTime() >= fresh) volumes.set(r.keyword, { volume: r.volume == null ? null : Number(r.volume), cpc: r.cpc == null ? null : Number(r.cpc) });
  const vol = k => volumes.get(k) || { volume: null, cpc: null };

  // Rule 1, then rule 2 on the base-town keywords (cached), then ONE call for "<service> <town>"
  let services = V3.dedupe(V3.collectServices(input.resolved));
  const baseKeywords = V3.keywordsFor(services, cats, [], ctx);
  services = V3.fold(services, cats, ctx, C.buildGroups(baseKeywords, volumes));
  const townKeywords = V3.keywordsFor(services, cats, towns, ctx, { townVariants: false }).filter(k => !baseKeywords.includes(k));
  const allKeywords = [...new Set([...baseKeywords, ...townKeywords])];
  const missing = allKeywords.filter(k => !volumes.has(k));
  const fetchList = missing.slice(0, D.CHUNK);
  const unfetched = missing.slice(D.CHUNK);
  let cost = 0, calls = 0;
  if (fetchList.length) {
    const r = await searchVolume(fetchList);
    cost = r.cost; calls = r.calls;
    for (const k of fetchList) volumes.set(k, r.results.get(k) || { volume: null, cpc: null });
  }
  // Rule 3, the pages, the H1 rules (town service pages only where they WIN their keyword), the links
  services = V3.pageOrMention(services, towns, ctx, vol, core);
  const built = V3.buildRows(input, services, vol);
  const savedBy = new Map(saved.map(r => [r.page_key, r]));
  for (const r of built.rows) { const s = savedBy.get(r.page_key); if (s) Object.assign(r, { h1: s.h1 || '', h1_source: s.h1_source, status: s.status, h1_researched_at: s.h1_researched_at }); }
  const out = C.resolve(built.rows, ctx, volumes);
  const dropped = [];
  const decisions = new Map(out.decisions.map(d => [d.row.page_key, d]));
  for (const r of built.rows) {
    const d = decisions.get(r.page_key);
    if (r.type === 'town_service' && d.source !== 'research') { dropped.push({ row: r, why: d.reason }); r.applies = false; continue; }
    if (['research', 'pattern', 'conflict'].includes(d.source)) Object.assign(r, { h1: d.h1, h1_source: d.source, h1_volume: d.volume == null ? null : d.volume, h1_cpc: d.cpc == null ? null : d.cpc, h1_reason: d.reason, h1_hub: d.hub || null });
  }
  const rows = built.rows.filter(r => r.applies);
  V3.planLinks(rows, services);
  return { client, input, ctx, towns, services, rows, dropped, decisions, saved, cats,
    keywords: { total: allKeywords.length, cached: allKeywords.length - missing.length, fetched: fetchList.length, unfetched }, cost, calls, volumes };
}

const LABEL = V3.TYPE_LABEL;
function countBy(rows) { const c = {}; for (const r of rows) c[r.type] = (c[r.type] || 0) + 1; c.total = rows.length; return c; }

function report(r) {
  const L = [];
  const byType = t => r.rows.filter(x => x.type === t);
  L.push(`# Page map v3 dry run: ${r.client.name} (${new Date().toISOString().slice(0, 10)})`, '');
  L.push(`${r.keywords.total} keywords: ${r.keywords.cached} from the cache, ${r.keywords.fetched} fetched in ${r.calls} call(s), cost $${r.cost.toFixed(2)} · nothing written${r.keywords.unfetched.length ? ` · ${r.keywords.unfetched.length} keywords NOT fetched (would need a second call): treated as no data` : ''}`, '');
  // a) services
  L.push('## (a) Services', '', '| Service | Categories | Outcome | Reason |', '|---|---|---|---|');
  const catName = k => (r.cats.find(c => c.key === k) || {}).name || k;
  for (const s of r.services) L.push(`| ${s.name}${s.merged_from && s.merged_from.length ? ` (merged from ${s.merged_from.map(x => `"${x}"`).join(', ')})` : ''} | ${s.parents.map(catName).join(', ')} | ${s.outcome === 'page' ? 'page' : s.outcome === 'merged' ? `merged into ${s.intoName}` : s.outcome === 'folded' ? `folded into ${s.intoName}` : 'mentioned'} | ${String(s.reason || '').replace(/\|/g, '/')} |`);
  const n = o => r.services.filter(s => s.outcome === o).length;
  L.push('', `Pages ${n('page')} · merged ${n('merged')} · folded ${n('folded')} · mentioned ${n('mentioned')} (of ${r.services.length} names)`, '');
  // b) town service pages
  L.push('## (b) Town service pages that would be created', '', '| Town | Service | H1 (keyword) | Volume | CPC |', '|---|---|---|---|---|');
  const ts = byType('town_service');
  for (const x of ts) L.push(`| ${x.info.town} | ${x.info.service_name} | ${x.h1} | ${x.h1_volume} | ${x.h1_cpc == null ? '—' : x.h1_cpc} |`);
  const perTown = {}; for (const x of ts) perTown[x.info.town] = (perTown[x.info.town] || 0) + 1;
  L.push('', `${ts.length} town service page${ts.length === 1 ? '' : 's'}${ts.length ? ` in ${Object.keys(perTown).length} town${Object.keys(perTown).length === 1 ? '' : 's'}: ${Object.entries(perTown).map(([t, k]) => `${t} ${k}`).join(', ')}` : ''}`);
  if (r.dropped.length) { L.push('', 'Usable "<service> <town>" keywords that do NOT become a page (the keyword is owned by a page above them):'); for (const d of r.dropped) L.push(`- ${d.row.title}: ${d.why}`); }
  // c) counts
  const before = countBy(r.saved.filter(x => x.applies)), after = countBy(r.rows);
  L.push('', '## (c) Page count by type', '', '| Page type | Before | After |', '|---|---|---|');
  for (const t of V3.TYPES) L.push(`| ${LABEL[t]} | ${before[t] || 0} | ${after[t] || 0} |`);
  L.push(`| **Total** | **${before.total || 0}** | **${after.total}** |`);
  // d) links for four pages
  L.push('', '## (d) Links out, by section');
  const want = [['category', x => x.h1 === 'Tree Surgeon Southampton' || x.title === 'Tree Service'], ['location_category', x => x.title === 'Tree Service Winchester'], ['location_category', x => x.title === 'Tree Service Romsey'], ['service', x => /^tree planting$/i.test(x.title)]];
  for (const [t, f] of want) {
    const p = byType(t).find(f);
    if (!p) { L.push('', `- (no ${t} page found for this entry)`); continue; }
    L.push('', `### ${p.h1 || p.title} (${LABEL[p.type]}, ${p.slug}) · ${p.links_to.length} links out, ${p.links_from.length} in`);
    for (const sec of ['breadcrumb', 'cards', 'areas', 'more', 'body', 'parents']) {
      const list = p.links[sec];
      if (!list.length) { if (sec === 'areas' && p.type === 'town_service') L.push(`- ${sec}: no links (villages and neighbourhoods, unlinked)`); continue; }
      L.push(`- ${sec} (${list.length}): ${list.map(x => `${x.anchor} → ${x.to}`).join('; ')}`);
    }
    if (p.links.mentioned.length) L.push(`- mentioned, no link (${p.links.mentioned.length}): ${p.links.mentioned.join(', ')}`);
  }
  // e) cost
  L.push('', '## (e) API cost', '', `$${r.cost.toFixed(2)} (${r.calls} call${r.calls === 1 ? '' : 's'}, ${r.keywords.fetched} keywords)`);
  // f) computed notes
  L.push('', '## (f) Notes from the run');
  const notes = [];
  if (r.keywords.unfetched.length) notes.push(`${r.keywords.unfetched.length} "<service> <town>" keywords were not fetched (one call holds ${D.CHUNK}); they count as no data here.`);
  notes.push('The "<service> services <town>" variants were not fetched in this dry run (they only matter as a second H1 candidate on a town service page; page creation is decided by "<service> <town>" alone). The real run fetches them.');
  const conflicts = r.rows.filter(x => x.h1_source === 'conflict');
  if (conflicts.length) notes.push(`${conflicts.length} H1 conflict${conflicts.length === 1 ? '' : 's'}: ${conflicts.map(x => `${LABEL[x.type]} "${x.title}"`).join('; ')}.`);
  const unlinkedCards = r.rows.flatMap(x => x.links.cards.filter(c => !r.rows.some(y => y.slug === c.to)).map(c => `${x.title} → ${c.to}`));
  notes.push(unlinkedCards.length ? `Cards without a page: ${unlinkedCards.join('; ')}` : 'Every card links to a page that exists.');
  for (const x of notes) L.push(`- ${x}`);
  return L.join('\n') + '\n';
}

module.exports = { dryRun, report };

if (require.main === module) {
  (async () => {
    const who = process.argv[2];
    if (!who) { console.log('Usage: node tools/page-map-v3-dry-run.js "<client name>"|<client id>'); process.exitCode = 2; return; }
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
      const r = await dryRun(pool, who);
      const text = report(r);
      const dir = path.join(root, 'docs/h1-research');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${r.client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-page-map-v3-dry-run.md`);
      fs.writeFileSync(file, text);
      console.log(text);
      console.log(`(saved: ${path.relative(root, file)})`);
    } catch (e) { console.log(`Dry run failed: ${e.status ? `status ${e.status}, ` : ''}${e.message}`); console.log(e.stack.split('\n').slice(1, 4).join('\n')); process.exitCode = 1; }
    finally { await pool.end(); }
  })();
}
