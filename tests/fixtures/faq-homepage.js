'use strict';
// Fixture: the homepage uses the sorted FAQ questions (F3). Research questions take
// Q7 and any fallback slot (Q2 to Q4 when the client value is missing); the fixed
// questions stay. Q7 prefers a doubt the fixed questions don't cover; a fallback
// slot takes a research question only with its own doubt or one still uncovered.
//
// EXPECTED LISTS: DRAFT, 14 Oct 2026. Claude drafted them from the two manual
// research runs, the real tidy replies and the rules (Brandon's instruction);
// they are waiting for Brandon's approval. Kestrel Ridge uses the Bournemouth roofer
// run: whether that run is Kestrel Ridge's is not confirmed yet.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const R = require(path.join(root, 'faq-research.js'));
const S = require(path.join(root, 'faq-sort.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const { validateV20, buildValidationContext } = require(path.join(root, 'validate-v20.js'));
const C = require(path.join(__dirname, 'data/faq-clients.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: homepage FAQ from the sorted questions (expected lists: DRAFT) ===\n');

const EXPECTED = {
  'edens-edge thin': [
    'Q1 How much does landscaping cost in Southampton?',
    'Q2 Is it better to lay turf or sow grass seed?',
    'Q3 What happens if something isn\'t right after the job?',
    'Q4 How soon can you start?',
    'Q5 Is the quote free and no obligation?',
    'Q6 Which areas do you cover?',
    'Q7 [Q-37] How do I find out if my tree has a preservation order on it?',
    'Q8 Why does water sit on my patio or lawn after rain?',
  ],
  'edens-edge rich': [
    'Q1 How much does landscaping cost in Southampton?',
    'Q2 Are you insured?',
    'Q3 What happens if something isn\'t right after the job?',
    'Q4 How soon can you start?',
    'Q5 Is the quote free and no obligation?',
    'Q6 Which areas do you cover?',
    'Q7 [Q-4] How much deposit do you take and when are stage payments due?',
    'Q8 Why does water sit on my patio or lawn after rain?',
  ],
  'kestrel-ridge thin': [
    'Q1 How much does roofing cost in Bournemouth?',
    'Q2 Are you insured?',
    'Q3 What happens if the roof leaks again after a repair?',
    'Q4 How long does a new roof last?',
    'Q5 Is the quote free and no obligation?',
    'Q6 Which areas do you cover?',
    'Q7 [Q-23] Is my home in a conservation area and can I change the roof tiles?',
    'Q8 Why are my gutters overflowing when it rains?',
  ],
  'kestrel-ridge rich': [
    'Q1 How much does roofing cost in Bournemouth?',
    'Q2 Are you insured?',
    'Q3 Do you guarantee your work?',
    'Q4 How soon can you start?',
    'Q5 Are the inspection and quote free?',
    'Q6 Which areas do you cover?',
    'Q7 [Q-3] What is included in your roofing quote?',
    'Q8 Why are my gutters overflowing when it rains?',
    'Q9 Do I need planning permission for a new roof?',
  ],
};

async function tidied(c) {
  const research = R.parseFaqResearch(fs.readFileSync(c.researchFile, 'utf8'));
  const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'faq-sort-replies', `${c.id}.json`), 'utf8'));
  let i = 0;
  const tidy = await S.runTidy({ research, niche: c.niche, keyValueMap: c.keyValueMap, serviceParentMap: c.serviceParentMap, pages: c.pages, cv: c.cvThin, callModel: async () => saved.replies[i++] });
  return tidy.questions.map(q => ({ ...q, approved: !q.wording_errors.length }));
}

function decide(c, qs, state, research = true) {
  const cv = state === 'thin' ? c.cvThin : c.cvRich;
  const pages = state === 'thin' && c.thinPages ? c.thinPages : c.pages;
  const keyValueMap = state === 'thin' && c.thinKeyValueMap ? c.thinKeyValueMap : c.keyValueMap;
  const a = S.assignQuestions({ questions: qs, cv, pages, keyValueMap, serviceParentMap: c.serviceParentMap, niche: c.niche });
  const faqResearch = research ? S.homepageQuestions(a, c.niche) : [];
  return { cv, faqResearch, result: computeDecisions({ cv, niche: c.niche, pages, keyValueMap, serviceParentMap: c.serviceParentMap, v20TestMode: true, allocationData: null, faqResearch }) };
}
const lines = D => D.d11_faq.map(q => `${q.slot} ${q.research_id ? `[${q.research_id}] ` : ''}${q.question}`);

(async () => {
  for (const c of C.list) {
    const qs = await tidied(c);
    for (const state of ['thin', 'rich']) {
      const name = `${c.id} ${state}`;
      const { result } = decide(c, qs, state);
      if (result.gates.length) { chk(`${name}: gates pass`, false, result.gates.map(g => g.code).join(', '), 'none'); continue; }
      const got = lines(result.decisions);
      chk(`${name}: homepage FAQ matches the draft list`, JSON.stringify(got) === JSON.stringify(EXPECTED[name]), '\n    ' + got.join('\n    '), '\n    ' + EXPECTED[name].join('\n    '));
      const doubts = new Set(result.decisions.d11_faq.map(q => q.doubt));
      chk(`${name}: all five doubts covered`, ['Price', 'Trust', 'Fit', 'Process', 'Timing'].every(d => doubts.has(d)), [...doubts].join(', '), 'all five');
      const texts = result.decisions.d11_faq.map(q => S.normWording(q.question));
      chk(`${name}: no question twice`, texts.length === new Set(texts).size, '', 'unique');
    }
  }

  const edens = C.byId['edens-edge'];
  const kestrel = C.byId['kestrel-ridge'];
  const eQs = await tidied(edens);

  // Without research the homepage is exactly as before
  const plain = computeDecisions({ cv: edens.cvRich, niche: edens.niche, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, v20TestMode: true, allocationData: null });
  const noRes = decide(edens, eQs, 'rich', false).result;
  chk('No research: the niche questions, as before (Q7 = faq_A)', JSON.stringify(lines(plain.decisions)) === JSON.stringify(lines(noRes.decisions)) && /How long does a garden landscaping project take/.test(plain.decisions.d11_faq.find(q => q.slot === 'Q7').question),
    lines(noRes.decisions).join(' | '), 'faq_A at Q7');

  // The research question reaches the model with its brief
  const rich = decide(edens, eQs, 'rich');
  const block = rich.result.decisionsBlock;
  chk('DECISIONS block: Q7 is the research question, with its answer brief',
    /Q7: How much deposit do you take and when are stage payments due\? \[Trust\]\n    → Answer from \[CV: deposit_terms\] only/.test(block), (block.match(/Q7:.*\n.*/) || [''])[0], 'Q7 … → Answer from [CV: deposit_terms] only');
  chk('MODEL FIELDS: the research question is a faq_question', block.includes('- faq_question: How much deposit do you take and when are stage payments due? | faq_answer'), '', 'listed');

  // Slot rules
  const fakeQ = (id, doubt) => ({ research_id: id, question: `Research question ${id}?`, doubt, answer_brief: 'brief' });
  const thinCv = { ...edens.cvThin, start_time: '' }; // Q2 and Q4 both fall back
  const slots = computeDecisions({ cv: thinCv, niche: edens.niche, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, v20TestMode: true, allocationData: null,
    faqResearch: [fakeQ('A', 'Price'), fakeQ('B', 'Timing'), fakeQ('C', 'Trust'), fakeQ('D', 'Fit')] }).decisions.d11_faq;
  const at = s => (slots.find(q => q.slot === s) || {}).research_id || (slots.find(q => q.slot === s) || {}).question;
  chk('Q7 takes a doubt the fixed questions leave uncovered (Timing, with Q4 falling back)', at('Q7') === 'B', at('Q7'), 'B (Timing)');
  chk('A fallback slot prefers its own doubt (Q2 Trust → C)', at('Q2') === 'C', at('Q2'), 'C (Trust)');
  chk('Q4: no research question left with Timing or an uncovered doubt, so it keeps the niche fallback', at('Q4') === 'Is it better to lay turf or sow grass seed?', at('Q4'), 'faq_C');
  chk('Research questions never replace a fixed question (Q1, Q3, Q5, Q6 unchanged)',
    ['Q1', 'Q3', 'Q5', 'Q6'].every(s => !slots.find(q => q.slot === s).research_id), '', 'fixed');
  const one = computeDecisions({ cv: thinCv, niche: edens.niche, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, v20TestMode: true, allocationData: null,
    faqResearch: [fakeQ('A', 'Price')] }).decisions.d11_faq;
  chk('With one research question, the remaining fallbacks use the niche questions in order',
    one.find(q => q.slot === 'Q7').research_id === 'A' && one.find(q => q.slot === 'Q2').question === 'Is it better to lay turf or sow grass seed?' && one.find(q => q.slot === 'Q4').question === 'What is the best time of year to landscape a garden?',
    lines({ d11_faq: one }).join(' | '), 'Q7 A, Q2 faq_C, Q4 faq_D');

  // Validator: deposit and waste carrier claims need their values
  const D = rich.result.decisions;
  const claimText = 'We take a small deposit and we are a registered waste carrier, so the waste is handled properly.';
  const record = { faq_items: D.d11_faq.map((q, i) => ({ faq_question: q.question, faq_answer: i === 6 ? claimText : 'An answer.' })) };
  const n5For = cv => validateV20(record, buildValidationContext({ cv, niche: edens.niche, decisions: D, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap }))
    .filter(i => i.check === 'N5').map(i => i.message);
  let n5Thin, n5Rich;
  try {
    n5Thin = n5For({ ...edens.cvRich, deposit_terms: '', waste_carrier_registered: '' });
    n5Rich = n5For(edens.cvRich);
  } catch (e) { n5Thin = n5Rich = [`validator error: ${e.message}`]; }
  chk('N5: deposit and waste carrier mentioned without the values are BLOCKs',
    n5Thin.some(m => /deposit_terms is blank/.test(m)) && n5Thin.some(m => /Waste carrier registration/.test(m)), n5Thin.join(' | '), 'both');
  chk('N5: with the values supplied, neither is raised', !n5Rich.some(m => /deposit|Waste carrier/i.test(m)), n5Rich.join(' | '), 'neither');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
