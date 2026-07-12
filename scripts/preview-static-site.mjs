import http from "node:http";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, "..", "dist");
const port = Number(process.env.STATIC_PORT || 8792);
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = path.normalize(path.join(rootDir, pathname));
  if (!file.startsWith(rootDir)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  createReadStream(file).on("error", () => res.writeHead(404).end("Not found")).pipe(res);
}).listen(port, () => console.log(`Static preview: http://localhost:${port}/?static=1`));
