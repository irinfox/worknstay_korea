// Live KTO call (architecture.md §5) — areaBasedList2, one broad call per lDongRegnCd code per
// lclsSystm1 top bucket (NA/VE/HS), reclassified client-side into today's curated lclsSystm2/3
// whitelist (not the retired cat1/2/3 tree, which under-surfaced popular sites). Fanned out
// across every lDongRegnCd code a region owns (Promise.allSettled: one code/bucket failing only
// drops that slice), deduped by contentId. Edge caching is disabled in production pending KTO's
// caching-approval form (notes/attraction-gallery-report.md) — every page view is a live call.
// Falls back to `topAttractions.json` (real, hand-verified KTO data, also boosted into live
// results — boost-curated.mjs) when KTO_API_KEY isn't set or the daily quota is exhausted, so
// callers always see `{ items: Attraction[], quotaExceeded: boolean }`.
//
// The fetch/classify/dedupe orchestration itself lives in lib/attraction-fetch.mjs (no JSON
// imports there, unlike this file) so it's importable from a plain Node investigation script too
// — see that module's header comment and notes/attraction-gallery-report.md §7.
import topAttractions from "../../../../src/_data/topAttractions.json";
import { fetchRegionAttractions } from "../../lib/attraction-fetch.mjs";
import { isValidSlug, slugToLDongRegnCds } from "../../lib/region-map.mjs";
import { citySlugFor } from "../../lib/city-map.mjs";
import { boostCuratedPicks } from "../../lib/boost-curated.mjs";

// Display-order priority per region (not a filter — every bucket fetched by fetchRegionAttractions
// is always fetched). Provisional; user wants to refine after seeing live results
// (ROADMAP_TODO.md Phase 24).
const CATEGORY_PRIORITY = {
  "gyeonggi-do": "culture",
  "gyeongsang-do": "culture",
  "jeolla-do": "culture",
  "chungcheong-do": "culture",
  "gangwon-do": "nature",
  "jeju-do": "nature",
};

export async function onRequestGet({ params, env }) {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: `Unknown region slug: ${slug}` }, { status: 404 });
  }

  const regionTopPicks = topAttractions.filter((a) => a.regionSlug === slug);

  if (!env?.KTO_API_KEY) {
    return Response.json({ items: regionTopPicks, quotaExceeded: false, fallback: true });
  }

  const codes = slugToLDongRegnCds(slug);
  let items = regionTopPicks;
  let quotaExceeded = false;
  if (codes.length) {
    ({ items, quotaExceeded } = await fetchRegionAttractions(slug, codes, env, citySlugFor));

    // KTO's daily call quota is gone for the account — the live fetch above can't be trusted (a
    // mix of stale edge-cache hits and quota-blocked misses), so fall back to the top-picks set
    // rather than show a partial or empty gallery. `quotaExceeded` stays true so the front end
    // swaps in "Top picks for today" instead of implying this is the full live list
    // (region-data.js).
    if (quotaExceeded) {
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
  // active (attraction-filters.js's CITY_CATEGORY_PRIORITY) — an earlier server-side attempt at
  // this leaked into "All" no matter how it was implemented, since there's only one array to sort.
  const priority = CATEGORY_PRIORITY[slug];
  if (priority) {
    const rank = (category) => (category === priority ? 0 : 1);
    items.sort((a, b) => rank(a.category) - rank(b.category));
  }

  return Response.json({ items, quotaExceeded });
}
