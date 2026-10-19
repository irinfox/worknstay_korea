// Pure attraction fan-out/classify/dedupe orchestration, split out of attractions.js so it has no
// JSON imports (unlike city-map.mjs/region-map.mjs, which read _data/*.json without import
// attributes — fine under Cloudflare's esbuild bundler, but unimportable from a plain Node script).
// `citySlugFor` is injected rather than imported directly so this module stays JSON-free and
// callable from both the live endpoint (functions/api/region/[slug]/attractions.js) and one-off
// investigation scripts (notes/attraction-gallery-report.md, "Final checks") without duplicating
// the fetch/classify logic itself.
import { fetchKtoAllPages } from "./kto-client.mjs";
import { normalizeAttraction } from "./normalize.mjs";

// contentTypeId is deliberately never passed to the KTO call below — see attractions.js's module
// comment. Redundant today: every code in RECLASSIFY_BY_LCLS_SYSTM2 already resolves to 76/78. Kept
// as free insurance against a future whitelist edit adding a mixed-type bucket (e.g. VE05/
// VE10/VE12 — not in the map below, and not all-76/78 like the rest of VE).
const ALLOWED_CONTENT_TYPE_IDS = new Set([76, 78]);
// arrange=P: view-count order, representative image required. Undocumented in the EngService2 spec
// (which only lists A/C/D/O/Q/R) but stable in practice and returns resultCode 0000 on every region
// code. The documented "Q" is *modified-date* order, not view-count — it surfaces whatever was last
// edited in the CMS (shop branches, recent listings) and buries stable landmark records, so it was
// the wrong default. See notes/attraction-gallery-report.md, "Historical background".
export const ARRANGE = "P";
export const FALLBACK_ARRANGE = "R"; // created-date order, image required — closest documented match to P
// If KTO ever silently drops support for the undocumented `P`, the realistic failure mode isn't an
// error or empty groups (per-bucket emptiness is normal — most lclsSystm2/3 sub-codes are
// legitimately sparse for a given region) — it's `P` reverting to some other order without telling
// us. `fetchRegionAttractions` below gates on that by treating the first code's VE call as the
// probe: if it comes back genuinely empty, every other call in the fan-out (and a refetch of that
// one bucket) switches to FALLBACK_ARRANGE — the only scenario that pays for a bucket twice; the
// common case (arrange=P working) pays for it once, same as any other bucket. Gate specifically on
// VE, never NA/HS — both have near-zero catalogs on some codes (notes/attraction-gallery-report.md,
// "Real per-code catalog sizes"), so an empty result there doesn't reliably mean `arrange=P` broke.
export const PROBE_LCLS_SYSTM1 = "VE";
// The 3 broad top-level buckets a region's attractions live under — collapses what used to be 7
// narrow, pre-filtered calls per code into 3 unfiltered ones, reclassified below
// (notes/attraction-gallery-report.md, "Query shape" through "Narrow vs broad": broadening matched
// or beat narrow's curated-pick presence on both codes tested, for fewer calls).
export const BROAD_LCLS_SYSTM1 = ["NA", "VE", "HS"];
// numOfRows costs zero extra API quota — KTO returns min(totalCount, numOfRows) for the same one
// call regardless of the value requested — so this is set comfortably above the largest catalog
// observed anywhere (244, VE on lDongRegnCd 11), not tuned per bucket
// (notes/attraction-gallery-report.md, "Real per-code catalog sizes"). maxPages: 1 is safe at this
// numOfRows for every bucket seen so far.
const ROWS_PER_GROUP = 250;

// --- Curation reference (editorial call, not derived from KTO docs) -------------------------
// Full sub-code review behind every reclassification rule below, including sub-codes that never
// reach a whitelist Set because their branch is taken "full" instead. Kept here so a new
// lclsSystm3 code KTO adds later under any of these lclsSystm2 buckets can be judged against
// these preferences instead of guessed at — "taken full" below means "worth revisiting if KTO
// adds a sub-code here," not "every sub-code was individually vetted."
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
// VE03 / river & lake parks (taken full, category: nature — see below): no sub-code exclusions
//   raised.
// VE04 (taken full): no sub-code exclusions raised.
// VE07 / museums & galleries (whitelisted, not full — see VE07_WHITELIST below): wanted —
//   VE070100, VE070500, VE070600. So-so — VE070200, VE070300. Not wanted — VE070400.
// NA (lclsSystm1, taken full — every NA01-NA05 sub-code reviewed): NA01 wanted —
//   NA010100, NA010200, NA010300, NA010400. Not wanted but low-volume enough to include anyway —
//   NA010500 (mineral springs, ~3 objects). NA02 wanted — NA020200, NA020500, NA020700,
//   NA020800, NA020900; included anyway — NA020100, NA020600 (near-empty nationally). NA03
//   (least settled of the group) wanted — NA030100, NA030400 (a single standout object),
//   NA030500 (several standout sites); included anyway for simplicity — NA030200, NA030300. NA04
//   and NA05 (coastal roads): no sub-code exclusions raised.
// -----------------------------------------------------------------------------------------------

// Every NA sub-code is taken as-is (see above) — a broad `lclsSystm1=NA` call needs no further
// lclsSystm2/3 check, unlike VE/HS below. VE03 (live-confirmed: Hangang/lake/city parks — Jamsil
// Hangang Park, Wolmi Park, Seoseoul Lake Park…) is a parks bucket, not a culture one, despite
// living under KTO's "VE" top code — grouped with nature here.
const VE07_WHITELIST = new Set(["VE070100", "VE070500", "VE070600"]);

// Reclassification table for broad VE/HS results, keyed by lclsSystm2 — done in the Function
// after one broad call, replacing what used to be 6 separate narrowed calls (the 7th being the
// NA branch, handled above). A VE/HS item whose lclsSystm2 isn't a key here is discarded: broadening the query pulls
// in sub-codes with zero curation history (e.g. VE02 shopping, HS02 monuments), and this table is
// what keeps the reclassified result identical in *intent* to the narrow calls it replaces — see
// the curation reference above for the full wanted/so-so/not-wanted breakdown behind each entry.
// VE07 stays limited to VE07_WHITELIST, not its full range: every city already has enough attractions.
const RECLASSIFY_BY_LCLS_SYSTM2 = new Map([
  ["VE03", { category: "nature" }],
  ["HS01", { category: "culture" }],
  ["HS03", { category: "culture", whitelist: new Set(["HS030100"]) }],
  ["VE01", { category: "culture" }],
  ["VE04", { category: "culture" }],
  ["VE07", { category: "culture", whitelist: VE07_WHITELIST }],
]);

export function classify(raw, lclsSystm1) {
  if (lclsSystm1 === "NA") return "nature";
  const rule = RECLASSIFY_BY_LCLS_SYSTM2.get(raw.lclsSystm2);
  if (!rule) return null;
  if (rule.whitelist && !rule.whitelist.has(raw.lclsSystm3)) return null;
  return rule.category;
}

function fetchBroadBucket(lDongRegnCd, lclsSystm1, arrange, env, trace) {
  return fetchKtoAllPages(
    "areaBasedList2",
    { lDongRegnCd, lclsSystm1, arrange },
    env,
    {
      numOfRows: ROWS_PER_GROUP,
      maxPages: 1,
      trace,
    }
  );
}

/**
 * `codes` is a region's full lDongRegnCd list — always non-empty for a valid region. `citySlugFor`
 * is injected (see module comment) — pass city-map.mjs's export from a Cloudflare Function, or a
 * script-local equivalent from a Node script. `onRawItem(raw, lclsSystm1)`, if given, is called
 * for every raw KTO item before any filter runs (content-type, classify, image) — a diagnostic
 * hook for investigation scripts that need to explain *why* a specific contentId didn't make the
 * final list (never returned by KTO at all vs. filtered out) without paying for a second live
 * fetch. The live endpoint never passes it; a no-op default keeps its behavior unchanged. `trace`
 * is the optional `{ retried }` out-param of kto-client's fetchKto.
 */
export async function fetchRegionAttractions(slug, codes, env, citySlugFor, onRawItem = () => {}, trace) {
  const groups = codes.flatMap((lDongRegnCd) =>
    BROAD_LCLS_SYSTM1.map((lclsSystm1) => ({ lDongRegnCd, lclsSystm1 }))
  );
  const probeIndex = groups.findIndex(
    (g) => g.lDongRegnCd === codes[0] && g.lclsSystm1 === PROBE_LCLS_SYSTM1
  );
  const probeGroup = groups[probeIndex];
  const otherGroups = groups.filter((_, i) => i !== probeIndex);

  const probeResult = await fetchBroadBucket(probeGroup.lDongRegnCd, probeGroup.lclsSystm1, ARRANGE, env, trace);
  const arrangeBroken = !probeResult.degraded && !probeResult.quotaExceeded && probeResult.items.length === 0;
  const arrange = arrangeBroken ? FALLBACK_ARRANGE : ARRANGE;

  const orderedGroups = [probeGroup, ...otherGroups];
  const settled = await Promise.allSettled([
    arrangeBroken
      ? fetchBroadBucket(probeGroup.lDongRegnCd, probeGroup.lclsSystm1, arrange, env, trace)
      : Promise.resolve(probeResult),
    ...otherGroups.map((g) => fetchBroadBucket(g.lDongRegnCd, g.lclsSystm1, arrange, env, trace)),
  ]);

  const byContentId = new Map();
  let quotaExceeded = false;
  let failed = false; // any slice failed for any reason, quota included
  settled.forEach((result, i) => {
    if (result.status !== "fulfilled") {
      failed = true;
      return;
    }
    if (result.value.quotaExceeded) quotaExceeded = true;
    if (result.value.degraded) {
      failed = true;
      return;
    }
    const { lclsSystm1 } = orderedGroups[i];
    for (const raw of result.value.items) {
      onRawItem(raw, lclsSystm1);
      if (!ALLOWED_CONTENT_TYPE_IDS.has(Number(raw.contenttypeid))) continue;
      const category = classify(raw, lclsSystm1);
      if (!category) continue;
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

  return { items: [...byContentId.values()], quotaExceeded, failed };
}
