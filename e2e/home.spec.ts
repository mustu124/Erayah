import { expect, test } from "@playwright/test";

const isMobile = (projectName: string) => projectName.endsWith("-375");

test.describe("homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has exactly the five sections, in order", async ({ page }) => {
    const sections = page.locator("main > section");
    await expect(sections).toHaveCount(5);
    await expect(sections.nth(0)).toHaveAttribute("aria-label", "Featured pieces");
    await expect(sections.nth(1)).toHaveAttribute("aria-labelledby", "shop-by-category");
    await expect(sections.nth(2)).toHaveAttribute("aria-labelledby", "new-arrivals");
    await expect(sections.nth(3)).toHaveAttribute("aria-labelledby", "best-sellers");
    await expect(sections.nth(4)).toHaveAttribute("aria-labelledby", "brand-story");
  });

  test("shop by category: five categories plus Shop All", async ({ page }) => {
    const grid = page.locator("section[aria-labelledby=shop-by-category] li");
    await expect(grid).toHaveCount(6);
    await expect(grid.nth(3)).toContainText("Bracelets");
    await expect(grid.nth(3)).toContainText("Coming soon");
    await expect(grid.nth(3).getByRole("link")).toHaveAttribute("href", "/shop/bracelets");
    await expect(grid.nth(5).getByRole("link")).toHaveAttribute("href", "/shop");
  });

  test("new arrivals and best sellers carousels", async ({ page }) => {
    const newArrivals = page.locator("section[aria-labelledby=new-arrivals]");
    await expect(newArrivals.getByRole("heading", { name: "New Arrivals" })).toBeVisible();
    await expect(newArrivals.getByText(/^[A-Z][a-z]+ \d{4}$/)).toBeAttached(); // month label
    await expect(newArrivals.getByRole("link", { name: "Shop All New Arrivals" })).toHaveAttribute("href", "/shop/new-arrivals");
    await expect(newArrivals.locator("article")).toHaveCount(13);

    const bestSellers = page.locator("section[aria-labelledby=best-sellers]");
    await expect(bestSellers.getByRole("link", { name: "Shop All Best Sellers" })).toHaveAttribute("href", "/shop/best-sellers");

    // A card shows only image, name and price (plus the heart).
    const card = bestSellers.locator("article").first();
    await expect(card.getByRole("heading", { name: "Meher Earrings" })).toBeVisible();
    await expect(card.getByText("₹8,500")).toBeVisible();
    await expect(card.getByRole("heading")).toHaveCSS("font-family", /Montserrat/);
    await expect(card.getByRole("link").first()).toHaveAttribute("href", "/products/meher-earrings");
  });

  test("hero arrows and counter (desktop)", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    const hero = page.getByRole("region", { name: "Featured pieces" });
    await expect(hero.getByText("01/05")).toBeVisible();
    await hero.getByRole("button", { name: "Next slide" }).click();
    await expect(hero.getByText("02/05")).toBeVisible();
    await hero.getByRole("button", { name: "Previous slide" }).click();
    await hero.getByRole("button", { name: "Previous slide" }).click();
    await expect(hero.getByText("05/05")).toBeVisible();
  });

  test("wishlist heart updates the header count", async ({ page }, testInfo) => {
    const card = page.locator("article", { has: page.getByRole("heading", { name: "Meher Earrings" }) }).first();
    // Centre the card so the floating WhatsApp button can't cover the heart.
    await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await card.hover(); // the heart appears on hover on desktop
    await card.getByRole("button", { name: "Save Meher Earrings to wishlist" }).click();
    await expect(page.getByRole("button", { name: "Remove Meher Earrings from wishlist" }).first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    if (!isMobile(testInfo.project.name)) {
      await expect(page.getByRole("link", { name: "Wishlist, 1 saved" })).toBeVisible();
    }
  });

  test("real photography, light images, no layout shift", async ({ page }) => {
    const served: { url: string; bytes: number }[] = [];
    page.on("response", async (response) => {
      if (response.url().includes("/_next/image")) {
        served.push({ url: response.url(), bytes: (await response.body().catch(() => Buffer.alloc(0))).length });
      }
    });
    await page.goto("/");

    // Hero, category tiles and cards come from the imported photographs.
    const hero = page.getByRole("region", { name: "Featured pieces" });
    await expect(hero.locator("img").first()).toHaveAttribute("src", /site-media%2Fhero%2Fimport-/);
    const tiles = page.locator("section[aria-labelledby=shop-by-category] img");
    await expect(tiles).toHaveCount(4); // Bracelets and Shop All have no photo
    for (const src of await tiles.evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))) {
      expect(src).toContain("site-media%2Fcategories%2F");
    }
    const cardImages = page.locator("main article img");
    for (const src of await cardImages.evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))) {
      expect(src).toContain("product-images%2Fproducts%2F");
    }
    await expect(page.locator('main img[src*="placeholders"]')).toHaveCount(0);

    // Scroll through so lazy images load, then check what was served.
    for (let y = 0; y < 8; y++) {
      await page.evaluate(() => window.scrollBy(0, 700));
      await page.waitForTimeout(150);
    }
    await page.waitForLoadState("networkidle");
    expect(served.length).toBeGreaterThan(5);
    for (const image of served) expect(image.bytes, image.url).toBeLessThan(300 * 1024);

    const shift = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
              if (!entry.hadRecentInput) total += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
          setTimeout(() => resolve(total), 300);
        }),
    );
    expect(shift).toBeLessThan(0.1);
  });

  test("brand story", async ({ page }) => {
    const story = page.locator("section[aria-labelledby=brand-story]");
    await expect(story.getByText("Heirlooms, reimagined")).toHaveCSS("font-style", "italic");
    await expect(story.getByRole("link", { name: "Our Story" })).toHaveAttribute("href", "/about");
    await expect(story.getByRole("link", { name: "Follow us on Instagram" })).toBeVisible();
  });
});
