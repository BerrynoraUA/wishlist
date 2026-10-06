-- All MCP requests still use the connected user's JWT and normal table RLS.
create schema if not exists private;

create table private.mcp_oauth_clients (
  client_id text primary key,
  resource text not null check (resource ~ '^https://[^/]+/api/mcp$')
);
alter table private.mcp_oauth_clients enable row level security;
revoke all on private.mcp_oauth_clients from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;
grant select on private.mcp_oauth_clients to supabase_auth_admin;
create policy mcp_oauth_hook_read on private.mcp_oauth_clients
  for select to supabase_auth_admin using (true);

-- Configure this hook in Supabase Auth after registering the ChatGPT and Claude OAuth clients.
-- The map is managed by the operator, never from user-editable metadata.
create or replace function private.mcp_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  claims jsonb := event -> 'claims';
  resource text;
begin
  select c.resource into resource from private.mcp_oauth_clients c
  where c.client_id = coalesce(event ->> 'client_id', claims ->> 'client_id');
  if resource is not null then
    claims := jsonb_set(claims, '{aud}', to_jsonb(resource));
    event := jsonb_set(event, '{claims}', claims);
  end if;
  return event;
end;
$$;
revoke all on function private.mcp_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function private.mcp_access_token_hook(jsonb) to supabase_auth_admin;

-- Check the live OAuth session on every MCP request, so disconnecting a grant
-- also rejects already-issued JWTs instead of waiting for their expiry.
create or replace function private.mcp_session_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s
    join private.mcp_oauth_clients c on c.client_id = s.oauth_client_id::text
    where s.id::text = auth.jwt() ->> 'session_id'
      and s.user_id = auth.uid()
      and c.client_id = auth.jwt() ->> 'client_id'
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function private.mcp_session_active() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.mcp_session_active() to authenticated;
create or replace function public.mcp_session_active()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.mcp_session_active();
$$;
revoke all on function public.mcp_session_active() from public, anon;
grant execute on function public.mcp_session_active() to authenticated;

create table public.mcp_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  tool text not null,
  arguments jsonb not null,
  review jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'executing', 'completed', 'failed')),
  result jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);
alter table public.mcp_actions enable row level security;
revoke all on public.mcp_actions from public, anon;
grant select, insert, update, delete on public.mcp_actions to authenticated;
create policy mcp_actions_owner on public.mcp_actions for all to authenticated
  using (user_id = (select auth.uid()) and client_id = (select auth.jwt() ->> 'client_id'))
  with check (user_id = (select auth.uid()) and client_id = (select auth.jwt() ->> 'client_id'));
create index mcp_actions_user_expiry on public.mcp_actions(user_id, expires_at);

-- An explicit state and row lock make retries and competing shoppers safe.
-- The privileged implementation lives outside the exposed API schema.
create or replace function private.mcp_set_gift_status(p_item_id uuid, p_status integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  item_row public.item%rowtype;
  list_row public.wishlist%rowtype;
  changed boolean;
begin
  if caller is null then raise exception 'Not authenticated'; end if;
  if p_status is null or p_status not in (0, 1, 2) then raise exception 'Invalid gift status'; end if;
  select * into item_row from public.item where id = p_item_id for update;
  if not found then raise exception 'Wish unavailable'; end if;
  select * into list_row from public.wishlist where id = item_row.wishlist_id;
  if not public.can_view_wishlist_for_user(list_row.id, list_row.user_id, list_row.visibility_type, caller) then
    raise exception 'Wish unavailable';
  end if;
  if item_row.status <> 0 and item_row.reserved_by is distinct from caller then
    raise exception 'Gift is held by another user';
  end if;
  changed := item_row.status is distinct from p_status;
  if changed then
    update public.item set status = p_status,
      reserved_by = case when p_status = 0 then null else caller end
    where id = p_item_id;
  end if;
  return jsonb_build_object('changed', changed, 'owner_id', list_row.user_id, 'wishlist_id', list_row.id);
end;
$$;
revoke all on function private.mcp_set_gift_status(uuid, integer) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.mcp_set_gift_status(uuid, integer) to authenticated;
create or replace function public.mcp_set_gift_status(p_item_id uuid, p_status integer)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.mcp_set_gift_status(p_item_id, p_status);
$$;
revoke all on function public.mcp_set_gift_status(uuid, integer) from public, anon;
grant execute on function public.mcp_set_gift_status(uuid, integer) to authenticated;

-- The apps already cap starred wishes at three. Enforce the same rule atomically
-- for OAuth writes, including simultaneous requests on separate server instances.
create or replace function private.mcp_check_star_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.jwt() ->> 'client_id' is null or new.priority_id is distinct from '11111111-0000-0000-0000-000000000011'::uuid then return new; end if;
  if tg_op = 'UPDATE' and old.priority_id = new.priority_id and old.wishlist_id = new.wishlist_id then return new; end if;
  perform 1 from public.wishlist where id = new.wishlist_id for update;
  if (select count(*) from public.item where wishlist_id = new.wishlist_id and priority_id = new.priority_id and id <> new.id) >= 3 then
    raise exception 'You can have up to 3 starred items in one wishlist';
  end if;
  return new;
end;
$$;
revoke all on function private.mcp_check_star_limit() from public, anon, authenticated;
create trigger mcp_check_star_limit before insert or update of priority_id, wishlist_id on public.item
  for each row execute function private.mcp_check_star_limit();

notify pgrst, 'reload schema';
