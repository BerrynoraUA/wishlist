-- Racist nicknames are rejected here as well as in the apps, since profiles are updated
-- straight from the client. Keep in sync with packages/backend/lib/nickname.ts.

create or replace function public.is_nickname_blocked(p_nickname text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  lower_nickname text := lower(coalesce(p_nickname, ''));
  part text;
begin
  if position('1488' in lower_nickname) > 0 then
    return true;
  end if;

  -- Matched anywhere, after undoing leetspeak and dropping separators.
  if regexp_replace(translate(lower_nickname, '013457@$', 'oieastas'), '[^a-z]', '', 'g')
    ~ '(n+i+g{2,}(e+r|a+|u+h|r)|k{3,}|wetback|beaner|raghead|towelhead|porchmonkey|junglebunny|zipperhead|spearchucker|tarbaby|chingchong|golliwog|darkie|whitepower|whitepride|heilhitler|siegheil)'
  then
    return true;
  end if;

  -- Short terms that hide inside normal words only count as a whole part.
  foreach part in array regexp_split_to_array(lower_nickname, '[^a-z0-9@$]+') loop
    part := regexp_replace(
      translate(regexp_replace(part, '[0-9]+$', ''), '013457@$', 'oieastas'),
      '[^a-z]', '', 'g'
    );
    part := regexp_replace(part, 's$', '');

    if part = any (array[
      'abo', 'boong', 'chink', 'coon', 'dago', 'gook', 'jap', 'kafir', 'kaffir', 'kike',
      'nig', 'paki', 'redskin', 'spic', 'spick', 'squaw', 'wop'
    ]) then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

create or replace function public.enforce_nickname_allowed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_nickname_blocked(new.nickname) then
    raise exception 'nickname_not_allowed' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_nickname_allowed on public.profiles;
create trigger profiles_nickname_allowed
before insert or update of nickname on public.profiles
for each row
when (new.nickname is not null)
execute function public.enforce_nickname_allowed();

-- Signup derives the nickname from the email, so fall back to 'user' rather than fail
-- the signup on a blocked one.
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

  if public.is_nickname_blocked(base_nickname) then
    base_nickname := 'user';
  end if;

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
