import { test, expect } from "@playwright/test";

test("missing application scripts cannot leave an endless workspace message", async ({
  page,
}) => {
  await page.route("**/_next/static/**/*.js*", (route) => route.abort());
  await page.goto("/tools/image-resizer/");
  await expect(
    page.getByRole("button", { name: "Choose files", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".tool-controls")).toHaveAttribute("disabled", "");
  await expect(
    page.getByRole("button", { name: "Choose files", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(/The controls have not connected yet/),
  ).toBeVisible({ timeout: 18000 });
  await expect(
    page.getByRole("link", { name: "Reload this tool", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Starting your tool…", { exact: true }),
  ).not.toBeVisible();
});

test("JavaScript disabled shows an honest explanation and recovery without running scripts", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/tools/image-resizer/");
  await expect(page.getByText(/JavaScript is disabled/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose files", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/The controls have not connected yet/),
  ).toBeVisible({ timeout: 18000 });
  await context.close();
});

test("tool navigation starts real controls and produces no hydration or chunk errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/tools/");
  for (const slug of [
    "image-resizer",
    "pdf-editor",
    "video-resizer",
    "age-calculator",
    "ats-resume-builder",
    "json-formatter",
  ]) {
    await page.locator(`.tool-card[href="/tools/${slug}/"]`).click();
    await expect(page.locator("[data-tool-ready=true]")).toBeVisible();
    await expect(
      page.locator(".app-card input, .app-card textarea").first(),
    ).toBeAttached();
    await expect(
      page.getByText("Starting your tool…", { exact: true }),
    ).toHaveCount(0);
    await page
      .locator(".breadcrumb")
      .getByRole("link", { name: "Tools", exact: true })
      .click();
  }
  expect(errors).toEqual([]);
});

test("all 39 tool pages include real controls before JavaScript executes", async ({
  browser,
}) => {
  const { tools } = await import("../../lib/registry");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const tool of tools) {
    await page.goto(`http://127.0.0.1:3000/tools/${tool.slug}/`);
    await expect(page.locator(".tool-controls")).toBeVisible();
    await expect(
      page
        .locator(
          ".tool-controls input, .tool-controls textarea, .tool-controls select",
        )
        .first(),
    ).toBeAttached();
    await expect(
      page.getByText(/Opening your workspace|Starting your tool/),
    ).toHaveCount(0);
  }
  await context.close();
});
