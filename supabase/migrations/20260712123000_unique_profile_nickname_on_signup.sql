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
