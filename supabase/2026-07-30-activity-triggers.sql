-- Migration: record activity with a database trigger instead of the round trip
-- through Kafka. Events now land in activity_events the instant a change
-- happens, with no webhook, serverless function, or consumer involved.

-- 1. the webhook triggers that produced to Kafka are no longer needed
drop trigger if exists kafka_webhook_stores on public.stores;
drop trigger if exists kafka_webhook_sections on public.sections;
drop trigger if exists kafka_webhook_list_items on public.list_items;

-- 2. nothing tracks Kafka offsets anymore
drop index if exists activity_events_offset_idx;
alter table activity_events drop column if exists kafka_partition;
alter table activity_events drop column if exists kafka_offset;

-- 3. write straight into the log. Runs AFTER the set_updated_by trigger, so
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

-- 4. let the Activity feed update live like the rest of the app
do $$ begin
  alter publication supabase_realtime add table activity_events;
exception when duplicate_object then null;
end $$;
