// Live KTO OpenAPI transport (EngService2: areaBasedList2, searchFestival2): URL building,
// paging, timeout, bounded 429/5xx retry. Never throws — any failure degrades to
// { items: [], degraded: true } so callers render an empty state.
// Envelope unwrapping lives here: KTO sends "items": "" on zero results and a bare object on one.

const BASE_URL = "https://apis.data.go.kr/B551011/EngService2";
const MOBILE_OS = "ETC";
const MOBILE_APP = "WorkAndStayKorea";
const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2; // bounded: up to 3 attempts total
const RETRY_BASE_DELAY_MS = 400;

const DEGRADED = { items: [], degraded: true, totalCount: 0, quotaExceeded: false };
// HTTP 429 body code: "22" = daily quota gone (fail fast, flag quotaExceeded), "23" = per-second
// burst (worth retrying).
const DAILY_QUOTA_REASON_CODE = "22";

// Dev-only call counter for local testing (module state resets per process); gated on
// KTO_DEV_CACHE so it never logs in production.
const DAILY_QUOTA_WARNING_THRESHOLD = 700; // dev key: 1,000/day per endpoint
let devSessionCallCount = 0;
let warnedAtThreshold = false;

function logDevSessionCall() {
  devSessionCallCount += 1;
  console.log(`[kto-client] live KTO call #${devSessionCallCount} this dev session`);
  if (devSessionCallCount >= DAILY_QUOTA_WARNING_THRESHOLD && !warnedAtThreshold) {
    warnedAtThreshold = true;
    console.warn(
      `[kto-client] WARNING: ${devSessionCallCount} live KTO calls this dev session — the dev key ` +
        `is capped at 1,000/day per endpoint. Use the no-key fallback or KTO_DEV_CACHE=1.`
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Dev-only in-memory cache (KTO_DEV_CACHE=1 in `.env`, never in Cloudflare env). Only successful
// results are cached, so quota state is never stale.
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

// data.go.kr keys come percent-encoded; decode first so URLSearchParams doesn't double-encode.
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

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

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
 *   (lclsSystm1/lDongRegnCd for areaBasedList2, eventStartDate/lDongRegnCd for searchFestival2),
 *   plus numOfRows/pageNo for paging.
 * @param {{ KTO_API_KEY?: string, KTO_DEV_CACHE?: string, KTO_DEV_FORCE_QUOTA?: string }} env -
 *   the two KTO_DEV_* flags are dev-only: in-memory cache, and forced quota-exceeded result.
 * @param {{ retried?: boolean }} [trace] - optional out-param; `retried` is set when any attempt was repeated
 *   (used by analytics api_call logging, never read here).
 * @returns {Promise<{ items: object[], degraded: boolean, totalCount: number, quotaExceeded: boolean }>}
 */
export async function fetchKto(endpoint, params, env, trace) {
  const serviceKey = env?.KTO_API_KEY;
  if (!serviceKey) return DEGRADED;

  // Dev-only: simulate the daily-quota response to QA the fallback UI.
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
    if (attempt > 0 && trace) trace.retried = true;
    let response;
    try {
      if (devCacheEnabled) logDevSessionCall();
      response = await fetchWithTimeout(url);
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
 * Fetch pages up to `maxPages`; deduping is the caller's job. One degraded page degrades the
 * whole result — callers wanting per-code resilience call fetchKto per code (see region-map.mjs).
 */
export async function fetchKtoAllPages(
  endpoint,
  params,
  env,
  { numOfRows = 20, maxPages = 5, trace } = {}
) {
  const items = [];
  let pageNo = 1;
  let totalCount = Infinity;

  while (pageNo <= maxPages && items.length < totalCount) {
    const page = await fetchKto(endpoint, { ...params, numOfRows, pageNo }, env, trace);
    if (page.degraded) return { items: [], degraded: true, totalCount: 0, quotaExceeded: page.quotaExceeded };

    items.push(...page.items);
    totalCount = page.totalCount;
    if (page.items.length < numOfRows) break;
    pageNo += 1;
  }

  return { items, degraded: false, totalCount, quotaExceeded: false };
}
