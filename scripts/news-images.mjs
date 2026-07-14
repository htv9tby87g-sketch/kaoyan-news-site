import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const imageLimit = { morning: 15, evening: 6 };
const minimumImageBytes = 20 * 1024;
const maximumImageBytes = 8 * 1024 * 1024;
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

async function fetchWithTimeout(url, type, referer = "") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), type === "image" ? 15000 : 10000);
  try {
    const headers = {
      "Accept-Encoding": "identity",
      "User-Agent": "Mozilla/5.0 kaoyan-news-study-site/1.0",
    };
    if (referer) headers.Referer = referer;
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function imageCandidateScore(candidate) {
  const haystack = `${candidate.url} ${candidate.alt}`.toLowerCase();
  let score = candidate.metadata ? 45 : 0;
  if (/(?:\/simg\/cmshd\/|\/newspic\/|\/photo\/|\/photos\/|\/upload\/|\/uploads\/)/i.test(candidate.url)) score += 60;
  if (/(?:qrcode|qr-code|ewm|zxcode|sharelogo|\/logo|\/icon|avatar|sprite|banner|advert|\/default\/|\/fileftp\/)/i.test(haystack)) score -= 120;
  if (candidate.width >= 600) score += 20;
  if (candidate.height >= 300) score += 20;
  return score;
}

function normalizeCandidateUrl(value, sourceUrl) {
  try {
    const url = new URL(decodeEntities(value), sourceUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function inlineImageScope(html, sourceUrl) {
  const source = String(html);
  try {
    if (/(^|\.)chinanews\.com\.cn$/i.test(new URL(sourceUrl).hostname)) {
      const startMatch = /<div\b[^>]*class\s*=\s*["'][^"']*\bleft_zw\b[^"']*["'][^>]*>/i.exec(source);
      if (startMatch) {
        const start = startMatch.index + startMatch[0].length;
        const rest = source.slice(start);
        const endMatch = /<div\b[^>]*id\s*=\s*["']zw_cyhd["'][^>]*>/i.exec(rest);
        return endMatch ? rest.slice(0, endMatch.index) : rest;
      }
    }
  } catch {
    // Fall through to generic article scoping.
  }
  const article = /<article\b[^>]*>[\s\S]*?<\/article>/i.exec(source);
  return article ? article[0] : source;
}

export function extractPageImages(html, sourceUrl) {
  const candidates = [];
  const inlineHtml = inlineImageScope(html, sourceUrl);
  const metadataTags = [...String(html).matchAll(/<meta\b[^>]*>/gi)];
  let metadataAlt = "";
  for (const match of metadataTags) {
    const attributes = tagAttributes(match[0]);
    const key = String(attributes.property || attributes.name || "").toLowerCase();
    if (["og:image:alt", "twitter:image:alt"].includes(key) && !metadataAlt) {
      metadataAlt = decodeEntities(attributes.content || "");
    }
  }
  for (const match of metadataTags) {
    const attributes = tagAttributes(match[0]);
    const key = String(attributes.property || attributes.name || "").toLowerCase();
    if (!["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"].includes(key)) continue;
    const url = normalizeCandidateUrl(attributes.content || "", sourceUrl);
    if (url) candidates.push({ url, alt: metadataAlt, metadata: true, width: 0, height: 0 });
  }

  for (const match of inlineHtml.matchAll(/<img\b[^>]*>/gi)) {
    const attributes = tagAttributes(match[0]);
    const url = normalizeCandidateUrl(
      attributes["data-src"] || attributes["data-original"] || attributes["data-lazy-src"] || attributes.src || "",
      sourceUrl,
    );
    if (!url) continue;
    const width = Number.parseInt(attributes.width || "0", 10) || 0;
    const height = Number.parseInt(attributes.height || "0", 10) || 0;
    if ((width && width < 260) || (height && height < 140)) continue;
    candidates.push({
      url,
      alt: decodeEntities(attributes.alt || ""),
      metadata: false,
      width,
      height,
    });
  }

  const unique = new Map();
  for (const candidate of candidates) {
    if (!unique.has(candidate.url)) unique.set(candidate.url, candidate);
  }
  return [...unique.values()]
    .map((candidate) => ({ ...candidate, score: imageCandidateScore(candidate) }))
    .filter((candidate) => candidate.score > -50)
    .sort((left, right) => right.score - left.score);
}

export function extractPageImage(html, sourceUrl) {
  const [image] = extractPageImages(html, sourceUrl);
  return image ? { url: image.url, alt: image.alt } : { url: "", alt: "" };
}

async function discoverImages(article) {
  const candidates = [];
  const direct = article.imageRemoteUrl || (/^https?:\/\//i.test(article.imageUrl || "") ? article.imageUrl : "");
  if (direct) {
    const directCandidate = {
      url: direct,
      alt: article.imageAlt || article.title,
      metadata: true,
      width: 0,
      height: 0,
    };
    if (imageCandidateScore(directCandidate) > -50) candidates.push(directCandidate);
  }
  if (article.sourceUrl) {
    const response = await fetchWithTimeout(article.sourceUrl, "page");
    candidates.push(...extractPageImages(await response.text(), article.sourceUrl));
  }
  const unique = new Map();
  for (const candidate of candidates) {
    if (candidate.url && !unique.has(candidate.url)) unique.set(candidate.url, candidate);
  }
  return [...unique.values()];
}

async function cacheImage(remoteUrl, destinationDir, stem, referer = "") {
  const response = await fetchWithTimeout(remoteUrl, "image", referer);
  const contentType = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  const extension = contentTypeExtensions.get(contentType);
  if (!extension) throw new Error(`Unsupported image type: ${contentType || "unknown"}`);
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize && !isUsableImageSize(declaredSize)) throw new Error("Image size is outside the usable range");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!isUsableImageSize(bytes.length)) throw new Error("Invalid image size");
  const filename = `${stem}${extension}`;
  await writeFile(path.join(destinationDir, filename), bytes);
  return filename;
}

export function isUsableImageSize(size) {
  return Number(size) >= minimumImageBytes && Number(size) <= maximumImageBytes;
}

export function removeUncachedImage(article) {
  if (String(article?.imageUrl || "").startsWith("data/images/")) return false;
  let changed = false;
  for (const key of ["imageUrl", "imageRemoteUrl", "imageAlt", "imageSource"]) {
    if (!article || !(key in article)) continue;
    delete article[key];
    changed = true;
  }
  return changed;
}

export async function enrichReportImages(report, newsDir, { refresh = false } = {}) {
  if (!report?.date || !report?.edition || !Array.isArray(report.articles)) return { cached: 0, changed: false };
  const destinationDir = path.resolve(newsDir, "..", "images");
  await mkdir(destinationDir, { recursive: true });
  let cached = 0;
  let changed = false;
  const target = imageLimit[report.edition] || 3;
  const seenRemoteImages = new Set();

  for (let index = 0; index < report.articles.length; index += 1) {
    const article = report.articles[index];
    if (refresh && String(article.imageUrl || "").startsWith("data/images/")) {
      await unlink(path.join(destinationDir, path.basename(article.imageUrl))).catch(() => {});
      for (const key of ["imageUrl", "imageRemoteUrl", "imageAlt", "imageSource"]) delete article[key];
      changed = true;
    }
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
        delete article.imageUrl;
        changed = true;
      }
    }

    if (cached >= target) {
      changed = removeUncachedImage(article) || changed;
      continue;
    }

    try {
      const images = await discoverImages(article);
      let stored = false;
      for (const image of images) {
        if (!image.url || seenRemoteImages.has(image.url)) continue;
        try {
          const hash = createHash("sha256").update(image.url).digest("hex").slice(0, 10);
          const stem = `${report.date}-${report.edition}-${String(index + 1).padStart(2, "0")}-${hash}`;
          const filename = await cacheImage(image.url, destinationDir, stem, article.sourceUrl);
          article.imageRemoteUrl = image.url;
          article.imageUrl = `data/images/${filename}`;
          article.imageAlt = image.alt || article.title;
          article.imageSource = article.imageSource || article.sourceName;
          seenRemoteImages.add(image.url);
          cached += 1;
          changed = true;
          stored = true;
          break;
        } catch {
          // Keep trying candidates from the same article page.
        }
      }
      if (!stored) changed = removeUncachedImage(article) || changed;
    } catch {
      // A failed image must never prevent the factual report from publishing.
      changed = removeUncachedImage(article) || changed;
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
