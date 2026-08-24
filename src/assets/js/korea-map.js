// ROADMAP_TODO.md Phase 17: applyResult() toggles .region--active/--partial/--ineligible on the
// map's real <a href> region links and click-gates ineligible ones. Click-gating means the
// element stops being a link at all (href removed) rather than staying a link with JS-only
// preventDefault — CLAUDE.md rule 6 already requires every region link to be a real <a href>,
// so "gated" has to mean "not a link right now," not "a link that lies about being clickable."
//
// The gate has to cover both entry points to a region page, not just the map shape: each
// region-card's own "Learn more →" link (region-card.njk) is always-visible in the wide-viewport
// infographic, so leaving it live would make the map's gating purely decorative — CLAUDE.md's
// feedback log is explicit that ineligible regions aren't clickable through, full stop.
const STATE_CLASSES = ["region--active", "region--partial", "region--ineligible"];

function regionLinks() {
  return document.querySelectorAll(".korea-map .region[data-slug]");
}

function regionCardLinks(slug) {
  return document.querySelectorAll(`[data-region-slug="${slug}"] .region-card__link`);
}

// Shared by both link kinds (map shape, region-card "Learn more →") — same href/aria-disabled
// treatment either way, just different host elements.
function restoreLink(link) {
  if (link.dataset.originalHref) {
    link.setAttribute("href", link.dataset.originalHref);
    delete link.dataset.originalHref;
  }
  link.removeAttribute("aria-disabled");
}

function dimLink(link) {
  link.dataset.originalHref = link.getAttribute("href");
  link.removeAttribute("href");
  link.setAttribute("aria-disabled", "true");
}

// Every call restores every region to baseline (active, real href) before applying the new
// result, rather than layering classes on top of whatever the previous run left — otherwise a
// region eligible under this result but dimmed by a previous one would stay stuck dimmed
// (architecture.md §8 "restore path").
function restoreMapLink(link) {
  link.classList.remove(...STATE_CLASSES);
  link.classList.add("region--active");
  restoreLink(link);
  link.removeAttribute("title");
}

function dimMapLink(link) {
  link.classList.remove("region--active");
  link.classList.add("region--ineligible");
  dimLink(link);
}

const POPULATION_DECLINE_COUNTIES_PAGE = "/regions/gyeonggi-do/population-decline-counties/";

function markPartial(link, countyNamesEn) {
  link.classList.remove("region--active");
  link.classList.add("region--partial");
  if (countyNamesEn.length > 0) {
    link.setAttribute("title", `Eligible counties: ${countyNamesEn.join(", ")}.`);
  }
}

// Static 3-item color key (index.njk) lives beneath the map at every width; this is just its one
// dynamic line — the actual county list for whichever region is currently hatched, plus a link to
// the dedicated counties page. Only gyeonggi-do can ever be partial (architecture.md §7 — it's
// the only capital-tier region), so there's never more than one hatched region to describe at
// once. innerHTML (not textContent) because of that link — county names are our own build-time
// data, not user input, so this doesn't open an injection risk.
function setLegendDetail(html) {
  const el = document.querySelector("[data-map-legend-detail]");
  if (!el) return;
  el.innerHTML = html || "";
  el.hidden = !html;
}

export function applyResult(result, referenceData) {
  const populationDeclineAreas = (referenceData && referenceData.populationDeclineAreas) || [];

  setLegendDetail("");

  regionLinks().forEach((mapLink) => {
    restoreMapLink(mapLink);
    const slug = mapLink.dataset.slug;
    const cardLinks = regionCardLinks(slug);
    cardLinks.forEach(restoreLink);

    if (result.dimmedRegionSlugs.includes(slug)) {
      dimMapLink(mapLink);
      cardLinks.forEach(dimLink);
    } else if (result.partialRegionSlugs.includes(slug)) {
      const counties = populationDeclineAreas
        .filter((area) => area.provinceSlug === slug)
        .map((area) => area.countyNameEn);
      markPartial(mapLink, counties);
      setLegendDetail(
        (counties.length > 0
          ? `Hatched area — eligible counties: ${counties.join(", ")}.`
          : "Hatched area — eligible counties vary by region.") +
          ` <a href="${POPULATION_DECLINE_COUNTIES_PAGE}">Learn more →</a>`
      );
    }
  });
}

export function init() {}
