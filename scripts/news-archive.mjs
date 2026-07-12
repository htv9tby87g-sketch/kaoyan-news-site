import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const minimumFinalCacheVersion = 7;
const siteLaunchDate = "2026-07-10";

function reportOrder(left, right) {
  if (left.date !== right.date) return right.date.localeCompare(left.date);
  if (left.edition === right.edition) return 0;
  return left.edition === "evening" ? -1 : 1;
}

export function isPublishedReport(payload) {
  return Number(payload?.cacheVersion) >= minimumFinalCacheVersion
    && payload.date >= siteLaunchDate
    && ["morning", "evening"].includes(payload.edition)
    && Array.isArray(payload.articles)
    && payload.articles.length > 0;
}

export async function writeNewsManifest(dataDir) {
  await mkdir(dataDir, { recursive: true });
  const reports = [];
  for (const entry of await readdir(dataDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name === "index.json") continue;
    try {
      const payload = JSON.parse(await readFile(path.join(dataDir, entry.name), "utf8"));
      if (!isPublishedReport(payload)) continue;
      reports.push({
        date: payload.date,
        edition: payload.edition,
        file: entry.name,
        generatedAt: payload.generatedAt,
        finalizedAt: payload.finalizedAt || payload.generatedAt,
        articleCount: payload.articles.length,
      });
    } catch {
      // A malformed cache file must not prevent the valid archive from publishing.
    }
  }
  reports.sort(reportOrder);
  const manifest = {
    updatedAt: new Date().toISOString(),
    siteLaunchDate,
    latest: reports[0] || null,
    reports,
  };
  await writeFile(path.join(dataDir, "index.json"), JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}

export async function migratePublishedReports(sourceDir, destinationDir) {
  await mkdir(destinationDir, { recursive: true });
  let copied = 0;
  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name === "index.json") continue;
    const source = path.join(sourceDir, entry.name);
    try {
      const payload = JSON.parse(await readFile(source, "utf8"));
      if (!isPublishedReport(payload)) continue;
      await copyFile(source, path.join(destinationDir, entry.name));
      copied += 1;
    } catch {
      // Old or malformed local caches remain local-only.
    }
  }
  const manifest = await writeNewsManifest(destinationDir);
  return { copied, manifest };
}
