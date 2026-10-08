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
const { validate, checkOrphanedServices } = require('./validate');
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

// Explicit filename → trade name map for packs that don't follow the legacy
// _Calibration_Pack_All_Page_Types.md naming convention.
const EXPLICIT_PACK_MAP = {
  'Cleaning_Calibration_Pack_v5.md':              'Cleaning Company',
  'Builder_Calibration_Pack_v5.md':               'Building Company',
  'Roofer_Calibration_Pack_v5.md':                'Roofing Company',
  'Dog_Training_Security_Calibration_Pack_v1.md': 'Dog Training & Security Dogs',
  'Drainage_Calibration_Pack_v1.md':              'Drainage Company',
  'Landscaper_Calibration_Pack_v4.md':            'Landscaper Gardener',
};

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
      let tradeName = null;

      // Explicit map takes priority
      if (EXPLICIT_PACK_MAP[file]) {
        tradeName = EXPLICIT_PACK_MAP[file];
      } else if (/_Calibration_Pack_All_Page_Types\.md$/i.test(file)) {
        // Legacy naming: derive trade name from filename
        tradeName = file
          .replace(/_Calibration_Pack_All_Page_Types\.md$/i, '')
          .replace(/_/g, ' ');
      }

      if (tradeName && !(tradeName in packs)) {
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

// ── Geo research config and modules ───────────────────────────────────────────

// Single config value — swap to 'high' for deeper research, 'low' for faster/cheaper.
// Preset tiers: fast → low → medium (deep-research) → high → xhigh
const PERPLEXITY_PRESET       = process.env.PERPLEXITY_PRESET || 'medium';
// Max parallel Perplexity calls. Default 5; lower if you hit rate-limit 429s.
const RESEARCH_CONCURRENCY    = Math.max(1, parseInt(process.env.RESEARCH_CONCURRENCY, 10) || 5);
// Per-call HTTP timeout. Perplexity deep-research can take up to 15 min; 30 min is safe.
const PERPLEXITY_TIMEOUT_MS   = parseInt(process.env.PERPLEXITY_TIMEOUT_MS, 10) || 30 * 60 * 1000;

// FALLBACK rate constants — only used when the Perplexity API response omits cost.
// A warning is logged whenever these fire. VERIFY these values against current pricing
// at https://docs.perplexity.ai/guides/pricing before relying on them for billing.
// The 'medium' (deep-research) preset runs sonar-reasoning-pro which costs significantly
// more than the base sonar model ($0.25/$2.50). Update when confirmed.
const PERPLEXITY_RATES = {
  inputPerMToken:  2.00,   // ← VERIFY: update to match current Perplexity pricing
  outputPerMToken: 8.00,   // ← VERIFY: update to match current Perplexity pricing
};

const RESEARCH_MODULE_MAP = {
  'Blinds_Curtains_Research_Module.md':            'Blinds & Curtains',
  'Builder_Research_Module.md':                    'Building Company',
  'Carpenter_Research_Module.md':                  'Carpenter',
  'Cleaning_Research_Module.md':                   'Cleaning Company',
  'Dog_Grooming_Research_Module.md':               'Dog Grooming',
  'Dog_Training_Research_Module.md':               'Dog Training',
  // Add-on loaded separately when includeSecurityAddOn flag is set — not a standalone trade.
  // 'Dog_Training_Security_AddOn_Research_Module.md': handled via SECURITY_ADDON_MODULE below
  'Dog_Walker_Research_Module.md':                 'Dog Walker',
  'Drainage_Research_Module.md':                   'Drainage Company',
  'Driveways_Paving_Research_Module.md':           'Driveways & Paving',
  'Electrician_Research_Module.md':                'Electrician',
  'Fencing_Research_Module.md':                    'Fencing',
  'Flooring_Research_Module.md':                   'Flooring',
  'Garage_Doors_Research_Module.md':               'Garage Doors',
  'Guttering_Fascias_Research_Module.md':          'Guttering & Fascias',
  'HVAC_Research_Module.md':                       'HVAC',
  'Kitchen_Bathroom_Research_Module.md':           'Kitchen & Bathroom',
  'Landscaper_Gardener_Research_Module.md':        'Landscaper Gardener',
  'Locksmith_Research_Module.md':                  'Locksmith',
  'Loft_Extensions_Research_Module.md':            'Loft Extensions',
  'Painter_Decorator_Research_Module.md':          'Painter & Decorator',
  'Pest_Control_Research_Module.md':               'Pest Control',
  'Plasterer_Research_Module.md':                  'Plasterer',
  'Plumbing_Heating_Research_Module.md':           'Plumbing & Heating',
  'Pressure_Washing_Research_Module.md':           'Pressure Washing',
  'Removals_Research_Module.md':                   'Removals',
  'Roofer_Research_Module.md':                     'Roofing Company',
  'Scaffolding_Research_Module.md':                'Scaffolding',
  'Skip_Hire_Research_Module.md':                  'Skip Hire',
  'Tiling_Research_Module.md':                     'Tiling',
  'Tree_Surgeon_Research_Module.md':               'Tree Surgeon',
  'Window_Cleaning_Research_Module.md':            'Window Cleaning',
};

const GEO_RESEARCH_DIR = path.join(__dirname, 'Geo Research');

function loadResearchModules() {
  const modules = {};
  const modulesDir = path.join(GEO_RESEARCH_DIR, 'Modules');
  if (!fs.existsSync(modulesDir)) {
    console.warn('WARNING: Geo Research/Modules directory not found — geo research unavailable');
    return modules;
  }
  console.log('Loading research modules...');
  for (const file of fs.readdirSync(modulesDir)) {
    if (RESEARCH_MODULE_MAP[file]) {
      modules[RESEARCH_MODULE_MAP[file]] = fs.readFileSync(path.join(modulesDir, file), 'utf8');
      console.log(`  RESEARCH MODULE: ${file} → "${RESEARCH_MODULE_MAP[file]}"`);
    }
  }
  return modules;
}

function readGeoDoc(name) {
  if (!fs.existsSync(GEO_RESEARCH_DIR)) return null;
  const base  = name.replace(/\.md$/, '');
  const files = fs.readdirSync(GEO_RESEARCH_DIR);
  let best = null, bestN = -1;
  for (const f of files) {
    if (f === `${base}.md`) { if (bestN < 0) { best = f; bestN = 0; } }
    const m = f.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\((\\d+)\\)\\.md$`));
    if (m) { const n = parseInt(m[1], 10); if (n > bestN) { best = f; bestN = n; } }
  }
  if (best) {
    const versionStr = bestN > 0 ? ` (v${bestN})` : '';
    console.log(`  LOADED: Geo Research/${best}${versionStr}`);
    return fs.readFileSync(path.join(GEO_RESEARCH_DIR, best), 'utf8');
  }
  return null;
}

const RESEARCH_MODULES           = loadResearchModules();
const AVAILABLE_RESEARCH_MODULES = Object.keys(RESEARCH_MODULES);
console.log(`Research modules loaded: ${AVAILABLE_RESEARCH_MODULES.length}`);
// Security dog add-on: appended to Dog Training prompts when toggled in UI
const SECURITY_ADDON_PATH   = path.join(GEO_RESEARCH_DIR, 'Modules', 'Dog_Training_Security_AddOn_Research_Module.md');
const SECURITY_ADDON_MODULE = fs.existsSync(SECURITY_ADDON_PATH)
  ? fs.readFileSync(SECURITY_ADDON_PATH, 'utf8')
  : null;
const GEO_RESEARCH_CORE          = readGeoDoc('Geo_Research_CORE') || '';
console.log(`Geo research core loaded: ${GEO_RESEARCH_CORE ? 'yes' : 'no'}`);
const GEO_CLIENT_BLOCK_TEMPLATE  = (() => {
  const p = path.join(GEO_RESEARCH_DIR, 'Client_Block_Template.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
})();

// ── In-memory session / download stores ──────────────────────────────────────

const sessions     = new Map();
const downloads    = new Map();
// Batch jobs can take Anthropic up to 24h to finish — kept in memory as a fast
// path, with Postgres (batch_jobs table) as the durable fallback so a status
// check still works after a server restart, as long as DB is configured.
const batchJobs    = new Map();
// Research jobs can take hours (Perplexity deep-research per location).
// Same pattern: in-memory fast path + research_jobs Postgres table.
const researchJobs = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions)      { if (now - s.createdAt > 2 * 3600000)   sessions.delete(id); }
  for (const [id, d] of downloads)     { if (now - d.createdAt > 4 * 3600000)   downloads.delete(id); }
  for (const [id, b] of batchJobs)     { if (now - b.createdAt > 48 * 3600000)  batchJobs.delete(id); }
  for (const [id, r] of researchJobs)  { if (now - r.createdAt > 48 * 3600000)  researchJobs.delete(id); }
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

    // For Location Category pages, extract category name and location name from
    // the title. Supports both "Category — Location" (dash-separated) and
    // "Category Location" (space-separated, location appended without a dash).
    let locationCategoryName = null;
    let locationName = null;
    if (pageType === 'location-category') {
      const m = pageTitle.match(/^(.+?)\s+[—–-]+\s+(.+)$/);
      if (m) {
        locationCategoryName = m[1].trim();
        locationName         = m[2].trim();
      } else {
        // No dash — derive by checking the URL slug for a known location segment.
        // e.g. "/locations/cleethorpes/carpet-cleaning-service" → location "cleethorpes"
        const urlSlug = (row['URL Slug'] || '').trim();
        const locSlugMatch = urlSlug.match(/\/locations\/([^/]+)\//);
        if (locSlugMatch) {
          // Convert slug to title-case to find it in the page title
          const locSlug = locSlugMatch[1]; // e.g. "cleethorpes"
          const locPattern = new RegExp(
            '\\s+' + locSlug.replace(/-/g, '[\\s-]') + '$',
            'i'
          );
          const stripped = pageTitle.replace(locPattern, '').trim();
          if (stripped && stripped !== pageTitle) {
            locationCategoryName = stripped;
            locationName = pageTitle.slice(stripped.length).trim();
          } else {
            // Last resort: keep full title as category name
            locationCategoryName = pageTitle;
            locationName = '';
          }
        } else {
          locationCategoryName = pageTitle;
          locationName = '';
        }
      }
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
  // Geo file is optional — dossiers from a prior research run can serve as the source.
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

// Restated on every call outside the cached system blocks. The full dash rule
// lives in CORE_PROMPTS too, but that text sits inside the cache_control
// prefix (shared/reused across every page in a batch) — repeating it here, in
// the part of the prompt that is freshly read on every single request,
// guarantees it can never be skimmed past as "background" cached context.
const DASH_RULE_REMINDER = '\n\nREMINDER (HIGHEST PRIORITY): No em dashes (—), en dashes (–), or hyphens of any kind may appear anywhere in the output, including compound adjectives and technical compound nouns. Before producing your final result, re-read the entire output and rewrite any line containing a dash or hyphen until zero remain.';

// ── Geo research helpers ──────────────────────────────────────────────────────

// Normalise a location name for matching: lowercase, hyphens/underscores to
// spaces, strip non-alphanumeric (except spaces), collapse spaces, trim.
function normaliseLocation(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const DOSSIER_SECTIONS = [
  'LOCATION OVERVIEW',
  'NEIGHBOURHOOD PROFILES',
  'LOCAL ISSUES',
  'SYMPTOMS',
  'RULES & COUNCIL',
  'DEMAND BY AREA',
  'NEARBY CONTRAST',
  'GAPS',
];

// Matches: # / ## / ### heading OR **bold line**, followed by the section number and name.
// Case-insensitive, tolerant of extra whitespace.
function makeSectionRegex(n, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(?:^#{1,3}\\s*${n}\\.\\s*${escaped}|^\\*\\*\\s*${n}\\.\\s*${escaped}[^\\n]*)`,
    'im'
  );
}

// Build candidate URL maps from a Perplexity response for citation resolution testing.
// Returns an object keyed by strategy name, each value a map of {N → url}.
function buildCitationMaps(pxRes) {
  const maps = {
    idBased:            {}, // result.id → url (search_results only)
    flatSearchResults:  {}, // 1-based flat across search_results items in order
    flatAllResults:     {}, // 1-based flat across all output items that have results
  };

  if (!Array.isArray(pxRes.output)) return maps;

  let srIdx = 1, allIdx = 1;
  for (const item of pxRes.output) {
    const resultArr = item.results || item.contents || null;
    if (!resultArr) continue;
    for (const r of resultArr) {
      const url = r.url || null;
      if (!url) { if (item.results) srIdx++; allIdx++; continue; }

      // id-based (search_results only)
      if (item.type === 'search_results' && r.id != null) {
        maps.idBased[r.id] = url;
      }
      // flat search_results
      if (item.type === 'search_results') {
        if (!maps.flatSearchResults[srIdx]) maps.flatSearchResults[srIdx] = url;
        srIdx++;
      }
      // flat all results
      if (!maps.flatAllResults[allIdx]) maps.flatAllResults[allIdx] = url;
      allIdx++;
    }
  }

  return maps;
}

// Extract calibration pairs from raw text: [URL][web:N] → {n, url}.
// These are the ground truth — the inline URL is authoritative.
function extractInlinePairs(text) {
  const pairs = [];
  const re = /\[(https?:\/\/[^\]]+)\]\[web:(\d+)\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    pairs.push({ url: m[1], n: parseInt(m[2], 10) });
  }
  return pairs;
}

// Test all candidate maps against calibration pairs. Returns array of {strategy, matchRate, matched, total}.
function testCitationStrategies(pairs, maps) {
  return Object.entries(maps).map(([strategy, map]) => {
    let matched = 0;
    for (const { url, n } of pairs) {
      const mapped = map[n];
      // Match if the mapped URL starts the same as the inline URL (handles trailing params/fragments)
      if (mapped && (mapped === url || mapped.startsWith(url) || url.startsWith(mapped))) matched++;
    }
    return { strategy, matched, total: pairs.length, matchRate: pairs.length ? matched / pairs.length : 0 };
  }).sort((a, b) => b.matchRate - a.matchRate);
}

// Resolve [web:N] citation markers in text.
// When [URL][web:N] appears together, keep the real URL and drop the marker.
// All other [web:N] markers are stripped — number-based lookup is unreliable.
// Returns { text, kept, stripped, sourceCount }.
function resolveCitations(text) {
  let kept = 0, stripped = 0;

  // Step 1: [URL][web:N] — keep the URL, drop the marker
  let out = text.replace(/(\[https?:\/\/[^\]]+\])\[web:\d+\]/g, (_, url) => {
    kept++;
    return url;
  });

  // Step 2: strip any remaining standalone [web:N] markers
  out = out.replace(/\[web:\d+\]/g, () => { stripped++; return ''; });

  const sourceCount = (out.match(/\[https?:\/\//g) || []).length;
  console.log(`[citations] kept inline: ${kept}, stripped: ${stripped}, sourceCount: ${sourceCount}`);
  return { text: out, kept, stripped, sourceCount };
}

function validateAndCleanDossier(raw) {
  let text = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();

  // Try to start from first recognisable section heading
  const firstMatch = makeSectionRegex(1, DOSSIER_SECTIONS[0]).exec(text);
  if (firstMatch && firstMatch.index > 0) text = text.slice(firstMatch.index);

  // Trim to END OF DOSSIER if present
  const endIdx = text.indexOf('END OF DOSSIER');
  if (endIdx >= 0) text = text.slice(0, endIdx + 'END OF DOSSIER'.length);

  // Check all 8 sections exist
  const missing = [];
  for (let n = 1; n <= 8; n++) {
    if (!makeSectionRegex(n, DOSSIER_SECTIONS[n - 1]).test(text)) {
      missing.push(`${n}. ${DOSSIER_SECTIONS[n - 1]}`);
    }
  }
  if (missing.length) return { valid: false, error: `Missing sections: ${missing.join(', ')}` };

  // Normalise any non-standard headings to ## N. NAME
  for (let n = 1; n <= 8; n++) {
    text = text.replace(makeSectionRegex(n, DOSSIER_SECTIONS[n - 1]), `## ${n}. ${DOSSIER_SECTIONS[n - 1]}`);
  }

  const warnings = [];
  if (!text.includes('END OF DOSSIER')) warnings.push('Missing END OF DOSSIER marker');

  // Flag any [web:N] markers that survived citation resolution — v6 should never produce these
  const unresolvedMarkers = (text.match(/\[web:\d+\]/g) || []);
  if (unresolvedMarkers.length) warnings.push(`contains_unresolved_markers:${unresolvedMarkers.length}`);

  return { valid: true, text, warnings, hasUnresolvedMarkers: unresolvedMarkers.length > 0 };
}

// runType must be 'PRIMARY CITY' or 'TOWN' — set on the location object at parse-zip time and
// passed through every request so re-running a single location always uses the correct value.
function buildResearchPrompt(locationName, code, runType, trade, keyValueMap, serviceParentMap, includeSecurityAddOn = false) {
  const companyName = keyValueMap['company_name'] || '';
  const primaryCity = keyValueMap['biz_area_1']   || '';

  const categoryLines = [];
  for (let i = 1; keyValueMap[`category_${i}`]; i++) {
    const catName = keyValueMap[`category_${i}`];
    const svcKeys = Object.entries(serviceParentMap)
      .filter(([, cat]) => cat.toLowerCase() === catName.toLowerCase())
      .map(([k]) => k)
      .sort((a, b) => parseInt(a.replace('service_', ''), 10) - parseInt(b.replace('service_', ''), 10));
    const svcNames = svcKeys.map(k => keyValueMap[k]).filter(Boolean).join(', ');
    categoryLines.push(`- ${catName}${i === 1 ? ' (primary)' : ''}: ${svcNames}`);
  }

  const cityOrTown = (runType === 'PRIMARY CITY' || runType === 'TOWN') ? runType
    : (normaliseLocation(locationName) === normaliseLocation(primaryCity) ? 'PRIMARY CITY' : 'TOWN');

  const clientBlock = [
    '=== CLIENT ===',
    `Business: ${companyName}`,
    `Niche: ${trade}`,
    `Primary city: ${primaryCity}`,
    'GBP categories and their services (exact GBP names):',
    ...categoryLines,
    '',
    '=== RUN FOR ===',
    `${locationName} | ${code} | ${cityOrTown}`,
  ].join('\n');

  const moduleText  = RESEARCH_MODULES[trade] || '';
  const addOnText   = includeSecurityAddOn && SECURITY_ADDON_MODULE ? SECURITY_ADDON_MODULE.trim() : '';
  const parts = [GEO_RESEARCH_CORE.trim(), clientBlock, moduleText.trim(), addOnText].filter(Boolean);
  return parts.join('\n\n---\n\n');
}

// Submit to Perplexity in background mode. Returns the Perplexity response id immediately.
async function submitPerplexity(promptText) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY environment variable is not set');

  const res = await fetch('https://api.perplexity.ai/v1/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ preset: PERPLEXITY_PRESET, input: promptText, background: true }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Perplexity submit error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const submitted = await res.json();
  if (!submitted.id) throw new Error('Perplexity submit returned no response id');
  console.log(`[research] Perplexity job queued: ${submitted.id}`);
  return submitted.id;
}

// Poll GET /v1/agent/{id} until terminal. deadline is a Date.now() timestamp.
const PERPLEXITY_POLL_MS = 15000;
async function pollPerplexity(responseId, deadline) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY environment variable is not set');

  while (true) {
    if (Date.now() > deadline) {
      throw new Error(`Perplexity timeout after ${PERPLEXITY_TIMEOUT_MS / 60000} min waiting for ${responseId}`);
    }
    await new Promise(r => setTimeout(r, PERPLEXITY_POLL_MS));

    const res = await fetch(`https://api.perplexity.ai/v1/agent/${responseId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Perplexity poll error ${res.status} for ${responseId}: ${errText.slice(0, 300)}`);
    }
    const pxRes = await res.json();
    console.log(`[research] ${responseId} status: ${pxRes.status}`);
    if (pxRes.status === 'completed') return pxRes;
    if (['failed', 'incomplete', 'cancelled'].includes(pxRes.status)) {
      const detail = pxRes.error && pxRes.error.message ? pxRes.error.message : pxRes.status;
      throw new Error(`Perplexity job ${pxRes.status}: ${detail}`);
    }
    // queued or in_progress — keep polling
  }
}

async function loadResearchRecord(jobId) {
  if (researchJobs.has(jobId)) return researchJobs.get(jobId);
  if (!pool) return null;
  const { rows } = await pool.query('SELECT * FROM research_jobs WHERE id = $1', [jobId]);
  if (!rows.length) return null;
  const row = rows[0];
  const record = { id: row.id, sessionId: row.session_id, clientId: row.client_id, status: row.status, preset: row.preset, locations: row.locations, createdAt: new Date(row.created_at).getTime() };
  researchJobs.set(jobId, record);
  return record;
}

async function persistResearchRecord(record) {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO research_jobs (id, session_id, client_id, status, preset, locations, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,to_timestamp($7/1000.0))
       ON CONFLICT (id) DO UPDATE
         SET status = EXCLUDED.status, locations = EXCLUDED.locations`,
      [record.id, record.sessionId, record.clientId, record.status, record.preset, JSON.stringify(record.locations), record.createdAt]
    );
  } catch (dbErr) {
    console.error('[DB] Research record save error:', dbErr.message);
  }
}

async function updateResearchLocation(record, code, patch) {
  record.locations[code] = { ...record.locations[code], ...patch };
  const allStatuses = Object.values(record.locations).map(l => l.status);
  if (allStatuses.every(s => s === 'done'))                            record.status = 'done';
  else if (allStatuses.every(s => s === 'done' || s === 'failed'))    record.status = 'failed';
  else                                                                  record.status = 'running';
  researchJobs.set(record.id, record);
  if (pool) {
    try {
      await pool.query(
        `UPDATE research_jobs SET locations = locations || $1::jsonb, status = $2 WHERE id = $3`,
        [JSON.stringify({ [code]: record.locations[code] }), record.status, record.id]
      );
    } catch (dbErr) { console.error('[DB] Research location update error:', dbErr.message); }
  }
}

async function recoverInterruptedResearchJobs() {
  if (!pool) return;
  try {
    // Find all research_jobs that were still running when the server stopped
    const { rows: runningJobs } = await pool.query(
      `SELECT id, client_id, session_id, preset, locations, created_at FROM research_jobs WHERE status = 'running'`
    );
    if (!runningJobs.length) { console.log('Research job recovery: no interrupted jobs'); return; }

    console.log(`Research job recovery: ${runningJobs.length} interrupted job(s) — resuming where possible`);

    for (const row of runningJobs) {
      const record = {
        id: row.id, sessionId: row.session_id, clientId: row.client_id,
        status: 'running', preset: row.preset,
        locations: row.locations || {},
        createdAt: new Date(row.created_at).getTime(),
      };
      researchJobs.set(record.id, record);

      for (const [code, loc] of Object.entries(record.locations)) {
        if (loc.status !== 'running') continue;

        if (loc.pxJobId) {
          // Perplexity job was submitted — check if it's still within the timeout window
          const elapsed  = Date.now() - new Date(loc.startedAt || row.created_at).getTime();
          const remaining = PERPLEXITY_TIMEOUT_MS - elapsed;
          if (remaining <= 0) {
            await updateResearchLocation(record, code, { status: 'failed', error: 'interrupted: timed out while server was restarting', finishedAt: new Date().toISOString() });
            console.log(`[recovery] ${record.id}/${code}: timed out — marking failed`);
          } else {
            // Resume polling in the background
            const deadline = Date.now() + remaining;
            console.log(`[recovery] ${record.id}/${code}: resuming poll of ${loc.pxJobId} (${Math.round(remaining / 60000)} min remaining)`);
            (async () => {
              try {
                const pxRes = await pollPerplexity(loc.pxJobId, deadline);
                // Process the completed result the same way runOneLocation does
                await finishLocation(record, record.clientId, code, loc, pxRes);
              } catch (err) {
                const causeStr = err.cause ? ` | cause: ${err.cause}` : '';
                console.error(`[recovery] ${record.id}/${code} poll failed: ${err.message}${causeStr}`);
                await updateResearchLocation(record, code, { status: 'failed', error: err.message, finishedAt: new Date().toISOString() });
              }
            })();
          }
        } else {
          // No job id — never reached Perplexity; mark failed immediately
          await updateResearchLocation(record, code, { status: 'failed', error: 'interrupted: server restarted before job was submitted', finishedAt: new Date().toISOString() });
          console.log(`[recovery] ${record.id}/${code}: no pxJobId — marking failed`);
        }
      }
    }
    console.log('Research job recovery complete');
  } catch (err) {
    console.warn('[DB] Research job recovery error:', err.message);
  }
}

// ── Shared dossier helpers (used by generate-batch and regenerate) ────────────

async function loadDossierMap(clientId) {
  const map = new Map(); // normKey → dossierText
  if (!clientId || !pool) return map;
  try {
    const { rows } = await pool.query(
      `SELECT content, metadata FROM client_assets
       WHERE client_id = $1 AND asset_type = 'geo_dossier'
       AND (metadata IS NULL OR NOT (metadata->>'superseded')::boolean)`,
      [clientId]
    );
    for (const row of rows) {
      const locName = row.metadata && row.metadata.location_name;
      if (locName) map.set(normaliseLocation(locName), row.content);
    }
  } catch (dbErr) {
    console.warn('[loadDossierMap] DB error:', dbErr.message);
  }
  return map;
}

// Returns { dossierText, skipReason }. skipReason is null on success.
// primaryGeo = dossier or uploaded-geo-file text for the primary city.
function selectDossierForJob(dossierMap, job, primaryGeo) {
  if (job.pageType === 'homepage' || job.pageType === 'category' || job.pageType === 'service') {
    if (!primaryGeo) return { dossierText: null, skipReason: 'no geo data for primary city' };
    return { dossierText: primaryGeo, skipReason: null };
  }

  const locName = job.locationName || job.pageTitle;
  let dossierText = dossierMap.get(normaliseLocation(locName));

  if (!dossierText) {
    const slugParts = (job.urlSlug || '').split('/').filter(Boolean);
    const locIdx    = slugParts.indexOf('locations');
    if (locIdx >= 0 && slugParts[locIdx + 1]) {
      dossierText = dossierMap.get(normaliseLocation(slugParts[locIdx + 1]));
    }
  }

  if (!dossierText) {
    console.warn(`[geo] No dossier for location "${locName}" — page "${job.pageTitle}" will be skipped`);
    return { dossierText: null, skipReason: `no dossier for ${locName}` };
  }

  return { dossierText, skipReason: null };
}

// Extract the final text from a Perplexity polled response.
// Background-mode GET responses may have the text in output_text OR assembled from output[].content[].text.
function extractPerplexityText(pxRes) {
  if (pxRes.output_text && pxRes.output_text.trim()) return pxRes.output_text;
  if (Array.isArray(pxRes.output)) {
    const parts = [];
    for (const item of pxRes.output) {
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === 'output_text' && c.text) parts.push(c.text);
          else if (c.type === 'text' && c.text) parts.push(c.text);
        }
      }
    }
    if (parts.length) return parts.join('\n');
  }
  return '';
}

// Process a completed Perplexity response: validate, save dossier asset, update record.
// Shared by runOneLocation and recovery path.
// Returns { validationFailed: true } if the dossier didn't pass validation (caller should NOT retry).
// Throws on DB/infrastructure errors (caller may retry).
// preserveOriginal: { cost, startedAt, finishedAt, inputTokens, outputTokens } — when set,
// the reprocess path keeps original timing/cost rather than overwriting with new values.
async function finishLocation(record, clientId, code, loc, pxRes, preserveOriginal = null) {
  const rawText  = extractPerplexityText(pxRes);
  const rawUsage = pxRes.usage || null;
  const usage    = rawUsage || {};
  const inputTok = usage.input_tokens  || 0;
  const outputTok= usage.output_tokens || 0;
  const searchCnt= (usage.tool_calls_details && usage.tool_calls_details.search_count) || null;

  console.log(`[research] "${loc.name}" extracted text length: ${rawText.length}`);
  if (!rawText.trim()) {
    console.warn(`[research] "${loc.name}" — empty output from Perplexity (saving raw response)`);
    await updateResearchLocation(record, code, {
      status: 'failed', finishedAt: new Date().toISOString(),
      error: 'empty output from Perplexity',
      rawOutputText: rawText, rawOutputJson: JSON.stringify(pxRes),
    });
    return { validationFailed: true };
  }

  // Resolve [web:N] citation markers before validation
  const { text: resolvedText, kept, stripped, sourceCount: rawSourceCount } = resolveCitations(rawText);
  if (stripped > 0) console.log(`[research] "${loc.name}" citations: kept ${kept} inline URLs, stripped ${stripped} bare markers`);

  let cost;
  if (rawUsage && rawUsage.cost && rawUsage.cost.total_cost != null) {
    cost = rawUsage.cost.total_cost;
  } else {
    console.warn(`[research] No cost in Perplexity response for "${loc.name}" — using fallback rate constants. Verify PERPLEXITY_RATES match current pricing.`);
    cost = (inputTok / 1e6) * PERPLEXITY_RATES.inputPerMToken + (outputTok / 1e6) * PERPLEXITY_RATES.outputPerMToken;
  }
  const costVal = parseFloat(cost.toFixed(6));

  const { valid, text: cleanText, error: valErr, warnings, hasUnresolvedMarkers } = validateAndCleanDossier(resolvedText);
  if (warnings && warnings.length) console.warn(`[research] "${loc.name}" validation warnings: ${warnings.join('; ')}`);

  if (!valid) {
    console.error(`[research] "${loc.name}" validation failed: ${valErr} — saving raw output, not retrying`);
    await updateResearchLocation(record, code, {
      status: 'validation_failed',
      finishedAt: preserveOriginal ? preserveOriginal.finishedAt : new Date().toISOString(),
      error: `Validation failed: ${valErr}`,
      rawOutputText: resolvedText, rawOutputJson: JSON.stringify(pxRes),
      inputTokens: preserveOriginal ? preserveOriginal.inputTokens : inputTok,
      outputTokens: preserveOriginal ? preserveOriginal.outputTokens : outputTok,
      searchCount: searchCnt,
      rawUsage, cost: preserveOriginal ? preserveOriginal.cost : costVal, preset: PERPLEXITY_PRESET,
    });
    return { validationFailed: true };
  }

  // Count source URLs in the final saved text
  const sourceCount = (cleanText.match(/\[https?:\/\//g) || []).length;
  const lowSources  = sourceCount < 10;
  if (lowSources) console.warn(`[research] "${loc.name}" low source count: ${sourceCount} URLs`);
  else            console.log(`[research] "${loc.name}" source count: ${sourceCount} URLs`);

  let assetId = null;
  if (pool) {
    try {
      await pool.query(
        `UPDATE client_assets SET metadata = COALESCE(metadata,'{}') || '{"superseded":true}'
         WHERE client_id = $1 AND asset_type = 'geo_dossier'
         AND metadata->>'location_name' = $2
         AND NOT (metadata->>'superseded')::boolean`,
        [clientId, loc.name]
      );
      const { rows: assetRows } = await pool.query(
        `INSERT INTO client_assets (client_id, asset_type, filename, content, metadata)
         VALUES ($1,'geo_dossier',$2,$3,$4::jsonb) RETURNING id`,
        [clientId,
         `${loc.name.replace(/\s+/g, '_')}_dossier.md`,
         cleanText,
         JSON.stringify({ location_name: loc.name, location_norm: normaliseLocation(loc.name), preset: PERPLEXITY_PRESET, superseded: false })]
      );
      assetId = assetRows[0].id;
    } catch (dbErr) { console.error('[DB] Dossier asset save error:', dbErr.message); }
  }

  await updateResearchLocation(record, code, {
    status: 'done',
    finishedAt: preserveOriginal ? preserveOriginal.finishedAt : new Date().toISOString(),
    inputTokens: preserveOriginal ? preserveOriginal.inputTokens : inputTok,
    outputTokens: preserveOriginal ? preserveOriginal.outputTokens : outputTok,
    searchCount: searchCnt,
    rawUsage, cost: preserveOriginal ? preserveOriginal.cost : costVal,
    preset: PERPLEXITY_PRESET, assetId, error: null,
    sourceCount, lowSources, hasUnresolvedMarkers: hasUnresolvedMarkers || false,
  });
  return { validationFailed: false, sourceCount, lowSources, hasUnresolvedMarkers: hasUnresolvedMarkers || false };
}

// ── Standalone per-location Perplexity runner (shared by research-start and research-rerun) ──

async function runOneLocation(record, clientId, loc, moduleName, keyValueMap, serviceParentMap, includeSecurityAddOn) {
  const code = loc.code.toUpperCase();
  await updateResearchLocation(record, code, { status: 'running', startedAt: new Date().toISOString() });

  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const promptText = buildResearchPrompt(loc.name, code, loc.runType || '', moduleName, keyValueMap, serviceParentMap, includeSecurityAddOn);
      const deadline   = Date.now() + PERPLEXITY_TIMEOUT_MS;
      const pxJobId    = await submitPerplexity(promptText);
      // Persist job id before polling — recovery on restart can resume polling rather than failing the row
      await updateResearchLocation(record, code, { pxJobId });
      const pxRes      = await pollPerplexity(pxJobId, deadline);
      const result     = await finishLocation(record, clientId, code, loc, pxRes);
      // Validation failures are final — raw output already saved, do not retry
      if (result && result.validationFailed) return;
      return;
    } catch (err) {
      lastErr = err;
      const causeStr = err.cause ? ` | cause: ${err.cause}` : '';
      if (attempt === 1) console.warn(`[research] "${loc.name}" attempt 1 failed — retrying: ${err.message}${causeStr}`);
      else               console.error(`[research] "${loc.name}" attempt 2 failed: ${err.message}${causeStr}`);
    }
  }

  console.error(`[research] "${loc.name}" failed after retry:`, lastErr.message, lastErr.cause || '');
  await updateResearchLocation(record, code, {
    status: 'failed', finishedAt: new Date().toISOString(), error: lastErr.message,
  });
}

function buildPageContext(job, keyValueMap, serviceParentMap) {
  const { pageType, pageTitle, h1 } = job;
  if (pageType === 'homepage') {
    return `TARGET PAGE: Homepage\nH1: ${h1}\nNote: Use this H1 directly in the HERO H1 field. Do not output [INSERT H1 FROM AHREFS].${DASH_RULE_REMINDER}`;
  }
  if (pageType === 'category') {
    const myServiceKeys = Object.entries(serviceParentMap)
      .filter(([, cat]) => cat.toLowerCase() === pageTitle.toLowerCase())
      .map(([k]) => k)
      .sort((a, b) => {
        const na = parseInt(a.replace('service_', ''), 10);
        const nb = parseInt(b.replace('service_', ''), 10);
        return na - nb;
      });
    const serviceLines = myServiceKeys.length
      ? '\nSERVICES IN THIS CATEGORY (generate a SERVICE CARD for each):\n' +
        myServiceKeys.map(k => `  {{custom_values.${k}}}: ${keyValueMap[k] || ''}`).join('\n')
      : '';
    return `TARGET PAGE: Category Page\nTARGET CATEGORY: ${pageTitle}\nH1: ${h1}${serviceLines}\nNote: Use this H1 directly in the HERO H1 field.${DASH_RULE_REMINDER}`;
  }
  if (pageType === 'location-category') {
    const categoryName = job.locationCategoryName || pageTitle;
    const locName      = job.locationName ? `\nTARGET LOCATION: ${job.locationName}` : '';
    const myServiceKeys = Object.entries(serviceParentMap)
      .filter(([, cat]) => cat.toLowerCase() === categoryName.toLowerCase())
      .map(([k]) => k)
      .sort((a, b) => parseInt(a.replace('service_', ''), 10) - parseInt(b.replace('service_', ''), 10));
    const serviceLines = myServiceKeys.length
      ? '\nSERVICES IN THIS CATEGORY (generate a SERVICE CARD for each):\n' +
        myServiceKeys.map(k => `  {{custom_values.${k}}}: ${keyValueMap[k] || ''}`).join('\n')
      : '';
    return `TARGET PAGE: Location Category Page\nTARGET CATEGORY: ${categoryName}${locName}${serviceLines}\nH1: ${h1}\nNote: Use this H1 directly in the HERO H1 field.${DASH_RULE_REMINDER}`;
  }
  if (pageType === 'service') {
    const serviceKey = Object.keys(keyValueMap).find(k =>
      /^service_\d+$/.test(k) && keyValueMap[k].toLowerCase() === pageTitle.toLowerCase()
    );
    const parentCategory = serviceKey
      ? (serviceParentMap[serviceKey] || keyValueMap['category_1'] || '')
      : (keyValueMap['category_1'] || '');
    return `TARGET PAGE: Service Page\nTARGET SERVICE: ${pageTitle}\nPARENT CATEGORY: ${parentCategory}\nH1: ${h1}\nNote: Use this H1 directly in the HERO H1 field.${DASH_RULE_REMINDER}`;
  }
  if (pageType === 'location') {
    return `TARGET PAGE: Location Page\nTARGET LOCATION: ${pageTitle}\nH1: ${h1}\nNote: Use this H1 directly in the HERO H1 field.${DASH_RULE_REMINDER}`;
  }
  return '';
}

const CORE_PROMPTS = { homepage: HOMEPAGE_PROMPT, category: CATEGORY_PROMPT, 'location-category': CATEGORY_PROMPT, service: SERVICE_PROMPT, location: LOCATION_PROMPT };

// Trade-specific section overrides injected as an extra system block between the
// calibration pack and the client block. Only populated for trades that deviate
// from the standard CORE prompt section structure. The cache_control breakpoint
// stays on the client block (last block) so the override is always part of the
// cached prefix for that trade — no extra per-page cost.
const TRADE_SECTION_OVERRIDES = {
  'Dog Training & Security Dogs': `## SECTION STRUCTURE OVERRIDES FOR THIS PAGE

The standard CORE prompts define section structures that must be modified for this trade. Apply the following overrides regardless of what the CORE prompt says for the section in question.

### Category page — replace Seasonal Tasks with Training Through the Life Stages

Do NOT write a Seasonal Tasks section for this trade. Dog training demand is driven by the dog's age, not the calendar. Replace that section with a "Training Through the Life Stages" section covering four life stages: Puppy (8 weeks to ~6 months), Adolescence (~6 to 18 months), Adulthood, and Older Dogs. Each entry gives the key training reality of that stage. Security dog pages use neither a seasonal nor a life stage section — coverage timing (nights, weekends, shutdown periods) belongs in the service cards and how it works sections.

In the output template, replace:
  SEASONAL TASKS — HEADLINE:
  SEASONAL TASKS — SUBHEADLINE:
  SEASONAL TASKS — SPRING:
  SEASONAL TASKS — SUMMER:
  SEASONAL TASKS — AUTUMN:
  SEASONAL TASKS — WINTER:

With:
  TRAINING THROUGH THE LIFE STAGES — INTRO:
  TRAINING THROUGH THE LIFE STAGES — PUPPY:
  TRAINING THROUGH THE LIFE STAGES — ADOLESCENCE:
  TRAINING THROUGH THE LIFE STAGES — ADULTHOOD:
  TRAINING THROUGH THE LIFE STAGES — OLDER DOGS:

### Service page — replace Signs section based on service type

Before writing the service page, classify the service as one of three types:

1. Problem-driven training service (pulling, recall, reactivity, barking, separation problems): replace the Signs section with a "Why It Isn't Going Away On Its Own" section — three paragraphs, three distinct mechanisms explaining why the behaviour deepens rather than fades and why self-help fails.

2. Life-stage service (puppy training, adolescent dogs, new rescue dogs): replace the Signs section with an "Is This Right For You" section — two or three owner scenarios the reader can recognise themselves in, each describing what the service gives them.

3. Security dog service: replace the Signs section with a "When a Dog Unit Is the Right Call" section — three paragraphs comparing a dog unit against the alternatives the buyer is considering, including an honest third paragraph naming where a dog unit is NOT the right fit.

The calibration pack contains full worked examples for all three section types. Match the length, structure, and standard of those examples.`,
};

// Returns { system, userContent } instead of one flat string, so the static
// portion (core prompt + calibration pack + client custom values/geo/onboarding —
// identical for every page in this batch) can be sent as cacheable system
// blocks, while only the per-page TARGET PAGE block varies per call. Anthropic
// caches the longest prefix ending at a cache_control breakpoint, so the
// breakpoint sits on the LAST static block — everything before it (core prompt,
// calibration pack, any trade override) is covered by the same cache hit.
function buildSitePrompt(job, calibrationPack, keyValueMap, serviceParentMap, geoResearch, onboardingText, trade) {
  const cvList      = Object.entries(keyValueMap).filter(([, v]) => v).map(([k, v]) => `{{custom_values.${k}}}: ${v}`).join('\n');
  console.log('\n── DEBUG cvList (first 20 lines) ──\n' + cvList.split('\n').slice(0, 20).join('\n') + '\n──────────────────────────────────\n');
  const clientBlock = `## CLIENT PROJECT KNOWLEDGE\n\n### GHL Custom Values\n${cvList}\n\n### Geographical Research and Context\n${geoResearch.trim()}\n\n### Client Onboarding Form\n${onboardingText}`;

  const systemBlocks = [
    { type: 'text', text: CORE_PROMPTS[job.pageType].trim() },
    { type: 'text', text: calibrationPack.trim() },
  ];
  const tradeOverride = trade && TRADE_SECTION_OVERRIDES[trade];
  if (tradeOverride) systemBlocks.push({ type: 'text', text: tradeOverride.trim() });
  systemBlocks.push({ type: 'text', text: clientBlock, cache_control: { type: 'ephemeral' } });

  return {
    system: systemBlocks,
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

app.post('/api/parse-zip', upload.array('files', 30), async (req, res) => {
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
    const geoResearch     = identified.geo ? readText(identified.geo) : '';

    // Build bizAreas list: biz_area_1, biz_area_2, … in order, with stable codes.
    const bizAreas = [];
    {
      let existingCodes = {};
      if (clientId && pool) {
        try {
          const { rows: lcRows } = await pool.query(
            'SELECT location_name_norm, code FROM client_locations WHERE client_id = $1',
            [clientId]
          );
          for (const r of lcRows) existingCodes[r.location_name_norm] = r.code;
        } catch (_) {}
      }
      const usedCodes = new Set(Object.values(existingCodes));
      for (let i = 1; keyValueMap[`biz_area_${i}`]; i++) {
        const name = keyValueMap[`biz_area_${i}`];
        const norm = normaliseLocation(name);
        let code = existingCodes[norm] || null;
        if (!code) {
          // Auto-generate: first 3 chars uppercased, deduplicate within this list
          const base = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
          if (!usedCodes.has(base)) { code = base; }
          else {
            let found = false;
            for (let d = 2; d <= 9; d++) {
              const candidate = base.slice(0, 2) + d;
              if (!usedCodes.has(candidate)) { code = candidate; found = true; break; }
            }
            if (!found) {
              let seq = 1;
              while (usedCodes.has(`L${String(seq).padStart(2, '0')}`)) seq++;
              code = `L${String(seq).padStart(2, '0')}`;
            }
          }
          usedCodes.add(code);
        }
        bizAreas.push({ name, norm, code, runType: i === 1 ? 'PRIMARY CITY' : 'TOWN' });
      }
    }

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
      ...(identified.geo ? [{ name: identified.geo.originalname, type: 'Geo Research' }] : []),
    ];

    res.json({
      sessionId,
      filesIdentified,
      jobs: jobs.map(j => ({ pageType: j.pageType, pageTitle: j.pageTitle, urlSlug: j.urlSlug })),
      summary: { total: jobs.length, byType, skipped: skippedPages.length },
      missingH1s,
      skippedPages,
      bizAreas,
      hasGeoFile: !!identified.geo,
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

    const dossierMap = await loadDossierMap(clientId);
    console.log(`[generate-batch] Loaded ${dossierMap.size} dossiers for client ${clientId || '(none)'}`);

    const primaryCityNorm = normaliseLocation(keyValueMap['biz_area_1'] || '');
    const primaryGeo      = dossierMap.get(primaryCityNorm) || geoResearch || null;

    const requestJobs = [];
    const geoSkipped  = [];

    for (const job of jobs) {
      const { dossierText, skipReason } = selectDossierForJob(dossierMap, job, primaryGeo);
      if (skipReason) { geoSkipped.push({ ...job, skipReason }); continue; }
      requestJobs.push({ job, dossierText });
    }

    const requests = requestJobs.map(({ job, dossierText }, i) => {
      const promptParts = buildSitePrompt(job, calibrationPack, keyValueMap, serviceParentMap, dossierText, onboardingText, trade);
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

    if (!requestJobs.length) {
      return res.status(400).json({ error: 'No pages to generate — all were skipped due to missing dossiers.' });
    }

    // Respond immediately so Railway's 30s request timeout doesn't kill the
    // connection while we upload the (potentially large) batch payload to Anthropic.
    const batchId = crypto.randomUUID();
    const companyName = keyValueMap['company_name'] || '';
    const allSkipped  = startIndex > 0 ? geoSkipped : [...skippedPages, ...geoSkipped];
    const record = {
      id: batchId,
      clientId: clientId || null,
      anthropicBatchId: null, // filled in once Anthropic accepts the batch
      trade,
      jobsMeta: requestJobs.map(({ job: j }) => ({ pageType: j.pageType, pageTitle: j.pageTitle, urlSlug: j.urlSlug, h1: j.h1, locationName: j.locationName, locationCategoryName: j.locationCategoryName })),
      customValuesText,
      skippedPages: allSkipped,
      companyName,
      total: requestJobs.length,
      status: 'submitting',
      downloadId: null,
      createdAt: Date.now(),
    };
    batchJobs.set(batchId, record);
    await persistBatchRecord(record);

    res.json({ batchId, anthropicBatchId: null, total: requestJobs.length, startIndex, geoSkipped: geoSkipped.length });

    // Background: submit to Anthropic and save assets — client polls /api/batch-status
    (async () => {
      try {
        const batch = await client.messages.batches.create({ requests });
        record.anthropicBatchId = batch.id;
        record.status = 'in_progress';
        batchJobs.set(batchId, record);
        await persistBatchRecord(record);
        console.log(`[generate-batch] Batch ${batchId} submitted to Anthropic as ${batch.id}`);
      } catch (err) {
        console.error(`[generate-batch] Background submission error for ${batchId}:`, err.message);
        record.status = 'error';
        record.error = err.message;
        batchJobs.set(batchId, record);
        await persistBatchRecord(record);
      }

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
    })();
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

    if (record.status === 'error') {
      return res.json({ status: 'error', error: record.error || 'Batch submission failed.' });
    }

    // Still uploading the batch payload to Anthropic — client should keep polling.
    if (record.status === 'submitting' || !record.anthropicBatchId) {
      return res.json({ status: 'submitting', total: record.total });
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

    // ── Check 10: Orphaned Service Page Check (cross-page, runs once the whole
    // batch is in) — every populated service must have a card on at least one
    // category page, otherwise its own service page would have nothing on the
    // site linking to it.
    let categoryResults = results.filter(r => r && r.pageType === 'category' && r.status === 'done');
    let usedSavedCategoryPages = false;

    // A resumed sub-batch of only service/location pages has no category
    // output of its own to check cards against. Rather than skip the check
    // (false negative — an orphan could slip through silently), fall back to
    // this client's previously saved category pages from the DB, if any.
    if (!categoryResults.length && record.clientId && pool) {
      try {
        const { rows } = await pool.query(
          `SELECT copy_output AS output FROM pages WHERE client_id = $1 AND page_type = 'category' AND copy_output IS NOT NULL`,
          [record.clientId]
        );
        if (rows.length) { categoryResults = rows; usedSavedCategoryPages = true; }
      } catch (dbErr) {
        console.error('[DB] Saved category page fetch error:', dbErr.message);
      }
    }

    const orphanIssues = categoryResults.length ? checkOrphanedServices(categoryResults, record.customValuesText) : [];
    if (orphanIssues.length) {
      // Not specific to any one page. If category pages were generated in
      // THIS run, attach to those so the issue surfaces wherever a human is
      // most likely to look. If we fell back to saved pages instead, there's
      // no in-run category page to attach to — attach to every completed
      // result in this batch instead so it isn't silently dropped.
      const attachTo = usedSavedCategoryPages
        ? results.filter(r => r && r.status === 'done')
        : categoryResults;
      for (const r of attachTo) r.issues = [...r.issues, ...orphanIssues];
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
      orphanedServices: orphanIssues.length,
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

// ── Geo research routes ───────────────────────────────────────────────────────

app.get('/api/research-modules', (_req, res) => {
  res.json({ modules: AVAILABLE_RESEARCH_MODULES, concurrency: RESEARCH_CONCURRENCY });
});

app.post('/api/research-start', async (req, res) => {
  const { sessionId, clientId, locations, moduleName } = req.body;

  if (!clientId) return res.status(400).json({ error: 'clientId is required for geo research.' });
  if (!Array.isArray(locations) || !locations.length) return res.status(400).json({ error: 'locations array is required.' });
  if (!moduleName || !RESEARCH_MODULES[moduleName]) {
    return res.status(400).json({ error: `Unknown module "${moduleName}". Available: ${AVAILABLE_RESEARCH_MODULES.join(', ')}` });
  }
  const includeSecurityAddOn = !!(req.body.includeSecurityAddOn) && moduleName === 'Dog Training';
  if (req.body.includeSecurityAddOn && !SECURITY_ADDON_MODULE) {
    console.warn('[research-start] Security add-on requested but module file not found — ignoring');
  }

  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired.' });

  // Validate codes are unique (case-insensitive) among active rows
  const codesSeen = new Set();
  const dupes     = [];
  for (const loc of locations) {
    const upper = (loc.code || '').toUpperCase();
    if (codesSeen.has(upper)) dupes.push(upper);
    codesSeen.add(upper);
  }
  if (dupes.length) return res.status(400).json({ error: 'duplicate_codes', codes: [...new Set(dupes)] });

  const jobId = crypto.randomUUID();
  const initialLocations = {};
  for (const loc of locations) {
    initialLocations[loc.code.toUpperCase()] = {
      name: loc.name, status: 'pending', startedAt: null, finishedAt: null,
      inputTokens: null, outputTokens: null, searchCount: null, cost: null,
      preset: PERPLEXITY_PRESET, assetId: null, error: null,
    };
  }

  const record = {
    id: jobId, sessionId: sessionId || '', clientId,
    status: 'running', preset: PERPLEXITY_PRESET,
    locations: initialLocations, createdAt: Date.now(),
  };
  researchJobs.set(jobId, record);
  await persistResearchRecord(record);

  // Respond immediately — research runs in background
  res.json({ jobId, total: locations.length });

  // Background: persist codes, then run locations in parallel (capped at RESEARCH_CONCURRENCY)
  (async () => {
    const { keyValueMap, serviceParentMap, trade } = session;
    const includeSecurityAddOn = !!(req.body.includeSecurityAddOn);

    // Persist new codes to client_locations for stability across future runs
    if (pool) {
      for (const loc of locations) {
        try {
          await pool.query(
            `INSERT INTO client_locations (client_id, location_name_norm, location_name_display, code)
             VALUES ($1,$2,$3,$4) ON CONFLICT (client_id, location_name_norm) DO NOTHING`,
            [clientId, normaliseLocation(loc.name), loc.name, loc.code.toUpperCase()]
          );
        } catch (dbErr) { console.error('[DB] client_locations upsert error:', dbErr.message); }
      }
    }

    // Concurrency-limited parallel execution using shared runOneLocation
    const queue    = [...locations];
    const inFlight = new Set();
    await new Promise(resolve => {
      function next() {
        while (inFlight.size < RESEARCH_CONCURRENCY && queue.length) {
          const loc = queue.shift();
          const p   = runOneLocation(record, clientId, loc, moduleName, keyValueMap, serviceParentMap, includeSecurityAddOn).finally(() => {
            inFlight.delete(p);
            if (queue.length === 0 && inFlight.size === 0) resolve();
            else next();
          });
          inFlight.add(p);
        }
        if (queue.length === 0 && inFlight.size === 0) resolve();
      }
      next();
    });
  })();
});

app.get('/api/research-status/:jobId', async (req, res) => {
  try {
    const record = await loadResearchRecord(req.params.jobId);
    if (!record) return res.status(404).json({ error: 'Research job not found or expired.' });
    res.json({ jobId: record.id, status: record.status, preset: record.preset, locations: record.locations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One-off recovery: re-fetch stored Perplexity job IDs for a location and re-process them.
// POST /api/admin/recover-location { clientId, locationName, extraJobIds?: string[] }
// Finds every pxJobId stored in research_jobs for clientId, matched by normalised location name.
// Reads the actual code from the stored record — never trusts the caller to supply it.
app.post('/api/admin/recover-location', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  const { clientId, locationName, extraJobIds } = req.body || {};
  if (!clientId || !locationName) return res.status(400).json({ error: 'clientId and locationName required.' });
  const targetNorm = normaliseLocation(locationName);

  // Scan all research_jobs for this client, find entries whose normalised name matches
  const { rows: jobRows } = await pool.query(
    `SELECT id, locations FROM research_jobs WHERE client_id = $1 ORDER BY created_at DESC`,
    [clientId]
  );

  const seen = new Set();
  const candidates = []; // { pxJobId, jobId, code, locName, loc }
  for (const row of jobRows) {
    const locs = row.locations || {};
    for (const [storedCode, loc] of Object.entries(locs)) {
      if (normaliseLocation(loc.name || '') !== targetNorm) continue;
      if (loc.pxJobId && !seen.has(loc.pxJobId)) {
        seen.add(loc.pxJobId);
        candidates.push({ pxJobId: loc.pxJobId, jobId: row.id, code: storedCode, locName: loc.name || locationName, loc });
      }
    }
  }

  // Add any extra IDs from the request (e.g. from logs that were overwritten in the DB)
  const baseEntry = candidates[0];
  for (const id of (extraJobIds || [])) {
    if (id && !seen.has(id)) {
      seen.add(id);
      candidates.push({
        pxJobId: id,
        jobId: baseEntry ? baseEntry.jobId : null,
        code:   baseEntry ? baseEntry.code  : null,
        locName: baseEntry ? baseEntry.locName : locationName,
        loc:    baseEntry ? baseEntry.loc    : { name: locationName, runType: '' },
      });
    }
  }

  if (!candidates.length) {
    return res.json({ message: `No pxJobId found for "${locationName}" in any research job.`, results: [] });
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PERPLEXITY_API_KEY not set.' });

  const results = [];
  const passing = [];

  for (const { pxJobId, jobId, code, locName, loc } of candidates) {
    console.log(`[recovery-admin] Fetching ${pxJobId} for "${locName}" (code: ${code})`);
    let pxRes;
    try {
      const fetchRes = await fetch(`https://api.perplexity.ai/v1/agent/${pxJobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!fetchRes.ok) {
        const errText = await fetchRes.text().catch(() => '');
        const msg = `Perplexity returned ${fetchRes.status}: ${errText.slice(0, 200)}`;
        console.warn(`[recovery-admin] ${pxJobId}: ${msg}`);
        results.push({ pxJobId, jobId, code, found: false, reason: msg });
        continue;
      }
      pxRes = await fetchRes.json();
    } catch (err) {
      results.push({ pxJobId, jobId, code, found: false, reason: err.message });
      continue;
    }

    if (pxRes.status !== 'completed') {
      results.push({ pxJobId, jobId, code, found: true, status: pxRes.status, reason: `Job not completed (status: ${pxRes.status})` });
      continue;
    }

    const rawText = extractPerplexityText(pxRes);
    console.log(`[recovery-admin] ${pxJobId}: extracted ${rawText.length} chars`);
    const { valid, text: cleanText, error: valErr, warnings } = validateAndCleanDossier(rawText);

    const rawUsage = pxRes.usage || null;
    const usage    = rawUsage || {};
    const inputTok = usage.input_tokens  || 0;
    const outputTok= usage.output_tokens || 0;
    let cost = 0;
    if (rawUsage && rawUsage.cost && rawUsage.cost.total_cost != null) {
      cost = rawUsage.cost.total_cost;
    } else if (inputTok || outputTok) {
      cost = (inputTok / 1e6) * PERPLEXITY_RATES.inputPerMToken + (outputTok / 1e6) * PERPLEXITY_RATES.outputPerMToken;
    }

    results.push({
      pxJobId, jobId, code, found: true, status: pxRes.status,
      textLength: rawText.length, valid, valErr: valid ? null : valErr,
      warnings: warnings || [], inputTok, outputTok, cost: parseFloat(cost.toFixed(6)),
    });

    if (valid) {
      passing.push({ pxJobId, jobId, code, locName, loc, cleanText, cost, inputTok, outputTok, rawUsage });
    }
  }

  // Pick best passing result: longest clean text
  if (passing.length) {
    passing.sort((a, b) => b.cleanText.length - a.cleanText.length);
    const best = passing[0];
    console.log(`[recovery-admin] Saving best result from ${best.pxJobId} (${best.cleanText.length} chars)`);

    await pool.query(
      `UPDATE client_assets SET metadata = COALESCE(metadata,'{}') || '{"superseded":true}'
       WHERE client_id = $1 AND asset_type = 'geo_dossier'
       AND metadata->>'location_norm' = $2
       AND NOT (metadata->>'superseded')::boolean`,
      [clientId, normaliseLocation(best.locName)]
    );
    const { rows: assetRows } = await pool.query(
      `INSERT INTO client_assets (client_id, asset_type, filename, content, metadata)
       VALUES ($1,'geo_dossier',$2,$3,$4::jsonb) RETURNING id`,
      [clientId,
       `${best.locName.replace(/\s+/g, '_')}_dossier.md`,
       best.cleanText,
       JSON.stringify({ location_name: best.locName, location_norm: normaliseLocation(best.locName), preset: PERPLEXITY_PRESET, superseded: false })]
    );
    const assetId = assetRows[0].id;

    if (best.jobId && best.code) {
      const record = await loadResearchRecord(best.jobId);
      if (record) {
        await updateResearchLocation(record, best.code, {
          status: 'done', finishedAt: new Date().toISOString(),
          inputTokens: best.inputTok, outputTokens: best.outputTok,
          rawUsage: best.rawUsage, cost: parseFloat(best.cost.toFixed(6)),
          preset: PERPLEXITY_PRESET, assetId, error: null,
        });
      }
    }

    return res.json({
      saved: true, assetId, chosenJobId: best.pxJobId, code: best.code,
      textLength: best.cleanText.length, cost: parseFloat(best.cost.toFixed(6)),
      passing: passing.map(p => p.pxJobId), results,
    });
  }

  // No passing result — save raw output from longest completed response as validation_failed
  const longest = results
    .filter(r => r.found && r.status === 'completed' && r.textLength > 0)
    .sort((a, b) => b.textLength - a.textLength)[0];
  if (longest) {
    const cand = candidates.find(c => c.pxJobId === longest.pxJobId);
    if (cand && cand.jobId && cand.code) {
      const record = await loadResearchRecord(cand.jobId);
      if (record) {
        const rawPxRes = await fetch(`https://api.perplexity.ai/v1/agent/${longest.pxJobId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        }).then(r => r.json()).catch(() => null);
        if (rawPxRes) {
          await updateResearchLocation(record, cand.code, {
            status: 'validation_failed', finishedAt: new Date().toISOString(),
            error: `Validation failed: ${longest.valErr}`,
            rawOutputText: extractPerplexityText(rawPxRes),
            rawOutputJson: JSON.stringify(rawPxRes),
            inputTokens: longest.inputTok, outputTokens: longest.outputTok,
            cost: longest.cost, preset: PERPLEXITY_PRESET,
          });
        }
      }
    }
  }

  res.json({ saved: false, results, message: 'No result passed validation; raw output saved as validation_failed where possible.' });
});

// Debug: fetch a pxJobId from Perplexity and return a structure summary (no dossier text).
// GET /api/admin/debug-px-response?jobId=xxx&code=SOU&clientId=yyy
app.get('/api/admin/debug-px-response', async (req, res) => {
  const { jobId, code, clientId } = req.query;
  if (!jobId || !code || !clientId) return res.status(400).json({ error: 'jobId, code, clientId required.' });
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PERPLEXITY_API_KEY not set.' });

  // Look up pxJobId from DB
  const { rows } = await pool.query(
    `SELECT id, locations FROM research_jobs WHERE id = $1 AND client_id = $2 LIMIT 1`,
    [jobId, clientId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Research job not found.' });
  const loc = (rows[0].locations || {})[code.toUpperCase()];
  if (!loc || !loc.pxJobId) return res.status(404).json({ error: 'No pxJobId for this location.' });

  const pxJobId = loc.pxJobId;
  const fetchRes = await fetch(`https://api.perplexity.ai/v1/agent/${pxJobId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!fetchRes.ok) {
    const t = await fetchRes.text().catch(() => '');
    return res.status(502).json({ error: `Perplexity ${fetchRes.status}: ${t.slice(0, 200)}` });
  }
  const pxRes = await fetchRes.json();

  // --- Structure summary ---
  function describeKeys(obj) {
    if (!obj || typeof obj !== 'object') return typeof obj;
    if (Array.isArray(obj)) return `Array[${obj.length}]`;
    return Object.keys(obj);
  }

  function describeArray(arr, label) {
    if (!Array.isArray(arr) || !arr.length) return null;
    const sample = arr[0];
    const itemKeys = (sample && typeof sample === 'object' && !Array.isArray(sample))
      ? Object.keys(sample) : ['(primitive)'];
    // Recurse one more level for nested arrays
    const nested = {};
    for (const k of itemKeys) {
      if (Array.isArray(sample[k]) && sample[k].length) {
        const s2 = sample[k][0];
        nested[k] = Array.isArray(s2) ? `Array[${sample[k].length}]`
          : (s2 && typeof s2 === 'object' ? Object.keys(s2) : typeof s2);
      }
    }
    return { label, length: arr.length, itemKeys, nested: Object.keys(nested).length ? nested : undefined };
  }

  // Find first N occurrences of "http" anywhere in JSON, with their path
  function findHttpPaths(obj, path, results, max) {
    if (results.length >= max) return;
    if (typeof obj === 'string' && obj.includes('http')) {
      results.push({ path, snippet: obj.slice(0, 120) });
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length && results.length < max; i++) {
        findHttpPaths(obj[i], `${path}[${i}]`, results, max);
      }
    } else if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        if (results.length >= max) break;
        findHttpPaths(obj[k], `${path}.${k}`, results, max);
      }
    }
  }

  const topKeys = Object.keys(pxRes);
  const outputSummary = Array.isArray(pxRes.output) ? pxRes.output.map((item, i) => ({
    index: i,
    type: item.type,
    keys: item && typeof item === 'object' ? Object.keys(item) : [],
    contentSummary: Array.isArray(item.content) ? describeArray(item.content, 'content') : null,
  })) : null;

  const arraySummaries = [];
  for (const k of topKeys) {
    const s = describeArray(pxRes[k], k);
    if (s) arraySummaries.push(s);
  }

  const httpPaths = [];
  findHttpPaths(pxRes, 'root', httpPaths, 3);

  // Simulate resolveCitations urlMap to show what we'd actually build
  let urlMapSize = 0;
  const urlMapSample = {};
  if (Array.isArray(pxRes.output)) {
    let idx = 1;
    for (const item of pxRes.output) {
      if (item.type === 'search_results' && Array.isArray(item.results)) {
        for (const r of item.results) {
          if (r.url) { if (idx <= 3) urlMapSample[idx] = r.url; urlMapSize++; }
          idx++;
        }
      }
    }
  }

  // Show annotation structure from first message content item
  let annotationSample = null;
  if (Array.isArray(pxRes.output)) {
    for (const item of pxRes.output) {
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (Array.isArray(c.annotations) && c.annotations.length) {
            annotationSample = c.annotations.slice(0, 2);
            break;
          }
        }
        if (annotationSample) break;
      }
    }
  }

  res.json({
    pxJobId,
    status: pxRes.status,
    topKeys,
    outputSummary,
    topLevelArrays: arraySummaries,
    firstHttpPaths: httpPaths,
    citationResolution: { urlMapSize, urlMapSample, annotationSample },
  });
});

// POST /api/admin/calibrate-citations { clientId, locationName }
// Reads the stored rawOutputJson for a location, extracts inline [URL][web:N] calibration pairs,
// tests all candidate mapping strategies and reports match rates.
app.post('/api/admin/calibrate-citations', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  const { clientId, locationName } = req.body || {};
  if (!clientId || !locationName) return res.status(400).json({ error: 'clientId and locationName required.' });
  const targetNorm = normaliseLocation(locationName);

  const { rows: jobRows } = await pool.query(
    `SELECT id, locations FROM research_jobs WHERE client_id = $1 ORDER BY created_at DESC`,
    [clientId]
  );

  let loc = null, record = null, locCode = null;
  for (const row of jobRows) {
    for (const [c, l] of Object.entries(row.locations || {})) {
      if (normaliseLocation(l.name || '') === targetNorm) {
        loc = l; locCode = c;
        record = { id: row.id, locations: row.locations };
        break;
      }
    }
    if (loc) break;
  }
  if (!loc) return res.status(404).json({ error: `No research record found for "${locationName}".` });

  const apiKey = process.env.PERPLEXITY_API_KEY;
  let pxRes, source = 'stored';

  if (loc.rawOutputJson) {
    try { pxRes = JSON.parse(loc.rawOutputJson); } catch (e) {
      return res.status(500).json({ error: `Failed to parse rawOutputJson: ${e.message}` });
    }
  } else if (loc.pxJobId) {
    if (!apiKey) return res.status(500).json({ error: 'PERPLEXITY_API_KEY not set — cannot re-fetch.' });
    source = 're-fetched';
    console.log(`[calibrate] Re-fetching ${loc.pxJobId} from Perplexity for "${locationName}"`);
    const fetchRes = await fetch(`https://api.perplexity.ai/v1/agent/${loc.pxJobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!fetchRes.ok) {
      const t = await fetchRes.text().catch(() => '');
      return res.status(502).json({ error: `Perplexity returned ${fetchRes.status}: ${t.slice(0, 200)}` });
    }
    pxRes = await fetchRes.json();
    if (pxRes.status !== 'completed') {
      return res.json({ error: `Perplexity job not completed (status: ${pxRes.status})` });
    }
    // Save rawOutputJson so future calibrations / reprocesses don't need to re-fetch
    try {
      const updatedLoc = { ...loc, rawOutputJson: JSON.stringify(pxRes) };
      const updatedLocs = { ...record.locations, [locCode]: updatedLoc };
      await pool.query(
        `UPDATE research_jobs SET locations = $1 WHERE id = $2`,
        [JSON.stringify(updatedLocs), record.id]
      );
      console.log(`[calibrate] Saved rawOutputJson for "${locationName}"`);
    } catch (saveErr) {
      console.warn(`[calibrate] Failed to save rawOutputJson: ${saveErr.message}`);
    }
  } else {
    return res.status(404).json({ error: 'No rawOutputJson and no pxJobId stored for this location.' });
  }

  const rawText = extractPerplexityText(pxRes);
  const pairs = extractInlinePairs(rawText);
  const maps = buildCitationMaps(pxRes);

  // Summarise each map
  const mapSummaries = {};
  for (const [name, map] of Object.entries(maps)) {
    const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
    mapSummaries[name] = { entryCount: keys.length, minKey: keys[0] ?? null, maxKey: keys[keys.length - 1] ?? null, sample: Object.fromEntries(keys.slice(0, 3).map(k => [k, map[k]])) };
  }

  const strategies = pairs.length > 0 ? testCitationStrategies(pairs, maps) : [];

  // Show first 5 calibration pairs for manual verification
  const pairSample = pairs.slice(0, 5).map(({ n, url }) => {
    const idMatch  = maps.idBased[n];
    const srMatch  = maps.flatSearchResults[n];
    const allMatch = maps.flatAllResults[n];
    return { n, inlineUrl: url, idBased: idMatch || null, flatSR: srMatch || null, flatAll: allMatch || null };
  });

  res.json({
    locationName,
    source,
    rawTextLength: rawText.length,
    calibrationPairs: pairs.length,
    pairSample,
    mapSummaries,
    strategyResults: strategies.map(s => ({
      strategy: s.strategy,
      matched: s.matched,
      total: s.total,
      matchRate: (s.matchRate * 100).toFixed(1) + '%',
      meetsThreshold: s.matchRate >= 0.95,
    })),
    recommendation: strategies.length > 0
      ? (strategies[0].matchRate >= 0.95 ? `Use "${strategies[0].strategy}" (${(strategies[0].matchRate * 100).toFixed(1)}% match rate)` : `No strategy meets 95% threshold (best: "${strategies[0].strategy}" at ${(strategies[0].matchRate * 100).toFixed(1)}%) — strip markers, keep inline URLs only`)
      : (pairs.length === 0 ? 'No inline calibration pairs found in raw text — id-based mapping will be used uncalibrated' : 'Too few pairs to calibrate'),
  });
});

// Re-process a location's stored (or re-fetched) raw Perplexity response with current logic.
// POST /api/admin/reprocess-location { clientId, locationName }
// Uses stored rawOutputJson if present (validation_failed rows), otherwise re-fetches via pxJobId.
// Returns { sourceCount, lowSources, saved, status, ... } per attempt.
app.post('/api/admin/reprocess-location', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  const { clientId, locationName } = req.body || {};
  if (!clientId || !locationName) return res.status(400).json({ error: 'clientId and locationName required.' });
  const targetNorm = normaliseLocation(locationName);

  // Find the most recent research_job entry for this location
  const { rows: jobRows } = await pool.query(
    `SELECT id, locations FROM research_jobs WHERE client_id = $1 ORDER BY created_at DESC`,
    [clientId]
  );

  let record = null, code = null, loc = null, jobId = null;
  outer: for (const row of jobRows) {
    for (const [c, l] of Object.entries(row.locations || {})) {
      if (normaliseLocation(l.name || '') === targetNorm) {
        jobId = row.id; code = c; loc = l;
        record = { id: row.id, sessionId: row.session_id || null, clientId,
                   status: row.status, preset: row.preset,
                   locations: row.locations || {}, createdAt: new Date(row.created_at || 0).getTime() };
        break outer;
      }
    }
  }
  if (!record) return res.status(404).json({ error: `No research record found for "${locationName}".` });

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PERPLEXITY_API_KEY not set.' });

  // Get pxRes: prefer stored rawOutputJson, fall back to re-fetching
  let pxRes = null;
  let source = 'stored';
  if (loc.rawOutputJson) {
    try { pxRes = JSON.parse(loc.rawOutputJson); } catch (_) {}
  }
  if (!pxRes) {
    if (!loc.pxJobId) return res.status(404).json({ error: 'No stored response and no pxJobId to re-fetch from.' });
    source = 're-fetched';
    console.log(`[reprocess] Re-fetching ${loc.pxJobId} from Perplexity for "${locationName}"`);
    const fetchRes = await fetch(`https://api.perplexity.ai/v1/agent/${loc.pxJobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!fetchRes.ok) {
      const errText = await fetchRes.text().catch(() => '');
      return res.status(502).json({ error: `Perplexity returned ${fetchRes.status}: ${errText.slice(0, 200)}` });
    }
    pxRes = await fetchRes.json();
    if (pxRes.status !== 'completed') {
      return res.json({ saved: false, reason: `Perplexity job not completed (status: ${pxRes.status})` });
    }
  }

  // Preserve original timing and cost so reprocessing doesn't overwrite them
  const preserveOriginal = {
    cost:         loc.cost         || null,
    startedAt:    loc.startedAt    || null,
    finishedAt:   loc.finishedAt   || null,
    inputTokens:  loc.inputTokens  || null,
    outputTokens: loc.outputTokens || null,
  };

  // Run through full current finishLocation logic (mutates record in-memory + DB)
  researchJobs.set(record.id, record);
  try {
    const result = await finishLocation(record, clientId, code, loc, pxRes, preserveOriginal);
    const updatedLoc = record.locations[code] || {};
    return res.json({
      saved: result && !result.validationFailed,
      validationFailed: result && result.validationFailed,
      sourceCount: result && result.sourceCount != null ? result.sourceCount : updatedLoc.sourceCount,
      lowSources:  result && result.lowSources  != null ? result.lowSources  : updatedLoc.lowSources,
      status: updatedLoc.status,
      error:  updatedLoc.error || null,
      source,
      assetId: updatedLoc.assetId || null,
      cost:    updatedLoc.cost    || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/supersede-dossier { clientId, locationName }
// Marks the active dossier for a location as superseded so the row reverts to pending/re-runnable.
app.post('/api/admin/supersede-dossier', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  const { clientId, locationName } = req.body || {};
  if (!clientId || !locationName) return res.status(400).json({ error: 'clientId and locationName required.' });
  const targetNorm = normaliseLocation(locationName);
  try {
    const { rowCount } = await pool.query(
      `UPDATE client_assets SET metadata = COALESCE(metadata,'{}') || '{"superseded":true}'
       WHERE client_id = $1 AND asset_type = 'geo_dossier'
       AND metadata->>'location_norm' = $2
       AND NOT (metadata->>'superseded')::boolean`,
      [clientId, targetNorm]
    );
    res.json({ superseded: rowCount, locationName });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Raw output viewer — returns saved rawOutputText for a validation_failed or failed location
app.get('/api/research/:jobId/location/:code/raw', async (req, res) => {
  try {
    const record = await loadResearchRecord(req.params.jobId);
    if (!record) return res.status(404).json({ error: 'Research job not found.' });
    const loc = record.locations[req.params.code.toUpperCase()];
    if (!loc) return res.status(404).json({ error: 'Location not found in job.' });
    if (!loc.rawOutputText) return res.status(404).json({ error: 'No raw output saved for this location.' });
    res.json({ text: loc.rawOutputText, error: loc.error || null, status: loc.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Merged location status for the geo step UI.
// Returns one entry per location found in the most-recent research_job for this client,
// merged with active dossier data from client_assets.
// Shape per location: { code, name, status, assetId, uploadedAt, cost, startedAt, finishedAt,
//   inputTokens, outputTokens, error, pxJobId, jobId }
app.get('/api/clients/:clientId/geo-location-status', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const clientId = req.params.clientId;

    // Active dossiers: norm → { id, uploadedAt }
    const { rows: assetRows } = await pool.query(
      `SELECT id, metadata, uploaded_at FROM client_assets
       WHERE client_id = $1 AND asset_type = 'geo_dossier'
       AND (metadata IS NULL OR NOT (metadata->>'superseded')::boolean)`,
      [clientId]
    );
    const dossierByNorm = {};
    for (const r of assetRows) {
      const norm = (r.metadata && r.metadata.location_norm) || '';
      if (norm) dossierByNorm[norm] = { id: r.id, uploadedAt: r.uploaded_at, locationName: r.metadata && r.metadata.location_name || '' };
    }

    // Most-recent research_job for this client (by created_at)
    const { rows: jobRows } = await pool.query(
      `SELECT id, locations FROM research_jobs WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [clientId]
    );

    const locations = {};
    if (jobRows.length) {
      const { id: jobId, locations: locs } = jobRows[0];
      for (const [code, loc] of Object.entries(locs || {})) {
        const norm = normaliseLocation(loc.name || '');
        const dos  = dossierByNorm[norm];
        locations[code] = {
          code, name: loc.name || code, jobId,
          status:      dos ? 'done' : (loc.status || 'pending'),
          assetId:     dos ? dos.id : (loc.assetId || null),
          uploadedAt:  dos ? dos.uploadedAt : null,
          cost:        loc.cost        || null,
          startedAt:   loc.startedAt   || null,
          finishedAt:  loc.finishedAt  || null,
          inputTokens: loc.inputTokens || null,
          outputTokens:loc.outputTokens|| null,
          error:       loc.error        || null,
          pxJobId:              loc.pxJobId              || null,
          sourceCount:          loc.sourceCount           ?? null,
          lowSources:           loc.lowSources            ?? null,
          hasUnresolvedMarkers: loc.hasUnresolvedMarkers  ?? false,
        };
      }
    }

    // Also include any locations that only have a dossier (no research_job entry)
    for (const [norm, dos] of Object.entries(dossierByNorm)) {
      const alreadyPresent = Object.values(locations).some(l => normaliseLocation(l.name) === norm);
      if (!alreadyPresent) {
        locations[`_dos_${norm}`] = {
          code: null, name: dos.locationName || norm, jobId: null,
          status: 'done', assetId: dos.id, uploadedAt: dos.uploadedAt,
          cost: null, startedAt: null, finishedAt: null,
          inputTokens: null, outputTokens: null, error: null, pxJobId: null,
        };
      }
    }

    res.json({ locations });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Dossier management routes ─────────────────────────────────────────────────

// List active dossiers for a client (used by the geo step UI to show dossier status)
app.get('/api/clients/:clientId/dossiers', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const { rows } = await pool.query(
      `SELECT id, filename, metadata, uploaded_at
       FROM client_assets
       WHERE client_id = $1 AND asset_type = 'geo_dossier'
       AND (metadata IS NULL OR NOT (metadata->>'superseded')::boolean)
       ORDER BY uploaded_at DESC`,
      [req.params.clientId]
    );
    res.json({ dossiers: rows.map(r => ({
      id:           r.id,
      locationName: r.metadata && r.metadata.location_name || r.filename,
      locationNorm: r.metadata && r.metadata.location_norm || '',
      preset:       r.metadata && r.metadata.preset || null,
      uploadedAt:   r.uploaded_at,
    })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Download all active dossiers for a client as a zip
// NOTE: this must be registered BEFORE /:assetId routes to avoid route shadowing
app.get('/api/clients/:clientId/dossiers/download-all', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const { rows: clientRows } = await pool.query('SELECT name FROM clients WHERE id = $1', [req.params.clientId]);
    if (!clientRows.length) return res.status(404).send('Client not found.');
    const clientName = (clientRows[0].name || 'client').replace(/[^a-zA-Z0-9_-]/g, '_');

    const { rows } = await pool.query(
      `SELECT content, filename, metadata FROM client_assets
       WHERE client_id = $1 AND asset_type = 'geo_dossier'
       AND (metadata IS NULL OR NOT (metadata->>'superseded')::boolean)`,
      [req.params.clientId]
    );
    if (!rows.length) return res.status(404).send('No dossiers found for this client.');

    const zip = new JSZip();
    for (const row of rows) {
      const locName = (row.metadata && row.metadata.location_name || 'Location').replace(/\s+/g, '_');
      zip.file(`${locName}_Dossier.md`, row.content);
    }
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${clientName}_dossiers.zip"`);
    res.send(buffer);
  } catch (err) { res.status(500).send(err.message); }
});

// Get dossier content for viewing
app.get('/api/clients/:clientId/dossiers/:assetId', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const { rows } = await pool.query(
      `SELECT content, filename, metadata FROM client_assets
       WHERE id = $1 AND client_id = $2 AND asset_type = 'geo_dossier'`,
      [req.params.assetId, req.params.clientId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Dossier not found.' });
    res.json({ content: rows[0].content, filename: rows[0].filename, metadata: rows[0].metadata });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Download single dossier as .md
app.get('/api/clients/:clientId/dossiers/:assetId/download', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const { rows } = await pool.query(
      `SELECT content, filename, metadata FROM client_assets
       WHERE id = $1 AND client_id = $2 AND asset_type = 'geo_dossier'`,
      [req.params.assetId, req.params.clientId]
    );
    if (!rows.length) return res.status(404).send('Dossier not found.');
    const locName  = (rows[0].metadata && rows[0].metadata.location_name || 'Location').replace(/\s+/g, '_');
    const filename = `${locName}_Dossier.md`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(rows[0].content);
  } catch (err) { res.status(500).send(err.message); }
});

// Re-run research for a single location (adds to or creates a research job record)
app.post('/api/research-rerun', async (req, res) => {
  const { jobId, sessionId, clientId, location, moduleName, includeSecurityAddOn } = req.body;

  if (!clientId) return res.status(400).json({ error: 'clientId is required.' });
  if (!location || !location.name || !location.code) return res.status(400).json({ error: 'location {name, code} is required.' });
  if (!moduleName || !RESEARCH_MODULES[moduleName]) {
    return res.status(400).json({ error: `Unknown module "${moduleName}".` });
  }

  const session = sessions.get(sessionId);
  const keyValueMap    = session ? session.keyValueMap    : {};
  const serviceParentMap = session ? session.serviceParentMap : {};

  let record = jobId ? (await loadResearchRecord(jobId)) : null;
  if (!record) {
    record = { id: crypto.randomUUID(), sessionId: sessionId || '', clientId, status: 'running', preset: PERPLEXITY_PRESET, locations: {}, createdAt: Date.now() };
    researchJobs.set(record.id, record);
    await persistResearchRecord(record);
  }

  const code = location.code.toUpperCase();
  if (!record.locations[code]) {
    record.locations[code] = { name: location.name, status: 'pending', startedAt: null, finishedAt: null, inputTokens: null, outputTokens: null, searchCount: null, rawUsage: null, cost: null, preset: PERPLEXITY_PRESET, assetId: null, error: null };
  }

  res.json({ jobId: record.id });

  const includeAddon = !!(includeSecurityAddOn) && moduleName === 'Dog Training';
  (async () => {
    await runOneLocation(record, clientId, location, moduleName, keyValueMap, serviceParentMap, includeAddon);
  })();
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
    const legacyGeoText   = getAsset('geo_research');
    const onboardingText  = getAsset('onboarding');
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

    const dossierMap      = await loadDossierMap(req.params.clientId);
    const primaryCityNorm = normaliseLocation(keyValueMap['biz_area_1'] || '');
    const primaryGeo      = dossierMap.get(primaryCityNorm) || legacyGeoText || null;
    const { dossierText, skipReason } = selectDossierForJob(dossierMap, job, primaryGeo);
    if (skipReason) return res.status(422).json({ error: `Cannot regenerate: ${skipReason}` });

    const prompt    = buildSitePrompt(job, calibrationPack, keyValueMap, serviceParentMap, dossierText, onboardingText, page.trade);
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
initDb().then(async () => {
  await recoverInterruptedResearchJobs();
  app.listen(PORT, () => console.log(`Copy bot running at http://localhost:${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
