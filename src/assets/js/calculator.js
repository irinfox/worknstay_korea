import { calculateEligibility } from "./eligibility.js";

// ARCHITECTURE.md §7 / eligibility.js precondition: age must be validated >= this before
// calling calculateEligibility() — this function doesn't handle under-18 itself.
const MIN_APPLICANT_AGE = 18;

const MILLION = 1_000_000;

// Below ₩1M, a .toFixed(1) figure ("₩0.3M") reads as false precision for a gap this small and
// currency-conversion rounding could erase it entirely — so this range gets a fixed sentence
// instead of a computed number, plus a nudge to check the applicant's own embassy rate.
//
// A gap just above that cutoff (e.g. ₩1,020,000) still rounds to a whole million — stripping the
// trailing ".0" shows "₩1M" instead of "₩1.0M", which reads like a typo sitting right next to the
// "less than ₩1M" wording used just below the cutoff. Genuinely fractional gaps ("₩7.5M") keep
// their decimal.
function formatGapMillions(gapKrw) {
  const rounded = (gapKrw / MILLION).toFixed(1).replace(/\.0$/, "");
  return `₩${rounded}M`;
}

const CAPTIONS = {
  ineligible: (result) => {
    const gap = result.gapToNonCapitalKrw;
    const gapSentence =
      gap < MILLION
        ? "You need less than ₩1M more to meet the minimum threshold. Consult with your " +
          "embassy about the conversion rate they use."
        : `You need about ${formatGapMillions(gap)} more to reach the minimum threshold.`;
    return `Not eligible yet. ${gapSentence}`;
  },
  nonCapitalOnly: (result) => {
    const gap = result.gapToCapitalKrw;
    const gapSentence =
      gap < MILLION
        ? "You need less than ₩1M more to be eligible everywhere. Consult with your embassy " +
          "about the conversion rate they use."
        : `To be eligible everywhere you'll need about ${formatGapMillions(gap)} more.`;
    return `Eligible outside the capital area and in population-decline areas. ${gapSentence}`;
  },
  all: () => "Eligible everywhere.",
};

const FULL_RULES_LINK = ' <a href="/visa-info/">Visa info →</a>';

// Plate tint follows the site palette — never red. The calculator gives answers ("not eligible"
// / "under 18" → amber) and, when the form isn't complete enough to answer, a neutral panel.
const RESULT_TONE = {
  all: "eligibility-result--all", // #DCEFE5 — eligible everywhere
  nonCapitalOnly: "eligibility-result--near", // #EAF4EF — eligible outside the capital area
  ineligible: "eligibility-result--none", // #FDF0E4 — not eligible yet / under 18
  incomplete: "eligibility-result--info", // #F7F9F8 — can't answer yet (a field is missing)
};
const ALL_RESULT_TONES = Object.values(RESULT_TONE);

function setResultTone(resultEl, tone) {
  resultEl.classList.remove(...ALL_RESULT_TONES);
  if (tone) resultEl.classList.add(tone);
}

// The salary field is a type="text" input (hero.njk) shown with thousand separators. These two
// helpers are the whole "input parsing" layer — the eligibility comparison itself is untouched
// and still receives a plain integer.
function parseSalary(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits === "" ? NaN : Number(digits);
}

// Groups the digit string itself rather than Number(digits).toLocaleString(), so deleting a
// leading digit (70,000,000 → 0000000) keeps the remaining places as "0,000,000" instead of
// Number() collapsing the whole field to "0".
function formatSalary(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Reformats the salary field on every keystroke, keeping the caret in the same place relative to
// the digits (not the commas) so typing mid-number doesn't jump the cursor to the end.
function bindSalaryFormatting(input) {
  input.addEventListener("input", () => {
    const previous = input.value;
    const caret = input.selectionStart ?? previous.length;
    const digitsBeforeCaret = previous.slice(0, caret).replace(/\D/g, "").length;
    const formatted = formatSalary(previous);
    input.value = formatted;

    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < digitsBeforeCaret) {
      if (/\d/.test(formatted[pos])) seen += 1;
      pos += 1;
    }
    input.setSelectionRange(pos, pos);
  });
}

// type="number" natively lets "-" (and "+"/"e"/".") be typed or pasted in as part of valid
// number syntax — the form has `novalidate`, so the HTML `min="18"` never blocks submission
// either. Stripping to digits-only on every keystroke makes the age field reject a leading "-"
// the same way the salary field already does (parseSalary), rather than only catching it later
// as a confusing "must be 18 or older" message for a negative number.
function bindAgeSanitizing(input) {
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "");
    if (digits !== input.value) input.value = digits;
  });
}

function readReferenceData() {
  const el = document.getElementById("eligibility-reference-data");
  return JSON.parse(el.textContent);
}

function readUserInput(form) {
  const data = new FormData(form);
  return {
    salaryKrw: parseSalary(data.get("salaryKrw")),
    age: Number(data.get("age")),
    hasFamily: data.get("hasFamily") === "on",
  };
}

// A salary of 0 — blank, "0", or all-zeros like "0,000,000" — is likewise not an answer, so it's
// flagged for entry rather than run as a real (trivially "not eligible") result.
function isSalaryInvalid(userInput, rawInput) {
  if (rawInput.salaryRaw.trim() === "" || userInput.salaryKrw === 0) return true;
  return !Number.isFinite(userInput.salaryKrw) || userInput.salaryKrw < 0;
}

// Deliberately NOT "|| userInput.age < MIN_APPLICANT_AGE": being under 18 is a real, validly
// entered answer that fails the visa's own eligibility rule, not a data-entry mistake — it gets
// the amber "must be 18+" result caption, but the field itself shouldn't get the invalid-field
// border mark (that's reserved for missing/malformed input). The raw-string check still matters:
// Number("") is 0, so a blank age must not read as age 0 (→ "must be 18+") instead of "enter
// your age".
function isAgeInvalid(userInput, rawInput) {
  if (rawInput.ageRaw.trim() === "") return true;
  return !Number.isFinite(userInput.age);
}

// Pure (no DOM) so it's unit-testable — see scripts/verify-calculator.mjs.
export function validate(userInput, rawInput) {
  const salaryMissing = rawInput.salaryRaw.trim() === "" || userInput.salaryKrw === 0;
  const ageMissing = rawInput.ageRaw.trim() === "";

  if (salaryMissing && ageMissing) return "Please enter your age and annual income.";
  if (salaryMissing) return "Please enter your annual income.";
  if (ageMissing) return "Please enter your age.";

  if (isSalaryInvalid(userInput, rawInput)) return "Enter an income of 0 or more.";
  if (!Number.isFinite(userInput.age) || userInput.age < MIN_APPLICANT_AGE) {
    return `F-1-D applicants must be ${MIN_APPLICANT_AGE} or older.`;
  }
  return null;
}

function setFieldInvalid(input, invalid) {
  if (invalid) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
}

// Field-level invalid marking (border colour, via the [aria-invalid="true"] rule in
// calculator.css) only ever appears from a submit attempt — never live while typing. It clears
// the moment the visitor edits the field at all (any `input` event, whether the new value is
// actually valid yet or not) rather than waiting for it to become valid — the mark's job is
// "this was wrong last time you checked," which stops being true as soon as they've touched it;
// the next submit re-validates from scratch and marks again if it's still wrong. Submit itself
// never touches focus or the cursor — only setAttribute, nothing that could move either.
function bindFieldValidityMarking(form) {
  const fields = [
    { input: form.elements.salaryKrw, isInvalid: isSalaryInvalid },
    { input: form.elements.age, isInvalid: isAgeInvalid },
  ];

  for (const field of fields) {
    field.input.addEventListener("input", () => setFieldInvalid(field.input, false));
  }

  return {
    mark(userInput, rawInput) {
      for (const field of fields) {
        setFieldInvalid(field.input, field.isInvalid(userInput, rawInput));
      }
    },
    clear() {
      for (const field of fields) setFieldInvalid(field.input, false);
    },
  };
}

// A failed validation means we never got a real EligibilityResult — but korea-map.js's
// applyResult() only runs on success, so without this, a stale result from a *previous* valid
// submission stays applied to the map (e.g. drop age from 30 to 15: the caption correctly turns
// into an error, but every region the age-30 run unlocked stays lit up as eligible). Shaping a
// fully-dimmed result and routing it through the same applyResult() call is simpler than adding
// a second "clear" code path to korea-map.js for one edge case.
function buildInvalidInputResult(referenceData) {
  return {
    tier: "ineligible",
    dimmedRegionSlugs: referenceData.regions.map((r) => r.slug),
    partialRegionSlugs: [],
    thresholdCapitalKrw: 0,
    thresholdNonCapitalKrw: 0,
    gapToNonCapitalKrw: 0,
    gapToCapitalKrw: 0,
  };
}

// "Show all regions" reset (ROADMAP feedback): a visitor who doesn't know their salary/age yet,
// or just wants to browse, had no way to see an un-gated map short of typing throwaway numbers
// that happen to clear every threshold. Shares eligibility.js's own "all" tier shape — that tier
// already means nothing dimmed/partial — so this is what a real "all" result looks like, not a
// separate map-clearing code path.
function buildShowAllResult() {
  return {
    tier: "all",
    dimmedRegionSlugs: [],
    partialRegionSlugs: [],
    thresholdCapitalKrw: 0,
    thresholdNonCapitalKrw: 0,
    gapToNonCapitalKrw: 0,
    gapToCapitalKrw: 0,
  };
}

// Pure (no DOM) so the rounding rules above are unit-testable — see
// scripts/verify-calculator.mjs — the same reasoning as validate().
export function captionFor(result) {
  return CAPTIONS[result.tier](result);
}

// Both render into the same #eligibility-result box, distinguished by plate tint (setResultTone)
// rather than two differently-positioned elements — an in-form message and a below-form caption
// read as inconsistent UI for what's the same "result of checking" concept.
function renderCaption(resultEl, result) {
  const text = captionFor(result);
  setResultTone(resultEl, RESULT_TONE[result.tier]);
  resultEl.innerHTML = text + FULL_RULES_LINK;
  resultEl.hidden = false;
}

// `complete` = both fields hold a real value (salary > 0, age present). A complete form that
// still fails validation is a real answer (under 18) → amber; an incomplete form (missing or
// all-zero salary, blank age) → neutral panel (no answer yet).
function renderError(resultEl, message, complete) {
  setResultTone(resultEl, complete ? RESULT_TONE.ineligible : RESULT_TONE.incomplete);
  resultEl.innerHTML = message + FULL_RULES_LINK;
  resultEl.hidden = false;
}

// Brings the just-rendered result into view after a submit. Prefers landing on the whole card
// (form + result) so the question the visitor just answered stays visible above the answer; falls
// back to the result itself when the card alone is taller than the viewport, since centering on
// the card would then push the result off-screen. No-ops if the result is already fully visible.
function scrollResultIntoView(cardEl, resultEl) {
  const resultRect = resultEl.getBoundingClientRect();
  const fullyVisible = resultRect.top >= 0 && resultRect.bottom <= window.innerHeight;
  if (fullyVisible) return;

  const cardRect = cardEl.getBoundingClientRect();
  const targetRect = cardRect.height > window.innerHeight ? resultRect : cardRect;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.scrollTo({
    top: window.scrollY + targetRect.top - 16,
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });
}

function hasReadableInput(userInput, rawInput) {
  return (
    rawInput.salaryRaw.trim() !== "" &&
    rawInput.ageRaw.trim() !== "" &&
    Number.isFinite(userInput.salaryKrw) &&
    userInput.salaryKrw > 0 &&
    Number.isFinite(userInput.age)
  );
}

// ARCHITECTURE.md §8: calculator.js owns caption rendering; main.js's glue passes onResult so
// korea-map.js's applyResult() can react to the same result for map state only — one-directional,
// no event bus, no separate module.
export function init(onResult = () => {}) {
  const form = document.querySelector("[data-calculator-form]");
  const resultEl = document.querySelector("[data-eligibility-result]");
  const cardEl = document.querySelector("[data-calculator-mount]");
  const resetButton = document.querySelector("[data-calculator-reset]");
  if (!form || !resultEl) return;

  const referenceData = readReferenceData();
  const fieldValidity = bindFieldValidityMarking(form);

  // markInvalid: true only for a real submit, so no field is painted red before the visitor acts.
  function computeAndRender(userInput, { markInvalid = false } = {}) {
    resultEl.hidden = true;

    const rawInput = { salaryRaw: form.elements.salaryKrw.value, ageRaw: form.elements.age.value };
    if (markInvalid) fieldValidity.mark(userInput, rawInput);
    const validationMessage = validate(userInput, rawInput);
    if (validationMessage) {
      const complete = hasReadableInput(userInput, rawInput);
      renderError(resultEl, validationMessage, complete);
      // An incomplete form (nothing typed yet, or cleared back to blank) isn't a real "not
      // eligible" answer — it's "no check has run," which is the same un-gated map the site
      // shows before any calculator run. Only a complete-but-failing input (e.g. under 18) is a
      // real ineligible result, which is what dims every region.
      onResult(complete ? buildInvalidInputResult(referenceData) : buildShowAllResult(), referenceData);
      return false;
    }

    const result = calculateEligibility(userInput, referenceData);
    renderCaption(resultEl, result);
    onResult(result, referenceData);
    return true;
  }

  // Only reveal the form once JS has actually loaded and referenceData parsed — a broken form
  // with no working submit handler is worse than the <noscript> fallback.
  form.hidden = false;

  bindSalaryFormatting(form.elements.salaryKrw);
  bindAgeSanitizing(form.elements.age);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const userInput = readUserInput(form);
    computeAndRender(userInput, { markInvalid: true });
    if (cardEl) scrollResultIntoView(cardEl, resultEl);
  });

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      // Clearing the map without clearing the form was worse than doing nothing — the age/salary
      // fields stayed filled with e.g. "17", so every region reading as open now looked like the
      // site was claiming a 17-year-old is eligible everywhere, rather than "no check is active."
      form.reset();
      fieldValidity.clear();
      resultEl.hidden = true;
      setResultTone(resultEl, null);
      onResult(buildShowAllResult(), referenceData);
    });
  }
}
