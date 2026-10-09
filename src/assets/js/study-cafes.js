// Live Kakao study-café count per city card (functions/api/city/[slug]/study-cafes.js). Nothing
// is stored client-side either. On any failure the card keeps its server-rendered editorial
// fallback level and the region page's fallback note is shown.
const CELLS_SELECTOR = ".study-cafes__cell";
const FALLBACK_NOTE =
  "Study-café data is a manual editorial estimate, last updated in October 2026. Live data currently unavailable.";

async function fetchLive(slug) {
  try {
    const res = await fetch(`/api/city/${encodeURIComponent(slug)}/study-cafes`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.degraded ? null : data;
  } catch {
    return null;
  }
}

async function update(row) {
  const data = await fetchLive(row.dataset.city);
  if (!data) {
    // Quota (429) or any other failed call: the card keeps its editorial fallback, so say so.
    if ("hasFallback" in row.dataset) {
      const note = document.querySelector("[data-study-cafes-fallback-note]");
      note.textContent = FALLBACK_NOTE;
      note.hidden = false;
      document.querySelector("[data-study-cafes-live-note]").hidden = true;
    }
    return;
  }
  if (document.querySelector("[data-study-cafes-fallback-note]").hidden) {
    document.querySelector("[data-study-cafes-live-note]").hidden = false;
  }
  row.querySelector(".study-cafes__battery").hidden = false;
  row.querySelectorAll(CELLS_SELECTOR).forEach((cell, i) => {
    cell.classList.toggle("study-cafes__cell--on", i + 1 <= data.level);
  });
  const count = row.querySelector("[data-study-cafes-count]");
  count.textContent = data.label;
  count.classList.remove("study-cafes__count--unrated");
}

export function init() {
  document.querySelectorAll("[data-study-cafes]").forEach(update);
}
