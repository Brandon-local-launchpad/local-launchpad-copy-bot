'use strict';

// ── FAQ sorting step (F2) ────────────────────────────────────────────────────
// Takes the client's FAQ question research (faq-research.js) and decides where
// each question may be used:
//   1. tidy (one model call, checked by code, one retry): duplicates, questions the
//      fixed homepage questions already answer, the client fact each answer needs,
//      the service and town, and the question in search wording;
//   2. approval: a person approves the wording once per client on the FAQ card;
//   3. assign (code only, worked out each time it's read): one page per question,
//      by page type, service and town. A question that needs a client fact is held
//      until that fact is supplied; big cost questions are held for a Cost Guide
//      page; a question for a page the client doesn't have moves up to that
//      service's category page, or is dropped. No question is used on two pages.

const fs   = require('fs');
const path = require('path');
const { practicesFor } = require('./practices');
const { BANNED, STOCK } = require('./validate-v20');
const { clientTowns, clientServicesByCategory, customerQuestions, DOUBTS, PAGE_TYPES: PAGES } = require('./faq-research');

const FAQ_SORT_MODEL  = 'claude-sonnet-4-6';
const FAQ_SORT_PROMPT = 'FAQ_Sorting_CORE.md';
const CLIENT_FACTS = require('./niche-library/client-facts.json').facts;
const MAX_WORDS = 14;

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const idNum = id => parseInt(String(id).replace(/\D/g, ''), 10) || 0;

function loadSortPrompt() {
  const text = fs.readFileSync(path.join(__dirname, 'prompts', FAQ_SORT_PROMPT), 'utf8');
  // Windows checkouts can have CRLF line endings
  const lf = text.replace(/\r\n/g, '\n');
  const cut = lf.indexOf('\n---\n');
  return (cut >= 0 ? lf.slice(cut + 5) : lf).trim();
}

// ── Facts ────────────────────────────────────────────────────────────────────

// Every fact an answer can rest on: client values, then this niche's practices
function factList(niche) {
  return [
    ...CLIENT_FACTS.filter(f => f.use !== 'questions').map(f => ({ key: f.key, kind: 'value', label: f.label, question: f.question, supplied: f.supplied, isNew: !!f.new })),
    ...practicesFor(niche).map(p => ({ key: p.key, kind: 'practice', label: p.label, question: p.question, claim: p.claim })),
  ];
}

function factSupplied(fact, cv) {
  if (!fact) return false;
  if (fact.kind === 'practice') return (Array.isArray(cv.confirmed_practices) ? cv.confirmed_practices : []).includes(fact.key);
  const v = cv[fact.key];
  const filled = Array.isArray(v) ? v.length > 0 : String(v ?? '').trim() !== '';
  if (fact.supplied === 'yes') return v === 'yes';
  if (fact.supplied === 'guarantee') return (parseInt(cv.guarantee_years, 10) > 0) || !!String(cv.manufacturer_warranty || '').trim();
  return filled; // filled, answered
}

// ── Fixed homepage questions (decisions.js buildFaq owns these slots) ───────

function fixedHomepageQuestions(niche, city) {
  const slot = {};
  for (const f of (niche.faq_slots || [])) slot[f.slot] = f.question;
  const alt = (...keys) => keys.map(k => slot[k]).filter(Boolean).join(' / ');
  return [
    { slot: 'Q1', question: `How much does ${niche.trade_lower || 'the work'} cost in ${city || 'the city'}? (cost in general)` },
    { slot: 'Q2', question: alt('faq_2', 'faq_2_fallback') },
    { slot: 'Q3', question: alt('faq_3', 'faq_3_none') },
    { slot: 'Q4', question: alt('faq_4') },
    { slot: 'Q5', question: alt('faq_5_free', 'faq_5_free_inspection', 'faq_5_not_free') },
    { slot: 'Q6', question: 'Which areas do you cover?' },
    { slot: 'Q8', question: alt('faq_B') },
    { slot: 'Q9', question: alt('faq_planning') },
  ].filter(q => q.question);
}

// ── Wording rules (the copy rules that apply to a question) ─────────────────

function checkWording(text) {
  const errors = [];
  const t = String(text || '').trim();
  if (!t) return ['the wording is empty'];
  if (/[—–]/.test(t)) errors.push('it has a dash');
  const hyph = t.match(/\b[A-Za-z]+-[A-Za-z]+\b/g);
  if (hyph) errors.push(`hyphenated words: ${[...new Set(hyph)].join(', ')}`);
  if (!/\?$/.test(t)) errors.push('it must end with a question mark');
  if ((t.match(/\?/g) || []).length > 1) errors.push('it must be one question');
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words > MAX_WORDS) errors.push(`${words} words (${MAX_WORDS} at most)`);
  for (const p of [...BANNED, ...STOCK]) if (new RegExp(`\\b${esc(p)}\\b`, 'i').test(t)) errors.push(`banned phrase "${p}"`);
  if (/\bexactly\b/i.test(t)) errors.push('"exactly"');
  return errors;
}

// ── Tidy call ────────────────────────────────────────────────────────────────

function serviceChoices(keyValueMap, serviceParentMap, niche, pages = [], cv = {}) {
  const cats = clientServicesByCategory(keyValueMap, serviceParentMap, niche, { pages, primaryCategory: cv.primary_category });
  const names = new Map(); // norm → exact
  for (const c of cats) {
    names.set(norm(c.category), c.category);
    for (const s of c.services) names.set(norm(s.say), s.say);
  }
  return { cats, names };
}

function buildSortMessage({ research, niche, keyValueMap, serviceParentMap, pages, cv }) {
  const towns = clientTowns(keyValueMap);
  const { cats } = serviceChoices(keyValueMap, serviceParentMap, niche, pages, cv);
  const L = [];
  L.push('CLIENT:');
  L.push(`  Trade: ${niche.trade_person || niche.trade || ''}`);
  L.push(`  Primary city: ${towns[0] || ''}`);
  L.push(`  Other towns: ${towns.slice(1).join(', ') || 'none'}`);
  L.push('  Categories and services:');
  for (const c of cats) L.push(`    ${c.category}: ${[...new Set(c.services.map(s => s.say))].join(', ') || '(none)'}`);
  L.push('');
  L.push('FIXED HOMEPAGE QUESTIONS:');
  for (const q of fixedHomepageQuestions(niche, towns[0])) L.push(`  ${q.slot}: ${q.question}`);
  L.push('');
  L.push('FACTS:');
  for (const f of factList(niche)) L.push(`  ${f.key} | ${f.label}`);
  L.push('');
  L.push('QUESTIONS:');
  for (const q of research.questions) {
    L.push(`  ${q.id} | ${q.text} | ${q.doubt || '?'} | page: ${q.page || '?'} | local: ${q.local ? 'Y' : 'N'}${q.town ? ' ' + q.town : ''} | needs client fact: ${q.source === 'client' ? '?' : q.needsFact ? 'Y' : 'N'}${q.source === 'client' ? " | FROM THE CLIENT'S CUSTOMERS" : ''}`);
  }
  return L.join('\n');
}

// Code is the gate: every answer is checked; bad parts become errors for the retry.
function checkTidy(reply, { research, niche, keyValueMap, serviceParentMap, pages, cv }) {
  const errors = [];
  const items = {};
  const list = reply && Array.isArray(reply.questions) ? reply.questions : null;
  if (!list) return { items, errors: ['the reply has no "questions" list'] };
  const ids = research.questions.map(q => q.id);
  const byId = Object.fromEntries(research.questions.map(q => [q.id, q]));
  const facts = new Set(factList(niche).map(f => f.key));
  const slots = new Set(fixedHomepageQuestions(niche, '').map(q => q.slot));
  const towns = new Map(clientTowns(keyValueMap).map(t => [norm(t), t]));
  const { names } = serviceChoices(keyValueMap, serviceParentMap, niche, pages, cv);

  for (const r of list) {
    const id = String(r.id || '').toUpperCase();
    if (!byId[id]) { errors.push(`${r.id || '(no id)'} is not one of the QUESTIONS`); continue; }
    if (items[id]) { errors.push(`${id} appears twice`); continue; }
    const it = { duplicate_of: '', covered_by: '', fact: '', new_fact: '', service: '', town: '', wording: '', doubt: '', page: '' };
    const problems = [];
    const dup = String(r.duplicate_of || '').toUpperCase();
    if (dup) {
      if (!byId[dup]) problems.push(`duplicate_of ${dup} is not one of the QUESTIONS`);
      else if (dup === id) problems.push('duplicate_of points at itself');
      else it.duplicate_of = dup;
    }
    const cov = String(r.covered_by || '').toUpperCase();
    if (cov) { if (slots.has(cov)) it.covered_by = cov; else problems.push(`covered_by ${r.covered_by} is not a FIXED HOMEPAGE QUESTIONS slot`); }
    const fact = String(r.fact || '').trim();
    if (fact) { if (facts.has(fact)) it.fact = fact; else problems.push(`fact "${fact}" is not a key in FACTS (use new_fact for a fact that isn't listed)`); }
    it.new_fact = String(r.new_fact || '').trim();
    if (byId[id].needsFact && !it.fact && !it.new_fact && !it.duplicate_of && !it.covered_by) problems.push('it needs a client fact: give fact or new_fact');
    const svc = String(r.service || '').trim();
    if (!svc || /^general$/i.test(svc)) it.service = '';
    else if (names.has(norm(svc))) it.service = names.get(norm(svc));
    else problems.push(`service "${svc}" is not a category or service word from CLIENT`);
    // A problem word ("drainage") is not the service when the question names the job
    // ("before a new driveway or patio"): the job's page answers it
    const pageType = it.page || byId[id].page;
    if (it.service && pageType !== 'Location' && (niche.problem_service_words || []).some(w => norm(w) === norm(it.service))) {
      const stem = w => norm(w).replace(/s\b/g, '');
      const text = stem(byId[id].text);
      const jobs = [...names.values()].filter(w => norm(w) !== norm(it.service) && !(niche.problem_service_words || []).some(p => norm(p) === norm(w)) && stem(w).length > 3 && new RegExp(`\\b${stem(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text));
      if (jobs.length) problems.push(`service "${it.service}" is the problem, not the job: the question is about ${jobs.slice(0, 3).join(' or ')}, so choose that job's service word`);
    }
    const town = String(r.town || '').trim();
    if (town) { if (towns.has(norm(town))) it.town = towns.get(norm(town)); else problems.push(`town "${town}" is not a town from CLIENT`); }
    // The customers' own questions arrive without a doubt or page: the reply gives them
    if (!byId[id].doubt) {
      const d = DOUBTS.find(x => x.toLowerCase() === String(r.doubt || '').trim().toLowerCase());
      if (d) it.doubt = d; else problems.push(`doubt "${r.doubt || ''}" must be one of ${DOUBTS.join(', ')}`);
    }
    if (!byId[id].page) {
      const p = PAGES.find(x => x.toLowerCase() === String(r.page || '').trim().toLowerCase());
      if (p) it.page = p; else problems.push(`page "${r.page || ''}" must be one of ${PAGES.join(', ')}`);
    }
    it.wording = String(r.wording || '').trim();
    // A question about one of the client's other towns names that town, so two location
    // pages never carry the same wording
    const qTown = it.town || byId[id].town;
    if (qTown && (it.page || byId[id].page) === 'Location' && norm(qTown) !== norm(clientTowns(keyValueMap)[0] || '') && it.wording && !norm(it.wording).includes(norm(qTown))) problems.push(`wording "${it.wording}": it must name the town (${qTown})`);
    for (const e of checkWording(it.wording)) problems.push(`wording "${it.wording}": ${e}`);
    if (problems.length) errors.push(...problems.map(p => `${id}: ${p}`));
    it.problems = problems;
    items[id] = it;
  }
  for (const id of ids) if (!items[id]) errors.push(`${id} is missing from your reply`);
  // A duplicate of a duplicate is followed back to its original
  for (const it of Object.values(items)) {
    const chain = new Set();
    while (it.duplicate_of && items[it.duplicate_of] && items[it.duplicate_of].duplicate_of && !chain.has(it.duplicate_of)) {
      chain.add(it.duplicate_of);
      it.duplicate_of = items[it.duplicate_of].duplicate_of;
    }
  }
  return { items, errors };
}

// Run the tidy call. `callModel(system, message)` returns the model's text reply.
// Returns the questions with their tidy answers merged in. A question whose answer
// still has problems after the retry keeps its research wording and is marked, so
// it can't be approved until the wording is fixed on the card.
async function runTidy({ research, niche, keyValueMap, serviceParentMap, pages = [], cv = {}, callModel }) {
  const system = loadSortPrompt();
  const ctx = { research, niche, keyValueMap, serviceParentMap, pages, cv };
  const message = buildSortMessage(ctx);
  const attempts = [];
  const best = {};
  let feedback = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const msg = feedback ? `${message}\n\nYOUR LAST REPLY HAD THESE PROBLEMS. Fix them and reply again with every question:\n${feedback}` : message;
    let result;
    try {
      const raw = await callModel(system, msg);
      result = checkTidy(require('./json-extract').extractJsonObject(raw), ctx);
    } catch (e) {
      result = { items: {}, errors: [`reply could not be read: ${e.message}`] };
    }
    attempts.push({ attempt, errors: result.errors });
    // Keep each question's best answer across attempts (fewest problems)
    for (const [id, it] of Object.entries(result.items)) {
      if (!best[id] || it.problems.length < best[id].problems.length) best[id] = it;
    }
    if (!result.errors.length) break;
    feedback = result.errors.map(e => `- ${e}`).join('\n');
  }

  const questions = research.questions.map(q => {
    const it = best[q.id] || { duplicate_of: '', covered_by: '', fact: '', new_fact: '', service: '', town: '', wording: '', problems: ['no answer from the tidy step'] };
    const wordingErrors = checkWording(it.wording);
    return {
      ...q,
      duplicate_of: it.duplicate_of,
      covered_by: it.covered_by,
      fact: it.fact,
      new_fact: it.new_fact,
      doubt: q.doubt || it.doubt || '',
      page: q.page || it.page || '',
      service: it.service || '',
      town: it.town || q.town || '',
      wording: wordingErrors.length ? q.text : it.wording,
      wording_errors: wordingErrors.length ? checkWording(q.text) : [],
      tidy_problems: it.problems,
      approved: false,
      page_override: null,
    };
  });
  return { questions, attempts, model: FAQ_SORT_MODEL };
}

// The client's own customers' questions (client value customer_questions) as
// questions for the sorting step: IDs C-1, C-2…, placed ahead of the research.
function clientQuestionItems(cv = {}) {
  return customerQuestions(cv).map((text, i) => ({
    id: `C-${i + 1}`, text, source: 'client', doubt: '', page: '', service: '', local: false, town: '',
    needsFact: false, seen: "the client's customers", seenCount: 0, url: '', dated: '', rank: null,
  }));
}

// Re-tidy keeps a person's work for a question whose research text is unchanged:
// hand edits, moves, and approvals with the wording that was approved (a re-sort
// never swaps approved wording for new wording nobody has seen).
function carryOver(newQuestions, oldQuestions = []) {
  const old = new Map(oldQuestions.map(q => [norm(q.text), q]));
  return newQuestions.map(q => {
    const o = old.get(norm(q.text));
    if (!o) return q;
    const keepOld = !!(o.edited || o.approved);
    const wording = keepOld ? o.wording : q.wording;
    return { ...q, wording, wording_errors: checkWording(wording),
      edited: !!o.edited, approved: !!o.approved, page_override: o.page_override || null };
  });
}

// The fixed homepage questions this client's homepage actually shows (decisions.js
// buildFaq): a research question is only "answered by" one of these.
function shownFixedSlots(cv, niche) {
  const slot = Object.fromEntries((niche.faq_slots || []).map(f => [f.slot, f]));
  const shown = new Set(['Q1', 'Q5', 'Q6']);
  if (cv.insurance_cover || cv.complaints_process) shown.add('Q2');
  if ((parseInt(cv.guarantee_years, 10) > 0) || cv.manufacturer_warranty || slot.faq_3_none) shown.add('Q3');
  if (cv.start_time) shown.add('Q4');
  if (slot.faq_B) shown.add('Q8');
  if (niche.big_ticket && cv.handles_planning === 'yes' && slot.faq_planning) shown.add('Q9');
  return shown;
}

// ── Assignment (code) ────────────────────────────────────────────────────────

const isBuilt = p => !/^not[\s_]?built$/i.test(p.status || '') && !!(p.urlSlug || '').trim();
const pageId = p => p.pageType === 'homepage' ? 'homepage:homepage' : `${p.pageType}:${p.urlSlug}`;

// Big cost questions belong to a Cost Guide page, not an FAQ block
function isCostQuestion(q) {
  return q.doubt === 'Price' && /\bhow much\b|\bcost(s)? per\b|\bprice per\b/i.test(q.text) && !/\bdeposit\b/i.test(q.text);
}

function assignQuestions({ questions, cv, pages, keyValueMap, serviceParentMap, niche, pins = {} }) {
  const facts = Object.fromEntries(factList(niche).map(f => [f.key, f]));
  const city = clientTowns(keyValueMap)[0] || '';
  const built = pages.filter(isBuilt);
  const homepage = pages.find(p => p.pageType === 'homepage');
  const byType = t => built.filter(p => p.pageType === t);
  const findTitle = (t, name) => byType(t).find(p => norm(p.pageTitle) === norm(name));
  const { cats } = serviceChoices(keyValueMap, serviceParentMap, niche, pages, cv);

  // A service word can sit under more than one category ("garden design"); every
  // GBP service with that word counts, in category order.
  const isCategory = name => cats.some(c => norm(c.category) === norm(name));
  const owners = service => cats.flatMap(c => c.services.filter(s => norm(s.say) === norm(service)).map(s => ({ category: c.category, gbp: s.gbp })));
  function servicePage(service) {
    for (const o of owners(service)) { const p = findTitle('service', o.gbp); if (p) return p; }
    return null;
  }
  // How many of a category's service words the question names ("a new driveway or
  // patio" names two Paving contractor services and one Landscape Gardener one)
  const stemOf = w => norm(w).replace(/s\b/g, '');
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function textScore(category, text) {
    const c = cats.find(x => norm(x.category) === norm(category));
    if (!c || !text) return 0;
    const said = stemOf(text);
    const problems = new Set((niche.problem_service_words || []).map(stemOf)); // "drainage" names the problem, not the job
    return new Set(c.services.map(s => stemOf(s.say)).filter(w => w.length > 3 && !problems.has(w) && new RegExp(`\\b${escRe(w)}\\b`).test(said))).size;
  }
  function categoryPage(service, text = '') {
    // A category named for the word comes first ("lawn care" → Lawn care service), then
    // the categories whose services carry it, in GBP order. When the question names
    // jobs, the category with the most of them wins.
    const named = cats.filter(c => norm(c.category) !== norm(service) && norm(c.category).startsWith(norm(service) + ' ')).map(c => c.category);
    let names = isCategory(service) ? [service] : [...new Set([...named, ...owners(service).map(o => o.category)])];
    if (!isCategory(service) && text) {
      const scored = [...new Set([...names, ...cats.map(c => c.category)])].map((n, i) => ({ n, i, s: textScore(n, text) }));
      const best = Math.max(0, ...scored.map(x => x.s));
      if (best > 0) names = [...scored.filter(x => x.s === best).sort((x, y) => x.i - y.i).map(x => x.n), ...names];
    }
    for (const n of names) { const p = findTitle('category', n); if (p) return p; }
    return null;
  }
  // Where a question goes, and why when it goes nowhere
  function route(q) {
    if (q.page === 'Homepage') return { page: homepage };
    if (q.page === 'Location') {
      const town = q.town;
      if (!town || norm(town) === norm(city)) return { page: homepage, note: town ? `about ${town}, the primary city` : 'no town named' };
      const p = findTitle('location', town);
      return p ? { page: p } : { why: `no location page for ${town}` };
    }
    if (q.page === 'Category' || q.page === 'Service') {
      if (!q.service) return { why: 'not about one service or category' };
      // A general word ("garden makeovers", "landscaping") is the category's subject,
      // not the narrow service page that happens to carry it ("Garden decorating")
      const general = (niche.general_service_words || []).some(w => norm(w) === norm(q.service));
      const asService = q.page === 'Service' && !isCategory(q.service) && !general;
      if (asService) { const sp = servicePage(q.service); if (sp) return { page: sp }; }
      const cp = categoryPage(q.service, q.text);
      if (cp) return { page: cp, note: asService ? `no ${q.service} page: moved up to its category page` : '' };
      return { why: `no page for ${q.service} or its category` };
    }
    return { why: `unknown page type "${q.page}"` };
  }

  const pageOf = new Map();
  const out = { pages: {}, held: { covered: [], duplicate: [], costGuide: [], noPage: [], dropped: [] }, waiting: [] };
  const add = (p, q) => {
    const id = pageId(p);
    if (!out.pages[id]) out.pages[id] = { id, type: p.pageType, key: p.pageType === 'homepage' ? 'homepage' : p.urlSlug, title: p.pageTitle, questions: [] };
    out.pages[id].questions.push(q);
  };
  // The client's own customers' questions first (FAQ Framework section 2), then the research order
  const ordered = [...questions].sort((a, b) =>
    (a.source === 'client' ? 0 : 1) - (b.source === 'client' ? 0 : 1) || (a.rank || 999) - (b.rank || 999) || (b.seenCount || 0) - (a.seenCount || 0) || idNum(a.id) - idNum(b.id));
  const usedWording = new Set();
  const shown = shownFixedSlots(cv, niche);
  const byId = new Map(questions.map(q => [q.id, q]));

  for (const q0 of ordered) {
    const q = { ...q0 };
    const fact = q.fact ? facts[q.fact] : null;
    // A fact Copybot doesn't collect yet (new_fact) can't be supplied, so the question waits
    q.needs_fact = !!(q.needsFact || q.fact || q.new_fact);
    q.fact_label = [fact && fact.label, q.new_fact].filter(Boolean).join(' and ') || (q.needs_fact ? 'a fact not yet named' : '');
    q.fact_supplied = !q.needs_fact || (!!fact && factSupplied(fact, cv) && !q.new_fact);
    q.usable = q.approved && q.fact_supplied && !q.wording_errors.length;

    // A big cost question is kept for a Cost Guide page even when Q1 covers cost in general
    if (isCostQuestion(q)) { q.held_reason = 'held for a Cost Guide page'; out.held.costGuide.push(q); continue; }
    // A move by hand wins over the tidy step's covered and duplicate calls
    const moved = q.page_override && q.page_override !== 'drop';
    if (q.page_override === 'drop') { out.held.dropped.push(q); continue; }
    // "Answered by" a fixed homepage question only when that question is shown, and
    // never for a question about another town (its location page answers it)
    const otherTown = q.town && norm(q.town) !== norm(city);
    if (q.covered_by && !moved && shown.has(q.covered_by) && !otherTown) { out.held.covered.push(q); continue; }
    if (q.covered_by && !shown.has(q.covered_by)) q.route_note = `its homepage question ${q.covered_by} isn't shown`;
    // The same question about a different town is not a duplicate: each location page keeps its own
    const orig = q.duplicate_of ? byId.get(q.duplicate_of) : null;
    const otherTownDup = orig && q.town && orig.town && norm(q.town) !== norm(orig.town);
    if (q.duplicate_of && !moved && !otherTownDup) { out.held.duplicate.push(q); continue; }

    let target = null;
    const pin = pins[norm(q.wording)];
    if (q.page_override) target = pages.find(p => pageId(p) === q.page_override) || null;
    if (!target && pin) target = pages.find(p => pageId(p) === pin) || null;
    if (!target) {
      const r = route(q);
      if (!r.page) { q.held_reason = r.why; out.held.noPage.push(q); continue; }
      target = r.page;
      q.route_note = [q.route_note, r.note].filter(Boolean).join('; ');
    }
    q.pinned = !!pin && pageId(target) === pin;
    // No question twice on the site, even if two IDs end up with the same wording
    const w = norm(q.wording);
    if (usedWording.has(w)) { q.held_reason = 'same wording as a question already placed'; out.held.duplicate.push(q); continue; }
    usedWording.add(w);
    add(target, q);
    pageOf.set(q.id, pageId(target));
    if (!q.fact_supplied) out.waiting.push(q);
  }
  // Pinned questions first on their page, then the research order
  for (const p of Object.values(out.pages)) p.questions.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  // Waiting list grouped by fact: this is also the client's onboarding list
  const byFact = new Map();
  for (const q of out.waiting) {
    const f = facts[q.fact];
    const missing = q.new_fact || !f ? { key: `new:${norm(q.new_fact || 'unnamed')}`, fact: null, label: q.new_fact || 'a fact not yet named', kind: 'not collected yet', question: null }
      : { key: f.key, fact: f.key, label: f.label, kind: f.kind, question: f.question };
    const key = missing.key;
    if (!byFact.has(key)) byFact.set(key, { ...missing, questions: [] });
    byFact.get(key).questions.push({ id: q.id, wording: q.wording, page: pageOf.get(q.id) });
  }
  out.waitingByFact = [...byFact.values()];
  return out;
}

// Same wording on two pages (the assignment prevents it; this checks any set of pages)
function siteRepeats(pagesQuestions) {
  const seen = new Map();
  const repeats = [];
  for (const [page, qs] of Object.entries(pagesQuestions)) {
    for (const q of qs) {
      const w = norm(typeof q === 'string' ? q : q.wording || q.question);
      if (seen.has(w) && seen.get(w) !== page) repeats.push({ question: typeof q === 'string' ? q : (q.wording || q.question), pages: [seen.get(w), page] });
      else seen.set(w, page);
    }
  }
  return repeats;
}

// ── Homepage use (F3) ────────────────────────────────────────────────────────

const GENERAL_BRIEF = 'A general answer: say what it depends on and give one concrete example. No prices, timescales, guarantees or working practices, and never say what this business does or offers. For planning, building regulations or permissions, say it depends on the property and to check with the council; give no rule details. Answer as this business: never tell the reader to get other quotes, compare firms or shop around.';

function answerBrief(q, facts) {
  const f = q.fact ? facts[q.fact] : null;
  if (!f) return GENERAL_BRIEF;
  if (f.kind === 'practice') return `Answer from this confirmed practice only: ${f.claim}. State nothing beyond it.`;
  if (f.key === 'waste_carrier_registered') return 'Yes: the business is a registered waste carrier (confirmed). Say so plainly; no licence number and nothing about where the waste goes.';
  if (f.key === 'guarantee_years') return 'Answer from [CV: guarantee_years], [CV: guarantee_scope] and [CV: manufacturer_warranty] only, as given.';
  return `Answer from [CV: ${f.key}] only, as it is given. Add no figures, terms or working practices it doesn't state.`;
}

// The questions the homepage may use, in order: approved, fact supplied, wording clean
function homepageQuestions(assignment, niche) {
  const facts = Object.fromEntries(factList(niche).map(f => [f.key, f]));
  const hp = assignment.pages['homepage:homepage'];
  if (!hp) return [];
  return hp.questions.filter(q => q.usable).map(q => ({
    research_id: q.id, question: q.wording, doubt: q.doubt, fact: q.fact || null, answer_brief: answerBrief(q, facts),
  }));
}

module.exports = {
  FAQ_SORT_MODEL, CLIENT_FACTS,
  loadSortPrompt, factList, factSupplied, fixedHomepageQuestions, checkWording,
  buildSortMessage, checkTidy, runTidy, carryOver, clientQuestionItems,
  isCostQuestion, assignQuestions, shownFixedSlots, siteRepeats, answerBrief, homepageQuestions, pageId, normWording: norm,
};
