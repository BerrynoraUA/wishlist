-- Three new notification types (web settings toggles + automatic push via the
-- existing trg_send_notification_push webhook on public.notifications).
--
-- Notification type map (existing + new):
--   0 = Secret Santa invite
--   1 = Item reserved
--   2 = Friends / friend requests
--   3 = Item bought
--   4 = New wishlist
--   5 = Upcoming wishlist event
--   6 = Added to a friend group        (new)
--   7 = Wishlist access granted         (new)
--   8 = Reserved item updated           (new)
--
-- Each type is gated by a per-user setting. Notifications are created by AFTER
-- triggers on the source tables so they fire regardless of which RPC/code path
-- mutates the row. The notification insert is wrapped so a failure can never
-- roll back the underlying operation (adding a member, granting access, editing
-- an item).

alter table public.user_settings
  add column if not exists notify_group_added boolean not null default true,
  add column if not exists notify_wishlist_access boolean not null default true,
  add column if not exists notify_reserved_item_updates boolean not null default true;

-- ---------------------------------------------------------------------------
-- 6) Added to a friend group  (trigger: public.friend_group_members AFTER INSERT)
-- ---------------------------------------------------------------------------
create or replace function public.create_group_added_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_owner_id uuid;
  v_owner_name text;
  v_group_name text;
  v_notify boolean := true;
begin
  select fg.user_id, fg.name, coalesce(p.display_name, p.nickname, 'Someone')
    into v_owner_id, v_group_name, v_owner_name
  from public.friend_groups fg
  left join public.profiles p on p.id = fg.user_id
  where fg.id = new.group_id;

  -- group not found, or this is the owner's own membership -> nothing to do
  if v_owner_id is null or new.user_id = v_owner_id then
    return new;
  end if;

  select coalesce(notify_group_added, true) into v_notify
  from public.user_settings where user_id = new.user_id;
  if v_notify is not true then
    return new;
  end if;

  -- notify at most once per (member, group)
  if exists (
    select 1 from public.notifications
    where receiver_id = new.user_id and type = 6 and entity_id = new.group_id
  ) then
    return new;
  end if;

  begin
    insert into public.notifications (sender_id, receiver_id, text, icon_type, type, entity_id, is_read)
    values (
      v_owner_id,
      new.user_id,
      format('%s added you to the group "%s"', v_owner_name, v_group_name),
      6, 6, new.group_id, false
    );
  exception when others then
    -- never let a notification failure break group membership changes
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_notify_group_added on public.friend_group_members;
create trigger trg_notify_group_added
  after insert on public.friend_group_members
  for each row execute function public.create_group_added_notification();

-- ---------------------------------------------------------------------------
-- 7) Wishlist access granted  (trigger: public.wishlist_access AFTER INSERT)
-- ---------------------------------------------------------------------------
create or replace function public.create_wishlist_access_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_granter_name text;
  v_wishlist_title text;
  v_wishlist_owner uuid;
  v_notify boolean := true;
begin
  -- skip self-grants / missing recipient
  if new.granted_to_user_id is null
     or new.granted_to_user_id is not distinct from new.granted_by_user_id then
    return new;
  end if;

  select w.title, w.user_id into v_wishlist_title, v_wishlist_owner
  from public.wishlist w where w.id = new.wishlist_id;
  if v_wishlist_owner is null or new.granted_to_user_id = v_wishlist_owner then
    return new;
  end if;

  select coalesce(notify_wishlist_access, true) into v_notify
  from public.user_settings where user_id = new.granted_to_user_id;
  if v_notify is not true then
    return new;
  end if;

  -- notify at most once per (recipient, wishlist)
  if exists (
    select 1 from public.notifications
    where receiver_id = new.granted_to_user_id and type = 7 and entity_id = new.wishlist_id
  ) then
    return new;
  end if;

  select coalesce(p.display_name, p.nickname, 'Someone') into v_granter_name
  from public.profiles p where p.id = new.granted_by_user_id;

  begin
    insert into public.notifications (sender_id, receiver_id, text, icon_type, type, entity_id, is_read)
    values (
      new.granted_by_user_id,
      new.granted_to_user_id,
      format('%s shared the wishlist "%s" with you', coalesce(v_granter_name, 'Someone'), v_wishlist_title),
      7, 7, new.wishlist_id, false
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_notify_wishlist_access on public.wishlist_access;
create trigger trg_notify_wishlist_access
  after insert on public.wishlist_access
  for each row execute function public.create_wishlist_access_notification();

-- ---------------------------------------------------------------------------
-- 8) Reserved item updated  (trigger: public.item AFTER UPDATE)
--    Notifies the reserver when the owner edits content of an item they reserved.
-- ---------------------------------------------------------------------------
create or replace function public.create_reserved_item_update_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_owner_id uuid;
  v_notify boolean := true;
  v_text text;
begin
  -- only items currently reserved/bought by someone
  if new.reserved_by is null then
    return new;
  end if;

  -- only when user-visible content actually changes (ignore status/reserved_by churn)
  if new.name is not distinct from old.name
     and new.price is not distinct from old.price
     and new.url is not distinct from old.url
     and new.image_url is not distinct from old.image_url
     and new.description is not distinct from old.description
     and new.discount_price is not distinct from old.discount_price
     and new.has_discount is not distinct from old.has_discount
     and new.currency is not distinct from old.currency then
    return new;
  end if;

  select w.user_id into v_owner_id from public.wishlist w where w.id = new.wishlist_id;
  if v_owner_id is null or new.reserved_by = v_owner_id then
    return new;
  end if;

  select coalesce(notify_reserved_item_updates, true) into v_notify
  from public.user_settings where user_id = new.reserved_by;
  if v_notify is not true then
    return new;
  end if;

  v_text := format('An item you reserved was updated: "%s"', new.name);

  -- throttle: at most one identical notification per recipient per 2 hours
  if exists (
    select 1 from public.notifications
    where receiver_id = new.reserved_by
      and type = 8
      and text = v_text
      and created_at > now() - interval '2 hours'
  ) then
    return new;
  end if;

  begin
    insert into public.notifications (sender_id, receiver_id, text, icon_type, type, entity_id, is_read)
    values (v_owner_id, new.reserved_by, v_text, 8, 8, new.wishlist_id, false);
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_notify_reserved_item_update on public.item;
create trigger trg_notify_reserved_item_update
  after update on public.item
  for each row execute function public.create_reserved_item_update_notification();
