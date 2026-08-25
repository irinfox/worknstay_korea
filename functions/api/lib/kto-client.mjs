// Live KTO OpenAPI transport (architecture.md §5) — EngService2 only (areaBasedList2,
// searchFestival2, detailImage2). Owns URL building, paging, timeout, and bounded 429/5xx
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

const DEGRADED = { items: [], degraded: true, totalCount: 0 };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
 * @param {"areaBasedList2"|"searchFestival2"|"detailImage2"} endpoint
 * @param {Record<string, string|number>} params - endpoint-specific query params
 *   (contentTypeId/areaCode/lDongRegnCd for areaBasedList2, eventStartDate/lDongRegnCd for
 *   searchFestival2, contentId for detailImage2), plus numOfRows/pageNo for paging.
 * @param {{ KTO_API_KEY?: string }} env - Cloudflare Functions env binding
 * @param {{ cacheTtl?: number }} [options] - edge cache TTL in seconds (architecture.md §5); omit
 *   to bypass the edge cache (used for verify scripts and other one-off calls).
 * @returns {Promise<{ items: object[], degraded: boolean, totalCount: number }>}
 */
export async function fetchKto(endpoint, params, env, { cacheTtl } = {}) {
  const serviceKey = env?.KTO_API_KEY;
  if (!serviceKey) return DEGRADED;

  const url = buildUrl(endpoint, params, serviceKey);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response;
    try {
      response = await fetchWithTimeout(url, cacheTtl);
    } catch {
      // network error or timeout (AbortError)
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      return DEGRADED;
    }

    if (response.status === 429 || response.status >= 500) {
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

    return {
      items: extractItems(body),
      degraded: false,
      totalCount: Number(body?.response?.body?.totalCount ?? 0),
    };
  }

  return DEGRADED;
}

/**
 * Fetch all pages up to `maxPages`, deduping is the caller's job (contentId can repeat across
 * a fan-out of multiple lDongRegnCd codes — see architecture.md §5 Phase 22). Stops early once
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
    if (page.degraded) return { items: [], degraded: true, totalCount: 0 };

    items.push(...page.items);
    totalCount = page.totalCount;
    if (page.items.length < numOfRows) break;
    pageNo += 1;
  }

  return { items, degraded: false, totalCount };
}
