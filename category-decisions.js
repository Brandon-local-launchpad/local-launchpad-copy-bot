'use strict';

// ── Category page decisions (CORE (16), 23 Oct 2026) ─────────────────────────
// Code makes every decision for one category page (base: "Gardener Southampton") or
// location category page (town: "Gardener Winchester") from the v3 page map, the
// client values, the niche entry's business type blocks, the dossiers and the pages
// already written. No model calls. Returns { gates, flags, decisions, decisionsBlock }
// in the homepage's shape, so the shared pipeline (parser, record, validator, retries,
// reader, store) runs unchanged.
//
// Inputs:
//   cv, niche, keyValueMap (biz_area_N from the hand set-up)
//   rows        the v3 page map rows (page-map/store.js saved), applies or not
//   page        the row this page is: type 'category' or 'location_category'
//   allocation  base page: { neighbourhoods: [{ name, type, conservation, profile }] } (resolved)
//   town        town page: { profile, villages: [names] } from the town's dossier, or null
//   symptoms    [{ id, text, issueTitle, issueText }] assigned to this page (allocation.symptomsForCategory, resolved)
//   ideasUsed   [{ page, text }] the ideas the homepage, the siblings and the location page made
//   reviews     the hand picked reviews [{ text, name, town }]
//   tradeFacts  { markdown, missing, verified, file } or null

const { ph, cap, titleCase, normArea, stripAdmin, isLinkable, stepsFor, yearsTradingOf, titleModifierFor, seoTitleFor, trustLineFor, ratingLineFor, buttonsFor } = require('./decisions');
const { isAdminArea } = require('./client-files');
const B = require('./category-blocks');

const lc = s => String(s || '').toLowerCase().trim();
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The category page placeholders, then the shared ones (ph). [CAT] is the page keyword
// without the town (Gardener); [WORK] is the category's work noun (Gardening), from the
// niche entry's category_work_nouns, else "[CAT] Services" (Brandon, 23 Oct).
function phCat(text, ctx) {
  if (!text) return text;
  return ph(String(text)
    .replace(/\[CAT_LOWER\]/g, ctx.catLower || '')
    .replace(/\[CAT\]/g, ctx.cat || '')
    .replace(/\[WORK_LOWER\]/g, ctx.workLower || '')
    .replace(/\[WORK\]/g, ctx.work || '')
    .replace(/\[TOWN\]/g, ctx.town || '')
    .replace(/\[SYMPTOM\]/g, ctx.symptom || ''), ctx);
}

// "Gardener Winchester" with town "Winchester" → "Gardener"; else the category name
function keywordWord(h1, town, category) {
  const h = String(h1 || '').trim();
  if (town && new RegExp(`\\s${esc(town)}$`, 'i').test(h)) return h.slice(0, h.length - town.length).trim();
  return h || category;
}

// "gardener" → a person word (is a gardener); "driveways", "garden design" → work (offers)
const PERSON_RE = /(?:er|or|ist|ian|eon|man|men|smith|wright)s?$/i;
const isPersonWord = w => PERSON_RE.test(String(w || '').trim().split(/\s+/).pop() || '') && !/^(?:cover|water|timber|render|plaster|shutter|gutter|order|floor|paver)s?$/i.test(String(w || '').trim().split(/\s+/).pop());

// The row's phase 1 and applies: the page exists for linking
const live = r => r && r.applies !== false && ((r.info && r.info.phase) || 1) === 1;
const slugOf = r => (r && r.slug) || '';

function computeCategoryDecisions({ cv, niche, keyValueMap = {}, rows = [], page, allocation = null, town = null, symptoms = [], ideasUsed = [], reviews = [], tradeFacts = null }) {
  const gates = [];
  const flags = [];
  if (!page || !['category', 'location_category'].includes(page.type)) {
    gates.push({ code: 'G-PAGE', msg: 'Not a category or location category page.' });
    return { gates, flags, decisions: null, decisionsBlock: null };
  }
  const scope = page.type === 'category' ? 'base' : 'town';
  const applies = rows.filter(r => r.applies !== false);
  const catKey = page.info && page.info.category_key;
  const catRow = applies.find(r => r.type === 'category' && r.info && r.info.category_key === catKey) || (scope === 'base' ? page : null);
  const category = catRow ? catRow.title : (page.info && page.info.category) || page.title;
  const city = (keyValueMap.biz_area_1 || '').trim();
  const townName = scope === 'town' ? ((page.info && page.info.town) || '').trim() : city;
  const h1 = (page.h1 || '').trim();

  // ── Gates ──
  if (!h1) gates.push({ code: 'G-H1', msg: `The page map has no H1 for ${page.title}.` });
  if (!catKey || !catRow) gates.push({ code: 'G-MAP', msg: `${page.title} has no category row in the page map.` });
  if (!city) gates.push({ code: 'G-MAP', msg: 'The hand set-up has no base town (biz_area_1).' });
  if (scope === 'town' && !townName) gates.push({ code: 'G-MAP', msg: `${page.title} has no town in the page map.` });
  if (!cv.company_name || !cv.phone) gates.push({ code: 'G-INPUT', msg: `${!cv.company_name ? 'company_name' : 'phone'} is blank in client values.` });
  else if (!cv.company_name_gbp_checked) gates.push({ code: 'G-INPUT', msg: 'company_name_gbp_checked is not ticked — verify GBP name before running.' });
  const requiredNiche = ['trade', 'trade_lower', 'trade_person', 'customer_type', 'buttons'];
  const missingNiche = requiredNiche.filter(k => !niche[k]);
  if (missingNiche.length) gates.push({ code: 'G-NICHE', msg: `Niche entry missing slots: ${missingNiche.join(', ')}` });
  let blocks = null;
  try { blocks = B.blocksFor({ niche, cv, category }); }
  catch (e) { if (e.code === 'G-BRIEF') gates.push({ code: 'G-BRIEF', msg: e.message }); else throw e; }
  if (gates.length) return { gates, flags, decisions: null, decisionsBlock: null };
  for (const g of B.briefGaps(blocks.entry)) flags.push({ code: 'F-BRIEF', msg: `${niche._source || niche.trade} type ${blocks.key}: ${g}.` });

  // ── Context ──
  const quoteFree = cv.free_quotes === 'yes' ? 'Free' : '';
  const cat = titleCase(keywordWord(h1, townName, category));
  const catLower = lc(cat);
  // The work noun: every H2 but the H1 and the services line reads "Gardening", never "Gardener"
  const workNoun = (niche.category_work_nouns || {})[lc(category)] || (niche.category_work_nouns || {})[catLower] || null;
  if (!workNoun) flags.push({ code: 'F-WORK-NOUN', msg: `No work noun for "${category}" in the niche entry (category_work_nouns): the H2s read "${cat} Services".` });
  const work = workNoun ? titleCase(workNoun) : `${cat} Services`;
  const workLower = lc(work);
  const ctx = {
    kwPhrase: h1, category, cat, catLower, work, workLower, town: townName, city: townName,
    trade: niche.trade || '', tradeLower: niche.trade_lower || '', tradePerson: niche.trade_person || '', tradePersonPlural: niche.trade_person_plural || '',
    customerType: niche.customer_type || '', unitOfWork: niche.unit_of_work || '', areaWide: scope === 'base' ? (cv.area_wide || '') : '',
    companyName: cv.company_name || '', quoteFree,
  };
  const btn = niche.buttons || {};
  ctx.primaryAction = ph(btn.primary_action || '', ctx);
  const { yearFounded, yearsTrading } = yearsTradingOf(cv);
  const emergencyOn = blocks.emergencyOn;
  const kwNatural = `${catLower} in ${townName}`;

  // ── Title, meta, trust, rating, buttons (the homepage's rules) ──
  const built = seoTitleFor(h1, cv, titleModifierFor(cv, { yearsTrading, yearFounded, emergencyOn }));
  if (built.tooLong) flags.push({ code: 'F-LEN-TITLE', msg: `Title is ${built.title.length} chars (max 60).` });
  const metaCta = ph(btn.meta_cta || '', ctx);
  const verb = isPersonWord(cat) ? 'is a' : 'offers';
  const metaProofs = [];
  if (cv.differentiator_1_confirmed && cv.differentiator_1_sentence) metaProofs.push(cv.differentiator_1_sentence);
  if (yearsTrading !== null && yearsTrading >= 5 && built.modifier !== `Established ${yearFounded}`) metaProofs.push(`established in ${yearFounded}`);
  let meta = null;
  // "[company] is a [category_lower] in [town] with [proof]" (Brandon, 25 Oct); the years fallback keeps its comma
  // A proof that itself says "with" ("fixed prices with no hidden costs") is joined with "offering",
  // a description of the business ("family run and independent") goes before the trade, the years keep their comma
  for (const p of metaProofs) {
    const proof = p[0].toLowerCase() + p.slice(1);
    let cand;
    if (/^established/i.test(proof)) cand = `${cv.company_name} ${verb} ${kwNatural}, ${proof}. ${metaCta}`;
    else if (/^(family|independent|local|owner|small|award)/i.test(proof) && verb === 'is a') cand = `${cv.company_name} is a ${proof} ${kwNatural}. ${metaCta}`;
    else if (/\bwith\b/i.test(proof)) cand = `${cv.company_name} ${verb} ${kwNatural} offering ${proof}. ${metaCta}`;
    else cand = `${cv.company_name} ${verb} ${kwNatural} with ${proof}. ${metaCta}`;
    cand = cand.trim();
    if (cand.length <= 155) { meta = cand; break; }
  }
  if (!meta) {
    meta = `${cv.company_name} ${verb} ${kwNatural}. ${metaCta}`.trim();
    if (meta.length > 155) flags.push({ code: 'F-LEN-META', msg: `Meta is ${meta.length} chars (max 155).` });
  }
  const trust = trustLineFor(cv, niche, { yearsTrading, yearFounded, unitOfWork: ctx.unitOfWork });
  const rating = ratingLineFor(cv);
  const buttons = buttonsFor(cv, ctx.primaryAction, emergencyOn);

  // ── Headings (the template formulas; a block brief's own H2 wins for blocks 4 and 5) ──
  const custCap = cap(ctx.customerType);
  const wide = scope === 'base' ? (ctx.areaWide ? `${city} & ${ctx.areaWide}` : `${city} and Nearby Towns`) : townName;
  const h2 = {
    services:  `Our ${cat} Services in ${townName}`,
    content:   scope === 'base' ? (ctx.areaWide ? `Local ${work} for ${city} & ${ctx.areaWide} ${custCap}` : `Local ${work} for ${city} ${custCap}`) : `Local ${work} for ${townName} ${custCap}`,
    problems:  phCat(blocks.entry.problems && blocks.entry.problems.h2, ctx) || `Common ${work} Problems`,
    cost:      phCat(blocks.entry.cost && blocks.entry.cost.h2, ctx) || `What Affects the Cost of ${work} in ${townName}`,
    reviews:   `What ${townName} ${custCap} Say About Our ${work}`,
    process:   ph(btn.process_h2 || 'Your [QUOTE_FREE] Quote in 3 Simple Steps', ctx),
    areas:     `Where We Provide ${work} Across ${wide}`,
    faq:       `${work} Questions Answered`,
    final_cta: ph(`Get a [QUOTE_FREE] ${work} Quote in ${townName}`, ctx),
  };

  // ── Cards: the category's service pages, page map order; a town page links the town
  // service page where one exists for this town, else the base service page ──
  const services = applies.filter(r => r.type === 'service' && (r.info && r.info.parent_keys || []).includes(catKey));
  const townServices = scope === 'town' ? applies.filter(r => r.type === 'town_service' && live(r) && lc(r.info && r.info.town) === lc(townName)) : [];
  const cards = services.filter(live).map(s => {
    const ts = townServices.find(t => lc(t.info && t.info.service_name) === lc(s.title) || (t.info && t.info.category_key === catKey && lc(t.title) === lc(`${s.title} ${townName}`)));
    const target = ts || s;
    return { name: s.title, url: slugOf(target), h1: target.h1 || '', target: ts ? 'town' : 'base', base_url: slugOf(s), linked: true, status: isLinkable({ status: target.status, urlSlug: slugOf(target), pageType: 'service' }) ? 'Launching' : 'Launching' };
  });
  if (!cards.length) flags.push({ code: 'F-CARDS', msg: `${category} has no service page to show as a card.` });
  // A mentioned name that only restates the category or a card ("Gardening services", "Garden
  // work" on the Gardener page) is a GBP variant, not another service: left out (Brandon, 25 Oct)
  const GENERIC_WORDS = new Set(['service', 'services', 'work', 'works', 'job', 'jobs', 'general', 'and', 'or', 'the', 'installation', 'install', 'fitting', 'company', 'contractor', 'contractors', 'local', 'professional']);
  const stems = s => new Set(lc(s).split(/[^a-z0-9]+/).filter(w => w && !GENERIC_WORDS.has(w)).map(w => w.replace(/(ings?|ers?|ies|s)$/, '')));
  const known = [category, cat, ...cards.map(c => c.name)].map(stems);
  const isVariant = name => { const st = stems(name); return !st.size || known.some(k => [...st].every(w => k.has(w))); };
  const alsoOffered = [
    ...(((catRow.info || {}).links || {}).mentioned || []),
    ...services.filter(s => !live(s)).map(s => s.title),
  ].filter((n, i, a) => n && a.findIndex(x => lc(x) === lc(n)) === i).filter(n => !isVariant(n));
  // Each card its own opening shape, as on the homepage
  const SHAPES = [
    'Open with the problem the customer has; name what the service does about it.',
    'Open with a short question the customer would ask; answer it with the work.',
    'Open with the work itself as the subject of the sentence.',
    'Open with when people need this (a time of year, a moment in the life of a garden or home).',
    'Open with what goes wrong when this work is done badly; then what we do instead.',
    'Open with the result the customer is after; then how the work gets there.',
    'Open with who this suits; then the work.',
    'Open with the material or method that matters most; then what the customer gets.',
  ];
  // ...and its own way of carrying the link, so the cards don't all read "Our [service] work…"
  // (loop round 1: five of six cards opened that way because every card was shown the same example)
  const LINK_PHRASES = ['our [X] work', 'a [X] visit', 'booking [X]', 'our [X] rounds', 'a [X] job', 'the [X] we do'];
  cards.forEach((c, i) => { c.shape = SHAPES[i % SHAPES.length]; c.link_phrase = LINK_PHRASES[i % LINK_PHRASES.length].replace('[X]', `[${lc(c.name)}](${c.url})`); });

  // ── Blocks 4 and 5, steps, FAQ from the type's briefs ──
  const problemCards = ((blocks.entry.problems || {}).cards || []).slice(0, 4).map(c => ({ title: phCat(c.title, ctx), brief: phCat(c.brief || '', ctx) }));
  const costCards = ((blocks.entry.cost || {}).cards || []).slice(0, 4).map(c => ({ title: phCat(c.title, ctx), brief: phCat(c.brief || '', ctx) }));
  const stepsRaw = Array.isArray(blocks.entry.steps) && blocks.entry.steps.length ? (emergencyOn && Array.isArray(blocks.entry.steps_emergency) && blocks.entry.steps_emergency.length ? blocks.entry.steps_emergency : blocks.entry.steps) : stepsFor(niche, cv, emergencyOn);
  const steps = (stepsRaw || []).slice(0, 3).map(s => ({ title: phCat(s.title, ctx), brief: phCat(s.brief || '', ctx) }));
  if (steps.length < 3) flags.push({ code: 'F-BRIEF', msg: `Only ${steps.length} process step(s) for type ${blocks.key}.` });

  // Symptoms: the first (non urgent first, dossier order) feeds the symptom FAQ; the next
  // four are the local causes for the problems block
  const faqSymptom = symptoms[0] || null;
  const problemSymptoms = symptoms.slice(1, 5);
  let faqs = B.pickFaqSlots(blocks.entry, cv, { quoteFree }).map(q => ({ ...q, question: phCat(q.question, ctx), answer_brief: phCat(q.answer_brief, ctx) }));
  const seasonal = B.applySeasonal(niche, blocks.entry, { problems: problemCards, faqs });
  const problems = seasonal.problems.map(c => ({ ...c, title: phCat(c.title, ctx), brief: phCat(c.brief, ctx) }));
  faqs = seasonal.faqs.map(q => ({ ...q, question: phCat(q.question, ctx), answer_brief: phCat(q.answer_brief, ctx) }));
  if (faqSymptom) {
    const fs = blocks.entry.faq_symptom || {};
    const sctx = { ...ctx, symptom: faqSymptom.text.replace(/[.!?]\s*$/, '') };
    const frame = fs.frame || '[SYMPTOM]: why does it happen, and what can be done?';
    faqs.push({ slot: 'symptom', question: phCat(frame, sctx), answer_brief: phCat(fs.answer_brief || 'Answer from the assigned symptom and its local issue: the usual cause here in plain words, then what the business does about it.', sctx), doubt: fs.doubt || 'Process', symptom: true });
  } else {
    flags.push({ code: 'F-ALLOC', msg: `No local symptom tagged ${category} for the symptom question${scope === 'town' ? ` (${townName} dossier)` : ''}.` });
  }
  const doubts = new Set(faqs.map(q => q.doubt).filter(Boolean));
  const missing5 = ['Price', 'Trust', 'Fit', 'Process', 'Timing'].filter(d => !doubts.has(d));
  if (missing5.length) flags.push({ code: 'N25', msg: `FAQ missing doubts: ${missing5.join(', ')}` });

  // ── Reviews: hidden until 3 reviews; then the hand picked three ──
  const reviewCount = cv.review_count ? parseInt(cv.review_count, 10) : 0;
  const picked = (Array.isArray(reviews) ? reviews : []).filter(r => r && String(r.text || '').trim()).slice(0, 3);
  const reviewsShow = reviewCount >= 3 && picked.length > 0;
  if (reviewCount < 3) flags.push({ code: 'F-REVIEWS', msg: `Reviews hidden (review_count=${reviewCount || 'blank'}, needs 3+).` });
  else if (picked.length < 3) flags.push({ code: 'F-REVIEWS', msg: `${picked.length} hand picked review(s) on file; the block wants 3.${picked.length ? '' : ' Hidden.'}` });

  // ── Areas ──
  const towns = [];
  for (let i = 2; keyValueMap[`biz_area_${i}`]; i++) towns.push(keyValueMap[`biz_area_${i}`].trim());
  const locCats = applies.filter(r => r.type === 'location_category' && r.info && r.info.category_key === catKey);
  const locCatFor = t => locCats.find(r => normArea(r.info.town) === normArea(t) || normArea(r.info.town) === normArea(stripAdmin(t)));
  let areas;
  if (scope === 'base') {
    const linked = [], plain = [];
    for (const t of towns) {
      if (isAdminArea(t)) continue;
      const r = locCatFor(t);
      if (r && live(r)) linked.push({ name: stripAdmin(t), url: slugOf(r), h1: r.h1 || '' });
      else plain.push(stripAdmin(t));
    }
    linked.sort((a, b) => a.name.localeCompare(b.name));
    plain.sort((a, b) => a.localeCompare(b));
    areas = { linked, plain };
  } else {
    const villages = (town && Array.isArray(town.villages) ? town.villages : []).filter(Boolean);
    if (!villages.length) flags.push({ code: 'F-ALLOC', msg: `No dossier for ${townName}: the areas block has no villages or neighbourhoods to list.` });
    areas = { linked: [], plain: villages };
  }

  // ── Allocated items ──
  const neighbourhoods = scope === 'base' ? ((allocation && allocation.neighbourhoods) || []) : [];
  if (scope === 'base' && neighbourhoods.length < 2) flags.push({ code: 'F-ALLOC', msg: `${neighbourhoods.length} allocated neighbourhood(s); the content block needs 2.` });
  const townProfile = scope === 'town' ? ((town && town.profile) || '') : '';
  if (scope === 'town' && !townProfile) flags.push({ code: 'F-ALLOC', msg: `No town profile for ${townName} (no dossier saved for it).` });
  if (problemSymptoms.length < 4) flags.push({ code: 'F-ALLOC', msg: `${problemSymptoms.length} local symptom(s) for the problems block (4 wanted); the other bodies are written from the trade facts.` });
  // The validator's shape: the research text the copy may draw numbers and places from
  const allocated = {
    neighbourhoods: neighbourhoods.map(n => ({ name: n.name, type: n.type, conservation: !!n.conservation, profile: n.profile })),
    symptoms: Object.fromEntries([...(faqSymptom ? [['faq', faqSymptom]] : []), ...problemSymptoms.map((s, i) => [`problem_${i + 1}`, s])].map(([k, s]) => [k, { text: s.text, issueTitle: s.issueTitle, issueText: s.issueText }])),
    extraText: townProfile,
    townProfile, villages: areas.plain.slice(), scope,
  };

  // ── Links ──
  const homepage = applies.find(r => r.type === 'homepage');
  const siblingsBase = applies.filter(r => r.type === 'category' && live(r) && r.info && r.info.category_key !== catKey);
  const locPage = scope === 'town' ? applies.find(r => r.type === 'location' && live(r) && normArea(r.title) === normArea(townName)) : null;
  const siblingsTown = scope === 'town' ? applies.filter(r => r.type === 'location_category' && live(r) && lc(r.info && r.info.town) === lc(townName) && r.info.category_key !== catKey) : [];
  const myLocCats = locCats.filter(live);
  const linkable = [];
  const addL = (type, r) => { const url = slugOf(r); if (url && !linkable.some(p => p.url === url)) linkable.push({ type, url, h1: r.h1 || r.title || '' }); };
  if (homepage) addL('homepage', { slug: '/', h1: homepage.h1 || '' });
  for (const c of cards) addL(c.target === 'town' ? 'town-service' : 'service', { slug: c.url, h1: c.h1 });
  if (scope === 'town') for (const c of cards) if (c.target === 'town') addL('service', { slug: c.base_url, h1: services.find(s => s.title === c.name).h1 });
  if (scope === 'base') { for (const r of siblingsBase) addL('category', r); for (const r of myLocCats) addL('location-category', r); }
  else { if (locPage) addL('location', locPage); for (const r of siblingsTown) addL('location-category', r); }
  const selfUrl = slugOf(page);
  const linkablePages = linkable.filter(p => p.url !== selfUrl);
  // Section 3 link set: the cards' targets. Section 4: 2 or 3 location category pages (base), the siblings in town (town)
  const contentLinks = cards.map(c => ({ name: c.name, url: c.url }));
  const locationLinks = scope === 'base'
    ? towns.filter(t => !isAdminArea(t)).map(locCatFor).filter(r => r && live(r)).slice(0, 3).map(r => ({ name: r.info.town, url: slugOf(r), h1: r.h1 || '' }))
    : siblingsTown.map(r => ({ name: catRowName(applies, r.info.category_key) || r.title, url: slugOf(r), h1: r.h1 || '' }));

  // ── Breadcrumb ──
  const breadcrumb = scope === 'base'
    ? [{ name: 'Home', url: '/' }, { name: category, url: null }]
    : [{ name: 'Home', url: '/' }, { name: townName, url: locPage ? slugOf(locPage) : null }, { name: category, url: null }];

  // ── Trade facts ──
  if (!tradeFacts) flags.push({ code: 'F-FACTS', msg: 'No trade facts pack for this niche: cards, problems and cost factors are written without it.' });
  else if (!tradeFacts.verified) flags.push({ code: 'F-FACTS', msg: `The trade facts pack ${tradeFacts.file || ''} is not verified: its rows are left out of the message.` });
  else if ((tradeFacts.missing || []).length) flags.push({ code: 'F-FACTS', msg: `The trade facts pack has no row for: ${tradeFacts.missing.join(', ')}.` });

  const decisions = {
    page_type: 'category', scope, category, category_key: catKey, town: townName, city, slug: selfUrl,
    type: { letter: blocks.letter, key: blocks.key, a2: blocks.a2, emergency: blocks.emergencyUsed, source: blocks.source },
    d1_years_trading: yearsTrading,
    d2_h1: h1, keyword: kwNatural, cat, cat_lower: catLower, work, work_lower: workLower,
    d3_title: built.title, d4_meta: meta, d5_trust: trust.line, d6_rating: rating,
    d15_buttons: buttons, breadcrumb,
    h2,
    cards, alsoOffered,
    d9: { main: cards.map(c => ({ name: c.name, url: c.url, linked: true, h1: c.h1, services: [] })), alsoOffer: alsoOffered },
    problems, cost: costCards, price_line: cv.price_list ? '[CV: price_list]' : null,
    reviews: { show: reviewsShow, items: picked, count: reviewCount },
    niche_steps: steps,
    areas, faq: faqs,
    allocated, ideasUsed: Array.isArray(ideasUsed) ? ideasUsed : [],
    contentLinks, locationLinks, linkablePages,
    quoteFree, emergencyOn, coastal: cv.coastal_city === 'yes',
    seasonal: seasonal.swapped,
    trade_facts: tradeFacts ? { file: tradeFacts.file || null, verified: !!tradeFacts.verified, missing: tradeFacts.missing || [], included: !!tradeFacts.verified } : null,
    // Fields the shared validator reads on every page type
    d13_expands: false, cta_band: null, locations_hub: null, d14_town: null,
  };
  const decisionsBlock = formatCategoryBlock(decisions, cv, niche, ctx);
  return { gates, flags, decisions, decisionsBlock };
}

function catRowName(applies, key) {
  const r = applies.find(x => x.type === 'category' && x.info && x.info.category_key === key);
  return r ? r.title : null;
}

// The per page message: PAGE, DECISIONS, LINKABLE PAGES, ALLOCATED ITEMS, MODEL FIELDS
function formatCategoryBlock(D, cv, niche, ctx) {
  const L = [];
  const push = s => L.push(s);
  push(`PAGE: ${D.scope === 'base' ? 'category page' : 'location category page'}, page_scope: ${D.scope}, slug ${D.slug}, keyword: ${D.d2_h1} (in body copy: "${D.keyword}"), category: ${D.category}, town: ${D.town}`);
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
  push(`Business type: ${D.type.key}${D.type.emergency ? ' (emergency layout)' : ''}${D.seasonal ? ', seasonal swap on' : ''}`);
  push(`Reviews block: ${D.reviews.show ? 'SHOWN (the three hand picked reviews are placed by code)' : 'HIDDEN'}`);
  push('');
  push('--- HEADINGS ---');
  push(`Services H2: ${D.h2.services}`);
  push(`Content block H2: ${D.h2.content}`);
  push(`Block 4 (common problems) H2: ${D.h2.problems}`);
  push(`Block 5 (cost factors) H2: ${D.h2.cost}`);
  push(`Reviews H2: ${D.reviews.show ? D.h2.reviews : '(section hidden)'}`);
  push(`Process H2: ${D.h2.process}`);
  push(`Areas H2: ${D.h2.areas}`);
  push(`FAQ H2: ${D.h2.faq}`);
  push(`Final CTA H2: ${D.h2.final_cta}`);
  push('');
  push('--- SERVICE CARDS (card list) ---');
  D.cards.forEach((c, i) => {
    push(`  ${i + 1}. ${c.name} → ${c.url} (${c.target === 'town' ? 'town service page' : 'base service page'}${c.h1 ? ' | H1: ' + c.h1 : ''})`);
    push(`     Shape: ${c.shape}`);
    push(`     Link text: "${lc(c.name)}"${D.scope === 'town' ? ' (the plain service name, no town)' : ' (the service name, words in order)'}, inside a sentence as "${c.link_phrase}", never at its start and never the same phrase as another card`);
  });
  if (!D.cards.length) push('  (none)');
  push(`  Also offered (no page; one sentence, no links): ${D.alsoOffered.length ? D.alsoOffered.join(', ') : 'none (write HIDDEN)'}`);
  push('');
  push('--- SECTION 3 LINK SET (content block, paragraph 2: link 3 of these at most, each in its own clause with its own reason; the cards link the rest) ---');
  for (const l of D.contentLinks) push(`  ${l.name} → ${l.url}`);
  push('');
  push(`--- ${D.scope === 'base' ? 'LOCATION CATEGORY PAGES FOR PARAGRAPH 4 (link 2 or 3, as the town name or "[category_lower] in [town]")' : 'SIBLING PAGES IN THIS TOWN (paragraph 4 may link one)'} ---`);
  for (const l of D.locationLinks) push(`  ${l.name} → ${l.url}`);
  if (!D.locationLinks.length) push('  none');
  push('');
  push('--- BLOCK 4: COMMON PROBLEMS (4 cards) ---');
  D.problems.forEach((p, i) => { push(`  ${i + 1}. ${p.title}${p.seasonal ? ' (seasonal)' : ''}`); if (p.brief) push(`     Brief: ${p.brief}`); });
  push('');
  push('--- BLOCK 5: COST FACTORS (4 cards) ---');
  D.cost.forEach((p, i) => { push(`  ${i + 1}. ${p.title}`); if (p.brief) push(`     Brief: ${p.brief}`); });
  push(`  Price line: ${D.price_line ? 'code adds the price list line from [CV: price_list]' : 'none (no price list on file: no figures anywhere)'}`);
  push('');
  push('--- PROCESS STEPS ---');
  for (const s of D.niche_steps) { push(`  ${s.title}`); if (s.brief) push(`    Brief: ${s.brief}`); }
  push('');
  push('--- FAQ QUESTIONS ---');
  for (const q of D.faq) { push(`  ${q.slot}: ${q.question} [${q.doubt}${q.symptom ? ', symptom' : ''}]`); if (q.answer_brief) push(`    → ${q.answer_brief}`); }
  push('');
  push('--- AREA LIST ---');
  if (D.scope === 'base') {
    for (const a of D.areas.linked) push(`  ${a.name} (linked: ${a.url})`);
    if (D.areas.plain.length) push(`  Code adds "We also cover ${D.areas.plain.join(', ')}" after the linked list: never say every town has a page, and name none of these in the intro.`);
  } else {
    push(`  Around ${D.town}, unlinked (code places the list; the areas intro names none of them): ${D.areas.plain.length ? D.areas.plain.join(', ') : 'none on file'}`);
  }
  push('');
  push(`[QUOTE_FREE]: ${D.quoteFree || '(blank — paid quotes)'}`);
  push(`Emergency layout: ${D.emergencyOn ? 'ON' : 'off'}`);
  push(`Primary city coastal: ${D.coastal ? 'yes. Write the travel distance as "inland and along the coast", never compass directions or "in each direction"' : 'no'}`);
  push(`Trade facts: ${D.trade_facts && D.trade_facts.included ? 'in the client block (TRADE FACTS)' : 'none for this page: name no material, method or rule the client values do not give'}`);
  push('');
  push('--- PROOF HOMES (one home per proof; code blocks a fourth mention and any mention outside its home) ---');
  const homes = [];
  if (cv.differentiator_1_confirmed && cv.differentiator_1) homes.push(`${cv.differentiator_1} (differentiator): the meta description and hero sentence 2 already carry it; the content block may say it once more in other words; nowhere else, not the cost intro, not a card, not a step, not an FAQ answer.`);
  if (cv.differentiator_2_confirmed && cv.differentiator_2) homes.push(`${cv.differentiator_2} (differentiator): hero sentence 2 or the content block, once; nowhere else.`);
  homes.push('Years trading, jobs completed, team size: the content block only.');
  homes.push(`Guarantee and insurance: their FAQ answers only${cv.insurance_cover ? ' (the insurance figure in the insurance answer, described, never promised)' : ''}.`);
  homes.push('The quote method: the cost intro only. "Free": the FAQ cost answer and the headings code writes; never in a step.');
  for (const h of homes) push(`  ${h}`);
  push('');
  push('--- HOW THE BUSINESS WORKS ---');
  push('  Only what CONFIRMED PRACTICES in the client block say. Never invent a way of working or a promise about it: no "nothing gets added without you saying so", "each garden gets its own plan", "we stick to the work you asked for", "the price never creeps", "we fit the visit to a time that suits you", "we arrive ready to start", no seasonal pattern of visits, no comparison between the cost of a round and a one off. Say what the work involves, not how the business runs it.');
  push('');
  push('LINKABLE PAGES:');
  for (const p of D.linkablePages) push(`  [${p.type}] ${p.url} | H1: ${p.h1}`);
  if (!D.linkablePages.length) push('  none');
  push('');
  push('ALLOCATED ITEMS:');
  push('  How to use the research below: at most two facts from each neighbourhood or the town profile, each followed in the same sentence by what it means for ' + D.cat_lower + ' work (the mowing, the hedges, the beds, the boundaries). A fact with no consequence for the work is left out: never list trees, plants, street features or planning controls for their own sake, and never describe a soil or a flood setting in research terms.');
  const A = D.allocated;
  if (D.scope === 'base') {
    if (!A.neighbourhoods.length) push('  Neighbourhoods: none allocated');
    for (const n of A.neighbourhoods) {
      push(`  Neighbourhood: ${n.name}${n.conservation ? ' (conservation area)' : ''}`);
      for (const line of String(n.profile || '').split('\n')) if (line.trim()) push(`    ${line.trim()}`);
    }
  } else {
    push(`  Town profile: ${D.town}`);
    if (A.townProfile) for (const line of String(A.townProfile).split('\n')) { if (line.trim()) push(`    ${line.trim()}`); }
    else push('    (none on file)');
  }
  const sym = A.symptoms || {};
  if (sym.faq) {
    push(`  Symptom for the FAQ (${D.faq.find(q => q.symptom).question}): "${sym.faq.text}"`);
    push(`    Linked issue: ${sym.faq.issueTitle}`);
    for (const line of String(sym.faq.issueText || '').split('\n')) if (line.trim()) push(`    ${line.trim()}`);
  }
  const ps = Object.keys(sym).filter(k => k.startsWith('problem_'));
  if (ps.length) {
    push('  Local symptoms for the problems block (use each once at most, where it fits a problem; a problem with no fitting symptom is written from the trade facts):');
    for (const k of ps) {
      push(`    "${sym[k].text}" (issue: ${sym[k].issueTitle})`);
      for (const line of String(sym[k].issueText || '').split('\n')) if (line.trim()) push(`      ${line.trim()}`);
    }
  }
  push('  IDEAS USED ELSEWHERE (never make these again, in any wording):');
  if (!D.ideasUsed.length) push('    none yet');
  for (const i of D.ideasUsed) push(`    - (${i.page}) ${i.text}`);
  push('');
  const PT = require('./page-types/category');
  push('MODEL FIELDS:');
  push(`  ${PT.LABELS.hero}`);
  push(`  ${PT.LABELS.servicesIntro}`);
  push(`  ${PT.LABELS.cards}`);
  for (const c of D.cards) push(`    - card_name: ${c.name} | card_text`);
  push(`  ${PT.LABELS.alsoOffered}${D.alsoOffered.length ? '' : ' (HIDDEN)'}`);
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

module.exports = { computeCategoryDecisions, formatCategoryBlock, keywordWord, isPersonWord, phCat };
