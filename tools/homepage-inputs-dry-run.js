'use strict';
// Homepage inputs dry run: what the homepage decisions would receive from the v3 page map
// and the hand set-up (v20-context-v3.js) next to what they receive today from the uploaded
// page map and custom values CSVs (the path the 15 Oct 2026 page was written from).
// Reads only (SELECT); no model call; nothing written to the database. Prints the report and
// saves it to docs/h1-research/<client>-homepage-inputs-dry-run.md.
//
//   node tools/homepage-inputs-dry-run.js "<client name>"|<client id>
//
// Needs DATABASE_URL in .env or the environment.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
try { fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }); } catch (_) {}

const { parsePageMap, parseCustomValues } = require(path.join(root, 'client-files.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const { createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { createPageMapStore, inputsFor } = require(path.join(root, 'page-map/store.js'));

// server.js NICHE_FILE_MAP, as it stands (the niche from the primary category, else the trade)
const NICHE_FILE_MAP = { landscaper: 'landscaper', 'landscaper gardener': 'landscaper', landscaping: 'landscaper', 'roofing company': 'roofer', 'roofing contractor': 'roofer', roofer: 'roofer' };
function loadNiche(cv, clientTrade) {
  const primaryIsNiche = !!NICHE_FILE_MAP[(cv.primary_category || '').toLowerCase().trim()];
  const trade = primaryIsNiche ? cv.primary_category : (clientTrade || cv.primary_category);
  const stem = NICHE_FILE_MAP[(trade || '').toLowerCase().trim()];
  if (!stem) throw new Error(`No niche file for trade "${trade}"`);
  return { trade, niche: JSON.parse(fs.readFileSync(path.join(root, 'niche-library', `${stem}.json`), 'utf8')) };
}

async function dryRun(pool, who) {
  const { rows: cs } = await pool.query(`SELECT id, name, trade, v20_test_mode FROM clients`);
  const hits = cs.filter(c => c.id === who || String(c.name).trim().toLowerCase() === String(who).trim().toLowerCase());
  if (hits.length !== 1) throw new Error(`Expected one client matching "${who}", found ${hits.length}`);
  const client = hits[0];

  // Client values (the same for both paths)
  const { rows: cvRows } = await pool.query(`SELECT content FROM client_assets WHERE client_id=$1 AND asset_type='client_values' ORDER BY uploaded_at DESC LIMIT 1`, [client.id]);
  const cv = cvRows.length ? JSON.parse(cvRows[0].content) : {};
  const { trade, niche } = loadNiche(cv, client.trade);

  // Old path: the uploaded CSVs, as loadV20Context reads them without a session
  const { rows: files } = await pool.query(`SELECT filename, content, metadata, uploaded_at FROM client_assets WHERE client_id=$1 AND asset_type='client_file' ORDER BY uploaded_at`, [client.id]);
  const pageMapRow = files.find(r => r.metadata && r.metadata.fileType === 'page_map');
  const cvFiles = files.filter(r => r.metadata && r.metadata.fileType === 'custom_values');
  const old = { pages: [], keyValueMap: {}, serviceParentMap: {}, file: pageMapRow ? `${pageMapRow.filename} (uploaded ${new Date(pageMapRow.uploaded_at).toISOString().slice(0, 10)})` : null };
  if (pageMapRow) {
    old.pages = parsePageMap(pageMapRow.content);
    if (cvFiles.length) { const parsed = parseCustomValues(cvFiles.map(r => r.content)); old.keyValueMap = parsed.keyValueMap || {}; old.serviceParentMap = parsed.serviceParentMap || {}; }
  }

  // New path: the v3 page map rows and the hand set-up
  const svc = createFilloutService({ pool, audioStore: { put() { throw new Error('not used'); }, get() { return null; } }, log: { log() {}, info() {}, warn() {}, error() {} } });
  const store = createPageMapStore({ pool, filloutService: svc });
  const rows = await store.saved(client.id);
  const st = await store.state(client.id);
  const hand = await inputsFor(svc, client.id, { categoryTabRule: (st && st.category_tab_rule) || 'ticked_only' });
  const v3 = contextFromPageMap({ rows, hand: { baseTown: hand.baseTown, otherTowns: hand.otherTowns }, cv, niche });

  // The latest saved homepage, for the date and the cards it was given
  const { rows: recs } = await pool.query(`SELECT content, uploaded_at FROM client_assets WHERE client_id=$1 AND asset_type='v20_page_record' ORDER BY uploaded_at DESC LIMIT 1`, [client.id]);
  const latest = recs.length ? JSON.parse(recs[0].content) : null;

  const common = { cv, niche, v20TestMode: !!client.v20_test_mode, allocationData: null, faqResearch: [] };
  const oldD = computeDecisions({ ...common, pages: old.pages, keyValueMap: old.keyValueMap, serviceParentMap: old.serviceParentMap });
  const newD = computeDecisions({ ...common, pages: v3.pages, keyValueMap: v3.keyValueMap, serviceParentMap: v3.serviceParentMap, cardServices: v3.cardServices });
  return { client, trade, cv, old, v3, rows: rows.filter(r => r.applies !== false), state: st, hand, oldD, newD, latest };
}

const lc = s => String(s || '').toLowerCase().trim();
const cats = kv => Object.entries(kv).filter(([k, v]) => /^category_\d+$/.test(k) && v).map(([, v]) => v);
const svcs = kv => Object.entries(kv).filter(([k, v]) => /^service_\d+$/.test(k) && v).map(([, v]) => v);
const areas = kv => Object.entries(kv).filter(([k, v]) => /^biz_area_\d+$/.test(k) && v).map(([, v]) => v);

function report(r) {
  const L = [];
  const push = (...a) => L.push(...a);
  const { oldD, newD } = r;
  const stored = r.latest && r.latest.meta && r.latest.meta.decisions_block || '';
  const storedCards = stored.split('\n').filter(l => /^\s+\d+\. .+\[/.test(l) || /^\s+Services: /.test(l));
  push(`# Homepage inputs dry run: ${r.client.name} (${new Date().toISOString().slice(0, 10)})`, '');
  push(`Nothing written, no model call. Trade "${r.trade}", niche entry ${r.trade.toLowerCase().includes('roof') ? 'roofer' : 'landscaper'}.json, primary category "${r.cv.primary_category || ''}", h1_override "${r.cv.h1_override || ''}".`, '');
  push(`- **Today (old path):** ${r.old.file || 'no uploaded page map'}, ${r.old.pages.length} page map rows, ${svcs(r.old.keyValueMap).length} GBP services in ${cats(r.old.keyValueMap).length} categories from the custom values CSVs. The page written ${r.latest ? new Date(r.latest.meta.generated_at).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '(none yet)'} came from this path.`);
  push(`- **New (v3 path):** ${r.rows.length} page map rows that apply (generated ${r.state && r.state.generated_at ? new Date(r.state.generated_at).toISOString().slice(0, 10) : '?'}), ${svcs(r.v3.keyValueMap).length} services (the library's names) in ${cats(r.v3.keyValueMap).length} categories, ${areas(r.v3.keyValueMap).length} areas from the hand set-up (base town "${r.hand.baseTown}").`, '');

  const gate = D => (D.gates && D.gates.length ? D.gates.map(g => `${g.code}: ${g.msg}`).join('; ') : 'none');
  push('## Gates', '', `| | Today | New |`, `|---|---|---|`, `| Gates | ${gate(oldD)} | ${gate(newD)} |`, '');
  if (!oldD.decisions || !newD.decisions) { push('A gate failed on one path; the sections below show what could be built.'); }

  const O = oldD.decisions || {}, N = newD.decisions || {};
  push('## H1, title, meta', '', '| | Today | New |', '|---|---|---|');
  push(`| H1 (D2) | ${O.d2_h1 || ''} | ${N.d2_h1 || ''} |`);
  push(`| Title (D3) | ${O.d3_title || ''} | ${N.d3_title || ''} |`);
  push(`| Meta (D4) | ${O.d4_meta || ''} | ${N.d4_meta || ''} |`);
  push(`| Hero town (D14) | ${O.d14_town ? O.d14_town.name + (O.d14_town.url ? ' (' + O.d14_town.url + ')' : '') : 'none'} | ${N.d14_town ? N.d14_town.name + (N.d14_town.url ? ' (' + N.d14_town.url + ')' : '') : 'none'} |`, '');

  push('## Cards (D9): name, link, H1, services named', '');
  const cardLine = c => `${c.name} [${c.status}${c.url ? ' ' + c.url : ''}]<br>H1: ${c.h1 || '(blank)'}<br>Services: ${(c.services || []).length ? c.services.join(', ') : '(none)'}`;
  const oc = (O.d9 && O.d9.main) || [], nc = (N.d9 && N.d9.main) || [];
  push('| # | Today | New |', '|---|---|---|');
  for (let i = 0; i < Math.max(oc.length, nc.length); i++) push(`| ${i + 1} | ${oc[i] ? cardLine(oc[i]) : ''} | ${nc[i] ? cardLine(nc[i]) : ''} |`);
  push(`| We also offer | ${(O.d9 && O.d9.alsoOffer || []).join(', ') || '(nothing)'} | ${(N.d9 && N.d9.alsoOffer || []).join(', ') || '(nothing)'} |`, '');
  if (storedCards.length) {
    push(`The cards the ${new Date(r.latest.meta.generated_at).toISOString().slice(0, 10)} page was actually given (from its saved decisions block):`, '');
    for (const l of storedCards) push(`    ${l.trim()}`);
    push('');
  }

  push('## Services per card (new path): the category\'s base service pages, and the pick', '');
  push('| Card | Base service pages under it (phase 1) | Picked (jobs_wanted, then search volume, then core services, then page map order; 3 at most; each service in one card) |', '|---|---|---|');
  for (const c of nc) { const k = lc(c.name); const up = (r.v3.cardServices.toppedUp || {})[k] || []; push(`| ${c.name} | ${(r.v3.cardServices.pools[k] || []).join(', ') || '(none)'} | ${(r.v3.cardServices.picks[k] || []).join(', ') || '(none)'}${up.length ? ` (${up.join(', ')} also named on another card: this card had fewer than two of its own)` : ''} |`); }
  push('');

  push('## Areas list (D12)', '', '| | Today | New |', '|---|---|---|');
  const ar = D => D.d12_areas ? [`Primary: ${D.d12_areas.primaryCity} (plain)`, ...D.d12_areas.linked.map(a => `${a.name} (linked ${a.url})`), ...D.d12_areas.plain.map(a => `${a} (plain)`)] : [];
  const oa = ar(O), na = ar(N);
  for (let i = 0; i < Math.max(oa.length, na.length); i++) push(`| ${i + 1} | ${oa[i] || ''} | ${na[i] || ''} |`);
  push('');
  const launch = r.state && r.state.counts && r.state.counts.launchTowns;
  if (launch) push(`Launch towns (phase 1) on the v3 map: ${launch.join(', ')}. Every other town is phase 2: plain text here, no link.`, '');

  push('## Content block links (D13)', '', '| | Today | New |', '|---|---|---|');
  const ol = (O.d13_links || []).map(l => `${l.name} (${l.url})`), nl = (N.d13_links || []).map(l => `${l.name} (${l.url})`);
  for (let i = 0; i < Math.max(ol.length, nl.length); i++) push(`| ${i + 1} | ${ol[i] || ''} | ${nl[i] || ''} |`);
  push('');

  push('## LINKABLE PAGES', '', '| | Today | New |', '|---|---|---|');
  const lp = D => (D.linkablePages || []).map(p => `[${p.type}] ${p.url} · H1: ${p.h1 || '(blank)'}`);
  const olp = lp(O), nlp = lp(N);
  for (let i = 0; i < Math.max(olp.length, nlp.length); i++) push(`| ${i + 1} | ${olp[i] || ''} | ${nlp[i] || ''} |`);
  push('');

  push('## Categories, services and areas handed to the client block and the validator', '', '| | Today | New |', '|---|---|---|');
  push(`| Categories | ${cats(r.old.keyValueMap).join(', ')} | ${cats(r.v3.keyValueMap).join(', ')} |`);
  push(`| Services | ${svcs(r.old.keyValueMap).length} GBP names, e.g. ${svcs(r.old.keyValueMap).slice(0, 6).join(', ')} … | ${svcs(r.v3.keyValueMap).length} page names: ${svcs(r.v3.keyValueMap).join(', ')} |`);
  push(`| Areas | ${areas(r.old.keyValueMap).join(', ')} | ${areas(r.v3.keyValueMap).join(', ')} |`, '');

  push('## Differences that change the copy', '');
  const diffs = [];
  const names = l => l.map(c => c.name);
  if (JSON.stringify(names(oc)) !== JSON.stringify(names(nc))) diffs.push(`Cards: today ${names(oc).join(', ')}; new ${names(nc).join(', ')}.`);
  for (const c of nc) { const o = oc.find(x => lc(x.name) === lc(c.name)); if (o && o.h1 !== c.h1) diffs.push(`${c.name} card H1: "${o.h1}" becomes "${c.h1}" (the v3 research H1; the card links to it).`); if (o && JSON.stringify(o.services) !== JSON.stringify(c.services)) diffs.push(`${c.name} card services: ${o.services.join(', ') || '(none)'} become ${c.services.join(', ') || '(none)'}.`); }
  const oLinked = (O.d12_areas ? O.d12_areas.linked : []).map(a => a.name), nLinked = (N.d12_areas ? N.d12_areas.linked : []).map(a => a.name);
  if (JSON.stringify(oLinked) !== JSON.stringify(nLinked)) diffs.push(`Linked areas: today ${oLinked.join(', ')}; new ${nLinked.join(', ')} (phase 1 only).`);
  if (JSON.stringify(ol) !== JSON.stringify(nl)) diffs.push(`Content block links: today ${ol.join('; ')}; new ${nl.join('; ')}.`);
  if (olp.length !== nlp.length) diffs.push(`LINKABLE PAGES: ${olp.length} today, ${nlp.length} new.`);
  if (svcs(r.old.keyValueMap).length !== svcs(r.v3.keyValueMap).length) diffs.push(`Services on file: ${svcs(r.old.keyValueMap).length} GBP names today, ${svcs(r.v3.keyValueMap).length} page names new. The validator's SERVICE and CARD-PICK checks and the client block's CONFIRMED SERVICES follow the new list.`);
  for (const d of diffs) push(`- ${d}`);
  if (!diffs.length) push('- none');
  push('', '## Not compared here', '', '- ALLOCATED ITEMS and the FAQ questions: both paths get the same saved allocation and sorted questions, so they are left out of this run (shown as none on both sides).', '- Service words: the new path names every service by its page title (the library\'s UK name). The old path still translates GBP names through the niche service_words list.');
  return L.join('\n') + '\n';
}

module.exports = { dryRun, report };

if (require.main === module) {
  (async () => {
    const who = process.argv[2];
    if (!who) { console.log('Usage: node tools/homepage-inputs-dry-run.js "<client name>"|<client id>'); process.exitCode = 2; return; }
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
      const r = await dryRun(pool, who);
      const text = report(r);
      const dir = path.join(root, 'docs/h1-research');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${r.client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-homepage-inputs-dry-run.md`);
      fs.writeFileSync(file, text);
      console.log(text);
      console.log(`(saved: ${path.relative(root, file)})`);
    } catch (e) { console.log(`Dry run failed: ${e.message}`); console.log(e.stack.split('\n').slice(1, 5).join('\n')); process.exitCode = 1; }
    finally { await pool.end(); }
  })();
}
