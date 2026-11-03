'use strict';

// ── Speech to text for a voice answer Fillout sent without a transcript ──────
// Copybot keeps the transcript Fillout sends with each recording. When the form's
// transcription is off (2 Nov 2026: Ethan's nine answers arrived with a link,
// duration and filename only), this fills the gap from our stored copy of the
// audio, through OpenAI's transcription endpoint. The key is OPENAI_API_KEY in the
// environment only; with no key createTranscriber returns null and the intake
// skips the step, logged, never an error. A transcript Fillout sent is never
// replaced by this (fillout/service.js storeAudio and transcribeMissing).

const DEFAULT_MODEL = 'gpt-4o-transcribe';
const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
const TIMEOUT_MS = 180000;
const MAX_BYTES = 25 * 1024 * 1024; // the endpoint's limit

const extFor = contentType => {
  const t = String(contentType || '').toLowerCase();
  if (t.includes('mp4') || t.includes('m4a')) return 'm4a';
  if (t.includes('wav')) return 'wav';
  if (t.includes('webm')) return 'webm';
  if (t.includes('ogg')) return 'ogg';
  return 'mp3';
};

function createTranscriber({ apiKey, model = DEFAULT_MODEL, fetchImpl = fetch, log = console } = {}) {
  if (!apiKey) return null;
  return {
    model,
    // { buffer, contentType, filename } → { text, model }. Throws on a failed call or an empty transcript.
    async transcribe({ buffer, contentType = 'audio/mpeg', filename = '' }) {
      if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('nothing to transcribe');
      if (buffer.length > MAX_BYTES) throw new Error(`recording is ${Math.round(buffer.length / 1024 / 1024)} MB, over the 25 MB limit`);
      const name = filename && /\.[a-z0-9]{2,4}$/i.test(filename) ? filename : `answer.${extFor(contentType)}`;
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: contentType }), name);
      form.append('model', model);
      form.append('language', 'en');
      form.append('response_format', 'json');
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetchImpl(ENDPOINT, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: ctrl.signal });
        const text = await res.text();
        if (!res.ok) {
          let msg = text.slice(0, 300);
          try { const j = JSON.parse(text); msg = (j.error && j.error.message) || msg; } catch (_) {}
          throw new Error(`transcription HTTP ${res.status}: ${msg}`);
        }
        let out;
        try { out = JSON.parse(text); } catch (_) { throw new Error('transcription reply was not JSON'); }
        const transcript = String(out.text || '').trim();
        if (!transcript) throw new Error('empty transcript');
        return { text: transcript, model };
      } catch (err) {
        if (err.name === 'AbortError') throw new Error(`transcription timed out after ${TIMEOUT_MS / 1000}s`);
        throw err;
      } finally { clearTimeout(timer); }
    },
  };
}

module.exports = { createTranscriber, DEFAULT_MODEL };
