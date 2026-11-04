'use strict';
// Fixture: copy quality 4 (4 Nov 2026). Symptoms from the page's own service only, with the next FAQ
// slot in their place; the town links code picks and rotates, exempt from the cross page check; step
// titles that promise a practice; the publishable verdict. No API calls.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const A = require(path.join(root, 'allocation.js'));
const CB = require(path.join(root, 'category-blocks.js'));
const { rotateTowns } = require(path.join(root, 'service-decisions.js'));
const { isTownListSentence, matchIdea } = require(path.join(root, 'ideas.js'));
const { verdictFor, verdictLine, verdictOfRecord } = require(path.join(root, 'verdict.js'));
const { formatReview } = require(path.join(root, 'quality-review.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: copy quality 4 ===\n');

// ── 1. Symptoms: the page's own service, never the category's ──
const parsed = parseDossier(fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'));
const noTag = A.symptomsForService(parsed, { service: 'Moon gardening', category: 'Gardener', emergencyNiche: false });
chk('Symptoms: a service with no tag gets none, even when its category has some', noTag.length === 0, JSON.stringify(noTag), '[]');
const cat = A.symptomsForCategory(parsed, { category: 'Gardener', names: ['Gardener'], emergencyNiche: false });
chk('Symptoms: the category does have symptoms to borrow, so the check above means something', cat.length > 0, cat.length, 'more than 0');
const own = A.symptomsForService(parsed, { service: 'Lawn mowing', names: ['Lawn mowing and maintenance'], category: 'Gardener', emergencyNiche: false });
chk('Symptoms: every symptom on a tagged service is its own', own.length > 0 && own.every(s => s.by !== 'category'), JSON.stringify(own.map(s => s.by)), 'none by category');

// ── 2. Town links ──
const T = names => names.map(n => ({ name: n, url: '/' + n.toLowerCase().split(' ').join('-') }));
const towns = T(['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst']);
const parent = ['romsey', 'winchester', 'eastleigh'];
const page0 = rotateTowns(towns, { avoid: parent, index: 0 }).map(t => t.name);
const page1 = rotateTowns(towns, { avoid: parent, index: 1 }).map(t => t.name);
const page2 = rotateTowns(towns, { avoid: parent, index: 2 }).map(t => t.name);
chk('Town links: three towns a page, none from the parent category, where enough exist', page0.length === 3 && !page0.some(n => parent.includes(n.toLowerCase())), page0.join(', '), 'three others');
chk('Town links: sibling pages link different towns where enough exist', !page0.some(n => page1.includes(n)) && !page1.some(n => page2.includes(n)), [page0, page1].join(' | '), 'no overlap');
const few = T(['Romsey', 'Winchester', 'Eastleigh', 'Totton']);
const fewPick = rotateTowns(few, { avoid: parent, index: 0 }).map(t => t.name);
chk('Town links: too few fresh towns tops up from the parent list, three in all', fewPick.length === 3 && fewPick[0] === 'Totton', fewPick.join(', '), 'Totton first, then two others');
chk('Town links: fewer towns than three gives them all', rotateTowns(T(['Romsey', 'Totton']), { avoid: [], index: 5 }).length === 2, '', '2');
chk('Town links: no towns gives none', rotateTowns([], { index: 1 }).length === 0, '', '0');
const list = 'We work in [Chandlers Ford](/a), [Eastleigh](/b) and [Hedge End](/c) too.';
const names = ['Chandlers Ford', 'Eastleigh', 'Hedge End', 'Romsey', 'Winchester'];
chk('IDEAS: the town list sentence is exempt', isTownListSentence(list, names), false, true);
chk('IDEAS: it would have matched without the exemption, so the exemption is what clears it', !!matchIdea(list, [{ page: 'Tree Service', text: 'Chandlers Ford, Eastleigh, Hedge End, Romsey and Winchester all sit inside that reach.' }]), false, true);
chk('IDEAS: a sentence with one town and a real idea is not exempt', !isTownListSentence('Clay soil in Eastleigh holds water through winter, so fence posts heave and lean over time.', names), true, false);
chk('IDEAS: two towns inside a real idea are not exempt', !isTownListSentence('Clay soil in Eastleigh and Romsey holds water through winter, so fence posts heave and lean within several seasons.', names), true, false);

// ── 3. Step titles ──
const niche = { step_2_no_visit: { title: 'We Price Your Job', brief: 'Plain.' } };
const emergency = [{ title: 'Call Us', brief: 'a' }, { title: 'We Agree the Price Before We Set Out', brief: 'b' }, { title: 'We Get You Back In', brief: 'c' }];
const none = CB.gateStepTitles(emergency, { niche, cv: {}, emergencyOn: true });
chk('Emergency step 2: without quote_method it reads We Come Out and Make It Safe', none[1].title === 'We Come Out and Make It Safe', none[1].title, 'We Come Out and Make It Safe');
chk('Emergency step 2: the new brief names no price and no arrival time unless response_time is set', none[1].brief.includes('response_time') && none[1].brief.includes('Nothing about how the price'), none[1].brief, 'the conditions');
const some = CB.gateStepTitles(emergency, { niche, cv: { quote_method: 'Over the phone' }, emergencyOn: true });
chk('Emergency step 2: quote_method confirms the title', some[1].title === 'We Agree the Price Before We Set Out', some[1].title, 'unchanged');
const arrival = [{ title: 'Call', brief: '' }, { title: 'We Give You a Price and an Arrival Time', brief: '' }, { title: 'Done', brief: '' }];
chk('Emergency step 2: an arrival time also needs response_time', CB.gateStepTitles(arrival, { niche, cv: { quote_method: 'x' }, emergencyOn: true })[1].title === 'We Come Out and Make It Safe' && CB.gateStepTitles(arrival, { niche, cv: { quote_method: 'x', response_time: '1 hour' }, emergencyOn: true })[1].title === arrival[1].title, '', 'swap, then keep');
const plain = [{ title: 'Tell Us', brief: '' }, { title: 'We Visit and Price the Job', brief: '' }, { title: 'We Do It', brief: '' }];
chk('Plain step 2: a visit before the price needs site_visit_before_quote', CB.gateStepTitles(plain, { niche, cv: {} })[1].title === 'We Price Your Job' && CB.gateStepTitles(plain, { niche, cv: { confirmed_practices: ['site_visit_before_quote'] } })[1].title === 'We Visit and Price the Job', '', 'swap, then keep');
const written = [{ title: 'Tell Us', brief: 'x' }, { title: 'We Price It', brief: 'y' }, { title: 'You Get the Reading in Writing', brief: 'z' }];
const wr = CB.gateStepTitles(written, { niche, cv: {} });
chk('Any step: a title stating an unconfirmed practice goes plain and keeps its brief', wr[2].title === 'We Do the Work' && wr[2].brief === 'z', JSON.stringify(wr[2]), 'We Do the Work');
chk('Any step: confirmed, the title stays', CB.gateStepTitles(written, { niche, cv: { confirmed_practices: ['written_quote'] } })[2].title === written[2].title, '', 'unchanged');
// Every niche's emergency steps on a client with no quote method and no practices
const dir = path.join(root, 'niche-library');
const bad = [];
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json') && !['client-facts.json', 'practices.json'].includes(x))) {
  const entry = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const key of ['service_page_blocks', 'category_page_blocks']) {
    for (const [letter, blk] of Object.entries(entry[key] || {})) {
      const got = CB.gateStepTitles((blk || {}).steps_emergency, { niche: entry, cv: {}, emergencyOn: true }) || [];
      if (got[1] && /price|arrival/i.test(got[1].title)) bad.push(`${f} ${key} ${letter}: ${got[1].title}`);
    }
  }
}
chk('Every niche: no emergency step 2 promises a price or an arrival on a client with neither', !bad.length, bad.join('; '), 'none');

// ── 4. The verdict ──
const J = id => ({ id, by: 'judge', title: id + ' title', pass: false, reasons: ['why ' + id] });
const K = id => ({ id, by: 'code', title: id + ' title', pass: false, reasons: ['why ' + id] });
chk('Verdict: nothing failed is publishable', verdictFor({ block: 0, failures: [] }).publishable, false, true);
const two = verdictFor({ block: 0, failures: [J('S10'), J('P6')] });
chk('Verdict: two judge failures are publishable, and listed for a person', two.publishable && two.judge_failed.map(j => j.id).join() === 'S10,P6' && two.judge_failed[0].reasons[0] === 'why S10', JSON.stringify(two), 'publishable');
chk('Verdict: three judge failures are not', !verdictFor({ block: 0, failures: [J('S10'), J('P6'), J('Y6')] }).publishable, true, false);
chk('Verdict: one BLOCK is not', !verdictFor({ block: 1, failures: [] }).publishable, true, false);
chk('Verdict: one failed code item is not', !verdictFor({ block: 0, failures: [K('H1')] }).publishable, true, false);
const c9 = verdictFor({ block: 0, failures: [K('C9')] });
chk('Verdict: the claims review not clear is not, named as the claims and not as a code item', !c9.publishable && !c9.claims_clear && !c9.code_failed.length && c9.reasons[0].includes('C9'), JSON.stringify(c9), 'C9');
chk('Verdict line: says what stops it', verdictLine(verdictFor({ block: 2, failures: [] })).startsWith('NOT PUBLISHABLE: 2 BLOCK'), verdictLine(verdictFor({ block: 2 })), '2 BLOCK');
chk('Verdict line: a publishable page names what a person reads', verdictLine(two) === 'PUBLISHABLE (a person reads: S10, P6)', verdictLine(two), 'PUBLISHABLE (a person reads: S10, P6)');
chk('Verdict of an older record: worked out from its failures and validation', verdictOfRecord({ QUALITY: { failures: [J('S10')] }, VALIDATION: { block: 1 } }).reasons[0] === '1 BLOCK', '', '1 BLOCK');
chk('Verdict of a failed review: none', verdictOfRecord({ QUALITY: { status: 'failed' } }) === null, '', 'null');
const rv = { score: 7.5, score_writing: 7.5, done: false, failed: ['S10', 'P6', 'Y6'], items: [J('S10'), J('P6'), J('Y6')], other_problems: [], missing_facts: [], needs_fact: [], validator: { block: 0, flag: 0 }, verdict: verdictFor({ block: 0, failures: [J('S10'), J('P6'), J('Y6')] }) };
const sheet = formatReview(rv);
const vAt = sheet.indexOf('Verdict: NOT PUBLISHABLE'), sAt = sheet.indexOf('Score (for tracking): 7.5');
chk('Mark sheet: the verdict sits next to the score, which stays for tracking', vAt === 0 && sAt > 0 && sAt < 200, sheet.slice(0, 200), 'Verdict line, then Score');
chk('Mark sheet: the judge failures are listed for a person', sheet.includes('For a person to read') && sheet.includes('S10: why S10'), sheet, 'the list');
const pageJs = fs.readFileSync(path.join(root, 'public/app/screens/page.js'), 'utf8');
chk('Page view: the Quality card shows the verdict and the judge failures', pageJs.includes('verdictHtml(Q, V, C)') && pageJs.includes('For a person to read') && pageJs.includes('Not publishable'), '', 'present');

console.log(`\n=== copy quality 4: ${pass} passed, ${fail} failed ===\n`);
if (fail) process.exitCode = 1;
