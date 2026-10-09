import { expect, test, type Page } from "@playwright/test";

const isMobile = (projectName: string) => projectName.endsWith("-375");

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.locator("html[data-hydrated]").waitFor();
}

test.describe("product page", () => {
  test("details, price, accordions and structured data", async ({ page }) => {
    await open(page, "/product/meher-earrings");
    await expect(page).toHaveTitle("Meher Earrings · Erayah");
    await expect(page.getByRole("heading", { level: 1, name: "Meher Earrings" })).toBeVisible();
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Earrings" })).toHaveAttribute("href", "/shop/earrings");
    await expect(page.getByText("₹8,500").first()).toBeVisible();
    await expect(page.getByText("Inclusive of all taxes")).toBeVisible();
    await expect(page.getByText("In stock", { exact: true })).toBeVisible();
    await expect(page.getByText("Delivery in 7–10 working days").first()).toBeVisible();

    // Description open, the rest closed.
    await expect(page.locator("details", { hasText: "Description" })).toHaveAttribute("open", "");
    for (const title of ["Material & Craft", "Care Instructions", "Shipping & Returns"]) {
      await expect(page.locator("details", { has: page.getByText(title, { exact: true }) })).not.toHaveAttribute("open", "");
    }

    const product = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents()
      .then((all) => all.map((t) => JSON.parse(t)).find((d) => d["@type"] === "Product"));
    expect(product.name).toBe("Meher Earrings");
    expect(product.brand.name).toBe("Erayah");
    expect(product.offers).toMatchObject({ priceCurrency: "INR", price: "8500.00", availability: "https://schema.org/InStock" });
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
    await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute("content", "image/jpeg");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/product\/meher-earrings$/);
  });

  test("quantity, add to cart opens the drawer, wishlist", async ({ page }) => {
    await open(page, "/product/dahlia-earrings");
    await page.getByRole("button", { name: "Increase quantity" }).first().click();
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    const cart = page.getByRole("dialog", { name: /My cart/ });
    await expect(cart).toBeVisible();
    // The drawer lists the piece, lets the shopper change the quantity or remove it, and leads to checkout.
    await expect(cart.getByRole("link", { name: "Dahlia Earrings" })).toBeVisible();
    const quantity = cart.getByRole("group", { name: "Quantity of Dahlia Earrings" });
    await expect(quantity).toContainText("2");
    await quantity.getByRole("button", { name: "Decrease quantity" }).click();
    await expect(quantity).toContainText("1");
    await expect(cart.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");
    await cart.getByRole("button", { name: "Remove Dahlia Earrings from cart" }).click();
    await expect(cart.getByText("Your cart is empty")).toBeVisible();
    await page.keyboard.press("Escape");

    const heart = page.getByRole("button", { name: "Save Dahlia Earrings to wishlist" }).first();
    await heart.click();
    await expect(page.getByRole("button", { name: "Remove Dahlia Earrings from wishlist" }).first()).toHaveAttribute("aria-pressed", "true");
  });

  test("gallery opens a full-screen viewer", async ({ page }) => {
    await open(page, "/product/harakh-earrings-white");
    await expect(page.getByRole("tablist", { name: "Product images" }).getByRole("tab")).toHaveCount(2);
    await page.getByRole("button", { name: /View image 1 of 2 full screen/ }).click();
    const viewer = page.getByRole("dialog", { name: /image viewer/ });
    await expect(viewer).toBeVisible();
    await expect(viewer.getByText("1 / 2")).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByText("2 / 2")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
  });

  test("pincode check shows charge and estimate", async ({ page }) => {
    await open(page, "/product/meher-earrings");
    await page.getByRole("button", { name: "Check delivery to your pincode" }).click();
    await page.getByLabel("Pincode").fill("400001");
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(page.getByText("Free shipping to 400001 · delivered in 7–10 working days")).toBeVisible();
  });

  test("mobile sticky add-to-cart bar", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "mobile only");
    await open(page, "/product/meher-earrings");
    const bar = page.locator("div.fixed.bottom-0", { hasText: "Add to cart" });
    await expect(bar).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(bar).toBeVisible();
    await expect(bar.getByText("Meher Earrings")).toBeVisible();
  });

  test("complete the look, recently viewed and WhatsApp message", async ({ page }) => {
    await open(page, "/product/dahlia-earrings");
    // The visit is recorded once the product block hydrates.
    await page.waitForFunction(() => localStorage.getItem("erayah-recently-viewed")?.includes("dahlia-earrings"));
    await open(page, "/product/meher-earrings");

    const look = page.locator("section[aria-labelledby=complete-the-look]");
    expect(await look.locator("article").count()).toBeGreaterThanOrEqual(3);

    const recent = page.locator("section[aria-labelledby=recently-viewed]");
    await expect(recent.getByText("Dahlia Earrings")).toBeVisible({ timeout: 10_000 });
    await expect(recent.getByText("Meher Earrings")).toHaveCount(0);

    const whatsapp = page.getByRole("link", { name: "Ask Erayah about the Meher Earrings on WhatsApp" });
    await expect(whatsapp).toHaveAttribute(
      "href",
      /text=Hi%20Erayah%2C%20I'm%20interested%20in%20the%20Meher%20Earrings%20\(.+%2Fproduct%2Fmeher-earrings\)\./,
    );
  });

  test("unknown product is a 404", async ({ page }) => {
    const response = await page.goto("/product/not-a-real-piece");
    expect(response?.status()).toBe(404);
  });
});
