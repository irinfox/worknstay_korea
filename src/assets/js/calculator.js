import { calculateEligibility } from "./eligibility.js";

// architecture.md §7 / eligibility.js precondition: age must be validated >= this before
// calling calculateEligibility() — this function doesn't handle under-18 itself.
const MIN_APPLICANT_AGE = 18;

const CAPTIONS = {
  ineligible: (result) =>
    `Not eligible yet. You're ₩${formatKrw(result.gapToNonCapitalKrw)} short of the ` +
    `non-capital-area threshold (₩${formatKrw(result.thresholdNonCapitalKrw)}).`,
  nonCapitalOnly: (result) =>
    `Eligible outside the capital area. Non-capital regions are open to you now — ` +
    `₩${formatKrw(result.gapToCapitalKrw)} more (₩${formatKrw(result.thresholdCapitalKrw)}) ` +
    `would also unlock the capital area.`,
  all: () => "Eligible everywhere, including the capital area.",
};

const PARTIAL_NOTE =
  " Gyeonggi-do's population-decline-designated counties are open to you too, even though the " +
  "rest of the province isn't.";

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

function formatKrw(value) {
  return new Intl.NumberFormat("en-US").format(value);
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

// Pure (no DOM) so it's unit-testable — see scripts/verify-calculator.mjs. Takes the raw input
// strings alongside the parsed userInput because Number("") === Number("0") === 0: an empty age
// field would otherwise read as age 0 (→ "must be 18+" instead of "enter your age"). A salary
// of 0 — blank, "0", or all-zeros like "0,000,000" — is likewise not an answer, so it's flagged
// for entry rather than run as a real (trivially "not eligible") result.
export function validate(userInput, rawInput) {
  const salaryMissing = rawInput.salaryRaw.trim() === "" || userInput.salaryKrw === 0;
  const ageMissing = rawInput.ageRaw.trim() === "";

  if (salaryMissing || ageMissing) {
    const missingLabel =
      salaryMissing && ageMissing
        ? "your annual salary and age"
        : salaryMissing
          ? "your annual salary"
          : "your age";
    return (
      "Eligibility is based on your age, salary, and whether family is accompanying you — " +
      `please fill in ${missingLabel}.`
    );
  }
  if (!Number.isFinite(userInput.salaryKrw) || userInput.salaryKrw < 0) {
    return "Enter a salary of 0 or more.";
  }
  if (!Number.isFinite(userInput.age) || userInput.age < MIN_APPLICANT_AGE) {
    return `F-1-D requires applicants to be ${MIN_APPLICANT_AGE}+.`;
  }
  return null;
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

// Both render into the same #eligibility-result box, distinguished by plate tint (setResultTone)
// rather than two differently-positioned elements — an in-form message and a below-form caption
// read as inconsistent UI for what's the same "result of checking" concept.
function renderCaption(resultEl, result) {
  let text = CAPTIONS[result.tier](result);
  if (result.partialRegionSlugs.length > 0) {
    text += PARTIAL_NOTE;
  }
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

function hasReadableInput(userInput, rawInput) {
  return (
    rawInput.salaryRaw.trim() !== "" &&
    rawInput.ageRaw.trim() !== "" &&
    Number.isFinite(userInput.salaryKrw) &&
    userInput.salaryKrw > 0 &&
    Number.isFinite(userInput.age)
  );
}

// Permalink covers prefill + caption + map state (via onResult) — nothing is persisted beyond
// the URL itself (no sessionStorage — region pages deliberately don't remember a calculator run
// from the home page; see ROADMAP feedback on that ambiguity).
function userInputFromParams(params) {
  if (!params.has("salaryKrw") || !params.has("age")) return null;
  return {
    salaryKrw: parseSalary(params.get("salaryKrw")),
    age: Number(params.get("age")),
    hasFamily: params.get("hasFamily") === "1",
  };
}

function paramsFromUserInput(userInput) {
  const params = new URLSearchParams();
  params.set("salaryKrw", String(userInput.salaryKrw));
  params.set("age", String(userInput.age));
  if (userInput.hasFamily) params.set("hasFamily", "1");
  return params;
}

// architecture.md §8: calculator.js owns caption rendering; main.js's glue passes onResult so
// korea-map.js's applyResult() can react to the same result for map state only — one-directional,
// no event bus, no separate module.
export function init(onResult = () => {}) {
  const form = document.querySelector("[data-calculator-form]");
  const resultEl = document.querySelector("[data-eligibility-result]");
  const resetButton = document.querySelector("[data-calculator-reset]");
  if (!form || !resultEl) return;

  const referenceData = readReferenceData();

  function computeAndRender(userInput) {
    resultEl.hidden = true;

    const rawInput = { salaryRaw: form.elements.salaryKrw.value, ageRaw: form.elements.age.value };
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

  const prefill = userInputFromParams(new URLSearchParams(window.location.search));
  if (prefill) {
    form.elements.salaryKrw.value = formatSalary(prefill.salaryKrw);
    form.elements.age.value = prefill.age;
    form.elements.hasFamily.checked = prefill.hasFamily;
    computeAndRender(prefill);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const userInput = readUserInput(form);
    if (computeAndRender(userInput)) {
      history.replaceState(null, "", `?${paramsFromUserInput(userInput)}`);
    }
  });

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      // Clearing the map without clearing the form was worse than doing nothing — the age/salary
      // fields stayed filled with e.g. "17", so every region reading as open now looked like the
      // site was claiming a 17-year-old is eligible everywhere, rather than "no check is active."
      form.reset();
      resultEl.hidden = true;
      setResultTone(resultEl, null);
      history.replaceState(null, "", window.location.pathname);
      onResult(buildShowAllResult(), referenceData);
    });
  }
}
