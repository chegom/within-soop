create index room_members_last_seen_user_idx
on public.room_members (last_seen_at, user_id);

create function public.get_global_online_count()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(distinct member.user_id)
  from public.room_members as member
  where member.last_seen_at >= now() - interval '15 seconds';
$$;

revoke all on function public.get_global_online_count() from public, anon;
grant execute on function public.get_global_online_count() to authenticated;
