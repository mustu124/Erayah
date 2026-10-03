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
- ~~URL scheme `/collections/…`~~ — replaced by `/shop/…` (see Homepage below). Other URLs: products `/products/[slug]`, `/search?q=`, `/wishlist`, and `/about`, `/contact`, `/faqs`, `/shipping-returns`, `/privacy-policy`, `/terms` (all in `src/lib/routes.ts`).
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

## 2026-10-03 — Homepage
- **Shop URLs are `/shop/…`** (the homepage prompt links to `/shop/new-arrivals`): `/shop` is Shop All, `/shop/<category>`, `/shop/new-arrivals`, `/shop/best-sellers`, `/shop/gifts-for-her`, styles as `/shop?style=…`. Changed once in `src/lib/routes.ts`.
- **Hero falls back to the six hero products** (labelled with their category, linking to it) until the owner adds hero slides with real photographs.
- **Hero crossfade is hand-built** (stacked slides, 400ms opacity, autoplay every 6s, paused on hover, touch, keyboard focus and prefers-reduced-motion; swipe on touch) rather than Embla, so the timing is exact. Art direction uses `<picture>` with `getImageProps` (mobile 4:5 image under 1024px); the first slide is eager with `fetchPriority="high"`. Next 16 deprecates `priority` in favour of `preload`.
- **LCP:** with placeholder images the largest element is the faint giant ERAYAH text, which paints immediately (~0.6s desktop). Once real photography is in, the first hero image is the LCP candidate and is already prioritised.
- **Placeholder image** now carries a faint elephant mark (`placeholders/ivory-elephant-1200x1500.jpg`); the seed moved all placeholder rows to it.
- **Shop by Category shows Shop All on mobile too**, so the 3-column grid is complete at every width. "Coming soon" sits under the Bracelets name (an overlay on the small mobile tile wrapped).
- **Category tile image:** the category's own image if set in admin, otherwise the worn close-up of its first product in the curated order.
- **Product card heart:** 60% opacity on touch screens; on mouse devices hidden until the card is hovered or the heart is focused; saved hearts always show (filled). The hover image swap only happens on devices that can hover.
- **New Arrivals band is ivory;** with placeholder images the cards blend into it. Real photographs will separate them.
- **Homepage sections live in `src/app/(store)/_components/`** (page-specific); the reusable card is `src/components/product/ProductCard.tsx`.

## 2026-10-03 — Product photography import
- **Source:** `/assets/Product images/{Earrings,Necklace,Pendants,Rings}_img/`, 55 PNGs (583 MB) with camera file names (IMG_5418, UUIDs, "View recent photos 4"), so names could not be matched. Kept out of git (`/assets/` in `.gitignore`); the site only loads images from Supabase storage.
- **Matching by image content:** each catalogue PDF photo was extracted with its numbered heading, and every asset was matched to it with SIFT features + RANSAC (hundreds to 1,600 inliers for true matches vs. under 35 for others). Six were resolved by eye: one photo shared by both Vaani pairs, both Juhi pairs and both Vakra pendants; the Harakh pair photo; Channak (crescent links with ghunghroo); and a worn Chantara pendant shot. The result is `import/mapping.json` (product → files, role, shot type, confidence, note).
- **Roles:** nearly every product has one photograph. The best on-body shot is `worn_closeup`; other photos are `product_only`. When there is no separate styled shot, the `lifestyle` row reuses the `worn_closeup` file, so every card has both rows and simply doesn't swap on hover. The product page gallery must de-duplicate by `storage_path`.
- **`pnpm import:images`** (`scripts/import-images.ts`): EXIF auto-rotate (25 photos were rotated), metadata stripped, max 2400px, WebP q82, width/height and a 16px blur recorded, uploaded as `products/<slug>/<role>-<n>-<hash>.webp`. File names carry a content hash so a changed image gets a new URL (no stale CDN or image-optimiser cache); files from earlier runs are removed. Replaces only the imported products' `product_images` rows. Flags: `--dry-run`, `--only=<slug>`, `--products-only`, `--homepage-only`. No videos were supplied (ffmpeg isn't installed; videos would upload untranscoded and be logged).
- **Seed fix:** `pnpm seed` now adds placeholder images only for products with no images at all, so it can never mix placeholders into photographed products.
- **Homepage carousels hide products with no photographs** (filter in `getNewArrivals`/`getBestSellers`). Rani Earrings stays a Best Seller in the database and appears once photographed.
- **Hero slides** (cropped 4:5 with sharp's attention strategy, desktop 1600×2000, mobile 1080×1350, `site-media/hero/import-*`): 1 Gul Choker Set → Necklace Sets, 2 Gulbahar Earrings → Earrings, 3 Kumud Pendant (mother-of-pearl) → Pendants, 4 Harakh Ring with a lily → Rings, 5 Channak Set → Necklace Sets. Only four categories have products, so Necklace Sets appears twice. Re-imports replace only slides with the `hero/import-` prefix; slides added in admin stay.
- **Category tiles** (1200² square, `site-media/categories/`): Earrings = Aira (worn; cropped from the top so the earring is in frame), Necklace Sets = Mithū (worn), Rings = Ekam (worn), Pendants = Gajā pendants (worn). Bracelets stays on its coming-soon tile.
- **Verified:** served images are AVIF, at most ~50 KB at 375px and ~26 KB at 1280px; layout shift 0.0001.

## 2026-10-03 — Collection pages
- **Routes:** `/shop` (Shop All), `/shop/[slug]` for the five categories and the curated lists (new-arrivals, best-sellers, gifts-for-her), `/shop/style/[style]` (STYLE_PAGES in `src/lib/collection/scopes.ts`; "Jhumkas & Chaandbaalis" is one combined page, `jhumkas-chaandbaalis`). Menu style links moved there from `/shop?style=`.
- **Filters live in the URL** (`availability`, `min`/`max` in rupees, `colour`, `category`, `style`, `gift=1`, `sort`, `page`; defaults omitted). Within a group values are OR, across groups AND. Changing a filter pushes the URL inside a transition (`FilterProvider`, with `useOptimistic` so the selection shows at once) and resets to page 1; Server Components re-render the grid, no full reload.
- **All filtering, sorting and paging runs in Postgres** via PostgREST (`getCollectionPage`, 24 per page with an exact count). Facets (availability counts, price histogram of 24 bins, colours, styles, categories, gifts) are computed on the server over the whole scope, not narrowed by the current filters. Both are `"use cache"` with the `products`/`categories` tags.
- **Curated order across categories** (Shop All, styles, Gifts for Her) sorts by `merch_position` then category, so every category's first pick comes first, then the second picks, keeping the mix varied. New Arrivals and Best Sellers use their own positions.
- **Style filter** offers shapes (studs, danglers, jhumkas, chaandbaalis, bali, ear cuff, shoulder drops, drops, choker, necklace set, stackable) plus minimal, statement and pearl, only those present in the scope and not on every piece in it.
- **Lifestyle tiles** appear only in Curated order with no filters, and don't count towards the 24. Configured tiles (`lifestyle_tiles`, none yet) follow their absolute curated position. Without them, product photos become tiles after every 8 products on mobile and every 12 on desktop (never after the last product, never two in a row), preferring pieces not on the current page; with only one page of products (most categories) they reuse on-page pieces from the far end of the page. The tile captions the piece's name and links to it.
- **Scroll memory:** `ScrollRestorer` saves `scrollY` per full URL in sessionStorage (on scroll, on link click and on pagehide) and restores it only for back/forward navigations (a `popstate` flag set by `HistoryFlag` in the store layout, or a back_forward page load). Verified with Playwright on Chromium and WebKit at 375 and 1280.
- **Mobile sort** is a native select styled as an outlined "SORT BY" button (the phone's own picker shows the options).
- **Canonical URLs** are the bare collection path (no filters, sort or page). Breadcrumb JSON-LD: Home › Shop › <collection>.
- **Collection pages are partial prerenders:** the title and description are static; the filtered grid streams in the same response.
- **Playwright now runs against a production build** (`next build && next start`) by default: `next dev` under four parallel workers clicked before hydration and threw transient errors. `E2E_DEV=1` uses the dev server.

## 2026-10-03 — Search
- **`search_products(q, p_limit, p_offset)`** (migration `20261003001200`; `limit`/`offset` are SQL keywords, hence the `p_` prefix). Prefix full-text search on the unaccented `search_vector` ranks results (plus name similarity); only when that finds nothing does it fall back to pg_trgm `strict_word_similarity` (threshold 0.4) against name, category, styles and stones. Fuzzy-only-as-fallback keeps "ring" from matching every earring. Security definer with an explicit `is_published` filter. Tested in PGlite against the live catalogue: chandbali, gaja/Gajā, pakhi/Pākhi, kum (prefix), pendnt and necklase all work; short Hindi spellings too far from the catalogue word for trigrams (jumka 0.27, jumki 0.18) are covered by the synonym map.
- **Synonyms** (`src/lib/search/synonyms.ts`) expand each word into OR-alternatives while keeping the word itself (so "moon" matches the Celestial style and "moon-shaped" descriptions): jhumka/jhumki/jumka → jhumkas; chandbali/chaandbali → chaandbaalis; dangler/dangling → danglers, drop → danglers or drops; stud → studs; kundan/jadau → polki; moti → pearl; mop and "mother of pearl" → mother-of-pearl; moon/chand → celestial; elephant/haathi → gaja; lotus → kumud or padma. Accents are stripped and stop words dropped.
- **Fallback until the migration is applied:** if the RPC is missing (PGRST202), search matches name, slug (unaccented, so "gaja" still finds Gajā), short description and styles with ILIKE, ANDing the word groups. No typo tolerance beyond the synonyms. Misses can't be logged until then either.
- **/search** reuses the collection body (filters, sort, chips, 24 per page, scroll memory) scoped to the matching product ids (at most 200, best first). "Curated" is relabelled "Relevance" and orders by rank; no lifestyle tiles; `noindex`. Zero results: "We couldn't find that piece", the quick chips and the Best Sellers carousel, and the term is logged with `after()` (so the response isn't delayed).
- **Header search** is a combobox: quick chips (Studs, Jhumkas, Pearl, Minimal, Polki, Necklace Sets) on focus; after 2 characters a 200ms-debounced dropdown from `/api/search` (cached per query) with up to 6 products, up to 3 category/style/list links and "View all"; arrow keys, Enter and Esc; Enter on the field opens `/search?q=`. It's still a plain GET form without JavaScript, and it keeps text typed before the page finished loading. Added a `polki` style page for the chip.
- **Next 16 keeps the previous page mounted but hidden** (React Activity) for instant back navigation, so tests count only visible cards. The store layout marks `<html data-hydrated>` once interactive; tests wait for it instead of network idle.
