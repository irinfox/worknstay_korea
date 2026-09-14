// "Places to see nearby" filter pills — Area/Type are independent
// single-select groups. Visual selection state only: clicking a pill selects it and deselects
// its group's other pills (picking any pill this way already satisfies "picking All clears the
// group" and vice versa, since exactly one pill is ever selected). Does not filter
// .attraction-list yet — that's next-step data work once attractions carry a city/category.
export function init() {
  document.querySelectorAll(".attraction-filters__pills").forEach((group) => {
    const pills = Array.from(group.querySelectorAll(".filter-pill"));
    pills.forEach((pill) => {
      pill.addEventListener("click", () => {
        pills.forEach((p) => {
          p.classList.toggle("is-selected", p === pill);
          p.setAttribute("aria-pressed", String(p === pill));
        });
      });
    });
  });
}
