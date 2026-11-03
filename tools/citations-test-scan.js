#!/usr/bin/env node
'use strict';

// ── Citations: a test scan of a business that is not a client ─────────────────────
//   node tools/citations-test-scan.js --name "Heatworks Heating Limited" --phone "023 8044 5123" --town Southampton \
//        --website https://heatworksuk.com --address "39 Longmore Ave, Woolston, Southampton SO19 9GA" --niche plumbing-heating
//
// Proves the scanner on a business known to be listed in places: the directory database is
// seeded on pg-mem from data/citations/ (nothing is saved anywhere), the business is a
// one-off client there, and the scan runs with the real DataForSEO (queued name searches,
// OnPage reads). The report shows every row, which listings were read and by which method,
// every site the name searches returned (accepted, rejected and why, not in the database),
// so a miss can be seen. Costs a few cents. --live runs the two searches live instead of queued.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const args = process.argv.slice(2);
const val = (f, d = '') => { const i = args.indexOf(f); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };
const name = val('--name'), phone = val('--phone'), town = val('--town', 'Southampton'), website = val('--website'), address = val('--address'), niche = val('--niche', 'other');
if (!name) { console.error('Usage: node tools/citations-test-scan.js --name "<business>" [--phone ..] [--town ..] [--website ..] [--address ..] [--niche <key>] [--live]'); process.exit(1); }

const { newDb, DataType } = require('pg-mem');
const DFS = require(path.join(root, 'citations/dataforseo.js'));
const D = require(path.join(root, 'h1-research/dataforseo.js'));
const { ensureCitationTables, createCitationStore } = require(path.join(root, 'citations/store.js'));
const CL = require(path.join(root, 'citations/client.js'));
const { createScanner, discover, accept } = require(path.join(root, 'citations/scan.js'));
const { registrableDomain } = require(path.join(root, 'citations/seed.js'));
const money = n => `$${Number(n || 0).toFixed(4)}`;

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, niche_key TEXT, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await ensureCitationTables(pool);
  const store = createCitationStore(pool, { log: { log() {}, info() {}, warn() {}, error() {} }, dfs: { configured: () => false }, env: {} });
  await store.seedDirectories({ fillDa: false });
  const id = (await pool.query(`INSERT INTO clients (name, trade, niche_key) VALUES ($1, 'test', $2) RETURNING id`, [name, niche])).rows[0].id;
  const cv = { company_name: name, phone, address, gbp_address_type: address ? 'storefront' : '', live_domain: website };
  const C = CL.createClientCitations({ pool, store, filloutService: { record: async () => ({ sections: [{ fields: [{ key: 'primary_town', value: town }] }] }) }, clientValues: async () => cv, siteUrlFor: async () => '' });
  const view = await C.view(id);
  console.log(`TEST SCAN (nothing saved): "${name}", ${town}, phone ${phone || '(none)'}, site ${website || '(none)'}, address ${address || '(none)'}; niche ${niche}`);
  console.log(`NAP: ${JSON.stringify(view.nap)}`);
  for (const t of view.tiers) console.log(`  ${t.label}: ${t.count} rows${t.waiting ? ` (${t.waiting})` : ''}`);
  let before = null; try { before = await D.balance(); } catch (_) {}

  // The discovery on its own first, so every result can be shown
  const directories = await store.list({ includeRetired: true });
  const t0 = Date.now();
  const disc = await discover({ nap: view.nap, town, directories, dfs: DFS, opts: { env: process.env, retryDelays: [4000] }, live: args.includes('--live'), depth: 100 });
  console.log(`\nDISCOVERY in ${Math.round((Date.now() - t0) / 1000)}s, ${money(disc.cost)}: ${disc.queries.map(q => `"${q}"`).join(' and ')}${disc.errors.length ? `; errors: ${disc.errors.join('; ')}` : ''}`);
  const byDomain = new Map(directories.filter(d => d.domain).map(d => [d.domain, d]));
  const seen = new Map();
  for (const [q, r] of disc.results) for (const it of r.items || []) {
    const site = it.site || ''; const reg = registrableDomain(site);
    const dir = byDomain.get(reg) || [...byDomain.values()].find(d => site === d.domain || site.endsWith('.' + d.domain));
    const key = `${site}|${it.title}`;
    if (seen.has(key)) continue;
    seen.set(key, { site, dir: dir ? dir.name : '', accepted: dir ? accept({ ...it, site }, view.nap, dir) : null, title: it.title, url: it.goto ? '(link hidden by Google)' : it.url, q });
  }
  const rows = [...seen.values()];
  console.log(`${rows.length} distinct results. In the database: ${rows.filter(r => r.dir).length} (accepted ${rows.filter(r => r.accepted).length}, rejected ${rows.filter(r => r.dir && !r.accepted).length}); not in the database: ${rows.filter(r => !r.dir).length}`);
  console.log('\n| Site | Directory | Accepted | Title | URL |\n|---|---|---|---|---|');
  for (const r of rows.sort((a, b) => (b.dir ? 1 : 0) - (a.dir ? 1 : 0) || a.site.localeCompare(b.site))) console.log(`| ${r.site} | ${r.dir || ''} | ${r.dir ? (r.accepted ? 'yes' : 'no (title or snippet without the name, or not the business\'s own page)') : ''} | ${r.title.slice(0, 70)} | ${r.url} |`);

  // The full scan (the same searches again, then the page reads)
  const scanner = createScanner({ pool, store, clientCitations: C, dfs: DFS, log: console, concurrency: 2 });
  const t1 = Date.now();
  const r = await scanner.run(id);
  const after = await C.view(id);
  console.log(`\nSCAN ${r.status} in ${Math.round((Date.now() - t1) / 1000)}s: ${r.rows_done} of ${r.rows_total} rows, ${r.found} listed, ${r.calls} calls, ${money(r.cost_usd)}${r.error ? `, error ${r.error}` : ''}`);
  console.log('\n| Directory | Tier | Listed | NAP | Confidence | Read by | Found by | URL | Note |\n|---|---|---|---|---|---|---|---|---|');
  for (const t of after.tiers) for (const x of t.rows) { const s = x.row.scan || {}; if (s.how === 'not found' || s.how === 'skipped') continue; console.log(`| ${x.directory.name} | ${t.label} | ${x.row.listed} | ${x.row.nap_status}${x.row.nap_diffs.length ? ` (${x.row.nap_diffs.map(d => `${d.field}: ${d.found} vs ${d.expected}`).join('; ')})` : ''} | ${s.confidence || ''} | ${s.method || ''} | ${s.how || ''} | ${x.row.live_url || s.candidate || ''} | ${s.reason || ''} |`); }
  console.log(`Not found (${r.summary.not_found.length}): ${r.summary.not_found.join(', ')}`);
  console.log(`Read by: ${JSON.stringify(r.summary.methods)}`);
  if (r.summary.also_listed.length) console.log(`Also listed on sites not in the database (${r.summary.also_listed.length}): ${r.summary.also_listed.map(x => `${x.site}${x.url ? ` <${x.url}>` : ''}`).join('; ')}`);
  if (r.summary.errors.length) console.log(`Errors: ${r.summary.errors.join('; ')}`);
  try { const now = await D.balance(); console.log(`\nDataForSEO spent: ${before != null ? money(before - now) : '?'} (discovery ${money(disc.cost)} + scan ${money(r.cost_usd)} logged)`); } catch (_) {}
  await pool.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
