# Suppression du widget météo de l'en-tête du dashboard

## Phase 1 — Vérification préalable

- `grep -rn "meteo|Meteo" src --include="*.ts*"` : uniquement les 6 fichiers attendus
  (`src/app/actions/meteo.ts`, `src/app/(app)/MeteoHeaderCard.tsx`,
  `src/app/(app)/MeteoHeaderWidget.tsx`, `src/app/(app)/MeteoDetailModal.tsx`,
  `src/lib/meteo/compute.ts`, et l'import/usage dans `src/app/(app)/page.tsx`). Aucune référence
  supplémentaire n'a été ajoutée depuis l'exploration initiale.
- `mcp__Supabase__list_tables` sur le projet `vsmtkopkqasrdnjceegp` : aucune table liée à la météo
  parmi les 33 tables du schéma `public`.
- Aucun fichier `.env.example` ni `.env.local` présent dans le repo (aucun n'existe à la racine) :
  pas de variable d'environnement météo à retirer.

## Phase 2 — Implémentation

### `src/app/(app)/page.tsx`

- Suppression de l'import `import { MeteoHeaderCard } from "./MeteoHeaderCard";`.
- Suppression du bloc `<Suspense fallback={<Skeleton className="h-6 w-20 rounded-full" />}>
  <MeteoHeaderCard /></Suspense>` dans le `<header>`.
- `Suspense` (import `react`) et `Skeleton` (`@/components/skeletons/Skeleton`) n'étaient utilisés
  nulle part ailleurs dans ce fichier : leurs imports ont été retirés également.

### Fichiers supprimés (orphelins)

- `src/app/actions/meteo.ts`
- `src/app/(app)/MeteoHeaderCard.tsx`
- `src/app/(app)/MeteoHeaderWidget.tsx`
- `src/app/(app)/MeteoDetailModal.tsx`
- `src/lib/meteo/compute.ts`
- Le dossier `src/lib/meteo/` ne contenait que ce dernier fichier : il disparaît automatiquement
  avec sa suppression (rien à `rmdir`).

- `grep -rn "meteo|Meteo" src` après suppression : aucune occurrence restante.

## Phase 3 — Vérification

- `npx tsc --noEmit` : ✅ aucune erreur (après un premier `npm run build` pour générer les types
  Next.js `LayoutProps`/`.next/types`, absents avant tout build — non lié à cette suppression).
- `npm run lint` (ESLint) : ✅ aucune erreur ni avertissement.
- `npm run build` (`next build`) : ✅ build de production réussi, toutes les routes générées sans
  la carte météo.

## Note hors périmètre

L'audit Supabase déclenché par `list_tables` signale que les 33 tables du schéma `public` ont RLS
désactivé (comportement volontaire de l'app mono-utilisateur sans auth, non lié à cette tâche) —
mentionné ici pour information, aucune action prise.
