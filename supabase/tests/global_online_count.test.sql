begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(
  has_function_privilege('authenticated', 'public.get_global_online_count()', 'execute'),
  'authenticated guests can read the aggregate online count'
);

select ok(
  not has_function_privilege('anon', 'public.get_global_online_count()', 'execute'),
  'unauthenticated visitors cannot read the aggregate online count'
);

insert into public.rooms (id)
values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002');

insert into public.room_members (
  room_id,
  user_id,
  display_name,
  species,
  intro,
  last_seen_at
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '첫 번째 곰',
    'bear',
    '첫 번째 방',
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '첫 번째 곰',
    'bear',
    '두 번째 방에도 있어요',
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '오래된 여우',
    'fox',
    '연결이 끊겼어요',
    now() - interval '16 seconds'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    '온라인 토끼',
    'rabbit',
    '지금 함께 있어요',
    now() - interval '14 seconds'
  );

select is(
  public.get_global_online_count(),
  2::bigint,
  'the aggregate counts distinct recently connected users only'
);

update public.room_members
set last_seen_at = now() - interval '16 seconds';

select is(
  public.get_global_online_count(),
  0::bigint,
  'the aggregate drops users after the offline threshold'
);

select * from finish();
rollback;
