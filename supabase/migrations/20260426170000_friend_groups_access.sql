create table if not exists public.friend_groups (
  id uuid default gen_random_uuid() not null primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null default 'pink',
  icon text not null default 'users',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint friend_groups_name_not_empty check (btrim(name) <> ''),
  constraint friend_groups_color_not_empty check (btrim(color) <> ''),
  constraint friend_groups_icon_not_empty check (btrim(icon) <> '')
);

create table if not exists public.friend_group_members (
  id uuid default gen_random_uuid() not null primary key,
  group_id uuid not null references public.friend_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now() not null,
  constraint friend_group_members_unique unique (group_id, user_id)
);

create index if not exists idx_friend_groups_user_id on public.friend_groups using btree (user_id);
create index if not exists idx_friend_group_members_group_id on public.friend_group_members using btree (group_id);
create index if not exists idx_friend_group_members_user_id on public.friend_group_members using btree (user_id);

create or replace trigger update_friend_groups_updated_at
before update on public.friend_groups
for each row execute function public.update_updated_at_column();

alter table public.friend_groups enable row level security;
alter table public.friend_group_members enable row level security;

drop policy if exists "friend_groups_owner_all" on public.friend_groups;
create policy "friend_groups_owner_all"
on public.friend_groups
for all
using (auth.uid() is not null and user_id = auth.uid())
with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "friend_group_members_owner_all" on public.friend_group_members;
create policy "friend_group_members_owner_all"
on public.friend_group_members
for all
using (
  auth.uid() is not null
  and exists (
    select 1
    from public.friend_groups fg
    where fg.id = friend_group_members.group_id
      and fg.user_id = auth.uid()
  )
)
with check (
  auth.uid() is not null
  and exists (
    select 1
    from public.friend_groups fg
    where fg.id = friend_group_members.group_id
      and fg.user_id = auth.uid()
  )
);

alter table public.wishlist_access
  add column if not exists group_id uuid;

alter table public.wishlist_access
  alter column granted_to_user_id drop not null;

alter table public.wishlist_access
  drop constraint if exists fk_wishlist_access_group;

alter table public.wishlist_access
  add constraint fk_wishlist_access_group foreign key (group_id) references public.friend_groups(id) on delete cascade;

alter table public.wishlist_access
  drop constraint if exists uq_wishlist_access_unique;

alter table public.wishlist_access
  drop constraint if exists wishlist_access_target_check;

alter table public.wishlist_access
  add constraint wishlist_access_target_check check (
    (
      granted_to_user_id is not null
      and group_id is null
      and access_type = any (array[0, 1, 3])
    )
    or (
      granted_to_user_id is null
      and group_id is not null
      and access_type = 2
    )
  );

create unique index if not exists uq_wishlist_access_user_target
  on public.wishlist_access (wishlist_id, granted_to_user_id)
  where granted_to_user_id is not null;

create unique index if not exists uq_wishlist_access_group_target
  on public.wishlist_access (wishlist_id, group_id)
  where group_id is not null;

create index if not exists idx_wishlist_access_group_id on public.wishlist_access using btree (group_id);
create index if not exists idx_wishlist_access_group_lookup on public.wishlist_access using btree (group_id, access_type, wishlist_id);

drop function if exists public.is_friend_with_user(uuid, uuid);
create or replace function public.is_friend_with_user(
  p_user_id uuid,
  p_friend_user_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
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

create or replace function public.get_friend_groups(
  p_search text default null::text,
  p_skip integer default 0,
  p_take integer default 20
)
returns table(id uuid, name text, description text, color text, icon text, created_at timestamp with time zone, updated_at timestamp with time zone, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
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

create or replace function public.get_friend_group_members(p_group_id uuid)
returns table(id uuid, nickname text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nickname, p.display_name, p.avatar_url
  from public.friend_group_members fgm
  inner join public.friend_groups fg on fg.id = fgm.group_id
  inner join public.profiles p on p.id = fgm.user_id
  where fgm.group_id = p_group_id
    and fg.user_id = auth.uid()
  order by coalesce(p.nickname, p.display_name, '') asc;
$$;

create or replace function public.validate_friend_group_members(
  p_owner_id uuid,
  p_member_ids uuid[]
) returns void
language plpgsql
stable
security definer
set search_path = public
as $$
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

create or replace function public.create_friend_group(
  p_name text,
  p_description text default null::text,
  p_color text default 'pink'::text,
  p_icon text default 'users'::text,
  p_member_ids uuid[] default array[]::uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.update_friend_group(
  p_group_id uuid,
  p_name text,
  p_description text default null::text,
  p_color text default 'pink'::text,
  p_icon text default 'users'::text,
  p_member_ids uuid[] default array[]::uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.delete_friend_group(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

drop function if exists public.get_wishlist_access_list(uuid);
create or replace function public.get_wishlist_access_list(p_wishlist_id uuid)
returns table(target_id uuid, granted_to_user_id uuid, group_id uuid, nickname text, name text, description text, color text, icon text, member_count bigint, access_type integer, target_type text, created_at timestamp with time zone)
language sql
security definer
set search_path = public
as $$
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

create or replace function public.get_friend_groups_without_wishlist_access(
  p_wishlist_id uuid,
  p_search text default null::text,
  p_skip integer default 0,
  p_take integer default 20
)
returns table(id uuid, name text, description text, color text, icon text, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
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

create or replace function public.grant_wishlist_access(
  p_wishlist_id uuid,
  p_granted_to_user_id uuid,
  p_access_type integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.grant_wishlist_group_access(
  p_wishlist_id uuid,
  p_group_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.revoke_wishlist_access(
  p_wishlist_id uuid,
  p_target_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.revoke_wishlist_group_access(
  p_wishlist_id uuid,
  p_group_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.get_wishlist_by_id(p_wishlist_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.get_friend_wishlists(
  p_friend_user_id uuid,
  p_skip integer default 0,
  p_take integer default 10,
  p_search text default null::text,
  p_sort text default 'newest'::text
)
returns table(id uuid, user_id uuid, title text, description text, image_url text, created_at timestamp with time zone, visibility_type integer, accent_type integer, event_date date, items_count bigint, can_edit boolean, is_owner boolean, access_type integer, owner_nickname text)
language sql
stable
security definer
set search_path = public
as $$
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

grant all on function public.is_friend_with_user(uuid, uuid) to anon, authenticated, service_role;
grant all on function public.get_friend_groups(text, integer, integer) to anon, authenticated, service_role;
grant all on function public.get_friend_group_members(uuid) to anon, authenticated, service_role;
grant all on function public.create_friend_group(text, text, text, text, uuid[]) to anon, authenticated, service_role;
grant all on function public.update_friend_group(uuid, text, text, text, text, uuid[]) to anon, authenticated, service_role;
grant all on function public.delete_friend_group(uuid) to anon, authenticated, service_role;
grant all on function public.get_wishlist_access_list(uuid) to anon, authenticated, service_role;
grant all on function public.get_friend_groups_without_wishlist_access(uuid, text, integer, integer) to anon, authenticated, service_role;
grant all on function public.grant_wishlist_access(uuid, uuid, integer) to anon, authenticated, service_role;
grant all on function public.grant_wishlist_group_access(uuid, uuid) to anon, authenticated, service_role;
grant all on function public.revoke_wishlist_access(uuid, uuid) to anon, authenticated, service_role;
grant all on function public.revoke_wishlist_group_access(uuid, uuid) to anon, authenticated, service_role;
grant all on function public.get_wishlist_by_id(uuid) to anon, authenticated, service_role;
grant all on function public.get_friend_wishlists(uuid, integer, integer, text, text) to anon, authenticated, service_role;
