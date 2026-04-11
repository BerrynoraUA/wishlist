


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."feature_idea_status" AS ENUM (
    'pending',
    'approved',
    'in_development',
    'done'
);


ALTER TYPE "public"."feature_idea_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_friend_request"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    v_sender uuid;
    v_receiver uuid;
    v_receiver_name text;
    v_notify boolean;
BEGIN
    -- Перевірка авторизації
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Отримуємо дані запиту
    SELECT sender_id, receiver_id
    INTO v_sender, v_receiver
    FROM public.friend_requests
    WHERE id = p_request_id
      AND status = 0; -- pending

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already handled';
    END IF;

    -- Перевірка, що це receiver
    IF v_receiver <> auth.uid() THEN
        RAISE EXCEPTION 'Only receiver can accept request';
    END IF;

    -- Створюємо friendship
    INSERT INTO public.friends (user_f, user_s)
    VALUES (
        LEAST(v_sender, v_receiver),
        GREATEST(v_sender, v_receiver)
    )
    ON CONFLICT (user_f, user_s) DO NOTHING;

    -- Отримати ім'я того, хто прийняв (receiver)
    SELECT COALESCE(raw_user_meta_data->>'full_name', email)
    INTO v_receiver_name
    FROM auth.users
    WHERE id = v_receiver;

    -- Перевірити чи sender хоче отримувати такі нотифікації
    SELECT COALESCE(notify_friend_requests, true)
    INTO v_notify
    FROM public.user_settings
    WHERE user_id = v_sender;

    -- Якщо дозволено — створюємо нотифікацію
    IF v_notify IS TRUE THEN
        INSERT INTO public.notifications (
            sender_id,
            receiver_id,
            text,
            icon_type
        )
        VALUES (
            v_receiver,
            v_sender,
            v_receiver_name || ' accepted your friend request',
            2
        );
    END IF;

    -- Видаляємо request
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


ALTER FUNCTION "public"."accept_secret_santa_invite"("p_invite_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."base64url_decode"("data" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."base64url_encode"("data" "bytea") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select translate(encode(data, 'base64'), E'+/=\n', '-_');
$$;


ALTER FUNCTION "public"."base64url_encode"("data" "bytea") OWNER TO "postgres";


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


ALTER FUNCTION "public"."check_upcoming_events"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_upcoming_events"() IS 'Перевіряє всі події і створює нотифікації друзям. Запускається через cron щодня.';



CREATE OR REPLACE FUNCTION "public"."create_friend_request_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  v_sender_name text;
  v_notify boolean;
BEGIN
  -- Отримати ім'я відправника
  SELECT COALESCE(raw_user_meta_data->>'full_name', email)
  INTO v_sender_name
  FROM auth.users
  WHERE id = NEW.sender_id;

  -- Перевірити налаштування нотифікацій отримувача
  SELECT notify_friend_requests
  INTO v_notify
  FROM public.user_settings
  WHERE user_id = NEW.receiver_id;

  -- Якщо нотифікації вимкнені — нічого не робимо
  IF v_notify IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Створити нотифікацію
  INSERT INTO public.notifications (
    sender_id,
    receiver_id,
    text,
    icon_type
  )
  VALUES (
    NEW.sender_id,
    NEW.receiver_id,
    v_sender_name || ' sent you a friend request',
    1
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


ALTER FUNCTION "public"."create_secret_santa_event"("p_name" "text", "p_event_date" "date", "p_budget" integer, "p_image_url" "text", "p_invited_user_ids" "jsonb") OWNER TO "postgres";


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


ALTER FUNCTION "public"."create_secret_santa_event"("p_name" "text", "p_event_date" timestamp with time zone, "p_budget" numeric, "p_image_url" "text", "p_invited_user_ids" "jsonb", "p_currency" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."create_wishlist_share_token"("p_wishlist_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."decline_secret_santa_invite"("p_invite_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."delete_secret_santa_event"("p_event_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_friends"("p_skip" integer, "p_take" integer, "p_user_id" "uuid", "p_search" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."get_friends_wishlists_discover"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20, "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "owner" "text", "username" "text", "avatar_url" "text", "wishlist" "text", "wishlist_id" "uuid", "items" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$DECLARE
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
          'currency', COALESCE(i.currency, null),
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
END;$_$;


ALTER FUNCTION "public"."get_friends_wishlists_discover"("p_skip" integer, "p_take" integer, "p_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_friends_wishlists_discover_all"("p_skip" integer, "p_take" integer, "p_search" "text") RETURNS TABLE("id" "uuid", "owner" "text", "username" "text", "avatar_url" "text", "wishlist" "text", "wishlist_id" "uuid", "items" "jsonb")
    LANGUAGE "plpgsql"
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
          'currency', i.currency,
          'priority',
            CASE i.priority
              WHEN 1 THEN 'Low'
              WHEN 2 THEN 'Medium'
              WHEN 3 THEN 'High'
              ELSE NULL
            END,
          'status', i.status
        )
        ORDER BY i.created_at DESC
      ) FILTER (WHERE i.id IS NOT NULL) AS items
    FROM public.item i
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
    AND wi.items IS NOT NULL
    AND (
      v_search IS NULL
      OR w.title ILIKE '%' || v_search || '%'
    )
  ORDER BY w.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
END;
$_$;


ALTER FUNCTION "public"."get_friends_wishlists_discover_all"("p_skip" integer, "p_take" integer, "p_search" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_friends_with_details"("p_skip" integer, "p_take" integer, "p_search" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_friends_without_wishlist_access"("p_wishlist_id" "uuid", "p_search" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_friends_without_wishlist_access"("p_wishlist_id" "uuid", "p_search" "text", "p_skip" integer, "p_take" integer) OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_incoming_friend_requests_with_details"("p_user_id" "uuid", "p_skip" integer, "p_take" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_bought_items"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20, "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("item_id" "uuid", "title" "text", "price" numeric, "discount_price" numeric, "url" "text", "store" "text", "image" "text", "priority" integer, "status" integer, "wishlist_id" "uuid", "wishlist_title" "text", "owner_id" "uuid", "owner_name" "text", "owner_username" "text", "owner_avatar" "text")
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
  SELECT
    i.id AS item_id,
    i.name AS title,

    CASE
      WHEN i.price IS NOT NULL
           AND i.price ~ '^[0-9]+\.?[0-9]*$'
      THEN i.price::numeric
      ELSE 0::numeric
    END AS price,

    CASE
      WHEN i.discount_price IS NOT NULL
           AND i.discount_price ~ '^[0-9]+\.?[0-9]*$'
      THEN i.discount_price::numeric
      ELSE 0::numeric
    END AS discount_price,

    COALESCE(i.url, '') AS url,

    CASE
      WHEN i.url IS NOT NULL AND i.url != '' THEN
        COALESCE(
          NULLIF(
            regexp_replace(
              regexp_replace(i.url, '^https?://(www\.)?', '', 'i'),
              '/.*$',
              ''
            ),
            ''
          ),
          'Store'
        )
      ELSE 'Store'
    END AS store,

    COALESCE(i.image_url, '') AS image,
    COALESCE(i.priority, 0)::integer AS priority,
    i.status::integer AS status,
    w.id AS wishlist_id,
    w.title AS wishlist_title,
    p.id AS owner_id,
    COALESCE(p.display_name, p.nickname, 'Unknown User') AS owner_name,
    COALESCE(p.nickname, '') AS owner_username,
    COALESCE(p.avatar_url, '') AS owner_avatar
  FROM public.item i
  INNER JOIN public.wishlist w ON w.id = i.wishlist_id
  INNER JOIN public.profiles p ON p.id = w.user_id
  WHERE i.status = 2
    AND i.reserved_by = v_current_user_id
    AND w.visibility_type IN (0, 1)
    AND (
      v_search IS NULL
      OR i.name ILIKE '%' || v_search || '%'
      OR w.title ILIKE '%' || v_search || '%'
      OR p.nickname ILIKE '%' || v_search || '%'
      OR p.display_name ILIKE '%' || v_search || '%'
    )
  ORDER BY i.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
END;
$_$;


ALTER FUNCTION "public"."get_my_bought_items"("p_skip" integer, "p_take" integer, "p_search" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_my_wishlists"("p_skip" integer, "p_take" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_wishlists_feed"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 10, "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" "text", "description" "text", "image_url" "text", "created_at" timestamp with time zone, "visibility_type" integer, "accent_type" integer, "event_date" "date", "items_count" bigint, "can_edit" boolean, "is_owner" boolean, "access_type" integer, "owner_nickname" "text")
    LANGUAGE "sql" STABLE
    AS $$with accessible_wishlists as (
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
      case
        when w.user_id = auth.uid() then 1
        else wa.access_type
      end as access_type,
      case
        when w.user_id = auth.uid() then null
        else p.nickname
      end as owner_nickname
    from public.wishlist w
    left join public.wishlist_access wa
      on wa.wishlist_id = w.id
     and wa.granted_to_user_id = auth.uid()
    left join public.profiles p
      on p.id = w.user_id
    where
      (
        w.user_id = auth.uid()
        or wa.access_type = 1 or wa.access_type = 0
      )
      and (
        p_search is null
        or p_search = ''
        or w.title ilike '%' || p_search || '%'
      )
  ),
  paginated as (
    select *
    from accessible_wishlists
    order by created_at desc
    offset p_skip
    limit p_take
  ),
  item_counts as (
    select
      i.wishlist_id,
      count(*)::bigint as items_count
    from public.item i
    where i.wishlist_id in (select id from paginated)
    group by i.wishlist_id
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
    coalesce(ic.items_count, 0) as items_count,
    pw.can_edit,
    pw.is_owner,
    pw.access_type,
    pw.owner_nickname
  from paginated pw
  left join item_counts ic on ic.wishlist_id = pw.id
  order by pw.created_at desc;$$;


ALTER FUNCTION "public"."get_my_wishlists_feed"("p_skip" integer, "p_take" integer, "p_search" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_outgoing_friend_requests_with_details"("p_user_id" "uuid", "p_skip" integer, "p_take" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_reserved_items_by_me"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 10, "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("item_id" "uuid", "title" "text", "price" numeric, "discount_price" numeric, "currency" "text", "url" "text", "store" "text", "image" "text", "priority" integer, "status" integer, "wishlist_id" "uuid", "wishlist_title" "text", "owner_id" "uuid", "owner_name" "text", "owner_username" "text", "owner_avatar" "text")
    LANGUAGE "plpgsql"
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
  SELECT
    i.id AS item_id,
    i.name AS title,

    CASE
      WHEN i.price IS NOT NULL
           AND i.price ~ '^[0-9]+\.?[0-9]*$'
      THEN i.price::numeric
      ELSE 0::numeric
    END AS price,

    CASE
      WHEN i.discount_price IS NOT NULL
           AND i.discount_price ~ '^[0-9]+\.?[0-9]*$'
      THEN i.discount_price::numeric
      ELSE 0::numeric
    END AS discount_price,

    NULLIF(btrim(i.currency), '') AS currency,

    COALESCE(i.url, '') AS url,

    CASE
      WHEN i.url IS NOT NULL AND i.url != '' THEN
        COALESCE(
          NULLIF(
            regexp_replace(
              regexp_replace(i.url, '^https?://(www\.)?', '', 'i'),
              '/.*$',
              ''
            ),
            ''
          ),
          'Store'
        )
      ELSE 'Store'
    END AS store,

    COALESCE(i.image_url, '') AS image,
    COALESCE(i.priority, 0)::integer AS priority,
    i.status::integer AS status,
    w.id AS wishlist_id,
    w.title AS wishlist_title,
    p.id AS owner_id,
    COALESCE(p.display_name, p.nickname, 'Unknown User') AS owner_name,
    COALESCE(p.nickname, '') AS owner_username,
    COALESCE(p.avatar_url, '') AS owner_avatar
  FROM public.item i
  INNER JOIN public.wishlist w ON w.id = i.wishlist_id
  INNER JOIN public.profiles p ON p.id = w.user_id
  WHERE i.status = 1
    AND i.reserved_by = v_current_user_id
    AND w.visibility_type IN (0, 1)
    AND (
      v_search IS NULL
      OR i.name ILIKE '%' || v_search || '%'
      OR w.title ILIKE '%' || v_search || '%'
      OR p.nickname ILIKE '%' || v_search || '%'
      OR p.display_name ILIKE '%' || v_search || '%'
    )
  ORDER BY i.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
END;
$_$;


ALTER FUNCTION "public"."get_reserved_items_by_me"("p_skip" integer, "p_take" integer, "p_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_reserved_wishlists_by_me"("p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "owner" "text", "username" "text", "avatar_url" "text", "wishlist" "text", "wishlist_id" "uuid", "items" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_current_user_id uuid;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
          'price', CASE 
            WHEN i.price IS NOT NULL 
                 AND i.price ~ '^[0-9]+\.?[0-9]*$'
            THEN i.price::numeric
            ELSE 0
          END,
          'store', CASE 
            WHEN i.url IS NOT NULL AND i.url != '' THEN 
              COALESCE(
                NULLIF(
                  regexp_replace(
                    regexp_replace(
                      i.url,
                      '^https?://(www\.)?',
                      '',
                      'i'
                    ),
                    '/.*$',
                    ''
                  ),
                  ''
                ),
                'Store'
              )
            ELSE 'Store'
          END,
          'image', COALESCE(i.image_url, ''),
          'priority', CASE i.priority
            WHEN 1 THEN 'Low'
            WHEN 2 THEN 'Medium'
            WHEN 3 THEN 'High'
            ELSE NULL
          END,
          'status', i.status,
          'isReserved', TRUE,
          'reservedBy', i.reserved_by,
          'isReservedByMe', TRUE,
          'reservedByUser',
            jsonb_build_object(
              'id', rp.id,
              'displayName', COALESCE(rp.display_name, rp.nickname, 'Unknown User'),
              'username', COALESCE(rp.nickname, ''),
              'avatarUrl', COALESCE(rp.avatar_url, '')
            )
        )
        ORDER BY i.created_at DESC
      ) AS items
    FROM public.item i
    LEFT JOIN public.profiles rp 
      ON rp.id = i.reserved_by
    WHERE 
      i.status = 1
      AND i.reserved_by = v_current_user_id
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
  INNER JOIN user_friends uf 
    ON uf.friend_id = w.user_id
  INNER JOIN public.profiles p 
    ON p.id = w.user_id
  INNER JOIN wishlist_items wi
    ON wi.wishlist_id = w.id
  WHERE w.visibility_type IN (0, 1)
  ORDER BY w.created_at DESC
  OFFSET p_skip
  LIMIT p_take;

END;
$_$;


ALTER FUNCTION "public"."get_reserved_wishlists_by_me"("p_skip" integer, "p_take" integer) OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_secret_santa_details"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_notifications_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COUNT(*)::integer
  FROM public.notifications
  WHERE receiver_id = p_user_id
    AND is_read = false;
$$;


ALTER FUNCTION "public"."get_unread_notifications_count"("p_user_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_unread_only" boolean) OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_user_statistics"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_user_stats"() OWNER TO "postgres";


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
      i.priority,
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
    join public.wishlist w
      on w.id = i.wishlist_id
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
            'priority', p.priority,
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


ALTER FUNCTION "public"."get_user_visible_items_by_max_price"("p_user_id" "uuid", "p_max_price" numeric, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_wishlist_access_list"("p_wishlist_id" "uuid") RETURNS TABLE("granted_to_user_id" "uuid", "nickname" "text", "access_type" integer, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  select
    wa.granted_to_user_id,
    p.nickname,
    wa.access_type,
    wa.created_at
  from public.wishlist_access wa
  left join public.profiles p on p.id = wa.granted_to_user_id
  join public.wishlist w on w.id = wa.wishlist_id
  where wa.wishlist_id = p_wishlist_id
    and w.user_id = auth.uid()
  order by wa.created_at desc;
$$;


ALTER FUNCTION "public"."get_wishlist_access_list"("p_wishlist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_wishlist_by_id"("p_wishlist_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare
  v_current_user_id uuid;
  v_wishlist_owner_id uuid;
  v_visibility_type integer;
  v_owner_nickname text;
  v_result jsonb;
  v_items_count bigint;
  v_is_owner boolean;
  v_can_edit boolean := false;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Отримати wishlist + nickname власника
  select
    w.user_id,
    w.visibility_type,
    p.nickname
  into
    v_wishlist_owner_id,
    v_visibility_type,
    v_owner_nickname
  from public.wishlist w
  left join public.profiles p on p.id = w.user_id
  where w.id = p_wishlist_id;

  -- Перевірити чи wishlist існує
  if v_wishlist_owner_id is null then
    raise exception 'Wishlist not found';
  end if;

  v_is_owner := (v_wishlist_owner_id = v_current_user_id);

  -- Якщо owner — може редагувати
  if v_is_owner then
    v_can_edit := true;
  else
    -- Якщо не owner, перевіряємо edit access
    if exists (
      select 1
      from public.wishlist_access wa
      where wa.wishlist_id = p_wishlist_id
        and wa.granted_to_user_id = v_current_user_id
        and wa.access_type = 1
    ) then
      v_can_edit := true;
    end if;

    -- Перевірка доступу по visibility / friendship / shared access
    if v_visibility_type = 2 then -- Private
      -- Для private дозволяємо тільки якщо є explicit access
      if not exists (
        select 1
        from public.wishlist_access wa
        where wa.wishlist_id = p_wishlist_id
          and wa.granted_to_user_id = v_current_user_id
      ) then
        raise exception 'Cannot access private wishlist';
      end if;

    elsif v_visibility_type = 1 then -- FriendsOnly
      -- Дружба або explicit access
      if not exists (
        select 1
        from public.friends f
        where (f.user_f = v_current_user_id and f.user_s = v_wishlist_owner_id)
           or (f.user_f = v_wishlist_owner_id and f.user_s = v_current_user_id)
      )
      and not exists (
        select 1
        from public.wishlist_access wa
        where wa.wishlist_id = p_wishlist_id
          and wa.granted_to_user_id = v_current_user_id
      ) then
        raise exception 'Not friends with wishlist owner';
      end if;
    end if;
  end if;

  -- Порахувати кількість айтемів
  select count(*)
  into v_items_count
  from public.item
  where wishlist_id = p_wishlist_id;

  -- Повернути wishlist з метаданими
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
    'event_date', w.event_date,
    'is_owner', v_is_owner,
    'can_edit', v_can_edit,
    'owner_nickname', case when v_is_owner then null else v_owner_nickname end
  )
  into v_result
  from public.wishlist w
  where w.id = p_wishlist_id;

  return v_result;
end;$$;


ALTER FUNCTION "public"."get_wishlist_by_id"("p_wishlist_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_wishlist_by_id"("p_wishlist_id" "uuid") IS 'Повертає wishlist за ID з перевіркою доступу та кількістю айтемів';



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


ALTER FUNCTION "public"."get_wishlist_by_share_token"("p_token" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wishlist_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" "text",
    "priority" smallint,
    "url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" smallint DEFAULT '0'::smallint,
    "reserved_by" "uuid",
    "image_url" "text",
    "discount_price" "text",
    "has_discount" boolean DEFAULT false,
    "discount_end_date" "text",
    "currency" "text"
);


ALTER TABLE "public"."item" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_wishlist_items_by_share_token"("p_token" "text", "p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 50) RETURNS SETOF "public"."item"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_wishlist_id uuid;
begin
  -- validate token + extract wishlist id
  v_wishlist_id := public.verify_wishlist_share_token(p_token);

  if v_wishlist_id is null then
    raise exception 'Invalid or expired token';
  end if;

  return query
  select *
  from public.item i
  where i.wishlist_id = v_wishlist_id
  order by i.created_at desc
  offset p_skip
  limit p_take;
end;
$$;


ALTER FUNCTION "public"."get_wishlist_items_by_share_token"("p_token" "text", "p_skip" integer, "p_take" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_wishlist_token_secret"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
begin
  -- TODO: replace with your real long random secret (>= 32 chars, recommended 64+)
  return 'XrpoEC66gzhw6scEruavVOGSM8PASlrlOui78nUv7fe';
end;
$$;


ALTER FUNCTION "public"."get_wishlist_token_secret"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grant_wishlist_access"("p_wishlist_id" "uuid", "p_granted_to_user_id" "uuid", "p_access_type" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_current_user_id uuid;
  v_wishlist_owner_id uuid;
  v_target_nickname text;
  v_result jsonb;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_access_type not in (0, 1) then
    raise exception 'Invalid access type';
  end if;

  -- Отримати owner wishlist
  select w.user_id
  into v_wishlist_owner_id
  from public.wishlist w
  where w.id = p_wishlist_id;

  if v_wishlist_owner_id is null then
    raise exception 'Wishlist not found';
  end if;

  -- Тільки owner може видавати доступ
  if v_wishlist_owner_id <> v_current_user_id then
    raise exception 'Only wishlist owner can grant access';
  end if;

  -- Не можна видати доступ самому собі
  if p_granted_to_user_id = v_current_user_id then
    raise exception 'Cannot grant access to yourself';
  end if;

  -- Перевірити, що користувач існує
  if not exists (
    select 1
    from auth.users u
    where u.id = p_granted_to_user_id
  ) then
    raise exception 'Target user not found';
  end if;

  -- Upsert доступу
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

  -- Для відповіді
  select p.nickname
  into v_target_nickname
  from public.profiles p
  where p.id = p_granted_to_user_id;

  v_result := jsonb_build_object(
    'success', true,
    'wishlist_id', p_wishlist_id,
    'granted_to_user_id', p_granted_to_user_id,
    'granted_to_nickname', v_target_nickname,
    'access_type', p_access_type,
    'access_role', case when p_access_type = 1 then 'editor' else 'viewer' end
  );

  return v_result;
end;
$$;


ALTER FUNCTION "public"."grant_wishlist_access"("p_wishlist_id" "uuid", "p_granted_to_user_id" "uuid", "p_access_type" integer) OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_user_settings"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_user_subscription"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user_subscription"() IS 'Автоматично створює запис підписки (free) при реєстрації нового користувача';



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


ALTER FUNCTION "public"."is_email_password_user"("user_email" "text") OWNER TO "postgres";


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


ALTER FUNCTION "public"."list_secret_santa_events"("p_search" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


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


ALTER FUNCTION "public"."notify_friends_about_new_wishlist"("p_wishlist_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_friends_about_new_wishlist"("p_wishlist_id" "uuid") IS 'Створює нотифікації для всіх друзів про новий wishlist (якщо visibility 0 або 1)';



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


ALTER FUNCTION "public"."notify_friends_about_upcoming_event"("p_wishlist_id" "uuid", "p_notification_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_friends_about_upcoming_event"("p_wishlist_id" "uuid", "p_notification_type" "text") IS 'Створює нотифікації для всіх друзів про наближення події. Перевіряє дублікати за текстом.';



CREATE OR REPLACE FUNCTION "public"."reject_friend_request"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
    v_sender uuid;
    v_receiver uuid;
    v_receiver_name text;
    v_notify boolean;
BEGIN
    -- Перевірка авторизації
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Отримуємо дані запиту
    SELECT sender_id, receiver_id
    INTO v_sender, v_receiver
    FROM public.friend_requests
    WHERE id = p_request_id
      AND receiver_id = auth.uid()
      AND status = 0; -- pending

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already handled';
    END IF;

    -- Отримати ім'я того, хто відхилив (receiver)
    SELECT COALESCE(raw_user_meta_data->>'full_name', email)
    INTO v_receiver_name
    FROM auth.users
    WHERE id = v_receiver;

    -- Перевірити налаштування нотифікацій sender'а
    SELECT COALESCE(notify_friend_requests, true)
    INTO v_notify
    FROM public.user_settings
    WHERE user_id = v_sender;

    -- Якщо дозволено — створити нотифікацію
    IF v_notify IS TRUE THEN
        INSERT INTO public.notifications (
            sender_id,
            receiver_id,
            text,
            icon_type
        )
        VALUES (
            v_receiver,
            v_sender,
            v_receiver_name || ' declined your friend request',
            3
        );
    END IF;

    -- Видаляємо request
    DELETE FROM public.friend_requests
    WHERE id = p_request_id;
END;$$;


ALTER FUNCTION "public"."reject_friend_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_wishlist_access"("p_wishlist_id" "uuid", "p_target_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."revoke_wishlist_access"("p_wishlist_id" "uuid", "p_target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_profiles_by_nickname"("p_query" "text", "p_skip" integer DEFAULT 0, "p_take" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "nickname" "text", "display_name" "text", "avatar_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
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
  WHERE p.nickname ILIKE '%' || trim(p_query) || '%'
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

END;
$$;


ALTER FUNCTION "public"."search_profiles_by_nickname"("p_query" "text", "p_skip" integer, "p_take" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_profiles_by_nickname"("p_query" "text", "p_skip" integer, "p_take" integer) IS 'Шукає профілі за nickname, виключає себе, друзів та користувачів з активними запитами';



CREATE OR REPLACE FUNCTION "public"."toggle_item_bought"("p_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_user_id uuid;
  v_item_owner_id uuid;
  v_current_status smallint;
  v_reserved_by uuid;
  v_visibility_type integer;
  v_result jsonb;
  v_notify boolean;
  v_buyer_name text;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    i.status,
    i.reserved_by,
    w.user_id,
    w.visibility_type
  INTO
    v_current_status,
    v_reserved_by,
    v_item_owner_id,
    v_visibility_type
  FROM public.item i
  INNER JOIN public.wishlist w ON w.id = i.wishlist_id
  WHERE i.id = p_item_id;

  IF v_item_owner_id IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  IF v_item_owner_id = v_current_user_id THEN
    RAISE EXCEPTION 'Cannot buy your own item';
  END IF;

  IF v_visibility_type = 2 THEN
    RAISE EXCEPTION 'Cannot access private wishlist';
  END IF;

  IF v_visibility_type = 1 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.friends f
      WHERE (f.user_f = v_current_user_id AND f.user_s = v_item_owner_id)
         OR (f.user_f = v_item_owner_id AND f.user_s = v_current_user_id)
    ) THEN
      RAISE EXCEPTION 'Not friends with item owner';
    END IF;
  END IF;

  -- TOGGLE bought (status = 2)
  IF v_current_status = 2 THEN
    IF v_reserved_by = v_current_user_id THEN
      -- bought -> reserved (а не available)
      UPDATE public.item
      SET status = 1,
          reserved_by = v_current_user_id
      WHERE id = p_item_id;
    ELSE
      RAISE EXCEPTION 'Item already marked as bought by another user';
    END IF;

  ELSIF v_current_status = 1 THEN
    IF v_reserved_by = v_current_user_id THEN
      UPDATE public.item
      SET status = 2,
          reserved_by = v_current_user_id
      WHERE id = p_item_id;
    ELSE
      RAISE EXCEPTION 'Item is reserved by another user';
    END IF;

  ELSE
    -- status = 0 -> bought by current user
    UPDATE public.item
    SET status = 2,
        reserved_by = v_current_user_id
    WHERE id = p_item_id;
  END IF;

  -- notify owner only when final status is bought (2)
  IF EXISTS (
    SELECT 1 FROM public.item i
    WHERE i.id = p_item_id
      AND i.status = 2
      AND i.reserved_by = v_current_user_id
  ) THEN
    SELECT COALESCE(us.notify_reservations, true)
    INTO v_notify
    FROM public.user_settings us
    WHERE us.user_id = v_item_owner_id;

    IF v_notify IS TRUE THEN
      SELECT COALESCE(au.raw_user_meta_data->>'full_name', au.email)
      INTO v_buyer_name
      FROM auth.users au
      WHERE au.id = v_current_user_id;

      INSERT INTO public.notifications (
        sender_id,
        receiver_id,
        text,
        icon_type
      )
      VALUES (
        v_current_user_id,
        v_item_owner_id,
        v_buyer_name || ' bought your item',
        5
      );
    END IF;
  END IF;

  SELECT jsonb_build_object(
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
    'is_reserved_by_me', i.status = 1 AND i.reserved_by = v_current_user_id,
    'is_bought_by_me', i.status = 2 AND i.reserved_by = v_current_user_id
  )
  INTO v_result
  FROM public.item i
  WHERE i.id = p_item_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."toggle_item_bought"("p_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_item_bought_secret"("p_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  v_current_user_id uuid;
  v_item_owner_id uuid;
  v_current_status smallint;
  v_reserved_by uuid;
  v_visibility_type integer;
  v_result jsonb;
  v_notify boolean;
  v_buyer_name text;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    i.status,
    i.reserved_by,
    w.user_id,
    w.visibility_type
  INTO
    v_current_status,
    v_reserved_by,
    v_item_owner_id,
    v_visibility_type
  FROM public.item i
  INNER JOIN public.wishlist w ON w.id = i.wishlist_id
  WHERE i.id = p_item_id;

  IF v_item_owner_id IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  IF v_item_owner_id = v_current_user_id THEN
    RAISE EXCEPTION 'Cannot buy your own item';
  END IF;

  IF v_visibility_type = 2 THEN
    RAISE EXCEPTION 'Cannot access private wishlist';
  END IF;

  IF v_visibility_type = 1 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.friends f
      WHERE (f.user_f = v_current_user_id AND f.user_s = v_item_owner_id)
         OR (f.user_f = v_item_owner_id AND f.user_s = v_current_user_id)
    ) THEN
      RAISE EXCEPTION 'Not friends with item owner';
    END IF;
  END IF;

  -- TOGGLE bought (status = 2)
  IF v_current_status = 2 THEN
    IF v_reserved_by = v_current_user_id THEN
      -- bought -> reserved (а не available)
      UPDATE public.item
      SET status = 1,
          reserved_by = v_current_user_id
      WHERE id = p_item_id;
    ELSE
      RAISE EXCEPTION 'Item already marked as bought by another user';
    END IF;

  ELSIF v_current_status = 1 THEN
    IF v_reserved_by = v_current_user_id THEN
      UPDATE public.item
      SET status = 2,
          reserved_by = v_current_user_id
      WHERE id = p_item_id;
    ELSE
      RAISE EXCEPTION 'Item is reserved by another user';
    END IF;

  ELSE
    -- status = 0 -> bought by current user
    UPDATE public.item
    SET status = 2,
        reserved_by = v_current_user_id
    WHERE id = p_item_id;
  END IF;

  -- notify owner only when final status is bought (2)


  SELECT jsonb_build_object(
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
    'is_reserved_by_me', i.status = 1 AND i.reserved_by = v_current_user_id,
    'is_bought_by_me', i.status = 2 AND i.reserved_by = v_current_user_id
  )
  INTO v_result
  FROM public.item i
  WHERE i.id = p_item_id;

  RETURN v_result;
END;$$;


ALTER FUNCTION "public"."toggle_item_bought_secret"("p_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_item_reservation"("p_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_current_user_id uuid;
  v_item_owner_id uuid;
  v_current_status smallint;
  v_reserved_by uuid;
  v_visibility_type integer;
  v_result jsonb;
  v_notify boolean;
  v_reserver_name text;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT 
    i.status,
    i.reserved_by,
    w.user_id,
    w.visibility_type
  INTO 
    v_current_status,
    v_reserved_by,
    v_item_owner_id,
    v_visibility_type
  FROM item i
  INNER JOIN wishlist w ON w.id = i.wishlist_id
  WHERE i.id = p_item_id;

  IF v_item_owner_id IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  IF v_item_owner_id = v_current_user_id THEN
    RAISE EXCEPTION 'Cannot reserve your own item';
  END IF;

  IF v_visibility_type = 2 THEN
    RAISE EXCEPTION 'Cannot access private wishlist';
  END IF;

  IF v_visibility_type = 1 THEN
    IF NOT EXISTS (
      SELECT 1 FROM friends
      WHERE (user_f = v_current_user_id AND user_s = v_item_owner_id)
         OR (user_f = v_item_owner_id AND user_s = v_current_user_id)
    ) THEN
      RAISE EXCEPTION 'Not friends with item owner';
    END IF;
  END IF;

  -- toggle reservation
  IF v_current_status = 1 AND v_reserved_by = v_current_user_id THEN
    UPDATE item
    SET status = 0, reserved_by = NULL
    WHERE item.id = p_item_id;

  ELSIF v_current_status = 1 THEN
    RAISE EXCEPTION 'Item already reserved by another user';

  ELSE
    UPDATE item
    SET status = 1, reserved_by = v_current_user_id
    WHERE item.id = p_item_id;

    -- перевірка налаштувань нотифікацій власника айтема
    SELECT COALESCE(notify_reservations, true)
    INTO v_notify
    FROM public.user_settings
    WHERE user_id = v_item_owner_id;

    IF v_notify IS TRUE THEN

      -- ім'я того хто зарезервував
      SELECT COALESCE(raw_user_meta_data->>'full_name', email)
      INTO v_reserver_name
      FROM auth.users
      WHERE id = v_current_user_id;

      INSERT INTO public.notifications (
        sender_id,
        receiver_id,
        text,
        icon_type
      )
      VALUES (
        v_current_user_id,
        v_item_owner_id,
        v_reserver_name || ' reserved your item',
        5
      );
    END IF;

  END IF;

  SELECT jsonb_build_object(
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
  INTO v_result
  FROM item i
  WHERE i.id = p_item_id;

  RETURN v_result;
END;$$;


ALTER FUNCTION "public"."toggle_item_reservation"("p_item_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."toggle_item_reservation"("p_item_id" "uuid") IS 'Резервує айтем якщо вільний, знімає резервацію якщо зарезервований поточним користувачем';



CREATE OR REPLACE FUNCTION "public"."toggle_item_reservation_secret"("p_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_current_user_id uuid;
  v_item_owner_id uuid;
  v_current_status smallint;
  v_reserved_by uuid;
  v_visibility_type integer;
  v_result jsonb;
  v_notify boolean;
  v_reserver_name text;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT 
    i.status,
    i.reserved_by,
    w.user_id,
    w.visibility_type
  INTO 
    v_current_status,
    v_reserved_by,
    v_item_owner_id,
    v_visibility_type
  FROM item i
  INNER JOIN wishlist w ON w.id = i.wishlist_id
  WHERE i.id = p_item_id;

  IF v_item_owner_id IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  IF v_item_owner_id = v_current_user_id THEN
    RAISE EXCEPTION 'Cannot reserve your own item';
  END IF;

  IF v_visibility_type = 2 THEN
    RAISE EXCEPTION 'Cannot access private wishlist';
  END IF;

  IF v_visibility_type = 1 THEN
    IF NOT EXISTS (
      SELECT 1 FROM friends
      WHERE (user_f = v_current_user_id AND user_s = v_item_owner_id)
         OR (user_f = v_item_owner_id AND user_s = v_current_user_id)
    ) THEN
      RAISE EXCEPTION 'Not friends with item owner';
    END IF;
  END IF;

  -- toggle reservation
  IF v_current_status = 1 AND v_reserved_by = v_current_user_id THEN
    UPDATE item
    SET status = 0, reserved_by = NULL
    WHERE item.id = p_item_id;

  ELSIF v_current_status = 1 THEN
    RAISE EXCEPTION 'Item already reserved by another user';

  ELSE
    UPDATE item
    SET status = 1, reserved_by = v_current_user_id
    WHERE item.id = p_item_id;

  END IF;

  SELECT jsonb_build_object(
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
  INTO v_result
  FROM item i
  WHERE i.id = p_item_id;

  RETURN v_result;
END;$$;


ALTER FUNCTION "public"."toggle_item_reservation_secret"("p_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."verify_wishlist_share_token"("p_token" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "id" bigint NOT NULL,
    "base_currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "target_currency" "text" NOT NULL,
    "rate" numeric(18,8) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";


ALTER TABLE "public"."exchange_rates" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."exchange_rates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."feature_idea" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "public"."feature_idea_status" DEFAULT 'pending'::"public"."feature_idea_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feature_idea_description_check" CHECK ((("char_length"("description") >= 1) AND ("char_length"("description") <= 1000))),
    CONSTRAINT "feature_idea_title_check" CHECK ((("char_length"("title") >= 1) AND ("char_length"("title") <= 120)))
);


ALTER TABLE "public"."feature_idea" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_idea_vote" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "idea_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."feature_idea_vote" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friend_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "receiver_id" "uuid" NOT NULL,
    "status" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."friend_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_f" "uuid" NOT NULL,
    "user_s" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_friends_not_same" CHECK (("user_f" <> "user_s"))
);


ALTER TABLE "public"."friends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_prices_cumulative" (
    "item_id" "uuid" NOT NULL,
    "price" "text" NOT NULL,
    "price_date" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."item_prices_cumulative" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "icon_type" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "receiver_id" "uuid" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "entity_id" "uuid",
    "type" smallint
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "nickname" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "bio" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."secret_santa_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "receiver_id" "uuid" NOT NULL,
    "status" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."secret_santa_invites" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."secret_santa_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."secret_santa_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "receiver_id" "uuid"
);

ALTER TABLE ONLY "public"."secret_santa_participants" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."secret_santa_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "user_id" "uuid" NOT NULL,
    "notify_friend_requests" boolean DEFAULT true NOT NULL,
    "notify_reservations" boolean DEFAULT true NOT NULL,
    "notify_sale_alerts" boolean DEFAULT true NOT NULL,
    "email_digest" boolean DEFAULT true NOT NULL,
    "default_accent" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "default_wishlist_color" bigint,
    "theme" "text",
    "display_currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    CONSTRAINT "user_settings_default_accent_check" CHECK ((("default_accent" >= 0) AND ("default_accent" <= 4)))
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "expires_at" timestamp with time zone,
    "revenuecat_customer_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paddle_subscription_id" "text",
    "paddle_customer_id" "text",
    CONSTRAINT "check_plan" CHECK (("plan" = ANY (ARRAY['free'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_subscriptions" IS 'Зберігає інформацію про підписки користувачів';



CREATE TABLE IF NOT EXISTS "public"."wishlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "visibility_type" integer DEFAULT 2 NOT NULL,
    "accent_type" integer DEFAULT 0 NOT NULL,
    "event_date" "date",
    CONSTRAINT "check_accent_type" CHECK ((("accent_type" >= 0) AND ("accent_type" <= 4))),
    CONSTRAINT "check_visibility_type" CHECK ((("visibility_type" >= 0) AND ("visibility_type" <= 2)))
);


ALTER TABLE "public"."wishlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlist_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wishlist_id" "uuid" NOT NULL,
    "granted_to_user_id" "uuid" NOT NULL,
    "granted_by_user_id" "uuid" NOT NULL,
    "access_type" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_access_type" CHECK (("access_type" = ANY (ARRAY[0, 1])))
);


ALTER TABLE "public"."wishlist_access" OWNER TO "postgres";


ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_base_currency_target_currency_key" UNIQUE ("base_currency", "target_currency");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_idea"
    ADD CONSTRAINT "feature_idea_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_idea_vote"
    ADD CONSTRAINT "feature_idea_vote_idea_id_user_id_key" UNIQUE ("idea_id", "user_id");



ALTER TABLE ONLY "public"."feature_idea_vote"
    ADD CONSTRAINT "feature_idea_vote_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item"
    ADD CONSTRAINT "item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_prices_cumulative"
    ADD CONSTRAINT "item_prices_cumulative_pkey" PRIMARY KEY ("item_id", "price_date");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_nickname_unique" UNIQUE ("nickname");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."secret_santa_invites"
    ADD CONSTRAINT "secret_santa_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."secret_santa_participants"
    ADD CONSTRAINT "secret_santa_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."secret_santa"
    ADD CONSTRAINT "secret_santa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "unique_user_subscription" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "uq_friend_request" UNIQUE ("sender_id", "receiver_id");



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "uq_friends_pair" UNIQUE ("user_f", "user_s");



ALTER TABLE ONLY "public"."wishlist_access"
    ADD CONSTRAINT "uq_wishlist_access_unique" UNIQUE ("wishlist_id", "granted_to_user_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlist_access"
    ADD CONSTRAINT "wishlist_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_feature_idea_status" ON "public"."feature_idea" USING "btree" ("status");



CREATE INDEX "idx_feature_idea_user_id" ON "public"."feature_idea" USING "btree" ("user_id");



CREATE INDEX "idx_feature_idea_vote_idea" ON "public"."feature_idea_vote" USING "btree" ("idea_id");



CREATE INDEX "idx_feature_idea_vote_user" ON "public"."feature_idea_vote" USING "btree" ("user_id");



CREATE INDEX "idx_friend_requests_receiver" ON "public"."friend_requests" USING "btree" ("receiver_id");



CREATE INDEX "idx_friend_requests_sender" ON "public"."friend_requests" USING "btree" ("sender_id");



CREATE INDEX "idx_friends_user_f" ON "public"."friends" USING "btree" ("user_f");



CREATE INDEX "idx_friends_user_s" ON "public"."friends" USING "btree" ("user_s");



CREATE INDEX "idx_item_prices_date" ON "public"."item_prices_cumulative" USING "btree" ("price_date");



CREATE INDEX "idx_item_prices_item_id" ON "public"."item_prices_cumulative" USING "btree" ("item_id");



CREATE INDEX "idx_item_reserved_by" ON "public"."item" USING "btree" ("reserved_by");



CREATE INDEX "idx_item_wishlist_id" ON "public"."item" USING "btree" ("wishlist_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_receiver_id" ON "public"."notifications" USING "btree" ("receiver_id");



CREATE INDEX "idx_notifications_receiver_unread" ON "public"."notifications" USING "btree" ("receiver_id", "is_read");



CREATE INDEX "idx_notifications_sender_id" ON "public"."notifications" USING "btree" ("sender_id");



CREATE INDEX "idx_profiles_display_name" ON "public"."profiles" USING "btree" ("display_name");



CREATE INDEX "idx_profiles_nickname" ON "public"."profiles" USING "btree" ("nickname");



CREATE INDEX "idx_profiles_nickname_trgm" ON "public"."profiles" USING "gin" ("nickname" "public"."gin_trgm_ops");



CREATE INDEX "idx_user_subscriptions_revenuecat_id" ON "public"."user_subscriptions" USING "btree" ("revenuecat_customer_id");



CREATE INDEX "idx_user_subscriptions_user_id" ON "public"."user_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_wishlist_access_granted_to_user_id" ON "public"."wishlist_access" USING "btree" ("granted_to_user_id");



CREATE INDEX "idx_wishlist_access_lookup" ON "public"."wishlist_access" USING "btree" ("granted_to_user_id", "access_type", "wishlist_id");



CREATE INDEX "idx_wishlist_access_wishlist_id" ON "public"."wishlist_access" USING "btree" ("wishlist_id");



CREATE INDEX "idx_wishlist_user_id" ON "public"."wishlist" USING "btree" ("user_id");



CREATE UNIQUE INDEX "secret_santa_invites_event_receiver_unique" ON "public"."secret_santa_invites" USING "btree" ("event_id", "receiver_id");



CREATE UNIQUE INDEX "secret_santa_participants_event_user_unique" ON "public"."secret_santa_participants" USING "btree" ("event_id", "user_id");



CREATE OR REPLACE TRIGGER "trigger_friend_request_notification" AFTER INSERT ON "public"."friend_requests" FOR EACH ROW EXECUTE FUNCTION "public"."create_friend_request_notification"();



CREATE OR REPLACE TRIGGER "update_user_subscriptions_updated_at" BEFORE UPDATE ON "public"."user_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."feature_idea"
    ADD CONSTRAINT "feature_idea_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_idea_vote"
    ADD CONSTRAINT "feature_idea_vote_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "public"."feature_idea"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_idea_vote"
    ADD CONSTRAINT "feature_idea_vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "fk_friend_request_receiver" FOREIGN KEY ("receiver_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "fk_friend_request_sender" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "fk_friends_user_f" FOREIGN KEY ("user_f") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "fk_friends_user_s" FOREIGN KEY ("user_s") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_prices_cumulative"
    ADD CONSTRAINT "fk_item_prices_item" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item"
    ADD CONSTRAINT "fk_item_reserved_by" FOREIGN KEY ("reserved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."item"
    ADD CONSTRAINT "fk_item_wishlist" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlist"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "fk_notifications_receiver" FOREIGN KEY ("receiver_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "fk_notifications_sender" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."secret_santa"
    ADD CONSTRAINT "fk_secret_santa_owner" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."wishlist_access"
    ADD CONSTRAINT "fk_wishlist_access_granted_by" FOREIGN KEY ("granted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist_access"
    ADD CONSTRAINT "fk_wishlist_access_granted_to" FOREIGN KEY ("granted_to_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist_access"
    ADD CONSTRAINT "fk_wishlist_access_wishlist" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlist"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "fk_wishlist_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."secret_santa_participants"
    ADD CONSTRAINT "ss_event_fk" FOREIGN KEY ("event_id") REFERENCES "public"."secret_santa"("id");



ALTER TABLE ONLY "public"."secret_santa_invites"
    ADD CONSTRAINT "ss_invites_event_fk" FOREIGN KEY ("event_id") REFERENCES "public"."secret_santa"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."secret_santa_invites"
    ADD CONSTRAINT "ss_invites_receiver_fk" FOREIGN KEY ("receiver_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."secret_santa_invites"
    ADD CONSTRAINT "ss_invites_sender_fk" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."secret_santa_participants"
    ADD CONSTRAINT "ss_partisipant_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."secret_santa_participants"
    ADD CONSTRAINT "ss_receiver_fk" FOREIGN KEY ("receiver_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public delete" ON "public"."item_prices_cumulative" FOR DELETE TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public insert" ON "public"."item_prices_cumulative" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Allow public select" ON "public"."item_prices_cumulative" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public update" ON "public"."item_prices_cumulative" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can read non-pending ideas" ON "public"."feature_idea" FOR SELECT USING (("status" <> 'pending'::"public"."feature_idea_status"));



CREATE POLICY "Anyone can read votes" ON "public"."feature_idea_vote" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can create ideas" ON "public"."feature_idea" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"public"."feature_idea_status")));



CREATE POLICY "Authenticated users can read exchange rates" ON "public"."exchange_rates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Friend requests: delete own" ON "public"."friend_requests" FOR DELETE USING ((("sender_id" = "auth"."uid"()) OR ("receiver_id" = "auth"."uid"())));



CREATE POLICY "Friend requests: select own" ON "public"."friend_requests" FOR SELECT USING ((("sender_id" = "auth"."uid"()) OR ("receiver_id" = "auth"."uid"())));



CREATE POLICY "Friend requests: send" ON "public"."friend_requests" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND ("sender_id" <> "receiver_id")));



CREATE POLICY "Friend requests: update by receiver" ON "public"."friend_requests" FOR UPDATE USING (("receiver_id" = "auth"."uid"()));



CREATE POLICY "Friends: delete own" ON "public"."friends" FOR DELETE USING ((("user_f" = "auth"."uid"()) OR ("user_s" = "auth"."uid"())));



CREATE POLICY "Friends: select own" ON "public"."friends" FOR SELECT USING ((("user_f" = "auth"."uid"()) OR ("user_s" = "auth"."uid"())));



CREATE POLICY "Item: select if wishlist accessible" ON "public"."item" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."wishlist" "w"
  WHERE (("w"."id" = "item"."wishlist_id") AND (("w"."user_id" = "auth"."uid"()) OR ("w"."visibility_type" = 0) OR (("w"."visibility_type" = 1) AND (EXISTS ( SELECT 1
           FROM "public"."friends" "f"
          WHERE ((("f"."user_f" = "auth"."uid"()) AND ("f"."user_s" = "w"."user_id")) OR (("f"."user_s" = "auth"."uid"()) AND ("f"."user_f" = "w"."user_id")))))))))));



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Receivers can delete their notifications" ON "public"."notifications" FOR DELETE USING (("receiver_id" = "auth"."uid"()));



CREATE POLICY "Receivers can update their notifications" ON "public"."notifications" FOR UPDATE USING (("receiver_id" = "auth"."uid"())) WITH CHECK (("receiver_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own vote" ON "public"."feature_idea_vote" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own vote" ON "public"."feature_idea_vote" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."feature_idea"
  WHERE (("feature_idea"."id" = "feature_idea_vote"."idea_id") AND ("feature_idea"."status" <> 'pending'::"public"."feature_idea_status"))))));



CREATE POLICY "Users can read own ideas" ON "public"."feature_idea" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can reserve friends items" ON "public"."item" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."wishlist" "w"
  WHERE (("w"."id" = "item"."wishlist_id") AND (("w"."user_id" = "auth"."uid"()) OR (("w"."visibility_type" = ANY (ARRAY[0, 1])) AND (EXISTS ( SELECT 1
           FROM "public"."friends" "f"
          WHERE ((("f"."user_f" = "auth"."uid"()) AND ("f"."user_s" = "w"."user_id")) OR (("f"."user_s" = "auth"."uid"()) AND ("f"."user_f" = "w"."user_id"))))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."wishlist" "w"
  WHERE (("w"."id" = "item"."wishlist_id") AND (("w"."user_id" = "auth"."uid"()) OR (("w"."visibility_type" = ANY (ARRAY[0, 1])) AND (EXISTS ( SELECT 1
           FROM "public"."friends" "f"
          WHERE ((("f"."user_f" = "auth"."uid"()) AND ("f"."user_s" = "w"."user_id")) OR (("f"."user_s" = "auth"."uid"()) AND ("f"."user_f" = "w"."user_id")))))))))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own subscription" ON "public"."user_subscriptions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own subscription" ON "public"."user_subscriptions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their notifications" ON "public"."notifications" FOR SELECT USING ((("sender_id" = "auth"."uid"()) OR ("receiver_id" = "auth"."uid"())));



CREATE POLICY "Wishlist owner can delete items" ON "public"."item" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."wishlist"
  WHERE (("wishlist"."id" = "item"."wishlist_id") AND ("wishlist"."user_id" = "auth"."uid"())))));



CREATE POLICY "Wishlist: delete own" ON "public"."wishlist" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Wishlist: insert own" ON "public"."wishlist" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Wishlist: update own" ON "public"."wishlist" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "authenticated users can insert own secret_santa" ON "public"."secret_santa" FOR INSERT TO "authenticated" WITH CHECK (("owner_id" = "auth"."uid"()));



ALTER TABLE "public"."exchange_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_idea" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_idea_vote" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friend_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friends" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "item_insert_by_wishlist_owner_or_access" ON "public"."item" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."wishlist" "w"
  WHERE (("w"."id" = "item"."wishlist_id") AND ("w"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."wishlist_access" "wa"
  WHERE (("wa"."wishlist_id" = "item"."wishlist_id") AND ("wa"."granted_to_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."item_prices_cumulative" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owners can delete own secret_santa" ON "public"."secret_santa" FOR DELETE TO "authenticated" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "owners can select own secret_santa" ON "public"."secret_santa" FOR SELECT TO "authenticated" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "owners can update own secret_santa" ON "public"."secret_santa" FOR UPDATE TO "authenticated" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."secret_santa" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."secret_santa_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."secret_santa_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "secret_santa_select_owner_or_participant" ON "public"."secret_santa" FOR SELECT TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."secret_santa_participants" "ssp"
  WHERE (("ssp"."event_id" = "secret_santa"."id") AND ("ssp"."user_id" = "auth"."uid"()))))));



CREATE POLICY "ss_invites_delete_owner_or_receiver" ON "public"."secret_santa_invites" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND (("receiver_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."secret_santa" "ss"
  WHERE (("ss"."id" = "secret_santa_invites"."event_id") AND ("ss"."owner_id" = "auth"."uid"())))))));



CREATE POLICY "ss_invites_insert_owner_only" ON "public"."secret_santa_invites" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."secret_santa" "ss"
  WHERE (("ss"."id" = "secret_santa_invites"."event_id") AND ("ss"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "ss_invites_select_owner_or_receiver" ON "public"."secret_santa_invites" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (("receiver_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."secret_santa" "ss"
  WHERE (("ss"."id" = "secret_santa_invites"."event_id") AND ("ss"."owner_id" = "auth"."uid"())))))));



CREATE POLICY "ss_invites_update_owner_or_receiver" ON "public"."secret_santa_invites" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND (("receiver_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."secret_santa" "ss"
  WHERE (("ss"."id" = "secret_santa_invites"."event_id") AND ("ss"."owner_id" = "auth"."uid"()))))))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (("receiver_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."secret_santa" "ss"
  WHERE (("ss"."id" = "secret_santa_invites"."event_id") AND ("ss"."owner_id" = "auth"."uid"())))))));



CREATE POLICY "ss_participants_delete_owner_only" ON "public"."secret_santa_participants" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."secret_santa" "ss"
  WHERE (("ss"."id" = "secret_santa_participants"."event_id") AND ("ss"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "ss_participants_insert_owner_only" ON "public"."secret_santa_participants" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."secret_santa" "ss"
  WHERE (("ss"."id" = "secret_santa_participants"."event_id") AND ("ss"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "ss_participants_select_all_authenticated" ON "public"."secret_santa_participants" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "ss_participants_update_owner_only" ON "public"."secret_santa_participants" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."secret_santa" "ss"
  WHERE (("ss"."id" = "secret_santa_participants"."event_id") AND ("ss"."owner_id" = "auth"."uid"())))))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."secret_santa" "ss"
  WHERE (("ss"."id" = "secret_santa_participants"."event_id") AND ("ss"."owner_id" = "auth"."uid"()))))));



ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_settings insert own" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_settings select own" ON "public"."user_settings" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_settings update own" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wishlist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wishlist_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wishlist_access_delete_owner_only" ON "public"."wishlist_access" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."wishlist" "w"
  WHERE (("w"."id" = "wishlist_access"."wishlist_id") AND ("w"."user_id" = "auth"."uid"()))))));



CREATE POLICY "wishlist_access_insert_owner_only" ON "public"."wishlist_access" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."wishlist" "w"
  WHERE (("w"."id" = "wishlist_access"."wishlist_id") AND ("w"."user_id" = "auth"."uid"()))))));



CREATE POLICY "wishlist_access_select_all_authenticated" ON "public"."wishlist_access" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "wishlist_access_update_owner_only" ON "public"."wishlist_access" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."wishlist" "w"
  WHERE (("w"."id" = "wishlist_access"."wishlist_id") AND ("w"."user_id" = "auth"."uid"())))))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."wishlist" "w"
  WHERE (("w"."id" = "wishlist_access"."wishlist_id") AND ("w"."user_id" = "auth"."uid"()))))));



CREATE POLICY "wishlist_select_accessible_v2" ON "public"."wishlist" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("visibility_type" = 0) OR (("visibility_type" = 1) AND (EXISTS ( SELECT 1
   FROM "public"."friends" "f"
  WHERE ((("f"."user_f" = "auth"."uid"()) AND ("f"."user_s" = "wishlist"."user_id")) OR (("f"."user_s" = "auth"."uid"()) AND ("f"."user_f" = "wishlist"."user_id")))))) OR (EXISTS ( SELECT 1
   FROM "public"."wishlist_access" "wa"
  WHERE (("wa"."wishlist_id" = "wishlist"."id") AND ("wa"."granted_to_user_id" = "auth"."uid"()))))));



CREATE POLICY "wishlist_update_editable" ON "public"."wishlist" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."wishlist_access" "wa"
  WHERE (("wa"."wishlist_id" = "wishlist"."id") AND ("wa"."granted_to_user_id" = "auth"."uid"()) AND ("wa"."access_type" = 1))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."accept_friend_request"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_friend_request"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_friend_request"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_secret_santa_invite"("p_invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_secret_santa_invite"("p_invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_secret_santa_invite"("p_invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."base64url_decode"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."base64url_decode"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."base64url_decode"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."base64url_encode"("data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."base64url_encode"("data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."base64url_encode"("data" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_upcoming_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_upcoming_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_upcoming_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_friend_request_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_friend_request_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_friend_request_notification"() TO "service_role";



GRANT ALL ON TABLE "public"."secret_santa" TO "anon";
GRANT ALL ON TABLE "public"."secret_santa" TO "authenticated";
GRANT ALL ON TABLE "public"."secret_santa" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_secret_santa_event"("p_name" "text", "p_event_date" "date", "p_budget" integer, "p_image_url" "text", "p_invited_user_ids" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_secret_santa_event"("p_name" "text", "p_event_date" "date", "p_budget" integer, "p_image_url" "text", "p_invited_user_ids" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_secret_santa_event"("p_name" "text", "p_event_date" "date", "p_budget" integer, "p_image_url" "text", "p_invited_user_ids" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_secret_santa_event"("p_name" "text", "p_event_date" timestamp with time zone, "p_budget" numeric, "p_image_url" "text", "p_invited_user_ids" "jsonb", "p_currency" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_secret_santa_event"("p_name" "text", "p_event_date" timestamp with time zone, "p_budget" numeric, "p_image_url" "text", "p_invited_user_ids" "jsonb", "p_currency" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_secret_santa_event"("p_name" "text", "p_event_date" timestamp with time zone, "p_budget" numeric, "p_image_url" "text", "p_invited_user_ids" "jsonb", "p_currency" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_wishlist_share_token"("p_wishlist_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_wishlist_share_token"("p_wishlist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_wishlist_share_token"("p_wishlist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_wishlist_share_token"("p_wishlist_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decline_secret_santa_invite"("p_invite_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decline_secret_santa_invite"("p_invite_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decline_secret_santa_invite"("p_invite_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_secret_santa_event"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_secret_santa_event"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_secret_santa_event"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_friends"("p_skip" integer, "p_take" integer, "p_user_id" "uuid", "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_friends"("p_skip" integer, "p_take" integer, "p_user_id" "uuid", "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friends"("p_skip" integer, "p_take" integer, "p_user_id" "uuid", "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_friends_upcoming_wishlists"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_friends_upcoming_wishlists"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friends_upcoming_wishlists"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_friends_wishlists_discover"("p_skip" integer, "p_take" integer, "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_friends_wishlists_discover"("p_skip" integer, "p_take" integer, "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friends_wishlists_discover"("p_skip" integer, "p_take" integer, "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_friends_wishlists_discover_all"("p_skip" integer, "p_take" integer, "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_friends_wishlists_discover_all"("p_skip" integer, "p_take" integer, "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friends_wishlists_discover_all"("p_skip" integer, "p_take" integer, "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_friends_with_details"("p_skip" integer, "p_take" integer, "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_friends_with_details"("p_skip" integer, "p_take" integer, "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friends_with_details"("p_skip" integer, "p_take" integer, "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_friends_without_wishlist_access"("p_wishlist_id" "uuid", "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_friends_without_wishlist_access"("p_wishlist_id" "uuid", "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friends_without_wishlist_access"("p_wishlist_id" "uuid", "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_friends_without_wishlist_access"("p_wishlist_id" "uuid", "p_search" "text", "p_skip" integer, "p_take" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_friends_without_wishlist_access"("p_wishlist_id" "uuid", "p_search" "text", "p_skip" integer, "p_take" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friends_without_wishlist_access"("p_wishlist_id" "uuid", "p_search" "text", "p_skip" integer, "p_take" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_incoming_friend_requests_with_details"("p_user_id" "uuid", "p_skip" integer, "p_take" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_incoming_friend_requests_with_details"("p_user_id" "uuid", "p_skip" integer, "p_take" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_incoming_friend_requests_with_details"("p_user_id" "uuid", "p_skip" integer, "p_take" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_bought_items"("p_skip" integer, "p_take" integer, "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_bought_items"("p_skip" integer, "p_take" integer, "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_bought_items"("p_skip" integer, "p_take" integer, "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_wishlists"("p_skip" integer, "p_take" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_wishlists"("p_skip" integer, "p_take" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_wishlists"("p_skip" integer, "p_take" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_wishlists_feed"("p_skip" integer, "p_take" integer, "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_wishlists_feed"("p_skip" integer, "p_take" integer, "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_wishlists_feed"("p_skip" integer, "p_take" integer, "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_outgoing_friend_requests_with_details"("p_user_id" "uuid", "p_skip" integer, "p_take" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_outgoing_friend_requests_with_details"("p_user_id" "uuid", "p_skip" integer, "p_take" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_outgoing_friend_requests_with_details"("p_user_id" "uuid", "p_skip" integer, "p_take" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_reserved_items_by_me"("p_skip" integer, "p_take" integer, "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_reserved_items_by_me"("p_skip" integer, "p_take" integer, "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reserved_items_by_me"("p_skip" integer, "p_take" integer, "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_reserved_wishlists_by_me"("p_skip" integer, "p_take" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_reserved_wishlists_by_me"("p_skip" integer, "p_take" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reserved_wishlists_by_me"("p_skip" integer, "p_take" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_secret_santa_details"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_secret_santa_details"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_secret_santa_details"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notifications_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notifications_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notifications_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_unread_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_unread_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_user_id" "uuid", "p_limit" integer, "p_offset" integer, "p_unread_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_visible_items_by_max_price"("p_user_id" "uuid", "p_max_price" numeric, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_visible_items_by_max_price"("p_user_id" "uuid", "p_max_price" numeric, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_visible_items_by_max_price"("p_user_id" "uuid", "p_max_price" numeric, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_wishlist_access_list"("p_wishlist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_wishlist_access_list"("p_wishlist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_wishlist_access_list"("p_wishlist_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_wishlist_by_id"("p_wishlist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_wishlist_by_id"("p_wishlist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_wishlist_by_id"("p_wishlist_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_wishlist_by_share_token"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_wishlist_by_share_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_wishlist_by_share_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_wishlist_by_share_token"("p_token" "text") TO "service_role";



GRANT ALL ON TABLE "public"."item" TO "anon";
GRANT ALL ON TABLE "public"."item" TO "authenticated";
GRANT ALL ON TABLE "public"."item" TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_wishlist_items_by_share_token"("p_token" "text", "p_skip" integer, "p_take" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_wishlist_items_by_share_token"("p_token" "text", "p_skip" integer, "p_take" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_wishlist_items_by_share_token"("p_token" "text", "p_skip" integer, "p_take" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_wishlist_items_by_share_token"("p_token" "text", "p_skip" integer, "p_take" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_wishlist_token_secret"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_wishlist_token_secret"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_wishlist_token_secret"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_wishlist_access"("p_wishlist_id" "uuid", "p_granted_to_user_id" "uuid", "p_access_type" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."grant_wishlist_access"("p_wishlist_id" "uuid", "p_granted_to_user_id" "uuid", "p_access_type" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_wishlist_access"("p_wishlist_id" "uuid", "p_granted_to_user_id" "uuid", "p_access_type" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_email_password_user"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_email_password_user"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_email_password_user"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_secret_santa_events"("p_search" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."list_secret_santa_events"("p_search" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_secret_santa_events"("p_search" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_friends_about_new_wishlist"("p_wishlist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."notify_friends_about_new_wishlist"("p_wishlist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_friends_about_new_wishlist"("p_wishlist_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_friends_about_upcoming_event"("p_wishlist_id" "uuid", "p_notification_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."notify_friends_about_upcoming_event"("p_wishlist_id" "uuid", "p_notification_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_friends_about_upcoming_event"("p_wishlist_id" "uuid", "p_notification_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_friend_request"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_friend_request"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_friend_request"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_wishlist_access"("p_wishlist_id" "uuid", "p_target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_wishlist_access"("p_wishlist_id" "uuid", "p_target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_wishlist_access"("p_wishlist_id" "uuid", "p_target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_profiles_by_nickname"("p_query" "text", "p_skip" integer, "p_take" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_profiles_by_nickname"("p_query" "text", "p_skip" integer, "p_take" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_profiles_by_nickname"("p_query" "text", "p_skip" integer, "p_take" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_item_bought"("p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_item_bought"("p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_item_bought"("p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_item_bought_secret"("p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_item_bought_secret"("p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_item_bought_secret"("p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_item_reservation"("p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_item_reservation"("p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_item_reservation"("p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_item_reservation_secret"("p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_item_reservation_secret"("p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_item_reservation_secret"("p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."verify_wishlist_share_token"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."verify_wishlist_share_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_wishlist_share_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_wishlist_share_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";
























GRANT ALL ON TABLE "public"."exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."exchange_rates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."exchange_rates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."exchange_rates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."feature_idea" TO "anon";
GRANT ALL ON TABLE "public"."feature_idea" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_idea" TO "service_role";



GRANT ALL ON TABLE "public"."feature_idea_vote" TO "anon";
GRANT ALL ON TABLE "public"."feature_idea_vote" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_idea_vote" TO "service_role";



GRANT ALL ON TABLE "public"."friend_requests" TO "anon";
GRANT ALL ON TABLE "public"."friend_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."friend_requests" TO "service_role";



GRANT ALL ON TABLE "public"."friends" TO "anon";
GRANT ALL ON TABLE "public"."friends" TO "authenticated";
GRANT ALL ON TABLE "public"."friends" TO "service_role";



GRANT ALL ON TABLE "public"."item_prices_cumulative" TO "anon";
GRANT ALL ON TABLE "public"."item_prices_cumulative" TO "authenticated";
GRANT ALL ON TABLE "public"."item_prices_cumulative" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."secret_santa_invites" TO "anon";
GRANT ALL ON TABLE "public"."secret_santa_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."secret_santa_invites" TO "service_role";



GRANT ALL ON TABLE "public"."secret_santa_participants" TO "anon";
GRANT ALL ON TABLE "public"."secret_santa_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."secret_santa_participants" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."wishlist" TO "anon";
GRANT ALL ON TABLE "public"."wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist" TO "service_role";



GRANT ALL ON TABLE "public"."wishlist_access" TO "anon";
GRANT ALL ON TABLE "public"."wishlist_access" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist_access" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop policy "Allow public delete" on "public"."item_prices_cumulative";

drop policy "Allow public insert" on "public"."item_prices_cumulative";

drop policy "Allow public select" on "public"."item_prices_cumulative";

drop policy "Allow public update" on "public"."item_prices_cumulative";


  create policy "Allow public delete"
  on "public"."item_prices_cumulative"
  as permissive
  for delete
  to anon, authenticated
using (true);



  create policy "Allow public insert"
  on "public"."item_prices_cumulative"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "Allow public select"
  on "public"."item_prices_cumulative"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Allow public update"
  on "public"."item_prices_cumulative"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_subscription AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

CREATE TRIGGER trg_handle_new_user_settings AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();


  create policy "Anyone can view avatars"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Anyone can view images"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'items'::text));



  create policy "Users can delete their own avatars"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can delete their own images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'items'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload their own avatars"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload their own images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'items'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



