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
const CITY_CATEGORY_PRIORITY = {
  suncheon: "nature",
};

function selectedValue(pills) {
  const selected = pills.find((p) => p.classList.contains("is-selected"));
  return selected ? selected.dataset.filterValue : "all";
}

function knownAreaSlugs(areaPills) {
  return new Set(areaPills.map((p) => p.dataset.filterValue).filter((v) => v !== "all" && v !== "elsewhere"));
}

export function applyFilters(root = document) {
  const filtersEl = root.querySelector("[data-attraction-filters]");
  const list = root.querySelector("[data-region-attractions]");
  if (!filtersEl || !list) return;

  const areaPills = Array.from(filtersEl.querySelectorAll('[data-filter-group="area"]'));
  const typePills = Array.from(filtersEl.querySelectorAll('[data-filter-group="type"]'));
  const area = selectedValue(areaPills);
  const type = selectedValue(typePills);

  const knownAreas = knownAreaSlugs(areaPills);
  const cards = Array.from(list.querySelectorAll(".attraction-card"));
  const cityPriority = CITY_CATEGORY_PRIORITY[area];
  let visibleCount = 0;
  cards.forEach((card) => {
    const matchesArea =
      area === "all" || (area === "elsewhere" ? !knownAreas.has(card.dataset.city) : card.dataset.city === area);
    const matchesType = type === "all" || card.dataset.category === type;
    const show = matchesArea && matchesType;
    card.hidden = !show;
    if (show) visibleCount += 1;
    // Only ever touches the active override city's own cards, and only while its pill is
    // selected — every other card (and every other filter state) keeps the default order (unset
    // = 0 = DOM/source order), so "All"/"Elsewhere" are never affected.
    card.style.order = cityPriority && card.dataset.city === area && card.dataset.category !== cityPriority ? "1" : "";
  });

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
