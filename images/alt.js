'use strict';

// ── Alt text for a photo a person added (13 Nov 2026) ────────────────────────
// A Drive photo's alt text is the sentence the photo sort skill wrote in its notes. A photo
// dropped in by hand (a stock photo) has no notes, so Copybot looks at it and writes the same
// kind of sentence, by the same rule as the skill (skills/gbp-photo-sort/SKILL.md, "What it
// shows"): one plain sentence of what is visible, 15 words or fewer, no town, no business name,
// no praise. A person can still type over it.
//
// The model sees a small copy of the photo (1,024px), never the full file. Which model writes
// it is page-models.json "images".

const SYSTEM = `You write alt text for photos on a UK tradesperson's website. Alt text is read aloud to people who cannot see the photo.

Write ONE plain sentence saying what is in the photo, as you would describe it to someone who can't see it.

Rules:
- 15 words or fewer.
- Only what is visible. Do not guess at what you can't see, who did the work or where it is.
- No town or place name, no business name, no people's names.
- No praise or sales words: not "stunning", "beautiful", "quality", "professional", "expert".
- Do not start with "Photo of", "Image of" or "Picture of".
- British English. A full stop at the end. No quotation marks, no hyphenated compound words.

Reply with the sentence and nothing else.`;

const MAX_WORDS = 25;

// The model's reply as alt text, or '' when it is not one usable sentence
function cleanAlt(text) {
  let s = String(text || '').split('\n').map(l => l.trim()).filter(Boolean)[0] || '';
  s = s.replace(/^alt(ernative)? text\s*[:\-]\s*/i, '').replace(/^["'“‘]+|["'”’]+$/g, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^(a )?(photo|image|picture)( of|:)\s+/i, '');
  if (!s || s.split(' ').length > MAX_WORDS || /^[{[<]/.test(s)) return '';
  s = s[0].toUpperCase() + s.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

// bytes: the photo; callModel: anthropic-call.js makeCallModel's caller; name: the file's name, a hint only.
// → { alt, usage } ('' when the model's reply was not usable)
async function describePhoto({ bytes, callModel, name = '', model, effort = 'low' }) {
  const sharp = require('sharp');
  const small = await sharp(bytes, { failOn: 'none' }).rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  const hint = String(name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\b\d{4} \d{2} \d{2}.*$/, '').trim();
  const r = await callModel({
    system: SYSTEM,
    message: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: small.toString('base64') } },
      { type: 'text', text: `Write the alt text for this photo.${hint ? ` Its file name is "${hint.slice(0, 120)}", which may help you name what is shown, but describe only what you can see.` : ''}` },
    ],
    maxTokens: 300, model, effort,
  });
  return { alt: cleanAlt(r.text), usage: r.usage };
}

module.exports = { SYSTEM, cleanAlt, describePhoto };
