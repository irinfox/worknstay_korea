// Live KTO call (architecture.md §5) — detailImage2 takes a single contentId, not a region code,
// so this endpoint first seeds a handful of attraction contentIds via areaBasedList2 (fanned out
// across the region's lDongRegnCd codes, one page each) and then calls detailImage2 per seed
// (Promise.allSettled — one seed failing only drops that seed's images). Edge-cached ~14d (photo
// sets change rarely). Unlicensed images are dropped by normalizeGalleryImage itself. Falls back
// to the Phase-8 mock fixture when KTO_API_KEY isn't set.
import mockGallery from "../../../../src/_data/mock/gallery.json";
import { fetchKto } from "../../lib/kto-client.mjs";
import { normalizeAttraction, normalizeGalleryImage } from "../../lib/normalize.mjs";
import { isValidSlug, slugToLDongRegnCds } from "../../lib/region-map.mjs";

const CONTENT_TYPE_ID_ATTRACTION = 76;
const CACHE_TTL_SECONDS = 14 * 24 * 60 * 60;
const SEED_CANDIDATES_PER_CODE = 10; // areaBasedList2's default sort is alphabetical, not
// image-first, so over-fetch per code and then filter to licensed-image attractions below —
// otherwise a code's first 3 alphabetically are often unlicensed businesses (clinics, shops)
// with no chance of a detailImage2 gallery.
const MAX_SEED_ATTRACTIONS = 6;

export async function onRequestGet({ params, env }) {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: `Unknown region slug: ${slug}` }, { status: 404 });
  }

  if (!env?.KTO_API_KEY) {
    return Response.json(mockGallery.filter((g) => g.regionSlug === slug));
  }

  const codes = slugToLDongRegnCds(slug);
  const seedPages = await Promise.allSettled(
    codes.map((lDongRegnCd) =>
      fetchKto(
        "areaBasedList2",
        { contentTypeId: CONTENT_TYPE_ID_ATTRACTION, lDongRegnCd, numOfRows: SEED_CANDIDATES_PER_CODE, pageNo: 1 },
        env,
        { cacheTtl: CACHE_TTL_SECONDS }
      )
    )
  );

  const seeds = [];
  for (const result of seedPages) {
    if (result.status !== "fulfilled" || result.value.degraded) continue;
    for (const raw of result.value.items) {
      const attraction = normalizeAttraction(raw);
      if (attraction.imageLicense) seeds.push(attraction);
    }
  }

  const galleryPages = await Promise.allSettled(
    seeds.slice(0, MAX_SEED_ATTRACTIONS).map((attraction) =>
      fetchKto("detailImage2", { contentId: attraction.contentId, numOfRows: 12, pageNo: 1 }, env, {
        cacheTtl: CACHE_TTL_SECONDS,
      }).then((page) => ({ attraction, page }))
    )
  );

  const images = [];
  for (const result of galleryPages) {
    if (result.status !== "fulfilled" || result.value.page.degraded) continue;
    const { attraction, page } = result.value;
    for (const raw of page.items) {
      const image = normalizeGalleryImage(raw, attraction.titleEn);
      if (!image) continue;
      image.regionSlug = slug;
      images.push(image);
    }
  }

  return Response.json(images);
}
