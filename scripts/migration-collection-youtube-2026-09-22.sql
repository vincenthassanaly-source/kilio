-- Ajout des liens vidéo YouTube au module Collection (`collection_items`),
-- en plus des photos et des liens TikTok déjà supportés.
--
-- `type` est une colonne `text` avec un `check` constraint (pas un enum
-- Postgres) : on remplace simplement la contrainte existante
-- `collection_items_type_check` par une version élargie. `thumbnail_url`
-- existe déjà et sert aussi bien pour TikTok que pour YouTube.

alter table collection_items
  drop constraint collection_items_type_check,
  add constraint collection_items_type_check check (type in ('photo', 'tiktok', 'youtube'));
