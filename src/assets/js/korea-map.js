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

const POPULATION_DECLINE_COUNTIES_PAGE = "/regions/gyeonggi-do/population-decline-areas/";

function markPartial(link, countyNamesEn) {
  link.classList.remove("region--active");
  link.classList.add("region--partial");
  if (countyNamesEn.length > 0) {
    link.setAttribute("title", `Eligible counties: ${countyNamesEn.join(", ")} — click to see them.`);
  }
}

// Same dataset.originalHref swap-and-restore mechanism as dimLink/restoreLink, so restoreLink
// (called unconditionally at the top of every applyResult() pass) also undoes this on the next
// call without a third code path. A partial region's own page is a summary that doesn't mention
// which counties actually qualify — clicking through should land somewhere that does.
function pointLinkTo(link, href) {
  if (!link.dataset.originalHref) {
    link.dataset.originalHref = link.getAttribute("href");
  }
  link.setAttribute("href", href);
}

// The "Partly eligible" note plate (index.njk, [data-map-note]) is presentation-only: hidden by
// default, shown while a calculator run has marked a region partial. The static legend row
// carries the short meaning for everyone who never runs the calculator.
function setPartialNoteVisible(visible) {
  const el = document.querySelector("[data-map-note]");
  if (el) el.hidden = !visible;
}

export function applyResult(result, referenceData) {
  const populationDeclineAreas = (referenceData && referenceData.populationDeclineAreas) || [];

  setPartialNoteVisible(result.partialRegionSlugs.length > 0);

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
      pointLinkTo(mapLink, POPULATION_DECLINE_COUNTIES_PAGE);
      cardLinks.forEach((link) => pointLinkTo(link, POPULATION_DECLINE_COUNTIES_PAGE));
    }
  });
}

export function init() {}
