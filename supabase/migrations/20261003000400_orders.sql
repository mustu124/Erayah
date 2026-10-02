-- Erayah: orders, order items, order events and gift card redemptions.
-- Orders are only ever read or written by server code (service role) or admins.

create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique,                 -- ERY-2026-00001
  access_token        text not null unique
                      default encode(extensions.gen_random_bytes(32), 'hex'),
  status              public.order_status not null default 'pending_payment',
  payment_method      public.payment_method not null,
  payment_status      public.payment_status not null default 'pending',

  customer_name       text not null,
  email               text,
  phone               text not null,
  address_line1       text not null,
  address_line2       text,
  landmark            text,
  city                text not null,
  state               text not null,
  pincode             text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  country             text not null default 'India',

  is_gift             boolean not null default false,
  gift_note           text check (length(gift_note) <= 500),

  -- All amounts in paise.
  subtotal            integer not null check (subtotal >= 0),
  discount            integer not null default 0 check (discount >= 0),
  coupon_code         text,
  gift_card_code      text,
  gift_card_amount    integer not null default 0 check (gift_card_amount >= 0),
  shipping_fee        integer not null default 0 check (shipping_fee >= 0),
  cod_fee             integer not null default 0 check (cod_fee >= 0),
  gst_amount          integer not null default 0 check (gst_amount >= 0),
  total               integer not null check (total >= 0),   -- amount the customer pays

  razorpay_order_id   text unique,
  razorpay_payment_id text,
  razorpay_signature  text,
  invoice_number      text unique,                           -- ERY/26-27/00001

  -- Internal only. Never shown to customers.
  courier_name        text,
  tracking_number     text,
  internal_notes      text,

  stock_released_at   timestamptz,  -- set once restore_stock() has run
  created_at          timestamptz not null default now(),
  paid_at             timestamptz,
  updated_at          timestamptz not null default now()
);

create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_phone_idx on public.orders (phone);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id                  bigint generated always as identity primary key,
  order_id            uuid not null references public.orders (id) on delete cascade,
  product_id          bigint references public.products (id) on delete set null,
  variant_label       text,
  name_snapshot       text not null,
  image_path_snapshot text,
  unit_price          integer not null check (unit_price >= 0),   -- paise
  quantity            integer not null check (quantity > 0),
  line_total          integer not null check (line_total >= 0),   -- paise

  check (line_total = unit_price * quantity)
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  type        public.order_event_type not null,
  from_value  text,
  to_value    text,
  note        text,
  actor_email text,   -- null = system
  created_at  timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.gift_card_redemptions (
  id           bigint generated always as identity primary key,
  gift_card_id bigint not null references public.gift_cards (id) on delete restrict,
  order_id     uuid not null references public.orders (id) on delete cascade,
  amount       integer not null check (amount > 0),   -- paise
  reversed_at  timestamptz,                          -- set when restore_stock() refunds it
  created_at   timestamptz not null default now()
);

create index gift_card_redemptions_card_idx on public.gift_card_redemptions (gift_card_id);
create index gift_card_redemptions_order_idx on public.gift_card_redemptions (order_id);
