-- Reporting an item.
--
-- Two tables on purpose: `reported_items` is the per-item record moderation
-- works from (and carries the running total), `item_reports` is the audit row
-- naming each reporter. The composite primary key on the second is what stops
-- the same person reporting an item twice.

create table if not exists public.reported_items (
  item_id uuid primary key references public.item (id) on delete cascade,
  reports_count integer not null default 0,
  first_reported_at timestamptz not null default now(),
  last_reported_at timestamptz not null default now()
);

create table if not exists public.item_reports (
  item_id uuid not null references public.item (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, reporter_id)
);

create index if not exists idx_item_reports_reporter on public.item_reports (reporter_id);
create index if not exists idx_reported_items_count on public.reported_items (reports_count desc);

alter table public.reported_items enable row level security;
alter table public.item_reports enable row level security;

-- Reporters may add their own row and see that they already reported. Nobody
-- reads anyone else's report, and nothing is updatable or deletable: a report
-- is a record of what happened.
drop policy if exists "Users create their own reports" on public.item_reports;
create policy "Users create their own reports" on public.item_reports
  for insert with check (reporter_id = auth.uid());

drop policy if exists "Users read their own reports" on public.item_reports;
create policy "Users read their own reports" on public.item_reports
  for select using (reporter_id = auth.uid());

grant select, insert on public.item_reports to authenticated;

-- `reported_items` is moderation-facing only: RLS is on with no policy, so
-- authenticated clients cannot read it at all.

-- The counters are maintained by trigger rather than by the RPC, so they stay
-- correct no matter which path inserts a report.
create or replace function public.sync_reported_item_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.reported_items as ri (item_id, reports_count, first_reported_at, last_reported_at)
    values (new.item_id, 1, new.created_at, new.created_at)
    on conflict (item_id) do update
      set reports_count = ri.reports_count + 1,
          last_reported_at = excluded.last_reported_at;
    return new;
  end if;

  update public.reported_items
     set reports_count = greatest(reports_count - 1, 0)
   where item_id = old.item_id;

  return old;
end;
$$;

alter function public.sync_reported_item_counters() owner to postgres;

drop trigger if exists trg_item_reports_sync on public.item_reports;
create trigger trg_item_reports_sync
  after insert or delete on public.item_reports
  for each row execute function public.sync_reported_item_counters();

-- Returns true when this call recorded the report, false when the user had
-- already reported the item — the caller uses that to word the confirmation.
create or replace function public.report_item(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
  v_owner_id uuid;
  v_rows integer;
begin
  v_current_user_id := auth.uid();

  if v_current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select w.user_id
    into v_owner_id
    from public.item i
    join public.wishlist w on w.id = i.wishlist_id
   where i.id = p_item_id;

  if v_owner_id is null then
    raise exception 'Item not found';
  end if;

  if v_owner_id = v_current_user_id then
    raise exception 'Cannot report your own item';
  end if;

  insert into public.item_reports (item_id, reporter_id)
  values (p_item_id, v_current_user_id)
  on conflict do nothing;

  get diagnostics v_rows = row_count;

  return v_rows > 0;
end;
$$;

alter function public.report_item(uuid) owner to postgres;
grant execute on function public.report_item(uuid) to authenticated;
