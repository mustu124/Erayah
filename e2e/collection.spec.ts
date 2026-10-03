import { expect, test, type Page } from "@playwright/test";

const isMobile = (projectName: string) => projectName.endsWith("-375");

const cards = (page: Page) => page.locator("main article");

/** Navigates and waits until the page is interactive (hydrated). */
async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}
const countText = (page: Page) => page.getByText(/^\d+ pieces?$/);

/** Opens the filters: the rail on desktop, the drawer on mobile. */
async function filters(page: Page, mobile: boolean) {
  if (!mobile) return page.getByRole("complementary", { name: "Filters" });
  await page.getByRole("button", { name: /^Filters/ }).click();
  const drawer = page.getByRole("dialog", { name: "Filters" });
  await expect(drawer).toBeVisible();
  return drawer;
}

test.describe("collection pages", () => {
  test("category page: title, 24 per page, numbered pagination", async ({ page }) => {
    await open(page, "/shop/earrings");
    await expect(page.getByRole("heading", { level: 1, name: "Earrings" })).toBeVisible();
    await expect(countText(page)).toHaveText("25 pieces");
    await expect(cards(page)).toHaveCount(24);

    const pagination = page.getByRole("navigation", { name: "Pagination" });
    await expect(pagination.getByRole("link", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    await pagination.getByRole("link", { name: "Page 2" }).click();
    await expect(page).toHaveURL(/\/shop\/earrings\?page=2$/);
    await expect(cards(page)).toHaveCount(1);
  });

  test("lifestyle tiles only in curated order with no filters", async ({ page }, testInfo) => {
    await page.goto("/shop/earrings");
    const visible = page.locator("[data-lifestyle-tile]:visible");
    await expect(visible).toHaveCount(isMobile(testInfo.project.name) ? 2 : 1);

    await page.goto("/shop/earrings?sort=price-asc");
    await expect(page.locator("[data-lifestyle-tile]")).toHaveCount(0);
    await page.goto("/shop/earrings?colour=white");
    await expect(page.locator("[data-lifestyle-tile]")).toHaveCount(0);
  });

  test("filters update the URL, show chips and clear", async ({ page }, testInfo) => {
    const mobile = isMobile(testInfo.project.name);
    await open(page, "/shop/earrings");
    const panel = await filters(page, mobile);
    await panel.getByRole("button", { name: "Green", exact: true }).click();
    await expect(page).toHaveURL(/\/shop\/earrings\?colour=green$/);
    if (mobile) {
      await expect(panel.getByRole("button", { name: /^Show \d+ pieces?$/ })).toBeEnabled();
      await panel.getByRole("button", { name: /^Show \d+ pieces?$/ }).click();
    }
    await expect(countText(page)).not.toHaveText("25 pieces");
    const greenCount = Number((await countText(page).textContent())?.split(" ")[0]);
    await expect(cards(page)).toHaveCount(greenCount);

    await expect(page.getByRole("button", { name: "Remove filter: Green" })).toBeVisible();
    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page).toHaveURL(/\/shop\/earrings$/);
    await expect(countText(page)).toHaveText("25 pieces");

    // The back button returns to the filtered view.
    await page.goBack();
    await expect(page).toHaveURL(/colour=green/);
  });

  test("sorting by price", async ({ page }, testInfo) => {
    await open(page, "/shop/pendants");
    const select = page.getByRole("combobox", { name: "Sort by" }).locator("visible=true");
    if (isMobile(testInfo.project.name)) {
      await page.locator("select[aria-label='Sort by']").first().selectOption("price-asc");
    } else {
      await select.selectOption("price-asc");
    }
    await expect(page).toHaveURL(/sort=price-asc/);
    const prices = await cards(page)
      .locator("span.tabular-nums")
      .allTextContents()
      .then((all) => all.map((t) => Number(t.replace(/[^\d]/g, ""))));
    expect(prices.length).toBeGreaterThan(5);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  test("coming soon and no-results states", async ({ page }) => {
    await page.goto("/shop/bracelets");
    await expect(page.getByText("Bracelets are being handcrafted.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Shop Earrings" })).toHaveAttribute("href", "/shop/earrings");
    await expect(page.getByRole("link", { name: "Shop Rings" })).toHaveAttribute("href", "/shop/rings");

    await open(page, "/shop/rings?colour=turquoise");
    await expect(page.getByText("No pieces match these filters")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/shop\/rings$/);
    await expect(cards(page).first()).toBeVisible();
  });

  test("curated lists and style pages", async ({ page }) => {
    await page.goto("/shop/new-arrivals");
    await expect(page.getByRole("heading", { level: 1, name: "New Arrivals" })).toBeVisible();
    await expect(cards(page)).toHaveCount(13);

    await page.goto("/shop/style/jhumkas-chaandbaalis");
    await expect(page.getByRole("heading", { level: 1, name: "Jhumkas & Chaandbaalis" })).toBeVisible();
    await expect(countText(page)).toHaveText("4 pieces");

    await page.goto("/shop");
    await expect(page.getByRole("heading", { level: 1, name: "Shop All" })).toBeVisible();
    await expect(cards(page)).toHaveCount(24);
  });

  test("SEO: title, description, canonical without filters, breadcrumb JSON-LD", async ({ page }) => {
    await page.goto("/shop/earrings?colour=green&sort=price-asc");
    await expect(page).toHaveTitle("Earrings · Erayah");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Earrings by Erayah/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/shop\/earrings$/);
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement.map((i: { name: string }) => i.name)).toEqual(["Home", "Shop", "Earrings"]);
  });

  test("back from a product returns to the same page, filters and scroll position", async ({ page }) => {
    const url = "/shop/earrings?colour=white&page=1";
    await open(page, url);
    await expect(cards(page).first()).toBeVisible();
    const startUrl = page.url();

    await page.evaluate(() => window.scrollTo(0, 1400));
    await page.waitForTimeout(300);
    const saved = await page.evaluate(() => window.scrollY);
    expect(saved).toBeGreaterThan(1000);

    // Open a product that's on screen.
    const target = cards(page).filter({ visible: true });
    const index = await target.evaluateAll((els) =>
      els.findIndex((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      }),
    );
    await target.nth(Math.max(0, index)).getByRole("link").first().click();
    await expect(page).toHaveURL(/\/products\//);

    await page.goBack();
    await expect(page).toHaveURL(startUrl);
    await expect(cards(page).first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 }).toBeGreaterThan(saved - 60);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - saved)).toBeLessThan(60);
  });
});
