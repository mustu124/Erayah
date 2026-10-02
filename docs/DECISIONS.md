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
