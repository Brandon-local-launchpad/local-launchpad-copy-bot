'use strict';

// ── Location page generation (CORE (18), 27 Oct 2026) ────────────────────────
// One page per call, in the service page's shape (service-generate.js): CORE (18) plus the
// shared copy rules (prompts/_shared_copy_rules.md, appended by code as the prompt says) as
// the system prompt, the cached client block (CLIENT VALUES, confirmed practices, NICHE
// ENTRY, CALIBRATION PACK; no trade facts: the page explains the town, not the job), and the
// per page message (PAGE, DECISIONS, LINKABLE PAGES, ALLOCATED ITEMS, MODEL FIELDS). Then the
// parser, the record, the validator and the per field retries, the claims review and, when
// asked, the rubric review. `callModel({ system, message, maxTokens })` returns { text, usage }.

const fs   = require('fs');
const path = require('path');
const G = require('./v20-generate');
const { parseOutput } = require('./v20-parse');
const { buildLocationRecord, expectedFromLocationDecisions } = require('./location-record');
const { locationValidationContext } = require('./validate-location');
const PT = require('./page-types/location');
const { extractIdeas } = require('./ideas');

const PM = require('./page-models');
const LOCATION_MODEL = PM.forPage('location').model;
const LOCATION_MAX_TOKENS = 16000; // 64,000 after anthropic-call.js, as the category page
// The master copy; the unbracketed name is how the file was first saved (Brandon, 25 Oct)
const PROMPT_NAMES = ['Location_Page_Copywriting_Prompt_CORE (18).md', 'Location_Page_Copywriting_Prompt_CORE 18.md', 'Location_Page_Copywriting_Prompt_CORE (18) (1).md'];
const SHARED_RULES = '_shared_copy_rules.md';
function promptFile() {
  for (const n of PROMPT_NAMES) { const p = path.join(__dirname, 'prompts', n); if (fs.existsSync(p)) return { name: n, path: p }; }
  throw new Error(`The location page prompt is missing: prompts/${PROMPT_NAMES[0]}`);
}
function loadSharedRules() {
  return { text: require('./category-generate').loadSharedRules(), source: SHARED_RULES };
}
// CORE (18) with the shared rules appended under their own heading (its GLOBAL COPY RULES
// section keeps the location page's own additions and says code appends the file)
function loadCore18() {
  const core = fs.readFileSync(promptFile().path, 'utf8').replace(/\r\n/g, '\n').trim();
  const shared = loadSharedRules();
  return `${core}\n\n---\n\n## SHARED COPY RULES (prompts/${SHARED_RULES}, appended by code; read from ${shared.source})\n\n${shared.text}`;
}

// The request: system blocks (CORE (18) with the shared rules, the cached client block) and the message
function buildLocationRequest({ cv, niche, decisions, decisionsBlock, calibrationPack, keyValueMap }) {
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
  return {
    system: [
      { type: 'text', text: loadCore18() },
      { type: 'text', text: clientBlock, cache_control: { type: 'ephemeral' } },
    ],
    message: decisionsBlock,
    clientBlock,
  };
}

// Generate one location page record. With a failed gate there is no call.
// howItsDone: { paragraphs: [{ page, text }], rows: [{ service, text }] } for the validator's HOW-DONE rule
async function generateLocationPage({ modelConfig = PM.forPage('location'), cv, niche, keyValueMap, serviceParentMap = {}, decisionsResult, calibrationPack, calibrationPackName, callModel, howItsDone = null, extraFlags = [], retries = true, claimsReview = true, qualityReview = false, qualityRounds = 3 }) {
  const { runRetries, loadRetryPrompt, validationSummary } = require('./v20-retry');
  const D = decisionsResult.decisions;
  const meta = {
    page_type: 'location',
    page_key: D ? D.slug : null,
    scope: 'town',
    town: D ? D.town : null,
    generated_at: new Date().toISOString(),
    model: modelConfig.model,
    prompt: promptFile().name,
    shared_rules: loadSharedRules().source,
    niche: niche._source || niche.trade,
    business_type: D ? D.type : null,
    calibration_pack: calibrationPack ? (calibrationPackName || 'yes') : 'none',
    trade_facts: null,
    stand_ins: cv.stand_ins || [],
    decisions_block: decisionsResult.decisionsBlock || null,
    // The block 4 causes this page makes, for MECHANISMS USED on pages after it
    mechanisms: D ? D.problems.map(p => p.mechanism).filter(Boolean) : [],
  };
  if ((decisionsResult.gates || []).length || !D) {
    return buildLocationRecord({ cv, decisionsResult, parsed: null, meta, extraFlags });
  }
  const req = buildLocationRequest({ cv, niche, decisions: D, decisionsBlock: decisionsResult.decisionsBlock, calibrationPack, keyValueMap });
  const { text, usage } = await callModel({ system: req.system, message: req.message, maxTokens: LOCATION_MAX_TOKENS });
  const parsed = parseOutput(text, PT.OUTPUT_SPEC, expectedFromLocationDecisions(D));
  meta.raw_output = text;
  meta.usage = usage || null;
  if (usage && usage.model) meta.model = usage.model;
  meta.client_block = req.clientBlock;
  meta.area_list = Object.entries(keyValueMap).filter(([k, v]) => /^biz_area_\d+$/.test(k) && v).map(([, v]) => String(v).trim());
  meta.services_on_file = G.servicesOnFile(keyValueMap, serviceParentMap, niche, D);
  meta.client_values = G.clientValueMap(cv, D.d1_years_trading);
  meta.ideas_context = {
    names: [...(D.allocated.neighbourhoods || []).map(n => n.name), ...((D.allocated.villages || [])), D.town].filter(Boolean),
    proofs: [cv.differentiator_1_confirmed && cv.differentiator_1, cv.differentiator_2_confirmed && cv.differentiator_2, cv.jobs_completed, cv.insurance_cover && `£${cv.insurance_cover}`].filter(Boolean).map(String),
  };
  const record = buildLocationRecord({ cv, decisionsResult, parsed, meta, extraFlags });
  if (usage && usage.stop_reason === 'max_tokens') record.FLAGS.push({ code: 'P-TRUNCATED', msg: 'The model hit the output limit; the last fields may be cut off.', source: 'parse' });

  const V = locationValidationContext(G.validationContextFor({ cv, niche, decisions: D, keyValueMap, serviceParentMap, calibrationPack }), D, { howItsDone });
  const validate = rec => PT.validate(rec, V);
  record.meta.hyphens_fixed = require('./fix-hyphens').fixHyphens(record, V);
  record.meta.first_draft_validation = (() => { const i = validate(record); return { block: i.filter(x => x.type === 'BLOCK').length, flag: i.filter(x => x.type === 'FLAG').length }; })();
  if (retries) {
    const retrySystem = [
      ...req.system,
      { type: 'text', text: `${loadRetryPrompt().replace(/this homepage/g, 'this location page')}\n\nTHE PAGE'S MESSAGE (PAGE, DECISIONS, LINKABLE PAGES, ALLOCATED ITEMS, MODEL FIELDS):\n\n${decisionsResult.decisionsBlock}`, cache_control: { type: 'ephemeral' } },
    ];
    await require('./page-passes').runPagePasses({ record, V, retrySystem, callModel, modelConfig, validate: validate, claimsReview, qualityReview, qualityRounds, D, cv, niche, generatedAt: meta.generated_at });
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

module.exports = { generateLocationPage, buildLocationRequest, loadCore18, loadSharedRules, promptFile, LOCATION_MODEL, LOCATION_MAX_TOKENS, SHARED_RULES };
