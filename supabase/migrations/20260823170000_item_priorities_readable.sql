-- `item_priorities` has row level security on with no policy at all, so every read by
-- anon/authenticated comes back empty. Nothing looked broken because the clients resolve
-- a priority's name and colour from their own copy of the list by id.
--
-- Inside `get_wishlist_items` it is not harmless: the left join to this table yields
-- NULL, so `priority_name` is always null in the response and ordering by
-- `ip.sort_order` — the default order and the "Highest/Lowest priority" sorts — silently
-- degrades to ordering by creation date.
--
-- The table is static reference data (Low, Medium, High, Starred), so it is simply
-- readable by everyone.

create policy "item_priorities_select_all"
  on public.item_priorities
  for select
  to anon, authenticated
  using (true);
