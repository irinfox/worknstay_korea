// Region-page hero photo gallery — pure enhancement. The CSS scroll-snap track
// (.region-hero-gallery__track, region-page.css) already lets a mouse-wheel/trackpad/touch swipe
// move between slides with zero JS (same no-JS-required pattern as .attraction-list); this module
// adds prev/next buttons, a "1 / N" counter, and an infinite autoplay loop on top. Nothing here
// gates content behind JS (rule 6) — with JS disabled it's a normal swipeable strip, just without
// looping or autoplay. (The dots container is optional: still supported if present, absent on the
// "Around the region" region-page gallery, which uses the counter instead.)
const AUTOPLAY_INTERVAL_MS = 4500;

export function init() {
  document.querySelectorAll("[data-region-hero-gallery]").forEach(setupGallery);
}

function setupGallery(root) {
  const track = root.querySelector(".region-hero-gallery__track");
  const dotsContainer = root.querySelector(".region-hero-gallery__dots");
  const counter = root.querySelector("[data-region-hero-counter]");
  const realSlides = track ? Array.from(track.children) : [];
  if (!track || realSlides.length <= 1) return;

  const count = realSlides.length;

  // Slides no longer fill the track (the "Around the region" strip shows one full slide plus a
  // peek of the next), so a page step is one slide's width + the flex gap, not track.clientWidth.
  const stepWidth = () => {
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return realSlides[0].getBoundingClientRect().width + gap;
  };

  // Infinite-loop trick: clone the last slide before the first and the first slide after the
  // last, so a swipe/scroll past either end lands on a visual duplicate. Once scroll settles
  // there, jump (no animation) to the real slide it duplicates — imperceptible since the clone
  // is pixel-identical. Internal index 0 and count+1 are the clones; 1..count are the real slides.
  const lastClone = realSlides[count - 1].cloneNode(true);
  const firstClone = realSlides[0].cloneNode(true);
  lastClone.setAttribute("aria-hidden", "true");
  firstClone.setAttribute("aria-hidden", "true");
  track.insertBefore(lastClone, realSlides[0]);
  track.appendChild(firstClone);

  const dots = [];
  if (dotsContainer) {
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "region-hero-gallery__dot";
      dot.setAttribute("aria-label", `Go to photo ${i + 1}`);
      dot.addEventListener("click", () => goTo(i + 1));
      dotsContainer.appendChild(dot);
      dots.push(dot);
    }
  }

  let internalIndex = 1;
  let settleTimer;
  let autoplayTimer;

  function setActive(realIndex) {
    dots.forEach((dot, i) => dot.setAttribute("aria-current", i === realIndex ? "true" : "false"));
    if (counter) counter.textContent = `${realIndex + 1} / ${count}`;
  }

  function goTo(index) {
    internalIndex = index;
    track.scrollTo({ left: stepWidth() * index, behavior: "smooth" });
  }

  function next() {
    goTo(internalIndex + 1);
  }

  function prev() {
    goTo(internalIndex - 1);
  }

  // Snap-correct out of the clone zone, then sync dots — runs after both button-driven smooth
  // scrolls and free-hand swipe/wheel scrolling settle.
  function handleSettle() {
    const step = stepWidth();
    const settledIndex = Math.round(track.scrollLeft / step);
    if (settledIndex === 0) {
      internalIndex = count;
      track.scrollLeft = step * internalIndex;
    } else if (settledIndex === count + 1) {
      internalIndex = 1;
      track.scrollLeft = step * internalIndex;
    } else {
      internalIndex = settledIndex;
    }
    setActive(internalIndex - 1);
  }

  track.addEventListener("scroll", () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(handleSettle, 120);
  });

  root.querySelector(".region-hero-gallery__nav--prev")?.addEventListener("click", prev);
  root.querySelector(".region-hero-gallery__nav--next")?.addEventListener("click", next);

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function startAutoplay() {
    if (prefersReducedMotion) return;
    stopAutoplay();
    autoplayTimer = setInterval(next, AUTOPLAY_INTERVAL_MS);
  }
  function stopAutoplay() {
    clearInterval(autoplayTimer);
  }

  root.addEventListener("mouseenter", stopAutoplay);
  root.addEventListener("mouseleave", startAutoplay);

  track.scrollLeft = stepWidth() * internalIndex;
  setActive(0);
  startAutoplay();
}
