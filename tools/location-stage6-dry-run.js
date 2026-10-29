'use strict';
// Location Determiner Stage 6 dry run: what the approved locations list would do to a client's
// page map. Reads the live database in .env, writes nothing.
//   node tools/location-stage6-dry-run.js --live "<client>"               with the approved list (client_location_tiers)
//   node tools/location-stage6-dry-run.js --live "<client>" --as-review   with the review as it stands, approved or not
//   --json   the raw preview
// Prints the pages to add, retire and keep by type and phase, and every retiring page that has
// an edited H1, a meta title or description, copy (an old pages row or a v20 record) or a status
// beyond Not Started.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');
try { fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).forEach(line => { const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); }); } catch (_) {}
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : dflt; };
const LIVE = opt('--live', null), AS_REVIEW = argv.includes('--as-review'), JSON_OUT = argv.includes('--json');
if (!LIVE) { console.error('Give the client: --live "<name or id>"'); process.exit(2); }
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(2); }

const { Pool } = require('pg');
const { createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { createH1Research } = require(path.join(root, 'h1-research/service.js'));
const { createV20Store } = require(path.join(root, 'v20-store.js'));
const A = require(path.join(root, 'locations/approved.js'));
const P = require(path.join(root, 'locations/places.js'));
const S = require(path.join(root, 'locations/serp.js'));
const V = require(path.join(root, 'locations/review.js'));
const { createLocationService } = require(path.join(root, 'locations/service.js'));
const G = require(path.join(root, 'page-map/generator.js'));

const pad = (s, n) => String(s == null ? '' : s).padEnd(n);

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const { rows: cs } = await pool.query(`SELECT id, name FROM clients WHERE id::text = $1 OR lower(name) = lower($1) OR name ILIKE $2 ORDER BY (lower(name) = lower($1)) DESC, name`, [LIVE, `%${LIVE}%`]);
  if (!cs.length) throw new Error(`No live client matches "${LIVE}"`);
  const client = cs[0];
  const filloutService = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: console });
  // The tiers: the approved list, or the review as it stands
  let tiers;
  if (AS_REVIEW) {
    const places = P.createPlacesStore(pool);
    const h1 = createH1Research({ pool, filloutService, pageMapStore: createPageMapStore({ pool, filloutService }), log: console });
    const svc = createLocationService({ pool, filloutService, pageMapStore: createPageMapStore({ pool, filloutService }), h1, places, serp: S.createSerpStore(pool), log: console });
    const review = V.createLocationReview({ pool, places, locations: svc, log: { log() {} } });
    const view = await review.view(client.id);
    if (!view.ok) throw new Error(`No run to read: ${view.problems.map(p => p.msg).join(' ')}`);
    tiers = A.tiersFromReview(view);
  } else {
    tiers = await A.approvedTiers(pool, client.id);
  }
  const h1cache = createH1Research({ pool, filloutService, pageMapStore: createPageMapStore({ pool, filloutService }), log: console });
  const store = createPageMapStore({ pool, filloutService, volumesFor: kws => h1cache.cached(kws), approvedTiers: async () => tiers });
  const pre = await store.preview(client.id);
  const v20 = createV20Store(pool);
  // Copy: an old pages row (GHL output) or a v20 record for the page
  const { rows: oldPages } = await pool.query(`SELECT page_type, url_slug, page_title FROM pages WHERE client_id = $1 AND copy_output IS NOT NULL`, [client.id]);
  const v20Keys = new Set();
  for (const type of ['homepage', 'category', 'service', 'location', 'location_category', 'town_service']) for (const r of await v20.pages(client.id, type)) v20Keys.add(`${type}:${r.key}`);
  const hasCopy = r => v20Keys.has(`${r.type}:${r.slug}`) || v20Keys.has(`${r.type}:${r.page_key}`) || v20Keys.has(`${r.type}:${String(r.slug).split('/').filter(Boolean).pop()}`) || oldPages.some(p => p.url_slug === r.slug || p.page_title === r.title);
  // A person's work: a manual H1, a meta title or description, notes, copy, or a status past H1 Added. The H1 research
  // job writes research and pattern H1s itself and moves the status to H1 Added, so those alone are not a person's work.
  const worked = r => { const w = []; if (r.h1_source === 'manual') w.push(`H1 "${r.h1}" (manual)`); if (r.meta_title) w.push('meta title'); if (r.meta_description) w.push('meta description'); if (r.notes) w.push('notes'); if (hasCopy(r)) w.push('copy'); if (!['Not Started', 'H1 Added'].includes(r.status)) w.push(`status ${r.status}`); return w; };
  const researchOnly = r => !worked(r).length && r.h1 && r.h1_source !== 'manual' ? `H1 from ${r.h1_source} "${r.h1}" (research, not a person)` : '';
  const out = { client, tiers: tiers ? { source: tiers.source, approved_at: tiers.approved_at, counts: tiers.counts, towns: tiers.towns, gbp_areas: tiers.gbp_areas } : null, preview: pre };
  if (JSON_OUT) { console.log(JSON.stringify(out, null, 2)); await pool.end(); return; }

  const L = [];
  L.push(`STAGE 6 DRY RUN: ${client.name} (${client.id})`);
  if (!tiers) { L.push('No approved locations list: the page map keeps today\'s behaviour (the record\'s other towns). Nothing would change from Stage 6.'); L.push(AS_REVIEW ? '' : 'Run with --as-review to see what the review as it stands would do.'); }
  else {
    L.push(`Tiers from ${tiers.source}${tiers.approved_at ? ` (approved ${String(tiers.approved_at).slice(0, 16)})` : ''}: Tier 1 ${tiers.tier1.map(t => t.name).join(', ')}; Tier 2 ${tiers.tier2.map(t => t.name).join(', ')}; area only ${tiers.area_only.length}`);
    L.push(`Other towns for the page map (${tiers.towns.length}): ${tiers.towns.join(', ')}`);
    L.push(`Record's other_areas (${String(pre.inputs.otherTownsFromRecord || '').split(/\r?\n/).filter(Boolean).length}): ${String(pre.inputs.otherTownsFromRecord || '').split(/\r?\n/).filter(Boolean).join(', ')}`);
    L.push(`GBP service areas (${tiers.gbp_areas.length}): ${tiers.gbp_areas.join(', ')}`);
  }
  const plan = pre.plan, diff = pre.diff;
  if (!plan.ok) { L.push('The plan cannot be built: ' + plan.problems.map(p => p.msg).join(' ')); console.log(L.join('\n')); await pool.end(); return; }
  L.push(`Launch towns (phase 1): ${plan.launchTowns.join(', ') || 'none'}${plan.phase2Published ? ' (phase 2 published: every page phase 1)' : ''}`);
  L.push('');
  const phaseOf = r => (r.info || {}).phase || 1;
  const typeOf = r => G.TYPE_LABEL[typeof r === 'string' ? r : r.type] || (typeof r === 'string' ? r : r.type);
  const count = (list, type, phase, getPhase = phaseOf) => list.filter(r => r.type === type && getPhase(r) === phase).length;
  const keep = [...diff.unchanged, ...diff.update.map(u => u.row)];
  const plannedBy = new Map(plan.rows.map(r => [r.page_key, r]));
  const keepPhase = r => phaseOf(plannedBy.get(r.page_key) || r);
  L.push(pad('TYPE', 20) + pad('add p1', 8) + pad('add p2', 8) + pad('revive', 8) + pad('retire', 8) + pad('keep p1', 9) + pad('keep p2', 9) + 'phase changes');
  for (const type of G.TYPES) {
    const phaseChanges = diff.update.filter(u => u.row.type === type && u.changes.phase !== undefined).length;
    L.push(pad(typeOf(type), 20) + pad(count(diff.add, type, 1), 8) + pad(count(diff.add, type, 2), 8) + pad(diff.revive.filter(u => u.row.type === type).length, 8) + pad(diff.retire.filter(r => r.type === type).length, 8) + pad(count(keep, type, 1, keepPhase), 9) + pad(count(keep, type, 2, keepPhase), 9) + (phaseChanges || ''));
  }
  L.push(`Totals: add ${diff.add.length}, revive ${diff.revive.length}, retire ${diff.retire.length}, keep ${keep.length} (${diff.update.length} with plan-owned changes: links, titles or phases), already retired ${diff.stillRetired.length}; the plan has ${plan.rows.length} pages (${plan.counts.phase1} phase 1, ${plan.counts.phase2} phase 2)`);
  L.push('');
  L.push(`ADD (${diff.add.length})`);
  for (const r of diff.add) L.push(`  ${pad(typeOf(r.type), 18)} ${pad(r.title, 40)} ${r.slug}  phase ${phaseOf(r)}${(r.info || {}).tier ? ` (Tier ${r.info.tier})` : ''}`);
  L.push('');
  L.push(`RETIRE (${diff.retire.length}: applies = false, never deleted; edited fields untouched)`);
  for (const r of diff.retire) L.push(`  ${pad(typeOf(r.type), 18)} ${pad(r.title, 40)} ${pad(r.slug, 52)} ${worked(r).length ? 'WORKED ON: ' + worked(r).join(', ') : researchOnly(r)}`);
  const workedRetiring = diff.retire.filter(r => worked(r).length);
  L.push('');
  L.push(`RETIRING PAGES WITH WORK ON THEM (${workedRetiring.length})`);
  for (const r of workedRetiring) L.push(`  ${pad(typeOf(r.type), 18)} ${pad(r.title, 40)} ${worked(r).join(', ')}`);
  if (diff.renames.length) { L.push(''); L.push('POSSIBLE RENAMES'); for (const x of diff.renames) L.push('  ' + x.msg); }
  const phaseMoves = diff.update.filter(u => u.changes.phase !== undefined);
  if (phaseMoves.length) { L.push(''); L.push(`PHASE CHANGES ON KEPT PAGES (${phaseMoves.length})`); for (const u of phaseMoves) L.push(`  ${pad(typeOf(u.row.type), 18)} ${pad(u.row.title, 40)} phase ${phaseOf(u.row)} → ${u.changes.phase}`); }
  if (diff.revive.length) { L.push(''); L.push(`REVIVE (${diff.revive.length}: retired pages back in the plan)`); for (const u of diff.revive) L.push(`  ${pad(typeOf(u.row.type), 18)} ${u.row.title}`); }
  L.push('');
  L.push('Nothing was written.');
  console.log(L.join('\n'));
  await pool.end();
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
