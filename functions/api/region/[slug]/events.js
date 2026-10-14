// Live KTO call: searchFestival2, fanned out across every lDongRegnCd code a region owns (one code
// failing drops only its items), deduped by contentId. No caching — every view is a live call.
// `eventStartDate` = today: KTO already excludes ended festivals that way. Zero results (e.g. Jeju)
// is a designed empty state. Falls back to `eventsSnapshot.json` (point-in-time capture) when
// KTO_API_KEY isn't set. On quota-exceeded, items are dropped rather than served from the
// snapshot, which could show an ended festival as live; `quotaExceeded` drives the front-end message.
import eventsSnapshot from "../../../../src/_data/eventsSnapshot.json";
import { fetchKtoAllPages } from "../../lib/kto-client.mjs";
import { normalizeEvent } from "../../lib/normalize.mjs";
import { isValidSlug, slugToLDongRegnCds } from "../../lib/region-map.mjs";

// Today's date in Korea (YYYYMMDD) — Workers run in UTC, which is a day behind KST until 09:00.
function queryStartDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()).replaceAll("-", "");
}

export async function onRequestGet({ params, env }) {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: `Unknown region slug: ${slug}` }, { status: 404 });
  }

  if (!env?.KTO_API_KEY) {
    return Response.json({
      items: eventsSnapshot.items.filter((e) => e.regionSlug === slug),
      quotaExceeded: false,
      snapshotDate: eventsSnapshot.capturedAt,
      fallback: true, // served from the saved snapshot, not live KTO — the page says so
    });
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
          // 100 rows in maxPages: 1 — highest real count seen across a full region/date sweep was
          // 59; one call now covers it instead of paging (attraction-fetch.mjs's same reasoning:
          // more rows per call is free, a second page is a whole extra live call).
          numOfRows: 100,
          maxPages: 1,
        }
      )
    )
  );

  const byContentId = new Map();
  let quotaExceeded = false;
  for (const result of pages) {
    if (result.status !== "fulfilled") continue;
    if (result.value.quotaExceeded) quotaExceeded = true;
    if (result.value.degraded) continue;
    for (const raw of result.value.items) {
      const event = normalizeEvent(raw);
      event.regionSlug = slug;
      byContentId.set(event.contentId, event);
    }
  }

  const items = quotaExceeded ? [] : [...byContentId.values()];
  return Response.json({ items, quotaExceeded });
}
