-- ============================================================
-- REVERT: Item Priorities refactor
-- Restores item.priority (smallint) from priority_id FK
-- Removes item_priorities table and selected_priorities column
-- ============================================================

-- Drop existing overloads of functions whose signatures change in this migration
do $drop_overloads$
declare r record;
begin
  for r in
    select oid::regprocedure::text as sig
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = any(array[
        'get_friends_wishlists_discover',
        'get_friends_wishlists_discover_all',
        'get_reserved_wishlists_by_me',
        'get_reserved_items_by_me',
        'get_my_bought_items',
        'get_wishlist_items',
        'get_wishlist_items_by_share_token',
        'get_user_visible_items_by_max_price'
      ])
  loop
    execute 'drop function ' || r.sig || ' cascade';
  end loop;
end $drop_overloads$;


-- 1. Re-add priority smallint column
ALTER TABLE "public"."item" ADD COLUMN IF NOT EXISTS "priority" smallint;

-- 2. Migrate data back (priority_id → priority smallint)
UPDATE "public"."item" SET "priority" = 1 WHERE "priority_id" = '11111111-0000-0000-0000-000000000001';
UPDATE "public"."item" SET "priority" = 2 WHERE "priority_id" = '11111111-0000-0000-0000-000000000002';
UPDATE "public"."item" SET "priority" = 3 WHERE "priority_id" = '11111111-0000-0000-0000-000000000003';
-- Premium priorities collapse back to 3 (highest available in original schema)
UPDATE "public"."item" SET "priority" = 3 WHERE "priority_id" IN (
  '11111111-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000005',
  '11111111-0000-0000-0000-000000000006',
  '11111111-0000-0000-0000-000000000007',
  '11111111-0000-0000-0000-000000000008',
  '11111111-0000-0000-0000-000000000009',
  '11111111-0000-0000-0000-000000000010'
);

-- 3. Drop priority_id from item
ALTER TABLE "public"."item" DROP COLUMN IF EXISTS "priority_id";

-- 4. Drop selected_priorities from user_settings
ALTER TABLE "public"."user_settings" DROP COLUMN IF EXISTS "selected_priorities";

-- ============================================================
-- 5. Restore get_wishlist_items — RETURNS SETOF item, integer priorities
-- Must DROP first because return type changed
-- ============================================================
DROP FUNCTION IF EXISTS public.get_wishlist_items(uuid, integer, integer, text, text, integer[], uuid[], numeric, numeric);

CREATE OR REPLACE FUNCTION public.get_wishlist_items(
  p_wishlist_id  uuid,
  p_skip         integer   DEFAULT 0,
  p_take         integer   DEFAULT 50,
  p_search       text      DEFAULT NULL,
  p_sort         text      DEFAULT 'newest',
  p_statuses     integer[] DEFAULT NULL,
  p_priorities   integer[] DEFAULT NULL,
  p_price_min    numeric   DEFAULT NULL,
  p_price_max    numeric   DEFAULT NULL
)
RETURNS SETOF public.item
LANGUAGE sql
STABLE
AS $function$
  SELECT i.*
  FROM public.item i
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
      OR i.priority = ANY(p_priorities)
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
    CASE WHEN p_sort = 'priority-high' THEN i.priority::integer END DESC NULLS LAST,
    CASE WHEN p_sort = 'priority-low'  THEN i.priority::integer END ASC NULLS LAST,
    i.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
$function$;

-- ============================================================
-- 6. Restore get_wishlist_items_by_share_token — RETURNS SETOF item
-- Must DROP first because return type changed
-- ============================================================
DROP FUNCTION IF EXISTS public.get_wishlist_items_by_share_token(text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_wishlist_items_by_share_token(
  p_token text,
  p_skip  integer DEFAULT 0,
  p_take  integer DEFAULT 50
)
RETURNS SETOF public.item
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
  SELECT i.*
  FROM public.item i
  WHERE i.wishlist_id = v_wishlist_id
  ORDER BY i.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
end;
$$;

-- ============================================================
-- 7. Restore get_friends_wishlists_discover — integer priorities
-- Must DROP because p_priorities type changed uuid[] → integer[]
-- ============================================================
DROP FUNCTION IF EXISTS public.get_friends_wishlists_discover(integer, integer, text, text, uuid[], numeric, numeric, text);

create or replace function public.get_friends_wishlists_discover(
  p_skip integer default 0,
  p_take integer default 20,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities integer[] default null::integer[],
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
          'priority', i.priority
        )
        order by i.created_at desc
      ) filter (where i.id is not null) as items
    from public.item i
    left join public.exchange_rates er_item
      on er_item.base_currency = 'USD'
     and er_item.target_currency = upper(coalesce(i.currency, 'USD'))
    where i.status = 0
      and (p_priorities is null or i.priority = any(p_priorities))
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

-- ============================================================
-- 8. Restore toggle_item_reservation_for_current_user
-- ============================================================
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
    'priority', i.priority,
    'url', i.url,
    'status', i.status,
    'reserved_by', i.reserved_by,
    'image_url', i.image_url,
    'wishlist_id', i.wishlist_id,
    'created_at', i.created_at,
    'is_reserved', i.status = 1,
    'is_reserved_by_me', i.reserved_by = v_current_user_id
  )
  into v_result
  from public.item i
  where i.id = p_item_id;

  return v_result;
end;
$function$;

-- ============================================================
-- 9. Restore toggle_item_bought_for_current_user
-- ============================================================
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
    'priority', i.priority,
    'url', i.url,
    'status', i.status,
    'reserved_by', i.reserved_by,
    'image_url', i.image_url,
    'wishlist_id', i.wishlist_id,
    'created_at', i.created_at,
    'is_reserved', i.status = 1,
    'is_bought', i.status = 2,
    'is_reserved_by_me', i.status = 1 and i.reserved_by = v_current_user_id,
    'is_bought_by_me', i.status = 2 and i.reserved_by = v_current_user_id
  )
  into v_result
  from public.item i
  where i.id = p_item_id;

  return v_result;
end;
$function$;

-- ============================================================
-- 10. Restore get_reserved_wishlists_by_me
-- ============================================================
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
          'priority', i.priority,
          'status', i.status,
          'isReserved', true,
          'reservedBy', i.reserved_by,
          'isReservedByMe', true,
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

-- ============================================================
-- 11. Restore get_friends_wishlists_discover_all — integer priorities
-- Must DROP because p_priorities type changed uuid[] → integer[]
-- ============================================================
DROP FUNCTION IF EXISTS public.get_friends_wishlists_discover_all(integer, integer, text, text, uuid[], numeric, numeric, text);

create or replace function public.get_friends_wishlists_discover_all(
  p_skip integer default 0,
  p_take integer default 20,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities integer[] default null::integer[],
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
          'priority', i.priority,
          'status', i.status
        )
        order by i.created_at desc
      ) filter (where i.id is not null) as items
    from public.item i
    left join public.exchange_rates er_item
      on er_item.base_currency = 'USD'
     and er_item.target_currency = upper(coalesce(i.currency, 'USD'))
    where (p_priorities is null or i.priority = any(p_priorities))
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

-- ============================================================
-- 12. Restore get_reserved_items_by_me — integer priorities, priority integer column
-- Must DROP because RETURNS TABLE column type changed
-- ============================================================
DROP FUNCTION IF EXISTS public.get_reserved_items_by_me(integer, integer, text, text, uuid[], numeric, numeric, text);

create or replace function public.get_reserved_items_by_me(
  p_skip integer default 0,
  p_take integer default 10,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities integer[] default null::integer[],
  p_price_min numeric default null::numeric,
  p_price_max numeric default null::numeric,
  p_display_currency text default 'USD'::text
)
returns table(item_id uuid, title text, price numeric, discount_price numeric, currency text, url text, store text, image text, priority integer, status integer, wishlist_id uuid, wishlist_title text, owner_id uuid, owner_name text, owner_username text, owner_avatar text)
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
    i.priority::integer as priority,
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
  left join public.exchange_rates er_item
    on er_item.base_currency = 'USD'
   and er_item.target_currency = upper(coalesce(i.currency, 'USD'))
  where i.status = 1
    and i.reserved_by = v_current_user_id
    and public.can_view_wishlist_for_user(w.id, w.user_id, w.visibility_type, v_current_user_id)
    and (p_priorities is null or i.priority = any(p_priorities))
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
      when 'priority-high' then -coalesce(i.priority, 0)::numeric
      when 'priority-low' then coalesce(i.priority, 0)::numeric
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
-- 13. Restore get_my_bought_items — integer priorities, priority integer column
-- Must DROP because RETURNS TABLE column type changed
-- ============================================================
DROP FUNCTION IF EXISTS public.get_my_bought_items(integer, integer, text, text, uuid[], numeric, numeric, text);

create or replace function public.get_my_bought_items(
  p_skip integer default 0,
  p_take integer default 20,
  p_search text default null::text,
  p_sort text default 'default'::text,
  p_priorities integer[] default null::integer[],
  p_price_min numeric default null::numeric,
  p_price_max numeric default null::numeric,
  p_display_currency text default 'USD'::text
)
returns table(item_id uuid, title text, price numeric, discount_price numeric, url text, store text, image text, priority integer, status integer, wishlist_id uuid, wishlist_title text, owner_id uuid, owner_name text, owner_username text, owner_avatar text)
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
    i.priority::integer as priority,
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
  left join public.exchange_rates er_item
    on er_item.base_currency = 'USD'
   and er_item.target_currency = upper(coalesce(i.currency, 'USD'))
  where i.status = 2
    and i.reserved_by = v_current_user_id
    and public.can_view_wishlist_for_user(w.id, w.user_id, w.visibility_type, v_current_user_id)
    and (p_priorities is null or i.priority = any(p_priorities))
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
      when 'priority-high' then -coalesce(i.priority, 0)::numeric
      when 'priority-low' then coalesce(i.priority, 0)::numeric
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
-- 14. Drop item_priorities table (after all FK references removed)
-- ============================================================
DROP TABLE IF EXISTS "public"."item_priorities";
