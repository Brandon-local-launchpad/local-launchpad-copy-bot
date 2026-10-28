'use strict';

// ── Blog post generation (Blog CORE (1), stage 4) ────────────────────────────
// One post per call, in the service page's shape (service-generate.js): CORE (1) plus the
// shared copy rules (prompts/_shared_copy_rules.md, appended by code as the prompt says) as
// the system prompt, the cached client block (CLIENT VALUES, confirmed practices, NICHE
// ENTRY, CALIBRATION PACK), and the per post message (POST, DECISIONS, FACTS ALLOWED,
// LINKABLE PAGES, IDEAS USED ELSEWHERE, MODEL FIELDS: blog/decisions.js formatBlogBlock).
// Then the parser (v20-parse.js on the blog spec; HIDDEN as on the homepage), the record
// (blog/record.js, B5), the validator and the per field retries, the claims review and, when
// asked, the rubric review. `callModel({ system, message, maxTokens })` returns { text, usage }.
// The runner (blog/run.js) resumes by the store's type and key, so a rerun updates the post's
// record instead of making a second post.

const fs = require('fs');
const path = require('path');
const G = require('../v20-generate');
const { parseOutput } = require('../v20-parse');
const { buildBlogRecord } = require('./record');
const { expectedFromBlogDecisions } = require('./decisions');
const { blogValidationContext } = require('../validate-blog');
const PT = require('../page-types/blog');
const { extractIdeas } = require('../ideas');

const BLOG_MODEL = G.V20_MODEL;
const BLOG_MAX_TOKENS = 12000;
const PROMPT_NAMES = ['Blog_Post_Copywriting_Prompt_CORE (1).md'];
const SHARED_RULES = '_shared_copy_rules.md';
function promptFile() {
  for (const n of PROMPT_NAMES) { const p = path.join(__dirname, '..', 'prompts', n); if (fs.existsSync(p)) return { name: n, path: p }; }
  throw new Error(`The blog prompt is missing: prompts/${PROMPT_NAMES[0]}`);
}
function loadSharedRules() {
  return { text: require('../category-generate').loadSharedRules(), source: SHARED_RULES };
}
// CORE (1) with the shared rules appended under their own heading
function loadCore1() {
  const core = fs.readFileSync(promptFile().path, 'utf8').replace(/\r\n/g, '\n').trim();
  const shared = loadSharedRules();
  return `${core}\n\n---\n\n## SHARED COPY RULES (prompts/${SHARED_RULES}, appended by code; read from ${shared.source})\n\n${shared.text}`;
}

// The request: the system blocks (CORE (1) with the shared rules, the cached client block) and the message (the post's block)
function buildBlogRequest({ cv, niche, decisions, decisionsBlock, calibrationPack, keyValueMap }) {
  const ctx = G.nicheContext(cv, niche, keyValueMap);
  const years = require('../decisions').yearsTradingOf(cv).yearsTrading;
  const clientBlock = [
    'CLIENT VALUES',
    G.buildClientValues(cv, years),
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
  return {
    system: [
      { type: 'text', text: loadCore1() },
      { type: 'text', text: clientBlock, cache_control: { type: 'ephemeral' } },
    ],
    message: decisionsBlock,
    clientBlock,
    years,
  };
}

// Generate one blog post record. With a failed gate there is no call.
async function generateBlogPost({ cv, niche, keyValueMap, serviceParentMap = {}, decisionsResult, calibrationPack, calibrationPackName, callModel, extraFlags = [], retries = true, claimsReview = true, qualityReview = false, qualityRounds = 3 }) {
  const { runRetries, loadRetryPrompt, validationSummary } = require('../v20-retry');
  const D = decisionsResult.decisions;
  // Every call's tokens, for the cost per post (Brandon, 28 Oct)
  const spend = { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  const rawCall = callModel;
  callModel = async args => { const r = await rawCall(args); spend.calls++; for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens']) spend[k] += (r && r.usage && r.usage[k]) || 0; return r; };
  const meta = {
    page_type: 'blog',
    page_key: D ? D.slug : null,
    post_type: D ? D.post_type : null,
    source: D ? D.source : null,
    service: D ? D.service : null,
    town: D ? D.town : null,
    generated_at: new Date().toISOString(),
    model: BLOG_MODEL,
    prompt: promptFile().name,
    shared_rules: loadSharedRules().source,
    niche: niche._source || niche.trade,
    calibration_pack: calibrationPack ? (calibrationPackName || 'yes') : 'none',
    stand_ins: cv.stand_ins || [],
    decisions_block: decisionsResult.decisionsBlock || null,
    publish_date: D ? D.publish_date : null,
    // The facts the post was written from, so the daily job can tell a changed price
    price_ids: D ? D.facts.filter(f => f.kind === 'price').map(f => f.text) : [],
  };
  if ((decisionsResult.gates || []).length || !D) {
    return buildBlogRecord({ cv, decisionsResult, parsed: null, meta, extraFlags });
  }
  const req = buildBlogRequest({ cv, niche, decisions: D, decisionsBlock: decisionsResult.decisionsBlock, calibrationPack, keyValueMap });
  const { text, usage } = await callModel({ system: req.system, message: req.message, maxTokens: BLOG_MAX_TOKENS });
  const parsed = parseOutput(text, PT.OUTPUT_SPEC, expectedFromBlogDecisions(D));
  meta.raw_output = text;
  meta.usage = usage || null;
  if (usage && usage.model) meta.model = usage.model;
  meta.client_block = req.clientBlock;
  meta.services_on_file = G.servicesOnFile(keyValueMap, serviceParentMap, niche, { d9: { main: [], alsoOffer: [] } });
  meta.client_values = G.clientValueMap(cv, req.years);
  meta.ideas_context = {
    names: [D.town, D.service].filter(Boolean),
    proofs: [cv.differentiator_1_confirmed && cv.differentiator_1, cv.differentiator_2_confirmed && cv.differentiator_2, cv.jobs_completed, cv.insurance_cover && `£${cv.insurance_cover}`].filter(Boolean).map(String),
  };
  const record = buildBlogRecord({ cv, decisionsResult, parsed, meta, extraFlags });
  if (usage && usage.stop_reason === 'max_tokens') record.FLAGS.push({ code: 'P-TRUNCATED', msg: 'The model hit the output limit; the last fields may be cut off.', source: 'parse' });

  // The validator (the shared checks until stage 5) and the retries; a validator that throws is recorded, never fatal
  let V = null;
  try { V = blogValidationContext(G.validationContextFor({ cv, niche, decisions: { ...D, d1_years_trading: req.years, allocated: { neighbourhoods: [], symptoms: {} } }, keyValueMap, serviceParentMap, calibrationPack }), D); }
  catch (e) { record.VALIDATION = { status: 'failed', error: `validation context: ${e.message}` }; }
  const validate = rec => PT.validate(rec, V);
  if (V) {
    try {
      record.meta.first_draft_validation = (() => { const i = validate(record); return { block: i.filter(x => x.type === 'BLOCK').length, flag: i.filter(x => x.type === 'FLAG').length }; })();
      if (retries) {
        const retrySystem = [...req.system, { type: 'text', text: `${loadRetryPrompt().replace(/this homepage/g, 'this blog post')}\n\nTHE POST'S MESSAGE (POST, DECISIONS, FACTS ALLOWED, LINKABLE PAGES, IDEAS USED ELSEWHERE, MODEL FIELDS):\n\n${decisionsResult.decisionsBlock}`, cache_control: { type: 'ephemeral' } }];
        const callRetry = ({ message }) => callModel({ system: retrySystem, message, maxTokens: 2048 });
        // Two rounds at most (Brandon, 28 Oct); which issues retry is the validator's call (validate-blog.js)
        const { log, usage: retryUsage, finalIssues } = await runRetries({ record, V, callRetry, maxRetries: 2 });
        record.VALIDATION = validationSummary(finalIssues, log, retryUsage);
        if (claimsReview) {
          const { runClaimRetries } = require('../v20-retry');
          const { runClaimsReview, factsFromRecord } = require('../wp/claims-review');
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
          const { runQualityRetries, runClaimRetries } = require('../v20-retry');
          const Q = require('../quality-review');
          try {
            const { review: rv, rounds: qRounds } = await runQualityRetries({ record, V, callRetry, review: rec => Q.reviewPage({ record: rec, V, D, cv, niche, callModel }), maxRounds: qualityRounds });
            record.QUALITY = { at: rv.at, model: rv.model, score: rv.score, done: rv.done, failed: rv.failed, failures: rv.items.filter(i => !i.pass), other_problems: rv.other_problems, missing_facts: rv.missing_facts, rounds: qRounds };
            if (claimsReview && qRounds.some(r => r.retries.some(x => x.kept))) {
              const { runClaimsReview, factsFromRecord } = require('../wp/claims-review');
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
    } catch (e) {
      record.VALIDATION = { status: 'failed', error: e.message };
    }
  }
  record.meta.ideas = extractIdeas(record);
  // The cost of the post: every call made for it (the draft, the retries, the claims and quality reviews)
  record.meta.spend = spend;
  try { record.meta.cost_pence = require('../ui/model-log').costPence(record.meta.model || BLOG_MODEL, spend); } catch (_) { record.meta.cost_pence = null; }
  if (!record.CLAIMS) return record;
  const { CLAIMS, ...rest } = record;
  const out = {};
  for (const [k, v] of Object.entries(rest)) { out[k] = v; if (k === 'VALIDATION') out.CLAIMS = CLAIMS; }
  return out;
}

module.exports = { generateBlogPost, buildBlogRequest, loadCore1, loadSharedRules, promptFile, BLOG_MODEL, BLOG_MAX_TOKENS, SHARED_RULES };
