'use strict';

// ── QR codes: reading an uploaded code (14 Nov 2026, Brandon) ────────────────────────────────
// A QR downloaded from QR.io as PNG or SVG → the text it holds. sharp turns the file into
// pixels on a white background with a quiet border; jsQR reads them. Nothing leaves the server.
//   kindOf(buffer)   'png', 'svg' or null: by what the file is, not what it is called
//   decode(buffer)   the text in the code, or null when it cannot be read
// A file that is not a picture, a picture with no code in it, and a code too damaged to read
// all come back null: the person is told to download it again.

const sharp = require('sharp');
const jsQR = require('jsqr');

const MAX_BYTES = 5 * 1024 * 1024;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function kindOf(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return null;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG)) return 'png';
  const head = buffer.subarray(0, 4096).toString('utf8').replace(/^﻿/, '');
  return /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(head) ? 'svg' : null;
}

// One try at one size: the code on white, with a quiet border round it
async function read(buffer, kind, size) {
  const pad = Math.round(size / 12);
  const { data, info } = await sharp(buffer, kind === 'svg' ? { density: 300 } : {})
    .flatten({ background: '#ffffff' })
    .resize({ width: size, height: size, fit: 'contain', background: '#ffffff' })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const hit = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), info.width, info.height, { inversionAttempts: 'attemptBoth' });
  return hit && typeof hit.data === 'string' && hit.data.trim() ? hit.data.trim() : null;
}

async function decode(buffer) {
  const kind = kindOf(buffer);
  if (!kind || buffer.length > MAX_BYTES) return null;
  for (const size of [800, 400, 1400]) {
    try { const text = await read(buffer, kind, size); if (text) return text; } catch (_) { return null; }   // a file sharp cannot open is not a code
  }
  return null;
}

module.exports = { kindOf, decode, MAX_BYTES };
