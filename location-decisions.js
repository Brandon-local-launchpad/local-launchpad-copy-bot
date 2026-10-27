'use strict';

// ── Location page decisions (CORE (18), 27 Oct 2026) ─────────────────────────
// Code makes every decision for one location page ("Landscaper Winchester": the town's hub)
// from the v3 page map, the client values, the niche entry's town wide blocks
// (location_page_blocks), the town's dossier and the pages already written in the town.
// No model calls. Returns { gates, flags, decisions, decisionsBlock } in the category
// page's shape, so the shared pipeline (parser, record, validator, retries, reader, store)
// runs unchanged. Always town scope.
//
// Inputs:
//   cv, niche, keyValueMap (biz_area_N from the hand set-up)
//   rows           the v3 page map rows (page-map/store.js saved), applies or not
//   page           the row this page is: type 'location'
//   allocation     { neighbourhoods: [{ name, type, conservation, profile }] } picked from the town's dossier (resolved), or null
//   town           { profile, villages: [names] } from the town's dossier, or null
//   symptoms       [{ id, text, issueTitle, issueText }] assigned to this page (allocation.symptomsForLocation, resolved)
//   ideasUsed      [{ page, text }] the ideas the homepage and the town's category and service pages made
//   mechanismsUsed [{ page, text }] the block 4 mechanisms of the town's category and service pages
//   reviews        the hand picked reviews [{ text, name, town }]
//
// The H1 is the page map row's (H1 research puts "[primary] [town]" there, or the hub pattern
// "[Primary] Services in and around [Town]" where the town has a location category page for the
// primary category); a row with no H1 gets "[primary category] [town]" and a flag. The keyword
// word for the hero and content sentence is read off the H1, else it is the primary category.

const { ph, cap, titleCase, isLinkable, stepsFor, yearsTradingOf, titleModifierFor, seoTitleFor, trustLineFor, ratingLineFor, buttonsFor } = require('./decisions');
const { keywordWord, isPersonWord, phCat, metaFor } = require('./category-decisions');
const LB = require('./location-blocks');

const lc = s => String(s || '').toLowerCase().trim();
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normLoc = s => lc(s).replace(/[-_]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const live = r => r && r.applies !== false && ((r.info && r.info.phase) || 1) === 1;
const slugOf = r => (r && r.slug) || '';

// The category word of a location page H1: "Landscaper" from "Landscaper Winchester",
// "Gardener" from the hub pattern "Gardener Services in and around Romsey"; else the fallback
function categoryWordOf(h1, town, fallback) {
  const h = String(h1 || '').trim();
  if (!h) return fallback;
  const hub = h.match(/^(.+?)\s+services\s+in\s+and\s+around\s+(.+)$/i);
  if (hub) return hub[1].trim();
  if (town && new RegExp(`\\s${esc(town)}$`, 'i').test(h)) return h.slice(0, h.length - town.length).trim();
  return fallback;
}

// The client's primary category: the client value, else the page map's primary category row, else the first category row
function primaryCategoryOf(cv, applies) {
  if (cv.primary_category && String(cv.primary_category).trim()) return String(cv.primary_category).trim();
  const cats = applies.filter(r => r.type === 'category');
  const p = cats.find(r => r.info && r.info.primary) || cats[0];
  return p ? p.title : '';
}

function computeLocationDecisions({ cv, niche, keyValueMap = {}, rows = [], page, allocation = null, town = null, symptoms = [], ideasUsed = [], mechanismsUsed = [], reviews = [] }) {
  const gates = [];
  const flags = [];
  if (!page || page.type !== 'location') {
    gates.push({ code: 'G-PAGE', msg: 'Not a location page.' });
    return { gates, flags, decisions: null, decisionsBlock: null };
  }
  const applies = rows.filter(r => r.applies !== false);
  const city = (keyValueMap.biz_area_1 || '').trim();
  const townName = ((page.info && page.info.town) || page.title || '').trim();
  const primary = primaryCategoryOf(cv, applies);

  // ── Gates ──
  if (!city) gates.push({ code: 'G-MAP', msg: 'The hand set-up has no base town (biz_area_1).' });
  if (!townName) gates.push({ code: 'G-MAP', msg: `${page.title || page.slug} has no town in the page map.` });
  if (!primary) gates.push({ code: 'G-INPUT', msg: 'No primary category: primary_category is blank and the page map has no category row.' });
  if (!cv.company_name || !cv.phone) gates.push({ code: 'G-INPUT', msg: `${!cv.company_name ? 'company_name' : 'phone'} is blank in client values.` });
  else if (!cv.company_name_gbp_checked) gates.push({ code: 'G-INPUT', msg: 'company_name_gbp_checked is not ticked — verify GBP name before running.' });
  const requiredNiche = ['trade', 'trade_lower', 'trade_person', 'customer_type', 'buttons'];
  const missingNiche = requiredNiche.filter(k => !niche[k]);
  if (missingNiche.length) gates.push({ code: 'G-NICHE', msg: `Niche entry missing slots: ${missingNiche.join(', ')}` });
  let blocks = null;
  try { blocks = LB.blocksFor({ niche, cv }); }
  catch (e) { if (e.code === 'G-BRIEF') gates.push({ code: 'G-BRIEF', msg: e.message }); else throw e; }
  if (gates.length) return { gates, flags, decisions: null, decisionsBlock: null };
  for (const g of LB.briefGaps(blocks.entry)) flags.push({ code: 'F-BRIEF', msg: `${niche._source || niche.trade} type ${blocks.key}: ${g}.` });

  // ── The H1 and the keyword ──
  let h1 = (page.h1 || '').trim();
  if (!h1) { h1 = `${titleCase(primary)} ${townName}`; flags.push({ code: 'F-H1', msg: `The page map has no H1 for ${townName}: "${h1}" ([primary category] [town]) is used.` }); }
  const cat = titleCase(categoryWordOf(h1, townName, primary));
  const catLower = lc(cat);
  const workNoun = (niche.category_work_nouns || {})[lc(primary)] || (niche.category_work_nouns || {})[catLower] || null;
  if (!workNoun) flags.push({ code: 'F-WORK-NOUN', msg: `No work noun for "${primary}" in the niche entry (category_work_nouns): the H2s read "${cat} Services".` });
  const work = workNoun ? titleCase(workNoun) : `${cat} Services`;
  const workLower = lc(work);
  const quoteFree = cv.free_quotes === 'yes' ? 'Free' : '';
  const ctx = {
    kwPhrase: h1, category: primary, cat, catLower, work, workLower, town: townName, city,
    trade: niche.trade || '', tradeLower: niche.trade_lower || '', tradePerson: niche.trade_person || '', tradePersonPlural: niche.trade_person_plural || '',
    customerType: niche.customer_type || '', unitOfWork: niche.unit_of_work || '', areaWide: '',
    companyName: cv.company_name || '', quoteFree,
  };
  const btn = niche.buttons || {};
  ctx.primaryAction = ph(btn.primary_action || '', ctx);
  const { yearFounded, yearsTrading } = yearsTradingOf(cv);
  const emergencyOn = blocks.emergencyOn;
  const kwNatural = `${catLower} in ${townName}`;

  // ── Title, meta, trust, rating, buttons (the category page's rules) ──
  const built = seoTitleFor(h1, cv, titleModifierFor(cv, { yearsTrading, yearFounded, emergencyOn }));
  if (built.tooLong) flags.push({ code: 'F-LEN-TITLE', msg: `Title is ${built.title.length} chars (max 60).` });
  const metaCta = ph(btn.meta_cta || '', ctx);
  const meta = metaFor({ cv, isPerson: isPersonWord(cat), kwNatural, metaCta, yearsTrading, yearFounded, modifier: built.modifier, flags });
  const trust = trustLineFor(cv, niche, { yearsTrading, yearFounded, unitOfWork: ctx.unitOfWork });
  const rating = ratingLineFor(cv);
  const buttons = buttonsFor(cv, ctx.primaryAction, emergencyOn);

  // ── Headings (the location template formulas with the work noun; the town stays in the
  // problems H2; a block brief's own H2 wins for blocks 4 and 5) ──
  const custCap = cap(ctx.customerType);
  const E = blocks.entry;
  const h2 = {
    services:  `Our ${work} Services in ${townName}`,
    content:   `Local ${work} for ${townName} ${custCap}`,
    problems:  phCat(E.problems && E.problems.h2, ctx) || `Common ${work} Problems in ${townName}`,
    cost:      phCat(E.cost && E.cost.h2, ctx) || `What Affects the Cost of ${work} in ${townName}`,
    reviews:   `What ${townName} ${custCap} Say About Our ${work}`,
    process:   ph(btn.process_h2 || 'Your [QUOTE_FREE] Quote in 3 Simple Steps', ctx),
    areas:     `Where We Provide ${work} Around ${townName}`,
    faq:       `${work} Questions Answered`,
    final_cta: ph(`Get a [QUOTE_FREE] ${work} Quote in ${townName}`, ctx),
  };

  // ── Cards: a multi category client's are this town's location category pages (page map
  // order, named by the page's own category word); a single category client's are its town
  // service pages (the plain service name) ──
  const categories = applies.filter(r => r.type === 'category' && live(r));
  const catTitle = key => { const r = categories.find(x => x.info && x.info.category_key === key); return r ? r.title : null; };
  const inTown = r => normLoc(r.info && r.info.town) === normLoc(townName);
  const locCats = applies.filter(r => r.type === 'location_category' && live(r) && inTown(r));
  const townServices = applies.filter(r => r.type === 'town_service' && live(r) && inTown(r));
  const cardMode = categories.length > 1 ? 'categories' : 'services';
  const cards = cardMode === 'categories'
    ? locCats.map(r => { const category = catTitle(r.info.category_key) || r.title; return { name: titleCase(keywordWord(r.h1 || '', townName, category)), category, url: slugOf(r), h1: r.h1 || '', target: 'location-category', linked: true, status: isLinkable({ status: r.status, urlSlug: slugOf(r), pageType: 'category' }) ? 'Launching' : 'Launching' }; })
    : townServices.map(r => { const name = (r.info && r.info.service_name) || keywordWord(r.title || '', townName, r.title); return { name: name.charAt(0).toUpperCase() + name.slice(1), category: catTitle(r.info && r.info.category_key) || '', url: slugOf(r), h1: r.h1 || '', target: 'town-service', linked: true, status: 'Launching' }; });
  if (!cards.length) flags.push({ code: 'F-CARDS', msg: `${townName} has no ${cardMode === 'categories' ? 'location category page' : 'town service page'} to show as a card.` });
  const SHAPES = [
    'Open with the problem the customer has; name what this work does about it.',
    'Open with a short question the customer would ask; answer it with the work.',
    'Open with the work itself as the subject of the sentence.',
    'Open with when people need this (a time of year, a moment in the life of a garden or home).',
    'Open with what goes wrong when this work is done badly; then what we do instead.',
    'Open with the result the customer is after; then how the work gets there.',
    'Open with who this suits; then the work.',
    'Open with the material or method that matters most; then what the customer gets.',
  ];
  const LINK_PHRASES = ['our [X] work', 'the [X] we do', 'a [X] job', 'booking [X]', 'our [X] visits', 'the [X] side of what we do'];
  cards.forEach((c, i) => { c.shape = SHAPES[i % SHAPES.length]; c.link_phrase = LINK_PHRASES[i % LINK_PHRASES.length].replace('[X]', `[${lc(c.name)}](${c.url})`); });

  // ── Blocks 4 and 5, steps, FAQ from the type's town wide briefs (no seasonal swap, no symptom question) ──
  const problems = ((E.problems || {}).cards || []).slice(0, 4).map(c => ({ title: phCat(c.title, ctx), brief: phCat(c.brief || '', ctx), mechanism: phCat(c.mechanism || '', ctx) }));
  const costCards = ((E.cost || {}).cards || []).slice(0, 4).map(c => ({ title: phCat(c.title, ctx), brief: phCat(c.brief || '', ctx) }));
  const stepsRaw = LB.stepsFor(niche, blocks.key, E, { emergencyOn }) || stepsFor(niche, cv, emergencyOn);
  const steps = (stepsRaw || []).slice(0, 3).map(s => ({ title: phCat(s.title, ctx), brief: phCat(s.brief || '', ctx) }));
  if (steps.length < 3) flags.push({ code: 'F-BRIEF', msg: `Only ${steps.length} process step(s) for type ${blocks.key}.` });
  const faqs = LB.pickFaqSlots(E, cv, { quoteFree, max: 5 }).map(q => ({ ...q, question: phCat(q.question, ctx), answer_brief: phCat(q.answer_brief, ctx) }));
  const freq = String(cv.visit_frequency_options || '').trim();
  for (const q of faqs) {
    if (!/\b(?:regular visits|how often|visits work|visit frequency)\b/i.test(q.question)) continue;
    q.answer_brief = `${q.answer_brief} ${freq ? `The frequencies on offer are [CV: visit_frequency_options] (${freq}); name those and no other.` : 'No visit frequency is on file: say the schedule is agreed with you, and nothing more about how often.'}`.trim();
  }
  if (!faqs.some(q => q.slot === 'town')) flags.push({ code: 'F-BRIEF', msg: `Type ${blocks.key} has no town question ("Do you cover [town]?") in its FAQ slots.` });
  const doubts = new Set(faqs.map(q => q.doubt).filter(Boolean));
  const missing5 = ['Price', 'Trust', 'Fit', 'Process', 'Timing'].filter(d => !doubts.has(d));
  if (missing5.length) flags.push({ code: 'N25', msg: `FAQ missing doubts: ${missing5.join(', ')}` });
  const mechanisms = problems.map(p => p.mechanism).filter(Boolean);
  mechanismsUsed = (Array.isArray(mechanismsUsed) ? mechanismsUsed : []).filter(m => m && m.text && !mechanisms.some(o => lc(o) === lc(m.text)));
  // Block 4 sources: the assigned symptoms where they fit, the niche's fears for the rest
  const problemSymptoms = (Array.isArray(symptoms) ? symptoms : []).slice(0, 4);
  const fears = (niche.fears || []).join('; ');
  problems.forEach((p, i) => {
    const s = problemSymptoms[i] || null;
    p.source = s ? { kind: 'symptom', text: s.text, issue: s.issueTitle } : { kind: 'fears', text: fears };
  });

  // ── Reviews: hidden until 3 reviews; then the hand picked three ──
  const reviewCount = cv.review_count ? parseInt(cv.review_count, 10) : 0;
  const picked = (Array.isArray(reviews) ? reviews : []).filter(r => r && String(r.text || '').trim()).slice(0, 3);
  const reviewsShow = reviewCount >= 3 && picked.length > 0;
  if (reviewCount < 3) flags.push({ code: 'F-REVIEWS', msg: `Reviews hidden (review_count=${reviewCount || 'blank'}, needs 3+).` });
  else if (picked.length < 3) flags.push({ code: 'F-REVIEWS', msg: `${picked.length} hand picked review(s) on file; the block wants 3.${picked.length ? '' : ' Hidden.'}` });

  // ── Areas: the villages and neighbourhoods around the town, unlinked ──
  const villages = (town && Array.isArray(town.villages) ? town.villages : []).filter(Boolean);
  if (!villages.length) flags.push({ code: 'F-ALLOC', msg: `No dossier for ${townName}: the areas block has no villages or neighbourhoods to list.` });
  const areas = { linked: [], plain: villages };

  // ── Allocated items: the town profile, up to 2 neighbourhoods, the symptoms ──
  const neighbourhoods = ((allocation && allocation.neighbourhoods) || []).slice(0, 2);
  if (neighbourhoods.length < 2) flags.push({ code: 'F-ALLOC', msg: `${neighbourhoods.length} allocated neighbourhood(s) from the ${townName} dossier; the content block wants 2.` });
  const townProfile = (town && town.profile) || '';
  if (!townProfile) flags.push({ code: 'F-ALLOC', msg: `No town profile for ${townName} (no dossier saved for it).` });
  if (!problemSymptoms.length) flags.push({ code: 'F-ALLOC', msg: `No local symptom for ${townName} left for this page: block 4 is written from the niche fears.` });
  else if (problemSymptoms.length < 4) flags.push({ code: 'F-ALLOC', msg: `${problemSymptoms.length} local symptom(s) for block 4 (4 wanted); the other cards are written from the niche fears.` });
  const allocated = {
    neighbourhoods: neighbourhoods.map(n => ({ name: n.name, type: n.type, conservation: !!n.conservation, profile: n.profile })),
    symptoms: Object.fromEntries(problemSymptoms.map((s, i) => [`problem_${i + 1}`, { text: s.text, issueTitle: s.issueTitle, issueText: s.issueText }])),
    extraText: townProfile,
    townProfile, villages: areas.plain.slice(), scope: 'town',
  };

  // ── Links: the homepage, the cards' pages and the town's town service pages; nothing in another town ──
  const homepage = applies.find(r => r.type === 'homepage');
  const linkable = [];
  const addL = (type, r) => { const url = slugOf(r); if (url && !linkable.some(p => p.url === url)) linkable.push({ type, url, h1: r.h1 || r.title || '' }); };
  if (homepage) addL('homepage', { slug: '/', h1: homepage.h1 || '' });
  for (const c of cards) addL(c.target, { slug: c.url, h1: c.h1 });
  if (cardMode === 'categories') for (const r of townServices) addL('town-service', r);
  const selfUrl = slugOf(page);
  const linkablePages = linkable.filter(p => p.url !== selfUrl);
  const contentLinks = cards.map(c => ({ name: c.name, url: c.url }));
  const townPagePrefix = selfUrl ? `${selfUrl.replace(/\/+$/, '')}/` : null;

  // ── Breadcrumb ──
  const breadcrumb = [{ name: 'Home', url: '/' }, { name: townName, url: null }];

  const decisions = {
    page_type: 'location', scope: 'town', town: townName, city, slug: selfUrl, primary_category: primary,
    type: { letter: blocks.letter, key: blocks.key, a2: blocks.a2, emergency: blocks.emergencyUsed, source: blocks.source },
    d1_years_trading: yearsTrading,
    d2_h1: h1, h1_source: page.h1 ? 'page map' : 'fallback', keyword: kwNatural, cat, cat_lower: catLower, work, work_lower: workLower,
    d3_title: built.title, d4_meta: meta, d5_trust: trust.line, d6_rating: rating,
    d15_buttons: buttons, breadcrumb,
    h2,
    cards, card_mode: cardMode, alsoOffered: [],
    d9: { main: cards.map(c => ({ name: c.name, url: c.url, linked: true, h1: c.h1, services: [] })), alsoOffer: [] },
    problems, cost: costCards, price_line: cv.price_list ? '[CV: price_list]' : null,
    reviews: { show: reviewsShow, items: picked, count: reviewCount },
    niche_steps: steps,
    areas, faq: faqs,
    allocated, ideasUsed: Array.isArray(ideasUsed) ? ideasUsed : [], mechanismsUsed,
    contentLinks, linkablePages, townPagePrefix,
    quoteFree, emergencyOn, coastal: cv.coastal_city === 'yes',
    travel_distance: cv.travel_distance || '',
    seasonal: false,
    trade_facts: null,
    // Fields the shared validator reads on every page type
    d13_expands: false, cta_band: null, locations_hub: null, d14_town: null,
  };
  const decisionsBlock = formatLocationBlock(decisions, cv, niche, ctx);
  return { gates, flags, decisions, decisionsBlock };
}

// The per page message: PAGE, DECISIONS, LINKABLE PAGES, ALLOCATED ITEMS, MODEL FIELDS
function formatLocationBlock(D, cv, niche, ctx) {
  const L = [];
  const push = s => L.push(s);
  push(`PAGE: location page, page_scope: town, slug ${D.slug}, keyword: ${D.d2_h1} (in body copy: "${D.keyword}"), primary category: ${D.primary_category}, town: ${D.town}`);
  push('');
  push('DECISIONS:');
  push('');
  push(`H1: ${D.d2_h1}`);
  push(`SEO title: ${D.d3_title}`);
  push(`Meta description: ${D.d4_meta}`);
  push(`Trust line: ${D.d5_trust || 'none'}`);
  push(`Rating line: ${D.d6_rating || 'none'}`);
  push(`Breadcrumb: ${D.breadcrumb.map(b => b.name).join(' › ')}`);
  push(`Buttons: ${D.d15_buttons.join(' | ')}`);
  push(`Business type: ${D.type.key}${D.type.emergency ? ' (emergency layout)' : ''} (the client's type: the page is town wide)`);
  push(`Reviews block: ${D.reviews.show ? 'SHOWN (the three hand picked reviews are placed by code)' : 'HIDDEN'}`);
  push('');
  push('--- HEADINGS ---');
  push(`Services H2: ${D.h2.services}`);
  push(`Content block H2: ${D.h2.content}`);
  push(`Block 4 (problems in the town) H2: ${D.h2.problems}`);
  push(`Block 5 (cost factors) H2: ${D.h2.cost}`);
  push(`Reviews H2: ${D.reviews.show ? D.h2.reviews : '(section hidden)'}`);
  push(`Process H2: ${D.h2.process}`);
  push(`Areas H2: ${D.h2.areas}`);
  push(`FAQ H2: ${D.h2.faq}`);
  push(`Final CTA H2: ${D.h2.final_cta}`);
  push('');
  push(`--- CARDS (${D.card_mode === 'categories' ? "this town's location category pages, one card each" : "this town's service pages, one card each (single category client)"}) ---`);
  D.cards.forEach((c, i) => {
    push(`  ${i + 1}. ${c.name} → ${c.url} (${c.target === 'location-category' ? `location category page for ${c.category}` : 'town service page'}${c.h1 ? ' | H1: ' + c.h1 : ''})`);
    push(`     Shape: ${c.shape}`);
    push(`     Link text: "${lc(c.name)}" (the plain ${D.card_mode === 'categories' ? 'category' : 'service'} name, never the destination H1, never with the town), inside a sentence as "${c.link_phrase}", never at its start and never the same phrase as another card. 2 or 3 of the client's confirmed services in this ${D.card_mode === 'categories' ? 'category' : 'service'} named in plain words. No neighbourhoods, no villages.`);
  });
  if (!D.cards.length) push('  (none)');
  push('');
  push('--- THE CARDS\' PAGES FOR PARAGRAPH 3 (link 2 or 3 of these, each with a reason, never more than two in a sentence; the cards link the rest) ---');
  for (const l of D.contentLinks) push(`  ${l.name} → ${l.url}`);
  if (!D.contentLinks.length) push('  none');
  push('');
  push('--- BLOCK 4: THE PROBLEMS HOMES IN THIS TOWN HAVE (4 cards, town wide; each card carries its one mechanism and its source: a local symptom, or the niche fears) ---');
  D.problems.forEach((p, i) => {
    push(`  ${i + 1}. ${p.title}`);
    if (p.mechanism) push(`     Mechanism (this card's one cause; no other card, answer or page makes it): ${p.mechanism}`);
    if (p.source) push(`     Source: ${p.source.kind === 'symptom' ? `the local symptom "${p.source.text}" (issue: ${p.source.issue})` : `the niche entry's fears (${p.source.text || 'none listed'}) and the town profile`}`);
    if (p.brief) push(`     Brief: ${p.brief}`);
  });
  push('');
  push('--- BLOCK 5: COST FACTORS (4 cards; where the town profile gives a reason, use it once) ---');
  D.cost.forEach((p, i) => { push(`  ${i + 1}. ${p.title}`); if (p.brief) push(`     Brief: ${p.brief}`); });
  push(`  Price line: ${D.price_line ? 'code adds the price list line from [CV: price_list]' : 'none (no price list on file: no figures anywhere)'}`);
  push('');
  push('--- PROCESS STEPS ---');
  for (const s of D.niche_steps) { push(`  ${s.title}`); if (s.brief) push(`    Brief: ${s.brief}`); }
  push('');
  push('--- FAQ QUESTIONS (one of them the town question; at least one answer links a page in this town) ---');
  for (const q of D.faq) { push(`  ${q.slot}: ${q.question} [${q.doubt}]`); if (q.answer_brief) push(`    → ${q.answer_brief}`); }
  push('');
  push('--- AREA LIST ---');
  push(`  Around ${D.town}, unlinked (code places the list; the areas intro names none of them): ${D.areas.plain.length ? D.areas.plain.join(', ') : 'none on file'}`);
  push('');
  push(`[QUOTE_FREE]: ${D.quoteFree || '(blank — paid quotes)'}`);
  push(`Emergency layout: ${D.emergencyOn ? 'ON' : 'off'}`);
  push(`Primary city coastal: ${D.coastal ? 'yes. Write the travel distance as "inland and along the coast", never compass directions or "in each direction"' : 'no'}`);
  push('Trade facts: none for this page (it explains the town, not the job). Name no material, method or rule the client values do not give.');
  push('');
  push('--- PROOF HOMES (one home per proof; code blocks a fourth mention and any mention outside its home) ---');
  const homes = [];
  if (cv.differentiator_1_confirmed && cv.differentiator_1) homes.push(`${cv.differentiator_1} (differentiator): the meta description and hero sentence 2 already carry it; the content block may say it once more in other words; nowhere else, not the cost intro, not a card, not a step, not an FAQ answer.`);
  if (cv.differentiator_2_confirmed && cv.differentiator_2) homes.push(`${cv.differentiator_2} (differentiator): hero sentence 2 or the content block, once; nowhere else.`);
  homes.push('Years trading, jobs completed, team size: the content block only.');
  homes.push(`Guarantee and insurance: their FAQ answers only${cv.insurance_cover ? ' (the insurance figure in the insurance answer, described, never promised)' : ''}. Never the guarantee length or the insurance figure in the content block.`);
  homes.push('The quote method and the price agreed before work are one proof: the cost intro is its home, 3 mentions on the whole page at most in different words, and never in both the cost FAQ answer and the visits FAQ answer. "Free": the FAQ cost answer and the headings code writes; never in a step.');
  for (const h of homes) push(`  ${h}`);
  push('');
  push(`Content block opener: sentence 1 opens on the town or the work and carries the keyword "${D.keyword}", not the company name. Never on the reader's search ("Finding a ${D.cat_lower} in ${D.town}…", "If you're looking for…"). Three or four short paragraphs, then one closing line: the town (two or three concrete details from the town profile and what each means for the trade); the neighbourhoods (one concrete detail each and what it means for the work); what they do here (links to 2 or 3 of the cards' pages, each with a reason, and one confirmed differentiator not already in the hero); the closing line (a soft push to the primary action, never the phone number). Every paragraph carries a town fact that says something about the work.`);
  push(`Town rule: this page names ${D.town} and no other town, anywhere, including ${D.city}${D.city ? `, except in the areas intro where the base is allowed once as "our base in ${D.city}"` : ''}. A village or neighbourhood from the dossier is not another town. ${D.town} appears in the hero, the services intro, the content block and the areas intro, and at most twice elsewhere in the fields you write.`);
  push(`Areas intro: that the business covers ${D.town} and the villages and neighbourhoods around it (code places the list; name none of them), and how it reaches them from its base${D.travel_distance ? ` (the distance or time only as [CV: travel_distance] gives it: "${D.travel_distance}")` : ' (no distance or time: none is on file)'}. No services, no links, no other towns.`);
  push('No how it\'s done sentence: nothing on this page explains how a job is done (the stages, the method, the materials in order). That belongs to the service pages; a sentence that reads like one of their paragraphs is a fail.');
  push(`The primary category in running text is lower case and used as a person would say it ("our ${D.work_lower} work in ${D.town}", "a ${D.cat_lower} in ${D.town}"), never the H1 label as a phrase outside the hero and content block sentence 1.`);
  push('');
  push('--- HOW THE BUSINESS WORKS ---');
  push('  Only what CONFIRMED PRACTICES in the client block say. Never invent a way of working or a promise about it: no "nothing gets added without you saying so", "each garden gets its own plan", "we stick to the work you asked for", "the price never creeps", "we fit the visit to a time that suits you", "we arrive ready to start", no seasonal pattern of visits, no comparison between the cost of a round and a one off. Say what the work involves, not how the business runs it. Never imply the business has worked in a named place unless [CV: areas_worked] names it.');
  push('');
  push('LINKABLE PAGES:');
  for (const p of D.linkablePages) push(`  [${p.type}] ${p.url} | H1: ${p.h1}`);
  if (!D.linkablePages.length) push('  none');
  push('');
  push('ALLOCATED ITEMS:');
  push(`  How to use the research below: this page lives on local detail, so every paragraph of the content block carries at least one fact from the town profile or a neighbourhood and says, in the same sentence, what it means for ${D.work_lower} here. At most two facts from each neighbourhood or the town profile. A fact used as scenery, with no consequence for the work, fails: never list trees, plants, street features or planning controls for their own sake, and never describe a soil or a flood setting in research terms. Never "dossier" or "research" in the copy.`);
  const A = D.allocated;
  push(`  Town profile: ${D.town}`);
  if (A.townProfile) for (const line of String(A.townProfile).split('\n')) { if (line.trim()) push(`    ${line.trim()}`); }
  else push('    (none on file)');
  if (!A.neighbourhoods.length) push('  Neighbourhoods: none allocated (the neighbourhoods paragraph is written from the town profile alone)');
  for (const n of A.neighbourhoods) {
    push(`  Neighbourhood: ${n.name}${n.conservation ? ' (conservation area)' : ''}`);
    for (const line of String(n.profile || '').split('\n')) if (line.trim()) push(`    ${line.trim()}`);
  }
  const sym = A.symptoms || {};
  const ps = Object.keys(sym).filter(k => k.startsWith('problem_'));
  if (ps.length) {
    push('  Local symptoms for block 4 (use each once at most, where it fits a card; a card with no fitting symptom is written from the niche fears and the town profile):');
    for (const k of ps) {
      push(`    "${sym[k].text}" (issue: ${sym[k].issueTitle})`);
      for (const line of String(sym[k].issueText || '').split('\n')) if (line.trim()) push(`      ${line.trim()}`);
    }
  }
  push(`  MECHANISMS USED (the block 4 causes the town's category and service pages already made, apart from the ones this page's own cards are briefed to make; no card or answer here makes one of these):`);
  if (!D.mechanismsUsed.length) push('    none yet');
  for (const m of D.mechanismsUsed) push(`    - (${m.page}) ${m.text}`);
  push('  IDEAS USED ELSEWHERE (never make these again, in any wording):');
  const mech = D.problems.filter(p => p.mechanism);
  if (!D.ideasUsed.length && !mech.length) push('    none yet');
  for (const p of mech) push(`    - (block 4 card "${p.title}", on this page) the cause: ${p.mechanism}. The FAQ answers and the content block take a different cause.`);
  for (const i of D.ideasUsed) push(`    - (${i.page}) ${i.text}`);
  push('');
  const PT = require('./page-types/location');
  push('MODEL FIELDS:');
  push(`  ${PT.LABELS.hero}`);
  push(`  ${PT.LABELS.servicesIntro}`);
  push(`  ${PT.LABELS.cards}`);
  for (const c of D.cards) push(`    - card_name: ${c.name} | card_text`);
  push(`  ${PT.LABELS.content}`);
  push(`  ${PT.LABELS.block4}`);
  for (const p of D.problems) push(`    - ${PT.LIST_KEYS[PT.LABELS.block4][0]}: ${p.title} | ${PT.LIST_KEYS[PT.LABELS.block4][1]}`);
  push(`  ${PT.LABELS.costIntro}`);
  push(`  ${PT.LABELS.block5}`);
  for (const p of D.cost) push(`    - ${PT.LIST_KEYS[PT.LABELS.block5][0]}: ${p.title} | ${PT.LIST_KEYS[PT.LABELS.block5][1]}`);
  push(`  ${PT.LABELS.steps}`);
  for (const s of D.niche_steps) push(`    - step_title: ${s.title} | step_body`);
  push(`  ${PT.LABELS.areasIntro}`);
  push(`  ${PT.LABELS.faq}`);
  for (const q of D.faq) push(`    - faq_question: ${q.question} | faq_answer`);
  push(`  ${PT.LABELS.finalCta}`);
  push('  MODEL_FLAGS');
  return L.join('\n');
}

module.exports = { computeLocationDecisions, formatLocationBlock, categoryWordOf, primaryCategoryOf };
