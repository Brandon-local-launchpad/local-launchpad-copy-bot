'use strict';

// ── v20 homepage generation (Stage 6) ────────────────────────────────────────
// Builds the model request from the decisions result: CORE (20) as the system
// prompt, a cached client block (CLIENT VALUES, NICHE ENTRY, CALIBRATION PACK),
// and the per-page message (the decisions block: PAGE, DECISIONS, LINKABLE
// PAGES, ALLOCATED ITEMS, MODEL FIELDS). One call; Stage 7 adds validation and
// per-field retries.

const fs   = require('fs');
const path = require('path');
const { ph } = require('./decisions');

const V20_MODEL       = 'claude-sonnet-4-6';
const V20_PROMPT_FILE = 'Homepage_Copywriting_Prompt_CORE (20).md';
const V20_MAX_TOKENS  = 8192;

function loadCore20() {
  return fs.readFileSync(path.join(__dirname, 'prompts', V20_PROMPT_FILE), 'utf8').trim();
}

// Client values the model may use, as [CV: key] = value lines. Confirmed and
// filled values only. Internal fields (overrides, ticks, logos, map) are left out.
const CV_KEYS = [
  'company_name', 'phone', 'email', 'address', 'gbp_address_type', 'hours', 'primary_category',
  'year_founded', 'years_trading', 'jobs_completed', 'rating', 'review_count',
  'guarantee_years', 'guarantee_scope', 'manufacturer_warranty', 'insurance_cover',
  'differentiator_1', 'differentiator_1_sentence', 'differentiator_2', 'differentiator_2_sentence',
  'free_quotes', 'free_inspection', 'quote_method', 'price_list', 'response_time',
  'same_day_available', 'out_of_hours_available', 'start_time',
  'owner_name', 'owner_name_2', 'owner_qualification', 'owner_why', 'owner_promise', 'owner_pronoun',
  'business_type', 'materials_methods', 'team_size', 'typical_jobs',
  'emergency_primary', 'handles_planning', 'finance_options', 'complaints_process',
  'area_wide', 'travel_distance', 'review_themes', 'jobs_wanted',
];

function cvValue(key, cv, yearsTrading) {
  if (key === 'years_trading') return yearsTrading === null || yearsTrading === undefined ? '' : String(yearsTrading);
  if (/^differentiator_1/.test(key) && !cv.differentiator_1_confirmed) return '';
  if (/^differentiator_2/.test(key) && !cv.differentiator_2_confirmed) return '';
  const v = cv[key];
  if (key === 'review_themes') {
    return (Array.isArray(v) ? v : [])
      .filter(t => typeof t === 'string' || t.approved)
      .map(t => typeof t === 'string' ? t : t.theme).join('; ');
  }
  if (key === 'typical_jobs') {
    return (Array.isArray(v) ? v : [])
      .map(j => [j.job, j.from_price && `from ${j.from_price}`, j.duration && `typically ${j.duration}`].filter(Boolean).join(', '))
      .filter(Boolean).join('; ');
  }
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  return v === null || v === undefined ? '' : String(v).trim();
}

function buildClientValues(cv, yearsTrading) {
  return CV_KEYS
    .map(k => [k, cvValue(k, cv, yearsTrading)])
    .filter(([, v]) => v)
    .map(([k, v]) => `[CV: ${k}] = ${v}`)
    .join('\n');
}

// The niche slots the model writes from, with placeholders resolved. Headings,
// buttons, steps and FAQ briefs already arrive in DECISIONS, so they're not repeated.
function buildNicheEntry(niche, ctx) {
  const L = [];
  const list = a => (a || []).join(', ') || '(none)';
  L.push(`Trade: ${niche.trade} | trade (lower case): ${niche.trade_lower} | trade person: ${niche.trade_person} / ${niche.trade_person_plural}`);
  L.push(`Customers: ${niche.customer_type} | unit of work: ${niche.unit_of_work}`);
  L.push(`Emergency niche: ${niche.emergency_niche ? 'yes' : 'no'} | big ticket: ${niche.big_ticket ? 'yes (' + list(niche.big_ticket_examples) + ')' : 'no'}`);
  L.push(`Words customers use: ${list(niche.words_use)}`);
  L.push(`Words to avoid (twice on the page at most): ${list(niche.words_avoid)}`);
  if (niche.words_avoid_exceptions) {
    L.push(`Exceptions: ${Object.entries(niche.words_avoid_exceptions).map(([w, why]) => `${w}: ${why}`).join('; ')}`);
  }
  L.push('Customer fears:');
  for (const f of (niche.fears || [])) L.push(`  - ${f}`);
  L.push('Materials and methods list (name one only if it is in [CV: materials_methods]):');
  for (const [group, items] of Object.entries(niche.materials_tick_list || {})) L.push(`  - ${group}: ${list(items)}`);
  L.push('Do not reuse these sentences:');
  if ((niche.do_not_reuse || []).length) for (const s of niche.do_not_reuse) L.push(`  - ${s}`);
  else L.push('  (none)');
  return ph(L.join('\n'), ctx);
}

// The request: system blocks (CORE (20), then the cached client block) and the message
function buildV20Request({ cv, niche, decisions, decisionsBlock, calibrationPack, ctx }) {
  const clientBlock = [
    'CLIENT VALUES',
    buildClientValues(cv, decisions.d1_years_trading),
    '',
    'NICHE ENTRY',
    buildNicheEntry(niche, ctx),
    ...(calibrationPack ? ['', 'CALIBRATION PACK', calibrationPack.trim()] : []),
  ].join('\n');
  return {
    system: [
      { type: 'text', text: loadCore20() },
      { type: 'text', text: clientBlock, cache_control: { type: 'ephemeral' } },
    ],
    message: decisionsBlock,
    clientBlock,
  };
}

// The placeholder context decisions.js uses, rebuilt for the niche entry
function nicheContext(cv, niche, keyValueMap) {
  return {
    category:          cv.primary_category || '',
    city:              (keyValueMap['biz_area_1'] || '').trim(),
    trade:             niche.trade || '',
    tradeLower:        niche.trade_lower || '',
    tradePerson:       niche.trade_person || '',
    tradePersonPlural: niche.trade_person_plural || '',
    customerType:      niche.customer_type || '',
    unitOfWork:        niche.unit_of_work || '',
    areaWide:          cv.area_wide || '',
    companyName:       cv.company_name || '',
    quoteFree:         cv.free_quotes === 'yes' ? 'Free' : '',
  };
}

// Generate the homepage record. `callModel({ system, message, maxTokens })` returns
// { text, usage }. With a failed gate there is no call: the record holds the gates.
async function generateV20Homepage({ cv, niche, keyValueMap, decisionsResult, calibrationPack, calibrationPackName, callModel, extraFlags = [], allocationSource = null }) {
  const { buildPageRecord, expectedFromDecisions } = require('./v20-record');
  const { parseV20Output } = require('./v20-parse');
  const meta = {
    generated_at: new Date().toISOString(),
    model: V20_MODEL,
    prompt: V20_PROMPT_FILE,
    niche: niche._source || niche.trade,
    calibration_pack: calibrationPack ? (calibrationPackName || 'yes') : 'none',
    allocation_source: allocationSource,
    stand_ins: cv.stand_ins || [],
    decisions_block: decisionsResult.decisionsBlock || null,
  };
  if ((decisionsResult.gates || []).length || !decisionsResult.decisions) {
    return buildPageRecord({ cv, decisionsResult, parsed: null, meta, extraFlags });
  }
  const ctx = nicheContext(cv, niche, keyValueMap);
  const req = buildV20Request({
    cv, niche, decisions: decisionsResult.decisions, decisionsBlock: decisionsResult.decisionsBlock, calibrationPack, ctx,
  });
  const { text, usage } = await callModel({ system: req.system, message: req.message, maxTokens: V20_MAX_TOKENS });
  const parsed = parseV20Output(text, expectedFromDecisions(decisionsResult.decisions));
  meta.raw_output = text;
  meta.usage = usage || null;
  meta.client_block = req.clientBlock;
  return buildPageRecord({ cv, decisionsResult, parsed, meta, extraFlags });
}

module.exports = {
  V20_MODEL, V20_PROMPT_FILE, V20_MAX_TOKENS,
  buildV20Request, buildClientValues, buildNicheEntry, nicheContext, loadCore20, generateV20Homepage,
};
