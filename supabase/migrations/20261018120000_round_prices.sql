-- Display preference: show prices as whole amounts (no cents). Off by default so
-- prices keep their exact value unless the user asks for the simpler view.
alter table public.user_settings
  add column if not exists round_prices boolean not null default false;
