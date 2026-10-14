// Shared sticky section-nav strip (.section-nav), used on visa-info, settling-in and every
// region page: highlights whichever section is current, and reveals the "Top" link — both gated
// on the strip having actually stuck to the top of the viewport (not just "scrolled some").
// Without this module the strip is still fully usable — real <a href> section links, and "Top"
// jumps to #top via native anchor behaviour (progressive enhancement, CLAUDE.md).
// Behaviour is documented in DESIGN.md ("Section nav strip"). Sections that sit at the same
// vertical position (the region page's Rent/Events band, side by side on desktop) light up
// together — detected by actual layout, not markup, so it also self-corrects on phone once the
// same band stacks and the tie no longer holds.

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Matches .section-nav' own `top: 12px` (section-nav.css) — the offset position:sticky pins
// it to once stuck. Custom properties aren't readable from JS, so this is a hardcoded mirror of
// that value, same tradeoff as region-card.js's NARROW_QUERY.
const STICKY_TOP = 12;

// A section becomes current once its heading crosses this line — a fixed fraction of the
// viewport, not the strip's own (much shorter) height, so a short section still gets a turn
// instead of its heading crossing the strip and the next one right behind it in the same tick.
const TRIGGER_RATIO = 0.4;

// A short final section (Useful links, or a future page's Food) can sit entirely above this line
// once the document has scrolled as far as it goes, and would otherwise never get to be "current".
// Within this many px of the true bottom, the last link wins outright.
const BOTTOM_EPSILON = 4;

// Breathing room between the strip and a jumped-to heading, once scroll-margin-top (below) has
// already cleared the strip itself — same unit as --space-4, just not readable from JS.
const SCROLL_MARGIN_GAP = 16;

export function init() {
  const nav = document.querySelector(".section-nav");
  if (!nav) return;

  const links = [...nav.querySelectorAll(".section-nav__links a[href^='#']")];
  const sections = links
    .map((link) => ({ link, section: document.getElementById(link.getAttribute("href").slice(1)) }))
    .filter((entry) => entry.section);
  if (!sections.length) return;

  const topLink = nav.querySelector(".section-nav__top");

  // A plain anchor jump (clicking a section link, including via keyboard, or loading the page
  // straight onto a #hash) lands the target's top flush with the viewport top — right under the
  // sticky strip, which then sits on top of the heading instead of above it. scroll-margin-top on
  // each target pushes the landing spot down to clear the strip; recomputed on resize since the
  // strip's own height changes across the 768px breakpoint (section-nav.css).
  const syncScrollMargin = () => {
    const offset = `${Math.ceil(nav.getBoundingClientRect().height) + STICKY_TOP + SCROLL_MARGIN_GAP}px`;
    sections.forEach(({ section }) => {
      section.style.scrollMarginTop = offset;
    });
  };
  syncScrollMargin();

  // Groups of links whose target sections share the same document-relative top (a tie, within
  // rounding) — recomputed on resize since a tie only holds at the viewport widths where its
  // sections actually sit side by side; below that breakpoint they stack and stop tying. Plain
  // pages never tie (every section starts below the last), so this is a no-op single-link group
  // for them.
  let tieGroups = [];
  const syncTieGroups = () => {
    const buckets = [];
    sections.forEach(({ link, section }) => {
      const top = Math.round(section.getBoundingClientRect().top + window.scrollY);
      const bucket = buckets.find((b) => Math.abs(b.top - top) <= 1);
      if (bucket) bucket.links.push(link);
      else buckets.push({ top, links: [link] });
    });
    tieGroups = buckets.map((b) => b.links);
  };
  syncTieGroups();
  const groupOf = (link) => tieGroups.find((group) => group.includes(link)) || [link];

  window.addEventListener("resize", () => {
    syncScrollMargin();
    syncTieGroups();
  }, { passive: true });

  let activeLinks = [];
  const sameLinks = (a, b) => a.length === b.length && a.every((link, i) => link === b[i]);
  const setActive = (targets) => {
    const next = targets || [];
    if (sameLinks(next, activeLinks)) return;
    activeLinks.forEach((link) => link.classList.remove("is-active"));
    activeLinks = next;
    activeLinks.forEach((link) => link.classList.add("is-active"));
  };

  // A clicked link wins immediately, whatever the scroll-driven computation below would say —
  // the browser's own smooth-scroll can take a while to land, and a short/final section's target
  // heading may never actually reach the trigger line (or even the very top). "pinned" freezes
  // the active link at the click until the visitor scrolls under their own power again; a
  // programmatic scroll (the anchor jump itself, or the Top button) only ever fires "scroll", so
  // it can't accidentally clear the pin.
  let pinned = false;
  const unpin = () => {
    pinned = false;
  };
  ["wheel", "touchstart", "keydown"].forEach((type) => window.addEventListener(type, unpin, { passive: true }));

  links.forEach((link) => {
    link.addEventListener("click", () => {
      pinned = true;
      setActive(groupOf(link));
    });
  });

  const update = () => {
    // getBoundingClientRect().top sits above STICKY_TOP while the strip is still in normal flow,
    // and settles to exactly STICKY_TOP once position: sticky has pinned it — the standard way to
    // detect "is this sticky element currently stuck" without a separate sentinel element.
    const stuck = nav.getBoundingClientRect().top <= STICKY_TOP + 0.5;
    if (topLink) topLink.classList.toggle("is-visible", stuck);

    if (pinned) return;

    if (!stuck) {
      setActive([]);
      return;
    }

    const doc = document.documentElement;
    const atBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - BOTTOM_EPSILON;
    if (atBottom) {
      setActive(groupOf(links[links.length - 1]));
      return;
    }

    const triggerY = window.innerHeight * TRIGGER_RATIO;
    let current = null;
    sections.forEach(({ link, section }) => {
      if (section.getBoundingClientRect().top <= triggerY) current = link;
    });
    setActive(current ? groupOf(current) : []);
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();

  if (!topLink) return;

  // Overrides the native #top jump (which only reaches the top of the page's own wrapper, right
  // below the dark nav bar) with a scroll to the true document top, so the nav bar comes back
  // into view. Same "click wins" pin as the section links: without it, the scroll-driven
  // recompute keeps running for the whole smooth-scroll-to-top animation, so the active link
  // flickers through every section it passes on the way up instead of just clearing once,
  // immediately.
  topLink.addEventListener("click", (event) => {
    event.preventDefault();
    pinned = true;
    setActive([]);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  });
}
