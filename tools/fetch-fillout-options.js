'use strict';
// Reads the Fillout form's checkbox option labels (GET /v1/api/forms/{formId}) and compares
// them with each niche's services file. Read-only: writes nothing to field-map.json, the
// niche files or the database. Prints, per niche and tick group, the labels Fillout returns,
// then every mismatch split into (a) trivial (case, trailing space, apostrophe or dash
// style, double spaces) and (b) real wording differences, then tick groups with no
// category and categories with no tick group. A failed call prints its status and message
// only (never the key or the headers). The report is also saved to
// docs/niches-source/fillout-options-report.md.
//
//   node tools/fetch-fillout-options.js
//
// Needs FILLOUT_API_KEY and FILLOUT_FORM_ID in .env or the environment.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
try { fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }); } catch (_) {}

const R = require(path.join(root, 'fillout/services/resolver.js'));
const fieldMap = require(path.join(root, 'fillout/field-map.json'));

// Trivial differences: case, outer and double spaces, apostrophe and dash styles
const trivial = s => String(s == null ? '' : s).toLowerCase().replace(/[’‘`´]/g, "'").replace(/[–—‐‑]/g, '-').replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim();
// Pairing a reworded label with its PDF twin: shared words, ignoring plurals and generic job words
const GENERIC = new Set(['installation', 'install', 'repair', 'repairs', 'replacement', 'cleaning', 'service', 'services', 'and', 'the', 'for', 'work', 'maintenance']);
const words = s => new Set(trivial(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').map(w => w.replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1')).filter(w => w.length > 2 && !GENERIC.has(w)));
const similar = (a, b) => { const x = words(a), y = words(b); let n = 0; for (const w of x) if (y.has(w)) n++; return n / Math.max(1, Math.max(x.size, y.size)); };

async function fetchForm(formId, key) {
  const res = await fetch(`https://api.fillout.com/v1/api/forms/${encodeURIComponent(formId)}`, { headers: { Authorization: `Bearer ${key}` } });
  let body = null;
  try { body = await res.json(); } catch (_) {}
  if (!res.ok) { const e = new Error(String((body && (body.message || body.error)) || res.statusText || 'request failed').slice(0, 300)); e.status = res.status; throw e; }
  return body;
}

// The PDF-side list for a field: a category's tick boxes, or an additional group's examples
function fileSide(config, fieldKey) {
  const cat = config.categories.find(c => c.tickGroup === fieldKey);
  if (cat) return { kind: 'category', name: cat.name, labels: cat.ticks || [] };
  if (config.additionalTickGroup && config.additionalTickGroup.field === fieldKey) return { kind: 'additional', name: 'Additional services', labels: config.additionalTickGroup.examples || config.additionalTickGroup.services || [] };
  const extra = (config.extraAdditionalTickGroups || []).find(g => g.field === fieldKey);
  if (extra) return { kind: 'additional', name: extra.label || 'Additional services (2)', labels: extra.examples || [] };
  return null;
}

// Compare two label lists: exact, trivial-only, and real differences paired by similarity
function compare(fillout, file) {
  const exact = new Set(file);
  const triv = [], realF = [], realP = [...file];
  for (const f of fillout) {
    if (exact.has(f)) { realP.splice(realP.indexOf(f), 1); continue; }
    const t = realP.find(p => trivial(p) === trivial(f));
    if (t) { triv.push({ fillout: f, file: t }); realP.splice(realP.indexOf(t), 1); continue; }
    realF.push(f);
  }
  // Pair the remaining ones that are close in wording; the rest are missing or extra
  const pairs = [];
  for (const f of [...realF]) {
    const best = realP.map(p => ({ p, s: similar(f, p) })).sort((a, b) => b.s - a.s)[0];
    if (best && best.s > 0.5) { pairs.push({ fillout: f, file: best.p }); realF.splice(realF.indexOf(f), 1); realP.splice(realP.indexOf(best.p), 1); }
  }
  return { trivial: triv, reworded: pairs, onlyFillout: realF, onlyFile: realP };
}

async function run({ log = console.log } = {}) {
  const key = process.env.FILLOUT_API_KEY, formId = process.env.FILLOUT_FORM_ID;
  if (!key || !formId) { log('FILLOUT_API_KEY and FILLOUT_FORM_ID must be set in .env'); return { ok: false }; }
  let form;
  try { form = await fetchForm(formId, key); }
  catch (e) { log(`Fillout API call failed: status ${e.status || 'none'}, message: ${e.message}`); return { ok: false, status: e.status }; }
  const qs = form.questions || [];
  const idx = new Map(qs.map((q, i) => [q.id, i]));
  const L = [`# Fillout checkbox options vs the niche files (${new Date().toISOString().slice(0, 10)})`, '', `Form "${form.name}" (${form.id}): ${qs.length} questions, ${qs.filter(q => q.type === 'Checkboxes' || q.type === 'MultiSelect').length} checkbox / multi-select questions. Read-only: nothing written.`];
  const totals = { groups: 0, trivial: 0, real: 0, noCategory: 0, noGroup: 0 };
  const summary = [];
  for (const [label, n] of Object.entries(fieldMap.niches)) {
    const config = R.configFor(label);
    L.push('', `## ${label}${config ? '' : ' (no services file)'}`);
    // The niche's block in the form: from its first to its last question id (field-map.json)
    const a = idx.get(n.first_question_id), b = idx.get(n.last_question_id);
    if (a == null || b == null) { L.push(`Block not found in the form (first ${n.first_question_id}, last ${n.last_question_id})`); continue; }
    const groups = qs.slice(a, b + 1).filter(q => (q.type === 'Checkboxes' || q.type === 'MultiSelect') && Array.isArray(q.options));
    let nicheTriv = 0, nicheReal = 0;
    const seenFields = new Set();
    for (const q of groups) {
      const f = fieldMap.fields.find(x => x.id === q.id);
      const labels = q.options.map(o => o.label);
      const valueDiffers = q.options.filter(o => o.value != null && o.value !== o.label);
      totals.groups++;
      L.push('', `### ${q.name} — ${labels.length} options (${f ? f.key : 'not in field-map.json'})`);
      L.push(labels.map(x => `- ${x}`).join('\n'));
      if (valueDiffers.length) L.push(`Note: ${valueDiffers.length} option(s) send a value that differs from the label: ${valueDiffers.map(o => `"${o.label}" sends "${o.value}"`).join('; ')}`);
      if (q.type === 'Checkboxes' && /^(select your niche|niche)/i.test(q.name)) continue;
      const side = config && f ? fileSide(config, f.key) : null;
      if (f) seenFields.add(f.key);
      if (!side) { totals.noCategory++; L.push(`**No matching category in the niche file** for this tick group${f ? ` (${f.key})` : ''}.`); continue; }
      const c = compare(labels, side.labels);
      const real = c.reworded.length + c.onlyFillout.length + c.onlyFile.length;
      nicheTriv += c.trivial.length; nicheReal += real;
      if (!c.trivial.length && !real) { L.push(`Matches the niche file (${side.name}) exactly.`); continue; }
      L.push(`Against the niche file (${side.kind === 'category' ? `category "${side.name}" tick boxes` : `${side.name}, PDF examples`}, ${side.labels.length}):`);
      if (c.trivial.length) { L.push('', '(a) trivial differences', '| Fillout | PDF / niche file |', '|---|---|'); for (const t of c.trivial) L.push(`| ${JSON.stringify(t.fillout)} | ${JSON.stringify(t.file)} |`); }
      if (real) {
        L.push('', '(b) real wording differences', '| Fillout | PDF / niche file |', '|---|---|');
        for (const t of c.reworded) L.push(`| ${t.fillout} | ${t.file} |`);
        for (const x of c.onlyFillout) L.push(`| ${x} | (missing) |`);
        for (const x of c.onlyFile) L.push(`| (missing) | ${x} |`);
      }
    }
    if (config) {
      for (const c of config.categories) {
        const q = c.tickGroup ? qs.find(x => x.id === (fieldMap.fields.find(f => f.key === c.tickGroup) || {}).id) : null;
        if (!q) { totals.noGroup++; L.push('', `**Category "${c.name}" has no tick group in Fillout**${c.tickGroup ? ` (${c.tickGroup} not found in the form)` : ' (no tick group in the file; ' + (c.ticks.length ? `${c.ticks.length} tick boxes` : 'no tick boxes of its own') + ')'}.`); }
      }
    }
    totals.trivial += nicheTriv; totals.real += nicheReal;
    summary.push(`| ${label} | ${groups.length} | ${nicheTriv} | ${nicheReal} |`);
  }
  L.splice(3, 0, '', '| Niche | Tick groups in Fillout | (a) trivial | (b) real |', '|---|---|---|---|', ...summary, `| **All** | **${totals.groups}** | **${totals.trivial}** | **${totals.real}** |`, '', `Tick groups with no matching category: ${totals.noCategory} · categories with no tick group in Fillout: ${totals.noGroup}`);
  const text = L.join('\n') + '\n';
  return { ok: true, text, totals };
}

// The field map with every niche tick group's Fillout labels recorded as `options`
// (placed after "type", as on the landscaper groups). Only Checkboxes / MultiSelect
// questions inside a niche block that the field map already has (matched by question id).
function withOptions(map, form) {
  const qs = form.questions || [];
  const idx = new Map(qs.map((q, i) => [q.id, i]));
  const next = JSON.parse(JSON.stringify(map));
  const changes = [];
  for (const [label, n] of Object.entries(map.niches)) {
    const a = idx.get(n.first_question_id), b = idx.get(n.last_question_id);
    if (a == null || b == null) continue;
    for (const q of qs.slice(a, b + 1)) {
      if (!(q.type === 'Checkboxes' || q.type === 'MultiSelect') || !Array.isArray(q.options) || /^select your niche$/i.test(q.name)) continue;
      const i = next.fields.findIndex(f => f.id === q.id && f.niche === label);
      if (i < 0) continue;
      const f = next.fields[i];
      const labels = q.options.map(o => o.label);
      const before = Array.isArray(f.options) ? f.options : null;
      if (before && JSON.stringify(before) === JSON.stringify(labels)) { changes.push({ niche: label, key: f.key, kind: 'unchanged', count: labels.length }); continue; }
      const o = {};
      for (const [k, v] of Object.entries(f)) { if (k === 'options') continue; o[k] = v; if (k === 'type') o.options = labels; }
      next.fields[i] = o;
      changes.push({ niche: label, key: f.key, kind: before ? 'changed' : 'added', count: labels.length, before: before ? before.length : 0,
        removed: before ? before.filter(x => !labels.includes(x)) : [], added: before ? labels.filter(x => !before.includes(x)) : [] });
    }
  }
  return { map: next, changes };
}

module.exports = { run, compare, trivial, withOptions };

if (require.main === module) {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const pi = args.indexOf('--preview');
  const preview = pi >= 0 ? args[pi + 1] : null;
  (async () => {
    const r = await run();
    if (!r.ok) process.exit(1);
    const out = path.join(root, 'docs/niches-source/fillout-options-report.md');
    fs.writeFileSync(out, r.text);
    if (!write && !preview) { console.log(r.text); console.log(`(saved to ${path.relative(root, out)}; nothing else written)`); return; }
    // --preview <file>: the proposed field map written elsewhere for a diff; --write: field-map.json itself
    const form = await fetchForm(process.env.FILLOUT_FORM_ID, process.env.FILLOUT_API_KEY);
    const { map, changes } = withOptions(fieldMap, form);
    const by = k => changes.filter(c => c.kind === k);
    console.log(`Tick groups: ${changes.length} · options added ${by('added').length} · changed ${by('changed').length} · unchanged ${by('unchanged').length}`);
    for (const c of by('changed')) console.log(`  changed ${c.key}: ${c.before} → ${c.count}; removed ${JSON.stringify(c.removed)}; added ${JSON.stringify(c.added)}`);
    const text = JSON.stringify(map, null, 2) + '\n';
    if (preview) { fs.writeFileSync(preview, text); console.log(`Proposed field map written to ${preview} (field-map.json untouched)`); }
    if (write) { fs.writeFileSync(path.join(root, 'fillout/field-map.json'), text); console.log('fillout/field-map.json written'); }
  })().catch(e => { console.error(`Failed: ${e.status ? `status ${e.status}, ` : ''}${e.message}`); process.exit(1); });
}
