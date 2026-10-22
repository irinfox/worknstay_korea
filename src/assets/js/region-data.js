// Region pages fetch live KTO data client-side (never a git-committed snapshot). The mounts'
// <noscript> fallbacks (region.njk) cover no-JS; init() replaces them when JS runs.
import { renderAttractions } from "./attractions.js";
import { renderEventsTimeline } from "./events.js";
import { pageLoadHeaders } from "./tracker.js";

// Always resolves to an object; any failure is { items: [], failed: true }.
async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: pageLoadHeaders() });
    if (!res.ok) return { items: [], failed: true };
    return await res.json();
  } catch {
    return { items: [], failed: true };
  }
}

export function init() {
  const attractionsMount = document.querySelector("[data-region-attractions]");
  const eventsMount = document.querySelector("[data-region-events]");
  if (!attractionsMount && !eventsMount) return;

  const slug = (attractionsMount || eventsMount).dataset.regionSlug;

  if (attractionsMount) {
    attractionsMount.innerHTML = `<li class="region-loading">Loading live attraction data…</li>`;
    fetchJson(`/api/region/${slug}/attractions`).then((data) => renderAttractions(attractionsMount, data));
  }
  if (eventsMount) {
    eventsMount.innerHTML = `<p class="region-loading">Loading live festival/event data…</p>`;
    fetchJson(`/api/region/${slug}/events`).then((data) => renderEventsTimeline(eventsMount, data));
  }
}
