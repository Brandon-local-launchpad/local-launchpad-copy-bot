'use strict';

// ── Page type: legal pages ───────────────────────────────────────────────────
// Privacy Policy, Service Terms, Website Terms of Use: fixed text filled by code, so there
// are no model fields. The record is built live by legal/service.js, never stored.
// wp.fixedText tells the dry run and the push: wp.preflight replaces the validation checks,
// there is no claims review (the model wrote nothing), and Client Values are left alone
// (a legal record has none, and the push would blank the site's).

const LEGAL_FIELDS = [['legal_body', 'html']];

module.exports = {
  id: 'legal',
  label: 'Legal page',
  modelFields: () => [],
  ranges: {},
  replyLabels: /$^/,
  validate: () => [],
  readerView: record => record.legal_text || '',
  wp: {
    label: 'legal page',
    fixedText: true,
    fields: LEGAL_FIELDS,
    get groups() { return require('../wp/acf-schema').LEGAL_GROUPS; },
    buildPayload: record => ({ acf: { legal_body: record.legal_html }, meta: {} }),
    findPage: (site, record) => require('../wp/client').findPageBySlug(site, record.legal_slug),
    // Held pages (F-LEGAL), staging sites only (Brandon's brief), and nothing left of the template
    preflight(record, site) {
      const { stagingGuard } = require('../site-audit/redirects');
      const { residueIn } = require('../legal/fill');
      return [
        ...(record.legal_refusals || []),
        ...stagingGuard(site, record.legal_live_domain),
        ...residueIn(record.legal_html || '').map(r => `"${r}" is left in the ${record.legal_title}.`),
      ];
    },
  },
};
