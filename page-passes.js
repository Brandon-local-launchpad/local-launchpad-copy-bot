'use strict';

// ── What happens to a page after its first draft (Brandon, 7 Nov 2026) ───────
// One order for every page type. Field retries: BLOCKs and the named flags in validate-v20.js RETRY_FLAGS,
// two rounds at most. The claims review and its rewrites. One combined style pass over every flag left, no
// second round. Hyphens are fixed in code before every check. What is still flagged goes to "Edit before
// publishing" (verdict.js editList). The rubric review only when asked.

const PM = require('./page-models');
const { fixHyphens } = require('./fix-hyphens');
const { stripPromises, sentencesOf } = require('./practice-filter');

// What code puts right before any check: hyphens, and promises the client hasn't confirmed
function cleanPage(record, V) {
  const hyphens = fixHyphens(record, V);
  const removed = stripPromises(record, V);
  if (removed.length && record.meta) record.meta.promises_removed = [...(record.meta.promises_removed || []), ...removed];
  return hyphens;
}

const plainWords = s => String(s || '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').toLowerCase().replace(/[^a-z0-9£' ]+/g, ' ').replace(/\s+/g, ' ').trim();

// The field with the style pass's change to the quoted sentence undone. Sentences both versions share stay;
// the stretch that changed around the quote goes back to what it was. Null when the quote isn't in a changed sentence
function revertSentence(before, after, quote) {
  const a = sentencesOf(before), b = sentencesOf(after);
  const same = (x, y) => plainWords(x) === plainWords(y);
  // Longest common run of sentences
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = same(a[i], b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const hunks = [];
  let i = 0, j = 0, cur = null;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && same(a[i], b[j])) { if (cur) { hunks.push(cur); cur = null; } i++; j++; continue; }
    cur = cur || { aFrom: i, aTo: i, bFrom: j, bTo: j };
    if (j < b.length && (i >= a.length || L[i][j + 1] >= L[i + 1][j])) { j++; cur.bTo = j; } else { i++; cur.aTo = i; }
  }
  if (cur) hunks.push(cur);
  const q = plainWords(quote);
  const at = b.findIndex(s => plainWords(s).includes(q));
  if (at < 0) return plainWords(before).includes(q) ? null : before; // the quote spans sentences: the whole field goes back
  const hunk = hunks.find(h => at >= h.bFrom && at < h.bTo);
  if (!hunk) return null; // the sentence is the same as it was: the style pass didn't add this
  return [...b.slice(0, hunk.bFrom), ...a.slice(hunk.aFrom, hunk.aTo), ...b.slice(hunk.bTo)].join('').trim();
}

async function runPagePasses({ record, V, retrySystem, callModel, modelConfig, validate, claimsReview = true, qualityReview = false, qualityRounds = 3, D, cv, niche, generatedAt }) {
  const R = require('./v20-retry');
  const { runRetries, runClaimRetries, runQualityRetries, runStylePass, validationSummary } = R;
  // A rewrite can bring a hyphen back: every check reads the page with hyphens fixed
  const check = rec => { cleanPage(rec, V); return validate(rec); };
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
      // The full claims check on what the pass changed. A sentence where the pass added a claim goes back to its
      // version from before the pass; a finding on a sentence it didn't change stays for a person to accept
      const claims = await claimsOf()(record);
      const { modelFields, setField } = require('./validate-v20');
      const changed = new Map(sp.log.filter(e => e.kept).map(e => [e.field, e]));
      const reverted = [];
      const remaining = [];
      for (const f of claims.findings) {
        const e = changed.get(f.field);
        const field = e && modelFields(record).find(x => x.label === f.field);
        const back = field ? revertSentence(e.before, field.text, f.quote) : null;
        if (back == null) { remaining.push(f); continue; }
        const blocksBefore = check(record).filter(i => i.type === 'BLOCK').length;
        const was = field.text;
        setField(record, field.ref, back);
        if (check(record).filter(i => i.type === 'BLOCK').length > blocksBefore) { setField(record, field.ref, was); remaining.push(f); continue; }
        reverted.push({ field: f.field, quote: f.quote, why: f.why });
      }
      record.meta.style_pass.claims_found = claims.findings.length;
      record.meta.style_pass.claims_reverted = reverted;
      record.CLAIMS = { ...(record.CLAIMS || {}), at: claims.at, status: remaining.length ? 'needs acceptance' : 'clear', findings: remaining };
      record.VALIDATION = validationSummary(check(record), record.VALIDATION.retries, retryUsage);
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

module.exports = { runPagePasses, revertSentence, cleanPage };
