'use strict';
// Fixture: the blog question bank (Brandon, 28 Oct 2026). The parser on a hand written
// landscaper sample in the prompt's format (tests/fixtures/data/blog-bank-landscaper-sample.md,
// with the usual drift: bold ids, "Yes" for a client fact, a bare url, a short topic), the
// validation, the store on pg-mem (paste, approval as a fingerprint, stale, the file seed, a
// run with a fake Perplexity), the routes, and the topic reservation with the bank on the live
// Edens Edge sort: the queue grows from 11 to 15 topics with stacks from the bank. No API calls.
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const B = require(path.join(root, 'blog/bank.js'));
const { ensureBankTables, createBankStore } = require(path.join(root, 'blog/bank-store.js'));
const { mountBankApi } = require(path.join(root, 'blog/bank-routes.js'));
const { reserveBlogTopics } = require(path.join(root, 'blog/topics.js'));
const { siteWideCheck } = require(path.join(root, 'blog/site-check.js'));
const R = require(path.join(root, 'faq-research.js'));
const S = require(path.join(root, 'faq-sort.js'));
const C = require(path.join(__dirname, 'data/faq-clients.js'));
const { newDb, DataType } = require('pg-mem');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const has = (list, re) => (list || []).some(x => typeof x === 'string' ? re.test(x) : (re.test(x.code || '') || re.test(x.msg || '')));
console.log('\n=== FIXTURE: the blog question bank (parser, store, routes, the queue with a bank) ===\n');

const sample = fs.readFileSync(path.join(__dirname, 'data/blog-bank-landscaper-sample.md'), 'utf8');

// ── The parser ──
const p = B.parseBank(sample);
chk('Sample: 5 topics, 30 related questions, 2 cost, 2 decision, 1 question, 4 services, 1 rule, 2 gaps, nothing left unread', JSON.stringify(p.counts) === JSON.stringify({ topics: 5, related: 30, cost: 2, decision: 2, question: 1, ranked: 5, rules: 1, gaps: 2, services: 4 }) && p.unread === 0, JSON.stringify(p.counts) + ' unread ' + p.unread, '');
const t1 = p.topics[0];
chk('A topic header: id, the question unquoted, type, service, seen and the url', t1.id === 'BT-1' && t1.question === 'How much does a patio cost in the UK?' && t1.type === 'cost' && t1.service === 'Patios and paving' && /People also ask/.test(t1.seen) && t1.url === 'https://www.checkatrade.com/blog/cost-guides/patio-cost/', JSON.stringify(t1), '');
chk('Related questions: id, question, doubt, needs client fact (Y, N and "Yes"), the url, a bare url read too', t1.related.length === 7 && t1.related[0].id === 'BT-1.a' && t1.related[0].doubt === 'Price' && t1.related[0].needsFact === true && t1.related[1].needsFact === false && t1.related[4].needsFact === true && t1.related[5].url === 'https://www.reddit.com/r/DIYUK/comments/patio_deposit', JSON.stringify(t1.related.map(r => [r.id, r.doubt, r.needsFact])), '');
chk('A bold header ("**[BT-2]**") still reads; the ranked list line gives the five ids in order', p.topics[1].id === 'BT-2' && p.topics[1].type === 'decision' && p.ranked.join() === 'BT-5,BT-1,BT-3,BT-4,BT-2', p.ranked.join(), 'BT-5,BT-1,BT-3,BT-4,BT-2');
chk('The one warning: BT-3 has 4 related questions', p.warnings.length === 1 && /^BT-3: 4 related questions \(6 to 10 asked for\)/.test(p.warnings[0]), p.warnings.join(' | '), '');
chk('Rules: the topic, the sentence without its url, the url, marked official (Planning Portal); gaps as lines', p.rules.length === 1 && p.rules[0].topic === 'BT-3' && /^Paving more than five square metres/.test(p.rules[0].text) && !/http/.test(p.rules[0].text) && p.rules[0].official && p.gaps.length === 2 && /^Hedge removal/.test(p.gaps[0]), JSON.stringify(p.rules[0]), '');
const drift = B.parseBank(`## 1. TOPICS\n### BT-9 | How long does decking last? | type: Question | Service: Decking | Seen: PAA | https://a.b/c\n- BT-9.a | "Does composite decking fade?" | Doubt: fit | Needs fact: N | https://a.b/d\n- [BT-9.b] | "Is decking slippery when wet?" | Doubt: Safety | Needs client fact: N\n- [BT-8.a] | "A stray one?" | Doubt: Fit | Needs client fact: N | https://a.b/e\n\nTop 16 by search interest:\n1. [BT-9]\n2. BT-7\n\n## 2. RULES BEHIND THE TOPICS\n- no id here | x | https://a.b\n## 3. GAPS\nNone.\n`);
chk('Drift: no brackets, no quotes, "type" in lower case, a bare url, a bad doubt and a missing url each warned, a stray related id kept under the open topic, a numbered ranked list', drift.topics.length === 1 && drift.topics[0].question === 'How long does decking last?' && drift.topics[0].type === 'question' && drift.topics[0].related.length === 3 && drift.topics[0].related[1].doubt === '' && has(drift.warnings, /BT-9\.b: doubt "Safety"/) && has(drift.warnings, /BT-9\.b: no source url/) && has(drift.warnings, /BT-8\.a: listed under BT-9/) && drift.ranked.join() === 'BT-9,BT-7' && has(drift.warnings, /ranked list names BT-7/) && has(drift.warnings, /rules: a line with no topic id/), JSON.stringify({ r: drift.ranked, w: drift.warnings }), '');
chk('Validation: the sample is usable; an empty reply, a reply with no topics and one with too few are refused in words', B.validateBank(p).valid && /No topics could be read/.test(B.validateBank(B.parseBank('')).error) && /Only 1 topics could be read \(at least 5 needed\)/.test(B.validateBank(drift).error), B.validateBank(drift).error, '');
chk('The prompt to send: the fenced block with RUN FOR filled in, the rest untouched', (() => { const pr = B.buildPrompt('roofer'); return pr.startsWith('RUN FOR: roofer\n') && /## 1\. TOPICS/.test(pr) && /\[TRADE\]/.test(pr) && !/```/.test(pr); })(), B.buildPrompt('roofer').slice(0, 40), '');
chk('Header line: written and read back; the sample header says TEST SAMPLE', B.parseHeader(B.header({ generated: '2026-10-28', model: 'pasted' })).generated === '2026-10-28' && /^TEST SAMPLE/.test(B.parseHeader(sample).model), '', '');

// ── The reservation with the bank, on the live Edens Edge sort ──
const edens = C.byId['edens-edge'];
const niche = { ...edens.niche, _source: 'landscaper' };
(async () => {
  const research = R.parseFaqResearch(fs.readFileSync(path.join(__dirname, 'faq-research-replies/edens-edge-live-2026-10-14.md'), 'utf8'));
  const replies = JSON.parse(fs.readFileSync(path.join(__dirname, 'faq-sort-replies/edens-edge-live.json'), 'utf8')).replies;
  const cv = { ...edens.cvThin, primary_category: 'Gardener', insurance_cover: '5m', differentiator_2_confirmed: true, jobs_wanted: ['Landscape Gardener', 'Landscape Designer'] };
  let i = 0;
  const tidy = await S.runTidy({ research, niche: edens.niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, pages: edens.pages, cv, callModel: async () => replies[i++] });
  const questions = tidy.questions.map(q => ({ ...q, approved: !q.wording_errors.length }));
  const A = S.assignQuestions({ questions, cv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, niche: edens.niche });
  const pageWordings = new Set(Object.values(A.pages).flatMap(pg => pg.questions.map(q => q.wording)));
  const dossiers = [{ location: 'Southampton', text: fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8') }];
  const alloc = { pages: { homepage: { neighbourhoods: ['SOU-N07'], symptoms: { faq_B: 'SOU-S01' } } } };
  const base = { assignment: A, cv, niche, keyValueMap: edens.keyValueMap, pages: edens.pages, serviceParentMap: edens.serviceParentMap, dossiers, allocationRecord: alloc, pageWordings };
  const without = reserveBlogTopics(base);
  const withBank = reserveBlogTopics({ ...base, bank: p });
  const T = withBank.topics;
  const H = withBank.held_back; // the shape gate holds the thin ones (Brandon, 28 Oct), in batch order
  const ALL = [...T, ...H].sort((a, b) => a.order - b.order); // the reservation's own order
  const byId = id => ALL.find(t => t.question && t.question.id === id);
  chk('Under the Cost Guide Structure and the shape gate: without a bank every topic is held (11) and F-BANK; with the sample bank one post runs, the lawn mowing cost guide, its three FAQ questions from the fourth source (the bank\'s lawn and turf questions, Price first); the other 13 hold (the bank\'s related cost questions rephrase the fixed H2s, and no other topic reaches three and three), no F-BANK, F-QUEUE', without.counts.topics === 0 && without.counts.held === 11 && has(without.flags, /^F-BANK$/) && withBank.counts.topics === 1 && withBank.counts.held === 13 && withBank.counts.faq === 3 && T[0].post_type === 'cost_guide' && /lawn mowing/i.test(T[0].service.title) && has(T[0].flags, /^F-FAQ-SOURCE$/) && !has(withBank.flags, /^F-BANK$/) && has(withBank.flags, /^F-QUEUE$/), JSON.stringify([without.counts, withBank.counts, T.map(t => [t.key, t.faq_ids, t.flags.map(f => f.code)])]), '');
  chk('Main services follow the jobs wanted order (Landscape Gardener, Landscape Designer), then page map order, named by the services library\'s UK page name ("Artificial grass installation", not the Google Business Profile\'s "Artificial turf installation")', (() => { const m = ALL.filter(t => t.post_type === 'cost_guide' && t.service).slice(0, 3).map(t => t.service.title); return m.length === 3 && m[0] === 'Artificial grass installation' && /lawn mowing/i.test(m[2]); })(), ALL.filter(t => t.post_type === 'cost_guide' && t.service).slice(0, 3).map(t => t.service.title).join(' | '), 'Artificial grass installation | … | Lawn mowing…');
  chk('The trade cost guide takes the bank\'s general cost topic (BT-5): its wording, no stack (its H2s are the fixed set), the related questions that share a key word with it kept for its FAQ (the two that share none left out, F-RELATED), then held: the ones left rephrase the fixed H2s', ALL[0].homepage_cost_guide && ALL[0].question && ALL[0].question.id === 'BT-5' && ALL[0].source === 'blog_bank' && !ALL[0].needs_approval && ALL[0].query_stack.length === 0 && has(ALL[0].flags, /^F-RELATED$/) && ALL[0].flags.some(f => f.code === 'F-RELATED' && /BT-5\.a, BT-5\.c/.test(f.msg)) && ALL[0].held && has(ALL[0].flags, /for the FAQ/), JSON.stringify([ALL[0].key, ALL[0].question && ALL[0].question.id, ALL[0].query_stack, ALL[0].faq_ids, ALL[0].flags]), '');
  chk('BT-1 (a cost topic for Patios and paving, not one of the main services) is not a post in the onboarding batch: B1 caps the cost guides at the trade guide plus one per main service, so it stays in the queue for the Search Console batches', !byId('BT-1') && withBank.leftovers_bank.includes('BT-1'), JSON.stringify(withBank.leftovers_bank), 'BT-1 among the leftovers');
  chk('Order (on the held list, every topic held): the held cost questions (Q-6, Q-20) come before the bank\'s other topics, the local post before BT-3, BT-3 before BT-4 before BT-2, the seasonal topics last', ALL.findIndex(t => t.question && t.question.id === 'Q-20') < ALL.findIndex(t => t.question && t.question.id === 'BT-3') && ALL.findIndex(t => t.question && t.question.id === 'BT-3') < ALL.findIndex(t => t.question && t.question.id === 'BT-4') && ALL.findIndex(t => t.question && t.question.id === 'BT-4') < ALL.findIndex(t => t.question && t.question.id === 'BT-2') && ALL.slice(-4).every(t => t.source === 'seasonal') && byId('BT-3').post_type === 'decision' && byId('BT-4').post_type === 'question' && byId('BT-2').post_type === 'decision', ALL.map(t => (t.question ? t.question.id : t.source)).join(','), '');
  chk('BT-3 (4 related) and BT-4 (7) are both held: their related questions give too few for an FAQ once the ones the pages ask and the ones that share no other key word are out; their stacks go back to the bank', byId('BT-3').held && byId('BT-3').query_stack.length === 0 && has(byId('BT-3').flags, /for the FAQ/) && byId('BT-4').held && byId('BT-4').query_stack.length === 0, JSON.stringify([byId('BT-3').flags, byId('BT-4').flags]), '');
  chk('Every bank topic is left over as a topic (none runs as a post; the lawn mowing guide borrowed three related questions); counts: stack 0, faq 3; the stack wordings ride on the topic', withBank.leftovers_bank.length === 5 && withBank.counts.stack === 0 && withBank.counts.faq === 3 && ALL.every(t => t.stack.length === t.query_stack.length && t.faq.length === t.faq_ids.length), JSON.stringify([withBank.leftovers_bank, withBank.counts.stack, withBank.counts.faq]), '');
  // A page already uses a bank question: it is dropped before use, with a flag
  const taken = reserveBlogTopics({ ...base, bank: p, pageWordings: new Set([...pageWordings, 'Does aerating a lawn stop waterlogging?', 'Turf or seed: which is better for a new lawn?']) });
  const tb4 = [...taken.topics, ...taken.held_back].find(t => t.question && t.question.id === 'BT-4');
  chk('A related question a page uses is dropped with F-DROPPED; a bank topic a page uses is never a post', tb4 && !tb4.query_stack.includes('BT-4.b') && !tb4.faq_ids.includes('BT-4.b') && has(tb4.flags, /^F-DROPPED$/) && !taken.topics.some(t => t.question && t.question.id === 'BT-2') && !taken.held_back.some(t => t.question && t.question.id === 'BT-2') && has(taken.flags, /^F-DROPPED$/), JSON.stringify([tb4 && tb4.query_stack, tb4 && tb4.flags.map(f => f.code), taken.flags.map(f => f.code), taken.counts.topics]), '');
  const SC = siteWideCheck({ pagesQuestions: Object.fromEntries(Object.values(A.pages).map(pg => [pg.id, pg.questions.map(q => q.wording)])), topics: ALL, questionsById: new Map(questions.map(q => [q.id, q])), allocationRecord: alloc, pageRecords: [], dossiers: [], genericWords: ['Southampton', 'Landscaper'] });
  chk('The site wide check on the queue with the bank: no repeats, the posts checked against each other on their topic too', SC.ok && SC.counts.pages === Object.keys(A.pages).length + ALL.length, JSON.stringify([SC.counts, SC.questions]), 'ok');
  chk('The same input twice gives identical topics', JSON.stringify(reserveBlogTopics({ ...base, bank: p })) === JSON.stringify(withBank), '', 'identical');

  // ── The store on pg-mem, the file seed, a fake run, the routes ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await ensureBankTables(pool); // once: pg-mem refuses CREATE TABLE IF NOT EXISTS on a table that exists
  const quiet = { log() {}, error() {} };
  let runs = 0;
  const store = createBankStore({ pool, log: quiet, testSamplesAllowed: true, runner: async (trade, prompt, onStatus) => { runs++; onStatus('polling'); if (trade === 'zz-fail-trade') throw new Error('fake outage'); return { text: sample.split('\n').slice(2).join('\n'), model: 'fake-model', cost: 1.23 }; } });
  const s0 = await store.status('zz-paste-trade');
  chk('No bank yet (a trade with no file and no row): exists false, not approved, not running', !s0.exists && !s0.approved && !s0.valid && s0.error === 'no bank yet', JSON.stringify(s0), '');
  const s1 = await store.save('zz-paste-trade', sample.split('\n').slice(2).join('\n'), { source: 'paste' });
  chk('Paste: saved in the database with a header line added, counts read, not approved', s1.exists && s1.from === 'database' && s1.source === 'paste' && s1.model === 'pasted (perplexity app)' && s1.counts.topics === 5 && !s1.approved && B.parseHeader((await store.read('zz-paste-trade')).text), JSON.stringify(s1), '');
  let err = '';
  try { await store.save('zz-paste-trade', 'nothing like a bank'); } catch (e) { err = e.message; }
  chk('A paste that is not a bank is refused in words and the saved one stays', /No topics could be read/.test(err) && (await store.status('zz-paste-trade')).counts.topics === 5, err, '');
  err = '';
  try { await store.approve('zz-paste-trade', ''); } catch (e) { err = e.message; }
  chk('Approve needs a name', /Say who is approving/.test(err), err, '');
  const s2 = await store.approve('zz-paste-trade', 'Brandon');
  chk('Approve: the flag, who and when; approvedBank gives the parsed topics', s2.approved && s2.approvedBy === 'Brandon' && (await store.approvedBank('zz-paste-trade')).topics.length === 5, JSON.stringify([s2.approved, s2.approvedBy]), '');
  const s3 = await store.save('zz-paste-trade', sample.split('\n').slice(2).join('\n').replace('BT-1.g', 'BT-1.h'), { source: 'paste' });
  chk('A new paste makes it stale (changed since approval): not approved, approvedBank null, the last approver kept', !s3.approved && s3.stale && (await store.approvedBank('zz-paste-trade')) === null && s3.approvedBy === 'Brandon', JSON.stringify([s3.approved, s3.stale, s3.approvedBy]), '');
  await store.approve('zz-paste-trade', 'Brandon');
  const s4 = await store.unapprove('zz-paste-trade');
  chk('Unapprove clears it', !s4.approved && !s4.stale && s4.approvedBy === null, JSON.stringify(s4), '');
  chk('approvedBank: null for a bad trade name or a trade with nothing', (await store.approvedBank('Bad Name!')) === null && (await store.approvedBank('plumber')) === null && (await store.approvedBank('')) === null, '', 'null');
  // The file seed: a trade with a repo file and no row
  const dir = B.DIR; fs.mkdirSync(dir, { recursive: true });
  const seedFile = B.bankFile('zz-fixture-trade');
  fs.writeFileSync(seedFile, sample.replace(/model TEST SAMPLE[^·]*·/, 'model file-seed ·'), 'utf8');
  try {
    const sf = await store.status('zz-fixture-trade');
    chk('A repo file seeds a trade with no row: read from the file, its header, not approved', sf.exists && sf.from === 'blog-bank/zz-fixture-trade.md' && /file-seed/.test(sf.model) && !sf.approved && sf.counts.topics === 5, JSON.stringify(sf), '');
    const sa = await store.approve('zz-fixture-trade', 'Ray');
    chk('Approving a file bank copies it into the database with the flag', sa.approved && sa.from === 'database' && (await store.approvedBank('zz-fixture-trade')).topics.length === 5, JSON.stringify([sa.approved, sa.from]), '');
    chk('list: every trade with a file or a row, plus any asked for', (await store.list(['plumber'])).map(b => b.trade).join() === 'landscaper,plumber,zz-fixture-trade,zz-paste-trade', (await store.list(['plumber'])).map(b => b.trade).join(), '');
  } finally { fs.unlinkSync(seedFile); }
  // A run with the fake Perplexity
  const r1 = await store.run('zz-paste-trade');
  chk('Run: starts in the background, status running', r1.running && r1.run.status === 'running', JSON.stringify(r1.run), '');
  err = '';
  try { await store.run('zz-paste-trade'); } catch (e) { err = e.message; }
  chk('A second run while one runs is refused', /already running/.test(err), err, '');
  await new Promise(r => setTimeout(r, 50));
  const r2 = await store.status('zz-paste-trade');
  chk('When it finishes the bank is saved from the run (perplexity, the model, the cost), not approved', !r2.running && r2.run.status === 'done' && r2.run.cost === 1.23 && r2.source === 'perplexity' && /fake-model/.test(r2.model) && !r2.approved && runs === 1, JSON.stringify([r2.run, r2.source, r2.model]), '');
  await store.run('zz-fail-trade'); await new Promise(r => setTimeout(r, 50));
  const r3 = await store.status('zz-fail-trade');
  chk('A failed run: status failed with the reason, no bank saved', r3.run.status === 'failed' && r3.run.error === 'fake outage' && !r3.exists, JSON.stringify(r3.run), '');
  const noKey = createBankStore({ pool, log: quiet, runner: null });
  const real = createBankStore({ pool, log: quiet, runner: null });
  await store.save('zz-paste-trade', sample); await store.approve('zz-paste-trade', 'demo'); // the allowed store (the demo) holds the sample, approved
  err = '';
  try { await real.save('zz-paste-trade', sample); } catch (e) { err = e.message; }
  let approveErr = '';
  try { await real.approve('zz-paste-trade', 'x'); } catch (e) { approveErr = e.message; }
  chk('A store without testSamplesAllowed (the live app) refuses the hand written sample on paste and on approve, and never gives it as the approved bank even when the demo approved it', /hand written test sample/.test(err) && /hand written test sample/.test(approveErr) && (await real.approvedBank('zz-paste-trade')) === null && (await store.approvedBank('zz-paste-trade')) !== null && B.isTestSample(sample) && !B.isTestSample(sample.replace(/TEST SAMPLE/, 'perplexity agent high')), [err, approveErr].join(' | '), '');
  await store.unapprove('zz-paste-trade');
  err = '';
  try { await noKey.run('zz-paste-trade'); } catch (e) { err = e.message; }
  chk('No key: Run says to paste instead', /PERPLEXITY_API_KEY is not set: paste the reply/.test(err), err, '');

  // The routes
  const app = express(); app.use(express.json({ limit: '2mb' }));
  mountBankApi(app, store, { trades: () => ['plumber'] });
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const call = (p, opts = {}) => new Promise((resolve, reject) => { const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: p, method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' } }, res => { let b = ''; res.on('data', d => { b += d; }); res.on('end', () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : null })); }); req.on('error', reject); if (opts.body) req.write(JSON.stringify(opts.body)); req.end(); });
  try {
    const l = await call('/api/blog-bank');
    chk('GET /api/blog-bank lists the banks with the trades asked for (the approved file bank kept its row; landscaper is the real run file)', l.status === 200 && l.body.banks.map(b => b.trade).join() === 'landscaper,plumber,zz-fixture-trade,zz-paste-trade', l.body && l.body.banks.map(b => b.trade).join(), '');
    const g = await call('/api/blog-bank/zz-paste-trade');
    chk('GET one bank: the state, the text and the parsed topics', g.status === 200 && g.body.topics.length === 5 && /## 1\. TOPICS/.test(g.body.text) && g.body.ranked.length === 5, JSON.stringify([g.body.topics.length, g.body.ranked]), '');
    const pr = await call('/api/blog-bank/prompt/roofer');
    chk('GET the prompt for a trade', pr.status === 200 && pr.body.prompt.startsWith('RUN FOR: roofer'), pr.body && pr.body.prompt.slice(0, 20), '');
    const bad = await call('/api/blog-bank/zz-paste-trade/paste', { method: 'POST', body: { text: 'nope' } });
    chk('POST paste with a bad reply: 400 and the reason', bad.status === 400 && /No topics could be read/.test(bad.body.error), JSON.stringify(bad.body), '');
    const ok = await call('/api/blog-bank/zz-paste-trade/paste', { method: 'POST', body: { text: sample } });
    const ap = await call('/api/blog-bank/zz-paste-trade/approve', { method: 'POST', body: { who: 'Brandon' } });
    chk('POST paste then approve: saved and approved', ok.status === 200 && ok.body.counts.topics === 5 && ap.status === 200 && ap.body.approved && ap.body.approvedBy === 'Brandon', JSON.stringify([ok.status, ap.body && ap.body.approved]), '');
    const badName = await call('/api/blog-bank/Bad%20Name/approve', { method: 'POST', body: { who: 'x' } });
    chk('A bad trade name: 400', badName.status === 400, badName.status, 400);
  } finally { await new Promise(r => server.close(r)); }

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
