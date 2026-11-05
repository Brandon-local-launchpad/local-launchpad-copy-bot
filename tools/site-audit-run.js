#!/usr/bin/env node
'use strict';

// ── Site audit: a real scan from this machine, on an in-memory database ───────────
//   node tools/site-audit-run.js --url https://southamptonhomes.co.uk --max-usd 0.5
//   options: --name "<business>"   --phone "<Client Values phone>"   --address "<address>"
//            --csv <Search Console file>      --record <file>   saves the responses so a fixture can replay them
//            --replay <file>                  uses saved responses: no network, spends nothing
//            --page-map <file> --base-town <town>   a Page Map to match against ({ rows }, as tests/fixtures/data/edens-edge-v3-page-map.json)
//            --export <folder>                writes the two CSVs for the client sheet there
//
// Buys from DataForSEO with the .env login and reads the site politely, as the app does. Nothing
// goes to the live database or to any site. The report prints here and is saved under
// docs/site-audit/runs/ when --report <file> is given. A client that isn't real has no Client
// Values, so the comparison against the record only runs when --phone or --address is given.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const args = process.argv.slice(2);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d; };

const { newDb, DataType } = require('pg-mem');
const { ensureSiteAuditTables } = require(path.join(root, 'site-audit/store.js'));
const { createSiteAudit } = require(path.join(root, 'site-audit/service.js'));
const { replayer } = require(path.join(root, 'site-audit/replay.js'));
const { ensurePageMapTables } = require(path.join(root, 'page-map/store.js'));

// What's worth keeping of a page in a recording: scripts and styles out, the rest as it was
const slim = text => String(text).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');

function recorder(file) {
  const log = [];
  const impl = async (url, init = {}) => {
    const res = await fetch(url, init);
    const headers = {};
    for (const k of ['content-type', 'location', 'x-robots-tag', 'retry-after']) { const v = res.headers.get(k); if (v) headers[k] = v; }
    const isDfs = /api\.dataforseo\.com/.test(String(url));
    // An image's bytes are not worth keeping: the type and the status are what the scan reads
    const textual = !headers['content-type'] || /text|html|xml|json/i.test(headers['content-type']);
    const body = textual ? await res.clone().text() : '';
    log.push({ url: String(url), request: isDfs ? JSON.parse(init.body || '[]') : undefined, status: res.status, headers, body: isDfs ? body : slim(body) });
    return res;
  };
  return { impl, save: () => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(log, null, 1)); } };
}

async function main() {
  const url = val('--url', '');
  if (!url) { console.error('Usage: node tools/site-audit-run.js --url <site> [--max-usd 2] [--record file | --replay file] [--phone ...] [--report file]'); process.exit(1); }
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT)`);
  await ensurePageMapTables(pool);
  await ensureSiteAuditTables(pool);
  const mapRows = val('--page-map', '') ? JSON.parse(fs.readFileSync(val('--page-map', ''), 'utf8')).rows.filter(r => r.applies !== false).map((r, i) => ({ page_key: `${r.type}:${r.slug}`, sort_order: i, info: {}, ...r })) : [];
  const { rows } = await pool.query(`INSERT INTO clients (name) VALUES ($1) RETURNING id`, [val('--name', url)]);
  const clientId = rows[0].id;
  const cv = { live_domain: url, company_name: val('--name', ''), phone: val('--phone', ''), address: val('--address', '') };

  const replay = val('--replay', '');
  const rec = val('--record', '') ? recorder(val('--record', '')) : null;
  const costs = [];
  const audit = createSiteAudit({
    pool,
    loadValues: async () => cv,
    logCost: async e => { costs.push(e); },
    env: replay ? { DATAFORSEO_LOGIN: 'replay', DATAFORSEO_PASSWORD: 'replay' } : process.env,
    fetchImpl: replay ? replayer(replay) : rec ? rec.impl : undefined,
    sleep: replay ? async () => {} : undefined,
    lookup: replay ? async () => ({ address: '8.8.8.8' }) : undefined,
    loadPages: mapRows.length ? async () => ({ rows: mapRows, baseTown: val('--base-town', '') }) : null,
  });
  await audit.saveSettings(clientId, { max_usd: val('--max-usd', '2') });
  if (val('--csv', '')) await audit.uploadSearchConsole(clientId, { csv: fs.readFileSync(val('--csv', ''), 'utf8'), filename: path.basename(val('--csv', '')) });
  const started = Date.now();
  await audit.start(clientId);
  await audit.wait(clientId);
  if (rec) rec.save();
  const v = await audit.view(clientId);
  const s = v.scan;
  const L = [];
  const say = t => L.push(t);
  say(`SITE AUDIT: ${url}${replay ? ' (replayed, nothing spent)' : ''}`);
  say(`Status ${s.status}, ${Math.round((Date.now() - started) / 1000)} seconds, DataForSEO ${s.calls} calls, $${s.cost_usd.toFixed(4)}`);
  if (s.error) say(`Error: ${s.error}`);
  say(`Platform: ${s.platform} (${(s.platform_evidence || []).join(', ')})`);
  say(`Benchmark: ${s.benchmark === 'search_console' ? 'Search Console' : 'Estimated, no Search Console'}`);
  say(`Total URLs: ${s.summary.total_urls}: ${s.summary.pages} pages, ${s.summary.media} images and PDFs (${JSON.stringify(s.summary.by_source)}), sitemap ${JSON.stringify(s.summary.sitemap)}`);
  say(s.summary.complete ? 'Complete: no loud warnings' : `MAY BE INCOMPLETE: ${s.warnings.filter(w => w.loud).length} loud warnings below`);
  say(`Homepage: ${s.summary.homepage ? `${s.summary.homepage.path || 'NOT FOUND'} (${s.summary.homepage.how}; / answered ${s.summary.homepage.root_status})` : 'unknown'}`);
  say(`Crawl: reached ${s.summary.crawl.reached} pages by links; other sources know of ${s.summary.crawl.known_elsewhere} live pages, ${s.summary.crawl.not_linked} not linked from anything crawled`);
  say(`Matter: ${s.summary.matters}, top list: ${s.summary.top20}, orphans: ${s.summary.orphans}`);
  say(`Sites linking, all: ${s.summary.all_domains}, real: ${s.summary.real_domains} (${s.summary.real_domain_names.join(', ')}); links: ${s.summary.links}`);
  say(`Rankings: ${s.summary.keywords}, estimated visits a month: ${s.summary.est_traffic}`);
  say('\nWARNINGS');
  for (const w of s.warnings) say(`  ${w.loud ? 'LOUD' : '   -'} ${w.text}`);
  if (!s.warnings.length) say('  none');
  say('\nISSUES');
  for (const i of s.issues) say(`  - ${i.text}\n      ${i.pages.join(', ')}`);
  if (!s.issues.length) say('  none');
  say('\nURLS');
  for (const u of v.urls) {
    say(`  ${u.path || u.url}  [${u.kind}]  status ${u.status_code == null ? u.fetch_state : u.status_code}${u.redirect_target ? ` to ${u.redirect_target}` : ''}  found by ${(u.sources || []).join('+')}`);
    say(`      words ${u.word_count == null ? '-' : u.word_count}, inlinks ${u.inlinks}, sites real/all ${u.real_rd}/${u.all_rd}, est visits ${u.est_traffic}, keywords ${u.keywords_count}${u.orphan ? ', ORPHAN' : ''}${u.top20 ? `, TOP (${u.top20_why})` : ''}`);
    say(`      ${u.matters ? 'MATTERS' : 'does not matter'}: ${(u.matters_why || []).join('. ')}`);
    if (u.top_searches && u.top_searches.length) say(`      top searches: ${u.top_searches.map(t => `${t.search} (pos ${t.position})`).join('; ')}`);
  }
  if (v.page_map_ready) {
    const c = s.summary.decisions;
    say(`\nURL MAP${mapRows.length ? ` (against ${val('--page-map', '')}: ${mapRows.length} pages)` : ''}: ${Object.entries(c.counts).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(', ')}; ${c.redirects} redirects, ${c.gone} 410s`);
    const grouped = new Map();
    for (const u of v.urls) {
      const line = `  ${u.plan.decision.padEnd(7)} ${(u.path || u.url).padEnd(32)} ${(u.plan.redirect_type === 'none' ? 'no redirect' : u.plan.redirect_type).padEnd(12)} ${u.plan.new_url || '-'}`;
      if (u.kind !== 'page') { const k = `${u.plan.decision}|${u.plan.redirect_type}|${u.plan.reason}`; grouped.set(k, (grouped.get(k) || 0) + 1); continue; }
      say(line);
      say(`          ${u.plan.reason}`);
    }
    for (const [k, n] of grouped) { const [d, r, why] = k.split('|'); say(`  ${d.padEnd(7)} ${`${n} images and files`.padEnd(32)} ${(r === 'none' ? 'no redirect' : r).padEnd(12)} -`); say(`          ${why}`); }
  }
  if (val('--export', '')) {
    fs.mkdirSync(val('--export', ''), { recursive: true });
    for (const which of ['old-site-audit', 'url-map']) fs.writeFileSync(path.join(val('--export', ''), `${which}.csv`), await audit.exportCsv(clientId, which));
  }
  const out = L.join('\n');
  console.log(out);
  if (val('--report', '')) { fs.mkdirSync(path.dirname(val('--report', '')), { recursive: true }); fs.writeFileSync(val('--report', ''), out + '\n'); }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
