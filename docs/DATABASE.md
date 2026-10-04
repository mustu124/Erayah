# Erayah database

Postgres on Supabase. Migrations live in `supabase/migrations/`. Money is always an integer number of **paise** (₹2,350 = `235000`); format only for display. Row Level Security is on for every table.

## Tables

### Catalogue
| Table | Purpose |
|---|---|
| `categories` | The five shop categories (Bracelets starts as `is_coming_soon`), with SEO fields and sort order. |
| `products` | Every piece: price (null while a draft), materials/stones/colours/styles arrays for filters and search, merchandising flags and positions, stock, and a trigger-maintained `search_vector`. |
| `product_variants` | Unused at launch: every colour is sold as its own product (e.g. Dori Ring – Green). Kept for future options; when a product has variants, stock lives here instead of on the product. |
| `product_images` | Product photos and video by role; the card shows `worn_closeup`, hover shows `lifestyle`, and the product page shows all by `sort_order`. |
| `product_relations` | Hand-picked "Complete the Look" and cart cross-sell links between products. |
| `lifestyle_tiles` | Editorial images placed between product rows on a category page (or Shop All when `category_id` is null). |
| `hero_slides` | Homepage hero carousel slides, with separate desktop and mobile images and a pill label. |

### Settings and content
| Table | Purpose |
|---|---|
| `site_settings` | One row (`id = 1`) of site-wide settings: announcement, brand story (and its highlighted phrase), contact details and business hours, GST and invoice prefix. |
| `shipping_rules` | Shipping rates by pincode prefix, state or default; the most specific active rule wins. |
| `gift_cards` | Gift card codes with a remaining balance. |
| `gift_card_redemptions` | Each use of a gift card on an order; `reversed_at` is set if the order is released. |
| `faqs` | FAQ entries (markdown answers), grouped and ordered. |
| `testimonials` | Customer quotes shown on the site. |
| `pages` | Editable content pages: about, shipping-returns, privacy-policy, terms (markdown), plus `images` (jsonb: About page founder/story photos in site-media). |
| `admin_users` | Supabase Auth users who may use `/admin`, as `owner` or `staff`. Only owners can add or change admins. |
| `search_misses` | Searches that found nothing (term, count, first and last seen), logged by the server for the owner to read in /admin. |
| `contact_messages` | Contact form submissions, read in `/admin/messages`. The site sends no email. `ip_hash` (a salted hash, never the IP) rate-limits senders. |

### Orders
| Table | Purpose |
|---|---|
| `orders` | One row per checkout attempt: customer, address, every money amount, Razorpay ids, invoice number and stored PDF path (`invoice_path`), internal-only courier/tracking/notes, the checkout's `idempotency_key`, and an `access_token` for the confirmation page. |
| `order_items` | Line items with name, image, price and quantity snapshotted at order time. |
| `order_events` | Timeline of status changes, payments and notes for each order. |
| `document_counters` | Gap-free counters behind order numbers (per calendar year) and invoice numbers (per financial year). |

## Functions

| Function | Who can call it | What it does |
|---|---|---|
| `is_admin()` / `is_owner()` | anyone (used by RLS) | Whether the signed-in user is in `admin_users` (as an owner). |
| `create_order(payload jsonb)` | service role only | Places an order in one transaction: locks rows, re-reads prices, checks and takes stock, applies shipping, GST and gift card, writes the order, items and first event. With `dry_run: true` it only prices the cart (the checkout summary). With an `idempotency_key` used before, it returns that order (`existing: true`) unchanged. Returns ids, status and the full breakdown (subtotal, shipping, gift card, GST, total, delivery estimate, lines). Errors are stable codes such as `OUT_OF_STOCK:<id>`, `GIFT_CARD_INVALID`, `NO_SHIPPING_RULE` (see `src/lib/checkout/errors.ts`). |
| `restore_stock(order_id)` | service role only | Puts back stock and gift card balance for an order that won't be fulfilled. Safe to call twice. Does not change the status. |
| `expire_pending_orders(interval)` | service role only (pg_cron) | Cancels Razorpay orders unpaid after 60 minutes and releases what they held. Runs every 30 minutes. |
| `confirm_payment(razorpay_order_id, payment_id, signature, amount, source)` | service role only | Marks a Razorpay order paid and placed and gives it an invoice number. Called by `/api/checkout/verify` and the webhook (each checks the signature first); whichever is first wins, repeats change nothing. Rejects a wrong amount (`AMOUNT_MISMATCH`). A payment for an expired order takes the stock again if it is still there, otherwise records "REFUND NEEDED" on the order. Returns `newly_placed` so the invoice is made once. |
| `mark_payment_failed(razorpay_order_id, payment_id, reason)` | service role only | Records a failed attempt (webhook). The order stays pending for a retry until it expires. |
| `reserve_order_stock(order_id)` | service role only | All-or-nothing: takes an expired order's stock and gift card balance again (used by `confirm_payment`). |
| `assign_invoice_number(order_id)` | service role only | Gives an order its GST invoice number (`ERY/26-27/00001`). Call it when a Razorpay payment is confirmed; gift-card-only orders get one automatically. |
| `search_products(q, p_limit, p_offset)` | anyone (storefront) | Product search over published products: prefix full-text on `search_vector` (accents stripped), falling back to pg_trgm word similarity on name, category, styles and stones when full-text finds nothing. `q` is the app's synonym-expanded query: space-separated groups (AND), `\|`-separated alternatives (OR). Returns id, slug, name, price, rank and the total count. |
| `log_search_miss(term)` | service role only | Adds 1 to a zero-result search term (lower-cased, trimmed). |
| `analytics_*` (summary, sales_over_time, by_category, product_sales, low_stock, by_location, gift_cards, repeat_customers) | service role only | The figures on /admin/analytics, from orders and items. Each takes India-time dates and an "include test orders" flag, and refuses callers who are neither service role nor an admin. `analytics_sales(from, to, include_test)` is the shared definition of a sale. |
| `quote_shipping(pincode, state, order_value)` | service role only | The shipping fee and delivery estimate for an address; use it for the cart estimate too. |

## Test data
- `orders.is_test` and `gift_cards.is_test` mark rows made by `pnpm seed:test-orders` (and gift cards left by end-to-end tests). Analytics ignores them; `pnpm clear:test-orders` deletes them.

## Numbering
- **Order number:** `ERY-2026-00001`, restarts each calendar year (Asia/Kolkata).
- **Invoice number:** `ERY/26-27/00001`, consecutive within the Indian financial year (April–March), as GST requires. Only paid orders get one, so abandoned payments leave no gaps.

## Money rules
- `subtotal` = sum of database prices × quantity.
- `shipping_fee` = most specific matching rule; 0 once the subtotal reaches that rule's `free_above`. A more specific rule (pincode or state) does not inherit the default rule's free-shipping threshold, so set `free_above` on each rule that should have one.
- `gst_amount` = 3% of (subtotal + shipping). There are no coupons or discounts. When prices include GST it is the portion already inside; otherwise it is added on top.
- `gift_card_amount` is applied last, like a payment, and is capped at the total.
- `total` = what the customer pays online through Razorpay. There is no Cash on Delivery. 0 means a gift card covered everything: `payment_method` is `gift_card` and the order is marked paid at once.

## Storage buckets
| Bucket | Access |
|---|---|
| `product-images` | Public read, admin write. Images and product videos (50 MB limit). |
| `site-media` | Public read, admin write. Hero slides, category and lifestyle tiles, About page photos. |
| `invoices` | Private. One PDF per paid order (`<year>/<order number>.pdf`), streamed to the customer by `/api/invoice/<order number>?t=<token>`. |

## Things to know
- A late Razorpay payment can arrive after its order has expired (cancelled, stock released). `confirm_payment` re-takes the stock if it can; otherwise the order stays cancelled with payment `paid` and a "REFUND NEEDED" note for the owner to refund from the Razorpay dashboard.
- The first owner is added by hand once: create the user in Supabase Auth, then run `insert into admin_users (user_id, email, role) values ('<user id>', '<email>', 'owner');` in the SQL editor.
- Default shipping is ₹100 flat (no free-shipping threshold yet); change it in `/admin`.
- Regenerate `src/lib/supabase/types.ts` with `pnpm db:types` after every migration (`pnpm db:types:local` builds them from the migration files without a connection).
- **Realtime:** `orders` is in the `supabase_realtime` publication (migration 14); admins receive changes through RLS.
- **Migrations are idempotent and applied through the CLI**, never pasted into the dashboard: `pnpm db:push` (also `pnpm db:migrations` to compare local and remote, `pnpm db:types` to regenerate types from the live schema). `scripts/supabase-db.mjs` connects through the session pooler (`aws-0-ap-northeast-2`) with `SUPABASE_DB_PASSWORD` from `.env.local`, so no `supabase login`/`link` is needed. The remote migration history is in sync up to `20261004001600` (0100–1200 were marked applied with `migration repair` on 2026-10-03, after being pasted earlier).
- `pnpm test:db` applies every migration in PGlite, re-runs the checkout migration to prove it's idempotent, and checks there is exactly one expiry cron job.
