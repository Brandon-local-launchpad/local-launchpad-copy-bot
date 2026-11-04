'use strict';

// ── The publishable verdict (Brandon, copy quality 4, 4 Nov 2026) ─────────────
// The gate on a page: 0 BLOCK, the claims review clear (C9), no failed code item, and at most 2
// failed judge items, which are listed for a person to read. The 8.5 score stays for tracking
// only. failures: the rubric items that failed, each { id, by: 'code' | 'judge', title, reasons }.
// A BLOCK and a failed code item can be the same fault; the reasons list each only once by kind.
const MAX_JUDGE = 2;

function verdictFor({ block = 0, failures = [] } = {}) {
  const failed = (failures || []).filter(i => i && i.pass !== true);
  const claims = failed.find(i => i.id === 'C9');
  const code = failed.filter(i => i.by === 'code' && i.id !== 'C9');
  const judge = failed.filter(i => i.by !== 'code');
  const reasons = [];
  if (block > 0) reasons.push(`${block} BLOCK`);
  if (claims) reasons.push('claims review not clear (C9)');
  if (code.length) reasons.push(`${code.length} failed code item${code.length === 1 ? '' : 's'} (${code.map(i => i.id).join(', ')})`);
  if (judge.length > MAX_JUDGE) reasons.push(`${judge.length} failed judge items, ${MAX_JUDGE} at most (${judge.map(i => i.id).join(', ')})`);
  return {
    publishable: !reasons.length,
    block,
    claims_clear: !claims,
    code_failed: code.map(i => i.id),
    judge_failed: judge.map(i => ({ id: i.id, title: i.title, reasons: i.reasons || [] })),
    reasons,
  };
}

function verdictLine(v) {
  if (!v) return '';
  if (v.publishable) return `PUBLISHABLE${v.judge_failed.length ? ` (a person reads: ${v.judge_failed.map(j => j.id).join(', ')})` : ''}`;
  return `NOT PUBLISHABLE: ${v.reasons.join('; ')}`;
}

// The reader views: the stored verdict, else one worked out from a record reviewed before this existed
function verdictOfRecord(record) {
  const Q = record && record.QUALITY;
  if (!Q || Q.status === 'failed') return null;
  return Q.verdict || verdictFor({ block: (record.VALIDATION && record.VALIDATION.block) || 0, failures: Q.failures || [] });
}

module.exports = { verdictFor, verdictLine, verdictOfRecord, MAX_JUDGE };
