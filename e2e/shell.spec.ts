import { expect, test, type Page } from "@playwright/test";

const isMobile = (projectName: string) => projectName.endsWith("-375");

async function openHome(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Erayah, home" }).first()).toBeVisible();
}

test.describe("site shell", () => {
  test("announcement bar, header and search", async ({ page }, testInfo) => {
    await openHome(page);
    await expect(page.getByText("Jadau, Reimagined · Free shipping above ₹6,000 · Delivered in 7–10 days")).toBeVisible();

    if (!isMobile(testInfo.project.name)) {
      const nav = page.getByRole("navigation", { name: "Main" });
      for (const label of ["Shop", "About", "Contact", "FAQs"]) {
        await expect(nav.getByText(label, { exact: true })).toBeVisible();
      }
      await expect(page.getByRole("link", { name: "Wishlist" })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Cart" })).toBeVisible();

    const search = page.getByRole("combobox", { name: "Search jewellery" }).locator("visible=true");
    await expect(search).toHaveCount(1);
    await search.fill("jhumka");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=jhumka/);
  });

  test("desktop mega-menu opens on hover and closes on Escape", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    await openHome(page);

    const shop = page.getByRole("button", { name: "Shop" });
    await expect(shop).toHaveAttribute("aria-expanded", "false");
    await shop.hover();
    await expect(shop).toHaveAttribute("aria-expanded", "true");
    const nav = page.getByRole("navigation", { name: "Main" });
    for (const heading of ["Earrings", "Necklace Set", "More to Shop", "Discover"]) {
      await expect(nav.getByRole("heading", { name: heading })).toBeVisible();
    }
    await expect(nav.getByRole("heading", { name: "Shop by Style" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Studs" })).toHaveAttribute("href", "/shop/earrings?style=studs");
    await expect(nav.getByRole("link", { name: "Chokers" })).toHaveAttribute("href", "/shop/necklace-sets?style=choker");
    await expect(nav.getByRole("link", { name: "Most Loved" })).toHaveAttribute("href", "/shop/most-loved");

    await page.keyboard.press("Escape");
    await expect(shop).toHaveAttribute("aria-expanded", "false");
  });

  test("mobile menu drawer", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "mobile only");
    await openHome(page);

    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    for (const label of ["New Arrivals", "Most Loved", "Gifts for Her (Under ₹3K)", "Rings", "Pendants", "About Erayah", "Contact", "FAQs"]) {
      await expect(menu.getByRole("link", { name: label })).toBeVisible();
    }
    await menu.getByText("Earrings", { exact: true }).click();
    await expect(menu.getByRole("link", { name: "Jhumkas" })).toBeVisible();
    await menu.getByText("Necklace Set", { exact: true }).click();
    await expect(menu.getByRole("link", { name: "Chokers" })).toBeVisible();
    await expect(menu.getByText("Style", { exact: true })).toHaveCount(0);
    await expect(menu.getByText(/track/i)).toHaveCount(0);
    await expect(menu.getByText(/account|log ?in|sign ?in/i)).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  test("cart drawer opens and closes", async ({ page }) => {
    await openHome(page);
    await page.getByRole("button", { name: "Cart" }).click();
    const cart = page.getByRole("dialog", { name: /My cart/ });
    await expect(cart).toBeVisible();
    await expect(cart.getByText("Your cart is empty")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(cart).toBeHidden();
  });

  test("floating WhatsApp button and footer", async ({ page }, testInfo) => {
    await openHome(page);

    const whatsapp = page.getByRole("link", { name: "Chat with Erayah on WhatsApp" }).last();
    await expect(whatsapp).toBeVisible();
    await expect(whatsapp).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=Hi%20Erayah/);
    const box = await whatsapp.boundingBox();
    expect(box?.width).toBe(52);

    const footer = page.getByRole("contentinfo");
    for (const group of ["Help", "Erayah", "Follow"]) {
      await expect(footer.getByRole("navigation", { name: group })).toBeAttached();
    }
    // The Shop column is for desktop only.
    await expect(footer.getByRole("navigation", { name: "Shop" })).toHaveCount(isMobile(testInfo.project.name) ? 0 : 1);
    await expect(footer.getByRole("link", { name: "Shipping & Returns" })).toBeAttached();
    await expect(footer.getByText(/track order/i)).toHaveCount(0);
    await expect(footer.getByText(/my account/i)).toHaveCount(0);
    await expect(footer.getByText(/© \d{4} Erayah/)).toBeAttached();
  });

  test("styleguide renders and is not indexed", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.getByRole("heading", { level: 1, name: "Styleguide" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
