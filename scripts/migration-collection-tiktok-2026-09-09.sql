-- Ajout des liens vidéo TikTok au module Collection (`collection_items`),
-- en plus des photos déjà supportées.
--
-- Pas de type enum Postgres : un `check` constraint suffit et évite le
-- problème connu d'`ALTER TYPE ... ADD VALUE` (transaction séparée). Pas de
-- nouveau trigger : `trg_collection_items_updated_at` (set_updated_at())
-- déjà en place couvre aussi ces nouvelles colonnes.

alter table collection_items
  add column type text not null default 'photo' check (type in ('photo', 'tiktok')),
  add column thumbnail_url text;
