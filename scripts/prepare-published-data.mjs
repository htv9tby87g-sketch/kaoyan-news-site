import path from "node:path";
import { fileURLToPath } from "node:url";
import { migratePublishedReports } from "./news-archive.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, "..");
const result = await migratePublishedReports(
  path.join(rootDir, "data", "news"),
  path.join(rootDir, "published-data", "news"),
);

console.log(`Prepared ${result.copied} finalized reports. Latest: ${result.manifest.latest?.file || "none"}`);
