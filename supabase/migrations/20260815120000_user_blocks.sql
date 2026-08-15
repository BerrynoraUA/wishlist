-- Blocking a user: they can no longer reach you with friend requests, the
-- friendship (and any pending request either way) is dropped, your wishlists
-- stop being visible to them, and they drop out of your people search.
--
-- Blocks are one-directional rows but enforced in both directions, so a single
-- block is enough to keep the pair apart. Only the blocker can see the row —
-- the blocked side is never told — which is why every check below runs in a
-- `security definer` function rather than under RLS.

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint chk_user_blocks_not_self check (blocker_id <> blocked_id)
);

create index if not exists idx_user_blocks_blocked_id on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "Users read their own blocks" on public.user_blocks;
create policy "Users read their own blocks" on public.user_blocks
  for select using (blocker_id = auth.uid());

drop policy if exists "Users create their own blocks" on public.user_blocks;
create policy "Users create their own blocks" on public.user_blocks
  for insert with check (blocker_id = auth.uid());

drop policy if exists "Users delete their own blocks" on public.user_blocks;
create policy "Users delete their own blocks" on public.user_blocks
  for delete using (blocker_id = auth.uid());

grant select, insert, delete on public.user_blocks to authenticated;

-- --------------------------------------------------------------------------
-- Helpers
-- --------------------------------------------------------------------------

-- True when either user has blocked the other. Security definer so a caller
-- can be kept apart from someone whose block row they cannot read.
create or replace function public.is_user_blocked(p_first uuid, p_second uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_blocks b
    where (b.blocker_id = p_first and b.blocked_id = p_second)
       or (b.blocker_id = p_second and b.blocked_id = p_first)
  );
$$;

alter function public.is_user_blocked(uuid, uuid) owner to postgres;
grant execute on function public.is_user_blocked(uuid, uuid) to authenticated, service_role;

-- --------------------------------------------------------------------------
-- Enforcement
-- --------------------------------------------------------------------------

-- Friend requests are inserted straight from the client, so the guard has to
-- live in the database or it is trivially bypassed.
create or replace function public.reject_blocked_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_user_blocked(new.sender_id, new.receiver_id) then
    raise exception 'Cannot send a friend request to this user'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

alter function public.reject_blocked_friend_request() owner to postgres;

drop trigger if exists trg_friend_requests_block_guard on public.friend_requests;
create trigger trg_friend_requests_block_guard
  before insert on public.friend_requests
  for each row execute function public.reject_blocked_friend_request();

-- Wishlist visibility funnels through here (direct opens and discover alike),
-- so one check covers every surface.
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
      or (
        not public.is_user_blocked(p_user_id, p_wishlist_owner_id)
        and (
          p_visibility_type = 0
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
        )
      )
    );
$$;

alter function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) owner to postgres;
grant all on function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) to anon;
grant all on function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) to authenticated;
grant all on function public.can_view_wishlist_for_user(uuid, uuid, integer, uuid) to service_role;

-- People search hides anyone on either side of a block.
create or replace function public.search_profiles_by_nickname(
  p_query text,
  p_skip integer default 0,
  p_take integer default 20
) returns table(id uuid, nickname text, display_name text, avatar_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_query is null or length(trim(p_query)) = 0 then
    return;
  end if;

  return query
  select
    p.id,
    p.nickname,
    p.display_name,
    p.avatar_url
  from public.profiles p
  where p.nickname ilike trim(p_query) || '%'
    and p.id <> v_current_user_id
    and not public.is_user_blocked(v_current_user_id, p.id)
    and not exists (
      select 1 from public.friends f
      where (f.user_f = v_current_user_id and f.user_s = p.id)
         or (f.user_f = p.id and f.user_s = v_current_user_id)
    )
    and p.id not in (
      select fr.receiver_id from public.friend_requests fr where fr.sender_id = v_current_user_id
      union
      select fr.sender_id from public.friend_requests fr where fr.receiver_id = v_current_user_id
    )
  order by p.nickname
  offset p_skip
  limit p_take;
end;
$$;

alter function public.search_profiles_by_nickname(text, integer, integer) owner to postgres;
grant execute on function public.search_profiles_by_nickname(text, integer, integer)
  to authenticated, service_role;

-- --------------------------------------------------------------------------
-- Actions
-- --------------------------------------------------------------------------

-- Blocking also tears down whatever connection already exists, otherwise the
-- pair stays friends and the block only stops future requests.
create or replace function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id is null or p_user_id = v_current_user_id then
    raise exception 'Cannot block yourself';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_current_user_id, p_user_id)
  on conflict do nothing;

  delete from public.friends f
  where (f.user_f = v_current_user_id and f.user_s = p_user_id)
     or (f.user_f = p_user_id and f.user_s = v_current_user_id);

  delete from public.friend_requests fr
  where (fr.sender_id = v_current_user_id and fr.receiver_id = p_user_id)
     or (fr.sender_id = p_user_id and fr.receiver_id = v_current_user_id);
end;
$$;

alter function public.block_user(uuid) owner to postgres;
grant execute on function public.block_user(uuid) to authenticated;

create or replace function public.unblock_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.user_blocks b
  where b.blocker_id = v_current_user_id
    and b.blocked_id = p_user_id;
end;
$$;

alter function public.unblock_user(uuid) owner to postgres;
grant execute on function public.unblock_user(uuid) to authenticated;

create or replace function public.get_blocked_users(
  p_skip integer default 0,
  p_take integer default 20,
  p_search text default null
) returns table(
  id uuid,
  nickname text,
  display_name text,
  avatar_url text,
  blocked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
  v_search text;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_search := nullif(btrim(p_search), '');

  return query
  select
    p.id,
    p.nickname,
    p.display_name,
    p.avatar_url,
    b.created_at as blocked_at
  from public.user_blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = v_current_user_id
    and (
      v_search is null
      or p.nickname ilike '%' || v_search || '%'
      or p.display_name ilike '%' || v_search || '%'
    )
  order by b.created_at desc
  offset p_skip
  limit p_take;
end;
$$;

alter function public.get_blocked_users(integer, integer, text) owner to postgres;
grant execute on function public.get_blocked_users(integer, integer, text) to authenticated;
