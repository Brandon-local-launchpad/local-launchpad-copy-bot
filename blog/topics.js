'use strict';

// ── The blog topic queue: B1 with Amendment 1 and the blog question bank (28 Oct 2026) ──
// Reserved in the same sorting step that hands questions to every other page
// (faq-service.js assignmentFor). The pages keep first claim on the trade question bank
// (the client's FAQ research): the blog takes only what the sorting step held back,
// "held for a Cost Guide page" and "no page for these", plus the trade's approved blog
// question bank (blog/bank.js, run once per trade), the dossiers and the niche's seasonal
// topics. Code only, deterministic: the same inputs give the same list.
//
// The order (Brandon, 28 Oct):
//   1. the trade level cost guide ("[trade] cost in [city]", the Homepage cost guide), its
//      wording and stack from the bank's general cost topic when there is one;
//   2. one cost guide per main service (the client's jobs wanted order, else page map order):
//      a held cost question for the service gives the wording, else the bank's cost topic
//      for the service, else the code's own question;
//   3. every other held cost question, as a cost guide on its page;
//   4. the held "no page for these" questions, the client's own customers' first ("X or Y",
//      "repair or replace", "do I need" and the niche's decision pairs run as decision posts);
//   5. the bank's topics: cost, then decision and question, the ranked ones first;
//   6. one local post per town with a dossier condition no page uses, then the seasonal topics.
// 16 topics for the onboarding batch; what is left stays for the Search Console batches.
//
// B6 and B7: a held topic's stack and FAQ questions come from the held pool (same service,
// same town for a local post); a bank topic's are its related questions, the first 3 to 5 in
// doubt order as the H2s and the next 3 to 5 as the FAQ. A related question a page already
// uses (the same wording) is dropped before it is used, as the site wide check asks.
//
// A question written by code (a cost guide with no held question or bank topic, a local or
// seasonal post) needs a person's approval on the queue (F-WORDING), as a Search Console
// wording does; a held question's wording is approved on the FAQ card, a bank's with the bank.

const { slugify } = require('../page-map/slugs');
const { pageFinder } = require('../faq-sort');
const { bestServiceFor } = require('./inputs');
const { blocksFor } = require('./blocks');
const { parseDossier } = require('../geo-dossier');
const { seasonalMonth, parseDate } = require('./queue');
const P = require('../trade-facts/pack');
const SQ = require('./same-question');
const CG = require('./cost-guide');
const LIB = require('../niche-library/library');
// A month or a season in a timing row: the window a "When …" H1 needs (Brandon, 28 Oct)
const MONTH_RE = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|winter|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b/i;

const TARGET = 16;
// A seasonal topic that opens on a verb ("Lay new turf", "Prepare the garden for winter")
const SEASONAL_VERB = /^(lay|prepare|plant|cut|clear|book|check|clean|fit|install|replace|repair|paint|treat|seed|sow|feed|mow|trim|prune|protect|service|get|order|move|start|finish)\b/i;
const DOUBT_ORDER = ['Fit', 'Process', 'Price', 'Timing', 'Trust'];
const SC_TARGET = 6; // a Search Console batch (B16): six posts, one a month
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const lc = s => String(s || '').toLowerCase().trim();
const idNum = id => parseInt(String(id).replace(/\D/g, ''), 10) || 0;
const built = p => !/^not[\s_]?built$/i.test(p.status || '') && !!(p.urlSlug || '').trim();
const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'nor', 'but', 'of', 'in', 'on', 'for', 'to', 'at', 'by', 'with', 'from']);
const titleCase = s => String(s || '').split(/\s+/).map((w, i) => (i && SMALL.has(lc(w)) ? lc(w) : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
const question = s => { const t = titleCase(String(s || '').trim().replace(/[?.!]+$/, '')); return t ? `${t}?` : ''; };

// B2: the post type from the wording and the niche's decision pairs
const DECISION_RE = /\b(?:repair or replace|replace or repair|do i need|should i|is it worth|which is (?:better|best|cheaper)|what(?:'s| is) (?:better|best|the difference)|versus|vs\.?)\b|\b[a-z]+ or [a-z]+\b/i;
function postTypeOf(q, decisionPairs = []) {
  const w = norm(q.wording || q.text || q.question);
  if (q.doubt === 'Price' && /\b(how much|cost|price)\b/.test(w)) return 'cost_guide';
  if (q.town || q.local || q.page === 'Location') return 'local';
  if (decisionPairs.some(p => w.includes(norm(p)))) return 'decision';
  if (DECISION_RE.test(w)) return 'decision';
  return 'question';
}

// A question's doubt order, then its research order
const byDoubt = (a, b) => (DOUBT_ORDER.indexOf(a.doubt) + 1 || 9) - (DOUBT_ORDER.indexOf(b.doubt) + 1 || 9) || idNum(a.id) - idNum(b.id);
// The client's own customers' questions first, then the research order (rank, then id)
const byOrder = (a, b) => (a.source === 'client' ? 0 : 1) - (b.source === 'client' ? 0 : 1) || (a.rank || 999) - (b.rank || 999) || idNum(a.id) - idNum(b.id);

// bank: the trade's approved blog question bank (blog/bank.js parseBank) or null
// pageWordings: the normalised wordings the pages use (the assignment's placed questions and
// the written pages' FAQ questions), so a bank question a page already uses is dropped
// launchDate: 'YYYY-MM-DD' or null. The batch's order (Brandon, 28 Oct): the cost guides; the
// seasonal topics whose publish month falls inside the six months from the launch (none can
// be placed without a launch date); at least two local posts from the main towns' dossier
// conditions; then the held and bank decision and question posts; then the other local and
// seasonal topics. The gates on each post are decided downstream (blog/decisions.js).
// batch: 'onboarding' (B1) or 'search_console' (B16, the amendment): six slots in this order, a
// seasonal topic whose publish month falls in the batch's six months (from batchStart), the
// Search Console queries (scQuestions, most impressions first; source search_console, the query
// kept on the post), the approved FAQ research questions left over from B1, then unused dossier
// conditions; no cost guides and no bank posts. existingRows: the queue's rows already there (an
// earlier batch's), whose questions, conditions and keys are taken.
function reserveBlogTopics({ assignment, cv = {}, niche = {}, keyValueMap = {}, pages = [], serviceParentMap = {}, dossiers = [], allocationRecord = null, usedSymptoms = new Set(), bank = null, pageWordings = new Set(), launchDate = null, target = TARGET, minLocal = 2, batch: batchKind = 'onboarding', batchStart = null, scQuestions = [], existingRows = [] } = {}) {
  const flags = [];
  const held = (assignment && assignment.held) || {};
  const sc = batchKind === 'search_console';
  if (sc) { target = Math.min(target, SC_TARGET); minLocal = 0; launchDate = batchStart || launchDate; }
  const takenIds = new Set(existingRows.map(r => (r.info || {}).question_id).filter(Boolean));
  const takenConditions = new Set(existingRows.map(r => ((r.info || {}).dossier_condition || {}).id).filter(Boolean));
  const takenKeys = new Set(existingRows.map(r => r.slug).filter(Boolean));
  const pool = [...(held.costGuide || []), ...(held.noPage || [])].filter(q => !takenIds.has(q.id)).sort(byOrder);
  // The Search Console queries, as questions ahead of the pool (B16's second slot)
  const scItems = sc ? scQuestions.map((q, i) => ({ id: q.id || `SC-${i + 1}`, text: q.wording, wording: q.wording, source: 'search_console', source_query: q.query, impressions: q.impressions || 0, position: q.position || 0, doubt: '', page: '', service: q.service || '', local: !!q.town, town: q.town || '', approved: !!q.approved, needsFact: false, seen: 'Search Console', seenCount: q.impressions || 0, url: '', dated: '', rank: null })).sort((a, b) => b.impressions - a.impressions) : [];
  if (sc) for (const q of scItems) pool.push(q);
  const city = String(keyValueMap.biz_area_1 || '').trim();
  const tradeLower = niche.trade_lower || lc(niche.trade) || '';
  const slots = blocksFor({ niche, cv });
  const services = pages.filter(p => p.pageType === 'service' && built(p));
  const used = new Set();        // held question ids used as a target, in a stack or as an FAQ
  const usedBank = new Set();    // bank topic and related question ids used
  const usedWordings = new Set([...pageWordings].map(norm));
  const topics = [];
  const keys = new Set(takenKeys);
  const finder = pageFinder({ cv, pages, keyValueMap, serviceParentMap, niche });
  const pageFor = q => finder.pageFor(q);
  const isLocalQ = q => !!(q.town || q.local || q.page === 'Location');
  const keyFor = base => { let k = `/guides/${slugify(base)}`; let n = 2; while (keys.has(k)) k = `/guides/${slugify(base)}-${n++}`; keys.add(k); return k; };
  let group = 'cost';
  const add = t => { topics.push({ batch: sc ? `search_console:${batchStart || ''}` : 'onboarding', query_stack: [], faq_ids: [], stack: [], faq: [], flags: [], group, order: topics.length, ...t }); return topics[topics.length - 1]; };
  const qRef = q => ({ id: q.id, wording: q.wording || q.text, approved: !!q.approved, usable: q.usable !== false && !!q.approved, doubt: q.doubt || '', service: q.service || '', town: q.town || '', source: q.source || 'research' });
  // The UK page name from the services library ("Turf laying", never "Sod installation"), for a
  // page title that is still the Google Business Profile name
  let lib = null;
  try { lib = LIB.loadLibrary(niche._source || P.packNameFor(niche.trade)); } catch (_) { lib = null; }
  const ukName = title => { const t = String(title || '').trim(); if (!lib || !t) return t; const e = (lib.rows || []).find(r => lc(r.gbp_name) === lc(t)); return e && e.target && e.verdict !== 'exclude' ? e.target : t; };
  const pageRef = p => (p ? { title: ukName(p.pageTitle), slug: p.urlSlug } : null);
  // The built service page for a pack service ("Lawn care" → /services/lawn-care; "Turf laying" → the
  // page whose name shares its stems, else none), so a seasonal or dossier post links a real page (B8)
  const servicePageFor = packService => {
    if (!packService) return null;
    const found = pageFor({ service: packService, page: 'Service', text: packService });
    if (found.service) return found.service;
    const hit = bestServiceFor(packService, services.map(p => ({ key: p.urlSlug, value: p.pageTitle })));
    return hit ? services.find(p => p.urlSlug === hit.key) || null : null;
  };
  // "Spring lawn care" → "How to get your lawn ready for spring in Southampton"; "Lay new turf" → "How to lay new turf in Southampton"
  const howToWording = (topic, town) => {
    const m = lc(topic).match(/^(spring|summer|autumn|winter) (.+)$/);
    if (m) { const thing = m[2].replace(/\b(?:care|maintenance|work|jobs?|tasks?)\b/g, '').replace(/\s+/g, ' ').trim() || 'garden'; return `how to get your ${thing} ready for ${m[1]} in ${town}`; }
    return `how to ${lc(topic)} in ${town}`;
  };
  // "The lawn stays soggy for days after rain" → "Why Does My Lawn Stay Soggy for Days After Rain in Southampton?"
  const homeownerQuestion = (symptom, town) => {
    let s = lc(symptom).replace(/[.?!]+$/, '').trim();
    // "The lawn" is the homeowner's own ("my lawn"); "a puddle", "water", "one patch" stay as they are
    s = s.replace(/^(?:the|my|our|your)\s+/, 'my ').replace(/^my\s+(?:new|newly|old)\s+/, 'my ');
    const w = s.split(' ');
    // The verb goes to its base form after "does" ("stays" → "stay", "forms" → "form"); "is" and
    // "has" make the question themselves ("why is my new turf drying out", "why has my lawn gone brown")
    const i = w.findIndex((x, k) => k > 0 && /^(?:is|are|has|have|was|were)$/.test(x));
    let base;
    if (i > 0) base = `why ${w[i]} ${[...w.slice(0, i), ...w.slice(i + 1)].join(' ')}`;
    else {
      const v = w.findIndex((x, k) => k > 0 && /[a-z]s$/.test(x) && !/(?:ss|us|is|ous|ies)$/.test(x) && x.length > 3);
      if (v > 0) w[v] = w[v].replace(/ies$/, 'y').replace(/(?:sh|ch|x|z|o|ss)es$/, m => m.slice(0, -2)).replace(/s$/, '');
      base = `why does ${w.join(' ')}`;
    }
    let q = question(`${base} in ${town}`);
    if (q.length > 70) q = question(base);
    if (q.length > 70) q = question(base.replace(/,.*$/, '').replace(/\s+(?:after|when|during|every|in the)\b.*$/, ''));
    if (q.length > 70) q = q.slice(0, 69).replace(/\s+\S*$/, '') + '?';
    return q;
  };

  // ── The bank: its topics in rank order, and a page for each ──
  const bankTopics = bank && Array.isArray(bank.topics) ? bank.topics : [];
  // A v2 bank (Brandon, 28 Oct): every post takes its questions from its own block only. A decision
  // or question post from its BT block, a cost guide's FAQ from its service's CT block (the trade
  // level CT block feeds the homepage cost guide), a seasonal post from its ST block, whose window
  // joins FACTS ALLOWED as a sourced row. No borrowing: the tasks list match and the fourth cost
  // guide FAQ source are the v1 bank's only. Under three H2s and three FAQ questions, held.
  const v2 = !!(bank && bank.version === 2);
  const costBlocks = v2 && Array.isArray(bank.costTopics) ? bank.costTopics : [];
  const seasonalBlocks = v2 && Array.isArray(bank.seasonalTopics) ? bank.seasonalTopics : [];
  const sameName = (a, b) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || (x.length >= 5 && y.length >= 5 && (x.includes(y) || y.includes(x)))); };
  const GENERAL_RE = /^general$/i;
  // A flag raised once, though the stacking runs again when the batch refills
  const flagOnce = (t, code, msg) => { if (!t.flags.some(f => f.code === code && f.msg === msg)) t.flags.push({ code, msg }); };
  const rankOf = new Map((bank && bank.ranked ? bank.ranked : []).map((id, i) => [id, i]));
  const bankOrder = (a, b) => (rankOf.has(a.id) ? rankOf.get(a.id) : 1000 + idNum(a.id)) - (rankOf.has(b.id) ? rankOf.get(b.id) : 1000 + idNum(b.id));
  // A bank topic's page: the sorting step's lookup on its service word, else the service page
  // whose name shares the word's stems ("Patios and paving" → Patio paving), else its category
  const candidates = services.map(p => ({ key: p.urlSlug, value: p.pageTitle }));
  const bankPage = t => {
    if (!t.service || /^general$/i.test(t.service)) return { service: null, category: null };
    const found = pageFor({ service: t.service, page: 'Service', text: t.question });
    if (found.service) return found;
    // The bank names a service by its UK library name ("Artificial grass installation" for the Artificial Turf Installation page), as the CT blocks do (29 Oct)
    const byUk = services.find(p => sameName(t.service, ukName(p.pageTitle)) || sameName(t.service, p.pageTitle));
    if (byUk) return { service: byUk, category: null };
    const hit = bestServiceFor(t.service, candidates);
    if (hit) return { service: services.find(p => p.urlSlug === hit.key) || null, category: null };
    // A word of the service on a page's name, on the stem ("Decking" is the Deck installation page, else the Deck Builder category): the client offers it (B1, 29 Oct)
    // The job words (removal, installation, repair) and the trade's own words (roof, roofing, landscaping) name no service: "Chimney removal" is chimney, "Roof coatings" is coating
    const JOB_WORDS = new Set(['install', 'installation', 'installations', 'repair', 'repairs', 'replacement', 'replacements', 'removal', 'cleaning', 'clearing', 'clearance', 'design', 'designs', 'maintenance', 'service', 'services', 'fitting', 'fitted', 'laying', 'work', 'works', 'building', 'construction', 'conversion', 'conversions', 'treatment', 'treatments', 'solutions', 'company', 'contractor', 'contractors', 'specialist', 'specialists', 'system', 'systems'].map(stemOf));
    const tradeWords = new Set([niche.trade, niche.trade_person, niche.trade_lower, tradeLower].filter(Boolean).flatMap(x => norm(x).split(' ')).flatMap(w => [stemOf(w), w.replace(/(ers?|ing)$/, '')]).filter(Boolean));
    const wordsOf = x => new Set(norm(x).split(' ').filter(w => w.length >= 4 && !GENERIC.has(w)).map(stemOf).filter(w => !JOB_WORDS.has(w) && !tradeWords.has(w) && !tradeWords.has(w.replace(/(ers?|ing)$/, ''))));
    const want = wordsOf(t.service);
    if (want.size) {
      const hitPage = list => list.find(p => [...wordsOf(p.pageTitle)].some(w => want.has(w)));
      const sp = hitPage(services);
      if (sp) return { service: sp, category: null };
      const cp = hitPage(pages.filter(p => p.pageType === 'category' && built(p)));
      if (cp) return { service: null, category: cp };
    }
    return found;
  };
  const bankType = t => (t.type === 'cost' ? 'cost_guide' : t.type === 'decision' ? 'decision' : t.type === 'question' ? 'question' : postTypeOf({ wording: t.question, doubt: '' }, slots.decision_pairs));
  // A bank topic's related questions in doubt order, the ones a page uses dropped
  // A related question must match the post's own question (Brandon, 28 Oct): the key words it
  // shares with the target (stems of four letters or more, the stop words and the trade's
  // generic words out), a third of the target's at least; ranked by that share, then doubt order
  const GENERIC = new Set(['garden', 'gardens', 'cost', 'costs', 'much', 'does', 'need', 'needs', 'should', 'could', 'would', 'better', 'best', 'what', 'which', 'when', 'where', 'why', 'how', 'can', 'will', 'there', 'they', 'this', 'that', 'with', 'from', 'into', 'your', 'have', 'been', 'make', 'take', 'work', 'service', 'services', 'installation', 'install', lc(city), ...lc(niche.trade || '').split(/s+/)]);
  const stemOf = w => w.replace(/(ing|ed|es|s)$/, '');
  // The same stems the same-question test uses (its equivalents folded: soggy and waterlogged, puddles and pooling), the generic words and the caller's out
  const keyWords = (s, ex = new Set()) => new Set([...SQ.questionStems(s, { exclude: [...GENERIC, ...ex] })].filter(w => w.length >= 3 && !ex.has(w) && !ex.has(stemOf(w))));
  // The service's own words ("lawn", "turf", "drainage") are not key words (Brandon, 28 Oct): a
  // related question must share another word with the post's question
  const serviceStems = t => new Set(norm(`${t.service ? t.service.title : ''} ${t.pack_service || ''} ${t.question && t.question.service ? t.question.service : ''}`).split(' ').filter(w => w.length >= 4 && !STOP.has(w)).map(stemOf).flatMap(w => [w, w.replace(/age$/, '')]));
  // The share of the target's key words the question carries, over three of them at most, so
  // one shared key word is the floor on a long target and ranking still prefers the questions
  // that share more
  const relatedScore = (target, q, ex = new Set()) => { const T = keyWords(target, ex), Q = keyWords(q, ex); if (!T.size || !Q.size) return 0; let n = 0; for (const w of T) if (Q.has(w) || [...Q].some(x => x.length >= 5 && w.length >= 5 && (x.startsWith(w) || w.startsWith(x)))) n++; return n / Math.min(T.size, 3); };
  const RELATED_MIN = 1 / 3;
  // The FAQ never rephrases one of the H2s: a candidate that means the same as a stack question is out
  const unlike = (stack, cands, ex) => cands.filter(c => !stack.some(s => SQ.sameQuestion(s.question, c.question, { exclude: [city, niche.trade || '', ...ex] })));
  // A question another post in the batch (or a page) already asks, in any words
  const usedList = [...pageWordings];
  const takenQ = (q, ex = new Set()) => usedWordings.has(norm(q)) || !!SQ.findSame(q, usedList, { exclude: [city, niche.trade || '', ...ex] });
  const useQ = q => { usedWordings.add(norm(q)); usedList.push(q); };
  const rankRelated = (target, list, ex) => list.map(r => ({ r, s: relatedScore(target, r.question, ex) })).filter(x => x.s >= RELATED_MIN).sort((a, b) => b.s - a.s || byDoubt(a.r, b.r)).map(x => x.r);
  const relatedOf = (t, target, ex = new Set(), { own = v2 } = {}) => {
    const kept = [], dropped = [], weak = [];
    // A block the post owns (a v2 bank's, or the block a Search Console query took) keeps every related
    // question, the best matched first; otherwise the ones that share a key word with the post's question
    for (const r of [...t.related].sort(byDoubt)) { if (usedBank.has(r.id)) continue; if (takenQ(r.question, ex)) dropped.push(r); else if (own || relatedScore(target || t.question, r.question, ex) >= RELATED_MIN) kept.push(r); else weak.push(r); }
    const ranked = own ? kept.map(r => ({ r, s: relatedScore(target || t.question, r.question, ex) })).sort((a, b) => b.s - a.s || byDoubt(a.r, b.r)).map(x => x.r) : rankRelated(target || t.question, kept, ex);
    return { kept: ranked, dropped, weak };
  };
  const bankRef = t => ({ id: t.id, wording: t.question, approved: true, usable: true, doubt: '', service: t.service || '', town: '', source: 'blog_bank', url: t.url || '' });
  // The cost guide's fixed H2s, for the FAQ dedupe at reservation (the question forms of both modes)
  const costGuideH2Words = topic => { try { const svc = topic.service ? topic.service.title : (niche.trade || ''); const a = CG.costGuideH2s({ service: svc, city, trade: niche.trade, tradePerson: niche.trade_person || '', costUnit: slots.cost_unit, mode: 'prices', homepage: !!topic.homepage_cost_guide, have: { price: true, factors: true, quote: true, timing: true } }); const b = CG.costGuideH2s({ service: svc, city, trade: niche.trade, tradePerson: niche.trade_person || '', costUnit: slots.cost_unit, mode: 'factors', homepage: !!topic.homepage_cost_guide, have: { factors: true, quote: true, timing: true } }); return [...a.h2s, ...b.h2s].map(h => h.wording); } catch (_) { return []; } };
  // A cost guide's FAQ (the structure): the bank's related questions on its cost topic first, then
  // other bank cost topics on the same service, then the held cost questions from the sort; never
  // one that rephrases an H2; fewer than three and the post is held
  // A v2 bank: the CT block for a cost guide, the one its question came from, else the one on its
  // service (the page's UK name), the General block for the homepage cost guide
  const costBlockFor = topic => {
    if (topic.question && /^CT-/.test(topic.question.id)) return costBlocks.find(b => b.id === topic.question.id) || null;
    if (topic.question && topic.question.block) return costBlocks.find(b => b.id === topic.question.block) || null;
    if (topic.homepage_cost_guide) return costBlocks.find(b => GENERAL_RE.test(b.service || '') || (tradeLower && norm(b.question).includes(norm(tradeLower)))) || null;
    if (!topic.service) return null; // a cost question naming no service page has no block (the trade block is the homepage guide's)
    return costBlocks.find(b => sameName(b.service, topic.service.title)) || costBlocks.find(b => relatedScore(topic.service.title, b.service || '') >= 1) || null;
  };
  const fillCostGuideFaq = (topic, { late = false } = {}) => {
    const h2s = costGuideH2Words(topic);
    const ex = serviceStems(topic);
    const notH2 = q => !SQ.findSame(q, h2s, { exclude: [city, niche.trade || '', ...ex] });
    const faq = topic.faq.filter(f => notH2(f.wording));
    const dropped = topic.faq.length - faq.length;
    if (v2) {
      const priceFirst = (a, b) => (a.doubt === 'Price' ? 0 : 1) - (b.doubt === 'Price' ? 0 : 1) || byDoubt(a, b);
      // The late pass (Brandon, 29 Oct): once every post in the batch has its questions, the trade level
      // cost guide fills up to five from every service's CT block, Price questions first, never a
      // question another post in the batch uses (usedBank) or a page asks (takenQ), never an H2 rephrased
      if (late) {
        if (topic.homepage_cost_guide && faq.length < 5) {
          const own = costBlockFor(topic);
          const fromBlocks = [];
          const pool = costBlocks.filter(b => !own || b.id !== own.id).flatMap(b => b.related.map(r => ({ r, b })));
          for (const { r, b } of pool.sort((x, y) => priceFirst(x.r, y.r))) {
            if (faq.length >= 5) break;
            if (usedBank.has(r.id) || faq.some(f => f.id === r.id) || takenQ(r.question, ex) || !notH2(r.question) || faq.some(f => SQ.sameQuestion(f.wording, r.question))) continue;
            usedBank.add(r.id); useQ(r.question); faq.push({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }); if (!fromBlocks.includes(b.id)) fromBlocks.push(b.id);
          }
          if (fromBlocks.length) { topic.related_from = [...(topic.related_from || []), ...fromBlocks]; flagOnce(topic, 'F-FAQ-CT', `${faq.length - topic.faq.length} FAQ question${faq.length - topic.faq.length === 1 ? '' : 's'} from the services' CT blocks (${fromBlocks.join(', ')}), Price first, after the trade's own block; none a post in the batch uses.`); }
        }
        topic.faq = faq; topic.faq_ids = faq.map(f => f.id);
        return;
      }
      // Own block only: the CT block's related questions, Price first then doubt order, never an H2 rephrased
      const ct = costBlockFor(topic);
      if (ct) {
        usedBank.add(ct.id);
        if ((ct.related || []).some(r => r.source === 'PAA')) topic.search_evidence = true;
        for (const r of [...ct.related].sort(priceFirst)) { if (faq.length >= 5) break; if (usedBank.has(r.id) || faq.some(f => f.id === r.id) || takenQ(r.question, ex) || !notH2(r.question)) continue; usedBank.add(r.id); useQ(r.question); faq.push({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }); }
        topic.bank_topic = ct.id; topic.related_from = [ct.id];
      } else flagOnce(topic, 'F-STACK', `No CT block in the bank for ${topic.homepage_cost_guide ? 'the trade' : topic.service ? topic.service.title : 'this service'}: no FAQ questions, so the guide is held.`);
      // Then the same service's BT block (Brandon, 28 Oct, night: the CT block first, then the
      // service's own BT block, never another service's), leaving that block the six its own post
      // needs (three H2s and three FAQ questions)
      if (faq.length < 5 && topic.service && !topic.homepage_cost_guide) {
        // The block's own post may be in the batch (its id is used); only its related questions matter here
        const bts = bankTopics.filter(b => sameName(b.service, topic.service.title));
        let fromBt = 0;
        for (const bt of bts) {
          const free = () => bt.related.filter(r => !usedBank.has(r.id) && !faq.some(f => f.id === r.id));
          for (const r of free().sort(byDoubt)) { if (faq.length >= 5 || free().length <= 6) break; if (takenQ(r.question, ex) || !notH2(r.question)) continue; usedBank.add(r.id); useQ(r.question); faq.push({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }); fromBt++; if (!topic.related_from.includes(bt.id)) topic.related_from = [...(topic.related_from || []), bt.id]; }
        }
        if (fromBt) flagOnce(topic, 'F-FAQ-BT', `${fromBt} FAQ question${fromBt === 1 ? '' : 's'} from the service's BT block (${topic.related_from.filter(id => /^BT-/.test(id)).join(', ')}), after its CT block.`);
      }
      topic.faq = faq; topic.faq_ids = faq.map(f => f.id);
      if (dropped) topic.flags.push({ code: 'F-FAQ-H2', msg: `${dropped} FAQ question${dropped === 1 ? '' : 's'} dropped: ${dropped === 1 ? 'it rephrases' : 'they rephrase'} one of the fixed H2s.` });
      return;
    }
    const sameService = bt => topic.service ? relatedScore(topic.service.title, bt.service || '') > 0 || lc(bt.service || '') === lc(topic.service.title) : /^general$/i.test(bt.service || '');
    for (const bt of bankTopics.filter(b => b.type === 'cost' && !(topic.question && b.id === topic.question.id) && sameService(b))) {
      if (faq.length >= 3) break;
      for (const r of rankRelated(topic.wording, [...bt.related].filter(r => !usedBank.has(r.id) && !takenQ(r.question, ex)), ex)) { if (faq.length >= 5) break; if (!notH2(r.question)) continue; usedBank.add(r.id); useQ(r.question); faq.push({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }); }
    }
    if (faq.length < 3) for (const q of pool.filter(q => !used.has(q.id) && postTypeOf(q, slots.decision_pairs) === 'cost_guide' && sameCluster(topic, q) && notH2(q.wording || q.text) && !takenQ(q.wording || q.text, ex))) { if (faq.length >= 5) break; used.add(q.id); useQ(q.wording || q.text); faq.push(ref(q)); }
    // The fourth source (Brandon, 28 Oct): the bank's related questions and topics on the same
    // service, any doubt, Price first, never an H2 rephrased
    if (faq.length < 3) {
      const cands = [];
      for (const bt of bankTopics.filter(b => sameService(b) && !(topic.question && b.id === topic.question.id))) {
        if (!usedBank.has(bt.id) && bt.question && !takenQ(bt.question, ex) && notH2(bt.question)) cands.push({ id: bt.id, question: bt.question, doubt: bt.type === 'cost' ? 'Price' : '', needsFact: false, _topic: bt.id });
        for (const r of bt.related) if (!usedBank.has(r.id) && !takenQ(r.question, ex) && notH2(r.question)) cands.push({ ...r, _topic: bt.id });
      }
      const priceFirst = (a, b) => (a.doubt === 'Price' ? 0 : 1) - (b.doubt === 'Price' ? 0 : 1) || byDoubt(a, b);
      for (const r of cands.sort(priceFirst)) { if (faq.length >= 5 || (faq.length >= 3 && r.doubt !== 'Price')) break; if (faq.some(f => f.id === r.id)) continue; usedBank.add(r.id); useQ(r.question); faq.push({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }); }
      if (faq.length >= 3) topic.flags.push({ code: 'F-FAQ-SOURCE', msg: 'The FAQ draws on the bank\'s other questions on the service (the fourth source), Price first.' });
    }
    topic.faq = faq; topic.faq_ids = faq.map(f => f.id);
    if (dropped) topic.flags.push({ code: 'F-FAQ-H2', msg: `${dropped} FAQ question${dropped === 1 ? '' : 's'} dropped: ${dropped === 1 ? 'it rephrases' : 'they rephrase'} one of the fixed H2s.` });
  };
  const takeBank = (topic, t, { own = v2 } = {}) => {
    usedBank.add(t.id);
    if ((t.related || []).some(r => r.source === 'PAA')) topic.search_evidence = true; // People also ask: search evidence (B9, 29 Oct)
    // The topic's own related questions share its subject by the bank's research: the service words count here; a question borrowed from another topic must share another word (serviceStems)
    const { kept, dropped, weak } = relatedOf(t, topic.wording, new Set(), { own });
    if (weak.length) topic.flags.push({ code: 'F-RELATED', msg: `${weak.length} related question${weak.length === 1 ? '' : 's'} left out: ${weak.length === 1 ? 'it shares' : 'they share'} too few key words with the post's question (${weak.map(r => r.id).join(', ')}).` });
    // A cost guide's H2s are the fixed set (blog/cost-guide.js); the bank gives its FAQ only.
    // Otherwise the first 3 to 5 as the H2s and the next 3 to 5 as the FAQ: split so both get
    // their three when there are six or more (7 → 4 and 3, 10 → 5 and 5)
    const costGuide = topic.post_type === 'cost_guide';
    // A v2 cost guide's FAQ is filled at the cut from its CT block (fillCostGuideFaq); nothing is taken here
    if (costGuide && v2) { topic.query_stack = []; topic.stack = []; return topic; }
    const n = costGuide ? 0 : Math.min(5, Math.max(3, Math.ceil(kept.length / 2)));
    const stack = kept.slice(0, n), faq = unlike(stack, kept.slice(n), serviceStems(topic)).slice(0, 5);
    for (const r of [...stack, ...faq]) { usedBank.add(r.id); useQ(r.question); }
    topic.query_stack = stack.map(r => r.id); topic.stack = stack.map(r => ({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }));
    topic.faq_ids = faq.map(r => r.id); topic.faq = faq.map(r => ({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }));
    if (dropped.length) topic.flags.push({ code: 'F-DROPPED', msg: `${dropped.length} related question${dropped.length === 1 ? '' : 's'} dropped: a page or another post already asks ${dropped.length === 1 ? 'it' : 'them'} (${dropped.map(r => r.id).join(', ')}).` });
    return topic;
  };
  // A held question that is one of the bank's topics in other words ("Why is my lawn always
  // waterlogged after rain" and "Why is my lawn waterlogged"): the same post, so the held
  // question keeps the slot (the customer's own words, B9) and the bank topic gives it the
  // stack and the FAQ (B6, B7) instead of running as a second post
  const STOP = new Set('a an the i you my your our we do does did is are it its to in for of and or on at by with from after before always ever can could should would will what which how why when who there this that these those me us them need want get'.split(' '));
  const stems = s => new Set(norm(s).split(' ').filter(w => w && !STOP.has(w)).map(w => w.replace(/(ing|ed|es|s)$/, '')));
  const sameQuestion = (a, b) => { const A = stems(a), B = stems(b); if (!A.size || !B.size) return false; let both = 0; for (const w of A) if (B.has(w)) both++; return both / (A.size + B.size - both) >= 0.5; }; // 0.5: "lawn waterlogged after rain" and "lawn waterlogged and how can I fix it" are one post
  const bankMatch = q => bankTopics.find(t => !usedBank.has(t.id) && t.question && sameQuestion(t.question, q.wording || q.text));
  // A Search Console query (B16): the bank block closest to it, by the stems its query shares with the
  // block's target and service (two at least; the best); a cost query takes a cost block. Its post
  // owns that block: the related questions are the H2s and the FAQ (or the FAQ alone for a cost guide)
  const scOverlap = (q, t) => { const want = SQ.questionStems(q.source_query || q.wording || q.text || ''); if (want.size < 2) return 0; const have = SQ.questionStems(`${t.question} ${t.service || ''}`); let n = 0; for (const w of want) if (have.has(w) || [...have].some(h => h.length >= 5 && w.length >= 5 && (h.startsWith(w) || w.startsWith(h)))) n++; return n; };
  const scCost = q => /\b(?:cost|costs|price|prices|how much)\b/i.test(q.source_query || '');
  // Each block goes to the query that shares most with it (two stems at least; a tie: the most impressions),
  // so "resin vs block paving driveway" takes the resin or block paving block, not a lesser query ahead of it
  const scAssigned = new Map();
  if (sc) {
    const pairs = [];
    for (const q of scItems) { const cost = scCost(q); const cands = cost ? (v2 ? costBlocks : bankTopics.filter(t => t.type === 'cost')) : bankTopics.filter(t => t.type !== 'cost'); for (const t of cands) { if (!t.question) continue; const n = scOverlap(q, t); if (n >= 2) pairs.push({ q, t, n }); } }
    pairs.sort((a, b) => b.n - a.n || b.q.impressions - a.q.impressions);
    const blocksTaken = new Set();
    for (const p of pairs) { if (scAssigned.has(p.q.id) || blocksTaken.has(p.t.id)) continue; scAssigned.set(p.q.id, p.t); blocksTaken.add(p.t.id); }
  }
  const scBankMatch = q => { const t = scAssigned.get(q.id); return t && !usedBank.has(t.id) ? t : null; };
  const mergeBank = (topic, q) => {
    if (q.source === 'search_console') {
      const sb = scBankMatch(q);
      if (!sb) { topic.flags.push({ code: 'F-SC-BANK', msg: `No bank block shares two words with the query "${q.source_query}": no related questions.` }); return topic; }
      if (topic.post_type === 'cost_guide') { topic.question = { ...topic.question, block: sb.id }; topic.bank_topic = sb.id; usedBank.add(sb.id); return topic; }
      takeBank(topic, sb, { own: true });
      topic.bank_topic = sb.id;
      topic.flags.push({ code: 'F-SC-BANK', msg: `${sb.id} "${sb.question}" is the bank block closest to the query "${q.source_query}": its related questions are the H2s and the FAQ.` });
      return topic;
    }
    const bt = bankMatch(q);
    if (!bt) return topic;
    takeBank(topic, bt);
    topic.bank_topic = bt.id;
    topic.flags.push({ code: 'F-MERGED', msg: `${bt.id} "${bt.question}" is this question in other words: its related questions are the stack and the FAQ; not a second post.` });
    return topic;
  };
  // A v2 bank's cost topics are its CT blocks, one per service (the page's UK name) and one for the trade
  const bankCostFor = page => (v2 ? (page ? costBlocks.find(t => !usedBank.has(t.id) && sameName(t.service, ukName(page.pageTitle))) || null : null) : bankTopics.find(t => !usedBank.has(t.id) && t.type === 'cost' && page && (bankPage(t).service || {}).urlSlug === page.urlSlug));
  const bankGeneralCost = v2 ? costBlocks.find(t => GENERAL_RE.test(t.service || '') || (tradeLower && norm(t.question).includes(norm(tradeLower)))) || null : bankTopics.find(t => !usedBank.has(t.id) && t.type === 'cost' && (/^general$/i.test(t.service || '') || (tradeLower && norm(t.question).includes(norm(tradeLower)) && !bankPage(t).service)));

  // 1. The trade level cost guide (the Homepage cost guide, read by the homepage FAQ Q1); not in a Search Console batch
  if (city && tradeLower && !sc) {
    const bt = bankGeneralCost;
    const t = add({ key: keyFor(`${tradeLower} cost ${city}`), post_type: 'cost_guide', source: bt ? 'blog_bank' : 'faq_research', homepage_cost_guide: true, target_query: lc(`${tradeLower} cost ${city}`),
      wording: bt ? question(bt.question) : question(`how much does ${tradeLower} cost in ${city}`), wording_source: bt ? 'blog_bank' : 'code', needs_approval: !bt, question: bt ? bankRef(bt) : null, service: null, category: null, town: '', primary: '/', cost_unit: slots.cost_unit });
    if (bt) takeBank(t, bt);
  } else if (!sc) flags.push({ code: 'F-QUEUE', msg: `No trade level cost guide: ${!city ? 'the hand set-up has no base town (biz_area_1)' : 'the niche entry has no trade'}.` });

  // 2. One cost guide per main service: the client's jobs wanted categories in order (each
  // category's first service page), then page map order to make three
  const main = [];
  for (const want of Array.isArray(cv.jobs_wanted) ? cv.jobs_wanted : []) {
    const cat = finder.cats.find(c => norm(c.category) === norm(want));
    for (const s of (cat ? cat.services : [])) { const p = finder.findTitle('service', s.gbp); if (p && !main.includes(p)) { main.push(p); break; } }
    if (main.length === 3) break;
  }
  for (const s of services) { if (main.length === 3) break; if (!main.includes(s)) main.push(s); }
  const costQs = pool.filter(q => postTypeOf(q, slots.decision_pairs) === 'cost_guide');
  for (const s of (sc ? [] : main)) {
    const q = costQs.find(x => !used.has(x.id) && (pageFor(x).service || {}).urlSlug === s.urlSlug);
    const bt = q ? null : bankCostFor(s);
    if (q) used.add(q.id);
    const t = add({ key: keyFor(`${s.pageTitle} cost ${city}`), post_type: 'cost_guide', source: q ? 'faq_research' : bt ? 'blog_bank' : 'faq_research', homepage_cost_guide: false, target_query: lc(`${s.pageTitle} cost ${city}`),
      wording: q ? question(q.wording || q.text) : bt ? question(bt.question) : question(`how much does ${lc(s.pageTitle)} cost in ${city}`), wording_source: q ? 'faq_research' : bt ? 'blog_bank' : 'code', needs_approval: !q && !bt,
      question: q ? qRef(q) : bt ? bankRef(bt) : null, service: pageRef(s), category: null, town: '', primary: s.urlSlug, cost_unit: slots.cost_unit });
    if (bt) takeBank(t, bt); else if (q) mergeBank(t, q);
  }
  if (!services.length && !sc) flags.push({ code: 'F-QUEUE', msg: 'No service pages in the page map, so no service cost guides.' });

  // 3. Every other held cost question naming a page is a cost guide too (not in a Search Console batch)
  for (const q of (sc ? [] : costQs.filter(x => !used.has(x.id)))) {
    const { service, category } = pageFor(q);
    if (!service && !category) continue;
    used.add(q.id);
    const name = service ? service.pageTitle : category.pageTitle;
    add({ key: keyFor(`${name} cost ${city}`), post_type: 'cost_guide', source: 'faq_research', homepage_cost_guide: false, target_query: lc(`${name} cost ${city}`),
      wording: question(q.wording || q.text), wording_source: 'faq_research', needs_approval: false, question: qRef(q),
      service: pageRef(service), category: pageRef(category), town: '', primary: service ? service.urlSlug : category.urlSlug, cost_unit: slots.cost_unit });
    mergeBank(topics[topics.length - 1], q);
  }

  // 4. The held customer question posts (decision and question), the client's own customers' first
  group = 'held';
  for (const q of pool.filter(x => !used.has(x.id))) {
    const fromSc = q.source === 'search_console';
    const type = fromSc && scCost(q) ? 'cost_guide' : postTypeOf(q, slots.decision_pairs);
    const { service, category } = pageFor(q);
    // A cost question naming no page stays in the pool for a stack; a Search Console cost query on a
    // service page is that service's cost guide (B16: B2 to B15 as for any post), unless one exists
    if (type === 'cost_guide' && !(fromSc && service && !existingRows.some(r => (r.info || {}).post_type === 'cost_guide' && (r.info || {}).service_slug === service.urlSlug))) continue;
    used.add(q.id);
    if (type === 'cost_guide') {
      const t = add({ key: keyFor(`${service.pageTitle} cost ${city}`), post_type: 'cost_guide', source: 'search_console', source_query: q.source_query, homepage_cost_guide: false, target_query: lc(norm(q.source_query)),
        wording: question(q.wording || q.text), wording_source: 'code', needs_approval: !q.approved, question: { ...qRef(q), source: 'search_console', impressions: q.impressions, position: q.position },
        service: pageRef(service), category: null, town: '', primary: service.urlSlug, cost_unit: slots.cost_unit });
      mergeBank(t, q);
      continue;
    }
    // A Search Console query: the question wording code wrote (a person approves it, G-TOPIC), the query kept as its source
    add({ key: keyFor(q.wording || q.text), post_type: type, source: fromSc ? 'search_console' : 'faq_research', source_query: fromSc ? q.source_query : '', homepage_cost_guide: false, target_query: fromSc ? lc(norm(q.source_query)) : lc(norm(q.wording || q.text)),
      wording: question(q.wording || q.text), wording_source: fromSc ? 'code' : q.source === 'client' ? 'client' : 'faq_research', needs_approval: fromSc ? !q.approved : false, question: fromSc ? { ...qRef(q), source: 'search_console', impressions: q.impressions, position: q.position } : qRef(q),
      service: pageRef(service), category: pageRef(category), town: type === 'local' ? (q.town || city) : '', primary: service ? service.urlSlug : category ? category.urlSlug : '/#services' });
    mergeBank(topics[topics.length - 1], q);
  }

  // 5. The bank's decision and question topics, the ranked ones first. The bank's other cost
  // topics are not posts in the onboarding batch: B1 caps the cost guides at the trade guide
  // plus one per main service (the first real bank gave a batch of sixteen cost guides
  // otherwise); they stay in the queue for the Search Console batches
  group = 'bank';
  const bankLeft = sc ? [] : bankTopics.filter(t => !usedBank.has(t.id) && t.question).sort(bankOrder);
  for (const bt of bankLeft.filter(t => bankType(t) !== 'cost_guide')) {
    if (usedWordings.has(norm(bt.question))) { usedBank.add(bt.id); flags.push({ code: 'F-DROPPED', msg: `${bt.id} "${bt.question}" is a page's question already; not a post.` }); continue; }
    const { service, category } = bankPage(bt);
    // B1 (Brandon, 29 Oct): a bank topic only on a service the client offers: a service page in the page map,
    // or a service on their record that folds into a page (the finder gives its category page); a trade
    // wide block (General) always; the rest are skipped and the next bank topics on the client's own
    // services take the slots
    if (!service && !category && !/^general$/i.test(bt.service || '')) {
      const nf = flags.find(f => f.code === 'F-NOT-OFFERED');
      const item = `${bt.id} (${bt.service})`;
      if (nf) { nf.msg = nf.msg.replace(/\.$/, `, ${item}.`); nf.ids.push(bt.id); } else flags.push({ code: 'F-NOT-OFFERED', ids: [bt.id], msg: `Bank topics on services the client does not offer (no page, not on the record), skipped: ${item}.` });
      continue;
    }
    const type = bankType(bt);
    const t = add({ key: keyFor(type === 'cost_guide' && service ? `${service.pageTitle} cost ${city}` : bt.question), post_type: type, source: 'blog_bank', homepage_cost_guide: false, target_query: lc(norm(bt.question)),
      wording: question(bt.question), wording_source: 'blog_bank', needs_approval: false, question: bankRef(bt),
      service: pageRef(service), category: pageRef(category), town: '', primary: service ? service.urlSlug : category ? category.urlSlug : '/#services', ...(type === 'cost_guide' ? { cost_unit: slots.cost_unit } : {}) });
    // Its related questions are taken at the batch cut, in batch order, so a seasonal topic
    // inside the window (placed before the bank's posts) has first claim on its service's
    // related questions (Brandon, 28 Oct)
    t.bank_ref = bt;
    usedBank.add(bt.id);
    useQ(bt.question);
  }

  // 6. Local posts: one per town with a dossier condition no page uses (the homepage's
  // symptoms, the symptoms the written pages took, the conditions earlier topics took)
  group = 'local';
  const usedIssues = new Set(takenConditions);
  const usedS = new Set([...usedSymptoms].map(norm));
  const alloc = (allocationRecord && allocationRecord.pages) || {};
  const allocSymptomIds = new Set();
  for (const p of Object.values(alloc)) for (const id of Object.values((p && p.symptoms) || {})) allocSymptomIds.add(id);
  const towns = [city, ...Object.entries(keyValueMap).filter(([k, v]) => /^biz_area_\d+$/.test(k) && v && lc(v) !== lc(city)).sort((a, b) => idNum(a[0]) - idNum(b[0])).map(([, v]) => String(v).trim())];
  const dossierOf = town => (dossiers || []).find(d => norm(d.location || d.locationName) === norm(town));
  const parsedDossiers = [];
  for (const town of towns) {
    const d = dossierOf(town);
    if (!d || !d.text) continue;
    let parsed;
    try { parsed = parseDossier(d.text); } catch (e) { flags.push({ code: 'F-DOSSIER', msg: `${town}: the dossier could not be read (${e.message}); no local post.` }); continue; }
    parsedDossiers.push({ town, parsed });
    for (const s of parsed.symptoms) if (allocSymptomIds.has(s.id) || usedS.has(norm(s.text))) usedIssues.add(s.issueId);
    // An issue whose every symptom is urgent is an emergency niche's (as the symptom pickers rule)
    const emergency = !!niche.emergency_niche;
    const calm = i => parsed.symptoms.filter(s => s.issueId === i.id && (emergency || !s.urgent));
    const free = parsed.issues.filter(i => !usedIssues.has(i.id) && calm(i).length);
    if (!free.length) { flags.push({ code: 'F-LOCAL', msg: `${town}: every dossier condition is used by a page already; no local post.` }); continue; }
    const issue = free[0];
    usedIssues.add(issue.id);
    const symptom = calm(issue)[0] || null;
    let packService = null;
    // The condition's title names the work ("slow-draining ground" → Garden drainage); its symptom text would pull in whatever it mentions ("the lawn stays soggy" → Lawn care)
    try { packService = P.serviceForQuestion(niche._source || P.packNameFor(niche.trade), issue.title); } catch (_) { packService = null; }
    // The H1 from the symptom as a homeowner would type it ("Why Does My Lawn Stay Soggy for Days
    // After Rain in Southampton?"), 70 characters at most, never the condition's research title
    const wording = homeownerQuestion(symptom ? symptom.text : issue.title, town);
    const svcPage = servicePageFor(packService);
    add({ pack_service: packService, key: keyFor(wording.replace(/\?$/, '')), post_type: 'local', source: 'dossier', homepage_cost_guide: false, target_query: lc(norm(wording)),
      wording, wording_source: 'code', needs_approval: true, question: null, service: pageRef(svcPage), category: null, town,
      dossier_condition: { id: issue.id, title: issue.title, symptom: symptom ? { id: symptom.id, text: symptom.text } : null, town }, primary: svcPage ? svcPage.urlSlug : '/#services' });
  }
  if (!parsedDossiers.length) flags.push({ code: 'F-LOCAL', msg: 'No saved dossier for any town: no local posts.' });

  // 7. Seasonal topics (a seasonal niche only): local posts in the city with a time of year; one
  // whose publish month falls inside the six months from the launch always gets a slot
  group = 'seasonal';
  const launch = parseDate(launchDate);
  // The dossier condition for a seasonal topic (Brandon, 28 Oct: a seasonal post is a local post
  // with a time of year, so B9 counts the town, the condition, the methods and the process): the
  // free issue whose title, service tags or detail name the job's words most, the primary town's
  // dossier first, else the town whose dossier fits best; nothing fitting takes the first free
  // issue of the primary town (F-CONDITION says so)
  const STOP_T = new Set(['the', 'a', 'an', 'for', 'after', 'new', 'and', 'of', 'in', 'to', 'garden', 'gardens']); // 'garden' is in nearly every issue of a garden trade
  const stemsOf = s => [...new Set(norm(s).split(' ').filter(w => w && !STOP_T.has(w)).map(w => w.replace(/(ing|ers?|es|s)$/, '')))];
  const issueScore = (issue, stems) => {
    const title = stemsOf(issue.title), tags = stemsOf([...(issue.serviceTags || []), ...(issue.categoryTags || [])].join(' ')), detail = new Set(stemsOf(issue.detail || ''));
    return stems.reduce((n, w) => n + (title.includes(w) ? 3 : 0) + (tags.includes(w) ? 2 : 0) + (detail.has(w) ? 1 : 0), 0);
  };
  const conditionFor = topic => {
    const stems = stemsOf(topic);
    let best = null;
    for (const { town, parsed } of parsedDossiers) {
      const emergency = !!niche.emergency_niche;
      for (const issue of parsed.issues) {
        if (usedIssues.has(issue.id)) continue;
        const symptoms = parsed.symptoms.filter(s => s.issueId === issue.id && (emergency || !s.urgent));
        if (!symptoms.length) continue;
        const score = issueScore(issue, stems) + (norm(town) === norm(city) ? 0.5 : 0);
        if (!best || score > best.score) best = { town, issue, symptom: symptoms[0], score };
      }
    }
    return best;
  };
  // The ST block for a niche seasonal topic: the block whose service or question shares the
  // topic's words (its service name and its task words), else the block at the topic's position
  const seasonalBlockFor = (t, index) => {
    const want = new Set(stemsOf(`${t.topic} ${P.serviceForQuestion ? (() => { try { return P.serviceForQuestion(niche._source || P.packNameFor(niche.trade), t.topic) || ''; } catch (_) { return ''; } })() : ''}`).filter(w => w.length >= 4 && !['prepar', 'ready', 'season', 'after', 'before'].includes(w)));
    let best = null, bestN = 0;
    for (const b of seasonalBlocks) {
      const have = new Set(stemsOf(`${b.service || ''} ${b.question || ''}`));
      let n = 0; for (const w of want) if (have.has(w) || [...have].some(h => h.length >= 4 && (h.startsWith(w) || w.startsWith(h)))) n++;
      if (n > bestN) { best = b; bestN = n; }
    }
    return best || seasonalBlocks[index] || null;
  };
  for (const t of slots.seasonal_topics) {
    if (!city) break;
    if (sc && existingRows.some(r => r.info && r.info.seasonal && norm(r.info.seasonal.topic || '') === norm(t.topic))) continue;
    const month = launch ? seasonalMonth(launch, { seasonal: t }) : null;
    const c = conditionFor(t.topic);
    const town = c ? c.town : city;
    // The pack's service for the topic ("Spring lawn care" → Lawn care): its bank topics give the
    // related questions (Brandon, 28 Oct) and its timing rows the answer's timing (blog/decisions.js)
    let packService = null;
    try { packService = P.serviceForQuestion(niche._source || P.packNameFor(niche.trade), t.topic); } catch (_) { packService = null; }
    if (c) usedIssues.add(c.issue.id);
    const svcPage = servicePageFor(packService);
    // A "When …" H1 needs a month window in FACTS ALLOWED (the pack's timing rows); without one
    // the topic reads "How to Get Your Lawn Ready for Spring" (Brandon, 28 Oct)
    let windowRows = [];
    try { windowRows = packService ? P.rowsForPost(niche._source || P.packNameFor(niche.trade), packService, t.topic).rows.filter(r => r.kind === 'timing' && MONTH_RE.test(r.text)) : []; } catch (_) { windowRows = []; }
    // A v2 bank: the topic's ST block (the niche entry's topics were sent in order; matched on the
    // service and the topic's words, else by position); its window, with its source, is a sourced
    // row in FACTS ALLOWED, and gives the "When …" wording when it names a month or a season
    const st = v2 ? seasonalBlockFor(t, slots.seasonal_topics.indexOf(t)) : null;
    const bankWindow = st && st.window ? { id: st.id, text: st.window, url: st.window_url || st.url || '' } : null;
    if (bankWindow && MONTH_RE.test(bankWindow.text)) windowRows = [{ text: bankWindow.text }, ...windowRows];
    const whenWording = question(SEASONAL_VERB.test(t.topic) ? `when should you ${lc(t.topic)} in ${town}` : `when is the best time for ${lc(t.topic)} in ${town}`);
    const howWording = question(howToWording(t.topic, town));
    const topic = add({ key: keyFor(`${t.topic} ${town}`), post_type: 'local', source: 'seasonal', homepage_cost_guide: false, target_query: lc(norm(`${t.topic} ${town}`)),
      // "Lay new turf" reads as "When should you lay new turf"; "Spring lawn care" as "When is the best time for spring lawn care"
      wording: windowRows.length ? whenWording : howWording, wording_source: 'code', needs_approval: true, question: null, service: pageRef(svcPage), category: null, town, window_rows: windowRows.map(r => r.text),
      seasonal: { topic: t.topic, window: t.window, publish: t.publish, month, tasks: Array.isArray(t.tasks) ? t.tasks : [] }, in_window: !!month, primary: svcPage ? svcPage.urlSlug : '/#services', pack_service: packService, bank_window: bankWindow, bank_block: st ? st.id : '',
      dossier_condition: c ? { id: c.issue.id, title: c.issue.title, symptom: c.symptom ? { id: c.symptom.id, text: c.symptom.text } : null, town, fit: c.score >= 1 ? 'names the job' : 'the first free condition' } : null });
    if (!windowRows.length) topic.flags.push({ code: 'F-WINDOW', msg: `No month window in ${v2 ? `the bank's ${st ? st.id : 'ST block'} (${st && st.window ? `"${st.window}"` : 'no window stated'}) or ` : ''}the trade facts timing rows for ${packService || t.topic}: the topic reads "${howWording}" instead of "${whenWording}".` });
    if (v2 && !st) topic.flags.push({ code: 'F-STACK', msg: `No ST block in the bank for "${t.topic}": no related questions, so the post is held.` });
    if (!c) topic.flags.push({ code: 'F-CONDITION', msg: `No free dossier condition for "${t.topic}" (${parsedDossiers.length ? 'every condition is used' : 'no saved dossier'}): the post has no condition and will gate on B9.` });
    else if (c.score < 1) topic.flags.push({ code: 'F-CONDITION', msg: `No dossier condition names "${t.topic}": the first free condition of ${town} (${c.issue.title}) is used.` });
  }
  if (!launch && slots.seasonal_topics.length) flags.push({ code: 'F-DATE', msg: 'No launch date on the client: no seasonal topic can be placed in its month, so they take the slots left after the question posts.' });

  // The batch's order: the cost guides, the seasonal topics inside the window, the first two local
  // posts, the held and bank question and decision posts, then the other local and seasonal topics
  const by = g => topics.filter(t => t.group === g);
  const locals = by('local');
  const seasonals = by('seasonal');
  // B16's order: the seasonal topics in the window, the Search Console queries (most impressions first), the FAQ leftovers, the local posts
  const heldGroup = by('held');
  const ordered = sc
    ? [...seasonals.filter(t => t.in_window), ...heldGroup.filter(t => t.source === 'search_console'), ...heldGroup.filter(t => t.source !== 'search_console'), ...locals, ...seasonals.filter(t => !t.in_window)]
    : [...by('cost'), ...seasonals.filter(t => t.in_window), ...locals.slice(0, minLocal), ...by('held'), ...by('bank'), ...locals.slice(minLocal), ...seasonals.filter(t => !t.in_window)];
  if (locals.length < minLocal && !sc) flags.push({ code: 'F-LOCAL', msg: `${locals.length} local post${locals.length === 1 ? '' : 's'} (${minLocal} wanted per batch): the main towns need a saved dossier with a condition no page uses.` });

  // B6 and B7 on the held topics: the stack and the FAQ questions from the held pool, same
  // service (and town for a local post), none used anywhere else, in doubt order. Done before
  // the batch is cut, so a customer question held back gives its slot to the next topic
  const sameCluster = (t, q) => {
    if (used.has(q.id)) return false;
    if (t.post_type === 'local') return isLocalQ(q) && (q.town ? norm(q.town) === norm(t.town) : norm(t.town) === norm(city));
    const { service, category } = pageFor(q);
    if (t.service) return !!service && service.urlSlug === t.service.slug;
    if (t.category) return !!category && category.urlSlug === t.category.slug;
    if (t.question && t.question.service) return norm(q.service) === norm(t.question.service);
    return !q.service;
  };
  const ref = q => ({ id: q.id, wording: q.wording || q.text, doubt: q.doubt || '', needs_fact: !!(q.needs_fact || q.fact || q.new_fact) });
  const fromPool = t => t.source !== 'blog_bank' && !(t.question && t.question.source === 'blog_bank') && !t.bank_topic;
  const stackFor = t => {
    const ex = serviceStems(t);
    const fits = q => sameCluster(t, q) && !takenQ(q.wording || q.text, ex) && relatedScore(t.wording, q.wording || q.text, ex) >= RELATED_MIN;
    const byScore = (a, b) => relatedScore(t.wording, b.wording || b.text, ex) - relatedScore(t.wording, a.wording || a.text, ex) || byDoubt(a, b);
    const costGuide = t.post_type === 'cost_guide';
    const stack = costGuide ? [] : pool.filter(fits).sort(byScore).slice(0, 5);
    for (const q of stack) { used.add(q.id); useQ(q.wording || q.text); }
    const rest = unlike(stack.map(q => ({ question: q.wording || q.text })), pool.filter(fits).sort(byScore).map(q => ({ ...q, question: q.wording || q.text })), ex).slice(0, 5);
    for (const q of rest) { used.add(q.id); useQ(q.wording || q.text); }
    t.query_stack = stack.map(q => q.id); t.stack = stack.map(ref);
    t.faq_ids = rest.map(q => q.id); t.faq = rest.map(ref);
  };
  // A seasonal topic's related questions: the bank topics on the same service (the pack's
  // service for the topic, else the topic's own words), their unused related questions in
  // doubt order, the first 3 to 5 as the H2s and the next 3 to 5 as the FAQ
  const seasonalRelated = t => {
    if (v2) {
      // Own block only: a seasonal post's ST block; a dossier post the BT block that asks its question
      // in other words (the homeowner's symptom and the bank's topic are one post), else none
      let block = null;
      if (t.source === 'seasonal') block = t.bank_block ? seasonalBlocks.find(b => b.id === t.bank_block) : null;
      else block = bankTopics.find(b => !usedBank.has(b.id) && b.question && (sameQuestion(b.question, t.wording) || !!SQ.findSame(t.wording, [b.question], { exclude: [city, niche.trade || ''] }))) || null;
      if (!block) { flagOnce(t, 'F-STACK', t.source === 'seasonal' ? `No ST block in the bank for "${t.seasonal.topic}": no related questions, so the post is held.` : `No bank topic asks "${t.wording}" in other words: no related questions, so the post is held.`); return; }
      usedBank.add(block.id);
      const { kept, dropped } = relatedOf(block, t.wording, serviceStems(t));
      const n = Math.min(5, Math.max(3, Math.ceil(kept.length / 2)));
      const stack = kept.slice(0, n), faq = unlike(stack, kept.slice(n), serviceStems(t)).slice(0, 5);
      for (const r of [...stack, ...faq]) { usedBank.add(r.id); useQ(r.question); }
      t.query_stack = stack.map(r => r.id); t.stack = stack.map(r => ({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }));
      t.faq_ids = faq.map(r => r.id); t.faq = faq.map(r => ({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }));
      t.bank_topic = block.id; t.related_from = [block.id];
      if (t.source === 'dossier') t.flags.push({ code: 'F-MERGED', msg: `${block.id} "${block.question}" is this question in other words: its related questions are the stack and the FAQ; not a second post.` });
      if (dropped.length) t.flags.push({ code: 'F-DROPPED', msg: `${dropped.length} related question${dropped.length === 1 ? '' : 's'} dropped: a page or another post already asks ${dropped.length === 1 ? 'it' : 'them'} (${dropped.map(r => r.id).join(', ')}).` });
      return;
    }
    // The service's words only ("Turf laying" → turf, lay), matched on the bank topic's service
    // name, never its question ("lay a patio" is not a turf topic); the topic's own words when
    // the pack names no service, and the question only when the bank topic names no service
    // A seasonal topic with a tasks list (the niche entry) matches the bank's questions on those
    // tasks, any topic (Brandon, 28 Oct); otherwise, and for a dossier post, the bank topics on the service
    const tasks = t.seasonal && Array.isArray(t.seasonal.tasks) ? t.seasonal.tasks : [];
    const want = new Set(stemsOf(t.pack_service || (t.seasonal ? t.seasonal.topic : '') || (t.dossier_condition ? t.dossier_condition.title : '')).filter(w => !['lay', 'new', 'prepare', 'care', 'cut', 'season', 'spring', 'summer', 'autumn', 'winter'].includes(w)));
    const near = tasks.length ? bankTopics : want.size ? bankTopics.filter(bt => { const have = new Set(stemsOf(bt.service || (bt.service === '' ? bt.question : '') || '')); return [...want].some(w => have.has(w) || [...have].some(h => (h.length >= 4 && w.startsWith(h)) || (w.length >= 4 && h.startsWith(w)))); }) : [];
    let kept = [];
    const exS = serviceStems(t);
    for (const bt of near) for (const r of [...bt.related].sort(byDoubt)) { if (usedBank.has(r.id) || takenQ(r.question, exS)) continue; if (!kept.some(k => k.id === r.id)) kept.push({ ...r, _topic: bt.id }); }
    // Against the post's own question ("Why does my garden stay waterlogged" keeps the drainage
    // questions, not every lawn question the service has); the topic's words count too, since
    // the question is the homeowner's and the topic names the work
    const target = tasks.length ? tasks.join(' ') : `${t.wording} ${t.seasonal ? t.seasonal.topic : ''} ${t.pack_service || ''}`;
    kept = rankRelated(target, kept, serviceStems(t));
    const n = Math.min(5, Math.max(3, Math.ceil(kept.length / 2)));
    const stack = kept.slice(0, n), faq = unlike(stack, kept.slice(n), serviceStems(t)).slice(0, 5);
    for (const r of [...stack, ...faq]) { usedBank.add(r.id); useQ(r.question); }
    t.query_stack = stack.map(r => r.id); t.stack = stack.map(r => ({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }));
    t.faq_ids = faq.map(r => r.id); t.faq = faq.map(r => ({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }));
    t.related_from = [...new Set([...stack, ...faq].map(r => r._topic))];
    if (!near.length) t.flags.push({ code: 'F-STACK', msg: `No bank topic on ${t.pack_service || 'this service'}: no related questions for the seasonal topic.` });
    else if (tasks.length && !kept.length) t.flags.push({ code: 'F-STACK', msg: `No bank question shares a task with "${t.seasonal.topic}" (${tasks.join(', ')}).` });
    if (t.seasonal && !tasks.length) t.flags.push({ code: 'F-TASKS', msg: `"${t.seasonal.topic}" has no tasks list in the niche entry: the match falls back to the bank topics on its service.` });
  };
  const release = t => {
    if (t.question && t.question.source !== 'blog_bank') used.delete(t.question.id);
    if (fromPool(t)) for (const id of [...t.query_stack, ...t.faq_ids]) used.delete(id);
    if (t.source === 'seasonal' || t.source === 'dossier') for (const id of [...t.query_stack, ...t.faq_ids]) usedBank.delete(id);
    if (t.question && t.question.source === 'blog_bank') { usedBank.delete(t.question.id); for (const id of [...t.query_stack, ...t.faq_ids]) usedBank.delete(id); }
    if (t.bank_topic) { usedBank.delete(t.bank_topic); for (const id of [...t.query_stack, ...t.faq_ids]) usedBank.delete(id); }
    if (v2 && t.post_type === 'cost_guide') for (const id of t.faq_ids) usedBank.delete(id);
  };

  // The onboarding batch is the first 16; what is beyond it stays in the queue, its questions
  // back in the pool for the stacks (B1 before B6). A customer question in the batch with no
  // matching bank topic and fewer than three related questions is held (Brandon, 28 Oct): not
  // written, status Held on the queue, in the pool for the Search Console batch; the next topic
  // takes its slot and is stacked the same way
  const batch = ordered.slice(0, target);
  const dropped = ordered.slice(target);
  for (const t of dropped) release(t);
  // The stacks in batch order: the held pool, the bank topic's own related questions, or
  // the same service's for a seasonal topic
  // A seasonal or a dossier local post takes the bank's related questions on its service (the pool has none on a town)
  const stackTopic = t => { if (t.source === 'seasonal' || t.source === 'dossier') seasonalRelated(t); else if (fromPool(t)) stackFor(t); else if (t.bank_ref && !t.query_stack.length) takeBank(t, t.bank_ref); if (t.post_type === 'cost_guide') fillCostGuideFaq(t); };
  for (const t of batch) stackTopic(t);
  // The trade level cost guide's late fill (every service's CT block), once the batch has taken its questions
  for (const t of batch) if (t.post_type === 'cost_guide' && t.homepage_cost_guide) fillCostGuideFaq(t, { late: true });
  // The shape gate (Brandon, 28 Oct): a post needs three H2s and three FAQ questions, or it
  // is held (G-STACK), not written; the next topic beyond the batch takes its slot
  const heldBack = [];
  // A cost guide's H2s are fixed (blog/cost-guide.js), so only its FAQ comes from the bank and the gate never holds it
  const thin = t => t.post_type === 'cost_guide' ? t.faq_ids.length < 3 : (t.query_stack.length < 3 || t.faq_ids.length < 3);
  const hold = t => {
    const had = { stack: t.query_stack.length, faq: t.faq_ids.length };
    release(t);
    if (t.question && t.question.source !== 'blog_bank') used.add(t.question.id); // its own question stays its own
    t.query_stack = []; t.stack = []; t.faq_ids = []; t.faq = [];
    t.held = true;
    t.flags.push({ code: 'F-STACK', msg: `${had.stack} related question${had.stack === 1 ? '' : 's'} for the H2s and ${had.faq} for the FAQ (3 of each needed): held (G-STACK), not written; the Search Console batch picks it up.` });
    heldBack.push(t);
  };
  // A topic beyond the batch can take a slot when its question is free (not in a stack)
  const free = t => !(t.question && t.question.source !== 'blog_bank' && used.has(t.question.id));
  const take = next => {
    if (next.question && next.question.source !== 'blog_bank') used.add(next.question.id);
    if (next.question && next.question.source === 'blog_bank') { usedBank.add(next.question.id); for (const id of [...next.query_stack, ...next.faq_ids]) usedBank.add(id); }
    if (next.bank_topic) { usedBank.add(next.bank_topic); for (const id of [...next.query_stack, ...next.faq_ids]) usedBank.add(id); }
    stackTopic(next);
    batch.push(next);
  };
  // Hold the thin ones and refill from beyond the batch until nothing changes: a hold frees
  // its stack, which can make a later topic's question free again
  for (let guard = 0; guard < 200; guard++) {
    let changed = false;
    for (let i = 0; i < batch.length; i++) { if (thin(batch[i])) { hold(batch[i]); batch.splice(i--, 1); changed = true; } }
    while (batch.length < target) {
      const j = dropped.findIndex(free);
      if (j < 0) break;
      take(dropped.splice(j, 1)[0]);
      changed = true;
    }
    if (!changed) break;
  }
  for (const t of batch) {
    if (t.needs_approval) t.flags.push({ code: 'F-WORDING', msg: 'The question was written by code: approve or edit it before the post runs (G-TOPIC).' });
    else if (t.question && !t.question.approved) t.flags.push({ code: 'F-WORDING', msg: `${t.question.id} is not approved on the FAQ card yet (G-TOPIC).` });
  }
  if (sc && batch.length < target) flags.push({ code: 'F-SC-THIN', msg: `${batch.length} topic${batch.length === 1 ? '' : 's'} pass for the Search Console batch (6 wanted): the empty months refresh the posts nearest their review date.` });
  if (!sc && batch.length < target) flags.push({ code: 'F-QUEUE', msg: `${batch.length} topic${batch.length === 1 ? '' : 's'} for the onboarding batch (16 wanted): the cadence stops at the last topic; the Search Console batch picks up from month six.` });
  if (!bank) flags.push({ code: 'F-BANK', msg: `No approved blog question bank for ${lc(niche.trade) || 'this trade'}: the topics come from the held questions, the dossiers and the seasonal topics only. Run or paste the bank on the Trade facts page and approve it.` });
  const leftovers = pool.filter(q => !used.has(q.id)).map(q => q.id);
  const leftoversBank = bankTopics.filter(t => !usedBank.has(t.id)).map(t => t.id);
  const byType = type => batch.filter(t => t.post_type === type).length;
  return {
    topics: batch,
    beyond: dropped.map(t => ({ key: t.key, post_type: t.post_type, wording: t.wording, source: t.source })),
    held_back: heldBack,
    leftovers, leftovers_bank: leftoversBank,
    pool: { costGuide: (held.costGuide || []).length, noPage: (held.noPage || []).length, total: pool.length, bank: bankTopics.length, bank_related: bankTopics.reduce((n, t) => n + t.related.length, 0) },
    counts: { topics: batch.length, cost_guide: byType('cost_guide'), decision: byType('decision'), question: byType('question'), local: byType('local'), from_bank: batch.filter(t => t.source === 'blog_bank' || (t.question && t.question.source === 'blog_bank')).length, stack: batch.reduce((n, t) => n + t.query_stack.length, 0), faq: batch.reduce((n, t) => n + t.faq_ids.length, 0), needs_approval: batch.filter(t => t.needs_approval || (t.question && !t.question.approved)).length, held: heldBack.length },
    flags,
  };
}

module.exports = { reserveBlogTopics, postTypeOf, TARGET, SC_TARGET, DOUBT_ORDER, titleCase, question };
