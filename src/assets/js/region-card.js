// Home page, narrow viewport: tapping a map region scrolls the region-card carousel to that
// region's card instead of navigating straight there (wide-viewport hover/focus cross-highlight
// is pure CSS :has(), already shipped in korea-map.css/region-card.css — nothing to do here for
// that). Used to also read back an "available to you" badge on region pages from the
// calculator's sessionStorage write, but region pages deliberately don't remember a calculator
// run from the home page anymore — a region page reached any other way (direct link, search,
// nav) had no such run to remember, so the badge only ever showed for one specific navigation
// path and looked like a stale/broken feature the rest of the time.
// Matches --bp-region-info-wide in tokens.css (1024px) — same hardcode-and-comment constraint
// noted there, since custom properties aren't readable from JS media queries either. Below this
// the infographic isn't drawn, so a map tap scrolls the carousel instead of navigating (the
// behaviour holds through the 768–1023 tablet band too, where hover can't be assumed).
const NARROW_QUERY = "(max-width: 1023.98px)";

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
// Shared by selectRegion (picks a new one) and deselectRegion (picks none) — both start by
// clearing whatever's currently marked, so there's never more than one selected region/card pair.
function clearSelection() {
  document
    .querySelectorAll(".korea-map .region--selected")
    .forEach((el) => el.classList.remove("region--selected"));
  // The green "selected" border on the carousel card comes only from a map tap — never from
  // tapping/focusing the card itself (the card body has no interactive state on phone).
  document
    .querySelectorAll(".region-carousel .region-card--selected")
    .forEach((el) => el.classList.remove("region-card--selected"));
}

function selectRegion(link, slug) {
  clearSelection();
  link.classList.add("region--selected");

  const card = document.querySelector(`.region-carousel [data-region-slug="${slug}"]`);
  if (card) card.classList.add("region-card--selected");
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
    if (!isNarrowViewport()) return;

    const link = event.target.closest(".region[data-slug]");
    if (!link) {
      // Tapped the map itself (sea, panel ground, gap between shapes) rather than a region —
      // there was previously no way to back out of a selection once made.
      clearSelection();
      return;
    }

    // Wide viewport lets the click navigate normally (architecture.md §3) — only narrow
    // viewport substitutes tap-to-fill-the-single-card for real navigation.
    event.preventDefault();
    selectRegion(link, link.dataset.slug);
  });
}

// Carousel dot indicators (homepage region carousel + region-page city carousel) track the
// scrolled-to card instead of pinning the first dot: on scroll, the dot for whichever card is
// nearest the track's centre line gets .is-active. Adding .*-synced hands the "which dot is
// lit" job from the CSS :first-child fallback to JS.
function syncCarouselDots({ root, track, items, dots, syncedClass }) {
  if (!track || items.length < 2 || dots.length !== items.length) return;

  root.classList.add(syncedClass);

  let active = -1;
  const setActive = (index) => {
    if (index === active) return;
    active = index;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  };

  const update = () => {
    const trackRect = track.getBoundingClientRect();
    const mid = trackRect.left + trackRect.width / 2;
    let best = 0;
    let bestDist = Infinity;
    items.forEach((item, i) => {
      const rect = item.getBoundingClientRect();
      const dist = Math.abs(rect.left + rect.width / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  };

  track.addEventListener("scroll", update, { passive: true });
  update();
}

function initCarouselDots() {
  document.querySelectorAll(".region-carousel").forEach((root) => {
    syncCarouselDots({
      root,
      track: root.querySelector(".region-carousel__track"),
      items: [...root.querySelectorAll(".region-carousel__item")],
      dots: [...root.querySelectorAll(".region-carousel__dots li")],
      syncedClass: "region-carousel--synced",
    });
  });

  document.querySelectorAll(".city-carousel").forEach((root) => {
    syncCarouselDots({
      root,
      track: root.querySelector(".city-card-list"),
      items: [...root.querySelectorAll(".city-card-list__item")],
      dots: [...root.querySelectorAll(".city-carousel__dots li")],
      syncedClass: "city-carousel--synced",
    });
  });
}

export function init() {
  initTapToFill();
  initCarouselDots();
}
