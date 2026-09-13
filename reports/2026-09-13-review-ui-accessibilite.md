# Review UI — accessibilité, UX, formatage

Date : 2026-09-13

Corrections issues d'une review UI (skill `web-design-guidelines`, Vercel
Web Interface Guidelines) sur les composants partagés et les modules de
l'app. 35 fichiers modifiés, 1 fichier créé (`src/lib/confirm.ts`).

## Viewport

- `src/app/layout.tsx:34` — retiré `maximumScale: 1` de `viewport` (anti-pattern : bloquait le pinch-zoom sur toute l'app).

## Focus clavier (`src/lib/ui.ts`)

Ajout d'une classe `focusRing` partagée (`focus-visible:outline-none
focus-visible:ring-2 focus-visible:ring-kcal focus-visible:ring-offset-2`,
`focus-visible:` et non `focus:` pour ne pas afficher l'anneau au clic
souris/tap) appliquée à `input`, `primaryButton`, `secondaryButton`,
`ghostButton`, `dangerButton`, `iconButton`, `addCard` et `linkButton`.
`ring-offset-2` détache l'anneau du fond du bouton, donc il reste visible
même sur `primaryButton` (fond `bg-kcal`).

## Modal

- `src/components/Modal.tsx:59` — ajouté `overscroll-contain` (Tailwind pour `overscroll-behavior: contain`) sur le panneau de contenu scrollable, pour éviter le scroll-chaining vers le fond derrière la modale.

## Images / médias

- `src/components/ImageLightbox.tsx` — ajout d'une prop `alt` optionnelle (défaut `"Photo agrandie"`) remplaçant le `alt=""` fixe.
  - `src/app/(app)/documents/[id]/DocumentDetail.tsx` et `DocumentCard.tsx` passent désormais un `alt` dérivé du nom du document (+ légende Recto/Verso quand connue) au lieu du défaut générique.
  - Les autres appelants (`TaskCard.tsx` via `TacheImagesRow`) gardent le défaut générique — pas de légende disponible à leur niveau.
- `src/components/TiktokLightbox.tsx:45` — ajouté `title="Vidéo TikTok"` sur l'`<iframe>`.
- `src/components/TiktokLightbox.tsx:54` — `"Chargement..."` → `"Chargement…"`.

## Navigation active

- `src/components/BottomNav.tsx` — `aria-current="page"` sur le slot actif et sur le bouton "Plus" quand actif (état auparavant indiqué par couleur/graisse seulement).
- `src/components/NutritionSubNav.tsx:22` — même correction sur l'onglet Journal/Recettes actif.

## Toasts (`src/components/toast/ToastHost.tsx`)

- Le toast est passé de `motion.div` à `motion.button` (`type="button"`) : focusable et activable au clavier (Entrée/Espace nativement, plus besoin de `tabIndex`/`onKeyDown` manuels).
- Ajouté `role="status" aria-live="polite"` sur le conteneur des toasts.
- Ajouté un `aria-label` explicite ("… — appuyer pour masquer") sur chaque toast, le texte visible seul ne décrivant pas l'action de dismiss.

## Animations

- `src/components/PullToRefresh.tsx` — ajouté `useReducedMotion` (framer-motion, cohérent avec le reste du repo) : l'indicateur ne tourne plus (`animate-spin` et `rotate()` désactivés) si `prefers-reduced-motion: reduce`, tout en restant visible (anneau statique) pour indiquer l'état de rafraîchissement.
- `src/components/ModulesGrid.tsx` — l'animation d'entrée (translation `y`) et le `whileTap` (scale) des tuiles passent maintenant par `useReducedMotion`, comme les autres composants animés du repo.

## Formatage numérique

- `src/lib/carburants/compute.ts:52-58` — `formaterDistance` utilise désormais `new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })` au lieu de `km.toFixed(1).replace(".", ",")`. Sortie identique (ex. `"3,2 km"`), pas de test qui verrouillait l'ancienne implémentation (vérifié par recherche des appelants).

## Suppressions destructives

Créé `src/lib/confirm.ts` : `confirmDelete(message?)` encapsule
`window.confirm(...)` avec un message par défaut, personnalisable par appel.

Recherche exhaustive de tous les usages de `dangerButton` (`grep -rl
dangerButton src`) : **23 fichiers** au total (hors `lib/ui.ts` qui le
définit), dont **2 avaient déjà** un `window.confirm(...)` inline
(`documents/etiquettes/EtiquettesManager.tsx`,
`collection/[id]/CollectionHeader.tsx`) et **21 supprimaient
immédiatement sans confirmation**, conforme à l'estimation initiale
(« environ 21 sur 23 »).

Les 23 fichiers sont maintenant tous passés par `confirmDelete(...)`, avec
un message nommant l'élément concerné quand l'info est disponible côté
composant (ex. `Supprimer la note « ${note.titre} » ?`), ou un message
générique sinon (ex. transactions, sans libellé garanti) :

- `notes/NoteCard.tsx`
- `taches/listes/ListesManager.tsx`, `taches/listes/TagsManager.tsx`, `taches/TasksList.tsx`
- `objectifs/ObjectifCard.tsx`, `objectifs/[id]/ObjectifHeader.tsx`, `objectifs/[id]/ObjectifSuiviEtapes.tsx`
- `nutrition/recettes/[id]/{IngredientManager,IngredientsLibresManager,RecetteHeader,EtapesManager}.tsx`
- `nutrition/journal/JournalEntriesList.tsx`
- `habitudes/HabitudeCard.tsx`
- `documents/etiquettes/EtiquettesManager.tsx` (migré vers le helper, message inchangé)
- `documents/[id]/DocumentDetail.tsx`, `documents/DocumentCard.tsx`
- `courses/CoursesList.tsx`
- `collection/[id]/CollectionHeader.tsx` (migré vers le helper, message inchangé)
- `budget/transactions/TransactionsList.tsx`, `budget/recurrentes/RecurrencesList.tsx`, `budget/comptes/ComptesList.tsx`
- `budget/categories/CategorieProgressCard.tsx`, `budget/categories/CategoriesList.tsx`

L'infra `ToastHost` n'a pas été utilisée pour ce point (undo toast
explicitement écarté au profit du `confirm()` natif, comme demandé).

## Recherche globale (`src/app/(app)/GlobalSearchBar.tsx`)

Navigation clavier standard d'un combobox ARIA ajoutée, pour honorer le
contrat `role="combobox"` / `aria-autocomplete="list"` déjà en place :

- Flèches Haut/Bas : déplacent la sélection dans les résultats (cyclique).
- `aria-activedescendant` sur l'input, pointant vers l'option active.
- Entrée sur une option active : navigue vers son `href` (via `router.push`, l'input perdant le focus au clic sinon).
- L'option active reçoit `aria-selected="true"` et un fond `bg-surface-alt` (auparavant `aria-selected="false"` codé en dur sur toutes les options).
- `autoComplete="off"` ajouté sur le champ (recherche, pas un formulaire d'identité — évite les suggestions du gestionnaire de mots de passe/autofill).

## Écarts constatés par rapport au prompt

- **Deux `dangerButton` dans un même fichier** : `budget/categories/CategoriesList.tsx` contient deux boutons de suppression distincts (`SousCategorieRow` et `CategorieRevenuRow`), tous deux corrigés — le prompt listait le fichier une fois mais pas ce détail.
- **Suppression hors périmètre, volontairement non touchée** : dans `taches/TasksList.tsx` (`SousTachesList`), le bouton `×` de suppression d'une sous-tâche est aussi une suppression immédiate sans confirmation, mais il utilise `className="text-alert"` directement et non `dangerButton` — il n'a donc pas été remonté par la recherche `grep dangerButton` et n'a pas été touché, conformément au périmètre explicite du prompt (« usages de `dangerButton` »). À signaler si Vincent veut l'harmoniser dans un futur chantier.
- **`ImageLightbox` alt text** : la demande proposait de dériver l'`alt` du nom de fichier ou d'une légende existante « à défaut » un texte générique. Un texte générique par défaut a été gardé pour tous les appelants sauf les documents (où une légende Recto/Verso et le nom du document étaient trivialement disponibles) — `TaskCard.tsx` (photos de tâches) n'a pas de légende par image, donc reste sur le défaut générique plutôt que de complexifier son state pour un gain marginal.

## Vérification

- `npx tsc --noEmit` (via `next build`) : compile sans erreur sur le code applicatif.
- `npx eslint .` : aucun warning/erreur.
- `npx next build` : échoue à l'étape de prérendu de `/carburants` avec `Error: supabaseKey is required.` — **pré-existant, sans lien avec ces changements** : confirmé en relançant le build sur le commit de base (`git stash` puis build) où la même erreur apparaît à l'identique. Cause : absence de `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` dans cet environnement sandbox (aucun fichier `.env*` présent), pas un problème de code.
- Pas de test unitaire ciblant les composants touchés dans le repo à ce jour ; aucune suite à lancer en plus de `tsc`/`eslint`.
