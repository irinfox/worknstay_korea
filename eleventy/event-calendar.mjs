// Renders a region's Event[] as one or more month-grid calendars (one grid per distinct
// calendar month any event touches, chronological order) rather than a plain upcoming-list —
// event days are marked in the grid, with a legend underneath giving the title/address.
// Zero-event regions (e.g. Jeju-do, architecture.md §5) get one blank grid for the current
// month plus a short note — a designed empty state, not a bug.
//
// Plain JS, no dependency, mirrors the existing inlineSvg shortcode pattern.

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Every {year, month} (month is 0-indexed) an event's [startDate, endDate] range overlaps.
function monthsTouchedByEvent(event) {
  const start = new Date(`${event.startDate}T00:00:00`);
  const end = new Date(`${event.endDate}T00:00:00`);
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endCursor = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endCursor) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function renderMonthGrid(year, month, monthEvents) {
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const numDays = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const dayEvents = {};
  for (const ev of monthEvents) {
    const start = new Date(`${ev.startDate}T00:00:00`);
    const end = new Date(`${ev.endDate}T00:00:00`);
    for (let d = 1; d <= numDays; d++) {
      const cur = new Date(year, month, d);
      if (cur >= start && cur <= end) {
        (dayEvents[d] = dayEvents[d] || []).push(ev);
      }
    }
  }

  let cells = "";
  for (let i = 0; i < firstWeekday; i++) {
    cells += `<span class="event-calendar__cell event-calendar__cell--empty" aria-hidden="true"></span>`;
  }
  for (let d = 1; d <= numDays; d++) {
    const evs = dayEvents[d];
    if (evs && evs.length) {
      const label = escapeHtml(evs.map((e) => e.titleEn).join(", "));
      cells += `<span class="event-calendar__cell event-calendar__cell--event" title="${label}">${d}</span>`;
    } else {
      cells += `<span class="event-calendar__cell">${d}</span>`;
    }
  }

  const legendItems = monthEvents
    .map((ev) => {
      const range =
        ev.startDate === ev.endDate
          ? formatDate(ev.startDate)
          : `${formatDate(ev.startDate)}–${formatDate(ev.endDate)}`;
      return `<li><strong>${range}</strong> — ${escapeHtml(ev.titleEn)}<br><span class="event-calendar__legend-address">${escapeHtml(ev.address)}</span></li>`;
    })
    .join("");

  return `
    <div class="event-calendar__month">
      <h4 class="event-calendar__month-label">${monthLabel}</h4>
      <div class="event-calendar__weekdays" aria-hidden="true">
        <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
      </div>
      <div class="event-calendar__grid">${cells}</div>
      ${legendItems ? `<ul class="event-calendar__legend">${legendItems}</ul>` : ""}
    </div>
  `;
}

const PROVENANCE_NOTE =
  '<p class="data-provenance">Data from the Korea Tourism Organization (KTO) OpenAPI — currently mock data, live via the proxy layer in a later phase.</p>';

export function renderEventCalendar(events) {
  if (!events || events.length === 0) {
    const today = new Date();
    const grid = renderMonthGrid(today.getFullYear(), today.getMonth(), []);
    return `<div class="event-calendar">${grid}</div>
      <p class="empty-state event-calendar__empty-note">No upcoming festivals or events currently listed for this region.</p>
      ${PROVENANCE_NOTE}`;
  }

  const monthsMap = new Map();
  for (const ev of events) {
    for (const { year, month } of monthsTouchedByEvent(ev)) {
      const key = `${year}-${month}`;
      if (!monthsMap.has(key)) monthsMap.set(key, { year, month, events: [] });
      monthsMap.get(key).events.push(ev);
    }
  }
  const sortedMonths = Array.from(monthsMap.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month
  );
  const monthsHtml = sortedMonths.map((m) => renderMonthGrid(m.year, m.month, m.events)).join("");

  return `<div class="event-calendar">${monthsHtml}</div>
    ${PROVENANCE_NOTE}`;
}
