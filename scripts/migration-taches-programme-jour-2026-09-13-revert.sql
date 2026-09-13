-- Revert de migration-taches-programme-jour-2026-09-13.sql.

select cron.unschedule('suppression-taches-programme-jour');

alter table taches drop column programme_jour;
