'use strict';

// Application Passwords are stored encrypted (AES-256-GCM). The key comes from the
// COPYBOT_SECRET_KEY environment variable on Railway: 32 bytes as 64 hex characters
// or base64. Without it, Copybot refuses to save a password rather than storing it
// in plain text. The password is never sent back to the browser.

const crypto = require('crypto');

function keyFrom(raw) {
  const s = String(raw || '').trim();
  if (!s) throw new Error('COPYBOT_SECRET_KEY is not set, so WordPress passwords cannot be stored. Set it on Railway (32 random bytes, hex or base64).');
  const key = /^[0-9a-f]{64}$/i.test(s) ? Buffer.from(s, 'hex') : Buffer.from(s, 'base64');
  if (key.length !== 32) throw new Error('COPYBOT_SECRET_KEY must be 32 bytes (64 hex characters, or base64 of 32 bytes).');
  return key;
}

function encrypt(plain, rawKey = process.env.COPYBOT_SECRET_KEY) {
  const key = keyFrom(rawKey);
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

function decrypt(stored, rawKey = process.env.COPYBOT_SECRET_KEY) {
  const key = keyFrom(rawKey);
  const [v, iv, tag, data] = String(stored || '').split(':');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('The stored WordPress password is not readable. Enter it again.');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
