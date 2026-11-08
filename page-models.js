'use strict';

// ── Model and effort per page type (6 Nov 2026) ──────────────────────────────
// page-models.json is the one place to set them. forPage(type) gives { model, effort, block_rewrite }.
// retryCaller builds the callRetry every generator hands to v20-retry.js: a field carrying a BLOCK goes
// to block_rewrite when the page type has one, everything else stays on the writer.

const config = require('./page-models.json');
const PAGE_TYPES = ['homepage', 'category', 'service', 'location'];

function forPage(type) {
  if (!PAGE_TYPES.includes(type)) throw new Error(`No model config for page type "${type}".`);
  return { block_rewrite: null, ...config[type] };
}
const judge = () => ({ ...config.judge });
// The Google review reply drafts (reviews/draft.js)
const reviews = () => ({ ...config.reviews });

function retryCaller(callModel, system, modelConfig, maxTokens = 2048) {
  const rewrite = modelConfig && modelConfig.block_rewrite;
  return ({ message, hasBlock = false }) => callModel({ system, message, maxTokens, ...(hasBlock && rewrite ? { model: rewrite.model, effort: rewrite.effort } : {}) });
}

module.exports = { forPage, judge, reviews, retryCaller, PAGE_TYPES };
