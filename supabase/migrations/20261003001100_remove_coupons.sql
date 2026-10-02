-- Erayah: no coupons or discounts of any kind.
-- Removes the coupons table, the order discount columns, and coupon logic
-- from create_order and restore_stock. Gift cards (a payment method) stay.

-- ─── create_order without coupons ───────────────────────────────────────────
-- payload:
-- {
--   "items": [{ "product_id": 1, "variant_label": "White" | null, "quantity": 1 }],
--   "customer": { "name": "", "email": "" | null, "phone": "" },
--   "address": { "line1": "", "line2": null, "landmark": null,
--                "city": "", "state": "", "pincode": "" },
--   "gift_card_code": null,
--   "is_gift": false, "gift_note": null
-- }
-- Returns { order_id, order_number, access_token, total, status, payment_method }.
-- total > 0: a Razorpay order (status pending_payment) the server must create.
-- total = 0: fully covered by a gift card, already placed and paid, invoice assigned.
--
-- Error codes: EMPTY_CART, INVALID_ADDRESS, INVALID_QUANTITY:<id>,
--   PRODUCT_UNAVAILABLE:<id>, VARIANT_REQUIRED:<id>, VARIANT_UNAVAILABLE:<id>,
--   OUT_OF_STOCK:<id>, GIFT_CARD_INVALID, NO_SHIPPING_RULE, SETTINGS_MISSING

create or replace function public.create_order(payload jsonb)
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
  v_gift_card     public.gift_cards;
  v_gc_code       text := nullif(trim(payload ->> 'gift_card_code'), '');
  v_gc_amount     integer := 0;
  v_shipping      record;
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

  -- Shipping, from the most specific matching rule.
  select * into v_shipping from public.quote_shipping(v_pincode, v_state, v_subtotal);
  if not found then
    raise exception 'NO_SHIPPING_RULE';
  end if;

  -- GST (3% on jewellery). With GST-inclusive prices, gst_amount is the tax
  -- portion already inside the total; otherwise it is added on top.
  v_gross := v_subtotal + v_shipping.fee;
  if v_settings.prices_include_gst then
    v_gst := round(v_gross::numeric * v_settings.gst_rate / (100 + v_settings.gst_rate));
  else
    v_gst := round(v_gross::numeric * v_settings.gst_rate / 100);
    v_gross := v_gross + v_gst;
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
    v_method := 'gift_card';  v_status := 'placed';          v_pay_status := 'paid';
  else
    v_method := 'razorpay';   v_status := 'pending_payment'; v_pay_status := 'pending';
  end if;

  v_order_number := v_settings.invoice_prefix || '-' || v_year || '-'
                    || public.pad_document_number(public.next_document_number('order', v_year));

  insert into public.orders (
    id, order_number, status, payment_method, payment_status,
    customer_name, email, phone,
    address_line1, address_line2, landmark, city, state, pincode,
    is_gift, gift_note,
    subtotal, gift_card_code, gift_card_amount,
    shipping_fee, gst_amount, total, paid_at
  ) values (
    v_order_id, v_order_number, v_status, v_method, v_pay_status,
    v_name, nullif(trim(payload #>> '{customer,email}'), ''), v_phone,
    v_line1,
    nullif(trim(payload #>> '{address,line2}'), ''),
    nullif(trim(payload #>> '{address,landmark}'), ''),
    v_city, v_state, v_pincode,
    coalesce((payload ->> 'is_gift')::boolean, false),
    nullif(trim(payload ->> 'gift_note'), ''),
    v_subtotal, v_gc_code, v_gc_amount,
    v_shipping.fee, v_gst, v_total,
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

revoke execute on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;

-- ─── restore_stock without coupons ──────────────────────────────────────────
-- Puts back stock and gift card balance for an order that will not be
-- fulfilled. Idempotent: returns false if already released.

create or replace function public.restore_stock(p_order_id uuid)
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
  values (p_order_id, 'note', 'Stock and gift card released');

  return true;
end;
$$;

revoke execute on function public.restore_stock(uuid) from public, anon, authenticated;
grant execute on function public.restore_stock(uuid) to service_role;

-- ─── Drop coupon data and columns ───────────────────────────────────────────

alter table public.orders
  drop column discount,
  drop column coupon_code;

drop table public.coupons;
drop type public.coupon_type;

