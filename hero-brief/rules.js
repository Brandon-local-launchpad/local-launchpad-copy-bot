'use strict';

// ── The hero graphic brief: the rules (14 Nov 2026, Brandon) ─────────────────────────────────
// For a client whose hero is a graphic, Given makes the picture in ChatGPT from the Website
// Images SOP: a short brief and a long prompt. This fills both from the record, so a person
// copies one text and pastes it. Pure: nothing is read or written here but the two files below.
//   prompts/Hero_Graphic_Prompt.md   Brandon's prompt, with his [TOKENS] left in
//   hero-brief/scenes.json           the starting scene and items per niche, and the defaults
// Copybot does not make the picture and sends nothing anywhere.
//
//   recordValues({ cv, baseTown, stem })  what the record fills, and where each value came from
//   clean(key, value)                     a typed value made safe, or undefined when it can't be saved
//   build({ record, saved })              every field, what is missing, and the text to copy

const fs = require('fs');
const path = require('path');

const TEMPLATE = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'Hero_Graphic_Prompt.md'), 'utf8').replace(/\r\n/g, '\n').trim();
const SCENES = require('./scenes.json');

const POSITIONS = ['Centre', 'Left', 'Right'];
const LIGHTING = ['Day', 'Sunset', 'Dusk', 'Night'];
const COLOURS = ['primary_colour', 'secondary_colour', 'accent_colour'];
const LABELS = {
  niche: 'Niche', location: 'Business location', primary_colour: 'Primary brand colour', secondary_colour: 'Secondary brand colour',
  accent_colour: 'Accent colour', headline_position: 'Headline position', lighting: 'Lighting', scene: 'Main scene',
  include: 'Specific items to include', avoid: 'Specific items to avoid',
};
const KEYS = Object.keys(LABELS);
// The lines the record or the niche can fill; the rest are only ever typed or a default
const AUTO = ['niche', 'location', 'scene', 'include'];
const HEX = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/i;
// A token of Brandon's still in the text: [NICHE], [PRIMARY COLOUR + HEX], [LEFT / CENTRE / RIGHT]
const LEFTOVER = /\[[A-Z][A-Z +/,-]*\]/g;

const line = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
const isHex = v => HEX.test(line(v));
// "Dark green (#0B3D2E)" → "Dark green"; a hex code with no name stays the hex code
const colourName = v => line(line(v).replace(HEX, '').replace(/[()[\],;:-]+\s*$/g, '').replace(/\(\s*\)/g, '')) || line(v);

function recordValues({ cv = {}, baseTown = '', stem = '' } = {}) {
  const out = {};
  const category = line(cv.primary_category);
  out.niche = { value: category, source: category ? 'from the record → Primary category' : '' };
  const county = line(String(cv.county || '').split(/[,;\n]/)[0]);
  const town = line(baseTown);
  const place = town && county && town.toLowerCase() !== county.toLowerCase() ? `${town}, ${county}` : town || county;
  out.location = { value: place, source: !place ? '' : town ? `from the onboarding form → Base town${county ? ', and the county on the Record tab' : ''}` : 'from the record → County' };
  const niche = SCENES.niches[stem] || null;
  out.scene = { value: niche ? niche.scene : '', source: niche ? 'the usual scene for this niche' : '' };
  out.include = { value: niche ? niche.include : '', source: niche ? 'the usual items for this niche' : '' };
  return out;
}

function clean(key, value) {
  if (!KEYS.includes(key)) return undefined;
  const v = line(value).slice(0, key === 'scene' || key === 'include' || key === 'avoid' ? 600 : 120);
  if (key === 'headline_position') return POSITIONS.includes(v) ? v : undefined;
  if (key === 'lighting') return LIGHTING.includes(v) ? v : undefined;
  return v;
}

const fill = (text, map) => Object.entries(map).reduce((t, [token, value]) => (value ? t.split(token).join(value) : t), text);
// "the garden." → "the garden": the prompt's own sentence supplies the full stop
const noStop = v => line(v).replace(/[.\s]+$/, '');

function build({ record = {}, saved = {} } = {}) {
  const fields = {};
  for (const key of KEYS) {
    const typed = Object.prototype.hasOwnProperty.call(saved, key) ? line(saved[key]) : null;
    const rec = record[key] || { value: '', source: '' };
    if (typed != null && (typed || !AUTO.includes(key))) fields[key] = { value: typed, source: typed ? 'typed here' : '', typed: true };
    else fields[key] = { value: rec.value || '', source: rec.source || '', typed: false };
    fields[key].label = LABELS[key];
    if (AUTO.includes(key)) fields[key].record = rec.value || '';
  }
  for (const key of ['headline_position', 'lighting']) {
    if (!fields[key].value) fields[key] = { ...fields[key], value: SCENES.defaults[key], source: 'the usual choice: change it if the site differs', typed: false };
  }

  const missing = [];
  if (!fields.niche.value) missing.push('Niche: the record has no Primary category. Type the trade here.');
  if (!fields.location.value) missing.push('Business location: the record has no base town. Type the town and county here.');
  for (const key of COLOURS) {
    const v = fields[key].value;
    if (!v) missing.push(`${LABELS[key]}: type its name and hex code, like Dark green #0B3D2E.`);
    else if (!isHex(v)) missing.push(`${LABELS[key]}: "${v}" has no hex code. Add it, like Dark green #0B3D2E.`);
  }
  if (!fields.scene.value) missing.push('Main scene: there is no usual scene for this trade. Type what the picture should show, with no people in it.');
  if (!fields.include.value) missing.push('Specific items to include: there are no usual items for this trade. Type the vehicles, tools and materials to show.');

  const f = k => fields[k].value;
  const lighting = f('lighting') === 'Day' ? 'Daylight' : f('lighting');
  const brief = [
    `NICHE: ${f('niche')}`,
    `BUSINESS LOCATION: ${f('location')}`,
    `PRIMARY BRAND COLOUR: ${f('primary_colour')}`,
    `SECONDARY BRAND COLOUR: ${f('secondary_colour')}`,
    `ACCENT COLOUR: ${f('accent_colour')}`,
    `HEADLINE POSITION: ${f('headline_position')}`,
    `LIGHTING: ${f('lighting')}`,
    `SPECIFIC ITEMS TO INCLUDE: ${f('include')}`,
    `SPECIFIC ITEMS TO AVOID: ${f('avoid') || 'Nothing beyond the exclusions in the prompt below.'}`,
  ].join('\n');

  // The two tokens used twice read differently in each place: a list line, then the middle of a sentence
  const [head, ...restParts] = TEMPLATE.split('\nReference image\n');
  const rest = restParts.join('\nReference image\n');
  const common = {
    '[NICHE]': f('niche'), '[LOCATION]': f('location'),
    '[PRIMARY COLOUR + HEX]': isHex(f('primary_colour')) ? f('primary_colour') : '',
    '[SECONDARY COLOUR + HEX]': isHex(f('secondary_colour')) ? f('secondary_colour') : '',
    '[ACCENT COLOUR + HEX]': isHex(f('accent_colour')) ? f('accent_colour') : '',
    '[PRIMARY COLOUR]': isHex(f('primary_colour')) ? colourName(f('primary_colour')) : '',
    '[SECONDARY COLOUR]': isHex(f('secondary_colour')) ? colourName(f('secondary_colour')) : '',
    '[ACCENT COLOUR]': isHex(f('accent_colour')) ? colourName(f('accent_colour')) : '',
    '[MAIN SCENE DESCRIPTION]': noStop(f('scene')),
    '[TRADE-SPECIFIC OBJECTS, VEHICLES, MATERIALS OR ENVIRONMENTAL DETAILS]': noStop(f('include')),
  };
  const prompt = [
    fill(head, { ...common, '[LEFT / CENTRE / RIGHT]': f('headline_position'), '[DAYLIGHT / SUNSET / DUSK / NIGHT]': lighting }),
    fill(rest, { ...common, '[LEFT / CENTRE / RIGHT]': f('headline_position').toLowerCase(), '[DAYLIGHT / SUNSET / DUSK / NIGHT]': lighting.toLowerCase() }),
  ].join('\nReference image\n');

  const text = `${brief}\n\n${prompt}`;
  const leftovers = [...new Set(text.match(LEFTOVER) || [])];
  // A token left in with nothing above to explain it is a fault in the template, not a missing answer
  if (leftovers.length && !missing.length) missing.push(`The prompt still has ${leftovers.join(', ')} in it. Tell Brandon: the prompt file has a line Copybot does not fill.`);
  return { fields, missing, ready: !missing.length, brief, prompt, text, leftovers };
}

module.exports = { recordValues, clean, build, isHex, colourName, KEYS, AUTO, COLOURS, LABELS, POSITIONS, LIGHTING, TEMPLATE, SCENES, LEFTOVER };
