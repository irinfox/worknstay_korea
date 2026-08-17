/*
 * Burger-toggle behaviour for the primary nav. Without this module the nav list is always
 * visible (see header.css) — that's the JS-disabled fallback, not a broken state. Once this
 * runs, `.js-nav-ready` on <body> lets header.css collapse the list behind the burger below
 * the ~768px breakpoint.
 */
export function init() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggle || !nav) return;

  document.body.classList.add("js-nav-ready");

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}
