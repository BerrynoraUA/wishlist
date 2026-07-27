-- Cutover: "shared a wishlist with you" (type 7) moves to the client.
--
-- The notification fires only for direct per-user grants (group grants store a group-level
-- access row with granted_to_user_id = null and never notified). So this is single-recipient:
-- the granting client creates the localized notification after grant_wishlist_access().
--
-- create_notification() dedupes type 7 by (receiver, wishlist) and skips self, matching the
-- old trigger's guards.

drop trigger if exists trg_notify_wishlist_access on public.wishlist_access;
drop function if exists public.create_wishlist_access_notification();
