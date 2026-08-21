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

const FULL_RULES_LINK = ' <a href="/visa-info/">Check full rules</a>';

function formatKrw(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function readReferenceData() {
  const el = document.getElementById("eligibility-reference-data");
  return JSON.parse(el.textContent);
}

function readUserInput(form) {
  const data = new FormData(form);
  return {
    salaryKrw: Number(data.get("salaryKrw")),
    age: Number(data.get("age")),
    hasFamily: data.get("hasFamily") === "on",
  };
}

function validate(userInput) {
  if (!Number.isFinite(userInput.salaryKrw) || userInput.salaryKrw < 0) {
    return "Enter a salary of 0 or more.";
  }
  if (!Number.isFinite(userInput.age) || userInput.age < MIN_APPLICANT_AGE) {
    return `F-1-D requires applicants to be ${MIN_APPLICANT_AGE}+.`;
  }
  return null;
}

// Both render into the same #eligibility-result box (error state via a modifier class) rather
// than two differently-positioned elements — an in-form error message and a below-form caption
// read as inconsistent UI for what's the same "result of checking" concept.
function renderCaption(resultEl, result) {
  let text = CAPTIONS[result.tier](result);
  if (result.partialRegionSlugs.length > 0) {
    text += PARTIAL_NOTE;
  }
  resultEl.classList.remove("eligibility-result--error");
  resultEl.innerHTML = text + FULL_RULES_LINK;
  resultEl.hidden = false;
}

function renderError(resultEl, message) {
  resultEl.classList.add("eligibility-result--error");
  resultEl.innerHTML = message + FULL_RULES_LINK;
  resultEl.hidden = false;
}

// Permalink covers prefill + caption only, not map state — applyResult() (Phase 17) reads the
// same sessionStorage write this produces, so there's nothing left for the permalink to do that
// isn't already covered once that phase lands (architecture.md §8).
function userInputFromParams(params) {
  if (!params.has("salaryKrw") || !params.has("age")) return null;
  return {
    salaryKrw: Number(params.get("salaryKrw")),
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

export function init() {
  const form = document.querySelector("[data-calculator-form]");
  const resultEl = document.querySelector("[data-eligibility-result]");
  if (!form || !resultEl) return;

  const referenceData = readReferenceData();

  function computeAndRender(userInput) {
    resultEl.hidden = true;

    const validationMessage = validate(userInput);
    if (validationMessage) {
      renderError(resultEl, validationMessage);
      return false;
    }

    const result = calculateEligibility(userInput, referenceData);
    renderCaption(resultEl, result);

    // architecture.md §8: written so a region page a visitor navigates to next can read it back
    // and show an "available to you" badge (Phase 18).
    sessionStorage.setItem("eligibilityResult", JSON.stringify({ userInput, result }));
    return true;
  }

  // Only reveal the form once JS has actually loaded and referenceData parsed — a broken form
  // with no working submit handler is worse than the <noscript> fallback.
  form.hidden = false;

  const prefill = userInputFromParams(new URLSearchParams(window.location.search));
  if (prefill) {
    form.elements.salaryKrw.value = prefill.salaryKrw;
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
}
