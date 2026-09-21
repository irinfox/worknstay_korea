# worknstay korea — design conventions

Reference tool, not a magazine or a community site. White ground, quiet type, data first.
This file is authoritative. Derived from a reference mock, September 2026; the mock is not
in the repo and is not maintained.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#16201C` | Body text, dark nav bar, wordmark dot ring |
| Ink soft | `#23342C` / `#33443C` / `#4A544E` | Secondary paragraphs, form labels |
| Muted | `#5C6660` | Captions, addresses, source lines, festival dates, metadata |
| Hairline | `#E4E7E4` / `#EDF0EE` | Card borders, row dividers |
| Panel | `#F7F9F8` | Info cards, guides strip, un-evaluated calculator state |
| Green | `#0F7B54` | Primary accent, in-site links, eligible state |
| Green tint | `#EAF4EF` / `#DCEFE5`, border `#A9D8C2` / `#C9E3D6` | Tinted bands, vibe tags, note plates |
| Green deep | `#0B5C3F` | Vibe-tag text, in-site link hover |
| Green light | `#A8D8C2` | "Partly eligible" map fill and calculator state |
| Map grey | `#B7B2A7` | "Not eligible" map fill — data colour, never chrome |
| Focus ring | `#2F6FED` | Keyboard focus only. Deliberately outside the palette: a focus
  indicator must be unmistakable and blue is what users recognise. Never for anything else. |
| Amber | `#F7EAD9` | "Stricter" note plates, not-eligible calculator state |
| Orange rule | `#E08A2E` | 56×3px rule above every page headline, 3×15px section ticks |
| Orange text | `#C2531A` | Outbound links, spicy tag |
| Orange ink | `#A8450F` | Small orange text on tinted plates (dish labels), outbound link hover.
  Deeper than Orange text so 12px passes 4.5:1 on amber and panel grounds. |

Two accent colours only. Green = ours / easier / in-site. Orange = external / stricter / seasonal.
Filled badge pills are exempt: they read as labels, not links, so they keep their semantic colour
(green long-term / orange current).
Arrows follow colour: `→` for in-site, `↗` for outbound. `‹ ›` are reserved for stepper
navigation (galleries, pagers) — never for links, so the two read as distinct affordances.
One tint band per page at most. Panel `#F7F9F8` is a component fill (cards, strips, map ground)
and does not count as a page tone.

**Calculator states.** `#F7F9F8` nothing evaluated yet · `#DCEFE5` eligible · `#EAF4EF` partly
eligible (decline-designated counties only) · `#F7EAD9` not eligible yet (income short or under 18).
No red — the calculator has no error states, only answers. Colour carries the outcome, text
carries the reason. The tint never changes the colour of a link inside it. "Partly eligible" is
the same term the map legend uses — one word per state across the site.

## Fonts

**Two families, no others.** This is settled — do not re-derive it, do not substitute, do not add
a third face.

| Script | Family | Weights | Stack |
| --- | --- | --- | --- |
| Latin | **Instrument Sans** | 400, 500, 600 | `'Instrument Sans', system-ui, -apple-system, 'Segoe UI', sans-serif` |
| Korean | **Noto Sans KR** | 400, 500 | `'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif` |

One Google Fonts request, exactly this:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Noto+Sans+KR:wght@400;500&display=swap" rel="stylesheet">
```

- Instrument Sans is the page default, set once on `body`. Never repeat it per element.
- The Korean stack applies **only** to elements holding Hangul — region and city names, dish
  names, place names, the Korean subhead under an H1. Everything else inherits Latin.
- Korean sits at 400 (500 only in the festival cards), always one step smaller than the Latin it
  accompanies, in `#5C6660`, baseline-aligned to it (`align-items:baseline`, never centred).
- No 800 weights, no condensed display faces, no mono uppercase eyebrows, no italics — the one
  exception is map context labels (neighbouring regions, North Korea), where italic is the
  cartographic convention for "not the subject of this map".

## Type scale

- Page H1: 40–44px / 600 / `-0.028em` (phone 30–32px)
- Section H2: 20–22px / 600 / `-0.015em`
- Card title: 16–18px / 600
- Body: 15px / 1.65–1.7
- Form label: 13px / 500 / `#33443C`, 7px above its input
- Form input: ≥16px (below that iOS Safari zooms on focus)
- Caption, source, address: 12–13px, `#5C6660`
- Festival status chip: 11px / 500 / uppercase with letter-spacing — the one place type goes
  below 12px, because all-caps at 11px reads larger than its nominal size.
- Sentence case everywhere. All-caps only in the festival status chips. Lowercase is fine in
  tags and pills (`spicy`, `surf`) — they are labels, not sentences.

## Geometry

Radius 10–12px cards, 20–22px pills, 8px inputs. Hairlines 1px. Designed at a 1280px desktop
viewport and a 390px phone; the container inside it is 1200px. Page padding 32px desktop /
16px phone. Section gaps 26–36px.
Flex/grid with `gap` — never margin-spaced inline siblings.

One container width site-wide. Body text caps at ~70ch (~640px) inside it; tinted bands and card
grids use the full container. Text never fills the container. A tinted panel may bleed past the
text column — what must align is the panel's *content*, not its edge.

The container is a maximum, not a fixed width: between 1024 and 1199 it shrinks and nothing
reflows. Multi-column layouts hold to 1024, then collapse. Where a grid's columns are fractional
it narrows proportionally and needs no checking; where any column is a fixed width, the remaining
column absorbs the whole reduction — check those at 1024, not only at 1200.

## Mobile

At 900px and below, hover cannot be assumed: every hover behaviour has a tap equivalent.
Horizontal swipe for galleries and card sets; carousel cards are equal height. Repeated stepping
groups its arrows in one corner; page-level prev/next splits them to the container edges.

**Dots only exist where a row actually swipes.** A static grid never gets them, at any width.
Within a swipe row it depends on how much of the next card shows: a sliver is not a cue, so
full-width cards with a peeking edge (region, city) get dots. Where roughly a third or more of 
the next card is visible, that cut card is the affordance — no dots.

Blurbs are never clamped to make a row line up — equal height comes from `align-items:stretch`.
`src/_data/` is verified content: the layout adapts to it, never the reverse.

Stepping controls are one size site-wide: the festival pager matches the region-page gallery
arrows. Where a control is below 44px on phone, it reaches the minimum through padding — the
visible box stays as designed.

## Empty & fallback states

No dashed or dotted borders — they read as unfinished wireframe. An empty state is a muted
`#5C6660` sentence in the slot the content would have filled, heading kept; `#F7F9F8` fill only
where the slot must hold its shape (image placeholders). Missing data and no-JS fallbacks get the
same treatment — they are ordinary states, not errors. Wording says what is missing:
"No cost-of-living figures for this region yet."

## Recurring parts

- **Dark nav** `#16201C`, wordmark "worknstay korea" with site icon, links at 75% white,
  active item white with a 2px `#E08A2E` underline. Items: Regions · Visa info · Settling in · About.
  "Regions" links to `/#map`, not `/`. The wordmark is the home link and stays clickable on the homepage.
- **Breadcrumb** row under the nav, 13px, `Regions / <span ink>Gangwon-do</span>`. "Regions" → `/#map`.
- **Headline block**: orange 56×3 rule → H1 → Korean name → vibe tags → intro paragraphs.
- **Vibe tag**: `#DCEFE5` bg, `#A9D8C2` border, `#0B5C3F` text, radius 22px. 14–15px/500
  (fluid), padding 7px 15px on region-page headers; 13px/500, padding 4px 10px on city cards and
  homepage region cards. Same colours everywhere — they mean the same thing; only the size
  follows the heading it annotates. The About page's credential chips are the same pill at the
  13px card size — same colours, no variant.
- **Note plate**: tinted bg, matching border, radius 10px, one line of text + a `→` link, or up
  to ~3 lines of full-width text for a longer aside — either way its text runs the plate's own
  width, exempt from the ~70ch body cap (a capped line in a full-width plate reads as a layout
  bug). Past ~3 lines it's body copy: pull it out of the plate or cap it at the measure.
  Green tint + green border for "easier"; amber `#F7EAD9` + `#E08A2E` border for "stricter".
- **Source line**: 12–13px `#5C6660`, always dated, at the foot of the block it describes.
- **Section tick**: 3×15px orange bar before a small heading (Guides, Where to work).
- **Korean name**: inline beside the title where there is room (page H1, city-card heading,
  baseline-aligned); on its own line in narrow cards. Placement follows width, not page.
- **Region prev/next**: the six region pages only — never on the homepage, static pages, or the
  decline-designated counties page (not a region, not in the cycle). Own band at the end of the
  page content, prev at the left container edge, next at the right, 32px clear of the footer text.
  One rule at most — separate it from the footer with space, not a second hairline.

## Page order (region page — both viewports identical)

cover gallery → map → guides → cities → costs + festivals (one tinted band, costs left,
festivals right) → attractions → dishes → prev/next → footer.

Sections render only where their data exists; a region without map or guide data omits those
sections rather than showing an empty state. The order above is the full-data page.

Homepage: cover photo behind header + headline + calculator (card overlaps its lower edge)
→ map with legend and the "Partly eligible" note → six region cards → footer.

## Component rules

- **Calculator**: salary shown with thousands separators, placeholder `e.g. 70,000,000`. Labels
  13px/500 `#33443C`; inputs ≥16px. Secondary control reads `Clear`, grey, never orange. Result
  panel links use the site link rule — `Visa info →`, same label as the region panels.
  (Input types and number parsing are implementation, not design — keep those notes with the code.)
- **Region card** ends with an `Open <region> →` row on a hairline. Hover highlights the matching
  map area; click opens the page. Phone: tapping the map jumps to a card. Hover/selected border: green   (`#0F7B54`) for an open region, Muted `#5C6660` for an ineligible one (map shape too, hovered the
   other way). Hover effects (map and card) only apply on real hover-capable devices, not touch.
- **City card**: name + Korean name, vibe tags, blurb, then a `#F7F9F8` "Where to work" panel —
  venue name 16–17px/600 with its kind as 12px grey at the right, address below, then
  `Website ↗ Instagram ↗ Naver Map ↗` as underlined text links (never buttons).
- **Study cafés**: 4-cell battery (12–15×9px, `#0F7B54` filled / `#DCE3DF` empty) + count label
  + `Naver Map search ↗` at the right of the same row, 12px orange. No description. The row never
  wraps at any width — shorten the label to `Naver Map ↗` at 360 rather than wrapping it.
- **Chains**: grouped under their own "Chains" subtitle (13px/600 muted) below the solo venues,
  non-Korean ones first. Name is plain ink, not a link (orange got loud repeated); a small
  `Website ↗` (`(KR)` suffix when Korean-only) sits alongside instead, in a shared grid so every
  row's link lines up in one column.
- **Getting around**: three nearby places + Seoul, journey times in semibold.
- **Guides**: one strip, each link orange underlined with `↗`, domain and date underneath.
- **Festivals**: Ongoing / Upcoming toggle, dates in `#5C6660`/500 with `tabular-nums`, name in ink,
  status chip (THIS MONTH / LONG-TERM), location pin + city in muted, and a clipboard icon that
  copies the full address — icon + tooltip on desktop, icon + "Copy full address" label on phone
  (44px tap target). The icon turns green on hover so it reads as an action, unlike the static pin.
- **National map** (homepage): at 900px and below, tapping a region scrolls to its card and selects
  it; tapping the card itself does nothing. Real Korea outline on a Panel `#F7F9F8` ground, not a
  green tint (collides with the partly-eligible fill). Regions filled by eligibility; legend
  swatches render the *composited* colour, never the raw token. Metropolitan cities: an explicit
  flat fill token per state, ~14% darker than that state's own legend fill, plus a heavier
  boundary stroke — small enough not to read as a state of its own, so no legend entry. Boundary
  stroke matches the fill family (green on eligible/partly-eligible, grey on not-eligible).
  Hover/focus reacts uniformly at every eligibility state — shape, metro fill, and label together,
  not-eligible included (its own grey step, not the green default). Labels: ink `#16201C`, one
  opacity at every state. No pins.
- **Region map** (region pages): the region outline on white with a pale green fill, 13–15px line
  pictograms placed by coordinate, and a pictogram legend. Place names appear on hover on desktop
  and on tap on phone. Context labels for neighbouring areas are muted italic. No eligibility
  states, so no ground tint.
- **Map labels** (both maps): ink `#16201C`, `paint-order: stroke` with a tinted halo, 2px —
  never white or plain green/grey chrome; masks the boundary stroke/hatching under the text.
  Region-detail map: one flat `--color-primary-tint` halo throughout (no eligibility states to
  track). National map: halo tracks each shape's own current fill —
  `oklch(min(L_fill + 0.10, 0.96) C_fill H_fill)`.
- **Dishes**: photo, name + Korean name, note, optional `Where to eat it ↗`.
- **Dish plate**: 12px/500 lowercase, radius 20px, padding 3px 10px, opaque fill, 9px inset at the
  photo's top-left, `gap:5px` row. Heat plates carry `#E08A2E` border + `#A8450F` ink, fill amber
  `#F7EAD9` if cooked in and panel `#F7F9F8` if removable; all other labels are panel fill, hairline
  border, `#33443C` ink. Heat first. Any label whose meaning isn't obvious gets one legend line per
  page, 16px above, no rule.
- **Dish provenance**: city name only, English, 13px/500 white at the photo's bottom-left over the
  standard scrim — same overlay as attraction cards. No verb, no Korean, no plate.

## Copy rules

- Honest labels with their basis: "Furnished short-term, decent and available" — the figure is what a
  decent, actually available furnished place lists for anywhere in the region, not a 1BR city-centre median.
- Every figure dated and sourced ("Hand-checked from current listings, September 2026").
- No marketing slogans, no unsupported comparisons.
- Consistent names: one term per concept ("Partly eligible", "About", "worknstay korea").
  One label per destination — the same link is never worded two ways on two pages.
- Dots, not pluses, between qualifiers: `coworking · coliving · community`.

## Accessibility / layout musts

- Text 4.5:1 against what is behind it. Over photos, alpha white is fine where the measured
  composite passes — the rule bans muting type for looks, not alpha as such. Scrims and
  text-shadows over photos are contrast tools and stay.
- Phone tap targets ≥44px for **controls** — buttons, tabs, checkboxes, pagers, card CTAs. Gain
  the height with padding; the visual size stays as designed. Inline text links (breadcrumb,
  source lines, `Naver Map ↗`) are exempt.
  Where controls sit too close for 44px without one swallowing a neighbour's tap area, cap each
  at just under half the distance to its nearest neighbour instead — don't enlarge past that to
  "fix" it. Reference example: the region map's ski/surf pins, region-detail-map.css.
- Reserve height for anything that changes length (paginated lists, carousels) — no reflow jumps.
- Nothing below 12px, except the 11px uppercase festival status chip.

## Never

Emoji · new fonts or weights · dashed or dotted borders · decorative gradients or shadows beyond
the card shadow · colour outside the palette · orange text that is not a link.

Where a section above documents an exception, that exception wins — don't "fix" it.
