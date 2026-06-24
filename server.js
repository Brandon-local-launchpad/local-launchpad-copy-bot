'use strict';

// Load .env into process.env (no dotenv package required)
try {
  const envPath = require('path').join(__dirname, '.env');
  require('fs').readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
} catch (_) {}

const express   = require('express');
const Anthropic  = require('@anthropic-ai/sdk');
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const multer     = require('multer');
const Papa       = require('papaparse');
const JSZip      = require('jszip');
const { validate } = require('./validate');
const { pool, initDb } = require('./db');

const app = express();
app.use(express.json({ limit: '4mb' }));

// ── Auth middleware ───────────────────────────────────────────────────────────

const APP_PASSWORD = process.env.APP_PASSWORD || '';
const APP_SECRET   = process.env.APP_SECRET   || crypto.randomBytes(32).toString('hex');

function signToken(password) {
  return crypto.createHmac('sha256', APP_SECRET).update(password).digest('hex');
}

function parseCookies(req) {
  const map = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) map[k.trim()] = decodeURIComponent(v.join('='));
  });
  return map;
}

function requireAuth(req, res, next) {
  if (!APP_PASSWORD) return next(); // no password set — open access
  const cookies = parseCookies(req);
  if (cookies.ll_auth === signToken(APP_PASSWORD)) return next();
  // Allow API calls to return 401 rather than HTML
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorised' });
  res.redirect('/login.html');
}

app.use(express.static(path.join(__dirname, 'public')));

// Login endpoint
app.post('/auth/login', express.urlencoded({ extended: false }), (req, res) => {
  const { password } = req.body;
  if (password === APP_PASSWORD) {
    const token   = signToken(APP_PASSWORD);
    const maxAge  = 30 * 24 * 3600; // 30 days
    res.setHeader('Set-Cookie', `ll_auth=${token}; Path=/; HttpOnly; Max-Age=${maxAge}; SameSite=Lax`);
    return res.redirect('/clients.html');
  }
  res.redirect('/login.html?error=1');
});

app.post('/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'll_auth=; Path=/; HttpOnly; Max-Age=0');
  res.redirect('/login.html');
});

// Protect all routes below this point
app.use((req, res, next) => {
  // Static files and login page are already served above — only API and page routes hit this
  requireAuth(req, res, next);
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Load core prompt files ────────────────────────────────────────────────────

function readDoc(name) {
  const base = name.replace(/\.md$/, '');
  // Scan directory for all numbered copies, pick the highest
  const files = fs.readdirSync(__dirname);
  let best = null;
  let bestN = -1;
  for (const f of files) {
    if (f === `${base}.md`) { if (bestN < 0) { best = f; bestN = 0; } }
    const m = f.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\((\\d+)\\)\\.md$`));
    if (m) { const n = parseInt(m[1], 10); if (n > bestN) { best = f; bestN = n; } }
  }
  if (best) {
    console.log(`  LOADED: ${best}`);
    return fs.readFileSync(path.join(__dirname, best), 'utf8');
  }
  throw new Error(`Cannot find ${name} (or numbered copies) in ${__dirname}`);
}

console.log('Loading prompt files...');
const HOMEPAGE_PROMPT = readDoc('Homepage_Copywriting_Prompt_CORE.md');
const CATEGORY_PROMPT = readDoc('Category_Page_Copywriting_Prompt_CORE.md');
const SERVICE_PROMPT  = readDoc('Service_Page_Copywriting_Prompt_CORE.md');
const LOCATION_PROMPT = readDoc('Location_Page_Copywriting_Prompt_CORE.md');

// ── Load calibration packs ────────────────────────────────────────────────────

function loadCalibrationPacks() {
  const packs = {};
  const searchDirs = [
    path.join(__dirname, 'calibration-packs'),
    __dirname,
  ];

  console.log('Loading calibration packs...');
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!/_Calibration_Pack_All_Page_Types\.md$/i.test(file)) continue;
      const tradeName = file
        .replace(/_Calibration_Pack_All_Page_Types\.md$/i, '')
        .replace(/_/g, ' ');
      if (!(tradeName in packs)) {
        packs[tradeName] = fs.readFileSync(path.join(dir, file), 'utf8');
        console.log(`  CALIBRATION PACK: ${file} → trade "${tradeName}"`);
      }
    }
  }
  return packs;
}

const CALIBRATION_PACKS = loadCalibrationPacks();
const AVAILABLE_TRADES  = Object.keys(CALIBRATION_PACKS);

if (AVAILABLE_TRADES.length === 0) {
  console.warn('WARNING: No calibration packs found. Add [Trade]_Calibration_Pack_All_Page_Types.md to /calibration-packs/ or project root.');
}

// Alias for legacy single-page routes (uses first loaded pack)
const CALIBRATION_PACK = CALIBRATION_PACKS[AVAILABLE_TRADES[0]] || '';

// ── In-memory session / download stores ──────────────────────────────────────

const sessions  = new Map();
const downloads = new Map();
// Batch jobs can take Anthropic up to 24h to finish — kept in memory as a fast
// path, with Postgres (batch_jobs table) as the durable fallback so a status
// check still works after a server restart, as long as DB is configured.
const batchJobs = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions)   { if (now - s.createdAt > 2 * 3600000)  sessions.delete(id); }
  for (const [id, d] of downloads)  { if (now - d.createdAt > 4 * 3600000)  downloads.delete(id); }
  for (const [id, b] of batchJobs)  { if (now - b.createdAt > 48 * 3600000) batchJobs.delete(id); }
}, 3600000);

// ── File upload middleware ────────────────────────────────────────────────────

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 30 } });

// ── CSV / zip parsing ─────────────────────────────────────────────────────────

const PAGE_TYPE_MAP = {
  'Homepage':          'homepage',
  'Category':          'category',
  'Service':           'service',
  'Location':          'location',
  'Location Category': 'location-category',
};

function parsePageMap(csvText) {
  // CSVs often have preamble rows (title, subtitle, blank) before the real header.
  // Find the first line that starts with "Page Type" and parse from there.
  const lines = csvText.split('\n');
  const headerIdx = lines.findIndex(line => /^Page Type[,\t"]/i.test(line.trim()));
  if (headerIdx < 0) throw new Error('Page map CSV is missing a "Page Type" header row.');
  const cleanedCsv = lines.slice(headerIdx).join('\n');

  const { data } = Papa.parse(cleanedCsv, { header: true, skipEmptyLines: true });
  const pages = [];
  for (const row of data) {
    const rawType = (row['Page Type'] || '').trim();
    const pageType = PAGE_TYPE_MAP[rawType];
    if (!pageType) continue; // skips section headers like "🏠 Homepage" and empty rows
    const pageTitle = (row['Page Title'] || '').trim();

    // For Location Category pages, extract "Category — Location" from the title
    let locationCategoryName = null;
    let locationName = null;
    if (pageType === 'location-category') {
      const m = pageTitle.match(/^(.+?)\s+[—–-]+\s+(.+)$/);
      locationCategoryName = m ? m[1].trim() : pageTitle;
      locationName         = m ? m[2].trim() : '';
    }

    pages.push({
      pageType,
      pageTitle,
      urlSlug:              (row['URL Slug']    || '').trim(),
      h1:                   (row['H1 (Ahrefs)'] || '').trim(),
      status:               (row['Status']      || '').trim(),
      locationCategoryName,
      locationName,
    });
  }
  return pages;
}

function parseCustomValues(csvTexts) {
  const keyValueMap     = {};
  const serviceParentMap = {};
  let currentCategory   = null;

  for (const text of csvTexts) {
    const { data, meta } = Papa.parse(text, { header: true, skipEmptyLines: true });

    // The real column headers are buried in a sub-header row (PapaParse's own
    // header row is usually a description/instructions line), so detect which
    // PapaParse-assigned column name actually holds "Value" by scanning row
    // contents for the literal label text, rather than assuming a fixed column
    // position. Sheets like "Master Cross-Reference" use the same key column
    // but put "Appears On (Short)" where other tabs put "Value" — if this tab
    // has no real Value column, skip it entirely instead of misreading that
    // column as the value.
    let keyColumn = null;
    let valueColumn = null;
    for (const row of data) {
      for (const col of meta.fields) {
        const cell = (row[col] || '').trim().toLowerCase();
        if (!keyColumn && (cell === 'ghl custom value key' || cell === 'ghl key')) keyColumn = col;
        if (!valueColumn && cell === 'value') valueColumn = col;
      }
      if (keyColumn && valueColumn) break;
    }
    if (!valueColumn) {
      console.log(`\n── parseCustomValues: skipping a custom values file — no "Value" column found (columns: ${meta.fields.join(', ')}) ──\n`);
      continue;
    }
    keyColumn = keyColumn || '';

    for (const row of data) {
      const rawKey = (row[keyColumn] || '').trim();
      const value  = (row[valueColumn] || '').trim();
      // Only accept rows whose key is a GHL placeholder or bare snake_case identifier
      if (!rawKey.startsWith('{{custom_values.') && !/^[a-z_]\w*$/.test(rawKey)) continue;
      if (!value || value.startsWith('← NEEDS FILLING IN')) continue;
      const key = rawKey.replace(/^\{\{custom_values\./, '').replace(/\}\}$/, '');
      if (!(key in keyValueMap)) keyValueMap[key] = value;
      if (/^category_\d+$/.test(key))                               { currentCategory = value; }
      else if (/^service_\d+$/.test(key) && currentCategory)        { if (!(key in serviceParentMap)) serviceParentMap[key] = currentCategory; }
    }
  }
  return { keyValueMap, serviceParentMap };
}

function parseOnboardingForm(csvText) {
  const { data } = Papa.parse(csvText, { header: false });
  if (data.length < 2) return '';
  const questions = data[0];
  const answers   = data[1];
  return questions
    .map((q, i) => ({ q: (q || '').trim(), a: (answers[i] || '').trim() }))
    .filter(({ q, a }) => q && a)
    .map(({ q, a }) => `Q: ${q}\nA: ${a}`)
    .join('\n\n');
}

function identifyFiles(files) {
  const identified = { pageMap: null, customValues: [], onboarding: null, geo: null };
  for (const file of files) {
    const n = file.originalname.toLowerCase();
    if (/page/.test(n) && /map/.test(n)) {
      identified.pageMap = file;
    } else if ((/cat/.test(n) || /custom/.test(n)) && /value/.test(n)) {
      identified.customValues.push(file);
    } else if (/onboard/.test(n) || /form/.test(n)) {
      identified.onboarding = file;
    } else if (/geo/.test(n) || /research/.test(n)) {
      identified.geo = file;
    }
  }
  const missing = [];
  if (!identified.pageMap)             missing.push('Page map (filename must contain "page" and "map")');
  if (!identified.customValues.length) missing.push('Custom values (filename must contain "cat"/"custom" and "value")');
  if (!identified.onboarding)          missing.push('Onboarding form (filename must contain "onboard" or "form")');
  if (!identified.geo)                 missing.push('Geo research (filename must contain "geo" or "research")');
  return { identified, missing };
}

// ── H1 validation / assignment ────────────────────────────────────────────────

function processH1s(pages, keyValueMap) {
  const biz_area_1 = keyValueMap['biz_area_1'] || '';
  const missing = [];
  for (const page of pages) {
    if (['done', 'live'].includes(page.status.toLowerCase())) continue;
    if (page.pageType === 'service') {
      page.h1 = `${page.pageTitle} ${biz_area_1}`.trim();
    } else if (!page.h1) {
      missing.push({ pageTitle: page.pageTitle, urlSlug: page.urlSlug, pageType: page.pageType });
    }
  }
  return missing;
}

// ── Prompt assembly ───────────────────────────────────────────────────────────

function buildPageContext(job, keyValueMap, serviceParentMap) {
  const { pageType, pageTitle, h1 } = job;
  if (pageType === 'homepage') {
    return `TARGET PAGE: Homepage\nH1: ${h1}\nNote: Use this H1 directly in the HERO H1 field. Do not output [INSERT H1 FROM AHREFS].`;
  }
  if (pageType === 'category') {
    return `TARGET PAGE: Category Page\nTARGET CATEGORY: ${pageTitle}\nH1: ${h1}\nNote: Use this H1 directly in the HERO H1 field.`;
  }
  if (pageType === 'location-category') {
    const categoryName = job.locationCategoryName || pageTitle;
    const locName      = job.locationName ? `\nTARGET LOCATION: ${job.locationName}` : '';
    return `TARGET PAGE: Location Category Page\nTARGET CATEGORY: ${categoryName}${locName}\nH1: ${h1}\nNote: Use this H1 directly in the HERO H1 field.`;
  }
  if (pageType === 'service') {
    const serviceKey = Object.keys(keyValueMap).find(k =>
      /^service_\d+$/.test(k) && keyValueMap[k].toLowerCase() === pageTitle.toLowerCase()
    );
    const parentCategory = serviceKey
      ? (serviceParentMap[serviceKey] || keyValueMap['category_1'] || '')
      : (keyValueMap['category_1'] || '');
    return `TARGET PAGE: Service Page\nTARGET SERVICE: ${pageTitle}\nPARENT CATEGORY: ${parentCategory}\nH1: ${h1}\nNote: Use this H1 directly in the HERO H1 field.`;
  }
  if (pageType === 'location') {
    return `TARGET PAGE: Location Page\nTARGET LOCATION: ${pageTitle}\nH1: ${h1}\nNote: Use this H1 directly in the HERO H1 field.`;
  }
  return '';
}

const CORE_PROMPTS = { homepage: HOMEPAGE_PROMPT, category: CATEGORY_PROMPT, 'location-category': CATEGORY_PROMPT, service: SERVICE_PROMPT, location: LOCATION_PROMPT };

// Returns { system, userContent } instead of one flat string, so the static
// portion (core prompt + calibration pack + client custom values/geo/onboarding —
// identical for every page in this batch) can be sent as cacheable system
// blocks, while only the per-page TARGET PAGE block varies per call. Anthropic
// caches the longest prefix ending at a cache_control breakpoint, so the
// breakpoint sits on the LAST static block — everything before it (core prompt,
// calibration pack) is covered by the same cache hit.
function buildSitePrompt(job, calibrationPack, keyValueMap, serviceParentMap, geoResearch, onboardingText) {
  const cvList      = Object.entries(keyValueMap).filter(([, v]) => v).map(([k, v]) => `{{custom_values.${k}}}: ${v}`).join('\n');
  console.log('\n── DEBUG cvList (first 20 lines) ──\n' + cvList.split('\n').slice(0, 20).join('\n') + '\n──────────────────────────────────\n');
  const clientBlock = `## CLIENT PROJECT KNOWLEDGE\n\n### GHL Custom Values\n${cvList}\n\n### Geographical Research and Context\n${geoResearch.trim()}\n\n### Client Onboarding Form\n${onboardingText}`;
  return {
    system: [
      { type: 'text', text: CORE_PROMPTS[job.pageType].trim() },
      { type: 'text', text: calibrationPack.trim() },
      { type: 'text', text: clientBlock, cache_control: { type: 'ephemeral' } },
    ],
    userContent: buildPageContext(job, keyValueMap, serviceParentMap),
  };
}

// ── Anthropic call with 429 retry ─────────────────────────────────────────────

async function callClaude(client, promptParts, maxTokens = 8192) {
  const params = {
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: promptParts.system,
    messages: [{ role: 'user', content: promptParts.userContent }],
  };
  const options = { headers: { 'anthropic-beta': 'prompt-caching-2024-07-31' } };
  try {
    return await client.messages.create(params, options);
  } catch (err) {
    if (err.status === 429) {
      await sleep(30000);
      return await client.messages.create(params, options);
    }
    throw err;
  }
}

// ── Output file builder ───────────────────────────────────────────────────────

function buildOutputFile(results, skippedPages, companyName) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const failed    = results.filter(r => r.status === 'failed').length;
  const lines     = [
    '=====================================',
    'LOCAL LAUNCHPAD COPY BOT — OUTPUT',
    `Client: ${companyName || 'Unknown'}`,
    `Generated: ${timestamp}`,
    `Total pages: ${results.length}`,
    `Failed: ${failed}`,
    '=====================================',
    '',
  ];

  if (skippedPages.length > 0) {
    lines.push('SKIPPED PAGES', '-------------------------------------');
    for (const p of skippedPages) lines.push(`${p.pageTitle} (${p.urlSlug}) — ${p.skipReason}`);
    lines.push('', '=====================================', '');
  }

  for (const r of results) {
    lines.push(
      '-------------------------------------',
      `PAGE: ${r.pageTitle}`,
      `TYPE: ${r.pageType}`,
      `SLUG: ${r.urlSlug}`,
      `H1: ${r.h1}`,
      '-------------------------------------',
    );
    if (r.status === 'failed') {
      lines.push('STATUS: FAILED', `ERROR: ${r.error || 'Unknown error'}`);
    } else {
      lines.push('VALIDATION ISSUES:');
      lines.push(r.issues && r.issues.length > 0
        ? r.issues.map(i => `[${i.type}] Check ${i.check}: ${i.message}`).join('\n')
        : 'None');
      lines.push('', 'COPY OUTPUT:', r.output || '');
    }
    lines.push('', '-------------------------------------', '');
  }
  return lines.join('\n');
}

// ── New site-generation routes ────────────────────────────────────────────────

app.get('/api/trades', (_req, res) => res.json({ trades: AVAILABLE_TRADES }));

app.post('/api/parse-zip', upload.array('files', 30), (req, res) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded.' });
    const trade    = (req.body.trade    || '').trim();
    const clientId = (req.body.clientId || '').trim() || null;
    if (!CALIBRATION_PACKS[trade]) {
      return res.status(400).json({ error: `Unknown trade: "${trade}". Available: ${AVAILABLE_TRADES.join(', ')}` });
    }

    const { identified, missing } = identifyFiles(req.files);
    if (missing.length) return res.status(400).json({ error: 'Missing required files', missing });

    const readText = file => file.buffer.toString('utf8');

    const pages           = parsePageMap(readText(identified.pageMap));
    const { keyValueMap, serviceParentMap } = parseCustomValues(identified.customValues.map(readText));
    const cvPreview = Object.entries(keyValueMap).filter(([, v]) => v)
      .map(([k, v]) => `{{custom_values.${k}}}: ${v}`)
      .slice(0, 20).join('\n');
    console.log(`\n── DEBUG keyValueMap after parse (${Object.keys(keyValueMap).length} keys total) ──\n${cvPreview || '(empty)'}\n──────────────────────────────────────────\n`);
    const onboardingText  = parseOnboardingForm(readText(identified.onboarding));
    const geoResearch     = readText(identified.geo);

    const missingH1s = processH1s(pages, keyValueMap);

    const primaryArea  = (keyValueMap['biz_area_1'] || '').toLowerCase().trim();
    const jobs         = pages.filter(p => {
      if (['done', 'live'].includes(p.status.toLowerCase())) return false;
      // Location-category pages for the primary city are served by the category page — skip them
      if (p.pageType === 'location-category' && primaryArea) {
        const loc = (p.locationName || '').toLowerCase().trim() || p.pageTitle.toLowerCase().trim();
        if (loc === primaryArea || loc.endsWith(' ' + primaryArea)) return false;
      }
      return true;
    });
    const skippedPages = pages
      .filter(p => ['done', 'live'].includes(p.status.toLowerCase()))
      .map(p => ({ ...p, skipReason: `Status: ${p.status}` }));

    const sessionId = crypto.randomUUID();
    const rawCustomValuesCsvs = identified.customValues.map(readText);
    sessions.set(sessionId, { createdAt: Date.now(), trade, clientId, jobs, skippedPages, keyValueMap, serviceParentMap, onboardingText, geoResearch, rawCustomValuesCsvs });

    const byType = {};
    for (const j of jobs) byType[j.pageType] = (byType[j.pageType] || 0) + 1;

    const filesIdentified = [
      { name: identified.pageMap.originalname,         type: 'Page Map' },
      ...identified.customValues.map(f => ({ name: f.originalname, type: 'Custom Values' })),
      { name: identified.onboarding.originalname,      type: 'Onboarding Form' },
      { name: identified.geo.originalname,             type: 'Geo Research' },
    ];

    res.json({
      sessionId,
      filesIdentified,
      jobs: jobs.map(j => ({ pageType: j.pageType, pageTitle: j.pageTitle, urlSlug: j.urlSlug })),
      summary: { total: jobs.length, byType, skipped: skippedPages.length },
      missingH1s,
      skippedPages,
      estimatedCost: (jobs.length * 0.06).toFixed(2),
    });
  } catch (err) {
    console.error('Parse error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/session/:sessionId/select', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired.' });
  const { slugs } = req.body;
  session.selectedSlugs = Array.isArray(slugs) ? new Set(slugs) : null;
  res.json({ ok: true, count: session.selectedSlugs ? session.selectedSlugs.size : session.jobs.length });
});

// ── Batch generation (Anthropic Message Batches API) ──────────────────────────
//
// Replaces the old synchronous-loop-over-SSE approach: every page in the run
// is submitted as one independent request inside a single Anthropic batch.
// Anthropic processes the whole batch asynchronously (can take minutes to up
// to 24h) — there is no live per-page progress stream to hold open, which
// sidesteps the Railway idle-timeout/connection-drop problem entirely rather
// than working around it. The VA submits once, then polls a status endpoint
// whenever they want to check in.

async function loadBatchRecord(batchId) {
  if (batchJobs.has(batchId)) return batchJobs.get(batchId);
  if (!pool) return null;
  const { rows } = await pool.query('SELECT * FROM batch_jobs WHERE id = $1', [batchId]);
  if (!rows.length) return null;
  const row = rows[0];
  const record = {
    id: row.id, clientId: row.client_id, anthropicBatchId: row.anthropic_batch_id,
    trade: row.trade, jobsMeta: row.jobs_meta, customValuesText: row.custom_values_text,
    skippedPages: row.skipped_pages, companyName: row.company_name, total: row.total,
    status: row.status, downloadId: row.download_id, createdAt: new Date(row.created_at).getTime(),
    finalSummary: row.status === 'complete' ? { downloadId: row.download_id } : null,
  };
  batchJobs.set(batchId, record);
  return record;
}

async function persistBatchRecord(record) {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO batch_jobs (id, client_id, anthropic_batch_id, trade, jobs_meta, custom_values_text, skipped_pages, company_name, total, status, download_id, created_at, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,to_timestamp($12/1000.0),CASE WHEN $10 = 'complete' THEN NOW() ELSE NULL END)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, download_id = EXCLUDED.download_id,
         completed_at = CASE WHEN EXCLUDED.status = 'complete' THEN NOW() ELSE batch_jobs.completed_at END`,
      [record.id, record.clientId, record.anthropicBatchId, record.trade, JSON.stringify(record.jobsMeta),
       record.customValuesText, JSON.stringify(record.skippedPages), record.companyName, record.total,
       record.status, record.downloadId || null, record.createdAt]
    );
  } catch (dbErr) {
    console.error('[DB] Batch record save error:', dbErr.message);
  }
}

app.post('/api/generate-batch/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired.' });

  try {
    const { trade, skippedPages, keyValueMap, serviceParentMap, onboardingText, geoResearch, selectedSlugs, clientId } = session;
    const allJobs = selectedSlugs ? session.jobs.filter(j => selectedSlugs.has(j.urlSlug)) : session.jobs;
    const rawStartIndex = parseInt(req.body.startIndex, 10);
    const startIndex     = Number.isInteger(rawStartIndex) && rawStartIndex > 0 ? rawStartIndex : 0;
    const jobs           = startIndex > 0 ? allJobs.slice(startIndex) : allJobs;
    if (!jobs.length) return res.status(400).json({ error: 'No pages to generate (check startIndex against the total page count).' });

    const calibrationPack  = CALIBRATION_PACKS[trade];
    const customValuesText = Object.entries(keyValueMap).map(([k, v]) => `${k}: ${v}`).join('\n');
    const client            = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const requests = jobs.map((job, i) => {
      const promptParts = buildSitePrompt(job, calibrationPack, keyValueMap, serviceParentMap, geoResearch, onboardingText);
      const maxTokens    = (job.pageType === 'category' || job.pageType === 'location-category') ? 16000 : 8192;
      return {
        custom_id: `p${i}`,
        params: {
          model: 'claude-sonnet-4-6',
          max_tokens: maxTokens,
          system: promptParts.system,
          messages: [{ role: 'user', content: promptParts.userContent }],
        },
      };
    });

    const batch = await client.messages.batches.create({ requests });

    // Save client_assets up front so single-page regeneration works even before
    // this batch finishes.
    if (clientId && pool) {
      try {
        await pool.query(`DELETE FROM client_assets WHERE client_id = $1`, [clientId]);
        const assetRows = [
          { type: 'geo_research', content: geoResearch },
          { type: 'onboarding',   content: onboardingText },
          ...(session.rawCustomValuesCsvs || []).map(content => ({ type: 'custom_values', content })),
        ];
        for (const asset of assetRows) {
          await pool.query(`INSERT INTO client_assets (client_id, asset_type, content) VALUES ($1, $2, $3)`, [clientId, asset.type, asset.content]);
        }
      } catch (dbErr) {
        console.error('[DB] Asset save error:', dbErr.message);
      }
    }

    const batchId = crypto.randomUUID();
    const companyName = keyValueMap['company_name'] || '';
    const record = {
      id: batchId,
      clientId: clientId || null,
      anthropicBatchId: batch.id,
      trade,
      jobsMeta: jobs.map(j => ({ pageType: j.pageType, pageTitle: j.pageTitle, urlSlug: j.urlSlug, h1: j.h1, locationName: j.locationName, locationCategoryName: j.locationCategoryName })),
      customValuesText,
      skippedPages: startIndex > 0 ? [] : skippedPages, // avoid double-listing skipped pages across resumed sub-batches
      companyName,
      total: jobs.length,
      status: 'in_progress',
      downloadId: null,
      createdAt: Date.now(),
    };
    batchJobs.set(batchId, record);
    await persistBatchRecord(record);

    res.json({ batchId, anthropicBatchId: batch.id, total: jobs.length, startIndex });
  } catch (err) {
    console.error('[generate-batch] Submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/batch-status/:batchId', async (req, res) => {
  try {
    const record = await loadBatchRecord(req.params.batchId);
    if (!record) return res.status(404).json({ error: 'Batch not found or expired.' });

    if (record.status === 'complete') {
      return res.json({ status: 'complete', downloadId: record.downloadId, total: record.total, summary: record.finalSummary });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const anthropicBatch = await client.messages.batches.retrieve(record.anthropicBatchId);

    if (anthropicBatch.processing_status !== 'ended') {
      return res.json({
        status: 'in_progress',
        processingStatus: anthropicBatch.processing_status,
        counts: anthropicBatch.request_counts,
        total: record.total,
      });
    }

    // Batch has ended — pull results, validate each, save to DB, build the download.
    const results = new Array(record.jobsMeta.length);
    for await (const line of await client.messages.batches.results(record.anthropicBatchId)) {
      const idx = parseInt(line.custom_id.slice(1), 10);
      const job = record.jobsMeta[idx];
      if (!job) continue;

      if (line.result.type === 'succeeded') {
        const message = line.result.message;
        const output   = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
        const issues   = validate(output, job.h1, record.customValuesText, job.pageType, {
          pageTitle: job.pageTitle, locationName: job.locationName, locationCategoryName: job.locationCategoryName,
        });
        results[idx] = { ...job, output, issues, usage: message.usage, status: 'done', error: null };
      } else {
        results[idx] = { ...job, output: '', issues: [], usage: null, status: 'failed', error: `Batch result: ${line.result.type}` };
      }
    }

    // Save each completed page to the DB.
    if (record.clientId && pool) {
      for (const r of results) {
        if (!r || r.status !== 'done') continue;
        try {
          await pool.query(
            `INSERT INTO pages (client_id, page_type, page_title, url_slug, h1, copy_output, issues, generated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
             ON CONFLICT (client_id, url_slug) DO UPDATE
               SET copy_output = EXCLUDED.copy_output, issues = EXCLUDED.issues,
                   generated_at = NOW(), edited_at = NULL`,
            [record.clientId, r.pageType, r.pageTitle, r.urlSlug, r.h1, r.output, JSON.stringify(r.issues)]
          );
        } catch (dbErr) {
          console.error(`[DB] Page save error for ${r.urlSlug}:`, dbErr.message);
        }
      }
    }

    const outputText = buildOutputFile(results.filter(Boolean), record.skippedPages, record.companyName);
    const downloadId = crypto.randomUUID();
    const safeClient  = record.companyName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'output';
    downloads.set(downloadId, { createdAt: Date.now(), text: outputText, filename: `${safeClient}_copy_bot_output.txt`, results: results.filter(Boolean), safeClient });

    // Batch API pricing is 50% off standard rates. Prompt caching discounts
    // (cache writes 1.25x input, cache reads 0.1x input) still apply on top.
    const inputTokens      = results.reduce((s, r) => s + (r?.usage?.input_tokens               || 0), 0);
    const outputTokens     = results.reduce((s, r) => s + (r?.usage?.output_tokens              || 0), 0);
    const cacheWriteTokens  = results.reduce((s, r) => s + (r?.usage?.cache_creation_input_tokens || 0), 0);
    const cacheReadTokens   = results.reduce((s, r) => s + (r?.usage?.cache_read_input_tokens     || 0), 0);
    const doneResults  = results.filter(r => r && r.status === 'done');
    const pageTypes    = [...new Set(doneResults.map(r => r.pageType))];
    const actualCost = (
      (inputTokens      / 1e6) * (3    / 2) +
      (cacheWriteTokens / 1e6) * (3.75 / 2) +
      (cacheReadTokens  / 1e6) * (0.30 / 2) +
      (outputTokens     / 1e6) * (15   / 2)
    ).toFixed(2);

    const summary = {
      done:         doneResults.length,
      failed:       results.filter(r => r && r.status === 'failed').length,
      inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens, actualCost,
    };

    record.status      = 'complete';
    record.downloadId  = downloadId;
    record.finalSummary = { downloadId, pageTypes, summary };
    batchJobs.set(record.id, record);
    await persistBatchRecord(record);

    res.json({ status: 'complete', downloadId, pageTypes, summary, total: record.total });
  } catch (err) {
    console.error('[batch-status] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/download/:downloadId', (req, res) => {
  const dl = downloads.get(req.params.downloadId);
  if (!dl) return res.status(404).send('Download not found or expired.');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${dl.filename}"`);
  res.send(dl.text);
});

// Per-type bulk download
app.get('/api/download/:downloadId/type/:pageType', (req, res) => {
  const dl = downloads.get(req.params.downloadId);
  if (!dl) return res.status(404).send('Download not found or expired.');
  const type    = req.params.pageType;
  const subset  = (dl.results || []).filter(r => r.pageType === type && r.status === 'done');
  if (!subset.length) return res.status(404).send(`No completed pages of type "${type}".`);
  const text     = buildOutputFile(subset, [], dl.safeClient);
  const filename = `${dl.safeClient}_${type.replace(/-/g, '_')}_pages.txt`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(text);
});

// Per-page ZIP download
app.get('/api/download/:downloadId/zip', async (req, res) => {
  const dl = downloads.get(req.params.downloadId);
  if (!dl) return res.status(404).send('Download not found or expired.');
  const done = (dl.results || []).filter(r => r.status === 'done');
  if (!done.length) return res.status(404).send('No completed pages to zip.');

  const zip = new JSZip();
  for (const r of done) {
    const slug     = (r.urlSlug || r.pageTitle || 'page').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const filename = `${r.pageType}__${slug}.txt`;
    zip.file(filename, buildOutputFile([r], [], dl.safeClient));
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${dl.safeClient}_all_pages.zip"`);
  res.send(buffer);
});

// ── Legacy single-page routes (preserved unchanged) ───────────────────────────

function buildPrompt({ customValues, geoResearch, h1, onboardingForm }) {
  const sections = [
    HOMEPAGE_PROMPT.trim(),
    '---\n\n' + CALIBRATION_PACK.trim(),
    `---\n\n## CLIENT PROJECT KNOWLEDGE\n\nThe following is all client-specific data for this generation. Use it to fill every section of the homepage template. Do not invent any facts not present here.\n\n### GHL Custom Values Document\n${customValues.trim()}\n`,
    `### Geographical Research and Context\n${geoResearch.trim()}\n`,
  ];
  if (onboardingForm && onboardingForm.trim()) {
    sections.push(`### Client Onboarding Form Answers\n${onboardingForm.trim()}\n`);
  }
  sections.push(`### H1 (from Ahrefs research)\nThe H1 for this homepage is: ${h1.trim()}\n\nNote: In the HERO H1 field of the output template, output this H1 value directly rather than the placeholder text "[INSERT H1 FROM AHREFS]". All H1 dash rules and length rules still apply — if this H1 contains any dashes, rewrite it according to the dash rule.\n`);
  return sections.join('\n\n');
}

function buildCategoryPrompt({ customValues, geoResearch, targetCategory, onboardingForm }) {
  const sections = [
    `TARGET CATEGORY FOR THIS RUN: ${targetCategory.trim()}`,
    CATEGORY_PROMPT.trim(),
    '---\n\n' + CALIBRATION_PACK.trim(),
    `---\n\n## CLIENT PROJECT KNOWLEDGE\n\nThe following is all client-specific data for this generation. Use it to fill every section of the category page template. Do not invent any facts not present here.\n\n### GHL Custom Values Document\n${customValues.trim()}\n`,
    `### Geographical Research and Context\n${geoResearch.trim()}\n`,
  ];
  if (onboardingForm && onboardingForm.trim()) {
    sections.push(`### Client Onboarding Form Answers\n${onboardingForm.trim()}\n`);
  }
  return sections.join('\n\n');
}

app.post('/api/generate', async (req, res) => {
  const { customValues, geoResearch, h1, onboardingForm } = req.body;
  if (!customValues || !geoResearch || !h1)
    return res.status(400).json({ error: 'customValues, geoResearch, and h1 are required.' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY environment variable is not set.' });
  const client = new Anthropic({ apiKey });
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 8192,
      messages: [{ role: 'user', content: buildPrompt({ customValues, geoResearch, h1, onboardingForm }) }],
    });
    const output = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
    res.json({ output, issues: validate(output, h1, customValues), usage: message.usage });
  } catch (err) {
    console.error('Anthropic API error:', err);
    res.status(500).json({ error: err.message || 'API call failed.' });
  }
});

app.post('/api/generate-category', async (req, res) => {
  const { customValues, geoResearch, targetCategory, onboardingForm } = req.body;
  if (!customValues || !geoResearch || !targetCategory)
    return res.status(400).json({ error: 'customValues, geoResearch, and targetCategory are required.' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY environment variable is not set.' });
  const client = new Anthropic({ apiKey });
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 8192,
      messages: [{ role: 'user', content: buildCategoryPrompt({ customValues, geoResearch, targetCategory, onboardingForm }) }],
    });
    const output = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
    res.json({ output, issues: validate(output, null, customValues), usage: message.usage });
  } catch (err) {
    console.error('Anthropic API error:', err);
    res.status(500).json({ error: err.message || 'API call failed.' });
  }
});

// ── Serve generate tool at /generate ─────────────────────────────────────────

app.get('/generate', (req, res) => res.sendFile(path.join(__dirname, 'public', 'generate.html')));
app.get('/', (req, res) => res.redirect('/clients.html'));

// ── Client API routes ─────────────────────────────────────────────────────────

const dbRequired = (req, res, next) => pool ? next() : res.status(503).json({ error: 'Database not configured.' });
app.use('/api/clients', dbRequired);

app.get('/api/clients', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, COUNT(p.id)::int AS page_count
      FROM clients c
      LEFT JOIN pages p ON p.client_id = c.id
      GROUP BY c.id ORDER BY c.created_at DESC
    `);
    res.json({ clients: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clients', async (req, res) => {
  const { name, trade } = req.body;
  if (!name || !trade) return res.status(400).json({ error: 'name and trade are required.' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO clients (name, trade) VALUES ($1, $2) RETURNING *',
      [name.trim(), trade.trim()]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Client not found.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Page API routes ───────────────────────────────────────────────────────────

app.get('/api/clients/:id/pages', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM pages WHERE client_id = $1 ORDER BY page_type, page_title',
      [req.params.id]
    );
    res.json({ pages: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/clients/:clientId/pages/:pageId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS client_name, c.trade
       FROM pages p JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1 AND p.client_id = $2`,
      [req.params.pageId, req.params.clientId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Page not found.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/clients/:clientId/pages/:pageId', async (req, res) => {
  const { copy_output } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE pages SET copy_output = $1, edited_at = NOW()
       WHERE id = $2 AND client_id = $3 RETURNING *`,
      [copy_output, req.params.pageId, req.params.clientId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Page not found.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/clients/:clientId/pages/:pageId', async (req, res) => {
  try {
    await pool.query('DELETE FROM pages WHERE id = $1 AND client_id = $2', [req.params.pageId, req.params.clientId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Single-page regenerate ────────────────────────────────────────────────────

app.post('/api/clients/:clientId/pages/:pageId/regenerate', async (req, res) => {
  try {
    // Load page + client assets
    const { rows: pageRows } = await pool.query(
      `SELECT p.*, c.trade FROM pages p JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1 AND p.client_id = $2`,
      [req.params.pageId, req.params.clientId]
    );
    if (!pageRows.length) return res.status(404).json({ error: 'Page not found.' });
    const page = pageRows[0];

    const { rows: assets } = await pool.query(
      'SELECT asset_type, content FROM client_assets WHERE client_id = $1',
      [req.params.clientId]
    );
    const getAsset = type => (assets.find(a => a.asset_type === type) || {}).content || '';

    const customValuesCsvs = assets.filter(a => a.asset_type === 'custom_values').map(a => a.content);
    const { keyValueMap, serviceParentMap } = parseCustomValues(customValuesCsvs);
    const geoResearch    = getAsset('geo_research');
    const onboardingText = getAsset('onboarding');
    const calibrationPack = CALIBRATION_PACKS[page.trade] || Object.values(CALIBRATION_PACKS)[0] || '';
    const customValuesText = Object.entries(keyValueMap).map(([k, v]) => `${k}: ${v}`).join('\n');

    const job = {
      pageType:            page.page_type,
      pageTitle:           page.page_title,
      urlSlug:             page.url_slug,
      h1:                  page.h1,
      locationName:        page.location_name || '',
      locationCategoryName: page.location_category_name || '',
    };

    const prompt    = buildSitePrompt(job, calibrationPack, keyValueMap, serviceParentMap, geoResearch, onboardingText);
    const maxTokens = (job.pageType === 'category' || job.pageType === 'location-category') ? 16000 : 8192;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message   = await callClaude(anthropic, prompt, maxTokens);
    const output    = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const issues    = validate(output, job.h1, customValuesText, job.pageType, {
      pageTitle: job.pageTitle, locationName: job.locationName, locationCategoryName: job.locationCategoryName,
    });

    const { rows: updated } = await pool.query(
      `UPDATE pages SET copy_output = $1, issues = $2, generated_at = NOW(), edited_at = NULL
       WHERE id = $3 RETURNING *`,
      [output, JSON.stringify(issues), page.id]
    );
    res.json({ ...updated[0], issues });
  } catch (err) {
    console.error('[regenerate]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
initDb().then(() => {
  app.listen(PORT, () => console.log(`Copy bot running at http://localhost:${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
