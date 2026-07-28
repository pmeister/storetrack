-- Streams every data change to Kafka via the Vercel function api/kafka-webhook.
-- Before running: Dashboard → Database → Webhooks → enable webhooks once
-- (this creates the supabase_functions schema), then replace the two
-- placeholders below and run this file in the SQL Editor.
--
--   <WEBHOOK_URL>    e.g. https://storetrack-xi.vercel.app/api/kafka-webhook
--   <WEBHOOK_SECRET> must match the WEBHOOK_SECRET env var on Vercel

drop trigger if exists kafka_webhook_stores on public.stores;
create trigger kafka_webhook_stores
  after insert or update or delete on public.stores
  for each row execute function supabase_functions.http_request(
    '<WEBHOOK_URL>', 'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}', '5000'
  );

drop trigger if exists kafka_webhook_sections on public.sections;
create trigger kafka_webhook_sections
  after insert or update or delete on public.sections
  for each row execute function supabase_functions.http_request(
    '<WEBHOOK_URL>', 'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}', '5000'
  );

drop trigger if exists kafka_webhook_list_items on public.list_items;
create trigger kafka_webhook_list_items
  after insert or update or delete on public.list_items
  for each row execute function supabase_functions.http_request(
    '<WEBHOOK_URL>', 'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}', '5000'
  );
