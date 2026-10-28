'use strict';

// ── Push safety checks ───────────────────────────────────────────────────────
// Run before every push and every dry run. A record is pushable only when all of
// these hold; each failure is a plain reason the dry run shows.
//   - it was generated (no failed gate) and validated, with 0 BLOCK
//   - it uses no stand-in values (N16: watermarked records can't be marked Done)
//   - any remaining FLAGs have been reviewed by a person (reviewed: true)
//   - the target page is a draft, or the site is marked staging (Brandon,
//     14 Oct: drafts and staging only until he says otherwise)
// Not in this slice: the model-judged claims review (next slice).

function checkRecord(record, { reviewed = false } = {}) {
  const refusals = [];
  const V = record.VALIDATION || {};
  if (record.blocked) refusals.push('A gate failed, so there is no page to push.');
  if (V.status === 'failed') refusals.push(`Couldn't check the page with today's rules: ${V.error}`);
  else if (V.status !== 'run') refusals.push('The record has not been validated.');
  else if (V.block > 0) refusals.push(`Validation left ${V.block} BLOCK issue(s). Fix or regenerate before pushing.`);
  const standIns = (record.meta && record.meta.stand_ins) || [];
  if (record.watermark || record.can_mark_done === false || standIns.length) {
    refusals.push(`The page uses stand-in values${standIns.length ? ` (${standIns.join(', ')})` : ''}. Replace them with the client's real values and regenerate.`);
  }
  if (V.status === 'run' && V.flag > 0 && !reviewed) {
    refusals.push(`${V.flag} FLAG issue(s) remain. A person must read the reader view and tick "reviewed" before a push.`);
  }
  return refusals;
}

// kind: 'page' (the target must exist) or 'post' (a missing post is created by the push)
function checkTarget(page, site, label = 'homepage', { kind = 'page' } = {}) {
  const refusals = [];
  if (!page) return kind === 'post' ? [] : [`The ${label} was not found on the site.`];
  if (page.status === 'publish' && !site.staging) {
    refusals.push(`The ${label} on ${site.url} is published. Pushes go to drafts and staging sites only for now.`);
  }
  return refusals;
}

module.exports = { checkRecord, checkTarget };
