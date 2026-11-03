#!/usr/bin/env node
'use strict';

// ── Citations: a real scan and gap check on a live client ─────────────────────────
//   node tools/citations-run.js --live "<client>" --dry              the list, the estimate, spends nothing
//   node tools/citations-run.js --live "<client>" --scan             Scan directories (DataForSEO + page fetches)
//   node tools/citations-run.js --live "<client>" --gaps             Find gaps (DataForSEO + one cheap model call per 60 domains)
//   node tools/citations-run.js --live "<client>" --scan --gaps --max-usd 2
//
// Runs against the live database (DATABASE_URL in .env) exactly as the app does: the
// directory database is seeded if the live table is empty (DA filled, a few cents), the
// client's rows are written to client_citations, the spend is logged in citation_api_costs.
// The gap check uses the client's saved competitor run (the GBP tab's check); it does not
// call Places. --max-usd (default 2) stops before a scan whose estimate is above it. The
// DataForSEO balance is read before and after, so the report shows the real spend.
// The report goes to tests/quality-runs/citations/<client slug>/<time>.md and to the console.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const args = process.argv.slice(2);
const flag = f => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
const who = val('--live', '');
const maxUsd = Number(val('--max-usd', '2'));
const dry = flag('--dry') || (!flag('--scan') && !flag('--gaps'));
if (!who) { console.error('Usage: node tools/citations-run.js --live "<client>" [--dry | --scan] [--gaps] [--max-usd 2]'); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set in .env'); process.exit(1); }

const D = require(path.join(root, 'h1-research/dataforseo.js'));
const DFS = require(path.join(root, 'citations/dataforseo.js'));
const { ensureCitationTables, createCitationStore } = require(path.join(root, 'citations/store.js'));
const CL = require(path.join(root, 'citations/client.js'));
const { createScanner } = require(path.join(root, 'citations/scan.js'));
const GP = require(path.join(root, 'citations/gaps.js'));
const P = require(path.join(root, 'locations/places.js'));
const A = require(path.join(root, 'locations/approved.js'));
const { createGbpStore } = require(path.join(root, 'gbp/store.js'));
const money = n => `$${Number(n || 0).toFixed(4)}`;

(async () => {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const { rows: cs } = await pool.query(`SELECT id, name FROM clients WHERE id::text = $1 OR lower(name) = lower($1) OR name ILIKE $2 ORDER BY (lower(name) = lower($1)) DESC, name`, [who, `%${who}%`]);
  if (!cs.length) throw new Error(`No live client matches "${who}"`);
  if (cs.length > 1 && cs[0].name.toLowerCase() !== who.toLowerCase()) throw new Error(`"${who}" matches ${cs.length} clients: ${cs.map(r => r.name).join(', ')}`);
  const client = cs[0];
  const L = [];
  const say = s => { console.log(s); L.push(s); };
  say(`CITATIONS RUN: ${client.name} (${client.id}) at ${new Date().toISOString()}${dry ? ' [DRY RUN, spends nothing]' : ''}`);

  await ensureCitationTables(pool);
  const store = createCitationStore(pool, { log: console });
  const seeded = await store.seedDirectories({ fillDa: !dry });
  say(seeded.seeded ? `Directory database seeded: ${seeded.rows} rows (${seeded.inserted} added, ${seeded.updated} updated, ${seeded.kept} hand edited kept)${seeded.da ? `; DA ${JSON.stringify(seeded.da)}` : ''}` : `Directory database: ${seeded.reason} (${seeded.rows} rows)`);
  if (!dry) { const da = await store.fillDa().catch(e => ({ error: e.message })); say(`DA fill for rows without one: ${JSON.stringify(da)}`); }

  const { createFilloutService } = require(path.join(root, 'fillout/service.js'));
  const { createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
  const filloutService = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: { log() {}, info() {}, warn() {}, error() {} } });
  const clientValues = async id => { const r = await pool.query(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [id]); return r.rows.length ? JSON.parse(r.rows[0].content) : {}; };
  const siteUrlFor = async id => { const r = await pool.query(`SELECT url FROM wp_connections WHERE client_id = $1`, [id]).catch(() => ({ rows: [] })); return r.rows.length ? r.rows[0].url : ''; };
  const C = CL.createClientCitations({ pool, store, filloutService, placesStore: P.createPlacesStore(pool), approvedTiers: A.approvedTiers, clientValues, siteUrlFor });

  const view = await C.view(client.id);
  say(`NAP: name "${view.nap.name}", phone "${view.nap.phone}", address ${view.nap.address ? `"${view.nap.address}"` : '(service area business, hidden)'}, website "${view.nap.website || '(none)'}", email "${view.nap.email || '(blank)'}"`);
  say(`Listings email: ${view.email}. Base town ${view.base_town || '(none)'}; territory ${view.territory.approved ? `approved ${view.territory.approved_at}: ${view.territory.towns.join(', ')}` : 'not approved'}; councils ${view.territory.councils.join(', ') || 'none'}; counties ${view.territory.counties.join(', ') || 'none'}`);
  for (const t of view.tiers) say(`  ${t.label}: ${t.count} rows${t.waiting ? ` (${t.waiting})` : ''}: ${t.rows.map(r => r.directory.name).join(', ')}`);
  const rows = view.tiers.flatMap(t => t.rows);
  const withDomain = rows.filter(r => r.directory.domain);
  // Two queued name searches at depth 100 (about $0.006 each), one backlinks call, a page read per listing found
  const est = 2 * 0.006 + 0.02 + withDomain.length * 0.0015;
  say(`Scan estimate: two queued name searches + one backlinks call + a page read for each of up to ${withDomain.length} listings ≈ ${money(est)}. Gap estimate: three profiles, six name searches, four referring domain calls, one classifier call ≈ $0.25.`);

  let before = null;
  try { before = await D.balance(); say(`DataForSEO balance before: ${money(before)}`); } catch (e) { say(`DataForSEO balance: ${e.message}`); }
  if (dry) { await finish(); return; }
  if (flag('--scan') && est > maxUsd) throw new Error(`The scan estimate ${money(est)} is above --max-usd ${maxUsd}`);

  if (flag('--scan')) {
    const scanner = createScanner({ pool, store, clientCitations: C, dfs: DFS, log: console, concurrency: 2 });
    const t0 = Date.now();
    const r = await scanner.run(client.id);
    say(`\nSCAN ${r.status} in ${Math.round((Date.now() - t0) / 1000)}s: ${r.rows_done} of ${r.rows_total} rows, ${r.found} listed, ${r.calls} DataForSEO calls, cost ${money(r.cost_usd)}${r.error ? `, error: ${r.error}` : ''}`);
    const after = await C.view(client.id);
    say('\n| Directory | Tier | Listed | NAP | Status | Confidence | Read by | Found by | URL | Note |');
    say('|---|---|---|---|---|---|---|---|---|---|');
    for (const t of after.tiers) for (const x of t.rows) {
      const s = x.row.scan || {};
      say(`| ${x.directory.name} | ${t.label} | ${x.row.listed} | ${x.row.nap_status}${x.row.nap_diffs.length ? ` (${x.row.nap_diffs.map(d => `${d.field}: ${d.found} vs ${d.expected}`).join('; ')})` : ''} | ${x.row.status} | ${s.confidence || ''} | ${s.method || ''} | ${s.how || ''} | ${x.row.live_url || s.candidate || ''} | ${s.reason || ''} |`);
    }
    say(`Searches: ${(r.summary.queries || []).map(q => `"${q}" (${(r.summary.results || {})[q] ?? '?'} results)`).join(', ')}${r.summary.search_errors.length ? ` · failed: ${r.summary.search_errors.join('; ')}` : ''}`);
    say(`Read by: ${JSON.stringify(r.summary ? r.summary.methods : {})}`);
    if (r.summary.also_listed.length) say(`Also listed on sites not in the database (${r.summary.also_listed.length}): ${r.summary.also_listed.map(x => `${x.site}${x.url ? ` <${x.url}>` : ' (link hidden by Google)'}`).join('; ')}`);
    const S = after.stats;
    say(`\nTiles: core ${S.core.done} of ${S.core.of} (${S.core.pct}%), overall ${S.overall.done} of ${S.overall.of} (${S.overall.pct}%), wrong location ${S.wrong_location}, NAP ${S.nap.mismatch} mismatch / ${S.nap.unchecked} unchecked / ${S.nap.match} match, needs review ${S.needs_review}, waiting on client ${S.waiting_on_client}`);
    for (const b of S.banner) say(`  NAP issue: ${b.text}`);
    if (r.summary && r.summary.errors.length) say(`Errors: ${r.summary.errors.join('; ')}`);
    if (r.summary && r.summary.skipped.length) say(`Skipped: ${r.summary.skipped.map(s => `${s.directory} (${s.reason})`).join('; ')}`);
  }

  if (flag('--gaps')) {
    const gbpStore = createGbpStore(pool);
    const competitorsFor = async id => { const runs = await gbpStore.competitorRuns(id, 1); if (!runs.length) throw new Error('No saved competitor run: run the competitor check on the GBP tab first.'); return runs[0].run; };
    let callModel = null;
    if (process.env.ANTHROPIC_API_KEY) {
      const Anthropic = require('@anthropic-ai/sdk');
      const { makeCallModel } = require(path.join(root, 'anthropic-call.js'));
      callModel = makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), GP.CLASSIFIER_MODEL);
    } else say('No ANTHROPIC_API_KEY: unknown domains will not be classified.');
    const gaps = GP.createGaps({ pool, store, clientCitations: C, competitorsFor, dfs: DFS, callModel, log: console });
    const t0 = Date.now();
    const g = await gaps.run(client.id);
    say(`\nGAPS in ${Math.round((Date.now() - t0) / 1000)}s for "${g.keyword}" (primary category "${g.primary}"): ${g.competitors.length} competitors kept of ${g.checked.length} checked; ${g.searches} name searches, matched against ${g.directories_scanned} directories on the client's list; ${g.gaps.length} gaps; ${g.new_domains.length} new domains (searches and backlinks); DataForSEO ${money(g.cost_usd)}, model ${money(g.model_cost_usd)}, ${g.calls} calls${g.cap_hit ? '; THE SPEND CAP WAS HIT' : ''}`);
    for (const n of g.notes) say(`  note: ${n}`);
    say('\n| Competitor checked | Google category | Additional | Phone | Website | Kept |');
    say('|---|---|---|---|---|---|');
    for (const c of g.checked) say(`| ${c.name} | ${c.category} | ${(c.additional_categories || []).join(', ')} | ${c.phone || ''} | ${c.website || ''} | ${c.kept ? 'yes' : 'no: ' + c.why} |`);
    for (const c of g.competitors) say(`  ${c.name}: listed on ${c.listed.length} of the client's directories${c.listed.length ? ': ' + c.listed.join(', ') : ''}`);
    say('\n| Gap (directory in the database) | Domain | Have it | Who | DA | Cost | Priority | Tier | Found by |');
    say('|---|---|---|---|---|---|---|---|---|');
    for (const x of g.gaps) say(`| ${x.name}${x.on_list === false ? ' (not on the client\'s list)' : ''}${x.retired ? ' (retired)' : ''} | ${x.domain} | ${x.competitors_with} of ${g.competitors.length} | ${x.competitors.join(', ')} | ${x.da == null ? 'unknown' : x.da} | ${x.cost || 'unknown'} | ${x.priority || ''} | ${x.tier || ''} | ${x.source} |`);
    if (g.also_has.length) say(`Both the client and a competitor: ${g.also_has.join(', ')}`);
    say('\n| New domain (backlinks, not in the database) | Have it | DA | Kind |');
    say('|---|---|---|---|');
    for (const x of g.new_domains) say(`| ${x.name} (${x.domain}) | ${x.competitors_with} of ${g.competitors.length} | ${x.da == null ? 'unknown' : x.da} | ${x.kind || ''} |`);
    const byReason = {};
    for (const d of g.dropped) { byReason[d.reason] = byReason[d.reason] || []; byReason[d.reason].push(d.domain); }
    say(`\nDropped (${g.dropped.length}):`);
    for (const [reason, list] of Object.entries(byReason).sort((a, b) => b[1].length - a[1].length)) say(`  ${reason} (${list.length}): ${list.slice(0, 25).join(', ')}${list.length > 25 ? ', …' : ''}`);
  }

  async function finish() {
    try { const after = await D.balance(); say(`DataForSEO balance after: ${money(after)}${before != null ? ` (spent ${money(before - after)})` : ''}`); } catch (_) {}
    const costs = await store.costs({ clientId: client.id, limit: 10 });
    if (costs.length) say(`Cost log (latest first): ${costs.map(c => `${c.kind} ${money(c.cost_usd)} (${c.calls} calls)`).join('; ')}`);
    const slug = require(path.join(root, 'page-map/slugs.js')).slugify(client.name);
    const dir = path.join(root, 'tests/quality-runs/citations', slug);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}${dry ? '-dry' : ''}.md`);
    fs.writeFileSync(file, L.join('\n') + '\n');
    console.log(`\nReport: ${path.relative(root, file)}`);
    await pool.end();
  }
  await finish();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
