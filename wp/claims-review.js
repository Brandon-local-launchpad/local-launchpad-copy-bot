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
  // Windows checkouts can have CRLF line endings
  const lf = text.replace(/\r\n/g, '\n');
  const cut = lf.indexOf('\n---\n');
  return (cut >= 0 ? lf.slice(cut + 5) : lf).trim();
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

// Phrases the copy rules require, with what a finding about them talks about.
// A finding that quotes one of these, about that topic, is not a finding.
function requiredWording(record) {
  const block = (record && record.meta && record.meta.decisions_block) || '';
  const out = [];
  if (/^Primary city coastal: yes/m.test(block)) out.push({ phrase: 'inland and along the coast', topic: /\b(coast|coastal|inland|direction)\b/i });
  // Q3 with no guarantee answers from the standard every trade works to
  if (/reasonable care and skill/i.test(block)) out.push({ phrase: 'reasonable care and skill', topic: /\b(care and skill|standard|guarantee|warranty)\b/i });
  return out;
}

function parseFindings(text, record) {
  const raw = extractJsonObject(text).findings || [];
  const fields = Object.fromEntries(modelFields(record).map(f => [f.label, f.text]));
  const kept = [], dropped = [];
  // A finding the model cleared itself ("no issue", "supported") isn't a finding
  // (also "Withdrawing this finding." and "not an unsupported claim", seen live 15 Oct)
  const selfCleared = w => /\bno issue\b|\bnot a claim about (the|this) business\b|\bis supported\b|\bfine as is\b|\bnothing to flag\b|\bwithdraw(?:ing|n)?\s+(?:this|the)\s+finding\b|\bnot an unsupported (?:factual )?claim\b|\brather than an unsupported (?:factual )?claim\b/i.test(w || '');
  // Wording the rules require is approved, whatever the reviewer says about it (15 Oct)
  const required = requiredWording(record);
  const isRequired = f => required.some(r => norm(f.quote).includes(r.phrase) && r.topic.test(`${f.quote} ${f.why || ''}`));
  for (const f of raw) {
    const fieldText = fields[f.field];
    if (fieldText && f.quote && norm(fieldText).includes(norm(f.quote)) && !selfCleared(f.why) && !isRequired(f)) kept.push({ field: f.field, quote: f.quote, why: f.why || '' });
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
  // The coastal line is a code decision too ("inland and along the coast")
  const coastal = (block.match(/^Primary city coastal:.*$/m) || [''])[0];
  return [part('--- HEADINGS ---', '\n\n'), part('--- PROCESS STEPS ---', '\n\n'), part('--- D11 FAQ QUESTIONS ---', '\n\n'), coastal].filter(Boolean).join('\n\n');
}
function factsFromRecord(record) {
  const meta = record.meta || {};
  // The generation block no longer lists every service (16 Oct): the review gets them all
  const clientBlock = meta.services_on_file ? `${meta.client_block || ''}\n\nCONFIRMED SERVICES (by category):\n${meta.services_on_file}` : meta.client_block;
  return { clientBlock, research: researchFromRecord(record), decisions: decisionsFromRecord(record) };
}

module.exports = { runClaimsReview, buildClaimsMessage, parseFindings, researchFromRecord, decisionsFromRecord, factsFromRecord, loadClaimsPrompt, CLAIMS_MODEL };
