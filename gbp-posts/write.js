'use strict';

// ── GBP Posts: writing and checking ──────────────────────────────────────────
// The Lead Snap checks (preview.js checkSample), plus three of this build: no phone number, Google's
// 1,500 character limit, and an opening the client has already used. The Lead Snap rules are reused
// as they stand; only these are new. A FAIL stops the batch being approved until a person fixes it.

const { checkSample, EFFORT, MAX_WORDS } = require('../leadsnap/autopost/preview');
const { SYSTEM, openingOf, addDontStart } = require('../leadsnap/autopost/openings');
const { MODEL } = require('../leadsnap/autopost/generate');

const MAX_CHARS = 1500;       // Google's limit on a post
const MAX_OPENINGS = 150;     // the newest, so the prompt stays a sensible size
const MAX_TOKENS = 1500;

// Any run that reads as a phone number: spaces, dots, dashes and brackets between the digits
const PHONE = /(?:\+|\b00)?\(?\d[\d\s().-]{7,}\d/g;
function phoneIn(text, phone = '') {
  const found = (String(text).match(PHONE) || []).filter(m => m.replace(/\D/g, '').length >= 9);
  const digits = String(phone).replace(/\D/g, '');
  const flat = String(text).replace(/\D/g, '');
  if (!found.length && digits.length >= 9 && flat.includes(digits)) found.push(phone);
  return found;
}

function checkPost(text, prompt, intake, earlierOpenings = []) {
  const base = checkSample(text, prompt, intake);
  const body = String(text);
  const add = [];
  const phones = phoneIn(body, intake.phone);
  add.push(phones.length ? { id: 'phone', level: 'fail', label: 'No phone number in the text', detail: phones.join(', ') } : { id: 'phone', level: 'pass', label: 'No phone number in the text' });
  const chars = [...body].length;
  add.push(chars > MAX_CHARS ? { id: 'chars', level: 'fail', label: `No more than ${MAX_CHARS} characters`, detail: `${chars} characters` } : { id: 'chars', level: 'pass', label: `No more than ${MAX_CHARS} characters`, detail: `${chars} characters` });
  const opening = openingOf(body);
  const repeated = opening && earlierOpenings.includes(opening);
  add.push(repeated ? { id: 'opening', level: 'warn', label: 'An opening this client has not used', detail: `"${opening}"` } : { id: 'opening', level: 'pass', label: 'An opening this client has not used' });
  const checks = [...base.checks, ...add];
  return { words: base.words, chars, opening, checks, warnings: checks.filter(c => c.level === 'warn').length, fails: checks.filter(c => c.level === 'fail').length, repeated: !!repeated };
}

const messageFor = (prompt, earlier) => addDontStart(prompt.text, [...new Set(earlier)].slice(-MAX_OPENINGS));

// One post, with one more try when it fails a check or repeats an opening. Returns the better of the two.
async function writePost({ prompt, intake, earlierOpenings, callModel }) {
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0 };
  const call = async message => {
    const r = await callModel({ system: [{ type: 'text', text: SYSTEM }], message, maxTokens: MAX_TOKENS, effort: EFFORT });
    if (r.usage) { usage.input_tokens += r.usage.input_tokens || 0; usage.output_tokens += r.usage.output_tokens || 0; usage.calls += 1; }
    return String(r.text || '').trim();
  };
  const message = messageFor(prompt, earlierOpenings);
  let text = await call(message);
  let result = checkPost(text, prompt, intake, earlierOpenings);
  let attempts = 1;
  if (result.fails || result.repeated) {
    const wrong = result.checks.filter(c => c.level === 'fail' || c.id === 'opening' && c.level === 'warn').map(c => `${c.label}${c.detail ? `: ${c.detail}` : ''}`);
    const second = await call(`${message}\n\nYour last version broke these rules, so write it again without breaking them: ${wrong.join('; ')}.`);
    const again = checkPost(second, prompt, intake, earlierOpenings);
    attempts = 2;
    if (again.fails < result.fails || (again.fails === result.fails && (!again.repeated || result.repeated))) { text = second; result = again; }
  }
  return { body: text, usage, attempts, ...result };
}

module.exports = { writePost, checkPost, phoneIn, MAX_CHARS, MAX_WORDS, MODEL, MAX_OPENINGS };
