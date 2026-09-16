import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  env: { ...process.env, PORT: "3002" },
  stdio: "ignore",
});
let browser;
try {
  for (let i = 0; i < 30; i++) {
    try {
      if ((await fetch("http://127.0.0.1:3002")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE
      ? {
          executablePath: process.env.CHROMIUM_EXECUTABLE,
          args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    external = [],
    mutations = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      /^https?:/.test(r.url()) &&
      !r.url().startsWith("http://127.0.0.1:3002")
    )
      external.push(r.url());
    if (!["GET", "HEAD"].includes(r.method()))
      mutations.push(r.method() + " " + r.url());
  });
  await page.addInitScript(() => {
    window.__metrics = { lcp: 0, cls: 0 };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__metrics.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (!e.hadRecentInput) window.__metrics.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("http://127.0.0.1:3002/");
  await page.waitForLoadState("networkidle");
  const perf = await page.evaluate(() => ({
    ...window.__metrics,
    fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime,
    resources: performance
      .getEntriesByType("resource")
      .map((r) => ({ name: r.name, size: r.transferSize })),
  }));
  const scripts = perf.resources.filter((r) => /\.js(?:\?|$)/.test(r.name));
  let raw = 0,
    gzip = 0;
  for (const s of scripts) {
    const p = "out" + new URL(s.name).pathname;
    const b = await readFile(p);
    raw += b.length;
    gzip += gzipSync(b).length;
  }
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 850 });
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  const sitemap = await (
    await fetch("http://127.0.0.1:3002/sitemap.xml")
  ).text();
  const routes = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
  const broken = [],
    links = new Set();
  for (const route of routes) {
    const html = await (await fetch("http://127.0.0.1:3002" + route)).text();
    for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) {
      const p = new URL(m[1].replaceAll("&amp;", "&"), "http://127.0.0.1:3002")
        .pathname;
      if (!p.startsWith("/_next/")) links.add(p);
    }
  }
  for (const p of links) {
    const response = await fetch("http://127.0.0.1:3002" + p);
    if (!response.ok) broken.push(p);
  }
  const report = {
    routes: routes.length,
    internalLinksChecked: links.size,
    brokenLinks: broken,
    pageErrors: errors,
    externalRequests: external,
    networkMutations: mutations,
    home: {
      fcpMs: Math.round(perf.fcp),
      lcpMs: Math.round(perf.lcp),
      cls: perf.cls,
      initialJsRawBytes: raw,
      initialJsGzipBytes: gzip,
      heavyAssetsRequested: perf.resources
        .filter((r) => /\.wasm|pdf.worker|ffmpeg/.test(r.name))
        .map((r) => r.name),
    },
    engineBytes: {
      ffmpegWasm: (await stat("public/vendor/ffmpeg-core.wasm")).size,
      pdfWorker: (await stat("public/vendor/pdf.worker.min.mjs")).size,
    },
  };
  await writeFile("test-results/audit.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
