# Bouton retour — historique limité à un module racine au-dessus de l'accueil

## Le problème

Chaque navigation entre modules racine (Accueil, Nutrition, Tâches, Habitudes, Agenda, Courses, Budget, Objectifs, Collection, Notes, Réglages — via la barre du bas ou la grille « Plus ») empilait une entrée d'historique via `router.push`. La flèche retour matérielle du téléphone défilait donc les modules précédemment visités un par un (ex. Accueil → Notes → Tâches → Agenda → retour → Tâches → retour → Notes → retour → Accueil), au lieu de revenir directement à l'accueil.

## Correctif appliqué

### `src/lib/navigation/registry.ts`

Ajout d'un helper `isModuleRootPath(pathname)` qui identifie les routes « racine » de module : les `href` des 11 `NAV_ITEMS` du registre, plus `/plus` elle-même (grille de sélection de module — pas un module au sens strict, mais un écran de même niveau que les autres dans la barre du bas, d'où l'on peut rejoindre n'importe quel module non épinglé). Le match est exact (`Set.has`), jamais un préfixe, pour ne jamais confondre une racine avec une sous-route (ex. `/taches/listes/abc`).

### `src/hooks/useViewTransitionNavigate.ts`

Dans le callback de navigation (point centralisé utilisé par `BottomNav` et `TransitionLink`, donc aussi par la grille « Plus » qui s'appuie sur `TransitionLink` via `ModulesGrid`/`ModuleTile`) :

- Calcul de `target` (pathname cible, query/hash retirés) en amont, avant la branche `startViewTransition`.
- `useReplace = pathname !== "/" && isModuleRootPath(pathname) && isModuleRootPath(target)` : `true` uniquement quand on quitte une route racine (autre que l'accueil) vers une autre route racine.
- `push = (h) => useReplace ? router.replace(h) : router.push(h)`, utilisée à la fois dans le callback passé à `startViewTransition` (navigateurs qui supportent l'API) et dans le fallback `else` (Safari/Firefox) — donc au même endroit et avec la même portée que l'appel `router.push` existant, sans toucher à `deriveDirection` ni à la logique de résolution de `direction`/timeout.

### Logique de distinction « racine de module » vs « drill-down »

- **Racine → racine** (ex. `/nutrition` → `/taches`, `/plus` → `/agenda`, `/taches` → `/`) : `router.replace`. Aucune entrée supplémentaire n'est empilée au-dessus de l'accueil, quel que soit le nombre de modules racine visités à la suite.
- **Exception : quitter l'accueil (`/`) elle-même** : reste un `router.push`, volontairement. L'entrée `/` doit rester une ancre dans l'historique — sinon, après un premier `replace` depuis l'accueil, plus aucune entrée `/` ne subsisterait pour que la flèche retour puisse y revenir (elle sortirait de l'app à la place).
- **Drill-down** (`pathname` ou `target` n'est pas une racine du registre, ex. `/taches` → `/taches/listes/abc`, `/objectifs` → `/objectifs/[id]`, `/collection` → `/collection/[id]`, ou la remontée `/taches/listes` → `/taches`) : `router.push` inchangé, l'historique continue de s'empiler normalement.

`useBackClose` (fermeture de sheets/menus via `popstate`) n'a pas été touché.

## Test manuel (mental)

- Accueil → Notes (push) → Tâches (replace) → Agenda (replace) : historique = `[Accueil, Agenda]`. Un retour ramène directement à Accueil. ✅
- Accueil → Notes (push) → détail d'une note (push, drill-down) : historique = `[Accueil, Notes, Détail]`. Un 1er retour ramène à Notes (drill-down inchangé), un 2e retour ramène à Accueil. ✅
- Accueil → Plus (push) → un module non épinglé, ex. Objectifs (replace, car `/plus` est traité comme racine) : historique = `[Accueil, Objectifs]`. Un retour ramène directement à Accueil. ✅

## Vérifications

- `npx tsc --noEmit` (après `npm install`, node_modules absent au démarrage) : une seule erreur, pré-existante et sans rapport (`src/app/layout.tsx(41,50): error TS2304: Cannot find name 'LayoutProps'`), due au type généré par Next.js au build/dev (`.next/types`), absent lors d'un `tsc` isolé. Confirmée pré-existante par un `git stash` avant modification. Le `build` ci-dessous, qui exécute le typecheck Next.js, passe sans erreur.
- `npx eslint src/hooks/useViewTransitionNavigate.ts src/lib/navigation/registry.ts` : aucune erreur.
- `npx next build` : succès (`✓ Compiled successfully`, `Finished TypeScript` sans erreur, génération des 22 routes OK).
