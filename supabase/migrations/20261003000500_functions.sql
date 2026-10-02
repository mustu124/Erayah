-- Erayah: business functions.
-- Everything that touches money or stock runs here, inside one transaction,
-- reading prices from the database. Order functions are callable only by the
-- service role (server code), never by the browser.
--
-- Errors are raised with stable codes the server maps to friendly messages:
--   EMPTY_CART, INVALID_PAYMENT_METHOD, INVALID_ADDRESS, INVALID_QUANTITY:<id>,
--   PRODUCT_UNAVAILABLE:<id>, VARIANT_REQUIRED:<id>, VARIANT_UNAVAILABLE:<id>,
--   OUT_OF_STOCK:<id>, COUPON_INVALID, COUPON_MIN_ORDER, GIFT_CARD_INVALID,
--   COD_UNAVAILABLE, COD_LIMIT, NO_SHIPPING_RULE, SETTINGS_MISSING, ORDER_NOT_FOUND

-- ─── Auth helpers ───────────────────────────────────────────────────────────

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid()) and role = 'owner'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_owner() to anon, authenticated;

-- ─── Numbering ──────────────────────────────────────────────────────────────

-- Zero-pads to at least 5 digits without ever truncating.
create function public.pad_document_number(n integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select lpad(n::text, greatest(5, length(n::text)), '0');
$$;

-- GST invoice number, consecutive within the Indian financial year (Apr–Mar):
-- ERY/26-27/00001. Assigned only when an order is paid or a COD order is placed,
-- so abandoned payments never leave gaps. Idempotent.
create function public.assign_invoice_number(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order  public.orders;
  v_prefix text;
  v_now    timestamp := now() at time zone 'Asia/Kolkata';
  v_start  integer;
  v_fy     text;
  v_number text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.invoice_number is not null then
    return v_order.invoice_number;
  end if;

  select invoice_prefix into v_prefix from public.site_settings where id = 1;

  v_start := extract(year from v_now)::integer
             - case when extract(month from v_now) < 4 then 1 else 0 end;
  v_fy := lpad((v_start % 100)::text, 2, '0') || '-' || lpad(((v_start + 1) % 100)::text, 2, '0');

  v_number := coalesce(v_prefix, 'ERY') || '/' || v_fy || '/'
              || public.pad_document_number(public.next_document_number('invoice', v_fy));

  update public.orders set invoice_number = v_number where id = p_order_id;
  return v_number;
end;
$$;

-- ─── Shipping ───────────────────────────────────────────────────────────────

-- Returns the one rule that applies: pincode_prefix (longest first) > state >
-- default, then priority. fee is 0 when order_value reaches free_above.
create function public.quote_shipping(p_pincode text, p_state text, p_order_value integer)
returns table (rule_id bigint, fee integer, est_days_min smallint, est_days_max smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id,
         case when r.free_above is not null and p_order_value >= r.free_above then 0 else r.rate end,
         r.est_days_min,
         r.est_days_max
  from public.shipping_rules r
  where r.is_active
    and (
         r.match_type = 'default'
      or (r.match_type = 'state' and lower(r.match_value) = lower(trim(p_state)))
      or (r.match_type = 'pincode_prefix' and p_pincode like r.match_value || '%')
    )
  order by
    case r.match_type when 'pincode_prefix' then 3 when 'state' then 2 else 1 end desc,
    length(coalesce(r.match_value, '')) desc,
    r.priority desc,
    r.id
  limit 1;
$$;

-- ─── create_order ───────────────────────────────────────────────────────────
-- payload:
-- {
--   "items": [{ "product_id": 1, "variant_label": "White" | null, "quantity": 1 }],
--   "customer": { "name": "", "email": "" | null, "phone": "" },
--   "address": { "line1": "", "line2": null, "landmark": null,
--                "city": "", "state": "", "pincode": "" },
--   "payment_method": "razorpay" | "cod",
--   "coupon_code": null, "gift_card_code": null,
--   "is_gift": false, "gift_note": null
-- }
-- Returns { order_id, order_number, access_token, total, status, payment_method }.
-- total is what the customer pays (in paise); 0 means fully covered by a gift card.

create function public.create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings      public.site_settings;
  v_method        public.payment_method;
  v_item          record;
  v_product       public.products;
  v_variant       public.product_variants;
  v_lines         jsonb := '[]'::jsonb;
  v_subtotal      integer := 0;
  v_discount      integer := 0;
  v_coupon        public.coupons;
  v_coupon_code   text := nullif(trim(payload ->> 'coupon_code'), '');
  v_gift_card     public.gift_cards;
  v_gc_code       text := nullif(trim(payload ->> 'gift_card_code'), '');
  v_gc_amount     integer := 0;
  v_shipping      record;
  v_cod_fee       integer := 0;
  v_gross         integer;
  v_gst           integer;
  v_total         integer;
  v_status        public.order_status;
  v_pay_status    public.payment_status;
  v_order_id      uuid := gen_random_uuid();
  v_order_number  text;
  v_access_token  text;
  v_year          text := to_char(now() at time zone 'Asia/Kolkata', 'YYYY');
  v_name          text := nullif(trim(payload #>> '{customer,name}'), '');
  v_phone         text := nullif(trim(payload #>> '{customer,phone}'), '');
  v_line1         text := nullif(trim(payload #>> '{address,line1}'), '');
  v_city          text := nullif(trim(payload #>> '{address,city}'), '');
  v_state         text := nullif(trim(payload #>> '{address,state}'), '');
  v_pincode       text := nullif(trim(payload #>> '{address,pincode}'), '');
begin
  -- Basic input checks (the server validates with zod first; this is the backstop).
  if coalesce(payload ->> 'payment_method', '') not in ('razorpay', 'cod') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;
  v_method := (payload ->> 'payment_method')::public.payment_method;

  if v_name is null or v_phone is null or v_line1 is null or v_city is null
     or v_state is null or v_pincode is null or v_pincode !~ '^[1-9][0-9]{5}$' then
    raise exception 'INVALID_ADDRESS';
  end if;

  select * into v_settings from public.site_settings where id = 1;
  if not found then
    raise exception 'SETTINGS_MISSING';
  end if;

  -- Items: merge duplicates, lock rows in product-id order (prevents deadlocks),
  -- check availability, take prices from the database, decrement stock.
  for v_item in
    select (i ->> 'product_id')::bigint                as product_id,
           nullif(trim(i ->> 'variant_label'), '')     as variant_label,
           sum((i ->> 'quantity')::integer)::integer   as quantity
    from jsonb_array_elements(coalesce(payload -> 'items', '[]'::jsonb)) as i
    group by 1, 2
    order by 1, 2
  loop
    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 20 then
      raise exception 'INVALID_QUANTITY:%', v_item.product_id;
    end if;

    select * into v_product from public.products where id = v_item.product_id for update;
    if not found or not v_product.is_published or v_product.price is null then
      raise exception 'PRODUCT_UNAVAILABLE:%', v_item.product_id;
    end if;

    if exists (select 1 from public.product_variants where product_id = v_product.id) then
      if v_item.variant_label is null then
        raise exception 'VARIANT_REQUIRED:%', v_product.id;
      end if;

      select * into v_variant
      from public.product_variants
      where product_id = v_product.id and label = v_item.variant_label
      for update;
      if not found then
        raise exception 'VARIANT_UNAVAILABLE:%', v_product.id;
      end if;
      if v_variant.stock_qty < v_item.quantity then
        raise exception 'OUT_OF_STOCK:%', v_product.id;
      end if;

      update public.product_variants
      set stock_qty = stock_qty - v_item.quantity
      where id = v_variant.id;
    else
      if v_item.variant_label is not null then
        raise exception 'VARIANT_UNAVAILABLE:%', v_product.id;
      end if;
      if v_product.stock_qty < v_item.quantity then
        raise exception 'OUT_OF_STOCK:%', v_product.id;
      end if;

      update public.products
      set stock_qty = stock_qty - v_item.quantity
      where id = v_product.id;
    end if;

    v_subtotal := v_subtotal + v_product.price * v_item.quantity;
    v_lines := v_lines || jsonb_build_object(
      'product_id',    v_product.id,
      'variant_label', v_item.variant_label,
      'name',          v_product.name,
      'image',         (select pi.storage_path
                        from public.product_images pi
                        where pi.product_id = v_product.id and pi.role <> 'video'
                        order by (pi.role = 'worn_closeup') desc, pi.sort_order
                        limit 1),
      'unit_price',    v_product.price,
      'quantity',      v_item.quantity
    );
  end loop;

  if jsonb_array_length(v_lines) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Coupon.
  if v_coupon_code is not null then
    select * into v_coupon from public.coupons where lower(code) = lower(v_coupon_code) for update;
    if not found
       or not v_coupon.is_active
       or (v_coupon.starts_at is not null and v_coupon.starts_at > now())
       or (v_coupon.ends_at is not null and v_coupon.ends_at <= now())
       or (v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit) then
      raise exception 'COUPON_INVALID';
    end if;
    if v_subtotal < v_coupon.min_order then
      raise exception 'COUPON_MIN_ORDER';
    end if;

    if v_coupon.type = 'percent' then
      v_discount := floor(v_subtotal::numeric * v_coupon.value / 100);
    else
      v_discount := v_coupon.value;
    end if;
    if v_coupon.max_discount is not null then
      v_discount := least(v_discount, v_coupon.max_discount);
    end if;
    v_discount := least(v_discount, v_subtotal);

    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
    v_coupon_code := v_coupon.code;
  end if;

  -- Shipping, from the most specific matching rule.
  select * into v_shipping from public.quote_shipping(v_pincode, v_state, v_subtotal - v_discount);
  if not found then
    raise exception 'NO_SHIPPING_RULE';
  end if;

  -- Cash on delivery.
  if v_method = 'cod' then
    if not v_settings.cod_enabled then
      raise exception 'COD_UNAVAILABLE';
    end if;
    v_cod_fee := v_settings.cod_fee;
  end if;

  -- GST (3% on jewellery). With GST-inclusive prices, gst_amount is the tax
  -- portion already inside the total; otherwise it is added on top.
  v_gross := v_subtotal - v_discount + v_shipping.fee + v_cod_fee;
  if v_settings.prices_include_gst then
    v_gst := round(v_gross::numeric * v_settings.gst_rate / (100 + v_settings.gst_rate));
  else
    v_gst := round(v_gross::numeric * v_settings.gst_rate / 100);
    v_gross := v_gross + v_gst;
  end if;

  if v_method = 'cod'
     and v_settings.cod_max_order_value is not null
     and v_gross > v_settings.cod_max_order_value then
    raise exception 'COD_LIMIT';
  end if;

  -- Gift card: a payment instrument, applied after tax, capped at the total.
  if v_gc_code is not null then
    select * into v_gift_card from public.gift_cards where lower(code) = lower(v_gc_code) for update;
    if not found
       or not v_gift_card.is_active
       or (v_gift_card.expires_at is not null and v_gift_card.expires_at <= now())
       or v_gift_card.balance <= 0 then
      raise exception 'GIFT_CARD_INVALID';
    end if;

    v_gc_amount := least(v_gift_card.balance, v_gross);
    update public.gift_cards set balance = balance - v_gc_amount where id = v_gift_card.id;
    v_gc_code := v_gift_card.code;
  end if;

  v_total := v_gross - v_gc_amount;

  if v_total = 0 then
    v_status := 'placed';      v_pay_status := 'paid';
  elsif v_method = 'cod' then
    v_status := 'placed';      v_pay_status := 'pending';
  else
    v_status := 'pending_payment'; v_pay_status := 'pending';
  end if;

  v_order_number := v_settings.invoice_prefix || '-' || v_year || '-'
                    || public.pad_document_number(public.next_document_number('order', v_year));

  insert into public.orders (
    id, order_number, status, payment_method, payment_status,
    customer_name, email, phone,
    address_line1, address_line2, landmark, city, state, pincode,
    is_gift, gift_note,
    subtotal, discount, coupon_code, gift_card_code, gift_card_amount,
    shipping_fee, cod_fee, gst_amount, total, paid_at
  ) values (
    v_order_id, v_order_number, v_status, v_method, v_pay_status,
    v_name, nullif(trim(payload #>> '{customer,email}'), ''), v_phone,
    v_line1,
    nullif(trim(payload #>> '{address,line2}'), ''),
    nullif(trim(payload #>> '{address,landmark}'), ''),
    v_city, v_state, v_pincode,
    coalesce((payload ->> 'is_gift')::boolean, false),
    nullif(trim(payload ->> 'gift_note'), ''),
    v_subtotal, v_discount, v_coupon_code, v_gc_code, v_gc_amount,
    v_shipping.fee, v_cod_fee, v_gst, v_total,
    case when v_pay_status = 'paid' then now() end
  )
  returning access_token into v_access_token;

  insert into public.order_items (
    order_id, product_id, variant_label, name_snapshot, image_path_snapshot,
    unit_price, quantity, line_total
  )
  select v_order_id, l.product_id, l.variant_label, l.name, l.image,
         l.unit_price, l.quantity, l.unit_price * l.quantity
  from jsonb_to_recordset(v_lines) as l (
    product_id bigint, variant_label text, name text, image text,
    unit_price integer, quantity integer
  );

  if v_gc_amount > 0 then
    insert into public.gift_card_redemptions (gift_card_id, order_id, amount)
    values (v_gift_card.id, v_order_id, v_gc_amount);
  end if;

  insert into public.order_events (order_id, type, to_value, note)
  values (v_order_id, 'status_change', v_status::text, 'Order created');

  if v_status = 'placed' then
    perform public.assign_invoice_number(v_order_id);
  end if;

  return jsonb_build_object(
    'order_id',       v_order_id,
    'order_number',   v_order_number,
    'access_token',   v_access_token,
    'total',          v_total,
    'status',         v_status,
    'payment_method', v_method
  );
end;
$$;

-- ─── restore_stock ──────────────────────────────────────────────────────────
-- Puts back stock, coupon usage and gift card balance for an order that will
-- not be fulfilled (unpaid Razorpay order expired, or cancelled).
-- Idempotent: returns false if already released. Does not change the status.

create function public.restore_stock(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_item  public.order_items;
  v_red   public.gift_card_redemptions;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.stock_released_at is not null then
    return false;
  end if;

  for v_item in
    select * from public.order_items
    where order_id = p_order_id and product_id is not null
    order by product_id
  loop
    if v_item.variant_label is not null then
      update public.product_variants
      set stock_qty = stock_qty + v_item.quantity
      where product_id = v_item.product_id and label = v_item.variant_label;
    else
      update public.products
      set stock_qty = stock_qty + v_item.quantity
      where id = v_item.product_id;
    end if;
  end loop;

  if v_order.coupon_code is not null then
    update public.coupons
    set used_count = greatest(used_count - 1, 0)
    where lower(code) = lower(v_order.coupon_code);
  end if;

  for v_red in
    select * from public.gift_card_redemptions
    where order_id = p_order_id and reversed_at is null
    for update
  loop
    update public.gift_cards set balance = balance + v_red.amount where id = v_red.gift_card_id;
    update public.gift_card_redemptions set reversed_at = now() where id = v_red.id;
  end loop;

  update public.orders set stock_released_at = now() where id = p_order_id;

  insert into public.order_events (order_id, type, note)
  values (p_order_id, 'note', 'Stock, coupon and gift card released');

  return true;
end;
$$;

-- ─── expire_pending_orders ──────────────────────────────────────────────────
-- Cancels Razorpay orders left unpaid and releases what they held.
-- Scheduled every 10 minutes by pg_cron (see the cron migration).

create function public.expire_pending_orders(p_older_than interval default interval '30 minutes')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_count integer := 0;
begin
  for v_id in
    select id from public.orders
    where status = 'pending_payment'
      and payment_status <> 'paid'
      and created_at < now() - p_older_than
    order by created_at
    for update skip locked
  loop
    perform public.restore_stock(v_id);

    update public.orders
    set status = 'cancelled', payment_status = 'failed'
    where id = v_id;

    insert into public.order_events (order_id, type, from_value, to_value, note)
    values (v_id, 'status_change', 'pending_payment', 'cancelled', 'Payment not completed in time');

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ─── Permissions ────────────────────────────────────────────────────────────
-- Order and money functions: service role only.

revoke execute on function public.pad_document_number(integer) from public, anon, authenticated;
revoke execute on function public.assign_invoice_number(uuid) from public, anon, authenticated;
revoke execute on function public.quote_shipping(text, text, integer) from public, anon, authenticated;
revoke execute on function public.create_order(jsonb) from public, anon, authenticated;
revoke execute on function public.restore_stock(uuid) from public, anon, authenticated;
revoke execute on function public.expire_pending_orders(interval) from public, anon, authenticated;

grant execute on function public.pad_document_number(integer) to service_role;
grant execute on function public.assign_invoice_number(uuid) to service_role;
grant execute on function public.quote_shipping(text, text, integer) to service_role;
grant execute on function public.create_order(jsonb) to service_role;
grant execute on function public.restore_stock(uuid) to service_role;
grant execute on function public.expire_pending_orders(interval) to service_role;
