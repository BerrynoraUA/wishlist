-- Add color_index column to item table
ALTER TABLE "public"."item"
  ADD COLUMN IF NOT EXISTS "color_index" smallint NULL DEFAULT NULL;

-- ============================================================
-- RETURNS TABLE functions: add color_index to output
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_wishlist_items(
  p_wishlist_id  uuid,
  p_skip         integer  DEFAULT 0,
  p_take         integer  DEFAULT 50,
  p_search       text     DEFAULT NULL,
  p_sort         text     DEFAULT 'newest',
  p_statuses     integer[] DEFAULT NULL,
  p_priorities   uuid[]   DEFAULT NULL,
  p_price_min    numeric  DEFAULT NULL,
  p_price_max    numeric  DEFAULT NULL
)
RETURNS TABLE(
  id               uuid,
  wishlist_id      uuid,
  name             text,
  description      text,
  price            text,
  url              text,
  created_at       timestamptz,
  status           smallint,
  reserved_by      uuid,
  image_url        text,
  discount_price   text,
  has_discount     boolean,
  discount_end_date text,
  currency         text,
  additional_links  jsonb,
  priority_id      uuid,
  priority_name    text,
  color_index      smallint
)
LANGUAGE sql
STABLE
AS $function$
  SELECT
    i.id,
    i.wishlist_id,
    i.name,
    i.description,
    i.price,
    i.url,
    i.created_at,
    i.status,
    i.reserved_by,
    i.image_url,
    i.discount_price,
    i.has_discount,
    i.discount_end_date,
    i.currency,
    i.additional_links,
    i.priority_id,
    ip.name AS priority_name,
    i.color_index
  FROM public.item i
  LEFT JOIN public.item_priorities ip ON ip.id = i.priority_id
  WHERE
    i.wishlist_id = p_wishlist_id
    AND (
      p_search IS NULL
      OR p_search = ''
      OR i.name ILIKE '%' || p_search || '%'
      OR i.description ILIKE '%' || p_search || '%'
    )
    AND (
      array_length(p_statuses, 1) IS NULL
      OR i.status = ANY(p_statuses)
    )
    AND (
      array_length(p_priorities, 1) IS NULL
      OR i.priority_id = ANY(p_priorities)
    )
    AND (
      p_price_min IS NULL
      OR COALESCE(
        NULLIF(regexp_replace(COALESCE(i.discount_price, i.price, '0'), '[^0-9.\-]', '', 'g'), ''),
        '0'
      )::numeric >= p_price_min
    )
    AND (
      p_price_max IS NULL
      OR COALESCE(
        NULLIF(regexp_replace(COALESCE(i.discount_price, i.price, '0'), '[^0-9.\-]', '', 'g'), ''),
        '0'
      )::numeric <= p_price_max
    )
  ORDER BY
    CASE WHEN p_sort = 'oldest'        THEN extract(epoch FROM i.created_at) END ASC,
    CASE WHEN p_sort = 'name-asc'      THEN i.name END ASC,
    CASE WHEN p_sort = 'name-desc'     THEN i.name END DESC,
    CASE WHEN p_sort = 'price-high'    THEN COALESCE(
      NULLIF(regexp_replace(COALESCE(i.discount_price, i.price, '0'), '[^0-9.\-]', '', 'g'), ''),
      '0'
    )::numeric END DESC NULLS LAST,
    CASE WHEN p_sort = 'price-low'     THEN COALESCE(
      NULLIF(regexp_replace(COALESCE(i.discount_price, i.price, '0'), '[^0-9.\-]', '', 'g'), ''),
      '0'
    )::numeric END ASC NULLS LAST,
    CASE WHEN p_sort = 'priority-high' THEN ip.sort_order END DESC NULLS LAST,
    CASE WHEN p_sort = 'priority-low'  THEN ip.sort_order END ASC NULLS LAST,
    i.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
$function$;

-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_wishlist_items_by_share_token(
  p_token text,
  p_skip  integer DEFAULT 0,
  p_take  integer DEFAULT 50
)
RETURNS TABLE(
  id               uuid,
  wishlist_id      uuid,
  name             text,
  description      text,
  price            text,
  url              text,
  created_at       timestamptz,
  status           smallint,
  reserved_by      uuid,
  image_url        text,
  discount_price   text,
  has_discount     boolean,
  discount_end_date text,
  currency         text,
  additional_links  jsonb,
  priority_id      uuid,
  priority_name    text,
  color_index      smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  v_wishlist_id uuid;
begin
  v_wishlist_id := public.verify_wishlist_share_token(p_token);

  if v_wishlist_id is null then
    raise exception 'Invalid or expired token';
  end if;

  return query
  SELECT
    i.id, i.wishlist_id, i.name, i.description, i.price, i.url,
    i.created_at, i.status, i.reserved_by, i.image_url,
    i.discount_price, i.has_discount, i.discount_end_date, i.currency,
    i.additional_links, i.priority_id, ip.name AS priority_name,
    i.color_index
  FROM public.item i
  LEFT JOIN public.item_priorities ip ON ip.id = i.priority_id
  WHERE i.wishlist_id = v_wishlist_id
  ORDER BY i.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
end;
$$;

-- ------------------------------------------------------------

create or replace function public.get_reserved_items_by_me(
  p_skip integer default 0,
  p_take integer default 10,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities uuid[] default null::uuid[],
  p_price_min numeric default null::numeric,
  p_price_max numeric default null::numeric,
  p_display_currency text default 'USD'::text
)
returns table(item_id uuid, title text, price numeric, discount_price numeric, currency text, url text, store text, image text, priority_name text, color_index smallint, status integer, wishlist_id uuid, wishlist_title text, owner_id uuid, owner_name text, owner_username text, owner_avatar text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_current_user_id uuid;
  v_search text;
  v_display_rate numeric;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_search := nullif(btrim(p_search), '');

  select coalesce(er.rate, 1) into v_display_rate
  from public.exchange_rates er
  where er.base_currency = 'USD'
    and er.target_currency = upper(coalesce(p_display_currency, 'USD'))
  limit 1;
  if v_display_rate is null then v_display_rate := 1; end if;

  return query
  select
    i.id as item_id,
    i.name as title,
    case when i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' then i.price::numeric else 0::numeric end as price,
    case when i.discount_price is not null and i.discount_price ~ '^[0-9]+\.?[0-9]*$' then i.discount_price::numeric else 0::numeric end as discount_price,
    nullif(btrim(i.currency), '') as currency,
    coalesce(i.url, '') as url,
    case
      when i.url is not null and i.url != '' then coalesce(nullif(regexp_replace(regexp_replace(i.url, '^https?://(www\.)?', '', 'i'), '/.*$', ''), ''), 'Store')
      else 'Store'
    end as store,
    coalesce(i.image_url, '') as image,
    ip.name as priority_name,
    i.color_index,
    i.status::integer as status,
    w.id as wishlist_id,
    w.title as wishlist_title,
    p.id as owner_id,
    coalesce(p.display_name, p.nickname, 'Unknown User') as owner_name,
    coalesce(p.nickname, '') as owner_username,
    coalesce(p.avatar_url, '') as owner_avatar
  from public.item i
  inner join public.wishlist w on w.id = i.wishlist_id
  inner join public.profiles p on p.id = w.user_id
  left join public.item_priorities ip on ip.id = i.priority_id
  left join public.exchange_rates er_item
    on er_item.base_currency = 'USD'
   and er_item.target_currency = upper(coalesce(i.currency, 'USD'))
  where i.status = 1
    and i.reserved_by = v_current_user_id
    and public.can_view_wishlist_for_user(w.id, w.user_id, w.visibility_type, v_current_user_id)
    and (p_priorities is null or i.priority_id = any(p_priorities))
    and (p_price_min is null or (i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' and i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate >= p_price_min))
    and (p_price_max is null or (i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' and i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate <= p_price_max))
    and (
      v_search is null
      or i.name ilike '%' || v_search || '%'
      or w.title ilike '%' || v_search || '%'
      or p.nickname ilike '%' || v_search || '%'
      or p.display_name ilike '%' || v_search || '%'
    )
  order by
    case p_sort
      when 'price-high' then -(case when i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' then i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate else 0 end)
      when 'price-low' then case when i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' then i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate else 0 end
      when 'priority-high' then -coalesce(ip.sort_order, 0)::numeric
      when 'priority-low' then coalesce(ip.sort_order, 0)::numeric
      else null
    end nulls last,
    case p_sort
      when 'owner-asc' then coalesce(p.display_name, p.nickname, '')
      when 'owner-desc' then coalesce(p.display_name, p.nickname, '')
      else null
    end collate "C",
    case when p_sort = 'owner-desc' then 1 else 0 end desc,
    i.created_at desc
  offset p_skip
  limit p_take;
end;
$function$;

-- ------------------------------------------------------------

create or replace function public.get_my_bought_items(
  p_skip integer default 0,
  p_take integer default 20,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities uuid[] default null::uuid[],
  p_price_min numeric default null::numeric,
  p_price_max numeric default null::numeric,
  p_display_currency text default 'USD'::text
)
returns table(item_id uuid, title text, price numeric, discount_price numeric, url text, store text, image text, priority_name text, color_index smallint, status integer, wishlist_id uuid, wishlist_title text, owner_id uuid, owner_name text, owner_username text, owner_avatar text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_current_user_id uuid;
  v_search text;
  v_display_rate numeric;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_search := nullif(btrim(p_search), '');

  select coalesce(er.rate, 1) into v_display_rate
  from public.exchange_rates er
  where er.base_currency = 'USD'
    and er.target_currency = upper(coalesce(p_display_currency, 'USD'))
  limit 1;
  if v_display_rate is null then v_display_rate := 1; end if;

  return query
  select
    i.id as item_id,
    i.name as title,
    case when i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' then i.price::numeric else 0::numeric end as price,
    case when i.discount_price is not null and i.discount_price ~ '^[0-9]+\.?[0-9]*$' then i.discount_price::numeric else 0::numeric end as discount_price,
    coalesce(i.url, '') as url,
    case
      when i.url is not null and i.url != '' then coalesce(nullif(regexp_replace(regexp_replace(i.url, '^https?://(www\.)?', '', 'i'), '/.*$', ''), ''), 'Store')
      else 'Store'
    end as store,
    coalesce(i.image_url, '') as image,
    ip.name as priority_name,
    i.color_index,
    i.status::integer as status,
    w.id as wishlist_id,
    w.title as wishlist_title,
    p.id as owner_id,
    coalesce(p.display_name, p.nickname, 'Unknown User') as owner_name,
    coalesce(p.nickname, '') as owner_username,
    coalesce(p.avatar_url, '') as owner_avatar
  from public.item i
  inner join public.wishlist w on w.id = i.wishlist_id
  inner join public.profiles p on p.id = w.user_id
  left join public.item_priorities ip on ip.id = i.priority_id
  left join public.exchange_rates er_item
    on er_item.base_currency = 'USD'
   and er_item.target_currency = upper(coalesce(i.currency, 'USD'))
  where i.status = 2
    and i.reserved_by = v_current_user_id
    and public.can_view_wishlist_for_user(w.id, w.user_id, w.visibility_type, v_current_user_id)
    and (p_priorities is null or i.priority_id = any(p_priorities))
    and (p_price_min is null or (i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' and i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate >= p_price_min))
    and (p_price_max is null or (i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' and i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate <= p_price_max))
    and (
      v_search is null
      or i.name ilike '%' || v_search || '%'
      or w.title ilike '%' || v_search || '%'
      or p.nickname ilike '%' || v_search || '%'
      or p.display_name ilike '%' || v_search || '%'
    )
  order by
    case p_sort
      when 'price-high' then -(case when i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' then i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate else 0 end)
      when 'price-low' then case when i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' then i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate else 0 end
      when 'priority-high' then -coalesce(ip.sort_order, 0)::numeric
      when 'priority-low' then coalesce(ip.sort_order, 0)::numeric
      else null
    end nulls last,
    case p_sort
      when 'owner-asc' then coalesce(p.display_name, p.nickname, '')
      when 'owner-desc' then coalesce(p.display_name, p.nickname, '')
      else null
    end collate "C",
    case when p_sort = 'owner-desc' then 1 else 0 end desc,
    i.created_at desc
  offset p_skip
  limit p_take;
end;
$function$;

-- ============================================================
-- JSONB functions: add color_index to jsonb_build_object
-- ============================================================

create or replace function public.get_friends_wishlists_discover(
  p_skip integer default 0,
  p_take integer default 20,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities uuid[] default null::uuid[],
  p_price_min numeric default null::numeric,
  p_price_max numeric default null::numeric,
  p_display_currency text default 'USD'::text
)
returns table(id uuid, owner text, username text, avatar_url text, wishlist text, wishlist_id uuid, friend_id uuid, items jsonb)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_current_user_id uuid;
  v_search text;
  v_display_rate numeric;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_search := nullif(btrim(p_search), '');

  select coalesce(er.rate, 1) into v_display_rate
  from public.exchange_rates er
  where er.base_currency = 'USD'
    and er.target_currency = upper(coalesce(p_display_currency, 'USD'))
  limit 1;
  if v_display_rate is null then v_display_rate := 1; end if;

  return query
  with user_friends as (
    select case when f.user_f = v_current_user_id then f.user_s else f.user_f end as friend_id
    from public.friends f
    where f.user_f = v_current_user_id or f.user_s = v_current_user_id
  ),
  wishlist_items as (
    select
      i.wishlist_id,
      jsonb_agg(
        jsonb_build_object(
          'id', i.id::text,
          'title', i.name,
          'price', case when i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' then i.price::numeric else 0 end,
          'discount_price', case when i.discount_price is not null and i.discount_price ~ '^[0-9]+\.?[0-9]*$' then i.discount_price::numeric else 0 end,
          'url', coalesce(i.url, ''),
          'store', case
            when i.url is not null and i.url != '' then coalesce(nullif(regexp_replace(regexp_replace(i.url, '^https?://(www\.)?', '', 'i'), '/.*$', ''), ''), 'Store')
            else 'Store'
          end,
          'image', coalesce(i.image_url, ''),
          'currency', coalesce(i.currency, null),
          'priority', ip.name,
          'color_index', i.color_index
        )
        order by i.created_at desc
      ) filter (where i.id is not null) as items
    from public.item i
    left join public.item_priorities ip on ip.id = i.priority_id
    left join public.exchange_rates er_item
      on er_item.base_currency = 'USD'
     and er_item.target_currency = upper(coalesce(i.currency, 'USD'))
    where i.status = 0
      and (p_priorities is null or i.priority_id = any(p_priorities))
      and (p_price_min is null or (i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' and i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate >= p_price_min))
      and (p_price_max is null or (i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' and i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate <= p_price_max))
    group by i.wishlist_id
  )
  select
    w.id,
    coalesce(p.display_name, p.nickname, 'Unknown User') as owner,
    coalesce(p.nickname, '') as username,
    coalesce(p.avatar_url, '') as avatar_url,
    w.title as wishlist,
    w.id as wishlist_id,
    uf.friend_id,
    coalesce(wi.items, '[]'::jsonb) as items
  from public.wishlist w
  inner join user_friends uf on uf.friend_id = w.user_id
  inner join public.profiles p on p.id = w.user_id
  left join wishlist_items wi on wi.wishlist_id = w.id
  where public.can_view_wishlist_for_user(w.id, w.user_id, w.visibility_type, v_current_user_id)
    and wi.items is not null
    and (v_search is null or w.title ilike '%' || v_search || '%')
  order by
    case p_sort when 'owner-asc' then coalesce(p.display_name, p.nickname, '') else null end asc nulls last,
    case p_sort when 'owner-desc' then coalesce(p.display_name, p.nickname, '') else null end desc nulls last,
    case when p_sort not in ('owner-asc', 'owner-desc') then w.created_at else null end desc nulls last
  offset p_skip
  limit p_take;
end;
$function$;

-- ------------------------------------------------------------

create or replace function public.get_friends_wishlists_discover_all(
  p_skip integer default 0,
  p_take integer default 20,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities uuid[] default null::uuid[],
  p_price_min numeric default null::numeric,
  p_price_max numeric default null::numeric,
  p_display_currency text default 'USD'::text
)
returns table(id uuid, owner text, username text, avatar_url text, wishlist text, wishlist_id uuid, friend_id uuid, items jsonb)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_current_user_id uuid;
  v_search text;
  v_display_rate numeric;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_search := nullif(btrim(p_search), '');

  select coalesce(er.rate, 1) into v_display_rate
  from public.exchange_rates er
  where er.base_currency = 'USD'
    and er.target_currency = upper(coalesce(p_display_currency, 'USD'))
  limit 1;
  if v_display_rate is null then v_display_rate := 1; end if;

  return query
  with user_friends as (
    select case when f.user_f = v_current_user_id then f.user_s else f.user_f end as friend_id
    from public.friends f
    where f.user_f = v_current_user_id or f.user_s = v_current_user_id
  ),
  wishlist_items as (
    select
      i.wishlist_id,
      jsonb_agg(
        jsonb_build_object(
          'id', i.id::text,
          'title', i.name,
          'price', case when i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' then i.price::numeric else 0 end,
          'discount_price', case when i.discount_price is not null and i.discount_price ~ '^[0-9]+\.?[0-9]*$' then i.discount_price::numeric else 0 end,
          'url', coalesce(i.url, ''),
          'store', case
            when i.url is not null and i.url != '' then coalesce(nullif(regexp_replace(regexp_replace(i.url, '^https?://(www\.)?', '', 'i'), '/.*$', ''), ''), 'Store')
            else 'Store'
          end,
          'image', coalesce(i.image_url, ''),
          'currency', i.currency,
          'priority', ip.name,
          'status', i.status,
          'color_index', i.color_index
        )
        order by i.created_at desc
      ) filter (where i.id is not null) as items
    from public.item i
    left join public.item_priorities ip on ip.id = i.priority_id
    left join public.exchange_rates er_item
      on er_item.base_currency = 'USD'
     and er_item.target_currency = upper(coalesce(i.currency, 'USD'))
    where (p_priorities is null or i.priority_id = any(p_priorities))
      and (p_price_min is null or (i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' and i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate >= p_price_min))
      and (p_price_max is null or (i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' and i.price::numeric / coalesce(er_item.rate, 1) * v_display_rate <= p_price_max))
    group by i.wishlist_id
  )
  select
    w.id,
    coalesce(p.display_name, p.nickname, 'Unknown User') as owner,
    coalesce(p.nickname, '') as username,
    coalesce(p.avatar_url, '') as avatar_url,
    w.title as wishlist,
    w.id as wishlist_id,
    uf.friend_id,
    coalesce(wi.items, '[]'::jsonb) as items
  from public.wishlist w
  inner join user_friends uf on uf.friend_id = w.user_id
  inner join public.profiles p on p.id = w.user_id
  left join wishlist_items wi on wi.wishlist_id = w.id
  where public.can_view_wishlist_for_user(w.id, w.user_id, w.visibility_type, v_current_user_id)
    and wi.items is not null
    and (v_search is null or w.title ilike '%' || v_search || '%')
  order by
    case p_sort when 'owner-asc' then coalesce(p.display_name, p.nickname, '') else null end asc nulls last,
    case p_sort when 'owner-desc' then coalesce(p.display_name, p.nickname, '') else null end desc nulls last,
    case when p_sort not in ('owner-asc', 'owner-desc') then w.created_at else null end desc nulls last
  offset p_skip
  limit p_take;
end;
$function$;

-- ------------------------------------------------------------

create or replace function public.get_reserved_wishlists_by_me(
  p_skip integer default 0,
  p_take integer default 20
)
returns table(id uuid, owner text, username text, avatar_url text, wishlist text, wishlist_id uuid, items jsonb)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_current_user_id uuid;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  with user_friends as (
    select case when f.user_f = v_current_user_id then f.user_s else f.user_f end as friend_id
    from public.friends f
    where f.user_f = v_current_user_id or f.user_s = v_current_user_id
  ),
  wishlist_items as (
    select
      i.wishlist_id,
      jsonb_agg(
        jsonb_build_object(
          'id', i.id::text,
          'title', i.name,
          'price', case when i.price is not null and i.price ~ '^[0-9]+\.?[0-9]*$' then i.price::numeric else 0 end,
          'store', case
            when i.url is not null and i.url != '' then coalesce(nullif(regexp_replace(regexp_replace(i.url, '^https?://(www\.)?', '', 'i'), '/.*$', ''), ''), 'Store')
            else 'Store'
          end,
          'image', coalesce(i.image_url, ''),
          'priority', ip.name,
          'status', i.status,
          'isReserved', true,
          'reservedBy', i.reserved_by,
          'isReservedByMe', true,
          'color_index', i.color_index,
          'reservedByUser', jsonb_build_object(
            'id', rp.id,
            'displayName', coalesce(rp.display_name, rp.nickname, 'Unknown User'),
            'username', coalesce(rp.nickname, ''),
            'avatarUrl', coalesce(rp.avatar_url, '')
          )
        )
        order by i.created_at desc
      ) as items
    from public.item i
    left join public.item_priorities ip on ip.id = i.priority_id
    left join public.profiles rp on rp.id = i.reserved_by
    where i.status = 1
      and i.reserved_by = v_current_user_id
    group by i.wishlist_id
  )
  select
    w.id,
    coalesce(p.display_name, p.nickname, 'Unknown User') as owner,
    coalesce(p.nickname, '') as username,
    coalesce(p.avatar_url, '') as avatar_url,
    w.title as wishlist,
    w.id as wishlist_id,
    coalesce(wi.items, '[]'::jsonb) as items
  from public.wishlist w
  inner join user_friends uf on uf.friend_id = w.user_id
  inner join public.profiles p on p.id = w.user_id
  inner join wishlist_items wi on wi.wishlist_id = w.id
  where public.can_view_wishlist_for_user(w.id, w.user_id, w.visibility_type, v_current_user_id)
  order by w.created_at desc
  offset p_skip
  limit p_take;
end;
$function$;

-- ------------------------------------------------------------

create or replace function public.toggle_item_reservation_for_current_user(
  p_item_id uuid,
  p_notify_owner boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_current_user_id uuid;
  v_item_owner_id uuid;
  v_current_status smallint;
  v_reserved_by uuid;
  v_wishlist_id uuid;
  v_visibility_type integer;
  v_result jsonb;
  v_notify boolean;
  v_reserver_name text;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select
    i.status,
    i.reserved_by,
    w.id,
    w.user_id,
    w.visibility_type
  into
    v_current_status,
    v_reserved_by,
    v_wishlist_id,
    v_item_owner_id,
    v_visibility_type
  from public.item i
  inner join public.wishlist w on w.id = i.wishlist_id
  where i.id = p_item_id;

  if v_item_owner_id is null then
    raise exception 'Item not found';
  end if;

  if v_item_owner_id = v_current_user_id then
    raise exception 'Cannot reserve your own item';
  end if;

  if not public.can_view_wishlist_for_user(
    v_wishlist_id,
    v_item_owner_id,
    v_visibility_type,
    v_current_user_id
  ) then
    if v_visibility_type = 2 then
      raise exception 'Cannot access private wishlist';
    elsif v_visibility_type = 1 then
      raise exception 'Not friends with item owner';
    else
      raise exception 'Cannot access wishlist';
    end if;
  end if;

  if v_current_status = 1 and v_reserved_by = v_current_user_id then
    update public.item
    set status = 0,
        reserved_by = null
    where id = p_item_id;
  elsif v_current_status = 1 then
    raise exception 'Item already reserved by another user';
  else
    update public.item
    set status = 1,
        reserved_by = v_current_user_id
    where id = p_item_id;

    if p_notify_owner then
      select coalesce(notify_reservations, true)
      into v_notify
      from public.user_settings
      where user_id = v_item_owner_id;

      if v_notify is true then
        select coalesce(raw_user_meta_data->>'full_name', email)
        into v_reserver_name
        from auth.users
        where id = v_current_user_id;

        insert into public.notifications (
          sender_id,
          receiver_id,
          text,
          icon_type
        ) values (
          v_current_user_id,
          v_item_owner_id,
          v_reserver_name || ' reserved your item',
          5
        );
      end if;
    end if;
  end if;

  select jsonb_build_object(
    'id', i.id,
    'name', i.name,
    'description', i.description,
    'price', i.price,
    'priority_id', i.priority_id,
    'priority_name', ip.name,
    'url', i.url,
    'status', i.status,
    'reserved_by', i.reserved_by,
    'image_url', i.image_url,
    'wishlist_id', i.wishlist_id,
    'created_at', i.created_at,
    'color_index', i.color_index,
    'is_reserved', i.status = 1,
    'is_reserved_by_me', i.reserved_by = v_current_user_id
  )
  into v_result
  from public.item i
  left join public.item_priorities ip on ip.id = i.priority_id
  where i.id = p_item_id;

  return v_result;
end;
$function$;

-- ------------------------------------------------------------

create or replace function public.toggle_item_bought_for_current_user(
  p_item_id uuid,
  p_notify_owner boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_current_user_id uuid;
  v_item_owner_id uuid;
  v_current_status smallint;
  v_reserved_by uuid;
  v_wishlist_id uuid;
  v_visibility_type integer;
  v_result jsonb;
  v_notify boolean;
  v_buyer_name text;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select
    i.status,
    i.reserved_by,
    w.id,
    w.user_id,
    w.visibility_type
  into
    v_current_status,
    v_reserved_by,
    v_wishlist_id,
    v_item_owner_id,
    v_visibility_type
  from public.item i
  inner join public.wishlist w on w.id = i.wishlist_id
  where i.id = p_item_id;

  if v_item_owner_id is null then
    raise exception 'Item not found';
  end if;

  if v_item_owner_id = v_current_user_id then
    raise exception 'Cannot buy your own item';
  end if;

  if not public.can_view_wishlist_for_user(
    v_wishlist_id,
    v_item_owner_id,
    v_visibility_type,
    v_current_user_id
  ) then
    if v_visibility_type = 2 then
      raise exception 'Cannot access private wishlist';
    elsif v_visibility_type = 1 then
      raise exception 'Not friends with item owner';
    else
      raise exception 'Cannot access wishlist';
    end if;
  end if;

  if v_current_status = 2 then
    if v_reserved_by = v_current_user_id then
      update public.item
      set status = 1,
          reserved_by = v_current_user_id
      where id = p_item_id;
    else
      raise exception 'Item already marked as bought by another user';
    end if;
  elsif v_current_status = 1 then
    if v_reserved_by = v_current_user_id then
      update public.item
      set status = 2,
          reserved_by = v_current_user_id
      where id = p_item_id;
    else
      raise exception 'Item is reserved by another user';
    end if;
  else
    update public.item
    set status = 2,
        reserved_by = v_current_user_id
    where id = p_item_id;
  end if;

  if p_notify_owner and exists (
    select 1
    from public.item i
    where i.id = p_item_id
      and i.status = 2
      and i.reserved_by = v_current_user_id
  ) then
    select coalesce(notify_reservations, true)
    into v_notify
    from public.user_settings
    where user_id = v_item_owner_id;

    if v_notify is true then
      select coalesce(raw_user_meta_data->>'full_name', email)
      into v_buyer_name
      from auth.users
      where id = v_current_user_id;

      insert into public.notifications (
        sender_id,
        receiver_id,
        text,
        icon_type
      ) values (
        v_current_user_id,
        v_item_owner_id,
        v_buyer_name || ' bought your item',
        5
      );
    end if;
  end if;

  select jsonb_build_object(
    'id', i.id,
    'name', i.name,
    'description', i.description,
    'price', i.price,
    'priority_id', i.priority_id,
    'priority_name', ip.name,
    'url', i.url,
    'status', i.status,
    'reserved_by', i.reserved_by,
    'image_url', i.image_url,
    'wishlist_id', i.wishlist_id,
    'created_at', i.created_at,
    'color_index', i.color_index,
    'is_reserved', i.status = 1,
    'is_bought', i.status = 2,
    'is_reserved_by_me', i.status = 1 and i.reserved_by = v_current_user_id,
    'is_bought_by_me', i.status = 2 and i.reserved_by = v_current_user_id
  )
  into v_result
  from public.item i
  left join public.item_priorities ip on ip.id = i.priority_id
  where i.id = p_item_id;

  return v_result;
end;
$function$;

-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_visible_items_by_max_price(
  p_user_id  uuid,
  p_max_price numeric,
  p_limit    integer DEFAULT 20,
  p_offset   integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $_$
declare
  v_result jsonb;
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if p_max_price is null then
    raise exception 'Max price is required';
  end if;

  if p_limit is null or p_limit <= 0 then
    raise exception 'Limit must be greater than 0';
  end if;

  if p_offset is null or p_offset < 0 then
    raise exception 'Offset must be greater than or equal to 0';
  end if;

  with filtered_items as (
    select
      i.id,
      i.wishlist_id,
      i.name,
      i.description,
      i.price,
      i.discount_price,
      i.has_discount,
      i.discount_end_date,
      i.currency,
      i.priority_id,
      ip.name as priority_name,
      i.color_index,
      i.url,
      i.image_url,
      i.status,
      i.reserved_by,
      i.created_at,
      w.title as wishlist_title,
      w.image_url as wishlist_image_url,
      w.user_id,
      w.visibility_type,
      case
        when i.has_discount = true
          and i.discount_price is not null
          and btrim(i.discount_price) <> ''
          and i.discount_price ~ '^\d+(\.\d+)?$'
        then i.discount_price::numeric
        when i.price is not null
          and btrim(i.price) <> ''
          and i.price ~ '^\d+(\.\d+)?$'
        then i.price::numeric
        else null
      end as effective_price
    from public.item i
    join public.wishlist w on w.id = i.wishlist_id
    left join public.item_priorities ip on ip.id = i.priority_id
    where w.user_id = p_user_id
      and w.visibility_type in (0, 1)
  ),
  matched_items as (
    select *
    from filtered_items
    where effective_price is not null
      and effective_price <= p_max_price
  ),
  total_count as (
    select count(*) as total
    from matched_items
  ),
  paginated as (
    select *
    from matched_items
    order by created_at desc, id desc
    limit p_limit
    offset p_offset
  )
  select jsonb_build_object(
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'wishlist_id', p.wishlist_id,
            'wishlist_title', p.wishlist_title,
            'wishlist_image_url', p.wishlist_image_url,
            'name', p.name,
            'description', p.description,
            'price', p.price,
            'discount_price', p.discount_price,
            'has_discount', p.has_discount,
            'effective_price', p.effective_price,
            'discount_end_date', p.discount_end_date,
            'currency', p.currency,
            'priority_id', p.priority_id,
            'priority_name', p.priority_name,
            'color_index', p.color_index,
            'url', p.url,
            'image_url', p.image_url,
            'status', p.status,
            'reserved_by', p.reserved_by,
            'created_at', p.created_at
          )
          order by p.created_at desc, p.id desc
        )
        from paginated p
      ),
      '[]'::jsonb
    ),
    'total',
    (select total from total_count),
    'limit',
    p_limit,
    'offset',
    p_offset
  )
  into v_result;

  return v_result;
end;
$_$;
