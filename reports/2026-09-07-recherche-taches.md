# Tâches — Barre de recherche

## Objectif

Ajouter un champ de recherche texte dans le module Tâches, filtrant instantanément (côté
client, sans appel réseau) la liste des tâches déjà chargées via TanStack Query, sur le
**titre** et les **notes** de chaque tâche — en complément des filtres existants (`vue`,
`listeId`).

## Composant / état ajoutés

- `src/app/(app)/taches/TachesView.tsx` :
  - Nouvel état local `const [recherche, setRecherche] = useState("")`.
  - Champ de recherche inline (pas de fichier séparé — voir "Décisions techniques" ci-dessous),
    stylé avec la classe `input` de `@/lib/ui` (`pl-10` pour l'icône, `pr-9` conditionnel quand
    un bouton d'effacement est affiché).
  - Icône loupe (`SEARCH_ICON`) et icône croix (`CLEAR_ICON`) définies comme constantes SVG
    locales, visuellement identiques à celle de `GlobalSearchBar.tsx` (même `viewBox`, mêmes
    tracés `circle`/`path`), mais sans reproduire son mécanisme de dropdown/debounce/appel
    serveur (`rechercheGlobale`) — ici le filtrage est un simple `useMemo` synchrone.
  - Bouton "effacer" (croix) affiché uniquement quand `recherche` n'est pas vide, remet le champ
    à `""` en un clic (pattern mobile courant).

## Placement

Le champ est inséré juste après le bloc des filtres de liste
(`<div className="flex items-center gap-2 overflow-x-auto pb-1" data-swipe-ignore>...</div>`)
et juste avant `<AddTaskToggle ... />`, conformément au prompt.

## Logique de filtrage

Le `useMemo` `filtered` existant a été étendu (sans changer le comportement des filtres
`listeId`/`vue`, réécrits en style "early return" équivalent) avec une condition
supplémentaire :

- La requête est normalisée une seule fois par recalcul (`recherche.trim().toLowerCase()`).
- Si elle est vide, aucun filtre de recherche n'est appliqué (comportement actuel inchangé).
- Sinon, une tâche matche si son `titre` **ou** son `notes` (nullable) contient la requête,
  insensible à la casse (`.includes(...)` sur les deux chaînes mises en minuscule).
- Cette condition s'ajoute en `ET` logique aux filtres `listeId`/`vue` déjà en place.

## État vide

Quand `recherche` n'est pas vide et que `filtered.length === 0` (donc aucune tâche ne
correspond), un message `Aucune tâche ne correspond à « {recherche} ».` remplace
`<TasksList />`. Il utilise un style neutre (`text-ink-2`, centré) plutôt que `errorText`
(réservé à l'état d'erreur de chargement, couleur `alert`), car une recherche sans résultat
n'est pas une erreur.

## Décisions techniques

- **Pas de factorisation de l'icône loupe** avec `GlobalSearchBar.tsx` : les deux usages sont
  suffisamment différents (couleur fixe `var(--ink-3)` ici vs. `color` en prop dans
  `GlobalSearchBar`, pas de bouton `isPending`/spinner ici) et le diff aurait été plus large
  pour un gain marginal sur un composant de quelques lignes. Dupliquer le SVG en constante
  locale (`SEARCH_ICON`) garde `TachesView.tsx` autonome et lisible.
- **Champ inline plutôt que fichier séparé** (`SearchTaches.tsx`) : le champ + son bouton
  d'effacement tiennent en une vingtaine de lignes JSX sans logique complexe ; un composant
  séparé aurait juste déplacé la lecture sans réduire la taille du fichier de façon notable.
- Aucune modification de `TasksList.tsx`, `AddTaskToggle.tsx`, ni des Server Actions de
  `src/app/actions/taches.ts`, conformément au prompt.

## Vérifications (Phase 3)

- `npm install` — le dépôt n'avait pas de `node_modules` au démarrage de la session, installé
  avant toute vérification.
- `npx tsc --noEmit` : ✅ après `npm run build` (nécessaire pour générer les types Next.js
  dans `.next/types`, notamment `LayoutProps<"/">` utilisé par `src/app/layout.tsx` — sans
  rapport avec ce changement).
- `npx eslint . --ext .ts,.tsx` : ✅ aucune erreur.
- `npm run build` : ✅ build de production réussi, 22 routes générées.

## Limitations connues

- Pas de vérification visuelle dans un navigateur réel : le rendu du champ (alignement de
  l'icône, comportement du bouton d'effacement) n'a été validé que par relecture de code et
  compilation.
