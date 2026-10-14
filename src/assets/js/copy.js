// Copy-address buttons inside the events list.
export function setupAddressCopy(container) {
  // One shared "confirmed" slot: tapping a row clears the previous one; each reverts after 2s.
  let activeTimer = null;
  let activePlace = null;

  const reset = () => {
    if (!activePlace) return;
    const label = activePlace.querySelector(".event-place__copy-label");
    const status = activePlace.querySelector(".event-place__status");
    if (label) label.textContent = label.dataset.default || "Copy full address";
    if (status) status.textContent = "";
    activePlace.classList.remove("is-copied");
    activePlace = null;
  };

  container.querySelectorAll(".event-place__copy").forEach((btn) => {
    const place = btn.closest(".event-place");
    const label = place.querySelector(".event-place__copy-label");
    const status = place.querySelector(".event-place__status");
    btn.addEventListener("click", async () => {
      const address = btn.dataset.address || "";
      let ok = false;
      try {
        await navigator.clipboard.writeText(address);
        ok = true;
      } catch {
        ok = legacyCopy(address);
      }
      clearTimeout(activeTimer);
      reset();
      // Written to both slots: desktop shows the status, phone shows the label (event-timeline.css).
      const confirmText = ok ? "Full address copied" : "Press Ctrl+C to copy";
      if (label) label.textContent = confirmText;
      if (status) status.textContent = confirmText;
      place.classList.toggle("is-copied", ok);
      activePlace = place;
      activeTimer = setTimeout(reset, 2000);
    });
  });
}

function legacyCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
