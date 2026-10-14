'use strict';

// The token rules the plugin applies on the site, written in JavaScript so they can
// be tested here (PHP isn't available in this environment). The plugin's
// llp_copybot_resolve() must give the same results for every case in
// wp-plugin/llp-copybot/tests/token-cases.json.
//   - [CV: key] → the stored value; a key with no value → '' (never a visible token)
//   - years_trading, when not stored, = this year − year_founded (4-digit year only)
//   - html mode (WYSIWYG fields, SEO meta): values are HTML-escaped
//   - text mode (plain fields; the theme escapes them): tags are stripped

const TOKEN_RE = /\[CV: ([a-z0-9_]+)\]/g;
const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const stripTags = s => s.replace(/<[^>]*>/g, '');

function tokenValue(key, values, year) {
  let v = values[key];
  if ((v === undefined || v === '') && key === 'years_trading' && /^\d{4}$/.test(String(values.year_founded || ''))) {
    v = String(year - parseInt(values.year_founded, 10));
  }
  return v === undefined || v === null ? '' : String(v);
}

function resolveTokens(text, values, { mode = 'text', year = new Date().getFullYear() } = {}) {
  return String(text).replace(TOKEN_RE, (m, key) => {
    const v = tokenValue(key, values, year);
    return mode === 'html' ? escapeHtml(v) : stripTags(v);
  });
}

module.exports = { resolveTokens };
