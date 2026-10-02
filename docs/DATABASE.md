# Erayah database

Postgres on Supabase. Migrations live in `supabase/migrations/`. Money is always an integer number of **paise** (₹2,350 = `235000`); format only for display. Row Level Security is on for every table.

## Tables

### Catalogue
| Table | Purpose |
|---|---|
| `categories` | The five shop categories (Bracelets starts as `is_coming_soon`), with SEO fields and sort order. |
| `products` | Every piece: price (null while a draft), materials/stones/colours/styles arrays for filters and search, merchandising flags and positions, stock, and a trigger-maintained `search_vector`. |
| `product_variants` | Options for products sold in more than one colour (Dori Ring, Harakh Earrings); when present, stock lives here instead of on the product. |
| `product_images` | Product photos and video by role; the card shows `worn_closeup`, hover shows `lifestyle`, and the product page shows all by `sort_order`. |
| `product_relations` | Hand-picked "Complete the Look" and cart cross-sell links between products. |
| `lifestyle_tiles` | Editorial images placed between product rows on a category page (or Shop All when `category_id` is null). |
| `hero_slides` | Homepage hero carousel slides, with separate desktop and mobile images and a pill label. |

### Settings and content
| Table | Purpose |
|---|---|
| `site_settings` | One row (`id = 1`) of site-wide settings: announcement, brand story, contact details, GST and invoice prefix. |
| `shipping_rules` | Shipping rates by pincode prefix, state or default; the most specific active rule wins. |
| `coupons` | Discount codes (percent or flat), case-insensitive, with dates, minimum order, cap and usage limit. |
| `gift_cards` | Gift card codes with a remaining balance. |
| `gift_card_redemptions` | Each use of a gift card on an order; `reversed_at` is set if the order is released. |
| `faqs` | FAQ entries (markdown answers), grouped and ordered. |
| `testimonials` | Customer quotes shown on the site. |
| `pages` | Editable content pages: about, shipping-returns, privacy-policy, terms (markdown). |
| `admin_users` | Supabase Auth users who may use `/admin`, as `owner` or `staff`. Only owners can add or change admins. |
| `contact_messages` | Contact form submissions, read in `/admin`. The site sends no email. |

### Orders
| Table | Purpose |
|---|---|
| `orders` | One row per checkout: customer, address, every money amount, Razorpay ids, invoice number, internal-only courier/tracking/notes, and an `access_token` for the confirmation page. |
| `order_items` | Line items with name, image, price and quantity snapshotted at order time. |
| `order_events` | Timeline of status changes, payments and notes for each order. |
| `document_counters` | Gap-free counters behind order numbers (per calendar year) and invoice numbers (per financial year). |

## Functions

| Function | Who can call it | What it does |
|---|---|---|
| `is_admin()` / `is_owner()` | anyone (used by RLS) | Whether the signed-in user is in `admin_users` (as an owner). |
| `create_order(payload jsonb)` | service role only | Places an order in one transaction: locks rows, re-reads prices, checks and takes stock, applies coupon, shipping, GST and gift card, writes the order, items and first event. Returns `{order_id, order_number, access_token, total, status, payment_method}`. Errors are stable codes such as `OUT_OF_STOCK:<id>` (full list at the top of the remove_cod_set_shipping migration). |
| `restore_stock(order_id)` | service role only | Puts back stock, coupon usage and gift card balance for an order that won't be fulfilled. Safe to call twice. Does not change the status. |
| `expire_pending_orders(interval)` | service role only (pg_cron) | Cancels Razorpay orders unpaid after 30 minutes and releases what they held. Runs every 10 minutes. |
| `assign_invoice_number(order_id)` | service role only | Gives an order its GST invoice number (`ERY/26-27/00001`). Call it when a Razorpay payment is confirmed; gift-card-only orders get one automatically. |
| `quote_shipping(pincode, state, order_value)` | service role only | The shipping fee and delivery estimate for an address; use it for the cart estimate too. |

## Numbering
- **Order number:** `ERY-2026-00001`, restarts each calendar year (Asia/Kolkata).
- **Invoice number:** `ERY/26-27/00001`, consecutive within the Indian financial year (April–March), as GST requires. Only paid orders get one, so abandoned payments leave no gaps.

## Money rules
- `subtotal` = sum of database prices × quantity.
- `discount` = coupon, capped by `max_discount` and the subtotal.
- `shipping_fee` = most specific matching rule; 0 once the discounted subtotal reaches that rule's `free_above`. A more specific rule (pincode or state) does not inherit the default rule's free-shipping threshold, so set `free_above` on each rule that should have one.
- `gst_amount` = 3% of (subtotal − discount + shipping). When prices include GST it is the portion already inside; otherwise it is added on top.
- `gift_card_amount` is applied last, like a payment, and is capped at the total.
- `total` = what the customer pays online through Razorpay. There is no Cash on Delivery. 0 means a gift card covered everything: `payment_method` is `gift_card` and the order is marked paid at once.

## Storage buckets
| Bucket | Access |
|---|---|
| `product-images` | Public read, admin write. Images and product videos (50 MB limit). |
| `site-media` | Public read, admin write. Hero slides, category and lifestyle tiles, About page photos. |
| `invoices` | Private. Files are read only through signed URLs made by the server. |

## Things to know
- A late Razorpay payment can arrive after its order has expired (cancelled, stock released). The payment webhook must handle that case: re-check stock and either restore the order or flag it for a refund.
- The first owner is added by hand once: create the user in Supabase Auth, then run `insert into admin_users (user_id, email, role) values ('<user id>', '<email>', 'owner');` in the SQL editor.
- Default shipping is ₹100 flat (no free-shipping threshold yet); change it in `/admin`.
- Regenerate `src/lib/supabase/types.ts` with `pnpm db:types` after every migration.
- Migrations up to `20261003001000` were applied by pasting them into the SQL editor, so Supabase's migration history doesn't know about them. Before the first `pnpm db:push`, mark them as applied, or db push will try to run them again:
  `pnpm supabase migration repair --status applied 20261003000100 20261003000200 20261003000300 20261003000400 20261003000500 20261003000600 20261003000700 20261003000800 20261003000900 20261003001000`
