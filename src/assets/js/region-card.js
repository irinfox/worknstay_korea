// Home page, narrow viewport: tapping a map region scrolls the region-card carousel to that
// region's card instead of navigating straight there (wide-viewport hover/focus cross-highlight
// is pure CSS :has(), already shipped in korea-map.css/region-card.css — nothing to do here for
// that). Used to also read back an "available to you" badge on region pages from the
// calculator's sessionStorage write, but region pages deliberately don't remember a calculator
// run from the home page anymore — a region page reached any other way (direct link, search,
// nav) had no such run to remember, so the badge only ever showed for one specific navigation
// path and looked like a stale/broken feature the rest of the time.
// Matches --bp-region-info-wide in tokens.css (1120px) — same hardcode-and-comment constraint
// noted there, since custom properties aren't readable from JS media queries either.
const NARROW_QUERY = "(max-width: 1119px)";

function isNarrowViewport() {
  return window.matchMedia(NARROW_QUERY).matches;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Narrow viewport shows a carousel of all 6 real region-card links (index.njk / CLAUDE.md
// feedback log). Tapping a map region scrolls that carousel to the matching card rather than
// navigating straight there — the card is still a real <a href> the visitor then taps to open
// the region page. No data is copied anywhere: every card is already rendered from
// region-card.njk with whatever korea-map.js's applyResult() last wrote onto it.
function selectRegion(link, slug) {
  document
    .querySelectorAll(".korea-map .region--selected")
    .forEach((el) => el.classList.remove("region--selected"));
  link.classList.add("region--selected");

  const card = document.querySelector(`.region-carousel [data-region-slug="${slug}"]`);
  if (!card) return;

  const target = card.closest(".region-carousel__item") || card;
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "nearest",
    inline: "center",
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
