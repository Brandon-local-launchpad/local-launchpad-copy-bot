'use strict';
// Fixture: FAQ question research (F1). The prompt is built from the client's trade,
// towns and services, and the two manual Perplexity runs of 14 Oct 2026 parse
// cleanly: questions with their columns, the most asked list, ranges, rules, gaps.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'faq-research.js'));
const C = require(path.join(__dirname, 'data/faq-clients.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: FAQ question research ===\n');

const edens = C.byId['edens-edge'];
const kestrel = C.byId['kestrel-ridge'];
const read = c => R.parseFaqResearch(fs.readFileSync(c.researchFile, 'utf8'));

// ── Prompt ──
const prompt = R.buildFaqResearchPrompt({ niche: edens.niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, pages: edens.pages, cv: edens.cvThin });
chk('Prompt starts with the CORE prompt, not its header note', prompt.startsWith('You are researching the questions UK homeowners ask'), prompt.slice(0, 60), 'You are researching…');
chk('Prompt asks for Service and Town columns', /Service: one category or service name copied exactly from the CLIENT block/.test(prompt) && /Town: one town copied exactly/.test(prompt), '', 'both columns');
chk('CLIENT block: primary city Southampton', /Primary city: Southampton/.test(prompt), (prompt.match(/Primary city: .*/) || [''])[0], 'Primary city: Southampton');
chk('CLIENT block: the other 13 towns', /Other towns: Romsey, Winchester, .*Kings Worthy/.test(prompt), (prompt.match(/Other towns: .*/) || [''])[0], 'Romsey … Kings Worthy');
chk('CLIENT block: services in homeowner words (turf laying, not sod installation)', /turf laying/.test(prompt) && !/sod installation/i.test(prompt), '', 'turf laying only');
chk('CLIENT block: services the niche never names are left out (desert, pool)', !/desert|pool landscaping/i.test(prompt), '', 'absent');
chk('CLIENT block: no company name', !/Edens Edge/i.test(prompt), '', 'absent');

const kBlock = R.buildClientBlock({ niche: kestrel.niche, keyValueMap: kestrel.keyValueMap, serviceParentMap: {}, pages: kestrel.pages, cv: kestrel.cvRich });
chk('No GBP sheets: categories and services come from the page map (Kestrel Ridge)',
  /- Roofing contractor: roof repair, new roofs, flat roofs, leadwork, fascias and soffits, emergency roof repairs/.test(kBlock) && /- Chimney Services/.test(kBlock),
  kBlock.split('\n').filter(l => l.startsWith('- ')).join(' / '), 'Roofing contractor: roof repair, new roofs, …; Chimney Services');

// ── Everything known about the client goes into the research ──
const dossier = fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8');
const onboarding = [
  'Q: Full Name\nA: Test Person',
  'Q: Business/Primary Email\nA: test@example.org',
  'Q: Business Phone Number\nA: 023 0000 0000',
  'Q: How quickly can you typically get started on a new job? (think an average job)\nA: Usually the same week',
  'Q: Do you accept emergency appointments? If so is it 24/7 callouts or different?\nA: No',
].join('\n\n');
const full = R.buildClientBlock({
  niche: edens.niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, pages: edens.pages,
  cv: { ...edens.cvRich, customer_questions: ['Will you take the old patio away?', '', 'Will you take the old patio away?', 'Do I need to be in?'] },
  onboardingText: onboarding, dossiers: [{ location: 'Southampton', text: dossier }],
});
const sec = name => (full.split(`=== ${name}`)[1] || '').split('\n=== ')[0];
chk("Customers' own questions listed, blanks and repeats dropped", /- Will you take the old patio away\?\n- Do I need to be in\?/.test(sec("CUSTOMERS' OWN QUESTIONS")) && (sec("CUSTOMERS' OWN QUESTIONS").match(/old patio/g) || []).length === 1,
  sec("CUSTOMERS' OWN QUESTIONS"), 'two questions');
chk('Confirmed facts: real values in (free quotes, start time, insured)', /Free quotes: yes/.test(sec('CONFIRMED FACTS')) && /How soon work can start: same week/.test(sec('CONFIRMED FACTS')) && /Insured: yes/.test(sec('CONFIRMED FACTS')), sec('CONFIRMED FACTS'), 'free quotes, start, insured');
chk('Confirmed facts: stand-in (test) values left out', !/TEST/.test(sec('CONFIRMED FACTS')) && !/Deposit and payments/.test(sec('CONFIRMED FACTS')), sec('CONFIRMED FACTS'), 'no TEST values');
chk('Confirmed facts: no identity or contact values', !/023 0000|Edens Edge|Test Owner/.test(sec('CONFIRMED FACTS')), '', 'none');
chk('Onboarding answers: useful ones in', /How quickly can you typically get started on a new job\? \(think an average job\): Usually the same week/.test(sec("THE CLIENT'S ONBOARDING")) && /emergency appointments/.test(sec("THE CLIENT'S ONBOARDING")), sec("THE CLIENT'S ONBOARDING"), 'start time and emergency answers');
chk('Onboarding answers: name, email and phone left out', !/Test Person|example\.org|023 0000/.test(full), '', 'none in the prompt');
const local = sec('LOCAL KNOWLEDGE');
chk('Local knowledge: the Southampton dossier problems', /^Southampton:/m.test(local) && /Local problems: Mixed geology and locally slow-draining ground/.test(local), local.slice(0, 200), 'Southampton, local problems');
chk('Local knowledge: rules, with the places they apply to', /Rules and council: Southampton Tree Preservation Orders and conservation-area tree controls \(whole area\)/.test(local), '', 'TPO rule');
chk('Local knowledge: conservation areas named', /Conservation areas: Portswood Residents’ Gardens, Oakmount Triangle/.test(local), (local.match(/Conservation areas: .*/) || [''])[0], 'Portswood…, Oakmount Triangle…');
chk('Local knowledge: problems homeowners describe', /"The lawn stays soggy for days after rain\."/.test(local), '', 'soggy lawn');
chk('Local knowledge: no URLs or dossier IDs', !/https?:\/\/|SOU-[NISR]\d/.test(local), (local.match(/https?:\/\/\S+|SOU-[NISR]\d+/) || [''])[0], 'none');
const bare = R.buildClientBlock({ niche: edens.niche, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, pages: edens.pages, cv: {} });
chk('With nothing known yet, each section says so', /OWN QUESTIONS[^\n]*\nnone given/.test(bare) && /CONFIRMED FACTS[^\n]*\nnone confirmed yet/.test(bare) && /ONBOARDING ANSWERS[^\n]*\nnone/.test(bare) && /AREA RESEARCH ===\nnone yet/.test(bare), '', 'none given / none confirmed yet / none / none yet');
chk('The prompt tells Perplexity how to use the client block', /USING THE CLIENT BLOCK/.test(prompt) && /CUSTOMERS' OWN QUESTIONS are already known: do not return them/.test(prompt), '', 'present');

// ── Parsing the manual runs ──
const e = read(edens);
const k = read(kestrel);
chk('Edens Edge run: 40 questions', e.questions.length === 40, e.questions.length, 40);
chk('Roofer run: 40 questions', k.questions.length === 40, k.questions.length, 40);
chk('Both runs parse without warnings', !e.warnings.length && !k.warnings.length, [...e.warnings, ...k.warnings].join('; '), 'none');
chk('Most asked lists read (10 each, in order)', e.top.join(',') === 'Q-1,Q-3,Q-10,Q-16,Q-17,Q-20,Q-21,Q-25,Q-28,Q-34' && k.top.length === 10 && k.top[1] === 'Q-6',
  e.top.join(',') + ' | ' + k.top.join(','), 'Q-1,Q-3,Q-10,… | Q-1,Q-6,…');
const q3 = e.questions.find(q => q.id === 'Q-3');
chk('Q-3 columns: Price, Homepage, not local, needs a fact, rank 2',
  q3.doubt === 'Price' && q3.page === 'Homepage' && !q3.local && q3.needsFact && q3.rank === 2,
  JSON.stringify({ d: q3.doubt, p: q3.page, l: q3.local, n: q3.needsFact, r: q3.rank }), 'Price/Homepage/N/Y/2');
chk('Q-3 seen count: Reddit x6, MoneySavingExpert x4, Citizens Advice, RHS = 12', q3.seenCount === 12, q3.seenCount, 12);
chk('Q-3 source URL kept', q3.url === 'https://www.citizensadvice.org.uk/consumer/getting-home-improvements-done/before-you-get-building-work-done/', q3.url, 'citizensadvice URL');
const k3 = k.questions.find(q => q.id === 'Q-3');
chk('Markdown link URLs and (dated: …) read (roofer Q-3)', k3.url.startsWith('https://www.reddit.com/r/DIYUK/comments/17v52uj') && k3.dated === 'November 2023', `${k3.url} ${k3.dated}`, 'reddit URL, November 2023');
const k25 = k.questions.find(q => q.id === 'Q-25');
chk('Seen text after ";" is not counted (roofer Q-25: local roofer guides x4)', k25.seenCount === 4, k25.seenCount, 4);
chk('Local Location questions read (Edens Edge Q-37)', (() => { const q = e.questions.find(x => x.id === 'Q-37'); return q.local && q.page === 'Location'; })(), '', 'local Location');
chk('Ranges, rules and gaps (Edens Edge: 10, 12, 12)', e.ranges.length === 10 && e.rules.length === 12 && e.gaps.length === 12, `${e.ranges.length}, ${e.rules.length}, ${e.gaps.length}`, '10, 12, 12');
chk('A range keeps its job, figures, area and date', e.ranges[2].job === 'Patio installation' && /£55–£150/.test(e.ranges[2].range) && e.ranges[2].area === 'UK average' && e.ranges[2].dated === 'September 2024',
  JSON.stringify(e.ranges[2]), 'Patio installation, £55–£150…, UK average, September 2024');
chk('Seen counts: "x" multipliers summed', R.seenCount('Reddit x6, Mumsnet x4, Checkatrade x2') === 12 && R.seenCount('RHS, Checkatrade') === 2, '', '12 and 2');

// ── v4 lines (Service and Town columns) ──
const v4 = R.parseQuestionLine('- [Q-7] | "Do I need permission for a dropped kerb in Romsey?" | Doubt: Process | Page: Location | Service: driveways | Local: Y | Town: Romsey | Needs client fact: N | Seen: Reddit x2, council | [https://example.org/a](https://example.org/a)');
chk('v4 line: Service and Town read', v4.service === 'driveways' && v4.town === 'Romsey' && v4.local && !v4.needsFact && v4.seenCount === 3 && v4.url === 'https://example.org/a',
  JSON.stringify(v4), 'driveways, Romsey, local, 3, URL');
const v4g = R.parseQuestionLine('- [Q-8] | "Are you insured?" | Doubt: Trust | Page: Homepage | Service: General | Local: N | Town: - | Needs client fact: Y | Seen: Reddit | https://example.org/b');
chk('v4 line: Service General and Town - read as blank', v4g.service === '' && v4g.town === '', JSON.stringify(v4g), 'blank, blank');

// ── Validation ──
chk('A run with 40 questions is valid', R.validateFaqResearch(e).valid, R.validateFaqResearch(e).error, 'valid');
const short = R.parseFaqResearch('## 1. QUESTIONS\n- [Q-1] | "How much?" | Doubt: Price | Page: Homepage | Local: N | Needs client fact: Y | Seen: Reddit | https://x.org\n## 2. RANGES FOUND\n');
chk('A run with 1 question is refused, with the reason', !R.validateFaqResearch(short).valid && /Only 1 questions/.test(R.validateFaqResearch(short).error), R.validateFaqResearch(short).error, 'Only 1 questions…');
const none = R.parseFaqResearch('Sorry, I could not find anything.');
chk('A reply with no questions section is refused and warned', !R.validateFaqResearch(none).valid && none.warnings.some(w => /No "## 1. QUESTIONS"/.test(w)), none.warnings.join('; '), 'refused, warned');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
