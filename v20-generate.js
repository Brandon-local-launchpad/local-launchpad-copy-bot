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

// Sonnet 5.5 since 16 Oct (Brandon): far fewer copy rule breaks than Sonnet 4.6 in the quality loop,
// and cheaper. anthropic-call.js gives it an effort, room to think and the refusal fallback.
const V20_MODEL       = 'claude-sonnet-5-5';
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
  'free_quotes', 'free_inspection', 'quote_method', 'quote_includes', 'deposit_terms', 'price_list', 'response_time',
  'same_day_available', 'out_of_hours_available', 'start_time', 'visit_frequency_options', 'access_handling', 'if_not_happy', 'clippings_collected', 'areas_worked',
  // owner_role (28 Oct, the blog byline: "By [owner_name], [owner_role] at [company_name]")
  'owner_name', 'owner_name_2', 'owner_role', 'owner_qualification', 'owner_why', 'owner_promise', 'owner_pronoun',
  'business_type', 'materials_methods', 'team_size', 'typical_jobs',
  'emergency_primary', 'handles_planning', 'finance_options', 'complaints_process',
  'area_wide', 'travel_distance', 'review_themes', 'jobs_wanted', 'waste_carrier_registered',
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
      .map(j => [j.job, (j.price || j.from_price) && `from ${j.price || j.from_price}`, j.duration && `typically ${j.duration}`].filter(Boolean).join(', '))
      .filter(Boolean).join('; ');
  }
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  return v === null || v === undefined ? '' : String(v).trim();
}

// { key: value } for every filled client value, as the [CV: key] tokens resolve
function clientValueMap(cv, yearsTrading) {
  const out = {};
  for (const k of CV_KEYS) { const v = cvValue(k, cv, yearsTrading); if (v) out[k] = v; }
  // The Google review link (Client Values, Google Business Profile, 23 Oct): the WordPress
  // site's review_url and the GBP review request read it; no [CV:] token names it
  if (cv.review_url && String(cv.review_url).trim()) out.review_url = String(cv.review_url).trim();
  return out;
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

// The client's confirmed GBP services by category, in the words a homeowner uses
// (niche service_words). CORE (20) cards name "2 or 3 of the client's confirmed
// services", so the model needs the list; it never sees the raw GBP names.
function buildServiceList(keyValueMap = {}, serviceParentMap = {}, niche = {}) {
  const { confirmedServiceList } = require('./service-words');
  const byCat = {};
  for (const s of confirmedServiceList(keyValueMap, serviceParentMap, niche)) {
    if (s.say === null) continue;
    const c = byCat[s.category] = byCat[s.category] || { pages: new Set(), mentioned: new Set() };
    (s.kind === 'mentioned' ? c.mentioned : c.pages).add(s.say);
  }
  // A folded service (v3 page map) is confirmed and may be named in prose, never as a card's service
  const lines = Object.entries(byCat).map(([cat, c]) => `${cat}: ${[...c.pages].join(', ')}${c.mentioned.size ? `${c.pages.size ? '; ' : ''}also offered, no page of their own (name in prose only, never as a card's service): ${[...c.mentioned].join(', ')}` : ''}`);
  // Every GBP category, including one whose services all sit under other categories
  const cats = Object.entries(keyValueMap).filter(([k, v]) => /^category_\d+$/.test(k) && v).map(([, v]) => v);
  if (cats.length) lines.unshift(`GBP categories: ${cats.join(', ')}`);
  return lines.length ? lines.join('\n') : '(none on file: name only what the card names and categories say)';
}

// What the business offers, for the claims review: the GBP services by category, or,
// when the custom values carry none, the categories and services in the page map
function servicesOnFile(keyValueMap, serviceParentMap, niche, D) {
  const list = buildServiceList(keyValueMap, serviceParentMap, niche);
  // (regex fixed 22 Oct 2026: it read "service_d+", so the review only ever saw the category names)
  if (Object.keys(keyValueMap || {}).some(k => /^service_\d+$/.test(k))) return list;
  const names = [...(D.d9.main || []).map(c => c.name), ...(D.d9.alsoOffer || [])];
  return names.length ? `Categories and services on the client's site (page map): ${names.join(', ')}` : list;
}

function buildCategoryLine(keyValueMap = {}) {
  const cats = Object.entries(keyValueMap).filter(([k, v]) => /^category_\d+$/.test(k) && v).map(([, v]) => v);
  return cats.length ? cats.join(', ') : '(none on file)';
}

// Working practices the client has confirmed. The copy may state these and no others.
function buildPracticeList(cv, niche) {
  const { confirmedPractices } = require('./practices');
  const list = confirmedPractices(cv, niche);
  return list.length ? list.map(p => `- ${p.claim}`).join('\n')
    : '(none confirmed: never describe how the business works, beyond what CLIENT VALUES say)';
}

// The request: system blocks (CORE (20), then the cached client block) and the message
function buildV20Request({ cv, niche, decisions, decisionsBlock, calibrationPack, ctx, keyValueMap, serviceParentMap }) {
  const clientBlock = [
    'CLIENT VALUES',
    buildClientValues(cv, decisions.d1_years_trading),
    '',
    // 16 Oct (Brandon): the model never sees a category's full service list. Code
    // picks each card's 2 or 3 services (DECISIONS → D9 "Services:"); the claims
    // review still gets the full list (meta.services_on_file)
    'GBP CATEGORIES (the services each card names are in DECISIONS → D9 SERVICE CARDS; name no other services in a card):',
    buildCategoryLine(keyValueMap),
    '',
    // What a yes/no value means, so neither the writer nor the claims review has to guess (16 Oct, loop)
    ...(cv.free_inspection === 'yes' ? ['CONFIRMED BY [CV: free_inspection]: the business inspects the job, free, before it quotes.', ''] : []),
    // Verified logos are confirmed proof the page shows (16 Oct, copy quality loop)
    ...((decisions.trusted_logos || []).length ? ['VERIFIED LOGOS SHOWN ON THE PAGE (confirmed memberships; name only these):', decisions.trusted_logos.map(l => l.name).join(', '), ''] : []),
    'CONFIRMED PRACTICES (how the business works). State only these:',
    buildPracticeList(cv, niche),
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

// What the validator checks a page against (generation and hand edits use the same)
function validationContextFor({ cv, niche, decisions, keyValueMap, serviceParentMap = {}, calibrationPack = '', tradeFactsText = '' }) {
  const { buildValidationContext } = require('./validate-v20');
  const populatedCvKeys = new Set([...buildClientValues(cv, decisions.d1_years_trading).matchAll(/^\[CV: ([a-z0-9_]+)\]/gm)].map(m => m[1]));
  return buildValidationContext({ cv, niche, decisions, keyValueMap, serviceParentMap, populatedCvKeys, calibrationPack, tradeFactsText });
}

// Generate the homepage record. `callModel({ system, message, maxTokens })` returns
// { text, usage }. With a failed gate there is no call: the record holds the gates.
async function generateV20Homepage({ cv, niche, keyValueMap, serviceParentMap = {}, decisionsResult, calibrationPack, calibrationPackName, callModel, extraFlags = [], allocationSource = null, retries = true, claimsReview = true, qualityReview = false }) {
  const { buildPageRecord, expectedFromDecisions } = require('./v20-record');
  const { parseV20Output } = require('./v20-parse');
  const { validateV20 } = require('./validate-v20');
  const { runRetries, loadRetryPrompt, validationSummary } = require('./v20-retry');
  const meta = {
    page_type: 'homepage',
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
  const D = decisionsResult.decisions;
  const req = buildV20Request({
    cv, niche, decisions: D, decisionsBlock: decisionsResult.decisionsBlock, calibrationPack, ctx, keyValueMap, serviceParentMap,
  });
  const { text, usage } = await callModel({ system: req.system, message: req.message, maxTokens: V20_MAX_TOKENS });
  const parsed = parseV20Output(text, expectedFromDecisions(D));
  meta.raw_output = text;
  meta.usage = usage || null;
  meta.client_block = req.clientBlock;
  meta.services_on_file = servicesOnFile(keyValueMap, serviceParentMap, niche, D);
  // The values the tokens stood for when this page was written (the reader view uses these)
  meta.client_values = clientValueMap(cv, D.d1_years_trading);
  const record = buildPageRecord({ cv, decisionsResult, parsed, meta, extraFlags });

  // Stage 7: validate, then rewrite failing fields one at a time (brief §6b)
  const V = validationContextFor({ cv, niche, decisions: D, keyValueMap, serviceParentMap, calibrationPack });
  record.meta.first_draft_validation = (() => { const i = validateV20(record, V); return { block: i.filter(x => x.type === 'BLOCK').length, flag: i.filter(x => x.type === 'FLAG').length }; })();
  if (retries) {
    const retrySystem = [
      req.system[0], req.system[1],
      { type: 'text', text: `${loadRetryPrompt()}\n\nTHE PAGE'S MESSAGE (PAGE, DECISIONS, LINKABLE PAGES, ALLOCATED ITEMS, MODEL FIELDS):\n\n${decisionsResult.decisionsBlock}`, cache_control: { type: 'ephemeral' } },
    ];
    const callRetry = ({ message }) => callModel({ system: retrySystem, message, maxTokens: 2048 });
    const { log, usage: retryUsage, finalIssues } = await runRetries({ record, V, callRetry });
    record.VALIDATION = validationSummary(finalIssues, log, retryUsage);

    // Claims review: findings go back through the per-field retries, the page is
    // reviewed again, and only what's left needs a person to accept it
    if (claimsReview) {
      const { runClaimRetries } = require('./v20-retry');
      const { runClaimsReview, factsFromRecord } = require('./wp/claims-review');
      const review = rec => runClaimsReview(rec, factsFromRecord(rec), callModel);
      try {
        const { claims, rounds, first } = await runClaimRetries({ record, V, callRetry, review });
        record.CLAIMS = {
          for: meta.generated_at, at: claims.at,
          status: claims.findings.length ? 'needs acceptance' : 'clear',
          first_review: first, findings: claims.findings, rounds,
        };
        // The claim rewrites changed fields: one more round of field retries on what they
        // broke (16 Oct, copy quality loop), then validate the page as it now stands
        const after = rounds.some(r => r.retries.some(x => x.kept)) ? await runRetries({ record, V, callRetry, maxRetries: 1 }) : { log: [] };
        record.VALIDATION = validationSummary(validateV20(record, V), [...log, ...rounds.flatMap(r => r.retries.map(x => ({ ...x, problems: x.claims, source: 'claims' }))), ...after.log.map(x => ({ ...x, round: `after claims ${x.round}` }))], retryUsage);
      } catch (e) {
        // A failed review never loses the page: it's saved, and the push asks for the review again
        record.CLAIMS = { for: meta.generated_at, status: 'failed', error: e.message, findings: [] };
      }
    }

    // Quality review (16 Oct, docs/seo/COPY_QUALITY_RUBRIC.md): the rubric reviewer reads the
    // page, the fields it quotes are rewritten and the page is reviewed again; then the
    // claims check runs once more on what the rewrites changed
    if (qualityReview) {
      const { runQualityRetries, runClaimRetries } = require('./v20-retry');
      const Q = require('./quality-review');
      try {
        const { review: rv, rounds: qRounds } = await runQualityRetries({ record, V, callRetry, review: rec => Q.reviewPage({ record: rec, V, D, cv, niche, callModel }) });
        record.QUALITY = {
          at: rv.at, model: rv.model, score: rv.score, done: rv.done, failed: rv.failed,
          failures: rv.items.filter(i => !i.pass), other_problems: rv.other_problems, missing_facts: rv.missing_facts, rounds: qRounds,
        };
        if (claimsReview && qRounds.some(r => r.retries.some(x => x.kept))) {
          const { runClaimsReview, factsFromRecord } = require('./wp/claims-review');
          const { claims, rounds } = await runClaimRetries({ record, V, callRetry, review: rec => runClaimsReview(rec, factsFromRecord(rec), callModel), maxRounds: 1 });
          record.CLAIMS = {
            ...(record.CLAIMS || {}), at: claims.at,
            status: claims.findings.length ? 'needs acceptance' : 'clear',
            findings: claims.findings, rounds: [...((record.CLAIMS || {}).rounds || []), ...rounds.map(r => ({ ...r, round: `after quality ${r.round}` }))],
          };
        }
        const earlier = (record.VALIDATION && record.VALIDATION.retries) || [];
        record.VALIDATION = validationSummary(validateV20(record, V), [...earlier, ...qRounds.flatMap(r => r.retries.map(x => ({ ...x, round: `quality ${x.round}`, source: 'quality' })))], retryUsage);
      } catch (e) {
        record.QUALITY = { status: 'failed', error: e.message };
      }
    }
  } else {
    record.VALIDATION = validationSummary(validateV20(record, V), [], null);
  }
  // CLAIMS sits with FLAGS and VALIDATION at the top of the record
  if (!record.CLAIMS) return record;
  const { CLAIMS, ...rest } = record;
  const out = {};
  for (const [k, v] of Object.entries(rest)) { out[k] = v; if (k === 'VALIDATION') out.CLAIMS = CLAIMS; }
  return out;
}

module.exports = {
  V20_MODEL, V20_PROMPT_FILE, V20_MAX_TOKENS,
  CV_KEYS, buildV20Request, buildClientValues, clientValueMap, buildNicheEntry, buildServiceList, servicesOnFile, buildPracticeList, buildCategoryLine, nicheContext, loadCore20, generateV20Homepage, validationContextFor,
};
