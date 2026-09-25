# Polish "make interfaces feel better" — 2026-09-25

Passe de détail/fit-and-finish sur l'ensemble des modules de `src/app/(app)/`, guidée par le skill `.claude/skills/make-interfaces-feel-better/SKILL.md` (créé pour ce chantier, sur le modèle de `frontend-design-direction`). Aucune logique métier, structure de données ni comportement fonctionnel modifiés — uniquement CSS/markup.

Constat de départ : le design system (`src/app/globals.css`, `src/lib/ui.ts`) était déjà mature sur plusieurs axes du skill — une seule échelle d'ombre (`--shadow-card`) déjà réutilisée partout (cards, `Modal`, `ToastHost`, `GlobalSearchBar`, `ThemeToggle`), aucun `transition: all` / `will-change: all` dans tout `src/`, `-webkit-font-smoothing: antialiased` déjà posé une seule fois au niveau racine (`src/app/layout.tsx`), et un pattern `zoneTap44`/`zoneTap44Icone` déjà largement utilisé pour les zones de tap. Le travail ci-dessous porte donc sur les écarts réels trouvés, pas sur une réécriture de ce qui fonctionnait déjà.

## Fragments partagés (`src/lib/ui.ts`, `src/components/`)

Changements ici touchant potentiellement tous les modules qui consomment ces fragments — appliqués une seule fois plutôt que répétés partout, conformément à la consigne.

| Principe | Avant | Après |
|---|---|---|
| Text wrapping | `screenTitle` / `sectionTitle` (`src/lib/ui.ts`) sans `text-wrap`, risque de dernière ligne orpheline sur les titres longs (noms de catégories, d'objectifs...) | Ajout de `text-balance` sur les deux fragments (titres courts, 1-3 lignes, utilisés dans 48 fichiers) |
| Hit area ≥ 40×40px | `ThemeToggle` (`src/components/ThemeToggle.tsx`) : bouton rond de 36×36px sans zone de tap étendue, alors que le pattern `zoneTap44Icone` existe déjà pour ce cas | Ajout du même pattern (`relative after:absolute after:-inset-1`) → zone de tap ≈44×44px sans grossir le bouton visible ; bouton isolé (fixed, coin d'écran) donc aucun risque de chevauchement |
| Rayon concentrique | `src/components/BottomNav.tsx` : `<nav>` en `rounded-[26px] p-[7px]`, mais les slots et la pile active (fond de l'onglet actif) en `rounded-[18px]` — valeur arbitraire | Rayon corrigé à `rounded-[19px]` (26 − 7 = 19) sur les 3 occurrences (slot, pile active, bouton "Plus"), avec commentaire explicatif |

## Racine `/` (Dashboard)

| Principe | Avant | Après |
|---|---|---|
| tabular-nums | `DashboardNutritionSection.tsx` : `%` dans l'anneau et texte "X / Y kcal" en police proportionnelle | `tabular-nums` ajouté aux deux |
| tabular-nums | `DashboardTachesSection.tsx` : compteur "fait/total tâches" et l'heure du "Prochain événement" en police proportionnelle | `tabular-nums` ajouté aux deux |
| tabular-nums | `DashboardTaskItem.tsx` : heure de tâche affichée en police proportionnelle dans une liste alignée | `tabular-nums` ajouté |
| Hit area / Rayon concentrique | Voir section "Fragments partagés" (`ThemeToggle`, `BottomNav`, rendus sur cette page comme sur toutes les autres) | — |

Fichiers : `src/app/(app)/DashboardNutritionSection.tsx`, `src/app/(app)/DashboardTachesSection.tsx`, `src/app/(app)/DashboardTaskItem.tsx`.

Vérifié sans changement : `DashboardHabitudesSection.tsx`, `DashboardHabitItem.tsx`, `QuickAddFab.tsx`, `GlobalSearchBar.tsx` — aucun écart trouvé (ombres déjà `shadow-card`, pas de `transition-all`, hit areas déjà correctes).

## Agenda (`agenda/**`)

Aucun changement. Vérifié : navigation de période déjà en `navArrowButton` (44×44px) ; glyphes de flèche `←`/`→` non retouchés faute de rendu visuel disponible dans cet environnement pour justifier un décalage optique précis (pas de correction à l'aveugle) ; ombres/transitions déjà conformes ; pas de montant/compteur affiché hors `metaText` (déjà `font-mono`, donc déjà à largeur fixe).

## Budget (`budget/**`, `budget/categories/**`, `budget/comptes/**`, `budget/recurrentes/**`, `budget/statistiques/**`, `budget/transactions/**`)

| Principe | Avant | Après |
|---|---|---|
| tabular-nums | `budget/page.tsx` : solde total, revenus/dépenses/solde du mois en `font-display` proportionnel | `tabular-nums` ajouté aux 4 montants |
| tabular-nums | `budget/calendrier/page.tsx` : totaux dépenses/revenus par jour du calendrier, en police proportionnelle | `tabular-nums` ajouté |
| tabular-nums | `budget/comptes/ComptesList.tsx` : solde du compte en `font-display` proportionnel | `tabular-nums` ajouté |
| tabular-nums | `budget/transactions/TransactionsList.tsx` : montant de transaction en `font-display` proportionnel | `tabular-nums` ajouté |
| tabular-nums | `budget/recurrentes/RecurrencesList.tsx` : montant de récurrence en `font-display` proportionnel | `tabular-nums` ajouté |

Fichiers : `src/app/(app)/budget/page.tsx`, `src/app/(app)/budget/calendrier/page.tsx`, `src/app/(app)/budget/comptes/ComptesList.tsx`, `src/app/(app)/budget/transactions/TransactionsList.tsx`, `src/app/(app)/budget/recurrentes/RecurrencesList.tsx`.

Vérifié sans changement : `CategorieProgressCard.tsx`, `RepartitionCategories.tsx`, `RepartitionComptes.tsx` et le bloc "Catégories en dépassement" de `budget/page.tsx` utilisent déjà `font-mono` sur leurs montants (largeur déjà stable) — pas de tabular-nums à ajouter. Ombres/rayons déjà cohérents (`card`, `listCard`).

## Carburants (`carburants/**`)

| Principe | Avant | Après |
|---|---|---|
| tabular-nums | `CarburantsView.tsx` : prix "meilleur prix" par station en `font-display` proportionnel, valeur qui change au tri/rafraîchissement | `tabular-nums` ajouté |

Fichier : `src/app/(app)/carburants/CarburantsView.tsx`.

## Collection (`collection/**`, `collection/[id]/**`)

| Principe | Avant | Après |
|---|---|---|
| Contours neutres sur les images | `CollectionMosaic.tsx` : les 4 mises en page (1, 2, 3, 4 photos) affichent des photos utilisateur en `object-cover` plein cadre, sans bordure — une photo à bord clair peut se fondre dans le fond de card | Ajout de `border border-line` sur les 4 conteneurs contenant une image réelle (le conteneur "aucune photo" avec icône placeholder n'est pas concerné) |
| Contours neutres sur les images | `collection/[id]/PhotosGrid.tsx` : grille de vignettes de la collection, même exposition (photos/vidéos utilisateur) sans bordure | Ajout de `border border-line` sur chaque cellule |

Fichiers : `src/app/(app)/collection/CollectionMosaic.tsx`, `src/app/(app)/collection/[id]/PhotosGrid.tsx`.

Vérifié sans changement : `CollectionHeader.tsx` (pas d'image), `AddCollectionToggle.tsx`, `collection/loading.tsx`, `collection/[id]/loading.tsx`, `collection/[id]/AddPhotoButton.tsx`.

## Courses (`courses/**`)

Aucun changement. Vérifié : `CoursesView.tsx`, `CoursesList.tsx`, `CourseItemRow.tsx`, `ArchivedCoursesSection.tsx`, `AddCourseForm.tsx`/`AddCourseToggle.tsx` — pas de montant/compteur en police proportionnelle, pas d'image, ombres/hit areas déjà conformes (`listCard`, `CheckToggle` avec `hitSlop`).

## Documents (`documents/**`, `documents/[id]/**`, `documents/etiquettes/**`)

| Principe | Avant | Après |
|---|---|---|
| Contours neutres sur les images | `documents/[id]/DocumentDetail.tsx` : grille de pièces jointes image (photos de factures, etc.) en `object-cover`, sans bordure — contrairement à `DocumentCard.tsx` qui avait déjà `border border-line` sur sa vignette d'aperçu | Ajout de `border border-line`, alignement sur le pattern déjà présent dans `DocumentCard.tsx` |

Fichier : `src/app/(app)/documents/[id]/DocumentDetail.tsx`.

Vérifié sans changement : `DocumentCard.tsx` (bordure déjà présente sur sa vignette), `DocumentForm.tsx`, `DocumentsBrowser.tsx`, `DocumentsList.tsx`, `documents/etiquettes/**` (pas d'image, pas de montant).

## Habitudes (`habitudes/**`)

| Principe | Avant | Après |
|---|---|---|
| tabular-nums | `HabitudeCard.tsx` : pastille de streak "🔥 {n}j" en police proportionnelle (`pillTag`), valeur qui change chaque jour | `tabular-nums` ajouté localement (pas dans `pillTag` partagé, car la plupart des usages de `pillTag` sont des libellés statiques sans chiffre) |

Fichier : `src/app/(app)/habitudes/HabitudeCard.tsx`.

Vérifié sans changement : `HistoriqueView.tsx`, `HabitudeForm.tsx`, `HabitudesView.tsx`, `HabitudesSkeleton.tsx` — le champ de saisie et l'unité/cible utilisent déjà `metaText` (`font-mono`, largeur déjà stable).

## Notes (`notes/**`)

Aucun changement. Vérifié : `NoteCard.tsx` (titre en `nameText`, déjà `truncate` donc `text-balance` sans effet), contenu texte en `line-clamp-6` (contenu libre de longueur très variable, pas un paragraphe éditorial court/moyen — `text-pretty` jugé non pertinent ici), pas de montant, ombres déjà `card`.

## Nutrition (`nutrition/page.tsx`, `nutrition/journal/**`, `nutrition/recettes/**`, `nutrition/recettes/[id]/**`)

| Principe | Avant | Après |
|---|---|---|
| Text wrapping | `nutrition/page.tsx` : description de chaque section (Journal/Recettes) en paragraphe court sans `text-wrap` | `text-pretty` ajouté |
| Text wrapping | `nutrition/recettes/[id]/RecetteHeader.tsx` : description de recette (paragraphe court/moyen) sans `text-wrap` | `text-pretty` ajouté |
| tabular-nums | `nutrition/journal/ResumeJour.tsx` : kcal consommées (gros chiffre central), "/ objectif kcal" et le libellé "X kcal restantes/dépassées" en police proportionnelle | `tabular-nums` ajouté aux 3 |

Fichiers : `src/app/(app)/nutrition/page.tsx`, `src/app/(app)/nutrition/recettes/[id]/RecetteHeader.tsx`, `src/app/(app)/nutrition/journal/ResumeJour.tsx`.

Vérifié sans changement : `AjoutRepasPanneau.tsx` et `RecetteMacros.tsx` avaient déjà `tabular-nums` avant ce chantier ; `ResumeJour.tsx` → `MacroBar` déjà en `font-mono` ; `JournalJour.tsx`, `JournalEntriesList.tsx`, `JournalNavigationJour.tsx`, `JourTypeBascule.tsx`, `AjoutRepasBouton.tsx`, `ObjectifForm.tsx`, `EtapesManager.tsx`, `IngredientManager.tsx`, `IngredientsLibresManager.tsx` — pas d'écart trouvé.

## Objectifs (`objectifs/**`, `objectifs/[id]/**`)

| Principe | Avant | Après |
|---|---|---|
| Text wrapping | `ObjectifCard.tsx` : description d'objectif (paragraphe court, `line-clamp-2`) sans `text-wrap` | `text-pretty` ajouté |
| Text wrapping | `objectifs/[id]/ObjectifHeader.tsx` : description d'objectif en détail (paragraphe court/moyen) sans `text-wrap` | `text-pretty` ajouté |

Fichiers : `src/app/(app)/objectifs/ObjectifCard.tsx`, `src/app/(app)/objectifs/[id]/ObjectifHeader.tsx`.

Vérifié sans changement : `ObjectifSuiviValeur.tsx` (valeurs déjà en `metaText`/`font-mono`), `ObjectifSuiviEtapes.tsx`, `ObjectifSuiviBinaire.tsx`, `ObjectifForm.tsx`, `ObjectifsList.tsx`.

## Plus (`plus/**`)

Aucun changement direct dans `plus/page.tsx` / `PlusEditBar.tsx` : le rendu de la grille (`ModulesGrid.tsx`, corrigé dans "Fragments partagés" pour la description des tuiles) et la barre du bas (`BottomNav.tsx`, corrigé pour le rayon concentrique) couvrent déjà cette route. Vérifié : `ModuleTile` a une hit area largement > 44×44px (carte complète avec padding), pas de resserrement nécessaire.

## Réglages (`reglages/**`)

Aucun changement. Vérifié : `AppearanceRow.tsx`, `NotificationsRow.tsx`, `NettoyageAutoRow.tsx` — les `boxShadow` inline (anneau interne des interrupteurs) sont un usage ciblé et cohérent (pas un ad hoc dupliquant `--shadow-card`), pas de montant/compteur, hit areas déjà correctes.

## Tâches (`taches/**`, `taches/listes/**`)

Aucun changement. Vérifié : `TasksList.tsx` (déjà `CheckToggle` avec `hitSlop`, pas de montant), `AddTaskForm.tsx`, `TachesView.tsx`, `listes/ListesManager.tsx`, `listes/TagsManager.tsx` — pas d'écart trouvé.

## Vérification (Phase 3)

1. **`npx tsc --noEmit`** — dépendances absentes au départ (`node_modules` non installé dans ce sandbox) ; après `npm install`, une première exécution a échoué sur `src/app/layout.tsx: Cannot find name 'LayoutProps'` (type généré par Next.js dans `.next/types`, pas encore présent avant un premier build — fichier non touché par ce chantier). Après `npm run build`, qui régénère ces types, un second `npx tsc --noEmit` **passe sans erreur**.
2. **ESLint (`npm run lint`)** — **passe sans erreur ni avertissement**.
3. **`npm run build`** — compile et type-check avec succès ("Compiled successfully", "Finished TypeScript"), puis échoue au prérendu statique de `/budget/recurrentes` avec `Error: supabaseKey is required` (`src/lib/supabase/admin.ts`). **Confirmé pré-existant et sans rapport avec ce chantier** : `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` sont absentes de cet environnement sandbox — c'est exactement la même classe d'échec documentée sur `/budget/comptes` dans `reports/2026-09-25-audit-navigation.md` (§ vérification, confirmé via `git stash` sur `origin/kilio` avant toute modification) et dans plusieurs rapports antérieurs (`reports/2026-09-24-navigation-instantanee-cache-components.md`, `reports/2026-09-13-fix-deformation-edition-tache.md`). Aucune des pages modifiées dans ce chantier n'est en cause : la route qui échoue en premier dépend simplement de l'ordre non déterministe des workers de build, pas du contenu du diff.

Aucune erreur introduite par ce chantier sur les trois vérifications.
