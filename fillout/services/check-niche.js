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
//     not of this niche, or with no options recorded
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
  const known = (config.knownSourceErrors || []).map(k => `${k.code}|${k.category}|${R.norm(k.service)}`);
  const catName = key => (config.categories.find(c => c.key === key) || {}).name || key;

  if (!Array.isArray(config.categories) || !config.categories.length) { err('no_categories', 'the file has no categories'); return { niche, errors, notices }; }
  if (!config.categories.some(c => c.key === config.primaryDefault)) err('primary_not_a_category', `primaryDefault "${config.primaryDefault}" is not a category in the file (categories: ${config.categories.map(c => c.key).join(', ')})`);

  const { problems, disagreements } = R.validateConfig(config);
  for (const p of problems) {
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
  const groups = config.categories.map(c => ({ category: c.key, name: c.name, field: c.tickGroup, ticks: c.ticks || [] }));
  if (config.additionalTickGroup) groups.push({ category: '(additional services)', name: 'Additional services', field: config.additionalTickGroup.field, ticks: config.additionalTickGroup.services || [] });
  for (const g of groups) {
    const f = (fieldMap.fields || []).find(x => x.key === g.field);
    if (!f) { err('tick_group_not_in_field_map', `category "${g.name}": tick group ${g.field} is not in field-map.json`, { category: g.category }); continue; }
    if (f.niche !== config.niche) { err('tick_group_wrong_niche', `category "${g.name}": tick group ${g.field} belongs to "${f.niche}" in field-map.json, not "${config.niche}"`, { category: g.category }); continue; }
    if (!Array.isArray(f.options) || !f.options.length) { err('no_options_in_field_map', `category "${g.name}": tick group ${g.field} has no checkbox options recorded in field-map.json`, { category: g.category }); continue; }
    const opts = new Map(f.options.map(o => [R.norm(o), o]));
    const ticks = new Map(g.ticks.map(t => [R.norm(t), t]));
    for (const [id, t] of ticks) if (!opts.has(id)) err('tick_without_option', `category "${g.name}": service "${t}" has no matching checkbox option in field-map.json (${g.field})`, { category: g.category, service: t });
    for (const [id, o] of opts) if (!ticks.has(id)) err('option_without_tick', `category "${g.name}": checkbox option "${o}" in field-map.json (${g.field}) has no tick-box service in the niche file`, { category: g.category, service: o });
  }
  // Declared source errors that no longer happen are stale
  for (const k of config.knownSourceErrors || []) {
    if (!disagreements.some(d => d.code === k.code && d.category === k.category && R.norm(d.service) === R.norm(k.service))) notices.push({ code: 'stale_known_error', msg: `${niche}: knownSourceErrors lists ${k.code} for "${k.service}" in "${catName(k.category)}", which no longer happens; remove it` });
  }
  return { niche, errors, notices };
}

module.exports = { checkNiche };
