'use strict';
// Fixture: v20 validator and per-field retries (Stage 7). Runs the validator on the
// real 14 Oct Edens Edge output, unit-tests the new checks, and drives the retry
// engine with canned rewrites. No API calls.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const A = require(path.join(root, 'allocation.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { validateV20, buildValidationContext } = require(path.join(root, 'validate-v20.js'));
const { runRetries, parseRetryReply, buildRetryMessage } = require(path.join(root, 'v20-retry.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: v20 validator and retries ===\n');

const parsed = parseDossier(fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'));
const reply = JSON.parse(fs.readFileSync(path.join(__dirname, 'allocation-replies/edens-edge-bassett-heath-portswood.json'), 'utf8'));
const DR = computeDecisions({ cv: E.cv, niche: landscaper, pages: E.pages, keyValueMap: E.keyValueMap, serviceParentMap: {}, v20TestMode: true,
  allocationData: A.resolveAllocatedItems(reply.homepage, parsed) });
const keys = new Set([...G.buildClientValues(E.cv, DR.decisions.d1_years_trading).matchAll(/^\[CV: ([a-z0-9_]+)\]/gm)].map(m => m[1]));
const V = buildValidationContext({ cv: E.cv, niche: landscaper, decisions: DR.decisions, keyValueMap: E.keyValueMap, populatedCvKeys: keys });
const rec = JSON.parse(fs.readFileSync(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-record.json'), 'utf8'));
const issues = validateV20(rec, V);
const has = (check, fieldPart, msgPart) => issues.some(i => i.check === check && i.field.includes(fieldPart) && (!msgPart || i.message.includes(msgPart)));
const hasNot = (check, fieldPart, msgPart) => !has(check, fieldPart, msgPart);

// ── The first run's known problems are caught ──
chk('WORKED: "In Bassett Heath, we work on…"', has('WORKED', 'content_block', 'Bassett Heath'), '', 'WORKED on content block');
chk('CVLIT: company name written out in the services intro', has('CVLIT', 'services_intro'), '', 'CVLIT');
chk('2: "start to finish"', has('2', 'Landscape Gardener', 'start to finish'), '', 'banned');
chk('2: "range of materials"', has('2', 'Paving contractor', 'range of materials'), '', 'banned');
chk('2: "As your paving contractor" opener', has('2', 'Paving contractor', 'As your/a'), '', 'banned');
chk('2: "wide range of"', has('2', 'areas_intro', 'wide range of'), '', 'banned');
chk('NUM: "a day or two" and "one or two weeks" (no typical_jobs on file)', has('NUM', 'How long', 'a day or two') && has('NUM', 'How long', 'one or two weeks'), '', 'both');
chk('HERO: keyword missing and "Romsey, Southampton"', has('HERO', 'hero', 'listing Romsey beside Southampton'), '', 'HERO');
chk('TRUST-REPEAT: 100 jobs in the content block', has('TRUST-REPEAT', 'content_block'), '', 'TRUST-REPEAT');
chk('PROOF-REPEAT: a 4th "fixed price"', has('PROOF-REPEAT', 'final_cta', 'fixed price'), '', 'PROOF-REPEAT on final CTA');
chk('1b: "four-person", "mid-job", "slower-draining"', has('1b', 'content_block', 'four-person') && has('1b', 'Fixed Prices', 'mid-job') && has('1b', 'Why does water', 'slower-draining'), '', 'all three');
chk('N7: Why point over 40 words', has('N7', 'Insured up to', '50 words'), '', 'N7');
chk('N24: FAQ 6 first sentence 22 words', has('N24', 'Which areas', '22 words'), '', 'N24');
chk('N17: company token in the owner body', has('N17', 'owner_body'), '', 'N17');

// ── And these are not false positives ──
chk('"Most of our work as a landscaper in Southampton" is not an "As a" opener', hasNot('2', 'content_block', 'As your/a'), issues.filter(i => i.check === '2' && i.field.includes('content')).map(i => i.message).join('; '), 'none');
chk('"same week" (start_time) is allowed', hasNot('NUM', 'How soon'), '', 'no NUM on FAQ 4');
chk('100, 20 miles and £5m are allowed (client values)', hasNot('NUM', '', '"100') && hasNot('NUM', '', '"20') && hasNot('NUM', '', '"£5'), issues.filter(i => i.check === 'NUM').map(i => i.message).join('; '), 'not flagged');
chk('1908 and 1930 are allowed (allocated research)', hasNot('NUM', 'content_block'), '', 'no NUM on content block');
chk('"what your garden actually needs" (verb) is not banned', hasNot('2', 'Gardener', 'needs'), '', 'not flagged');
chk('Every BLOCK on a model field is retry-eligible', issues.filter(i => i.type === 'BLOCK' && i.ref).every(i => i.retry), '', 'all retry');

// ── New checks, unit level ──
const realKvm = { ...E.keyValueMap, service_1: 'Lawn mowing and maintenance', service_2: 'Tree trimming and pruning', service_3: 'Patio paving', category_2: 'Tree service' };
const spm = { service_1: 'Gardener', service_2: 'Tree service', service_3: 'Paving contractor' };
const V2 = buildValidationContext({ cv: E.cv, niche: landscaper, decisions: DR.decisions, keyValueMap: realKvm, serviceParentMap: spm, populatedCvKeys: keys });
const one = (field, text) => { const r = JSON.parse(JSON.stringify(rec)); r[field.key][field.i][field.sub] = text; return validateV20(r, V2).filter(i => i.field.startsWith(field.sub)); };
const card = { key: 'cards', i: 4, sub: 'card_text' };
const svc = one(card, 'Our [tree service](/tree-service/) visits cover pruning and crown reduction, with lawn mowing and patio laying for the rest of the garden. Every visit is planned around the tree, the planting beneath it and how the garden is used through the year by the family.');
chk('SERVICE: pruning, lawn mowing, patio laying confirmed; crown reduction flagged',
  svc.some(i => i.check === 'SERVICE' && /crown reduction/.test(i.message)) && !svc.some(i => i.check === 'SERVICE' && /"(pruning|lawn mowing|patio laying)"/.test(i.message)),
  svc.filter(i => i.check === 'SERVICE').map(i => i.message).join('; '), 'only crown reduction');
const nouns = one(card, 'We plan every visit around your needs and the needs of the garden through the seasons, so the trees, borders and lawn all get looked after properly across the whole of the year here.');
chk('2: "needs" as a noun is banned', nouns.some(i => i.check === '2' && /needs/.test(i.message)), nouns.map(i => i.check).join(','), 'flagged');
const t1 = one({ key: 'faq_items', i: 3, sub: 'faq_answer' }, 'Usually within three weeks. Larger jobs are booked further ahead, and we confirm a start date with the quote so you know where you stand before anything is ordered for the garden.');
chk('NUM: "three weeks" not in client values', t1.some(i => i.check === 'NUM' && /three weeks/.test(i.message)), t1.map(i => i.message).join('; '), 'NUM');

const rec3 = JSON.parse(JSON.stringify(rec));
rec3.home_areas_intro = 'We are based in Southampton and travel up to [CV: travel_distance] miles to take on jobs across the city and the towns and villages around it, from the coast to the villages north of Winchester.';
rec3.home_hero_intro = '[CV: company_name] is a landscaper in Southampton, Romsey, and the surrounding areas. Prices are fixed.';
rec3.home_content_block_body = rec.home_content_block_body + ' We also offer crown reduction.';
const i3 = validateV20(rec3, V);
chk('TOKEN-UNIT: "[CV: travel_distance] miles" when the value is "20 miles"', i3.some(i => i.check === 'TOKEN-UNIT' && i.field === 'home_areas_intro'), '', 'BLOCK');
chk('HERO: "in Southampton, Romsey," is caught too', i3.some(i => i.check === 'HERO' && /listing Romsey/.test(i.message)), i3.filter(i=>i.check==='HERO').map(i=>i.message).join(';'), 'HERO');
chk('SERVICE applies to the content block', i3.some(i => i.check === 'SERVICE' && i.field === 'home_content_block_body' && /crown reduction/.test(i.message)), '', 'SERVICE');

const rec4 = JSON.parse(JSON.stringify(rec));
rec4.cards[4].card_text = 'Mature trees in Southampton gardens add character but need looking after. We carry out tree trimming and pruning, stump grinding and tree planting across the city and the towns around it, at the right time of year for each tree.';
rec4.faq_items[1].faq_answer = 'Turf gives you a usable lawn in weeks. Seed costs less and suits larger areas, but it takes longer to establish and timing matters more than people expect for both options.';
const i4 = validateV20(rec4, V);
chk('CARD-LINK: a linked card without its own link', i4.some(i => i.check === 'CARD-LINK' && i.field.includes('Tree service')), '', 'BLOCK');
chk('CARD-LINK: cards with their link are fine', !i4.some(i => i.check === 'CARD-LINK' && !i.field.includes('Tree service')), i4.filter(i=>i.check==='CARD-LINK').map(i=>i.field).join(','), 'only the tree card');
chk('NUM: "in weeks" without a number', i4.some(i => i.check === 'NUM' && /in weeks/.test(i.message)), '', 'BLOCK');

const rec5 = JSON.parse(JSON.stringify(rec));
rec5.home_hero_intro = '[CV: company_name] is a landscaper in Romsey and the surrounding areas. Prices are fixed before we start.';
rec5.home_services_intro = 'We cover garden care and full builds for homeowners across Southampton, whether it is a single afternoon or a two-week build, with the same care given to every garden we work on here.';
rec5.faq_items[6].faq_answer = "It depends on the scope. A new lawn is often a day's work, while full makeovers with excavation, paving and planting run longer because each stage has to be right first.";
rec5.home_final_cta_body = 'Call us on [CV: phone] or use the form below and we will come out and look at your garden.';
const i5 = validateV20(rec5, V);
chk('HERO: a lost keyword is a BLOCK', i5.some(i => i.check === 'HERO' && i.type === 'BLOCK' && /keyword/.test(i.message)), i5.filter(i=>i.check==='HERO').map(i=>i.type+' '+i.message).join(';'), 'BLOCK');
chk("NUM: \"two-week\" and \"a day's work\"", i5.some(i => i.check === 'NUM' && /two-week/.test(i.message)) && i5.some(i => i.check === 'NUM' && /day.s/.test(i.message)), i5.filter(i=>i.check==='NUM').map(i=>i.message).join(';'), 'both');
chk('2: "the form below" (no form on the page)', i5.some(i => i.check === '2' && /form/.test(i.message)), '', 'BLOCK');

// ── Retry engine ──
(async () => {
  chk('parseRetryReply strips the label, fences and turns \\n\\n into breaks',
    parseRetryReply('```\nhome_content_block_body: One.\\n\\nTwo.\n```', { key: 'home_content_block_body' }) === 'One.\n\nTwo.', '', 'One.\\n\\nTwo.');
  const msg = buildRetryMessage({ label: 'home_final_cta_body', ref: { key: 'home_final_cta_body' }, text: 'Old.', rangeKey: 'home_final_cta_body' }, ['27 words'], rec, DR.decisions);
  chk('Retry message: field with range, problems, other fields, return label',
    /FIELD: home_final_cta_body \(15 to 25 words\)/.test(msg) && /PROBLEMS:\n- 27 words/.test(msg) && /OTHER FIELDS/.test(msg) && /RETURN: home_final_cta_body:/.test(msg), msg.slice(0, 200), 'all parts');

  const r2 = JSON.parse(JSON.stringify(rec));
  const calls = [];
  const fixed = {
    home_final_cta_body: 'home_final_cta_body: Send a few photos of the garden and we\'ll arrange a visit to look at what you have in mind.',
    'faq_answer': 'faq_answer: It depends on the size of the garden and how much groundwork is involved.',
  };
  const out = await runRetries({ record: r2, V, callRetry: async ({ message }) => {
    const field = message.match(/^FIELD: (.+?)(?: \((?:\d+ to \d+|under \d+) words\))?$/m)[1];
    calls.push(field);
    if (field === 'home_final_cta_body') return { text: fixed.home_final_cta_body, usage: { input_tokens: 10, output_tokens: 5 } };
    if (field.startsWith('faq_answer (How long')) return { text: 'faq_answer: It takes a day or two, or one or two weeks, maybe three weeks.', usage: {} }; // worse
    return { text: '', usage: {} };
  } });
  chk('Final CTA rewrite fixed its issues and was kept', r2.home_final_cta_body.startsWith('Send a few photos') && out.log.some(l => l.field === 'home_final_cta_body' && l.kept), r2.home_final_cta_body, 'kept');
  chk('A worse rewrite is not kept', r2.faq_items[6].faq_answer === rec.faq_items[6].faq_answer && out.log.some(l => l.field.startsWith('faq_answer (How long') && !l.kept), '', 'original kept');
  const perField = calls.reduce((m, f) => (m[f] = (m[f] || 0) + 1, m), {});
  chk('At most 2 retries per field', Math.max(...Object.values(perField)) <= 2, JSON.stringify(perField).slice(0, 200), '<= 2');
  chk('A whole-page reply is rejected as not a single field', await (async () => { const r9 = JSON.parse(JSON.stringify(rec)); const o9 = await runRetries({ record: r9, V, maxRetries: 1, callRetry: async () => ({ text: 'home_hero_intro: x\nhome_services_intro: y', usage: {} }) }); return o9.log.every(l => !l.kept) && o9.log.some(l => l.error === 'reply was not a single field'); })(), '', 'rejected');
  chk('Empty replies are logged, not applied', out.log.some(l => l.error === 'empty reply'), '', 'logged');
  chk('Final issues returned after retries', Array.isArray(out.finalIssues) && out.finalIssues.length < issues.length, `${out.finalIssues.length} vs ${issues.length}`, 'fewer');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
