import { pageLoadHeaders } from "./tracker.js";

// Live Kakao study-café count per city card (functions/api/city/[slug]/study-cafes.js). Nothing
// is stored client-side. Retryable failures (network, 5xx) are retried once; quota (429)
// and other 4xx are not. All-or-nothing per page: live data is applied only if every city
// succeeded, otherwise every card keeps its server-rendered editorial fallback and the fallback
// note is shown, so live and editorial figures are never mixed on one page.
const CELLS_SELECTOR = ".study-cafes__cell";
const RETRY_DELAYS_MS = [300];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchLive(slug) {
  for (let attempt = 0; ; attempt++) {
    let retryable = true;
    try {
      const res = await fetch(`/api/city/${encodeURIComponent(slug)}/study-cafes`, { headers: pageLoadHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (!data.degraded) return data;
        retryable = data.retryable === true;
      } else {
        retryable = res.status >= 500;
      }
    } catch {
      // network error: retryable
    }
    if (!retryable || attempt >= RETRY_DELAYS_MS.length) return null;
    await wait(RETRY_DELAYS_MS[attempt]);
  }
}

// While the live call is in flight: empty battery + grey "loading…". The server-rendered
// fallback is snapshotted so it can be restored verbatim if the page falls back.
function showLoading(row) {
  const battery = row.querySelector(".study-cafes__battery");
  const count = row.querySelector("[data-study-cafes-count]");
  const saved = [battery.cloneNode(true), count.cloneNode(true)];
  battery.hidden = false;
  battery.querySelectorAll(CELLS_SELECTOR).forEach((cell) => cell.classList.remove("study-cafes__cell--on"));
  count.textContent = "loading…";
  count.classList.add("study-cafes__count--unrated");
  return () => {
    battery.replaceWith(saved[0]);
    count.replaceWith(saved[1]);
  };
}

function applyLive(row, data) {
  row.querySelector(".study-cafes__battery").hidden = false;
  row.querySelectorAll(CELLS_SELECTOR).forEach((cell, i) => {
    cell.classList.toggle("study-cafes__cell--on", i + 1 <= data.level);
  });
  const count = row.querySelector("[data-study-cafes-count]");
  count.textContent = data.label;
  count.classList.remove("study-cafes__count--unrated");
}

export async function init() {
  const rows = [...document.querySelectorAll("[data-study-cafes]")];
  if (!rows.length) return;
  const restore = rows.map(showLoading);
  const results = await Promise.all(rows.map((row) => fetchLive(row.dataset.city)));
  if (results.every(Boolean)) {
    rows.forEach((row, i) => applyLive(row, results[i]));
    document.querySelector("[data-study-cafes-live-note]").hidden = false;
  } else {
    restore.forEach((fn) => fn());
    const note = document.querySelector("[data-study-cafes-fallback-note]");
    note.hidden = false;
  }
}
