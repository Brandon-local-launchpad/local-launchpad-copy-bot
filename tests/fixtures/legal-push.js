'use strict';
// Fixture: legal pages, Stage 5. Brandon's three test clients through the real form intake, the
// real service and the real push against the fake WordPress server. Each output is searched for
// leftovers. Also: the safety checks, all or none, rollback, and the Last updated date.
// With --write <file>, saves the filled pages as a Markdown file to read.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureFilloutTables, createFilloutService } = require(path.join(root, 'fillout/service.js'));
const { ensureAudioBlobTable, createPgAudioStore } = require(path.join(root, 'fillout/audio-store.js'));
const { ensurePriceTables } = require(path.join(root, 'fillout/prices.js'));
const { createLegalService } = require(path.join(root, 'legal/service.js'));
const { createMemoryStore } = require(path.join(root, 'wp/push-store.js'));
const { LEGAL_TEMPLATE } = require(path.join(root, 'wp/acf-schema.js'));
const { legalToHtml } = require(path.join(root, 'legal/html.js'));
const { createFakeWp, listen } = require(path.join(root, 'tests/fake-wp/fake-wp.js'));
const sample = require(path.join(root, 'fixtures/fillout-sample.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want)); fail++; }
};
console.log('\n=== FIXTURE: legal pages, Stage 5: the push, on the fake server ===\n');

const FORBIDDEN = ['[CV:', '(IF', '(END IF)', '{IF', '{END IF}', 'Lorem'];
const seedPages = (over = {}) => [
  { id: 7, slug: 'home', status: 'publish', title: { raw: 'Home' }, acf: {}, meta: {} },
  { id: 21, slug: 'service-terms', status: 'draft', title: { raw: 'Service Terms' }, template: LEGAL_TEMPLATE, acf: { legal_body: '<p>Old service terms.</p>' }, meta: {}, ...over },
  { id: 22, slug: 'privacy-policy', status: 'draft', title: { raw: 'Privacy Policy' }, template: LEGAL_TEMPLATE, acf: { legal_body: '<p>Old privacy policy.</p>' }, meta: {}, ...over },
  { id: 23, slug: 'terms', status: 'draft', title: { raw: 'Website Terms of Use' }, template: LEGAL_TEMPLATE, acf: {}, meta: {}, ...over },
];

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await ensureFilloutTables(pool);
  await ensureAudioBlobTable(pool);
  await ensurePriceTables(pool);
  const fillout = createFilloutService({ pool, audioStore: createPgAudioStore(pool), log: { info() {}, warn() {}, error() {} }, fetchAudio: async () => ({ buffer: Buffer.from('ID3'), contentType: 'audio/mpeg' }) });

  const cvs = {}, sites = {}, stores = {};
  const legal = createLegalService({
    pool, filloutService: fillout, clearKey: () => 'test-only-clear-key',
    loadValues: async id => cvs[id] || {},
    tradeLowerFor: () => 'plumbing and heating',
    getSite: async id => sites[id] || null,
    createStore: id => (stores[id] = stores[id] || createMemoryStore()),
  });
  const servers = [];
  const connect = async (id, opts = {}, site = {}) => {
    const fake = createFakeWp({ pages: seedPages(), clientValues: { company_name: 'On the site', phone: '0' }, ...opts });
    const l = await listen(fake.app);
    servers.push(l.server);
    sites[id] = { url: l.url, user: 'copybot', appPassword: 'test-app-password-not-real', staging: true, seo: 'rankmath', ...site };
    return fake;
  };

  const newClient = async ({ sid, name, email, phone, answers, subs, late, tick = true, notes = null }) => {
    const p = JSON.parse(JSON.stringify(sample));
    p.submission.submissionId = sid;
    p.submission.submissionTime = '2026-01-01T10:00:00.000Z';
    const qs = p.submission.questions;
    const fields = fillout.map.fields;
    const set = (key, v) => { const q = qs.find(x => x.id === fields.find(f => f.key === key).id); if (q) q.value = v; };
    for (const [k, v] of Object.entries({ business_name: name, business_email: email, business_phone: phone, ...answers })) set(k, v);
    qs.push({ id: 'uses_subcontractors', type: 'MultipleChoice', value: subs }, { id: 'late_payment_interest', type: 'MultipleChoice', value: late },
      { id: 'standard_terms_confirmed', type: 'Checkbox', value: tick }, { id: 'standard_terms_exceptions', type: 'LongAnswer', value: notes });
    const r = await fillout.receive(p);
    return (await fillout.process(r.id)).clientId;
  };

  const leftovers = text => FORBIDDEN.filter(f => String(text).includes(f));
  const bodyOf = (fake, id) => fake.state.pages.get(id).acf.legal_body || '';
  const allBodies = fake => [21, 22, 23].map(id => bodyOf(fake, id)).join('\n');
  const outputs = [];
  // What each page holds now: a later rollback or push mustn't change what the file shows
  const held = fake => [21, 22, 23].map(id => bodyOf(fake, id));

  // ── 1. Sole trader, both yes, ticked, no exceptions: all three push ──
  const c1 = await newClient({ sid: 'legal-c1', name: 'Jane Plumbing', email: 'jane@example.com', phone: '07000000001', subs: 'Yes', late: 'Yes',
    answers: { full_name: 'Jane Smith', business_address: '1 High Street, Southampton', primary_town: 'Southampton', vat_registered: 'No', deposit: 'No', payment_methods: ['Bank transfer', 'Card'] } });
  cvs[c1] = { company_name: 'Jane Plumbing', phone: '07000 000001', email: 'jane@example.com', legal_entity: 'sole_trader', live_domain: 'janeplumbing.example', insurance_cover: '5m', guarantee_months: '24', google_ads: 'yes', meta_pixel: 'no', sms_tool: 'no' };
  const f1 = await connect(c1);

  const dry = await legal.dryRun(c1);
  chk('Client 1: the dry run allows it and writes nothing', dry.pushable && f1.state.writes === 0, [dry.pushable, f1.state.writes, dry.pages.map(p => p.refusals)], 'allowed');
  chk('Client 1: the dry run lists all three pages and what changes', dry.pages.length === 3 && dry.pages.every(p => p.summary.added + p.summary.changed === 1), dry.pages.map(p => p.summary), 'one each');
  const r1 = await legal.push(c1, { confirm: true });
  chk('Client 1: all three pages pushed', r1.ok && r1.written.length === 3, r1, 'ok');
  chk('Client 1: no leftovers on any page', leftovers(allBodies(f1)).length === 0 && allBodies(f1).length > 5000, leftovers(allBodies(f1)), []);
  chk('Client 1: the pages stay drafts', [21, 22, 23].every(id => f1.state.pages.get(id).status === 'draft'), '', 'draft');
  chk('Client 1: Client Values on the site are untouched', f1.state.clientValues.company_name === 'On the site' && f1.state.clientValues.phone === '0' && Object.keys(f1.state.clientValues).length === 2, f1.state.clientValues, 'untouched');
  chk('Client 1: the homepage is untouched', JSON.stringify(f1.state.pages.get(7).acf) === '{}', f1.state.pages.get(7).acf, '{}');
  chk('Client 1: exactly three writes', f1.state.writes === 3, f1.state.writes, 3);
  const b1 = bodyOf(f1, 21);
  chk('Client 1: the conditional lines are there', ['We may use trusted subcontractors', 'charge interest at 8% a year', 'public liability insurance of £5,000,000', 'guarantee our workmanship for 24 months'].every(t => b1.includes(t)), '', 'all four');
  chk('Client 1: the page is HTML with no title, no Markdown left', b1.startsWith('<p>Last updated:') && b1.includes('<h2>1. Who we are</h2>') && b1.includes('<ul>') && !/^#|\*\*|^- /m.test(b1), b1.slice(0, 80), 'html');
  const pp1 = bodyOf(f1, 22);
  chk('Client 1: the Privacy Policy tables are real tables', (pp1.match(/<table>/g) || []).length === 3 && pp1.includes('<th>Cookie or tool</th>') && pp1.includes('<td>Google Ads</td>') && !pp1.includes('<td>Meta Pixel</td>') && !/\|/.test(pp1), '', 'tables');
  const tablesOf = html => (html.match(/<table>[\s\S]*?<\/table>/g) || []).map(t => ({ th: (t.match(/<th>/g) || []).length, rows: (t.match(/<tr>[\s\S]*?<\/tr>/g) || []).slice(1).map(r => (r.match(/<td>/g) || []).length) }));
  chk('Client 1: every table has one header row, and every row has as many cells as the header', tablesOf(pp1).map(t => t.th).join() === '3,5,2' && tablesOf(pp1).every(t => t.rows.length > 0 && t.rows.every(n => n === t.th)), tablesOf(pp1), '3, 5 and 2 columns');
  chk('Client 1: every table sits in its own scroll box, so a phone page never scrolls sideways', (pp1.match(/<div class="llp-table-scroll" style="overflow:auto">\n<table>/g) || []).length === 3, '', 'three');
  chk('Client 1: the log has a row per page, with snapshots', (await stores[c1].listLog()).filter(l => l.pageType === 'legal' && l.result === 'pushed' && l.snapshotId).length === 3, await stores[c1].listLog(), 3);
  outputs.push({ label: 'Client 1: sole trader, both questions yes, ticked, no exceptions', result: 'All three pages pushed', bodies: held(f1) });

  // ── 2. Limited company, both no, no insurance, no guarantee ──
  const c2 = await newClient({ sid: 'legal-c2', name: 'Kestrel Ridge', email: 'office@example.com', phone: '07000000002', subs: 'No', late: 'No',
    answers: { full_name: 'Sam Hill', business_address: '3 Yard Road, Reading', primary_town: 'Reading', vat_registered: 'Yes', deposit: 'No', payment_methods: ['Card'] } });
  cvs[c2] = { company_name: 'Kestrel Ridge', phone: '01234 567890', email: 'office@example.com', legal_entity: 'limited', legal_name: 'Kestrel Ridge Holdings Ltd', company_number: '12345678', registered_office: '2 Mill Lane, Reading', vat_number: 'GB123456789', live_domain: 'kestrelridge.example', google_ads: 'no', meta_pixel: 'no', sms_tool: 'no' };
  const f2 = await connect(c2);
  const r2 = await legal.push(c2, { confirm: true });
  chk('Client 2: all three pages pushed', r2.ok && r2.written.length === 3, r2, 'ok');
  chk('Client 2: no leftovers', leftovers(allBodies(f2)).length === 0, leftovers(allBodies(f2)), []);
  const b2 = bodyOf(f2, 21);
  chk('Client 2: the four conditional lines are gone', !/subcontractors|charge interest|public liability|guarantee our workmanship/.test(b2), '', 'gone');
  chk('Client 2: section 8 keeps its heading, with the replacement', b2.includes('<h2>8. Our guarantee</h2>\n<p>We do not offer a separate guarantee. Your legal rights under the Consumer Rights Act 2015 still apply.</p>\n<h2>9. If something goes wrong</h2>'), '', 'replaced');
  chk('Client 2: numbering runs 1 to 15', (b2.match(/<h2>\d+\. /g) || []).length === 15, (b2.match(/<h2>\d+\. /g) || []).length, 15);
  chk('Client 2: clause 15\'s references still point at the right clauses', b2.includes('clauses 4 and 9 do not apply') && b2.includes('<h2>4. Your right to cancel</h2>') && b2.includes('<h2>9. If something goes wrong</h2>'), '', 'hold');
  chk('Client 2: no empty bullets or cells', !/<li>\s*<\/li>|<td>\s*<\/td>/.test(allBodies(f2)), '', 'none');
  chk('Client 2: the Privacy Policy has no subcontractors bullet', !/ubcontractors/.test(bodyOf(f2, 22)), '', 'gone');
  chk('Client 2: the legal name is on the limited company lines', b2.includes('Kestrel Ridge Holdings Ltd is a limited company') && bodyOf(f2, 23).includes('Kestrel Ridge Holdings Ltd is a limited company') && bodyOf(f2, 22).includes('We are Kestrel Ridge Holdings Ltd, a limited company'), '', 'three pages');
  outputs.push({ label: 'Client 2: limited company, both questions no, no insurance, no guarantee', result: 'All three pages pushed', bodies: held(f2) });

  // ── 3. Exceptions box filled: held, F-LEGAL, nothing reaches the site ──
  const c3 = await newClient({ sid: 'legal-c3', name: 'Stage Pay Ltd', email: 'stage@example.com', phone: '07000000003', subs: 'Yes', late: 'Yes', notes: 'We only take stage payments',
    answers: { full_name: 'Alex Lee', business_address: '9 Bank Street, Winchester', primary_town: 'Winchester', vat_registered: 'No', deposit: 'No', payment_methods: ['Cash'] } });
  cvs[c3] = { company_name: 'Stage Pay', phone: '01962 000000', email: 'stage@example.com', legal_entity: 'sole_trader', live_domain: 'stagepay.example', google_ads: 'no', meta_pixel: 'no', sms_tool: 'no' };
  const f3 = await connect(c3);
  const before3 = allBodies(f3);
  const r3 = await legal.push(c3, { confirm: true });
  chk('Client 3: held, F-LEGAL with the reason', !r3.ok && r3.held && r3.code === 'F-LEGAL' && r3.refusals.length === 1 && r3.refusals[0].startsWith('F-LEGAL: ') && r3.refusals[0].includes('We only take stage payments'), r3, 'held');
  chk('Client 3: nothing was written, or even asked of the site', f3.state.writes === 0 && allBodies(f3) === before3, f3.state.writes, 0);
  chk('Client 3: nothing was pushed as a draft either', bodyOf(f3, 21) === '<p>Old service terms.</p>', bodyOf(f3, 21), 'old');
  chk('Client 3: the refusal is logged', (await stores[c3].listLog()).some(l => l.action === 'push' && l.result === 'refused' && l.refusals[0].startsWith('F-LEGAL')), await stores[c3].listLog(), 'logged');
  const dry3 = await legal.dryRun(c3);
  chk('Client 3: the dry run says refused on every page, naming F-LEGAL', !dry3.pushable && dry3.pages.every(p => p.refusals.some(x => x.startsWith('F-LEGAL'))), dry3.pages.map(p => p.refusals), 'refused');
  outputs.push({ label: 'Client 3: exceptions box filled', result: `Held. ${r3.refusals[0]} Nothing was pushed, so the site still has its old text.`, bodies: [] });

  // ── Once cleared, it goes ──
  await legal.clear(c3, { key: 'test-only-clear-key', exceptions: 'We only take stage payments' });
  const r3b = await legal.push(c3, { confirm: true });
  chk('Client 3: after Brandon clears it, the push goes through', r3b.ok && r3b.written.length === 3 && !bodyOf(f3, 21).includes('Old service terms'), r3b, 'ok');

  // ── Rollback ──
  const back = await legal.rollback(c1, { confirm: true, snapshotIds: r1.written.map(w => w.snapshotId) });
  chk('Rollback: reports it worked', back.ok, back, 'ok');
  chk('Rollback: the old text is back', bodyOf(f1, 21) === '<p>Old service terms.</p>' && bodyOf(f1, 22) === '<p>Old privacy policy.</p>' && !bodyOf(f1, 23), [bodyOf(f1, 21), bodyOf(f1, 23)], 'old');
  chk('Rollback: Client Values are still untouched', f1.state.clientValues.company_name === 'On the site' && Object.keys(f1.state.clientValues).length === 2, f1.state.clientValues, 'untouched');
  let threw = '';
  try { await legal.rollback(c1, { snapshotIds: ['x'] }); } catch (e) { threw = e.message; }
  chk('Rollback without confirming: refused', /confirming/.test(threw), threw, 'refused');
  threw = '';
  try { await legal.push(c1, {}); } catch (e) { threw = e.message; }
  chk('A push without confirming: refused', /confirming/.test(threw), threw, 'refused');

  // ── Last updated changes only when the text does ──
  const again = await legal.status(c1);
  await pool.query(`UPDATE legal_page_versions SET last_updated = '1 January 2026' WHERE client_id = $1`, [c1]);
  const kept = await legal.status(c1);
  chk('The date stays when the text hasn\'t changed', kept.pages[0].lastUpdated === '1 January 2026' && kept.pages[0].text.includes('Last updated: 1 January 2026') && again.pages[0].textHash === kept.pages[0].textHash, kept.pages[0].lastUpdated, '1 January 2026');
  cvs[c1] = { ...cvs[c1], phone: '07000 999999' };
  const moved = await legal.status(c1);
  chk('The date moves when the text changes', moved.pages[0].lastUpdated !== '1 January 2026' && moved.pages[0].textHash !== kept.pages[0].textHash, moved.pages[0].lastUpdated, 'today');

  // ── The safety checks ──
  const c4 = await newClient({ sid: 'legal-c4', name: 'Safety Co', email: 'safe@example.com', phone: '07000000004', subs: 'Yes', late: 'Yes',
    answers: { full_name: 'Pat Doe', business_address: '5 Safe Street, Bath', primary_town: 'Bath', vat_registered: 'No', deposit: 'No', payment_methods: ['Card'] } });
  cvs[c4] = { company_name: 'Safety Co', phone: '01225 000000', email: 'safe@example.com', legal_entity: 'sole_trader', live_domain: 'safety.example', google_ads: 'no', meta_pixel: 'no', sms_tool: 'no' };

  const refusedOn = async (opts, site, test, label) => {
    const f = await connect(c4, opts, site);
    const r = await legal.push(c4, { confirm: true });
    chk(label, !r.ok && r.refusals.some(test) && f.state.writes === 0, [r.refusals, f.state.writes], 'refused, no writes');
    return f;
  };
  await refusedOn({}, { staging: false }, x => /isn't marked as staging/.test(x), 'A site not marked staging: refused');
  const live = await connect(c4);
  sites[c4].url = sites[c4].url.replace('127.0.0.1', 'localhost');
  cvs[c4].live_domain = sites[c4].url;
  const rLive = await legal.push(c4, { confirm: true });
  chk('A connection on the live domain: refused', !rLive.ok && rLive.refusals.some(x => /live domain/.test(x)) && live.state.writes === 0, rLive.refusals, 'refused');
  cvs[c4].live_domain = 'safety.example';
  await refusedOn({ pages: seedPages({ status: 'publish' }) }, { staging: false }, x => /published/.test(x), 'A published page on a site not marked staging: refused');
  await refusedOn({ pages: seedPages({ template: 'default' }) }, {}, x => /None of the legal page fields are attached/.test(x), 'The pages not on the legal template: refused');
  await refusedOn({ pages: seedPages().filter(p => p.id !== 23) }, {}, x => /Website Terms of Use: The legal page was not found/.test(x), 'One page missing: refused, and nothing is written to the others');
  await refusedOn({ plugin: false }, {}, x => /plugin is not active/.test(x), 'No plugin: refused');
  await refusedOn({ pluginVersion: '0.3.0' }, {}, x => /0\.3\.0/.test(x), 'An old plugin: refused');
  await refusedOn({ fieldGroups: ['group_llp_home_hero'] }, {}, x => /group_llp_legal/.test(x), 'The legal field group missing: refused');

  // ── All or none: a failure part way puts the earlier pages back ──
  const failing = createFakeWp({ pages: seedPages(), ignoreAcf: [] });
  const lf = await listen(failing.app);
  servers.push(lf.server);
  sites[c4] = { url: lf.url, user: 'copybot', appPassword: 'test-app-password-not-real', staging: true, seo: 'rankmath' };
  const originalGet = failing.state.pages.get.bind(failing.state.pages);
  // The second page's write is lost: the read back differs
  failing.state.pages.get = id => {
    const p = originalGet(id);
    return id === 22 ? new Proxy(p, { set(t, k, v) { if (k === 'acf') return true; t[k] = v; return true; } }) : p;
  };
  const rPartial = await legal.push(c4, { confirm: true });
  chk('A read back that differs: not ok, and says which page', !rPartial.ok && /Privacy Policy/.test(rPartial.error), rPartial, 'failed');
  chk('...and the page already written is put back', originalGet(21).acf.legal_body === '<p>Old service terms.</p>', originalGet(21).acf.legal_body, 'old');
  chk('...and the third page was never written', !originalGet(23).acf.legal_body, originalGet(23).acf.legal_body, 'empty');
  chk('...and the date isn\'t recorded', (await pool.query(`SELECT 1 FROM legal_page_versions WHERE client_id = $1`, [c4])).rows.length === 0, '', 'none');

  const noSite = await newClient({ sid: 'legal-c5', name: 'No Site', email: 'nosite@example.com', phone: '07000000005', subs: 'Yes', late: 'Yes', answers: {} });
  threw = '';
  try { await legal.dryRun(noSite); } catch (e) { threw = e.message; }
  chk('No WordPress site connected: says so', /no WordPress site connected/.test(threw), threw, 'says so');

  // ── The HTML ──
  chk('HTML: everything is escaped', legalToHtml('A <b> & "c"') === '<p>A &lt;b&gt; &amp; &quot;c&quot;</p>', legalToHtml('A <b> & "c"'), 'escaped');
  chk('HTML: a bold line, with text after it', legalToHtml('**Transfers.** Some text.') === '<p><strong>Transfers.</strong> Some text.</p>', legalToHtml('**Transfers.** Some text.'), 'strong');
  chk('HTML: the title is dropped', legalToHtml('# Title\n\nText') === '<p>Text</p>', legalToHtml('# Title\n\nText'), 'dropped');

  // ── The filled pages, to read ──
  const at = process.argv.indexOf('--write');
  if (at > 0) {
    const toText = html => html.replace(/<h2>(.*?)<\/h2>/g, '\n### $1\n').replace(/<thead><tr>(.*?)<\/tr><\/thead>/g, (m, cells) => `<tr>${cells}</tr>\n${'| --- '.repeat((cells.match(/<th>/g) || []).length)}|`).replace(/<\/tr>/g, '|').replace(/<\/?(ul|table|tbody|tr|div[^>]*)>/g, '').replace(/<li>(.*?)<\/li>/g, '- $1').replace(/<t[hd]>(.*?)<\/t[hd]>/g, '| $1 ').replace(/<strong>(.*?)<\/strong>/g, '**$1**').replace(/<\/?p>/g, '\n').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
    const L = ['# Legal pages: the three test clients on the fake server', '', 'Made-up clients. This is what each fake WordPress page held after the push, turned back into plain text to read.', ''];
    for (const o of outputs) {
      L.push(`## ${o.label}`, '', `**Result:** ${o.result}`, '');
      ['Service Terms', 'Privacy Policy', 'Website Terms of Use'].forEach((title, i) => {
        if (o.bodies[i]) L.push(`### Page: ${title}`, '', toText(o.bodies[i]), '');
      });
    }
    fs.writeFileSync(process.argv[at + 1], L.join('\n') + '\n');
  }

  await Promise.all(servers.map(s => new Promise(r => s.close(r))));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
