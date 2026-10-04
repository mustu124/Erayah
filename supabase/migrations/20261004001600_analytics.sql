-- Erayah: admin analytics. Idempotent (safe to run again).
-- Everything is computed from what the shop already stores (orders, items,
-- products, gift cards). No visitor tracking.
--
-- Definitions (also in docs/DECISIONS.md):
-- • A sale is an order with payment_status = 'paid' that isn't cancelled.
--   It is dated by paid_at, in India time.
-- • Revenue is the sum of orders.total (what the customer paid online, after
--   any gift card). A refunded order has payment_status = 'refunded', so it
--   is not a sale; refunds are reported as their own line.
-- • Test orders (orders.is_test) and test gift cards are left out unless asked for.
--
-- Access: the functions run as the caller. They are executable by
-- service_role only (the admin pages call them after checking the admin),
-- and each one also refuses anyone who is neither service_role nor an admin.

-- ─── Columns and indexes ────────────────────────────────────────────────────

alter table public.orders
  add column if not exists is_test boolean not null default false;

alter table public.gift_cards
  add column if not exists is_test boolean not null default false;

-- Gift cards left by the end-to-end tests are test data.
update public.gift_cards set is_test = true where code like 'E2E%' and not is_test;

alter table public.site_settings
  add column if not exists low_stock_threshold integer not null default 2;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_settings_low_stock_threshold_check') then
    alter table public.site_settings
      add constraint site_settings_low_stock_threshold_check check (low_stock_threshold between 0 and 1000);
  end if;
end $$;

-- orders(phone), order_items(order_id) and order_items(product_id) already have indexes.
create index if not exists orders_paid_at_idx on public.orders (paid_at) where paid_at is not null;
create index if not exists orders_payment_status_idx on public.orders (payment_status);

-- ─── Guard and the "sales" set ──────────────────────────────────────────────

create or replace function public.analytics_guard()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role' then
    return;
  end if;
  if (select public.is_admin()) then
    return;
  end if;
  raise exception 'NOT_ADMIN' using errcode = '42501';
end;
$$;

-- Sales paid between two India-time dates (both included).
create or replace function public.analytics_sales(p_from date, p_to date, p_include_test boolean default false)
returns setof public.orders
language sql
stable
set search_path = ''
as $$
  select o.*
  from public.orders o
  where o.payment_status = 'paid'
    and o.status not in ('cancelled', 'pending_payment')
    and o.paid_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
    and o.paid_at <  ((p_to + 1)::timestamp at time zone 'Asia/Kolkata')
    and (p_include_test or not o.is_test)
$$;

-- ─── 1–3. Revenue, orders, average order value ──────────────────────────────

create or replace function public.analytics_summary(p_from date, p_to date, p_include_test boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_revenue bigint;
  v_orders  integer;
  v_gift    bigint;
  v_status  jsonb;
  v_refunds bigint;
  v_refund_count integer;
begin
  perform public.analytics_guard();

  select coalesce(sum(total), 0), count(*), coalesce(sum(gift_card_amount), 0)
  into v_revenue, v_orders, v_gift
  from public.analytics_sales(p_from, p_to, p_include_test);

  select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) into v_status
  from (
    select status::text, count(*) as n
    from public.analytics_sales(p_from, p_to, p_include_test)
    group by status
  ) s;

  select coalesce(sum(o.total), 0), count(*)
  into v_refunds, v_refund_count
  from public.orders o
  where o.payment_status = 'refunded'
    and o.paid_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
    and o.paid_at <  ((p_to + 1)::timestamp at time zone 'Asia/Kolkata')
    and (p_include_test or not o.is_test);

  return jsonb_build_object(
    'revenue', v_revenue,
    'orders', v_orders,
    'aov', case when v_orders > 0 then round(v_revenue::numeric / v_orders) else 0 end,
    'gift_card_paid', v_gift,
    'refunds', v_refunds,
    'refund_count', v_refund_count,
    'by_status', v_status
  );
end;
$$;

-- ─── 4. Sales over time ─────────────────────────────────────────────────────
-- p_bucket: 'day', 'week' (Monday start) or 'month'. Empty buckets are returned as zeros.

create or replace function public.analytics_sales_over_time(
  p_from date, p_to date, p_bucket text default 'day', p_include_test boolean default false
)
returns table (bucket date, revenue bigint, orders integer)
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.analytics_guard();
  if p_bucket not in ('day', 'week', 'month') then
    raise exception 'INVALID_BUCKET';
  end if;

  return query
  with buckets as (
    select g::date as b
    from generate_series(
      date_trunc(p_bucket, p_from::timestamp),
      date_trunc(p_bucket, p_to::timestamp),
      ('1 ' || p_bucket)::interval
    ) g
  ),
  sales as (
    select date_trunc(p_bucket, s.paid_at at time zone 'Asia/Kolkata')::date as b,
           sum(s.total)::bigint as revenue,
           count(*)::integer as orders
    from public.analytics_sales(p_from, p_to, p_include_test) s
    group by 1
  )
  select buckets.b, coalesce(sales.revenue, 0)::bigint, coalesce(sales.orders, 0)::integer
  from buckets left join sales using (b)
  order by buckets.b;
end;
$$;

-- ─── 5. Sales by category ───────────────────────────────────────────────────
-- Item revenue (price × quantity, before shipping and gift cards). Every
-- category is listed, even with no sales; items whose product was deleted
-- are grouped as "Removed products".

create or replace function public.analytics_by_category(p_from date, p_to date, p_include_test boolean default false)
returns table (category_id bigint, category text, revenue bigint, units integer)
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.analytics_guard();

  return query
  with items as (
    select p.category_id as cid, oi.line_total, oi.quantity
    from public.analytics_sales(p_from, p_to, p_include_test) s
    join public.order_items oi on oi.order_id = s.id
    left join public.products p on p.id = oi.product_id
  )
  select c.id, c.name, coalesce(sum(i.line_total), 0)::bigint, coalesce(sum(i.quantity), 0)::integer
  from public.categories c
  left join items i on i.cid = c.id
  group by c.id, c.name, c.sort_order
  union all
  select null::bigint, 'Removed products', sum(i.line_total)::bigint, sum(i.quantity)::integer
  from items i
  where i.cid is null
  having count(*) > 0
  order by 3 desc, 2;
end;
$$;

-- ─── 6. Best-selling products ───────────────────────────────────────────────
-- One row per product and option. "family" is the name before " – ", so the
-- colours of one design (Dori Ring – Green, Dori Ring – Pink) group together.

create or replace function public.analytics_product_sales(p_from date, p_to date, p_include_test boolean default false)
returns table (
  family text, product_id bigint, name text, variant_label text, image_path text, units integer, revenue bigint
)
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.analytics_guard();

  return query
  select split_part(coalesce(p.name, oi.name_snapshot), ' – ', 1),
         oi.product_id,
         coalesce(p.name, oi.name_snapshot),
         oi.variant_label,
         max(oi.image_path_snapshot),
         sum(oi.quantity)::integer,
         sum(oi.line_total)::bigint
  from public.analytics_sales(p_from, p_to, p_include_test) s
  join public.order_items oi on oi.order_id = s.id
  left join public.products p on p.id = oi.product_id
  group by 1, 2, 3, 4
  order by 6 desc, 7 desc;
end;
$$;

-- ─── 7. Low stock ───────────────────────────────────────────────────────────
-- Published pieces (or their options) at or below the threshold, with units
-- sold in the last 30 days and the days of stock left at that pace. Always
-- "now": it takes no date range.

create or replace function public.analytics_low_stock(p_threshold integer default 2, p_include_test boolean default false)
returns table (
  product_id bigint, name text, variant_label text, stock integer, sold_30d integer, days_left numeric
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  perform public.analytics_guard();

  return query
  with units as (
    select p.id as pid, p.name as pname, v.label as vlabel, coalesce(v.stock_qty, p.stock_qty) as qty
    from public.products p
    left join public.product_variants v on v.product_id = p.id
    where p.is_published
  ),
  sold as (
    select oi.product_id as pid, oi.variant_label as vlabel, sum(oi.quantity)::integer as n
    from public.analytics_sales(v_today - 29, v_today, p_include_test) s
    join public.order_items oi on oi.order_id = s.id
    group by 1, 2
  )
  select u.pid, u.pname, u.vlabel, u.qty, coalesce(sold.n, 0),
         case
           when u.qty <= 0 then 0
           when coalesce(sold.n, 0) > 0 then round(u.qty / (sold.n / 30.0), 1)
         end
  from units u
  left join sold on sold.pid = u.pid and sold.vlabel is not distinct from u.vlabel
  where u.qty <= p_threshold
  order by 6 asc nulls last, u.qty asc, u.pname;
end;
$$;

-- ─── 8. Sales by location ───────────────────────────────────────────────────
-- p_level: 'state' or 'city' (city within state).

create or replace function public.analytics_by_location(
  p_from date, p_to date, p_level text default 'state', p_include_test boolean default false
)
returns table (state text, city text, revenue bigint, orders integer)
language plpgsql
stable
set search_path = ''
as $$
begin
  perform public.analytics_guard();
  if p_level not in ('state', 'city') then
    raise exception 'INVALID_LEVEL';
  end if;

  return query
  select s.state,
         case when p_level = 'city' then initcap(trim(s.city)) end,
         sum(s.total)::bigint,
         count(*)::integer
  from public.analytics_sales(p_from, p_to, p_include_test) s
  group by 1, 2
  order by 3 desc, 1, 2;
end;
$$;

-- ─── 9. Gift cards ──────────────────────────────────────────────────────────
-- (There are no coupons.) Issued = cards created in the range; redeemed =
-- gift card value used on sales in the range; unused = balance left on
-- active, unexpired cards right now.

create or replace function public.analytics_gift_cards(p_from date, p_to date, p_include_test boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_issued bigint; v_issued_count integer;
  v_redeemed bigint; v_redeemed_orders integer;
  v_unused bigint; v_active integer;
begin
  perform public.analytics_guard();

  select coalesce(sum(initial_balance), 0), count(*) into v_issued, v_issued_count
  from public.gift_cards g
  where g.created_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
    and g.created_at <  ((p_to + 1)::timestamp at time zone 'Asia/Kolkata')
    and (p_include_test or not g.is_test);

  select coalesce(sum(s.gift_card_amount), 0), count(*) into v_redeemed, v_redeemed_orders
  from public.analytics_sales(p_from, p_to, p_include_test) s
  where s.gift_card_amount > 0;

  select coalesce(sum(balance), 0), count(*) into v_unused, v_active
  from public.gift_cards g
  where g.is_active and g.balance > 0
    and (g.expires_at is null or g.expires_at > now())
    and (p_include_test or not g.is_test);

  return jsonb_build_object(
    'issued', v_issued, 'issued_count', v_issued_count,
    'redeemed', v_redeemed, 'redeemed_orders', v_redeemed_orders,
    'unused', v_unused, 'active_cards', v_active
  );
end;
$$;

-- ─── 10. Repeat customers ───────────────────────────────────────────────────
-- A customer is a phone number (last 10 digits). Repeat = ordered before the
-- range, or more than once within it. The list holds full phone numbers: the
-- page masks them, and only the owner's CSV shows them.

create or replace function public.analytics_repeat_customers(
  p_from date, p_to date, p_limit integer default 20, p_include_test boolean default false
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_unique integer;
  v_repeat integer;
  v_top jsonb;
begin
  perform public.analytics_guard();

  with lifetime as (
    select right(regexp_replace(s.phone, '\D', '', 'g'), 10) as phone10, s.*
    from public.analytics_sales(date '2000-01-01', p_to, p_include_test) s
  ),
  per_customer as (
    select l.phone10,
           count(*) filter (where l.paid_at >= (p_from::timestamp at time zone 'Asia/Kolkata')) as in_range,
           count(*) filter (where l.paid_at <  (p_from::timestamp at time zone 'Asia/Kolkata')) as before_range,
           count(*) as lifetime_orders,
           sum(l.total)::bigint as total_spent,
           max(l.paid_at) as last_paid_at
    from lifetime l
    group by l.phone10
  ),
  in_range as (
    select * from per_customer where in_range > 0
  ),
  repeats as (
    select * from in_range where before_range > 0 or in_range > 1
  ),
  top as (
    select r.*, latest.customer_name, latest.order_number
    from repeats r
    join lateral (
      select l.customer_name, l.order_number
      from lifetime l
      where l.phone10 = r.phone10
      order by l.paid_at desc
      limit 1
    ) latest on true
    order by r.lifetime_orders desc, r.total_spent desc, r.phone10
    limit greatest(p_limit, 0)
  )
  select (select count(*) from in_range)::integer,
         (select count(*) from repeats)::integer,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'phone', t.phone10, 'name', t.customer_name, 'orders', t.lifetime_orders,
             'total_spent', t.total_spent, 'last_order_at', t.last_paid_at, 'latest_order', t.order_number
           ) order by t.lifetime_orders desc, t.total_spent desc, t.phone10)
           from top t
         ), '[]'::jsonb)
  into v_unique, v_repeat, v_top;

  return jsonb_build_object(
    'unique_customers', v_unique,
    'repeat_customers', v_repeat,
    'repeat_rate', case when v_unique > 0 then round(100.0 * v_repeat / v_unique, 1) else 0 end,
    'top', v_top
  );
end;
$$;

-- ─── Access ─────────────────────────────────────────────────────────────────

do $$
declare
  f text;
begin
  foreach f in array array[
    'analytics_guard()',
    'analytics_sales(date, date, boolean)',
    'analytics_summary(date, date, boolean)',
    'analytics_sales_over_time(date, date, text, boolean)',
    'analytics_by_category(date, date, boolean)',
    'analytics_product_sales(date, date, boolean)',
    'analytics_low_stock(integer, boolean)',
    'analytics_by_location(date, date, text, boolean)',
    'analytics_gift_cards(date, date, boolean)',
    'analytics_repeat_customers(date, date, integer, boolean)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
