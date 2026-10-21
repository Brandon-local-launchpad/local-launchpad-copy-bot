'use strict';

// ── Homepage v20 code-decision engine ────────────────────────────────────────
// Runs gates G-H1, G-MAP, G-NICHE, G-DATA, G-INPUT and decisions D1–D16.
// No model calls. Returns { gates, flags, decisions, decisionsBlock }.

const CURRENT_YEAR = new Date().getFullYear();
const { isAdminArea } = require('./client-files');
const FALLBACK_ORDER = ['faq_C', 'faq_D', 'faq_E'];

function cap(s) { return (s && s.length) ? s[0].toUpperCase() + s.slice(1) : (s || ''); }
function titleCase(s) { return (s || '').replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1)); }
// Handle both old string[] and new {theme,approved}[] formats
function approvedThemes(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(t => typeof t === 'string' ? true : t.approved)
    .map(t => typeof t === 'string' ? t : t.theme);
}

// Strip admin suffixes so "New Forest District" → "New Forest"
function stripAdmin(name) {
  return (name || '').replace(/\s+\b(District|Borough|Council|County Council|County|Authority|City of)\b.*$/i, '').trim();
}

function normArea(name) { return (name || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim(); }

// Resolve [PLACEHOLDER] tokens using context object
function ph(text, ctx) {
  if (!text) return text;
  const qf = ctx.quoteFree;
  return text
    .replace(/\[QUOTE_FREE\] /g,        qf ? qf + ' ' : '')
    .replace(/\[QUOTE_FREE\]/g,          qf || '')
    .replace(/\[QUOTE_FREE_LOWER\] /g,   qf ? qf.toLowerCase() + ' ' : '')
    .replace(/\[QUOTE_FREE_LOWER\]/g,    qf ? qf.toLowerCase() : '')
    .replace(/\[KW_PHRASE\]/g,           ctx.kwPhrase || '')
    .replace(/\[CATEGORY\]/g,            titleCase(ctx.category || ''))
    .replace(/\[CITY\]/g,                ctx.city || '')
    .replace(/\[TRADE\]/g,               ctx.trade || '')
    .replace(/\[TRADE_LOWER\]/g,         ctx.tradeLower || '')
    .replace(/\[TRADE_PERSON\]/g,        ctx.tradePerson || '')
    .replace(/\[TRADE_PERSON_PLURAL\]/g, ctx.tradePersonPlural || '')
    .replace(/\[CUSTOMER_TYPE\]/g,       ctx.customerType || '')
    .replace(/\[UNIT_OF_WORK\]/g,        ctx.unitOfWork || '')
    .replace(/\[PRIMARY_ACTION\]/g,      ctx.primaryAction || '')
    .replace(/\[AREA_WIDE\]/g,           ctx.areaWide || '')
    .replace(/\[CV: company_name\]/g,    ctx.companyName || '');
}

// Determine link status for a page row
function getLinkStatus(page) {
  const s = (page.status || '').toLowerCase();
  if (s === 'live' || s === 'done') return 'Live';
  // Explicitly marked not-built, or no URL slug → Not built
  if (s === 'not built' || s === 'not_built' || !(page.urlSlug || '').trim()) return 'Not built';
  // Location pages with admin-area title keywords → Not built
  if (page.pageType === 'location' && /\b(District|Borough|Council|Authority)\b/i.test(page.pageTitle || '')) return 'Not built';
  return 'Launching';
}

function isLinkable(page) { const ls = getLinkStatus(page); return ls === 'Live' || ls === 'Launching'; }

// ── Build Why-choose-us points (D10) ─────────────────────────────────────────
function buildWhyPoints(cv, niche, yearsTrading, trustProof, ctx) {
  const points = [];

  // P1: track record
  let p1 = null;
  if (yearsTrading !== null && yearsTrading >= 5) {
    const title = ctx.areaWide
      ? `${yearsTrading}+ Years in ${ctx.areaWide}`
      : `${yearsTrading}+ Years Trading`;
    p1 = { title, proof: 'years' };
  } else if (cv.jobs_completed && parseInt(cv.jobs_completed, 10) > 0) {
    p1 = { title: `${cv.jobs_completed}+ ${cap(ctx.unitOfWork)} Completed`, proof: 'jobs' };
  }
  if (p1) {
    if (p1.proof === trustProof && niche.why_titles_alt && niche.why_titles_alt[0]) {
      p1 = { ...p1, title: niche.why_titles_alt[0] };
    }
    points.push({ key: 'track_record', title: p1.title, proof: p1.proof });
  }

  // P2: cover (first confirmed in cover_chain)
  let p2 = null;
  for (const proof of (niche.cover_chain || [])) {
    if (proof === 'guarantee'             && cv.guarantee_years       && parseInt(cv.guarantee_years, 10) > 0) {
      p2 = { title: `${cv.guarantee_years} Year Workmanship Guarantee`, proof };
      break;
    }
    if (proof === 'manufacturer_warranty' && cv.manufacturer_warranty) {
      p2 = { title: cv.manufacturer_warranty, proof };
      break;
    }
    if (proof === 'insurance'             && cv.insurance_cover) {
      p2 = { title: `Insured up to £${cv.insurance_cover}`, proof };
      break;
    }
  }
  if (p2) {
    if (p2.proof === trustProof && niche.why_titles_alt && niche.why_titles_alt[1]) {
      p2 = { ...p2, title: niche.why_titles_alt[1] };
    }
    points.push({ key: 'cover', title: p2.title, proof: p2.proof });
  }

  // P3: differentiator_1 if confirmed
  if (cv.differentiator_1_confirmed && cv.differentiator_1) {
    points.push({ key: 'differentiator_1', title: cv.differentiator_1, proof: 'diff1' });
  }

  // P4: first approved review theme; else differentiator_2 if confirmed
  const themes = approvedThemes(cv.review_themes);
  if (themes.length > 0) {
    points.push({ key: 'review_theme', title: themes[0], proof: 'theme' });
  } else if (cv.differentiator_2_confirmed && cv.differentiator_2) {
    points.push({ key: 'differentiator_2', title: cv.differentiator_2, proof: 'diff2' });
  }

  return points;
}

// ── Build FAQ (D11) ──────────────────────────────────────────────────────────
// faqResearch: the client's approved research questions for the homepage, in order
// (faq-sort.js homepageQuestions). They take Q7 and any fallback slot (Q2 to Q4
// when the client value is missing) before the niche's own questions. Q7 prefers a
// doubt the fixed questions don't cover; a fallback slot takes a research question
// only with its own doubt or one still uncovered, so the page keeps all five doubts.
function buildFaq(cv, niche, ctx, emergencyOn, faqResearch = []) {
  const faqMap = {};
  for (const f of (niche.faq_slots || [])) faqMap[f.slot] = f;

  const usedFallbacks = [];
  function nicheFallback() {
    for (const slot of FALLBACK_ORDER) {
      if (!usedFallbacks.includes(slot) && faqMap[slot]) {
        usedFallbacks.push(slot);
        return faqMap[slot];
      }
    }
    return null;
  }

  const guaranteed = (cv.guarantee_years && parseInt(cv.guarantee_years, 10) > 0) || !!cv.manufacturer_warranty;
  const need = {
    Q2: !cv.insurance_cover && !cv.complaints_process,
    Q3: !guaranteed && !faqMap['faq_3_none'],
    Q4: !cv.start_time,
  };
  const SLOT_DOUBT = { Q2: 'Trust', Q3: 'Trust', Q4: 'Timing' };
  const covered = new Set(['Price', 'Fit']); // Q1 and Q5, Q6
  if (!need.Q2 || !need.Q3) covered.add('Trust');
  if (!need.Q4) covered.add('Timing');
  if (faqMap['faq_B']) covered.add(faqMap['faq_B'].doubt);
  if (niche.big_ticket && cv.handles_planning === 'yes' && faqMap['faq_planning']) covered.add(faqMap['faq_planning'].doubt);

  const pool = [...(faqResearch || [])];
  function takeResearch(prefer, strict = false) {
    if (!pool.length) return null;
    let i = -1;
    for (const d of prefer) { i = pool.findIndex(q => q.doubt === d); if (i >= 0) break; }
    if (i < 0 && strict) return null;
    const q = pool.splice(i >= 0 ? i : 0, 1)[0];
    covered.add(q.doubt);
    return { question: q.question, doubt: q.doubt, answer_brief: q.answer_brief, research_id: q.research_id, source: 'research' };
  }
  const uncovered = () => ['Price', 'Trust', 'Fit', 'Process', 'Timing'].filter(d => !covered.has(d));
  const research = {};
  research.Q7 = takeResearch(uncovered());
  for (const s of ['Q2', 'Q3', 'Q4']) if (need[s]) research[s] = takeResearch([SLOT_DOUBT[s], ...uncovered()], true);
  // A slot no research question fits takes the niche fallback, or failing that any research question left
  const nextFallback = slot => research[slot] || nicheFallback() || takeResearch([]);

  const questions = [];

  // Q1 cost (fixed)
  questions.push({
    slot: 'Q1',
    question: `How much does ${ctx.tradeLower} cost in ${ctx.city}?`,
    brief: '(code resolves from niche cost guidance)',
    doubt: 'Price',
  });

  // Q2 insurance / complaints / fallback
  if (cv.insurance_cover) {
    questions.push({ ...faqMap['faq_2'], slot: 'Q2' });
  } else if (cv.complaints_process) {
    questions.push({ ...faqMap['faq_2_fallback'], slot: 'Q2' });
  } else {
    const fb = nextFallback('Q2');
    if (fb) questions.push({ ...fb, slot: 'Q2' });
  }

  // Q3 guarantee / faq_3_none (all business types) / fallback
  if ((cv.guarantee_years && parseInt(cv.guarantee_years, 10) > 0) || cv.manufacturer_warranty) {
    questions.push({ ...faqMap['faq_3'], slot: 'Q3' });
  } else if (faqMap['faq_3_none']) {
    questions.push({ ...faqMap['faq_3_none'], slot: 'Q3' });
  } else {
    const fb = nextFallback('Q3');
    if (fb) questions.push({ ...fb, slot: 'Q3' });
  }

  // Q4 start_time / fallback. Answered strictly from start_time; "bigger projects
  // are booked further ahead" only when that practice is confirmed.
  if (cv.start_time) {
    const base = (faqMap['faq_4'].answer_brief || '').replace(/\s*Code adds[^.]*\.\s*$/, '').trim();
    const booked = (cv.confirmed_practices || []).includes('bigger_projects_booked_ahead');
    questions.push({
      ...faqMap['faq_4'], slot: 'Q4',
      answer_brief: `${base} Say the start time exactly as [CV: start_time] gives it: never narrow it to "smaller jobs" or "most jobs". ` +
        (booked ? 'Bigger projects are booked further ahead (confirmed).' : 'Never mention bigger projects taking longer to book.'),
    });
  } else {
    const fb = nextFallback('Q4');
    if (fb) questions.push({ ...fb, slot: 'Q4' });
  }

  // Q5 free/not-free. The niche brief ("From [QUOTE_FREE] and [CV: quote_method]")
  // reads as "From Free and ..." once resolved, so code writes the brief from the values.
  const visits = (cv.confirmed_practices || []).includes('site_visit_before_quote');
  const quoteHow = (cv.quote_method
    ? 'Say how quotes work from [CV: quote_method] only.'
    : 'quote_method is blank: do not describe how quotes are given or a turnaround time.') +
    (visits ? ' A visit before the quote is confirmed.' : ' Never describe a visit before the quote.');
  // A niche may offer faq_5_free_inspection (roofer); it replaces faq_5_free only
  // when the client has confirmed free inspections as well as free quotes.
  if (ctx.quoteFree && cv.free_inspection === 'yes' && faqMap['faq_5_free_inspection']) {
    questions.push({ ...faqMap['faq_5_free_inspection'], slot: 'Q5', answer_brief: `Yes: the inspection and the quote are both free (confirmed). ${quoteHow}` });
  } else if (ctx.quoteFree) {
    questions.push({ ...faqMap['faq_5_free'], slot: 'Q5', answer_brief: `Yes: quotes are free (confirmed). ${quoteHow}` });
  } else {
    questions.push({ ...faqMap['faq_5_not_free'], slot: 'Q5', answer_brief: `Quotes are not free: never say free. ${quoteHow}` });
  }

  // Q6 areas (fixed)
  questions.push({
    slot: 'Q6',
    question: 'Which areas do you cover?',
    brief: '(code builds from GBP service areas)',
    doubt: 'Fit',
  });

  // Q7: a research question, else faq_A
  if (research.Q7) questions.push({ ...research.Q7, slot: 'Q7' });
  else if (faqMap['faq_A']) questions.push({ ...faqMap['faq_A'], slot: 'Q7' });

  // Q8 faq_B
  if (faqMap['faq_B']) questions.push({ ...faqMap['faq_B'], slot: 'Q8' });

  // Q9 faq_planning (big_ticket AND handles_planning confirmed)
  if (niche.big_ticket && cv.handles_planning === 'yes') {
    if (faqMap['faq_planning']) questions.push({ ...faqMap['faq_planning'], slot: 'Q9' });
  }

  return questions.filter(Boolean);
}

// ── Build Why H2 (D8) ───────────────────────────────────────────────────────
function buildWhyH2(cv, niche, ctx) {
  const tradeWords = [ctx.trade.toLowerCase(), ctx.tradeLower, ctx.tradePerson.toLowerCase(), ctx.tradePersonPlural.toLowerCase()].filter(Boolean);
  const nameHasTradeWord = tradeWords.some(w => w && cv.company_name.toLowerCase().includes(w));
  const base = `Why ${ctx.city} ${cap(ctx.customerType)} Choose ${cv.company_name}`;
  return nameHasTradeWord ? base : `${base} for ${ctx.trade}`;
}

// ── Service parentage ───────────────────────────────────────────────────────
// Parent category of a service page, from the custom values (service_N under
// category_N). Falls back to category_1, as buildPageContext does.
function serviceParent(page, keyValueMap, serviceParentMap) {
  const title = (page.pageTitle || '').toLowerCase();
  const key = Object.keys(keyValueMap).find(k => /^service_\d+$/.test(k) && (keyValueMap[k] || '').toLowerCase() === title);
  return (key && serviceParentMap[key]) || keyValueMap['category_1'] || '';
}

// Service pages that can be homepage cards. With a category layer, only services
// in the primary category; secondary-category services sit under their category
// page. Without parentage data (no service_N custom values), keep every service.
function homepageServicePages(pages, primaryCategory, keyValueMap, serviceParentMap) {
  const services = pages.filter(p => p.pageType === 'service');
  const hasCategoryLayer = pages.some(p => p.pageType === 'category');
  if (!hasCategoryLayer || !Object.keys(serviceParentMap).length) return services;
  const primary = (primaryCategory || '').toLowerCase();
  return services.filter(p => serviceParent(p, keyValueMap, serviceParentMap).toLowerCase() === primary);
}

// ── Build service cards (D9) ─────────────────────────────────────────────────
function buildServiceCards(pages, niche, cardServices) {
  // Secondary-category pages plus primary-category service pages
  const categoryPages = [...pages.filter(p => p.pageType === 'category'), ...cardServices]
    .sort((a, b) => pages.indexOf(a) - pages.indexOf(b));
  const priorityList = (niche.priority_services || []).map(s => s.toLowerCase());
  const priorityIdx = p => {
    const i = priorityList.indexOf((p.pageTitle || '').toLowerCase());
    return i === -1 ? priorityList.length : i;
  };
  const sorted = categoryPages.map((p, i) => ({ p, i })).sort((a, b) => {
    const pa = priorityIdx(a.p), pb = priorityIdx(b.p);
    if (pa !== pb) return pa - pb;                      // priority order
    const la = isLinkable(a.p) ? 0 : 1, lb = isLinkable(b.p) ? 0 : 1;
    if (la !== lb) return la - lb;                      // linkable first
    return a.i - b.i;                                   // page-map order
  }).map(x => x.p);

  const main = sorted.slice(0, 8).map(p => ({
    name:    p.pageTitle,
    linked:  isLinkable(p),
    url:     isLinkable(p) ? p.urlSlug || '' : null,
    h1:      p.h1 || '',
    status:  getLinkStatus(p),
  }));

  // "We also offer": overflow beyond card slot 8.
  // - Secondary-category pages (pageType=category): always included — they must appear somewhere.
  // - Primary-category services (pageType=service): included but capped at 6.
  // Secondary-category services never reach this list (filtered out by homepageServicePages).
  const overflow = sorted.slice(8);
  const overflowCategories = overflow.filter(p => p.pageType === 'category').map(p => p.pageTitle);
  const allOverflowServices = overflow.filter(p => p.pageType === 'service').map(p => p.pageTitle);
  const alsoOffer = [...overflowCategories, ...allOverflowServices.slice(0, 6)];

  return { main, alsoOffer, overflowServiceCount: allOverflowServices.length };
}

// The 2 or 3 services each card names (Brandon, 16 Oct; round 3). Code picks them:
// 1. the client's jobs_wanted, 2. the niche's core services for the card's category
// (core_services), 3. only to reach two, the card's other GBP services. A card never
// leads with a specialist service (tree bracing, artificial grass) unless it's wanted.
// Each service sits in one card: the first card whose core list names it, else the
// card of its GBP category (lawn mowing goes to Lawn Care Service, not Gardener).
// The model sees only these for a card, never the category's full list.
function pickCardServices(main, cv, keyValueMap, serviceParentMap, niche) {
  const { sayFor } = require('./service-words');
  const lc = s => String(s || '').toLowerCase().trim();
  const wanted = (cv.jobs_wanted || []).map(lc).filter(Boolean);
  const wantRank = s => {
    const i = wanted.findIndex(w => w === s.say || w === lc(s.gbp) || (w.length > 3 && (s.say.includes(w) || w.includes(s.say) || lc(s.gbp).includes(w))));
    return i < 0 ? Infinity : i;
  };
  const core = Object.fromEntries(Object.entries(niche.core_services || {}).map(([k, v]) => [lc(k), v.map(lc)]));
  // One entry per homeowner word, in GBP order (service_N), with every GBP category it's filed under
  const bySay = new Map();
  Object.entries(keyValueMap)
    .filter(([k, v]) => /^service_\d+$/.test(k) && v)
    .map(([k, v]) => ({ n: parseInt(k.split('_')[1], 10), gbp: v, say: lc(sayFor(v, niche)), category: lc(serviceParentMap[k] || keyValueMap.category_1 || '') }))
    .filter(s => s.say && s.say !== 'null')
    .sort((a, b) => a.n - b.n)
    .forEach(s => {
      const e = bySay.get(s.say);
      if (e) e.categories.push(s.category);
      else bySay.set(s.say, { ...s, categories: [s.category] });
    });
  const services = [...bySay.values()];
  const names = main.map(c => lc(c.name));
  const home = s => {
    const byCore = names.find(n => (core[n] || []).includes(s.say));
    if (byCore) return byCore;
    return s.categories.find(c => names.includes(c)) || null;
  };
  const stem = w => w.replace(/[^a-z]/g, '').replace(/(ing|er|ers|s)$/, '');
  for (const card of main) {
    const name = lc(card.name);
    const own = services.find(s => lc(s.gbp) === name);
    if (own) { card.services = [own.say]; continue; }
    // A service that only restates the category ("gardening" on the Gardener card) names nothing
    const catStems = new Set(name.split(/\s+/).map(stem));
    const restates = say => say.split(/\s+/).every(w => catStems.has(stem(w)));
    const mine = services.filter(s => home(s) === name && s.say !== name && !restates(s.say));
    const coreList = core[name] || [];
    const want = mine.filter(s => wantRank(s) < Infinity).sort((a, b) => wantRank(a) - wantRank(b));
    const fromCore = coreList.map(w => mine.find(s => s.say === w)).filter(Boolean);
    const picks = [];
    for (const s of [...want, ...fromCore]) if (!picks.includes(s.say)) picks.push(s.say);
    // Top up to two from the card's other services, never as the lead
    if (picks.length === 1) { const extra = mine.find(s => !picks.includes(s.say)); if (extra) picks.push(extra.say); }
    card.services = picks.slice(0, 3);
  }
  return main;
}

// Each card gets its own sentence shape, so no two cards read alike (16 Oct, copy
// quality loop: cards kept sharing "Our [category] work covers…" and "We also handle…")
const CARD_SHAPES = [
  'Open with the problem the customer has; name the services in the next sentence.',
  'Open with a short question the customer would ask; answer it with the services.',
  'Open with the services themselves as the subject of the sentence ("Block paving and new driveways…").',
  'Open with when people need this (a time of year or a moment in the life of a home); then the services.',
  'Open with what goes wrong when this work is done badly; then what we do instead.',
  'Open with the result the customer is after; then how the services get there.',
  'Open with who this suits (a new homeowner, a busy family, a garden that has been left); then the services.',
  'Open with the material or method that matters most; then what the customer gets.',
];
// ...and its own way of linking its page, so cards don't all read "Our [category] work…"
const LINK_PHRASES = ['our [X] work', 'a [X] visit', '[X] work from us', 'what a [X] does', 'booking a [X]', 'the [X] side of what we do', 'a [X] job', 'our [X] jobs'];
function assignCardShapes(main) {
  main.forEach((c, i) => {
    c.shape = CARD_SHAPES[i % CARD_SHAPES.length];
    if (c.linked) c.link_phrase = LINK_PHRASES[i % LINK_PHRASES.length].replace('X', (c.name || '').toLowerCase());
  });
  return main;
}

// ── Build area list (D12) ────────────────────────────────────────────────────
function buildAreaList(pages, keyValueMap) {
  const locationPages = pages.filter(p => p.pageType === 'location');
  const locMap = {};
  for (const p of locationPages) {
    locMap[normArea(p.pageTitle)] = p;
  }

  const primaryCity = (keyValueMap['biz_area_1'] || '').trim();
  const allAreas = [];
  for (let i = 1; keyValueMap[`biz_area_${i}`]; i++) {
    allAreas.push(keyValueMap[`biz_area_${i}`].trim());
  }

  const linked = [];
  const plain  = [];

  for (const area of allAreas) {
    if (area === primaryCity) continue; // primary city handled separately
    if (isAdminArea(area)) continue;    // a council area ("New Forest District") is not a town
    const norm = normArea(area);
    const page = locMap[norm] || locMap[normArea(stripAdmin(area))];
    const displayName = stripAdmin(area);
    if (page && isLinkable(page)) {
      linked.push({ name: displayName, url: page.urlSlug || '', h1: page.h1 || '' });
    } else {
      plain.push(displayName);
    }
  }

  linked.sort((a, b) => a.name.localeCompare(b.name));
  plain.sort((a, b)  => a.localeCompare(b));

  return { primaryCity, linked, plain };
}

// ── Build D13 content-block link set ─────────────────────────────────────────
function buildD13Links(pages, cv) {
  const categoryPages = pages.filter(p => p.pageType === 'category' && isLinkable(p));
  const jobsWanted = new Set((cv.jobs_wanted || []).map(j => j.toLowerCase()));

  const priority = categoryPages.filter(p => jobsWanted.has((p.pageTitle || '').toLowerCase()));
  const rest     = categoryPages.filter(p => !jobsWanted.has((p.pageTitle || '').toLowerCase()));

  return [...priority, ...rest].slice(0, 4).map(p => ({
    name: p.pageTitle, url: p.urlSlug || '', h1: p.h1 || '',
  }));
}

// ── Build D14 hero intro town ────────────────────────────────────────────────
// Picks the first GBP area (by biz_area_N order, skipping primary city and plain-text areas)
// that has a linkable Location page. Falls back to any eligible area with a location page.
function buildD14Town(pages, keyValueMap) {
  const locMap = {};
  for (const p of pages.filter(p => p.pageType === 'location')) {
    locMap[normArea(p.pageTitle)] = p;
    locMap[normArea(stripAdmin(p.pageTitle))] = p;
  }

  const primaryCity = normArea((keyValueMap['biz_area_1'] || '').trim());
  const areaList = buildAreaList(pages, keyValueMap);
  const plainSet = new Set(areaList.plain.map(n => normArea(n)));

  const gbpAreas = [];
  for (let i = 2; keyValueMap[`biz_area_${i}`]; i++) {
    gbpAreas.push(keyValueMap[`biz_area_${i}`].trim());
  }

  function getPage(area) {
    return locMap[normArea(area)] || locMap[normArea(stripAdmin(area))];
  }

  function eligible(area) {
    const n = normArea(area);
    const s = normArea(stripAdmin(area));
    if (n === primaryCity || s === primaryCity) return false;
    if (plainSet.has(n) || plainSet.has(s)) return false;
    return true;
  }

  // First pass: linkable page in GBP area order
  for (const area of gbpAreas) {
    if (!eligible(area)) continue;
    const page = getPage(area);
    if (page && isLinkable(page)) return { name: stripAdmin(area), url: page.urlSlug || '' };
  }
  // Second pass: any eligible area with a location page (even not yet linkable)
  for (const area of gbpAreas) {
    if (!eligible(area)) continue;
    const page = getPage(area);
    if (page) return { name: stripAdmin(area), url: '' };
  }
  return null;
}

// ── Process steps ────────────────────────────────────────────────────────────
// The emergency layout uses the niche's emergency steps. Otherwise step 2 is the
// visit step only when the client confirms visiting before quoting; without it,
// the niche's step_2_no_visit, which names no quote method (15 Oct).
function stepsFor(niche, cv, emergencyOn) {
  if (emergencyOn && Array.isArray(niche.steps_emergency) && niche.steps_emergency.length) return niche.steps_emergency;
  const steps = niche.steps || [];
  const visits = (cv.confirmed_practices || []).includes('site_visit_before_quote');
  if (!visits && niche.step_2_no_visit && steps.length > 1) return steps.map((s, i) => (i === 1 ? niche.step_2_no_visit : s));
  return steps;
}

// ── Main entry point ─────────────────────────────────────────────────────────
// cardServices (v3 page map path, v20-context-v3.js): { picks: { [category lower]: [names] } }.
// When given, the cards are the category pages only (no primary-category service cards) and
// each card names the services picked there, not pickCardServices'.
function computeDecisions({ cv, niche, pages, keyValueMap, serviceParentMap, v20TestMode, allocationData, faqResearch = [], cardServices = null }) {
  const gates = [];
  const flags = [];

  // ── Derived inputs ──
  const primaryCity = (keyValueMap['biz_area_1'] || '').trim();
  const quoteFree   = cv.free_quotes === 'yes' ? 'Free' : '';
  const homepage    = pages.find(p => p.pageType === 'homepage');
  const kwPhrase    = homepage ? (homepage.h1 || '').trim() : '';

  const btnBase = niche.buttons || {};
  // h1_override / d2_h1 resolved before ctx so kwPhrase in ctx uses the effective H1
  const h1Override = (cv.h1_override || '').trim();
  const d2_h1 = h1Override || kwPhrase;

  const ctx = {
    kwPhrase:          d2_h1,
    category:          cv.primary_category || '',
    city:              primaryCity,
    trade:             niche.trade || '',
    tradeLower:        niche.trade_lower || '',
    tradePerson:       niche.trade_person || '',
    tradePersonPlural: niche.trade_person_plural || '',
    customerType:      niche.customer_type || '',
    unitOfWork:        niche.unit_of_work || '',
    areaWide:          cv.area_wide || '',
    companyName:       cv.company_name || '',
    quoteFree,
  };
  // Resolve primary_action with placeholders
  ctx.primaryAction = ph(btnBase.primary_action || '', ctx);

  // ── Gates ──

  // G-H1
  if (!kwPhrase && !h1Override) {
    gates.push({ code: 'G-H1', msg: 'Homepage H1 is blank in the page map.' });
  } else {
    const h1ToCheck = h1Override || kwPhrase;
    const oldFormat = h1ToCheck.includes('|') || (cv.company_name && h1ToCheck.toLowerCase().includes(cv.company_name.toLowerCase()));
    if (oldFormat && !h1Override) {
      gates.push({ code: 'G-H1', msg: `H1 is in the old format: set the H1 override. (H1: "${h1ToCheck}")` });
    }
  }

  // G-MAP
  if (!cv.map_embed) {
    if (v20TestMode) flags.push({ code: 'F-MAP-TEST', msg: 'map_embed blank — G-MAP bypassed (test mode on).' });
    else gates.push({ code: 'G-MAP', msg: 'map_embed is blank. Set it in client values or enable test mode.' });
  }

  // G-NICHE
  const requiredNiche = ['trade', 'trade_lower', 'trade_person', 'trade_person_plural', 'customer_type', 'unit_of_work', 'cover_chain', 'faq_slots'];
  const missingNiche = requiredNiche.filter(k => !niche[k] || (Array.isArray(niche[k]) && !niche[k].length));
  if (missingNiche.length) gates.push({ code: 'G-NICHE', msg: `Niche entry missing slots: ${missingNiche.join(', ')}` });

  // G-INPUT
  if (!cv.company_name || !cv.phone) {
    gates.push({ code: 'G-INPUT', msg: `${!cv.company_name ? 'company_name' : 'phone'} is blank in client values.` });
  } else if (!cv.company_name_gbp_checked) {
    gates.push({ code: 'G-INPUT', msg: 'company_name_gbp_checked is not ticked — verify GBP name before running.' });
  }

  if (gates.length) return { gates, flags, decisions: null, decisionsBlock: null };

  // ── D1 years trading ──
  const yearFounded   = cv.year_founded ? parseInt(cv.year_founded, 10) : NaN;
  const yearsTrading  = isNaN(yearFounded) ? null : CURRENT_YEAR - yearFounded;
  const emergencyOn   = !!(niche.emergency_niche && cv.emergency_primary === 'yes');

  // ── D3 title modifier ──
  let titleModifier = null;
  if (emergencyOn && cv.out_of_hours_available === '24/7') titleModifier = 'Available 24/7';
  else if (yearsTrading !== null && yearsTrading >= 5)     titleModifier = `Established ${yearFounded}`;
  else if (cv.guarantee_years && parseInt(cv.guarantee_years, 10) >= 5) titleModifier = `${cv.guarantee_years} Year Guarantee`;
  else if (cv.rating && parseFloat(cv.rating) >= 4.8 && cv.review_count && parseInt(cv.review_count, 10) >= 20) titleModifier = `Rated ${cv.rating}★`;

  let d3_title;
  if (titleModifier) {
    const withMod = `${d2_h1} | ${titleModifier} | ${cv.company_name}`;
    if (withMod.length <= 60) { d3_title = withMod; }
    else { d3_title = `${d2_h1} | ${cv.company_name}`; titleModifier = null; }
  } else {
    d3_title = `${d2_h1} | ${cv.company_name}`;
    if (d3_title.length > 60) flags.push({ code: 'F-LEN-TITLE', msg: `Title is ${d3_title.length} chars (max 60).` });
  }

  // ── D4 meta description ──
  const metaCta   = ph(btnBase.meta_cta || '', ctx);
  const proofOpts = [];
  const ratingNum = cv.rating ? parseFloat(cv.rating) : 0;
  const rvCount   = cv.review_count ? parseInt(cv.review_count, 10) : 0;
  if (ratingNum >= 4.8 && rvCount >= 20 && titleModifier !== `Rated ${cv.rating}★`)
    proofOpts.push(`Rated ${cv.rating}★ by local ${ctx.customerType}`);
  if (cv.guarantee_years && parseInt(cv.guarantee_years, 10) > 0 && !(titleModifier && titleModifier.includes('Year Guarantee')))
    proofOpts.push(`${cv.guarantee_years} year workmanship guarantee`);
  if (yearsTrading !== null && yearsTrading >= 5 && titleModifier !== `Established ${yearFounded}`)
    proofOpts.push(`Established in ${yearFounded}`);
  if (cv.differentiator_1_confirmed && cv.differentiator_1_sentence)
    proofOpts.push(cv.differentiator_1_sentence);

  // A natural sentence, never "[keyword] from [company]" (15 Oct): "Edens Edge Landscaping
  // is a landscaper in Southampton offering fixed prices with no hidden costs." Only
  // confirmed proofs; the keyword reads with a joining "in".
  const kwNatural = primaryCity && new RegExp(`\\s${primaryCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i').test(d2_h1)
    ? `${d2_h1.slice(0, d2_h1.length - primaryCity.length).trim().toLowerCase()} in ${primaryCity}`
    : d2_h1;
  const lowerFirst = s => s ? s[0].toLowerCase() + s.slice(1) : s;
  const metaSentence = proof => {
    const base = `${cv.company_name} is a ${kwNatural}`;
    if (!proof) return `${base}.`;
    if (/^Rated /.test(proof)) return `${base}, ${lowerFirst(proof)}.`;
    if (/year workmanship guarantee$/.test(proof)) return `${base} with a ${proof}.`;
    if (/^Established in /.test(proof)) return `${base}, ${lowerFirst(proof)}.`;
    // A differentiator: a "We ..." sentence stands alone; a description of the business
    // ("Family run and independent") goes before the trade; anything else is offered
    if (/^we\b/i.test(proof)) return `${base}. ${proof.replace(/[.!]?$/, '.')}`;
    if (/^(family|independent|local|owner|small|award)/i.test(proof)) return `${cv.company_name} is a ${lowerFirst(proof)} ${kwNatural}.`;
    return `${base} offering ${lowerFirst(proof)}.`;
  };
  let d4_meta = null;
  for (const proof of proofOpts) {
    const candidate = `${metaSentence(proof)} ${metaCta}`.trim();
    if (candidate.length <= 155) { d4_meta = candidate; break; }
  }
  if (!d4_meta) {
    const bare = `${metaSentence(null)} ${metaCta}`.trim();
    if (bare.length > 155) flags.push({ code: 'F-LEN-META', msg: `Meta is ${bare.length} chars (max 155).` });
    d4_meta = bare;
  }

  // ── D5 trust line ──
  let d5_trust = null;
  let trustProof = null;
  if (yearsTrading !== null && yearsTrading >= 5)                                   { d5_trust = `Established in ${yearFounded}`;                         trustProof = 'years'; }
  else if (cv.jobs_completed && parseInt(cv.jobs_completed, 10) > 0)               { d5_trust = `${cv.jobs_completed}+ ${cap(ctx.unitOfWork)} Completed`; trustProof = 'jobs'; }
  else {
    for (const proof of (niche.cover_chain || [])) {
      if (proof === 'guarantee'             && cv.guarantee_years)       { d5_trust = `${cv.guarantee_years} Year Workmanship Guarantee`; trustProof = proof; break; }
      if (proof === 'manufacturer_warranty' && cv.manufacturer_warranty) { d5_trust = cv.manufacturer_warranty;                          trustProof = proof; break; }
      if (proof === 'insurance'             && cv.insurance_cover)       { d5_trust = `Insured up to £${cv.insurance_cover}`;        trustProof = proof; break; }
    }
  }

  // ── D6 rating line ──
  let d6_rating = null;
  if (rvCount > 0) {
    if (ratingNum >= 4.5) d6_rating = `★★★★★ ${cv.rating} from ${rvCount}+ Google Reviews`;
    else d6_rating = `${rvCount}+ Google Reviews`;
  }

  // ── D7 section visibility ──
  const reviewCount      = cv.review_count ? parseInt(cv.review_count, 10) : 0;
  const logosSaved       = cv.verified_logos !== null && cv.verified_logos !== undefined;
  const googleQualifies  = reviewCount >= 5;
  const hasVerifiedLogos = Array.isArray(cv.verified_logos) && cv.verified_logos.length > 0;

  let sec2 = false;
  if (!logosSaved) { flags.push({ code: 'F-LOGOS', msg: 'verified_logos has never been saved.' }); }
  else sec2 = googleQualifies || hasVerifiedLogos;

  const sec6 = reviewCount >= 3;
  if (!sec6) flags.push({ code: 'F-REVIEWS', msg: `Reviews hidden (review_count=${reviewCount || 'blank'}, needs 3+).` });

  const ownerHints = [cv.owner_qualification, cv.owner_why, cv.owner_promise].filter(Boolean).length;
  const sec9 = !!(cv.owner_name && cv.owner_photo === 'yes' && ownerHints >= 2);

  // ── D10 Why points (includes G-DATA check) ──
  const whyPoints = buildWhyPoints(cv, niche, yearsTrading, trustProof, ctx);
  if (whyPoints.length < 2) {
    gates.push({ code: 'G-DATA', msg: `Only ${whyPoints.length} Why point(s) built (minimum 2 required).` });
    return { gates, flags, decisions: null, decisionsBlock: null };
  }

  // ── D8 headings ──
  const tradePersonCap = cap(ctx.tradePerson);
  const tradePersonPlurCap = cap(ctx.tradePersonPlural);
  const d8 = {
    content:   ctx.areaWide ? `Local ${ctx.trade} Serving ${ctx.city} & ${ctx.areaWide}` : `Local ${ctx.trade} in ${ctx.city} and Nearby Towns`,
    services:  `Our ${ctx.trade} Services in ${ctx.city}`,
    why:       buildWhyH2(cv, niche, ctx),
    reviews:   reviewCount >= 20 ? `${reviewCount}+ Google Reviews From ${ctx.city} ${cap(ctx.customerType)}` : `What ${ctx.city} ${cap(ctx.customerType)} Say About Us`,
    process:   ph(btnBase.process_h2 || '', ctx),
    // CTA band is a sentence, not a heading — trade_person stays lower case
    cta_band:  `Ready to talk to a local ${ctx.tradePerson}?`,
    owner:     sec9 ? (cv.owner_name_2
      ? `Meet ${cv.owner_name} & ${cv.owner_name_2}, the ${tradePersonPlurCap} Behind ${cv.company_name}`
      : `Meet ${cv.owner_name}, the ${tradePersonCap} Behind ${cv.company_name}`)
      : '(section hidden)',
    areas:     ctx.areaWide ? `${ctx.trade} Services Across ${ctx.city} & ${ctx.areaWide}` : `Where Our ${tradePersonPlurCap} Work Around ${ctx.city}`,
    faq:       `Your ${ctx.trade} Questions Answered`,
    final_cta: ph((emergencyOn && btnBase.final_h2_emergency) ? btnBase.final_h2_emergency : (btnBase.final_h2 || ''), ctx),
  };

  // ── D9 service cards ──
  const primaryCategory = cv.primary_category || keyValueMap['category_1'] || '';
  const cardServicePages = cardServices ? [] : homepageServicePages(pages, primaryCategory, keyValueMap, serviceParentMap || {});
  const d9 = buildServiceCards(pages, niche, cardServicePages);
  if (cardServices) d9.main.forEach(c => { c.services = (cardServices.picks || {})[(c.name || '').toLowerCase().trim()] || []; });
  else pickCardServices(d9.main, cv, keyValueMap, serviceParentMap || {}, niche);
  assignCardShapes(d9.main);
  if (d9.overflowServiceCount > 6) {
    flags.push({ code: 'F-MORE-SERVICES', msg: `${d9.overflowServiceCount} primary-category services overflow; only the first 6 are shown in "We also offer".` });
  }

  // ── D11 FAQ ──
  const d11 = buildFaq(cv, niche, ctx, emergencyOn, faqResearch);

  // N25: all 5 doubts covered
  const doubtsCovered = new Set(d11.map(q => q.doubt).filter(Boolean));
  const missing5 = ['Price', 'Trust', 'Fit', 'Process', 'Timing'].filter(d => !doubtsCovered.has(d));
  if (missing5.length) flags.push({ code: 'N25', msg: `FAQ missing doubts: ${missing5.join(', ')}` });

  // ── D12 area list ──
  const d12 = buildAreaList(pages, keyValueMap);

  // ── D13 content block link set ──
  const d13 = buildD13Links(pages, cv);

  // ── D14 hero intro town ──
  const d14 = buildD14Town(pages, keyValueMap);

  // ── D15 button order ──
  const d15 = emergencyOn
    ? [`Call ${cv.phone}`, ctx.primaryAction]
    : [ctx.primaryAction, cv.phone ? `Call ${cv.phone}` : null].filter(Boolean);

  // ── CTA band (code only): heading, one fixed niche line, the D15 buttons.
  // The response time lives here and nowhere else on the page.
  const ctaBand = {
    heading: d8.cta_band,
    line: ph(cv.response_time ? (btnBase.cta_band_line || '') : (btnBase.cta_band_line_no_response || ''), ctx),
    buttons: d15,
  };

  // ── Final CTA trust lines (build spec section 11): hours, then the rating line.
  // No response time here: the CTA band is its only home.
  const finalCtaTrustLines = [cv.hours ? '[CV: hours]' : null, d6_rating].filter(Boolean);

  // ── Trusted & Rated By logos (section 2): Google with 5+ reviews, plus verified logos
  const trustedLogos = sec2 ? [
    ...(googleQualifies ? [{ name: 'Google', caption: 'Google reviews' }] : []),
    ...(Array.isArray(cv.verified_logos) ? cv.verified_logos.filter(l => l && l.name && !/^google$/i.test(l.name)) : []),
  ] : [];

  // ── Allocated items (Stage 5). allocationData is already resolved to names and
  // cleaned text by allocation.resolveAllocatedItems; null when nothing is saved.
  const symptomSlotOf = q => {
    const f = (niche.faq_slots || []).find(s => s.symptom_based && s.question === q.question);
    return f ? f.slot : null;
  };
  const allocated = allocationData || { neighbourhoods: [], symptoms: {} };
  if (!allocationData) {
    flags.push({ code: 'F-ALLOC', msg: 'No allocation saved: run the allocation pass on the Geo Research step.' });
  } else {
    if (allocated.neighbourhoods.length < 2) {
      flags.push({ code: 'F-ALLOC', msg: `Only ${allocated.neighbourhoods.length} allocated neighbourhood(s); the content block needs 2.` });
    }
    const missingSym = d11.map(symptomSlotOf).filter(slot => slot && !allocated.symptoms[slot]);
    if (missingSym.length) flags.push({ code: 'F-ALLOC', msg: `No allocated symptom for ${missingSym.join(', ')}.` });
  }
  // The planning FAQ must name any allocated conservation area
  const conservationNames = allocated.neighbourhoods.filter(n => n.conservation).map(n => n.name);
  for (const q of d11) {
    if (q.slot === 'Q9' && conservationNames.length) {
      q.answer_brief = `${q.answer_brief || ''} Allocated conservation area to name: ${conservationNames.join(', ')}.`.trim();
    }
    const symSlot = symptomSlotOf(q);
    if (symSlot) q.allocatedSymptom = allocated.symptoms[symSlot] ? symSlot : null;
  }

  // ── D16 thin page check ──
  let thinCount = 0;
  if (!sec2)              thinCount++;
  if (!d5_trust && !d6_rating) thinCount++;
  if (whyPoints.length < 3) thinCount++;
  if (!sec6)              thinCount++;
  if (!sec9)              thinCount++;
  if (thinCount >= 2) {
    const thinParts = [];
    if (!sec2) thinParts.push('section 2 hidden (logos)');
    if (!d5_trust && !d6_rating) thinParts.push('no trust or rating line');
    if (whyPoints.length < 3) thinParts.push(`only ${whyPoints.length} Why point(s)`);
    if (!sec6) thinParts.push('section 6 hidden (reviews)');
    if (!sec9) thinParts.push('section 9 hidden (owner)');
    flags.push({ code: 'F-THIN', msg: `Thin page: ${thinCount}/5 indicators — ${thinParts.join(', ')}.` });
  }

  // Content block expands when D13 has the full set of 4 links
  const contentBlockExpands = d13.length === 4;

  // Pair Why points with niche fears (cycled if fewer fears than points)
  const fears = niche.fears || [];
  const whyWithFears = whyPoints.map((p, i) => ({
    ...p,
    fear: fears.length > 0 ? fears[i % fears.length] : null,
  }));

  // Build linkable pages list (Live or Launching), trimmed to pages the homepage
  // can link: never itself, never location-category pages, and only the services
  // that can be cards (secondary-category services sit under their category page).
  // The primary city's own location page is left out too: the homepage is that page.
  const cardServiceSet = new Set(cardServicePages);
  const linkablePages = pages
    .filter(p => isLinkable(p) && (p.urlSlug || '').trim())
    .filter(p => p.pageType !== 'homepage' && p.pageType !== 'location-category')
    .filter(p => !(p.pageType === 'location' && normArea(stripAdmin(p.pageTitle)) === normArea(primaryCity)))
    .filter(p => p.pageType !== 'service' || cardServiceSet.has(p))
    .map(p => ({ type: p.pageType, url: p.urlSlug, h1: p.h1 || '' }));

  const decisions = {
    d1_years_trading:    yearsTrading,
    d2_h1,
    d3_title,
    d4_meta,
    d5_trust,
    d6_rating,
    d7: { sec2: sec2 ? 'SHOWN' : 'HIDDEN', sec6: sec6 ? 'SHOWN' : 'HIDDEN', sec9: sec9 ? 'SHOWN' : 'HIDDEN' },
    d8,
    d9,
    d10_why:             whyWithFears,
    d11_faq:             d11,
    d12_areas:           d12,
    d13_links:           d13,
    d13_expands:         contentBlockExpands,
    d14_town:            d14,
    d15_buttons:         d15,
    linkablePages,
    niche_steps:         stepsFor(niche, cv, emergencyOn),
    emergencyOn,
    quoteFree,
    allocated,
    coastal:              cv.coastal_city === 'yes',
    locations_hub:        (linkablePages.find(p => p.type === 'locations-hub') || {}).url || null,
    cta_band:             ctaBand,
    final_cta_trust_lines: finalCtaTrustLines,
    trusted_logos:        trustedLogos,
  };

  const decisionsBlock = formatDecisionsBlock(decisions, cv, niche, ctx);

  return { gates, flags, decisions, decisionsBlock };
}

// ── Format DECISIONS block (text sent to model) ──────────────────────────────
function formatDecisionsBlock(D, cv, niche, ctx) {
  const lines = [];
  const push = s => lines.push(s);

  // Five blocks in the brief's order: PAGE, DECISIONS, LINKABLE PAGES,
  // ALLOCATED ITEMS, MODEL FIELDS.
  push(`PAGE: homepage, slug /, keyword: ${D.d2_h1}`);
  push('');
  push('DECISIONS:');
  push('');
  push(`H1: ${D.d2_h1}`);
  push(`SEO title: ${D.d3_title}`);
  push(`Meta description: ${D.d4_meta}`);
  push(`Trust line: ${D.d5_trust || 'none'}`);
  push(`Rating line: ${D.d6_rating || 'none'}`);
  push('');
  push(`Section 2 (Trusted logos): ${D.d7.sec2}`);
  push(`Section 6 (Reviews): ${D.d7.sec6}`);
  push(`Section 9 (Owner): ${D.d7.sec9}`);
  push('');
  push('--- HEADINGS ---');
  push(`Content block H2: ${D.d8.content}`);
  push(`Services H2: ${D.d8.services}`);
  push(`Why H2: ${D.d8.why}`);
  push(`Reviews H2: ${D.d8.reviews}`);
  push(`Process H2: ${D.d8.process}`);
  push(`CTA band: ${D.d8.cta_band}`);
  push(`CTA band line (code, fixed): ${D.cta_band.line}`);
  push(`Owner H2: ${D.d8.owner}`);
  push(`Areas H2: ${D.d8.areas}`);
  push(`FAQ H2: ${D.d8.faq}`);
  push(`Final CTA H2: ${D.d8.final_cta}`);
  push('');
  push(`Content block: ${D.d13_expands ? 'EXPANDING (up to 300 words)' : 'standard (up to 250 words)'}`);
  push('');
  push('--- D13 CONTENT BLOCK LINK SET ---');
  for (const l of D.d13_links) push(`  ${l.name} → ${l.url}`);
  push('');
  push(`D14 Hero intro town: ${D.d14_town ? `${D.d14_town.name}${D.d14_town.url ? ' (' + D.d14_town.url + ')' : ''}` : 'none'}`);
  push('');
  push('--- D9 SERVICE CARDS ---');
  for (let i = 0; i < D.d9.main.length; i++) {
    const c = D.d9.main[i];
    push(`  ${i + 1}. ${c.name} [${c.status}${c.url ? ' ' + c.url : ''}${c.h1 ? ' | H1: ' + c.h1 : ''}]`);
    if (c.services) push(`     Services: ${c.services.length ? c.services.join(', ') : '(none: describe the work without naming services)'}`);
    if (c.shape) push(`     Shape: ${c.shape}`);
    if (c.link_phrase) push(`     Link as: "${c.link_phrase}" (the link inside a sentence, not at its start)`);
  }
  if (D.d9.alsoOffer.length) push(`  We also offer: ${D.d9.alsoOffer.join(', ')}`);
  push('');
  push('--- D10 WHY CHOOSE US POINTS ---');
  for (const p of D.d10_why) {
    push(`  ${p.title}`);
    if (p.fear) push(`    Fear addressed: ${p.fear}`);
  }
  push('');
  push('--- PROCESS STEPS ---');
  for (const s of (D.niche_steps || [])) {
    push(`  ${s.title}`);
    push(`    Brief: ${ph(s.brief || '', ctx)}`);
  }
  push('');
  push('--- D11 FAQ QUESTIONS ---');
  for (const q of D.d11_faq) {
    push(`  ${q.slot}: ${q.question} [${q.doubt}${q.symptom_based ? ', symptom' : ''}]`);
    if (q.answer_brief) push(`    → ${ph(q.answer_brief, ctx)}`);
  }
  push('');
  push('--- D12 AREA LIST ---');
  push(`  Primary: ${D.d12_areas.primaryCity} (plain text)`);
  for (const a of D.d12_areas.linked) push(`  ${a.name} (linked: ${a.url})`);
  for (const a of D.d12_areas.plain)  push(`  ${a} (plain text)`);
  push('');
  push(`D15 Buttons: ${D.d15_buttons.join(' | ')}`);
  push(`Emergency layout: ${D.emergencyOn ? 'ON' : 'off'}`);
  push(`[QUOTE_FREE]: ${D.quoteFree || '(blank — paid quotes)'}`);
  push(`Primary city coastal: ${D.coastal ? 'yes. Write the travel distance as "inland and along the coast", never compass directions or "in each direction"' : 'no'}`);
  push(`Locations hub: ${D.locations_hub ? `${D.locations_hub} (FAQ "Which areas do you cover?" links it)` : 'none (the areas FAQ links no hub)'}`);
  push('');
  push('LINKABLE PAGES:');
  for (const p of D.linkablePages) push(`  [${p.type}] ${p.url} | H1: ${p.h1}`);
  push('');
  push('ALLOCATED ITEMS:');
  const A = D.allocated || { neighbourhoods: [], symptoms: {} };
  if (!A.neighbourhoods.length && !Object.keys(A.symptoms).length) push('  none');
  for (const n of A.neighbourhoods) {
    push(`  Neighbourhood: ${n.name}${n.conservation ? ' (conservation area)' : ''}`);
    for (const line of n.profile.split('\n')) if (line.trim()) push(`    ${line.trim()}`);
  }
  for (const q of D.d11_faq) {
    if (!q.allocatedSymptom) continue;
    const s = A.symptoms[q.allocatedSymptom];
    push(`  Symptom for ${q.slot} (${q.question}): "${s.text}"`);
    push(`    Linked issue: ${s.issueTitle}`);
    for (const line of s.issueText.split('\n')) if (line.trim()) push(`    ${line.trim()}`);
  }
  push('');
  // Field names and list keys match the CORE (20) OUTPUT block exactly.
  push('MODEL FIELDS:');
  push('  home_hero_intro');
  push(`  home_content_block_body${D.d13_expands ? ' (expand: up to 300 words)' : ''}`);
  push('  home_services_intro');
  push('  home_services_cards');
  for (const c of D.d9.main) push(`    - card_name: ${c.name} | card_text${c.linked ? '' : ' (unlinked: no link)'}${c.services && c.services.length ? ` (names: ${c.services.join(', ')})` : ''}`);
  push(`  home_services_more_line${D.d9.alsoOffer.length ? '' : ' (HIDDEN)'}`);
  push('  home_why_points');
  for (const p of D.d10_why) push(`    - point_title: ${p.title} | point_body`);
  push('  home_process_steps');
  for (const s of D.niche_steps) push(`    - step_title: ${s.title} | step_body`);
  push(`  home_owner_body${D.d7.sec9 === 'HIDDEN' ? ' (HIDDEN)' : ''}`);
  push('  home_areas_intro');
  push('  home_faq_items');
  for (const q of D.d11_faq) push(`    - faq_question: ${q.question} | faq_answer`);
  push('  home_final_cta_body');
  push('  MODEL_FLAGS');

  return lines.join('\n');
}

module.exports = { computeDecisions, ph };
