-- PowerShell: Get-Content -Raw scripts/validate-offline-db.sql | docker exec -i supabase_db_berrynoraUA-wishlist psql -U postgres -d postgres -v ON_ERROR_STOP=1
-- All fixtures and writes are rolled back.
begin;
set local plpgsql.check_asserts = on;
insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data,aud,role) values
('f1000000-0000-4000-8000-000000000001','offlinevalidationa@wishlane.test','{}','{}','authenticated','authenticated'),
('f1000000-0000-4000-8000-000000000002','offlinevalidationb@wishlane.test','{}','{}','authenticated','authenticated');
insert into public.friends(user_f,user_s) values('f1000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
do $$
declare
 g jsonb; e public.secret_santa; e2 public.secret_santa;
begin
 g := public.create_friend_group('Offline Validation',null,'pink','users',array['f1000000-0000-4000-8000-000000000002'::uuid],'f2000000-0000-4000-8000-000000000001');
 assert (g->>'id')::uuid='f2000000-0000-4000-8000-000000000001'::uuid;
 perform public.create_friend_group('Offline Validation',null,'pink','users',array['f1000000-0000-4000-8000-000000000002'::uuid],'f2000000-0000-4000-8000-000000000001');
 assert (select count(*) from public.friend_group_members where group_id='f2000000-0000-4000-8000-000000000001')=1;
 perform public.create_friend_group('Legacy caller');
 e := public.create_secret_santa_event('Offline Validation',now()+interval '30 days',25,null,'["f1000000-0000-4000-8000-000000000002"]','EUR','f3000000-0000-4000-8000-000000000001');
 e2 := public.create_secret_santa_event('Offline Validation',now()+interval '30 days',25,null,'["f1000000-0000-4000-8000-000000000002"]','EUR','f3000000-0000-4000-8000-000000000001');
 assert e.id=e2.id;
 assert (select count(*) from public.secret_santa_participants where event_id=e.id)=1;
 assert (select count(*) from public.secret_santa_invites where event_id=e.id)=1;
end $$;
insert into public.wishlist(id,user_id,title,visibility_type,accent_type) values('f4000000-0000-4000-8000-000000000001',auth.uid(),'Offline private',2,0);
insert into public.item(id,wishlist_id,name) values('f5000000-0000-4000-8000-000000000001','f4000000-0000-4000-8000-000000000001','Offline child');
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
do $$
begin
 assert (select count(*) from public.wishlist where id='f4000000-0000-4000-8000-000000000001')=0, 'Private wishlist leaked across accounts';
 assert (select count(*) from public.item where id='f5000000-0000-4000-8000-000000000001')=0, 'Private wish leaked across accounts';
 begin
  perform public.create_friend_group('Steal',null,'pink','users','{}','f2000000-0000-4000-8000-000000000001');
  raise exception 'Owner check bypassed' using errcode='XX000';
 exception when raise_exception then null;
 end;
 begin
  perform public.create_secret_santa_event('Steal',now(),25,null,'[]','EUR','f3000000-0000-4000-8000-000000000001');
  raise exception 'Owner check bypassed' using errcode='XX000';
 exception when raise_exception or unique_violation then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
do $$
declare e public.secret_santa;
begin
 perform public.delete_secret_santa_event('f3000000-0000-4000-8000-000000000001');
 e := public.create_secret_santa_event('Legacy caller',now()+interval '30 days',25,null,'[]','EUR');
 assert e.id is not null, 'Legacy event caller failed';
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
 begin
  perform public.create_friend_group('Anonymous');
  raise exception 'Anonymous group create allowed' using errcode='XX000';
 exception when raise_exception then null;
 end;
 begin
  perform public.create_secret_santa_event('Anonymous',now(),25,null,'[]','EUR');
  raise exception 'Anonymous event create allowed' using errcode='XX000';
 exception when raise_exception then null;
 end;
end $$;
rollback;
select 'PASS: authenticated creates, repeat IDs, ownership checks, parent-child records and RLS isolation' as result;
