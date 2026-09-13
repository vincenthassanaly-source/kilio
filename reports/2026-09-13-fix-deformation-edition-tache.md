# Fix : effet de déformation lors du passage en mode édition d'une tâche

## Cause du bug

Dans `TaskCard` (`src/app/(app)/taches/TasksList.tsx`), le passage du mode
normal au mode édition était géré par un `if (editing) { return ... }` qui
renvoyait, selon le cas, une `<motion.li layout className={card}>` (édition)
ou une `<motion.li layout ...>` / `<li><motion.div layout>` (affichage
normal).

Comme les deux branches renvoient une `motion.li` à la même position dans
l'arbre React (racine du composant `TaskCard`), React ne démonte pas le
nœud DOM entre les deux états : il se contente de mettre à jour ses props et
son contenu. Le prop `layout` de Framer Motion, présent sur les deux
branches, détecte alors que ce nœud persistant change brutalement de
hauteur (carte compacte -> formulaire, beaucoup plus grand) et tente
d'interpoler cette transition de taille via son mécanisme FLIP — d'où
l'effet d'étirement/déformation visible au clic sur « Modifier ».

## Pattern repris

Le même problème existait déjà sur 14 écrans pour la bascule bouton
« + Ajouter » ↔ formulaire, résolu par `AnimatedAddCard`
(`src/components/AnimatedAddCard.tsx`) via `AnimatePresence mode="wait"` +
cross-fade `opacity`/`scale` (sans `layout`), avec gestion de
`useReducedMotion`.

`TaskCard` a un besoin structurel différent de `AnimatedAddCard` : le
« déclencheur » n'est pas un simple bouton mais toute la carte affichée, et
la carte a 3 variantes de rendu structurel (édition, affichage statique,
affichage réordonnable avec `dnd-kit`). Réutiliser directement
`AnimatedAddCard` aurait donc nécessité de dupliquer ces 3 structures comme
`trigger`/`children`, sans réel gain sur le fait de répliquer son pattern
interne. Le pattern d'`AnimatedAddCard` a donc été répliqué directement dans
`TaskCard` :

- Chacune des 3 branches de rendu (édition / vue statique / vue
  réordonnable) est maintenant enveloppée dans sa propre
  `<AnimatePresence mode="wait" propagate>` avec un enfant unique portant un
  `key` distinct (`"edit"` vs `"view"`).
- La branche édition anime uniquement `opacity`/`scale` (mêmes valeurs que
  `AnimatedAddCard`), sans `layout`, avec gestion de `useReducedMotion` pour
  respecter `prefers-reduced-motion`.
- Comme les 3 branches renvoient toutes une racine `AnimatePresence` avec un
  enfant dont le `key` change entre `"edit"` et `"view"`, la bascule force
  désormais un vrai démontage/remontage du nœud DOM (au lieu d'un
  redimensionnement du même nœud) : `AnimatePresence` anime la sortie de
  l'ancien état (fade-out) puis l'entrée du nouveau (fade-in), sans jamais
  interpoler une taille de conteneur entre les deux formats.
- `layout` est conservé uniquement là où il gérait déjà le
  réordonnancement de la liste (drag & drop) : sur la `motion.li` de la vue
  statique (repositionnement quand une tâche voisine est ajoutée/retirée/
  cochée) et sur la `motion.div` de la vue réordonnable (`layout={!isDragging}`).
  Ce `layout` ne s'applique plus jamais à la transition édition ↔ vue,
  puisque cette dernière passe désormais par un démontage/remontage complet.
- Le prop `propagate` a été ajouté à ces `AnimatePresence` imbriquées : sans
  lui, la sortie d'un élément de liste géré par l'`AnimatePresence` parente
  (ex. suppression d'une tâche) ne se propage pas à l'`AnimatePresence`
  locale de `TaskCard`, qui la démonterait alors instantanément sans jouer
  son animation de sortie (`exit`). Vérifié dans
  `node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs`.

## Fichiers modifiés

- `src/app/(app)/taches/TasksList.tsx` (composant `TaskCard`) : seul fichier
  modifié.

## Comportement inchangé

- `useBackClose(editing, ...)` : toujours branché sur le même state local
  `editing`, fonctionne à l'identique (fermeture au bouton retour).
- Bouton « Annuler » et `onDone` de `AddTaskForm` : logique inchangée
  (`setEditing(false)` + invalidation du cache React Query).
- Animation d'entrée/sortie des tâches dans la liste (ajout, suppression,
  cochage) et animation de réordonnancement (drag & drop) : inchangées,
  `layout`/`initial`/`animate`/`exit` conservés à l'identique sur ces
  éléments.

## Écrans vérifiés (relecture de code)

`TaskCard` est utilisé dans 4 écrans, tous vérifiés par relecture de leur
usage (props passées, structure `<ul>`/`<AnimatePresence>` englobante) :

- `/taches` (`TachesView` → `TasksList` → `SortableTachesList`, variante
  `reorderable`)
- Agenda — vue jour (`DayView.tsx`, variante statique `colorByListe`)
- Agenda — vue liste (`ListView.tsx`, variante statique `colorByListe`)
- Agenda — tâches archivées (`ArchivedTasksSection.tsx`, variante statique
  `colorByListe`, imbriquée dans une `AnimatePresence` supplémentaire au
  niveau de la section elle-même)

## Vérifications (Phase 3)

- `npx tsc --noEmit` : une seule erreur, `Cannot find name 'LayoutProps'`
  dans `src/app/layout.tsx` — confirmée pré-existante et indépendante de ce
  fix (identique sur la branche de base avant modification ; artefact de
  typegen Next.js non généré hors `next dev`/`next build`).
- `npx eslint "src/app/(app)/taches/TasksList.tsx"` : aucune erreur.
- `npm run build` : compilation TypeScript du build (`Finished TypeScript`)
  réussie sans erreur. L'échec final du build (prérendu de `/carburants`,
  `Error: supabaseKey is required.`) est dû à l'absence des variables
  d'environnement Supabase dans cet environnement d'exécution — confirmé
  pré-existant et identique sur la branche de base.

Pas de test dans un navigateur réel (pas d'accès à une base Supabase
configurée dans cet environnement) : la correction a été validée par
relecture du mécanisme Framer Motion (`node_modules/framer-motion`) plutôt
que par observation visuelle directe.
