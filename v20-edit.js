'use strict';

// ── Hand edits to a v20 homepage (Stage 10, slice 5) ─────────────────────────
// A person can rewrite the prose the model wrote (modelFields); what code decides
// (H1, headings, FAQ questions, card names, buttons, links) stays locked. An edit
// is saved as a new version: the full validator runs on the whole page, then the
// claims review, and the new version gets its own VALIDATION and CLAIMS. No
// automatic retries: a person's words are never rewritten.
// Claims accepted on the previous version carry over when the field wasn't
// touched and the quote is the same; a finding on an untouched field that the
// previous version didn't have is marked "new on unchanged text".

const { validateV20, modelFields, setField, wordCount, RANGES } = require('./validate-v20');
const { validationSummary } = require('./v20-retry');
const { versionOf } = require('./v20-record');

const NEW_ON_UNCHANGED = 'new on unchanged text';
const norm = s => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
const claimKey = (field, quote) => `${field}\u0000${norm(quote)}`;
const tidy = t => String(t == null ? '' : t).replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
const stable = o => JSON.stringify(Object.keys(o || {}).sort().map(k => [k, o[k]]));

// The fields a person can edit, in page order, with their word ranges
function editableFields(record) {
  if (!record || record.blocked) return [];
  return modelFields(record).map(f => {
    const r = RANGES[f.rangeKey] || null;
    return { field: f.label, text: f.text, words: wordCount(f.text), range: r ? { min: r.min || 0, max: r.max, label: r.label } : null };
  });
}

// Mark the claims a person has accepted on a version (quotes must be findings of it)
function withAccepted(record, quotes, at = new Date().toISOString()) {
  const C = record.CLAIMS;
  if (!C || !Array.isArray(C.findings)) throw new Error('This version has no claims review to accept.');
  const wanted = new Set((quotes || []).map(norm));
  const known = new Set(C.findings.map(f => norm(f.quote)));
  const stray = [...wanted].filter(q => !known.has(q));
  if (stray.length) throw new Error(`Not a finding on this version: "${stray[0]}".`);
  const before = new Map((C.accepted || []).map(a => [claimKey(a.field, a.quote), a]));
  const accepted = C.findings.filter(f => wanted.has(norm(f.quote))).map(f => before.get(claimKey(f.field, f.quote)) || { field: f.field, quote: f.quote, at });
  return { ...record, CLAIMS: { ...C, accepted } };
}

// Apply edits [{ field, text }] to a copy of the record. Returns the copy and the changed fields.
function applyEdits(record, edits) {
  if (!Array.isArray(edits) || !edits.length) throw new Error('No edits sent.');
  const next = JSON.parse(JSON.stringify(record));
  const fields = new Map(modelFields(next).map(f => [f.label, f]));
  const changed = [];
  for (const e of edits) {
    const f = fields.get(e && e.field);
    if (!f) throw new Error(`"${e && e.field}" can't be edited. Headings, FAQ questions, card names, buttons and links are set by code: change the client values and regenerate.`);
    const text = tidy(e.text);
    if (text === tidy(f.text)) continue;
    setField(next, f.ref, text);
    if (!changed.includes(f.label)) changed.push(f.label);
  }
  if (!changed.length) throw new Error('Nothing changed.');
  return { next, changed };
}

// The claims result for an edited version, with acceptances carried over from the previous one
function carryClaims(review, previous, changed, version) {
  const P = previous.CLAIMS || {};
  const prevFound = new Set((P.findings || []).map(f => claimKey(f.field, f.quote)));
  const prevAccepted = new Map((P.accepted || []).map(a => [claimKey(a.field, a.quote), a]));
  const accepted = [];
  const findings = review.findings.map(f => {
    const k = claimKey(f.field, f.quote);
    if (changed.includes(f.field)) return { ...f, on_edited_field: true };
    if (prevAccepted.has(k)) {
      accepted.push({ field: f.field, quote: f.quote, at: prevAccepted.get(k).at, carried_from: versionOf(previous) });
      return { ...f, carried: true };
    }
    if (!prevFound.has(k)) return { ...f, note: NEW_ON_UNCHANGED };
    return f;
  });
  const open = findings.length - accepted.length;
  return {
    for: version, at: review.at, model: review.model, source: 'hand edit',
    status: !findings.length ? 'clear' : open ? 'needs acceptance' : 'accepted',
    first_review: findings.length, findings, accepted, rounds: [],
    usage: review.usage || null,
  };
}

// Put CLAIMS straight after VALIDATION, where generation puts it
function placeClaims(record, CLAIMS) {
  const { CLAIMS: _old, ...rest } = record;
  const out = {};
  for (const [k, v] of Object.entries(rest)) { out[k] = v; if (k === 'VALIDATION') out.CLAIMS = CLAIMS; }
  if (!('CLAIMS' in out)) out.CLAIMS = CLAIMS;
  return out;
}

// The whole edit. `current` is what the client's values and decisions are now:
// { V, clientValues, decisionsBlock }. `review(record)` runs the claims review.
// Returns { previous (with its acceptances saved), record (the new version), changed }.
async function editRecord({ record, isLatest, edits, accepted, current, review, now = new Date().toISOString() }) {
  if (!record || record.blocked) throw new Error('This version was blocked by the gates, so there is nothing to edit. Fix the gates and regenerate.');
  if (!isLatest) throw new Error('A newer version of this page exists. Edit the latest version.');
  const meta = record.meta || {};
  if (!meta.client_values || stable(meta.client_values) !== stable(current.clientValues) || (meta.decisions_block || null) !== (current.decisionsBlock || null)) {
    throw new Error('The client values or the page decisions have changed since this version was written, so the edit can\'t be checked against the facts the page was written from. Regenerate the page instead.');
  }
  const previous = accepted && record.CLAIMS && Array.isArray(record.CLAIMS.findings) ? withAccepted(record, accepted, now) : record;
  const { next, changed } = applyEdits(previous, edits);
  next.meta = {
    ...meta,
    edited_at: now,
    edited_fields: changed,
    edit_history: [...(meta.edit_history || []), { at: now, from: versionOf(record), fields: changed }],
  };
  next.VALIDATION = { ...validationSummary(validateV20(next, current.V), [], null), source: 'hand edit' };
  let CLAIMS;
  try {
    CLAIMS = carryClaims(await review(next), previous, changed, versionOf(next));
  } catch (e) {
    // The edit is still saved; the push refuses until the review is run again
    CLAIMS = { for: versionOf(next), status: 'failed', error: e.message, findings: [], source: 'hand edit' };
  }
  return { previous, record: placeClaims(next, CLAIMS), changed };
}

module.exports = { editableFields, withAccepted, applyEdits, carryClaims, placeClaims, editRecord, NEW_ON_UNCHANGED };
