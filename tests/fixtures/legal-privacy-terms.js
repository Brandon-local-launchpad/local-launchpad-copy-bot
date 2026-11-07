'use strict';
// Fixture: legal pages, Stage 4. The Privacy Policy and Website Terms of Use templates, filled
// for a sole trader and a limited company, with the review's fixes. No database, no network, no model.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const { fillTemplate, templateKeys, checkTemplate } = require(path.join(root, 'legal/fill.js'));
const { resolveValues, knownKeys, withArticle, tradeWord } = require(path.join(root, 'legal/values.js'));
const { legalAnswers } = require(path.join(root, 'legal/onboarding.js'));
const P = require(path.join(root, 'legal/pages.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want)); fail++; }
};
console.log('\n=== FIXTURE: legal pages, Stage 4: Privacy Policy and Website Terms ===\n');

const privacy = P.masterTemplate('privacy-policy');
const website = P.masterTemplate('website-terms');

const SOLE = {
  cv: { company_name: 'Edens Edge Landscaping', phone: '07580 412717', email: 'hello@example.com', legal_entity: 'sole_trader', live_domain: 'edensedge-landscaping.co.uk', google_ads: 'yes', meta_pixel: 'yes', sms_tool: 'yes', ico_number: 'ZA123456' },
  form: { full_name: 'Jane Smith', business_address: '1 High Street, Southampton', primary_town: 'Southampton', vat_registered: 'No', deposit: 'No', payment_methods: ['Card'] },
  answers: legalAnswers({ uses_subcontractors: 'Yes', late_payment_interest: 'Yes' }),
  tradeLower: 'landscaping', lastUpdated: '7 November 2026',
};
const LIMITED = {
  cv: { company_name: 'Kestrel Ridge Roofing', phone: '01234 567890', email: 'office@example.com', legal_entity: 'limited', legal_name: 'Kestrel Ridge Holdings Ltd', company_number: '12345678', registered_office: '2 Mill Lane, Reading', jurisdiction: 'Scotland', vat_number: 'GB123456789', live_domain: 'https://www.kestrelridge.example/', google_ads: 'no', meta_pixel: 'no', sms_tool: 'no' },
  form: { full_name: 'Sam Hill', business_address: '3 Yard Road, Reading', primary_town: 'Reading', vat_registered: 'Yes', deposit: 'No', payment_methods: ['Card'] },
  answers: legalAnswers({ uses_subcontractors: 'No', late_payment_interest: 'No' }),
  tradeLower: 'roofing', lastUpdated: '7 November 2026',
};
const fill = (template, input) => { const r = resolveValues(input); return { ...r, ...fillTemplate(template, r.values) }; };
const pS = fill(privacy, SOLE), pL = fill(privacy, LIMITED), wS = fill(website, SOLE), wL = fill(website, LIMITED);

// ── The templates ──
for (const [name, t] of [['Privacy Policy', privacy], ['Website Terms', website]]) {
  chk(`${name}: no template faults`, checkTemplate(t).length === 0, checkTemplate(t), []);
  chk(`${name}: every key has a value source`, templateKeys(t).every(k => knownKeys().includes(k)), templateKeys(t).filter(k => !knownKeys().includes(k)), []);
  chk(`${name}: none of the old key names`, !/business_name|registered_address|company_jurisdiction|pl_insurance_amount|business_type|owner_name|analytics_consent/.test(t), '', '');
}
chk('Privacy: sections 1 to 14 in order', (privacy.match(/^## \d+\. /gm) || []).every((h, i) => h === `## ${i + 1}. `) && (privacy.match(/^## \d+\. /gm) || []).length === 14, '', '14');
chk('Website: sections 1 to 11 in order', (website.match(/^## \d+\. /gm) || []).every((h, i) => h === `## ${i + 1}. `) && (website.match(/^## \d+\. /gm) || []).length === 11, '', '11');
chk('The three pages have the agreed slugs', P.PAGES.map(p => p.slug).sort().join() === '/privacy-policy,/service-terms,/terms', P.PAGES.map(p => p.slug), 'three');

// ── Nothing left, nothing missing ──
for (const [name, r] of [['Privacy sole', pS], ['Privacy limited', pL], ['Website sole', wS], ['Website limited', wL]]) {
  chk(`${name}: nothing missing or unclear, no leftovers`, r.missing.length === 0 && r.unclear.length === 0 && r.residue.length === 0, [r.missing, r.unclear, r.residue], 'empty');
  chk(`${name}: no empty bullets, double spaces or three blank lines`, !/^-\s*$/m.test(r.text) && !/[^ ] {2,}[^ ]/.test(r.text) && !/\n{3,}/.test(r.text), '', '');
  chk(`${name}: no space before a full stop`, !/ \./.test(r.text.replace(/ico\.org\.uk/, '')), '', '');
}

// ── The review's fixes ──
const rowOf = (text, start) => text.split('\n').find(l => l.startsWith(`| ${start}`)) || '';
chk('Section 4: analytics legal basis is the fixed text', rowOf(pS.text, 'Measure how the website is used').endsWith('| Your consent, given through the cookie banner. |') && !/Legitimate interests/.test(rowOf(pS.text, 'Measure how')), rowOf(pS.text, 'Measure how'), 'consent');
chk('Section 4: no condition is left around it', !/analytics_consent/.test(privacy), '', '');
chk('Section 7: Google Ads and Meta rows show on yes, as whole rows', /^\| Google Ads \| Measures[^\n]*\| Yes \|$/m.test(pS.text) && /^\| Meta Pixel \| Measures[^\n]*\| Yes \|$/m.test(pS.text), '', 'rows');
chk('Section 7: both rows go on no, with nothing left behind', !/^\| Google Ads/m.test(pL.text) && !/^\| Meta Pixel/m.test(pL.text), '', 'gone');
const table7 = text => text.match(/\| Cookie or tool[\s\S]*?\n\n/)[0].trim().split('\n');
chk('Section 7: the table has no gap in it, with the rows or without', table7(pS.text).every(l => l.startsWith('|')) && table7(pS.text).length === 9 && table7(pL.text).every(l => l.startsWith('|')) && table7(pL.text).length === 7, [table7(pS.text).length, table7(pL.text).length], '9 and 7');
chk('Section 7: no IF inside a table cell', !privacy.split('\n').some(l => /^\|/.test(l) && /\{IF|\{END IF/.test(l)), '', '');
chk('Section 7: Google Analytics needs consent', /^\| Google Analytics \|.*\| Yes \|$/m.test(pS.text), rowOf(pS.text, 'Google Analytics'), 'Yes');
chk('Section 8: analytics retention is 14 months', rowOf(pS.text, 'Website analytics') === '| Website analytics | Up to 14 months |', rowOf(pS.text, 'Website analytics'), '14 months');

// ── Brandon's decisions ──
chk('Section 6: the subcontractors bullet shows on yes', /Subcontractors who help with your job/.test(pS.text), '', '');
chk('Section 6: the subcontractors bullet goes on no', !/ubcontractors/.test(pL.text), '', '');
chk('Section 6: Google Ads named on yes', /Google, for Google Business Profile, Maps, Analytics and Google Ads\./.test(pS.text), '', '');
chk('Section 6: no Google Ads on no, and the sentence still ends cleanly', /Google, for Google Business Profile, Maps, Analytics\./.test(pL.text), '', '');
chk('Section 6: the text messaging bullet follows sms_tool', /Our text messaging provider/.test(pS.text) && !/text messaging provider/.test(pL.text), '', '');
chk('Privacy: sole trader runs under the form\'s full name and address', /The business is run by Jane Smith as a sole trader, at 1 High Street, Southampton\./.test(pS.text), '', '');
chk('Privacy: limited line names the registered company', /We are Kestrel Ridge Holdings Ltd, a limited company, company number 12345678, registered office 2 Mill Lane, Reading\./.test(pL.text), '', '');
chk('Privacy: no identity line from the other kind of business', !/limited company/.test(pS.text) && !/sole trader/.test(pL.text), '', '');
chk('Privacy: ICO number only when there is one', /registration number ZA123456/.test(pS.text) && !/Commissioner's Office, registration/.test(pL.text), '', '');
chk('Privacy: the ICO complaint line stays either way', /complain to the Information Commissioner's Office/.test(pL.text), '', '');
chk('Privacy: section 14 uses the form address', /## 14\. Contact\n\nKestrel Ridge Roofing\n\n3 Yard Road, Reading\n\nPhone: 01234 567890\n\nEmail: office@example\.com/.test(pL.text), pL.text.slice(-120), 'contact');
chk('Website: sole trader line', /Edens Edge Landscaping is the trading name of Jane Smith, a sole trader\. Our business address is 1 High Street, Southampton\./.test(wS.text), '', '');
chk('Website: limited line uses legal_name and jurisdiction', /Kestrel Ridge Holdings Ltd is a limited company registered in Scotland under company number 12345678\. Our registered office is 2 Mill Lane, Reading\./.test(wL.text), '', '');
chk('Website: VAT number only when registered', /Our VAT number is GB123456789\./.test(wL.text) && !/VAT/.test(wS.text), '', '');
chk('Website: VAT registered with no number holds', fill(website, { ...LIMITED, cv: { ...LIMITED.cv, vat_number: '' } }).missing.includes('vat_number'), '', 'vat_number');
chk('Website: the address comes from the live domain', /This website, https:\/\/edensedge-landscaping\.co\.uk, is operated by/.test(wS.text) && /This website, https:\/\/www\.kestrelridge\.example, is operated by/.test(wL.text), '', '');
chk('Website: no live domain holds, never a staging address', fill(website, { ...SOLE, cv: { ...SOLE.cv, live_domain: '' } }).missing.includes('website_url'), '', 'website_url');
chk('Privacy: no base town holds', fill(privacy, { ...SOLE, form: { ...SOLE.form, primary_town: '' } }).missing.includes('town'), '', 'town');

// ── The build answers ──
for (const key of ['google_ads', 'meta_pixel', 'sms_tool']) {
  chk(`${key}: no answer is unclear, never assumed`, resolveValues({ ...SOLE, cv: { ...SOLE.cv, [key]: '' } }).unclear.some(u => u.key === key), '', key);
  chk(`${key}: a typed answer that isn't yes or no is unclear`, resolveValues({ ...SOLE, cv: { ...SOLE.cv, [key]: 'maybe' } }).unclear.some(u => u.key === key), '', key);
}

// ── The first line reads in every niche ──
chk('a or an', withArticle('roofing') === 'a roofing' && withArticle('air conditioning') === 'an air conditioning' && withArticle('electrical') === 'an electrical', '', '');
chk('The first line reads', /Kestrel Ridge Roofing is a roofing business based in Reading, United Kingdom\./.test(pL.text), '', '');
const dir = path.join(root, 'niche-library');
const stems = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !/client-facts|practices/.test(f));
const lines = stems.map(f => `${withArticle(tradeWord(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).trade_lower))} business`);
chk('No niche reads "work business" or "a a..."', lines.length === 28 && lines.every(l => /^(a [^aeiou]|an [aeiou])/i.test(l) && !/work business/.test(l)), lines, 'all read');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
