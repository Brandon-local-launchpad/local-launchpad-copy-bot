'use strict';

// ── One home per idea (copy quality 2, phase 2, 4 Nov 2026) ───────────────────
// The reviewer's most common mark down was the same point made in several sections: what to
// send with the enquiry in step 1 and again in the quote FAQ, the cost factors in the cost
// intro, the cost cards and the cost FAQ, the insurer in a card and a FAQ, the hidden layer
// (the base, the membrane, what sits behind the finish) in the content block and a card. Code
// now assigns each recurring topic one home field per page type and tells every other field
// not to make it: an IDEA HOMES section in the DECISIONS block, and a note on the field lines
// in MODEL FIELDS. The existing P6 and REPEAT-PAGE checks enforce it.

const HOMES = {
  homepage: [
    { topic: 'What to tell us and send with an enquiry (the size, photos, which side of the house, what the problem is doing)', home: 'the first process step (its step_body)', elsewhere: 'the quote FAQ answers the "free, no obligation" doubt and nothing about what to send; the hero, the cards, the areas intro and the final CTA never list it' },
    { topic: 'The cost factors (size, access, what is underneath, materials)', home: 'the cost FAQ: one line on why prices vary, then the one factor people do not expect', elsewhere: 'no card, point or other answer lists what moves the price' },
    { topic: 'The insurer point (what the policy or the insurer decides)', home: 'the insurance FAQ', elsewhere: 'no other field mentions the insurer, the policy or a claim' },
    { topic: 'The hidden layer (the base, the membrane, the fixings, what sits behind the finish)', home: 'the content block', elsewhere: 'the cards and the FAQs never restate it' },
  ],
  category: [
    { topic: 'What to tell us and send with an enquiry', home: 'the first process step (its step_body)', elsewhere: 'the quote FAQ answers the "free, no obligation" doubt and nothing about what to send; no other field lists it' },
    { topic: 'The cost factors', home: 'the block 5 cost cards', elsewhere: 'the cost intro says why prices vary in one line and names no factor; the cost FAQ gives the one factor people do not expect and sends the reader to the cost section by its heading (never "above", "below" or "on this page"); the content block, the service cards and the other FAQs never list factors' },
    { topic: 'The insurer point', home: 'the insurance FAQ', elsewhere: 'no card or other answer mentions the insurer, the policy or a claim' },
    { topic: 'The hidden layer (the base, the membrane, the fixings, what sits behind the finish)', home: 'the content block', elsewhere: 'the block 4 cards name the sign and the cause, never the layer again; the FAQs never restate it' },
  ],
  service: [
    { topic: 'What to tell us and send with an enquiry', home: 'the first process step (its step_body)', elsewhere: 'no FAQ, card or intro lists what to send' },
    { topic: 'The cost factors', home: 'the block 5 cost cards', elsewhere: 'the cost intro says why prices vary in one line and names no factor; the cost FAQ gives the one factor people do not expect and sends the reader to the cost section by its heading (never "above", "below" or "on this page"); the content block, the What\'s Included items and the other FAQs never list factors' },
    { topic: 'The insurer point', home: 'the insurance FAQ', elsewhere: 'no card or other answer mentions the insurer, the policy or a claim' },
    { topic: 'The hidden layer (the base, the membrane, the fixings, what sits behind the finish)', home: 'paragraph 3 of the content block', elsewhere: 'the block 4 cards name the sign and the cause, never the layer again; the What\'s Included items name the stage in four to ten words; the FAQs never restate it' },
  ],
  location: [
    { topic: 'What to tell us and send with an enquiry', home: 'the first process step (its step_body)', elsewhere: 'the quote FAQ answers the "free, no obligation" doubt and nothing about what to send; no other field lists it' },
    { topic: 'The cost factors', home: 'the block 5 cost cards', elsewhere: 'the cost intro says why prices vary in one line and names no factor; the cost FAQ gives the one factor people do not expect and sends the reader to the cost section by its heading (never "above", "below" or "on this page"); the content block and the other FAQs never list factors' },
    { topic: 'The insurer point', home: 'the insurance FAQ', elsewhere: 'no card or other answer mentions the insurer, the policy or a claim' },
    { topic: 'The hidden layer (the base, the membrane, the fixings, what sits behind the finish)', home: 'the content block', elsewhere: 'the block 4 cards name the sign and the cause, never the layer again; the FAQs never restate it' },
  ],
};

// The lines for the DECISIONS block
function ideaHomeLines(type) {
  const rows = HOMES[type] || HOMES.category;
  return ['', 'IDEA HOMES (one home per idea; a field that is not the home never makes the point, in any words):',
    ...rows.map(r => `  ${r.topic}: ${r.home}. Elsewhere: ${r.elsewhere}.`)];
}

// The note for a MODEL FIELDS line: role is one of step1, costIntro, block5, costFaq, quoteFaq,
// insuranceFaq, content, cards
const NOTES = {
  step1: 'the home of what to tell us and send',
  costIntro: 'one line on why prices vary; the factors live in the cost cards',
  block5: 'the only home of the cost factors',
  costFaq: 'the one factor people do not expect, then send the reader to the cost section by its heading in words ("the cost factors are under What Affects the Cost"), never "above", "below", "on this page" or the list itself',
  costFaqHome: 'one line on why prices vary, then the one factor people do not expect',
  quoteFaq: 'the free, no obligation doubt; never what to send',
  insuranceFaq: 'the only home of the insurer point',
  content: 'the home of the hidden layer',
};
function ideaNote(role, type = 'category') {
  if (role === 'costFaq' && type === 'homepage') return NOTES.costFaqHome;
  return NOTES[role] || '';
}
// Which role a FAQ question plays, from its wording
function faqRole(question) {
  const q = String(question || '').toLowerCase();
  if (/\bcost|\bprice|how much/.test(q)) return 'costFaq';
  if (/\binsur/.test(q)) return 'insuranceFaq';
  if (/\bquote\b.*\b(free|obligation)|\bfree\b.*\bquote/.test(q)) return 'quoteFaq';
  return null;
}

module.exports = { HOMES, ideaHomeLines, ideaNote, faqRole };
