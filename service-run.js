'use strict';

// ── The service pages job (CORE (17), 25 Oct 2026) ───────────────────────────
// Writes every service page and town service page of a client: base pages first (page
// map order), then the town pages, so the ideas and mechanisms lists are full before a
// town page runs. The category pages come first (category-run.js): a service page whose
// parent category page (the base category page, or the location category page in its
// town where one exists) has no record is skipped with "category page not written yet".
// An unverified or missing trade facts pack refuses the whole run (trade-facts/store.js
// serviceGate). A page that fails is recorded with its error and the run carries on; a
// resume writes only the pages with no good record. The run's state lives in one
// client_assets row (asset_type service_run).
//
// createServiceRunner({ pool, v20Store, loadInputs, generate, allocate }) where
//   loadInputs(clientId)  → { ctx, niche, rows, calibrationPack, tradeFacts, reviews, dossiers, allocationRecord, saveAllocation }
//                           tradeFacts: { niche, file, verified, message } (the serviceGate's answer)
//   generate(args)        → the record (service-generate.js generateServicePage), stubbed in tests
//   allocate({ ... })     → the allocation pass for one base page (neighbourhoods only)

const { computeServiceDecisions, namesOf, baseRowOf } = require('./service-decisions');
const { ideasFromRecords } = require('./ideas');
const { parseDossier, cleanForCopy } = require('./geo-dossier');
const A = require('./allocation');
const P = require('./trade-facts/pack');

const ASSET = 'service_run';
const lc = s => String(s || '').toLowerCase().trim();
const normLoc = s => lc(s).replace(/[-_]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const live = r => r && r.applies !== false && ((r.info && r.info.phase) || 1) === 1;

// The pages the job writes, in order: base service pages, then town service pages
function pagesInOrder(rows) {
  const l = rows.filter(live);
  return [...l.filter(r => r.type === 'service'), ...l.filter(r => r.type === 'town_service')];
}

// A record counts as done when it was generated (not blocked) and has no BLOCK left
const isGood = rec => !!rec && !rec.blocked && !rec.error && rec.VALIDATION && rec.VALIDATION.status === 'run' && rec.VALIDATION.block === 0;

// The base service row of a page, its category key and its parent category page's key
function parentsOf(rows, page) {
  const applies = rows.filter(r => r.applies !== false);
  const baseRow = page.type === 'service' ? page : baseRowOf(applies, page);
  const serviceName = baseRow ? baseRow.title : ((page.info && page.info.service_name) || page.title);
  const catKey = (page.info && page.info.category_key) || ((baseRow && baseRow.info && baseRow.info.parent_keys) || [])[0] || null;
  const catRow = catKey ? applies.find(r => r.type === 'category' && r.info && r.info.category_key === catKey) : null;
  const town = page.type === 'town_service' ? ((page.info && page.info.town) || '') : '';
  const locCat = town ? applies.find(r => r.type === 'location_category' && live(r) && r.info && r.info.category_key === catKey && normLoc(r.info.town) === normLoc(town)) : null;
  return { baseRow, serviceName, catKey, catRow, category: catRow ? catRow.title : '', town, parentPage: locCat || catRow || null, parentKey: (locCat || catRow || {}).slug || null };
}

// The block 4 causes a record made: meta.mechanisms, else read from its decisions block
function mechanismsOf(record) {
  if (!record || record.blocked || record.error) return [];
  if (Array.isArray(record.meta && record.meta.mechanisms)) return record.meta.mechanisms;
  const block = (record.meta && record.meta.decisions_block) || '';
  return [...block.matchAll(/^\s*Mechanism \([^)]*\): (.+)$/gm)].map(m => m[1].trim());
}

function createServiceRunner({ pool, v20Store, loadInputs, generate, allocate = null, log = console.log }) {
  const running = new Map();

  async function loadState(clientId) {
    const { rows } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id=$1 AND asset_type='${ASSET}' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    return rows.length ? { id: rows[0].id, state: typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content } : null;
  }
  async function saveState(clientId, state) {
    const existing = await loadState(clientId);
    const content = JSON.stringify(state);
    if (existing) await pool.query(`UPDATE client_assets SET content=$1, uploaded_at=NOW() WHERE id=$2`, [content, existing.id]);
    else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, '${ASSET}', 'service_run.json', $2)`, [clientId, content]);
  }

  function townData(dossiers, town) {
    const d = (dossiers || []).find(x => normLoc(x.locationName) === normLoc(town));
    if (!d) return null;
    const parsed = parseDossier(d.text);
    const names = Object.fromEntries(parsed.neighbourhoods.map(n => [n.id, n.name]));
    return { parsed, profile: cleanForCopy(parsed.overview || '', names), villages: parsed.neighbourhoods.map(n => n.name), id: d.id };
  }

  // The symptoms the homepage, the category pages and the pages written so far already used
  function takenSymptoms(records) {
    const taken = new Set();
    for (const { record } of records) {
      const block = (record && record.meta && record.meta.decisions_block) || '';
      for (const m of block.matchAll(/^\s*(?:Symptom for [^:\n]*|"[^"\n]+") ?(?:: "([^"\n]+)"|\(issue: ([^)\n]+)\))/gm)) { if (m[1]) taken.add(lc(m[1])); }
      for (const m of block.matchAll(/^\s+"([^"\n]+)" \(issue: /gm)) taken.add(lc(m[1]));
    }
    return taken;
  }

  // The service's trade facts rows: the gate's answer plus the tagged rows when the pack is verified
  function factsFor(tradeFacts, baseRow) {
    if (!tradeFacts || !tradeFacts.verified) return tradeFacts ? { ...tradeFacts, verified: false } : null;
    try { return { ...tradeFacts, ...P.rowsForService(tradeFacts.niche, baseRow.title, { names: namesOf(baseRow) }) }; }
    catch (e) { return { ...tradeFacts, verified: false, message: e.message }; }
  }

  // The decisions for one page (no model call, apart from the allocation pass for a base
  // page with no saved picks). Returns { decisionsResult, extraFlags, scope, service, category, town, parentKey, parentWritten }.
  async function prepare(clientId, inputs, page, written) {
    const { ctx, niche, rows, tradeFacts, reviews, dossiers, allocationRecord } = inputs;
    const scope = page.type === 'service' ? 'base' : 'town';
    const { baseRow, serviceName, catKey, category, parentKey } = parentsOf(rows, page);
    const town = scope === 'town' ? page.info.town : ctx.keyValueMap.biz_area_1;
    const extraFlags = [];
    const parent = parentKey ? (written.categories || {})[parentKey] || null : null;
    if (!parent) extraFlags.push({ code: 'F-CATEGORY', msg: `The parent category page${parentKey ? ` ${parentKey}` : ''} is not written yet: MECHANISMS USED and IDEAS USED ELSEWHERE carry nothing from it.`, source: 'run' });

    // Ideas: the homepage, the parent category page, and the sibling service pages (base: the
    // siblings in this category; town: this service's base page and the siblings in this town)
    const prior = [{ page: 'homepage', record: written.homepage }];
    if (parent) prior.push({ page: `${category}${scope === 'town' ? ` ${town}` : ''} category page`, record: parent });
    const mech = [];
    if (parent) for (const t of mechanismsOf(parent)) mech.push({ page: `${category}${scope === 'town' ? ` ${town}` : ''} category page`, text: t });
    for (const w of written.pages) {
      const sibling = (scope === 'base' && w.scope === 'base' && w.category_key === catKey && lc(w.service) !== lc(serviceName))
        || (scope === 'town' && w.scope === 'base' && lc(w.service) === lc(serviceName))
        || (scope === 'town' && w.scope === 'town' && lc(w.town) === lc(town) && lc(w.service) !== lc(serviceName));
      if (!sibling) continue;
      const label = `${w.service}${w.scope === 'town' ? ` ${w.town}` : ''} page`;
      prior.push({ page: label, record: w.record });
      for (const t of mechanismsOf(w.record)) mech.push({ page: label, text: t });
    }
    const ideasUsed = ideasFromRecords(prior);
    const mechanismsUsed = mech.filter((m, i, a) => a.findIndex(x => lc(x.text) === lc(m.text)) === i);

    // Local research: the city dossier for a base page, the town's for a town page
    const cityDossier = (dossiers || []).find(d => normLoc(d.locationName) === normLoc(ctx.keyValueMap.biz_area_1));
    let allocation = null, townInfo = null, symptoms = [];
    const emergencyNiche = !!niche.emergency_niche;
    const takenS = takenSymptoms([...prior, ...Object.values(written.categories || {}).map(record => ({ record }))]);
    const symptomArgs = parsed => ({ service: baseRow ? baseRow.title : serviceName, names: namesOf(baseRow), category, emergencyNiche, limit: 5 });
    if (scope === 'base') {
      if (!cityDossier) extraFlags.push({ code: 'F-ALLOC', msg: `No saved dossier for ${ctx.keyValueMap.biz_area_1 || 'the base town'}.`, source: 'allocation' });
      else {
        const parsed = parseDossier(cityDossier.text);
        const names = Object.fromEntries(parsed.neighbourhoods.map(n => [n.id, n.name]));
        const pagesA = (allocationRecord && allocationRecord.pages) || {};
        const saved = pagesA[`service:${page.slug}`];
        const takenN = new Set();
        for (const [k, v] of Object.entries(pagesA)) if (k !== `service:${page.slug}`) for (const id of v.neighbourhoods || []) takenN.add(id);
        let picks = saved && saved.dossier_asset_id === cityDossier.id ? saved : null;
        if (!picks && allocate) {
          try {
            const got = await allocate({ dossierText: cityDossier.text, cv: ctx.cv, niche, keyValueMap: ctx.keyValueMap, pages: ctx.pages, page: { label: `service page: ${serviceName}`, category, takenNeighbourhoods: [...takenN], slots: [] } });
            picks = { neighbourhoods: got.neighbourhoods, conservation_areas: got.conservation_areas, reasons: got.reasons, source: 'model', dossier_asset_id: cityDossier.id, at: new Date().toISOString() };
            for (const f of got.flags || []) if (!/No symptom/.test(f.msg)) extraFlags.push({ ...f, source: 'allocation' });
            if (allocationRecord) { allocationRecord.pages = allocationRecord.pages || {}; allocationRecord.pages[`service:${page.slug}`] = picks; await inputs.saveAllocation(allocationRecord); }
          } catch (e) { extraFlags.push({ code: 'F-ALLOC', msg: `The allocation pass failed for this page: ${e.message}`, source: 'allocation' }); }
        }
        if (picks) allocation = A.resolveAllocatedItems({ neighbourhoods: picks.neighbourhoods, symptoms: {}, conservation_areas: picks.conservation_areas || [] }, parsed);
        symptoms = A.symptomsForService(parsed, symptomArgs(parsed)).filter(s => !takenS.has(lc(s.text)))
          .map(s => { const issue = parsed.issues.find(i => i.id === s.issueId); return { id: s.id, text: s.text, issueTitle: issue ? issue.title : '', issueText: issue ? cleanForCopy(issue.body, names) : '' }; });
      }
    } else {
      townInfo = townData(dossiers, town);
      if (townInfo) {
        const names = Object.fromEntries(townInfo.parsed.neighbourhoods.map(n => [n.id, n.name]));
        symptoms = A.symptomsForService(townInfo.parsed, symptomArgs(townInfo.parsed)).filter(s => !takenS.has(lc(s.text)))
          .map(s => { const issue = townInfo.parsed.issues.find(i => i.id === s.issueId); return { id: s.id, text: s.text, issueTitle: issue ? issue.title : '', issueText: issue ? cleanForCopy(issue.body, names) : '' }; });
      }
    }

    const facts = baseRow ? factsFor(tradeFacts, baseRow) : tradeFacts;
    const decisionsResult = computeServiceDecisions({ cv: ctx.cv, niche, keyValueMap: ctx.keyValueMap, rows, page, allocation, town: townInfo ? { profile: townInfo.profile, villages: townInfo.villages } : null, symptoms, ideasUsed, mechanismsUsed, reviews, tradeFacts: facts });
    return { decisionsResult, extraFlags, scope, service: serviceName, category, town, parentKey, parentWritten: !!parent, tradeFacts: facts };
  }

  // The decisions and the model call for one page; never throws (the error goes in the record)
  async function writePage(clientId, inputs, page, written, { retries = true, claimsReview = true, qualityReview = false } = {}) {
    const { ctx, niche, calibrationPack } = inputs;
    const { decisionsResult, extraFlags, scope, service, category, town, tradeFacts } = await prepare(clientId, inputs, page, written);
    try {
      return await generate({ cv: ctx.cv, niche, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, decisionsResult, calibrationPack: calibrationPack.text, calibrationPackName: calibrationPack.name, tradeFacts, extraFlags, retries, claimsReview, qualityReview });
    } catch (e) {
      return { page: 'service', error: e.message, scope, service, category, town, page_slug: page.slug, FLAGS: [...extraFlags, { code: 'E-RUN', msg: e.message, source: 'run' }], VALIDATION: { status: 'not run' }, meta: { page_type: 'service', page_key: page.slug, scope, service, category, town, generated_at: new Date().toISOString(), decisions_block: decisionsResult.decisionsBlock || null, failed: true } };
    }
  }

  // The category records a run reads: every category and location category page's latest record
  async function categoriesWritten(clientId, rows) {
    const out = {};
    for (const r of rows.filter(x => live(x) && ['category', 'location_category'].includes(x.type))) {
      const f = await v20Store.latest(clientId, { type: 'category', key: r.slug });
      if (f && f.record && !f.record.blocked && !f.record.error) out[r.slug] = f.record;
    }
    return out;
  }
  const entryFor = (rows, p, record) => { const { serviceName, catKey } = parentsOf(rows, p); return { scope: p.type === 'service' ? 'base' : 'town', service: serviceName, category_key: catKey, town: (p.info && p.info.town) || null, record }; };

  // The run. opts: { resume: true (skip pages with a good record), keys: [slugs] (only these), retries, claimsReview, qualityReview }
  async function run(clientId, opts = {}) {
    if (running.has(clientId)) throw Object.assign(new Error('A service pages run is already in progress for this client.'), { status: 409 });
    running.set(clientId, { startedAt: new Date().toISOString(), current: null });
    try {
      const inputs = await loadInputs(clientId);
      const { rows, tradeFacts } = inputs;
      // The pack is the page's main material: no run without a verified one
      if (!tradeFacts || !tradeFacts.verified) throw Object.assign(new Error((tradeFacts && tradeFacts.message) || 'Service pages are blocked: the trade facts pack for this niche is missing or not verified. Verify it on the Trade facts page.'), { status: 422 });
      const order = pagesInOrder(rows).filter(p => !opts.keys || opts.keys.includes(p.slug));
      const state = { started_at: new Date().toISOString(), finished_at: null, resume: !!opts.resume, pages: order.map(p => ({ key: p.slug, title: p.title, scope: p.type === 'service' ? 'base' : 'town', status: 'pending' })) };
      await saveState(clientId, state);
      const latest = async key => { const f = await v20Store.latest(clientId, { type: 'service', key }); return f ? f.record : null; };
      const written = { homepage: (await v20Store.latest(clientId, { type: 'homepage', key: 'homepage' }) || {}).record || null, categories: await categoriesWritten(clientId, rows), pages: [] };
      // Pages outside this run's keys that are already written still feed the ideas list
      for (const p of pagesInOrder(rows)) {
        if (order.includes(p)) continue;
        const r = await latest(p.slug);
        if (r && !r.blocked && !r.error) written.pages.push(entryFor(rows, p, r));
      }
      for (const p of order) {
        const st = state.pages.find(s => s.key === p.slug);
        running.get(clientId).current = p.slug;
        const existing = await latest(p.slug);
        if (opts.resume && isGood(existing)) {
          st.status = 'kept'; st.block = 0; st.flag = existing.VALIDATION.flag; st.at = existing.meta && existing.meta.generated_at;
          written.pages.push(entryFor(rows, p, existing));
          await saveState(clientId, state);
          continue;
        }
        const { parentKey } = parentsOf(rows, p);
        if (!parentKey || !written.categories[parentKey]) {
          st.status = 'skipped'; st.error = `category page not written yet${parentKey ? ` (${parentKey})` : ''}`;
          log(`[service] ${p.title} for ${clientId}: skipped: ${st.error}`);
          await saveState(clientId, state);
          continue;
        }
        st.status = 'running';
        await saveState(clientId, state);
        const record = await writePage(clientId, inputs, p, written, opts);
        const id = await v20Store.insert(clientId, record, { type: 'service', key: p.slug });
        st.status = record.error ? 'failed' : record.blocked ? 'blocked' : 'done';
        st.error = record.error || (record.blocked ? (record.FLAGS || []).filter(f => f.source === 'gate').map(f => f.msg).join('; ') : null);
        st.block = record.VALIDATION ? record.VALIDATION.block : null;
        st.flag = record.VALIDATION ? record.VALIDATION.flag : null;
        st.record_id = id;
        st.at = record.meta && record.meta.generated_at;
        written.pages.push(entryFor(rows, p, record));
        log(`[service] ${p.title} for ${clientId}: ${st.status}${st.block != null ? ` (${st.block} BLOCK, ${st.flag} FLAG)` : ''}${st.error ? `: ${st.error}` : ''}`);
        await saveState(clientId, state);
      }
      state.finished_at = new Date().toISOString();
      await saveState(clientId, state);
      return state;
    } finally {
      running.delete(clientId);
    }
  }

  // The pages already written, as a run sees them, for one page checked on its own
  async function writtenFor(clientId, rows, exceptKey) {
    const written = { homepage: (await v20Store.latest(clientId, { type: 'homepage', key: 'homepage' }) || {}).record || null, categories: await categoriesWritten(clientId, rows), pages: [] };
    for (const p of pagesInOrder(rows)) {
      if (p.slug === exceptKey) continue;
      const f = await v20Store.latest(clientId, { type: 'service', key: p.slug });
      if (f && f.record && !f.record.blocked) written.pages.push(entryFor(rows, p, f.record));
    }
    return written;
  }

  // The panel: every page in order with its latest record's summary, its parent category page's state and the run state
  async function view(clientId, rows) {
    const st = await loadState(clientId);
    const categories = await categoriesWritten(clientId, rows);
    const pages = [];
    for (const p of pagesInOrder(rows)) {
      const f = await v20Store.latest(clientId, { type: 'service', key: p.slug });
      const r = f && f.record;
      const { parentKey, category } = parentsOf(rows, p);
      pages.push({
        key: p.slug, title: p.title, h1: p.h1 || '', scope: p.type === 'service' ? 'base' : 'town', town: (p.info && p.info.town) || null, category, parent_key: parentKey, parent_written: !!(parentKey && categories[parentKey]),
        record: r ? { id: f.id, at: r.meta && (r.meta.edited_at || r.meta.generated_at), blocked: !!r.blocked, error: r.error || null, block: r.VALIDATION ? r.VALIDATION.block : null, flag: r.VALIDATION ? r.VALIDATION.flag : null, claims: r.CLAIMS && r.CLAIMS.findings ? r.CLAIMS.findings.length - ((r.CLAIMS.accepted || []).length) : null, good: isGood(r), flags: (r.FLAGS || []).length } : null,
      });
    }
    return { pages, run: st ? st.state : null, running: running.has(clientId) ? running.get(clientId) : null };
  }

  return { run, view, loadState, pagesInOrder, isGood, prepare, writePage, writtenFor, running, parentsOf };
}

module.exports = { createServiceRunner, pagesInOrder, isGood, parentsOf, mechanismsOf };
