import { applyFilters as applyAttractionFilters } from "./attraction-filters.js";
import { emptyState, escapeHtml, pinIcon } from "./html.js";

const SUBTITLE_DEFAULT = "What to explore in the region";
const SUBTITLE_QUOTA_EXCEEDED = "Top picks for today, the full list will be back tomorrow";
const SUBTITLE_FALLBACK = "Top picks, live attraction data is currently unavailable";
const FAILED_TEXT = "Couldn't load attractions, try again later.";

export function renderAttractions(container, data) {
  // Reset the subtitle on every render so a later re-fetch doesn't keep a stale message.
  const subtitle = document.querySelector("[data-attractions-subtitle]");
  if (subtitle) {
    subtitle.textContent = data.quotaExceeded
      ? SUBTITLE_QUOTA_EXCEEDED
      : data.fallback || data.liveFailed
        ? SUBTITLE_FALLBACK
        : SUBTITLE_DEFAULT;
  }
  if (data.failed) {
    container.innerHTML = emptyState(FAILED_TEXT, "li");
    return;
  }
  const attractions = data.items || [];
  if (!attractions.length) {
    container.innerHTML = emptyState("No attractions listed for this region right now.", "li");
    return;
  }
  container.innerHTML = attractions
    .map((a) => {
      // imageLicense is null for an unlicensed/missing image (normalize.mjs) — never render those.
      // data-fallback carries the other KTO image URL for setupImageFallback (one can 404).
      const primary = a.imageThumbUrl || a.imageUrl;
      const fallback = a.imageThumbUrl && a.imageUrl && a.imageUrl !== a.imageThumbUrl ? a.imageUrl : "";
      const media = a.imageLicense
        ? `<img class="attraction-card__media" src="${primary}"${fallback ? ` data-fallback="${fallback}"` : ""} alt="${escapeHtml(a.titleEn)}" loading="lazy">`
        : `<div class="media-placeholder attraction-card__media" aria-hidden="true"></div>`;
      // data-category/data-city let attraction-filters.js filter without a refetch.
      const category = a.category === "nature" ? "Nature" : "Culture";
      // Some KTO records have no address at all; omit the line rather than show a bare pin.
      const addressLine = a.address
        ? `<p class="attraction-card__address">${pinIcon("attraction-card__pin")}${escapeHtml(a.address)}</p>`
        : "";
      return `
        <li class="attraction-card" data-category="${a.category}" data-city="${a.citySlug || ""}">
          <div class="attraction-card__figure">
            ${media}
            <span class="attraction-card__category">${category}</span>
          </div>
          <h4>${escapeHtml(a.titleEn)}${a.titleKo ? ` <span class="attraction-card__ko">${escapeHtml(a.titleKo)}</span>` : ""}</h4>
          ${addressLine}
        </li>`;
    })
    .join("");
  setupImageFallback(container);
  applyAttractionFilters();
}

// A dead src swaps to the other KTO URL once; if that also 404s, swaps to the unlicensed placeholder.
function setupImageFallback(container) {
  container.querySelectorAll(".attraction-card__media[data-fallback]").forEach((img) => {
    img.addEventListener("error", function onError() {
      const fallback = img.dataset.fallback;
      if (fallback) {
        img.removeAttribute("data-fallback");
        img.src = fallback;
        return;
      }
      img.removeEventListener("error", onError);
      const placeholder = document.createElement("div");
      placeholder.className = "media-placeholder attraction-card__media";
      placeholder.setAttribute("aria-hidden", "true");
      img.replaceWith(placeholder);
    });
  });
}
