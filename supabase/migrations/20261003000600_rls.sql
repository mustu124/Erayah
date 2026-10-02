-- Erayah: Row Level Security on every table.
--
-- Public (anon) may read only the storefront: published products and their
-- images, variants and relations, categories, active hero slides, lifestyle
-- tiles, FAQs and testimonials, pages and site settings.
-- Everything else (orders, coupons, gift cards, shipping rules, admins,
-- contact messages, counters) is reached only through server code using the
-- service role (which bypasses RLS), or by signed-in admins.

alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.product_variants      enable row level security;
alter table public.product_images        enable row level security;
alter table public.product_relations     enable row level security;
alter table public.lifestyle_tiles       enable row level security;
alter table public.hero_slides           enable row level security;
alter table public.site_settings         enable row level security;
alter table public.shipping_rules        enable row level security;
alter table public.coupons               enable row level security;
alter table public.gift_cards            enable row level security;
alter table public.gift_card_redemptions enable row level security;
alter table public.faqs                  enable row level security;
alter table public.testimonials          enable row level security;
alter table public.pages                 enable row level security;
alter table public.admin_users           enable row level security;
alter table public.contact_messages      enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_events          enable row level security;
alter table public.document_counters     enable row level security;

-- Defence in depth: the browser role has no table privileges on private data,
-- so a missing or wrong policy can never expose it.
revoke all on
  public.shipping_rules, public.coupons, public.gift_cards,
  public.gift_card_redemptions, public.admin_users, public.contact_messages,
  public.orders, public.order_items, public.order_events, public.document_counters
from anon;

-- ─── Public storefront reads ────────────────────────────────────────────────

create policy "Public reads categories"
  on public.categories for select to anon, authenticated
  using (true);

create policy "Public reads published products"
  on public.products for select to anon, authenticated
  using (is_published);

create policy "Public reads variants of published products"
  on public.product_variants for select to anon, authenticated
  using (exists (
    select 1 from public.products p where p.id = product_id and p.is_published
  ));

create policy "Public reads images of published products"
  on public.product_images for select to anon, authenticated
  using (exists (
    select 1 from public.products p where p.id = product_id and p.is_published
  ));

create policy "Public reads relations between published products"
  on public.product_relations for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.is_published)
    and exists (select 1 from public.products p where p.id = related_product_id and p.is_published)
  );

create policy "Public reads active lifestyle tiles"
  on public.lifestyle_tiles for select to anon, authenticated
  using (is_active);

create policy "Public reads active hero slides"
  on public.hero_slides for select to anon, authenticated
  using (is_active);

create policy "Public reads active faqs"
  on public.faqs for select to anon, authenticated
  using (is_active);

create policy "Public reads active testimonials"
  on public.testimonials for select to anon, authenticated
  using (is_active);

create policy "Public reads pages"
  on public.pages for select to anon, authenticated
  using (true);

create policy "Public reads site settings"
  on public.site_settings for select to anon, authenticated
  using (true);

-- ─── Admins: full access ────────────────────────────────────────────────────

create policy "Admins manage categories" on public.categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage products" on public.products
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage product variants" on public.product_variants
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage product images" on public.product_images
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage product relations" on public.product_relations
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage lifestyle tiles" on public.lifestyle_tiles
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage hero slides" on public.hero_slides
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage site settings" on public.site_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage shipping rules" on public.shipping_rules
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage coupons" on public.coupons
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage gift cards" on public.gift_cards
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage gift card redemptions" on public.gift_card_redemptions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage faqs" on public.faqs
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage testimonials" on public.testimonials
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage pages" on public.pages
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage contact messages" on public.contact_messages
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage orders" on public.orders
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage order items" on public.order_items
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage order events" on public.order_events
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins read document counters" on public.document_counters
  for select to authenticated using ((select public.is_admin()));

-- admin_users: any admin can see the team; only owners can add, change or
-- remove admins (so staff cannot promote themselves).
create policy "Admins read admin users" on public.admin_users
  for select to authenticated using ((select public.is_admin()));
create policy "Owners insert admin users" on public.admin_users
  for insert to authenticated with check ((select public.is_owner()));
create policy "Owners update admin users" on public.admin_users
  for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "Owners delete admin users" on public.admin_users
  for delete to authenticated using ((select public.is_owner()));
