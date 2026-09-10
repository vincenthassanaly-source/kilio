-- Revert de migration-documents-2026-09-11.sql

drop trigger if exists trg_documents_updated_at on documents;
drop table if exists documents;

drop policy if exists "documents_fichiers_select" on storage.objects;
drop policy if exists "documents_fichiers_insert" on storage.objects;
drop policy if exists "documents_fichiers_delete" on storage.objects;

delete from storage.buckets where id = 'documents-fichiers';
