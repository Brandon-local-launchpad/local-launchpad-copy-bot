'use strict';

// ── Claims review before a push ─────────────────────────────────────────────
// One model call reads the finished copy against the facts on file (client values,
// confirmed practices and services, the allocated research) and lists statements
// about the business the facts don't support. Code keeps only findings whose quote
// really is in the named field, so the model can't invent problems.

const fs = require('fs');
const path = require('path');
const { modelFields } = require('../validate-v20');
const { extractJsonObject } = require('../json-extract');
const { versionOf } = require('../v20-record');

const CLAIMS_MODEL = 'claude-sonnet-4-6';

function loadClaimsPrompt() {
  const text = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'Claims_Review_CORE.md'), 'utf8');
  const cut = text.indexOf('\n---\n');
  return (cut >= 0 ? text.slice(cut + 5) : text).trim();
}

// facts: { clientBlock?: string, research?: string } — the client block the page was
// written with (record.meta.client_block) holds the values, practices and services
function buildClaimsMessage(record, facts) {
  const fields = modelFields(record);
  return [
    'FACTS ON FILE:',
    facts.clientBlock || '(no client block on file)',
    '',
    'LOCAL RESEARCH THE PAGE MAY USE:',
    facts.research || '(none)',
    '',
    'DECISIONS MADE BY CODE (given):',
    facts.decisions || '(none)',
    '',
    'PAGE COPY:',
    ...fields.map(f => `${f.label}: ${f.text.replace(/\n\n/g, ' ')}`),
  ].join('\n');
}

const norm = s => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

function parseFindings(text, record) {
  const raw = extractJsonObject(text).findings || [];
  const fields = Object.fromEntries(modelFields(record).map(f => [f.label, f.text]));
  const kept = [], dropped = [];
  // A finding the model cleared itself ("no issue", "supported") isn't a finding
  const selfCleared = w => /\bno issue\b|\bnot a claim about (the|this) business\b|\bis supported\b|\bfine as is\b|\bnothing to flag\b/i.test(w || '');
  for (const f of raw) {
    const fieldText = fields[f.field];
    if (fieldText && f.quote && norm(fieldText).includes(norm(f.quote)) && !selfCleared(f.why)) kept.push({ field: f.field, quote: f.quote, why: f.why || '' });
    else dropped.push(f);
  }
  return { findings: kept, dropped };
}

// callModel({ system, message, maxTokens }) → { text, usage }
async function runClaimsReview(record, facts, callModel) {
  const r = await callModel({ system: loadClaimsPrompt(), message: buildClaimsMessage(record, facts), maxTokens: 2048 });
  const { findings, dropped } = parseFindings(r.text, record);
  // `for` ties the review to this version of the page; the push refuses a review of another version
  return { for: versionOf(record), at: new Date().toISOString(), model: CLAIMS_MODEL, findings, dropped: dropped.length, usage: r.usage || null };
}

// From the decisions block the page was written with: the allocated research, and
// the code-made decisions (headings, steps with briefs, FAQ questions with briefs)
function researchFromRecord(record) {
  const block = (record.meta && record.meta.decisions_block) || '';
  const a = block.indexOf('ALLOCATED ITEMS:'), b = block.indexOf('MODEL FIELDS:');
  return a >= 0 ? block.slice(a, b > a ? b : undefined).trim() : '';
}
function decisionsFromRecord(record) {
  const block = (record.meta && record.meta.decisions_block) || '';
  const part = (from, to) => { const a = block.indexOf(from); if (a < 0) return ''; const b = block.indexOf(to, a + from.length); return block.slice(a, b > a ? b : undefined).trim(); };
  return [part('--- HEADINGS ---', '\n\n'), part('--- PROCESS STEPS ---', '\n\n'), part('--- D11 FAQ QUESTIONS ---', '\n\n')].filter(Boolean).join('\n\n');
}
function factsFromRecord(record) {
  return { clientBlock: record.meta && record.meta.client_block, research: researchFromRecord(record), decisions: decisionsFromRecord(record) };
}

module.exports = { runClaimsReview, buildClaimsMessage, parseFindings, researchFromRecord, decisionsFromRecord, factsFromRecord, loadClaimsPrompt, CLAIMS_MODEL };
