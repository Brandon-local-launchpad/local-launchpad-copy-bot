'use strict';

// ── The Message Batches API behind the callModel interface (7 Nov 2026) ──────
// makeBatchCallModel(client, defaultModel, opts) → callModel({ system, message, maxTokens, model, effort }),
// the same shape as anthropic-call.js, at half price. Calls are held until none has arrived for debounceMs,
// then go up as one batch; each caller gets its own answer when the batch ends. A generator's retry round
// across many pages therefore becomes one batch. Live single page generation never uses this.
//
// Differences from anthropic-call.js, all because the API requires them:
//  - no refusal fallback: the fallbacks parameter is rejected on batches, so a refusal is an error
//  - cache breakpoints take the 1 hour TTL: a batch can outlast the 5 minute cache

const { is55 } = require('./anthropic-call');
const POLL_MS = 15000;
const DEBOUNCE_MS = 3000;
const hourTtl = system => (Array.isArray(system) ? system.map(b => (b.cache_control ? { ...b, cache_control: { type: 'ephemeral', ttl: '1h' } } : b)) : system);

function makeBatchCallModel(client, defaultModel, { defaultEffort = 'medium', onUsage = null, onBatch = null, pollMs = POLL_MS, debounceMs = DEBOUNCE_MS } = {}) {
  let queue = [];
  let timer = null;
  let seq = 0;

  async function flush() {
    timer = null;
    const items = queue;
    queue = [];
    if (!items.length) return;
    const started = Date.now();
    try {
      const batch = await client.messages.batches.create({ requests: items.map(i => ({ custom_id: i.id, params: i.params })) });
      let state = batch;
      while (state.processing_status !== 'ended') {
        await new Promise(res => setTimeout(res, pollMs));
        state = await client.messages.batches.retrieve(batch.id);
      }
      if (onBatch) onBatch({ id: batch.id, requests: items.length, ms: Date.now() - started, counts: state.request_counts });
      const byId = new Map(items.map(i => [i.id, i]));
      for await (const row of await client.messages.batches.results(batch.id)) {
        const item = byId.get(row.custom_id);
        if (!item) continue;
        byId.delete(row.custom_id);
        item.settle(row.result);
      }
      for (const item of byId.values()) item.fail(new Error(`Batch ${batch.id} returned no result for ${item.id}.`));
    } catch (e) {
      for (const item of items) item.fail(e);
    }
  }

  function enqueue(params) {
    return new Promise((resolve, reject) => {
      queue.push({ id: `r${++seq}`, params, settle: resolve, fail: reject });
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, debounceMs);
    });
  }

  return async function callModel({ system, message, maxTokens = 8192, model = defaultModel, effort = defaultEffort, loweredFrom = null }) {
    const params = { model, max_tokens: is55(model) ? Math.max(maxTokens * 4, 16000) : maxTokens, system: hourTtl(system), messages: [{ role: 'user', content: message }], ...(is55(model) ? { output_config: { effort } } : {}) };
    const result = await enqueue(params);
    if (result.type !== 'succeeded') throw new Error(`Batch request ${result.type}: ${(result.error && (result.error.message || (result.error.error && result.error.error.message))) || 'no detail'}`);
    const r = result.message;
    if (r.stop_reason === 'refusal') throw new Error(`${model} declined the request (${(r.stop_details || {}).category || 'no category'}).`);
    const text = r.content.map(c => (c.type === 'text' ? c.text : '')).join('');
    const usage = {
      input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens,
      cache_read_input_tokens: r.usage.cache_read_input_tokens || 0,
      cache_creation_input_tokens: r.usage.cache_creation_input_tokens || 0,
      stop_reason: r.stop_reason, model: r.model || model,
      requested_model: model, effort, lowered_from: loweredFrom, rate_limit_waits: 0, raw_usage: r.usage, batch: true,
    };
    if (r.stop_reason === 'max_tokens' && !text) {
      if (onUsage) onUsage(model, usage);
      if (effort !== 'low') {
        const again = await callModel({ system, message, maxTokens, model, effort: 'low', loweredFrom: effort });
        again.usage.spent_attempt = usage;
        return again;
      }
      throw new Error(`${model} used all ${params.max_tokens} tokens without writing an answer.`);
    }
    if (onUsage) onUsage(model, usage);
    return { text, usage };
  };
}

module.exports = { makeBatchCallModel };
