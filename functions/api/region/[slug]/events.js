// Live KTO call (architecture.md §5) — searchFestival2, fanned out across every lDongRegnCd code
// a region owns (one code failing only drops that code's items), deduped by contentId. Edge
// caching is disabled in production pending KTO's caching-approval form
// (notes/gallery-quota-compliance.md) — every page view is a live call. `eventStartDate` filters
// by start date only, so the query window starts well before "today" and `isUpcomingOrOngoing`
// drops anything that already ended. Some regions (e.g. Jeju) legitimately return zero — a
// designed empty state, not a bug. Falls back to `eventsSnapshot.json` when KTO_API_KEY isn't
// set — real festivals captured live on 2026-09-16, a point-in-time example set (unlike
// topAttractions.json, no ongoing boost/priority logic or quotaExceeded fallback here).
import eventsSnapshot from "../../../../src/_data/eventsSnapshot.json";
import { fetchKtoAllPages } from "../../lib/kto-client.mjs";
import { normalizeEvent, isUpcomingOrOngoing } from "../../lib/normalize.mjs";
import { isValidSlug, slugToLDongRegnCds } from "../../lib/region-map.mjs";

const CACHE_TTL_SECONDS = 4 * 60 * 60;
const QUERY_LOOKBACK_DAYS = 120;

function queryStartDate() {
  const d = new Date(Date.now() - QUERY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export async function onRequestGet({ params, env }) {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: `Unknown region slug: ${slug}` }, { status: 404 });
  }

  if (!env?.KTO_API_KEY) {
    return Response.json(eventsSnapshot.filter((e) => e.regionSlug === slug));
  }

  const codes = slugToLDongRegnCds(slug);
  const eventStartDate = queryStartDate();
  const pages = await Promise.allSettled(
    codes.map((lDongRegnCd) =>
      fetchKtoAllPages(
        "searchFestival2",
        { lDongRegnCd, eventStartDate },
        env,
        {
          numOfRows: 20,
          maxPages: 5 /*, cacheTtl: CACHE_TTL_SECONDS — disabled 2026-09, KTO requires a separate
          approval form for any caching (3-5 day review, too slow for the deadline); uncomment
          once approved (notes/gallery-quota-compliance.md) */,
        }
      )
    )
  );

  const byContentId = new Map();
  const now = new Date();
  for (const result of pages) {
    if (result.status !== "fulfilled" || result.value.degraded) continue;
    for (const raw of result.value.items) {
      if (!isUpcomingOrOngoing(raw, now)) continue;
      const event = normalizeEvent(raw);
      event.regionSlug = slug;
      byContentId.set(event.contentId, event);
    }
  }

  return Response.json([...byContentId.values()]);
}
