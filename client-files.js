'use strict';

// Page map and custom values parsers (moved out of server.js so tests and the
// WordPress push can use them). Behaviour unchanged.

const Papa = require('papaparse');

const PAGE_TYPE_MAP = {
  'Homepage':          'homepage',
  'Category':          'category',
  'Service':           'service',
  'Location':          'location',
  'Location Category': 'location-category',
  'Locations Hub':     'locations-hub',
  'About':             'about',
  'Cost Guide':        'cost-guide',
};

// Page types read only so the homepage can link to them. Copybot has no prompt
// for these, so they never become generation jobs.
const LINK_ONLY_PAGE_TYPES = new Set(['locations-hub', 'about', 'cost-guide']);

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
      // Optional allocation columns: "SOU-N07, SOU-N14" and "faq_B=SOU-S02, faq_X=SOU-S05"
      assignedNeighbourhoods: ((row['Assigned neighbourhoods'] || '').match(/[A-Z]{2,4}-N\d{2,3}/g) || []),
      assignedSymptoms: Object.fromEntries(
        (row['Assigned symptoms'] || '').split(/[,;\n]/).map(s => s.split('=').map(x => x.trim()))
          .filter(([slot, id]) => slot && /^[A-Z]{2,4}-S\d{2,3}$/.test(id || ''))),
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

module.exports = { PAGE_TYPE_MAP, LINK_ONLY_PAGE_TYPES, parsePageMap, parseCustomValues };
