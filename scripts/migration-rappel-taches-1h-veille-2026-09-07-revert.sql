-- Revert de migration-rappel-taches-1h-veille-2026-09-07.sql.
--
-- Attention : si des tâches ont déjà rappel_minutes = 60 ou 1440 au moment
-- du revert, cette contrainte échouera (violation de check constraint) tant
-- que ces lignes n'ont pas été corrigées manuellement — non géré
-- automatiquement ici.

alter table taches drop constraint taches_rappel_minutes_check;

alter table taches
  add constraint taches_rappel_minutes_check
  check (rappel_minutes is null or rappel_minutes in (5, 15, 30));
