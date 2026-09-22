-- Revert de migration-collection-youtube-2026-09-22.sql.
--
-- Échoue tant qu'il reste des collection_items de type 'youtube' : les
-- supprimer (ou les convertir) avant d'appliquer ce revert.

alter table collection_items
  drop constraint collection_items_type_check,
  add constraint collection_items_type_check check (type in ('photo', 'tiktok'));
