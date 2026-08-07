begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
set local role authenticated;

create temp table created_room as
select * from public.create_room('다정한 곰', 'bear', '안녕');

select is(
  (select count(*) from public.room_members),
  1::bigint,
  'creator occupies one room seat'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select lives_ok(
  format(
    'select * from public.join_room(%L, %L, %L, %L)',
    (select invite_token from created_room),
    '느긋한 여우',
    'fox',
    '만들고 있어요'
  ),
  'a second guest joins with the invite token'
);

select is(
  (select count(*) from public.room_members),
  2::bigint,
  'members of the same room can read both profiles'
);

do $$
declare
  member_number integer;
  token text := (select invite_token from created_room);
begin
  for member_number in 3..10 loop
    perform set_config(
      'request.jwt.claim.sub',
      '00000000-0000-0000-0000-' || lpad(member_number::text, 12, '0'),
      true
    );
    perform public.join_room(token, '방문자 ' || member_number, 'rabbit', '같이 있어요');
  end loop;
end;
$$;

select is(
  (select count(*) from public.room_members),
  10::bigint,
  'room has exactly ten members'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select throws_ok(
  format(
    'select * from public.join_room(%L, %L, %L, %L)',
    (select invite_token from created_room),
    '열한 번째 새',
    'bird',
    '자리가 있을까요'
  ),
  'P0001',
  'room_full',
  'the eleventh guest is rejected'
);

reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
set local role authenticated;
create temp table second_room as
select * from public.create_room('다정한 두더지', 'mole', '다른 방이에요');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);
select lives_ok(
  format(
    'select * from public.join_room(%L, %L, %L, %L)',
    (select invite_token from second_room),
    '다정한 다람쥐',
    'squirrel',
    '다른 방에 왔어요'
  ),
  'a guest joins a separate room'
);

select is(
  (select count(*) from public.room_members where room_id = (select room_id from created_room)),
  0::bigint,
  'a different room member cannot read the original room'
);

select is_empty(
  format(
    'update public.room_members set intro = %L where room_id = %L::uuid and user_id = %L::uuid returning *',
    '침입 시도',
    (select room_id from created_room),
    '00000000-0000-0000-0000-000000000001'
  ),
  'a guest cannot update another member'
);

reset role;
update public.rooms
set last_activity_at = now() - interval '31 days'
where id = (select room_id from second_room);
select public.cleanup_inactive_rooms();
select is(
  (select count(*) from public.room_members where room_id = (select room_id from second_room)),
  0::bigint,
  'cleanup removes members of inactive rooms'
);

select * from finish();
rollback;
