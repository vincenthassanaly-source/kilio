# Audit : pistes restantes pour la fluidité de navigation et le confort visuel

Date : 2026-09-13

Audit seul, aucune implémentation. Objectif : identifier ce qui pourrait
encore améliorer la fluidité/le confort visuel de Kilio **en plus** de
l'existant (crossfade + slides directionnels via View Transitions API,
morph nommé carte → détail sur Collection/Objectifs/Recettes/Documents,
swipe entre onglets, pastille active glissante de `BottomNav`, skeletons
`loading.tsx` sur la quasi-totalité des routes, press states uniformisés
sur `primaryButton`/`secondaryButton`/`ghostButton`/`dangerButton`,
animations d'entrée/sortie de `ToastHost` et `ModulesGrid`). Rien de tout
cela n'est remis en cause ci-dessous.

Rapports déjà livrés sur le sujet et relus avant cet audit (non reproduits,
non contredits) : `2026-09-04-fluidite-navigation.md`,
`2026-09-06-fix-navigation-bottomnav-freeze.md`,
`2026-09-11-fix-navigation-abandon-apres-timeout.md`,
`2026-09-12-investigation-navigation-bloquee.md`,
`2026-09-12-uniformisation-micro-interactions.md`.

## 1. Cartes tapables sans aucun press state

**Écran/composant** : tout composant utilisant `card`/`cardTight`/`listCard`
de `src/lib/ui.ts` comme carte cliquable — ex. `NoteCard.tsx`,
`HabitudeCard.tsx`, `ObjectifCard.tsx`, `DashboardTaskItem.tsx`. Vérifié par
grep : aucun de ces composants n'a de `active:scale`/`whileTap`.

**Problème concret** : le rapport du 2026-09-12 a délibérément limité son
périmètre aux 4 styles de bouton partagés (`primaryButton` et consorts) et
à `addCard` (déjà `active:scale-[0.99]`) — les styles `card`/`cardTight`/
`listCard` eux-mêmes n'ont toujours aucun retour visuel à l'appui, alors
que ce sont les mêmes cartes qui portent l'essentiel des taps quotidiens
(ouvrir une note, cocher une habitude, ouvrir un objectif, une tâche du
dashboard). `NoteCard` a bien une animation d'entrée/sortie (`motion.li`,
ajout/suppression de note) mais rien au tap lui-même.

**Skill motion-dev-animations** : pas nécessaire pour l'essentiel — la même
technique CSS pure (`active:scale-[0.97]` + `transition`) déjà validée sur
les boutons s'applique à l'identique. Le skill n'apporterait une vraie
valeur qu'en option, pour les cartes déjà montées en `motion.li`/`motion.div`
(NoteCard, ObjectifCard si migré) où un `whileTap` avec un spring léger
donnerait un ressenti plus « premium » qu'un simple `active:scale` CSS —
non indispensable.

**Risque de conflit avec le système de transition existant** : faible.
Changement purement visuel au tap (transform CSS ou `whileTap`), aucun
rapport avec `startViewTransition`/`data-nav-direction` ni avec les
animations d'entrée/sortie de liste déjà en place.

## 2. `Modal.tsx` sans animation d'ouverture/fermeture

**Écran/composant** : `src/components/Modal.tsx`, utilisé par
`QuickAddFab.tsx` (bouton "+" de l'Accueil) et `AgendaView.tsx` (création/
édition d'événement). Le composant apparaît/disparaît instantanément (pas
de `AnimatePresence`, pas de transform, pas de transition CSS), contraste
net avec `ToastHost.tsx` (juste à côté dans l'arborescence des composants
partagés) qui, lui, anime déjà proprement son entrée/sortie via
`framer-motion`.

**Problème concret** : sur les deux écrans les plus utilisés au quotidien
(Accueil pour l'ajout rapide, Agenda pour créer un événement — Agenda ayant
reçu à lui seul 4 sessions de correctifs de navigation cette semaine), la
feuille du bas apparaît/disparaît d'un coup sec, sans le glissé + fondu du
fond qu'on attendrait d'un bottom sheet.

**Skill motion-dev-animations** : oui, réelle valeur ajoutée ici — c'est
exactement le cas d'usage « Layout/Exit animations » du skill
(`AnimatePresence` + slide-up depuis le bas + fondu du backdrop), un
pattern que l'app n'a pas encore implémenté ailleurs pour un composant de
ce type (à la différence du slide de `BottomNav`/`agenda-glisse-*`, qui ne
couvre que des transitions de route ou de période, pas un sheet modal).

**Risque de conflit avec le système de transition existant** : faible.
`Modal` est un composant client monté/démonté par un état local
(`fabOpen`), sans changement de route ni de `pathname` — aucune
interaction avec `startViewTransition`/`data-nav-direction`. Seule
précaution : garder la même garde `prefers-reduced-motion` que le reste de
l'app (déjà centralisée dans `globals.css` et via `useReducedMotion`).

## 3. Sélecteurs de vue internes sans indicateur glissant (Agenda, Habitudes)

**Écran/composant** : le sélecteur Jour/Semaine/Mois/Liste d'`AgendaView.tsx`
(ligne ~249) et le sélecteur à 2 vues d'`HabitudesView.tsx` (ligne ~41) :
les deux appliquent seulement `bg-agenda`/couleur active avec
`transition-colors`, un changement de couleur sec sans transition de
position — alors que `BottomNav.tsx` a déjà, pour un besoin identique (mettre
en évidence l'item actif parmi plusieurs), un fond qui glisse en douceur
d'un onglet à l'autre via `layoutId="bottom-nav-active-pill"` +
`framer-motion`.

**Problème concret** : incohérence de traitement entre deux mécanismes de
sélection à onglets visuellement très proches (bottom nav vs. sélecteurs de
vue internes) — l'un a un indicateur qui glisse, l'autre non. Agenda est
l'écran ayant reçu le plus d'attention cette semaine sur la fluidité de
navigation ; ce sélecteur de vue y est utilisé en permanence.

**Skill motion-dev-animations** : non nécessaire — le mécanisme existant
(`layoutId` + `framer-motion`, déjà en dépendance et déjà validé en
production sur `BottomNav`) suffit très exactement ; il s'agit de
répliquer un pattern maison déjà éprouvé, pas d'en introduire un nouveau.

**Risque de conflit avec le système de transition existant** : faible.
Purement un changement de state React interne à la page (`view`/vue active),
aucun changement de route — pas de risque de double effet superposé avec
les View Transitions ou `agenda-glisse-*` (qui, eux, réagissent à un
changement de *période*, pas de *vue*).

## 4. `CarburantsView` : état de chargement en texte brut, sans skeleton

**Écran/composant** : `src/app/(app)/carburants/CarburantsView.tsx`. C'est
la seule vue principale de l'app sans aucun skeleton — son fetch dépend de
la géolocalisation navigateur donc se fait entièrement côté client (pas de
Server Component/Suspense, contrairement aux autres modules), et
`carburants/` n'a d'ailleurs pas de `loading.tsx` (normal : un `loading.tsx`
ne couvrirait pas un fetch déclenché après hydratation). Le seul retour
visuel pendant `phase === "chargement"` est le texte `"Recherche des
stations les plus proches…"`.

**Problème concret** : contraste avec le reste de l'app, où
`ListItemSkeletonGroup`/`GridSkeleton` (`src/components/skeletons/`)
couvrent systématiquement l'attente initiale.

**Skill motion-dev-animations** : non nécessaire — un skeleton "maison"
cohérent avec l'existant (réutiliser `ListItemSkeletonGroup`, déjà pensé
pour des listes de cartes similaires aux stations) suffit ; pas besoin de
Framer Motion ni de nouveau système d'animation.

**Risque de conflit avec le système de transition existant** : faible.
État interne à un composant client isolé, aucune interaction avec le
routeur ni les View Transitions.

## Non retenu / déjà couvert (pour mémoire)

- Morph nommé carte → détail (`viewTransitionName`) : déjà en place sur
  Collection, Objectifs, Recettes et Documents — tous les écrans avec une
  route `[id]` en bénéficient déjà, rien à ajouter.
- `ModulesGrid` (grille "Plus", réordonnancement par drag) : `whileTap`,
  tremblement d'édition et masquage pendant le drag déjà présents.
- `ToastHost` : déjà animé (`AnimatePresence` + spring/fade).
- Barres de progression à largeur variable (ex. `ObjectifSuiviValeur`) :
  déjà sur `transition-all`, effet déjà fluide.
- `PullToRefresh` : anime `height`/`rotate` en direct pendant le geste,
  fonctionne déjà correctement — optimisable en théorie (transform plutôt
  que height) mais aucun symptôme rapporté, non retenu comme piste ici.
