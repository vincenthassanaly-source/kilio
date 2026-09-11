# Nettoyage automatique des items « fait »/« coché »

## Contexte

Nouveau réglage « Nettoyage automatique » (page Réglages) qui supprime
définitivement, chaque jour, tous les items marqués « fait »/« coché »
depuis plus de N jours (30 par défaut), dans tous les modules concernés :
Tâches, Sous-tâches, Étapes d'objectifs, Liste de courses, Checklists de
notes.

Aucune de ces 5 tables n'avait de colonne dédiée au passage à « fait »/
« coché » avant cette session — `updated_at` n'est pas fiable comme proxy
(il change à chaque édition, pas seulement au passage à « fait »). Une vraie
colonne `termine_le`, maintenue par trigger, a donc été ajoutée.

Avant toute modification, l'état réel de la base Supabase (projet
`vsmtkopkqasrdnjceegp`) a été vérifié via `list_tables`/`execute_sql` :
colonnes, triggers `set_updated_at()` existants et contraintes FK
correspondaient exactement à `src/lib/supabase/types.ts` — aucun décalage
repo/DB constaté cette fois-ci.

## Fichiers ajoutés

- `scripts/migration-nettoyage-auto-2026-09-11.sql` — ajoute la colonne
  `termine_le timestamptz null` sur `taches`, `sous_taches`,
  `objectif_etapes`, `courses_items`, `note_items` ; crée une fonction
  trigger générique `set_termine_le()` (lit dynamiquement la colonne statut
  — `fait` ou `coche` selon `tg_table_name` — via `to_jsonb`, plutôt qu'une
  fonction par table) attachée en `BEFORE UPDATE` sur les 5 tables ; crée la
  table singleton `reglages_nettoyage` (id fixé à 1, contrainte check, sur
  le modèle exact de `preferences_navigation`) avec sa ligne par défaut
  (`actif = true`, `delai_jours = 30`) ; planifie le job `nettoyage-auto`
  (`0 5 * * *`, soit 5h UTC, avant `rappels-taches`/`rappels-documents` à
  6h) via `cron.schedule` + `net.http_post`, en réutilisant tel quel les
  secrets Vault `project_url`/`publishable_key` déjà en place (pas de
  recréation de `pg_cron` ni des secrets).
- `scripts/migration-nettoyage-auto-2026-09-11-revert.sql` — symétrique :
  `cron.unschedule`, drop table/triggers/fonction/colonnes, sans toucher aux
  secrets Vault, à `pg_cron` ni à `set_updated_at()`.
- `supabase/functions/nettoyage-auto/index.ts` — Edge Function Deno, sur le
  modèle de `envoyer-rappels-documents/index.ts` (client Supabase avec
  `SUPABASE_SERVICE_ROLE_KEY`, même style). Lit la ligne unique de
  `reglages_nettoyage` ; si `actif = false`, retourne `{ message: "Nettoyage
  désactivé." }` sans rien supprimer ; sinon, pour chacune des 5 tables,
  supprime les lignes où `termine_le is not null and termine_le < now() -
  delai_jours jours`, journalise le nombre de lignes supprimées par table
  dans la réponse, puis met à jour `derniere_execution = now()` sur
  `reglages_nettoyage`. Pas d'ordre de suppression particulier requis :
  vérifié en base que `sous_taches.tache_id → taches` et
  `note_items.note_id → notes` sont les seules FK impliquant ces 5 tables,
  toutes deux `ON DELETE CASCADE` mais dans le sens parent→enfant ; on ne
  supprime ici que les enfants (items), jamais les parents (tâches, notes),
  donc aucune cascade n'est déclenchée par ces suppressions.
- `src/app/actions/nettoyage.ts` — `getReglagesNettoyage()` et
  `updateReglagesNettoyage(actif, delaiJours)`, sur le modèle de
  `preferences-navigation.ts` (`revalidatePath("/reglages")`).
  `updateReglagesNettoyage` rejette un `delaiJours` non entier ou < 1.
- `src/app/(app)/reglages/NettoyageAutoRow.tsx` — nouvelle ligne de réglage,
  même style visuel que `AppearanceRow`/`NotificationsRow` : toggle actif/
  inactif, champ numérique pour le délai en jours (masqué quand inactif),
  affichage de `derniere_execution` (« Dernier nettoyage : 10 sept. 2026 »)
  si disponible. Persiste au toggle et au blur du champ délai (avec
  validation client + fallback à la valeur précédente si invalide).

## Fichiers modifiés

- `src/lib/supabase/types.ts` — régénéré via
  `mcp__Supabase__generate_typescript_types` (diff vérifié : uniquement
  l'ajout de `termine_le` sur les 5 tables et de la table
  `reglages_nettoyage`, rien d'autre).
- `src/app/(app)/reglages/page.tsx` — page passée en `async`, appelle
  `getReglagesNettoyage()` et rend `<NettoyageAutoRow>` entre
  `NotificationsRow` et la ligne « Profil ».
- `src/app/(app)/reglages/loading.tsx` — skeleton passé de 4 à 5 lignes.
- `src/app/(app)/courses/AddCourseForm.tsx`,
  `src/app/actions/notes.ts`, `src/app/actions/taches.ts` — ajustés pour la
  nouvelle colonne `termine_le` (objet optimiste `courses_items`, colonnes
  explicitement sélectionnées pour `note_items`/`sous_taches` dans les
  requêtes avec relations) ; changements requis par TypeScript suite à
  l'ajout de la colonne, aucun changement de comportement.

## Statut du déploiement Supabase (projet `vsmtkopkqasrdnjceegp`)

- **Migration** appliquée via `mcp__Supabase__apply_migration` — vérifiée
  via `execute_sql` : les 5 colonnes `termine_le` existent, les 5 triggers
  `trg_*_termine_le` + `trg_reglages_nettoyage_updated_at` existent, la
  table `reglages_nettoyage` contient sa ligne unique (`actif = true`,
  `delai_jours = 30`, `derniere_execution = null`). Comportement du trigger
  testé en base (insert + update `coche` false→true→false sur une ligne de
  test dans `courses_items`, puis nettoyage) : `termine_le` se fixe
  correctement à `now()` puis se remet à `null`.
- **Edge Function** `nettoyage-auto` déployée via
  `mcp__Supabase__deploy_edge_function` — statut `ACTIVE`, version 1,
  `verify_jwt: true` (confirmé via `list_edge_functions`).
- **Cron** : le job `nettoyage-auto` (schedule `0 5 * * *`, actif) apparaît
  dans `cron.job` aux côtés de `rappels-taches` et `rappels-documents`
  (confirmé via `execute_sql`).
- Secrets Vault `project_url`/`publishable_key` et extension `pg_cron` :
  déjà présents, réutilisés sans recréation.

## Vérifications (Phase 3)

- `npx tsc --noEmit` : OK — seule erreur restante
  (`src/app/layout.tsx(41,50): Cannot find name 'LayoutProps'`) confirmée
  préexistante sur `kilio` avant cette session (reproduite via `git stash`
  sur l'arbre propre), sans lien avec ce changement.
- `npx eslint .` : OK, aucune erreur.
- `npm run build` : build de production réussi (Next.js/Turbopack,
  Next.js 16.3.3) ; `/reglages` apparaît en route dynamique (ƒ), cohérent
  avec son passage en Server Component `async`.

## Points restants côté Vincent

Aucun. Le réglage est utilisable immédiatement dans l'app (page Réglages),
et le nettoyage tournera automatiquement chaque jour à 5h UTC sans action
supplémentaire.
