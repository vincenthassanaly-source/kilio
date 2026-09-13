# Fluidité de navigation et confort visuel — 4 chantiers de l'audit du 09-13

Date : 2026-09-13

Implémentation des 4 pistes de `reports/2026-09-13-audit-fluidite-navigation.md`
(source de vérité relue, non rouverte). Chantiers indépendants, chacun documenté
ci-dessous avec les écarts d'implémentation par rapport à l'énoncé initial —
tous nécessaires, expliqués au fil du texte.

## 1. Animation d'ouverture/fermeture de `Modal.tsx`

`src/components/Modal.tsx` : le backdrop et la feuille sont devenus des
`motion.div` (`framer-motion`) avec `initial`/`animate`/`exit` — fondu du
fond (`opacity`, 180ms) + glissé de la feuille depuis le bas
(`y: "100%" → 0`, spring `stiffness: 420, damping: 38`), gardé par
`useReducedMotion()` (durée 0 si préférence active), sur le modèle de
`ToastHost.tsx`.

**Écart nécessaire par rapport à l'énoncé** : l'énoncé indiquait qu'un seul
changement (`Modal.tsx`) suffirait pour les deux appelants. En pratique,
`exit` ne joue **que** si le composant est démonté sous un `<AnimatePresence>`
côté appelant — sans ça, framer-motion ignore silencieusement `exit` et
supprime le nœud instantanément (aucune erreur, juste aucune animation de
sortie). `QuickAddFab.tsx` et `AgendaView.tsx` ont donc chacun reçu un
changement minimal et mécanique : envelopper leur(s) `{condition && <Modal>}`
existant dans `<AnimatePresence>` (+ `key` sur chaque `<Modal>`), sans toucher
à la logique de fermeture (`onClose`, `history.back()`, `useBackClose`).
Bénéfice constaté : parce que `AnimatePresence` réagit au changement du
booléen React lui-même, l'animation de sortie couvre **toutes** les façons de
fermer déjà en place — clic sur "Fermer", clic sur le fond, bouton retour
matériel (`useBackClose`), et fermeture après sauvegarde (`onDone` →
`goBackSteps`) — sans code spécifique à chacune.

**Vérifié en conditions réelles** (Playwright, détails en Phase 3) : à 50ms
dans l'ouverture, la feuille est encore à mi-glissé
(`translateY ≈ 58px`) ; à 60ms dans la fermeture (après clic sur "Fermer"),
la feuille est **toujours dans le DOM** et le fond est à mi-fondu
(`opacity ≈ 0.27`) — confirme que `exit` joue réellement avant la
disparition, pas seulement à l'ouverture.

## 2. Press state sur les cartes tapables

**Écart par rapport à l'énoncé** : l'énoncé demandait d'ajouter
`active:scale-[0.97]` à `card`/`cardTight`/`listCard` dans `ui.ts`. En
vérifiant chaque usage (`grep` exhaustif), `card` s'est révélé trop
polyvalent pour ça sans casser autre chose : il sert aussi bien de carte
tapable isolée que de **conteneur de groupe** rassemblant plusieurs éléments
indépendants (ex. `DashboardTachesSection.tsx`, où un seul `card` enrobe
plusieurs `DashboardTaskItem` avec chacun sa propre case à cocher) ou de
conteneur de **formulaire** (tous les `Add*Toggle.tsx`). `:active` en CSS
s'applique à un élément **et à tous ses ancêtres** tant que le bouton de la
souris/le doigt reste appuyé : ajouter `active:scale` à `card` aurait donc
fait trembler tout le bloc "Aujourd'hui" du Dashboard au moindre tap sur
**une seule** case à cocher parmi plusieurs, ou fait rétrécir n'importe quel
formulaire au tap dans un champ — un effet secondaire large, non demandé et
visible sur l'écran le plus utilisé au quotidien (Accueil).

- **`listCard`** et **`cardTight`** : vérifiés comme toujours utilisés en
  ligne de liste représentant une seule entité (jamais un groupe) —
  `active:scale-[0.97] transition` ajoutés sans risque, dans `ui.ts`.
  S'applique automatiquement à `HabitudeCard.tsx` (vue principale) et
  `ObjectifCard.tsx` (vue principale), tous deux déjà sur `listCard`.
- **`card`** : non modifié dans `ui.ts` (raison documentée en commentaire
  dans le fichier). Seule exception : `NoteCard.tsx`, explicitement nommée
  dans l'énoncé, où `active:scale-[0.97] transition` a été ajouté
  **localement** sur sa tuile principale (pas dans `ui.ts`, pas sur sa
  branche édition/formulaire) — c'est la seule utilisation de `card` visée
  par ce chantier, et son animation d'entrée/sortie existante
  (`motion.li`/`layout`/`initial`/`animate`/`exit`) n'a pas été touchée.
- **`DashboardTaskItem.tsx`** : vérifié — ne s'appuie sur aucun des 3 styles
  (juste un `<div>` + `CheckToggle`). Constat corrigé par rapport à l'audit
  du 09-13 : `CheckToggle` (`src/components/CheckToggle.tsx`) a déjà sa
  propre micro-animation au moment du check (un "pop" du cercle + tracé
  animé, ~180ms) — aucun changement nécessaire ici.

## 3. Indicateur glissant sur les sélecteurs de vue

`AgendaView.tsx` (Jour/Semaine/Mois/Liste) et `HabitudesView.tsx`
(Aujourd'hui/Historique) : réplication à l'identique du pattern
`ACTIVE_PILL_LAYOUT_ID`/`pillTransition` de `BottomNav.tsx` — un
`motion.div` à `layoutId` (spring `stiffness: 500, damping: 40`, ou
`duration: 0` si `useReducedMotion()`), rendu uniquement derrière l'onglet
actif, la couleur de fond exacte déjà utilisée (`bg-agenda`/`bg-habitudes`)
inchangée. `layoutId` distinct par sélecteur
(`agenda-vue-active-pill`/`habitudes-vue-active-pill`) : les deux sélecteurs
et `BottomNav` sont montés simultanément sur ces écrans, un id partagé
aurait fait glisser le fond de l'un vers l'autre.

Aucun changement dans `BottomNav.tsx` lui-même (pattern lu, pas modifié).
Aucun changement au comportement du swipe interne d'Agenda ni de
`agenda-glisse-*` (mécanisme de changement de *période*, indépendant de
celui de changement de *vue* touché ici).

**Vérifié en conditions réelles** : capture d'écran après clic sur
"Semaine" — le fond `bg-agenda` (couleur réelle confirmée via
`getComputedStyle`) est bien positionné derrière "Semaine", plus derrière
"Jour".

## 4. Skeleton de chargement sur `CarburantsView`

Remplacement du texte brut (`"Recherche des stations les plus proches…"`)
par `<ListItemSkeletonGroup count={5} withSubtitle />` pendant
`phase === "chargement"`, réutilisant le composant déjà utilisé par le
reste de l'app (`src/components/skeletons/ListItemSkeleton.tsx`). Aucun
`loading.tsx` ajouté (le fetch dépend de la géolocalisation côté client,
comme documenté dans l'audit) — le skeleton est rendu directement dans le
composant, remplacé par les vraies cartes de stations dès que
`statut.phase` passe à `"prete"`/`"erreur"`.

**Vérifié en conditions réelles** : capture d'écran à 150ms après chargement
de la page (avant résolution du repli géoloc Marseille) — 5 lignes de
skeleton visibles, cohérentes visuellement avec le reste de l'app.

## Phase 3 — Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur.
- `npx eslint .` : ✅ aucune erreur ni avertissement.
- `npx next build` (Turbopack) : ✅ compilation + TypeScript internes verts
  (`✓ Compiled successfully`, `Finished TypeScript`). Échec de la
  génération statique de `/carburants` uniquement — même cause
  pré-existante et sans rapport que les sessions précédentes (accès réseau
  Supabase bloqué dans ce sandbox, `supabaseKey is required` dans
  `getPreferencesNavigationResolues`, appelée par le layout partagé pour
  toute route de `(app)/`).
- CSS compilé : `active\:scale-\[0\.97\]:active{scale:.97}` bien présent
  (règle Tailwind partagée, déjà validée dans le rapport du 09-12).

### Vérification manuelle (Playwright + Chromium headless, mobile 390×844)

Mêmes précautions que les sessions précédentes (sandbox sans accès
Supabase) : mocks temporaires en mémoire sur
`getPreferencesNavigationResolues`, `getTachesAvecRelations`, `getListes`,
`getTags`, `getPlanningTravail`, `getPlanningTravailExceptions`,
`getHabitudesDuJour` (retour de tableaux/objets vides, sans appeler
`createAdminClient()`), le temps de charger `/agenda`, `/habitudes` et
`/carburants` (client-only, aucun mock nécessaire au-delà du layout) sous
`next dev`. **Mocks entièrement retirés après les tests** —
`git checkout -- src/app/actions/{habitudes,planning-travail,preferences-navigation,taches}.ts`,
confirmé par `git status`/`git diff` : seuls les 7 fichiers listés en fin de
rapport restent modifiés dans l'arbre final ; `tsc`/`eslint` ré-exécutés
après restauration (résultats ci-dessus, inchangés).

Testé et confirmé sans erreur console/page sur les trois écrans :
- Ouverture/fermeture de la Modal (bouton "+" d'Agenda) : glissé + fondu
  visibles à l'ouverture et à la fermeture (détails chiffrés en section 1).
- Bascule Jour → Semaine dans Agenda : fond `bg-agenda` glissé confirmé.
- Bascule Aujourd'hui → Historique dans Habitudes : rendu sans erreur
  (même mécanisme que Agenda, capture d'écran prise).
- Écran Carburants pendant le chargement : skeleton visible et confirmé
  (`ListItemSkeletonGroup`, 5 lignes).

Non testé en conditions réelles : press state sur `NoteCard`/`HabitudeCard`/
`ObjectifCard` (nécessiterait de mocker `getNotes`/etc. en plus — la classe
CSS `active:scale-[0.97]` est en revanche confirmée présente et fonctionnelle
dans le CSS compilé, mécanisme identique et déjà validé pour les boutons le
09-12) ; à confirmer visuellement par Vincent en conditions réelles si
souhaité.

## Fichiers modifiés

- `src/components/Modal.tsx` (animation d'ouverture/fermeture)
- `src/app/(app)/QuickAddFab.tsx` (wrap `AnimatePresence` autour des 3 Modal)
- `src/app/(app)/agenda/AgendaView.tsx` (wrap `AnimatePresence` + indicateur
  glissant du sélecteur de vue)
- `src/app/(app)/habitudes/HabitudesView.tsx` (indicateur glissant du
  sélecteur de vue)
- `src/app/(app)/carburants/CarburantsView.tsx` (skeleton de chargement)
- `src/app/(app)/notes/NoteCard.tsx` (press state local sur la tuile
  principale)
- `src/lib/ui.ts` (`cardTight`, `listCard` : press state)
- `reports/2026-09-13-fluidite-4-chantiers.md` (ce rapport)

Aucun autre fichier modifié.
