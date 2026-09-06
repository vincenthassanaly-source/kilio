# Généralisation du crossfade de navigation via `TransitionLink`

Date : 2026-09-06

## Objectif

Le crossfade View Transitions (`useViewTransitionNavigate`) n'était câblé que sur `BottomNav.tsx`, `ModulesGrid.tsx` et le couple `CollectionsGrid.tsx` / `CollectionHeader.tsx`, chacun avec sa propre copie du pattern `onClick` + `preventDefault` + `navigate`. Partout ailleurs, la navigation restait un `<Link>` nu, donc un switch brutal. Le but était d'extraire ce pattern dans un composant réutilisable et de l'appliquer à tous les liens principaux restants, sans toucher à `BottomNav.tsx`.

## `src/components/TransitionLink.tsx`

Nouveau composant client, wrapper `forwardRef` autour de `next/link` :

```tsx
export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  function TransitionLink({ href, onClick, ...props }, ref) {
    const navigate = useViewTransitionNavigate();

    function handleClick(e: MouseEvent<HTMLAnchorElement>) {
      onClick?.(e);
      if (e.defaultPrevented) return;

      const hrefString = typeof href === "string" ? href : null;
      if (hrefString && typeof document !== "undefined" && "startViewTransition" in document) {
        e.preventDefault();
        navigate(hrefString);
      }
    }

    return <Link ref={ref} href={href} onClick={handleClick} {...props} />;
  }
);
```

- `TransitionLinkProps = ComponentProps<typeof Link>` : dans Next.js 16.3.3, `Link` est typé `React.ForwardRefExoticComponent<... & React.RefAttributes<HTMLAnchorElement>>`, donc `ComponentProps<typeof Link>` inclut déjà `href`, tous les attributs `<a>` standards, `onClick`, etc. — aucune réécriture de type nécessaire, juste réutiliser le type existant de la version de Next.js présente dans le repo.
- L'`onClick` custom de l'appelant est appelé **en premier**. S'il a fait `e.preventDefault()` (cas `ModuleTile` en mode édition), on s'arrête sans naviguer — la vérification se fait via `e.defaultPrevented`, pas via une valeur de retour custom.
- Sinon, si `"startViewTransition" in document`, on bloque la navigation native et on appelle `navigate(href)`. Sur Safari/Firefox (pas d'API), le `<Link>` natif reprend la main sans rien changer.
- `href` n'est intercepté que s'il s'agit d'une chaîne (tous les appels du repo passent des strings) ; un `href` objet (`UrlObject`) est laissé à la navigation native de `<Link>`, `useViewTransitionNavigate` n'acceptant qu'une string.
- Le `ref` est transmis tel quel à `Link`, qui le relaie à l'élément `<a>` sous-jacent — compatible avec `setNodeRef` de dnd-kit.

`BottomNav.tsx` n'a pas été touché (implémentation en production, porte l'animation de pill).

## Fichiers migrés

| Fichier | Lien(s) migré(s) |
|---|---|
| `src/components/ModulesGrid.tsx` (`ModuleTile`) | Tuile de module vers son module |
| `src/components/NutritionSubNav.tsx` | Onglets Journal / Recettes |
| `src/app/(app)/objectifs/[id]/ObjectifHeader.tsx` | "‹ Objectifs" |
| `src/app/(app)/nutrition/recettes/[id]/RecetteHeader.tsx` | "‹ Recettes" |
| `src/app/(app)/taches/listes/page.tsx` (composant serveur) | "← Retour aux tâches" |
| `src/app/(app)/nutrition/recettes/RecettesList.tsx` | Carte recette → détail |
| `src/app/(app)/objectifs/ObjectifCard.tsx` | Carte objectif → détail |
| `src/app/(app)/collection/[id]/CollectionHeader.tsx` | "‹ Collection" (DRY : handler bespoke retiré) |
| `src/app/(app)/collection/CollectionsGrid.tsx` | Carte collection → détail (DRY : handler bespoke retiré) |

`taches/listes/page.tsx` reste un composant serveur `async` : il importe `TransitionLink` (composant client) directement, comme `AppLayout` importe déjà `BottomNav`/`ThemeToggle` — aucun souci de compilation, confirmé par `next build`.

## Préservation du comportement `ModuleTile`

Point le plus sensible du chantier : `ModuleTile` porte `ref={setNodeRef}` + `{...attributes}` + `{...listeners}` de `useSortable` (dnd-kit), et un `handleClick` qui fait `e.preventDefault()` en mode édition pour empêcher la navigation sur tap pendant le drag-and-drop.

Seul le nom du composant a changé (`Link` → `TransitionLink`) ; `ref`, `{...attributes}`, `{...listeners}`, `style`, `className`, `data-nav-edit-tile` et `onClick={handleClick}` sont conservés à l'identique, dans le même ordre :

```tsx
<TransitionLink
  ref={setNodeRef}
  href={mod.href}
  onClick={handleClick}
  data-nav-edit-tile
  style={style}
  className={...}
  {...attributes}
  {...listeners}
>
```

Flux en mode édition : `TransitionLink.handleClick` appelle d'abord `onClick(e)` fourni (= `handleClick` de `ModuleTile`), qui fait `e.preventDefault()` ; `TransitionLink` détecte `e.defaultPrevented` et retourne immédiatement, sans jamais évaluer `"startViewTransition" in document` ni appeler `navigate` — le tap ne navigue pas, exactement comme avant.

Hors édition : `handleClick` de `ModuleTile` ne fait rien, `TransitionLink` poursuit normalement vers le crossfade.

Le drag-and-drop n'est pas affecté : `attributes`/`listeners` de dnd-kit portent des handlers `onPointerDown`/`onKeyDown` (pas `onClick`), donc leur spread après `onClick` ne l'écrase pas — comportement identique à avant la migration, où c'était déjà le cas avec `Link`.

## Vérifications — Phase 3

- **`npx tsc --noEmit`** : aucune nouvelle erreur. Une erreur pré-existante (`src/app/layout.tsx(41,50): Cannot find name 'LayoutProps'`) a été confirmée présente à l'identique sur `origin/kilio` avant toute modification (vérifiée via `git stash`) — sans rapport avec ce chantier, elle disparaît d'ailleurs après `next build` qui régénère les types de route.
- **`npx eslint .`** : aucune erreur, aucun warning.
- **`npx next build`** : build de production réussi (Turbopack), toutes les routes compilent, `next build` exécute aussi son propre passage TypeScript qui passe sans erreur (y compris sur `layout.tsx`, régénéré à cette étape).
- **Vérification manuelle Playwright/Chromium (`next start`)** : non réalisable dans cet environnement d'exécution — `next start` démarre correctement, mais toute route sous `(app)` (y compris `/plus`, dont le layout lit les préférences de navigation via Supabase) retourne 500 avec `Error: Host not in allowlist: vsmtkopkqasrdnjceegp.supabase.co`, la politique réseau de cet environnement distant bloquant les appels sortants vers Supabase. Ce n'est pas un problème introduit par ce chantier (le projet appelle Supabase au niveau du layout `(app)` pour toute page) mais une restriction d'egress propre à cette session ; elle empêche de charger la moindre donnée réelle et donc de dérouler les parcours de la Phase 3 en conditions réelles depuis ici.

Recommandation : dérouler la checklist manuelle de la Phase 3 (crossfade Plus → module, tap sur tuile + drag-and-drop en mode édition, onglets Journal/Recettes, va-et-vient Recettes/Objectifs/Tâches, morph Collection, `prefers-reduced-motion: reduce`, absence d'erreur console) depuis un environnement avec accès réseau à Supabase (poste local de Vincent, ou preview Vercel) avant de considérer le chantier définitivement clos côté UX — le code est structurellement identique au pattern `BottomNav`/`ModulesGrid` déjà validé en production, donc le risque de régression comportementale est faible, mais seule une vérification visuelle réelle peut le confirmer à 100 %.

## Fichiers non modifiés (volontairement)

- `src/components/BottomNav.tsx` : conforme à la consigne, pas touché.
- `src/hooks/useViewTransitionNavigate.ts` : réutilisé tel quel par `TransitionLink`.
