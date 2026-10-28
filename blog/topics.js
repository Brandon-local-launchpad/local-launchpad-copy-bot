'use strict';

// ── The blog topic queue: B1 with Amendment 1 (stage 2, 28 Oct 2026) ─────────
// Reserved in the same sorting step that hands questions to every other page
// (faq-service.js assignmentFor): the topics, their query stacks (B6) and their FAQ IDs
// (B7) come from the two held buckets of faq-sort.js assignQuestions, "held for a Cost
// Guide page" and "no page for these", so no page can use a question a post needs.
// Code only, deterministic: the same inputs give the same list.
//
// The order (B1): the trade level cost guide ("[trade] cost in [city]", the Homepage cost
// guide), then one cost guide per main service (a held cost question for the service
// when there is one, else the code's own topic), then the held customer questions (the
// client's own customers' questions first; "X or Y", "repair or replace", "do I need"
// and the niche's decision pairs run as decision posts, the rest as question posts),
// then the local posts (one per town with a dossier condition no page uses) and the
// seasonal topics (a seasonal niche only). 16 topics for the onboarding batch; held
// questions left over stay in the queue for the Search Console batches; under 16 is
// F-QUEUE and the cadence stops at the last topic.
//
// A topic made by code (the trade cost guide, a service cost guide with no held
// question, a local or seasonal post) carries a default question as its wording and
// needs a person's approval on the queue screen, as a Search Console wording does
// (Amendment 1, B16); a held question's wording is approved on the FAQ card as today.

const { slugify } = require('../page-map/slugs');
const { pageFinder } = require('../faq-sort');
const { blocksFor } = require('./blocks');
const { parseDossier } = require('../geo-dossier');

const TARGET = 16;
const DOUBT_ORDER = ['Fit', 'Process', 'Price', 'Timing', 'Trust'];
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const lc = s => String(s || '').toLowerCase().trim();
const idNum = id => parseInt(String(id).replace(/\D/g, ''), 10) || 0;
const built = p => !/^not[\s_]?built$/i.test(p.status || '') && !!(p.urlSlug || '').trim();
const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'nor', 'but', 'of', 'in', 'on', 'for', 'to', 'at', 'by', 'with', 'from']);
const titleCase = s => String(s || '').split(/\s+/).map((w, i) => (i && SMALL.has(lc(w)) ? lc(w) : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
const question = s => { const t = titleCase(String(s || '').trim().replace(/[?.!]+$/, '')); return t ? `${t}?` : ''; };
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// B2: the post type from the wording and the niche's decision pairs
const DECISION_RE = /\b(?:repair or replace|replace or repair|do i need|should i|is it worth|which is (?:better|best|cheaper)|what(?:'s| is) (?:better|best|the difference)|versus|vs\.?)\b|\b[a-z]+ or [a-z]+\b/i;
function postTypeOf(q, decisionPairs = []) {
  const w = norm(q.wording || q.text);
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

function reserveBlogTopics({ assignment, cv = {}, niche = {}, keyValueMap = {}, pages = [], serviceParentMap = {}, dossiers = [], allocationRecord = null, usedSymptoms = new Set(), target = TARGET } = {}) {
  const flags = [];
  const held = (assignment && assignment.held) || {};
  const pool = [...(held.costGuide || []), ...(held.noPage || [])].sort(byOrder);
  const city = String(keyValueMap.biz_area_1 || '').trim();
  const tradeLower = niche.trade_lower || lc(niche.trade) || '';
  const slots = blocksFor({ niche, cv });
  const services = pages.filter(p => p.pageType === 'service' && built(p));
  const used = new Set();   // question ids used as a target, in a stack or as an FAQ
  const topics = [];
  const keys = new Set();
  // A question's page, found as the sorting step finds it (faq-sort.js pageFinder): its
  // service page, else its category page
  const finder = pageFinder({ cv, pages, keyValueMap, serviceParentMap, niche });
  const pageFor = q => finder.pageFor(q);
  const isLocalQ = q => !!(q.town || q.local || q.page === 'Location');
  const keyFor = base => { let k = `/guides/${slugify(base)}`; let n = 2; while (keys.has(k)) k = `/guides/${slugify(base)}-${n++}`; keys.add(k); return k; };
  const add = t => { topics.push({ batch: 'onboarding', query_stack: [], faq_ids: [], flags: [], ...t }); return topics[topics.length - 1]; };
  const qRef = q => ({ id: q.id, wording: q.wording || q.text, approved: !!q.approved, usable: q.usable !== false && !!q.approved, doubt: q.doubt || '', service: q.service || '', town: q.town || '', source: q.source || 'research' });

  // 1. The trade level cost guide (the Homepage cost guide, read by the homepage FAQ Q1)
  if (city && tradeLower) {
    add({ key: keyFor(`${tradeLower} cost ${city}`), post_type: 'cost_guide', source: 'faq_research', homepage_cost_guide: true, target_query: lc(`${tradeLower} cost ${city}`),
      wording: question(`how much does ${tradeLower} cost in ${city}`), wording_source: 'code', needs_approval: true, question: null, service: null, category: null, town: '', primary: '/', cost_unit: slots.cost_unit });
  } else flags.push({ code: 'F-QUEUE', msg: `No trade level cost guide: ${!city ? 'the hand set-up has no base town (biz_area_1)' : 'the niche entry has no trade'}.` });

  // 2. One cost guide per main service: the first three service pages in page map order
  // (the resolver's order: jobs wanted categories first). A held cost question that names
  // the service gives the wording; otherwise the topic is the code's own.
  const costQs = pool.filter(q => postTypeOf(q, slots.decision_pairs) === 'cost_guide');
  const main = services.slice(0, 3);
  for (const s of main) {
    const q = costQs.find(x => !used.has(x.id) && (pageFor(x).service || {}).urlSlug === s.urlSlug);
    if (q) used.add(q.id);
    add({ key: keyFor(`${s.pageTitle} cost ${city}`), post_type: 'cost_guide', source: 'faq_research', homepage_cost_guide: false, target_query: lc(`${s.pageTitle} cost ${city}`),
      wording: q ? question(q.wording || q.text) : question(`how much does ${lc(s.pageTitle)} cost in ${city}`), wording_source: q ? 'faq_research' : 'code', needs_approval: !q,
      question: q ? qRef(q) : null, service: { title: s.pageTitle, slug: s.urlSlug }, category: null, town: '', primary: s.urlSlug, cost_unit: slots.cost_unit });
  }
  if (!services.length) flags.push({ code: 'F-QUEUE', msg: 'No service pages in the page map, so no service cost guides.' });
  // A held cost question for another service or a category is a cost guide too (the queue is short otherwise)
  for (const q of costQs.filter(x => !used.has(x.id))) {
    const { service, category } = pageFor(q);
    if (!service && !category) continue;
    used.add(q.id);
    const name = service ? service.pageTitle : category.pageTitle;
    add({ key: keyFor(`${name} cost ${city}`), post_type: 'cost_guide', source: 'faq_research', homepage_cost_guide: false, target_query: lc(`${name} cost ${city}`),
      wording: question(q.wording || q.text), wording_source: 'faq_research', needs_approval: false, question: qRef(q),
      service: service ? { title: service.pageTitle, slug: service.urlSlug } : null, category: category ? { title: category.pageTitle, slug: category.urlSlug } : null, town: '', primary: service ? service.urlSlug : category.urlSlug, cost_unit: slots.cost_unit });
  }

  // 3. The customer question posts (decision and question), the client's own customers' questions first
  for (const q of pool.filter(x => !used.has(x.id))) {
    const type = postTypeOf(q, slots.decision_pairs);
    if (type === 'cost_guide') continue; // a cost question naming no page stays in the pool
    const { service, category } = pageFor(q);
    used.add(q.id);
    add({ key: keyFor(q.wording || q.text), post_type: type, source: 'faq_research', homepage_cost_guide: false, target_query: lc(norm(q.wording || q.text)),
      wording: question(q.wording || q.text), wording_source: q.source === 'client' ? 'client' : 'faq_research', needs_approval: false, question: qRef(q),
      service: service ? { title: service.pageTitle, slug: service.urlSlug } : null, category: category ? { title: category.pageTitle, slug: category.urlSlug } : null,
      town: type === 'local' ? (q.town || city) : '', primary: service ? service.urlSlug : category ? category.urlSlug : '/#services' });
  }

  // 4. Local posts: one per town with a dossier condition no page uses (the homepage's
  // symptoms, the symptoms the written pages took, the conditions earlier topics took)
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

  // 5. Seasonal topics (a seasonal niche only): local posts in the city with a time of year
  for (const t of slots.seasonal_topics) {
    if (!city) break;
    add({ key: keyFor(`${t.topic} ${city}`), post_type: 'local', source: 'seasonal', homepage_cost_guide: false, target_query: lc(norm(`${t.topic} ${city}`)),
      wording: question(`when should you ${lc(t.topic)} in ${city}`), wording_source: 'code', needs_approval: true, question: null, service: null, category: null, town: city,
      seasonal: { topic: t.topic, window: t.window, publish: t.publish }, primary: '/#services' });
  }

  // The onboarding batch is the first 16; a held question beyond it stays in the queue
  const batch = topics.slice(0, target);
  const dropped = topics.slice(target);
  for (const t of dropped) if (t.question) used.delete(t.question.id);

  // B6 and B7 on the batch: the stack and the FAQ questions from the same pool, same
  // service (and town for a local post), none used anywhere else, in doubt order
  const sameCluster = (t, q) => {
    if (used.has(q.id)) return false;
    // A local post's cluster is the questions about its town (a question about the city carries no town)
    if (t.post_type === 'local') return isLocalQ(q) && (q.town ? norm(q.town) === norm(t.town) : norm(t.town) === norm(city));
    const { service, category } = pageFor(q);
    if (t.service) return !!service && service.urlSlug === t.service.slug;
    if (t.category) return !!category && category.urlSlug === t.category.slug;
    // A post with no page of its own clusters on its question's service word
    if (t.question && t.question.service) return norm(q.service) === norm(t.question.service);
    // The trade cost guide takes the questions about the trade in general (no service word)
    return !q.service;
  };
  for (const t of batch) {
    const cluster = pool.filter(q => sameCluster(t, q)).sort(byDoubt);
    t.query_stack = cluster.slice(0, 5).map(q => q.id);
    for (const id of t.query_stack) used.add(id);
    const rest = pool.filter(q => sameCluster(t, q)).sort(byDoubt);
    t.faq_ids = rest.slice(0, 5).map(q => q.id);
    for (const id of t.faq_ids) used.add(id);
    if (t.query_stack.length < 3) t.flags.push({ code: 'F-STACK', msg: `${t.query_stack.length} query stack question${t.query_stack.length === 1 ? '' : 's'} (3 to 5 wanted): the post runs with what it has.` });
    if (t.faq_ids.length < 3) t.flags.push({ code: 'F-FAQ-ITEMS', msg: `${t.faq_ids.length} FAQ question${t.faq_ids.length === 1 ? '' : 's'} (3 to 5 wanted): fewer FAQ rows.` });
    if (t.needs_approval) t.flags.push({ code: 'F-WORDING', msg: 'The question was written by code: approve or edit it before the post runs (G-TOPIC).' });
    else if (t.question && !t.question.approved) t.flags.push({ code: 'F-WORDING', msg: `${t.question.id} is not approved on the FAQ card yet (G-TOPIC).` });
  }
  if (batch.length < target) flags.push({ code: 'F-QUEUE', msg: `${batch.length} topic${batch.length === 1 ? '' : 's'} for the onboarding batch (16 wanted): the cadence stops at the last topic; the Search Console batch picks up from month six.` });
  const leftovers = pool.filter(q => !used.has(q.id)).map(q => q.id);
  const stackIds = batch.flatMap(t => t.query_stack), faqIds = batch.flatMap(t => t.faq_ids);
  return {
    topics: batch,
    beyond: dropped.map(t => ({ key: t.key, post_type: t.post_type, wording: t.wording })),
    leftovers,
    pool: { costGuide: (held.costGuide || []).length, noPage: (held.noPage || []).length, total: pool.length },
    counts: { topics: batch.length, cost_guide: batch.filter(t => t.post_type === 'cost_guide').length, decision: batch.filter(t => t.post_type === 'decision').length, question: batch.filter(t => t.post_type === 'question').length, local: batch.filter(t => t.post_type === 'local').length, stack: stackIds.length, faq: faqIds.length, needs_approval: batch.filter(t => t.needs_approval || (t.question && !t.question.approved)).length },
    flags,
  };
}

module.exports = { reserveBlogTopics, postTypeOf, TARGET, DOUBT_ORDER, titleCase, question };
