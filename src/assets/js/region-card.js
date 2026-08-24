// ROADMAP_TODO.md Phase 18 — home page, narrow viewport: tapping a map region fills the single
// card in place instead of navigating there directly (wide-viewport hover/focus cross-highlight
// is pure CSS :has(), already shipped in korea-map.css/region-card.css — nothing to do here for
// that). Used to also read back an "available to you" badge on region pages from the
// calculator's sessionStorage write, but region pages deliberately don't remember a calculator
// run from the home page anymore — a region page reached any other way (direct link, search,
// nav) had no such run to remember, so the badge only ever showed for one specific navigation
// path and looked like a stale/broken feature the rest of the time.
// Matches --bp-region-info-wide in tokens.css (768px) — same hardcode-and-comment constraint
// noted there, since custom properties aren't readable from JS media queries either.
const NARROW_QUERY = "(max-width: 767px)";

function isNarrowViewport() {
  return window.matchMedia(NARROW_QUERY).matches;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Both the wide-viewport infographic card and the narrow single card are rendered from the same
// region-card.njk partial with the same fields (architecture.md §3) — filling the single card by
// copying text/attributes from its infographic counterpart means there's no second copy of any
// region's data in JS, and it automatically carries whatever korea-map.js's applyResult() most
// recently wrote into the source card's eligibility caption.
function fillSingleCard(target, source) {
  target.dataset.regionSlug = source.dataset.regionSlug;
  target.querySelector(".region-card__name").textContent =
    source.querySelector(".region-card__name").textContent;
  target.querySelector(".region-card__score").textContent =
    source.querySelector(".region-card__score").textContent;
  target.querySelector(".region-card__tags").innerHTML =
    source.querySelector(".region-card__tags").innerHTML;
  target.querySelector(".region-card__intro").textContent =
    source.querySelector(".region-card__intro").textContent;

  const sourceCostValue = source.querySelector(".region-card__cost-value");
  const targetCostValue = target.querySelector(".region-card__cost-value");
  if (sourceCostValue && targetCostValue) {
    targetCostValue.textContent = sourceCostValue.textContent;
  }

  const sourceLink = source.querySelector(".region-card__link");
  const targetLink = target.querySelector(".region-card__link");
  const sourceHref = sourceLink.getAttribute("href");
  if (sourceHref) {
    targetLink.setAttribute("href", sourceHref);
    targetLink.removeAttribute("aria-disabled");
  } else {
    // Gated region (korea-map.js's applyResult() stripped this link's href too) — mirror that
    // here instead of copying a literal "null" href onto the clone.
    targetLink.removeAttribute("href");
    targetLink.setAttribute("aria-disabled", "true");
  }
}

function selectRegion(link, slug) {
  document
    .querySelectorAll(".korea-map .region--selected")
    .forEach((el) => el.classList.remove("region--selected"));
  link.classList.add("region--selected");

  const source = document.querySelector(`.region-infographic [data-region-slug="${slug}"]`);
  const target = document.querySelector(`.region-single [data-region-slug]`);
  if (!source || !target) return;

  fillSingleCard(target, source);
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

function initTapToFill() {
  const map = document.querySelector(".korea-map");
  if (!map) return;

  map.addEventListener("click", (event) => {
    const link = event.target.closest(".region[data-slug]");
    if (!link || !isNarrowViewport()) return;

    // Wide viewport lets the click navigate normally (architecture.md §3) — only narrow
    // viewport substitutes tap-to-fill-the-single-card for real navigation.
    event.preventDefault();
    selectRegion(link, link.dataset.slug);
  });
}

export function init() {
  initTapToFill();
}
