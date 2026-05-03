-- ============================================================
-- Sync prod schema to match staging (one-shot)
-- - Drops item_vote (only in prod)
-- - Adds item_priorities table + seed
-- - Migrates item.priority (smallint) -> item.priority_id (uuid FK)
-- - Adds item.color_index, profiles.height/shoe_size, user_settings.selected_priorities
-- - Updates ss_participants_insert_owner_only policy
-- - Recreates all public functions from staging
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Drop tables/objects that exist only in prod
-- ------------------------------------------------------------
drop table if exists public.item_vote cascade;

-- ------------------------------------------------------------
-- 2. Drop public functions whose signatures changed in staging
-- ------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select oid::regprocedure::text as sig
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = any(array[
        'get_friends_wishlists_discover',
        'get_friends_wishlists_discover_all',
        'get_my_bought_items',
        'get_my_wishlists_feed',
        'get_reserved_items_by_me',
        'get_reserved_wishlists_by_me',
        'get_wishlist_items',
        'get_wishlist_items_by_share_token',
        'get_user_visible_items_by_max_price'
      ])
  loop
    execute 'drop function ' || r.sig || ' cascade';
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3. Create item_priorities + seed
-- ------------------------------------------------------------
create table if not exists public.item_priorities (
    id uuid primary key,
    name text not null,
    color text not null,
    emoji text not null,
    sort_order integer not null,
    is_free boolean not null default false
);
alter table public.item_priorities owner to postgres;
alter table public.item_priorities enable row level security;
grant all on table public.item_priorities to anon, authenticated, service_role;

insert into public.item_priorities (id, name, color, emoji, sort_order, is_free) values
    ('11111111-0000-0000-0000-000000000001', 'Low',       '#22c55e', '🟢', 1,  true),
    ('11111111-0000-0000-0000-000000000002', 'Medium',    '#eab308', '🟡', 2,  true),
    ('11111111-0000-0000-0000-000000000003', 'High',      '#ef4444', '🔴', 3,  true),
    ('11111111-0000-0000-0000-000000000004', 'Urgent',    '#f97316', '🔥', 4,  false),
    ('11111111-0000-0000-0000-000000000005', 'Critical',  '#ec4899', '⚡', 5,  false),
    ('11111111-0000-0000-0000-000000000006', 'Epic',      '#8b5cf6', '💜', 6,  false),
    ('11111111-0000-0000-0000-000000000007', 'Legendary', '#f59e0b', '👑', 7,  false),
    ('11111111-0000-0000-0000-000000000008', 'Mythic',    '#06b6d4', '🌊', 8,  false),
    ('11111111-0000-0000-0000-000000000009', 'Celestial', '#6366f1', '✨', 9,  false),
    ('11111111-0000-0000-0000-000000000010', 'Divine',    '#e879f9', '🌟', 10, false)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 4. profiles: add height, shoe_size
-- ------------------------------------------------------------
alter table public.profiles
    add column if not exists height bigint,
    add column if not exists shoe_size bigint;

-- ------------------------------------------------------------
-- 5. item: priority smallint -> priority_id uuid + color_index + additional_links default
-- ------------------------------------------------------------
alter table public.item add column if not exists priority_id uuid;

update public.item set priority_id = '11111111-0000-0000-0000-000000000001'::uuid where priority = 1 and priority_id is null;
update public.item set priority_id = '11111111-0000-0000-0000-000000000002'::uuid where priority = 2 and priority_id is null;
update public.item set priority_id = '11111111-0000-0000-0000-000000000003'::uuid where priority = 3 and priority_id is null;

alter table public.item drop constraint if exists item_priority_id_fkey;
alter table public.item
    add constraint item_priority_id_fkey
    foreign key (priority_id)
    references public.item_priorities(id)
    on delete set null;

alter table public.item drop column if exists priority;

alter table public.item add column if not exists color_index smallint;

-- additional_links was added on staging with DEFAULT '[]'::jsonb; align prod
alter table public.item alter column additional_links set default '[]'::jsonb;
update public.item set additional_links = '[]'::jsonb where additional_links is null;

-- ------------------------------------------------------------
-- 6. user_settings: add selected_priorities
-- ------------------------------------------------------------
alter table public.user_settings
    add column if not exists selected_priorities uuid[] not null default array[
        '11111111-0000-0000-0000-000000000001'::uuid,
        '11111111-0000-0000-0000-000000000002'::uuid,
        '11111111-0000-0000-0000-000000000003'::uuid
    ];

-- ------------------------------------------------------------
-- 7. Update secret_santa policy (match staging)
-- ------------------------------------------------------------
drop policy if exists "ss_participants_insert_owner_only" on public.secret_santa_participants;
create policy "ss_participants_insert_owner_only"
    on public.secret_santa_participants
    for insert
    with check (auth.uid() is not null);

-- ------------------------------------------------------------
-- 8. Recreate all public functions from staging dump
--    (See appended block below — generated from staging schema)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."accept_friend_request"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    v_sender uuid;
    v_receiver uuid;
    v_receiver_name text;
    v_notify boolean;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT sender_id, receiver_id
    INTO v_sender, v_receiver
    FROM public.friend_requests
    WHERE id = p_request_id
      AND status = 0;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already handled';
    END IF;

    IF v_receiver <> auth.uid() THEN
        RAISE EXCEPTION 'Only receiver can accept request';
    END IF;

    INSERT INTO public.friends (user_f, user_s)
    VALUES (
        LEAST(v_sender, v_receiver),
        GREATEST(v_sender, v_receiver)
    )
    ON CONFLICT (user_f, user_s) DO NOTHING;

    SELECT COALESCE(raw_user_meta_data->>'full_name', email)
    INTO v_receiver_name
    FROM auth.users
    WHERE id = v_receiver;

    SELECT COALESCE(notify_friend_requests, true)
    INTO v_notify
    FROM public.user_settings
    WHERE user_id = v_sender;

    IF v_notify IS TRUE THEN
        INSERT INTO public.notifications (
            sender_id,
            receiver_id,
            text,
            icon_type,
            type,
            entity_id
        )
        VALUES (
            v_receiver,
            v_sender,
            v_receiver_name || ' accepted your friend request',
            2,
            2,
            v_receiver
        );
    END IF;

    DELETE FROM public.friend_requests
    WHERE id = p_request_id;
END;$$;


ALTER FUNCTION "public"."accept_friend_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_secret_santa_invite"("p_invite_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_invite public.secret_santa_invites;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into v_invite
  from public.secret_santa_invites
  where id = p_invite_id
    and receiver_id = auth.uid()
    and status = 0;

  if v_invite is null then
    raise exception 'Invite not found or already handled';
  end if;

  update public.secret_santa_invites
  set
    status = 1,
    responded_at = now()
  where id = p_invite_id;

  insert into public.secret_santa_participants (
    event_id,
    user_id,
    receiver_id
  )
  values (
    v_invite.event_id,
    auth.uid(),
    null
  )
  on conflict do nothing;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."base64url_decode"("data" "text") RETURNS "bytea"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  b64 text;
begin
  b64 := replace(replace(data, '-', '+'), '_', '/');
  b64 := b64 || repeat('=', (4 - length(b64) % 4) % 4);
  return decode(b64, 'base64');
end;
$$;

CREATE OR REPLACE FUNCTION "public"."base64url_encode"("data" "bytea") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select translate(encode(data, 'base64'), E'+/=\n', '-_');
$$;

CREATE OR REPLACE FUNCTION "public"."can_view_wishlist_for_user"("p_wishlist_id" "uuid", "p_wishlist_owner_id" "uuid", "p_visibility_type" integer, "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    p_user_id is not null
    and (
      p_wishlist_owner_id = p_user_id
      or p_visibility_type = 0
      or exists (
        select 1
        from public.wishlist_access wa
        where wa.wishlist_id = p_wishlist_id
          and wa.granted_to_user_id = p_user_id
          and wa.access_type in (0, 1)
      )
      or (
        p_visibility_type = 1
        and public.is_friend_with_user(p_user_id, p_wishlist_owner_id)
      )
      or (
        p_visibility_type = 3
        and (
          exists (
            select 1
            from public.wishlist_access wa
            where wa.wishlist_id = p_wishlist_id
              and wa.granted_to_user_id = p_user_id
              and wa.access_type = 3
          )
          or exists (
            select 1
            from public.wishlist_access wa
            inner join public.friend_group_members fgm on fgm.group_id = wa.group_id
            inner join public.friend_groups fg on fg.id = wa.group_id
            where wa.wishlist_id = p_wishlist_id
              and wa.group_id is not null
              and wa.access_type = 2
              and fg.user_id = p_wishlist_owner_id
              and fgm.user_id = p_user_id
          )
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION "public"."check_upcoming_events"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_wishlist_id uuid;
  v_days_until_event integer;
  v_processed_count integer := 0;
BEGIN
  -- Знайти всі вішлісти з event_date
  FOR v_wishlist_id, v_days_until_event IN
    SELECT 
      w.id,
      (w.event_date - CURRENT_DATE) AS days_until
    FROM public.wishlist w
    WHERE w.event_date IS NOT NULL
      AND w.event_date >= CURRENT_DATE
      AND w.event_date <= CURRENT_DATE + INTERVAL '7 days' -- Тільки найближчі події
      AND w.visibility_type IN (0, 1) -- Публічні та для друзів
  LOOP
    -- За тиждень (7 днів)
    IF v_days_until_event = 7 THEN
      PERFORM notify_friends_about_upcoming_event(v_wishlist_id, 'week_before');
      v_processed_count := v_processed_count + 1;
    END IF;

    -- За 3 дні
    IF v_days_until_event = 3 THEN
      PERFORM notify_friends_about_upcoming_event(v_wishlist_id, 'three_days_before');
      v_processed_count := v_processed_count + 1;
    END IF;

    -- За день
    IF v_days_until_event = 1 THEN
      PERFORM notify_friends_about_upcoming_event(v_wishlist_id, 'day_before');
      v_processed_count := v_processed_count + 1;
    END IF;

    -- В день події
    IF v_days_until_event = 0 THEN
      PERFORM notify_friends_about_upcoming_event(v_wishlist_id, 'today');
      v_processed_count := v_processed_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Processed % event notifications', v_processed_count;

END;
$$;

CREATE OR REPLACE FUNCTION "public"."create_friend_group"("p_name" "text", "p_description" "text" DEFAULT NULL::"text", "p_color" "text" DEFAULT 'pink'::"text", "p_icon" "text" DEFAULT 'users'::"text", "p_member_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_current_user_id uuid;
  v_group_id uuid;
  v_member_count integer;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Group name is required';
  end if;

  perform public.validate_friend_group_members(v_current_user_id, p_member_ids);

  insert into public.friend_groups (user_id, name, description, color, icon)
  values (
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

CREATE OR REPLACE FUNCTION "public"."create_friend_request_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  v_sender_name text;
  v_notify boolean;
BEGIN
  SELECT COALESCE(raw_user_meta_data->>'full_name', email)
  INTO v_sender_name
  FROM auth.users
  WHERE id = NEW.sender_id;

  SELECT notify_friend_requests
  INTO v_notify
  FROM public.user_settings
  WHERE user_id = NEW.receiver_id;

  IF v_notify IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    sender_id,
    receiver_id,
    text,
    icon_type,
    type,
    entity_id
  )
  VALUES (
    NEW.sender_id,
    NEW.receiver_id,
    v_sender_name || ' sent you a friend request',
    1,
    2,
    NEW.sender_id
  );

  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."create_friend_request_notification"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."secret_santa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "event_date" "date" NOT NULL,
    "budget" integer NOT NULL,
    "image_url" "text",
    "owner_id" "uuid" NOT NULL,
    "is_started" boolean DEFAULT false NOT NULL,
    "currency" "text"
);

ALTER TABLE ONLY "public"."secret_santa" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."secret_santa" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_secret_santa_event"("p_name" "text", "p_event_date" "date", "p_budget" integer, "p_image_url" "text" DEFAULT NULL::"text", "p_invited_user_ids" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "public"."secret_santa"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_event public.secret_santa;
  v_user_id_text text;
  v_invited_user_id uuid;
  v_invite_id uuid;
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
    image_url,
    owner_id
  )
  values (
    p_name,
    p_event_date,
    p_budget,
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
  end loop;

  return v_event;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."create_secret_santa_event"("p_name" "text", "p_event_date" timestamp with time zone, "p_budget" numeric, "p_image_url" "text", "p_invited_user_ids" "jsonb", "p_currency" "text") RETURNS "public"."secret_santa"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_event public.secret_santa;
  v_user_id_text text;
  v_invited_user_id uuid;
  v_invite_id uuid;
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
  end loop;

  return v_event;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."create_wishlist_share_token"("p_wishlist_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_secret text;
  v_iv bytea;
  v_payload jsonb;
  v_plain bytea;
  v_cipher bytea;
  v_token bytea;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- OPTIONAL ownership check (uncomment if needed)
  -- if not exists (
  --   select 1 from public.wishlist w
  --   where w.id = p_wishlist_id and w.user_id = auth.uid()
  -- ) then
  --   raise exception 'Forbidden';
  -- end if;

  v_secret := public.get_wishlist_token_secret();

  v_iv := gen_random_bytes(16);

  v_payload := jsonb_build_object(
    'wid', p_wishlist_id::text,
    'exp', (now() + interval '3 days')
  );

  v_plain := convert_to(v_payload::text, 'utf8');

  -- AES encryption with IV (pgcrypto)
  v_cipher := encrypt_iv(v_plain, convert_to(v_secret, 'utf8'), v_iv, 'aes');

  -- token bytes = iv + cipher
  v_token := v_iv || v_cipher;

  return public.base64url_encode(v_token);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."decline_secret_santa_invite"("p_invite_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_invite public.secret_santa_invites;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into v_invite
  from public.secret_santa_invites
  where id = p_invite_id
    and receiver_id = auth.uid()
    and status = 0;

  if v_invite is null then
    raise exception 'Invite not found or already handled';
  end if;

  update public.secret_santa_invites
  set
    status = 2,
    responded_at = now()
  where id = p_invite_id;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."delete_friend_group"("p_group_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_current_user_id uuid;
  v_deleted_count integer;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.friend_groups fg
  where fg.id = p_group_id
    and fg.user_id = v_current_user_id;

  get diagnostics v_deleted_count = row_count;

  return jsonb_build_object(
    'success', true,
    'id', p_group_id,
    'deleted', (v_deleted_count > 0)
  );
end;
$$;

CREATE OR REPLACE FUNCTION "public"."delete_secret_santa_event"("p_event_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if not exists (
    select 1
    from public.secret_santa ss
    where ss.id = p_event_id
      and ss.owner_id = auth.uid()
  ) then
    raise exception 'Secret Santa event not found or access denied';
  end if;

  delete from public.secret_santa_participants
  where event_id = p_event_id;

  delete from public.secret_santa
  where id = p_event_id
    and owner_id = auth.uid();
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_friend_group_members"("p_group_id" "uuid") RETURNS TABLE("id" "uuid", "nickname" "text", "display_name" "text", "avatar_url" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.id, p.nickname, p.display_name, p.avatar_url
  from public.friend_group_members fgm
  inner join public.friend_groups fg on fg.id = fgm.group_id
  inner join public.profiles p on p.id = fgm.user_id
  where fgm.group_id = p_group_id
    and fg.user_id = auth.uid()
  order by coalesce(p.nickname, p.display_name, '') asc;
$$;

CREATE OR REPLACE FUNCTION "public"."get_friend_groups"("p_search" "text" DEFAULT NULL::"text", "p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "color" "text", "icon" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "member_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    fg.id,
    fg.name,
    fg.description,
    fg.color,
    fg.icon,
    fg.created_at,
    fg.updated_at,
    count(fgm.user_id)::bigint as member_count
  from public.friend_groups fg
  left join public.friend_group_members fgm on fgm.group_id = fg.id
  where fg.user_id = auth.uid()
    and (
      p_search is null
      or btrim(p_search) = ''
      or fg.name ilike '%' || btrim(p_search) || '%'
    )
  group by fg.id
  order by fg.updated_at desc, fg.created_at desc
  offset greatest(p_skip, 0)
  limit case when p_take is null or p_take <= 0 then 20 else p_take end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_friend_groups_without_wishlist_access"("p_wishlist_id" "uuid", "p_search" "text" DEFAULT NULL::"text", "p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "color" "text", "icon" "text", "member_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    fg.id,
    fg.name,
    fg.description,
    fg.color,
    fg.icon,
    count(fgm.user_id)::bigint as member_count
  from public.friend_groups fg
  join public.wishlist w on w.id = p_wishlist_id
  left join public.friend_group_members fgm on fgm.group_id = fg.id
  where fg.user_id = auth.uid()
    and w.user_id = auth.uid()
    and not exists (
      select 1
      from public.wishlist_access wa
      where wa.wishlist_id = p_wishlist_id
        and wa.group_id = fg.id
    )
    and (
      p_search is null
      or btrim(p_search) = ''
      or fg.name ilike '%' || btrim(p_search) || '%'
    )
  group by fg.id
  order by fg.name asc
  offset greatest(p_skip, 0)
  limit case when p_take is null or p_take <= 0 then 20 else p_take end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_friend_wishlists"("p_friend_user_id" "uuid", "p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 10, "p_search" "text" DEFAULT NULL::"text", "p_sort" "text" DEFAULT 'newest'::"text") RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" "text", "description" "text", "image_url" "text", "created_at" timestamp with time zone, "visibility_type" integer, "accent_type" integer, "event_date" "date", "items_count" bigint, "can_edit" boolean, "is_owner" boolean, "access_type" integer, "owner_nickname" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
      (direct_access.access_type = 1) as can_edit,
      false as is_owner,
      coalesce(direct_access.access_type, group_access.access_type) as access_type,
      p.nickname as owner_nickname
    from public.wishlist w
    left join lateral (
      select wa.access_type
      from public.wishlist_access wa
      where wa.wishlist_id = w.id
        and wa.granted_to_user_id = auth.uid()
      order by wa.created_at desc
      limit 1
    ) direct_access on true
    left join lateral (
      select 2 as access_type
      from public.wishlist_access wa
      inner join public.friend_group_members fgm on fgm.group_id = wa.group_id
      inner join public.friend_groups fg on fg.id = wa.group_id
      where wa.wishlist_id = w.id
        and wa.access_type = 2
        and fg.user_id = w.user_id
        and fgm.user_id = auth.uid()
      limit 1
    ) group_access on true
    left join public.profiles p on p.id = w.user_id
    where w.user_id = p_friend_user_id
      and exists (
        select 1
        from public.friends f
        where (f.user_f = auth.uid() and f.user_s = p_friend_user_id)
           or (f.user_s = auth.uid() and f.user_f = p_friend_user_id)
      )
      and public.can_view_wishlist_for_user(w.id, w.user_id, w.visibility_type, auth.uid())
      and (p_search is null or p_search = '' or w.title ilike '%' || p_search || '%')
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
  select e.id, e.user_id, e.title, e.description, e.image_url, e.created_at, e.visibility_type, e.accent_type, e.event_date, e.items_count, e.can_edit, e.is_owner, e.access_type, e.owner_nickname
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

CREATE OR REPLACE FUNCTION "public"."get_friends"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 10, "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "user_f" "uuid", "user_s" "uuid", "created_at" timestamp with time zone, "friend_id" "uuid", "display_name" "text", "nickname" "text", "avatar_url" "text", "wishlists_count" bigint, "mutual_friends_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- якщо p_user_id не передали, беремо з JWT
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH my_all_friends AS (
    SELECT
      CASE
        WHEN f.user_f = v_user_id THEN f.user_s
        ELSE f.user_f
      END AS friend_id
    FROM public.friends f
    WHERE f.user_f = v_user_id OR f.user_s = v_user_id
  ),
  filtered_friends AS (
    SELECT
      f.id,
      f.user_f,
      f.user_s,
      f.created_at,
      CASE
        WHEN f.user_f = v_user_id THEN f.user_s
        ELSE f.user_f
      END AS friend_id
    FROM public.friends f
    JOIN public.profiles p
      ON p.id = CASE WHEN f.user_f = v_user_id THEN f.user_s ELSE f.user_f END
    WHERE (f.user_f = v_user_id OR f.user_s = v_user_id)
      AND (
        p_search IS NULL
        OR btrim(p_search) = ''
        OR p.nickname ILIKE '%' || btrim(p_search) || '%'
      )
    ORDER BY f.created_at DESC
    OFFSET p_skip
    LIMIT p_take
  ),
  friend_wishlists AS (
    SELECT
      w.user_id,
      COUNT(*)::bigint AS wishlists_count
    FROM public.wishlist w
    WHERE w.user_id IN (SELECT ff.friend_id FROM filtered_friends ff)
    GROUP BY w.user_id
  ),
  mutual_friends AS (
    SELECT
      ff.friend_id,
      COUNT(DISTINCT
        CASE
          WHEN f2.user_f = ff.friend_id THEN f2.user_s
          WHEN f2.user_s = ff.friend_id THEN f2.user_f
        END
      ) FILTER (
        WHERE
          (
            f2.user_f = ff.friend_id
            AND f2.user_s IN (SELECT maf.friend_id FROM my_all_friends maf)
          )
          OR
          (
            f2.user_s = ff.friend_id
            AND f2.user_f IN (SELECT maf.friend_id FROM my_all_friends maf)
          )
      )::bigint AS mutual_count
    FROM filtered_friends ff
    LEFT JOIN public.friends f2
      ON f2.user_f = ff.friend_id OR f2.user_s = ff.friend_id
    GROUP BY ff.friend_id
  )
  SELECT
    ff.id,
    ff.user_f,
    ff.user_s,
    ff.created_at,
    ff.friend_id,
    COALESCE(p.display_name, 'Unknown') AS display_name,
    COALESCE(p.nickname, '') AS nickname,
    COALESCE(p.avatar_url, '') AS avatar_url,
    COALESCE(fw.wishlists_count, 0)::bigint AS wishlists_count,
    COALESCE(mf.mutual_count, 0)::bigint AS mutual_friends_count
  FROM filtered_friends ff
  LEFT JOIN public.profiles p ON p.id = ff.friend_id
  LEFT JOIN friend_wishlists fw ON fw.user_id = ff.friend_id
  LEFT JOIN mutual_friends mf ON mf.friend_id = ff.friend_id
  ORDER BY ff.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_friends_upcoming_wishlists"("p_user_id" "uuid") RETURNS TABLE("friend_name" "text", "wishlist_title" "text", "event_date" "date", "wishlist_id" "uuid", "friend_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS friend_name,
    w.title AS wishlist_title,
    w.event_date,
    w.id AS wishlist_id,
    w.user_id AS friend_id
  FROM public.wishlist w
  INNER JOIN auth.users u ON w.user_id = u.id
  INNER JOIN public.friends f ON (
    (f.user_f = p_user_id AND f.user_s = w.user_id)
    OR
    (f.user_s = p_user_id AND f.user_f = w.user_id)
  )
  WHERE w.event_date IS NOT NULL
    AND w.event_date >= CURRENT_DATE
    AND (
      w.visibility_type = 0  -- Public
      OR w.visibility_type = 1  -- FriendsOnly
    )
  ORDER BY w.event_date ASC;
END;$$;


ALTER FUNCTION "public"."get_friends_upcoming_wishlists"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_friends_wishlists_discover"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20, "p_search" "text" DEFAULT NULL::"text", "p_sort" "text" DEFAULT 'default'::"text", "p_priorities" "uuid"[] DEFAULT NULL::"uuid"[], "p_price_min" numeric DEFAULT NULL::numeric, "p_price_max" numeric DEFAULT NULL::numeric, "p_display_currency" "text" DEFAULT 'USD'::"text") RETURNS TABLE("id" "uuid", "owner" "text", "username" "text", "avatar_url" "text", "wishlist" "text", "wishlist_id" "uuid", "friend_id" "uuid", "items" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
          'priority', ip.name,
          'color_index', i.color_index
        )
        order by i.created_at desc
      ) filter (where i.id is not null) as items
    from public.item i
    left join public.item_priorities ip on ip.id = i.priority_id
    left join public.exchange_rates er_item
      on er_item.base_currency = 'USD'
     and er_item.target_currency = upper(coalesce(i.currency, 'USD'))
    where i.status = 0
      and (p_priorities is null or i.priority_id = any(p_priorities))
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
$_$;

CREATE OR REPLACE FUNCTION "public"."get_friends_wishlists_discover_all"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20, "p_search" "text" DEFAULT NULL::"text", "p_sort" "text" DEFAULT 'default'::"text", "p_priorities" "uuid"[] DEFAULT NULL::"uuid"[], "p_price_min" numeric DEFAULT NULL::numeric, "p_price_max" numeric DEFAULT NULL::numeric, "p_display_currency" "text" DEFAULT 'USD'::"text") RETURNS TABLE("id" "uuid", "owner" "text", "username" "text", "avatar_url" "text", "wishlist" "text", "wishlist_id" "uuid", "friend_id" "uuid", "items" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
          'priority', ip.name,
          'status', i.status,
          'color_index', i.color_index
        )
        order by i.created_at desc
      ) filter (where i.id is not null) as items
    from public.item i
    left join public.item_priorities ip on ip.id = i.priority_id
    left join public.exchange_rates er_item
      on er_item.base_currency = 'USD'
     and er_item.target_currency = upper(coalesce(i.currency, 'USD'))
    where (p_priorities is null or i.priority_id = any(p_priorities))
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
$_$;

CREATE OR REPLACE FUNCTION "public"."get_friends_with_details"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20, "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "owner" "text", "username" "text", "avatar_url" "text", "wishlist" "text", "wishlist_id" "uuid", "items" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_current_user_id uuid;
  v_search text;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_search := NULLIF(btrim(p_search), '');

  RETURN QUERY
  WITH user_friends AS (
    SELECT
      CASE
        WHEN f.user_f = v_current_user_id THEN f.user_s
        ELSE f.user_f
      END AS friend_id
    FROM public.friends f
    WHERE f.user_f = v_current_user_id
       OR f.user_s = v_current_user_id
  ),
  wishlist_items AS (
    SELECT
      i.wishlist_id,
      jsonb_agg(
        jsonb_build_object(
          'id', i.id::text,
          'title', i.name,
          'price',
            CASE
              WHEN i.price IS NOT NULL
               AND i.price ~ '^[0-9]+\.?[0-9]*$'
              THEN i.price::numeric
              ELSE 0
            END,
          'discount_price',
            CASE
              WHEN i.discount_price IS NOT NULL
               AND i.discount_price ~ '^[0-9]+\.?[0-9]*$'
              THEN i.discount_price::numeric
              ELSE 0
            END,
          'url', COALESCE(i.url, ''),
          'store',
            CASE
              WHEN i.url IS NOT NULL AND i.url != '' THEN
                COALESCE(
                  NULLIF(
                    regexp_replace(
                      regexp_replace(i.url, '^https?://(www\.)?', '', 'i'),
                      '/.*$', ''
                    ),
                    ''
                  ),
                  'Store'
                )
              ELSE 'Store'
            END,
          'image', COALESCE(i.image_url, ''),
          'priority',
            CASE i.priority
              WHEN 1 THEN 'Low'
              WHEN 2 THEN 'Medium'
              WHEN 3 THEN 'High'
              ELSE NULL
            END
        )
        ORDER BY i.created_at DESC
      ) FILTER (WHERE i.id IS NOT NULL) AS items
    FROM public.item i
    WHERE i.status = 0
    GROUP BY i.wishlist_id
  )
  SELECT
    w.id,
    COALESCE(p.display_name, p.nickname, 'Unknown User') AS owner,
    COALESCE(p.nickname, '') AS username,
    COALESCE(p.avatar_url, '') AS avatar_url,
    w.title AS wishlist,
    w.id AS wishlist_id,
    COALESCE(wi.items, '[]'::jsonb) AS items
  FROM public.wishlist w
  INNER JOIN user_friends uf ON uf.friend_id = w.user_id
  INNER JOIN public.profiles p ON p.id = w.user_id
  LEFT JOIN wishlist_items wi ON wi.wishlist_id = w.id
  WHERE w.visibility_type IN (0, 1)
    AND EXISTS (
      SELECT 1
      FROM public.item i
      WHERE i.wishlist_id = w.id
        AND i.status = 0
    )
    AND (
      v_search IS NULL
      OR w.title ILIKE '%' || v_search || '%'
    )
  ORDER BY w.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."get_friends_without_wishlist_access"("p_wishlist_id" "uuid", "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "nickname" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  v_current_user_id uuid;
  v_wishlist_owner_id uuid;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select w.user_id
  into v_wishlist_owner_id
  from public.wishlist w
  where w.id = p_wishlist_id;

  if v_wishlist_owner_id is null then
    raise exception 'Wishlist not found';
  end if;

  if v_wishlist_owner_id <> v_current_user_id then
    raise exception 'Only wishlist owner can view available friends for sharing';
  end if;

  return query
  with friend_ids as (
    select
      case
        when f.user_f = v_current_user_id then f.user_s
        else f.user_f
      end as friend_id
    from public.friends f
    where f.user_f = v_current_user_id
       or f.user_s = v_current_user_id
  )
  select
    p.id,
    p.nickname
  from friend_ids fi
  join public.profiles p on p.id = fi.friend_id
  where not exists (
    select 1
    from public.wishlist_access wa
    where wa.wishlist_id = p_wishlist_id
      and wa.granted_to_user_id = fi.friend_id
  )
    and (
      p_search is null
      or p_search = ''
      or p.nickname ilike '%' || p_search || '%'
    )
  order by p.nickname asc;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_friends_without_wishlist_access"("p_wishlist_id" "uuid", "p_search" "text" DEFAULT NULL::"text", "p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "nickname" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  v_current_user_id uuid;
  v_wishlist_owner_id uuid;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select w.user_id
  into v_wishlist_owner_id
  from public.wishlist w
  where w.id = p_wishlist_id;

  if v_wishlist_owner_id is null then
    raise exception 'Wishlist not found';
  end if;

  if v_wishlist_owner_id <> v_current_user_id then
    raise exception 'Only wishlist owner can view available friends for sharing';
  end if;

  return query
  with friend_ids as (
    select distinct
      case
        when f.user_f = v_current_user_id then f.user_s
        else f.user_f
      end as friend_id
    from public.friends f
    where f.user_f = v_current_user_id
       or f.user_s = v_current_user_id
  )
  select
    p.id,
    p.nickname
  from friend_ids fi
  join public.profiles p on p.id = fi.friend_id
  where not exists (
    select 1
    from public.wishlist_access wa
    where wa.wishlist_id = p_wishlist_id
      and wa.granted_to_user_id = fi.friend_id
  )
    and (
      p_search is null
      or btrim(p_search) = ''
      or p.nickname ilike '%' || btrim(p_search) || '%'
    )
  order by p.nickname asc
  offset greatest(p_skip, 0)
  limit case
    when p_take is null or p_take <= 0 then 20
    else p_take
  end;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_incoming_friend_requests_with_details"("p_user_id" "uuid", "p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "sender_id" "uuid", "receiver_id" "uuid", "status" smallint, "created_at" timestamp with time zone, "display_name" "text", "nickname" "text", "avatar_url" "text", "mutual_friends_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH incoming_requests AS (
    SELECT 
      fr.id,
      fr.sender_id,
      fr.receiver_id,
      fr.status,
      fr.created_at
    FROM friend_requests fr
    WHERE fr.receiver_id = p_user_id
      AND fr.status = 0
    ORDER BY fr.created_at DESC
    OFFSET p_skip
    LIMIT p_take
  ),
  my_all_friends AS (
    SELECT CASE 
      WHEN f.user_f = p_user_id THEN f.user_s 
      ELSE f.user_f 
    END AS friend_id
    FROM friends f
    WHERE f.user_f = p_user_id OR f.user_s = p_user_id
  ),
  mutual_friends AS (
    SELECT 
      ir.sender_id,
      COUNT(DISTINCT CASE 
        WHEN f2.user_f = ir.sender_id THEN f2.user_s
        WHEN f2.user_s = ir.sender_id THEN f2.user_f
      END) FILTER (
        WHERE (
          (f2.user_f = ir.sender_id AND f2.user_s IN (SELECT maf.friend_id FROM my_all_friends maf))
          OR
          (f2.user_s = ir.sender_id AND f2.user_f IN (SELECT maf.friend_id FROM my_all_friends maf))
        )
      ) AS mutual_count
    FROM incoming_requests ir
    LEFT JOIN friends f2 ON (f2.user_f = ir.sender_id OR f2.user_s = ir.sender_id)
    GROUP BY ir.sender_id
  )
  SELECT 
    ir.id,
    ir.sender_id,
    ir.receiver_id,
    ir.status,
    ir.created_at,
    COALESCE(p.display_name, 'Unknown') AS display_name,
    p.nickname,
    p.avatar_url,
    COALESCE(muf.mutual_count, 0) AS mutual_friends_count
  FROM incoming_requests ir
  LEFT JOIN profiles p ON p.id = ir.sender_id
  LEFT JOIN mutual_friends muf ON muf.sender_id = ir.sender_id
  ORDER BY ir.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_my_bought_items"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20, "p_search" "text" DEFAULT NULL::"text", "p_sort" "text" DEFAULT 'default'::"text", "p_priorities" "uuid"[] DEFAULT NULL::"uuid"[], "p_price_min" numeric DEFAULT NULL::numeric, "p_price_max" numeric DEFAULT NULL::numeric, "p_display_currency" "text" DEFAULT 'USD'::"text") RETURNS TABLE("item_id" "uuid", "title" "text", "price" numeric, "discount_price" numeric, "url" "text", "store" "text", "image" "text", "priority_name" "text", "color_index" smallint, "status" integer, "wishlist_id" "uuid", "wishlist_title" "text", "owner_id" "uuid", "owner_name" "text", "owner_username" "text", "owner_avatar" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
    ip.name as priority_name,
    i.color_index,
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

CREATE OR REPLACE FUNCTION "public"."get_my_wishlists"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" "text", "description" "text", "image_url" "text", "created_at" timestamp with time zone, "visibility_type" integer, "accent_type" integer, "items_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    w.id,
    w.user_id,
    w.title,
    w.description,
    w.image_url,
    w.created_at,
    w.visibility_type,
    w.accent_type,
    COUNT(i.id) as items_count
  FROM wishlist w
  LEFT JOIN item i ON i.wishlist_id = w.id
  WHERE w.user_id = auth.uid()
  GROUP BY w.id
  ORDER BY w.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
$$;

CREATE OR REPLACE FUNCTION "public"."get_my_wishlists_feed"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 10, "p_search" "text" DEFAULT NULL::"text", "p_sort" "text" DEFAULT 'newest'::"text", "p_visibility_types" integer[] DEFAULT NULL::integer[]) RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" "text", "description" "text", "image_url" "text", "created_at" timestamp with time zone, "visibility_type" integer, "accent_type" integer, "event_date" "date", "items_count" bigint, "can_edit" boolean, "is_owner" boolean, "access_type" integer, "owner_nickname" "text", "is_pinned" boolean)
    LANGUAGE "sql" STABLE
    AS $$
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
      w.is_pinned,
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
      is_pinned desc,
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
    pw.owner_nickname,
    pw.is_pinned
  from paginated pw;
$$;

CREATE OR REPLACE FUNCTION "public"."get_outgoing_friend_requests_with_details"("p_user_id" "uuid", "p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "sender_id" "uuid", "receiver_id" "uuid", "status" smallint, "created_at" timestamp with time zone, "display_name" "text", "nickname" "text", "avatar_url" "text", "mutual_friends_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH outgoing_requests AS (
    SELECT 
      fr.id,
      fr.sender_id,
      fr.receiver_id,
      fr.status,
      fr.created_at
    FROM friend_requests fr
    WHERE fr.sender_id = p_user_id
      AND fr.status = 0
    ORDER BY fr.created_at DESC
    OFFSET p_skip
    LIMIT p_take
  ),
  my_all_friends AS (
    SELECT CASE 
      WHEN f.user_f = p_user_id THEN f.user_s 
      ELSE f.user_f 
    END AS friend_id
    FROM friends f
    WHERE f.user_f = p_user_id OR f.user_s = p_user_id
  ),
  mutual_friends AS (
    SELECT 
      orq.receiver_id,
      COUNT(DISTINCT CASE 
        WHEN f2.user_f = orq.receiver_id THEN f2.user_s
        WHEN f2.user_s = orq.receiver_id THEN f2.user_f
      END) FILTER (
        WHERE (
          (f2.user_f = orq.receiver_id AND f2.user_s IN (SELECT maf.friend_id FROM my_all_friends maf))
          OR
          (f2.user_s = orq.receiver_id AND f2.user_f IN (SELECT maf.friend_id FROM my_all_friends maf))
        )
      ) AS mutual_count
    FROM outgoing_requests orq
    LEFT JOIN friends f2 ON (f2.user_f = orq.receiver_id OR f2.user_s = orq.receiver_id)
    GROUP BY orq.receiver_id
  )
  SELECT 
    orq.id,
    orq.sender_id,
    orq.receiver_id,
    orq.status,
    orq.created_at,
    COALESCE(p.display_name, 'Unknown') AS display_name,
    p.nickname,
    p.avatar_url,
    COALESCE(muf.mutual_count, 0) AS mutual_friends_count
  FROM outgoing_requests orq
  LEFT JOIN profiles p ON p.id = orq.receiver_id
  LEFT JOIN mutual_friends muf ON muf.receiver_id = orq.receiver_id
  ORDER BY orq.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_reserved_items_by_me"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 10, "p_search" "text" DEFAULT NULL::"text", "p_sort" "text" DEFAULT 'default'::"text", "p_priorities" "uuid"[] DEFAULT NULL::"uuid"[], "p_price_min" numeric DEFAULT NULL::numeric, "p_price_max" numeric DEFAULT NULL::numeric, "p_display_currency" "text" DEFAULT 'USD'::"text") RETURNS TABLE("item_id" "uuid", "title" "text", "price" numeric, "discount_price" numeric, "currency" "text", "url" "text", "store" "text", "image" "text", "priority_name" "text", "color_index" smallint, "status" integer, "wishlist_id" "uuid", "wishlist_title" "text", "owner_id" "uuid", "owner_name" "text", "owner_username" "text", "owner_avatar" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
  where i.status = 1
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

CREATE OR REPLACE FUNCTION "public"."get_reserved_wishlists_by_me"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "owner" "text", "username" "text", "avatar_url" "text", "wishlist" "text", "wishlist_id" "uuid", "items" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
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
          'priority', ip.name,
          'status', i.status,
          'isReserved', true,
          'reservedBy', i.reserved_by,
          'isReservedByMe', true,
          'color_index', i.color_index,
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
    left join public.item_priorities ip on ip.id = i.priority_id
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
$_$;

CREATE OR REPLACE FUNCTION "public"."get_secret_santa_details"("p_event_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select jsonb_build_object(
    'id', ss.id,
    'name', ss.name,
    'event_date', ss.event_date,
    'budget', ss.budget,
    'currency', ss.currency,
    'image_url', ss.image_url,
    'owner_id', ss.owner_id,
    'is_started', ss.is_started,
    'participants',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'nickname', p.nickname,
            'display_name', p.display_name,
            'avatar_url', p.avatar_url
          )
          order by p.display_name, p.nickname
        )
        from public.secret_santa_participants ssp
        join public.profiles p on p.id = ssp.user_id
        where ssp.event_id = ss.id
      ),
      '[]'::jsonb
    ),

    'pending_invites',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'invite_id', ssi.id,
            'id', p.id,
            'nickname', p.nickname,
            'display_name', p.display_name,
            'avatar_url', p.avatar_url
          )
          order by p.display_name, p.nickname
        )
        from public.secret_santa_invites ssi
        join public.profiles p on p.id = ssi.receiver_id
        where ssi.event_id = ss.id
          and ssi.status = 0
      ),
      '[]'::jsonb
    ),

    'my_receiver',
    (
      select jsonb_build_object(
        'id', p.id,
        'nickname', p.nickname,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      )
      from public.secret_santa_participants ssp
      join public.profiles p on p.id = ssp.receiver_id
      where ssp.event_id = ss.id
        and ssp.user_id = auth.uid()
        and ssp.receiver_id is not null
      limit 1
    )
  )
  into v_result
  from public.secret_santa ss
  where ss.id = p_event_id;

  if v_result is null then
    raise exception 'Secret Santa event not found';
  end if;

  return v_result;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_unread_notifications_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COUNT(*)::integer
  FROM public.notifications
  WHERE receiver_id = p_user_id
    AND is_read = false;
$$;

CREATE OR REPLACE FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0, "p_unread_only" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "sender_id" "uuid", "receiver_id" "uuid", "sender_name" "text", "sender_nickname" "text", "sender_avatar_url" "text", "text" "text", "icon_type" smallint, "type" smallint, "entity_id" "uuid", "is_read" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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

CREATE OR REPLACE FUNCTION "public"."get_user_statistics"() RETURNS TABLE("wishlists_count" bigint, "total_items_count" bigint, "reserved_items_count" bigint, "purchased_items_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Отримати ID поточного користувача
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH user_wishlists AS (
    SELECT id
    FROM wishlist
    WHERE user_id = v_user_id
  ),
  user_items AS (
    SELECT i.status
    FROM item i
    WHERE i.wishlist_id IN (SELECT id FROM user_wishlists)
  )
  SELECT 
    (SELECT COUNT(*) FROM user_wishlists)::bigint AS wishlists_count,
    (SELECT COUNT(*) FROM user_items)::bigint AS total_items_count,
    (SELECT COUNT(*) FROM user_items WHERE status = 1)::bigint AS reserved_items_count,
    (SELECT COUNT(*) FROM user_items WHERE status = 2)::bigint AS purchased_items_count;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_user_stats"() RETURNS TABLE("wishlists_count" bigint, "total_items_count" bigint, "reserved_items_count" bigint, "purchased_items_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH user_wishlists AS (
    SELECT w.id
    FROM public.wishlist w
    WHERE w.user_id = v_user_id
  ),
  own_items AS (
    SELECT i.*
    FROM public.item i
    WHERE i.wishlist_id IN (SELECT id FROM user_wishlists)
  ),
  acted_items AS (
    SELECT i.*
    FROM public.item i
    WHERE i.reserved_by = v_user_id
  )
  SELECT
    (SELECT COUNT(*) FROM user_wishlists)::bigint AS wishlists_count,
    (SELECT COUNT(*) FROM own_items)::bigint AS total_items_count,
    (SELECT COUNT(*) FROM acted_items WHERE status = 1)::bigint AS reserved_items_count,
    (SELECT COUNT(*) FROM acted_items WHERE status = 2)::bigint AS purchased_items_count;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_user_visible_items_by_max_price"("p_user_id" "uuid", "p_max_price" numeric, "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
declare
  v_result jsonb;
begin
  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  if p_max_price is null then
    raise exception 'Max price is required';
  end if;

  if p_limit is null or p_limit <= 0 then
    raise exception 'Limit must be greater than 0';
  end if;

  if p_offset is null or p_offset < 0 then
    raise exception 'Offset must be greater than or equal to 0';
  end if;

  with filtered_items as (
    select
      i.id,
      i.wishlist_id,
      i.name,
      i.description,
      i.price,
      i.discount_price,
      i.has_discount,
      i.discount_end_date,
      i.currency,
      i.priority_id,
      ip.name as priority_name,
      i.color_index,
      i.url,
      i.image_url,
      i.status,
      i.reserved_by,
      i.created_at,
      w.title as wishlist_title,
      w.image_url as wishlist_image_url,
      w.user_id,
      w.visibility_type,
      case
        when i.has_discount = true
          and i.discount_price is not null
          and btrim(i.discount_price) <> ''
          and i.discount_price ~ '^\d+(\.\d+)?$'
        then i.discount_price::numeric
        when i.price is not null
          and btrim(i.price) <> ''
          and i.price ~ '^\d+(\.\d+)?$'
        then i.price::numeric
        else null
      end as effective_price
    from public.item i
    join public.wishlist w on w.id = i.wishlist_id
    left join public.item_priorities ip on ip.id = i.priority_id
    where w.user_id = p_user_id
      and w.visibility_type in (0, 1)
  ),
  matched_items as (
    select *
    from filtered_items
    where effective_price is not null
      and effective_price <= p_max_price
  ),
  total_count as (
    select count(*) as total
    from matched_items
  ),
  paginated as (
    select *
    from matched_items
    order by created_at desc, id desc
    limit p_limit
    offset p_offset
  )
  select jsonb_build_object(
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'wishlist_id', p.wishlist_id,
            'wishlist_title', p.wishlist_title,
            'wishlist_image_url', p.wishlist_image_url,
            'name', p.name,
            'description', p.description,
            'price', p.price,
            'discount_price', p.discount_price,
            'has_discount', p.has_discount,
            'effective_price', p.effective_price,
            'discount_end_date', p.discount_end_date,
            'currency', p.currency,
            'priority_id', p.priority_id,
            'priority_name', p.priority_name,
            'color_index', p.color_index,
            'url', p.url,
            'image_url', p.image_url,
            'status', p.status,
            'reserved_by', p.reserved_by,
            'created_at', p.created_at
          )
          order by p.created_at desc, p.id desc
        )
        from paginated p
      ),
      '[]'::jsonb
    ),
    'total',
    (select total from total_count),
    'limit',
    p_limit,
    'offset',
    p_offset
  )
  into v_result;

  return v_result;
end;
$_$;

CREATE OR REPLACE FUNCTION "public"."get_wishlist_access_list"("p_wishlist_id" "uuid") RETURNS TABLE("target_id" "uuid", "granted_to_user_id" "uuid", "group_id" "uuid", "nickname" "text", "name" "text", "description" "text", "color" "text", "icon" "text", "member_count" bigint, "access_type" integer, "target_type" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    coalesce(wa.granted_to_user_id, wa.group_id) as target_id,
    wa.granted_to_user_id,
    wa.group_id,
    p.nickname,
    fg.name,
    fg.description,
    fg.color,
    fg.icon,
    coalesce(group_counts.member_count, 0)::bigint as member_count,
    wa.access_type,
    case when wa.group_id is not null then 'group' else 'user' end as target_type,
    wa.created_at
  from public.wishlist_access wa
  join public.wishlist w on w.id = wa.wishlist_id
  left join public.profiles p on p.id = wa.granted_to_user_id
  left join public.friend_groups fg on fg.id = wa.group_id
  left join lateral (
    select count(*)::bigint as member_count
    from public.friend_group_members fgm
    where fgm.group_id = wa.group_id
  ) group_counts on true
  where wa.wishlist_id = p_wishlist_id
    and w.user_id = auth.uid()
  order by wa.created_at desc;
$$;

CREATE OR REPLACE FUNCTION "public"."get_wishlist_by_id"("p_wishlist_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

  select coalesce(
    (
      select wa.access_type
      from public.wishlist_access wa
      where wa.wishlist_id = p_wishlist_id
        and wa.granted_to_user_id = v_current_user_id
      order by wa.created_at desc
      limit 1
    ),
    (
      select 2
      from public.wishlist_access wa
      inner join public.friend_group_members fgm on fgm.group_id = wa.group_id
      inner join public.friend_groups fg on fg.id = wa.group_id
      where wa.wishlist_id = p_wishlist_id
        and wa.group_id is not null
        and wa.access_type = 2
        and fg.user_id = v_wishlist_owner_id
        and fgm.user_id = v_current_user_id
      limit 1
    )
  ) into v_access_type;

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

CREATE OR REPLACE FUNCTION "public"."get_wishlist_by_share_token"("p_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_wishlist_id uuid;
  v_result jsonb;
  v_items_count bigint;
begin
  -- 1) validate token and extract wishlist_id
  v_wishlist_id := public.verify_wishlist_share_token(p_token);

  if v_wishlist_id is null then
    raise exception 'Invalid or expired token';
  end if;

  -- 2) ensure wishlist exists
  if not exists (select 1 from public.wishlist w where w.id = v_wishlist_id) then
    raise exception 'Wishlist not found';
  end if;

  -- 3) count items (same as your original)
  select count(*)
  into v_items_count
  from public.item
  where wishlist_id = v_wishlist_id;

  -- 4) return wishlist json (ignoring visibility)
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
    'event_date', w.event_date
  )
  into v_result
  from public.wishlist w
  where w.id = v_wishlist_id;

  return v_result;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_wishlist_items"("p_wishlist_id" "uuid", "p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 50, "p_search" "text" DEFAULT NULL::"text", "p_sort" "text" DEFAULT 'newest'::"text", "p_statuses" integer[] DEFAULT NULL::integer[], "p_priorities" "uuid"[] DEFAULT NULL::"uuid"[], "p_price_min" numeric DEFAULT NULL::numeric, "p_price_max" numeric DEFAULT NULL::numeric) RETURNS TABLE("id" "uuid", "wishlist_id" "uuid", "name" "text", "description" "text", "price" "text", "url" "text", "created_at" timestamp with time zone, "status" smallint, "reserved_by" "uuid", "image_url" "text", "discount_price" "text", "has_discount" boolean, "discount_end_date" "text", "currency" "text", "additional_links" "jsonb", "priority_id" "uuid", "priority_name" "text", "color_index" smallint)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    i.id,
    i.wishlist_id,
    i.name,
    i.description,
    i.price,
    i.url,
    i.created_at,
    i.status,
    i.reserved_by,
    i.image_url,
    i.discount_price,
    i.has_discount,
    i.discount_end_date,
    i.currency,
    i.additional_links,
    i.priority_id,
    ip.name AS priority_name,
    i.color_index
  FROM public.item i
  LEFT JOIN public.item_priorities ip ON ip.id = i.priority_id
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
      OR i.priority_id = ANY(p_priorities)
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
    CASE WHEN p_sort = 'priority-high' THEN ip.sort_order END DESC NULLS LAST,
    CASE WHEN p_sort = 'priority-low'  THEN ip.sort_order END ASC NULLS LAST,
    i.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
$$;

CREATE OR REPLACE FUNCTION "public"."get_wishlist_items_by_share_token"("p_token" "text", "p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "wishlist_id" "uuid", "name" "text", "description" "text", "price" "text", "url" "text", "created_at" timestamp with time zone, "status" smallint, "reserved_by" "uuid", "image_url" "text", "discount_price" "text", "has_discount" boolean, "discount_end_date" "text", "currency" "text", "additional_links" "jsonb", "priority_id" "uuid", "priority_name" "text", "color_index" smallint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_wishlist_id uuid;
begin
  v_wishlist_id := public.verify_wishlist_share_token(p_token);

  if v_wishlist_id is null then
    raise exception 'Invalid or expired token';
  end if;

  return query
  SELECT
    i.id, i.wishlist_id, i.name, i.description, i.price, i.url,
    i.created_at, i.status, i.reserved_by, i.image_url,
    i.discount_price, i.has_discount, i.discount_end_date, i.currency,
    i.additional_links, i.priority_id, ip.name AS priority_name,
    i.color_index
  FROM public.item i
  LEFT JOIN public.item_priorities ip ON ip.id = i.priority_id
  WHERE i.wishlist_id = v_wishlist_id
  ORDER BY i.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_wishlist_token_secret"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
begin
  -- TODO: replace with your real long random secret (>= 32 chars, recommended 64+)
  return 'XrpoEC66gzhw6scEruavVOGSM8PASlrlOui78nUv7fe';
end;
$$;

CREATE OR REPLACE FUNCTION "public"."grant_wishlist_access"("p_wishlist_id" "uuid", "p_granted_to_user_id" "uuid", "p_access_type" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_current_user_id uuid;
  v_wishlist_owner_id uuid;
  v_target_nickname text;
  v_updated_count integer;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_access_type not in (0, 1, 3) then
    raise exception 'Invalid direct access type';
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

  update public.wishlist_access
  set access_type = p_access_type,
      granted_by_user_id = v_current_user_id,
      group_id = null,
      created_at = now()
  where wishlist_id = p_wishlist_id
    and granted_to_user_id = p_granted_to_user_id;

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    insert into public.wishlist_access (
      wishlist_id,
      granted_to_user_id,
      granted_by_user_id,
      access_type
    ) values (
      p_wishlist_id,
      p_granted_to_user_id,
      v_current_user_id,
      p_access_type
    );
  end if;

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

CREATE OR REPLACE FUNCTION "public"."grant_wishlist_group_access"("p_wishlist_id" "uuid", "p_group_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_current_user_id uuid;
  v_wishlist_owner_id uuid;
  v_group_name text;
  v_updated_count integer;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
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

  select fg.name
  into v_group_name
  from public.friend_groups fg
  where fg.id = p_group_id
    and fg.user_id = v_current_user_id;

  if v_group_name is null then
    raise exception 'Friend group not found';
  end if;

  update public.wishlist_access
  set access_type = 2,
      granted_by_user_id = v_current_user_id,
      granted_to_user_id = null,
      created_at = now()
  where wishlist_id = p_wishlist_id
    and group_id = p_group_id;

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    insert into public.wishlist_access (
      wishlist_id,
      group_id,
      granted_by_user_id,
      access_type
    ) values (
      p_wishlist_id,
      p_group_id,
      v_current_user_id,
      2
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'wishlist_id', p_wishlist_id,
    'group_id', p_group_id,
    'group_name', v_group_name,
    'access_type', 2,
    'access_role', 'selected_group'
  );
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, nickname)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    split_part(new.email, '@', 1)
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_new_user_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_new_user_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Створити запис підписки (free plan)
  INSERT INTO public.user_subscriptions (
    user_id, 
    plan, 
    is_active,
    revenuecat_customer_id
  )
  VALUES (
    NEW.id, 
    'free', 
    true,
    NULL
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."is_email_password_user"("user_email" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  -- Повертає true, якщо існує identity з provider = 'email' для заданого email
  select exists (
    select 1
    from auth.identities i
    where i.provider = 'email'
      and (i.identity_data ->> 'email') = user_email
  );
$$;

CREATE OR REPLACE FUNCTION "public"."is_friend_with_user"("p_user_id" "uuid", "p_friend_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    p_user_id is not null
    and p_friend_user_id is not null
    and exists (
      select 1
      from public.friends f
      where (f.user_f = p_user_id and f.user_s = p_friend_user_id)
         or (f.user_s = p_user_id and f.user_f = p_friend_user_id)
    );
$$;

CREATE OR REPLACE FUNCTION "public"."list_secret_santa_events"("p_search" "text", "p_limit" integer, "p_offset" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  with accessible_events as (
    select distinct
      ss.id,
      ss.name,
      ss.event_date,
      ss.budget,
      ss.currency,
      ss.image_url,
      ss.owner_id,
      (ss.owner_id = auth.uid()) as is_owner
    from public.secret_santa ss
    left join public.secret_santa_participants ssp
      on ssp.event_id = ss.id
    where
      ss.owner_id = auth.uid()
      or ssp.user_id = auth.uid()
  ),
  filtered_events as (
    select *
    from accessible_events
    where
      p_search is null
      or p_search = ''
      or name ilike '%' || p_search || '%'
  ),
  total_count_cte as (
    select count(*) as total
    from filtered_events
  ),
  paginated_events as (
    select
      fe.id,
      fe.name,
      fe.event_date,
      fe.budget,
      fe.currency,
      fe.image_url,
      fe.owner_id,
      fe.is_owner,
      (
        select count(*)
        from public.secret_santa_participants ssp
        where ssp.event_id = fe.id
      )::int as participants_count
    from filtered_events fe
    order by fe.event_date asc, fe.name asc
    limit p_limit
    offset p_offset
  )
  select jsonb_build_object(
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', pe.id,
            'name', pe.name,
            'event_date', pe.event_date,
            'budget', pe.budget,
            'currency', pe.currency,
            'image_url', pe.image_url,
            'owner_id', pe.owner_id,
            'is_owner', pe.is_owner,
            'participants_count', pe.participants_count
          )
        )
        from paginated_events pe
      ),
      '[]'::jsonb
    ),
    'total',
    (select total from total_count_cte),
    'limit',
    p_limit,
    'offset',
    p_offset
  )
  into v_result;

  return v_result;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."notify_friends_about_new_wishlist"("p_wishlist_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_wishlist record;
  v_friend_id uuid;
  v_notification_text text;
  v_icon_type smallint := 4; -- іконка нового wishlist
BEGIN
  -- Отримати інформацію про вішліст
  SELECT 
    w.id,
    w.user_id,
    w.title,
    w.visibility_type,
    COALESCE(p.display_name, p.nickname, 'Unknown User') as owner_name
  INTO v_wishlist
  FROM public.wishlist w
  INNER JOIN public.profiles p ON p.id = w.user_id
  WHERE w.id = p_wishlist_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Перевірити чи wishlist публічний або для друзів
  IF v_wishlist.visibility_type NOT IN (0, 1) THEN
    RETURN; -- Якщо приватний (2), не створюємо нотифікації
  END IF;

  -- Сформувати текст нотифікації
  v_notification_text := format(
    '%s created a new wishlist "%s"',
    v_wishlist.owner_name,
    v_wishlist.title
  );

  -- Створити нотифікації для всіх друзів
  FOR v_friend_id IN
    SELECT 
      CASE 
        WHEN f.user_f = v_wishlist.user_id THEN f.user_s
        ELSE f.user_f
      END AS friend_id
    FROM public.friends f
    WHERE (f.user_f = v_wishlist.user_id OR f.user_s = v_wishlist.user_id)
  LOOP
    -- Створити нотифікацію
    INSERT INTO public.notifications (
      sender_id,
      receiver_id,
      text,
      icon_type,
      is_read
    ) VALUES (
      v_wishlist.user_id,
      v_friend_id,
      v_notification_text,
      v_icon_type,
      false
    );
  END LOOP;

END;
$$;

CREATE OR REPLACE FUNCTION "public"."notify_friends_about_upcoming_event"("p_wishlist_id" "uuid", "p_notification_type" "text" DEFAULT 'week_before'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_wishlist record;
  v_friend_id uuid;
  v_notification_text text;
  v_icon_type smallint := 3; -- іконка події/календаря
  v_days_text text;
BEGIN
  -- Отримати інформацію про в��шліст
  SELECT 
    w.id,
    w.user_id,
    w.title,
    w.event_date,
    COALESCE(p.display_name, p.nickname, 'Unknown User') as owner_name
  INTO v_wishlist
  FROM public.wishlist w
  INNER JOIN public.profiles p ON p.id = w.user_id
  WHERE w.id = p_wishlist_id;

  IF NOT FOUND THEN
    RETURN; -- Якщо вішліст не знайдено, просто виходимо
  END IF;

  -- Визначити текст залежно від типу нотифікації
  CASE p_notification_type
    WHEN 'week_before' THEN
      v_days_text := 'in 1 week';
    WHEN 'three_days_before' THEN
      v_days_text := 'in 3 days';
    WHEN 'day_before' THEN
      v_days_text := 'tomorrow';
    WHEN 'today' THEN
      v_days_text := 'today';
    ELSE
      v_days_text := 'soon';
  END CASE;

  -- Сформувати текст нотифікації
  v_notification_text := format(
    '%s''s event "%s" is %s (%s)',
    v_wishlist.owner_name,
    v_wishlist.title,
    v_days_text,
    v_wishlist.event_date::text
  );

  -- Створити нотифікації для всіх друзів
  FOR v_friend_id IN
    SELECT 
      CASE 
        WHEN f.user_f = v_wishlist.user_id THEN f.user_s
        ELSE f.user_f
      END AS friend_id
    FROM public.friends f
    WHERE (f.user_f = v_wishlist.user_id OR f.user_s = v_wishlist.user_id)
  LOOP
    -- Перевірити чи вже є така нотифікація (щоб не дублювати)
    -- Перевіряємо за останні 2 години
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE receiver_id = v_friend_id
        AND sender_id = v_wishlist.user_id
        AND text = v_notification_text
        AND created_at > now() - INTERVAL '2 hours'
    ) THEN
      -- Створити нотифікацію
      INSERT INTO public.notifications (
        sender_id,
        receiver_id,
        text,
        icon_type,
        is_read
      ) VALUES (
        v_wishlist.user_id,
        v_friend_id,
        v_notification_text,
        v_icon_type,
        false
      );
    END IF;
  END LOOP;

END;
$$;

CREATE OR REPLACE FUNCTION "public"."reject_friend_request"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    v_sender uuid;
    v_receiver uuid;
    v_receiver_name text;
    v_notify boolean;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT sender_id, receiver_id
    INTO v_sender, v_receiver
    FROM public.friend_requests
    WHERE id = p_request_id
      AND receiver_id = auth.uid()
      AND status = 0;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already handled';
    END IF;

    SELECT COALESCE(raw_user_meta_data->>'full_name', email)
    INTO v_receiver_name
    FROM auth.users
    WHERE id = v_receiver;

    SELECT COALESCE(notify_friend_requests, true)
    INTO v_notify
    FROM public.user_settings
    WHERE user_id = v_sender;

    IF v_notify IS TRUE THEN
        INSERT INTO public.notifications (
            sender_id,
            receiver_id,
            text,
            icon_type,
            type,
            entity_id
        )
        VALUES (
            v_receiver,
            v_sender,
            v_receiver_name || ' declined your friend request',
            3,
            2,
            v_receiver
        );
    END IF;

    DELETE FROM public.friend_requests
    WHERE id = p_request_id;
END;$$;


ALTER FUNCTION "public"."reject_friend_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_secret_santa_invite"("p_invite_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_current_user_id uuid;
  v_invite record;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select
    ssi.id,
    ssi.event_id,
    ssi.sender_id,
    ssi.receiver_id,
    ss.owner_id
  into v_invite
  from public.secret_santa_invites ssi
  inner join public.secret_santa ss on ss.id = ssi.event_id
  where ssi.id = p_invite_id;

  if not found then
    raise exception 'Secret Santa invite not found';
  end if;

  if v_invite.owner_id <> v_current_user_id then
    raise exception 'Only Secret Santa owner can remove invites';
  end if;

  delete from public.notifications n
  where n.receiver_id = v_invite.receiver_id
    and n.sender_id = v_invite.sender_id
    and n.entity_id in (v_invite.event_id, v_invite.id)
    and (
      n.text ilike 'You have been invited to Secret Santa%'
      or n.text ilike '%invited%Secret Santa%'
    );

  delete from public.secret_santa_invites ssi
  where ssi.id = v_invite.id;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."revoke_wishlist_access"("p_wishlist_id" "uuid", "p_target_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_current_user_id uuid;
  v_wishlist_owner_id uuid;
  v_deleted_count integer;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select w.user_id
  into v_wishlist_owner_id
  from public.wishlist w
  where w.id = p_wishlist_id;

  if v_wishlist_owner_id is null then
    raise exception 'Wishlist not found';
  end if;

  if v_wishlist_owner_id <> v_current_user_id then
    raise exception 'Only wishlist owner can revoke access';
  end if;

  if p_target_user_id = v_current_user_id then
    raise exception 'Owner access cannot be revoked';
  end if;

  delete from public.wishlist_access wa
  where wa.wishlist_id = p_wishlist_id
    and wa.granted_to_user_id = p_target_user_id;

  get diagnostics v_deleted_count = row_count;

  return jsonb_build_object(
    'success', true,
    'wishlist_id', p_wishlist_id,
    'target_user_id', p_target_user_id,
    'deleted', (v_deleted_count > 0)
  );
end;
$$;

CREATE OR REPLACE FUNCTION "public"."revoke_wishlist_group_access"("p_wishlist_id" "uuid", "p_group_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_current_user_id uuid;
  v_wishlist_owner_id uuid;
  v_deleted_count integer;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select w.user_id
  into v_wishlist_owner_id
  from public.wishlist w
  where w.id = p_wishlist_id;

  if v_wishlist_owner_id is null then
    raise exception 'Wishlist not found';
  end if;

  if v_wishlist_owner_id <> v_current_user_id then
    raise exception 'Only wishlist owner can revoke access';
  end if;

  delete from public.wishlist_access wa
  where wa.wishlist_id = p_wishlist_id
    and wa.group_id = p_group_id;

  get diagnostics v_deleted_count = row_count;

  return jsonb_build_object(
    'success', true,
    'wishlist_id', p_wishlist_id,
    'group_id', p_group_id,
    'deleted', (v_deleted_count > 0)
  );
end;
$$;

CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."search_profiles_by_nickname"("p_query" "text", "p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "nickname" "text", "display_name" "text", "avatar_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_query IS NULL OR length(trim(p_query)) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.nickname,
    p.display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.nickname ILIKE trim(p_query) || '%'
    AND p.id != v_current_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.friends f
      WHERE (f.user_f = v_current_user_id AND f.user_s = p.id)
         OR (f.user_f = p.id AND f.user_s = v_current_user_id)
    )
    AND p.id NOT IN (
      SELECT fr.receiver_id 
      FROM public.friend_requests fr
      WHERE fr.sender_id = v_current_user_id
      UNION
      SELECT fr.sender_id
      FROM public.friend_requests fr
      WHERE fr.receiver_id = v_current_user_id
    )
  ORDER BY p.nickname
  OFFSET p_skip
  LIMIT p_take;

END;$$;


ALTER FUNCTION "public"."search_profiles_by_nickname"("p_query" "text", "p_skip" integer, "p_take" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_profiles_by_nickname"("p_query" "text", "p_skip" integer, "p_take" integer) IS 'Шукає профілі за nickname, виключає себе, друзів та користувачів з активними запитами';



CREATE OR REPLACE FUNCTION "public"."toggle_item_bought"("p_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.toggle_item_bought_for_current_user(p_item_id, true);
$$;

CREATE OR REPLACE FUNCTION "public"."toggle_item_bought_for_current_user"("p_item_id" "uuid", "p_notify_owner" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

CREATE OR REPLACE FUNCTION "public"."toggle_item_bought_secret"("p_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.toggle_item_bought_for_current_user(p_item_id, false);
$$;

CREATE OR REPLACE FUNCTION "public"."toggle_item_reservation"("p_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.toggle_item_reservation_for_current_user(p_item_id, true);
$$;

CREATE OR REPLACE FUNCTION "public"."toggle_item_reservation_for_current_user"("p_item_id" "uuid", "p_notify_owner" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

CREATE OR REPLACE FUNCTION "public"."toggle_item_reservation_secret"("p_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.toggle_item_reservation_for_current_user(p_item_id, false);
$$;

CREATE OR REPLACE FUNCTION "public"."update_friend_group"("p_group_id" "uuid", "p_name" "text", "p_description" "text" DEFAULT NULL::"text", "p_color" "text" DEFAULT 'pink'::"text", "p_icon" "text" DEFAULT 'users'::"text", "p_member_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_current_user_id uuid;
  v_member_count integer;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'Group name is required';
  end if;

  if not exists (
    select 1
    from public.friend_groups fg
    where fg.id = p_group_id
      and fg.user_id = v_current_user_id
  ) then
    raise exception 'Friend group not found';
  end if;

  perform public.validate_friend_group_members(v_current_user_id, p_member_ids);

  update public.friend_groups
  set name = btrim(p_name),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      color = coalesce(nullif(btrim(p_color), ''), 'pink'),
      icon = coalesce(nullif(btrim(p_icon), ''), 'users'),
      updated_at = now()
  where id = p_group_id
    and user_id = v_current_user_id;

  delete from public.friend_group_members
  where group_id = p_group_id;

  insert into public.friend_group_members (group_id, user_id)
  select p_group_id, member_id
  from (
    select distinct member_id
    from unnest(coalesce(p_member_ids, array[]::uuid[])) as member_id
  ) members;

  select count(*) into v_member_count
  from public.friend_group_members
  where group_id = p_group_id;

  return jsonb_build_object(
    'success', true,
    'id', p_group_id,
    'member_count', v_member_count
  );
end;
$$;

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."validate_friend_group_members"("p_owner_id" "uuid", "p_member_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_expected integer;
  v_valid integer;
begin
  select count(distinct member_id)
  into v_expected
  from unnest(coalesce(p_member_ids, array[]::uuid[])) as member_id;

  if exists (
    select 1
    from unnest(coalesce(p_member_ids, array[]::uuid[])) as member_id
    where member_id = p_owner_id
  ) then
    raise exception 'Cannot add yourself to a friend group';
  end if;

  select count(distinct member_id)
  into v_valid
  from unnest(coalesce(p_member_ids, array[]::uuid[])) as member_id
  where public.is_friend_with_user(p_owner_id, member_id);

  if v_expected <> v_valid then
    raise exception 'All group members must be your friends';
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."verify_wishlist_share_token"("p_token" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_secret text;
  v_raw bytea;
  v_iv bytea;
  v_cipher bytea;
  v_plain bytea;
  v_payload jsonb;
  v_exp timestamptz;
  v_wid uuid;
begin
  if p_token is null or length(p_token) < 10 then
    return null;
  end if;

  v_secret := public.get_wishlist_token_secret();

  v_raw := public.base64url_decode(p_token);

  if octet_length(v_raw) <= 16 then
    return null;
  end if;

  v_iv := substring(v_raw from 1 for 16);
  v_cipher := substring(v_raw from 17);

  begin
    v_plain := decrypt_iv(v_cipher, convert_to(v_secret, 'utf8'), v_iv, 'aes');
  exception when others then
    return null;
  end;

  v_payload := (convert_from(v_plain, 'utf8'))::jsonb;

  v_exp := (v_payload->>'exp')::timestamptz;
  if v_exp is null or now() > v_exp then
    return null;
  end if;

  v_wid := (v_payload->>'wid')::uuid;
  return v_wid;
exception when others then
  return null;
end;
$$;


commit;
