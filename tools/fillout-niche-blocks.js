'use strict';
// Segments the niche blocks of a Fillout payload and (with --write) generates
// their fillout/field-map.json entries. Nothing is typed by hand: ids, labels and
// types come from the payload.
//
//   node tools/fillout-niche-blocks.js [payload.json]            print the block table
//   node tools/fillout-niche-blocks.js [payload.json] --write    also update the field map
//
// Layout (17 Oct 2026): after q_niche_select, 28 consecutive blocks up to the
// first Your Areas question. Each block: Checkboxes groups (service ticks), then
// "Most wanted job 1/2/3", then exactly one AudioRecording (prices), then trailing
// LongAnswer fields (other services, jobs not wanted). The audio fields are the
// anchors. Labels' "(N)" suffixes mean nothing; ids are the only handle.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const MAP = path.join(root, 'fillout/field-map.json');

const args = process.argv.slice(2);
const write = args.includes('--write');
const file = args.find(a => !a.startsWith('--')) || path.join(root, 'fixtures/fillout-sample.json');

const NICHE_Q = 'q_niche_select';
const AREAS_Q = 'tuDBpxPb1nUucBBrSQcjTh';
// The dropdown labels, in PAYLOAD order (Brandon, 17 Oct 2026), with their map keys
const LABELS_IN_PAYLOAD_ORDER = [
  ['Plumbing & Heating', 'plumbing_heating'],
  ['Landscapers/Gardeners', 'landscapers'],
  ['Cleaning Companies', 'cleaning'],
  ['Roofers', 'roofers'],
  ['Pet Care Services (Dog Walkers)', 'dog_walkers'],
  ['Dog Training', 'dog_training'],
  ['Dog Grooming', 'dog_grooming'],
  ['HVAC', 'hvac'],
  ['Electricians', 'electricians'],
  ['Tree Surgeons', 'tree_surgeons'],
  ['Fencing', 'fencing'],
  ['Drainage', 'drainage'],
  ['Locksmith', 'locksmith'],
  ['Garage Doors Installs', 'garage_doors'],
  ['Pressure Washing / Exterior Cleaning', 'pressure_washing'],
  ['Guttering & Fascias', 'guttering'],
  ['Pest Control', 'pest_control'],
  ['Scaffolding', 'scaffolding'],
  ['Window Cleaning', 'window_cleaning'],
  ['Driveways & Paving', 'driveways_paving'],
  ['Builders', 'builders'],
  ['Kitchen/Bathroom Fitters', 'kitchen_bathroom'],
  ['Loft Conversions / Extensions', 'loft_extensions'],
  ['Painters & Decorators', 'painters_decorators'],
  ['Flooring Fitters (carpet/laminate/LVT)', 'flooring'],
  ['Tiling', 'tiling'],
  ['Blinds & Curtains Fitters', 'blinds_curtains'],
  ['Removals Company', 'removals'],
];

const strip = n => String(n == null ? '' : n).replace(/\s*\(\d+\)\s*$/, '').trim();
const slug = s => strip(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function segment(payload) {
  const qs = payload.submission.questions;
  const start = qs.findIndex(q => q.id === NICHE_Q);
  const end = qs.findIndex(q => q.id === AREAS_Q);
  if (start < 0 || end < 0) throw new Error('niche select or Your Areas question not in payload');
  // Questions that are not part of the block pattern (a removed universal question
  // left in an old payload, for instance) are reported and skipped
  const skipped = [];
  const span = qs.slice(start + 1, end).filter(q => {
    const ok = ['Checkboxes', 'ShortAnswer', 'AudioRecording', 'LongAnswer'].includes(q.type);
    if (!ok) skipped.push(q);
    return ok;
  });
  const blocks = [];
  let cur = null;
  let i = 0;
  while (i < span.length) {
    const q = span[i];
    if (!cur) cur = { questions: [], cats: [], mostWanted: [], audio: [], trailing: [], issues: [] };
    if (q.type === 'Checkboxes') {
      if (cur.audio.length) { blocks.push(cur); cur = { questions: [], cats: [], mostWanted: [], audio: [], trailing: [], issues: [] }; } // a new block starts
      cur.cats.push(q);
    } else if (q.type === 'ShortAnswer') {
      if (cur.audio.length) cur.issues.push(`ShortAnswer after the voice field: ${q.id} ${JSON.stringify(q.name)}`);
      cur.mostWanted.push(q);
    } else if (q.type === 'AudioRecording') {
      if (cur.audio.length) { blocks.push(cur); cur = { questions: [], cats: [], mostWanted: [], audio: [], trailing: [], issues: [] }; cur.issues.push('block with no checkbox group before its voice field'); }
      cur.audio.push(q);
    } else if (q.type === 'LongAnswer') {
      if (!cur.audio.length) cur.issues.push(`LongAnswer before the voice field: ${q.id} ${JSON.stringify(q.name)}`);
      cur.trailing.push(q);
    }
    cur.questions.push(q);
    i++;
  }
  if (cur && cur.questions.length) blocks.push(cur);
  // Name the trailing fields: "jobs you DO NOT want" by its wording, the other one is other services
  for (const b of blocks) {
    b.jobsNotWanted = b.trailing.find(q => /do not want/i.test(q.name)) || null;
    const others = b.trailing.filter(q => q !== b.jobsNotWanted);
    b.otherServices = others[0] || null;
    if (others.length > 1) b.issues.push(`more than one other-services field: ${others.map(q => q.id).join(', ')}`);
    if (b.mostWanted.length !== 3) b.issues.push(`${b.mostWanted.length} most-wanted fields, not 3`);
    if (b.audio.length !== 1) b.issues.push(`${b.audio.length} voice fields, not 1`);
    if (!b.cats.length) b.issues.push('no checkbox group');
    b.first = b.questions[0].id;
    b.last = b.questions[b.questions.length - 1].id;
  }
  return { blocks, skipped };
}

function table(blocks, skipped) {
  const lines = [];
  lines.push(`${blocks.length} blocks found (expected ${LABELS_IN_PAYLOAD_ORDER.length})`);
  if (skipped.length) lines.push(`skipped (not part of the block pattern): ${skipped.map(q => `${q.id} ${q.type} ${JSON.stringify(strip(q.name))}`).join('; ')}`);
  blocks.forEach((b, i) => {
    const [label] = LABELS_IN_PAYLOAD_ORDER[i] || ['(no label for this position)'];
    lines.push(`\n${i + 1}. ${label}`);
    lines.push(`   first ${b.first}  last ${b.last}  (${b.questions.length} questions)`);
    lines.push(`   groups: ${b.cats.map(q => strip(q.name)).join(' / ')}`);
    lines.push(`   most wanted ${b.mostWanted.length}, voice ${b.audio.length}, other services ${b.otherServices ? JSON.stringify(strip(b.otherServices.name)) : 'none'}, jobs not wanted ${b.jobsNotWanted ? 'yes' : 'NONE'}`);
    if (b.issues.length) lines.push(`   !! ${b.issues.join('; ')}`);
  });
  return lines.join('\n');
}

// Map entries for one block. Keys are namespaced by niche so category names that
// repeat across blocks (with different ids) never collide.
function entriesFor(block, label, nicheKey) {
  const SL = 'Services & Locations';
  const out = [];
  const seen = new Set();
  for (const q of block.cats) {
    let s = slug(q.name);
    while (seen.has(s)) s += '_2';
    seen.add(s);
    out.push({ id: q.id, key: `${nicheKey}.cat.${s}`, label: strip(q.name), section: SL, type: q.type, niche: label, group: 'services' });
  }
  block.mostWanted.forEach((q, i) => out.push({ id: q.id, key: `${nicheKey}.most_wanted_${i + 1}`, label: `Most wanted job ${i + 1}`, section: SL, type: q.type, niche: label }));
  for (const q of block.audio) out.push({ id: q.id, key: `${nicheKey}.prices_voice`, label: 'Prices for your services (voice)', section: SL, type: q.type, niche: label });
  if (block.otherServices) out.push({ id: block.otherServices.id, key: `${nicheKey}.other_services`, label: strip(block.otherServices.name).length > 60 ? 'Additional services not listed above' : strip(block.otherServices.name), section: SL, type: block.otherServices.type, niche: label, optional: true });
  if (block.jobsNotWanted) out.push({ id: block.jobsNotWanted.id, key: `${nicheKey}.jobs_not_wanted`, label: strip(block.jobsNotWanted.name), section: SL, type: block.jobsNotWanted.type, niche: label, optional: true });
  // Every niche field sits on the Services panel of the record page (prices_voice too; the Prices
  // panel reads it through the prices card). Tiers: ticks and most-wanted jobs are needed, the
  // prices recording is worth chasing, other services and jobs not wanted are optional.
  return out.map(e => {
    const tier = e.group === 'services' || /\.most_wanted_\d$/.test(e.key) ? 'needed' : /\.prices_voice$/.test(e.key) ? 'chase' : 'optional';
    const entry = { ...e, panel: 'services', tier };
    if (tier === 'optional') entry.optional = true; else delete entry.optional;
    return entry;
  });
}

function updateMap(blocks) {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const universal = map.fields.filter(f => f.niche === 'all');
  // Plumbing & Heating keeps its existing keys exactly (records already use them)
  const phLabel = 'Plumbing & Heating';
  const existingPh = map.fields.filter(f => f.niche === phLabel);
  const existingById = new Map(existingPh.map(f => [f.id, f]));
  const niches = {};
  const nicheFields = [];
  blocks.forEach((b, i) => {
    const pair = LABELS_IN_PAYLOAD_ORDER[i];
    if (!pair) throw new Error(`block ${i + 1} has no label`);
    const [label, key] = pair;
    niches[label] = { key, block: i + 1, first_question_id: b.first, last_question_id: b.last };
    for (const e of entriesFor(b, label, key)) {
      const old = existingById.get(e.id);
      if (old) {
        // keep the old key and label; take the conventions (group, tier, optional, panel) from the generator
        const kept = { ...old, group: e.group || old.group, tier: e.tier, panel: e.panel };
        if (e.tier === 'optional') kept.optional = true; else delete kept.optional;
        nicheFields.push(kept);
        existingById.delete(e.id);
      } else nicheFields.push(e);
    }
  });
  if (existingById.size) throw new Error(`Plumbing & Heating entries not covered by the generated block: ${[...existingById.keys()].join(', ')}`);
  // Universal fields in their order, then every niche block in payload order
  const fields = [...universal, ...nicheFields];
  const keys = new Set();
  for (const f of fields) { const k = `${f.niche}|${f.key}`; if (keys.has(k)) throw new Error(`duplicate key ${k}`); keys.add(k); }
  const ids = new Map();
  for (const f of fields) { if (f.id) { if (ids.has(f.id)) throw new Error(`id ${f.id} mapped twice: ${ids.get(f.id)} and ${f.key}`); ids.set(f.id, f.key); } }
  map.niches = niches;
  map.fields = fields;
  map._generated = { niche_blocks: 'tools/fillout-niche-blocks.js, from fixtures/fillout-sample.json (17 Oct 2026). Re-run with --write after a form change; universal entries and Plumbing & Heating keys are kept as they are.' };
  fs.writeFileSync(MAP, JSON.stringify(map, null, 2) + '\n');
  return { universal: universal.length, niche: nicheFields.length, total: fields.length };
}

if (require.main === module) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { blocks, skipped } = segment(payload);
  console.log(table(blocks, skipped));
  const bad = blocks.filter(b => b.issues.length);
  if (write) {
    if (blocks.length !== LABELS_IN_PAYLOAD_ORDER.length) { console.error(`\nNot writing: ${blocks.length} blocks, ${LABELS_IN_PAYLOAD_ORDER.length} labels`); process.exit(1); }
    const r = updateMap(blocks);
    console.log(`\nfield map written: ${r.universal} universal + ${r.niche} niche fields = ${r.total}`);
  }
  if (bad.length) console.log(`\n${bad.length} block(s) with notes above`);
}

module.exports = { segment, entriesFor, updateMap, LABELS_IN_PAYLOAD_ORDER, strip, slug };
