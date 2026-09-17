import { test, expect } from "@playwright/test";

test("image presets produce exact boxes and changing settings clears stale downloads", async ({
  page,
}) => {
  await page.goto("/tools/image-resizer/");
  await expect(page.locator("input[type=file]")).toBeEnabled();
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/sample.png");
  await page.getByLabel("Height (px)", { exact: true }).fill("50");
  await expect(page.getByLabel("Width (px)", { exact: true })).toHaveValue(
    "100",
  );
  await page.getByLabel("Preset", { exact: true }).selectOption("1080x1080");
  await expect(page.getByLabel("Height (px)", { exact: true })).toHaveValue(
    "1080",
  );
  await expect(
    page.getByLabel("Lock each image’s aspect ratio", { exact: false }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Resize images", exact: true })
    .click();
  const link = page.getByRole("link", { name: /Download ·/ });
  await expect(link).toHaveAttribute("download", "sample.webp");
  await expect(link).toHaveAttribute("href", /^blob:/);
  const download = page.waitForEvent("download");
  await link.click();
  expect((await download).suggestedFilename()).toBe("sample.webp");
  await page.getByLabel("Width (px)", { exact: true }).fill("500");
  await expect(link).toHaveCount(0);
});

test("color, percentage and tiny unit results are usable", async ({ page }) => {
  await page.goto("/tools/color-converter/");
  await page.getByLabel("Color (HEX, RGB or HSL)").fill("rgb(251, 255, 0)");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.locator(".code-output")).toContainText("#FBFF00");
  await page.goto("/tools/percentage-calculator/");
  await page.getByLabel("Calculation mode").selectOption("change");
  await page.getByLabel("Original value").fill("80");
  await page.getByLabel("New value").fill("100");
  await expect(
    page.locator(".stat").filter({ hasText: "Percentage change" }),
  ).toContainText("25");
  await page.goto("/tools/area-converter/");
  await page
    .getByLabel("From", { exact: true })
    .selectOption("Square millimeter");
  await page.getByLabel("To", { exact: true }).selectOption("Square kilometer");
  await expect(page.locator(".result-number")).toContainText("0.000000000001");
});

test("document reset clears the file and output", async ({ page }) => {
  await page.goto("/tools/pdf-to-word/");
  await expect(page.locator("input[type=file]")).toBeEnabled();
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/sample.pdf");
  await page
    .getByRole("button", { name: "Convert document", exact: true })
    .click();
  await expect(page.getByRole("link", { name: /Download ·/ })).toBeVisible();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("link", { name: /Download ·/ })).toHaveCount(0);
  await expect(page.getByText("Selected: sample.pdf")).toHaveCount(0);
});
