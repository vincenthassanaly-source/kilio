# Deep-link tâche depuis la notification de rappel

## Objectif

Cliquer sur la notification push de rappel d'une tâche (`envoyer-rappels-taches`) devait ouvrir l'app sur `/agenda`, en vue Jour, positionné sur le jour d'échéance de la tâche concernée, avec sa carte mise en surbrillance et scrollée en vue — sans bouton dédié, la coche déjà présente sur `TaskCard` suffisant.

## Fichiers modifiés

### `supabase/functions/envoyer-rappels-taches/index.ts`
Le payload push porte désormais l'id de la tâche dans l'URL de destination : `url: "/agenda"` → `` url: `/agenda?tache=${tache.id}` ``.

### `public/sw.js`
Le listener `notificationclick` matchait une fenêtre déjà ouverte par `existing.url.includes(url)` — comparant l'URL complète, un `?tache=` différent (ou absent) d'une fenêtre déjà ouverte sur `/agenda` empêchait de la réutiliser. Remplacé par une comparaison sur le **pathname** (`new URL(...).pathname`), et ajout d'un appel à `existing.navigate(url)` avant `focus()` pour repositionner la fenêtre réutilisée sur la nouvelle tâche/date (sinon la fenêtre existante restait affichée sur son URL précédente). `clients.openWindow(url)` préserve nativement la query string, donc aucun changement nécessaire côté ouverture d'une nouvelle fenêtre.

### `src/app/(app)/agenda/AgendaView.tsx`
Lecture de `?tache=<id>` via `useSearchParams` (`next/navigation`), calculée **pendant le rendu** (pas dans un `useEffect`) et injectée comme valeur initiale de `selectedDate` et d'un nouvel état `tacheEnSurbrillanceId`, via les initialiseurs paresseux de `useState`. `view` n'a pas eu besoin d'être forcé : `"jour"` est déjà la valeur par défaut.

Un `useEffect` séparé, à vide de dépendances, nettoie ensuite le paramètre `tache` de l'URL via `router.replace(...)` pour éviter que le comportement se rejoue à un re-render ou une navigation ultérieure dans la session. Tâche introuvable (supprimée entretemps, etc.) → `tacheEnSurbrillanceId` reste `null`, aucune erreur visible.

Note technique : la première implémentation dérivait cet état dans un `useEffect` classique (`setView`/`setSelectedDate`/`setTacheEnSurbrillanceId` appelés depuis l'effet), mais se heurtait à la règle ESLint stricte `react-hooks/set-state-in-effect` (React Compiler) du projet, qui interdit d'appeler un setter d'état directement dans le corps d'un effet. D'où le passage aux initialiseurs paresseux de `useState`, une approche plus idiomatique React de toute façon (état initial dérivé, pas un effet de synchronisation).

### `src/app/(app)/agenda/DayView.tsx`
Nouvelle prop `tacheEnSurbrillanceId?: string | null`, transmise à chaque `TaskCard` de la liste active (`highlighted={tache.id === tacheEnSurbrillanceId}`) et à `ArchivedTasksSection` (qui gère elle-même le cas archivé).

### `src/app/(app)/agenda/ArchivedTasksSection.tsx`
Nouvelle prop `tacheEnSurbrillanceId?: string | null`. La section, repliée par défaut, s'initialise **ouverte** (`useState(() => ...)`, plutôt qu'un effet + `setOpen`, pour la même raison ESLint que ci-dessus) dès que la tâche ciblée s'y trouve, et transmet `highlighted` à la `TaskCard` correspondante.

### `src/app/(app)/taches/TasksList.tsx` (`TaskCard`)
Nouvelle prop `highlighted?: boolean` :
- `id={`tache-${tache.id}`}` posé sur le `<li>` (`motion.li`) uniquement quand `highlighted` est vrai.
- `useEffect` interne qui appelle `scrollIntoView({ behavior: "smooth", block: "center" })` sur la carte dès que `highlighted` devient vrai (ce hook-là ne setState pas, donc pas concerné par la règle ESLint ci-dessus).
- Classe CSS `tache-surbrillance` ajoutée conditionnellement.

Seule la branche `!reorderable` du composant a été modifiée (id/ref/classe) : `colorByListe` (utilisé par les 3 vues Agenda) n'est jamais combiné avec `reorderable` dans la base actuelle.

### `src/app/globals.css`
Nouvelle classe `.tache-surbrillance` + `@keyframes tache-surbrillance-anim` : un anneau `box-shadow` de la couleur `--accent-agenda` qui pulse deux fois puis s'efface sur 2,6 s, `animation-fill-mode: both` pour que l'état final (transparent) se maintienne sans JS pour retirer la classe ensuite. Entrée ajoutée aussi dans le bloc `@media (prefers-reduced-motion: reduce)` existant, cohérent avec le traitement des autres animations du fichier.

## Vérification base de données

`mcp__Supabase__list_tables` (projet `vsmtkopkqasrdnjceegp`) : la table `taches` existe déjà avec sa colonne `id`, aucune migration n'était nécessaire pour cette fonctionnalité (elle ne touche pas le schéma, seulement le payload de notification et le rendu client).

## Flux vérifié mentalement

1. Rappel dû → Edge Function envoie `{ title, body, url: "/agenda?tache=<id>" }`.
2. `sw.js` `push` → notification affichée avec `data.url` = cette URL.
3. Clic → `notificationclick` cherche une fenêtre déjà ouverte sur le pathname `/agenda` ; si trouvée, la navigue vers l'URL avec `?tache=` puis la met au premier plan ; sinon `openWindow(url)`.
4. L'app s'ouvre/se réaffiche sur `/agenda?tache=<id>` → `AgendaView` bascule (déjà) en vue Jour, positionne `selectedDate` sur l'échéance de la tâche, mémorise son id, puis nettoie l'URL.
5. `DayView` reçoit l'id ciblé → la `TaskCard` correspondante (active ou archivée, section auto-dépliée dans ce dernier cas) scroll en vue et pulse brièvement.
6. Coche existante de la `TaskCard` disponible pour marquer la tâche faite — aucun bouton supplémentaire nécessaire.

## Vérifications techniques

- `npx tsc --noEmit` : une seule erreur, pré-existante et sans rapport (`src/app/layout.tsx(41,50): Cannot find name 'LayoutProps'`, confirmée identique sur `origin/kilio` avant tout changement — type généré par Next.js au build, absent d'un `tsc` isolé).
- `npx eslint .` : aucune erreur ni avertissement.
- `npm run build` : succès (`✓ Compiled successfully`, TypeScript et génération des 22 pages OK, `/agenda` toujours rendu dynamiquement comme avant).
