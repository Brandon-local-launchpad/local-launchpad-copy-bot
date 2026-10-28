'use strict';

// ── The blog queue service (stage 3) ─────────────────────────────────────────
// build(clientId): the reserved topics (faq-service.js blogTopics) dated by B10 from the
//   client's launch date (blog/queue.js) and written to the page map as blog rows
//   (page-map/store.js upsertBlogRows); a wording a person approved or edited stays.
// view(clientId): every blog row with its decisions (blog/decisions.js): the gates, the
//   flags, the H1 and its length, the SEO title and its length, the links, the switches,
//   the specificity count and the publish date. No model call.
// setWording(clientId, slug, { wording, approved }): a person's approval or edit of a
//   code written question (G-TOPIC), kept as the row's manual H1.
//
// deps: pool, pageMapStore, faqService (blogTopics), filloutService (record: the price rows),
//   tradeFactsGate(clientId, trade) → { verified, niche }, packRows(niche, service, question) → { rows }
//   (a post with no service page gets the pack's rows for the service its question names),
//   v20Store (the written pages' ideas, stage 4 reads them; here the records' presence only)

const Q = require('./queue');
const { computeBlogDecisions } = require('./decisions');
const { getBlogSettings } = require('./db');
const { parseDossier } = require('../geo-dossier');

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function createBlogQueueService({ pool, pageMapStore, faqService, filloutService = null, tradeFactsGate = async () => null, packRows = () => ({ rows: [] }), v20Store = null, log = console }) {
  async function dossiersFor(clientId) {
    const { rows } = await pool.query(`SELECT content, metadata FROM client_assets WHERE client_id = $1 AND asset_type = 'geo_dossier' ORDER BY uploaded_at DESC`, [clientId]);
    const out = []; const seen = new Set();
    for (const r of rows) { const m = (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) || {}; const loc = m.location_name || ''; if (m.superseded || !loc || seen.has(loc.toLowerCase())) continue; seen.add(loc.toLowerCase()); out.push({ location: loc, text: r.content }); }
    return out;
  }

  // Everything the decisions need for one client, read once
  async function inputsFor(clientId) {
    const problems = [];
    const T = await faqService.blogTopics(clientId, null);
    const settings = await getBlogSettings(pool, clientId);
    let priceRows = [];
    if (filloutService) { try { const rec = await filloutService.record(clientId); priceRows = (rec && rec.prices && rec.prices.rows) || []; } catch (e) { problems.push(`price rows not read: ${e.message}`); } }
    let gate = null;
    try { gate = await tradeFactsGate(clientId, T.ctx.trade); } catch (e) { problems.push(`trade facts pack not checked: ${e.message}`); }
    let dossiers = [];
    try { dossiers = await dossiersFor(clientId); } catch (e) { problems.push(`dossiers not read: ${e.message}`); }
    const parsed = new Map();
    for (const d of dossiers) { try { parsed.set(norm(d.location), parseDossier(d.text)); } catch (e) { problems.push(`${d.location}: dossier not parsed (${e.message})`); } }
    const questions = new Map(((T.sort && T.sort.record && T.sort.record.questions) || []).map(q => [q.id, q]));
    return { ...T, settings, priceRows, gate, dossiers: parsed, questions, problems, pageWordings: T.pageWordings || [] };
  }

  async function build(clientId) {
    const I = await inputsFor(clientId);
    if (!I.blog) throw Object.assign(new Error('No FAQ questions sorted for this client yet: run the FAQ research and the sorting first.'), { status: 400 });
    const sch = Q.schedule(I.blog.topics, I.settings.launch_date);
    const existing = await pageMapStore.blogRows(clientId);
    const rows = Q.rowsFor(sch.topics, { existing, held: I.blog.held_back || [] });
    await pageMapStore.upsertBlogRows(clientId, rows);
    log.log(`[blog] queue built for ${clientId}: ${rows.length} rows${I.settings.launch_date ? ` from ${I.settings.launch_date}` : ' (no launch date)'}`);
    return view(clientId, { inputs: I, scheduleFlags: sch.flags });
  }

  // The decisions for one row, from the inputs; ideasUsed from the runner (blog/run.js)
  function decide(I, row, blogRows, { ideasUsed = [], usedQuestions = [] } = {}) {
    const info = row.info || {};
    let tradeFacts = null;
    if (I.gate && I.gate.verified) {
      // The service page's rows, else the pack service the topic queue matched (a seasonal or dossier post), else the question's
      try { tradeFacts = { ...I.gate, ...packRows(I.gate.niche, info.service || info.pack_service || '', info.wording || row.h1 || '') }; }
      catch (e) { tradeFacts = { ...I.gate, rows: [], error: e.message }; }
    } else tradeFacts = I.gate ? { ...I.gate, rows: [] } : null;
    const dossier = info.post_type === 'local' ? (I.dossiers.get(norm(info.town || I.ctx.keyValueMap.biz_area_1)) || null) : null;
    // The questions the pages use, the other posts' H1s and, from the runner, the written posts' FAQ questions (B-N7)
    const others = blogRows.filter(r => r.slug !== row.slug && r.applies !== false).map(r => (r.info && r.info.wording) || r.h1).filter(Boolean);
    return computeBlogDecisions({ row, cv: I.ctx.cv, niche: I.niche, keyValueMap: I.ctx.keyValueMap, pages: I.ctx.pages, questions: I.questions, priceRows: I.priceRows, tradeFacts, dossier, ideasUsed, usedQuestions: [...(I.pageWordings || []), ...others, ...usedQuestions], blogRows });
  }

  // The latest record of each post, summarised for the queue (the Pages tab's Blog filter)
  async function recordsFor(clientId, rows) {
    const out = new Map();
    if (!v20Store) return out;
    for (const r of rows) {
      const f = await v20Store.latest(clientId, { type: 'blog', key: r.slug });
      if (!f) continue;
      const rec = f.record, V = rec.VALIDATION || {}, m = rec.meta || {};
      out.set(r.slug, { id: f.id, at: m.edited_at || m.generated_at, blocked: !!rec.blocked, error: rec.error || null, block: V.block ?? null, flag: V.flag ?? null, claims: rec.CLAIMS && rec.CLAIMS.findings ? rec.CLAIMS.findings.length - ((rec.CLAIMS.accepted || []).length) : null, good: !!(rec && !rec.blocked && !rec.error && V.status === 'run' && V.block === 0), approved: !!m.approved_at, flags: (rec.FLAGS || []).length });
    }
    return out;
  }

  async function view(clientId, { inputs = null, scheduleFlags = [] } = {}) {
    const I = inputs || await inputsFor(clientId);
    const rows = await pageMapStore.blogRows(clientId);
    const live = rows.filter(r => r.applies !== false);
    const records = await recordsFor(clientId, live);
    const out = live.map(row => {
      const d = decide(I, row, live);
      const D = d.decisions;
      const info = row.info || {};
      return {
        record: records.get(row.slug) || null,
        slug: row.slug, status: row.status === 'Held' || d.gates.some(g => g.hold) ? 'Held' : row.status, post_type: info.post_type, source: info.source, batch: info.batch, homepage_cost_guide: !!info.homepage_cost_guide, town: info.town || '',
        wording: info.wording || row.h1, wording_approved: !!info.wording_approved, wording_source: info.wording_source, needs_approval: !!info.needs_approval, question_id: info.question_id || '',
        publish_date: info.publish_date || null, month: info.month, slot_note: info.slot_note || '', held_for_date: !!info.held_for_date,
        gates: d.gates, flags: d.flags,
        // A gated post still shows its H1 (the row's: the question in title case) so the queue reads
        h1: D ? D.h1 : (row.h1 || ''), h1_length: D ? D.h1.length : (row.h1 || '').length, seo_title: D ? D.seo_title : '', title_length: D ? D.seo_title.length : 0,
        primary: D ? D.primary : null, secondary: D ? D.secondary : [], switches: D ? { table: D.table.show, table_type: D.table.type, business: D.business.show, safety: D.safety.on, cost_mode: D.cost_mode } : null,
        specificity: D ? D.specificity : null, stack: D ? D.sections.length : (info.query_stack || []).length, faq: D ? D.faq.length : (info.faq_ids || []).length,
        decisions_block: d.decisionsBlock,
      };
    });
    const counts = { rows: out.length, held: out.filter(r => r.status === 'Held').length, ready: out.filter(r => !r.gates.length && r.status !== 'Held').length, gated: out.filter(r => r.gates.length && r.status !== 'Held').length, to_approve: out.filter(r => !r.wording_approved).length, dated: out.filter(r => r.publish_date).length };
    return { rows: out, counts, settings: I.settings, reservation: I.blog ? { counts: I.blog.counts, flags: I.blog.flags, pool: I.blog.pool } : null, schedule_flags: scheduleFlags, site_check: I.siteCheck, problems: [...(I.problems || []), ...((I.blog && I.blog.problems) || [])] };
  }

  async function setWording(clientId, slug, { wording, approved } = {}) {
    const rows = await pageMapStore.blogRows(clientId);
    const row = rows.find(r => r.slug === slug);
    if (!row) throw Object.assign(new Error(`No blog post ${slug} in the queue.`), { status: 404 });
    const cur = row.info || {};
    const w = wording !== undefined ? String(wording || '').replace(/\s+/g, ' ').trim() : (cur.wording || row.h1);
    if (!w) throw Object.assign(new Error('The question cannot be blank.'), { status: 400 });
    if (/[—–]/.test(w)) throw Object.assign(new Error('The question has an em or en dash; use a comma or a full stop.'), { status: 400 });
    const edited = wording !== undefined && w !== (cur.wording || row.h1);
    const ok = approved !== undefined ? !!approved : (edited ? false : !!cur.wording_approved);
    const { question } = require('./topics');
    await pageMapStore.patchBlogRow(clientId, slug, { info: { wording: w, wording_edited: edited || !!cur.wording_edited, wording_approved: ok }, h1: question(w), title: question(w) });
    return view(clientId);
  }

  // The blog rows in queue order (the runner's order)
  const rowsFor = clientId => pageMapStore.blogRows(clientId);

  return { build, view, setWording, inputsFor, decide, rowsFor };
}

module.exports = { createBlogQueueService };
