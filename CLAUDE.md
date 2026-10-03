# ERAYAH — Project brief

## What we are building
A mobile-first, premium e-commerce website for Erayah, an Indian handcrafted jewellery brand (22kt gold-plated silver alloy, kundan/jadau/polki craftsmanship). Tagline: "Heirlooms, Reimagined." Most visitors arrive from Instagram on a phone, seeing Erayah for the first time. The site must feel like walking into a boutique, not browsing a marketplace. The jewellery is always the hero.

## Stack (do not change)
- Next.js (latest stable, App Router, TypeScript, Server Components by default)
- Tailwind CSS with design tokens defined in tailwind config + CSS variables
- Supabase: Postgres, Auth (admin users only), Storage (images)
- Razorpay (Standard Checkout + webhooks). No Cash on Delivery.
- Hosting on Vercel
- Zod for validation, Zustand (persisted to localStorage) for cart/wishlist/recently viewed
- No customer login of any kind.

## Layout reference
Copy the STRUCTURE of the reference site in /docs/source/Reference_layout-compressed.pdf (Anu Merton). Use Erayah's colours, fonts and content, never the reference's brand name, images or copy. Key patterns to copy:
- Thin announcement bar on top in the dark accent colour with small light text.
- Header: wordmark on the left, nav links (SHOP, ABOUT, CONTACT, FAQS) in small uppercase tracking-wide text, a wide inline search field with a square dark search button, then wishlist and cart icons with a count badge. No account icon, no currency selector.
- Desktop SHOP opens a full-width mega-menu panel with uppercase column headings and light-weight links.
- Mobile: wordmark left, cart and hamburger right, full-width search bar under the header. Hamburger opens a full-height drawer with the elephant mark top-left, cart and close top-right, and accordion groups with + / − toggles.
- Hero: one centred portrait image with the word ERAYAH set huge and very faint behind it across the full width, thin outlined oval arrow buttons left and right, a slide counter ("02/05") bottom-left, a pill label naming the category bottom-centre, dot indicators bottom-right.
- Section headers: section title on the left and a small date-style label (e.g. the current month and year) on the right, joined by a thin hairline.
- Product carousels with small round arrow buttons over the images and a dot pager below, then an underlined "Shop All …" link.
- Collection page: "Filters" rail on the left on desktop (availability checkboxes, price histogram range slider, category list), product grid on the right, "SORT BY" select above the grid. On mobile, a FILTERS button and a SORT BY button above a 2-column grid.
- Product page: large image left with thumbnails, details right; mobile stacks image, thumbnail strip, then details. Quantity stepper beside a dark ADD TO CART button, with a heart button.
- A marquee band with the brand mark between repeating words, used ONLY on the product page above "Complete the Look".
- Dark footer block with the wordmark in large light type and link columns.
- Floating round WhatsApp button fixed bottom-right on every page.
- Cart opens as a right-side drawer.

## Brand system (from the Erayah Brand Guidelines)
Colours (the user wants the site mostly white/beige, with important accents in the dark logo shade):
- --ink: #311829 (dark aubergine; logo shade). Primary text, buttons, announcement bar, footer, active states.
- --plum: #600e54. Rare secondary accent only (sale/limited labels, focus rings).
- --gold: #b4a07c. Hairlines, dividers, small icons, price accents, the subtle gold gradient.
- --ivory: #f9eee1. Section backgrounds, product image backgrounds, cards.
- --paper: #ffffff and a warm off-white #fdf9f4 for the main page background.
- --mist: #e5e5e5. Borders and input outlines.
- Gradient: gold #b4a07c → #e9dcc3 for tiny decorative touches only.
Typography:
- Headings: STIX Two Text (regular weight, generous letter-spacing on uppercase labels).
- Body and UI: Montserrat (300–500 weights, 13–15px on mobile).
- Highlight words: Sloop (script, self-hosted from /docs/brand/fonts) or STIX Two Text Italic. Use sparingly, at most one highlighted phrase per section.
Logo: elephant mark assembled from jadau-like segments + ERAYAH wordmark + "HEIRLOOMS, REIMAGINED". Use files from /docs/brand/. The elephant mark is the favicon and the mobile menu icon.
Voice: quiet, assured, warm, heritage-meets-contemporary. Short sentences. No exclamation marks, no discount-shouting.

## Design rules
- Mobile-first. Design at 375px first, then 768px, then 1280px+.
- Lots of whitespace. Thin 1px lines. Square or very slightly rounded corners (max 2px), except pill labels and the WhatsApp button.
- Product images on warm neutral backgrounds; never stark white tiles.
- Motion: smooth opacity fades only (200–400ms). No zoom, parallax, bounce or slide-in animation.
- Product cards show ONLY: image, name, price. Nothing else on the card except a small heart icon on hover/tap.
- Prices in Indian format with the rupee symbol: ₹2,350.
- Accessibility: WCAG AA contrast, focus states visible, all images have alt text, tap targets ≥ 44px.

## Information architecture
Categories: Earrings, Necklace Sets, Rings, Bracelets, Pendants (Bracelets shows a graceful "Coming soon" until it has products).
Nav: Shop (New Arrivals, Best Sellers, Gifts for Her, all 5 categories, Shop All), About Erayah, Contact, FAQs.
There is NO Track Order anywhere and NO customer account anywhere.
Footer links: Shop, About Erayah, Contact, FAQs, Shipping & Returns, Privacy Policy, Terms & Conditions, Instagram, WhatsApp.
Homepage sections, strictly in this order and nothing else: Hero, Shop by Category, New Arrivals, Best Sellers, Brand Story (2–3 lines + CTA), Footer.

## Commerce rules
- Guest checkout only. Payment: Razorpay only (UPI, cards, wallets, netbanking). There is NO Cash on Delivery.
- All prices, shipping and totals are computed on the server from the database. Never trust prices sent by the browser.
- After a successful order the customer sees a confirmation page showing the invoice, with a Download PDF button. The invoice is NEVER emailed, SMSed or WhatsApped to the customer; it exists only on that screen. That is the end of the customer journey.
- There are NO coupons or discount codes anywhere.
- The site sends NO email at all (no email service is used). The owner sees new orders in /admin, and contact form messages are saved to the database and read in /admin.
- The owner manages everything in /admin (products, images, merchandising order, homepage, orders, gift cards, shipping rates, content, settings).
- Shipping policy text (use verbatim on product pages and Shipping & Returns): delivery in 7–10 working days; express on request; handcrafted variations are natural; returns/exchanges only for transit damage or wrong product, unworn and in original packaging; return shipping is paid by the customer.

## Engineering rules
- Server Components and server actions/route handlers for data; client components only where interactive.
- Never expose SUPABASE_SERVICE_ROLE_KEY or RAZORPAY_KEY_SECRET to the browser.
- Row Level Security on every table.
- Use next/image everywhere, with explicit sizes and blur placeholders.
- Revalidate cached pages with revalidateTag when admin edits data.
- Keep components small, typed and in /components/{ui,layout,product,cart,admin}.
- Target: Lighthouse mobile performance ≥ 90, LCP < 2.5s, page load < 3s on 4G.

## Repo map
Next.js 16 (App Router, Turbopack), Tailwind 4, pnpm. Next 16 differs from older versions — see @AGENTS.md.
- /docs/source/ — client inputs: Erayah_Website_Requirements.pdf, Brand Guidelines - Erayah Final.pdf, Reference layout-compressed.pdf, Product Catalogue PDFs (Earrings, Necklace, Pendants, Rings).
- /docs/brand/ — Brand Guidelines/, Fonts/, Primary Logo/, Tertiary Logo & Logomarks/.
- src/app/(store)/ storefront · src/app/admin/ admin · src/app/api/ route handlers.
- src/app/globals.css — design tokens (Tailwind 4 `@theme`: colours, fonts, type scale, radii). There is no tailwind.config.
- src/app/fonts.ts — next/font setup. Sloop is not available yet; --font-script uses STIX Two Text Italic from src/fonts/.
- src/lib/env/schema.ts — zod env schema, checked in next.config.ts. Server code reads `env` from src/lib/env.ts (server-only); client code reads `publicEnv` from src/lib/env/public.ts.
- src/lib/supabase/ — client.ts (browser), server.ts (cookies), admin.ts (service role, server-only), public.ts (cookie-free anon, for cached reads), types.ts (generated by `pnpm db:types`, or `pnpm db:types:local` from the migrations without a CLI link).
- src/lib/data/ — cached storefront reads ("use cache" + cacheTag; tags in src/lib/cache-tags.ts). Cache Components is on.
- src/lib/routes.ts (every URL) · src/lib/navigation.ts (menus and footer links) · src/lib/format/ (price in paise → ₹, month label).
- src/components/ui/ — primitives (Button, IconButton, QuantityStepper, Price, Pill, SectionHeader, Hairline, Drawer, Accordion, Checkbox, Select, Input, Skeleton, Carousel, Icon, Logo). Review them at /styleguide (noindex, unlinked).
- src/components/layout/ — announcement bar, header (desktop nav + mega-menu, mobile menu drawer, search), footer, WhatsApp button. src/app/(store)/layout.tsx composes the shell.
- src/components/product/ProductCard.tsx — the one product card (4:5 image, name, price; heart; hover swap). Homepage sections: src/app/(store)/_components/. Catalogue reads: src/lib/data/catalog.ts.
- src/stores/ — zustand: cart and wishlist (persisted to localStorage), ui (drawers, WhatsApp topic). Use useHydrated() before showing persisted values.
- e2e/ — Playwright (Chromium + WebKit at 375px and 1280px): `pnpm test:e2e`.
- supabase/ — CLI config and migrations · scripts/ — seed and one-off scripts.
- scripts/seed.ts — `pnpm seed` (or `pnpm seed --dry-run`) loads the catalogue from docs/catalogue.md (local only, not in git) plus descriptions, launch flags, merchandising order, FAQs and pages. Safe to re-run; never overwrites owner edits.
- docs/DATABASE.md — one line per table, the order/stock functions, numbering and money rules. Read it before touching data code. Only DATABASE.md, DECISIONS.md and OWNER_TODO.md in docs/ are committed.
- scripts/import-images.ts — `pnpm import:images` (`--dry-run`, `--only=<slug>`, `--products-only`, `--homepage-only`) uploads photos from /assets (local only, not in git) per import/mapping.json: WebP, hashed paths, replaces that product's image rows; also hero slides and category tiles.
- Scripts: dev, build, lint, typecheck, test:e2e, db:push, db:types, db:types:local, seed, import:images.
