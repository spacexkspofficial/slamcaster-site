#!/usr/bin/env node
// Validates Slamcaster's crawl, SEO, and agent-discovery layers without
// network access or third-party packages.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://slamcaster.com";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  { file: "index.html", canonical: `${SITE}/` },
  { file: "comics.html", canonical: `${SITE}/comics.html` },
  { file: "about.html", canonical: `${SITE}/about.html` },
  { file: "donate.html", canonical: `${SITE}/donate.html` },
  { file: "contact.html", canonical: `${SITE}/contact.html` },
  { file: "privacy.html", canonical: `${SITE}/privacy.html` },
  { file: "terms.html", canonical: `${SITE}/terms.html` },
];
const errors = [];

const check = (condition, message) => {
  if (!condition) errors.push(message);
};
const read = (file) => readFileSync(join(root, file), "utf8");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const countMatches = (text, pattern) => [...text.matchAll(pattern)].length;
const jsonLdFrom = (html, file) =>
  [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match, index) => {
      try {
        return JSON.parse(match[1]);
      } catch (error) {
        errors.push(`${file}: JSON-LD block ${index + 1} is invalid (${error.message}).`);
        return null;
      }
    }
  );

for (const page of pages) {
  const html = read(page.file);
  const prefix = `${page.file}:`;
  const canonicalPattern = new RegExp(
    `<link\\s+rel="canonical"\\s+href="${escapeRegex(page.canonical)}"\\s*/?>`
  );
  const ogUrlPattern = new RegExp(
    `<meta\\s+property="og:url"\\s+content="${escapeRegex(page.canonical)}"\\s*/?>`
  );

  check(countMatches(html, /<title>[^<]+<\/title>/g) === 1, `${prefix} needs one title.`);
  check(
    /<meta\s+name="description"\s+content="[^"]{50,}"\s*\/>/.test(html),
    `${prefix} needs a descriptive meta description.`
  );
  check(canonicalPattern.test(html), `${prefix} canonical URL is missing or incorrect.`);
  check(ogUrlPattern.test(html), `${prefix} og:url must match the canonical URL.`);
  check(/<meta\s+property="og:title"\s+content="[^"]+"\s*\/>/.test(html), `${prefix} missing og:title.`);
  check(
    /<meta\s+property="og:description"\s+content="[^"]+"\s*\/>/.test(html),
    `${prefix} missing og:description.`
  );
  check(/<meta\s+property="og:image"\s+content="https:\/\/[^"]+"\s*\/>/.test(html), `${prefix} missing og:image.`);
  check(/<meta\s+name="twitter:card"\s+content="[^"]+"\s*\/>/.test(html), `${prefix} missing twitter:card.`);
  check(countMatches(html, /<h1(?:\s|>)/g) === 1, `${prefix} needs exactly one h1.`);
  check(!/href="index\.html"/.test(html), `${prefix} links to non-canonical index.html.`);

  const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"\s*\/>/)?.[1] || "";
  for (const directive of ["index", "follow", "max-snippet:-1", "max-image-preview:large"]) {
    check(robots.includes(directive), `${prefix} robots meta is missing ${directive}.`);
  }

  jsonLdFrom(html, page.file);

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:)/i.test(value)) continue;
    const localPath = value.split(/[?#]/, 1)[0];
    if (!localPath || localPath === "./" || localPath === "/") continue;
    check(existsSync(join(root, localPath)), `${prefix} referenced file does not exist: ${localPath}`);
  }
}

const robotsTxt = read("robots.txt");
for (const agent of [
  "OAI-SearchBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "ChatGPT-User",
  "Claude-User",
  "Perplexity-User",
  "*",
]) {
  check(robotsTxt.includes(`User-agent: ${agent}`), `robots.txt: missing user-agent ${agent}.`);
}
check(robotsTxt.includes("https://slamcaster.com/llms.txt"), "robots.txt: missing llms.txt discovery comment.");
check(
  robotsTxt.includes("Sitemap: https://slamcaster.com/sitemap.xml"),
  "robots.txt: missing absolute sitemap URL."
);

const llmsTxt = read("llms.txt");
check(llmsTxt.startsWith("# Slamcaster\n"), "llms.txt: must begin with the site H1.");
check(/^> .+/m.test(llmsTxt), "llms.txt: missing blockquote summary.");
check(/^## Primary content$/m.test(llmsTxt), "llms.txt: missing primary content section.");
for (const match of llmsTxt.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
  check(match[1].startsWith(`${SITE}/`), `llms.txt: non-canonical or external link: ${match[1]}`);
}

const comicsHtml = read("comics.html");
const cards = [
  ...comicsHtml.matchAll(/<article class="comic-card" id="comic-(\d+)"[\s\S]*?<\/article>/g),
];
check(cards.length > 0, "comics.html: no comic cards found.");

for (const [index, cardMatch] of cards.entries()) {
  const position = Number(cardMatch[1]);
  const card = cardMatch[0];
  const image = card.match(/<img class="comic-image" src="([^"]+)" alt="([^"]+)"/) || [];
  check(position === index + 1, `comics.html: comic IDs must be contiguous at position ${index + 1}.`);
  check(Boolean(image[1]), `comics.html: comic-${position} is missing its comic image.`);
  check((image[2] || "").length >= 50, `comics.html: comic-${position} needs descriptive alt text.`);
  check(
    /<details class="comic-transcript">[\s\S]*?<summary>Read transcript<\/summary>[\s\S]*?<p>/.test(card),
    `comics.html: comic-${position} needs a visible transcript.`
  );
  if (image[1]) {
    check(existsSync(join(root, image[1])), `comics.html: missing image file ${image[1]}.`);
  }
}

const comicsJson = jsonLdFrom(comicsHtml, "comics.html").filter(Boolean);
const comicsNodes = comicsJson.flatMap((value) => value["@graph"] || [value]);
const series = comicsNodes.find((node) => node["@type"] === "ComicSeries");
const stories = series?.hasPart || [];
check(Boolean(series), "comics.html: JSON-LD ComicSeries is missing.");
check(stories.length === cards.length, "comics.html: JSON-LD story count does not match comic cards.");

for (const [index, story] of stories.entries()) {
  const position = index + 1;
  const expectedId = `${SITE}/comics.html#comic-${position}`;
  check(story.position === position, `comics.html: JSON-LD story ${position} has the wrong position.`);
  check(story["@id"] === expectedId, `comics.html: JSON-LD story ${position} has the wrong @id.`);
  check(story.url === expectedId, `comics.html: JSON-LD story ${position} has the wrong URL.`);
}

const sitemap = read("sitemap.xml");
const sitemapPages = [...sitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapImages = [...sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(
  (match) => match[1]
);
check(
  JSON.stringify(sitemapPages) === JSON.stringify(pages.map((page) => page.canonical)),
  "sitemap.xml: canonical page inventory is stale or out of order."
);
check(sitemapImages.length === cards.length, "sitemap.xml: comic image count does not match comic cards.");
check(
  countMatches(sitemap, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) === pages.length,
  "sitemap.xml: each page needs a valid lastmod date."
);

if (errors.length) {
  console.error(`Discovery validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Discovery validation passed: ${pages.length} pages, ${cards.length} comics, ${sitemapImages.length} sitemap images.`
);
