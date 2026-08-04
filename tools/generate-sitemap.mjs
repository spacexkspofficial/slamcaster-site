#!/usr/bin/env node
// Regenerates sitemap.xml for slamcaster.com.
//
// Run from anywhere after adding, renaming, or removing comics:
//   node tools/generate-sitemap.mjs
//
// It scans comics.html for every comic image and emits an image-sitemap
// entry per comic, so search engines can discover each strip. Page lastmod
// values come from Git when possible, which keeps them accurate after clones.
// No third-party dependencies.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://slamcaster.com";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PAGES = [
  "index.html",
  "comics.html",
  "about.html",
  "donate.html",
  "contact.html",
  "privacy.html",
  "terms.html",
];

const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const localDate = (date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");

const lastmod = (file) => {
  try {
    const dirty = execFileSync("git", ["status", "--porcelain", "--", file], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const committedAt = execFileSync("git", ["log", "-1", "--format=%cI", "--", file], {
      cwd: root,
      encoding: "utf8",
    }).trim();

    if (!dirty && committedAt) {
      return committedAt.slice(0, 10);
    }
  } catch {
    // A source archive may not include Git metadata; mtime is the safe fallback.
  }

  return localDate(statSync(join(root, file)).mtime);
};

const comicsHtml = readFileSync(join(root, "comics.html"), "utf8");
const comicImages = [
  ...comicsHtml.matchAll(
    /<article class="comic-card" id="comic-(\d+)"[\s\S]*?<img class="comic-image" src="(comics\/[^"]+)"/g
  ),
].map((match) => ({ position: Number(match[1]), path: match[2] }));

if (!comicImages.length) {
  throw new Error("No comic cards were found in comics.html.");
}

for (const [index, comic] of comicImages.entries()) {
  const expectedPosition = index + 1;
  if (comic.position !== expectedPosition) {
    throw new Error(
      `Comic sequence is not contiguous: expected comic-${expectedPosition}, found comic-${comic.position}.`
    );
  }
  if (!existsSync(join(root, comic.path))) {
    throw new Error(`Comic image does not exist: ${comic.path}`);
  }
}

if (new Set(comicImages.map((comic) => comic.path)).size !== comicImages.length) {
  throw new Error("Duplicate comic image paths were found in comics.html.");
}

const urlFor = (page) => (page === "index.html" ? `${SITE}/` : `${SITE}/${page}`);

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
for (const page of PAGES) {
  xml += `  <url>\n    <loc>${urlFor(page)}</loc>\n    <lastmod>${lastmod(page)}</lastmod>\n`;
  if (page === "comics.html") {
    for (const comic of comicImages) {
      xml += `    <image:image>\n      <image:loc>${SITE}/${esc(comic.path)}</image:loc>\n    </image:image>\n`;
    }
  }
  xml += `  </url>\n`;
}
xml += `</urlset>\n`;

writeFileSync(join(root, "sitemap.xml"), xml);
console.log(`sitemap.xml written: ${PAGES.length} pages, ${comicImages.length} comic images.`);
