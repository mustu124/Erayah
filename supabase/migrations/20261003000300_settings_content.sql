-- Erayah: site settings, shipping, coupons, gift cards, content and admins.

-- ─── site_settings (single row, id = 1) ──────────────────────────────────────

create table public.site_settings (
  id                    smallint primary key default 1 check (id = 1),
  announcement_text     text,
  brand_story_text      text,
  brand_story_cta_label text,
  brand_story_cta_url   text,
  whatsapp_number       text check (whatsapp_number ~ '^\d{10,15}$'),
  support_email         text,
  support_phone         text,
  instagram_url         text,
  business_name         text not null default 'Erayah',
  business_address      text,
  gstin                 text check (gstin ~ '^[0-9A-Z]{15}$'),
  prices_include_gst    boolean not null default true,
  gst_rate              numeric(5, 2) not null default 3 check (gst_rate between 0 and 28),
  cod_enabled           boolean not null default true,
  cod_fee               integer not null default 0 check (cod_fee >= 0),        -- paise
  cod_max_order_value   integer check (cod_max_order_value > 0),               -- paise; null = no limit
  invoice_prefix        text not null default 'ERY' check (invoice_prefix ~ '^[A-Z0-9]{1,5}$'),
  updated_at            timestamptz not null default now()
);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ─── shipping_rules ─────────────────────────────────────────────────────────
-- The most specific active rule wins: pincode_prefix (longest prefix first)
-- > state > default. priority breaks ties.

create table public.shipping_rules (
  id           bigint generated always as identity primary key,
  name         text not null,
  match_type   public.shipping_match_type not null,
  match_value  text,
  rate         integer not null check (rate >= 0),              -- paise
  free_above   integer check (free_above > 0),                  -- paise; null = never free
  est_days_min smallint not null default 7 check (est_days_min > 0),
  est_days_max smallint not null default 10,
  priority     integer not null default 0,
  is_active    boolean not null default true,

  check (est_days_max >= est_days_min),
  check ((match_type = 'default') = (match_value is null)),
  check (match_type <> 'pincode_prefix' or match_value ~ '^\d{1,6}$')
);

-- ─── coupons ────────────────────────────────────────────────────────────────
-- value: whole percent (1–100) for 'percent', paise for 'flat'.

create table public.coupons (
  id           bigint generated always as identity primary key,
  code         text not null check (code ~ '^[A-Za-z0-9_-]{3,32}$'),
  type         public.coupon_type not null,
  value        integer not null,
  min_order    integer not null default 0 check (min_order >= 0),   -- paise
  max_discount integer check (max_discount > 0),                    -- paise
  starts_at    timestamptz,
  ends_at      timestamptz,
  usage_limit  integer check (usage_limit > 0),                     -- null = unlimited
  used_count   integer not null default 0 check (used_count >= 0),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),

  check (case type when 'percent' then value between 1 and 100 else value > 0 end),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create unique index coupons_code_lower_idx on public.coupons (lower(code));

-- ─── gift_cards ─────────────────────────────────────────────────────────────

create table public.gift_cards (
  id              bigint generated always as identity primary key,
  code            text not null check (code ~ '^[A-Za-z0-9_-]{6,32}$'),
  initial_balance integer not null check (initial_balance > 0),     -- paise
  balance         integer not null,                                 -- paise
  expires_at      timestamptz,
  is_active       boolean not null default true,
  note            text,
  created_at      timestamptz not null default now(),

  check (balance between 0 and initial_balance)
);

create unique index gift_cards_code_lower_idx on public.gift_cards (lower(code));

-- ─── faqs ───────────────────────────────────────────────────────────────────

create table public.faqs (
  id         bigint generated always as identity primary key,
  question   text not null,
  answer     text not null, -- markdown
  group_name text,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

-- ─── testimonials ───────────────────────────────────────────────────────────

create table public.testimonials (
  id          bigint generated always as identity primary key,
  quote       text not null,
  author_name text not null,
  location    text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

-- ─── pages ──────────────────────────────────────────────────────────────────

create table public.pages (
  id              bigint generated always as identity primary key,
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null,
  body            text not null default '', -- markdown
  seo_title       text,
  seo_description text,
  updated_at      timestamptz not null default now()
);

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- ─── admin_users ────────────────────────────────────────────────────────────

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  role       public.admin_role not null default 'staff',
  created_at timestamptz not null default now()
);

-- ─── contact_messages ───────────────────────────────────────────────────────
-- Contact form submissions, written by the server and read in /admin.
-- The site sends no email.

create table public.contact_messages (
  id         bigint generated always as identity primary key,
  name       text not null check (length(name) between 1 and 120),
  email      text check (length(email) <= 254),
  phone      text check (length(phone) <= 20),
  message    text not null check (length(message) between 1 and 5000),
  is_read    boolean not null default false,
  created_at timestamptz not null default now(),

  check (email is not null or phone is not null)
);

create index contact_messages_unread_idx on public.contact_messages (created_at desc) where not is_read;
