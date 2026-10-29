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
chk('Sample: 5 topics, 30 related questions, 2 cost, 2 decision, 1 question, 4 services, 1 rule, 2 gaps, nothing left unread', JSON.stringify(p.counts) === JSON.stringify({ topics: 5, related: 30, cost: 2, decision: 2, question: 1, ranked: 5, rules: 1, gaps: 2, services: 4, cost_topics: 0, cost_related: 0, seasonal_topics: 0, seasonal_related: 0 }) && p.unread === 0 && p.version === 1, JSON.stringify(p.counts) + ' unread ' + p.unread, '');
const t1 = p.topics[0];
chk('A topic header: id, the question unquoted, type, service, seen and the url', t1.id === 'BT-1' && t1.question === 'How much does a patio cost in the UK?' && t1.type === 'cost' && t1.service === 'Patios and paving' && /People also ask/.test(t1.seen) && t1.url === 'https://www.checkatrade.com/blog/cost-guides/patio-cost/', JSON.stringify(t1), '');
chk('Related questions: id, question, doubt, needs client fact (Y, N and "Yes"), the url, a bare url read too', t1.related.length === 7 && t1.related[0].id === 'BT-1.a' && t1.related[0].doubt === 'Price' && t1.related[0].needsFact === true && t1.related[1].needsFact === false && t1.related[4].needsFact === true && t1.related[5].url === 'https://www.reddit.com/r/DIYUK/comments/patio_deposit', JSON.stringify(t1.related.map(r => [r.id, r.doubt, r.needsFact])), '');
chk('A bold header ("**[BT-2]**") still reads; the ranked list line gives the five ids in order', p.topics[1].id === 'BT-2' && p.topics[1].type === 'decision' && p.ranked.join() === 'BT-5,BT-1,BT-3,BT-4,BT-2', p.ranked.join(), 'BT-5,BT-1,BT-3,BT-4,BT-2');
chk('The one warning: BT-3 has 4 related questions', p.warnings.length === 1 && /^BT-3: 4 related questions \(6 to 10 asked for\)/.test(p.warnings[0]), p.warnings.join(' | '), '');
chk('Rules: the topic, the sentence without its url, the url, marked official (Planning Portal); gaps as lines', p.rules.length === 1 && p.rules[0].topic === 'BT-3' && /^Paving more than five square metres/.test(p.rules[0].text) && !/http/.test(p.rules[0].text) && p.rules[0].official && p.gaps.length === 2 && /^Hedge removal/.test(p.gaps[0]), JSON.stringify(p.rules[0]), '');
const drift = B.parseBank(`## 1. TOPICS\n### BT-9 | How long does decking last? | type: Question | Service: Decking | Seen: PAA | https://a.b/c\n- BT-9.a | "Does composite decking fade?" | Doubt: fit | Needs fact: N | https://a.b/d\n- [BT-9.b] | "Is decking slippery when wet?" | Doubt: Safety | Needs client fact: N\n- [BT-8.a] | "A stray one?" | Doubt: Fit | Needs client fact: N | https://a.b/e\n\nTop 16 by search interest:\n1. [BT-9]\n2. BT-7\n\n## 2. RULES BEHIND THE TOPICS\n- no id here | x | https://a.b\n## 3. GAPS\nNone.\n`);
chk('Drift: no brackets, no quotes, "type" in lower case, a bare url, a bad doubt and a missing url each warned, a stray related id kept under the open topic, a numbered ranked list', drift.topics.length === 1 && drift.topics[0].question === 'How long does decking last?' && drift.topics[0].type === 'question' && drift.topics[0].related.length === 3 && drift.topics[0].related[1].doubt === '' && has(drift.warnings, /BT-9\.b: doubt "Safety"/) && has(drift.warnings, /BT-9\.b: no source url/) && has(drift.warnings, /BT-8\.a: listed under BT-9/) && drift.ranked.join() === 'BT-9,BT-7' && has(drift.warnings, /ranked list names BT-7/) && has(drift.warnings, /rules: a line with no topic id/), JSON.stringify({ r: drift.ranked, w: drift.warnings }), '');
chk('Validation: the sample is usable; an empty reply, a reply with no topics and one with too few are refused in words', B.validateBank(p).valid && /No topics could be read/.test(B.validateBank(B.parseBank('')).error) && /Only 1 topics could be read \(at least 5 needed\)/.test(B.validateBank(drift).error), B.validateBank(drift).error, '');
chk('The prompt to send (v2): the fenced block with RUN FOR, SERVICES (the services library\'s UK page names, one per line) and SEASONAL TOPICS (the niche entry\'s; "none" for the roofer, not a seasonal trade) filled in, the rest untouched', (() => { const pr = B.buildPrompt('roofer'); const ls = B.buildPrompt('landscaper'); return pr.startsWith('RUN FOR: roofer\nSERVICES:\n- ') && /\n- Flat roof replacement\n/.test(pr) && /\nSEASONAL TOPICS: none\n/.test(pr) && /## 1\. TOPICS/.test(pr) && /## 6\. GAPS/.test(pr) && /\[TRADE\]/.test(pr) && !/```/.test(pr) && /\n- Turf laying\n/.test(ls) && !/Sod installation/.test(ls) && /\nSEASONAL TOPICS:\n- Lay new turf\n- Prepare the garden for winter\n- Spring lawn care\n- Hedge cutting after the nesting season\n/.test(ls); })(), B.buildPrompt('roofer').slice(0, 80) + ' … ' + B.buildPrompt('landscaper').match(/SEASONAL TOPICS:[\s\S]{0,120}/), '');
chk('A caller\'s own services and seasonal topics fill the prompt; none of either gives the "none listed" line and "none"', (() => { const pr = B.buildPrompt('zz-trade', { services: ['Fencing', 'Decking'], seasonalTopics: [{ topic: 'Winter checks' }, 'Spring tidy'] }); const none = B.buildPrompt('zz-trade', { services: [], seasonalTopics: [] }); return /^RUN FOR: zz-trade\nSERVICES:\n- Fencing\n- Decking\nSEASONAL TOPICS:\n- Winter checks\n- Spring tidy\n/.test(pr) && /^RUN FOR: zz-trade\nSERVICES: none listed; use the services a UK zz-trade usually offers, by their UK names\nSEASONAL TOPICS: none\n/.test(none); })(), B.buildPrompt('zz-trade', { services: [], seasonalTopics: [] }).slice(0, 160), '');
// ── The v2 sample: cost topics and seasonal topics in their own sections ──
const v2 = B.parseBank(fs.readFileSync(path.join(__dirname, 'data/blog-bank-landscaper-sample-v2.md'), 'utf8'));
chk('v2 sample: version 2; 5 topics (31 related, 3 decision, 2 question, no cost), 4 cost topics (25 related), 4 seasonal topics (22 related), 13 ranked from section 4, 2 rules, 3 gaps, nothing unread, usable', v2.version === 2 && JSON.stringify(v2.counts) === JSON.stringify({ topics: 5, related: 31, cost: 0, decision: 3, question: 2, ranked: 13, rules: 2, gaps: 3, services: 5, cost_topics: 4, cost_related: 25, seasonal_topics: 4, seasonal_related: 22 }) && v2.unread === 0 && B.validateBank(v2).valid, JSON.stringify(v2.counts) + ' unread ' + v2.unread, '');
const ct1 = v2.costTopics[0], st1 = v2.seasonalTopics[0], st4 = v2.seasonalTopics[3];
chk('A CT block: the id, the cost question, type cost, its service, seen and url, its related questions with their doubts', ct1.id === 'CT-1' && ct1.block === 'CT' && ct1.type === 'cost' && ct1.question === 'How much does lawn mowing cost?' && ct1.service === 'Lawn mowing' && /Bark/.test(ct1.seen) && /checkatrade/.test(ct1.url) && ct1.related.length === 6 && ct1.related[0].id === 'CT-1.a' && ct1.related[0].doubt === 'Price' && ct1.related[0].needsFact && v2.costTopics[3].service === 'General', JSON.stringify(ct1), '');
chk('An ST block: the id, type seasonal, its service, the window as the source states it and the window\'s url; "no window stated" is an empty window and a warning', st1.id === 'ST-1' && st1.type === 'seasonal' && st1.service === 'Turf laying' && st1.window === 'September to October, or March to April' && st1.window_url === 'https://www.rhs.org.uk/lawns/laying-turf' && st1.related.length === 6 && st4.window === '' && st4.window_url === 'https://www.rspb.org.uk/birds-and-wildlife/advice/gardening-for-wildlife/hedges' && has(v2.warnings, /^ST-4: no window stated/), JSON.stringify([st1.window, st1.window_url, st4.window]), '');
chk('The ranked list (section 4, a numbered list by id) mixes the three blocks in order; a rule on an ST topic reads; allTopics gives BT then CT then ST', v2.ranked.slice(0, 5).join() === 'CT-2,CT-3,BT-3,BT-4,ST-1' && v2.rules[1].topic === 'ST-4' && v2.rules[1].official && B.allTopics(v2).map(t => t.id).join() === 'BT-1,BT-2,BT-3,BT-4,BT-5,CT-1,CT-2,CT-3,CT-4,ST-1,ST-2,ST-3,ST-4' && v2.warnings.length === 3, JSON.stringify([v2.ranked, v2.warnings]), '');
const v2t = B.parseBank(`## 1. TOPICS\n| ID | Question | Type | Service | Seen | Source |\n|---|---|---|---|---|---|\n| BT-1 | How do I fix a boggy lawn? | question | Garden drainage | PAA | https://a.b/1 |\n| BT-1.a | Does sand help a boggy lawn? | Fit | N | https://a.b/2 |\n## 2. COST TOPICS\n| ID | Question | Service | Seen | Source |\n|---|---|---|---|---|\n| CT-1 | How much does fencing cost? | Fencing | PAA, Bark | https://a.b/3 |\n| CT-1.a | Is a fence quote per panel or per metre? | Price | Y | https://a.b/4 |\n### Related questions\n- CT-1.b | "Does a fence quote include taking the old one away?" | Doubt: Process | Needs client fact: Y | https://a.b/5\n## 3. SEASONAL TOPICS\n| ID | Question | Service | Window | Source |\n|---|---|---|---|---|\n| ST-1 | When should I lay turf? | Turf laying | September to October | https://a.b/6 |\n| ST-1.a | Can turf go down in frost? | Timing | N | https://a.b/7 |\n## 4. RANKED\n| Rank | ID |\n|---|---|\n| 1 | CT-1 |\n| 2 | ST-1 |\n## 5. RULES BEHIND THE TOPICS\nNone.\n## 6. GAPS\n| Block | Found |\n|---|---|\n| CT-1 | 2 |\n`);
chk('The table format (the first real run\'s shape) reads for all three blocks: unlabelled cells in each block\'s order, a sub heading skipped, a one column ranked table, a gaps table', v2t.topics.length === 1 && v2t.topics[0].service === 'Garden drainage' && v2t.costTopics.length === 1 && v2t.costTopics[0].service === 'Fencing' && v2t.costTopics[0].seen === 'PAA, Bark' && v2t.costTopics[0].related.length === 2 && v2t.costTopics[0].related[1].doubt === 'Process' && v2t.seasonalTopics[0].window === 'September to October' && v2t.seasonalTopics[0].window_url === 'https://a.b/6' && v2t.seasonalTopics[0].related[0].doubt === 'Timing' && v2t.ranked.join() === 'CT-1,ST-1' && v2t.gaps.join() === 'CT-1: 2' && v2t.unread === 0, JSON.stringify([v2t.topics, v2t.costTopics, v2t.seasonalTopics, v2t.ranked, v2t.gaps, v2t.unread]), '');
chk('Header line: written and read back; the sample header says TEST SAMPLE', B.parseHeader(B.header({ generated: '2026-10-28', model: 'pasted' })).generated === '2026-10-28' && /^TEST SAMPLE/.test(B.parseHeader(sample).model), '', '');

// ── The related questions from People also ask (blog/paa.js; Brandon, 28 Oct) ──
const P = require(path.join(root, 'blog/paa.js'));
const landscaperNiche = JSON.parse(fs.readFileSync(path.join(root, 'niche-library/landscaper.json'), 'utf8'));
const paaLine = B.parseBank(`## 1. TOPICS\n### [BT-1] | "How much does a patio cost?" | Type: cost | Service: Patios | Seen: PAA | https://a.b/c\n- [BT-1.a] | "Is a patio worth it?" | Doubt: Fit | Needs client fact: N | PAA\n- [BT-1.b] | "Does a patio add value?" | Doubt: Fit | Needs client fact: N | Source: PAA\n- [BT-1.c] | "Do you need a deposit?" | Doubt: Trust | Needs client fact: Y | https://a.b/d\n- [BT-1.d] | "No source here" | Doubt: Trust | Needs client fact: Y\n`);
chk('The parser: a related line ending PAA (or Source: PAA) is marked source PAA with no url and no "no source url" warning; a url line is source url; neither is "no source"', paaLine.topics[0].related[0].source === 'PAA' && paaLine.topics[0].related[0].url === '' && paaLine.topics[0].related[1].source === 'PAA' && paaLine.topics[0].related[2].source === 'url' && paaLine.topics[0].related[3].source === '' && has(paaLine.warnings, /BT-1\.d: no source url/) && !has(paaLine.warnings, /BT-1\.[ab]: no source url/), JSON.stringify([paaLine.topics[0].related.map(r => r.source), paaLine.warnings]), '');
const keep = q => P.classify(q, { niche: landscaperNiche }).keep, why = q => P.classify(q, { niche: landscaperNiche }).why;
{
  const roofer = require(path.join(root, 'niche-library/roofer.json'));
  const rk = q => P.classify(q, { niche: roofer, services: ['Roof window installation (Velux)', 'Conservatory roof replacement', 'Solar panel bird proofing'] });
  const lk = q => P.classify(q, { niche: landscaperNiche });
  chk('The other trades filter never drops the niche\'s own trade: a roofer keeps "How to spot a dodgy roofer?", "Why are my gutters overflowing?" and "Why is my Velux window leaking?" (the trade person, a service term and a bank service, on the stem); a landscaper still drops a roofer question and a boiler one; a roofer drops a boiler question',
    rk('How to spot a dodgy roofer?').keep && rk('Why are my gutters overflowing?').keep && rk('Why is my Velux window leaking?').keep && rk('Is a conservatory roof replacement worth it?').keep && !lk('How much does a roofer charge to replace a tile?').keep && /another trade/.test(lk('How much does a roofer charge to replace a tile?').why) && !lk('Do I need a new boiler?').keep && !rk('Do I need a new boiler?').keep,
    JSON.stringify([rk('How to spot a dodgy roofer?'), rk('Why are my gutters overflowing?'), rk('Why is my Velux window leaking?'), lk('How much does a roofer charge to replace a tile?'), rk('Do I need a new boiler?')]), '');
}
chk('The filter: DIY how to and materials questions go ("How do I build a timber decking frame?", "Can I use C16 timber…", "What size timber…", "…do it myself"), another trade goes ("…new boiler…"), the hirer\'s questions stay (cost, worth it, choosing an installer, planning permission, getting the garden ready); fencing is the landscaper\'s own, never another trade', !keep('How do I build a timber decking frame?') && why('How do I build a timber decking frame?') === 'DIY how to' && !keep('Can I use C16 timber for a decking frame?') && why('Can I use C16 timber for a decking frame?') === 'DIY materials' && !keep('What size timber is best for a decking frame?') && !keep('Should I get a landscaper or do it myself?') && !keep('How much does a new boiler cost?') && /another trade \(boiler\)/.test(why('How much does a new boiler cost?')) && keep('How much does composite decking cost per square metre?') && keep('Is composite decking worth it?') && keep('How do I choose a decking installer?') && keep('Do I need planning permission for decking?') && keep('How do I get my garden ready for winter?') && keep('How much does fencing cost?') && keep('How do I fix a waterlogged lawn?') && keep('How do I stop moss coming back?') && keep('Can a sinking patio be repaired?') && keep('Can I put up a 10 foot fence?') && keep('Can I level my garden without planning permission?') && !keep('Can I level a garden myself?') && P.costAgain('How much does a 25m2 deck cost?') && P.costAgain('What is the average price of decking?') && !P.costAgain('What does a decking quote include?') && !P.costAgain('How much does it cost to remove old decking?') && P.samePaa('What causes a pond to turn green?', 'Why is my garden pond turning green?') && !P.samePaa('What is tree cabling and bracing?', 'Can a split or leaning tree be saved with cabling and bracing?') && !P.samePaa('Do you need planning permission for a garden shed in the UK?', 'Do I need planning permission for decking in my garden?'), JSON.stringify(['How do I build a timber decking frame?', 'Can I use C16 timber for a decking frame?', 'How much does a new boiler cost?', 'How much does fencing cost?'].map(q => [q, P.classify(q, { niche: landscaperNiche })])), '');
chk('The doubt read off the words: cost → Price, when or how long → Timing, insured or guarantee → Trust, what happens or process → Process, else Fit', P.doubtOf('How much does a patio cost?') === 'Price' && P.doubtOf('When is the best time to lay turf?') === 'Timing' && P.doubtOf('Should a landscaper be insured?') === 'Trust' && P.doubtOf('What happens on the first day of a patio job?') === 'Process' && P.doubtOf('Is porcelain slippery when wet?') === 'Fit', [P.doubtOf('How much does a patio cost?'), P.doubtOf('When is the best time to lay turf?'), P.doubtOf('Should a landscaper be insured?'), P.doubtOf('What happens on the first day of a patio job?'), P.doubtOf('Is porcelain slippery when wet?')].join(), 'Price,Timing,Trust,Process,Fit');
// A fake DataForSEO: task_post gives a task per target, tasks_ready lists them, task_get gives a SERP with a People also ask block (one question opened a click deeper)
const PAA_FAKE = { DATAFORSEO_LOGIN: 'login-SECRET-zzz', DATAFORSEO_PASSWORD: 'pw-SECRET-999' };
const PAA_BY_TARGET = { 'BT-1': ['Is porcelain or sandstone better for a patio?', 'Does porcelain paving crack in frost?', 'How much does a porcelain patio cost?', 'How do I lay porcelain slabs?', 'Does sandstone paving stain?', 'Does porcelain paving crack in the frost?', 'Can I grow cucumbers on a patio?', 'What is a gardener\'s wage in the UK?'], 'CT-1': ['Is it worth paying for lawn mowing?', 'How much is lawn mowing per hour UK?', 'Does sandstone paving stain?', 'How much does a new boiler cost?'], 'ST-1': ['When is the best time to lay turf in the UK?', 'Can you lay turf in November?', 'How long before you can walk on new turf?'] };
const paaCalls = [];
const paaPosts = []; // every task_post body
// A stub relevance judge: a cucumber question is off topic, a gardener wage question a job seeker's; the rest stay
const judgeCalls = [];
const stubJudge = async ({ system, message, model }) => { judgeCalls.push({ model, system, message }); const qs = message.split('QUESTIONS:')[1].trim().split('\n'); return { text: 'Here you go:\n' + JSON.stringify(qs.map((q, i) => /cucumber/i.test(q) ? { n: i + 1, keep: false, why: 'off topic: cucumbers' } : /wage|salary/i.test(q) ? { n: i + 1, keep: false, why: 'job seeker: wages' } : { n: i + 1, keep: true })), usage: { input_tokens: 300, output_tokens: 40, model } }; };
const paaFetch = async (url, opts = {}) => {
  paaCalls.push(url);
  if (/task_post$/.test(url)) paaPosts.push(JSON.parse(opts.body));
  const json = v => ({ ok: true, status: 200, json: async () => v });
  if (/task_post$/.test(url)) { const body = JSON.parse(opts.body); return json({ status_code: 20000, tasks: body.map(t => ({ id: `task-${t.tag}`, status_code: t.tag === 'BT-5' ? 40501 : 20100, status_message: t.tag === 'BT-5' ? 'Invalid Field' : 'Task Created', cost: 0.002, data: { tag: t.tag, keyword: t.keyword, people_also_ask_click_depth: t.people_also_ask_click_depth, location_code: t.location_code } })) }); }
  if (/tasks_ready$/.test(url)) return json({ status_code: 20000, tasks: [{ status_code: 20000, result: [...new Set(paaCalls.filter(u => /task_post$/.test(u)))].length ? Object.keys(PAA_BY_TARGET).concat(['BT-2', 'BT-3', 'BT-4', 'CT-2', 'CT-3', 'CT-4', 'ST-2', 'ST-3', 'ST-4']).map(id => ({ id: `task-${id}`, tag: id })) : [] }] });
  const m = url.match(/task_get\/advanced\/task-(.+)$/);
  if (m) { const qs = PAA_BY_TARGET[m[1]] || [`How much does ${m[1]} cost?`]; const items = qs.slice(0, 2).map(q => ({ type: 'people_also_ask_element', title: q, expanded_element: [] })); if (qs[2]) items[0].expanded_element = [{ type: 'people_also_ask_expanded_element', items: [{ type: 'people_also_ask_element', title: qs[2] }] }]; for (const q of qs.slice(3)) items.push({ type: 'people_also_ask_element', title: q }); return json({ status_code: 20000, tasks: [{ id: `task-${m[1]}`, status_code: 20000, cost: 0, result: [{ keyword: 'x', items: [{ type: 'organic', title: 'a page' }, { type: 'people_also_ask', items }] }] }] }); }
  return { ok: false, status: 404, json: async () => ({ status_code: 40400, status_message: 'Not Found' }) };
};
(async () => {
  const got = await P.fetchPaa([{ id: 'BT-1', question: 'Porcelain or sandstone?' }, { id: 'CT-1', question: 'How much does lawn mowing cost?' }, { id: 'BT-5', question: 'x' }], { env: PAA_FAKE, fetchImpl: paaFetch, sleep: async () => {}, pollMs: 0 });
  chk('fetchPaa: one task per target (UK, English, People also ask two clicks deep, the id as the tag), the questions read from the SERP\'s People also ask block, the opened ones included; a task the API refuses is failed with its message; the cost summed from the posted tasks', got.byId.get('BT-1').status === 'done' && got.byId.get('BT-1').questions.length === 8 && got.byId.get('BT-1').questions.includes('How much does a porcelain patio cost?') && got.byId.get('CT-1').questions.length === 4 && got.byId.get('BT-5').status === 'failed' && /Invalid Field/.test(got.byId.get('BT-5').error) && got.cost === 0.006 && paaCalls.some(u => /task_post$/.test(u)) && paaCalls.some(u => /task_get\/advanced\/task-BT-1$/.test(u)), JSON.stringify([[...got.byId].map(([k, v]) => [k, v.status, v.questions.length]), got.cost]), '');
  const leaks = s => [PAA_FAKE.DATAFORSEO_LOGIN, PAA_FAKE.DATAFORSEO_PASSWORD, Buffer.from(`${PAA_FAKE.DATAFORSEO_LOGIN}:${PAA_FAKE.DATAFORSEO_PASSWORD}`).toString('base64')].some(v => String(s).includes(v));
  let paaErr = '';
  try { await P.fetchPaa([{ id: 'BT-1', question: 'x' }], { env: PAA_FAKE, fetchImpl: async () => ({ ok: false, status: 401, statusText: 'Unauthorized', json: async () => ({ status_code: 40100, status_message: `bad login ${PAA_FAKE.DATAFORSEO_LOGIN}` }) }), sleep: async () => {} }); } catch (e) { paaErr = e.message; }
  chk('A refused login fails in words with the credentials scrubbed', /bad login \[hidden\]/.test(paaErr) && !leaks(paaErr), paaErr, '');
  // A search still in the standard queue after the wait goes through live mode (Brandon, 28 Oct)
  const liveCalls = []; let clock = 0;
  const liveFetch = async (url, opts = {}) => { liveCalls.push(url.replace(/^.*organic/, '')); const json = v => ({ ok: true, status: 200, json: async () => v }); if (/task_post$/.test(url)) { const b = JSON.parse(opts.body); return json({ status_code: 20000, tasks: b.map(x => ({ id: `task-${x.tag}`, status_code: 20100, cost: 0.0006, data: { tag: x.tag } })) }); } if (/tasks_ready$/.test(url)) return json({ status_code: 20000, tasks: [{ result: [] }] }); if (/live\/advanced$/.test(url)) { const b = JSON.parse(opts.body); return json({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.002, result: [{ items: [{ type: 'people_also_ask', items: [{ type: 'people_also_ask_element', title: `Live question for ${b[0].keyword}` }] }] }] }] }); } return { ok: false, status: 404, json: async () => ({ status_code: 40400, status_message: 'nope' }) }; };
  const live = await P.fetchPaa([{ id: 'BT-1', question: 'x?' }], { env: PAA_FAKE, fetchImpl: liveFetch, sleep: async () => {}, pollMs: 0, timeoutMs: 1000, now: () => { clock += 600; return clock; } });
  chk('A search the queue has not answered in time is run again through live mode: its questions come from the live reply, the cost adds up, the block says live mode in the report', live.byId.get('BT-1').status === 'done' && live.byId.get('BT-1').live === true && live.byId.get('BT-1').questions.join() === 'Live question for x?' && live.cost === 0.0026 && liveCalls.join() === '/task_post,/tasks_ready,/live/advanced', JSON.stringify([[...live.byId], live.cost, liveCalls]), '');
  // The bank rebuilt from the sample v2 with the fake People also ask
  const v2text = fs.readFileSync(path.join(__dirname, 'data/blog-bank-landscaper-sample-v2.md'), 'utf8');
  const r = await P.paaPass(v2text, { niche: landscaperNiche, trade: 'landscaper', env: PAA_FAKE, fetchImpl: paaFetch, sleep: async () => {}, pollMs: 0, date: '2026-10-29', callModel: stubJudge });
  const rb = B.parseBank(r.text);
  const before = B.parseBank(v2text);
  chk('paaPass: the targets, rules, ranked list and windows are as Perplexity wrote them; every Perplexity related question is gone; BT-1 keeps the People also ask ones that pass (the target reworded, the DIY how to and a near repeat dropped), each marked PAA with a doubt; a question already kept in BT-1 is not repeated in CT-1 and the boiler one goes; the header says where the related questions came from; GAPS lists the blocks under three', rb.version === 2 && JSON.stringify(B.allTopics(rb).map(t => [t.id, t.question, t.service, t.window || ''])) === JSON.stringify(B.allTopics(before).map(t => [t.id, t.question, t.service, t.window || ''])) && rb.rules.length === before.rules.length && rb.ranked.join() === before.ranked.join() && B.allTopics(rb).every(t => t.related.every(q => q.source === 'PAA')) && rb.topics[0].related.map(q => q.question).join(' / ') === 'How much does a porcelain patio cost? / Does porcelain paving crack in frost? / Does sandstone paving stain?' && rb.topics[0].related.map(q => q.doubt).join() === 'Price,Fit,Fit' && rb.costTopics[0].related.map(q => q.question).join(' / ') === 'Is it worth paying for lawn mowing? / How much is lawn mowing per hour UK?' && rb.seasonalTopics[0].related.length === 3 && /related questions from People also ask \(DataForSEO, 2026-10-29\)/.test((B.parseHeader(r.text) || {}).model) && rb.gaps.some(g => /People also ask \(DataForSEO, 2026-10-29\): \d+ blocks under 3/.test(g)) && B.validateBank(rb).valid, JSON.stringify([rb.topics[0].related, rb.costTopics[0].related.map(q => q.question), rb.gaps.slice(-1), (B.parseHeader(r.text) || {}).model]), '');
  const bt1 = r.report.blocks.find(b => b.id === 'BT-1'), ct1 = r.report.blocks.find(b => b.id === 'CT-1');
  chk('The report per block: found, kept, what was dropped and why; the totals and the cost; the credentials never in it', bt1.found === 8 && bt1.after_words === 7 && bt1.after_relevance === 5 && bt1.kept === 3 && bt1.dropped.length === 5 && bt1.dropped.some(d => /target question in other words/.test(d.why)) && bt1.dropped.some(d => d.why === 'DIY how to') && bt1.dropped.some(d => /already kept in this block/.test(d.why)) && ct1.found === 4 && ct1.kept === 2 && ct1.dropped.some(d => /^kept in BT-1 \(closer to its target\)$/.test(d.why)) && ct1.dropped.some(d => /another trade/.test(d.why)) && r.report.totals.blocks === 13 && r.cost > 0 && /PEOPLE ALSO ASK REPORT: landscaper/.test(r.reportText) && new RegExp(`BT-1\\s+found\\s+8, words\\s+7, relevant\\s+5, kept\\s+3`).test(r.reportText) && /Cost: DataForSEO \$0\.0/.test(r.reportText) && /the relevance judge [\d.]+p over \d+ call\(s\) \(claude-haiku-5-5\)/.test(r.reportText) && !leaks(r.reportText), JSON.stringify([bt1, ct1, r.report.totals, r.cost]), '');
  chk('The relevance judge (a stub on Haiku): every question the word filter kept goes to it with the block\'s target and service; the cucumber and the wage questions are dropped with its reason, listed as relevance drops; the verdicts are kept with the raw questions so a rebuild judges only new ones', judgeCalls.length > 0 && judgeCalls.every(c => c.model === 'claude-haiku-5-5' && /TARGET QUESTION: /.test(c.message) && /SERVICE: /.test(c.message) && /KEEP a question only when/.test(c.system)) && bt1.dropped.some(d => d.why === 'relevance: off topic: cucumbers') && bt1.dropped.some(d => d.why === 'relevance: job seeker: wages') && r.report.totals.relevance_dropped === 2 && r.raw.judged['BT-1\nCan I grow cucumbers on a patio?'] && r.raw.judged['BT-1\nCan I grow cucumbers on a patio?'].keep === false && r.modelPence > 0, JSON.stringify([judgeCalls.length, bt1.dropped, r.report.totals, r.modelPence]), '');
  chk('The second search: every block still under six after the judge is searched once more, four clicks deep (the fake gives the same questions back: nothing new), said per block and in the totals; a rebuild from the raw judges nothing again and carries the judge\'s cost and the second searches over', paaPosts.length >= 2 && paaPosts[paaPosts.length - 1].every(t => t.people_also_ask_click_depth === 4) && paaPosts[0].every(t => t.people_also_ask_click_depth === 2) && r.report.totals.deepened > 0 && r.report.blocks.filter(b => b.kept < 6 && b.status !== 'failed').every(b => b.deepened && b.deepened.added === 0) && /searched again: \d+ found, 0 new/.test(r.reportText) && (await (async () => { const before = judgeCalls.length; const again = await P.paaPass(v2text, { niche: landscaperNiche, trade: 'landscaper', env: PAA_FAKE, fetchImpl: paaFetch, raw: r.raw, callModel: stubJudge, deepen: false, date: '2026-10-29' }); return judgeCalls.length === before && again.report.totals.kept === r.report.totals.kept && again.modelPence === r.modelPence && again.modelCalls === r.modelCalls && again.report.totals.deepened === r.report.totals.deepened; })()), JSON.stringify([paaPosts.map(p => p.map(t => t.people_also_ask_click_depth).join('')), r.report.totals]), '');
})().catch(e => { console.error(e); process.exit(1); });

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
  // ── The v2 bank: own block sourcing (Brandon, 28 Oct) ──
  const rv2 = reserveBlogTopics({ ...base, bank: v2, launchDate: '2026-11-09' });
  const ALL2 = [...rv2.topics, ...rv2.held_back].sort((a, b) => a.order - b.order);
  const prefixOf = id => String(id || '').slice(0, 2);
  const ownBlock = t => { const ids = [...t.query_stack, ...t.faq_ids]; const block = t.bank_topic || (t.question && /^(BT|CT|ST)-/.test(t.question.id) ? t.question.id : ''); return !ids.length || (!!block && ids.every(id => id.startsWith(block + '.'))); };
  const cg = ALL2.filter(t => t.post_type === 'cost_guide');
  chk('v2: every cost guide\'s FAQ comes from its own CT block only: the trade guide from CT-4 (General), the artificial grass guide from CT-2, the lawn mowing guide from CT-1 (its five, Price first, none rephrasing a fixed H2); a service with no CT block (custom landscape design) is held with F-STACK, said once; a cost question naming no service page gets no block (never the trade block); no stack on a cost guide; no fourth source (F-FAQ-SOURCE) anywhere', cg[0].homepage_cost_guide && cg[0].question.id === 'CT-4' && cg[0].faq_ids.length >= 3 && cg[0].faq_ids.filter(id => id.startsWith('CT-4.')).length >= 3 && cg[0].faq_ids.every(id => /^CT-\d+\./.test(id)) && cg.some(t => t.question && t.question.id === 'CT-2' && t.faq_ids.every(id => id.startsWith('CT-2.')) && rv2.topics.includes(t)) && (() => { const lm = cg.find(t => t.question && t.question.id === 'CT-1'); return lm && lm.faq_ids.length === 5 && lm.faq_ids.every(id => id.startsWith('CT-1.')) && lm.faq[0].doubt === 'Price' && rv2.topics.includes(lm); })() && cg.every(t => !t.query_stack.length) && (() => { const d = cg.find(t => /custom-landscape-design/.test(t.key)); return d && rv2.held_back.includes(d) && d.flags.filter(f => f.code === 'F-STACK' && /No CT block in the bank for/.test(f.msg)).length === 1; })() && cg.filter(t => !t.service && !t.homepage_cost_guide).every(t => !t.bank_topic && !t.faq_ids.length) && !ALL2.some(t => t.flags.some(f => f.code === 'F-FAQ-SOURCE')), JSON.stringify(cg.map(t => [t.key, t.question && t.question.id, t.faq_ids, t.flags.map(f => f.code), rv2.topics.includes(t)])), '');
  const se = ALL2.filter(t => t.source === 'seasonal');
  const turf2 = se.find(t => /lay-new-turf/.test(t.key)), hedge2 = se.find(t => /hedge-cutting/.test(t.key)), winter2 = se.find(t => /winter/.test(t.key));
  chk('v2: a seasonal post takes its H2s and FAQ from its ST block only (lay new turf from ST-1, 3 and 3; the winter post from ST-2, not the tasks list: no F-TASKS); the block\'s window with its source rides on the topic (bank_window) and gives the "When …" wording; hedge cutting (ST-4: four related, one a page asks, no window stated) is held with no window', turf2 && rv2.topics.includes(turf2) && turf2.bank_topic === 'ST-1' && turf2.query_stack.length === 3 && turf2.faq_ids.length === 3 && ownBlock(turf2) && turf2.bank_window && turf2.bank_window.text === 'September to October, or March to April' && turf2.bank_window.url === 'https://www.rhs.org.uk/lawns/laying-turf' && /^When Should You Lay New Turf in Southampton\?$/.test(turf2.wording) && winter2 && rv2.topics.includes(winter2) && winter2.bank_topic === 'ST-2' && ownBlock(winter2) && !ALL2.some(t => t.flags.some(f => f.code === 'F-TASKS')) && hedge2 && rv2.held_back.includes(hedge2) && hedge2.bank_window === null && hedge2.faq_ids.length === 0, JSON.stringify(se.map(t => [t.key, t.bank_topic, t.query_stack, t.faq_ids, t.bank_window, t.wording, t.flags.map(f => f.code), rv2.topics.includes(t)])), '');
  chk('v2: a bank decision post runs on its own BT block (porcelain or sandstone, BT-1: 4 and 3); a BT block thinned by the pages\' questions is held (BT-4, F-DROPPED then F-STACK); a dossier post with no bank topic asking its question is held (F-STACK, once); no post mixes blocks', (() => { const p = ALL2.find(t => t.question && t.question.id === 'BT-1'); return p && rv2.topics.includes(p) && p.query_stack.length === 4 && p.faq_ids.length === 3 && ownBlock(p); })() && (() => { const w = ALL2.find(t => t.question && t.question.id === 'BT-4'); return w && rv2.held_back.includes(w) && has(w.flags, /^F-DROPPED$/) && has(w.flags, /^F-STACK$/); })() && (() => { const d = ALL2.find(t => t.source === 'dossier'); return d && rv2.held_back.includes(d) && d.flags.filter(f => f.code === 'F-STACK' && /No bank topic asks/.test(f.msg)).length === 1; })() && ALL2.every(t => t.homepage_cost_guide || ownBlock(t)) && rv2.counts.topics === 7 && rv2.counts.held === 9, JSON.stringify(ALL2.map(t => [t.key, t.bank_topic, t.query_stack, t.faq_ids, t.flags.map(f => f.code)])), '');
  // A bank topic named by the library's UK name finds its page (29 Oct): "Artificial grass installation" is the Artificial Turf Installation page
  {
    const v2u = B.parseBank(fs.readFileSync(path.join(__dirname, 'data/blog-bank-landscaper-sample-v2.md'), 'utf8'));
    v2u.topics[3].service = 'Artificial grass installation'; // BT-4, a question topic
    const rvu = reserveBlogTopics({ ...base, bank: v2u, launchDate: '2026-11-09' });
    const bt4 = [...rvu.topics, ...rvu.held_back].find(t => t.question && t.question.id === 'BT-4');
    chk('A bank topic whose service is the library UK name of a page ("Artificial grass installation") gets that page (the artificial turf page) as its service and primary link, as the CT blocks do', bt4 && bt4.service && /artificial-turf/.test(bt4.service.urlSlug || bt4.service.slug || '') && /artificial-turf/.test(bt4.primary), JSON.stringify(bt4 && [bt4.service, bt4.primary]), '');
  }
  // The trade level cost guide (Brandon, 29 Oct): its own CT block first, then every service's CT block, Price first, never a question another post in the batch uses
  {
    const v2t = B.parseBank(fs.readFileSync(path.join(__dirname, 'data/blog-bank-landscaper-sample-v2.md'), 'utf8'));
    const gen = v2t.costTopics.find(t => /general/i.test(t.service || ''));
    gen.related = gen.related.slice(0, 2); // the trade's own block gives two
    const rvt = reserveBlogTopics({ ...base, bank: v2t, launchDate: '2026-11-09' });
    const allT = [...rvt.topics, ...rvt.held_back];
    const tg = allT.find(t => t.homepage_cost_guide);
    const others = allT.filter(t => t !== tg).flatMap(t => [...t.query_stack, ...t.faq_ids]);
    const extra = tg ? tg.faq_ids.filter(id => !id.startsWith(gen.id + '.')) : [];
    const extraQs = tg ? tg.faq.filter(f => !f.id.startsWith(gen.id + '.')) : [];
    chk('The trade level cost guide: its own CT block first (two), then every service\'s CT block up to five, Price questions first, F-FAQ-CT naming the blocks; none of them a question another post in the batch uses',
      tg && rvt.topics.includes(tg) && tg.faq_ids.length === 5 && tg.faq_ids[0].startsWith(gen.id + '.') && extra.length >= 3 && extra.length <= 4 && extra.every(id => /^CT-\d+\./.test(id) && !id.startsWith(gen.id + '.') && !others.includes(id)) && extraQs[0].doubt === 'Price' && tg.flags.some(f => f.code === 'F-FAQ-CT' && /[34] FAQ questions from the services' CT blocks \(CT-/.test(f.msg)),
      JSON.stringify(tg && [tg.faq_ids, extraQs.map(f => f.doubt), tg.flags.map(f => f.code), rvt.topics.includes(tg)]), '');
  }
  // A cost guide's FAQ: its CT block first, then the same service's BT block (never another service's), leaving that block the six its own post needs
  const v2b = B.parseBank(fs.readFileSync(path.join(__dirname, 'data/blog-bank-landscaper-sample-v2.md'), 'utf8'));
  v2b.costTopics[0].related = v2b.costTopics[0].related.slice(0, 2); // CT-1 (lawn mowing) gives two
  v2b.topics[1].service = 'Lawn mowing'; // BT-2 on the same service, eight related
  v2b.topics[1].related = ['Is a monthly lawn plan worth it?', 'Do lawn companies cut in the rain?', 'How short should a lawn be cut?', 'Can a very long lawn be cut in one go?', 'Do you need to be in when the lawn is cut?', 'How do lawn companies dispose of grass?', 'What does a lawn visit include?', 'Can wet grass be mowed?'].map((q, i) => ({ id: `BT-2.${'abcdefgh'[i]}`, question: q, doubt: ['Price', 'Timing', 'Process', 'Fit', 'Process', 'Process', 'Process', 'Timing'][i], needsFact: false, url: 'https://a.b', source: 'PAA' }));
  v2b.topics[3].service = 'Garden drainage';
  const rvb = reserveBlogTopics({ ...base, bank: v2b, launchDate: '2026-11-09' });
  const lmb = [...rvb.topics, ...rvb.held_back].find(t => t.question && t.question.id === 'CT-1');
  chk('A cost guide takes its FAQ from its CT block first (two here), then the same service\'s BT block until it has five or the block is down to the six its own post needs (BT-2: eight, so two), F-FAQ-BT naming the block; never another service\'s BT block', lmb && lmb.faq_ids.length === 4 && lmb.faq_ids.slice(0, 2).every(id => id.startsWith('CT-1.')) && lmb.faq_ids.slice(2).every(id => id.startsWith('BT-2.')) && lmb.related_from.join() === 'CT-1,BT-2' && lmb.flags.some(f => f.code === 'F-FAQ-BT' && /2 FAQ questions from the service's BT block \(BT-2\)/.test(f.msg)) && rvb.topics.includes(lmb) && [...rvb.topics, ...rvb.held_back].filter(t => t.post_type === 'cost_guide' && t !== lmb).every(t => !t.faq_ids.some(id => id.startsWith('BT-'))), JSON.stringify([lmb && lmb.faq_ids, lmb && lmb.related_from, lmb && lmb.flags.map(f => f.code + ' ' + f.msg)]), '');
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
  const store = createBankStore({ pool, log: quiet, testSamplesAllowed: true, runner: async (trade, prompt, onStatus) => { runs++; onStatus('polling'); if (trade === 'zz-fail-trade') throw new Error('fake outage'); return { text: sample.split('\n').slice(2).join('\n'), model: 'fake-model', cost: 1.23 }; },
    paa: (text, opts) => P.paaPass(text, { ...opts, env: PAA_FAKE, fetchImpl: paaFetch, sleep: async () => {}, pollMs: 0, date: '2026-10-29', callModel: stubJudge, deepen: false }), nicheFor: () => landscaperNiche });
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
    chk('list: every trade with a file or a row, plus any asked for', (await store.list(['plumber'])).map(b => b.trade).join() === 'landscaper,plumber,roofer,zz-fixture-trade,zz-paste-trade', (await store.list(['plumber'])).map(b => b.trade).join(), '');
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

  // The People also ask pass on the store: the bank replaced and unapproved, the report kept
  await store.save('zz-paste-trade', sample);
  await store.approve('zz-paste-trade', 'Brandon');
  const rp = await store.runPaa('zz-paste-trade');
  chk('runPaa: starts in the background; the status shows it running', rp.paa.running && rp.paa.run.status === 'running', JSON.stringify(rp.paa), '');
  await new Promise(r => setTimeout(r, 200));
  const sp = await store.status('zz-paste-trade');
  const rep = await store.paaReport('zz-paste-trade');
  chk('After the pass: the bank is the rebuilt one (every related question PAA), saved as perplexity+paa, unapproved; the status carries the last pass (date, cost, found, kept, blocks); the report is kept and read back', !sp.paa.running && sp.paa.run.status === 'done' && !sp.approved && sp.source === 'paste+paa' && B.allTopics(B.parseBank((await store.read('zz-paste-trade')).text)).every(t => t.related.every(q => q.source === 'PAA')) && sp.paa.last && sp.paa.last.date === '2026-10-29' && sp.paa.last.cost > 0 && sp.paa.last.kept > 0 && sp.paa.last.blocks === 5 && rep && /PEOPLE ALSO ASK REPORT: zz-paste-trade/.test(rep.text) && /the relevance judge/.test(rep.text) && rep.kept === sp.paa.last.kept, JSON.stringify([sp.paa, sp.source, sp.approved, rep && rep.text.slice(0, 80)]), '');
  const lf = await store.loadFile('landscaper');
  chk('loadFile: the repo file saved over the row, unapproved, source file; the status says the row and the file are the same; a trade with no file is refused in words', lf.source === 'file' && !lf.approved && lf.from === 'database' && lf.file && lf.file.same && (await (async () => { try { await store.loadFile('zz-paste-trade'); return ''; } catch (e) { return e.message; } })()).includes('no file blog-bank/zz-paste-trade.md'), JSON.stringify([lf.source, lf.approved, lf.from, lf.file]), '');
  err = '';
  try { await noKey.runPaa('zz-paste-trade'); } catch (e) { err = e.message; }
  chk('No DataForSEO credentials: the pass says which settings are missing', /DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD/.test(err), err, '');

  // The routes
  const app = express(); app.use(express.json({ limit: '2mb' }));
  mountBankApi(app, store, { trades: () => ['plumber'] });
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const call = (p, opts = {}) => new Promise((resolve, reject) => { const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: p, method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' } }, res => { let b = ''; res.on('data', d => { b += d; }); res.on('end', () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : null })); }); req.on('error', reject); if (opts.body) req.write(JSON.stringify(opts.body)); req.end(); });
  try {
    const l = await call('/api/blog-bank');
    chk('GET /api/blog-bank lists the banks with the trades asked for (the approved file bank kept its row; landscaper is the real run file)', l.status === 200 && l.body.banks.map(b => b.trade).join() === 'landscaper,plumber,roofer,zz-fixture-trade,zz-paste-trade', l.body && l.body.banks.map(b => b.trade).join(), '');
    const g = await call('/api/blog-bank/zz-paste-trade');
    chk('GET one bank: the state, the text and the parsed topics', g.status === 200 && g.body.topics.length === 5 && /## 1\. TOPICS/.test(g.body.text) && g.body.ranked.length === 5, JSON.stringify([g.body.topics.length, g.body.ranked]), '');
    const prep = await call('/api/blog-bank/zz-paste-trade/paa-report');
    chk('GET the People also ask report (its text and counts); 404 in words for a trade with none', prep.status === 200 && /PEOPLE ALSO ASK REPORT/.test(prep.body.text) && prep.body.kept > 0 && (await call('/api/blog-bank/plumber/paa-report')).status === 404, JSON.stringify(prep).slice(0, 200), '');
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
