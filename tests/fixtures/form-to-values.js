'use strict';
// Fixture: form answers into Client Values (fillout/to-values.js). What is copied as given,
// what is read out of free text and waits for Confirm, what is left alone, and the rule that
// a value already there is never touched. Pure rules, then the save on pg-mem.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const TV = require(path.join(root, 'fillout/to-values.js'));
const { trackerOf } = require(path.join(root, 'ui/tracker.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: form answers into Client Values ===\n');
const by = list => Object.fromEntries(list.map(v => [v.key, v]));

const form = {
  business_name: 'Edens Edge Landscaping', business_phone: '07580 412717', business_email: 'hello@edensedge.example', business_address: '12 Mill Lane\nSouthampton SO15 1AA',
  opening_hours: 'Mon to Sat, 8am to 6pm', travel_distance: 'Up to 20 miles', quote_method: ['Site visit', 'Photos by WhatsApp'], reply_speed: 'Same day', start_speed: 'Within 2 weeks',
  finance: 'No', quote_free: 'Yes, free', common_questions_text: '- Do you take the waste away?\n2. How long does a patio take?\nok',
  team_size: '4', jobs_completed: 'About 150 since we started', trading_since: 'March 2015', owner_name_title: 'Ethan, Director',
  public_liability: 'Yes, £5 million with NFU', guarantees: 'Yes, 5 years on all hard landscaping',
  story_trade_text: 'I started with my dad.', stand_out: ['Family-run business'], current_website: 'https://old.example',
};
const v = by(TV.valuesFromFields(form));
chk('Name, phone, email, address, hours, travel are copied as given, source form', ['company_name', 'phone', 'email', 'address', 'hours', 'travel_distance'].every(k => v[k] && v[k].exact === true) && v.company_name.value === 'Edens Edge Landscaping' && v.address.value.includes('\n'), JSON.stringify(v.address));
chk('A multi choice answer is joined', v.quote_method.value === 'Site visit, Photos by WhatsApp', v.quote_method.value);
chk('The reply and start choices are copied as the client chose them', v.response_time.value === 'Same day' && v.start_time.value === 'Within 2 weeks');
chk('Finance "No" writes nothing', !v.finance_options);
chk('"Yes, free" is free quotes yes', v.free_quotes.value === 'yes' && v.free_quotes.exact === true);
chk('A call out fee or a survey fee is free quotes no; an answer that is neither writes nothing', by(TV.valuesFromFields({ quote_free: 'Call-out fee' })).free_quotes.value === 'no' && by(TV.valuesFromFields({ quote_free: 'Survey fee' })).free_quotes.value === 'no' && !by(TV.valuesFromFields({ quote_free: 'Depends on the job' })).free_quotes);
chk('Typed questions: one per line, bullets and numbers off, a stray word dropped', JSON.stringify(v.customer_questions.value) === JSON.stringify(['Do you take the waste away?', 'How long does a patio take?']), JSON.stringify(v.customer_questions.value));
chk('A bare number is the client\'s figure', v.team_size.value === '4' && v.team_size.exact === true);
chk('A number inside a sentence is read out and waits for Confirm', v.jobs_completed.value === '150' && v.jobs_completed.exact === false);
chk('Two numbers in the answer: nothing', !by(TV.valuesFromFields({ team_size: '3 to 5' })).team_size);
chk('The year is read from the trading date, to confirm', v.year_founded.value === '2015' && v.year_founded.exact === false);
chk('Two years in the answer: nothing', !by(TV.valuesFromFields({ trading_since: 'Started 2012, limited since 2018' })).year_founded);
chk('The owner\'s first name only, to confirm', v.owner_name.value === 'Ethan' && v.owner_name.exact === false);
chk('An owner answer that does not start with a name: nothing', !by(TV.valuesFromFields({ owner_name_title: 'director' })).owner_name);
chk('Cover: £5 million is 5m, to confirm', v.insurance_cover.value === '5m' && v.insurance_cover.exact === false);
chk('Cover: no, no figure, or two figures: nothing', !by(TV.valuesFromFields({ public_liability: 'No' })).insurance_cover && !by(TV.valuesFromFields({ public_liability: 'Yes fully covered' })).insurance_cover && !by(TV.valuesFromFields({ public_liability: '£2m public, £10m employers' })).insurance_cover);
chk('Guarantee: one length in years is read, to confirm', v.guarantee_years.value === '5' && v.guarantee_years.exact === false);
chk('Guarantee: two lengths, months, or no: nothing', !by(TV.valuesFromFields({ guarantees: '10 years on roofs, 2 years on repairs' })).guarantee_years && !by(TV.valuesFromFields({ guarantees: '12 months' })).guarantee_years && !by(TV.valuesFromFields({ guarantees: 'No' })).guarantee_years);
chk('Nothing words a claim or takes the old website: no differentiator, story, promise, scope or live domain', !['differentiator_1', 'differentiator_2', 'owner_why', 'owner_promise', 'guarantee_scope', 'live_domain', 'gbp_address_type'].some(k => v[k]), Object.keys(v).join(','));

// The merge
const m1 = TV.mergeIntoValues({}, form);
chk('A new client: every mapped answer is written with its source', m1.filled.length === Object.keys(v).length && m1.cv._sources.phone === 'form' && m1.cv._sources.insurance_cover === 'form_inferred' && m1.cv._form_filled.phone.from === 'business_phone', m1.filled.length);
const m2 = TV.mergeIntoValues({ phone: '023 8000 0000', insurance_cover: '2m', _sources: { phone: 'hand' } }, form);
chk('A value already there is never touched, and says why', m2.cv.phone === '023 8000 0000' && m2.cv.insurance_cover === '2m' && m2.skipped.some(s => s.key === 'phone') && !m2.filled.some(f => f.key === 'phone'));
chk('Running it again changes nothing', TV.mergeIntoValues(m1.cv, form).filled.length === 0);
const m3 = TV.mergeIntoValues(m1.cv, { ...form, opening_hours: 'Mon to Fri, 8am to 5pm' });
chk('The client resubmits with new hours: a value this wrote and nobody touched follows the form', m3.filled.length === 1 && m3.cv.hours === 'Mon to Fri, 8am to 5pm' && m3.filled[0].was === 'Mon to Sat, 8am to 6pm');
const edited = { ...m1.cv, hours: 'By appointment', _sources: { ...m1.cv._sources, hours: 'hand' } };
chk('The same after a person edited it: the edit stands', TV.mergeIntoValues(edited, { ...form, opening_hours: 'Mon to Fri' }).cv.hours === 'By appointment');
const confirmed = { ...m1.cv, _confirmed: { year_founded: true } };
chk('The same after a person confirmed it: the confirmed value stands', TV.mergeIntoValues(confirmed, { ...form, trading_since: 'January 2016' }).cv.year_founded === '2015');

// What the pages may read
const seen = TV.withoutUnconfirmed(m1.cv);
chk('A read out value is blank to the pages until confirmed; a copied one is there', seen.guarantee_years === '' && seen.insurance_cover === '' && seen.owner_name === '' && seen.phone === '07580 412717' && m1.cv.guarantee_years === '5', JSON.stringify([seen.guarantee_years, seen.phone]));
chk('Once confirmed the pages read it', TV.withoutUnconfirmed({ ...m1.cv, _confirmed: { guarantee_years: true } }).guarantee_years === '5');

// The tracker
const t =trackerOf({ niche_known: true, missing: [], form_fill: { filled: 16, to_confirm: 5 } });
chk('The tracker: 16 values filled by Copybot, 5 for a person to confirm', t.done.some(d => d.text === '16 record values filled from the form') && t.needs.some(n => n.key === 'form_confirm' && /Confirm 5 values/.test(n.text)));

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE client_fields (client_id UUID NOT NULL, field_key TEXT NOT NULL, value JSONB, status TEXT NOT NULL);
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), metadata JSONB);`);
  const id = crypto.randomUUID();
  for (const [k, val] of Object.entries(form)) await pool.query(`INSERT INTO client_fields (client_id, field_key, value, status) VALUES ($1, $2, $3, 'filled')`, [id, k, JSON.stringify(val)]);
  await pool.query(`INSERT INTO client_fields (client_id, field_key, value, status) VALUES ($1, 'guarantees', $2, 'blank')`, [crypto.randomUUID(), JSON.stringify('x')]);
  const r1 = await TV.fillClientValues(pool, id);
  const saved = async () => JSON.parse((await pool.query(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values'`, [id])).rows[0].content);
  chk('Saved: the values row is made, with the answers and what to confirm', r1.filled.length === Object.keys(v).length && r1.to_confirm.sort().join() === 'guarantee_years,insurance_cover,jobs_completed,owner_name,year_founded' && (await saved()).company_name === 'Edens Edge Landscaping', r1.to_confirm.join());
  const r2 = await TV.fillClientValues(pool, id);
  chk('A second run writes nothing and leaves one row', r2.filled.length === 0 && (await pool.query(`SELECT count(*)::int AS n FROM client_assets`)).rows[0].n === 1);
  const cv = await saved(); cv.email = 'ethan@edensedge.example'; cv._sources.email = 'hand';
  await pool.query(`UPDATE client_assets SET content = $1`, [JSON.stringify(cv)]);
  await pool.query(`UPDATE client_fields SET value = $2 WHERE client_id = $1 AND field_key = 'business_email'`, [id, JSON.stringify('new@edensedge.example')]);
  await TV.fillClientValues(pool, id);
  chk('A hand typed email survives a new form answer', (await saved()).email === 'ethan@edensedge.example');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
