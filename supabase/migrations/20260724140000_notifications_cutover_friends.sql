-- Cutover: friend notifications (type 2) move to the client.
--   * new request  (icon 1) — drop the AFTER INSERT trigger; the client creates it after
--     inserting the friend_requests row.
--   * accepted     (icon 2) — accept_friend_request now RETURNS the requester's id (whom to
--     notify) and no longer writes the notification.
--   * declined     (icon 3) — reject_friend_request likewise RETURNS the requester's id.
--
-- Return-type changes require DROP + CREATE (CREATE OR REPLACE cannot change the return type).

-- ---------------------------------------------------------------------------
-- New friend request — remove server-side notification (client creates it)
-- ---------------------------------------------------------------------------
drop trigger if exists trigger_friend_request_notification on public.friend_requests;
drop function if exists public.create_friend_request_notification();

-- ---------------------------------------------------------------------------
-- Accept — return the requester's id, drop the notification INSERT
-- ---------------------------------------------------------------------------
drop function if exists public.accept_friend_request(uuid);

create function public.accept_friend_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_sender uuid;
  v_receiver uuid;
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

  delete from public.friend_requests
  where id = p_request_id;

  -- Notification is created by the client (localized) via create_notification().
  return v_sender;
end;
$$;

grant execute on function public.accept_friend_request(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Decline — return the requester's id, drop the notification INSERT
-- ---------------------------------------------------------------------------
drop function if exists public.reject_friend_request(uuid);

create function public.reject_friend_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_sender uuid;
  v_receiver uuid;
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

  delete from public.friend_requests
  where id = p_request_id;

  -- Notification is created by the client (localized) via create_notification().
  return v_sender;
end;
$$;

grant execute on function public.reject_friend_request(uuid) to anon, authenticated, service_role;
