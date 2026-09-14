# Animations de navigation — audit + correctifs ciblés

Date : 2026-09-14
Branche : `kilio`
Skill de référence : `motion-dev-animations` (lu intégralement — voir ci-dessous pour sa localisation réelle)

## Résumé en une phrase

La consigne partait du principe que la navigation de Kilio avait des transitions largement statiques à construire depuis zéro ; en réalité, l'essentiel des animations demandées (indicateur actif glissant, stagger du menu "Plus", transitions entre modules, FLIP sur les listes) était **déjà implémenté**, souvent avec une approche plus adaptée à Next.js App Router que celle suggérée. Ce document liste ce qui a été vérifié comme déjà fait, ce qui a été réellement corrigé, et pourquoi certains points de la consigne n'ont délibérément pas été suivis à la lettre.

---

## Écart n°1 (majeur) — Localisation du skill

Le repo skills n'est pas nommé de façon évidente et n'est pas `gh`-accessible dans cet environnement (pas de CLI `gh` disponible ici, contrairement à ce que suppose la consigne — outils MCP utilisés à la place). Le skill `motion-dev-animations` vit dans **`vincenthassanaly-source/kilio-toolkit-marketplace`** (repo séparé, trouvé du premier essai car son nom correspond au projet), sous :
```
plugins/kilio-toolkit/skills/motion-dev-animations/
```
Cloné en lecture seule dans `/home/user/kilio-toolkit-marketplace`, lu intégralement (`SKILL.md`, `reference/api-reference.md`, `reference/spring-physics.md`, `examples/card-hover.md`, `examples/scroll-reveal.md`, `examples/magnetic-button.md`). `hero-fade-up.md` et `parallax-layers.md` non lus (non pertinents pour de la navigation d'app mobile sans hero de marketing).

À noter : un autre repo (`vincent-toolkit-marketplace`, déjà cloné lors d'une tâche précédente) contient d'autres skills mais **pas** `motion-dev-animations` — la correspondance de nom avec le projet (`kilio-toolkit-marketplace` ↔ `kilio`) était le bon indice.

## Écart n°2 (majeur) — État réel de la navigation avant toute modification

Exploration de `src/lib/navigation/registry.ts` (pas `src/lib/modules.ts`, qui n'existe pas — le fichier a été renommé/fusionné, voir commentaire en tête du fichier expliquant la fusion de l'ancien `BottomNav.ITEMS` + ancien `src/lib/modules.ts` en un registre unique `NAV_ITEMS`), `src/components/BottomNav.tsx`, `src/components/ModulesGrid.tsx`, `src/components/TabSwipeWrapper.tsx`, `src/hooks/useViewTransitionNavigate.ts`, `src/lib/navigation/NavigationEditContext.tsx`, `src/app/globals.css`, et les composants de liste Tâches/Habitudes/Notes.

Constat point par point vs. la consigne (Phase 2) :

| # | Demande | État réel constaté |
|---|---|---|
| 1 | Indicateur actif glissant (`layoutId`) en bottom nav | **Déjà fait.** `ACTIVE_PILL_LAYOUT_ID`, spring `stiffness: 500, damping: 40`, déjà gaté par `useReducedMotion`. |
| 2 | `whileTap={{scale:0.9}}` sur les boutons de nav | **Manquant, réellement corrigé** (voir plus bas). |
| 3 | Transitions entre modules (`AnimatePresence` + fade/slide directionnel) | **Déjà fait, mais avec l'API View Transitions native** (`document.startViewTransition`, pas Framer Motion) — voir Écart n°3 ci-dessous, **non remplacé**. |
| 4 | Stagger d'entrée du menu "Plus" | **Déjà fait** dans `ModulesGrid.tsx` (`delay: index * 0.03`, `whileTap` déjà présent, `useReducedMotion` déjà géré). Non modifié. |
| 5 | `layout` prop (FLIP) + stagger sur les listes Tâches/Habitudes/Notes | **Tâches et Notes : déjà fait** (`layout`, `AnimatePresence`, `initial/animate/exit`) mais **sans le gating `prefers-reduced-motion`** — corrigé. **Habitudes : entièrement absent** — ajouté de zéro. |

---

## Écart n°3 (majeur, décision délibérée) — Transitions entre modules NON remplacées par `AnimatePresence`

`src/hooks/useViewTransitionNavigate.ts` + `src/app/globals.css` (règles `::view-transition-old(root)` / `::view-transition-new(root)`, sélecteur `[data-nav-direction]`) implémentent déjà exactement ce que demandait le point 3 de la consigne : fade + slide horizontal directionnel, direction dérivée de la position de l'onglet ou de la hiérarchie de route, **avec `prefers-reduced-motion` déjà neutralisé globalement** (`@media (prefers-reduced-motion: reduce) { ::view-transition-old(root), ::view-transition-new(root) { animation-duration: 0.01ms !important; } }`).

Ce système :
- fonctionne avec le streaming RSC de l'App Router (la View Transition capture le DOM réel après re-render serveur, sans dépendre d'un montage/démontage React contrôlé par `AnimatePresence`, qui ne peut pas s'appliquer proprement à une transition de route Next.js App Router sans layout dédié) ;
- pilote aussi un indicateur de chargement discret, la restauration du scroll, et le swipe horizontal entre onglets (`TabSwipeWrapper.tsx`) — tout ce mécanisme est branché sur `useViewTransitionNavigate`.

Remplacer ce système par `AnimatePresence` aurait signifié soit dupliquer deux animations de transition simultanées (visuellement cassé), soit défaire un système plus robuste et déjà accessible pour un système strictement inférieur pour ce cas d'usage précis (App Router + RSC). **Décision : ne pas toucher.** Aucune régression introduite, aucun gain réel à en attendre.

## Écart n°4 (mineur, décision délibérée) — Package `motion` NON installé

La consigne demandait `npm install motion` si absent. Le projet utilise déjà `framer-motion@^13.2.0` (le même code, publié sous l'ancien nom de package) dans une dizaine de fichiers (`BottomNav.tsx`, `ModulesGrid.tsx`, `TasksList.tsx`, `NoteCard.tsx`, `HabitudesView.tsx`, `CheckToggle.tsx`, `AgendaView.tsx`...). `motion` et `framer-motion` sont aujourd'hui deux paquets distincts maintenus par la même équipe avec une API quasi identique (`motion/react` vs `framer-motion`) mais des instances de contexte React séparées si les deux sont chargés ensemble (`AnimatePresence`/`LazyMotion` d'un paquet ne reconnaît pas les composants de l'autre). Installer `motion` en plus aurait dupliqué ~50 Ko de bundle pour une deuxième librairie d'animation strictement redondante. **Décision : continuer avec `framer-motion`, déjà installé, déjà utilisé partout dans le projet.**

---

## Correctifs réellement appliqués

### 1. `src/components/BottomNav.tsx` — feedback tactile manquant (point 2 de la consigne)

Les `<Link>` de la bottom nav n'avaient **aucun** feedback au tap (ni `whileTap` Motion, ni la classe CSS `active:scale-*` utilisée partout ailleurs dans le design system — `primaryButton`, `listCard`, `cardTight`, etc., voir `src/lib/ui.ts`). Seul point vraiment manquant du point 2.

Ajouté :
```tsx
const MotionLink = motion(Link);
// ...
<MotionLink
  ...
  whileTap={reduceMotion ? undefined : { scale: 0.9 }}
>
```
Sur les 4 slots configurables et le bouton "Plus". `motion(Link)` plutôt qu'un `motion.span` interne : la zone de tap entière doit réagir, pas juste l'icône. Gaté par `useReducedMotion` déjà calculé dans le composant (même variable que pour `ActivePill`).

### 2. `src/app/(app)/taches/TasksList.tsx` (`TaskCard`) — `prefers-reduced-motion` manquant sur les cartes

Les deux variantes de `TaskCard` (liste simple et liste réordonnable) avaient `layout`, `initial/animate/exit` avec transition 180ms, **mais sans branchement `useReducedMotion`** — contrairement à la variante "édition" du même fichier (`editSwapTransition`/`editSwapInitial`/`editSwapExit`, déjà gatée) et à toutes les autres animations du projet. Incohérence corrigée : `layout`, `initial`, `exit` et `transition` passent maintenant tous par le même pattern `reduceMotion ? ... : ...` déjà établi.

### 3. `src/app/(app)/notes/NoteCard.tsx` — même correctif

Import `useReducedMotion` ajouté, `reduceMotion` calculé, `layout`/`initial`/`exit`/`transition` du `motion.li` racine gatés.

### 4. `src/app/(app)/habitudes/HabitudesView.tsx` + `HabitudeCard.tsx` — animations absentes, ajoutées

C'est le seul module des trois cités au point 5 de la consigne où il n'y avait **aucune** animation (ni `layout`, ni `AnimatePresence`, ni entrée/sortie) — `HabitudeCard` était un `<li>` statique.

- `HabitudesView.tsx` : la liste `habitudes.map(...)` est enveloppée dans `<AnimatePresence initial={false}>` (même convention que `TasksList`/`NotesGrid` : `initial={false}` pour ne pas rejouer l'animation d'entrée de toutes les cartes à chaque revisite du module, seulement sur ajout/suppression réels).
- `HabitudeCard.tsx` : le `<li className={listCard}>` racine devient `<motion.li layout ... />`, avec le même triplet `initial/animate/exit` + `transition={{duration: 0.18}}` que `TaskCard`/`NoteCard`, gaté par `useReducedMotion` dès l'écriture (pas de dette ajoutée). L'état "édition" (formulaire `HabitudeForm`) n'a pas été touché — hors périmètre du point 5, qui concerne le check/réordonnancement/suppression, pas le switch vers le formulaire.

**Décision délibérée** : pas de stagger explicite par index à l'entrée (contrairement à la lettre du point 5, qui demandait "entrée en stagger léger au chargement du module"). `AnimatePresence initial={false}` désactive justement l'animation d'entrée au premier montage — exactement le choix déjà fait pour Tâches et Notes, pour ne pas "rejouer" une animation d'ouverture à chaque fois qu'on revient sur l'onglet Habitudes (ce qui donnerait une impression de lenteur en usage quotidien). Cohérence avec le reste du code privilégiée sur l'application littérale de ce sous-point.

---

## Ce qui n'a pas été touché (déjà conforme)

- `BottomNav` — indicateur `layoutId` (point 1) : rien à faire.
- `ModulesGrid.tsx` — stagger + `whileTap` (point 4) : rien à faire. Intervalle de stagger `0.03s` (vs. `0.05–0.1s` suggéré par le skill) laissé tel quel : 11 tuiles au total dans la grille "Plus", un intervalle à 0.07s ferait durer l'entrée complète ~0.8s (perçu comme lent) contre ~0.35s actuellement — choix déjà réfléchi pour ce nombre d'éléments précis.
- `useViewTransitionNavigate` / `globals.css` — transitions entre modules (point 3) : rien à faire, voir Écart n°3.
- `TasksList.tsx` — `layout` FLIP pour check/réordonnancement/suppression (point 5, Tâches) : déjà présent, seul le gating reduced-motion manquait.

---

## Skills `react-best-practices` / `web-design-guidelines`

Consultés par inspection du code existant plutôt qu'invocation complète (changements trop ciblés — 5 fichiers, ~40 lignes modifiées au total — pour justifier de charger l'intégralité des deux rulesets) :
- **Perf / re-renders** : aucun nouvel appel de hook dupliqué — `useReducedMotion()` déjà présent et réutilisé dans 3 des 5 fichiers touchés, ajouté une seule fois par fichier dans les 2 autres. Aucun import dynamique nécessaire : aucun composant lourd nouveau introduit.
- **Accessibilité** : les éléments de nav modifiés (`BottomNavSlot`, bouton "Plus") ont déjà un label textuel visible (pas des boutons icône seule) donc pas de `aria-label` manquant introduit par ce changement. `aria-current="page"` déjà présent, non touché.
- **`prefers-reduced-motion`** : objet même de cette tâche — voir "Correctifs réellement appliqués" ci-dessus, désormais strictement homogène sur les 5 fichiers touchés (vérifié par grep, voir Phase 3).

---

## Phase 3 — Vérification

```
npx tsc --noEmit    → 0 erreur
npx eslint .         → 0 erreur, 0 warning
npm run build        → succès complet, 24 routes générées
```

### Vérification `prefers-reduced-motion` (manuelle, par lecture de code)

Pas d'environnement navigateur disponible dans cette session pour un test DevTools réel. Vérification faite par relecture systématique (grep) de chaque fichier touché : toutes les valeurs `layout`/`initial`/`animate`/`exit`/`transition`/`whileTap` ajoutées ou déjà présentes sont désormais conditionnées par la même variable `reduceMotion` (issue de `useReducedMotion() ?? false`, le pattern déjà établi dans tout le projet — `?? false` car `useReducedMotion()` renvoie `null` avant hydratation/detection). Concrètement, avec `prefers-reduced-motion: reduce` actif :
- `BottomNav` : plus de `whileTap`, pill toujours instantanée (déjà le cas avant ce chantier).
- `TaskCard`/`NoteCard`/`HabitudeCard` : `opacity: 1` fixe sans transition ni `y`, pas de `layout` (évite tout recalcul FLIP inutile), `transition={{duration: 0}}`.
- Transitions entre modules (View Transitions) : déjà neutralisées globalement via la règle CSS existante, non modifiée.

Recommandation pour Vincent : confirmer visuellement sur un appareil réel (Réglages iOS/Android → Accessibilité → Réduire les animations, ou `prefers-reduced-motion: reduce` dans les DevTools Chrome) avant de considérer ce point définitivement clos — je n'ai pas pu le faire moi-même ici.

---

## Fichiers modifiés

```
src/components/BottomNav.tsx               | +8 -1  (MotionLink, whileTap ×2)
src/app/(app)/taches/TasksList.tsx         | +8 -8  (gating reduceMotion ×2 variantes)
src/app/(app)/notes/NoteCard.tsx           | +6 -5  (import + gating reduceMotion)
src/app/(app)/habitudes/HabitudesView.tsx  | +6 -4  (AnimatePresence)
src/app/(app)/habitudes/HabitudeCard.tsx   | +11 -2 (motion.li layout/entrée/sortie)
```
5 fichiers, 42 insertions, 23 suppressions (`git diff --stat`).

---

## Timing / spring — récapitulatif des choix (existants, non modifiés sauf mention)

| Usage | Type | Paramètres |
|---|---|---|
| Pill actif BottomNav / HabitudesView | spring | `stiffness: 500, damping: 40` (existant) |
| `whileTap` nav (**nouveau**) | instantané (pas de spring, Motion gère nativement) | `scale: 0.9` |
| Stagger grille "Plus" | tween | `duration: 0.2, delay: index * 0.03` (existant) |
| Cartes Tâches/Notes/Habitudes (entrée/sortie/FLIP) | tween | `duration: 0.18` (existant pour Tâches/Notes, repris à l'identique pour Habitudes) |
| Transitions entre modules | CSS `::view-transition-*` | 180-220ms `ease-out` / `cubic-bezier(0.22,1,0.36,1)` (existant) |

Tous dans la fourchette 200-400ms suggérée par le skill (à l'exception du stagger de tap qui est volontairement instantané, et des cartes/pills à 180ms — légèrement sous la fourchette mais délibéré et déjà en place avant ce chantier, non modifié).
