-- The "Stare" priority is renamed to "Starred" everywhere (DB, web, native).
-- Only the display name changes; the id, colour, emoji and sort order stay put
-- so the ordering/cap logic in the item functions keeps working untouched.

update public.item_priorities
   set name = 'Starred'
 where id = '11111111-0000-0000-0000-000000000011'::uuid;
