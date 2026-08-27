// ROADMAP_TODO.md Phase 23 — region pages fetch live KTO data at request time from
// functions/api/region/[slug]/{attractions,events}.js, replacing the old build-time mock loop
// (architecture.md §5: KTO-sourced content can't be a git-committed/build-time snapshot).
// No-JS story: each mount's <noscript> fallback (region.njk) is the real degraded path — an
// honest "needs JavaScript" message with an outbound link, not fake/stale data. That's inert the
// moment JS runs, since init() below replaces the mount's innerHTML unconditionally.

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function renderAttractions(container, attractions) {
  if (!attractions.length) {
    container.innerHTML = `<li class="empty-state">No attractions currently listed for this region.</li>`;
    return;
  }
  container.innerHTML = attractions
    .map((a) => {
      // imageLicense is null for an unlicensed/missing image (normalize.mjs) — never render
      // those, per CLAUDE.md rule 4/architecture.md §5. object-fit: cover is the project's
      // existing default for both Type1/Type3 (hero.css) — Type3's cover-vs-contain question
      // stays open (ROADMAP Phase 29), unaffected by this.
      const media = a.imageLicense
        ? `<img class="attraction-card__media" src="${a.imageThumbUrl || a.imageUrl}" alt="${escapeHtml(a.titleEn)}" loading="lazy">`
        : `<div class="media-placeholder attraction-card__media" aria-hidden="true"></div>`;
      return `
        <li class="attraction-card">
          ${media}
          <h4>${escapeHtml(a.titleEn)}</h4>
          <p class="attraction-card__address">${escapeHtml(a.address)}</p>
        </li>`;
    })
    .join("");
}

const EVENTS_PREVIEW_CAP = 5;

function formatMonthHeader(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDateRange(start, end) {
  const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return start === end ? fmt(start) : `${fmt(start)}–${fmt(end)}`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKeyOf(isoDate) {
  return isoDate.slice(0, 7);
}

// `key` is "YYYY-MM" with a 1-indexed month, so passing it straight through as the (0-indexed)
// month argument to `new Date(y, m, 1)` already lands one month ahead — no +1 needed.
function nextMonthKey(key) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function renderEventItem(ev) {
  return `
    <li class="event-timeline__item">
      <span class="event-timeline__date">${formatDateRange(ev.startDate, ev.endDate)}</span>
      <span class="event-timeline__title">${escapeHtml(ev.titleEn)}</span>
      <span class="event-timeline__address">${escapeHtml(ev.address)}</span>
    </li>`;
}

function renderEventList(events, emptyMessage) {
  if (!events.length) return `<p class="empty-state">${emptyMessage}</p>`;
  return `<ul class="event-timeline__list">${events.map(renderEventItem).join("")}</ul>`;
}

// Split into Ongoing (already started, still running — searchFestival2's isUpcomingOrOngoing
// upstream already dropped anything fully ended) vs Upcoming (hasn't started yet), then group
// Upcoming by start month: this month gets a capped preview shown directly, every later month
// becomes a tab. Without this split, a handful of long-running festivals (e.g. a year-long one
// starting in January) grouped the whole list under stale early-year month headers even in
// August, and the flat list of every future month at once read as one huge wall of text.
function renderEventsTimeline(container, events) {
  if (!events.length) {
    container.innerHTML = `<p class="empty-state">No upcoming festivals or events currently listed for this region.</p>`;
    return;
  }

  const today = todayIso();
  const currentMonth = monthKeyOf(today);

  const ongoing = events
    .filter((e) => e.startDate && e.startDate <= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const upcoming = events
    .filter((e) => e.startDate && e.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const thisMonth = upcoming.filter((e) => monthKeyOf(e.startDate) === currentMonth);
  const later = upcoming.filter((e) => monthKeyOf(e.startDate) !== currentMonth);

  let laterHtml = "";
  if (later.length) {
    const byMonth = new Map();
    for (const ev of later) {
      const key = monthKeyOf(ev.startDate);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key).push(ev);
    }
    const lastMonth = [...byMonth.keys()].sort().at(-1);

    const months = [];
    for (let key = nextMonthKey(currentMonth); key <= lastMonth; key = nextMonthKey(key)) {
      months.push(key);
    }

    const tabsHtml = months
      .map((key, i) => {
        const count = (byMonth.get(key) || []).length;
        return `<button type="button" class="event-month-tabs__tab" role="tab" aria-selected="${i === 0}" data-month="${key}">${formatMonthHeader(`${key}-01`)} (${count})</button>`;
      })
      .join("");
    const panelsHtml = months
      .map((key, i) => {
        const monthEvents = (byMonth.get(key) || []).slice(0, EVENTS_PREVIEW_CAP);
        return `<div class="event-month-tabs__panel" role="tabpanel" data-month="${key}"${i === 0 ? "" : " hidden"}>
          ${renderEventList(monthEvents, "No month-specific events — check ongoing festivals &amp; events above.")}
        </div>`;
      })
      .join("");

    laterHtml = `
      <div class="event-month-tabs" role="tablist" aria-label="Events by month">${tabsHtml}</div>
      ${panelsHtml}`;
  }

  // <details>/<summary> — collapsed by default (a region can have dozens of events; Ongoing +
  // Upcoming shown open at once was taking up too much page height), native disclosure so it
  // still works with JS disabled once this container has content some other way.
  const html = `
    <details class="event-timeline__section">
      <summary class="event-timeline__heading">Ongoing (${ongoing.length})</summary>
      ${renderEventList(ongoing, "No festivals or events currently running.")}
    </details>
    <details class="event-timeline__section">
      <summary class="event-timeline__heading">Upcoming (${upcoming.length})</summary>
      <h5 class="event-timeline__subheading">This month</h5>
      ${renderEventList(
        thisMonth.slice(0, EVENTS_PREVIEW_CAP),
        "No new events starting this month — check ongoing festivals &amp; events above."
      )}
      ${laterHtml}
    </details>`;

  container.innerHTML = html;
  setupMonthTabs(container);
}

function setupMonthTabs(container) {
  const tabs = Array.from(container.querySelectorAll(".event-month-tabs__tab"));
  const panels = Array.from(container.querySelectorAll(".event-month-tabs__panel"));
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      panels.forEach((p) => {
        p.hidden = p.dataset.month !== tab.dataset.month;
      });
    });
  });
}

export function init() {
  const attractionsMount = document.querySelector("[data-region-attractions]");
  const eventsMount = document.querySelector("[data-region-events]");
  if (!attractionsMount && !eventsMount) return;

  const slug = (attractionsMount || eventsMount).dataset.regionSlug;

  if (attractionsMount) {
    attractionsMount.innerHTML = `<li class="region-loading">Loading live attraction data…</li>`;
    fetchJson(`/api/region/${slug}/attractions`).then((items) => renderAttractions(attractionsMount, items));
  }
  if (eventsMount) {
    eventsMount.innerHTML = `<p class="region-loading">Loading live festival/event data…</p>`;
    fetchJson(`/api/region/${slug}/events`).then((items) => renderEventsTimeline(eventsMount, items));
  }
}
