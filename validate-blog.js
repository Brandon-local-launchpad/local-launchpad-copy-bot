'use strict';

// ── Blog post validator (Blog CORE (1), stage 5, 28 Oct 2026) ────────────────
// The shared checks (validate-v20.js validateCommon and sharedCrossChecks) keyed on the
// blog's fields (dashes, hyphenated compounds, banned phrases, template leftovers, unknown
// tokens, weak link phrases, N2 links on LINKABLE PAGES, N5 claim words, N6 HIDDEN or empty,
// N7 sentence length and the post type's word ranges from page-types/blog.js, N24 the FAQ
// first sentence), plus the blog's own rules from the spec's section 9 and CORE (1):
//   B-N1   FLAG   the first sentence of blog_answer over 20 words (a FAQ answer's over 15 is N24)
//   B-N2   BLOCK  the primary link missing (the closing, and section 1 or 2 when there are
//                 sections) or used more than twice on the post
//   LINK-ONCE FLAG a secondary link (the cost guide, the town page) used more than once
//   B-N3   BLOCK  a £ figure that is not in the PRICE rows or another FACTS ALLOWED row (a
//                 council fee from a rule row is allowed)
//   B-N4   BLOCK  a standard's number or a regulation's name (BS, EN, Part P, Regulations 20xx,
//                 Building Regulations, Permitted Development)
//   B-N5   FLAG   story markers ("imagine", "picture this", "let's say", "say you") and invented
//                 customers ("Mrs Patel", "a customer called")
//   B-N6   BLOCK  the safety switch on and an instruction to dismantle, rewire, cut, reconnect,
//                 repair, disconnect, remove or lift the thing (an imperative, or "you can …")
//   B-N7   BLOCK  an FAQ question a page or another post already uses (D.usedQuestions)
//   B-N8   FLAG   a sentence that remakes a point from IDEAS USED ELSEWHERE (ideas.js matchIdea)
//   B-N9   FLAG   a section paragraph with no fact behind it: nothing shared with a FACTS
//                 ALLOWED row (two content words), no figure, no link
//   ANSWER-OPEN BLOCK blog_answer opens on the company name
//   CLOSING BLOCK  blog_closing gives [CV: phone] or opens "Tell us"; FLAG over two sentences
//   B-CELL-LIST BLOCK a table cell that is a list; B-ROW-SAME BLOCK a row whose sign and cause
//                 say the same thing
//   B-PROOF BLOCK a differentiator or a proof claim (years, guarantee, insurance, reviews, job
//                 counts) outside blog_business (CORE (1) rule 8)
//   DATE   FLAG   a date that goes stale ("this year", "in 2026", "recently", "nowadays")
// Brandon's four after the first real posts (28 Oct):
//   TOKEN  BLOCK  an unresolved placeholder ([QUOTE_FREE_LOWER]) in any field, the meta
//                 description and the other code fields included
//   B-CELLS BLOCK a table row with the wrong number of cells (retried; a dropped section
//                 is the shared N6 BLOCK on its empty body, retried)
//   B-PRICE BLOCK a cost guide in prices mode whose first sentence gives no figure from the
//                 PRICE rows
//   B-TIMING BLOCK a seasonal post whose answer gives none of the timing from the trade
//                 facts timing rows
// The validator's N2 list is the post's LINKABLE PAGES (the primary and the secondaries).

const { validateCommon, sharedCrossChecks, helpers, RETRY_FLAGS } = require('./validate-v20');
for (const c of ['B-N1', 'B-N5', 'B-N8', 'B-N9', 'LINK-ONCE', 'CLOSING', 'DATE']) RETRY_FLAGS.add(c);
const { LABELS } = require('./page-types/blog');
const { matchIdea, contentWords } = require('./ideas');
const { esc, linkUrls, normUrl, scanText, sentences, lc, words } = helpers;

// The closing is one or two sentences, 20 to 40 words (the spec; Brandon, 28 Oct, evening):
// exempt from the pages' one sentence FINAL-CTA rule, so it is not the final CTA key; its own
// rules (CLOSING) are below
const KEYS = { hero: LABELS.answer, content: LABELS.answer, finalCta: null, areasIntro: null, moreLine: null, selfUrl: '/' };
// The retry policy for a post (Brandon, 28 Oct): a BLOCK, a word range (N7 "it must be"), and
// this short list retry, two rounds at most (blog/generate.js); style flags (sentence length,
// back to back openers, repeated phrases) go to review
const BLOG_RETRY = new Set(['N24', 'B-N1', 'B-N5', 'B-N8', 'B-N9', 'DATE', 'LINK-ONCE', 'CLOSING', 'N5', 'PRACTICE']);
// Proof outside the business block (CORE (1) rule 8): the confirmed differentiators, the
// insurance figure, the guarantee length, the jobs count and the years trading
const PROOF_RE = /\b(?:fully insured|public liability|insured for|insurance of|£\s?\d+\s?(?:m|million)\b|\d+\s*year (?:guarantee|warranty)|guaranteed for|\d[\d,]*\s*(?:jobs|projects|gardens|customers) (?:completed|done|finished)|(?:over|more than) \d+ years|\d+ years(?:'|’)? (?:experience|of experience|in (?:the )?(?:trade|business)|trading)|five star|5 star|\d+ (?:google )?reviews)\b/i;
// Placeholders that must never reach a record: a prompt or niche token the code did not
// resolve ([QUOTE_FREE_LOWER], [TOPIC]); [CV: key] tokens are resolved at push and the shared
// check reports an unknown key
const PLACEHOLDER_RE = /\[(?!CV: )[A-Z][A-Z0-9_]+\]/;
const CODE_FIELDS = ['meta_description', 'seo_title', 'blog_h1', 'blog_byline', 'blog_cta_h2', 'blog_business_h2', 'blog_faq_h2'];

// The context: the shared one plus the blog's keys. D carries facts, primary, secondary,
// safety, ideasUsed and usedQuestions (blog/decisions.js)
function blogValidationContext(base, D) {
  // The FACTS ALLOWED rows are the post's research: their figures and words pass NUM, the
  // timescale check and the method check as the research text does on a page
  const factsText = ((D && D.facts) || []).map(f => f.text).join(' | ');
  const researchNumbers = new Set(base.researchNumbers || []);
  for (const m of factsText.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) || []) { researchNumbers.add(m); researchNumbers.add(m.replace(/,/g, '')); }
  return {
    ...base, keys: { ...KEYS, selfUrl: (D && D.slug) || '/' },
    researchNumbers, researchText: `${base.researchText || ''} ${lc(factsText)}`, tradeFactsText: `${base.tradeFactsText || ''} ${lc(factsText)}`,
  };
}

// Shared checks written for a page that do not fit a post, dropped from its issues: a post's
// subject is often a material or an option the client does not sell (SERVICE), a post explains
// the research words a page would avoid (RESEARCH-LANG), it names places and rules for what
// they mean (SCENERY), and CORE (1) asks no FAQ answer to carry a link (6c)
const PAGE_ONLY = new Set(['SERVICE', 'RESEARCH-LANG', 'SCENERY', '6c']);

const STANDARD_RE = /\bBS\s?\d{3,}|\bEN\s?\d{3,}|\bISO\s?\d{3,}|\bPart\s+[A-P]\b|\bRegulations?\s+\d{4}\b|\bAct\s+\d{4}\b|\bSchedule\s+\d+\b|\bClass\s+[A-Z]\b|\bsection\s+\d+\b|\bregulation\s+\d+\b|\b(?:Order|Act|Regulations|Directive)\s+(?:of\s+)?\d{4}\b/;
const REG_NAME_RE = /\bBuilding Regulations?\b|\bBuilding Regs\b|\bPermitted Development(?: Rights?)?\b|\bTown and Country Planning\b|\bGeneral Permitted Development\b|\bWildlife and Countryside Act\b|\bParty Wall Act\b/i;
const STORY_MARK_RE = /\b(?:imagine|picture this|let'?s say|say you|suppose you|let'?s imagine|think of a)\b/i;
const STORY_NAME_RE = /\b(?:meet [A-Z][a-z]+\b|(?:Mr|Mrs|Ms|Miss|Dr)\.? [A-Z][a-z]+\b|a (?:customer|homeowner|client|couple|family) (?:called|named) [A-Z]|one (?:customer|homeowner|client) (?:in|from|on) [A-Z])/;
const STORY_RE = { exec: s => STORY_MARK_RE.exec(s) || STORY_NAME_RE.exec(s) };
const DIY_VERBS = 'dismantle|rewire|reconnect|repair|cut|remove|disconnect|unscrew|lift|prise|pry|drill|replace|strip|isolate|rip|tear|loosen|detach';
const DIY_IMPERATIVE_RE = new RegExp(`^(?:(?:you can|you could|you should|you might|you may|simply|just|first|then|next|start by|begin by)\\s+)?(?:${DIY_VERBS})(?:ing)?\\b`, 'i');
const DIY_YOU_RE = new RegExp(`\\byou (?:can|could|should|might|may) (?:(?:simply|just|easily|then|also|usually)\\s+)?(?:${DIY_VERBS})\\b`, 'i');
const DATE_RE = /\bthis year\b|\bin 20\d\d\b|\bsince 20\d\d\b(?! \w+ rule)|\brecently\b|\bnowadays\b|\bthese days\b|\bcurrently\b|\bthis (?:spring|summer|autumn|winter)\b|\bat the moment\b/i;
const MONEY_RE = /£\s?(\d[\d,]*(?:\.\d+)?)\s?(k|m)?\b|\b(\d[\d,]*)\s?(?:pounds|quid)\b/gi;

const figure = (n, k) => { let v = parseFloat(String(n).replace(/,/g, '')); if (/k/i.test(k || '')) v *= 1000; if (/m/i.test(k || '')) v *= 1000000; return String(v); };
const figuresIn = t => { const out = []; for (const m of String(t || '').matchAll(MONEY_RE)) out.push({ text: m[0].trim(), value: figure(m[1] || m[3], m[2]) }); return out; };
const normQ = s => lc(String(s || '')).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const firstSentence = t => sentences(t)[0] || '';
const paragraphs = t => String(t || '').split(/\n\s*\n+|\\n\\n+/).map(p => p.trim()).filter(Boolean);

function validateBlog(record, V) {
  // A table row's cells are edited as "a ; b" (cells_text): the cells follow it, so a retry's
  // rewrite reaches the page
  for (const r of record.table_rows || []) if (typeof r.cells_text === 'string') r.cells = r.cells_text.split(/\s*;\s*/).map(c => c.trim());
  const common = validateCommon(record, V);
  const { issues, issue, fields } = common;
  if (record.blocked) return issues;
  sharedCrossChecks(record, V, common);
  for (let i = issues.length - 1; i >= 0; i--) if (PAGE_ONLY.has(issues[i].check)) issues.splice(i, 1);
  const D = (V && V.D) || {};
  const cv = (V && V.cv) || {};
  const answer = fields.find(f => f.ref.key === LABELS.answer);
  const closing = fields.find(f => f.ref.key === LABELS.closing);
  const sectionFields = fields.filter(f => f.ref.key === 'sections');
  const prose = fields.filter(f => f.ref.key !== 'table_rows');

  // ── TOKEN: no unresolved placeholder in any field, the code fields included ──
  for (const f of fields) { const m = f.text.match(PLACEHOLDER_RE); if (m) issue('BLOCK', 'TOKEN', f.label, `"${m[0]}" is an unresolved token. Write the words it stands for.`, f.ref); }
  for (const k of CODE_FIELDS) { const m = String(record[k] || '').match(PLACEHOLDER_RE); if (m) issue('BLOCK', 'TOKEN', k, `"${m[0]}" is an unresolved token in ${k}: code builds this field, so the decisions did not resolve it.`); }

  // ── B-CELLS: every table row has one cell per column (a dropped section is N6, retried);
  // B-CELL-LIST: a cell that is a list; B-ROW-SAME: a row whose cause and sign say the same thing ──
  const cols = (record.table_columns || []).length;
  if (record.table_show && cols) {
    const names = (record.table_columns || []).map(c => lc(c));
    const signAt = names.findIndex(c => /sign/.test(c)), causeAt = names.findIndex(c => /cause/.test(c));
    for (const f of fields.filter(x => x.ref.key === 'table_rows')) {
      const cells = f.text.split(/\s*;\s*/).filter(c => c.trim());
      if (cells.length !== cols - 1) { issue('BLOCK', 'B-CELLS', f.label, `${cells.length} cell${cells.length === 1 ? '' : 's'} for ${cols - 1} column${cols - 1 === 1 ? '' : 's'} (${record.table_columns.slice(1).join(' | ')}). Write exactly ${cols - 1}, separated by " ; ", with no ";" inside a cell (a list inside a cell reads as extra cells).`, f.ref); continue; }
      const list = cells.find(c => (c.match(/,/g) || []).length >= 2 || /\b(?:and|or) \w+, /.test(c));
      if (list) issue('BLOCK', 'B-CELL-LIST', f.label, `"${list.slice(0, 60)}" is a list. One point per cell, a few words, no commas joining items.`, f.ref);
      const row = (record.table_rows || [])[f.ref.index] || {};
      const all = [row.row, ...cells];
      if (signAt >= 0 && causeAt >= 0 && all[signAt] && all[causeAt]) {
        const A = contentWords(all[signAt]), B = contentWords(all[causeAt]);
        let n = 0; for (const w of A) if (B.has(w)) n++;
        if (A.size >= 2 && B.size >= 2 && n / Math.min(A.size, B.size) >= 0.6) issue('BLOCK', 'B-ROW-SAME', f.label, `The sign ("${all[signAt]}") and the cause ("${all[causeAt]}") say the same thing. The sign is what the reader sees; the cause is what is behind it.`, f.ref);
      }
    }
  }

  // ── B-PROOF: a differentiator or a proof claim outside blog_business (CORE (1) rule 8) ──
  const diffs = [cv.differentiator_1_confirmed && cv.differentiator_1, cv.differentiator_2_confirmed && cv.differentiator_2].filter(Boolean).map(d => ({ text: d, words: contentWords(d) })).filter(d => d.words.size >= 2);
  for (const f of fields) {
    if (f.ref.key === LABELS.business) continue;
    const s = scanText(f.text);
    const m = s.match(PROOF_RE);
    if (m) { issue('BLOCK', 'B-PROOF', f.label, `"${m[0]}" is a proof claim. Years, guarantee, insurance, reviews and job counts appear only in the business block.`, f.ref); continue; }
    for (const sen of sentences(f.text)) {
      const mine = contentWords(sen);
      const hit = diffs.find(d => { let n = 0; for (const w of d.words) if (mine.has(w)) n++; return n / d.words.size >= 0.7; });
      if (hit) { issue('BLOCK', 'B-PROOF', f.label, `"${sen.slice(0, 70)}…" makes the differentiator "${hit.text}". A proof belongs in the business block only.`, f.ref); break; }
    }
  }

  // ── B-N1: the answer's first sentence; B-PRICE on a cost guide in prices mode; B-TIMING on a seasonal post ──
  if (answer && answer.text.trim()) {
    const s1 = firstSentence(answer.text);
    const n = words(s1).length;
    if (n > 20) issue('FLAG', 'B-N1', answer.label, `The first sentence is ${n} words. Answer the target query first, in 20 words or fewer.`, answer.ref);
    if (D.post_type === 'cost_guide' && D.cost_mode === 'prices') {
      const priced = new Set((D.facts || []).filter(f => /^PRICE-/.test(f.id)).flatMap(f => figuresIn(f.text).map(x => x.value)));
      const inS1 = figuresIn(s1).filter(x => priced.has(x.value));
      if (!inS1.length) issue('BLOCK', 'B-PRICE', answer.label, 'The first sentence must state the price range from the PRICE rows (both ends, "£1,500 to £4,000"), then what moves it.', answer.ref);
    }
    if (D.source === 'seasonal') {
      const timings = (D.facts || []).filter(f => f.rowKind === 'timing' || /timing/.test(f.kind || ''));
      const timeWords = new Set(timings.flatMap(f => lc(f.text).match(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|winter|weeks?|days?|months?|hours?|year|growing season|dormant|frost|dry spell|wet)\b/g) || []));
      const mine = new Set(lc(scanText(answer.text)).match(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|winter|weeks?|days?|months?|hours?|year|growing season|dormant|frost|dry spell|wet)\b/g) || []);
      if (timings.length && ![...timeWords].some(w => mine.has(w))) issue('BLOCK', 'B-TIMING', answer.label, `The answer must give the timing from the trade facts timing rows (${timings.map(f => `"${f.text.slice(0, 60)}"`).join('; ')}): the season or the window, and why.`, answer.ref);
    }
    const company = String(cv.company_name || '').trim();
    const opens = /^\s*\[CV: company_name\]/.test(answer.text) || (company && new RegExp(`^\\s*(?:at|here at)?\\s*${esc(company)}\\b`, 'i').test(scanText(answer.text)));
    if (opens) issue('BLOCK', 'ANSWER-OPEN', answer.label, 'Opens on the company name. The answer opens on the reader\'s question, never on the business.', answer.ref);
  }

  // ── B-N2 and LINK-ONCE: the primary link twice (the closing, and section 1 or 2), each secondary once ──
  const primary = D.primary && D.primary.url ? normUrl(D.primary.url) : null;
  if (primary) {
    const count = f => linkUrls(f.text).map(normUrl).filter(u => u === primary).length;
    const total = prose.reduce((n, f) => n + count(f), 0);
    if (closing && closing.text.trim() && !count(closing)) issue('BLOCK', 'B-N2', closing.label, `The closing never links the primary page ${D.primary.url}. Link it once here, as what the reader can do next.`, closing.ref);
    const early = sectionFields.slice(0, 2);
    if (early.length && !early.some(count)) issue('BLOCK', 'B-N2', early[0].label, `Neither section 1 nor section 2 links the primary page ${D.primary.url}. Link it once in one of them, as natural link text.`, early[0].ref);
    if (total > 2) {
      // The allowed two: the first of section 1 or 2 with the link, and the closing; the last field beyond those carries the extra
      const allowed = new Set([early.find(count), closing].filter(Boolean));
      const extra = prose.filter(f => count(f) && (!allowed.has(f) || count(f) > 1));
      const f = extra[extra.length - 1] || prose.filter(count).slice(-1)[0];
      issue('BLOCK', 'B-N2', f.label, `The primary page ${D.primary.url} is linked ${total} times on the post. Twice at most: once in section 1 or 2 and once in the closing.`, f.ref);
    }
  }
  for (const s of D.secondary || []) {
    const u = normUrl(s.url);
    const where = prose.filter(f => linkUrls(f.text).map(normUrl).includes(u));
    const n = where.reduce((k, f) => k + linkUrls(f.text).map(normUrl).filter(x => x === u).length, 0);
    if (n > 1) { const f = where[where.length - 1]; issue('FLAG', 'LINK-ONCE', f.label, `${s.url} is linked ${n} times (${where.map(x => x.label).join(', ')}). Each secondary link once on the post.`, f.ref); }
  }

  // ── B-N3: every £ figure from a FACTS ALLOWED row ──
  const allowed = new Set((D.facts || []).flatMap(f => figuresIn(f.text).map(x => x.value)));
  for (const f of fields) {
    for (const m of figuresIn(f.text)) {
      if (allowed.has(m.value)) continue;
      issue('BLOCK', 'B-N3', f.label, `"${m.text}" is a price that is not in FACTS ALLOWED (the PRICE rows and the fee rows). Only those figures; otherwise say what moves the price and "ask for a quote".`, f.ref);
      break;
    }
  }

  // ── Every prose field: standards, stories, DIY steps, stale dates, ideas used elsewhere ──
  const safetyOn = !!(D.safety && D.safety.on);
  const ideas = (D.ideasUsed || []).map(i => ({ ...i, _words: i._words || contentWords(i.text) }));
  for (const f of prose) {
    const s = scanText(f.text);
    const st = s.match(STANDARD_RE) || s.match(REG_NAME_RE);
    if (st) issue('BLOCK', 'B-N4', f.label, `"${st[0]}" names a standard, a regulation or an Act. Write what usually applies in plain words ("usually", "in most cases") and who to check with (the council, building control), nothing about the rule itself.`, f.ref);
    const story = STORY_RE.exec(s);
    if (story) issue('FLAG', 'B-N5', f.label, `"${story[0]}" reads as a story or an imagined customer. No scenarios, no invented names: the customer's own question is the only story allowed.`, f.ref);
    const dt = s.match(DATE_RE);
    if (dt) issue('FLAG', 'DATE', f.label, `"${dt[0]}" goes stale. Never "this year", a year or "recently": the post shows its own last checked date.`, f.ref);
    if (safetyOn) {
      const diy = sentences(f.text).find(sen => DIY_IMPERATIVE_RE.test(sen.replace(/^["“(\[]+/, '')) || DIY_YOU_RE.test(sen));
      if (diy) issue('BLOCK', 'B-N6', f.label, `"${diy.slice(0, 80)}…" is a step the reader could take on a safety topic. Say what to avoid and who does the work; never dismantle, rewire, cut, reconnect, repair or remove as an instruction.`, f.ref);
    }
    if (ideas.length) {
      for (const sen of sentences(f.text)) {
        const hit = matchIdea(sen, ideas);
        if (hit) { issue('FLAG', 'B-N8', f.label, `"${sen.slice(0, 70)}…" remakes a point ${hit.page} already makes ("${hit.text}"). Take another angle.`, f.ref); break; }
      }
    }
  }

  // ── B-N7: an FAQ question a page or another post uses ──
  const used = new Set((D.usedQuestions || []).map(normQ));
  if (used.size) for (const q of record.faq_items || []) {
    if (q && q.faq_question && used.has(normQ(q.faq_question))) issue('BLOCK', 'B-N7', 'faq_items', `"${q.faq_question}" is a question another page or post already answers. Code picks the FAQ: drop it from this post's FAQ list.`);
  }

  // ── B-N9: a section paragraph with no fact behind it ──
  const factWords = (D.facts || []).map(f => contentWords(f.text)).filter(w => w.size >= 2);
  if (factWords.length) for (const f of sectionFields) {
    const bare = [];
    paragraphs(f.text).forEach((p, i) => {
      if (linkUrls(p).length || figuresIn(p).length || /\d/.test(p)) return;
      const mine = contentWords(p);
      const backed = factWords.some(w => { let n = 0; for (const x of w) if (mine.has(x)) n++; return n >= 2; });
      if (!backed) bare.push(i + 1);
    });
    if (bare.length) issue('FLAG', 'B-N9', f.label, `Paragraph${bare.length === 1 ? '' : 's'} ${bare.join(', ')} share${bare.length === 1 ? 's' : ''} nothing with a FACTS ALLOWED row. Every paragraph carries one fact from the list (a price, a rule, a method, a symptom, a confirmed practice).`, f.ref);
  }

  // ── The closing ──
  if (closing && closing.text.trim()) {
    const t = closing.text;
    const digits = scanText(t).replace(/\D/g, '');
    if (/\[CV: phone\]/.test(t) || (cv.phone && digits.includes(String(cv.phone).replace(/\D/g, '')))) issue('BLOCK', 'CLOSING', closing.label, 'The closing never gives the phone number: the buttons carry it. Say what the reader can do next and link the primary page.', closing.ref);
    if (/^\s*tell us\b/i.test(scanText(t))) issue('BLOCK', 'CLOSING', closing.label, 'Opens with "Tell us". Open on what the reader can do next.', closing.ref);
    const n = sentences(t).length;
    if (n > 2) issue('FLAG', 'CLOSING', closing.label, `${n} sentences: the closing is one or two sentences, 20 to 40 words.`, closing.ref);
  }

  // ── The retry policy: BLOCKs, the word ranges and the short list; style flags go to review ──
  for (const i of issues) i.retry = !!i.ref && (i.type === 'BLOCK' || BLOG_RETRY.has(i.check) || (i.check === 'N7' && /it must be/.test(i.message)));
  return issues;
}

module.exports = { validateBlog, blogValidationContext, KEYS, STANDARD_RE, REG_NAME_RE, STORY_RE, DATE_RE, figuresIn };
