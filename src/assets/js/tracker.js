// First-party analytics (docs/TRACKING_PLAN.md). Nothing is written to the device: no cookies, no
// storage, and the page_load_id lives in memory only. Every path fails silently — tracking must
// never block or break the UI. Event names/params are validated again server-side
// (functions/api/events.js), so anything off the allowlist is dropped there.
import {
  loadSecondsBucket, scrubMessage, secondsBucket, slugOf, targetPageTypeOf, viewportBucket,
} from "./tracking-buckets.js";

const ENDPOINT = "/api/events";
const SCHEMA_VERSION = 1;

const pageLoadId = (() => {
  try {
    return crypto.randomUUID();
  } catch {
    return "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padEnd(12, "0");
  }
})();

const DECLINE_PATH = "/regions/gyeonggi-do/population-decline-areas/";
const DECLINE_TARGET = "gyeonggi_decline_areas";
const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function pageTypeOf(pathname) {
  if (document.body?.dataset.pageType) return document.body.dataset.pageType;
  if (pathname === "/") return "home";
  if (pathname === DECLINE_PATH) return "decline_areas";
  if (pathname.startsWith("/regions/")) return "region";
  if (pathname.startsWith("/visa-info")) return "visa";
  if (pathname.startsWith("/settling-in")) return "settling";
  if (pathname.startsWith("/about")) return "about";
  return null;
}

function prevPageType() {
  try {
    if (!document.referrer) return null;
    const ref = new URL(document.referrer);
    if (ref.origin !== location.origin) return "external";
    return pageTypeOf(ref.pathname) || "external";
  } catch {
    return null;
  }
}

const state = {
  calcResult: "none_calculated",
  attempts: 0,
};
export function setCalcResult(result) {
  state.calcResult = result;
}
export function nextAttemptNo() {
  state.attempts += 1;
  return state.attempts;
}
export function attemptCount() {
  return state.attempts;
}

/** Headers for first-party API fetches, so the server can tie api_call events to this page view. */
export function pageLoadHeaders() {
  return { "X-Page-Load-Id": pageLoadId };
}

// The calculator only exists on the home page; elsewhere the field is omitted (stored as null).
function calcResultParam() {
  return pageTypeOf(location.pathname) === "home" ? { calc_result: state.calcResult } : {};
}

// Counts every track() call in this page load, so a gap in the sequence means a lost event.
let eventSeq = 0;

export function track(eventName, params = {}) {
  try {
    const payload = JSON.stringify({
      event_name: eventName,
      schema_version: SCHEMA_VERSION,
      page_path: location.pathname,
      page_type: pageTypeOf(location.pathname),
      prev_page_type: prevPageType(),
      page_load_id: pageLoadId,
      event_seq: ++eventSeq,
      viewport_bucket: viewportBucket(window.innerWidth),
      browser_lang: (navigator.language || "en").split("-")[0],
      params,
    });
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
    fetch(ENDPOINT, { method: "POST", body: blob, keepalive: true }).catch(() => {});
  } catch {
    // tracking must never affect the page
  }
}

const safe = (fn) => (...args) => {
  try {
    return fn(...args);
  } catch {
    return undefined;
  }
};

// --- calculator → map -------------------------------------------------------------------------

let mapWatch = null;

/** Arms the "did they see the map after a submission" measurement (fires once per page load). */
export const watchMapAfterSubmit = safe((result) => {
  const map = document.querySelector(".korea-map");
  if (!map || !("IntersectionObserver" in window)) return;
  if (mapWatch) {
    if (!mapWatch.done) Object.assign(mapWatch, { armedAt: performance.now(), result });
    return;
  }
  mapWatch = { armedAt: performance.now(), result, done: false };
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) return;
    mapWatch.done = true;
    observer.disconnect();
    track("map_seen_after_calculator", {
      seconds_after_submit_bucket: secondsBucket((performance.now() - mapWatch.armedAt) / 1000),
      result: mapWatch.result,
    });
  }, { threshold: [0.5] });
  observer.observe(map);
});

// --- clicks -----------------------------------------------------------------------------------

const tapCounts = new Map();

// Region links on the home page can be gated (no href) or re-pointed at the decline page, so the
// destination is read from the href at click time.
function trackInternalLink(link, source) {
  const href = link.getAttribute("href"); // gated (ineligible) regions have no href: not a click
  if (!href) return;
  const path = new URL(href, location.origin).pathname;
  const targetPageType = targetPageTypeOf(path);
  if (!targetPageType) return;
  const target =
    targetPageType === "region" ? path.split("/")[2]
    : targetPageType === "decline_areas" ? DECLINE_TARGET
    : link.dataset.internalTarget;
  if (!target) return;
  track("internal_link_click", { target_page_type: targetPageType, target, source, ...calcResultParam() });
}

function onClick(event) {
  const el = event.target instanceof Element ? event.target : null;
  if (!el) return;

  // Narrow viewports: korea-map/region-card intercept a map tap (preventDefault) to scroll to the card.
  const mapRegion = el.closest(".korea-map .region[data-slug]");
  if (mapRegion && event.defaultPrevented) {
    const region = mapRegion.dataset.slug;
    const n = (tapCounts.get(region) || 0) + 1;
    tapCounts.set(region, n);
    track("home_map_region_click", { region, tap_no: n });
    return;
  }

  const pin = el.closest(".region-detail-map__svg .map-pin");
  if (pin) {
    const poi = poiParams(pin);
    if (poi) track("region_map_poi_click", poi);
    return;
  }

  const tag = el.closest("[data-vibe-tag]");
  if (tag) {
    track("vibe_tag_click", {
      tag: tag.textContent.trim().toLowerCase().slice(0, 40),
      location: tag.dataset.vibeTag,
      region: tag.dataset.vibeRegion,
      city: tag.dataset.vibeCity,
    });
    return;
  }

  const pager = el.closest(".event-pager__btn");
  if (pager) {
    const wrap = pager.closest(".event-list-wrap");
    const pageNo = Number(/^(\d+)/.exec(wrap?.querySelector(".event-pager__status")?.textContent || "")?.[1]);
    if (pageNo) {
      const month = pager.closest(".event-monthpanel[data-month]")?.dataset.month;
      track("festival_interacted", {
        action: "page_change",
        tab: pager.closest(".event-panel[data-panel]")?.dataset.panel,
        region: eventsRegion(),
        page_no: pageNo,
        ...(month && { month_selected: monthName(month) }),
      });
    }
    return;
  }

  const carousel = el.closest(".region-hero-gallery__nav");
  if (carousel) {
    track("highlights_carousel_nav", {
      direction: carousel.classList.contains("region-hero-gallery__nav--next") ? "next" : "prev",
      region: location.pathname.split("/")[2],
    });
    return;
  }

  const summary = el.closest("summary");
  const details = summary?.parentElement;
  if (details?.dataset.accordionId && !details.open) {
    track("accordion_opened", { accordion_id: details.dataset.accordionId, item_id: details.dataset.accordionItem });
    return;
  }

  const link = el.closest("a");
  if (!link) return;

  if (link.dataset.nav) {
    track("nav_click", { nav: link.dataset.nav, item: link.dataset.navItem, ...calcResultParam() });
    if (link.dataset.nav === "main" && link.dataset.navItem === "regions") watchLandingScrollUp();
    return;
  }
  if (link.dataset.linkCategory) {
    let domain = "";
    try {
      domain = new URL(link.href).hostname.replace(/^www\./, "");
    } catch {
      return;
    }
    track("outbound_click", {
      category: link.dataset.linkCategory,
      link_id: link.dataset.linkId,
      domain,
      section: link.closest("[data-link-section]")?.dataset.linkSection,
      city: link.closest("[data-link-city]")?.dataset.linkCity,
    });
    return;
  }
  if (link.dataset.internalSource) {
    trackInternalLink(link, link.dataset.internalSource);
    return;
  }
  // Home page entry points: link state (pointing at the decline page, or gated) is read at click time.
  if (link.closest(".korea-map")) {
    trackInternalLink(link, "home_map");
  } else if (link.matches(".region-card__link")) {
    trackInternalLink(link, "home_card");
  }
}

const monthName = (key) => MONTH_NAMES[Number(key.split("-")[1]) - 1];

// Month sub-tab (Upcoming). Captured before the tab's own handler flips aria-selected, so
// re-clicking the already-selected month is not counted.
function onMonthTabClick(event) {
  const tab = event.target instanceof Element ? event.target.closest(".event-months__tab") : null;
  if (!tab || tab.getAttribute("aria-selected") === "true" || !tab.dataset.month) return;
  track("festival_interacted", {
    action: "month_filter",
    tab: "upcoming",
    region: eventsRegion(),
    month_selected: monthName(tab.dataset.month),
  });
}

// Places filter pill. Captured before the pill's own handler flips is-selected, so re-clicking the
// already-selected pill is not counted; the clicked group's state is the pill itself.
function onFilterPillClick(event) {
  const pill = event.target instanceof Element ? event.target.closest(".filter-pill[data-filter-group]") : null;
  if (!pill || pill.classList.contains("is-selected")) return;
  const group = pill.dataset.filterGroup;
  const selected = (g) =>
    g === group
      ? pill.dataset.filterValue
      : pill.closest("[data-attraction-filters]")
          ?.querySelector(`[data-filter-group="${g}"].is-selected`)?.dataset.filterValue ?? "all";
  track("places_filter_used", {
    filter_type: group,
    value: pill.dataset.filterValue,
    region: document.querySelector("[data-region-attractions]")?.dataset.regionSlug,
    area_selected: selected("area"),
    type_selected: selected("type"),
  });
}

function eventsRegion() {
  return document.querySelector("[data-region-events]")?.dataset.regionSlug;
}

// Main-nav "Regions" lands on /#map; did the visitor scroll back up to the hero within 10 s?
let landingWatching = false;
function watchLandingScrollUp() {
  if (landingWatching) return;
  landingWatching = true;
  const startedAt = performance.now();
  let baseline = null;
  const onScroll = () => {
    const elapsed = performance.now() - startedAt;
    if (elapsed > 10000) return stop();
    if (elapsed < 700) return; // the jump to #map itself
    if (baseline === null) baseline = window.scrollY;
    if (window.scrollY <= baseline - 150) {
      stop();
      track("regions_landing_scroll_up");
    }
  };
  const stop = () => {
    window.removeEventListener("scroll", onScroll);
    setTimeout(() => { landingWatching = false; }, 0);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  setTimeout(stop, 10000);
}

// --- observers --------------------------------------------------------------------------------

const initMapHover = safe(() => {
  const seen = new Set();
  document.querySelectorAll(".korea-map .region[data-slug]").forEach((el) => {
    let timer = null;
    el.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse" || seen.has(el.dataset.slug)) return;
      timer = setTimeout(() => {
        seen.add(el.dataset.slug);
        track("home_map_region_hover", { region: el.dataset.slug });
      }, 300);
    });
    el.addEventListener("pointerleave", () => clearTimeout(timer));
  });
});

// Once per section per page load, after enough of it has stayed in view for SECTION_DWELL_MS.
// "Enough" is relative to the section's own size, so short and tall sections both qualify while
// the leftover strip of a section scrolled past (or jumped over) doesn't.
const SECTION_DWELL_MS = 1000;
const SECTION_MIN_OWN_SHARE = 0.5;
const SECTION_MIN_VIEWPORT_SHARE = 0.3;
const SECTION_THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20);
const initSectionSeen = safe(() => {
  const sections = [...document.querySelectorAll("[data-section-seen]")];
  if (!sections.length || !("IntersectionObserver" in window)) return;
  const timers = new Map();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target;
      const visible = entry.intersectionRect.height;
      const viewport = entry.rootBounds?.height ?? window.innerHeight;
      const enough =
        entry.isIntersecting && visible > 0 &&
        visible >= Math.min(entry.boundingClientRect.height * SECTION_MIN_OWN_SHARE, viewport * SECTION_MIN_VIEWPORT_SHARE);
      if (!enough) {
        clearTimeout(timers.get(el));
        timers.delete(el);
        continue;
      }
      if (timers.has(el)) continue;
      timers.set(el, setTimeout(() => {
        observer.unobserve(el);
        timers.delete(el);
        track("section_seen", {
          section: el.dataset.sectionSeen,
          seconds_since_load_bucket: loadSecondsBucket(performance.now() / 1000),
        });
      }, SECTION_DWELL_MS));
    }
  }, { threshold: SECTION_THRESHOLDS });
  sections.forEach((s) => observer.observe(s));
});

const GALLERIES = [
  [".region-hero-gallery__track", "highlights"],
  [".city-card-list", "cities"],
  [".attraction-list", "attractions"],
  [".dish-list", "dishes"],
];

// Once per gallery type per page load, on the first scroll the visitor drives. Scripted scrolls
// (highlights autoplay, prev/next buttons, snap corrections) don't count: a scroll only counts
// if a wheel / touch / pointer / key input reached the strip first.
const initGalleryScroll = safe(() => {
  if (pageTypeOf(location.pathname) !== "region") return;
  const region = location.pathname.split("/")[2];
  const driven = new WeakSet();
  const fired = new Set();
  const galleryOf = (el) => (el instanceof Element ? GALLERIES.find(([sel]) => el.closest(sel)) : null);
  const markDriven = (e) => {
    const g = galleryOf(e.target);
    if (g) driven.add(e.target.closest(g[0]));
  };
  for (const type of ["wheel", "touchstart", "pointerdown", "keydown"]) {
    document.addEventListener(type, markDriven, { capture: true, passive: true });
  }
  document.addEventListener("scroll", (e) => {
    const g = galleryOf(e.target);
    if (!g || fired.has(g[1]) || !driven.has(e.target)) return;
    fired.add(g[1]);
    track("gallery_scrolled", { region, gallery_type: g[1] });
  }, { capture: true, passive: true });
});

function poiParams(pin) {
  const name = slugOf(pin.querySelector(".map-pin__label")?.textContent);
  if (!name || !pin.dataset.poiType) return null;
  return { poi_name: name, poi_type: pin.dataset.poiType, is_interactive: pin.hasAttribute("tabindex") };
}

const initPoiHover = safe(() => {
  const seen = new Set();
  document.querySelectorAll(".region-detail-map__svg .map-pin").forEach((pin) => {
    let timer = null;
    pin.addEventListener("pointerenter", (e) => {
      const poi = poiParams(pin);
      if (e.pointerType !== "mouse" || !poi || seen.has(poi.poi_name)) return;
      timer = setTimeout(() => {
        seen.add(poi.poi_name);
        track("region_map_poi_hover", poi);
      }, 300);
    });
    pin.addEventListener("pointerleave", () => clearTimeout(timer));
  });
});

// Festival tabs are rendered after the live fetch; their active tab is mirrored in data-active
// (set by click and by arrow-key navigation alike), so watch that instead of binding to the tabs.
const initFestivalTabs = safe(() => {
  const mount = document.querySelector("[data-region-events]");
  if (!mount) return;
  new MutationObserver((records) => {
    for (const r of records) {
      const tab = r.target.dataset.active;
      if (r.oldValue !== tab && (tab === "ongoing" || tab === "upcoming")) {
        track("festival_interacted", { action: "tab_switch", tab, region: eventsRegion() });
      }
    }
  }).observe(mount, { subtree: true, attributes: true, attributeFilter: ["data-active"], attributeOldValue: true });
});

let jsErrors = 0;
const initErrors = safe(() => {
  window.addEventListener("error", (e) => {
    try {
      if (jsErrors >= 5 || !e.filename) return;
      const url = new URL(e.filename);
      if (url.origin !== location.origin) return;
      jsErrors += 1;
      track("js_error", {
        source_file: url.pathname.split("/").pop() || "inline",
        line: e.lineno || 0,
        message_short: scrubMessage(e.message),
      });
    } catch {
      // ignore
    }
  });
});

const trackPageView = safe(() => {
  const params = {};
  if (document.referrer) {
    const ref = new URL(document.referrer);
    if (ref.origin !== location.origin) params.referrer_domain = ref.hostname.replace(/^www\./, "");
  }
  const q = new URLSearchParams(location.search);
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const v = q.get(key);
    if (v && /^[A-Za-z0-9._~+-]{1,60}$/.test(v)) params[key] = v;
  }
  track("page_view", params);
  if (document.body?.dataset.pageType === "404") track("not_found", { requested_path: location.pathname });
  // Cross-page arrival at /#map (from main nav "Regions", or any other link to it).
  if (location.pathname === "/" && location.hash === "#map" && prevPageType() && prevPageType() !== "external") {
    watchLandingScrollUp();
  }
});

export function init() {
  try {
    document.addEventListener("click", safe(onMonthTabClick), true);
    document.addEventListener("click", safe(onFilterPillClick), true);
    document.addEventListener("click", safe(onClick));
    initErrors();
    initMapHover();
    initPoiHover();
    initGalleryScroll();
    initSectionSeen();
    initFestivalTabs();
    trackPageView();
  } catch {
    // ignore
  }
}
