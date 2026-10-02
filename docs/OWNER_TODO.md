# Owner to-do

Things only you can do. Placeholders are in use until each is done. Tick items off as you go.

## Access and accounts
- [ ] **Allow the CLAUDE.md "How you work (autonomy)" section and `.claude/settings.json`.** The assistant's safety check blocks it from editing its own instructions and permissions; add them yourself (text was given in chat on 2026-10-03).
- [ ] **Run migration `supabase/migrations/20261003001100_remove_coupons.sql`** in the Supabase SQL editor (removes coupons). The assistant can't run SQL on your project until the CLI is linked.
- [ ] **Supabase CLI login and link**, so migrations and type generation can run from here: `pnpm supabase login`, then `pnpm supabase link --project-ref <ref>` (asks for the DB password). Then run the `migration repair` command in `docs/DATABASE.md` once, and `pnpm db:types`.
- [ ] **Vercel**: run `pnpm vercel login`, import the GitHub repo `mustu124/Erayah` in the Vercel dashboard (so each push makes a preview), and add these env vars for Production and Preview:
  `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Sensitive), `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (Sensitive), `RAZORPAY_WEBHOOK_SECRET` (Sensitive), `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_INSTAGRAM_URL`.
  If you added `RESEND_API_KEY`, `ORDER_EMAIL_FROM`/`NOTIFICATION_EMAIL_FROM` or `OWNER_NOTIFICATION_EMAIL` earlier, delete them.
- [ ] **Razorpay test keys** in `.env.local` (currently `rzp_test_placeholder`): Key ID, Key Secret, and a webhook secret. Live keys and KYC only at launch.
- [ ] **Instagram profile URL** in `.env.local` (currently `https://www.instagram.com/`).
- [ ] **Confirm the admin login.** `admin@forever.com` was made the owner in `admin_users` (it was the only Auth user). If that isn't the right account, say so.
- [ ] **Turn off public sign-ups** in Supabase → Authentication → Sign In / Providers ("Allow new users to sign up"). Only admins log in; you can still invite admins from the dashboard.
- [ ] **GitHub repo is public.** Consider making it private.

## Brand files
- [ ] **Sloop font file** (licensed web font: `.woff2` preferred) for highlight words. Currently STIX Two Text Italic.
- [ ] **Logo as SVG** (wordmark, tagline and elephant mark). Only PNGs exist in `/docs/brand`; the site uses traced versions for now, which look right but the designer's originals are better.

## Business and legal
- [ ] **Business details for invoices**: legal name, registered address, GSTIN, and whether prices include GST (assumed yes, 3%). Stored in `site_settings`.
- [ ] **Shipping**: ₹100 flat is set "for now". Confirm the rate and whether there is a free-shipping threshold.
- [ ] **Policies** for legal sign-off: Privacy Policy and Terms & Conditions are seeded as drafts marked "DRAFT – REVIEW BEFORE LAUNCH", with placeholders [LEGAL BUSINESS NAME], [REGISTERED ADDRESS], [EMAIL], [PHONE], [CITY], [DATE] and a Grievance Officer [NAME]. Shipping & Returns uses the catalogue text.
- [ ] **FAQs** — final text to be provided by the owner at the end. 12 drafts are seeded in the meantime.

## Content
- [ ] **Beej Ring price** (missing from the Rings catalogue).
- [ ] **Products that share a name** were seeded with a stone suffix (e.g. "Kumud Pendant – Mother-of-Pearl", "Vakra Pendant – Multicolour"), and "Kaman"/"Kamān" as Kamān. Confirm or rename in /admin.
- [ ] **"Chanatara Ring"** in the catalogue was seeded as **Chantara Ring** (to match the earrings and pendant). Confirm the spelling.
- [ ] **Stock**: every product was seeded with 5, including each colour of Dori Ring and Harakh Earrings (now separate products). Set real stock in /admin.
- [ ] **Colours** for pieces described only as "stone polki" (several rings and pendants) are empty, so they don't show under a colour filter. Set them in /admin.
- [ ] **Review the product descriptions** written in Erayah's voice, especially the name meanings (e.g. Harakh = joy, Mārakat = emerald, Kamān = bow). Edit any that aren't right.
- [ ] **Review the launch flags and order** (New Arrivals, Best Sellers, Gifts for Her, hero pieces, category order) listed in `docs/DECISIONS.md`.
- [ ] **Product photos**: four per product (worn close-up, lifestyle, product-only, detail), plus optional flat lay / video.
- [ ] **Hero slides, category tile images, lifestyle images.** The first active hero slide also becomes the image in the desktop Shop menu.
- [ ] **Founder story** — to be provided by the owner at the end. The About page shows [FOUNDER STORY TO BE ADDED] until then; the brand story uses the brand guidelines' text.
- [ ] **About / brand story review**, **testimonials**, **announcement bar text**, support email and phone.
- [ ] **Domain** and DNS (for launch).
