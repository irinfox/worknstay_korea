// "Places to see nearby" filter pills — Area/Type are independent single-select groups that
// intersect (AND) to filter the already-rendered .attraction-card list. Cards carry their
// filter values as data-city/data-category attributes, set by region-data.js at render time —
// this module owns pill state + card visibility, region-data.js owns fetching/rendering the
// cards themselves. applyFilters() is exported so region-data.js can re-apply the current pill
// selection once live data replaces the loading placeholder (a pill can be clicked before the
// fetch resolves).
//
// "Elsewhere" (Area) is visually selectable but not wired yet (ROADMAP_TODO.md Phase 24) — an
// attraction only gets citySlug:null when its city has no KTO code yet or genuinely isn't in
// cityList, and distinguishing those needs its own design pass. Picking it behaves like "All"
// until then.

function selectedValue(pills) {
  const selected = pills.find((p) => p.classList.contains("is-selected"));
  return selected ? selected.dataset.filterValue : "all";
}

export function applyFilters(root = document) {
  const filtersEl = root.querySelector("[data-attraction-filters]");
  const list = root.querySelector("[data-region-attractions]");
  if (!filtersEl || !list) return;

  const areaPills = Array.from(filtersEl.querySelectorAll('[data-filter-group="area"]'));
  const typePills = Array.from(filtersEl.querySelectorAll('[data-filter-group="type"]'));
  const area = selectedValue(areaPills);
  const type = selectedValue(typePills);

  const cards = Array.from(list.querySelectorAll(".attraction-card"));
  let visibleCount = 0;
  cards.forEach((card) => {
    const matchesArea = area === "all" || area === "elsewhere" || card.dataset.city === area;
    const matchesType = type === "all" || card.dataset.category === type;
    const show = matchesArea && matchesType;
    card.hidden = !show;
    if (show) visibleCount += 1;
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
