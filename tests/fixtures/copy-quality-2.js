'use strict';
// Fixture: copy quality 2, phase 1 (4 Nov 2026). The flag pass, the claims pass instruction, the
// meta builders, the headings' customer word, the question form of a service name, the research
// filler rules, the homepage keyword word and the library's question_name column. No API calls.
const path = require('path');
const fs = require('fs');
const os = require('os');
const root = path.join(__dirname, '../..');
const { computeDecisions, headingCustomers, weClause, isPersonWord } = require(path.join(root, 'decisions.js'));
const CD = require(path.join(root, 'category-decisions.js'));
const SD = require(path.join(root, 'service-decisions.js'));
const { parseDossier, dropVague } = require(path.join(root, 'geo-dossier.js'));
const A = require(path.join(root, 'allocation.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { validateV20, buildValidationContext } = require(path.join(root, 'validate-v20.js'));
const { runFlagPass, runClaimRetries, FLAG_PASS } = require(path.join(root, 'v20-retry.js'));
const C = require(path.join(root, 'h1-research/claims.js'));
const L = require(path.join(root, 'niche-library/library.js'));
const UL = require(path.join(root, 'ui/library.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: copy quality 2, phase 1 ===\n');

// The Edens Edge homepage set-up the validator fixture uses
const parsed = parseDossier(fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'));
const reply = JSON.parse(fs.readFileSync(path.join(__dirname, 'allocation-replies/edens-edge-bassett-heath-portswood.json'), 'utf8'));
const decide = (cv, niche) => computeDecisions({ cv, niche, pages: E.pages, keyValueMap: E.keyValueMap, serviceParentMap: {}, v20TestMode: true, allocationData: A.resolveAllocatedItems(reply.homepage, parsed) });
const DR = decide(E.cv, landscaper);
const keys = new Set([...G.buildClientValues(E.cv, DR.decisions.d1_years_trading).matchAll(/^\[CV: ([a-z0-9_]+)\]/gm)].map(m => m[1]));
const V = buildValidationContext({ cv: E.cv, niche: landscaper, decisions: DR.decisions, keyValueMap: E.keyValueMap, populatedCvKeys: keys });
const rec = JSON.parse(fs.readFileSync(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-record.json'), 'utf8'));

// ── Headings and the meta ──
chk('headingCustomers: the first customer type only', headingCustomers('homeowners and landlords') === 'Homeowners' && headingCustomers('homeowners, tenants and local businesses') === 'Homeowners', headingCustomers('homeowners and landlords'), 'Homeowners');
chk('headingCustomers: a business, landlord or trade first type reads Customers', headingCustomers('landlords and letting agents') === 'Customers' && headingCustomers('local businesses') === 'Customers' && headingCustomers('other trades') === 'Customers' && headingCustomers('dog owners') === 'Dog owners', [headingCustomers('landlords and letting agents'), headingCustomers('dog owners')].join(' | '), 'Customers | Dog owners');
chk('Why H2 and the reviews H2 use the first customer type, never the list', (() => { const d = decide({ ...E.cv, review_count: '25', rating: '4.9' }, { ...landscaper, customer_type: 'homeowners and landlords' }).decisions; const h = d.d8 || {}; return /^Why Southampton Homeowners Choose /.test(h.why || '') && /From Southampton Homeowners$/.test(h.reviews || '') && !/Homeowners And Landlords|Homeowners and Landlords/.test(JSON.stringify(h)); })(), JSON.stringify((decide({ ...E.cv, review_count: '25', rating: '4.9' }, { ...landscaper, customer_type: 'homeowners and landlords' }).decisions.d8 || {})).slice(0, 200), 'Homeowners only');
chk('weClause: "We photograph every fault before we quote" turns into a clause', weClause('We photograph every fault before we quote') === 'and photographs every fault before quoting', weClause('We photograph every fault before we quote'), 'and photographs every fault before quoting');
chk('weClause: a shape that does not turn cleanly returns null (the sentence then stands alone)', weClause('We are a family firm and we care') === null && weClause('We never leave a roof open overnight') === null, '', 'null');
chk('isPersonWord: landscaper and roofer are person words, roofing services and guttering are work words', isPersonWord('landscaper') && isPersonWord('roofer') && !isPersonWord('roofing services') && !isPersonWord('guttering'), '', 'person / work');
const metaGutter = decide({ ...E.cv, h1_override: 'Roofing services Southampton' }, { ...landscaper, trade_person: 'guttering specialist', trade_person_plural: 'guttering specialists' }).decisions.d4_meta;
chk('Homepage meta: a work word keyword reads "is a [trade person] in [city]", never "is a roofing services"', /is a guttering specialist in Southampton/.test(metaGutter) && !/is a roofing services/.test(metaGutter), metaGutter, 'is a guttering specialist in Southampton');
chk('Homepage meta: a person word keyword is kept as it is', /is a landscaper in Southampton/.test(DR.decisions.d4_meta), DR.decisions.d4_meta, 'is a landscaper in Southampton');
const metaWe = CD.metaFor({ cv: { company_name: 'Kestrel Ridge', differentiator_1_confirmed: true, differentiator_1_sentence: 'We photograph every fault before we quote' }, isPerson: false, kwNatural: 'roofing services in Southampton', metaCta: 'Get your free quote today.', yearsTrading: 3, yearFounded: 2023, modifier: '' });
chk('Category meta: a "We ..." proof becomes a clause, never "with we photograph"', /offers roofing services in Southampton and photographs every fault before quoting\./.test(metaWe) && !/with we/.test(metaWe), metaWe, 'and photographs every fault before quoting');
const metaOffering = CD.metaFor({ cv: { company_name: 'Acme', differentiator_1_confirmed: true, differentiator_1_sentence: 'Offering fixed prices with no hidden costs' }, isPerson: false, kwNatural: 'paving in Southampton', metaCta: 'Get your free quote today.', yearsTrading: 3, yearFounded: 2023, modifier: '' });
chk('Category meta: a proof that says "offering" joins with "with", never "offering ... offering"', /offers paving in Southampton with fixed prices with no hidden costs\./.test(metaOffering) && !/offering .*offering/i.test(metaOffering), metaOffering, 'with fixed prices with no hidden costs');

// ── The question form of a service name ──
const q = SD.singularQuestionName;
chk('singularQuestionName: a plain plural becomes a singular with its article', q('patios') === 'a patio' && q('roof repairs') === 'a roof repair' && q('awnings') === 'an awning' && q('canopies') === 'a canopy' && q('hedges') === 'a hedge', [q('patios'), q('roof repairs'), q('awnings'), q('canopies')].join(' | '), 'a patio | a roof repair | an awning | a canopy');
chk('singularQuestionName: an uncountable or a compound name stays as it is, with no article', q('end of tenancy cleaning') === 'end of tenancy cleaning' && q('lockouts and gaining entry') === 'lockouts and gaining entry' && q('ant control') === 'ant control' && q('glass') === 'glass', [q('end of tenancy cleaning'), q('glass')].join(' | '), 'unchanged');
const ctxQ = { svc: 'Patios', svcLower: 'patios', svcQuestion: 'a patio', cat: 'Paving Contractor', catLower: 'paving contractor', work: 'Paving', workLower: 'paving', town: 'Southampton', city: 'Southampton' };
chk('phSvc: a question names the service in its question form; a heading keeps the page name', SD.phSvc('How much does [SERVICE_LOWER] cost in [CITY]?', ctxQ) === 'How much does a patio cost in Southampton?' && SD.phSvc('Is [SERVICE] Right for Your Garden?', ctxQ) === 'Is a patio right for your garden?' && SD.phSvc('Signs You Need [SERVICE]', ctxQ) === 'Signs You Need Patios', [SD.phSvc('How much does [SERVICE_LOWER] cost in [CITY]?', ctxQ), SD.phSvc('Signs You Need [SERVICE]', ctxQ)].join(' | '), 'a patio in the question, Patios in the heading');
chk('phSvc: the library question_name wins over the singulariser (the context carries it)', SD.phSvc('How long does [SERVICE_LOWER] take?', { ...ctxQ, svcQuestion: 'a lockout call out' }) === 'How long does a lockout call out take?', '', 'a lockout call out');

// ── Research filler ──
chk('dropVague: a sentence that only says the soil varies is dropped, the rest kept', dropVague('Victorian terraces on clay. Soils vary across the area. Front gardens are short.') === 'Victorian terraces on clay. Front gardens are short.' && dropVague('The geology varies widely across the city; most plots are on gravel.') === 'most plots are on gravel.', dropVague('Victorian terraces on clay. Soils vary across the area. Front gardens are short.'), 'the varies sentence gone');
chk('RESEARCH-LANG: "the soil varies across the city" and "geology varies" are flagged on the page', (() => { const r = JSON.parse(JSON.stringify(rec)); r.home_content_block_body = r.home_content_block_body + ' The soil varies across the city, and the geology varies from street to street.'; const iss = validateV20(r, V).filter(i => i.check === 'RESEARCH-LANG' && i.field === 'home_content_block_body'); return iss.length >= 1 && /varies/.test(iss.map(i => i.message).join(' ')); })(), '', 'RESEARCH-LANG on varies');

// ── The flag pass ──
(async () => {
  const r1 = JSON.parse(JSON.stringify(rec));
  const long = 'We look after gardens for homeowners across the city and the villages around it, and every visit starts with a walk round so the work suits the garden rather than a standard list, and the lawns, the hedges, the beds and the paths between them are all part of what a visit covers through the year, whatever the season brings and whatever the garden needs most at the time.';
  r1.home_services_intro = long; // 70 odd words against a 30 to 60 range: an N7 flag
  const short = 'We look after gardens across the city and the villages around it. Every visit starts with a walk round the garden, so the work suits what is there rather than a standard list. Lawns, hedges, beds and paths are all part of it.';
  const calls = [];
  const out = await runFlagPass({ record: r1, V, callRetry: async ({ message }) => {
    const field = message.match(/^FIELD: (.+?)(?: \((?:\d+ to \d+|under \d+) words\))?$/m)[1];
    calls.push({ field, message });
    if (field === 'home_services_intro') return { text: `home_services_intro: ${short}`, usage: { input_tokens: 1, output_tokens: 1 } };
    return { text: '', usage: {} };
  } });
  const mine = calls.find(c => c.field === 'home_services_intro');
  chk('Flag pass: a field with an N7 range flag is rewritten with its flag message and the shorter text is kept', r1.home_services_intro === short && out.log.some(l => l.field === 'home_services_intro' && l.kept) && mine && /words: it must be 30 to 60/.test(mine.message), JSON.stringify(out.log.filter(l => l.field === 'home_services_intro').map(l => [l.kept, l.error, l.flags_before, l.flags_after])), 'kept, flags dropped');
  chk('Flag pass: before and after counts and the kept count come back', out.before > out.after && out.kept >= 1, `${out.before} -> ${out.after}, kept ${out.kept}`, 'fewer flags after');
  chk('Flag pass: only fields with a pass flag are tried (every call was for a flagged field)', calls.every(c => validateV20(JSON.parse(JSON.stringify(rec)), V).concat(validateV20(r1, V)).some(i => i.field === c.field && i.type === 'FLAG')), calls.map(c => c.field).join(', '), 'flagged fields only');
  const r2 = JSON.parse(JSON.stringify(rec));
  r2.home_services_intro = long;
  const out2 = await runFlagPass({ record: r2, V, maxRounds: 1, callRetry: async ({ message }) => {
    const field = message.match(/^FIELD: (.+?)(?: \((?:\d+ to \d+|under \d+) words\))?$/m)[1];
    if (field === 'home_services_intro') return { text: `home_services_intro: ${short.replace('so the work suits', 'so the work — suits')}`, usage: {} }; // an em dash: a new BLOCK
    return { text: '', usage: {} };
  } });
  chk('Flag pass: a rewrite that adds a BLOCK is not kept', r2.home_services_intro === long && out2.log.some(l => l.field === 'home_services_intro' && !l.kept && /BLOCK/.test(l.error || '')), JSON.stringify(out2.log.filter(l => l.field === 'home_services_intro').map(l => [l.kept, l.error])), 'rejected: the rewrite added a BLOCK');
  chk('Flag pass set: N7, N18, N21, N24, REPEAT-PAGE, REPEAT-IN, PAD-OPENER, ITEM-REPEAT, SERVICE, SCENERY and RESEARCH-LANG are in it', ['N7', 'N18', 'N21', 'N24', 'REPEAT-PAGE', 'REPEAT-IN', 'PAD-OPENER', 'ITEM-REPEAT', 'SERVICE', 'SCENERY', 'RESEARCH-LANG'].every(c => FLAG_PASS.has(c)), [...FLAG_PASS].join(', '), 'all present');

  // ── The claims pass instruction ──
  const r3 = JSON.parse(JSON.stringify(rec));
  let claimMessage = '';
  let round = 0;
  await runClaimRetries({ record: r3, V, maxRounds: 1, review: async () => ({ at: 'now', findings: round++ ? [] : [{ field: 'home_final_cta_body', quote: r3.home_final_cta_body.split('. ')[0], why: 'No practice on file says so.' }] }), callRetry: async ({ message }) => { claimMessage = message; return { text: 'home_final_cta_body: Call us on [CV: phone] and tell us about the garden.', usage: {} }; } });
  chk('Claims pass: the rewrite instruction asks for the trade\'s principle in the third person, never "we" for an unconfirmed practice', /third person/.test(claimMessage) && /a fair landscaper/.test(claimMessage) && /never "we" or "our"/.test(claimMessage), claimMessage.split('\n').find(l => /Unsupported claim/.test(l)) || '', 'third person, a fair landscaper, never we');
  chk('Shared copy rules carry the rule', /Never "we" for an unconfirmed practice/.test(fs.readFileSync(path.join(root, 'prompts/_shared_copy_rules.md'), 'utf8')), '', 'rule present');

  // ── The homepage keyword word ──
  const ctxH = { primaryName: 'Roofing services', primaryKey: 'roofing_services', baseTown: 'Bournemouth', terms: {}, homepageKeyword: 'Roofer', categoryName: () => null };
  const cands = C.candidatesV2({ type: 'homepage', title: 'Homepage', info: {} }, ctxH);
  chk('H1 pattern: the homepage keyword word is the entry\'s homepage_keyword ("roofer bournemouth" first), the category pattern still a candidate', cands[0] && cands[0].keyword === 'roofer bournemouth' && cands[0].fit === 'own' && cands.some(c => c.keyword === 'roofing services bournemouth'), JSON.stringify(cands), 'roofer bournemouth first');
  const candsPlain = C.candidatesV2({ type: 'homepage', title: 'Homepage', info: {} }, { ...ctxH, homepageKeyword: null });
  chk('H1 pattern: without homepage_keyword the primary category pattern leads, as before', candsPlain[0] && candsPlain[0].keyword === 'roofing services bournemouth', JSON.stringify(candsPlain[0]), 'roofing services bournemouth');
  chk('The roofer entry sets homepage_keyword Roofer', require(path.join(root, 'niche-library/roofer.json')).homepage_keyword === 'Roofer', '', 'Roofer');
  chk('stemFor: a Fillout niche key with underscores finds the stem (dog_walkers → pet-care, loft_extensions → loft-conversions)', UL.stemFor('dog_walkers') === 'pet-care' && UL.stemFor('loft_extensions') === 'loft-conversions' && UL.stemFor('roofers') === 'roofer', [UL.stemFor('dog_walkers'), UL.stemFor('loft_extensions')].join(' | '), 'pet-care | loft-conversions');

  // ── The library's question_name column ──
  const csv = 'gbp_name,gbp_category,verdict,target,note,emergency,prose_name,confirm_only,desire_led,question_name\nLock out service,Locksmith,page,Lockouts and gaining entry,,yes,,,,a lockout call out\nPatio paving,Paving contractor,page,Patios,,,,,yes,\n';
  const file = path.join(os.tmpdir(), `copybot-qn-${process.pid}.csv`);
  fs.writeFileSync(file, csv);
  const lib = L.loadLibrary('Question Niche', { file });
  chk('library: question_name is read and the target carries it; a blank stays blank', L.targetFlags(lib, 'Lockouts and gaining entry').question_name === 'a lockout call out' && L.targetFlags(lib, 'Patios').question_name === '', JSON.stringify(L.targetFlags(lib, 'Lockouts and gaining entry')), 'a lockout call out');
  const lib2 = L.loadLibrary('Old Niche', { file: path.join(root, 'niche-library/roofer.csv') });
  chk('library: a CSV without the column still loads (question_name blank)', lib2.rows.length > 0 && lib2.rows.every(r => r.question_name === ''), '', 'blank');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
