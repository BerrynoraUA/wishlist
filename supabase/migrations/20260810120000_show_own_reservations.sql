-- Pro-only opt-in: let wishlist owners see whether their own items have been
-- reserved or bought. Off by default so the surprise is preserved unless the
-- owner deliberately asks for the spoiler.
alter table public.user_settings
  add column if not exists show_own_reservations boolean not null default false;
