-- Default avatars move out of Postgres and into the app.
--
-- The previous version built the public storage URL in SQL, which meant hardcoding the
-- project's host: Postgres has no way to know it. The host it fell back to does not
-- resolve, so every profile created since got a URL that renders as a broken image.
--
-- The clients already know their own Supabase URL — it is how they build the URL for a
-- picture a user uploads or picks by hand. So they now assign the default too, the first
-- time they load a profile that has none. Nothing here has to know about storage.

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
      insert into public.profiles (id, display_name, nickname)
      values (
        new.id,
        coalesce(
          new.raw_user_meta_data->>'display_name',
          new.raw_user_meta_data->>'full_name',
          base_nickname
        ),
        candidate_nickname
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

drop function if exists public.random_default_avatar_url();
drop function if exists public.default_avatar_url(integer);

-- Clear the avatars that point at the host that never existed, so the app hands those
-- profiles a working default the next time they open it.
update public.profiles
set avatar_url = null
where avatar_url like 'https://mdwqtqqlqlzyqvnnhlln.supabase.co/%';
