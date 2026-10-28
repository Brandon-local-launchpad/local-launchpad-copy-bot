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

const TARGET = 16;
// A seasonal topic that opens on a verb ("Lay new turf", "Prepare the garden for winter")
const SEASONAL_VERB = /^(lay|prepare|plant|cut|clear|book|check|clean|fit|install|replace|repair|paint|treat|seed|sow|feed|mow|trim|prune|protect|service|get|order|move|start|finish)\b/i;
const DOUBT_ORDER = ['Fit', 'Process', 'Price', 'Timing', 'Trust'];
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
function reserveBlogTopics({ assignment, cv = {}, niche = {}, keyValueMap = {}, pages = [], serviceParentMap = {}, dossiers = [], allocationRecord = null, usedSymptoms = new Set(), bank = null, pageWordings = new Set(), launchDate = null, target = TARGET, minLocal = 2 } = {}) {
  const flags = [];
  const held = (assignment && assignment.held) || {};
  const pool = [...(held.costGuide || []), ...(held.noPage || [])].sort(byOrder);
  const city = String(keyValueMap.biz_area_1 || '').trim();
  const tradeLower = niche.trade_lower || lc(niche.trade) || '';
  const slots = blocksFor({ niche, cv });
  const services = pages.filter(p => p.pageType === 'service' && built(p));
  const used = new Set();        // held question ids used as a target, in a stack or as an FAQ
  const usedBank = new Set();    // bank topic and related question ids used
  const usedWordings = new Set([...pageWordings].map(norm));
  const topics = [];
  const keys = new Set();
  const finder = pageFinder({ cv, pages, keyValueMap, serviceParentMap, niche });
  const pageFor = q => finder.pageFor(q);
  const isLocalQ = q => !!(q.town || q.local || q.page === 'Location');
  const keyFor = base => { let k = `/guides/${slugify(base)}`; let n = 2; while (keys.has(k)) k = `/guides/${slugify(base)}-${n++}`; keys.add(k); return k; };
  let group = 'cost';
  const add = t => { topics.push({ batch: 'onboarding', query_stack: [], faq_ids: [], stack: [], faq: [], flags: [], group, ...t }); return topics[topics.length - 1]; };
  const qRef = q => ({ id: q.id, wording: q.wording || q.text, approved: !!q.approved, usable: q.usable !== false && !!q.approved, doubt: q.doubt || '', service: q.service || '', town: q.town || '', source: q.source || 'research' });
  const pageRef = p => (p ? { title: p.pageTitle, slug: p.urlSlug } : null);

  // ── The bank: its topics in rank order, and a page for each ──
  const bankTopics = bank && Array.isArray(bank.topics) ? bank.topics : [];
  const rankOf = new Map((bank && bank.ranked ? bank.ranked : []).map((id, i) => [id, i]));
  const bankOrder = (a, b) => (rankOf.has(a.id) ? rankOf.get(a.id) : 1000 + idNum(a.id)) - (rankOf.has(b.id) ? rankOf.get(b.id) : 1000 + idNum(b.id));
  // A bank topic's page: the sorting step's lookup on its service word, else the service page
  // whose name shares the word's stems ("Patios and paving" → Patio paving), else its category
  const candidates = services.map(p => ({ key: p.urlSlug, value: p.pageTitle }));
  const bankPage = t => {
    if (!t.service || /^general$/i.test(t.service)) return { service: null, category: null };
    const found = pageFor({ service: t.service, page: 'Service', text: t.question });
    if (found.service) return found;
    const hit = bestServiceFor(t.service, candidates);
    return hit ? { service: services.find(p => p.urlSlug === hit.key) || null, category: null } : found;
  };
  const bankType = t => (t.type === 'cost' ? 'cost_guide' : t.type === 'decision' ? 'decision' : t.type === 'question' ? 'question' : postTypeOf({ wording: t.question, doubt: '' }, slots.decision_pairs));
  // A bank topic's related questions in doubt order, the ones a page uses dropped
  const relatedOf = t => {
    const kept = [], dropped = [];
    for (const r of [...t.related].sort(byDoubt)) { if (usedBank.has(r.id)) continue; if (usedWordings.has(norm(r.question))) dropped.push(r); else kept.push(r); }
    return { kept, dropped };
  };
  const bankRef = t => ({ id: t.id, wording: t.question, approved: true, usable: true, doubt: '', service: t.service || '', town: '', source: 'blog_bank', url: t.url || '' });
  const takeBank = (topic, t) => {
    usedBank.add(t.id);
    const { kept, dropped } = relatedOf(t);
    // The first 3 to 5 as the H2s and the next 3 to 5 as the FAQ: split so both get their
    // three when there are six or more (7 → 4 and 3, 10 → 5 and 5)
    const n = Math.min(5, Math.max(3, Math.ceil(kept.length / 2)));
    const stack = kept.slice(0, n), faq = kept.slice(n, n + 5);
    for (const r of [...stack, ...faq]) { usedBank.add(r.id); usedWordings.add(norm(r.question)); }
    topic.query_stack = stack.map(r => r.id); topic.stack = stack.map(r => ({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }));
    topic.faq_ids = faq.map(r => r.id); topic.faq = faq.map(r => ({ id: r.id, wording: r.question, doubt: r.doubt, needs_fact: !!r.needsFact }));
    if (dropped.length) topic.flags.push({ code: 'F-DROPPED', msg: `${dropped.length} related question${dropped.length === 1 ? '' : 's'} dropped: a page already uses ${dropped.length === 1 ? 'it' : 'them'} (${dropped.map(r => r.id).join(', ')}).` });
    return topic;
  };
  // A held question that is one of the bank's topics in other words ("Why is my lawn always
  // waterlogged after rain" and "Why is my lawn waterlogged"): the same post, so the held
  // question keeps the slot (the customer's own words, B9) and the bank topic gives it the
  // stack and the FAQ (B6, B7) instead of running as a second post
  const STOP = new Set('a an the i you my your our we do does did is are it its to in for of and or on at by with from after before always ever can could should would will what which how why when who there this that these those me us them need want get'.split(' '));
  const stems = s => new Set(norm(s).split(' ').filter(w => w && !STOP.has(w)).map(w => w.replace(/(ing|ed|es|s)$/, '')));
  const sameQuestion = (a, b) => { const A = stems(a), B = stems(b); if (!A.size || !B.size) return false; let both = 0; for (const w of A) if (B.has(w)) both++; return both / (A.size + B.size - both) >= 0.6; };
  const bankMatch = q => bankTopics.find(t => !usedBank.has(t.id) && t.question && sameQuestion(t.question, q.wording || q.text));
  const mergeBank = (topic, q) => {
    const bt = bankMatch(q);
    if (!bt) return topic;
    takeBank(topic, bt);
    topic.bank_topic = bt.id;
    topic.flags.push({ code: 'F-MERGED', msg: `${bt.id} "${bt.question}" is this question in other words: its related questions are the stack and the FAQ; not a second post.` });
    return topic;
  };
  const bankCostFor = page => bankTopics.find(t => !usedBank.has(t.id) && t.type === 'cost' && page && (bankPage(t).service || {}).urlSlug === page.urlSlug);
  const bankGeneralCost = bankTopics.find(t => !usedBank.has(t.id) && t.type === 'cost' && (/^general$/i.test(t.service || '') || (tradeLower && norm(t.question).includes(norm(tradeLower)) && !bankPage(t).service)));

  // 1. The trade level cost guide (the Homepage cost guide, read by the homepage FAQ Q1)
  if (city && tradeLower) {
    const bt = bankGeneralCost;
    const t = add({ key: keyFor(`${tradeLower} cost ${city}`), post_type: 'cost_guide', source: bt ? 'blog_bank' : 'faq_research', homepage_cost_guide: true, target_query: lc(`${tradeLower} cost ${city}`),
      wording: bt ? question(bt.question) : question(`how much does ${tradeLower} cost in ${city}`), wording_source: bt ? 'blog_bank' : 'code', needs_approval: !bt, question: bt ? bankRef(bt) : null, service: null, category: null, town: '', primary: '/', cost_unit: slots.cost_unit });
    if (bt) takeBank(t, bt);
  } else flags.push({ code: 'F-QUEUE', msg: `No trade level cost guide: ${!city ? 'the hand set-up has no base town (biz_area_1)' : 'the niche entry has no trade'}.` });

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
  for (const s of main) {
    const q = costQs.find(x => !used.has(x.id) && (pageFor(x).service || {}).urlSlug === s.urlSlug);
    const bt = q ? null : bankCostFor(s);
    if (q) used.add(q.id);
    const t = add({ key: keyFor(`${s.pageTitle} cost ${city}`), post_type: 'cost_guide', source: q ? 'faq_research' : bt ? 'blog_bank' : 'faq_research', homepage_cost_guide: false, target_query: lc(`${s.pageTitle} cost ${city}`),
      wording: q ? question(q.wording || q.text) : bt ? question(bt.question) : question(`how much does ${lc(s.pageTitle)} cost in ${city}`), wording_source: q ? 'faq_research' : bt ? 'blog_bank' : 'code', needs_approval: !q && !bt,
      question: q ? qRef(q) : bt ? bankRef(bt) : null, service: pageRef(s), category: null, town: '', primary: s.urlSlug, cost_unit: slots.cost_unit });
    if (bt) takeBank(t, bt); else if (q) mergeBank(t, q);
  }
  if (!services.length) flags.push({ code: 'F-QUEUE', msg: 'No service pages in the page map, so no service cost guides.' });

  // 3. Every other held cost question naming a page is a cost guide too
  for (const q of costQs.filter(x => !used.has(x.id))) {
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
    const type = postTypeOf(q, slots.decision_pairs);
    if (type === 'cost_guide') continue; // a cost question naming no page stays in the pool for a stack
    const { service, category } = pageFor(q);
    used.add(q.id);
    add({ key: keyFor(q.wording || q.text), post_type: type, source: 'faq_research', homepage_cost_guide: false, target_query: lc(norm(q.wording || q.text)),
      wording: question(q.wording || q.text), wording_source: q.source === 'client' ? 'client' : 'faq_research', needs_approval: false, question: qRef(q),
      service: pageRef(service), category: pageRef(category), town: type === 'local' ? (q.town || city) : '', primary: service ? service.urlSlug : category ? category.urlSlug : '/#services' });
    mergeBank(topics[topics.length - 1], q);
  }

  // 5. The bank's decision and question topics, the ranked ones first. The bank's other cost
  // topics are not posts in the onboarding batch: B1 caps the cost guides at the trade guide
  // plus one per main service (the first real bank gave a batch of sixteen cost guides
  // otherwise); they stay in the queue for the Search Console batches
  group = 'bank';
  const bankLeft = bankTopics.filter(t => !usedBank.has(t.id) && t.question).sort(bankOrder);
  for (const bt of bankLeft.filter(t => bankType(t) !== 'cost_guide')) {
    if (usedWordings.has(norm(bt.question))) { usedBank.add(bt.id); flags.push({ code: 'F-DROPPED', msg: `${bt.id} "${bt.question}" is a page's question already; not a post.` }); continue; }
    const { service, category } = bankPage(bt);
    const type = bankType(bt);
    const t = add({ key: keyFor(type === 'cost_guide' && service ? `${service.pageTitle} cost ${city}` : bt.question), post_type: type, source: 'blog_bank', homepage_cost_guide: false, target_query: lc(norm(bt.question)),
      wording: question(bt.question), wording_source: 'blog_bank', needs_approval: false, question: bankRef(bt),
      service: pageRef(service), category: pageRef(category), town: '', primary: service ? service.urlSlug : category ? category.urlSlug : '/#services', ...(type === 'cost_guide' ? { cost_unit: slots.cost_unit } : {}) });
    takeBank(t, bt);
    usedWordings.add(norm(bt.question));
  }

  // 6. Local posts: one per town with a dossier condition no page uses (the homepage's
  // symptoms, the symptoms the written pages took, the conditions earlier topics took)
  group = 'local';
  const usedIssues = new Set();
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
    add({ key: keyFor(`${issue.title} ${town}`), post_type: 'local', source: 'dossier', homepage_cost_guide: false, target_query: lc(norm(`${issue.title} ${town}`)),
      wording: question(`what causes ${lc(issue.title)} in ${town}`), wording_source: 'code', needs_approval: true, question: null, service: null, category: null, town,
      dossier_condition: { id: issue.id, title: issue.title, symptom: symptom ? { id: symptom.id, text: symptom.text } : null, town }, primary: '/#services' });
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
  const STOP_T = new Set(['the', 'a', 'an', 'for', 'after', 'new', 'and', 'of', 'in', 'to']);
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
  for (const t of slots.seasonal_topics) {
    if (!city) break;
    const month = launch ? seasonalMonth(launch, { seasonal: t }) : null;
    const c = conditionFor(t.topic);
    const town = c ? c.town : city;
    if (c) usedIssues.add(c.issue.id);
    const topic = add({ key: keyFor(`${t.topic} ${town}`), post_type: 'local', source: 'seasonal', homepage_cost_guide: false, target_query: lc(norm(`${t.topic} ${town}`)),
      // "Lay new turf" reads as "When should you lay new turf"; "Spring lawn care" as "When is the best time for spring lawn care"
      wording: question(SEASONAL_VERB.test(t.topic) ? `when should you ${lc(t.topic)} in ${town}` : `when is the best time for ${lc(t.topic)} in ${town}`), wording_source: 'code', needs_approval: true, question: null, service: null, category: null, town,
      seasonal: { topic: t.topic, window: t.window, publish: t.publish, month }, in_window: !!month, primary: '/#services',
      dossier_condition: c ? { id: c.issue.id, title: c.issue.title, symptom: c.symptom ? { id: c.symptom.id, text: c.symptom.text } : null, town, fit: c.score >= 1 ? 'names the job' : 'the first free condition' } : null });
    if (!c) topic.flags.push({ code: 'F-CONDITION', msg: `No free dossier condition for "${t.topic}" (${parsedDossiers.length ? 'every condition is used' : 'no saved dossier'}): the post has no condition and will gate on B9.` });
    else if (c.score < 1) topic.flags.push({ code: 'F-CONDITION', msg: `No dossier condition names "${t.topic}": the first free condition of ${town} (${c.issue.title}) is used.` });
  }
  if (!launch && slots.seasonal_topics.length) flags.push({ code: 'F-DATE', msg: 'No launch date on the client: no seasonal topic can be placed in its month, so they take the slots left after the question posts.' });

  // The batch's order: the cost guides, the seasonal topics inside the window, the first two local
  // posts, the held and bank question and decision posts, then the other local and seasonal topics
  const by = g => topics.filter(t => t.group === g);
  const locals = by('local');
  const seasonals = by('seasonal');
  const ordered = [...by('cost'), ...seasonals.filter(t => t.in_window), ...locals.slice(0, minLocal), ...by('held'), ...by('bank'), ...locals.slice(minLocal), ...seasonals.filter(t => !t.in_window)];
  if (locals.length < minLocal) flags.push({ code: 'F-LOCAL', msg: `${locals.length} local post${locals.length === 1 ? '' : 's'} (${minLocal} wanted per batch): the main towns need a saved dossier with a condition no page uses.` });

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
    const stack = pool.filter(q => sameCluster(t, q)).sort(byDoubt).slice(0, 5);
    for (const q of stack) used.add(q.id);
    const rest = pool.filter(q => sameCluster(t, q)).sort(byDoubt).slice(0, 5);
    for (const q of rest) used.add(q.id);
    t.query_stack = stack.map(q => q.id); t.stack = stack.map(ref);
    t.faq_ids = rest.map(q => q.id); t.faq = rest.map(ref);
  };
  const release = t => {
    if (t.question && t.question.source !== 'blog_bank') used.delete(t.question.id);
    if (fromPool(t)) for (const id of [...t.query_stack, ...t.faq_ids]) used.delete(id);
    if (t.question && t.question.source === 'blog_bank') { usedBank.delete(t.question.id); for (const id of [...t.query_stack, ...t.faq_ids]) usedBank.delete(id); }
    if (t.bank_topic) { usedBank.delete(t.bank_topic); for (const id of [...t.query_stack, ...t.faq_ids]) usedBank.delete(id); }
  };

  // The onboarding batch is the first 16; what is beyond it stays in the queue, its questions
  // back in the pool for the stacks (B1 before B6). A customer question in the batch with no
  // matching bank topic and fewer than three related questions is held (Brandon, 28 Oct): not
  // written, status Held on the queue, in the pool for the Search Console batch; the next topic
  // takes its slot and is stacked the same way
  const batch = ordered.slice(0, target);
  const dropped = ordered.slice(target);
  for (const t of dropped) release(t);
  for (const t of batch) if (fromPool(t)) stackFor(t);
  const heldBack = [];
  const skipped = []; // topics beyond the batch whose question a stack took: still listed beyond
  for (let i = 0; i < batch.length; i++) {
    const t = batch[i];
    if (!(t.group === 'held' && !t.bank_topic && t.query_stack.length < 3)) continue;
    batch.splice(i--, 1);
    for (const id of [...t.query_stack, ...t.faq_ids]) used.delete(id);
    t.query_stack = []; t.stack = []; t.faq_ids = []; t.faq = [];
    t.held = true;
    t.flags.push({ code: 'F-STACK', msg: `${t.question ? t.question.id + ' ' : ''}has fewer than 3 related questions and no bank topic matches it: held for the Search Console batch, not written.` });
    heldBack.push(t);
    // The next topic beyond the batch takes the slot, unless its question is in a stack already
    let next = dropped.shift();
    while (next && next.question && next.question.source !== 'blog_bank' && used.has(next.question.id)) { skipped.push(next); next = dropped.shift(); }
    if (next) {
      if (next.question && next.question.source !== 'blog_bank') used.add(next.question.id);
      if (next.question && next.question.source === 'blog_bank') { usedBank.add(next.question.id); for (const id of [...next.query_stack, ...next.faq_ids]) usedBank.add(id); }
      if (next.bank_topic) { usedBank.add(next.bank_topic); for (const id of [...next.query_stack, ...next.faq_ids]) usedBank.add(id); }
      if (fromPool(next)) stackFor(next);
      batch.push(next);
    }
  }
  dropped.push(...skipped);
  for (const t of batch) {
    if (t.query_stack.length < 3) t.flags.push({ code: 'F-STACK', msg: `${t.query_stack.length} query stack question${t.query_stack.length === 1 ? '' : 's'} (3 to 5 wanted): the post runs with what it has.` });
    if (t.faq_ids.length < 3) t.flags.push({ code: 'F-FAQ-ITEMS', msg: `${t.faq_ids.length} FAQ question${t.faq_ids.length === 1 ? '' : 's'} (3 to 5 wanted): fewer FAQ rows.` });
    if (t.needs_approval) t.flags.push({ code: 'F-WORDING', msg: 'The question was written by code: approve or edit it before the post runs (G-TOPIC).' });
    else if (t.question && !t.question.approved) t.flags.push({ code: 'F-WORDING', msg: `${t.question.id} is not approved on the FAQ card yet (G-TOPIC).` });
  }
  if (batch.length < target) flags.push({ code: 'F-QUEUE', msg: `${batch.length} topic${batch.length === 1 ? '' : 's'} for the onboarding batch (16 wanted): the cadence stops at the last topic; the Search Console batch picks up from month six.` });
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

module.exports = { reserveBlogTopics, postTypeOf, TARGET, DOUBT_ORDER, titleCase, question };
