-- Default profile avatars: ten flat person illustrations living in the public
-- `avatars` bucket under `defaults/`. New profiles get a random one so nobody
-- starts out as a bare initial, and the profile screens let the user swap to
-- another default or upload their own photo.
--
-- The ten files (defaults/default-01.png … default-10.png) have to exist in the
-- bucket of every environment this runs against, or the URLs below 404.

-- The project URL is not knowable from inside Postgres, so it falls back to
-- production. Every other environment must point at its own storage:
--   alter database postgres set app.supabase_url = 'https://<ref>.supabase.co';
-- Staging is https://usqolbxpvnhiwdispocs.supabase.co.
create or replace function public.default_avatar_url(avatar_index integer)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
           nullif(current_setting('app.supabase_url', true), ''),
           'https://mdwqtqqlqlzyqvnnhlln.supabase.co'
         )
         || '/storage/v1/object/public/avatars/defaults/default-'
         || lpad(avatar_index::text, 2, '0')
         || '.png';
$$;

-- Keep in sync with DEFAULT_AVATAR_COUNT in packages/backend/lib/default-avatars.ts.
create or replace function public.random_default_avatar_url()
returns text
language sql
volatile
set search_path = public
as $$
  select public.default_avatar_url(1 + floor(random() * 10)::integer);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_nickname text;
  candidate_nickname text;
  nickname_suffix integer := 0;
  default_avatar_url text := public.random_default_avatar_url();
begin
  base_nickname := coalesce(
    nullif(trim(split_part(new.email, '@', 1)), ''),
    nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
    'user'
  );

  loop
    candidate_nickname :=
      case
        when nickname_suffix = 0 then base_nickname
        else base_nickname || nickname_suffix::text
      end;

    begin
      insert into public.profiles (id, display_name, nickname, avatar_url)
      values (
        new.id,
        coalesce(
          new.raw_user_meta_data->>'display_name',
          new.raw_user_meta_data->>'full_name',
          base_nickname
        ),
        candidate_nickname,
        default_avatar_url
      );

      return new;
    exception
      when unique_violation then
        if exists (
          select 1
          from public.profiles
          where nickname = candidate_nickname
        ) then
          nickname_suffix := nickname_suffix + 1;
        else
          raise;
        end if;
    end;
  end loop;
end;
$$;

-- Existing profiles without a picture get one too, so the defaults are not a
-- new-signups-only feature.
update public.profiles
set avatar_url = public.random_default_avatar_url()
where avatar_url is null;
