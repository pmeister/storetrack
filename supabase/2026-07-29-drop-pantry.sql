-- Migration: remove the pantry feature entirely.
-- WARNING: this permanently deletes all pantry_items rows.

alter table list_items drop column if exists pantry_item_id;
drop table if exists pantry_items;
