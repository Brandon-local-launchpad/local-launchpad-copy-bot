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
function buildClaimsFacts(facts) {
  return [
    'FACTS ON FILE:',
    facts.clientBlock || '(no client block on file)',
    '',
    'LOCAL RESEARCH THE PAGE MAY USE:',
    facts.research || '(none)',
    '',
    'DECISIONS MADE BY CODE (given):',
    facts.decisions || '(none)',
  ].join('\n');
}
function buildClaimsPage(record) {
  return ['PAGE COPY:', ...modelFields(record).map(f => `${f.label}: ${f.text.replace(/\n\n/g, ' ')}`)].join('\n');
}
function buildClaimsMessage(record, facts) {
  return `${buildClaimsFacts(facts)}\n\n${buildClaimsPage(record)}`;
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

// Rule 2 (25 Oct): a finding whose quote carries a figure the client values give (team size,
// years, jobs, insurance) and whose reason is about that figure is not a finding. The
// values the page was written with are on the record (meta.client_values).
const FIGURE_KEYS = { team_size: /\b(team|crew|staff|people|of us)\b/i, years_trading: /\byears?\b/i, year_founded: /\b(year|since|established|founded)\b/i, jobs_completed: /\b(jobs?|projects?|gardens?|homes?|customers?|completed)\b/i, insurance_cover: /\b(insur|cover|liability)/i };
const NUM_WORDS = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' };
function isOnFileFigure(f, record) {
  const values = (record && record.meta && record.meta.client_values) || {};
  const text = norm(`${f.quote} ${f.why || ''}`);
  for (const [key, topic] of Object.entries(FIGURE_KEYS)) {
    const v = String(values[key] || '').trim();
    if (!v) continue;
    const forms = [norm(v), norm(v).replace(/[£,]/g, '')];
    const n = parseInt(v, 10);
    if (!isNaN(n) && NUM_WORDS[n]) forms.push(NUM_WORDS[n]);
    if (forms.some(x => x && new RegExp(`(?:^|[^a-z0-9])${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z0-9])`).test(norm(f.quote))) && topic.test(text)) return true;
  }
  return false;
}

// Rule (6), 25 Oct: a finding whose quote restates a method from the page's TRADE FACTS rows
// is how the job is done, not a claim, unless its reason is about a client-specific practice
// (frequency, waste, a check, a timing, staffing). The trade facts the page was written with
// sit in record.meta.client_block after "TRADE FACTS".
const CLIENT_PRACTICE_RE = /\b(?:frequen|schedule|weekly|fortnight|monthly|how often|regular (?:visit|round)|waste|cuttings|clippings|arisings|check(?:s|ed|ing)? (?:for|before)|nesting|inspect|timing|response|arriv|turn(?:s)? up|staff|team size|who (?:does|turns)|crew|same (?:person|team))/i;
const tfCache = new Map();
function tradeFactsWords(record) {
  const block = (record && record.meta && record.meta.client_block) || '';
  const i = block.indexOf('TRADE FACTS');
  if (i < 0) return null;
  const text = block.slice(i);
  if (tfCache.has(text)) return tfCache.get(text);
  const { contentWords } = require('../validate-v20').helpers;
  const words = contentWords(text.replace(/\[https?:[^\]]*\]/g, ' '));
  tfCache.set(text, words);
  return words;
}
function isTradeFactsMethod(f, record) {
  const words = tradeFactsWords(record);
  if (!words || !words.size) return false;
  if (CLIENT_PRACTICE_RE.test(`${f.quote} ${f.why || ''}`)) return false;
  const { contentWords } = require('../validate-v20').helpers;
  const mine = contentWords(String(f.quote || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'));
  if (mine.size < 4) return false;
  let shared = 0;
  for (const w of mine) if (words.has(w)) shared++;
  // Half the quote's content words in the rows: a method quote carries its own connecting words
  // ("keeps growth in check and tidies the edges" against "mow, edge or strim")
  return shared / mine.size >= 0.5;
}

function parseFindings(text, record) {
  const raw = extractJsonObject(text).findings || [];
  const fields = Object.fromEntries(modelFields(record).map(f => [f.label, f.text]));
  const kept = [], dropped = [];
  // A finding the model cleared itself ("no issue", "supported") isn't a finding
  // (also "Withdrawing this finding." and "not an unsupported claim", seen live 15 Oct)
  const selfCleared = w => /\bacceptable\b|\bno unsupported\b|\bgeneral trade facts?\b|\bgeneral (?:fact|knowledge)\b|\bis a trade fact\b|\bnot a business claim\b|\bno issue\b|\bnot a finding\b|\bnot a claim about (the|this) business\b|\bis supported\b|\bfine as is\b|\bnothing to flag\b|\bwithdraw(?:ing|n)?\s+(?:this|the)\s+finding\b|\bnot an unsupported (?:factual )?claim\b|\brather than an unsupported (?:factual )?claim\b/i.test(w || '');
  // Wording the rules require is approved, whatever the reviewer says about it (15 Oct)
  const required = requiredWording(record);
  const isRequired = f => required.some(r => norm(f.quote).includes(r.phrase) && r.topic.test(`${f.quote} ${f.why || ''}`));
  for (const f of raw) {
    const fieldText = fields[f.field];
    if (fieldText && f.quote && norm(fieldText).includes(norm(f.quote)) && !selfCleared(f.why) && !isRequired(f) && !isOnFileFigure(f, record) && !isTradeFactsMethod(f, record)) kept.push({ field: f.field, quote: f.quote, why: f.why || '' });
    else dropped.push(f);
  }
  return { findings: kept, dropped };
}

// A specific number or timing with no source (7 Nov 2026): "7 to 10 days" must be in the client values, the
// local research or the trade facts as that figure, not just as two stray numbers. Code finds these, so they
// count whatever the reviewer read.
const NUM_WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const FIG_N = '(?:\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';
const FIGURE_RE = new RegExp('£\\s?\\d[\\d,.]*(?:k|m)?\\b|\\b' + FIG_N + '(?:\\s*(?:to|or|-|–)\\s*' + FIG_N + ')?\\s*(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?|years?|mm|cm|metres?|meters?|inch(?:es)?|feet|per cent|percent|%)(?!\\w)', 'gi');
const figureKey = s => String(s).toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, w => NUM_WORD[w]).replace(/\s*(?:to|or|–|-)\s*/g, '-').replace(/\s+/g, '').replace(/(minute|min|hour|hr|day|week|month|year|metre|meter)s\b/g, '$1');
function unsourcedFigures(record, facts) {
  const known = new Set(String([facts.clientBlock, facts.research, facts.decisions].join('\n')).match(FIGURE_RE) || []);
  const keys = new Set([...known].map(figureKey));
  const out = [];
  for (const f of modelFields(record)) {
    for (const m of String(f.text || '').replace(/\]\([^)]*\)/g, ']').match(FIGURE_RE) || []) {
      if (!keys.has(figureKey(m))) out.push({ field: f.label, quote: m, why: 'A specific number or timing with no source in the client values, the local research or the trade facts.', code: true });
    }
  }
  return out;
}

// callModel({ system, message, maxTokens }) → { text, usage }
async function runClaimsReview(record, facts, callModel) {
  // Cached (7 Nov 2026): the prompt and the facts stay the same for every review of a page; only the copy changes
  const system = [{ type: 'text', text: loadClaimsPrompt() }, { type: 'text', text: buildClaimsFacts(facts), cache_control: { type: 'ephemeral' } }];
  const r = await callModel({ system, message: buildClaimsPage(record), maxTokens: 2048, role: 'claims' });
  const { findings: read, dropped } = parseFindings(r.text, record);
  const figures = unsourcedFigures(record, facts).filter(x => !read.some(y => y.field === x.field && String(y.quote).includes(x.quote)));
  const findings = [...read, ...figures];
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
  // A category page's block names its sections without the D numbers and adds blocks 4 and 5 (23 Oct);
  // a service page's adds What's Included and the More Services cards (25 Oct)
  return [part('--- HEADINGS ---', '\n\n'), part("--- WHAT'S INCLUDED", '\n\n'), part('--- PROCESS STEPS ---', '\n\n'), part('--- D11 FAQ QUESTIONS ---', '\n\n') || part('--- FAQ QUESTIONS ---', '\n\n'), part('--- BLOCK 4', '\n\n'), part('--- BLOCK 5: COST FACTORS', '\n\n'), part('--- MORE SERVICES CARDS', '\n\n'), coastal].filter(Boolean).join('\n\n');
}
function factsFromRecord(record) {
  const meta = record.meta || {};
  // The generation block no longer lists every service (16 Oct): the review gets them all
  const withServices = meta.services_on_file ? `${meta.client_block || ''}\n\nCONFIRMED SERVICES (by category):\n${meta.services_on_file}` : meta.client_block;
  // The client's areas (7 Nov 2026): naming a town or village on this list is not a claim
  const clientBlock = (meta.area_list || []).length ? `${withServices || ''}\n\nCONFIRMED AREAS THE BUSINESS COVERS (naming any of these is not a claim):\n${meta.area_list.join(', ')}` : withServices;
  return { clientBlock, research: researchFromRecord(record), decisions: decisionsFromRecord(record) };
}

module.exports = { unsourcedFigures, runClaimsReview, buildClaimsMessage, parseFindings, isOnFileFigure, isTradeFactsMethod, researchFromRecord, decisionsFromRecord, factsFromRecord, loadClaimsPrompt, CLAIMS_MODEL };
