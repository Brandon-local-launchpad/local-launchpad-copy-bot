'use strict';

// ── The legal pages ─────────────────────────────────────────────────────────
// One entry per page; the file in legal-templates/ is the only copy of its wording.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..', 'legal-templates');

const PAGES = [
  { key: 'service-terms', title: 'Service Terms', slug: '/service-terms', file: 'service-terms.md' },
  { key: 'privacy-policy', title: 'Privacy Policy', slug: '/privacy-policy', file: 'privacy-policy.md' },
  { key: 'website-terms', title: 'Website Terms of Use', slug: '/terms', file: 'website-terms.md' },
];

const pageFor = key => PAGES.find(p => p.key === key) || null;
const normalise = t => String(t).replace(/\r\n/g, '\n');
const masterTemplate = key => normalise(fs.readFileSync(path.join(DIR, pageFor(key).file), 'utf8'));
const hashOf = t => crypto.createHash('sha256').update(normalise(t)).digest('hex');

module.exports = { PAGES, pageFor, masterTemplate, hashOf, normalise };
