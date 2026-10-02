# Owner to-do

Things only you can do. Placeholders are in use until each is done. Tick items off as you go.

## Access and accounts
- [ ] **Allow the CLAUDE.md "How you work (autonomy)" section and `.claude/settings.json`.** The assistant's safety check blocks it from editing its own instructions and permissions; add them yourself (text was given in chat on 2026-10-03).
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
- [ ] **Logo as SVG** (wordmark and elephant mark). Only PNGs exist in `/docs/brand`; SVG keeps the header and footer wordmark sharp and small.

## Business and legal
- [ ] **Business details for invoices**: legal name, registered address, GSTIN, and whether prices include GST (assumed yes, 3%). Stored in `site_settings`.
- [ ] **Shipping**: ₹100 flat is set "for now". Confirm the rate and whether there is a free-shipping threshold.
- [ ] **Policies** for legal sign-off: Privacy Policy, Terms & Conditions, Shipping & Returns (the catalogue's shipping text will be used as the draft).

## Content
- [ ] **Beej Ring price** (missing from the Rings catalogue).
- [ ] **Products that share a name** (Kumud ×2, Pākhi ×2, Indu ×2, Vakra ×2, Kaman/Kamān): confirm they're separate products and how to tell them apart (e.g. "Kumud Pendant — Mother-of-Pearl").
- [ ] **Product photos**: four per product (worn close-up, lifestyle, product-only, detail), plus optional flat lay / video.
- [ ] **Hero slides, category tile images, lifestyle images.**
- [ ] **Brand story** (2–3 lines for the homepage), **About / founder story**, **FAQs**, **testimonials**, **announcement bar text**, support email and phone.
- [ ] **Domain** and DNS (for launch).
