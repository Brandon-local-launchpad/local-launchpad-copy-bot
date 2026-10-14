'use strict';
// Fixture: allocation pass logic (Stage 5) on a synthetic dossier built to test
// parser drift (unbracketed IDs, table rows, unsourced profiles) and the retry path.
// The real-dossier test is southampton-allocation.js.
// No API calls: the model is replaced by canned replies.
const path = require('path');
const fs = require('fs');
const { parseDossier } = require(path.join(__dirname, '../../geo-dossier.js'));
const A = require(path.join(__dirname, '../../allocation.js'));
const { computeDecisions } = require(path.join(__dirname, '../../decisions.js'));
const landscaper = require(path.join(__dirname, '../../niche-library/landscaper.json'));

const dossierText = fs.readFileSync(path.join(__dirname, 'dossiers/parser-drift-sample.md'), 'utf8');
const parsed = parseDossier(dossierText);

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};

console.log('\n=== FIXTURE: Allocation logic (synthetic drift dossier) ===\n');

// ── Parser ──
chk('Parser: 5 neighbourhoods, 3 issues, 5 symptoms, 2 rules, no warnings',
  parsed.neighbourhoods.length === 5 && parsed.issues.length === 3 && parsed.symptoms.length === 5 && parsed.rules.length === 2 && !parsed.warnings.length,
  `${parsed.neighbourhoods.length}/${parsed.issues.length}/${parsed.symptoms.length}/${parsed.rules.length} warnings=${parsed.warnings.join('; ')}`, '5/3/5/2, none');
chk('Parser: unbracketed "TST-N02 | Old Riverside" heading read',
  parsed.neighbourhoods[1].id === 'TST-N02' && parsed.neighbourhoods[1].name === 'Old Riverside', JSON.stringify(parsed.neighbourhoods[1].name), 'Old Riverside');
chk('Parser: table-row symptom TST-S03 read with its issue',
  parsed.symptoms.find(s => s.id === 'TST-S03').issueId === 'TST-I02', parsed.symptoms.find(s => s.id === 'TST-S03').issueId, 'TST-I02');
chk('Parser: urgent flag read', parsed.symptoms.find(s => s.id === 'TST-S04').urgent === true, 'false', 'true');

// ── Eligibility ──
const cv = {
  company_name: 'Test Landscapes', company_name_gbp_checked: true, phone: '023 0000 0000',
  primary_category: 'Landscaper', jobs_completed: '100', insurance_cover: '5m',
  differentiator_1: 'Fixed Prices With No Hidden Costs', differentiator_1_confirmed: true,
  differentiator_1_sentence: 'Fixed prices with no hidden costs',
  verified_logos: [], free_quotes: 'yes', start_time: 'same week', handles_planning: 'yes',
  owner_photo: 'no', business_type: 'A', jobs_wanted: ['patios'], review_themes: [],
};
const keyValueMap = { biz_area_1: 'Testville', biz_area_2: 'Sandport', category_1: 'Landscaper', category_2: 'Landscape Gardener', category_3: 'Paving contractor', category_4: 'Tree service' };
const pages = [
  { pageType: 'homepage', pageTitle: 'Test Landscapes', urlSlug: '/', h1: 'Landscaper Testville', status: 'live' },
  { pageType: 'category', pageTitle: 'Landscape Gardener', urlSlug: '/landscape-gardener', h1: 'Landscape Gardener Testville', status: 'live' },
  { pageType: 'category', pageTitle: 'Paving contractor',  urlSlug: '/paving-contractor',  h1: 'Paving Contractor Testville',  status: 'live' },
  { pageType: 'category', pageTitle: 'Tree service',       urlSlug: '/tree-service',       h1: 'Tree Service Testville',      status: 'live' },
  { pageType: 'location', pageTitle: 'Sandport',           urlSlug: '/locations/sandport', h1: 'Landscaper Sandport',         status: 'live' },
];
const categories = A.clientCategories(cv, keyValueMap, pages);
const eligible = A.eligibleItems(parsed, { emergencyNiche: false, categories });
chk('Eligible neighbourhoods drop the unsourced profile (TST-N04)',
  eligible.neighbourhoods.map(n => n.id).join(',') === 'TST-N01,TST-N02,TST-N03,TST-N05', eligible.neighbourhoods.map(n => n.id).join(','), 'TST-N01,TST-N02,TST-N03,TST-N05');
chk('Eligible symptoms drop urgent (S04, not an emergency niche) and untagged-for-client (S05)',
  eligible.symptoms.map(s => s.id).join(',') === 'TST-S01,TST-S02,TST-S03', eligible.symptoms.map(s => s.id).join(','), 'TST-S01,TST-S02,TST-S03');
const eligibleRoofer = A.eligibleItems(parsed, { emergencyNiche: true, categories: new Set(['roofing contractor', 'landscape gardener']) });
chk('Emergency niche keeps urgent symptoms', eligibleRoofer.symptoms.some(s => s.id === 'TST-S04'), eligibleRoofer.symptoms.map(s => s.id).join(','), 'includes TST-S04');

const slots = A.symptomSlots(landscaper);
const message = A.buildAllocationMessage({ parsed, eligible, cv, niche: landscaper, city: 'Testville', categories, slots });
chk('Message lists only eligible items', !/^  TST-N04 \|/m.test(message) && !/^  TST-S04 \|/m.test(message) && message.includes('faq_B:'),
  'see message', 'no N04, no S04, has faq_B slot');
chk('Allocation prompt loads without its header note', !A.loadAllocationPrompt().startsWith('# Allocation Pass'), A.loadAllocationPrompt().slice(0, 40), 'starts after ---');

// ── Code checks on a bad reply ──
const bad = { homepage: { neighbourhoods: ['TST-N04', 'TST-N01', 'TST-N01'], symptoms: { faq_B: 'TST-S04', faq_Z: 'TST-S01' }, conservation_areas: ['TST-N02'], reasons: '' } };
const checked = A.checkPicks(bad, { eligible, slots });
chk('Bad reply: keeps only TST-N01; rejects N04, the duplicate, S04, faq_Z; drops unpicked conservation',
  checked.picks.neighbourhoods.join(',') === 'TST-N01' && !checked.picks.symptoms.faq_B && checked.errors.length === 5 && !checked.picks.conservation_areas.length,
  `${checked.picks.neighbourhoods.join(',')} | ${checked.errors.join(' / ')}`, 'TST-N01 | 5 errors');

// ── Retry: first reply bad, second good ──
(async () => {
  const sent = [];
  const replies = [JSON.stringify(bad), '```json\n' + JSON.stringify({ homepage: {
    neighbourhoods: ['TST-N01', 'TST-N02'], symptoms: { faq_B: 'TST-S01' }, conservation_areas: [],
    reasons: 'TST-N01: large sloping plots\nTST-N02: clay terrace villas\nTST-S01: water on patio fits faq_B' } }) + '\n```'];
  const run = await A.runAllocation({ dossierText, cv, niche: landscaper, keyValueMap, pages,
    callModel: async (system, msg) => { sent.push(msg); return replies.shift(); } });
  chk('Retry: 2 attempts, second sent the problems back', run.attempts.length === 2 && sent[1].includes('YOUR LAST REPLY HAD THESE PROBLEMS'),
    run.attempts.length, 2);
  chk('Retry result: TST-N01 + TST-N02, faq_B = TST-S01, no flags',
    run.neighbourhoods.join(',') === 'TST-N01,TST-N02' && run.symptoms.faq_B === 'TST-S01' && !run.flags.length,
    `${run.neighbourhoods.join(',')} ${JSON.stringify(run.symptoms)} flags=${run.flags.map(f => f.msg).join('; ')}`, 'TST-N01,TST-N02 faq_B=TST-S01, none');
  chk('Conservation area added by code from RULES & COUNCIL (model missed it)',
    run.conservation_areas.join(',') === 'TST-N02', run.conservation_areas.join(','), 'TST-N02');

  // ── Both replies bad: keep the valid picks, flag ──
  const run2 = await A.runAllocation({ dossierText, cv, niche: landscaper, keyValueMap, pages,
    callModel: async () => JSON.stringify(bad) });
  chk('Two bad replies: keeps TST-N01, raises F-ALLOC', run2.neighbourhoods.join(',') === 'TST-N01' && run2.flags.some(f => f.code === 'F-ALLOC'),
    `${run2.neighbourhoods.join(',')} ${run2.flags.map(f => f.code).join(',')}`, 'TST-N01 F-ALLOC');
  const run3 = await A.runAllocation({ dossierText, cv, niche: landscaper, keyValueMap, pages,
    callModel: async () => 'Sorry, I cannot help with that.' });
  chk('Unreadable reply: no picks, F-ALLOC', !run3.neighbourhoods.length && run3.flags.some(f => f.code === 'F-ALLOC'), run3.neighbourhoods.join(','), '(none)');

  // ── Resolve to ALLOCATED ITEMS ──
  const items = A.resolveAllocatedItems(run, parsed);
  const allText = JSON.stringify(items);
  chk('Resolved items carry no URLs or reference IDs', !/https?:\/\//.test(allText) && !/TST-[NISR]\d/.test(allText),
    allText.match(/https?:\/\/\S+|TST-[NISR]\d+/g), 'none');
  chk('Resolved issue text swaps neighbourhood IDs for names',
    items.symptoms.faq_B.issueText.includes('Northfield Heath and Old Riverside'), items.symptoms.faq_B.issueText.slice(0, 160), 'mentions Northfield Heath and Old Riverside');
  chk('Resolved profile keeps (inferred) and (dated:) markers',
    items.neighbourhoods[0].profile.includes('(inferred)'), items.neighbourhoods[0].profile, 'contains (inferred)');
  chk('Old Riverside marked conservation, "(see )" removed',
    items.neighbourhoods[1].conservation === true && !items.neighbourhoods[1].profile.includes('(see'), items.neighbourhoods[1].profile, 'conservation, no "(see"');

  // ── Decisions engine with the allocation ──
  const result = computeDecisions({ cv, niche: landscaper, pages, keyValueMap, serviceParentMap: {}, v20TestMode: true, allocationData: items });
  const D = result.decisions;
  chk('Decisions run without gates', !result.gates.length, result.gates.map(g => g.code).join(','), 'none');
  chk('No F-ALLOC when 2 neighbourhoods and the symptom slot are filled', !result.flags.some(f => f.code === 'F-ALLOC'),
    result.flags.filter(f => f.code === 'F-ALLOC').map(f => f.msg).join('; '), 'none');
  const blk = result.decisionsBlock;
  const ai = blk.slice(blk.indexOf('ALLOCATED ITEMS:'), blk.indexOf('MODEL FIELDS:'));
  chk('ALLOCATED ITEMS lists both neighbourhoods and the Q8 symptom with its issue',
    ai.includes('Neighbourhood: Northfield Heath') && ai.includes('Neighbourhood: Old Riverside (conservation area)') &&
    ai.includes('Symptom for Q8') && ai.includes('Linked issue: Slow draining clay ground'), ai, 'both neighbourhoods + Q8 symptom');
  const q9 = D.d11_faq.find(q => q.slot === 'Q9');
  chk('Planning FAQ told to name the conservation area', q9 && /conservation area to name: Old Riverside/.test(q9.answer_brief),
    q9 && q9.answer_brief, '... Allocated conservation area to name: Old Riverside.');

  const one = { neighbourhoods: [items.neighbourhoods[0]], symptoms: {} };
  const r2 = computeDecisions({ cv, niche: landscaper, pages, keyValueMap, serviceParentMap: {}, v20TestMode: true, allocationData: one });
  const allocMsgs = r2.flags.filter(f => f.code === 'F-ALLOC').map(f => f.msg).join(' | ');
  chk('F-ALLOC for 1 neighbourhood and a missing faq_B symptom', /Only 1 allocated/.test(allocMsgs) && /faq_B/.test(allocMsgs), allocMsgs, 'both reasons');

  // ── Page map Assigned columns win ──
  const { allocation: assigned, flags: aFlags } = A.applyAssigned(run,
    { assignedNeighbourhoods: ['TST-N05', 'TST-N99'], assignedSymptoms: { faq_B: 'TST-S02' } }, parsed);
  chk('Assigned columns override and flag the unknown ID',
    assigned.neighbourhoods.join(',') === 'TST-N05' && assigned.symptoms.faq_B === 'TST-S02' && assigned.source === 'page_map' && aFlags.some(f => /TST-N99/.test(f.msg)),
    `${assigned.neighbourhoods.join(',')} ${assigned.symptoms.faq_B} ${aFlags.map(f => f.msg).join('; ')}`, 'TST-N05, TST-S02, flag TST-N99');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
