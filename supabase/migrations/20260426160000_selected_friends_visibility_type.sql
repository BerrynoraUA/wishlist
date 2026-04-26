alter table public.wishlist
  drop constraint if exists check_visibility_type;

alter table public.wishlist
  drop constraint if exists wishlist_visibility_type_check;

alter table public.wishlist
  add constraint check_visibility_type check (visibility_type >= 0 and visibility_type <= 3);

alter table public.wishlist_access
  drop constraint if exists check_access_type;

alter table public.wishlist_access
  drop constraint if exists wishlist_access_access_type_check;

alter table public.wishlist_access
  add constraint check_access_type check (access_type = any (array[0, 1, 2, 3]));

create or replace function public.can_view_wishlist_for_user(
  p_wishlist_id uuid,
  p_wishlist_owner_id uuid,
  p_visibility_type integer,
  p_user_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and (
      p_wishlist_owner_id = p_user_id
      or p_visibility_type = 0
      or (
        p_visibility_type = 1
        and exists (
          select 1
          from public.friends f
          where (f.user_f = p_user_id and f.user_s = p_wishlist_owner_id)
             or (f.user_s = p_user_id and f.user_f = p_wishlist_owner_id)
        )
      )
      or (
        p_visibility_type = 3
        and exists (
          select 1
          from public.wishlist_access wa
          where wa.wishlist_id = p_wishlist_id
            and wa.granted_to_user_id = p_user_id
        )
      )
    );
$$;

alter function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) owner to postgres;

grant all on function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) to anon;
grant all on function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) to authenticated;
grant all on function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) to service_role;

drop policy if exists "wishlist_select_accessible_v2" on public.wishlist;
drop policy if exists "wishlist_select_accessible_v3" on public.wishlist;

create policy "wishlist_select_accessible_v3"
on public.wishlist
for select
using (
  public.can_view_wishlist_for_user(
    wishlist.id,
    wishlist.user_id,
    wishlist.visibility_type,
    auth.uid()
  )
);

drop policy if exists "Item: select if wishlist accessible" on public.item;

create policy "Item: select if wishlist accessible"
on public.item
for select
using (
  exists (
    select 1
    from public.wishlist w
    where w.id = item.wishlist_id
      and public.can_view_wishlist_for_user(
        w.id,
        w.user_id,
        w.visibility_type,
        auth.uid()
      )
  )
);

drop policy if exists "Users can reserve friends items" on public.item;

create policy "Users can reserve friends items"
on public.item
for update
using (
  exists (
    select 1
    from public.wishlist w
    where w.id = item.wishlist_id
      and public.can_view_wishlist_for_user(
        w.id,
        w.user_id,
        w.visibility_type,
        auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.wishlist w
    where w.id = item.wishlist_id
      and public.can_view_wishlist_for_user(
        w.id,
        w.user_id,
        w.visibility_type,
        auth.uid()
      )
  )
);

create or replace function public.grant_wishlist_access(
  p_wishlist_id uuid,
  p_granted_to_user_id uuid,
  p_access_type integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
  v_wishlist_owner_id uuid;
  v_target_nickname text;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_access_type not in (0, 1, 2, 3) then
    raise exception 'Invalid access type';
  end if;

  select w.user_id
  into v_wishlist_owner_id
  from public.wishlist w
  where w.id = p_wishlist_id;

  if v_wishlist_owner_id is null then
    raise exception 'Wishlist not found';
  end if;

  if v_wishlist_owner_id <> v_current_user_id then
    raise exception 'Only wishlist owner can grant access';
  end if;

  if p_granted_to_user_id = v_current_user_id then
    raise exception 'Cannot grant access to yourself';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_granted_to_user_id
  ) then
    raise exception 'Target user not found';
  end if;

  insert into public.wishlist_access (
    wishlist_id,
    granted_to_user_id,
    granted_by_user_id,
    access_type
  )
  values (
    p_wishlist_id,
    p_granted_to_user_id,
    v_current_user_id,
    p_access_type
  )
  on conflict (wishlist_id, granted_to_user_id)
  do update set
    access_type = excluded.access_type,
    granted_by_user_id = excluded.granted_by_user_id,
    created_at = now();

  select p.nickname
  into v_target_nickname
  from public.profiles p
  where p.id = p_granted_to_user_id;

  return jsonb_build_object(
    'success', true,
    'wishlist_id', p_wishlist_id,
    'granted_to_user_id', p_granted_to_user_id,
    'granted_to_nickname', v_target_nickname,
    'access_type', p_access_type,
    'access_role', case
      when p_access_type = 1 then 'editor'
      when p_access_type = 3 then 'selected_friends'
      else 'viewer'
    end
  );
end;
$$;

alter function public.grant_wishlist_access(uuid, uuid, integer) owner to postgres;

create or replace function public.get_wishlist_by_id(p_wishlist_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
  v_wishlist_owner_id uuid;
  v_visibility_type integer;
  v_owner_nickname text;
  v_result jsonb;
  v_items_count bigint;
  v_is_owner boolean;
  v_can_edit boolean := false;
  v_access_type integer;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select w.user_id, w.visibility_type, p.nickname
  into v_wishlist_owner_id, v_visibility_type, v_owner_nickname
  from public.wishlist w
  left join public.profiles p on p.id = w.user_id
  where w.id = p_wishlist_id;

  if v_wishlist_owner_id is null then
    raise exception 'Wishlist not found';
  end if;

  v_is_owner := (v_wishlist_owner_id = v_current_user_id);

  select wa.access_type
  into v_access_type
  from public.wishlist_access wa
  where wa.wishlist_id = p_wishlist_id
    and wa.granted_to_user_id = v_current_user_id
  limit 1;

  if v_is_owner then
    v_can_edit := true;
  else
    v_can_edit := (v_access_type = 1);

    if not public.can_view_wishlist_for_user(
      p_wishlist_id,
      v_wishlist_owner_id,
      v_visibility_type,
      v_current_user_id
    ) then
      if v_visibility_type = 2 then
        raise exception 'Cannot access private wishlist';
      elsif v_visibility_type = 1 then
        raise exception 'Not friends with wishlist owner';
      else
        raise exception 'Cannot access wishlist';
      end if;
    end if;
  end if;

  select count(*)
  into v_items_count
  from public.item
  where wishlist_id = p_wishlist_id;

  select jsonb_build_object(
    'id', w.id,
    'user_id', w.user_id,
    'title', w.title,
    'description', w.description,
    'image_url', w.image_url,
    'created_at', w.created_at,
    'visibility_type', w.visibility_type,
    'accent_type', w.accent_type,
    'itemsCount', v_items_count,
    'items_count', v_items_count,
    'event_date', w.event_date,
    'is_owner', v_is_owner,
    'can_edit', v_can_edit,
    'access_type', case when v_is_owner then null else v_access_type end,
    'owner_nickname', case when v_is_owner then null else v_owner_nickname end
  )
  into v_result
  from public.wishlist w
  where w.id = p_wishlist_id;

  return v_result;
end;
$$;

alter function public.get_wishlist_by_id(uuid) owner to postgres;

create or replace function public.get_friend_wishlists(
  p_friend_user_id uuid,
  p_skip integer default 0,
  p_take integer default 10,
  p_search text default null::text,
  p_sort text default 'newest'::text
)
returns table(
  id uuid,
  user_id uuid,
  title text,
  description text,
  image_url text,
  created_at timestamp with time zone,
  visibility_type integer,
  accent_type integer,
  event_date date,
  items_count bigint,
  can_edit boolean,
  is_owner boolean,
  access_type integer,
  owner_nickname text
)
language sql
stable
security definer
set search_path = public
as $$
  with visible_wishlists as (
    select
      w.id,
      w.user_id,
      w.title,
      w.description,
      w.image_url,
      w.created_at,
      w.visibility_type,
      w.accent_type,
      w.event_date,
      (wa.access_type = 1) as can_edit,
      false as is_owner,
      wa.access_type,
      p.nickname as owner_nickname
    from public.wishlist w
    left join public.wishlist_access wa
      on wa.wishlist_id = w.id
     and wa.granted_to_user_id = auth.uid()
    left join public.profiles p
      on p.id = w.user_id
    where w.user_id = p_friend_user_id
      and exists (
        select 1
        from public.friends f
        where (f.user_f = auth.uid() and f.user_s = p_friend_user_id)
           or (f.user_s = auth.uid() and f.user_f = p_friend_user_id)
      )
      and public.can_view_wishlist_for_user(w.id, w.user_id, w.visibility_type, auth.uid())
      and (
        p_search is null
        or p_search = ''
        or w.title ilike '%' || p_search || '%'
      )
  ),
  item_counts as (
    select i.wishlist_id, count(*)::bigint as items_count
    from public.item i
    where i.wishlist_id in (select vw.id from visible_wishlists vw)
    group by i.wishlist_id
  ),
  enriched as (
    select vw.*, coalesce(ic.items_count, 0) as items_count
    from visible_wishlists vw
    left join item_counts ic on ic.wishlist_id = vw.id
  )
  select
    e.id,
    e.user_id,
    e.title,
    e.description,
    e.image_url,
    e.created_at,
    e.visibility_type,
    e.accent_type,
    e.event_date,
    e.items_count,
    e.can_edit,
    e.is_owner,
    e.access_type,
    e.owner_nickname
  from enriched e
  order by
    case when coalesce(p_sort, 'newest') = 'newest' then e.created_at end desc nulls last,
    case when p_sort = 'oldest' then e.created_at end asc nulls last,
    case when p_sort = 'name-asc' then lower(e.title) end asc nulls last,
    case when p_sort = 'name-desc' then lower(e.title) end desc nulls last,
    case when p_sort = 'items-most' then e.items_count end desc nulls last,
    case when p_sort = 'items-least' then e.items_count end asc nulls last,
    e.created_at desc,
    e.id desc
  offset p_skip
  limit p_take;
$$;

alter function public.get_friend_wishlists(uuid, integer, integer, text, text) owner to postgres;

grant all on function public.get_friend_wishlists(uuid, integer, integer, text, text) to anon;
grant all on function public.get_friend_wishlists(uuid, integer, integer, text, text) to authenticated;
grant all on function public.get_friend_wishlists(uuid, integer, integer, text, text) to service_role;

create or replace function public.get_my_wishlists_feed(
  p_skip integer default 0,
  p_take integer default 10,
  p_search text default null::text,
  p_sort text default 'newest'::text,
  p_visibility_types integer[] default null::integer[]
)
returns table(id uuid, user_id uuid, title text, description text, image_url text, created_at timestamp with time zone, visibility_type integer, accent_type integer, event_date date, items_count bigint, can_edit boolean, is_owner boolean, access_type integer, owner_nickname text)
language sql
stable
as $$
  with accessible_wishlists as (
    select
      w.id,
      w.user_id,
      w.title,
      w.description,
      w.image_url,
      w.created_at,
      w.visibility_type,
      w.accent_type,
      w.event_date,
      case
        when w.user_id = auth.uid() then true
        when wa.access_type = 1 then true
        else false
      end as can_edit,
      (w.user_id = auth.uid()) as is_owner,
      case when w.user_id = auth.uid() then null else wa.access_type end as access_type,
      case when w.user_id = auth.uid() then null else p.nickname end as owner_nickname
    from public.wishlist w
    left join public.wishlist_access wa
      on wa.wishlist_id = w.id
     and wa.granted_to_user_id = auth.uid()
    left join public.profiles p on p.id = w.user_id
    where public.can_view_wishlist_for_user(w.id, w.user_id, w.visibility_type, auth.uid())
      and (w.user_id = auth.uid() or wa.access_type in (0, 1))
      and (
        p_search is null
        or p_search = ''
        or w.title ilike '%' || p_search || '%'
      )
      and (
        p_visibility_types is null
        or array_length(p_visibility_types, 1) is null
        or w.visibility_type = any(p_visibility_types)
      )
  ),
  item_counts as (
    select i.wishlist_id, count(*)::bigint as items_count
    from public.item i
    where i.wishlist_id in (select aw.id from accessible_wishlists aw)
    group by i.wishlist_id
  ),
  enriched as (
    select aw.*, coalesce(ic.items_count, 0) as items_count
    from accessible_wishlists aw
    left join item_counts ic on ic.wishlist_id = aw.id
  ),
  paginated as (
    select *
    from enriched
    order by
      case when coalesce(p_sort, 'newest') = 'newest' then created_at end desc nulls last,
      case when p_sort = 'oldest' then created_at end asc nulls last,
      case when p_sort = 'name-asc' then lower(title) end asc nulls last,
      case when p_sort = 'name-desc' then lower(title) end desc nulls last,
      case when p_sort = 'items-most' then items_count end desc nulls last,
      case when p_sort = 'items-least' then items_count end asc nulls last,
      created_at desc,
      id desc
    offset p_skip
    limit p_take
  )
  select
    pw.id,
    pw.user_id,
    pw.title,
    pw.description,
    pw.image_url,
    pw.created_at,
    pw.visibility_type,
    pw.accent_type,
    pw.event_date,
    pw.items_count,
    pw.can_edit,
    pw.is_owner,
    pw.access_type,
    pw.owner_nickname
  from paginated pw;
$$;

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
          'priority', case i.priority when 1 then 'Low' when 2 then 'Medium' when 3 then 'High' else null end
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

create or replace function public.toggle_item_reservation(p_item_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.toggle_item_reservation_for_current_user(p_item_id, true);
$$;

create or replace function public.toggle_item_reservation_secret(p_item_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.toggle_item_reservation_for_current_user(p_item_id, false);
$$;

create or replace function public.toggle_item_bought(p_item_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.toggle_item_bought_for_current_user(p_item_id, true);
$$;

create or replace function public.toggle_item_bought_secret(p_item_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.toggle_item_bought_for_current_user(p_item_id, false);
$$;

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
          'priority', case i.priority when 1 then 'Low' when 2 then 'Medium' when 3 then 'High' else null end,
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
          'priority', case i.priority when 1 then 'Low' when 2 then 'Medium' when 3 then 'High' else null end,
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
    coalesce(i.priority, 0)::integer as priority,
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
    coalesce(i.priority, 0)::integer as priority,
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