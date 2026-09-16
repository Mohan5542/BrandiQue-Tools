import { spawn } from "node:child_process";
const local = process.argv.includes("--local");
const target = local ? "http://127.0.0.1:3005" : process.argv[2];
if (!target || !/^https?:\/\//.test(target)) {
  console.error(
    "Usage: npm run verify:deployment -- https://your-site.example OR --local",
  );
  process.exit(1);
}
const base = new URL(target);
if (base.pathname !== "/" || base.search || base.hash) {
  console.error(
    "Provide the deployed origin. This application is built for a domain root.",
  );
  process.exit(1);
}
const server = local
  ? spawn(process.execPath, ["scripts/serve.mjs"], {
      env: { ...process.env, PORT: "3005" },
      stdio: "ignore",
    })
  : null;
const titles = new Set();
const failures = [],
  assets = new Set(),
  routes = new Set(["/", "/tools/"]);
async function get(path, method = "GET") {
  const response = await fetch(new URL(path, base), {
    method,
    signal: AbortSignal.timeout(15000),
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response;
}
try {
  if (local)
    for (let i = 0; i < 40; i++) {
      try {
        await get("/");
        break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
  const sitemap = await (await get("/sitemap.xml")).text();
  for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g))
    routes.add(new URL(match[1]).pathname);
  for (const path of routes) {
    try {
      const response = await get(path);
      const html = await response.text();
      const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
      if (!title || titles.has(title))
        throw new Error(
          `${path}: missing/duplicate page title; check for a catch-all HTML rewrite`,
        );
      titles.add(title);
      if (!response.headers.get("content-type")?.includes("text/html"))
        throw new Error(`${path}: page not served as HTML`);
      for (const match of html.matchAll(
        /(?:src|href)="([^"\s]+\.(?:js|css)(?:\?[^"\s]*)?)"/g,
      )) {
        const url = new URL(match[1].replaceAll("&amp;", "&"), base);
        if (url.origin === base.origin) assets.add(url.pathname + url.search);
      }
    } catch (e) {
      failures.push(e.message);
    }
  }
  if (!assets.size)
    failures.push("No application script/style assets found in page HTML.");
  for (const path of assets) {
    try {
      const response = await get(path);
      const mime = response.headers.get("content-type") || "";
      const body = await response.text();
      if (/\.js(?:\?|$)/.test(path) && !/(?:java|ecma)script/.test(mime))
        throw new Error(`${path}: invalid JavaScript MIME ${mime}`);
      if (/\.css(?:\?|$)/.test(path) && !mime.includes("text/css"))
        throw new Error(`${path}: invalid CSS MIME ${mime}`);
      if (/^\s*(?:<!doctype|<html)/i.test(body))
        throw new Error(
          `${path}: host returned an HTML fallback instead of an asset`,
        );
    } catch (e) {
      failures.push(e.message);
    }
  }
  for (const [path, mime] of [
    ["/workers/image.js", "javascript"],
    ["/vendor/pdf.worker.min.mjs", "javascript"],
    ["/vendor/ffmpeg-core.js", "javascript"],
    ["/vendor/ffmpeg-core.wasm", "application/wasm"],
  ]) {
    try {
      const response = await get(path, "HEAD");
      if (!response.headers.get("content-type")?.includes(mime))
        throw new Error(`${path}: incorrect processing-asset MIME type`);
    } catch (e) {
      failures.push(e.message);
    }
  }
  console.log(
    JSON.stringify(
      {
        origin: base.origin,
        routesChecked: routes.size,
        scriptAndStyleAssetsChecked: assets.size,
        processingAssetsChecked: 4,
        failures,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exitCode = 1;
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  server?.kill();
}
