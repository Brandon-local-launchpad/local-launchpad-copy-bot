'use strict';
// Fixture: fillout/attention.js, the "Needs attention" list on the client record.
// Pure function, fed records shaped like GET /api/clients/:id/record. Items carry a
// group: "blocks" (stops the build) or "chase" (worth chasing); optional blanks never appear.
const path = require('path');
const root = path.join(__dirname, '../..');
const { needsAttention } = require(path.join(root, 'fillout/attention.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: needs attention (fillout/attention.js) ===\n');

const panels = [{ key: 'business_information', label: 'Business Information' }, { key: 'prices', label: 'Prices' }, { key: 'services', label: 'Services' }, { key: 'about_business', label: 'About Business' }];
const field = (key, o = {}) => ({ key, label: o.label || key, panel: o.panel || 'business_information', status: o.status || 'filled', tier: o.tier || 'needed', optional: o.tier === 'optional', applicable: o.applicable !== false, group: o.group || null, value: o.value === undefined ? (o.status === 'blank' ? null : 'x') : o.value, audio: o.audio || null });
const rec = (fields, extra = {}) => ({ niche: 'Plumbing & Heating', nicheKnown: true, panels, sections: [{ name: 's', fields }], submissions: [{ submissionId: 's1', status: 'processed' }], prices: { state: { status: 'done' }, rows: [{ service: 'Boiler repair', typical_gbp: 300, matched_to: null }], flags: [] }, ...extra });
const codes = items => items.map(i => i.code).join(',');
const groups = items => items.map(i => i.group).join(',');

// Empty: ready to build
const ready = needsAttention(rec([field('business_name'), field('town_1', { tier: 'optional', status: 'blank' })]));
chk('All needed and chase filled, only optional blanks, prices present → empty list (Ready to build)', ready.length === 0, codes(ready), '');

// Blank needed and chase fields
const blank = needsAttention(rec([field('business_name'), field('business_phone', { status: 'blank' }), field('team_size', { status: 'blank', tier: 'chase', panel: 'about_business' }), field('jobs_completed', { status: 'blank', tier: 'chase', panel: 'about_business' })]));
chk('Blank needed → "blocks" item per panel; blank chase → "chase" item per panel, with the fields listed', codes(blank) === 'blank_needed,blank_chase' && groups(blank) === 'blocks,chase' && blank[0].panel === 'business_information' && blank[0].fields.map(f => f.key).join() === 'business_phone' && blank[1].fields.length === 2 && /2 answers worth chasing in About Business/.test(blank[1].msg) && /1 needed answer missing in Business Information/.test(blank[0].msg), JSON.stringify(blank), '');
const na = needsAttention(rec([field('quote_call_out_fee', { status: 'blank', applicable: false }), field('town_1', { status: 'blank', tier: 'optional' }), field('instagram', { status: 'blank', tier: 'optional' })]));
chk('Not-applicable and optional blanks are never listed', na.length === 0, codes(na), '');
const pair = needsAttention(rec([field('story_trade_voice', { status: 'blank', tier: 'chase', group: 'story_trade', label: 'Your story: the trade (voice)', panel: 'about_business' }), field('story_trade_text', { status: 'blank', tier: 'chase', group: 'story_trade', label: 'Your story: the trade (typed)', panel: 'about_business' })]));
chk('A blank voice+typed pair is one chase item, labelled without the (voice) suffix', pair.length === 1 && pair[0].group === 'chase' && pair[0].fields.length === 1 && pair[0].fields[0].label === 'Your story: the trade', JSON.stringify(pair), '');
const pairHalf = needsAttention(rec([field('story_trade_voice', { status: 'blank', tier: 'chase', group: 'story_trade', panel: 'about_business' }), field('story_trade_text', { status: 'filled', tier: 'chase', group: 'story_trade', panel: 'about_business' })]));
chk('A pair with the typed half filled is not missing', pairHalf.length === 0, codes(pairHalf), '');
const ticks = needsAttention(rec([field('cat_plumber', { status: 'blank', group: 'services', panel: 'services' }), field('cat_gas_engineer', { status: 'blank', group: 'services', panel: 'services' })]));
chk('No service ticked at all → one blocks item "Service ticks" on Services', ticks.length === 1 && ticks[0].code === 'blank_needed' && ticks[0].panel === 'services' && ticks[0].fields[0].label === 'Service ticks', JSON.stringify(ticks), '');
const mixedUnit = needsAttention(rec([field('a_voice', { status: 'blank', tier: 'chase', group: 'g' }), field('a_text', { status: 'blank', tier: 'needed', group: 'g' })]));
chk('A unit takes the strongest tier of its fields', mixedUnit.length === 1 && mixedUnit[0].group === 'blocks', JSON.stringify(mixedUnit), 'blocks');

// Prices
const none = needsAttention(rec([field('most_wanted_job_1', { value: 'A' }), field('most_wanted_job_2', { value: 'B' }), field('most_wanted_job_3', { value: 'C' })], { prices: { state: { status: 'done' }, rows: [], flags: [] } }));
chk('Zero rows → ONE "No prices given" (blocks), not three most-wanted warnings', codes(none) === 'no_prices' && none[0].group === 'blocks' && none[0].panel === 'prices', codes(none), 'no_prices');
const partial = needsAttention(rec([field('most_wanted_job_1', { value: 'Boiler repairs' }), field('most_wanted_job_2', { value: 'Water softener repairs' }), field('most_wanted_job_3', { value: 'Stopcock replacement' })],
  { prices: { state: { status: 'done' }, rows: [{ service: 'Boiler repair', typical_gbp: 300, matched_to: { key: 'most_wanted_job_1', value: 'Boiler repairs' } }], flags: [] } }));
chk('Some rows → one chase item per most-wanted job without a price, pointing at the field', codes(partial) === 'most_wanted_no_price,most_wanted_no_price' && groups(partial) === 'chase,chase' && partial.map(i => i.field).join() === 'most_wanted_job_2,most_wanted_job_3' && /Water softener repairs/.test(partial[0].msg), JSON.stringify(partial), '');
const failed = needsAttention(rec([field('business_name')], { prices: { state: { status: 'extraction_failed', error: 'Reply too long or unreadable. Retry, or split the recording.' }, rows: [], flags: [] } }));
chk('extraction_failed → one blocks item with the reason and a retry action, no "no prices" item', codes(failed) === 'extraction_failed' && failed[0].group === 'blocks' && failed[0].action === 'retry' && /Reply too long/.test(failed[0].msg), JSON.stringify(failed), '');
const flagged = needsAttention(rec([field('business_name')], { prices: { state: { status: 'done' }, rows: [{ service: 'A', typical_gbp: 1, inferred: true }, { service: 'B', typical_gbp: 2, unverified: true }, { service: 'C', typical_gbp: 3 }], flags: [] } }));
chk('Inferred and unverified rows → one chase item each, unverified first', codes(flagged) === 'unverified_prices,inferred_prices' && groups(flagged) === 'chase,chase' && /1 price row with a figure not found/.test(flagged[0].msg), codes(flagged), 'unverified_prices,inferred_prices');
const pending = needsAttention(rec([field('business_name')], { prices: { state: { status: 'pending' }, rows: [], flags: [] } }));
chk('Pending extraction is not an item', pending.length === 0, codes(pending), '');

// Niche, submissions, audio
const unknown = needsAttention(rec([field('business_name')], { niche: 'Roofers ', nicheKnown: false }));
chk('No field map for the niche → one blocks item on Services', codes(unknown) === 'no_field_map' && unknown[0].group === 'blocks' && unknown[0].panel === 'services' && /Roofers /.test(unknown[0].msg), JSON.stringify(unknown), '');
const errored = needsAttention(rec([field('business_name')], { submissions: [{ submissionId: 'ok-1', status: 'processed' }, { submissionId: 'bad-1', status: 'error' }] }));
chk('An errored submission → one blocks item naming it', codes(errored) === 'submission_error' && errored[0].group === 'blocks' && errored[0].submissionId === 'bad-1', JSON.stringify(errored), '');
const audio = needsAttention(rec([field('prices_voice', { tier: 'chase', panel: 'services', label: 'Prices for your services (voice)', audio: { downloadStatus: 'failed' } })]));
chk('A failed audio copy → one chase item on the field\'s panel', codes(audio) === 'audio_failed' && audio[0].group === 'chase' && audio[0].panel === 'services' && audio[0].field === 'prices_voice', JSON.stringify(audio), '');

// Grouping order: everything that blocks the build before everything worth chasing
const mixed = needsAttention(rec([field('business_phone', { status: 'blank' }), field('team_size', { status: 'blank', tier: 'chase', panel: 'about_business' })], { niche: 'X', nicheKnown: false, prices: { state: { status: 'done' }, rows: [], flags: [] } }));
chk('Blocks (no field map, blank needed, no prices) come before chase (blank chase)', groups(mixed) === 'blocks,blocks,blocks,chase' && codes(mixed) === 'no_field_map,blank_needed,no_prices,blank_chase', codes(mixed), 'no_field_map,blank_needed,no_prices,blank_chase');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
