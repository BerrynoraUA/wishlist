create or replace function public.can_view_wishlist_for_user(
  p_wishlist_id uuid,
  p_wishlist_owner_id uuid,
  p_visibility_type integer,
  p_user_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
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

alter function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) owner to postgres;
grant all on function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) to anon;
grant all on function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) to authenticated;
grant all on function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) to service_role;