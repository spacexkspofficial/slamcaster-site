#!/usr/bin/env node
// Regenerates sitemap.xml for slamcaster.com.
//
// Run from anywhere after adding, renaming, or removing comics:
//   node tools/generate-sitemap.mjs
//
// It scans comics.html for every comic image and emits an image-sitemap
// entry per comic, so search engines index each strip. No dependencies.
import { readFileSync, writeFileSync, statSync } from "node:fs";
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

const lastmod = (file) => statSync(join(root, file)).mtime.toISOString().slice(0, 10);

const comicsHtml = readFileSync(join(root, "comics.html"), "utf8");
const comicImages = [...comicsHtml.matchAll(/<img class="comic-image" src="(comics\/[^"]+)"/g)].map(
  (m) => m[1]
);

const urlFor = (page) => (page === "index.html" ? `${SITE}/` : `${SITE}/${page}`);

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
for (const page of PAGES) {
  xml += `  <url>\n    <loc>${urlFor(page)}</loc>\n    <lastmod>${lastmod(page)}</lastmod>\n`;
  if (page === "comics.html") {
    for (const img of comicImages) {
      xml += `    <image:image>\n      <image:loc>${SITE}/${esc(img)}</image:loc>\n    </image:image>\n`;
    }
  }
  xml += `  </url>\n`;
}
xml += `</urlset>\n`;

writeFileSync(join(root, "sitemap.xml"), xml);
console.log(`sitemap.xml written: ${PAGES.length} pages, ${comicImages.length} comic images.`);
