-- Add is_pinned column to wishlist table
alter table public.wishlist
  add column if not exists is_pinned boolean not null default false;

-- Drop existing function so the return type can change to include is_pinned
drop function if exists public.get_my_wishlists_feed(integer, integer, text, text, integer[]);

-- Recreate get_my_wishlists_feed to include is_pinned and sort pinned items first
create or replace function public.get_my_wishlists_feed(
  p_skip integer default 0,
  p_take integer default 10,
  p_search text default null::text,
  p_sort text default 'newest'::text,
  p_visibility_types integer[] default null::integer[]
)
returns table(id uuid, user_id uuid, title text, description text, image_url text, created_at timestamp with time zone, visibility_type integer, accent_type integer, event_date date, items_count bigint, can_edit boolean, is_owner boolean, access_type integer, owner_nickname text, is_pinned boolean)
language sql
stable
as $$
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
