'use strict';

// ── A filled legal page as the HTML the rich text field stores ──────────────
// Only what the templates use: ## headings, paragraphs, a paragraph all in **bold**,
// bullets and tables. Everything is escaped first. The # title is dropped: the page's own
// title is the H1 on the site. No words change.

const { escapeHtml } = require('../wp/markdown');

const cells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(c => escapeHtml(c.trim()));
const isRule = row => /^\|[\s:|-]+\|$/.test(row.trim());

function table(lines) {
  const body = lines.filter(l => !isRule(l));
  const [head, ...rows] = body;
  const tr = (row, tag) => `<tr>${cells(row).map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
  // Its own scroll box: the five column cookie table is wider than a phone, and with no theme
  // help it pushed the whole page sideways (7 Nov 2026, seen at 375px)
  return `<div class="llp-table-scroll" style="overflow:auto">\n<table>\n<thead>${tr(head, 'th')}</thead>\n<tbody>\n${rows.map(r => tr(r, 'td')).join('\n')}\n</tbody>\n</table>\n</div>`;
}

function paragraph(text) {
  const bold = text.match(/^\*\*(.+?)\*\*(.*)$/s);
  if (bold) return `<p><strong>${escapeHtml(bold[1])}</strong>${escapeHtml(bold[2])}</p>`;
  return `<p>${escapeHtml(text)}</p>`;
}

function legalToHtml(text) {
  const blocks = String(text || '').replace(/\r\n/g, '\n').trim().split(/\n\s*\n/);
  const out = [];
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block || /^# /.test(block)) continue;
    const lines = block.split('\n');
    if (/^## /.test(block)) out.push(`<h2>${escapeHtml(block.replace(/^## /, ''))}</h2>`);
    else if (lines.every(l => l.startsWith('- '))) out.push(`<ul>\n${lines.map(l => `<li>${escapeHtml(l.slice(2))}</li>`).join('\n')}\n</ul>`);
    else if (lines.every(l => l.startsWith('|'))) out.push(table(lines));
    else out.push(paragraph(lines.join(' ')));
  }
  return out.join('\n');
}

module.exports = { legalToHtml };
