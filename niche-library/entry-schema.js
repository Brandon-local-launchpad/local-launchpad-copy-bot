'use strict';

// ── The niche entry schema (3 Nov 2026) ──────────────────────────────────────
// What a niche-library/<stem>.json must hold. server.js loadNiche refuses an entry that
// misses a REQUIRED key (G-NICHE); tools/niche-entry-check.js checks the rest, so an entry
// written for a new niche fits what the code reads before a page is run on it. The model
// entry is landscaper.json; niche-library/README.md says how an entry is written.

// The slots loadNiche insists on (a blank or empty one is missing)
const REQUIRED_KEYS = [
  'trade', 'trade_lower', 'trade_person', 'trade_person_plural',
  'customer_type', 'unit_of_work', 'emergency_niche', 'big_ticket',
  'schema_subtype', 'words_use', 'words_avoid', 'buttons', 'steps',
  'cover_chain', 'fears', 'faq_slots', 'materials_tick_list', 'why_titles_alt',
];

// The slots the page jobs read beyond those (an entry without them runs, but a page job
// refuses or falls back: no block briefs refuses category, service and location pages)
const PAGE_KEYS = [
  'business_type_default', 'core_services', 'service_words', 'general_service_words', 'service_terms',
  'logo_tiers', 'priority_services', 'category_work_nouns', 'category_types', 'seasonal_trade',
  'category_page_blocks', 'service_page_blocks', 'location_page_blocks', 'do_not_reuse',
];

// The button keys the homepage reads (final_h2_emergency only where the niche has emergency pages)
const BUTTON_KEYS = ['primary_action', 'meta_cta', 'process_h2', 'final_h2', 'cta_band_line', 'cta_band_line_no_response'];

// Placeholders the briefs may use; code fills them per page
const PLACEHOLDERS = ['[CAT]', '[CAT_LOWER]', '[WORK]', '[WORK_LOWER]', '[CITY]', '[TOWN]', '[SERVICE]', '[SERVICE_LOWER]', '[SYMPTOM]', '[QUOTE_FREE]', '[QUOTE_FREE_LOWER]', '[TRADE_PERSON]', '[CV: '];

// The five doubts a FAQ question answers (CORE (20) and the FAQ framework)
const DOUBTS = ['Price', 'Trust', 'Fit', 'Process', 'Timing'];

// The business types a block entry may be keyed by
const TYPES = ['A', 'A2', 'B', 'C', 'D'];

module.exports = { REQUIRED_KEYS, PAGE_KEYS, BUTTON_KEYS, PLACEHOLDERS, DOUBTS, TYPES };
