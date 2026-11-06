'use strict';

// ── Lead Snap autopost: Preview posts ────────────────────────────────────────
// A sandbox: each prompt goes to the model 4 times with nothing else around it, the way Lead Snap
// sends one, and the samples are checked. Nothing goes to Lead Snap. Which model Lead Snap's AI
// really is, nobody here knows, so a preview shows how the prompt reads, not exactly what Lead Snap
// will write. The checks only ever warn: the human reads the samples and decides.

const { wordsDetect } = require('../../gbp/inputs');
const { MODEL, CLAIMS } = require('./generate');
const { USD_TO_GBP, priceFor } = require('../../ui/model-log');

const SAMPLES = 4;
const CONCURRENCY = 5;
const EFFORT = 'low';
const MIN_WORDS = 150;
const MAX_WORDS = 250;
const LONG_PHRASE = 8;            // words in a row shared by two samples
const [USD_IN_PER_M, USD_OUT_PER_M] = priceFor(MODEL);
// Measured on real samples (6 Nov 2026): about 460 tokens out, thinking included, and a token
// for every 2.7 characters of prompt
const OUTPUT_TOKENS_EACH = 460;
const CHARS_PER_TOKEN = 2.7;
const SYSTEM = 'Write the Google Business Profile post the user asks for. Return only the post text.';

const DATED = /\b(spring|summer|autumn|winter|christmas|easter|new year|bank holiday|january|february|march|april|june|july|august|september|october|november|december|today|tomorrow|this (?:week|month|year)|next (?:week|month|year)|weather|rain|rainy|rainfall|storms?|frost|frosty|snow|heatwave|freezing|sunshine)\b/i;

const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordsOf = t => String(t).trim().split(/\s+/).filter(Boolean);
const tokens = t => String(t).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
const costUsd = u => ((u.input_tokens || 0) * USD_IN_PER_M + (u.output_tokens || 0) * USD_OUT_PER_M) / 1e6;
const pence = usd => Math.max(1, Math.round(usd * USD_TO_GBP * 100));
const pass = (id, label, detail = '') => ({ id, label, level: 'pass', detail });
const warn = (id, label, detail) => ({ id, label, level: 'warn', detail });

function estimate(prompts = []) {
  const samples = prompts.length * SAMPLES;
  const input = prompts.reduce((n, p) => n + (p.chars || String(p.text || '').length) / CHARS_PER_TOKEN, 0) * SAMPLES;
  const usd = costUsd({ input_tokens: input, output_tokens: samples * OUTPUT_TOKENS_EACH });
  return { samples, per_prompt: SAMPLES, usd: Math.round(usd * 1000) / 1000, pence: pence(usd), model: MODEL };
}

// The business name exactly as typed, every time. Its first two words catch a shortened name;
// "Ltd" after it catches the one Lead Snap really produced.
function checkName(text, business) {
  const label = 'Business name spelled exactly';
  const exact = new RegExp(esc(business), 'g');
  if (!exact.test(text)) return warn('name', label, `"${business}" does not appear exactly`);
  const short = business.split(/\s+/).slice(0, 2).join(' ');
  const rest = String(text).replace(exact, ' ');
  const stray = rest.match(new RegExp(`\\b${esc(short)}\\b[^.,;!?\\n]{0,24}`, 'i'));
  if (stray) return warn('name', label, `also written as "${stray[0].trim()}"`);
  if (!/\b(ltd|limited)\b/i.test(business)) {
    const legal = String(text).match(new RegExp(`${esc(business)}\\s+(ltd|limited)\\b`, 'i'));
    if (legal) return warn('name', label, `written as "${legal[0]}"`);
  }
  return pass('name', label);
}

// Longest name first, so "Chandlers Ford" is not also read as something shorter inside it
function mentioned(text, names) {
  let rest = String(text);
  const hits = [];
  for (const n of [...new Set(names.filter(Boolean))].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${esc(n)}s?\\b`, 'gi');
    if (re.test(rest)) { hits.push(n); rest = rest.replace(new RegExp(`\\b${esc(n)}s?\\b`, 'gi'), ' '); }
  }
  return hits;
}

function checkTown(text, intake) {
  const label = 'Only one town from the area list';
  const towns = mentioned(text, [...(intake.areas || []), ...(intake.allAreas || [])]);
  if (towns.length === 1) return pass('town', label, towns[0]);
  return warn('town', label, towns.length ? `names ${towns.length}: ${towns.join(', ')}` : 'names none');
}

// A grouped prompt's choices: each is a name, or a group of names that count as one service
function choicesOf(prompt) {
  if (prompt.kind === 'other' && Array.isArray(prompt.covers)) return prompt.covers.map(c => [c.label, ...c.services]);
  if (prompt.kind === 'service' && Array.isArray(prompt.services) && prompt.services.length > 1) return prompt.services.map(s => [s]);
  return null;
}

function checkGroup(text, prompt) {
  const label = 'No service from the group but the chosen one';
  const choices = choicesOf(prompt);
  if (!choices) return pass('group', label, 'not a grouped prompt');
  const named = choices.filter(names => mentioned(text, names).length);
  if (named.length <= 1) return pass('group', label, named.length ? named[0][0] : 'none named');
  return warn('group', label, `names ${named.length}: ${named.map(n => n[0]).join(', ')}`);
}

// The facts the sample seems to use. Approximate: it reads the words of each fact, so a passing
// mention of "cost" can count. The offer and a free quotes USP are one fact.
function factsUsed(text, intake) {
  const offer = intake.offer || '';
  const usps = (intake.usps || []).filter(u => !(offer && /\bfree\b/i.test(offer) && /\bfree\b/i.test(u)));
  return [...usps, ...(offer ? [offer] : [])].filter(f => wordsDetect(f)(text));
}

function checkFacts(text, intake) {
  const label = 'No more than two facts';
  const used = factsUsed(text, intake);
  return used.length <= 2 ? pass('facts', label, used.join('; ')) : warn('facts', label, `seems to use ${used.length}: ${used.join('; ')}`);
}

function checkClaims(text, intake) {
  const label = 'No numbers, prices or claims beyond the facts';
  const facts = [...(intake.usps || []), intake.offer || '', intake.business || ''].join(' ; ');
  const found = [];
  for (const [re, what] of CLAIMS) { const m = String(text).match(re); if (m && !re.test(facts)) found.push(`${what} ("${m[0]}")`); }
  for (const n of String(text).match(/\d[\d,.]*\d|\d/g) || []) if (!facts.includes(n) && !found.some(f => f.includes(n))) found.push(`the number ${n}`);
  return found.length ? warn('claims', label, found.join('; ')) : pass('claims', label);
}

function checkDated(text, intake) {
  const label = 'No season, weather or date words';
  const m = String(text).match(DATED);
  if (m) return warn('dated', label, `"${m[0]}"`);
  const year = String(text).match(/\b(19|20)\d\d\b/);
  if (year && !(intake.usps || []).join(' ').includes(year[0])) return warn('dated', label, `"${year[0]}"`);
  return pass('dated', label);
}

function checkSample(text, prompt, intake) {
  const words = wordsOf(text).length;
  const checks = [
    words >= MIN_WORDS && words <= MAX_WORDS ? pass('words', `${MIN_WORDS}-${MAX_WORDS} words`, `${words} words`) : warn('words', `${MIN_WORDS}-${MAX_WORDS} words`, `${words} words`),
    checkName(text, intake.business || ''),
    checkTown(text, intake),
    checkGroup(text, prompt),
    checkFacts(text, intake),
    checkClaims(text, intake),
    checkDated(text, intake),
    /^\W*if\b/i.test(String(text)) ? warn('if', 'Does not start with "If"', `starts "${wordsOf(text).slice(0, 5).join(' ')}"`) : pass('if', 'Does not start with "If"'),
  ];
  return { words, checks, warnings: checks.filter(c => c.level === 'warn').length };
}

// Across one prompt's samples: two opening the same way, or sharing a long run of words. Four
// samples are six pairs, so what comes back is condensed: one line per shared opening, and the
// longest phrases only, with none repeated inside a longer one.
const nList = a => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : String(a[0]));
const MAX_PHRASES = 3;
function condense(pairs) {
  const openings = new Map();
  for (const p of pairs.filter(x => x.type === 'opening')) { if (!openings.has(p.text)) openings.set(p.text, new Set()); p.samples.forEach(n => openings.get(p.text).add(n)); }
  const out = [...openings].map(([text, set]) => { const samples = [...set].sort((a, b) => a - b); return { type: 'opening', samples, text, message: `Samples ${nList(samples)} start with the same 5 words: "${text}"` }; });
  const kept = [];
  for (const p of pairs.filter(x => x.type === 'phrase').sort((a, b) => b.text.length - a.text.length)) if (!kept.some(k => k.text.includes(p.text))) kept.push(p);
  return [...out, ...kept.slice(0, MAX_PHRASES)];
}
function sameness(texts) {
  const out = [];
  const list = texts.map((t, i) => ({ n: i + 1, t: tokens(t) })).filter(x => x.t.length);
  for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
    const A = list[a], B = list[b];
    if (A.t.length >= 5 && A.t.slice(0, 5).join(' ') === B.t.slice(0, 5).join(' ')) out.push({ type: 'opening', samples: [A.n, B.n], text: A.t.slice(0, 5).join(' '), message: `Samples ${A.n} and ${B.n} start with the same 5 words: "${A.t.slice(0, 5).join(' ')}"` });
    // The longest run of words the two share
    let best = 0, at = 0;
    const prev = new Array(B.t.length + 1).fill(0);
    for (let i = 1; i <= A.t.length; i++) {
      let diag = 0;
      for (let j = 1; j <= B.t.length; j++) {
        const here = A.t[i - 1] === B.t[j - 1] ? diag + 1 : 0;
        diag = prev[j]; prev[j] = here;
        if (here > best) { best = here; at = i; }
      }
    }
    if (best >= LONG_PHRASE) { const text = A.t.slice(at - best, at).join(' '); out.push({ type: 'phrase', samples: [A.n, B.n], text, message: `Samples ${A.n} and ${B.n} share ${best} words in a row: "${text}"` }); }
  }
  return condense(out);
}

// record: the saved config. A call that fails is one failed sample; the rest stand.
async function runPreview({ record, callModel, samples = SAMPLES, log = null }) {
  const prompts = record.output.prompts;
  const jobs = prompts.flatMap(p => Array.from({ length: samples }, (_, i) => ({ p, i })));
  const results = new Map(prompts.map(p => [p.n, new Array(samples).fill(null)]));
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0 };
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { p, i } = jobs[next++];
      try {
        const r = await callModel({ system: [{ type: 'text', text: SYSTEM }], message: p.text, maxTokens: 1500, effort: EFFORT });
        if (r.usage) { usage.input_tokens += r.usage.input_tokens || 0; usage.output_tokens += r.usage.output_tokens || 0; usage.calls += 1; }
        const text = String(r.text || '').trim();
        results.get(p.n)[i] = { n: i + 1, text, ...checkSample(text, p, record.intake) };
      } catch (e) {
        if (log) log(`[lead snap] preview of prompt ${p.n} failed: ${e.message}`);
        results.get(p.n)[i] = { n: i + 1, text: '', error: e.message, words: 0, checks: [], warnings: 0 };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
  const outPrompts = prompts.map(p => {
    const list = results.get(p.n);
    return { n: p.n, label: p.label, samples: list, sameness: sameness(list.filter(s => !s.error).map(s => s.text)) };
  });
  const all = outPrompts.flatMap(p => p.samples);
  const usd = costUsd(usage);
  return {
    version: 1, at: new Date().toISOString(), config_at: record.generated_at, model: MODEL, effort: EFFORT, per_prompt: samples, usage, usd: Math.round(usd * 1000) / 1000, pence: usage.calls ? pence(usd) : 0,
    summary: { samples: all.length, clean: all.filter(s => !s.error && !s.warnings).length, warned: all.filter(s => s.warnings).length, failed: all.filter(s => s.error).length, alike: outPrompts.filter(p => p.sameness.length).length, prompts: outPrompts.length },
    prompts: outPrompts,
  };
}

module.exports = { SAMPLES, MIN_WORDS, MAX_WORDS, LONG_PHRASE, estimate, checkSample, checkName, factsUsed, sameness, runPreview };
