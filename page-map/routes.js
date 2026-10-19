'use strict';

// ── Page map and "Set up by hand" routes ────────────────────────────────────
// Mounted after the login middleware, beside fillout/routes.js mountApi.
//   GET  /api/clients/:id/page-map              saved rows, last run, readiness
//   GET  /api/clients/:id/page-map/preview      dry run: would add / retire / update / unchanged
//   POST /api/clients/:id/page-map/generate     write the plan
//   PUT  /api/clients/:id/page-map/:rowId       a person's edit (h1, meta, status, notes)
//   GET  /api/clients/:id/page-map.csv          the old PAGE MAP tab's columns
//   GET  /api/clients/:id/services/by-hand      what the hand set-up editor needs
//   PUT  /api/clients/:id/services/by-hand      save niche, ticks and towns as hand edits

const R = require('../fillout/services/resolver');
const N = require('../fillout/niches');
const { createPageMapStore } = require('./store');
const { createH1Research } = require('../h1-research/service');
const D = require('../h1-research/dataforseo');

const RULES = ['ticked_only', 'ticked_or_propagated'];
const ruleOf = v => (RULES.includes(v) ? v : 'ticked_only');

// Niches that have a categories file, as the record's niche label
function configuredNiches() {
  return N.loadNiches().map(n => ({ label: n.label, config: R.configFor(n.label) })).filter(n => n.config);
}

async function byHandView(svc, clientId) {
  const rec = await svc.record(clientId);
  if (!rec) throw Object.assign(new Error('Client not found'), { status: 404 });
  const fields = rec.sections.flatMap(s => s.fields);
  const val = k => { const f = fields.find(x => x.key === k); return f ? f.value : null; };
  const src = k => { const f = fields.find(x => x.key === k); return f ? f.source : null; };
  const suggested = rec.nicheKnown ? rec.niche : (N.suggestedNicheKey(rec.client.trade) ? N.nicheLabel(N.suggestedNicheKey(rec.client.trade)) : null);
  const niches = configuredNiches();
  const pick = niches.find(n => n.label === (rec.nicheKnown ? rec.niche : suggested)) || null;
  return {
    hasFillout: rec.submissions.length > 0,
    niche: rec.nicheKnown ? rec.niche : null, suggestedNiche: suggested,
    niches: niches.map(n => n.label),
    groups: pick ? pick.config.categories.map(c => ({ key: c.key, name: c.name, field: c.tickGroup, options: c.ticks || [], ticked: Array.isArray(val(c.tickGroup)) ? val(c.tickGroup) : [], source: src(c.tickGroup) })) : [],
    baseTown: typeof val('primary_town') === 'string' ? val('primary_town') : '',
    otherTowns: typeof val('other_areas') === 'string' ? val('other_areas') : '',
    companyName: typeof val('business_name') === 'string' ? val('business_name') : '',
    clientName: rec.client.name,
  };
}

// body: { niche, ticks: { [field]: [names] }, baseTown, otherTowns, companyName }
async function saveByHand(svc, clientId, body) {
  const b = body || {};
  const niches = configuredNiches();
  const niche = niches.find(n => n.label === b.niche);
  if (!niche) throw Object.assign(new Error(`Choose a niche that has a categories file: ${niches.map(n => n.label).join(', ')}`), { status: 400 });
  const cur = await byHandView(svc, clientId);
  if (cur.niche !== niche.label) await svc.setField(clientId, 'niche', niche.label);
  const ticks = b.ticks || {};
  for (const c of niche.config.categories) {
    if (!(c.tickGroup in ticks)) continue;
    const allowed = new Set((c.ticks || []).map(R.norm));
    const chosen = (Array.isArray(ticks[c.tickGroup]) ? ticks[c.tickGroup] : []).filter(t => allowed.has(R.norm(t)));
    // Keep the form's order and spelling
    await svc.setField(clientId, c.tickGroup, (c.ticks || []).filter(t => chosen.some(x => R.norm(x) === R.norm(t))));
  }
  const towns = s => String(s || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean).join('\n');
  if (b.baseTown !== undefined) await svc.setField(clientId, 'primary_town', String(b.baseTown || '').trim());
  if (b.otherTowns !== undefined) await svc.setField(clientId, 'other_areas', towns(b.otherTowns));
  if (b.companyName !== undefined) await svc.setField(clientId, 'business_name', String(b.companyName || '').trim());
  return byHandView(svc, clientId);
}

// searchVolume / balanceOf: stubs for tests; the real DataForSEO calls otherwise
function mountPageMapApi(app, { pool, filloutService, searchVolume = D.searchVolume, balanceOf = D.balance, recover = true, log = console }) {
  // The dry run and the direct Generate route plan with the keyword cache; the one-click job looks volumes up first
  let cacheLookup = async () => new Map();
  const store = createPageMapStore({ pool, filloutService, volumesFor: kws => cacheLookup(kws) });
  const h1 = createH1Research({ pool, filloutService, pageMapStore: store, searchVolume: (kws, opts) => searchVolume(kws, opts), log });
  cacheLookup = kws => h1.cached(kws);
  // Jobs a restart interrupted are picked up again
  if (recover) setImmediate(() => h1.recover().catch(err => log.error('[h1-research] recovery failed:', D.safeMessage(err.message))));
  let balanceCache = null;
  const wrap = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (err) { res.status(err.status || 500).json({ error: err.message, problems: err.problems }); }
  };
  const summary = p => ({
    ok: p.plan.ok, problems: p.plan.problems, counts: p.plan.counts, arithmetic: p.plan.arithmetic,
    collisions: p.plan.collisions, waiting: p.plan.waiting, droppedTowns: p.plan.droppedTowns, councilAreas: p.plan.councilAreas || [],
    diff: p.diff ? { counts: p.diff.counts, renames: p.diff.renames, retiringWorkedOn: p.diff.retiringWorkedOn,
      add: [...p.diff.add.map(r => r.title), ...p.diff.revive.map(x => x.row.title)], retire: p.diff.retire.map(r => r.title) } : null,
    firstRun: p.firstRun,
    services: p.plan.serviceCounts || null, townServicePages: p.plan.townServicePages || null, volumesFrom: p.plan.volumesFrom || null, arithmetic: p.plan.arithmetic,
    phases: p.plan.counts ? { phase1: p.plan.counts.phase1, phase2: p.plan.counts.phase2 } : null, library: p.plan.libraryCounts || null, launchTowns: p.plan.launchTowns || [], phase2Published: !!p.plan.phase2Published,
    inputs: { niche: p.inputs.niche, hasConfig: p.inputs.hasConfig, baseTown: p.inputs.baseTown, otherTowns: p.inputs.otherTowns, companyName: p.inputs.companyName, categoryTabRule: p.inputs.categoryTabRule,
      tabs: p.inputs.resolved ? p.inputs.resolved.categories.length : 0, attentionCount: p.inputs.attentionCount },
  });

  app.get('/api/clients/:clientId/page-map.csv', wrap(async (req, res) => {
    const rec = await filloutService.record(req.params.clientId);
    if (!rec) return res.status(404).json({ error: 'Client not found.' });
    const name = String(rec.client.name || 'client').replace(/[^a-zA-Z0-9_-]+/g, '_');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}_page_map.csv"`);
    res.send('﻿' + await store.csv(req.params.clientId, { includeRetired: req.query.retired === '1' }));
  }));
  app.get('/api/clients/:clientId/page-map', wrap(async (req, res) => {
    res.json({ rows: await store.saved(req.params.clientId), state: await store.state(req.params.clientId), candidates: await h1.candidates(req.params.clientId), job: await h1.latest(req.params.clientId), excluded: [...await store.excludeFlags(req.params.clientId)], launchTowns: [...await store.launchTowns(req.params.clientId)] });
  }));
  // The one-click flow: build the page map, then research H1s, in the background
  app.post('/api/clients/:clientId/page-map/run', wrap(async (req, res) => {
    const p = await store.preview(req.params.clientId, { categoryTabRule: ruleOf((req.body || {}).rule) });
    if (!p.plan.ok) return res.status(400).json({ error: p.plan.problems.map(x => x.msg).join(' '), problems: p.plan.problems });
    res.json({ job: await h1.start(req.params.clientId, { kind: 'generate', categoryTabRule: ruleOf((req.body || {}).rule) }) });
  }));
  // Re-research H1s: the preview first (what would change), then apply after a person confirms
  app.get('/api/clients/:clientId/h1-research/preview', wrap(async (req, res) => {
    const rows = await store.saved(req.params.clientId);
    if (!rows.length) return res.status(400).json({ error: 'No page map yet: generate it first.' });
    try { res.json(await h1.preview(req.params.clientId)); }
    catch (err) { res.status(502).json({ error: `${err.status ? `status ${err.status}: ` : ''}${D.safeMessage(err.message)}` }); }
  }));
  app.post('/api/clients/:clientId/h1-research', wrap(async (req, res) => {
    const rows = await store.saved(req.params.clientId);
    if (!rows.length) return res.status(400).json({ error: 'No page map yet: generate it first.' });
    res.json({ job: await h1.start(req.params.clientId, { kind: 'research' }) });
  }));
  app.post('/api/clients/:clientId/h1-research/retry', wrap(async (req, res) => {
    const last = await h1.latest(req.params.clientId);
    const rows = await store.saved(req.params.clientId);
    const rebuild = !rows.length || (last && last.kind === 'generate' && last.status === 'failed' && last.pages_built < last.pages_total);
    res.json({ job: await h1.start(req.params.clientId, { kind: rebuild ? 'generate' : 'research', categoryTabRule: last && last.category_tab_rule, mode: last && last.mode }) });
  }));
  app.get('/api/clients/:clientId/h1-research', wrap(async (req, res) => res.json({ job: await h1.latest(req.params.clientId) })));
  // The DataForSEO balance (free call), cached for ten minutes; low below $10
  app.get('/api/dataforseo/balance', wrap(async (req, res) => {
    if (!balanceCache || Date.now() - balanceCache.at > 600000) {
      try { const b = await balanceOf(); balanceCache = { at: Date.now(), body: { balance: b, low: b < 10 } }; }
      catch (err) { balanceCache = { at: Date.now() - 540000, body: { error: `${err.status ? `status ${err.status}: ` : ''}${D.safeMessage(err.message)}` } }; }
    }
    res.json(balanceCache.body);
  }));
  app.get('/api/clients/:clientId/page-map/preview', wrap(async (req, res) => {
    res.json(summary(await store.preview(req.params.clientId, { categoryTabRule: ruleOf(req.query.rule) })));
  }));
  app.post('/api/clients/:clientId/page-map/generate', wrap(async (req, res) => {
    const out = await store.generate(req.params.clientId, { categoryTabRule: ruleOf((req.body || {}).rule) });
    res.json({ rows: out.rows, state: await store.state(req.params.clientId), counts: out.diff.counts, renames: out.diff.renames, collisions: out.plan.collisions });
  }));
  app.put('/api/clients/:clientId/page-map/:rowId', wrap(async (req, res) => res.json(await store.setRow(req.params.clientId, req.params.rowId, req.body || {}))));

  // Old-rules migration (Brandon, 20 Oct 2026): a client whose page map still carries research from before
  // 19 Oct gets the current page map and research applied without confirmation (the usual limits: Not
  // Started or H1 Added, not manual; Copy Generated and later only get "research now suggests")
  app.post('/api/clients/:clientId/page-map/migrate', wrap(async (req, res) => {
    const rows = await store.saved(req.params.clientId);
    const old = rows.filter(r => r.applies && (r.h1_source === 'suggested' || (r.h1_source === 'needed' && r.h1_researched_at)));
    if (!old.length) return res.json({ job: null, migrated: 0, note: 'nothing on the old rules' });
    const last = await store.state(req.params.clientId);
    res.json({ job: await h1.start(req.params.clientId, { kind: 'generate', categoryTabRule: (last && last.category_tab_rule) || 'ticked_only', mode: 'all' }), migrated: old.length });
  }));
  // Launch towns (phase 1); "Publish phase 2" flips phase-2 pages to publish and plans the links again
  app.put('/api/clients/:clientId/towns/:town/launch', wrap(async (req, res) => res.json({ launchTowns: [...await store.setLaunchTown(req.params.clientId, req.params.town, !!(req.body || {}).launch)] })));
  app.post('/api/clients/:clientId/page-map/publish-phase-2', wrap(async (req, res) => {
    const out = await store.publishPhase2(req.params.clientId);
    res.json({ rows: out.rows, state: await store.state(req.params.clientId), counts: out.diff.counts });
  }));
  // A person excludes a service at intake: mentioned on its category page, no page (applied at the next generation)
  app.put('/api/clients/:clientId/services/:serviceId/exclude', wrap(async (req, res) => res.json({ excluded: [...await store.setExclude(req.params.clientId, req.params.serviceId, !!(req.body || {}).excluded)] })));
  app.get('/api/clients/:clientId/services/by-hand', wrap(async (req, res) => res.json(await byHandView(filloutService, req.params.clientId))));
  app.put('/api/clients/:clientId/services/by-hand', wrap(async (req, res) => res.json(await saveByHand(filloutService, req.params.clientId, req.body))));
  return { store, h1 };
}

module.exports = { mountPageMapApi, byHandView, saveByHand, configuredNiches };
