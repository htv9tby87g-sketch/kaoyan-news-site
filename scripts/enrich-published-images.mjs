import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enrichReportImages } from "./news-images.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const newsDir = path.resolve(scriptsDir, "..", "published-data", "news");
const reportOptionIndex = process.argv.indexOf("--report");
const reportName = reportOptionIndex >= 0 ? String(process.argv[reportOptionIndex + 1] || "") : "";
const refresh = process.argv.includes("--refresh");
if (reportOptionIndex >= 0 && !/^\d{4}-\d{2}-\d{2}-(?:morning|evening)$/.test(reportName)) {
  throw new Error("Use --report YYYY-MM-DD-morning or --report YYYY-MM-DD-evening");
}
let total = 0;

const entries = reportName
  ? [{ name: `${reportName}.json`, isFile: () => true }]
  : await readdir(newsDir, { withFileTypes: true });

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name === "index.json") continue;
  const report = JSON.parse(await readFile(path.join(newsDir, entry.name), "utf8"));
  const result = await enrichReportImages(report, newsDir, { refresh });
  total += result.cached;
  console.log(`${entry.name}: ${result.cached} images available`);
}

console.log(`Image enrichment complete: ${total} report images available.`);
