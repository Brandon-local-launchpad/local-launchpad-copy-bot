'use strict';

// ── Niche file check ────────────────────────────────────────────────────────
// Checks one fillout/services/<niche>.json against itself and against the field
// map, so a new niche is checked the moment its file is added
// (tests/fixtures/niche-configs.js loops over every file). Read-only; nothing
// here changes what the resolver does.
//
// Fails (errors):
//   - a tick-box service missing from its category's All list
//   - a tick-box service with no matching checkbox option in field-map.json for
//     that tick group, and an option with no tick-box service (normalised names)
//   - a tick group (or the additional-services group) missing from the field map,
//     not of this niche, or with no options recorded while others in the niche have
//     them (a niche with none recorded yet is a notice); a category with tick-box
//     services but no tick group (one with no tick boxes may have none)
//   - a category listing the same service twice
//   - duplicate notes that disagree with the category lists, unless the file
//     declares the case in knownSourceErrors (then it is a notice)
//   - a primaryDefault that is not a category in the file
// Every message names the niche, the category and the service.

const R = require('./resolver');

function checkNiche(config, fieldMap) {
  const niche = config.niche || config.nicheKey || '(no niche name)';
  const errors = [], notices = [];
  const err = (code, msg, extra = {}) => errors.push({ code, msg: `${niche}: ${msg}`, ...extra });
  const known = (config.knownSourceErrors || []).map(k => `${k.code}|${k.category == null ? null : k.category}|${R.norm(k.service)}`);
  const catName = key => (config.categories.find(c => c.key === key) || {}).name || key;

  if (!Array.isArray(config.categories) || !config.categories.length) { err('no_categories', 'the file has no categories'); return { niche, errors, notices }; }
  if (!config.categories.some(c => c.key === config.primaryDefault)) err('primary_not_a_category', `primaryDefault "${config.primaryDefault}" is not a category in the file (categories: ${config.categories.map(c => c.key).join(', ')})`);

  const { problems, disagreements } = R.validateConfig(config);
  for (const p of problems) {
    // A declared source error (e.g. a service with no tick box home) is a notice
    if (known.includes(`${p.code}|${p.category == null ? null : p.category}|${R.norm(p.service)}`)) { notices.push({ code: p.code, msg: `${niche}: ${p.msg} (declared in knownSourceErrors)`, service: p.service }); continue; }
    if (p.code === 'repeated_in_category') err(p.code, `category "${catName(p.category)}" lists "${p.service}" twice (position ${p.position})`, { category: p.category, service: p.service });
    else if (p.code === 'tick_not_in_list') err(p.code, `category "${catName(p.category)}" has the tick box "${p.service}", which is missing from its All list`, { category: p.category, service: p.service });
    else err(p.code, p.msg.replace(/^/, ''), { service: p.service });
  }
  for (const d of disagreements) {
    const line = `category "${catName(d.category)}", service "${d.service}": ${d.msg.replace(/^[^:]+:\s*/, '')}`;
    if (known.includes(`${d.code}|${d.category}|${R.norm(d.service)}`)) notices.push({ code: d.code, msg: `${niche}: ${line} (declared in knownSourceErrors)`, category: d.category, service: d.service });
    else err('duplicate_note_' + d.code, `${line}. Fix the note or the list, or declare it in knownSourceErrors if the source sheet is wrong`, { category: d.category, service: d.service });
  }

  // Tick boxes vs the field map's checkbox options
  const groups = config.categories.map(c => ({ category: c.key, name: c.name, field: c.tickGroup || null, ticks: c.ticks || [], alwaysCreate: !!c.alwaysCreate }));
  if (config.additionalTickGroup) groups.push({ category: '(additional services)', name: 'Additional services', field: config.additionalTickGroup.field, ticks: config.additionalTickGroup.services || [] });
  // A niche whose options are not recorded in the field map yet is checked by tick group only
  const recorded = groups.some(g => { const f = (fieldMap.fields || []).find(x => x.key === g.field); return f && Array.isArray(f.options) && f.options.length; });
  if (!recorded) notices.push({ code: 'options_not_recorded', msg: `${niche}: no checkbox options recorded in field-map.json for this niche yet, so tick boxes were not compared with the form` });
  for (const g of groups) {
    // A category with no tick boxes of its own (e.g. "No unique services") may have no tick group
    if (!g.field) {
      if (g.ticks.length) err('tick_group_missing', `category "${g.name}" has ${g.ticks.length} tick-box services but no tick group`, { category: g.category });
      else notices.push({ code: 'no_tick_group', msg: `${niche}: category "${g.name}" has no tick boxes of its own and no tick group${g.alwaysCreate ? ' (alwaysCreate: always gets a tab)' : ''}` });
      continue;
    }
    const f = (fieldMap.fields || []).find(x => x.key === g.field);
    if (!f) { err('tick_group_not_in_field_map', `category "${g.name}": tick group ${g.field} is not in field-map.json`, { category: g.category }); continue; }
    if (f.niche !== config.niche) { err('tick_group_wrong_niche', `category "${g.name}": tick group ${g.field} belongs to "${f.niche}" in field-map.json, not "${config.niche}"`, { category: g.category }); continue; }
    if (!recorded) continue;
    if (!Array.isArray(f.options) || !f.options.length) { err('no_options_in_field_map', `category "${g.name}": tick group ${g.field} has no checkbox options recorded in field-map.json`, { category: g.category }); continue; }
    const opts = new Map(f.options.map(o => [R.norm(o), o]));
    const ticks = new Map(g.ticks.map(t => [R.norm(t), t]));
    for (const [id, t] of ticks) if (!opts.has(id)) err('tick_without_option', `category "${g.name}": service "${t}" has no matching checkbox option in field-map.json (${g.field})`, { category: g.category, service: t });
    for (const [id, o] of opts) if (!ticks.has(id)) err('option_without_tick', `category "${g.name}": checkbox option "${o}" in field-map.json (${g.field}) has no tick-box service in the niche file`, { category: g.category, service: o });
  }
  // Declared source errors that no longer happen are stale
  for (const k of config.knownSourceErrors || []) {
    if (!disagreements.some(d => d.code === k.code && d.category === k.category && R.norm(d.service) === R.norm(k.service)) && !problems.some(p => p.code === k.code && R.norm(p.service) === R.norm(k.service))) notices.push({ code: 'stale_known_error', msg: `${niche}: knownSourceErrors lists ${k.code} for "${k.service}" in "${catName(k.category)}", which no longer happens; remove it` });
  }
  return { niche, errors, notices };
}

module.exports = { checkNiche };
