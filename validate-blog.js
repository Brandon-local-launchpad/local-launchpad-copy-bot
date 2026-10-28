'use strict';

// ── Blog post validator (Blog CORE (1)) ──────────────────────────────────────
// Stage 3 registers the page type with the shared checks only (validate-v20.js
// validateCommon and sharedCrossChecks keyed on the blog's fields); stage 5 adds the
// blog's own rules, B-N1 to B-N9 and the post type's word ranges.

const { validateCommon, sharedCrossChecks } = require('./validate-v20');
const { LABELS } = require('./page-types/blog');

const KEYS = { hero: LABELS.answer, content: LABELS.answer, finalCta: LABELS.closing, areasIntro: null, moreLine: null, selfUrl: '/' };

function blogValidationContext(base, D) {
  return { ...base, keys: { ...KEYS, selfUrl: (D && D.slug) || '/' } };
}

function validateBlog(record, V) {
  const common = validateCommon(record, V);
  const { issues } = common;
  if (record.blocked) return issues;
  sharedCrossChecks(record, V, common);
  return issues;
}

module.exports = { validateBlog, blogValidationContext, KEYS };
