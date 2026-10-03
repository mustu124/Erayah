import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home page loads", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      // Links to pages that aren't built yet are prefetched and 404; ignore those.
      if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) {
        errors.push(message.text());
      }
    });

    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle("Erayah — Heirlooms, Reimagined");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    // Brand fonts and colours are applied.
    const section = page.getByRole("heading", { name: "Shop by Category" });
    await expect(section).toHaveCSS("font-family", /STIX Two Text/);
    await expect(section).toHaveCSS("color", "rgb(49, 24, 41)"); // --color-ink
    await expect(page.locator("body")).toHaveCSS("font-family", /Montserrat/);

    // No horizontal scroll at any width.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Elephant favicon is linked.
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /icon/);

    expect(errors).toEqual([]);

    await testInfo.attach("home", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});
