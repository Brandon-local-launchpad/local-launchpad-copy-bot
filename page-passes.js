'use strict';

// ── What happens to a page after its first draft (Brandon, 7 Nov 2026) ───────
// One order for every page type. Field retries: BLOCKs and the named flags in validate-v20.js RETRY_FLAGS,
// two rounds at most. The claims review and its rewrites. One combined style pass over every flag left, no
// second round. Hyphens are fixed in code before every check. What is still flagged goes to "Edit before
// publishing" (verdict.js editList). The rubric review only when asked.

const PM = require('./page-models');
const { fixHyphens } = require('./fix-hyphens');

async function runPagePasses({ record, V, retrySystem, callModel, modelConfig, validate, claimsReview = true, qualityReview = false, qualityRounds = 3, D, cv, niche, generatedAt }) {
  const R = require('./v20-retry');
  const { runRetries, runClaimRetries, runQualityRetries, runStylePass, validationSummary } = R;
  // A rewrite can bring a hyphen back: every check reads the page with hyphens fixed
  const check = rec => { fixHyphens(rec, V); return validate(rec); };
  const callRetry = PM.retryCaller(callModel, retrySystem, modelConfig);
  const claimsOf = () => {
    const { runClaimsReview, factsFromRecord } = require('./wp/claims-review');
    return rec => runClaimsReview(rec, factsFromRecord(rec), callModel);
  };

  const { log, usage: retryUsage, finalIssues } = await runRetries({ record, V, callRetry, validate: check });
  record.VALIDATION = validationSummary(finalIssues, log, retryUsage);

  if (claimsReview) {
    try {
      const { claims, rounds, first } = await runClaimRetries({ record, V, callRetry, review: claimsOf(), validate: check });
      record.CLAIMS = { for: generatedAt, at: claims.at, status: claims.findings.length ? 'needs acceptance' : 'clear', first_review: first, findings: claims.findings, rounds };
      // The claim rewrites changed fields: one more round on what they broke
      const after = rounds.some(r => r.retries.some(x => x.kept)) ? await runRetries({ record, V, callRetry, maxRetries: 1, validate: check }) : { log: [] };
      record.VALIDATION = validationSummary(check(record), [...log, ...rounds.flatMap(r => r.retries.map(x => ({ ...x, problems: x.claims, source: 'claims' }))), ...after.log.map(x => ({ ...x, round: `after claims ${x.round}` }))], retryUsage);
    } catch (e) {
      // A failed review never loses the page: it's saved, and the push asks for the review again
      record.CLAIMS = { for: generatedAt, status: 'failed', error: e.message, findings: [] };
    }
  }

  // The one style pass, then the claims review reads the text as it now stands
  try {
    const callStyle = ({ message }) => callModel({ system: retrySystem, message, maxTokens: 8000, role: 'style' });
    const sp = await runStylePass({ record, V, callStyle, validate: check });
    record.meta.style_pass = { fields: sp.fields, flags_before: sp.before, flags_after: sp.after, cleared: sp.before - sp.after, kept: sp.kept, rejected: sp.rejected, reason: sp.reason };
    record.VALIDATION = validationSummary(check(record), [...((record.VALIDATION && record.VALIDATION.retries) || []), ...sp.log], retryUsage);
    if (claimsReview && sp.kept) {
      const claims = await claimsOf()(record);
      record.CLAIMS = { ...(record.CLAIMS || {}), at: claims.at, status: claims.findings.length ? 'needs acceptance' : 'clear', findings: claims.findings };
    }
  } catch (e) { record.meta.style_pass = { error: e.message }; }

  if (qualityReview) {
    const Q = require('./quality-review');
    try {
      const { review: rv, rounds: qRounds } = await runQualityRetries({ record, V, callRetry, review: rec => Q.reviewPage({ record: rec, V, D, cv, niche, callModel }), maxRounds: qualityRounds, validate: check });
      record.QUALITY = { at: rv.at, verdict: rv.verdict, edit_list: rv.edit_list, score_writing: rv.score_writing, model: rv.model, score: rv.score, done: rv.done, failed: rv.failed, failures: rv.items.filter(i => !i.pass), other_problems: rv.other_problems, missing_facts: rv.missing_facts, rounds: qRounds };
      if (claimsReview && qRounds.some(r => r.retries.some(x => x.kept))) {
        const { claims, rounds } = await runClaimRetries({ record, V, callRetry, review: claimsOf(), maxRounds: 1, validate: check });
        record.CLAIMS = { ...(record.CLAIMS || {}), at: claims.at, status: claims.findings.length ? 'needs acceptance' : 'clear', findings: claims.findings, rounds: [...((record.CLAIMS || {}).rounds || []), ...rounds.map(r => ({ ...r, round: `after quality ${r.round}` }))] };
      }
      const earlier = (record.VALIDATION && record.VALIDATION.retries) || [];
      record.VALIDATION = validationSummary(check(record), [...earlier, ...qRounds.flatMap(r => r.retries.map(x => ({ ...x, round: `quality ${x.round}`, source: 'quality' })))], retryUsage);
    } catch (e) {
      record.QUALITY = { status: 'failed', error: e.message };
    }
  }
}

module.exports = { runPagePasses };
