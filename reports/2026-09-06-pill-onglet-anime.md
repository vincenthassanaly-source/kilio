# Pill animé pour l'onglet actif de la bottom nav

Date : 2026-09-06

## Objectif

Remplacer le changement instantané de fond de l'onglet actif dans `BottomNav.tsx` (`background: active ? "var(--accent-kcal-soft)" : "transparent"` appliqué directement sur chaque `<Link>`) par un fond unique qui glisse en douceur d'un onglet à l'autre, façon barre d'onglets iOS.

## Approche technique

### Un seul `motion.div` à `layoutId` partagé

Un composant `ActivePill` (nouveau, dans `BottomNav.tsx`) :

```tsx
const ACTIVE_PILL_LAYOUT_ID = "bottom-nav-active-pill";

function ActivePill({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.div
      layoutId={ACTIVE_PILL_LAYOUT_ID}
      className="absolute inset-0 rounded-[18px] pointer-events-none"
      style={{ background: "var(--accent-kcal-soft)" }}
      transition={pillTransition(reduceMotion)}
    />
  );
}
```

Il n'est rendu que par le slot actif (`{active && <ActivePill .../>}`), aussi bien dans `BottomNavSlot` (les 4 emplacements épinglables) que dans le bouton "Plus" (rendu directement dans `BottomNav`). À chaque changement d'onglet actif, l'ancienne instance démonte et une nouvelle, ailleurs dans l'arbre, remonte avec le **même** `layoutId` : framer-motion détecte la correspondance (sans `AnimatePresence`, pas nécessaire ici puisqu'il n'y a jamais deux instances montées simultanément) et anime lui-même la transition de position/taille entre les deux rects — c'est le pattern standard "shared layout animation" de framer-motion pour un indicateur d'onglet.

### Positionnement derrière l'icône + le label, sans toucher au drop

- Le `<Link>` de chaque slot passe de `background` inline à `position: relative` (`className="relative flex flex-col items-center gap-0.5 ..."`), et `ActivePill` est `absolute inset-0` : il occupe exactement le même rectangle (bord à bord, padding compris) que l'ancien `background` inline, donc même `rounded-[18px]`/`px-3 py-[7px]` visuellement, aucun saut à l'implémentation.
- Ordre de peinture : le conteneur est `display: flex`, donc l'icône (`<svg>`) et le `<span>` du label — éléments flex — sont peints comme des éléments positionnés (spec Flexbox), après les éléments en DOM plus tôt de même niveau d'empilement. `ActivePill` est inséré en premier enfant, donc peint **derrière** l'icône et le label sans wrapper ni `z-index` supplémentaire.
- `pointer-events: none` sur le pill : aucune interception d'événement pointer possible.
- `ref={setNodeRef}` (useDroppable) et le style `outline`/`outlineOffset` du dashed ring de drop restent portés exclusivement par le `<Link>` parent, inchangés — `ActivePill` est un enfant supplémentaire, jamais le nœud `useDroppable`. Confirmé en Playwright (voir Phase 3) : l'anneau pointillé s'affiche toujours normalement pendant un drag depuis `ModulesGrid`.

### `prefers-reduced-motion`

Le pill est animé par framer-motion via des mutations directes de `transform` (Web Animations API), pas par la propriété CSS `transition` : contrairement aux animations déjà neutralisées dans `globals.css` (`@keyframes` du swipe Agenda, du tremblement des tuiles en édition, et des View Transitions), une règle CSS `transition: none` n'aurait **aucune prise** sur ce type d'animation JS. `globals.css` n'a donc pas été modifié pour ce chantier — la seule approche techniquement effective est `useReducedMotion()` de framer-motion, appelé une fois dans `BottomNav()` et propagé en prop `reduceMotion` à chaque `ActivePill` :

```ts
function pillTransition(reduceMotion: boolean) {
  return reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 };
}
```

Vérifié en Playwright avec `reducedMotion: 'reduce'` : le pill est déjà à sa position finale dès la frame suivant le clic (aucune position intermédiaire), alors qu'en mode normal on observe ~7 frames d'interpolation avant stabilisation (cf. Phase 3).

## Fichiers modifiés

- `src/components/BottomNav.tsx` : seul fichier modifié.
  - Ajout de `ActivePill`, `ACTIVE_PILL_LAYOUT_ID`, `pillTransition`.
  - `BottomNavSlot` : suppression du `background` inline, ajout de `position: relative` et du rendu conditionnel de `ActivePill`, prop `reduceMotion` ajoutée.
  - `BottomNav` : `useReducedMotion()` appelé une fois, prop `reduceMotion` transmise aux slots et au bouton "Plus" (même traitement : `position: relative` + `ActivePill` conditionnel à la place du `background` inline).
  - Couleur du texte/icône (`color`, `fontWeight`) inchangée, toujours calculée indépendamment du pill.

`globals.css`, `NavigationEditContext.tsx`, `registry.ts`, `TabSwipeWrapper.tsx` : non modifiés (lus en Phase 1, aucune modification nécessaire — cf. justification ci-dessus pour `globals.css`).

## Vérifications (Phase 3)

- `npx tsc --noEmit` : une seule erreur, `src/app/layout.tsx(41,50): Cannot find name 'LayoutProps'` — pré-existante et sans rapport avec ce chantier (confirmée identique via `git stash` sur `origin/kilio` avant toute modification, et absente des erreurs remontées par `next build` qui régénère les types Next.js internes).
- `npx eslint .` : ✅ aucune erreur ni avertissement, sur tout le repo.
- `npx next build` : ✅ build de production réussi (Turbopack), TypeScript vérifié en interne par Next.js sans erreur, 22 routes générées.

### Vérification manuelle (Playwright + Chromium headless, viewport mobile 390×844)

Ce sandbox n'a pas d'accès réseau sortant vers le projet Supabase réel (`Host not in allowlist: vsmtkopkqasrdnjceegp.supabase.co` — restriction de la politique réseau de cet environnement), ce qui bloque toute page de l'app (chaque route sous `(app)/` lit des préférences ou des données via Supabase server-side). Pour tout de même exécuter une vraie vérification E2E de l'app compilée (et pas juste un composant isolé), un petit stub HTTP local imitant l'API REST de PostgREST a été lancé le temps des tests (`http://127.0.0.1:4321`, renvoie `[]`/objet par défaut pour toute requête), avec `NEXT_PUBLIC_SUPABASE_URL` pointé dessus temporairement dans `next.config.ts`. **Ce stub et ce repointage ont été entièrement retirés après les tests** — `git diff` confirme que seul `BottomNav.tsx` reste modifié dans l'arbre final.

Résultats :
- **Clic entre les 4 onglets** (`/`, `/nutrition`, `/taches`, `/habitudes`) : le pill glisse d'un rectangle à l'autre (`x: 40 → 101 → 169 → ... → 40`), avec échantillonnage toutes les ~30 ms montrant une vraie interpolation avec léger dépassement typique d'un spring (`45, 88, 113, 139, 154, 163, 167, 169, 169, 169`) — pas de saut instantané.
- **Bouton "Plus"** : sur `/plus` lui-même, aucun onglet n'est actif (comportement préexistant inchangé : `/plus` ne correspond à aucun item du registre) ; sur `/agenda` (module secondaire non épinglé), le pill apparaît bien sous le bouton "Plus" (`x: 305`, position la plus à droite).
- **`prefers-reduced-motion: reduce`** (contexte Playwright `reducedMotion: 'reduce'`) : le pill est déjà à sa position finale immédiatement après le clic, sans frame intermédiaire — transition réellement instantanée.
- **Drag-and-drop d'édition** : appui long (500 ms) sur une tuile de `ModulesGrid` (`/plus`) déclenche bien le mode édition (classe `.plus-tuile-edition` présente) ; en glissant la tuile "Agenda" au-dessus du slot "/nutrition" de la bottom nav, l'anneau pointillé (`outline: 2px dashed var(--accent-kcal)`) s'affiche correctement sur le slot survolé et reste absent des autres slots ; le dépôt aboutit bien à un réordonnancement réel de `modulesBarreBasse` (`['/', '/agenda', '/taches', '/habitudes', '/plus']` après drop). Aucune régression du `useDroppable`/`setNodeRef` détectée.
- Captures d'écran prises pendant les tests : onglet Nutrition actif (pill vert derrière icône+label, coins arrondis identiques à l'ancien fond) et grille "Plus".

Le swipe entre onglets (`TabSwipeWrapper.tsx`) n'a pas été testé au doigt via Playwright dans ce sandbox (émulation tactile limitée en headless), mais son mécanisme (`navigate(modulesBarreBasse[prochainIndex])`) déclenche exactement le même changement de `pathname` / `activeItemHref` qu'un clic direct sur un onglet — déjà validé ci-dessus — donc le pill glisse de la même façon, sans code spécifique au swipe dans `BottomNav.tsx`.
