// Analytics storage and validation (docs/TRACKING_PLAN.md). Everything here is allowlist-based:
// an unknown event name, field or param value is rejected, never stored. Writes go to the D1
// binding `DB`; when it is absent (preview without a database, plain Node) every write is a no-op.

export const SCHEMA_VERSION = 1;

const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const DOMAIN = /^[a-z0-9.-]{1,100}$/;
const UTM = /^[A-Za-z0-9._~+-]{1,60}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const enumOf = (...values) => ({ type: "enum", values });
const slug = { type: "pattern", re: SLUG };
const int = (min, max) => ({ type: "int", min, max });
const bool = { type: "bool" };

const RESULT = enumOf("all_regions", "non_capital_plus_decline", "none", "under_18");
const REGION_PAGE_SECTIONS = ["map", "cities", "rent", "events", "places", "dishes"];

export const PAGE_TYPES = ["home", "region", "decline_areas", "visa", "settling", "about", "404"];
export const VIEWPORT_BUCKETS = ["<480", "480–767", "768–1023", "1024–1439", "1440+"];

// Every param is required unless marked optional; strings are never free text except
// message_short (hard-capped).
export const EVENTS = {
  calculator_submitted: {
    attempt_no: int(1, 1000),
    age_bucket: enumOf("<18", "18–24", "25–29", "30–34", "35–39", "40–49", "50+", "invalid"),
    income_gni_bucket: enumOf("<0.02", "0.02–0.5", "0.5–1", "1–1.25", "1.25–1.5", "1.5–2", "2–2.5", "2.5+", "invalid"),
    with_family: bool,
    gni_year: int(2000, 2100),
    result: RESULT,
  },
  calculator_input_error: {
    field: enumOf("income", "age", "both"),
    reason: enumOf("empty", "zero"),
  },
  calculator_cleared: { attempts_before_clear: int(0, 1000) },
  map_seen_after_calculator: {
    seconds_after_submit_bucket: enumOf("<3", "3–10", "10–30", "30+"),
    result: RESULT,
  },
  map_region_hover: { region: slug },
  map_region_tap: { region: slug, tap_no: int(1, 1000) },
  page_view: {
    referrer_domain: { ...{ type: "pattern", re: DOMAIN }, optional: true },
    utm_source: { type: "pattern", re: UTM, optional: true },
    utm_medium: { type: "pattern", re: UTM, optional: true },
    utm_campaign: { type: "pattern", re: UTM, optional: true },
  },
  nav_click: {
    nav: enumOf("main", "section"),
    item: enumOf(
      "logo", "regions", "visa", "settling", "about",
      ...REGION_PAGE_SECTIONS,
      "eligibility", "documents", "notes", "questions", "links",
      "renting", "places_to_work", "communities"
    ),
  },
  regions_landing_scroll_up: {},
  region_link_click: {
    target: slug,
    source: enumOf(
      "home_map", "home_card", "prev_next", "breadcrumb", "region_badge",
      "settling_in_link", "calc_partial_hint", "home_card_partial"
    ),
    calc_result: enumOf("all_regions", "non_capital_plus_decline", "none", "under_18", "none_calculated"),
  },
  internal_link_click: { link_id: slug },
  outbound_click: {
    category: enumOf(
      "official", "guide", "coworking", "study_cafe_search", "coliving", "rental_platform",
      "community", "map_app", "food", "source_credit", "github", "feedback", "other"
    ),
    link_id: slug,
    domain: { type: "pattern", re: DOMAIN },
    section: { type: "pattern", re: SLUG, optional: true },
    city: { type: "pattern", re: SLUG, optional: true },
  },
  section_seen: {
    section: enumOf(
      "highlights", "map", "cities", "rent", "events", "places", "dishes", "prev_next",
      "eligibility", "income_table", "documents", "notes", "questions", "links",
      "renting", "short_term", "colivings", "places_to_work", "search_notes", "communities"
    ),
    seconds_since_load_bucket: enumOf("<10", "10–30", "30–120", "120+"),
  },
  city_card_seen: { region: slug, city: slug, position: int(1, 100) },
  vibe_tag_click: {
    tag: { type: "pattern", re: /^[a-z0-9][a-z0-9 _&'-]{0,39}$/i },
    location: enumOf("home_card", "region_header", "city_card"),
  },
  festival_tab_switch: { tab: enumOf("ongoing", "upcoming"), region: slug },
  festival_page_change: { page_no: int(1, 100), region: slug },
  places_filter_used: { filter_type: enumOf("area", "type"), value: slug, region: slug },
  highlights_carousel_nav: { direction: enumOf("next", "prev"), region: slug },
  accordion_opened: { accordion_id: slug, page_type: enumOf(...PAGE_TYPES) },
  js_error: {
    source_file: { type: "pattern", re: /^[A-Za-z0-9._-]{1,60}$/ },
    line: int(0, 1000000),
    message_short: { type: "text", max: 80 },
  },
  not_found: { requested_path: { type: "path" } },
};

// Server-only events (never accepted from the browser endpoint).
const SERVER_EVENTS = {
  api_call: {
    endpoint: enumOf("kto_attractions", "kto_festivals", "kakao_study_cafe"),
    region: { type: "pattern", re: SLUG, optional: true },
    city: { type: "pattern", re: SLUG, optional: true },
    status: enumOf("ok", "empty", "quota", "error", "skipped_no_key"),
    retried: bool,
    fallback_served: bool,
    latency_ms_bucket: enumOf("<300", "300–1000", "1000–3000", "3000+"),
  },
};

const PATH_RE = /^\/[^\s?#]{0,198}$/;

function validValue(rule, v) {
  switch (rule.type) {
    case "enum": return rule.values.includes(v);
    case "int": return Number.isInteger(v) && v >= rule.min && v <= rule.max;
    case "bool": return typeof v === "boolean";
    case "pattern": return typeof v === "string" && rule.re.test(v);
    case "text": return typeof v === "string" && v.length <= rule.max;
    case "path": return typeof v === "string" && PATH_RE.test(v);
    default: return false;
  }
}

function validParams(schema, params) {
  if (!params || typeof params !== "object" || Array.isArray(params)) return null;
  const out = {};
  for (const key of Object.keys(params)) {
    if (!(key in schema)) return null;
  }
  for (const [key, rule] of Object.entries(schema)) {
    const v = params[key];
    if (v === undefined || v === "") {
      if (rule.optional) continue;
      return null;
    }
    if (!validValue(rule, v)) return null;
    out[key] = v;
  }
  return out;
}

const TOP_LEVEL_FIELDS = new Set([
  "event_name", "schema_version", "page_path", "page_type", "prev_page_type",
  "page_load_id", "viewport_bucket", "browser_lang", "params",
]);

/** Returns the cleaned client payload, or null if anything is off-allowlist. */
export function validateClientEvent(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (Object.keys(body).some((k) => !TOP_LEVEL_FIELDS.has(k))) return null;
  const schema = EVENTS[body.event_name];
  if (!schema || body.schema_version !== SCHEMA_VERSION) return null;
  if (typeof body.page_path !== "string" || !PATH_RE.test(body.page_path)) return null;
  if (!PAGE_TYPES.includes(body.page_type)) return null;
  if (![...PAGE_TYPES, "external", "none"].includes(body.prev_page_type)) return null;
  if (typeof body.page_load_id !== "string" || !UUID.test(body.page_load_id)) return null;
  if (!VIEWPORT_BUCKETS.includes(body.viewport_bucket)) return null;
  if (typeof body.browser_lang !== "string" || !/^[a-z]{2,3}$/i.test(body.browser_lang)) return null;
  const params = validParams(schema, body.params ?? {});
  if (!params) return null;
  return {
    event_name: body.event_name,
    page_path: body.page_path,
    page_type: body.page_type,
    prev_page_type: body.prev_page_type,
    page_load_id: body.page_load_id.toLowerCase(),
    viewport_bucket: body.viewport_bucket,
    browser_lang: body.browser_lang.toLowerCase(),
    params,
  };
}

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|preview|python-requests|curl|wget|node-fetch|axios|go-http/i;

export function isLikelyBot(ua) {
  return !ua || BOT_RE.test(ua);
}

// Only the derived category is stored; the User-Agent itself is discarded.
export function deviceCategory(ua = "") {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(ua)) return "mobile";
  return "desktop";
}

// TRACKING_ENV overrides detection. Pages preview hosts carry an extra label in front of
// <project>.pages.dev (<hash>.<project>.pages.dev, <branch>.<project>.pages.dev).
export function envName(request, env) {
  if (env?.TRACKING_ENV) return env.TRACKING_ENV;
  const host = new URL(request.url).hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return "local";
  if (host.endsWith(".pages.dev") && host.split(".").length > 3) return "preview";
  return "production";
}

export function latencyBucket(ms) {
  if (ms < 300) return "<300";
  if (ms < 1000) return "300–1000";
  if (ms < 3000) return "1000–3000";
  return "3000+";
}

async function insert(db, row) {
  await db
    .prepare(
      `INSERT INTO events (event_id, ts_utc, event_name, schema_version, env, page_path, page_type,
        prev_page_type, page_load_id, device_category, viewport_bucket, country, browser_lang,
        is_likely_bot, params) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      row.event_name,
      SCHEMA_VERSION,
      row.env,
      row.page_path ?? null,
      row.page_type ?? null,
      row.prev_page_type ?? null,
      row.page_load_id ?? null,
      row.device_category,
      row.viewport_bucket ?? null,
      row.country ?? null,
      row.browser_lang ?? null,
      row.is_likely_bot ? 1 : 0,
      JSON.stringify(row.params)
    )
    .run();
}

/** Stores a validated client event. Never throws; no DB binding = silent no-op. */
export async function storeClientEvent(request, env, event) {
  if (!env?.DB) return;
  const ua = request.headers.get("user-agent") || "";
  try {
    await insert(env.DB, {
      ...event,
      env: envName(request, env),
      device_category: deviceCategory(ua),
      country: request.cf?.country || null,
      is_likely_bot: isLikelyBot(ua),
    });
  } catch {
    // tracking must never affect the response
  }
}

/**
 * Server-side `api_call` event from a Pages Function. Safe to call unconditionally: it validates
 * against the allowlist, defers the write with waitUntil and swallows every failure.
 */
export function logApiCall(context, fields) {
  const { request, env } = context;
  if (!env?.DB) return;
  try {
    const params = validParams(SERVER_EVENTS.api_call, fields);
    if (!params) return;
    const pageLoadId = request.headers.get("x-page-load-id");
    const ua = request.headers.get("user-agent") || "";
    const write = insert(env.DB, {
      event_name: "api_call",
      env: envName(request, env),
      page_load_id: pageLoadId && UUID.test(pageLoadId) ? pageLoadId.toLowerCase() : null,
      device_category: deviceCategory(ua),
      country: request.cf?.country || null,
      is_likely_bot: isLikelyBot(ua),
      params: { ...params, page_load_id: pageLoadId && UUID.test(pageLoadId) ? pageLoadId.toLowerCase() : null },
    }).catch(() => {});
    context.waitUntil(write);
  } catch {
    // ignore
  }
}
