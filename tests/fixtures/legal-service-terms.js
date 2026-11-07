'use strict';
// Fixture: legal pages, Stage 2. The Service Terms template, the fill and the values.
// No database, no network, no model, no WordPress.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const { fillTemplate, residueIn, templateKeys, checkTemplate } = require(path.join(root, 'legal/fill.js'));
const { resolveValues, fullPounds, guaranteeMonths, paymentList, tradeWord } = require(path.join(root, 'legal/values.js'));
const { legalAnswers } = require(path.join(root, 'legal/onboarding.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want)); fail++; }
};
console.log('\n=== FIXTURE: legal pages, Stage 2: the Service Terms ===\n');

const template = fs.readFileSync(path.join(root, 'legal-templates/service-terms.md'), 'utf8');

const SOLE = {
  cv: { company_name: 'Edens Edge Landscaping', phone: '07580 412717', email: 'hello@example.com', legal_entity: 'sole_trader', insurance_cover: '5m', guarantee_months: '24', adr_member: 'no', google_ads: 'no', meta_pixel: 'no', sms_tool: 'no' },
  form: { full_name: 'Jane Smith', business_address: '1 High Street, Southampton', vat_registered: 'No', deposit: 'No', payment_methods: ['Bank transfer', 'Card', 'Cash'] },
  answers: legalAnswers({ uses_subcontractors: 'Yes', late_payment_interest: 'Yes' }),
  tradeLower: 'landscaping', lastUpdated: '7 November 2026',
};
const LIMITED = {
  cv: { company_name: 'Kestrel Ridge Roofing', phone: '01234 567890', email: 'office@example.com', legal_entity: 'limited', legal_name: 'Kestrel Ridge Holdings Ltd', company_number: '12345678', registered_office: '2 Mill Lane, Reading', google_ads: 'no', meta_pixel: 'no', sms_tool: 'no' },
  form: { full_name: 'Sam Hill', business_address: '3 Yard Road, Reading', vat_registered: 'Yes', deposit: 'No', payment_methods: 'Bank transfer' },
  answers: legalAnswers({ uses_subcontractors: 'No', late_payment_interest: 'No' }),
  tradeLower: 'roofing', lastUpdated: '7 November 2026',
};
const fillFor = input => { const r = resolveValues(input); return { ...r, ...fillTemplate(template, r.values) }; };
const sole = fillFor(SOLE);
const limited = fillFor(LIMITED);

// ── The template ──
chk('The template has no faults', checkTemplate(template).length === 0, checkTemplate(template), []);
const known = Object.keys(resolveValues({ cv: { legal_entity: 'limited' }, form: { vat_registered: 'No', deposit: 'No' } }).values);
chk('Every key in the template has a value source, so a typo can\'t silently drop a section', templateKeys(template).every(k => known.includes(k)), templateKeys(template).filter(k => !known.includes(k)), []);
chk('The old key names are gone', !/business_name|registered_address|company_jurisdiction|pl_insurance_amount|business_type|owner_name/.test(template), '', '');
const headings = template.match(/^## .+$/gm);
chk('Sections 1 to 15 and the form are all there, in order', headings.length === 16 && headings.slice(0, 15).every((h, i) => h.startsWith(`## ${i + 1}. `)) && headings[15] === '## Cancellation form', headings, '16');

// ── Stage 2 conditions: all on ──
chk('Sole trader: nothing missing or unclear, no leftovers', sole.missing.length === 0 && sole.unclear.length === 0 && sole.residue.length === 0, [sole.missing, sole.unclear, sole.residue], 'empty');
chk('Section 5: the interest line shows when yes', /If a payment is late, we may charge interest at 8% a year/.test(sole.text), '', '');
chk('Section 6: the subcontractors line shows when yes', /We may use trusted subcontractors for parts of the work\./.test(sole.text), '', '');
chk('Section 1: the insurance line shows, as a full figure', /We hold public liability insurance of £5,000,000\. A copy of the certificate/.test(sole.text), '', '');
chk('Section 8: the guarantee text shows, with its months', /We guarantee our workmanship for 24 months/.test(sole.text) && !/We do not offer a separate guarantee/.test(sole.text), '', '');
chk('Section 4: the new wording follows the template\'s own sentence', /you must ask us to in writing \(a text or email is fine\) and confirm you understand you will lose the right to cancel once the work is finished\. If you then cancel/.test(sole.text), '', '');
chk('Sole trader line uses the form\'s full name and business address', /Edens Edge Landscaping is the trading name of Jane Smith, a sole trader, of 1 High Street, Southampton\./.test(sole.text), '', '');
chk('No limited company line on a sole trader', !/is a limited company/.test(sole.text), '', '');

// ── Stage 2 conditions: all off ──
chk('Limited: nothing missing or unclear, no leftovers', limited.missing.length === 0 && limited.unclear.length === 0 && limited.residue.length === 0, [limited.missing, limited.unclear, limited.residue], 'empty');
chk('Section 5: the interest line is gone when no', !/If a payment is late/.test(limited.text), '', '');
chk('Section 6: the subcontractors line is gone when no', !/subcontractors/.test(limited.text), '', '');
chk('Section 1: the insurance line is gone with no amount', !/public liability/.test(limited.text), '', '');
chk('Section 8: the heading stays and the replacement text shows', /## 8\. Our guarantee\n\nWe do not offer a separate guarantee\. Your legal rights under the Consumer Rights Act 2015 still apply\.\n\n## 9\./.test(limited.text), '', '');
chk('Section 8: none of the guarantee text is left', !/We guarantee our workmanship|This guarantee/.test(limited.text), '', '');
chk('Limited company line uses legal_name, not the trading name', /Kestrel Ridge Holdings Ltd is a limited company registered in England and Wales, company number 12345678, registered office 2 Mill Lane, Reading\./.test(limited.text), '', '');
chk('Clause 15 stays, and clauses 4 and 9 are still what it refers to', /clauses 4 and 9 do not apply/.test(limited.text) && /## 4\. Your right to cancel/.test(limited.text) && /## 9\. If something goes wrong/.test(limited.text), '', '');
chk('Clause 15 keeps the 1998 Act wording even with interest off (Brandon, 7 Nov)', /Late Payment of Commercial Debts/.test(limited.text), '', '');
for (const [name, r] of [['sole trader', sole], ['limited', limited]]) {
  chk(`${name}: numbering runs 1 to 15 with none missing`, (r.text.match(/^## \d+\. /gm) || []).length === 15, (r.text.match(/^## \d+\. /gm) || []).length, 15);
  chk(`${name}: no empty bullets`, !/^-\s*$/m.test(r.text), '', '');
  chk(`${name}: no double spaces or three blank lines`, !/[^ ] {2,}[^ ]/.test(r.text) && !/\n{3,}/.test(r.text), '', '');
  chk(`${name}: no bullet begins with a stray space`, !/^- {2,}/m.test(r.text), '', '');
}
chk('VAT: the right line for each client', /We are not VAT registered/.test(sole.text) && !/All prices include VAT/.test(sole.text) && /All prices include VAT/.test(limited.text) && !/We are not VAT registered/.test(limited.text), '', '');
chk('Payment methods read as a sentence', /We accept bank transfer, card and cash\./.test(sole.text) && /We accept bank transfer\./.test(limited.text), '', '');

// ── ADR (Brandon, 7 Nov) ──
const ADR_FALLBACK = "If we can't resolve it, we'll tell you about an independent dispute resolution service, and whether we'll use it. You can also contact Citizens Advice for free, impartial help.";
chk('Not a member: the replacement sentence, word for word, and no provider', sole.text.includes(ADR_FALLBACK) && !/certified ADR provider/.test(sole.text), '', '');
const member = fillFor({ ...SOLE, cv: { ...SOLE.cv, adr_member: 'yes', adr_body: 'TrustMark', adr_url: 'https://example.org/adr' } });
chk('A member: the provider line, and not the replacement', /TrustMark is a certified ADR provider: https:\/\/example\.org\/adr\. We are a member of this scheme and will take part\./.test(member.text) && !member.text.includes(ADR_FALLBACK), '', '');
const memberBlank = fillFor({ ...SOLE, cv: { ...SOLE.cv, adr_member: 'yes' } });
chk('A member with no provider or link: both are missing, so the page holds', memberBlank.missing.includes('adr_body') && memberBlank.missing.includes('adr_url'), memberBlank.missing, 'adr_body, adr_url');

// ── Deposit (Brandon, 7 Nov) ──
const dep = (deposit, cv = {}) => fillFor({ ...SOLE, form: { ...SOLE.form, deposit }, cv: { ...SOLE.cv, ...cv } });
chk('Deposit no: no deposit line', !/ask for a deposit/.test(sole.text), '', '');
chk('Deposit yes with amounts: the line shows', /For jobs over £1,000 we ask for a deposit of 25% before work starts/.test(dep('Yes', { deposit_threshold: '£1,000', deposit_percent: '25' }).text), '', '');
chk('"Only on larger jobs" counts as a deposit', /we ask for a deposit of 25%/.test(dep('Only on larger jobs', { deposit_threshold: '£1,000', deposit_percent: '25%' }).text), '', '');
chk('Deposit yes with no amounts: holds on both', ['deposit_percent', 'deposit_threshold'].every(k => dep('Yes').missing.includes(k)), dep('Yes').missing, 'both');
chk('No deposit answer: unclear, not assumed', dep('').unclear.some(u => u.key === 'deposit_required'), dep('').unclear, 'deposit_required');

// ── Insurance (Brandon, 7 Nov) ──
for (const [given, want] of [['5m', '£5,000,000'], ['£5m', '£5,000,000'], ['5 m', '£5,000,000'], ['5 million', '£5,000,000'], ['1.5m', '£1,500,000'], ['10m', '£10,000,000'], ['2000000', '£2,000,000'], ['£2,000,000', '£2,000,000'], ['500k', '£500,000']]) {
  chk(`Insurance "${given}" → ${want}`, fullPounds(given) === want, fullPounds(given), want);
}
for (const given of ['yes', 'up to 5m', '5m per claim', '5', '£500', 'five million', '5m or 10m', '1.2345m']) {
  chk(`Insurance "${given}" can't be read: unclear`, fullPounds(given) === null, fullPounds(given), null);
}
const badCover = fillFor({ ...SOLE, cv: { ...SOLE.cv, insurance_cover: 'yes, fully insured' } });
chk('Unclear insurance: reported, and the line stays out rather than showing the raw text', badCover.unclear.some(u => u.key === 'insurance_cover') && !/public liability/.test(badCover.text), badCover.unclear, 'insurance_cover');

// ── Guarantee (Brandon, 7 Nov) ──
chk('Months win over years', guaranteeMonths({ guarantee_months: '18', guarantee_years: '10' }).value === '18', '', '');
chk('Blank months: years × 12', guaranteeMonths({ guarantee_years: '10' }).value === '120', guaranteeMonths({ guarantee_years: '10' }), '120');
chk('Both blank: none', guaranteeMonths({}).value === 'none', '', '');
chk('A guarantee in text, not a number: unclear', !!guaranteeMonths({ guarantee_years: '10 on roofs' }).unclear && !!guaranteeMonths({ guarantee_months: 'a year' }).unclear, '', '');
chk('Years on the Service Terms read in months', /We guarantee our workmanship for 120 months/.test(fillFor({ ...SOLE, cv: { ...SOLE.cv, guarantee_months: '', guarantee_years: '10' } }).text), '', '');

// ── Held, never guessed ──
const noEntity = fillFor({ ...SOLE, cv: { ...SOLE.cv, legal_entity: '' } });
chk('No limited company or sole trader answer: unclear', noEntity.unclear.some(u => u.key === 'legal_entity'), noEntity.unclear, 'legal_entity');
chk('...and neither identity line is published', !/a sole trader|is a limited company/.test(noEntity.text), '', '');
const noVat = fillFor({ ...SOLE, form: { ...SOLE.form, vat_registered: '' } });
chk('No VAT answer: unclear, no VAT line either way', noVat.unclear.some(u => u.key === 'vat_registered') && !/VAT/.test(noVat.text), noVat.unclear, 'vat_registered');
const limBare = fillFor({ ...LIMITED, cv: { ...LIMITED.cv, legal_name: '', company_number: '', registered_office: '' } });
chk('A limited company with no details: all three missing', ['company_number', 'legal_name', 'registered_office'].every(k => limBare.missing.includes(k)), limBare.missing, 'all three');
chk('A limited company with no details leaves residue the last check catches', limBare.residue.includes('[CV:'), limBare.residue, '[CV:');
const noPay = fillFor({ ...SOLE, form: { ...SOLE.form, payment_methods: [] } });
chk('No payment methods: missing, not assumed', noPay.missing.includes('payment_methods'), noPay.missing, 'payment_methods');
chk('Nobody\'s details: the page says what\'s missing', fillFor({}).missing.length > 5, fillFor({}).missing, 'many');
const oddAnswer = fillFor({ ...SOLE, answers: legalAnswers({ uses_subcontractors: 'sometimes', late_payment_interest: 'Yes' }) });
chk('An unclear subcontractors answer: reported, the line stays out', oddAnswer.unclear.some(u => u.key === 'uses_subcontractors') && !/subcontractors/.test(oddAnswer.text), oddAnswer.unclear, 'uses_subcontractors');
chk('A client who hasn\'t answered: yes on both, marked defaulted', (() => { const r = fillFor({ ...SOLE, answers: legalAnswers({}) }); return /trusted subcontractors/.test(r.text) && /charge interest/.test(r.text) && r.defaulted.includes('uses_subcontractors') && r.defaulted.includes('late_payment_interest'); })(), '', '');

// ── The fill itself ──
chk('A section runs over several paragraphs', fillTemplate('a\n\n{IF x = yes}b\n\nc{END IF}\n\nd', { x: 'yes' }).text === 'a\n\nb\n\nc\n\nd\n', fillTemplate('a\n\n{IF x = yes}b\n\nc{END IF}\n\nd', { x: 'yes' }).text, '');
chk('A blank value compares as none', fillTemplate('{IF x = none}none{END IF}', {}).text === 'none\n' && fillTemplate('{IF x != none}some{END IF}x', {}).text === 'x\n', '', '');
chk('Comparison ignores case', fillTemplate('{IF x = yes}y{END IF}', { x: 'YES' }).text === 'y\n', '', '');
chk('A token in a section that went out is not missing', fillTemplate('{IF x = yes}[CV: y]{END IF}z', { x: 'no' }).missing.length === 0, '', '');
chk('A whole bullet goes when its section does', fillTemplate('- a\n- {IF x = yes}b{END IF}\n- c', { x: 'no' }).text === '- a\n- c\n', fillTemplate('- a\n- {IF x = yes}b{END IF}\n- c', { x: 'no' }).text, '');
chk('A whole table row goes when its section does', fillTemplate('| a | b |\n{IF x = yes}| c | d |{END IF}\n| e | f |', { x: 'no' }).text === '| a | b |\n| e | f |\n', fillTemplate('| a | b |\n{IF x = yes}| c | d |{END IF}\n| e | f |', { x: 'no' }).text, '');
chk('A value with $ signs goes in literally', fillTemplate('[CV: x]', { x: '$1 and $&' }).text === '$1 and $&\n', fillTemplate('[CV: x]', { x: '$1 and $&' }).text, '');
let threw = '';
try { fillTemplate('{IF x = yes}a', {}); } catch (e) { threw = e.message; }
chk('An IF with no END IF stops with a template fault', /template fault/.test(threw), threw, 'fault');
threw = '';
try { fillTemplate('{IF x = yes}{IF y = no}a{END IF}{END IF}', {}); } catch (e) { threw = e.message; }
chk('An IF inside an IF stops with a template fault', /template fault/.test(threw), threw, 'fault');
for (const bad of ['[CV: x]', '{IF x = yes}', '{END IF}', '(IF x)', '(END IF)', 'Lorem ipsum']) {
  chk(`Residue: "${bad}" is caught`, residueIn(`text ${bad} more`).length > 0, residueIn(`text ${bad} more`), 'caught');
}
chk('Residue: a clean page has none', residueIn(limited.text).length === 0, residueIn(limited.text), []);
chk('Trade word: "electrical work" doesn\'t read "work work"', tradeWord('electrical work') === 'electrical' && tradeWord('landscaping') === 'landscaping', '', '');
chk('Payment list', paymentList(['A', 'B', 'C']) === 'a, b and c' && paymentList(['A']) === 'a' && paymentList([]) === '', '', '');

// ── Every niche has a trade word that reads in the opening line ──
const nicheDir = path.join(root, 'niche-library');
const stems = fs.readdirSync(nicheDir).filter(f => f.endsWith('.json') && !/client-facts|practices/.test(f));
const missingWord = stems.filter(f => !JSON.parse(fs.readFileSync(path.join(nicheDir, f), 'utf8')).trade_lower);
chk('All 28 niches have a trade word', stems.length === 28 && missingWord.length === 0, [stems.length, missingWord], '28');
chk('No niche reads "work work"', stems.every(f => !/work work/.test(`${tradeWord(JSON.parse(fs.readFileSync(path.join(nicheDir, f), 'utf8')).trade_lower)} work`)), '', '');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
