import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // Reads an SVG from src/assets/svg and inlines its markup directly into the page
  // (rather than <img src>), so CSS can target region <g>/<a> elements and hover/focus
  // states work without a second network request. No new dependency — plain node:fs.
  eleventyConfig.addShortcode("inlineSvg", function (filename) {
    const filePath = path.join(__dirname, "src/assets/svg", filename);
    return readFileSync(filePath, "utf8").replace(/<\?xml[^>]*\?>\s*/, "");
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
