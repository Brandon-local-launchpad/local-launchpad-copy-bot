'use strict';
// Fixture: copy quality 5 (4 Nov 2026). The third person "a fair [trade]" rewrite is gone (the claims
// pass, the copy rules, the validator); the verdict is Ready to edit, Claims to accept or Needs another
// run, and judge failures go on the edit list with the whole sentence and the reason; the targeted round
// rewrites a field once and stops; no sixth FAQ slot. No API calls.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { validateV20, buildValidationContext, modelFields } = require(path.join(root, 'validate-v20.js'));
const { runTargetedPass, runClaimRetries } = require(path.join(root, 'v20-retry.js'));
const { verdictFor, verdictLine, verdictOfRecord, liveVerdict, editList, locate, TARGET_ITEMS } = require(path.join(root, 'verdict.js'));
const Q = require(path.join(root, 'quality-review.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: copy quality 5 ===\n');

const cv = { ...E.cv, confirmed_practices: [] };
const DR = computeDecisions({ cv, niche: landscaper, pages: E.pages, keyValueMap: E.keyValueMap, serviceParentMap: {}, v20TestMode: true });
const keys = new Set(Object.keys(E.keyValueMap || {}));
const V = buildValidationContext({ cv, niche: landscaper, decisions: DR.decisions, keyValueMap: E.keyValueMap, populatedCvKeys: new Set([...keys, ...Object.keys(cv)]) });
const rec = JSON.parse(fs.readFileSync(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-record.json'), 'utf8'));
const copy = o => JSON.parse(JSON.stringify(o));
const TAIL = ' We cover the city and the villages around it for lawns, hedges and fences.';
const withIntro = text => { const r = copy(rec); r.home_services_intro = text + TAIL; return r; };
const voice = text => validateV20(withIntro(text), V).filter(i => i.check === 'TRADE-VOICE' && i.field === 'home_services_intro');
const practice = text => validateV20(withIntro(text), V).filter(i => i.check === 'PRACTICE' && i.field === 'home_services_intro');

// ── 1. The third person rewrite is gone ──
for (const t of ['A fair landscaper agrees the plan before any digging.', 'A good landscaper leaves the site clean.', 'Any honest fencer tells you what the posts need.', 'A decent gardener asks about the soil.', 'A landscaper should show you the levels.', 'A fair one explains the drainage first.']) {
  chk(`TRADE-VOICE: "${t}" is a BLOCK`, voice(t).length === 1 && voice(t)[0].type === 'BLOCK', JSON.stringify(voice(t).map(i => i.message)), 'one BLOCK');
}
for (const t of ['A fair number of gardens here sit on clay.', 'The base is a good way to stop the slabs sinking.', 'That is a fair price for the size of the job.', 'A proper border keeps the gravel in place.', 'A decent layer of sand goes under the slabs.', 'It needs a good water supply nearby.']) {
  chk(`TRADE-VOICE: "${t}" passes`, voice(t).length === 0, JSON.stringify(voice(t).map(i => i.message)), 'none');
}
chk('TRADE-VOICE: the message asks for the job itself', voice('A fair landscaper agrees the plan.')[0].message.includes('describe the job itself'), '', 'the job itself');
const nests = practice('A good landscaper will check for nests before any cutting.');
chk('PRACTICE: the third person form of an unconfirmed practice no longer passes, and the message offers the job itself', nests.length === 1 && nests[0].message.includes('describe the job itself') && !nests[0].message.includes('third person'), JSON.stringify(nests.map(i => i.message)), 'one BLOCK');
const rules = fs.readFileSync(path.join(root, 'prompts/_shared_copy_rules.md'), 'utf8');
chk('Shared copy rules: the third person line is out, the job itself is in', !rules.includes('third person') && !rules.includes('a fair roofer') && !rules.includes('a good fitter') && rules.includes('describe the job itself'), '', 'rule changed');
const claimsPrompt = fs.readFileSync(path.join(root, 'prompts/Claims_Review_CORE.md'), 'utf8');
chk('Claims prompt: a sentence describing the job passes, a sentence about how a fair firm behaves fails', claimsPrompt.includes('describes the job itself') && claimsPrompt.includes('how a fair, good or decent firm'), '', 'both');
chk('The Roofer pack and entry no longer model "a fair roofer"', !fs.readFileSync(path.join(root, 'calibration-packs/Roofer_Calibration_Pack_v6.md'), 'utf8').includes('A fair roofer') && !fs.readFileSync(path.join(root, 'niche-library/roofer.json'), 'utf8').includes('a fair roofer') && !fs.readFileSync(path.join(root, 'niche-library/Niche_Library_Roofer.md'), 'utf8').includes('a fair roofer'), '', 'gone');

// ── 2. The verdict ──
const J = (id, quote = 'some words', why = 'why ' + id) => ({ id, by: 'judge', title: id + ' title', pass: false, reasons: [`"${quote}": ${why}`] });
const K = id => ({ id, by: 'code', title: id + ' title', pass: false, reasons: ['why ' + id] });
const FIVE = ['S10', 'P6', 'Y6', 'Y5', 'V9j'].map(id => J(id));
chk('Verdict: judge failures do not gate', verdictFor({ block: 0, failures: FIVE }).state === 'ready', JSON.stringify(verdictFor({ block: 0, failures: FIVE })), 'ready');
chk('Verdict: nothing failed is Ready to edit', verdictFor({}).label === 'Ready to edit', verdictFor({}).label, 'Ready to edit');
chk('Verdict: a BLOCK is Needs another run', verdictFor({ block: 1 }).label === 'Needs another run', '', 'Needs another run');
chk('Verdict: a failed code item is Needs another run', verdictFor({ failures: [K('Y2')] }).label === 'Needs another run', '', 'Needs another run');
chk('Verdict: claims not accepted is Claims to accept, which is not a failed code item', (() => { const v = verdictFor({ failures: [K('C9')] }); return v.state === 'claims' && !v.code_failed.length; })(), '', 'claims');
const CL = { status: 'needs acceptance', findings: [{ quote: 'a' }, { quote: 'b' }], accepted: [{ quote: 'a' }] };
chk('Verdict: one of two claims accepted is still Claims to accept', verdictFor({ failures: [K('C9')], claims: CL }).state === 'claims', '', 'claims');
chk('Verdict: every claim accepted is Ready to edit, though C9 failed on the mark sheet', verdictFor({ failures: [K('C9')], claims: { ...CL, accepted: [{ quote: 'a' }, { quote: 'b' }] } }).state === 'ready', '', 'ready');
chk('Verdict: a claims review that failed to run is not clear', verdictFor({ claims: { status: 'failed', findings: [] } }).state === 'claims', '', 'claims');
chk('Verdict: a BLOCK outranks accepted claims', verdictFor({ block: 2, claims: { findings: [] } }).state === 'run', '', 'run');
chk('Verdict line: says what stops it, and says nothing about the judge items', verdictLine(verdictFor({ block: 1, failures: [K('P3'), J('Y5')] })) === 'NEEDS ANOTHER RUN: 1 BLOCK; 1 failed code item (P3)', verdictLine(verdictFor({ block: 1, failures: [K('P3'), J('Y5')] })), 'the line');
chk('Verdict line: ready', verdictLine(verdictFor({ failures: [J('Y5')] })) === 'READY TO EDIT', verdictLine(verdictFor({ failures: [J('Y5')] })), 'READY TO EDIT');
chk('Verdict of a failed review: none', verdictOfRecord({ QUALITY: { status: 'failed' } }) === null, '', 'null');
chk('Verdict of an older record: worked out again from its failures', verdictOfRecord({ QUALITY: { verdict: { publishable: false }, failures: [J('S10')] }, VALIDATION: { block: 0 } }).state === 'ready', '', 'ready');

// ── The edit list ──
const r0 = copy(rec);
r0.home_services_intro = 'We look after lawns and hedges across the city. Mature trees there mean the layout matters as much as the planting. Call us when the garden has got away from you.';
const phrase = 'the layout matters as much';
const whole = 'Mature trees there mean the layout matters as much as the planting.';
chk('locate: a short quote gives the whole sentence and its field', (() => { const w = locate(r0, phrase); return w && w.sentence === whole && w.field === 'home_services_intro'; })(), JSON.stringify(locate(r0, phrase)), whole);
const list = editList({ record: r0, issues: [], judge: [J('Y5', phrase, 'Clumsy.')] });
chk('Edit list: a judge failure carries the exact sentence, the reviewer reason and the field', list.length === 1 && list[0].sentence === whole && list[0].reason === 'Clumsy.' && list[0].field === 'home_services_intro' && list[0].item === 'Y5' && list[0].kind === 'judge', JSON.stringify(list), 'the entry');
const quoteElse = editList({ record: r0, issues: [], judge: [J('Y5', 'words that are not in any field at all', 'Odd.')] });
chk('Edit list: a quote from a code built line keeps the quote, with no field to open', quoteElse.length === 1 && quoteElse[0].field === null && quoteElse[0].sentence.startsWith('words that'), JSON.stringify(quoteElse), 'no field');
const gone = editList({ record: { ...r0, meta: { ...(r0.meta || {}), edited_at: 'now' } }, issues: [], judge: [J('Y5', 'words that are not in any field at all', 'Odd.')] });
chk('Edit list: after a hand edit, a sentence no longer on the page drops off', gone.length === 0, JSON.stringify(gone), 'none');
const blockIssue = { type: 'BLOCK', check: 'KEYWORD', field: 'home_services_intro', message: 'The keyword phrase "the layout matters as much" appears here.' };
const coded = editList({ record: r0, issues: [blockIssue], judge: [], codeFailed: [] });
chk('Edit list: a BLOCK left over is listed with its field, its sentence and the message', coded.length === 1 && coded[0].kind === 'code' && coded[0].item === 'KEYWORD' && coded[0].sentence === whole && coded[0].reason === blockIssue.message, JSON.stringify(coded), 'the entry');
const rangeIssue = { type: 'FLAG', check: 'N7', field: 'home_services_intro', message: '500 words: it must be 40 to 60.' };
const rangeList = editList({ record: r0, issues: [rangeIssue], judge: [], codeFailed: Q.codeFailuresFromIssues(r0, [rangeIssue]) });
chk('Edit list: a field out of range is listed whole, under its code item', rangeList.length === 1 && rangeList[0].item === 'Y2' && rangeList[0].sentence === null, JSON.stringify(rangeList), 'Y2, whole field');
const twoItems = editList({ record: r0, issues: [blockIssue, blockIssue], judge: [], codeFailed: [] });
chk('Edit list: the same failure twice is listed once', twoItems.length === 1, twoItems.length, 1);

// ── The verdict on the live page ──
const live = (over = {}, issues = []) => liveVerdict({ record: { ...r0, CLAIMS: { status: 'clear', findings: [] }, QUALITY: { failures: [J('Y5', phrase, 'Clumsy.')] }, ...over }, issues });
chk('Live verdict: no issues and a judge failure is Ready to edit, with the sentence on the list', (() => { const v = live(); return v.state === 'ready' && v.reviewed && v.edit_list.length === 1 && v.edit_list[0].sentence === whole; })(), JSON.stringify(live()), 'ready');
chk('Live verdict: a code failure in today\'s issues is Needs another run', live({}, [rangeIssue]).state === 'run', JSON.stringify(live({}, [rangeIssue])), 'run');
chk('Live verdict: a person fixing the field clears the code failure without another review', (() => { const stale = { failures: [{ ...K('Y2'), reasons: ['home_services_intro: 500 words: it must be 40 to 60.'] }] }; return live({ QUALITY: stale }, []).state === 'ready'; })(), '', 'ready');
chk('Live verdict: unaccepted claims are Claims to accept; accepted, Ready to edit', live({ CLAIMS: CL }).state === 'claims' && live({ CLAIMS: { ...CL, accepted: [{ quote: 'a' }, { quote: 'b' }] } }).state === 'ready', '', 'claims, then ready');
chk('Live verdict: no rubric review still gives the verdict, with no judge items', (() => { const v = live({ QUALITY: undefined }); return v.state === 'ready' && !v.reviewed && v.edit_list.length === 0; })(), '', 'ready, unreviewed');

// ── The mark sheet and the page view ──
const failed = [J('S10', phrase, 'Clumsy.'), J('P6'), J('Y6')];
const rv = { score: 7.5, score_writing: 7.5, done: false, failed: failed.map(i => i.id), items: failed, other_problems: [], missing_facts: [], needs_fact: [], validator: { block: 0, flag: 0 }, verdict: verdictFor({ failures: failed }), edit_list: editList({ record: r0, judge: failed }) };
const sheet = Q.formatReview(rv);
chk('Mark sheet: the verdict comes first, the score stays for tracking', sheet.startsWith('Verdict: READY TO EDIT') && sheet.includes('Score (for tracking): 7.5'), sheet.slice(0, 160), 'Verdict, then Score');
chk('Mark sheet: Edit before publishing lists the sentence and the reason', sheet.includes('Edit before publishing (3):') && sheet.includes(whole) && sheet.includes('Clumsy.'), sheet, 'the list');
const pageJs = fs.readFileSync(path.join(root, 'public/app/screens/page.js'), 'utf8');
chk('Page view: the three verdicts and the Edit before publishing card, with a button into the page editor', ['Ready to edit', 'Claims to accept', 'Needs another run', 'Edit before publishing', 'data-edit-field'].every(x => pageJs.includes(x)), '', 'present');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
chk('The fields route gives the live verdict', server.includes('liveVerdict({ record: found.record, issues })'), '', 'present');

// ── 3. The targeted round ──
chk('Target items: the nine Brandon named', TARGET_ITEMS.join(' ') === 'Y2 P3 P4 F1 Y11 K1 I1 S7 B3', TARGET_ITEMS.join(' '), 'the nine');
const LONG = 'We look after gardens for homeowners across the city and the villages around it, and every visit starts with a walk round so the work suits the garden rather than a standard list, and the lawns, the hedges, the beds and the paths between them are all part of what a visit covers through the year, whatever the season brings and whatever the garden needs most at the time.';
const SHORT = 'We look after gardens across the city and the villages around it. Every visit starts with a walk round the garden, so the work suits what is there rather than a standard list. Lawns, hedges, beds and paths are all part of it.';
const fieldOf = message => message.match(/^FIELD: (.+?)(?: \((?:\d+ to \d+|under \d+) words\))?$/m)[1];
const check = r => validateV20(r, V);
(async () => {
  const r1 = copy(rec); r1.home_services_intro = LONG;
  const before = Q.targetIssues(r1, check(r1));
  chk('Target issues: a field out of range is a target', before.some(i => i.field === 'home_services_intro' && i.check === 'N7'), JSON.stringify(before.map(i => i.check)), 'N7 on the field');
  const calls = [];
  const out = await runTargetedPass({ record: r1, V, validate: check, callRetry: async ({ message }) => {
    const f = fieldOf(message); calls.push({ f, message });
    return { text: f === 'home_services_intro' ? `home_services_intro: ${SHORT}` : '', usage: { input_tokens: 1, output_tokens: 1 } };
  } });
  const mine = calls.filter(c => c.f === 'home_services_intro');
  chk('Targeted round: the field is rewritten once, with its failure message, and the fix is kept', mine.length === 1 && /words: it must/.test(mine[0].message) && r1.home_services_intro === SHORT && out.log.some(l => l.field === 'home_services_intro' && l.kept), JSON.stringify(out.log.map(l => [l.field, l.kept, l.error])), 'once, kept');
  chk('Targeted round: every field called had a target issue, and each only once', new Set(calls.map(c => c.f)).size === calls.length && calls.every(c => before.some(i => i.field === c.f)), JSON.stringify(calls.map(c => c.f)), 'targets only');
  chk('Targeted round: before, after, kept and what is left come back', out.before === before.length && out.after === out.left.length && out.kept >= 1 && out.after < out.before, JSON.stringify({ b: out.before, a: out.after, k: out.kept }), 'counts');

  const r2 = copy(rec); r2.home_services_intro = LONG;
  let n = 0;
  const out2 = await runTargetedPass({ record: r2, V, validate: check, callRetry: async ({ message }) => { const f = fieldOf(message); if (f === 'home_services_intro') n++; return { text: f === 'home_services_intro' ? `home_services_intro: ${LONG} And one more line about the garden.` : '', usage: {} }; } });
  chk('Targeted round: a rewrite that does not help is not kept, is not tried again, and the field is left for the edit list', r2.home_services_intro === LONG && n === 1 && out2.left.some(i => i.field === 'home_services_intro' && i.check === 'N7'), JSON.stringify(out2.left.slice(0, 2)), 'left');

  const r3 = copy(rec); r3.home_services_intro = LONG;
  const out3 = await runTargetedPass({ record: r3, V, validate: check, callRetry: async ({ message }) => { const f = fieldOf(message); return { text: f === 'home_services_intro' ? `home_services_intro: ${SHORT.replace('so the work suits', 'so the work — suits')}` : '', usage: {} }; } });
  chk('Targeted round: a rewrite that adds a BLOCK is not kept', r3.home_services_intro === LONG && out3.log.some(l => l.field === 'home_services_intro' && !l.kept && /BLOCK/.test(l.error || '')), JSON.stringify(out3.log.filter(l => l.field === 'home_services_intro').map(l => l.error)), 'not kept');

  // A flag behind no listed item is not a target (P5, sentence openers)
  const p5 = { type: 'FLAG', check: 'N18', field: 'home_services_intro', message: 'Back to back sentences start with "the".', ref: {} };
  chk('Target issues: a code item Brandon did not list is not a target on its own', Q.targetIssues(r1, [p5]).length === 0, '', 'none');
  chk('Target issues: every BLOCK is', Q.targetIssues(r1, [{ ...blockIssue, check: 'WHATEVER' }]).length === 1, '', 'one');

  // ── The claims pass instruction ──
  const r4 = copy(rec);
  let claimMessage = '';
  let round = 0;
  await runClaimRetries({ record: r4, V, maxRounds: 1, review: async () => ({ at: 'now', findings: round++ ? [] : [{ field: 'home_final_cta_body', quote: r4.home_final_cta_body.split('. ')[0], why: 'No practice on file says so.' }] }), callRetry: async ({ message }) => { claimMessage = message; return { text: 'home_final_cta_body: Call us on [CV: phone] and tell us about the garden.', usage: {} }; } });
  const line = claimMessage.split('\n').find(l => l.includes('Unsupported claim')) || '';
  chk('Claims pass: delete or describe the job itself; never the third person', line.includes('describe the job itself') && line.includes('No "we", no "a fair [trade]"') && !line.includes('third person'), line, 'the job itself');

  // ── 4. No sixth FAQ slot ──
  const lib = path.join(root, 'niche-library');
  const six = [];
  for (const f of fs.readdirSync(lib).filter(x => x.endsWith('.json') && !['client-facts.json', 'practices.json'].includes(x))) {
    const e = JSON.parse(fs.readFileSync(path.join(lib, f), 'utf8'));
    for (const [l, b] of Object.entries(e.service_page_blocks || {})) {
      const n = new Set(((b && b.faq_slots) || []).filter(s => s.when !== 'rule_rows').map(s => s.slot)).size;
      if (n > 5) six.push(`${f} ${l}: ${n}`);
    }
  }
  chk('No sixth FAQ slot was added to any service entry', !six.length, six.join('; '), 'none');

  console.log(`\n=== copy quality 5: ${pass} passed, ${fail} failed ===\n`);
  if (fail) process.exitCode = 1;
})();
