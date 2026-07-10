-- Persist every assignment and the started flag in one transaction.
CREATE OR REPLACE FUNCTION public.launch_secret_santa(
  p_event_id uuid,
  p_assignments jsonb
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
declare
  v_owner_id uuid;
  v_is_started boolean;
  v_participant_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if jsonb_typeof(p_assignments) <> 'array' then
    raise exception 'Assignments must be an array';
  end if;

  select owner_id, is_started
  into v_owner_id, v_is_started
  from public.secret_santa
  where id = p_event_id
  for update;

  if not found then
    raise exception 'Secret Santa event not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'Only the Secret Santa owner can launch the event';
  end if;

  if v_is_started then
    raise exception 'Secret Santa event has already been launched';
  end if;

  perform 1
  from public.secret_santa_participants
  where event_id = p_event_id
  for update;

  select count(*) into v_participant_count
  from public.secret_santa_participants
  where event_id = p_event_id;

  if v_participant_count < 2 then
    raise exception 'At least 2 participants are required to launch.';
  end if;

  if exists (
    with assignments as (
      select *
      from jsonb_to_recordset(p_assignments) as a(user_id uuid, receiver_id uuid)
    )
    select 1
    from assignments
    group by user_id
    having count(*) > 1
    union all
    select 1
    from assignments
    group by receiver_id
    having count(*) > 1
  ) then
    raise exception 'Assignments must be one-to-one.';
  end if;

  if exists (
    with assignments as (
      select *
      from jsonb_to_recordset(p_assignments) as a(user_id uuid, receiver_id uuid)
    ), participants as (
      select user_id
      from public.secret_santa_participants
      where event_id = p_event_id
    )
    select 1
    from participants
    full join assignments on assignments.user_id = participants.user_id
    where participants.user_id is null
      or assignments.user_id is null
      or assignments.receiver_id is null
      or assignments.user_id = assignments.receiver_id
    union all
    select 1
    from assignments
    left join participants on participants.user_id = assignments.receiver_id
    where participants.user_id is null
  ) then
    raise exception 'Assignments must cover each participant exactly once.';
  end if;

  update public.secret_santa_participants participant
  set receiver_id = assignments.receiver_id
  from jsonb_to_recordset(p_assignments) as assignments(user_id uuid, receiver_id uuid)
  where participant.event_id = p_event_id
    and participant.user_id = assignments.user_id;

  update public.secret_santa
  set is_started = true
  where id = p_event_id;
end;
$$;

REVOKE ALL ON FUNCTION public.launch_secret_santa(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.launch_secret_santa(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.launch_secret_santa(uuid, jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
