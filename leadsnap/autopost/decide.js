'use strict';

// ── Lead Snap autopost: the prompt mix ───────────────────────────────────────
// The spec's build rules, in order (docs/leadsnap/Autopost_Spec.md). Code decides which
// prompts exist and which photo folder each uses, so the model cannot get the mix wrong.

const THRESHOLD = 3;
const MAX_SERVICE = 4;
const MAX_PROMPTS = 7;
const ALL_JOBS = 'All job photos';
const folderOf = f => `GBP Posts / ${f}`;

function decide(intake) {
  const { groups, brand, offer } = intake;
  const ready = groups.filter(g => g.photos >= THRESHOLD);
  const under = groups.filter(g => g.photos < THRESHOLD);
  const hasBrand = brand >= THRESHOLD;
  const jobPhotos = groups.reduce((n, g) => n + g.photos, 0);
  const brandPool = { folder: folderOf('Brand'), photos: brand };

  // Best job photos: the highest value service with enough, else whichever has the most
  const best = ready[0] || [...groups].sort((a, b) => b.photos - a.photos)[0] || null;
  const bestPool = best && best.photos > 0 ? { folder: folderOf(best.folder), photos: best.photos } : { folder: 'None yet', photos: 0 };

  // Trust, tips and a confirmed offer always have their slots. "Other services" exists when
  // anything is left over and brand photos exist, and takes a slot from the service prompts
  // if the total would pass 7.
  let serviceSlots = Math.min(MAX_SERVICE, ready.length);
  const fixed = 2 + (offer ? 1 : 0);
  const wouldHaveOther = hasBrand && (under.length > 0 || ready.length > serviceSlots);
  if (serviceSlots + fixed + (wouldHaveOther ? 1 : 0) > MAX_PROMPTS) serviceSlots = MAX_PROMPTS - fixed - 1;
  const own = ready.slice(0, serviceSlots);
  const overflow = ready.slice(serviceSlots);
  const folded = hasBrand ? groups.filter(g => overflow.includes(g) || under.includes(g)) : [];

  const prompts = [];
  for (const g of own) prompts.push({ kind: 'service', label: g.label, services: g.services, folder: folderOf(g.folder), photos: g.photos, why: `${g.photos} photos; ranked by ${g.wanted ? 'what the client wants most' : g.volume ? 'search volume' : 'page map order'}` });
  if (folded.length) prompts.push({ kind: 'other', label: 'Other services', services: folded.map(g => g.label), folder: brandPool.folder, photos: brand, why: `${folded.length} service${folded.length === 1 ? '' : 's'} without a prompt of their own, on brand photos` });
  prompts.push({ kind: 'trust', label: 'Trust / why us', services: [], folder: hasBrand ? brandPool.folder : bestPool.folder, photos: hasBrand ? brand : bestPool.photos, why: hasBrand ? 'always; brand photos' : 'always; no brand photos, so the best job photos' });
  if (offer) prompts.push({ kind: 'offer', label: offer, services: [], folder: bestPool.folder, photos: bestPool.photos, why: 'offer confirmed on this tab' });
  prompts.push({ kind: 'tips', label: 'Evergreen tips', services: [], folder: jobPhotos ? ALL_JOBS : 'None yet', photos: jobPhotos, why: 'always; all job photos' });
  prompts.forEach((p, i) => { p.n = i + 1; });

  // A service under the threshold is a gap whether or not it is folded in: with photos it can
  // get its own prompt. One with enough photos that only lost out on a slot is not a gap.
  const gaps = under.map(g => ({ label: g.label, photos: g.photos, key: g.key }));
  const notes = [];
  if (overflow.length && !hasBrand) notes.push(`${overflow.map(g => g.label).join(', ')} ${overflow.length === 1 ? 'has' : 'have'} enough photos, but the top ${own.length} services took the service prompts and there are no brand photos for an "other services" prompt, so ${overflow.length === 1 ? 'it gets' : 'they get'} no post.`);
  if (!hasBrand && under.length) notes.push(`Fewer than ${THRESHOLD} brand photos, so the services under ${THRESHOLD} photos get no post at all until photos come in.`);
  if (prompts.length < 5) notes.push(`Only ${prompts.length} prompts; the spec aims for 5 to 7. More photos give more prompts.`);
  return { prompts, gaps, notes, jobPhotos };
}

module.exports = { decide, THRESHOLD, MAX_PROMPTS, MAX_SERVICE, ALL_JOBS };
