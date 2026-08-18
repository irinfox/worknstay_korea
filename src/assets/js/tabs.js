// Progressive enhancement over the real anchor-based tabs in partials/tabs.njk (CLAUDE.md rule
// 6): without this module, every .region-section stays visible and tab links are plain anchor
// jumps. With it, only the active section shows and links behave like real ARIA tabs.
export function init() {
  document.querySelectorAll(".tabs__nav").forEach(enhance);
}

function enhance(nav) {
  const list = nav.querySelector("ul");
  const links = Array.from(nav.querySelectorAll("a[href^='#']"));
  const panels = links.map((link) => document.getElementById(link.getAttribute("href").slice(1)));

  if (!list || links.length < 2 || panels.some((panel) => !panel)) return;

  document.body.classList.add("js-tabs-ready");
  list.setAttribute("role", "tablist");
  links.forEach((link, i) => {
    link.id = link.id || `tab-${panels[i].id}`;
    link.setAttribute("role", "tab");
    link.setAttribute("aria-controls", panels[i].id);
    link.parentElement.setAttribute("role", "presentation");
    panels[i].setAttribute("role", "tabpanel");
    panels[i].setAttribute("aria-labelledby", link.id);
    panels[i].tabIndex = -1;
  });

  function activate(index, { focusPanel = false, updateHash = false } = {}) {
    links.forEach((link, i) => {
      const isActive = i === index;
      link.setAttribute("aria-selected", String(isActive));
      link.tabIndex = isActive ? 0 : -1;
      panels[i].hidden = !isActive;
    });
    if (updateHash) history.replaceState(null, "", links[index].getAttribute("href"));
    if (focusPanel) panels[index].focus();
  }

  links.forEach((link, i) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      activate(i, { updateHash: true });
    });
    link.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next = event.key === "ArrowRight" ? (i + 1) % links.length : (i - 1 + links.length) % links.length;
      links[next].focus();
      activate(next, { updateHash: true });
    });
  });

  const hashIndex = panels.findIndex((panel) => "#" + panel.id === location.hash);
  activate(hashIndex === -1 ? 0 : hashIndex, { focusPanel: hashIndex !== -1 });
}
