# Agenda — Lot 1 : fiabilité de la grille horaire

Date : 2026-09-19
Base : `kilio` @ `c4ee677` (déjà à jour, aucun commit à rebaser). Aucune migration, aucune nouvelle dépendance, aucune écriture en base (la base n'a pas été interrogée du tout pour ce lot : tout le travail est local au front-end).

## Synthèse

- **A — Chevauchements** : `src/lib/agenda/compute.ts` (nouveau) expose `layoutChevauchements(blocs)`, une fonction pure qui groupe les blocs par chevauchement transitif puis leur affecte une colonne de façon gloutonne. DayView et WeekView positionnent maintenant chaque bloc avec `left`/`width` en pourcentage (petit écart de 2 px entre colonnes) quand il partage un créneau avec un autre ; sans chevauchement, le rendu est strictement identique à l'ancien (mêmes classes Tailwind `inset-x-1`/`inset-x-0.5`, aucun style inline ajouté).
- **B — Blocs cliquables (vue Jour)** : chaque bloc de la grille Jour est un `<button>` avec `aria-label` du type « <titre>, de HH:MM à HH:MM » (plage toujours complète, y compris pour un bloc sans heure de fin — la fin par défaut de 30 min est annoncée). Le tap surligne la tâche et scrolle sa `TaskCard`, via un nouveau callback `AgendaView.onSelectTache` passé à `DayView`. Vue Semaine inchangée (le tap ouvre toujours le jour).
- **C — Dédoublonnage** : `PRIORITE_BLOCK_CLASS` et le composant `TacheBlock` (dupliqués entre DayView et WeekView) sont extraits dans `src/app/(app)/agenda/TacheBlock.tsx`, avec une prop `compact` pour la Semaine. Aucun changement visuel dans ce lot.

Vérifié : `npx tsc --noEmit` (0 erreur), `npm run lint` (0 erreur), `npm run build` (réussi). Un script temporaire (non commité, supprimé après usage) a validé `layoutChevauchements`/`getBlocInterval` sur les 4 cas demandés + 2 cas limites. **Le rendu n'a pas pu être vérifié visuellement dans l'application lancée** : `node_modules` n'existait pas au départ de la session (installé via `npm ci` pour pouvoir builder/typer) et aucune variable Supabase n'est configurée dans cet environnement — `next dev`/`next build` compilent et produisent les pages en mode dynamique, mais je n'ai pas pu charger `/agenda` dans un navigateur pour observer le tap, le scroll ou le positionnement des colonnes en conditions réelles.

## Fichiers modifiés / créés

- **Nouveau** `src/lib/agenda/compute.ts` : `DEFAULT_TASK_DURATION_MINUTES`, `getBlocInterval` (bornes d'un bloc — seule source de vérité, réutilisée par `TimeGrid.getTacheBlockStyle`), `formatHeureHHMM`, `layoutChevauchements`.
- **Nouveau** `src/app/(app)/agenda/TacheBlock.tsx` : composant partagé (`PRIORITE_BLOCK_CLASS`, `TacheBlock`), avec positionnement horizontal, prop `compact`, et rendu conditionnel `<button>`/`<div>` selon la présence de `onSelect`.
- `src/app/(app)/agenda/TimeGrid.tsx` : `getTacheBlockStyle` délègue le calcul des bornes à `getBlocInterval` (suppression de la logique dupliquée et de l'export `DEFAULT_TASK_DURATION_MINUTES`, déplacé dans `compute.ts` — aucun autre fichier ne l'importait).
- `src/app/(app)/agenda/DayView.tsx` : suppression du `TacheBlock` local, ajout de `layoutChevauchements(dayTachesAvecHeure)` et de la prop `onSelectTache` (requise, transmise telle quelle à chaque `TacheBlock`).
- `src/app/(app)/agenda/WeekView.tsx` : suppression du `TacheBlock` local, ajout de `layoutChevauchements` par jour (une grille de chevauchement par colonne de jour, cohérent avec le fait que les tâches d'un jour ne sont jamais comparées à celles d'un autre jour), `compact` sur chaque bloc.
- `src/app/(app)/agenda/AgendaView.tsx` : nouveau `handleSelectTache(id)`, passé à `DayView` comme `onSelectTache`.

## Décisions

- **Bornes des blocs** : `getBlocInterval` (dans `compute.ts`) est désormais l'unique implémentation de « durée par défaut 30 min si `heure_fin` absente ou `heure_fin <= heure` » ; `TimeGrid.getTacheBlockStyle` l'appelle au lieu de dupliquer la logique. Garantit par construction que `layoutChevauchements` utilise exactement les mêmes bornes que le rendu (contrainte explicite du prompt), plutôt que de risquer une dérive entre deux implémentations.
- **Regroupement transitif** : tri par heure de début puis balayage glouton classique (« merge overlapping intervals ») — un bloc rejoint le groupe courant tant que son début est strictement avant la fin maximale déjà vue dans le groupe. Capture bien les chaînes A–B–C où A et C ne se chevauchent pas directement mais sont reliés par B. `nbColonnes` est calculé **par groupe** (pas un maximum global), donc A et C peuvent se retrouver dans la même colonne si leurs horaires réels ne se chevauchent pas, même si B (entre les deux) a besoin d'une colonne à part — vérifié par le script de test (cas 3).
- **Écart de 2 px entre colonnes** : implémenté par une réduction symétrique de `COLUMN_GAP_PX / 2` de chaque côté de chaque colonne (`calc()`), y compris les colonnes de bord. Plus simple qu'une formule asymétrique qui ne réduirait que les bords internes ; l'écart visuel en bord de grille est donc légèrement plus large (1 px) qu'entre deux colonnes internes (2 px cumulés) — différence jugée imperceptible et non demandée explicitement par le prompt.
- **Positionnement conditionnel** : `left`/`width` inline ne sont appliqués que si `nbColonnes > 1` ; sinon la classe Tailwind `inset-x-1`/`inset-x-0.5` d'origine est conservée telle quelle, pour garantir un rendu pixel-identique en l'absence de chevauchement (exigence explicite du prompt).
- **Aria-label toujours une plage complète** : le prompt demande le format « <titre>, de HH:MM à HH:MM ». Pour un bloc sans `heure_fin` saisie, l'aria-label annonce quand même une fin (départ + 30 min par défaut), cohérente avec la hauteur réellement affichée du bloc — plutôt que d'omettre la fin ou de improviser un second format pour ce cas.
- **Retap sur le même bloc (retrigger de la surbrillance)** : `TaskCard` retire/réapplique la classe `tache-surbrillance` et relance le scroll via un `useEffect` keyé sur le booléen `highlighted` (`TasksList.tsx:296-304`). Un simple `setTacheEnSurbrillanceId(id)` avec un `id` déjà sélectionné ne change pas la valeur de l'état ⇒ pas de re-rendu ⇒ l'effet ne se redéclenche pas. `AgendaView.handleSelectTache` passe donc d'abord par `null` (retire réellement la surbrillance) puis refixe l'`id` dans un `requestAnimationFrame` (donc dans un rendu séparé, non batché avec le premier) : un aller-retour `false → true` est garanti à chaque tap, que la tâche soit déjà surlignée ou non. Aucune modification de `TasksList.tsx`/`ArchivedTasksSection.tsx` n'était nécessaire : les blocs cliquables ne visent que des tâches actives (`dayTachesAvecHeure`), toujours affichées dans la liste sous la grille (jamais dans la section Archivées, qui ne s'ouvre automatiquement qu'au montage pour le deep-link de notification).
- **Vue Semaine inchangée** : `TacheBlock` y est rendu sans `onSelect`, donc comme un `<div>` non interactif (un `<button>` imbriqué dans le bouton de sélection du jour, déjà en place, serait invalide en HTML et casserait l'a11y). Le tap sur un bloc y ouvre donc toujours le jour, comme avant.
- **Swipe de période / pinch-zoom** : aucun changement à `useAgendaZoom` ni aux gestionnaires `onTouchStart/Move/End` d'`AgendaView`. Un tap sans déplacement du doigt reste sous le seuil de 50 px (`SEUIL_SWIPE_HORIZONTAL_PX`) qui déclenche le changement de jour, et le pinch-zoom ne s'active que sur un geste à deux doigts : aucun des deux mécanismes n'est donc perturbé par le nouveau `onClick` du bloc — vérifié par lecture du code, pas testé au doigt (voir « Non vérifié »).
- **`prefers-reduced-motion`** : non touché — `tache-surbrillance` et son `@media (prefers-reduced-motion: reduce)` dans `globals.css` sont inchangés ; le nouveau chemin (retap) déclenche la même classe/animation existante, déjà couverte par la règle réduite.
- **`ghostButton`** : non touché, conformément à la contrainte.

## Écarts avec le prompt

- Aucun écart fonctionnel identifié. Seule liberté d'implémentation : le résultat de `layoutChevauchements` est une `Map<string, {colonne, nbColonnes}>` plutôt qu'un `Record`/objet simple (accès `O(1)`, cohérent avec le reste du module `compute.ts` qui n'expose que des fonctions pures sans dépendance React).

## Vérifié

- `npx tsc --noEmit` : 0 erreur (après `npm ci`, `node_modules` étant absent en début de session, et un premier `npm run build` pour générer les types Next.js `LayoutProps` consommés par `src/app/layout.tsx`, sans quoi `tsc` échoue sur un fichier non lié à ce lot).
- `npm run lint` (ESLint) : 0 erreur.
- `npm run build` (`next build`, Turbopack) : compile et génère les 24 routes sans erreur.
- `layoutChevauchements`/`getBlocInterval` : script `tsx` temporaire (créé puis supprimé, jamais commité) couvrant : aucun chevauchement, deux tâches simultanées, chaîne A–B–C (A chevauche B, B chevauche C, A ne chevauche pas C), bloc sans heure de fin, `heure_fin <= heure` traitée comme absente, bloc sans heure du tout (absent du résultat). Tous les cas passent.

## Non vérifié

- **Rendu visuel réel** : impossible de lancer l'app avec des données (pas de variables Supabase dans cet environnement). Le positionnement des colonnes, l'espacement de 2 px, l'apparence du bloc cliquable (focus, aria) et le scroll-vers-la-carte n'ont donc été vérifiés que par lecture de code et par le script de test unitaire de la fonction pure — pas dans un navigateur.
- **Test tactile réel** (tap vs swipe vs pinch sur un vrai écran) : raisonnement fait sur le code des trois mécanismes (`gererToucheFin`, `useAgendaZoom`, `onClick`), pas observé sur appareil.
- **Lecteur d'écran** : le format exact de l'aria-label (« <titre>, de HH:MM à HH:MM ») n'a pas été entendu avec un lecteur d'écran réel.
