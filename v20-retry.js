'use strict';

// ── v20 per-field retries (Stage 7, brief §6b) ───────────────────────────────
// After validation, every field with a BLOCK or a retry-eligible FLAG gets one
// follow-up call that rewrites only that field. Re-validate; at most 2 retries per
// field; keep the best version (fewest BLOCKs, then fewest FLAGs) and leave any
// remaining issue for a human. Every attempt is logged in the record.

const fs   = require('fs');
const path = require('path');
const { validateV20, modelFields, getField, setField, summarise, wordCount, RANGES } = require('./validate-v20');

const MAX_RETRIES = 2;
const CONCURRENCY = 4;

function loadRetryPrompt() {
  const text = fs.readFileSync(path.join(__dirname, 'prompts', 'Field_Retry_CORE.md'), 'utf8');
  const cut = text.indexOf('\n---\n');
  return (cut >= 0 ? text.slice(cut + 5) : text).trim();
}

const score = issues => issues.reduce((n, i) => n + (i.type === 'BLOCK' ? 100 : 1), 0);
const clone = o => JSON.parse(JSON.stringify(o));

// The label the model must return, and the range it must hit
function returnLabel(ref) { return ref.sub || ref.key; }
function rangeText(f, D) {
  const r = RANGES[f.rangeKey];
  if (!r) return '';
  if (f.rangeKey === 'home_content_block_body' && D.d13_expands) return '200 to 300 words';
  return `${r.label} words`;
}

function buildRetryMessage(f, problems, record, D) {
  const others = modelFields(record).filter(o => o.label !== f.label).map(o => `${o.label}: ${o.text.replace(/\n\n/g, '\\n\\n')}`);
  return [
    `FIELD: ${f.label}${rangeText(f, D) ? ` (${rangeText(f, D)})` : ''}`,
    '',
    'CURRENT TEXT:',
    f.text.replace(/\n\n/g, '\\n\\n'),
    '',
    'PROBLEMS:',
    ...problems.map(p => `- ${p}`),
    '',
    'OTHER FIELDS ON THE PAGE (already written; never reuse their wording):',
    ...others,
    '',
    `RETURN: ${returnLabel(f.ref)}: <the new text>`,
  ].join('\n');
}

function parseRetryReply(text, ref) {
  let t = (text || '').trim().replace(/^```[a-z]*\s*|\s*```$/g, '').trim();
  const label = returnLabel(ref);
  const m = t.match(new RegExp(`(?:^|\\n)\\s*\\**${label}\\**\\s*:\\s*([\\s\\S]*)$`));
  if (m) t = m[1].trim();
  return t.replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  });
  await Promise.all(workers);
  return out;
}

// callRetry({ message }) → { text, usage }. The caller adds the system blocks.
async function runRetries({ record, V, callRetry, maxRetries = MAX_RETRIES, concurrency = CONCURRENCY }) {
  const log = [];
  const attempts = {};
  const usage = { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 };

  for (let round = 1; round <= maxRetries; round++) {
    const issues = validateV20(record, V);
    const byField = new Map();
    for (const i of issues) {
      if (!i.retry || !i.ref) continue;
      if (!byField.has(i.field)) byField.set(i.field, { ref: i.ref, issues: [] });
      byField.get(i.field).issues.push(i);
    }
    const targets = [...byField.entries()].filter(([label]) => (attempts[label] || 0) < maxRetries);
    if (!targets.length) break;

    const base = clone(record);
    const results = await mapLimit(targets, concurrency, async ([label, g]) => {
      const f = modelFields(base).find(x => x.label === label);
      attempts[label] = (attempts[label] || 0) + 1;
      const problems = [...new Set(g.issues.map(i => i.message))];
      try {
        const r = await callRetry({ message: buildRetryMessage(f, problems, base, V.D) });
        usage.calls++;
        for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens']) usage[k] += (r.usage && r.usage[k]) || 0;
        return { label, f, problems, before: f.text, after: parseRetryReply(r.text, f.ref), raw: r.text || '' };
      } catch (e) {
        return { label, f, problems, before: f.text, after: null, error: e.message };
      }
    });

    // Judge each rewrite against the page as it stood at the start of the round
    const fieldScore = (rec, label) => score(validateV20(rec, V).filter(i => i.field === label));
    for (const r of results) {
      const entry = { round, field: r.label, problems: r.problems, before: r.before, after: r.after, kept: false };
      if (r.error || !r.after) { entry.error = r.error || 'empty reply'; log.push(entry); continue; }
      // A reply that carries other fields' labels, or is far outside the field's range, isn't one field
      const range = RANGES[r.f.rangeKey];
      const own = returnLabel(r.f.ref);
      const labels = [...(r.raw || '').matchAll(/^\s*[-*]?\s*(home_[a-z_]+|card_name|card_text|point_title|point_body|step_title|step_body|faq_question|faq_answer|MODEL_FLAGS)\s*:/gm)].map(m => m[1]);
      if (labels.some(l => l !== own) || /=== MODEL OUTPUT/.test(r.after) ||
          (range && (wordCount(r.after) > range.max * 2.5 || (range.min && wordCount(r.after) < range.min * 0.5)))) {
        entry.error = 'reply was not a single field'; log.push(entry); continue;
      }
      const cand = clone(base);
      setField(cand, r.f.ref, r.after);
      const was = fieldScore(base, r.label);
      const now = fieldScore(cand, r.label);
      entry.score_before = was;
      entry.score_after = now;
      if (now < was) { setField(record, r.f.ref, r.after); entry.kept = true; }
      log.push(entry);
    }
  }

  const finalIssues = validateV20(record, V);
  return { log, usage, finalIssues };
}

function validationSummary(issues, log, usage) {
  return {
    status: 'run',
    ...summarise(issues),
    issues: issues.map(({ ref, ...rest }) => rest),
    retries: log,
    retry_usage: usage,
  };
}

module.exports = { runRetries, buildRetryMessage, parseRetryReply, loadRetryPrompt, validationSummary, MAX_RETRIES };
