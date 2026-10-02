// Live Kakao study-café count per city card (functions/api/city/[slug]/study-cafes.js). Nothing
// is stored client-side either. On any failure the card keeps its server-rendered fallback.
const CELLS_SELECTOR = ".study-cafes__cell";

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
  if (!data) return;
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
