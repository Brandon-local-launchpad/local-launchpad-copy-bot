'use strict';
// Fixture: the prefilled submission packs (citations/packs.js) on pg-mem: the fields from the
// NAP, the client values, the page map and the GBP description; the cuts at the directory's
// limits (default and set by hand) on a sentence end; the over flag; the listings email as the
// login email unless the row has one; the service area and storefront cases; the notes when
// the GBP output has not run; the route.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { createPacks, cut } = require(path.join(root, 'citations/packs.js'));
const { ensureCitationTables, createCitationStore } = require(path.join(root, 'citations/store.js'));
const CL = require(path.join(root, 'citations/client.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: citations submission packs ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };

(async () => {
  chk('cut: a sentence end inside the limit wins; else a word end; never mid word; nothing when it fits', cut('One sentence here. Two sentences here. Three', 30) === 'One sentence here.' && cut('A long run of words without any full stop at all in it', 20) === 'A long run of words' && cut('Short.', 50) === 'Short.' && !/-$/.test(cut('abc def ghi', 7)), JSON.stringify([cut('One sentence here. Two sentences here. Three', 30), cut('A long run of words without any full stop at all in it', 20)]), '');

  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, niche_key TEXT, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await ensureCitationTables(pool);
  const store = createCitationStore(pool, { log: quiet, dfs: { configured: () => false }, env: {} });
  await store.seedDirectories({ fillDa: false });
  const edens = (await pool.query(`INSERT INTO clients (name, trade, niche_key) VALUES ('Edens Edge Landscaping', 'Landscaper', 'landscapers') RETURNING id`)).rows[0].id;
  const kestrel = (await pool.query(`INSERT INTO clients (name, trade, niche_key) VALUES ('Kestrel Ridge Roofing', 'Roofer', 'roofers') RETURNING id`)).rows[0].id;
  const cvs = { [edens]: { company_name: 'Edens Edge Landscaping', phone: '07850 412717', hours: 'Mon to Fri 8am to 6pm', year_founded: '2015' }, [kestrel]: { company_name: 'Kestrel Ridge Roofing Ltd', phone: '0117 000 0000', address: '12 High St, Bristol, BS1 1AA', gbp_address_type: 'storefront' } };
  const fields = { [edens]: { primary_town: 'Southampton', facebook: 'https://www.facebook.com/edensedge' }, [kestrel]: { primary_town: 'Bristol' } };
  const filloutService = { record: async id => ({ sections: [{ fields: Object.entries(fields[id] || {}).map(([key, value]) => ({ key, value })) }] }) };
  const C = CL.createClientCitations({ pool, store, filloutService, clientValues: async id => cvs[id] || {}, siteUrlFor: async id => (id === edens ? 'https://edensedge.co.uk/' : '') });
  const description = 'Edens Edge Landscaping designs and builds gardens across Southampton and Hampshire. Patios, fencing, turfing and planting, with a written quote before any work starts. ' + 'The team has worked on more than a hundred gardens since 2015. '.repeat(12) + 'Call for a free visit.';
  const gbpStore = { latest: async id => (id === edens ? { record: { steps: { description: { status: 'done', output: { description } } } } } : null) };
  const pageRowsFor = async id => (id === edens ? [{ type: 'category', title: 'Gardener', info: { primary: true }, applies: true }, { type: 'category', title: 'Paving Contractor', info: {}, applies: true }, { type: 'service', title: 'Lawn mowing', applies: true }, { type: 'service', title: 'Fencing', applies: true }, { type: 'service', title: 'Old', applies: false }] : []);
  const packs = createPacks({ pool, store, clientCitations: C, gbpStore, pageRowsFor });
  const yell = await store.byKey('yell');

  const p = await packs.packFor(edens, yell.id);
  const f = k => p.fields.find(x => x.key === k);
  chk('the pack: the NAP name and phone, the listings email as the login email, the site, no address (service area), the base town, the categories and services from the page map, the hours, the year, the Facebook link', f('business_name').value === 'Edens Edge Landscaping' && f('phone').value === '07850 412717' && f('email').value === 'edens-edge-landscaping@listings.locallaunchpad.co.uk' && f('website').value === 'https://edensedge.co.uk' && f('address').value === '' && f('town').value === 'Southampton' && f('primary_category').value === 'Gardener' && f('categories').value === 'Paving Contractor' && f('services').value === 'Lawn mowing, Fencing' && f('opening_hours').value === 'Mon to Fri 8am to 6pm' && f('year_founded').value === '2015' && f('facebook').value === 'https://www.facebook.com/edensedge', JSON.stringify(p.fields.map(x => [x.key, x.value.slice(0, 40)])), '');
  chk('the descriptions: the short one cut at 160 on a sentence end, the long one at 750, both flagged as cut, the long one still over (the GBP text is longer)', f('short_description').length <= 160 && /\.$/.test(f('short_description').value) && f('short_description').cut && f('description').length <= 750 && f('description').over && p.over.includes('description'), JSON.stringify({ short: f('short_description').value, len: f('description').length, over: p.over }), '');
  chk('the 1Password item name defaults to "<client> — <directory>"', f('onepassword_item').value === 'Edens Edge Landscaping — Yell', f('onepassword_item').value, '');
  chk('the notes: the service area line and the photos line, no GBP note', p.notes.some(n => /Service area business/.test(n)) && p.notes.some(n => /WhatsApp/.test(n)) && !p.notes.some(n => /No GBP description/.test(n)), JSON.stringify(p.notes), '');
  // Limits set by hand on the directory, and a login email on the row
  await store.update(yell.id, { fields: { description_max: 200, name_max: 20 } });
  await C.saveRow(edens, yell.id, { login_email: 'ethan@edensedge.co.uk', onepassword_item: 'Edens Edge — Yell (old)' });
  const p2 = await packs.packFor(edens, yell.id);
  const g = k => p2.fields.find(x => x.key === k);
  chk('limits by hand: the description cut to 200, the name to 20 (over), the short limit still the default; the row\'s login email and 1Password name win', p2.directory.limits.description_max === 200 && g('description').length <= 200 && g('business_name').length <= 20 && g('business_name').over && p2.directory.limits.short_description_max === 160 && g('email').value === 'ethan@edensedge.co.uk' && g('onepassword_item').value === 'Edens Edge — Yell (old)', JSON.stringify({ limits: p2.directory.limits, name: g('business_name').value, email: g('email').value }), '');
  const k = await packs.packFor(kestrel, (await store.byKey('bing-places')).id);
  const kf = key => k.fields.find(x => x.key === key);
  chk('a storefront client: the address expanded, the postcode with its space, no site, the GBP note (no output yet), blank descriptions', kf('address').value === '12 High Street, Bristol, BS1 1AA' && kf('postcode').value === 'BS1 1AA' && kf('website').value === '' && k.notes.some(n => /No GBP description/.test(n)) && kf('description').value === '' && kf('primary_category').value === '', JSON.stringify({ address: kf('address').value, postcode: kf('postcode').value, notes: k.notes }), '');
  const nf = await packs.packFor(edens, crypto.randomUUID()).catch(e => e);
  chk('an unknown directory is a 404', nf instanceof Error && nf.status === 404, nf && nf.message, '');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
