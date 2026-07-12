import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeNewsManifest } from "./scripts/news-archive.mjs";
import { enrichNewsArchive, enrichReportImages } from "./scripts/news-images.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const publishedDataDir = path.resolve(process.env.NEWS_DATA_DIR || path.join(rootDir, "published-data", "news"));
process.env.NEWS_DATA_DIR = publishedDataDir;

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] || null;
};
const hasFlag = (name) => args.includes(name);
const { backfillNews, cachedNews, dateKey } = await import("./server.mjs");

if (hasFlag("--backfill")) {
  const result = await backfillNews(Number(option("--days")) || 14);
  const images = await enrichNewsArchive(publishedDataDir);
  const manifest = await writeNewsManifest(publishedDataDir);
  console.log(`Backfill complete: ${result.results.length} checks, ${manifest.reports.length} finalized reports, ${images.cached} images cached.`);
  process.exit(0);
}

const edition = option("--edition");
if (!['morning', 'evening'].includes(edition)) {
  throw new Error("Use --edition morning or --edition evening");
}

const date = option("--date") || dateKey(new Date());
const report = await cachedNews(date, edition, false, false, new Date(), hasFlag("--prepare"));
if (report.status !== "available") {
  throw new Error(`Report is not available: ${report.reason || report.status}`);
}

await enrichReportImages(report, publishedDataDir);
const manifest = await writeNewsManifest(publishedDataDir);
console.log(`Finalized ${date}-${edition}: ${report.articles.length} articles. Archive size: ${manifest.reports.length}.`);
