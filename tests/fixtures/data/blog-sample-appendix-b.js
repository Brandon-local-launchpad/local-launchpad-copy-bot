'use strict';
// The spec's Appendix B sample post (Ray, docs/Blog_Post_Structure.pdf): a decision post for
// Edens Edge written by hand to the structure, transcribed as a blog record with the decisions
// code would have made. The council facts (the dropped kerb fee, the paving rule) are the
// FACTS ALLOWED rows they would arrive as. The business block's bracketed note in the PDF is
// replaced by the quote method sentence it stands for. Links are the Markdown the model writes.
const PRIMARY = '/patios-paving/';
const COST_GUIDE = '/guides/patio-cost-southampton/';

const sections = [
  { h2: 'When Do You Need Planning Permission?', body: 'You need it when more than five square metres of a front garden is covered with a solid surface and the rainwater has nowhere to soak away. If the surface is permeable, or the water runs onto a lawn or border inside the garden, permission usually isn\'t needed at any size.\n\nThe rule covers the paving only. Walls, fences, gates and a dropped kerb are dealt with separately, and each has its own rules, so a new front drive can involve more than one check before work starts.\n\nThe rule has been in place since October 2008, so a neighbour\'s older paved drive isn\'t a guide to what\'s allowed now. Many front gardens across Southampton were paved before then, and they don\'t show what the council would accept today.\n\nOur [patio and paving work](/patios-paving/) starts by checking which side of that line a front garden sits on, before any design is drawn up.' },
  { h2: 'What Counts as a Permeable Surface?', body: 'A permeable surface lets rain soak through it into the ground instead of running off into the road. That\'s the test the planning rule uses, so the material matters more than the size of the area being paved.\n\nGravel, permeable block paving and porous asphalt are all made to let water through, so they don\'t need planning permission however much of the front garden they cover. Each one needs the right base underneath to keep draining over the years, which is why the layers below the surface matter as much as the top.\n\nSolid paving and concrete can still go ahead without permission when the water is directed onto a lawn, a border or a soakaway inside the garden rather than onto the pavement. Without that, a solid surface over five square metres usually needs an application.' },
  { h2: 'Do You Need a Dropped Kerb in Southampton?', body: 'Yes, if you\'ll drive across the pavement to park. Driving over a kerb that hasn\'t been lowered isn\'t allowed, so a new front drive for a car usually goes hand in hand with a dropped kerb application.\n\nSouthampton City Council charges a £160 application fee that isn\'t refunded, and it won\'t look at the application until any planning permission the drive needs has been granted. That makes the order important: sort out the paving first, then apply for the kerb.\n\nThe standard width is 4.6 metres, usually three lowered kerbs with a sloping kerb either side. Gates across the drive must open inwards, so they never swing out over the pavement.\n\nThe council approves the crossing but doesn\'t build it, so the kerb work is arranged separately once the approval comes through.' },
  { h2: 'Does a Conservation Area Change Anything?', body: 'It can. In Southampton\'s conservation areas, changes to front walls, fences and some garden work may need permission, even when the same job on another street wouldn\'t.\n\nConservation areas protect the look of a street as a whole, so the council can take an interest in front gardens that sit in view of the road. Taking down a front wall to make space for parking is the kind of change that can need an extra check.\n\nThe simplest step is to find out whether the property sits in a conservation area before any work is booked. The council\'s planning team can confirm it, and can say whether the plans need an application. If permission is needed, it\'s far easier to get it first than to change finished work afterwards.' },
];

const tableRows = [
  ['Gravel', 'No'], ['Permeable block paving', 'No'], ['Porous asphalt', 'No'],
  ['Solid paving or concrete draining to a lawn or border', 'No'], ['Solid paving or concrete over 5m² with no drainage', 'Usually yes'],
];

const faq = [
  { faq_question: 'Is the dropped kerb fee refunded if I\'m refused?', faq_answer: 'No. Southampton City Council\'s £160 charge is non refundable, whatever the outcome. That\'s why it\'s worth checking whether the drive needs planning permission first, because the council won\'t look at a dropped kerb application until any permission needed has been granted.' },
  { faq_question: 'Can I drive over the kerb without one?', faq_answer: 'No. Driving over a pavement without a dropped kerb isn\'t allowed, and the council can charge for any damage to the footway. If you\'re planning to park on a new front drive, the dropped kerb application is part of the job, alongside the paving itself.' },
  { faq_question: 'What happens if I pave without permission?', faq_answer: 'The council can ask for it to be changed or removed. If the paving needed permission and doesn\'t have it, putting it right usually costs more than doing it properly the first time, so it\'s worth checking the surface and the drainage before any work starts.' },
];

const record = {
  page: 'blog', post_type: 'decision', source: 'faq_research', cost_mode: null,
  page_slug: '/guides/planning-permission-front-garden-paving', url: '/guides/planning-permission-front-garden-paving/',
  service: 'Patios and paving', category: '', town: '',
  seo_title: 'Planning Permission to Pave a Front Garden Southampton',
  meta_description: 'Usually not, if the new surface lets water drain through. Get your free quote today.', meta_how: 'first sentence plus the CTA',
  breadcrumb: [{ name: 'Home', url: '/' }, { name: 'Guides', url: '/guides/' }],
  blog_h1: 'Do You Need Planning Permission to Pave Your Front Garden?',
  blog_byline: 'By Ethan, owner at [CV: company_name]', blog_last_checked: '2026-10-28', blog_last_checked_text: '28 October 2026', blog_review_due: '2027-10-28',
  publish_date: '2026-11-09', homepage_cost_guide: false,
  blog_answer: 'Usually not, if the new surface lets water drain through. Gravel, permeable block paving and porous asphalt don\'t need planning permission at any size, and nor does a solid surface that drains onto a lawn or border. Driving onto it from the road needs a dropped kerb, which is a separate application to Southampton City Council.',
  sections: sections.map((s, i) => ({ ...s, doubt: 'Process', id: `S-${i + 1}` })),
  table_show: true, table_type: 'decision', table_after: 2,
  table_columns: ['Surface', 'Needs planning permission?'],
  table_rows: tableRows.map(([row, cell]) => ({ row, cells: [cell], cells_text: cell })),
  blog_business_show: true, blog_business_h2: 'How [CV: company_name] Handles Front Garden Paving',
  blog_business: 'At the quote visit, we check the size of the front garden, the surface you want and where the water will go, so the plan stays within the rules. You get a written quote after that visit, with the price agreed before any work starts, and the same person who quoted the job is on site when it runs.',
  blog_faq_h2: 'Common Questions About Front Garden Paving',
  faq_items: faq.map((f, i) => ({ ...f, doubt: 'Process', id: `F-${i + 1}` })),
  blog_cta_h2: 'Talk to a Local Landscaper About Front Garden Paving',
  blog_closing: 'Planning a new front drive? See what goes into the price in our [Southampton patio cost guide](/guides/patio-cost-southampton/), or [book a quote](/patios-paving/) for your patio and paving work.',
  buttons: ['Get My Free Quote', 'Call [CV: phone]'],
  primary_link: { url: PRIMARY, name: 'Patios and paving', type: 'service', status: 'Live' },
  secondary_links: [{ url: COST_GUIDE, name: 'Patio cost guide', type: 'cost guide' }],
  safety: { on: false, topics: [] },
  specificity: { count: 5, have: ['a named town', 'a dossier condition', 'the customer question in their own words', 'a confirmed process or proof', 'named methods or symptoms from the trade facts'], missing: ['a price for the service'], threshold: 4 },
  FLAGS: [], VALIDATION: { status: 'not run' }, meta: { page_type: 'blog', page_key: '/guides/planning-permission-front-garden-paving', post_type: 'decision' },
};

// The decisions the validator reads (the parts of blog/decisions.js D it uses)
const decisions = {
  slug: record.page_slug, post_type: 'decision', h1: record.blog_h1, primary: record.primary_link, secondary: record.secondary_links,
  linkablePages: [{ type: 'service', url: PRIMARY, h1: 'Patios and paving' }, { type: 'cost guide', url: COST_GUIDE, h1: 'Patio cost guide' }],
  safety: record.safety, ideasUsed: [], usedQuestions: [], sections: record.sections, faq: record.faq_items, table: { show: true, type: 'decision', columns: record.table_columns, rows: tableRows.map(([label]) => ({ label })) }, business: { show: true },
  facts: [
    { id: 'CV-quote_method', kind: 'client value', text: '[CV: quote_method] = written quote after a visit' },
    { id: 'PR-1', kind: 'confirmed practice', text: 'The price is agreed before any work starts' },
    { id: 'PR-2', kind: 'confirmed practice', text: 'The person who quotes the job is on site when it runs' },
    { id: 'TF-1', kind: 'trade facts rule', text: 'Front garden paving: more than five square metres of an impermeable surface that drains to the road usually needs planning permission; gravel, permeable block paving and porous asphalt do not, nor does a solid surface draining to a lawn or border; the rule dates from October 2008. What the customer does: checks the surface and where the water goes before booking.' },
    { id: 'TF-2', kind: 'trade facts rule', text: 'Dropped kerb: driving over a pavement needs a dropped kerb (a vehicle crossing); Southampton City Council charges a £160 application fee, not refunded, and will not consider it until any planning permission is granted; the standard width is 4.6 metres, three lowered kerbs with a sloping kerb either side; gates must open inwards; the council approves the crossing and the kerb work is arranged separately.' },
    { id: 'TF-3', kind: 'trade facts rule', text: 'Conservation areas: changes to front walls, fences and some garden work may need permission; the council\'s planning team confirms whether a property sits in one.' },
    { id: 'TF-4', kind: 'trade facts what goes wrong', text: 'Signs: paving laid without permission can be ordered changed or removed by the council; a permeable surface needs the right base underneath to keep draining.' },
    { id: 'CQ-1', kind: 'the customer\'s own words', text: 'Do I need planning permission to pave my front garden?' },
  ],
};

const cv = { company_name: 'Edens Edge Landscaping', phone: '023 0000 0000', free_quotes: 'yes', quote_method: 'written quote after a visit', confirmed_practices: ['price_agreed_before_work', 'same_person_quotes_and_does', 'written_quote'], owner_name: 'Ethan', owner_role: 'owner', insurance_cover: '5m', differentiator_1: 'Fixed Prices With No Hidden Costs', differentiator_1_confirmed: true };

module.exports = { record, decisions, cv, PRIMARY, COST_GUIDE };
