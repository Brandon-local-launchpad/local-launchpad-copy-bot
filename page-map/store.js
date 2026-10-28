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
//
// Page map v3 (19 Oct 2026): which service pages exist depends on search volume
// (page-map/generator.js), so the plan takes the keyword volumes: the one-click job
// looks them up first; the dry run and the direct Generate route use the cache. The
// services list outcomes (page / merged / folded / mentioned) are kept on the state
// row; the services a person excluded at intake live in client_service_flags.

const G = require('./generator');

// Why a page no longer applies. plan: the generator's result, when regenerating
function retiredReason(row, plan) {
  const t = row.title;
  const info = row.info || {};
  if (row.type === 'service') {
    const s = plan && plan.services && plan.services.find(x => x.id === info.service_id || (x.merged_ids || []).includes(info.service_id));
    if (s && s.outcome === 'merged') return `"${t}" is the same service as "${s.intoName}", which keeps the page`;
    if (s && s.outcome === 'folded') return `"${t}" is now listed on the ${s.intoName} category page: its keyword is that category's`;
    if (s && s.outcome === 'mentioned') return `"${t}" was excluded at intake: it is mentioned on its category page instead of having a page (untick Exclude on Services to bring the page back)`;
    const lib = plan && plan.libraryRecords && plan.libraryRecords.find(x => x.gbp_id === info.service_id || (info.gbp_names || []).includes(x.gbp_name));
    if (lib && lib.outcome === 'absorbed') return `"${t}" is now part of the "${lib.intoName}" page (niche library: alias)`;
    if (lib && lib.outcome === 'excluded') return `"${t}" is excluded by the niche library${lib.note ? ` (${lib.note})` : ''}: no page, not mentioned`;
    if (lib && lib.outcome === 'page' && lib.intoName !== t) return `"${t}" is now the "${lib.intoName}" page (niche library: UK name)`;
    return `"${t}" is no longer one of this client's services: it is not ticked in any category on the record`;
  }
  if (row.type === 'town_service') return `"${info.service_name || t}" no longer has a usable keyword of its own in ${info.town || 'this town'}, or another page owns it`;
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
    CREATE TABLE IF NOT EXISTS client_town_flags (
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      town_slug   TEXT NOT NULL,
      launch      BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (client_id, town_slug)
    );
    CREATE TABLE IF NOT EXISTS client_service_flags (
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service_id  TEXT NOT NULL,
      core        BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (client_id, service_id)
    );
  `);
  // H1 research beside the H1 (h1-research/service.js): the researched keyword and volume, a
  // suggestion when there is no usable data, and whether a person accepted the suggestion
  // (h1_cpc: the applied keyword's CPC; retired_reason: why a page no longer applies)
  for (const col of ['h1_keyword TEXT', 'h1_volume INTEGER', 'h1_suggestion TEXT', 'h1_accepted BOOLEAN NOT NULL DEFAULT FALSE', 'h1_researched_at TIMESTAMPTZ', 'h1_reason TEXT', 'h1_suggests TEXT', 'h1_hub TEXT', 'h1_cpc NUMERIC', 'retired_reason TEXT']) {
    await pool.query(`ALTER TABLE client_page_map ADD COLUMN IF NOT EXISTS ${col}`);
  }
  // The services list outcomes from the last generation (page map v3)
  await pool.query(`ALTER TABLE client_page_map_state ADD COLUMN IF NOT EXISTS services JSONB`);
  // Services a person excluded at intake (replaces the core flag, 20 Oct 2026: every service is a page by default)
  await pool.query(`ALTER TABLE client_service_flags ADD COLUMN IF NOT EXISTS excluded BOOLEAN NOT NULL DEFAULT FALSE`);
  // The niche library resolution per GBP name (page map v3 library step)
  await pool.query(`ALTER TABLE client_page_map_state ADD COLUMN IF NOT EXISTS library JSONB`);
  // Launch phases: when "Publish phase 2" ran (every page phase 1 from then on)
  await pool.query(`ALTER TABLE client_page_map_state ADD COLUMN IF NOT EXISTS phase2_published_at TIMESTAMPTZ`);
}

const parse = v => (typeof v === 'string' ? JSON.parse(v) : v);
const fromDb = r => ({ ...r, links_to: parse(r.links_to) || [], links_from: parse(r.links_from) || [], info: parse(r.info) || {}, generated_ref: parse(r.generated_ref) });
// The blog row's info (page-map/generator.js BLOG_COLUMNS, plus what the decisions and the
// daily job keep on the row: the service and category the post belongs to, the record's version)
const BLOG_INFO_KEYS = [...G.BLOG_COLUMNS.map(c => c[1]), 'service', 'category', 'phase', 'held', 'backfill_pending', 'published_url',
  // The queue's own keys (blog/queue.js rowsFor): the resolved stack and FAQ wordings, the question and its approval, the slot
  'service_slug', 'category_slug', 'stack', 'faq', 'question_id', 'question_source', 'wording', 'wording_source', 'wording_approved', 'wording_edited', 'needs_approval', 'bank_topic', 'held', 'seasonal', 'dossier_condition', 'cost_unit', 'slot_note', 'held_for_date', 'month'];
const INFO_KEYS = ['town', 'category_key', 'service_id', 'service_name', 'parent_keys', 'additional', 'primary', 'merged_from', 'gbp_names', 'absorbs', 'copy_priority', 'phase', 'links'];
// A plan row's info: what the generator put in info, plus its link sections
const infoOf = p => { const src = { ...(p.info || {}), ...(p.links ? { links: p.links } : {}) }; return Object.fromEntries(INFO_KEYS.filter(k => src[k] !== undefined).map(k => [k, src[k]])); };

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

// volumesFor(keywords) → Map keyword → { volume, cpc }: the keyword cache (h1-research/service.js
// cached). The one-click job passes the volumes it looked up instead (opts.volumes).
function createPageMapStore({ pool, filloutService, volumesFor = async () => new Map() }) {
  async function saved(clientId) {
    const { rows } = await pool.query(`SELECT * FROM client_page_map WHERE client_id = $1 ORDER BY sort_order, created_at`, [clientId]);
    return rows.map(fromDb);
  }
  async function state(clientId) {
    const { rows } = await pool.query(`SELECT * FROM client_page_map_state WHERE client_id = $1`, [clientId]);
    return rows[0] ? { ...rows[0], inputs: parse(rows[0].inputs), counts: parse(rows[0].counts), services: parse(rows[0].services) || null, library: parse(rows[0].library) || null } : null;
  }
  // Towns launching in phase 1 (the base town always counts): Set of town slugs
  async function launchTowns(clientId) {
    const { rows } = await pool.query(`SELECT town_slug FROM client_town_flags WHERE client_id = $1 AND launch = TRUE`, [clientId]);
    return new Set(rows.map(r => r.town_slug));
  }
  async function setLaunchTown(clientId, town, launch) {
    const slug = G.slugify(town);
    if (!slug) throw Object.assign(new Error('Which town?'), { status: 400 });
    const { rowCount } = await pool.query(`UPDATE client_town_flags SET launch = $3, updated_at = NOW() WHERE client_id = $1 AND town_slug = $2`, [clientId, slug, !!launch]);
    if (!rowCount) await pool.query(`INSERT INTO client_town_flags (client_id, town_slug, launch) VALUES ($1, $2, $3)`, [clientId, slug, !!launch]);
    return launchTowns(clientId);
  }
  // "Publish phase 2": phase-2 pages become publish, and the links are planned again
  async function publishPhase2(clientId, opts = {}) {
    const st = await state(clientId);
    if (!st) throw Object.assign(new Error('No page map yet: generate it first.'), { status: 400 });
    if (!st.phase2_published_at) await pool.query(`UPDATE client_page_map_state SET phase2_published_at = NOW() WHERE client_id = $1`, [clientId]);
    return generate(clientId, { categoryTabRule: st.category_tab_rule || 'ticked_only', ...opts });
  }
  // Services a person excluded at intake (mentioned, never a page): Set of service ids
  async function excludeFlags(clientId) {
    const { rows } = await pool.query(`SELECT service_id FROM client_service_flags WHERE client_id = $1 AND excluded = TRUE`, [clientId]);
    return new Set(rows.map(r => r.service_id));
  }
  async function setExclude(clientId, serviceId, excluded) {
    const id = String(serviceId || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!id) throw Object.assign(new Error('Which service?'), { status: 400 });
    const { rowCount } = await pool.query(`UPDATE client_service_flags SET excluded = $3, updated_at = NOW() WHERE client_id = $1 AND service_id = $2`, [clientId, id, !!excluded]);
    if (!rowCount) await pool.query(`INSERT INTO client_service_flags (client_id, service_id, excluded) VALUES ($1, $2, $3)`, [clientId, id, !!excluded]);
    return excludeFlags(clientId);
  }

  // The plan and what it would do, nothing written. opts.volumes: a Map from the job; otherwise
  // the cache answers, and keywords it has never seen count as no data.
  async function preview(clientId, opts = {}) {
    const inputs = await inputsFor(filloutService, clientId, opts);
    const rows = await saved(clientId);
    let plan;
    if (!inputs.hasConfig) plan = { ok: false, problems: [{ code: 'services_not_set_up', msg: `Services not set up for this niche yet (${inputs.niche || 'no niche given'}).` }], rows: [], services: [], collisions: [], waiting: [], droppedTowns: [], councilAreas: [], counts: {} };
    else {
      const ready = inputs.resolved && inputs.resolved.categories.length && String(inputs.baseTown || '').trim();
      const volumes = opts.volumes || (ready ? await volumesFor(G.keywordsFor(inputs)) : new Map());
      const st = await state(clientId);
      plan = G.buildPageMap(inputs, { volumes, exclude: await excludeFlags(clientId), launchTowns: await launchTowns(clientId), phase2Published: !!(st && st.phase2_published_at), saved: rows });
      plan.volumesFrom = opts.volumes ? 'lookup' : 'cache';
    }
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
    for (const row of diff.retire) { await pool.query(`UPDATE client_page_map SET applies=FALSE, retired_at=NOW(), retired_reason=$3, updated_at=NOW() WHERE id=$1 AND client_id=$2`, [row.id, clientId, retiredReason(row, plan)]); await tick(); }
    if (opts.onProgress && !total) await opts.onProgress(0, 0);
    // The services list outcomes, as the Services step shows them
    const services = plan.services.map(s => ({ id: s.id, name: s.name, parents: s.parents, outcome: s.outcome, into: s.into || null, intoName: s.intoName || null, reason: s.reason, merged_from: s.merged_from || [], gbp_names: s.gbp_names || [s.name], absorbs: s.absorbs || [], copy_priority: s.copy_priority || 0, townVolumes: (s.townVolumes || []).map(t => ({ town: t.town, volume: t.volume })) }));
    const library = { file: plan.libraryCounts.library, counts: plan.libraryCounts, records: plan.libraryRecords };
    const st = { generated_at: new Date(), category_tab_rule: inputs.categoryTabRule,
      inputs: { baseTown: inputs.baseTown, otherTowns: inputs.otherTowns, companyName: inputs.companyName },
      counts: { ...plan.counts, ...diff.counts, services: plan.serviceCounts, townServicePages: plan.townServicePages, volumesFrom: plan.volumesFrom, launchTowns: plan.launchTowns } };
    if (await state(clientId)) await pool.query(`UPDATE client_page_map_state SET generated_at=$2, category_tab_rule=$3, inputs=$4, counts=$5, services=$6, library=$7 WHERE client_id=$1`, [clientId, st.generated_at, st.category_tab_rule, JSON.stringify(st.inputs), JSON.stringify(st.counts), JSON.stringify(services), JSON.stringify(library)]);
    else await pool.query(`INSERT INTO client_page_map_state (client_id, generated_at, category_tab_rule, inputs, counts, services, library) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [clientId, st.generated_at, st.category_tab_rule, JSON.stringify(st.inputs), JSON.stringify(st.counts), JSON.stringify(services), JSON.stringify(library)]);
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
      next.h1_source = h1 ? 'manual' : 'needed';
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

  // ── Blog rows (28 Oct 2026): written by the blog topic queue, never by the plan ──
  // list: [{ slug: '/guides/<slug>', title, h1, info: { post_type, target_query, … } }] in queue
  // order. Keyed on page_key: a new topic is added after every other row, a known one keeps its
  // status, notes and a manual H1 (its title, auto H1 and info follow the queue), and a topic
  // that left the queue no longer applies, unless its post is on the site (Scheduled, Pushed to
  // WordPress or Live: a published post is never retired by a queue change).
  const BLOG_KEEP = new Set(['Scheduled', 'Pushed to WordPress', 'Live']);
  const blogInfoOf = b => { const src = { ...(b.info || {}) }; return Object.fromEntries(BLOG_INFO_KEYS.filter(k => src[k] !== undefined).map(k => [k, src[k]])); };
  async function blogRows(clientId) { return (await saved(clientId)).filter(r => r.type === 'blog'); }
  async function upsertBlogRows(clientId, list) {
    const all = await saved(clientId);
    const existing = new Map(all.filter(r => r.type === 'blog').map(r => [r.page_key, r]));
    const base = all.filter(r => r.type !== 'blog').reduce((n, r) => Math.max(n, r.sort_order || 0), 0) + 1;
    const keep = new Set();
    let i = 0;
    for (const b of list || []) {
      const slug = String(b.slug || '').trim();
      if (!slug) throw Object.assign(new Error('A blog row needs a slug.'), { status: 400 });
      const key = G.pageKey('blog', slug);
      keep.add(key);
      const cur = existing.get(key);
      const info = blogInfoOf(b);
      const order = base + i++;
      if (!cur) {
        await pool.query(
          `INSERT INTO client_page_map (client_id, page_key, type, title, slug, h1, h1_source, links_to, links_from, status, applies, info, sort_order)
           VALUES ($1,$2,'blog',$3,$4,$5,'auto','[]','[]',$8,TRUE,$6,$7)`,
          [clientId, key, String(b.title || b.h1 || slug), slug, String(b.h1 || ''), JSON.stringify(info), order, b.status === 'Held' ? 'Held' : 'Not Started']);
        continue;
      }
      const manual = cur.h1_source === 'manual';
      // Held comes and goes with the queue; the other statuses are the daily job's and stay
      const status = b.status === 'Held' ? 'Held' : cur.status === 'Held' ? 'Not Started' : cur.status;
      await pool.query(
        `UPDATE client_page_map SET title=$3, slug=$4, h1=$5, h1_source=$6, info=$7, sort_order=$8, status=$9, applies=TRUE, retired_at=NULL, retired_reason=NULL, updated_at=NOW() WHERE id=$1 AND client_id=$2`,
        [cur.id, clientId, String(b.title || b.h1 || cur.title), slug, manual ? cur.h1 : String(b.h1 || ''), manual ? 'manual' : 'auto', JSON.stringify({ ...(cur.info || {}), ...info }), order, status]);
    }
    for (const cur of existing.values()) {
      if (keep.has(cur.page_key) || cur.applies === false || BLOG_KEEP.has(cur.status)) continue;
      await pool.query(`UPDATE client_page_map SET applies=FALSE, retired_at=NOW(), retired_reason=$3, updated_at=NOW() WHERE id=$1 AND client_id=$2`, [cur.id, clientId, 'it is no longer in the blog topic queue']);
    }
    return blogRows(clientId);
  }
  // One blog row's info patched (the daily job: publish date, link status, held, published_url)
  async function patchBlogRow(clientId, slug, { info = {}, status, h1, title } = {}) {
    const cur = (await blogRows(clientId)).find(r => r.slug === slug);
    if (!cur) throw Object.assign(new Error(`No blog row ${slug}.`), { status: 404 });
    if (status !== undefined && !G.STATUSES.includes(status)) throw Object.assign(new Error(`status must be one of: ${G.STATUSES.join(', ')}`), { status: 400 });
    const next = { ...(cur.info || {}), ...blogInfoOf({ info }) };
    // A wording a person approved or edited on the queue is the row's H1 (manual, so a queue rebuild keeps it)
    const nextH1 = h1 !== undefined ? String(h1 || '') : cur.h1;
    await pool.query(`UPDATE client_page_map SET info=$3, status=$4, h1=$5, h1_source=$6, title=$7, updated_at=NOW() WHERE id=$1 AND client_id=$2`,
      [cur.id, clientId, JSON.stringify(next), status !== undefined ? status : cur.status, nextH1, h1 !== undefined ? 'manual' : cur.h1_source, title !== undefined ? String(title || cur.title) : cur.title]);
    return (await blogRows(clientId)).find(r => r.slug === slug);
  }

  return { saved, state, preview, generate, setRow, csv, excludeFlags, setExclude, launchTowns, setLaunchTown, publishPhase2, blogRows, upsertBlogRows, patchBlogRow };
}

module.exports = { ensurePageMapTables, createPageMapStore, inputsFor, retiredReason, BLOG_INFO_KEYS };
