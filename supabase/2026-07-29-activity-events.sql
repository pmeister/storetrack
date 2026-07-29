-- Migration: materialized read model for the Activity log.
-- The Kafka consumer drains new messages into this table; the app reads the
-- table directly so the screen renders instantly instead of replaying the
-- whole topic on every visit.

create table if not exists activity_events (
  id bigserial primary key,
  household_id uuid not null references households on delete cascade,
  op text not null,
  table_name text not null,
  record jsonb,
  old_record jsonb,
  at timestamptz not null,
  kafka_partition int not null,
  kafka_offset bigint not null
);

-- makes the drain idempotent: replayed messages collide and are ignored
create unique index if not exists activity_events_offset_idx
  on activity_events (kafka_partition, kafka_offset);

create index if not exists activity_events_household_idx
  on activity_events (household_id, at desc);

alter table activity_events enable row level security;

-- Read-only to members. There is deliberately no insert/update/delete policy:
-- only the drain function (service role) writes, so the log can't be forged
-- or edited from the app.
drop policy if exists activity_read on activity_events;
create policy activity_read on activity_events for select
  using (household_id = current_household_id());
