# Decisions

Notable project decisions, newest last. Each line: date, decision, why.

## 2026-10-03 — Foundation
- **Next.js 16.3 + Tailwind 4.** Tailwind 4 has no `tailwind.config`; design tokens live in `@theme` in `src/app/globals.css`, which also emits them as CSS variables.
- **Script font falls back to STIX Two Text Italic.** Sloop isn't in `/docs/brand/Fonts` (only an SFT Schrifted Serif *trial* font, not licensed for production). `--font-script` points at STIX Italic, the brand guide's stated alternative; swapping in Sloop is one line in `src/app/fonts.ts`.
- **Env split.** One zod schema (`src/lib/env/schema.ts`) checked in `next.config.ts` so dev/build fail loudly; `env` (server-only, secrets) and `publicEnv` (browser) are separate modules so secrets can't reach client bundles.
- **Favicon** is the dark circular elephant mark from the tertiary logo set.
- **`/docs` stays out of git** except our own docs (`DATABASE.md`, `DECISIONS.md`, `OWNER_TODO.md`). The GitHub repo is public; client PDFs, catalogue prices and the trial font must not be published.
- **Git pushes use the `github-mustu124` SSH alias** from `~/.ssh/config`.

## 2026-10-03 — Email
- **The site sends no email at all.** The invoice exists only on the confirmation page (with PDF download). The owner later removed Resend entirely, so `RESEND_API_KEY`, `NOTIFICATION_EMAIL_FROM` (formerly `ORDER_EMAIL_FROM`) and `OWNER_NOTIFICATION_EMAIL` were deleted. A later prompt repeated the older "Resend for owner alerts only / rename to NOTIFICATION_EMAIL_FROM" instruction; the owner's explicit removal is the newer decision, so Resend stays out. New orders and contact messages are read in `/admin`.

## 2026-10-03 — Database
- **Money in paise** (integers) everywhere; formatting only at display.
- **`search_vector` maintained by trigger**, not a generated column: generated columns can't read the category name or use non-immutable `array_to_string`. Accents are stripped (`unaccent`) so "mithu" finds "Mithū".
- **Gap-free numbering** via `document_counters`: order numbers `ERY-2026-00001` per calendar year; GST invoice numbers `ERY/26-27/00001` per financial year, assigned only once paid.
- **Stock is held at order creation**; unpaid Razorpay orders are cancelled and released after 30 minutes by `pg_cron` (`expire_pending_orders`, every 10 minutes).
- **`restore_stock` also reverses gift card balance**, idempotently.
- **Added `contact_messages`** (contact form stored for `/admin`, since no email).
- **Only owners can manage `admin_users`** so staff cannot promote themselves.
- **Customer email is optional; phone is required.**
- **No Cash on Delivery.** `payment_method` is `razorpay` or `gift_card` (an order fully covered by a gift card is placed and paid immediately). COD columns removed.
- **Default shipping ₹100 flat**, no free-shipping threshold (owner's instruction "for now").
- **Migrations 0100–1000 were applied by the owner via the SQL editor**, so Supabase's migration history must be repaired before the first `db push` (command in `docs/DATABASE.md`).
- **Owner admin row** added for the only Auth user, `admin@forever.com`.

## 2026-10-03 — Tooling
- **Playwright** (Chromium + WebKit) smoke tests in `e2e/`, run with `pnpm test:e2e` against `next dev` at 375px and 1280px.
- **Local placeholder env values** for Razorpay and Instagram so dev/build run; real values are in `docs/OWNER_TODO.md`.
- **`pnpm typecheck` runs `next typegen` first**, so Next's generated route types (`LayoutProps`, `PageProps`) exist on a fresh checkout.
- **No coupons or discount codes** (owner's decision). Migration `20261003001100` drops the `coupons` table, `coupon_type`, and `orders.discount`/`coupon_code`, and removes coupon logic from `create_order`/`restore_stock`. This overrides the requirements doc's "Coupon / Gift Card" in the cart: the cart keeps gift cards only. Gift cards stay because they are a payment method, not a discount.

## 2026-10-03 — Catalogue seed
- **`docs/catalogue.md` created** from the four catalogue PDFs (it was referenced but didn't exist). It stays local like the rest of `/docs`; `pnpm seed` reads it and fails clearly if it's missing. Descriptions in Erayah's voice, launch flags and merchandising order live in `scripts/seed.ts`.
- **Catalogue text fixes:** PDF line-break artefacts ("10- inch", "mother-of- pearl") and a missing space ("mother-of-pearl.Comes") fixed; "white stone polk" → "white stone polki" (Āhna).
- **Names:** "Chanatara Ring" seeded as **Chantara Ring** (matches the Chantara earrings and pendant). "Kaman"/"Kamān" unified as **Kamān**. Products sharing a name get a stone suffix: Kumud, Pākhi, Indu, Kamān (– Mother-of-Pearl / – Firozi / – Polki), Vakra (– Polki / – Multicolour).
- **Colours left empty** where the catalogue only says "stone polki" (no colour given), so those pieces don't appear under a colour filter until the owner sets one. Firozi is filed as turquoise, jade as green, 3+ stone colours also as multicolour.
- **Family** groups pieces that share a name or motif: elephant (Gajā, Vakra), moon (Indu, Kamān, Soma, Ardh), lotus (Kumud, Padma), wings (Pākhi), parrot (Mithū, Piku), plus name pairs (Chantara, Harakh, Juhi, Vaani).
- **Seeding is non-destructive.** Re-running refreshes only catalogue text on existing products; price, stock, flags, positions and variants are owner-managed in `/admin` and never overwritten. Settings, pages and FAQs are only filled where empty.
- **Shipping rule not reset to ₹0.** The prompt asked for a ₹0 placeholder rule, but the owner had already set ₹100; the seed only creates a rule (named "SET THE REAL RATE IN ADMIN") if none exists.
- **Payment FAQ says no cash on delivery** (the prompt listed COD; COD was removed earlier).
- ~~Variants: Dori Ring and Harakh Earrings as colour variants.~~ Superseded below: every colour is its own product. Stock 5 per product is a placeholder.
- **Placeholder images:** one ivory 1200×1500 JPEG in `product-images/placeholders/`, used for the four expected roles of every product until real photos replace them.
- **Complete the Look:** 3 per product, chosen by score: same family first (across categories), then shared motif (celestial/nature/animal weigh more than pearl), shared colour and similar price; at most two from one category, and pieces already suggested often are penalised so suggestions spread across the catalogue (no piece appears more than 7 times).

### Merchandising order (launch)
Heroes in the first four slots, statement and minimal pieces alternating, prices mixed, and no two pieces of the same family side by side (the seed enforces this).
- **Earrings:** Meher, Harakh – White, Mallika, Chantara, Dahlia, Vaani – Blue, Arohi, Aira, Rani, Juhi – Green & Blue, Nevara, Nir, Gulbahar, Jharna, Misri, Vaani – Pink, Boond, Tavira, Harakh – Pink, Mrina, Inara, Reva, Juhi – Red, Orva, Avira.
- **Necklace Sets:** Mayurika, Rohini, Noor, Mithū, Ziya, Channak, Tara, Gul.
- **Rings:** Ekam, Dori – White, Harakh, Bindu, Dori – Green, Mārakat, Chantara, Dori – Pink, Aabha, Beej (unpublished until it has a price).
- **Pendants:** Rangmil, Gajā I, Soma, Kumud – MoP, Piku, Indu – Polki, Dwandva, Pākhi – MoP, Āhna, Vakra – Polki, Chantara, Kalāsh, Padma, Kamān – MoP, Gajā II, Ardh, Kumud – Firozi, Indu – MoP, Pākhi – Firozi, Vakra – Multicolour, Kamān – Polki, Gajā III.
- **New Arrivals:** Mayurika, Mallika, Noor, Ekam, Mithū, Arohi, Rohini, Rangmil, Ziya, Gulbahar, Gul, Channak, Tara.
- **Best Sellers:** Meher, Gajā I, Dahlia, Harakh Ring, Gul, Kumud – MoP, Rani, Juhi – Red.

## 2026-10-03 — Colours as products
- **Every colour is its own product** (owner's decision), as Juhi and Vaani already were. Dori Ring → Dori Ring – White / Green / Pink; Harakh Earrings → Harakh Earrings – White / Pink. 65 products in total. No product uses `product_variants`; the table stays but is unused.
- The two products first seeded with variants were **renamed in place** to their White versions (keeping their images and links); their 5 seed-created variant rows were removed. The seed refuses to do this for a product that has ever been ordered.
- Short descriptions name the colour instead of "available in … colours/variants" (e.g. "stackable bands with green stone polki").
- Each colour has 5 in stock (placeholder). Same-colour siblings are kept apart in the category order (Dori at 2, 5, 8 in Rings; Harakh at 2 and 19 in Earrings).
- **`pnpm seed --reset-merchandising`** re-applies launch flags, category order and Complete the Look over existing products. Used once now, before any /admin edits exist; normal re-runs leave them alone. Complete the Look links are only added for products that have none, so a product never gets more than 3.

## 2026-10-03 — Site shell and UI primitives
- **Cache Components on** (`cacheComponents: true`). Storefront data is read in `src/lib/data/*` with `"use cache"` + `cacheTag` (tags in `src/lib/cache-tags.ts`) through a cookie-free anon client (`src/lib/supabase/public.ts`); admin edits will call `revalidateTag(tag, "max")`. `unstable_cache` is deprecated in Next 16.
- **Database types without the CLI link:** `pnpm db:types:local` applies the migrations to PGlite and writes `src/lib/supabase/types.ts` in the `supabase gen types` shape (tables, relationships, functions, enums). Switch to `pnpm db:types` once linked.
- **Logo traced to SVG.** `/docs/brand` only has PNGs, so the wordmark, tagline and elephant were traced (potrace) into inline SVG paths (`src/components/ui/logo-paths.ts`). Replace with the designer's SVGs when supplied.
- **URL scheme:** `/collections/{all|earrings|necklace-sets|rings|bracelets|pendants|new-arrivals|best-sellers|gifts-for-her}`, styles as `/collections/all?style=…`, products `/products/[slug]`, `/search?q=`, `/wishlist`, and `/about`, `/contact`, `/faqs`, `/shipping-returns`, `/privacy-policy`, `/terms` (all in `src/lib/routes.ts`).
- **Mega-menu headings are ink with a gold hairline**, not gold text: gold on off-white is ~2.3:1, below WCAG AA. The editorial tile uses the first active hero slide's image; until one exists it shows an ivory tile with the elephant mark.
- **Mega-menu opens on hover or click/Enter**, not on focus (opening on focus re-opened it after Esc returned focus to SHOP).
- **Drawers are native modal `<dialog>`s** (focus trap, inert page, Esc and backdrop close, focus returns), fading via CSS `@starting-style`; no slide animation.
- **Wishlist on mobile:** the mobile header has only cart and menu (as specified), so a Wishlist link sits at the bottom of the mobile menu next to Instagram and WhatsApp.
- **Mobile search row scrolls away**; only the header row is sticky, to keep the viewport for the jewellery.
- **Carousel dots** are 24×44px tap targets (44px tall, narrower so eight fit on a phone).
- **Brand glyphs** (WhatsApp, Instagram) come from `simple-icons`; Lucide no longer ships brand logos. Lucide icons use a 1.25 absolute stroke. The cart icon is a shopping bag.
- **Footer pattern strip** is a 96×40 ivory elephant-and-dot tile (`public/brand/elephant-pattern.svg`) at 12% opacity.
- **Cart drawer** is mounted in the shell with an empty state; Prompt 9 fills it.
- **Montserrat 600** is loaded for the small bold uppercase labels.
