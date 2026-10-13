import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  // Markdown files living under src/assets/ (e.g. brand/README.md) are docs, not pages —
  // they're passed through as-is above, don't also render them as templates.
  eleventyConfig.ignores.add("src/assets/**/*.md");

  // Brand icon files that must be served from the site root (brand/README.md head snippet +
  // site.webmanifest icon paths). The bare/header marks stay under /assets/img/brand/.
  eleventyConfig.addPassthroughCopy({
    "src/assets/img/brand/favicon.svg": "favicon.svg",
    "src/assets/img/brand/favicon-48.png": "favicon-48.png",
    "src/assets/img/brand/apple-touch-icon.png": "apple-touch-icon.png",
    "src/assets/img/brand/icon-192.png": "icon-192.png",
    "src/assets/img/brand/icon-512.png": "icon-512.png",
    "src/assets/img/brand/site.webmanifest": "site.webmanifest",
  });

  // Reads an SVG from src/assets/svg and inlines its markup directly into the page
  // (rather than <img src>), so CSS can target region <g>/<a> elements and hover/focus
  // states work without a second network request. No new dependency — plain node:fs.
  eleventyConfig.addShortcode("inlineSvg", function (filename) {
    const filePath = path.join(__dirname, "src/assets/svg", filename);
    return readFileSync(filePath, "utf8").replace(/<\?xml[^>]*\?>\s*/, "");
  });

  // Data files store dates as "YYYY-MM"; format at render time, e.g. "2026-09" -> "September 2026".
  eleventyConfig.addFilter("monthYear", function (value) {
    const [y, m] = String(value).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  });

  // Thousand-separator formatting for KRW figures (rent figures in the data are raw integers).
  eleventyConfig.addFilter("krw", function (value) {
    return new Intl.NumberFormat("en-US").format(value);
  });

  // Compact KRW for prose, exact (no rounding): 100000000 -> "₩100M", 500000 -> "₩500K".
  eleventyConfig.addFilter("krwShort", function (value) {
    return value >= 1_000_000 ? `₩${value / 1_000_000}M` : `₩${value / 1_000}K`;
  });

  // City-card population line: cities.json stores the raw KOSIS total, rounded here to 2
  // significant figures (K below a million, M above), e.g. 211628 -> "210K", 1221616 -> "1.2M".
  eleventyConfig.addFilter("popRound", function (value) {
    if (!value) return "";
    const exp = Math.floor(Math.log10(Math.abs(value)));
    const factor = 10 ** (exp - 1);
    const rounded = Math.round(value / factor) * factor;
    if (rounded >= 1000000) return (rounded / 1000000).toFixed(1) + "M";
    const k = rounded / 1000;
    return (Number.isInteger(k) ? k : k.toFixed(1)) + "K";
  });

  // Looks up a record by `slug` or `regionSlug` — regions.json uses the former,
  // rentalMarketScan.js regionSummary (and other per-region data files) use the latter.
  eleventyConfig.addFilter("findBySlug", function (arr, slug) {
    return (arr || []).find((item) => item.slug === slug || item.regionSlug === slug);
  });

  // Filters a per-region data array (cities, food, rental scans) down to one region —
  // Nunjucks has no built-in selectattr/rejectattr (that's Jinja2-only).
  eleventyConfig.addFilter("byRegion", function (arr, slug) {
    return (arr || []).filter((item) => item.regionSlug === slug);
  });

  // City cards: only cities.json records that carry a `cardOrder`, sorted by it. The rest stay
  // map-only (pin without a card).
  eleventyConfig.addFilter("cardCities", function (arr) {
    return (arr || []).filter((c) => c.cardOrder != null).sort((a, b) => a.cardOrder - b.cardOrder);
  });

  // Looks up a record by `name` or `type` within a small array — settling-in.njk's Gangwon-do
  // price table uses this to pull a named platform out of a city's `platforms` array, and a typed
  // unit (Officetel/One-room) out of a platform's `units` array, without a Jinja2-only selectattr.
  eleventyConfig.addFilter("byName", function (arr, name) {
    return (arr || []).find((item) => item.name === name || item.type === name);
  });

  // Picks records by an explicit ordered list of slugs (Gangwon-do's city section names four
  // specific cities in a hand-chosen order — byRegion would return all six in data order).
  eleventyConfig.addFilter("bySlugs", function (arr, slugs) {
    return (slugs || [])
      .map((slug) => (arr || []).find((item) => item.slug === slug))
      .filter(Boolean);
  });

  // region.longIntro is a single string for most regions, an array of paragraphs where a
  // region needs more than one (region.njk renders each form differently).
  eleventyConfig.addFilter("isArray", function (value) {
    return Array.isArray(value);
  });

  // Splits a period-delimited string (e.g. site.tagline) into its sentences, period kept, so a
  // template can lay each one on its own line without duplicating the copy in the template.
  eleventyConfig.addFilter("splitSentences", function (value) {
    return (value || "").match(/[^.]+\.?/g)?.map((s) => s.trim()).filter(Boolean) || [];
  });

  // Prev/next region for the shared footer's between-regions nav. Needed here because the footer
  // partial only has `page.url` to work from, and no existing filter maps a URL back to its
  // position in `regions`. Returns null on any page that isn't a region page.
  eleventyConfig.addFilter("regionFooterNav", function (regions, url) {
    const list = regions || [];
    const i = list.findIndex((r) => `/regions/${r.slug}/` === url);
    if (i === -1) return null;
    return {
      prev: i > 0 ? list[i - 1] : null,
      next: i < list.length - 1 ? list[i + 1] : null,
    };
  });

  // Wraps each hyphenated word (Gangnam-daero, 2-gil) in a no-wrap span so a line can only break at
  // spaces; the text keeps its plain hyphen-minus. Escapes first, so use with `| safe`.
  eleventyConfig.addFilter("keepHyphenated", function (text) {
    const esc = String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return esc.replace(/\S*\S-\S*/g, '<span class="nowrap">$&</span>');
  });

  // Splits workationCenters into solo venues vs. chains (DESIGN.md § "Chains"), dropping CLOSED
  // entries; chains sort non-Korean-first, solo venues keep cities.json's order.
  eleventyConfig.addFilter("activeVenues", function (centers, wantChains) {
    const active = (centers || []).filter((wc) => {
      const closed = (wc.note || "").indexOf("CLOSED") !== -1;
      return !closed && Boolean(wc.isChain) === Boolean(wantChains);
    });
    if (!wantChains) return active;
    return active.sort((a, b) => Number(Boolean(a.korOnly)) - Number(Boolean(b.korOnly)));
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
}
