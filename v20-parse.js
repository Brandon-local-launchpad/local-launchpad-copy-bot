'use strict';

// ── v20 model output parser (Stage 6) ────────────────────────────────────────
// Reads the CORE (20) OUTPUT block by its labels and checks it against what
// DECISIONS asked for. Problems become P-* flags; nothing throws. Given titles
// (card names, point titles, step titles, FAQ questions) always win over the
// model's copy of them.

const SCALAR_FIELDS = [
  'home_hero_intro', 'home_content_block_body', 'home_services_intro', 'home_services_more_line',
  'home_owner_body', 'home_areas_intro', 'home_final_cta_body',
];
const LIST_FIELDS = {
  home_services_cards: ['card_name', 'card_text'],
  home_why_points:     ['point_title', 'point_body'],
  home_process_steps:  ['step_title', 'step_body'],
  home_faq_items:      ['faq_question', 'faq_answer'],
};
const ALL_LABELS = [...SCALAR_FIELDS, ...Object.keys(LIST_FIELDS), 'MODEL_FLAGS'];
const LABEL_RE = new RegExp(`^\\s*\\**(${ALL_LABELS.join('|')})\\**\\s*:\\s*(.*)$`);

const isHidden = s => /^\s*HIDDEN\s*\.?\s*$/i.test(s || '');
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Split raw text into { label: [lines] }
function splitLabels(raw) {
  let text = (raw || '').replace(/^```[a-z]*\s*$/gim, '');
  const start = text.indexOf('=== MODEL OUTPUT');
  if (start >= 0) text = text.slice(text.indexOf('\n', start) + 1);
  const blocks = {};
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(LABEL_RE);
    if (m && !/^\s*-/.test(line)) {
      current = m[1];
      blocks[current] = m[2] ? [m[2]] : [];
    } else if (current) {
      blocks[current].push(line);
    }
  }
  return blocks;
}

// Scalar value: literal "\n" sequences and real blank lines both become paragraph breaks
function scalarValue(lines) {
  const joined = lines.join('\n').trim();
  return joined
    .replace(/\\n/g, '\n')
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

// List items: "- key1: A | key2: B", continuation lines appended to the item
function listItems(lines, [k1, k2]) {
  const items = [];
  let cur = null;
  for (const line of lines) {
    if (/^\s*-\s+/.test(line)) { if (cur !== null) items.push(cur); cur = line.replace(/^\s*-\s+/, ''); }
    else if (cur !== null && line.trim()) cur += ' ' + line.trim();
  }
  if (cur !== null) items.push(cur);
  return items.map(it => {
    const sep = it.search(new RegExp(`\\|\\s*${k2}\\s*:`));
    const left  = sep >= 0 ? it.slice(0, sep) : it;
    const right = sep >= 0 ? it.slice(sep).replace(new RegExp(`^\\|\\s*${k2}\\s*:\\s*`), '') : '';
    return {
      [k1]: left.replace(new RegExp(`^\\s*${k1}\\s*:\\s*`), '').trim(),
      [k2]: right.replace(/\\n/g, ' ').trim(),
      _hasSecond: sep >= 0,
    };
  });
}

// expected: { cards: [names], points: [titles], steps: [titles], faqs: [questions],
//             hidden: { home_owner_body: bool, home_services_more_line: bool } }
function parseV20Output(raw, expected) {
  const flags = [];
  const flag = (code, msg) => flags.push({ code, msg });
  const blocks = splitLabels(raw);
  const fields = {};

  for (const f of SCALAR_FIELDS) {
    if (!(f in blocks)) { flag('P-MISSING', `${f} is missing from the output.`); fields[f] = ''; continue; }
    const v = scalarValue(blocks[f]);
    const shouldHide = !!(expected.hidden && expected.hidden[f]);
    if (shouldHide) {
      if (v && !isHidden(v)) flag('P-HIDDEN', `${f} should be HIDDEN but has text.`);
      fields[f] = 'HIDDEN';
    } else {
      if (!v || isHidden(v)) flag('P-EMPTY', `${f} is shown on the page but the output is ${v ? 'HIDDEN' : 'empty'}.`);
      fields[f] = isHidden(v) ? '' : v;
    }
  }

  const listSpecs = {
    home_services_cards: expected.cards || [],
    home_why_points:     expected.points || [],
    home_process_steps:  expected.steps || [],
    home_faq_items:      expected.faqs || [],
  };
  for (const [f, given] of Object.entries(listSpecs)) {
    const [k1, k2] = LIST_FIELDS[f];
    if (!(f in blocks)) { flag('P-MISSING', `${f} is missing from the output.`); }
    const items = f in blocks ? listItems(blocks[f], [k1, k2]) : [];
    if (items.length !== given.length) {
      flag('P-COUNT', `${f}: expected ${given.length} item(s), got ${items.length}.`);
    }
    fields[f] = given.map((title, i) => {
      const it = items[i];
      if (!it) return { [k1]: title, [k2]: '' };
      if (norm(it[k1]) !== norm(title)) flag('P-TITLE', `${f} item ${i + 1}: the model wrote "${it[k1]}" for "${title}". Kept the given title.`);
      if (!it._hasSecond) flag('P-FORMAT', `${f} item ${i + 1}: no "${k2}:" label.`);
      if (!it[k2]) flag('P-EMPTY', `${f} item ${i + 1} (${title}) has no ${k2}.`);
      return { [k1]: title, [k2]: it[k2] };
    });
  }

  const modelFlagLines = (blocks.MODEL_FLAGS || []).map(l => l.trim()).filter(Boolean);
  if (!('MODEL_FLAGS' in blocks)) flag('P-MISSING', 'MODEL_FLAGS is missing from the output.');
  const modelFlags = modelFlagLines.filter(l => !/^none\.?$/i.test(l)).map(l => ({ code: 'MODEL', msg: l.replace(/^[-*]\s*/, '') }));

  return { fields, flags, modelFlags };
}

module.exports = { parseV20Output, SCALAR_FIELDS, LIST_FIELDS };
