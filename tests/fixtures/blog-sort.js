'use strict';
// Fixture: blog posts, stage 2 (sorting reserves the blog topics), 28 Oct 2026. The live
// Edens Edge FAQ research reply and its real tidy replies (tests/fixtures/faq-research-replies,
// faq-sort-replies, 14 Oct) replayed through the sorting step as tests/fixtures/faq-sort.js
// does, then the topic reservation (blog/topics.js: B1 with Amendment 1, B2, B6, B7) and
// the site wide check (blog/site-check.js) on the Southampton dossier. No API calls.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'faq-research.js'));
const S = require(path.join(root, 'faq-sort.js'));
const C = require(path.join(__dirname, 'data/faq-clients.js'));
const { reserveBlogTopics, postTypeOf, question } = require(path.join(root, 'blog/topics.js'));
const { siteWideCheck, symptomsOf } = require(path.join(root, 'blog/site-check.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const { createFaqService } = require(path.join(root, 'faq-service.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const has = (list, re) => (list || []).some(x => typeof x === 'string' ? re.test(x) : (re.test(x.code || '') || re.test(x.msg || '')));
console.log('\n=== FIXTURE: blog posts, stage 2 (sorting reserves the blog topics) ===\n');

const edens = C.byId['edens-edge'];
const niche = { ...edens.niche, _source: 'landscaper' };
const dossierText = fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8');
const parsedCity = parseDossier(dossierText);

(async () => {
  // ── The live Edens Edge sort, replayed ──
  const liveResearch = R.parseFaqResearch(fs.readFileSync(path.join(__dirname, 'faq-research-replies/edens-edge-live-2026-10-14.md'), 'utf8'));
  const liveReplies = JSON.parse(fs.readFileSync(path.join(__dirname, 'faq-sort-replies/edens-edge-live.json'), 'utf8')).replies;
  const liveCv = { ...edens.cvThin, primary_category: 'Gardener', insurance_cover: '5m', differentiator_2_confirmed: true };
  let li = 0;
  const tidy = await S.runTidy({ research: liveResearch, niche: edens.niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, pages: edens.pages, cv: liveCv, callModel: async () => liveReplies[li++] });
  const questions = tidy.questions.map(q => ({ ...q, approved: !q.wording_errors.length }));
  const args = { questions, cv: liveCv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, niche: edens.niche };
  const A = S.assignQuestions(args);
  const held = [...A.held.costGuide, ...A.held.noPage].map(q => q.id);
  chk('Live sort: 48 questions, 46 placed on pages, 2 held for a cost guide, none with no page (the blog\'s pool)', questions.length === 48 && Object.values(A.pages).reduce((n, p) => n + p.questions.length, 0) === 46 && A.held.costGuide.length === 2 && A.held.noPage.length === 0, JSON.stringify({ q: questions.length, cg: A.held.costGuide.length, np: A.held.noPage.length }), '');

  // ── The reservation ──
  const dossiers = [{ location: 'Southampton', text: dossierText }];
  const alloc = { version: 1, pages: { homepage: { neighbourhoods: ['SOU-N07', 'SOU-N14'], symptoms: { faq_B: 'SOU-S01' }, conservation_areas: ['SOU-N14'] }, 'category:/gardener': { neighbourhoods: ['SOU-N04', 'SOU-N13'] } } };
  const B = reserveBlogTopics({ assignment: A, cv: liveCv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, serviceParentMap: edens.serviceParentMap, dossiers, allocationRecord: alloc });
  // The shape gate (Brandon, 28 Oct): with no bank no topic has 3 related questions, so every
  // topic is held (G-STACK), in B1 order; the batch is empty. The reservation's content is on
  // the held list
  const T = [...B.topics, ...B.held_back]; // the cost guides (never held: fixed H2s) then the held local topics
  const byType = t => T.filter(x => x.post_type === t);
  chk('Topics in B1 order: the trade cost guide first (Homepage cost guide), then the service cost guides, then the held cost questions as cost guides, then the local posts, then the four seasonal topics',
    T[0].homepage_cost_guide && T[0].post_type === 'cost_guide' && T[0].key === '/guides/landscaping-cost-southampton' && T[0].wording === 'How Much Does Landscaping Cost in Southampton?' && T[0].primary === '/' && T[0].needs_approval
      && T.slice(1, 4).every(t => t.post_type === 'cost_guide' && t.service) && byType('local').length === 5 && T.filter(t => t.source === 'seasonal').length === 4 && T.filter(t => t.source === 'dossier').length === 1,
    JSON.stringify(T.map(t => [t.post_type, t.source, t.key])), '');
  chk('Cost guides: the first three service pages in page map order, keyed [service] cost [city] at /guides/, the primary link the service page', T.slice(1, 4).map(t => t.key).join() === edens.pages.filter(p => p.pageType === 'service' && p.urlSlug && !/not built/i.test(p.status)).slice(0, 3).map(p => `/guides/${p.pageTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}-cost-southampton`).join() && T.slice(1, 4).every(t => t.primary === t.service.slug && t.target_query.endsWith(' cost southampton')), T.slice(1, 4).map(t => t.key).join(), '');
  const q6 = T.find(t => t.question && t.question.id === 'Q-6'), q20 = T.find(t => t.question && t.question.id === 'Q-20');
  chk('The two held cost questions become cost guides with their approved wording: Q-6 (garden makeovers) on its category page, Q-20 (gardening) on the Gardener category page, no approval needed', q6 && q6.post_type === 'cost_guide' && !q6.needs_approval && q6.wording === 'How Much Does a Complete Garden Makeover Cost?' && q6.category && q20 && q20.category && /gardener/i.test(q20.category.title) && q20.primary === q20.category.slug, JSON.stringify([q6 && [q6.wording, q6.category, q6.primary], q20 && [q20.category, q20.primary]]), '');
  chk('Local post: one for Southampton from the first dossier condition no page uses (the homepage took SOU-S01, so SOU-I01 is out; SOU-I02 has only urgent symptoms), its first calm symptom as the homeowner\'s own question (Brandon, 28 Oct: "Why Does a Puddle Form Where the Garden Path Dips in Southampton?", never the condition\'s research title), a code question needing approval', (() => { const l = T.find(t => t.source === 'dossier'); return l && l.town === 'Southampton' && l.dossier_condition.id === 'SOU-I03' && l.dossier_condition.symptom.id === 'SOU-S14' && l.wording === 'Why Does a Puddle Form Where the Garden Path Dips in Southampton?' && l.wording.length <= 70 && l.needs_approval && (l.primary === '/#services' || (l.service && l.primary === l.service.slug)); })(), JSON.stringify([(T.find(t => t.source === 'dossier') || {}).wording, (T.find(t => t.source === 'dossier') || {}).dossier_condition]), 'SOU-I03, SOU-S14');
  chk('Seasonal posts: the four landscaper topics as local posts in the city with their windows, source seasonal', T.filter(t => t.source === 'seasonal').every(t => t.post_type === 'local' && t.town === 'Southampton' && t.seasonal && t.seasonal.window && t.needs_approval) && T.find(t => t.source === 'seasonal').wording === 'When Should You Lay New Turf in Southampton?', T.filter(t => t.source === 'seasonal').map(t => t.wording).join(' | '), '');
  chk('Short queue: the six cost guides run (their H2s are the fixed set, so the shape gate never holds one) and the five local topics are held (no related questions without a bank); F-QUEUE says 6 topics; nothing beyond the batch; no leftovers', T.length === 11 && B.topics.length === 6 && B.topics.every(t => t.post_type === 'cost_guide') && B.held_back.length === 5 && has(B.flags, /^F-QUEUE$/) && B.flags.some(f => /6 topics for the onboarding batch \(16 wanted\)/.test(f.msg)) && B.beyond.length === 0 && B.leftovers.length === 0, JSON.stringify({ n: T.length, batch: B.topics.length, flags: B.flags.map(f => f.msg), left: B.leftovers }), '');
  chk('The shape gate: every held topic has no stack and no FAQ and says so (held (G-STACK), not written; the Search Console batch picks it up)', B.held_back.every(t => t.held && t.query_stack.length === 0 && t.faq_ids.length === 0 && has(t.flags, /held \(G-STACK\)/)) && B.topics.every(t => !t.held && t.query_stack.length === 0 && t.faq_ids.length === 0), JSON.stringify(T.map(t => [t.key, t.flags.map(f => f.code)])), '');
  const pageIds = new Set(Object.values(A.pages).flatMap(p => p.questions.map(q => q.id)));
  const blogIds = T.flatMap(t => [t.question && t.question.id, ...t.query_stack, ...t.faq_ids]).filter(Boolean);
  chk('Every blog question ID is absent from every other page\'s allocation, and no ID is used twice across the topics', blogIds.every(id => !pageIds.has(id)) && new Set(blogIds).size === blogIds.length, blogIds.join(','), '');
  chk('Counts: the six cost guides in the batch (4 with a code wording to approve; the held two cost questions are approved on the FAQ card), the five local topics held', JSON.stringify(B.counts) === JSON.stringify({ topics: 6, cost_guide: 6, decision: 0, question: 0, local: 0, from_bank: 0, stack: 0, faq: 0, needs_approval: 4, held: 5 }) && has(B.flags, /^F-BANK$/) && T.filter(t => t.post_type === 'cost_guide').length === 6 && T.filter(t => t.post_type === 'local').length === 5 && T.filter(t => t.needs_approval).length === 9, JSON.stringify(B.counts), '');
  const B2 = reserveBlogTopics({ assignment: S.assignQuestions(args), cv: liveCv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, serviceParentMap: edens.serviceParentMap, dossiers, allocationRecord: alloc });
  chk('The same input twice gives identical topics', JSON.stringify(B2) === JSON.stringify(B), '', 'identical');

  // ── The site wide check ──
  const pagesQuestions = Object.fromEntries(Object.values(A.pages).map(p => [p.id, p.questions.map(q => q.wording)]));
  const byId = new Map(questions.map(q => [q.id, q]));
  const SC = siteWideCheck({ pagesQuestions, topics: T, questionsById: byId, allocationRecord: alloc, pageRecords: [], dossiers: [{ town: 'Southampton', parsed: parsedCity }] });
  chk('Site wide check on the live sort and the reserved topics: zero repeats of questions, neighbourhoods or symptoms', SC.ok && SC.counts.questions === 0 && SC.counts.neighbourhoods === 0 && SC.counts.symptoms === 0 && SC.counts.pages === Object.keys(A.pages).length + T.length, JSON.stringify(SC.counts), 'ok');
  const planted = siteWideCheck({
    pagesQuestions: { ...pagesQuestions, 'service:/services/fencing': [...(pagesQuestions['service:/services/fencing'] || []), 'How much does a complete garden makeover cost?'] },
    topics: T, questionsById: byId,
    allocationRecord: { pages: { ...alloc.pages, 'service:/services/patios': { neighbourhoods: ['SOU-N07'], symptoms: { faq_B: 'SOU-S15' } } } },
    pageRecords: [{ page: 'category:/paving-contractor', record: { meta: { decisions_block: 'DECISIONS\n  Symptom for block 4: "The lawn stays soggy for days after rain."\n' } } }],
    dossiers: [{ town: 'Southampton', parsed: parsedCity }],
  });
  chk('Planted repeats are each found: the cost guide question on a page and a post, Bassett on the homepage and a service page, the homepage symptom on a category page, and the local post\'s condition (SOU-I03) when a page takes another symptom of the same issue (SOU-S15)',
    !planted.ok && planted.questions.length === 1 && planted.questions[0].pages.length === 2 && planted.questions[0].pages.some(p => p.startsWith('blog:'))
      && planted.neighbourhoods.length === 1 && planted.neighbourhoods[0].item === 'sou n07' && planted.neighbourhoods[0].pages.join() === 'homepage,service:/services/patios'
      && planted.symptoms.some(x => x.item === 'sou s01' && x.pages.includes('homepage') && x.pages.includes('category:/paving-contractor'))
      && planted.symptoms.some(x => x.item === 'sou i03' && x.pages.some(p => p.startsWith('blog:')) && x.pages.includes('service:/services/patios')),
    JSON.stringify({ q: planted.questions, n: planted.neighbourhoods, s: planted.symptoms.map(x => [x.item, x.pages]) }), '');
  chk('symptomsOf reads a record\'s decisions block (the service pages\' two shapes)', symptomsOf({ meta: { decisions_block: 'Symptom for block 4: "Water sits under the paving."\n    "Moss comes back every spring." (issue: SOU-I03)\n' } }).join(' | ') === 'Water sits under the paving. | Moss comes back every spring.', '', '');

  // ── B2 and the wording helper on their own ──
  const t = (wording, extra = {}) => postTypeOf({ wording, doubt: 'Process', ...extra }, ['Turf or seed']);
  chk('B2: a cost question is a cost guide; "turf or seed", "repair or replace" and "do I need" are decisions; a town makes a local post; the rest are questions',
    t('How much does a patio cost?', { doubt: 'Price' }) === 'cost_guide' && t('Should I lay turf or seed?') === 'decision' && t('Is it better to repair or replace a fence?') === 'decision' && t('Do I need planning permission for a pergola?') === 'decision' && t('Why is my lawn waterlogged?', { town: 'Romsey' }) === 'local' && t('Why is my lawn waterlogged?') === 'question',
    [t('How much does a patio cost?', { doubt: 'Price' }), t('Should I lay turf or seed?'), t('Why is my lawn waterlogged?')].join(), '');
  chk('A question is title cased with the small words lower and one question mark', question('how much does a patio cost in southampton?') === 'How Much Does a Patio Cost in Southampton?' && question('turf or seed for a new lawn') === 'Turf or Seed for a New Lawn?', question('how much does a patio cost in southampton?'), '');

  // ── A no page bucket feeds question posts, decision posts and the stacks ──
  const base = { doubt: 'Process', page: 'Service', service: 'patios', local: false, town: '', needsFact: false, seen: '', seenCount: 1, url: '', rank: null, approved: true, wording_errors: [], fact: '', new_fact: '', page_override: null, source: 'research' };
  const mk = (id, extra) => ({ ...base, id, text: extra.wording, ...extra });
  const pool = [
    mk('Q-1', { wording: 'Is a fibreglass or concrete pool better?', service: 'swimming pools' }),
    mk('Q-2', { wording: 'How long does a pool take to build?', service: 'swimming pools', doubt: 'Timing' }),
    mk('Q-3', { wording: 'Does a pool need a base?', service: 'swimming pools', doubt: 'Fit' }),
    mk('Q-4', { wording: 'Can a pool be built in winter?', service: 'swimming pools', doubt: 'Timing' }),
    mk('Q-5', { wording: 'Will a pool need planning permission?', service: 'swimming pools', doubt: 'Process' }),
    mk('C-1', { wording: 'Why does my pool pump keep tripping?', service: 'swimming pools', source: 'client', doubt: 'Trust' }),
    mk('Q-7', { wording: 'How much does a pool cost per square metre?', service: 'swimming pools', doubt: 'Price' }),
  ];
  // "swimming pools" matches no page: every question lands in the no page bucket
  const A2 = S.assignQuestions({ ...args, questions: pool });
  chk('Set-up: seven questions with a service no page carries: six held as no page, the cost one held for a cost guide', A2.held.noPage.length === 6 && A2.held.costGuide.length === 1, `${A2.held.noPage.length} / ${A2.held.costGuide.length}`, '6 / 1');
  const B3 = reserveBlogTopics({ assignment: A2, cv: liveCv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, serviceParentMap: edens.serviceParentMap, dossiers: [], allocationRecord: null });
  const qs = B3.held_back.filter(t => t.question);
  // Brandon, 28 Oct: a customer question with no matching bank topic and fewer than 3 related questions is held, not written
  chk('With room in the batch every held question would be a post of its own (B1 before B6), but none has 3 related questions in the pool and there is no bank: all six are held back (F-STACK, status Held on the queue, the Search Console batch picks them up), no question post runs, and the cost question naming no page is left', qs.length === 6 && B3.topics.length === 4 && B3.topics.every(t => t.post_type === 'cost_guide') && qs.every(t => t.held && has(t.flags, /held \(G-STACK\)/)) && B3.counts.held === B3.held_back.length && B3.held_back.length === 10 && B3.leftovers.join() === 'Q-7', JSON.stringify({ held: qs.map(t => t.question.id), posts: B3.topics.filter(t => t.question).length, left: B3.leftovers }), '6 held, no question post, Q-7 left');
  chk("Customer question posts (held here): the client's own customers' question first, then the research order; the decision pair is a decision post; a cost question naming no page is never a post",
    qs[0].question.id === 'C-1' && qs[0].post_type === 'question' && qs[1].question.id === 'Q-1' && qs[1].post_type === 'decision' && !qs.some(t => t.question.id === 'Q-7'),
    JSON.stringify(qs.map(t => [t.question.id, t.post_type])) + ' left ' + B3.leftovers.join(), '');
  chk('A question post with no service page links the homepage services section (B8 fallback), and its key is its wording', qs[0].primary === '/#services' && qs[0].key === '/guides/why-does-my-pool-pump-keep-tripping', qs[0].key, '');
  // A batch of six (the four code cost guides and two question posts): the questions beyond it feed the stacks
  const B4 = reserveBlogTopics({ assignment: A2, cv: liveCv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, serviceParentMap: edens.serviceParentMap, dossiers: [], allocationRecord: null, target: 6 });
  const qs2 = B4.topics.filter(t => t.question);
  chk('Stacks (B6) under the shape gate: C-1 would take Q-3, Q-5, Q-7, Q-2, Q-4 as its H2s but has no FAQ questions left, so it is held and its stack goes back to the pool; each next topic tries in turn and is held the same way, so the batch of six is the four cost guides, every question is a held post of its own and only Q-7 (a cost question naming no page) is left', (() => {
    const heldQ = B4.held_back.filter(t => t.question).map(t => t.question.id); return qs2.length === 0 && B4.topics.length === 4 && B4.topics.every(t => t.post_type === 'cost_guide') && heldQ.includes('C-1') && heldQ.length === 6 && B4.held_back.every(t => !t.query_stack.length && !t.faq_ids.length) && B4.leftovers.join() === 'Q-7' && B4.beyond.length === 0;
  })(), JSON.stringify({ n: B4.topics.length, held: B4.held_back.map(t => t.key), beyond: B4.beyond.map(b => b.key), left: B4.leftovers }), '');

  // ── Through the FAQ service's view, with a stub context (the card's shape) ──
  const sortRecord = { research_asset_id: 'r1', updated_at: new Date().toISOString(), model: 'stub', attempts: [], customer_questions: [], questions };
  const pool2 = { query: async (sql, params) => {
    if (/asset_type='faq_sort'/.test(sql)) return { rows: [{ id: 's1', content: JSON.stringify(sortRecord) }] };
    if (/asset_type='faq_research'/.test(sql)) return { rows: [] };
    if (/asset_type='geo_dossier'/.test(sql)) return { rows: [{ content: dossierText, metadata: { location_name: 'Southampton', superseded: false } }] };
    if (/research_jobs/.test(sql)) return { rows: [] };
    return { rows: [] };
  } };
  const svc = createFaqService({ pool: pool2, loadContext: async () => ({ cv: liveCv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, trade: 'Landscaper' }), loadNiche: () => ({ niche, error: null }), perplexity: {}, jobs: { load: async () => null }, callSortModel: async () => '', loadAllocationRecord: async () => ({ record: alloc }), latestRecords: async () => [], log: { log() {}, error: e => console.error(e) } });
  const v = await svc.view('c1', null);
  chk('The FAQ card view carries the reserved topics with their wordings and the site wide check, and the queue reader gives the same topics', v.blog && v.blog.topics.length === 6 && v.blog.held_back.length === 5 && v.blog.topics[0].wording === T[0].wording && Array.isArray(v.blog.topics[0].stack) && v.siteCheck && v.siteCheck.ok && (await svc.blogTopics('c1', null)).blog.held_back.length === 5, JSON.stringify(v.blog && [v.blog.counts, v.siteCheck && v.siteCheck.counts]), '');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
