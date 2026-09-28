// calculator.js's validate() is pure (no DOM) specifically so it can be checked here, the same
// way scripts/verify-eligibility.mjs checks eligibility.js. Run with:
//   node scripts/verify-calculator.mjs
import { validate, captionFor } from "../src/assets/js/calculator.js";

let failures = 0;

function check(label, actual, expected) {
  const pass = actual === expected;
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}`);
  if (!pass) {
    failures++;
    console.log(`  expected: ${JSON.stringify(expected)}`);
    console.log(`  actual:   ${JSON.stringify(actual)}`);
  }
}

function messageFor(salaryRaw, ageRaw) {
  const userInput = { salaryKrw: Number(salaryRaw), age: Number(ageRaw), hasFamily: false };
  return validate(userInput, { salaryRaw, ageRaw });
}

check("empty salary, valid age -> flags salary only", messageFor("", "30"), "Please enter your annual income.");
check("valid salary, empty age -> flags age only", messageFor("60000000", ""), "Please enter your age.");
check("both empty -> flags both fields", messageFor("", ""), "Please enter your age and annual income.");

// A salary of 0 — blank, "0", or all-zeros — is not an answer: it's flagged for entry, not run
// as a trivially "not eligible" result. (Age still needs the raw-string check: Number("") is 0,
// so a blank age must not read as age 0 → "must be 18+".)
check('salary "0", valid age -> flags salary', messageFor("0", "30"), "Please enter your annual income.");
check('salary "000", valid age -> flags salary', messageFor("000", "30"), "Please enter your annual income.");

check("negative salary -> rejected", messageFor("-1", "30"), "Enter an income of 0 or more.");
check(
  "age under 18 -> rejected",
  messageFor("60000000", "15"),
  "F-1-D applicants must be 18 or older."
);
check("valid salary and age -> passes", messageFor("60000000", "30"), null);

// Result-caption rounding rules (calculator.js CAPTIONS): below ₩1M the gap collapses to a fixed
// "less than ₩1M" sentence instead of a computed figure; ₩1M and above it's a .toFixed(1) "₩{n}M"
// figure. captionFor() only reads the tier's own gap field, so these fixtures can leave every
// other EligibilityResult field at 0/empty.
function resultFor(tier, gapToNonCapitalKrw, gapToCapitalKrw) {
  return {
    tier,
    dimmedRegionSlugs: [],
    partialRegionSlugs: [],
    thresholdCapitalKrw: 0,
    thresholdNonCapitalKrw: 0,
    gapToNonCapitalKrw,
    gapToCapitalKrw,
  };
}

check(
  "ineligible, gap under 1M -> fixed sentence, no computed figure",
  captionFor(resultFor("ineligible", 400000, 0)),
  "Not eligible yet. You need less than ₩1M more to meet the minimum threshold. Consult with " +
    "your embassy about the conversion rate they use."
);
check(
  "ineligible, gap over 1M -> rounded to one decimal place",
  captionFor(resultFor("ineligible", 7549999, 0)),
  "Not eligible yet. You need about ₩7.5M more to reach the minimum threshold."
);
check(
  "nonCapitalOnly, gap under 1M -> fixed sentence, no computed figure",
  captionFor(resultFor("nonCapitalOnly", 0, 999999)),
  "Eligible outside the capital area and in population-decline areas. You need less than ₩1M " +
    "more to be eligible everywhere. Consult with your embassy about the conversion rate they use."
);
check(
  "nonCapitalOnly, gap over 1M -> rounded to one decimal place",
  captionFor(resultFor("nonCapitalOnly", 0, 12250000)),
  "Eligible outside the capital area and in population-decline areas. To be eligible " +
    "everywhere you'll need about ₩12.3M more."
);
check("all tier -> no gap language", captionFor(resultFor("all", 0, 0)), "Eligible everywhere.");

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
