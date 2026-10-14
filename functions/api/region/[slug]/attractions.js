// Live KTO call: areaBasedList2, one call per lDongRegnCd code per lclsSystm1 bucket (NA/VE/HS),
// reclassified here into the curated lclsSystm2/3 whitelist. Fanned out across a region's codes
// (Promise.allSettled: a failed slice is dropped), deduped by contentId. No caching — every view
// is a live call. Falls back to `topAttractions.json` (hand-verified, also boosted into live
// results — boost-curated.mjs) when KTO_API_KEY isn't set or the quota is gone, so callers always
// get `{ items: Attraction[], quotaExceeded: boolean }`. Orchestration lives in
// lib/attraction-fetch.mjs so plain Node scripts can import it.
import regions from "../../../../src/_data/regions.json";
import topAttractions from "../../../../src/_data/topAttractions.json";
import { fetchRegionAttractions } from "../../lib/attraction-fetch.mjs";
import { isValidSlug, slugToLDongRegnCds } from "../../lib/region-map.mjs";
import { citySlugFor } from "../../lib/city-map.mjs";
import { boostCuratedPicks } from "../../lib/boost-curated.mjs";

// Responses are never cached (every view is a live call); the dev cache lives in kto-client.
const NO_STORE = { headers: { "Cache-Control": "no-store" } };

// Display order per region (not a filter): regions.json attractionPriority. Applied on every path
// (live, quota fallback, no-key fallback) so local no-key testing shows production's order.
function sortByRegionPriority(items, slug) {
  const priority = regions.find((r) => r.slug === slug)?.attractionPriority;
  if (!priority) return;
  const rank = (category) => (category === priority ? 0 : 1);
  items.sort((a, b) => rank(a.category) - rank(b.category));
}

export async function onRequestGet({ params, env }) {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: "Unknown region" }, { status: 404 });
  }

  const regionTopPicks = topAttractions.filter((a) => a.regionSlug === slug);

  if (!env?.KTO_API_KEY) {
    sortByRegionPriority(regionTopPicks, slug);
    return Response.json({ items: regionTopPicks, quotaExceeded: false, fallback: true }, NO_STORE);
  }

  const codes = slugToLDongRegnCds(slug);
  let items = regionTopPicks;
  let quotaExceeded = false;
  let liveFailed = false;
  if (codes.length) {
    let failed;
    ({ items, quotaExceeded, failed } = await fetchRegionAttractions(slug, codes, env, citySlugFor));
    liveFailed = failed && !quotaExceeded;

    // Any live call failed (quota included): serve top picks rather than a partial gallery. The
    // front end words `quotaExceeded` ("back tomorrow") and `liveFailed` ("unavailable") apart.
    if (failed) {
      items = regionTopPicks;
    } else {
      // Boosting against itself (the fallback branch above) would be pointless — that's already
      // the full top-picks set.
      items = boostCuratedPicks(items, regionTopPicks);
    }
  }

  // This is the one order the "All" tab and every city/Elsewhere filter all read from (the front
  // end only toggles card visibility, it never re-sorts) — so it must stay a single, region-wide
  // rule with no per-city exception. A per-city category preference (e.g. Suncheon wanting nature
  // before culture) belongs client-side instead, applied only while that city's own pill is
  // active (cities.json attractionPriority, applied in attraction-filters.js) — an earlier server-side attempt at
  // this leaked into "All" no matter how it was implemented, since there's only one array to sort.
  sortByRegionPriority(items, slug);

  return Response.json({ items, quotaExceeded, liveFailed }, NO_STORE);
}
