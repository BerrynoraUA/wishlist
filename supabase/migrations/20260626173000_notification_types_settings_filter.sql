-- Notification type map:
-- 0 = Secret Santa invite
-- 1 = Item reserved
-- 2 = Friends / friend requests
-- 3 = Item bought
-- 4 = New wishlist
-- 5 = Upcoming wishlist event

alter table public.user_settings
  add column if not exists notify_secret_santa boolean not null default true,
  add column if not exists notify_new_wishlists boolean not null default true,
  add column if not exists notify_upcoming_events boolean not null default true;

create or replace function public.get_unread_notifications_count(p_user_id uuid)
returns integer
language sql
stable
security definer
as $$
  select count(*)::integer
  from public.notifications
  where receiver_id = p_user_id
    and is_read = false;
$$;

create or replace function public.get_user_notifications(
  p_user_id uuid,
  p_limit integer default 20,
  p_offset integer default 0,
  p_unread_only boolean default false
)
returns table(
  id uuid,
  sender_id uuid,
  receiver_id uuid,
  sender_name text,
  sender_nickname text,
  sender_avatar_url text,
  text text,
  icon_type smallint,
  type smallint,
  entity_id uuid,
  is_read boolean,
  created_at timestamp with time zone
)
language plpgsql
set search_path to 'public'
as $$
begin
  return query
  select
    n.id,
    n.sender_id,
    n.receiver_id,
    coalesce(p.display_name, p.nickname, 'Unknown user') as sender_name,
    p.nickname as sender_nickname,
    p.avatar_url as sender_avatar_url,
    n.text,
    n.icon_type,
    n.type,
    n.entity_id,
    n.is_read,
    n.created_at
  from public.notifications n
  left join public.profiles p
    on p.id = n.sender_id
  where n.receiver_id = p_user_id
    and (not p_unread_only or n.is_read = false)
  order by n.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

create or replace function public.accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_sender uuid;
  v_receiver uuid;
  v_receiver_name text;
  v_notify boolean := true;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select sender_id, receiver_id
  into v_sender, v_receiver
  from public.friend_requests
  where id = p_request_id
    and status = 0;

  if not found then
    raise exception 'Request not found or already handled';
  end if;

  if v_receiver <> auth.uid() then
    raise exception 'Only receiver can accept request';
  end if;

  insert into public.friends (user_f, user_s)
  values (least(v_sender, v_receiver), greatest(v_sender, v_receiver))
  on conflict (user_f, user_s) do nothing;

  select coalesce(raw_user_meta_data->>'full_name', email)
  into v_receiver_name
  from auth.users
  where id = v_receiver;

  select coalesce(notify_friend_requests, true)
  into v_notify
  from public.user_settings
  where user_id = v_sender;

  if v_notify is true then
    insert into public.notifications (
      sender_id,
      receiver_id,
      text,
      icon_type,
      type,
      entity_id
    )
    values (
      v_receiver,
      v_sender,
      v_receiver_name || ' accepted your friend request',
      2,
      2,
      v_receiver
    );
  end if;

  delete from public.friend_requests
  where id = p_request_id;
end;
$$;

create or replace function public.reject_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_sender uuid;
  v_receiver uuid;
  v_receiver_name text;
  v_notify boolean := true;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select sender_id, receiver_id
  into v_sender, v_receiver
  from public.friend_requests
  where id = p_request_id
    and receiver_id = auth.uid()
    and status = 0;

  if not found then
    raise exception 'Request not found or already handled';
  end if;

  select coalesce(raw_user_meta_data->>'full_name', email)
  into v_receiver_name
  from auth.users
  where id = v_receiver;

  select coalesce(notify_friend_requests, true)
  into v_notify
  from public.user_settings
  where user_id = v_sender;

  if v_notify is true then
    insert into public.notifications (
      sender_id,
      receiver_id,
      text,
      icon_type,
      type,
      entity_id
    )
    values (
      v_receiver,
      v_sender,
      v_receiver_name || ' declined your friend request',
      3,
      2,
      v_receiver
    );
  end if;

  delete from public.friend_requests
  where id = p_request_id;
end;
$$;

create or replace function public.create_friend_request_notification()
returns trigger
language plpgsql
security definer
as $$
declare
  v_sender_name text;
  v_notify boolean := true;
begin
  select coalesce(raw_user_meta_data->>'full_name', email)
  into v_sender_name
  from auth.users
  where id = new.sender_id;

  select coalesce(notify_friend_requests, true)
  into v_notify
  from public.user_settings
  where user_id = new.receiver_id;

  if v_notify is not true then
    return new;
  end if;

  insert into public.notifications (
    sender_id,
    receiver_id,
    text,
    icon_type,
    type,
    entity_id
  )
  values (
    new.sender_id,
    new.receiver_id,
    v_sender_name || ' sent you a friend request',
    1,
    2,
    new.sender_id
  );

  return new;
end;
$$;

drop function if exists public.create_secret_santa_event(
  text,
  date,
  integer,
  text,
  jsonb
);

create or replace function public.create_secret_santa_event(
  p_name text,
  p_event_date timestamp with time zone,
  p_budget numeric,
  p_image_url text,
  p_invited_user_ids jsonb,
  p_currency text
)
returns public.secret_santa
language plpgsql
as $$
declare
  v_event public.secret_santa;
  v_user_id_text text;
  v_invited_user_id uuid;
  v_invite_id uuid;
  v_notify boolean := true;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Event name is required';
  end if;

  if p_event_date is null then
    raise exception 'Event date is required';
  end if;

  if p_budget is null or p_budget < 0 then
    raise exception 'Budget must be greater than or equal to 0';
  end if;

  if jsonb_typeof(p_invited_user_ids) <> 'array' then
    raise exception 'Invited users must be a json array';
  end if;

  insert into public.secret_santa (
    name,
    event_date,
    budget,
    currency,
    image_url,
    owner_id
  )
  values (
    p_name,
    p_event_date,
    p_budget,
    p_currency,
    p_image_url,
    auth.uid()
  )
  returning *
  into v_event;

  insert into public.secret_santa_participants (
    event_id,
    user_id,
    receiver_id
  )
  values (
    v_event.id,
    auth.uid(),
    null
  )
  on conflict do nothing;

  for v_user_id_text in
    select jsonb_array_elements_text(p_invited_user_ids)
  loop
    v_invited_user_id := v_user_id_text::uuid;

    if v_invited_user_id = auth.uid() then
      continue;
    end if;

    insert into public.secret_santa_invites (
      event_id,
      sender_id,
      receiver_id,
      status
    )
    values (
      v_event.id,
      auth.uid(),
      v_invited_user_id,
      0
    )
    on conflict (event_id, receiver_id) do update
      set status = 0,
          responded_at = null
    returning id into v_invite_id;

    select coalesce(notify_secret_santa, true)
    into v_notify
    from public.user_settings
    where user_id = v_invited_user_id;

    if v_notify is true then
      insert into public.notifications (
        sender_id,
        receiver_id,
        text,
        icon_type,
        type,
        entity_id,
        is_read
      )
      values (
        auth.uid(),
        v_invited_user_id,
        'You have been invited to Secret Santa "' || v_event.name || '"',
        0,
        0,
        v_invite_id,
        false
      );
    end if;
  end loop;

  return v_event;
end;
$$;

create or replace function public.notify_friends_about_new_wishlist(p_wishlist_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_wishlist record;
  v_friend_id uuid;
  v_notification_text text;
  v_notify boolean := true;
begin
  select
    w.id,
    w.user_id,
    w.title,
    w.visibility_type,
    coalesce(p.display_name, p.nickname, 'Unknown User') as owner_name
  into v_wishlist
  from public.wishlist w
  inner join public.profiles p on p.id = w.user_id
  where w.id = p_wishlist_id;

  if not found then
    return;
  end if;

  if v_wishlist.visibility_type not in (0, 1) then
    return;
  end if;

  v_notification_text := format(
    '%s created a new wishlist "%s"',
    v_wishlist.owner_name,
    v_wishlist.title
  );

  for v_friend_id in
    select
      case
        when f.user_f = v_wishlist.user_id then f.user_s
        else f.user_f
      end as friend_id
    from public.friends f
    where f.user_f = v_wishlist.user_id or f.user_s = v_wishlist.user_id
  loop
    select coalesce(notify_new_wishlists, true)
    into v_notify
    from public.user_settings
    where user_id = v_friend_id;

    if v_notify is true then
      insert into public.notifications (
        sender_id,
        receiver_id,
        text,
        icon_type,
        type,
        entity_id,
        is_read
      ) values (
        v_wishlist.user_id,
        v_friend_id,
        v_notification_text,
        4,
        4,
        v_wishlist.id,
        false
      );
    end if;
  end loop;
end;
$$;

create or replace function public.notify_friends_about_upcoming_event(
  p_wishlist_id uuid,
  p_notification_type text default 'week_before'
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_wishlist record;
  v_friend_id uuid;
  v_notification_text text;
  v_days_text text;
  v_notify boolean := true;
begin
  select
    w.id,
    w.user_id,
    w.title,
    w.event_date,
    coalesce(p.display_name, p.nickname, 'Unknown User') as owner_name
  into v_wishlist
  from public.wishlist w
  inner join public.profiles p on p.id = w.user_id
  where w.id = p_wishlist_id;

  if not found then
    return;
  end if;

  case p_notification_type
    when 'week_before' then v_days_text := 'in 1 week';
    when 'three_days_before' then v_days_text := 'in 3 days';
    when 'day_before' then v_days_text := 'tomorrow';
    when 'today' then v_days_text := 'today';
    else v_days_text := 'soon';
  end case;

  v_notification_text := format(
    '%s''s event "%s" is %s (%s)',
    v_wishlist.owner_name,
    v_wishlist.title,
    v_days_text,
    v_wishlist.event_date::text
  );

  for v_friend_id in
    select
      case
        when f.user_f = v_wishlist.user_id then f.user_s
        else f.user_f
      end as friend_id
    from public.friends f
    where f.user_f = v_wishlist.user_id or f.user_s = v_wishlist.user_id
  loop
    select coalesce(notify_upcoming_events, true)
    into v_notify
    from public.user_settings
    where user_id = v_friend_id;

    if v_notify is true and not exists (
      select 1
      from public.notifications
      where receiver_id = v_friend_id
        and sender_id = v_wishlist.user_id
        and text = v_notification_text
        and created_at > now() - interval '2 hours'
    ) then
      insert into public.notifications (
        sender_id,
        receiver_id,
        text,
        icon_type,
        type,
        entity_id,
        is_read
      ) values (
        v_wishlist.user_id,
        v_friend_id,
        v_notification_text,
        3,
        5,
        v_wishlist.id,
        false
      );
    end if;
  end loop;
end;
$$;

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
  v_notify boolean := true;
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
        icon_type,
        type,
        entity_id
      ) values (
        v_current_user_id,
        v_item_owner_id,
        v_buyer_name || ' bought your item',
        5,
        3,
        v_wishlist_id
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
$$;

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
  v_notify boolean := true;
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
          icon_type,
          type,
          entity_id
        ) values (
          v_current_user_id,
          v_item_owner_id,
          v_reserver_name || ' reserved your item',
          5,
          1,
          v_wishlist_id
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
$$;
