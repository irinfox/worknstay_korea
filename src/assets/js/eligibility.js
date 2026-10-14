// Pure function, no DOM access, trivially testable.
// Two-object signature, deliberately not flat positional args: `userInput` (what the visitor
// typed) vs `referenceData` (what the site already knows — visa thresholds + region/decline
// data from _data/*.json, per CLAUDE.md). Splitting it this way also removes a real bug
// risk flat args have here — two same-shaped values sitting next to each other positionally
// (two arrays: regions/populationDeclineAreas; two numbers: salaryKrw/age) are easy to
// transpose by accident with nothing to catch it. Named fields can't be silently swapped.
// referenceData is passed in rather than imported so this stays pure — calculator.js
// sources it and calls this function; this module never touches the DOM or fetches
// anything itself.
//
// ARCHITECTURE.md: tier stays a 3-way `ineligible | nonCapitalOnly | all` — partiality is
// per-region (today only gyeonggi-do), carried via partialRegionSlugs[] rather than a 4th tier.

// Precondition, not a runtime edge case this function is expected to handle: callers must
// validate age >= visaRules.additionalFacts.minApplicantAge (18) before calling
// calculateEligibility(). A 17-year-old typing their age is routine input, but the right
// response ("F-1-D applicants must be 18 or older") is a form-validation message, not a tier —
// calculator.js's inline validation is what's meant to catch this, not a try/catch here.
function ageBandFor(age, rules) {
  const band = rules.ageBands.find(
    (b) => age >= b.minAge && (b.maxAge === null || age <= b.maxAge)
  );
  if (!band) {
    throw new Error(`No age band in visaRules.ageBands covers age ${age}`);
  }
  return band;
}

// visaRules.thresholdsByMultiplier stores each of the 3 distinct published KRW figures exactly
// once, keyed by multiplier — ageBands/familyMultiplier just name which one applies.
function thresholdFor(multiplier, rules) {
  const thresholdKrw = rules.thresholdsByMultiplier[multiplier];
  if (thresholdKrw === undefined) {
    throw new Error(`No threshold in visaRules.thresholdsByMultiplier for multiplier ${multiplier}`);
  }
  return thresholdKrw;
}

/**
 * @param {object} userInput
 * @param {number} userInput.salaryKrw - annual salary in KRW
 * @param {number} userInput.age
 * @param {boolean} userInput.hasFamily - accompanying spouse/minor children (ARCHITECTURE.md
 *   visa eligibility rules: overrides the age-based multiplier with a flat family multiplier,
 *   regardless of age)
 * @param {object} referenceData
 * @param {object} referenceData.rules - visaRules.json
 * @param {object[]} referenceData.regions - regions.json entries; only `slug`/`isCapitalArea`
 *   are read, so a trimmed projection is fine — no need to ship the full record (longIntro,
 *   heroImageIds, KTO codes, ...) to the client just to feed this function.
 * @param {object[]} referenceData.populationDeclineAreas - populationDeclineAreas.json entries;
 *   only `provinceSlug` is read.
 * @returns {{
 *   tier: 'ineligible'|'nonCapitalOnly'|'all',
 *   dimmedRegionSlugs: string[],
 *   partialRegionSlugs: string[],
 *   thresholdCapitalKrw: number,
 *   thresholdNonCapitalKrw: number,
 *   gapToNonCapitalKrw: number,
 *   gapToCapitalKrw: number,
 * }}
 */
export function calculateEligibility(userInput, referenceData) {
  const { salaryKrw, age, hasFamily } = userInput;
  const { rules, regions, populationDeclineAreas } = referenceData;

  // familyMultiplier and each ageBand share the exact same shape
  // ({ multiplierCapitalArea, multiplierNonCapitalArea }), so no per-branch remapping needed.
  const { multiplierCapitalArea, multiplierNonCapitalArea } = hasFamily
    ? rules.familyMultiplier
    : ageBandFor(age, rules);
  const thresholdCapitalKrw = thresholdFor(multiplierCapitalArea, rules);
  const thresholdNonCapitalKrw = thresholdFor(multiplierNonCapitalArea, rules);

  const meetsNonCapital = salaryKrw >= thresholdNonCapitalKrw;
  const meetsCapital = salaryKrw >= thresholdCapitalKrw;

  const tier = !meetsNonCapital ? "ineligible" : !meetsCapital ? "nonCapitalOnly" : "all";

  const declineProvinceSlugs = new Set(populationDeclineAreas.map((a) => a.provinceSlug));
  const dimmedRegionSlugs = [];
  const partialRegionSlugs = [];

  if (tier === "ineligible") {
    dimmedRegionSlugs.push(...regions.map((r) => r.slug));
  } else if (tier === "nonCapitalOnly") {
    for (const region of regions.filter((r) => r.isCapitalArea)) {
      if (declineProvinceSlugs.has(region.slug)) {
        partialRegionSlugs.push(region.slug);
      } else {
        dimmedRegionSlugs.push(region.slug);
      }
    }
  }
  // tier === "all": every region is fully open, nothing dimmed or partial.

  return {
    tier,
    dimmedRegionSlugs,
    partialRegionSlugs,
    thresholdCapitalKrw,
    thresholdNonCapitalKrw,
    // Separate gaps, not one: in the nonCapitalOnly tier the interesting caption is "how much
    // more to unlock the capital area," which a single non-capital-only gap can't express
    // (it's already 0 there). Each is 0 once that bar is cleared.
    gapToNonCapitalKrw: meetsNonCapital ? 0 : thresholdNonCapitalKrw - salaryKrw,
    gapToCapitalKrw: meetsCapital ? 0 : thresholdCapitalKrw - salaryKrw,
  };
}
