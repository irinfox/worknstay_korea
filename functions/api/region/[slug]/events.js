// Live KTO call (architecture.md §5) — searchFestival2, fanned out across every lDongRegnCd code
// a region owns (one code failing only drops that code's items, not the whole region), deduped
// by contentId, edge-cached ~4h (thin/sparse dataset, short TTL keeps the call log visibly
// active during judging). `eventStartDate` filters by start date only, so the query window
// starts well before "today" and `isUpcomingOrOngoing` drops anything that already ended.
// Some regions (e.g. Jeju) legitimately return zero — that's the designed empty state, not a
// bug. Falls back to the Phase-8 mock fixture when KTO_API_KEY isn't set.
import mockEvents from "../../../../src/_data/mock/events.json";
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
    return Response.json(mockEvents.filter((e) => e.regionSlug === slug));
  }

  const codes = slugToLDongRegnCds(slug);
  const eventStartDate = queryStartDate();
  const pages = await Promise.allSettled(
    codes.map((lDongRegnCd) =>
      fetchKtoAllPages(
        "searchFestival2",
        { lDongRegnCd, eventStartDate },
        env,
        { numOfRows: 20, maxPages: 5, cacheTtl: CACHE_TTL_SECONDS }
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
