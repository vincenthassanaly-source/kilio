-- Revert de migration-documents-etiquettes-champs-2026-09-11.sql

alter table document_fichiers drop column if exists role;
alter table documents drop column if exists periode_mois;
delete from etiquettes where nom = 'Facture';
alter table etiquettes drop column if exists type_champs;
