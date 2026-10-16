-- Usage and exposure hardening (2026-10-16). Idempotent.
--
-- 1. The public (anon) role keeps read access only. RLS already blocked anon
--    writes (there are no anon write policies); this removes the grants too,
--    so a future policy mistake can't open a write path.
-- 2. search_misses can't be grown without bound by bots: at most 5,000 terms,
--    after which only existing terms are counted.
-- 3. Uploads to product-images are capped at 20 MB (videos are served straight
--    from Storage, so a huge file would cost egress on every view).

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'faqs', 'hero_slides', 'lifestyle_tiles', 'pages', 'product_images',
    'product_relations', 'product_variants', 'products', 'site_settings', 'testimonials'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke insert, update, delete, truncate on public.%I from anon', t);
    end if;
  end loop;
end $$;

create or replace function public.log_search_miss(p_term text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_term text := left(lower(btrim(regexp_replace(p_term, '\s+', ' ', 'g'))), 100);
begin
  -- Only words: skip empty input and strings with no letters at all.
  if v_term = '' or v_term !~ '[[:alpha:]]' then
    return;
  end if;
  update public.search_misses set count = count + 1, last_seen = now() where term = v_term;
  if found then
    return;
  end if;
  if (select count(*) from public.search_misses) >= 5000 then
    return;
  end if;
  insert into public.search_misses (term) values (v_term)
  on conflict (term) do update set count = public.search_misses.count + 1, last_seen = now();
end;
$$;

revoke all on function public.log_search_miss(text) from public, anon, authenticated;
grant execute on function public.log_search_miss(text) to service_role;

update storage.buckets set file_size_limit = 20971520 where id = 'product-images' and file_size_limit is distinct from 20971520;
