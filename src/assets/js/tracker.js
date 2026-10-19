// First-party analytics (docs/TRACKING_PLAN.md). Nothing is written to the device: no cookies, no
// storage, and the page_load_id lives in memory only. Every path fails silently — tracking must
// never block or break the UI. Event names/params are validated again server-side
// (functions/api/events.js), so anything off the allowlist is dropped there.
import { loadSecondsBucket, secondsBucket, viewportBucket } from "./tracking-buckets.js";

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
    if (!document.referrer) return "none";
    const ref = new URL(document.referrer);
    if (ref.origin !== location.origin) return "external";
    return pageTypeOf(ref.pathname) || "external";
  } catch {
    return "none";
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

export function track(eventName, params = {}) {
  try {
    const payload = JSON.stringify({
      event_name: eventName,
      schema_version: SCHEMA_VERSION,
      page_path: location.pathname,
      page_type: pageTypeOf(location.pathname),
      prev_page_type: prevPageType(),
      page_load_id: pageLoadId,
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

function regionTargetFromHref(href) {
  const path = new URL(href, location.origin).pathname;
  if (path === DECLINE_PATH) return DECLINE_TARGET;
  const m = /^\/regions\/([a-z0-9-]+)\/$/.exec(path);
  return m ? m[1] : null;
}

function trackRegionLink(link, source) {
  const href = link.getAttribute("href"); // gated (ineligible) regions have no href: not a click
  const target = href && regionTargetFromHref(href);
  if (target) track("region_link_click", { target, source, calc_result: state.calcResult });
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
    track("map_region_tap", { region, tap_no: n });
    return;
  }

  const tag = el.closest("[data-vibe-tag]");
  if (tag) {
    track("vibe_tag_click", {
      tag: tag.textContent.trim().toLowerCase().slice(0, 40),
      location: tag.dataset.vibeTag,
    });
    return;
  }

  const pill = el.closest(".filter-pill[data-filter-group]");
  if (pill) {
    const list = document.querySelector("[data-region-attractions]");
    track("places_filter_used", {
      filter_type: pill.dataset.filterGroup,
      value: pill.dataset.filterValue,
      region: list?.dataset.regionSlug,
    });
    return;
  }

  const pager = el.closest(".event-pager__btn");
  if (pager) {
    const wrap = pager.closest(".event-list-wrap");
    const pageNo = Number(/^(\d+)/.exec(wrap?.querySelector(".event-pager__status")?.textContent || "")?.[1]);
    if (pageNo) track("festival_page_change", { page_no: pageNo, region: eventsRegion() });
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
    track("accordion_opened", { accordion_id: details.dataset.accordionId, page_type: pageTypeOf(location.pathname) });
    return;
  }

  const link = el.closest("a");
  if (!link) return;

  if (link.dataset.nav) {
    track("nav_click", { nav: link.dataset.nav, item: link.dataset.navItem });
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
  if (link.dataset.internalLink) {
    track("internal_link_click", { link_id: link.dataset.internalLink });
    return;
  }
  if (link.dataset.regionSource) {
    trackRegionLink(link, link.dataset.regionSource);
    return;
  }
  // Home page entry points: link state (pointing at the decline page, or gated) is read at click time.
  if (link.closest(".korea-map")) {
    trackRegionLink(link, "home_map");
  } else if (link.matches(".region-card__link")) {
    const partial = link.getAttribute("href") === DECLINE_PATH && link.dataset.originalHref;
    trackRegionLink(link, partial ? "home_card_partial" : "home_card");
  }
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
        track("map_region_hover", { region: el.dataset.slug });
      }, 300);
    });
    el.addEventListener("pointerleave", () => clearTimeout(timer));
  });
});

// Once per section per page load, when the section's top enters the viewport.
const initSectionSeen = safe(() => {
  const sections = [...document.querySelectorAll("[data-section-seen]")];
  if (!sections.length || !("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      track("section_seen", {
        section: entry.target.dataset.sectionSeen,
        seconds_since_load_bucket: loadSecondsBucket(performance.now() / 1000),
      });
    }
  });
  sections.forEach((s) => observer.observe(s));
});

const initCitySeen = safe(() => {
  const cards = [...document.querySelectorAll("[data-city-card]")];
  if (!cards.length || !("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
      observer.unobserve(entry.target);
      track("city_card_seen", {
        region: entry.target.dataset.region,
        city: entry.target.dataset.city,
        position: cards.indexOf(entry.target) + 1,
      });
    }
  }, { threshold: [0.5] });
  cards.forEach((c) => observer.observe(c));
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
        track("festival_tab_switch", { tab, region: eventsRegion() });
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
        message_short: String(e.message || "").slice(0, 80),
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
  if (location.pathname === "/" && location.hash === "#map" && prevPageType() !== "external" && prevPageType() !== "none") {
    watchLandingScrollUp();
  }
});

export function init() {
  try {
    document.addEventListener("click", safe(onClick));
    initErrors();
    initMapHover();
    initCitySeen();
    initSectionSeen();
    initFestivalTabs();
    trackPageView();
  } catch {
    // ignore
  }
}
