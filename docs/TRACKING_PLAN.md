# Tracking Plan — worknstay korea

Status: **draft v0.4** · Owner: Irina

This document is the single source of truth for analytics on the site. It is tool-agnostic: events and parameters are defined here first, then implemented in whichever tool is chosen (§10). Any new or renamed event is added here before it is added to code.

---

## 1. Questions

### Calculator
| # | Question |
|---|---|
| Q1 | How are calculator outcomes distributed (`all_regions` / `non_capital_plus_decline` / `none`), and how does that vary by age, income, family and country? |
| Q2 | What do people do after getting a result — open a region, the population-decline page, Visa info, an official source? (Is the calculator useful?) |
| Q3 | Do people try many scenarios with the calculator? |
| Q4 | Do people notice that the map reacted to the result and scroll to it? |

### Navigation
| # | Question |
|---|---|
| Q5 | Is the sticky section nav used, and which sections? |
| Q6 | Main nav "Regions" leads to `/#map`, not the top of the home page — do people scroll up right after landing (expecting the top)? |
| Q7 | Do people go beyond region pages (Visa info, Settling in, About)? How do they reach the population-decline page? |
| Q8 | Do people view more than one region page in a row? |

### Map UX
| # | Question |
|---|---|
| Q9 | Desktop: do people hover over the map (some pins appear only on hover)? |
| Q10 | Touch devices: tapping a region scrolls to its card instead of opening it — do people understand this (repeated taps vs. opening the card)? |
| Q11 | Do people click the non-interactive vibe tags (expecting filters or search)? |

### Content usefulness
| # | Question |
|---|---|
| Q12 | Which outbound content is used: guides, coworkings, study-café search, colivings, rental platforms, communities, food, official sources? Clicks on official sources are the **main conversion proxy**. |
| Q13 | Do people scroll through the city cards on region pages? Which cities are seen? |
| Q14 | Are festival tabs and paging, place filters, the highlights carousel and the price-snapshot table used? |
| Q15 | Which FAQ questions on Visa info are opened most? |
| Q16 | How interested are people in the creator and the source: About, GitHub, Feedback? |
| Q16a | Do people read the long pages (Visa info, Settling in, region pages) to the end, or drop off early? |

### Acquisition
| # | Question |
|---|---|
| Q17 | Where does traffic come from (search, Reddit, contest page, direct)? |

### Infrastructure & quality
| # | Question |
|---|---|
| Q18 | How often do KTO / Kakao calls fail or hit the quota (per day, per region), how often is fallback shown, and how slow are the calls? |
| Q19 | Are there device- or browser-specific bugs (JS errors, 404s)? |

---

## 2. Privacy rules

- **No cookies, no localStorage / sessionStorage, no user or session IDs.**
- **No IP addresses, no raw User-Agent, no exact income or age.**
- Calculator inputs are stored only as **buckets** (§4).
- `page_load_id`: random UUID created on page load, kept **in memory only**. It links events within one page view and disappears on reload or navigation.
- Region-to-region journeys (Q8) are measured **without IDs**, from the same-origin `document.referrer` → `prev_page_type` (§3).
- Country is derived by Cloudflare at the edge (`request.cf.country`). The IP address is used by Cloudflare to determine the country but never reaches our data.
- Device category and bot flag are derived server-side from the User-Agent; only the derived value is stored.
- The calculator copy "Nothing is stored" must be replaced with an accurate statement before tracking ships.

**Why no session ID:** anonymous events with no identifier and nothing written to the device are not linkable to a person and need no consent banner. A session ID stored on the device (even in sessionStorage) is device storage for a non-essential purpose and makes events linkable, which in the EU generally requires consent. Both options require an honest privacy note; only the ID option is likely to require a banner.

---

## 3. Common fields (every event)

| Field | Type | Example | Notes |
|---|---|---|---|
| `event_id` | text (UUID) | — | generated server-side |
| `ts_utc` | text (ISO 8601) | `2026-10-20T03:12:44Z` | server time |
| `event_name` | text | `calculator_submitted` | from allowlist |
| `schema_version` | int | `1` | bump when an event's meaning or params change |
| `env` | text | `production` / `preview` / `local` | |
| `page_path` | text | `/regions/gangwon-do/` | no query string |
| `page_type` | text | `home` / `region` / `decline_areas` / `visa` / `settling` / `about` / `404` | |
| `prev_page_type` | text | `region` / `home` / … / `external` / `none` | from same-origin `document.referrer` |
| `page_load_id` | text (UUID) | — | in memory only |
| `device_category` | text | `mobile` / `tablet` / `desktop` | server-side |
| `viewport_bucket` | text | `<480` / `480–767` / `768–1023` / `1024–1439` / `1440+` | |
| `country` | text | `US` | Cloudflare |
| `browser_lang` | text | `en` | primary subtag only |
| `is_likely_bot` | bool | `false` | simple server-side heuristic |
| `params` | JSON | `{...}` | event-specific, validated against the allowlist |

All "click" events also fire on tap: browsers emit `click` for taps. `device_category` tells them apart. Hover events exist only on devices with a pointer.

---

## 4. Buckets

**Age** — split exactly at the visa boundary (35):
`<18` · `18–24` · `25–29` · `30–34` · `35–39` · `40–49` · `50+` · `invalid`

**Income** — stored as a **share of the GNI reference value**, never in won.
`share = income_krw / gni_krw`, computed with the same GNI value the calculator uses, with **no rounding before bucketing**.
Buckets are lower-inclusive, upper-exclusive `[a, b)`:
`<0.02` · `0.02–0.5` · `0.5–1` · `1–1.25` · `1.25–1.5` · `1.5–2` · `2–2.5` · `2.5+` · `invalid`
`<0.02` (under ~1M KRW a year) is implausible and flags likely input mistakes, e.g. an amount typed in USD or in thousands. A high share here is a UX signal (input mask, currency hint).
Example: income exactly equal to 1 × GNI → `1–1.25`.
Each event also stores `gni_year` (§9), so buckets stay comparable when GNI changes.

---

## 5. Events — calculator & home map

### `calculator_submitted` — Q1, Q3
| Param | Type | Values / example |
|---|---|---|
| `attempt_no` | int | `1`, `2`, … within one page load |
| `age_bucket` | text | `30–34` |
| `income_gni_bucket` | text | `1–1.25` |
| `with_family` | bool | `true` |
| `gni_year` | int | `2025` |
| `result` | text | `all_regions` / `non_capital_plus_decline` / `none` / `under_18` |

`under_18`: a valid age below the visa minimum — the calculator shows the "must be 18 or older" notice instead of a map result.

Analysis rule: `attempt_no = 1` for outcome statistics (Q1); `max(attempt_no)` per page load for Q3.

### `calculator_input_error` — Q1, Q19
Fired when the calculator asks the user to complete the form instead of showing a result. (Letters cannot be typed; a negative income is ignored; a negative age is converted to its absolute value — none of these produce an error.)
| Param | Type | Values |
|---|---|---|
| `field` | text | `income` / `age` / `both` |
| `reason` | text | `empty` / `zero` |

### `calculator_cleared` — Q3
| Param | Type | Values |
|---|---|---|
| `attempts_before_clear` | int | number of submissions in this page load before Clear |

### `map_seen_after_calculator` — Q4
Fired once, when ≥50% of the map enters the viewport after a submission.
| Param | Type | Values |
|---|---|---|
| `seconds_after_submit_bucket` | text | `<3` / `3–10` / `10–30` / `30+` |
| `result` | text | as above |

### `map_region_hover` — Q9 (pointer devices only)
Fired once per region per page load, after ≥300 ms of hover.
| Param | Type | Values |
|---|---|---|
| `region` | text | `gangwon-do` |

### `map_region_tap` — Q10 (touch devices only)
| Param | Type | Values |
|---|---|---|
| `region` | text | `gangwon-do` |
| `tap_no` | int | taps on this region in this page load; repeated taps signal confusion |

Interpretation: a `map_region_tap` followed by `region_link_click` with `source = home_card` for the same region means the behaviour was understood.

---

## 6. Events — navigation

### `page_view` — Q7, Q8, Q17
| Param | Type | Values |
|---|---|---|
| `referrer_domain` | text | `reddit.com` (external referrers only) |
| `utm_source` / `utm_medium` / `utm_campaign` | text | from the landing URL, if present |

### `nav_click` — Q5, Q6
| Param | Type | Values |
|---|---|---|
| `nav` | text | `main` / `section` |
| `item` | text | main: `logo` / `regions` / `visa` / `settling` / `about` · section (region pages): `map` / `cities` / `rent` / `events` / `places` / `dishes` · section (Visa info): `eligibility` / `documents` / `notes` / `questions` / `links` · section (Settling in): `renting` / `places_to_work` / `communities` / `links` |

### `regions_landing_scroll_up` — Q6
Fired if, within 10 s after arriving at `/#map` via main nav "Regions", the user scrolls up to the hero.
No params.

### `region_link_click` — Q2, Q7, Q8, Q10
Sent from the **source** page at click time (via `sendBeacon`, which survives navigation). URLs stay unchanged.
| Param | Type | Values |
|---|---|---|
| `target` | text | region slug, or `gyeonggi_decline_areas` |
| `source` | text | `home_map` / `home_card` / `prev_next` / `breadcrumb` / `region_badge` / `settling_in_link` / `calc_partial_hint` / `home_card_partial` |
| `calc_result` | text | the calculator result on this page load, or `none_calculated` |

Region → home map → another region is visible as a `region_link_click` on the home page with `prev_page_type = region`.

Known routes to the population-decline page: `settling_in_link`, `region_badge` (Gyeonggi-do page), `home_card_partial`, `calc_partial_hint`. `breadcrumb` exists only on the population-decline page (back to Gyeonggi-do).

### `internal_link_click` — Q2, Q7, Q16
| Param | Type | Values (examples) |
|---|---|---|
| `link_id` | text | `renting_intro_to_settling` / `visa_info_badge` / `eligibility_calculator_link` / `decline_visa_info` |

---

## 7. Events — content

### `outbound_click` — Q2, Q12, Q16
Category and id come from `data-link-category` / `data-link-id` attributes in templates — never guessed in JS.
| Param | Type | Values |
|---|---|---|
| `category` | text | `official` / `guide` / `coworking` / `study_cafe_search` / `coliving` / `rental_platform` / `community` / `map_app` / `food` / `source_credit` / `github` / `feedback` / `other` |
| `link_id` | text | stable id |
| `domain` | text | `hikorea.go.kr` |
| `section` | text | `visa_useful_links` / `region_guides` / `region_cities` / `region_dishes` / `settling_renting` / … |
| `city` | text | set for links inside a city card, else empty |

### `city_card_seen` — Q13
Fired once per city per page load when ≥50% of the card is visible. Works on desktop and mobile.
| Param | Type | Values |
|---|---|---|
| `region` | text | `gangwon-do` |
| `city` | text | `sokcho` |
| `position` | int | order of the card on the page (1-based) |

### `section_seen` — Q16a
Fired once per section per page load when the section heading enters the viewport. Sections (not scroll percentages) are used because percentages depend on screen size.
| Param | Type | Values |
|---|---|---|
| `section` | text | Region pages: `highlights` / `map` / `cities` / `rent` / `events` / `places` / `dishes` / `prev_next` · Visa info: `eligibility` / `income_table` / `documents` / `notes` / `questions` / `links` · Settling in: `renting` / `short_term` / `colivings` / `places_to_work` / `search_notes` / `communities` / `links` |
| `seconds_since_load_bucket` | text | `<10` / `10–30` / `30–120` / `120+` |

### `vibe_tag_click` — Q11
Clicks on non-interactive tags (dead-click detector).
| Param | Type | Values |
|---|---|---|
| `tag` | text | `surf` |
| `location` | text | `home_card` / `region_header` / `city_card` |

### `festival_tab_switch` — Q14
| Param | Type | Values |
|---|---|---|
| `tab` | text | `ongoing` / `upcoming` |
| `region` | text | |

### `festival_page_change` — Q14
| Param | Type | Values |
|---|---|---|
| `page_no` | int | |
| `region` | text | |

### `places_filter_used` — Q14
| Param | Type | Values |
|---|---|---|
| `filter_type` | text | `area` / `type` |
| `value` | text | `sokcho` / `nature` |
| `region` | text | |

### `highlights_carousel_nav` — Q14
| Param | Type | Values |
|---|---|---|
| `direction` | text | `next` / `prev` |
| `region` | text | |

### `accordion_opened` — Q14, Q15
| Param | Type | Values |
|---|---|---|
| `accordion_id` | text | `price_snapshot_gangwon` / `faq_freelancer` / … |
| `page_type` | text | |

FAQ items use the `faq_` prefix in `accordion_id`.

---

## 8. Events — quality & infrastructure

### `js_error` — Q19
| Param | Type | Values |
|---|---|---|
| `source_file` | text | `calculator.js` |
| `line` | int | |
| `message_short` | text | first 80 characters, no user data |

### `not_found` — Q19
| Param | Type | Values |
|---|---|---|
| `requested_path` | text | no query string |

### `api_call` — Q18 *(server-side, in Pages Functions)*
The number of calls per page view is defined by the code; this event records what actually happened (failures, retries, quota, fallbacks, latency).
| Param | Type | Values |
|---|---|---|
| `endpoint` | text | `kto_attractions` / `kto_festivals` / `kakao_study_cafe` |
| `region` / `city` | text | |
| `status` | text | `ok` / `empty` / `quota` / `error` / `skipped_no_key` |
| `retried` | bool | |
| `fallback_served` | bool | |
| `latency_ms_bucket` | text | `<300` / `300–1000` / `1000–3000` / `3000+` |
| `page_load_id` | text | forwarded from the client in a request header |

---

## 9. Reference data

Table `gni_reference`:

| Column | Example | Notes |
|---|---|---|
| `application_year` | `2026` | year in which the threshold applies |
| `gni_year` | `2025` | year of the GNI figure used |
| `gni_krw` | `52410000` | |
| `source_url` | | Bank of Korea / immigration notice |
| `valid_from` | `2026-01-01` | when the site started using this value |

Join `events.gni_year = gni_reference.gni_year` to convert income buckets back to won ranges.

---

## 10. Implementation — decision pending

| | A. Own storage (Cloudflare D1) | B. PostHog (cookieless) |
|---|---|---|
| Setup | Custom endpoint, schema, validation | Script + config (`persistence: 'memory'`), events via `posthog.capture` |
| Funnels / dashboards | Written in SQL | Built in UI; SQL also available |
| Heatmaps, session replay | No | Yes (input masking must be verified, especially calculator fields) |
| Data location | Own Cloudflare account | Third-party processor (EU or US cloud) |
| Server-side `api_call` | Native | Via PostHog capture API from Functions, or keep this event in D1 |
| Portfolio angle | Event design + pipeline + SQL analysis | Event design + industry-standard tool |

Either way, the privacy note must name what is collected; option B must also name PostHog.

Storage schema for option A:

```sql
CREATE TABLE events (
  event_id        TEXT PRIMARY KEY,
  ts_utc          TEXT NOT NULL,
  event_name      TEXT NOT NULL,
  schema_version  INTEGER NOT NULL,
  env             TEXT NOT NULL,
  page_path       TEXT,
  page_type       TEXT,
  prev_page_type  TEXT,
  page_load_id    TEXT,
  device_category TEXT,
  viewport_bucket TEXT,
  country         TEXT,
  browser_lang    TEXT,
  is_likely_bot   INTEGER DEFAULT 0,
  params          TEXT          -- JSON
);
CREATE INDEX idx_events_name_ts ON events(event_name, ts_utc);
CREATE INDEX idx_events_page_load ON events(page_load_id);

CREATE TABLE gni_reference (
  application_year INTEGER PRIMARY KEY,
  gni_year         INTEGER NOT NULL,
  gni_krw          INTEGER NOT NULL,
  source_url       TEXT,
  valid_from       TEXT
);
```

---

## 11. Environments & testing

| Env | Destination | How events get there |
|---|---|---|
| `local` | local D1 / PostHog test project | `localhost:8788` |
| `preview` | separate preview DB / test project | preview deployments (separate binding in Pages → Settings → Bindings → Preview) |
| `production` | production DB / project | live site only |

Test checklist before merging:
1. Locally, trigger every event once and check that each arrives with correct params.
2. A payload with an unknown event name or extra field is rejected.
3. The UI never blocks or errors if tracking fails.
4. Repeat step 1 on a preview deployment.
5. DevTools → Application: no cookies, no storage entries.

---

## 12. Rollout & data policy

- **Single release** for all events. Implementation order: calculator → navigation → content → quality → map UX.
- First review of naming and params after ~2 weeks of data. Changes after that bump `schema_version` and are logged in §13.
- **Data retention (proposed):** how long records are kept, not a user-retention metric. Raw event rows are deleted after 24 months; only monthly summary tables remain (e.g. "Oct 2026: 120 calculator submissions, 40% `all_regions`"). Returning-user retention cannot be measured by design, since there is no user ID.
- **Sharing:** only aggregated tables, never raw rows.

---

## 13. Changelog

| Date | Version | Change |
|---|---|---|
| 2026-10-17 | 0.1 | First draft |
| 2026-10-17 | 0.4 | `<0.02` income bucket for implausible inputs; `section_seen` on Visa info, Settling in and region pages |
| 2026-10-17 | 0.3 | Calculator validation matched to actual behaviour (`under_18` result, `empty` / `zero` errors); region → map → region path; data retention wording clarified |
| 2026-10-17 | 0.2 | Questions rewritten around actual calculator logic (ternary result); nav questions split; added map hover/tap, city cards, guides, About/GitHub/Feedback, price snapshot; region entry sources corrected; source tracked at click time instead of `?from=`; `with_family`; param types; bucket boundaries defined; Q8 via referrer instead of session ID; single release; implementation options A/B |
