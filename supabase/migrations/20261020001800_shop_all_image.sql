-- The "Shop All" tile in the homepage's Shop by Category grid gets its own
-- image, set in Admin → Homepage like the category images. Idempotent.

alter table public.site_settings add column if not exists shop_all_image_path text;

comment on column public.site_settings.shop_all_image_path is
  'site-media path of the Shop All tile on the homepage (Shop by Category). Null: the tile shows the elephant mark.';
