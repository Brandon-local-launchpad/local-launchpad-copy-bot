'use strict';

// ── Location Determiner, Stage 6 as the Approve action ────────────────────────────
// Approve on the Locations tab IS Stage 6 (Brandon, 30 Oct): the confirm shows what the
// approval would do to the page map (pages to add, retire and keep by type and phase, and any
// retiring page a person worked on); on confirm the approval is saved and the page map is
// regenerated from it in the same action. GBP service areas are built live from the approved
// list (gbp/inputs.js), so they follow without a step of their own. Approving again does the
// same, so a town moved later is Approve and confirm, nothing else.
//
//   stage6Preview(deps, clientId)        the review as it stands, the page map preview with those
//                                        tiers, and the summary (nothing written)
//   approveAndGenerate(deps, clientId, { who })  review.approve, then pageMapStore.generate
//   summarisePreview(preview, { hasCopy })       the counts and lists the confirm and the dry run
//                                                tool print

const G = require('../page-map/generator');
const A = require('./approved');

const phaseOf = r => (r.info || {}).phase || 1;

// What a person did to a page: a manual H1, a meta title or description, notes, copy, or a status
// past H1 Added. The H1 research job writes research and pattern H1s itself and moves the status
// to H1 Added, so those alone are not a person's work.
function workedOn(r, hasCopy = () => false) {
  const w = [];
  if (r.h1_source === 'manual') w.push(`H1 "${r.h1}" (manual)`);
  if (r.meta_title) w.push('meta title');
  if (r.meta_description) w.push('meta description');
  if (r.notes) w.push('notes');
  if (hasCopy(r)) w.push('copy');
  if (!['Not Started', 'H1 Added'].includes(r.status)) w.push(`status ${r.status}`);
  return w;
}

function summarisePreview(preview, { hasCopy = () => false } = {}) {
  const { plan, diff, inputs } = preview;
  if (!plan.ok) return { ok: false, problems: plan.problems, tiers: inputs.locationTiers || null };
  const keep = [...diff.unchanged, ...diff.update.map(u => u.row)];
  const plannedBy = new Map(plan.rows.map(r => [r.page_key, r]));
  const keepPhase = r => phaseOf(plannedBy.get(r.page_key) || r);
  const count = (list, type, phase, getPhase = phaseOf) => list.filter(r => r.type === type && getPhase(r) === phase).length;
  const byType = G.TYPES.map(type => ({
    type, label: G.TYPE_LABEL[type],
    add_p1: count(diff.add, type, 1), add_p2: count(diff.add, type, 2),
    revive: diff.revive.filter(u => u.row.type === type).length,
    retire: diff.retire.filter(r => r.type === type).length,
    keep_p1: count(keep, type, 1, keepPhase), keep_p2: count(keep, type, 2, keepPhase),
    phase_changes: diff.update.filter(u => u.row.type === type && u.changes.phase !== undefined).length,
  })).filter(t => t.add_p1 || t.add_p2 || t.revive || t.retire || t.keep_p1 || t.keep_p2);
  const retire = diff.retire.map(r => ({ page_key: r.page_key, type: r.type, label: G.TYPE_LABEL[r.type], title: r.title, slug: r.slug, worked: workedOn(r, hasCopy), research_h1: r.h1 && r.h1_source !== 'manual' ? r.h1 : '' }));
  return {
    ok: true,
    tiers: inputs.locationTiers || null,
    other_towns: String(inputs.otherTowns || '').split(/\r?\n/).filter(Boolean),
    record_towns: String(inputs.otherTownsFromRecord || inputs.otherTowns || '').split(/\r?\n/).filter(Boolean),
    launch_towns: plan.launchTowns || [], phase2_published: !!plan.phase2Published,
    by_type: byType,
    totals: { add: diff.add.length, revive: diff.revive.length, retire: diff.retire.length, keep: keep.length, keep_changed: diff.update.length, already_retired: diff.stillRetired.length, plan: plan.rows.length, phase1: plan.counts.phase1, phase2: plan.counts.phase2 },
    add: diff.add.map(r => ({ page_key: r.page_key, type: r.type, label: G.TYPE_LABEL[r.type], title: r.title, slug: r.slug, phase: phaseOf(r), tier: (r.info || {}).tier || null })),
    retire,
    worked_on: retire.filter(r => r.worked.length),
    phase_changes: diff.update.filter(u => u.changes.phase !== undefined).map(u => ({ page_key: u.row.page_key, type: u.row.type, title: u.row.title, from: phaseOf(u.row), to: u.changes.phase })),
    revive: diff.revive.map(u => ({ page_key: u.row.page_key, type: u.row.type, title: u.row.title })),
    renames: diff.renames.map(x => x.msg),
  };
}

// Copy on a page: a v20 record for it, or an old pages row (GHL output)
async function copyFinder(pool, clientId) {
  if (!pool) return () => false;
  const keys = new Set();
  try {
    const { rows } = await pool.query(`SELECT COALESCE(metadata->>'page_type', 'homepage') AS t, COALESCE(metadata->>'page_key', 'homepage') AS k FROM client_assets WHERE client_id = $1 AND asset_type = 'v20_page_record'`, [clientId]);
    for (const r of rows) keys.add(`${r.t}:${r.k}`);
  } catch (_) { /* no v20 records table on this database */ }
  let oldPages = [];
  try { ({ rows: oldPages } = await pool.query(`SELECT page_type, url_slug, page_title FROM pages WHERE client_id = $1 AND copy_output IS NOT NULL`, [clientId])); } catch (_) { /* no pages table */ }
  return r => keys.has(`${r.type}:${r.slug}`) || keys.has(`${r.type}:${r.page_key}`) || keys.has(`${r.type}:${String(r.slug).split('/').filter(Boolean).pop()}`) || oldPages.some(p => p.url_slug === r.slug || p.page_title === r.title);
}

// The preview: the review as it stands (approved or not) applied to the page map, nothing written
async function stage6Preview({ review, pageMapStore, pool = null }, clientId) {
  const view = await review.view(clientId);
  if (!view.ok) return { ok: false, problems: view.problems, view };
  const tiers = A.tiersFromReview(view);
  const preview = await pageMapStore.preview(clientId, { tiers });
  const summary = summarisePreview(preview, { hasCopy: await copyFinder(pool, clientId) });
  return { ...summary, view: { counts: view.counts, warnings: view.warnings, ran_at: view.ran_at, approval: view.approval ? { approved_at: view.approval.approved_at, approved_by: view.approval.approved_by } : null } };
}

// Approve = Stage 6: save the approval, then regenerate the page map from it
async function approveAndGenerate({ review, pageMapStore, pool = null, log = console }, clientId, { who = '' } = {}) {
  const view = await review.approve(clientId, { who });
  const tiers = await A.approvedTiers(pool, clientId);
  const generated = await pageMapStore.generate(clientId, { tiers });
  const summary = summarisePreview({ plan: generated.plan, diff: generated.diff, inputs: { locationTiers: generated.plan.locationTiers, otherTowns: (tiers ? tiers.towns : []).join('\n') } }, { hasCopy: await copyFinder(pool, clientId) });
  if (log && log.log) log.log(`[locations] ${clientId}: approved and regenerated the page map: add ${summary.totals.add}, retire ${summary.totals.retire}, keep ${summary.totals.keep}`);
  return { view, generated: summary, gbp_areas: tiers ? tiers.gbp_areas : [] };
}

module.exports = { summarisePreview, workedOn, copyFinder, stage6Preview, approveAndGenerate };
