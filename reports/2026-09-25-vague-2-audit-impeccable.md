# Vague 2 de l'audit impeccable : les correctifs transverses à la source

Suite de `reports/2026-09-25-audit-impeccable-kilio.md` (§5, Vague 2, points 6 à 11) et de la Vague 1 (`reports/2026-09-25-vague-1-audit-impeccable.md`). Les constats T3 à T16 sont corrigés **à la source** (primitives partagées, tokens, `ui.ts`, `globals.css`), sauf T12, qui relève de la Vague 3. Branche : `claude/kilio-vague-1-audit-f8uyhg`, partie de `kilio` (`2ccc9e1`, Vague 1 déjà en production).

## Bilan par constat

| # | Constat | Correction | Où |
|---|---|---|---|
| **T3** | « Aujourd'hui » calculé en UTC côté serveur | Helper unique `aujourdhuiParis()` (Intl, `Europe/Paris`) utilisé par `getToday()`, `aujourdhuiISO()` du Budget (et donc Tâches), le Journal (`jour.ts`, `addJournalEntry`), la page Habitudes et les échéances de Documents. Les périodes par défaut du Budget (semaine, mois, année) partent du jour de Paris. `AppResumeRefresh` relance un rendu serveur à minuit (heure de Paris) si l'app reste ouverte. | `lib/date/paris.ts`, `app/(app)/today.ts`, `lib/budget/compute.ts`, `components/AppResumeRefresh.tsx` |
| **T11** | Ids en dur dans les formulaires rendus deux fois | `useId()` dans 18 formulaires (Tâches, listes, tags, Notes, Habitudes, Objectifs, 6 formulaires Budget, objectif nutritionnel, Recettes, Documents, étiquettes, Collection). Aucun `htmlFor` littéral ne subsiste. | par ex. `taches/AddTaskForm.tsx`, `documents/DocumentForm.tsx` |
| **T14** | `Modal` et lightbox sans gestion du focus, hors portal | `Modal` réécrite : rendue dans un `Portal`, focus piégé et rendu à la fermeture, Échap, titre relié par `useId`, `85dvh`, bouton Fermer de 44 px. Les 3 lightbox (image, TikTok, YouTube) sont en portal, avec `role="dialog"`, la même gestion du focus et des boutons de 44 px. | `components/Portal.tsx`, `hooks/useDialogFocus.ts`, `components/Modal.tsx`, `components/*Lightbox.tsx` |
| **T4** | Blanc sur l'accent illisible en sombre (≈ 2,3:1) | Tokens `--on-kcal` et `--on-accent` : blanc en clair, encre `oklch(0,17)` en sombre (≈ 8,3:1). Appliqués au bouton primaire, aux segments, au FAB, au « Ajouter un repas », à l'icône « + » des cartes d'ajout, aux pastilles d'alerte et à la coche du `CheckToggle`. Plus aucun `text-white` sur un fond d'accent. | `app/globals.css`, `lib/ui.ts` |
| **T5** | `ink-3` sous AA ; contrôles non textuels sous 3:1 ; texte de 8,5 à 10 px | `ink-3` passe de 0,64 à 0,55 en clair (3,3 → 4,7:1) et de 0,54 à 0,64 en sombre (3,5 → 5,2:1). Nouveau token `--control-border` (≥ 3:1), utilisé par le cercle non coché et les pistes d'interrupteur éteintes. Plancher de 11 px sur la barre du bas, le dashboard, le Journal et les Recettes. | `globals.css`, `CheckToggle.tsx`, `reglages/*Row.tsx` |
| **T15** | Champs en 15 px (zoom iOS) | `input` de `ui.ts` en 16 px, plus un filet global `@media (pointer: coarse)` qui impose 16 px à tous les champs, y compris ceux réduits localement à 13 px. | `lib/ui.ts`, `globals.css` |
| **T6** | Cibles tactiles sous 44 px | `ghostButton`, `dangerButton`, `iconButton` et `linkButton` gardent leur taille visible, mais un pseudo-élément `after:` étend la zone de tap à 44 px. Modal, lightbox, segments, épingle de note : 44 px. | `lib/ui.ts`, `notes/NoteCard.tsx` |
| **T13** | Gestes en conflit | `useSwipeHorizontal` : `data-swipe-zone` (le Journal et l'historique Habitudes ne déclenchent plus le swipe entre onglets), `data-drag-handle` (glisser une tâche n'est plus un swipe), pinch à plusieurs doigts ignoré. `PullToRefresh` ignore la poignée de drag et le multi-doigts. La rangée d'habitudes du dashboard a `data-swipe-ignore`. Le pinch de l'Agenda n'est plus pris pour un swipe. | `hooks/useSwipeHorizontal.ts`, `components/PullToRefresh.tsx`, `agenda/AgendaView.tsx` |
| **T7** | Contrôle segmenté réimplémenté dans une dizaine d'écrans | Composant `<SegmentedControl>` : actif `bg-kcal` et `text-on-kcal`, `aria-pressed`, `role="group"`, focus visible, 44 px, option `glissant`, champ caché `name` pour les formulaires. Il remplace les versions locales de Tâches (jaune Glucides), Habitudes (orange), Carburants (×2), Notes, Budget (×3), la priorité des tâches (4 couleurs), le Journal et les Recettes. Les listes déroulantes à 2 ou 3 choix deviennent aussi des segments : type d'habitude, catégorie et mode de suivi d'un objectif, statut d'un objectif, source d'une recette. Les variantes « lien » (sous-navigation Nutrition, Repos/Entraînement) partagent `lib/segmented.ts`. | `components/SegmentedControl.tsx`, `lib/segmented.ts` |
| **T9** | Dégradé et seconde ombre copiés-collés sur l'icône « + » | `addCardIcon` porte le style (aplat `bg-kcal`, `text-on-kcal`). Les 15 styles en ligne sont supprimés. | `lib/ui.ts` + 15 `*Toggle.tsx` |
| **T16** | `theme-color` décalé et indépendant du thème choisi | Valeurs alignées sur le vrai fond (`#f7f5ec` / `#071212`). `themeInitScript` et `basculerTheme()` mettent la balise à jour selon le thème choisi. Le manifeste passe de `#166534` au fond clair. | `lib/theme.ts`, `app/layout.tsx`, `public/manifest.json` |
| **T10** | `prefers-reduced-motion` non global | Règle `*` dans `globals.css` (transitions et animations CSS à ~0 ms) et `<MotionConfig reducedMotion="user">` pour framer-motion. | `globals.css`, `app/providers.tsx` |
| **T8** | Couleurs sémantiques détournées, exceptions non documentées | Corrigé dans le code :<br>- segments et priorité en vert Kcal ;<br>- Budget « proche » en **ambre** (et non plus en jaune Glucides) dans la vue d'ensemble et les catégories ;<br>- Notes dans la recherche globale en `ink-2` (et non plus en bleu Protéines).<br><br>Documenté comme exceptions assumées dans DESIGN.md : bleu interactif de l'Agenda, échelle de priorité (teintes passives avec marqueur). | `budget/page.tsx`, `CategorieProgressCard.tsx`, `GlobalSearchBar.tsx`, `DESIGN.md` |

**DESIGN.md (point 10) mis à jour :**
- nouveaux tokens, et nouvelles valeurs pour `ink-3` ;
- section « Texte sur accent » et « Exceptions assumées » ;
- plancher typographique de 11 px et échelle typo complète (11 à 24 px) ;
- champs en 16 px, cible de 44 px ;
- `SegmentedControl` comme motif unique ;
- réduction des animations globale ;
- Graduated Alert Rule étendue au Budget.

## Au passage (hors liste, même fichiers)

- **Réglages → Apparence :** le choix de thème est enfin conservé au rechargement. `basculerTheme()` écrit maintenant le cookie, lu en priorité au chargement (constat Réglages de l'audit, prévu en Vague 4).
- **Bug détecté par le build :** `segmentClasse` était appelée côté serveur depuis un module client. Je l'ai déplacée dans `lib/segmented.ts`, un module neutre.

## Vérification

- **`tsc --noEmit` :** 0 erreur. Seule reste `LayoutProps`, un type généré par `next typegen`, préexistant.
- **ESLint (`src`, `e2e`) :** 0 avertissement.
- **`next build` :** OK.
- **e2e (rig instant, 160 tests) :** 157 passés, 1 ignoré, 2 échecs. Ces 2 échecs venaient d'un sélecteur de test (`button[aria-pressed]`) qui supposait que seules les coches portent `aria-pressed`. Les segments le portent désormais, c'est voulu. J'ai affiné le sélecteur (`e2e/parite.spec.ts`), et la relance passe : 14/14.
- **Passe visuelle (Pixel 7, clair et sombre) :** Accueil, Tâches (dont le formulaire), Habitudes, Journal, catégories Budget, Carburants. Texte foncé lisible sur le vert en sombre, segments uniformes, icônes « + » à plat.
- **Contrôle de la feuille « Ajouter un repas » :** rendue hors de `<main>` (portal), focus à l'intérieur, fermée par Échap.
- **Détecteur `impeccable detect` sur les fichiers UI centraux :** 6 avertissements consultatifs de taille de police, rien d'autre.

## Reste en suspens / à confirmer

- **Blanc sur `--accent-kcal` en clair : 4,39:1**, juste sous le seuil AA de 4,5:1 pour du texte de 16 px semi-gras. Le corriger demande d'assombrir la couleur de marque (L 0,55 → ≈ 0,53). C'est une décision de marque, je ne l'ai pas prise seul.
- **Agenda :** son sélecteur de vues glissant reste bleu, comme exception documentée. Si tu préfères l'uniformité, il suffit d'y brancher `SegmentedControl glissant`.
- **Sélecteur de liste des tâches** (« Toutes », « Perso ») : ce sont des chips (filtres multiples), pas un segmenté. Laissés tels quels.
- **Grilles denses de l'Agenda et du calendrier Budget :** texte de 9 à 10 px conservé (exception documentée). À revoir avec la densité de la vue Mois (Vague 4).
- **T12 (lectures via Server Actions en série, pagination) :** Vague 3.
- **À tester sur appareil :**
  - zoom iOS au focus : il ne devrait plus se produire ;
  - bascule de thème → couleur de la barre d'état ;
  - gestes : swipe du Journal et de l'historique Habitudes, drag d'une tâche près du haut de liste, pinch dans l'Agenda.
