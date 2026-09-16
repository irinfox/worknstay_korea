// Live KTO call (architecture.md §5) — searchFestival2, fanned out across every lDongRegnCd code
// a region owns (one code failing only drops that code's items), deduped by contentId. Edge
// caching is disabled in production pending KTO's caching-approval form
// (notes/attraction-gallery-report.md) — every page view is a live call. `eventStartDate` filters
// by start date only, so the query window starts well before "today" and `isUpcomingOrOngoing`
// drops anything that already ended. Some regions (e.g. Jeju) legitimately return zero — a
// designed empty state, not a bug. Falls back to `eventsSnapshot.json` when KTO_API_KEY isn't
// set — real festivals captured live on 2026-09-16, a point-in-time example set (unlike
// topAttractions.json, no ongoing boost/priority logic here). On a real quota-exceeded response,
// items are dropped entirely rather than falling back to eventsSnapshot — that snapshot is a
// point-in-time capture, not a maintained curated set, so serving it here risks presenting an
// already-ended festival as live; `quotaExceeded` lets the front end show an honest "check back
// tomorrow" message instead.
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
    return Response.json({ items: eventsSnapshot.filter((e) => e.regionSlug === slug), quotaExceeded: false });
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
          once approved (notes/attraction-gallery-report.md) */,
        }
      )
    )
  );

  const byContentId = new Map();
  let quotaExceeded = false;
  const now = new Date();
  for (const result of pages) {
    if (result.status !== "fulfilled") continue;
    if (result.value.quotaExceeded) quotaExceeded = true;
    if (result.value.degraded) continue;
    for (const raw of result.value.items) {
      if (!isUpcomingOrOngoing(raw, now)) continue;
      const event = normalizeEvent(raw);
      event.regionSlug = slug;
      byContentId.set(event.contentId, event);
    }
  }

  const items = quotaExceeded ? [] : [...byContentId.values()];
  return Response.json({ items, quotaExceeded });
}
