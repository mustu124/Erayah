import { expect, test, type Page } from "@playwright/test";

import { createTestUser, deleteTestUser, signIn, type TestUser } from "./support/admin";
import { db } from "./support/checkout";

async function open(page: Page, url: string) {
  const response = await page.goto(url);
  await page.locator("html[data-hydrated]").waitFor();
  return response;
}

test.describe("content pages", () => {
  test("About: opening line, story blocks, craft, and the way out", async ({ page }) => {
    await open(page, "/about");
    await expect(page).toHaveTitle(/About Erayah/);
    await expect(page.getByRole("heading", { level: 1, name: "Heirlooms, reimagined." })).toBeVisible();
    for (const title of ["Fortune's favourite", "Why the elephant", "Made to be handed down", "Our founder"]) {
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    }
    await expect(page.getByText("Erayah was born from that feeling.", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "The craft" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Follow", exact: true })).toHaveAttribute("href", /instagram\.com/);
    await expect(page.getByRole("link", { name: "Shop the collection" })).toHaveAttribute("href", "/shop");
  });

  test("Contact: WhatsApp first, details, and a form that checks itself", async ({ page }) => {
    await open(page, "/contact");
    await expect(page.getByRole("heading", { level: 1, name: "We're here to help." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Message us on WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=/);
    await expect(page.getByText("India time")).toBeVisible();
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Please tell us your name.")).toBeVisible();
    await expect(page.getByText("Please give an email or phone number so we can reply.")).toBeVisible();
    await page.getByLabel("Email or phone").fill("12345");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Please enter a 10-digit mobile number or an email.")).toBeVisible();
  });

  test("FAQs: grouped accordions in order, with FAQPage structured data", async ({ page }) => {
    await open(page, "/faqs");
    const groups = await page.locator("main section h2").allTextContents();
    expect(groups.slice(0, 6)).toEqual(["Orders & Payment", "Shipping", "Returns", "Care", "Gifting", "Sizing"]);
    const question = page.getByText("How long does delivery take?");
    await question.click();
    await expect(page.getByText("Orders are delivered within 7–10 working days.")).toBeVisible();

    const faq = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents()
      .then((all) => all.map((t) => JSON.parse(t)).find((d) => d["@type"] === "FAQPage"));
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(10);
    expect(faq.mainEntity[0]).toMatchObject({ "@type": "Question", acceptedAnswer: { "@type": "Answer" } });
  });

  test("Policy pages render their markdown", async ({ page }) => {
    for (const [url, title, text] of [
      ["/shipping-returns", "Shipping & Returns", "credit note is issued as a gift card"],
      ["/privacy-policy", "Privacy Policy", "Digital Personal Data Protection Act"],
      ["/terms", "Terms & Conditions", "Razorpay"],
    ]) {
      await open(page, url);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.locator(".prose-erayah").getByText(text).first()).toBeVisible();
    }
  });

  test("an unknown address shows the 404 with search and Most Loved", async ({ page }) => {
    const response = await open(page, "/this-piece-is-missing");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This piece seems to have wandered off." })).toBeVisible();
    await expect(page.getByRole("combobox").filter({ visible: true }).last()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Most Loved" })).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });
});

test.describe("content, with writes", () => {
  test.skip(!process.env.E2E_ADMIN, "set E2E_ADMIN=1 (sends a contact message and adds testimonials)");
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({}, info) => test.skip(info.project.name !== "chromium-1280", "one project (rate limit per sender)"));

  const marker = `E2E Visitor ${Date.now().toString(36)}`;
  let owner: TestUser;

  test.beforeAll(async ({}, info) => {
    if (info.project.name === "chromium-1280") owner = await createTestUser("owner");
  });
  test.afterAll(async ({}, info) => {
    // afterAll also runs in workers whose tests were skipped; only the writing project cleans up.
    if (info.project.name !== "chromium-1280") return;
    await db.from("contact_messages").delete().like("name", "E2E Visitor%");
    // Safety net if a run stopped before removing its testimonials through the admin.
    await db.from("testimonials").delete().like("author_name", "E2E Visitor%");
    await deleteTestUser(owner);
  });

  test("a contact message reaches Messages in the admin; bots and floods don't", async ({ page }) => {
    // A bot fills the hidden field: it's thanked, and nothing is stored. (Its own tab,
    // so the browser can't carry the filled field over to the next visit.)
    const bot = await page.context().newPage();
    await open(bot, "/contact");
    await bot.getByLabel("Name").fill(`${marker} bot`);
    await bot.getByLabel("Email or phone").fill("bot@example.com");
    await bot.getByLabel("Message").fill("Buy cheap followers now");
    await bot.locator('input[name="hp_note"]').fill("http://spam.example", { force: true });
    await bot.getByRole("button", { name: "Send message" }).click();
    await expect(bot.getByText("Thank you", { exact: true })).toBeVisible();
    await bot.close();
    const { count: botRows } = await db.from("contact_messages").select("id", { count: "exact", head: true }).eq("name", `${marker} bot`);
    expect(botRows).toBe(0);

    // A person.
    await open(page, "/contact");
    await page.getByLabel("Name").fill(marker);
    await page.getByLabel("Email or phone").fill("98765 43210");
    await page.getByLabel("Message").fill("Is the Meher pair available in a lighter weight?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("We've received your message and will reply soon.")).toBeVisible();

    // Rate limit: 3 in 10 minutes from one sender.
    for (const n of [2, 3, 4]) {
      await open(page, "/contact");
      await page.getByLabel("Name").fill(`${marker} ${n}`);
      await page.getByLabel("Email or phone").fill("visitor@example.com");
      await page.getByLabel("Message").fill("Following up on my earlier message.");
      await page.getByRole("button", { name: "Send message" }).click();
      if (n < 4) await expect(page.getByText("Thank you", { exact: true })).toBeVisible();
      else await expect(page.getByText("You've sent us a few messages already.", { exact: false })).toBeVisible();
    }

    await signIn(page, owner, "/admin/messages");
    const item = page.locator("li", { hasText: "Is the Meher pair available" });
    await expect(item).toBeVisible();
    await expect(item.getByRole("link", { name: "+91 9876543210" })).toHaveAttribute("href", "tel:+919876543210");
    await item.getByRole("button", { name: "Mark read" }).click();
    await expect(item.getByRole("button", { name: "Mark unread" })).toBeVisible();
  });

  test("testimonials added in the admin appear on About as a slider", async ({ page }) => {
    await signIn(page, owner, "/admin/content?tab=testimonials");
    const quotes = [`${marker}: the jhumkas were the talk of the wedding.`, `${marker}: wore my mother's set again, reimagined.`];
    for (const [i, quote] of quotes.entries()) {
      await page.getByLabel("Quote").last().fill(quote);
      await page.getByLabel("Name").last().fill(`E2E Visitor ${i + 1}`);
      await page.getByLabel("City (optional)").last().fill("Jaipur");
      await page.getByRole("button", { name: "Add testimonial" }).click();
      // Saved (checked in the database: the first toast may still be showing).
      await expect.poll(async () => (await db.from("testimonials").select("id", { count: "exact", head: true }).like("quote", `${marker}%`)).count).toBe(i + 1);
      await expect(page.getByLabel("Quote").last()).toHaveValue("");
    }
    try {
      await open(page, "/about");
      const slider = page.getByRole("region", { name: "What our customers say" });
      await expect(slider).toBeVisible();
      await expect(slider.getByText("01 — 02")).toBeVisible();
      await slider.getByRole("button", { name: "Next quote" }).click();
      await expect(slider.getByText("02 — 02")).toBeVisible();
      await expect(slider.getByText(quotes[1])).toBeVisible();
    } finally {
      // Remove them through the admin, so the About page refreshes too.
      await page.goto("/admin/content?tab=testimonials");
      for (const quote of quotes) {
        const item = page.locator("details", { has: page.locator("summary", { hasText: quote.slice(0, 30) }) }).filter({ visible: true });
        await item.locator("summary").click();
        page.once("dialog", (d) => d.accept());
        await item.getByRole("button", { name: "Remove" }).click();
        await expect(page.getByText("Testimonial removed.")).toBeVisible();
      }
    }
  });
});
