-- Revert de migration-collection-tiktok-2026-09-09.sql.

alter table collection_items
  drop column if exists type,
  drop column if exists thumbnail_url;
