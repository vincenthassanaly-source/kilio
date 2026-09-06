# Dashboard — les tâches cochées disparaissent de la carte "Aujourd'hui" — 2026-09-06

## Constats de la Phase 1

- `git checkout kilio && git fetch origin kilio && git reset --hard origin/kilio` : session déjà à jour, `origin/kilio` à `7c5031d` (error boundaries + `loading.tsx`) — aucun rattrapage nécessaire. Travail effectué sur `claude/dashboard-taches-hide-done-tj26zw`, dérivée du même commit.
- Relecture de `src/app/(app)/DashboardTachesSection.tsx`, `src/app/(app)/DashboardTaskItem.tsx` et `src/app/(app)/taches/TasksList.tsx` : `tachesAffichees` était bien construite comme décrit (tâches non faites puis faites, `.slice(0, 4)`), sans modification externe récente qui aurait changé cette structure. `queryKeys.taches` (`src/lib/query/keys.ts`) est une clé unique `["taches"]` partagée entre le dashboard et `/taches`, déjà commentée comme telle.
- `DashboardTaskItem.tsx` porte sa propre mutation optimiste (`toggleMutation` + `onMutate` qui bascule `fait` dans le cache React Query) — identique au pattern de `TaskCard` dans `TasksList.tsx`. Non modifiée : le compteur `{tachesDoneCount}/{tachesDuJour.length}` de `DashboardTachesSection.tsx` est recalculé à chaque re-render à partir du cache, donc déjà à jour dès le clic, avant même la fin d'une éventuelle animation de sortie.

## Implémentation (`src/app/(app)/DashboardTachesSection.tsx`)

1. **Filtrage** — `tachesAffichees` ne garde plus que les tâches non faites, toujours limité à 4 :
   ```ts
   const tachesAffichees = tachesDuJour.filter((t) => !t.fait).slice(0, 4);
   ```
   `tachesDoneCount` et le compteur `{tachesDoneCount}/{tachesDuJour.length} tâches` restent inchangés : ils continuent de dériver de `tachesDuJour` (le total réel du jour), pas de `tachesAffichees`.

2. **Animation de sortie** — pattern repris de `TasksList.tsx` (`motion`/`AnimatePresence`, déjà une dépendance) :
   - La liste est enveloppée dans `<AnimatePresence mode="popLayout" initial={false}>` : `popLayout` retire l'élément sortant du flux de layout dès le début de son animation, pour que les tâches restantes remontent en douceur (`layout`) sans à-coup, au lieu d'attendre la fin de la sortie.
   - Chaque tâche est enveloppée dans un `motion.div` avec `key={t.id}` (clé stable), `layout`, `exit={{ opacity: 0, x: -8 }}` (fondu + léger glissement horizontal, cohérent avec le style `x: -8`/`y: -8` déjà utilisé dans `TaskCard`) et `transition={{ duration: 0.35 }}` (dans la fourchette 0.3–0.5s demandée).
   - `DashboardTaskItem` lui-même n'est pas modifié : c'est le `motion.div` englobant qui porte l'animation, `DashboardTaskItem` reste un composant "métier" pur (rendu + mutation).
   - Le message vide `Rien de prévu aujourd'hui.` était déjà conditionné sur `tachesAffichees.length === 0` (et non sur `tachesDuJour.length === 0`) : le cas "0 tâche restante affichée mais des tâches faites existent aujourd'hui" est donc déjà couvert sans changement supplémentaire — le libellé existant reste cohérent pour ce cas (une tâche faite n'est plus "à prévoir").

3. `TasksList.tsx` (`/taches`) n'a pas été touché : cette page continue d'afficher les tâches faites séparément (bloc "Tâches archivées"), hors périmètre de cette demande.

## Fichiers touchés

- `src/app/(app)/DashboardTachesSection.tsx` (filtrage + animation).
- `reports/2026-09-06-dashboard-taches-disparition.md` (ce rapport).

Aucun autre fichier modifié — ni `DashboardTaskItem.tsx`, ni `TasksList.tsx`, ni `src/lib/query/keys.ts`.

## Vérification (Phase 3)

- `npm ci` : dépendances installées (absentes au démarrage de la session).
- `npx tsc --noEmit` : erreur `src/app/layout.tsx(41,50): Cannot find name 'LayoutProps'` initialement, confirmée préexistante et non liée (identique via `git stash` sur `HEAD` avant modification) — type généré par Next.js au premier `build`/`dev`, absent avant. Après `npm run build` (qui régénère les types), un second `npx tsc --noEmit` est passé sans aucune erreur.
- `npx eslint .` : aucune erreur, aucun avertissement (sur le fichier modifié et sur l'ensemble du projet).
- `npx next build` : build de production réussi (Turbopack), toutes les routes générées sans erreur, y compris `/` (dashboard).
- Vérification manuelle dans le navigateur **non effectuée** : aucune variable d'environnement Supabase (`.env.local` absent) n'est disponible dans cet environnement d'exécution distant, donc impossible de lancer `next dev` contre des données réelles et de cliquer dans l'UI. La vérification s'appuie sur :
  - la relecture du code (le filtrage retire strictement les tâches `fait`, le compteur dérive toujours de `tachesDuJour` non filtré, donc cocher une tâche depuis `/taches` ou le dashboard ne change que le cache React Query sous la clé `queryKeys.taches`, partagée) ;
  - le pattern d'animation copié à l'identique de `TasksList.tsx`, déjà en production sur `/taches` ;
  - build + lint + typecheck verts.

  Recommandation : un premier passage en usage réel sur `kilio` (staging/prod) reste la validation manuelle du fondu de sortie et du réapparition croisée dashboard ↔ `/taches`.
