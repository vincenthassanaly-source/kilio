# Fix — drag & drop des tâches : la tâche revenait à sa position d'origine après le drop — 2026-09-06

## Bug rapporté

Sur `/taches` (vue "Toutes"), glisser une tâche via sa poignée (icône 6 points) fonctionne visuellement pendant le drag, mais au relâchement la tâche revient à sa position habituelle au lieu de rester à son nouvel emplacement.

## Constats de la Phase 1

- `git fetch origin kilio` puis vérification : la branche de travail était déjà strictement synchronisée avec `origin/kilio` (`680a7a4`, aucun `git diff` entre les deux) — pas de rattrapage nécessaire.
- `src/app/(app)/taches/TasksList.tsx`, `SortableTachesList.handleDragEnd` : après un drop, le code calcule `reordonnees` via `arrayMove`, renumérote `ordre` par `liste_id`, puis patche le cache TanStack Query (`queryKeys.taches`) en ne modifiant que le champ `ordre` des tâches concernées (`old?.map(...)`) — **sans jamais retrier le tableau lui-même**. `enregistrerOrdreTaches(updates)` est bien appelé pour persister côté serveur.
- `src/app/(app)/taches/TachesView.tsx`, `filtered` (`useMemo`, ligne 45) : ne fait que **filtrer** le tableau `taches` issu du cache (par liste et par date selon la vue) — jamais de tri. C'est ce tableau, dans l'ordre où il se trouve en cache, qui est transmis tel quel à `TasksList`.
- `src/app/actions/taches.ts`, `getTachesAvecRelations` : tri serveur `.order("fait").order("ordre").order("echeance").order("created_at")`. Le tableau n'est donc trié qu'**une seule fois**, au chargement initial (fetch serveur) — jamais recalculé côté client.
- Aucune fonction de tri client équivalente n'existait déjà dans le fichier (recherché via `grep` sur `sort(`/`compare` dans `src/app/(app)/taches/` — seule occurrence : le tri des tâches archivées par `updated_at` dans `TasksList`, sur un critère différent).

## Vérification en base (Supabase MCP, projet `vsmtkopkqasrdnjceegp`)

Requête sur `taches` (`fait = false`, triées par `liste_id, ordre`) : la liste `303d42a7-b3dd-4850-ab5a-6d25b8995007` contient 9 tâches avec un `ordre` strictement séquentiel (0 à 8) et des `updated_at` tous regroupés à la même seconde (`2026-09-06 17:39:09`), signature d'un réordonnancement récent qui a bien persisté côté serveur. Ceci confirme l'hypothèse de diagnostic : le bug est **uniquement côté affichage**, la persistance (`enregistrerOrdreTaches`) fonctionnant correctement.

## Correctif (`src/app/(app)/taches/TasksList.tsx`)

Ajout d'une fonction de comparaison `comparerPourAffichage`, reproduisant les deux premières clés du tri serveur (`fait`, `ordre` — `echeance`/`created_at` ne changent jamais pendant un drag, donc inutiles ici) :

```ts
function comparerPourAffichage(a: TacheAvecRelations, b: TacheAvecRelations) {
  if (a.fait !== b.fait) return a.fait ? 1 : -1;
  if (!a.fait) return a.ordre - b.ordre;
  return 0;
}
```

Pour les tâches faites (`fait: true`), la fonction renvoie `0` plutôt que de comparer `ordre` : `Array.prototype.sort` étant stable, leur position relative dans le tableau en cache (déjà correcte) est préservée à l'identique — pas de risque de les mélanger entre elles.

Appliquée juste après le `.map()` qui patche les champs `ordre` dans `handleDragEnd` :

```ts
queryClient.setQueryData<TacheAvecRelations[]>(queryKeys.taches, (old) =>
  old
    ?.map((t) => (parOrdre.has(t.id) ? { ...t, ordre: parOrdre.get(t.id)! } : t))
    .sort(comparerPourAffichage)
);
```

`enregistrerOrdreTaches` et le calcul des `updates` (renumérotation par `liste_id`) n'ont pas été touchés — ils étaient déjà corrects.

## Vérification (Phase 3)

- `npx tsc --noEmit` : aucune erreur (après `npm install`, les dépendances n'étaient pas installées dans cet environnement).
- `npx eslint .` : aucune erreur, aucun avertissement.
- `npm run build` : build de production réussi (Turbopack), TypeScript validé dans le cadre du build, les 22 routes générées sans erreur.

**Limite de vérification** : comme pour le précédent test Supabase, un test réel en conditions d'usage (tactile, sur téléphone) n'a pas pu être effectué dans cette session (pas d'accès à un navigateur/appareil réel dans le bac à sable). Le correctif a été vérifié par lecture de code, par les vérifications statiques ci-dessus, et par la confirmation en base que la persistance fonctionnait déjà — **Vincent doit retester en réel** (glisser une tâche sur `/taches`, vue "Toutes") avant de considérer le sujet clos.

## Fichier modifié

- `src/app/(app)/taches/TasksList.tsx` (ajout de `comparerPourAffichage` + un `.sort()` dans `handleDragEnd`, aucun autre changement).
