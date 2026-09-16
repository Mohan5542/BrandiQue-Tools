import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
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
      const data = await readFile(target);
      res.writeHead(200, {
        ...headers,
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
        "Content-Length": data.length,
      });
      res.end(req.method === "HEAD" ? undefined : data);
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
