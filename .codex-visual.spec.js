const { test } = require("@playwright/test");

test("project screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });

  for (const [name, scrollY] of [
    ["projects-start", 1450],
    ["projects-mid", 2050],
    ["projects-late", 2850],
  ]) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `.codex-${name}.png`, fullPage: false });
  }
});
