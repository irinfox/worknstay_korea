// Desktop only (hero.css): locks .hero__spacer--top at its own already-rendered height, once,
// right after the calculator has done its initial render (including a URL-prefilled result, if
// any — main.js calls this after initCalculator()). Before this runs, CSS flex-grow already
// centred it correctly for whatever's on screen at that moment; this just freezes that value so a
// *later* submit — which can grow or shrink the calculator card — only ever pushes
// .hero__spacer--bottom and everything below it, never the headline. Below 768px .hero__spacer
// isn't rendered at all (hero.css), so this is a no-op there; without JS, calculator.js never
// reveals the real form either, so the shorter <noscript> card is all the plain CSS spacer ever
// has to centre — no lock needed in that case.
export function init() {
  if (!window.matchMedia("(min-width: 768px)").matches) return;

  const spacerTop = document.querySelector(".hero__spacer--top");
  if (!spacerTop) return;

  const height = spacerTop.getBoundingClientRect().height;
  spacerTop.style.flex = `0 0 ${height}px`;
}
