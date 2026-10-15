'use strict';

// ── One way to call Claude for v20 (16 Oct) ──────────────────────────────────
// makeCallModel(client, defaultModel) → callModel({ system, message, maxTokens, model, effort })
// returning { text, usage }. Used by the live app and tools/quality-loop.js.
//
// Claude 5.5 models always think; effort is the only control (Sonnet 5.5 at its default
// effort spent 32k tokens thinking on the whole homepage and wrote nothing). They get room
// to think (max_tokens at least 16000), an explicit effort, and the API's refusal fallback.

const is55 = model => /-5-5$/.test(model || '');

function makeCallModel(client, defaultModel, { onUsage = null, defaultEffort = 'medium' } = {}) {
  return async function callModel({ system, message, maxTokens = 8192, model = defaultModel, effort = defaultEffort }) {
    for (let attempt = 0; ; attempt++) {
      try {
        const params = { model, max_tokens: is55(model) ? Math.max(maxTokens * 4, 16000) : maxTokens, system, messages: [{ role: 'user', content: message }] };
        const r = is55(model)
          ? await client.beta.messages.create({ ...params, output_config: { effort }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
          : await client.messages.create(params, { headers: { 'anthropic-beta': 'prompt-caching-2024-07-31' } });
        if (r.stop_reason === 'refusal') throw new Error(`${model} declined the request (${(r.stop_details || {}).category || 'no category'}).`);
        const text = r.content.map(c => (c.type === 'text' ? c.text : '')).join('');
        if (r.stop_reason === 'max_tokens' && !text) {
          // It thought until it ran out: once more at low effort (16 Oct: Opus 5.5 at medium
          // thought through 32k tokens on the whole homepage)
          if (effort !== 'low') return callModel({ system, message, maxTokens, model, effort: 'low' });
          throw new Error(`${model} used all ${params.max_tokens} tokens without writing an answer.`);
        }
        const usage = {
          input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens,
          cache_read_input_tokens: r.usage.cache_read_input_tokens || 0,
          cache_creation_input_tokens: r.usage.cache_creation_input_tokens || 0,
          stop_reason: r.stop_reason, model: r.model || model,
        };
        if (onUsage) onUsage(model, usage);
        return { text, usage };
      } catch (e) {
        if ([429, 500, 529].includes(e.status) && attempt < 4) { await new Promise(res => setTimeout(res, 20000)); continue; }
        throw e;
      }
    }
  };
}

module.exports = { makeCallModel, is55 };
