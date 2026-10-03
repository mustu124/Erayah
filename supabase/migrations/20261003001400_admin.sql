-- Erayah: admin panel support. Idempotent (safe to run again).
-- • site_settings.brand_story_highlight: the phrase set in script on the homepage.
-- • pages.images: About page photos (founder photo, story images).
-- • products.seo_title / seo_description: per-product search snippet overrides.
-- • Realtime on orders, so the admin dashboard hears new orders.

alter table public.site_settings
  add column if not exists brand_story_highlight text;

alter table public.pages
  add column if not exists images jsonb not null default '[]'::jsonb;

-- [{ "path": "about/founder-1a2b.webp", "alt": "…", "role": "founder" | "story" }]
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pages_images_is_array') then
    alter table public.pages
      add constraint pages_images_is_array check (jsonb_typeof(images) = 'array');
  end if;
end $$;

alter table public.products
  add column if not exists seo_title text,
  add column if not exists seo_description text;

-- Realtime: admins (RLS "Admins manage orders") receive inserts and updates.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
     ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
