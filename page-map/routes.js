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

function mountPageMapApi(app, { pool, filloutService }) {
  const store = createPageMapStore({ pool, filloutService });
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
    res.json({ rows: await store.saved(req.params.clientId), state: await store.state(req.params.clientId) });
  }));
  app.get('/api/clients/:clientId/page-map/preview', wrap(async (req, res) => {
    res.json(summary(await store.preview(req.params.clientId, { categoryTabRule: ruleOf(req.query.rule) })));
  }));
  app.post('/api/clients/:clientId/page-map/generate', wrap(async (req, res) => {
    const out = await store.generate(req.params.clientId, { categoryTabRule: ruleOf((req.body || {}).rule) });
    res.json({ rows: out.rows, state: await store.state(req.params.clientId), counts: out.diff.counts, renames: out.diff.renames, collisions: out.plan.collisions });
  }));
  app.put('/api/clients/:clientId/page-map/:rowId', wrap(async (req, res) => res.json(await store.setRow(req.params.clientId, req.params.rowId, req.body || {}))));

  app.get('/api/clients/:clientId/services/by-hand', wrap(async (req, res) => res.json(await byHandView(filloutService, req.params.clientId))));
  app.put('/api/clients/:clientId/services/by-hand', wrap(async (req, res) => res.json(await saveByHand(filloutService, req.params.clientId, req.body))));
  return store;
}

module.exports = { mountPageMapApi, byHandView, saveByHand, configuredNiches };
