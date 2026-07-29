-- Migration: user attribution + nicknames. Paste into the SQL Editor and run.
-- (Also folded into schema.sql for fresh installs.)

alter table profiles add column if not exists nickname text not null default '';

alter table stores add column if not exists updated_by uuid;
alter table sections add column if not exists updated_by uuid;
alter table list_items add column if not exists updated_by uuid;

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
