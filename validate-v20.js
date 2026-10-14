'use strict';

// ── v20 homepage validator (Stage 7) ─────────────────────────────────────────
// Runs on the page record. Model fields get the copy checks (brief §6 plus the
// additions below); code fields get the H1, title, meta and area checks only.
// Every issue names its field, so §6b retries can rewrite just that field.
//
// Additions beyond brief §6 (14 Oct):
//   WORKED   BLOCK  "we work on [street/area]" claims about allocated places
//   NUM      BLOCK  a number or timescale not found in client values (or in the
//                   allocated research text the copy is meant to use)
//   SERVICE  FLAG   a service in a card or FAQ that isn't a confirmed service,
//                   category or ticked material (niche service_terms)
//   HERO     FLAG   hero sentence 1: keyword, company token, town, closing words
//   CVLIT    BLOCK  a client value written out instead of its [CV: key] token
//   TRUST-REPEAT / PROOF-REPEAT  FLAG  one home per proof
//   2        BLOCK  banned list also has "range of materials", "start to finish",
//                   "needs" as a noun and "As your/a/an [category]" openers

//   (14 Oct, second pass)
//   PRACTICE      BLOCK  a working practice (written quote, schedule, no subcontractors…)
//                        not in confirmed_practices (niche-library/practices.json)
//   RAW-GBP       FLAG   a raw GBP service name where the homeowner word should be used
//                        (niche service_words), or a service that is never named
//   CARD-COUNT    FLAG   a card naming more than 3 services
//   COAST         FLAG   coastal city: travel distance not written "inland and along the coast"
//   HUB-LINK      FLAG   the areas FAQ doesn't link the Locations Hub when there is one
//   RESEARCH-LANG FLAG   research wording in the copy ("investigated sites", "records show"…)
//   REPEAT-IN     FLAG   a point repeated inside one field

const { practiceClaims } = require('./practices');
const { confirmedServiceList } = require('./service-words');

const RETRY_FLAGS = new Set(['N7', 'N13', 'N14', 'N15', 'N17', 'N18', 'N19', 'N21', 'N22', 'N23', 'N24',
  '1b', 'HERO', 'SERVICE', 'TRUST-REPEAT', 'PROOF-REPEAT', 'RAW-GBP', 'CARD-COUNT', 'COAST', 'HUB-LINK', 'RESEARCH-LANG', 'REPEAT-IN',
  'CARD-LOCAL', 'LINK-TEXT']);
//   INSURANCE     BLOCK  insurance mentioned with no insurance_cover on file
//   RIVALS        BLOCK  (15 Oct) the copy tells the reader to get other quotes, compare firms or shop around
//   CARD-LOCAL    FLAG   a neighbourhood or allocated place in a card
//   LINK-TEXT     FLAG   a category link whose text drops the category's words
const RESEARCH_WORDS = ['investigated sites?', 'records? shows?', 'recorded (at|in|by)', 'council (guidance|records|data|maps?|says)',
  'strategic flood', 'flood (risk )?assessments?', 'suds', 'according to', 'research', 'dossier', 'data (shows|suggests)',
  'mapped', 'appraisal', 'neighbourhood plan', 'evidence base', 'studies show', 'surveys? (show|found)',
  '(slowly |more slowly |less )?permeable', 'groundwater', 'water table', 'tidal-flat', 'river-terrace'];
const STOPWORDS = new Set('a an the and or of to in on for with at by from as is are be it its this that we our you your they their there here so if not no but more than can will has have'.split(' '));

const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const BANNED = [
  'look no further', 'one stop shop', 'one-stop shop', 'we pride ourselves', 'competitive prices', 'quality service',
  'going above and beyond', 'state of the art', 'cutting edge', 'second to none', 'bespoke', 'tailored', 'comprehensive',
  'wide range of', 'full range of', 'range of materials', 'start to finish', 'solutions', 'professional and reliable',
  'friendly team', 'no job too big or too small', 'find out more', 'get in touch', 'find out how we can help',
  'click here', 'learn more', 'explore our service', "see what's included", 'passionate',
  // The homepage has no form (build spec section 11)
  'form below', 'the form', 'contact form', 'enquiry form',
];
const CLAIM_WORDS = ['best', '#1', 'leading', 'trusted', 'expert', 'specialist', 'reliable', 'fully insured'];
const STOCK = ['before you decide', 'in between', 'from the start', 'no surprises', 'peace of mind', 'take a look'];
const SUPERLATIVES = ['more than almost anything', 'the most', 'the only', 'unbeatable', 'like no other'];
const DATED = ['currently', 'at the moment', 'right now', 'this year'];
const OVERPROMISE = ['never by you', 'fully covered', 'pays for everything', "won't cost you", 'nothing to pay'];
const CONNECTORS = ['also', 'so', 'then'];
const GENERIC_SERVICE_WORDS = new Set(['install', 'installation', 'lay', 'laying', 'fitting', 'fit', 'work', 'service', 'services', 'and', 'or', 'the']);

const RANGES = {
  home_hero_intro:          { max: 49, label: 'under 50' },
  home_content_block_body:  { min: 200, max: 250, label: '200 to 250' },
  home_services_intro:      { min: 30, max: 60, label: '30 to 60' },
  card_text:                { min: 40, max: 55, label: '40 to 55' },
  point_body:               { min: 25, max: 40, label: '25 to 40' },
  step_body:                { min: 20, max: 30, label: '20 to 30' },
  home_owner_body:          { min: 60, max: 80, label: '60 to 80' },
  home_areas_intro:         { min: 40, max: 60, label: '40 to 60' },
  faq_answer:               { min: 30, max: 70, label: '30 to 70' },
  home_final_cta_body:      { min: 15, max: 25, label: '15 to 25' },
};

// ── Text helpers ──
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stripLinks = t => (t || '').replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1');
const linkUrls = t => [...(t || '').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(m => m[1]);
const normUrl = u => '/' + (u || '').trim().replace(/^https?:\/\/[^/]+/, '').replace(/^\/+|\/+$/g, '').toLowerCase();
// Prose to scan: links reduced to their text, tokens to a neutral word
const scanText = t => stripLinks(t).replace(/\[CV: [a-z0-9_]+\]/g, 'CVTOKEN');
const words = t => scanText(t).replace(/CVTOKEN/g, 'x').split(/\s+/).filter(w => /[A-Za-z0-9£]/.test(w));
const wordCount = t => words(t).length;
const sentences = t => scanText(t).split(/\n\n+|(?<=[.!?])\s+(?=["“A-Z0-9£])/).map(s => s.trim()).filter(Boolean);
const lc = s => (s || '').toLowerCase();
const stem = w => lc(w).replace(/[^a-z0-9]/g, '').replace(/(ations?|ions?|ings?|ed|es|s|e)$/, '');

// Model fields of a record, in page order, with a ref to write a rewrite back.
// Each page type lists its own (page-types/).
function modelFields(record) {
  return require('./page-types').pageTypeOf(record).modelFields(record);
}

function getField(record, ref) {
  return ref.index === undefined ? record[ref.key] : (record[ref.key][ref.index] || {})[ref.sub];
}
function setField(record, ref, text) {
  if (ref.index === undefined) record[ref.key] = text;
  else record[ref.key][ref.index][ref.sub] = text;
}

// What the validator needs besides the record
function buildValidationContext({ cv, niche, decisions, keyValueMap = {}, serviceParentMap = {}, populatedCvKeys }) {
  const D = decisions;
  const cvNumbers = new Set();
  const cvText = [];
  for (const [k, v] of Object.entries(cv || {})) {
    if (['phone', 'email', 'map_embed', 'stand_ins', 'h1_override'].includes(k) || /_confirmed$|_checked$/.test(k)) continue;
    if (/^differentiator_[12]/.test(k) && !cv[k.replace(/_sentence$/, '') + '_confirmed']) continue;
    const s = Array.isArray(v) ? v.map(x => typeof x === 'object' ? Object.values(x).join(' ') : x).join(' ') : String(v ?? '');
    if (!s.trim()) continue;
    cvText.push(lc(s));
    for (const n of s.match(/\d+(?:\.\d+)?/g) || []) cvNumbers.add(n);
  }
  if (D.d1_years_trading !== null && D.d1_years_trading !== undefined) cvNumbers.add(String(D.d1_years_trading));
  const allocated = D.allocated || { neighbourhoods: [], symptoms: {} };
  const researchText = lc([...allocated.neighbourhoods.map(n => n.profile), ...Object.values(allocated.symptoms).map(s => `${s.text} ${s.issueText}`)].join(' '));
  const researchNumbers = new Set(researchText.match(/\d+(?:\.\d+)?/g) || []);

  // Places the business must not claim to have worked: allocated neighbourhoods
  // (full and short names) and the streets named in their profiles
  const places = new Set();
  for (const n of allocated.neighbourhoods) {
    places.add(n.name);
    const short = n.name.split(/[\s,’']/)[0];
    if (short.length > 3) places.add(short);
    for (const m of n.profile.matchAll(/\b((?:[A-Z][a-z’']+\s){1,3}(?:Road|Avenue|Way|Close|Lane|Street|Drive|Gardens|Crescent|Dale|Hill|Place|Terrace|Green|Park))\b/g)) places.add(m[1].trim());
  }

  const serviceList = confirmedServiceList(keyValueMap, serviceParentMap, niche);
  const confirmedServices = [
    ...Object.entries(keyValueMap).filter(([k]) => /^(service|category)_\d+$/.test(k)).map(([, v]) => v),
    ...serviceList.map(s => s.say).filter(Boolean),
    ...(D.d9.main || []).map(c => c.name), ...(D.d9.alsoOffer || []),
    cv.primary_category, ...(cv.materials_methods || []),
  ].filter(Boolean).map(s => new Set(lc(s).split(/[^a-z0-9]+/).filter(Boolean).map(stem)));

  const linkable = new Set((D.linkablePages || []).map(p => normUrl(p.url)));
  const linkableCategories = (D.linkablePages || []).filter(p => p.type === 'category').map(p => normUrl(p.url));
  const towns = Object.entries(keyValueMap).filter(([k]) => /^biz_area_\d+$/.test(k)).map(([, v]) => v);
  return {
    cv, niche, D, keyValueMap, serviceParentMap, populatedCvKeys: populatedCvKeys || new Set(),
    cvNumbers, cvText: cvText.join(' | '), researchText, researchNumbers, places: [...places],
    confirmedServices, serviceList, linkable, linkableCategories, towns,
    neighbourhoodNames: allocated.neighbourhoods.map(n => n.name.split(/[\s,’']/)[0]).filter(n => n.length > 3),
    city: (keyValueMap.biz_area_1 || '').trim(),
    categoryNames: [...new Set([...Object.entries(keyValueMap).filter(([k]) => /^category_\d+$/.test(k)).map(([, v]) => v),
      ...(D.d9.main || []).map(c => c.name)])],
  };
}

// ── The validator ──
function validateV20(record, V) {
  const issues = [];
  const issue = (type, check, field, message, ref = null) => issues.push({
    type, check, field, ref, message, retry: !!ref && (type === 'BLOCK' || RETRY_FLAGS.has(check)),
  });
  if (record.blocked) return issues;
  const { cv, niche, D } = V;
  const fields = modelFields(record);

  // ── Per field ──
  for (const f of fields) {
    const t = f.text;
    const s = scanText(t);
    const l = lc(s);
    const flag = (type, check, msg) => issue(type, check, f.label, msg, f.ref);

    // N6: shown field must have text
    if (!t.trim() || t.trim() === 'HIDDEN') { flag('BLOCK', 'N6', `${f.label} is shown on the page but empty.`); continue; }

    // 1a dashes, 1b hyphenated compounds
    if (/[—–]/.test(s)) flag('BLOCK', '1a', 'Contains an em or en dash. Rewrite the sentence without it.');
    const hyph = [...new Set(s.match(/\b[A-Za-z]+-[A-Za-z]+(?:-[A-Za-z]+)*\b/g) || [])];
    if (hyph.length) flag('FLAG', '1b', `Hyphenated words: ${hyph.join(', ')}. Write them without the hyphen, or rephrase if that reads like a typo.`);

    // 2 banned phrases (incl. the 14 Oct additions)
    for (const p of BANNED) if (new RegExp(`\\b${esc(p)}\\b`, 'i').test(s)) flag('BLOCK', '2', `Banned phrase "${p}".`);
    if (/\b(your|their|our|the|specific|individual|particular|every)\s+needs\b/i.test(s) || /\bneeds\s+of\b/i.test(s)) flag('BLOCK', '2', '"needs" used as a noun ("your needs"). Say the concrete thing instead.');
    // "As your/a/an [category]" only as a sentence opener: "our work as a landscaper in..." is fine
    for (const cat of V.categoryNames) {
      if (new RegExp(`(?:^|[.!?]\\s+|\\n)As (?:your|a|an)\\s+(?:${esc(cat)})\\b`, 'i').test(s)) flag('BLOCK', '2', `A sentence opens "As your/a ${cat}". Write the category the way a person would say it inside a sentence.`);
    }

    // 3a, 3b, 3c
    if (/\[CLIENT TO CONFIRM/i.test(t)) flag('BLOCK', '3a', '[CLIENT TO CONFIRM] in the copy.');
    const bracketsLeft = t.replace(/\[CV: [a-z0-9_]+\]/g, '').replace(/\[[^\]]+\]\([^)]+\)/g, '');
    if (/\[/.test(bracketsLeft)) flag('BLOCK', '3b', 'A bracket that is not a [CV: key] token or a Markdown link.');
    for (const m of t.matchAll(/\[CV: ([a-z0-9_]+)\]/g)) {
      if (!V.populatedCvKeys.has(m[1])) flag('BLOCK', '3c', `[CV: ${m[1]}] is not set for this client. Write the sentence without it.`);
    }
    // TOKEN-UNIT: "[CV: travel_distance] miles" when the value is already "20 miles"
    for (const m of t.matchAll(/\[CV: ([a-z0-9_]+)\]\s+([A-Za-z]+)/g)) {
      const valueWords = lc(String(cv[m[1]] ?? '')).split(/\s+/);
      if (valueWords.length > 1 && valueWords.slice(-1)[0].replace(/s$/, '') === lc(m[2]).replace(/s$/, '')) {
        flag('BLOCK', 'TOKEN-UNIT', `[CV: ${m[1]}] already reads "${cv[m[1]]}", so "[CV: ${m[1]}] ${m[2]}" doubles the "${m[2]}". Drop the word after the token.`);
      }
    }

    // CVLIT: client values written out instead of tokens
    if (cv.company_name && l.includes(lc(cv.company_name))) flag('BLOCK', 'CVLIT', 'The company name is written out. Use [CV: company_name].');
    const digits = s.replace(/\D/g, '');
    if (cv.phone && cv.phone.replace(/\D/g, '').length > 6 && digits.includes(cv.phone.replace(/\D/g, ''))) flag('BLOCK', 'CVLIT', 'The phone number is written out. Use [CV: phone].');
    if (cv.email && l.includes(lc(cv.email))) flag('BLOCK', 'CVLIT', 'The email is written out. Use [CV: email].');
    if (cv.owner_name && cv.owner_name.length > 2 && new RegExp(`\\b${esc(cv.owner_name)}\\b`).test(s)) flag('BLOCK', 'CVLIT', 'The owner name is written out. Use [CV: owner_name].');

    // 5a: rating and jobs count in one sentence
    for (const sen of sentences(t)) if (/\d\.\d\s*(★|star)/i.test(sen) && /\d+\+?\s*(customers|clients|jobs|projects|gardens|homes)/i.test(sen)) flag('BLOCK', '5a', 'A star rating and a jobs count share a sentence.');

    // N2: every link on LINKABLE PAGES; no self link
    for (const u of linkUrls(t)) {
      if (normUrl(u) === '/') flag('BLOCK', 'N2', 'Links the homepage to itself.');
      else if (!V.linkable.has(normUrl(u))) flag('BLOCK', 'N2', `Links to ${u}, which is not on LINKABLE PAGES.`);
    }

    // N5: claim words without proof
    if (!D.quoteFree && /\bfree\b(?![\s-]draining| of| from)/i.test(s)) flag('BLOCK', 'N5', '"Free" used but free quotes are not confirmed.');
    if (cv.same_day_available !== 'yes' && /\bsame[\s-]day\b/i.test(s)) flag('BLOCK', 'N5', '"Same day" used but same day is not confirmed.');
    if (cv.out_of_hours_available !== '24/7' && /24\/7/.test(s)) flag('BLOCK', 'N5', '"24/7" used but 24/7 cover is not confirmed.');
    if (cv.waste_carrier_registered !== 'yes' && /\bwaste carriers?\b/i.test(s)) flag('BLOCK', 'N5', 'Waste carrier registration is mentioned but not confirmed.');
    if (!cv.deposit_terms && /\bdeposits?\b/i.test(s)) flag('BLOCK', 'N5', 'A deposit is mentioned but deposit_terms is blank.');
    // RIVALS: the client's own site never sends the reader to other businesses
    const rivals = s.match(/\b(?:get|getting|ask for|asking for|collect|obtain|request)\s+(?:at least\s+)?(?:two|three|four|several|a few|multiple|more|other|\d+)(?:\s+or\s+(?:two|three|four|more))?\s+(?:\w+\s+)?quotes?\b|\bcompare\s+(?:\w+\s+)?(?:quotes|firms|companies|businesses|landscapers|gardeners|roofers|tradespeople|traders)\b|\bshop(?:ping)? around\b|\bother (?:firms|companies|landscapers|gardeners|roofers|tradespeople|traders|contractors)\b/i);
    if (rivals) flag('BLOCK', 'RIVALS', `"${rivals[0]}" sends the reader to other businesses. Answer as this business; leave it out.`);
    const fixedConfirmed = /fixed\s+price/i.test(`${cv.differentiator_1_confirmed ? cv.differentiator_1 : ''} ${cv.differentiator_2_confirmed ? cv.differentiator_2 : ''} ${cv.quote_method || ''}`);
    if (!fixedConfirmed && /\bfixed[\s-]price/i.test(s)) flag('BLOCK', 'N5', '"Fixed price" used but it is not confirmed.');
    // Claim words; "the best chance/time/way" and "leading to" aren't claims about the business
    const claimText = s.replace(/\b(the )?best (chance|time|way|option|choice|results?|thing|approach|fit|suited|for (you|your))\b|\bat best\b/gi, ' ')
      .replace(/\bleading (to|up|into)\b/gi, ' ');
    for (const w of CLAIM_WORDS) if (new RegExp(`(^|\\W)${esc(w)}(\\W|$)`, 'i').test(claimText)) flag('BLOCK', 'N5', `Claim word "${w}" with no proof on file. Say "local" or the concrete thing.`);

    // N7: word ranges and long sentences
    const r = RANGES[f.rangeKey];
    if (r) {
      const range = f.rangeKey === 'home_content_block_body' && D.d13_expands ? { min: 200, max: 300, label: '200 to 300' } : r;
      const n = wordCount(t);
      if ((range.min && n < range.min) || n > range.max) flag('FLAG', 'N7', `${n} words: it must be ${range.label}.`);
    }
    if (f.rangeKey === 'home_final_cta_body' && sentences(t).length > 1) flag('FLAG', 'N7', 'Must be one sentence.');
    for (const sen of sentences(t)) {
      const n = wordCount(sen);
      if (n > 25) flag('FLAG', 'N7', `A sentence of ${n} words (soft cap 25): "${sen.slice(0, 60)}…". Split it.`);
    }

    // N8 do_not_reuse
    for (const dn of (niche.do_not_reuse || [])) if (l.includes(lc(dn).replace(/[.!?]$/, ''))) flag('BLOCK', 'N8', `Reuses a sentence on the niche do_not_reuse list: "${dn}".`);
    // N9 dated words, N10 IDs and bare URLs, N11 overpromise
    for (const w of DATED) if (new RegExp(`\\b${esc(w)}\\b`, 'i').test(s)) flag('FLAG', 'N9', `"${w}" presents a dated fact as current.`);
    if (/\b[A-Z]{2,4}-[NISR]\d{2}\b/.test(t)) flag('BLOCK', 'N10', 'Contains a research reference ID.');
    if (/https?:\/\//.test(stripLinks(t).replace(/\]\([^)]*\)/g, ''))) flag('BLOCK', 'N10', 'Contains a URL that is not a Markdown link.');
    for (const w of OVERPROMISE) if (l.includes(w)) flag('FLAG', 'N11', `Insurance overpromise: "${w}". Describe what the cover is for, never the outcome.`);
    // N12 team/crew
    if ((!cv.team_size || parseInt(cv.team_size, 10) <= 1) && /\b(team|crew)\b/i.test(s)) flag('FLAG', 'N12', '"Team" or "crew" used but the team size is not above 1.');
    // N15 pronouns
    if (!cv.owner_pronoun && /\b(he|him|himself|she|her|herself)\b/i.test(s)) flag('FLAG', 'N15', 'A gendered pronoun with no owner_pronoun set. Repeat [CV: owner_name] or rewrite.');
    // N17 company token outside the hero, or opening sentences more than once
    const companyOpens = t.split(/\n\n+|(?<=[.!?])\s+/).filter(x => /^\[CV: company_name\]/.test(x.trim())).length;
    if (f.ref.key !== 'home_hero_intro' && /\[CV: company_name\]/.test(t)) flag('FLAG', 'N17', '[CV: company_name] appears outside the hero intro. Start with "We", the customer or the subject.');
    if (companyOpens > 1) flag('FLAG', 'N17', '[CV: company_name] opens more than one sentence.');
    // N18 back-to-back starts
    const sens = sentences(t);
    for (let i = 1; i < sens.length; i++) {
      const a = lc(sens[i - 1].split(/\s+/)[0]).replace(/\W/g, ''), b = lc(sens[i].split(/\s+/)[0]).replace(/\W/g, '');
      if (a && a === b) { flag('FLAG', 'N18', `Back to back sentences start with "${b}".`); break; }
    }
    for (const c of CONNECTORS) {
      const has = sens.map(x => new RegExp(`\\b${c}\\b`, 'i').test(x));
      if (has.some((h, i) => h && has[i - 1])) { flag('FLAG', 'N18', `"${c}" in back to back sentences.`); break; }
    }
    // N19 superlatives
    for (const w of SUPERLATIVES) if (l.includes(w)) flag('FLAG', 'N19', `Superlative or unprovable comparison: "${w}".`);
    // N20 rating restated
    if (D.d6_rating && ((cv.review_count && new RegExp(`\\b${esc(String(cv.review_count))}\\b`).test(s)) || (cv.rating && s.includes(String(cv.rating))))) flag('FLAG', 'N20', 'Restates the rating or review count, which the rating line already shows.');
    // N22 materials the business claims to use but hasn't ticked
    const ticked = (cv.materials_methods || []).map(lc);
    for (const sen of sentences(t)) {
      if (!/\b(we|our)\b.{0,40}\b(lay|laid|fit|fitted|install|installed|use|used|supply|supplied|build|built)\b/i.test(sen)) continue;
      for (const items of Object.values(niche.materials_tick_list || {})) for (const m of items) {
        if (new RegExp(`\\b${esc(m)}\\b`, 'i').test(sen) && !ticked.includes(lc(m))) flag('FLAG', 'N22', `Names "${m}" as something the business uses, but it isn't ticked in materials_methods.`);
      }
    }
    // N24 FAQ first sentence
    if (f.ref.sub === 'faq_answer') {
      const n = wordCount(sentences(t)[0] || '');
      if (n > 15) flag('FLAG', 'N24', `The first sentence is ${n} words. Answer the question first, in 15 words or fewer.`);
    }

    // WORKED: claims of work in allocated places
    for (const sen of sentences(t)) {
      if (!/\b(we|we've|we have|our)\b[^.]{0,50}\b(work|worked|working|do|did|done|carry out|carried out|complete|completed|build|built|lay|laid|transform|transformed|install|installed|look after|looked after)\b|\bour work (in|on|across)\b|\bkeeps? us busy\b|\b(much|most|a lot) of our work\b|\bwe(?:'re| are) (often|regularly|always) (in|on|out in)\b|\bour (customers|clients) in\b/i.test(sen)) continue;
      const hit = V.places.find(p => new RegExp(`\\b${esc(p)}\\b`).test(sen));
      if (hit) flag('BLOCK', 'WORKED', `Implies the business has worked in or on ${hit}. Use the local detail as a fact about the area, not as a job they've done.`);
    }

    // NUM: numbers and timescales must come from client values (or the allocated research)
    for (const m of s.matchAll(/£?\s?\d[\d,]*(?:\.\d+)?/g)) {
      const n = m[0].replace(/[£,\s]/g, '');
      if (!V.cvNumbers.has(n) && !V.researchNumbers.has(n)) flag('BLOCK', 'NUM', `"${m[0].trim()}" is not in the client values. Remove the figure or describe it without a number.`);
    }
    for (const m of s.matchAll(/\b(?:in|within|for|after|over)\s+(?:a\s+(?:few|couple\s+of)\s+|just\s+|only\s+)?(?:days|weeks|months)\b/gi)) {
      if (!V.cvText.includes(lc(m[0])) && !V.researchText.includes(lc(m[0]))) flag('BLOCK', 'NUM', `The timescale "${m[0]}" is not in the client values. Give the factors that decide it, without a time.`);
    }
    const timeRe = /\b(?:a(?: single| full| whole| half)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a couple of|a few|several)[\s-]+(?:(?:or|to)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[\s-]+)?(?:minute|hour|day|week|fortnight|month|year)(?:s|'s|’s)?\b(?:\s+or\s+(?:two|three))?|\b(?:same|next)[\s-](?:day|week)\b|\bovernight\b/gi;
    for (const m of s.matchAll(timeRe)) {
      const phrase = lc(m[0]);
      if (/^(a|every)\s+(day|week|month|year)$/.test(phrase) && !/\bor\b/.test(phrase)) continue; // "a day" as frequency/idiom
      const asDigits = phrase.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, w => String(NUM_WORDS[w]));
      if (V.cvText.includes(phrase) || V.cvText.includes(asDigits) || V.researchText.includes(phrase)) continue;
      flag('BLOCK', 'NUM', `The timescale "${m[0]}" is not in the client values. Give the factors that decide it, without a time.`);
    }

    // PRACTICE: working practices only from confirmed_practices
    const confirmedKeys = new Set(cv.confirmed_practices || []);
    for (const c of practiceClaims(s, niche)) {
      if (!confirmedKeys.has(c.practice.key)) flag('BLOCK', 'PRACTICE', `"${c.match}" states a practice ("${c.practice.label}") that the client hasn't confirmed. Remove it.`);
    }

    // RAW-GBP: homeowner words, never the raw GBP name; never-named services stay out
    for (const sv of V.serviceList) {
      if (!new RegExp(`\\b${esc(sv.gbp)}\\b`, 'i').test(s)) continue;
      if (sv.say === null) flag('FLAG', 'RAW-GBP', `Names "${sv.gbp}", which is never named on the page. Leave it out.`);
      else if (lc(sv.say) !== lc(sv.gbp)) flag('FLAG', 'RAW-GBP', `Uses the GBP name "${sv.gbp}". Say "${sv.say}" instead.`);
    }
    // INSURANCE: no insurance on file means no insurance in the copy (N5 only covers "fully insured")
    if (!cv.insurance_cover && /\b(insured|insurance|public liability|liability cover)\b/i.test(s)) {
      flag('BLOCK', 'INSURANCE', 'Mentions insurance, but no insurance cover is confirmed for this client. Remove it.');
    }
    // CARD-LOCAL: no neighbourhoods or local conditions in cards (CORE (20) cards rule)
    if (f.ref.sub === 'card_text') {
      const local = [...V.places, ...V.neighbourhoodNames].find(p => new RegExp(`\\b${esc(p)}`, 'i').test(s));
      if (local) flag('FLAG', 'CARD-LOCAL', `Mentions ${local}. Cards carry no neighbourhoods or local conditions; local detail lives on the category pages.`);
    }
    // LINK-TEXT: a category link's text holds the category's words, in order
    for (const m of t.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
      const card = (D.d9.main || []).find(c => c.url && normUrl(c.url) === normUrl(m[2]));
      if (!card) continue;
      const want = lc(card.name).split(/\s+/);
      const have = lc(m[1]).split(/[^a-z0-9]+/);
      let i = 0;
      for (const w of have) if (i < want.length && w === want[i]) i++;
      if (i < want.length) flag('FLAG', 'LINK-TEXT', `The link to ${card.url} reads "${m[1]}". Link text must contain "${lc(card.name)}" in order, e.g. "our [${lc(card.name)}](${card.url}) work".`);
    }
    // CARD-COUNT: a card names 2 or 3 services, never a list
    if (f.ref.sub === 'card_text') {
      const hits = [...new Set(V.serviceList.filter(sv => sv.say && new RegExp(`\\b${esc(sv.say)}\\b`, 'i').test(s)).map(sv => sv.say))];
      // "driveways" inside "new driveways" is one service, not two
      const named = new Set(hits.filter(h => !hits.some(o => o !== h && o.includes(h))));
      if (named.size > 3) flag('FLAG', 'CARD-COUNT', `Names ${named.size} services (${[...named].join(', ')}). Name 2 or 3, in a sentence, not a list.`);
    }
    // COAST: a coastal city's travel distance reads "inland and along the coast"
    if (D.coastal && (/\btravel/i.test(s) || /\[CV: travel_distance\]/.test(t) || (cv.travel_distance && l.includes(lc(cv.travel_distance))))) {
      if (/\bin (each|every) direction\b|\b(to the )?(north|south|east|west)(,| and)\s+(north|south|east|west)\b/i.test(s) || !/inland and along the coast/i.test(s)) {
        flag('FLAG', 'COAST', 'The city is on the coast: write the travel distance as "inland and along the coast", never compass directions.');
      }
    }
    // RESEARCH-LANG: the copy never sounds like the research it came from
    for (const w of RESEARCH_WORDS) {
      const m = s.match(new RegExp(`\\b${w}\\b`, 'i'));
      if (m) flag('FLAG', 'RESEARCH-LANG', `"${m[0]}" is research wording. Say what it means for the garden in plain words.`);
    }
    // REPEAT-IN: one point made once inside a field
    {
      const toks = lc(s).replace(/cvtoken/g, ' ').replace(/[^a-z0-9£' ]+/g, ' ').split(/\s+/).filter(Boolean);
      const seen = new Map();
      for (let i = 0; i + 4 <= toks.length; i++) {
        const g = toks.slice(i, i + 4);
        if (g.filter(w => !STOPWORDS.has(w)).length < 2) continue;
        const k = g.join(' ');
        if (seen.has(k) && i - seen.get(k) >= 4) { flag('FLAG', 'REPEAT-IN', `"${k}" appears twice in this field. Make each point once.`); break; }
        if (!seen.has(k)) seen.set(k, i);
      }
      if (f.ref.key === 'home_content_block_body') {
        const paras = t.split(/\n\n+/);
        for (const n of V.neighbourhoodNames) {
          const inParas = paras.filter(p => new RegExp(`\\b${esc(n)}`, 'i').test(p)).length;
          if (inParas > 1) flag('FLAG', 'REPEAT-IN', `${n} comes up in ${inParas} paragraphs. Make the point about it in one place.`);
        }
      }
    }

    // SERVICE: services named in the copy must be confirmed. Asked for cards and
    // FAQs (14 Oct); applied to every model field, because the first Stage 7 run
    // named "crown reduction" in the content block.
    {
      for (const term of (niche.service_terms || [])) {
        if (!new RegExp(`\\b${esc(term)}`, 'i').test(s)) continue;
        const need = lc(term).split(/[^a-z0-9]+/).filter(w => w && !GENERIC_SERVICE_WORDS.has(w)).map(stem);
        if (!need.length || V.confirmedServices.some(set => need.every(w => set.has(w)))) continue;
        flag('FLAG', 'SERVICE', `Names "${term}", which isn't one of the client's confirmed services. Name a confirmed service instead.`);
      }
    }
  }

  // ── Hero sentence 1 (HERO) ──
  const hero = fields.find(f => f.ref.key === 'home_hero_intro');
  if (hero && hero.text.trim()) {
    const s1 = (hero.text.split(/(?<=[.!?])\s+/)[0] || '');
    const tp = esc(lc(niche.trade_person || '')), city = esc(lc(V.city));
    const town = D.d14_town && D.d14_town.name;
    const problems = [];
    const blockers = []; // the keyword is the point of sentence 1: losing it is a BLOCK
    if (!/\[CV: company_name\]/.test(s1)) problems.push('it has no [CV: company_name]');
    if (city && tp && !new RegExp(`\\b${tp}s?\\s+(?:\\w+\\s+){0,2}?in\\s+${city}\\b|\\b${city}\\s+${tp}`, 'i').test(lc(s1))) blockers.push(`the keyword "${niche.trade_person} in ${V.city}" isn't there as a phrase`);
    if (town && city && (new RegExp(`\\b${esc(lc(town))},?\\s+${city}\\b`).test(lc(s1)) || new RegExp(`\\bin\\s+${city},\\s+${esc(lc(town))}\\b`).test(lc(s1)))) {
      blockers.push(`listing ${town} beside ${V.city} reads as if the business is based in both; say "${niche.trade_person} in ${V.city}", then ${town} as a place it works (e.g. "covering ${town} and the surrounding areas")`);
    }
    if (blockers.length) issue('BLOCK', 'HERO', hero.label, `Sentence 1: ${blockers.join('; ')}.`, hero.ref);
    if (town && !new RegExp(`\\b${esc(town)}\\b`, 'i').test(s1)) problems.push(`it doesn't mention the hero town ${town}`);
    if (!/and the surrounding areas\.?$/i.test(s1.trim())) problems.push('it doesn\'t end "and the surrounding areas"');
    if (problems.length) issue('FLAG', 'HERO', hero.label, `Sentence 1: ${problems.join('; ')}.`, hero.ref);
  }

  // ── Across fields ──
  // N1: every linkable category page linked in content block, a card, or the more line
  const linkedOnPage = new Set(fields.filter(f => /content_block|card_text|more_line/.test(f.label)).flatMap(f => linkUrls(f.text).map(normUrl)));
  const cb = fields.find(f => f.ref.key === 'home_content_block_body');
  for (const u of V.linkableCategories) if (!linkedOnPage.has(u)) issue('BLOCK', 'N1', cb.label, `The category page ${u} isn't linked in the content block, a card or the more line.`, cb.ref);

  // N4 / PROOF-REPEAT: one home per proof (headline, explanation, one mention = 3)
  const tokenCount = {};
  for (const f of fields) for (const m of f.text.matchAll(/\[CV: (insurance_cover|jobs_completed|years_trading|guarantee_years)\]/g)) tokenCount[m[1]] = (tokenCount[m[1]] || 0) + 1;
  for (const [k, n] of Object.entries(tokenCount)) if (n > 2) issue('FLAG', 'N4', 'page', `[CV: ${k}] appears ${n} times in the model fields.`);
  const proofs = [];
  if (/fixed\s+price/i.test(`${cv.differentiator_1 || ''} ${cv.differentiator_2 || ''}`)) proofs.push({ name: 'fixed price', re: /\bfixed[\s-]prices?\b/gi });
  if (cv.jobs_completed) proofs.push({ name: `${cv.jobs_completed} jobs`, re: new RegExp(`\\b${esc(String(cv.jobs_completed))}\\b\\+?`, 'g') });
  if (cv.insurance_cover) proofs.push({ name: 'the insurance figure', re: new RegExp(`£?\\s?${esc(String(cv.insurance_cover))}\\b`, 'gi') });
  for (const p of proofs) {
    let seen = 0;
    for (const f of fields) {
      const n = (scanText(f.text).match(p.re) || []).length;
      if (!n) continue;
      seen += n;
      if (seen > 3) issue('FLAG', 'PROOF-REPEAT', f.label, `"${p.name}" already appears 3 times earlier on the page. Leave it out here.`, f.ref);
    }
  }
  // TRUST-REPEAT: the trust line's proof stays out of the content block
  if (cb && D.d5_trust && /Jobs Completed/i.test(D.d5_trust) && cv.jobs_completed && new RegExp(`\\b${esc(String(cv.jobs_completed))}\\b`).test(scanText(cb.text))) {
    issue('FLAG', 'TRUST-REPEAT', cb.label, `The jobs figure is the hero trust line, so leave it out of the content block.`, cb.ref);
  }
  if (cb && D.d5_trust && /^Established/i.test(D.d5_trust) && cv.year_founded && new RegExp(`\\b${esc(String(cv.year_founded))}\\b`).test(cb.text)) {
    issue('FLAG', 'TRUST-REPEAT', cb.label, 'The founding year is the hero trust line, so leave it out of the content block.', cb.ref);
  }

  // CARD-LINK: a linked card carries the link to its own page inside a sentence
  (record.cards || []).forEach((c, i) => {
    if (!c.card_url) return;
    const f = fields.find(x => x.ref.key === 'cards' && x.ref.index === i);
    if (f && !linkUrls(f.text).some(u => normUrl(u) === normUrl(c.card_url))) {
      issue('BLOCK', 'CARD-LINK', f.label, `This card must link to its page ${c.card_url} inside a sentence, e.g. "our [${lc(c.card_name)}](${c.card_url}) work".`, f.ref);
    }
  });

  // N13: two cards opening with the same three words
  const cardFields = fields.filter(f => f.ref.sub === 'card_text');
  const openers = new Map();
  for (const f of cardFields) {
    const k = words(f.text).slice(0, 3).map(w => lc(w).replace(/\W/g, '')).join(' ');
    if (openers.has(k)) issue('FLAG', 'N13', f.label, `Opens with the same three words as ${openers.get(k)}. Start differently.`, f.ref);
    else openers.set(k, f.label);
  }
  // N14: words to avoid more than twice; closing lines starting the same way
  for (const w of (niche.words_avoid || [])) {
    let seen = 0;
    for (const f of fields) {
      const n = (lc(scanText(f.text)).match(new RegExp(`\\b${esc(lc(w))}\\b`, 'g')) || []).length;
      seen += n;
      if (n && seen > 2) issue('FLAG', 'N14', f.label, `"${w}" is on the words to avoid list and already used twice on the page.`, f.ref);
    }
  }
  const firstTwo = t => words(t).slice(0, 2).map(w => lc(w).replace(/\W/g, '')).join(' ');
  const finalF = fields.find(f => f.ref.key === 'home_final_cta_body');
  const closing = cb ? (sentences(cb.text).slice(-1)[0] || '') : '';
  if (finalF && D.cta_band && firstTwo(finalF.text) === firstTwo(D.cta_band.line)) issue('FLAG', 'N14', finalF.label, 'Opens with the same two words as the CTA band line.', finalF.ref);
  if (finalF && closing && firstTwo(finalF.text) === firstTwo(closing)) issue('FLAG', 'N14', finalF.label, 'Opens with the same two words as the content block closing line.', finalF.ref);

  // N21: a five word run shared by two fields (the later field is rewritten)
  const grams = f => {
    const w = scanText(f.text).replace(/CVTOKEN/g, ' ').toLowerCase().replace(/[^a-z0-9£ ]+/g, ' ').split(/\s+/).filter(Boolean);
    const out = new Set();
    for (let i = 0; i + 5 <= w.length; i++) out.add(w.slice(i, i + 5).join(' '));
    return out;
  };
  const seenGrams = new Map();
  for (const f of fields) {
    const g = grams(f);
    const shared = [...g].find(x => seenGrams.has(x));
    if (shared) issue('FLAG', 'N21', f.label, `Repeats "${shared}" from ${seenGrams.get(shared)}. Reword it.`, f.ref);
    for (const x of g) if (!seenGrams.has(x)) seenGrams.set(x, f.label);
  }
  // N23: stock phrases more than once on the page
  for (const p of STOCK) {
    let seen = 0;
    for (const f of fields) {
      const n = (lc(scanText(f.text)).match(new RegExp(`\\b${esc(p)}\\b`, 'g')) || []).length;
      seen += n;
      if (n && seen > 1) issue('FLAG', 'N23', f.label, `"${p}" is already used once on the page.`, f.ref);
    }
  }
  // HUB-LINK: the areas FAQ links the Locations Hub when there is one
  if (D.locations_hub) {
    const areasFaq = fields.find(f => f.ref.sub === 'faq_answer' && /which areas/i.test(f.label));
    if (areasFaq && !linkUrls(areasFaq.text).some(u => normUrl(u) === normUrl(D.locations_hub))) {
      issue('FLAG', 'HUB-LINK', areasFaq.label, `Link the Locations Hub (${D.locations_hub}) in this answer.`, areasFaq.ref);
    }
  }

  // 6c: at least one FAQ answer carries a link
  if (!fields.some(f => f.ref.sub === 'faq_answer' && linkUrls(f.text).length)) issue('FLAG', '6c', 'faq_items', 'No FAQ answer carries a link.');

  // ── Code fields (report only; code owns them) ──
  const h1 = record.home_hero_h1 || '';
  if (/[—–]/.test(h1)) issue('BLOCK', '4a', 'home_hero_h1', 'H1 contains an em or en dash.');
  if (/\b[A-Za-z]+-[A-Za-z]+\b/.test(h1)) issue('FLAG', '4a', 'home_hero_h1', 'H1 contains a hyphenated word.');
  if (h1.length > 60) issue('FLAG', '4b', 'home_hero_h1', `H1 is ${h1.length} characters (max 60).`);
  if (V.city && !lc(h1).includes(lc(V.city))) issue('FLAG', '4c', 'home_hero_h1', `H1 doesn't contain the city "${V.city}".`);
  if (!lc(h1).includes(lc(cv.primary_category || '~')) && !lc(h1).includes(lc(niche.trade_person || '~'))) issue('FLAG', '4c', 'home_hero_h1', 'H1 contains neither the primary category nor the trade person word.');
  if (cv.company_name && lc(h1).includes(lc(cv.company_name))) issue('BLOCK', '4d', 'home_hero_h1', 'H1 contains the company name.');
  if ((record.seo_title || '').length > 60) issue('FLAG', '7', 'seo_title', `SEO title is ${record.seo_title.length} characters (max 60).`);
  if ((record.meta_description || '').length > 155) issue('FLAG', '8', 'meta_description', `Meta description is ${record.meta_description.length} characters (max 155).`);
  const mod = (record.seo_title || '').split(' | ').length === 3 ? record.seo_title.split(' | ')[1] : null;
  if (mod) {
    const kw = new Set(lc(`${D.d2_h1} ${niche.trade} ${niche.trade_person} ${niche.trade_person_plural}`).split(/\W+/).filter(w => w.length > 2));
    const clash = lc(mod).split(/\W+/).find(w => kw.has(w));
    if (clash) issue('BLOCK', 'N3', 'seo_title', `The title modifier repeats "${clash}" from the keyword or trade words.`);
  }
  const areaNames = new Set((record.home_areas_links || []).map(a => lc(a.name)));
  for (const t of V.towns) {
    const short = lc(t.replace(/\s+\b(District|Borough|Council|County|Authority)\b.*$/i, '').trim());
    if (!areaNames.has(lc(t)) && !areaNames.has(short)) issue('BLOCK', '9', 'home_areas_links', `The area list is missing "${t}".`);
  }

  return issues;
}

function summarise(issues) {
  return {
    block: issues.filter(i => i.type === 'BLOCK').length,
    flag: issues.filter(i => i.type === 'FLAG').length,
  };
}

module.exports = { validateV20, buildValidationContext, modelFields, getField, setField, summarise, wordCount, RANGES, RETRY_FLAGS, BANNED, STOCK };
