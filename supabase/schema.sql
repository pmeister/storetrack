-- StoreTrack schema. Run this whole file in the Supabase SQL Editor.
-- Source of truth for tables, RLS, RPCs, and the profile trigger.

-- ============================================================ tables

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  household_id uuid references households on delete set null,
  display_name text not null default '',
  nickname text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name text not null,
  position text not null,
  updated_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  store_id uuid not null references stores on delete cascade,
  name text not null,
  position text not null,
  updated_by uuid
);

create table if not exists list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  store_id uuid not null references stores on delete cascade,
  section_id uuid references sections on delete set null,
  name text not null,
  quantity int not null default 1,
  checked boolean not null default false,
  position text not null,
  updated_by uuid,
  created_at timestamptz not null default now()
);

-- append-only log behind the Activity screen, filled by the log_activity
-- trigger below
create table if not exists activity_events (
  id bigserial primary key,
  household_id uuid not null references households on delete cascade,
  op text not null,
  table_name text not null,
  record jsonb,
  old_record jsonb,
  at timestamptz not null
);

-- stamp the acting user on every insert/update (delete attribution is the
-- last editor, since a deleted row can't record its deleter)
create or replace function set_updated_by() returns trigger
language plpgsql as $$
begin
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists set_updated_by_stores on stores;
create trigger set_updated_by_stores
  before insert or update on stores
  for each row execute function set_updated_by();

drop trigger if exists set_updated_by_sections on sections;
create trigger set_updated_by_sections
  before insert or update on sections
  for each row execute function set_updated_by();

drop trigger if exists set_updated_by_list_items on list_items;
create trigger set_updated_by_list_items
  before insert or update on list_items
  for each row execute function set_updated_by();

create index if not exists stores_household_idx on stores (household_id);
create index if not exists sections_store_idx on sections (store_id);
create index if not exists list_items_store_idx on list_items (store_id);
create index if not exists list_items_household_idx on list_items (household_id);
create index if not exists activity_events_household_idx
  on activity_events (household_id, at desc);

-- record every change into activity_events. Runs AFTER set_updated_by, so
-- the captured row already carries the acting user.
create or replace function log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_household uuid;
begin
  if tg_op = 'DELETE' then
    v_household := old.household_id;
  else
    v_household := new.household_id;
  end if;

  insert into activity_events (household_id, op, table_name, record, old_record, at)
  values (
    v_household,
    tg_op,
    tg_table_name,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    now()
  );
  return null;
end $$;

drop trigger if exists log_activity_stores on stores;
create trigger log_activity_stores
  after insert or update or delete on stores
  for each row execute function log_activity();

drop trigger if exists log_activity_sections on sections;
create trigger log_activity_sections
  after insert or update or delete on sections
  for each row execute function log_activity();

drop trigger if exists log_activity_list_items on list_items;
create trigger log_activity_list_items
  after insert or update or delete on list_items
  for each row execute function log_activity();

-- ============================================================ helper

create or replace function current_household_id() returns uuid
language sql stable security definer set search_path = public as
$$ select household_id from profiles where id = auth.uid() $$;

-- ============================================================ RLS

alter table households enable row level security;
alter table profiles enable row level security;
alter table stores enable row level security;
alter table sections enable row level security;
alter table list_items enable row level security;
alter table activity_events enable row level security;

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (id = auth.uid()
         or (household_id is not null and household_id = current_household_id()));

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists households_select on households;
create policy households_select on households for select
  using (id = current_household_id());

drop policy if exists households_update on households;
create policy households_update on households for update
  using (id = current_household_id()) with check (id = current_household_id());

drop policy if exists household_all on stores;
create policy household_all on stores for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

drop policy if exists household_all on sections;
create policy household_all on sections for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

drop policy if exists household_all on list_items;
create policy household_all on list_items for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

-- Read-only to members: only the log_activity trigger writes here, so the
-- log can't be forged or edited from the app.
drop policy if exists activity_read on activity_events;
create policy activity_read on activity_events for select
  using (household_id = current_household_id());

-- ============================================================ RPCs

-- Creates a household and puts the caller in it.
create or replace function create_household(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into households (name) values (p_name) returning id into v_id;
  update profiles set household_id = v_id where id = auth.uid();
  return v_id;
end $$;

-- Joins the household matching the invite code (case-insensitive).
create or replace function join_household(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select id into v_id from households where invite_code = upper(trim(p_code));
  if v_id is null then
    raise exception 'invalid invite code';
  end if;
  update profiles set household_id = v_id where id = auth.uid();
  return v_id;
end $$;

-- ============================================================ profile trigger

-- Email signup sends display_name; Google and most OIDC providers send
-- full_name / name instead.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
