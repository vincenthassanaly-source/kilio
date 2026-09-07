# Agenda — Vue Jour : bande "tâches sans heure"

## Objectif

Dans `DayView.tsx`, seules les tâches ayant une `heure` étaient positionnées dans la grille
horaire (`dayTachesAvecHeure`, filtrée sur `t.heure`). Les tâches sans heure (`heure === null`,
"toute la journée" ou simplement sans heure définie) n'apparaissaient que dans la liste sous la
grille, jamais dans la grille elle-même — contrairement à `WeekView.tsx`, qui affiche déjà ces
tâches dans une bande dédiée au-dessus de la grille de chaque colonne. Reprendre le même principe
dans `DayView.tsx`, adapté à une colonne unique pleine largeur.

## Avant / après

- **Avant** : la grille horaire de la Vue Jour ne montrait que les tâches avec heure. Une tâche
  "toute la journée" ou sans heure n'était visible qu'en scrollant jusqu'à la liste sous la
  grille.
- **Après** : une bande apparaît entre l'en-tête du jour et la grille horaire scrollable (donc
  hors de la zone de scroll vertical), listant sous forme de chips (`bg-surface-alt`, `text-ink-2`,
  `rounded`, `truncate`) les tâches du jour non faites et sans heure. Contrairement à `WeekView`
  (bande compacte, `UNSCHEDULED_BAND_HEIGHT` fixe, 2 chips + "+N"), la bande de `DayView` profite
  de la pleine largeur : tous les titres sont affichés (`flex flex-wrap gap-1`), sur autant de
  lignes que nécessaire, hauteur non contrainte (`padding` cohérent avec le reste du composant,
  pas de `UNSCHEDULED_BAND_HEIGHT` — cette constante ne sert qu'à aligner plusieurs colonnes entre
  elles en Vue Semaine, non pertinent ici avec une seule colonne). Si aucune tâche sans heure ce
  jour-là, la bande ne s'affiche pas du tout (pas de bloc vide).
- Les chips ne sont pas interactives dans cette itération (pas de navigation/scroll vers la liste
  en dessous) — la tâche complète reste consultable et modifiable dans la liste sous la grille
  comme avant.
- Aucun changement sur `dayTachesAvecHeure` ni sur le rendu des `TacheBlock` dans la grille.

## Fichier modifié

- `src/app/(app)/agenda/DayView.tsx`
  - Nouvelle variable `dayTachesSansHeure = dayTachesJour.filter((t) => !t.fait && !t.heure)`.
  - Nouveau bloc JSX (rendu conditionnel) inséré dans le conteneur `overflow-hidden rounded-2xl
    border border-line bg-surface`, juste avant le `div` scrollable (`ref={scrollRef}`) qui
    contient `TimeGutter`/la grille — donc bien hors de la zone `overflow-auto`.

## Vérifications (Phase 3)

- `npm install` — le dépôt n'avait pas de `node_modules` au démarrage de la session, installé
  avant toute vérification.
- `npx tsc --noEmit` : ❌ puis ✅ — première tentative en échec sur `LayoutProps<"/">`
  introuvable dans `src/app/layout.tsx` (type généré par Next.js dans `.next/types` au premier
  build/dev, absent avant tout `npm run build` — pré-existant, indépendant de ce changement).
  Après `npm run build`, `tsc --noEmit` passe sans erreur.
- `npx eslint 'src/app/(app)/agenda'` : ✅ aucune erreur.
- `npm run build` : ✅ build de production réussi, 22 routes générées.

## Limitations connues

- Pas de vérification visuelle dans un navigateur réel (non demandée par le prompt pour ce
  changement ciblé) : le rendu de la bande (retour à la ligne des chips, alignement avec le reste
  du composant) n'a été validé que par relecture de code et compilation.
