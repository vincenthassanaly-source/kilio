# Migration next/image sur le module Collection

Date : 2026-09-06

## Objectif

Les photos du module Collection (mosaïque de couverture, grille de détail, lightbox plein écran, miniatures de partage) étaient en `<img>` brutes. Migration vers `next/image` pour bénéficier du lazy loading natif et d'un fondu à l'arrivée de l'image, sans toucher au schéma de base (pas de blur-up : aucune miniature stockée en base, décision actée hors scope).

## Fichiers modifiés

- **`next.config.ts`** : ajout de `images.remotePatterns` autorisant `https://vsmtkopkqasrdnjceegp.supabase.co/storage/v1/object/public/**` (hostname du bucket Storage public confirmé via `NEXT_PUBLIC_SUPABASE_URL`).
- **`src/components/FadeInImage.tsx`** (nouveau) : petit wrapper client autour de `next/image` factorisant le fondu à l'arrivée (`useState` + `onLoad` + classe `transition-opacity` passant de `opacity-0` à `opacity-100`). Réutilisé dans les 4 fichiers ci-dessous plutôt que dupliqué. `alt` est déstructuré explicitement (et non laissé dans le spread `...props`) pour que `eslint-plugin-jsx-a11y` continue de le voir statiquement — sans ça, un faux positif `jsx-a11y/alt-text` apparaissait sur ce fichier.
- **`src/app/(app)/collection/CollectionMosaic.tsx`** : les 4 branches (1/2/3/4 photos) passent en `fill` + `sizes`. Chaque conteneur est désormais `position: relative` (les grid cells à 2/3/4 photos, qui étaient directement l'`<img>`, sont maintenant enrobées d'un `<div className="relative ...">` portant le même rôle de cellule de grille). `style={{ viewTransitionName }}` préservé sur la première photo de chaque variante, `alt=""` et `object-cover` inchangés.
- **`src/app/(app)/collection/[id]/PhotosGrid.tsx`** : `fill` dans le conteneur `aspect-square` déjà `relative`. Le `<button>` intermédiaire (photo cliquable) est passé à `relative` lui aussi — sans ça, next/image affichait un warning dev "parent element with invalid position" car il vérifie le *parent direct* de l'`<img>`, pas seulement le plus proche ancêtre positionné dans l'arbre (qui suffit pourtant pour le CSS `fill` lui-même). `viewTransitionName` sur `photos[0]` préservé. Fondu via `FadeInImage`.
- **`src/components/ImageLightbox.tsx`** : remplacement par `FadeInImage` en `fill` + `object-contain`. Le conteneur plein écran (`fixed inset-0`, dimensions inconnues à l'avance) ne pouvant pas servir tel quel de parent `fill` (il utilisait `flex items-center justify-center` pour centrer une image de taille intrinsèque, un enfant `fill` n'aurait eu aucune taille de référence), il a été remplacé par un wrapper dédié `absolute inset-4` occupant tout l'espace disponible ; `object-contain` letterboxe l'image dedans exactement comme le faisait `max-h-full max-w-full` avant. Le tap sur l'image continue de fermer le lightbox (aucun `stopPropagation` ajouté) — comportement voulu, documenté dans le commentaire du composant.
- **`src/app/collection/partage/choisir/page.tsx`** : `width={96} height={96}` (dimensions fixes connues) plutôt que `fill`.

## Décisions `sizes` / `fill` vs dimensions fixes

- **`CollectionMosaic`** (grille `columns-2` sur `/collection`) : `sizes="50vw"` pour 1 photo (tuile pleine largeur de colonne), `sizes="25vw"` pour 2/3/4 photos (chaque vignette occupe une demi-largeur de tuile, donc un quart de l'écran).
- **`PhotosGrid`** (`grid-cols-2` sur `/collection/[id]`) : `sizes="50vw"`, chaque photo occupant la moitié de l'écran.
- **`ImageLightbox`** : `sizes="100vw"`, plein écran.
- **`choisir/page.tsx`** : dimensions fixes `96×96`, pas de `sizes` (pas de `fill`).

Toutes les valeurs supposent un viewport mobile — cohérent avec le reste de l'app (usage systématique de `env(safe-area-inset-*)`, barre de navigation basse, etc.).

## Fondu à l'arrivée

Factorisé dans `FadeInImage.tsx` plutôt que dupliqué 4 fois : `opacity-0` initial, `onLoad` bascule un état `loaded` à `true`, `transition-opacity duration-300` fait le fondu. Pas de blur-up (aucun `blurDataURL`, décision actée hors scope) : juste lazy load natif + fondu simple, conforme à la demande.

## Hors scope (rappel)

- `src/app/(app)/taches/AddTaskForm.tsx` (`ImageThumb`) — vignettes mélangeant URLs `blob:` locales et Storage, exclues comme prévu.
- `src/app/(app)/taches/TasksList.tsx` — un autre usage de `<img>` avec un commentaire `no-img-element` existe dans ce fichier (repéré au grep de la Phase 1), mais il n'est pas dans la liste des 4 fichiers du périmètre de ce chantier ; non touché.

## Vérifications (Phase 3)

- `npx tsc --noEmit` : ✅ aucune erreur.
- `npx eslint .` : ✅ aucune erreur ni avertissement sur tout le repo (y compris `FadeInImage.tsx`). Les commentaires `eslint-disable-next-line @next/next/no-img-element` ont bien disparu des 4 fichiers migrés (confirmé par grep).
- `npx next build` (Turbopack) : ✅ build de production réussi, 22 routes générées, aucun warning `next/image` sur les `sizes` manquants en mode `fill`.

### Vérification manuelle (Playwright + Chromium headless, viewport mobile 390×844)

Ce sandbox n'a pas d'accès réseau sortant vers le projet Supabase réel (`Host not in allowlist: vsmtkopkqasrdnjceegp.supabase.co`), ce qui bloque toute route sous `(app)/` en conditions réelles. Comme dans un chantier précédent sur ce même module (`2026-09-06-morph-collection-carte-detail.md`), `getCollectionsAvecApercu`/`getCollectionAvecPhotos`/`getCollections` (`src/app/actions/collections.ts`) et `getPreferencesNavigationResolues` (`src/app/actions/preferences-navigation.ts`) ont été temporairement remplacées par des mocks en mémoire (3 collections : 4 photos / 1 photo / 0 photo, images servies depuis `public/icons/*.png` pour rester 100 % local), le temps des tests, puis **entièrement retirées** (`git checkout --` sur ces deux fichiers, `git status`/`git diff --stat` confirment que seuls les 5 fichiers + `FadeInImage.tsx` listés ci-dessus restent modifiés). `tsc`/`eslint`/`build` ont été ré-exécutés après restauration.

Résultats :
- **`/collection`** : les 3 branches testées (4 photos, 1 photo, 0 photo) s'affichent correctement en `fill`/`object-cover` ; `view-transition-name` présent uniquement sur `photos[0]` des collections avec photo(s), absent sur le placeholder de la collection vide — conforme.
- **`/collection/[id]`** : grille 2 colonnes correcte, `view-transition-name: collection-cover-<id>` posé sur la première photo, `srcSet`/`sizes` générés comme attendu par `next/image`.
- **Fondu** : `opacity-0` présent dans le HTML initial (avant chargement), `opacity: 1` une fois l'image chargée (vérifié via `getComputedStyle`).
- **`choisir/page.tsx`** : rendu `width=96 height=96`, `srcSet` 1x/2x généré (dimensions fixes, pas de `fill`).
- **Avertissement dev détecté et corrigé en cours de route** : un warning next/image "parent element with invalid position" apparaissait sur `PhotosGrid.tsx` — le `<button>` enrobant l'image (parent direct) n'était pas positionné, même si son ancêtre `<li>` l'était (suffisant pour le CSS `fill` mais pas pour ce warning dev, qui ne vérifie que le parent direct). Corrigé en ajoutant `relative` sur le `<button>`.
- **Lightbox — limite de vérification rencontrée** : cliquer pour ouvrir le lightbox en Playwright ne laissait rien à l'écran après quelques centaines de ms. Investigation : le HTML servi par le serveur (`curl` brut, sans JS) contient bien le lightbox monté (`Fermer`, `Télécharger` présents) — le composant se rend donc correctement à l'ouverture. Le testé A/B (remise temporaire de l'ancien `ImageLightbox.tsx` — `<img>` brute, sans aucune modification de ce chantier — puis nouveau test identique) a reproduit exactement le même symptôme, confirmant que ce n'est **pas** une régression de cette migration. Cause probable : le hook `useBackClose` (pré-existant, `src/hooks/useBackClose.ts`) fait un `history.pushState` au montage et un `history.back()` au démontage ; en mode développement, le double-invoke des effects de React Strict Mode (mount → cleanup → remount) déclenche ce `history.back()` juste après le premier montage, ce qui referme le lightbox via son propre mécanisme de fermeture avant que Playwright ne puisse l'observer. Ce comportement est spécifique à `next dev` + Strict Mode (les effects ne sont pas double-invoqués en production) et n'affecte donc pas le build de production déjà validé plus haut. Sujet pré-existant, hors périmètre de ce chantier.
- **Rendu visuel du lightbox** (contournant le point ci-dessus en forçant temporairement l'état initial à une photo, puis en revenant en arrière) : `fill` + `object-contain` dans le wrapper `absolute inset-4` letterboxe bien l'image comme l'ancien `max-h-full max-w-full`, fondu identique aux autres emplacements.
- Captures d'écran prises : grille `/collection` (3 collections), détail `/collection/test-4` (2×2), lightbox forcé ouvert.

## Note pour un chantier séparé

Le hook `useBackClose` a un comportement latent en développement (React Strict Mode double-invoke) qui referme immédiatement toute UI qui l'utilise avec `active` toujours vrai (menus, lightbox, etc.) dans certains contextes de test automatisés. Sans impact en production (Strict Mode ne double-invoque pas les effects hors dev), mais pourrait valoir un chantier dédié si ça gêne un futur test E2E en mode dev.
