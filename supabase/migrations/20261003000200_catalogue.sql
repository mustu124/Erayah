-- Erayah: catalogue — categories, products, variants, images, relations,
-- lifestyle tiles and hero slides.

-- ─── categories ─────────────────────────────────────────────────────────────

create table public.categories (
  id              bigint generated always as identity primary key,
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name            text not null,
  description     text,
  image_path      text,
  sort_order      integer not null default 0,
  is_coming_soon  boolean not null default false,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now()
);

-- ─── products ───────────────────────────────────────────────────────────────

create table public.products (
  id                   bigint generated always as identity primary key,
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name                 text not null,
  category_id          bigint not null references public.categories (id) on delete restrict,
  short_description    text,
  description          text,
  price                integer check (price is null or price > 0), -- paise; null = draft
  materials            text[] not null default '{}',
  stones               text[] not null default '{}',
  colours              text[] not null default '{}',
  styles               text[] not null default '{}',
  closure              text,
  chain_length         text,
  care_override        text,
  is_published         boolean not null default false,
  is_new_arrival       boolean not null default false,
  is_best_seller       boolean not null default false,
  is_gift_for_her      boolean not null default false,
  is_hero              boolean not null default false,
  stock_qty            integer not null default 0 check (stock_qty >= 0),
  merch_position       integer,
  new_arrival_position integer,
  best_seller_position integer,
  published_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  search_vector        tsvector,

  constraint products_published_needs_price
    check (not is_published or price is not null),
  constraint products_colours_allowed
    check (colours <@ array[
      'white', 'green', 'pink', 'blue', 'red', 'turquoise', 'multicolour', 'pearl'
    ]::text[]),
  constraint products_styles_allowed
    check (styles <@ array[
      'studs', 'danglers', 'jhumkas', 'chaandbaalis', 'bali', 'ear cuff',
      'shoulder drops', 'drops', 'choker', 'necklace set', 'pendant', 'ring',
      'stackable', 'minimal', 'statement', 'pearl', 'mother-of-pearl', 'polki',
      'jadau', 'kundan', 'celestial', 'nature', 'animal'
    ]::text[])
);

create index products_search_vector_idx on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);
create index products_category_merch_idx on public.products (category_id, merch_position);
create index products_new_arrival_idx on public.products (new_arrival_position) where is_new_arrival;
create index products_best_seller_idx on public.products (best_seller_position) where is_best_seller;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- search_vector is maintained by trigger rather than a generated column:
-- generated columns cannot read the category name from another table.
-- Weights: name A, category B, styles B, stones C, short_description D.
-- Accents are stripped so "mithu" finds "Mithū".
create function public.products_set_search_vector()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_category text;
begin
  select c.name into v_category from public.categories c where c.id = new.category_id;

  new.search_vector :=
       setweight(to_tsvector('english', extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(new.name, ''))), 'A')
    || setweight(to_tsvector('english', extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(v_category, ''))), 'B')
    || setweight(to_tsvector('english', array_to_string(new.styles, ' ')), 'B')
    || setweight(to_tsvector('english', array_to_string(new.stones, ' ')), 'C')
    || setweight(to_tsvector('english', extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(new.short_description, ''))), 'D');

  if new.is_published and new.published_at is null then
    new.published_at := now();
  end if;

  return new;
end;
$$;

create trigger products_search_vector
  before insert or update of name, category_id, styles, stones, short_description, is_published
  on public.products
  for each row execute function public.products_set_search_vector();

-- Renaming a category refreshes the search vectors of its products.
create function public.categories_refresh_product_search()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.products set category_id = category_id where category_id = new.id;
  return null;
end;
$$;

create trigger categories_refresh_product_search
  after update of name on public.categories
  for each row
  when (old.name is distinct from new.name)
  execute function public.categories_refresh_product_search();

-- ─── product_variants ───────────────────────────────────────────────────────
-- Only for products sold in options (e.g. Dori Ring, Harakh Earrings).
-- When a product has variants, stock is tracked here, not on the product.

create table public.product_variants (
  id         bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  label      text not null,
  colour     text,
  stock_qty  integer not null default 0 check (stock_qty >= 0),
  sort_order integer not null default 0,
  unique (product_id, label)
);

-- ─── product_images ─────────────────────────────────────────────────────────
-- Card default = worn_closeup, card hover = lifestyle,
-- product page gallery = all images by sort_order.

create table public.product_images (
  id            bigint generated always as identity primary key,
  product_id    bigint not null references public.products (id) on delete cascade,
  storage_path  text not null,
  role          public.image_role not null,
  alt           text not null,
  sort_order    integer not null default 0,
  width         integer check (width > 0),
  height        integer check (height > 0),
  blur_data_url text
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

-- One card image and one hover image per product, so they are never ambiguous.
create unique index product_images_one_card_role_idx
  on public.product_images (product_id, role)
  where role in ('worn_closeup', 'lifestyle');

-- ─── product_relations ──────────────────────────────────────────────────────

create table public.product_relations (
  product_id         bigint not null references public.products (id) on delete cascade,
  related_product_id bigint not null references public.products (id) on delete cascade,
  kind               public.relation_kind not null,
  sort_order         integer not null default 0,
  primary key (product_id, related_product_id, kind),
  check (product_id <> related_product_id)
);

-- ─── lifestyle_tiles ────────────────────────────────────────────────────────
-- Editorial images placed between product rows. category_id null = Shop All.

create table public.lifestyle_tiles (
  id                    bigint generated always as identity primary key,
  category_id           bigint references public.categories (id) on delete cascade,
  image_path            text not null,
  alt                   text not null,
  caption               text,
  link_url              text,
  insert_after_position integer not null check (insert_after_position >= 0),
  span                  smallint not null default 1 check (span in (1, 2)),
  is_active             boolean not null default true
);

create index lifestyle_tiles_category_idx on public.lifestyle_tiles (category_id, insert_after_position);

-- ─── hero_slides ────────────────────────────────────────────────────────────

create table public.hero_slides (
  id                 bigint generated always as identity primary key,
  image_desktop_path text not null,
  image_mobile_path  text not null,
  alt                text not null,
  label              text,
  link_url           text,
  sort_order         integer not null default 0,
  is_active          boolean not null default true
);
