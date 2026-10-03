-- Erayah: checkout support.
-- • create_order: dry runs (a priced quote, nothing written), an idempotency key
--   (one order per checkout attempt), and a full price breakdown in the result.
-- • confirm_payment / mark_payment_failed: called by /api/checkout/verify and
--   the Razorpay webhook. Idempotent: whichever arrives first wins.
-- • Payments are online only (Razorpay); a gift card can cover the whole total.
-- • Unpaid orders expire after 60 minutes (checked every 30).

alter table public.orders
  alter column payment_method set default 'razorpay',
  add column idempotency_key text,
  add column invoice_path text;

create unique index orders_idempotency_key_idx on public.orders (idempotency_key) where idempotency_key is not null;

-- ─── create_order ───────────────────────────────────────────────────────────
-- payload:
-- {
--   "items": [{ "product_id": 1, "variant_label": "White" | null, "quantity": 1 }],
--   "customer": { "name": "", "email": "", "phone": "" },
--   "address": { "line1": "", "line2": null, "landmark": null, "city": "", "state": "", "pincode": "" },
--   "gift_card_code": null, "is_gift": false, "gift_note": null,
--   "idempotency_key": "…",      -- one per checkout attempt
--   "dry_run": false             -- true: price it, write nothing (address may be partial)
-- }
-- Returns { order_id, order_number, access_token, status, payment_method,
--           existing, subtotal, shipping_fee, gift_card_code, gift_card_amount,
--           gst_amount, total, est_days_min, est_days_max, lines: [...] }.
-- On a dry run order_id/order_number/access_token are null and shipping_fee is
-- null until a valid pincode is given. With an idempotency key that was used
-- before, the existing order is returned (existing = true) without changes.

create or replace function public.create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dry           boolean := coalesce((payload ->> 'dry_run')::boolean, false);
  v_key           text := nullif(trim(payload ->> 'idempotency_key'), '');
  v_existing      public.orders;
  v_settings      public.site_settings;
  v_method        public.payment_method;
  v_item          record;
  v_product       public.products;
  v_variant       public.product_variants;
  v_lines         jsonb := '[]'::jsonb;
  v_subtotal      integer := 0;
  v_gift_card     public.gift_cards;
  v_gc_code       text := nullif(trim(payload ->> 'gift_card_code'), '');
  v_gc_amount     integer := 0;
  v_shipping      record;
  v_ship_fee      integer;
  v_est_min       integer;
  v_est_max       integer;
  v_gross         integer;
  v_gst           integer;
  v_total         integer;
  v_status        public.order_status;
  v_pay_status    public.payment_status;
  v_order_id      uuid;
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
  -- Same checkout attempt again (double click, retry): hand back that order.
  if not v_dry and v_key is not null then
    select * into v_existing from public.orders where idempotency_key = v_key for update;
    if found then
      return jsonb_build_object(
        'existing', true,
        'order_id', v_existing.id, 'order_number', v_existing.order_number,
        'access_token', v_existing.access_token, 'status', v_existing.status,
        'payment_status', v_existing.payment_status, 'payment_method', v_existing.payment_method,
        'subtotal', v_existing.subtotal, 'shipping_fee', v_existing.shipping_fee,
        'gift_card_code', v_existing.gift_card_code, 'gift_card_amount', v_existing.gift_card_amount,
        'gst_amount', v_existing.gst_amount, 'total', v_existing.total,
        'razorpay_order_id', v_existing.razorpay_order_id
      );
    end if;
  end if;

  if v_pincode is not null and v_pincode !~ '^[1-9][0-9]{5}$' then
    raise exception 'INVALID_ADDRESS';
  end if;
  if not v_dry and (v_name is null or v_phone is null or v_line1 is null or v_city is null
                    or v_state is null or v_pincode is null) then
    raise exception 'INVALID_ADDRESS';
  end if;

  select * into v_settings from public.site_settings where id = 1;
  if not found then
    raise exception 'SETTINGS_MISSING';
  end if;

  -- Items: merge duplicates, lock rows in product-id order (prevents deadlocks
  -- and overselling), check availability, take prices from the database.
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

    if v_dry then
      select * into v_product from public.products where id = v_item.product_id;
    else
      select * into v_product from public.products where id = v_item.product_id for update;
    end if;
    if not found or not v_product.is_published or v_product.price is null then
      raise exception 'PRODUCT_UNAVAILABLE:%', v_item.product_id;
    end if;

    if exists (select 1 from public.product_variants where product_id = v_product.id) then
      if v_item.variant_label is null then
        raise exception 'VARIANT_REQUIRED:%', v_product.id;
      end if;
      if v_dry then
        select * into v_variant from public.product_variants
        where product_id = v_product.id and label = v_item.variant_label;
      else
        select * into v_variant from public.product_variants
        where product_id = v_product.id and label = v_item.variant_label
        for update;
      end if;
      if not found then
        raise exception 'VARIANT_UNAVAILABLE:%', v_product.id;
      end if;
      if v_variant.stock_qty < v_item.quantity then
        raise exception 'OUT_OF_STOCK:%', v_product.id;
      end if;
      if not v_dry then
        update public.product_variants set stock_qty = stock_qty - v_item.quantity where id = v_variant.id;
      end if;
    else
      if v_item.variant_label is not null then
        raise exception 'VARIANT_UNAVAILABLE:%', v_product.id;
      end if;
      if v_product.stock_qty < v_item.quantity then
        raise exception 'OUT_OF_STOCK:%', v_product.id;
      end if;
      if not v_dry then
        update public.products set stock_qty = stock_qty - v_item.quantity where id = v_product.id;
      end if;
    end if;

    v_subtotal := v_subtotal + v_product.price * v_item.quantity;
    v_lines := v_lines || jsonb_build_object(
      'product_id',    v_product.id,
      'slug',          v_product.slug,
      'variant_label', v_item.variant_label,
      'name',          v_product.name,
      'image',         (select pi.storage_path
                        from public.product_images pi
                        where pi.product_id = v_product.id and pi.role <> 'video'
                        order by (pi.role = 'worn_closeup') desc, pi.sort_order
                        limit 1),
      'unit_price',    v_product.price,
      'quantity',      v_item.quantity,
      'line_total',    v_product.price * v_item.quantity
    );
  end loop;

  if jsonb_array_length(v_lines) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- Shipping from the most specific matching rule (needs a pincode).
  if v_pincode is not null then
    select * into v_shipping from public.quote_shipping(v_pincode, coalesce(v_state, ''), v_subtotal);
    if not found then
      raise exception 'NO_SHIPPING_RULE';
    end if;
    v_ship_fee := v_shipping.fee;
    v_est_min := v_shipping.est_days_min;
    v_est_max := v_shipping.est_days_max;
  end if;

  -- GST: the tax inside GST-inclusive prices, or added on top otherwise.
  v_gross := v_subtotal + coalesce(v_ship_fee, 0);
  if v_settings.prices_include_gst then
    v_gst := round(v_gross::numeric * v_settings.gst_rate / (100 + v_settings.gst_rate));
  else
    v_gst := round(v_gross::numeric * v_settings.gst_rate / 100);
    v_gross := v_gross + v_gst;
  end if;

  -- Gift card: a payment instrument, applied after tax, capped at the total.
  if v_gc_code is not null then
    if v_dry then
      select * into v_gift_card from public.gift_cards where lower(code) = lower(v_gc_code);
    else
      select * into v_gift_card from public.gift_cards where lower(code) = lower(v_gc_code) for update;
    end if;
    if not found
       or not v_gift_card.is_active
       or (v_gift_card.expires_at is not null and v_gift_card.expires_at <= now())
       or v_gift_card.balance <= 0 then
      raise exception 'GIFT_CARD_INVALID';
    end if;
    v_gc_amount := least(v_gift_card.balance, v_gross);
    v_gc_code := v_gift_card.code;
    if not v_dry then
      update public.gift_cards set balance = balance - v_gc_amount where id = v_gift_card.id;
    end if;
  end if;

  v_total := v_gross - v_gc_amount;

  if v_dry then
    return jsonb_build_object(
      'existing', false, 'order_id', null, 'order_number', null, 'access_token', null,
      'subtotal', v_subtotal, 'shipping_fee', v_ship_fee,
      'gift_card_code', v_gc_code, 'gift_card_amount', v_gc_amount,
      'gst_amount', v_gst, 'total', v_total,
      'est_days_min', v_est_min, 'est_days_max', v_est_max,
      'lines', v_lines
    );
  end if;

  if v_total = 0 then
    v_method := 'gift_card';  v_status := 'placed';          v_pay_status := 'paid';
  else
    v_method := 'razorpay';   v_status := 'pending_payment'; v_pay_status := 'pending';
  end if;

  v_order_id := gen_random_uuid();
  v_order_number := v_settings.invoice_prefix || '-' || v_year || '-'
                    || public.pad_document_number(public.next_document_number('order', v_year));

  insert into public.orders (
    id, order_number, idempotency_key, status, payment_method, payment_status,
    customer_name, email, phone,
    address_line1, address_line2, landmark, city, state, pincode,
    is_gift, gift_note,
    subtotal, gift_card_code, gift_card_amount,
    shipping_fee, gst_amount, total, paid_at
  ) values (
    v_order_id, v_order_number, v_key, v_status, v_method, v_pay_status,
    v_name, nullif(trim(payload #>> '{customer,email}'), ''), v_phone,
    v_line1,
    nullif(trim(payload #>> '{address,line2}'), ''),
    nullif(trim(payload #>> '{address,landmark}'), ''),
    v_city, v_state, v_pincode,
    coalesce((payload ->> 'is_gift')::boolean, false),
    nullif(trim(payload ->> 'gift_note'), ''),
    v_subtotal, v_gc_code, v_gc_amount,
    v_ship_fee, v_gst, v_total,
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
    'existing', false,
    'order_id', v_order_id, 'order_number', v_order_number, 'access_token', v_access_token,
    'status', v_status, 'payment_status', v_pay_status, 'payment_method', v_method,
    'subtotal', v_subtotal, 'shipping_fee', v_ship_fee,
    'gift_card_code', v_gc_code, 'gift_card_amount', v_gc_amount,
    'gst_amount', v_gst, 'total', v_total,
    'est_days_min', v_est_min, 'est_days_max', v_est_max,
    'lines', v_lines,
    'razorpay_order_id', null
  );
end;
$$;

revoke execute on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;

-- ─── reserve_order_stock ────────────────────────────────────────────────────
-- Takes stock (and gift card balance) again for an order whose hold was
-- released, e.g. a payment that arrived after the order expired.
-- All or nothing: returns false and changes nothing if anything is short.

create function public.reserve_order_stock(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.order_items;
  v_red  public.gift_card_redemptions;
  v_have integer;
begin
  -- 1. Lock and check everything.
  for v_item in
    select * from public.order_items where order_id = p_order_id order by product_id, variant_label
  loop
    if v_item.product_id is null then
      return false;
    end if;
    if v_item.variant_label is not null then
      select stock_qty into v_have from public.product_variants
      where product_id = v_item.product_id and label = v_item.variant_label for update;
    else
      select stock_qty into v_have from public.products where id = v_item.product_id for update;
    end if;
    if v_have is null or v_have < v_item.quantity then
      return false;
    end if;
  end loop;
  for v_red in
    select * from public.gift_card_redemptions where order_id = p_order_id and reversed_at is not null
  loop
    select balance into v_have from public.gift_cards where id = v_red.gift_card_id for update;
    if v_have < v_red.amount then
      return false;
    end if;
  end loop;

  -- 2. Take it.
  for v_item in select * from public.order_items where order_id = p_order_id loop
    if v_item.variant_label is not null then
      update public.product_variants set stock_qty = stock_qty - v_item.quantity
      where product_id = v_item.product_id and label = v_item.variant_label;
    else
      update public.products set stock_qty = stock_qty - v_item.quantity where id = v_item.product_id;
    end if;
  end loop;
  for v_red in
    select * from public.gift_card_redemptions where order_id = p_order_id and reversed_at is not null
  loop
    update public.gift_cards set balance = balance - v_red.amount where id = v_red.gift_card_id;
    update public.gift_card_redemptions set reversed_at = null where id = v_red.id;
  end loop;
  update public.orders set stock_released_at = null where id = p_order_id;
  return true;
end;
$$;

-- ─── confirm_payment ────────────────────────────────────────────────────────
-- Marks a Razorpay order paid and placed. Called by /api/checkout/verify
-- (signature checked there) and the webhook (signature checked there); the
-- first one wins, later calls change nothing. Returns
-- { order_id, order_number, access_token, status, newly_placed, needs_refund }.

create function public.confirm_payment(
  p_razorpay_order_id text,
  p_payment_id        text,
  p_signature         text,
  p_amount            integer,
  p_source            text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order        public.orders;
  v_newly        boolean := false;
  v_needs_refund boolean := false;
begin
  select * into v_order from public.orders where razorpay_order_id = p_razorpay_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if p_amount is not null and p_amount <> v_order.total then
    insert into public.order_events (order_id, type, note)
    values (v_order.id, 'payment', format('Amount mismatch from %s: paid %s, order total %s (payment %s)', p_source, p_amount, v_order.total, p_payment_id));
    raise exception 'AMOUNT_MISMATCH';
  end if;

  if v_order.payment_status = 'paid' then
    null; -- already confirmed (verify and webhook both arrive): nothing to do
  elsif v_order.status = 'pending_payment' then
    update public.orders
    set status = 'placed', payment_status = 'paid', paid_at = now(),
        razorpay_payment_id = p_payment_id,
        razorpay_signature = coalesce(p_signature, razorpay_signature)
    where id = v_order.id;
    insert into public.order_events (order_id, type, from_value, to_value, note)
    values (v_order.id, 'payment', 'pending_payment', 'placed', format('Payment %s confirmed by %s', p_payment_id, p_source));
    perform public.assign_invoice_number(v_order.id);
    v_newly := true;
  elsif v_order.status = 'cancelled' and v_order.stock_released_at is not null then
    -- Paid after the order expired: take the stock again if it's still there.
    if public.reserve_order_stock(v_order.id) then
      update public.orders
      set status = 'placed', payment_status = 'paid', paid_at = now(),
          razorpay_payment_id = p_payment_id, razorpay_signature = coalesce(p_signature, razorpay_signature)
      where id = v_order.id;
      insert into public.order_events (order_id, type, from_value, to_value, note)
      values (v_order.id, 'payment', 'cancelled', 'placed', format('Payment %s arrived after the order expired (%s); stock reserved again', p_payment_id, p_source));
      perform public.assign_invoice_number(v_order.id);
      v_newly := true;
    else
      update public.orders
      set payment_status = 'paid', paid_at = now(),
          razorpay_payment_id = p_payment_id, razorpay_signature = coalesce(p_signature, razorpay_signature)
      where id = v_order.id;
      insert into public.order_events (order_id, type, note)
      values (v_order.id, 'note', format('REFUND NEEDED: payment %s arrived after the order expired and the pieces are no longer in stock (%s).', p_payment_id, p_source));
      v_needs_refund := true;
    end if;
  else
    insert into public.order_events (order_id, type, note)
    values (v_order.id, 'payment', format('Payment %s reported by %s while the order was %s', p_payment_id, p_source, v_order.status));
  end if;

  select * into v_order from public.orders where id = v_order.id;
  return jsonb_build_object(
    'order_id', v_order.id, 'order_number', v_order.order_number, 'access_token', v_order.access_token,
    'status', v_order.status, 'newly_placed', v_newly, 'needs_refund', v_needs_refund
  );
end;
$$;

-- ─── mark_payment_failed ────────────────────────────────────────────────────
-- A failed attempt. The order stays pending so the shopper can try again
-- with the same Razorpay order; it expires if they don't.

create function public.mark_payment_failed(p_razorpay_order_id text, p_payment_id text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where razorpay_order_id = p_razorpay_order_id for update;
  if not found or v_order.payment_status = 'paid' then
    return;
  end if;
  update public.orders set payment_status = 'failed' where id = v_order.id and status = 'pending_payment';
  insert into public.order_events (order_id, type, to_value, note)
  values (v_order.id, 'payment', 'failed', format('Payment %s failed: %s', coalesce(p_payment_id, '—'), coalesce(p_reason, 'no reason given')));
end;
$$;

revoke execute on function public.reserve_order_stock(uuid) from public, anon, authenticated;
revoke execute on function public.confirm_payment(text, text, text, integer, text) from public, anon, authenticated;
revoke execute on function public.mark_payment_failed(text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_order_stock(uuid) to service_role;
grant execute on function public.confirm_payment(text, text, text, integer, text) to service_role;
grant execute on function public.mark_payment_failed(text, text, text) to service_role;

-- ─── Expiry: every 30 minutes, orders unpaid for 60 minutes ─────────────────

select cron.schedule(
  'expire-pending-orders',
  '*/30 * * * *',
  $$ select public.expire_pending_orders(interval '60 minutes'); $$
);
