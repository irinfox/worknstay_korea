// Live KTO OpenAPI transport (ARCHITECTURE.md §5) — EngService2 only (areaBasedList2,
// searchFestival2). Owns URL building, paging, timeout, and bounded 429/5xx
// backoff-retry. Never throws: any failure (missing key, network error, timeout, non-2xx,
// bad JSON, non-zero resultCode) degrades to { items: [], degraded: true } so callers can
// always render an empty state instead of a 500.
//
// Raw-envelope unwrapping lives here too (not normalize.mjs): KTO's own zero-result shape is
// "items": "" (empty string, not {}/[]), and a single-result page comes back as an object
// instead of a 1-length array — both are transport-shape quirks, not per-field normalization.

const BASE_URL = "https://apis.data.go.kr/B551011/EngService2";
const MOBILE_OS = "ETC";
const MOBILE_APP = "WorkAndStayKorea";
const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2; // bounded: up to 3 attempts total
const RETRY_BASE_DELAY_MS = 400;

const DEGRADED = { items: [], degraded: true, totalCount: 0, quotaExceeded: false };
// data.go.kr's own error body on a 429, distinguishing "daily quota gone" from "per-second burst"
// — both are HTTP 429, only the JSON body tells them apart:
//   daily:      { returnReasonCode: "22", errMsg: "LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR" }
//   per-second: { returnReasonCode: "23", errMsg: "...PER_SECOND_EXCEEDS_ERROR" }
// Retrying a per-second hit is worth it (resolves within the retry window); retrying a daily hit
// never is (only clears at midnight KST) — so it fails fast instead of burning the rest of
// MAX_RETRIES on a call that cannot succeed, and flags `quotaExceeded` so callers can show an
// honest "we can't display more today" message instead of a generic empty state.
const DAILY_QUOTA_REASON_CODE = "22";

// Local dev-only visibility, not a production safeguard or a real quota tracker: this
// module-level count only survives for one long-lived `wrangler pages dev` process (resets on
// every restart) and, in real Cloudflare deployment, isolates recycle so it wouldn't persist
// there either — it exists purely to make the running total visible in the terminal *during*
// local testing. Added after burning a full day's 1,000-call dev-key quota in ~4 hours of live
// verification in one session (repeated full-region endpoint checks, each fanning out to up to
// 35 KTO calls). Counts every attempt this process actually sends over the network, including
// retries.
const DAILY_QUOTA_WARNING_THRESHOLD = 700; // dev key is 1,000/day — warn well before hitting it
let devSessionCallCount = 0;
let warnedAtThreshold = false;

function logDevSessionCall() {
  devSessionCallCount += 1;
  console.log(`[kto-client] live KTO call #${devSessionCallCount} this dev session`);
  if (devSessionCallCount >= DAILY_QUOTA_WARNING_THRESHOLD && !warnedAtThreshold) {
    warnedAtThreshold = true;
    console.warn(
      `[kto-client] WARNING: ${devSessionCallCount} live KTO calls made this dev session alone — ` +
        `the dev key is capped at 1,000/day total. Stop live-testing and switch to the mock ` +
        `fixture or a single targeted query before doing anything else.`
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Dev-only in-memory cache, gated on `env.KTO_DEV_CACHE === "1"` (set only in `.dev.vars` — never
// in Cloudflare's production env; `wrangler.jsonc` has no `vars` block, so this can never leak
// into production by any path in this repo). Exists because there is no production caching
// (ARCHITECTURE.md §5), which otherwise makes manual QA of live data burn real quota on every
// reload. Only successful, non-degraded, non-quota results are cached — a quota-exceeded
// response must keep reflecting real quota state on every check, never a stale cached one.
// Module-level, no persistence: resets with the dev process, same lifetime as
// `devSessionCallCount` above. 24h TTL: active development means constantly reloading
// localhost, and a code change already resets this (a fresh `pages:dev` module instance on file
// save) well before 24h would elapse on its own.
const DEV_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const devCache = new Map(); // request URL -> { result, expiresAt }

function devCacheGet(url) {
  const entry = devCache.get(url);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    devCache.delete(url);
    return undefined;
  }
  return entry.result;
}

function devCacheSet(url, result) {
  devCache.set(url, { result, expiresAt: Date.now() + DEV_CACHE_TTL_MS });
}

// data.go.kr issues serviceKeys already percent-encoded; URLSearchParams re-encodes whatever
// it's given, so passing the raw key through unchanged would double-encode it and break auth.
// Decoding first (a no-op on an already-plain key) guarantees exactly one encoding pass.
function normalizeServiceKey(rawKey) {
  try {
    return decodeURIComponent(rawKey);
  } catch {
    return rawKey;
  }
}

function buildUrl(endpoint, params, serviceKey) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("serviceKey", normalizeServiceKey(serviceKey));
  url.searchParams.set("MobileOS", MOBILE_OS);
  url.searchParams.set("MobileApp", MOBILE_APP);
  url.searchParams.set("_type", "json");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// `cacheTtl` is a Cloudflare `fetch()` `cf` directive (edge Cache API, not a browser header) —
// harmless to pass under plain Node (undici ignores unknown RequestInit keys), so callers don't
// need an environment check.
async function fetchWithTimeout(url, cacheTtl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const init = { signal: controller.signal };
    if (cacheTtl) init.cf = { cacheTtl, cacheEverything: true };
    return await fetch(url, init);
  } finally {
    clearTimeout(timer);
  }
}

// KTO's "items" field is "" on zero results, a bare object on a single result, and an array
// only when there are 2+ results — always normalize to an array.
function extractItems(body) {
  const raw = body?.response?.body?.items?.item;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return [raw];
  return [];
}

/**
 * Fetch one page from a live EngService2 endpoint.
 * @param {"areaBasedList2"|"searchFestival2"} endpoint
 * @param {Record<string, string|number>} params - endpoint-specific query params
 *   (contentTypeId/areaCode/lDongRegnCd for areaBasedList2, eventStartDate/lDongRegnCd for
 *   searchFestival2), plus numOfRows/pageNo for paging.
 * @param {{ KTO_API_KEY?: string, KTO_DEV_CACHE?: string, KTO_DEV_FORCE_QUOTA?: string }} env -
 *   Cloudflare Functions env binding; `KTO_DEV_CACHE: "1"` (dev-only, see devCache above) serves
 *   repeat identical calls from an in-memory cache instead of hitting KTO again.
 *   `KTO_DEV_FORCE_QUOTA: "1"` (dev-only) short-circuits to a quota-exceeded result with no
 *   network call, to QA the fallback UI on demand.
 * @param {{ cacheTtl?: number }} [options] - edge cache TTL in seconds (ARCHITECTURE.md §5); omit
 *   to bypass the edge cache (used for verify scripts and other one-off calls).
 * @returns {Promise<{ items: object[], degraded: boolean, totalCount: number, quotaExceeded: boolean }>}
 */
export async function fetchKto(endpoint, params, env, { cacheTtl } = {}) {
  const serviceKey = env?.KTO_API_KEY;
  if (!serviceKey) return DEGRADED;

  // Dev-only QA hook (`.dev.vars` only — never set in Cloudflare's production env): simulates
  // the real daily-quota-exceeded response without any network call, so the honest fallback UI
  // (attractions.js's topAttractions swap, region-data.js's "Top picks for today" subtitle) can
  // be checked on demand instead of waiting for the real 1,000-call/day dev key to run out.
  if (env?.KTO_DEV_FORCE_QUOTA === "1") return { ...DEGRADED, quotaExceeded: true };

  const url = buildUrl(endpoint, params, serviceKey);
  const devCacheEnabled = env?.KTO_DEV_CACHE === "1";
  if (devCacheEnabled) {
    const cached = devCacheGet(url);
    if (cached) {
      console.log("[kto-client] dev cache hit");
      return cached;
    }
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response;
    try {
      logDevSessionCall();
      response = await fetchWithTimeout(url, cacheTtl);
    } catch {
      // network error or timeout (AbortError)
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      return DEGRADED;
    }

    if (response.status === 429) {
      let reasonCode;
      try {
        reasonCode = (await response.json())?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnReasonCode;
      } catch {
        reasonCode = undefined;
      }
      if (reasonCode === DAILY_QUOTA_REASON_CODE) {
        return { ...DEGRADED, quotaExceeded: true };
      }
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      return DEGRADED;
    }

    if (response.status >= 500) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      return DEGRADED;
    }

    if (!response.ok) return DEGRADED;

    let body;
    try {
      body = await response.json();
    } catch {
      return DEGRADED;
    }

    if (body?.response?.header?.resultCode !== "0000") return DEGRADED;

    const result = {
      items: extractItems(body),
      degraded: false,
      totalCount: Number(body?.response?.body?.totalCount ?? 0),
      quotaExceeded: false,
    };
    if (devCacheEnabled) devCacheSet(url, result);
    return result;
  }

  return DEGRADED;
}

/**
 * Fetch all pages up to `maxPages`, deduping is the caller's job (contentId can repeat across
 * a fan-out of multiple lDongRegnCd codes — see ARCHITECTURE.md §5). Stops early once
 * a page returns fewer rows than requested or `totalCount` is covered. One degraded page
 * degrades the whole result (no partial-page merging) — a caller wanting partial-region
 * resilience across *codes* should call fetchKto per code itself (see region-map.mjs), not rely
 * on this helper's own retry to paper over it.
 */
export async function fetchKtoAllPages(
  endpoint,
  params,
  env,
  { numOfRows = 20, maxPages = 5, cacheTtl } = {}
) {
  const items = [];
  let pageNo = 1;
  let totalCount = Infinity;

  while (pageNo <= maxPages && items.length < totalCount) {
    const page = await fetchKto(endpoint, { ...params, numOfRows, pageNo }, env, { cacheTtl });
    if (page.degraded) return { items: [], degraded: true, totalCount: 0, quotaExceeded: page.quotaExceeded };

    items.push(...page.items);
    totalCount = page.totalCount;
    if (page.items.length < numOfRows) break;
    pageNo += 1;
  }

  return { items, degraded: false, totalCount, quotaExceeded: false };
}
