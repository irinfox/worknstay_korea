import rules from "./visaRules.json" with { type: "json" };
import regionsFull from "./regions.json" with { type: "json" };
import populationDeclineAreas from "./populationDeclineAreas.json" with { type: "json" };

// Phase 16: the exact referenceData shape eligibility.js's calculateEligibility() takes,
// pre-assembled at build time and embedded as a JSON island in index.njk (see hero.njk) so
// calculator.js can read it with no extra network request and no server/database. `regions` is
// trimmed to the two fields calculateEligibility() actually reads (see eligibility.js's JSDoc)
// so the browser isn't sent each region's full copy/images/KTO codes a second time — those are
// only needed on the region's own page.
const regions = regionsFull.map((r) => ({ slug: r.slug, isCapitalArea: r.isCapitalArea }));

export default { rules, regions, populationDeclineAreas };
