// Live KTO call (architecture.md §5) — areaBasedList2, filtered by lclsSystm1/2/3 (not the
// retired cat1/2/3 tree, which under-surfaced popular sites). lclsSystm spans content types on
// its own — returns a mix of contentTypeId 76/78, no per-type call needed. Fanned out across
// every lDongRegnCd code a region owns (Promise.allSettled: one code/group failing only drops
// that slice), deduped by contentId. Edge caching is disabled in production pending KTO's
// caching-approval form (notes/attraction-gallery-report.md) — every page view is a live call.
// Falls back to `topAttractions.json` (real, hand-verified KTO data, also boosted into live
// results — boost-curated.mjs) when KTO_API_KEY isn't set or the daily quota is exhausted, so
// callers always see `{ items: Attraction[], quotaExceeded: boolean }`.
import topAttractions from "../../../../src/_data/topAttractions.json";
import { fetchKto, fetchKtoAllPages } from "../../lib/kto-client.mjs";
import { normalizeAttraction } from "../../lib/normalize.mjs";
import { isValidSlug, slugToLDongRegnCds } from "../../lib/region-map.mjs";
import { citySlugFor } from "../../lib/city-map.mjs";
import { boostCuratedPicks } from "../../lib/boost-curated.mjs";

// contentTypeId is deliberately never passed to the KTO call below — see the module comment.
// This is a defensive post-filter only, in case some other content type (restaurant, lodging,
// shopping) ever carries one of the lclsSystm codes below.
const ALLOWED_CONTENT_TYPE_IDS = new Set([76, 78]);
// arrange=P: view-count order, representative image required. Undocumented in the EngService2
// spec (which only lists A/C/D/O/Q/R) but stable in practice and returns resultCode 0000 on
// every region code. The documented "Q" is *modified-date* order, not view-count — it surfaces
// whatever was last edited in the CMS (shop branches, recent listings) and buries stable
// landmark records, so it was the wrong default. See notes/attraction-gallery-report.md §2.
const ARRANGE = "P";
// If KTO ever silently drops support for the undocumented `P`, the realistic failure mode isn't
// an error or empty groups (per-group emptiness is normal — most lclsSystm3 sub-codes are
// legitimately sparse for a given region) — it's `P` reverting to some other order without
// telling us. That can't be detected per group, and checking it *after* paying for the full
// fan-out risks a full double-pay if `P` is broken
// (worst case, gyeongsang-do 70 calls). Instead, `pickWorkingArrange` below pays for one cheap
// probe call up front, against a single region code with a broad, essentially-never-sparse
// bucket — if that comes back empty (and it's not just the account's quota being gone), treat it
// as a signal something's wrong with `P` and run the one real fan-out with a documented,
// image-required arrange value instead.
const FALLBACK_ARRANGE = "R"; // created-date order, image required — closest documented match to P
// Broad enough that a real empty result never happens under normal operation — VE (Leports &
// Facilities/Shopping/etc.) spans multiple lclsSystm2 buckets on its own, no lclsSystm3 needed.
const PROBE_LCLS_SYSTM1 = "VE";
const CACHE_TTL_SECONDS = 24 * 60 * 60;

// Whitelist, not blacklist, same reasoning as before: each group is one areaBasedList2 call
// narrowed server-side by lclsSystm1/2(+3); a `whitelist` Set means the group's lclsSystm2
// bucket still holds sub-codes not wanted, filtered client-side on lclsSystm3 (cheaper than one
// KTO call per sub-code, and the group call already narrows most of the way).
//
// --- Curation reference (editorial call, not derived from KTO docs) -------------------------
// Full sub-code review behind every group below, including sub-codes that never reach a
// whitelist Set because their branch is taken "full" instead. Kept here so a new lclsSystm3
// code KTO adds later under any of these lclsSystm2 buckets can be judged against these
// preferences instead of guessed at — "taken full" below means "worth revisiting if KTO adds a
// sub-code here," not "every sub-code was individually vetted."
//
// HS01 (Historical Sites, taken full): wanted — HS010100 (palaces), HS010200, HS010300,
//   HS010400, HS010600, HS010700, HS010800. Not actively wanted, but low-volume enough to
//   include anyway rather than complicate the call — HS010500, HS010900, HS011000, HS011100,
//   HS011200.
// HS03: wanted — HS030100 (temples) only. Whitelisted (not taken full) — this is the one HS
//   branch actually narrowed to a single sub-code.
// VE01 (taken full): wanted — VE010100, VE010200, VE010300, VE010400, VE010500, VE010800. Not
//   particularly wanted, but low-volume enough to include anyway — VE010700 (~3 objects
//   nationally), VE010900 (~2 objects nationally).
// VE03 / river & lake parks (taken full, category: nature — see NATURE_GROUPS above): no
//   sub-code exclusions raised.
// VE04 (taken full): no sub-code exclusions raised.
// VE07 / museums & galleries (whitelisted, not full — see VE07_WHITELIST below): wanted —
//   VE070100, VE070500, VE070600. So-so — VE070200, VE070300. Not wanted — VE070400.
// NA01 (taken full, category: nature): wanted — NA010100, NA010200, NA010300, NA010400. Not
//   wanted, but low-volume enough to include anyway — NA010500 (mineral springs, ~3 objects).
// NA02 (taken full): wanted — NA020200, NA020500, NA020700, NA020800, NA020900. Not
//   particularly wanted, but included anyway — NA020100, NA020600 (near-empty nationally).
// NA03 (taken full — the least settled call of the group): wanted — NA030100, NA030400 (a
//   single standout object), NA030500 (several standout sites). Not wanted, included anyway for
//   simplicity — NA030200, NA030300.
// NA04 (taken full): no sub-code exclusions raised.
// NA05 (taken full): coastal roads — no sub-code exclusions raised.
// -----------------------------------------------------------------------------------------------

// Nature — every NA01-NA05 sub-code reviewed (above); only a few low-count sub-codes would be
// worth excluding, so the whole "NA" branch is taken as-is rather than curating it further. VE03
// (live-confirmed: Hangang/lake/city parks — Jamsil Hangang Park, Wolmi Park, Seoseoul Lake
// Park…) is a parks bucket, not a culture one, despite living under KTO's "VE" top code —
// grouped with nature here.
const NATURE_GROUPS = [
  { category: "nature", lclsSystm1: "NA" },
  { category: "nature", lclsSystm2: "VE03" }, // full
];

// Culture — Historical Sites (HS) + everyday/urban & cultural-facility (VE) branches. See the
// curation reference above for the full wanted/so-so/not-wanted breakdown behind each group.
// If a region/city's culture list ever comes back too thin, ROADMAP_TODO.md Phase 24 tracks
// widening VE07 to its full range instead of the cut below.
const VE07_WHITELIST = new Set(["VE070100", "VE070500", "VE070600"]);
const CULTURE_GROUPS = [
  { category: "culture", lclsSystm2: "HS01" }, // full: palaces, hanok villages, historic houses…
  { category: "culture", lclsSystm2: "HS03", lclsSystm3: "HS030100" }, // temples only, not all of HS03
  { category: "culture", lclsSystm2: "VE01" }, // full
  { category: "culture", lclsSystm2: "VE04" }, // full
  { category: "culture", lclsSystm2: "VE07", whitelist: VE07_WHITELIST },
];

// Display-order priority per region (not a filter — every group above is always fetched).
// Provisional; user wants to refine after seeing live results (ROADMAP_TODO.md Phase 24).
const CATEGORY_PRIORITY = {
  "gyeonggi-do": "culture",
  "gyeongsang-do": "culture",
  "jeolla-do": "culture",
  "chungcheong-do": "culture",
  "gangwon-do": "nature",
  "jeju-do": "nature",
};
// A region page shows a representative sample, not an exhaustive attraction database. Every
// group above is narrowed server-side to one lclsSystm2 (+3) bucket, so one page each is enough
// variety without needing extra headroom for a whitelist to filter down from.
const ROWS_PER_GROUP = 30;

function fetchGroups(lDongRegnCd) {
  return [...NATURE_GROUPS, ...CULTURE_GROUPS].map((group) => ({ ...group, lDongRegnCd }));
}

// One minimal probe call (numOfRows: 1) before the real fan-out, so a broken `arrange=P` is
// caught for the cost of +1 call instead of a full double-pay after the fact (see the ARRANGE
// comment above). `firstCode` is any one of the region's
// lDongRegnCd codes — a broad bucket is either sparse or not for the whole region, one code is
// enough to tell. A quota-exceeded probe can't distinguish a working from a broken `arrange`, but
// it doesn't matter — the real fan-out will hit the same quota wall regardless of which arrange
// is picked, and the caller already handles quotaExceeded by falling back to curated picks.
async function pickWorkingArrange(firstCode, env) {
  const probe = await fetchKto(
    "areaBasedList2",
    { lDongRegnCd: firstCode, lclsSystm1: PROBE_LCLS_SYSTM1, arrange: ARRANGE, numOfRows: 1, pageNo: 1 },
    env
  );
  if (probe.quotaExceeded || probe.items.length > 0) return ARRANGE;
  return FALLBACK_ARRANGE;
}

async function fetchRegionAttractions(slug, groups, arrange, env) {
  const settled = await Promise.allSettled(
    groups.map((g) =>
      fetchKtoAllPages(
        "areaBasedList2",
        {
          lDongRegnCd: g.lDongRegnCd,
          lclsSystm1: g.lclsSystm1,
          lclsSystm2: g.lclsSystm2,
          lclsSystm3: g.lclsSystm3,
          arrange,
        },
        env,
        {
          numOfRows: ROWS_PER_GROUP,
          maxPages: 1 /*, cacheTtl: CACHE_TTL_SECONDS — disabled 2026-09, KTO requires a separate
          approval form for any caching (3-5 day review, too slow for the deadline); uncomment
          once approved (notes/attraction-gallery-report.md) */,
        }
      )
    )
  );

  const byContentId = new Map();
  let quotaExceeded = false;
  settled.forEach((result, i) => {
    if (result.status !== "fulfilled") return;
    if (result.value.quotaExceeded) quotaExceeded = true;
    if (result.value.degraded) return;
    const { category, whitelist } = groups[i];
    for (const raw of result.value.items) {
      if (!ALLOWED_CONTENT_TYPE_IDS.has(Number(raw.contenttypeid))) continue;
      if (whitelist && !whitelist.has(raw.lclsSystm3)) continue;
      const attraction = normalizeAttraction(raw);
      // Skip photo-less records (no license, or a licensed-but-empty firstimage) — a card with
      // .media-placeholder reads as broken more often than a dropped attraction is missed.
      if (!attraction.imageUrl && !attraction.imageThumbUrl) continue;
      attraction.regionSlug = slug;
      attraction.category = category;
      attraction.citySlug = citySlugFor(attraction.lDongRegnCd, attraction.lDongSignguCd);
      byContentId.set(attraction.contentId, attraction);
    }
  });

  return { items: [...byContentId.values()], quotaExceeded };
}

export async function onRequestGet({ params, env }) {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: `Unknown region slug: ${slug}` }, { status: 404 });
  }

  const regionTopPicks = topAttractions.filter((a) => a.regionSlug === slug);

  if (!env?.KTO_API_KEY) {
    return Response.json({ items: regionTopPicks, quotaExceeded: false });
  }

  const codes = slugToLDongRegnCds(slug);
  const groups = codes.flatMap(fetchGroups);
  const arrange = codes.length ? await pickWorkingArrange(codes[0], env) : ARRANGE;
  let { items, quotaExceeded } = await fetchRegionAttractions(slug, groups, arrange, env);

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
