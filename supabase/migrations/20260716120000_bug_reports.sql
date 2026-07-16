-- Bug reports: users report bugs from the app. A report stays 'pending' (visible
-- only to its author) until a maintainer triages it; from then on it is readable
-- by everyone as a known-issues board. Unlike feature ideas, reports are not voted on.

create type public.bug_report_status as enum (
  'pending',
  'confirmed',
  'in_progress',
  'fixed'
);

create table if not exists public.bug_report (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  screenshot_url text,
  status public.bug_report_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint bug_report_title_check check (char_length(title) >= 1 and char_length(title) <= 120),
  constraint bug_report_description_check check (
    char_length(description) >= 1 and char_length(description) <= 1000
  )
);

create index if not exists idx_bug_report_status on public.bug_report using btree (status);
create index if not exists idx_bug_report_user_id on public.bug_report using btree (user_id);

alter table public.bug_report enable row level security;

create policy "Anyone can read non-pending bug reports" on public.bug_report
  for select
  using (status <> 'pending'::public.bug_report_status);

create policy "Users can read own bug reports" on public.bug_report
  for select
  using (auth.uid() = user_id);

-- Reports may only be created as 'pending': authors cannot self-triage.
create policy "Authenticated users can create bug reports" on public.bug_report
  for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'::public.bug_report_status
  );

grant all on table public.bug_report to anon;
grant all on table public.bug_report to authenticated;
grant all on table public.bug_report to service_role;

create or replace function public.get_public_bug_reports()
returns table(
  id uuid,
  title text,
  description text,
  screenshot_url text,
  user_id uuid,
  status public.bug_report_status,
  created_at timestamptz,
  user_display_name text,
  user_avatar_url text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    report.id,
    report.title,
    report.description,
    report.screenshot_url,
    report.user_id,
    report.status,
    report.created_at,
    profile.display_name as user_display_name,
    profile.avatar_url as user_avatar_url
  from public.bug_report as report
  left join public.profiles as profile on profile.id = report.user_id
  where report.status <> 'pending'
  order by report.created_at desc;
$$;

revoke all on function public.get_public_bug_reports() from public, anon;
grant execute on function public.get_public_bug_reports() to authenticated;

-- ============================================================
-- Storage bucket: bug screenshots (public, same shape as avatars/items)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('bug-screenshots', 'bug-screenshots', true)
on conflict (id) do nothing;

-- Anyone can view screenshots (public bucket)
drop policy if exists "bug_screenshots_public_select" on storage.objects;
create policy "bug_screenshots_public_select"
  on storage.objects for select
  using (bucket_id = 'bug-screenshots');

-- Authenticated users can upload to their own folder
drop policy if exists "bug_screenshots_auth_insert" on storage.objects;
create policy "bug_screenshots_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'bug-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own files (cleanup when a submit fails)
drop policy if exists "bug_screenshots_auth_delete" on storage.objects;
create policy "bug_screenshots_auth_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'bug-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
