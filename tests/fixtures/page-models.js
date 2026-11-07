'use strict';
// page-models.js: the writer per page type, the BLOCK rewrite route, and the billed attempt when a
// model thinks until it runs out (anthropic-call.js). No network.
const PM = require('../../page-models');
const { makeCallModel } = require('../../anthropic-call');

let pass = 0, fail = 0;
const chk = (name, ok, got = '') => { if (ok) pass++; else { fail++; console.log(`  ✗ ${name} ${got}`); } };

(async () => {
  for (const t of PM.PAGE_TYPES) { const c = PM.forPage(t); chk(`${t} has a model and an effort`, !!c.model && !!c.effort && 'block_rewrite' in c, JSON.stringify(c)); }
  chk('The judge has a model and an effort', !!PM.judge().model && !!PM.judge().effort);
  let threw = false; try { PM.forPage('blog'); } catch (_) { threw = true; }
  chk('An unknown page type is refused', threw);

  const seen = [];
  const fake = async a => { seen.push(a); return { text: 'x', usage: {} }; };
  const plain = PM.retryCaller(fake, 'SYS', { model: 'w', effort: 'medium', block_rewrite: null });
  await plain({ message: 'm', hasBlock: true });
  chk('No block_rewrite: a BLOCK stays on the writer', !('model' in seen[0]) && seen[0].maxTokens === 2048 && seen[0].system === 'SYS', JSON.stringify(seen[0]));
  const hybrid = PM.retryCaller(fake, 'SYS', { model: 'w', effort: 'medium', block_rewrite: { model: 'strong', effort: 'medium' } });
  await hybrid({ message: 'm', hasBlock: true });
  chk('block_rewrite: a BLOCK goes to it', seen[1].model === 'strong' && seen[1].effort === 'medium', JSON.stringify(seen[1]));
  await hybrid({ message: 'm', hasBlock: false });
  await hybrid({ message: 'm' });
  chk('block_rewrite: anything else stays on the writer', !('model' in seen[2]) && !('model' in seen[3]));

  const asked = [], logged = [];
  const client = { beta: { messages: { create: async p => {
    asked.push(p.output_config.effort);
    return p.output_config.effort === 'low'
      ? { content: [{ type: 'text', text: 'page' }], stop_reason: 'end_turn', model: p.model, usage: { input_tokens: 10, output_tokens: 20 } }
      : { content: [], stop_reason: 'max_tokens', model: p.model, usage: { input_tokens: 10, output_tokens: 48000 } };
  } } } };
  const call = makeCallModel(client, 'claude-haiku-5-5', { defaultEffort: 'high', onUsage: (m, u) => logged.push(u) });
  const r = await call({ system: 's', message: 'm' });
  chk('Ran out at high: asked again at low', asked.join() === 'high,low' && r.text === 'page', asked.join());
  chk('The spent attempt travels on the answer', r.usage.spent_attempt && r.usage.spent_attempt.output_tokens === 48000 && r.usage.lowered_from === 'high', JSON.stringify(r.usage));
  chk('Both attempts are logged as spend', logged.length === 2 && logged[0].output_tokens === 48000, JSON.stringify(logged));

  const { parseRetryReply } = require('../../v20-retry');
  chk('A reply that copies the RETURN line keeps only the copy', parseRetryReply('RETURN: faq_answer: It depends on the lawn.', { key: 'faq_items', index: 0, sub: 'faq_answer' }) === 'It depends on the lawn.');
  chk('A plain labelled reply still parses', parseRetryReply('svc_hero_intro: Lawn mowing.', { key: 'svc_hero_intro' }) === 'Lawn mowing.');

  // Hyphens in code
  const { fixText } = require('../../fix-hyphens');
  const keep = w => w === 'lee-on-the-solent' || w === 'family-run';
  chk('A hyphen goes in code', fixText('A well-drained lawn', keep) === 'A well drained lawn');
  chk('A prefix joins from the list, otherwise waits', fixText('We re-seed it, then re-lay it', keep) === 'We reseed it, then re-lay it', fixText('We re-seed it, then re-lay it', keep));
  chk('Links, tokens, places and client values are left', fixText('[Lee-on-the-Solent](/a-b) and [CV: x-y], a family-run firm in Stoke-on-Trent', keep) === '[Lee-on-the-Solent](/a-b) and [CV: x-y], a family-run firm in Stoke-on-Trent', fixText('[Lee-on-the-Solent](/a-b) and [CV: x-y], a family-run firm in Stoke-on-Trent', keep));

  // The hard blocks
  const { hardChecks } = require('../../validate-hard');
  const hard = (text, extra = {}) => { const out = []; hardChecks({ FLAGS: [], ...(extra.record || {}) }, { cv: { start_time: 'same week' }, D: extra.D || {} }, { issue: (type, check) => out.push(check), fields: [{ label: 'f', ref: { key: 'f' }, text, rangeKey: extra.rangeKey || 'f' }] }); return out; };
  chk('LABEL-LEAK: RETURN, card, block4', ['RETURN: faq_answer: Yes.', 'card: It shifts.', 'block4 card_body: It shifts.'].every(t => hard(t).includes('LABEL-LEAK')));
  chk('LABEL-LEAK: a business card is fine', !hard('We hand over a card with the date on it.').includes('LABEL-LEAK'));
  chk('TRUNCATED: a field that stops', hard('We can start and we').includes('TRUNCATED') && !hard('We can start.').includes('TRUNCATED'));
  chk('TRUNCATED: a tick item has no full stop', !hard('Lawn edges cut', { rangeKey: 'item_text' }).includes('TRUNCATED'));
  chk('RAW-VALUE: going by', hard('We book the first visit, going by [CV: start_time].').includes('RAW-VALUE'));
  chk('RAW-VALUE: "the" before the value passes', !hard('We can usually start the [CV: start_time].').includes('RAW-VALUE'));
  chk('SECTION-REF: internal words', hard('The sibling pages cover those jobs.').includes('SECTION-REF'));
  chk('SECTION-REF: a heading quoted', hard('What Affects the Cost of Gardening explains it.', { record: { x_h2: 'What Affects the Cost of Gardening' } }).includes('SECTION-REF'));
  chk('ANCHOR-FORCED: after "in", down a list', hard('We work in [lawn mowing in Hedge End](/a), [lawn mowing in Romsey](/b) too.').includes('ANCHOR-FORCED'));
  chk('ANCHOR-FORCED: town alone, and a sentence that reads, pass', !hard('We work in [Romsey](/a) and do [lawn mowing in Hedge End](/b) too.').includes('ANCHOR-FORCED'));
  chk('LINK-MAP: off the map', hard('See [it](/nope).', { D: { pageMapUrls: ['/yes'] } }).includes('LINK-MAP') && !hard('See [it](/yes).', { D: { pageMapUrls: ['/yes'] } }).includes('LINK-MAP'));
  chk('LINK-MAP: an unbuilt location page', hard('We work in [Fareham](/locations/fareham).', { D: { pageMapUrls: ['/locations/fareham'], unbuiltLocationUrls: ['/locations/fareham'] } }).includes('LINK-MAP'));
  chk('EMPTY-SECTION: a list that came back empty', hard('Fine.', { record: { FLAGS: [{ code: 'P-COUNT', msg: 'x: expected 3 item(s), got 0.' }] } }).includes('EMPTY-SECTION'));

  // Only a built location page links
  const { isBuiltLocation } = require('../../page-map/generator');
  chk('A location page counts as built once pushed or live', isBuiltLocation({ type: 'location', status: 'Pushed to WordPress' }) && isBuiltLocation({ type: 'location', status: 'Live' }) && !isBuiltLocation({ type: 'location', status: 'H1 Added' }) && !isBuiltLocation({ type: 'location', status: 'Not Started' }));

  // An unbuilt launch location: no link, plain in the areas list, and the hero keeps it
  {
    const { computeDecisions } = require('../../decisions');
    const { contextFromPageMap } = require('../../v20-context-v3');
    const E = require('./data/edens-edge-acceptance.js');
    const { rows } = require('./data/edens-edge-v3-page-map.json');
    const niche = { ...require('../../niche-library/landscaper.json'), service_words: [] };
    const cv = { ...E.ethanValues(), h1_override: 'Landscaper Southampton', coastal_city: 'yes' };
    const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Hedge End'] };
    const unbuilt = rows.map(r => (r.type === 'location' ? { ...r, status: 'H1 Added' } : r));
    const ctx = contextFromPageMap({ rows: unbuilt, hand, cv, niche });
    const D = computeDecisions({ cv, niche, pages: ctx.pages, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, v20TestMode: true, allocationData: null, faqResearch: [], cardServices: ctx.cardServices }).decisions;
    chk('Unbuilt: no location page is linkable', !D.linkablePages.some(p => p.type === 'location') && !D.d12_areas.linked.length, JSON.stringify(D.d12_areas.linked));
    chk('Unbuilt: the hero keeps a launch town, without a link', D.d14_town && D.d14_town.name === 'Romsey' && !D.d14_town.url, JSON.stringify(D.d14_town));
    chk('Unbuilt: its address is known to the check', D.unbuiltLocationUrls.includes('/locations/romsey'));
  }

  // Batch mode is full site builds only: nothing in the live app reaches it
  {
    const fs = require('fs'), path = require('path');
    const root = path.join(__dirname, '..', '..');
    chk('Batch mode: not wired into the live app', ['server.js', 'category-run.js', 'service-run.js', 'location-run.js', 'v20-generate.js', 'page-passes.js'].every(f => !fs.readFileSync(path.join(root, f), 'utf8').includes('batch-call')));
  }

  // The style pass's claims go back a sentence at a time
  {
    const { revertSentence } = require('../../page-passes');
    const before = 'The grass is cut. The edges are tidied. It looks neat.';
    chk('Revert: the changed sentence goes back, the rest stays', revertSentence(before, 'The grass is cut. We guarantee perfect edges. It looks neat.', 'guarantee perfect edges') === before, revertSentence(before, 'The grass is cut. We guarantee perfect edges. It looks neat.', 'guarantee perfect edges'));
    chk('Revert: only that stretch changes', revertSentence(before, 'The grass is trimmed. The edges are tidied. We guarantee it.', 'guarantee it') === 'The grass is trimmed. The edges are tidied. It looks neat.', revertSentence(before, 'The grass is trimmed. The edges are tidied. We guarantee it.', 'guarantee it'));
    chk('Revert: a sentence the pass did not change is left', revertSentence(before, 'The grass is trimmed. The edges are tidied. It looks neat.', 'edges are tidied') === null);
  }

  // A fixed FAQ answer
  {
    const { setField } = require('../../validate-v20');
    const rec = { faq_items: [{ faq_question: 'Q', fixed: 'Yes, we are insured.', tailored: 'Old.', faq_answer: 'Yes, we are insured. Old.' }] };
    setField(rec, { key: 'faq_items', index: 0, sub: 'tailored' }, 'New.');
    chk('A fixed answer: a rewrite changes only the model sentence', rec.faq_items[0].faq_answer === 'Yes, we are insured. New.', rec.faq_items[0].faq_answer);
    const { practiceClaims } = require('../../practices');
    const niche = require('../../niche-library/landscaper.json');
    const hits = t => practiceClaims(t, niche).map(c => c.practice.key);
    const protect = require('../../niche-library/practices.json').practices.find(p => /protected during/.test(p.label)).key;
    chk('PRACTICE: insurance cover is not protecting the house', !hits('The cover is there for accidental damage to your home.').includes(protect) && !hits('A visit can cover the lawn.').includes(protect));
    chk('PRACTICE: covering the drive still fires', hits('We protect the drive with boards.').includes(protect));
  }

  // Practices: the form, methods, promises
  {
    const PF = require('../../practice-filter');
    const niche = require('../../niche-library/landscaper.json');
    const V = { cv: { confirmed_practices: [] }, niche, tradeFactsText: '', D: {} };
    const rec = t => ({ page: 'service', meta: { page_type: 'service' }, svc_hero_intro: t, included: [], block4: [], steps: [], block5: [], faq_items: [] });
    const r1 = rec('We mow the lawn. We never use subcontractors on a job. The edges are tidied.');
    const gone = PF.stripPromises(r1, V);
    chk('A promise the form does not cover: the sentence goes, the rest stays', r1.svc_hero_intro === 'We mow the lawn. The edges are tidied.' && gone.length === 1, r1.svc_hero_intro);
    const r2 = rec('We strim the edges. We sweep the paths after mowing.');
    chk('A method stays without confirmation, even with "we"', !PF.stripPromises(r2, V).length && r2.svc_hero_intro.includes('strim'), r2.svc_hero_intro);
    const r3 = rec('We never use subcontractors on a job.');
    chk('A field that is only the promise is left for the writer', !PF.stripPromises(r3, V).length && r3.svc_hero_intro.includes('subcontractors'));
    const r4 = rec('We give every quote in writing. It is clear.');
    const confirmed = { ...V, cv: { confirmed_practices: ['written_quote'] } };
    chk('A confirmed practice stays', !PF.stripPromises(r4, confirmed).length);
    const form = PF.formPractices({ stand_out: ['Family-run business, fixed pricing and no hidden costs'], written_quotes: 'no just in person' });
    chk('Form: fixed pricing confirms the price agreed first; "no" confirms nothing', form.map(p => p.key).join() === 'price_agreed_before_work', JSON.stringify(form));
    chk('Form: yes to written quotes confirms them', PF.formPractices({ written_quotes: 'Yes, valid 30 days' }).map(p => p.key).join() === 'written_quote');
    chk('Form: ticks saved by hand stand', PF.withFormPractices({ confirmed_practices: [], _sources: { confirmed_practices: 'hand' } }, { stand_out: ['fixed pricing'] }).confirmed_practices.length === 0);
    chk('Form: added to what is there', PF.withFormPractices({ confirmed_practices: ['strimmer_edges'] }, { stand_out: ['fixed pricing'] }).confirmed_practices.join() === 'strimmer_edges,price_agreed_before_work');
    const kinds = require('../../niche-library/practices.json').practices;
    chk('Every practice has a kind', kinds.every(p => p.kind === 'method' || p.kind === 'promise'), kinds.filter(p => !p.kind).map(p => p.key).join());
    chk('The named promises are promises', ['itemised_quote', 'written_quote', 'no_subcontractors', 'owner_on_every_job', 'site_visit_before_quote'].every(k => kinds.find(p => p.key === k).kind === 'promise'));
  }

  // Trade facts stages and the PRACTICE patterns
  {
    const { practiceClaims } = require('../../practices');
    const niche = require('../../niche-library/landscaper.json');
    const keys = t => practiceClaims(t, niche).map(c => c.practice.key);
    chk('PRACTICE: a visit schedule or a fixed schedule is not regular visits', !keys('None of them sets one visit schedule.').includes('maintenance_schedule') && !keys('There is no fixed schedule.').includes('maintenance_schedule') && keys('You get a regular schedule.').includes('maintenance_schedule'));
    chk('PRACTICE: clearing debris is not taking waste away', !keys('It starts with clearing debris.').includes('waste_removal') && keys('We take all the waste with us.').includes('waste_removal'));
  }

  // Figures with no source
  {
    const { unsourcedFigures } = require('../../wp/claims-review');
    const figs = (text, facts) => { const R = { page: 'service', meta: { page_type: 'service' }, svc_hero_intro: text, included: [], block4: [], steps: [], block5: [], faq_items: [] }; return unsourcedFigures(R, facts).map(f => f.quote); };
    chk('Figures: a range with no source is found', figs('It germinates in 7 to 10 days.', { clientBlock: 'Nothing here.' }).join() === '7 to 10 days', figs('It germinates in 7 to 10 days.', { clientBlock: 'Nothing here.' }).join());
    chk('Figures: the same range in the trade facts passes, in any form', figs('It germinates in 7 to 10 days.', { clientBlock: 'RHS gives about 7–10 days.' }).length === 0);
    chk('Figures: two stray numbers are not a source', figs('It takes 7 to 10 days.', { clientBlock: 'Team of 7. 10 jobs.' }).length === 1);
    chk('Figures: words and digits are the same figure', figs('About two weeks.', { clientBlock: 'within 2 weeks' }).length === 0);
  }

  // Related services
  {
    const n = require('../../niche-library/landscaper.json');
    if (n.related_services) chk('Related: lawn mowing gets your three', n.related_services['lawn mowing'].join() === 'Hedge trimming,Weed control,Lawn seeding', JSON.stringify(n.related_services['lawn mowing']));
  }

  // The retry rule
  const { RETRY_FLAGS } = require('../../validate-v20');
  chk('Style flags and hyphens are off the retry list', ['1b', 'N18', 'N21', 'REPEAT-PAGE', 'PAD-OPENER', 'CARD-PATTERN'].every(c => !RETRY_FLAGS.has(c)) && ['N15', 'N7', 'OUTCOME'].every(c => RETRY_FLAGS.has(c)));
  const { MAX_RETRIES, parseStyleReply } = require('../../v20-retry');
  chk('Two retry rounds at most', MAX_RETRIES === 2);
  const reply = parseStyleReply('FIELD 1: First text.\nFIELD 2: Second\\n\\nthird.', 2);
  chk('The style reply splits by field', reply.get(1) === 'First text.' && reply.get(2) === 'Second\n\nthird.', JSON.stringify([...reply]));

  {
    const { factsFromRecord } = require('../../wp/claims-review');
    chk('The claims review is told methods are not claims', factsFromRecord({ meta: { client_block: 'X' } }).clientBlock.includes('swept after mowing'));
  }

  // The claims review is cached
  const { runClaimsReview } = require('../../wp/claims-review');
  let sentSystem = null, sentMessage = '';
  await runClaimsReview({ home_final_cta_body: 'x', page: 'homepage' }, { clientBlock: 'FACTS' }, async ({ system, message }) => { sentSystem = system; sentMessage = message; return { text: '{"findings":[]}' }; }).catch(() => {});
  chk('The claims prompt and facts are cached, the copy is not', Array.isArray(sentSystem) && !!sentSystem[1].cache_control && sentSystem[1].text.includes('FACTS') && sentMessage.startsWith('PAGE COPY'), JSON.stringify(sentSystem && sentSystem[1]).slice(0, 80));

  console.log(`page-models: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})();
