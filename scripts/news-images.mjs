import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const imageLimit = { morning: 5, evening: 3 };
const contentTypeExtensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

function decodeEntities(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function tagAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

export function extractPageImage(html, sourceUrl) {
  const candidates = [];
  let alt = "";
  for (const match of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = tagAttributes(match[0]);
    const key = String(attributes.property || attributes.name || "").toLowerCase();
    if (["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"].includes(key)) {
      candidates.push(attributes.content || "");
    }
    if (["og:image:alt", "twitter:image:alt"].includes(key) && !alt) alt = decodeEntities(attributes.content || "");
  }
  for (const candidate of candidates) {
    try {
      const url = new URL(decodeEntities(candidate), sourceUrl);
      if (["http:", "https:"].includes(url.protocol)) return { url: url.href, alt };
    } catch {
      // Try the next image metadata field.
    }
  }
  for (const match of String(html).matchAll(/<img\b[^>]*>/gi)) {
    const attributes = tagAttributes(match[0]);
    const candidate = attributes["data-src"] || attributes["data-original"] || attributes.src || "";
    try {
      const url = new URL(decodeEntities(candidate), sourceUrl);
      if (!["http:", "https:"].includes(url.protocol)) continue;
      if (/(?:qrcode|qr-code|ewm|zxcode|sharelogo|\/logo|\/icon|avatar)/i.test(url.href)) continue;
      if (!/\.(?:jpe?g|png|webp)(?:$|[?#])/i.test(url.href)) continue;
      return { url: url.href, alt: decodeEntities(attributes.alt || "") };
    } catch {
      // Try the next body image.
    }
  }
  return { url: "", alt: "" };
}

async function fetchWithTimeout(url, type) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), type === "image" ? 15000 : 10000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Accept-Encoding": "identity",
        "User-Agent": "Mozilla/5.0 kaoyan-news-study-site/1.0",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function discoverImage(article) {
  const direct = article.imageRemoteUrl || (/^https?:\/\//i.test(article.imageUrl || "") ? article.imageUrl : "");
  if (direct) return { url: direct, alt: article.imageAlt || article.title };
  if (!article.sourceUrl) return { url: "", alt: "" };
  const response = await fetchWithTimeout(article.sourceUrl, "page");
  return extractPageImage(await response.text(), article.sourceUrl);
}

async function cacheImage(remoteUrl, destinationDir, stem) {
  const response = await fetchWithTimeout(remoteUrl, "image");
  const contentType = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  const extension = contentTypeExtensions.get(contentType);
  if (!extension) throw new Error(`Unsupported image type: ${contentType || "unknown"}`);
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > 8 * 1024 * 1024) throw new Error("Image is too large");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error("Invalid image size");
  const filename = `${stem}${extension}`;
  await writeFile(path.join(destinationDir, filename), bytes);
  return filename;
}

export async function enrichReportImages(report, newsDir) {
  if (!report?.date || !report?.edition || !Array.isArray(report.articles)) return { cached: 0, changed: false };
  const destinationDir = path.resolve(newsDir, "..", "images");
  await mkdir(destinationDir, { recursive: true });
  let cached = 0;
  let changed = false;
  const target = imageLimit[report.edition] || 3;
  const seenRemoteImages = new Set();

  for (let index = 0; index < report.articles.length && cached < target; index += 1) {
    const article = report.articles[index];
    const knownRemote = String(article.imageRemoteUrl || "");
    if (knownRemote && seenRemoteImages.has(knownRemote)) {
      delete article.imageUrl;
      delete article.imageRemoteUrl;
      delete article.imageAlt;
      delete article.imageSource;
      changed = true;
      continue;
    }
    if (String(article.imageUrl || "").startsWith("data/images/")) {
      const existing = path.join(destinationDir, path.basename(article.imageUrl));
      try {
        await access(existing);
        if (knownRemote) seenRemoteImages.add(knownRemote);
        cached += 1;
        continue;
      } catch {
        // Recreate a missing cached image below.
      }
    }

    try {
      const image = await discoverImage(article);
      if (!image.url) continue;
      if (seenRemoteImages.has(image.url)) continue;
      const hash = createHash("sha256").update(image.url).digest("hex").slice(0, 10);
      const stem = `${report.date}-${report.edition}-${String(index + 1).padStart(2, "0")}-${hash}`;
      const filename = await cacheImage(image.url, destinationDir, stem);
      article.imageRemoteUrl = image.url;
      article.imageUrl = `data/images/${filename}`;
      article.imageAlt = image.alt || article.title;
      article.imageSource = article.imageSource || article.sourceName;
      seenRemoteImages.add(image.url);
      cached += 1;
      changed = true;
    } catch {
      // A failed image must never prevent the factual report from publishing.
    }
  }

  if (changed) {
    await writeFile(
      path.join(newsDir, `${report.date}-${report.edition}.json`),
      JSON.stringify(report, null, 2),
      "utf8",
    );
  }
  return { cached, changed };
}

export async function enrichNewsArchive(newsDir) {
  let cached = 0;
  let changed = 0;
  for (const entry of await readdir(newsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name === "index.json") continue;
    try {
      const report = JSON.parse(await readFile(path.join(newsDir, entry.name), "utf8"));
      const result = await enrichReportImages(report, newsDir);
      cached += result.cached;
      if (result.changed) changed += 1;
    } catch {
      // Invalid or unreachable archive entries are skipped.
    }
  }
  return { cached, changed };
}
