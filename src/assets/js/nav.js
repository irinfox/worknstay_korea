/*
 * Burger-toggle behaviour for the primary nav. Without this module the nav list is always
 * visible (see header.css) — that's the JS-disabled fallback, not a broken state. `.js-nav-ready`
 * on <body> (which lets header.css collapse the list behind the burger below the ~768px
 * breakpoint) is added by an inline sync script in base.njk, not here — this module is a
 * deferred `type="module"`, which runs too late to avoid a flash of the fallback nav on load.
 */
export function init() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  const backdrop = document.querySelector("[data-nav-backdrop]");
  if (!toggle || !nav) return;

  // header.css's slide transition only exists while .nav-animate is present — it's added here,
  // right around a real open/close, and removed once the animation's had time to finish. That
  // keeps a browser/devtools-driven style recalculation (crossing the 768px breakpoint by
  // resizing a window, or toggling mobile emulation) from ever animating: since .nav-animate
  // isn't present at that moment, the transform snaps instantly with no slide, instead of the
  // list visibly (and spuriously) sliding open.
  let animateTimer;
  const setOpen = (isOpen) => {
    nav.classList.add("nav-animate");
    clearTimeout(animateTimer);
    animateTimer = setTimeout(() => nav.classList.remove("nav-animate"), 350);

    nav.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (backdrop) backdrop.hidden = !isOpen;
  };

  toggle.addEventListener("click", () => {
    setOpen(!nav.classList.contains("is-open"));
  });

  if (backdrop) {
    backdrop.addEventListener("click", () => setOpen(false));
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });
}
