# Onglet "En retard" sur /taches — 2026-09-12

## Résumé de la feature

Ajout d'un nouvel onglet **« En retard »** dans le module Tâches (`/taches`), positionné entre « Aujourd'hui » et « 7 jours ». Il filtre les tâches dont l'échéance est strictement dans le passé et qui ne sont pas encore faites. C'est un filtre en plus, pas une catégorie exclusive : les tâches en retard restent visibles normalement dans « Toutes » (et dans « 7 jours » si leur échéance tombe dans les 7 jours à venir).

## Règle de filtrage retenue

Une tâche apparaît dans l'onglet « En retard » si et seulement si :
- `echeance` est renseignée (`echeance !== null`) — les tâches sans échéance ne sont jamais en retard ;
- `echeance < aujourd'hui` (comparaison de chaînes ISO `yyyy-MM-dd`, donc date strictement passée, indépendamment de l'heure) ;
- `fait === false`.

Implémentée comme la négation directe (branche de filtrage `return false` si une des conditions échoue), au même style que les branches `aujourdhui`/`semaine` existantes :

```ts
if (vue === "en_retard") {
  if (!tache.echeance || tache.echeance >= today || tache.fait) return false;
}
```

## Constats de la Phase 1

- Session déjà sur la branche `claude/taches-vue-en-retard-w8gb0x`, HEAD strictement identique à `origin/kilio` (`1fbb53b`) : pas de reset nécessaire.
- `src/app/(app)/taches/TachesView.tsx` : type `VueKey`, tableau `VUES` et `useMemo` de filtrage localisés comme attendu ; `today`/`dansSeptJours` déjà calculés via `aujourdhuiISO()` (`src/lib/budget/compute.ts:204`) et `date-fns`, réutilisés tels quels.
- `src/app/(app)/taches/TasksList.tsx` : aucune logique interne dépendante de la vue active autre que la prop `reordonnable` déjà transmise depuis `TachesView` (`reordonnable={vue === "toutes"}`) — pas d'adaptation nécessaire pour le nouvel onglet.
- `src/lib/supabase/types.ts` : `taches.echeance: string | null` et `taches.fait: boolean` confirmés.
- Vérification Supabase MCP (projet `vsmtkopkqasrdnjceegp`, `information_schema.columns`) : `echeance` = `date`, nullable ; `fait` = `boolean`, non nullable. Conforme au code, aucun décalage repo/DB constaté.

## Fichier modifié

`src/app/(app)/taches/TachesView.tsx` :

```diff
-type VueKey = "aujourdhui" | "semaine" | "toutes";
+type VueKey = "aujourdhui" | "en_retard" | "semaine" | "toutes";

 const VUES: { key: VueKey; label: string }[] = [
   { key: "aujourdhui", label: "Aujourd'hui" },
+  { key: "en_retard", label: "En retard" },
   { key: "semaine", label: "7 jours" },
   { key: "toutes", label: "Toutes" },
 ];
...
       if (vue === "aujourdhui" && tache.echeance !== today) return false;
+      if (vue === "en_retard") {
+        if (!tache.echeance || tache.echeance >= today || tache.fait) return false;
+      }
       if (vue === "semaine") {
```

Aucun autre fichier modifié. Pas de migration SQL (aucun changement de schéma). Pas de badge de comptage par onglet ailleurs dans le code (aucun n'existait, rien ajouté).

## Comportement des autres vues

- `aujourdhui` et `semaine` : logique inchangée, non touchée par cet ajout.
- `toutes` : inchangée, une tâche en retard continue d'y apparaître (aucune condition sur `echeance`/`fait` pour cette vue).
- `semaine` filtre déjà uniquement `today <= echeance <= today+7j` (le passé est exclu par `tache.echeance < today` → `false`) : une tâche en retard n'apparaît donc pas dans « 7 jours », comportement existant non modifié, conforme à la consigne de ne pas l'étendre.
- `reordonnable={vue === "toutes"}` : laissé tel quel — l'onglet « En retard » n'a pas de drag-and-drop, comme les onglets « Aujourd'hui » et « 7 jours ».

## Phase 3 — Vérification

- `npm install` : `node_modules` absent au démarrage de la session, dépendances installées (409 paquets, 0 vulnérabilité).
- `npx tsc --noEmit` : aucune erreur après génération de `.next/types` par le premier build (l'erreur initiale `Cannot find name 'LayoutProps'` était due à l'absence de `.next/`, non liée à cette modification — confirmée disparue une fois le build lancé une première fois).
- `npx eslint .` : aucune erreur.
- `npm run build` : le build Next.js échoue en pré-rendu de la page `/agenda` (`Error: supabaseKey is required` dans `src/lib/supabase/admin.ts`, car `SUPABASE_SERVICE_ROLE_KEY` n'est pas défini dans cet environnement d'exécution). **Cet échec est confirmé pré-existant et indépendant du changement** : reproduit à l'identique avec `git stash` (code de base `origin/kilio`, sans la modification). L'étape TypeScript du build (`Running TypeScript ... Finished TypeScript`) passe sans erreur avant cet échec de pré-rendu, dans les deux cas.

## Écarts par rapport au prompt

Aucun sur le code. Le build complet (`npm run build`) ne peut pas être validé de bout en bout dans cet environnement faute de secret `SUPABASE_SERVICE_ROLE_KEY` configuré — limitation d'environnement documentée ci-dessus, sans lien avec la feature « En retard ».
