import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("file picker is keyboard accessible and accepts files without MIME metadata", async ({
  page,
}) => {
  await page.goto("/tools/image-resizer/");
  const picker = page.getByRole("button", {
    name: "Choose files",
    exact: true,
  });
  await expect(picker).toBeVisible();
  await picker.focus();
  const pending = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  const chooser = await pending;
  await chooser.setFiles({
    name: "photo.PNG",
    mimeType: "",
    buffer: await readFile("tests/fixtures/sample.png"),
  });
  await expect(page.getByLabel("Width (px)", { exact: true })).toHaveValue(
    "200",
  );
  await page
    .getByRole("button", { name: "Resize images", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Download ·/ })).toBeVisible();
});

test("valid image survives mixed batch and same file can be picked again", async ({
  page,
}) => {
  await page.goto("/tools/image-resizer/");
  const input = page.locator("input[type=file]");
  await expect(input).toBeEnabled();
  await input.setInputFiles([
    {
      name: "photo.png",
      mimeType: "image/png",
      buffer: await readFile("tests/fixtures/sample.png"),
    },
    {
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("not an image"),
    },
  ]);
  await expect(page.getByLabel("Width (px)", { exact: true })).toBeVisible();
  await expect(page.locator(".error[role=alert]")).toContainText("broken.png");
  await input.setInputFiles("tests/fixtures/sample.png");
  await expect(page.locator(".file-row")).toHaveCount(2);
});

test("PDF pages and annotations reuse parsed document and do not reload workers", async ({
  page,
}) => {
  let workers = 0;
  page.on("worker", (worker) => {
    if (worker.url().includes("pdf.worker")) workers++;
  });
  await page.goto("/tools/pdf-editor/");
  await expect(page.locator("input[type=file]").first()).toBeEnabled();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("tests/fixtures/sample.pdf");
  const canvas = page.getByLabel("PDF page preview and annotation canvas");
  await expect(canvas).toHaveAttribute("width", /[1-9]\d{2,}/);
  await expect(canvas).toHaveAttribute("aria-busy", "false");
  await canvas.click({ position: { x: 80, y: 80 } });
  await page.getByRole("button", { name: "Page 2", exact: true }).click();
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Page 1", exact: true }).click();
  await expect(canvas).toHaveAttribute("aria-busy", "false");
  await canvas.click({ position: { x: 100, y: 100 } });
  await expect.poll(() => workers).toBe(1);
});

test("image worker failure falls back to a real decodable download", async ({
  page,
}) => {
  await page.route("**/workers/image.js", (route) => route.abort());
  await page.goto("/tools/image-resizer/");
  await expect(page.locator("input[type=file]")).toBeEnabled();
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/sample.png");
  await page.getByLabel("Width (px)", { exact: true }).fill("80");
  await page
    .getByRole("button", { name: "Resize images", exact: true })
    .click();
  const button = page.getByRole("button", { name: /Download ·/ });
  await expect(button).toBeVisible();
  const pending = page.waitForEvent("download");
  await button.click();
  const file = await pending;
  const bytes = await readFile((await file.path())!);
  expect(
    await page.evaluate(async (data) => {
      const image = await createImageBitmap(new Blob([new Uint8Array(data)]));
      const size = [image.width, image.height];
      image.close();
      return size;
    }, Array.from(bytes)),
  ).toEqual([80, 40]);
});

test("drag and drop accepts a real image with generic MIME metadata", async ({
  page,
}) => {
  await page.goto("/tools/image-resizer/");
  await expect(page.locator("input[type=file]")).toBeEnabled();
  const data = Array.from(await readFile("tests/fixtures/sample.png"));
  await page.locator(".dropzone").evaluate((zone, data) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(data)], "camera.PNG", {
        type: "application/octet-stream",
      }),
    );
    zone.dispatchEvent(
      new DragEvent("drop", { bubbles: true, dataTransfer: transfer }),
    );
  }, data);
  await expect(page.getByLabel("Width (px)", { exact: true })).toHaveValue(
    "200",
  );
});

test("video worker is reused on repeat conversion and released on navigation", async ({
  page,
}) => {
  let created = 0;
  page.on("worker", () => created++);
  await page.goto("/tools/video-resizer/");
  await expect(page.locator("input[type=file]")).toBeEnabled();
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/sample.mp4");
  await page.getByLabel("Width (px)", { exact: true }).fill("160");
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("button", { name: "Convert video", exact: true })
      .click();
    await expect(page.getByRole("button", { name: /Download ·/ })).toBeVisible({
      timeout: 90000,
    });
    await expect(
      page.getByRole("button", { name: "Convert video", exact: true }),
    ).toBeEnabled();
  }
  expect(created).toBe(1);
  await page.locator('.tool-card[href="/tools/video-to-audio/"]').click();
  await expect(page.locator("h1")).toHaveText("Video to Audio");
  await expect.poll(() => page.workers().length).toBe(0);
  await expect(page.getByRole("button", { name: /Download ·/ })).toHaveCount(0);
});

test("real file picker works across all shared file workspaces", async ({
  page,
}) => {
  test.setTimeout(120000);
  const cases = [
    ["image-compressor", "png", ".file-row"],
    ["screenshot-editor", "png", ".editor-controls:not([hidden])"],
    ["image-to-pdf", "png", ".file-row"],
    ["pdf-editor", "pdf", ".page-chips"],
    ["pdf-merger", "pdf", ".page-chips"],
    ["pdf-splitter", "pdf", ".page-chips"],
    ["pdf-compressor", "pdf", ".page-chips"],
    ["pdf-to-word", "pdf", ".fields"],
    ["video-resizer", "mp4", ".file-info"],
    ["video-compressor", "mp4", ".file-info"],
    ["video-to-audio", "mp4", ".file-info"],
    ["file-converter", "png", ".toolbar"],
  ];
  for (const [slug, format, marker] of cases) {
    await page.goto(`/tools/${slug}/`);
    const button = page.getByRole("button", { name: /^Choose files?$/ });
    await expect(button).toBeEnabled();
    const pending = page.waitForEvent("filechooser");
    await button.click();
    await (await pending).setFiles(`tests/fixtures/sample.${format}`);
    await expect(page.locator(`.app-card ${marker}`).first()).toBeVisible();
  }
});

test("image resizer accepts pasted image bytes and exports a real file", async ({
  page,
}) => {
  await page.goto("/tools/image-resizer/");
  await expect(
    page.getByRole("button", { name: "Choose files", exact: true }),
  ).toBeEnabled();
  const bytes = Array.from(await readFile("tests/fixtures/sample.png"));
  await page.evaluate((bytes) => {
    const clipboard = new DataTransfer();
    clipboard.items.add(
      new File([new Uint8Array(bytes)], "pasted.png", { type: "image/png" }),
    );
    window.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: clipboard }),
    );
  }, bytes);
  await expect(page.getByLabel("Width (px)", { exact: true })).toHaveValue(
    "200",
  );
  await page
    .getByRole("button", { name: "Resize images", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Download ·/ })).toBeVisible();
});
