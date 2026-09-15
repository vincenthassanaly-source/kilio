# Audit UX/technique — écran d'accueil (Dashboard)

Date : 2026-09-15
Méthodologie : skill `impeccable` (commandes `critique` + `audit`), disponible dans cette session (plugin `anthropic-skills:impeccable`, confirmé également présent sur disque via `~/.claude/skills/synced/.../impeccable` et `.impeccable` à la racine du repo).

## Synthèse

7 constats retenus, aucun n'est bloquant au sens strict (l'écran reste utilisable), mais deux touchent directement des principes produit explicites : la zone de tap de la case à cocher des tâches (22×22px) contredit le principe "saisie rapide, one-handed" de `PRODUCT.md`, et la carte "Aujourd'hui" imite visuellement des cartes cliquables sans l'être. Le reste est un mélange d'incohérences d'affordance mineures, un reliquat de layout depuis la suppression du widget météo, et deux écarts cosmétiques à la charte typographique de `DESIGN.md`. Rien n'a été modifié — voir Phase 3 (`git status` propre).

## Constats

### 1. [Gênant] Zone de tap trop petite pour cocher une tâche

- **Où** : `src/components/CheckToggle.tsx` (composant, taille par défaut 22px, aucune zone de tap étendue au-delà du cercle visuel) — utilisé dans `src/app/(app)/DashboardTaskItem.tsx:55-60`.
- **Impact concret** : c'est l'interaction la plus répétée du dashboard (cocher une tâche, plusieurs fois par jour, au téléphone, souvent à une main). 22×22px est bien en dessous du minimum recommandé (44×44 iOS / 48×48 Material) — risque de rater le tap, surtout en usage one-handed pressé (en cuisine, entre deux tâches). Contredit directement le Principe produit #4 de `PRODUCT.md` ("Saisie rapide avant tout : réduire le nombre de taps").
- **Recommandation** (non implémentée) : agrandir la zone de tap invisible du `<button>` (padding autour du cercle de 22px, sans changer sa taille visuelle) à au moins 44×44px, sans toucher au rendu.

### 2. [Gênant] Affordance trompeuse sur la carte "Aujourd'hui" (tâches)

- **Où** : `src/app/(app)/DashboardTachesSection.tsx:38-74` (bloc "Aujourd'hui"), à comparer avec le bloc "Prochain événement" juste en dessous (lignes 76-104) et avec `DashboardNutritionSection.tsx:34-67`.
- **Impact concret** : la carte "Aujourd'hui" a exactement le même style visuel (`card`, `shadow-card`, coins arrondis) que les cartes Nutrition et "Prochain événement", qui sont toutes deux des `Link` avec retour tactile (`motion.div whileTap={{ scale: 0.98 }}`). La carte "Aujourd'hui" n'a ni l'un ni l'autre : taper dessus ne fait rien. De plus, quand plus de 4 tâches du jour restent à faire (`tachesAffichees = tachesDuJour.filter(t => !t.fait).slice(0, 4)`), rien n'indique qu'il y en a d'autres (pas de "+N", pas de lien direct vers la liste complète) — le seul chemin vers `/taches` passe par la barre de navigation du bas, sans lien depuis cette carte elle-même.
- **Recommandation** : envelopper la carte "Aujourd'hui" d'un `Link` vers `/taches` (cohérent avec Nutrition) et afficher un indicateur "+N" quand il reste des tâches non affichées.

### 3. [Gênant] Habitude "quantifiée" : bouton désactivé sans retour visuel

- **Où** : `src/app/(app)/DashboardHabitItem.tsx:60-71`.
- **Impact concret** : pour une habitude de type `"quantifiee"`, la fonction `toggle()` retourne immédiatement sans rien faire, et le `<button>` est `disabled` — mais son style (`ProgressRing`, icône, libellé) est strictement identique à celui d'une habitude cliquable (`streak`/booléenne). Vincent tape dessus sans obtenir le moindre retour ni comprendre pourquoi rien ne se passe, alors que les autres habitudes réagissent normalement au même geste.
- **Recommandation** : appliquer un style visuellement distinct (ex. `opacity-60`) quand `habitude.type === "quantifiee"`, ou rediriger le tap vers l'écran de saisie de valeur plutôt que de le rendre silencieusement inerte.

### 4. [Gênant, à vérifier visuellement] Reliquat de layout depuis la suppression du widget météo — risque de chevauchement avec `ThemeToggle`

- **Où** : `src/app/(app)/page.tsx:34` (`<div className="flex items-center justify-between gap-2">` n'enveloppe plus qu'un seul enfant, le `<h1>`) et `src/app/(app)/layout.tsx:26-28` (`ThemeToggle` en `position: fixed`, coin haut-droit, au-dessus du contenu de page).
- **Impact concret** : le rapport `reports/2026-09-09-suppression-module-meteo.md` a retiré `<MeteoHeaderCard>` de ce `<div>`, qui ne contient donc plus qu'un seul enfant — `justify-between` n'a plus aucun effet utile, signe qu'aucun élément ne réserve plus l'espace à droite pour le bouton `ThemeToggle` (36px, fixé indépendamment du flux du header). Sur un écran étroit, le plus long des trois libellés de salutation ("Bon après-midi", en `font-display text-[25px] font-bold`) pourrait passer sous ce bouton rond. **Non testable dans cet environnement** (pas de credentials Supabase pour lancer `next dev` et observer le rendu réel, comme déjà noté dans les rapports précédents) — à confirmer visuellement avant correctif.
- **Recommandation** : soit réserver l'espace à droite du header (padding/`max-w` sur le `<h1>`), soit simplifier ce wrapper flex devenu inutile, après vérification visuelle sur petit écran (≤360px) aux trois horaires de salutation.

### 5. [Cosmétique] Tailles de police sous le plancher de la charte typographique

- **Où** : `src/app/(app)/DashboardNutritionSection.tsx:61` (`text-[9.5px]`, labels macro P/G/L) et `src/app/(app)/DashboardHabitItem.tsx:77` (`text-[9px]`, badge streak 🔥).
- **Impact concret** : `DESIGN.md` documente une fourchette "Caption (400–600, 10–12px)" comme plus petite taille du système. Ces deux usages descendent en dessous (9 et 9.5px), à peine lisibles sur petit écran, en écart avec la propre charte du produit.
- **Recommandation** : remonter ces deux tailles à 10px minimum.

### 6. [Cosmétique] Léger décalage squelette/contenu réel sur la carte "Aujourd'hui"

- **Où** : `src/app/(app)/DashboardView.tsx:22` (`TachesCardsSkeleton` → `<ListItemSkeletonGroup count={3} />`) vs. `src/app/(app)/DashboardTachesSection.tsx:28` (`tachesAffichees` peut contenir jusqu'à 4 tâches).
- **Impact concret** : en connexion lente, si le jour compte 4 tâches actives, le squelette (3 lignes) cède la place à un contenu réel plus grand (4 lignes) — micro saut de layout au moment du streaming, alors que le reste du système (`CardSkeleton`) est justement pensé pour éviter ce genre de saut.
- **Recommandation** : aligner `count` du skeleton sur 4.

### 7. [Cosmétique] Incohérence mineure : la section "Habitudes" n'a pas de lien direct

- **Où** : `src/app/(app)/DashboardHabitudesSection.tsx` (titre "Habitudes" et conteneur, aucun `href`/`Link`), à comparer avec la carte Nutrition qui, elle, est un `Link` vers `/nutrition/journal`.
- **Impact concret** : atténué par le fait que `/habitudes` (comme `/taches`) fait déjà partie de la barre de navigation par défaut (`DEFAULT_MODULES_BARRE_BASSE` dans `src/lib/navigation/registry.ts`), donc reste accessible en un tap — mais l'incohérence de patron persiste entre les 3 cartes du dashboard (une cliquable avec lien direct, deux qui ne le sont pas du tout).
- **Recommandation** : décision produit à trancher (uniformiser en ajoutant des liens, ou assumer explicitement que seule Nutrition en a un) plutôt qu'un vrai bug.

## Points écartés (déjà couverts ou hors scope)

- Hydratation/streaming par section, cross-fade View Transitions, disparition des tâches cochées, espacement Habitudes, libellé "Supprimer" : déjà traités dans les rapports listés en Phase 1 — non re-signalés.
- Absence d'authentification multi-utilisateur, absence de contrainte d'accessibilité formelle "multi-profils" : contraintes assumées et documentées dans `PRODUCT.md` — non signalées comme points faibles.
