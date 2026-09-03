import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  // Reads an SVG from src/assets/svg and inlines its markup directly into the page
  // (rather than <img src>), so CSS can target region <g>/<a> elements and hover/focus
  // states work without a second network request. No new dependency — plain node:fs.
  eleventyConfig.addShortcode("inlineSvg", function (filename) {
    const filePath = path.join(__dirname, "src/assets/svg", filename);
    return readFileSync(filePath, "utf8").replace(/<\?xml[^>]*\?>\s*/, "");
  });

  // Thousand-separator formatting for KRW figures (costOfLiving.json values are raw integers).
  eleventyConfig.addFilter("krw", function (value) {
    return new Intl.NumberFormat("en-US").format(value);
  });

  // Looks up a record by `slug` or `regionSlug` — regions.json uses the former,
  // costOfLiving.json (and other per-region data files) use the latter.
  eleventyConfig.addFilter("findBySlug", function (arr, slug) {
    return (arr || []).find((item) => item.slug === slug || item.regionSlug === slug);
  });

  // Filters a per-region data array (cities, food, mock KTO content) down to one region —
  // Nunjucks has no built-in selectattr/rejectattr (that's Jinja2-only).
  eleventyConfig.addFilter("byRegion", function (arr, slug) {
    return (arr || []).filter((item) => item.regionSlug === slug);
  });

  // region.longIntro is a single string for most regions, an array of paragraphs where a
  // region needs more than one (region.njk renders each form differently).
  eleventyConfig.addFilter("isArray", function (value) {
    return Array.isArray(value);
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
