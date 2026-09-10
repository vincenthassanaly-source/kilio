-- Revert de migration-documents-dossiers-2026-09-11.sql

drop table if exists documents_dossiers;
drop trigger if exists trg_dossiers_updated_at on dossiers;
drop table if exists dossiers;
