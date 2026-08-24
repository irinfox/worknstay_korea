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

// Pure (no DOM) so it's unit-testable — see scripts/verify-calculator.mjs. Takes the raw input
// strings alongside the parsed userInput specifically to tell "field left empty" apart from
// "field filled with a real 0": Number("") is 0, same as Number("0"), so userInput alone can't
// distinguish them. An empty salary field was silently computing as salaryKrw:0, a technically
// valid input that produced a real (if trivial) "not eligible" result instead of flagging that
// nothing was entered.
export function validate(userInput, rawInput) {
  const salaryMissing = rawInput.salaryRaw.trim() === "";
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

// Permalink covers prefill + caption + map state (via onResult) — nothing is persisted beyond
// the URL itself (no sessionStorage — region pages deliberately don't remember a calculator run
// from the home page; see ROADMAP feedback on that ambiguity).
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
      renderError(resultEl, validationMessage);
      onResult(buildInvalidInputResult(referenceData), referenceData);
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

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      // Clearing the map without clearing the form was worse than doing nothing — the age/salary
      // fields stayed filled with e.g. "17", so every region reading as open now looked like the
      // site was claiming a 17-year-old is eligible everywhere, rather than "no check is active."
      form.reset();
      resultEl.hidden = true;
      resultEl.classList.remove("eligibility-result--error");
      history.replaceState(null, "", window.location.pathname);
      onResult(buildShowAllResult(), referenceData);
    });
  }
}
