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

  console.log(`page-models: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})();
