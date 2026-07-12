import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, "..");
const distDir = path.join(rootDir, "dist");
if (!distDir.startsWith(`${rootDir}${path.sep}`)) throw new Error("Invalid build destination");

await rm(distDir, { recursive: true, force: true });
await mkdir(path.join(distDir, "data", "news"), { recursive: true });

for (const file of ["index.html", "app.js", "styles.css"]) {
  await cp(path.join(rootDir, file), path.join(distDir, file));
}
await cp(path.join(rootDir, "assets"), path.join(distDir, "assets"), { recursive: true });
await cp(path.join(rootDir, "published-data", "news"), path.join(distDir, "data", "news"), { recursive: true });
await writeFile(path.join(distDir, ".nojekyll"), "", "utf8");

console.log(`Static site built in ${distDir}`);
