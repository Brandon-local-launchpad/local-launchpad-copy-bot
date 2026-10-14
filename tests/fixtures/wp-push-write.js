'use strict';
// Fixture: WordPress push, slice 3. The real push against the fake site:
// refusals write nothing, a push writes once and verifies, a snapshot lets it be
// rolled back exactly, and failures are logged. Claims review parsing with canned
// replies. No API calls.
const path = require('path');
const root = path.join(__dirname, '../..');
const { push, rollback } = require(path.join(root, 'wp/push.js'));
const { createMemoryStore } = require(path.join(root, 'wp/push-store.js'));
const { parseFindings, buildClaimsMessage } = require(path.join(root, 'wp/claims-review.js'));
const G = require(path.join(root, 'v20-generate.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const { createFakeWp, seedHomepage, listen } = require(path.join(__dirname, '../fake-wp/fake-wp.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: WordPress push (write, verify, rollback) ===\n');

const old = require(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));
const record = { ...old, meta: { ...old.meta, client_values: G.clientValueMap({ ...E.ethanValues(), phone: '023 0000 0000' }, null) } };
const at = record.meta.generated_at;
const noFindings = { for: at, findings: [] };
const twoFindings = { for: at, findings: [
  { field: 'home_final_cta_body', quote: "we'll come out", why: 'Visit not confirmed' },
  { field: 'faq_answer (How soon can you start?)', quote: 'We can usually start the same week.', why: 'test' } ] };

// ── Claims review parsing ──
const reply = JSON.stringify({ findings: [
  { field: 'faq_answer (How soon can you start?)', quote: 'We can usually start the same week.', why: 'ok to keep' },
  { field: 'home_final_cta_body', quote: 'we guarantee a reply within the hour', why: 'invented quote' },
  { field: 'not a field', quote: 'x', why: 'bad field' } ] });
const pf = parseFindings('```json\n' + reply + '\n```', record);
chk('Claims parse: keeps a real quote, drops an invented quote and an unknown field', pf.findings.length === 1 && pf.dropped.length === 2, JSON.stringify(pf), '1 kept, 2 dropped');
const cm = buildClaimsMessage(record, { clientBlock: 'CLIENT VALUES\n[CV: start_time] = same week', research: 'ALLOCATED ITEMS:\n  Neighbourhood: Bassett Heath' });
const trailing = parseFindings(reply + '\n\nNote: I also checked {other} things and they are fine.', record);
chk('Claims parse: text after the JSON (with braces) is ignored', trailing.findings.length === 1, JSON.stringify(trailing), '1 kept');
chk('Claims message: facts, research and every model field', /FACTS ON FILE:\nCLIENT VALUES/.test(cm) && /Bassett Heath/.test(cm) && /home_final_cta_body: /.test(cm) && /faq_answer \(How soon can you start\?\): /.test(cm), '', 'all parts');

(async () => {
  // ── Claims findings through the per-field retries ──
  const { runClaimRetries } = require(path.join(root, 'v20-retry.js'));
  const { buildValidationContext } = require(path.join(root, 'validate-v20.js'));
  const { computeDecisions } = require(path.join(root, 'decisions.js'));
  const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
  const DR = computeDecisions({ cv: E.ethanValues(), niche: landscaper, pages: E.pages, keyValueMap: E.keyValueMap, serviceParentMap: {}, v20TestMode: true, allocationData: null });
  const V = buildValidationContext({ cv: E.ethanValues(), niche: landscaper, decisions: DR.decisions, keyValueMap: E.keyValueMap, populatedCvKeys: new Set(Object.keys(record.meta.client_values)) });
  const ctaQuote = "we'll come out, take a look, and give you a price";
  const stuckQuote = 'We can usually start the same week.';
  const has = (rec, field, q) => { const t = field === 'cta' ? rec.home_final_cta_body : rec.faq_items[3].faq_answer; return t.toLowerCase().includes(q.toLowerCase()); };
  const reviews = [];
  const review = async rec => {
    const findings = [];
    if (has(rec, 'cta', ctaQuote)) findings.push({ field: 'home_final_cta_body', quote: ctaQuote, why: 'visit not confirmed' });
    if (has(rec, 'faq', stuckQuote)) findings.push({ field: 'faq_answer (How soon can you start?)', quote: stuckQuote, why: 'test' });
    reviews.push(findings.length);
    return { for: at, at: 'now', findings };
  };
  const calls = [];
  const callRetry = async ({ message }) => {
    const field = message.match(/^FIELD: (.+?)(?: \((?:\d+ to \d+|under \d+) words\))?$/m)[1];
    calls.push(field);
    if (field === 'home_final_cta_body') return { text: "home_final_cta_body: Send us a few photos of your garden and we'll get back to you with a price for the work." };
    return { text: 'faq_answer: We can usually start the same week. Call [CV: phone] or send a message and we will let you know what is free for your job and when.' }; // claim kept
  };
  const rec2 = JSON.parse(JSON.stringify(record));
  const out = await runClaimRetries({ record: rec2, V, callRetry, review });
  chk('Claims retries: the fixable claim is rewritten away and kept', !has(rec2, 'cta', ctaQuote) && out.rounds[0].retries.some(x => x.field === 'home_final_cta_body' && x.kept), rec2.home_final_cta_body, 'rewritten');
  chk('Claims retries: a rewrite that keeps the claim is not kept', out.rounds.every(r => r.retries.filter(x => /How soon/.test(x.field)).every(x => !x.kept && x.error === 'the claim is still there')), JSON.stringify(out.rounds.map(r => r.retries.map(x => x.error))), 'not kept');
  chk('Claims retries: 2 rounds, then a final review; only the stuck claim is left', out.rounds.length === 2 && reviews.join() === '2,1,1' && out.claims.findings.length === 1 && out.claims.findings[0].quote === stuckQuote, `reviews ${reviews.join()}`, '2,1,1');
  chk('Claims retries: first review count kept for the record', out.first === 2, out.first, 2);

  // A failed review: the push asks for it again
  const failed = { ...record, CLAIMS: { for: at, status: 'failed', error: 'no JSON in the claims review reply', findings: [] } };
  const f0 = createFakeWp({ pages: [seedHomepage()] });
  const l0 = await listen(f0.app);
  try {
    const r0 = await push({ record: failed, site: { url: l0.url, user: 'copybot', appPassword: 'test-app-password-not-real' }, store: createMemoryStore(), reviewed: true });
    chk('Record whose claims review failed: push refused until it is run again', !r0.ok && r0.refusals.some(x => /claims review failed/.test(x)) && f0.state.writes === 0, r0.refusals.join(' | '), 'refused');
    const clear = { ...record, CLAIMS: { for: at, status: 'clear', findings: [] } };
    const r1 = await push({ record: clear, site: { url: l0.url, user: 'copybot', appPassword: 'test-app-password-not-real' }, store: createMemoryStore(), reviewed: true });
    chk('Record with its own clear claims review (from generation): pushes without another review', r1.ok && r1.result === 'pushed', JSON.stringify(r1.refusals || r1.result), 'pushed');
  } finally { await new Promise(res => l0.server.close(res)); }

  const fake = createFakeWp({ pages: [seedHomepage()] });
  const { server, url } = await listen(fake.app);
  const site = { url, user: 'copybot', appPassword: 'test-app-password-not-real' };
  const store = createMemoryStore();
  const page = () => fake.state.pages.get(7);
  try {
    // Refusals write nothing
    let r = await push({ record, site, store, reviewed: true });
    chk('No claims review: refused, nothing written', !r.ok && r.refusals.some(x => /Run the claims review/.test(x)) && fake.state.writes === 0, r.refusals.join(' | '), 'refused');
    r = await push({ record, site, store, reviewed: true, claims: twoFindings });
    chk('Claims findings not accepted: refused, nothing written', !r.ok && r.refusals.some(x => /found 2 statement/.test(x)) && fake.state.writes === 0, r.refusals.join(' | '), 'refused');
    r = await push({ record, site, store, reviewed: true, claims: { ...noFindings, for: 'another version' } });
    chk('Claims review for another version: refused', !r.ok && r.refusals.some(x => /different version/.test(x)) && fake.state.writes === 0, r.refusals.join(' | '), 'refused');
    r = await push({ record, site, store, claims: noFindings });
    chk('FLAGs not reviewed: refused, nothing written', !r.ok && r.refusals.some(x => /FLAG/.test(x)) && fake.state.writes === 0, r.refusals.join(' | '), 'refused');

    // A push
    r = await push({ record, recordId: 'rec-1', site, store, reviewed: true, claims: twoFindings, acceptClaims: true });
    chk('Push: written and read back without differences', r.ok && r.result === 'pushed' && !r.mismatches.length, JSON.stringify({ result: r.result, mismatches: r.mismatches }), 'pushed');
    chk('Push: two writes (page, then Client Values)', fake.state.writes === 2, fake.state.writes, 2);
    chk('Push: the page holds the new copy, still a draft', page().acf.home_hero_h1 === 'Landscaper Southampton' && page().acf.home_services_cards.length === 7 && page().status === 'draft', `${page().acf.home_hero_h1} / ${page().status}`, 'new H1, draft');
    chk('Push: SEO meta and Client Values written', page().meta.rank_math_title === record.seo_title && fake.state.clientValues.company_name === 'Edens Edge Landscaping', '', 'written');
    chk('Push: tokens left in the page for the site', /\[CV: company_name\]/.test(page().acf.home_hero_intro), page().acf.home_hero_intro.slice(0, 80), 'token');
    const log = await store.listLog();
    chk('Log: 4 refusals then the push, with the snapshot and accepted claims', log.length === 5 && log.slice(0, 4).every(l => l.result === 'refused') && log[4].result === 'pushed' && log[4].snapshotId === r.snapshotId && log[4].acceptedClaims === true && log[4].claims === 2, JSON.stringify(log.map(l => l.result)), '4 refused, 1 pushed');
    const snap = await store.getSnapshot(r.snapshotId);
    chk('Snapshot holds what the site had before', snap.acf.home_hero_h1 === 'Gardener Southampton | Edens Edge' && snap.meta.rank_math_title === 'Edens Edge landscaping' && Object.keys(snap.clientValues).length === 0, JSON.stringify({ h1: snap.acf.home_hero_h1, t: snap.meta.rank_math_title }), 'old values');

    // Rollback
    const rb = await rollback({ snapshotId: r.snapshotId, site, store });
    chk('Rollback: restored and read back without differences', rb.ok && !rb.mismatches.length, JSON.stringify(rb), 'restored');
    chk('Rollback: old H1, old card, old title, fields that were empty are empty again', page().acf.home_hero_h1 === 'Gardener Southampton | Edens Edge' && page().acf.home_services_cards.length === 1 && page().acf.home_services_cards[0].card_text === '<p>Old gardener card.</p>' && page().meta.rank_math_title === 'Edens Edge landscaping' && page().acf.home_content_block_body === '', `${page().acf.home_hero_h1} / ${page().acf.home_services_cards.length} card(s)`, 'old state');
    chk('Rollback: Client Values the site didn\'t have are cleared', fake.state.clientValues.company_name === '' && fake.state.clientValues.phone === '', JSON.stringify(fake.state.clientValues).slice(0, 80), 'cleared');
    chk('Rollback logged', (await store.listLog()).slice(-1)[0].action === 'rollback', '', 'logged');
    const rbWrong = await rollback({ snapshotId: r.snapshotId, site: { ...site, url: 'https://other.example' }, store });
    chk('Rollback refuses a snapshot from another site', !rbWrong.ok && /is for/.test(rbWrong.error), rbWrong.error, 'refused');

    // Published page
    page().status = 'publish';
    const writes = fake.state.writes;
    r = await push({ record, site, store, reviewed: true, claims: noFindings });
    chk('Published homepage: refused, nothing written', !r.ok && r.refusals.some(x => /published/.test(x)) && fake.state.writes === writes, r.refusals.join(' | '), 'refused');
    page().status = 'draft';
  } finally { await new Promise(res => server.close(res)); }

  // A site that fails the write; a site that doesn't save one field
  for (const [label, opts, test] of [
    ['Write fails: logged as failed with the snapshot, no false success', { failWrites: true }, (r, log) => !r.ok && /500/.test(r.error) && log.slice(-1)[0].result === 'failed' && log.slice(-1)[0].snapshotId],
    ['Site drops a field: logged as read-back differs, naming it', { ignoreAcf: ['home_cta_band_line'] }, (r, log) => !r.ok && r.mismatches.includes('home_cta_band_line') && log.slice(-1)[0].result === 'written, read-back differs'],
  ]) {
    const f2 = createFakeWp({ pages: [seedHomepage()], ...opts });
    const l2 = await listen(f2.app);
    const st = createMemoryStore();
    try {
      const r = await push({ record, site: { ...{ user: 'copybot', appPassword: 'test-app-password-not-real' }, url: l2.url }, store: st, reviewed: true, claims: noFindings });
      chk(label, test(r, await st.listLog()), JSON.stringify({ ok: r.ok, error: r.error, mismatches: r.mismatches }), 'as described');
    } finally { await new Promise(res => l2.server.close(res)); }
  }

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
