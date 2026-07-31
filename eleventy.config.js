// Eleventy build configuration.
// Turns the templates in src/ + the single config file (content/site.yaml)
// into a plain static site in _site/. Deployed by Cloudflare Pages.
export default function (eleventyConfig) {
  // Convert **bold** in config copy to <strong>, HTML-escaping the rest.
  eleventyConfig.addFilter("mdBold", function (str) {
    if (str === undefined || str === null) return "";
    const esc = String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  });

  // Group an array of objects by a key (used by the categorized menu grid).
  eleventyConfig.addFilter("groupBy", function (arr, key) {
    const out = {};
    (arr || []).forEach((item) => {
      const k = item[key];
      (out[k] = out[k] || []).push(item);
    });
    return out;
  });

  // Recursively drop null / undefined / empty values.
  // Used by components/schema.njk: the JSON-LD graph is assembled as one
  // object literal with every optional field present, then pruned, so a
  // site.yaml that omits the optional `seo:` keys still emits clean JSON-LD
  // with no empty strings and no null branches. `false` and `0` are kept
  // (acceptsReservations: false is a real answer).
  eleventyConfig.addFilter("prune", function prune(value) {
    if (Array.isArray(value)) {
      const out = value.map(prune).filter((v) => v !== undefined);
      return out.length ? out : undefined;
    }
    if (value && typeof value === "object") {
      const out = {};
      for (const k of Object.keys(value)) {
        const v = prune(value[k]);
        if (v !== undefined) out[k] = v;
      }
      return Object.keys(out).length ? out : undefined;
    }
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  });

  // Pull one property off every object in a list. Nunjucks has no `map`
  // filter, and schema.njk needs `contact.social | pluck("url")` for sameAs.
  eleventyConfig.addFilter("pluck", function (arr, key) {
    return (arr || [])
      .map((o) => (o && typeof o === "object" ? o[key] : undefined))
      .filter((v) => v !== undefined && v !== null && v !== "");
  });

  // First object in a list whose `key` equals `value`, else undefined.
  // Nunjucks' selectattr does not reliably take a test argument here, so
  // schema.njk uses this to find the nav link matching the current URL.
  eleventyConfig.addFilter("findBy", function (arr, key, value) {
    return (arr || []).find((o) => o && o[key] === value);
  });

  // Prefix root-relative paths with the site URL; leave absolute URLs alone.
  // JSON-LD requires absolute URLs for image and logo.
  eleventyConfig.addFilter("absUrl", function (value, base) {
    const b = String(base || "").replace(/\/$/, "");
    const one = (v) =>
      typeof v === "string" && v.startsWith("/") ? b + v : v;
    return Array.isArray(value) ? value.map(one) : one(value);
  });

  // Static assets copied through untouched.
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  // Self-hosted Motion library (vanilla build) — used by src/assets/animations.js.
  eleventyConfig.addPassthroughCopy({
    "node_modules/motion/dist/motion.js": "assets/vendor/motion.js",
  });
  eleventyConfig.addPassthroughCopy({ admin: "admin" });
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });
  // Retire the template's own pages.dev deployment: every path 301s to the
  // live marketing site. Client copies of this repo must delete src/_redirects.
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });

  // Rebuild when the config or content changes.
  eleventyConfig.addWatchTarget("content/");

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["njk", "html", "md"],
  };
}
