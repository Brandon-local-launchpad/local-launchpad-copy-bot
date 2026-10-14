'use strict';
// Fixture: v20 homepage generation (Stage 6). Client block, parser, page record and
// the runner, using canned model replies. No API calls.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { parseDossier } = require(path.join(root, 'geo-dossier.js'));
const A = require(path.join(root, 'allocation.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { parseV20Output } = require(path.join(root, 'v20-parse.js'));
const { expectedFromDecisions } = require(path.join(root, 'v20-record.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: v20 generation (Edens Edge, canned replies) ===\n');

// Edens Edge acceptance values (brief §7) with the real dossier and a real allocation
const cv = {
  company_name: 'Edens Edge Landscaping', company_name_gbp_checked: true, phone: '023 0000 0000',
  hours: 'Monday to Saturday, 7am to 6pm', primary_category: 'Landscaper', year_founded: '', jobs_completed: '100',
  rating: '', review_count: '', insurance_cover: '5m',
  differentiator_1: 'Fixed Prices With No Hidden Costs', differentiator_1_confirmed: true, differentiator_1_sentence: 'Fixed prices with no hidden costs',
  differentiator_2: 'Family Run and Independent', differentiator_2_confirmed: false, differentiator_2_sentence: 'Family run',
  verified_logos: [], free_quotes: 'yes', quote_method: '', response_time: '', start_time: 'same week',
  owner_name: 'Test Owner', owner_qualification: 'test qualification', owner_why: 'test owner why', owner_promise: 'test owner promise',
  owner_photo: 'yes', business_type: 'A', team_size: '4', travel_distance: '20 miles',
  review_themes: [{ theme: 'Tidy every day', approved: true }, { theme: 'Unapproved theme', approved: false }],
  jobs_wanted: [], map_embed: '', stand_ins: ['owner_why', 'owner_promise'], h1_override: 'Landscaper Southampton',
};
const cats = ['Landscape Gardener', 'Landscape Designer', 'Gardener', 'Lawn care service', 'Tree service', 'Paving contractor', 'Deck builder'];
const pages = [
  { pageType: 'homepage', pageTitle: 'Edens Edge Landscaping', urlSlug: '/', h1: 'Landscaper Southampton', status: 'live' },
  ...cats.map(n => ({ pageType: 'category', pageTitle: n, urlSlug: '/' + n.toLowerCase().replace(/ /g, '-'), h1: `${n} Southampton`, status: 'live' })),
  { pageType: 'location', pageTitle: 'Romsey', urlSlug: '/locations/romsey', h1: 'Landscaper Romsey', status: 'live' },
];
const keyValueMap = { biz_area_1: 'Southampton', biz_area_2: 'Romsey', category_1: 'Landscaper' };
const parsed = parseDossier(fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'));
const reply = JSON.parse(fs.readFileSync(path.join(__dirname, 'allocation-replies/edens-edge-bassett-heath-portswood.json'), 'utf8'));
const allocationData = A.resolveAllocatedItems(reply.homepage, parsed);
const DR = computeDecisions({ cv, niche: landscaper, pages, keyValueMap, serviceParentMap: {}, v20TestMode: true, allocationData });
const D = DR.decisions;

// ── CTA band ──
chk('CTA band line without response time', D.cta_band.line === "Tell us about your garden and we'll get back to you.", D.cta_band.line, "Tell us about your garden and we'll get back to you.");
const DR2 = computeDecisions({ cv: { ...cv, response_time: '24 hours' }, niche: landscaper, pages, keyValueMap, serviceParentMap: {}, v20TestMode: true, allocationData });
chk('CTA band line with response time keeps the token', DR2.decisions.cta_band.line === "Tell us about your garden and we'll get back to you within [CV: response_time].",
  DR2.decisions.cta_band.line, '... within [CV: response_time].');
chk('Final CTA trust lines: hours only (no reviews, no response time)', JSON.stringify(D.final_cta_trust_lines) === '["[CV: hours]"]', JSON.stringify(D.final_cta_trust_lines), '["[CV: hours]"]');
chk('DECISIONS block shows the fixed CTA band line', DR.decisionsBlock.includes("CTA band line (code, fixed): Tell us about your garden"), 'missing', 'present');

// ── Client block ──
const ctx = G.nicheContext(cv, landscaper, keyValueMap);
const req = G.buildV20Request({ cv, niche: landscaper, decisions: D, decisionsBlock: DR.decisionsBlock, calibrationPack: 'PACK TEXT', ctx });
const cb = req.clientBlock;
chk('System: CORE (20) first, cached client block second',
  req.system[0].text.startsWith('# Homepage Copywriting Prompt — CORE (20)') && req.system[1].cache_control && req.system[1].cache_control.type === 'ephemeral',
  req.system.map(s => s.text.slice(0, 30)).join(' / '), 'CORE (20), then cached client block');
chk('Client values: confirmed differentiator_1 in, unconfirmed differentiator_2 out',
  cb.includes('[CV: differentiator_1] = Fixed Prices With No Hidden Costs') && !cb.includes('differentiator_2'), 'see block', 'diff_1 only');
chk('Client values: only approved review themes', cb.includes('[CV: review_themes] = Tidy every day') && !cb.includes('Unapproved'), 'see block', 'Tidy every day only');
chk('Client values: no internal fields', !/h1_override|map_embed|stand_ins|gbp_checked|verified_logos|_confirmed/.test(cb), (cb.match(/h1_override|map_embed|stand_ins|gbp_checked|verified_logos|_confirmed/g) || []).join(','), 'none');
chk('Client values: blank values left out', !/\] = \s*$/m.test(cb) && !cb.includes('[CV: rating]'), 'see block', 'no blank lines');
chk('Niche entry: placeholders resolved', !/\[(TRADE|CITY|CATEGORY|CUSTOMER_TYPE|QUOTE_FREE)[A-Z_]*\]/.test(cb), (cb.match(/\[[A-Z_]+\]/g) || []).join(','), 'none');
chk('Calibration pack included', cb.includes('CALIBRATION PACK\nPACK TEXT'), 'missing', 'present');
chk('Message is the decisions block', req.message === DR.decisionsBlock, 'differs', 'same');

// ── Parser ──
const exp = expectedFromDecisions(D);
const good = [
  '=== MODEL OUTPUT: homepage ===',
  'home_hero_intro: We are [CV: company_name], a landscaper in Southampton near Romsey and the surrounding areas. Prices are fixed.',
  'home_content_block_body: Paragraph one about Bassett.\\n\\nParagraph two with [landscape gardener](/landscape-gardener) work.',
  'home_services_intro: We cover gardens across the city.',
  'home_services_cards:',
  ...exp.cards.map(c => `  - card_name: ${c} | card_text: Text for ${c}.`),
  'home_services_more_line: HIDDEN',
  'home_why_points:',
  ...exp.points.map(p => `  - point_title: ${p} | point_body: Body for ${p}.`),
  'home_process_steps:',
  ...exp.steps.map(s => `  - step_title: ${s} | step_body: Body for ${s}.`),
  'home_owner_body: I trained in Southampton.',
  'home_areas_intro: We work across the city.',
  'home_faq_items:',
  ...exp.faqs.map(q => `  - faq_question: ${q} | faq_answer: Answer to ${q}`),
  'home_final_cta_body: Send us a few photos and we will arrange a visit.',
  'MODEL_FLAGS:',
  'none',
].join('\n');
const p1 = parseV20Output(good, exp);
chk('Good output: no parse flags, no model flags', !p1.flags.length && !p1.modelFlags.length, p1.flags.map(f => f.msg).join('; '), 'none');
chk('Content block "\\n\\n" becomes a paragraph break', p1.fields.home_content_block_body.split('\n\n').length === 2, JSON.stringify(p1.fields.home_content_block_body), '2 paragraphs');
chk('More line HIDDEN kept as HIDDEN', p1.fields.home_services_more_line === 'HIDDEN', p1.fields.home_services_more_line, 'HIDDEN');
chk('All cards parsed in order', p1.fields.home_services_cards.map(c => c.card_name).join(',') === exp.cards.join(','), '', '');

const bad = good
  .replace(/^home_areas_intro:.*$/m, '')                                                     // missing label
  .replace(`  - card_name: ${exp.cards[1]} | card_text`, `  - card_name: Landscape Gardening | card_text`) // renamed card
  .replace(/^  - card_name: Deck builder.*$/m, '')                                          // one card short
  .replace('home_services_more_line: HIDDEN', 'home_services_more_line: We also do fencing.')// should be hidden
  .replace(/^home_owner_body:.*$/m, 'home_owner_body: HIDDEN')                               // shown but HIDDEN
  .replace(/^  - faq_question: (Which areas[^|]*)\| faq_answer: .*$/m, '  - faq_question: $1 faq_answer: no pipe') // format
  .replace('none', 'F-ALLOC: only one neighbourhood felt usable');
const p2 = parseV20Output(bad, exp);
const codes = p2.flags.map(f => f.code);
chk('Bad output: P-MISSING, P-TITLE, P-COUNT, P-HIDDEN, P-EMPTY, P-FORMAT all raised',
  ['P-MISSING', 'P-TITLE', 'P-COUNT', 'P-HIDDEN', 'P-EMPTY', 'P-FORMAT'].every(c => codes.includes(c)), codes.join(','), 'all six');
chk('Renamed card keeps the given name', p2.fields.home_services_cards[1].card_name === exp.cards[1], p2.fields.home_services_cards[1].card_name, exp.cards[1]);
chk('Model flag captured', p2.modelFlags.length === 1 && /only one neighbourhood/.test(p2.modelFlags[0].msg), JSON.stringify(p2.modelFlags), '1 MODEL flag');
chk('Fenced and multi-line output still parses',
  !parseV20Output('```\n' + good.replace('home_areas_intro: We work', 'home_areas_intro:\nWe work') + '\n```', exp).flags.length, '', 'no flags');

// ── Runner and record ──
(async () => {
  let sent = null;
  const rec = await G.generateV20Homepage({
    cv, niche: landscaper, keyValueMap, decisionsResult: DR, calibrationPack: 'PACK', calibrationPackName: 'Landscaper Gardener',
    callModel: async (r) => { sent = r; return { text: good, usage: { input_tokens: 1, output_tokens: 2 } }; },
    extraFlags: [], allocationSource: 'model',
  });
  const order = Object.keys(rec).filter(k => k !== 'meta');
  const want = ['page', 'FLAGS', 'VALIDATION', 'seo_title', 'meta_description', 'home_hero_h1', 'home_hero_trust_line', 'home_hero_intro',
    'home_hero_rating_line', 'buttons', 'home_trusted_logos', 'home_content_block_h2', 'home_content_block_body', 'home_services_h2',
    'home_services_intro', 'cards', 'home_services_more_line', 'home_why_h2', 'points', 'home_reviews_show', 'home_reviews_h2',
    'home_process_h2', 'steps', 'cta_band', 'home_owner_show', 'home_owner_h2', 'home_owner_body', 'home_areas_h2', 'home_areas_intro',
    'home_areas_links', 'home_faq_h2', 'faq_items', 'home_final_cta_h2', 'home_final_cta_body', 'home_final_cta_trust_lines'];
  chk('Record fields in page order (brief §5)', order.join(',') === want.join(','), order.join(','), want.join(','));
  chk('Model called with max tokens 8192 and the cached system blocks', sent && sent.maxTokens === 8192 && sent.system.length === 2, sent && sent.maxTokens, 8192);
  chk('Hidden sections marked: logos HIDDEN, reviews false/HIDDEN', rec.home_trusted_logos === 'HIDDEN' && rec.home_reviews_show === false && rec.home_reviews_h2 === 'HIDDEN',
    `${rec.home_trusted_logos} ${rec.home_reviews_show} ${rec.home_reviews_h2}`, 'HIDDEN false HIDDEN');
  chk('Buttons use the phone token', JSON.stringify(rec.buttons) === '["Get My Free Quote","Call [CV: phone]"]', JSON.stringify(rec.buttons), '["Get My Free Quote","Call [CV: phone]"]');
  chk('CTA band: heading, fixed line, buttons', rec.cta_band.heading === 'Ready to talk to a local landscaper?' && rec.cta_band.line.startsWith('Tell us') && rec.cta_band.buttons.length === 2,
    JSON.stringify(rec.cta_band), 'heading + Tell us line + 2 buttons');
  chk('Cards carry name, text and URL', rec.cards[0].card_url === '/landscape-gardener' && rec.cards[0].card_text.startsWith('Text for'), JSON.stringify(rec.cards[0]), 'url + text');
  chk('Areas: Southampton first, plain', rec.home_areas_links[0].name === 'Southampton' && rec.home_areas_links[0].url === null, JSON.stringify(rec.home_areas_links[0]), 'Southampton, null');
  chk('VALIDATION placeholder until Stage 7', rec.VALIDATION.status === 'not run (Stage 7)', rec.VALIDATION.status, 'not run (Stage 7)');
  chk('Meta keeps raw output, stand-ins and the calibration pack name',
    rec.meta.raw_output === good && rec.meta.stand_ins.length === 2 && rec.meta.calibration_pack === 'Landscaper Gardener', JSON.stringify({ ...rec.meta, raw_output: '…', decisions_block: '…', client_block: '…' }), 'all present');

  // Gate: no call
  let called = false;
  const blocked = await G.generateV20Homepage({
    cv: { ...cv, phone: '' }, niche: landscaper, keyValueMap,
    decisionsResult: computeDecisions({ cv: { ...cv, phone: '' }, niche: landscaper, pages, keyValueMap, serviceParentMap: {}, v20TestMode: true, allocationData }),
    calibrationPack: '', callModel: async () => { called = true; return { text: '' }; },
  });
  chk('Failed gate: no model call, record blocked with G-INPUT', !called && blocked.blocked && blocked.FLAGS.some(f => f.code === 'G-INPUT'),
    `called=${called} ${blocked.FLAGS.map(f => f.code).join(',')}`, 'no call, G-INPUT');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
