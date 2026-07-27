-- Cutover: "added you to a group" (type 6) moves to the client.
--
-- Drop the AFTER INSERT trigger on friend_group_members. The client (group owner) creates the
-- localized notification for each member after create/update. create_notification() already
-- dedupes type 6 by (receiver, group) and skips self-notification, so the client can safely
-- send to all current members — previously-notified members are ignored.

drop trigger if exists trg_notify_group_added on public.friend_group_members;
drop function if exists public.create_group_added_notification();
