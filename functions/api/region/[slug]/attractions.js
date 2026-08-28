// Live KTO call (architecture.md §5) — areaBasedList2, fanned out across every lDongRegnCd code
// a region owns (Promise.allSettled: one code failing only drops that code's items, not the
// whole region), deduped by contentId, edge-cached ~24h (near-static content). Falls back to the
// Phase-8 mock fixture when KTO_API_KEY isn't set (local dev without a key), so the response
// shape callers see never changes.
import mockAttractions from "../../../../src/_data/mock/attractions.json";
import { fetchKtoAllPages } from "../../lib/kto-client.mjs";
import { normalizeAttraction } from "../../lib/normalize.mjs";
import { isValidSlug, slugToLDongRegnCds } from "../../lib/region-map.mjs";

const CONTENT_TYPE_ID_ATTRACTION = 76; // v4 renumbered content types (architecture.md §5)
// arrange=P: view-count order, representative image required. Undocumented in the EngService2
// spec (which only lists A/C/D/O/Q/R) but stable in practice and returns resultCode 0000 on
// every region code. The documented "Q" is *modified-date* order, not view-count — it surfaces
// whatever was last edited in the CMS (shop branches, recent listings) and buries stable
// landmark records, so it was the wrong default. See notes/attraction-feed-curation.md.
const ARRANGE = "P";
// KTO files medical-tourism venues (plastic-surgery clinics, dental/oriental hospitals,
// medical-tourism agencies) under contentTypeId 76. Sort order does NOT sink them — they're
// removed here. cat3 "A02020500" is KTO's 의료관광 category and is 100% medical venues across
// all six region feeds; the name regex is the fallback for the few records that carry no
// category code at all (verified against live data).
const MEDICAL_CAT3 = "A02020500";
const MEDICAL_NAME_RE =
  /병원|의원|한의원|성형외과|치과|피부과|안과|clinic|hospital|plastic surgery|dermatolog/i;
const isMedicalVenue = (raw) =>
  raw.cat3 === MEDICAL_CAT3 || MEDICAL_NAME_RE.test(raw.title || "");
const CACHE_TTL_SECONDS = 24 * 60 * 60;
// A region page shows a representative sample, not an exhaustive attraction database (a 3-code
// region fully paginated returns 100s of items — too many for the horizontal scroll-snap card
// list, and needless KTO call volume). One page per code, deduped, is enough variety.
const ROWS_PER_CODE = 15;

export async function onRequestGet({ params, env }) {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: `Unknown region slug: ${slug}` }, { status: 404 });
  }

  if (!env?.KTO_API_KEY) {
    return Response.json(mockAttractions.filter((a) => a.regionSlug === slug));
  }

  const codes = slugToLDongRegnCds(slug);
  const pages = await Promise.allSettled(
    codes.map((lDongRegnCd) =>
      fetchKtoAllPages(
        "areaBasedList2",
        { contentTypeId: CONTENT_TYPE_ID_ATTRACTION, lDongRegnCd, arrange: ARRANGE },
        env,
        { numOfRows: ROWS_PER_CODE, maxPages: 1, cacheTtl: CACHE_TTL_SECONDS }
      )
    )
  );

  const byContentId = new Map();
  for (const result of pages) {
    if (result.status !== "fulfilled" || result.value.degraded) continue;
    for (const raw of result.value.items) {
      if (isMedicalVenue(raw)) continue;
      const attraction = normalizeAttraction(raw);
      attraction.regionSlug = slug;
      byContentId.set(attraction.contentId, attraction);
    }
  }

  return Response.json([...byContentId.values()]);
}
