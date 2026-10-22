// Pure bucketing for calculator analytics (docs/TRACKING_PLAN.md): exact inputs never leave the
// browser, only these coarse buckets. No DOM access, so it is unit-testable.

// Split exactly at the visa's age-band boundary (35).
export function ageBucket(age) {
  if (!Number.isFinite(age) || age < 0) return "invalid";
  if (age < 18) return "<18";
  if (age < 25) return "18–24";
  if (age < 30) return "25–29";
  if (age < 35) return "30–34";
  if (age < 40) return "35–39";
  if (age < 50) return "40–49";
  return "50+";
}

// Share of the GNI reference value, no rounding before bucketing; buckets are [a, b).
export function incomeGniBucket(incomeKrw, gniKrw) {
  if (!Number.isFinite(incomeKrw) || incomeKrw < 0 || !Number.isFinite(gniKrw) || gniKrw <= 0) return "invalid";
  const share = incomeKrw / gniKrw;
  // <0.02 (under ~1M KRW) is implausible: likely an amount typed in USD or in thousands.
  if (share < 0.02) return "<0.02";
  if (share < 0.5) return "0.02–0.5";
  if (share < 1) return "0.5–1";
  if (share < 1.25) return "1–1.25";
  if (share < 1.5) return "1.25–1.5";
  if (share < 2) return "1.5–2";
  if (share < 2.5) return "2–2.5";
  return "2.5+";
}

const RESULT_BY_TIER = { all: "all_regions", nonCapitalOnly: "non_capital_plus_decline", ineligible: "none" };

export function resultName(tier) {
  return RESULT_BY_TIER[tier];
}

export function secondsBucket(seconds) {
  if (seconds < 3) return "<3";
  if (seconds < 10) return "3–10";
  if (seconds < 30) return "10–30";
  return "30+";
}

export function loadSecondsBucket(seconds) {
  if (seconds < 10) return "<10";
  if (seconds < 30) return "10–30";
  if (seconds < 120) return "30–120";
  return "120+";
}

// Fine at the small end (360 Galaxy / 412 Pixel class phones), plus the CSS layout breakpoints.
export function viewportBucket(width) {
  if (width < 360) return "<360";
  if (width < 400) return "360–399";
  if (width < 480) return "400–479";
  if (width < 600) return "480–599";
  if (width < 768) return "600–767";
  if (width < 900) return "768–899";
  if (width < 1024) return "900–1023";
  if (width < 1150) return "1024–1149";
  if (width < 1440) return "1150–1439";
  return "1440+";
}

// Which calculator field(s) the form asked to complete. Returns only enum values, never the input.
export function inputErrorOf(salaryRaw, ageRaw, salaryKrw) {
  const salaryZero = salaryKrw === 0;
  const salaryMissing = salaryRaw.trim() === "" || salaryZero;
  const ageMissing = ageRaw.trim() === "";
  return {
    field: salaryMissing && ageMissing ? "both" : salaryMissing ? "income" : "age",
    reason: salaryZero ? "zero" : "empty",
  };
}

// Error text is the only free text we send; digits are masked so a typed age or income can never
// ride along in it.
export function scrubMessage(message) {
  return String(message ?? "").replace(/\d+/g, "#").slice(0, 80);
}

export function slugOf(text, max = 60) {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, max);
}

// Where an internal href leads; null for anything that is not a tracked site page.
export function targetPageTypeOf(pathname) {
  if (pathname === "/") return "home";
  if (pathname === "/regions/gyeonggi-do/population-decline-areas/") return "decline_areas";
  if (/^\/regions\/[a-z0-9-]+\/$/.test(pathname)) return "region";
  if (pathname.startsWith("/visa-info")) return "visa";
  if (pathname.startsWith("/settling-in")) return "settling";
  if (pathname.startsWith("/about")) return "about";
  return null;
}
