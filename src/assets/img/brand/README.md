# Brand icon assets — worknstay korea

Drop the whole folder into the repo. Suggested home: `src/assets/img/brand/`, with the four
root-served files (`favicon.svg`, `favicon-48.png`, `apple-touch-icon.png`, `site.webmanifest`)
passed through to the site root — 11ty `addPassthroughCopy` handles that.

## What each file is

| File | Use |
| --- | --- |
| `favicon.svg` | **The favicon.** 7f — white folk-village mark on the `#0F7B54` tile. Modern browsers use this. |
| `favicon-48.png` | Fallback for browsers with no SVG favicon support, and Yandex's tab strip. |
| `apple-touch-icon.png` | 180px, iOS home screen. Same tile, no transparency. |
| `icon-192.png`, `icon-512.png` | Android / PWA install, referenced by the manifest. |
| `icon-tile.svg` | Same tile with a slightly thinner roof stroke (2.2) — for use at 48px and above: large app icons, share cards, the about page. |
| `mark-white.svg` | Bare mark, white. **Header** — both the photo-scrim homepage and the solid `#16201C` bar. |
| `mark-green.svg` | Bare mark, `#0F7B54`. Light grounds — documents, print, a light footer. |
| `mark-ink.svg` | Bare mark, `#16201C`. One-colour fallback: print, stamped PDF, a partner's mono logo strip. |
| `site.webmanifest` | PWA manifest. `theme_color` is `#16201C` to match the nav. |

## Head snippet

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-48.png" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#16201C">
```

## Rules

- The tile is the **favicon and app-icon** device only. It exists to give a 16px mark an edge on a
  grey tab strip, where there is no wordmark to help. In a header the wordmark is adjacent, so the
  header uses the **bare** mark.
- Header lockup: mark at **19px**, `9px` gap, wordmark Instrument Sans 600 / 17px / `-0.02em`,
  both in white. Same on the photo homepage and on every solid-nav page — one include, one size.
- Never recolour a single SVG with CSS or `currentColor`. Pick the right file. Inline recolouring
  works until the mark is reused in an email or PDF, where it silently renders black.
- The tile's green is `#0F7B54` and its marks are `#FFFFFF`. Do not substitute `#54C79A` inside
  the tile — that pairing loses contrast at 16px.
- Do not add a drop shadow, a gradient, or an outline to any of these.
