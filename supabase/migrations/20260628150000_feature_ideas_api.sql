create or replace function public.get_approved_feature_ideas()
returns table(
  id uuid,
  title text,
  description text,
  user_id uuid,
  status public.feature_idea_status,
  votes_count integer,
  has_voted boolean,
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
    idea.id,
    idea.title,
    idea.description,
    idea.user_id,
    idea.status,
    count(vote.id)::integer as votes_count,
    coalesce(bool_or(vote.user_id = auth.uid()), false) as has_voted,
    idea.created_at,
    profile.display_name as user_display_name,
    profile.avatar_url as user_avatar_url
  from public.feature_idea as idea
  left join public.profiles as profile on profile.id = idea.user_id
  left join public.feature_idea_vote as vote on vote.idea_id = idea.id
  where idea.status <> 'pending'
  group by idea.id, profile.id
  order by idea.created_at desc;
$$;

create or replace function public.toggle_feature_idea_vote(p_idea_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.feature_idea_vote
  where idea_id = p_idea_id
    and user_id = v_user_id;

  if found then
    return false;
  end if;

  insert into public.feature_idea_vote (idea_id, user_id)
  values (p_idea_id, v_user_id);

  return true;
end;
$$;

revoke all on function public.get_approved_feature_ideas() from public, anon;
revoke all on function public.toggle_feature_idea_vote(uuid) from public, anon;
grant execute on function public.get_approved_feature_ideas() to authenticated;
grant execute on function public.toggle_feature_idea_vote(uuid) to authenticated;
