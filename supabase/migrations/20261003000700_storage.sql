-- Erayah: storage buckets and policies.
--   product-images  public read, admin write
--   site-media      public read, admin write (hero slides, category and
--                   lifestyle tiles, About page photos)
--   invoices        private; read only through signed URLs made by the server
--
-- Public buckets serve files at /storage/v1/object/public/... without any
-- policy, so no anon SELECT policy is added (that would only allow listing).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 52428800,  -- 50 MB (product videos)
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']),
  ('site-media', 'site-media', true, 15728640,          -- 15 MB
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('invoices', 'invoices', false, 5242880,              -- 5 MB
   array['application/pdf'])
on conflict (id) do nothing;

create policy "Admins read media and invoices"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('product-images', 'site-media', 'invoices')
    and (select public.is_admin())
  );

create policy "Admins upload media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('product-images', 'site-media')
    and (select public.is_admin())
  );

create policy "Admins update media"
  on storage.objects for update to authenticated
  using (bucket_id in ('product-images', 'site-media') and (select public.is_admin()))
  with check (bucket_id in ('product-images', 'site-media') and (select public.is_admin()));

create policy "Admins delete media"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('product-images', 'site-media')
    and (select public.is_admin())
  );
