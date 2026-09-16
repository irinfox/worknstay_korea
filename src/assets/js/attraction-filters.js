// "Places to see nearby" filter pills — Area/Type are independent single-select groups that
// intersect (AND) to filter the already-rendered .attraction-card list. Cards carry their
// filter values as data-city/data-category attributes, set by region-data.js at render time —
// this module owns pill state + card visibility, region-data.js owns fetching/rendering the
// cards themselves. applyFilters() is exported so region-data.js can re-apply the current pill
// selection once live data replaces the loading placeholder (a pill can be clicked before the
// fetch resolves).
//
// "Elsewhere" (Area) means a card's data-city is either empty or set to a citySlug that isn't
// one of the Area pills actually rendered on the page (e.g. Goyang's cards on gyeonggi-do —
// resolved to a real citySlug but deliberately has no pill). Computed live from the rendered DOM
// (not hardcoded), so it stays correct if region.njk's cityOrder ever changes.
//
// A city can prefer a different category order than the region default (e.g. Suncheon's nature
// draws outrank its culture picks, even though the rest of jeolla-do leads with culture) — but
// that preference must apply only while that city's own pill is the active filter, never to "All"
// or "Elsewhere". attractions.js tried this server-side first and couldn't do it cleanly: the
// server emits one array and the front end only ever toggles card visibility on it (never
// re-sorts), so any server-side per-city reorder inescapably changed the "All" tab's order too.
// Doing it here with inline flex `order` — applied only to the active city's own cards, cleared
// on every other pill — keeps the underlying DOM order (and therefore "All"/"Elsewhere") untouched.
// Incheon flips gyeonggi-do's region-wide culture-first default (its nature draws outrank
// culture); Gangneung flips gangwon-do's region-wide nature-first default the other way.
const CITY_CATEGORY_PRIORITY = {
  suncheon: "nature",
  incheon: "nature",
  gangneung: "culture",
};

// Same idea as CITY_CATEGORY_PRIORITY, but keyed by region slug instead of city slug: "Elsewhere"
// is the same pill value on every region page, so it can't reuse that flat map without one
// region's override leaking into every other region's Elsewhere tab. Needed because "Elsewhere"
// pools whichever curated top picks don't belong to a named city, and that mix doesn't
// necessarily match the region's own culture/nature-first default — gyeonggi-do leads with
// culture region-wide, but every one of its curated Elsewhere picks (Ilsan Lake Park, Garden of
// Morning Calm, Hwadam Botanic Garden) is nature, so a plain culture-first Elsewhere view buried
// them behind uncurated culture cards. chungcheong-do has the same mismatch (its one Elsewhere
// hard pick, Dodamsambong Peaks, is nature against a culture-first region default) — kept nature
// here too for consistency, even though chungcheong-do's culture spots are strong in their own
// right; gyeongsang-do/gangwon-do aren't listed because their Elsewhere picks already match their
// region's own default category.
const ELSEWHERE_CATEGORY_PRIORITY = {
  "gyeonggi-do": "nature",
  "chungcheong-do": "nature",
};

function selectedValue(pills) {
  const selected = pills.find((p) => p.classList.contains("is-selected"));
  return selected ? selected.dataset.filterValue : "all";
}

function knownAreaSlugs(areaPills) {
  return new Set(areaPills.map((p) => p.dataset.filterValue).filter((v) => v !== "all" && v !== "elsewhere"));
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function applyFilters(root = document) {
  const filtersEl = root.querySelector("[data-attraction-filters]");
  const list = root.querySelector("[data-region-attractions]");
  if (!filtersEl || !list) return;

  const areaPills = Array.from(filtersEl.querySelectorAll('[data-filter-group="area"]'));
  const typePills = Array.from(filtersEl.querySelectorAll('[data-filter-group="type"]'));
  const area = selectedValue(areaPills);
  const type = selectedValue(typePills);

  // A new filter selection is a new list, not a continuation of wherever the old one was
  // scrolled to — leaving scrollLeft alone let switching pills land mid-list (or, worse, past
  // the end of a shorter one), so every filter change scrolls back to the start (see below).
  // Naively setting scrollLeft = 0 before the hidden/order mutations below isn't enough: with
  // scroll-snap-type active, Chrome resolves "nearest snap point" against a stale intermediate
  // layout while those mutations land, silently overriding the reset and leaving the list
  // scrolled to wherever the previous filter happened to be (confirmed live — disabling
  // scroll-snap-type made the bug disappear). Suspending snap across the mutation and the reset
  // below, restored only once that's actually settled, avoids the race.
  list.style.scrollSnapType = "none";

  const knownAreas = knownAreaSlugs(areaPills);
  const cards = Array.from(list.querySelectorAll(".attraction-card"));
  const cityPriority =
    area === "elsewhere" ? ELSEWHERE_CATEGORY_PRIORITY[list.dataset.regionSlug] : CITY_CATEGORY_PRIORITY[area];
  let visibleCount = 0;
  cards.forEach((card) => {
    const matchesArea =
      area === "all" || (area === "elsewhere" ? !knownAreas.has(card.dataset.city) : card.dataset.city === area);
    const matchesType = type === "all" || card.dataset.category === type;
    const show = matchesArea && matchesType;
    card.hidden = !show;
    if (show) visibleCount += 1;
    // Only ever touches cards visible under the active area filter — every other card (and every
    // other filter state, since cityPriority is undefined for "all") keeps the default order
    // (unset = 0 = DOM/source order), so "All" is never affected. Reusing `matchesArea` (rather
    // than re-deriving "is this card in the active area") is what makes this work for "Elsewhere"
    // too — a card's data-city is never literally the string "elsewhere", so a naive
    // `card.dataset.city === area` check (the previous version of this line) could never match
    // and this reorder silently never fired for that pill.
    card.style.order = cityPriority && matchesArea && card.dataset.category !== cityPriority ? "1" : "";
  });

  const restoreSnap = () => {
    list.style.scrollSnapType = "";
  };
  if (prefersReducedMotion() || list.scrollLeft === 0) {
    // Already at the start (e.g. the previous filter had nothing to scroll) — scrollTo(0, smooth)
    // would be a no-op here, and a no-op scroll never fires "scrollend", which would leave snap
    // suspended forever. Skip the animation path entirely rather than rely on it to clean itself up.
    list.scrollLeft = 0;
    requestAnimationFrame(restoreSnap);
  } else {
    // An instant teleport back to the start is jarring on every single pill click — ease into
    // it instead. Snap stays suspended for the ride so it can't re-fight the animation the same
    // way it fought the instant jump above. "scrollend" reports when the easing actually
    // finishes; the timeout is a safety net (older Safari has no "scrollend" at all, and even
    // where it's supported a scroll can in principle get interrupted without ever firing it) —
    // restoreSnap is idempotent, so both are safe to fire.
    list.scrollTo({ left: 0, behavior: "smooth" });
    list.addEventListener("scrollend", restoreSnap, { once: true });
    setTimeout(restoreSnap, 400);
  }

  // Distinct from region-data.js's "no attractions for this region at all" empty state — this
  // one only appears when data exists but the current filter combination matches none of it.
  let notice = list.querySelector("[data-filter-empty]");
  if (cards.length && visibleCount === 0) {
    if (!notice) {
      notice = document.createElement("li");
      notice.className = "empty-state";
      notice.dataset.filterEmpty = "";
      notice.textContent = "No attractions match this filter yet.";
      list.appendChild(notice);
    }
    notice.hidden = false;
  } else if (notice) {
    notice.hidden = true;
  }
}

export function init() {
  document.querySelectorAll(".attraction-filters__pills").forEach((group) => {
    const pills = Array.from(group.querySelectorAll(".filter-pill"));
    pills.forEach((pill) => {
      pill.addEventListener("click", () => {
        pills.forEach((p) => {
          p.classList.toggle("is-selected", p === pill);
          p.setAttribute("aria-pressed", String(p === pill));
        });
        applyFilters();
      });
    });
  });
}
