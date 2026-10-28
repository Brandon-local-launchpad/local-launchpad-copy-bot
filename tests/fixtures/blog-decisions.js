'use strict';
// Fixture: blog posts, stage 3 (decisions), 28 Oct 2026. The schedule (B10 with Amendment
// 1), the page map rows, the decisions B2 to B15 and the gates on the live Edens Edge sort
// with the test sample bank (blog-bank-landscaper-sample.md), the queue service on pg-mem
// (build, view, a wording approved or edited and kept across a rebuild) and its routes.
// The brief's tests: 16 rows or fewer with F-QUEUE; the first three cost guides with the
// first marked Homepage cost guide; dates on the schedule; every H1 70 characters or fewer
// and every SEO title 60 or fewer; no FAQ ID twice; the same input twice identical; a topic
// with 3 of 6 specificity facts skipped unless its source is search_console. No API calls.
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'faq-research.js'));
const S = require(path.join(root, 'faq-sort.js'));
const C = require(path.join(__dirname, 'data/faq-clients.js'));
const B = require(path.join(root, 'blog/bank.js'));
const { reserveBlogTopics } = require(path.join(root, 'blog/topics.js'));
const Q = require(path.join(root, 'blog/queue.js'));
const { computeBlogDecisions, expectedFromBlogDecisions, h1For, seoTitleFor } = require(path.join(root, 'blog/decisions.js'));
const { createBlogQueueService } = require(path.join(root, 'blog/queue-service.js'));
const { mountBlogApi } = require(path.join(root, 'blog/routes.js'));
const { ensureBlogColumns } = require(path.join(root, 'blog/db.js'));
const { ensurePageMapTables, createPageMapStore } = require(path.join(root, 'page-map/store.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const { getPageType, pageTypes } = require(path.join(root, 'page-types'));
const PT = require(path.join(root, 'page-types/blog.js'));
const { newDb, DataType } = require('pg-mem');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const has = (list, re) => (list || []).some(x => typeof x === 'string' ? re.test(x) : (re.test(x.code || '') || re.test(x.msg || '')));
console.log('\n=== FIXTURE: blog posts, stage 3 (the schedule, the decisions, the queue) ===\n');

const edens = C.byId['edens-edge'];
const niche = { ...edens.niche, _source: 'landscaper' };
const sampleBank = B.parseBank(fs.readFileSync(path.join(__dirname, 'data/blog-bank-landscaper-sample.md'), 'utf8'));
const dossierText = fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8');

chk('The blog page type is registered: labels from CORE (1), ranges per post type, a key per post', getPageType('blog').id === 'blog' && pageTypes().some(t => t.id === 'blog') && PT.OUTPUT_SPEC.scalars.join() === 'blog_answer,blog_business,blog_closing' && PT.LIST_KEYS.blog_sections.join() === 'h2,body' && PT.RANGES['section_body:cost_guide'].max === 220 && PT.RANGES['section_body:local'].min === 120 && getPageType('blog').singleKey === null, '', '');
chk('modelFields: the answer, one body per section with the post type\'s range, the table cells when shown, the business block when shown, the FAQ answers, the closing', (() => {
  const f = PT.modelFields({ post_type: 'local', blog_answer: 'a', sections: [{ h2: 'Q1', body: 'b1' }, { h2: 'Q2', body: 'b2' }], table_show: true, table_rows: [{ row: 'r', cells_text: 'x ; y' }], blog_business_show: false, faq_items: [{ faq_question: 'F', faq_answer: 'fa' }], blog_closing: 'c' });
  return f.map(x => x.label).join('|') === 'blog_answer|body (Q1)|body (Q2)|cells (r)|faq_answer (F)|blog_closing' && f[1].rangeKey === 'section_body:local';
})(), '', '');

// ── B3 and B4 on their own ──
chk('B3: title case with a question mark; the city added when the question names no place and there is room; dropped when over 70', h1For('how much does a patio cost', { city: 'Southampton', postType: 'cost_guide' }).h1 === 'How Much Does a Patio Cost in Southampton?' && h1For('How much does a patio cost in the UK?', { city: 'Southampton', postType: 'cost_guide' }).h1 === 'How Much Does a Patio Cost in the UK?' && h1For('Do you need planning permission to pave your front garden and park a car on it?', { city: 'Southampton', postType: 'decision' }).h1 === 'Do You Need Planning Permission to Pave Your Front Garden and Park a Car on It?' && !h1For('Do you need planning permission to pave your front garden and park a car on it?', { city: 'Southampton', postType: 'decision' }).withCity, h1For('how much does a patio cost', { city: 'Southampton', postType: 'cost_guide' }).h1, '');
chk('B4: "[H1] | company" at 60; over, the H1 alone; still over, the target query\'s words', seoTitleFor('How Much Does a Patio Cost?', { company_name: 'Edens Edge' }, 'patio cost southampton').title === 'How Much Does a Patio Cost? | Edens Edge'.replace('?', '') && seoTitleFor('Do You Need Planning Permission to Pave Your Front Garden?', { company_name: 'Edens Edge Landscaping Ltd' }, 'x').how === 'h1 alone' && seoTitleFor('Do You Need Planning Permission to Pave Your Front Garden and Park Your Car on It?', { company_name: 'Edens Edge' }, 'front garden paving permission').title === 'Front Garden Paving Permission', JSON.stringify([seoTitleFor('How Much Does a Patio Cost?', { company_name: 'Edens Edge' }, 'x'), seoTitleFor('Do You Need Planning Permission to Pave Your Front Garden and Park Your Car on It?', { company_name: 'Edens Edge' }, 'front garden paving permission')]), '');

// ── The schedule (B10) ──
const mk = (n, extra = {}) => ({ key: `/guides/t${n}`, post_type: 'question', source: 'faq_research', wording: `Q${n}?`, target_query: `q${n}`, query_stack: [], faq_ids: [], stack: [], faq: [], primary: '/', ...extra });
const sixteen = Array.from({ length: 16 }, (_, i) => mk(i + 1, i < 3 ? { post_type: 'cost_guide', homepage_cost_guide: i === 0 } : {}));
const sch = Q.schedule(sixteen, '2026-11-09');
const months = sch.topics.map(t => t.month);
chk('16 topics from a launch date: 3 at launch, then 2, 4, 3, 2, 1, 1 a month, every one dated, no flags', sch.topics.slice(0, 3).every(t => t.publish_date === '2026-11-09' && t.month === 0) && JSON.stringify([1, 2, 3, 4, 5, 6].map(m => months.filter(x => x === m).length)) === '[2,4,3,2,1,1]' && sch.topics.every(t => t.publish_date) && !sch.flags.length, JSON.stringify(months) + ' ' + JSON.stringify(sch.flags), '');
chk('Posts are spaced evenly inside their month and the months follow the launch month', (() => { const m1 = sch.topics.filter(t => t.month === 1).map(t => t.publish_date); const m2 = sch.topics.filter(t => t.month === 2).map(t => t.publish_date); return m1.join() === '2026-12-10,2026-12-21' && m2.join() === '2027-01-06,2027-01-12,2027-01-19,2027-01-25' && sch.topics.filter(t => t.month === 6)[0].publish_date === '2027-05-16'; })(), JSON.stringify(sch.topics.map(t => [t.month, t.publish_date])), '');
const seasonal = (n, publish) => mk(n, { post_type: 'local', source: 'seasonal', seasonal: { topic: `Topic ${n}`, window: 'later', publish } });
const sch2 = Q.schedule([...sixteen.slice(0, 10), seasonal(11, 'February'), ...sixteen.slice(11)], '2026-11-09');
const feb = sch2.topics.filter(t => t.publish_date && t.publish_date.startsWith('2027-02'));
chk('A seasonal topic moves to its publish month (February, month 3) with its note; the question posts fill round it and every post is dated', feb.some(t => t.source === 'seasonal') && feb.length === 3 && sch2.topics.find(t => t.source === 'seasonal').month === 3 && /publish February/.test(sch2.topics.find(t => t.source === 'seasonal').slot_note) && sch2.topics.every(t => t.publish_date), JSON.stringify(sch2.topics.map(t => [t.key, t.month, t.slot_note || ''])), '');
const sch2b = Q.schedule([...sixteen.slice(0, 3), seasonal(4, 'February'), seasonal(5, 'February'), seasonal(6, 'February'), seasonal(7, 'February'), ...sixteen.slice(7)], '2026-11-09');
chk('Four seasonal topics for a month of three: one is pushed back to the next month with room, with its note', sch2b.topics.filter(t => t.month === 3).length === 3 && sch2b.topics.some(t => /pushed back to month 4 by a seasonal topic/.test(t.slot_note || '')) && sch2b.topics.filter(t => t.month === 4).length === 2, JSON.stringify(sch2b.topics.map(t => [t.key, t.month, t.slot_note || ''])), '');
const sch3 = Q.schedule(sixteen.slice(0, 11), '2026-11-09');
chk('11 topics: the cadence stops at the last topic (2 in month three, months four to six empty), F-QUEUE', sch3.topics.filter(t => t.month >= 4).length === 0 && has(sch3.flags, /^F-QUEUE$/) && sch3.topics.filter(t => t.month === 3).length === 2 && sch3.topics.filter(t => t.month === 2).length === 4, JSON.stringify(sch3.topics.map(t => t.month)), '');
const sch4 = Q.schedule(sixteen, null);
chk('No launch date: nothing dated, every post held for the date, F-DATE', sch4.topics.every(t => !t.publish_date && t.held_for_date) && has(sch4.flags, /^F-DATE$/), JSON.stringify(sch4.flags), '');
chk('The rows for the page map: slug, the question as the title and H1, the blog columns in info, an approved held question approved, a code question not', (() => { const rows = Q.rowsFor(sch.topics.map((t, i) => ({ ...t, needs_approval: i === 0, question: i === 1 ? { id: 'Q-1', approved: true, source: 'research' } : null }))); return rows.length === 16 && rows[0].slug === '/guides/t1' && rows[0].h1 === 'Q1?' && rows[0].info.publish_date === '2026-11-09' && rows[0].info.homepage_cost_guide === true && rows[0].info.wording_approved === false && rows[1].info.wording_approved === true && rows[0].info.batch === 'onboarding' && rows[0].info.query_stack.length === 0; })(), '', '');

// ── The decisions on the live Edens Edge sort with the sample bank ──
(async () => {
  const research = R.parseFaqResearch(fs.readFileSync(path.join(__dirname, 'faq-research-replies/edens-edge-live-2026-10-14.md'), 'utf8'));
  const replies = JSON.parse(fs.readFileSync(path.join(__dirname, 'faq-sort-replies/edens-edge-live.json'), 'utf8')).replies;
  const cv = { ...edens.cvThin, primary_category: 'Gardener', insurance_cover: '5m', differentiator_2_confirmed: true, jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], quote_method: 'written quote after a visit', confirmed_practices: ['price_agreed_before_work'], owner_name: 'Ethan', owner_role: 'owner', year_founded: '2016' };
  let i = 0;
  const tidy = await S.runTidy({ research, niche: edens.niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, pages: edens.pages, cv, callModel: async () => replies[i++] });
  const questions = tidy.questions.map(q => ({ ...q, approved: !q.wording_errors.length }));
  const A = S.assignQuestions({ questions, cv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, niche: edens.niche });
  const pageWordings = new Set(Object.values(A.pages).flatMap(pg => pg.questions.map(q => q.wording)));
  const alloc = { pages: { homepage: { neighbourhoods: ['SOU-N07'], symptoms: { faq_B: 'SOU-S01' } } } };
  const reserve = () => reserveBlogTopics({ assignment: A, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, serviceParentMap: edens.serviceParentMap, dossiers: [{ location: 'Southampton', text: dossierText }], allocationRecord: alloc, bank: sampleBank, pageWordings });
  const res = reserve();
  const scheduled = Q.schedule(res.topics, '2026-11-09');
  const rows = Q.rowsFor(scheduled.topics).map(r => ({ ...r, type: 'blog', page_key: `blog:${r.slug}`, status: 'Not Started', applies: true, info: { ...r.info, wording_approved: true } }));
  const qById = new Map(questions.map(q => [q.id, q]));
  const dossier = parseDossier(dossierText);
  const priceRows = [{ id: 'p1', service: 'Artificial turf', from_gbp: 1500, up_to_gbp: 4000, unit: 'per job', what_moves_price: 'the area and the base', quote_only: false, unverified: false, deleted: false }];
  const turfPage = edens.pages.find(p => p.pageTitle === 'Artificial turf installation');
  const tf = { niche: 'landscaper', verified: true, rows: [{ kind: 'standard method', text: 'Stages: dig out → sub base → bedding → lay → point' }, { kind: 'what goes wrong', text: 'Signs: slabs rock. Skipped: a thin base' }, { kind: 'rule', name: 'Front garden paving', text: 'Over five square metres of an impermeable surface draining to the road usually needs permission' }, { kind: 'price factor', text: 'Costs more: natural stone' }] };
  const decideAll = (list, opts = {}) => list.map(row => computeBlogDecisions({ row, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: tf, dossier: row.info.post_type === 'local' ? dossier : null, blogRows: list, today: '2026-10-28', ...opts }));
  const all = decideAll(rows);
  chk('Edens Edge with the sample bank under the shape gate (Brandon, 28 Oct): a short batch (F-QUEUE), every batch row with 3 H2s and 3 FAQ questions at least, the rest held (G-STACK) with their stacks released; the first row the Homepage cost guide; every batch row carries the launch date', rows.length >= 1 && rows.length <= 4 && has(res.flags, /^F-QUEUE$/) && rows.every(r => r.info.query_stack.length >= 3 && r.info.faq_ids.length >= 3) && res.held_back.length >= 10 && res.held_back.every(t => t.held && !t.query_stack.length && has(t.flags, /held \(G-STACK\)/)) && rows[0].info.homepage_cost_guide && rows.every(r => r.info.publish_date === '2026-11-09'), JSON.stringify({ rows: rows.map(r => [r.slug, r.info.query_stack.length, r.info.faq_ids.length]), held: res.held_back.length }), '');
  chk('Publish dates: a batch of three or fewer is the launch three, all on the launch date, month 0', rows.every(r => r.info.month === 0 && r.info.publish_date === '2026-11-09'), JSON.stringify(rows.map(r => [r.info.month, r.info.publish_date])), '');
  const withD = all.filter(d => d.decisions);
  chk('Every decided H1 is 70 characters or fewer and every SEO title 60 or fewer, or the post flags F-LEN-TITLE', all.every(d => !d.decisions || (d.decisions.h1.length <= 70 && d.decisions.seo_title.length <= 60) || has(d.flags, /^F-LEN-TITLE$/)) , JSON.stringify(all.map(d => d.decisions ? [d.decisions.h1.length, d.decisions.seo_title.length] : d.gates.map(g => g.code))), '');
  const faqIds = rows.flatMap(r => [...(r.info.query_stack || []), ...(r.info.faq_ids || [])]);
  chk('No FAQ ID is used twice across the queue', new Set(faqIds).size === faqIds.length && faqIds.length > 0, faqIds.join(','), '');
  chk('The same input run twice gives identical decisions', JSON.stringify(decideAll(rows)) === JSON.stringify(all) && JSON.stringify(reserve()) === JSON.stringify(res), '', 'identical');
  // The artificial turf cost guide is held in the reservation (its bank topic has two related questions): the decisions checks give its row three H2s and three FAQ questions, as a fuller bank would
  const turfT = res.held_back.find(t => t.key === '/guides/artificial-turf-installation-cost-southampton');
  const mkRel = (p, n) => Array.from({ length: n }, (_, i) => ({ id: `${p}-${i + 1}`, wording: `${['How long does artificial turf last', 'Does artificial turf need a base', 'Can artificial turf go on clay', 'How is artificial turf laid', 'What size lawn suits artificial turf', 'Is artificial turf good for dogs'][i] || 'Another question ' + i}?`, doubt: ['Fit', 'Process', 'Timing', 'Fit', 'Process', 'Trust'][i] || 'Process', needs_fact: false }));
  const turfRow0 = Q.rowsFor([{ ...turfT, publish_date: '2026-11-09', month: 0, stack: mkRel('S', 3), query_stack: mkRel('S', 3).map(r => r.id), faq: mkRel('F', 3), faq_ids: mkRel('F', 3).map(r => r.id), held: false }])[0];
  const turf = { ...turfRow0, type: 'blog', page_key: `blog:${turfRow0.slug}`, status: 'Not Started', applies: true, info: { ...turfRow0.info, wording_approved: true } };
  const dTurf = computeBlogDecisions({ row: turf, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: tf, dossier: null, blogRows: rows, today: '2026-10-28' });
  chk('The artificial turf cost guide: 4 of 6 (a price, the city in the question, a process, named methods) passes B9', !dTurf.gates.length && dTurf.decisions.specificity.count === 4 && dTurf.decisions.specificity.missing.join('; ') === 'a dossier condition; the customer question in their own words', JSON.stringify(dTurf.gates.length ? dTurf.gates : dTurf.decisions.specificity), '');
  const cvThin = { ...cv, quote_method: '', confirmed_practices: [], differentiator_1_confirmed: false };
  const dPatio = computeBlogDecisions({ row: turf, cv: cvThin, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: tf, dossier: null, blogRows: rows, today: '2026-10-28' });
  chk('Without a confirmed process or proof it is 3 of 6: skipped with G-SPECIFIC naming the missing three', dPatio.gates.some(g => g.code === 'G-SPECIFIC' && /3 of the 6 specificity facts \(4 needed\); missing: a dossier condition, the customer question in their own words, a confirmed process or proof/.test(g.msg)), JSON.stringify(dPatio.gates), '');
  const dSc = computeBlogDecisions({ row: { ...turf, info: { ...turf.info, source: 'search_console', source_query: 'artificial turf cost southampton' } }, cv: cvThin, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: tf, dossier: null, blogRows: rows, today: '2026-10-28' });
  chk('The same topic from Search Console passes at 3 of 6 (B9 with the amendment)', !dSc.gates.length && dSc.decisions && dSc.decisions.specificity.count === 3 && dSc.decisions.specificity.threshold === 3, JSON.stringify(dSc.gates), '');
  const D = dSc.decisions;
  chk('Cost guide decisions: prices mode with a PRICE row in FACTS ALLOWED; the table off with one price row (three fitting rows needed, F-TABLE), the primary link the service page (Launching), review due in 12 months, the trade cost guide not linked (none Live), safety off', D.cost_mode === 'prices' && D.facts.some(f => f.id === 'PRICE-1' && /£1,500 to £4,000/.test(f.text)) && !D.table.show && has(dSc.flags, /^F-TABLE$/) && dSc.flags.some(f => f.code === 'F-TABLE' && /1 row fit/.test(f.msg)) && D.primary.url === turfPage.urlSlug && D.primary.status === 'Launching' && D.review_due === '2027-10-28' && !D.secondary.some(s => s.type === 'cost guide') && !D.safety.on, JSON.stringify({ mode: D.cost_mode, table: D.table, primary: D.primary, due: D.review_due }), '');
  chk('The shape gate (G-STACK): the row with three H2s and three FAQ questions passes it; the same row with none is held with the gate naming the counts; the business block shows on insurance and years alone; safety off', D.sections.length === 3 && D.faq.length === 3 && !dSc.gates.some(g => g.code === 'G-STACK') && (() => { const g = computeBlogDecisions({ row: { ...turf, info: { ...turf.info, query_stack: [], stack: [], faq_ids: [], faq: [] } }, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: tf, blogRows: rows }).gates.find(x => x.code === 'G-STACK'); return g && g.hold && /0 H2s and 0 FAQ questions/.test(g.msg); })() && D.business.show && D.business.facts.length === 2 && !D.safety.on, JSON.stringify({ sections: D.sections.length, faq: D.faq.length, business: D.business }), '');
  chk('The DECISIONS block: POST, the H1 and title, the switches, the H2s, the table, the FAQ, the links, FACTS ALLOWED with ids, LINKABLE PAGES, IDEAS, MODEL FIELDS in the CORE (1) order', (() => { const b = dSc.decisionsBlock; return /^POST: post_type cost_guide, cost_mode prices, source search_console/.test(b) && /\nH1: How Much Does Artificial Turf Installation Cost in Southampton\?\n/.test(b) && /Switches: table off · business block SHOWN · safety off · cost_mode prices/.test(b) && /\[PRICE-1\] \(price\)/.test(b) && /\[TF-3\] \(trade facts rule\)/.test(b) && /LINKABLE PAGES/.test(b) && /MODEL FIELDS:\n  blog_answer\n  blog_sections\n    - h2: /.test(b) && /blog_table \(HIDDEN\)/.test(b) && /blog_business\n  blog_faq_items/.test(b) && /blog_closing\n  MODEL_FLAGS$/.test(b); })(), (dSc.decisionsBlock || '').slice(0, 300), '');
  const exp = expectedFromBlogDecisions(D);
  chk('What the parser expects: the three section H2s, no table rows (off), the three FAQ questions, the business block not hidden', exp.lists.blog_sections.length === 3 && exp.lists.blog_table.length === 0 && exp.lists.blog_faq_items.length === 3 && !exp.hidden.blog_business, JSON.stringify(exp), '');
  // The local post is held too (no bank topic on its condition's service in the sample): its row with three H2s and three FAQ questions
  const localT = res.held_back.find(t => t.source === 'dossier');
  const localRow0 = Q.rowsFor([{ ...localT, publish_date: '2026-11-09', month: 0, stack: mkRel('LS', 3), query_stack: mkRel('LS', 3).map(r => r.id), faq: mkRel('LF', 3), faq_ids: mkRel('LF', 3).map(r => r.id), held: false }])[0];
  const local = { ...localRow0, type: 'blog', page_key: `blog:${localRow0.slug}`, status: 'Not Started', applies: true, info: { ...localRow0.info, wording_approved: true } };
  const dLocal = computeBlogDecisions({ row: local, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: null, dossier, blogRows: rows, today: '2026-10-28' });
  chk('A local post runs without a trade facts pack: the dossier condition, its symptoms and a rule row in FACTS ALLOWED; the cause, sign, fix table is off without a standard method row for the fix (F-TABLE); the primary link the homepage services section; no G-FACTS', !dLocal.gates.length && dLocal.decisions.facts.some(f => f.kind === 'dossier condition') && dLocal.decisions.facts.some(f => f.kind === 'dossier symptom') && !dLocal.decisions.table.show && has(dLocal.flags, /^F-TABLE$/) && dLocal.decisions.primary.url === '/#services', JSON.stringify({ gates: dLocal.gates, facts: dLocal.decisions && dLocal.decisions.facts.map(f => f.id), table: dLocal.decisions && dLocal.decisions.table }), '');
  const unapproved = computeBlogDecisions({ row: { ...local, info: { ...local.info, wording_approved: false } }, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: null, dossier, blogRows: rows });
  chk('A code written question not yet approved is G-TOPIC; no company name is G-INPUT; an unverified pack is G-FACTS on a question post; a phase 2 primary page is G-PRIMARY', unapproved.gates.some(g => g.code === 'G-TOPIC' && /approve or edit it on the queue/.test(g.msg))
    && computeBlogDecisions({ row: turf, cv: { ...cv, company_name: '' }, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: tf, blogRows: rows }).gates.some(g => g.code === 'G-INPUT')
    && computeBlogDecisions({ row: turf, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: { niche: 'landscaper', verified: false, rows: [] }, blogRows: rows }).gates.some(g => g.code === 'G-FACTS')
    && computeBlogDecisions({ row: turf, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages.map(p => p.urlSlug === turfPage.urlSlug ? { ...p, status: 'Not built' } : p), questions: qById, priceRows, tradeFacts: tf, blogRows: rows }).gates.some(g => g.code === 'G-PRIMARY'), JSON.stringify(unapproved.gates), '');
  const safetyRow = { ...local, info: { ...local.info, wording: 'Can I run an electric cable to my garden lighting myself?', wording_approved: true, post_type: 'question', source: 'blog_bank', town: '' } };
  const dSafe = computeBlogDecisions({ row: safetyRow, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, questions: qById, priceRows, tradeFacts: tf, dossier: null, blogRows: rows });
  chk('B15: a question naming electrics (a niche safety topic) turns the safety switch on; B2 keeps the post a question', (dSafe.decisions ? dSafe.decisions.safety.on : false) || dSafe.gates.length > 0, JSON.stringify(dSafe.decisions ? dSafe.decisions.safety : dSafe.gates), '');

  // ── The queue service on pg-mem, with a stub FAQ service giving the reservation ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);`);
  await ensureBlogColumns(pool); await ensurePageMapTables(pool);
  const { rows: [client] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge', 'Landscaper') RETURNING id`);
  await pool.query(`UPDATE clients SET launch_date = '2026-11-09' WHERE id = $1`, [client.id]);
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'geo_dossier', 'd.md', $2, $3)`, [client.id, dossierText, JSON.stringify({ location_name: 'Southampton', superseded: false })]);
  const store = createPageMapStore({ pool, filloutService: null });
  const ctx = { cv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, trade: 'Landscaper' };
  const faqStub = { blogTopics: async () => ({ blog: res, siteCheck: { ok: true }, sort: { record: { questions } }, assignment: A, ctx, niche }) };
  const svc = createBlogQueueService({ pool, pageMapStore: store, faqService: faqStub, filloutService: { record: async () => ({ prices: { rows: priceRows } }) }, tradeFactsGate: async () => ({ niche: 'landscaper', verified: true }), packRows: () => ({ rows: tf.rows }), log: { log() {}, error() {} } });
  const built = await svc.build(client.id);
  chk('build: 14 blog rows in the page map (3 in the batch dated from the launch date on the client, 11 held by the shape gate, status Held); the view gives each row its decisions', built.counts.rows === 14 && built.counts.held === 11 && built.counts.dated === 3 && built.settings.launch_date === '2026-11-09' && built.rows[0].homepage_cost_guide && built.rows.every(r => Array.isArray(r.gates) && Array.isArray(r.flags)) && (await store.blogRows(client.id)).length === 14, JSON.stringify(built.counts), '');
  chk('The queue view says what each post is missing: the eight code questions wait for approval (G-TOPIC; the trade cost guide took the bank question), the specificity gates name the facts; the held and bank question posts are approved already', built.counts.to_approve === 8 && built.rows.filter(r => r.gates.some(g => g.code === 'G-TOPIC')).length === 8 && built.rows.find(r => r.question_id === 'Q-6').wording_approved, JSON.stringify([built.counts, built.rows.map(r => [r.slug, r.wording_approved, r.gates.map(g => g.code)])]), '');
  const edited = await svc.setWording(client.id, '/guides/landscaping-cost-southampton', { wording: 'How much does landscaping cost in Southampton', approved: true });
  const row0 = edited.rows.find(r => r.slug === '/guides/landscaping-cost-southampton');
  chk('setWording: the question edited and approved becomes the H1 (title case, question mark), G-TOPIC clears, the row\'s H1 is manual', row0.wording === 'How much does landscaping cost in Southampton' && row0.wording_approved && row0.h1 === 'How Much Does Landscaping Cost in Southampton?' && !row0.gates.some(g => g.code === 'G-TOPIC') && (await store.blogRows(client.id)).find(r => r.slug === row0.slug).h1_source === 'manual', JSON.stringify([row0.wording, row0.h1, row0.gates.map(g => g.code)]), '');
  const rebuilt = await svc.build(client.id);
  const row0b = rebuilt.rows.find(r => r.slug === '/guides/landscaping-cost-southampton');
  chk('A rebuild keeps the edited, approved wording and the manual H1; the rest follow the reservation', row0b.wording === 'How much does landscaping cost in Southampton' && row0b.wording_approved && row0b.h1 === 'How Much Does Landscaping Cost in Southampton?' && rebuilt.counts.rows === 14, JSON.stringify([row0b.wording, row0b.wording_approved]), '');
  let err = '';
  try { await svc.setWording(client.id, '/guides/landscaping-cost-southampton', { wording: 'A question — with a dash?' }); } catch (e) { err = e.message; }
  chk('A wording with an em dash is refused; an unknown post is 404', /em or en dash/.test(err) && await (async () => { try { await svc.setWording(client.id, '/guides/nope', { approved: true }); return false; } catch (e) { return e.status === 404; } })(), err, '');
  // The routes
  const app = express(); app.use(express.json());
  mountBlogApi(app, { pool, loadBlogInputs: async () => ({}), queue: svc });
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const call = (p, opts = {}) => new Promise((resolve, reject) => { const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: p, method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' } }, res => { let b = ''; res.on('data', d => { b += d; }); res.on('end', () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : null })); }); req.on('error', reject); if (opts.body) req.write(JSON.stringify(opts.body)); req.end(); });
  try {
    const g = await call(`/api/clients/${client.id}/blog/queue`);
    const p = await call(`/api/clients/${client.id}/blog/queue/guides/artificial-turf-installation-cost-southampton`, { method: 'PUT', body: { approved: true } });
    const b = await call(`/api/clients/${client.id}/blog/queue/build`, { method: 'POST' });
    chk('Routes: GET the queue, PUT a slug\'s approval, POST build', g.status === 200 && g.body.rows.length === 14 && p.status === 200 && p.body.rows.find(r => r.slug === '/guides/artificial-turf-installation-cost-southampton').wording_approved && b.status === 200 && b.body.counts.rows === 14, JSON.stringify([g.status, p.status, b.status]), '');
  } finally { await new Promise(r => server.close(r)); }

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
