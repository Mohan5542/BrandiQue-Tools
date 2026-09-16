import { spawn } from "node:child_process";
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  env: { ...process.env, PORT: "3004" },
  stdio: "ignore",
});
for (let i = 0; i < 40; i++) {
  try {
    if ((await fetch("http://127.0.0.1:3004")).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
const results = [];
try {
  for (const slug of [
    "image-resizer",
    "pdf-editor",
    "video-resizer",
    "ats-resume-builder",
  ]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send("Network.enable");
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 100,
      downloadThroughput: 200000,
      uploadThroughput: 100000,
    });
    await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const started = Date.now();
    await page.goto(`http://127.0.0.1:3004/tools/${slug}/`);
    await page.locator("[data-tool-ready=true]").waitFor();
    const input = page.locator("input[type=file]").first();
    await input.waitFor({ state: "attached" });
    await page.waitForFunction(
      () => !document.querySelector("input[type=file]")?.disabled,
    );
    const metrics = await page.evaluate(() => ({
      scripts: performance
        .getEntriesByType("resource")
        .filter((r) => r.name.match(/\.js(?:\?|$)/))
        .reduce((n, r) => n + r.encodedBodySize, 0),
      resources: performance
        .getEntriesByType("resource")
        .map((r) => new URL(r.name).pathname),
    }));
    results.push({ slug, readyMs: Date.now() - started, ...metrics });
    await context.close();
  }
  await mkdir("test-results", { recursive: true });
  await writeFile(
    process.argv[2] || "test-results/loading.json",
    JSON.stringify(results, null, 2),
  );
  console.log(
    JSON.stringify(
      results.map((r) => ({
        slug: r.slug,
        readyMs: r.readyMs,
        scripts: r.scripts,
      })),
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  server.kill();
}
