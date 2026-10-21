'use strict';

// ── FAQ research and sorting service (F1 to F3) ─────────────────────────────
// What the FAQ questions card and the homepage decisions call; the routes in
// server.js are thin wrappers. Storage is client_assets:
//   faq_research  the Perplexity reply (content) for one run; older runs are
//                 marked superseded, as dossiers are
//   faq_sort      one row per client: the tidied questions, approvals, hand edits
//                 and moves (JSON)
// The research runs as a research_jobs record with one row, code FAQ, so it uses
// the same Perplexity submit, poll and restart recovery as the area research.
// Where each question goes is worked out by faq-sort.js each time it's read, from
// the client's values and page map as they are now.

const R = require('./faq-research');
const S = require('./faq-sort');

const FAQ_CODE = 'FAQ';

function createFaqService({
  pool, loadContext, loadNiche, perplexity, jobs, callSortModel,
  latestPageQuestions = async () => ({}), homepageDecisions = null, log = console,
}) {
  const researchRunning = new Map(); // clientId → jobId
  const lastJob = new Map();         // clientId → jobId, so a failure shows even if the job row couldn't be saved
  const sortRunning = new Set();

  // ── Storage ──
  async function latestResearch(clientId) {
    const { rows } = await pool.query(
      `SELECT id, content, metadata, uploaded_at FROM client_assets WHERE client_id=$1 AND asset_type='faq_research' ORDER BY uploaded_at DESC`, [clientId]);
    const row = rows.find(r => !((typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) || {}).superseded);
    if (!row) return null;
    return { id: row.id, text: row.content, savedAt: row.uploaded_at, meta: (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) || {}, parsed: R.parseFaqResearch(row.content) };
  }

  async function saveResearch(clientId, text, meta) {
    const { rows } = await pool.query(`SELECT id, metadata FROM client_assets WHERE client_id=$1 AND asset_type='faq_research'`, [clientId]);
    for (const r of rows) {
      const m = (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) || {};
      if (!m.superseded) await pool.query(`UPDATE client_assets SET metadata=$1 WHERE id=$2`, [JSON.stringify({ ...m, superseded: true }), r.id]);
    }
    const ins = await pool.query(
      `INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'faq_research', 'faq_research.md', $2, $3) RETURNING id`,
      [clientId, text, JSON.stringify({ ...meta, superseded: false })]);
    return ins.rows[0].id;
  }

  async function loadSort(clientId) {
    const { rows } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id=$1 AND asset_type='faq_sort' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    return rows.length ? { id: rows[0].id, record: JSON.parse(rows[0].content) } : null;
  }

  async function saveSort(clientId, record) {
    const existing = await loadSort(clientId);
    const content = JSON.stringify(record);
    if (existing) await pool.query(`UPDATE client_assets SET content=$1, uploaded_at=NOW() WHERE id=$2`, [content, existing.id]);
    else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'faq_sort', 'faq_sort.json', $2)`, [clientId, content]);
  }

  async function latestJob(clientId) {
    const id = researchRunning.get(clientId) || lastJob.get(clientId);
    if (id) { const r = await jobs.load(id); if (r) return r; }
    const { rows } = await pool.query(`SELECT id, locations FROM research_jobs WHERE client_id=$1 ORDER BY created_at DESC LIMIT 50`, [clientId]);
    const row = rows.find(r => ((typeof r.locations === 'string' ? JSON.parse(r.locations) : r.locations) || {})[FAQ_CODE]);
    return row ? jobs.load(row.id) : null;
  }

  // ── F1: research ──
  // The client's saved area dossiers (not superseded), primary city first
  async function dossiersFor(clientId, keyValueMap) {
    const { rows } = await pool.query(
      `SELECT content, metadata FROM client_assets WHERE client_id=$1 AND asset_type='geo_dossier' ORDER BY uploaded_at DESC`, [clientId]);
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      const m = (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) || {};
      const loc = m.location_name || '';
      if (m.superseded || !loc || seen.has(loc.toLowerCase())) continue;
      seen.add(loc.toLowerCase());
      out.push({ location: loc, text: r.content });
    }
    const city = String(keyValueMap.biz_area_1 || '').toLowerCase();
    return out.sort((a, b) => (b.location.toLowerCase().startsWith(city) ? 1 : 0) - (a.location.toLowerCase().startsWith(city) ? 1 : 0));
  }

  // Everything known about the client goes into the research: trade, towns and
  // services, the customers' own questions, confirmed client values, the onboarding
  // answers and the area dossiers.
  async function researchInput(clientId, sessionId) {
    const ctx = await loadContext(clientId, sessionId);
    const { niche, error } = loadNiche(ctx.trade, ctx);
    if (error) throw new Error(error);
    const dossiers = await dossiersFor(clientId, ctx.keyValueMap);
    return { ctx, niche, dossiers, input: { niche, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, pages: ctx.pages, cv: ctx.cv, onboardingText: ctx.onboardingText || '', dossiers } };
  }

  async function promptFor(clientId, sessionId) {
    const { ctx, input } = await researchInput(clientId, sessionId);
    if (!(ctx.keyValueMap.biz_area_1 || '').trim()) throw new Error('The primary city (biz_area_1) is blank in the custom values.');
    return R.buildFaqResearchPrompt(input);
  }

  // What the research will use, in plain words for the card
  function inputsSummary(ctx, dossiers) {
    return {
      customerQuestions: R.customerQuestions(ctx.cv).length,
      onboarding: R.onboardingAnswers(ctx.onboardingText || '').length,
      facts: R.confirmedFacts(ctx.cv).length,
      dossiers: dossiers.map(d => d.location),
      primaryCity: ctx.keyValueMap.biz_area_1 || '',
    };
  }

  // Reads a finished Perplexity reply, saves it, then runs the sorting step. Also
  // used by the restart recovery in server.js. Returns { saved, error }.
  async function finishResearch(record, clientId, pxRes) {
    const raw = perplexity.text(pxRes);
    const text = raw.trim() ? perplexity.resolveCitations(raw, pxRes).text : '';
    const usage = pxRes.usage || {};
    const cost = usage.cost && usage.cost.total_cost != null ? usage.cost.total_cost : null;
    const parsed = R.parseFaqResearch(text);
    const { valid, error } = text ? R.validateFaqResearch(parsed) : { valid: false, error: 'empty output from Perplexity' };
    // The reply as Perplexity sent it is always kept on the job, read or not, so it can
    // be checked (the card links it) and read again without a new Perplexity run
    const rawKept = { rawOutputText: raw, rawOutputJson: JSON.stringify(pxRes) };
    if (!valid) {
      await jobs.update(record, FAQ_CODE, { status: 'validation_failed', finishedAt: new Date().toISOString(), error, cost, ...rawKept });
      researchRunning.delete(clientId);
      return { saved: false, error };
    }
    const assetId = await saveResearch(clientId, text, { job_id: record.id, question_count: parsed.questions.length, cost, warnings: parsed.warnings.slice(0, 20) });
    await jobs.update(record, FAQ_CODE, {
      status: 'done', finishedAt: new Date().toISOString(), assetId, cost, error: null,
      questionCount: parsed.questions.length, warnings: parsed.warnings.length,
      inputTokens: usage.input_tokens || null, outputTokens: usage.output_tokens || null,
      ...rawKept,
    });
    researchRunning.delete(clientId);
    // Sorting runs by itself on new research; a failure shows on the card
    runSort(clientId, null).catch(e => log.error(`[faq] sorting after research failed for ${clientId}:`, e.message));
    return { saved: true, assetId };
  }

  // The latest job's saved reply, as Perplexity sent it
  async function rawReply(clientId) {
    const job = await latestJob(clientId);
    const row = job ? job.locations[FAQ_CODE] || {} : {};
    let pxRes = null;
    try { pxRes = row.rawOutputJson ? JSON.parse(row.rawOutputJson) : null; } catch (e) { log.error('[faq] saved reply JSON could not be read:', e.message); }
    // Jobs from before 15 Oct kept only the text (citations already resolved)
    if (!pxRes && row.rawOutputText) pxRes = { output_text: row.rawOutputText };
    return { job, row, pxRes, text: pxRes ? perplexity.text(pxRes) : '' };
  }

  // Read the latest saved reply again (after a parser fix), without a new Perplexity run
  async function rereadResearch(clientId) {
    if (researchRunning.has(clientId)) throw new Error('FAQ research is running for this client; wait for it to finish.');
    const { job, pxRes } = await rawReply(clientId);
    if (!pxRes) throw new Error('No saved FAQ research reply to read for this client.');
    researchRunning.set(clientId, job.id);
    lastJob.set(clientId, job.id);
    try {
      return await finishResearch(job, clientId, pxRes);
    } finally {
      researchRunning.delete(clientId);
    }
  }

  async function startResearch(clientId, sessionId) {
    if (researchRunning.has(clientId)) throw new Error('FAQ research is already running for this client.');
    const prompt = await promptFor(clientId, sessionId);
    const record = {
      id: require('crypto').randomUUID(), sessionId: sessionId || '', clientId, status: 'running', preset: perplexity.preset,
      locations: { [FAQ_CODE]: { name: 'FAQ questions', kind: 'faq', status: 'pending', startedAt: null, finishedAt: null, error: null } },
      createdAt: Date.now(),
    };
    await jobs.create(record);
    researchRunning.set(clientId, record.id);
    lastJob.set(clientId, record.id);
    (async () => {
      let lastErr = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await jobs.update(record, FAQ_CODE, { status: 'running', startedAt: new Date().toISOString(), error: null });
          const deadline = Date.now() + perplexity.timeoutMs;
          const pxJobId = await perplexity.submit(prompt, delay => jobs.update(record, FAQ_CODE, { statusDetail: `waiting (rate limit), retrying in ${delay}s` }).catch(() => {}));
          await jobs.update(record, FAQ_CODE, { pxJobId, statusDetail: null });
          const pxRes = await perplexity.poll(pxJobId, deadline);
          await finishResearch(record, clientId, pxRes);
          return;
        } catch (e) {
          lastErr = e;
          log.warn(`[faq] research attempt ${attempt} failed for ${clientId}: ${e.message}`);
        }
      }
      await jobs.update(record, FAQ_CODE, { status: 'failed', finishedAt: new Date().toISOString(), error: lastErr.message }).catch(() => {});
      researchRunning.delete(clientId);
    })();
    return { jobId: record.id };
  }

  // After "Run Research" on the Geo Research step: once per client, when there is
  // no FAQ research yet and none running. Never throws.
  async function maybeAutoResearch(clientId, sessionId) {
    try {
      if (researchRunning.has(clientId) || await latestResearch(clientId)) return null;
      const job = await latestJob(clientId);
      if (job && ['running', 'pending'].includes((job.locations[FAQ_CODE] || {}).status)) return null;
      return await startResearch(clientId, sessionId);
    } catch (e) {
      log.error(`[faq] auto research not started for ${clientId}: ${e.message}`);
      return null;
    }
  }

  // ── F2: sorting ──
  async function runSort(clientId, sessionId) {
    if (sortRunning.has(clientId)) throw new Error('The FAQ sorting step is already running for this client.');
    sortRunning.add(clientId);
    try {
      const research = await latestResearch(clientId);
      if (!research) throw new Error('No FAQ research saved for this client yet. Run the FAQ research first.');
      const ctx = await loadContext(clientId, sessionId);
      const { niche, error } = loadNiche(ctx.trade, ctx);
      if (error) throw new Error(error);
      // The client's own customers' questions go in ahead of the research
      const own = S.clientQuestionItems(ctx.cv);
      const tidy = await S.runTidy({
        research: { questions: [...own, ...research.parsed.questions] }, niche, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap,
        pages: ctx.pages, cv: ctx.cv, callModel: callSortModel,
      });
      const old = await loadSort(clientId);
      const record = {
        version: 1,
        research_asset_id: research.id,
        updated_at: new Date().toISOString(),
        model: tidy.model,
        attempts: tidy.attempts,
        customer_questions: own.map(q => q.text),
        questions: S.carryOver(tidy.questions, old ? old.record.questions : []),
      };
      await saveSort(clientId, record);
      log.log(`[faq] sorted ${record.questions.length} questions for ${clientId} in ${tidy.attempts.length} attempt(s)`);
      return record;
    } finally {
      sortRunning.delete(clientId);
    }
  }

  const customersChanged = (sort, cv) => JSON.stringify(sort.record.customer_questions || []) !== JSON.stringify(R.customerQuestions(cv));

  // ── Assignment for the client as it is now ──
  async function assignmentFor(clientId, ctx, niche) {
    const sort = await loadSort(clientId);
    if (!sort) return { sort: null, assignment: null };
    const pins = {};
    const placed = await latestPageQuestions(clientId);
    for (const [pageId, questions] of Object.entries(placed)) for (const q of questions) pins[S.normWording(q)] = pageId;
    const assignment = S.assignQuestions({
      questions: sort.record.questions, cv: ctx.cv, pages: ctx.pages, keyValueMap: ctx.keyValueMap,
      serviceParentMap: ctx.serviceParentMap, niche, pins,
    });
    return { sort, assignment };
  }

  // F3: the research questions the homepage may use, and flags for the preview
  async function homepageFaq(clientId, ctx, niche) {
    const flags = [];
    const { sort, assignment } = await assignmentFor(clientId, ctx, niche);
    if (!sort) {
      flags.push({ code: 'F-FAQ', msg: 'No FAQ questions sorted for this client yet: the homepage uses the niche questions.' });
      return { faqResearch: [], flags };
    }
    const research = await latestResearch(clientId);
    if (research && research.id !== sort.record.research_asset_id) flags.push({ code: 'F-FAQ', msg: 'The FAQ questions were sorted from an older research run. Re-run the sorting step.' });
    if (customersChanged(sort, ctx.cv)) flags.push({ code: 'F-FAQ', msg: "The customers' questions on Client Values changed since the FAQ questions were sorted. Re-run the sorting step." });
    const hp = (assignment.pages['homepage:homepage'] || { questions: [] }).questions;
    const unapproved = hp.filter(q => !q.approved && q.fact_supplied).length;
    if (unapproved) flags.push({ code: 'F-FAQ', msg: `${unapproved} homepage FAQ question(s) are waiting for their wording to be approved on the FAQ questions card.` });
    return { faqResearch: S.homepageQuestions(assignment, niche), flags };
  }

  // ── The card ──
  async function view(clientId, sessionId) {
    const ctx = await loadContext(clientId, sessionId);
    const { niche, error } = loadNiche(ctx.trade, ctx);
    if (error) return { error };
    const job = await latestJob(clientId);
    const jobRow = job ? job.locations[FAQ_CODE] || {} : null;
    const research = await latestResearch(clientId);
    const { sort, assignment } = await assignmentFor(clientId, ctx, niche);

    let homepageUsed = null;
    if (assignment && homepageDecisions) {
      try {
        const d = homepageDecisions(ctx, niche, S.homepageQuestions(assignment, niche));
        if (d && d.decisions) homepageUsed = d.decisions.d11_faq.filter(q => q.research_id).map(q => ({ slot: q.slot, id: q.research_id, question: q.question }));
      } catch (e) { log.error('[faq] homepage decisions for the card failed:', e.message); }
    }

    const pageOptions = [
      { id: 'homepage:homepage', label: 'Homepage' },
      ...ctx.pages.filter(p => ['category', 'service', 'location'].includes(p.pageType) && (p.urlSlug || '').trim() && !/^not[\s_]?built$/i.test(p.status || ''))
        .map(p => ({ id: S.pageId(p), label: `${p.pageType}: ${p.pageTitle}` })),
    ];
    const placement = {};
    if (assignment) {
      for (const p of Object.values(assignment.pages)) for (const q of p.questions) placement[q.id] = { page: p.id, pageTitle: p.type === 'homepage' ? 'Homepage' : `${p.type}: ${p.title}`, note: q.route_note || '', pinned: !!q.pinned, usable: q.usable };
      for (const [why, list] of Object.entries(assignment.held)) for (const q of list) placement[q.id] = { held: why, reason: q.held_reason || (why === 'covered' ? `answered by the homepage's ${q.covered_by}` : why === 'duplicate' ? `same question as ${q.duplicate_of || 'another'}` : '') };
    }
    const facts = Object.fromEntries(S.factList(niche).map(f => [f.key, f]));

    return {
      running: { research: researchRunning.has(clientId), sort: sortRunning.has(clientId) },
      job: job ? { id: job.id, status: jobRow.status, error: jobRow.error || null, startedAt: jobRow.startedAt, finishedAt: jobRow.finishedAt, cost: jobRow.cost ?? null, hasRaw: !!(jobRow.rawOutputText || jobRow.rawOutputJson) } : null,
      research: research ? {
        id: research.id, savedAt: research.savedAt, questionCount: research.parsed.questions.length,
        ranges: research.parsed.ranges, rules: research.parsed.rules, gaps: research.parsed.gaps, warnings: research.parsed.warnings,
      } : null,
      sort: sort ? { updatedAt: sort.record.updated_at, stale: !!(research && research.id !== sort.record.research_asset_id), customersChanged: customersChanged(sort, ctx.cv), attempts: sort.record.attempts } : null,
      inputs: inputsSummary(ctx, await dossiersFor(clientId, ctx.keyValueMap)),
      questions: sort ? sort.record.questions.map(q => ({
        id: q.id, source: q.source || 'research', original: q.text, wording: q.wording, wording_errors: q.wording_errors, edited: !!q.edited, approved: !!q.approved,
        doubt: q.doubt, page: q.page, service: q.service, town: q.town, seen: q.seen, seenCount: q.seenCount, rank: q.rank, url: q.url,
        fact: q.fact ? (facts[q.fact] || {}).label || q.fact : '', new_fact: q.new_fact || '', page_override: q.page_override || null,
        placement: placement[q.id] || null,
      })) : [],
      waitingByFact: assignment ? assignment.waitingByFact : [],
      homepageUsed,
      pageOptions,
      siteRepeats: assignment ? S.siteRepeats(Object.fromEntries(Object.values(assignment.pages).map(p => [p.id, p.questions]))) : [],
    };
  }

  // Approve, edit wording, or move a question by hand. updates: [{ id, wording?, approved?, page_override? }]
  async function updateQuestions(clientId, updates, sessionId) {
    const sort = await loadSort(clientId);
    if (!sort) throw new Error('No FAQ questions sorted for this client yet.');
    const ctx = await loadContext(clientId, sessionId);
    const pageIds = new Set(['homepage:homepage', ...ctx.pages.map(S.pageId)]);
    const byId = new Map(sort.record.questions.map(q => [q.id, q]));
    const errors = [];
    for (const u of Array.isArray(updates) ? updates : []) {
      const q = byId.get(String(u.id || ''));
      if (!q) { errors.push(`${u.id}: not one of this client's questions`); continue; }
      if (typeof u.wording === 'string' && u.wording.trim() !== q.wording) {
        const w = u.wording.trim().replace(/\s+/g, ' ');
        const errs = S.checkWording(w);
        if (errs.length) { errors.push(`${q.id}: ${errs.join('; ')}`); continue; }
        q.wording = w; q.wording_errors = []; q.edited = true; q.approved = false;
      }
      if (u.page_override !== undefined) {
        if (u.page_override && u.page_override !== 'drop' && !pageIds.has(u.page_override)) { errors.push(`${q.id}: no such page ${u.page_override}`); continue; }
        q.page_override = u.page_override || null;
      }
      if (u.approved !== undefined) {
        if (u.approved && q.wording_errors.length) { errors.push(`${q.id}: fix the wording before approving (${q.wording_errors.join('; ')})`); continue; }
        q.approved = !!u.approved;
      }
    }
    if (errors.length) { const e = new Error(errors.join('\n')); e.status = 400; throw e; }
    sort.record.updated_at = new Date().toISOString();
    await saveSort(clientId, sort.record);
    return view(clientId, sessionId);
  }

  return {
    FAQ_CODE, startResearch, finishResearch, rereadResearch, rawReply, maybeAutoResearch, runSort, homepageFaq, view, updateQuestions,
    latestResearch, loadSort, isResearchRunning: id => researchRunning.has(id),
  };
}

module.exports = { createFaqService, FAQ_CODE };
