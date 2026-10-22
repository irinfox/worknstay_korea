# Tracking Plan — worknstay korea

Status: **draft v0.9** · Owner: Irina

This document is the single source of truth for analytics on the site. It is tool-agnostic: events and parameters are defined here first, then implemented in whichever tool is chosen. Any new or renamed event is added here before it is added to code.

---

## 1. Questions

| # | Question | Type |
|---|---|---|
| Q1 | Do people use the calculator at all? Or go directly to map / visa / settling in page? Do they drop-off without checking eligibility? | Product |
| Q2 | How are calculator outcomes distributed (`all_regions` / `non_capital_plus_decline` / `none`), and how does that vary by age, income, family and country? (user profile) | Product |
| Q3 | What do people do after getting a result — open a region, Visa info, leave site? **Main site metric: calc -> region**. | Product |
| Q4 | Do people go beyond region pages (Visa info, Settling in, About)? | Product |
| Q5 | Which sections on region pages get the most engagement (manual stay data - rents, cities - vs automated leisure data - events, attractions)? | Content |
| Q6 | Which outbound content is used: guides, coworkings, study-café search, rental platforms, communities, colivings, food, official sources? | Content |
| Q7 | Which FAQ questions on Visa info are opened most? | Content |
| Q8 | Do people read the long pages (Visa info, Settling in, region pages) to the end, or drop off early? | Content |
| Q9 | Do people try many scenarios ("play") with the calculator? | Behaviour |
| Q10 | Do people view more than one region page in a row? | Behaviour |
| Q11 | How interested are people in the creator and the source: About, GitHub, Feedback? | Brand |
| Q12 | Do people notice that the map reacted to the result and scroll to it? | UX |
| Q13 | Is the sticky section nav used, and which sections? | UX |
| Q14 | Main nav "Regions" leads to `/#map`, not the top of the home page — do people scroll up right after landing (expecting the top)? | UX |
| Q15 | How do people reach the population-decline page? (Gyeonggi-do region badge, calc notice, region notice, partial map results) | UX |
| Q16 | Desktop: do people hover over the regional map (some pins appear only on hover)? | UX |
| Q17 | Desktop: do people hover over the national map (hovering it highlights region area and region card)? | UX |
| Q18 | Desktop: how do people reach region page (click on map region, click on region card)? | UX |
| Q19 | Touch devices: tapping a region scrolls to its card instead of opening it — do people understand this (repeated taps vs. opening the card)? | UX |
| Q20 | Do people click non-interactive elements (vibe tags, attractions, events) expecting links, filters, or search? | UX |
| Q21 | Do people scroll through galleries (highlights, cities, attractions, food)? | UX |
| Q22 | Are festival tabs and paging, place filters, the highlights carousel and the price-snapshot table on Settling in used? | UX |
| Q23 | Where does traffic come from (search, Reddit, instagram, direct)? | Acquisition |
| Q24 | How often do KTO / Kakao calls fail or hit the quota (per day, per region), how often is fallback shown, and how slow are the calls? | Infra |
| Q25 | Are there device- or browser-specific bugs (JS errors, not found page)? | Infra |

---

## 2. Privacy rules

- **No cookies, no localStorage / sessionStorage, no user or session IDs.**
- **No IP addresses, no raw User-Agent, no exact income or age.**
- Calculator inputs are stored only as **buckets** (§4).
- `page_load_id`: random UUID created on page load, kept **in memory only**. It links events within one page view and disappears on reload or navigation.
- PostHog's distinct, person and session ids follow the same rule: random, memory-only, new on every page view.
- Region-to-region journeys are measured **without IDs**, from the same-origin `document.referrer` → `prev_page_type` (§3).
- Country is derived by Cloudflare at the edge (`request.cf.country`). The IP address is used by Cloudflare to determine the country but never reaches our data.
- Device category and bot flag are derived server-side from the User-Agent; only the derived value is stored.
- The calculator copy should inform the user that inputs are used anonymously for site analytics.

**Why no session / user ID:** anonymous events with no identifier and nothing written to the device are not linkable to a person and need no consent banner. A session ID stored on the device (even in sessionStorage) is device storage for a non-essential purpose and makes events linkable, which in the EU (GDPR) and RK (PIPA) generally requires prior user consent.

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
| `prev_page_type` | text | `region` / `home` / … / `external`; `null` when there is no referrer | from same-origin `document.referrer` |
| `page_load_id` | text (UUID) | — | in memory only |
| `event_seq` | int | `1`, `2`, … | order of client events within one `page_load_id`, set in the browser; a gap means a lost event. `null` on server-side `api_call` rows |
| `device_category` | text | `mobile` / `tablet` / `desktop` | server-side |
| `viewport_bucket` | text | `<360` / `360–399` / `400–479` / `480–599` / `600–767` / `768–899` / `900–1023` / `1024–1149` / `1150–1439` / `1440+` | |
| `country` | text | `US` | Cloudflare |
| `browser_lang` | text | `en` | primary subtag only |
| `is_likely_bot` | bool | `false` | simple server-side heuristic |
| `params` | JSON | `{...}` | event-specific, validated against the allowlist |

All "click" events also fire on tap: browsers emit `click` for taps. `device_category` tells them apart. Hover events exist only on devices with a pointer.

---

## 4. Buckets

**Age** — the visa boundary is 35, so it makes sense to use smaller buckets first:
`<18` · `18–24` · `25–29` · `30–34` · `35–39` · `40–49` · `50+` · `invalid`

**Income** — stored as a **share of the GNI reference value**, never as an exact amount.
`share = income_krw / gni_krw`, computed with the same GNI value the calculator uses, with **no rounding before bucketing**.
Buckets are lower-inclusive, upper-exclusive `[a, b)`:
`<0.02` · `0.02–0.5` · `0.5–1` · `1–1.25` · `1.25–1.5` · `1.5–2` · `2–2.5` · `2.5+` · `invalid`
`<0.02` (under ~1M KRW a year) is implausible and flags likely input mistakes, e.g. an amount typed in USD or in thousands. A high share here is a UX signal (input mask, currency hint).
Example: income exactly equal to 1 × GNI → `1–1.25`.
Each event also stores `gni_year` (§9), so buckets stay comparable when GNI changes.

---

## 5. Events — calculator & home map

### calculator_interaction_started — Q1
Fired exactly once per page load when the user focuses on any calculator input field, clicks a checkbox or submits the form (even an empty one). Used as the top of the calculator funnel; always precedes the first `calculator_input_error` / `calculator_submitted`.
No params.

### `calculator_submitted` — Q1, Q2, Q9
| Param | Type | Values / example |
|---|---|---|
| `attempt_no` | int | `1`, `2`, … within one page load |
| `age_bucket` | text | `30–34` |
| `income_gni_bucket` | text | `1–1.25` |
| `with_family` | bool | `true` |
| `gni_year` | int | `2025` |
| `result` | text | `all_regions` / `non_capital_plus_decline` / `none` / `under_18` |

`under_18`: a valid age below the visa minimum — the calculator shows the "must be 18 or older" notice instead of a map result.

Analysis rule: `attempt_no = 1` for outcome statistics (Q2); `max(attempt_no)` per page load for Q9.

### `calculator_input_error` — Q1
Fired when the calculator asks the user to complete the form instead of showing a result. 
(Letters cannot be typed; a negative income is ignored; a negative age is converted to its absolute value — none of these produce an error.)
| Param | Type | Values |
|---|---|---|
| `field` | text | `income` / `age` / `both` |
| `reason` | text | `empty` / `zero`; `zero` applies to income only, so `both` + `zero` means zero income and empty age |

### `calculator_cleared` — Q9
| Param | Type | Values |
|---|---|---|
| `attempts_before_clear` | int | number of submissions in this page load before Clear |

### `map_seen_after_calculator` — Q3, Q12
Fired once, when ≥50% of the map enters the viewport after the latest submission.
| Param | Type | Values |
|---|---|---|
| `seconds_after_submit_bucket` | text | `<3` / `3–10` / `10–30` / `30+` |
| `result` | text | as above |

### `home_map_region_hover` — Q17 (pointer devices only)
Fired once per region per page load, after ≥300 ms of hover. Hovering a region on the national map highlights its region card.
| Param | Type | Values |
|---|---|---|
| `region` | text | `gangwon-do` |

### `home_map_region_click` — Q19 (touch devices only)
Fired on screens below 1024px, as it is when we re-order cards from map side to below map carousel.
| Param | Type | Values |
|---|---|---|
| `region` | text | `gangwon-do` |
| `tap_no` | int | taps on this region in this page load; repeated taps signal confusion |

Interpretation: a `home_map_region_click` followed by `internal_link_click` with `source = home_card` and `target_page_type = region` for the same region means the behaviour was understood and the main site usefulness was fulfilled.

---

## 6. Events — navigation

### `page_view` — Q23
| Param | Type | Values |
|---|---|---|
| `referrer_domain` | text | `reddit.com` (external referrers only) |
| `utm_source` / `utm_medium` / `utm_campaign` | text | from the landing URL, if present |

### `nav_click` — Q4, Q5, Q11, Q13
| Param | Type | Values |
|---|---|---|
| `nav` | text | `main` / `section` |
| `item` | text | main: `logo` / `regions` / `visa` / `settling` / `about` · section (region pages): `map` / `cities` / `rent` / `events` / `places` / `dishes` · section (Visa info): `eligibility` / `documents` / `notes` / `questions` / `links` · section (Settling in): `renting` / `places_to_work` / `communities` / `links` · section (any page with a section nav): `top` |
| `calc_result` | text | the calculator result on this page load, `none_calculated` if on the home page but user didn't use calculator, `null` for pages other than home |

### `regions_landing_scroll_up` — Q14
Fired if, within 10 s after arriving at `/#map` via main nav "Regions", the user scrolls up to the hero by ≥150px.
No params.

### `internal_link_click` — Q1, Q3, Q4, Q5, Q10, Q15, Q18
Sent from the **source** page at click time (via `sendBeacon`, which survives navigation). URLs stay unchanged.
| Param | Type | Values |
|---|---|---|
| `target_page_type` | text | `home` / `region` / `decline_areas` / `visa` / `settling` / `about` |
| `target` | text | region slug, or a link ID: `regions_map` / `gyeonggi_decline_areas` / `region_note_link` / `calc_result_link` / `eligibility_calculator` / `renting_intro_link` / `visa_info` / `settling_in` |
| `source` | text | where the link sits: `home_map` / `home_card` / `prev_next` / `breadcrumb` / `region_badge` / `visa_info_faq_link` / `calc_partial_hint` / `calc_hint` / `content_text` |
| `calc_result` | text | the calculator result on this page load, `none_calculated` if on the home page but user didn't use calculator, `null` for pages other than home |

Known routes to the population-decline page: `visa_info_faq_link`, `region_badge` (Gyeonggi-do page), `home_card`, `home_map`, `calc_partial_hint`.
`breadcrumb` exists on every region page and population-decline page, leads to `/#map` on Regions click and back to Gyeonggi-do on the population-decline page.

---

## 7. Events — content

### `outbound_click` — Q5, Q6
Category and id come from `data-link-category` / `data-link-id` attributes in templates — never guessed in JS.
| Param | Type | Values |
|---|---|---|
| `category` | text | `official` / `guide` / `coworking` / `study_cafe_search` / `coliving` / `rental_platform` / `community` / `map_app` / `food` / `source_credit` / `github` / `feedback` / `other` |
| `link_id` | text | stable id |
| `domain` | text | `hikorea.go.kr` |
| `section` | text | `visa_useful_links` / `region_guides` / `region_cities` / `region_dishes` / `settling_renting` / … |
| `city` | text | set for links inside a city card, else `null` |

### `gallery_scrolled` — Q5, Q21
Fired once per gallery type per page load, on the first scroll the visitor drives (wheel, touch, drag, keys). Autoplay and prev/next buttons do not count.
| Param | Type | Values |
|---|---|---|
| `region` | text | `gangwon-do` |
| `gallery_type` | text | `highlights` / `cities` / `attractions` / `dishes` |

### `section_seen` — Q5, Q8
Fired once per section per page load when enough of the section has stayed in the viewport for 1 s: at least half of the section, or 30% of the viewport height for tall sections. Jumps via section nav and fast scrolling past a section don't count. Sections (not scroll percentages) are used because percentages depend on screen size.
| Param | Type | Values |
|---|---|---|
| `section` | text | Region pages: `highlights` / `map` / `cities` / `rent` / `events` / `places` / `dishes` / `prev_next` · Visa info: `eligibility` / `income_table` / `documents` / `notes` / `questions` / `links` · Settling in: `renting` / `short_term` / `colivings` / `places_to_work` / `search_notes` / `communities` / `links` |
| `seconds_since_load_bucket` | text | `<10` / `10–30` / `30–120` / `120+` |

### `vibe_tag_click` — Q20
Clicks on non-interactive tags (dead-click detector).
| Param | Type | Values |
|---|---|---|
| `tag` | text | `surf` |
| `location` | text | `home_card` / `region_header` / `city_card` |
| `region` | text | `gangwon-do` |
| `city` | text | city slug from `src/_data/cities.json`; `null` unless `location` is `city_card` |

### `region_map_poi_hover` — Q16, Q20 (pointer devices only)
Fired once per POI per page load, after ≥300 ms of hover.
| Param | Type | Values |
|---|---|---|
| `poi_name` | text | `sokcho` / `yangyang_beaches` |
| `poi_type` | text | `city` / `mountain` / `surf_beach` / `ski_resort` / `beach` / `history` / `greenery` |
| `is_interactive` | bool | `false` for non-interactive elements, otherwise `true` |

### `region_map_poi_click` — Q16, Q20
Fires on tap for mobile devices and on click for desktop devices for both active and non-active POIs.
| Param | Type | Values |
|---|---|---|
| `poi_name` | text | `yangyang_beaches` |
| `poi_type` | text | `city` / `mountain` / `surf_beach` / `ski_resort` / `beach` / `history` / `greenery` |
| `is_interactive` | bool | `false` for non-interactive elements, otherwise `true` |

### `festival_interacted` — Q22
| Param | Type | Values |
|---|---|---|
| `action` | text | `tab_switch` / `month_filter` / `page_change` |
| `tab` | text | `ongoing` / `upcoming` — on `tab_switch` or `page_change`, `upcoming` on `month_filter` |
| `region` | text | `gangwon-do` |
| `month_selected` | text | `october`; only on `month_filter`, and on `page_change` inside an Upcoming tab, if it has more than 1 month with events |
| `page_no` | int | `2`; only on `page_change` |

Re-selecting the active tab or month is not an event.

### `places_filter_used` — Q22
| Param | Type | Values |
|---|---|---|
| `filter_type` | text | `area` / `type` |
| `value` | text | `sokcho` / `nature` |
| `region` | text | `gangwon-do` |
| `area_selected` | text | area pill active in the current page state, either just clicked or from previous state |
| `type_selected` | text | type pill active in the current page state, either just clicked or from previous state |

`filter_type` + `value` say what was clicked; the `*_selected` pair is the full filter state. Re-selecting the active pill is not an event.

### `highlights_carousel_nav` — Q22
| Param | Type | Values |
|---|---|---|
| `direction` | text | `next` / `prev` |
| `region` | text | `gangwon-do` |

### `accordion_opened` — Q7, Q22
| Param | Type | Values |
|---|---|---|
| `accordion_id` | text | `settling_in_price_snapshot` / `visa_info_faq` |
| `item_id` | text | Settling in: `gangwon-do` · Visa info: `calculate_and_convert` / `reside_in_capital` / `freelancer` / `work_for_korean_company` / `family` / `insurance` / `criminal_record` / `change_visa_type` / `nationalities` / `visit_without_visa` / `arc` / `permanent_residence` |

---

## 8. Events — quality & infrastructure

### `js_error` — Q25
| Param | Type | Values |
|---|---|---|
| `source_file` | text | `calculator.js` |
| `line` | int | `42` |
| `message_short` | text | first 80 characters, all digits masked as `#` so no typed age or income can appear |

### `not_found` — Q25
| Param | Type | Values |
|---|---|---|
| `requested_path` | text | no query string |

### `api_call` — Q24 *(server-side, in Pages Functions)*
The number of calls per page view is defined by the code; this event records what actually happened (failures, retries, quota, fallbacks, latency).
| Param | Type | Values |
|---|---|---|
| `endpoint` | text | `kto_attractions` / `kto_festivals` / `kakao_study_cafe` |
| `region` | text | `gangwon-do` |
| `city` | text | city name (i.e. `sokcho`) for Kakao calls / `null` for KTO calls |
| `kto_codes_requested` | int | number of codes fetched in this request: `9` for KTO / `null` for Kakao |
| `status` | text | `ok` / `empty` / `quota` / `error` / `skipped_no_key` |
| `retried` | bool | a retry after a failure (KTO: made by the server within the call; Kakao: made by the page and flagged with a request header) |
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
| `valid_from` | `2026-06-30` | when the site started using this value |

Join `events.gni_year = gni_reference.gni_year` to convert income buckets back to won ranges.

---

## 10. Implementation strategy

Two tools are used for analytics: Cloudflare D1 and cookieless PostHog.

**Cloudflare D1:** own tracking system with full control of pipeline and event design. Data engineering + analytics SQl angle.
Storage schema: [`0001_create_tracking.sql`](../migrations/0001_create_tracking.sql)

**PostHog:** industry-standard tool with AB experiments, user heatmaps and session replays. Product data analyst angle.

PostHog setup (EU cloud, one project for all environments):
- Memory-only persistence: Client IPs are not stored and internal IDs live for a single page view.
- Strict data masking: Replays mask all user inputs and block the calculator card entirely (`ph-no-capture`). Page text is
  public content and is not masked.
- Privacy compliance: The SDK is not loaded when the browser sends Do Not Track (DNT) or Global Privacy Control (GPC) signals.
- Environment setup: The project key is public and set in `src/_data/posthog.json`. Every event carries an `env` parameter (`production` / `preview` / `local`) matching the D1 setup; reports exclude non-production through the project's test-account filter.
- D1 events are not mirrored.


---

## 11. Environments & testing

| Env | Destination | How events get there |
|---|---|---|
| `local` | local D1 / PostHog (same project, `env` = `local`) | `localhost:8788` |
| `preview` | separate preview DB / same PostHog project (`env` = `preview`) | Cloudflare Pages preview `<x>.worknstay-korea.pages.dev` |
| `production` | production DB / same PostHog project (`env` = `production`) | `worknstay-korea.com` |

Test checklist:
1. Locally, trigger every new or changed event once and check that each arrives with correct params.
2. A payload with an unknown event name or extra field is rejected.
3. The UI never blocks or errors if tracking fails.
4. Repeat step 1 on a preview deployment.
5. DevTools → Application: no cookies, no storage entries (PostHog loaded).
6. A replay of a calculator run shows the card blocked and any other input masked.

---

## 12. Rollout & data policy

- **Single release** for all events. Implementation order: calculator → navigation → content → quality → map UX.
- First review of naming and params after ~2 weeks of data. Changes after that bump `schema_version` and are logged in §13.
- **Data retention:** raw event rows are deleted after 24 months; only monthly summary tables remain (e.g. "Oct 2026: 120 calculator submissions, 40% `all_regions`").
- **Sharing:** only aggregated tables, never raw rows.

---

## 13. Changelog

| Date | Version | Change |
|---|---|---|
| 2026-10-22 | 0.9 | PostHog added: memory-only, replay with inputs masked and calculator card blocked, heatmaps, autocapture (clicks); D1 events not mirrored |
| 2026-10-22 | 0.8 | `event_seq` common field (client events, per page load); `prev_page_type` is `null` instead of `none`; `section_seen` needs enough of the section in view for 1 s; `calculator_interaction_started` also fires on submit; `places_filter_used` carries full filter state (`area_selected`, `type_selected`) and skips re-selecting the active pill |
| 2026-10-22 | 0.7 | `vibe_tag_click` gets `region` and `city` params |
| 2026-10-22 | 0.6 | Back to top tracked as `nav_click` item `top`; hero scroll cue and 404 page links tracked as `internal_link_click` (`content_text`; new targets `visa_info`, `settling_in`) |
| 2026-10-21 | 0.5 | Re-arranged Questions section (added several new); clarified privacy rules (GDPR/PIPA); added `calculator_interaction_started` event; merged region and internal link clicks into a unified `internal_link_click` (added calc_result); replaced `city_card_seen` with generic `gallery_scrolled`; added `region_map_poi_hover` and `_click` events; consolidated festival events into `festival_interacted` (added action param); added `kto_codes_requested` to `api_call`; linked SQL schema file instead of its citation |
| 2026-10-17 | 0.4 | `<0.02` income bucket for implausible inputs; `section_seen` on Visa info, Settling in and region pages |
| 2026-10-17 | 0.3 | Calculator validation matched to actual behaviour (`under_18` result, `empty` / `zero` errors); region → map → region path; data retention wording clarified |
| 2026-10-17 | 0.2 | Questions rewritten around actual calculator logic (ternary result); nav questions split; added map hover/tap, city cards, guides, About/GitHub/Feedback, price snapshot; region entry sources corrected; source tracked at click time instead of `?from=`; `with_family`; param types; bucket boundaries defined; Q8 via referrer instead of session ID; single release; implementation options A/B |
| 2026-10-17 | 0.1 | First draft |
