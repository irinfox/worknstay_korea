import { init as initNav } from "./nav.js";
import { init as initCalculator } from "./calculator.js";
import { init as initKoreaMap, applyResult } from "./korea-map.js";
import { init as initRegionCard } from "./region-card.js";
import { init as initRegionData } from "./region-data.js";
import { init as initRegionHeroGallery } from "./region-hero-gallery.js";
import { init as initRegionDetailMap } from "./region-detail-map.js";
import { init as initAttractionFilters } from "./attraction-filters.js";

initNav();
initKoreaMap();
// Phase 17 glue: calculator computes eligibility and renders its own caption; this is the only
// place that also tells the map about it (architecture.md §8 — map state only, not captions).
initCalculator(applyResult);
initRegionCard();
initRegionData();
initRegionHeroGallery();
initRegionDetailMap();
initAttractionFilters();
