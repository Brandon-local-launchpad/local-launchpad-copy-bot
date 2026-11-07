'use strict';

// ── The verdict and the edit list (Brandon, copy quality 5 and 7) ─────────────
// Has a BLOCK: a BLOCK is what stops the page.
// Needs another run: no BLOCK, but a failed code item after the passes.
// Ready to edit: neither. A page with only claims to accept and an edit list is ready for the human edit.
// Claims to accept are shown beside the verdict and never change it (claims_open).
// Judge failures don't gate. They go on the edit list ("Edit before publishing"), each with the
// exact sentence and the reviewer's reason, and so does a field the targeted round could not clear.
// The score stays for tracking only.
const { modelFields, helpers } = require('./validate-v20');
const { sentences } = helpers;

// The code items the targeted round rewrites, on top of every BLOCK
const TARGET_ITEMS = ['Y2', 'P3', 'P4', 'P5', 'F1', 'Y11', 'Y12', 'K1', 'I1', 'S7', 'B3'];
// Style items: they go to "Edit before publishing" and never gate the verdict (Brandon, 7 Nov 2026)
const STYLE_ITEMS = new Set(['Y2', 'Y3', 'V2', 'P3', 'P4', 'P5', 'F1', 'Y11', 'Y12']);
const LABEL = { ready: 'Ready to edit', block: 'Has a BLOCK', run: 'Needs another run' };

// How many claims a person still has to accept: a count, or 1 when the review failed or only the mark sheet is known
function openClaims(claims, failures) {
  if (claims) {
    if (claims.status === 'failed') return 1;
    const accepted = new Set((claims.accepted || []).map(a => a.quote));
    return (claims.findings || []).filter(f => !accepted.has(f.quote)).length;
  }
  return failures.some(i => i.id === 'C9') ? 1 : 0;
}

function verdictFor({ block = 0, failures = [], claims = null } = {}) {
  const failed = (failures || []).filter(i => i && i.pass !== true);
  const open = openClaims(claims, failed);
  const code = failed.filter(i => i.by === 'code' && i.id !== 'C9' && !STYLE_ITEMS.has(i.id));
  const judge = failed.filter(i => i.by !== 'code');
  const state = block > 0 ? 'block' : code.length ? 'run' : 'ready';
  const reasons = [];
  if (block > 0) reasons.push(`${block} BLOCK`);
  if (code.length) reasons.push(`${code.length} failed code item${code.length === 1 ? '' : 's'} (${code.map(i => i.id).join(', ')})`);
  return { state, label: LABEL[state], ready: state === 'ready', block, claims_open: open, claims_clear: open === 0, code_failed: code.map(i => i.id), judge_failed: judge.map(i => i.id), reasons };
}

function verdictLine(v) {
  if (!v) return '';
  const claims = v.claims_open ? `; ${v.claims_open} claim${v.claims_open === 1 ? '' : 's'} to accept` : '';
  return v.state === 'ready' ? `READY TO EDIT${claims}` : `${v.label.toUpperCase()}: ${v.reasons.join('; ')}${claims}`;
}

// ── Finding the sentence ──────────────────────────────────────────────────────
const plain = (text, values = {}) => String(text || '')
  .replace(/\[CV: ([a-z0-9_]+)\]/g, (m, k) => (values[k] != null && values[k] !== '' ? values[k] : m))
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
const wordsOf = s => String(s || '').toLowerCase().replace(/[^a-z0-9£' ]+/g, ' ').split(/\s+/).filter(Boolean);

// The whole sentence a quote comes from, and its field; null when the page's fields don't hold it
function locate(record, quote, field = null) {
  const want = wordsOf(plain(quote));
  if (!want.length) return null;
  const joined = ` ${want.join(' ')} `;
  const values = (record.meta && record.meta.client_values) || {};
  const all = modelFields(record);
  const fields = field ? [...all.filter(f => f.label === field), ...all.filter(f => f.label !== field)] : all;
  for (const f of fields) {
    const text = plain(f.text, values);
    for (const s of sentences(text)) if (` ${wordsOf(s).join(' ')} `.includes(joined)) return { field: f.label, sentence: s.trim() };
    if (` ${wordsOf(text).join(' ')} `.includes(joined)) return { field: f.label, sentence: plain(quote).trim() };
  }
  // The quote with a client value or a small change in it: most of its words in one sentence
  let best = null;
  for (const f of fields) {
    for (const s of sentences(plain(f.text, values))) {
      const have = new Set(wordsOf(s));
      const share = want.filter(w => have.has(w)).length / want.length;
      if (share >= 0.8 && want.length >= 4 && (!best || share > best.share)) best = { field: f.label, sentence: s.trim(), share };
    }
  }
  return best ? { field: best.field, sentence: best.sentence } : null;
}

// What the reviewer's reason holds: "quote": why
function splitReason(reason) {
  const text = String(reason || '');
  if (text.startsWith('"')) {
    const end = text.indexOf('":');
    if (end > 0) return { quote: text.slice(1, end), why: text.slice(end + 2).trim() };
  }
  return { quote: '', why: text };
}

// A validator message usually quotes the words it objects to
function quoteOfMessage(message) {
  const m = String(message || '').match(/"([^"]{4,})"/);
  return m ? m[1].replace(/…$/, '') : '';
}

// The edit list. judge: the failed judge items. codeFailed: the failed code items with their issues
// ([{ id, issues }]). A BLOCK no code item names is listed under its own check. A judge sentence a
// person has since edited away drops off.
function editList({ record, issues = [], judge = [], codeFailed = [] }) {
  const out = [];
  const seen = new Set();
  const add = e => { const k = `${e.field}|${e.reason}`; if (!seen.has(k)) { seen.add(k); out.push(e); } };
  const codeEntry = (item, i) => {
    const where = quoteOfMessage(i.message) ? locate(record, quoteOfMessage(i.message), i.field) : null;
    add({ kind: 'code', item, field: i.field || null, sentence: where && where.field === i.field ? where.sentence : null, reason: i.message });
  };
  const named = new Set();
  for (const c of codeFailed) for (const i of c.issues || []) { named.add(i); codeEntry(c.id, i); }
  // A BLOCK, and any flag the style pass left, under its own check
  for (const i of issues) if ((i.type === 'BLOCK' || i.type === 'FLAG') && !named.has(i)) codeEntry(i.check, i);
  const edited = !!(record.meta && record.meta.edited_at);
  for (const j of judge) {
    for (const r of j.reasons || []) {
      const { quote, why } = splitReason(r);
      const where = quote ? locate(record, quote) : null;
      if (quote && !where && edited) continue;
      add({ kind: 'judge', item: j.id, field: where ? where.field : null, sentence: where ? where.sentence : (quote || null), reason: why });
    }
  }
  return out;
}

function editListLines(list) {
  return (list || []).map(e => `- ${e.item}${e.field ? ` · ${e.field}` : ''}${e.sentence ? `: "${e.sentence}"` : ': the whole field'} ${e.reason}`);
}

// ── The verdict as the page stands now, for the page view ─────────────────────
function liveVerdict({ record, issues }) {
  const { codeFailuresFromIssues, codeItemsFor } = require('./quality-review');
  const Q = record.QUALITY && record.QUALITY.status !== 'failed' ? record.QUALITY : null;
  const list = issues || (record.VALIDATION && record.VALIDATION.issues) || [];
  const fromIssues = codeFailuresFromIssues(record, list);
  const items = codeItemsFor(record);
  // A code item decided from the page's decisions, not its issues, stands as the review found it
  const stored = ((Q && Q.failures) || []).filter(f => f.by === 'code' && f.id !== 'C9' && !fromIssues.some(x => x.id === f.id) && items[f.id] && items[f.id].decisions && !items[f.id].range && (f.reasons || []).some(r => !r.includes(' · ')));
  const judge = ((Q && Q.failures) || []).filter(f => f.by !== 'code');
  const block = list.filter(i => i.type === 'BLOCK').length;
  const v = verdictFor({ block, failures: [...fromIssues, ...stored, ...judge], claims: record.CLAIMS || { status: 'failed', findings: [] } });
  return { ...v, reviewed: !!Q, edit_list: editList({ record, issues: list, judge, codeFailed: fromIssues }) };
}

// The reader views: worked out from the record, so an older record reads in today's wording
function verdictOfRecord(record) {
  const Q = record && record.QUALITY;
  if (!Q || Q.status === 'failed') return null;
  return verdictFor({ block: (record.VALIDATION && record.VALIDATION.block) || 0, failures: Q.failures || [], claims: record.CLAIMS || null });
}

module.exports = { verdictFor, verdictLine, verdictOfRecord, liveVerdict, editList, editListLines, locate, TARGET_ITEMS, STYLE_ITEMS, LABEL };
