-- Revert de migration-cron-rappels-documents-2026-09-11.sql.
--
-- Ne touche ni aux secrets Vault (project_url, publishable_key) ni à
-- l'extension pg_cron : ils sont partagés avec le job rappels-taches.

select cron.unschedule('rappels-documents');
