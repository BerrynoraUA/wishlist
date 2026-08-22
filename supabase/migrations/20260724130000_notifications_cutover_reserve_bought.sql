-- Cutover: item reserved (type 1) + item bought (type 3) notifications move to the client.
--
-- The client now renders the localized text (recipient's language) and writes it via
-- public.create_notification(). So here we:
--   * remove the server-side notification INSERT from both toggle_item_*_for_current_user fns;
--   * add `owner_id` to the returned jsonb so the acting client knows the recipient without a
--     second query (the reserver already may view the wishlist, so owner_id is not sensitive).
--
-- Behavior otherwise unchanged. The thin wrappers toggle_item_reservation / _secret /
-- toggle_item_bought / _secret keep calling these; only non-secret client paths create the
-- notification (matching the old p_notify_owner=true vs _secret=false split).

-- ---------------------------------------------------------------------------
-- Item reserved (type 1)
-- ---------------------------------------------------------------------------
create or replace function public.toggle_item_reservation_for_current_user(
  p_item_id uuid,
  p_notify_owner boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_current_user_id uuid;
  v_item_owner_id uuid;
  v_current_status smallint;
  v_reserved_by uuid;
  v_wishlist_id uuid;
  v_visibility_type integer;
  v_result jsonb;
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
    -- Notification is created by the client (localized) via create_notification().
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
    'owner_id', v_item_owner_id,
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
$$;

-- ---------------------------------------------------------------------------
-- Item bought (type 3)
-- ---------------------------------------------------------------------------
create or replace function public.toggle_item_bought_for_current_user(
  p_item_id uuid,
  p_notify_owner boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_current_user_id uuid;
  v_item_owner_id uuid;
  v_current_status smallint;
  v_reserved_by uuid;
  v_wishlist_id uuid;
  v_visibility_type integer;
  v_result jsonb;
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
  -- Notification is created by the client (localized) via create_notification().

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
    'owner_id', v_item_owner_id,
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
$$;
