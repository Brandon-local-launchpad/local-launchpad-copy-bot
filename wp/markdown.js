'use strict';

// The copy uses only two kinds of Markdown: links and paragraph breaks (CORE (20):
// "Nothing else in the output uses Markdown"). This turns them into the HTML an
// ACF WYSIWYG field stores. Text is HTML-escaped first; [CV: key] tokens are kept
// as they are for the site to resolve.

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    out.push(escapeHtml(text.slice(last, m.index)));
    out.push(`<a href="${escapeHtml(m[2])}">${escapeHtml(m[1])}</a>`);
    last = m.index + m[0].length;
  }
  out.push(escapeHtml(text.slice(last)));
  return out.join('');
}

function mdToHtml(md) {
  const text = String(md || '').trim();
  if (!text) return '';
  return text.split(/\n\s*\n/).map(p => `<p>${inline(p.replace(/\s*\n\s*/g, ' ').trim())}</p>`).join('\n');
}

// Back to comparable plain text (for the dry run's side by side)
function htmlToText(html) {
  return String(html || '')
    .replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<\/p>\s*<p>/gi, '\n\n').replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
}

module.exports = { mdToHtml, htmlToText, escapeHtml };
