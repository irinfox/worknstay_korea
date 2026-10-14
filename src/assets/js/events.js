import { escapeHtml, pinIcon } from "./html.js";
import { setupAddressCopy } from "./copy.js";

const EVENTS_PAGE_SIZE = 5;
const EVENTS_MIN_ROWS = 3;

const PIN_ICON = pinIcon("event-place__icon");
const COPY_ICON = `<svg class="event-place__copy-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10 1H4a2 2 0 0 0-2 2v7h2V3h6V1Zm2 3H8a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/></svg>`;

// Source lines keep their live text in the markup; when the endpoint served the saved set
// instead, swap in the fallback text, and restore the live text on every other render.
function setProvenance(el, fallbackText, fallback) {
  if (!el) return;
  if (!el.dataset.liveText) el.dataset.liveText = el.textContent;
  el.textContent = fallback ? fallbackText : el.dataset.liveText;
}

// Today's date in Korea, not the visitor's timezone — events.js queries KTO with the same date.
function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function monthKeyOf(isoDate) {
  return isoDate.slice(0, 7);
}

// Full month name for the month sub-tabs ("October · 3") and the pager's "1–5 of 17 in October"
// range line; appends the year only when it isn't the current one so a same-year list stays
// compact but a cross-year one stays unambiguous ("January 2027 · 1").
function monthLabelLong(key) {
  const [y, m] = key.split("-").map(Number);
  const mon = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" });
  return y === Number(todayIso().slice(0, 4)) ? mon : `${mon} ${y}`;
}

// Full, screen-reader-facing date range (the visible calendar chip is aria-hidden).
function readableRange(start, end) {
  const opts = { month: "long", day: "numeric", year: "numeric" };
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en-US", opts);
  if (start === end) return s;
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en-US", opts);
  return `${s} to ${e}`;
}

// The visible date, as one plain orange line (design reference 5b): "4 – 13 SEP" for a
// same-month span, "4 APR – 27 NOV" across months, "9 SEP" for a single day. The full,
// screen-reader-facing range sits in an adjacent .sr-only span.
function dateRangeShort(ev) {
  const s = new Date(`${ev.startDate}T00:00:00`);
  const e = new Date(`${ev.endDate}T00:00:00`);
  const thisYear = Number(todayIso().slice(0, 4));
  const NB = "\u00a0"; // each date stays whole; only a cross-month range may wrap, after the dash
  const MON = (d) => d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  // Any date outside the current year carries its year, so next year's festivals aren't ambiguous.
  const withYear = (d) =>
    `${d.getDate()}${NB}${MON(d)}${d.getFullYear() === thisYear ? "" : `${NB}${d.getFullYear()}`}`;
  if (ev.startDate === ev.endDate) return withYear(s);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth())
    return `${s.getDate()}${NB}–${NB}${withYear(e)}`; // same month: never breaks
  return `${withYear(s)}${NB}– ${withYear(e)}`;
}

// Ongoing-panel badge: multi-month festivals are "Long-term", everything else is "This month".
// Emitted in two slots (event-timeline.css shows exactly one per breakpoint via display:none):
// `name` sits inline after the event name (≥600px, design-ref placement), `date` rides the date
// line (<600px, where the stacked card's name row has no spare width). Neither is aria-hidden —
// a screen reader skips the display:none one and announces only whichever is shown.
function ongoingBadge(ev, slot) {
  const long = monthKeyOf(ev.startDate) !== monthKeyOf(ev.endDate);
  const kind = long ? "long" : "month";
  const text = long ? "long-term" : "this month";
  return ` <span class="event-card__badge event-card__badge--${kind} event-card__badge--on-${slot}">${text}</span>`;
}

const METROS = ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Ulsan", "Sejong"];
const KO_METRO = {
  서울: "Seoul", 부산: "Busan", 인천: "Incheon", 대구: "Daegu",
  대전: "Daejeon", 광주: "Gwangju", 울산: "Ulsan", 세종: "Sejong",
};

// KTO addresses run fine-to-coarse and come romanized ("320 Jeongjo-ro, Paldal-gu, Suwon-si,
// Gyeonggi-do") or — on many searchFestival2 records, despite it being the English service —
// Korean ("경기도 안성시 보개면 …", "서울특별시 종로구 …"). Collapse either to the city name: a
// "-si"/"시" city or "-gun"/"군" county, a metro (romanized where we can), else a "-gu"/"구"
// district, else the first token. Korean city names stay in Hangul (no romanizer in the stack);
// the full address is always on the copy control. Tokenized on commas *and* spaces.
function cityFromAddress(addr) {
  if (!addr) return "";
  const tokens = addr.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
  const enSi = tokens.find((t) => /-si$/i.test(t));
  if (enSi) return enSi.replace(/-si$/i, "");
  const enGun = tokens.find((t) => /-gun$/i.test(t));
  if (enGun) return enGun.replace(/-gun$/i, "");
  const koMetro = tokens.find((t) => /(특별시|광역시|특별자치시)$/.test(t));
  if (koMetro) {
    const stem = koMetro.replace(/(특별자치시|특별시|광역시)$/, "");
    return KO_METRO[stem] || stem;
  }
  const koCity = tokens.find((t) => /[가-힣]{2,}(시|군)$/.test(t));
  if (koCity) return koCity.replace(/(시|군)$/, "");
  const metro = tokens.find((t) => METROS.includes(t));
  if (metro) return metro;
  const enGu = tokens.find((t) => /-gu$/i.test(t));
  if (enGu) return enGu.replace(/-gu$/i, "");
  const koGu = tokens.find((t) => /[가-힣]{2,}구$/.test(t));
  if (koGu) return koGu.replace(/구$/, "");
  return tokens[0] || addr;
}

function renderEventCard(ev, { badge = false } = {}) {
  const addr = escapeHtml(ev.address || "");
  const place = ev.address
    ? `<span class="event-place" title="${addr}">
         ${PIN_ICON}<span class="event-place__city">${escapeHtml(cityFromAddress(ev.address))}</span>
         <button type="button" class="event-place__copy" data-address="${addr}"
           aria-label="Copy full address" title="Copy full address">${COPY_ICON}<span class="event-place__copy-label" data-default="Copy full address">Copy full address</span></button>
         <span class="event-place__status" role="status" aria-live="polite"></span>
       </span>`
    : "";
  // The status chip rides the date line (immediately after the date range), not the name —
  // dates are short and uniform so it lands consistently; the name then owns its own line.
  return `
    <li class="event-card">
      <span class="event-card__date">
        <span class="sr-only">${readableRange(ev.startDate, ev.endDate)}</span>
        <span class="event-card__daterange" aria-hidden="true">${dateRangeShort(ev)}</span>${badge ? ongoingBadge(ev, "date") : ""}
      </span>
      <div class="event-card__body">
        <p class="event-card__title">${escapeHtml(ev.titleEn)}${badge ? ongoingBadge(ev, "name") : ""}</p>
        ${place}
      </div>
    </li>`;
}

// A card list, plus a pager when it runs past one page. Every item is in the DOM; the pager just
// toggles `hidden` on the out-of-page ones (setupPagers), so it degrades to a full list if the
// pager JS never runs. `opts.rangeContext` (e.g. " in October" or " running now") is appended
// to the "1–5 of 17" range line under the pager.
function renderCardList(events, opts = {}) {
  const ul = `<ul class="event-list">${events.map((e) => renderEventCard(e, opts)).join("")}</ul>`;
  if (events.length <= EVENTS_PAGE_SIZE) return `<div class="event-list-wrap">${ul}</div>`;
  const pages = Math.ceil(events.length / EVENTS_PAGE_SIZE);
  return `
    <div class="event-list-wrap" data-paged data-range-suffix="${escapeHtml(opts.rangeContext || "")}">
      ${ul}
      <div class="event-pager">
        <button type="button" class="event-pager__btn" data-dir="-1" aria-label="Previous events">‹</button>
        <span class="event-pager__status">1 / ${pages}</span>
        <button type="button" class="event-pager__btn" data-dir="1" aria-label="More events">›</button>
        <span class="event-pager__range" data-range aria-live="polite"></span>
      </div>
    </div>`;
}

function buildUpcomingPanel(later) {
  const byMonth = new Map();
  for (const ev of later) {
    const key = monthKeyOf(ev.startDate);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(ev);
  }
  const keys = [...byMonth.keys()].sort();

  // One month → skip the month-tab strip, it'd just be a single chip.
  if (keys.length === 1) {
    return `<div class="event-monthpanel">${renderCardList(byMonth.get(keys[0]))}</div>`;
  }

  const tabs = keys
    .map(
      (key, i) =>
        `<button type="button" role="tab" class="event-months__tab" aria-selected="${i === 0}"
           tabindex="${i === 0 ? 0 : -1}" data-month="${key}">${monthLabelLong(key)} · ${byMonth.get(key).length}</button>`
    )
    .join("");
  const panels = keys
    .map(
      (key, i) =>
        `<div class="event-monthpanel" role="tabpanel" data-month="${key}"${i === 0 ? "" : " hidden"}>
           ${renderCardList(byMonth.get(key))}
         </div>`
    )
    .join("");
  return `<div class="event-months" role="tablist" aria-label="Upcoming events by month">${tabs}</div>${panels}`;
}

const EVENTS_FAILED_TEXT = "Couldn't load events, try again later.";
const EVENTS_QUOTA_EXCEEDED_TEXT = "Events are temporarily unavailable, check back tomorrow.";
// `liveText`: the server-rendered "Source: …." line (from sources.json); the fallback reuses it.
const eventsProvenanceFallback = (isoDate, liveText) => {
  const when = new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  const source = liveText.replace(/\.$/, "");
  return `${source}, saved sample from ${when}. Live data currently unavailable.`;
};

// Ongoing tab = "what's on around now": festivals currently running (often multi-month) plus
// ones that start later this calendar month, as one list — each card carries a "Long-term" /
// "This month" badge. Upcoming tab = strictly later months, grouped into month sub-tabs. The tab
// strip and the "no events" message only appear when they're actually warranted (see cases).
export function renderEventsTimeline(container, data) {
  const quotaExceeded = Boolean(data.quotaExceeded);
  const failed = Boolean(data.failed);
  // fallback: events came from the saved snapshot (no KTO key), so the list may be out of date.
  const fallback = Boolean(data.fallback);
  // The subtitle is a small-caption "sub" line meant to sit under a live section — misleading
  // here ("Ongoing now...") and visually wrong (region-page.css tightens the H2 gap for it).
  // Hide it outright and put the real message in the body instead, same .empty-state treatment
  // the costs column's own "no data" text uses, so both fallback states read identically.
  const subtitle = document.querySelector("[data-events-subtitle]");
  if (subtitle) {
    subtitle.hidden = quotaExceeded || failed;
  }
  // Attributing an empty result to KTO is only honest when KTO was actually reached — a real
  // zero-events region (e.g. Jeju) got a real answer and keeps the credit; a quota-exceeded
  // response never reached KTO at all this time, so hide it rather than cite a source for data
  // that isn't there.
  const provenance = document.querySelector("[data-events-provenance]");
  if (provenance) provenance.hidden = quotaExceeded || failed;
  const liveText = provenance?.dataset.liveText || provenance?.textContent || "";
  const fallbackText = fallback ? eventsProvenanceFallback(data.snapshotDate, liveText) : "";
  setProvenance(provenance, fallbackText, fallback);
  if (quotaExceeded || failed) {
    container.innerHTML = `<p class="empty-state">${failed ? EVENTS_FAILED_TEXT : EVENTS_QUOTA_EXCEEDED_TEXT}</p>`;
    return;
  }

  const events = data.items || [];
  const today = todayIso();
  const currentMonth = monthKeyOf(today);

  const dated = events.filter((e) => e.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate));
  // events.js queries KTO with eventStartDate=today, which already excludes ended festivals
  // (live-verified), so endDate >= today for everything here — the split below is purely on
  // whether it has started yet.
  const ongoing = dated.filter((e) => e.startDate <= today || monthKeyOf(e.startDate) === currentMonth);
  const later = dated.filter((e) => e.startDate > today && monthKeyOf(e.startDate) !== currentMonth);

  const hasOngoing = ongoing.length > 0;
  const hasLater = later.length > 0;

  if (!hasOngoing && !hasLater) {
    if (subtitle) subtitle.hidden = true;
    container.innerHTML = `<p class="event-empty">No events listed for this region yet.</p>`;
    return;
  }

  // Both tabs always render; the one with nothing in it is disabled (muted, like a pager arrow
  // at its end) and the other is the default.
  const ongoingInner = renderCardList(ongoing, { badge: true });
  const active = hasOngoing ? "ongoing" : "upcoming";
  const tab = (name, label, has) =>
    `<button type="button" role="tab" class="event-tabs__tab" aria-selected="${name === active}"
       tabindex="${name === active ? 0 : -1}" data-panel="${name}"${has ? "" : " disabled"}>${label}</button>`;
  container.innerHTML = `
    <div class="event-tabs" data-active="${active}" role="tablist" aria-label="Festivals &amp; events">
      ${tab("ongoing", `Ongoing · ${ongoing.length}`, hasOngoing)}${tab("upcoming", `Upcoming · ${later.length}`, hasLater)}
    </div>
    <div class="event-panel" role="tabpanel" data-panel="ongoing"${active === "ongoing" ? "" : " hidden"}>${hasOngoing ? ongoingInner : ""}</div>
    <div class="event-panel" role="tabpanel" data-panel="upcoming"${active === "upcoming" ? "" : " hidden"}>${hasLater ? buildUpcomingPanel(later) : ""}</div>`;
  setupEventTabs(container);

  reserveListHeight(container);
  // Row wrapping depends on the font and the width (a phone stacks and wraps far more), so
  // re-measure once the web font lands and when the viewport changes.
  document.fonts?.ready.then(() => reserveListHeight(container));
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => reserveListHeight(container), 150);
  });
  setupMonthTabs(container);
  setupPagers(container);
  setupAddressCopy(container);
}

// Reserve heights for this region's tallest case, so switching tabs / month chips / pages never
// moves the source line below, yet a sparse region (e.g. Jeju) isn't padded out. Measured with
// panels briefly un-hidden and each page shown in turn (no paint in between):
// 1. --event-list-h (event-timeline.css) = the tallest single list page, so the pager holds still;
// 2. container min-height = the tallest whole state (tab × month chip × page).
function reserveListHeight(container) {
  container.style.removeProperty("--event-list-h"); // else the old reservation inflates the measure
  container.style.minHeight = "";
  const hiddenEls = Array.from(container.querySelectorAll("[hidden]"));
  hiddenEls.forEach((el) => (el.hidden = false));
  let max = 0;
  container.querySelectorAll(".event-list-wrap").forEach((wrap) => {
    const ul = wrap.querySelector(".event-list");
    const items = Array.from(ul.children);
    if (!wrap.hasAttribute("data-paged")) {
      max = Math.max(max, ul.offsetHeight);
      return;
    }
    for (let start = 0; start < items.length; start += EVENTS_PAGE_SIZE) {
      items.forEach((li, i) => {
        li.hidden = i < start || i >= start + EVENTS_PAGE_SIZE;
      });
      max = Math.max(max, ul.offsetHeight);
    }
    items.forEach((li) => (li.hidden = false));
  });
  // Floor: never reserve less than a few rows, so a near-empty region isn't squashed.
  const tallestCard = Math.max(0, ...Array.from(container.querySelectorAll(".event-card"), (c) => c.offsetHeight));
  max = Math.max(max, EVENTS_MIN_ROWS * tallestCard);
  hiddenEls.forEach((el) => (el.hidden = true));
  container.style.setProperty("--event-list-h", `${Math.ceil(max)}px`);
  reserveContainerHeight(container);
}

function reserveContainerHeight(container) {
  const panels = Array.from(container.querySelectorAll(":scope > .event-panel"));
  if (!panels.length) return; // empty / quota state: natural height
  const stateEls = Array.from(container.querySelectorAll(".event-panel, .event-monthpanel, .event-card"));
  const saved = stateEls.map((el) => el.hidden);
  let max = 0;
  const measure = () => {
    max = Math.max(max, container.getBoundingClientRect().height);
  };
  const pageThrough = (scope) => {
    const wrap = scope.querySelector(".event-list-wrap[data-paged]");
    if (!wrap) return measure();
    const items = Array.from(wrap.querySelectorAll(".event-list > .event-card"));
    for (let start = 0; start < items.length; start += EVENTS_PAGE_SIZE) {
      items.forEach((li, i) => {
        li.hidden = i < start || i >= start + EVENTS_PAGE_SIZE;
      });
      measure();
    }
    items.forEach((li) => (li.hidden = false));
  };
  panels.forEach((panel) => {
    panels.forEach((o) => (o.hidden = o !== panel));
    const months = Array.from(panel.querySelectorAll(".event-monthpanel[data-month]"));
    if (!months.length) return pageThrough(panel);
    months.forEach((mp) => {
      months.forEach((o) => (o.hidden = o !== mp));
      pageThrough(mp);
    });
  });
  stateEls.forEach((el, i) => (el.hidden = saved[i]));
  container.style.minHeight = `${Math.ceil(max)}px`;
}

function setupEventTabs(container) {
  const strip = container.querySelector(".event-tabs");
  const tabs = Array.from(container.querySelectorAll(".event-tabs__tab:not(:disabled)"));
  const panels = Array.from(container.querySelectorAll(".event-panel[data-panel]"));
  if (tabs.length < 2) return;

  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p) => {
      p.hidden = p.dataset.panel !== tab.dataset.panel;
    });
    strip.dataset.active = tab.dataset.panel; // drives the sliding fill (event-timeline.css)
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next = tabs[(i + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      select(next);
    });
  });
}

function setupMonthTabs(container) {
  const tabs = Array.from(container.querySelectorAll(".event-months__tab"));
  const panels = Array.from(container.querySelectorAll(".event-monthpanel[data-month]"));
  tabs.forEach((tab, i) => {
    const select = () => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p) => {
        p.hidden = p.dataset.month !== tab.dataset.month;
      });
    };
    tab.addEventListener("click", select);
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next = tabs[(i + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      next.click();
    });
  });
}

function setupPagers(container) {
  container.querySelectorAll(".event-list-wrap[data-paged]").forEach((wrap) => {
    const items = Array.from(wrap.querySelectorAll(".event-list > .event-card"));
    const status = wrap.querySelector(".event-pager__status");
    const range = wrap.querySelector("[data-range]");
    const rangeSuffix = wrap.dataset.rangeSuffix || "";
    const prev = wrap.querySelector('.event-pager__btn[data-dir="-1"]');
    const next = wrap.querySelector('.event-pager__btn[data-dir="1"]');
    const pages = Math.ceil(items.length / EVENTS_PAGE_SIZE);
    let page = 1;

    const render = () => {
      items.forEach((li, i) => {
        li.hidden = Math.floor(i / EVENTS_PAGE_SIZE) !== page - 1;
      });
      status.textContent = `${page} / ${pages}`;
      // Presentational readout only — pagination math above is unchanged.
      if (range) {
        const from = (page - 1) * EVENTS_PAGE_SIZE + 1;
        const to = Math.min(page * EVENTS_PAGE_SIZE, items.length);
        range.textContent = `${from}–${to} of ${items.length}${rangeSuffix}`;
      }
      prev.disabled = page === 1;
      next.disabled = page === pages;
    };

    prev.addEventListener("click", () => {
      if (page > 1) {
        page -= 1;
        render();
      }
    });
    next.addEventListener("click", () => {
      if (page < pages) {
        page += 1;
        render();
      }
    });
    render();
  });
}
