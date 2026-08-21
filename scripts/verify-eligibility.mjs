// ROADMAP_TODO.md Phase 15 verify step: one hand-computed case per eligibility tier, run against
// the real data files (not fixtures) so this also catches drift if visaRules.json or
// populationDeclineAreas.json change. Run with: node scripts/verify-eligibility.mjs
import { calculateEligibility } from "../src/assets/js/eligibility.js";
import rules from "../src/_data/visaRules.json" with { type: "json" };
import regions from "../src/_data/regions.json" with { type: "json" };
import populationDeclineAreas from "../src/_data/populationDeclineAreas.json" with { type: "json" };

// Built once, reused for every case below — identical across all of them in real usage too
// (calculator.js sources this the same way for every calculator submission).
const referenceData = { rules, regions, populationDeclineAreas };

let failures = 0;

function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}`);
  if (!pass) {
    failures++;
    console.log(`  expected: ${JSON.stringify(expected)}`);
    console.log(`  actual:   ${JSON.stringify(actual)}`);
  }
}

// Sanity check on the source figures themselves (architecture.md §7 / visa_rules.pdf p.3's
// table), so a silent visaRules.json edit is caught here too. Asserts the actual threshold
// values (looked up via thresholdsByMultiplier, the same as eligibility.js does), not just the
// multipliers — multiplierCapitalArea/multiplierNonCapitalArea are display-only and can't be
// multiplied against gniPerCapitaKrw to reproduce these (MOJ derived them from the unrounded
// GNI); a prior version of this check only asserted the multipliers, which is why it didn't
// catch that bug.
const t = (multiplier) => rules.thresholdsByMultiplier[multiplier];
check(
  "visaRules.json matches visa_rules.pdf p.3's published thresholds",
  {
    gniPerCapitaKrw: rules.gniPerCapitaKrw,
    age18to34: [t(rules.ageBands[0].multiplierNonCapitalArea), t(rules.ageBands[0].multiplierCapitalArea)],
    age35plus: [t(rules.ageBands[1].multiplierNonCapitalArea), t(rules.ageBands[1].multiplierCapitalArea)],
    family: [t(rules.familyMultiplier.multiplierNonCapitalArea), t(rules.familyMultiplier.multiplierCapitalArea)],
  },
  {
    gniPerCapitaKrw: 52_410_000,
    age18to34: [52_410_000, 78_620_000],
    age35plus: [78_620_000, 104_830_000],
    family: [78_620_000, 104_830_000],
  }
);

// Case 1: below even the non-capital bar (age 25, ₩30M) -> ineligible everywhere.
check(
  "age 25, ₩30,000,000, no family -> ineligible, all 6 regions dimmed",
  (() => {
    const r = calculateEligibility({ salaryKrw: 30_000_000, age: 25, hasFamily: false }, referenceData);
    return { tier: r.tier, dimmedCount: r.dimmedRegionSlugs.length, partial: r.partialRegionSlugs };
  })(),
  { tier: "ineligible", dimmedCount: 6, partial: [] }
);

// Case 2: meets non-capital (₩52.41M) but not capital (₩78.62M) at age 25 -> nonCapitalOnly.
// Gyeonggi-do has population-decline counties (populationDeclineAreas.json), so it goes
// 'partial' rather than fully dimmed.
check(
  "age 25, ₩60,000,000, no family -> nonCapitalOnly, gyeonggi-do partial (not dimmed)",
  (() => {
    const r = calculateEligibility({ salaryKrw: 60_000_000, age: 25, hasFamily: false }, referenceData);
    return { tier: r.tier, dimmed: r.dimmedRegionSlugs, partial: r.partialRegionSlugs };
  })(),
  { tier: "nonCapitalOnly", dimmed: [], partial: ["gyeonggi-do"] }
);

// Case 3: meets both bars at age 40 (capital threshold ₩104.83M) -> all, nothing dimmed.
check(
  "age 40, ₩110,000,000, no family -> all, nothing dimmed or partial",
  (() => {
    const r = calculateEligibility({ salaryKrw: 110_000_000, age: 40, hasFamily: false }, referenceData);
    return { tier: r.tier, dimmed: r.dimmedRegionSlugs, partial: r.partialRegionSlugs };
  })(),
  { tier: "all", dimmed: [], partial: [] }
);

// Case 4: family flag overrides the age band regardless of age (architecture.md §7)
// — a 22-year-old with family meets the ₩78,620,000 non-capital family threshold but not the
// ₩104,830,000 capital family threshold.
check(
  "age 22, ₩80,000,000, hasFamily -> nonCapitalOnly (family multiplier, not age band)",
  (() => {
    const r = calculateEligibility({ salaryKrw: 80_000_000, age: 22, hasFamily: true }, referenceData);
    return { tier: r.tier, thresholdNonCapitalKrw: r.thresholdNonCapitalKrw, thresholdCapitalKrw: r.thresholdCapitalKrw };
  })(),
  { tier: "nonCapitalOnly", thresholdNonCapitalKrw: 78_620_000, thresholdCapitalKrw: 104_830_000 }
);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
