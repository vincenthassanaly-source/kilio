# Tâches — carte étirée/compressée pendant le drag-and-drop — 2026-09-06

## Bug rapporté

Sur `/taches`, pendant le drag-and-drop d'une tâche via la poignée à 6 points, la carte activement déplacée s'étire ou se compresse verticalement au lieu de simplement se translater à l'écran.

## Constats de la Phase 1

- `git fetch origin kilio && git reset --hard origin/kilio` : session déjà synchronisée sur `origin/kilio` (`18387ea`, fix du snapback des tâches après drag & drop), aucun rattrapage nécessaire.
- `TaskCard` dans `src/app/(app)/taches/TasksList.tsx`, branche `reorderable` (`<li>` externe portant `dragStyle`, lignes ~481-487) : confirmé conforme à la description — `dragStyle.transform` utilisait `CSS.Transform.toString(transform)`.
- `CSS` est bien importé depuis `@dnd-kit/utilities` (ligne 16) ; `CSS.Translate` est un sous-module du même import, aucun import supplémentaire nécessaire.
- `grep -n "CSS.Transform.toString" "src/app/(app)/taches/TasksList.tsx"` : un seul usage dans le fichier (ligne 482), aucun doublon dans une autre variante de carte réordonnable.

## Diagnostic

`CSS.Transform.toString(transform)` sérialise transform en incluant `scaleX`/`scaleY`, que dnd-kit calcule pour compenser l'écart de hauteur entre la carte déplacée et l'élément situé sous le pointeur (les cartes de `/taches` n'ont pas toutes la même hauteur : badges, tags, sous-tâches). Appliqué à l'élément activement dragué, ce scale produit l'effet d'étirement/compression vertical signalé.

## Correctif

Remplacement de `CSS.Transform.toString(transform)` par `CSS.Translate.toString(transform)` dans `dragStyle`, pour ne conserver que la translation (x/y) sur la carte en cours de drag et supprimer le scale parasite.

```tsx
const dragStyle: CSSProperties = {
  transform: CSS.Translate.toString(transform),
  transition,
};
```

Rien d'autre n'a été modifié autour : le `<motion.div>` interne avec `layout={!isDragging}`, qui gère l'animation des autres tâches se décalant pendant le drag, n'est pas concerné.

## Fichier modifié

- `src/app/(app)/taches/TasksList.tsx` (un seul changement, une ligne).

## Vérification (Phase 3)

- `npm ci` : `node_modules` absent dans le bac à sable, dépendances installées avant vérification (394 packages).
- `npx tsc --noEmit` : une seule erreur préexistante et non liée (`src/app/layout.tsx(41,50): Cannot find name 'LayoutProps'`), confirmée présente à l'identique sur `HEAD` avant modification (via `git stash`) — types générés par `next dev`/`next build`, absents dans cet environnement avant le premier build. Aucune erreur sur le fichier modifié.
- `npx eslint .` : aucune erreur, aucun avertissement.
- `npm run build` : build de production réussi (Turbopack), TypeScript validé dans le cadre du build (qui régénère les types Next.js), les 27 routes générées sans erreur.

**Non testé dans ce bac à sable :** le rendu visuel réel du drag (tactile, sur téléphone), donc la disparition effective de l'effet d'étirement n'a pas pu être vérifiée visuellement. Vincent doit retester en réel sur `/taches` avant de considérer le sujet clos.
