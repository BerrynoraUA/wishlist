-- Cutover: Secret Santa invite (type 0) moves to the client.
--
-- create_secret_santa_event no longer writes invite notifications. It still creates the event,
-- the owner participant, and the invites. The client then reads the created invites (to get each
-- invite id, used as the notification's entity_id for accept/decline) and writes a localized
-- notification per invitee via create_notification() (which applies the notify_secret_santa gate).

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
          responded_at = null;
    -- Invite notification is now created by the client (localized) via create_notification().
  end loop;

  return v_event;
end;
$$;
