'use strict';

// ── The dashboard (27 Oct 2026): every client's stage, first blocker, what needs a
// person, what is running, and the Top 3% series ────────────────────────────────
// Read only. A handful of queries across all clients (no per client loop over the
// stores), then pure rules: stageOf, blockersOf. Nothing here calls a model or
// Local Falcon or LeadSnap. The rules in words:
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
const { costPence } = require('./model-log');
const { trackerOf } = require('./tracker');
// What a page costs to write when nothing has been logged yet, in pence (the real Edens Edge runs, Oct 2026)
const DEFAULT_COST = { homepage: 65, category: 60, service: 60, location: 60 };

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

// Client values that hold nothing but what the form filled in (fillout/to-values.js) are not a person's work yet:
// the client stays at Onboarding until the record is reviewed, as before the fill existed
const hasVal = v => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '');
function onlyFormFilled(cv) {
  // A field GHL's onboarding filled (ghl-onboarding/rules.js mirror) is no more a person's work than one the form filled
  const ours = cv._form_filled || cv._ghl_filled ? { ...(cv._form_filled || {}), ...(cv._ghl_filled || {}) } : null;
  if (!ours || !Object.keys(ours).length) return false;
  return !Object.keys(cv).some(k => !k.startsWith('_') && hasVal(cv[k]) && !ours[k]);
}
// What the form filled, and how many of those still wait for a person's Confirm
function formFill(cv) {
  const ours = (cv && cv._form_filled) || {}, src = (cv && cv._sources) || {}, conf = (cv && cv._confirmed) || {};
  const keys = Object.keys(ours).filter(k => src[k] === 'form' || src[k] === 'form_inferred');
  return { filled: keys.length, to_confirm: keys.filter(k => src[k] === 'form_inferred' && !conf[k]).length };
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
  // The place ID step (9 Nov): a to-do on every client until the Google listing is confirmed on the Record tab
  if (s.placeIdMissing) out.push({ kind: 'place_id', text: 'place ID missing', count: 1 });
  return out;
}

const NEEDS_PERSON = new Set(['fields', 'pack', 'claims', 'blocked']);

// ── Loading ───────────────────────────────────────────────────────────────────
// deps: { pool, tradeFacts (status(niche)), runners: { category, service, location } each with a
// `running` Map (clientId → { startedAt, current }), homepageRunning: Set of clientIds }
async function loadDashboard({ pool, tradeFacts = null, runners = {}, homepageRunning = null, now = new Date(), clientId = null, formGaps = null } = {}) {
  const all = await listClients(pool, { archived: true });
  const { tabs, niches } = all;
  const clients = clientId ? all.clients.filter(c => c.id === clientId) : all.clients;
  const byClient = new Map(clients.map(c => [c.id, c]));
  const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

  // Latest page record per client, type and key: the summary only, pulled out in SQL
  const PT = `COALESCE(metadata->>'page_type', 'homepage')`, PK = `COALESCE(metadata->>'page_key', 'homepage')`;
  const recs = await q(`SELECT DISTINCT ON (client_id, ${PT}, ${PK}) id, client_id, uploaded_at, ${PT} AS page_type, ${PK} AS page_key,
      (content::jsonb)->'VALIDATION'->>'status' AS v_status, (content::jsonb)->'VALIDATION'->>'block' AS block, (content::jsonb)->'VALIDATION'->>'flag' AS flag,
      (content::jsonb)->>'blocked' AS blocked, (content::jsonb)->>'error' AS error, (content::jsonb)->'CLAIMS' AS claims,
      (content::jsonb)->'QUALITY'->>'score' AS score,
      (content::jsonb)->'meta'->>'generated_at' AS generated_at, (content::jsonb)->'meta'->>'edited_at' AS edited_at, (content::jsonb)->'meta'->>'failed' AS failed, (content::jsonb)->'meta'->>'approved_at' AS approved_at,
      (content::jsonb)->'meta'->>'model' AS model, (content::jsonb)->'meta'->'usage' AS usage, (content::jsonb)->'VALIDATION'->'retry_usage' AS retry_usage
    FROM client_assets WHERE asset_type = 'v20_page_record' ORDER BY client_id, ${PT}, ${PK}, uploaded_at DESC`);
  const recordsByClient = new Map();
  for (const r of recs) {
    const claims = parse(r.claims) || null;
    const meta = { generated_at: r.generated_at, edited_at: r.edited_at, failed: r.failed === 'true', approved_at: r.approved_at };
    const usage = parse(r.usage), retryUsage = parse(r.retry_usage);
    const cost = usage || retryUsage ? Math.round((costPence(r.model, usage || {}) + costPence(r.model, retryUsage || {})) * 100) / 100 : null;
    const rec = {
      id: r.id, type: r.page_type, key: r.page_key, at: meta.edited_at || meta.generated_at || r.uploaded_at, cost_pence: cost, model: r.model || null,
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
  const leadSnap = new Map((await latest('leadsnap_autopost')).map(r => [r.client_id, parse(r.content) || {}]));
  // The Location Determiner (the Locations tab dot): a run saved, an approved list
  const locRunAt = new Map((await q(`SELECT client_id, MAX(uploaded_at) AS at FROM client_assets WHERE asset_type = 'locations_run' GROUP BY client_id`)).map(r => [r.client_id, r.at]));
  const locRuns = new Set(locRunAt.keys());
  let locApproved = new Map();
  try { locApproved = new Map((await q(`SELECT client_id, MAX(approved_at) AS approved_at, MAX(run_at) AS run_at FROM client_location_tiers GROUP BY client_id`)).map(r => [r.client_id, r])); } catch (_) { /* the table is made on first use */ }
  // The Site audit tab's dot: scanning, waiting for decisions, or every decision approved
  let siteAudits = new Map();
  try {
    const audits = await q(`SELECT client_id, status, summary, started_at FROM site_scans ORDER BY started_at`);
    siteAudits = new Map(audits.map(a => {
      const s = parse(a.summary), dec = s && s.decisions;
      return [a.client_id, a.status === 'running' ? 'run' : dec && dec.total && dec.approved === dec.total ? 'ok' : 'wait'];
    }));
  } catch (_) { /* the fixtures that build this row don't all make the site audit tables */ }
  // A run saved more than a minute after the run the approval was made on: the locations changed since the approval
  const locChanged = id => { const a = locApproved.get(id); const r = locRunAt.get(id); return !!(a && r && a.run_at && new Date(r).getTime() > new Date(a.run_at).getTime() + 60000); };

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

  // The live tracker's extra counts (ui/tracker.js), a grouped query each; a table a fixture has not made counts as nothing
  const soft = sql => q(sql).catch(() => []);
  const group = (list, fn) => { const m = new Map(); for (const r of list) { if (!m.has(r.client_id)) m.set(r.client_id, fn()); } return m; };
  const audioRows = await soft(`SELECT client_id, download_status, transcription_status, (transcription IS NOT NULL AND transcription <> '') AS has_text FROM client_audio`);
  const audioBy = group(audioRows, () => ({ total: 0, transcribed: 0, failed: 0 }));
  for (const r of audioRows) { const a = audioBy.get(r.client_id); a.total++; if (r.has_text) a.transcribed++; else if (r.download_status === 'failed' || r.transcription_status === 'failed') a.failed++; }
  const priceBy = new Map((await soft(`SELECT client_id, status FROM client_price_state`)).map(r => [r.client_id, r.status]));
  const batchRows = await soft(`SELECT client_id, status FROM gbp_post_batches`);
  const batchBy = group(batchRows, () => ({ draft: 0, approved: 0 }));
  for (const r of batchRows) { const b = batchBy.get(r.client_id); if (r.status === 'approved') b.approved++; else if (r.status === 'draft') b.draft++; }
  const connBy = new Map((await soft(`SELECT client_id, status, publishing_on FROM bundle_connections`)).map(r => [r.client_id, { status: r.status, publishing_on: !!r.publishing_on }]));
  const pubRows = await soft(`SELECT client_id, status, count(*)::int AS n FROM gbp_publish_items GROUP BY client_id, status`);
  const pubBy = group(pubRows, () => ({ posted: 0, failed: 0 }));
  for (const r of pubRows) { const x = pubBy.get(r.client_id); if (r.status === 'posted') x.posted += Number(r.n); else if (r.status === 'failed') x.failed += Number(r.n); }
  const reviewRows = await soft(`SELECT client_id, status, count(*)::int AS n FROM gbp_reviews GROUP BY client_id, status`);
  const reviewBy = group(reviewRows, () => ({ queued: 0, posted: 0 }));
  for (const r of reviewRows) { const x = reviewBy.get(r.client_id); if (r.status === 'queued') x.queued += Number(r.n); else if (r.status === 'posted') x.posted += Number(r.n); }
  // The Review Us page (review-funnel/): is the site connected, were its settings sent, and feedback nobody has had
  const wpSites = new Set((await soft(`SELECT client_id FROM wp_connections`)).map(r => r.client_id));
  const funnelSent = new Map((await soft(`SELECT client_id, sent_at FROM review_funnel_sites`)).map(r => [r.client_id, r.sent_at]));
  const feedbackBy = group(await soft(`SELECT client_id FROM review_feedback`), () => ({ received: 0, unsent: 0 }));
  for (const r of await soft(`SELECT client_id, client_emailed_at, handled_at FROM review_feedback`)) { const x = feedbackBy.get(r.client_id); x.received++; if (!r.client_emailed_at && !r.handled_at) x.unsent++; }
  const citeRows = await soft(`SELECT client_id, listed, status, count(*)::int AS n, count(last_scanned_at)::int AS scanned FROM client_citations GROUP BY client_id, listed, status`);
  const citeBy = group(citeRows, () => ({ rows: 0, scanned: 0, listed: 0, to_submit: 0, waiting: 0 }));
  for (const r of citeRows) { const x = citeBy.get(r.client_id), n = Number(r.n); x.rows += n; x.scanned += Number(r.scanned); if (r.listed === 'yes') x.listed += n; if (r.listed === 'no' && r.status === 'not_started') x.to_submit += n; if (r.status === 'awaiting_email' || r.status === 'awaiting_approval') x.waiting += n; }

  // Monthly upkeep (automation/runner.js upkeepStep): the last competitor check, the last full citations scan and its cost, the last approved post
  const compAt = new Map((await soft(`SELECT client_id, MAX(uploaded_at) AS at FROM client_assets WHERE asset_type = 'gbp_competitor_run' GROUP BY client_id`)).map(r => [r.client_id, r.at]));
  const lastScan = new Map();
  for (const r of await soft(`SELECT client_id, finished_at, cost_usd FROM citation_scans WHERE scope = 'all' AND status = 'done' ORDER BY started_at DESC`)) if (!lastScan.has(r.client_id)) lastScan.set(r.client_id, r);
  const lastPost = new Map((await soft(`SELECT p.client_id, MAX(p.post_date) AS last FROM gbp_posts p JOIN gbp_post_batches b ON b.id = p.batch_id WHERE b.status = 'approved' GROUP BY p.client_id`)).map(r => [r.client_id, r.last]));

  // The chase message (fillout/chase.js): what each form is missing, and when the client was last chased
  const gaps = formGaps ? await Promise.resolve(formGaps()).catch(() => new Map()) : new Map();
  const chasedAt = new Map((await soft(`SELECT client_id, MAX(copied_at) AS at FROM client_chases GROUP BY client_id`)).map(r => [r.client_id, r.at]));

  // Onboarding answers from GHL (ghl-onboarding/): the saved answers and the steps a person ticked Done
  const onboardingBy = await require('../ghl-onboarding/service').loadOnboardingFacts(pool).catch(() => new Map());
  // The task board (team/service.js): the by hand steps a person has ticked and the open one off tasks; none where the tables are not made
  const teamFacts = await require('../team/service').loadFacts(pool).catch(() => null);
  // Stage 4 (team/board.js): when each open task opened, for "waiting 6 days"
  const sinceBy = teamFacts ? await require('../team/board').loadSince(pool).catch(() => new Map()) : new Map();
  // The task board, stage 3: what Copybot already knows about the site build, the migration and the cards, a grouped
  // query each (a table a fixture has not made counts as nothing). Only read when the task board's own tables are there.
  const setsBy = rows => { const m = new Map(); for (const r of rows) { if (!m.has(r.client_id)) m.set(r.client_id, new Set()); m.get(r.client_id).add(r.v); } return m; };
  const sizeOf = (m, id) => (m.get(id) ? m.get(id).size : 0);
  const siteLog = teamFacts ? await soft(`SELECT client_id, action, result, entry FROM wp_push_log WHERE result LIKE 'pushed%' OR result LIKE 'placed%'`) : [];
  const logged = (keep, value) => setsBy(siteLog.map(r => ({ client_id: r.client_id, e: parse(r.entry) || {}, action: r.action, result: r.result })).filter(keep).map(r => ({ client_id: r.client_id, v: value(r.e) })));
  const copyPushed = logged(r => r.action === 'push' && r.result === 'pushed' && r.e.pageType !== 'legal', e => `${e.pageType || 'homepage'}:${e.page || ''}`);
  const imagesPlaced = logged(r => r.action === 'images' && /^placed/.test(r.result), e => e.path || String(e.page || ''));
  const redirectsPushed = logged(r => r.action === 'redirects' && /^pushed/.test(r.result), () => 'x');
  const pagesMade = teamFacts ? setsBy((await soft(`SELECT client_id, identity AS v FROM wp_pages`))) : new Map();
  const imagesApproved = teamFacts ? setsBy((await soft(`SELECT client_id, identity AS v FROM page_image_approvals`))) : new Map();
  const legalPushed = teamFacts ? setsBy((await soft(`SELECT client_id, page AS v FROM legal_page_versions`))) : new Map();
  const preLaunch = new Map();
  if (teamFacts) for (const r of await soft(`SELECT client_id, block FROM site_redirect_checks WHERE kind = 'pre_launch' ORDER BY created_at`)) preLaunch.set(r.client_id, Number(r.block) > 0 ? 'block' : 'ok');
  const launchBy = new Map(teamFacts ? (await soft(`SELECT client_id, launched_at, day7_at FROM site_launches`)).map(r => [r.client_id, r]) : []);
  const cardsBy = new Map(teamFacts ? (await soft(`SELECT client_id, signoff, last_copied_at FROM client_card_briefs`)).map(r => [r.client_id, { copied_at: r.last_copied_at || null, signoff: parse(r.signoff) || {} }]) : []);
  // The QR codes subtab (qr-codes/): each client's saved row, turned into the Tracker's facts below
  const qrBy = new Map(teamFacts ? (await soft(`SELECT client_id, fields, checks, ticks, uploads FROM client_qr_codes`)).map(r => [r.client_id, { fields: parse(r.fields) || {}, checks: parse(r.checks) || {}, ticks: parse(r.ticks) || {}, uploads: parse(r.uploads) || {} }]) : []);
  const qrFacts = (c, cv) => { try { return require('../qr-codes/service').factsFor({ client: c, cv: cv || {}, row: qrBy.get(c.id) || null }); } catch (err) { console.error(`[dashboard] the QR codes could not be read (${c.name}):`, err.message); return null; } };
  // Tell Brandon (brandon/service.js): what people have sent him that he has not marked done
  const brandonBy = new Map();
  for (const r of await soft(`SELECT id, client_id, reason, note, asked_by, created_at, emailed FROM brandon_asks WHERE done_at IS NULL ORDER BY created_at`)) { if (!brandonBy.has(r.client_id)) brandonBy.set(r.client_id, []); brandonBy.get(r.client_id).push({ id: r.id, reason: r.reason, note: r.note || '', by: r.asked_by || '', at: r.created_at, emailed: !!r.emailed }); }

  // The automation chain (automation/runner.js): the switch and the latest steps per client
  const autoState = new Map((await soft(`SELECT client_id, enabled, enabled_at, waiting FROM automation_state`)).map(r => [r.client_id, r]));
  const autoSteps = new Map();
  for (const r of await soft(`SELECT client_id, step, label, tab, status, detail, error, started_at, finished_at FROM automation_steps WHERE status <> 'cleared' ORDER BY started_at DESC`)) { if (!autoSteps.has(r.client_id)) autoSteps.set(r.client_id, []); if (autoSteps.get(r.client_id).length < 30) autoSteps.get(r.client_id).push(r); }
  const automationOf = id => { const s = autoState.get(id); return { enabled: !!(s && s.enabled), enabled_at: s ? s.enabled_at : null, waiting: s ? s.waiting : null, steps: autoSteps.get(id) || [] }; };

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
      return { type, key, title: r.title, record: !!rec, good: !!(rec && rec.good), blocked: !!(rec && rec.blocked), block: rec ? rec.block : null, error: rec ? rec.error : null, claims: rec ? rec.claims : 0, score: rec ? rec.score : null, at: rec ? rec.at : null, cost_pence: rec ? rec.cost_pence : null, approved: !!(rec && rec.approved_at) };
    });
    const ds = dossiersByClient.get(c.id) || [];
    const norm = s => str(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const launchTowns = [...new Set(rs.filter(r => r.type === 'location' && r.applies !== false && (r.info.phase || 1) === 1).map(r => r.info.town).filter(Boolean))];
    const townsWithoutDossier = launchTowns.filter(t => !ds.some(d => d.norm === norm(t) || norm(d.name) === norm(t)));
    const hasServicePages = applicable.some(r => r.type === 'service' || r.type === 'town_service');
    const pack = hasServicePages ? await packStatus(c.niche_key) : null;
    const packUnverified = !!(pack && !pack.verified);
    const summary = {
      nicheKnown, reviewed: !!c.reviewed_at, hasValues: !!cv && !onlyFormFilled(cv), dossiers: ds, mapRows: rs, pages, pushed: pushedByClient.get(c.id) || [],
      missing: nicheKnown ? missingFields(cv || {}, fields, c) : [], placeIdMissing: nicheKnown && !str((cv || {}).gbp_place_id), packUnverified, townsWithoutDossier,
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
    // Running = not completed, not failed, not superseded (stored statuses are queue, in_progress, processing)
    const pendingRows = SC.currentRows(scansByClient.get(c.id) || []).filter(SC.isPending);
    if (pendingRows.length) runs.push({ kind: 'rank scan', now: `${pendingRows.length} scan${pendingRows.length === 1 ? '' : 's'} running on ${SC.SOURCES[SC.sourceOf(pendingRows[0])]}`, next: 'Then the Top 3% is worked out', done: null, total: null });
    for (const r of runs) runningNow.push({ client_id: c.id, client: c.name, ...r });

    const siteAudit = siteAudits.get(c.id) || 'none';
    const existingSite = cv && cv._intake ? cv._intake.existing_site !== false : null;
    const gbpDone = !!(g && g.steps && ['description', 'services', 'products'].every(k => g.steps[k] && g.steps[k].status === 'done'));
    const promptsDone = !!(leadSnap.get(c.id) && leadSnap.get(c.id).sheet);
    const hasScans = (scansByClient.get(c.id) || []).length > 0;
    const automation = automationOf(c.id);
    const tracker = trackerOf({
      automation, form_fill: formFill(cv), form_gaps: gaps.get(c.id) || null, chased_at: chasedAt.get(c.id) || null, now,
      niche_known: nicheKnown, from_form: c.source === 'fillout', reviewed: !!c.reviewed_at, form_at: c.source === 'fillout' ? firstSubmission.get(c.id) || null : null,
      audio: audioBy.get(c.id) || null, prices: priceBy.get(c.id) || null, missing: summary.missing.map(m => m.text), place_id: !summary.placeIdMissing,
      locations_run: locRuns.has(c.id), locations_run_at: locRunAt.get(c.id) || null, locations_approved: locApproved.has(c.id), locations_changed: locChanged(c.id),
      towns_researched: launchTowns.length - townsWithoutDossier.length, towns_without_dossier: townsWithoutDossier, map_pages: pages.length, pack_unverified: packUnverified,
      pages: { total: pages.length, written: pages.filter(p => p.good).length, records: pages.filter(p => p.record).length, claims: pages.reduce((n, p) => n + (p.claims || 0), 0), blocked: pages.filter(p => p.record && (p.blocked || p.block > 0)).length, failed: pages.filter(p => p.record && p.error).length, approved: pages.filter(p => p.good && p.approved).length },
      pages_at: maxDate(...pages.map(p => p.at)), homepage_good: pages.some(p => p.type === 'homepage' && p.good), pushed: (pushedByClient.get(c.id) || []).length,
      gbp_done: gbpDone, prompts_done: promptsDone, batches: batchBy.get(c.id) || null, connection: connBy.get(c.id) || null, published: pubBy.get(c.id) || null, reviews: reviewBy.get(c.id) || null,
      review_funnel: { site: wpSites.has(c.id), link: !!require('../review-funnel/rules').reviewLink(cv || {}).url, sent_at: funnelSent.get(c.id) || null, ...(feedbackBy.get(c.id) || { received: 0, unsent: 0 }) },
      citations: citeBy.get(c.id) || null, has_scans: hasScans, existing_site: existingSite, site_audit: siteAudit, running: runs,
      onboarding: onboardingBy.get(c.id) || null,
      hand: teamFacts ? { ticks: teamFacts.ticks.get(c.id) || {} } : null, tasks: teamFacts ? teamFacts.tasks.get(c.id) || [] : [], tasks_done: teamFacts ? teamFacts.tasksDone.get(c.id) || [] : [],
      // Stage 3 (ui/tracker.js): the site build, the migration's last steps and the cards. A pushed page is counted by its
      // entry on the site, so the pages still to push are the approved ones less those (never below nothing).
      site_build: teamFacts ? { connected: wpSites.has(c.id), inner_total: pages.filter(p => p.type !== 'homepage').length, created: sizeOf(pagesMade, c.id), pushed: sizeOf(copyPushed, c.id),
        to_push: Math.max(0, pages.filter(p => p.good && p.approved).length - sizeOf(copyPushed, c.id)), images_approved: sizeOf(imagesApproved, c.id), images_placed: sizeOf(imagesPlaced, c.id), legal_pushed: sizeOf(legalPushed, c.id) } : null,
      migration: teamFacts ? { redirects_pushed: sizeOf(redirectsPushed, c.id) > 0, pre_launch: preLaunch.get(c.id) || 'none', launched_at: (launchBy.get(c.id) || {}).launched_at || null, day7_at: (launchBy.get(c.id) || {}).day7_at || null } : null,
      cards: teamFacts ? cardsBy.get(c.id) || { copied_at: null, signoff: {} } : null,
      qr: teamFacts ? qrFacts(c, cv) : null,
    });
    { const opened = sinceBy.get(c.id) || {}; for (const n of tracker.needs) if (opened[n.key]) n.since = opened[n.key]; }
    const firstAt = c.source === 'fillout' ? firstSubmission.get(c.id) || c.created_at : null;
    rows.push({
      id: c.id, name: c.name, niche_key: c.niche_key || 'other', niche: c.niche_label || c.trade || '', business_type: cv && cv.business_type ? cv.business_type : null,
      stage, stage_index: STAGES.indexOf(stage), blocker: blockers[0] ? blockers[0].text : '', blockers, needs_person: kinds.size > 0, needs_kinds: [...kinds],
      last_activity: act.get(c.id) || c.created_at, assigned_to: c.assigned_to || '', archived: !!c.archived_at, reviewed: !!c.reviewed_at, source: c.source || 'manual',
      running: runs.length > 0, first_submission_at: firstAt,
      pages: { total: pages.length, written: pages.filter(p => p.good).length }, towns_without_dossier: townsWithoutDossier,
      page_types: Object.fromEntries(PAGE_TYPES.map(t => [t, { total: pages.filter(p => p.type === t).length, written: pages.filter(p => p.type === t && p.good).length, records: pages.filter(p => p.type === t && p.record).length }])),
      // Spent: the cost on the latest records; estimate: the pages not yet written clean, at the type's average on this client, else the default
      cost: (() => { const spent = pages.reduce((n, p) => n + (p.cost_pence || 0), 0); let est = 0; for (const t of PAGE_TYPES) { const done = pages.filter(p => p.type === t && p.cost_pence !== null); const avg = done.length ? done.reduce((n, p) => n + p.cost_pence, 0) / done.length : DEFAULT_COST[t]; est += pages.filter(p => p.type === t && !p.good).length * avg; } return { spent_pence: Math.round(spent * 100) / 100, estimate_pence: Math.round(est), logged: pages.filter(p => p.cost_pence !== null).length }; })(),
      // The wizard's answer: an existing site to replace (the Site audit tab shows), or a new build
      existing_site: cv && cv._intake ? cv._intake.existing_site !== false : null,
      site_audit: siteAudits.get(c.id) || 'none',
      gbp_done: !!(g && g.steps && ['description', 'services', 'products'].every(k => g.steps[k] && g.steps[k].status === 'done')), lead_snap_done: !!(leadSnap.get(c.id) && leadSnap.get(c.id).sheet), has_scans: (scansByClient.get(c.id) || []).length > 0,
      locations_run: locRuns.has(c.id), locations_approved: locApproved.has(c.id), locations_approved_at: locApproved.has(c.id) ? locApproved.get(c.id).approved_at : null, locations_run_at: locRunAt.get(c.id) || null, locations_changed: locChanged(c.id),
      missing_fields: summary.missing, pack_unverified: packUnverified,
      // The live tracker: what Copybot has done, what waits on a person now (ui/tracker.js)
      upkeep: { place_id: !!str((cv || {}).gbp_place_id), competitors_at: compAt.get(c.id) || null, scan_at: lastScan.has(c.id) ? lastScan.get(c.id).finished_at : null, scan_cost_usd: lastScan.has(c.id) ? Number(lastScan.get(c.id).cost_usd) : null,
        publishing_on: !!(connBy.get(c.id) && connBy.get(c.id).status === 'connected' && connBy.get(c.id).publishing_on), draft_batches: (batchBy.get(c.id) || { draft: 0 }).draft, last_post_date: lastPost.get(c.id) || null },
      tracker, automation, form_needed: (gaps.get(c.id) || { needed: 0 }).needed,
      brandon: brandonBy.get(c.id) || [],
      // The page list (type, key, title, good, block, claims, score, at) only for one client's summary
      page_list: clientId ? pages : undefined,
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
    brandon: rows.filter(r => !r.archived).reduce((n, r) => n + r.brandon.length, 0),
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
    // One source per client: the newest scan's, so LeadSnap and Local Falcon are never joined in a line
    const table = SC.monthlyTable(SC.currentRows(scans));
    const primary = table[0];
    if (!primary) continue;
    const points = primary.months.filter(m => xs.includes(m.month)).map(m => ({ x: m.month, y: m.top_3_percentage }));
    if (points.length) series.push({ client_id, name, keyword: primary.keyword, source: primary.source, points, latest: points[points.length - 1].y });
  }
  series.sort((a, b) => (b.latest || 0) - (a.latest || 0));
  return { months: xs, series };
}

// ── What the pages can't say yet: the reviewer's missing facts across the client's latest page records ─
async function loadMissingFacts({ pool, clientId }) {
  const PT = `COALESCE(metadata->>'page_type', 'homepage')`, PK = `COALESCE(metadata->>'page_key', 'homepage')`;
  const { rows } = await pool.query(`SELECT DISTINCT ON (${PT}, ${PK}) ${PT} AS page_type, ${PK} AS page_key, (content::jsonb)->'QUALITY'->'missing_facts' AS facts
    FROM client_assets WHERE client_id = $1 AND asset_type = 'v20_page_record' ORDER BY ${PT}, ${PK}, uploaded_at DESC`, [clientId]);
  const byFact = new Map();
  for (const r of rows) {
    const facts = parse(r.facts);
    if (!Array.isArray(facts)) continue;
    for (const f of facts) {
      const key = str(f && f.fact).toLowerCase();
      if (!key) continue;
      if (!byFact.has(key)) byFact.set(key, { fact: str(f.fact), why: str(f.why), pages: [] });
      byFact.get(key).pages.push({ type: r.page_type, key: r.page_key });
    }
  }
  return [...byFact.values()].sort((a, b) => b.pages.length - a.pages.length);
}

module.exports = { loadMissingFacts, loadDashboard, loadRankings, stageOf, blockersOf, missingFields, STAGES, PAGE_TYPES };
