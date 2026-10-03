-- Erayah: product search and a log of searches that found nothing.

-- ─── search_products ────────────────────────────────────────────────────────
-- q: the shopper's words after synonym expansion in the app. Space-separated
-- groups must all match (AND); alternatives inside a group are separated by
-- "|" (OR), e.g. "kumud|padma pendant". Accents are stripped, so "gaja"
-- finds "Gajā". Every word matches as a prefix ("kum" finds Kumud).
--
-- 1. Full-text search on products.search_vector (name, category, styles,
--    stones, short description), ranked, plus name similarity.
-- 2. Only when that finds nothing: trigram similarity (pg_trgm) of each word
--    against the name, category, styles and stones, so typos like
--    "chandbali" still find Chaandbaalis. (Fuzzy matching only as a fallback
--    keeps "ring" from also matching "earrings".)
-- Only published products. Returns one page plus the total match count.

create function public.search_products(q text, p_limit integer default 24, p_offset integer default 0)
returns table (id bigint, slug text, name text, price integer, rank real, total bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_term  text := regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(q, ''))),
    '[^a-z0-9| -]', ' ', 'g'
  );
  v_query tsquery;
begin
  v_term := btrim(regexp_replace(v_term, '\s+', ' ', 'g'));
  if v_term !~ '[a-z0-9]' then
    return;
  end if;

  -- (a:* | b:*) & (c:*), with multi-word alternatives such as
  -- "mother-of-pearl" becoming (mother:* & of:* & pearl:*).
  select to_tsquery('english', string_agg('(' || g.alts || ')', ' & '))
  into v_query
  from (
    select string_agg('(' || w.words || ')', ' | ') as alts
    from regexp_split_to_table(v_term, ' ') with ordinality as grp(text, ord)
    cross join lateral regexp_split_to_table(grp.text, '\|') as alt(text)
    cross join lateral (
      select string_agg(part || ':*', ' & ') as words
      from regexp_split_to_table(alt.text, '-') as part
      where part <> ''
    ) as w
    where w.words is not null
    group by grp.ord
  ) as g;

  return query
  with docs as (
    select
      p.id, p.slug, p.name, p.price, p.merch_position, p.search_vector,
      extensions.unaccent('extensions.unaccent'::regdictionary, lower(p.name)) as plain_name,
      extensions.unaccent(
        'extensions.unaccent'::regdictionary,
        lower(p.name || ' ' || coalesce(c.name, '') || ' ' || array_to_string(p.styles, ' ') || ' ' || array_to_string(p.stones, ' '))
      ) as doc
    from public.products p
    left join public.categories c on c.id = p.category_id
    where p.is_published
  ),
  groups as (
    select grp.ord, array_agg(replace(alt.text, '-', ' ')) as alts
    from regexp_split_to_table(v_term, ' ') with ordinality as grp(text, ord)
    cross join lateral regexp_split_to_table(grp.text, '\|') as alt(text)
    where alt.text ~ '[a-z0-9]'
    group by grp.ord
  ),
  fts as (
    select d.id, d.slug, d.name, d.price, d.merch_position,
           (ts_rank(d.search_vector, v_query)
            + extensions.similarity(d.plain_name, replace(replace(v_term, '|', ' '), '-', ' ')))::real as score
    from docs d
    where v_query is not null and d.search_vector @@ v_query
  ),
  fuzzy as (
    select d.id, d.slug, d.name, d.price, d.merch_position, s.score::real as score
    from docs d
    cross join lateral (
      select min(best.value) as score
      from (
        select max(extensions.strict_word_similarity(a, d.doc)) as value
        from groups g, unnest(g.alts) as a
        group by g.ord
      ) as best
    ) as s
    where not exists (select 1 from fts) and s.score >= 0.4
  ),
  results as (
    select * from fts
    union all
    select * from fuzzy
  )
  select r.id, r.slug, r.name, r.price, r.score, count(*) over ()
  from results r
  order by r.score desc, r.merch_position nulls last, r.id
  limit greatest(coalesce(p_limit, 24), 0)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.search_products(text, integer, integer) from public;
grant execute on function public.search_products(text, integer, integer) to anon, authenticated, service_role;

-- ─── search_misses ──────────────────────────────────────────────────────────
-- Searches that found nothing, so the owner can see what people want.
-- Written by the server (service role) through log_search_miss; read in /admin.

create table public.search_misses (
  term       text primary key check (length(term) between 1 and 100),
  count      integer not null default 1 check (count > 0),
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);

create index search_misses_last_seen_idx on public.search_misses (last_seen desc);

alter table public.search_misses enable row level security;
revoke all on public.search_misses from anon;

create policy "Admins read search misses" on public.search_misses
  for select to authenticated using ((select public.is_admin()));
create policy "Admins delete search misses" on public.search_misses
  for delete to authenticated using ((select public.is_admin()));

create function public.log_search_miss(p_term text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.search_misses (term)
  values (left(lower(btrim(regexp_replace(p_term, '\s+', ' ', 'g'))), 100))
  on conflict (term) do update
    set count = public.search_misses.count + 1,
        last_seen = now();
$$;

revoke execute on function public.log_search_miss(text) from public, anon, authenticated;
grant execute on function public.log_search_miss(text) to service_role;
