'use strict';
// ── The card template examples: PDF lookbook → the 20 gallery images (13 Nov 2026, Brandon) ──
// The Review & Referral Cards tab's Templates gallery shows four example images per template
// (review front and back, referral front and back). They come from Brandon's two lookbook PDFs:
// one page per template, the front and back side by side on a grey page with a title above.
// This renders every page, works out which template it shows (the ID printed on the page, else
// the demo business name), finds the two cards on the page, crops each one out with a small even
// margin (no lookbook title or caption) and saves it as WebP, longest side 1200px:
//   public/card-templates/review/3a-midnight-front.webp   … 20 files in all
// A one-off import, run again when the templates change:
//   node scripts/import-card-templates.js "<review lookbook.pdf>" "<referral lookbook.pdf>"
// Which lookbook a PDF is, is read off its pages (the word Referral); --dry lists what it found
// and writes nothing. Dev only: mupdf is a dev dependency and the server never loads it.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'card-templates');
const TEMPLATES = [
  { id: '3a', stem: '3a-midnight', demo: 'James Eclectic' },
  { id: '3b', stem: '3b-paper', demo: 'White & Co Plumbing' },
  { id: '3c', stem: '3c-deep', demo: 'Greenline Gardens' },
  { id: '3d', stem: '3d-photo', demo: 'Mason & Sons Builders' },
  { id: '3e', stem: '3e-craft', demo: 'Oak & Iron Joinery' },
];
const DPI = 300;          // rendered above the 200 the cards need, so the small referral card is never scaled up
const LONGEST = 1200;
const MARGIN = 0.003;     // of the page width, round each card's own soft edge (more would take in the FRONT and BACK captions)

// Which template a page shows: the ID printed on it first, else the demo business
function templateOf(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  const id = (t.match(/^(3[a-e])\b/i) || [])[1];
  return TEMPLATES.find(x => id && x.id === id.toLowerCase()) || TEMPLATES.find(x => t.includes(x.demo)) || null;
}

// The cards on a page: the wide solid blocks that differ from the page's own background.
// Returns boxes in pixels, left to right. Pure on a raw RGB buffer.
function findCards(raw, width, height) {
  const bg = [raw[0], raw[1], raw[2]];
  const on = (x, y) => { const i = (y * width + x) * 3; return Math.abs(raw[i] - bg[0]) + Math.abs(raw[i + 1] - bg[1]) + Math.abs(raw[i + 2] - bg[2]) > 9; };
  const cols = new Array(width).fill(0);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (on(x, y)) cols[x]++;
  const runs = (counts, min) => {
    const out = []; let start = -1;
    counts.forEach((c, i) => { if (c >= min && start < 0) start = i; if ((c < min || i === counts.length - 1) && start >= 0) { out.push([start, c < min ? i - 1 : i]); start = -1; } });
    return out;
  };
  const boxes = [];
  for (const [x0, x1] of runs(cols, height * 0.2).filter(([a, b]) => b - a > width * 0.2)) {
    const rows = new Array(height).fill(0);
    for (let y = 0; y < height; y++) for (let x = x0; x <= x1; x++) if (on(x, y)) rows[y]++;
    const tall = runs(rows, (x1 - x0) * 0.6).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
    if (tall) boxes.push({ x0, x1, y0: tall[0], y1: tall[1] });
  }
  return boxes;
}

// A light card on the grey page (3b Paper) can be found short, or not at all. Every page of one
// lookbook is laid out the same, so a box that is not where the other pages have theirs takes theirs.
function settle(pages, width) {
  const median = xs => xs.slice().sort((p, q) => p - q)[Math.floor(xs.length / 2)];
  const good = pages.filter(p => p.boxes.length === 2);
  if (!good.length) return pages.map(p => ({ ...p, boxes: [] }));
  const usual = [0, 1].map(n => Object.fromEntries(['x0', 'x1', 'y0', 'y1'].map(k => [k, median(good.map(p => p.boxes[n][k]))])));
  const near = (b, u) => b && ['x0', 'x1', 'y0', 'y1'].every(k => Math.abs(b[k] - u[k]) <= width * 0.01);
  return pages.map(p => ({ ...p, boxes: usual.map((u, n) => (p.boxes.length === 2 && near(p.boxes[n], u) ? p.boxes[n] : u)), settled: usual.some((u, n) => !(p.boxes.length === 2 && near(p.boxes[n], u))) }));
}

async function importPdf(file, { dry = false, log = console.log } = {}) {
  const mupdf = await import('mupdf');
  const doc = mupdf.Document.openDocument(fs.readFileSync(file), 'application/pdf');
  let pages = [], width = 0;
  for (let i = 0; i < doc.countPages(); i++) {
    const page = doc.loadPage(i);
    const text = page.toStructuredText('preserve-whitespace').asText();
    const tpl = templateOf(text);
    if (!tpl) { log(`  page ${i + 1}: no template ID or demo business found, skipped`); continue; }
    const kind = /referral/i.test(text.slice(0, 200)) || /given a gift/i.test(text) ? 'referral' : 'review';
    const png = Buffer.from(page.toPixmap(mupdf.Matrix.scale(DPI / 72, DPI / 72), mupdf.ColorSpace.DeviceRGB, false, true).asPNG());
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    width = info.width;
    pages.push({ n: i + 1, tpl, kind, png, info, boxes: findCards(data, info.width, info.height) });
  }
  pages = settle(pages, width);
  const done = [];
  for (const p of pages) {
    if (p.boxes.length !== 2) { log(`  page ${p.n} (${p.tpl.id} ${p.kind}): the two cards could not be found, skipped`); continue; }
    // Left is the front on both lookbooks (the page says FRONT · BACK)
    for (const [n, side] of [[0, 'front'], [1, 'back']]) {
      const b = p.boxes[n], m = Math.round(p.info.width * MARGIN);
      const left = Math.max(0, b.x0 - m), top = Math.max(0, b.y0 - m);
      const w = Math.min(p.info.width, b.x1 + m + 1) - left, h = Math.min(p.info.height, b.y1 + m + 1) - top;
      const rel = `${p.kind}/${p.tpl.stem}-${side}.webp`;
      if (!dry) {
        fs.mkdirSync(path.join(OUT, p.kind), { recursive: true });
        await sharp(p.png).extract({ left, top, width: w, height: h }).resize({ width: w >= h ? LONGEST : null, height: h > w ? LONGEST : null }).webp({ quality: 86 }).toFile(path.join(OUT, rel));
      }
      done.push({ file: rel, page: p.n, pdf: path.basename(file) });
      log(`  page ${p.n} → ${rel} (${w}x${h} at ${DPI} dpi${p.settled ? ', placed where the other pages have the card' : ''})`);
    }
  }
  return done;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const files = args.filter(a => !a.startsWith('--'));
  if (!files.length) { console.error('Usage: node scripts/import-card-templates.js "<lookbook.pdf>" ["<lookbook.pdf>"] [--dry]'); process.exit(1); }
  const done = [];
  for (const f of files) { console.log(path.basename(f)); done.push(...await importPdf(f, { dry })); }
  const want = ['review', 'referral'].flatMap(k => TEMPLATES.flatMap(t => ['front', 'back'].map(s => `${k}/${t.stem}-${s}.webp`)));
  const missing = want.filter(w => !done.some(d => d.file === w));
  console.log(`\n${done.length} image${done.length === 1 ? '' : 's'} ${dry ? 'found' : 'written'}${missing.length ? `; not in ${files.length === 1 ? 'this PDF' : 'these PDFs'}: ${missing.join(', ')}` : '; none missing'}`);
}

if (require.main === module) main().catch(err => { console.error(err.message); process.exit(1); });
module.exports = { TEMPLATES, templateOf, findCards, settle };
