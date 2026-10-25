'use strict';

// ── Service page decisions (CORE (17), 25 Oct 2026) ──────────────────────────
// Code makes every decision for one service page (base: "Lawn Mowing Southampton") or
// town service page (town: "Tree Stump Removal Romsey") from the v3 page map, the client
// values, the niche entry's business type blocks (service_page_blocks), the trade facts
// rows for the service, the dossiers and the pages already written. No model calls.
// Returns { gates, flags, decisions, decisionsBlock } in the category page's shape, so
// the shared pipeline (parser, record, validator, retries, reader, store) runs unchanged.
//
// Inputs:
//   cv, niche, keyValueMap (biz_area_N from the hand set-up)
//   rows           the v3 page map rows (page-map/store.js saved), applies or not
//   page           the row this page is: type 'service' or 'town_service'
//   allocation     base page: { neighbourhoods: [{ name, type, conservation, profile }] } (resolved)
//   town           town page: { profile, villages: [names] } from the town's dossier, or null
//   symptoms       [{ id, text, issueTitle, issueText }] assigned to this page (allocation.symptomsForService, resolved)
//   ideasUsed      [{ page, text }] the ideas the homepage, the category page and the sibling service pages made
//   mechanismsUsed [{ page, text }] the block 4 mechanisms of the category page and the sibling service pages
//   reviews        the hand picked reviews [{ text, name, town }]
//   tradeFacts     { verified, file, rows, markdown, missing, counts, hasRule, thin, message } or null;
//                  an unverified or missing pack is a gate (the run refuses the page)

const { ph, cap, titleCase, normArea, stripAdmin, isLinkable, stepsFor, yearsTradingOf, titleModifierFor, seoTitleFor, trustLineFor, ratingLineFor, buttonsFor } = require('./decisions');
const { isAdminArea } = require('./client-files');
const { keywordWord, isPersonWord, phCat } = require('./category-decisions');
const B = require('./service-blocks');

const lc = s => String(s || '').toLowerCase().trim();

// The service page placeholders, then the category and shared ones
function phSvc(text, ctx) {
  if (!text) return text;
  return phCat(String(text)
    .replace(/\[SERVICE_LOWER\]/g, ctx.svcLower || '')
    .replace(/\[SERVICE\]/g, ctx.svc || ''), ctx);
}

const live = r => r && r.applies !== false && ((r.info && r.info.phase) || 1) === 1;
const slugOf = r => (r && r.slug) || '';
const sameName = (a, b) => lc(a) === lc(b);

// A town service page's base service row: by service_name, by service_id, else by the title
// with the town taken off ("Tree stump removal Romsey" → "Tree stump removal")
function baseRowOf(applies, page) {
  const info = (page && page.info) || {};
  const services = applies.filter(r => r.type === 'service');
  if (info.service_name) { const r = services.find(x => sameName(x.title, info.service_name)); if (r) return r; }
  if (info.service_id) { const r = services.find(x => x.info && x.info.service_id === info.service_id); if (r) return r; }
  const stripped = info.town ? String(page.title || '').replace(new RegExp(`\\s+${String(info.town).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '') : page.title;
  return services.find(x => sameName(x.title, stripped)) || null;
}

// The service's other names a dossier or pack row may use: its GBP names and what it absorbed
function namesOf(row) {
  const info = (row && row.info) || {};
  return [...(info.gbp_names || []), ...(info.absorbs || [])].filter(Boolean);
}

function computeServiceDecisions({ cv, niche, keyValueMap = {}, rows = [], page, allocation = null, town = null, symptoms = [], ideasUsed = [], mechanismsUsed = [], reviews = [], tradeFacts = null }) {
  const gates = [];
  const flags = [];
  if (!page || !['service', 'town_service'].includes(page.type)) {
    gates.push({ code: 'G-PAGE', msg: 'Not a service or town service page.' });
    return { gates, flags, decisions: null, decisionsBlock: null };
  }
  const scope = page.type === 'service' ? 'base' : 'town';
  const applies = rows.filter(r => r.applies !== false);
  const baseRow = scope === 'base' ? page : baseRowOf(applies, page);
  const serviceName = baseRow ? baseRow.title : ((page.info && page.info.service_name) || page.title);
  const parentKeys = (baseRow && baseRow.info && baseRow.info.parent_keys) || (page.info && page.info.parent_keys) || [];
  const catKey = (page.info && page.info.category_key) || parentKeys[0] || null;
  const catRow = catKey ? applies.find(r => r.type === 'category' && r.info && r.info.category_key === catKey) : null;
  const category = catRow ? catRow.title : '';
  const city = (keyValueMap.biz_area_1 || '').trim();
  const townName = scope === 'town' ? ((page.info && page.info.town) || '').trim() : city;
  const h1 = (page.h1 || '').trim();

  // ── Gates ──
  if (!h1) gates.push({ code: 'G-H1', msg: `The page map has no H1 for ${page.title}.` });
  if (!baseRow) gates.push({ code: 'G-MAP', msg: `${page.title} has no base service page in the page map.` });
  if (!catRow) gates.push({ code: 'G-MAP', msg: `${page.title} has no parent category page in the page map.` });
  if (!city) gates.push({ code: 'G-MAP', msg: 'The hand set-up has no base town (biz_area_1).' });
  if (scope === 'town' && !townName) gates.push({ code: 'G-MAP', msg: `${page.title} has no town in the page map.` });
  if (!cv.company_name || !cv.phone) gates.push({ code: 'G-INPUT', msg: `${!cv.company_name ? 'company_name' : 'phone'} is blank in client values.` });
  else if (!cv.company_name_gbp_checked) gates.push({ code: 'G-INPUT', msg: 'company_name_gbp_checked is not ticked — verify GBP name before running.' });
  const requiredNiche = ['trade', 'trade_lower', 'trade_person', 'customer_type', 'buttons'];
  const missingNiche = requiredNiche.filter(k => !niche[k]);
  if (missingNiche.length) gates.push({ code: 'G-NICHE', msg: `Niche entry missing slots: ${missingNiche.join(', ')}` });
  // The trade facts pack is the page's main material: an unverified or missing pack refuses the page (serviceGate)
  if (!tradeFacts || !tradeFacts.verified) gates.push({ code: 'G-FACTS', msg: (tradeFacts && tradeFacts.message) || `Service pages are blocked: the trade facts pack for ${niche._source || niche.trade || 'this niche'} is ${tradeFacts ? 'not verified' : 'missing'}. Verify it on the Trade facts page.` });
  let blocks = null;
  try { blocks = B.blocksFor({ niche, cv, category }); }
  catch (e) { if (e.code === 'G-BRIEF') gates.push({ code: 'G-BRIEF', msg: e.message }); else throw e; }
  if (gates.length) return { gates, flags, decisions: null, decisionsBlock: null };
  for (const g of B.briefGaps(blocks.entry)) flags.push({ code: 'F-BRIEF', msg: `${niche._source || niche.trade} type ${blocks.key}: ${g}.` });

  // ── Context ──
  const quoteFree = cv.free_quotes === 'yes' ? 'Free' : '';
  const svc = titleCase(keywordWord(h1, townName, serviceName));
  const svcLower = lc(svc);
  const cat = titleCase(category);
  const catLower = lc(cat);
  const workNoun = (niche.category_work_nouns || {})[lc(category)] || null;
  if (!workNoun) flags.push({ code: 'F-WORK-NOUN', msg: `No work noun for "${category}" in the niche entry (category_work_nouns): the More Services H2 reads "${cat} Services".` });
  const work = workNoun ? titleCase(workNoun) : `${cat} Services`;
  const workLower = lc(work);
  const ctx = {
    kwPhrase: h1, service: serviceName, svc, svcLower, category, cat, catLower, work, workLower, town: townName, city: townName,
    trade: niche.trade || '', tradeLower: niche.trade_lower || '', tradePerson: niche.trade_person || '', tradePersonPlural: niche.trade_person_plural || '',
    customerType: niche.customer_type || '', unitOfWork: niche.unit_of_work || '', areaWide: scope === 'base' ? (cv.area_wide || '') : '',
    companyName: cv.company_name || '', quoteFree,
  };
  const btn = niche.buttons || {};
  ctx.primaryAction = ph(btn.primary_action || '', ctx);
  const { yearFounded, yearsTrading } = yearsTradingOf(cv);
  const emergencyOn = blocks.emergencyOn;
  const kwNatural = `${svcLower} in ${townName}`;

  // ── Title, meta, trust, rating, buttons (the homepage's rules) ──
  const built = seoTitleFor(h1, cv, titleModifierFor(cv, { yearsTrading, yearFounded, emergencyOn }));
  if (built.tooLong) flags.push({ code: 'F-LEN-TITLE', msg: `Title is ${built.title.length} chars (max 60).` });
  const metaCta = ph(btn.meta_cta || '', ctx);
  // "[company] offers [service_lower] in [town] with [proof]" (Brandon, 25 Oct). The years keep
  // their comma; a description of the business ("family run and independent") goes before the
  // verb; a proof that itself says "with" ("fixed prices with no hidden costs") follows a comma
  const stem = `${cv.company_name} offers ${svcLower} in ${townName}`;
  const metaProofs = [];
  if (cv.differentiator_1_confirmed && cv.differentiator_1_sentence) metaProofs.push(cv.differentiator_1_sentence);
  if (yearsTrading !== null && yearsTrading >= 5 && built.modifier !== `Established ${yearFounded}`) metaProofs.push(`established in ${yearFounded}`);
  let meta = null;
  for (const p of metaProofs) {
    const proof = p[0].toLowerCase() + p.slice(1);
    let cand;
    if (/^established/i.test(proof)) cand = `${stem}, ${proof}. ${metaCta}`;
    else if (/^(family|independent|local|owner|small|award)/i.test(proof)) cand = `${cv.company_name}, ${proof}, offers ${svcLower} in ${townName}. ${metaCta}`;
    else if (/\bwith\b/i.test(proof)) cand = `${stem}, ${proof}. ${metaCta}`;
    else cand = `${stem} with ${proof}. ${metaCta}`;
    cand = cand.trim();
    if (cand.length <= 155) { meta = cand; break; }
  }
  if (!meta) {
    meta = `${stem}. ${metaCta}`.trim();
    if (meta.length > 155) flags.push({ code: 'F-LEN-META', msg: `Meta is ${meta.length} chars (max 155).` });
  }
  const trust = trustLineFor(cv, niche, { yearsTrading, yearFounded, unitOfWork: ctx.unitOfWork });
  const rating = ratingLineFor(cv);
  const buttons = buttonsFor(cv, ctx.primaryAction, emergencyOn);

  // ── Headings (the template formulas; a block brief's own H2 wins for What's Included, blocks 4 and 5) ──
  const custCap = cap(ctx.customerType);
  const wide = scope === 'base' ? (ctx.areaWide ? `${city} & ${ctx.areaWide}` : `${city} and Nearby Towns`) : townName;
  const E = blocks.entry;
  const h2 = {
    included:  phSvc(E.included && E.included.h2, ctx) || `What's Included in Our ${svc}`,
    content:   scope === 'base' ? (ctx.areaWide ? `Local ${svc} for ${city} & ${ctx.areaWide} ${custCap}` : `Local ${svc} for ${city} ${custCap}`) : `Local ${svc} for ${townName} ${custCap}`,
    problems:  phSvc(E.problems && E.problems.h2, ctx) || `Signs You Need ${svc}`,
    cost:      phSvc(E.cost && E.cost.h2, ctx) || `What Affects the Cost of ${svc} in ${townName}`,
    reviews:   `What ${townName} ${custCap} Say About Our ${svc}`,
    process:   ph(btn.process_h2 || 'Your [QUOTE_FREE] Quote in 3 Simple Steps', ctx),
    areas:     `Where We Provide ${svc} Across ${wide}`,
    faq:       `${svc} Questions Answered`,
    more:      scope === 'base' ? `Our Other ${work} Services` : `Our Other ${work} Services in ${townName}`,
    final_cta: ph(`Get a [QUOTE_FREE] ${svc} Quote in ${townName}`, ctx),
  };

  // ── What's Included: the service's own Table A stages (6 to 8), in sentence case; the type's
  // role based items only when the pack gives fewer than 6 stages (F-ITEMS-GENERIC) (Brandon, 25 Oct) ──
  const stageRow = (tradeFacts.rows || []).find(r => r.kind === 'standard method' && Array.isArray(r.stages));
  const stages = stageRow ? stageRow.stages : [];
  let included;
  let includedSource;
  if (stages.length >= 6) {
    if (stages.length > 8) flags.push({ code: 'F-ITEMS', msg: `The trade facts give ${stages.length} stages for ${serviceName}; the first 8 are the tick items.` });
    included = stages.slice(0, 8).map(s => ({ title: s.charAt(0).toUpperCase() + s.slice(1), brief: 'This stage of the job, from the trade facts stages row: what is done at this point, as a part of the job someone could check off. Name only what the row and the materials cell give; never a benefit, a proof or a town.', source: 'trade facts' }));
    includedSource = 'trade facts';
  } else {
    included = ((E.included && E.included.items) || []).slice(0, 8).map(it => ({ title: phSvc(it.title, ctx), brief: phSvc(it.brief || '', ctx), source: 'type' }));
    includedSource = 'type';
    flags.push({ code: 'F-ITEMS-GENERIC', msg: `The trade facts give ${stages.length} stage(s) for ${serviceName} (6 wanted): the What's Included items are type ${blocks.key}'s role based set.` });
  }

  // ── More Services cards: the sibling service pages in this category; a town page links the
  // sibling's town service page in this town where one exists, else its base page ──
  const siblings = applies.filter(r => r.type === 'service' && live(r) && r !== baseRow && !sameName(r.title, serviceName) && ((r.info && r.info.parent_keys) || []).includes(catKey));
  const townServices = scope === 'town' ? applies.filter(r => r.type === 'town_service' && live(r) && lc(r.info && r.info.town) === lc(townName)) : [];
  const townServiceFor = s => townServices.find(t => sameName(t.info && t.info.service_name, s.title) || (t.info && s.info && t.info.service_id && t.info.service_id === s.info.service_id));
  const more = siblings.map(s => { const ts = scope === 'town' ? townServiceFor(s) : null; const target = ts || s; return { name: s.title, url: slugOf(target), h1: target.h1 || '', target: ts ? 'town' : 'base', base_url: slugOf(s), status: isLinkable({ status: target.status, urlSlug: slugOf(target), pageType: 'service' }) ? 'Launching' : 'Launching' }; });
  if (!more.length) flags.push({ code: 'F-MORE', msg: `${category} has no other service page: the More Services block is hidden.` });

  // ── Blocks 4 and 5, steps, FAQ from the type's briefs ──
  const problemCards = ((E.problems || {}).cards || []).slice(0, 4).map(c => ({ title: phSvc(c.title, ctx), brief: phSvc(c.brief || '', ctx), mechanism: phSvc(c.mechanism || '', ctx) }));
  const costCards = ((E.cost || {}).cards || []).slice(0, 4).map(c => ({ title: phSvc(c.title, ctx), brief: phSvc(c.brief || '', ctx) }));
  const stepsRaw = Array.isArray(E.steps) && E.steps.length ? (emergencyOn && Array.isArray(E.steps_emergency) && E.steps_emergency.length ? E.steps_emergency : E.steps) : stepsFor(niche, cv, emergencyOn);
  const steps = (stepsRaw || []).slice(0, 3).map(s => ({ title: phSvc(s.title, ctx), brief: phSvc(s.brief || '', ctx) }));
  if (steps.length < 3) flags.push({ code: 'F-BRIEF', msg: `Only ${steps.length} process step(s) for type ${blocks.key}.` });

  // A slot marked when: rule_rows (type B's "rules or standards" question) joins as a sixth when
  // the service has Table C rule rows (Brandon, 25 Oct)
  let faqs = B.pickFaqSlots(E, cv, { quoteFree, ruleRows: !!tradeFacts.hasRule, max: 5 + (tradeFacts.hasRule && (E.faq_slots || []).some(s => s.when === 'rule_rows') ? 1 : 0) }).map(q => ({ ...q, question: phSvc(q.question, ctx), answer_brief: phSvc(q.answer_brief, ctx) }));
  const freq = String(cv.visit_frequency_options || '').trim();
  for (const q of faqs) {
    if (!/\b(?:regular visits|how often|visits work|visit frequency|frequency)\b/i.test(`${q.slot} ${q.question}`)) continue;
    q.answer_brief = `${q.answer_brief} ${freq ? `The frequencies on offer are [CV: visit_frequency_options] (${freq}); name those and no other.` : 'No visit frequency is on file: say the schedule is agreed with you, and nothing more about how often.'}`.trim();
  }
  const seasonal = B.applySeasonal(niche, E, { problems: problemCards, faqs, letter: blocks.letter });
  const problems = seasonal.problems.map(c => ({ ...c, title: phSvc(c.title, ctx), brief: phSvc(c.brief, ctx), mechanism: phSvc(c.mechanism || '', ctx) }));
  const mechanisms = problems.map(p => p.mechanism).filter(Boolean);
  // The type's briefs give every service of that type the same four causes by design, so a
  // sibling's cause that is also this page's own brief cause is not "used elsewhere": only the
  // other pages' own causes (the category page's, a sibling of another type's) are kept
  mechanismsUsed = (Array.isArray(mechanismsUsed) ? mechanismsUsed : []).filter(m => m && m.text && !mechanisms.some(o => lc(o) === lc(m.text)));
  faqs = seasonal.faqs.map(q => ({ ...q, question: phSvc(q.question, ctx), answer_brief: phSvc(q.answer_brief, ctx) }));
  // The first symptom feeds the symptom question, the next four block 4; on a type B page with
  // the seasonal pair on, the seasonal question takes the symptom question's place (Brandon, 25 Oct)
  const faqSymptom = seasonal.symptomSwap ? null : (symptoms[0] || null);
  const problemSymptoms = seasonal.symptomSwap ? symptoms.slice(0, 4) : symptoms.slice(1, 5);
  // Block 4 sources (Brandon, 25 Oct): with fewer than 2 local symptoms, the cards without one are
  // written from the trade facts "what goes wrong" rows, one mechanism each (the card's own)
  const wrongRows = (tradeFacts.rows || []).filter(r => r.kind === 'what goes wrong').map(r => r.text);
  problems.forEach((p, i) => {
    const s = problemSymptoms.length >= 2 ? problemSymptoms[i] : null;
    p.source = s ? { kind: 'symptom', text: s.text, issue: s.issueTitle } : { kind: 'trade facts', text: wrongRows.join(' ') };
  });
  if (seasonal.symptomSwap) {
    faqs.push({ ...seasonal.symptomSwap, question: phSvc(seasonal.symptomSwap.question, ctx), answer_brief: phSvc(seasonal.symptomSwap.answer_brief, ctx) });
  } else if (faqSymptom) {
    const fs = E.faq_symptom || {};
    const sctx = { ...ctx, symptom: faqSymptom.text.replace(/[.!?]\s*$/, '') };
    const frame = fs.frame || '[SYMPTOM]: why does it happen, and what can be done?';
    const used = [...mechanisms, ...mechanismsUsed.map(m => m.text)];
    const otherCause = used.length ? ` Give a cause none of the block 4 cards and none of MECHANISMS USED use (they use: ${used.join('; ')}).` : '';
    faqs.push({ slot: 'symptom', question: phSvc(frame, sctx), answer_brief: phSvc(fs.answer_brief || 'Answer from the assigned symptom and its local issue: the usual cause here in plain words, then what this service does about it.', sctx) + otherCause, doubt: fs.doubt || 'Process', symptom: true });
  } else {
    flags.push({ code: 'F-ALLOC', msg: `No local symptom tagged ${serviceName} or ${category} for the symptom question${scope === 'town' ? ` (${townName} dossier)` : ''}.` });
  }
  const doubts = new Set(faqs.map(q => q.doubt).filter(Boolean));
  const missing5 = ['Price', 'Trust', 'Fit', 'Process', 'Timing'].filter(d => !doubts.has(d));
  if (missing5.length) flags.push({ code: 'N25', msg: `FAQ missing doubts: ${missing5.join(', ')}` });
  // Table C rule rows with no home: the type's slots have no planning or rules question (Brandon, 25 Oct)
  if (tradeFacts.hasRule && !faqs.some(q => /^(?:rules|planning)$/.test(q.slot))) flags.push({ code: 'F-RULE-UNUSED', msg: `The trade facts give ${tradeFacts.counts.rule} rule row(s) for ${serviceName} (${tradeFacts.rows.filter(r => r.kind === 'rule').map(r => r.name).join('; ')}), but type ${blocks.key}'s FAQ slots have no planning or rules question, so no answer carries them.` });

  // ── Reviews: hidden until 3 reviews; then the hand picked three ──
  const reviewCount = cv.review_count ? parseInt(cv.review_count, 10) : 0;
  const picked = (Array.isArray(reviews) ? reviews : []).filter(r => r && String(r.text || '').trim()).slice(0, 3);
  const reviewsShow = reviewCount >= 3 && picked.length > 0;
  if (reviewCount < 3) flags.push({ code: 'F-REVIEWS', msg: `Reviews hidden (review_count=${reviewCount || 'blank'}, needs 3+).` });
  else if (picked.length < 3) flags.push({ code: 'F-REVIEWS', msg: `${picked.length} hand picked review(s) on file; the block wants 3.${picked.length ? '' : ' Hidden.'}` });

  // ── Areas: base page: every town, linked to the town service page for this service where
  // one exists, else that town's location category page for the parent category, else plain;
  // town page: the villages, unlinked ──
  const towns = [];
  for (let i = 2; keyValueMap[`biz_area_${i}`]; i++) towns.push(keyValueMap[`biz_area_${i}`].trim());
  const locCats = applies.filter(r => r.type === 'location_category' && live(r) && r.info && r.info.category_key === catKey);
  const locCatFor = t => locCats.find(r => normArea(r.info.town) === normArea(t) || normArea(r.info.town) === normArea(stripAdmin(t)));
  const allTownServices = applies.filter(r => r.type === 'town_service' && live(r) && (sameName(r.info && r.info.service_name, serviceName) || (r.info && baseRow.info && r.info.service_id && r.info.service_id === baseRow.info.service_id)));
  const townServiceIn = t => allTownServices.find(r => normArea(r.info.town) === normArea(t) || normArea(r.info.town) === normArea(stripAdmin(t)));
  let areas;
  if (scope === 'base') {
    const linked = [], plain = [];
    for (const t of towns) {
      if (isAdminArea(t)) continue;
      const ts = townServiceIn(t);
      const r = ts || locCatFor(t);
      if (r) linked.push({ name: stripAdmin(t), url: slugOf(r), h1: r.h1 || '', type: ts ? 'town-service' : 'location-category' });
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
  if (problemSymptoms.length < 4) flags.push({ code: 'F-ALLOC', msg: `${problemSymptoms.length} local symptom(s) for block 4 (4 wanted); ${problemSymptoms.length < 2 ? 'every card is' : 'the other cards are'} written from the trade facts "what goes wrong" rows, one mechanism each.` });
  const allocated = {
    neighbourhoods: neighbourhoods.map(n => ({ name: n.name, type: n.type, conservation: !!n.conservation, profile: n.profile })),
    symptoms: Object.fromEntries([...(faqSymptom ? [['faq', faqSymptom]] : []), ...problemSymptoms.map((s, i) => [`problem_${i + 1}`, s])].map(([k, s]) => [k, { text: s.text, issueTitle: s.issueTitle, issueText: s.issueText }])),
    extraText: townProfile,
    townProfile, villages: areas.plain.slice(), scope,
  };

  // ── Trade facts flags (the pack is verified: a gate above) ──
  if (tradeFacts.thin) flags.push({ code: 'F-FACTS-THIN', msg: `Only ${tradeFacts.rows.length} trade facts row(s) for ${serviceName}: paragraphs 2 and 3 rest on general knowledge.` });
  const missingRows = (tradeFacts.missing || []).filter(m => /^[ABF]:/.test(m)).map(m => `Table ${m[0]}`);
  if (missingRows.length) flags.push({ code: 'F-FACTS', msg: `The trade facts pack has no row for ${serviceName} in ${missingRows.join(', ')}.` });

  // ── Links ──
  const homepage = applies.find(r => r.type === 'homepage');
  const locPage = scope === 'town' ? applies.find(r => r.type === 'location' && live(r) && normArea(r.title) === normArea(townName)) : null;
  const locCatHere = scope === 'town' ? locCatFor(townName) : null;
  const linkable = [];
  const addL = (type, r) => { const url = slugOf(r); if (url && !linkable.some(p => p.url === url)) linkable.push({ type, url, h1: r.h1 || r.title || '' }); };
  if (homepage) addL('homepage', { slug: '/', h1: homepage.h1 || '' });
  if (scope === 'base') {
    addL('category', catRow);
    for (const c of more) addL('service', { slug: c.url, h1: c.h1 });
    for (const a of areas.linked) addL(a.type, { slug: a.url, h1: a.h1 });
  } else {
    addL('service', baseRow);
    if (locPage) addL('location', locPage);
    if (locCatHere) addL('location-category', locCatHere);
    for (const c of more) { addL(c.target === 'town' ? 'town-service' : 'service', { slug: c.url, h1: c.h1 }); if (c.target === 'town') addL('service', { slug: c.base_url, h1: siblings.find(s => s.title === c.name).h1 }); }
  }
  const selfUrl = slugOf(page);
  const linkablePages = linkable.filter(p => p.url !== selfUrl);
  // Paragraph 4: base page links 2 or 3 of the area pages; town page links the base page once
  const locationLinks = scope === 'base' ? areas.linked.slice(0, 3).map(a => ({ name: a.name, url: a.url, h1: a.h1 })) : [];
  const baseLink = scope === 'town' ? { name: baseRow.title, url: slugOf(baseRow), h1: baseRow.h1 || '' } : null;

  // ── Breadcrumb ──
  const breadcrumb = scope === 'base'
    ? [{ name: 'Home', url: '/' }, { name: category, url: slugOf(catRow) || null }, { name: baseRow.title, url: null }]
    : [{ name: 'Home', url: '/' }, { name: townName, url: locPage ? slugOf(locPage) : null }, { name: baseRow.title, url: null }];

  const decisions = {
    page_type: 'service', scope, service: serviceName, service_names: namesOf(baseRow), category, category_key: catKey, town: townName, city, slug: selfUrl,
    type: { letter: blocks.letter, key: blocks.key, a2: blocks.a2, emergency: blocks.emergencyUsed, source: blocks.source },
    d1_years_trading: yearsTrading,
    d2_h1: h1, keyword: kwNatural, svc, svc_lower: svcLower, cat, cat_lower: catLower, work, work_lower: workLower,
    d3_title: built.title, d4_meta: meta, d5_trust: trust.line, d6_rating: rating,
    d15_buttons: buttons, breadcrumb,
    h2,
    included, included_source: includedSource, more,
    d9: { main: [{ name: baseRow.title, url: slugOf(baseRow), linked: true, h1: baseRow.h1 || '', services: [] }, ...more.map(c => ({ name: c.name, url: c.url, linked: true, h1: c.h1, services: [] }))], alsoOffer: [] },
    problems, cost: costCards, price_line: cv.price_list ? '[CV: price_list]' : null,
    reviews: { show: reviewsShow, items: picked, count: reviewCount },
    niche_steps: steps,
    areas, faq: faqs,
    allocated, ideasUsed: Array.isArray(ideasUsed) ? ideasUsed : [], mechanismsUsed,
    locationLinks, baseLink, linkablePages,
    quoteFree, emergencyOn, coastal: cv.coastal_city === 'yes',
    seasonal: seasonal.swapped,
    trade_facts: { file: tradeFacts.file || null, verified: true, included: true, rows: tradeFacts.rows.length, counts: tradeFacts.counts || {}, missing: tradeFacts.missing || [], has_rule: !!tradeFacts.hasRule, thin: !!tradeFacts.thin },
    // Fields the shared validator reads on every page type
    d13_expands: false, cta_band: null, locations_hub: null, d14_town: null,
  };
  const decisionsBlock = formatServiceBlock(decisions, cv, niche, ctx);
  return { gates, flags, decisions, decisionsBlock };
}

// The per page message: PAGE, DECISIONS, LINKABLE PAGES, ALLOCATED ITEMS, MODEL FIELDS
function formatServiceBlock(D, cv, niche, ctx) {
  const L = [];
  const push = s => L.push(s);
  push(`PAGE: ${D.scope === 'base' ? 'service page' : 'town service page'}, page_scope: ${D.scope}, slug ${D.slug}, keyword: ${D.d2_h1} (in body copy: "${D.keyword}"), service: ${D.service}, category: ${D.category}, town: ${D.town}`);
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
  push(`More Services block: ${D.more.length ? `SHOWN (${D.more.length} cards placed by code; the intro names none of them)` : 'HIDDEN (no other service page in this category: write HIDDEN)'}`);
  push('');
  push('--- HEADINGS ---');
  push(`What's Included H2: ${D.h2.included}`);
  push(`Content block H2: ${D.h2.content}`);
  push(`Block 4 H2: ${D.h2.problems}`);
  push(`Block 5 (cost) H2: ${D.h2.cost}`);
  push(`Reviews H2: ${D.reviews.show ? D.h2.reviews : '(section hidden)'}`);
  push(`Process H2: ${D.h2.process}`);
  push(`Areas H2: ${D.h2.areas}`);
  push(`FAQ H2: ${D.h2.faq}`);
  push(`More Services H2: ${D.more.length ? D.h2.more : '(section hidden)'}`);
  push(`Final CTA H2: ${D.h2.final_cta}`);
  push('');
  push(`--- WHAT'S INCLUDED (${D.included.length} tick items${D.included_source === 'trade facts' ? ', the trade facts stages for this service in order' : `, type ${D.type.key}'s set (the trade facts give too few stages)`}; one item_text each, 4 to 10 words, no full stop, a part of the job from the trade facts, never a benefit, a proof or a town) ---`);
  D.included.forEach((it, i) => { push(`  ${i + 1}. ${it.title}`); if (it.brief) push(`     Brief: ${it.brief}`); });
  if (!D.included.length) push('  (none)');
  push('');
  push('--- BLOCK 4 (4 cards; each card carries its one mechanism and its source: a local symptom, or the trade facts "what goes wrong" rows when fewer than 2 symptoms are allocated) ---');
  D.problems.forEach((p, i) => {
    push(`  ${i + 1}. ${p.title}${p.seasonal ? ' (seasonal)' : ''}`);
    if (p.mechanism) push(`     Mechanism (this card's one cause; no other card, answer or page makes it): ${p.mechanism}`);
    if (p.source) push(`     Source: ${p.source.kind === 'symptom' ? `the local symptom "${p.source.text}" (issue: ${p.source.issue})` : `the trade facts "what goes wrong" rows (${p.source.text || 'none in the pack: write the card from the mechanism and the stages'})`}`);
    if (p.brief) push(`     Brief: ${p.brief}`);
  });
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
  if (D.scope === 'base') {
    push('--- AREA PAGES FOR PARAGRAPH 4 (link 2 or 3, written as the town name or "[service_lower] in [town]", never the bare H1) ---');
    for (const l of D.locationLinks) push(`  ${l.name} → ${l.url}`);
    if (!D.locationLinks.length) push('  none (no town has a page for this service or its category yet: paragraph 4 names the wider area without links)');
  } else {
    push('--- THE BASE PAGE LINK (paragraph 4, exactly once on the page, as "see our full [service_lower] service" or the plain service name) ---');
    push(`  ${D.baseLink.name} → ${D.baseLink.url}`);
  }
  push('');
  push('--- MORE SERVICES CARDS (code places the cards and their links; the intro names no service and no town) ---');
  for (const c of D.more) push(`  ${c.name} → ${c.url} (${c.target === 'town' ? 'town service page' : 'base service page'})`);
  if (!D.more.length) push('  none');
  push('');
  push('--- AREA LIST ---');
  if (D.scope === 'base') {
    for (const a of D.areas.linked) push(`  ${a.name} (linked: ${a.url}, ${a.type === 'town-service' ? 'this service in that town' : 'the category page in that town'})`);
    if (D.areas.plain.length) push(`  Code adds "We also cover ${D.areas.plain.join(', ')}" after the linked list: never say every town has a page, and name none of these in the intro.`);
  } else {
    push(`  Around ${D.town}, unlinked (code places the list; the areas intro names none of them): ${D.areas.plain.length ? D.areas.plain.join(', ') : 'none on file'}`);
  }
  push('');
  push(`[QUOTE_FREE]: ${D.quoteFree || '(blank — paid quotes)'}`);
  push(`Emergency layout: ${D.emergencyOn ? 'ON' : 'off'}`);
  push(`Primary city coastal: ${D.coastal ? 'yes. Write the travel distance as "inland and along the coast", never compass directions or "in each direction"' : 'no'}`);
  const tf = D.trade_facts;
  push(`Trade facts: in the client block (TRADE FACTS), ${tf.rows} row(s) for this service${Object.keys(tf.counts).length ? ` (${Object.entries(tf.counts).map(([k, n]) => `${n} ${k}`).join(', ')})` : ''}${tf.thin ? '. Fewer than 3 rows: say so in MODEL_FLAGS (F-FACTS-THIN) and keep paragraphs 2 and 3 to what the rows give' : ''}`);
  push('');
  push('--- PROOF HOMES (one home per proof; code blocks a fourth mention and any mention outside its home) ---');
  const homes = [];
  if (cv.differentiator_1_confirmed && cv.differentiator_1) homes.push(`${cv.differentiator_1} (differentiator): the meta description and hero sentence 2 already carry it; the content block may say it once more in other words; nowhere else, not the cost intro, not a card, not a step, not an FAQ answer.`);
  if (cv.differentiator_2_confirmed && cv.differentiator_2) homes.push(`${cv.differentiator_2} (differentiator): hero sentence 2 or the content block, once; nowhere else.`);
  homes.push('Years trading, jobs completed, team size: the content block only.');
  homes.push(`Guarantee and insurance: their FAQ answers only${cv.insurance_cover ? ' (the insurance figure in the insurance answer, described, never promised)' : ''}.`);
  homes.push('The quote method and the price agreed before work are one proof: the cost intro is its home, 3 mentions on the whole page at most in different words, and never in both the cost FAQ answer and the visits FAQ answer. "Free": the FAQ cost answer and the headings code writes; never in a step.');
  for (const h of homes) push(`  ${h}`);
  push('');
  push(`Content block opener: sentence 1 opens on the place or the work and carries the keyword "${D.keyword}". Never on the reader's search ("Finding ${D.svc_lower} in ${D.town}…", "If you're looking for…"). Four paragraphs, then the closing line: who and where; how the job is done (the trade facts stages, one timing); what goes wrong without it or done badly (one concrete consequence from the trade facts); where they work.`);
  push('Areas intro: where the business is based and how far it travels, and that this service goes everywhere it covers. It names no services and no towns.');
  push("What's Included items: each a part of the job someone could check off, in the words of the trade facts; never \"ensure\", \"enjoy\", \"peace of mind\", \"hassle free\", a proof or a town. Paragraph 2 may name a stage an item names, but never in the same words.");
  push('Results: never promise a result the business cannot control ("will stay green", "will last 20 years", "guaranteed to", "for life", "never need"). Say what the work does and what it protects against.');
  push('Rules and standards: what usually applies, in plain words, with "usually" or "in most cases"; never the number or the name of a standard, a regulation, an Act, a Part, a Schedule or a Class.');
  push('');
  push('--- HOW THE BUSINESS WORKS ---');
  push('  Only what CONFIRMED PRACTICES in the client block say. Never invent a way of working or a promise about it: no "nothing gets added without you saying so", "each garden gets its own plan", "we stick to the work you asked for", "the price never creeps", "we fit the visit to a time that suits you", "we arrive ready to start", no seasonal pattern of visits, no comparison between the cost of a round and a one off. Say what the work involves, not how the business runs it.');
  push('');
  push('LINKABLE PAGES:');
  for (const p of D.linkablePages) push(`  [${p.type}] ${p.url} | H1: ${p.h1}`);
  if (!D.linkablePages.length) push('  none');
  push('');
  push('ALLOCATED ITEMS:');
  push(`  How to use the research below: at most two facts from each neighbourhood or the town profile, each followed in the same sentence by what it means for ${D.svc_lower}. A fact with no consequence for this service is left out: never list trees, plants, street features or planning controls for their own sake, and never describe a soil or a flood setting in research terms.`);
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
    push('  Local symptoms for block 4 (use each once at most, where it fits a card; a card with no fitting symptom is written from the trade facts):');
    for (const k of ps) {
      push(`    "${sym[k].text}" (issue: ${sym[k].issueTitle})`);
      for (const line of String(sym[k].issueText || '').split('\n')) if (line.trim()) push(`      ${line.trim()}`);
    }
  }
  push('  MECHANISMS USED (the block 4 causes the category page and the sibling service pages already made, apart from the ones this page\'s own cards are briefed to make; no card or answer here makes one of these):');
  if (!D.mechanismsUsed.length) push('    none yet');
  for (const m of D.mechanismsUsed) push(`    - (${m.page}) ${m.text}`);
  push('  IDEAS USED ELSEWHERE (never make these again, in any wording):');
  const mech = D.problems.filter(p => p.mechanism);
  if (!D.ideasUsed.length && !mech.length) push('    none yet');
  for (const p of mech) push(`    - (block 4 card "${p.title}", on this page) the cause: ${p.mechanism}. The FAQ answers and the content block take a different cause.`);
  for (const i of D.ideasUsed) push(`    - (${i.page}) ${i.text}`);
  push('');
  const PT = require('./page-types/service');
  push('MODEL FIELDS:');
  push(`  ${PT.LABELS.hero}`);
  push(`  ${PT.LABELS.includedIntro}`);
  push(`  ${PT.LABELS.included}`);
  for (const it of D.included) push(`    - ${PT.LIST_KEYS[PT.LABELS.included][0]}: ${it.title} | ${PT.LIST_KEYS[PT.LABELS.included][1]}`);
  push(`  ${PT.LABELS.content}`);
  push(`  ${PT.LABELS.block4}`);
  for (const p of D.problems) push(`    - ${PT.LIST_KEYS[PT.LABELS.block4][0]}: ${p.title} | ${PT.LIST_KEYS[PT.LABELS.block4][1]}`);
  push(`  ${PT.LABELS.steps}`);
  for (const s of D.niche_steps) push(`    - step_title: ${s.title} | step_body`);
  push(`  ${PT.LABELS.costIntro}`);
  push(`  ${PT.LABELS.block5}`);
  for (const p of D.cost) push(`    - ${PT.LIST_KEYS[PT.LABELS.block5][0]}: ${p.title} | ${PT.LIST_KEYS[PT.LABELS.block5][1]}`);
  push(`  ${PT.LABELS.areasIntro}`);
  push(`  ${PT.LABELS.faq}`);
  for (const q of D.faq) push(`    - faq_question: ${q.question} | faq_answer`);
  push(`  ${PT.LABELS.moreIntro}${D.more.length ? '' : ' (HIDDEN)'}`);
  push(`  ${PT.LABELS.finalCta}`);
  push('  MODEL_FLAGS');
  return L.join('\n');
}

module.exports = { computeServiceDecisions, formatServiceBlock, phSvc, namesOf, baseRowOf };
