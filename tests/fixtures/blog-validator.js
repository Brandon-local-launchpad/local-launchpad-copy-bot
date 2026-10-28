'use strict';
// Fixture: the blog validator (stage 5, 28 Oct 2026). The spec's Appendix B sample post passes
// with no BLOCK; one broken copy per BLOCK check fails on the right check (a price not in the
// list, "Part P", a third primary link, a reused FAQ question, a safety post with a DIY step);
// the FLAG rules on their own copies; the rubric items for a post. No API call.
const path = require('path');
const root = path.join(__dirname, '../..');
const SAMPLE = require(path.join(__dirname, 'data/blog-sample-appendix-b.js'));
const { validateBlog, blogValidationContext } = require(path.join(root, 'validate-blog.js'));
const { buildValidationContext } = require(path.join(root, 'validate-v20.js'));
const PT = require(path.join(root, 'page-types/blog.js'));
const { pageTypeOf } = require(path.join(root, 'page-types'));
const QR = require(path.join(root, 'quality-review.js'));
const { buildBlogReaderView } = require(path.join(root, 'blog/reader.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: blog validator (B-N1 to B-N9) ===\n');

const niche = require(path.join(root, 'niche-library/landscaper.json'));
const clone = o => JSON.parse(JSON.stringify(o));
const contextFor = (D = SAMPLE.decisions, cv = SAMPLE.cv) => blogValidationContext(buildValidationContext({ cv, niche, decisions: { ...D, d1_years_trading: null, allocated: { neighbourhoods: [], symptoms: {} } }, keyValueMap: { biz_area_1: 'Southampton' }, serviceParentMap: {} }), D);
const run = (record, D, cv) => validateBlog(record, contextFor(D, cv));
const blocks = issues => issues.filter(i => i.type === 'BLOCK');
const codes = issues => [...new Set(issues.map(i => `${i.type} ${i.check}`))].join(', ');
const by = (issues, check) => issues.filter(i => i.check === check);

// ── The sample passes ──
const base = run(SAMPLE.record, SAMPLE.decisions, SAMPLE.cv);
chk('The spec\'s Appendix B sample post passes with no BLOCK', !blocks(base).length, blocks(base).map(i => `${i.check} ${i.field}: ${i.message}`).join(' | '), 'no BLOCK');
chk('The sample\'s flags are the shared soft checks only, none of the blog rules (the £160 fee is a fact row, the primary link is in section 1 and the closing, the cost guide link once)', !base.some(i => /^B-N|^CLOSING|^DATE|^LINK-ONCE|^ANSWER-OPEN/.test(i.check)), codes(base), 'no B-N* issue');
chk('The page type registry validates a blog record through validate-blog', pageTypeOf(SAMPLE.record).validate === validateBlog || JSON.stringify(pageTypeOf(SAMPLE.record).validate(SAMPLE.record, contextFor())) === JSON.stringify(base), '', '');

// ── One broken copy per BLOCK check ──
const price = clone(SAMPLE.record); price.sections[1].body += ' A typical front garden costs £2,500 to pave.';
const priceIssues = run(price, SAMPLE.decisions, SAMPLE.cv);
chk('B-N3: a price not in FACTS ALLOWED ("£2,500") is a BLOCK on its field; the £160 fee from the rule row is not', by(priceIssues, 'B-N3').length === 1 && by(priceIssues, 'B-N3')[0].type === 'BLOCK' && /£2,500/.test(by(priceIssues, 'B-N3')[0].message) && /section|What Counts/.test(by(priceIssues, 'B-N3')[0].field), codes(priceIssues), 'BLOCK B-N3');
const partP = clone(SAMPLE.record); partP.sections[0].body = partP.sections[0].body.replace('The rule covers the paving only.', 'The rule, Part P of the Building Regulations, covers the paving only.');
const partIssues = run(partP, SAMPLE.decisions, SAMPLE.cv);
chk('B-N4: "Part P" (and "Building Regulations") is a BLOCK', by(partIssues, 'B-N4').some(i => i.type === 'BLOCK' && /Part P|Building Regulations/.test(i.message)), codes(partIssues), 'BLOCK B-N4');
const regName = clone(SAMPLE.record); regName.sections[3].body += ' Permitted Development Rights do not apply inside one.';
chk('B-N4: a regulation named without a number ("Permitted Development Rights") is a BLOCK too', by(run(regName, SAMPLE.decisions, SAMPLE.cv), 'B-N4').length === 1, '', '');
const third = clone(SAMPLE.record); third.sections[2].body += ' Our [paving team](/patios-paving/) handles the kerb application alongside the drive.';
const thirdIssues = run(third, SAMPLE.decisions, SAMPLE.cv);
chk('B-N2: a third primary link is a BLOCK on the field that carries the extra one', by(thirdIssues, 'B-N2').length === 1 && by(thirdIssues, 'B-N2')[0].type === 'BLOCK' && /3 times/.test(by(thirdIssues, 'B-N2')[0].message) && /Dropped Kerb/.test(by(thirdIssues, 'B-N2')[0].field), codes(thirdIssues) + ' ' + JSON.stringify(by(thirdIssues, 'B-N2').map(i => i.field)), 'BLOCK B-N2');
const noLink = clone(SAMPLE.record); noLink.blog_closing = 'Planning a new front drive? See what goes into the price in our [Southampton patio cost guide](/guides/patio-cost-southampton/) before you book.';
const noLinkIssues = run(noLink, SAMPLE.decisions, SAMPLE.cv);
chk('B-N2: a closing with no primary link is a BLOCK on the closing', by(noLinkIssues, 'B-N2').some(i => i.type === 'BLOCK' && i.field === 'blog_closing' && /never links/.test(i.message)), codes(noLinkIssues), 'BLOCK B-N2 blog_closing');
const noEarly = clone(SAMPLE.record); noEarly.sections[0].body = noEarly.sections[0].body.replace('[patio and paving work](/patios-paving/)', 'patio and paving work');
chk('B-N2: neither section 1 nor 2 linking the primary page is a BLOCK on section 1', by(run(noEarly, SAMPLE.decisions, SAMPLE.cv), 'B-N2').some(i => i.type === 'BLOCK' && /Neither section 1 nor section 2/.test(i.message)), '', '');
const twice = clone(SAMPLE.record); twice.faq_items[0].faq_answer += ' See the [patio cost guide](/guides/patio-cost-southampton/) for the figures.';
chk('LINK-ONCE: the cost guide link twice is a FLAG, not a BLOCK', by(run(twice, SAMPLE.decisions, SAMPLE.cv), 'LINK-ONCE').some(i => i.type === 'FLAG') && !blocks(run(twice, SAMPLE.decisions, SAMPLE.cv)).length, '', '');
const usedD = { ...SAMPLE.decisions, usedQuestions: ['Can I drive over the kerb without one?', 'How much does a patio cost?'] };
const usedIssues = run(SAMPLE.record, usedD, SAMPLE.cv);
chk('B-N7: an FAQ question a page or another post uses is a BLOCK on faq_items, matched on the words, not the punctuation', by(usedIssues, 'B-N7').length === 1 && by(usedIssues, 'B-N7')[0].type === 'BLOCK' && /drive over the kerb/.test(by(usedIssues, 'B-N7')[0].message), codes(usedIssues), 'BLOCK B-N7');
const safetyD = { ...SAMPLE.decisions, safety: { on: true, topics: ['electrics'] } };
const diy = clone(SAMPLE.record); diy.sections[2].body += ' You can disconnect the old driveway lighting yourself before the slabs come up.';
const diyIssues = run(diy, safetyD, SAMPLE.cv);
chk('B-N6: the safety switch on and "you can disconnect … yourself" is a BLOCK; the same sentence with the switch off is not', by(diyIssues, 'B-N6').some(i => i.type === 'BLOCK') && !by(run(diy, SAMPLE.decisions, SAMPLE.cv), 'B-N6').length, codes(diyIssues), 'BLOCK B-N6');
const diy2 = clone(SAMPLE.record); diy2.faq_items[1].faq_answer = 'Rewire the socket first, then lift the slabs. ' + diy2.faq_items[1].faq_answer;
chk('B-N6: an imperative ("Rewire the socket first") is a BLOCK with the switch on', by(run(diy2, safetyD, SAMPLE.cv), 'B-N6').length === 1, '', '');
const opens = clone(SAMPLE.record); opens.blog_answer = '[CV: company_name] gets asked this every week. ' + opens.blog_answer;
chk('ANSWER-OPEN: the answer opening on the company name is a BLOCK', by(run(opens, SAMPLE.decisions, SAMPLE.cv), 'ANSWER-OPEN').some(i => i.type === 'BLOCK'), '', '');
const phone = clone(SAMPLE.record); phone.blog_closing = 'Call [CV: phone] to [book a quote](/patios-paving/) for your patio and paving work, or read our Southampton patio cost guide first.';
const tellUs = clone(SAMPLE.record); tellUs.blog_closing = 'Tell us about your front garden and [book a quote](/patios-paving/) for the paving work.';
chk('CLOSING: the phone number in the closing is a BLOCK; opening "Tell us" is a BLOCK', by(run(phone, SAMPLE.decisions, SAMPLE.cv), 'CLOSING').some(i => i.type === 'BLOCK' && /phone/.test(i.message)) && by(run(tellUs, SAMPLE.decisions, SAMPLE.cv), 'CLOSING').some(i => i.type === 'BLOCK' && /Tell us/.test(i.message)), '', '');

// ── The FLAG rules ──
const long = clone(SAMPLE.record); long.blog_answer = 'Usually not, if the new surface lets water drain through to the ground below it rather than running straight off into the road outside. ' + long.blog_answer.replace(/^Usually not, if the new surface lets water drain through\. /, '');
const longIssues = run(long, SAMPLE.decisions, SAMPLE.cv);
chk('B-N1: a first sentence over 20 words in blog_answer is a FLAG (retried); a FAQ first sentence over 15 is the shared N24', by(longIssues, 'B-N1').some(i => i.type === 'FLAG' && i.retry) && (() => { const f = clone(SAMPLE.record); f.faq_items[2].faq_answer = 'The council can ask for the paving to be changed or taken out again at your own cost once they notice it. ' + f.faq_items[2].faq_answer; return by(run(f, SAMPLE.decisions, SAMPLE.cv), 'N24').length === 1; })(), codes(longIssues), 'FLAG B-N1');
const story = clone(SAMPLE.record); story.sections[1].body += ' Imagine a couple called the Patels who paved their whole frontage last spring.';
const storyIssues = run(story, SAMPLE.decisions, SAMPLE.cv);
chk('B-N5: "Imagine" is a FLAG; DATE: "last spring" is not stale but "this year" and "in 2026" are', by(storyIssues, 'B-N5').some(i => i.type === 'FLAG') && !by(storyIssues, 'DATE').length && (() => { const d = clone(SAMPLE.record); d.sections[0].body += ' The council updated its guidance this year.'; return by(run(d, SAMPLE.decisions, SAMPLE.cv), 'DATE').length === 1; })(), codes(storyIssues), 'FLAG B-N5');
const ideasD = { ...SAMPLE.decisions, ideasUsed: [{ page: 'Patio paving page', text: 'A permeable surface lets rain soak through it into the ground instead of running off into the road' }] };
const ideasIssues = run(SAMPLE.record, ideasD, SAMPLE.cv);
chk('B-N8: a sentence remaking an idea from IDEAS USED ELSEWHERE is a FLAG naming the page', by(ideasIssues, 'B-N8').some(i => i.type === 'FLAG' && /Patio paving page/.test(i.message)), codes(ideasIssues), 'FLAG B-N8');
const bare = clone(SAMPLE.record); bare.sections[3].body += '\n\nEvery street has its own character and every home its own story, which is why the choice is personal.';
const bareIssues = run(bare, SAMPLE.decisions, SAMPLE.cv);
chk('B-N9: a paragraph sharing nothing with a FACTS ALLOWED row (no figure, no link) is a FLAG naming the paragraph', by(bareIssues, 'B-N9').some(i => i.type === 'FLAG' && /Paragraph 4/.test(i.message)), codes(bareIssues) + ' ' + JSON.stringify(by(bareIssues, 'B-N9').map(i => i.message)), 'FLAG B-N9 paragraph 4');
const three = clone(SAMPLE.record); three.blog_closing = 'Planning a new front drive? See what goes into the price in our Southampton patio cost guide. Then [book a quote](/patios-paving/) for your patio and paving work.';
chk('The closing is one or two sentences, 20 to 40 words (the spec; Brandon, 28 Oct, evening): the sample\'s two sentence closing gets no one sentence flag (FINAL-CTA, N7) and three sentences is a CLOSING flag, retried', !base.some(i => i.field === 'blog_closing' && (i.check === 'FINAL-CTA' || (i.check === 'N7' && /one sentence/.test(i.message)))) && by(run(three, SAMPLE.decisions, SAMPLE.cv), 'CLOSING').some(i => i.type === 'FLAG' && /3 sentences/.test(i.message) && i.retry), codes(base.filter(i => i.field === 'blog_closing')) + ' | ' + codes(run(three, SAMPLE.decisions, SAMPLE.cv).filter(i => i.field === 'blog_closing')), 'CLOSING on three sentences only');
const listCell = clone(SAMPLE.record); listCell.table_rows[0].cells_text = 'No, unless it drains to the road, the pavement, or a neighbour';
chk('B-CELL-LIST: a cell that is a list (commas joining items) is a BLOCK, retried', by(run(listCell, SAMPLE.decisions, SAMPLE.cv), 'B-CELL-LIST').some(i => i.type === 'BLOCK' && i.retry), codes(run(listCell, SAMPLE.decisions, SAMPLE.cv)), 'BLOCK B-CELL-LIST');
const sameRow = clone(SAMPLE.record); sameRow.table_columns = ['Sign', 'Likely cause', 'Usual fix']; sameRow.table_type = 'local'; sameRow.table_rows = [{ row: 'Water sits on the lawn for days', cells: ['Water sitting on the lawn for days', 'A soakaway'], cells_text: 'Water sitting on the lawn for days ; A soakaway' }, { row: 'Moss across the shaded half', cells: ['Compacted ground under the shade', 'Aerate and scarify'], cells_text: 'Compacted ground under the shade ; Aerate and scarify' }, { row: 'Puddles by the path', cells: ['The path has no fall', 'Relay with a fall'], cells_text: 'The path has no fall ; Relay with a fall' }];
const sameIssues = run(sameRow, SAMPLE.decisions, SAMPLE.cv);
chk('B-ROW-SAME: a row whose sign and likely cause say the same thing is a BLOCK on that row; the other rows pass', by(sameIssues, 'B-ROW-SAME').length === 1 && by(sameIssues, 'B-ROW-SAME')[0].type === 'BLOCK' && /Water sits/.test(by(sameIssues, 'B-ROW-SAME')[0].field), codes(sameIssues) + ' ' + JSON.stringify(by(sameIssues, 'B-ROW-SAME').map(i => i.field)), 'one BLOCK B-ROW-SAME');
const proof = clone(SAMPLE.record); proof.sections[1].body += ' Our quotes come with fixed prices with no hidden costs.'; proof.faq_items[2].faq_answer += ' We are fully insured for the work.';
const proofIssues = run(proof, SAMPLE.decisions, SAMPLE.cv);
chk('B-PROOF: a differentiator ("fixed prices with no hidden costs") or a proof claim ("fully insured") outside the business block is a BLOCK on its field; the business block\'s own practices pass', by(proofIssues, 'B-PROOF').length === 2 && by(proofIssues, 'B-PROOF').every(i => i.type === 'BLOCK') && !by(base, 'B-PROOF').length, codes(proofIssues) + ' ' + JSON.stringify(by(proofIssues, 'B-PROOF').map(i => i.field)), '2 BLOCK B-PROOF');
chk('The retry policy (Brandon, 28 Oct): a BLOCK, a word range, N24, B-N1 and the short list retry; a sentence over 25 words, back to back openers and a repeated phrase do not', base.filter(i => i.check === 'N7' && /soft cap/.test(i.message)).every(i => !i.retry) && base.filter(i => ['N18', 'N21', 'REPEAT-PAGE'].includes(i.check)).every(i => !i.retry) && base.filter(i => i.check === 'N7' && /it must be/.test(i.message)).every(i => i.retry) && priceIssues.filter(i => i.check === 'B-N3').every(i => i.retry) && longIssues.filter(i => i.check === 'B-N1').every(i => i.retry), JSON.stringify(base.map(i => [i.check, i.retry])), '');
// Brandon's four after the first real posts
const token = clone(SAMPLE.record); token.meta_description = 'Usually not, if the new surface lets water drain through. Get your [QUOTE_FREE_LOWER] quote today.'; token.faq_items[0].faq_answer += ' Ask about a [QUOTE_FREE] visit.';
const tokenIssues = run(token, SAMPLE.decisions, SAMPLE.cv);
chk('TOKEN: an unresolved placeholder is a BLOCK in a model field (retried) and in the meta description (a code field); a [CV: key] token is not', by(tokenIssues, 'TOKEN').length === 2 && by(tokenIssues, 'TOKEN').every(i => i.type === 'BLOCK') && by(tokenIssues, 'TOKEN').some(i => i.field === 'meta_description' && !i.ref) && by(tokenIssues, 'TOKEN').some(i => /faq_answer/.test(i.field) && i.retry) && !by(base, 'TOKEN').length, codes(tokenIssues) + ' ' + JSON.stringify(by(tokenIssues, 'TOKEN').map(i => i.field)), '2 BLOCK TOKEN');
const cells = clone(SAMPLE.record); cells.table_rows[1].cells_text = 'No ; unless it drains to the road';
const cellIssues = run(cells, SAMPLE.decisions, SAMPLE.cv);
chk('B-CELLS: a row with two cells for one column is a BLOCK with a retry, and the cells follow the edited text', by(cellIssues, 'B-CELLS').length === 1 && by(cellIssues, 'B-CELLS')[0].type === 'BLOCK' && by(cellIssues, 'B-CELLS')[0].retry && cells.table_rows[1].cells.length === 2, codes(cellIssues), 'BLOCK B-CELLS');
const costD = { ...SAMPLE.decisions, post_type: 'cost_guide', cost_mode: 'prices', facts: [...SAMPLE.decisions.facts, { id: 'PRICE-1', kind: 'price', text: 'Patio paving: £2,500 to £6,000 per job (what moves it: the area and the base)' }] };
const costRec = clone(SAMPLE.record); costRec.post_type = 'cost_guide';
const costIssues = run(costRec, costD, SAMPLE.cv);
const costOk = clone(costRec); costOk.blog_answer = 'A patio in Southampton usually costs £2,500 to £6,000 per job, and the area moves it most. ' + costOk.blog_answer;
chk('B-PRICE: a cost guide in prices mode whose first sentence gives no PRICE figure is a BLOCK (retried); one that states the range passes', by(costIssues, 'B-PRICE').some(i => i.type === 'BLOCK' && i.retry) && !by(run(costOk, costD, SAMPLE.cv), 'B-PRICE').length, codes(costIssues), 'BLOCK B-PRICE');
const seasD = { ...SAMPLE.decisions, source: 'seasonal', facts: [...SAMPLE.decisions.facts, { id: 'TF-9', kind: 'trade facts timing', rowKind: 'timing', text: 'Lay turf in autumn (September to October) or spring; a day for a small lawn' }] };
const seasIssues = run(SAMPLE.record, seasD, SAMPLE.cv);
const seasOk = clone(SAMPLE.record); seasOk.blog_answer = 'Autumn, September to October, is the best time to lay turf in Southampton. ' + seasOk.blog_answer;
chk('B-TIMING: a seasonal post whose answer gives none of the timing row\'s words is a BLOCK (retried); "Autumn, September to October" passes', by(seasIssues, 'B-TIMING').some(i => i.type === 'BLOCK' && i.retry) && !by(run(seasOk, seasD, SAMPLE.cv), 'B-TIMING').length, codes(seasIssues), 'BLOCK B-TIMING');
const empty = clone(SAMPLE.record); empty.sections[2].body = '';
chk('An empty section body is the shared N6 BLOCK, so a section the model dropped is retried', by(run(empty, SAMPLE.decisions, SAMPLE.cv), 'N6').some(i => i.type === 'BLOCK' && /Dropped Kerb/.test(i.field) && i.retry), '', '');
const ranges = clone(SAMPLE.record); ranges.post_type = 'local';
const rangeIssues = run(ranges, { ...SAMPLE.decisions, post_type: 'local' }, SAMPLE.cv);
chk('The word ranges follow the post type: three of the spec\'s own sample sections are under a decision post\'s 140 to 200 by our count (137, 132, 129; the spec says they are inside it), and all four sit inside a local post\'s 120 to 180', base.filter(i => i.check === 'N7' && /to 200/.test(i.message)).length === 3 && !rangeIssues.some(i => i.check === 'N7' && /words: it must be/.test(i.message)), base.filter(i => i.check === 'N7' && /to 200/.test(i.message)).map(i => i.message).join('; ') + ' | local: ' + rangeIssues.filter(i => i.check === 'N7' && /must be/.test(i.message)).map(i => i.message).join('; '), '3 under 140 to 200; none under 120 to 180');

// ── The rubric and the reader view ──
const items = QR.codeItemsFor(SAMPLE.record);
chk('The quality review scores a post on the shared items plus G1 to G12, each tied to the blog checks', items.G1 && items.G3.checks.includes('B-N3') && items.G7.checks.includes('B-N7') && items.G12.range === 'faq_answer' && items.C5, Object.keys(items).filter(k => /^G/.test(k)).join(','), 'G1..G12');
const md = buildBlogReaderView(SAMPLE.record, { company_name: 'Edens Edge Landscaping', phone: '023 0000 0000' });
chk('The reader view renders the sample in order: H1, byline, answer, four sections with the table under section 2, the business block, the FAQ, the closing and the buttons', /^# Do You Need Planning Permission/m.test(md) && md.indexOf('| Surface |') > md.indexOf('## What Counts as a Permeable Surface?') && md.indexOf('| Surface |') < md.indexOf('## Do You Need a Dropped Kerb') && /## How Edens Edge Landscaping Handles/.test(md) && /### Is the dropped kerb fee refunded/.test(md) && /\[Call 023 0000 0000\]/.test(md), md.slice(0, 200), '');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
