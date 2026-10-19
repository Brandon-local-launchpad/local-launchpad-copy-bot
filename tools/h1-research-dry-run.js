'use strict';
// H1 research dry run (h1-research/claims.js, v2) for one client. Reads the page map, the client's
// resolved categories and the keyword cache (SELECT only); fetches only uncached keywords, in at
// most ONE DataForSEO call, and does NOT store them. Writes nothing to the database. Prints the
// summary and writes the full table to docs/h1-research/<client>-v2-dry-run.md.
//
//   node tools/h1-research-dry-run.js "<client name>"|<client id>
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

const LABEL = { homepage: 'Homepage', category: 'Category', service: 'Service', location: 'Location', location_category: 'Location Category' };

async function dryRun(pool, who, { searchVolume = D.searchVolume } = {}) {
  const svc = createFilloutService({ pool, audioStore: { put() { throw new Error('not used'); }, get() { return null; } }, log: { log() {}, info() {}, warn() {}, error() {} } });
  const store = createPageMapStore({ pool, filloutService: svc });
  const { rows: cs } = await pool.query(`SELECT id, name FROM clients`);
  const hits = cs.filter(c => c.id === who || String(c.name).trim().toLowerCase() === String(who).trim().toLowerCase());
  if (hits.length !== 1) throw new Error(`Expected one client matching "${who}", found ${hits.length}`);
  const client = hits[0];
  const rows = (await store.saved(client.id)).filter(r => r.applies);
  const st = await store.state(client.id);
  const inputs = await inputsFor(svc, client.id, { categoryTabRule: (st && st.category_tab_rule) || 'ticked_only' });
  const cats = inputs.resolved ? inputs.resolved.categories : [];
  const ctx = { primaryName: inputs.resolved && inputs.resolved.primaryName, primaryKey: inputs.resolved && inputs.resolved.primary, baseTown: inputs.baseTown, categoryName: k => (cats.find(c => c.key === k) || {}).name, terms: H.searchTerms(inputs.niche) };
  const keywords = [...new Set(rows.flatMap(r => C.candidatesV2(r, ctx).map(c => c.keyword)))];

  // The cache (fresh within 90 days), then one call for the rest; nothing stored
  const { rows: cached } = await pool.query(`SELECT keyword, volume, cpc, status, fetched_at FROM keyword_volumes WHERE location_code = $1`, [D.UK.location_code]);
  const fresh = Date.now() - CACHE_DAYS * 86400000;
  const volumes = new Map();
  for (const r of cached) if (r.status !== 'error' && new Date(r.fetched_at).getTime() >= fresh) volumes.set(r.keyword, { volume: r.volume == null ? null : Number(r.volume), cpc: r.cpc == null ? null : Number(r.cpc) });
  const want = new Set(keywords);
  for (const k of [...volumes.keys()]) if (!want.has(k)) volumes.delete(k);
  const missing = keywords.filter(k => !volumes.has(k));
  if (missing.length > D.CHUNK) throw new Error(`${missing.length} uncached keywords would need more than one call`);
  let cost = 0, calls = 0;
  if (missing.length) {
    const r = await searchVolume(missing);
    cost = r.cost; calls = r.calls;
    for (const k of missing) volumes.set(k, r.results.get(k) || { volume: null, cpc: null });
  }
  const out = C.resolve(rows, ctx, volumes);
  return { client, rows, ctx, keywords, cachedCount: keywords.length - missing.length, missing: missing.length, cost, calls, volumes, ...out };
}

function report(r) {
  const L = [];
  const d = r.decisions;
  L.push(`# H1 research v2 dry run: ${r.client.name} (${new Date().toISOString().slice(0, 10)})`, '');
  L.push(`${d.length} pages · ${r.keywords.length} keywords: ${r.cachedCount} from the cache, ${r.missing} fetched in ${r.calls} call(s) · cost $${r.cost} · nothing written`, '');
  L.push('| Page type | Page name | Final H1 | Volume | Source | Reason / lost to |', '|---|---|---|---|---|---|');
  for (const x of d) L.push(`| ${LABEL[x.row.type]} | ${x.row.title} | ${x.h1 || '—'} | ${x.volume == null ? '—' : x.volume} | ${x.source} | ${String(x.reason).replace(/\|/g, '/')}${x.suggests ? ` · research now suggests ${x.suggests}` : ''} |`);
  L.push('', '## Counts', '| Page type | research | pattern | conflict | manual / locked |', '|---|---|---|---|---|');
  for (const t of Object.keys(LABEL)) {
    const s = d.filter(x => x.row.type === t);
    if (s.length) L.push(`| ${LABEL[t]} (${s.length}) | ${s.filter(x => x.source === 'research').length} | ${s.filter(x => x.source === 'pattern').length} | ${s.filter(x => x.source === 'conflict').length} | ${s.filter(x => x.source === 'manual' || x.source === 'locked').length} |`);
  }
  L.push(`| **All (${d.length})** | **${d.filter(x => x.source === 'research').length}** | **${d.filter(x => x.source === 'pattern').length}** | **${d.filter(x => x.source === 'conflict').length}** | **${d.filter(x => x.source === 'manual' || x.source === 'locked').length}** |`);
  // (a) homepages not built from the primary category name
  const prim = H.keywordOf(r.ctx.primaryName || '');
  L.push('', '## (a) Homepage H1 not built from the primary category name');
  for (const x of d.filter(x => x.row.type === 'homepage')) L.push(H.keywordOf(x.h1).startsWith(prim + ' ') ? `- none: "${x.h1}"` : `- "${x.h1}" (${x.source}), not from "${r.ctx.primaryName}"`);
  // (b) pairs the exact-text check missed but the grouping caught
  L.push('', '## (b) Pages kept apart by the new grouping (different words, same group)');
  const pairs = [];
  for (const x of d) for (const l of x.lostTo || []) {
    const taker = d.find(y => C.pageLabel(y.row) === l.by);
    if (taker && taker.keyword && H.keywordOf(taker.keyword) !== H.keywordOf(l.keyword)) pairs.push(`- ${C.pageLabel(x.row)} wanted "${l.keyword}" (${l.volume}/mo); ${l.by} has "${taker.keyword}": ${l.why}`);
  }
  for (const x of d.filter(x => x.source === 'conflict' && x.claimedBy)) {
    const taker = d.find(y => C.pageLabel(y.row) === x.claimedBy);
    if (taker && taker.keyword && H.keywordOf(taker.keyword) !== H.keywordOf(x.keyword)) pairs.push(`- ${C.pageLabel(x.row)}'s pattern "${x.keyword}" vs ${x.claimedBy}'s "${taker.keyword}": ${r.why(x.keyword, taker.keyword)}`);
  }
  L.push(...(pairs.length ? pairs : ['- none']));
  return { text: L.join('\n') + '\n', pairs };
}

module.exports = { dryRun, report };

if (require.main === module) {
  (async () => {
    const who = process.argv[2];
    if (!who) { console.log('Usage: node tools/h1-research-dry-run.js "<client name>"|<client id>'); process.exitCode = 2; return; }
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
      const r = await dryRun(pool, who);
      const { text } = report(r);
      const dir = path.join(root, 'docs/h1-research');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${r.client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-v2-dry-run.md`);
      fs.writeFileSync(file, text);
      console.log(text.split('\n').slice(0, 3).join('\n'));
      console.log(`(full table: ${path.relative(root, file)})`);
    } catch (e) { console.log(`Dry run failed: ${e.status ? `status ${e.status}, ` : ''}${e.message}`); process.exitCode = 1; }
    finally { await pool.end(); }
  })();
}
