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
const { makeCallModel } = require('./anthropic-call');
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const multer     = require('multer');
const Papa       = require('papaparse');
const JSZip      = require('jszip');
const { validate, checkOrphanedServices } = require('./validate');
const { pool, initDb } = require('./db');
const { computeDecisions } = require('./decisions');
const allocation = require('./allocation');
const { parseDossier } = require('./geo-dossier');
const v20 = require('./v20-generate');
const reader = require('./v20-reader');
const { practicesFor, PRACTICES } = require('./practices');

const app = express();

// ── Fillout onboarding webhook ───────────────────────────────────────────────
// Mounted before the app-wide JSON parser and before the login middleware:
// Fillout authenticates with FILLOUT_WEBHOOK_SECRET (header or ?token=), and the
// route has its own 2 MB body limit. fillout/routes.js, fillout/service.js.
const filloutRoutes = require('./fillout/routes');
const { createFilloutService } = require('./fillout/service');
const { createPgAudioStore } = require('./fillout/audio-store');
// Price extraction uses the same model and call helper as v20 generation (V20_MODEL via anthropic-call.js)
const filloutCallModel = process.env.ANTHROPIC_API_KEY ? makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), v20.V20_MODEL) : null;
const filloutService = pool ? createFilloutService({ pool, audioStore: createPgAudioStore(pool), callModel: filloutCallModel, modelName: v20.V20_MODEL }) : null;
if (filloutService) filloutRoutes.mountWebhook(app, filloutService, { secret: process.env.FILLOUT_WEBHOOK_SECRET || '' });
else app.post('/api/webhooks/fillout', (_req, res) => res.status(503).json({ error: 'Database not configured.' }));

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

// ── Trade facts: one research pack per niche, the verified flag, the service page gate ──
// (trade-facts/store.js). Service pages are only written from a verified pack.
const tradeFacts = require('./trade-facts/store').createTradeFactsService({ pool });
require('./trade-facts/routes').mountTradeFactsApi(app, tradeFacts);
// The niche the gate checks for a client: the allocated niche key, else the trade
async function nicheForGate(clientId, trade) {
  if (clientId && pool) {
    const { rows } = await pool.query(`SELECT niche_key, trade FROM clients WHERE id = $1`, [clientId]).catch(() => ({ rows: [] }));
    if (rows[0]) return rows[0].niche_key && rows[0].niche_key !== 'other' ? rows[0].niche_key : (rows[0].trade || trade);
  }
  return trade;
}

// ── Load core prompt files ────────────────────────────────────────────────────

function readDoc(name) {
  const base = name.replace(/\.md$/, '');
  // Search root and prompts/ subdirectory; pick the highest-numbered copy across both.
  const searchDirs = [__dirname, path.join(__dirname, 'prompts')];
  let best = null;
  let bestN = -1;
  let bestDir = null;
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f === `${base}.md`) { if (bestN < 0) { best = f; bestN = 0; bestDir = dir; } }
      const m = f.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\((\\d+)\\)\\.md$`));
      if (m) { const n = parseInt(m[1], 10); if (n > bestN) { best = f; bestN = n; bestDir = dir; } }
    }
  }
  if (best) {
    console.log(`  LOADED: ${best}`);
    return fs.readFileSync(path.join(bestDir, best), 'utf8');
  }
  throw new Error(`Cannot find ${name} (or numbered copies) in ${__dirname} or prompts/`);
}

// ── Niche library ─────────────────────────────────────────────────────────────

const NICHE_DIR = path.join(__dirname, 'niche-library');

// Required top-level keys in every niche JSON. G-NICHE fires if any are missing or empty.
const NICHE_REQUIRED_KEYS = [
  'trade', 'trade_lower', 'trade_person', 'trade_person_plural',
  'customer_type', 'unit_of_work', 'emergency_niche', 'big_ticket',
  'schema_subtype', 'words_use', 'words_avoid', 'buttons', 'steps',
  'cover_chain', 'fears', 'faq_slots', 'materials_tick_list', 'why_titles_alt',
];

// Map from primary_category (case-insensitive) to niche JSON filename stem.
// Extend this when new niche files are added.
const NICHE_FILE_MAP = {
  'landscaper':          'landscaper',
  'landscaper gardener': 'landscaper',
  'landscaping':         'landscaper',
  'roofing company':     'roofer',
  'roofing contractor':  'roofer',
  'roofer':              'roofer',
};

function loadNiche(primaryCategory) {
  const key = (primaryCategory || '').toLowerCase().trim();
  const stem = NICHE_FILE_MAP[key];
  if (!stem) {
    return { niche: null, error: `G-NICHE: no niche file for trade "${primaryCategory}". Add one to niche-library/.` };
  }
  const filePath = path.join(NICHE_DIR, `${stem}.json`);
  if (!fs.existsSync(filePath)) {
    return { niche: null, error: `G-NICHE: niche file ${stem}.json not found in niche-library/.` };
  }
  let niche;
  try {
    niche = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return { niche: null, error: `G-NICHE: failed to parse ${stem}.json — ${e.message}` };
  }
  const missing = NICHE_REQUIRED_KEYS.filter(k => {
    const v = niche[k];
    if (v === undefined || v === null) return true;
    if (Array.isArray(v) && v.length === 0) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  });
  if (missing.length) {
    return { niche: null, error: `G-NICHE: niche file ${stem}.json is missing required slots: ${missing.join(', ')}` };
  }
  return { niche, error: null };
}

console.log('Loading prompt files...');
const HOMEPAGE_PROMPT = readDoc('Homepage_Copywriting_Prompt_CORE (19).md'); // old path pins to (19); CORE (20) is loaded by v20 generation (Stage 6, not built yet)
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
const RESEARCH_CONCURRENCY    = Math.max(1, parseInt(process.env.RESEARCH_CONCURRENCY, 10) || 3);
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

const { PAGE_TYPE_MAP, LINK_ONLY_PAGE_TYPES, parsePageMap, parseCustomValues, parseOnboardingForm, onboardingQA, isAdminArea } = require('./client-files');

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
    if (LINK_ONLY_PAGE_TYPES.has(page.pageType)) continue;
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
// Build an id→url map from search_results items using the authoritative id field.
// Docs confirm: search_results[].id is the number used in [web:N] markers.
function buildIdMap(pxRes) {
  const map = {};
  if (!Array.isArray(pxRes.output)) return map;
  for (const item of pxRes.output) {
    if (item.type === 'search_results' && Array.isArray(item.results)) {
      for (const r of item.results) {
        if (r.id != null && r.url) map[r.id] = r.url;
      }
    }
  }
  return map;
}

// Resolve [web:N] citation markers in text using the id-based map.
// Step 1: [URL][web:N] — keep the inline URL, drop the marker (inline URL is authoritative).
// Step 2: standalone [web:N] — replace with [URL] if id found in map, otherwise strip.
// Returns { text, kept, resolved, unmatched, sourceCount }.
function resolveCitations(text, pxRes) {
  const idMap = buildIdMap(pxRes);
  let kept = 0, resolved = 0, unmatched = 0;

  // Step 1: keep inline URL, drop marker
  let out = text.replace(/(\[https?:\/\/[^\]]+\])\[web:\d+\]/g, (_, url) => {
    kept++;
    return url;
  });

  // Step 2: id-based lookup for standalone markers
  out = out.replace(/\[web:(\d+)\]/g, (_match, n) => {
    const url = idMap[parseInt(n, 10)];
    if (url) { resolved++; return `[${url}]`; }
    unmatched++;
    return '';
  });

  const sourceCount = (out.match(/\[https?:\/\//g) || []).length;
  console.log(`[citations] idMap size: ${Object.keys(idMap).length}, kept inline: ${kept}, resolved: ${resolved}, unmatched: ${unmatched}`);
  return { text: out, kept, resolved, unmatched, sourceCount };
}

// Build a "## 9. SOURCES CONSULTED" section from all search_results and fetch_url_results
// items in a Perplexity response. Deduplicates by URL. Returns the markdown string, or ''.
function buildSourcesSection(pxRes) {
  if (!Array.isArray(pxRes.output)) return '';
  const seen = new Set();
  const entries = [];
  for (const item of pxRes.output) {
    const isSearch = item.type === 'search_results';
    const isFetch  = item.type === 'fetch_url_results';
    if (!isSearch && !isFetch) continue;
    const resultArr = item.results || item.contents || [];
    for (const r of resultArr) {
      const url   = r.url   || null;
      const title = r.title || r.source || null;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      entries.push({ url, title });
    }
  }
  if (!entries.length) return '';
  const lines = entries.map(({ url, title }) =>
    title ? `- [${title}](${url})` : `- ${url}`
  );
  return `\n\n## 9. SOURCES CONSULTED\n\n${lines.join('\n')}`;
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

  // Detect markdown table format (| header | ... rows)
  const hasTables = /^\|.+\|/m.test(text);
  if (hasTables) warnings.push('format:tables');

  return { valid: true, text, warnings, hasUnresolvedMarkers: unresolvedMarkers.length > 0, hasTables };
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
// Submit to Perplexity with exponential backoff on 429. 429 retries are separate from
// the outer attempt loop in runOneLocation and never count against it.
// onWaiting(delaySec) is called so the caller can update the UI status.
async function submitPerplexity(promptText, onWaiting) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY environment variable is not set');

  // Schedule: 30s, 60s, 120s, 240s, then repeat 240s indefinitely up to 20 min total.
  const BACKOFF_DELAYS_MS = [30000, 60000, 120000, 240000];
  const MAX_WAIT_MS = 20 * 60 * 1000; // 20 minutes total
  const MAX_RETRY_AFTER_MS = 5 * 60 * 1000; // cap Retry-After at 5 min
  let totalWaited = 0;
  let rateLimitAttempt = 0; // separate counter so 429 retries don't count against outer attempts

  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.perplexity.ai/v1/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ preset: PERPLEXITY_PRESET, input: promptText, background: true }),
    });

    if (res.status === 429) {
      // Honour Retry-After header if present (capped), otherwise use exponential schedule
      const retryAfterSec = parseInt(res.headers.get('Retry-After') || '', 10);
      const scheduledDelay = BACKOFF_DELAYS_MS[Math.min(rateLimitAttempt, BACKOFF_DELAYS_MS.length - 1)];
      const delayMs = (!isNaN(retryAfterSec) && retryAfterSec > 0)
        ? Math.min(retryAfterSec * 1000, MAX_RETRY_AFTER_MS)
        : scheduledDelay;

      // Check before sleeping — if we've already waited long enough, give up now
      if (totalWaited + delayMs > MAX_WAIT_MS) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Perplexity 429 rate limit — gave up after ${Math.round(totalWaited / 1000)}s waiting: ${errText.slice(0, 200)}`);
      }

      totalWaited += delayMs;
      rateLimitAttempt++;
      attempt--; // don't consume the outer retry slot for rate-limit waits

      const delaySec = Math.round(delayMs / 1000);
      console.warn(`[research] 429 rate limit — waiting ${delaySec}s before retry (total waited: ${Math.round(totalWaited / 1000)}s, attempt ${rateLimitAttempt})`);
      if (onWaiting) onWaiting(delaySec);
      await new Promise(r => setTimeout(r, delayMs));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Perplexity submit error ${res.status}: ${errText.slice(0, 300)}`);
    }

    const submitted = await res.json();
    if (!submitted.id) throw new Error('Perplexity submit returned no response id');
    console.log(`[research] Perplexity job queued: ${submitted.id}`);
    return submitted.id;
  }
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
                // (the FAQ research row the way faq-service.js does)
                if (loc.kind === 'faq' && faqService) await faqService.finishResearch(record, record.clientId, pxRes);
                else await finishLocation(record, record.clientId, code, loc, pxRes);
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
  const { text: resolvedText, kept, resolved, unmatched } = resolveCitations(rawText, pxRes);
  console.log(`[research] "${loc.name}" citations: kept ${kept} inline, resolved ${resolved} by id, unmatched ${unmatched}`);

  let cost;
  if (rawUsage && rawUsage.cost && rawUsage.cost.total_cost != null) {
    cost = rawUsage.cost.total_cost;
  } else {
    console.warn(`[research] No cost in Perplexity response for "${loc.name}" — using fallback rate constants. Verify PERPLEXITY_RATES match current pricing.`);
    cost = (inputTok / 1e6) * PERPLEXITY_RATES.inputPerMToken + (outputTok / 1e6) * PERPLEXITY_RATES.outputPerMToken;
  }
  const costVal = parseFloat(cost.toFixed(6));

  const { valid, text: cleanText, error: valErr, warnings, hasUnresolvedMarkers, hasTables } = validateAndCleanDossier(resolvedText);
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

  // Append sources section from Perplexity search/fetch results
  const sourcesSection = buildSourcesSection(pxRes);
  const finalText = sourcesSection ? cleanText + sourcesSection : cleanText;

  // Count source URLs in the final saved text (inline [URL] links + sources section links)
  const sourceCount = (finalText.match(/\[https?:\/\//g) || []).length
                    + (finalText.match(/\(https?:\/\//g) || []).length;
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
         finalText,
         JSON.stringify({ location_name: loc.name, location_norm: normaliseLocation(loc.name), preset: PERPLEXITY_PRESET, superseded: false })]
      );
      assetId = assetRows[0].id;
      maybeAutoAllocate(clientId, loc.name); // primary city only, first time; runs in the background
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
    hasTables: hasTables || false,
    rawOutputJson: JSON.stringify(pxRes),
    citationStats: { kept, resolved, unmatched },
  });
  return { validationFailed: false, sourceCount, lowSources, hasUnresolvedMarkers: hasUnresolvedMarkers || false, hasTables: hasTables || false };
}

// ── Standalone per-location Perplexity runner (shared by research-start and research-rerun) ──

async function runOneLocation(record, clientId, loc, moduleName, keyValueMap, serviceParentMap, includeSecurityAddOn) {
  const code = loc.code.toUpperCase();
  await updateResearchLocation(record, code, { status: 'running', startedAt: new Date().toISOString() });

  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const locationName = loc.county ? `${loc.name}, ${loc.county}` : loc.name;
      const promptText = buildResearchPrompt(locationName, code, loc.runType || '', moduleName, keyValueMap, serviceParentMap, includeSecurityAddOn);
      const deadline   = Date.now() + PERPLEXITY_TIMEOUT_MS;
      const onWaiting  = (delaySec) => updateResearchLocation(record, code, {
        status: 'running', statusDetail: `waiting (rate limit) — retrying in ${delaySec}s`,
      }).catch(() => {});
      const pxJobId    = await submitPerplexity(promptText, onWaiting);
      // Persist job id before polling — recovery on restart can resume polling rather than failing the row
      await updateResearchLocation(record, code, { pxJobId, statusDetail: null });
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

// ── Trade catalogue (all trades with research modules, not just those with calibration packs) ──

// Virtual trades: map to a research module and optionally default the security add-on.
const VIRTUAL_TRADES = {
  'Dog Training & Security Dogs': { researchModule: 'Dog Training', securityDefault: true },
};

// Canonical name map: if a research module or calibration pack produces one of these names
// (e.g. a legacy filename derives 'Builder' or 'Roofer'), remap it to the canonical trade name.
// This prevents the same niche appearing twice under two names.
const TRADE_NAME_ALIASES = {
  'Builder':    'Building Company',
  'Roofer':     'Roofing Company',
  'Landscaper': 'Landscaper Gardener',
  'Drainage':   'Drainage Company',
  'Cleaning':   'Cleaning Company',
};

// Map from trade name → research module name (for trades that share a name with their module,
// the mapping is identity; for virtual trades it's explicit above).
function tradeToResearchModule(tradeName) {
  if (VIRTUAL_TRADES[tradeName]) return VIRTUAL_TRADES[tradeName].researchModule;
  if (RESEARCH_MODULES[tradeName]) return tradeName;
  return null;
}

// Full trade list: all research modules + virtual trades, sorted alphabetically.
// Each entry: { name, hasCalibrationPack, calibrationPackTrade, researchModule, securityDefault }
function canonicalTradeName(name) {
  return TRADE_NAME_ALIASES[name] || name;
}

function buildTradeCatalogue() {
  const entries = {};

  // All research module names become trades (apply alias to catch legacy names)
  for (const rawName of Object.keys(RESEARCH_MODULES)) {
    const moduleName = canonicalTradeName(rawName);
    const hasPack = !!(CALIBRATION_PACKS[moduleName] || CALIBRATION_PACKS[rawName]);
    if (!entries[moduleName]) {
      entries[moduleName] = {
        name: moduleName,
        hasCalibrationPack: hasPack,
        calibrationPackTrade: hasPack ? moduleName : null,
        researchModule: rawName, // keep original module key for lookup
        securityDefault: false,
      };
    } else {
      // Merge: mark pack presence if newly confirmed
      if (hasPack) { entries[moduleName].hasCalibrationPack = true; entries[moduleName].calibrationPackTrade = moduleName; }
    }
  }

  // Virtual trades (e.g. "Dog Training & Security Dogs")
  for (const [name, cfg] of Object.entries(VIRTUAL_TRADES)) {
    const canonName = canonicalTradeName(name);
    const hasPack = !!(CALIBRATION_PACKS[canonName] || CALIBRATION_PACKS[name]);
    entries[canonName] = {
      name: canonName,
      hasCalibrationPack: hasPack,
      calibrationPackTrade: hasPack ? canonName : null,
      researchModule: cfg.researchModule,
      securityDefault: cfg.securityDefault || false,
    };
  }

  // Calibration-pack trades that have no research module entry (keep them accessible)
  for (const rawPack of Object.keys(CALIBRATION_PACKS)) {
    const packTrade = canonicalTradeName(rawPack);
    if (!entries[packTrade]) {
      entries[packTrade] = {
        name: packTrade,
        hasCalibrationPack: true,
        calibrationPackTrade: packTrade,
        researchModule: null,
        securityDefault: false,
      };
    } else if (!entries[packTrade].hasCalibrationPack) {
      entries[packTrade].hasCalibrationPack = true;
      entries[packTrade].calibrationPackTrade = packTrade;
    }
  }

  return Object.values(entries).sort((a, b) => a.name.localeCompare(b.name));
}

const TRADE_CATALOGUE = buildTradeCatalogue();

app.get('/api/trades', (_req, res) => res.json({ trades: TRADE_CATALOGUE }));

// Return the parsed niche JSON for a given primary_category value.
// Used by the v20 homepage path to verify G-NICHE before generation.
app.get('/api/niche/:trade', (req, res) => {
  const { niche, error } = loadNiche(req.params.trade);
  if (error) return res.status(404).json({ error });
  // The Client Values screen's confirmed practices tick list comes with the niche
  res.json({ ...niche, practices: practicesFor(niche) });
});

app.post('/api/parse-zip', upload.array('files', 30), async (req, res) => {
  try {
    if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded.' });
    const trade    = (req.body.trade    || '').trim();
    const clientId = (req.body.clientId || '').trim() || null;
    const tradeEntry = TRADE_CATALOGUE.find(t => t.name === trade);
    if (!tradeEntry) {
      return res.status(400).json({ error: `Unknown trade: "${trade}". Available: ${TRADE_CATALOGUE.map(t => t.name).join(', ')}` });
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
      if (LINK_ONLY_PAGE_TYPES.has(p.pageType)) return false;
      // Location-category pages for the primary city are served by the category page — skip them
      if (p.pageType === 'location-category' && primaryArea) {
        const loc = (p.locationName || '').toLowerCase().trim() || p.pageTitle.toLowerCase().trim();
        if (loc === primaryArea || loc.endsWith(' ' + primaryArea)) return false;
      }
      return true;
    });
    const skippedPages = pages
      .filter(p => ['done', 'live'].includes(p.status.toLowerCase()) || LINK_ONLY_PAGE_TYPES.has(p.pageType))
      .map(p => ({ ...p, skipReason: LINK_ONLY_PAGE_TYPES.has(p.pageType) && !['done', 'live'].includes(p.status.toLowerCase()) ? 'Link only (no prompt for this page type)' : `Status: ${p.status}` }));

    const sessionId = crypto.randomUUID();
    const rawCustomValuesCsvs = identified.customValues.map(readText);
    sessions.set(sessionId, { createdAt: Date.now(), trade, clientId, jobs, skippedPages, keyValueMap, serviceParentMap, onboardingText, geoResearch, rawCustomValuesCsvs });

    // Persist uploaded files to client_assets so they can be reloaded next session.
    // Only replaces client_file rows — dossiers and other asset types are untouched.
    if (clientId && pool) {
      try {
        const filesToSave = [
          { fileType: 'page_map',    filename: identified.pageMap.originalname,    content: readText(identified.pageMap) },
          ...identified.customValues.map(f => ({ fileType: 'custom_values', filename: f.originalname, content: readText(f) })),
          { fileType: 'onboarding',  filename: identified.onboarding.originalname, content: readText(identified.onboarding) },
          ...(identified.geo ? [{ fileType: 'geo_research', filename: identified.geo.originalname, content: readText(identified.geo) }] : []),
        ];
        // Delete only previous client_file rows for this client, not dossiers
        await pool.query(`DELETE FROM client_assets WHERE client_id = $1 AND asset_type = 'client_file'`, [clientId]);
        for (const f of filesToSave) {
          await pool.query(
            `INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'client_file', $2, $3, $4)`,
            [clientId, f.filename, f.content, JSON.stringify({ fileType: f.fileType, trade })]
          );
        }
      } catch (dbErr) {
        console.error('[DB] client_file save error:', dbErr.message);
      }
    }

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
      bizCounty: keyValueMap['biz_county'] || '',
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
    if (!calibrationPack) {
      return res.status(400).json({ error: `No calibration pack for "${trade}" yet. Research is saved; copy generation will be available once the pack is added.` });
    }

    // Service pages need a verified trade facts pack; the other page types carry on without them
    const tradeFactsSkipped = [];
    let tradeFactsGate = null;
    if (jobs.some(j => j.pageType === 'service')) {
      tradeFactsGate = await tradeFacts.serviceGate(await nicheForGate(clientId, trade));
      if (!tradeFactsGate.ok) {
        if (jobs.every(j => j.pageType === 'service')) return res.status(409).json({ error: tradeFactsGate.message });
        for (const j of jobs) if (j.pageType === 'service') tradeFactsSkipped.push({ ...j, skipReason: tradeFactsGate.message });
      }
    }
    const genJobs = tradeFactsSkipped.length ? jobs.filter(j => j.pageType !== 'service') : jobs;
    const customValuesText = Object.entries(keyValueMap).map(([k, v]) => `${k}: ${v}`).join('\n');
    const client            = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const dossierMap = await loadDossierMap(clientId);
    console.log(`[generate-batch] Loaded ${dossierMap.size} dossiers for client ${clientId || '(none)'}`);

    const primaryCityNorm = normaliseLocation(keyValueMap['biz_area_1'] || '');
    const primaryGeo      = dossierMap.get(primaryCityNorm) || geoResearch || null;

    const requestJobs = [];
    const geoSkipped  = [];

    for (const job of genJobs) {
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
    const allSkipped  = startIndex > 0 ? [...tradeFactsSkipped, ...geoSkipped] : [...skippedPages, ...tradeFactsSkipped, ...geoSkipped];
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

    res.json({ batchId, anthropicBatchId: null, total: requestJobs.length, startIndex, geoSkipped: geoSkipped.length, tradeFacts: tradeFactsSkipped.length ? { skipped: tradeFactsSkipped.length, message: tradeFactsGate.message } : null });

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

      // client_file rows are saved at parse time; nothing extra needed here.
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
    downloads.set(downloadId, { createdAt: Date.now(), text: outputText, filename: `${safeClient}_copy_bot_output.txt`, results: results.filter(Boolean), safeClient, clientId: record.clientId || null });

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
  // v20 homepage (Stage 8): the latest record and its reader view, when the client has one
  if (dl.clientId && pool) {
    try {
      const found = await loadV20Download(dl.clientId, null);
      if (found) {
        zip.file('homepage__v20.json', reader.buildJsonDownload(found.record));
        zip.file('homepage__v20.md', reader.buildReaderView(found.record, found.values));
      }
    } catch (err) { console.error('[zip] v20 homepage not added:', err.message); }
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
  // Council areas ("New Forest District") are not towns: never researched as a location
  const skippedAdmin = [];
  for (let i = locations.length - 1; i >= 0; i--) {
    if (isAdminArea(locations[i] && locations[i].name)) skippedAdmin.unshift(locations.splice(i, 1)[0].name);
  }
  if (skippedAdmin.length) console.log(`[research-start] skipped council areas for ${clientId}: ${skippedAdmin.join(', ')}`);
  if (!locations.length) return res.status(400).json({ error: `Only council areas were selected (${skippedAdmin.join(', ')}). Research the towns in them instead.`, skippedAdmin });
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
  res.json({ jobId, total: locations.length, skippedAdmin });

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

    // Pre-mark all locations beyond the first batch as 'queued' so the UI shows Queued, not Pending
    for (let i = RESEARCH_CONCURRENCY; i < locations.length; i++) {
      const code = locations[i].code.toUpperCase();
      await updateResearchLocation(record, code, { status: 'queued' }).catch(() => {});
    }

    // Concurrency-limited parallel execution with 2s stagger between each submission start
    const SUBMIT_STAGGER_MS = 2000;
    const queue    = [...locations];
    const inFlight = new Set();
    await new Promise(resolve => {
      let staggerDebt = 0;
      function next() {
        while (inFlight.size < RESEARCH_CONCURRENCY && queue.length) {
          const loc   = queue.shift();
          const delay = staggerDebt;
          staggerDebt += SUBMIT_STAGGER_MS;
          const p = (delay > 0
            ? new Promise(r => setTimeout(r, delay)).then(() =>
                runOneLocation(record, clientId, loc, moduleName, keyValueMap, serviceParentMap, includeSecurityAddOn))
            : runOneLocation(record, clientId, loc, moduleName, keyValueMap, serviceParentMap, includeSecurityAddOn)
          ).finally(() => {
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

    // Same click: once the dossiers are saved, the client's FAQ question research
    // (only when it has none yet), so it can use them
    if (faqService) await faqService.maybeAutoResearch(clientId, sessionId);
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
    maybeAutoAllocate(clientId, best.locName); // primary city only, first time; runs in the background

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

// ── Saved client files ────────────────────────────────────────────────────────

// Returns metadata (no content) for the saved client_file rows for a client.
app.get('/api/clients/:clientId/saved-files', async (req, res) => {
  if (!pool) return res.json({ files: [] });
  try {
    const { rows } = await pool.query(
      `SELECT id, filename, metadata, uploaded_at FROM client_assets
       WHERE client_id = $1 AND asset_type = 'client_file'
       ORDER BY uploaded_at DESC`,
      [req.params.clientId]
    );
    res.json({ files: rows.map(r => ({
      id: r.id,
      filename: r.filename,
      fileType: r.metadata && r.metadata.fileType,
      trade:    r.metadata && r.metadata.trade,
      uploadedAt: r.uploaded_at,
    })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Re-parse using the saved client_file content from the DB (no upload required).
app.post('/api/clients/:clientId/parse-saved-files', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const clientId = req.params.clientId;
    const trade    = (req.body.trade || '').trim();
    const tradeEntry = TRADE_CATALOGUE.find(t => t.name === trade);
    if (!tradeEntry) return res.status(400).json({ error: `Unknown trade: "${trade}"` });

    const { rows } = await pool.query(
      `SELECT filename, content, metadata FROM client_assets
       WHERE client_id = $1 AND asset_type = 'client_file'
       ORDER BY uploaded_at DESC`,
      [clientId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No saved files found for this client.' });

    // Reconstruct file-like objects
    const files = rows.map(r => ({
      originalname: r.filename || 'file',
      buffer: Buffer.from(r.content, 'utf8'),
      _fileType: r.metadata && r.metadata.fileType,
    }));

    const { identified, missing } = identifyFiles(files);
    if (missing.length) return res.status(400).json({ error: 'Saved files incomplete', missing });

    const readText = file => file.buffer.toString('utf8');
    const pages           = parsePageMap(readText(identified.pageMap));
    const { keyValueMap, serviceParentMap } = parseCustomValues(identified.customValues.map(readText));
    const onboardingText  = identified.onboarding ? readText(identified.onboarding) : '';
    const geoResearch     = identified.geo        ? readText(identified.geo)        : '';

    const usedCodes = new Set();
    const bizAreas  = [];
    for (let i = 1; keyValueMap[`biz_area_${i}`]; i++) {
      const name = keyValueMap[`biz_area_${i}`];
      const norm = normaliseLocation(name);
      let code   = name.split(/[\s,]+/).filter(Boolean).map(w => w[0].toUpperCase()).join('').slice(0, 3).padEnd(3, 'X');
      if (usedCodes.has(code)) {
        let seq = 1;
        while (usedCodes.has(`L${String(seq).padStart(2, '0')}`)) seq++;
        code = `L${String(seq).padStart(2, '0')}`;
      }
      usedCodes.add(code);
      bizAreas.push({ name, norm, code, runType: i === 1 ? 'PRIMARY CITY' : 'TOWN' });
    }

    const missingH1s = processH1s(pages, keyValueMap);
    const primaryArea = (keyValueMap['biz_area_1'] || '').toLowerCase().trim();
    const jobs = pages.filter(p => {
      if (['done', 'live'].includes(p.status.toLowerCase())) return false;
      if (LINK_ONLY_PAGE_TYPES.has(p.pageType)) return false;
      if (p.pageType === 'location-category' && primaryArea) {
        const loc = (p.locationName || '').toLowerCase().trim() || p.pageTitle.toLowerCase().trim();
        if (loc === primaryArea || loc.endsWith(' ' + primaryArea)) return false;
      }
      return true;
    });
    const skippedPages = pages
      .filter(p => ['done', 'live'].includes(p.status.toLowerCase()) || LINK_ONLY_PAGE_TYPES.has(p.pageType))
      .map(p => ({ ...p, skipReason: LINK_ONLY_PAGE_TYPES.has(p.pageType) && !['done', 'live'].includes(p.status.toLowerCase()) ? 'Link only (no prompt for this page type)' : `Status: ${p.status}` }));

    const sessionId = crypto.randomUUID();
    const rawCustomValuesCsvs = identified.customValues.map(readText);
    sessions.set(sessionId, { createdAt: Date.now(), trade, clientId, jobs, skippedPages, keyValueMap, serviceParentMap, onboardingText, geoResearch, rawCustomValuesCsvs });

    const byType = {};
    for (const j of jobs) byType[j.pageType] = (byType[j.pageType] || 0) + 1;

    const filesIdentified = [
      { name: identified.pageMap.originalname,    type: 'Page Map' },
      ...identified.customValues.map(f => ({ name: f.originalname, type: 'Custom Values' })),
      { name: identified.onboarding.originalname, type: 'Onboarding Form' },
      ...(identified.geo ? [{ name: identified.geo.originalname, type: 'Geo Research' }] : []),
    ];

    res.json({
      sessionId, filesIdentified,
      jobs: jobs.map(j => ({ pageType: j.pageType, pageTitle: j.pageTitle, urlSlug: j.urlSlug })),
      summary: { total: jobs.length, byType, skipped: skippedPages.length },
      missingH1s, skippedPages, bizAreas,
      bizCounty: keyValueMap['biz_county'] || '',
      hasGeoFile: !!identified.geo,
      estimatedCost: (jobs.length * 0.06).toFixed(2),
    });
  } catch (err) {
    console.error('[parse-saved-files]', err);
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
        // If no active dossier exists, the location is pending regardless of what research_jobs says
        const effectiveStatus = dos ? 'done' : (loc.status === 'done' ? 'pending' : (loc.status || 'pending'));
        locations[code] = {
          code, name: loc.name || code, jobId,
          status:      effectiveStatus,
          assetId:     dos ? dos.id : null,
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
          hasTables:            loc.hasTables             ?? false,
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
  if (isAdminArea(location.name)) return res.status(400).json({ error: `${location.name} is a council area, not a town: research the towns in it instead.` });
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

// ── v20 client values ─────────────────────────────────────────────────────────

const CLIENT_VALUES_TEMPLATE = {
  company_name: '', company_name_gbp_checked: false,
  phone: '', email: '', address: '', gbp_address_type: '', hours: '',
  primary_category: '', year_founded: '', jobs_completed: '',
  rating: '', review_count: '',
  guarantee_years: '', manufacturer_warranty: '', insurance_cover: '',
  differentiator_1: '', differentiator_1_confirmed: false, differentiator_1_sentence: '',
  differentiator_2: '', differentiator_2_confirmed: false, differentiator_2_sentence: '',
  verified_logos: null,
  free_quotes: '', free_inspection: '', quote_method: '', price_list: '', response_time: '',
  quote_includes: '', deposit_terms: '', waste_carrier_registered: '', customer_questions: [],
  confirmed_practices: [], coastal_city: '',
  same_day_available: '', out_of_hours_available: '', start_time: '',
  // Category pages (25 Oct): the visit frequencies a maintenance client offers (weekly, fortnightly,
  // monthly, one off), comma separated; blank means the visits answer says the schedule is agreed and no more
  visit_frequency_options: '',
  owner_name: '', owner_name_2: '', owner_qualification: '',
  owner_why: '', owner_promise: '', owner_pronoun: '',
  owner_photo: 'no', business_type: 'A',
  materials_methods: [], guarantee_scope: '', team_size: '',
  typical_jobs: [],
  emergency_primary: '', handles_planning: '', finance_options: '',
  complaints_process: '', area_wide: '', travel_distance: '',
  review_themes: [], jobs_wanted: [], map_embed: '',
  stand_ins: [],
  h1_override: '',
  // GBP output (23 Oct): the competitors' average service count (a whole number, by hand for
  // now) and whether products may show the approved prices
  competitor_service_count: '', show_prices: '',
  // GBP batch 1 (23 Oct): the Google review link (also pushed to the site), the reviews a
  // month target and the landing page fails, for the internal note and the templates
  review_url: '', reviews_per_month: '', landing_page_fails: '',
  // Category pages (23 Oct): the three hand picked reviews the reviews block shows once
  // the client has 3 or more reviews ({ text, name, town })
  hand_reviews: [],
  // GBP batch 2 (23 Oct): the client's own Google place id, found by the first competitor check
  gbp_place_id: '',
  // GBP batch 3 (23 Oct): the rank scan settings, built by code and locked after the baseline (hard rule 8);
  // scan_area sets the grid spacing (city 1500 m, market town 2000 m, rural 2500 m); scan_keyword_2 is optional
  scan_settings: null, scan_area: '', scan_keyword_2: '',
};

app.get('/api/clients/:clientId/gbp-categories', async (req, res) => {
  if (!pool) return res.json({ categories: [] });
  try {
    const { rows } = await pool.query(
      `SELECT content FROM client_assets WHERE client_id=$1 AND asset_type='client_file' AND metadata->>'fileType'='custom_values' ORDER BY uploaded_at`,
      [req.params.clientId]
    );
    if (!rows.length) return res.json({ categories: [] });
    const { keyValueMap } = parseCustomValues(rows.map(r => r.content));
    const categories = [];
    for (let i = 1; keyValueMap[`category_${i}`]; i++) categories.push(keyValueMap[`category_${i}`]);
    res.json({ categories });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/clients/:clientId/client-values', async (req, res) => {
  if (!pool) return res.json({ found: false, values: { ...CLIENT_VALUES_TEMPLATE } });
  try {
    const { rows } = await pool.query(
      `SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`,
      [req.params.clientId]
    );
    // Values worked out from the research, shown beside the field (a set value still wins)
    let derived = {};
    try {
      const ctx = await loadV20Context(req.params.clientId, req.query.sessionId || null);
      if (ctx.coastalFromResearch) derived.coastal_city = ctx.coastalFromResearch;
    } catch (err) {
      console.error('[client-values] research values not loaded for', req.params.clientId, err);
    }
    if (!rows.length) return res.json({ found: false, values: { ...CLIENT_VALUES_TEMPLATE }, derived });
    const saved = JSON.parse(rows[0].content);
    // Merge with template so new keys added later are always present
    res.json({ found: true, values: { ...CLIENT_VALUES_TEMPLATE, ...saved }, derived });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:clientId/client-values', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const clientId = req.params.clientId;
    const values = req.body;
    if (!values || typeof values !== 'object') return res.status(400).json({ error: 'Body must be a JSON object.' });
    const content = JSON.stringify(values);
    const { rows } = await pool.query(
      `SELECT id FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`,
      [clientId]
    );
    if (rows.length) {
      await pool.query(
        `UPDATE client_assets SET content = $1, uploaded_at = NOW() WHERE id = $2`,
        [content, rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'client_values.json', $2)`,
        [clientId, content]
      );
    }
    res.json({ saved: true, values });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients/:clientId/prefill-client-values', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const clientId = req.params.clientId;
    // Load all raw-data assets
    const { rows } = await pool.query(
      `SELECT asset_type, filename, content FROM client_assets
       WHERE client_id = $1 AND asset_type IN ('client_file','custom_values','onboarding')
       ORDER BY uploaded_at ASC`,
      [clientId]
    );
    // Separate by type (same logic as identifyFiles / parse-saved-files)
    const fakeFiles = rows.map(r => ({ originalname: r.filename || r.asset_type, buffer: Buffer.from(r.content, 'utf8') }));
    const identified = identifyFiles(fakeFiles);
    const customCsvTexts = identified.customValues.map(readText);
    const onboardingText = identified.onboarding ? parseOnboardingForm(readText(identified.onboarding)) : '';
    const { keyValueMap } = parseCustomValues(customCsvTexts);

    // Build a prefilled object from parsed sources (no Claude call for pure mappings)
    const prefilled = { ...CLIENT_VALUES_TEMPLATE };
    const cv = keyValueMap;
    if (cv.company_name)         prefilled.company_name         = cv.company_name;
    if (cv.company_phone_functional) prefilled.phone             = cv.company_phone_functional;
    else if (cv.company_phone)   prefilled.phone                 = cv.company_phone;
    if (cv.company_email)        prefilled.email                 = cv.company_email;
    if (cv.company_address)      prefilled.address               = cv.company_address;
    if (cv.google_map_embed)     prefilled.map_embed             = cv.google_map_embed;
    if (cv.category_1)           prefilled.primary_category      = cv.category_1;

    // Small Claude call to extract free-text onboarding answers into structured fields
    if (onboardingText && client) {
      const extractPrompt = `You are extracting structured data from a business onboarding form.\n\nExtract the following fields from the Q&A below. Return ONLY a JSON object with these exact keys. If a field is not mentioned or the answer is unusable (vague, unclear, non-committal), return an empty string "" for that field. Never invent values.\n\nFields to extract:\n- year_founded (4-digit year only, e.g. "2015"; blank if vague like "a few years ago")\n- jobs_completed (number only, e.g. "150"; blank if a range or vague)\n- guarantee_years (number only; blank if "no guarantee" or not mentioned)\n- manufacturer_warranty (e.g. "25 years manufacturer warranty"; blank if not mentioned)\n- insurance_cover (figure without £ symbol, e.g. "5m" or "2000000"; blank if not mentioned)\n- free_quotes ("yes" or "no"; blank if not mentioned)\n- start_time (short phrase, e.g. "same week" or "within 2 weeks"; blank if vague)\n- hours (e.g. "Monday to Saturday, 8am to 6pm"; blank if not mentioned or unusable)\n- gbp_address_type ("storefront" or "service_area"; blank if unclear)\n- travel_distance (short phrase or miles, e.g. "20 miles"; blank if not mentioned)\n- team_size (number only; blank if not mentioned)\n- owner_name (first name only; blank if not mentioned)\n- same_day_available ("yes" or "no"; blank if not mentioned)\n- out_of_hours_available ("yes", "no", or "24/7"; blank if not mentioned)\n- handles_planning ("yes" or "no"; blank if not mentioned)\n- quote_includes (what the quote covers, in the client's words, e.g. "materials, labour and taking the waste away"; blank if not mentioned)\n- deposit_terms (deposit and when payments are due, e.g. "20% deposit, balance on completion"; blank if not mentioned)\n- waste_carrier_registered ("yes" or "no"; blank if not mentioned)\n- customer_questions (array of the questions the client says customers ask before they book, each as a question in the customer's words; [] if the form doesn't say)\n- jobs_wanted (array of up to 3 job types the business wants more of; [] if not mentioned)\n- differentiator_1 (the most prominent thing that makes them stand out, in title-case short-phrase form, e.g. "Fixed Prices With No Hidden Costs"; blank if nothing specific)\n- differentiator_2 (second most prominent differentiator, same format; blank if not present)\n- confirmed_practices (array of keys from this list, only where an answer clearly says yes; [] if none or unclear): ${PRACTICES.map(p => `${p.key} = "${p.question}"`).join('; ')}\n\nReturn ONLY a raw JSON object, no markdown, no explanation.\n\n--- ONBOARDING Q&A ---\n${onboardingText}\n\n--- CUSTOM VALUES ---\n${Object.entries(cv).map(([k,v]) => `${k}: ${v}`).join('\n')}`;

      try {
        const extractResult = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content: extractPrompt }],
        });
        const raw = extractResult.content[0].text.trim();
        const jsonStr = raw.startsWith('{') ? raw : raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        const extracted = JSON.parse(jsonStr);
        const strFields = ['year_founded','jobs_completed','guarantee_years','manufacturer_warranty',
          'insurance_cover','free_quotes','start_time','hours','gbp_address_type','travel_distance',
          'team_size','owner_name','same_day_available','out_of_hours_available','handles_planning',
          'differentiator_1','differentiator_2','quote_includes','deposit_terms','waste_carrier_registered'];
        for (const k of strFields) {
          if (extracted[k] !== undefined && extracted[k] !== '') prefilled[k] = String(extracted[k]);
        }
        if (Array.isArray(extracted.jobs_wanted) && extracted.jobs_wanted.length) prefilled.jobs_wanted = extracted.jobs_wanted;
        if (Array.isArray(extracted.customer_questions)) prefilled.customer_questions = extracted.customer_questions.map(q => String(q).trim()).filter(Boolean).slice(0, 20);
        // Suggested from the onboarding answers; a person confirms the ticks on the Client Values screen
        if (Array.isArray(extracted.confirmed_practices)) {
          const known = new Set(PRACTICES.map(p => p.key));
          prefilled.confirmed_practices = extracted.confirmed_practices.filter(k => known.has(k));
        }
      } catch (e) {
        console.error('prefill Claude extract error:', e.message);
      }
    }

    res.json({ prefilled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients/:clientId/v20-settings', async (req, res) => {
  if (!pool) return res.json({ use_v20_homepage: false, v20_test_mode: false });
  try {
    const { rows } = await pool.query(
      `SELECT use_v20_homepage, v20_test_mode FROM clients WHERE id = $1`,
      [req.params.clientId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Client not found.' });
    res.json({ use_v20_homepage: rows[0].use_v20_homepage, v20_test_mode: rows[0].v20_test_mode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:clientId/v20-settings', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const { use_v20_homepage, v20_test_mode } = req.body;
    const updates = [];
    const params = [];
    if (use_v20_homepage !== undefined) { updates.push(`use_v20_homepage = $${params.length + 1}`); params.push(!!use_v20_homepage); }
    if (v20_test_mode   !== undefined) { updates.push(`v20_test_mode = $${params.length + 1}`);   params.push(!!v20_test_mode); }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update.' });
    params.push(req.params.clientId);
    const { rowCount } = await pool.query(
      `UPDATE clients SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );
    if (!rowCount) return res.status(404).json({ error: 'Client not found.' });
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── v20 client context (shared by decisions preview and allocation) ──────────
// Client values, test mode, trade, and the page map / custom values: from the
// active session when there is one, else from the stored client_file rows.
// The v3 page map path (Brandon, 21 Oct 2026): when the client has a v3 page map that
// applies (a homepage and at least one category row), the homepage's pages, categories,
// services and areas come from it and the hand set-up (v20-context-v3.js), session or not.
// Without one, the uploaded page map and custom values CSVs are read as before.
const { contextFromPageMap } = require('./v20-context-v3');
const pageMapStore = (pool && filloutService) ? require('./page-map/store').createPageMapStore({ pool, filloutService }) : null;
async function loadV3Context(clientId, cv, niche) {
  if (!pageMapStore) return null;
  const rows = await pageMapStore.saved(clientId);
  const live = rows.filter(r => r.applies !== false);
  if (!live.some(r => r.type === 'homepage') || !live.some(r => r.type === 'category')) return null;
  const st = await pageMapStore.state(clientId);
  const { inputsFor } = require('./page-map/store');
  const hand = await inputsFor(filloutService, clientId, { categoryTabRule: (st && st.category_tab_rule) || 'ticked_only' });
  return contextFromPageMap({ rows: live, hand: { baseTown: hand.baseTown, otherTowns: hand.otherTowns }, cv, niche: niche || {} });
}
// The niche for a loaded context: on the v3 path it carries no service_words (the page
// titles are the names), so every consumer must take it from here, not loadNiche(trade)
function nicheFor(ctx) { return ctx.nicheError ? { niche: null, error: ctx.nicheError } : { niche: ctx.niche, error: null }; }

async function loadV20Context(clientId, sessionId) {
  let cv = { ...CLIENT_VALUES_TEMPLATE };
  let cvLoadError = null;
  let v20TestMode = false;
  let clientTrade = '';
  if (pool) {
    try {
      const { rows } = await pool.query(
        `SELECT content FROM client_assets WHERE client_id=$1 AND asset_type='client_values' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]
      );
      if (rows.length) cv = { ...CLIENT_VALUES_TEMPLATE, ...JSON.parse(rows[0].content) };
    } catch (err) {
      cvLoadError = err.message;
      console.error('[v20] Failed to load client values for', clientId, err);
    }
    try {
      const { rows } = await pool.query(`SELECT v20_test_mode, trade FROM clients WHERE id=$1`, [clientId]);
      if (rows.length) { v20TestMode = !!rows[0].v20_test_mode; clientTrade = rows[0].trade || ''; }
    } catch (err) {
      console.error('[v20] Failed to load v20 settings for', clientId, err);
    }
  }

  const session = sessionId ? sessions.get(sessionId) : null;
  // The niche comes from the trade. Without a session: the primary category when it
  // names a niche, else the client's trade (Step 1). The primary category is the
  // client's real GBP category ("Gardener", "Landscape Gardener"), which often isn't one.
  const primaryIsNiche = !!NICHE_FILE_MAP[(cv.primary_category || '').toLowerCase().trim()];
  const trade = session ? session.trade : (primaryIsNiche ? cv.primary_category : (clientTrade || cv.primary_category));

  let pages = [];
  let keyValueMap = {};
  let serviceParentMap = {};
  let onboardingText = '';
  if (session) {
    pages = [...(session.jobs || []), ...(session.skippedPages || [])];
    keyValueMap = session.keyValueMap || {};
    serviceParentMap = session.serviceParentMap || {};
    // The saved-files route keeps the raw CSV in the session: parse it here
    onboardingText = onboardingQA(session.onboardingText);
  } else if (pool) {
    try {
      const { rows: fileRows } = await pool.query(
        `SELECT filename, content, metadata FROM client_assets WHERE client_id=$1 AND asset_type='client_file' ORDER BY uploaded_at`,
        [clientId]
      );
      const pageMapRow = fileRows.find(r => (r.metadata?.fileType === 'page_map'));
      const cvRows     = fileRows.filter(r => r.metadata?.fileType === 'custom_values');
      // The newest onboarding file: by its file type, else by its name (as Step 1 finds it)
      const onboardRows = fileRows.filter(r => r.metadata?.fileType === 'onboarding');
      const byName = fileRows.filter(r => !r.metadata?.fileType && /onboard|form/i.test(r.filename || ''));
      const onboardRow = [...byName, ...onboardRows].pop();
      if (onboardRow) onboardingText = onboardingQA(onboardRow.content);
      if (pageMapRow) {
        pages = parsePageMap(pageMapRow.content);
        if (cvRows.length) {
          const parsed = parseCustomValues(cvRows.map(r => r.content));
          keyValueMap = parsed.keyValueMap || {};
          serviceParentMap = parsed.serviceParentMap || {};
        }
      }
    } catch (err) {
      console.error('[v20] Failed to load pages/keyValueMap for', clientId, err);
    }
  }
  // Older clients may have their onboarding form stored as asset_type 'onboarding'
  if (!onboardingText && pool) {
    try {
      const { rows } = await pool.query(`SELECT content FROM client_assets WHERE client_id=$1 AND asset_type='onboarding' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
      if (rows.length) onboardingText = onboardingQA(rows[0].content);
    } catch (err) {
      console.error('[v20] Failed to load the onboarding form for', clientId, err);
    }
  }
  // The v3 page map wins over the CSVs (session or not) when the client has one that applies
  const loaded = loadNiche(trade);
  let niche = loaded.niche, nicheError = loaded.error;
  let cardServices = null, contextSource = 'csv';
  if (pool) {
    try {
      const v3 = await loadV3Context(clientId, cv, niche);
      if (v3) {
        ({ pages, keyValueMap, serviceParentMap, cardServices } = v3);
        contextSource = 'page_map_v3';
        if (niche) niche = { ...niche, service_words: [] };
      }
    } catch (err) {
      console.error('[v20] Failed to load the v3 page map for', clientId, err.message);
    }
  }
  // Coastal: a value set on Client Values wins; left blank, the primary city's dossier
  // answers it ("Coastal: Yes/No", Geo Research CORE v7 on)
  const coastalFromResearch = await researchCoastal(clientId, keyValueMap);
  if (!cv.coastal_city && coastalFromResearch) cv = { ...cv, coastal_city: coastalFromResearch.value };
  return { cv, cvLoadError, v20TestMode, trade, clientTrade, niche, nicheError, pages, keyValueMap, serviceParentMap, cardServices, contextSource, onboardingText, coastalFromResearch };
}

// ── Allocation storage (Stage 5) ─────────────────────────────────────────────
// One client_assets row (asset_type 'allocation') per client:
// { version, dossier_asset_id, dossier_location, updated_at, pages: { homepage: {...} } }

// What the primary city's dossier says about the coast: { value: 'yes'|'no', location, source }
// or null (no dossier, or one from before Geo Research CORE v7). Never throws.
async function researchCoastal(clientId, keyValueMap) {
  try {
    const dossier = await loadPrimaryDossier(clientId, keyValueMap);
    if (!dossier) return null;
    const { coastal, coastalSource } = parseDossier(dossier.text);
    return coastal ? { value: coastal, location: dossier.locationName, source: coastalSource } : null;
  } catch (err) {
    console.error('[v20] Failed to read the coastal line for', clientId, err);
    return null;
  }
}

async function loadPrimaryDossier(clientId, keyValueMap) {
  const primary = normaliseLocation(keyValueMap['biz_area_1'] || '');
  if (!pool || !primary) return null;
  const { rows } = await pool.query(
    `SELECT id, content, metadata FROM client_assets
     WHERE client_id = $1 AND asset_type = 'geo_dossier'
     AND (metadata IS NULL OR NOT (metadata->>'superseded')::boolean)
     ORDER BY uploaded_at DESC`,
    [clientId]
  );
  const row = rows.find(r => normaliseLocation((r.metadata && r.metadata.location_name) || '') === primary);
  return row ? { id: row.id, text: row.content, locationName: row.metadata.location_name } : null;
}

async function loadAllocationRecord(clientId) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `SELECT id, content FROM client_assets WHERE client_id=$1 AND asset_type='allocation' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]
  );
  return rows.length ? { id: rows[0].id, record: JSON.parse(rows[0].content) } : null;
}

async function saveAllocationRecord(clientId, record) {
  const content = JSON.stringify(record);
  const existing = await loadAllocationRecord(clientId);
  if (existing) {
    await pool.query(`UPDATE client_assets SET content = $1, uploaded_at = NOW() WHERE id = $2`, [content, existing.id]);
  } else {
    await pool.query(
      `INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'allocation', 'allocation.json', $2)`,
      [clientId, content]
    );
  }
}

const allocationRunning = new Set();

async function runAllocationForClient(clientId, sessionId) {
  if (allocationRunning.has(clientId)) throw new Error('An allocation run is already in progress for this client.');
  allocationRunning.add(clientId);
  try {
    const ctx = await loadV20Context(clientId, sessionId);
    const { niche, error: nicheErr } = nicheFor(ctx);
    if (nicheErr) throw new Error(nicheErr);
    const dossier = await loadPrimaryDossier(clientId, ctx.keyValueMap);
    if (!dossier) throw new Error(`No saved dossier for the primary city (${ctx.keyValueMap['biz_area_1'] || 'biz_area_1 blank'}). Run geo research first.`);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const callModel = async (system, message) => {
      const r = await client.messages.create({
        model: allocation.ALLOCATION_MODEL, max_tokens: 2048, system,
        messages: [{ role: 'user', content: message }],
      });
      return r.content.map(c => c.text || '').join('');
    };
    const homepage = await allocation.runAllocation({
      dossierText: dossier.text, cv: ctx.cv, niche, keyValueMap: ctx.keyValueMap, pages: ctx.pages, callModel,
    });
    const existing = await loadAllocationRecord(clientId);
    const record = {
      ...(existing ? existing.record : {}),
      version: 1,
      dossier_asset_id: dossier.id,
      dossier_location: dossier.locationName,
      updated_at: new Date().toISOString(),
      model: allocation.ALLOCATION_MODEL,
      pages: { ...((existing && existing.record.pages) || {}), homepage },
    };
    await saveAllocationRecord(clientId, record);
    console.log(`[allocation] ${clientId}: ${homepage.neighbourhoods.join(', ') || 'no neighbourhoods'}; symptoms ${JSON.stringify(homepage.symptoms)}; ${homepage.attempts.length} attempt(s)`);
    return record;
  } finally {
    allocationRunning.delete(clientId);
  }
}

// After a dossier is saved: run the pass once if it is the primary city and the
// client has no allocation yet. Never throws.
async function maybeAutoAllocate(clientId, locationName) {
  try {
    if (!pool || !clientId) return;
    const ctx = await loadV20Context(clientId, null);
    if (normaliseLocation(locationName) !== normaliseLocation(ctx.keyValueMap['biz_area_1'] || '')) return;
    const existing = await loadAllocationRecord(clientId);
    if (existing && existing.record.pages && existing.record.pages.homepage) return;
    await runAllocationForClient(clientId, null);
  } catch (err) {
    console.error('[allocation] auto-run failed for', clientId, err.message);
  }
}

// Saved homepage allocation → resolved ALLOCATED ITEMS for computeDecisions, with
// Page Map Assigned columns applied. Returns { allocationData, flags, view }.
async function resolveHomepageAllocation(clientId, ctx, niche) {
  const flags = [];
  const dossier = await loadPrimaryDossier(clientId, ctx.keyValueMap);
  if (!dossier) {
    flags.push({ code: 'F-ALLOC', msg: `No saved dossier for the primary city (${ctx.keyValueMap['biz_area_1'] || 'biz_area_1 blank'}).` });
    return { allocationData: null, flags, view: null };
  }
  const parsed = parseDossier(dossier.text);
  const saved = await loadAllocationRecord(clientId);
  const hp = saved && saved.record.pages && saved.record.pages.homepage;
  const stale = !!(saved && saved.record.dossier_asset_id !== dossier.id);
  if (stale) flags.push({ code: 'F-ALLOC', msg: 'The allocation was made from an older dossier for the primary city. Re-run the allocation pass.' });

  const homepageRow = ctx.pages.find(p => p.pageType === 'homepage');
  const hasAssigned = !!(homepageRow && ((homepageRow.assignedNeighbourhoods || []).length || Object.keys(homepageRow.assignedSymptoms || {}).length));
  let picks = hp || null;
  if (hasAssigned) {
    const applied = allocation.applyAssigned(hp, homepageRow, parsed);
    picks = applied.allocation;
    flags.push(...applied.flags);
  }
  const categories = allocation.clientCategories(ctx.cv, ctx.keyValueMap, ctx.pages);
  const eligible = allocation.eligibleItems(parsed, { emergencyNiche: !!niche.emergency_niche, categories });
  const view = {
    dossierLocation: dossier.locationName,
    stale,
    updatedAt: saved ? saved.record.updated_at : null,
    saved: hp || null,
    effective: picks,
    fromPageMap: hasAssigned,
    parseWarnings: parsed.warnings,
    excluded: eligible.excluded,
    neighbourhoods: parsed.neighbourhoods.map(n => ({
      id: n.id, name: n.name, type: n.type, eligible: eligible.neighbourhoods.some(e => e.id === n.id),
    })),
    slots: allocation.symptomSlots(niche).map(s => ({
      ...s,
      options: eligible.symptoms.map(e => ({ id: e.id, text: e.text, issueId: e.issueId })),
    })),
  };
  return { allocationData: picks ? allocation.resolveAllocatedItems(picks, parsed) : null, flags, view };
}

app.post('/api/clients/:clientId/decisions-preview', async (req, res) => {
  const { sessionId } = req.body;
  const { clientId } = req.params;
  const ctx = await loadV20Context(clientId, sessionId);
  const { niche, error: nicheErr } = nicheFor(ctx);
  if (nicheErr) return res.status(400).json({ error: nicheErr });

  let allocationData = null;
  let allocFlags = [];
  if (pool) {
    try {
      ({ allocationData, flags: allocFlags } = await resolveHomepageAllocation(clientId, ctx, niche));
    } catch (err) {
      console.error('[decisions-preview] Failed to load allocation for', clientId, err);
      allocFlags = [{ code: 'F-ALLOC', msg: `Couldn't load the allocation: ${err.message}` }];
    }
  }

  const { faqResearch, flags: faqFlags } = await resolveHomepageFaq(clientId, ctx, niche);

  const result = computeDecisions({
    cv: ctx.cv, niche, pages: ctx.pages, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap,
    v20TestMode: ctx.v20TestMode, allocationData, faqResearch, cardServices: ctx.cardServices || null,
  });
  result.flags = [...(result.flags || []), ...allocFlags, ...faqFlags];
  if (ctx.cvLoadError) result.cvLoadError = ctx.cvLoadError;
  res.json(result);
});

// ── FAQ research and sorting (F1 to F3) ──────────────────────────────────────
// faq-service.js does the work; these are thin routes. The research is one
// research_jobs record with one row (code FAQ), so it shares the Perplexity
// submit, poll and restart recovery with the area research.
const faqSort = require('./faq-sort');
const { createFaqService } = require('./faq-service');
const faqService = pool ? createFaqService({
  pool,
  loadContext: loadV20Context,
  loadNiche: (trade, ctx) => (ctx ? nicheFor(ctx) : loadNiche(trade)),
  perplexity: {
    submit: submitPerplexity, poll: pollPerplexity, text: extractPerplexityText, resolveCitations,
    timeoutMs: PERPLEXITY_TIMEOUT_MS, preset: PERPLEXITY_PRESET,
  },
  jobs: {
    create: async record => { researchJobs.set(record.id, record); await persistResearchRecord(record); },
    update: updateResearchLocation,
    load: loadResearchRecord,
  },
  callSortModel: async (system, message) => {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const r = await client.messages.create({ model: faqSort.FAQ_SORT_MODEL, max_tokens: 8000, system, messages: [{ role: 'user', content: message }] });
    return r.content.map(c => c.text || '').join('');
  },
  // The questions on the latest saved version of each v20 page keep their page
  latestPageQuestions: async clientId => {
    const found = v20Store ? await v20Store.latest(clientId, HOMEPAGE) : null;
    return found ? { 'homepage:homepage': (found.record.faq_items || []).map(f => f.faq_question) } : {};
  },
  homepageDecisions: (ctx, niche, faqResearch) => computeDecisions({
    cv: ctx.cv, niche, pages: ctx.pages, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap,
    v20TestMode: ctx.v20TestMode, allocationData: null, faqResearch, cardServices: ctx.cardServices || null,
  }),
}) : null;

// The approved research questions the homepage may use. Never throws: on a
// failure the homepage falls back to the niche questions and the flag says why.
async function resolveHomepageFaq(clientId, ctx, niche) {
  if (!faqService) return { faqResearch: [], flags: [] };
  try {
    return await faqService.homepageFaq(clientId, ctx, niche);
  } catch (err) {
    console.error('[faq] Failed to load the FAQ questions for', clientId, err);
    return { faqResearch: [], flags: [{ code: 'F-FAQ', msg: `Couldn't load the FAQ questions: ${err.message}. The homepage uses the niche questions.` }] };
  }
}

app.get('/api/clients/:clientId/faq', async (req, res) => {
  if (!faqService) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const out = await faqService.view(req.params.clientId, req.query.sessionId || null);
    if (out.error) return res.status(400).json(out);
    res.json(out);
  } catch (err) {
    console.error('[faq] view failed for', req.params.clientId, err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients/:clientId/faq/research', async (req, res) => {
  if (!faqService) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const sessionId = (req.body && req.body.sessionId) || null;
    await faqService.startResearch(req.params.clientId, sessionId);
    res.json(await faqService.view(req.params.clientId, sessionId));
  } catch (err) {
    console.error('[faq] research start failed for', req.params.clientId, err);
    res.status(400).json({ error: err.message });
  }
});

// The latest FAQ research reply as Perplexity sent it, as plain text (read or not)
app.get('/api/clients/:clientId/faq/raw', async (req, res) => {
  if (!faqService) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const { job, row, text } = await faqService.rawReply(req.params.clientId);
    if (!job) return res.status(404).type('text/plain').send('No FAQ research has run for this client.');
    if (!text) return res.status(404).type('text/plain').send(`No reply was saved for the last FAQ research (status: ${row.status || 'unknown'}${row.error ? `, error: ${row.error}` : ''}).`);
    res.type('text/plain; charset=utf-8').send(text);
  } catch (err) {
    console.error('[faq] raw reply failed for', req.params.clientId, err);
    res.status(500).json({ error: err.message });
  }
});

// Read the saved reply again (after a parser fix) without a new Perplexity run
app.post('/api/clients/:clientId/faq/reread', async (req, res) => {
  if (!faqService) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const sessionId = (req.body && req.body.sessionId) || null;
    const result = await faqService.rereadResearch(req.params.clientId);
    res.json({ ...(await faqService.view(req.params.clientId, sessionId)), reread: result });
  } catch (err) {
    console.error('[faq] reread failed for', req.params.clientId, err);
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/clients/:clientId/faq/sort', async (req, res) => {
  if (!faqService) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const sessionId = (req.body && req.body.sessionId) || null;
    await faqService.runSort(req.params.clientId, sessionId);
    res.json(await faqService.view(req.params.clientId, sessionId));
  } catch (err) {
    console.error('[faq] sorting failed for', req.params.clientId, err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:clientId/faq/questions', async (req, res) => {
  if (!faqService) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const { updates, sessionId } = req.body || {};
    res.json(await faqService.updateQuestions(req.params.clientId, updates, sessionId || null));
  } catch (err) {
    if (err.status !== 400) console.error('[faq] question update failed for', req.params.clientId, err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Allocation routes ────────────────────────────────────────────────────────
async function allocationView(clientId, sessionId) {
  const ctx = await loadV20Context(clientId, sessionId);
  const { niche, error } = nicheFor(ctx);
  if (error) return { error };
  const { view, flags } = await resolveHomepageAllocation(clientId, ctx, niche);
  return { view, flags, running: allocationRunning.has(clientId) };
}

app.get('/api/clients/:clientId/allocation', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const out = await allocationView(req.params.clientId, req.query.sessionId);
    if (out.error) return res.status(400).json({ error: out.error });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients/:clientId/allocation/run', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  const sessionId = req.body && req.body.sessionId;
  try {
    await runAllocationForClient(req.params.clientId, sessionId);
    res.json(await allocationView(req.params.clientId, sessionId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Manual swap from the Geo Research step: { neighbourhoods: [id, id], symptoms: { slot: id } }
app.put('/api/clients/:clientId/allocation', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  try {
    const { clientId } = req.params;
    const { neighbourhoods = [], symptoms = {}, sessionId } = req.body || {};
    const ctx = await loadV20Context(clientId, sessionId);
    const { niche, error } = nicheFor(ctx);
    if (error) return res.status(400).json({ error });
    const dossier = await loadPrimaryDossier(clientId, ctx.keyValueMap);
    if (!dossier) return res.status(400).json({ error: 'No saved dossier for the primary city.' });
    const parsed = parseDossier(dossier.text);
    const categories = allocation.clientCategories(ctx.cv, ctx.keyValueMap, ctx.pages);
    const eligible = allocation.eligibleItems(parsed, { emergencyNiche: !!niche.emergency_niche, categories });
    const slots = allocation.symptomSlots(niche);
    const { picks, errors } = allocation.checkPicks(
      { homepage: { neighbourhoods, symptoms, conservation_areas: [] } }, { eligible, slots }
    );
    const hardErrors = errors.filter(e => !/^pick exactly 2/.test(e));
    if (hardErrors.length) return res.status(400).json({ error: hardErrors.join('; ') });

    const existing = await loadAllocationRecord(clientId);
    const prev = existing && existing.record.pages && existing.record.pages.homepage;
    const homepage = {
      ...(prev || {}),
      neighbourhoods: picks.neighbourhoods,
      symptoms: picks.symptoms,
      conservation_areas: [...new Set([
        ...((prev && prev.conservation_areas) || []).filter(id => picks.neighbourhoods.includes(id)),
        ...allocation.conservationFromRules(parsed, picks.neighbourhoods),
      ])],
      source: 'manual',
      flags: [],
    };
    if (picks.neighbourhoods.length < 2) homepage.flags.push({ code: 'F-ALLOC', msg: `Only ${picks.neighbourhoods.length} neighbourhood(s) picked.` });
    const missing = slots.filter(s => !picks.symptoms[s.slot]).map(s => s.slot);
    if (missing.length) homepage.flags.push({ code: 'F-ALLOC', msg: `No symptom for ${missing.join(', ')}.` });

    await saveAllocationRecord(clientId, {
      ...((existing && existing.record) || {}),
      version: 1,
      dossier_asset_id: dossier.id,
      dossier_location: dossier.locationName,
      updated_at: new Date().toISOString(),
      pages: { ...((existing && existing.record.pages) || {}), homepage },
    });
    res.json(await allocationView(clientId, sessionId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── v20 homepage generation (Stage 6) ────────────────────────────────────────
// Calibration pack for a v20 run: the Step 1 trade, else the client's trade,
// else the pack that matches the niche.
const NICHE_PACK_TRADE = { landscaper: 'Landscaper Gardener', roofer: 'Roofing Company' };
function v20CalibrationPack(ctx, niche) {
  for (const t of [ctx.trade, ctx.clientTrade, NICHE_PACK_TRADE[(niche.trade_person || '').toLowerCase()]]) {
    if (t && CALIBRATION_PACKS[t]) return { name: t, text: CALIBRATION_PACKS[t] };
  }
  return { name: null, text: '' };
}

// The client's context, niche and code decisions for the homepage, as they stand now
async function v20HomepageInputs(clientId, sessionId) {
  const ctx = await loadV20Context(clientId, sessionId);
  const { niche, error: nicheErr } = nicheFor(ctx);
  if (nicheErr) { const e = new Error(nicheErr); e.status = 400; throw e; }
  const { allocationData, flags: allocFlags, view } = await resolveHomepageAllocation(clientId, ctx, niche);
  const { faqResearch } = await resolveHomepageFaq(clientId, ctx, niche);
  const decisionsResult = computeDecisions({
    cv: ctx.cv, niche, pages: ctx.pages, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap,
    v20TestMode: ctx.v20TestMode, allocationData, faqResearch, cardServices: ctx.cardServices || null,
  });
  return { ctx, niche, allocFlags, view, decisionsResult };
}

app.post('/api/clients/:clientId/v20/homepage/generate', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  const { clientId } = req.params;
  const sessionId = req.body && req.body.sessionId;
  try {
    let inputs;
    try { inputs = await v20HomepageInputs(clientId, sessionId); }
    catch (e) { if (e.status === 400) return res.status(400).json({ error: e.message }); throw e; }
    const { ctx, niche, allocFlags, view, decisionsResult } = inputs;
    const pack = v20CalibrationPack(ctx, niche);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // One call helper for every model the generation uses (the writer, the claims and
    // quality reviewers): anthropic-call.js handles the 5.5 models' effort and fallback
    const callModel = makeCallModel(client, v20.V20_MODEL);
    const record = await v20.generateV20Homepage({
      cv: ctx.cv, niche, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, decisionsResult,
      calibrationPack: pack.text, calibrationPackName: pack.name, callModel,
      extraFlags: allocFlags.map(f => ({ ...f, source: 'allocation' })),
      allocationSource: view && view.effective ? view.effective.source || 'model' : null,
      // The rubric review round (quality-review.js) is off live until it is tested on Railway:
      // it takes generation from about 3 to 6 or 7 minutes (16 Oct, copy quality loop paused)
      qualityReview: false,
    });
    if (record.meta && record.meta.usage && record.meta.usage.stop_reason === 'max_tokens') {
      record.FLAGS.push({ code: 'P-TRUNCATED', msg: 'The model hit the output limit; the last fields may be cut off.', source: 'parse' });
    }
    await v20Store.insert(clientId, record, HOMEPAGE);
    console.log(`[v20] homepage for ${clientId}: ${record.blocked ? 'blocked by gates' : 'generated'}; ${record.FLAGS.length} flag(s)`);
    res.json(record);
  } catch (err) {
    console.error('[v20] homepage generation failed for', clientId, err);
    res.status(500).json({ error: err.message });
  }
});

// ── v20 page records (C1: by page type and key) ─────────────────────────────
// Each version of each v20 page is stored with its page type and key (v20-store.js).
// The homepage's key is fixed; category pages will use their slug.
const { createV20Store } = require('./v20-store');
const { getPageType, pageTypeOf, pageTypeId } = require('./page-types');
const v20Store = pool ? createV20Store(pool) : null;
const HOMEPAGE = { type: 'homepage', key: 'homepage' };

// The page a request is about: /v20/homepage, or /v20/pages/:type/:key
function v20PageOf(req) {
  if (!req.params.type) return HOMEPAGE;
  const t = getPageType(req.params.type);
  const key = String(req.params.key || t.singleKey || '');
  if (t.singleKey && key !== t.singleKey) throw new Error(`A client has one ${t.label.toLowerCase()}; its key is "${t.singleKey}", not "${key}".`);
  if (!key) throw new Error(`Which ${t.label.toLowerCase()} page? The key is missing.`);
  return { type: t.id, key };
}

// ── v20 downloads (Stage 8) ──────────────────────────────────────────────────
// A saved version (one by id, or a page's latest) and the token values it was written with.
async function loadV20Download(clientId, recordId, page = HOMEPAGE) {
  const found = recordId ? await v20Store.byId(clientId, recordId) : await v20Store.latest(clientId, page);
  if (!found) return null;
  const { record } = found;
  let values = record.meta && record.meta.client_values;
  if (!values) {
    // Records from before 14 Oct don't carry their values: use the client's current ones
    const ctx = await loadV20Context(clientId, null);
    values = v20.clientValueMap(ctx.cv, null);
  }
  return { record, values, id: found.id, page: { type: found.type, key: found.key } };
}

// ── WordPress push routes (slice 4) ──────────────────────────────────────────
const { createWpService } = require('./wp/service');
const wpService = pool ? createWpService({
  pool,
  loadRecord: async (clientId, recordId) => {
    const found = await loadV20Download(clientId, recordId || null);
    if (!found) throw new Error('No v20 homepage has been generated for this client yet.');
    return found;
  },
  saveRecordClaims: (clientId, recordId, CLAIMS) => v20Store.saveClaims(clientId, recordId, CLAIMS),
  currentFacts: (clientId, { sessionId, record } = {}) => v20CurrentFacts(clientId, sessionId, record),
}) : null;

// The client's facts as they are now, for checking a saved page with today's
// rules. Each page type has its own.
const V20_FACTS = {
  category: async (clientId, sessionId, record) => {
    if (!categoryRunner) throw new Error('category pages are not available (no page map store)');
    const key = record && record.meta && record.meta.page_key;
    if (!key) throw new Error('this category record has no page key');
    const I = await categoryInputsFor(clientId);
    const page = categoryRunner.pagesInOrder(I.rows).find(p => p.slug === key);
    if (!page) throw new Error(`the page map no longer has ${key}`);
    const written = await categoryRunner.writtenFor(clientId, I.rows, key);
    const { decisionsResult } = await categoryRunner.prepare(clientId, I, page, written);
    const D = decisionsResult.decisions;
    if (!D) throw new Error("the page decisions can't be made right now (a gate is failing)");
    const { categoryValidationContext } = require('./validate-category');
    return {
      V: categoryValidationContext(v20.validationContextFor({ cv: I.ctx.cv, niche: I.niche, decisions: D, keyValueMap: I.ctx.keyValueMap, serviceParentMap: I.ctx.serviceParentMap, calibrationPack: I.calibrationPack.text }), D),
      clientValues: v20.clientValueMap(I.ctx.cv, D.d1_years_trading),
      decisionsBlock: decisionsResult.decisionsBlock || null,
      servicesOnFile: v20.servicesOnFile(I.ctx.keyValueMap, I.ctx.serviceParentMap, I.niche, D),
    };
  },
  homepage: async (clientId, sessionId) => {
    const { ctx, niche, decisionsResult } = await v20HomepageInputs(clientId, sessionId);
    const D = decisionsResult.decisions;
    if (!D) throw new Error("the page decisions can't be made right now (a gate is failing)");
    return {
      V: v20.validationContextFor({ cv: ctx.cv, niche, decisions: D, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, calibrationPack: v20CalibrationPack(ctx, niche).text }),
      clientValues: v20.clientValueMap(ctx.cv, D.d1_years_trading),
      decisionsBlock: decisionsResult.decisionsBlock || null,
      // Today's service list for a claims review run again on a saved page (22 Oct)
      servicesOnFile: v20.servicesOnFile(ctx.keyValueMap, ctx.serviceParentMap, niche, D),
    };
  },
};
async function v20CurrentFacts(clientId, sessionId, record = null) {
  const id = pageTypeId(record);
  if (!V20_FACTS[id]) throw new Error(`today's facts for ${getPageType(id).label.toLowerCase()} pages aren't built yet`);
  return V20_FACTS[id](clientId, sessionId, record);
}

function wpRoute(handler) {
  return async (req, res) => {
    if (!wpService) return res.status(503).json({ error: 'Database not configured.' });
    try { res.json(await handler(req)); }
    catch (err) { res.status(400).json({ error: err.message }); }
  };
}
const v20CallModel = async ({ system, message, maxTokens }) => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r = await callClaude(client, { system, userContent: message }, maxTokens);
  return { text: r.content.map(c => c.text || '').join(''), usage: r.usage };
};

// Fillout intake: inbox, client record, audio, archive (fillout/routes.js)
if (filloutService) filloutRoutes.mountApi(app, filloutService);
// Page map and the hand set-up editor (page-map/routes.js)
if (filloutService) require('./page-map/routes').mountPageMapApi(app, { pool, filloutService });

// GBP output (gbp/routes.js, 23 Oct): the Google Business Profile description, services and
// products, from the client values, the v3 page map and the generated service page copy
async function gbpInputsFor(clientId) {
  const ctx = await loadV20Context(clientId, null);
  if (ctx.contextSource !== 'page_map_v3') throw Object.assign(new Error('GBP output needs a v3 page map: fill in the set-up on the client record and generate the page map first.'), { status: 400 });
  const rows = await pageMapStore.saved(clientId);
  const { rows: wp } = await pool.query(`SELECT url FROM wp_connections WHERE client_id=$1`, [clientId]);
  const { rows: serviceCopy } = await pool.query(`SELECT page_title, url_slug, copy_output FROM pages WHERE client_id=$1 AND page_type='service' AND copy_output IS NOT NULL`, [clientId]);
  // The niche's trade facts pack names (bodies, accreditations, schemes, brands) join the
  // proper nouns for the GBP lower casing, but only once the pack is verified (Brandon, 23 Oct)
  const P = require('./trade-facts/pack');
  const packName = P.packNameFor(await nicheForGate(clientId, ctx.trade));
  const st = packName ? await tradeFacts.status(packName) : { exists: false, verified: false };
  const tf = { niche: packName, exists: !!st.exists, verified: !!st.verified, properNouns: st.verified ? P.packProperNouns(packName) : [] };
  return require('./gbp/inputs').buildGbpInputs({ cv: ctx.cv, niche: ctx.niche || {}, rows, keyValueMap: ctx.keyValueMap, siteUrl: wp.length ? wp[0].url : '', serviceCopy, tradeFacts: tf });
}
// One client value changed by code (the GBP checks write gbp_place_id and landing_page_fails)
async function saveClientValue(clientId, key, value) {
  const { rows } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
  const cv = { ...CLIENT_VALUES_TEMPLATE, ...(rows.length ? JSON.parse(rows[0].content) : {}), [key]: value };
  if (rows.length) await pool.query(`UPDATE client_assets SET content = $1, uploaded_at = NOW() WHERE id = $2`, [JSON.stringify(cv), rows[0].id]);
  else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'client_values.json', $2)`, [clientId, JSON.stringify(cv)]);
}
if (pool && pageMapStore) {
  const { GBP_MODEL } = require('./gbp/generate');
  const gbpCallModel = args => makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), GBP_MODEL)(args);
  // LeadSnap rank scans (batch 3): the client exists only when the token is set on Railway
  const leadsnap = process.env.LEADSNAP_API_TOKEN ? require('./leadsnap/client').createLeadsnapClient() : null;
  require('./gbp/routes').mountGbpApi(app, { pool, loadInputs: gbpInputsFor, callModel: gbpCallModel, saveClientValue, leadsnap });
}

// Category pages (CORE (16), 23 Oct): every category page and location category page from
// the v3 page map, base pages first. category-run.js owns the order, the resume and the
// run state; category-generate.js the model call; category-decisions.js the decisions.
let categoryRunner = null;
async function categoryInputsFor(clientId) {
  const ctx = await loadV20Context(clientId, null);
  if (ctx.contextSource !== 'page_map_v3') throw Object.assign(new Error('Category pages need a v3 page map: fill in the set-up on the client record and generate the page map first.'), { status: 400 });
  const { niche, error } = nicheFor(ctx);
  if (error) throw Object.assign(new Error(error), { status: 400 });
  const rows = await pageMapStore.saved(clientId);
  const P = require('./trade-facts/pack');
  const packName = P.packNameFor(await nicheForGate(clientId, ctx.trade));
  const st = packName ? await tradeFacts.status(packName) : { exists: false, verified: false };
  const { rows: dRows } = await pool.query(
    `SELECT id, content, metadata FROM client_assets WHERE client_id = $1 AND asset_type = 'geo_dossier' AND (metadata IS NULL OR NOT (metadata->>'superseded')::boolean) ORDER BY uploaded_at DESC`, [clientId]);
  const seen = new Set();
  const dossiers = [];
  for (const r of dRows) { const loc = (r.metadata && r.metadata.location_name) || ''; const k = normaliseLocation(loc); if (!loc || seen.has(k)) continue; seen.add(k); dossiers.push({ id: r.id, text: r.content, locationName: loc }); }
  const alloc = await loadAllocationRecord(clientId);
  const allocationRecord = alloc ? alloc.record : { version: 1, pages: {} };
  return {
    ctx, niche, rows, dossiers, allocationRecord,
    calibrationPack: v20CalibrationPack(ctx, niche),
    // The category's rows are read per page (packForCategory); here the pack's standing
    tradeFacts: packName && st.exists ? { niche: packName, file: st.file, verified: !!st.verified } : null,
    reviews: Array.isArray(ctx.cv.hand_reviews) ? ctx.cv.hand_reviews : [],
    saveAllocation: record => saveAllocationRecord(clientId, { ...record, updated_at: new Date().toISOString() }),
  };
}
if (pool && pageMapStore && v20Store) {
  const CG = require('./category-generate');
  const { createCategoryRunner } = require('./category-run');
  const P = require('./trade-facts/pack');
  const callModel = args => makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), CG.CATEGORY_MODEL)(args);
  categoryRunner = createCategoryRunner({
    pool, v20Store,
    loadInputs: categoryInputsFor,
    // The category's trade facts rows join the request only when the pack is verified
    generate: async args => {
      const D = args.decisionsResult.decisions;
      let tf = args.tradeFacts;
      if (tf && D) {
        try { const pack = P.packForCategory(tf.niche, D.category, D.cards.map(c => c.name)); tf = { ...tf, markdown: pack.markdown, missing: pack.missing }; }
        catch (e) { tf = { ...tf, verified: false, error: e.message }; }
      }
      return CG.generateCategoryPage({ ...args, tradeFacts: tf, callModel });
    },
    allocate: args => allocation.runAllocation({ ...args, callModel: async (system, message) => {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const r = await client.messages.create({ model: allocation.ALLOCATION_MODEL, max_tokens: 2048, system, messages: [{ role: 'user', content: message }] });
      return r.content.map(c => c.text || '').join('');
    } }),
  });
  const catRoute = handler => async (req, res) => {
    try { res.json(await handler(req)); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };
  app.get('/api/clients/:clientId/category-pages', catRoute(async req => {
    const rows = await pageMapStore.saved(req.params.clientId);
    const view = await categoryRunner.view(req.params.clientId, rows);
    let readiness = { ok: true };
    try { const I = await categoryInputsFor(req.params.clientId); require('./category-blocks').blocksFor({ niche: I.niche, cv: I.ctx.cv, category: (rows.find(r => r.type === 'category' && r.applies !== false) || {}).title || '' }); readiness.tradeFacts = I.tradeFacts; readiness.dossiers = I.dossiers.map(d => d.locationName); readiness.reviews = I.reviews.length; }
    catch (e) { readiness = { ok: false, error: e.message }; }
    return { ...view, readiness };
  }));
  // The run goes on in the background: the panel polls the state
  app.post('/api/clients/:clientId/category-pages/run', catRoute(async req => {
    const { resume = true, keys = null, quality = false } = req.body || {};
    if (categoryRunner.running.has(req.params.clientId)) throw Object.assign(new Error('A category pages run is already in progress for this client.'), { status: 409 });
    categoryRunner.run(req.params.clientId, { resume: !!resume, keys: Array.isArray(keys) && keys.length ? keys : null, qualityReview: !!quality })
      .catch(err => console.error('[category] run failed for', req.params.clientId, err));
    return { started: true };
  }));
  // The decisions for one page as they stand now, no model call (a dry run)
  app.get('/api/clients/:clientId/category-pages/preview/:key(*)', catRoute(async req => {
    const I = await categoryInputsFor(req.params.clientId);
    const key = '/' + String(req.params.key || '').replace(/^\/+/, '');
    const page = categoryRunner.pagesInOrder(I.rows).find(p => p.slug === key);
    if (!page) throw Object.assign(new Error(`No category page ${key} in the page map.`), { status: 404 });
    const written = await categoryRunner.writtenFor(req.params.clientId, I.rows, key);
    const { decisionsResult, extraFlags } = await categoryRunner.prepare(req.params.clientId, I, page, written);
    return { key, gates: decisionsResult.gates, flags: [...decisionsResult.flags, ...extraFlags], decisionsBlock: decisionsResult.decisionsBlock };
  }));
}

app.get('/api/clients/:clientId/wp/connection', wpRoute(req => wpService.connection(req.params.clientId)));
app.put('/api/clients/:clientId/wp/connection', wpRoute(req => wpService.saveConnection(req.params.clientId, req.body || {})));
app.post('/api/clients/:clientId/wp/test', wpRoute(req => wpService.test(req.params.clientId)));
app.post('/api/clients/:clientId/wp/claims-review', wpRoute(req => wpService.reviewClaims(req.params.clientId, req.body || {}, v20CallModel)));
app.post('/api/clients/:clientId/wp/dry-run', wpRoute(req => wpService.dryRun(req.params.clientId, req.body || {})));
app.post('/api/clients/:clientId/wp/push', wpRoute(req => wpService.push(req.params.clientId, req.body || {})));
app.post('/api/clients/:clientId/wp/rollback', wpRoute(req => wpService.rollback(req.params.clientId, req.body || {})));
app.get('/api/clients/:clientId/wp/log', wpRoute(req => wpService.log(req.params.clientId)));
app.put('/api/clients/:clientId/wp/claims-accepted', wpRoute(req => wpService.acceptClaims(req.params.clientId, req.body || {})));

// ── v20 page routes ──────────────────────────────────────────────────────────
// The same routes serve /v20/homepage (kept for the screens and links that use it)
// and /v20/pages/:type/:key, for every page type.
const v20Edit = require('./v20-edit');
const V20_PAGE_BASES = ['/api/clients/:clientId/v20/homepage', '/api/clients/:clientId/v20/pages/:type/:key'];

for (const base of V20_PAGE_BASES) {
  // Latest saved version, plus the dates of earlier ones
  app.get(base, wpRoute(async req => {
    const versions = await v20Store.versions(req.params.clientId, v20PageOf(req), 20);
    if (!versions.length) return { record: null, history: [] };
    return { record: versions[0].record, history: versions.map(v => ({ id: v.id, generatedAt: v.at })) };
  }));

  app.get(`${base}/download`, async (req, res) => {
    if (!pool) return res.status(503).send('Database not configured.');
    try {
      const page = v20PageOf(req);
      const found = await loadV20Download(req.params.clientId, req.query.id || null, page);
      if (!found) return res.status(404).send(`No v20 ${getPageType(page.type).label.toLowerCase()} has been generated for this client yet.`);
      const md = req.query.format === 'md';
      const body = md ? pageTypeOf(found.record).readerView(found.record, found.values) : reader.buildJsonDownload(found.record);
      const name = found.page.type === 'homepage' ? reader.downloadName(found.values, md ? 'md' : 'json')
        : reader.downloadName(found.values, md ? 'md' : 'json').replace('_homepage_', `_${found.page.type}_${found.page.key}_`.replace(/[^a-zA-Z0-9_-]+/g, '_'));
      res.setHeader('Content-Type', md ? 'text/markdown; charset=utf-8' : 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      res.send(body);
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  // The editable fields of a version, with today's issues beside them
  app.get(`${base}/fields`, wpRoute(async req => {
    const page = v20PageOf(req);
    const found = await loadV20Download(req.params.clientId, req.query.id || null, page);
    if (!found) throw new Error(`No v20 ${getPageType(page.type).label.toLowerCase()} has been generated for this client yet.`);
    let issues = null, issuesError = null;
    try { issues = v20Edit.revalidate(found.record, await v20CurrentFacts(req.params.clientId, req.query.sessionId || null, found.record)).VALIDATION.issues; }
    catch (e) { issuesError = e.message; }
    return { recordId: found.id, fields: v20Edit.editableFields(found.record), issues, issuesError };
  }));

  // Save an edit as a new version (validated and claims-reviewed; see v20-edit.js)
  app.put(`${base}/fields`, wpRoute(async req => {
    const { clientId } = req.params;
    const { recordId, edits, accepted, sessionId } = req.body || {};
    if (!recordId) throw new Error('Which version? recordId is missing.');
    const page = v20PageOf(req);
    const found = await v20Store.byId(clientId, recordId);
    if (!found) throw new Error('Version not found.');
    if (found.type !== page.type || found.key !== page.key) throw new Error('That version belongs to another page.');
    const current = await v20CurrentFacts(clientId, sessionId, found.record);
    const latest = await v20Store.latest(clientId, page);
    const { runClaimsReview, factsFromRecord } = require('./wp/claims-review');
    const out = await v20Edit.editRecord({
      record: found.record, isLatest: !!latest && latest.id === recordId, edits, accepted, current,
      // The review reads today's service list, as a review run again does (22 Oct)
      review: rec => runClaimsReview(rec, factsFromRecord(current.servicesOnFile ? { ...rec, meta: { ...(rec.meta || {}), services_on_file: current.servicesOnFile } } : rec), v20CallModel),
    });
    // The previous version keeps the acceptances made on it; the edit is a new version
    if (out.previous.CLAIMS !== found.record.CLAIMS) await v20Store.saveClaims(clientId, recordId, out.previous.CLAIMS);
    const id = await v20Store.insert(clientId, out.record, page);
    console.log(`[v20] hand edit for ${clientId} (${page.type} ${page.key}): ${out.changed.length} field(s); ${out.record.VALIDATION.block} BLOCK, ${out.record.VALIDATION.flag} FLAG; claims ${out.record.CLAIMS.status}`);
    return { recordId: id, record: out.record, changed: out.changed };
  }));
}

// ── Client API routes ─────────────────────────────────────────────────────────

const dbRequired = (req, res, next) => pool ? next() : res.status(503).json({ error: 'Database not configured.' });
app.use('/api/clients', dbRequired);

// Clients list and create, niche tabs and allocation: fillout/client-routes.js
// (GET /api/niches, GET/POST /api/clients, POST /api/clients/:id/allocate and /move)
require('./fillout/client-routes').mountClientRoutes(app, pool);

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
      `SELECT p.*, c.trade, c.niche_key FROM pages p JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1 AND p.client_id = $2`,
      [req.params.pageId, req.params.clientId]
    );
    if (!pageRows.length) return res.status(404).json({ error: 'Page not found.' });
    const page = pageRows[0];
    if (page.page_type === 'service') {
      const gate = await tradeFacts.serviceGate(page.niche_key && page.niche_key !== 'other' ? page.niche_key : page.trade);
      if (!gate.ok) return res.status(409).json({ error: gate.message });
    }

    // Load client files: prefer client_file rows (saved at Step 1 upload).
    // Fall back to legacy asset types for older clients that pre-date Step 1 saving.
    const { rows: clientFileRows } = await pool.query(
      `SELECT filename, content, metadata FROM client_assets
       WHERE client_id = $1 AND asset_type = 'client_file'
       ORDER BY uploaded_at DESC`,
      [req.params.clientId]
    );

    let keyValueMap, serviceParentMap, legacyGeoText, onboardingText;

    if (clientFileRows.length) {
      // Parse from client_file rows using the same path as parse-saved-files
      const fileObjs = clientFileRows.map(r => ({
        originalname: r.filename || 'file',
        buffer: Buffer.from(r.content, 'utf8'),
      }));
      const { identified, missing } = identifyFiles(fileObjs);
      if (missing.length) {
        return res.status(422).json({ error: `Saved files incomplete (${missing.join(', ')}) — re-upload in Step 1.` });
      }
      const readText = f => f.buffer.toString('utf8');
      ({ keyValueMap, serviceParentMap } = parseCustomValues(identified.customValues.map(readText)));
      legacyGeoText  = identified.geo ? readText(identified.geo) : '';
      onboardingText = identified.onboarding ? readText(identified.onboarding) : '';
    } else {
      // Legacy fallback: custom_values may be multiple rows; onboarding/geo_research take newest
      const { rows: legacyAssets } = await pool.query(
        `SELECT asset_type, content FROM client_assets
         WHERE client_id = $1 AND asset_type IN ('custom_values','onboarding','geo_research')
         ORDER BY uploaded_at DESC`,
        [req.params.clientId]
      );
      if (!legacyAssets.length) {
        return res.status(422).json({ error: 'No saved files for this client — upload them in Step 1.' });
      }
      const getNewest = type => (legacyAssets.find(a => a.asset_type === type) || {}).content || '';
      const customValuesCsvs = legacyAssets.filter(a => a.asset_type === 'custom_values').map(a => a.content);
      ({ keyValueMap, serviceParentMap } = parseCustomValues(customValuesCsvs));
      legacyGeoText  = getNewest('geo_research');
      onboardingText = getNewest('onboarding');
    }
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
  // One-off, idempotent: existing hand-made clients get their niche tab; Fillout clients wait in New Clients
  if (pool) await require('./fillout/allocation').migrateAllocations(pool).catch(err => console.error('[clients] allocation migration failed:', err));
  if (filloutService) {
    const n = await filloutService.recoverPending().catch(err => { console.error('[fillout] recovery failed:', err); return 0; });
    if (n) console.log(`[fillout] processed ${n} submission(s) left waiting by a restart`);
  }
  app.listen(PORT, () => console.log(`Copy bot running at http://localhost:${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});

// For the local demo (tests/ui/demo-server.js), which seeds a record from the demo client's own context
module.exports = { v20HomepageInputs };
