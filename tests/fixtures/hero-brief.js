'use strict';
// Fixture: the hero graphic brief (hero-brief/, 14 Nov 2026, Brandon). What the record fills and where each
// value came from, the three colours that must be typed with a hex code, the defaults, a line changed on the
// card and put back, the text with every one of Brandon's [TOKENS] filled, a scene for every niche, and the
// routes. Postgres in memory, a real express app on a local port. Nothing is sent anywhere.
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const R = require(path.join(root, 'hero-brief/rules.js'));
const S = require(path.join(root, 'hero-brief/service.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + (typeof got === 'string' ? got : JSON.stringify(got)) + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the hero graphic brief (the record, the colours, the text, the routes) ===\n');

// http.request, not fetch: a fixture that fetches its own server aborts at exit on Windows
const call = (base, method, p, body) => new Promise((resolve, reject) => {
  const u = new URL(p, base);
  const data = body === undefined ? null : JSON.stringify(body);
  const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, res => {
    let text = ''; res.on('data', c => { text += c; });
    res.on('end', () => { let json = null; try { json = JSON.parse(text); } catch (_) { /* not JSON */ } resolve({ status: res.statusCode, json, text }); });
  });
  req.on('error', reject); req.end(data);
});

// ── The pure rules ──
const rec = R.recordValues({ cv: { primary_category: 'Landscaper', county: 'Hampshire' }, baseTown: 'Southampton', stem: 'landscaper' });
chk('The record fills the niche, the town with its county, and the niche\'s scene and items', rec.niche.value === 'Landscaper' && rec.location.value === 'Southampton, Hampshire' && /landscaped garden/.test(rec.scene.value) && /tipper truck/.test(rec.include.value), rec);
chk('Each value says where it came from', rec.niche.source === 'from the record → Primary category' && /Base town/.test(rec.location.source) && /usual scene/.test(rec.scene.source), rec);
chk('No county: the town alone; no town: the county; neither: blank', R.recordValues({ cv: {}, baseTown: 'Southampton' }).location.value === 'Southampton' && R.recordValues({ cv: { county: 'Hampshire' } }).location.value === 'Hampshire' && R.recordValues({}).location.value === '');
chk('A trade with no niche entry has no scene or items', R.recordValues({ cv: { primary_category: 'Chimney sweep' }, stem: '' }).scene.value === '' && R.recordValues({ cv: {}, stem: 'no-such' }).include.value === '');

const thin = R.build({ record: rec, saved: {} });
chk('Nothing typed: the three colours are missing, and nothing else', thin.missing.length === 3 && thin.missing.every(m => /colour/i.test(m)) && !thin.ready, thin.missing);
chk('The headline position and lighting take the usual choice and say so', thin.fields.headline_position.value === 'Centre' && thin.fields.lighting.value === 'Dusk' && /usual choice/.test(thin.fields.lighting.source));
chk('A colour with no hex code is still missing, and the line says why', R.build({ record: rec, saved: { primary_colour: 'Dark green', secondary_colour: 'Navy #14213D', accent_colour: '#F4A261' } }).missing.join('|') === 'Primary brand colour: "Dark green" has no hex code. Add it, like Dark green #0B3D2E.');
chk('A colour\'s name is read without its hex code; a bare hex code is its own name', R.colourName('Dark green (#0B3D2E)') === 'Dark green' && R.colourName('Navy #14213D') === 'Navy' && R.colourName('#F4A261') === '#F4A261' && R.isHex('#abc') && !R.isHex('green'));

const SAVED = { primary_colour: 'Dark green #0B3D2E', secondary_colour: 'Navy #14213D', accent_colour: 'Orange #F4A261', headline_position: 'Left', lighting: 'Day', avoid: 'Swimming pools' };
const full = R.build({ record: rec, saved: SAVED });
chk('With the colours typed the brief is ready and no token of Brandon\'s is left', full.ready && full.leftovers.length === 0 && !R.LEFTOVER.test(full.text), full.leftovers);
R.LEFTOVER.lastIndex = 0;
chk('The brief block, line for line', full.brief === [
  'NICHE: Landscaper', 'BUSINESS LOCATION: Southampton, Hampshire', 'PRIMARY BRAND COLOUR: Dark green #0B3D2E', 'SECONDARY BRAND COLOUR: Navy #14213D',
  'ACCENT COLOUR: Orange #F4A261', 'HEADLINE POSITION: Left', 'LIGHTING: Day', `SPECIFIC ITEMS TO INCLUDE: ${rec.include.value}`, 'SPECIFIC ITEMS TO AVOID: Swimming pools',
].join('\n'), full.brief);
chk('The prompt\'s details list is filled', ['- Industry: Landscaper', '- Location served: Southampton, Hampshire', '- Primary brand colour: Dark green #0B3D2E', '- Headline position: Left', '- Lighting: Daylight'].every(l => full.prompt.includes(l)), full.prompt.slice(0, 500));
chk('In a sentence the position and lighting are lower case, and the palette names the colours without hex codes', full.prompt.includes('uncluttered left copy-safe area') && full.prompt.includes('Use daylight lighting.') && full.prompt.includes('Build the illustration around Dark green, Navy and Orange.'), '');
chk('The scene and items go into their sentences with one full stop', full.prompt.includes(`Show ${rec.scene.value}.`) && full.prompt.includes(`Include ${rec.include.value}.`) && !/\.\.\n/.test(full.prompt));
chk('The text is the brief, a blank line, then the prompt; nothing avoided says so', full.text === `${full.brief}\n\n${full.prompt}` && /SPECIFIC ITEMS TO AVOID: Nothing beyond the exclusions/.test(R.build({ record: rec, saved: {} }).brief));
chk('Outside the tokens the prompt is Brandon\'s file, word for word', (() => {
  const strip = t => t.replace(R.LEFTOVER, '§');
  const tmpl = strip(R.TEMPLATE).split('§');
  let at = 0;
  for (const part of tmpl) { const i = full.prompt.indexOf(part, at); if (i < 0) return false; at = i + part.length; }
  return true;
})());
chk('A line typed on the card wins over the record and says so; emptied, the record\'s value is back', (() => {
  const b = R.build({ record: rec, saved: { niche: 'Tree surgery' } });
  return b.fields.niche.value === 'Tree surgery' && b.fields.niche.typed && b.fields.niche.record === 'Landscaper' && b.prompt.includes('professional Tree surgery business') && R.build({ record: rec, saved: { niche: '' } }).fields.niche.value === 'Landscaper';
})());
chk('No Primary category, no town and no niche entry: each is asked for', (() => {
  const b = R.build({ record: R.recordValues({}), saved: SAVED });
  return b.missing.length === 4 && /Niche/.test(b.missing[0]) && /Business location/.test(b.missing[1]) && /Main scene/.test(b.missing[2]) && /items to include/.test(b.missing[3]) && !b.ready;
})());
chk('Only a listed position or lighting can be saved; any other key is refused', R.clean('lighting', 'Dusk') === 'Dusk' && R.clean('lighting', 'Dawn') === undefined && R.clean('headline_position', 'Middle') === undefined && R.clean('password', 'x') === undefined && R.clean('avoid', '  a   b ') === 'a b');

// ── Every niche has a scene ──
const stems = fs.readdirSync(path.join(root, 'niche-library')).filter(f => f.endsWith('.json') && !['client-facts.json', 'practices.json'].includes(f)).map(f => f.replace(/\.json$/, ''));
const lacking = stems.filter(s => !R.SCENES.niches[s] || !R.SCENES.niches[s].scene || !R.SCENES.niches[s].include);
chk(`Every niche entry (${stems.length}) has a scene and items, and none is for a niche that is not there`, lacking.length === 0 && Object.keys(R.SCENES.niches).every(s => stems.includes(s)), lacking);
const PEOPLE = /\b(man|woman|men|women|person|people|worker|workers|owner|customer|customers|engineer at|team|staff|driver|child|children|family at)\b/i;
chk('No scene or items line puts a person in the picture', Object.values(R.SCENES.niches).every(n => !PEOPLE.test(n.scene) && !PEOPLE.test(n.include)), Object.entries(R.SCENES.niches).filter(([, n]) => PEOPLE.test(n.scene) || PEOPLE.test(n.include)).map(([k]) => k));
chk('No scene ends in a full stop or starts with a capital, so it reads on after "Show"', Object.values(R.SCENES.niches).every(n => !/\.$/.test(n.scene) && !/\.$/.test(n.include) && /^[a-z]/.test(n.scene) && /^[a-z]/.test(n.include)));

// ── The service and the routes ──
(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const edens = (await pool.query(`INSERT INTO clients (name, trade) VALUES ('ednes edge testing', 'Landscaper') RETURNING id`)).rows[0].id;
  const kestrel = (await pool.query(`INSERT INTO clients (name, trade) VALUES ('Kestrel Ridge Roofing', 'Roofer') RETURNING id`)).rows[0].id;
  const values = { [edens]: { primary_category: 'Landscaper', county: 'Hampshire' }, [kestrel]: { primary_category: 'Roofing contractor' } };
  const towns = { [edens]: 'Southampton' };
  const answers = { [edens]: { hero_image: 'An illustration', colours: 'A palette you choose' }, [kestrel]: { hero_image: 'A real photo of my work' } };
  let now = new Date('2026-11-14T10:00:00Z'), breakTown = false;
  const quiet = { error: () => {}, log: () => {} };
  const svc = S.createHeroBrief({
    pool, log: quiet, now: () => now,
    loadValues: async id => values[id] || {},
    baseTown: async id => { if (breakTown) throw new Error('the form is down'); return towns[id] || ''; },
    stemFor: c => ({ landscaper: 'landscaper', 'landscape gardener': 'landscaper', 'roofing contractor': 'roofer' })[String(c || '').toLowerCase()] || null,
    formAnswer: async (id, key) => (answers[id] || {})[key] || '',
  });
  const app = express(); app.use(express.json());
  S.mount(app, svc, { log: quiet });
  const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const url = id => `/api/clients/${id}/hero-brief`;
  try {
    let v = (await call(base, 'GET', url(edens))).json;
    chk('Edens Edge (thin): an illustration, the form\'s colours answer shown, the record\'s lines filled, three colours to type', v.hero_choice === 'illustration' && v.colours_answer === 'A palette you choose' && v.fields.niche.value === 'Landscaper' && v.fields.location.value === 'Southampton, Hampshire' && v.missing.length === 3 && !v.ready && v.last_copied === null, v.missing);
    chk('Not ready: Copy is refused with the first thing missing', (r => r.status === 409 && /Primary brand colour/.test(r.json.error))(await call(base, 'POST', `${url(edens)}/copied`, { by: 'Given' })));
    v = (await call(base, 'PUT', url(edens), { set: SAVED })).json;
    chk('The colours, position and lighting typed: ready, and the text carries them', v.ready && v.missing.length === 0 && v.text.includes('PRIMARY BRAND COLOUR: Dark green #0B3D2E') && v.text.includes('Use daylight lighting.'), v.missing);
    v = (await call(base, 'GET', url(edens))).json;
    chk('What was typed is still there on a fresh read', v.fields.accent_colour.value === 'Orange #F4A261' && v.fields.headline_position.value === 'Left');
    v = (await call(base, 'PUT', url(edens), { set: { niche: 'Tree surgery' } })).json;
    chk('The niche changed on the card for a service page', v.fields.niche.value === 'Tree surgery' && v.fields.niche.typed && v.text.startsWith('NICHE: Tree surgery'));
    values[edens].primary_category = 'Landscape gardener';
    v = (await call(base, 'PUT', url(edens), { reset: ['niche'] })).json;
    chk('Put back: the record\'s value as it is today, and Client Values untouched', v.fields.niche.value === 'Landscape gardener' && !v.fields.niche.typed && JSON.stringify(values[edens]) === '{"primary_category":"Landscape gardener","county":"Hampshire"}');
    chk('A value that is not on the list is refused and nothing changes', (await call(base, 'PUT', url(edens), { set: { lighting: 'Dawn' } })).status === 400 && (await call(base, 'GET', url(edens))).json.fields.lighting.value === 'Day');
    now = new Date('2026-11-14T11:30:00Z');
    v = (await call(base, 'POST', `${url(edens)}/copied`, { by: 'Given' })).json;
    chk('Copied: who and when', v.last_copied && v.last_copied.by === 'Given' && v.last_copied.at === '2026-11-14T11:30:00.000Z', v.last_copied);

    v = (await call(base, 'GET', url(kestrel))).json;
    chk('Kestrel Ridge: a real photo was chosen, the roofer\'s scene is there, and the town is asked for', v.hero_choice === 'photo' && /re-tiled/.test(v.fields.scene.value) && v.missing.some(m => /Business location/.test(m)) && v.fields.niche.value === 'Roofing contractor', v.missing);
    v = (await call(base, 'PUT', url(kestrel), { set: { location: 'Winchester, Hampshire', primary_colour: 'Slate #2F3E46', secondary_colour: 'Charcoal #1B1B1E', accent_colour: 'Red #D62828' } })).json;
    chk('Kestrel Ridge with the town and colours typed: ready, nothing of Edens Edge in it', v.ready && v.text.includes('Location served: Winchester, Hampshire') && !/Southampton|Landscap/.test(v.text));

    breakTown = true;
    v = (await call(base, 'GET', url(edens))).json;
    chk('A part of the record that cannot be read is said on the card, and the rest still loads', v.problems.length === 1 && /base town could not be read: the form is down/.test(v.problems[0]) && v.fields.niche.value === 'Landscape gardener' && v.fields.location.value === 'Hampshire', v.problems);
    breakTown = false;
    chk('A client that does not exist is a 404', (await call(base, 'GET', url(crypto.randomUUID()))).status === 404);
  } catch (err) {
    chk('The fixture ran to the end', false, err.stack);
  } finally {
    server.close();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
