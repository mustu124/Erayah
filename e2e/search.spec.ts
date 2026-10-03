import { expect, test, type Page } from "@playwright/test";

const isMobile = (projectName: string) => projectName.endsWith("-375");
const searchBox = (page: Page, mobile: boolean) => page.locator(mobile ? "#search-mobile" : "#search-desktop");
// Visible only: Next keeps the previous page mounted but hidden for instant back navigation.
const cards = (page: Page) => page.locator("main article").locator("visible=true");

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.locator("html[data-hydrated]").waitFor();
}

/** Search results stream in after the query runs; allow for a cold cache. */
const SLOW = { timeout: 20_000 };

test.describe("search", () => {
  test("quick chips on focus, Esc closes", async ({ page }, testInfo) => {
    const mobile = isMobile(testInfo.project.name);
    await open(page, "/");
    const box = searchBox(page, mobile);
    await box.click();
    await expect(box).toHaveAttribute("aria-expanded", "true");
    const popular = page.getByRole("listbox", { name: "Popular searches" }).locator("visible=true");
    for (const chip of ["Studs", "Jhumkas", "Pearl", "Minimal", "Polki", "Necklace Sets"]) {
      await expect(popular.getByRole("option", { name: chip })).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(box).toHaveAttribute("aria-expanded", "false");
  });

  test("instant results, keyboard navigation", async ({ page }, testInfo) => {
    const mobile = isMobile(testInfo.project.name);
    await open(page, "/");
    const box = searchBox(page, mobile);
    await box.fill("jhum");
    const list = page.getByRole("listbox", { name: "Search suggestions" }).locator("visible=true");
    await expect(list.getByRole("option", { name: /Dahlia Earrings/ })).toBeVisible(SLOW);
    await expect(list.getByRole("option", { name: "Jhumkas", exact: true })).toBeVisible();

    await box.press("ArrowDown");
    await expect(box).toHaveAttribute("aria-activedescendant", /.+/);
    await box.press("Enter");
    await expect(page).toHaveURL(/\/products\/(dahlia|rani)-earrings$/);
  });

  test("Enter opens /search with filters, sort and relevance", async ({ page }, testInfo) => {
    const mobile = isMobile(testInfo.project.name);
    await open(page, "/");
    const box = searchBox(page, mobile);
    await box.fill("gaja");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=gaja$/);
    await expect(page.getByRole("heading", { level: 1, name: "“gaja”" })).toBeVisible(SLOW);
    await expect(cards(page)).toHaveCount(3, SLOW);
    await expect(page.locator("[data-lifestyle-tile]")).toHaveCount(0);
    await expect(page.locator("select[aria-label='Sort by']").first()).toHaveValue("curated");
    await expect(page.locator("select[aria-label='Sort by'] option[value=curated]").first()).toHaveText("Relevance");
  });

  test("synonyms and accents", async ({ page }) => {
    for (const [q, expected] of [
      ["elephant", /Gaj/],
      ["Pākhi", /Pākhi Pendant/],
      ["chandbali", /Meher Earrings/],
      ["jumka", /Dahlia Earrings/],
      ["lotus", /Padma Pendant/],
    ] as const) {
      await open(page, `/search?q=${encodeURIComponent(q)}`);
      await expect(cards(page).filter({ hasText: expected }).first()).toBeVisible(SLOW);
    }
  });

  test("filters keep the query in the URL", async ({ page }, testInfo) => {
    await open(page, "/search?q=pendant");
    await expect(cards(page).first()).toBeVisible(SLOW);
    if (isMobile(testInfo.project.name)) {
      await page.getByRole("button", { name: /^Filters/ }).click();
      await page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: "Turquoise", exact: true }).click();
    } else {
      await page.getByRole("complementary", { name: "Filters" }).getByRole("button", { name: "Turquoise", exact: true }).click();
    }
    await expect(page).toHaveURL(/\/search\?q=pendant&colour=turquoise$/, SLOW);
  });

  test("no results", async ({ page }) => {
    await open(page, "/search?q=xyzzyq");
    await expect(page.getByText("We couldn’t find that piece")).toBeVisible(SLOW);
    await expect(page.getByRole("link", { name: "Necklace Sets", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Best Sellers" })).toBeVisible();
  });
});
