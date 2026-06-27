create extension if not exists "pg_net";

create table if not exists public.notification_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text,
  device_id text,
  app_version text,
  enabled boolean not null default true,
  last_seen_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint notification_push_tokens_expo_push_token_key unique (expo_push_token)
);

create index if not exists idx_notification_push_tokens_user_id
  on public.notification_push_tokens using btree (user_id);

create index if not exists idx_notification_push_tokens_enabled_user_id
  on public.notification_push_tokens using btree (user_id, enabled);

alter table public.notification_push_tokens enable row level security;

drop policy if exists "Users can view own push tokens" on public.notification_push_tokens;
create policy "Users can view own push tokens"
  on public.notification_push_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own push tokens" on public.notification_push_tokens;
create policy "Users can insert own push tokens"
  on public.notification_push_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own push tokens" on public.notification_push_tokens;
create policy "Users can update own push tokens"
  on public.notification_push_tokens
  for update
  to authenticated
  using (true)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own push tokens" on public.notification_push_tokens;
create policy "Users can delete own push tokens"
  on public.notification_push_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.notification_push_tokens to authenticated;

create or replace function public.set_notification_push_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_push_tokens_updated_at on public.notification_push_tokens;
create trigger trg_notification_push_tokens_updated_at
  before update on public.notification_push_tokens
  for each row
  execute function public.set_notification_push_tokens_updated_at();

create or replace function public.invoke_notification_push_webhook()
returns trigger
language plpgsql
as $$
declare
  v_url text := current_setting('app.settings.notification_push_webhook_url', true);
  v_secret text := current_setting('app.settings.notification_push_webhook_secret', true);
begin
  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'schema', tg_table_schema,
      'table', tg_table_name,
      'record', to_jsonb(new)
    )
  );

  return new;
end;
$$;

comment on function public.invoke_notification_push_webhook()
  is 'Invokes the send-notification-push Edge Function. Configure app.settings.notification_push_webhook_url and app.settings.notification_push_webhook_secret in the target Supabase database.';

drop trigger if exists trg_send_notification_push on public.notifications;
create trigger trg_send_notification_push
  after insert on public.notifications
  for each row
  execute function public.invoke_notification_push_webhook();
