// Live KTO call (architecture.md §5) — areaBasedList2, filtered by KTO's newer lclsSystm1/2/3
// classification instead of the retired cat1/cat2/cat3 tree (the old tree under-surfaced each
// region's genuinely popular sites, which is why this was rewritten). lclsSystm spans content
// types on its own — live-confirmed querying by lclsSystm1/2/3 alone returns a mix of
// contentTypeId 76 (tourist attraction) and 78 (cultural facility) records, no per-content-type
// call needed. Each group is fanned out across every lDongRegnCd code a region owns
// (Promise.allSettled: one code/group failing only drops that slice, not the whole region),
// deduped by contentId, edge-cached ~24h (near-static content). Falls back to the Phase-8 mock
// fixture when KTO_API_KEY isn't set (local dev without a key), so the response shape callers
// see never changes: always `{ items: Attraction[], quotaExceeded: boolean }`. `quotaExceeded`
// distinguishes "KTO's daily call quota is gone for the account" from a genuinely empty region,
// so the front end can show an honest message instead of "no attractions here" when there
// really are some, we just can't fetch them today (kto-client.mjs).
import mockAttractions from "../../../../src/_data/mock/attractions.json";
import { fetchKtoAllPages } from "../../lib/kto-client.mjs";
import { normalizeAttraction } from "../../lib/normalize.mjs";
import { isValidSlug, slugToLDongRegnCds } from "../../lib/region-map.mjs";
import { citySlugFor } from "../../lib/city-map.mjs";

// contentTypeId is deliberately never passed to the KTO call below — see the module comment.
// This is a defensive post-filter only, in case some other content type (restaurant, lodging,
// shopping) ever carries one of the lclsSystm codes below.
const ALLOWED_CONTENT_TYPE_IDS = new Set([76, 78]);
// arrange=P: view-count order, representative image required. Undocumented in the EngService2
// spec (which only lists A/C/D/O/Q/R) but stable in practice and returns resultCode 0000 on
// every region code. The documented "Q" is *modified-date* order, not view-count — it surfaces
// whatever was last edited in the CMS (shop branches, recent listings) and buries stable
// landmark records, so it was the wrong default. See notes/attraction-feed-curation.md.
const ARRANGE = "P";
// If KTO ever silently drops support for the undocumented `P`, the realistic failure mode isn't
// an error or empty groups (per-group emptiness is normal — most lclsSystm3 sub-codes are
// legitimately sparse for a given region) — it's `P` reverting to some other order without
// telling us. That can't be detected per group. What CAN be checked cheaply: a whole region
// coming back with zero attractions across every group combined is implausible under normal
// operation, so treat that as a signal something's wrong with `P` and retry the whole region
// once with a documented, image-required arrange value before giving up.
const FALLBACK_ARRANGE = "R"; // created-date order, image required — closest documented match to P
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
        { numOfRows: ROWS_PER_GROUP, maxPages: 1, cacheTtl: CACHE_TTL_SECONDS }
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

  if (!env?.KTO_API_KEY) {
    return Response.json({ items: mockAttractions.filter((a) => a.regionSlug === slug), quotaExceeded: false });
  }

  const codes = slugToLDongRegnCds(slug);
  const groups = codes.flatMap(fetchGroups);
  let { items, quotaExceeded } = await fetchRegionAttractions(slug, groups, ARRANGE, env);
  // Retrying with a different arrange can't help when the account's whole daily quota is gone —
  // every group would fail the same way, and the retry would just double an already-futile round
  // of calls (see architecture.md §5 / AutoMem feedback_kto_call_budget).
  if (items.length === 0 && !quotaExceeded) {
    ({ items, quotaExceeded } = await fetchRegionAttractions(slug, groups, FALLBACK_ARRANGE, env));
  }

  const priority = CATEGORY_PRIORITY[slug];
  if (priority) {
    const rank = (category) => (category === priority ? 0 : 1);
    items.sort((a, b) => rank(a.category) - rank(b.category));
  }

  return Response.json({ items, quotaExceeded });
}
