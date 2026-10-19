-- Offline creation on mobile: the app now picks a record's id itself, so something made without
-- a connection can be shown, edited and referenced before it reaches the server, and the
-- queued write can be retried safely after a dropped connection.
--
-- Wishlists and items are inserted directly and already accept a client id. Friend groups and
-- Secret Santa events are created through these functions, which gain an optional `p_id`.
-- Called again with the same id by the same user, they return the existing record instead of
-- failing, so a retry of a write that already landed is harmless. Callers that omit `p_id`
-- behave exactly as before.

drop function if exists public.create_friend_group(text, text, text, text, uuid[]);

create or replace function public.create_friend_group(
  p_name text,
  p_description text default null,
  p_color text default 'pink',
  p_icon text default 'users',
  p_member_ids uuid[] default array[]::uuid[],
  p_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_current_user_id uuid;
  v_group_id uuid;
  v_existing_owner_id uuid;
  v_member_count integer;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_id is not null then
    select user_id into v_existing_owner_id
    from public.friend_groups
    where id = p_id;

    if found then
      if v_existing_owner_id <> v_current_user_id then
        raise exception 'Friend group id is already in use';
      end if;

      select count(*) into v_member_count
      from public.friend_group_members
      where group_id = p_id;

      return jsonb_build_object(
        'success', true,
        'id', p_id,
        'member_count', v_member_count
      );
    end if;
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Group name is required';
  end if;

  perform public.validate_friend_group_members(v_current_user_id, p_member_ids);

  insert into public.friend_groups (id, user_id, name, description, color, icon)
  values (
    coalesce(p_id, gen_random_uuid()),
    v_current_user_id,
    btrim(p_name),
    nullif(btrim(coalesce(p_description, '')), ''),
    coalesce(nullif(btrim(p_color), ''), 'pink'),
    coalesce(nullif(btrim(p_icon), ''), 'users')
  )
  returning id into v_group_id;

  insert into public.friend_group_members (group_id, user_id)
  select v_group_id, member_id
  from (
    select distinct member_id
    from unnest(coalesce(p_member_ids, array[]::uuid[])) as member_id
  ) members;

  select count(*) into v_member_count
  from public.friend_group_members
  where group_id = v_group_id;

  return jsonb_build_object(
    'success', true,
    'id', v_group_id,
    'member_count', v_member_count
  );
end;
$$;

grant all on function public.create_friend_group(text, text, text, text, uuid[], uuid)
  to anon, authenticated, service_role;

drop function if exists public.create_secret_santa_event(
  text,
  timestamp with time zone,
  numeric,
  text,
  jsonb,
  text
);

create or replace function public.create_secret_santa_event(
  p_name text,
  p_event_date timestamp with time zone,
  p_budget numeric,
  p_image_url text,
  p_invited_user_ids jsonb,
  p_currency text,
  p_id uuid default null
)
returns public.secret_santa
language plpgsql
as $$
declare
  v_event public.secret_santa;
  v_user_id_text text;
  v_invited_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if p_id is not null then
    select * into v_event
    from public.secret_santa
    where id = p_id;

    if found then
      if v_event.owner_id is distinct from auth.uid() then
        raise exception 'Secret Santa event id is already in use';
      end if;

      return v_event;
    end if;
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
    id,
    name,
    event_date,
    budget,
    currency,
    image_url,
    owner_id
  )
  values (
    coalesce(p_id, gen_random_uuid()),
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
          responded_at = null;
    -- Invite notifications are created by the client (localized) via create_notification().
  end loop;

  return v_event;
end;
$$;

grant all on function public.create_secret_santa_event(
  text,
  timestamp with time zone,
  numeric,
  text,
  jsonb,
  text,
  uuid
) to anon, authenticated, service_role;
