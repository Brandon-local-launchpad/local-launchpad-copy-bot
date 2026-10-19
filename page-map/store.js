'use strict';

// ── The page map in the database ────────────────────────────────────────────
// One client_page_map row per planned page, keyed on (client_id, page_key). It is
// a plan, not copy: the old `pages` table (GHL batch output) and the v20 records
// in client_assets are never read or written here. generated_page_id (an old
// pages row) and generated_ref ({ page_type, page_key } of a v20 record) are
// there to link a planned page to its copy later; nothing fills them yet.
//
// Regeneration (Brandon, 18 Oct 2026): keyed on page_key; new pages are added,
// links and titles follow the plan, a page that leaves the plan gets
// applies=false (never deleted) and comes back if the plan brings it back. A
// person's H1, meta, status and notes are never changed by a regeneration.

const G = require('./generator');

// Why a page no longer applies: the plan built from the record has no page with its key any more
function retiredReason(row) {
  const t = row.title;
  if (row.type === 'service') return `"${t}" is no longer one of this client's services: it is not ticked in any category on the record`;
  if (row.type === 'category') return `the "${t}" category is no longer one of this client's category tabs`;
  if (row.type === 'location') return `${t} is no longer in this client's town list`;
  if (row.type === 'location_category') return `the category or the town for "${t}" is no longer on the record`;
  return 'it is no longer in the plan built from the record';
}

async function ensurePageMapTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_page_map (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      page_key          TEXT NOT NULL,
      type              TEXT NOT NULL,
      title             TEXT NOT NULL,
      slug              TEXT NOT NULL,
      h1                TEXT NOT NULL DEFAULT '',
      h1_source         TEXT NOT NULL DEFAULT 'needed',
      meta_title        TEXT NOT NULL DEFAULT '',
      meta_description  TEXT NOT NULL DEFAULT '',
      links_to          JSONB NOT NULL DEFAULT '[]',
      links_from        JSONB NOT NULL DEFAULT '[]',
      status            TEXT NOT NULL DEFAULT 'Not Started',
      applies           BOOLEAN NOT NULL DEFAULT TRUE,
      notes             TEXT NOT NULL DEFAULT '',
      info              JSONB NOT NULL DEFAULT '{}',
      sort_order        INTEGER NOT NULL DEFAULT 0,
      generated_page_id UUID,
      generated_ref     JSONB,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      retired_at        TIMESTAMPTZ,
      UNIQUE(client_id, page_key)
    );
    CREATE TABLE IF NOT EXISTS client_page_map_state (
      client_id          UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      generated_at       TIMESTAMPTZ,
      category_tab_rule  TEXT,
      inputs             JSONB,
      counts             JSONB
    );
  `);
  // H1 research beside the H1 (h1-research/service.js): the researched keyword and volume, a
  // suggestion when there is no usable data, and whether a person accepted the suggestion
  // (h1_cpc: the applied keyword's CPC; retired_reason: why a page no longer applies)
  for (const col of ['h1_keyword TEXT', 'h1_volume INTEGER', 'h1_suggestion TEXT', 'h1_accepted BOOLEAN NOT NULL DEFAULT FALSE', 'h1_researched_at TIMESTAMPTZ', 'h1_reason TEXT', 'h1_suggests TEXT', 'h1_hub TEXT', 'h1_cpc NUMERIC', 'retired_reason TEXT']) {
    await pool.query(`ALTER TABLE client_page_map ADD COLUMN IF NOT EXISTS ${col}`);
  }
}

const parse = v => (typeof v === 'string' ? JSON.parse(v) : v);
const fromDb = r => ({ ...r, links_to: parse(r.links_to) || [], links_from: parse(r.links_from) || [], info: parse(r.info) || {}, generated_ref: parse(r.generated_ref) });
const INFO_KEYS = ['town', 'category_key', 'service_id', 'parent_keys', 'additional', 'primary'];
const infoOf = p => Object.fromEntries(INFO_KEYS.filter(k => p[k] !== undefined).map(k => [k, p[k]]));

// The generator's inputs for one client, from the record and the Services view.
// filloutService: fillout/service.js (record, servicesView)
async function inputsFor(filloutService, clientId, { categoryTabRule = 'ticked_only' } = {}) {
  const rec = await filloutService.record(clientId);
  if (!rec) throw Object.assign(new Error('Client not found'), { status: 404 });
  const v = await filloutService.servicesView(clientId, { categoryTabRule });
  const fields = rec.sections.flatMap(s => s.fields);
  const val = key => { const f = fields.find(x => x.key === key); return f && f.value != null ? f.value : null; };
  const str = x => (typeof x === 'string' ? x.trim() : '');
  const waiting = ((v.additional && v.additional.rows) || []).filter(a => ['proposed', 'extraction_failed'].includes(a.status))
    .map(a => ({ service: a.service, why: a.status === 'proposed' ? (a.proposedCategoryKey ? `proposed under ${a.proposedCategoryKey}, not confirmed` : 'no category chosen yet') : 'the proposal step failed; needs a person' }));
  const parentMissing = ((v.resolved && v.resolved.flags) || []).filter(f => f.code === 'additional_parent_missing').map(f => ({ service: f.msg, why: 'confirmed under a category that has no tab' }));
  return {
    clientId, niche: v.niche || rec.niche, hasConfig: !!v.hasConfig, categoryTabRule,
    resolved: v.resolved,
    baseTown: str(val('primary_town')),
    otherTowns: str(val('other_areas')),
    companyName: str(val('business_name')) || rec.client.name,
    waiting: [...waiting, ...parentMissing],
    attentionCount: Array.isArray(rec.attention) ? rec.attention.length : 0,
  };
}

function createPageMapStore({ pool, filloutService }) {
  async function saved(clientId) {
    const { rows } = await pool.query(`SELECT * FROM client_page_map WHERE client_id = $1 ORDER BY sort_order, created_at`, [clientId]);
    return rows.map(fromDb);
  }
  async function state(clientId) {
    const { rows } = await pool.query(`SELECT * FROM client_page_map_state WHERE client_id = $1`, [clientId]);
    return rows[0] ? { ...rows[0], inputs: parse(rows[0].inputs), counts: parse(rows[0].counts) } : null;
  }

  // The plan and what it would do, nothing written
  async function preview(clientId, opts = {}) {
    const inputs = await inputsFor(filloutService, clientId, opts);
    // A niche with no services file has no category tabs: say so plainly, never an empty map
    const plan = inputs.hasConfig ? G.buildPageMap(inputs)
      : { ok: false, problems: [{ code: 'services_not_set_up', msg: `Services not set up for this niche yet (${inputs.niche || 'no niche given'}).` }], rows: [], collisions: [], waiting: [], droppedTowns: [], councilAreas: [], counts: {} };
    const rows = await saved(clientId);
    const diff = plan.ok ? G.diffPlan(rows, plan.rows) : null;
    return { inputs, plan, diff, firstRun: !rows.length };
  }

  async function generate(clientId, opts = {}) {
    const { inputs, plan, diff } = await preview(clientId, opts);
    if (!plan.ok) throw Object.assign(new Error(plan.problems.map(p => p.msg).join(' ')), { status: 400, problems: plan.problems });
    const order = new Map(plan.rows.map((r, i) => [r.page_key, i]));
    // Progress for the one-click flow: "Building pages (n of N)"
    const total = diff.add.length + diff.update.length + diff.revive.length + diff.unchanged.length + diff.retire.length;
    let done = 0;
    const tick = async (force = false) => { done++; if (opts.onProgress && (force || done % 10 === 0 || done === total)) await opts.onProgress(done, total); };
    for (const p of diff.add) {
      await pool.query(
        `INSERT INTO client_page_map (client_id, page_key, type, title, slug, h1, h1_source, links_to, links_from, status, applies, info, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Not Started',TRUE,$10,$11)`,
        [clientId, p.page_key, p.type, p.title, p.slug, p.h1, p.h1_source, JSON.stringify(p.links_to), JSON.stringify(p.links_from), JSON.stringify(infoOf(p)), order.get(p.page_key)]);
      await tick();
    }
    const planned = new Map(plan.rows.map(r => [r.page_key, r]));
    for (const { row, changes } of [...diff.update, ...diff.revive]) {
      const p = planned.get(row.page_key);
      const next = { title: row.title, links_to: row.links_to, links_from: row.links_from, h1: row.h1, h1_source: row.h1_source, ...changes };
      await pool.query(
        `UPDATE client_page_map SET title=$3, links_to=$4, links_from=$5, h1=$6, h1_source=$7, info=$8, sort_order=$9, applies=TRUE, retired_at=NULL, retired_reason=NULL, updated_at=NOW()
         WHERE id=$1 AND client_id=$2`,
        [row.id, clientId, next.title, JSON.stringify(next.links_to), JSON.stringify(next.links_from), next.h1, next.h1_source, JSON.stringify(infoOf(p)), order.get(row.page_key)]);
      await tick();
    }
    for (const row of diff.unchanged) {
      if (row.sort_order !== order.get(row.page_key)) await pool.query(`UPDATE client_page_map SET sort_order=$3 WHERE id=$1 AND client_id=$2`, [row.id, clientId, order.get(row.page_key)]);
      await tick();
    }
    for (const row of diff.retire) { await pool.query(`UPDATE client_page_map SET applies=FALSE, retired_at=NOW(), retired_reason=$3, updated_at=NOW() WHERE id=$1 AND client_id=$2`, [row.id, clientId, retiredReason(row)]); await tick(); }
    if (opts.onProgress && !total) await opts.onProgress(0, 0);
    const st = { generated_at: new Date(), category_tab_rule: inputs.categoryTabRule,
      inputs: { baseTown: inputs.baseTown, otherTowns: inputs.otherTowns, companyName: inputs.companyName },
      counts: { ...plan.counts, ...diff.counts } };
    if (await state(clientId)) await pool.query(`UPDATE client_page_map_state SET generated_at=$2, category_tab_rule=$3, inputs=$4, counts=$5 WHERE client_id=$1`, [clientId, st.generated_at, st.category_tab_rule, JSON.stringify(st.inputs), JSON.stringify(st.counts)]);
    else await pool.query(`INSERT INTO client_page_map_state (client_id, generated_at, category_tab_rule, inputs, counts) VALUES ($1,$2,$3,$4,$5)`, [clientId, st.generated_at, st.category_tab_rule, JSON.stringify(st.inputs), JSON.stringify(st.counts)]);
    return { plan, diff, rows: await saved(clientId) };
  }

  // A person's edit. H1 marks the row manual and moves Not Started to H1 Added (never backwards).
  async function setRow(clientId, id, body) {
    const { rows } = await pool.query(`SELECT * FROM client_page_map WHERE id = $1 AND client_id = $2`, [id, clientId]);
    if (!rows.length) throw Object.assign(new Error('Page not found'), { status: 404 });
    const cur = fromDb(rows[0]);
    const next = { h1: cur.h1, h1_source: cur.h1_source, meta_title: cur.meta_title, meta_description: cur.meta_description, status: cur.status, notes: cur.notes, h1_accepted: !!cur.h1_accepted, h1_suggestion: cur.h1_suggestion || null };
    if (body.status !== undefined) {
      if (!G.STATUSES.includes(body.status)) throw Object.assign(new Error(`status must be one of: ${G.STATUSES.join(', ')}`), { status: 400 });
      next.status = body.status;
    }
    if (body.accept !== undefined) throw Object.assign(new Error('There is no accept step: research H1s apply directly; edit the H1 to change it'), { status: 400 });
    if (body.h1 !== undefined) {
      const h1 = String(body.h1 || '').trim();
      next.h1 = h1;
      next.h1_source = h1 ? 'manual' : (cur.type === 'service' ? 'auto' : 'needed');
      next.h1_accepted = false;
      if (h1) next.h1_suggestion = null;
      if (h1 && next.status === 'Not Started' && body.status === undefined) next.status = 'H1 Added';
    }
    for (const k of ['meta_title', 'meta_description', 'notes']) if (body[k] !== undefined) next[k] = String(body[k] || '');
    const { rows: out } = await pool.query(
      `UPDATE client_page_map SET h1=$3, h1_source=$4, meta_title=$5, meta_description=$6, status=$7, notes=$8, h1_accepted=$9, h1_suggestion=$10, updated_at=NOW() WHERE id=$1 AND client_id=$2 RETURNING *`,
      [id, clientId, next.h1, next.h1_source, next.meta_title, next.meta_description, next.status, next.notes, next.h1_accepted, next.h1_suggestion]);
    return fromDb(out[0]);
  }

  async function csv(clientId, opts) { return G.toCsv(await saved(clientId), opts); }

  return { saved, state, preview, generate, setRow, csv };
}

module.exports = { ensurePageMapTables, createPageMapStore, inputsFor, retiredReason };
