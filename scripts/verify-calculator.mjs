// calculator.js's validate() is pure (no DOM) specifically so it can be checked here, the same
// way scripts/verify-eligibility.mjs checks eligibility.js. Run with:
//   node scripts/verify-calculator.mjs
import { validate } from "../src/assets/js/calculator.js";

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

const EMPTY_FIELD_PREFIX =
  "Eligibility is based on your age, salary, and whether family is accompanying you — " +
  "please fill in ";

check(
  "empty salary, valid age -> flags salary only",
  messageFor("", "30"),
  `${EMPTY_FIELD_PREFIX}your annual salary.`
);
check(
  "valid salary, empty age -> flags age only",
  messageFor("60000000", ""),
  `${EMPTY_FIELD_PREFIX}your age.`
);
check(
  "both empty -> flags both fields",
  messageFor("", ""),
  `${EMPTY_FIELD_PREFIX}your annual salary and age.`
);

// A salary of 0 — blank, "0", or all-zeros — is not an answer: it's flagged for entry, not run
// as a trivially "not eligible" result. (Age still needs the raw-string check: Number("") is 0,
// so a blank age must not read as age 0 → "must be 18+".)
check('salary "0", valid age -> flags salary', messageFor("0", "30"), `${EMPTY_FIELD_PREFIX}your annual salary.`);
check('salary "000", valid age -> flags salary', messageFor("000", "30"), `${EMPTY_FIELD_PREFIX}your annual salary.`);

check("negative salary -> rejected", messageFor("-1", "30"), "Enter a salary of 0 or more.");
check(
  "age under 18 -> rejected",
  messageFor("60000000", "15"),
  "F-1-D requires applicants to be 18+."
);
check("valid salary and age -> passes", messageFor("60000000", "30"), null);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
