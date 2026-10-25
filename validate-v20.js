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
const { isAdminArea } = require('./client-files');
const { confirmedServiceList } = require('./service-words');

const RETRY_FLAGS = new Set(['N7', 'N13', 'N14', 'N15', 'N17', 'N18', 'N19', 'N21', 'N22', 'N23', 'N24',
  '1b', 'HERO', 'SERVICE', 'TRUST-REPEAT', 'PROOF-REPEAT', 'RAW-GBP', 'CARD-COUNT', 'COAST', 'HUB-LINK', 'RESEARCH-LANG', 'REPEAT-IN',
  'FINAL-CTA', 'CARD-FILLER', 'MORE-REPEAT', 'CB-SERVICES', 'PRACTICE-REPEAT', 'FAQ-PAD', 'INTRO-PAD', 'PAD-OPENER', 'SCENERY',
  'CARD-LOCAL', 'LINK-TEXT', 'CARD-PICK', 'REPEAT-PAGE', 'CARD-PATTERN', 'OUTCOME', 'AREA-ADMIN', 'PRICE-FIRST']);
//   INSURANCE     BLOCK  insurance mentioned with no insurance_cover on file
//   RIVALS        BLOCK  (15 Oct) the copy tells the reader to get other quotes, compare firms or shop around
//   (15 Oct, second Edens Edge review)
//   N11           BLOCK  insurance described as an outcome ("pays out", "covers you"); was a FLAG
//   COAST-DIR     BLOCK  a compass direction in the areas intro of a coastal city
//   QUOTE-METHOD  BLOCK  the neutral step 2 names a quote method (photos, a call, a visit) with none confirmed
//   FINAL-CTA     BLOCK  the phone number in the final CTA body; FLAG for more than one sentence or no "we"/"you"
//   CARD-FILLER   FLAG   the city named in more than two cards
//   MORE-REPEAT   FLAG   "We also offer" names a service a card already names
//   CB-SERVICES   FLAG   the content block's services paragraph lists services instead of linking categories with a reason
//   9             council areas are left out of the area list check
//   CARD-LOCAL    BLOCK  a neighbourhood or allocated place in a card (a FLAG until 25 Oct)
//   PRACTICE-REPEAT FLAG a confirmed practice stated more than twice on the page (25 Oct)
//   INTRO-PAD     FLAG   a section intro sentence after the first that brings no new noun or number (25 Oct)
//   PROMISE       BLOCK  a promise about how the business runs a job or visit, in the shapes the loop keeps producing (25 Oct)
//   PROOF-QUOTE   BLOCK  the quote method or the price agreed before work more than 3 times on the page, or in both the cost FAQ and the visits FAQ (25 Oct, Brandon's read of round 6)
//   PAD-OPENER    FLAG   a sentence that could sit on any website ("every garden is different", "wherever you are") (25 Oct, loop)
//   SCENERY       FLAG   a research detail with no consequence for the work (trees, greens, villas named for their own sake) (25 Oct, loop)
//   FREQUENCY     BLOCK  a visit frequency (weekly, fortnightly, monthly) with no visit_frequency_options on file (25 Oct)
//   CONTRADICT    BLOCK  the copy says the price is not fixed when the fixed price is the client's confirmed proof (25 Oct)
//   PACK-COPY     BLOCK  a sentence copied from the calibration pack: five words in a row, or 70% of its content words (25 Oct)
//   FAQ-PAD       FLAG   a sentence after the answer that brings no new noun or number (25 Oct)
//   LINK-TEXT     FLAG   a category link whose text drops the category's words
//   (16 Oct, Brandon's round 2 review of Edens Edge)
//   CARD-COUNT    BLOCK  more than 3 services in a card (was a FLAG)
//   CARD-PICK     FLAG   a card names a service code didn't give it (D9 Services)
//   PROOF-FIXED   BLOCK  the fixed price more than 3 times (meta, its Why point, then page order), or in a step
//   REPEAT-PAGE   FLAG   a three word phrase (articles dropped, start/begin folded) in more than two fields
//   CAT-TEAM      BLOCK  a category used as a job title ("our deck builder team")
//   FAQ-YES       BLOCK  an answer to a which/what/how/why question opening "Yes" or "No"
//   CB-PARA       BLOCK  a content block paragraph of more than 4 sentences
//   (16 Oct, Brandon's round 3 review)
//   CARD-PATTERN  FLAG   two cards sharing a sentence pattern (same normalised opener); "we also handle" more than once on the page
//   SELF-REF      BLOCK  copy pointing at another part of the page ("see the areas section", "the full list below")
//   OUTCOME       FLAG   an outcome promise ("won't crack", "stays green") not in the client values
//   AREA-CLAIM    BLOCK  the business works, has worked or regularly works in a named place, unless areas_worked names it (25 Oct)
//   EXPERIENCE    BLOCK  a claim about the kinds of property or job worked on ("large rural properties") not in the client values
//   AREA-ADMIN    FLAG   a council area named in the areas intro or the areas FAQ
//   (16 Oct, copy quality loop)
//   SELF-REF      also "visit our [x] page"; N11 also "a clear route if something goes wrong"
//   N5            a fixed price in any wording, or a manufacturer warranty, when not confirmed
//   HERO          BLOCK  sentence 1 says the business is based somewhere other than the city
//   PRICE-FIRST   FLAG   "a price agreed before work starts" outside step 2 more than once
//
//   (23 Oct, category pages) The per-field checks and the cross-field checks that any
//   page shares run in validateCommon(record, V); the field names they key on come
//   from V.keys (the homepage's by default). validateV20 adds the homepage-only checks;
//   validate-category.js adds the category page's.
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
  // Padding a reviewer reads as stock (16 Oct, copy quality loop)
  "there's a service", 'there is a service', 'a service that fits', 'a service to match', 'whatever stage', 'we can help',
  'something for everyone', 'bring that experience', 'every job we take on', 'whatever your garden needs', 'whatever your roof needs',
];
const CLAIM_WORDS = ['best', '#1', 'leading', 'trusted', 'expert', 'specialist', 'reliable', 'fully insured'];
const STOCK = ['before you decide', 'in between', 'from the start', 'no surprises', 'peace of mind', 'take a look'];
const SUPERLATIVES = ['more than almost anything', 'the most', 'the only', 'unbeatable', 'like no other'];
const DATED = ['currently', 'at the moment', 'right now', 'this year'];
// Insurance described as an outcome for the customer (15 Oct: "pays out", "covers you")
// Copy that points at another part of the page (SELF-REF)
const SELF_REF_RE = /\b(?:see|listed|shown|set out|find|found|included|detailed)\b[^.]{0,30}\b(?:below|above)\b|\b(?:list|section|links?|map) (?:below|above)\b|\b(?:areas?|services?|faq|questions?|reviews?|locations?) section\b|\b(?:on|of|further down|up|elsewhere on) this page\b|\bthe full list\b|\bscroll (?:down|up)\b|\b(?:visit|see|check|read|head to|take a look at) (?:our|the) (?:\[[^\]]+\]\([^)]*\) |[a-z ]{0,30})?page\b/i;
// Outcome promises about the finished work (OUTCOME)
const OUTCOME_RE = /\b(?:won't|will not|wouldn't|never|doesn't|does not|don't|do not)\s+(?:ever\s+)?(?:crack|settle|sink|rot|fade|leak|move|shift|lift|warp|split|sag|flood|puddle|pool|fail|need (?:annual |any )?(?:treatment|maintenance|painting|staining))\w*\b|\bstay(?:s|ing)? (?:green|level|flat|watertight|dry|healthy|weed free|looking (?:good|new|great))\b|\b(?:last|lasts) (?:for )?(?:years|decades|a lifetime)\b|\bbuilt to last\b|\bfor years to come\b|\bproblem free\b|\bmaintenance free\b|\bwithout (?:cracking|leaking|lifting|sagging|rotting|splitting)\b|\bfor the long term\b|\bstay(?:s|ing)? (?:sound|dry and sound)\b/i;
// Claims about the kinds of property or job the business has worked on (EXPERIENCE)
const EXPERIENCE_RE = /\b(?:we've|we have|we|our team|our work)\b[^.]{0,120}\b(?:worked|completed|done|covered|covering|handled|tackled|seen|experience)\b[^.]{0,70}\b(rural|country|estate|period|listed|commercial|heritage|historic|large|grand|luxury|acre)\w*\b/i;
const OVERPROMISE = ['never by you', 'fully covered', 'pays for everything', "won't cost you", 'nothing to pay',
  'pays out', 'pay out', 'paid out', 'covers you', "you're covered", 'you are covered', 'you will be covered', 'will cover the cost', 'will pay for',
  'the cover applies', 'cover will apply', 'cover kicks in', 'clear route if something goes wrong', 'left to deal with it yourself', 'you won\'t be left', 'protects you'];
// The fixed price in any wording (PROOF-FIXED)
const FIXED_RE = /\bfixed[\s-]prices?\b|\b(?:price|figure|quote|cost)s?\b[^.]{0,30}\b(?:is|are|stays?|remains?) fixed\b|\bfigure (?:you|we) (?:agree|pay)\b|\bfinal invoice\b|\bwhat we quote is what you pay\b|\bno hidden costs\b|\bnothing (?:is |gets |will be )?added\b|\bfixed (?:quote|figure|cost)s?\b|\bno (?:additions|extras|surprise costs)\b|\bwithout (?:any )?(?:changes|additions) (?:made )?(?:along the way|once)\b|\bnothing extra\b/i;
// "A price agreed before work starts" (PRICE-FIRST): step 2's idea, said once elsewhere at most
const PRICE_FIRST_RE = /\b(?:price|figure|cost|quote)d?\b[^.]{0,40}\b(?:before (?:any|the|a|anything|work|we|you|it)|upfront|up front|in advance)\b|\b(?:priced|agreed|agree a price)\b[^.]{0,30}\bbefore\b/i;
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

// The fields the shared checks key on; a page type passes its own as V.keys
const HOMEPAGE_KEYS = {
  hero: 'home_hero_intro', content: 'home_content_block_body', finalCta: 'home_final_cta_body',
  areasIntro: 'home_areas_intro', moreLine: 'home_services_more_line', selfUrl: '/',
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
const stem1 = w => { const a = lc(w).replace(/[^a-z0-9]/g, ''); const b = a.replace(/(ations?|ions?|ings?|ed|es|s|e)$/, ''); return b.length >= 3 ? b : a; };
// Stemmed until stable, so "weeding" (→ weed → we) meets "weed" (→ we) (loop round 1: "weeding" was flagged against the Weed control page)
const stem = w => { let a = stem1(w); for (let i = 0; i < 3; i++) { const b = stem1(a); if (b === a) break; a = b; } return a; };
// The content words of a sentence (4+ letters, stop words out, stemmed): what it is about
const PAD_GENERIC = new Set('with without about would could should there their these those which while where when what have having been being also just only very more most much many some such into onto over under than then them they your yours ours ever every each from this that here come comes came make makes made take takes took give gives want wants need needs keep keeps look looks like well good right thing things time times work works works'.split(' '));
const contentWords = t => new Set(lc(scanText(t)).replace(/cvtoken/g, ' ').replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).map(w => w.replace(/'s$/, '')).filter(w => w.length >= 4 && !STOPWORDS.has(w) && !PAD_GENERIC.has(w)).map(stem));

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
// The calibration pack's sentences, for PACK-COPY: word 5-grams (two content words at least) and
// content word sets. {{custom_values.x}} and [CV: x] tokens are neutral words. Cached by text.
const packCache = new Map();
function packIndex(text) {
  if (!text) return null;
  if (packCache.has(text)) return packCache.get(text);
  const grams = new Set();
  const sets = [];
  const plain = String(text).replace(/\{\{[^}]+\}\}|\[CV: [a-z0-9_]+\]/g, ' x ').replace(/[#*_>|`]+/g, ' ');
  for (const sen of plain.split(/\n+|(?<=[.!?])\s+/)) {
    const toks = lc(sen).replace(/[^a-z0-9£' ]+/g, ' ').split(/\s+/).filter(Boolean);
    for (let i = 0; i + 5 <= toks.length; i++) {
      const g = toks.slice(i, i + 5);
      if (g.filter(w => !STOPWORDS.has(w) && w.length > 2).length >= 2) grams.add(g.join(' '));
    }
    // Seven content words at least: shorter sentences are generic ("the price depends on the size of
    // the garden" matched a pack FAQ at 80%), and the 5-gram run catches a short copy anyway
    const cw = contentWords(sen);
    if (cw.size >= 7) sets.push({ words: cw, text: sen.trim().slice(0, 90) });
  }
  const idx = { grams, sets };
  packCache.set(text, idx);
  return idx;
}
// A sentence copied from the pack: a shared 4-gram, or 70% of its content words in one pack sentence
function packCopy(sentence, idx) {
  if (!idx) return null;
  const toks = lc(scanText(sentence)).replace(/cvtoken/g, 'x').replace(/[^a-z0-9£' ]+/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = 0; i + 5 <= toks.length; i++) { const g = toks.slice(i, i + 5); if (g.filter(w => !STOPWORDS.has(w) && w.length > 2).length >= 2 && idx.grams.has(g.join(' '))) return { kind: 'run', match: g.join(' ') }; }
  const mine = contentWords(sentence);
  if (mine.size >= 7) for (const s of idx.sets) { let shared = 0; for (const w of mine) if (s.words.has(w)) shared++; if (shared / Math.min(mine.size, s.words.size) >= 0.7) return { kind: 'sentence', match: s.text }; }
  return null;
}

function buildValidationContext({ cv, niche, decisions, keyValueMap = {}, serviceParentMap = {}, populatedCvKeys, calibrationPack = '', tradeFactsText = '' }) {
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
  // A town page's profile (category pages) counts as research the copy may draw on
  const researchText = lc([...allocated.neighbourhoods.map(n => n.profile), ...Object.values(allocated.symptoms || {}).map(s => `${s.text} ${s.issueText}`), allocated.extraText || ''].join(' '));
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
    ...Object.entries(keyValueMap).filter(([k]) => /^(service|mentioned|category)_\d+$/.test(k)).map(([, v]) => v),
    ...serviceList.map(s => s.say).filter(Boolean),
    ...((D.d9 && D.d9.main) || []).map(c => c.name), ...((D.d9 && D.d9.alsoOffer) || []),
    cv.primary_category, ...(cv.materials_methods || []),
  ].filter(Boolean).map(s => new Set(lc(s).split(/[^a-z0-9]+/).filter(Boolean).map(stem)));

  const linkable = new Set((D.linkablePages || []).map(p => normUrl(p.url)));
  const linkableCategories = (D.linkablePages || []).filter(p => p.type === 'category').map(p => normUrl(p.url));
  const towns = Object.entries(keyValueMap).filter(([k]) => /^biz_area_\d+$/.test(k)).map(([, v]) => v);
  return {
    cv, niche, D, keyValueMap, serviceParentMap, populatedCvKeys: populatedCvKeys || new Set(),
    pack: packIndex(calibrationPack),
    tradeFactsText: lc(tradeFactsText || ''),
    cvNumbers, cvText: cvText.join(' | '), researchText, researchNumbers, places: [...places],
    confirmedServices, serviceList, linkable, linkableCategories, towns,
    // Council areas, by their short name too ("New Forest" for "New Forest District")
    adminAreas: [...new Set(towns.filter(isAdminArea).flatMap(a => [a, a.replace(/\s+\b(District|Borough|Council|County|Authority|Region|National Park)\b.*$/i, '').trim()]).filter(a => a.length > 3))],
    neighbourhoodNames: allocated.neighbourhoods.map(n => n.name.split(/[\s,’']/)[0]).filter(n => n.length > 3),
    city: (keyValueMap.biz_area_1 || '').trim(),
    categoryNames: [...new Set([...Object.entries(keyValueMap).filter(([k]) => /^category_\d+$/.test(k)).map(([, v]) => v),
      ...((D.d9 && D.d9.main) || []).map(c => c.name)])],
  };
}

// ── The validator ──
// The checks every page type shares. Returns { issues, issue, fields } so a page
// type's own validator can add to them.
function validateCommon(record, V) {
  const issues = [];
  const issue = (type, check, field, message, ref = null) => issues.push({
    type, check, field, ref, message, retry: !!ref && (type === 'BLOCK' || RETRY_FLAGS.has(check)),
  });
  if (record.blocked) return { issues, issue, fields: [] };
  const { cv, niche, D } = V;
  const K = V.keys || HOMEPAGE_KEYS;
  const ranges = (require('./page-types').pageTypeOf(record).ranges) || RANGES;
  const fields = modelFields(record);

  // ── Per field ──
  for (const f of fields) {
    const t = f.text;
    const s = scanText(t);
    const l = lc(s);
    const flag = (type, check, msg) => issue(type, check, f.label, msg, f.ref);

    // N6: shown field must have text
    if (!t.trim() || t.trim() === 'HIDDEN') { flag('BLOCK', 'N6', `${f.label} is shown on the page but empty.`); continue; }

    const fixedConfirmed = /fixed\s+price/i.test(`${cv.differentiator_1_confirmed ? cv.differentiator_1 : ''} ${cv.differentiator_2_confirmed ? cv.differentiator_2 : ''} ${cv.quote_method || ''}`);
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

    // LEAK (16 Oct, copy quality loop): a field label or the data behind the copy shows on the
    // page ("card_text (Lawn Care Service): …", "Because yes is confirmed for urgent leaks")
    {
      const lab = s.match(/^\s*(?:card_text|card_name|faq_answer|faq_question|point_body|point_title|step_body|step_title|card_title|card_body|home_[a-z_]+|cat_[a-z_]+)\b[^:\n]{0,60}:/i);
      if (lab) flag('BLOCK', 'LEAK', `The text starts with a field label ("${lab[0].trim()}"). Write only the copy.`);
      // ...and the insurance rule said out loud ("described here as the cover we hold, not a promise of any outcome", loop round 4)
      const data = s.match(/\b(?:is|are|isn't|aren't|been|as) confirmed\b|\byes is\b|\bon file\b|\bclient values?\b|\bcustom values?\b|\bCVTOKEN\s*=|\bdescribed (?:here )?as (?:the )?cover\b|\bnot a promise (?:of|about) (?:any )?(?:outcome|result)s?\b|\bnever a promise\b|\brather than a promise\b/i);
      if (data) flag('BLOCK', 'LEAK', `"${data[0]}" talks about the data behind the page. Say the fact itself, the way the owner would.`);
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
      if (normUrl(u) === normUrl(K.selfUrl)) flag('BLOCK', 'N2', 'Links the page to itself.');
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
    if (!fixedConfirmed && FIXED_RE.test(s)) flag('BLOCK', 'N5', `"${s.match(FIXED_RE)[0]}" promises a fixed price, which isn't confirmed.`);
    if (!cv.manufacturer_warranty && /\bmanufacturer(?:'s)?\s+(?:warrant|guarant|terms|cover)/i.test(s)) flag('BLOCK', 'N5', 'A manufacturer warranty is mentioned but none is confirmed.');
    // Claim words; "the best chance/time/way" and "leading to" aren't claims about the business
    const claimText = s.replace(/\b(the )?best (chance|time|way|option|choice|results?|thing|approach|fit|suited|for (you|your))\b|\bat best\b/gi, ' ')
      .replace(/\bleading (to|up|into)\b/gi, ' ');
    for (const w of CLAIM_WORDS) if (new RegExp(`(^|\\W)${esc(w)}(\\W|$)`, 'i').test(claimText)) flag('BLOCK', 'N5', `Claim word "${w}" with no proof on file. Say "local" or the concrete thing.`);

    // N7: word ranges and long sentences
    const r = ranges[f.rangeKey];
    if (r) {
      const range = f.rangeKey === K.content && D.d13_expands ? { min: 200, max: 300, label: '200 to 300' } : r;
      const n = wordCount(t);
      if ((range.min && n < range.min) || n > range.max) flag('FLAG', 'N7', `${n} words: it must be ${range.label}.`);
    }
    if (f.rangeKey === K.finalCta && sentences(t).length > 1) flag('FLAG', 'N7', 'Must be one sentence.');
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
    for (const w of OVERPROMISE) if (new RegExp(`\\b${esc(w)}\\b`).test(l)) flag('BLOCK', 'N11', `Insurance overpromise: "${w}" promises an outcome. Describe what the cover is for, never what it pays or who it covers.`);
    // N12 team/crew
    if ((!cv.team_size || parseInt(cv.team_size, 10) <= 1) && /\b(team|crew)\b/i.test(s)) flag('FLAG', 'N12', '"Team" or "crew" used but the team size is not above 1.');
    // N15 pronouns
    if (!cv.owner_pronoun && /\b(he|him|himself|she|her|herself)\b/i.test(s)) flag('FLAG', 'N15', 'A gendered pronoun with no owner_pronoun set. Repeat [CV: owner_name] or rewrite.');
    // N17 company token outside the hero, or opening sentences more than once
    const companyOpens = t.split(/\n\n+|(?<=[.!?])\s+/).filter(x => /^\[CV: company_name\]/.test(x.trim())).length;
    if (f.ref.key !== K.hero && /\[CV: company_name\]/.test(t)) flag('FLAG', 'N17', '[CV: company_name] appears outside the hero intro. Start with "We", the customer or the subject.');
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
    // PACK-COPY: nothing lifted from the calibration pack (25 Oct: the May to July hedge line)
    if (V.pack) {
      for (const sen of sentences(t)) {
        const hit = packCopy(sen, V.pack);
        if (hit) { flag('BLOCK', 'PACK-COPY', `"${sen.slice(0, 70)}…" ${hit.kind === 'run' ? `shares "${hit.match}" with` : 'is a sentence from'} the calibration pack. The pack is for terminology and standard, never copied: write the point for this client.`); break; }
      }
    }
    // INTRO-PAD: a section intro earns every sentence after the first with a new noun or a number
    if (/_intro$/.test(f.rangeKey || '')) {
      const sens = sentences(t);
      const seenWords = new Set(contentWords(sens[0] || ''));
      for (const sen of sens.slice(1)) {
        const mine = contentWords(sen);
        const fresh = [...mine].filter(w => !seenWords.has(w));
        if (!fresh.length && !/\d/.test(sen) && !/\[CV: /.test(sen)) { flag('FLAG', 'INTRO-PAD', `"${sen.slice(0, 70)}…" adds nothing the intro hasn't said (no new noun or number). Cut it, or give it a fact.`); break; }
        for (const w of mine) seenWords.add(w);
      }
    }
    // N24 FAQ first sentence
    if (f.ref.sub === 'faq_answer') {
      const sens = sentences(t);
      const n = wordCount(sens[0] || '');
      if (n > 15) flag('FLAG', 'N24', `The first sentence is ${n} words. Answer the question first, in 15 words or fewer.`);
      // FAQ-PAD: every sentence after the answer earns its place with a new noun or a number
      const question = (f.label.match(/^faq_answer \((.*)\)$/) || [])[1] || '';
      const seenWords = new Set(contentWords(`${question} ${sens[0] || ''}`));
      for (const sen of sens.slice(1)) {
        const mine = contentWords(sen);
        const fresh = [...mine].filter(w => !seenWords.has(w));
        if (!fresh.length && !/\d/.test(sen) && !/\[CV: /.test(sen)) { flag('FLAG', 'FAQ-PAD', `"${sen.slice(0, 70)}…" adds nothing the answer hasn't said (no new noun or number). Cut it, or give it a fact.`); break; }
        for (const w of mine) seenWords.add(w);
      }
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

    // PAD-OPENER: a sentence that could sit on any website (loop rounds 1 to 3)
    {
      const m = s.match(/\b(?:every|each|no two) (?:garden|home|job|roof|property|lawn)s? (?:is|are|looks?|sits?) (?:different|the same|unique)\b|\bgardens? (?:change|changes|differ|differs|vary|varies) from (?:one )?(?:street|house|garden|road) to (?:street|house|the next|garden|road)\b|\bwherever you (?:are|live)\b|\bthe same (?:care|attention|service|work|standard) (?:in|wherever|whether|as)\b|\bgo(?:es)? (?:wherever|everywhere|anywhere) we (?:cover|work|go)\b|\b(?:prices?|costs?) (?:vary|varies|differ|change) because\b|\bwhatever (?:the|your) (?:size|garden|job|budget)\b|\bhas to work with that\b|\bthere(?:'s| is) (?:no|a) (?:single|one) (?:answer|figure|price)\b|\bit depends on the garden\b/i);
      if (m) flag('FLAG', 'PAD-OPENER', `"${m[0]}" could sit on any website. Replace it with the specific point: a place, a job, a number or a named service.`);
    }
    // SCENERY: a research detail named for its own sake, with nothing it means for the work (loop rounds 1 to 3)
    if (f.ref.key === K.content || f.ref.sub === 'faq_answer') {
      for (const sen of sentences(t)) {
        if (!/\b(?:pines?|cherr(?:y|ies)|oaks?|limes?|beech(?:es)?|chestnuts?|planes?|poplars?|willows?|sycamores?|tree lined|leafy|avenue|villas?|cottages?|terraces?|semis?|detached|footway|pavement|river(?:side)?|canal|greens|estate|conservation area|article 4)\b/i.test(sen)) continue;
        if (/\b(?:mow|cut|hedg|lawn|grass|beds?|borders?|fenc|weed|mulch|seed|turf|soil|clay|chalk|drain|water|shade|shad|roots?|access|slope|level|paving|patio|drive|deck|timber|post|prun|trim|clear|plant|dig|base|path|boundary|boundaries|work|visit|job|round)\w*/i.test(sen.replace(/\b(?:tree lined|leafy)\b/gi, ''))) continue;
        flag('FLAG', 'SCENERY', `"${sen.slice(0, 70)}…" names the place for its own sake. Say what the detail means for the work, or leave it out.`);
        break;
      }
    }
    // FREQUENCY: a visit frequency only from visit_frequency_options
    if (!String(cv.visit_frequency_options || '').trim() && /\b(?:weekly|fortnightly|monthly|every (?:week|fortnight|month|two weeks|other week))\b/i.test(s)) {
      flag('BLOCK', 'FREQUENCY', `"${s.match(/\b(?:weekly|fortnightly|monthly|every (?:week|fortnight|month|two weeks|other week))\b/i)[0]}" names a visit frequency, but visit_frequency_options is blank. Say the schedule is agreed with the customer and nothing more.`);
    }
    // PROMISE: how a job or visit is run is a practice; these shapes are never on file (loop round 1)
    {
      const m = s.match(/\bnothing (?:gets |is |will be )?added\b[^.]{0,30}\bwithout\b|\bwithout you (?:saying|asking|agreeing)\b|\bwe (?:always )?stick to\b|\b(?:price|figure|cost|quote)s?\b[^.]{0,20}\b(?:doesn't|does not|won't|will not|never) (?:creep|change|move|go up|rise)\b|\beach (?:garden|job|visit|customer) gets (?:its|their) own\b|\b(?:its|their) own plan\b|\bwe (?:fit|fits|fitted|fitting|shape|plan|build) (?:the|each|every|a) (?:visit|round|job)s? (?:to|around) (?:a time|your|the time|when)\b|\bat a time that (?:works|suits)\b|\b(?:we )?arrive ready\b|\bready to start on\b/i);
      if (m) flag('BLOCK', 'PROMISE', `"${m[0]}" promises how the business runs the job, which only CONFIRMED PRACTICES may say. Leave it out, or say what the work involves instead.`);
    }
    // CONTRADICT: the fixed price is the proof, so the price is never "not fixed" (loop round 1)
    if (fixedConfirmed && /\bnot (?:a |one )?fixed\b|\bisn't fixed\b|\bis not fixed\b|\bno (?:single |one )?fixed (?:price|sum|figure|cost|fee)\b|\bno set (?:price|figure|fee)\b/i.test(s)) {
      flag('BLOCK', 'CONTRADICT', `"${s.match(/\bnot (?:a |one )?fixed\b|\bisn't fixed\b|\bis not fixed\b|\bno (?:single |one )?fixed (?:price|sum|figure|cost|fee)\b|\bno set (?:price|figure|fee)\b/i)[0]}" contradicts the fixed price the page is built on. Say the price depends on the garden and is agreed first, never that it isn't fixed.`);
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
      // A BLOCK since 25 Oct (Brandon's read of the Gardener page)
      if (local) flag('BLOCK', 'CARD-LOCAL', `Mentions ${local}. Cards carry no neighbourhoods or local conditions; local detail lives in the content block.`);
    }
    // LINK-TEXT: a category link's text holds the category's words, in order
    for (const m of t.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
      const card = ((D.d9 && D.d9.main) || []).find(c => c.url && normUrl(c.url) === normUrl(m[2]));
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
      // The card's own category name ("our lawn care service") isn't a service it names (16 Oct)
      const cardCat = lc(((record.cards || [])[f.ref.index] || {}).card_name || '');
      const named = new Set(hits.filter(h => !hits.some(o => o !== h && o.includes(h)) && !(cardCat && cardCat.includes(lc(h)))));
      // A BLOCK since 16 Oct (Brandon); code gives each card its 2 or 3 services
      const picks = (((D.d9 && D.d9.main) || [])[f.ref.index] || {}).services;
      const allowed = picks && picks.length ? ` Name only ${picks.join(', ')}.` : ' Name 2 or 3, in a sentence, not a list.';
      if (named.size > 3) flag('BLOCK', 'CARD-COUNT', `Names ${named.size} services (${[...named].join(', ')}).${allowed}`);
      // CARD-PICK: a service the card wasn't given (category names don't count)
      if (picks) {
        const cats = new Set(V.categoryNames.map(lc));
        const extra = [...named].filter(n => !picks.some(p => lc(p) === lc(n) || lc(p).includes(lc(n)) || lc(n).includes(lc(p))) && !cats.has(lc(n)) && ![...cats].some(c => c.includes(lc(n))));
        if (extra.length) flag('FLAG', 'CARD-PICK', `Names ${extra.join(', ')}, which this card wasn't given.${picks.length ? ` Its services are ${picks.join(', ')}.` : ' Describe the work without naming services.'}`);
      }
    }
    // SELF-REF: the page never points at itself; each section stands on its own (16 Oct, round 3)
    { const m = s.match(SELF_REF_RE); if (m) flag('BLOCK', 'SELF-REF', `"${m[0]}" points at another part of the page. Say the thing itself, or leave it out.`); }
    // OUTCOME: promises about how the finished work behaves are claims (16 Oct, round 3)
    for (const m of s.matchAll(new RegExp(OUTCOME_RE.source, 'gi'))) {
      if (!V.cvText.includes(lc(m[0]))) flag('FLAG', 'OUTCOME', `"${m[0]}" promises an outcome the client hasn't confirmed. Say what the work involves, not how it will perform.`);
    }
    // EXPERIENCE: kinds of property or job worked on need a client value (16 Oct, round 3)
    for (const sen of sentences(t)) {
      const m = scanText(sen).match(EXPERIENCE_RE);
      if (m && !V.cvText.includes(lc(m[1]))) flag('BLOCK', 'EXPERIENCE', `"${scanText(sen).slice(0, 90)}…" claims experience with ${lc(m[1])} properties or jobs, which isn't in the client values. Leave the kind of job out.`);
    }
    // AREA-ADMIN: council areas aren't places a customer lives (16 Oct)
    if (f.ref.key === K.areasIntro || /^faq_answer \(Which areas/i.test(f.label)) {
      for (const a of V.adminAreas) if (new RegExp(`\\b${esc(a)}\\b`, 'i').test(s)) flag('FLAG', 'AREA-ADMIN', `Names "${a}", a council area. Name towns and villages from the area list instead.`);
    }
    // CAT-TEAM: a category name is never a job title for the team ("our deck builder team") (16 Oct)
    for (const cat of [...new Set(V.categoryNames.map(lc))]) {
      const m = s.match(new RegExp(`\\b(?:our|the|a|your)\\s+${esc(cat)}\\s+(team|crew|staff|people|guys|lads)\\b`, 'i'));
      if (m) flag('BLOCK', 'CAT-TEAM', `"${m[0]}" uses the category as a job title. Write "our ${lc(cat)} work" or start with "we".`);
    }
    // FAQ-YES: an answer to a which/what/how/why question never opens "Yes" or "No" (16 Oct)
    if (f.ref.sub === 'faq_answer') {
      const q = (f.label.match(/^faq_answer \((.*)\)$/) || [])[1] || '';
      if (/^(which|what|how|why|when|where|who)\b/i.test(q.trim()) && /^\s*(yes|no)\b/i.test(s)) {
        flag('BLOCK', 'FAQ-YES', `"${q}" isn't a yes or no question, so the answer can't open "${s.trim().split(/[\s,]/)[0]}". Open with the answer itself.`);
      }
    }
    // CB-PARA: content block paragraphs are 4 sentences at most (16 Oct)
    if (f.ref.key === K.content) {
      t.split(/\n\s*\n/).forEach((para, i) => {
        const n = sentences(para).length;
        if (n > 4) flag('BLOCK', 'CB-PARA', `Paragraph ${i + 1} has ${n} sentences. Keep each paragraph to 4 at most: split it or cut a sentence.`);
      });
    }
    // COAST: a coastal city's travel distance reads "inland and along the coast"
    if (D.coastal && (/\btravel/i.test(s) || /\[CV: travel_distance\]/.test(t) || (cv.travel_distance && l.includes(lc(cv.travel_distance))))) {
      if (/\bin (each|every) direction\b|\b(to the )?(north|south|east|west)(,| and)\s+(north|south|east|west)\b/i.test(s) || !/inland and along the coast/i.test(s)) {
        flag('FLAG', 'COAST', 'The city is on the coast: write the travel distance as "inland and along the coast", never compass directions.');
      }
    }
    // COAST-DIR: on a coastal city the areas intro names no compass direction (15 Oct)
    if (D.coastal && f.ref.key === K.areasIntro) {
      const plain = s.replace(/\[CV: [a-z0-9_]+\]/g, ' ').replace(new RegExp(esc(cv.area_wide || '\u0000'), 'gi'), ' ');
      const dir = plain.match(/\b(north|south|east|west)(?:ern|wards?|\s*east|\s*west)?\b/i);
      if (dir) flag('BLOCK', 'COAST-DIR', `"${dir[0]}": the city is on the coast, so the areas intro names no compass direction. Write "inland and along the coast" and name places instead.`);
    }
    // QUOTE-METHOD: the neutral step 2 (no visit before quoting) names no quote method
    // unless quote_method gives one (15 Oct)
    if (f.ref.sub === 'step_body' && f.ref.index === 1 && !cv.quote_method && niche.step_2_no_visit && (D.niche_steps || [])[1] && D.niche_steps[1].title === niche.step_2_no_visit.title) {
      const m = s.match(/\b(photos?|pictures?|images?|videos?|phone call|a call|calls?|visits?|survey|inspect\w*|site visit)\b/i);
      if (m) flag('BLOCK', 'QUOTE-METHOD', `"${m[0]}" names a way of pricing the job, but no quote method is confirmed. Say a price is agreed before work starts, without saying how.`);
    }
    // FINAL-CTA: one normal sentence, "we" or the customer as the subject, never the phone number (15 Oct)
    if (f.ref.key === K.finalCta) {
      // The token is named, so the rewrite drops it (25 Oct: four category page retries kept "Call [CV: phone]")
      if (/\[CV: phone\]/.test(t) || (cv.phone && digits.includes(cv.phone.replace(/\D/g, '')))) flag('BLOCK', 'FINAL-CTA', 'The final CTA body never gives the phone number: remove "[CV: phone]" and any "Call" or "Ring" before it; the buttons carry the number. Say what happens when they get in touch.');
      if (sentences(t).length > 1) flag('FLAG', 'FINAL-CTA', 'The final CTA body is one sentence.');
      if (!/\b(we|we'll|we're|you|you'll|your)\b/i.test(s)) flag('FLAG', 'FINAL-CTA', 'Make "we" or the customer the subject of the sentence.');
    }
    // AREA-CLAIM (Brandon, 25 Oct, service pair): no sentence claims the business works, has worked
    // or regularly works in a named place ("regular work for us around Romsey", "we've done many
    // jobs in Bassett") unless [CV: areas_worked] names it
    {
      // The base town is where the business is based, so work there is no claim; every other town, village or neighbourhood is
      const placeNames = [...new Set([...(V.towns || []), D.town, ...(V.neighbourhoodNames || []), ...(V.places || []), ...(((D.allocated || {}).villages) || [])].filter(Boolean).map(String))].filter(p => lc(p) !== lc(V.city || ''));
      const worked = lc(String(cv.areas_worked || '')).split(/[,\n;]+/).map(x => x.trim()).filter(Boolean);
      const allowed = p => worked.some(w => w === lc(p) || w.includes(lc(p)) || lc(p).includes(w));
      const places = placeNames.filter(p => p.length > 3 && !allowed(p));
      if (places.length) {
        const P = `(?:${places.map(esc).join('|')})`;
        const CLAIM = new RegExp(`\\b(?:regular|regularly|often|frequently|most of our|much of our|a lot of our|plenty of our|many of our)\\b[^.]{0,40}\\b(?:work|jobs?|visits?|customers?)\\b[^.]{0,40}\\b(?:in|around|across|for)\\s+${P}\\b|\\b(?:work|jobs?|visits?|customers?)\\b[^.]{0,20}\\b(?:we(?:'ve| have)?\\s+(?:done|do|completed|carried out|finished|worked|work)|for us)\\b[^.]{0,40}\\b(?:in|around|across)\\s+${P}\\b|\\bwe(?:'ve| have)\\s+(?:done|completed|carried out|finished|worked|looked after|cut|laid|built|fitted|installed)\\b[^.]{0,60}\\b(?:in|around|across)\\s+${P}\\b|\\bwe(?:'re| are)\\s+(?:often|regularly|frequently|usually|always)\\s+(?:in|around|out in)\\s+${P}\\b|\\b(?:our|the)\\s+(?:work|jobs?|visits?)\\s+(?:in|around|across)\\s+${P}\\b`, 'i');
        // The page keyword ("gardener in Winchester") is required by rule, so it is not a claim on its own
        const kwRe = D.keyword ? new RegExp(esc(D.keyword), 'ig') : null;
        for (const sen of sentences(t)) {
          const m = (kwRe ? scanText(sen).replace(kwRe, 'KEYWORD') : scanText(sen)).match(CLAIM);
          if (m) { flag('BLOCK', 'AREA-CLAIM', `"${m[0]}" claims the business works, or has worked, in a named place. Only [CV: areas_worked] can say where work has been done; say what the work involves instead.`); break; }
        }
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
      if (f.ref.key === K.content) {
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
        if (V.cvText.includes(lc(term))) continue; // the client values name it (a guarantee scope, typical jobs)
        if (V.tradeFactsText && V.tradeFactsText.includes(lc(term))) continue; // a method the page's trade facts rows give (scarifying on the moss card, 25 Oct)
        flag('FLAG', 'SERVICE', `Names "${term}", which isn't one of the client's confirmed services. Name a confirmed service instead.`);
      }
    }
  }

  const cb = fields.find(f => f.ref.key === K.content);
  // N4 / PROOF-REPEAT: one home per proof (headline, explanation, one mention = 3)
  const tokenCount = {};
  for (const f of fields) for (const m of f.text.matchAll(/\[CV: (insurance_cover|jobs_completed|years_trading|guarantee_years)\]/g)) tokenCount[m[1]] = (tokenCount[m[1]] || 0) + 1;
  for (const [k, n] of Object.entries(tokenCount)) if (n > 2) issue('FLAG', 'N4', 'page', `[CV: ${k}] appears ${n} times in the model fields.`);
  return { issues, issue, fields, cb, K };
}

// The homepage's own checks, on top of the shared ones
function validateV20(record, V) {
  const common = validateCommon(record, V);
  const { issues, issue, fields, cb } = common;
  if (record.blocked) return issues;
  const { cv, niche, D } = V;

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
    const basedIn = lc(s1).match(/\bbased (?:in|at|near|around) ([a-z' ]+?)(?:,| and\b|\.|$)/);
    if (basedIn && city && !new RegExp(`^${city}\\b`).test(basedIn[1].trim())) blockers.push(`it says the business is based in ${basedIn[1].trim()}; it is based in ${V.city}, and ${town || 'other towns'} is where it works ("covering ${town || '[town]'} and the surrounding areas")`);
    if (blockers.length) issue('BLOCK', 'HERO', hero.label, `Sentence 1: ${blockers.join('; ')}.`, hero.ref);
    if (town && !new RegExp(`\\b${esc(town)}\\b`, 'i').test(s1)) problems.push(`it doesn't mention the hero town ${town}`);
    if (!/and the surrounding areas\.?$/i.test(s1.trim())) problems.push('it doesn\'t end "and the surrounding areas"');
    if (problems.length) issue('FLAG', 'HERO', hero.label, `Sentence 1: ${problems.join('; ')}.`, hero.ref);
  }

  // ── Across fields ──
  // N1: every linkable category page linked in content block, a card, or the more line
  const linkedOnPage = new Set(fields.filter(f => /content_block|card_text|more_line/.test(f.label)).flatMap(f => linkUrls(f.text).map(normUrl)));
  for (const u of V.linkableCategories) if (!linkedOnPage.has(u)) issue('BLOCK', 'N1', cb.label, `The category page ${u} isn't linked in the content block, a card or the more line.`, cb.ref);

  sharedCrossChecks(record, V, common);

  // TRUST-REPEAT: the trust line's proof stays out of the content block
  if (cb && D.d5_trust && /Jobs Completed/i.test(D.d5_trust) && cv.jobs_completed && new RegExp(`\\b${esc(String(cv.jobs_completed))}\\b`).test(scanText(cb.text))) {
    issue('FLAG', 'TRUST-REPEAT', cb.label, `The jobs figure is the hero trust line, so leave it out of the content block.`, cb.ref);
  }
  if (cb && D.d5_trust && /^Established/i.test(D.d5_trust) && cv.year_founded && new RegExp(`\\b${esc(String(cv.year_founded))}\\b`).test(cb.text)) {
    issue('FLAG', 'TRUST-REPEAT', cb.label, 'The founding year is the hero trust line, so leave it out of the content block.', cb.ref);
  }
  const cardFields = fields.filter(f => f.ref.sub === 'card_text');
  // CB-SERVICES: the content block's category links come with a reason each, never a list
  // of the services inside them: the cards describe those (15 Oct)
  const cbField = fields.find(f => f.label === 'home_content_block_body');
  if (cbField) {
    const catWords = new Set(cardFields.map(f => lc(f.label.replace(/^card_text \(|\)$/g, ''))));
    for (const para of String(cbField.text).split(/\n\s*\n/)) {
      if (!linkUrls(para).length) continue;
      const named = [...new Set(V.serviceList.filter(sv => sv.say && !catWords.has(lc(sv.say)) && new RegExp(`\\b${esc(sv.say)}\\b`, 'i').test(scanText(para))).map(sv => lc(sv.say)))]
        .filter((w, _, all) => !all.some(o => o !== w && o.includes(w)));
      if (named.length >= 2) issue('FLAG', 'CB-SERVICES', cbField.label, `The services paragraph lists services (${named.join(', ')}). Link each category with a reason instead: the cards describe the services.`, cbField.ref);
    }
  }
  // MORE-REPEAT: "We also offer" names only services no card names (15 Oct)
  const moreLine = fields.find(f => f.label === 'home_services_more_line');
  if (moreLine) {
    const inCards = new Set(V.serviceList.filter(sv => sv.say && cardFields.some(c => new RegExp(`\\b${esc(sv.say)}\\b`, 'i').test(scanText(c.text)))).map(sv => lc(sv.say)));
    const repeated = [...new Set(V.serviceList.filter(sv => sv.say && inCards.has(lc(sv.say)) && new RegExp(`\\b${esc(sv.say)}\\b`, 'i').test(scanText(moreLine.text))).map(sv => sv.say))];
    if (repeated.length) issue('FLAG', 'MORE-REPEAT', moreLine.label, `"We also offer" names ${repeated.join(', ')}, already in a card. Name only services no card names, or write HIDDEN.`, moreLine.ref);
  }
  // HUB-LINK: the areas FAQ links the Locations Hub when there is one
  if (D.locations_hub) {
    const areasFaq = fields.find(f => f.ref.sub === 'faq_answer' && /which areas/i.test(f.label));
    if (areasFaq && !linkUrls(areasFaq.text).some(u => normUrl(u) === normUrl(D.locations_hub))) {
      issue('FLAG', 'HUB-LINK', areasFaq.label, `Link the Locations Hub (${D.locations_hub}) in this answer.`, areasFaq.ref);
    }
  }

  // ── Code fields (report only; code owns them) ──
  const h1 = record.home_hero_h1 || '';
  if (/[—–]/.test(h1)) issue('BLOCK', '4a', 'home_hero_h1', 'H1 contains an em or en dash.');
  if (/\b[A-Za-z]+-[A-Za-z]+\b/.test(h1)) issue('FLAG', '4a', 'home_hero_h1', 'H1 contains a hyphenated word.');
  if (h1.length > 60) issue('FLAG', '4b', 'home_hero_h1', `H1 is ${h1.length} characters (max 60).`);
  if (V.city && !lc(h1).includes(lc(V.city))) issue('FLAG', '4c', 'home_hero_h1', `H1 doesn't contain the city "${V.city}".`);
  if (!lc(h1).includes(lc(cv.primary_category || '~')) && !lc(h1).includes(lc(niche.trade_person || '~'))) issue('FLAG', '4c', 'home_hero_h1', 'H1 contains neither the primary category nor the trade person word.');
  if (cv.company_name && lc(h1).includes(lc(cv.company_name))) issue('BLOCK', '4d', 'home_hero_h1', 'H1 contains the company name.');
  const mod = (record.seo_title || '').split(' | ').length === 3 ? record.seo_title.split(' | ')[1] : null;
  if (mod) {
    const kw = new Set(lc(`${D.d2_h1} ${niche.trade} ${niche.trade_person} ${niche.trade_person_plural}`).split(/\W+/).filter(w => w.length > 2));
    const clash = lc(mod).split(/\W+/).find(w => kw.has(w));
    if (clash) issue('BLOCK', 'N3', 'seo_title', `The title modifier repeats "${clash}" from the keyword or trade words.`);
  }
  const areaNames = new Set((record.home_areas_links || []).map(a => lc(a.name)));
  for (const t of V.towns) {
    if (isAdminArea(t)) continue; // a council area is left out of the area list (15 Oct)
    const short = lc(t.replace(/\s+\b(District|Borough|Council|County|Authority)\b.*$/i, '').trim());
    if (!areaNames.has(lc(t)) && !areaNames.has(short)) issue('BLOCK', '9', 'home_areas_links', `The area list is missing "${t}".`);
  }

  return issues;
}

// The cross-field checks any page type runs (proof repeats, card patterns, phrase
// repeats, stock phrases, FAQ links, title and meta lengths)
function sharedCrossChecks(record, V, { issues, issue, fields, cb, K }) {
  const { cv, niche, D } = V;
  // PROOF-FIXED (16 Oct, Brandon): the fixed price appears 3 times at most, counting the
  // meta description and its Why point (title and body as one), in any wording; never in a step
  if (/fixed\s+price/i.test(`${cv.differentiator_1 || ''} ${cv.differentiator_2 || ''}`)) {
    const isFixed = x => FIXED_RE.test(scanText(x || ''));
    let count = isFixed(record.meta_description) ? 1 : 0;
    const homes = [count ? 'the meta description' : null];
    const whyIdx = (record.points || []).findIndex(p => isFixed(p.point_title));
    if (whyIdx >= 0) { count++; homes.push(`the "${record.points[whyIdx].point_title}" point`); }
    for (const f of fields) {
      if (f.ref.key === 'points' && f.ref.index === whyIdx) continue;
      if (!isFixed(f.text)) continue;
      if (f.ref.key === 'steps') { issue('BLOCK', 'PROOF-FIXED', f.label, 'A step never repeats the fixed price: it has its homes in the hero and Why choose us. Say what happens at this step.', f.ref); continue; }
      count++;
      if (count <= 3) { homes.push(f.label); continue; }
      issue('BLOCK', 'PROOF-FIXED', f.label, `The fixed price is already on the page 3 times (${homes.filter(Boolean).join(', ')}). Leave it out here, in any wording.`, f.ref);
    }
  }
  // PRICE-FIRST (16 Oct, loop): "a price agreed before work starts" is step 2's idea; once more elsewhere at most
  {
    const others = fields.filter(f => !(f.ref.key === 'steps' && f.ref.index === 1) && f.ref.key !== 'points' && PRICE_FIRST_RE.test(scanText(f.text)));
    others.slice(1).forEach(f => issue('FLAG', 'PRICE-FIRST', f.label, `"A price agreed before work starts" is already said in ${others[0].label} (and it is step 2's point). Make a different point here.`, f.ref));
  }
  // PROOF-QUOTE (25 Oct): the quote method and the price agreed before work are one proof with the
  // homepage's limit: 3 mentions on the page at most, in different words, and never in both the
  // cost FAQ and the visits FAQ
  {
    const methodWords = lc(String(cv.quote_method || '')).split(/[^a-z]+/).filter(w => w.length > 3 && !STOPWORDS.has(w) && !/^(?:then|fixed|price|quote)$/.test(w));
    const methodRe = methodWords.length ? new RegExp(`\\b(?:quote|quotes|price|prices|figure|cost|costed|priced)\\b[^.]{0,60}\\b(?:${methodWords.map(esc).join('|')})\\w*\\b|\\b(?:${methodWords.map(esc).join('|')})\\w*\\b[^.]{0,60}\\b(?:quote|quotes|price|prices|figure|cost|costed|priced)\\b`, 'i') : null;
    const isQuoteMention = sen => PRICE_FIRST_RE.test(sen) || (methodRe && methodRe.test(sen)) || practiceClaims(sen, niche).some(c => c.practice.key === 'price_agreed_before_work');
    let count = 0;
    const homes = [];
    const faqKind = f => f.ref.sub === 'faq_answer' ? (/cost|how much|price/i.test(f.label) ? 'cost' : /regular visits|how often|visits work/i.test(f.label) ? 'visits' : null) : null;
    const seenFaq = new Set();
    for (const f of fields) {
      const n = sentences(f.text).filter(isQuoteMention).length;
      if (!n) continue;
      const kind = faqKind(f);
      if (kind) {
        if ((kind === 'cost' && seenFaq.has('visits')) || (kind === 'visits' && seenFaq.has('cost'))) issue('BLOCK', 'PROOF-QUOTE', f.label, 'The quote method and the price agreed before work are already in the other FAQ answer: never in both the cost answer and the visits answer. Make this answer\'s point without them.', f.ref);
        seenFaq.add(kind);
      }
      count += n;
      if (count > 3) { issue('BLOCK', 'PROOF-QUOTE', f.label, `The quote method or the price agreed before work is already on the page 3 times (${homes.join(', ')}). Leave it out here, in any wording.`, f.ref); continue; }
      homes.push(f.label);
    }
  }
  // PRACTICE-REPEAT (25 Oct): a confirmed practice is stated twice on the page at most, in
  // different words (REPEAT-PAGE and N21 hold the wording to account)
  {
    const confirmedKeys = new Set(cv.confirmed_practices || []);
    const seen = new Map();
    for (const f of fields) {
      for (const sen of sentences(f.text)) {
        for (const c of practiceClaims(sen, niche)) {
          if (!confirmedKeys.has(c.practice.key)) continue;
          const list = seen.get(c.practice.key) || [];
          list.push(f.label);
          seen.set(c.practice.key, list);
          if (list.length === 3) issue('FLAG', 'PRACTICE-REPEAT', f.label, `"${c.practice.label}" is already stated in ${list[0]} and ${list[1]}. A practice is stated twice on the page at most: leave it out here.`, f.ref);
        }
      }
    }
  }
  const proofs = [];
  if (cv.jobs_completed) proofs.push({ name: `${cv.jobs_completed} jobs`, re: new RegExp(`\\b${esc(String(cv.jobs_completed))}\\b\\+?`, 'g') });
  if (cv.insurance_cover) proofs.push({ name: 'the insurance figure', re: new RegExp(`£?\\s?${esc(String(cv.insurance_cover))}\\b`, 'gi') });
  // A confirmed differentiator other than the fixed price (PROOF-FIXED has that), by its
  // most distinctive word: "photo" for "Photos of Every Fault Before We Quote" (16 Oct, loop)
  const GENERIC = new Set('every before with quote quotes quoted job jobs work our and the no hidden costs price prices run local'.split(' '));
  for (const k of ['differentiator_1', 'differentiator_2']) {
    if (!cv[`${k}_confirmed`] || !cv[k] || /fixed\s+price/i.test(cv[k])) continue;
    const word = lc(cv[k]).split(/[^a-z]+/).find(w => w.length > 3 && !GENERIC.has(w) && !STOPWORDS.has(w));
    if (word) proofs.push({ name: cv[k], re: new RegExp(`\\b${esc(word.replace(/(s|es)$/, ''))}`, 'gi'), perField: true });
  }
  for (const p of proofs) {
    let seen = 0;
    for (const f of fields) {
      const n = (scanText(f.text).match(p.re) || []).length;
      if (!n) continue;
      seen += p.perField ? 1 : n;
      if (seen > 3) issue('FLAG', 'PROOF-REPEAT', f.label, `"${p.name}" already appears 3 times earlier on the page. Leave it out here.`, f.ref);
    }
  }
  // CARD-LINK: a linked card carries the link to its own page inside a sentence
  (record.cards || []).forEach((c, i) => {
    if (!c.card_url) return;
    const f = fields.find(x => x.ref.key === 'cards' && x.ref.index === i);
    if (f && !linkUrls(f.text).some(u => normUrl(u) === normUrl(c.card_url))) {
      issue('BLOCK', 'CARD-LINK', f.label, `This card must link to its page ${c.card_url} inside a sentence, e.g. "our [${lc(c.card_name)}](${c.card_url}) work".`, f.ref);
    }
  });

  // CARD-PATTERN: no two cards share a sentence pattern; "we also handle" once on the page (16 Oct, round 3)
  {
    const catRe = new RegExp(`\\b(?:${[...new Set(V.categoryNames.map(lc))].map(esc).join('|') || '\\u0000'})\\b`, 'gi');
    const opener = sen => lc(scanText(sen)).replace(catRe, 'CAT').replace(/[^a-z' ]+/gi, ' ').split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
    const seenOpen = new Map();
    for (const f of fields.filter(x => x.ref.sub === 'card_text')) {
      const mine = new Set(sentences(f.text).map(opener).filter(o => o.split(' ').length === 3));
      const shared = [...mine].find(o => seenOpen.has(o));
      if (shared) issue('FLAG', 'CARD-PATTERN', f.label, `A sentence opens "${shared.replace('CAT', '[category]')}…" like one in ${seenOpen.get(shared)}. Give each card its own sentence shapes.`, f.ref);
      for (const o of mine) if (!seenOpen.has(o)) seenOpen.set(o, f.label);
    }
    let also = 0;
    for (const f of fields) {
      const n = (lc(scanText(f.text)).match(/\bwe also (?:handle|offer|cover|do|carry out|provide|take on)\b/g) || []).length;
      also += n;
      if (n && also > 1) issue('FLAG', 'CARD-PATTERN', f.label, '"We also handle" (or "we also offer", "we also cover") is already used once on the page. Say it another way.', f.ref);
    }
  }
  // N13: two cards opening with the same three words
  const cardFields = fields.filter(f => f.ref.sub === 'card_text');
  void cardFields;
  const openers = new Map();
  for (const f of cardFields) {
    const k = words(f.text).slice(0, 3).map(w => lc(w).replace(/\W/g, '')).join(' ');
    if (openers.has(k)) issue('FLAG', 'N13', f.label, `Opens with the same three words as ${openers.get(k)}. Start differently.`, f.ref);
    else openers.set(k, f.label);
  }
  // CARD-FILLER: the city in more than two cards reads as filler ("across Southampton") (15 Oct)
  if (V.city) {
    const withCity = cardFields.filter(f => new RegExp(`\\b${esc(lc(V.city))}\\b`).test(lc(scanText(f.text))));
    withCity.slice(2).forEach(f => issue('FLAG', 'CARD-FILLER', f.label, `${withCity.length} cards mention ${V.city} ("across ${V.city}"). Keep it to two at most; cards say what the service does, not where.`, f.ref));
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
  const finalF = fields.find(f => f.ref.key === K.finalCta);
  const closing = cb ? (sentences(cb.text).slice(-1)[0] || '') : '';
  if (finalF && D.cta_band && D.cta_band.line && firstTwo(finalF.text) === firstTwo(D.cta_band.line)) issue('FLAG', 'N14', finalF.label, 'Opens with the same two words as the CTA band line.', finalF.ref);
  if (finalF && closing && firstTwo(finalF.text) === firstTwo(closing)) issue('FLAG', 'N14', finalF.label, 'Opens with the same two words as the content block closing line.', finalF.ref);

  // N21: a five word run shared by two fields (the later field is rewritten)
  const grams = f => {
    const w = scanText(f.text).replace(REQUIRED, ' ').replace(/CVTOKEN/g, ' ').toLowerCase().replace(/[^a-z0-9£ ]+/g, ' ').split(/\s+/).filter(Boolean);
    const out = new Set();
    for (let i = 0; i + 5 <= w.length; i++) out.add(w.slice(i, i + 5).join(' '));
    return out;
  };
  // Wording the rules require in several places isn't a repeat (16 Oct)
  const REQUIRED = /inland and along the coast|reasonable care and skill/g;
  const seenGrams = new Map();
  for (const f of fields) {
    const g = grams(f);
    const shared = [...g].find(x => seenGrams.has(x));
    if (shared) issue('FLAG', 'N21', f.label, `Repeats "${shared}" from ${seenGrams.get(shared)}. Reword it.`, f.ref);
    for (const x of g) if (!seenGrams.has(x)) seenGrams.set(x, f.label);
  }
  // REPEAT-PAGE (16 Oct): a four word phrase ("before any work begins") in more than two
  // fields. Word forms are folded so "before work starts" and "before any work begins" match.
  {
    const FOLD = { starts: 'begins', start: 'begins', started: 'begins', begin: 'begins', began: 'begins', starting: 'begins',
      commences: 'begins', agreed: 'agree', agrees: 'agree', booked: 'book', confirmed: 'confirm' };
    const DROP = new Set(['any', 'the', 'a', 'an']);
    const seenIn = new Map();
    const flagged = new Set();
    for (const f of fields) {
      const toks = lc(scanText(f.text)).replace(/inland and along the coast|reasonable care and skill/g, ' ').replace(/cvtoken/g, ' ').replace(/[^a-z0-9£' ]+/g, ' ').split(/\s+/)
        .filter(w => w && !DROP.has(w)).map(w => FOLD[w] || w);
      const mine = new Set();
      for (let i = 0; i + 3 <= toks.length; i++) {
        const g = toks.slice(i, i + 3);
        if (g.filter(w => !STOPWORDS.has(w)).length < 2) continue;
        mine.add(g.join(' '));
      }
      for (const g of mine) {
        const list = seenIn.get(g) || [];
        list.push(f.label);
        seenIn.set(g, list);
        if (list.length === 3 && !flagged.has(f.label) && flagged.add(f.label)) issue('FLAG', 'REPEAT-PAGE', f.label, `"${g}" (or a close form of it) is already in ${list.slice(0, 2).join(' and ')}. A phrase is used twice on the page at most: say it differently or leave it out.`, f.ref);
      }
    }
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
  // 6c: at least one FAQ answer carries a link
  if (!fields.some(f => f.ref.sub === 'faq_answer' && linkUrls(f.text).length)) issue('FLAG', '6c', 'faq_items', 'No FAQ answer carries a link.');

  if ((record.seo_title || '').length > 60) issue('FLAG', '7', 'seo_title', `SEO title is ${record.seo_title.length} characters (max 60).`);
  if ((record.meta_description || '').length > 155) issue('FLAG', '8', 'meta_description', `Meta description is ${record.meta_description.length} characters (max 155).`);
  return issues;
}

function summarise(issues) {
  return {
    block: issues.filter(i => i.type === 'BLOCK').length,
    flag: issues.filter(i => i.type === 'FLAG').length,
  };
}

module.exports = {
  validateV20, validateCommon, sharedCrossChecks, buildValidationContext, modelFields, getField, setField, summarise, wordCount, RANGES, RETRY_FLAGS, BANNED, STOCK, HOMEPAGE_KEYS,
  // Text helpers for a page type's own checks
  helpers: { esc, stripLinks, linkUrls, normUrl, scanText, words, sentences, lc, stem, STOPWORDS, contentWords, packIndex, packCopy },
};
