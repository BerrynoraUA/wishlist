-- get_my_bought_items never returned the item's currency (get_reserved_items_by_me does),
-- so purchased gifts showed a bare number. Adding a column changes the return type, so the
-- function is dropped and re-created; the grant goes with the drop and is restored below.
drop function if exists public.get_my_bought_items(
  integer, integer, text, text, uuid[], numeric, numeric, text
);

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


grant all on function public.get_my_bought_items(
  integer, integer, text, text, uuid[], numeric, numeric, text
) to anon, authenticated, service_role;
