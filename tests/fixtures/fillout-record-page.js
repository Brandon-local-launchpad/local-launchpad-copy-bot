'use strict';
// Fixture: the client record page's static contract. The page is plain HTML, so this
// reads it as text: every colour is a CSS variable (no hard-coded colours in rules),
// both themes meet WCAG AA (4.5:1) for text on its background, badges on their tinted
// backgrounds, attention links on panels; and the field map's tier rules hold.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const I = require(path.join(root, 'fillout/intake.js'));
const P = require(path.join(root, 'fillout/prices.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: record page contract (the ported panels, the app tokens, tiers) ===\n');

// The record panels live in the app since the UI redesign (28 Oct): the script ported as is, the styles
// scoped under .legacy on the app's tokens (one light theme in public/app/app.css, no theme switch)
const html = fs.readFileSync(path.join(root, 'public/app/legacy/record-panels.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/app/legacy/record.css'), 'utf8');
const appCss = fs.readFileSync(path.join(root, 'public/app/app.css'), 'utf8');

// ── The tokens: the app's :root (one light theme), and the legacy panels' aliases onto them ──
function vars(block) {
  const out = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const rootBlock = (appCss.match(/:root\s*\{([\s\S]*?)\}/) || [])[1] || '';
const legacyBlock = (css.match(/\.legacy\s*\{([\s\S]*?)\}/) || [])[1] || '';
const tokens = vars(rootBlock), aliases = vars(legacyBlock);
// A value may name another token (var(--x)); resolve until it is a colour
const resolve = (v, depth = 0) => { const m = String(v || '').match(/^var\(--([a-z0-9-]+)\)$/); if (!m) return v; if (depth > 6) throw new Error('token loop: ' + v); return resolve(tokens[m[1]] !== undefined ? tokens[m[1]] : aliases[m[1]], depth + 1); };
const theme = {};
for (const [k, v] of Object.entries({ ...tokens, ...aliases })) theme[k] = resolve(v);
chk('The app defines its tokens once on :root and the legacy panels alias their old variables onto them', Object.keys(tokens).length > 20 && aliases.surface === 'var(--card)' && aliases.danger === 'var(--block-ink)', JSON.stringify([Object.keys(tokens).length, aliases.surface, aliases.danger]), '');
chk('Every legacy rule is scoped under .legacy, so nothing leaks into the app', css.split('\n').filter(l => /^\S.*\{/.test(l) && !/^@|^\.legacy|^\s*$/.test(l)).length === 0, css.split('\n').filter(l => /^\S.*\{/.test(l) && !/^@|^\.legacy/.test(l)).slice(0, 3).join(' | '), 'none');

// ── Contrast: text 4.5:1 or better on the surfaces it sits on ──
function parse(c) {
  c = String(c || '').trim();
  let m;
  if ((m = c.match(/^#([0-9a-f]{6})$/i))) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
  if ((m = c.match(/^#([0-9a-f]{3})$/i))) return [...m[1]].map(h => parseInt(h + h, 16)).concat([1]);
  if ((m = c.match(/^rgba?\(([^)]+)\)$/i))) { const p = m[1].split(',').map(s => parseFloat(s)); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  throw new Error('colour not parsed: ' + c);
}
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (fg, bg) => { const l1 = lum(fg), l2 = lum(bg); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const col = k => parse(theme[k]);
const pairs = [
  ['text on card', col('text'), col('card')], ['text on bg', col('text'), col('bg')], ['muted on card', col('muted'), col('card')], ['muted on surface2', col('muted'), col('surface2')], ['muted on bg', col('muted'), col('bg')],
  ['links (accent ink) on card', col('accent-ink'), col('card')], ['links on bg', col('accent-ink'), col('bg')],
  ['done text on its soft badge', col('ok-ink'), col('ok-soft')], ['waiting text on its soft badge', col('wait-ink'), col('wait-soft')], ['blocked text on its soft badge', col('block-ink'), col('block-soft')],
  ['done text on card', col('ok-ink'), col('card')], ['waiting text on card', col('wait-ink'), col('card')], ['blocked text on card', col('block-ink'), col('card')],
  ['button text on the accent', [255, 255, 255, 1], col('accent')], ['legacy warning badge', col('warning'), col('warning-bg')], ['legacy success badge', col('success'), col('success-bg')], ['legacy danger badge', col('danger'), col('danger-bg')],
];
for (const [label, fg, bg] of pairs) { const r = ratio(fg, bg); chk(`light: ${label} ≥ 4.5:1`, r >= 4.5, r.toFixed(2), '≥ 4.5'); }

// ── The page honours the theme contract ──
chk('The panels never set a theme of their own (the app has one light theme)', !/data-theme/.test(html), '', '');
chk('Page shows the two scores and the two attention groups', /Ready to build/.test(html) && /Worth chasing/.test(html) && /Blocks the build/.test(html), '', '');
chk('Empty voice answers render as a compact row with a "Type an answer" action', /Type an answer/.test(html), '', '');

// ── Tier rules in the field map ──
const map = I.loadFieldMap();
chk('Every field has a tier of needed, chase or optional', map.fields.every(f => I.TIERS.includes(f.tier)), map.fields.filter(f => !I.TIERS.includes(f.tier)).map(f => f.key).join(','), 'none');
chk('A label containing "(optional)" is always tier optional', map.fields.filter(f => /\(optional\)/i.test(f.label)).every(f => f.tier === 'optional') && map.fields.some(f => /\(optional\)/i.test(f.label)), '', '');
chk('optional:true mirrors tier optional on every entry', map.fields.every(f => !!f.optional === (f.tier === 'optional')), '', '');
const tmpMap = (mutate) => { const m2 = JSON.parse(JSON.stringify(map)); mutate(m2); const t = path.join(require('os').tmpdir(), 'fm-tier-' + Math.random().toString(36).slice(2) + '.json'); fs.writeFileSync(t, JSON.stringify(m2)); try { I.loadFieldMap(t); return null; } catch (e) { return e.message; } };
chk('loadFieldMap refuses an entry without a tier', /tier/.test(tmpMap(m2 => { delete m2.fields[5].tier; }) || ''), '', '');
chk('loadFieldMap refuses a "(optional)" label on a needed or chase tier', /\(optional\)/.test(tmpMap(m2 => { const f = m2.fields.find(x => /\(optional\)/i.test(x.label)); f.tier = 'chase'; delete f.optional; }) || ''), '', '');
chk('loadFieldMap refuses optional:true on a chase tier', /in step/.test(tmpMap(m2 => { m2.fields.find(x => x.key === 'team_size').optional = true; }) || ''), '', '');
const needed = map.fields.filter(f => f.niche === 'all' && f.tier === 'needed').map(f => f.key).sort();
chk('Universal needed set is exactly the agreed 13', JSON.stringify(needed) === JSON.stringify(['business_address', 'business_email', 'business_name', 'business_phone', 'niche', 'opening_hours', 'other_areas', 'owner_name_title', 'premises_or_travel', 'primary_town', 'quote_call_out_fee', 'quote_free', 'travel_distance']), needed.join(','), '13 keys');
chk('Every niche block: ticks and most-wanted needed, prices voice chase, other services and jobs not wanted optional', map.fields.filter(f => f.niche !== 'all').every(f => (f.group === 'services' || /most_wanted/.test(f.key)) ? f.tier === 'needed' : /prices_voice$/.test(f.key) ? f.tier === 'chase' : f.tier === 'optional'), '', '');
const photos = map.fields.find(f => f.key === 'photos_received');
chk('photos_received: manual, no question id, Checkbox, chase, on Look & Feel; photos_whatsapp is optional (information only)', photos && photos.manual === true && photos.id === null && photos.type === 'Checkbox' && photos.tier === 'chase' && photos.panel === 'look_feel' && map.fields.find(f => f.key === 'photos_whatsapp').tier === 'optional', JSON.stringify(photos), '');

// ── Dot colours from the scores ──
const st = (n, c, o) => I.status({ needed: n, chase: c, optional: o });
chk('Dot: red when a needed unit is missing, amber when only chase is missing, green when both complete, grey when only optional',
  st({ filled: 1, total: 2 }, { filled: 2, total: 2 }, { filled: 0, total: 1 }) === 'missing' && st({ filled: 2, total: 2 }, { filled: 1, total: 2 }, { filled: 0, total: 0 }) === 'chase' && st({ filled: 2, total: 2 }, { filled: 2, total: 2 }, { filled: 0, total: 3 }) === 'complete' && st({ filled: 0, total: 0 }, { filled: 0, total: 0 }, { filled: 1, total: 3 }) === 'none', '', '');

// ── Internal names never reach the reader ──
chk('humaniseNote replaces field names with plain words', P.humaniseNote('set up_to_gbp from "ten", from_gbp as said, typical_gbp null') === 'set highest price from "ten", lowest price as said, single price null' && P.humaniseNote(null) === null, P.humaniseNote('up_to_gbp/from_gbp/typical_gbp'), 'highest price/lowest price/single price');
chk('The extraction prompt tells the model the notes are read by a non-technical person and bans field names', /non-technical person/.test(fs.readFileSync(P.PROMPT_PATH, 'utf8')) && /Never put field names/.test(fs.readFileSync(P.PROMPT_PATH, 'utf8')), '', '');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
