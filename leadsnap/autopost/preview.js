'use strict';

// ── Lead Snap autopost: Preview posts ────────────────────────────────────────
// A sandbox: each prompt goes to the model 4 times with nothing else around it, the way Lead Snap
// sends one, and the samples are checked. Nothing goes to Lead Snap. Which model Lead Snap's AI
// really is, nobody here knows, so a preview shows how the prompt reads, not exactly what Lead Snap
// will write. The checks only ever warn: the human reads the samples and decides. They warn on what
// is worth stopping for (Brandon, 6 Nov): one prompt repeating itself is accepted, at one repeat
// every 10 weeks or so with a different photo, so samples of one prompt are not compared.

const { wordsDetect } = require('../../gbp/inputs');
const { MODEL, CLAIMS, unconfirmedClaims, townsIn } = require('./generate');
const { SYSTEM } = require('./openings');
const { USD_TO_GBP, priceFor } = require('../../ui/model-log');

const SAMPLES = 4;
const CONCURRENCY = 8;
const EFFORT = 'low';
const MAX_WORDS = 300;            // the prompt still asks for 150-250; only a long overrun is worth a warning
const MAX_FACTS_WARN = 5;
const LONG_PHRASE = 8;            // words in a row shared by two samples
const [USD_IN_PER_M, USD_OUT_PER_M] = priceFor(MODEL);
// Measured on real samples (6 Nov 2026): about 460 tokens out, thinking included, and a token
// for every 2.7 characters of prompt
const OUTPUT_TOKENS_EACH = 460;
const CHARS_PER_TOKEN = 2.7;

const DATED = /\b(spring|summer|autumn|winter|christmas|easter|new year|bank holiday|january|february|march|april|june|july|august|september|october|november|december|today|tomorrow|right now|at the moment|this (?:week|month|year)|next (?:week|month|year)|weather|rain|rainy|rainfall|storms?|frost|frosty|snow|heatwave|freezing|sunshine)\b/i;

const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordsOf = t => String(t).trim().split(/\s+/).filter(Boolean);
const tokens = t => String(t).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
const costUsd = u => ((u.input_tokens || 0) * USD_IN_PER_M + (u.output_tokens || 0) * USD_OUT_PER_M) / 1e6;
const pence = usd => Math.max(1, Math.round(usd * USD_TO_GBP * 100));
const pass = (id, label, detail = '') => ({ id, label, level: 'pass', detail });
const warn = (id, label, detail) => ({ id, label, level: 'warn', detail });
const fail = (id, label, detail) => ({ id, label, level: 'fail', detail });

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
  if (!exact.test(text)) {
    const nearly = String(text).match(new RegExp(`\\b${esc(business.split(/\s+/)[0])}\\b[^.,;!?\\n]{0,30}`, 'i'));
    return warn('name', label, nearly ? `written as "${nearly[0].trim()}"` : 'the business name is missing');
  }
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

// A post names the county or no place at all, never a town, and an Offer post names the county
// (Brandon, 12 Nov). Both are a FAIL: a town on an offer tells everyone else it is not for them.
// A config written before the county (no intake.county) keeps the old town rule below.
function checkTown(text, intake, prompt) {
  if (intake.county) {
    const label = 'Names no town, only the county';
    const towns = townsIn(text, intake);
    if (towns.length) return fail('town', label, `names ${towns.join(', ')}; name ${intake.county} or no place`);
    const offer = prompt && prompt.kind === 'offer';
    const named = (intake.counties || [intake.county]).some(c => new RegExp(`\\b${esc(c)}\\b`, 'i').test(String(text)));
    if (offer && !named) return fail('town', label, `an Offer post must name ${intake.county}, so everyone covered knows it is for them`);
    return pass('town', label, named ? intake.county : 'names no place');
  }
  const label = 'Names its area, and no other town but the main one';
  const towns = mentioned(text, [...(intake.areas || []), ...(intake.allAreas || [])]);
  const area = prompt && prompt.area;
  if (!area) return towns.length <= 2 ? pass('town', label, towns.join(', ') || 'names none') : warn('town', label, `names ${towns.length}: ${towns.join(', ')}`);
  const main = intake.mainTown || (intake.areas || [])[0];
  const others = towns.filter(t => t !== area && t !== main);
  if (others.length) return warn('town', label, `should be ${area}, also names ${others.join(', ')}`);
  return towns.includes(area) ? pass('town', label, towns.join(', ')) : warn('town', label, `should name ${area}; names ${towns.join(', ') || 'none'}`);
}

// Each prompt has its one service. Naming another from its group is what this catches: Trees'
// tree planting prompt going on to tree felling, or other services wandering across them.
function checkGroup(text, prompt) {
  const label = 'No service from the group but the chosen one';
  if (!Array.isArray(prompt.group)) return pass('group', label, 'not a grouped prompt');
  const others = prompt.group.filter(names => !names.includes(prompt.service)).filter(names => mentioned(text, names).length);
  return others.length ? warn('group', label, `also names ${others.map(n => n[0]).join(', ')}`) : pass('group', label, prompt.service);
}

// The facts the sample seems to use. Approximate: it reads the words of each fact, so a passing
// mention of "cost" can count. The offer and a free quotes USP are one fact.
function factsUsed(text, intake) {
  const offer = intake.offer || '';
  const usps = (intake.usps || []).filter(u => !(offer && /\bfree\b/i.test(offer) && /\bfree\b/i.test(u)));
  return [...usps, ...(offer ? [offer] : [])].filter(f => wordsDetect(f)(text));
}

function checkFacts(text, intake) {
  // The prompt asks for two. Reading facts from words is approximate, so only a real pile up warns.
  const label = 'Not piling up facts (warns at 5)';
  const used = factsUsed(text, intake);
  return used.length < MAX_FACTS_WARN ? pass('facts', label, used.join('; ')) : warn('facts', label, `seems to use ${used.length}: ${used.join('; ')}`);
}

// A claim the facts do not make is a FAIL (Brandon, 6 Nov): it could go out under the client's name.
// A bare number is a warning: "two or three coats" style detail may be fine, and a human can tell.
const factsAndName = intake => [...(intake.usps || []), intake.offer || '', intake.business || ''].join(' ; ');
function checkClaims(text, intake) {
  const label = 'No claims beyond the facts';
  const facts = factsAndName(intake);
  const found = unconfirmedClaims(text, facts).map(c => `${c.what} ("${c.match}")`);
  return found.length ? fail('claims', label, found.join('; ')) : pass('claims', label);
}

function checkNumbers(text, intake) {
  const label = 'No numbers beyond the facts';
  const facts = factsAndName(intake);
  const claimed = [...CLAIMS.map(([re]) => String(text).match(re)).filter(Boolean).map(m => m[0]), ...unconfirmedClaims(text, facts).map(c => c.match)].join(' ');
  const found = (String(text).match(/\d[\d,.]*\d|\d/g) || []).filter(n => !facts.includes(n) && !claimed.includes(n));
  return found.length ? warn('numbers', label, found.join(', ')) : pass('numbers', label);
}

// Rain is what a drainage post is about (Brandon, 6 Nov), so its prompts may say so
const isDrainage = prompt => /\bdrain/i.test(`${(prompt && prompt.service) || ''} ${(prompt && prompt.label) || ''}`);

function checkDated(text, intake, prompt) {
  const label = 'No season, weather or date words';
  const body = isDrainage(prompt) ? String(text).replace(/\brain(y|fall)?\b/gi, ' ') : String(text);
  const m = body.match(DATED);
  if (m) return warn('dated', label, `"${m[0]}"`);
  const year = body.match(/\b(19|20)\d\d\b/);
  if (year && !(intake.usps || []).join(' ').includes(year[0])) return warn('dated', label, `"${year[0]}"`);
  return pass('dated', label);
}

function checkSample(text, prompt, intake) {
  const words = wordsOf(text).length;
  const checks = [
    words <= MAX_WORDS ? pass('words', `No more than ${MAX_WORDS} words`, `${words} words`) : warn('words', `No more than ${MAX_WORDS} words`, `${words} words`),
    checkName(text, intake.business || ''),
    checkTown(text, intake, prompt),
    checkGroup(text, prompt),
    checkFacts(text, intake),
    checkClaims(text, intake),
    checkNumbers(text, intake),
    checkDated(text, intake, prompt),
    /^\W*if\b/i.test(String(text)) ? warn('if', 'Does not start with "If"', `starts "${wordsOf(text).slice(0, 5).join(' ')}"`) : pass('if', 'Does not start with "If"'),
  ];
  return { words, checks, warnings: checks.filter(c => c.level === 'warn').length, fails: checks.filter(c => c.level === 'fail').length };
}

const nList = a => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : String(a[0]));
const MAX_PHRASES = 3;

// A sample without its call to action (the last sentence) and any sentence carrying a fact. Those
// repeat on purpose, so a phrase shared there says nothing about the writing.
function withoutFactsAndCta(text, intake = {}) {
  const sentences = String(text).trim().split(/(?<=[.!?])\s+/);
  return sentences.slice(0, -1).filter(s => !factsUsed(s, intake).length).join(' ');
}

// items: [{ ref, group, text, body }]: only pairs from different prompts are compared. The opening
// is read from the whole post, the phrases from the body.
function comparePairs(items) {
  const list = items.map(x => ({ ...x, t: tokens(x.text), b: tokens(x.body) })).filter(x => x.t.length);
  const out = [];
  let compared = 0;
  for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
    const A = list[a], B = list[b];
    if (A.group === B.group) continue;
    compared++;
    if (A.t.length >= 5 && A.t.slice(0, 5).join(' ') === B.t.slice(0, 5).join(' ')) out.push({ type: 'opening', refs: [A.ref, B.ref], text: A.t.slice(0, 5).join(' ') });
    // The longest run of words the two share
    let best = 0, at = 0;
    const prev = new Array(B.b.length + 1).fill(0);
    for (let i = 1; i <= A.b.length; i++) {
      let diag = 0;
      for (let j = 1; j <= B.b.length; j++) {
        const here = A.b[i - 1] === B.b[j - 1] ? diag + 1 : 0;
        diag = prev[j]; prev[j] = here;
        if (here > best) { best = here; at = i; }
      }
    }
    if (best >= LONG_PHRASE) out.push({ type: 'phrase', refs: [A.ref, B.ref], words: best, text: A.b.slice(at - best, at).join(' ') });
  }
  return { pairs: out, compared };
}

// Only a shared opening warns. The phrases are kept for information: the longest few, none repeated
// inside a longer one.
function condense(pairs) {
  const openings = new Map();
  for (const p of pairs.filter(x => x.type === 'opening')) { if (!openings.has(p.text)) openings.set(p.text, new Set()); p.refs.forEach(r => openings.get(p.text).add(r)); }
  const warnings = [...openings].map(([text, set]) => { const refs = [...set]; return { type: 'opening', refs, text, message: `${nList(refs)} start with the same 5 words: "${text}"` }; });
  const kept = [];
  for (const p of pairs.filter(x => x.type === 'phrase').sort((a, b) => b.text.length - a.text.length)) if (!kept.some(k => k.text.includes(p.text))) kept.push(p);
  return { warnings, phrases: kept.slice(0, MAX_PHRASES).map(p => ({ refs: p.refs, words: p.words, text: p.text })) };
}

// Across the prompts that share a photo folder: posts that sit side by side on one set of photos
function folderSameness(prompts, record) {
  const folderOf = new Map(record.output.prompts.map(p => [p.n, p.folder]));
  const byFolder = new Map();
  for (const p of prompts) { const f = folderOf.get(p.n); if (!byFolder.has(f)) byFolder.set(f, []); byFolder.get(f).push(p); }
  const out = [];
  for (const [folder, list] of byFolder) {
    if (list.length < 2 || folder === 'None yet') continue;
    const intake = record.intake || {};
    const items = list.flatMap(p => p.samples.filter(s => !s.error).map(s => ({ ref: `P${p.n}.${s.n}`, group: p.n, text: s.text, body: withoutFactsAndCta(s.text, intake) })));
    const { pairs, compared } = comparePairs(items);
    const openings = pairs.filter(x => x.type === 'opening');
    const phrases = pairs.filter(x => x.type === 'phrase');
    out.push({ folder, prompts: list.map(p => p.n), compared, opening_pairs: openings.length, phrase_pairs: phrases.length, longest: phrases.reduce((n, x) => Math.max(n, x.words), 0), ...condense(pairs) });
  }
  return out;
}

// Which towns the prompts were given and the samples named, across the whole client
function areaSpread(prompts, record) {
  const intake = record.intake || {};
  const list = [...new Set([...(intake.areas || []), ...(intake.allAreas || [])])];
  const assigned = Object.fromEntries((intake.areas || []).map(a => [a, 0]));
  const named = Object.fromEntries(list.map(a => [a, 0]));
  let onArea = 0, samples = 0;
  for (const p of prompts) {
    const rp = record.output.prompts.find(x => x.n === p.n) || {};
    if (rp.area) assigned[rp.area] = (assigned[rp.area] || 0) + 1;
    for (const s of p.samples.filter(x => !x.error)) {
      samples++;
      const towns = mentioned(s.text, list);
      towns.forEach(t => { named[t] = (named[t] || 0) + 1; });
      if (rp.area && towns.includes(rp.area)) onArea++;
    }
  }
  return { assigned, named, on_area: onArea, samples };
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
        results.get(p.n)[i] = { n: i + 1, text: '', error: e.message, words: 0, checks: [], warnings: 0, fails: 0 };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
  const outPrompts = prompts.map(p => {
    const list = results.get(p.n);
    return { n: p.n, label: p.label, samples: list };
  });
  const all = outPrompts.flatMap(p => p.samples);
  const folders = folderSameness(outPrompts, record);
  const areas = areaSpread(outPrompts, record);
  const usd = costUsd(usage);
  return {
    version: 1, at: new Date().toISOString(), config_at: record.generated_at, model: MODEL, effort: EFFORT, per_prompt: samples, usage, usd: Math.round(usd * 1000) / 1000, pence: usage.calls ? pence(usd) : 0,
    summary: { samples: all.length, clean: all.filter(s => !s.error && !s.warnings && !s.fails).length, warned: all.filter(s => s.warnings && !s.fails).length, claim_failed: all.filter(s => s.fails).length, failed: all.filter(s => s.error).length, prompts: outPrompts.length, folders: folders.length, opening_pairs: folders.reduce((n, f) => n + f.opening_pairs, 0), compared: folders.reduce((n, f) => n + f.compared, 0) },
    prompts: outPrompts,
    folders,
    areas,
  };
}

module.exports = { areaSpread, folderSameness, withoutFactsAndCta, comparePairs, SAMPLES, MAX_WORDS, EFFORT, LONG_PHRASE, estimate, checkSample, checkName, factsUsed, runPreview };
