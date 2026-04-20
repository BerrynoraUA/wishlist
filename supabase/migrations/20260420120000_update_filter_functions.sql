-- Migration: Update functions with filter/sort/currency support
-- Drops old overloads (different parameter signatures) and recreates with new parameters.

-- Drop old overloads that have fewer parameters (different signatures = separate functions in PG)
DROP FUNCTION IF EXISTS public.get_friends_wishlists_discover(integer, integer, text);
DROP FUNCTION IF EXISTS public.get_friends_wishlists_discover_all(integer, integer, text);
DROP FUNCTION IF EXISTS public.get_reserved_items_by_me(integer, integer, text);
DROP FUNCTION IF EXISTS public.get_my_bought_items(integer, integer, text);

CREATE OR REPLACE FUNCTION public.get_friends_wishlists_discover(p_skip integer DEFAULT 0, p_take integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort text DEFAULT 'default'::text, p_priorities integer[] DEFAULT NULL::integer[], p_price_min numeric DEFAULT NULL::numeric, p_price_max numeric DEFAULT NULL::numeric, p_display_currency text DEFAULT 'USD'::text)
 RETURNS TABLE(id uuid, owner text, username text, avatar_url text, wishlist text, wishlist_id uuid, friend_id uuid, items jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_user_id uuid;
  v_search text;
  v_display_rate numeric;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_search := NULLIF(btrim(p_search), '');

  -- Get exchange rate for the user's display currency
  SELECT COALESCE(er.rate, 1) INTO v_display_rate
  FROM public.exchange_rates er
  WHERE er.base_currency = 'USD'
    AND er.target_currency = UPPER(COALESCE(p_display_currency, 'USD'))
  LIMIT 1;
  IF v_display_rate IS NULL THEN v_display_rate := 1; END IF;

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
    LEFT JOIN public.exchange_rates er_item
      ON er_item.base_currency = 'USD'
      AND er_item.target_currency = UPPER(COALESCE(i.currency, 'USD'))
    WHERE i.status = 0
      AND (p_priorities IS NULL OR i.priority = ANY(p_priorities))
      AND (
        p_price_min IS NULL
        OR (
          i.price IS NOT NULL
          AND i.price ~ '^[0-9]+\.?[0-9]*$'
          AND i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate >= p_price_min
        )
      )
      AND (
        p_price_max IS NULL
        OR (
          i.price IS NOT NULL
          AND i.price ~ '^[0-9]+\.?[0-9]*$'
          AND i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate <= p_price_max
        )
      )
    GROUP BY i.wishlist_id
  )
  SELECT
    w.id,
    COALESCE(p.display_name, p.nickname, 'Unknown User') AS owner,
    COALESCE(p.nickname, '') AS username,
    COALESCE(p.avatar_url, '') AS avatar_url,
    w.title AS wishlist,
    w.id AS wishlist_id,
    uf.friend_id,
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
  ORDER BY
    CASE p_sort
      WHEN 'owner-asc'  THEN COALESCE(p.display_name, p.nickname, '')
      ELSE NULL
    END ASC NULLS LAST,
    CASE p_sort
      WHEN 'owner-desc' THEN COALESCE(p.display_name, p.nickname, '')
      ELSE NULL
    END DESC NULLS LAST,
    CASE WHEN p_sort NOT IN ('owner-asc', 'owner-desc') THEN w.created_at ELSE NULL END DESC NULLS LAST
  OFFSET p_skip
  LIMIT p_take;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.get_friends_wishlists_discover_all(p_skip integer DEFAULT 0, p_take integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort text DEFAULT 'default'::text, p_priorities integer[] DEFAULT NULL::integer[], p_price_min numeric DEFAULT NULL::numeric, p_price_max numeric DEFAULT NULL::numeric, p_display_currency text DEFAULT 'USD'::text)
 RETURNS TABLE(id uuid, owner text, username text, avatar_url text, wishlist text, wishlist_id uuid, friend_id uuid, items jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_user_id uuid;
  v_search text;
  v_display_rate numeric;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_search := NULLIF(btrim(p_search), '');

  SELECT COALESCE(er.rate, 1) INTO v_display_rate
  FROM public.exchange_rates er
  WHERE er.base_currency = 'USD'
    AND er.target_currency = UPPER(COALESCE(p_display_currency, 'USD'))
  LIMIT 1;
  IF v_display_rate IS NULL THEN v_display_rate := 1; END IF;

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
    LEFT JOIN public.exchange_rates er_item
      ON er_item.base_currency = 'USD'
      AND er_item.target_currency = UPPER(COALESCE(i.currency, 'USD'))
    WHERE (p_priorities IS NULL OR i.priority = ANY(p_priorities))
      AND (
        p_price_min IS NULL
        OR (
          i.price IS NOT NULL
          AND i.price ~ '^[0-9]+\.?[0-9]*$'
          AND i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate >= p_price_min
        )
      )
      AND (
        p_price_max IS NULL
        OR (
          i.price IS NOT NULL
          AND i.price ~ '^[0-9]+\.?[0-9]*$'
          AND i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate <= p_price_max
        )
      )
    GROUP BY i.wishlist_id
  )
  SELECT
    w.id,
    COALESCE(p.display_name, p.nickname, 'Unknown User') AS owner,
    COALESCE(p.nickname, '') AS username,
    COALESCE(p.avatar_url, '') AS avatar_url,
    w.title AS wishlist,
    w.id AS wishlist_id,
    uf.friend_id,
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
  ORDER BY
    CASE p_sort
      WHEN 'owner-asc'  THEN COALESCE(p.display_name, p.nickname, '')
      ELSE NULL
    END ASC NULLS LAST,
    CASE p_sort
      WHEN 'owner-desc' THEN COALESCE(p.display_name, p.nickname, '')
      ELSE NULL
    END DESC NULLS LAST,
    CASE WHEN p_sort NOT IN ('owner-asc', 'owner-desc') THEN w.created_at ELSE NULL END DESC NULLS LAST
  OFFSET p_skip
  LIMIT p_take;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.get_my_bought_items(p_skip integer DEFAULT 0, p_take integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort text DEFAULT 'default'::text, p_priorities integer[] DEFAULT NULL::integer[], p_price_min numeric DEFAULT NULL::numeric, p_price_max numeric DEFAULT NULL::numeric, p_display_currency text DEFAULT 'USD'::text)
 RETURNS TABLE(item_id uuid, title text, price numeric, discount_price numeric, url text, store text, image text, priority integer, status integer, wishlist_id uuid, wishlist_title text, owner_id uuid, owner_name text, owner_username text, owner_avatar text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_user_id uuid;
  v_search text;
  v_display_rate numeric;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_search := NULLIF(btrim(p_search), '');

  SELECT COALESCE(er.rate, 1) INTO v_display_rate
  FROM public.exchange_rates er
  WHERE er.base_currency = 'USD'
    AND er.target_currency = UPPER(COALESCE(p_display_currency, 'USD'))
  LIMIT 1;
  IF v_display_rate IS NULL THEN v_display_rate := 1; END IF;

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
  LEFT JOIN public.exchange_rates er_item
    ON er_item.base_currency = 'USD'
    AND er_item.target_currency = UPPER(COALESCE(i.currency, 'USD'))
  WHERE i.status = 2
    AND i.reserved_by = v_current_user_id
    AND w.visibility_type IN (0, 1)
    AND (p_priorities IS NULL OR i.priority = ANY(p_priorities))
    AND (
      p_price_min IS NULL
      OR (
        i.price IS NOT NULL
        AND i.price ~ '^[0-9]+\.?[0-9]*$'
        AND i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate >= p_price_min
      )
    )
    AND (
      p_price_max IS NULL
      OR (
        i.price IS NOT NULL
        AND i.price ~ '^[0-9]+\.?[0-9]*$'
        AND i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate <= p_price_max
      )
    )
    AND (
      v_search IS NULL
      OR i.name ILIKE '%' || v_search || '%'
      OR w.title ILIKE '%' || v_search || '%'
      OR p.nickname ILIKE '%' || v_search || '%'
      OR p.display_name ILIKE '%' || v_search || '%'
    )
  ORDER BY
    CASE p_sort
      WHEN 'price-high' THEN -(
        CASE WHEN i.price IS NOT NULL AND i.price ~ '^[0-9]+\.?[0-9]*$'
             THEN i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate ELSE 0 END
      )
      WHEN 'price-low' THEN
        CASE WHEN i.price IS NOT NULL AND i.price ~ '^[0-9]+\.?[0-9]*$'
             THEN i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate ELSE 0 END
      WHEN 'priority-high' THEN -COALESCE(i.priority, 0)::numeric
      WHEN 'priority-low'  THEN COALESCE(i.priority, 0)::numeric
      ELSE NULL
    END NULLS LAST,
    CASE p_sort
      WHEN 'owner-asc'  THEN COALESCE(p.display_name, p.nickname, '')
      WHEN 'owner-desc' THEN COALESCE(p.display_name, p.nickname, '')
      ELSE NULL
    END COLLATE "C",
    CASE WHEN p_sort = 'owner-desc' THEN 1 ELSE 0 END DESC,
    i.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.get_my_wishlists_feed(p_skip integer DEFAULT 0, p_take integer DEFAULT 10, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, user_id uuid, title text, description text, image_url text, created_at timestamp with time zone, visibility_type integer, accent_type integer, event_date date, items_count bigint, can_edit boolean, is_owner boolean, access_type integer, owner_nickname text)
 LANGUAGE sql
 STABLE
AS $function$with accessible_wishlists as (
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
  order by pw.created_at desc;$function$

;

CREATE OR REPLACE FUNCTION public.get_my_wishlists_feed(p_skip integer DEFAULT 0, p_take integer DEFAULT 10, p_search text DEFAULT NULL::text, p_sort text DEFAULT 'newest'::text, p_visibility_types integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(id uuid, user_id uuid, title text, description text, image_url text, created_at timestamp with time zone, visibility_type integer, accent_type integer, event_date date, items_count bigint, can_edit boolean, is_owner boolean, access_type integer, owner_nickname text)
 LANGUAGE sql
 STABLE
AS $function$
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
        or wa.access_type = 1
        or wa.access_type = 0
      )
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
    select
      i.wishlist_id,
      count(*)::bigint as items_count
    from public.item i
    where i.wishlist_id in (
      select aw.id
      from accessible_wishlists aw
    )
    group by i.wishlist_id
  ),
  enriched as (
    select
      aw.id,
      aw.user_id,
      aw.title,
      aw.description,
      aw.image_url,
      aw.created_at,
      aw.visibility_type,
      aw.accent_type,
      aw.event_date,
      coalesce(ic.items_count, 0) as items_count,
      aw.can_edit,
      aw.is_owner,
      aw.access_type,
      aw.owner_nickname
    from accessible_wishlists aw
    left join item_counts ic
      on ic.wishlist_id = aw.id
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
$function$

;

CREATE OR REPLACE FUNCTION public.get_reserved_items_by_me(p_skip integer DEFAULT 0, p_take integer DEFAULT 10, p_search text DEFAULT NULL::text, p_sort text DEFAULT 'default'::text, p_priorities integer[] DEFAULT NULL::integer[], p_price_min numeric DEFAULT NULL::numeric, p_price_max numeric DEFAULT NULL::numeric, p_display_currency text DEFAULT 'USD'::text)
 RETURNS TABLE(item_id uuid, title text, price numeric, discount_price numeric, currency text, url text, store text, image text, priority integer, status integer, wishlist_id uuid, wishlist_title text, owner_id uuid, owner_name text, owner_username text, owner_avatar text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_current_user_id uuid;
  v_search text;
  v_display_rate numeric;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_search := NULLIF(btrim(p_search), '');

  SELECT COALESCE(er.rate, 1) INTO v_display_rate
  FROM public.exchange_rates er
  WHERE er.base_currency = 'USD'
    AND er.target_currency = UPPER(COALESCE(p_display_currency, 'USD'))
  LIMIT 1;
  IF v_display_rate IS NULL THEN v_display_rate := 1; END IF;

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
  LEFT JOIN public.exchange_rates er_item
    ON er_item.base_currency = 'USD'
    AND er_item.target_currency = UPPER(COALESCE(i.currency, 'USD'))
  WHERE i.status = 1
    AND i.reserved_by = v_current_user_id
    AND w.visibility_type IN (0, 1)
    AND (p_priorities IS NULL OR i.priority = ANY(p_priorities))
    AND (
      p_price_min IS NULL
      OR (
        i.price IS NOT NULL
        AND i.price ~ '^[0-9]+\.?[0-9]*$'
        AND i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate >= p_price_min
      )
    )
    AND (
      p_price_max IS NULL
      OR (
        i.price IS NOT NULL
        AND i.price ~ '^[0-9]+\.?[0-9]*$'
        AND i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate <= p_price_max
      )
    )
    AND (
      v_search IS NULL
      OR i.name ILIKE '%' || v_search || '%'
      OR w.title ILIKE '%' || v_search || '%'
      OR p.nickname ILIKE '%' || v_search || '%'
      OR p.display_name ILIKE '%' || v_search || '%'
    )
  ORDER BY
    CASE p_sort
      WHEN 'price-high' THEN -(
        CASE WHEN i.price IS NOT NULL AND i.price ~ '^[0-9]+\.?[0-9]*$'
             THEN i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate ELSE 0 END
      )
      WHEN 'price-low' THEN
        CASE WHEN i.price IS NOT NULL AND i.price ~ '^[0-9]+\.?[0-9]*$'
             THEN i.price::numeric / COALESCE(er_item.rate, 1) * v_display_rate ELSE 0 END
      WHEN 'priority-high' THEN -COALESCE(i.priority, 0)::numeric
      WHEN 'priority-low'  THEN COALESCE(i.priority, 0)::numeric
      ELSE NULL
    END NULLS LAST,
    CASE p_sort
      WHEN 'owner-asc'  THEN COALESCE(p.display_name, p.nickname, '')
      WHEN 'owner-desc' THEN COALESCE(p.display_name, p.nickname, '')
      ELSE NULL
    END COLLATE "C",
    CASE WHEN p_sort = 'owner-desc' THEN 1 ELSE 0 END DESC,
    i.created_at DESC
  OFFSET p_skip
  LIMIT p_take;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.get_reserved_wishlists_by_me(p_skip integer DEFAULT 0, p_take integer DEFAULT 20)
 RETURNS TABLE(id uuid, owner text, username text, avatar_url text, wishlist text, wishlist_id uuid, items jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$

;

CREATE OR REPLACE FUNCTION public.get_wishlist_items(p_wishlist_id uuid, p_skip integer DEFAULT 0, p_take integer DEFAULT 50, p_search text DEFAULT NULL::text, p_sort text DEFAULT 'newest'::text, p_statuses integer[] DEFAULT NULL::integer[], p_priorities integer[] DEFAULT NULL::integer[], p_price_min numeric DEFAULT NULL::numeric, p_price_max numeric DEFAULT NULL::numeric)
 RETURNS SETOF item
 LANGUAGE sql
 STABLE
AS $function$
  SELECT *
  FROM public.item
  WHERE
    wishlist_id = p_wishlist_id
    -- text search
    AND (
      p_search IS NULL
      OR p_search = ''
      OR name ILIKE '%' || p_search || '%'
      OR description ILIKE '%' || p_search || '%'
    )
    -- status filter
    AND (
      array_length(p_statuses, 1) IS NULL
      OR status = ANY(p_statuses)
    )
    -- priority filter
    AND (
      array_length(p_priorities, 1) IS NULL
      OR priority = ANY(p_priorities)
    )
    -- price range (uses effective price: discount_price if set, otherwise price)
    AND (
      p_price_min IS NULL
      OR COALESCE(
        NULLIF(regexp_replace(COALESCE(discount_price, price, '0'), '[^0-9.\-]', '', 'g'), ''),
        '0'
      )::numeric >= p_price_min
    )
    AND (
      p_price_max IS NULL
      OR COALESCE(
        NULLIF(regexp_replace(COALESCE(discount_price, price, '0'), '[^0-9.\-]', '', 'g'), ''),
        '0'
      )::numeric <= p_price_max
    )
  ORDER BY
    CASE WHEN p_sort = 'oldest'        THEN extract(epoch FROM created_at) END ASC,
    CASE WHEN p_sort = 'name-asc'      THEN name END ASC,
    CASE WHEN p_sort = 'name-desc'     THEN name END DESC,
    CASE WHEN p_sort = 'price-high'    THEN COALESCE(
      NULLIF(regexp_replace(COALESCE(discount_price, price, '0'), '[^0-9.\-]', '', 'g'), ''),
      '0'
    )::numeric END DESC NULLS LAST,
    CASE WHEN p_sort = 'price-low'     THEN COALESCE(
      NULLIF(regexp_replace(COALESCE(discount_price, price, '0'), '[^0-9.\-]', '', 'g'), ''),
      '0'
    )::numeric END ASC NULLS LAST,
    CASE WHEN p_sort = 'priority-high' THEN priority END DESC NULLS LAST,
    CASE WHEN p_sort = 'priority-low'  THEN priority END ASC NULLS LAST,
    created_at DESC  -- default: newest first (also acts as tiebreaker)
  OFFSET p_skip
  LIMIT p_take;
$function$

;

