-- Default ordering for the items inside a wishlist — your own and anyone else's.
--
-- Top to bottom: Starred, High, Medium, Low, then items with no priority at all, then
-- the ones already reserved, and finally the purchased ones. Status wins over priority
-- on purpose: a gift that is already bought has nothing left to say, however important
-- it was. Priorities themselves are ranked by `item_priorities.sort_order`, so adding a
-- tier later needs no change here.
--
-- Only the default sort is affected; picking Oldest, Name, Price or Priority from the
-- sort menu still sorts purely by that.

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
    case when coalesce(p_sort, 'newest') in ('default', 'newest') then
      case
        when i.status = 2 then 3
        when i.status = 1 then 2
        when i.priority_id is null then 1
        else 0
      end
    end asc nulls last,
    case when coalesce(p_sort, 'newest') in ('default', 'newest') then ip.sort_order end
      desc nulls last,
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
    case
      when i.status = 2 then 3
      when i.status = 1 then 2
      when i.priority_id is null then 1
      else 0
    end asc,
    ip.sort_order desc nulls last,
    i.created_at desc
  offset p_skip
  limit p_take;
end;
$$;

