import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import AxeBuilder from "@axe-core/playwright";
import { tools } from "../../lib/registry";

const fixture = (name: string) => `tests/fixtures/sample.${name}`;
test("every route has crawlable unique metadata and no horizontal overflow", async ({
  page,
}) => {
  const titles = new Set<string>();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const t of tools) {
    await page.goto(`/tools/${t.slug}/`);
    await expect(page.locator("h1")).toHaveText(t.name);
    const title = await page.title();
    expect(titles.has(title)).toBe(false);
    titles.add(title);
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
      "href",
      new RegExp("/tools/" + t.slug + "/"),
    );
    await expect(page.locator("meta[name=description]")).toHaveAttribute(
      "content",
      t.description,
    );
    const schemas = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    schemas.forEach((s) => expect(() => JSON.parse(s)).not.toThrow());
    await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
    for (const width of [
      320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920,
    ]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
test("home is responsive and does not load heavy engines", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  for (const width of [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(requests.some((u) => /ffmpeg|pdf.worker|\.wasm/.test(u))).toBe(false);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(
    a11y.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    ),
  ).toEqual([]);
});
test("image resize and compressor export decodable files without uploading", async ({
  page,
}) => {
  const uploads: string[] = [];
  page.on("request", (r) => {
    if (["POST", "PUT", "PATCH"].includes(r.method())) uploads.push(r.url());
  });
  for (const slug of ["image-resizer", "image-compressor"]) {
    await page.goto("/tools/" + slug + "/");
    await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
    await page.locator("input[type=file]").setInputFiles(fixture("png"));
    if (slug === "image-compressor")
      await page.getByLabel("Resize mode").selectOption("dimensions");
    await page.getByLabel("Width (px)", { exact: true }).fill("100");
    await page
      .getByRole("button", {
        name: slug === "image-resizer" ? "Resize images" : "Compress images",
        exact: true,
      })
      .click();
    await expect(page.getByRole("status")).toContainText("complete");
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download ·/ }).click();
    const d = await event;
    const buf = await readFile((await d.path())!);
    expect(buf.length).toBeGreaterThan(20);
    const dimensions = await page.evaluate(async (bytes) => {
      const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)]));
      return [bmp.width, bmp.height];
    }, Array.from(buf));
    expect(dimensions).toEqual([100, 50]);
  }
  expect(uploads).toEqual([]);
});
test("video resizer, compressor and audio extraction produce real media", async ({
  page,
}) => {
  for (const slug of ["video-resizer", "video-compressor", "video-to-audio"]) {
    await page.goto("/tools/" + slug + "/");
    await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
    await page.locator("input[type=file]").setInputFiles(fixture("mp4"));
    if (slug !== "video-to-audio")
      await page.getByLabel("Width (px)", { exact: true }).fill("160");
    await page
      .getByRole("button", {
        name: slug === "video-to-audio" ? "Extract audio" : "Convert video",
        exact: true,
      })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Conversion complete",
      { timeout: 90000 },
    );
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download ·/ }).click();
    const d = await event;
    await d.saveAs(
      "test-results/" + slug + (slug === "video-to-audio" ? ".mp3" : ".mp4"),
    );
    const b = await readFile((await d.path())!);
    expect(b.length).toBeGreaterThan(500);
    if (slug !== "video-to-audio")
      expect(b.subarray(4, 8).toString()).toBe("ftyp");
  }
});
test("PDF merge, split, editor and compressor export valid page counts", async ({
  page,
}) => {
  for (const slug of [
    "pdf-merger",
    "pdf-splitter",
    "pdf-editor",
    "pdf-compressor",
  ]) {
    await page.goto("/tools/" + slug + "/");
    await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles(fixture("pdf"));
    await expect(
      page.getByRole("button", { name: "Page 2", exact: true }),
    ).toBeVisible();
    if (slug === "pdf-editor") {
      await page
        .getByRole("button", { name: "Duplicate", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Page 3", exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Export PDF", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /Download ·/ }),
    ).toBeVisible();
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download ·/ }).click();
    const d = await event;
    const pdf = await PDFDocument.load(await readFile((await d.path())!));
    expect(pdf.getPageCount()).toBe(slug === "pdf-editor" ? 3 : 2);
  }
});
test("PDF to Word exports actual editable text", async ({ page }) => {
  await page.goto("/tools/pdf-to-word/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles(fixture("pdf"));
  await page.getByRole("button", { name: "Convert document" }).click();
  await expect(page.getByRole("button", { name: /Download ·/ })).toBeVisible();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download ·/ }).click();
  const d = await event;
  const zip = await JSZip.loadAsync(await readFile((await d.path())!));
  expect(await zip.file("word/document.xml")!.async("string")).toContain(
    "BrandiQue conversion test",
  );
});
test("resume exports PDF and DOCX with text and reloads local draft", async ({
  page,
}) => {
  await page.goto("/tools/ats-resume-builder/");
  await page.getByLabel("Full name", { exact: true }).fill("Test Candidate");
  await page
    .getByLabel("Contact information", { exact: true })
    .fill("test@example.com");
  await page
    .getByLabel("Skills content", { exact: true })
    .fill("TypeScript, Python");
  for (const format of ["PDF", "DOCX"]) {
    const event = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export " + format, exact: true })
      .click();
    const d = await event;
    const b = await readFile((await d.path())!);
    if (format === "PDF")
      expect((await PDFDocument.load(b)).getPageCount()).toBe(1);
    else
      expect(
        await (
          await JSZip.loadAsync(b)
        )
          .file("word/document.xml")!
          .async("string"),
      ).toContain("Test Candidate");
  }
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Test Candidate",
  );
});
test("screenshot and image to PDF export valid outputs", async ({ page }) => {
  await page.goto("/tools/screenshot-editor/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles(fixture("png"));
  await page.getByRole("button", { name: "Export screenshot" }).click();
  await expect(page.getByRole("button", { name: /Download ·/ })).toBeVisible();
  await page.goto("/tools/image-to-pdf/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles(fixture("png"));
  await page.getByRole("button", { name: "Create PDF" }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download ·/ }).click();
  const d = await event;
  expect(
    (await PDFDocument.load(await readFile((await d.path())!))).getPageCount(),
  ).toBe(1);
});
test("age, conversions, utilities, sitemap and robots", async ({
  page,
  request,
}) => {
  await page.goto("/tools/age-calculator/");
  await page.getByLabel("Date of birth", { exact: true }).fill("2000-02-29");
  await expect(page.locator(".result-number")).toContainText("years");
  await page.goto("/tools/length-converter/");
  await page
    .getByRole("combobox", { name: "From", exact: true })
    .selectOption("Mile");
  await page
    .getByRole("combobox", { name: "To", exact: true })
    .selectOption("Meter");
  await expect(page.locator(".result-number")).toContainText("1,609.344");
  await page.goto("/tools/json-validator/");
  await page.getByLabel("Your input").fill("{bad");
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.locator(".app-card [role=alert]")).toBeVisible();
  await page.getByLabel("Your input").fill('{"ok":true}');
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.locator(".code-output")).toContainText("Valid JSON");
  expect((await request.get("/robots.txt")).status()).toBe(200);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const t of tools) expect(sitemap).toContain("/tools/" + t.slug + "/");
});

test("secondary utilities return correct values and real QR and ZIP output", async ({
  page,
}) => {
  const cases: [string, string, string, string][] = [
    ["json-formatter", '{"a":1}', "Format", '"a": 1'],
    ["base64-encoder-decoder", "Hello ✓", "Encode", "SGVsbG8g4pyT"],
    ["url-encoder-decoder", "hello world?", "Encode", "hello%20world%3F"],
    ["case-converter", "Hello There", "UPPERCASE", "HELLO THERE"],
    ["text-cleaner", "  hello   world \n\n", "Generate", "hello world"],
    ["color-converter", "#FBFF00", "Generate", "rgb(251, 255, 0)"],
    [
      "timestamp-converter",
      "0",
      "Timestamp to date",
      "1970-01-01T00:00:00.000Z",
    ],
  ];
  for (const [slug, input, action, expected] of cases) {
    await page.goto("/tools/" + slug + "/");
    await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
    await page.locator(".app-card textarea").fill(input);
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.locator(".code-output")).toContainText(expected);
  }
  await page.goto("/tools/password-generator/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  expect((await page.locator(".code-output").innerText()).length).toBe(20);
  await page.goto("/tools/word-counter/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page.getByLabel("Your input").fill("One two three");
  await expect(page.locator(".stat").first()).toContainText("3");
  await page.goto("/tools/qr-code-generator/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page.getByLabel("Your input").fill("https://www.brandique.in");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  const qr = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download ·/ }).click();
  expect(
    (await readFile((await (await qr).path())!)).subarray(1, 4).toString(),
  ).toBe("PNG");
  await page.goto("/tools/file-converter/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page
    .locator("input[type=file]")
    .setInputFiles([fixture("png"), fixture("pdf")]);
  const zipEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Create ZIP" }).click();
  const zip = await JSZip.loadAsync(
    await readFile((await (await zipEvent).path())!),
  );
  expect(Object.keys(zip.files).length).toBe(2);
});
test("financial calculators use actual formulas", async ({ page }) => {
  for (const [slug, result] of [
    ["percentage-calculator", "100"],
    ["discount-calculator", "900"],
    ["gst-calculator", "1,100"],
    ["emi-calculator", "87.915"],
  ]) {
    await page.goto("/tools/" + slug + "/");
    await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
    await expect(page.locator(".stats-grid")).toContainText(result);
  }
});
test("document converter supports CSV and plain-text paths", async ({
  page,
}) => {
  await page.goto("/tools/document-converter/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "data.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("name,score\nAlice,42"),
  });
  await page.getByRole("button", { name: "Convert document" }).click();
  await expect(page.locator(".code-output")).toContainText('"score": "42"');
  await page.locator("input[type=file]").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("A useful document"),
  });
  await page.getByLabel("Output format", { exact: true }).selectOption("docx");
  await page.getByRole("button", { name: "Convert document" }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download ·/ }).click();
  expect(
    await (
      await JSZip.loadAsync(await readFile((await (await event).path())!))
    )
      .file("word/document.xml")!
      .async("string"),
  ).toContain("A useful document");
});
test("interactive workspaces meet critical accessibility checks and reject invalid files", async ({
  page,
}) => {
  for (const slug of [
    "image-resizer",
    "video-resizer",
    "pdf-editor",
    "age-calculator",
    "ats-resume-builder",
    "unit-converter",
  ]) {
    await page.goto("/tools/" + slug + "/");
    await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
    if (slug === "image-resizer")
      await page.locator("input[type=file]").setInputFiles(fixture("png"));
    if (slug === "pdf-editor")
      await page
        .locator("input[type=file]")
        .first()
        .setInputFiles(fixture("pdf"));
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  }
  await page.goto("/tools/image-resizer/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator(".app-card [role=alert]")).toBeVisible();
  await expect(page.getByRole("button", { name: /Download ·/ })).toHaveCount(0);
  await page.goto("/tools/pdf-editor/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "bad.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not a pdf"),
    });
  await expect(page.locator(".app-card [role=alert]")).toContainText(
    "Could not read",
  );
});

test("video format alternatives and cancellation are real", async ({
  page,
}) => {
  for (const [slug, format] of [
    ["video-resizer", "webm"],
    ["video-to-audio", "wav"],
    ["video-to-audio", "ogg"],
  ]) {
    await page.goto("/tools/" + slug + "/");
    await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
    await page.locator("input[type=file]").setInputFiles(fixture("mp4"));
    await page
      .getByLabel("Output format", { exact: true })
      .selectOption(format);
    await page
      .getByRole("button", {
        name: slug === "video-resizer" ? "Convert video" : "Extract audio",
        exact: true,
      })
      .click();
    await expect(page.getByRole("status")).toContainText("Conversion complete");
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download ·/ }).click();
    const d = await event;
    await d.saveAs("test-results/alternative." + format);
    const b = await readFile((await d.path())!);
    expect(b.length).toBeGreaterThan(500);
    expect(
      format === "webm"
        ? b.subarray(0, 4).toString("hex")
        : b.subarray(0, 4).toString(),
    ).toBe(format === "webm" ? "1a45dfa3" : format === "wav" ? "RIFF" : "OggS");
  }
  await page.goto("/tools/video-resizer/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles(fixture("mp4"));
  await page
    .getByRole("button", { name: "Convert video", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel processing", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cancelled");
  await expect(page.getByRole("button", { name: /Download ·/ })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Convert video", exact: true }),
  ).toBeEnabled();
});
test("PDF annotation and screenshot cropping change exported content", async ({
  page,
}) => {
  await page.goto("/tools/pdf-editor/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page.locator("input[type=file]").first().setInputFiles(fixture("pdf"));
  await expect(
    page.getByRole("button", { name: "Page 2", exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute("width", "400");
  await page.getByLabel("Text", { exact: true }).fill("Added annotation");
  await page.locator("canvas").click({ position: { x: 70, y: 100 } });
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download ·/ }).click();
  const pdf = await PDFDocument.load(
    await readFile((await (await event).path())!),
  );
  expect(pdf.getPageCount()).toBe(2);
  expect(pdf.getPage(0).node.Resources()?.toString()).toContain("Image");
  await page.goto("/tools/screenshot-editor/");
  await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles(fixture("png"));
  await page.getByLabel("Tool", { exact: true }).selectOption("crop");
  const rect = await page.locator("canvas").boundingBox();
  expect(rect).not.toBeNull();
  await page.mouse.move(rect!.x + 10, rect!.y + 10);
  await page.mouse.down();
  await page.mouse.move(rect!.x + 110, rect!.y + 60);
  await page.mouse.up();
  await expect(page.getByLabel("Width", { exact: true })).toHaveValue("100");
  await expect(page.getByLabel("Height", { exact: true })).toHaveValue("50");
});
