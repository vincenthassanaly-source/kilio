-- Revert de migration-nettoyage-auto-2026-09-11.sql.
--
-- Ne touche ni aux secrets Vault (project_url, publishable_key), ni à
-- l'extension pg_cron, ni à la fonction set_updated_at() : partagés avec
-- d'autres modules.

select cron.unschedule('nettoyage-auto');

drop trigger if exists trg_reglages_nettoyage_updated_at on reglages_nettoyage;
drop table if exists reglages_nettoyage;

drop trigger if exists trg_note_items_termine_le on note_items;
drop trigger if exists trg_courses_items_termine_le on courses_items;
drop trigger if exists trg_objectif_etapes_termine_le on objectif_etapes;
drop trigger if exists trg_sous_taches_termine_le on sous_taches;
drop trigger if exists trg_taches_termine_le on taches;

drop function if exists set_termine_le();

alter table note_items drop column if exists termine_le;
alter table courses_items drop column if exists termine_le;
alter table objectif_etapes drop column if exists termine_le;
alter table sous_taches drop column if exists termine_le;
alter table taches drop column if exists termine_le;
