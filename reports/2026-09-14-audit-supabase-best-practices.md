# Audit Supabase / Postgres — best practices

Date : 2026-09-14 (mis à jour le 2026-09-14 avec le skill réel)
Projet Supabase audité : `kilio` (`vsmtkopkqasrdnjceegp`), Postgres 17.6, région `eu-west-3`
Branche : `kilio` @ `f50fa79` (audit initial), complété sur `kilio` après relecture avec le skill réel

**Portée** : audit uniquement, aucune modification appliquée au repo ni à la base.

> **Mise à jour méthodologique** : la première version de cet audit avait été menée sans le skill `supabase-postgres-best-practices` (introuvable dans cette session) et excluait explicitement la catégorie `security-`/RLS. Le skill a depuis été localisé dans le dépôt `vincenthassanaly-source/vincent-toolkit-marketplace` (`plugins/vincent-toolkit/skills/supabase-postgres-best-practices/`) et relu intégralement (33 fichiers de règles, catégories `query-`, `conn-`, `security-`, `schema-`, `lock-`, `data-`, `monitor-`, `advanced-`). Ce document intègre maintenant la vérification RLS/sécurité (section dédiée ci-dessous) et un nouvel écart `schema-` détecté grâce au skill réel (#8, clés primaires UUID v4). Le reste du contenu (écarts #1 à #7) a été revérifié en direct contre la base (`mcp__Supabase__get_advisors`, requêtes SQL) et reste valide sans changement.

---

## Résumé exécutif

| Sévérité | Nombre |
|---|---|
| Critique | 0 |
| Haute | 1 |
| Moyenne | 2 |
| Basse | 6 |
| **Total** | **9** |

La base est jeune (39 tables, 55+ migrations depuis le 27/08/2026), petite en volumétrie (quelques dizaines à quelques centaines de lignes par table), et globalement bien tenue : contraintes CHECK cohérentes, FK correctement déclarées, trigger `updated_at` générique et non dupliqué, séparation calcul/accès-données exemplaire sur le module Nutrition, la règle `ALTER TYPE ... ADD VALUE` dans une migration séparée est **déjà respectée** partout où un enum existant a été étendu, et la posture RLS deny-all + `service_role` est conforme à l'esprit de la règle `security-rls-basics` du skill compte tenu de l'architecture mono-utilisateur (détail ci-dessous).

Le seul écart classé Haute (#8, UUID v4 comme clés primaires) est un choix structurel sans impact mesurable aujourd'hui vu le volume actuel, mais coûteux à corriger rétroactivement une fois la base grossie — à corriger pour les nouvelles tables, pas nécessairement en rétroactif. Les autres écarts trouvés sont des optimisations préventives (index manquants sur des points chauds ou des FK) et du nettoyage mineur (code mort, hygiène de fonction), pas des bugs actifs.

---

## Vérification RLS / sécurité (section ajoutée après relecture du skill)

Le skill (`security-rls-basics.md`) prescrit : RLS activé + policies par utilisateur via `(select auth.uid())`, pour empêcher les fuites de données entre tenants. Kilio applique autre chose : RLS activé sur les 39 tables, **0 policy** (deny-all), tout l'accès passant par `service_role` côté serveur (`src/lib/supabase/admin.ts`), qui bypass RLS nativement — documenté dans `scripts/migration-enable-rls-deny-all-2026-09-11.sql`. Confirmé en direct sur la base (`select * from pg_policies where schemaname = 'public'` → 0 ligne ; `mcp__Supabase__get_advisors(type="security")` → lint `rls_enabled_no_policy` sur les 39 tables, niveau INFO, pas de policy manquante par erreur).

**Verdict : conforme à l'esprit de la règle, pas au pattern.** Le skill cible les fuites multi-tenant (exemple `orders`/`user_id`) ; Kilio est mono-utilisateur sans clé publique exposée côté client (module Auth retiré, `suppression_auth_2026_08_29`). Le deny-all + `service_role` est en réalité plus strict qu'un jeu de policies par `user_id`, puisqu'il bloque tout accès non-backend plutôt que de compter sur un filtre applicatif — exactement le risque que `security-rls-basics.md` désigne comme incorrect ("relying only on application to filter").

Point d'hygiène sans impact : `scripts/migration-rls-performance-2026-08-27.sql` contient encore d'anciennes policies par `user_id` sur des tables (`placard`, `listes_courses`, `listes_courses_items`) qui **n'existent plus** dans le schéma actuel (renommées/remplacées par `courses_items` etc.). Fichier d'historique mort — sans action requise, migrations non rejouées — mais à ne pas prendre comme description de l'architecture actuelle si on le relit plus tard.

Autres points sécurité de l'advisor, déjà couverts ou hors portée applicative :
- `function_search_path_mutable` sur `set_termine_le` → traité en #4.
- `extension_in_public` sur `pg_net` → traité en #7.
- "Leaked password protection" désactivée côté Auth → sans portée, module Auth supprimé de l'app.

---

## Vue d'ensemble de la base

- **39 tables** dans `public`, identique entre `src/lib/supabase/types.ts` et l'état réel de la DB (`mcp__Supabase__list_tables`) — **pas de décalage repo/DB constaté cette fois-ci**, contrairement à ce qui avait été observé par le passé.
- RLS activé sur les 39 tables, **0 policy** partout (deny-all volontaire, documenté dans la migration dédiée) → analysé dans la section « Vérification RLS / sécurité » ci-dessus.
- 4 jobs `pg_cron` actifs : `rappels-taches` (chaque minute), `rappels-documents` (06:00), `nettoyage-auto` (05:00), `suppression-taches-programme-jour` (00:05) — tous appellent une Edge Function via `pg_net`, ou une requête `DELETE` directe et bornée.
- Extensions notables installées : `pg_net` (0.20.4), `pg_cron` (1.6.4), `pg_stat_statements` (1.11), `pgcrypto`, `uuid-ossp`, `supabase_vault`. `pgvector`, `pgmq`, `postgis` **non installées** — cohérent avec les besoins actuels de l'app (pas de recherche sémantique, pas de file de messages).
- Fonctions PL/pgSQL : `set_updated_at()` et `set_termine_le()`, toutes deux en trigger `BEFORE UPDATE`, logique triviale sans I/O externe ni verrou long.

---

## Couverture (Phase 3 — vérification)

Les 39 tables ont été passées en revue systématiquement (colonnes/types via `types.ts` + `list_tables(verbose)`, index via `pg_indexes`, usage via `pg_stat_user_tables`/`pg_stat_user_indexes`, contraintes via `pg_constraint`, triggers via `information_schema.triggers`). Statut par table :

| Table | Écart(s) | Table | Écart(s) |
|---|---|---|---|
| aliments | — | note_items | — |
| budgets | — | notes | — |
| categories_budget | — | notes_tags | — |
| collection_items | — | objectif_entries | — |
| collections | — | objectif_etapes | — |
| comptes | — | objectifs | — |
| courses_items | — | objectifs_nutritionnels | — |
| document_fichiers | — | preferences_navigation | — |
| documents | — | push_subscriptions | — |
| documents_dossiers | — | recette_etapes | — |
| dossiers | — | recette_ingredients | — |
| etiquettes | — | recette_ingredients_libres | — |
| habitude_entries | — | recettes | — |
| habitudes | — | reglages_nettoyage | — |
| horaires_travail_creneaux | — | sous_taches | — |
| horaires_travail_exceptions | — | **taches** | #1 |
| journal_repas | — | taches_tags | — |
| listes_taches | — | tags | — |
| **transactions** | (index sains, cf. #2 pour la table liée) | **transactions_recurrentes** | #2 |

Deux tables portent des écarts propres (`taches`, `transactions_recurrentes`). Les autres écarts (#3 à #7) sont transverses (fonctions, code applicatif, hygiène générale) et ne sont pas rattachés à une table unique.

---

## Détail des écarts

### #1 — [MOYENNE] Query performance — `taches` : pas d'index sur les colonnes de filtrage dominantes

**Catégorie** : `query-` (index manquant sur colonnes filtrées fréquemment)
**Table/colonnes** : `public.taches` (`fait`, `programme_jour`, en combinaison avec `echeance`)

`pg_stat_user_tables` montre **20 212 seq scans** sur `taches` (136 lignes) contre seulement 358 scans d'index cumulés (`taches_pkey`: 306, `idx_taches_liste_id`: 48, `idx_taches_echeance`: 4). Le volume de tuples lus en seq scan (~1,85M cumulés, soit ~91 lignes lues par scan sur une table qui en compte 136) indique que la quasi-totalité des lectures scannent la table entière plutôt que de passer par un index — cohérent avec des requêtes qui filtrent sur `fait` et/ou `programme_jour`, colonnes non indexées.

Le job `pg_cron` `suppression-taches-programme-jour` fait d'ailleurs exactement ce filtre tous les jours à 00:05 :
```sql
delete from taches
where programme_jour = true and fait = false and echeance < current_date;
```
Sans conséquence mesurable aujourd'hui (table minuscule), mais ce pattern de filtre va rester le plus chaud de toute la base à mesure que `taches` grossit (c'est déjà, de loin, la table la plus sollicitée du schéma).

**Correction suggérée** (à valider avant application) :
```sql
create index idx_taches_a_faire on taches (liste_id, ordre) where fait = false;
create index idx_taches_programme_jour on taches (programme_jour, fait, echeance) where programme_jour = true;
```
Index partiels : peu coûteux à maintenir, ciblent exactement les deux patterns de lecture observés (vue "liste de tâches actives" et purge du programme du jour).

---

### #2 — [MOYENNE] Query performance — `transactions_recurrentes` : 3 clés étrangères sans index de couverture

**Catégorie** : `query-` (foreign keys non indexées — remonté aussi par `mcp__Supabase__get_advisors(type="performance")`, lint `unindexed_foreign_keys`)
**Table/colonnes** : `public.transactions_recurrentes.categorie_id`, `.compte_destination_id`, `.compte_id`

Ces trois FK n'ont pas d'index de couverture, contrairement aux mêmes colonnes sur `transactions` (`idx_transactions_categorie_id`, `idx_transactions_compte_id`, `idx_transactions_compte_destination_id` existent déjà). La table est vide en production aujourd'hui donc l'impact actuel est nul, mais :
- toute jointure ou filtre par compte/catégorie sur les transactions récurrentes sera un seq scan ;
- un `DELETE`/`UPDATE` en cascade sur `comptes` ou `categories_budget` devra scanner `transactions_recurrentes` sans index pour vérifier les FK, ce qui devient coûteux dès que la table contient des lignes.

**Correction suggérée** :
```sql
create index idx_transactions_recurrentes_compte_id on transactions_recurrentes (compte_id);
create index idx_transactions_recurrentes_compte_destination_id on transactions_recurrentes (compte_destination_id);
create index idx_transactions_recurrentes_categorie_id on transactions_recurrentes (categorie_id);
```
(L'index existant `idx_transactions_recurrentes_actives_prochaine` couvre déjà bien le cas de génération paresseuse documenté dans `src/app/actions/transactions-recurrentes.ts`.)

---

### #3 — [BASSE] Query performance — 16 index jamais utilisés

**Catégorie** : `query-` (index inutilisés, remonté par l'advisor performance, lint `unused_index`)
**Tables concernées** : `documents`, `note_items`, `notes_tags`, `aliments`, `journal_repas` (×2), `objectifs` (×2), `objectif_etapes`, `objectif_entries`, `transactions` (×2), `categories_budget`, `taches_tags`, `dossiers`, `documents_dossiers`.

La quasi-totalité de ces tables sont actuellement vides ou quasi vides (`objectifs`, `objectif_etapes`, `objectif_entries`, `notes`, `note_items`, `notes_tags`, `dossiers`, `documents_dossiers` ont 0 ligne). C'est un signal attendu en phase de démarrage et **pas une action à mener maintenant** : la plupart de ces index sont des index de FK ou de tri légitimes (`idx_objectifs_date_echeance`, `idx_objectif_etapes_objectif_id`, etc.) qui prendront leur utilité dès que ces modules seront réellement utilisés.

**Recommandation** : ne rien supprimer. Revérifier avec `mcp__Supabase__get_advisors(type="performance")` dans 1–2 mois d'usage réel ; ne considérer une suppression que pour un index encore inutilisé sur une table qui, elle, contient des données.

---

### #4 — [BASSE] Concurrency & locking — `set_termine_le()` sans `search_path` fixé

**Catégorie** : `lock-`/hygiène des triggers (le périmètre demandé couvre explicitement les triggers `set_updated_at()` et consorts)
**Fonction** : `public.set_termine_le()`

Les deux triggers génériques du projet n'ont pas la même robustesse : `set_updated_at()` est déclarée avec `SET search_path TO ''` (durcissement standard contre le détournement de `search_path`), mais `set_termine_le()` ne l'a pas — c'est d'ailleurs le seul écart que `mcp__Supabase__get_advisors(type="security")` relève sous `function_search_path_mutable`. Aucun risque de verrou bloquant identifié par ailleurs : les deux fonctions sont `BEFORE UPDATE FOR EACH ROW`, logique pure sans appel externe ni sous-requête — safe à ce niveau.

**Correction suggérée** :
```sql
alter function public.set_termine_le() set search_path = '';
```
Migration triviale, sans risque de verrou (ALTER FUNCTION ne verrouille pas les lignes des tables qui l'utilisent).

---

### #5 — [BASSE] Data access patterns — client Supabase mort (`src/lib/supabase/server.ts`)

**Catégorie** : `data-` (cohérence avec le pattern de référence mono-client `service_role`)
**Fichier** : `src/lib/supabase/server.ts`

Ce client (`createServerClient` + cookies, clé `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) n'est importé nulle part dans `src/` (`grep -rl "lib/supabase/server"` ne retourne aucun résultat hors le fichier lui-même). C'est un vestige de l'ancien flux d'authentification, retiré par la migration `suppression_auth_2026_08_29`. Tout le reste de l'app utilise exclusivement `createAdminClient()` (`service_role`, sans cookies), conformément au pattern mono-utilisateur du module Nutrition pris en référence.

Ce n'est pas un problème de base de données, mais un risque de confusion applicative : si ce client était un jour réutilisé par erreur, il pointerait vers une clé anon soumise au RLS deny-all (donc tout échouerait silencieusement en lecture/écriture), sans lien avec le reste de l'architecture.

**Correction suggérée** : supprimer `src/lib/supabase/server.ts` (et la variable d'env `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` si elle n'est utilisée nulle part ailleurs).

---

### #6 — [BASSE] Monitoring — pas de suivi des échecs des jobs `pg_cron` / Edge Functions

**Catégorie** : `monitor-`
**Concerné** : les 4 jobs `pg_cron` (`rappels-taches`, `rappels-documents`, `nettoyage-auto`, `suppression-taches-programme-jour`)

`pg_stat_statements` est installé (bon point, réutilisable pour du profiling de requêtes), mais rien ne surveille aujourd'hui les échecs des jobs `pg_cron` (`cron.job_run_details`) ni les erreurs des Edge Functions appelées via `pg_net`. Le module Nettoyage a bien un `reglages_nettoyage.derniere_execution` pour tracer sa dernière exécution — c'est le seul mécanisme de ce type dans le schéma.

**Recommandation** (pas de SQL à exécuter, une vérification ponctuelle suffit) : consulter périodiquement `select * from cron.job_run_details order by end_time desc limit 20;` (ou équivalent dans le dashboard Supabase) pour confirmer que les 4 jobs s'exécutent sans erreur, en particulier `rappels-taches` qui tourne chaque minute.

---

### #7 — [BASSE] Advanced features — extension `pg_net` dans le schéma `public`

**Catégorie** : `advanced-` / hygiène de schéma (remonté par l'advisor sécurité sous `extension_in_public`, mentionné ici pour complétude bien que catégorisé "security")
**Objet** : extension `pg_net`

`pg_net` (utilisée légitimement par les 4 jobs `pg_cron` pour appeler les Edge Functions — c'est l'usage recommandé par Supabase) est installée dans le schéma `public` plutôt que dans un schéma dédié (`extensions`, comme le sont déjà `pgcrypto` et `uuid-ossp`). Aucun impact fonctionnel, juste une convention d'hygiène de schéma à corriger le jour où une autre migration touche cette zone — pas une action isolée à mener seule (un déplacement d'extension nécessite de recréer les objets qui en dépendent).

---

### #8 — [HAUTE] Schema design — clés primaires en UUID v4 aléatoire sur 31 tables

**Catégorie** : `schema-` (`schema-primary-keys`, impact HIGH selon le skill)
**Tables concernées** : 31 des 33 tables à PK `uuid` (`aliments`, `budgets`, `categories_budget`, `collections`, `comptes`, `documents`, `journal_repas`, `notes`, `objectifs`, `recettes`, `taches`, `transactions`, etc. — vérifié via `information_schema.columns` sur toutes les colonnes `id` de type `uuid`).

Toutes ces PK utilisent `gen_random_uuid()` (UUID **v4**, complètement aléatoire) comme valeur par défaut. Le skill classe ce choix en impact HIGH : un UUID v4 disperse les insertions dans l'index B-tree de la PK au lieu de les faire croître en fin d'index comme un identifiant séquentiel, ce qui fragmente l'index et dégrade les performances d'écriture/lecture à mesure que la table grossit (`references/schema-primary-keys.md`).

Deux tables font exception avec des PK `bigint generated always as identity` (le pattern recommandé par le skill) : `horaires_travail_creneaux`, `horaires_travail_exceptions`.

Sur le volume actuel de Kilio (dizaines à centaines de lignes par table), l'impact réel est nul — la fragmentation d'index ne devient sensible qu'à partir de tables de taille significative. Ce n'est donc pas un correctif urgent, et une migration rétroactive de 31 PK serait lourde (toutes les FK qui y pointent devraient être migrées en cascade) pour un bénéfice actuellement inexistant.

**Recommandation** : ne rien changer rétroactivement sur les tables existantes. Pour toute **nouvelle table**, préférer `bigint generated always as identity` (standard SQL, simple, pas d'extension requise) ou, si un identifiant non-séquentiel/exposable publiquement est nécessaire, une UUID v7 via l'extension `pg_uuidv7` (non installée aujourd'hui) plutôt que `gen_random_uuid()`.

---

### #9 — [BASSE] Schema design — `preferences_navigation.id` en `integer` plutôt que `bigint`

**Catégorie** : `schema-` (`schema-data-types`)
**Table/colonne** : `public.preferences_navigation.id`

Seule colonne `id` du schéma qui n'est ni `uuid` ni `bigint` : elle est `integer`. Le skill recommande `bigint` pour toute PK ("future-proofing", `references/schema-data-types.md`). Impact nul en pratique — `preferences_navigation` est une table de réglages à une ligne par nature, jamais susceptible d'approcher la limite de l'`integer` (2,1 milliards). Signalé pour complétude/cohérence uniquement.

---

## Liste priorisée des actions recommandées

1. **[Moyenne]** `taches` — ajouter les deux index partiels ciblant `fait`/`programme_jour` (#1).
2. **[Moyenne]** `transactions_recurrentes` — indexer les 3 FK (#2), avant mise en production réelle du module transactions récurrentes.
3. **[Basse]** `set_termine_le()` — fixer `search_path = ''` par cohérence avec `set_updated_at()` (#4).
4. **[Basse]** Supprimer `src/lib/supabase/server.ts`, vestige mort de l'ancien flux auth (#5).
5. **[Basse]** Vérifier ponctuellement `cron.job_run_details` pour confirmer la bonne santé des 4 jobs `pg_cron` (#6).
6. **[Basse]** Ne rien faire sur les 16 index "inutilisés" avant 1–2 mois d'usage réel (#3) ; re-router `pg_net` vers le schéma `extensions` à l'occasion d'une prochaine migration touchant ce périmètre (#7).
7. **[Haute, sans urgence]** Adopter `bigint identity` (ou UUID v7) au lieu de `gen_random_uuid()` pour les **nouvelles** tables (#8) ; ne pas migrer les 31 tables existantes rétroactivement sans raison métier.
8. **[Basse]** Ne rien faire sur `preferences_navigation.id` (#9), cohérence pure.

---

## Connexions (`conn-*`) — non applicable

Vérifié dans le code : l'app (Server Actions) et les 3 Edge Functions (`envoyer-rappels-documents`, `envoyer-rappels-taches`, `nettoyage-auto`) utilisent exclusivement `@supabase/supabase-js`, qui parle REST/PostgREST en HTTPS — aucune connexion directe au protocole filaire Postgres (pas de `pg.Client`/`postgres()` trouvé). Les règles `conn-pooling`, `conn-limits`, `conn-idle-timeout` et `conn-prepared-statements` du skill concernent des connexions Postgres directes gérées côté infra (pooler Supavisor) : rien à auditer côté code applicatif Kilio.
