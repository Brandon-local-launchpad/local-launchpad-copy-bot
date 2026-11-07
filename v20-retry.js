'use strict';

// ── v20 per-field retries (Stage 7, brief §6b) ───────────────────────────────
// After validation, every field with a BLOCK or a retry-eligible FLAG gets one
// follow-up call that rewrites only that field. Re-validate; at most 2 retries per
// field; keep the best version (fewest BLOCKs, then fewest FLAGs) and leave any
// remaining issue for a human. Every attempt is logged in the record.

const fs   = require('fs');
const path = require('path');
const { modelFields, getField, setField, summarise, wordCount, effectiveRanges } = require('./validate-v20');
const { pageTypeOf } = require('./page-types');

// The record's own page type validates it and gives its word ranges
const validateV20 = (record, V) => pageTypeOf(record).validate(record, V);
// The ranges a page is held to: the page type's, a third lower on a thin page (V.thin, 4 Nov 2026)
const rangesFor = (record, V = null) => effectiveRanges(record, V) || {};

// 3 since 16 Oct (copy quality loop: flags were left after 2)
const MAX_RETRIES = 2; // the blog rule (Brandon, 7 Nov 2026)
let CONCURRENCY = 4;
// tools/site-batch-build.js only: a retry round goes up as one batch, not four at a time
const setRetryConcurrency = n => { CONCURRENCY = n; };

function loadRetryPrompt() {
  const text = fs.readFileSync(path.join(__dirname, 'prompts', 'Field_Retry_CORE.md'), 'utf8');
  // Windows checkouts can have CRLF line endings
  const lf = text.replace(/\r\n/g, '\n');
  const cut = lf.indexOf('\n---\n');
  return (cut >= 0 ? lf.slice(cut + 5) : lf).trim();
}

const score = issues => issues.reduce((n, i) => n + (i.type === 'BLOCK' ? 100 : 1), 0);
const clone = o => JSON.parse(JSON.stringify(o));

// The label the model must return, and the range it must hit
function returnLabel(ref) { return ref.sub || ref.key; }
function rangeText(f, D, record, V = null) {
  const r = rangesFor(record, V)[f.rangeKey];
  if (!r) return '';
  if (f.rangeKey === 'home_content_block_body' && D.d13_expands) return V && V.thin ? '134 to 300 words' : '200 to 300 words';
  return `${r.label} words`;
}

function buildRetryMessage(f, problems, record, D, earlier = [], V = null) {
  const others = modelFields(record).filter(o => o.label !== f.label).map(o => `${o.label}: ${o.text.replace(/\n\n/g, '\\n\\n')}`);
  const stillAvoid = earlier.filter(p => !problems.includes(p));
  return [
    `FIELD: ${f.label}${rangeText(f, D, record, V) ? ` (${rangeText(f, D, record, V)})` : ''}`,
    '',
    'CURRENT TEXT:',
    f.text.replace(/\n\n/g, '\\n\\n'),
    '',
    'PROBLEMS:',
    ...problems.map(p => `- ${p}`),
    ...(stillAvoid.length ? ['', 'ALREADY FIXED IN AN EARLIER VERSION (don\'t bring these back):', ...stillAvoid.map(p => `- ${p}`)] : []),
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
  // "card_text (Lawn Care Service): …" too: the label can carry the field's name (16 Oct). The text
  // after the LAST label: a reply that corrects itself ("…Wait, that opens with 'Tell'. Corrected
  // version: cat_final_cta_body: …") carries the label twice, and only the last is the copy (25 Oct)
  // "RETURN: faq_answer: …" too: Haiku copies the prompt's RETURN line, and the words went onto the page (7 Nov)
  const re = new RegExp(`(?:^|\\n)\\s*\\**(?:RETURN:\\s*)?${label}\\**\\s*(?:\\([^)\\n]*\\))?\\s*:\\s*`, 'g');
  let last = null;
  for (const mm of t.matchAll(re)) last = mm;
  if (last) t = t.slice(last.index + last[0].length).trim();
  // A label of the model's own making, shorter or longer than the one asked for ("card: …", "block4 card_body: …", 7 Nov)
  t = t.replace(/^(?:RETURN:\s*)?(?:(?:block ?[45]|card|[a-z]+_[a-z0-9_]+)\s+)*(?:card|[a-z]+_[a-z0-9_]+):\s+/i, '');
  return t.replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// A reply that carries other fields' labels, or is far outside the field's range, isn't one field
function notSingleField(raw, after, f, record, V = null) {
  const range = rangesFor(record, V)[f.rangeKey];
  const own = returnLabel(f.ref);
  const labels = [...(raw || '').matchAll(new RegExp(`^\\s*[-*]?\\s*(${pageTypeOf(record).replyLabels.source})\\s*:`, 'gm'))].map(m => m[1]);
  return labels.some(l => l !== own) || /=== MODEL OUTPUT/.test(after) ||
    !!(range && (wordCount(after) > range.max * 2.5 || (range.min && wordCount(after) < range.min * 0.5)));
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
// validate (4 Nov 2026): the page type's validator (page-types/<type>.js validate). Without it the
// homepage's validateV20 judged every page, so a category, service or location rule never drove
// a retry and a rewrite that broke one was kept.
async function runRetries({ record, V, callRetry, maxRetries = MAX_RETRIES, concurrency = CONCURRENCY, validate = null }) {
  const check = validate || (rec => validateV20(rec, V));
  const log = [];
  const attempts = {};
  const history = {}; // every problem a field has had, so a later round doesn't bring one back
  const usage = { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 };

  for (let round = 1; round <= maxRetries; round++) {
    const issues = check(record);
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
      const earlier = history[label] || [];
      history[label] = [...new Set([...earlier, ...problems])];
      try {
        const r = await callRetry({ message: buildRetryMessage(f, problems, base, V.D, earlier, V), hasBlock: g.issues.some(i => i.type === 'BLOCK') });
        usage.calls++;
        for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens']) usage[k] += (r.usage && r.usage[k]) || 0;
        return { label, f, problems, checks: [...new Set(g.issues.map(i => i.check))], before: f.text, after: parseRetryReply(r.text, f.ref), raw: r.text || '' };
      } catch (e) {
        return { label, f, problems, checks: [...new Set(g.issues.map(i => i.check))], before: f.text, after: null, error: e.message };
      }
    });

    // Judge each rewrite against the page as it stood at the start of the round
    const fieldScore = (rec, label) => score(check(rec).filter(i => i.field === label));
    for (const r of results) {
      const entry = { round, field: r.label, problems: r.problems, before: r.before, after: r.after, kept: false };
      if (r.error || !r.after) { entry.error = r.error || 'empty reply'; log.push(entry); continue; }
      if (notSingleField(r.raw, r.after, r.f, record, V)) { entry.error = 'reply was not a single field'; log.push(entry); continue; }
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

  const finalIssues = check(record);
  return { log, usage, finalIssues };
}

// ── Claims findings into the retries ─────────────────────────────────────────
// review(record) → { findings: [{ field, quote, why }], … } (wp/claims-review.js).
// Each round: rewrite every field with findings, keep a rewrite only when every
// quoted claim is gone and the field has no more BLOCKs than before, then review
// the whole page again. What's left after maxRounds is for a person to accept.
const normq = s => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

async function runClaimRetries({ record, V, callRetry, review, maxRounds = 2, concurrency = CONCURRENCY, validate = null }) {
  const check = validate || (rec => validateV20(rec, V));
  const rounds = [];
  let claims = await review(record);
  const first = claims.findings.length;
  for (let round = 1; round <= maxRounds && claims.findings.length; round++) {
    const fields = modelFields(record);
    const byField = new Map();
    for (const c of claims.findings) {
      const f = fields.find(x => x.label === c.field);
      if (!f) continue;
      if (!byField.has(c.field)) byField.set(c.field, { f, findings: [] });
      byField.get(c.field).findings.push(c);
    }
    const base = clone(record);
    const blocksIn = (rec, label) => check(rec).filter(i => i.field === label && i.type === 'BLOCK').length;
    const results = await mapLimit([...byField.values()], concurrency, async g => {
      const problems = [
        // Copy quality 5 (Brandon, 4 Nov 2026): an unconfirmed practice goes, or the sentence describes the
        // job itself. The third person "a fair [trade]" rewrite is dropped: it read as a claim and an artefact
        ...g.findings.map(c => `Unsupported claim: "${c.quote}". ${c.why} Delete the sentence, or rewrite it to describe the job itself: what the work involves. No "we", no "a fair [trade]", and no claim about how any business behaves.`),
        ...check(base).filter(i => i.field === g.f.label).map(i => i.message),
      ];
      try {
        const r = await callRetry({ message: buildRetryMessage(g.f, [...new Set(problems)], base, V.D, [], V) });
        return { g, raw: r.text || '', after: parseRetryReply(r.text, g.f.ref) };
      } catch (e) { return { g, error: e.message }; }
    });
    const log = [];
    for (const r of results) {
      const entry = { round, field: r.g.f.label, claims: r.g.findings.map(c => c.quote), before: r.g.f.text, after: r.after || null, kept: false };
      if (r.error || !r.after) { entry.error = r.error || 'empty reply'; log.push(entry); continue; }
      if (notSingleField(r.raw, r.after, r.g.f, record, V)) { entry.error = 'reply was not a single field'; log.push(entry); continue; }
      const cand = clone(base);
      setField(cand, r.g.f.ref, r.after);
      const gone = r.g.findings.every(c => !normq(r.after).includes(normq(c.quote)));
      const noNewBlocks = blocksIn(cand, r.g.f.label) <= blocksIn(base, r.g.f.label);
      if (gone && noNewBlocks) { setField(record, r.g.f.ref, r.after); entry.kept = true; }
      else entry.error = !gone ? 'the claim is still there' : 'the rewrite added a BLOCK';
      log.push(entry);
    }
    rounds.push({ round, findings: claims.findings, retries: log });
    claims = await review(record);
  }
  return { claims, rounds, first };
}

// ── Flag pass (4 Nov 2026, copy quality 2) ────────────────────────────────────
// After the BLOCKs are clear and the claims pass has run: one targeted rewrite, two rounds at
// most, of only the fields that still carry one of these FLAGs (length and range, repeats,
// padding, research wording), each field given every flag message it carries. A rewrite is kept
// only when that field's FLAG count drops and the whole page gains no BLOCK; a field is tried
// once per round. Returns the log, the usage and the flag counts before and after.
const FLAG_PASS = new Set(['N7', 'N18', 'N21', 'N24', 'REPEAT-PAGE', 'REPEAT-IN', 'PAD-OPENER', 'ITEM-REPEAT', 'SERVICE', 'SCENERY', 'RESEARCH-LANG', 'FAQ-PAD', 'INTRO-PAD', 'CARD-FILLER', 'MORE-REPEAT', 'PRACTICE-REPEAT', 'PROOF-REPEAT', 'TRUST-REPEAT', 'LINK-TEXT', '6c', 'CARD-LOCAL', 'OUTCOME']);
async function runFlagPass({ record, V, callRetry, maxRounds = 2, concurrency = CONCURRENCY, validate = null, checks = FLAG_PASS }) {
  const check = validate || (rec => validateV20(rec, V));
  const log = [];
  const usage = { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 };
  const flagsIn = (rec, label) => check(rec).filter(i => i.type === 'FLAG' && i.field === label).length;
  const blocksOn = rec => check(rec).filter(i => i.type === 'BLOCK').length;
  const before = check(record).filter(i => i.type === 'FLAG').length;
  for (let round = 1; round <= maxRounds; round++) {
    const issues = check(record);
    const byField = new Map();
    for (const i of issues) {
      if (i.type !== 'FLAG' || !i.ref || !checks.has(i.check)) continue;
      if (!byField.has(i.field)) byField.set(i.field, { ref: i.ref });
    }
    if (!byField.size) break;
    const base = clone(record);
    const baseBlocks = blocksOn(base);
    const results = await mapLimit([...byField.keys()], concurrency, async label => {
      const f = modelFields(base).find(x => x.label === label);
      if (!f) return { label, error: 'field not found' };
      const problems = [...new Set(issues.filter(i => i.field === label).map(i => i.message))];
      try {
        const r = await callRetry({ message: buildRetryMessage(f, problems, base, V.D, [], V), hasBlock: issues.some(i => i.field === label && i.type === 'BLOCK') });
        usage.calls++;
        for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens']) usage[k] += (r.usage && r.usage[k]) || 0;
        return { label, f, problems, before: f.text, after: parseRetryReply(r.text, f.ref), raw: r.text || '' };
      } catch (e) {
        return { label, f, problems, before: f.text, after: null, error: e.message };
      }
    });
    for (const r of results) {
      const entry = { round, field: r.label, problems: r.problems, before: r.before, after: r.after, kept: false, source: 'flags' };
      if (r.error || !r.after) { entry.error = r.error || 'empty reply'; log.push(entry); continue; }
      if (notSingleField(r.raw, r.after, r.f, record, V)) { entry.error = 'reply was not a single field'; log.push(entry); continue; }
      const cand = clone(base);
      setField(cand, r.f.ref, r.after);
      const was = flagsIn(base, r.label), now = flagsIn(cand, r.label);
      entry.flags_before = was;
      entry.flags_after = now;
      if (now < was && blocksOn(cand) <= baseBlocks) { setField(record, r.f.ref, r.after); entry.kept = true; }
      else entry.error = now >= was ? 'the flags did not drop' : 'the rewrite added a BLOCK';
      log.push(entry);
    }
  }
  const after = check(record).filter(i => i.type === 'FLAG').length;
  return { log, usage, before, after, kept: log.filter(x => x.kept).length };
}

// ── Targeted round (Brandon, copy quality 5, 4 Nov 2026) ─────────────────────
// After the flag pass: the fields still carrying a BLOCK, or an issue behind code item Y2, P3, P4, F1,
// P5, Y11, Y12, K1, I1, S7 or B3, are rewritten once more with every failure message on the field. A rewrite is
// kept only when the page has fewer of those issues and gains no BLOCK. No more retries after this:
// what is left goes on the page's edit list.
async function runTargetedPass({ record, V, callRetry, concurrency = CONCURRENCY, validate = null }) {
  const { targetIssues } = require('./quality-review');
  const check = validate || (rec => validateV20(rec, V));
  const targetsOf = rec => targetIssues(rec, check(rec));
  const blocksOn = rec => check(rec).filter(i => i.type === 'BLOCK').length;
  const log = [];
  const usage = { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 };
  const first = targetsOf(record);
  const labels = [...new Set(first.filter(i => i.ref).map(i => i.field))];
  const base = clone(record);
  const allIssues = check(base);
  const results = await mapLimit(labels, concurrency, async label => {
    const f = modelFields(base).find(x => x.label === label);
    if (!f) return { label, error: 'field not found' };
    const problems = [...new Set(allIssues.filter(i => i.field === label).map(i => i.message))];
    try {
      const r = await callRetry({ message: buildRetryMessage(f, problems, base, V.D, [], V), hasBlock: allIssues.some(i => i.field === label && i.type === 'BLOCK') });
      usage.calls++;
      for (const k of ['input_tokens', 'output_tokens', 'cache_read_input_tokens']) usage[k] += (r.usage && r.usage[k]) || 0;
      return { label, f, problems, before: f.text, after: parseRetryReply(r.text, f.ref), raw: r.text || '' };
    } catch (e) {
      return { label, f, problems, before: f.text, after: null, error: e.message };
    }
  });
  // One at a time against the page as it now stands, so two rewrites can't add up to a new repeat
  for (const r of results) {
    const entry = { round: 1, field: r.label, problems: r.problems, before: r.before, after: r.after, kept: false, source: 'targeted' };
    if (r.error || !r.after) { entry.error = r.error || 'empty reply'; log.push(entry); continue; }
    if (notSingleField(r.raw, r.after, r.f, record, V)) { entry.error = 'reply was not a single field'; log.push(entry); continue; }
    const cand = clone(record);
    setField(cand, r.f.ref, r.after);
    const was = targetsOf(record).length, now = targetsOf(cand).length;
    if (now < was && blocksOn(cand) <= blocksOn(record)) { setField(record, r.f.ref, r.after); entry.kept = true; }
    else entry.error = now >= was ? 'the failures did not drop' : 'the rewrite added a BLOCK';
    log.push(entry);
  }
  const left = targetsOf(record).map(i => ({ field: i.field, check: i.check, type: i.type, message: i.message }));
  return { log, usage, before: first.length, after: left.length, kept: log.filter(x => x.kept).length, left };
}

// ── Quality review into the retries (16 Oct, copy quality loop) ───────────────
// review(record) → the quality review (quality-review.js): failed judge items and other
// problems, each quoting the page. Each round: rewrite every field a quote is in, keep a
// rewrite only when its quotes are gone and the field has no more BLOCKs or FLAGs than
// before, then review again. Returns the last review, which scores the page as it stands.
async function runQualityRetries({ record, V, callRetry, review, maxRounds = 3, concurrency = CONCURRENCY, validate = null }) {
  const check = validate || (rec => validateV20(rec, V));
  const rounds = [];
  let rv = await review(record);
  for (let round = 1; round <= maxRounds && !rv.done; round++) {
    const fields = modelFields(record);
    const found = [
      ...rv.items.filter(i => !i.pass && i.by === 'judge').flatMap(i => i.reasons.map(r => {
        const m = r.match(/^"([\s\S]*?)": ([\s\S]*)$/);
        return m ? { quote: m[1], why: `${i.title} ${m[2]}` } : null;
      })).filter(Boolean),
      ...(rv.other_problems || []).map(p => ({ quote: p.quote, why: p.why })),
    ].filter(p => p.quote && p.quote.length > 3);
    const byField = new Map();
    for (const p of found) {
      // The reviewer quotes the page with tokens filled in: match on the field's filled text
      const f = fields.find(x => normq(fillTokens(x.text, record)).includes(normq(p.quote)) || normq(stripLinksText(fillTokens(x.text, record))).includes(normq(p.quote)));
      if (!f) continue;
      if (!byField.has(f.label)) byField.set(f.label, { f, problems: [] });
      byField.get(f.label).problems.push(p);
    }
    if (!byField.size) break;
    const base = clone(record);
    const fieldIssues = (rec, label) => check(rec).filter(i => i.field === label);
    const results = await mapLimit([...byField.values()], concurrency, async g => {
      const problems = [
        ...g.problems.map(p => `A reviewer flagged "${p.quote}": ${p.why} Rewrite it so the problem is gone.`),
        ...fieldIssues(base, g.f.label).map(i => i.message),
      ];
      try {
        const r = await callRetry({ message: buildRetryMessage(g.f, [...new Set(problems)], base, V.D) });
        return { g, raw: r.text || '', after: parseRetryReply(r.text, g.f.ref) };
      } catch (e) { return { g, error: e.message }; }
    });
    const log = [];
    for (const r of results) {
      const entry = { round, field: r.g.f.label, problems: r.g.problems.map(p => p.quote), before: r.g.f.text, after: r.after || null, kept: false };
      if (r.error || !r.after) { entry.error = r.error || 'empty reply'; log.push(entry); continue; }
      if (notSingleField(r.raw, r.after, r.g.f, record, V)) { entry.error = 'reply was not a single field'; log.push(entry); continue; }
      const cand = clone(base);
      setField(cand, r.g.f.ref, r.after);
      const gone = r.g.problems.every(p => !normq(fillTokens(r.after, record)).includes(normq(p.quote)));
      const after = fieldIssues(cand, r.g.f.label);
      const was = score(fieldIssues(base, r.g.f.label)), now = score(after);
      // A rewrite must pass the validator: one with a BLOCK is discarded and the earlier text kept,
      // whatever the reviewer said (25 Oct: a quality rewrite brought the areas intro's page claim back)
      const blocked = after.filter(i => i.type === 'BLOCK');
      if (gone && !blocked.length && now <= was) { setField(record, r.g.f.ref, r.after); entry.kept = true; }
      else entry.error = !gone ? 'the flagged words are still there' : blocked.length ? `the rewrite has a BLOCK (${blocked.map(i => i.check).join(', ')})` : 'the rewrite added validator issues';
      log.push(entry);
    }
    rounds.push({ round, score: rv.score, failed: rv.failed, retries: log });
    rv = await review(record);
  }
  return { review: rv, rounds };
}
const fillTokens = (t, record) => String(t || '').replace(/\[CV: ([a-z0-9_]+)\]/g, (m, k) => ((record.meta && record.meta.client_values) || {})[k] || m);
const stripLinksText = t => String(t || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

function validationSummary(issues, log, usage) {
  return {
    status: 'run',
    ...summarise(issues),
    issues: issues.map(({ ref, ...rest }) => rest),
    retries: log,
    retry_usage: usage,
  };
}

// ── The one style pass (Brandon, 7 Nov 2026) ─────────────────────────────────
// After the BLOCKs and claims: one call that rewrites every field still carrying a flag, with all its flags,
// then a recheck. A rewrite is kept only when its field has fewer flags, the page's flags don't rise and no
// BLOCK appears. No second round: what is left goes to "Edit before publishing".
function parseStyleReply(text, count) {
  const out = new Map();
  const re = /^\s*\**FIELD (\d+)\**:\s*/gm;
  const marks = [...String(text || '').matchAll(re)];
  marks.forEach((m, i) => {
    const n = parseInt(m[1], 10);
    if (n < 1 || n > count) return;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    const body = text.slice(m.index + m[0].length, end).trim().replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    if (body) out.set(n, body);
  });
  return out;
}
async function runStylePass({ record, V, callStyle, validate = null }) {
  const check = validate || (rec => validateV20(rec, V));
  const flagsOf = rec => check(rec).filter(i => i.type === 'FLAG');
  const blocksOn = rec => check(rec).filter(i => i.type === 'BLOCK').length;
  const log = [];
  const issues = flagsOf(record);
  const before = issues.length;
  const byField = new Map();
  for (const i of issues) {
    if (!i.ref) continue;
    if (!byField.has(i.field)) byField.set(i.field, []);
    byField.get(i.field).push(i);
  }
  if (!byField.size) return { log, before, after: before, kept: 0, rejected: 0, fields: 0, reason: 'nothing to do' };
  const all = modelFields(record);
  const targets = [...byField.entries()].map(([label, list]) => ({ f: all.find(x => x.label === label), list })).filter(t => t.f);
  const message = [
    'STYLE PASS. This call rewrites several fields at once, and the one line reply format above does not apply. Fix the problems listed for each field. Keep every fact, link, [CV: x] token and the field\'s word range. Change as little as you can.',
    '',
    ...targets.flatMap((t, i) => [`FIELD ${i + 1}: ${t.f.label}${rangeText(t.f, V.D, record, V) ? ` (${rangeText(t.f, V.D, record, V)})` : ''}`, 'CURRENT TEXT:', t.f.text.replace(/\n\n/g, '\\n\\n'), 'PROBLEMS:', ...[...new Set(t.list.map(i => i.message))].map(p => `- ${p}`), '']),
    'FIELDS THAT STAY AS THEY ARE (never reuse their wording):',
    ...all.filter(o => !byField.has(o.label)).map(o => `${o.label}: ${o.text.replace(/\n\n/g, '\\n\\n')}`),
    '',
    `Reply with one entry per field, numbered as above and nothing else: "FIELD 1: <the new text>" on its own line, through FIELD ${targets.length}. Never write a label or field name inside the text.`,
  ].join('\n');
  const r = await callStyle({ message });
  const replies = parseStyleReply(r.text, targets.length);
  let kept = 0, rejected = 0;
  targets.forEach((t, i) => {
    const after = replies.get(i + 1);
    const entry = { round: 'style', source: 'style', field: t.f.label, checks: [...new Set(t.list.map(x => x.check))], problems: [...new Set(t.list.map(x => x.message))], before: t.f.text, after: after || null, kept: false };
    if (!after) { entry.error = 'no reply for this field'; rejected++; log.push(entry); return; }
    const cand = clone(record);
    setField(cand, t.f.ref, after);
    const inField = rec => flagsOf(rec).filter(x => x.field === t.f.label).length;
    if (inField(cand) < inField(record) && flagsOf(cand).length <= flagsOf(record).length && blocksOn(cand) <= blocksOn(record)) { setField(record, t.f.ref, after); entry.kept = true; kept++; }
    else { entry.error = 'the rewrite did not clear flags, or added one elsewhere'; rejected++; }
    log.push(entry);
  });
  return { log, before, after: flagsOf(record).length, kept, rejected, fields: targets.length };
}

module.exports = { runStylePass, parseStyleReply, setRetryConcurrency, runRetries, runClaimRetries, runFlagPass, runTargetedPass, runQualityRetries, buildRetryMessage, parseRetryReply, loadRetryPrompt, validationSummary, MAX_RETRIES, FLAG_PASS };
