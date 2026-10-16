# worknstay korea — design conventions

Reference tool, not a magazine or a community site. White ground, quiet type, data first. This file
is authoritative.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#16201C` | Body text, dark nav bar |
| Ink soft | `#33443C` / `#4A544E` | Secondary paragraphs, form labels |
| Muted | `#5C6660` | Captions, addresses, source lines, festival dates, metadata |
| Hairline | `#E4E7E4` / `#EDF0EE` | Card borders, row dividers |
| Hairline strong | `#CFD6D2` | Interactive pill/chip borders (filter pills) |
| Panel | `#F7F9F8` | Info cards, guides strip, un-evaluated calculator state |
| Green | `#0F7B54` | Primary accent, in-site links, eligible state |
| Green tint | `#EAF4EF` / `#DCEFE5`, border `#A9D8C2` / `#C9E3D6` | Tinted bands, vibe tags, note plates |
| Green deep | `#0B5C3F` | Vibe-tag text, in-site link hover |
| Green light | `#A8D8C2` | "Partly eligible" map fill |
| Map grey | `#B7B2A7` | "Not eligible" map fill — data colour, never chrome |
| Focus ring | `#2F6FED` | Keyboard focus only, 2px, deliberately outside the palette. The map uses its hover highlight instead. |
| Amber | `#F7EAD9` | "Stricter" note plates, not-eligible calculator state |
| Orange rule | `#E08A2E` | 56×3px rule above every page headline, 3×15px section ticks |
| Orange text | `#C2531A` | Outbound links, spicy tag |
| Orange chip | `#B04A13` | Status-chip text on amber (11–12px; 4.6:1) |
| Orange ink | `#A8450F` | Small orange text on tinted plates (dish labels), outbound link hover |

Two accent colours only. Green = ours / easier / in-site. Orange = external / stricter / seasonal.
Filled badge pills are exempt: they read as labels, not links, so they keep their semantic colour
(green long-term / orange current). One tint band per page at most; Panel is a component fill
(cards, strips, map ground) and does not count as a page tone.

**Links.** Outbound (`target="_blank"`) is always underlined + `↗`, hover `#A8450F`, in any context.
In-site links depend on where they sit:
- Inline (mid-sentence): underlined, no arrow.
- Standalone (own line — `Visa info →`, `Open Gangwon-do →`): no underline, `→`.
- Navigation row (dark nav, jump strips, footer, prev/next): no underline, no arrow — except
  prev/next, which uses `← →` for direction.

Hover: in-site links darken to `#0B5C3F`; standalone/navigation-row links also gain an underline —
except the dark nav. `‹ ›` are reserved for steppers (galleries, pagers), never links. Grey utility
controls (`Clear`, `Top`) skip the green/orange system: muted at rest, hover darkens toward
`#33443C`, never green.

**Calculator states.** `#F7F9F8` nothing evaluated · `#DCEFE5` eligible · `#EAF4EF` partly eligible
(decline-designated counties only) · `#F7EAD9` not eligible yet (income short or under 18). No red —
the calculator has no error states, only answers (an invalid field gets a 1.5px `#C2531A` border;
"no error states" means results). Colour carries the outcome, text the reason. The tint never
changes the colour of a link inside it. "Partly eligible" is the map legend's term too.

## Fonts

**Two families, no others.**

| Script | Family | Weights | Stack |
| --- | --- | --- | --- |
| Latin | **Instrument Sans** | 400, 500, 600 | `'Instrument Sans', 'Instrument Sans Fallback', system-ui, -apple-system, 'Segoe UI', sans-serif` |
| Korean | **Noto Sans KR** | 400, 500 | `'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif` |

One Google Fonts request, exactly this:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Noto+Sans+KR:wght@400;500&display=swap" rel="stylesheet">
```

- Instrument Sans is the page default, set once on `body`, never repeated per element.
- The Korean stack applies **only** to elements holding Hangul — region, city, dish and place names,
  the Korean subhead under an H1. Everything else inherits Latin.
- Korean sits at 400, one step smaller than the Latin it accompanies, in `#5C6660`, baseline-aligned
  (`align-items:baseline`, never centred).
- No 800 weights, condensed display faces, mono uppercase eyebrows or italics — except map context
  labels (neighbouring regions, North Korea), italic as the cartographic "not the subject".

## Type scale

- Page H1: 30–44px fluid / 600 / `-0.028em`
- Section H2: 20–22px / 600 / `-0.015em`
- Card title: 16–18px / 600; 15px for compact cards (dish, festival, workspace)
- Body: 15px / 1.65; compact component text 1.5–1.6
- Small text: 14px
- Form label: 13px / 500 / `#33443C`, 7px above its input
- Form input: ≥16px (below that iOS Safari zooms on focus)
- Caption, source, address: 12–13px, `#5C6660`
- Status chip: 11px / 600 / uppercase with letter-spacing, the one place type goes below 12px. Used
  for festival THIS MONTH/LONG-TERM and note-card category tags (visa-info Important notes).
- Sentence case everywhere; all-caps only in the status chip; proper nouns keep their official
  capitalization. Lowercase is fine in tags and pills (`spicy`, `surf`) and short value labels —
  table cells (`none`, `varies`), study-café count (`a few`, `lots`, `not rated yet`).

## Geometry

Radius 10–12px cards, 20–22px pills, 8px inputs. Hairlines 1px. Designed at a 1280px desktop
viewport and a 390px phone. Section gaps 26–36px. Flex/grid with `gap` — never margin-spaced inline
siblings.

One container, 1200px, centred, 16px page padding at every width. Body text caps at ~70ch (~640px);
tinted bands and card grids use the full container. A tinted panel may bleed past the text column —
its *content* must align, not its edge.

The container is a maximum: below 1200 it shrinks and nothing reflows until the layout's collapse
width. Three widths: **768** (burger nav), **900** (region-page grids, About, city cards), **1024**
(homepage, Visa info, Settling in). Fractional grid columns narrow proportionally; where any column
is a fixed width the other absorbs the whole reduction — check at the collapse width, not only at
1200.

## Mobile

Hover effects apply only on devices with a mouse or trackpad (`@media (hover: hover)`), at any
width. Touch devices get a tap equivalent for every hover behaviour.

Horizontal swipe for galleries and card sets; carousel cards are equal height
(`align-items: stretch`, never clamped blurbs). Repeated stepping groups its arrows in one corner;
page-level prev/next splits them to the container edges. Swipe rows are plain CSS scroll-snap.

**Dots only exist where a row actually swipes.** A static grid never gets them. In a swipe row,
full-width cards with a peeking edge (region, city) get dots — a sliver is not a cue. Where roughly
a third or more of the next card shows, that cut card is the affordance — no dots.

Header nav is one `<ul>` always in the DOM (never two navs); the burger shows under ~768px. The
region map's Jeju shape has an invisible `.region__hit-target` ellipse padding its tap area to ≥44px
at 360px. `src/_data/` is verified content: the layout adapts to it, never the reverse.

Stepping controls are one size site-wide: the festival pager matches the region-page gallery arrows.
Below 44px on phone, a control reaches the minimum through padding; the visible box stays.

## Empty & fallback states

No dashed or dotted borders. An empty state is a muted `#5C6660` sentence in the slot the content
would have filled, heading kept; `#F7F9F8` fill only where the slot must hold its shape (image
placeholders). Missing data and no-JS fallbacks get the same treatment — ordinary states, not
errors. Wording says what is missing: "No rental price figures for this region yet."

## Recurring parts

- **Dark nav** `#16201C`, wordmark "worknstay korea" with site icon, links at 75% white, active item
  white with a 2px `#E08A2E` underline. Nav-item hover: white, no underline. Wordmark is the home
  link, clickable on the homepage, no hover state.
- **Breadcrumb** row under the nav, 13px, `Regions / <span ink>Gangwon-do</span>`. "Regions" →
  `/#map`.
- **Headline block**: orange 56×3 rule → H1 → Korean name → vibe tags → intro paragraphs.
- **Vibe tag**: `#DCEFE5` bg, `#A9D8C2` border, `#0B5C3F` text, radius 22px, same colours
  everywhere. Region-page headers: 14–15px/500 (fluid), padding 7px 15px. City cards and homepage
  region cards: 13px/500, padding 4px 10px. The About page's credential chips are the 13px pill.
- **Note plate**: tinted bg, matching border, radius 10px, one line of text + a `→` link, or up to
  ~3 lines of full-width text; its text runs the plate's own width, exempt from the ~70ch cap. Past
  ~3 lines it's body copy: pull it out or cap it. Green tint + green border for "easier"; amber
  `#F7EAD9` + `#E08A2E` border for "stricter". In a card grid (visa-info Important notes) the plate
  is border-only, no tint, since its card already carries a tinted status chip; a lone aside stays
  tinted.
- **Source line**: 12–13px `#5C6660`, at the foot of the block it describes. Dated for a guide,
  article, or notice; domain-only for an evergreen service or portal.
- **Section tick**: 3×15px orange bar before a small heading (Guides, Where to work).
- **Korean name / term**: 400 weight. *Name* (region, city, place, dish) — inline beside the title,
  baseline-aligned, wrapping only under width pressure. *Term* (a guide page's title — Visa info,
  Settling in) — own line under the H1, muted ink, every width.
- **Region prev/next**: the six region pages only — never the homepage, static pages, or the
  decline-designated counties page. Sits inside the footer, above its content, prev at the left
  container edge, next at the right, 28px clear of the footer text. One rule at most — the footer's
  own top hairline.
- **Section nav strip**: pages of roughly 3+ screens get a sticky sub-nav (`top: 12px`) — section
  links plus a `Top` link; the main nav never sticks. Section targets need `scroll-margin-top`
  matching the strip's height. It highlights the current section while scrolling (a click pins it);
  sections sharing one visual row highlight together, by layout not markup. Labels are short generic
  nouns, not full heading text; `Top` goes icon-only on the narrowest phones.

## Page order (region page — both viewports identical)

cover gallery → map → guides → cities → costs + festivals (one tinted band, costs left, festivals
right) → attractions → dishes → prev/next → footer.

Sections render only where their data exists; a region without map or guide data omits them rather
than showing an empty state.

Homepage: cover photo behind header + headline + calculator (card overlaps its lower edge) → map
with legend and the "Partly eligible" note → six region cards → footer.

## Component rules

- **Calculator**: salary shown with thousands separators, placeholder `e.g. 70,000,000`. Labels
  13px/500 `#33443C`; inputs ≥16px. Secondary control reads `Clear`, grey, never orange. Result
  panel links follow the site link rule — `Visa info →`, same label as the region panels.
- **Region card** ends with an `Open <region> →` row on a hairline. Hover highlights the matching
  map area; click opens the page. Phone: tapping the map jumps to a card. Hover/selected border:
  green `#0F7B54` for an open region, Muted `#5C6660` for an ineligible one (map shape too).
- **City card**: name + Korean name, vibe tags, blurb, then a `#F7F9F8` "Where to work" panel —
  venue name 16–17px/600 with its kind as 12px grey at the right, address below, then
  `Website ↗ Instagram ↗ Naver Map ↗` as underlined text links (never buttons).
- **Study cafés**: 4-cell battery (12–15×9px, `#0F7B54` filled / `#DCE3DF` empty) + count label +
  `Naver Map search ↗` at the right of the same row, 12px orange. No description. The row never
  wraps — shorten the label to `Naver Map ↗` at 420. Unrated: no battery, muted 400 `not rated yet`.
- **Chains**: under their own "Chains" subtitle (13px/600 muted) below the solo venues, non-Korean
  first. Name is plain ink, not a link; a small `Website ↗` (`(KR)` suffix when Korean-only) sits
  alongside, in a shared grid so every row's link lines up in one column.
- **Getting around**: three nearby places + Seoul, journey times in semibold.
- **Guides**: one strip, each link orange underlined with `↗`, domain and date underneath.
- **Festivals**: Ongoing / Upcoming toggle, dates in `#5C6660`/500 with `tabular-nums`, name in ink,
  status chip (THIS MONTH / LONG-TERM), location pin + city in muted, and a clipboard icon that
  copies the full address — icon + tooltip on desktop, icon + "Copy full address" label on phone
  (44px tap target). The icon turns green on hover; the pin is static.
- **National map** (homepage): below 1024px, tapping a region scrolls to its card and selects it;
  tapping the card does nothing. Real Korea outline on a Panel `#F7F9F8` ground, not a green tint
  (collides with the partly-eligible fill). Regions filled by eligibility; legend swatches render
  the *composited* colour, never the raw token. Metropolitan cities: an explicit flat fill token per
  state, ~14% darker than that state's legend fill, plus a heavier boundary stroke — no legend
  entry. Boundary stroke matches the fill family (green on eligible/partly eligible, grey on
  not-eligible). Hover/focus reacts uniformly at every eligibility state — shape, metro fill and
  label together, not-eligible included (its own grey step). Labels: ink `#16201C`, one opacity at
  every state. No pins.
- **Region map** (region pages): the region outline on white with a pale green fill, 13–15px line
  pictograms placed by coordinate, and a pictogram legend. Pin labels that would crowd the map
  appear on hover on desktop and on tap on phone; the rest are always shown. Context labels for
  neighbouring areas are muted italic. No eligibility states, so no ground tint.
- **Map labels** (both maps): ink `#16201C`, `paint-order: stroke` with a tinted 2px halo — never
  white or plain green/grey chrome. Region map: one flat `--color-primary-tint` halo. National map:
  halo tracks each shape's own current fill — `oklch(min(L_fill + 0.10, 0.96) C_fill H_fill)`.
- **Dishes**: photo, name + Korean name, note, optional `Where to eat it ↗`.
- **Filter pill**: 13px, Hairline strong border; selected = solid green with white text. 44px tap
  area on phone.
- **Dish plate**: 12px/500 lowercase, radius 20px, padding 3px 10px, opaque fill, 9px inset at the
  photo's top-left, `gap:5px` row. Heat plates carry `#E08A2E` border + `#A8450F` ink, fill amber
  `#F7EAD9` if cooked in and panel `#F7F9F8` if removable; all other labels are panel fill, hairline
  border, `#33443C` ink. Heat first. A label whose meaning isn't obvious gets one legend line per
  page, 16px above, no rule.
- **Dish provenance**: city name only, English, 13px/500 white at the photo's bottom-left over the
  standard scrim (same as attraction cards). No verb, no Korean, no plate.

## Copy rules

- Honest labels with their basis: "Furnished short-term, decent and available" — what a decent,
  actually available furnished place lists anywhere in the region, not a 1BR city-centre median.
- Every figure dated and sourced ("Hand-checked from current listings, September 2026").
- No marketing slogans, no unsupported comparisons.
- One term per concept ("Partly eligible", "About", "worknstay korea"); one label per destination —
  the same link is never worded two ways on two pages.
- Dots, not pluses, between qualifiers: `coworking · coliving · community`.

## Accessibility / layout musts

- Text 4.5:1 against what is behind it. Over photos, alpha white is fine where the measured
  composite passes; scrims and text-shadows over photos are contrast tools and stay. The home hero
  overlay uses near-black, not Ink; Ink would lighten the photo.
- Phone tap targets ≥44px for **controls** — buttons, tabs, checkboxes, pagers, card CTAs — gained
  through padding, visual size unchanged. Inline text links (breadcrumb, source lines,
  `Naver Map ↗`) are exempt. Where controls sit too close for 44px without swallowing a neighbour's
  tap area, cap each just under half the distance to its nearest neighbour (e.g. the region map's
  ski/surf pins).
- Reserve height for anything that changes length (paginated lists, carousels) — no reflow jumps.
- Nothing below 12px, except the 11px uppercase status chip and map SVG labels.

## Never

Emoji · new fonts or weights · dashed or dotted borders · decorative gradients · shadows on anything
but cards and floating elements · colour outside the palette · orange text that is not a link or a
status chip on amber.

Where a section above documents an exception, that exception wins — don't "fix" it.
