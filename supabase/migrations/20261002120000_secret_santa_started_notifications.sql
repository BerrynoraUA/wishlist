-- Secret Santa "names drawn" notification (type 9).
--
-- When the organizer launches an event, the client writes a localized notification to every
-- other participant via create_notification(), with entity_id = the event id. Type 9 is gated
-- by the same notify_secret_santa setting as invites (type 0).

create or replace function public.create_notification(
  p_receiver_id uuid,
  p_type smallint,
  p_icon_type smallint,
  p_text text,
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_sender_id uuid := auth.uid();
  v_notify boolean := true;
begin
  if v_sender_id is null then
    raise exception 'Not authenticated';
  end if;

  -- no self-notifications
  if p_receiver_id is null or p_receiver_id = v_sender_id then
    return;
  end if;

  if p_text is null or btrim(p_text) = '' then
    return;
  end if;

  -- per-type recipient opt-out (defaults to true when the row/column is absent)
  select case p_type
    when 0 then coalesce(notify_secret_santa, true)
    when 9 then coalesce(notify_secret_santa, true)
    when 1 then coalesce(notify_reservations, true)
    when 2 then coalesce(notify_friend_requests, true)
    when 3 then coalesce(notify_reservations, true)
    when 4 then coalesce(notify_new_wishlists, true)
    when 6 then coalesce(notify_group_added, true)
    when 7 then coalesce(notify_wishlist_access, true)
    else true
  end
  into v_notify
  from public.user_settings
  where user_id = p_receiver_id;

  if v_notify is not true then
    return;
  end if;

  -- dedupe: at most once per (recipient, entity) for group-added / wishlist-access
  if p_type in (6, 7) and p_entity_id is not null and exists (
    select 1 from public.notifications
    where receiver_id = p_receiver_id and type = p_type and entity_id = p_entity_id
  ) then
    return;
  end if;

  begin
    insert into public.notifications (
      sender_id, receiver_id, text, icon_type, type, entity_id, is_read
    )
    values (
      v_sender_id, p_receiver_id, p_text, p_icon_type, p_type, p_entity_id, false
    );
  exception when others then
    null;
  end;
end;
$$;

grant execute on function public.create_notification(uuid, smallint, smallint, text, uuid)
  to authenticated;
