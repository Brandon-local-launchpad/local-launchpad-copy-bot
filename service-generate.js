'use strict';

// ── Service page generation (CORE (17), 25 Oct 2026) ─────────────────────────
// One page per call, in the category page's shape (category-generate.js): CORE (17) plus
// the shared copy rules (prompts/_shared_copy_rules.md, appended by code as the prompt
// says) as the system prompt, the cached client block (CLIENT VALUES, confirmed
// practices, NICHE ENTRY, CALIBRATION PACK), the service's tagged trade facts rows, and
// the per page message (PAGE, DECISIONS, LINKABLE PAGES, ALLOCATED ITEMS, MODEL FIELDS).
// Then the parser, the record, the validator and the per field retries, the claims review
// and, when asked, the rubric review. `callModel({ system, message, maxTokens })` returns
// { text, usage }.

const fs   = require('fs');
const path = require('path');
const G = require('./v20-generate');
const { parseOutput } = require('./v20-parse');
const { buildServiceRecord, expectedFromServiceDecisions } = require('./service-record');
const { serviceValidationContext } = require('./validate-service');
const PT = require('./page-types/service');
const { extractIdeas } = require('./ideas');

const SERVICE_MODEL = G.V20_MODEL;
const SERVICE_MAX_TOKENS = 12000;
const PROMPT_NAMES = ['Service_Page_Copywriting_Prompt_CORE (17).md', 'Service_Page_Copywriting_Prompt_CORE (17) (1).md'];
const SHARED_RULES = '_shared_copy_rules.md';
function promptFile() {
  for (const n of PROMPT_NAMES) { const p = path.join(__dirname, 'prompts', n); if (fs.existsSync(p)) return { name: n, path: p }; }
  throw new Error(`The service page prompt is missing: prompts/${PROMPT_NAMES[0]}`);
}
// The shared rules file, the same one CORE (16) reads (category-generate.js)
function loadSharedRules() {
  return { text: require('./category-generate').loadSharedRules(), source: SHARED_RULES };
}
// CORE (17) with the shared rules appended under their own heading
function loadCore17() {
  const core = fs.readFileSync(promptFile().path, 'utf8').replace(/\r\n/g, '\n').trim();
  const shared = loadSharedRules();
  return `${core}\n\n---\n\n## SHARED COPY RULES (prompts/${SHARED_RULES}, appended by code; read from ${shared.source})\n\n${shared.text}`;
}

// The request: system blocks (CORE (17) with the shared rules, the cached client block,
// the service's trade facts rows) and the message (the decisions block)
function buildServiceRequest({ cv, niche, decisions, decisionsBlock, calibrationPack, keyValueMap, serviceParentMap, tradeFacts }) {
  const ctx = G.nicheContext(cv, niche, keyValueMap);
  const clientBlock = [
    'CLIENT VALUES',
    G.buildClientValues(cv, decisions.d1_years_trading),
    '',
    'GBP CATEGORIES:',
    G.buildCategoryLine(keyValueMap),
    '',
    ...(cv.free_inspection === 'yes' ? ['CONFIRMED BY [CV: free_inspection]: the business inspects the job, free, before it quotes.', ''] : []),
    'CONFIRMED PRACTICES (how the business works). State only these:',
    G.buildPracticeList(cv, niche),
    '',
    'NICHE ENTRY',
    G.buildNicheEntry(niche, ctx),
    ...(calibrationPack ? ['', 'CALIBRATION PACK', calibrationPack.trim()] : []),
  ].join('\n');
  const factsBlock = tradeFacts && tradeFacts.markdown
    ? `TRADE FACTS (the rows for this service, each tagged; never write a source, a standard's number or a URL into the copy)\n${tradeFacts.markdown.trim()}`
    : 'TRADE FACTS: none for this page.';
  return {
    system: [
      { type: 'text', text: loadCore17() },
      { type: 'text', text: clientBlock, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: factsBlock, cache_control: { type: 'ephemeral' } },
    ],
    message: decisionsBlock,
    clientBlock, factsBlock,
  };
}

// Generate one service page record. With a failed gate there is no call.
async function generateServicePage({ cv, niche, keyValueMap, serviceParentMap = {}, decisionsResult, calibrationPack, calibrationPackName, callModel, tradeFacts = null, extraFlags = [], retries = true, claimsReview = true, qualityReview = false }) {
  const { runRetries, loadRetryPrompt, validationSummary } = require('./v20-retry');
  const D = decisionsResult.decisions;
  const meta = {
    page_type: 'service',
    page_key: D ? D.slug : null,
    scope: D ? D.scope : null,
    service: D ? D.service : null,
    category: D ? D.category : null,
    town: D ? D.town : null,
    generated_at: new Date().toISOString(),
    model: SERVICE_MODEL,
    prompt: promptFile().name,
    shared_rules: loadSharedRules().source,
    niche: niche._source || niche.trade,
    business_type: D ? D.type : null,
    calibration_pack: calibrationPack ? (calibrationPackName || 'yes') : 'none',
    trade_facts: D ? D.trade_facts : null,
    stand_ins: cv.stand_ins || [],
    decisions_block: decisionsResult.decisionsBlock || null,
    // The block 4 causes this page makes, for MECHANISMS USED on the pages after it
    mechanisms: D ? D.problems.map(p => p.mechanism).filter(Boolean) : [],
  };
  if ((decisionsResult.gates || []).length || !D) {
    return buildServiceRecord({ cv, decisionsResult, parsed: null, meta, extraFlags });
  }
  const req = buildServiceRequest({ cv, niche, decisions: D, decisionsBlock: decisionsResult.decisionsBlock, calibrationPack, keyValueMap, serviceParentMap, tradeFacts });
  const { text, usage } = await callModel({ system: req.system, message: req.message, maxTokens: SERVICE_MAX_TOKENS });
  const parsed = parseOutput(text, PT.OUTPUT_SPEC, expectedFromServiceDecisions(D));
  meta.raw_output = text;
  meta.usage = usage || null;
  if (usage && usage.model) meta.model = usage.model;
  meta.client_block = `${req.clientBlock}\n\n${req.factsBlock}`;
  meta.services_on_file = G.servicesOnFile(keyValueMap, serviceParentMap, niche, D);
  meta.client_values = G.clientValueMap(cv, D.d1_years_trading);
  meta.ideas_context = {
    names: [...(D.allocated.neighbourhoods || []).map(n => n.name), ...((D.allocated.villages || [])), D.scope === 'town' ? D.town : null].filter(Boolean),
    proofs: [cv.differentiator_1_confirmed && cv.differentiator_1, cv.differentiator_2_confirmed && cv.differentiator_2, cv.jobs_completed, cv.insurance_cover && `£${cv.insurance_cover}`].filter(Boolean).map(String),
  };
  const record = buildServiceRecord({ cv, decisionsResult, parsed, meta, extraFlags });
  if (usage && usage.stop_reason === 'max_tokens') record.FLAGS.push({ code: 'P-TRUNCATED', msg: 'The model hit the output limit; the last fields may be cut off.', source: 'parse' });

  const V = serviceValidationContext(G.validationContextFor({ cv, niche, decisions: D, keyValueMap, serviceParentMap, calibrationPack, tradeFactsText: tradeFacts ? tradeFacts.markdown || '' : '' }), D, { tradeFactsRows: (tradeFacts && tradeFacts.rows) || [] });
  const validate = rec => PT.validate(rec, V);
  record.meta.first_draft_validation = (() => { const i = validate(record); return { block: i.filter(x => x.type === 'BLOCK').length, flag: i.filter(x => x.type === 'FLAG').length }; })();
  if (retries) {
    const retrySystem = [
      ...req.system,
      { type: 'text', text: `${loadRetryPrompt().replace(/this homepage/g, 'this service page')}\n\nTHE PAGE'S MESSAGE (PAGE, DECISIONS, LINKABLE PAGES, ALLOCATED ITEMS, MODEL FIELDS):\n\n${decisionsResult.decisionsBlock}`, cache_control: { type: 'ephemeral' } },
    ];
    const callRetry = ({ message }) => callModel({ system: retrySystem, message, maxTokens: 2048 });
    const { log, usage: retryUsage, finalIssues } = await runRetries({ record, V, callRetry });
    record.VALIDATION = validationSummary(finalIssues, log, retryUsage);
    if (claimsReview) {
      const { runClaimRetries } = require('./v20-retry');
      const { runClaimsReview, factsFromRecord } = require('./wp/claims-review');
      const review = rec => runClaimsReview(rec, factsFromRecord(rec), callModel);
      try {
        const { claims, rounds, first } = await runClaimRetries({ record, V, callRetry, review });
        record.CLAIMS = { for: meta.generated_at, at: claims.at, status: claims.findings.length ? 'needs acceptance' : 'clear', first_review: first, findings: claims.findings, rounds };
        const after = rounds.some(r => r.retries.some(x => x.kept)) ? await runRetries({ record, V, callRetry, maxRetries: 1 }) : { log: [] };
        record.VALIDATION = validationSummary(validate(record), [...log, ...rounds.flatMap(r => r.retries.map(x => ({ ...x, problems: x.claims, source: 'claims' }))), ...after.log.map(x => ({ ...x, round: `after claims ${x.round}` }))], retryUsage);
      } catch (e) {
        record.CLAIMS = { for: meta.generated_at, status: 'failed', error: e.message, findings: [] };
      }
    }
    if (qualityReview) {
      const { runQualityRetries, runClaimRetries } = require('./v20-retry');
      const Q = require('./quality-review');
      try {
        const { review: rv, rounds: qRounds } = await runQualityRetries({ record, V, callRetry, review: rec => Q.reviewPage({ record: rec, V, D, cv, niche, callModel }) });
        record.QUALITY = { at: rv.at, model: rv.model, score: rv.score, done: rv.done, failed: rv.failed, failures: rv.items.filter(i => !i.pass), other_problems: rv.other_problems, missing_facts: rv.missing_facts, rounds: qRounds };
        if (claimsReview && qRounds.some(r => r.retries.some(x => x.kept))) {
          const { runClaimsReview, factsFromRecord } = require('./wp/claims-review');
          const { claims, rounds } = await runClaimRetries({ record, V, callRetry, review: rec => runClaimsReview(rec, factsFromRecord(rec), callModel), maxRounds: 1 });
          record.CLAIMS = { ...(record.CLAIMS || {}), at: claims.at, status: claims.findings.length ? 'needs acceptance' : 'clear', findings: claims.findings, rounds: [...((record.CLAIMS || {}).rounds || []), ...rounds.map(r => ({ ...r, round: `after quality ${r.round}` }))] };
        }
        const earlier = (record.VALIDATION && record.VALIDATION.retries) || [];
        record.VALIDATION = validationSummary(validate(record), [...earlier, ...qRounds.flatMap(r => r.retries.map(x => ({ ...x, round: `quality ${x.round}`, source: 'quality' })))], retryUsage);
      } catch (e) {
        record.QUALITY = { status: 'failed', error: e.message };
      }
    }
  } else {
    record.VALIDATION = validationSummary(validate(record), [], null);
  }
  record.meta.ideas = extractIdeas(record);
  if (!record.CLAIMS) return record;
  const { CLAIMS, ...rest } = record;
  const out = {};
  for (const [k, v] of Object.entries(rest)) { out[k] = v; if (k === 'VALIDATION') out.CLAIMS = CLAIMS; }
  return out;
}

module.exports = { generateServicePage, buildServiceRequest, loadCore17, loadSharedRules, promptFile, SERVICE_MODEL, SERVICE_MAX_TOKENS, SHARED_RULES };
