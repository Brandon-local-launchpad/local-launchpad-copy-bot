'use strict';
// Fixture: allocation pass on the real Southampton dossier (Edens Edge test client).
// Parses the dossier as saved by the app, checks eligibility and cleaning on real
// text, then feeds a canned allocation through to the decisions engine.
// No API calls.
const path = require('path');
const fs = require('fs');
const { parseDossier, cleanForCopy } = require(path.join(__dirname, '../../geo-dossier.js'));
const A = require(path.join(__dirname, '../../allocation.js'));
const { computeDecisions } = require(path.join(__dirname, '../../decisions.js'));
const landscaper = require(path.join(__dirname, '../../niche-library/landscaper.json'));

const dossierText = fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8');
const parsed = parseDossier(dossierText);

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};

console.log('\n=== FIXTURE: Southampton dossier allocation (Edens Edge) ===\n');

// ── Parser on the real dossier ──
chk('Parses 20 neighbourhoods, 7 issues, 35 symptoms, 9 rules with no warnings',
  parsed.neighbourhoods.length === 20 && parsed.issues.length === 7 && parsed.symptoms.length === 35 && parsed.rules.length === 9 && !parsed.warnings.length,
  `${parsed.neighbourhoods.length}/${parsed.issues.length}/${parsed.symptoms.length}/${parsed.rules.length} ${parsed.warnings.join('; ')}`, '20/7/35/9, no warnings');
chk('Every symptom has its words and a linked issue',
  parsed.symptoms.every(s => s.text && s.issueId), parsed.symptoms.filter(s => !s.text || !s.issueId).map(s => s.id).join(','), 'none missing');
chk('Every issue has category tags', parsed.issues.every(i => i.categoryTags.length), parsed.issues.filter(i => !i.categoryTags.length).map(i => i.id).join(','), 'all tagged');

// ── Eligibility for Edens Edge ──
const cv = {
  company_name: 'Edens Edge Landscaping', company_name_gbp_checked: true, phone: '023 0000 0000',
  hours: 'Monday to Saturday, 7am to 6pm', primary_category: 'Landscaper', year_founded: '', jobs_completed: '100',
  rating: '', review_count: '', guarantee_years: '', manufacturer_warranty: '', insurance_cover: '5m',
  differentiator_1: 'Fixed Prices With No Hidden Costs', differentiator_1_confirmed: true,
  differentiator_1_sentence: 'Fixed prices with no hidden costs',
  differentiator_2: 'Family Run and Independent', differentiator_2_confirmed: true,
  verified_logos: [], free_quotes: 'yes', quote_method: '', start_time: 'same week',
  owner_name: 'Test Owner', owner_qualification: 'test qualification', owner_why: 'test owner why',
  owner_promise: 'test owner promise', owner_photo: 'yes', business_type: 'A', team_size: '4',
  area_wide: '', travel_distance: '20 miles', review_themes: [], jobs_wanted: [], map_embed: '',
  h1_override: 'Landscaper Southampton',
};
const categoryNames = ['Landscape Gardener', 'Landscape Designer', 'Gardener', 'Lawn care service', 'Tree service', 'Paving contractor', 'Deck builder'];
const pages = [
  { pageType: 'homepage', pageTitle: 'Edens Edge Landscaping', urlSlug: '/', h1: 'Landscaper Southampton', status: 'live' },
  ...categoryNames.map(n => ({ pageType: 'category', pageTitle: n, urlSlug: '/' + n.toLowerCase().replace(/ /g, '-'), h1: `${n} Southampton`, status: 'live' })),
  { pageType: 'location', pageTitle: 'Romsey', urlSlug: '/locations/romsey', h1: 'Landscaper Romsey', status: 'live' },
  { pageType: 'location', pageTitle: 'Eastleigh', urlSlug: '/locations/eastleigh', h1: 'Landscaper Eastleigh', status: 'live' },
];
const keyValueMap = { biz_area_1: 'Southampton', biz_area_2: 'Romsey', biz_area_3: 'Eastleigh', category_1: 'Landscaper' };

const categories = A.clientCategories(cv, keyValueMap, pages);
const eligible = A.eligibleItems(parsed, { emergencyNiche: false, categories });
chk('All 20 neighbourhoods have sourced detail', eligible.neighbourhoods.length === 20, eligible.neighbourhoods.length, 20);
const urgentIds = parsed.symptoms.filter(s => s.urgent).map(s => s.id);
chk('Only the 11 urgent symptoms are excluded (landscaper is not an emergency niche)',
  eligible.symptoms.length === 24 && eligible.excluded.length === 11 && eligible.excluded.every(e => urgentIds.some(id => e.startsWith(id))),
  `${eligible.symptoms.length} eligible, excluded: ${eligible.excluded.join(' | ')}`, '24 eligible, 11 urgent excluded');

// ── Conservation detection: only rules named as a conservation area / Article 4 ──
const named = A.conservationFromRules(parsed, parsed.neighbourhoods.map(n => n.id)).sort();
chk('Code marks exactly the 4 neighbourhoods with their own conservation area rule',
  named.join(',') === 'SOU-N10,SOU-N11,SOU-N12,SOU-N13', named.join(','), 'SOU-N10,SOU-N11,SOU-N12,SOU-N13');
chk('Bassett Neighbourhood Plan (mentions a conservation area in passing) does not mark Bassett Heath',
  !named.includes('SOU-N07'), named.join(','), 'no SOU-N07');

// ── Cleaning over every profile and issue ──
const names = Object.fromEntries(parsed.neighbourhoods.map(n => [n.id, n.name]));
const cleaned = [...parsed.neighbourhoods.map(n => n.profile), ...parsed.issues.map(i => i.body)].map(t => cleanForCopy(t, names)).join('\n');
chk('Cleaned text: no URLs, IDs, bold markdown or empty brackets',
  !/https?:/.test(cleaned) && !/[A-Z]{3}-[NISR]\d\d/.test(cleaned) && !/\*\*/.test(cleaned) && !/\(\s*\)|\[\s*\]/.test(cleaned),
  (cleaned.match(/https?:\S+|[A-Z]{3}-[NISR]\d\d|\*\*|\(\s*\)|\[\s*\]/g) || []).slice(0, 5).join(' '), 'none');
chk('Cleaned text: no "Bassett Heath Bassett Heath" doubling from inline [ID] tags',
  !/Bassett Heath Bassett Heath/.test(cleaned) && /Thus Bassett Heath and Hollybrook/.test(cleaned), 'see text', 'Thus Bassett Heath and Hollybrook ...');
chk('Cleaned text keeps (inferred) markers', /\(inferred\)/.test(cleaned), 'no (inferred)', 'contains (inferred)');

// ── Canned allocation through to the decisions engine ──
(async () => {
  const reply = JSON.stringify({ homepage: {
    neighbourhoods: ['SOU-N07', 'SOU-N14'], symptoms: { faq_B: 'SOU-S01' }, conservation_areas: ['SOU-N14'],
    reasons: 'SOU-N07: large plots\nSOU-N14: Victorian villas, slopes\nSOU-S01: soggy lawn fits faq_B' } });
  const run = await A.runAllocation({ dossierText, cv, niche: landscaper, keyValueMap, pages, callModel: async () => reply });
  chk('Run: Bassett Heath + Old Woolston, faq_B = SOU-S01, one attempt, no flags',
    run.neighbourhoods.join(',') === 'SOU-N07,SOU-N14' && run.symptoms.faq_B === 'SOU-S01' && run.attempts.length === 1 && !run.flags.length,
    `${run.neighbourhoods.join(',')} ${JSON.stringify(run.symptoms)} attempts=${run.attempts.length} ${run.flags.map(f => f.msg).join('; ')}`, 'SOU-N07,SOU-N14 faq_B=SOU-S01');
  chk('Model-judged conservation area (Old Woolston, from its profile) is kept',
    run.conservation_areas.includes('SOU-N14'), run.conservation_areas.join(','), 'includes SOU-N14');

  const items = A.resolveAllocatedItems(run, parsed);
  const result = computeDecisions({ cv, niche: landscaper, pages, keyValueMap, serviceParentMap: {}, v20TestMode: true, allocationData: items });
  chk('No gates', !result.gates.length, result.gates.map(g => g.code).join(','), 'none');
  chk('No F-ALLOC', !result.flags.some(f => f.code === 'F-ALLOC'), result.flags.filter(f => f.code === 'F-ALLOC').map(f => f.msg).join('; '), 'none');
  const blk = result.decisionsBlock;
  const ai = blk.slice(blk.indexOf('ALLOCATED ITEMS:'), blk.indexOf('MODEL FIELDS:'));
  chk('ALLOCATED ITEMS: Bassett Heath, Old Woolston (conservation area), Q8 symptom with its issue',
    ai.includes('Neighbourhood: Bassett Heath\n') && ai.includes('Neighbourhood: Old Woolston (conservation area)') &&
    ai.includes('Symptom for Q8') && ai.includes('The lawn stays soggy for days after rain.') && ai.includes('Linked issue: Mixed geology'),
    ai.slice(0, 400), 'both neighbourhoods and the Q8 symptom');
  chk('ALLOCATED ITEMS carries no URLs or reference IDs', !/https?:|SOU-[NISR]\d\d/.test(ai), (ai.match(/https?:\S+|SOU-[NISR]\d\d/g) || []).join(' '), 'none');

  // ── Real model replies (Allocation_Pass_CORE (2)), replayed ──
  // Three live runs on 14 Oct picked Bassett Heath every time, with Portswood
  // Residents' Gardens (2 runs) or Old Woolston (1 run). Both are accepted results.
  const repliesDir = path.join(__dirname, 'allocation-replies');
  for (const file of fs.readdirSync(repliesDir).filter(f => f.startsWith('edens-edge-')).sort()) {
    const recorded = JSON.parse(fs.readFileSync(path.join(repliesDir, file), 'utf8'));
    const real = await A.runAllocation({ dossierText, cv, niche: landscaper, keyValueMap, pages, callModel: async () => JSON.stringify(recorded) });
    const second = real.neighbourhoods[1];
    chk(`${file}: passes code checks first time, no flags`, real.attempts.length === 1 && !real.attempts[0].errors.length && !real.flags.length,
      JSON.stringify(real.attempts) + ' ' + real.flags.map(f => f.msg).join('; '), '1 attempt, no errors or flags');
    chk(`${file}: Bassett Heath plus Portswood Residents' Gardens or Old Woolston`,
      real.neighbourhoods[0] === 'SOU-N07' && ['SOU-N11', 'SOU-N14'].includes(second), real.neighbourhoods.join(','), 'SOU-N07 + SOU-N11|SOU-N14');
    chk(`${file}: faq_B = "The lawn stays soggy for days after rain."`, real.symptoms.faq_B === 'SOU-S01', JSON.stringify(real.symptoms), 'faq_B=SOU-S01');
    chk(`${file}: second pick marked as a conservation area`, real.conservation_areas.includes(second), real.conservation_areas.join(','), second);
    const realItems = A.resolveAllocatedItems(real, parsed);
    chk(`${file}: resolved text has no URLs or IDs`, !/https?:|SOU-[NISR]\d\d/.test(JSON.stringify(realItems)), 'see items', 'none');
  }
  // Portswood's conservation status comes from its own rule, even if a reply leaves it out
  const noCons = await A.runAllocation({ dossierText, cv, niche: landscaper, keyValueMap, pages,
    callModel: async () => JSON.stringify({ homepage: { neighbourhoods: ['SOU-N07', 'SOU-N11'], symptoms: { faq_B: 'SOU-S01' }, conservation_areas: [], reasons: '' } }) });
  chk('Code marks Portswood Residents\' Gardens from its conservation area rule', noCons.conservation_areas.join(',') === 'SOU-N11',
    noCons.conservation_areas.join(','), 'SOU-N11');

  console.log('\n' + ai);
  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
