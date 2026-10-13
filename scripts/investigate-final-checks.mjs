// One-off investigation for notes/attraction-gallery-report.md §7. Runs the shipped broad-collapse
// `fetchRegionAttractions` (functions/api/lib/attraction-fetch.mjs) once per region — the exact
// production fetch/classify/dedupe path, just with a script-local `citySlugFor` standing in for
// city-map.mjs (which reads cities.json without an import attribute — fine for Cloudflare's
// esbuild bundler, not importable from plain Node; see attraction-fetch.mjs's header comment for
// why citySlugFor is injected instead of imported there).
//
// One live pass across all 6 regions is 3 calls × 16 lDongRegnCd codes = 48 (+1 only if some
// region's arrange=P probe ever comes back broken) — the same "one full site exploration" cost
// notes/attraction-gallery-report.md §6 already budgeted as safe (1000/day dev quota supports 20
// of these). Not re-run speculatively: rerun only if attraction-fetch.mjs's classify/fetch logic
// changes again.
//
// Run with: node --env-file=.env scripts/investigate-final-checks.mjs
import { fetchRegionAttractions, classify } from "../functions/api/lib/attraction-fetch.mjs";
import regions from "../src/_data/regions.json" with { type: "json" };
import cities from "../src/_data/cities.json" with { type: "json" };
import topAttractions from "../src/_data/topAttractions.json" with { type: "json" };

// Mirrors city-map.mjs exactly (lDongRegnCd/lDongSignguCd -> city slug), just reading cities.json
// via an import attribute instead of a bare import so plain Node can load it.
const byRegnCd = new Map();
for (const city of cities) {
  if (!city.ktoLDongRegnCd) continue;
  const list = byRegnCd.get(city.ktoLDongRegnCd) || [];
  list.push(city);
  byRegnCd.set(city.ktoLDongRegnCd, list);
}
function citySlugFor(lDongRegnCd, lDongSignguCd) {
  const candidates = byRegnCd.get(lDongRegnCd);
  if (!candidates) return null;
  const specific = candidates.find(
    (c) => c.ktoLDongSignguCds.length && c.ktoLDongSignguCds.includes(lDongSignguCd)
  );
  if (specific) return specific.slug;
  const whole = candidates.find((c) => c.ktoLDongSignguCds.length === 0);
  return whole ? whole.slug : null;
}

// Mirrors region.njk's hand-chosen cityOrder — the exact city pills real pages render (and
// therefore the exact "Elsewhere" definition: any citySlug not in this list, per
// attraction-filters.js's knownAreaSlugs). Gangwon-do isn't in that map there either — it gets
// its own isGangwon branch with this same 4-city list.
const CITY_PILLS = {
  "gyeonggi-do": ["seoul", "incheon", "suwon", "seongnam"],
  "gyeongsang-do": ["busan", "daegu", "ulsan", "gyeongju"],
  "jeolla-do": ["jeonju", "gwangju", "yeosu", "suncheon"],
  "jeju-do": ["jeju-city", "seogwipo"],
  "chungcheong-do": ["daejeon", "sejong", "cheongju", "gongju"],
  "gangwon-do": ["sokcho", "gangneung", "chuncheon", "wonju"],
};

// contentTypeId/classify mirror attraction-fetch.mjs's own filters exactly (kept in sync by
// hand — small, stable, and duplicating them here is cheaper than exporting internals solely for
// a diagnostic script) — used only to explain *why* a raw item that WAS returned by KTO still got
// dropped before the final list.
const ALLOWED_CONTENT_TYPE_IDS = new Set([76, 78]);

const env = { KTO_API_KEY: process.env.KTO_API_KEY, KTO_DEV_CACHE: "1" };

const curatedStats = [];
const emptyCombos = [];
const missingDetail = [];
let totalCalls = 0;

for (const region of regions) {
  const { slug } = region;
  const codes = region.ktoLDongRegnCds;
  if (!codes.length) continue;

  totalCalls += codes.length * 3; // +1 more only in the rare broken-arrange case, untracked here
  // Every raw item KTO actually returned, before any filter — keyed by contentId, first sighting
  // wins (a dup across codes/buckets doesn't change the diagnosis). Costs nothing extra: this is
  // the same data fetchRegionAttractions already pulls, just not discarded after classifying.
  const rawByContentId = new Map();
  const { items, quotaExceeded } = await fetchRegionAttractions(slug, codes, env, citySlugFor, (raw, lclsSystm1) => {
    if (!rawByContentId.has(raw.contentid)) rawByContentId.set(raw.contentid, { raw, lclsSystm1 });
  });

  const curatedPicks = topAttractions.filter((a) => a.regionSlug === slug);
  if (quotaExceeded) {
    curatedStats.push({ region: slug, quotaExceeded: true, curatedTotal: curatedPicks.length });
    continue;
  }

  const liveIds = new Set(items.map((i) => i.contentId));
  const presentCount = curatedPicks.filter((p) => liveIds.has(p.contentId)).length;
  const hardMissing = curatedPicks.filter((p) => p.priority === "hard" && !liveIds.has(p.contentId));
  const softMissing = curatedPicks.filter((p) => p.priority !== "hard" && !liveIds.has(p.contentId));
  curatedStats.push({
    region: slug,
    liveItems: items.length,
    curatedTotal: curatedPicks.length,
    presentInLive: presentCount,
    injectedByBoost: hardMissing.length, // hard picks missing from live -> boostCuratedPicks injects these
    softDroppedNotInjected: softMissing.length, // soft picks never get injected, just not repositioned
  });
  for (const pick of [...hardMissing, ...softMissing]) {
    const sighting = rawByContentId.get(pick.contentId);
    let reason;
    if (!sighting) {
      reason = "not in KTO's top-300-by-view-count cut for any NA/VE/HS bucket on this pick's code";
    } else if (!ALLOWED_CONTENT_TYPE_IDS.has(Number(sighting.raw.contenttypeid))) {
      reason = `returned, but contentTypeId ${sighting.raw.contenttypeid} isn't 76/78`;
    } else if (classify(sighting.raw, sighting.lclsSystm1) === null) {
      reason = `returned under ${sighting.lclsSystm1}/${sighting.raw.lclsSystm2}/${sighting.raw.lclsSystm3 || "-"}, not in the curated whitelist`;
    } else if (!sighting.raw.firstimage && !sighting.raw.firstimage2) {
      reason = "returned and classified, but KTO sent no image for this record";
    } else {
      reason = "returned, classified, has an image — likely a licensing/normalize-step drop (unexpected, worth a closer look)";
    }
    missingDetail.push({
      region: slug,
      titleEn: pick.titleEn,
      contentId: pick.contentId,
      category: pick.category,
      priority: pick.priority,
      outcome: pick.priority === "hard" ? "injected by boost" : "dropped, not repositioned",
      reason,
    });
  }

  const pills = CITY_PILLS[slug] || [];
  const knownCities = new Set(pills);
  for (const city of [...pills, "elsewhere"]) {
    for (const category of ["nature", "culture"]) {
      const count = items.filter((item) => {
        const matchesArea = city === "elsewhere" ? !knownCities.has(item.citySlug) : item.citySlug === city;
        return matchesArea && item.category === category;
      }).length;
      if (count === 0) emptyCombos.push({ region: slug, city, category });
    }
  }
}

console.log(`Total live areaBasedList2 calls made: ${totalCalls} (+1 if any region's arrange probe broke)\n`);

console.log("=== Check 1: curated top-pick presence / injection ===");
console.table(curatedStats);

console.log("\n=== Check 1b: which picks were missing, and why ===");
if (missingDetail.length === 0) console.log("none — every curated pick was present in live results");
else console.table(missingDetail);

console.log("\n=== Check 2: empty filter combinations (city x category = 0 live items) ===");
if (emptyCombos.length === 0) console.log("none — every city x category combination has at least one item");
else console.table(emptyCombos);
