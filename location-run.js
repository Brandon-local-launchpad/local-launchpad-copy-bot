'use strict';

// ── The location pages job (CORE (18), 27 Oct 2026) ──────────────────────────
// Writes every location page of a client (one per town, page map order). A location page
// runs after the town's other pages: every live location category page and town service
// page in the town must have a record that is not blocked or failed, so MECHANISMS USED and
// IDEAS USED ELSEWHERE carry the whole town; a town with a page unwritten is skipped with the
// list of what is missing. Council areas in the town list (New Forest District) are skipped.
// A page that fails is recorded with its error and the run carries on; a resume writes only
// the pages with no good record. The run's state lives in one client_assets row (asset_type
// location_run).
//
// createLocationRunner({ pool, v20Store, loadInputs, generate, allocate }) where
//   loadInputs(clientId)  → { ctx, niche, rows, calibrationPack, tradeFacts, reviews, dossiers, allocationRecord, saveAllocation }
//                           (the category pages' inputs; tradeFacts.niche names the pack the validator reads Table A from)
//   generate(args)        → the record (location-generate.js generateLocationPage), stubbed in tests
//   allocate({ ... })     → the allocation pass for one page on the town's dossier (neighbourhoods only)

const { computeLocationDecisions } = require('./location-decisions');
const { ideasFromRecords } = require('./ideas');
const { parseDossier, cleanForCopy } = require('./geo-dossier');
const { mechanismsOf } = require('./service-run');
const { isAdminArea } = require('./client-files');
const { LABELS: SVC } = require('./page-types/service');
const A = require('./allocation');
const P = require('./trade-facts/pack');

const ASSET = 'location_run';
const lc = s => String(s || '').toLowerCase().trim();
const normLoc = s => lc(s).replace(/[-_]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const live = r => r && r.applies !== false && ((r.info && r.info.phase) || 1) === 1;
const townOf = r => ((r.info && r.info.town) || r.title || '').trim();

// The pages the job writes, in order: the live location pages, page map order
function pagesInOrder(rows) {
  return rows.filter(r => live(r) && r.type === 'location');
}

// A record counts as done when it was generated (not blocked) and has no BLOCK left
const isGood = rec => !!rec && !rec.blocked && !rec.error && rec.VALIDATION && rec.VALIDATION.status === 'run' && rec.VALIDATION.block === 0;

// The town's other pages: its live location category pages and town service pages
function townPagesOf(rows, town) {
  return rows.filter(r => live(r) && ['location_category', 'town_service'].includes(r.type) && normLoc(townOf(r)) === normLoc(town));
}

// The paragraph the HOW-DONE rule matches against: paragraph 2 of a service page's content block
function paragraphTwo(record) {
  const text = (record && record[SVC.content]) || '';
  const paras = String(text).split(/\n\n+|\\n\\n/).map(p => p.trim()).filter(Boolean);
  return paras[1] || '';
}

function createLocationRunner({ pool, v20Store, loadInputs, generate, allocate = null, log = console.log }) {
  const running = new Map();

  async function loadState(clientId) {
    const { rows } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id=$1 AND asset_type='${ASSET}' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    return rows.length ? { id: rows[0].id, state: typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content } : null;
  }
  async function saveState(clientId, state) {
    const existing = await loadState(clientId);
    const content = JSON.stringify(state);
    if (existing) await pool.query(`UPDATE client_assets SET content=$1, uploaded_at=NOW() WHERE id=$2`, [content, existing.id]);
    else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, '${ASSET}', 'location_run.json', $2)`, [clientId, content]);
  }

  function townData(dossiers, town) {
    const d = (dossiers || []).find(x => normLoc(x.locationName) === normLoc(town));
    if (!d) return null;
    const parsed = parseDossier(d.text);
    const names = Object.fromEntries(parsed.neighbourhoods.map(n => [n.id, n.name]));
    return { parsed, names, profile: cleanForCopy(parsed.overview || '', names), villages: parsed.neighbourhoods.map(n => n.name), id: d.id };
  }

  // The symptoms the town's other pages already used (from their decisions blocks)
  function takenSymptoms(records) {
    const taken = new Set();
    for (const { record } of records) {
      const block = (record && record.meta && record.meta.decisions_block) || '';
      for (const m of block.matchAll(/^\s*(?:Symptom for [^:\n]*|"[^"\n]+") ?(?:: "([^"\n]+)"|\(issue: ([^)\n]+)\))/gm)) { if (m[1]) taken.add(lc(m[1])); }
      for (const m of block.matchAll(/^\s+"([^"\n]+)" \(issue: /gm)) taken.add(lc(m[1]));
    }
    return taken;
  }

  // The town's pages as the run sees them: each with its latest usable record, and the ones with none
  async function townRecords(clientId, rows, town) {
    const written = [], missing = [];
    for (const r of townPagesOf(rows, town)) {
      const type = r.type === 'location_category' ? 'category' : 'service';
      const f = await v20Store.latest(clientId, { type, key: r.slug });
      const rec = f && f.record;
      if (rec && !rec.blocked && !rec.error) written.push({ slug: r.slug, type, label: `${r.title} ${type === 'category' ? 'category page' : 'page'}`, record: rec });
      else missing.push(r.slug);
    }
    return { written, missing };
  }

  // The decisions for one page (no model call, apart from the allocation pass on the town's
  // dossier when the page has no saved picks). written: { homepage, townPages }.
  // Returns { decisionsResult, extraFlags, town, howItsDone, townWritten, waitingOn }.
  async function prepare(clientId, inputs, page, written) {
    const { ctx, niche, rows, reviews, dossiers, allocationRecord } = inputs;
    const town = townOf(page);
    const extraFlags = [];
    const townPages = (written && written.townPages) || [];
    const waitingOn = (written && written.missing) || [];
    if (waitingOn.length) extraFlags.push({ code: 'F-TOWN-PAGES', msg: `${waitingOn.length} of ${town}'s pages are not written yet (${waitingOn.join(', ')}): MECHANISMS USED and IDEAS USED ELSEWHERE carry nothing from them.`, source: 'run' });

    // Ideas and mechanisms: the homepage and the town's category and service pages
    const prior = [{ page: 'homepage', record: written && written.homepage }, ...townPages.map(p => ({ page: p.label, record: p.record }))];
    const ideasUsed = ideasFromRecords(prior);
    const mech = [];
    for (const p of townPages) for (const t of mechanismsOf(p.record)) mech.push({ page: p.label, text: t });
    const mechanismsUsed = mech.filter((m, i, a) => a.findIndex(x => lc(x.text) === lc(m.text)) === i);
    const takenS = takenSymptoms(prior);

    // Local research: the town's dossier; the allocation pass picks the page's 2 neighbourhoods
    const townInfo = townData(dossiers, town);
    let allocation = null, symptoms = [];
    if (!townInfo) extraFlags.push({ code: 'F-ALLOC', msg: `No saved dossier for ${town}.`, source: 'allocation' });
    else {
      const key = `location:${page.slug}`;
      const prefix = `${String(page.slug || '').replace(/\/+$/, '')}/`;
      const pagesA = (allocationRecord && allocationRecord.pages) || {};
      const saved = pagesA[key];
      const takenN = new Set();
      for (const [k, v] of Object.entries(pagesA)) { const slug = k.replace(/^[a-z_]+:/, ''); if (k !== key && slug.startsWith(prefix)) for (const id of v.neighbourhoods || []) takenN.add(id); }
      let picks = saved && saved.dossier_asset_id === townInfo.id ? saved : null;
      if (!picks && allocate) {
        try {
          const got = await allocate({ dossierText: dossiers.find(d => normLoc(d.locationName) === normLoc(town)).text, cv: ctx.cv, niche, keyValueMap: ctx.keyValueMap, pages: ctx.pages, page: { label: `location page: ${town}`, category: null, takenNeighbourhoods: [...takenN], slots: [] } });
          picks = { neighbourhoods: got.neighbourhoods, conservation_areas: got.conservation_areas, reasons: got.reasons, source: 'model', dossier_asset_id: townInfo.id, at: new Date().toISOString() };
          for (const f of got.flags || []) if (!/No symptom/.test(f.msg)) extraFlags.push({ ...f, source: 'allocation' });
          if (allocationRecord) { allocationRecord.pages = allocationRecord.pages || {}; allocationRecord.pages[key] = picks; await inputs.saveAllocation(allocationRecord); }
        } catch (e) { extraFlags.push({ code: 'F-ALLOC', msg: `The allocation pass failed for this page: ${e.message}`, source: 'allocation' }); }
      }
      if (picks) allocation = A.resolveAllocatedItems({ neighbourhoods: picks.neighbourhoods, symptoms: {}, conservation_areas: picks.conservation_areas || [] }, townInfo.parsed);
      const categories = [...new Set([ctx.cv.primary_category, ...rows.filter(r => r.applies !== false && r.type === 'category').map(r => r.title)].filter(Boolean))];
      symptoms = A.symptomsForLocation(townInfo.parsed, { categories, emergencyNiche: !!niche.emergency_niche, limit: 4 + takenS.size }).filter(s => !takenS.has(lc(s.text))).slice(0, 4)
        .map(s => { const issue = townInfo.parsed.issues.find(i => i.id === s.issueId); return { id: s.id, text: s.text, issueTitle: issue ? issue.title : '', issueText: issue ? cleanForCopy(issue.body, townInfo.names) : '' }; });
    }

    // What the HOW-DONE rule matches against: the town's service pages' paragraph 2 and the pack's Table A rows
    const packName = (inputs.tradeFacts && inputs.tradeFacts.niche) || (() => { try { return P.packNameFor(niche); } catch { return null; } })();
    let rowsA = [];
    try { rowsA = P.standardMethodRows(packName); } catch (e) { extraFlags.push({ code: 'F-FACTS', msg: `The trade facts pack could not be read for the how it's done check: ${e.message}`, source: 'run' }); }
    const howItsDone = {
      paragraphs: townPages.filter(p => p.type === 'service').map(p => ({ page: p.label, text: paragraphTwo(p.record) })).filter(p => p.text),
      rows: rowsA,
    };

    const decisionsResult = computeLocationDecisions({ cv: ctx.cv, niche, keyValueMap: ctx.keyValueMap, rows, page, allocation, town: townInfo ? { profile: townInfo.profile, villages: townInfo.villages } : null, symptoms, ideasUsed, mechanismsUsed, reviews });
    return { decisionsResult, extraFlags, town, howItsDone, townWritten: !waitingOn.length, waitingOn };
  }

  // The decisions and the model call for one page; never throws (the error goes in the record)
  async function writePage(clientId, inputs, page, written, { retries = true, claimsReview = true, qualityReview = false } = {}) {
    const { ctx, niche, calibrationPack } = inputs;
    const { decisionsResult, extraFlags, town, howItsDone } = await prepare(clientId, inputs, page, written);
    try {
      return await generate({ cv: ctx.cv, niche, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, decisionsResult, calibrationPack: calibrationPack.text, calibrationPackName: calibrationPack.name, howItsDone, extraFlags, retries, claimsReview, qualityReview });
    } catch (e) {
      return { page: 'location', error: e.message, scope: 'town', town, page_slug: page.slug, FLAGS: [...extraFlags, { code: 'E-RUN', msg: e.message, source: 'run' }], VALIDATION: { status: 'not run' }, meta: { page_type: 'location', page_key: page.slug, scope: 'town', town, generated_at: new Date().toISOString(), decisions_block: decisionsResult.decisionsBlock || null, failed: true } };
    }
  }

  // The pages already written, as a run sees them, for one location page
  async function writtenFor(clientId, rows, page) {
    const homepage = (await v20Store.latest(clientId, { type: 'homepage', key: 'homepage' }) || {}).record || null;
    const { written, missing } = await townRecords(clientId, rows, townOf(page));
    return { homepage, townPages: written, missing };
  }

  // The run. opts: { resume: true (skip pages with a good record), keys: [slugs] (only these), retries, claimsReview, qualityReview }
  async function run(clientId, opts = {}) {
    if (running.has(clientId)) throw Object.assign(new Error('A location pages run is already in progress for this client.'), { status: 409 });
    running.set(clientId, { startedAt: new Date().toISOString(), current: null });
    try {
      const inputs = await loadInputs(clientId);
      const { rows } = inputs;
      const order = pagesInOrder(rows).filter(p => !opts.keys || opts.keys.includes(p.slug));
      const state = { started_at: new Date().toISOString(), finished_at: null, resume: !!opts.resume, pages: order.map(p => ({ key: p.slug, title: p.title, town: townOf(p), status: 'pending' })) };
      await saveState(clientId, state);
      for (const p of order) {
        const st = state.pages.find(s => s.key === p.slug);
        running.get(clientId).current = p.slug;
        const town = townOf(p);
        if (isAdminArea(town)) {
          st.status = 'skipped'; st.error = `${town} is a council area, not a town: no location page is written for it`;
          log(`[location] ${p.title} for ${clientId}: skipped: ${st.error}`);
          await saveState(clientId, state);
          continue;
        }
        const existing = (await v20Store.latest(clientId, { type: 'location', key: p.slug }) || {}).record || null;
        if (opts.resume && isGood(existing)) {
          st.status = 'kept'; st.block = 0; st.flag = existing.VALIDATION.flag; st.at = existing.meta && existing.meta.generated_at;
          await saveState(clientId, state);
          continue;
        }
        const written = await writtenFor(clientId, rows, p);
        if (written.missing.length) {
          st.status = 'skipped'; st.error = `${town}'s pages not written yet (${written.missing.join(', ')})`;
          log(`[location] ${p.title} for ${clientId}: skipped: ${st.error}`);
          await saveState(clientId, state);
          continue;
        }
        st.status = 'running';
        await saveState(clientId, state);
        const record = await writePage(clientId, inputs, p, written, opts);
        const id = await v20Store.insert(clientId, record, { type: 'location', key: p.slug });
        st.status = record.error ? 'failed' : record.blocked ? 'blocked' : 'done';
        st.error = record.error || (record.blocked ? (record.FLAGS || []).filter(f => f.source === 'gate').map(f => f.msg).join('; ') : null);
        st.block = record.VALIDATION ? record.VALIDATION.block : null;
        st.flag = record.VALIDATION ? record.VALIDATION.flag : null;
        st.record_id = id;
        st.at = record.meta && record.meta.generated_at;
        log(`[location] ${p.title} for ${clientId}: ${st.status}${st.block != null ? ` (${st.block} BLOCK, ${st.flag} FLAG)` : ''}${st.error ? `: ${st.error}` : ''}`);
        await saveState(clientId, state);
      }
      state.finished_at = new Date().toISOString();
      await saveState(clientId, state);
      return state;
    } finally {
      running.delete(clientId);
    }
  }

  // The panel: every location page in order with its latest record's summary, the town's pages' state and the run state
  async function view(clientId, rows) {
    const st = await loadState(clientId);
    const pages = [];
    for (const p of pagesInOrder(rows)) {
      const f = await v20Store.latest(clientId, { type: 'location', key: p.slug });
      const r = f && f.record;
      const town = townOf(p);
      const admin = isAdminArea(town);
      const { written, missing } = admin ? { written: [], missing: [] } : await townRecords(clientId, rows, town);
      pages.push({
        key: p.slug, title: p.title, h1: p.h1 || '', scope: 'town', town, admin_area: admin,
        town_pages: written.length + missing.length, town_pages_written: written.length, waiting_on: missing, ready: !admin && !missing.length,
        record: r ? { id: f.id, at: r.meta && (r.meta.edited_at || r.meta.generated_at), blocked: !!r.blocked, error: r.error || null, block: r.VALIDATION ? r.VALIDATION.block : null, flag: r.VALIDATION ? r.VALIDATION.flag : null, claims: r.CLAIMS && r.CLAIMS.findings ? r.CLAIMS.findings.length - ((r.CLAIMS.accepted || []).length) : null, good: isGood(r), flags: (r.FLAGS || []).length } : null,
      });
    }
    return { pages, run: st ? st.state : null, running: running.has(clientId) ? running.get(clientId) : null };
  }

  return { run, view, loadState, pagesInOrder, isGood, prepare, writePage, writtenFor, townRecords, running };
}

module.exports = { createLocationRunner, pagesInOrder, isGood, townPagesOf, paragraphTwo };
