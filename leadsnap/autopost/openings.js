'use strict';

// ── Lead Snap autopost: "Don't start with" ───────────────────────────────────
// Prompts sharing a photo folder sit side by side, so they should not open alike (Brandon, 6 Nov).
// A prompt's opening does not exist until a post is written from it, so Generate writes one test post
// per prompt, reads off its first words, and gives each prompt the openings of the others in its
// folder to avoid. One post is a guide, not a guarantee: Preview posts checks how it worked out.

const SYSTEM = 'Write the Google Business Profile post the user asks for. Return only the post text.';
const CONCURRENCY = 8;
const OPENING_WORDS = 5;

const tokens = t => String(t).toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
const openingOf = text => tokens(text).slice(0, OPENING_WORDS).join(' ');

// prompts: [{ n, text }]. A call that fails leaves that prompt's opening out; the rest stand.
async function sampleOpenings(prompts, callModel, log = null) {
  const openings = new Map();
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0 };
  let next = 0;
  const worker = async () => {
    while (next < prompts.length) {
      const p = prompts[next++];
      try {
        const r = await callModel({ system: [{ type: 'text', text: SYSTEM }], message: p.text, maxTokens: 1500, effort: 'low' });
        if (r.usage) { usage.input_tokens += r.usage.input_tokens || 0; usage.output_tokens += r.usage.output_tokens || 0; usage.calls += 1; }
        const opening = openingOf(r.text);
        if (opening) openings.set(p.n, opening);
      } catch (e) {
        if (log) log(`[lead snap] no test post for prompt ${p.n}: ${e.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, prompts.length) }, worker));
  return { openings, usage };
}

// The other prompts' openings in this prompt's folder, each once
function othersInFolder(n, prompts, openings) {
  const me = prompts.find(p => p.n === n);
  const list = prompts.filter(p => p.n !== n && p.folder === me.folder).map(p => openings.get(p.n)).filter(Boolean);
  return [...new Set(list)];
}

// Goes in above the writing rules
function addDontStart(text, others) {
  if (!others.length) return text;
  const line = `Don't start with any of these openings: ${others.map(o => `"${o}"`).join('; ')}.`;
  const at = String(text).search(/\n\nWrite 150-250/);
  return at >= 0 ? `${text.slice(0, at)}\n\n${line}${text.slice(at)}` : `${text}\n\n${line}`;
}

module.exports = { SYSTEM, OPENING_WORDS, openingOf, sampleOpenings, othersInFolder, addDontStart };
