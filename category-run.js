'use strict';

// ── The category pages job (23 Oct 2026) ─────────────────────────────────────
// Writes every category page and location category page of a client, base pages first
// (page map order), then the town pages, so the ideas list is full before a town page
// runs. A page that fails is recorded with its error and the run carries on; a resume
// writes only the pages with no good record. The run's state lives in one client_assets
// row (asset_type category_run) so the client page can show it and a restart can resume.
//
// createCategoryRunner({ pool, v20Store, loadInputs, generate }) where
//   loadInputs(clientId)         → { ctx, niche, rows, calibrationPack, tradeFacts, reviews, dossiers, allocationRecord }
//   generate(args)               → the record (category-generate.js generateCategoryPage), stubbed in tests
//   allocate({ ... })            → runs the allocation pass for one base page (neighbourhoods only)

const { computeCategoryDecisions } = require('./category-decisions');
const { ideasFromRecords } = require('./ideas');
const { parseDossier, cleanForCopy } = require('./geo-dossier');
const A = require('./allocation');

const ASSET = 'category_run';
const lc = s => String(s || '').toLowerCase().trim();
const normLoc = s => lc(s).replace(/[-_]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

// The pages the job writes, in order: base category pages, then location category pages
function pagesInOrder(rows) {
  const live = rows.filter(r => r.applies !== false && ((r.info && r.info.phase) || 1) === 1);
  return [...live.filter(r => r.type === 'category'), ...live.filter(r => r.type === 'location_category')];
}

// A record counts as done when it was generated (not blocked) and has no BLOCK left
const isGood = rec => !!rec && !rec.blocked && !rec.error && rec.VALIDATION && rec.VALIDATION.status === 'run' && rec.VALIDATION.block === 0;

function createCategoryRunner({ pool, v20Store, loadInputs, generate, allocate = null, log = console.log }) {
  const running = new Map(); // clientId → { startedAt, current }

  async function loadState(clientId) {
    const { rows } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id=$1 AND asset_type='${ASSET}' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    return rows.length ? { id: rows[0].id, state: typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content } : null;
  }
  async function saveState(clientId, state) {
    const existing = await loadState(clientId);
    const content = JSON.stringify(state);
    if (existing) await pool.query(`UPDATE client_assets SET content=$1, uploaded_at=NOW() WHERE id=$2`, [content, existing.id]);
    else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, '${ASSET}', 'category_run.json', $2)`, [clientId, content]);
  }

  // The town's dossier: profile (overview) and the village names
  function townData(dossiers, town) {
    const d = (dossiers || []).find(x => normLoc(x.locationName) === normLoc(town));
    if (!d) return null;
    const parsed = parseDossier(d.text);
    const names = Object.fromEntries(parsed.neighbourhoods.map(n => [n.id, n.name]));
    return { parsed, profile: cleanForCopy(parsed.overview || '', names), villages: parsed.neighbourhoods.map(n => n.name), id: d.id };
  }

  // The symptoms already used by the homepage and the pages written so far
  function takenSymptoms(records) {
    const taken = new Set();
    for (const { record } of records) {
      const block = (record && record.meta && record.meta.decisions_block) || '';
      for (const m of block.matchAll(/^\s*(?:Symptom for [^:\n]*|"[^"\n]+") ?(?:: "([^"\n]+)"|\(issue: ([^)\n]+)\))/gm)) { if (m[1]) taken.add(lc(m[1])); }
      for (const m of block.matchAll(/^\s+"([^"\n]+)" \(issue: /gm)) taken.add(lc(m[1]));
    }
    return taken;
  }

  // The decisions for one page (no model call, apart from the allocation pass for a base
  // page with no saved picks). Returns { decisionsResult, extraFlags, scope, category, town }.
  async function prepare(clientId, inputs, page, written) {
    const { ctx, niche, rows, tradeFacts, reviews, dossiers, allocationRecord } = inputs;
    const scope = page.type === 'category' ? 'base' : 'town';
    const catKey = page.info && page.info.category_key;
    const catRow = rows.find(r => r.applies !== false && r.type === 'category' && r.info && r.info.category_key === catKey);
    const category = catRow ? catRow.title : page.title;
    const town = scope === 'town' ? page.info.town : ctx.keyValueMap.biz_area_1;
    const extraFlags = [];

    // Ideas: the homepage, the sibling base pages and, for a town page, the base page of this category
    const prior = [{ page: 'homepage', record: written.homepage }];
    for (const w of written.pages) {
      if (scope === 'base' && w.scope === 'base') prior.push({ page: `${w.category} page`, record: w.record });
      if (scope === 'town' && w.scope === 'base' && w.category_key === catKey) prior.push({ page: `${w.category} base page`, record: w.record });
      if (scope === 'town' && w.scope === 'town' && lc(w.town) === lc(town) && w.category_key !== catKey) prior.push({ page: `${w.category} ${w.town} page`, record: w.record });
    }
    const ideasUsed = ideasFromRecords(prior);

    // Local research: the city dossier for a base page, the town's for a town page
    const cityDossier = (dossiers || []).find(d => normLoc(d.locationName) === normLoc(ctx.keyValueMap.biz_area_1));
    let allocation = null, townInfo = null, symptoms = [];
    const emergencyNiche = !!niche.emergency_niche;
    const takenS = takenSymptoms(prior);
    if (scope === 'base') {
      if (!cityDossier) extraFlags.push({ code: 'F-ALLOC', msg: `No saved dossier for ${ctx.keyValueMap.biz_area_1 || 'the base town'}.`, source: 'allocation' });
      else {
        const parsed = parseDossier(cityDossier.text);
        const names = Object.fromEntries(parsed.neighbourhoods.map(n => [n.id, n.name]));
        // Neighbourhoods: the saved allocation for this page, else the allocation pass with the taken ones removed
        const saved = allocationRecord && allocationRecord.pages && allocationRecord.pages[`category:${page.slug}`];
        const takenN = new Set([...(((allocationRecord && allocationRecord.pages && allocationRecord.pages.homepage) || {}).neighbourhoods || [])]);
        for (const [k, v] of Object.entries((allocationRecord && allocationRecord.pages) || {})) if (k.startsWith('category:') && k !== `category:${page.slug}`) for (const id of v.neighbourhoods || []) takenN.add(id);
        let picks = saved && saved.dossier_asset_id === cityDossier.id ? saved : null;
        if (!picks && allocate) {
          try {
            const got = await allocate({ dossierText: cityDossier.text, cv: ctx.cv, niche, keyValueMap: ctx.keyValueMap, pages: ctx.pages, page: { label: `category page: ${category}`, category, takenNeighbourhoods: [...takenN], slots: [] } });
            picks = { neighbourhoods: got.neighbourhoods, conservation_areas: got.conservation_areas, reasons: got.reasons, source: 'model', dossier_asset_id: cityDossier.id, at: new Date().toISOString() };
            for (const f of got.flags || []) if (!/No symptom/.test(f.msg)) extraFlags.push({ ...f, source: 'allocation' });
            if (allocationRecord) { allocationRecord.pages = allocationRecord.pages || {}; allocationRecord.pages[`category:${page.slug}`] = picks; await inputs.saveAllocation(allocationRecord); }
          } catch (e) { extraFlags.push({ code: 'F-ALLOC', msg: `The allocation pass failed for this page: ${e.message}`, source: 'allocation' }); }
        }
        if (picks) allocation = A.resolveAllocatedItems({ neighbourhoods: picks.neighbourhoods, symptoms: {}, conservation_areas: picks.conservation_areas || [] }, parsed);
        symptoms = A.symptomsForCategory(parsed, { category, emergencyNiche, limit: 5 }).filter(s => !takenS.has(lc(s.text)))
          .map(s => { const issue = parsed.issues.find(i => i.id === s.issueId); return { id: s.id, text: s.text, issueTitle: issue ? issue.title : '', issueText: issue ? cleanForCopy(issue.body, names) : '' }; });
      }
    } else {
      townInfo = townData(dossiers, town);
      if (townInfo) {
        const names = Object.fromEntries(townInfo.parsed.neighbourhoods.map(n => [n.id, n.name]));
        symptoms = A.symptomsForCategory(townInfo.parsed, { category, emergencyNiche, limit: 5 }).filter(s => !takenS.has(lc(s.text)))
          .map(s => { const issue = townInfo.parsed.issues.find(i => i.id === s.issueId); return { id: s.id, text: s.text, issueTitle: issue ? issue.title : '', issueText: issue ? cleanForCopy(issue.body, names) : '' }; });
      }
    }

    const decisionsResult = computeCategoryDecisions({ cv: ctx.cv, niche, keyValueMap: ctx.keyValueMap, rows, page, allocation, town: townInfo ? { profile: townInfo.profile, villages: townInfo.villages } : null, symptoms, ideasUsed, reviews, tradeFacts });
    return { decisionsResult, extraFlags, scope, category, town };
  }

  // The decisions and the model call for one page; never throws (the error goes in the record)
  async function writePage(clientId, inputs, page, written, { retries = true, claimsReview = true } = {}) {
    const { ctx, niche, calibrationPack, tradeFacts } = inputs;
    const { decisionsResult, extraFlags, scope, category, town } = await prepare(clientId, inputs, page, written);
    try {
      return await generate({ cv: ctx.cv, niche, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, decisionsResult, calibrationPack: calibrationPack.text, calibrationPackName: calibrationPack.name, tradeFacts, extraFlags, retries, claimsReview });
    } catch (e) {
      return { page: 'category', error: e.message, scope, category, town, page_slug: page.slug, FLAGS: [...extraFlags, { code: 'E-RUN', msg: e.message, source: 'run' }], VALIDATION: { status: 'not run' }, meta: { page_type: 'category', page_key: page.slug, scope, category, town, generated_at: new Date().toISOString(), decisions_block: decisionsResult.decisionsBlock || null, failed: true } };
    }
  }

  // The run. opts: { resume: true (skip pages with a good record), keys: [slugs] (only these), retries, claimsReview }
  async function run(clientId, opts = {}) {
    if (running.has(clientId)) throw Object.assign(new Error('A category pages run is already in progress for this client.'), { status: 409 });
    running.set(clientId, { startedAt: new Date().toISOString(), current: null });
    try {
      const inputs = await loadInputs(clientId);
      const { rows } = inputs;
      const order = pagesInOrder(rows).filter(p => !opts.keys || opts.keys.includes(p.slug));
      const state = { started_at: new Date().toISOString(), finished_at: null, resume: !!opts.resume, pages: order.map(p => ({ key: p.slug, title: p.title, scope: p.type === 'category' ? 'base' : 'town', status: 'pending' })) };
      await saveState(clientId, state);
      const latest = async key => { const f = await v20Store.latest(clientId, { type: 'category', key }); return f ? f.record : null; };
      const written = { homepage: (await v20Store.latest(clientId, { type: 'homepage', key: 'homepage' }) || {}).record || null, pages: [] };
      // Pages already written stay in the ideas list, whether or not they run again
      const allPages = pagesInOrder(rows);
      const catKeyOf = p => p.info && p.info.category_key;
      const catName = k => { const r = rows.find(x => x.type === 'category' && x.info && x.info.category_key === k); return r ? r.title : k; };
      for (const p of order) {
        const st = state.pages.find(s => s.key === p.slug);
        running.get(clientId).current = p.slug;
        const existing = await latest(p.slug);
        if (opts.resume && isGood(existing)) {
          st.status = 'kept'; st.block = 0; st.flag = existing.VALIDATION.flag; st.at = existing.meta && existing.meta.generated_at;
          written.pages.push({ scope: st.scope, category: catName(catKeyOf(p)), category_key: catKeyOf(p), town: p.info.town || null, record: existing });
          await saveState(clientId, state);
          continue;
        }
        st.status = 'running';
        await saveState(clientId, state);
        const record = await writePage(clientId, inputs, p, written, opts);
        const id = await v20Store.insert(clientId, record, { type: 'category', key: p.slug });
        st.status = record.error ? 'failed' : record.blocked ? 'blocked' : 'done';
        st.error = record.error || (record.blocked ? (record.FLAGS || []).filter(f => f.source === 'gate').map(f => f.msg).join('; ') : null);
        st.block = record.VALIDATION ? record.VALIDATION.block : null;
        st.flag = record.VALIDATION ? record.VALIDATION.flag : null;
        st.record_id = id;
        st.at = record.meta && record.meta.generated_at;
        written.pages.push({ scope: st.scope, category: catName(catKeyOf(p)), category_key: catKeyOf(p), town: (p.info && p.info.town) || null, record });
        log(`[category] ${p.title} for ${clientId}: ${st.status}${st.block != null ? ` (${st.block} BLOCK, ${st.flag} FLAG)` : ''}${st.error ? `: ${st.error}` : ''}`);
        await saveState(clientId, state);
      }
      // Pages outside this run's keys that already have records are not in the state list
      void allPages;
      state.finished_at = new Date().toISOString();
      await saveState(clientId, state);
      return state;
    } finally {
      running.delete(clientId);
    }
  }

  // The pages already written, as a run sees them, for one page checked on its own
  async function writtenFor(clientId, rows, exceptKey) {
    const catName = k => { const r = rows.find(x => x.type === 'category' && x.info && x.info.category_key === k); return r ? r.title : k; };
    const written = { homepage: (await v20Store.latest(clientId, { type: 'homepage', key: 'homepage' }) || {}).record || null, pages: [] };
    for (const p of pagesInOrder(rows)) {
      if (p.slug === exceptKey) continue;
      const f = await v20Store.latest(clientId, { type: 'category', key: p.slug });
      if (f && f.record && !f.record.blocked) written.pages.push({ scope: p.type === 'category' ? 'base' : 'town', category: catName(p.info.category_key), category_key: p.info.category_key, town: (p.info && p.info.town) || null, record: f.record });
    }
    return written;
  }

  // The panel: every page in order with its latest record's summary and the run state
  async function view(clientId, rows) {
    const st = await loadState(clientId);
    const pages = [];
    for (const p of pagesInOrder(rows)) {
      const f = await v20Store.latest(clientId, { type: 'category', key: p.slug });
      const r = f && f.record;
      pages.push({
        key: p.slug, title: p.title, h1: p.h1 || '', scope: p.type === 'category' ? 'base' : 'town', town: (p.info && p.info.town) || null,
        record: r ? { id: f.id, at: r.meta && (r.meta.edited_at || r.meta.generated_at), blocked: !!r.blocked, error: r.error || null, block: r.VALIDATION ? r.VALIDATION.block : null, flag: r.VALIDATION ? r.VALIDATION.flag : null, claims: r.CLAIMS && r.CLAIMS.findings ? r.CLAIMS.findings.length - ((r.CLAIMS.accepted || []).length) : null, good: isGood(r), flags: (r.FLAGS || []).length } : null,
      });
    }
    return { pages, run: st ? st.state : null, running: running.has(clientId) ? running.get(clientId) : null };
  }

  return { run, view, loadState, pagesInOrder, isGood, prepare, writePage, writtenFor, running };
}

module.exports = { createCategoryRunner, pagesInOrder, isGood };
