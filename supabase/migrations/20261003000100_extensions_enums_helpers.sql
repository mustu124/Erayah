-- Erayah: extensions, enum types and shared helper functions.
-- Money is always an integer number of paise (₹2,350 = 235000).

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ─── Enums ──────────────────────────────────────────────────────────────────

create type public.image_role as enum (
  'worn_closeup', 'lifestyle', 'product_only', 'detail', 'flat_lay', 'video'
);

create type public.relation_kind as enum ('complete_the_look', 'cross_sell');

create type public.shipping_match_type as enum ('default', 'state', 'pincode_prefix');

create type public.coupon_type as enum ('percent', 'flat');

create type public.order_status as enum (
  'pending_payment', 'placed', 'confirmed', 'packed', 'shipped',
  'delivered', 'cancelled', 'returned', 'refunded'
);

create type public.payment_method as enum ('razorpay', 'cod');

create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create type public.order_event_type as enum ('status_change', 'payment', 'note');

create type public.admin_role as enum ('owner', 'staff');

-- ─── Helpers ────────────────────────────────────────────────────────────────

-- Keeps updated_at current on any table that has the column.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Gap-free counters for order and invoice numbers (a sequence skips numbers
-- on rollback and cannot restart each year).
create table public.document_counters (
  kind       text not null,
  period     text not null,
  last_value integer not null default 0,
  primary key (kind, period)
);

create function public.next_document_number(p_kind text, p_period text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next integer;
begin
  insert into public.document_counters as dc (kind, period, last_value)
  values (p_kind, p_period, 1)
  on conflict (kind, period)
  do update set last_value = dc.last_value + 1
  returning dc.last_value into v_next;

  return v_next;
end;
$$;

revoke execute on function public.next_document_number(text, text) from public, anon, authenticated;
grant execute on function public.next_document_number(text, text) to service_role;
