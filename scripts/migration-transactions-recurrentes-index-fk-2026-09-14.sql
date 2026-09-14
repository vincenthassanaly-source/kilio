-- Audit reports/2026-09-14-audit-supabase-best-practices.md, écart #2 :
-- `transactions_recurrentes` avait 3 FK sans index de couverture
-- (categorie_id, compte_id, compte_destination_id), contrairement aux
-- mêmes colonnes sur `transactions`. Remonté aussi par
-- mcp__Supabase__get_advisors(type="performance"), lint
-- `unindexed_foreign_keys`. Sans impact aujourd'hui (table vide), mais
-- toute jointure/filtre par compte ou catégorie, ainsi qu'un DELETE/UPDATE
-- en cascade depuis `comptes`/`categories_budget`, deviendrait un seq scan
-- dès que la table contient des lignes.
--
-- Appliquée via mcp__Supabase__apply_migration (nom :
-- add_index_transactions_recurrentes_fk).

create index idx_transactions_recurrentes_compte_id on transactions_recurrentes (compte_id);
create index idx_transactions_recurrentes_compte_destination_id on transactions_recurrentes (compte_destination_id);
create index idx_transactions_recurrentes_categorie_id on transactions_recurrentes (categorie_id);
