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

  // The retry rule
  const { RETRY_FLAGS } = require('../../validate-v20');
  chk('Style flags and hyphens are off the retry list', ['1b', 'N18', 'N21', 'REPEAT-PAGE', 'PAD-OPENER', 'CARD-PATTERN'].every(c => !RETRY_FLAGS.has(c)) && ['N15', 'N7', 'OUTCOME'].every(c => RETRY_FLAGS.has(c)));
  const { MAX_RETRIES, parseStyleReply } = require('../../v20-retry');
  chk('Two retry rounds at most', MAX_RETRIES === 2);
  const reply = parseStyleReply('FIELD 1: First text.\nFIELD 2: Second\\n\\nthird.', 2);
  chk('The style reply splits by field', reply.get(1) === 'First text.' && reply.get(2) === 'Second\n\nthird.', JSON.stringify([...reply]));

  // The claims review is cached
  const { runClaimsReview } = require('../../wp/claims-review');
  let sentSystem = null, sentMessage = '';
  await runClaimsReview({ home_final_cta_body: 'x', page: 'homepage' }, { clientBlock: 'FACTS' }, async ({ system, message }) => { sentSystem = system; sentMessage = message; return { text: '{"findings":[]}' }; }).catch(() => {});
  chk('The claims prompt and facts are cached, the copy is not', Array.isArray(sentSystem) && !!sentSystem[1].cache_control && sentSystem[1].text.includes('FACTS') && sentMessage.startsWith('PAGE COPY'), JSON.stringify(sentSystem && sentSystem[1]).slice(0, 80));

  console.log(`page-models: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})();
