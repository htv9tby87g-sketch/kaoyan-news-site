import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enrichReportImages } from "./news-images.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const newsDir = path.resolve(scriptsDir, "..", "published-data", "news");
let total = 0;

for (const entry of await readdir(newsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name === "index.json") continue;
  const report = JSON.parse(await readFile(path.join(newsDir, entry.name), "utf8"));
  const result = await enrichReportImages(report, newsDir);
  total += result.cached;
  console.log(`${entry.name}: ${result.cached} images available`);
}

console.log(`Image enrichment complete: ${total} report images available.`);
