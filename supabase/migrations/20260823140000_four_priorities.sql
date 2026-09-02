-- The priority list is cut down to four: Low, Medium, High and Starred. The seven paid
-- tiers (Urgent … Divine) go away entirely.
--
-- `item.priority_id` references this table with `on delete set null`, so items that used
-- one of the removed tiers simply end up with no priority — nothing is left pointing at a
-- row that no longer exists.

delete from public.item_priorities
where id not in (
  '11111111-0000-0000-0000-000000000001'::uuid, -- Low
  '11111111-0000-0000-0000-000000000002'::uuid, -- Medium
  '11111111-0000-0000-0000-000000000003'::uuid, -- High
  '11111111-0000-0000-0000-000000000011'::uuid  -- Starred
);

-- The per-user "which priorities do I use" list can still name the removed tiers.
update public.user_settings
set selected_priorities = coalesce(
  (
    select array_agg(priority_id)
    from unnest(selected_priorities) as priority_id
    where exists (
      select 1 from public.item_priorities where id = priority_id
    )
  ),
  '{}'::uuid[]
)
where selected_priorities is not null
  and exists (
    select 1
    from unnest(selected_priorities) as priority_id
    where not exists (
      select 1 from public.item_priorities where id = priority_id
    )
  );
