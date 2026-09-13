# Archivage des articles cochés — module Courses

**Date :** 2026-09-13
**Branche :** `claude/courses-archived-section-gwfbf9` (synchronisée sur `kilio`)

## Résumé

Le module Courses affichait tous les articles (`courses_items`) dans une seule liste plate, cochés et non-cochés mélangés. Les articles cochés basculent désormais dans une section « Articles archivés » séparée, repliable/dépliable, **repliée par défaut**, sous la liste des articles actifs — sur le modèle exact d'`ArchivedTasksSection.tsx` (module Agenda/Tâches).

Aucun vidage automatique : les articles cochés restent dans la section archivée jusqu'à suppression manuelle via le bouton « Suppr. » existant (comportement inchangé).

## Exploration préalable

- Vérification en base (`mcp__Supabase__list_tables` / `execute_sql`, projet `vsmtkopkqasrdnjceegp`) : la table `courses_items` a déjà la colonne `coche` (boolean) et `termine_le` (timestamptz, déjà renseigné automatiquement au toggle — probablement par un trigger existant, non touché ici). **Aucune migration SQL nécessaire**, confirmé par l'inspection des données réelles (11 lignes, 3 actives / 8 archivées au moment de l'exploration).
- Relecture de `CoursesList.tsx`, `CoursesView.tsx`, `AddCourseToggle.tsx`, `AddCourseForm.tsx`, `src/app/actions/courses.ts` : les Server Actions (`getCoursesItems`, `toggleCourseItem`, `deleteCourseItem`, `createCourseItem`) et la logique optimiste (React Query, rollback, `enqueueAction` offline) n'ont pas été modifiées.
- Relecture d'`ArchivedTasksSection.tsx` (pattern de référence explicitement demandé) et de `TasksList.tsx`. Note : `TasksList.tsx` utilise en réalité un `<details>` plus simple pour ses propres tâches archivées, distinct d'`ArchivedTasksSection.tsx` (utilisé par les vues Agenda). Conformément à la consigne, c'est **`ArchivedTasksSection.tsx`** qui a été reproduit à l'identique (bouton toggle + chevron rotatif + `AnimatePresence`/`motion.div` height/opacity), pas le `<details>` de `TasksList.tsx`.

## Décisions prises pendant l'implémentation

1. **Composant extrait** : `ArchivedCoursesSection.tsx` créé dans `src/app/(app)/courses/`, sur le modèle exact d'`ArchivedTasksSection.tsx` (même structure JSX, mêmes classes `card`/`sectionTitle`, même animation, `aria-expanded` sur le bouton toggle, replié par défaut — `useState(false)`, sans logique de mise en surbrillance puisque Courses n'a pas d'équivalent au deep-link de notification de l'Agenda).
2. **`CourseItemRow` extrait dans son propre fichier** (`CourseItemRow.tsx`), plutôt que réexporté depuis `CoursesList.tsx` : `CoursesList.tsx` importe `ArchivedCoursesSection`, qui a besoin de `CourseItemRow` — les laisser dans le même fichier aurait créé un **import circulaire** entre `CoursesList.tsx` et `ArchivedCoursesSection.tsx` (ce cas ne se présente pas côté Tâches, où `ArchivedTasksSection` n'est utilisé que par les vues Agenda, jamais par `TasksList.tsx` lui-même). L'extraction résout le cycle proprement et garde `CourseItemRow` strictement inchangé (mutations optimistes toggle/suppression, rollback, `enqueueAction` offline — logique non touchée, seulement déplacée).
3. **Fonction pure de groupement** : `src/lib/courses/compute.ts` avec `grouperItemsCourses(items)` → `{ actifs, archives }`, sur le modèle des fichiers `compute.ts` déjà existants (`budget/`, `carburants/`, `nutrition/`). L'ordre de chaque groupe est préservé tel que renvoyé par `getCoursesItems` (déjà trié `coche` croissant puis `created_at` décroissant côté serveur), donc pas de re-tri côté client.
4. **Espacement** : `CoursesList` retourne désormais un `<div className="flex flex-col gap-2.5">` (au lieu d'un fragment) pour espacer correctement la liste active et la section archivée, car `CoursesView.tsx` ne fournit le `gap` qu'entre `AddCourseToggle` et `CoursesList` elle-même, pas entre les enfants internes de `CoursesList`.
5. **État vide** : la section archivée retourne `null` si `archives.length === 0` (comme `ArchivedTasksSection`). Le message « Aucun article pour l'instant » de `CoursesList` reste basé sur le total (`items.length === 0`), comme dans `TasksList.tsx`.

## Fichiers touchés

- `src/app/(app)/courses/CoursesList.tsx` — simplifié : groupement via `grouperItemsCourses`, rendu de la liste active + `ArchivedCoursesSection`, `CourseItemRow` déplacé.
- `src/app/(app)/courses/CourseItemRow.tsx` **(nouveau)** — composant de ligne extrait tel quel depuis `CoursesList.tsx`.
- `src/app/(app)/courses/ArchivedCoursesSection.tsx` **(nouveau)** — section repliable, modèle exact d'`ArchivedTasksSection.tsx`.
- `src/lib/courses/compute.ts` **(nouveau)** — fonction pure `grouperItemsCourses`.
- Aucune migration SQL, aucune modification de `src/app/actions/courses.ts`.

## Vérifications (Phase 3)

Dépendances installées via `npm ci` (absentes au démarrage de la session).

- `tsc --noEmit` : ✅ aucune erreur (après build initial générant les types de routes Next.js — `LayoutProps` sur `src/app/layout.tsx`, fichier non touché par ce changement).
- `eslint` (repo entier) : ✅ aucune erreur, aucun warning.
- `next build` (Turbopack, Next.js 16.3.3) : ✅ build réussi, toutes les routes (dont `/courses`) compilées sans erreur.

Skills `web-design-guidelines` et `vercel-react-best-practices` consultés : le composant reproduit fidèlement `ArchivedTasksSection.tsx` (bouton natif `<button>` — clavier géré nativement, `aria-expanded`, chevron `aria-hidden`) ; aucune fonctionnalité supplémentaire (`prefers-reduced-motion`, focus-visible personnalisé) ajoutée au-delà de ce que fait déjà le composant de référence, pour rester strictement dans le périmètre demandé.
