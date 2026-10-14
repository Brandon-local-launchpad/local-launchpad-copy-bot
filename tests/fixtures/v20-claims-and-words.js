'use strict';
// Fixture: 14 Oct second-pass changes. Confirmed practices, homeowner service words, FAQ 4 from
// start_time only, coastal travel wording, Locations Hub link, research wording,
// repeated points, and the primary city's location page left off LINKABLE PAGES.
// No API calls.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const A = require(path.join(root, 'allocation.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { validateV20, buildValidationContext } = require(path.join(root, 'validate-v20.js'));
const { practiceClaims } = require(path.join(root, 'practices.js'));
const { sayFor } = require(path.join(root, 'service-words.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: confirmed practices, service words and copy fixes ===\n');

const cv = E.ethanValues();
const keyValueMap = { ...E.keyValueMap, service_1: 'Sod installation', service_2: 'Hardscaping', service_3: 'Brick paver installation',
  service_4: 'Desert landscaping', service_5: 'Patio paving', service_6: 'Tree trimming and pruning', service_7: 'Weed control' };
const serviceParentMap = { service_1: 'Landscape Gardener', service_2: 'Landscape Gardener', service_3: 'Paving contractor',
  service_4: 'Landscape Gardener', service_5: 'Paving contractor', service_6: 'Tree service', service_7: 'Gardener' };
const pages = [...E.pages,
  { pageType: 'location', pageTitle: 'Southampton', urlSlug: '/locations/southampton', h1: 'Landscaper Southampton', status: 'live' },
  { pageType: 'locations-hub', pageTitle: 'Areas We Cover', urlSlug: '/locations', h1: 'Areas We Cover', status: 'live' }];
const parsed = parseDossier(fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'));
const reply = JSON.parse(fs.readFileSync(path.join(__dirname, 'allocation-replies/edens-edge-bassett-heath-portswood.json'), 'utf8'));
const allocationData = A.resolveAllocatedItems(reply.homepage, parsed);
const DR = computeDecisions({ cv, niche: landscaper, pages, keyValueMap, serviceParentMap, v20TestMode: true, allocationData });
const D = DR.decisions;

// ── Decisions ──
const q4 = D.d11_faq.find(q => q.slot === 'Q4');
chk('FAQ 4 brief: start_time only, no "bigger projects" without the practice',
  /exactly as \[CV: start_time\]/.test(q4.answer_brief) && /Never mention bigger projects/.test(q4.answer_brief) && !/Code adds/.test(q4.answer_brief), q4.answer_brief, 'strict');
const DRb = computeDecisions({ cv: { ...cv, confirmed_practices: ['bigger_projects_booked_ahead'] }, niche: landscaper, pages, keyValueMap, serviceParentMap, v20TestMode: true, allocationData });
chk('FAQ 4 brief: "bigger projects" allowed once confirmed', /booked further ahead \(confirmed\)/.test(DRb.decisions.d11_faq.find(q => q.slot === 'Q4').answer_brief), '', 'confirmed');
chk('Primary city location page is not linkable; the Locations Hub is',
  !D.linkablePages.some(p => p.url === '/locations/southampton') && D.locations_hub === '/locations', JSON.stringify(D.linkablePages.filter(p => /locations(\/southampton)?$/.test(p.url))), 'hub only');
chk('DECISIONS: coastal line and hub line', /Primary city coastal: yes\. Write the travel distance as "inland and along the coast"/.test(DR.decisionsBlock) && /Locations hub: \/locations/.test(DR.decisionsBlock), '', 'both');

// ── Client block ──
const req = G.buildV20Request({ cv, niche: landscaper, decisions: D, decisionsBlock: DR.decisionsBlock, calibrationPack: '', ctx: G.nicheContext(cv, landscaper, keyValueMap), keyValueMap, serviceParentMap });
chk('Services in homeowner words: turf laying, paving and walling, block paving', /turf laying/.test(req.clientBlock) && /paving and walling/.test(req.clientBlock) && /block paving/.test(req.clientBlock), '', 'homeowner words');
chk('No raw GBP names and no never-named services in the client block', !/Sod installation|Hardscaping|Brick paver|Desert landscaping|desert landscaping/i.test(req.clientBlock), (req.clientBlock.match(/Sod installation|Hardscaping|Brick paver|Desert landscaping/gi) || []).join(','), 'none');
chk('No practices confirmed: the block says so', /CONFIRMED PRACTICES[^\n]*\n\(none confirmed/.test(req.clientBlock), '', '(none confirmed …)');
const req2 = G.buildV20Request({ cv: { ...cv, confirmed_practices: ['written_quote', 'waste_removal'] }, niche: landscaper, decisions: D, decisionsBlock: DR.decisionsBlock, calibrationPack: '', ctx: G.nicheContext(cv, landscaper, keyValueMap), keyValueMap, serviceParentMap });
chk('Confirmed practices listed as claims', /- quotes are given in writing\n- all waste is taken away/.test(req2.clientBlock), '', 'two claims');
chk('sayFor: unmatched GBP names fall back to lower case; matched ones map', sayFor('Deck repair', landscaper) === 'deck repair' && sayFor('Sod installation', landscaper) === 'turf laying' && sayFor('Pool landscaping', landscaper) === null, '', 'deck repair / turf laying / null');

// ── Validator ──
const keys = new Set([...G.buildClientValues(cv, D.d1_years_trading).matchAll(/^\[CV: ([a-z0-9_]+)\]/gm)].map(m => m[1]));
const V = buildValidationContext({ cv, niche: landscaper, decisions: D, keyValueMap, serviceParentMap, populatedCvKeys: keys });
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-stage7-record.json'), 'utf8'));
const run = mutate => { const r = JSON.parse(JSON.stringify(base)); mutate(r); return validateV20(r, V); };

const p = run(r => { r.faq_items[0].faq_answer = 'Costs depend on size, ground and materials. We put the full cost in writing before anything starts, and for regular visits we set a schedule that suits you.'; });
chk('PRACTICE: "in writing" and "schedule" unconfirmed → BLOCK', p.some(i => i.check === 'PRACTICE' && /in writing/.test(i.message) && i.type === 'BLOCK') && p.some(i => i.check === 'PRACTICE' && /schedule/.test(i.message)), p.filter(i => i.check === 'PRACTICE').map(i => i.message).join(' | '), 'both');
const V2 = buildValidationContext({ cv: { ...cv, confirmed_practices: ['written_quote', 'maintenance_schedule'] }, niche: landscaper, decisions: D, keyValueMap, serviceParentMap, populatedCvKeys: keys });
const r2 = JSON.parse(JSON.stringify(base)); r2.faq_items[0].faq_answer = 'Costs depend on size, ground and materials. We put the full cost in writing before anything starts, and for regular visits we set a schedule that suits you.';
chk('PRACTICE: the same claims pass once confirmed', !validateV20(r2, V2).some(i => i.check === 'PRACTICE' && /How much/.test(i.field)), '', 'no PRACTICE');
chk('practiceClaims: "no subcontracting" and "come back to put it right" detected',
  practiceClaims('No subcontracting, no handoffs.', landscaper).some(c => c.practice.key === 'no_subcontractors') && practiceClaims("We'll come back and put it right.", landscaper).some(c => c.practice.key === 'return_visit'), '', 'both');

const g = run(r => { r.cards[1].card_text = 'Our [landscape gardener](/landscape-gardener/) work covers sod installation and hardscaping, with desert landscaping for dry corners and a level base under every path we build here.'; });
chk('RAW-GBP: "sod installation" → turf laying, "hardscaping" → paving and walling, desert landscaping never named',
  g.some(i => i.check === 'RAW-GBP' && /Say "turf laying"/.test(i.message)) && g.some(i => i.check === 'RAW-GBP' && /paving and walling/.test(i.message)) && g.some(i => i.check === 'RAW-GBP' && /never named/.test(i.message)),
  g.filter(i => i.check === 'RAW-GBP').map(i => i.message).join(' | '), 'all three');
const c = run(r => { r.cards[4].card_text = 'Our [tree service](/tree-service/) covers tree pruning, turf laying, block paving, patios and weed control for gardens across the city, planned around the season and the ground.'; });
chk('CARD-COUNT: 5 services named in one card', c.some(i => i.check === 'CARD-COUNT' && /Names 5 services/.test(i.message)), c.filter(i => i.check === 'CARD-COUNT').map(i => i.message).join(' | '), 'Names 5');

const co = run(r => { r.home_areas_intro = "We're based in Southampton and travel up to 20 miles to take on work, covering towns to the north, east and west of the city and the villages between them."; });
chk('COAST: compass directions for a coastal city', co.some(i => i.check === 'COAST' && i.field === 'home_areas_intro'), '', 'FLAG');
const co2 = run(r => { r.home_areas_intro = "We're based in Southampton and travel up to 20 miles, inland and along the coast, for single projects and regular garden care across the towns and villages around the city."; });
chk('COAST: "inland and along the coast" passes', !co2.some(i => i.check === 'COAST' && i.field === 'home_areas_intro'), co2.filter(i => i.check === 'COAST').map(i => i.message).join(';'), 'no COAST');

const hub = run(r => { r.faq_items[5].faq_answer = 'We cover Southampton and the towns around it, including [Romsey](/locations/romsey/) and [Winchester](/locations/winchester/). See the [list of areas we cover](/locations/southampton/).'; });
chk('HUB-LINK: areas FAQ without the hub; the Southampton location link is N2', hub.some(i => i.check === 'HUB-LINK') && hub.some(i => i.check === 'N2' && /locations\/southampton/.test(i.message)), hub.filter(i => /HUB|N2/.test(i.check)).map(i => i.check + ' ' + i.message).join(' | '), 'HUB-LINK + N2');

const rl = run(r => { r.faq_items[7].faq_answer = 'Usually one of three causes. Southampton soils vary, and some investigated sites show seasonally waterlogged ground, so we look at the levels, the surface and where the water can go.'; });
chk('RESEARCH-LANG: "investigated sites"', rl.some(i => i.check === 'RESEARCH-LANG' && /investigated sites/.test(i.message)), '', 'FLAG');

const rp = run(r => { r.home_content_block_body = 'Gardens in Southampton vary. Portswood has compact back gardens and long plots with mature trees.\n\nBassett Heath has large plots with mature trees. Portswood also has a conservation area with controls on front garden paving.\n\nOur [gardener](/gardener/) work keeps gardens tidy.'; });
chk('REPEAT-IN: Portswood in two paragraphs, and a repeated phrase', rp.some(i => i.check === 'REPEAT-IN' && /Portswood comes up in 2/.test(i.message)) && rp.some(i => i.check === 'REPEAT-IN' && /plots with mature trees/.test(i.message)), rp.filter(i => i.check === 'REPEAT-IN').map(i => i.message).join(' | '), 'both');

const ins = run(r => { r.points[1].point_body = 'The figure on your quote is what you pay. Public liability insurance covers accidental damage to your property while work is underway.'; });
chk('INSURANCE: insurance mentioned with no cover on file', ins.some(i => i.check === 'INSURANCE' && i.type === 'BLOCK'), '', 'BLOCK');
const cl = run(r => { r.cards[1].card_text = 'Garden makeovers, new lawns and retaining walls are what our [landscape gardener](/landscape-gardener/) work covers. On Bassett Heath\'s larger plots, getting the levels right shapes everything.'; });
chk('CARD-LOCAL: Bassett Heath in a card', cl.some(i => i.check === 'CARD-LOCAL' && /Bassett/.test(i.message)), '', 'FLAG');
const lt = run(r => { r.home_content_block_body = r.home_content_block_body.replace('[gardener](/gardener/)', '[gardening and maintenance](/gardener/)'); });
chk('LINK-TEXT: "gardening and maintenance" for the Gardener page', lt.some(i => i.check === 'LINK-TEXT' && /gardening and maintenance/.test(i.message)), lt.filter(i => i.check === 'LINK-TEXT').map(i => i.message).join(' | '), 'FLAG');
chk('LINK-TEXT: "[landscape gardener](…) work" passes', !validateV20(base, V).some(i => i.check === 'LINK-TEXT' && /landscape gardener\b/.test(i.message) && /reads "landscape gardener"/.test(i.message)), '', 'no flag');
const cc = run(r => { r.cards[5].card_text = 'Patios and driveways that settle start underneath. Our [paving contractor](/paving-contractor/) work covers block paving and new driveways, each on a properly prepared base so the surface stays level for years.'; });
chk('CARD-COUNT: "driveways" inside "new driveways" counts once', !cc.some(i => i.check === 'CARD-COUNT' && i.field.includes('Paving')), cc.filter(i => i.check === 'CARD-COUNT').map(i => i.message).join(' | '), 'no flag');

const bst = run(r => { r.faq_items[2].faq_answer = "Every trade works to a standard of reasonable care and skill. If something isn't right, tell us early: that gives the best chance of a quick answer, rather than leading to a bigger problem."; });
chk('N5: "the best chance" and "leading to" are not claims', !bst.some(i => i.check === 'N5' && /isn.t right/.test(i.field)), bst.filter(i => i.check === 'N5').map(i => i.message).join(' | '), 'no N5');
const bst2 = run(r => { r.faq_items[2].faq_answer = "We're the best landscaper in the city and the leading name for gardens. If something isn't right, tell us early so we can look at it together."; });
chk('N5: "the best landscaper" and "the leading name" still are', bst2.filter(i => i.check === 'N5' && /isn.t right/.test(i.field)).length === 2, '', '2 x N5');
const { buildRetryMessage } = require(path.join(root, 'v20-retry.js'));
const rm = buildRetryMessage({ label: 'home_areas_intro', ref: { key: 'home_areas_intro' }, text: 'x', rangeKey: 'home_areas_intro' }, ['dash'], base, D, ['dash', 'doubles the miles']);
chk('Retry message carries earlier problems so they are not brought back', /ALREADY FIXED IN AN EARLIER VERSION[^]*doubles the miles/.test(rm) && !/ALREADY FIXED[^]*- dash/.test(rm), rm.slice(rm.indexOf('PROBLEMS'), rm.indexOf('OTHER')), 'earlier only');

const co3 = run(r => { r.home_areas_intro = 'We take on garden work across Southampton and up to [CV: travel_distance] inland and along the coast, from Romsey in the north to Lyndhurst and the New Forest to the south and west.'; });
chk('COAST: compass directions after the travel_distance token', co3.some(i => i.check === 'COAST' && i.field === 'home_areas_intro'), '', 'FLAG');

// Wording that got through the Stage 9 acceptance run (14 Oct)
const acc = run(r => {
  r.home_content_block_body = r.home_content_block_body.replace(/^[^\n]+/, 'Two neighbourhoods that keep us busy are Bassett Heath and Old Woolston, each with long plots and mature trees.');
  r.points[0].point_body = 'Being family run means one person sees the job through from quote to completion, so you always know who to call.';
  r.faq_items[3].faq_answer = "We can usually start within the same week. That applies whether it's a single day's work or the start of something larger.";
  r.faq_items[6].faq_answer = 'It depends on the scale and the ground. Preparation can add time on more slowly permeable plots, and weather can move hard landscaping days.';
});
chk('WORKED: "neighbourhoods that keep us busy are Bassett Heath…"', acc.some(i => i.check === 'WORKED' && /Bassett Heath/.test(i.message)), '', 'BLOCK');
chk('PRACTICE: "one person sees the job through"', acc.some(i => i.check === 'PRACTICE' && /sees/.test(i.message)), acc.filter(i => i.check === 'PRACTICE').map(i => i.message).join(' | '), 'BLOCK');
chk("NUM: \"a single day's work\"", acc.some(i => i.check === 'NUM' && /single day/.test(i.message)), acc.filter(i => i.check === 'NUM').map(i => i.message).join(' | '), 'BLOCK');
chk('RESEARCH-LANG: "slowly permeable"', acc.some(i => i.check === 'RESEARCH-LANG' && /permeable/.test(i.message)), '', 'FLAG');

const baseIssues = validateV20(base, V);
chk('The last real run had unconfirmed practices and a compass-direction travel line (caught now)',
  baseIssues.some(i => i.check === 'PRACTICE') && baseIssues.some(i => i.check === 'COAST'), baseIssues.filter(i => /PRACTICE|COAST/.test(i.check)).map(i => i.message).join(' | '), 'both');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
