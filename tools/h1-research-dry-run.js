'use strict';
// H1 research dry run for one client: reads its saved page map and resolved primary
// category (SELECT only), builds every candidate keyword, makes ONE DataForSEO call, and
// prints the choice per page. Writes nothing to the database or any file; refuses to run
// if the keywords would need more than one call.
//
//   node tools/h1-research-dry-run.js "<client name>"|<client id>
//
// Needs DATABASE_URL, DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env or the environment.

const path = require('path');
const root = path.join(__dirname, '..');
try { require('fs').readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }); } catch (_) {}

const H = require(path.join(root, 'h1-research/research.js'));
const D = require(path.join(root, 'h1-research/dataforseo.js'));
const { createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { createPageMapStore, inputsFor } = require(path.join(root, 'page-map/store.js'));

const TYPE_LABEL = { homepage: 'Homepage', category: 'Category', location: 'Location', location_category: 'Location Category' };

async function dryRun(pool, who, opts = {}) {
  const { searchVolume = D.searchVolume, log = console.log } = opts;
  const svc = createFilloutService({ pool, audioStore: { put() { throw new Error('not used'); }, get() { return null; } }, log: { log() {}, info() {}, warn() {}, error() {} } });
  const store = createPageMapStore({ pool, filloutService: svc });
  const { rows: cs } = await pool.query(`SELECT id, name FROM clients`);
  const hits = cs.filter(c => c.id === who || String(c.name).trim().toLowerCase() === String(who).trim().toLowerCase());
  if (hits.length !== 1) throw new Error(`Expected one client matching "${who}", found ${hits.length}`);
  const client = hits[0];
  const rows = (await store.saved(client.id)).filter(r => r.applies);
  if (!rows.length) throw new Error('This client has no page map yet');
  const st = await store.state(client.id);
  const inputs = await inputsFor(svc, client.id, { categoryTabRule: (st && st.category_tab_rule) || 'ticked_only' });
  const cats = inputs.resolved ? inputs.resolved.categories : [];
  const ctx = { primaryName: inputs.resolved && inputs.resolved.primaryName, primaryKey: inputs.resolved && inputs.resolved.primary, baseTown: inputs.baseTown, categoryName: key => (cats.find(c => c.key === key) || {}).name, terms: opts.terms || H.searchTerms(inputs.niche) };
  const { pages, keywords } = H.plan(rows, ctx);
  if (keywords.length > D.CHUNK) throw new Error(`${keywords.length} keywords would need ${Math.ceil(keywords.length / D.CHUNK)} calls; the dry run makes at most one`);
  log(`${client.name}: ${rows.length} pages in the map, ${pages.length} need an H1 researched (service pages keep "<service> ${inputs.baseTown}"); primary category ${ctx.primaryName}; base town ${inputs.baseTown}; ${keywords.length} unique keywords`);
  const { results, cost, calls } = await searchVolume(keywords);
  const out = H.assign(pages, results, rows);
  return { client, rows, pages: out, keywords, cost, calls, results, ctx };
}

function print(r, log = console.log) {
  const fmt = s => `${s.keyword} (${s.volume == null ? 'null' : s.volume}${s.cpc != null ? `, CPC ${s.cpc}` : ''})`;
  log('\n| Page type | Page name | Candidates (volume, CPC) | Chosen H1 | Reason |');
  log('|---|---|---|---|---|');
  for (const p of r.pages) log(`| ${TYPE_LABEL[p.row.type]} | ${p.row.title} | ${p.sel.scored.map(fmt).join(' · ')} | ${p.sel.usable ? `**${p.sel.display}**` : 'no usable data'} | ${p.sel.reason} |`);
  log('\n| Page type | Pages | Chosen | No usable data | Second candidate won |');
  log('|---|---|---|---|---|');
  for (const t of H.RESEARCHED) {
    const ps = r.pages.filter(p => p.row.type === t);
    if (!ps.length) continue;
    log(`| ${TYPE_LABEL[t]} | ${ps.length} | ${ps.filter(p => p.sel.usable).length} | ${ps.filter(p => !p.sel.usable).length} | ${ps.filter(p => p.sel.beatFirst).length} |`);
  }
  log(`\nKeywords: ${r.keywords.length} unique · API calls: ${r.calls} · cost reported by DataForSEO: $${r.cost} · nothing written`);
}

module.exports = { dryRun, print };

if (require.main === module) {
  (async () => {
    const who = process.argv[2];
    if (!who) { console.log('Usage: node tools/h1-research-dry-run.js "<client name>"|<client id>'); process.exitCode = 2; return; }
    if (!process.env.DATABASE_URL) { console.log('DATABASE_URL is not set'); process.exitCode = 1; return; }
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try { print(await dryRun(pool, who)); }
    catch (e) { console.log(`Dry run failed: ${e.status ? `status ${e.status}, ` : ''}${e.message}`); process.exitCode = 1; }
    finally { await pool.end(); }
  })();
}
