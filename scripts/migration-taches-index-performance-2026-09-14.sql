-- Audit reports/2026-09-14-audit-supabase-best-practices.md, écart #1 :
-- pg_stat_user_tables montrait ~20 200 seq scans sur `taches` (136 lignes)
-- contre 358 scans d'index cumulés, cohérent avec des requêtes filtrant sur
-- `fait`/`programme_jour` sans index dédié. Deux index partiels ciblant les
-- deux patterns de lecture observés : la vue "liste de tâches actives" et
-- le job pg_cron `suppression-taches-programme-jour` (00:05, filtre exact
-- programme_jour = true and fait = false and echeance < current_date).
--
-- Appliquée via mcp__Supabase__apply_migration (nom :
-- add_index_taches_actives_et_programme_jour).

create index idx_taches_a_faire on taches (liste_id, ordre) where fait = false;
create index idx_taches_programme_jour on taches (programme_jour, fait, echeance) where programme_jour = true;
