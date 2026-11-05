'use strict';

// ── Lead Snap autopost: the model call, the checks, the config sheet ─────────
// System prompt: prompts/LeadSnap_Autopost_CORE.md (Brandon's, word for word) and
// prompts/LeadSnap_Autopost_Format.md (the spec's output format). The message carries the intake
// and the DECISIONS code already made. A reply that fails the checks runs once more with the
// failures, as the GBP job does. The sheet is then assembled here: code's settings, labels and
// folders around the model's prompt text, so those can never drift.

const fs = require('fs');
const path = require('path');
const { decide } = require('./decide');

const MODEL = 'claude-sonnet-5-5';
const MAX_TOKENS = 8000;
const CHECKLIST = ['Settings set', 'All prompts pasted', 'Photos selected for every prompt (none mixed between services)', 'Saved and started; first post checked on All Posts page'];
const FREQUENCY = 'Custom - twice per week';

const readPrompt = f => fs.readFileSync(path.join(__dirname, '../../prompts', f), 'utf8').trim();
const loadSystem = () => `${readPrompt('LeadSnap_Autopost_CORE.md')}\n\n${readPrompt('LeadSnap_Autopost_Format.md')}`;

const imagesLine = folder => `Choose specific images from GBP or upload -> select from folder: ${folder}`;
const list = a => (a && a.length ? a.join(', ') : 'none');

function buildMessage(intake, D) {
  return [
    'CLIENT INTAKE',
    `Business name: ${intake.business}`,
    `Niche: ${intake.niche}`,
    `Services, ranked by value: ${intake.groups.map(g => g.label).join('; ')}`,
    `Main town: ${intake.mainTown}`,
    `Nearby areas: ${list(intake.nearby)}`,
    `USPs (the facts, as given): ${list(intake.usps)}`,
    `Standing offer: ${intake.offer || 'none confirmed'}`,
    `CTA: ${intake.cta.line}`,
    `Tone: ${intake.tone}`,
    `Photo counts: ${intake.groups.map(g => `${g.label} ${g.photos}`).join(', ')}; Brand ${intake.brand}`,
    `Things to avoid: ${intake.avoid || 'none given'}`,
    '',
    'DECISIONS (already made by code; follow them exactly)',
    `CTA sentence for the end of every prompt: ${intake.cta.sentence}`,
    `Area list for every prompt: ${intake.areas.join(', ')}`,
    `Write exactly ${D.prompts.length} prompts, in this order:`,
    ...D.prompts.map(p => `PROMPT ${p.n} - ${p.label} | type: ${p.kind}${p.kind === 'service' ? ` | covers: ${p.services.join(', ')}` : ''}${p.kind === 'other' ? ` | one of these per post, chosen at random: ${p.services.join('; ')}` : ''} | Images folder: ${p.folder}`),
    '',
    D.gaps.length ? `PHOTO GAPS to write, one line each, in this order: ${D.gaps.map(g => `${g.label} (${g.photos} photos)`).join('; ')}` : 'PHOTO GAPS: none.',
  ].join('\n');
}

// The reply as a sheet: the prompts' text by number, and the gap lines
function parseSheet(text) {
  const t = String(text || '').replace(/\r\n/g, '\n').replace(/^```[a-z]*\n?|\n?```\s*$/g, '');
  const marks = [...t.matchAll(/^PROMPT\s+(\d+)\s*-\s*(.*)$/gm)];
  const gapAt = t.search(/^PHOTO GAPS\s*$/m);
  const checkAt = t.search(/^VA CHECKLIST\s*$/m);
  const prompts = marks.map((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : gapAt >= 0 ? gapAt : t.length;
    const body = t.slice(m.index, end);
    const at = body.search(/^Prompt:\s*$/m);
    return { n: Number(m[1]), label: m[2].trim(), text: at >= 0 ? body.slice(at).replace(/^Prompt:\s*\n/, '').trim() : '' };
  });
  const gapBlock = gapAt >= 0 ? t.slice(gapAt, checkAt > gapAt ? checkAt : t.length) : '';
  const gaps = gapBlock.split('\n').filter(l => /^\s*-\s/.test(l)).map(l => l.replace(/^\s*-\s*/, '').trim());
  return { prompts, gaps };
}

// ── The checks ──
const has = (t, s) => String(t).toLowerCase().includes(String(s).toLowerCase());
const RULES = [
  [/Pick ONE area( from the list)? and mention it naturally once/i, '"Pick ONE area from the list and mention it naturally once."'],
  [/Write 150-300 words in plain UK English, no headings, no hashtags, no emoji/i, '"Write 150-300 words in plain UK English, no headings, no hashtags, no emoji."'],
  [/with the town or area naturally/i, 'the service name "with the town or area naturally once or twice"'],
  [/Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here/i, '"Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here."'],
  [/Do not mention seasons, weather, holidays or dates/i, '"Do not mention seasons, weather, holidays or dates."'],
  [/No generic filler/i, '"No generic filler."'],
  [/End with one sentence that leads into the button:/i, '"End with one sentence that leads into the button: [CTA sentence]."'],
];
// A claim a prompt may only make when the facts make it (CLAUDE.md, the claims rule)
const CLAIMS = [
  [/£\s?\d/, 'a price'], [/\b24\/7\b|\b24 hours\b/i, '24/7 cover'], [/\bsame[- ]day\b/i, 'same day work'],
  [/\bfree\s+(\w+\s+)?(quotes?|estimates?|inspections?|surveys?|visits?|consultations?)\b/i, 'something free'], [/\bfixed[- ]price/i, 'fixed prices'],
  [/\bguarantee|\bwarrant(y|ies)\b/i, 'a guarantee'], [/\b\d+\+?\s+years?\b/i, 'a number of years'], [/\binsured\b|\binsurance\b/i, 'insurance'],
  [/\baccredit|\bcertified\b|\bregistered\b|\bGas Safe\b|\bNICEIC\b|\bCheckatrade\b|\bTrustMark\b/i, 'an accreditation'], [/\b\d+\s+(star|reviews?)\b/i, 'a review count'],
];
const DATED = /\b(spring|summer|autumn|winter|christmas|easter|new year|bank holiday|january|february|march|april|june|july|august|september|october|november|december)\b/i;
const WEATHER = /\b(storms?|frost|snow|heatwave|freezing)\b/i;
const strip = t => { let s = String(t); for (const [re] of RULES) s = s.replace(re, ''); return s; };

function validateSheet(parsed, intake, D) {
  const fails = [], flags = [];
  const fail = (n, message) => fails.push({ field: n ? `Prompt ${n}` : 'sheet', message: n ? `Prompt ${n}: ${message}` : message });
  const flag = (n, message) => flags.push({ field: `Prompt ${n}`, message: `Prompt ${n}: ${message}` });
  if (parsed.prompts.length !== D.prompts.length) fail(null, `The sheet has ${parsed.prompts.length} prompts; write exactly ${D.prompts.length}, as DECISIONS lists them.`);
  const factsText = [...intake.usps, intake.offer].join(' ; ');
  const avoid = String(intake.avoid || '').split(/[;,\n]/).map(s => s.trim()).filter(s => s.length > 1);
  for (const d of D.prompts) {
    const p = parsed.prompts.find(x => x.n === d.n);
    if (!p || !p.text) { fail(d.n, 'has no text under "Prompt:".'); continue; }
    const t = p.text;
    if (!has(t, intake.business)) fail(d.n, `does not name the business, "${intake.business}".`);
    for (const a of intake.areas) if (!has(t, a)) fail(d.n, `the area list is missing ${a}.`);
    for (const [re, want] of RULES) if (!re.test(t)) fail(d.n, `is missing the rule ${want}`);
    if (!has(t, intake.cta.sentence)) fail(d.n, `must end the rules with the CTA sentence: "${intake.cta.sentence}".`);
    if (!/Pick one (angle|tip)\b[^\n]*at random/i.test(t)) fail(d.n, 'needs the instruction "Pick one angle at random for this post:" (for tips, "Pick one tip at random for this post:").');
    const bullets = t.split('\n').filter(l => /^\s*-\s+\S/.test(l)).length;
    // The spec lists three offer angles and points the other services prompt at the service angles
    const minBullets = d.kind === 'offer' ? 3 : 4;
    if (bullets < minBullets || bullets > 6) fail(d.n, `has ${bullets} angles; write ${minBullets} to 6, one per line starting "- ".`);
    for (const u of intake.usps) if (!has(t, u)) fail(d.n, `is missing the fact "${u}"; list every fact as given.`);
    if (d.kind === 'service' && !d.services.some(s => has(t, s))) fail(d.n, `does not name the service (${d.services.join(', ')}).`);
    if (d.kind === 'other') for (const s of d.services) if (!has(t, s)) fail(d.n, `does not list "${s}".`);
    if (d.kind === 'offer' && !has(t, intake.offer)) fail(d.n, `does not state the offer, "${intake.offer}".`);
    if (/[–—]/.test(t)) fail(d.n, 'has an em or en dash; use commas or full stops.');
    const body = strip(t);
    for (const [re, what] of CLAIMS) { const m = body.match(re); if (m && !re.test(factsText)) fail(d.n, `claims ${what} ("${m[0]}"), which is not in the facts. Remove it.`); }
    const dated = body.match(DATED);
    if (dated) fail(d.n, `mentions "${dated[0]}"; prompts stay accurate in any month.`);
    for (const w of avoid) if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(body)) fail(d.n, `uses "${w}", which the client wants avoided.`);
    const wet = body.match(WEATHER);
    if (wet) flag(d.n, `mentions "${wet[0]}"; check it reads true in any month.`);
  }
  return { ok: !fails.length, fails, flags };
}

// ── The sheet ──
function gapLine(gap, reply) {
  const given = (reply || []).find(l => l.toLowerCase().startsWith(`${gap.label.toLowerCase()}:`));
  const m = given && given.match(/Ask the client for .*$/i);
  const ask = m ? m[0].replace(/\.?$/, '.') : `Ask the client for 3-4 photos of finished ${gap.label.toLowerCase()} jobs.`;
  return `${gap.label}: ${gap.photos} photo${gap.photos === 1 ? '' : 's'}. ${ask}`;
}

function assemble(parsed, intake, D) {
  const prompts = D.prompts.map(d => {
    const text = parsed.prompts.find(p => p.n === d.n).text;
    const label = d.kind === 'other' ? `Other services: ${d.services.map(s => s.toLowerCase()).join(', ')}` : d.label;
    return { n: d.n, kind: d.kind, label, tone: intake.tone, folder: d.folder, photos: d.photos, why: d.why, images: imagesLine(d.folder), text, chars: [...text].length };
  });
  const gaps = D.gaps.map(g => ({ ...g, line: gapLine(g, parsed.gaps) }));
  const settings = { frequency: FREQUENCY, cta: intake.cta.line, cta_type: intake.cta.type, cta_url: intake.cta.url, tone: intake.tone };
  return { business: intake.business, settings, prompts, gaps, checklist: CHECKLIST, notes: D.notes };
}

function sheetText(o) {
  const L = [`LEAD SNAP AUTOPOST CONFIG - ${o.business}`, '', 'SETTINGS', `Frequency: ${o.settings.frequency}`, `Call to action: ${o.settings.cta}`, ''];
  for (const p of o.prompts) L.push(`PROMPT ${p.n} - ${p.label}`, `Tone: ${p.tone}`, `Images: ${p.images}`, 'Prompt:', p.text, '');
  L.push('PHOTO GAPS', ...(o.gaps.length ? o.gaps.map(g => `- ${g.line}`) : ['None.']), '', 'VA CHECKLIST', ...o.checklist.map(c => `[ ] ${c}`));
  return L.join('\n');
}

// previous: the saved record. A failed run keeps its good config, since a VA may have pasted it.
async function runAutopost({ intake, callModel, previous = null, log = null }) {
  const D = decide(intake);
  const system = loadSystem();
  const message = buildMessage(intake, D);
  let msg = message, parsed = null, validation = null, raw = '', attempts = 0;
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0 };
  while (attempts < 2) {
    attempts++;
    const r = await callModel({ system: [{ type: 'text', text: system }], message: msg, maxTokens: MAX_TOKENS });
    raw = r.text;
    if (r.usage) { usage.input_tokens += r.usage.input_tokens || 0; usage.output_tokens += r.usage.output_tokens || 0; usage.calls += 1; }
    parsed = parseSheet(raw);
    validation = validateSheet(parsed, intake, D);
    if (validation.ok) break;
    if (log) log(`[lead snap] attempt ${attempts} failed ${validation.fails.length} check(s)`);
    msg = `${message}\n\nYOUR PREVIOUS ANSWER FAILED THESE CHECKS. Write the whole sheet again, fixing every one:\n${validation.fails.map(f => `- ${f.message}`).join('\n')}\n\nPREVIOUS ANSWER:\n${String(raw).slice(0, 24000)}`;
  }
  const at = new Date().toISOString();
  if (!validation.ok) {
    return { ...(previous || {}), version: 1, model: MODEL, failure: { at, error: `The config failed ${validation.fails.length} check(s) after a retry${previous && previous.sheet ? '; the last good config is kept' : ''}.`, fails: validation.fails, attempts, raw } };
  }
  const output = assemble(parsed, intake, D);
  return {
    version: 1, model: MODEL, generated_at: at, attempts, usage, output, sheet: sheetText(output), flags: validation.flags, failure: null,
    intake: { business: intake.business, niche: intake.niche, areas: intake.areas, areasWhy: intake.areasWhy, usps: intake.usps, groups: intake.groups, brand: intake.brand, offer: intake.offer, cta: intake.cta, tone: intake.tone, avoid: intake.avoid },
  };
}

function filesFor(rec) {
  if (!rec || !rec.sheet) return {};
  return { 'autopost-config.txt': rec.sheet, 'validation.json': JSON.stringify({ generated_at: rec.generated_at, model: rec.model, attempts: rec.attempts, flags: rec.flags, intake: rec.intake, notes: rec.output.notes }, null, 2) };
}

module.exports = { MODEL, MAX_TOKENS, CHECKLIST, loadSystem, buildMessage, parseSheet, validateSheet, assemble, sheetText, runAutopost, filesFor };
