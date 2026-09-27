// Region-page detail map (Gangwon-do, Jeju-do): ski/surf/beach pin labels are hidden until
// hover/focus (region-detail-map.css), which phone users can never trigger. This adds the tap equivalent —
// tapping a pin toggles the same .map-pin--revealed class the CSS hover rules already key off, so
// there's one show/hide path, not a second one built in JS. Tapping elsewhere (another pin, or off
// the map entirely) dismisses whatever was revealed, and so does a timeout — a tap-revealed label
// has no hover-out to end it the way desktop's does, so left alone it would just sit open forever.
//
// Dismissing has to clear BOTH the class and DOM focus. A tap also focuses the <g tabindex="0">
// (native touch-to-click translation does this even though a synthetic click event doesn't, which
// is why this was missed in initial testing), and region-detail-map.css shows the label on :focus
// unconditionally (keyboard users need that, on every device, not just hover-capable ones) — so a
// pin left focused keeps its label visible no matter what the class says. Removing the class alone
// looked like nothing happened, on a real device, with real touch.
const REVEALABLE = ".map-pin--ski, .map-pin--surf, .map-pin--beach";
const REVEALED_CLASS = "map-pin--revealed";
const AUTO_DISMISS_MS = 3000;

let dismissTimer = null;

function clearDismissTimer() {
  clearTimeout(dismissTimer);
  dismissTimer = null;
}

function dismiss(pin) {
  pin.classList.remove(REVEALED_CLASS);
  if (document.activeElement === pin) pin.blur();
}

function closeAll(except) {
  document.querySelectorAll(`.${REVEALED_CLASS}`).forEach((pin) => {
    if (pin !== except) dismiss(pin);
  });
}

export function init() {
  const maps = document.querySelectorAll(".region-detail-map__svg");
  if (maps.length === 0) return;

  maps.forEach((svg) => {
    svg.addEventListener("click", (event) => {
      const pin = event.target.closest(REVEALABLE);
      clearDismissTimer();
      if (!pin) {
        closeAll();
        return;
      }
      const wasRevealed = pin.classList.contains(REVEALED_CLASS);
      closeAll(pin);
      if (wasRevealed) {
        dismiss(pin);
      } else {
        pin.classList.add(REVEALED_CLASS);
        dismissTimer = setTimeout(() => dismiss(pin), AUTO_DISMISS_MS);
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".region-detail-map__svg")) {
      clearDismissTimer();
      closeAll();
    }
  });
}
