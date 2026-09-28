// Desktop only (hero.css): locks .hero__spacer--top at a computed height, once, right after the
// calculator's initial render (including a URL-prefilled result, if any — main.js calls this
// after initCalculator()). From then on the headline's position never changes for the rest of the
// page's lifetime — a later submit can only push .hero__spacer--bottom and everything below it.
//
// The frozen value is computed for the *worst-case* card height (WORST_CASE_CARD_HEIGHT below),
// not read from whatever's actually on screen at freeze time. An earlier version measured the
// live rendered height instead — correct for a submit that grows the card by a small amount, but
// on a short/tight viewport (900px-wide devtools, real height near 768) a card that starts empty
// (short) and later renders the longest caption grows more than .hero__spacer--bottom's floor
// could absorb, so .hero__cover (and the photo behind it, .hero__media's background-size: cover)
// overflowed past one viewport height and visibly rescaled. Computing against the worst case up
// front means .hero__spacer--bottom always has enough slack in reserve, however long a later
// caption turns out to be — this exactly reproduces the original hand-calibrated 93px top offset
// at the shortest supported viewport (900x768), just made viewport-height-aware above that floor.
//
// Below 768px .hero__spacer isn't rendered at all (hero.css), so this is a no-op there; without
// JS, calculator.js never reveals the real form either, so the shorter <noscript> card is all the
// plain CSS spacer ever has to centre — no lock needed in that case.
const TOP_FLOOR = 93;
const BOTTOM_FLOOR = 24;
const CUE_TOTAL = 57; // .hero__scroll-cue's own ~41px box + its 16px margin-bottom (hero.css)

// calculator.js CAPTIONS.nonCapitalOnly's under-₩1M caption ("Eligible outside the capital area
// … consult your embassy …"), the longest known result state, at the card's 520px max-width —
// measured, not guessed; re-measure if the copy or card width changes.
const WORST_CASE_CARD_HEIGHT = 345;

export function init() {
  if (!window.matchMedia("(min-width: 768px)").matches) return;

  const spacerTop = document.querySelector(".hero__spacer--top");
  const content = document.querySelector(".hero__content");
  const calculator = document.querySelector(".hero__calculator");
  if (!spacerTop || !content || !calculator) return;

  const contentRect = content.getBoundingClientRect();
  const gap = calculator.getBoundingClientRect().top - contentRect.bottom;
  const blockHeight = contentRect.height + gap + WORST_CASE_CARD_HEIGHT;

  const minTotal = TOP_FLOOR + blockHeight + BOTTOM_FLOOR + CUE_TOTAL;
  const slack = Math.max(0, window.innerHeight - minTotal);
  const topHeight = TOP_FLOOR + slack / 2;

  spacerTop.style.flex = `0 0 ${topHeight}px`;
}
