# Transition "morph" carte → détail sur le module Collection

Date : 2026-09-06

## Objectif

Sur `/collection`, ouvrir une collection déclenchait un switch de page instantané (aucune transition câblée sur ce clic). Le but est que la première photo de la mosaïque de couverture et le titre de la carte se transforment visuellement en la première photo de la grille et le titre du header de `/collection/[id]` (View Transitions API, named transitions), en réutilisant le pattern crossfade déjà en place (`useViewTransitionNavigate`, `BottomNav.tsx`).

## Approche technique

### Navigation : même pattern que `BottomNavSlot`

`CollectionsGrid.tsx` (carte → détail) et `CollectionHeader.tsx` (lien "‹ Collection", détail → carte) enrobent désormais leur `<Link>` d'un `onClick` qui appelle `useViewTransitionNavigate().navigate(href)`, avec `e.preventDefault()` uniquement si `"startViewTransition" in document` :

```tsx
function handleClick(e: MouseEvent<HTMLAnchorElement>, href: string) {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    e.preventDefault();
    navigate(href);
  }
}
```

Sur un navigateur sans l'API (Safari, Firefox), le garde-fou est court-circuité et `<Link>` navigue nativement, sans aucune erreur — comportement identique à `BottomNav.tsx`. Le retour ‹ Collection utilise le même hook, donc le morph fonctionne symétriquement dans les deux sens.

### `view-transition-name` posés côté source et côté cible

Les noms intègrent l'id de la collection (`collection-cover-${id}`, `collection-title-${id}`), donc uniques dans tout le DOM à tout instant — condition imposée par la spec (deux éléments vivants avec le même nom lèvent une erreur au moment du snapshot).

- **`CollectionMosaic.tsx`** : nouvelle prop optionnelle `viewTransitionName?: string`, appliquée via `style={{ viewTransitionName }}` uniquement sur l'`<img>` de `photos[0]`, dans chacune des branches 1/2/3/4 photos — jamais sur la branche placeholder (0 photo), pour ne poser aucun nom quand il n'y a rien à faire morpher.
- **`CollectionsGrid.tsx`** : passe `viewTransitionName={`collection-cover-${collection.id}`}` à `CollectionMosaic`, et pose `style={{ viewTransitionName: `collection-title-${collection.id}` }}` sur le `<p className={nameText}>`.
- **`PhotosGrid.tsx`** : nouvelle prop `collectionId: string` (transmise depuis `page.tsx`), appliquée sur l'`<img>` de `photos[0]` uniquement si `photos.length > 0` — sinon, collection vide, aucun nom posé côté détail non plus (cohérent avec l'absence côté carte).
- **`CollectionHeader.tsx`** : `style={{ viewTransitionName: `collection-title-${collection.id}` }}` sur le `<h1>`, branche non-`editing` uniquement — jamais pendant le renommage (le nom disparaîtrait autrement le temps de l'édition, provoquant un flash indésirable si l'utilisateur revient en arrière au même instant).

Comme `getCollectionsAvecApercu` (`photos_apercu`) et `getCollectionAvecPhotos` (`photos`) trient toutes deux `collection_items` par le même `order("ordre")` (confirmé en Phase 1, `src/app/actions/collections.ts`), l'élément à l'index 0 désigne la même photo des deux côtés : le morph cible bien la bonne image.

### CSS : durée du morph nommé, et une limite de la spec

`globals.css` a une règle existante pour le crossfade racine (`::view-transition-old/new(root)`, ~180–200ms). Pour les groupes nommés, la spec View Transitions n'autorise qu'un **nom littéral** ou `*` comme argument de `::view-transition-group()` — pas de sélecteur par préfixe ni par attribut (`[name^="..."]` n'est pas une syntaxe valide ici, contrairement à un sélecteur CSS classique). Comme les ids de collection sont dynamiques, cibler individuellement chaque `collection-cover-<uuid>` est exclu ; la règle cible donc `::view-transition-group(*)`, qui matche tous les groupes nommés sauf `root` (root a son propre pseudo-élément anonyme, déjà couvert séparément) :

```css
::view-transition-group(*) {
  animation-duration: 220ms;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}
```

Comme `CollectionMosaic`/`CollectionHeader` ne sont utilisés que sur `/collection` et `/collection/[id]` (grep confirmé en Phase 1, aucun autre composant ne pose de `view-transition-name`), ce `*` ne touche aujourd'hui que le morph Collection — pas d'effet de bord sur une autre transition nommée qui existerait ailleurs.

Le bloc `@media (prefers-reduced-motion: reduce)` déjà présent (qui neutralise déjà `.agenda-glisse-*` et `::view-transition-old/new(root)`) a été étendu avec la même règle `::view-transition-group(*)` mise à `0.01ms !important`, sans dupliquer le bloc média.

**Piège rencontré et corrigé** : une première version du commentaire CSS documentant ce choix contenait littéralement la sous-chaîne `-*/` (dans `collection-cover-*/collection-title-*`), qui a fermé prématurément le commentaire `/* ... */` — le texte suivant a été interprété comme du CSS invalide. `next build` l'a signalé (`Unexpected token Delim('*')`, warning d'optimisation CSS) et la règle a été silencieusement supprimée du bundle final malgré un build "réussi". Reformulé pour éviter la séquence `*/` à l'intérieur du commentaire ; `next build` ne remonte plus aucun warning et la règle apparaît bien dans le CSS compilé (vérifié en grepant `.next/static/chunks/*.css`).

## Fichiers modifiés

- `src/app/(app)/collection/CollectionsGrid.tsx` : navigation via `useViewTransitionNavigate`, props `viewTransitionName` transmises à `CollectionMosaic` et au titre.
- `src/app/(app)/collection/CollectionMosaic.tsx` : prop `viewTransitionName?`, appliquée sur `photos[0]` dans les 4 branches avec photo(s).
- `src/app/(app)/collection/[id]/page.tsx` : passe `collectionId={id}` à `PhotosGrid`.
- `src/app/(app)/collection/[id]/PhotosGrid.tsx` : prop `collectionId`, nom posé sur `photos[0]` si `photos.length > 0`.
- `src/app/(app)/collection/[id]/CollectionHeader.tsx` : nom posé sur le `<h1>` (hors édition), lien "‹ Collection" migré vers `useViewTransitionNavigate`.
- `src/app/globals.css` : règle `::view-transition-group(*)` (220ms, easing doux) + extension du bloc `prefers-reduced-motion`.

## Vérifications (Phase 3)

- `npx tsc --noEmit` : une seule erreur, `src/app/layout.tsx(41,50): Cannot find name 'LayoutProps'` — pré-existante et sans rapport (confirmée identique via `git stash` sur `origin/kilio` avant toute modification ; absente une fois `next build` exécuté, qui régénère les types de routes internes de Next.js).
- `npx eslint .` : ✅ aucune erreur ni avertissement sur tout le repo.
- `npx next build` : ✅ build de production réussi (Turbopack), 22 routes générées, aucun warning CSS (après correction du piège `*/` ci-dessus).

### Vérification manuelle (Playwright + Chromium headless, viewport mobile 390×844)

Ce sandbox n'a pas d'accès réseau sortant vers le projet Supabase réel (`Host not in allowlist: vsmtkopkqasrdnjceegp.supabase.co`), ce qui bloque toute route sous `(app)/` (layout + pages lisent Supabase server-side). Pour exécuter une vraie vérification E2E de l'app compilée plutôt qu'un composant isolé, `getCollectionsAvecApercu`/`getCollectionAvecPhotos` (`src/app/actions/collections.ts`) et `getPreferencesNavigationResolues` (`src/app/actions/preferences-navigation.ts`) ont été temporairement remplacées par des mocks en mémoire (3 collections : 4 photos, 1 photo, 0 photo, images servies depuis `public/icons/icon-512.png` pour rester 100% local), le temps des tests. **Ces mocks ont été entièrement retirés après les tests** — `git status`/`git diff` confirment que seuls les 6 fichiers listés ci-dessus restent modifiés dans l'arbre final, et `tsc`/`eslint`/`build` ont été ré-exécutés après restauration pour confirmer que rien n'a été oublié.

Résultats :
- **Rendu HTML** (`curl` sur `/collection` et chaque `/collection/[id]`) : `view-transition-name` cohérents entre carte et détail pour les 3 collections (`collection-cover-test-4`/`collection-title-test-4`, etc.) ; **absent** sur la couverture de la collection à 0 photo, présent uniquement sur son titre — conforme au garde-fou de la Phase 2.
- **Clic sur une carte avec photos** (`startViewTransition available: true`) : navigation vers le détail, `h1` affichant le bon titre, aucune erreur console/page (`pageerror`/`console.error` collectés : `[]`).
- **Retour via "‹ Collection"** : navigation inverse réussie, retour sur la grille, aucune erreur JS.
- **Collection à 0 photo** : clic → détail affichant "Aucune photo pour l'instant.", aucune erreur JS, pas de crash sur l'absence de nom posé.
- **`prefers-reduced-motion: reduce`** (contexte Playwright `reducedMotion: 'reduce'`) : navigation identique, aucune erreur JS ; la règle CSS dédiée (`animation-duration: 0.01ms !important` sur `::view-transition-group(*)`, vérifiée présente dans le CSS compilé pour ce media block) neutralise le morph nommé exactement comme le crossfade racine existant.
- **Double-clic rapide / navigation annulée en cours** : déclenchement d'une 2ᵈᵉ navigation (`router.push` direct) puis d'un 3ᵉ clic pendant qu'une transition est potentiellement encore en vol → arrivée correcte sur la dernière destination demandée (`/collection/test-1`), aucune exception JS non catchée.
- Navigateur sans `startViewTransition` : non testable dynamiquement dans ce sandbox (un seul moteur, Chromium, disponible), mais vérifié par lecture de code — le garde `"startViewTransition" in document` est identique à celui déjà en production dans `BottomNav.tsx`, qui couvre ce cas.
- Captures d'écran prises pendant les tests : grille avec les 3 collections, détail 4 photos, détail vide, retour à la grille, détail sous `prefers-reduced-motion`.

## Note pour un chantier séparé

Recettes et Objectifs affichent des cartes texte seul (pas de mosaïque de couverture). Elles pourraient recevoir une version allégée du même pattern — uniquement le morph du titre (`view-transition-name` sur le titre carte + titre détail, même garde `useViewTransitionNavigate`), sans l'aspect couverture photo qui ne s'applique pas à ces modules. Non traité ici : hors périmètre de ce chantier, qui porte exclusivement sur Collection.
