# Tâches "du jour" à suppression automatique — 2026-09-13

## Résumé de la feature

Ajout d'un flag `programme_jour` sur `taches`, réglable depuis le formulaire ("Tâche du jour", avec texte d'aide "Sera supprimée automatiquement si non cochée à la fin de la journée."). Une tâche ainsi marquée est **supprimée définitivement** (pas archivée) si elle n'est pas cochée `fait` une fois son échéance passée — via un job `pg_cron` nocturne. Les tâches classiques (`programme_jour = false`, valeur par défaut) ne sont pas concernées : comportement inchangé, elles continuent d'apparaître dans l'onglet "En retard" existant.

## Constats de la Phase 1

- Session déjà sur `origin/kilio` à jour (`50e1643`) après `git fetch` + `git reset --hard` — pas de divergence locale.
- `information_schema.columns` sur `taches` (projet `vsmtkopkqasrdnjceegp`) : conforme à `src/lib/supabase/types.ts` avant migration, aucun décalage repo/DB constaté.
- `pg_constraint` sur les FK référençant `taches` : `sous_taches_tache_id_fkey`, `taches_tags_tache_id_fkey` et `tache_images_tache_id_fkey` ont toutes `confdeltype = 'c'` (**`ON DELETE CASCADE`**, déjà en place). **Décision découlant de ce constat** : pas besoin de bloc `do $$ ... $$` ni de suppression manuelle des lignes filles avant de supprimer une tâche — un simple `delete from taches where ...` suffit, la cascade gère `sous_taches`, `taches_tags` et `tache_images`.
- `cron.job` : trois jobs déjà actifs (`rappels-taches` chaque minute, `rappels-documents` à 6h, `nettoyage-auto` à 5h — tous en UTC, appelant des Edge Functions via `net.http_post`). Aucun ne porte le nom `suppression-taches-programme-jour` : pas de collision de nom, et l'horaire proposé (00h05) ne chevauche aucun des horaires existants.
- `current_setting('cron.timezone')` = `GMT`, `current_setting('TimeZone')` = `UTC` : pg_cron s'exécute en UTC sur ce projet, comme les jobs existants.

## Choix techniques

### Suppression matérielle sans bloc transactionnel dédié

Grâce au `ON DELETE CASCADE` déjà en place sur les 3 FK filles, le job cron se résume à une seule instruction :

```sql
delete from taches
where programme_jour = true
  and fait = false
  and echeance < current_date;
```

Pas d'Edge Function, pas de `do $$ ... $$` : une instruction unique s'exécute déjà comme une transaction implicite en PostgreSQL.

**Limite connue (héritée, pas une régression) :** cette suppression ne nettoie pas les objets du bucket Storage `tache-images` associés aux images de la tâche supprimée (seule la ligne `tache_images` disparaît, via cascade). `deleteTache()` (suppression manuelle existante) a exactement la même limite aujourd'hui — un appel Storage n'est pas possible depuis du SQL pur exécuté par `pg_cron`. Un nettoyage des objets orphelins resterait, si besoin, un sujet séparé (ex. rapprochement périodique bucket ↔ table).

### Horaire retenu : `05 0 * * *` (00h05 UTC)

Repris tel quel de la consigne. Point à noter pour l'usage : `cron.timezone = GMT` sur ce projet (vérifié en Phase 1), donc 00h05 UTC correspond à ~1h05–2h05 heure de Paris selon l'heure d'été/hiver — pas exactement minuit heure locale, mais bien en pleine nuit, ce qui suffit à l'usage visé (nettoyage avant le réveil). Placé avant `nettoyage-auto` (5h UTC) et sans interférence avec `rappels-taches` (chaque minute, portée différente).

### Forçage serveur de l'échéance

Si `programme_jour` est coché sans `echeance` renseignée, `parseTacheInput` (`src/app/actions/taches.ts`) force `echeance` à `aujourdhuiISO()` — sans quoi la tâche n'aurait jamais de date sur laquelle le cron pourrait s'appuyer. Suit le même principe que les autres champs dérivés/validés côté serveur dans ce fichier (ex. `heure`/`rappel_minutes` forcés à `null` si `toute_la_journee`) : ne fait pas confiance au seul client.

## Fichiers créés

- `scripts/migration-taches-programme-jour-2026-09-13.sql` — colonne `programme_jour` + job cron.
- `scripts/migration-taches-programme-jour-2026-09-13-revert.sql` — revert (unschedule + drop column).
- `reports/2026-09-13-taches-programme-jour.md` — ce rapport.

## Fichiers modifiés

- `src/lib/supabase/types.ts` — `programme_jour: boolean` ajouté aux types `Row`/`Insert`/`Update` de `taches`.
- `src/app/actions/taches.ts` :
  - `TacheInput` : ajout du champ `programme_jour`.
  - `parseTacheInput` : lecture de `formData.get("programme_jour") === "on"` (même pattern que `toute_la_journee`), forçage de `echeance` à aujourd'hui si `programme_jour` et pas d'échéance saisie.
  - `createTache`/`updateTache` : aucun changement direct nécessaire, `programme_jour` transite déjà via le spread `...parsed.value` sur `insert`/`update`.
- `src/app/(app)/taches/AddTaskForm.tsx` — case à cocher "Tâche du jour" (état `programmeJour`, initialisé depuis `tache?.programme_jour` en édition) avec texte d'aide, positionnée avant "Toute la journée".
- `src/app/(app)/taches/TasksList.tsx` — badge `Tâche du jour` sur `TaskCard` quand `tache.programme_jour === true`, dans la ligne de pills existante (à côté du badge de priorité), réutilisant le token `kcalPillTag` de `src/lib/ui.ts` (déjà utilisé ailleurs comme pill "mise en avant" générique — étiquettes de documents, kcal/portion des recettes — pas de nouvelle classe ad hoc créée).

Aucun changement dans `TachesView.tsx` : les 4 vues existantes ("Aujourd'hui" / "En retard" / "7 jours" / "Toutes") continuent d'afficher une tâche `programme_jour` normalement tant qu'elle n'a pas été supprimée par le cron, comme demandé.

## Vérification en base

- `information_schema.columns` : `programme_jour` présente sur `taches`, `boolean`, `NOT NULL`, défaut `false`.
- `cron.job` : ligne `suppression-taches-programme-jour`, `schedule = '05 0 * * *'`, `active = true` confirmée après application de la migration.

## Phase 3 — Vérification

- `npm install` : `node_modules` absent au démarrage de la session, dépendances installées (409 paquets, 0 vulnérabilité).
- `npx tsc --noEmit` : aucune erreur liée au changement. Une erreur `Cannot find name 'LayoutProps'` sur `src/app/layout.tsx` est présente avant tout build (typegen Next.js absente) — reproduite à l'identique sur `origin/kilio` sans les modifications (`git stash`), donc pré-existante et non liée à cette feature.
- `npx eslint .` : aucune erreur.
- `npm run build` : la phase TypeScript du build (`Running TypeScript ... Finished TypeScript`) passe sans erreur avec les modifications. Le build échoue ensuite au pré-rendu de `/carburants` (`Error: supabaseKey is required`, `SUPABASE_SERVICE_ROLE_KEY` absent dans cet environnement). **Confirmé pré-existant et indépendant du changement** : reproduit à l'identique via `git stash` sur le code de base `origin/kilio`.

## Limites connues

- **Tâche `programme_jour` + récurrence active simultanément** : si une tâche a à la fois `programme_jour = true` et une `recurrence_frequence` renseignée, et qu'elle n'est pas cochée avant son échéance, le cron la supprime définitivement — la récurrence ne "survit" pas à une occurrence manquée. `toggleTache()` ne calcule la prochaine occurrence que lorsque la tâche est cochée (`fait = true` déclenché par l'utilisateur) ; il n'y a aujourd'hui aucun mécanisme qui avance une récurrence au moment où le cron intervient. Ce cas n'a pas été géré spécifiquement (non demandé), mais mérite d'être signalé : combiner les deux flags produit une récurrence qui s'interrompt silencieusement dès la première occurrence manquée.
- **Objets Storage orphelins** : voir "Choix techniques" ci-dessus — limite héritée de `deleteTache()`, non spécifique à ce cron.
- **Build complet non validable de bout en bout** dans cet environnement faute de `SUPABASE_SERVICE_ROLE_KEY` — limitation d'environnement, sans lien avec la feature.
