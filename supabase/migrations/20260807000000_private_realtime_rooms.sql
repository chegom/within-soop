create extension if not exists pgcrypto with schema extensions;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  max_members smallint not null default 10 check (max_members = 10),
  last_activity_at timestamptz not null default now()
);

create table public.room_invites (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  display_name text not null check (char_length(display_name) between 1 and 24),
  species text not null check (species in ('bear', 'rabbit', 'mole', 'bird', 'fox', 'squirrel')),
  intro text not null check (char_length(intro) between 1 and 28),
  active boolean not null default false,
  started_at timestamptz,
  last_seen_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index room_members_user_room_idx on public.room_members(user_id, room_id);

alter table public.rooms enable row level security;
alter table public.room_invites enable row level security;
alter table public.room_members enable row level security;

create function public.require_room_profile(
  p_display_name text,
  p_species text,
  p_intro text
)
returns void
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if char_length(trim(coalesce(p_display_name, ''))) not between 1 and 24 then
    raise exception 'invalid_display_name' using errcode = 'P0001';
  end if;

  if p_species not in ('bear', 'rabbit', 'mole', 'bird', 'fox', 'squirrel') then
    raise exception 'invalid_species' using errcode = 'P0001';
  end if;

  if char_length(trim(coalesce(p_intro, ''))) not between 1 and 28 then
    raise exception 'invalid_intro' using errcode = 'P0001';
  end if;
end;
$$;

create function public.is_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.room_members
    where room_id = target_room_id
      and user_id = auth.uid()
  );
$$;

create function public.create_room(
  p_display_name text,
  p_species text,
  p_intro text
)
returns table (
  room_id uuid,
  invite_token text,
  invite_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  new_room_id uuid;
  new_token text;
  expires_at timestamptz := now() + interval '7 days';
begin
  if caller_id is null then
    raise exception 'unauthenticated' using errcode = 'P0001';
  end if;

  perform public.require_room_profile(p_display_name, p_species, p_intro);

  insert into public.rooms default values
  returning id into new_room_id;

  new_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.room_invites (room_id, token_hash, expires_at)
  values (
    new_room_id,
    encode(extensions.digest(new_token, 'sha256'), 'hex'),
    expires_at
  );

  insert into public.room_members (room_id, user_id, display_name, species, intro)
  values (
    new_room_id,
    caller_id,
    trim(p_display_name),
    p_species,
    trim(p_intro)
  );

  return query select new_room_id, new_token, expires_at;
end;
$$;

create function public.join_room(
  p_invite_token text,
  p_display_name text,
  p_species text,
  p_intro text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  target_room_id uuid;
  invite_expires_at timestamptz;
  member_count integer;
begin
  if caller_id is null then
    raise exception 'unauthenticated' using errcode = 'P0001';
  end if;

  perform public.require_room_profile(p_display_name, p_species, p_intro);

  select invite.room_id, invite.expires_at
  into target_room_id, invite_expires_at
  from public.room_invites as invite
  join public.rooms as room on room.id = invite.room_id
  where invite.token_hash = encode(extensions.digest(p_invite_token, 'sha256'), 'hex')
  for update of room;

  if target_room_id is null then
    raise exception 'invalid_invite' using errcode = 'P0001';
  end if;

  if invite_expires_at <= now() then
    raise exception 'expired_invite' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.room_members
    where room_id = target_room_id and user_id = caller_id
  ) then
    update public.room_members
    set display_name = trim(p_display_name),
        species = p_species,
        intro = trim(p_intro),
        last_seen_at = now()
    where room_id = target_room_id and user_id = caller_id;
    return target_room_id;
  end if;

  select count(*) into member_count
  from public.room_members
  where room_id = target_room_id;

  if member_count >= 10 then
    raise exception 'room_full' using errcode = 'P0001';
  end if;

  insert into public.room_members (room_id, user_id, display_name, species, intro)
  values (
    target_room_id,
    caller_id,
    trim(p_display_name),
    p_species,
    trim(p_intro)
  );

  return target_room_id;
end;
$$;

create function public.touch_room_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.rooms
  set last_activity_at = now()
  where id = new.room_id;
  return new;
end;
$$;

create function public.broadcast_room_member_change()
returns trigger
language plpgsql
security definer
set search_path = public, realtime, pg_temp
as $$
begin
  perform realtime.broadcast_changes(
    'room:' || new.room_id::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return new;
end;
$$;

create trigger touch_room_activity_before_change
before insert or update on public.room_members
for each row execute function public.touch_room_activity();

create trigger broadcast_room_member_change_after_change
after insert or update on public.room_members
for each row execute function public.broadcast_room_member_change();

create function public.cleanup_inactive_rooms()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.rooms
  where last_activity_at < now() - interval '30 days';
end;
$$;

revoke all on public.rooms from anon, authenticated;
revoke all on public.room_invites from anon, authenticated;
revoke all on public.room_members from anon, authenticated;
revoke all on function public.require_room_profile(text, text, text) from public;
revoke all on function public.is_room_member(uuid) from public;
revoke all on function public.create_room(text, text, text) from public;
revoke all on function public.join_room(text, text, text, text) from public;
revoke all on function public.cleanup_inactive_rooms() from public;

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.create_room(text, text, text) to authenticated;
grant execute on function public.join_room(text, text, text, text) to authenticated;
grant select on public.room_members to authenticated;
grant update (display_name, species, intro, active, started_at, last_seen_at)
on public.room_members to authenticated;

create policy "room members can read member profiles"
on public.room_members for select to authenticated
using (public.is_room_member(room_id));

create policy "members update only themselves"
on public.room_members for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "room members read private broadcasts"
on realtime.messages for select to authenticated
using (
  (select realtime.topic()) like 'room:%'
  and public.is_room_member(split_part((select realtime.topic()), ':', 2)::uuid)
);

create policy "room members send private broadcasts"
on realtime.messages for insert to authenticated
with check (
  (select realtime.topic()) like 'room:%'
  and public.is_room_member(split_part((select realtime.topic()), ':', 2)::uuid)
);
