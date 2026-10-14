import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import registerFilters from "./eleventy/filters.js";

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

  registerFilters(eleventyConfig);

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
}
