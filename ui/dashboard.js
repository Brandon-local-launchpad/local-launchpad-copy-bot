'use strict';

// ── The dashboard (27 Oct 2026): every client's stage, first blocker, what needs a
// person, what is running, and the Top 3% series ────────────────────────────────
// Read only. A handful of queries across all clients (no per client loop over the
// stores), then pure rules: stageOf, blockersOf. Nothing here calls a model or
// LeadSnap. The rules in words:
//   Stage (first that applies): Live (a page pushed to WordPress) · GBP (every page
//   in the map written clean, no GBP output yet, or GBP output and nothing pushed) ·
//   Pages (a page map exists and a page is unwritten or not clean) · Page map (a
//   dossier exists, no page map) · Research (allocated to a niche, no dossier) ·
//   Onboarding (no niche, or a Fillout record not reviewed and no client values).
//   Blocker (first, in plain words): a key field missing on the record (phone, quote
//   method, primary category, practices) · the niche's trade facts pack unverified
//   while the map has service pages · a launch town with no dossier · claims to
//   accept · pages blocked · pages failed.
//   Needs a person: one item per client per kind (fields, pack, claims, blocked).

const { listClients } = require('../fillout/client-routes');
const SC = require('../gbp/scans');

const STAGES = ['Onboarding', 'Research', 'Page map', 'Pages', 'GBP', 'Live'];
const PAGE_TYPES = ['homepage', 'category', 'service', 'location'];
// Page map row types → the v20 page type that writes them
const ROW_TYPE = { homepage: 'homepage', category: 'category', location_category: 'category', service: 'service', town_service: 'service', location: 'location' };
const RUN_ASSET = { category: 'category_run', service: 'service_run', location: 'location_run' };

const parse = c => { try { return typeof c === 'string' ? JSON.parse(c) : c; } catch (_) { return null; } };
const str = v => (v == null ? '' : String(v)).trim();
const maxDate = (...ds) => ds.filter(Boolean).map(d => new Date(d)).filter(d => d.getTime()).sort((a, b) => b - a)[0] || null;

// ── The key fields a page cannot be written without ──────────────────────────
function missingFields(cv, fields, client) {
  const out = [];
  if (!str(cv.phone) && !str(fields.business_phone)) out.push({ key: 'phone', text: 'no phone' });
  if (!str(cv.free_quotes) && !str(cv.quote_method)) out.push({ key: 'quote_method', text: 'no quote method' });
  if (!str(cv.primary_category) && !str(client.primary_category_key)) out.push({ key: 'primary_category', text: 'no primary category' });
  if (!(Array.isArray(cv.confirmed_practices) && cv.confirmed_practices.length)) out.push({ key: 'practices', text: 'no practices ticked' });
  return out;
}

// ── One client's summary → stage ─────────────────────────────────────────────
function stageOf(s) {
  if (s.pushed.length) return 'Live';
  if (!s.nicheKnown) return 'Onboarding';
  if (!s.hasValues && !s.reviewed) return 'Onboarding';
  if (!s.dossiers.length) return 'Research';
  if (!s.mapRows.length) return 'Page map';
  if (s.pages.some(p => !p.good)) return 'Pages';
  return 'GBP';
}

// ── One client's summary → blockers, first is the one shown ──────────────────
function blockersOf(s) {
  const out = [];
  if (s.missing.length) out.push({ kind: 'fields', text: s.missing.map(m => m.text).join(', '), count: s.missing.length });
  if (s.packUnverified) out.push({ kind: 'pack', text: 'pack unverified', count: 1 });
  for (const t of s.townsWithoutDossier) out.push({ kind: 'dossier', text: `no dossier for ${t}`, count: 1 });
  const claims = s.pages.reduce((n, p) => n + (p.claims || 0), 0);
  if (claims) out.push({ kind: 'claims', text: `${claims} claim${claims === 1 ? '' : 's'} to accept`, count: claims });
  const blocked = s.pages.filter(p => p.record && (p.blocked || p.block > 0)).length;
  if (blocked) out.push({ kind: 'blocked', text: `${blocked} page${blocked === 1 ? '' : 's'} blocked`, count: blocked });
  const failed = s.pages.filter(p => p.record && p.error).length;
  if (failed) out.push({ kind: 'failed', text: `${failed} page${failed === 1 ? '' : 's'} failed`, count: failed });
  return out;
}

const NEEDS_PERSON = new Set(['fields', 'pack', 'claims', 'blocked']);

// ── Loading ───────────────────────────────────────────────────────────────────
// deps: { pool, tradeFacts (status(niche)), runners: { category, service, location } each with a
// `running` Map (clientId → { startedAt, current }), homepageRunning: Set of clientIds }
async function loadDashboard({ pool, tradeFacts = null, runners = {}, homepageRunning = null, now = new Date() } = {}) {
  const { clients, tabs, niches } = await listClients(pool, { archived: true });
  const byClient = new Map(clients.map(c => [c.id, c]));
  const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

  // Latest page record per client, type and key: the summary only, pulled out in SQL
  const PT = `COALESCE(metadata->>'page_type', 'homepage')`, PK = `COALESCE(metadata->>'page_key', 'homepage')`;
  const recs = await q(`SELECT DISTINCT ON (client_id, ${PT}, ${PK}) id, client_id, uploaded_at, ${PT} AS page_type, ${PK} AS page_key,
      (content::jsonb)->'VALIDATION'->>'status' AS v_status, (content::jsonb)->'VALIDATION'->>'block' AS block, (content::jsonb)->'VALIDATION'->>'flag' AS flag,
      (content::jsonb)->>'blocked' AS blocked, (content::jsonb)->>'error' AS error, (content::jsonb)->'CLAIMS' AS claims,
      (content::jsonb)->'QUALITY'->>'score' AS score, (content::jsonb)->'meta' AS meta
    FROM client_assets WHERE asset_type = 'v20_page_record' ORDER BY client_id, ${PT}, ${PK}, uploaded_at DESC`);
  const recordsByClient = new Map();
  for (const r of recs) {
    const claims = parse(r.claims) || null;
    const meta = parse(r.meta) || {};
    const rec = {
      id: r.id, type: r.page_type, key: r.page_key, at: meta.edited_at || meta.generated_at || r.uploaded_at,
      block: r.block === null || r.block === undefined ? null : Number(r.block), flag: r.flag === null || r.flag === undefined ? null : Number(r.flag),
      run: r.v_status === 'run', blocked: r.blocked === 'true', error: r.error || null, failed: !!meta.failed,
      claims: claims && Array.isArray(claims.findings) ? Math.max(0, claims.findings.length - (claims.accepted || []).length) : 0,
      score: r.score === null || r.score === undefined ? null : Number(r.score),
      approved_at: meta.approved_at || null,
    };
    rec.good = !rec.blocked && !rec.error && rec.run && rec.block === 0;
    if (!recordsByClient.has(r.client_id)) recordsByClient.set(r.client_id, new Map());
    recordsByClient.get(r.client_id).set(`${rec.type}:${rec.key}`, rec);
  }

  // Run states, client values, GBP output: the latest per client
  const latest = async type => q(`SELECT DISTINCT ON (client_id) client_id, content, uploaded_at FROM client_assets WHERE asset_type = $1 ORDER BY client_id, uploaded_at DESC`, [type]);
  const runStates = {};
  for (const [t, asset] of Object.entries(RUN_ASSET)) runStates[t] = new Map((await latest(asset)).map(r => [r.client_id, parse(r.content)]));
  const values = new Map((await latest('client_values')).map(r => [r.client_id, parse(r.content) || {}]));
  const gbp = new Map((await latest('gbp_output')).map(r => [r.client_id, parse(r.content) || {}]));

  // Dossiers (active), the page map rows, pushes, submissions, key record fields, scans
  const dossiers = await q(`SELECT client_id, metadata FROM client_assets WHERE asset_type = 'geo_dossier' AND COALESCE(metadata->>'superseded', 'false') <> 'true'`);
  const dossiersByClient = new Map();
  for (const d of dossiers) { const m = parse(d.metadata) || {}; if (!dossiersByClient.has(d.client_id)) dossiersByClient.set(d.client_id, []); dossiersByClient.get(d.client_id).push({ norm: m.location_norm || '', name: m.location_name || '' }); }
  const mapRows = await q(`SELECT client_id, type, slug, title, applies, status, info FROM client_page_map WHERE retired_at IS NULL ORDER BY sort_order, created_at`);
  const rowsByClient = new Map();
  for (const r of mapRows) { if (!rowsByClient.has(r.client_id)) rowsByClient.set(r.client_id, []); rowsByClient.get(r.client_id).push({ ...r, info: parse(r.info) || {} }); }
  const pushes = await q(`SELECT client_id, entry, created_at FROM wp_push_log WHERE result = 'pushed'`);
  const pushedByClient = new Map();
  for (const p of pushes) { const e = parse(p.entry) || {}; if (!pushedByClient.has(p.client_id)) pushedByClient.set(p.client_id, []); pushedByClient.get(p.client_id).push({ type: e.pageType || 'homepage', key: e.pageKey || null, at: p.created_at }); }
  const subs = await q(`SELECT client_id, MIN(received_at) AS first_at FROM fillout_submissions WHERE client_id IS NOT NULL GROUP BY client_id`);
  const firstSubmission = new Map(subs.map(s => [s.client_id, s.first_at]));
  const fieldRows = await q(`SELECT client_id, field_key, value FROM client_fields WHERE field_key IN ('business_phone', 'business_email', 'business_name') AND status = 'filled'`);
  const fieldsByClient = new Map();
  for (const f of fieldRows) { if (!fieldsByClient.has(f.client_id)) fieldsByClient.set(f.client_id, {}); fieldsByClient.get(f.client_id)[f.field_key] = typeof f.value === 'string' ? f.value : parse(f.value); }
  const scanRows = await q(`SELECT client_id, content FROM client_assets WHERE asset_type = 'gbp_scan' ORDER BY uploaded_at`);
  const scansByClient = new Map();
  for (const s of scanRows) { if (!scansByClient.has(s.client_id)) scansByClient.set(s.client_id, []); scansByClient.get(s.client_id).push(parse(s.content)); }

  // Last activity: the newest of the client's assets, record fields, page map edits, pushes, and its creation
  const act = new Map();
  const bump = (id, d) => { const m = maxDate(act.get(id), d); if (m) act.set(id, m); };
  for (const r of await q(`SELECT client_id, MAX(uploaded_at) AS at FROM client_assets GROUP BY client_id`)) bump(r.client_id, r.at);
  for (const r of await q(`SELECT client_id, MAX(updated_at) AS at FROM client_fields GROUP BY client_id`)) bump(r.client_id, r.at);
  for (const r of await q(`SELECT client_id, MAX(updated_at) AS at FROM client_page_map GROUP BY client_id`)) bump(r.client_id, r.at);
  for (const r of await q(`SELECT client_id, MAX(created_at) AS at FROM wp_push_log GROUP BY client_id`)) bump(r.client_id, r.at);
  for (const c of clients) bump(c.id, c.created_at);

  // Research and H1 jobs in progress, scans pending
  const researchJobs = await q(`SELECT client_id, locations FROM research_jobs WHERE status = 'running'`).catch(() => []);
  const h1Jobs = await q(`SELECT client_id, kind, stage, status FROM h1_research_jobs WHERE status IN ('queued', 'building', 'researching')`).catch(() => []);

  // Trade facts per niche, once each
  const packByNiche = new Map();
  const packStatus = async niche => {
    if (!niche || !tradeFacts) return null;
    if (!packByNiche.has(niche)) packByNiche.set(niche, await Promise.resolve(tradeFacts.status(niche)).catch(() => null));
    return packByNiche.get(niche);
  };

  const rows = [];
  const needs = { fields: 0, pack: 0, claims: 0, blocked: 0 };
  const runningNow = [];
  for (const c of clients) {
    const cv = values.get(c.id) || null;
    const fields = fieldsByClient.get(c.id) || {};
    const rs = rowsByClient.get(c.id) || [];
    const recs = recordsByClient.get(c.id) || new Map();
    const nicheKnown = !!(c.niche_key && c.niche_key !== 'other');
    const applicable = rs.filter(r => r.applies !== false && ROW_TYPE[r.type] && (r.info.phase || 1) === 1);
    const pages = applicable.map(r => {
      const type = ROW_TYPE[r.type];
      const key = type === 'homepage' ? 'homepage' : r.slug;
      const rec = recs.get(`${type}:${key}`) || null;
      return { type, key, title: r.title, record: !!rec, good: !!(rec && rec.good), blocked: !!(rec && rec.blocked), block: rec ? rec.block : null, error: rec ? rec.error : null, claims: rec ? rec.claims : 0, score: rec ? rec.score : null, at: rec ? rec.at : null };
    });
    const ds = dossiersByClient.get(c.id) || [];
    const norm = s => str(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const launchTowns = [...new Set(rs.filter(r => r.type === 'location' && r.applies !== false && (r.info.phase || 1) === 1).map(r => r.info.town).filter(Boolean))];
    const townsWithoutDossier = launchTowns.filter(t => !ds.some(d => d.norm === norm(t) || norm(d.name) === norm(t)));
    const hasServicePages = applicable.some(r => r.type === 'service' || r.type === 'town_service');
    const pack = hasServicePages ? await packStatus(c.niche_key) : null;
    const packUnverified = !!(pack && !pack.verified);
    const summary = {
      nicheKnown, reviewed: !!c.reviewed_at, hasValues: !!cv, dossiers: ds, mapRows: rs, pages, pushed: pushedByClient.get(c.id) || [],
      missing: nicheKnown ? missingFields(cv || {}, fields, c) : [], packUnverified, townsWithoutDossier,
    };
    const stage = stageOf(summary);
    const blockers = blockersOf(summary);
    const kinds = new Set(blockers.map(b => b.kind).filter(k => NEEDS_PERSON.has(k)));
    for (const k of kinds) needs[k]++;

    // Running now, for this client
    const runs = [];
    for (const t of ['category', 'service', 'location']) {
      const R = runners[t];
      if (R && R.running && R.running.has(c.id)) {
        const st = runStates[t].get(c.id) || {};
        const list = st.pages || [];
        const done = list.filter(p => ['done', 'kept', 'blocked', 'failed', 'skipped'].includes(p.status)).length;
        const cur = list.find(p => p.status === 'running') || null;
        const nxt = list.find(p => p.status === 'pending') || null;
        runs.push({ kind: `${t} pages`, now: cur ? `Writing ${cur.title}` : `Starting the ${t} pages`, next: nxt ? `Next: ${nxt.title}` : 'Then the run finishes and the page list refreshes', done, total: list.length, started_at: R.running.get(c.id).startedAt });
      }
    }
    if (homepageRunning && homepageRunning.has(c.id)) runs.push({ kind: 'homepage', now: 'Writing the homepage', next: 'Then the validator and the claims review run', done: null, total: null });
    for (const j of researchJobs.filter(j => j.client_id === c.id)) {
      const locs = Object.values(parse(j.locations) || {});
      const cur = locs.find(l => l.status === 'running' || l.status === 'pending');
      runs.push({ kind: 'research', now: cur ? `Researching ${cur.name}` : 'Research running', next: 'Then the dossier is saved and the allocation pass runs', done: locs.filter(l => l.status === 'done').length, total: locs.length });
    }
    for (const j of h1Jobs.filter(j => j.client_id === c.id)) runs.push({ kind: 'H1 research', now: j.stage || 'Looking up search volume', next: j.kind === 'generate' ? 'Then the page map is built from the volumes' : 'Then the H1s are proposed', done: null, total: null });
    const g = gbp.get(c.id);
    if (g && g.running) runs.push({ kind: 'GBP', now: 'Writing the GBP description, services and products', next: 'Then the validator checks them', done: null, total: null });
    const pendingScans = (scansByClient.get(c.id) || []).filter(s => s && s.status === 'pending').length;
    if (pendingScans) runs.push({ kind: 'rank scan', now: `${pendingScans} scan${pendingScans === 1 ? '' : 's'} running on LeadSnap`, next: 'Then the Top 3% is read back', done: null, total: null });
    for (const r of runs) runningNow.push({ client_id: c.id, client: c.name, ...r });

    const firstAt = c.source === 'fillout' ? firstSubmission.get(c.id) || c.created_at : null;
    rows.push({
      id: c.id, name: c.name, niche_key: c.niche_key || 'other', niche: c.niche_label || c.trade || '', business_type: cv && cv.business_type ? cv.business_type : null,
      stage, stage_index: STAGES.indexOf(stage), blocker: blockers[0] ? blockers[0].text : '', blockers, needs_person: kinds.size > 0, needs_kinds: [...kinds],
      last_activity: act.get(c.id) || c.created_at, assigned_to: c.assigned_to || '', archived: !!c.archived_at, reviewed: !!c.reviewed_at, source: c.source || 'manual',
      running: runs.length > 0, first_submission_at: firstAt,
      pages: { total: pages.length, written: pages.filter(p => p.good).length }, towns_without_dossier: townsWithoutDossier,
      missing_fields: summary.missing, pack_unverified: packUnverified,
    });
  }

  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const fresh = rows.filter(r => r.first_submission_at && !r.archived);
  const tiles = {
    new_today: fresh.filter(r => new Date(r.first_submission_at) >= dayStart).length,
    new_week: fresh.filter(r => new Date(r.first_submission_at) >= weekStart).length,
    needs_person: { count: rows.filter(r => !r.archived && r.needs_person).length, by_kind: needs },
    running: runningNow.length,
  };
  return { tiles, clients: rows, running: runningNow, tabs, niches, stages: STAGES, generated_at: now.toISOString() };
}

// ── Rankings: Top 3% per client per month, the primary keyword, the last n months ─
async function loadRankings({ pool, months = 6, now = new Date() }) {
  const { rows } = await pool.query(`SELECT a.client_id, c.name, a.content FROM client_assets a JOIN clients c ON c.id = a.client_id WHERE a.asset_type = 'gbp_scan' AND c.archived_at IS NULL ORDER BY a.uploaded_at`);
  const byClient = new Map();
  for (const r of rows) { if (!byClient.has(r.client_id)) byClient.set(r.client_id, { name: r.name, scans: [] }); byClient.get(r.client_id).scans.push(parse(r.content)); }
  const xs = [];
  for (let i = months - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); xs.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
  const series = [];
  for (const [client_id, { name, scans }] of byClient) {
    const table = SC.monthlyTable(scans.filter(Boolean));
    const primary = table[0];
    if (!primary) continue;
    const points = primary.months.filter(m => xs.includes(m.month)).map(m => ({ x: m.month, y: m.top_3_percentage }));
    if (points.length) series.push({ client_id, name, keyword: primary.keyword, points, latest: points[points.length - 1].y });
  }
  series.sort((a, b) => (b.latest || 0) - (a.latest || 0));
  return { months: xs, series };
}

module.exports = { loadDashboard, loadRankings, stageOf, blockersOf, missingFields, STAGES, PAGE_TYPES };
