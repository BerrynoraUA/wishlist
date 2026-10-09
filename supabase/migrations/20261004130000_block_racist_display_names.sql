-- Display names are just as visible as nicknames, so they get the same check.
-- Keep in sync with packages/backend/lib/blocked-names.ts.

alter function public.is_nickname_blocked(text) rename to is_name_blocked;

drop trigger if exists profiles_nickname_allowed on public.profiles;
drop function if exists public.enforce_nickname_allowed();

create or replace function public.enforce_profile_names_allowed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_name_blocked(new.nickname) then
    raise exception 'nickname_not_allowed' using errcode = 'check_violation';
  end if;

  if public.is_name_blocked(new.display_name) then
    raise exception 'display_name_not_allowed' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_names_allowed on public.profiles;
create trigger profiles_names_allowed
before insert or update of nickname, display_name on public.profiles
for each row
execute function public.enforce_profile_names_allowed();

-- Signup derives both names from the email and OAuth metadata, so fall back to safe
-- ones rather than fail the signup on a blocked name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_nickname text;
  base_display_name text;
  candidate_nickname text;
  nickname_suffix integer := 0;
begin
  base_nickname := coalesce(
    nullif(trim(split_part(new.email, '@', 1)), ''),
    nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
    'user'
  );

  if public.is_name_blocked(base_nickname) then
    base_nickname := 'user';
  end if;

  base_display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    base_nickname
  );

  if public.is_name_blocked(base_display_name) then
    base_display_name := base_nickname;
  end if;

  loop
    candidate_nickname :=
      case
        when nickname_suffix = 0 then base_nickname
        else base_nickname || nickname_suffix::text
      end;

    begin
      insert into public.profiles (id, display_name, nickname)
      values (new.id, base_display_name, candidate_nickname);

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
