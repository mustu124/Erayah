-- Erayah: reference data the site needs to run. Safe to re-run.
-- Products are imported separately (scripts/seed.ts).

insert into public.categories (slug, name, sort_order, is_coming_soon)
values
  ('earrings',      'Earrings',      1, false),
  ('necklace-sets', 'Necklace Sets', 2, false),
  ('rings',         'Rings',         3, false),
  ('bracelets',     'Bracelets',     4, true),
  ('pendants',      'Pendants',      5, false)
on conflict (slug) do nothing;

insert into public.site_settings (id, business_name, invoice_prefix)
values (1, 'Erayah', 'ERY')
on conflict (id) do nothing;

insert into public.pages (slug, title)
values
  ('about',            'About Erayah'),
  ('shipping-returns', 'Shipping & Returns'),
  ('privacy-policy',   'Privacy Policy'),
  ('terms',            'Terms & Conditions')
on conflict (slug) do nothing;

-- PLACEHOLDER rate: ₹0 (free) until the owner sets the real rate in /admin.
insert into public.shipping_rules (name, match_type, match_value, rate, est_days_min, est_days_max)
select 'Standard shipping — India', 'default', null, 0, 7, 10
where not exists (select 1 from public.shipping_rules where match_type = 'default');
