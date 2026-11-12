'use strict';

// ── Lead Snap autopost: the model call, the checks, the config sheet ─────────
// System prompt: prompts/LeadSnap_Autopost_CORE.md (Brandon's, word for word) and
// prompts/LeadSnap_Autopost_Format.md (the spec's output format). The message carries the intake
// and the DECISIONS code already made. A reply that fails the checks runs once more with the
// failures, as the GBP job does. The sheet is then assembled here: code's settings, labels and
// folders around the model's prompt text, so those can never drift.

const fs = require('fs');
const path = require('path');
const { decide, QUESTION_ANGLE, QUESTION_RULE } = require('./decide');
const { sampleOpenings, othersInFolder, addDontStart } = require('./openings');

const MODEL = 'claude-sonnet-5-5';
const MAX_TOKENS = 12000;
const CHECKLIST = ['Settings set', 'All prompts pasted', "Each folder's photos selected once and reused for its prompts (none mixed between services)", 'Saved and started; first post checked on All Posts page'];
const FREQUENCY = 'Custom - twice per week';

const readPrompt = f => fs.readFileSync(path.join(__dirname, '../../prompts', f), 'utf8').trim();
const loadSystem = () => `${readPrompt('LeadSnap_Autopost_CORE.md')}\n\n${readPrompt('LeadSnap_Autopost_Format.md')}`;

const imagesLine = folder => `Choose specific images from GBP or upload -> select from folder: ${folder}`;
const list = a => (a && a.length ? a.join(', ') : 'none');

const withPages = g => `${g.label}${g.services.length > 1 || g.services[0] !== g.label ? ` (${g.services.join(', ')})` : ''}`;

function buildMessage(intake, D) {
  return [
    'CLIENT INTAKE',
    `Business name: ${intake.business}`,
    `Niche: ${intake.niche}`,
    `Services, ranked by value (each is a short name; the pages it covers follow in brackets): ${intake.groups.map(withPages).join('; ')}`,
    `County (the only place a post may name; never a town): ${intake.county}`,
    `USPs (the facts, as given): ${list(intake.usps)}`,
    `Standing offer: ${intake.offer || 'none confirmed'}`,
    `CTA: ${intake.cta.line}`,
    `Tone: ${intake.tone}`,
    `Photo counts: ${intake.groups.map(g => `${g.label} ${g.photos}`).join(', ')}; Brand ${intake.brand}`,
    `Things to avoid: ${intake.avoid || 'none given'}`,
    '',
    'DECISIONS (already made by code; follow them exactly)',
    `CTA sentence for the end of every prompt: ${intake.cta.sentence}`,
        `Write exactly ${D.prompts.length} prompts, in this order:`,
    ...D.prompts.map(p => `PROMPT ${p.n} - ${p.label} | type: ${p.kind}${p.service ? ` | the one service, in lower case as in running text: ${p.service.toLowerCase()}` : ''} | the one angle: ${p.angle} | Images folder: ${p.folder}`),
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

// ── The fixed text is code's ──
// Everything in a prompt but its one angle is the same words every time, so code writes it and a
// required sentence cannot go missing. (The model dropped one somewhere in 2 of 3 real plumber runs,
// and one slip in 20 prompts failed the whole config.) The model's part is the angle sentence.
const angleFrom = text => {
  const lines = String(text).split('\n');
  const i = lines.findIndex(l => /around this (?:angle|tip):/i.test(l));
  if (i < 0) return '';
  const same = lines[i].replace(/^.*around this (?:angle|tip):\s*/i, '').trim();
  if (same) return same;
  const next = lines.slice(i + 1).find(l => l.trim());
  return next ? next.replace(/^\s*[-*\u2022]\s*/, '').trim() : '';
};

// Where a post may say it works (Brandon, 12 Nov). A post names the county or no place at all, never
// a town: Copybot cannot know which town a photo's job was in, and an offer is for everyone covered.
// The offer post always names the county, so no one reads it as one town's offer.
const NO_TOWN = 'Never name a town, city or village.';
const placeRule = (d, county) => (d.kind === 'offer'
  ? `Name ${county} once, as the area the offer covers. ${NO_TOWN}`
  : `If you name a place, name ${county} only. ${NO_TOWN}`);

function promptText(d, intake, angle) {
  const niche = String(intake.niche || '').toLowerCase();
  const article = /^[aeiou]/.test(niche) ? 'an' : 'a';
  const offer = String(intake.offer || '');
  const about = d.service ? d.service.toLowerCase() : d.kind === 'trust' ? `why customers choose ${intake.business}` : d.kind === 'offer' ? `its ${offer}` : 'one practical tip for its customers';
  const keyword = d.service ? d.service.toLowerCase() : d.kind === 'offer' ? offer : niche;
  const facts = [...intake.usps, ...(d.kind === 'offer' && offer ? [offer] : [])];
  const tip = d.kind === 'tips';
  return [
    `Write a Google Business Profile post for ${intake.business}, ${article} ${niche}, about ${about}.`,
    `Facts you may use (no more than two, chosen to fit the angle): ${facts.length ? facts.join('; ') : 'none'}. Do not use any other facts.`,
    placeRule(d, intake.county),
    `Build the whole post around this ${tip ? 'tip' : 'angle'}: ${angle}${d.angle === QUESTION_ANGLE ? ` ${QUESTION_RULE}` : ''}`,
    `${tip ? `Explain the tip clearly, then say when it's time to call ${article} ${niche}. ` : ''}Write 150-250 words in plain UK English, no headings, no hashtags, no emoji. Don't start with "If". Use the business name once, written exactly like this: ${intake.business}. Use "${keyword}" naturally once or twice. Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here. Do not describe customers, what they say, how many there are or how often you work for them. Do not mention warranties, guarantees or accreditations unless they are in the facts. Do not give measurements, sizes or figures unless they are in the facts. Do not mention seasons, weather, holidays, dates or time words such as "today", "this week", "right now" or "at the moment". No generic filler. Tone: ${intake.tone}. End with one sentence that leads into the button: ${intake.cta.sentence}.`,
  ].join('\n\n');
}

// The model's angle sentence in code's text. A prompt with no angle stays empty, for the checks to catch.
function rebuildPrompts(parsed, intake, D) {
  for (const p of parsed.prompts) {
    const d = D.prompts.find(x => x.n === p.n);
    const angle = d && angleFrom(p.text);
    if (d && angle) p.text = promptText(d, intake, angle);
  }
  return parsed;
}

// ── The checks ──
const has = (t, s) => String(t).toLowerCase().includes(String(s).toLowerCase());
const RULES = [
  [/Never name a town, city or village\./, '"Never name a town, city or village."'],
  [/no more than two, chosen to fit the angle/i, '"Facts you may use (no more than two, chosen to fit the angle):"'],
  [/Build the whole post around this (angle|tip):/i, '"Build the whole post around this angle:" (for tips, "... this tip:")'],
  [/Write 150-250 words in plain UK English, no headings, no hashtags, no emoji/i, '"Write 150-250 words in plain UK English, no headings, no hashtags, no emoji."'],
  [/Don['\u2019]t start with ["\u201c]If["\u201d]/i, '"Don\'t start with \"If\"."'],
  [/naturally once or twice/i, 'the service name "naturally once or twice"'],
  [/Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here/i, '"Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here."'],
  [/Do not describe customers, what they say, how many there are or how often you work for them/i, '"Do not describe customers, what they say, how many there are or how often you work for them."'],
  [/Do not give measurements, sizes or figures unless they are in the facts/i, '"Do not give measurements, sizes or figures unless they are in the facts."'],
  [/Do not mention warranties, guarantees or accreditations unless they are in the facts/i, '"Do not mention warranties, guarantees or accreditations unless they are in the facts."'],
  [/Do not mention seasons, weather, holidays, dates or time words such as ["\u201c]today["\u201d], ["\u201c]this week["\u201d], ["\u201c]right now["\u201d] or ["\u201c]at the moment["\u201d]/i, "\"Do not mention seasons, weather, holidays, dates or time words such as 'today', 'this week', 'right now' or 'at the moment'.\""],
  [/No generic filler/i, '"No generic filler."'],
  [/End with one sentence that leads into the button:/i, '"End with one sentence that leads into the button: [CTA sentence]."'],
];
// Lead Snap's real limit is not known yet, so nothing warns on length (Brandon, 6 Nov). When it is, set it here.
const PROMPT_CHAR_LIMIT = null;
// A claim a prompt may only make when the facts make it (CLAUDE.md, the claims rule)
const CLAIMS = [
  [/£\s?\d/, 'a price'], [/\b24\/7\b|\b24 hours\b/i, '24/7 cover'], [/\bsame[- ]day\b/i, 'same day work'],
  [/\bfree\s+(\w+\s+)?(quotes?|estimates?|inspections?|surveys?|visits?|consultations?)\b/i, 'something free'], [/\bfixed[- ]price/i, 'fixed prices'],
  [/\bguarantee|\bwarrant(y|ies)\b/i, 'a guarantee'], [/\b\d+\+?\s+years?\b/i, 'a number of years'], [/\binsured\b|\binsurance\b/i, 'insurance'],
  [/\baccredit|\bcertified\b|\bregistered\b|\bGas Safe\b|\bNICEIC\b|\bCheckatrade\b|\bTrustMark\b/i, 'an accreditation'], [/\b\d+\s+(star|reviews?)\b/i, 'a review count'],
  // An invented measurement (Brandon, 6 Nov): a number with a unit, or a decimal. Not a price (£5m) or
  // a percentage. The third item means the very figure must be in the facts, not just any measurement.
  [/(?<![£$\d.,])\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|twelve|half\s+a)[\s-]*(?:mm|cm|km|m|metres?|meters?|millimetres?|centimetres?|ft|feet|foot|inch(?:es)?|yards?|miles?|m2|m\u00b2|sq\s?m|square\s+(?:metres?|meters?|feet|foot)|litres?|liters?|kg|kilos?|tonnes?|degrees?)(?![\w\u00b2])/i, 'a measurement', true],
  [/(?<![£$\d.,])\b\d+\.\d+\b(?!\s*%)/, 'a measurement', true],
  // Invented social proof (Brandon, 6 Nov). Each reads as something about this firm's customers:
  // "most homeowners ignore a dripping tap" is a statement about taps, and passes.
  [/\b(?:most|many|all|some|lots|plenty|several|a lot)\s+of\s+our\s+(?:customers|clients)\b/i, 'what customers do'],
  [/\bour\s+(?:customers|clients)\s+(?:\w+\s+)?(?:tell|say|ask|love|recommend|keep|come|came|return|choose|often|always|regularly|usually)\b/i, 'what customers say'],
  [/\b(?:customers|clients|people|homeowners|residents|families|neighbours)\s+(?:\w+\s+)?(?:tell|ask|asks|recommend|recommends)\s+us\b/i, 'what customers say'],
  [/\bwhy\s+so\s+many\b/i, 'how many customers'],
  [/\b(?:[Cc]ustomers|[Cc]lients|[Pp]eople|[Hh]omeowners|[Rr]esidents|[Ff]amilies|[Nn]eighbours)(?:\s+(?:in|around|across|from)\s+[A-Z][\w']*(?:\s+[A-Z][\w']*)?)?\s+(?:often|regularly|always|usually|frequently|sometimes|tend\s+to)\s+(?:ask|tell|say|want\s+to\s+know|call|come\s+to\s+us|get\s+in\s+touch)\b/, 'what customers say'],
  [/\b(?:so many|many|most|lots of|plenty of|hundreds of|thousands of|countless|more and more)\s+(?:local\s+|of\s+the\s+)?(?:people|customers|clients|homeowners|families|residents|households)\b[^.!?\n]{0,50}\b(?:ask(?:ing)? for us|get(?:ting)? in touch|call(?:ing)? us|choos(?:e|ing) us|come (?:back )?to us|recommend(?:ing)? us|us(?:e|ing) us|trust(?:ing)? us|rely(?:ing)? on us|turn(?:ing)? to us|contact(?:ing)? us|book(?:ing)? (?:with )?us)\b/i, 'how many customers'],
  [/\b(?:recommend(?:s|ed)?\s+us|ask(?:s|ed)?\s+for\s+us(?:\s+again)?|(?:customers|clients|people|homeowners|they)\s+(?:\w+\s+)?come\s+back\s+to\s+us|keep\s+coming\s+back|repeat\s+(?:customers?|business|work)|word\s+of\s+mouth|(?:happy|satisfied|delighted|loyal|regular|returning)\s+(?:customers?|clients?))\b/i, 'what customers do'],
  [/\bwe(?:'re| are|'ve| have)?\s+(?:\w+\s+)?(?:regularly|often|frequently|routinely|constantly|usually)\s+(?:help(?:ed|ing)?|work(?:ed|ing)?|serv(?:e|ed|ing)|visit(?:ed|ing)?|see|seen|hear|heard|asked|called|get\s+asked)\b/i, 'how often the firm works'],
  [/\bquestions?\s+we\s+(?:\w+\s+)?(?:hear|get|are\s+asked)\b|\bthings?\s+we\s+(?:\w+\s+)?(?:hear|are\s+asked|get\s+asked)\b|\bwe(?:'re| are)\s+(?:\w+\s+)?asked\b/i, 'what customers say'],
];
// The claims a text makes that the facts do not. Most claims need the facts to make the same kind of
// claim; a measurement needs that exact figure.
const allMatches = (re, text) => [...String(text).matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))].map(m => m[0]);
function unconfirmedClaims(text, facts) {
  const found = [];
  for (const [re, what, exact] of CLAIMS) {
    if (exact) {
      // Every figure counts, and each must be a figure the facts give
      const given = new Set(allMatches(re, facts).map(m => m.toLowerCase()));
      for (const m of allMatches(re, text)) if (!given.has(m.toLowerCase())) found.push({ what, match: m });
      continue;
    }
    const m = String(text).match(re);
    if (m && !re.test(facts)) found.push({ what, match: m[0] });
  }
  return found;
}

const DATED = /\b(today|tomorrow|this week|this month|this year|right now|at the moment|spring|summer|autumn|winter|christmas|easter|new year|bank holiday|january|february|march|april|june|july|august|september|october|november|december)\b/i;
const WEATHER = /\b(storms?|frost|snow|heatwave|freezing)\b/i;
const strip = t => { let s = String(t); for (const [re] of RULES) s = s.replace(re, ''); return s; };

// The client's towns a text names, the county left out (a county may share a town's name: Durham).
// Case as written, so "hook" the word is not Hook the village.
const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function townsIn(text, intake) {
  const counties = new Set((intake.counties || []).map(c => String(c).toLowerCase()));
  const names = [...new Set([...(intake.areas || []), ...(intake.allAreas || [])].filter(n => n && !counties.has(String(n).toLowerCase())))].sort((a, b) => b.length - a.length);
  let rest = String(text);
  const hits = [];
  for (const n of names) {
    const re = new RegExp(`(?<![\\w'-])${escRe(n)}(?![\\w-])`, 'g');
    if (re.test(rest)) { hits.push(n); rest = rest.replace(re, ' '); }
  }
  return hits;
}

function validateSheet(parsed, intake, D) {
  const fails = [], flags = [];
  const fail = (n, message) => fails.push({ field: n ? `Prompt ${n}` : 'sheet', message: n ? `Prompt ${n}: ${message}` : message });
  const flag = (n, message) => flags.push({ field: `Prompt ${n}`, message: `Prompt ${n}: ${message}` });
  if (parsed.prompts.length !== D.prompts.length) fail(null, `The sheet has ${parsed.prompts.length} prompts; write exactly ${D.prompts.length}, as DECISIONS lists them.`);
  const factsText = [...intake.usps, intake.offer].join(' ; ');
  const seenAngles = new Map();
  const avoid = String(intake.avoid || '').split(/[;,\n]/).map(s => s.trim()).filter(s => s.length > 1);
  for (const d of D.prompts) {
    const p = parsed.prompts.find(x => x.n === d.n);
    if (!p || !p.text) { fail(d.n, 'has no text under "Prompt:".'); continue; }
    const t = p.text;
    if (!t.includes(`Use the business name once, written exactly like this: ${intake.business}`)) fail(d.n, `must say "Use the business name once, written exactly like this: ${intake.business}."`);
    const place = placeRule(d, intake.county);
    if (!t.includes(place)) fail(d.n, `must say "${place}"`);
    for (const [re, want] of RULES) if (!re.test(t)) fail(d.n, `is missing the rule ${want}`);
    if (!has(t, intake.cta.sentence)) fail(d.n, `must end the rules with the CTA sentence: "${intake.cta.sentence}".`);
    // One fixed angle, no lists (Brandon, 6 Nov): the model does not rotate through a list
    if (t.split('\n').some(l => /^\s*[-*\u2022]\s+\S/.test(l))) fail(d.n, 'has a list; a prompt has ONE fixed angle and no bullet points.');
    if (/\bChoose ONE\b|\bat random\b/i.test(t)) fail(d.n, 'asks the AI to choose; a prompt has its one service and one angle fixed.');
    const angleLine = (t.match(/around this (?:angle|tip):\s*([^\n]+)/i) || [])[1] || '';
    // Only the dropped angle itself: a trust prompt may well talk about serving local people
    if (d.kind !== 'trust' && /\bserving\b[^.]*\b(area|homes in|customers in|people in|town)\b|\blocal area\b|\bchosen area\b/i.test(angleLine)) fail(d.n, `drop the local area angle: "${angleLine}".`);
    // The angle is the model's own words, so a town could come in there
    const town = townsIn(angleLine, intake)[0];
    if (town) fail(d.n, `names ${town} in its angle; posts never name a town: "${angleLine}".`);
    const angleKey = `${d.service}|${angleLine.toLowerCase()}`;
    if (angleLine && seenAngles.has(angleKey)) fail(d.n, `has the same angle as prompt ${seenAngles.get(angleKey)}: "${angleLine}".`);
    seenAngles.set(angleKey, d.n);
    // A prompt covers its one service: no list of the others
    const own = new Set((d.services || []).map(s => s.toLowerCase()));
    const others = intake.groups.flatMap(g => g.services).filter(s => !own.has(s.toLowerCase()) && has(t, s));
    if (others.length >= 3) fail(d.n, `lists other services (${others.join(', ')}); write about this one only.`);
    for (const u of intake.usps) if (!has(t, u)) fail(d.n, `is missing the fact "${u}"; list every fact as given.`);
    if (d.service && !has(t, d.service)) fail(d.n, `does not name its service, ${d.service}.`);
    if (d.kind === 'offer' && !has(t, intake.offer)) fail(d.n, `does not state the offer, "${intake.offer}".`);
    if (/[–—]/.test(t)) fail(d.n, 'has an em or en dash; use commas or full stops.');
    const body = strip(t);
    for (const c of unconfirmedClaims(body, factsText)) fail(d.n, `claims ${c.what} ("${c.match}"), which is not in the facts. Remove it.`);
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
  const ask = m ? m[0].replace(/\.?$/, '.') : `Ask the client for 3-4 photos of finished ${(gap.services || [gap.label]).slice(0, 2).join(' and ').toLowerCase()} jobs.`;
  return `${gap.label}: ${gap.photos} photo${gap.photos === 1 ? '' : 's'}. ${ask}`;
}

function assemble(parsed, intake, D) {
  const prompts = D.prompts.map(d => {
    const text = parsed.prompts.find(p => p.n === d.n).text;
    return { n: d.n, kind: d.kind, label: d.label, tone: intake.tone, service: d.service, services: d.services, group: d.group, angle: d.angle, area: d.area, folder: d.folder, photos: d.photos, why: d.why, images: imagesLine(d.folder), text, chars: [...text].length };
  });
  const gaps = D.gaps.map(g => ({ ...g, line: gapLine(g, parsed.gaps) }));
  const settings = { frequency: FREQUENCY, cta: intake.cta.line, cta_type: intake.cta.type, cta_url: intake.cta.url, tone: intake.tone };
  return { business: intake.business, settings, prompts, gaps, checklist: CHECKLIST, notes: D.notes, tooFew: D.tooFew || null };
}

function sheetText(o) {
  const warn = o.tooFew ? [`WARNING: ${o.tooFew.message}`, ...o.tooFew.unlock.map(u => `- ${u}`), ''] : [];
  const L = [`LEAD SNAP AUTOPOST CONFIG - ${o.business}`, '', ...warn, 'SETTINGS', `Frequency: ${o.settings.frequency}`, `Call to action: ${o.settings.cta}`, ''];
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
    parsed = rebuildPrompts(parseSheet(raw), intake, D);
    validation = validateSheet(parsed, intake, D);
    if (validation.ok) break;
    if (log) log(`[lead snap] attempt ${attempts} failed ${validation.fails.length} check(s)`);
    msg = `${message}\n\nYOUR PREVIOUS ANSWER FAILED THESE CHECKS. Write the whole sheet again, fixing every one:\n${validation.fails.map(f => `- ${f.message}`).join('\n')}\n\nPREVIOUS ANSWER:\n${String(raw).slice(0, 24000)}`;
  }
  const at = new Date().toISOString();
  if (!validation.ok) {
    return { ...(previous || {}), version: 1, model: MODEL, failure: { at, error: `The config failed ${validation.fails.length} check(s) after a retry${previous && previous.sheet ? '; the last good config is kept' : ''}.`, fails: validation.fails, attempts, raw } };
  }
  // The other prompts' openings in each folder to avoid, from one test post per prompt
  const texts = D.prompts.map(d => ({ n: d.n, folder: d.folder, text: parsed.prompts.find(p => p.n === d.n).text }));
  const { openings, usage: testUsage } = await sampleOpenings(texts, callModel, log);
  usage.input_tokens += testUsage.input_tokens; usage.output_tokens += testUsage.output_tokens; usage.calls += testUsage.calls;
  for (const p of parsed.prompts) p.text = addDontStart(p.text, othersInFolder(p.n, D.prompts, openings));
  if (!openings.size) validation.flags.push({ field: 'sheet', message: "The test posts could not be written, so these prompts have no \"Don't start with\" line. Generate again to add them." });
  if (PROMPT_CHAR_LIMIT) for (const p of parsed.prompts) if ([...p.text].length > PROMPT_CHAR_LIMIT) validation.flags.push({ field: `Prompt ${p.n}`, message: `Prompt ${p.n}: is ${[...p.text].length} characters; Lead Snap's limit is ${PROMPT_CHAR_LIMIT.toLocaleString('en-GB')}.` });
  const output = assemble(parsed, intake, D);
  return {
    version: 1, model: MODEL, generated_at: at, attempts, usage, output, sheet: sheetText(output), flags: validation.flags, failure: null,
    intake: { offerSource: intake.offerSource, business: intake.business, niche: intake.niche, mainTown: intake.mainTown, areas: intake.areas, allAreas: intake.allAreas, areasWhy: intake.areasWhy, county: intake.county, counties: intake.counties, countySource: intake.countySource, countyWhy: intake.countyWhy, usps: intake.usps, groups: intake.groups, brand: intake.brand, offer: intake.offer, cta: intake.cta, tone: intake.tone, avoid: intake.avoid },
  };
}

function filesFor(rec) {
  if (!rec || !rec.sheet) return {};
  return { 'autopost-config.txt': rec.sheet, 'validation.json': JSON.stringify({ generated_at: rec.generated_at, model: rec.model, attempts: rec.attempts, flags: rec.flags, intake: rec.intake, notes: rec.output.notes, too_few: rec.output.tooFew || null, folders_renamed: rec.renames || [] }, null, 2) };
}

module.exports = { townsIn, placeRule, NO_TOWN, unconfirmedClaims, promptText, angleFrom, rebuildPrompts, CLAIMS, MODEL, MAX_TOKENS, CHECKLIST, loadSystem, buildMessage, parseSheet, validateSheet, assemble, sheetText, runAutopost, filesFor };
