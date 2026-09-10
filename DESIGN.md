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
| Green deep | `#0B5C3F` | Vibe-tag text |
| Green light | `#A8D8C2` | "Partly eligible" map fill |
| Amber | `#F7EAD9` | "Stricter" note plates, not-eligible calculator state |
| Orange rule | `#E08A2E` | 56×3px rule above every page headline, 3×15px section ticks |
| Orange text | `#C2531A` | Outbound links, spicy tag |

Two accent colours only. Green = ours / easier / in-site. Orange = external / stricter / seasonal.
Filled badge pills are exempt: they read as labels, not links, so they keep their semantic colour
(green long-term / orange current).
Arrows follow colour: `→` for in-site, `↗` for outbound.
Max two background tones per page (white + one tint band).

**Calculator states.** `#F7F9F8` nothing evaluated yet · `#DCEFE5` eligible everywhere ·
`#EAF4EF` capital-area only · `#F7EAD9` not eligible yet (income short or under 18).
No red — the calculator has no error states, only answers. Colour carries the outcome, text
carries the reason. The tint never changes the colour of a link inside it.

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
- No 800 weights, no condensed display faces, no mono uppercase eyebrows, no italics.

## Type scale

- Page H1: 40–44px / 600 / `-0.028em` (phone 30–32px)
- Section H2: 20–22px / 600 / `-0.015em`
- Card title: 16–18px / 600
- Body: 15px / 1.65–1.7
- Form label: 13px / 500 / `#33443C`, 7px above its input
- Form input: ≥16px (below that iOS Safari zooms on focus)
- Caption, source, address: 12–13px, `#5C6660`
- Sentence case everywhere. All-caps only in the festival tag chips.

## Geometry

Radius 10–12px cards, 20–22px pills, 8px inputs. Hairlines 1px. Desktop frame 1280px,
phone frame 390px. Page padding 32px desktop / 16px phone. Section gaps 26–36px.
Flex/grid with `gap` — never margin-spaced inline siblings.

One container width site-wide. Body text caps at ~70ch (~640px) inside it; tinted bands and card
grids use the full container. Text never fills the container. A tinted panel may bleed past the
text column — what must align is the panel's *content*, not its edge.

## Mobile

Horizontal swipe for image galleries and for card sets, provided there is a dot indicator and the
copy says to swipe. Carousel cards are equal height so the layout does not jump between slides.
Repeated stepping (galleries, carousels) groups its arrows in one corner; page-level prev/next
splits them to the container edges.

## Empty & fallback states

No dashed or dotted borders — they read as unfinished wireframe. An empty state is a muted
`#5C6660` sentence in the slot the content would have filled, heading kept; `#F7F9F8` fill only
where the slot must hold its shape (image placeholders). Missing data and no-JS fallbacks get the
same treatment — they are ordinary states, not errors. Wording says what is missing:
"No cost-of-living figures for this region yet."

## Recurring parts

- **Dark nav** `#16201C`, wordmark "worknstay korea" with a `#54C79A` dot, links at 75% white,
  active item white with a 2px `#E08A2E` underline. Items: Regions · Visa info · Settling in · About.
  "Regions" links to `/#map`, not `/`. The wordmark is the home link and stays clickable on the homepage.
- **Breadcrumb** row under the nav, 13px, `Regions / <span ink>Gangwon-do</span>`. "Regions" → `/#map`.
- **Headline block**: orange 56×3 rule → H1 → Korean name → vibe tags → intro paragraphs.
- **Vibe tag**: `#DCEFE5` bg, `#A9D8C2` border, `#0B5C3F` text, radius 22px. 14–15px/500, padding
  7px 15px on region-page headers; 13px/500, padding 4px 10px on city cards and homepage region
  cards. Same colours everywhere — they mean the same thing.
- **Note plate**: tinted bg, matching border, radius 10px, one line of text + a `→` link.
  Green tint + green border for "easier"; amber `#F7EAD9` + `#E08A2E` border for "stricter".
- **Source line**: 12–13px `#5C6660`, always dated, at the foot of the block it describes.
- **Section tick**: 3×15px orange bar before a small heading (Guides, Where to work).
- **Region prev/next**: the six region pages only — never on the homepage, static pages, or the
  population-decline counties page (not a region, not in the cycle). Own band above
  the footer on a hairline, prev at the left container edge, next at the right, 32px clear of the
  footer text.

## Page order (region page — both viewports identical)

cover gallery → map → guides → cities → costs + festivals (one tinted band, costs left,
festivals right) → attractions → dishes → prev/next → footer.

Homepage: cover photo behind header + headline + calculator (card overlaps its lower edge)
→ map with legend and the "Partly eligible" note → six region cards → footer.

## Component rules

- **Calculator**: salary shown with thousands separators, placeholder `e.g. 70,000,000`. Labels
  13px/500 `#33443C`; inputs ≥16px. Secondary control reads `Clear`, grey, never orange. Result
  panel links use the site link rule — `Visa info →`, same label as the region panels.
  (Input types and number parsing are implementation, not design — keep those notes with the code.)
- **Region card** ends with an `Open <region> →` row on a hairline. Hover highlights the matching
  map area; click opens the page. Phone: swipe carousel with dots; tapping the map jumps to a card.
- **City card**: name + Korean name, vibe tags, blurb, then a `#F7F9F8` "Where to work" panel —
  venue name 16–17px/600 with its kind as 12px grey at the right, address below, then
  `Website ↗ Instagram ↗ Naver Map ↗` as underlined text links (never buttons).
- **Study cafés**: 4-cell battery (12–15×9px, `#0F7B54` filled / `#DCE3DF` empty) + count label
  + `Naver Map search ↗` at the right of the same row, 12px orange. No description. Row never wraps.
- **Chains**: the chain name is the link (`Fastfive ↗`); no separate domain column.
- **Getting around**: three nearby places + Seoul, journey times in semibold.
- **Guides**: one strip, each link orange underlined with `↗`, domain and date underneath.
- **Festivals**: Ongoing / Upcoming toggle, dates in `#5C6660`/500 with `tabular-nums`, name in
  ink, status chip (THIS MONTH / LONG-TERM), location pin + city in muted, and a clipboard icon
  that copies the full address — icon + tooltip on desktop, icon + "Copy address" label on phone
  (44px tap target). The icon turns green on hover so it reads as an action, unlike the static pin.
  Paginated lists show 5 per page with a `1–5 of 17 in October` range and reserve a fixed height,
  so switching tabs or pages doesn't move the page.
- **Map**: real Korea outline, regions filled by eligibility (green / green light / not eligible),
  legend uses the same fills. Pins are 13–15px line pictograms placed by coordinate.
- **Dishes**: photo, name + Korean name, note, optional `Where to eat it ↗`. Spicy tag only.

## Copy rules

- Honest labels with their basis: "Furnished short-term, decent and available" — the figure is what a
  decent, actually available furnished place lists for anywhere in the region, not a 1BR city-centre median.
- Every figure dated and sourced ("Hand-checked from current listings, September 2026").
- No marketing slogans, no "handpicked", no unsupported comparisons.
- Consistent names: one term per concept ("Partly eligible", "About", "worknstay korea").
  One label per destination — the same link is never worded two ways on two pages.
- Dots, not pluses, between qualifiers: `coworking · coliving · community`.

## Accessibility / layout musts

- Text 4.5:1 against its background; full-opacity ink over photos, never alpha-muted.
- Phone tap targets ≥44px.
- Reserve height for anything that changes length (paginated lists, carousels) — no reflow jumps.
- Nothing below 12px.

## Never

Emoji · colour outside the palette · new fonts or weights · dashed or dotted borders ·
decorative gradients or shadows beyond the card shadow (the hero photo scrim stays — it is
contrast, not decoration) · orange text that is not a link (badge pills excepted).
