-- Client-side localized notifications — FOUNDATION (additive, non-breaking).
--
-- Goal: notification text is rendered by the acting client in the *recipient's* language
-- (from pre-translated GT catalogs) and written via public.create_notification(). Push +
-- in-app then show that already-localized text, with no realtime translation anywhere.
--
-- This migration adds only the shared plumbing and changes NO existing behavior:
--   1) user_settings.preferred_locale        — recipient language.
--   2) public.get_preferred_locales(uuid[])   — RLS-safe recipient-locale lookup for the actor.
--   3) public.create_notification(...)        — one gated, SECURITY DEFINER writer.
--
-- The per-type cutover (stop composing text in each trigger/RPC, and have the client call
-- create_notification instead) is done type-by-type in follow-up changes, each landing the
-- web + native call sites together so no notification is lost. Until a type is cut over, its
-- existing server-side English text is unchanged.

-- ---------------------------------------------------------------------------
-- 1) Recipient language
-- ---------------------------------------------------------------------------
alter table public.user_settings
  add column if not exists preferred_locale text;

-- ---------------------------------------------------------------------------
-- 2) Recipient-locale lookup for the acting client.
--    RLS hides other users' user_settings, so the actor cannot read a recipient's
--    preferred_locale directly. This SECURITY DEFINER reader exposes only the locale
--    (non-sensitive) for the given users. Batch-friendly for fan-out notifications.
-- ---------------------------------------------------------------------------
create or replace function public.get_preferred_locales(p_user_ids uuid[])
returns table(user_id uuid, preferred_locale text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select s.user_id, s.preferred_locale
  from public.user_settings s
  where s.user_id = any(p_user_ids);
$$;

grant execute on function public.get_preferred_locales(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Generic notification writer (client-called).
--    Sender is always the caller. Respects the recipient's per-type notify_* setting and
--    the group-added / wishlist-access dedupe. Best-effort: a notification failure never
--    bubbles into the calling action (matching the old triggers' behavior).
-- ---------------------------------------------------------------------------
create or replace function public.create_notification(
  p_receiver_id uuid,
  p_type smallint,
  p_icon_type smallint,
  p_text text,
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_sender_id uuid := auth.uid();
  v_notify boolean := true;
begin
  if v_sender_id is null then
    raise exception 'Not authenticated';
  end if;

  -- no self-notifications
  if p_receiver_id is null or p_receiver_id = v_sender_id then
    return;
  end if;

  if p_text is null or btrim(p_text) = '' then
    return;
  end if;

  -- per-type recipient opt-out (defaults to true when the row/column is absent)
  select case p_type
    when 0 then coalesce(notify_secret_santa, true)
    when 1 then coalesce(notify_reservations, true)
    when 2 then coalesce(notify_friend_requests, true)
    when 3 then coalesce(notify_reservations, true)
    when 4 then coalesce(notify_new_wishlists, true)
    when 6 then coalesce(notify_group_added, true)
    when 7 then coalesce(notify_wishlist_access, true)
    else true
  end
  into v_notify
  from public.user_settings
  where user_id = p_receiver_id;

  if v_notify is not true then
    return;
  end if;

  -- dedupe: at most once per (recipient, entity) for group-added / wishlist-access
  if p_type in (6, 7) and p_entity_id is not null and exists (
    select 1 from public.notifications
    where receiver_id = p_receiver_id and type = p_type and entity_id = p_entity_id
  ) then
    return;
  end if;

  begin
    insert into public.notifications (
      sender_id, receiver_id, text, icon_type, type, entity_id, is_read
    )
    values (
      v_sender_id, p_receiver_id, p_text, p_icon_type, p_type, p_entity_id, false
    );
  exception when others then
    null;
  end;
end;
$$;

grant execute on function public.create_notification(uuid, smallint, smallint, text, uuid)
  to authenticated;
