-- Admin email allowlist for server-side admin tooling.
-- Keep this table private to clients: only service_role can read/write it.

create table if not exists public.admin_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint admin_emails_email_check check (
    email = lower(trim(email))
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint admin_emails_email_key unique (email)
);

alter table public.admin_emails enable row level security;

revoke all on table public.admin_emails from anon;
revoke all on table public.admin_emails from authenticated;
grant all on table public.admin_emails to service_role;

