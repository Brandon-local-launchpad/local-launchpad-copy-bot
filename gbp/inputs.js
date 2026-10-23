'use strict';

// ── GBP job inputs ───────────────────────────────────────────────────────────
// Everything the three GBP prompts need, from the client values, the v3 page map rows,
// the hand set-up (as keyValueMap: category_N, biz_area_N), the WordPress site URL and
// the generated service page copy. Code decides here; the model only writes prose:
//   - locked services: every service page, under ONE GBP category (its home: the first
//     parent tab whose niche core list names it, else its first parent, as the homepage
//     cards do), with its page URL
//   - confirmed services with no page (the category rows' "mentioned" lists): variant
//     candidates the model may add
//   - core services for the description: the category cards' services, page map order,
//     6 to 8 of them
//   - proof points, years, accreditations, prices and timeframes: from confirmed client
//     values only. Nothing is invented here or in the prompts.

const lc = s => String(s == null ? '' : s).toLowerCase().trim();
const norm = s => lc(s).replace(/\s+/g, ' ');

// tradeFacts: { niche, verified, properNouns: [words] } from the niche's trade facts pack
// (trade-facts/pack.js packProperNouns). Its names join the proper noun list only when the
// pack is verified; otherwise the client record alone decides, and the run says so.
function buildGbpInputs({ cv = {}, niche = {}, rows = [], keyValueMap = {}, siteUrl = '', serviceCopy = [], tradeFacts = null }) {
  const live = (rows || []).filter(r => r.applies !== false);
  const cats = live.filter(r => r.type === 'category');
  const catName = new Map(cats.map(c => [c.info && c.info.category_key, c.title]));
  const catOrder = cats.map(c => c.title);
  const core = Object.fromEntries(Object.entries(niche.core_services || {}).map(([k, v]) => [lc(k), (v || []).map(lc)]));
  const flags = [];

  const base = String(siteUrl || '').trim().replace(/\/+$/, '');
  if (!base) flags.push({ code: 'GBP-NO-SITE-URL', msg: 'No WordPress site URL is saved for this client; the service and product URLs are page paths. Save the connection and run again for full URLs.' });
  const urlOf = slug => (base && slug ? base + (slug.startsWith('/') ? slug : '/' + slug) : slug || '');

  // Locked services: one row per service page, under its home category
  const services = live.filter(r => r.type === 'service');
  const locked = [];
  for (const s of services) {
    const parents = ((s.info && s.info.parent_keys) || []).map(k => catName.get(k)).filter(Boolean);
    const home = parents.find(p => (core[lc(p)] || []).includes(lc(s.title))) || parents[0] || catOrder[0] || '';
    if (!parents.length) flags.push({ code: 'GBP-NO-PARENT', msg: `"${s.title}" has no parent category in the page map; it is listed under "${home}".` });
    locked.push({ category: home, service: s.title, slug: s.slug || '', url: urlOf(s.slug || ''), parents, copyPriority: (s.info && s.info.copy_priority) || 0, phase: (s.info && s.info.phase) || 1 });
  }
  locked.sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category));

  // Confirmed, no page of their own (folded into a category page). Names that differ only
  // by a plural, the word order or the words custom, bespoke, services or work are one
  // service (gbp/validator.js nameKey), so only the first spelling is offered
  const { nameKey } = require('./validator');
  const lockedNames = new Set(locked.map(l => norm(l.service)));
  const lockedKeys = new Set(locked.map(l => nameKey(l.service)));
  const confirmedNoPage = [];
  const seenNoPage = new Set();
  for (const c of cats) for (const name of (((c.info || {}).links || {}).mentioned || [])) {
    const k = nameKey(name);
    if (lockedNames.has(norm(name)) || lockedKeys.has(k) || seenNoPage.has(k)) continue;
    seenNoPage.add(k);
    confirmedNoPage.push({ category: c.title, service: name });
  }

  // Core services for the description: the cards' services, one from each category in turn
  // (so every category is represented), then the rest by copy priority
  const cardNames = [];
  const cardLists = cats.map(c => (((c.info || {}).links || {}).cards || []).filter(n => lockedNames.has(norm(n))));
  for (let i = 0; cardLists.some(l => i < l.length); i++) for (const l of cardLists) if (l[i] && !cardNames.some(x => norm(x) === norm(l[i]))) cardNames.push(l[i]);
  const byPriority = [...locked].sort((a, b) => b.copyPriority - a.copyPriority).map(l => l.service);
  const coreServices = [];
  for (const n of [...cardNames, ...byPriority]) { if (coreServices.length >= 8) break; if (!coreServices.some(x => norm(x) === norm(n))) coreServices.push(n); }

  // Categories and areas
  const categories = catOrder.length ? catOrder : Object.entries(keyValueMap).filter(([k]) => /^category_\d+$/.test(k)).map(([, v]) => v);
  const primary = String(cv.primary_category || '').trim() || categories[0] || '';
  const secondaries = categories.filter(c => norm(c) !== norm(primary));
  // The description names at most three secondaries (Brandon, 23 Oct): the ones tied to the
  // services the client wants most, in jobs_wanted order (a wanted job names a category, or a
  // service whose home category counts), then page map order to make three. The rest are
  // not named; their services are.
  const wanted = (Array.isArray(cv.jobs_wanted) ? cv.jobs_wanted : []).map(w => String(w || '').trim()).filter(Boolean);
  const namedSecondaries = [];
  const pick = c => { if (c && secondaries.some(s => norm(s) === norm(c)) && !namedSecondaries.some(s => norm(s) === norm(c)) && namedSecondaries.length < 3) namedSecondaries.push(secondaries.find(s => norm(s) === norm(c))); };
  for (const w of wanted) {
    pick(secondaries.find(s => norm(s) === norm(w)));
    const svc = locked.find(l => norm(l.service) === norm(w)) || locked.find(l => norm(l.service).includes(norm(w)) || norm(w).includes(norm(l.service)));
    if (svc) pick(svc.category);
  }
  for (const s of secondaries) pick(s);
  const unnamedSecondaries = secondaries.filter(s => !namedSecondaries.some(n => norm(n) === norm(s)));
  const areas = Object.entries(keyValueMap).filter(([k]) => /^biz_area_\d+$/.test(k))
    .sort((a, b) => parseInt(a[0].split('_')[2], 10) - parseInt(b[0].split('_')[2], 10)).map(([, v]) => String(v || '').trim()).filter(Boolean);
  const town = areas[0] || '';
  const otherAreas = areas.slice(1, 7);

  // Facts from confirmed client values
  const years = yearsLine(cv);
  const accreditations = accreditationsLine(cv);
  const packNouns = tradeFacts && tradeFacts.verified ? (tradeFacts.properNouns || []) : [];
  if (tradeFacts && !tradeFacts.verified) flags.push({ code: 'GBP-PACK-UNVERIFIED', msg: `The trade facts pack${tradeFacts.niche ? ` for "${tradeFacts.niche}"` : ''} is ${tradeFacts.exists === false ? 'missing' : 'not verified'}, so the proper nouns for the GBP lower casing come from the client record alone.` });
  const properPhrases = properNouns(cv, [...areas, ...categories, ...packNouns]);
  const proofPointList = proofPointsFor(cv, niche, { properPhrases });
  const proofPoints = proofPointList.map(p => p.text);
  // The description names each core service beside its own category (Pergolas is Deck Builder work, never paving)
  const coreByCategory = categories.map(c => ({ category: c, services: coreServices.filter(n => (locked.find(l => norm(l.service) === norm(n)) || {}).category === c) })).filter(x => x.services.length);
  const showPrices = lc(cv.show_prices) === 'yes';
  const jobs = Array.isArray(cv.typical_jobs) ? cv.typical_jobs : [];
  const prices = showPrices ? jobs.filter(j => j && j.job && (j.price || j.from_price)).map(j => `${j.job}: from ${j.price || j.from_price}`) : [];
  const timeframes = jobs.filter(j => j && j.job && j.duration).map(j => ({ job: j.job, duration: j.duration }));
  const competitorCount = parseInt(cv.competitor_service_count, 10);
  const minServices = Math.max(20, Number.isFinite(competitorCount) ? competitorCount + 1 : 0);
  if (!Number.isFinite(competitorCount)) flags.push({ code: 'GBP-NO-COMPETITOR-COUNT', msg: 'competitor_service_count is blank; the minimum is 20 services.' });

  // What's included, per locked service, from the generated service page copy
  const copies = (serviceCopy || []).map(c => ({ title: c.page_title || c.title || '', slug: c.url_slug || c.slug || '', copy: c.copy_output || c.copy || '' })).filter(c => c.copy);
  const included = {};
  let missingCopy = 0;
  for (const l of locked) {
    const c = copies.find(x => (x.slug && norm(x.slug) === norm(l.slug)) || norm(x.title) === norm(l.service) || norm(x.title) === norm(`${l.service} ${town}`));
    if (c) included[l.service] = whatsIncluded(c.copy, { cv, keyValueMap, town });
    else missingCopy++;
  }
  if (missingCopy) flags.push({ code: 'GBP-NO-SERVICE-COPY', msg: `${missingCopy} of ${locked.length} service pages have no generated copy yet; those products use the GBP service description for what's included.` });

  return {
    name: String(cv.company_name || '').trim(), primary, secondaries, namedSecondaries, unnamedSecondaries, categories, town, otherAreas, areas,
    locked, confirmedNoPage, coreServices, coreByCategory,
    years, accreditations, proofPoints, showPrices, prices, timeframes,
    competitorCount: Number.isFinite(competitorCount) ? competitorCount : null, minServices,
    included, siteUrl: base, flags,
    validatorCtx: { locked: locked.map(l => ({ category: l.category, service: l.service })), minServices, competitorCount: Number.isFinite(competitorCount) ? competitorCount : null, showPrices, towns: areas, categories: [...new Set([primary, ...categories].filter(Boolean))], proofPoints: proofPointList, properNouns: properPhrases.filter(p => !/\s/.test(p)).map(p => p.toLowerCase()), properPhrases, primaryCategory: primary, cv },
    properNounSource: tradeFacts && tradeFacts.verified ? `client record and the ${tradeFacts.niche || ''} trade facts pack`.replace(/\s+/g, ' ') : 'client record only',
  };
}

// "trading since 2015 (11 years)", "12 years trading" or "none"
function yearsLine(cv) {
  const founded = parseInt(cv.year_founded, 10);
  const yt = parseInt(cv.years_trading, 10);
  if (Number.isFinite(founded)) { const n = new Date().getFullYear() - founded; return `founded ${founded}${n > 0 ? ` (${n} years trading)` : ''}`; }
  if (Number.isFinite(yt)) return `${yt} years trading`;
  return 'none';
}

function moneyFor(v) {
  const s = String(v || '').trim().replace(/^£/, '');
  if (!s) return '';
  if (/^\d+(\.\d+)?\s*m$/i.test(s)) return `£${s.replace(/\s+/g, '')}`;
  if (/^\d+(\.\d+)?\s*million$/i.test(s)) return `£${s.replace(/\s*million$/i, 'm')}`;
  if (/^\d{4,}$/.test(s)) return `£${Number(s).toLocaleString('en-GB')}`;
  return `£${s}`;
}

function accreditationsLine(cv) {
  const parts = [];
  const logos = (Array.isArray(cv.verified_logos) ? cv.verified_logos : []).map(l => (typeof l === 'string' ? l : l && (l.name || l.label)) || '').filter(Boolean);
  if (logos.length) parts.push(`memberships and accreditations: ${logos.join(', ')}`);
  if (cv.insurance_cover) parts.push(`public liability insurance up to ${moneyFor(cv.insurance_cover)}`);
  if (cv.guarantee_years) parts.push(`${cv.guarantee_years} year guarantee${cv.guarantee_scope ? ` on ${cv.guarantee_scope}` : ''}`);
  if (cv.manufacturer_warranty) parts.push(`manufacturer warranty: ${cv.manufacturer_warranty}`);
  if (lc(cv.waste_carrier_registered) === 'yes') parts.push('registered waste carrier');
  return parts.length ? parts.join('; ') : 'none';
}

// Proof points from confirmed client values, each with a detector the validator uses to
// count how many service descriptions carry it (no proof point in more than a quarter;
// Brandon, 23 Oct). Opening hours are not a proof point. Materials have no detector: they
// are facts the copy may name, not a phrase that repeats.
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'with', 'for', 'our', 'we', 'your', 'you', 'is', 'are', 'be', 'any', 'all', 'from', 'at', 'by', 'no', 'not', 'up', 'out', 'every', 'before', 'with', 'within']);
const stem = w => w.replace(/(ies|es|s|ing|ed)$/, '').slice(0, 5);
// True when at least half of the phrase's content words (stemmed) are in the text
function wordsDetect(phrase) {
  const stems = [...new Set(String(phrase).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w)).map(stem))];
  const need = Math.max(1, Math.ceil(stems.length / 2));
  return t => stems.filter(s => String(t).toLowerCase().includes(s)).length >= need;
}
const reDetect = re => t => re.test(String(t));
const escapeRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Proof points read as prose, so they are lower case except proper nouns and acronyms
// (Brandon, round 3): "Family Run and Independent" → "family run and independent";
// "Checkatrade approved" keeps Checkatrade. Proper nouns: the company name, the areas,
// the verified logos, the materials and the GBP categories, as the client record spells them.
// Every name is a phrase ("Edens Edge Landscaping", "Hedge End", "Paving Contractor",
// "Indian sandstone"), matched whole, so "Contractor" alone in a proof point is not
// protected by the category. Returns the phrases as the record spells them.
function properNouns(cv = {}, extra = []) {
  const phrases = new Map();
  const take = v => { const s = String(v || '').trim(); if (s && /[A-Z]/.test(s) && !phrases.has(s.toLowerCase())) phrases.set(s.toLowerCase(), s); };
  take(cv.company_name);
  (Array.isArray(cv.verified_logos) ? cv.verified_logos : []).forEach(l => take(typeof l === 'string' ? l : l && (l.name || l.label)));
  (Array.isArray(cv.materials_methods) ? cv.materials_methods : []).forEach(take);
  extra.forEach(take);
  return [...phrases.values()];
}
// Lower case except acronyms and the proper noun phrases, which take the record's own
// spelling where they occur ("Indian Sandstone Patios" → "Indian sandstone patios")
function lowerExceptProper(text, phrases = []) {
  const { escapeRe } = require('./validator');
  let s = String(text || '').split(/(\s+)/).map(w => {
    const core = w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    return core && /^[A-Z0-9]{2,}$/.test(core) ? w : w.toLowerCase();   // acronym: RHS, VAT
  }).join('');
  for (const p of [...phrases].filter(Boolean).sort((a, b) => b.length - a.length)) {
    s = s.replace(new RegExp(`(?<![A-Za-z0-9])${escapeRe(p).replace(/\\?\s+/g, '\\s+')}(?![A-Za-z0-9])`, 'gi'), p);
  }
  return s;
}

function proofPointsFor(cv, niche, { properPhrases = [] } = {}) {
  const out = [];
  const phrases = properNouns(cv, properPhrases);
  const add = (text, detect) => { if (text) { const t = lowerExceptProper(text, phrases); out.push({ text: t, detect: detect || wordsDetect(t) }); } };
  if (lc(cv.free_quotes) === 'yes') add(lc(cv.free_inspection) === 'yes' ? 'free inspection and quote before any work' : 'free quotes', reDetect(/\bfree\b[^.]{0,30}\b(quote|quotation|visit|inspection|estimate)|\b(quote|quotation|visit|inspection|estimate)s?\b[^.]{0,20}\b(is|are|come|comes) free|no (obligation|charge)/i));
  if (cv.quote_method) add(`quotes: ${cv.quote_method}`);
  if (cv.quote_includes) add(`every quote includes ${cv.quote_includes}`);
  if (cv.deposit_terms) add(`payment terms: ${cv.deposit_terms}`, reDetect(/\bdeposit|balance on completion|\bpayment/i));
  if (cv.differentiator_1_confirmed) add(cv.differentiator_1_sentence || cv.differentiator_1);
  if (cv.differentiator_2_confirmed) add(cv.differentiator_2_sentence || cv.differentiator_2);
  if (cv.jobs_completed) add(`${cv.jobs_completed} jobs completed`, reDetect(new RegExp(`\\b${escapeRe(String(cv.jobs_completed))}\\b[^.]{0,20}\\b(jobs?|gardens?|projects?|customers?)|jobs completed`, 'i')));
  if (cv.rating && cv.review_count) add(`rated ${cv.rating} from ${cv.review_count} reviews`, reDetect(/\brated\b|\brating\b|\breviews?\b|\bstars?\b/i));
  if (cv.team_size) add(`a team of ${cv.team_size}`, reDetect(/\bteam of\b|\b(two|three|four|five|six|seven|eight|nine|ten|\d+) of us\b/i));
  if (cv.response_time) add(`replies ${cv.response_time}`, reDetect(/\brepl(y|ies|ied)\b|\brespond|\bget back\b/i));
  if (cv.start_time) add(`work starts ${cv.start_time}`, reDetect(new RegExp(escapeRe(cv.start_time), 'i')));
  if (lc(cv.same_day_available) === 'yes') add('same day visits available', reDetect(/same day/i));
  if (lc(cv.out_of_hours_available) === '24/7') add('available 24 hours a day, 7 days a week', reDetect(/24 hours|24\/7|round the clock|any hour|day or night/i));
  else if (lc(cv.out_of_hours_available) === 'yes') add('out of hours visits available', reDetect(/out of hours|\bevenings?\b|\bweekends?\b/i));
  if (Array.isArray(cv.materials_methods) && cv.materials_methods.length) out.push({ text: `materials and methods used: ${cv.materials_methods.join(', ')}`, detect: null });
  try {
    const { confirmedPractices } = require('../practices');
    for (const p of confirmedPractices(cv, niche || {})) add(p.claim, Array.isArray(p.detect) && p.detect.length ? reDetect(new RegExp(p.detect.join('|'), 'i')) : null);
  } catch (_) { /* practices.js reads the niche; without one there are no practice claims */ }
  return out;
}

// The part of a generated service page that says what the work includes: the intro
// and middle sections when the copy has the CORE (16) headings, else the first
// paragraphs. GHL tokens are written out or dropped, markdown stripped, 1500 characters.
function whatsIncluded(copy, { cv = {}, keyValueMap = {}, town = '' } = {}) {
  let t = String(copy || '');
  // Sections: keep INTRO PARAGRAPH to the FAQ SECTION when they exist
  const start = t.search(/^#+\s*\d*\.?\s*INTRO PARAGRAPH/im);
  if (start >= 0) {
    const rest = t.slice(start);
    const end = rest.search(/^#+\s*\d*\.?\s*(FAQ SECTION|CONTACT SECTION)/im);
    t = end > 0 ? rest.slice(0, end) : rest;
  }
  t = t.replace(/\{\{\s*custom_values\.([a-z0-9_]+)\s*\}\}/gi, (m, key) => {
    const k = key.toLowerCase();
    if (keyValueMap[k]) return keyValueMap[k];
    if (k === 'company_name' || k === 'business_name') return cv.company_name || '';
    if (/phone|email/.test(k)) return '';
    return cv[k] && typeof cv[k] === 'string' ? cv[k] : '';
  });
  t = t.replace(/\[INSERT[^\]]*\]/g, '').replace(/^#+[^\n]*$/gm, '').replace(/\*\*|__|`/g, '').replace(/^\s*[-*]\s+/gm, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  t = t.split('\n').map(l => l.trim()).filter(l => l && !/^(eyebrow|headline|subheadline|cta button label|label|h2|h3)\s*:/i.test(l)).join('\n').replace(/\n{2,}/g, '\n');
  if (t.length > 1500) { const cut = t.lastIndexOf('. ', 1500); t = t.slice(0, cut > 600 ? cut + 1 : 1500); }
  return t.trim();
}

// ── The message blocks ──
const list = a => (a && a.length ? a.join(', ') : 'none');

function descriptionMessage(I) {
  return [
    'FACTS',
    `- Business name: ${I.name || 'none'}`,
    `- Primary category (name it in the first sentence): ${I.primary || 'none'}`,
    `- Secondary categories to name (these only, at most three across the whole description): ${list(I.namedSecondaries)}`,
    `- Other secondary categories (never name these; name their services instead): ${list(I.unnamedSecondaries)}`,
    `- Main town: ${I.town || 'none'}`,
    `- Other areas served: ${list(I.otherAreas)}`,
    `- Core services by category (name each only beside its category): ${I.coreByCategory.length ? I.coreByCategory.map(x => `${x.category}: ${x.services.join(', ')}`).join('; ') : list(I.coreServices)}`,
    `- Years trading / founded: ${I.years}`,
    `- Accreditations, memberships, insurance: ${I.accreditations}`,
    `- Other proof points: ${list(I.proofPoints)}`,
  ].join('\n');
}

function servicesMessage(I) {
  const L = [
    `BUSINESS: ${I.name || 'none'}, a ${I.primary || 'local service business'} in ${I.town || 'the UK'}, UK.`,
    '',
    'LOCKED SERVICES (from the page map; keep every one, exact name, under the category shown):',
    ...I.locked.map(l => `${l.category}: ${l.service}`),
  ];
  if (I.confirmedNoPage.length) L.push('', 'CONFIRMED, NO PAGE (the business offers these too; add them as VARIANT under the category shown where they fit):', ...I.confirmedNoPage.map(c => `${c.category}: ${c.service}`));
  L.push('', `COMPETITOR TARGET: the top 5 competitors list ${I.competitorCount === null ? 'an unknown number of' : I.competitorCount} services on average. Beat it: at least ${I.minServices} services in total (locked plus variants), each appearing once.`);
  L.push('', `PROOF POINTS (use only these; each in at most a quarter of the descriptions, most descriptions without one; opening hours are never one): ${list(I.proofPoints)}`);
  L.push('', `TOWN to name once in each description: ${I.town || 'none'}. Vary where it sits: sometimes the first sentence, sometimes the middle, sometimes the last. Do not end most descriptions with a sentence that starts with the service name.`);
  return L.join('\n');
}

// batch: the locked services this call covers; categoryOf: service → category from the Services output
function productsMessage(I, batch, categoryOf) {
  const L = [
    `BUSINESS: ${I.name || 'none'}, a ${I.primary || 'local service business'} in ${I.town || 'the UK'}, UK.`,
    '',
    `Areas served (name these and no others): ${list([I.town, ...I.otherAreas.slice(0, 5)].filter(Boolean))}`,
    `Proof points (use only these; opening hours are never one): ${list(I.proofPoints)}`,
    `Show prices: ${I.showPrices ? (I.prices.length ? `yes. Approved figures: ${I.prices.join('; ')}` : 'yes, but no approved figures are on file, so name none') : 'no'}`,
    '',
    'SERVICES (one product each):',
  ];
  for (const l of batch) {
    const tf = I.timeframes.find(t => norm(t.job) === norm(l.service) || norm(l.service).includes(norm(t.job)) || norm(t.job).includes(norm(l.service)));
    L.push('', `Service: ${l.service}`, `Category: ${categoryOf(l.service) || l.category}`, `What's included: ${I.included[l.service] || `(no page copy yet) ${l.gbpDescription || ''}`.trim()}`, `Typical timeframe: ${tf ? tf.duration : 'none'}`, `Page URL: ${l.url || 'none'}`);
  }
  return L.join('\n');
}

module.exports = { buildGbpInputs, descriptionMessage, servicesMessage, productsMessage, whatsIncluded, proofPointsFor, wordsDetect, lowerExceptProper, properNouns, accreditationsLine, yearsLine, moneyFor };
