'use strict';
// The two test clients for the FAQ research and sorting fixtures, thin and rich.
// Research: the manual Perplexity runs of 14 Oct 2026 (docs/seo/current-build/faq-research/).
// Edens Edge: real page map and GBP sheets; thin = Ethan's documented values,
// rich = the brief §7 values. Kestrel Ridge: the rich and thin page fixtures.
// Rich clients also get the FAQ facts added on 14 Oct (deposit, what the quote
// includes, waste carrier, and the three new practices) as TEST stand-ins, only so
// the questions that wait on those facts can be seen being released.

const path = require('path');
const root = path.join(__dirname, '../../..');
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const roofer = require(path.join(root, 'niche-library/roofer.json'));
const real = require('./edens-edge-real');
const acc = require('./edens-edge-acceptance');
const kRich = require('./kestrel-ridge-rich');
const kThin = require('./kestrel-ridge-thin-page');

const RESEARCH = path.join(root, 'docs/seo/current-build/faq-research');

const FAQ_FACT_STAND_INS = {
  quote_includes: 'TEST quote includes',
  deposit_terms: 'TEST deposit terms',
  waste_carrier_registered: 'yes',
};
const NEW_PRACTICES = ['extra_work_agreed_first', 'weather_delays_rebooked', 'property_protected'];
const withFacts = cv => ({
  ...cv, ...FAQ_FACT_STAND_INS,
  confirmed_practices: [...new Set([...(cv.confirmed_practices || []), ...NEW_PRACTICES])],
  stand_ins: [...(cv.stand_ins || []), ...Object.keys(FAQ_FACT_STAND_INS)],
});

const list = [
  {
    id: 'edens-edge', niche: landscaper,
    researchFile: path.join(RESEARCH, 'landscaper-southampton-edens-edge.md'),
    pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap,
    cvThin: acc.ethanValues(),
    cvRich: withFacts(acc.cv),
  },
  {
    id: 'kestrel-ridge', niche: roofer,
    researchFile: path.join(RESEARCH, 'roofer-bournemouth.md'),
    pages: kRich.pages, keyValueMap: kRich.keyValueMap, serviceParentMap: {},
    thinPages: kThin.pages, thinKeyValueMap: kThin.keyValueMap,
    cvThin: kThin.cv,
    cvRich: withFacts(kRich.cv),
  },
];

module.exports = { list, byId: Object.fromEntries(list.map(c => [c.id, c])), FAQ_FACT_STAND_INS, NEW_PRACTICES };
