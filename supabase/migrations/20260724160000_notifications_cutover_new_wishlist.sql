-- Cutover: "created a new wishlist" (type 4) moves to the client.
--
-- The old server-side fan-out is turned into a no-op (kept, not dropped, so any lingering
-- caller is harmless), and a recipient-list RPC exposes which friends to notify. The client
-- then renders each notification in the recipient's language and writes it via
-- create_notification() (which also applies the per-user notify_new_wishlists gate).

-- Old fan-out becomes a no-op — notifications are now created by the client.
create or replace function public.notify_friends_about_new_wishlist(p_wishlist_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return;
end;
$$;

-- Recipient list: the owner's friends, only for a public / friends-only wishlist, and only
-- when the caller is the owner. Access logic stays server-side (SECURITY DEFINER); the client
-- just renders + writes. The per-recipient notify_new_wishlists opt-out is applied later in
-- create_notification(), so it is intentionally not filtered here.
create or replace function public.get_wishlist_friends_to_notify(p_wishlist_id uuid)
returns setof uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_owner uuid;
  v_visibility integer;
begin
  select user_id, visibility_type
  into v_owner, v_visibility
  from public.wishlist
  where id = p_wishlist_id;

  if v_owner is null or v_owner <> auth.uid() then
    return;
  end if;

  if v_visibility not in (0, 1) then
    return;
  end if;

  return query
    select case when f.user_f = v_owner then f.user_s else f.user_f end
    from public.friends f
    where f.user_f = v_owner or f.user_s = v_owner;
end;
$$;

grant execute on function public.get_wishlist_friends_to_notify(uuid) to authenticated;
