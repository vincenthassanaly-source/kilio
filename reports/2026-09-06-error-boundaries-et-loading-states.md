# Error boundaries (error.tsx) + loading.tsx manquants — 2026-09-06

## Constats de la Phase 1

- `git fetch origin kilio && git reset --hard origin/kilio` : session synchronisée sur `origin/kilio` (`1b790b9`, migration du module Collection vers `next/image`), aucun rattrapage nécessaire.
- `find src/app -iname "error.tsx" -o -iname "global-error.tsx"` : aucun résultat, confirmé — aucun error boundary n'existait avant cette session.
- Liste des `page.tsx` comparée à celle des `loading.tsx` existants : les 9 pages de la demande initiale étaient bien toujours sans `loading.tsx`. Deux trous supplémentaires ont été trouvés lors de l'exploration (voir plus bas), absents de l'audit initial.
- Lecture de `src/lib/ui.ts`, des skeletons (`Skeleton`, `CardSkeleton`, `ListItemSkeleton`/`ListItemSkeletonGroup`, `GridSkeleton`, `DashboardSkeleton`) et de plusieurs `loading.tsx` existants (`budget/loading.tsx`, `notes/loading.tsx`, `collection/loading.tsx`, `objectifs/loading.tsx`, `nutrition/recettes/loading.tsx`, `taches/loading.tsx`) pour en reproduire fidèlement le pattern : titres/textes statiques affichés en vrai (pas en skeleton), seules les parties dépendant de la donnée sont des `Skeleton`.
- Lecture de chaque page cible et de ses composants d'en-tête (`CollectionHeader`, `ObjectifHeader`, `RecetteHeader`) pour que chaque skeleton reflète la vraie mise en page (lien retour, titre tronqué, boutons d'action, sections).

## Fichiers créés

### Error boundaries

- `src/components/ErrorState.tsx` — contenu visuel partagé (icône ronde `--accent-alert`, titre, message via `errorText`, bouton `primaryButton` → `reset()`, lien `linkButton` → `/`).
- `src/app/(app)/error.tsx` — Client Component, couvre les pages sous `(app)` ; ne couvre volontairement pas `(app)/layout.tsx` lui-même (comportement standard de Next.js : un `error.tsx` ne capture jamais les erreurs de son propre `layout.tsx`), donc une erreur dans `AppLayout` remonte à `src/app/error.tsx`.
- `src/app/error.tsx` — Client Component, couvre le reste (`/collection/partage/choisir`, hors groupe `(app)`), avec le même wrapper `flex-1 overflow-y-auto px-4` que la page qu'il protège.

### Loading states — pages listées dans la demande

- `src/app/(app)/collection/[id]/loading.tsx` — lien retour + titre tronqué + boutons d'action + `GridSkeleton`.
- `src/app/(app)/objectifs/[id]/loading.tsx` — en-tête + `card` avec zone graphique + `ListItemSkeletonGroup` (mix valeur/étapes, le type réel n'étant connu qu'après chargement).
- `src/app/(app)/nutrition/recettes/[id]/loading.tsx` — en-tête + `CardSkeleton` (macros) + sections Ingrédients/Étapes en `ListItemSkeletonGroup`.
- `src/app/(app)/budget/transactions/loading.tsx` — filtres + `ListItemSkeletonGroup` avec sous-titre.
- `src/app/(app)/budget/comptes/loading.tsx` — `ListItemSkeletonGroup` avec sous-titre (mimant les cartes de compte).
- `src/app/(app)/budget/categories/loading.tsx` — sélecteur de période + `CardSkeleton` répétées (cartes de progression par catégorie).
- `src/app/(app)/budget/statistiques/loading.tsx` — 3 `card` (répartition catégories, tendance, répartition comptes) avec zones graphiques en skeleton.
- `src/app/(app)/budget/recurrentes/loading.tsx` — `ListItemSkeletonGroup` avec sous-titre.
- `src/app/(app)/budget/calendrier/loading.tsx` — grille 7 colonnes reproduisant le calendrier mensuel réel.

### Loading states — trous supplémentaires trouvés en Phase 1

L'audit initial listait 9 pages, mais deux autres pages avec un `await` bloquant et sans `loading.tsx` existaient déjà dans le repo :

- `src/app/(app)/taches/listes/loading.tsx` — la page fait `Promise.all([getListes(), getTags()])` ; skeleton reproduisant les deux sections Listes/Tags.
- `src/app/collection/partage/choisir/loading.tsx` — la page fait `await getCollections()` (flux de partage natif Android, hors groupe `(app)`) ; skeleton avec le même wrapper de layout que la page réelle.

## Exclu du scope (rappel)

`src/app/(app)/page.tsx` (dashboard) n'a pas été touché : il utilise déjà un `<Suspense>` par carte (streaming indépendant nutrition/tâches/habitudes, voir `reports/2026-09-04-dashboard-streaming-par-section.md`) et un `loading.tsx` root y ferait régresser ce comportement.

## Vérification (Phase 3)

- `npm install` (dépendances absentes au démarrage de la session).
- `npx tsc --noEmit` : clean (une fois `next build` exécuté au moins une fois pour générer les types de routes Next.js).
- `npx eslint` sur tous les fichiers créés : clean.
- `npm run build` (`next build`) : succès, toutes les routes listées apparaissent bien (dynamiques, comme attendu vu les `await` bloquants).
- Vérification manuelle avec Chromium/Playwright (le réseau du bac à sable n'a pas accès à Supabase — `AppLayout` échoue systématiquement sur `getPreferencesNavigationResolues`, donc un patch temporaire avec fallback a été appliqué le temps du test, puis intégralement annulé) :
  - `throw new Error("test")` temporaire dans `src/app/(app)/nutrition/page.tsx` → `src/app/(app)/error.tsx` s'affiche, avec la `BottomNav` (Accueil/Nutrition/Tâches/Habitudes/Plus) et le `ThemeToggle` toujours visibles.
  - `throw new Error("test")` temporaire dans `src/app/collection/partage/choisir/page.tsx` → `src/app/error.tsx` s'affiche (sans `BottomNav`, hors groupe `(app)`, comme attendu).
  - Les deux `throw` de test et le patch temporaire de `AppLayout` ont été retirés avant de terminer (`git status` confirmé propre, seuls les nouveaux fichiers restent).
