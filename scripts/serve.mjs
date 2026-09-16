import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream";
const root = path.resolve("out");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".json": "application/json",
  ".png": "image/png",
  ".mp4": "video/mp4",
};
const headers = {};
for (const line of (await readFile("public/_headers", "utf8")).split("\n")) {
  if (line.startsWith("  ") && !line.includes("Cache-Control")) {
    const i = line.indexOf(":");
    headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let target = path.resolve(root, "." + decodeURIComponent(url.pathname));
      if (target !== root && !target.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if ((await stat(target)).isDirectory())
        target = path.join(target, "index.html");
      const info = await stat(target);
      const etag = `"${info.size}-${info.mtimeMs.toString(16)}"`;
      const mime = types[path.extname(target)] || "application/octet-stream";
      const cache = url.pathname.startsWith("/_next/static/")
        ? "public, max-age=31536000, immutable"
        : url.pathname.startsWith("/vendor/")
          ? "public, max-age=86400"
          : "no-cache";
      const responseHeaders = {
        ...headers,
        "Content-Type": mime,
        "Cache-Control": cache,
        ETag: etag,
        Vary: "Accept-Encoding",
      };
      if (req.headers["if-none-match"] === etag) {
        res.writeHead(304, responseHeaders);
        res.end();
        return;
      }
      const compressed =
        /\bgzip\b/.test(req.headers["accept-encoding"] || "") &&
        /text\/|application\/(javascript|json|xml|wasm)|image\/svg/.test(
          mime,
        ) &&
        info.size > 1024;
      res.writeHead(200, {
        ...responseHeaders,
        ...(compressed
          ? { "Content-Encoding": "gzip" }
          : { "Content-Length": info.size }),
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      const source = createReadStream(target);
      const finish = () => {
        if (!res.writableEnded) res.destroy();
      };
      if (compressed) pipeline(source, createGzip(), res, finish);
      else pipeline(source, res, finish);
    } catch {
      res.writeHead(404, { "Content-Type": "text/html", ...headers });
      res.end(
        await readFile(path.join(root, "404.html")).catch(() =>
          Buffer.from("Not found"),
        ),
      );
    }
  })
  .listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
    console.log("Static preview ready."),
  );
