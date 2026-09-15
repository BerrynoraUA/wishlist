-- Item card colours come back: the picker in the item modals writes `item.color_index`,
-- and that colour is what makes a card glow now that priorities no longer tint them.
--
-- The column was dropped by 20260812120000_priority_star.sql when the priority took over
-- the tint, so it is added again here, and every function that feeds an item list is
-- re-created with the column in its output — otherwise the colour would only be visible
-- to whoever set it, and only until they reloaded.

alter table public.item
  add column if not exists color_index smallint null default null;

-- `create or replace` cannot widen a function's RETURNS TABLE, so the three whose output
-- gains a column are dropped first. The two discover functions return their items as
-- jsonb, so their signature is untouched and they are replaced in place.
drop function if exists public.get_wishlist_items(
  uuid, integer, integer, text, text, integer[], uuid[], numeric, numeric
);
drop function if exists public.get_wishlist_items_by_share_token(text, integer, integer);
drop function if exists public.get_reserved_items_by_me(
  integer, integer, text, text, uuid[], numeric, numeric, text
);
drop function if exists public.get_my_bought_items(
  integer, integer, text, text, uuid[], numeric, numeric, text
);

create or replace function public.get_wishlist_items(
  p_wishlist_id uuid,
  p_skip integer default 0,
  p_take integer default 50,
  p_search text default null::text,
  p_sort text default 'newest'::text,
  p_statuses integer[] default null::integer[],
  p_priorities uuid[] default null::uuid[],
  p_price_min numeric default null::numeric,
  p_price_max numeric default null::numeric
) returns table(
  id uuid,
  wishlist_id uuid,
  name text,
  description text,
  price text,
  url text,
  created_at timestamp with time zone,
  status smallint,
  reserved_by uuid,
  image_url text,
  discount_price text,
  has_discount boolean,
  discount_end_date text,
  currency text,
  additional_links jsonb,
  priority_id uuid,
  priority_name text,
  color_index smallint
)
language sql
stable
as $$
  select
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
    ip.name as priority_name,
    i.color_index
  from public.item i
  left join public.item_priorities ip on ip.id = i.priority_id
  where
    i.wishlist_id = p_wishlist_id
    and (
      p_search is null
      or p_search = ''
      or i.name ilike '%' || p_search || '%'
      or i.description ilike '%' || p_search || '%'
    )
    and (
      array_length(p_statuses, 1) is null
      or i.status = any(p_statuses)
    )
    and (
      array_length(p_priorities, 1) is null
      or i.priority_id = any(p_priorities)
    )
    and (
      p_price_min is null
      or coalesce(
        nullif(regexp_replace(coalesce(i.discount_price, i.price, '0'), '[^0-9.\-]', '', 'g'), ''),
        '0'
      )::numeric >= p_price_min
    )
    and (
      p_price_max is null
      or coalesce(
        nullif(regexp_replace(coalesce(i.discount_price, i.price, '0'), '[^0-9.\-]', '', 'g'), ''),
        '0'
      )::numeric <= p_price_max
    )
  order by
    case when coalesce(p_sort, 'newest') in ('default', 'newest') and i.priority_id = '11111111-0000-0000-0000-000000000011'::uuid then 0 else 1 end,
    case when p_sort = 'oldest'        then extract(epoch from i.created_at) end asc,
    case when p_sort = 'name-asc'      then i.name end asc,
    case when p_sort = 'name-desc'     then i.name end desc,
    case when p_sort = 'price-high'    then coalesce(
      nullif(regexp_replace(coalesce(i.discount_price, i.price, '0'), '[^0-9.\-]', '', 'g'), ''),
      '0'
    )::numeric end desc nulls last,
    case when p_sort = 'price-low'     then coalesce(
      nullif(regexp_replace(coalesce(i.discount_price, i.price, '0'), '[^0-9.\-]', '', 'g'), ''),
      '0'
    )::numeric end asc nulls last,
    case when p_sort = 'priority-high' then ip.sort_order end desc nulls last,
    case when p_sort = 'priority-low'  then ip.sort_order end asc nulls last,
    i.created_at desc
  offset p_skip
  limit p_take;
$$;

create or replace function public.get_wishlist_items_by_share_token(
  p_token text,
  p_skip integer default 0,
  p_take integer default 50
) returns table(
  id uuid,
  wishlist_id uuid,
  name text,
  description text,
  price text,
  url text,
  created_at timestamp with time zone,
  status smallint,
  reserved_by uuid,
  image_url text,
  discount_price text,
  has_discount boolean,
  discount_end_date text,
  currency text,
  additional_links jsonb,
  priority_id uuid,
  priority_name text,
  color_index smallint
)
language plpgsql
security definer
as $$
declare
  v_wishlist_id uuid;
begin
  v_wishlist_id := public.verify_wishlist_share_token(p_token);

  if v_wishlist_id is null then
    raise exception 'Invalid or expired token';
  end if;

  return query
  select
    i.id, i.wishlist_id, i.name, i.description, i.price, i.url,
    i.created_at, i.status, i.reserved_by, i.image_url,
    i.discount_price, i.has_discount, i.discount_end_date, i.currency,
    i.additional_links, i.priority_id, ip.name as priority_name, i.color_index
  from public.item i
  left join public.item_priorities ip on ip.id = i.priority_id
  where i.wishlist_id = v_wishlist_id
  order by
    case when i.priority_id = '11111111-0000-0000-0000-000000000011'::uuid then 0 else 1 end,
    i.created_at desc
  offset p_skip
  limit p_take;
end;
$$;

create or replace function public.get_friends_wishlists_discover(
  p_skip integer default 0,
  p_take integer default 20,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities uuid[] default null::uuid[],
  p_price_min numeric default null::numeric,
  p_price_max numeric default null::numeric,
  p_display_currency text default 'USD'::text
) returns table(
  id uuid,
  owner text,
  username text,
  avatar_url text,
  wishlist text,
  wishlist_id uuid,
  friend_id uuid,
  items jsonb
)
language plpgsql
security definer
set search_path to 'public'
as $_$
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

  if v_display_rate is null then
    v_display_rate := 1;
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
          'color_index', i.color_index,
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
          'priority_id', i.priority_id,
          'additional_links', i.additional_links,
          'status', i.status,
          'reservedBy', i.reserved_by,
          'reservedByName', case
            when i.reserved_by is null then null
            else coalesce(rp.display_name, rp.nickname, 'Unknown user')
          end
        )
        order by
          case when coalesce(p_sort, 'default') in ('default', 'newest') and i.priority_id = '11111111-0000-0000-0000-000000000011'::uuid then 0 else 1 end,
          i.created_at desc
      ) filter (where i.id is not null) as items
    from public.item i
    left join public.item_priorities ip on ip.id = i.priority_id
    left join public.profiles rp on rp.id = i.reserved_by
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
$_$;

create or replace function public.get_friends_wishlists_discover_all(
  p_skip integer default 0,
  p_take integer default 20,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities uuid[] default null::uuid[],
  p_price_min numeric default null::numeric,
  p_price_max numeric default null::numeric,
  p_display_currency text default 'USD'::text
) returns table(
  id uuid,
  owner text,
  username text,
  avatar_url text,
  wishlist text,
  wishlist_id uuid,
  friend_id uuid,
  items jsonb
)
language plpgsql
security definer
set search_path to 'public'
as $_$
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

  if v_display_rate is null then
    v_display_rate := 1;
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
          'color_index', i.color_index,
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
          'priority_id', i.priority_id,
          'additional_links', i.additional_links,
          'status', i.status,
          'reservedBy', i.reserved_by,
          'reservedByName', case
            when i.reserved_by is null then null
            else coalesce(rp.display_name, rp.nickname, 'Unknown user')
          end
        )
        order by
          case when coalesce(p_sort, 'default') in ('default', 'newest') and i.priority_id = '11111111-0000-0000-0000-000000000011'::uuid then 0 else 1 end,
          i.created_at desc
      ) filter (where i.id is not null) as items
    from public.item i
    left join public.item_priorities ip on ip.id = i.priority_id
    left join public.profiles rp on rp.id = i.reserved_by
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
$_$;

create or replace function public.get_reserved_items_by_me(
  p_skip integer default 0,
  p_take integer default 10,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities uuid[] default null::uuid[],
  p_price_min numeric default null::numeric,
  p_price_max numeric default null::numeric,
  p_display_currency text default 'USD'::text
) returns table(
  item_id uuid,
  title text,
  price numeric,
  discount_price numeric,
  currency text,
  url text,
  store text,
  image text,
  priority_name text,
  color_index smallint,
  additional_links jsonb,
  status integer,
  wishlist_id uuid,
  wishlist_title text,
  owner_id uuid,
  owner_name text,
  owner_username text,
  owner_avatar text
)
language plpgsql
security definer
set search_path to 'public'
as $_$
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
    i.additional_links as additional_links,
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
    case when coalesce(p_sort, 'default') in ('default', 'newest') and i.priority_id = '11111111-0000-0000-0000-000000000011'::uuid then 0 else 1 end,
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
$_$;

create or replace function public.get_my_bought_items(
  p_skip integer default 0,
  p_take integer default 20,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities uuid[] default null::uuid[],
  p_price_min numeric default null::numeric,
  p_price_max numeric default null::numeric,
  p_display_currency text default 'USD'::text
) returns table(
  item_id uuid,
  title text,
  price numeric,
  discount_price numeric,
  url text,
  store text,
  image text,
  priority_name text,
  color_index smallint,
  additional_links jsonb,
  status integer,
  wishlist_id uuid,
  wishlist_title text,
  owner_id uuid,
  owner_name text,
  owner_username text,
  owner_avatar text
)
language plpgsql
security definer
set search_path to 'public'
as $_$
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
    i.additional_links as additional_links,
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
    case when coalesce(p_sort, 'default') in ('default', 'newest') and i.priority_id = '11111111-0000-0000-0000-000000000011'::uuid then 0 else 1 end,
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
$_$;


-- Dropping a function drops its grants with it, so the four that were re-created get
-- theirs back explicitly. The two discover functions kept theirs — they were replaced.
grant all on function public.get_wishlist_items(
  uuid, integer, integer, text, text, integer[], uuid[], numeric, numeric
) to anon, authenticated, service_role;

grant all on function public.get_wishlist_items_by_share_token(text, integer, integer)
  to anon, authenticated, service_role;

grant all on function public.get_reserved_items_by_me(
  integer, integer, text, text, uuid[], numeric, numeric, text
) to anon, authenticated, service_role;

grant all on function public.get_my_bought_items(
  integer, integer, text, text, uuid[], numeric, numeric, text
) to anon, authenticated, service_role;
