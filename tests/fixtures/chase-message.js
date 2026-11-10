'use strict';
// Fixture: the chase message (fillout/chase.js). What it asks for, how it reads, that copying
// it is recorded, and how the tracker asks, goes quiet for 3 days, then asks again.
// Nothing here sends anything: there is no sending code to test.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const C = require(path.join(root, 'fillout/chase.js'));
const { trackerOf } = require(path.join(root, 'ui/tracker.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the chase message (a draft, never sent) ===\n');

const field = (key, value, label = key) => ({ key, label, status: value == null ? 'blank' : 'filled', value });
const rec = {
  sections: [{ fields: [field('full_name', 'Ethan Hall'), field('business_name', 'Edens Edge Landscaping'), field('business_email', 'ethan+site@edensedge.example')] }],
  attention: [
    { code: 'blank_needed', group: 'blocks', panel: 'areas', fields: [{ key: 'other_areas', label: 'Other towns and areas you want work from, one per line, up to 20.' }, { key: 'travel_distance', label: 'How far will you travel for work?' }] },
    { code: 'no_prices', group: 'blocks', panel: 'prices', msg: 'No prices given in the recording.' },
    { code: 'submission_error', group: 'blocks', panel: 'overview', msg: 'Submission x failed' },
    { code: 'blank_chase', group: 'chase', panel: 'about', fields: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(k => ({ key: k, label: `Question ${k} (optional hint)` })) },
    { code: 'most_wanted_no_price', group: 'chase', panel: 'prices', msg: 'Most-wanted job has no price: Patios', field: 'most_wanted_1' },
    { code: 'inferred_prices', group: 'chase', panel: 'prices', msg: '2 price rows with an inferred figure to check.' },
  ],
};
const items = C.chaseItems(rec);
chk('Needed: the blank needed answers by the form\'s own question, and the prices; never an internal problem', items.needed.map(x => x.key).join() === 'other_areas,travel_distance,prices' && items.needed[0].label === 'Other towns and areas you want work from, one per line, up to 20' && items.needed[1].label === 'How far will you travel for work?', JSON.stringify(items.needed));
chk('Worth chasing: the blank chase answers and the most wanted job with no price; a row to check is ours, not the client\'s', items.worth.length === 9 && items.worth[8].label === 'A price for Patios' && items.worth[0].label === 'Question a', JSON.stringify(items.worth.slice(-2)));

const msg = C.chaseMessage({ firstName: 'Ethan', business: 'Edens Edge Landscaping', ...items, formUrl: 'https://form.example/t/abc', email: 'ethan+site@edensedge.example' });
chk('Opens with the first name and the business', msg.startsWith('Hi Ethan,\n\nThanks for filling in the onboarding form for Edens Edge Landscaping.'), msg.slice(0, 90));
chk('Says how many answers block the build and lists them', msg.includes('we still need 3 answers from you:\n\n- Other towns and areas you want work from, one per line, up to 20\n- How far will you travel for work?\n- Your prices'), msg);
chk(`Offers ${C.WORTH_MAX} of the nice to have answers and counts the rest`, msg.includes('- Question f\n- and 3 more on the form') && !msg.includes('Question g'), msg);
chk('Gives the form link with the email filled in, and says earlier answers are kept', msg.includes('https://form.example/t/abc?email=ethan%2Bsite%40edensedge.example') && msg.includes('your earlier answers are kept'));
chk('No dashes used as punctuation, and it signs off', !/[—–]/.test(msg) && msg.endsWith('Thanks,\nLocal Launchpad'));
chk('One needed answer reads "one answer"', C.chaseMessage({ firstName: 'Ethan', needed: [items.needed[0]] }).includes('we still need one answer from you'));
chk('No form link: reply only; no name: "Hi there"', C.chaseMessage({ needed: [items.needed[0]] }).includes('You can reply to this message with the answers.') && C.chaseMessage({ needed: [items.needed[0]] }).startsWith('Hi there,'));
chk('Only nice to have answers: it says so and does not say the build is blocked', /A few more answers would make the site better/.test(C.chaseMessage({ worth: items.worth })) && !/Before we can build/.test(C.chaseMessage({ worth: items.worth })));
chk('Nothing missing: no message', C.chaseMessage({ firstName: 'Ethan' }) === '');

// The tracker
const now = new Date('2026-11-10T12:00:00Z');
const T = over => trackerOf({ niche_known: true, missing: [], now, ...over });
chk('Needed answers missing and never chased: a person sends the drafted message', T({ form_gaps: { needed: 3, worth: 5 } }).needs.some(n => n.key === 'chase' && n.text === 'Send the client the chase message: 3 needed answers missing'));
const quiet = T({ form_gaps: { needed: 3, worth: 5 }, chased_at: '2026-11-09T12:00:00Z' });
chk('Copied yesterday: nothing to do, and the tracker says it is waiting on the client', !quiet.needs.some(n => n.key === 'chase') && quiet.done.some(d => d.key === 'chased'));
chk('Three days on with the answers still missing: chase again', T({ form_gaps: { needed: 2, worth: 0 }, chased_at: '2026-11-07T11:00:00Z' }).needs.some(n => n.text === 'Chase the client again: 2 needed answers still missing after 3 days'));
chk('Only nice to have answers missing: no chase step', !T({ form_gaps: { needed: 0, worth: 5 } }).needs.some(n => n.key === 'chase'));

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await C.ensureChaseTables(pool);
  const id = crypto.randomUUID();
  let clock = new Date('2026-11-10T09:00:00Z');
  const chase = C.createChase({ pool, filloutService: { record: async cid => (cid === id ? rec : null) }, formUrl: () => 'https://form.example/t/abc', now: () => clock });
  const v = await chase.view(id);
  chk('The view: the lists, the message from the record\'s own name and email, never chased', v.needed.length === 3 && v.message.startsWith('Hi Ethan,') && v.message.includes('email=ethan%2Bsite') && v.last === null, v.message.slice(0, 40));
  const after = await chase.copied(id, 'Ray');
  clock = new Date('2026-11-12T10:00:00Z');
  const later = await chase.view(id);
  chk('Copied: who and when is kept with what was missing then', after.last.copied_by === 'Ray' && later.last.days_ago === 2 && JSON.parse((await pool.query(`SELECT missing FROM client_chases`)).rows[0].missing).needed.join() === 'other_areas,travel_distance,prices', JSON.stringify(later.last));
  chk('A client with no form: nothing to chase', (await chase.view(crypto.randomUUID())).has_form === false);
  const src = require('fs').readFileSync(path.join(root, 'fillout/chase.js'), 'utf8');
  chk('The module has no way to send: no email, SMS or outside call in it', !/nodemailer|sendMail|gmail|twilio|fetch\(|https?\.request|whatsapp/i.test(src));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
