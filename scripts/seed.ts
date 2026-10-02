// Seeds the Erayah catalogue and launch content. Run with `pnpm seed`.
//
// Reads docs/catalogue.md (transcribed from the catalogue PDFs) and writes to
// Supabase with the service role. Safe to run more than once:
// - new products are inserted with everything below (price, stock, flags,
//   merchandising positions, variants, placeholder images, relations);
// - existing products only get their catalogue text refreshed (name,
//   descriptions, stones, colours, styles, closure, chain). Price, stock,
//   flags and positions are owner-managed in /admin and left alone;
// - settings, pages and FAQs are only filled where still empty.
// Nothing is ever deleted.

import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { z } from "zod";

// ─── Setup ──────────────────────────────────────────────────────────────────

const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .parse(process.env);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CATALOGUE = path.join(process.cwd(), "docs", "catalogue.md");

const MATERIALS = ["Silver alloy", "22kt gold plating", "Kundan / Jadau craftsmanship"];
const STOCK_PER_PRODUCT = 5;
const PLACEHOLDER_PATH = "placeholders/ivory-1200x1500.jpg";
const PLACEHOLDER_SIZE = { width: 1200, height: 1500 };
const IVORY = { r: 0xf9, g: 0xee, b: 0xe1 };

type CategorySlug = "earrings" | "necklace-sets" | "rings" | "bracelets" | "pendants";

type CatalogueRow = {
  category: CategorySlug;
  name: string;
  slug: string;
  family: string;
  price: number | null; // paise
  shortDescription: string;
  stones: string[];
  colours: string[];
  styles: string[];
  closure: string | null;
  chainLength: string | null;
};

// ─── Launch merchandising (owner can change all of this in /admin) ─────────

/** Curated order within each category (requirements §7). */
const MERCH_ORDER: Record<Exclude<CategorySlug, "bracelets">, string[]> = {
  earrings: [
    "meher-earrings", "harakh-earrings", "mallika-earrings", "chantara-earrings",
    "dahlia-earrings", "vaani-earrings-blue", "arohi-earrings", "aira-earrings",
    "rani-earrings", "juhi-earrings-green-blue", "nevara-earrings", "nir-earrings",
    "gulbahar-earrings", "jharna-earrings", "misri-earrings", "vaani-earrings-pink",
    "boond-earrings", "tavira-earrings", "mrina-earrings", "inara-earrings",
    "reva-earrings", "juhi-earrings-red", "orva-earrings", "avira-earrings",
  ],
  "necklace-sets": [
    "mayurika-choker-set", "rohini-choker", "noor-set", "mithu-necklace-set",
    "ziya-choker-set", "channak-set", "tara-choker-set", "gul-choker-set",
  ],
  rings: [
    "ekam-ring", "dori-ring", "harakh-ring", "bindu-ring",
    "marakat-ring", "chantara-ring", "aabha-ring", "beej-ring",
  ],
  pendants: [
    "rangmil-pendant", "gaja-i-pendant", "soma-pendant", "kumud-pendant-mother-of-pearl",
    "piku-pendant", "indu-pendant-polki", "dwandva-pendant", "pakhi-pendant-mother-of-pearl",
    "ahna-pendant", "vakra-pendant-polki", "chantara-pendant", "kalash-pendant",
    "padma-pendant", "kaman-pendant-mother-of-pearl", "gaja-ii-pendant", "ardh-pendant",
    "kumud-pendant-firozi", "indu-pendant-mother-of-pearl", "pakhi-pendant-firozi",
    "vakra-pendant-multicolour", "kaman-pendant-polki", "gaja-iii-pendant",
  ],
};

/** New Arrivals, in carousel order. */
const NEW_ARRIVALS = [
  "mayurika-choker-set", "mallika-earrings", "noor-set", "ekam-ring", "mithu-necklace-set",
  "arohi-earrings", "rohini-choker", "rangmil-pendant", "ziya-choker-set", "gulbahar-earrings",
  "gul-choker-set", "channak-set", "tara-choker-set",
];

/** Best Sellers, in carousel order. */
const BEST_SELLERS = [
  "meher-earrings", "gaja-i-pendant", "dahlia-earrings", "harakh-ring", "gul-choker-set",
  "kumud-pendant-mother-of-pearl", "rani-earrings", "juhi-earrings-red",
];

const HEROES = [
  "meher-earrings", "mayurika-choker-set", "noor-set", "rangmil-pendant", "ekam-ring",
  "mallika-earrings",
];

const GIFT_PRICE_LIMIT = 300000; // ₹3,000 in paise

/** Variants: stock is split across options (5 per product in total). */
const VARIANTS: Record<string, { label: string; colour: string; stock: number }[]> = {
  "dori-ring": [
    { label: "White", colour: "white", stock: 2 },
    { label: "Green", colour: "green", stock: 2 },
    { label: "Pink", colour: "pink", stock: 1 },
  ],
  "harakh-earrings": [
    { label: "White", colour: "white", stock: 3 },
    { label: "Pink", colour: "pink", stock: 2 },
  ],
};

// ─── Descriptions in Erayah's voice ─────────────────────────────────────────

const DESCRIPTIONS: Record<string, string> = {
  // Earrings
  "dahlia-earrings":
    "Dahlia takes its name from the flower and wears it as a jhumki. White polki and a fringe of faux pearls catch the light as you move. Made for long evenings and the stories that come with them.",
  "reva-earrings":
    "Reva pairs white and green polki with faux pearls and soft jade. A dangler that moves gently and sits as easily with cotton as with silk.",
  "inara-earrings":
    "Inara is a stud with quiet presence. White polki set close and finished with faux pearls, for the days you want one certain detail.",
  "harakh-earrings":
    "Harakh means joy. Polki and a single faux pearl, in white or pink, set close to the ear. Made to be worn often, and to meet the Harakh ring.",
  "meher-earrings":
    "Meher means grace. Chaandbaalis drawn in white and green polki and edged with faux pearls, in the crescent that has framed faces for generations. For the occasions you will want to remember.",
  "gulbahar-earrings":
    "Gulbahar is a garden in bloom. White, green and pink polki gathered into a full, nature-inspired stud. These are heavy studs, made to be noticed.",
  "avira-earrings":
    "Avira is a light, graceful dangler in white polki, finished with faux pearls. Easy to wear from morning into evening.",
  "nevara-earrings":
    "Nevara brings turquoise polki together with white stones and faux pearls. A cool, clear note of colour that moves as you do.",
  "rani-earrings":
    "Rani is the queen. Classic jhumkas in white polki with faux pearls and jade, made with the poise of an heirloom and worn the way you choose.",
  "jharna-earrings":
    "Jharna is a spring of water. Turquoise polki and faux pearls in a small stud, fresh and easy for every day.",
  "tavira-earrings":
    "Tavira borrows from Victorian motifs and sets them in white polki and jade. An old-world line, quietly made new.",
  "chantara-earrings":
    "Chantara holds the moon and the stars. White polki, rice pearls and jade in a celestial earring, made to be worn with the Chantara pendant and ring.",
  "orva-earrings":
    "Orva gathers white, pink and green polki with faux pearls and jade in a dangler of soft colour. Festive, without asking for attention.",
  "aira-earrings":
    "Aira is an ear cuff in white polki that follows the line of the ear. A modern shape, held in a traditional craft.",
  "nir-earrings":
    "Nir means water. Blue topaz in a clean, simple stud, as clear as its name.",
  "misri-earrings":
    "Misri is as sweet as its name. Chaandbaalis in white and green polki with faux pearls and jade, a softer companion to Meher.",
  "arohi-earrings":
    "Arohi means rising. Blue, green and white polki fall into garlands of faux pearl, a drop earring full of movement and colour.",
  "juhi-earrings-green-blue":
    "Juhi is jasmine, small and constant. A bali in green and blue polki that sits close and stays with you through the day.",
  "juhi-earrings-red":
    "Juhi is jasmine, small and constant. A bali in white and red polki, a warm colour for festive days and ordinary ones.",
  "boond-earrings":
    "Boond is a single drop. White and pink polki fall in a gentle dangler, light in feeling and easy to wear.",
  "mallika-earrings":
    "Mallika is made for the grand occasion. Shoulder drops in blue, green and red polki with faux pearls and jade, supported by traditional kaan saharas so they sit as they should.",
  "vaani-earrings-blue":
    "Vaani means voice. White and blue polki in a stud finished with antique polish, so it reads as old and new at once.",
  "vaani-earrings-pink":
    "Vaani means voice. White and pink polki in a stud finished with antique polish, so it reads as old and new at once.",
  "mrina-earrings":
    "Mrina is a shoulder drop in white and red polki, finished with faux pearls. Long, graceful and certain of itself.",

  // Necklace sets
  "mithu-necklace-set":
    "Mithū is the parrot of Indian folk songs and courtyards. Green, pink and firozi polki shape a necklace and earrings drawn from parrots and nature. A set full of colour, made to be handed down.",
  "rohini-choker":
    "Rohini is a choker of faux pearls and mother-of-pearl, paired with mother-of-pearl studs. Soft and luminous, it closes with a traditional dori.",
  "mayurika-choker-set":
    "Mayurika is the peacock, India's national bird. A choker and earrings in white polki, tied with a traditional dori. A set for the occasions that matter most.",
  "gul-choker-set":
    "Gul means flower. A choker and studs in white polki that open like petals along the neckline, finished with a traditional dori.",
  "noor-set":
    "Noor means light. A necklace and earrings in white polki, made to hold light and give it back. A set for the grandest days.",
  "channak-set":
    "Channak is the sound of ghunghroo in a classical dance. A necklace and earrings detailed with ghunghroo, so the set answers softly as you move.",
  "ziya-choker-set":
    "Ziya means light. A botanical choker and studs in green, pink and white polki with faux mother-of-pearl, closed with a traditional dori.",
  "tara-choker-set":
    "Tara means star. A geometric choker and studs in green and white polki with jade green stones, ordered and precise, tied with a traditional dori.",

  // Rings
  "harakh-ring":
    "Harakh means joy. Heart motifs in polki with a single faux pearl, on an adjustable band. A small gesture of love, made to be worn often.",
  "chantara-ring":
    "Chantara holds the moon and the stars. A polki ring on an adjustable band, made to be worn with the Chantara pendant and earrings.",
  "bindu-ring":
    "Bindu is the point where everything begins. A small, oneness-inspired ring in polki, adjustable for a comfortable fit.",
  "beej-ring":
    "Beej is a seed. A single stone on a simple adjustable band, a beginning in its quietest form.",
  "aabha-ring":
    "Aabha means glow. A nature-inspired ring in polki, adjustable for a comfortable fit and easy to wear every day.",
  "marakat-ring":
    "Mārakat is an old word for emerald. Green and white polki on an adjustable band, a little colour for the hand.",
  "dori-ring":
    "Dori is the thread that ties things together. Slim stackable bands in polki, in white, green or pink. Wear one alone or gather them.",
  "ekam-ring":
    "Ekam means one. A one-of-a-kind ring in polki with a faux pearl, adjustable for a comfortable fit.",

  // Pendants
  "gaja-i-pendant":
    "Gajā is the elephant, the mark at the heart of Erayah, its trunk raised in the oldest gesture of optimism. Set in polki, on a 10-inch chain.",
  "gaja-ii-pendant":
    "Gajā is the elephant, carried with weight and grace. Faux mother-of-pearl gives this one a soft, quiet glow, on a 10-inch chain.",
  "gaja-iii-pendant":
    "Gajā is the elephant, trunk raised for good fortune. A single blue topaz brings it a clear, cool colour, on a 10-inch chain.",
  "kumud-pendant-mother-of-pearl":
    "Kumud is the lotus that opens by moonlight. Faux mother-of-pearl in a lotus shape, on a 10-inch chain.",
  "kumud-pendant-firozi":
    "Kumud is the lotus that opens by moonlight. Italian firozi gives it the colour of still water, on a 10-inch chain.",
  "chantara-pendant":
    "Chantara holds the moon and a star together. Polki on a 10-inch chain, a small celestial piece to wear with the Chantara earrings and ring.",
  "pakhi-pendant-mother-of-pearl":
    "Pākhi means wings. Faux mother-of-pearl shaped as a wing, a reminder to move through the day lightly.",
  "pakhi-pendant-firozi":
    "Pākhi means wings. A wing in Italian firozi, the colour of open sky, on a 10-inch chain.",
  "kalash-pendant":
    "The kalash is the vessel of plenty at every Indian ceremony. Faux mother-of-pearl in a small pot-shaped pendant, on a 10-inch chain.",
  "indu-pendant-polki":
    "Indu is the moon. A moon-shaped pendant in polki, calm and constant, on a 10-inch chain.",
  "indu-pendant-mother-of-pearl":
    "Indu is the moon. Faux mother-of-pearl gives this moon its soft light, on a 10-inch chain.",
  "kaman-pendant-mother-of-pearl":
    "Kamān is the arc of a bow, drawn here as a small moon. Faux mother-of-pearl on a 10-inch chain.",
  "kaman-pendant-polki":
    "Kamān is the arc of a bow, drawn here as a small moon. Polki on a 10-inch chain, for everyday light.",
  "padma-pendant":
    "Padma is the lotus, rooted in water and opening to light. Pink and white polki in a lotus-shaped pendant, on a 10-inch chain.",
  "soma-pendant":
    "Soma is the moon in its fullness. A large moon-shaped pendant in faux pearls and mother-of-pearl, the most luminous of our moons.",
  "ardh-pendant":
    "Ardh means half. A crescent in polki, the moon on its way to full, on a 10-inch chain.",
  "vakra-pendant-polki":
    "Vakra is the curve of an elephant's tusk. A tusk-shaped pendant in polki, a quieter echo of the Erayah elephant.",
  "vakra-pendant-multicolour":
    "Vakra is the curve of an elephant's tusk. Pink, green and white polki bring it colour, on a 10-inch chain.",
  "rangmil-pendant":
    "Rangmil is where colours meet. A one-of-a-kind pendant in multi-coloured polki that can also be worn as a brooch.",
  "piku-pendant":
    "Piku is a little parrot, a companion to Mithū. Navratna polki and coral on a faux pearl chain, bright and full of life.",
  "dwandva-pendant":
    "Dwandva means a pair, two things held in balance. Pink and white polki meet labradorite in a pendant on a 13-inch chain.",
  "ahna-pendant":
    "Āhna is a fusion pendant, white polki and faux mother-of-pearl set side by side. A traditional craft in a contemporary line.",
};

// ─── Site content ───────────────────────────────────────────────────────────

const SITE_SETTINGS = {
  announcement_text: "Handcrafted in India · Delivered in 7–10 working days",
  brand_story_text:
    "Some things are made to last a lifetime. Erayah makes things meant to outlast several. Heirlooms, reimagined, because some stories deserve a more beautiful way to continue.",
  brand_story_cta_label: "Our Story",
  brand_story_cta_url: "/about",
};

const FAQS: { group: string; question: string; answer: string }[] = [
  {
    group: "Shipping",
    question: "How long does delivery take?",
    answer: "Orders are delivered within 7–10 working days.",
  },
  {
    group: "Shipping",
    question: "Can I receive my order sooner?",
    answer:
      "Express shipping can be arranged on request. Message us on WhatsApp with your order number and we will tell you what is possible for your pincode.",
  },
  {
    group: "Shipping",
    question: "How much does shipping cost?",
    answer: "Shipping charges are calculated at checkout based on your delivery pincode.",
  },
  {
    group: "Returns",
    question: "Can I return or exchange a piece?",
    answer:
      "Returns and exchanges are accepted only for products damaged in transit or incorrect products received. Items must be returned unworn and in their original packaging. Return and exchange shipping, courier and logistics charges are borne by the customer.",
  },
  {
    group: "Returns",
    question: "My order arrived damaged. What should I do?",
    answer:
      "We are sorry. Message us on WhatsApp with your order number and photographs of the piece and its packaging, and we will guide you through a return or exchange.",
  },
  {
    group: "Our jewellery",
    question: "What is Erayah jewellery made of?",
    answer:
      "Every piece is silver alloy with 22kt gold plating, set with kundan, jadau and polki craftsmanship by traditional artisans.",
  },
  {
    group: "Our jewellery",
    question: "Why does my piece look slightly different from the photographs?",
    answer:
      "Our jewellery is handcrafted by traditional artisans, so slight variations in stones, finish and detailing are natural and make each piece unique. All products undergo quality checks before dispatch.",
  },
  {
    group: "Care",
    question: "How do I care for my jewellery?",
    answer:
      "Keep it away from water, perfume and lotions. Put it on last and take it off first. Wipe it gently with a soft, dry cloth and store each piece on its own in its pouch or box.",
  },
  {
    group: "Sizing",
    question: "What ring size should I order?",
    answer: "All Erayah rings are adjustable for a comfortable fit, so there is no size to choose.",
  },
  {
    group: "Sizing",
    question: "How long are the pendant chains?",
    answer:
      "Most pendants come with a 10-inch chain. Dwandva comes with a 13-inch chain, Piku with a 10-inch pearl chain, and Rangmil can also be worn as a brooch. The length is listed on each product page.",
  },
  {
    group: "Gifting",
    question: "Can I send a piece as a gift?",
    answer:
      "Yes. Mark your order as a gift at checkout and add a note. We will include your note with the piece.",
  },
  {
    group: "Payment",
    question: "How can I pay?",
    answer:
      "You can pay securely through Razorpay by UPI, credit or debit card, wallet or netbanking. We do not offer cash on delivery. Your invoice appears on the confirmation page once your order is placed, with a PDF to download.",
  },
];

const PAGES: Record<string, { body: string; seo_title: string; seo_description: string }> = {
  "shipping-returns": {
    seo_title: "Shipping & Returns",
    seo_description:
      "Delivery in 7–10 working days across India. Returns and exchanges for transit damage or incorrect products.",
    body: `## Shipping

Shipping charges are calculated at checkout based on your delivery pincode. Orders are delivered within 7–10 working days. Express shipping on request can be arranged.

## Handcrafted by artisans

Our jewellery is handcrafted by traditional artisans, so slight variations in stones, finish and detailing are natural and make each piece unique. All products undergo quality checks before dispatch.

## Returns and exchanges

Returns and exchanges are accepted ONLY for products damaged in transit or incorrect products received. Items must be returned unworn and in their original packaging.

Return and exchange shipping, courier and logistics charges for all domestic and international orders are borne by the customer.

To request a return or exchange, message us on WhatsApp with your order number.
`,
  },
  about: {
    seo_title: "About Erayah",
    seo_description:
      "Erayah means fortune's favourite. Handcrafted heirloom jewellery, rooted in heritage and made to be handed down.",
    body: `Some things are made to last a lifetime. Erayah makes things meant to outlast several. Erayah means fortune's favourite. Not the kind that arrives by chance, but the kind that is chosen, cared for, and carried forward from one generation to the next.

The elephant was never chosen for its symbolism alone. It was chosen for how it moves, with weight, with grace, with the quiet certainty of something that knows its own worth.

Look at the mark and you'll notice it isn't drawn so much as assembled. Each segment sits the way a jadau stone sits, placed with intention, held with precision. The trunk raised, as it always has been, the oldest gesture of optimism there is.

Erayah's jewellery works the same way. Rooted in heritage, but not preserved by it. Contemporary in feeling, enduring in meaning, made to be worn, and eventually, handed down.

Heirlooms reimagined, because some stories deserve a more beautiful way to continue.

## Our founder

[FOUNDER STORY TO BE ADDED]
`,
  },
  "privacy-policy": {
    seo_title: "Privacy Policy",
    seo_description: "How Erayah collects, uses and protects your personal information.",
    body: `**DRAFT – REVIEW BEFORE LAUNCH**

_Last updated: [DATE]_

This policy explains how [LEGAL BUSINESS NAME], trading as Erayah ("we", "us"), collects and uses your personal information when you visit this website or place an order. It is written to meet the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.

## What we collect

- **When you order:** your name, phone number, delivery address, email address (optional), gift note, and the details of your order.
- **When you contact us:** your name, the contact details you give us, and your message.
- **On your device:** your cart, wishlist and recently viewed pieces are kept in your browser's local storage. They are not sent to us until you check out.

We do not offer customer accounts, and we do not see or store your card, UPI or bank details. Payments are processed by Razorpay under its own privacy policy.

## How we use it

- To process, deliver and support your order, including contacting you by phone or WhatsApp about it.
- To issue your invoice and keep the tax and accounting records the law requires.
- To answer your messages.

We do not sell your personal information, and we do not send marketing messages.

## Who we share it with

Only the service providers we need to run the shop: Razorpay (payments), our courier partners (delivery), and our hosting and database providers. Each receives only what it needs for its task.

## How long we keep it

Order and invoice records are kept for as long as Indian tax law requires. Contact messages are deleted when they are no longer needed.

## Your rights

You may ask to see, correct or erase your personal information, subject to records we must keep by law. To make a request or raise a concern, contact our Grievance Officer: [NAME], [EMAIL], [PHONE].

## Security

We use reasonable technical and organisational measures to protect your information, including encrypted connections and restricted access.

## Changes

We may update this policy. The date at the top shows when it last changed.

## Contact

[LEGAL BUSINESS NAME], [REGISTERED ADDRESS]. [EMAIL] · [PHONE]
`,
  },
  terms: {
    seo_title: "Terms & Conditions",
    seo_description: "The terms that apply when you shop with Erayah.",
    body: `**DRAFT – REVIEW BEFORE LAUNCH**

_Last updated: [DATE]_

These terms apply when you use this website or buy from [LEGAL BUSINESS NAME], trading as Erayah. By placing an order you agree to them.

## Our jewellery

Every piece is handcrafted by traditional artisans. Slight variations in stones, finish and detailing are natural and make each piece unique. Photographs show the design; your piece may differ slightly.

## Prices

Prices are in Indian rupees and include GST unless stated otherwise. Shipping is calculated at checkout based on your delivery pincode. The amount shown at checkout is the amount you pay.

## Orders

Your order is confirmed when payment succeeds and you see the confirmation page with your invoice. We may cancel an order, with a full refund, if a piece is unavailable or a price was shown in error.

## Payment

We accept UPI, credit and debit cards, wallets and netbanking through Razorpay. We do not offer cash on delivery.

## Shipping, returns and exchanges

Delivery, returns and exchanges are covered by our Shipping & Returns policy, which forms part of these terms.

## Intellectual property

All designs, photographs, text and the Erayah name and elephant mark belong to us and may not be used without our written permission.

## Liability

To the extent the law allows, our liability for any order is limited to the amount paid for it.

## Governing law

These terms are governed by the laws of India. The courts at [CITY] have jurisdiction.

## Contact

[LEGAL BUSINESS NAME], [REGISTERED ADDRESS]. [EMAIL] · [PHONE]
`,
  },
};

// ─── Catalogue parsing and validation ───────────────────────────────────────

function parseCatalogue(): CatalogueRow[] {
  if (!fs.existsSync(CATALOGUE)) {
    throw new Error(`Missing ${CATALOGUE}. It is kept locally (not in git); see docs/DECISIONS.md.`);
  }

  const list = (cell: string) => cell.split(";").map((s) => s.trim()).filter(Boolean);
  const rows = fs
    .readFileSync(CATALOGUE, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("| ") && !line.startsWith("| Category") && !line.startsWith("|---"));

  return rows.map((line) => {
    const cells = line.slice(1, -1).split("|").map((c) => c.trim());
    if (cells.length !== 11) throw new Error(`Bad catalogue row (${cells.length} cells): ${line}`);
    const [category, name, slug, family, price, shortDescription, stones, colours, styles, closure, chain] = cells;

    return {
      category: category as CategorySlug,
      name,
      slug,
      family,
      price: price === "MISSING" ? null : Math.round(Number(price) * 100),
      shortDescription,
      stones: list(stones),
      colours: list(colours),
      styles: list(styles),
      closure: closure || null,
      chainLength: chain || null,
    };
  });
}

function validate(rows: CatalogueRow[]) {
  const slugs = new Set(rows.map((r) => r.slug));
  const problems: string[] = [];

  if (slugs.size !== rows.length) problems.push("duplicate slugs in catalogue");
  for (const r of rows) {
    if (r.price !== null && !(r.price > 0)) problems.push(`${r.slug}: bad price`);
    if (!DESCRIPTIONS[r.slug]) problems.push(`${r.slug}: no description`);
    if (!r.styles.includes("statement") && !r.styles.includes("minimal"))
      problems.push(`${r.slug}: styles need statement or minimal`);
  }
  for (const slug of Object.keys(DESCRIPTIONS)) {
    if (!slugs.has(slug)) problems.push(`description for unknown slug ${slug}`);
    if (/!/.test(DESCRIPTIONS[slug])) problems.push(`${slug}: exclamation mark in description`);
  }
  for (const list of [NEW_ARRIVALS, BEST_SELLERS, HEROES, Object.keys(VARIANTS)]) {
    for (const slug of list) if (!slugs.has(slug)) problems.push(`unknown slug ${slug}`);
  }

  // Each category's merchandising order covers exactly its products, heroes
  // sit in the first four slots, and no family appears twice in a row.
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  for (const [category, order] of Object.entries(MERCH_ORDER)) {
    const inCategory = rows.filter((r) => r.category === category).map((r) => r.slug).sort();
    if (JSON.stringify([...order].sort()) !== JSON.stringify(inCategory))
      problems.push(`${category}: MERCH_ORDER does not match the catalogue`);
    order.forEach((slug, i) => {
      if (HEROES.includes(slug) && i >= 4) problems.push(`${slug}: hero outside first 4`);
      const next = order[i + 1];
      if (next && bySlug.get(slug)?.family === bySlug.get(next)?.family)
        problems.push(`${category}: ${slug} next to ${next} (same family)`);
    });
  }

  if (problems.length) throw new Error(`Catalogue problems:\n  ${problems.join("\n  ")}`);
}

// ─── Complete the Look ──────────────────────────────────────────────────────
// Same family first (across categories), then pieces from other categories
// that share a motif or colour at a similar price. At most two per category.
// `usage` counts how often each piece has been suggested so far, so the
// suggestions spread across the catalogue instead of repeating a few pieces.

const MOTIFS: Record<string, number> = {
  celestial: 12,
  nature: 12,
  animal: 12,
  pearl: 5,
  "mother-of-pearl": 5,
};

function completeTheLook(
  product: CatalogueRow,
  all: CatalogueRow[],
  usage: Map<string, number> = new Map(),
): string[] {
  const price = product.price ?? 250000;
  const scored = all
    .filter((c) => c.slug !== product.slug && c.category !== product.category && c.price !== null)
    .map((c) => {
      let score = 0;
      if (c.family === product.family) score += 100;
      for (const [motif, weight] of Object.entries(MOTIFS)) {
        if (c.styles.includes(motif) && product.styles.includes(motif)) score += weight;
      }
      score += 3 * c.colours.filter((col) => product.colours.includes(col)).length;
      score -= 15 * Math.abs(Math.log((c.price as number) / price));
      score -= 4 * (usage.get(c.slug) ?? 0);
      return { slug: c.slug, category: c.category, score };
    })
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

  const picked: string[] = [];
  const perCategory = new Map<string, number>();
  for (const c of scored) {
    if ((perCategory.get(c.category) ?? 0) >= 2) continue;
    picked.push(c.slug);
    usage.set(c.slug, (usage.get(c.slug) ?? 0) + 1);
    perCategory.set(c.category, (perCategory.get(c.category) ?? 0) + 1);
    if (picked.length === 3) break;
  }
  return picked;
}

// ─── Database helpers ───────────────────────────────────────────────────────

function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

async function ensurePlaceholderImage() {
  const jpeg = await sharp({
    create: { ...PLACEHOLDER_SIZE, channels: 3, background: IVORY },
  })
    .jpeg({ quality: 80 })
    .toBuffer();

  const { error } = await supabase.storage
    .from("product-images")
    .upload(PLACEHOLDER_PATH, jpeg, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`upload placeholder: ${error.message}`);

  const tiny = await sharp({ create: { width: 8, height: 10, channels: 3, background: IVORY } })
    .png()
    .toBuffer();
  return `data:image/png;base64,${tiny.toString("base64")}`;
}

// ─── Seed ───────────────────────────────────────────────────────────────────

async function main() {
  const rows = parseCatalogue();
  validate(rows);

  if (process.argv.includes("--dry-run")) {
    const name = new Map(rows.map((r) => [r.slug, r.name]));
    for (const [category, order] of Object.entries(MERCH_ORDER)) {
      console.log(`\n${category}:\n  ${order.map((s, i) => `${i + 1}. ${name.get(s)}`).join("\n  ")}`);
    }
    console.log("\nComplete the Look:");
    const usage = new Map<string, number>();
    for (const r of rows) {
      console.log(`  ${r.name} → ${completeTheLook(r, rows, usage).map((s) => name.get(s)).join(" · ")}`);
    }
    console.log(`\nCatalogue OK: ${rows.length} products. Dry run, nothing written.`);
    return;
  }

  const categories = check(await supabase.from("categories").select("id, slug"), "read categories") as {
    id: number;
    slug: string;
  }[];
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));
  for (const r of rows) {
    if (!categoryId.has(r.category)) throw new Error(`Unknown category ${r.category} for ${r.slug}`);
  }

  // Products.
  const existing = check(await supabase.from("products").select("id, slug"), "read products") as {
    id: number;
    slug: string;
  }[];
  const existingSlugs = new Set(existing.map((p) => p.slug));

  const position = (list: string[], slug: string) => (list.includes(slug) ? list.indexOf(slug) + 1 : null);
  const merchPosition = (r: CatalogueRow) =>
    r.category === "bracelets" ? null : MERCH_ORDER[r.category].indexOf(r.slug) + 1;

  const content = (r: CatalogueRow) => ({
    slug: r.slug,
    name: r.name,
    category_id: categoryId.get(r.category),
    short_description: r.shortDescription,
    description: DESCRIPTIONS[r.slug],
    materials: MATERIALS,
    stones: r.stones,
    colours: r.colours,
    styles: r.styles,
    closure: r.closure,
    chain_length: r.chainLength,
  });

  const toInsert = rows
    .filter((r) => !existingSlugs.has(r.slug))
    .map((r) => ({
      ...content(r),
      price: r.price,
      is_published: r.price !== null,
      is_new_arrival: NEW_ARRIVALS.includes(r.slug),
      is_best_seller: BEST_SELLERS.includes(r.slug),
      is_gift_for_her: r.category === "pendants" || (r.price !== null && r.price <= GIFT_PRICE_LIMIT),
      is_hero: HEROES.includes(r.slug),
      stock_qty: STOCK_PER_PRODUCT,
      merch_position: merchPosition(r),
      new_arrival_position: position(NEW_ARRIVALS, r.slug),
      best_seller_position: position(BEST_SELLERS, r.slug),
    }));

  if (toInsert.length) check(await supabase.from("products").insert(toInsert), "insert products");
  for (const r of rows.filter((row) => existingSlugs.has(row.slug))) {
    check(await supabase.from("products").update(content(r)).eq("slug", r.slug), `update ${r.slug}`);
  }

  const products = check(
    await supabase.from("products").select("id, slug, name"),
    "read products",
  ) as { id: number; slug: string; name: string }[];
  const productId = new Map(products.map((p) => [p.slug, p.id]));
  const insertedSlugs = new Set(toInsert.map((p) => p.slug));

  // Variants (only for newly inserted products, so owner stock edits survive).
  const variantRows = Object.entries(VARIANTS)
    .filter(([slug]) => insertedSlugs.has(slug))
    .flatMap(([slug, variants]) =>
      variants.map((v, i) => ({
        product_id: productId.get(slug),
        label: v.label,
        colour: v.colour,
        stock_qty: v.stock,
        sort_order: i + 1,
      })),
    );
  if (variantRows.length) {
    check(
      await supabase.from("product_variants").upsert(variantRows, {
        onConflict: "product_id,label",
        ignoreDuplicates: true,
      }),
      "insert variants",
    );
  }

  // Placeholder images: one per role, only where the product has none yet.
  const blur = await ensurePlaceholderImage();
  const images = check(
    await supabase.from("product_images").select("product_id, role"),
    "read images",
  ) as { product_id: number; role: string }[];
  const hasRole = new Set(images.map((i) => `${i.product_id}:${i.role}`));
  const roles = ["worn_closeup", "lifestyle", "product_only", "detail"] as const;
  const imageRows = products.flatMap((p) =>
    roles
      .filter((role) => !hasRole.has(`${p.id}:${role}`))
      .map((role) => ({
        product_id: p.id,
        storage_path: PLACEHOLDER_PATH,
        role,
        alt: `${p.name}, photograph coming soon`,
        sort_order: roles.indexOf(role) + 1,
        ...PLACEHOLDER_SIZE,
        blur_data_url: blur,
      })),
  );
  if (imageRows.length) check(await supabase.from("product_images").insert(imageRows), "insert images");

  // Complete the Look.
  const usage = new Map<string, number>();
  const relationRows = rows.flatMap((r) =>
    completeTheLook(r, rows, usage).map((related, i) => ({
      product_id: productId.get(r.slug),
      related_product_id: productId.get(related),
      kind: "complete_the_look",
      sort_order: i + 1,
    })),
  );
  check(
    await supabase.from("product_relations").upsert(relationRows, {
      onConflict: "product_id,related_product_id,kind",
      ignoreDuplicates: true,
    }),
    "insert relations",
  );

  // Site settings: only fill what is still empty.
  const settings = check(
    await supabase.from("site_settings").select("*").eq("id", 1).single(),
    "read settings",
  ) as Record<string, unknown>;
  const settingsPatch = Object.fromEntries(
    Object.entries(SITE_SETTINGS).filter(([key]) => settings[key] === null || settings[key] === ""),
  );
  if (Object.keys(settingsPatch).length) {
    check(await supabase.from("site_settings").update(settingsPatch).eq("id", 1), "update settings");
  }

  // Shipping: keep the owner's rate. Only create a default rule if none exists.
  const rules = check(
    await supabase.from("shipping_rules").select("id").eq("match_type", "default"),
    "read shipping",
  ) as { id: number }[];
  if (!rules.length) {
    check(
      await supabase.from("shipping_rules").insert({
        name: "SET THE REAL RATE IN ADMIN",
        match_type: "default",
        rate: 0,
        est_days_min: 7,
        est_days_max: 10,
      }),
      "insert shipping rule",
    );
  }

  // FAQs: add any that are missing (matched by question).
  const faqs = check(await supabase.from("faqs").select("question"), "read faqs") as { question: string }[];
  const haveFaq = new Set(faqs.map((f) => f.question));
  const faqRows = FAQS.filter((f) => !haveFaq.has(f.question)).map((f) => ({
    question: f.question,
    answer: f.answer,
    group_name: f.group,
    sort_order: FAQS.indexOf(f) + 1,
  }));
  if (faqRows.length) check(await supabase.from("faqs").insert(faqRows), "insert faqs");

  // Pages: fill only empty bodies.
  const pages = check(await supabase.from("pages").select("slug, body"), "read pages") as {
    slug: string;
    body: string;
  }[];
  for (const page of pages) {
    const seed = PAGES[page.slug];
    if (seed && !page.body.trim()) {
      check(await supabase.from("pages").update(seed).eq("slug", page.slug), `update page ${page.slug}`);
    }
  }

  // Summary.
  const summary = check(
    await supabase.from("products").select("price, is_published, categories(slug, sort_order)"),
    "read summary",
  ) as unknown as { price: number | null; is_published: boolean; categories: { slug: string; sort_order: number } }[];

  const table = new Map<string, { order: number; count: number; published: number; missing: number }>();
  for (const c of categories) {
    table.set(c.slug, { order: 0, count: 0, published: 0, missing: 0 });
  }
  for (const p of summary) {
    const row = table.get(p.categories.slug)!;
    row.order = p.categories.sort_order;
    row.count += 1;
    if (p.is_published) row.published += 1;
    if (p.price === null) row.missing += 1;
  }

  console.log(
    `\nInserted ${toInsert.length} new products, refreshed ${rows.length - toInsert.length}, ` +
      `${variantRows.length} variants, ${imageRows.length} placeholder images, ` +
      `${faqRows.length} FAQs, settings fields filled: ${Object.keys(settingsPatch).length}.\n`,
  );
  console.table(
    [...table.entries()].map(([category, r]) => ({
      category,
      count: r.count,
      published: r.published,
      "missing price": r.missing,
    })),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
