// ROADMAP_TODO.md Phase 23 — region pages fetch live KTO data at request time from
// functions/api/region/[slug]/{attractions,events}.js, replacing the old build-time mock loop
// (architecture.md §5: KTO-sourced content can't be a git-committed/build-time snapshot).
// No-JS story: each mount's <noscript> fallback (region.njk) is the real degraded path — an
// honest "needs JavaScript" message with an outbound link, not fake/stale data. That's inert the
// moment JS runs, since init() below replaces the mount's innerHTML unconditionally.
import { applyFilters as applyAttractionFilters } from "./attraction-filters.js";

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

const ATTRACTIONS_SUBTITLE_DEFAULT = "What to explore in the region";
const ATTRACTIONS_SUBTITLE_QUOTA_EXCEEDED = "Top picks for today, the full list will be back tomorrow";

function renderAttractions(container, data) {
  // fetchJson is shared with events (still a bare array) — attractions.js returns
  // { items, quotaExceeded }, but fetchJson's own network-failure fallback is still a bare `[]`,
  // so handle both shapes rather than assuming the object one always arrives.
  const attractions = Array.isArray(data) ? data : data.items || [];
  const quotaExceeded = !Array.isArray(data) && Boolean(data.quotaExceeded);
  // KTO's daily call quota being gone (architecture.md §5) means attractions.js already fell
  // back to the curated mock set rather than send an empty/partial list — so the subtitle should
  // say "today's picks", not imply this is the full live gallery. Reset to the default on every
  // render (not just set-once) so a page that loads mid-outage and later re-fetches doesn't keep
  // a stale "top picks" message.
  const subtitle = document.querySelector("[data-attractions-subtitle]");
  if (subtitle) {
    subtitle.textContent = quotaExceeded ? ATTRACTIONS_SUBTITLE_QUOTA_EXCEEDED : ATTRACTIONS_SUBTITLE_DEFAULT;
  }
  if (!attractions.length) {
    // A true empty result only happens now if a region genuinely has none *and* KTO's quota
    // isn't the cause (quotaExceeded always serves the mock fallback in attractions.js, so this
    // branch never sees quotaExceeded with zero items) — one honest message is enough.
    container.innerHTML = `<li class="empty-state">No attractions listed for this region right now.</li>`;
    return;
  }
  container.innerHTML = attractions
    .map((a) => {
      // imageLicense is null for an unlicensed/missing image (normalize.mjs) — never render
      // those, per CLAUDE.md rule 4/architecture.md §5. object-fit: cover is the project's
      // existing default for both Type1/Type3 (hero.css) — Type3's cover-vs-contain question
      // stays open (ROADMAP Phase 29), unaffected by this.
      // KTO's firstimage/firstimage2 don't always both resolve — one can 404 on KTO's own CDN
      // even though the license and the other URL are fine (architecture.md §5). data-fallback
      // carries the other URL so setupImageFallback can recover instead of showing a broken
      // image; a li that has neither renders straight to the placeholder as before.
      const primary = a.imageThumbUrl || a.imageUrl;
      const fallback = a.imageThumbUrl && a.imageUrl && a.imageUrl !== a.imageThumbUrl ? a.imageUrl : "";
      const media = a.imageLicense
        ? `<img class="attraction-card__media" src="${primary}"${fallback ? ` data-fallback="${fallback}"` : ""} alt="${escapeHtml(a.titleEn)}" loading="lazy">`
        : `<div class="media-placeholder attraction-card__media" aria-hidden="true"></div>`;
      // a.category/a.citySlug come from the whitelist lclsSystm1/2/3 match + lDongSignguCd city
      // lookup in functions/api/region/[slug]/attractions.js (architecture.md §5) — surfaced
      // here as data-category/data-city so attraction-filters.js can filter without a refetch.
      const category = a.category === "nature" ? "Nature" : "Culture";
      return `
        <li class="attraction-card" data-category="${a.category}" data-city="${a.citySlug || ""}">
          <div class="attraction-card__figure">
            ${media}
            <span class="attraction-card__category">${category}</span>
          </div>
          <h4>${escapeHtml(a.titleEn)}${a.titleKo ? ` <span class="attraction-card__ko">${escapeHtml(a.titleKo)}</span>` : ""}</h4>
          <p class="attraction-card__address">${pinIcon("attraction-card__pin")}${escapeHtml(a.address)}</p>
        </li>`;
    })
    .join("");
  setupImageFallback(container);
  applyAttractionFilters();
}

// A dead src swaps to the other KTO URL once; if that also 404s, swaps to the same
// .media-placeholder used for unlicensed images rather than leaving a broken-image icon.
function setupImageFallback(container) {
  container.querySelectorAll(".attraction-card__media[data-fallback]").forEach((img) => {
    img.addEventListener("error", function onError() {
      const fallback = img.dataset.fallback;
      if (fallback) {
        img.removeAttribute("data-fallback");
        img.src = fallback;
        return;
      }
      img.removeEventListener("error", onError);
      const placeholder = document.createElement("div");
      placeholder.className = "media-placeholder attraction-card__media";
      placeholder.setAttribute("aria-hidden", "true");
      img.replaceWith(placeholder);
    });
  });
}

// ---------------------------------------------------------------------------
// Events timeline
// ---------------------------------------------------------------------------

const EVENTS_PAGE_SIZE = 5;

// Small inline glyphs (project rule: inline SVG, zero icon libraries).
// Shared glyph, sized per context via `className` (event-place__icon for festival cards,
// attraction-card__pin for "Places to see nearby" — region-page.css sizes each independently).
function pinIcon(className) {
  return `<svg class="${className}" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5Zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>`;
}
const PIN_ICON = pinIcon("event-place__icon");
const COPY_ICON = `<svg class="event-place__copy-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10 1H4a2 2 0 0 0-2 2v7h2V3h6V1Zm2 3H8a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/></svg>`;
// Tear-off desk calendar with a blank page — the empty state ("no dates listed").
const CAL_EMPTY_ICON = `<svg class="event-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="8.5" cy="4" r="1.3"/><circle cx="15.5" cy="4" r="1.3"/><path d="M8.5 5.3v1.7M15.5 5.3v1.7"/><rect x="4" y="7" width="16" height="14" rx="2"/><path d="M4 11h16" stroke-dasharray="2 2"/></svg>`;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  return y === new Date().getFullYear() ? mon : `${mon} ${y}`;
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
  const MON = (d) => d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  if (ev.startDate === ev.endDate) return `${s.getDate()} ${MON(s)}`;
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth())
    return `${s.getDate()} – ${e.getDate()} ${MON(s)}`;
  return `${s.getDate()} ${MON(s)} – ${e.getDate()} ${MON(e)}`;
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
    return `<div class="event-monthpanel">${renderCardList(byMonth.get(keys[0]), { rangeContext: ` in ${monthLabelLong(keys[0])}` })}</div>`;
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
           ${renderCardList(byMonth.get(key), { rangeContext: ` in ${monthLabelLong(key)}` })}
         </div>`
    )
    .join("");
  return `<div class="event-months" role="tablist" aria-label="Upcoming events by month">${tabs}</div>${panels}`;
}

// Ongoing tab = "what's on around now": festivals currently running (often multi-month) plus
// ones that start later this calendar month, as one list — each card carries a "Long-term" /
// "This month" badge. Upcoming tab = strictly later months, grouped into month sub-tabs. The tab
// strip and the "no events" message only appear when they're actually warranted (see cases).
// Dev/QA preview hook: `?preview=empty` forces the zero-events state, `?preview=thismonth`
// forces a mix with same-month events (the live data currently has neither). No effect without
// the query param.
function applyPreview(events) {
  const mode = new URLSearchParams(location.search).get("preview");
  if (mode === "empty") return [];
  if (mode === "thismonth") {
    return [
      { startDate: "2026-08-20", endDate: "2026-08-24", titleEn: "Hanriver Summer Night Market", address: "160 Yeouidong-ro, Yeongdeungpo-gu, Seoul" },
      { startDate: "2026-08-29", endDate: "2026-08-31", titleEn: "Seochon Alley Jazz Weekend", address: "12 Jahamun-ro, Jongno-gu, Seoul" },
      { startDate: "2026-05-01", endDate: "2026-11-30", titleEn: "City Wall Lantern Walk", address: "Naksan-ro, Jongno-gu, Seoul" },
      { startDate: "2026-10-02", endDate: "2026-10-05", titleEn: "Autumn Hanok Craft Fair", address: "99 Bukchon-ro, Jongno-gu, Seoul" },
    ];
  }
  return events;
}

function renderEventsTimeline(container, events) {
  events = applyPreview(events);
  const today = todayIso();
  const currentMonth = monthKeyOf(today);

  const dated = events.filter((e) => e.startDate).sort((a, b) => a.startDate.localeCompare(b.startDate));
  // isUpcomingOrOngoing (normalize.mjs) already dropped anything fully ended, so endDate >= today
  // for everything here — the split is purely on whether it has started yet.
  const ongoing = dated.filter((e) => e.startDate <= today || monthKeyOf(e.startDate) === currentMonth);
  const later = dated.filter((e) => e.startDate > today && monthKeyOf(e.startDate) !== currentMonth);

  const hasOngoing = ongoing.length > 0;
  const hasLater = later.length > 0;

  if (!hasOngoing && !hasLater) {
    // Same card shape as a real event, with a struck-through calendar chip instead of a date.
    container.innerHTML = `
      <div class="event-empty">
        <span class="event-empty__chip" aria-hidden="true">${CAL_EMPTY_ICON}</span>
        <p class="event-empty__text">No festivals or events listed for this region right now.</p>
      </div>`;
    return;
  }

  const ongoingInner = renderCardList(ongoing, { badge: true, rangeContext: " running now" });

  if (hasOngoing && hasLater) {
    container.innerHTML = `
      <div class="event-tabs" data-active="ongoing" role="tablist" aria-label="Festivals &amp; events">
        <button type="button" role="tab" class="event-tabs__tab" aria-selected="true" tabindex="0" data-panel="ongoing">Ongoing</button>
        <button type="button" role="tab" class="event-tabs__tab" aria-selected="false" tabindex="-1" data-panel="upcoming">Upcoming</button>
      </div>
      <div class="event-panel" role="tabpanel" data-panel="ongoing">${ongoingInner}</div>
      <div class="event-panel" role="tabpanel" data-panel="upcoming" hidden>${buildUpcomingPanel(later)}</div>`;
    setupEventTabs(container);
  } else if (hasOngoing) {
    container.innerHTML = `<div class="event-panel">${ongoingInner}</div>`;
  } else {
    container.innerHTML = `<div class="event-panel">${buildUpcomingPanel(later)}</div>`;
  }

  setupMonthTabs(container);
  setupPagers(container);
  setupAddressCopy(container);
}

function setupEventTabs(container) {
  const strip = container.querySelector(".event-tabs");
  const tabs = Array.from(container.querySelectorAll(".event-tabs__tab"));
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
      // Presentational readout only — pagination math above is unchanged (HANDOFF task 06).
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

function setupAddressCopy(container) {
  // One shared "currently confirmed" slot — tapping any row clears the previous one immediately,
  // so only one row is ever in the copied state, and every confirmation reverts after 2s.
  let activeTimer = null;
  let activePlace = null;

  const reset = () => {
    if (!activePlace) return;
    const label = activePlace.querySelector(".event-place__copy-label");
    const status = activePlace.querySelector(".event-place__status");
    if (label) label.textContent = label.dataset.default || "Copy full address";
    if (status) status.textContent = "";
    activePlace.classList.remove("is-copied");
    activePlace = null;
  };

  container.querySelectorAll(".event-place__copy").forEach((btn) => {
    const place = btn.closest(".event-place");
    const label = place.querySelector(".event-place__copy-label");
    const status = place.querySelector(".event-place__status");
    btn.addEventListener("click", async () => {
      const address = btn.dataset.address || "";
      let ok = false;
      try {
        await navigator.clipboard.writeText(address);
        ok = true;
      } catch {
        ok = legacyCopy(address);
      }
      clearTimeout(activeTimer);
      reset();
      // Same string written to both slots — .event-place__status is what desktop shows (its
      // label stays permanently hidden there); .event-place__copy-label is what phone shows (its
      // own CSS hides .event-place__status instead, event-timeline.css) — so the confirmation
      // replaces the label's own text in place, rather than a second element popping in beside
      // a now icon-only button at a different indent.
      const confirmText = ok ? "Full address copied" : "Press Ctrl+C to copy";
      if (label) label.textContent = confirmText;
      if (status) status.textContent = confirmText;
      place.classList.toggle("is-copied", ok);
      activePlace = place;
      activeTimer = setTimeout(reset, 2000);
    });
  });
}

function legacyCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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
