-- Revert de migration-documents-etiquettes-2026-09-11.sql

alter table documents drop column if exists etiquette_id;
drop trigger if exists trg_etiquettes_updated_at on etiquettes;
drop table if exists etiquettes;
