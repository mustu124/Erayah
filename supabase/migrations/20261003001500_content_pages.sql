-- Erayah: content pages. Idempotent (safe to run again).
-- • site_settings.business_hours: shown on /contact.
-- • contact_messages.ip_hash: a salted hash of the sender's IP (never the IP
--   itself), so the contact form can be rate limited.

alter table public.site_settings
  add column if not exists business_hours text;

alter table public.contact_messages
  add column if not exists ip_hash text;

create index if not exists contact_messages_ip_recent_idx
  on public.contact_messages (ip_hash, created_at desc)
  where ip_hash is not null;
