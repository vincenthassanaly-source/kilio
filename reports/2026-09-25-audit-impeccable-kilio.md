# Audit impeccable — Kilio, tous les modules (technique + UX)

**Date :** 2026-09-25 · **Commit audité :** `dff981e` (`origin/kilio`) · **Type :** audit en lecture seule, **aucun correctif appliqué**
**Méthode :** skill `impeccable` (`audit` + `critique`), complété par les skills Vercel `vercel-react-best-practices` (perf) et `web-design-guidelines` (a11y)

---

## 0. Méthode, périmètre et limites

### Déroulé
- **Synchronisation :** `git checkout kilio && git fetch origin kilio && git reset --hard origin/kilio`, soit HEAD `dff981e` (« Rapport : Partial Prefetching et coquilles Journal/Budget »).
- **Contexte :** `impeccable context`, exécuté une fois. Il a chargé `PRODUCT.md`, `DESIGN.md` (« Le Tableau de Bord Doux ») et le mode *Operate*.
- **Assessment A (revue design + audit technique par lecture du code) :** six agents isolés, un par groupe de modules. Chacun a lu intégralement le code de son périmètre et appliqué `reference/audit.md` (5 dimensions notées 0-4, soit /20) et la partie « Assessment A » de `reference/critique.md` : les 10 heuristiques de Nielsen (/40), la checklist de charge cognitive (/8) et les personas. Pour les personas, Casey (mobile, une main) et Sam (accessibilité) ont été complétés d'une persona projet, « Vincent en cuisine ».
- **Assessment B (détecteur déterministe) :** un agent séparé, sans accès aux conclusions de A, a lancé `impeccable detect --json` module par module puis vérifié chaque constat à la main (vrai ou faux positif). Voir l'annexe A.
- **Recoupement :** j'ai relu dans le code chacun des constats **bloquants** remontés par les agents avant de les retenir (voir §3).

### Écarts par rapport à la demande, à connaître
1. **Emplacement du skill `impeccable`.** Il n'est **pas** dans `.claude/skills/impeccable/` du repo : ce dossier ne contient que les 4 skills Next et les 2 skills Vercel, et `skills-lock.json` ne référence qu'eux. Le skill est en revanche installé au niveau du compte (skill synchronisé `anthropic-skills:impeccable`), avec son lanceur `scripts/impeccable`, et il fonctionne. L'audit a donc été mené avec cette version plutôt que de s'arrêter. Pour l'avoir dans le repo : l'installer via `skills-lock.json` ou copier le dossier sous `.claude/skills/impeccable/`.
2. **`src/lib/modules.ts` n'existe plus.** Le registre unique des modules est `src/lib/navigation/registry.ts` (`NAV_ITEMS`, 13 entrées). C'est lui qui alimente la barre du bas (`BottomNav.tsx`, 4 emplacements configurables + « Plus ») et la grille `/plus` (`ModulesGrid.tsx`).
3. **Pas de navigateur.** Le repo n'a pas de `.env` Supabase, donc l'app ne peut pas afficher de données. Les constats viennent de la lecture du code et du détecteur ; aucune capture n'a été faite. Les points qui demandent une vérification sur appareil sont marqués « à confirmer ».
4. **`node_modules/` absent.** Ni lint, ni typecheck, ni docs Next 16 locales (`node_modules/next/dist/docs/`). Aucune API Next n'est déclarée dépréciée sans preuve.
5. **Pas de snapshot de critique.** Les snapshots `.impeccable/critique/*.md` prévus par `critique` n'ont pas été écrits, pour que ce rapport soit le seul fichier ajouté. De même, les « questions ciblées » de fin de critique sont remplacées par le choix de fin de session (pousser, PR ou rien).
6. **Contrastes.** Les ratios sont calculés à partir des valeurs OKLCH des tokens (luminance ≈ L³), pas mesurés à l'écran. Ils sont cohérents d'un agent à l'autre, à ±0,2.

### Couverture (Phase 3 : aucun module manqué)
Les 13 entrées de `NAV_ITEMS`, plus l'écran `/plus`, soit les **28 `page.tsx`** de `src/app` :

| Module (registre) | Routes auditées | Section |
|---|---|---|
| Accueil `/` | `/` | §4.1 |
| Plus (hors registre, écran de nav) | `/plus` | §4.1 |
| Réglages | `/reglages` | §4.1 |
| Nutrition | `/nutrition`, `/nutrition/journal`, `/nutrition/recettes`, `/nutrition/recettes/[id]` | §4.2 |
| Tâches | `/taches`, `/taches/listes` | §4.3 |
| Agenda | `/agenda` | §4.3 |
| Habitudes | `/habitudes` | §4.4 |
| Objectifs | `/objectifs`, `/objectifs/[id]` | §4.4 |
| Courses | `/courses` | §4.4 |
| Budget | `/budget`, `/budget/{transactions,comptes,categories,recurrentes,statistiques,calendrier}` | §4.5 |
| Notes | `/notes` | §4.6 |
| Documents | `/documents`, `/documents/[id]`, `/documents/etiquettes` | §4.6 |
| Collection | `/collection`, `/collection/[id]`, `/collection/partage/choisir` | §4.6 |
| Carburants | `/carburants` | §4.6 |

Les composants partagés (`src/components/*`, `src/lib/ui.ts`, `globals.css`, toasts, squelettes, hooks) sont audités dans les constats transverses du §4.1, et repris en synthèse au §2.

---

## 1. Résumé exécutif

### État global
Kilio a une **base de design system solide et cohérente** : tokens OKLCH teintés, une seule ombre, rayons croissants, deux polices, anneau `focus-visible` centralisé dans `ui.ts`. L'**architecture de données est moderne** : streaming `<Suspense>` par section, mutations optimistes, file hors ligne, View Transitions directionnelles. **Courses** est la référence interne : ajout multiple avec aperçu, suggestions, annulation par toast, cibles de 44 px (15/20, 31/40).

En revanche, **tous les autres modules sont « Acceptable »** (10 à 13/20 en technique, 17 à 30/40 en UX), et les mêmes 6 ou 7 défauts reviennent partout. Ils viennent de primitives partagées plutôt que d'erreurs locales. Corriger une dizaine de points à la source (`ui.ts`, `globals.css`, un helper de date, un wrapper d'action, un composant de confirmation ou d'annulation) relèverait tous les modules à la fois.

### Tableau de bord des scores

| Module | Audit technique /20 | Critique UX (Nielsen) /40 | Charge cognitive (échecs /8) | Bloquants (P0) |
|---|---|---|---|---|
| Accueil `/` | 12 · Acceptable | 25 | 1 | 0 |
| Plus `/plus` | 13 · Acceptable | 25 | 2 | 0 |
| Réglages `/reglages` | 11 · Acceptable | 20 | 0 | 0 |
| Nutrition · Journal | 10 · Acceptable | 20 | 2 | **1** |
| Nutrition · Recettes | 11 · Acceptable | 19 | 3 | **1** |
| Tâches | 10 · Acceptable | 25 | 3 | **1** |
| Agenda | 12 · Acceptable | 26 | 2 | 0 |
| Habitudes | 10 · Acceptable | 21 | — | 0 |
| Objectifs | 11 · Acceptable | 20 | — | **1** |
| Courses | **15 · Bon** | **31** | — | 0 |
| Budget (7 écrans) | 11 · Acceptable | **17 · Faible** | 4 | **2** |
| Notes | 12 · Acceptable | 27* | — | 0 |
| Documents | 11 · Acceptable | 23* | — | **1** (partagé avec Collection) |
| Collection | 11 · Acceptable | 27* | — | **2** |
| Carburants | 12 · Acceptable | 30* | — | 0 |

\* Scores renormalisés depuis /36 : l'heuristique 10 (aide) a été notée n/a. « — » : le détail de la charge cognitive est dans la section du module.

### Top 5 des problèmes prioritaires, tous modules confondus

1. **[Bloquant] Le Journal Nutrition est toujours en lecture seule.** C'est l'écran n°1 du produit, et le P0 de la critique du 2026-09-15 n'est pas résolu. `addJournalEntry` (`src/app/actions/journal.ts:74`) n'a **aucun appelant** dans `src/` (vérifié par grep). On ne peut ni ajouter ni modifier un repas : pas depuis le Journal, pas depuis une fiche recette (le compteur « Portions consommées » de `RecetteMacros.tsx:54-73` n'est relié à rien), pas depuis la QuickAddFab. Cela contredit frontalement le principe produit n°4, « saisie rapide avant tout ».
2. **[Bloquant] Pertes de données irréversibles sans garde-fou.** Ces actions détruisent des données sans confirmation adaptée ni annulation :
   - **Budget :** supprimer un compte efface en cascade toutes ses transactions *et* les virements vers les autres comptes, ce qui change leurs soldes (`on delete cascade` dans `scripts/migration-budget-*.sql`). La confirmation dit seulement « Supprimer le compte « X » ? » (`budget/comptes/ComptesList.tsx:58`).
   - **Collection :** le `×` de 28 px d'une tuile supprime la photo du Storage en un tap, sans confirmation ni annulation (`collection/[id]/PhotosGrid.tsx:128-138`).
   - **Objectifs :** valider un champ vide enregistre `0` et écrase la mesure du jour (`Number("") === 0`, `objectifs/[id]/ObjectifSuiviValeur.tsx:99-100`, seul contrôle serveur `Number.isFinite`).
   - **Plus loin :** le `×` d'un fichier de document (`DocumentForm.tsx:66-74`) et le `×` d'une sous-tâche suppriment eux aussi sans confirmation, et le « nettoyage auto » des Réglages s'active en un tap sans explication.
3. **[Bloquant/Important] Une erreur réseau ou serveur remplace tout l'écran par la page d'erreur.** Des Server Actions qui lèvent une exception sont appelées dans des `startTransition(async …)` sans `try/catch`. React 19 fait alors remonter l'erreur jusqu'à `(app)/error.tsx`, et la saisie en cours est perdue. On le trouve dans Tâches (sous-tâches, `TasksList.tsx:114-117,131-186`, **P0**), Habitudes, Objectifs, Notes, Budget (suppression d'une catégorie utilisée), la recherche globale du dashboard, etc. Pour une PWA utilisée hors ligne ou en réseau mobile, c'est le défaut le plus fréquent. Le bon modèle existe déjà dans l'app : toggle et suppression de tâche, Courses.
4. **[Important, transverse] « Aujourd'hui » est calculé en UTC côté serveur.** `src/app/(app)/today.ts:10` (`toISOString().slice(0,10)`), `lib/budget/compute.ts:205` (`aujourdhuiISO()`) et `nutrition/journal/jour.ts:21` sont concernés. Entre 0 h et 2 h, heure de Paris : le dashboard montre la veille, une habitude cochée est enregistrée sur la veille, le Journal ouvre la veille, et les vues Tâches « Aujourd'hui » et « En retard » sont décalées. L'Agenda, lui, utilise l'heure locale, d'où des incohérences entre modules.
5. **[Important, design system] Des primitives partagées sous le seuil, sur mobile comme en accessibilité.**
   - **Blanc sur `--accent-kcal` en thème sombre : ≈ 2,3-2,5:1.** Cela touche `primaryButton` (`lib/ui.ts:31`, utilisé dans 26 fichiers), tous les contrôles segmentés actifs et le FAB. Il manque un token `--on-kcal`, alors que `--on-agenda` existe déjà.
   - **`ink-3` ≈ 3,1-3,5:1** partout, souvent sur du texte de 8,5 à 10 px.
   - **`ghostButton`/`dangerButton` ≈ 32-34 px de haut**, utilisés comme actions de ligne (Modifier / Suppr.) dans presque tous les modules. Les liens « Annuler » / « ‹ Retour » font ≈ 20 px.

**Autres bloquants à traiter dans la même vague :**
- **Recherche des transactions (Budget) :** elle fait un `router.push` à chaque frappe, sur un champ contrôlé par l'URL (`budget/transactions/TransactionsFilters.tsx:18-33`). Résultat : caractères perdus, une entrée d'historique par lettre, et un rendu serveur complet à chaque frappe, qui écrit les récurrences dues.
- **Upload de photos rejeté au-delà de 4 Mo (Documents, Collection) :** les fichiers partent bruts vers un Server Action limité par `bodySizeLimit: "4mb"` (`next.config.ts:38`), et la compression `sharp` n'intervient qu'après. Deux photos de téléphone dépassent déjà la limite. *À confirmer sur appareil.*

---

## 2. Constats transverses consolidés (à corriger à la source)

Ces patterns ont été relevés indépendamment par plusieurs agents. Chacun est cité avec les modules touchés ; le détail et les lignes exactes sont dans les sections par module.

| # | Priorité | Constat | Modules touchés | Correction à la source | Commande |
|---|---|---|---|---|---|
| T1 | Bloquant/Important | Server Actions qui lèvent une exception dans `startTransition` sans `try/catch`, d'où un écran d'erreur global. Les messages d'erreur (en français) sont en plus masqués en production par Next, et d'autres exposent le message brut de Postgres | Tâches, Habitudes, Objectifs, Notes, Budget, Nutrition, Accueil (recherche), Carburants (squelette infini) | Un contrat unique : les actions **retournent** `{ ok, error }` au lieu de lever, via un wrapper `runAction()` côté client avec toast, restauration de la saisie et `role="alert"` | `/impeccable harden` |
| T2 | Bloquant/Important | Suppressions irréversibles : `window.confirm()` natif sans annulation, ou aucune confirmation | Budget, Collection, Documents, Tâches, Habitudes, Objectifs, Nutrition, Réglages | Généraliser le modèle Courses (suppression optimiste + toast « Annuler » via `ToastHost`, qui code aujourd'hui « Annuler » en dur, `ToastHost.tsx:56`), et une vraie confirmation explicite *avec les conséquences* pour les suppressions en cascade (compte, catégorie utilisée, nettoyage auto) | `/impeccable harden` |
| T3 | Important | Date « du jour » en UTC côté serveur | Accueil, Habitudes, Nutrition, Tâches, Budget | Un helper unique `todayParis()` (fuseau `Europe/Paris`, via `Intl`/`date-fns`) utilisé par `today.ts`, `aujourdhuiISO()` et `jour.ts` ; rafraîchir la date au retour de l'app (`AppResumeRefresh`) après minuit | `/impeccable harden` |
| T4 | Important | Pas de token de texte sur l'accent : blanc sur `kcal` ≈ 2,34:1 en sombre ; même problème sur les accents de module et `bg-carbs` | Toute l'app (`primaryButton`, segmented, FAB, Terminé) | Ajouter `--on-kcal` (et `--on-<module>` si les couleurs de module restent interactives) dans `globals.css`, calqué sur `--on-agenda` | `/impeccable colorize` |
| T5 | Important | `ink-3` sous AA (≈ 3,1-3,5:1), sur du texte de 8,5-10 px (19 occurrences) ; contrôles non textuels sous 3:1 (cercle non coché de `CheckToggle` ≈ 1,33:1, pistes d'interrupteur « off » ≈ 1,19:1) | Toute l'app | Assombrir `ink-3` (L ≈ 0,56 en clair) ou le réserver au décoratif ; plancher de 11 px ; bordure des contrôles ≥ 3:1 | `/impeccable typeset` + `/impeccable colorize` |
| T6 | Important | Cibles tactiles < 44 px : `ghostButton`/`dangerButton` ≈ 32-34 px, `iconButton` 36 px, bouton Fermer de `Modal` 32 px, `CheckToggle` 30 px, ↑↓× des sous-tâches ≈ 10×24 px, épingle de note 18 px, puces de filtre ≈ 22-24 px | Toute l'app (Courses corrige localement avec `min-h-11`) | Donner `min-h-11` aux tokens de `ui.ts` (ou une zone de tap étendue), et `navArrowButton` (44 px, déjà existant) comme référence | `/impeccable adapt` |
| T7 | Important | Contrôle segmenté réimplémenté au moins 6 fois, rarement conforme à DESIGN.md : onglet actif en couleur de module ou macro (`bg-carbs` dans Tâches, `bg-carburants`, bleu Agenda, couleur Habitudes) au lieu de `bg-kcal`, sans `aria-pressed`/`aria-current` ni focus | Tâches, Habitudes, Carburants, Agenda, Budget, Nutrition | Un composant `<SegmentedControl>` partagé, conforme à la One Accent Rule, avec ARIA et focus | `/impeccable polish` |
| T8 | Important | Couleurs sémantiques détournées : couleurs de module sur des éléments interactifs (One Accent Rule) ; `--accent-carbs` pour l'avertissement budget et la priorité ; `--accent-protein` pour Notes (Semantic-Only Macro Rule) ; rouge pour des dépenses ordinaires (Graduated Alert Rule) ; anneau kcal du dashboard jamais ambre ni rouge | Budget, Tâches, Courses, Objectifs, Habitudes, Accueil, Carburants, Agenda | Soit appliquer les règles, soit **documenter les exceptions** dans DESIGN.md (l'Agenda a manifestement fait un choix délibéré avec `--on-agenda`) ; décliner la Graduated Alert Rule pour le Budget | `/impeccable document` puis `/impeccable colorize` |
| T9 | Important | Seconde ombre + dégradé inline sur l'icône « + » des cartes d'ajout, copiés-collés (Single Shadow Rule) | Nutrition, Budget, Habitudes, Objectifs, Courses, Tâches | Factoriser dans `addCardIcon` de `ui.ts` / `AnimatedAddCard` | `/impeccable polish` |
| T10 | Mineur/Important | `prefers-reduced-motion` n'est **pas** global, contrairement à ce que dit DESIGN.md : seules des classes nommées sont neutralisées, et il n'y a pas de `<MotionConfig reducedMotion="user">` pour framer-motion | `CheckToggle`, toasts, FAB, `DocumentCard`, `CollectionsGrid`, `PhotosGrid`, Nutrition, Courses… | Un `MotionConfig` global dans `providers.tsx` + audit des `animate-*` | `/impeccable animate` |
| T11 | Important | Ids de formulaire en dur, sans `useId()`, dans des formulaires rendus plusieurs fois (ajout + édition) : le `<label>` d'un formulaire peut piloter le champ de l'autre (images ou fichiers envoyés sur la mauvaise tâche ou le mauvais document) | Tâches, Budget, Notes, Documents | `useId()` systématique | `/impeccable harden` |
| T12 | Important | Lectures via Server Actions en `queryFn` : exécutées en série côté client, derrière les écritures. Plusieurs lectures sans limite ni tri (plafond PostgREST de 1000 lignes, soldes ou séries faux sans avertissement) | Tâches (3), Agenda (5), Budget, Habitudes, Collection, Carburants | Route handlers ou lecture serveur + `Promise.all` ; pagination / `order` / agrégats SQL ; vérifier `max_rows` du projet Supabase | `/impeccable optimize` |
| T13 | Mineur | Gestes en conflit : swipe entre onglets (`TabSwipeWrapper`) déclenché depuis des zones qui ont leur propre swipe (rangée d'habitudes du dashboard, historique Habitudes), tirer-pour-rafraîchir déclenché pendant un drag de tâche, pinch-zoom de l'Agenda interprété comme swipe | Accueil, Habitudes, Tâches, Agenda | `data-swipe-ignore` / `stopPropagation`, exclusion des poignées de drag dans `PullToRefresh`, contrôle de `touches.length` | `/impeccable adapt` |
| T14 | Mineur | `Modal` et lightbox sans gestion du focus : ni `role="dialog"`, ni piège de focus, ni `Escape`, et `85vh` ignore le clavier virtuel ; lightbox non rendues en portal (overlay déformé par l'`active:scale` du parent dans `DocumentCard`) | Toute l'app, Collection, Documents | `<dialog>` natif ou portal + focus trap + `dvh` | `/impeccable harden` |
| T15 | Mineur | Champs de saisie en 15 px, ce qui déclenche le zoom automatique d'iOS au focus | Toute l'app (`input` de `ui.ts`) | 16 px minimum sur mobile | `/impeccable typeset` |
| T16 | Mineur | `theme-color` : la valeur sombre `#292f2d` (`src/app/layout.tsx:36`) ne correspond pas au fond réel (≈ oklch 0,17) et suit la préférence système au lieu du thème choisi ; le manifeste garde `#166534` (déjà signalé dans PRODUCT.md) | Shell | Aligner sur les tokens de fond ; mettre à jour la meta quand le thème change | `/impeccable polish` |

**Ce qui fonctionne bien et qu'il faut préserver :**
- **Streaming par section :** `<Suspense>` indépendants, fondu, et squelettes par écran.
- **Mutations optimistes et file hors ligne :** Dexie + React Query ; Courses en est l'exemple le plus abouti.
- **Navigation :**
  - View Transitions directionnelles ;
  - pastille active qui glisse dans la barre du bas, avec `useReducedMotion` correctement branché ;
  - préférences de navigation mises en cache.
- **Discipline du design system :** anneau de focus centralisé dans `ui.ts`, discipline des tokens OKLCH, une seule famille de rayons.
- **Journal Nutrition, depuis la critique du 09-15 :** alertes de dépassement graduées ambre/rouge avec pictogramme (`ResumeJour.tsx`), flèches de jour à 44 px, bornes et `inputMode` sur l'objectif.

---

## 3. Notes de recoupement

J'ai relu chaque constat bloquant dans le code après le retour des agents :

| Constat | Verdict | Preuve |
|---|---|---|
| Journal sans chemin de saisie | **Confirmé** | `grep addJournalEntry src/` : une seule occurrence, la définition (`actions/journal.ts:74`) |
| Suppression de compte en cascade | **Confirmé** | `scripts/migration-budget-2026-08-30.sql:44`, `migration-budget-sous-categories-virements-2026-08-30.sql:36` (`on delete cascade`) ; confirmation générique dans `ComptesList.tsx:58` |
| Recherche de transactions en `router.push` à chaque frappe | **Confirmé** | `TransactionsFilters.tsx:18-33` (`value` lu dans `searchParams`, `onChange` → `router.push`) |
| Champ vide → 0 dans Objectifs | **Confirmé** | `ObjectifSuiviValeur.tsx:99-100` + `actions/objectifs.ts:281-283` |
| Sous-tâches : exception dans une transition, champ vidé avant la réponse | **Confirmé** | `TasksList.tsx:110-118` (`await createSousTache` sans try/catch, `setTitre("")` synchrone) |
| Photo supprimée en un tap | **Confirmé** | `PhotosGrid.tsx:128-138` : `onClick={() => deleteMutation.mutate(photo.id)}`, optimiste sans toast d'annulation (seul un toast d'échec, `:80`) |
| Upload limité à 4 Mo | **Confirmé dans le code**, effet réel **à confirmer sur appareil** | `next.config.ts:38` (`bodySizeLimit: "4mb"`) ; `AddPhotoButton.tsx:63-72` envoie les fichiers bruts en `FormData` |
| « Aujourd'hui » en UTC | **Confirmé** | `today.ts:10` (`new Date().toISOString().slice(0, 10)`), sans TZ configuré |
| Thème de Réglages perdu au rechargement | **Confirmé** | `AppearanceRow.tsx:5-9` n'écrit que `localStorage`, `theme.ts:15-16` lit le cookie en priorité, `ThemeToggle.tsx:26-27` écrit les deux |
| Recettes : kcal sous-estimées pour les aliments « à la pièce » (R-P1-1) | **Plausible, à vérifier sur les données** | `compute.ts:37-39` documente « pour 100 unités (100 g, 100 ml ou 100 pièces) », alors que le Journal convertit les pièces en grammes via le poids par pièce (`actions/journal.ts:98-115`). Tout dépend de la façon dont les macros des aliments « pièce » sont saisies en base |

---

## 4. Constats détaillés par module

Chaque sous-section reprend le rapport de l'agent d'Assessment A concerné : audit technique (5 dimensions /20) puis critique UX (Nielsen /40, charge cognitive, personas). Les constats sont classés **Bloquant (P0) / Important (P1) / Mineur (P2-P3)**, avec `fichier:ligne` et la commande `impeccable` suggérée. Les chemins sont relatifs à `src/app/(app)/` sauf indication contraire.


### 4.1 Accueil, Plus, Réglages (+ composants partagés)

_Source : Assessment A (agent isolé, lecture du code)._

Méthode : Assessment A seul (revue design + audit technique par lecture du code, sans navigateur et sans `impeccable detect`). Tous les constats renvoient à un `fichier:ligne` relu dans son contexte. `node_modules/` est absent du checkout : les docs Next 16 n'ont pas pu être consultées, donc aucune API n'est présumée dépréciée. Les Vercel Web Interface Guidelines ont bien été récupérées (réseau OK) et appliquées.

---

#### Module Accueil / Dashboard — `/`
Fichiers couverts : `src/app/(app)/page.tsx`, `today.ts`, `DashboardView.tsx`, `Dashboard{Nutrition,Taches,Habitudes}{Card,Section}.tsx`, `DashboardTaskItem.tsx`, `DashboardHabitItem.tsx`, `GlobalSearchBar.tsx`, `QuickAddFab.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/error.tsx`, `src/app/layout.tsx`, `src/app/providers.tsx`, `src/app/error.tsx`.

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Libellés 9,5–10 px en `ink-3` (≈3,1:1), cases à cocher de 30 px avec un label générique « Marquer fait » sans le nom de la tâche, champ de recherche sans libellé |
| 2 | Performance | 3 | Bon streaming par section (3 `<Suspense>` indépendants). Mais `QuickAddFab` lance 2 Server Actions dès l'ouverture de la page, et la recherche n'est pas protégée contre les courses de réponses |
| 3 | Responsive | 2 | Swiper la rangée d'habitudes change de module, cible de coche 30×30, texte de 8,5 px |
| 4 | Theming | 3 | Tokens bien utilisés, mais le FAB est blanc sur `kcal` (2,34:1 en sombre), la couleur macro Protéines sert pour « Notes », et `theme-color` est décalé |
| 5 | Intégrité d'implémentation | 2 | Date/heure en UTC côté serveur (mauvais jour entre 0 h et 2 h, hydratation incohérente), Graduated Alert Rule non appliquée sur l'anneau |
| **Total** | | **12/20** | **Acceptable** |

**Bloquant (P0)** — aucun.

**Important (P1)**
- **Le « jour » du dashboard est calculé en UTC** — `src/app/(app)/today.ts:10` (`new Date().toISOString().slice(0,10)`), utilisé par les 3 cartes et l'en-tête. Même motif dans `page.tsx:28` (`greeting(new Date())` avec l'heure du serveur). Catégorie : Intégrité / données. Impact : sur Vercel (UTC), entre 0 h et 2 h, heure de Paris en été, le dashboard affiche la date, les tâches et les habitudes de la veille. Cocher une habitude à 0 h 30 l'enregistre sur la veille (`DashboardHabitItem.tsx:29` envoie `date`). La salutation se décale aussi (« Bon après-midi » à 18 h 30). Aucun `TZ` ni `timeZone` n'est défini dans le repo. Recommandation : calculer la date locale avec `Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris'})` dans un helper partagé, qu'utilisent aussi `nutrition/journal/jour.ts:21` et les autres modules. `/impeccable harden`
- **Risque d'hydratation incohérente sur « Prochain événement »** — `DashboardTachesSection.tsx:35-39`. `nowHM` est calculé pendant le rendu d'un Client Component rendu côté serveur : l'heure UTC au SSR, l'heure de Paris au client, avec un décalage de 2 h. Un événement du jour passé en heure locale mais pas en UTC produit un HTML différent. Impact : erreur d'hydratation, re-rendu client et contenu qui saute. Recommandation : calculer `now` dans un effet (ou `useSyncExternalStore` avec un snapshot serveur neutre), ou le fournir depuis le serveur avec le bon fuseau. `/impeccable harden`
- **Swiper horizontalement la rangée d'habitudes navigue vers un autre module** — `DashboardHabitudesSection.tsx:32` (`overflow-x-auto` sans `data-swipe-ignore`), avec `TabSwipeWrapper.tsx:227` et `useSwipeHorizontal.ts:67-68`. `/` fait partie des 4 onglets épinglés par défaut, donc le swipe entre onglets est actif sur `<main>`. Impact : dès que les habitudes dépassent la largeur de l'écran (plus de 5 environ), faire défiler la rangée déclenche aussi la navigation vers `/nutrition`. Recommandation : ajouter `data-swipe-ignore` sur la rangée, comme dans `TachesView.tsx:172`. `/impeccable adapt`
- **Cible de coche de 30×30 px sur la liste « Aujourd'hui »** — `DashboardTaskItem.tsx:63` (`hitSlop={4}` sur un cercle de 22 px). Le titre (`:66-73`) n'est pas cliquable. Catégorie : Responsive. Impact : c'est l'action principale du dashboard, faite à une main ; les ratés sont fréquents. Recommandation : rendre toute la ligne (coche + titre) cliquable comme un seul bouton d'au moins 44 px de haut, plutôt que d'agrandir un hitSlop contraint par le `gap-2.5`. `/impeccable adapt`
- **Une recherche qui échoue fait basculer tout le dashboard sur l'écran d'erreur** — `GlobalSearchBar.tsx:51-56`. `startTransition(async …)` appelle `rechercheGlobale` sans `try/catch`. En React 19, une erreur levée dans une action de transition remonte à l'error boundary la plus proche (`(app)/error.tsx`). Impact : taper une recherche hors ligne ou avec un Supabase lent remplace toute la page par « Une erreur est survenue ». Recommandation : attraper l'erreur et afficher « Recherche indisponible » dans le menu déroulant. `/impeccable harden`
- **La couleur macro Protéines est réutilisée pour « Notes »** — `GlobalSearchBar.tsx:14` et `registry.ts:217` (`accentVar: "var(--accent-protein)"`). Viole la Semantic-Only Macro Rule de DESIGN.md. Recommandation : créer un token `--accent-notes` (formule `oklch(0.55 0.14 <hue>)`). `/impeccable colorize`
- **Graduated Alert Rule non appliquée** — `DashboardNutritionSection.tsx:36` (anneau toujours `--accent-kcal`) et `:53-58` (barres macro plafonnées à 100 %, toujours dans leur couleur). À 130 % de l'objectif, l'anneau reste vert et plein, sans signal ambre ni rouge, alors que DESIGN.md prévoit l'ambre au-delà de la cible (jusqu'à +10 %) et le rouge au-delà. Recommandation : réutiliser la logique de dépassement du Journal (`src/lib/nutrition/compute.ts`). `/impeccable colorize`

**Mineur (P2/P3)**
- *P2* `QuickAddFab.tsx:42-43` : `getListes` et `getTags` partent au montage du dashboard, sans `enabled: mode !== null`, alors que le commentaire (`:36-38`) dit l'inverse. Les Server Actions passent en file une par une côté client : un toggle de tâche peut attendre derrière elles. Recommandation : `enabled` conditionné à l'ouverture, avec préchargement au `pointerdown`. `/impeccable optimize`
- *P2* `GlobalSearchBar.tsx:51-56` : pas de garde contre les réponses dans le désordre ; une réponse ancienne peut écraser une plus récente. Recommandation : comparer `q` à la requête courante (ref) avant `setResultats`. `/impeccable harden`
- *P2* `GlobalSearchBar.tsx:163` : `onClick={() => selectionner(item)}` appelle `router.push`, puis le `<Link>` navigue lui aussi, soit deux navigations vers la même URL. Recommandation : `e.preventDefault()` dans le handler, ou laisser le `Link` seul faire la navigation. `/impeccable polish`
- *P2* `GlobalSearchBar.tsx:114-128` : input sans `aria-label`/`<label>`, `type="text"` au lieu de `search`, pas de `enterKeyHint`, pas de bouton pour effacer. `/impeccable harden`
- *P2* `DashboardTaskItem.tsx:59` : `label="Marquer fait"` identique pour chaque ligne. Recommandation : `Marquer « ${titre} » comme faite`. `/impeccable harden`
- *P2* `DashboardHabitItem.tsx:66-79` : pas d'`aria-pressed` sur le bouton d'habitude binaire ; le nom est tronqué à 60 px en 10 px (`:75`). `/impeccable typeset`
- *P2* `DashboardNutritionSection.tsx:61`, `DashboardTachesSection.tsx:100,107` : textes de 9,5 px, 8,5 px et 10 px en `ink-3` (≈3,1–3,3:1). Sous le seuil de lisibilité en cuisine, et un échec AA. `/impeccable typeset`
- *P2* `layout.tsx:34-37` : `themeColor` suit `prefers-color-scheme` et non le thème choisi (classe `.dark`). La valeur sombre `#292f2d` ne correspond pas au fond sombre réel (≈`#071212`), d'où une bande de barre de statut dépareillée. `/impeccable polish`
- *P3* `layout.tsx:22` : la meta description est obsolète (« Liste de courses, recettes, suivi calorique et placard »).

**Critique UX**

*Verdict de spécificité* : l'écran est cohérent avec le « Tableau de Bord Doux » (anneau kcal, cartes feutrées, rangée d'habitudes en anneaux, date en eyebrow). Il est reconnaissable comme Kilio, pas comme un template. Mais la composition reste celle d'un dashboard générique « 1 anneau + 1 liste + 1 carte + 1 rangée ». La promesse d'intégration entre modules, la valeur n°1 selon PRODUCT.md, n'y apparaît pas (aucun lien Courses/Recettes, aucune saisie de repas).

| # | Heuristique | Score | Problème clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | Skeletons et toasts hors ligne présents ; le spinner de pull-to-refresh s'arrête après 400 ms fixes, pas à la fin du refresh |
| 2 | Correspondance avec le monde réel | 3 | Abréviations P/G/L à 9,5 px ; salutation décalée par l'heure UTC |
| 3 | Contrôle et liberté | 3 | Re-tap pour décocher ; le FAB se referme avec le bouton retour |
| 4 | Cohérence et standards | 2 | En-tête « Aujourd'hui » cliquable mais « Habitudes » non ; Habitudes orange ici mais verte dans /plus |
| 5 | Prévention des erreurs | 2 | Entrée d'habitude possiblement datée de la veille (UTC) |
| 6 | Reconnaissance plutôt que rappel | 3 | Tout est visible ; les habitudes quantifiées paraissent actives mais sont désactivées |
| 7 | Flexibilité et efficacité | 2 | Recherche globale utile, mais le FAB ne propose pas « Repas » |
| 8 | Esthétique et minimalisme | 3 | Hiérarchie claire, bouton de thème flottant superflu |
| 9 | Récupération après erreur | 2 | Une recherche en échec affiche une page d'erreur complète ; toasts sans « Réessayer » |
| 10 | Aide et documentation | 2 | Rien n'explique pourquoi un tap sur une habitude quantifiée ne fait rien |
| **Total** | | **25/40** | Acceptable |

*Charge cognitive* : 1 échec sur 8 (focus unique : recherche, 4 cartes, FAB, bouton de thème et barre de 5 onglets se disputent l'attention). Aucun point de décision au-delà de 4 options : le FAB en propose 3, la liste est plafonnée à 4 tâches avec un badge « +N ».

*Points forts*
- Streaming par carte (`DashboardView.tsx:57-91`) avec fondu skeleton → contenu et `default="none"` bien pensé : pas d'écran blanc, chaque carte arrive seule.
- Mutations optimistes et file hors ligne partagées avec /taches et /habitudes (`DashboardTaskItem.tsx:27-51`), avec un toast « sera synchronisé » : la bonne réponse pour un usage en déplacement.
- `<Link>` limité à l'en-tête de la carte pour ne pas imbriquer de boutons (`DashboardTachesSection.tsx:44-47`), un souci de rigueur rare.

**Constats UX**
- **Important** — *Aucun raccourci « Ajouter un repas » depuis l'accueil*. `QuickAddFab.tsx:104-172` ne propose que Courses, Tâches et Notes. PRODUCT.md (principe 4) fait de la saisie de repas la priorité produit ; aujourd'hui il faut Nutrition → Journal → ajout. Recommandation : ajouter une entrée « Repas » (formulaire du Journal en feuille) en première position du menu. `/impeccable shape`
- **Important** — *Tap mort sur les habitudes quantifiées*. `DashboardHabitItem.tsx:61,68` : le bouton est `disabled` sans indice visuel ni alternative. Recommandation : ouvrir un petit stepper (+1) ou renvoyer vers `/habitudes`. `/impeccable clarify`
- **Mineur** — La carte Nutrition utilise toujours l'objectif « repos » (`DashboardNutritionCard.tsx:16-17`), même un jour d'entraînement, ce qui donne un % faux ces jours-là. `/impeccable clarify`
- **Mineur** — Le titre « Habitudes » (`DashboardHabitudesSection.tsx:17-22`) n'est pas un lien, contrairement à « Aujourd'hui » : une incohérence de navigation. `/impeccable polish`

*Red flags personas*
- **Casey (mobile, une main)** : coche de 30 px en haut de carte ; swiper les habitudes l'envoie dans Nutrition ; le FAB à droite (`bottom: +90px`) convient aux droitiers seulement.
- **Sam (a11y)** : lecteur d'écran → « Marquer fait » ×4 sans contexte ; champ de recherche annoncé sans nom ; titres de section en `<span>` (pas de `h2`), donc aucune navigation par titres.
- **Vincent en cuisine** : pas de raccourci repas depuis l'accueil ; le % kcal reste vert et plein même en net dépassement ; à 0 h 30, après un dîner tardif, il coche l'habitude de la veille.

---

#### Module Plus (grille des modules) — `/plus`
Fichiers couverts : `src/app/(app)/plus/{page,loading,PlusEditBar}.tsx`, `src/components/ModulesGrid.tsx`, `src/components/BottomNav.tsx`, `src/lib/navigation/{registry.ts,NavigationEditContext.tsx,preferences.ts}`, `src/app/actions/preferences-navigation.ts`.

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Tuiles `<a>` annoncées comme `role="button"` (attributs dnd-kit) ; aucun capteur clavier ; libellés de nav de 10 px en `ink-3` (3,25:1) |
| 2 | Performance | 3 | Préférences en cache `"use cache"` avec coquille statique, c'est excellent ; préchargement de 9 routes à chaque démarrage |
| 3 | Responsive | 3 | Grandes tuiles, `touch-action: pan-y` bien pensé ; bouton « Terminé » d'environ 30 px de haut |
| 4 | Theming | 3 | Couleurs de module tokenisées, mais registre incohérent (Notes = Protéines, Habitudes = kcal) ; « Terminé » blanc sur kcal en sombre |
| 5 | Intégrité d'implémentation | 2 | Double épinglage possible, alternance du tremblement cassée, commentaires (« 11 items ») faux |
| **Total** | | **13/20** | **Acceptable** |

**Bloquant (P0)** — aucun.

**Important (P1)**
- **Un même module peut être épinglé deux fois dans la barre du bas** — `NavigationEditContext.tsx:150-153`. Seul le cas du même emplacement est écarté (`modulesBarreBasse[index] === draggedHref`) ; déposer « Tâches » (déjà en position 2) sur la position 3 donne `[/, /nutrition, /taches, /taches]`, persisté en base (`preferences-navigation.ts:25-31` ne vérifie que la longueur). Impact : un emplacement précieux sur 4 gaspillé ; deux `ActivePill` avec le même `layoutId` montées ensemble (`BottomNav.tsx:100`) ; ordre de swipe ambigu (`TabSwipeWrapper.tsx:177` prend le premier index). Recommandation : échanger les deux emplacements (swap) quand le module est déjà épinglé, et valider l'unicité côté serveur. `/impeccable harden`
- **Les libellés inactifs de la barre du bas ne sont pas lisibles** — `BottomNav.tsx:84,102`. Texte de 10 px en `ink-3` sur `--nav-bg` : ≈3,25:1 en clair, 3,55:1 en sombre ; l'actif `kcal` sur `kcal-soft` fait ≈3,45:1 en sombre. Violation AA 1.4.3, sur l'élément le plus utilisé de l'app. Recommandation : `ink-2` pour l'inactif (5,8:1 / 7,2:1) et 11 px minimum. `/impeccable typeset`
- **Tuiles de la grille : sémantique de lien écrasée** — `ModulesGrid.tsx:52` (`{...attributes}` de `useSortable` sur un `<a>`). Chaque lien reçoit `role="button"`, `aria-roledescription="sortable"` et `aria-pressed`. Les instructions lecteur d'écran par défaut de dnd-kit (« appuyez sur espace pour saisir ») sont fausses puisque seul `PointerSensor` est déclaré (`NavigationEditContext.tsx:127-129`). Recommandation : ne répandre les `attributes` qu'en mode édition, ajouter un `KeyboardSensor` ou des boutons « déplacer », et des `accessibility.announcements` en français. `/impeccable harden`

**Mineur (P2/P3)**
- *P2* `globals.css:329-334` combiné à `ModulesGrid.tsx:77` : chaque tuile est seul enfant de son `motion.div`, donc `:nth-child(odd)` est toujours vrai. Toutes les tuiles tremblent en phase, contrairement à l'intention documentée. Recommandation : poser la classe sur le `motion.div` ou alterner via l'index. `/impeccable animate`
- *P2* `PlusEditBar.tsx:23` : « Terminé » fait environ 30 px de haut, en blanc sur `bg-kcal` (4,39:1 en clair, **2,34:1 en sombre**), sans anneau `focus-visible`. `/impeccable adapt`
- *P2* `registry.ts:155-176` vs `DashboardHabitItem.tsx:72` et `GlobalSearchBar.tsx:15` : Habitudes est verte (kcal) dans la grille mais orange sur le dashboard, et Tâches est verte dans la grille mais bleu agenda dans la recherche. L'identité des modules n'est pas stable. `/impeccable colorize`
- *P2* `NavigationEditContext.tsx:74-78` : `router.prefetch` des 9 modules non épinglés à chaque montage, donc à chaque lancement de la PWA, même hors Wi-Fi. `/impeccable optimize`
- *P3* `registry.ts` (Carburants, sans `description`) : tuile plus pauvre que les autres. Les commentaires parlent de « 11 items » (`registry.ts` et `NavigationEditContext`) alors que le registre en contient 13.

**Critique UX**

*Verdict de spécificité* : le mode édition inspiré d'iOS (tremblement, glisser-déposer d'une tuile vers la barre du bas) est une vraie idée propre au produit, bien au-delà d'un simple « launcher ». En revanche, la grille 2 colonnes de 13 cartes identiques (icône teintée, titre, description) est interchangeable avec n'importe quel « app drawer ».

| # | Heuristique | Score | Problème clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | Contour pointillé sur les emplacements de dépôt, toast en cas d'échec |
| 2 | Correspondance avec le monde réel | 3 | Métaphore d'écran d'accueil iOS familière |
| 3 | Contrôle et liberté | 3 | « Terminé », tap à côté et bouton retour Android quittent tous l'édition (sentinelle d'historique) ; pas d'annulation d'un épinglage |
| 4 | Cohérence et standards | 2 | Couleurs de module qui changent selon l'écran |
| 5 | Prévention des erreurs | 2 | Double épinglage accepté |
| 6 | Reconnaissance plutôt que rappel | 2 | Le mode édition et l'épinglage par glisser ne se découvrent qu'en le sachant (appui long de 400 ms, aucun indice) |
| 7 | Flexibilité et efficacité | 3 | Ordre et barre du bas personnalisables |
| 8 | Esthétique et minimalisme | 3 | Propre ; les 13 tuiles se valent toutes visuellement |
| 9 | Récupération après erreur | 3 | Retour à l'état précédent et toast |
| 10 | Aide et documentation | 1 | Aucune mention de l'appui long ni de l'épinglage |
| **Total** | | **25/40** | Acceptable |

*Charge cognitive* : 2 échecs sur 8 (découpage : 13 tuiles sans regroupement ; choix limités : 13 options au même point de décision). Point de décision au-delà de 4 options : la grille (13).

*Points forts*
- Préférences lues en `"use cache"` avec repli sur les valeurs par défaut (`preferences.ts:272-297`) : barre du bas et grille instantanées, dans l'ordre personnalisé.
- `touch-action: pan-y` argumenté (`ModulesGrid.tsx:22-30`) et `Link` jamais démonté pendant le geste : le drag tactile a été vraiment travaillé.
- Le bouton retour Android referme le mode édition au lieu de quitter la page (`NavigationEditContext.tsx:107-122`).

**Constats UX**
- **Important** — *Personnalisation de la barre du bas introuvable*. Il n'y a aucune entrée « Modifier » visible dans /plus ni dans /reglages. La seule porte est un appui long non signalé. Recommandation : un bouton « Modifier » à côté du titre (qui active `isEditing`) et une ligne d'aide en mode édition (« Glisse une tuile sur la barre pour l'épingler »). `/impeccable onboard`
- **Mineur** — *Regrouper la grille* : « Quotidien » (Nutrition, Tâches, Habitudes, Courses, Agenda) / « Gestion » (Budget, Carburants, Documents, Objectifs) / « Divers ». Réglages et Accueil n'ont pas leur place parmi les modules. `/impeccable layout`
- **Mineur** — Un appui long sur un `<a>` peut déclencher le menu contextuel natif (aperçu du lien sur iOS, menu sur Android) en même temps que l'activation dnd à 400 ms, car `-webkit-touch-callout` n'est pas désactivé hors édition (`ModulesGrid.tsx:51`). À vérifier sur appareil. `/impeccable adapt`

*Red flags personas*
- **Casey** : le bouton « Terminé » est en haut à droite, hors de portée du pouce ; déposer une tuile sur la barre du bas demande de traverser tout l'écran en maintenant l'appui.
- **Sam** : lecteur d'écran → chaque module est annoncé « bouton, triable » ; aucune réorganisation possible au clavier.
- **Vincent en cuisine** : épingle « Courses » par erreur sur un emplacement déjà pris par Courses et se retrouve avec deux Courses et sans Habitudes.

---

#### Module Réglages — `/reglages`
Fichiers couverts : `src/app/(app)/reglages/{page,loading,AppearanceRow,NotificationsRow,NettoyageAutoRow}.tsx`, `src/components/ThemeToggle.tsx`, `src/lib/theme.ts`, `src/app/actions/nettoyage.ts`, `supabase/functions/nettoyage-auto/index.ts` (pour comprendre l'effet réel du réglage).

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Interrupteur « off » presque invisible en clair (fond 1,19:1, bouton blanc sur piste 1,21:1) ; champ nombre sans label |
| 2 | Performance | 3 | Page légère ; `transition-[left]` anime une propriété de layout |
| 3 | Responsive | 2 | Interrupteurs de 26 px de haut, champ d'environ 32 px, bouton Apparence d'environ 34 px |
| 4 | Theming | 2 | Le choix « Apparence » n'est pas persisté en cookie et saute au rechargement ; pas d'option « Système » |
| 5 | Intégrité d'implémentation | 2 | `toggleTheme` dupliqué et divergent ; état non restauré en cas d'erreur ; messages d'erreur serveur masqués en prod |
| **Total** | | **11/20** | **Acceptable** |

**Bloquant (P0)** — aucun.

**Important (P1)**
- **Le thème choisi dans Réglages est perdu au rechargement** — `AppearanceRow.tsx:5-9`. N'écrit que `localStorage`, alors que `themeInitScript` lit **le cookie en priorité** (`theme.ts:13-15`) et que `ThemeToggle.tsx:26` pose ce cookie. Impact : dès que Vincent a utilisé une fois le bouton flottant, changer le thème dans Réglages est annulé au prochain lancement : c'est le cookie périmé qui gagne. Recommandation : une seule fonction `setTheme()` dans `lib/theme.ts`, utilisée par les deux points d'entrée (cookie, localStorage et meta `theme-color`). `/impeccable harden`
- **Un seul tap active la suppression définitive dans 5 modules, sans explication** — `NettoyageAutoRow.tsx:44-48,87`. Le libellé « Supprimer les items faits après (jours) » ne dit pas que la fonction Edge supprime `taches`, `sous_taches`, `objectif_etapes`, `courses_items` et `note_items` (`nettoyage-auto/index.ts:22`). Il n'y a ni confirmation ni aperçu, et le délai minimum est de 1 jour. Catégorie : prévention des erreurs / données. Recommandation : lister les modules concernés sous l'interrupteur, confirmer à l'activation (« X éléments seront supprimés à la prochaine exécution »), et proposer un minimum ou des paliers (7, 30, 90 j). `/impeccable clarify`
- **Interrupteur « désactivé » quasi invisible en thème clair** — `NettoyageAutoRow.tsx:76-77`, `NotificationsRow.tsx:104-105`. Piste `surface-alt` sur `surface` (1,19:1), bouton blanc sur la piste (1,21:1). Échec de WCAG 1.4.11 (3:1). Impact : Vincent ne voit pas qu'un réglage est coupé. Recommandation : piste off en `line`/`ink-3` avec bordure, bouton avec `--shadow-card`, et `role="switch"` + `aria-checked` au lieu de `aria-pressed`. `/impeccable polish`

**Mineur (P2/P3)**
- *P2* `NettoyageAutoRow.tsx:46,39` : `setActif(next)` n'est pas annulé si `updateReglagesNettoyage` échoue ; l'interface affiche « activé » alors que la base est restée « désactivé ». Et `err.message` d'une Server Action est remplacé par un message générique en production par Next : l'erreur de validation serveur (`nettoyage.ts:27`) n'atteint jamais l'écran. Recommandation : retourner `{ ok, error }` au lieu de `throw`. `/impeccable harden`
- *P2* `NettoyageAutoRow.tsx:87-96` : `<span>` non associé à l'`<input type="number">` (pas de `htmlFor`/`aria-label`), `inputMode="numeric"` absent, valeur invalide annulée en silence. `/impeccable harden`
- *P2* `AppearanceRow.tsx:33-40` : le bouton affiche « Clair »/« Sombre » sans dire s'il s'agit de l'état ou de l'action. Pas d'`aria-pressed`, pas d'option « Système ». Recommandation : un contrôle segmenté Clair/Sombre/Système, le motif de choix du design system. `/impeccable clarify`
- *P2* `NotificationsRow.tsx:80` combiné à `lib/push/subscribe.ts:41` : « Permission de notification refusée. » ne dit pas comment la réactiver (réglages système / site). `/impeccable clarify`
- *P3* `page.tsx:363,372` : « Vincent » et « 0.1.0 » codés en dur ; la version devrait venir de `package.json` ou du SHA de build.

**Critique UX**

*Verdict de spécificité* : c'est une liste de réglages iOS standard (pastille d'icône teintée, libellé, contrôle à droite), propre mais sans aucune signature Kilio. La page est surtout incomplète au regard du produit : ni objectifs nutritionnels, ni personnalisation de la navigation, ni export de données.

| # | Heuristique | Score | Problème clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 2 | État « off » invisible ; aucune confirmation « enregistré » pour le délai |
| 2 | Correspondance avec le monde réel | 2 | « items faits » trop vague |
| 3 | Contrôle et liberté | 2 | Le thème revient à l'ancien ; aucun moyen de récupérer des éléments nettoyés |
| 4 | Cohérence et standards | 2 | Deux interrupteurs de thème au comportement différent ; pilule texte ici, interrupteur ailleurs |
| 5 | Prévention des erreurs | 1 | Suppression automatique activée en un tap, délai de 1 jour accepté |
| 6 | Reconnaissance plutôt que rappel | 3 | Tout est visible sur un écran |
| 7 | Flexibilité et efficacité | 2 | Pas d'option « Système », pas d'accès à la personnalisation de la barre |
| 8 | Esthétique et minimalisme | 3 | Sobre et bien groupé |
| 9 | Récupération après erreur | 2 | Messages masqués en prod ; permission refusée sans marche à suivre |
| 10 | Aide et documentation | 1 | Rien sur ce que supprime le nettoyage ni sur sa fréquence |
| **Total** | | **20/40** | Faible-Acceptable |

*Charge cognitive* : 0 échec sur 8 ; aucun point de décision au-delà de 4 options.

*Points forts*
- Thème appliqué avant le premier affichage par un script inline, avec des icônes et libellés rendus des deux variantes (`ThemeToggle.tsx:37-49`, `AppearanceRow.tsx:38-39`) : ni flash ni incohérence d'hydratation.
- État de l'abonnement push à `null` tant qu'il est inconnu, donc aucun faux « off » (`NotificationsRow.tsx:22-25,101`).
- `loading.tsx` qui reproduit exactement la structure de la page (3 + 2 lignes).

**Constats UX**
- **Important** — *Les réglages réellement utiles sont ailleurs ou absents* : objectif kcal repos/entraînement (enfoui dans le Journal), barre du bas (appui long caché). Recommandation : une section « Navigation » (renvoie au mode édition de /plus) et une section « Nutrition » (objectifs). `/impeccable shape`
- **Mineur** — Le `ThemeToggle` flottant présent sur toutes les pages (`(app)/layout.tsx:28-30`) fait doublon avec Réglages et ajoute un élément permanent en haut à droite. Recommandation : le garder dans Réglages seulement, ou le rendre cohérent (cf. P1). `/impeccable distill`

*Red flags personas*
- **Casey** : interrupteurs de 26 px de haut ; le bouton de thème flottant (36 px) est en haut à droite, hors de portée du pouce.
- **Sam** : lecteur d'écran → « Activer le nettoyage automatique, bouton bascule » sans dire ce qui est supprimé ; champ « jours » sans nom accessible.
- **Vincent en cuisine** : active « Nettoyage automatique » en pensant aux courses cochées, et perd 1 jour plus tard ses étapes d'objectif terminées et ses sous-tâches.

---

#### Constats transverses observés

**Contrastes des tokens** (ratios approximatifs calculés depuis les valeurs OKLCH de `globals.css:5-86` ; conversion OKLCH → sRGB linéaire → luminance WCAG).

| Token texte | Clair / `background` | Clair / `surface` | Clair / `surface-alt` | Sombre / `background` | Sombre / `surface` | Sombre / `surface-alt` |
|---|---|---|---|---|---|---|
| `ink-2` | 5,5 ✅ | 5,9 ✅ | 4,9 ✅ | 7,7 ✅ | 7,1 ✅ | 6,1 ✅ |
| `ink-3` | **3,1 ❌** | **3,3 ❌** | **2,8 ❌** | **3,8 ❌** | **3,5 ❌** | **3,0 ❌** |
| `kcal` (texte) | **4,0 ❌** | **4,3 ❌** | 3,6 ❌ | 8,2 ✅ | 7,5 ✅ | 6,4 ✅ |
| blanc sur `kcal` | — | 4,39 ❌ (limite) | — | — | **2,34 ❌** | — |
| `line` (bordure non textuelle) | 1,24 | 1,33 | — | 1,58 | 1,44 | — |

- **[P1] Blanc sur `--accent-kcal` en thème sombre : 2,34:1.** `lib/ui.ts:31` (`primaryButton`, utilisé dans 26 fichiers), plus 7 occurrences de `bg-kcal … text-white` (segmented controls, `PlusEditBar.tsx:23`) et le FAB `QuickAddFab.tsx:85-86`. Le problème a déjà été résolu pour l'agenda avec `--on-agenda` (`globals.css:21-26,65`), mais pas pour la couleur principale. Recommandation : créer `--on-kcal` (blanc en clair, encre très sombre en sombre), et foncer légèrement `kcal` en clair (L≈0,52) pour passer 4,5:1. `/impeccable colorize`
- **[P1] `ink-3` ne passe AA nulle part (2,8–3,8:1)**, alors que DESIGN.md le prévoit pour les labels, les métadonnées, les `eyebrow` (`lib/ui.ts:19`) et la nav du bas, souvent en 9,5–12,5 px (19 occurrences de `text-[8–10px]`). Recommandation : réserver `ink-3` aux placeholders et à la décoration ; baisser sa L à ≈0,56 en clair et la monter à ≈0,62 en sombre. `/impeccable typeset`
- **[P1] Contrôles non textuels sous 3:1** : cercle non coché de `CheckToggle.tsx:95` (`borderColor: var(--line)`, 1,33:1) et interrupteurs « off » de Réglages (1,19:1). WCAG 1.4.11. `/impeccable polish`
- **[P2] `prefers-reduced-motion` n'est pas global**, contrairement à ce qu'affirme DESIGN.md (« neutraliser … plutôt que composant par composant »). `globals.css:380-418` ne cible que des classes nommées ; les transitions Tailwind (`transition`, `active:scale`), `animate-spin` (`GlobalSearchBar.tsx:130`), `animate-pulse` (`skeletons/Skeleton.tsx:12`), les transitions inline de `QuickAddFab.tsx:96,111` et les composants framer sans `useReducedMotion` (`CheckToggle.tsx:98`, `DashboardTachesSection.tsx:75-79`, `PlusEditBar.tsx:20-22`, toasts simples `ToastHost.tsx:60-66`) restent animés. Recommandation : `<MotionConfig reducedMotion="user">` dans `providers.tsx`, plus une règle CSS globale `*,*::before,*::after{transition-duration:.01ms;animation-duration:.01ms}` qui garde les changements d'état. `/impeccable animate`
- **[P2] Cibles tactiles sous 44 px dans les composants partagés** : bouton Fermer de `Modal.tsx:54` (32 px), `ThemeToggle.tsx:43` (36 px), `ImageLightbox.tsx:55,65` (36 px), `iconButton` (`lib/ui.ts:53`, 36 px), `ghostButton`/`dangerButton` (environ 32 px). Recommandation : 44 px minimum, en conservant le visuel avec un hitSlop comme dans `CheckToggle`. `/impeccable adapt`
- **[P2] `Modal` sans gestion du focus** (`Modal.tsx:23-68`) : ni focus initial, ni piège de focus, ni `Escape`, ni retour du focus ; `max-h-[85vh]` ne tient pas compte du clavier virtuel (préférer `dvh`) ; id `modal-title` fixe, en collision en cas de modales empilées. `ImageLightbox.tsx:49` n'a ni `role="dialog"` ni `Escape`. `/impeccable harden`
- **[P2] `PullToRefresh.tsx:67-84`** : effets de bord (`setRefreshing`, appel async, `router.refresh`) à l'intérieur d'une fonction de mise à jour d'état, qui sera exécutée deux fois en StrictMode (dev). Pas de `onTouchCancel` (`:88-93`), donc un geste interrompu par le système laisse l'indicateur bloqué. Le spinner s'arrête après 400 ms fixes (`:76`), sans attendre le refresh. `/impeccable harden`
- **[P2] `useSwipeHorizontal` exige d'ajouter `data-swipe-ignore` sur chaque zone défilante** (`useSwipeHorizontal.ts:46,67`) : tout nouveau conteneur `overflow-x-auto` d'une route épinglée casse la navigation (cas vérifié sur la rangée d'habitudes du dashboard). Recommandation : détecter automatiquement un ancêtre scrollable horizontalement. `/impeccable harden`
- **[P2] `ToastHost.tsx:56`** : le texte du bouton d'action est codé en dur « Annuler », alors que `label` (utilisé pour l'`aria-label`, `:53`) est censé le piloter (`toast-store.ts:258-261`). Timers de 3,2 s et 6 s sans pause au toucher ou au focus (WCAG 2.2.1). `/impeccable polish`
- **[P2] Dates calculées en UTC côté serveur** : `today.ts:10`, `nutrition/journal/jour.ts:21`, et probablement d'autres. Motif à centraliser, voir Accueil P1. `/impeccable harden`
- **[P2] Registre des couleurs de module incohérent** : `registry.ts:155-176` (Accueil, Nutrition, Tâches et Habitudes en `kcal`, alors que `--accent-habitudes` existe), `registry.ts:217` (Notes = Protéines), `GlobalSearchBar.tsx:13-20` (autre table de correspondance). Recommandation : une seule source (`accentVar` du registre), lue par la recherche et par le dashboard. `/impeccable colorize`
- **[P2] Erreurs de Server Actions affichées via `err.message`** (`NettoyageAutoRow.tsx:39`, entre autres) : Next remplace le message en production. Recommandation : renvoyer des résultats typés `{ error }`. `/impeccable harden`
- **[P3] `ErrorState.tsx:39`** : tout le texte rassurant est en `errorText` (rouge alerte). DESIGN.md réserve le rouge aux dépassements nets et à « Supprimer » ; l'icône suffit à signaler l'erreur. `/impeccable quieter`
- **[P3] `confirm.ts:6`** : `window.confirm` natif, hors charte, alors qu'un toast « Annuler » existe (`showActionToast`) ; il faut choisir un seul motif pour les actions destructrices. `/impeccable polish`
- **[P3] `TransitionLink.tsx:183-186` et `BottomNav.tsx:145-151`** : `preventDefault` même avec Ctrl/Cmd ou clic du milieu, ce qui empêche l'ouverture dans un nouvel onglet sur desktop (usage secondaire).
- **Positif** : focus ring `focus-visible` + `ring-offset-2` centralisé dans `lib/ui.ts:24` ; `useBackClose` et `goBackSteps` robustes pour le bouton retour Android ; `useScrollRestoration` générique ; `ToastHost` en `role="status" aria-live="polite"` ; `AppResumeRefresh` pour les données modifiées pendant que l'app était en arrière-plan ; la plupart des composants framer respectent `useReducedMotion`.


### 4.2 Nutrition (Journal + Recettes)

_Source : Assessment A (agent isolé, lecture du code)._

Méthode : lecture intégrale du code (HEAD `dff981e`), sans navigateur (pas de `.env` Supabase) et sans détecteur (`impeccable detect` est lancé par l'autre agent). `node_modules/` est absent du conteneur : les comportements Next.js 16 cités (masquage des erreurs de Server Action en production) viennent de la doc connue de Next et n'ont pas pu être vérifiés dans `node_modules/next/dist/docs/`. Web Interface Guidelines : pas de récupération distante (WebFetch non utilisé). J'ai appliqué les principes connus de Vercel (labels, focus, cibles tactiles, états vides/erreur, `aria-*`, `inputmode`, `touch-action`).

Contraste : valeurs estimées à partir des tokens OKLCH (Y ≈ L³ pour des neutres peu chromatiques), à confirmer avec l'autre assessment :
- `ink-3` (L 0,64) sur `surface` ≈ **3,3:1** en clair et ≈ 3,5:1 en sombre ;
- blanc sur `kcal` sombre (L 0,72) ≈ **2,5:1** ;
- `warning` (L 0,60) sur `surface` ≈ 3,9:1.

---

#### Module Nutrition — `/nutrition`, `/nutrition/journal`, `/nutrition/recettes`, `/nutrition/recettes/[id]`

##### Statut de la critique antérieure (`.impeccable/critique/2026-09-15T07-36-45Z__src-app-app-nutrition-journal-page-tsx.md`, 21/40)

| Constat 2026-09-15 | Statut sur le code actuel | Preuve |
|---|---|---|
| **P0 aucun chemin de saisie de repas** | **TOUJOURS PRÉSENT** | `addJournalEntry` (`src/app/actions/journal.ts:74`) n'a toujours **aucun appelant** dans `src/` (grep). Aucun « Ajouter au journal » depuis une recette. Le retrait est volontaire (`RAPPORT-retrait-ui-ajout-journal-2026-08-28.md`), mais il contredit PRODUCT.md §Operating Context et le Principe 4. |
| P1 swipe de jour sans exclusion sur la liste ou le formulaire | **RÉSOLU (en grande partie)** | `onTouchStart={(e) => e.stopPropagation()}` sur le formulaire (`ObjectifForm.tsx:35`) et sur « Suppr. » (`JournalEntriesList.tsx:62`). |
| P2 `window.confirm()` natif | **TOUJOURS PRÉSENT** | `src/lib/confirm.ts:7`, utilisé par `JournalEntriesList.tsx:53` et par toutes les suppressions de Recettes. |
| P2 erreurs brutes, non actionnables | **PARTIELLEMENT RÉSOLU** | Journal : toast qui nomme l'élément (`JournalEntriesList.tsx:96-98`), message humanisé dans `upsertObjectif` (`objectifs-nutritionnels.ts:196-202`). Pas de bouton « Réessayer » inline. Les erreurs Supabase de lecture sont maintenant **avalées** (voir J-P1-3). |
| P3 dépassement « alarmant », non gradué | **RÉSOLU** | Ambre ≤ 10 %, rouge au-delà, plus un pictogramme non chromatique (`ResumeJour.tsx:13-26, 50-64`). |
| Sam : toggle sans `aria-current` | **RÉSOLU** | `JournalNavigationJour.tsx:60` |
| Sam : flèches 34 px | **RÉSOLU** | `h-11 w-11` (`JournalNavigationJour.tsx:5-6`) |
| Riley : pas de `max` sur les objectifs | **RÉSOLU** | `ObjectifForm.tsx:51,68,85,102` et bornes serveur (`objectifs-nutritionnels.ts:177-182`) |
| Riley : état vide sans action | **TOUJOURS PRÉSENT** | `JournalJour.tsx:127-134` |
| `type="number"` sans `inputMode` | **RÉSOLU** (Objectif) / **présent** (Recettes) | `ObjectifForm.tsx:49` ; `RecetteForm.tsx:104,118,180`, `IngredientManager.tsx:39,175` |
| Icône d'état vide générique | **TOUJOURS PRÉSENT** | `JournalJour.tsx:128-132` : même pictogramme « barres » que la tuile hub (`nutrition/page.tsx:10-14`) |
| Intégration Recettes → Journal invisible | **TOUJOURS PRÉSENT** | Le pas-à-pas « Portions consommées » (`RecetteMacros.tsx:54-73`) n'est relié à rien. |

---

##### Sous-section A — Journal (`/nutrition/journal`) et hub `/nutrition`

Fichiers couverts :
- `nutrition/page.tsx` ;
- `journal/{page,JournalJour,JournalJourSkeleton,jour,date-utils,JournalNavigationJour,JournalSwipeWrapper,ObjectifForm,ResumeJour,JournalEntriesList}.tsx|ts` ;
- `components/NutritionSubNav.tsx`, `components/ProgressRing.tsx` ;
- `lib/nutrition/compute.ts` ;
- `actions/journal.ts`, `actions/objectifs-nutritionnels.ts` ;
- dépendances lues : `hooks/useSwipeHorizontal.ts`, `lib/confirm.ts`, `lib/navigation/registry.ts`, `DashboardNutritionSection.tsx`, `today.ts`, `app/layout.tsx`.

`ProgressRing.tsx` n'est **pas utilisé** dans Nutrition : `ResumeJour.tsx:106-121` réimplémente son propre anneau SVG. Le composant sert au dashboard et aux habitudes.

###### Audit technique

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Texte `ink-3` 10,5–11,5 px ≈ 3,3:1. Blanc sur `kcal` en sombre ≈ 2,5:1. « Suppr. » ≈ 32 px. Segments et tuiles du hub sans anneau `focus-visible` du système. |
| 2 | Performance | 3 | Coquille instantanée, 4 `<Suspense>`, `Promise.all` objectif + repas (`JournalJour.tsx:43`). Seule faiblesse : la logique de calcul est dupliquée dans `getResumeNutritionJour`. |
| 3 | Responsive | 2 | Flèches à 44 px et garde du swipe : bien. « Suppr. » et segments (`py-2` ≈ 36 px) sous 44 px. Champs en 15 px : zoom iOS au focus. |
| 4 | Theming | 2 | Tokens partout, aucune couleur en dur. Mais pas de token `--on-kcal` (Agenda en a un, `--on-agenda`) : le texte blanc sur vert échoue en sombre. |
| 5 | Intégrité d'implémentation | 1 | Tâche n°1 absente (action morte). Type de jour non persisté. « Aujourd'hui » en UTC. Erreurs de lecture rendues comme un état vide. Objectifs factices dans `getResumeNutritionJour`. |
| **Total** | | **10/20** | **Acceptable** (travail significatif requis) |

**Verdict d'intégrité : ÉCHEC.** La couche visuelle suit fidèlement DESIGN.md (segmented control, gradation ambre/rouge, une ombre, rayons croissants). Le système ne sert pourtant pas la tâche centrale du produit : l'écran n'enregistre rien.

###### Bloquant (P0)

**J-P0-1 — Aucun chemin pour ajouter un repas (hérité, toujours présent)**
- Où : `src/app/actions/journal.ts:74-133` (sans appelant) ; `JournalJour.tsx:124-137` (section « Repas du jour » en lecture seule) ; `JournalEntriesList.tsx:28-71` (ligne sans édition, suppression seule).
- Catégorie : Intégrité d'implémentation.
- Impact : l'écran n°1 ne permet ni d'ajouter, ni de corriger une quantité ou un moment. Seules options : supprimer, ou passer par la base. L'échec est total pour la saisie à une main que revendique PRODUCT.md.
- Recommandation : un `addCard` « Ajouter un repas » en tête de la section « Repas du jour », branché sur `addJournalEntry` (date et `moment` pré-remplis selon l'heure). Il ouvre une recherche unifiée aliment/recette, puis un pas-à-pas de quantité (grammes/pièces : la logique serveur existe déjà, `journal.ts:104-119`). Ajouter aussi « Ajouter au journal » sur la fiche recette (voir R-P0-1) et un tap sur une entrée pour éditer sa quantité.
- Commande : `/impeccable harden` puis `/impeccable onboard` (état vide actionnable).

###### Important (P1)

**J-P1-1 — Type de jour (Repos/Entraînement) jamais mémorisé : « repos » par défaut à chaque visite**
- Où : `journal/jour.ts:22` (`jour === "entrainement" ? … : "repos"`) ; `DashboardNutritionSection.tsx:18` (toujours `"repos"`).
- Catégorie : Intégrité d'implémentation.
- Impact : les jours d'entraînement, l'anneau et les barres comparent à la mauvaise cible tant que Vincent n'a pas re-tapé le toggle. Le dashboard, lui, compare toujours à la cible repos. C'est le critère de succès de l'écran (PRODUCT.md §Product Purpose) qui est faussé.
- Recommandation : persister le type par date (colonne sur une table « jour » ou déduction depuis le planning d'entraînement) et le lire côté serveur comme côté dashboard. L'URL `?jour=` ne doit servir qu'à la surcharge.
- Commande : `/impeccable harden`

**J-P1-2 — Texte blanc sur `bg-kcal` illisible en mode sombre**
- Où :
  - segment actif `JournalNavigationJour.tsx:54` et `NutritionSubNav.tsx:24` ;
  - bouton primaire `ui.ts:31` (« Enregistrer l'objectif », `ObjectifForm.tsx:115`) ;
  - token sombre `globals.css` `--accent-kcal: oklch(0.72 0.13 165)`.
- Catégorie : Theming / Accessibilité (WCAG 1.4.3).
- Impact : ≈ 2,5:1 sur les éléments actifs et le CTA principal, le soir, en cuisine. L'Agenda a déjà réglé ce même problème avec `--on-agenda` (`globals.css`, commentaire et ratios cités).
- Recommandation : créer `--on-kcal` (blanc en clair, encre très sombre en sombre), exposer `text-on-kcal`, et l'utiliser dans `primaryButton` et les deux segmented controls.
- Commande : `/impeccable colorize`

**J-P1-3 — Une erreur Supabase s'affiche comme « pas d'objectif » et « aucun repas »**
- Où : `JournalJour.tsx:43-55`. Seul `data` est déstructuré, `error` est ignoré. `objectif` à `null` ouvre le formulaire vide (`ObjectifForm.tsx:17`) et `entries` à `null` affiche l'état vide (`JournalJour.tsx:126-134`).
- Catégorie : Intégrité d'implémentation / gestion d'erreur.
- Impact : sur un réseau mobile instable, Vincent croit que son journal est vide ou que son objectif a disparu. Il peut même le ressaisir, écrasant une valeur existante via l'upsert.
- Recommandation : tester `error` sur les deux requêtes et lever vers `error.tsx`, ou rendre un `ErrorState` (composant existant `components/ErrorState.tsx`) avec « Réessayer ».
- Commande : `/impeccable harden`

**J-P1-4 — Cibles tactiles sous 44 px sur l'action destructive**
- Où : « Suppr. » = `dangerButton` (`ui.ts:48-49`, `px-2.5 py-1.5 text-sm`, ≈ 32 px de haut) dans `JournalEntriesList.tsx:50-66` ; segments `py-2` (`JournalNavigationJour.tsx:53`, `NutritionSubNav.tsx:23`) ≈ 36 px.
- Catégorie : Responsive.
- Impact : à une main, le pouce vise un bouton de 32 px collé au chiffre kcal. Ratés et suppressions accidentelles (atténués seulement par `confirm()`).
- Recommandation : zone de hit ≥ 44 px (padding ou pseudo-élément) ; ou swipe-to-delete ou appui long sur la ligne, avec « Annuler » dans un toast.
- Commande : `/impeccable adapt`

**J-P1-5 — `getResumeNutritionJour` plante sur une entrée orpheline et invente des objectifs**
- Où : `actions/journal.ts:47` (`entry.recette!`, sans le filtre des orphelins de `JournalJour.tsx:59-60`) ; `journal.ts:58-62` (repli codé en dur 2100 kcal / 120 / 230 / 70 g).
- Catégorie : Intégrité d'implémentation.
- Impact : une recette supprimée qui laisse une entrée orpheline (cas explicitement prévu par le commentaire de `JournalJour.tsx:57-58`) fait échouer la carte Nutrition du dashboard. Sans objectif, le dashboard affiche une cible fictive au lieu d'inviter à en définir une.
- Recommandation : factoriser un seul `computeJourNutrition(entries)` partagé par `JournalJour` et l'action (même filtre), et renvoyer `null` quand aucun objectif n'existe.
- Commande : `/impeccable harden`

###### Mineur (P2/P3)

- **[P2] « Aujourd'hui » calculé en UTC serveur.** `jour.ts:21` et `today.ts:10` (`new Date().toISOString().slice(0,10)`). Entre 00 h et 02 h (heure de Paris en été), le Journal ouvre la veille. Recommandation : dériver la date du fuseau `Europe/Paris`, via un cookie de fuseau ou `Intl.DateTimeFormat`. Commande : `/impeccable harden`.
- **[P2] Sens d'animation faux avec les flèches ‹ ›.** `sens` n'est mis à jour que par le swipe (`JournalSwipeWrapper.tsx:29,38`) ; les `<Link>` (`JournalNavigationJour.tsx:29-42`) ne le modifient pas. « Jour précédent » rejoue donc `agenda-glisse-suivant`, ce qui viole « Navigation directionnelle » de DESIGN.md. Recommandation : poser le sens dans l'`onClick` des liens, ou le dériver de la comparaison entre l'ancienne et la nouvelle date. Commande : `/impeccable animate`.
- **[P2] Animations Framer sans `prefers-reduced-motion`.** `JournalEntriesList.tsx:30-35` (`layout`, translation y) : aucun `MotionConfig reducedMotion="user"` dans l'app (grep), contrairement à `AnimatedAddCard` qui teste `useReducedMotion`. Contrevient au « Do » de DESIGN.md. Commande : `/impeccable animate`.
- **[P2] Pas d'anneau `focus-visible` du système** sur les segments (`NutritionSubNav.tsx:23`, `JournalNavigationJour.tsx:53`), les flèches (`JournalNavigationJour.tsx:5`) et les tuiles du hub (`nutrition/page.tsx:41`). Seul l'outline par défaut du navigateur s'affiche. Commande : `/impeccable polish`.
- **[P2] Petit texte `ink-3` sous AA.** `ResumeJour.tsx:43` (valeurs macro 11,5 px), `:126` (« / 2100 kcal » 11 px), `JournalEntriesList.tsx:38` (moment 10,5 px) ≈ 3,3:1. Texte `warning` 11,5 px ≈ 3,9:1. Commande : `/impeccable colorize`.
- **[P2] Zoom automatique iOS au focus.** `input` est en `text-[15px]` (`ui.ts:26`) et le viewport n'a pas de `maximumScale` (`app/layout.tsx:31-34`). Tout focus dans l'objectif zoome la page PWA. Recommandation : 16 px minimum sur les champs. Commande : `/impeccable adapt`.
- **[P3] Deux états vides différents.** Carte avec icône (`JournalJour.tsx:127-134`) contre `<p>` nu après suppression optimiste de la dernière ligne (`JournalEntriesList.tsx:103-105`). Commande : `/impeccable polish`.
- **[P3] Ordre des repas non déterministe dans un même moment** : pas de `.order()` sur `journal_repas` (`JournalJour.tsx:49-54`). Commande : `/impeccable polish`.

###### Critique UX

**Verdict de spécificité design.** L'écran porte bien la voix Kilio : gradation ambre/rouge assumée et commentée, bascule Repos/Entraînement mappée sur `jour_type_ppl`, affichage « 120 g (≈ 2 pièces) », coquille qui s'affiche avant les données. Structurellement, il reste un clone de tracker « anneau + 3 barres + liste », et l'argument différenciant (intégration Recettes → Journal) est absent. On peut le **lire**, pas le **remplir**.

| # | Heuristique | Score | Point clé |
|---|---|---|---|
| 1 | Visibilité du statut | 2 | Suppression optimiste, bon libellé « Enregistrement… ». Mais après l'enregistrement de l'objectif, le formulaire reste ouvert sans confirmation (`ObjectifForm.tsx:17`, `open` jamais refermé), et une erreur de lecture se déguise en état vide. |
| 2 | Correspondance avec le monde réel | 3 | Vocabulaire juste (Petit-déj, Collation, pièces). |
| 3 | Contrôle et liberté | 1 | Pas d'édition d'entrée, pas d'annulation après suppression, pas de retour « Aujourd'hui » après plusieurs jours de swipe (seuls ‹ ›, `JournalNavigationJour.tsx:28-44`). |
| 4 | Cohérence et standards | 3 | Segmented control et tokens cohérents. Écarts : deux états vides, sens d'animation incohérent. |
| 5 | Prévention des erreurs | 3 | Bornes min/max ; `confirm()` avant suppression. |
| 6 | Reconnaissance plutôt que rappel | 2 | Vincent doit se souvenir de basculer sur « Entraînement » à chaque visite. La section « Objectif » n'affiche pas les valeurs cibles, seulement un lien. |
| 7 | Flexibilité et efficacité | 0 | Aucune saisie, aucun raccourci (« refaire le petit-déj d'hier », favoris). Le Journal est aussi à 2 taps de la barre du bas : `/nutrition` mène d'abord à un hub de 2 tuiles (`registry.ts:20,158`, `nutrition/page.tsx:39-54`). |
| 8 | Design esthétique et minimaliste | 3 | Propre. Mais le réglage « Objectif » passe **avant** le résumé du jour (`JournalJour.tsx:114-122`), et le libellé de moment est répété dans chaque carte au lieu d'un en-tête de groupe. |
| 9 | Récupération d'erreurs | 2 | Toast nommé en cas d'échec de suppression. Erreurs de lecture invisibles. |
| 10 | Aide et documentation | 1 | État vide sans consigne ni action. |
| **Total** | | **20/40** | **Acceptable, tiré vers le bas par le P0** (21/40 → 20/40 : les corrections a11y compensent à peine, le cœur du problème reste). |

**Charge cognitive : 2 échecs sur 8** (modérée).
- *Groupement* : les groupes par moment sont séparés par `gap-3` contre `gap-2.5` à l'intérieur, sans en-tête (`JournalEntriesList.tsx:108-110`).
- *Mémoire de travail* : type de jour à se rappeler.

Aucun point de décision au-delà de 4 options.

**Points forts**
- Coquille instantanée pilotée par l'URL, avec 4 `<Suspense>` indépendants et des fallbacks dans le même cadre (`journal/page.tsx:14-41`, `JournalNavigationJour.tsx:17-25`). Changer de jour ne fait jamais sauter la mise en page.
- Gradation du dépassement conforme à la Graduated Alert Rule, avec marqueur non chromatique (`ResumeJour.tsx:13-64`).
- Suppression optimiste avec message d'échec nommé (`JournalEntriesList.tsx:78-101`).

**Constats UX**

*Bloquant*
- **UX-J-P0 — Écran en lecture seule** (= J-P0-1). Sans saisie, l'écran ne remplit pas son rôle. `/impeccable harden`.

*Important*
- **UX-J-P1-a — Hub `/nutrition` = un tap de plus vers l'écran n°1.** `nutrition/page.tsx:30-56` : deux tuiles qui dupliquent `NutritionSubNav`. Recommandation : faire pointer l'onglet de la barre du bas directement vers `/nutrition/journal` (la sous-nav donne déjà accès aux Recettes), ou remplacer le hub par le Journal. `/impeccable distill`.
- **UX-J-P1-b — Type de jour non mémorisé** (= J-P1-1). `/impeccable harden`.
- **UX-J-P1-c — Hiérarchie inversée.** Un réglage rare (« Objectif », qui déplie un formulaire à 4 champs quand aucune cible n'existe) précède le résumé et les repas (`JournalJour.tsx:114-122`). Recommandation : résumé en tête ; objectif accessible par un tap sur l'anneau ou en pied de page. `/impeccable layout`.

*Mineur*
- **[P2] Aucun retour « Aujourd'hui »** et aucun marqueur « Aujourd'hui » à côté de la date (`JournalJour.tsx:21-29`). `/impeccable clarify`.
- **[P2] Pas de sous-total kcal par moment de repas.** L'info la plus utile après un repas (« combien m'a coûté ce déjeuner ») manque. `/impeccable layout`.
- **[P2] Risque à vérifier en navigateur.** `ObjectifForm` n'est pas keyé sur `jourType` (seul `JournalJourAnime` a `key={date}`, `JournalJour.tsx:112`). Si React conserve l'état au basculement Repos → Entraînement sur la même date, le formulaire resté ouvert garde les `defaultValue` du type précédent alors que le champ caché `jour_type` change (`ObjectifForm.tsx:38`). « Enregistrer » écraserait alors la cible entraînement avec les valeurs repos. `/impeccable harden`.
- **[P3] `confirm()` natif** hors charte, sans annulation. `/impeccable polish`.

**Red flags personas**
- **Casey (mobile, une main)** : rien à taper pour enregistrer un repas. « Suppr. » de 32 px au bord droit. Le Journal est à 2 taps de la barre du bas.
- **Sam (accessibilité)** : segment actif et CTA à ≈ 2,5:1 en sombre ; méta 10,5–11,5 px en `ink-3` ≈ 3,3:1 ; animations Framer qui ignorent `prefers-reduced-motion` ; pas d'anneau de focus du système sur les segments.
- **Vincent en cuisine** : les mains occupées, il ouvre le Journal un jour d'entraînement. Il voit la cible repos et un « Aucun repas enregistré » sans bouton. Il doit poser la poêle, basculer le toggle, puis ouvrir Supabase pour saisir. À 00 h 30, il tombe même sur la veille.

---

##### Sous-section B — Recettes (`/nutrition/recettes`, `/nutrition/recettes/[id]`)

Fichiers couverts :
- `recettes/{page,loading,RecettesList,AddRecetteToggle,RecetteForm}.tsx` ;
- `recettes/[id]/{page,loading,RecetteHeader,RecetteMacros,IngredientManager,IngredientsLibresManager,EtapesManager}.tsx` ;
- `actions/{recettes,recette-ingredients,recette-ingredients-libres,recette-etapes}.ts` ;
- `lib/nutrition/compute.ts` ;
- dépendances lues : `AnimatedAddCard.tsx`, `PullToRefresh.tsx`, `TransitionLink.tsx`.

###### Audit technique

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Recherche, sélection d'aliment et champs d'ajout sans label (placeholder seul). Chips sans `aria-pressed` ni anneau de focus. En production, les erreurs affichées deviennent le message générique de Next. |
| 2 | Performance | 3 | `Promise.all` à 5 requêtes (`[id]/page.tsx:19-34`), formulaire chargé en `dynamic` (`AddRecetteToggle.tsx:9`, `RecetteHeader.tsx:11`). Mais toute la table `aliments` (`select("*")`) est chargée et sérialisée côté client, même pour une recette HelloFresh qui ne l'utilise pas. |
| 3 | Responsive | 2 | Boutons ghost/danger ≈ 32–34 px partout, pas-à-pas à 30 px, chips ≈ 24 px, `h1` tronqué sur des noms HelloFresh longs. |
| 4 | Theming | 2 | Seconde ombre colorée et `white` en dur sur l'icône « + » ; champ d'édition hors token (`rounded-lg`, sans fond `surface-alt`) ; même problème de blanc sur `kcal` en sombre. |
| 5 | Intégrité d'implémentation | 2 | Unité « pièce » calculée différemment dans Recettes et dans Journal ; `ordre` dupliqué après suppression ; code mort (`reorderIngredientsLibres`) ; lien vers un « onglet Aliments » inexistant ; `<select>` au lieu du segmented control. |
| **Total** | | **11/20** | **Acceptable** |

**Verdict d'intégrité : ÉCHEC partiel.** La structure respecte le système (cartes, pills kcal, morph du titre liste → détail). Mais deux incohérences de données (unité pièce, ordre) et le masquage des erreurs en production minent la confiance dans les macros, qui sont la raison d'être de la bibliothèque.

###### Bloquant (P0)

**R-P0-1 — La fiche recette ne mène nulle part : pas d'« Ajouter au journal »**
- Où : `RecetteMacros.tsx:44-73`. Le pas-à-pas « Portions consommées » ne fait que multiplier l'affichage ; aucun bouton ne l'enregistre.
- Catégorie : Intégrité d'implémentation (même cause que J-P0-1).
- Impact : c'est le parcours différenciant de Kilio selon PRODUCT.md §Positioning. L'interface invite explicitement à choisir des portions « consommées », puis s'arrête.
- Recommandation : bouton primaire « Ajouter au journal » sous le pas-à-pas, avec le moment pré-rempli selon l'heure, qui appelle `addJournalEntry` (`type=recette`, `quantite=count`), puis un toast avec lien vers le Journal.
- Commande : `/impeccable harden`

###### Important (P1)

**R-P1-1 — Unité « pièce » : kcal des recettes fausses d'un facteur ~poids/100**
- Où :
  - `IngredientManager.tsx:154` : `unite` copiée depuis l'aliment ; la quantité est saisie dans cette unité (placeholder « pièce », `:180`) et stockée telle quelle (`recette-ingredients.ts:25-27`) ;
  - calcul : `compute.ts:37-47` (« pour 100 unités (… 100 pièces) ») ;
  - Journal, à l'inverse, convertit les pièces en grammes (`journal.ts:104-119`) et traite `kcal_100g` comme « pour 100 g » (voir aussi `RAPPORT-poids-unite-journal-2026-08-28.md` : « les macros restent pour 100g »).
- Catégorie : Intégrité d'implémentation (exactitude des données).
- Impact : pour un aliment `unite='piece'` dont les macros sont par 100 g (convention actuelle), 2 pièces comptent pour `kcal_100g × 0,02` au lieu de `× 2·poids/100`. Les kcal/portion de la recette sont largement sous-estimées. Elles se propagent à la liste, aux filtres kcal, et au Journal pour les recettes sans surcharge.
- Recommandation : appliquer la même conversion `poids_unite_g` dans `nutritionRecette` (ou à l'insertion, comme dans le Journal) et corriger le commentaire de `compute.ts:37-39`.
- Commande : `/impeccable harden`

**R-P1-2 — Erreurs levées par les Server Actions, affichées via `e.message` : génériques en production**
- Où :
  - lecture : `RecetteHeader.tsx:72`, `IngredientManager.tsx:69,103`, `IngredientsLibresManager.tsx:68,103`, `EtapesManager.tsx:74,110` ;
  - levée : `recettes.ts:158-161`, `recette-ingredients.ts:214,223-226,238-241`, `recette-ingredients-libres.ts:289,298-301`, `recette-etapes.ts:384,400-403`.
- Catégorie : Gestion d'erreur / Accessibilité (WCAG 3.3.1).
- Impact : Next remplace en production le message des erreurs levées côté serveur par un message générique anglais avec digest (non vérifiable ici, `node_modules` absent). Les phrases françaises soignées (« Suppression impossible : cette recette est partagée… ») ne s'affichent donc jamais. À l'inverse, `recettes.ts:117,139` et `recettes/page.tsx:24` exposent le `error.message` brut de Postgres. Enfin, ces `<p>` d'erreur n'ont pas `role="alert"` (`RecetteHeader.tsx:83`, `IngredientManager.tsx:53`, etc.).
- Recommandation : les actions renvoient `{ error }` au lieu de lever, avec des messages humanisés (le modèle existe dans `upsertObjectif`) ; ajouter `role="alert"`.
- Commande : `/impeccable clarify`

**R-P1-3 — Cibles tactiles sous 44 px sur toute la fiche**
- Où :
  - `ghostButton` et `dangerButton` (`ui.ts:39-40, 48-49`), deux par ligne à 8 px d'écart : `IngredientManager.tsx:90-110`, `EtapesManager.tsx:97-117`, `IngredientsLibresManager.tsx:91-111`, `RecetteHeader.tsx:59-79` ;
  - pas-à-pas à 30 px (`RecetteMacros.tsx:59,67`) ;
  - chips de filtre ≈ 24 px (`pillTag`, `ui.ts:55-56`, `RecettesList.tsx:81-106`) ;
  - « Annuler » en lien souligné `text-sm` (`AddRecetteToggle.tsx:38`, `RecetteHeader.tsx:31`).
- Catégorie : Responsive.
- Impact : en cuisine, doigts mouillés, « Éditer » et « Suppr. » sont voisins sur chaque ligne : risque d'erreur élevé.
- Recommandation : zones de hit ≥ 44 px ; regrouper Éditer/Suppr. dans un menu « ⋯ » ou un swipe sur la ligne.
- Commande : `/impeccable adapt`

**R-P1-4 — Choix d'un ingrédient dans un `<select>` natif listant tous les aliments, et renvoi vers un onglet inexistant**
- Où : `IngredientManager.tsx:157-172` (liste complète, sans recherche ni label) ; `:141-146` (« Ajoute d'abord des aliments dans l'onglet Aliments ») alors que `NutritionSubNav.tsx:6-9` ne propose que Journal et Recettes, et qu'aucune route « aliments » n'existe sous `src/app/(app)/`.
- Catégorie : Intégrité / UX.
- Impact : composer une recette de 10 ingrédients demande 10 défilements dans une liste native. Avec zéro aliment, Vincent est envoyé vers une impasse.
- Recommandation : combobox avec recherche (`normalizeSearch` existe déjà) ; corriger la copie ou créer l'écran Aliments.
- Commande : `/impeccable clarify` (copie) et `/impeccable harden` (combobox)

**R-P1-5 — Seconde ombre et blanc en dur sur l'icône « + » (Single Shadow Rule)**
- Où : `AddRecetteToggle.tsx:19-23` (`boxShadow: "0 3px 8px color-mix(... kcal 45% ...)"` et dégradé `white 15%`).
- Catégorie : Theming.
- Impact : viole une règle nommée de DESIGN.md (« ne jamais introduire un second token d'ombre »). D'après `AnimatedAddCard.tsx:6-8`, le motif est vraisemblablement recopié sur une quinzaine d'écrans.
- Recommandation : icône à plat, `bg-kcal` et `text-on-kcal`, sans ombre ; ou porter le style dans `addCardIcon` sans ombre.
- Commande : `/impeccable polish`

###### Mineur (P2/P3)

- **[P2] Payload inutile.** `[id]/page.tsx:27` charge `aliments.select("*")` (toutes les colonnes, toutes les lignes) et le passe au client (`IngredientManager`, `:70`), y compris pour les recettes HelloFresh qui ne l'affichent pas (`:67-68`). Recommandation : ne charger que `id, nom, unite`, et seulement si `source !== 'hellofresh'`. Commande : `/impeccable optimize`.
- **[P2] Une erreur de chargement devient un 404.** `[id]/page.tsx:19-38` : les erreurs des 5 requêtes sont ignorées ; `recette` à `null` déclenche `notFound()`. Commande : `/impeccable harden`.
- **[P2] `ordre` dupliqué après une suppression.** `nextOrdre={ingredients.length}` / `{etapes.length}` (`IngredientsLibresManager.tsx:175`, `EtapesManager.tsx:175`) : après la suppression d'un élément du milieu, le nouvel élément reprend un `ordre` existant et l'ordre d'affichage devient ambigu. `reorderIngredientsLibres` (`recette-ingredients-libres.ts:321-333`) est du code mort, sans vérification d'erreur. Commande : `/impeccable harden`.
- **[P2] Champs sans label.** Recherche (`RecettesList.tsx:72-78`), ajout d'ingrédient libre (`IngredientsLibresManager.tsx:139-140`), étapes (`EtapesManager.tsx:145-147`) et tous les champs d'édition inline : placeholder seul. Chips sans `aria-pressed` (`RecettesList.tsx:81-106`). Commande : `/impeccable harden`.
- **[P2] Dérive du token `input`.** `IngredientManager.tsx:44` (`rounded-lg`, sans `bg-surface-alt` ni anneau de focus : viole l'Escalating Round Rule, 16 px attendus) ; `text-sm ${input}` pose deux tailles en conflit (`IngredientsLibresManager.tsx:38,45`, `EtapesManager.tsx:30,37,44`). Commande : `/impeccable polish`.
- **[P2] « Source » en `<select>`** (`RecetteForm.tsx:133-142`) : DESIGN.md §Layout veut le segmented control pour tout choix binaire (« jamais de radio ou dropdown à sa place »). Commande : `/impeccable polish`.
- **[P2] Titre tronqué.** `truncate` sur le `h1` (`RecetteHeader.tsx:47`) : les longs noms HelloFresh sont illisibles, sans moyen de les voir en entier. Commande : `/impeccable typeset`.
- **[P2] `cardTight` sur des lignes qui portent des boutons et des champs** (`IngredientManager.tsx:33`, `EtapesManager.tsx:20`, `IngredientsLibresManager.tsx:30`, et `JournalEntriesList.tsx:36`). `active:scale-[0.97]` fait « trembler » une ligne non cliquable à chaque tap sur un enfant : c'est le cas que `ui.ts:5-13` et DESIGN.md §Cards cherchent à éviter. Commande : `/impeccable polish`.
- **[P3] Code mort.** `fmt()` a deux branches identiques (`RecetteMacros.tsx:7-10`). Commande : `/impeccable polish`.

###### Critique UX

**Verdict de spécificité design.** Une bibliothèque de recettes générique avec quelques touches propres : champs spécifiques à HelloFresh (ustensiles, astuces du chef, surcharge « si imprimée »), pill kcal/portion, filtres kcal. Le carnet est bien outillé pour **saisir** une recette, mais ne sert pas la boucle quotidienne : choisir une recette et la manger (l'enregistrer). Le pas-à-pas de portions en est le symptôme le plus visible.

| # | Heuristique | Score | Point clé |
|---|---|---|---|
| 1 | Visibilité du statut | 2 | « Ajout… » et « Enregistrement… » affichés. Aucun retour de succès après un OK inline. Erreurs masquées en production. |
| 2 | Correspondance avec le monde réel | 3 | « Astuce du chef », ustensiles, « si imprimées » : fidèle à l'usage HelloFresh. |
| 3 | Contrôle et liberté | 2 | « Annuler » partout, `confirm()` avant suppression, pas d'annulation après coup. |
| 4 | Cohérence et standards | 2 | `<select>` au lieu du segmented control ; champ inline hors token ; étapes réservées à HelloFresh (`[id]/page.tsx:74`) ; renvoi vers un « onglet Aliments » absent. |
| 5 | Prévention des erreurs | 2 | Doublon d'ingrédient bien intercepté (`recette-ingredients.ts:29-33`). Unité pièce ambiguë ; pas de `inputMode="decimal"` sur les champs décimaux. |
| 6 | Reconnaissance plutôt que rappel | 2 | Recherche et filtres de la liste : bien. Choix d'aliment dans un `<select>` sans recherche : mal. |
| 7 | Flexibilité et efficacité | 1 | Ni « Ajouter au journal », ni duplication de recette, ni ajout rapide en série. |
| 8 | Design esthétique et minimaliste | 3 | Liste claire, pills lisibles. Le formulaire HelloFresh déplie 16 champs nutritionnels d'un coup. |
| 9 | Récupération d'erreurs | 1 | Messages génériques ou bruts de Postgres, pas de `role="alert"` sur les erreurs inline. |
| 10 | Aide et documentation | 1 | États vides en texte seul (« Aucune recette pour l'instant. », `RecettesList.tsx:67`). |
| **Total** | | **19/40** | **Acceptable** |

**Charge cognitive : 3 échecs sur 8** (modérée).
- *Choix minimaux* : recherche plus 6 chips sur une seule ligne (`RecettesList.tsx:79-108`).
- *Groupement* : les chips « temps » et « kcal » sont mélangées dans le même `flex-wrap`.
- *Mémoire de travail* : il faut connaître le nom exact de l'aliment pour le retrouver dans le `<select>`.

Points de décision au-delà de 4 options : la barre de filtres (7) ; le `<select>` d'aliments (N) ; les 16 champs nutritionnels du formulaire HelloFresh (`RecetteForm.tsx:172-187`).

**Points forts**
- Recherche insensible aux accents, portant aussi sur les ingrédients (`recettes/page.tsx:33-38`, `RecettesList.tsx:54-64`) : on retrouve une recette par « poulet ».
- Morph nommé du titre, de la liste vers le détail (`RecettesList.tsx:117` et `RecetteHeader.tsx:46`) : une vraie sensation d'app native.
- Surcharge nutritionnelle HelloFresh repliée par défaut et révélée à la demande (`RecetteForm.tsx:160-191`, `RecetteMacros.tsx:88-128`).

**Constats UX**

*Bloquant*
- **UX-R-P0 — Pas d'« Ajouter au journal »** (= R-P0-1). `/impeccable harden`.

*Important*
- **UX-R-P1-a — Composer une recette est lent à une main** (= R-P1-4) : `<select>` natif, puis champ quantité désactivé tant que rien n'est choisi, puis bouton. Trois cibles par ingrédient. `/impeccable harden`.
- **UX-R-P1-b — Une recette « Manuel » ne peut pas avoir d'étapes** (`[id]/page.tsx:74-79`). Les recettes maison, a priori les plus nombreuses pour un usage perso, n'ont pas de marche à suivre. `/impeccable shape`.

*Mineur*
- **[P2] Chips de filtre** : mettre les deux familles sur deux rangées, ou un seul segmented control « kcal ». `/impeccable distill`.
- **[P2] États vides sans action** (`RecettesList.tsx:66-68` ; « Aucun ingrédient pour l'instant. », `IngredientManager.tsx:210`). `/impeccable onboard`.
- **[P3] Libellé « Suppr. » abrégé** partout ; « Supprimer » tient à cette largeur. `/impeccable clarify`.

**Red flags personas**
- **Casey (mobile, une main)** : sur chaque ligne d'ingrédient, « Éditer » et « Suppr. » (≈ 32 px) sont collés. Les chips de filtre font ≈ 24 px. Le pas-à-pas de portions fait 30 px.
- **Sam (accessibilité)** : recherche, sélection et champs d'ajout annoncés sans nom accessible ; chips sans état pressé ; erreurs inline non annoncées (sans `role="alert"`).
- **Vincent en cuisine** : il ouvre sa recette HelloFresh, règle « 2 portions »… et ne peut pas l'ajouter à son journal. S'il supprime un ingrédient pendant une coupure réseau, il lit « An error occurred in the Server Components render… » en anglais.

---

#### Constats transverses observés

1. **La saisie est absente de bout en bout.** Une Server Action complète (`addJournalEntry`) n'a aucune UI, ni dans le Journal, ni sur la fiche recette, ni dans `QuickAddFab`. Tout le module est en lecture seule sur sa donnée principale. C'est le P0 unique du module ; il se voit dans les deux sous-sections.
2. **Pas de token « texte sur accent » pour le vert Kcal.** Le blanc est codé en dur sur `bg-kcal` (`ui.ts:31`, `NutritionSubNav.tsx:24`, `JournalNavigationJour.tsx:54`) et échoue en sombre (≈ 2,5:1), alors que le correctif existe déjà pour l'Agenda (`--on-agenda`). À généraliser en `--on-kcal`.
3. **Boutons compacts partagés sous 44 px.** `ghostButton`, `dangerButton` (≈ 32–34 px), `pillTag` utilisé comme bouton (≈ 24 px) et `iconButton` (36 px) sont la source unique de presque tous les défauts de cible tactile du module. `ui.ts:41-47` a créé `navArrowButton` pour l'Agenda plutôt que de corriger la base ; la dette est restée dans les autres usages.
4. **Gestion d'erreur incohérente entre les Server Actions.** Trois styles coexistent :
   - `return { error }` avec un message humanisé (`upsertObjectif`) ;
   - `return { error: error.message }` brut (`createRecette`, `updateRecette`, `addJournalEntry`, `addIngredient`, `addEtape`) ;
   - `throw new Error(...)` lu via `e.message` côté client, masqué en production (toutes les mises à jour et suppressions de Recettes).

   Côté lecture, les erreurs Supabase sont soit ignorées (`JournalJour.tsx:43`, `[id]/page.tsx:19`), soit affichées brutes (`recettes/page.tsx:24`).
5. **`window.confirm()` pour toute suppression** (`lib/confirm.ts:7`, 5 appelants dans le périmètre), sans annulation a posteriori. Un toast « Supprimé · Annuler » combiné à `useOptimistic` (déjà en place dans le Journal) serait plus cohérent avec la charte.
6. **Calcul nutritionnel dupliqué et divergent.**
   - `JournalJour.tsx:59-99` et `journal.ts:45-54` recopient la même agrégation, mais seule la première filtre les orphelins.
   - `ResumeJour.tsx` réimplémente `ProgressRing`.
   - Unité « pièce » : les pièces sont converties en grammes dans le Journal mais pas dans les recettes (R-P1-1).

   Il faut une source de vérité unique dans `lib/nutrition/compute.ts`.
7. **Date « du jour » en UTC serveur** (`jour.ts:21`, `today.ts:10`), dont héritent toutes les vues « aujourd'hui » de l'app. Décalage d'un jour entre minuit et 1–2 h heure de Paris.
8. **Mouvements Framer sans réglage « réduction des animations » global.** Aucun `MotionConfig reducedMotion="user"`. Seuls les composants qui appellent `useReducedMotion` à la main (`AnimatedAddCard`, `PullToRefresh`) respectent la préférence. `JournalEntriesList` ne le fait pas.
9. **Champs à 15 px** (`ui.ts:26`) sous le seuil de 16 px qui évite le zoom automatique d'iOS : toute saisie dans l'app zoome la PWA.
10. **`cardTight`/`listCard` utilisés comme conteneur de ligne avec boutons ou champs internes** (Journal, Ingrédients, Étapes) : l'effet de pression de toute la ligne contredit la règle « entité unique » que `ui.ts:5-13` documente.


### 4.3 Tâches et Agenda

_Source : Assessment A (agent isolé, lecture du code)._

Méthode : lecture intégrale des fichiers du périmètre + composants partagés importés (CheckToggle, PullToRefresh, AnimatedAddCard, useBackClose, QuickAddFab, TabSwipeWrapper, Modal, lib/confirm, lib/budget/compute `aujourdhuiISO`). Guidelines Vercel Web Interface récupérées en ligne (OK). Contrastes calculés par conversion OKLCH vers sRGB (script local), pas mesurés à l'écran. `node_modules` absent : le comportement Next.js « Server Actions exécutées une par une côté client » vient de la doc Next connue, pas de `node_modules/next/dist/docs` (non vérifiable ici). Aucun navigateur, aucun détecteur.

---

#### Module Tâches — `/taches`, `/taches/listes`

Fichiers couverts : `src/app/(app)/taches/{page,loading,TachesView,TasksList,AddTaskForm,AddTaskToggle,preloadAddTaskForm}.tsx|ts`, `taches/listes/{page,loading,ListesManager,TagsManager,AddListeToggle,AddListeForm,AddTagToggle,AddTagForm}.tsx`, `src/lib/taches/compute.ts`, `src/app/actions/taches.ts`.

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Onglet actif blanc sur `carbs` : 4,3:1 en clair, 2,2:1 en sombre ; ids dupliqués entre formulaires ; aucun anneau de focus sur le segmented, les chips, les boutons de sous-tâches ni CheckToggle |
| 2 | Performance | 2 | 3 lectures via Server Actions (sérialisées) ; toutes les tâches archivées montées dans un `<details>` fermé ; recherche non différée qui relance les animations de layout à chaque frappe |
| 3 | Responsive | 2 | Cibles ↑ ↓ × des sous-tâches d'environ 10×24px ; poignée de drag 32px ; le drag d'une tâche déclenche aussi le PullToRefresh |
| 4 | Theming | 2 | Tokens globalement respectés, mais `carbs`/`agenda`/`alert`/`ink-3` servent d'états interactifs ; ombres secondaires ; `#4f7cff` codé en dur |
| 5 | Intégrité d'implémentation | 2 | Réordonnancement actif pendant une recherche (ordre corrompu), erreurs de sous-tâches envoyées vers l'error boundary, cache TanStack listes/tags jamais invalidé |
| **Total** | | **10/20** | **Acceptable** |

**Constats audit**

*Bloquant*
- **Erreur réseau ou serveur sur une sous-tâche : page entière sur error.tsx, saisie perdue.** `TasksList.tsx:115-119`, `:131-136`, `:153-186` + `actions/taches.ts:862,880,889,910,928`. Catégorie : Intégrité. Impact : les actions de sous-tâches lèvent une exception (`throw new Error`) dans un `startTransition` async. React 19 relance l'erreur vers l'error boundary le plus proche (`(app)/error.tsx`). Hors ligne en cuisine, cocher ou ajouter une sous-tâche fait donc tomber tout l'écran. En plus, `setTitre("")` (l.119) vide le champ avant même la réponse. Contrairement à `toggleTache`, rien ne passe par la file hors ligne (`enqueueAction`). Recommandation : `useMutation` + mise à jour optimiste + `enqueueAction` sur erreur réseau (même patron que `toggleMutation`, l.322-347), ou try/catch + toast ; vider le champ seulement après succès. Commande : `/impeccable harden`.

*Important*
- **Drag & drop actif pendant une recherche : l'ordre des tâches masquées est corrompu.** `TachesView.tsx:287` (`reordonnable={vue === "toutes"}`, la `recherche` n'est pas prise en compte) + `TasksList.tsx:640-646`. Catégorie : Intégrité. Impact : avec une recherche active, `handleDragEnd` renumérote `ordre` de 0 à n-1 par liste à partir du seul sous-ensemble visible. Les tâches filtrées gardent leur ancien `ordre` et entrent en collision : l'ordre persistant est faussé en silence. Le commentaire l.608-613 affirme justement le contraire. Recommandation : `reordonnable={vue === "toutes" && !recherche.trim()}`. Commande : `/impeccable harden`.
- **Le drag d'une tâche déclenche aussi le tirer-pour-rafraîchir.** `TachesView.tsx:189` (liste enveloppée par `PullToRefresh`) + `components/PullToRefresh.tsx:42-85` (aucune exclusion de cible) + poignée `TasksList.tsx:484-493`. Catégorie : Responsive / gestes tactiles. Impact : liste courte, `scrollTop === 0`, Vincent tire la première tâche vers le bas par la poignée. L'indicateur de refresh pousse alors le contenu jusqu'à 96px de haut pendant le drag : dnd-kit a mesuré les positions avant ce décalage, donc la détection de collision est fausse. Au relâché, au-delà de 140px, une invalidation part pendant l'enregistrement optimiste de l'ordre. Sur une route épinglée en barre du bas, `<main>` écoute en plus le swipe entre onglets (`TabSwipeWrapper.tsx:103`). Recommandation : ignorer dans PullToRefresh les touchstart dont la cible est dans `[data-drag-handle]` / `[data-swipe-ignore]`, ou suspendre PullToRefresh via `onDragStart`/`onDragEnd`. Commande : `/impeccable harden`.
- **Ids HTML figés : ils se dupliquent dès que deux formulaires sont ouverts.** `AddTaskForm.tsx:325-329` (`titre`), `:344-347`, `:362-367`, `:515/524` (`tache-images`) ; `AddListeForm.tsx:36,43` et `AddTagForm.tsx:26,33` (`nom`, `couleur`). Catégorie : Accessibilité / Intégrité. Impact : formulaire d'ajout ouvert et une carte en édition en même temps (états indépendants, `AddTaskToggle` + `TaskCard.editing`) : le `<label htmlFor="tache-images">` du second formulaire ouvre le sélecteur de fichiers du premier, et les images partent sur la mauvaise tâche. Sur `/taches/listes`, « Nom » du formulaire de tag peut viser l'input de la liste. Recommandation : préfixer tous les ids avec `useId()`. Commande : `/impeccable harden`.
- **Onglet de vue actif en `bg-carbs text-white` : double violation de règle et contraste insuffisant.** `TachesView.tsx:199-201`. Catégorie : Theming / A11y. Impact : viole la One Accent Rule et la Semantic-Only Macro Rule (le jaune Glucides sert ici d'état interactif). Contraste 4,31:1 en clair (13px, sous 4,5) et **2,24:1 en sombre**. Le conteneur est aussi `bg-surface` au lieu de `surface-alt`, et les boutons n'ont ni `aria-pressed` (Agenda l'a) ni anneau de focus. Recommandation : reprendre exactement le segmented control du système (`surface-alt`, actif `bg-kcal`), idéalement extrait en composant partagé. Commande : `/impeccable polish`.
- **Sélecteur de priorité et badges de priorité hors système de couleurs.** `AddTaskForm.tsx:79-84`, `:562-575` ; `TasksList.tsx:59-64`, `:439-445`. Catégorie : Theming / A11y. Impact : fonds actifs `ink-3`/`agenda`/`carbs`/`alert` + texte blanc. En sombre : 2,2:1 (carbs), 2,4:1 (agenda), 2,9:1 (alert) ; en clair : 3,3:1 (ink-3). Badge « Moyenne » `text-carbs` sur `carbs/10` : 3,9:1 à 11px. Le rouge Alerte est réservé aux dépassements et à « Supprimer » (Graduated Alert Rule). Segments d'environ 30px de haut. Recommandation : actif `bg-kcal` pour le segmented ; priorité portée par un glyphe ou une icône + texte `ink`, comme `TacheBlock` le fait déjà (`PRIORITE_STYLE.marker`). Commande : `/impeccable colorize`.
- **Lectures de données via Server Actions : 3 POST sérialisés au chargement.** `TachesView.tsx:105-110` (`getTachesAvecRelations`, `getListes`, `getTags` utilisés comme `queryFn`). Catégorie : Performance. Impact : Next exécute les Server Functions une par une côté client. Les trois requêtes, puis QuickAddFab qui relit listes/tags, s'enchaînent en cascade au lieu de partir en parallèle. `getTachesAvecRelations` (`actions/taches.ts:540-562`) charge en plus **toutes** les tâches archivées depuis toujours, avec sous-tâches, tags et images. Recommandation : un seul Route Handler GET (ou une seule action renvoyant `{taches, listes, tags}`), et une borne sur les archivées (par exemple les 30 derniers jours, le reste paginé). Commande : `/impeccable optimize`.
- **Toutes les tâches archivées sont montées, même repliées.** `TasksList.tsx:731-743` (`<details>` : les enfants React sont rendus même fermé). Catégorie : Performance. Impact : chaque TaskCard archivée crée 2 `useMutation`, un `useSortable`, un listener `popstate` permanent (`useBackClose`, `hooks/useBackClose.ts:133-145`) et un `motion.li` layout. Le volume grossit sans limite. Recommandation : rendre la liste seulement quand elle est ouverte (état contrôlé + `onToggle`, comme `ArchivedTasksSection` d'Agenda), `content-visibility: auto` au-delà. Commande : `/impeccable optimize`.
- **Cibles tactiles minuscules et collées sur les sous-tâches.** `TasksList.tsx:150-191` (↑ ↓ × en glyphes nus, sans padding, `gap-2`), `:197-209` (input `rounded-lg` 8px, bouton « Ajouter » sans hauteur). Catégorie : Responsive. Impact : à une main, « × Supprimer » est à 8px de « ↓ », pour environ 10×24px de cible, et la suppression d'une sous-tâche part **sans confirmation ni annulation**. Pas de `focus-visible` non plus. Recommandation : boutons `h-11 w-11` (ou menu « … » par ligne) ; suppression avec annulation par toast ; input basé sur le token `input`. Commande : `/impeccable adapt`.
- **« Aujourd'hui » calculé en UTC.** `lib/budget/compute.ts:205` (`toISOString().slice(0,10)`), utilisé par `TachesView.tsx:114,146` et `AddTaskForm.tsx:253`. Catégorie : Intégrité. Impact : entre 00:00 et 02:00 (heure d'été), « Aujourd'hui » et « En retard » filtrent sur la veille, le bouton « Aujourd'hui » du formulaire pose la date de la veille, et `/agenda` (qui utilise `startOfToday()`, heure locale) ne donne pas le même « aujourd'hui ». Recommandation : `format(new Date(), "yyyy-MM-dd")` en local (comme `agenda/date-utils.ts:toISODate`) ; côté serveur, fuseau `Europe/Paris` explicite. Commande : `/impeccable harden`.
- **Cache TanStack `listes`/`tags` jamais invalidé après création, modification, réordonnancement ou suppression de tag.** `AddListeForm.tsx:21-26`, `AddTagForm.tsx:20-25`, `ListesManager.tsx:110,124` (`reordonnerListes`), `TagsManager.tsx:25` ; les nouveaux tags créés depuis `AddTaskForm` ne sont pas invalidés non plus (`TachesView.tsx:151-158`, taches seulement). Catégorie : Intégrité. Impact : `staleTime` 30 s (`app/providers.tsx:18`). Une liste créée n'apparaît ni dans les chips de `/taches` ni dans le select du formulaire pendant jusqu'à 30 s ; un tag supprimé reste affiché sur les cartes. La suppression de liste, elle, invalide bien (`ListesManager.tsx:78-79`) : c'est une incohérence. Recommandation : invalider `queryKeys.listes`/`tags`/`taches` dans chaque `onDone` et après chaque action. Commande : `/impeccable harden`.

*Mineur*
- **`listCard` (`transition` Tailwind : transform + opacity, 150ms) posé sur des `motion.li`/`motion.div` animés par framer-motion.** `TasksList.tsx:532`, `:569` + `lib/ui.ts:64`. Catégorie : Performance. Impact : la transition CSS lisse chaque frame écrite par framer : entrée, sortie et layout paraissent traînants, et `:active` scale toute la carte quand on presse la poignée de drag. Recommandation : `transition-[background-color,border-color]` sur ces nœuds, ou un press state porté par un enfant. `/impeccable animate`.
- **Recherche contrôlée non différée.** `TachesView.tsx:112-136`, `:244-250`. Chaque frappe refiltre et re-rend toutes les TaskCard (non mémoïsées) avec animations `layout`. Recommandation : `useDeferredValue(recherche)`, `React.memo(TaskCard)`, champ `type="search"` + `aria-label` + `enterKeyHint="search"`. `/impeccable optimize`.
- **Cibles < 44px.** Lien « Gérer les listes » `h-9` (`TachesView.tsx:213`), effacement de recherche `h-6` (`:256`), poignée `h-8` (`TasksList.tsx:486`), « Modifier »/« Suppr. » `ghostButton` d'environ 32px (`:496-509`), retrait d'image `h-5` (`AddTaskForm.tsx:60`), chips de tags `py-1` (`:606`), « Annuler » souligné sans padding (`AddTaskToggle.tsx:85-91`, `ListesManager.tsx:37-43`), ↑ ↓ de listes (`ListesManager.tsx:107-124`). `/impeccable adapt`.
- **Anneau de focus absent.** Segmented et chips (`TachesView.tsx:194-239`), bouton d'expansion des sous-tâches sans `aria-expanded` (`TasksList.tsx:456`), `CheckToggle` (`components/CheckToggle.tsx:46`), select/checkbox natifs `h-4 w-4` (`AddTaskForm.tsx:497-503,579-593`). `/impeccable polish`.
- **Double ombre et dégradé sur l'icône « + » des cartes d'ajout.** `AddTaskToggle.tsx:54-58`, `AddListeToggle.tsx:18-21`, `AddTagToggle.tsx:17-21` (`boxShadow` ad hoc). Viole la Single Shadow Rule ; motif copié-collé 3 fois. `/impeccable polish`.
- **Couleur « optionnelle » en réalité toujours envoyée.** `AddListeForm.tsx:43-49` / `AddTagForm.tsx:33-38` : `type="color"` avec `defaultValue="#4f7cff"` (hex codé en dur, hors palette), donc impossible de laisser vide. Cette couleur sert ensuite de **texte** 11px sur fond à 10% (`TasksList.tsx:66-69`) sans aucun contrôle de contraste : un jaune choisi devient illisible. `/impeccable colorize`.
- **Libellés.** « Enregistrement... » avec trois points au lieu de « … » (`AddTaskForm.tsx:672`, `AddListeForm.tsx:59`, `AddTagForm.tsx:49`) ; « réessayez » (vous, `AddTaskForm.tsx:261`) au milieu d'une app au tutoiement ; « Suppr. » abrégé. `/impeccable clarify`.
- **Bouton « Créer » collant (`sticky bottom-0`, `AddTaskForm.tsx:661-664`) dans `<main>` scrollable, sous la barre de navigation flottante fixe (`BottomNav.tsx:155`).** Sur un formulaire déplié plus haut que l'écran, le bouton peut se coller sous la barre du bas. Seuls safe-area + 12px le protègent (à vérifier sur appareil). `/impeccable layout`.

**Critique UX**

*Verdict de spécificité design* : le langage visuel des cartes (listCard, pastilles, anneau à coche) est bien celui de Kilio, mais l'écran Tâches est la version la plus « générique todo-app » du système : il invente sa propre couleur d'état actif (jaune Glucides), sa propre sémantique de priorité (bleu Agenda / jaune / rouge) et empile un contrôle d'action identique (Modifier/Suppr.) sur chaque carte. Il ne s'aligne pas sur les composants signature (segmented kcal, Graduated Alert).

| # | Heuristique | Score | Problème clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | Coche optimiste + toasts ; aucune indication de retard sur les cartes (seule une date absolue « 25 septembre 2026 ») |
| 2 | Correspondance avec le monde réel | 3 | Français naturel, mais dates absolues avec année au lieu de « Aujourd'hui/Demain/Hier » |
| 3 | Contrôle et liberté | 2 | Pas d'annulation après suppression ; sous-tâche supprimée d'un tap sans confirmation ; filtres (vue/liste) remis à zéro à chaque visite |
| 4 | Cohérence et standards | 2 | 3 couleurs d'actif différentes pour le même segmented control dans l'app (carbs ici, agenda dans Agenda, kcal ailleurs) ; 2 entrées « ajouter » (carte + FAB) |
| 5 | Prévention des erreurs | 2 | Drag avec recherche active, ids dupliqués, × collé à ↓ |
| 6 | Reconnaissance plutôt que rappel | 3 | Chips de listes visibles, résumé « Heure, rappel, notes, images… » |
| 7 | Flexibilité et efficacité | 3 | Entrée = créer, FAB, drag, recherche multi-champs |
| 8 | Esthétique et minimalisme | 2 | Carte chargée : titre + jusqu'à 5 pastilles + notes + échéance + images + rangée de 3 contrôles, répétée sur chaque tâche |
| 9 | Récupération d'erreur | 2 | « Erreur de chargement des tâches. Réessaie. » sans bouton (`TachesView.tsx:277`) ; erreurs de sous-tâches qui ouvrent error.tsx |
| 10 | Aide et documentation | 3 | Aides contextuelles utiles (« Sera supprimée automatiquement… ») |
| **Total** | | **25/40** | **Correct, avec des trous nets en cohérence et en prévention** |

*Charge cognitive* : 3 échecs sur 8 (focus unique : titre + segmented + chips + recherche + carte d'ajout + FAB avant la première tâche ; hiérarchie visuelle : chaque carte porte le même poids d'actions ; choix minimaux : « Plus d'options » déplie 11 contrôles d'un coup). Points de décision > 4 options : rangée de chips (Toutes + N listes + réglages), panneau « Plus d'options » (11 champs), rangée d'une carte (coche, sous-tâches, poignée, Modifier, Suppr. et chaque pastille).

*Points forts*
- Saisie rapide sérieuse : Entrée = créer avec gestion IME/beforeinput (`AddTaskForm.tsx:205-244`), préchargement du chunk au pointerdown/idle (`preloadAddTaskForm.ts`), options repliées mais toujours soumises (`:385-389`).
- Coche optimiste avec file hors ligne et rollback (`TasksList.tsx:322-347`), `networkMode: "always"` justifié.
- Suppression de liste en deux temps avec compte exact et garde-fou de concurrence (`actions/taches.ts:643-736`).

*Constats UX*
- **Important — Aucun signal « en retard » sur les cartes.** `TasksList.tsx:467-475`. La vue par défaut est « Toutes » (`TachesView.tsx:95`) : une tâche en retard ressemble exactement à une tâche future. Recommandation : échéance relative (« Hier », « Demain », « En retard de 3 j ») en `warning` sous 1 jour et `alert` au-delà, conformément à la Graduated Alert Rule. `/impeccable clarify`.
- **Important — Actions de carte redondantes et coûteuses en place.** `TasksList.tsx:482-511`. « Modifier » et « Suppr. » sur chaque carte doublent la hauteur des lignes et mettent une action destructive à portée de pouce en permanence. Recommandation : tap sur la carte = éditer, suppression dans l'éditeur (ou par swipe avec annulation). `/impeccable distill`.
- **Mineur — État vide trompeur.** `TasksList.tsx:699-701` : « Aucune tâche pour l'instant. » s'affiche aussi pour « En retard » vide, alors que c'est une bonne nouvelle, et sans appel à l'action. `/impeccable onboard`.
- **Mineur — Deux points d'entrée d'ajout concurrents** (carte inline + FAB, `TachesView.tsx:263-270` et `:295-299`) : la carte pousse la liste vers le bas sans rien apporter de plus que le FAB. `/impeccable distill`.

*Red flags personas*
- **Casey (mobile, une main)** : ↑ ↓ × des sous-tâches d'environ 10px de large à 8px d'écart ; poignée de drag 32px en bas à gauche, loin du pouce droit ; « Gérer les listes » en haut à gauche en 36px.
- **Sam (accessibilité)** : onglet actif à 2,2:1 en thème sombre ; aucun anneau de focus sur le segmented, les chips ni les coches ; `aria-pressed` absent des onglets et des tags ; réordonnancement sans `KeyboardSensor` (poignée focalisable mais inopérante au clavier).
- **Vincent en cuisine** : hors ligne, cocher une sous-tâche fait tomber tout l'écran sur error.tsx ; vers minuit et demi, « Aujourd'hui » montre la veille ; une liste créée juste avant n'apparaît pas dans le formulaire d'ajout.

---

#### Module Agenda — `/agenda`

Fichiers couverts : `src/app/(app)/agenda/{page,loading,AgendaView,DayView,WeekView,MonthView,ListView,TimeGrid,TacheBlock,PeriodHeader,ArchivedTasksSection,useAgendaZoom,date-utils}.tsx|ts`, `src/lib/agenda/{compute,planning-travail}.ts`, `src/app/actions/planning-travail.ts` (lectures seulement ; `ajouterExceptionPlanningTravail` n'est pas utilisé par l'UI).

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 3 | Bon socle (`aria-pressed`, `aria-current="date"`, aria-labels riches sur les cases et les blocs, `--on-agenda` pour le contraste sombre) ; focus en `ring-agenda`, animations d'ArchivedTasksSection sans prise en compte de reduced-motion |
| 2 | Performance | 2 | 5 lectures via Server Actions sérialisées (dont 2 en `staleTime: 0`) ; chaque frame de pinch re-rend toute la vue Jour, TaskCard comprises |
| 3 | Responsive | 2 | Un pinch peut changer de jour ou de semaine ; grille imbriquée en 55vh ; Semaine au zoom 1 plus large que l'écran ; blocs de 18px |
| 4 | Theming | 2 | Couleur de module `agenda` utilisée comme couleur interactive (segmented, FAB, focus, « Aujourd'hui ») ; `carbs` pour la priorité ; `shadow-sm` ; puces `rounded` 4px |
| 5 | Intégrité d'implémentation | 3 | Code soigné et commenté ; problèmes isolés (support `defaultHeure` mort, FAB dupliqué au lieu de QuickAddFab) |
| **Total** | | **12/20** | **Acceptable** |

**Constats audit**

*Bloquant* : aucun.

*Important*
- **Un pinch-zoom peut déclencher un changement de période.** `AgendaView.tsx:202-251` (`gererToucheDebut/Move/Fin`), grille `DayView.tsx:100-105`, `WeekView.tsx:111-117`. Catégorie : Responsive / gestes. Impact : les handlers de swipe ne testent jamais `e.touches.length`. Au 2ᵉ doigt, `toucheDebutRef` est réécrit avec `touches[0]`, et `gererToucheMove` ne surveille que `touches[0]`. Au premier doigt levé, si c'est le second doigt, `changedTouches[0].clientX − debut.x` vaut l'écartement des doigts (souvent > 50px) : pour un pinch horizontal ou diagonal, la vue saute au jour ou à la semaine suivante ou précédente, en plus du zoom. En vue Jour, la grille n'a pas `data-swipe-ignore`. Recommandation : annuler le swipe dès qu'un touchstart ou touchmove a `touches.length > 1`, et ne réarmer qu'après le lever de tous les doigts. Commande : `/impeccable harden`.
- **Pinch : la vue Jour entière est re-rendue à chaque frame.** `useAgendaZoom.ts:118-132` (`setLiveZoom` par rAF) appelé dans `DayView.tsx:67`. Catégorie : Performance. Impact : chaque frame refiltre toutes les tâches (`DayView.tsx:55-64`), recalcule `layoutChevauchements` et re-rend toutes les `TaskCard` (non mémoïsées, framer-motion `layout`) sous la grille, alors que seule la grille dépend du zoom. Même chose en Semaine, avec 7 filtres complets par frame (`WeekView.tsx:127-132`). Recommandation : isoler la grille dans un sous-composant qui possède le zoom (ou appliquer le zoom live en `transform: scaleY` / variable CSS et ne committer qu'en fin de geste), `useMemo` pour les regroupements par jour, `memo(TaskCard)`. Commande : `/impeccable optimize`.
- **5 Server Actions sérialisées au chargement, dont 2 refetchées à chaque visite.** `AgendaView.tsx:78-104`. Catégorie : Performance. Impact : taches, listes, tags, planning et exceptions partent l'un après l'autre (voir la remarque Tâches). `staleTime: 0` sur les deux plannings relance la cascade à chaque montage. Recommandation : un endpoint GET agrégé pour l'agenda ; planning en `staleTime` court (≥ 60 s) plutôt que 0. Commande : `/impeccable optimize`.
- **Couleur de module utilisée comme couleur d'interaction : écart à la One Accent Rule non répercuté dans DESIGN.md.** Segmented `bg-agenda` (`AgendaView.tsx:298`), FAB `var(--accent-agenda)` (`:260`), anneau de focus `ring-agenda` (`TacheBlock.tsx:120`), lien « Aujourd'hui » `text-agenda underline` (`PeriodHeader.tsx:38-44`), jour courant `text-agenda`/`border-agenda` (`WeekView.tsx:146`, `MonthView.tsx:97`). Catégorie : Theming. Impact : DESIGN.md dit que les teintes de module « ne remplacent jamais le vert Kcal comme couleur interactive à l'intérieur d'un module ». Le token `--on-agenda` (`globals.css:21-26`) montre un choix délibéré, mais qui n'est pas documenté comme exception : le même segmented est vert ailleurs, jaune dans Tâches, bleu ici. Recommandation : trancher. Soit kcal partout (le bleu Agenda reste pour l'identité : NowLine, pastilles), soit une « Module Accent Exception » écrite dans DESIGN.md et appliquée à tous les modules. Commande : `/impeccable colorize`.
- **Tâches avant 05:00 invisibles dans la grille.** `TimeGrid.tsx:19` (`GRID_START_HOUR = 6`), `:56-58` (top négatif accepté), `DayView.tsx:112-120`. Catégorie : Intégrité. Impact : un rendez-vous à 04:30 (vol, départ tôt) n'a aucun bloc ni aucun repère dans la grille Jour/Semaine. La vue Jour le montre encore dans la liste en dessous, mais la vue Semaine n'en garde aucune trace. Recommandation : étendre la grille dynamiquement à la première heure du jour, ou afficher un repère « ↑ 1 tâche avant 6h » en haut. Commande : `/impeccable harden`.

*Mineur*
- **Grille Jour en scroll imbriqué `max-h-[55vh]`** (`DayView.tsx:102`) au-dessus de la liste des cartes : un pouce posé sur la grille la fait défiler au lieu de la page, et la liste n'est atteignable qu'en visant la marge. `/impeccable layout`.
- **Semaine au zoom par défaut plus large que l'écran** : 34 + 7×96 = 706px (`WeekView.tsx:118`, `useAgendaZoom.ts:15-17`). Sur un téléphone, on voit environ 3,5 jours et il faut défiler horizontalement ; le plancher « 7 jours tiennent » n'est atteignable qu'en pinçant. Recommandation : zoom initial = `computeMinZoomForWeekWidth` quand aucun zoom n'est mémorisé. `/impeccable adapt`.
- **Blocs de 18px minimum** (`TimeGrid.tsx:18`) : cible tactile trop petite pour une tâche de 30 min au zoom 0,35 à 0,6, surtout quand deux blocs se partagent la largeur (`TacheBlock.tsx:41-48`). `/impeccable adapt`.
- **Ombre et rayons hors système.** `shadow-sm` sur les blocs (`TacheBlock.tsx:78`, Single Shadow Rule) ; puces sans heure `rounded` 4px (`DayView.tsx:93`, `WeekView.tsx:162`) et `rounded-[3px]` (`MonthView.tsx:114`), contraires à l'Escalating Round Rule. `/impeccable polish`.
- **Priorité `bg-carbs/15` + `border-l-carbs`** (`TacheBlock.tsx:17-25`) : jaune Glucides réutilisé hors macros (Semantic-Only Macro Rule), même si le glyphe ● ▲ compense bien pour le daltonisme. `/impeccable colorize`.
- **Animations sans prise en compte de reduced-motion.** `ArchivedTasksSection.tsx:39-53` : hauteur animée par framer sans `useReducedMotion` (aucun `MotionConfig` global dans l'app) et chevron `transition-transform` sans `motion-reduce:`. `/impeccable animate`.
- **localStorage sans try/catch** (`useAgendaZoom.ts:35,139`) : une exception en navigation privée ou avec le stockage bloqué casse le rendu de la grille. `/impeccable harden`.
- **FAB Agenda recodé à la main** (`AgendaView.tsx:255-265`) au lieu de `QuickAddFab directTask` : pas de préchargement du formulaire (`AgendaView.tsx:34` en `dynamic` sans preload, d'où un premier tap en attente du chunk), pas de toast « Tâche créée », pas de surbrillance de la tâche créée (`:274-279`), pas d'anneau de focus. `/impeccable polish`.

**Critique UX**

*Verdict de spécificité design* : c'est le module le plus « authored » du périmètre. La bande « heures de travail » alimentée par planning-travail, les repères verts d'horaires précis dans la gouttière, le jour travaillé teinté dans le mois et le tap bloc → carte surlignée reflètent la vie réelle de Vincent. Deux choses cassent l'impression de système : la couleur interactive propre au module, et une vue Mois qui se contente de points génériques.

| # | Heuristique | Score | Problème clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | NowLine, titre de période, jour courant marqué ; la date sélectionnée n'est pas marquée dans la vue Mois |
| 2 | Correspondance avec le monde réel | 3 | « L M M J V S D » ambigu (deux M) ; flèches ← → en glyphes texte |
| 3 | Contrôle et liberté | 3 | Flèches, « Aujourd'hui », swipe ; la vue et la date retombent sur « Jour/aujourd'hui » à chaque visite |
| 4 | Cohérence et standards | 2 | Segmented bleu (vert ailleurs), FAB bleu (vert sur /taches), tap sur un bloc = surbrillance en Jour mais « ouvrir le jour » en Semaine |
| 5 | Prévention des erreurs | 2 | Changement de période accidentel au pinch ; tâches avant 5h invisibles |
| 6 | Reconnaissance plutôt que rappel | 2 | Mois : un seul point, que le jour ait 1 ou 8 tâches, sans titre ; Semaine : puces « sans heure » tronquées à 10px |
| 7 | Flexibilité et efficacité | 2 | Pas de tap sur un créneau vide pour créer à cette heure, alors que le formulaire le prévoit (`defaultHeure`, `AddTaskForm.tsx:138-143`, jamais passé par aucun appelant) |
| 8 | Esthétique et minimalisme | 3 | Grille sobre ; la vue Jour montre chaque tâche deux fois (bloc + carte complète) |
| 9 | Récupération d'erreur | 3 | Erreur explicite + bouton « Réessayer » (`AgendaView.tsx:315-321`) |
| 10 | Aide et documentation | 3 | Légende de la vue Mois, aria-labels descriptifs |
| **Total** | | **26/40** | **Correct** |

*Charge cognitive* : 2 échecs sur 8 (focus unique : la vue Jour empile en-tête, puces sans heure, grille et liste complète ; mémoire de travail : le Mois oblige à ouvrir chaque jour pour savoir ce qu'il contient). Aucun point de décision au-delà de 4 options (segmented à 4 vues, en-tête à 3 contrôles).

*Points forts*
- Gestes pensés sérieusement : `touch-action: pan-x pan-y` sur les grilles pour un pinch maison sans bloquer le scroll, swipe annulé après coup si la grille Semaine a défilé (`AgendaView.tsx:160-172`), zoom persistant via `useSyncExternalStore` sans mismatch d'hydratation.
- Accessibilité des blocs : texte `ink` sur fond teinté, priorité portée par un glyphe non chromatique + aria-label complet avec plage horaire (`TacheBlock.tsx:5-25`, `:105-114`).
- Intégration inter-modules réelle (planning-travail, gouttière avec horaires précis dédoublonnés sans collision, `TimeGrid.tsx:136-159`) : exactement la valeur produit décrite dans PRODUCT.md.

*Constats UX*
- **Important — Vue Mois pauvre en information.** `MonthView.tsx:102` : un point `bg-agenda` identique pour 1 ou 10 tâches, sans distinction de priorité ni de retard ; la date sélectionnée n'est pas indiquée. Recommandation : jusqu'à 3 points ou un compteur, point `alert` s'il y a une tâche haute ou en retard, anneau sur la date sélectionnée. `/impeccable clarify`.
- **Important — Pas de création depuis la grille.** Taper un créneau vide de la vue Jour ne fait rien (`DayView.tsx:108-121`). Le seul chemin est le FAB puis la saisie manuelle de l'heure, sous « Plus d'options » replié. Le support `defaultHeure` existe déjà côté formulaire. Recommandation : tap sur un créneau vide = modal avec `defaultEcheance` + `defaultHeure` arrondie au quart d'heure. `/impeccable shape`.
- **Mineur — Vue Liste sans ancrage sur aujourd'hui.** `ListView.tsx:40-64` : les groupes commencent à la plus ancienne date en retard, sans en-tête « En retard » ni défilement jusqu'à aujourd'hui ; toutes les TaskCard actives sont montées. `/impeccable layout`.
- **Mineur — Vue et date non conservées.** `AgendaView.tsx:107-108` : aucune synchronisation avec l'URL (`?vue=semaine&date=…`), donc retour arrière et rechargement reviennent toujours à Jour/aujourd'hui. `/impeccable harden`.

*Red flags personas*
- **Casey (mobile, une main)** : un pinch pour agrandir la grille fait sauter au jour suivant ; la Semaine s'ouvre plus large que l'écran et le swipe de semaine entre en concurrence avec le défilement horizontal ; blocs de 18px.
- **Sam (accessibilité)** : anneau de focus bleu `ring-agenda` sans `ring-offset` sur des blocs teintés en bleu (`bg-agenda/15`), donc peu distinguable ; animation de hauteur d'ArchivedTasksSection jouée malgré reduced-motion.
- **Vincent en cuisine** : pour noter « four à 18h30 », il faut FAB → « Plus d'options » → heure, au lieu de taper 18h30 dans la grille ; une tâche à 5h du matin n'apparaît pas dans la semaine.

---

#### Constats transverses observés

1. **Le segmented control n'est pas un composant partagé** : 3 réimplémentations divergentes (`TachesView.tsx:193-206` en `bg-carbs`, `AgendaView.tsx:285-308` en `bg-agenda` glissant, `AddTaskForm.tsx:562-575` en 4 couleurs), aucune conforme à DESIGN.md (`surface-alt` + actif `kcal`), une seule avec `aria-pressed`, aucune avec focus-visible. À extraire dans `lib/ui` ou `components/`.
2. **Couleurs sémantiques recyclées comme palette de priorité et d'état** : `carbs` (macro), `agenda` (module) et `alert` (dépassement/suppression) forment l'échelle basse/moyenne/haute dans 3 fichiers (`TasksList.tsx:59-64`, `AddTaskForm.tsx:79-84`, `TacheBlock.tsx:17-25`). Il faut une échelle de priorité documentée (glyphe + encre, `warning`/`alert` seulement pour le haut).
3. **Blanc sur accent en thème sombre** : `--accent-kcal` sombre (0,72 L) + texte blanc = **2,34:1** (calculé), ce qui touche `primaryButton` et les tags sélectionnés (`AddTaskForm.tsx:607`) partout. Agenda a résolu le problème pour son accent avec `--on-agenda` ; il manque un `--on-kcal` équivalent au niveau système (`globals.css`).
4. **Lectures via Server Actions + `useQuery`** (`getTachesAvecRelations`, `getListes`, `getTags`, `getPlanningTravail*`) : lectures sérialisées sur toutes les routes qui partagent ces clés (Tâches, Agenda, Dashboard, QuickAddFab, Notes).
5. **Actions serveur qui lèvent une exception appelées dans `startTransition` sans try/catch** : sous-tâches (`TasksList.tsx`), `reordonnerListes` (`ListesManager.tsx:110,124`), `deleteTag` (`TagsManager.tsx:25`). Toute erreur réseau mène à error.tsx. À l'inverse, `toggleTache`/`deleteTache` et `deleteListe` sont exemplaires : le bon patron existe déjà.
6. **Ids de formulaire codés en dur** dans tous les formulaires du périmètre (`AddTaskForm`, `AddListeForm`, `AddTagForm`) : pattern à remplacer par `useId()`.
7. **Carte d'ajout « + »** (dégradé + `boxShadow` ad hoc + titre Sora) copiée dans `AddTaskToggle`, `AddListeToggle` et `AddTagToggle` : à factoriser dans `addCardIcon`, sans seconde ombre.
8. **`aujourdhuiISO()` en UTC** (`lib/budget/compute.ts:205`) partagé entre modules, alors qu'Agenda utilise l'heure locale : « aujourd'hui » diverge entre `/taches` et `/agenda` entre minuit et 2h.
9. **`CheckToggle` sans anneau de focus** (`components/CheckToggle.tsx:46`) et `ghostButton`/`dangerButton` à environ 32px de haut : sous-dimensionnés dans toute l'app, bien au-delà de ce périmètre.


### 4.4 Habitudes, Objectifs, Courses

_Source : Assessment A (agent isolé, lecture du code)._

Méthode : lecture intégrale des fichiers du périmètre et des composants partagés importés (`ProgressRing`, `CheckToggle`, `AnimatedAddCard`, `useSwipeHorizontal`, `TabSwipeWrapper`, `lib/ui.ts`, `globals.css`). Pas de navigateur ni de détecteur (conformément au brief). Web Interface Guidelines de Vercel : pas récupérées (pas de WebFetch dans cet agent), j'applique les principes connus. Docs Next 16 absentes (`node_modules/next/dist/docs/` introuvable) : aucune API n'est déclarée dépréciée ici. Contrastes estimés à partir de L OKLCH (Y ≈ L³), valeurs approximatives.

---

#### Module Habitudes — `/habitudes`

Fichiers couverts : `habitudes/page.tsx`, `loading.tsx`, `HabitudesSkeleton.tsx`, `HabitudesView.tsx`, `AddHabitudeToggle.tsx`, `HabitudeForm.tsx`, `HabitudeCard.tsx`, `HistoriqueView.tsx`, `date-utils.ts`, `actions/habitudes.ts` (+ `components/ProgressRing.tsx`, `hooks/useSwipeHorizontal.ts`, `components/TabSwipeWrapper.tsx`).

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Blanc sur `bg-habitudes` ≈ 2,5:1 en sombre ; aucun focus-visible sur le segmented control ni sur la coche ; select et input sans label |
| 2 | Performance | 2 | Un an d'entrées pour **toutes** les habitudes, sans tri, soumis au plafond PostgREST de 1000 lignes |
| 3 | Responsive | 2 | Coche 34px, Modifier/Supprimer ~34px ; le swipe de l'historique déclenche aussi la navigation entre onglets |
| 4 | Theming | 2 | Couleur de module comme état actif interactif (One Accent Rule), 2e ombre inline |
| 5 | Intégrité | 2 | « Aujourd'hui » calculé en UTC côté serveur ; la série s'affiche à 0 tant que le jour n'est pas coché ; chemins d'erreur qui font planter la page |
| **Total** | | **10/20** | **Acceptable** |

**Constats audit**

*Important (P1)*
- **Le jour courant est calculé dans le fuseau du serveur** — `habitudes/page.tsx:12` (`toISODate(new Date())` après `connection()`). Catégorie : Intégrité. Impact : aucun `TZ` n'est configuré (pas de `vercel.json`, grep `Europe/Paris` vide), donc les fonctions Vercel tournent en UTC. Entre 0h et 2h (heure d'été à Paris), `today` vaut la veille : une habitude cochée à 0h30 est enregistrée sur le mauvais jour, et la série est faussée. Même effet dans une PWA restée ouverte après minuit : `today` est figé dans les props. Reco : calculer la date côté client (`toISODate(new Date())` dans `HabitudesView`), ou la passer via un cookie de fuseau ; la recalculer au retour au premier plan (`visibilitychange`). → `/impeccable harden`
- **Toute la série disparaît chaque matin** — `actions/habitudes.ts:143-156` (`calculerStreak` part de `date`, donc d'aujourd'hui, et s'arrête au premier jour vide) combiné à `HabitudeCard.tsx:153` (`streak > 0`). Catégorie : Intégrité/UX. Impact : tant que l'habitude du jour n'est pas cochée, le 🔥 disparaît. Une série de 30 jours semble perdue au réveil, ce qui démotive au lieu de rappeler. Reco : si aujourd'hui n'a pas d'entrée, partir d'hier (série « en cours, à prolonger ») et afficher l'état « à faire aujourd'hui ». → `/impeccable harden`
- **Historique des séries tronqué sans avertissement** — `actions/habitudes.ts:174-184`. Catégorie : Performance/Intégrité. Impact : dès qu'une habitude de type série existe, la requête ramène 365 jours d'entrées pour **toutes** les habitudes (`idsAJour`), sans `order` ni pagination. Le plafond Supabase par défaut est de 1000 lignes, soit environ 3 habitudes quotidiennes sur un an. Au-delà, le tronquage est arbitraire : l'entrée du jour peut manquer (l'habitude apparaît non cochée) et les séries sont raccourcies. Reco : limiter l'historique aux `streakIds`, trier par `date desc` et borner, ou faire calculer la série en SQL ; faire une requête séparée pour les entrées du jour. → `/impeccable optimize`
- **Deux actions sans gestion d'erreur remontent à l'error boundary** — `HabitudeCard.tsx:95-102` (`enregistrerValeur`, aucun try/catch ni file hors-ligne, contrairement au toggle) et `:104-116` (`supprimer` relance les erreurs non réseau). Catégorie : Intégrité. Impact : une erreur levée dans une transition React 19 remonte à `(app)/error.tsx`. Une saisie quantifiée hors connexion remplace donc l'écran par la page d'erreur. Reco : même patron que `toggleMutation` (useMutation, `enqueueAction`, toast). → `/impeccable harden`
- **Le swipe de mois déclenche aussi la navigation entre onglets** — `HistoriqueView.tsx:84-88` (handlers tactiles sans `stopPropagation`), `components/TabSwipeWrapper.tsx:20,54` (seul `/agenda` est exclu), `lib/navigation/registry.ts:20` (`/habitudes` est épinglé par défaut, en dernière position). Catégorie : Responsive. Impact : swiper vers le mois précédent (le geste naturel pour consulter un historique) change le mois **et** navigue vers /taches. Reco : ajouter `/habitudes` à `ROUTES_SWIPE_INTERNE`, ou `stopPropagation` sur la zone calendrier (comme `JournalEntriesList.tsx:62`). → `/impeccable harden`
- **Cibles tactiles trop petites sur l'action principale** — `HabitudeCard.tsx:128-135` (bouton de coche = anneau de 34×34px) et `:179-185` (`ghostButton`/`dangerButton` d'environ 34px, espacés de 8px). Catégorie : Responsive. Impact : cocher est l'action la plus fréquente du module, faite à une main. Supprimer se trouve à 8px de Modifier. Reco : zone de tap de 44px minimum sur la coche (hitSlop comme `CheckToggle`, ou toute la ligne), et sortir Modifier/Supprimer de la vue au repos. → `/impeccable adapt`
- **Segmented control hors système** — `HabitudesView.tsx:45-64`. Catégorie : Theming (One Accent Rule). Impact : l'onglet actif est en `bg-habitudes` (`:56`) avec du texte blanc (`:60`), ce qui fait environ 2,5:1 en sombre (`--accent-habitudes` L 0,72), le même défaut que celui corrigé pour l'agenda avec `--on-agenda` (`globals.css:19-24`). Le conteneur est en `bg-surface` au lieu de `surface-alt`, et il n'y a ni `aria-pressed`/`role="tab"` ni focus-visible. Reco : repasser sur le motif DESIGN (piste `surface-alt`, actif `bg-kcal`, texte blanc) et ajouter un état ARIA. → `/impeccable polish`

*Mineur (P2)*
- **Historique chargé sans erreur ni état de chargement** — `HistoriqueView.tsx:46-57`. Le `.then` n'a pas de `catch` (rejet non géré, calendrier vide sans explication). Les `entries` de l'habitude précédente restent affichées pendant le chargement d'une autre habitude sur le même mois, donc la heatmap est momentanément fausse. De plus, `habitudeId` est initialisé une seule fois (`:32`) : si la vue est ouverte pendant le chargement, il reste à `""` et le calendrier ne s'affiche pas. Reco : useQuery avec la clé `[habitudeId, mois]`. → `/impeccable harden`
- **Contrôles sans nom accessible** — select d'habitude `HistoriqueView.tsx:70-81`, input quantifié `HabitudeCard.tsx:160-169`. Reco : `aria-label`. → `/impeccable harden`
- **Flèches de mois à ~34px** — `HistoriqueView.tsx:96-120` utilise `ghostButton` alors que `navArrowButton` (`lib/ui.ts:356`, 44×44) existe précisément pour ce cas. → `/impeccable adapt`
- **Heatmap lisible par la couleur seulement, contraste insuffisant en sombre** — `HistoriqueView.tsx:139-156`. Il n'y a aucune alternative textuelle (seulement `title={iso}`), et `text-ink` clair sur le mélange à 85 % donne environ 3:1 en sombre. Reco : `aria-label` avec la valeur, et une encre adaptée sur les cellules pleines. → `/impeccable colorize`
- **La saisie quantifiée n'a ni feedback ni garde** — `HabitudeCard.tsx:166`. Le blur envoie une écriture même si la valeur n'a pas changé, un champ vidé enregistre 0, et rien ne confirme l'enregistrement. → `/impeccable clarify`
- **Messages Supabase bruts affichés** — `actions/habitudes.ts:78,97` (`error.message`). → `/impeccable clarify`
- **Dropdown au lieu du segmented control pour le type** — `HabitudeForm.tsx:50-62` (3 options). DESIGN.md indique « jamais de radio ou dropdown à sa place ». → `/impeccable polish`

**Critique UX**

*Spécificité design* : l'anneau-bouton qui se remplit et la heatmap mensuelle donnent une vraie identité, cohérente avec l'anneau calorique de Nutrition. Mais la carte reste générique (nom + Modifier/Supprimer permanents), et le module contredit son propre système : pilule orange, dropdown. La promesse d'une série motivante est sabotée par la logique de calcul.

| # | Heuristique | Score | Constat |
|---|---|---|---|
| 1 | Visibilité de l'état | 2 | Saisie quantifiée sans confirmation ; série masquée tant que le jour n'est pas coché |
| 2 | Correspondance au réel | 3 | Libellés clairs (« Fait / pas fait », « Série ») |
| 3 | Contrôle et liberté | 2 | Coche réversible, mais archivage via `confirm` sans annulation (Courses en a une) |
| 4 | Cohérence et standards | 2 | Actif orange au lieu du vert, dropdown au lieu du segmented, « Supprimer » ici mais « Suppr. » ailleurs |
| 5 | Prévention des erreurs | 2 | Mauvais jour après minuit, 0 enregistré sur un champ vidé |
| 6 | Reconnaissance plutôt que rappel | 3 | Heatmap, icône, unité visible |
| 7 | Flexibilité | 2 | Pas de saisie rapide +1 pour les habitudes quantifiées |
| 8 | Esthétique minimaliste | 2 | Deux boutons d'édition par carte, aussi lourds que le nom |
| 9 | Récupération d'erreurs | 1 | « Réessaie. » sans bouton, messages Supabase bruts, page d'erreur sur saisie hors ligne |
| 10 | Aide | 2 | Pas d'explication de la série |
| **Total** | | **21/40** | **Acceptable** |

Charge cognitive : 2/8 échecs (hiérarchie visuelle : les actions secondaires pèsent autant que l'entité ; divulgation progressive : édition et suppression toujours visibles). Aucun point de décision au-delà de 4 options, sauf le select d'historique si les habitudes sont nombreuses.

Points forts :
- Coche optimiste avec rollback, vibration et file hors ligne (`HabitudeCard.tsx:34-67`). Tap instantané.
- Suppression non destructive : c'est un archivage, l'historique est conservé (`actions/habitudes.ts:103-114`).
- `prefers-reduced-motion` respecté dans ce module (`HabitudeCard.tsx:120-124`, `HabitudesView.tsx:26-28`).

Constats UX
- *P1* **Pas de motivation au quotidien** : combinaison du problème de série et de l'absence d'indicateur « X/Y faites aujourd'hui ». Reco : ajouter un résumé du jour en tête de liste et une série « à prolonger ». → `/impeccable delight`
- *P2* **Carte surchargée** : Modifier/Supprimer permanents (`HabitudeCard.tsx:179-186`). Reco : les passer derrière un appui long ou un menu « ⋯ », ou ne les montrer qu'en mode édition de liste. → `/impeccable distill`
- *P2* **Aucun retour à « ce mois-ci »** dans l'historique, et navigation illimitée vers le futur (`HistoriqueView.tsx:110-120`). → `/impeccable polish`

Red flags personas :
- **Casey (une main)** : une coche de 34px avec, juste en dessous, Supprimer à 34px, et le swipe vers le mois précédent qui fait quitter l'écran.
- **Sam (accessibilité)** : les boutons de vue n'annoncent pas leur état (pas d'`aria-pressed`), la heatmap n'est lisible que par la couleur, et le select d'historique n'a pas de nom.
- **Vincent en cuisine** (verre d'eau à 0h15, doigts mouillés) : l'entrée part sur la veille, et la valeur quantifiée ne s'enregistre qu'au blur, sans confirmation visible.

---

#### Module Objectifs — `/objectifs` et `/objectifs/[id]`

Fichiers couverts : `objectifs/page.tsx`, `loading.tsx`, `ObjectifsList.tsx`, `ObjectifCard.tsx`, `AddObjectifToggle.tsx`, `ObjectifForm.tsx`, `date-utils.ts`, `[id]/page.tsx`, `[id]/loading.tsx`, `ObjectifHeader.tsx`, `ObjectifSuiviBinaire.tsx`, `ObjectifSuiviValeur.tsx`, `ObjectifSuiviEtapes.tsx`, `actions/objectifs.ts` (+ `components/CheckToggle.tsx`).

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Select de statut et champ d'étape sans label ; animations framer sans reduced-motion |
| 2 | Performance | 2 | Détail 100 % client : double skeleton de formes différentes, aucune réutilisation du cache de la liste |
| 3 | Responsive | 2 | Étapes : ↑/↓/Suppr. d'environ 28px et coche de 28px ; ligne date + valeur + bouton probablement trop large |
| 4 | Theming | 3 | Tokens respectés, sauf la coche en `accent-objectifs` et l'ombre inline de l'add card |
| 5 | Intégrité | 2 | Valeur vide enregistrée à 0 ; progression fausse pour un objectif à la baisse ; changement de statut sans gestion d'erreur |
| **Total** | | **11/20** | **Acceptable** |

**Constats audit**

*Bloquant (P0)*
- **Un champ vide enregistre silencieusement 0** — `[id]/ObjectifSuiviValeur.tsx:100-101` (`Number("")` vaut 0, qui est fini) et `actions/objectifs.ts:283`, qui n'accepte que `Number.isFinite`. Catégorie : Intégrité (perte de données). Impact : taper « Enregistrer » sans valeur, ou après avoir changé de date, écrase la valeur du jour par 0 (upsert). La courbe plonge et la progression repasse à 0 %. Aucune entrée ne peut être supprimée ensuite ; il faut ressaisir. Reco : refuser une chaîne vide côté client et côté serveur, et désactiver le bouton tant que le champ est vide. → `/impeccable harden`

*Important (P1)*
- **La progression est fausse pour un objectif à la baisse** — `ObjectifSuiviValeur.tsx:94-97` (`dernière / cible`, plafonné à 1). Catégorie : Intégrité. Impact : le placeholder suggère « kg » (`ObjectifForm.tsx:140`) et l'objectif produit n°1 de Vincent est la perte de poids. Avec une cible à 80 kg et un poids actuel de 92 kg, la barre est pleine à 100 %. Reco : stocker une valeur de départ, ou prendre la première entrée comme référence, et calculer `(départ − actuel)/(départ − cible)`. → `/impeccable harden`
- **Changement de statut sans gestion d'erreur** — `[id]/ObjectifHeader.tsx:111-116` (`await` dans `startTransition`, sans try/catch). Catégorie : Intégrité. Impact : un échec serveur ou réseau remonte à l'error boundary et la page est remplacée. Reco : useMutation optimiste avec toast, comme `ObjectifSuiviBinaire`. → `/impeccable harden`
- **Étapes : cibles de 28px entassées** — `[id]/ObjectifSuiviEtapes.tsx:131` (`hitSlop={3}` donne une coche de 28px) et `:136-161` (↑, ↓ et Suppr. en `px-2 py-1`, environ 28px chacun, 4 cibles sur une ligne de 375px). Catégorie : Responsive. Impact : cocher une étape est l'action principale, et Suppr. se trouve à 8px de ↓. Reco : espacer les lignes (gap-3 ou plus) pour remonter le hitSlop à 11 ; ranger la réorganisation et la suppression dans un mode édition ou un swipe. → `/impeccable adapt`
- **Couleur de module sur un contrôle interactif** — `ObjectifSuiviEtapes.tsx:127` (`color="var(--accent-objectifs)"` sur `CheckToggle`). Catégorie : Theming (One Accent Rule). Reco : laisser la valeur par défaut `--accent-kcal` de `CheckToggle`. → `/impeccable polish`

*Mineur (P2)*
- **Double skeleton de formes différentes** — `[id]/loading.tsx:10-23` affiche le lien retour et les boutons, puis la page client (`[id]/page.tsx:34-47`) affiche un skeleton **sans** lien retour. Le contenu saute deux fois. Le titre, déjà dans le cache `queryKeys.objectifs`, n'est pas réutilisé (`initialData`/`placeholderData`), ce qui prive aussi le morph `viewTransitionName` d'une cible immédiate. → `/impeccable optimize`
- **Ligne de saisie probablement trop large sur mobile** — `ObjectifSuiviValeur.tsx:134-164`. Deux `flex-1` contiennent des inputs sans `min-w-0`/`w-full` (taille intrinsèque d'un input date ou number d'environ 170px), plus le bouton, dans une carte d'environ 311px utiles. Même motif dans `ObjectifForm.tsx:66-96` (select + date). Non vérifié au rendu. Reco : `min-w-0` sur les colonnes, ou empiler les champs. → `/impeccable adapt`
- **Courbe trompeuse** — `ObjectifSuiviValeur.tsx:30-34` place les points par index et non par date, donc des mesures irrégulières paraissent régulières. La ligne cible en `var(--line)` (`:53`) est quasi invisible, il n'y a ni valeurs ni axes, et l'`aria-label` est générique. → `/impeccable polish`
- **Aucune entrée consultable ni supprimable** — `ObjectifSuiviValeur.tsx` n'affiche que la courbe, aucune liste des mesures. → `/impeccable harden`
- **Pas de confirmation après « Enregistrer »**, et le bouton est un `ghostButton` d'environ 34px (`:161`) pour l'action principale de l'écran. → `/impeccable clarify`
- **Échec d'ajout d'étape : le texte saisi est perdu** — `ObjectifSuiviEtapes.tsx:77-81` (`setTitre("")` exécuté aussi dans le catch). → `/impeccable harden`
- **Un seul toggle en cours bloque toutes les coches** — `ObjectifSuiviEtapes.tsx:125` (`toggleMutation.isPending` est partagé par toutes les lignes). → `/impeccable harden`
- **Reduced-motion ignoré** — `ObjectifCard.tsx:60-66,87-93` (framer `layout`, translation en y, sans `useReducedMotion`, contrairement à `HabitudeCard`), et aucun `MotionConfig` global (grep vide). → `/impeccable animate`
- **Labels manquants** — select de statut (`ObjectifHeader.tsx:108`), champ « Nouvelle étape » avec placeholder seul (`ObjectifSuiviEtapes.tsx:168-174`). → `/impeccable harden`
- **Dropdowns au lieu de segmented** — catégorie à 2 options (`ObjectifForm.tsx:71-82`), mode de suivi à 3 (`:102-114`), statut à 3 (`ObjectifHeader.tsx:108-124`). → `/impeccable polish`

**Critique UX**

*Spécificité design* : la page détail qui s'adapte au mode de suivi (valeur, étapes, binaire) est une bonne idée produit. Mais la liste est un empilement générique de cartes titre + pastille « Valeur » + Modifier/Suppr., qui ne dit rien de l'avancement. Pour un module censé montrer un cap, rien ne rend la progression visible depuis la liste.

| # | Heuristique | Score | Constat |
|---|---|---|---|
| 1 | Visibilité de l'état | 2 | Aucune progression dans la liste ; aucune confirmation d'enregistrement de valeur |
| 2 | Correspondance au réel | 2 | Progression inversée pour la perte de poids ; la pastille « Valeur » est du jargon interne |
| 3 | Contrôle et liberté | 2 | Pas de suppression d'une mesure ; suppression d'objectif sans annulation |
| 4 | Cohérence et standards | 2 | « Modifier » dans la liste mais « Éditer » dans le détail ; « Suppr. » ; statut modifiable par deux contrôles (select + bouton binaire) |
| 5 | Prévention des erreurs | 1 | 0 écrit sur un champ vide ; `valeur_cible` facultative en mode « Valeur cible + courbe » (`ObjectifForm.tsx:117-131`) |
| 6 | Reconnaissance | 2 | Il faut ouvrir chaque objectif pour connaître son avancement |
| 7 | Flexibilité | 2 | Réordonnancement étape par étape uniquement |
| 8 | Esthétique | 3 | Écrans détail sobres ; liste encombrée par les objectifs atteints ou abandonnés |
| 9 | Récupération d'erreurs | 2 | Toasts sur les étapes, mais crash sur le statut, texte perdu, « Réessaie. » sans bouton |
| 10 | Aide | 2 | Libellés des modes de suivi explicites dans le formulaire, rien d'autre |
| **Total** | | **20/40** | **Acceptable** |

Charge cognitive : 3/8 échecs (hiérarchie visuelle : la pastille de type plutôt que la progression ; divulgation progressive : atteints et abandonnés toujours dépliés, `ObjectifsList.tsx:42-57` ; mémoire de travail : il faut se souvenir de l'avancement de chaque objectif). Point de décision : une ligne d'étape présente 4 cibles (coche, ↑, ↓, Suppr.), à la limite. Le formulaire compte 6 à 7 champs.

Points forts :
- Suivi adapté au type (`[id]/page.tsx:68-74`), avec des coches d'étapes et un toggle binaire optimistes et réversibles.
- Morph du titre liste → détail (`ObjectifCard.tsx:97` / `ObjectifHeader.tsx:67`).
- `getObjectif` parallélise étapes et entrées (`actions/objectifs.ts:169-181`).

Constats UX
- *P1* **La liste ne montre pas l'avancement** — `ObjectifCard.tsx:95-108`, où la pastille affiche `TYPE_SUIVI_LABELS`. Reco : remplacer la pastille par une mini-barre ou un « 3/7 étapes » / « 84 → 80 kg », et signaler les échéances dépassées. → `/impeccable layout`
- *P2* **Objectifs terminés toujours dépliés** avec leurs boutons d'édition. Reco : replier « Atteints » et « Abandonnés » (même motif que les articles archivés de Courses). → `/impeccable distill`
- *P2* **Titre du détail tronqué sans recours** — `ObjectifHeader.tsx:68` (`truncate`). Reco : `line-clamp-2`. → `/impeccable typeset`

Red flags personas :
- **Casey (une main)** : dans le détail d'un objectif à étapes, 4 cibles de 28px par ligne, avec Suppr. collé à ↓.
- **Sam (accessibilité)** : le statut est un select sans nom, le champ « Nouvelle étape » n'a que son placeholder, et les animations de liste ignorent reduced-motion.
- **Vincent (pesée le matin)** : il saisit 92 kg pour une cible de 80 kg et voit la barre pleine à 100 %. S'il tape « Enregistrer » avant d'avoir saisi le chiffre, la mesure du jour passe à 0.

---

#### Module Courses — `/courses`

Fichiers couverts : `courses/page.tsx`, `loading.tsx`, `CoursesView.tsx`, `CoursesList.tsx`, `AddCourseToggle.tsx`, `AddCourseForm.tsx`, `CourseItemRow.tsx`, `ArchivedCoursesSection.tsx`, `undo.ts`, `lib/courses/compute.ts`, `actions/courses.ts` (+ `CheckToggle`, `AnimatedAddCard`).

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 3 | Combobox ARIA soignée, mais le champ n'a pas de nom ; coche et renommage sans focus-visible ; reduced-motion ignoré |
| 2 | Performance | 3 | Optimiste partout ; réactivations en UPDATE séquentiels ; dépliage animé en `height` |
| 3 | Responsive | 3 | Coche et Suppr. à 44px ; en-tête « Articles archivés » et « Vider les cochés » d'environ 30 à 34px |
| 4 | Theming | 3 | Coche en `accent-courses` ; input de renommage en `rounded-lg` (8px) |
| 5 | Intégrité | 3 | Robuste (dédoublonnage, ids temporaires, annulation, file hors ligne) ; quelques coutures |
| **Total** | | **15/20** | **Bon** |

**Constats audit**

*Important (P1)*
- **Couleur de module sur la coche** — `CourseItemRow.tsx:222` (`color="var(--accent-courses)"`). Catégorie : Theming (One Accent Rule). Impact : c'est l'action la plus fréquente du module, colorée violet. En sombre, la coche blanche sur `--accent-courses` (L 0,72) fait environ 2,5:1, en dessous des 3:1 requis pour un élément graphique. Reco : laisser le défaut `--accent-kcal`. → `/impeccable polish`

*Mineur (P2)*
- **Le champ d'ajout n'a pas de nom accessible** — `AddCourseForm.tsx:263-282` (`role="combobox"`, placeholder seul, ni `aria-label` ni `<label>`). → `/impeccable harden`
- **Cibles sous 44px dans la section archivée** — dépliage en `py-1` (`ArchivedCoursesSection.tsx:84-97`), environ 30px ; « Vider les cochés » en `ghostButton` d'environ 34px (`:98-105`). → `/impeccable adapt`
- **Reduced-motion ignoré** — `CourseItemRow.tsx:208-214` (layout et y), `ArchivedCoursesSection.tsx:109-115` (animation de `height`, une propriété de layout), `CheckToggle.tsx:57-69` (pop de scale). → `/impeccable animate`
- **Pas d'anneau de focus** — renommage en `outline-none` avec seulement `focus:border` (`CourseItemRow.tsx:239`), `CheckToggle` sans `focus-visible`. Le même `:239` utilise `rounded-lg` (8px, Escalating Round Rule qui fixe 12px minimum). → `/impeccable polish`
- **Réactivations séquentielles** — `actions/courses.ts:133-140` : un UPDATE par article réactivé, donc N allers-retours pour un collage de 10 habituels. Reco : un seul `upsert` ou une RPC. → `/impeccable optimize`

**Critique UX**

*Spécificité design* : c'est le module le plus abouti du périmètre, et il est pensé pour le magasin. On peut ajouter plusieurs articles avec aperçu (« 3 articles : … »), le clavier reste ouvert entre les ajouts, les habituels sont suggérés, un article déjà présent est réactivé plutôt que dupliqué, la suppression propose une annulation, et le tout fonctionne hors ligne. C'est authentiquement taillé pour Vincent, loin d'une todo-list générique.

| # | Heuristique | Score | Constat |
|---|---|---|---|
| 1 | Visibilité de l'état | 3 | Statut inline après ajout, compteur « à prendre », « En attente de synchro » ; mais un article coché disparaît de la vue |
| 2 | Correspondance au réel | 3 | « Tout est dans le chariot ! », mais trois termes coexistent : archivés, cochés, chariot |
| 3 | Contrôle et liberté | 3 | Annulation sur suppression et vidage, Échap au renommage ; pas d'annulation sur une coche |
| 4 | Cohérence | 3 | « Suppr. » partout ; « Fermer » au lieu d'« Annuler », justifié |
| 5 | Prévention des erreurs | 3 | Dédoublonnage, plafonds, garde sur les ids temporaires ; mais taper sur le libellé ouvre le renommage |
| 6 | Reconnaissance | 3 | Suggestions d'habituels ; historique limité aux articles cochés |
| 7 | Flexibilité | 4 | Ajout multiple, collage multiligne, flèches du clavier, suggestion en un tap |
| 8 | Esthétique | 3 | Liste épurée ; carte d'ajout lourde une fois ouverte |
| 9 | Récupération d'erreurs | 3 | Rollback ciblé, texte restauré si l'ajout échoue (`AddCourseForm.tsx:138`) |
| 10 | Aide | 3 | Placeholder « Ex. lait, œufs, pain » et aperçu du découpage |
| **Total** | | **31/40** | **Bon** |

Charge cognitive : 1/8 échec (regroupement : « Vider les cochés » sur l'en-tête d'une section intitulée « archivés », deux noms pour un même ensemble). Aucun point de décision au-delà de 4 options (suggestions plafonnées à 4, `compute.ts:216`).

Points forts :
- Saisie en rafale : champ vidé à la soumission, refocus, `onPointerDown` qui empêche le clavier de se fermer (`AddCourseForm.tsx:190-197,340`).
- Annulation robuste même après démontage du composant (`undo.ts:9-16`), restauration idempotente côté serveur (`actions/courses.ts:163-187`).
- Cibles de 44px assumées là où ça compte : coche via le hitSlop par défaut, `min-h-11` sur Suppr. et sur les suggestions.

Constats UX
- *P1* **Taper sur le libellé ouvre le renommage** — `CourseItemRow.tsx:249-259`. La plus grande zone de la ligne (min-h 44px, pleine largeur) ouvre l'édition avec le clavier. Dans un magasin, le réflexe est de taper sur la ligne pour cocher. Chaque tap à côté du rond fait surgir le clavier en plein rayon. Reco : taper la ligne coche ; le renommage passe par un appui long ou un bouton dédié. → `/impeccable adapt`
- *P2* **Un article coché quitte la vue sans possibilité d'annuler** — il bascule dans la section archivée, repliée (`compute.ts:10-18`, `ArchivedCoursesSection.tsx:26`). Une coche par erreur fait disparaître l'article. Reco : garder l'article barré à sa place quelques secondes, ou afficher un toast « Annuler » comme pour la suppression. → `/impeccable harden`
- *P2* **« Vider les cochés » efface aussi la mémoire des habituels** — les suggestions viennent **uniquement** des articles archivés (`compute.ts:203-225`), que `deleteCourseItems` supprime. La conséquence n'est pas dite, et le vocabulaire flotte entre archivés et cochés (`ArchivedCoursesSection.tsx:90,104`). Reco : unifier le libellé (« Dans le chariot »), et soit conserver l'historique des suggestions séparément, soit expliciter l'effet. → `/impeccable clarify`

Red flags personas :
- **Casey (une main, chariot dans l'autre)** : un tap sur le libellé ouvre le clavier au lieu de cocher. « Vider les cochés » et le dépliage sont sous 44px.
- **Sam (accessibilité)** : le combobox d'ajout n'a pas de nom, et le rond de coche n'a pas d'anneau de focus au clavier.
- **Vincent en cuisine / au magasin** : il coche le mauvais article, qui disparaît dans la section repliée sans annulation. Après avoir vidé les cochés, il perd les suggestions d'habituels qu'il utilise pour la liste suivante.

---

#### Constats transverses observés

1. **Couleurs de module utilisées comme couleur interactive (One Accent Rule, P1)** : `HabitudesView.tsx:56` (segment actif), `HabitudeCard.tsx:128,139` (anneau-bouton), `ObjectifSuiviEtapes.tsx:127` et `CourseItemRow.tsx:222` (`CheckToggle`). En sombre, les teintes module à L 0,72 ne supportent pas le blanc : c'est le même problème que celui déjà résolu pour l'agenda avec `--on-agenda`.
2. **Carte d'ajout avec une 2e ombre et un dégradé inline, copiés à l'identique** : `AddHabitudeToggle.tsx:17-21`, `AddObjectifToggle.tsx:17-21`, `AddCourseToggle.tsx:17-21` (`boxShadow: 0 3px 8px …`). Cela viole la Single Shadow Rule, et le style n'est pas factorisé dans `addCardIcon` (`lib/ui.ts:346`). Impact utilisateur faible, mais c'est une dérive du système.
3. **Bouton « Annuler »/« Fermer » en texte souligné**, sans focus-visible, d'environ 20px de haut : `AddHabitudeToggle.tsx:41`, `HabitudeCard.tsx:79-85`, `AddObjectifToggle.tsx:41`, `ObjectifCard.tsx:75-81`, `ObjectifHeader.tsx:52`, `AddCourseToggle.tsx:40`. Reco : un `secondaryButton` ou un `linkButton` avec cible de 44px.
4. **`ghostButton`/`dangerButton` d'environ 34px utilisés comme actions de ligne** (Modifier/Supprimer/Suppr./flèches) dans Habitudes et Objectifs. Courses corrige localement avec `min-h-11` (`CourseItemRow.tsx:276`). Il faudrait une variante de ligne partagée plutôt que des surcharges au cas par cas.
5. **Framer-motion sans reduced-motion** hors Habitudes (`ObjectifCard`, `CourseItemRow`, `ArchivedCoursesSection`, `CheckToggle`) et sans `MotionConfig reducedMotion="user"` global. DESIGN.md demande pourtant de neutraliser globalement plutôt que composant par composant.
6. **États d'erreur sans action** : « Erreur de chargement … Réessaie. » sans bouton (`HabitudesView.tsx:75`, `ObjectifsList.tsx:84`, `CoursesList.tsx:20`, `[id]/page.tsx:55-57`). Le pull-to-refresh existe, mais rien ne le signale.
7. **`startTransition(async …)` sans try/catch** qui remonte à `(app)/error.tsx` : `HabitudeCard.tsx:98-101`, `ObjectifHeader.tsx:112-115`. Le patron sûr (useMutation, toast, file hors ligne) existe déjà dans les mêmes fichiers et n'est pas appliqué partout.
8. **Dropdowns à la place du segmented control** (motif DESIGN) sur 4 choix à 2 ou 3 options : `HabitudeForm.tsx:50`, `ObjectifForm.tsx:71,102`, `ObjectifHeader.tsx:108`. **Contrôles sans nom accessible** : `HistoriqueView.tsx:70`, `HabitudeCard.tsx:160`, `ObjectifHeader.tsx:108`, `ObjectifSuiviEtapes.tsx:168`, `AddCourseForm.tsx:263`.
9. **Suppression incohérente entre modules** : `window.confirm` sans annulation (Habitudes, Objectifs, étapes) contre suppression immédiate avec toast « Annuler » (Courses). Libellés « Supprimer » (`HabitudeCard.tsx:184`) ou « Suppr. » (Objectifs, Courses). Le patron Courses est le bon à généraliser.
10. **Lectures via Server Actions** utilisées en `queryFn` (`getHabitudesDuJour`, `getObjectifs`, `getObjectif`, `getCoursesItems`, `getHistoriqueHabitude`), avec des `revalidatePath` devenus inutiles de l'aveu même des commentaires (`ObjectifSuiviValeur.tsx:70-76`, `ObjectifSuiviEtapes.tsx:24-29`). À vérifier sur Next 16 (docs locales absentes) : historiquement, les Server Actions d'un même client sont exécutées en série, donc une lecture peut attendre derrière une écriture en cours.
11. **Dates « du jour » fragiles** : jour calculé sur le serveur en UTC (`habitudes/page.tsx:12`) ; `calculerStreak` et `uneAnneeAvant` utilisent `toISOString()` sur un minuit local (`actions/habitudes.ts:148,177`), ce qui décale d'un jour sur un serveur non UTC (`next dev` en local à Paris). Objectifs, lui, calcule la date côté client (`ObjectifSuiviValeur.tsx:88`), ce qui est correct.
12. **Texte `ink-3` sur `surface`** (sous-titres des cartes d'ajout, `AddHabitudeToggle.tsx:27` et équivalents) : environ 3,4:1 à 12px, sous l'AA. C'est un problème du jeton lui-même, à traiter au niveau du design system.


### 4.5 Budget

_Source : Assessment A (agent isolé, lecture du code)._

Périmètre : `/budget` + `/budget/transactions`, `/budget/comptes`, `/budget/categories`, `/budget/recurrentes`, `/budget/statistiques`, `/budget/calendrier`, `src/lib/budget/compute.ts`, actions `budgets.ts`, `comptes.ts`, `categories-budget.ts`, `transactions.ts`, `transactions-recurrentes.ts`. Lecture seule, aucun fichier du repo modifié. Détecteur non exécuté (réservé à B). Les Web Interface Guidelines de Vercel ont bien été récupérées (le réseau a fonctionné). Les numéros de ligne ont été vérifiés dans le code ; les chemins de route sont relatifs à `src/app/(app)/budget/`.

---

#### Module Budget — `/budget` (+ 6 sous-routes)

Fichiers couverts : `page.tsx`, `requete.ts`, `PeriodeNavigation.tsx`, `transactions/*` (7), `comptes/*` (4), `categories/*` (8), `recurrentes/*` (6), `statistiques/*` (4), `calendrier/page.tsx`, `src/lib/budget/compute.ts`, `src/app/actions/{budgets,comptes,categories-budget,transactions,transactions-recurrentes}.ts`, et les dépendances partagées lues : `lib/ui.ts`, `lib/confirm.ts`, `components/AnimatedAddCard.tsx`, `(app)/error.tsx`, `(app)/layout.tsx`, `TabSwipeWrapper.tsx`, les migrations `scripts/migration-budget-*.sql`.

##### Audit technique

| # | Dimension | Score | Constat clé |
|---|-----------|-------|-------------|
| 1 | Accessibilité | 2 | Filtres et champ « budget cible » sans label (placeholder seul). IDs dupliqués entre le formulaire d'ajout et celui d'édition. Graphique Tendance sans alternative textuelle des valeurs. `ink-3` (≈3,3:1) utilisé pour du texte. |
| 2 | Performance | 2 | `getComptesAvecSolde` et `getTransactions` lisent tout l'historique, sans limite, à chaque requête. La recherche lance une navigation serveur (avec écriture) à chaque frappe. Petite cascade de requêtes dans `/transactions`. Boucle `await` séquentielle dans `genererOccurrencesDues`. |
| 3 | Theming | 3 | Tokens employés partout, mais `--accent-carbs` (couleur macro) sert d'avertissement budget. Ombre inline de `addCardIcon` et `white` codé en dur dans `color-mix`. |
| 4 | Responsive | 2 | Les montants débordent des cellules du calendrier (~41px, texte de 10px). Cibles tactiles de 30 à 34px (segments, `ghostButton`/`dangerButton`, icônes d'en-tête). Libellés à 8 unités SVG (≈7,8px) dans le graphique. |
| 5 | Intégrité d'implémentation | 2 | Règles nommées de DESIGN.md violées (Semantic-Only Macro, Graduated Alert). Segmented control non conforme. `SousCategorieRow` dupliqué. Actions mortes (`modifierCategorie`, `supprimerBudget`). |
| **Total** | | **11/20** | **Acceptable** (travail significatif nécessaire) |

**Verdict intégrité** : échec partiel. Le module s'appuie bien sur `lib/ui.ts` et les tokens, mais il dévie de trois motifs nommés du système. Deux défauts de modèle de données (suppression en cascade, génération des récurrences non idempotente) comptent davantage que le visuel.

###### Bloquant (P0)

1. **[/comptes] Supprimer un compte efface en silence tout son historique, y compris les virements vers d'autres comptes**
   - Où : `comptes/ComptesList.tsx:58-59` (le `confirmDelete` affiche seulement « Supprimer le compte « X » ? ») → `actions/comptes.ts:72-80` → `scripts/migration-budget-2026-08-30.sql:44` (`compte_id … on delete cascade`) et `scripts/migration-budget-sous-categories-virements-2026-08-30.sql:36` (`compte_destination_id … on delete cascade`). Même chose pour `transactions_recurrentes` (`migration-budget-transactions-recurrentes…sql:16,22`).
   - Catégorie : intégrité / prévention d'erreur.
   - Impact : perte de données irréversible. Supprimer « Livret A » supprime aussi les virements « Courant → Livret A », ce qui augmente le solde affiché du compte Courant. Aucun avertissement, aucune annulation possible.
   - Recommandation : dans le message de confirmation, indiquer le nombre de transactions et de récurrences concernées, ou bien refuser la suppression si le compte a un historique et proposer « Archiver le compte » (booléen `archive`, masqué des sélecteurs). Côté base, passer à `on delete restrict` et traiter l'erreur en message lisible.
   - Commande : `/impeccable harden`

2. **[/transactions] La recherche lance une navigation serveur à chaque frappe, sur un champ contrôlé par l'URL**
   - Où : `transactions/TransactionsFilters.tsx:18-23` (`router.push` dans `updateParam`) et `:27-33` (`value={searchParams.get("q")}`, `onChange` → `updateParam`).
   - Catégorie : performance / intégrité.
   - Impact : chaque caractère déclenche (a) une entrée d'historique, donc « retour » revient lettre par lettre, (b) un rendu serveur complet qui repasse par `genererOccurrencesDuesPourLaRequete` (une écriture) puis trois lectures sur toute la table (voir P1-1). Comme la `value` n'est mise à jour qu'au commit de la navigation, React remet le champ à l'ancienne valeur entre deux frappes : sur un réseau mobile, des caractères disparaissent et la recherche devient à peu près inutilisable.
   - Recommandation : état local non contrôlé ou `useState`, debounce d'environ 300 ms, `router.replace` (pas `push`) dans `startTransition`. Même logique pour les `select`, qui doivent eux aussi passer par `replace`.
   - Commande : `/impeccable optimize`

###### Important (P1)

1. **[actions] Soldes et historique lus sur toute la table, sans limite : coût qui grandit sans fin et risque de troncature silencieuse**
   - Où : `actions/comptes.ts:92` (`select("compte_id, compte_destination_id, montant, type")` sur toutes les transactions, appelé par `/budget`, `/transactions`, `/comptes`, `/recurrentes` et `/statistiques`) ; `actions/transactions.ts:212-218` (`getTransactions` sans `limit`/`range`). Sans aucun filtre, `/budget/transactions` affiche toute l'histoire.
   - Impact : PostgREST plafonne par défaut à 1000 lignes (le `max_rows` du projet n'a pas pu être vérifié). Passé ce seuil, soit environ 6 à 10 mois à 3-5 transactions par jour, les soldes deviennent faux sans aucun message et la liste est tronquée. Avant cela, le transfert et l'hydratation grossissent (`TransactionsList` est entièrement client, et `/transactions` charge l'historique deux fois : pour les soldes et pour la liste).
   - Recommandation : une vue ou RPC SQL `comptes_avec_solde` (agrégation `sum` côté Postgres). Sur `/transactions`, une lecture `comptes(id, nom)` suffit pour les sélecteurs. Liste filtrée par défaut sur le mois courant avec pagination (`range`) ou « Charger plus ».
   - Commande : `/impeccable optimize`

2. **[requete / récurrences] Génération des occurrences non atomique : risque de transactions en double**
   - Où : `actions/transactions-recurrentes.ts:302-350` (lecture des modèles dus → `insert` ligne 334 → `update prochaine_occurrence` ligne 344, en séquence) ; `requete.ts:18-21` (`cache()` ne déduplique qu'à l'intérieur d'une même requête). Aucune contrainte unique `(transaction_recurrente_id, date_operation)` (`migration-budget-transactions-recurrentes…sql:58,74`, index seulement).
   - Impact : deux requêtes concurrentes (tirer pour rafraîchir pendant une navigation, deux onglets, `/budget` puis `/transactions` pendant le streaming) lisent le même modèle dû et insèrent chacune l'occurrence. Résultat : prélèvement compté deux fois, solde faux. Si l'`update` échoue après l'`insert`, la requête suivante réinsère. La boucle fait aussi 2 allers-retours séquentiels par modèle, qui bloquent le rendu.
   - Recommandation : index unique partiel plus `upsert … onConflict ignore`, ou une fonction SQL transactionnelle (`for update skip locked`) appelée une seule fois. À terme, un cron Vercel ou `pg_cron` plutôt qu'une écriture pendant le rendu.
   - Commande : `/impeccable harden`

3. **[/budget, /categories] Budget cible propre à chaque mois, sans report : les « dépassements » deviennent faux dès le 1er du mois**
   - Où : `actions/budgets.ts:134` (budget filtré par `periode` exacte) et `:160-162` ; `lib/budget/compute.ts:28-29` (`cible <= 0` et `consomme > 0` donnent `"depasse"`) ; `page.tsx:112` (liste tout statut différent de `ok`).
   - Impact : chaque nouveau mois, toute catégorie où Vincent a dépensé sans avoir ressaisi son budget apparaît dans « Catégories en dépassement » avec une barre rouge à 100 %. Le tableau de bord signale un problème qui n'existe pas (Graduated Alert Rule) et impose de ressaisir tous les budgets tous les mois (charge mémoire).
   - Recommandation : reprendre par défaut le dernier budget connu de la catégorie (`periode <= X order desc limit 1`) ou prévoir un bouton « Reconduire les budgets du mois précédent ». Séparer « sans budget » (neutre, pas d'alerte) de « dépassé ».
   - Commande : `/impeccable clarify`

4. **[/budget, /categories] La couleur macro Glucides sert d'avertissement budget (Semantic-Only Macro Rule)**
   - Où : `page.tsx:174` (`var(--accent-carbs)`), `categories/CategorieProgressCard.tsx:15` (`proche: "var(--accent-carbs)"`).
   - Impact : violation d'une règle nommée de DESIGN.md. Le jaune « Glucides » prend un second sens hors Nutrition.
   - Recommandation : `--accent-warning` (Ambre Avertissement) pour « proche ».
   - Commande : `/impeccable colorize`

5. **[/statistiques, /calendrier] Toute dépense ordinaire est affichée en rouge Alerte (Graduated Alert Rule)**
   - Où : `statistiques/TendanceChart.tsx:46` (`fill="var(--accent-alert)"`), `statistiques/page.tsx:75` (légende `bg-alert`), `calendrier/page.tsx:101` (`text-alert` sur chaque total de dépenses).
   - Impact : le rouge est réservé aux dépassements nets et à la destruction. Ici, chaque jour où Vincent a acheté quelque chose est rouge : le calendrier se lit comme une série d'alertes.
   - Recommandation : dépenses en `ink`/`ink-2` (ou teinte module `--accent-budget` en indicateur passif), rouge réservé au solde négatif ou au dépassement.
   - Commande : `/impeccable colorize`

6. **[/calendrier] Les montants débordent des cellules et se chevauchent**
   - Où : `calendrier/page.tsx:93-105` : cellule `grid-cols-7` d'environ 41px à 375px (343 − padding de la carte − 6 gouttières), texte de 10px, `formatMontant` complet (« -45,00 € » ≈ 42px, « -1 234,56 € » ≈ 55px, avec des espaces insécables U+202F qui empêchent le retour à la ligne), sans `truncate` ni `overflow-hidden`.
   - Impact : texte superposé sur les cellules voisines, jours illisibles dès qu'il y a un montant à 3 chiffres.
   - Recommandation : format compact propre au calendrier (`maximumFractionDigits: 0`, notation `compact` au-delà de 1000, sans symbole €) ou simple pastille de couleur plus total du jour tapé. Ajouter `min-w-0 overflow-hidden` et des chiffres tabulaires. Mettre en évidence le jour courant.
   - Commande : `/impeccable adapt`

7. **[/transactions, /recurrentes] IDs de champ statiques, donc dupliqués dès que deux formulaires coexistent**
   - Où : `transactions/TransactionForm.tsx:58,113,134…` (`id="compte_id"`, `"montant"`, `"date_operation"`, `"libelle"`), `transactions/VirementForm.tsx:52…`, `recurrentes/RecurrenceForm.tsx:55-180`. Le formulaire d'ajout (`AddTransactionToggle`) et l'édition inline de N lignes (`TransactionsList.tsx:48-64`) peuvent être ouverts ensemble.
   - Impact : un tap sur un `<label>` place le focus dans le champ d'un autre formulaire. HTML invalide, lecteur d'écran désorienté.
   - Recommandation : `useId()` par formulaire (comme le fait déjà `AddSousCategorieForm.tsx:31-41` avec un suffixe).
   - Commande : `/impeccable harden`

8. **[/transactions] Cascade de requêtes évitable**
   - Où : `transactions/page.tsx:94-102` : `Promise.all([comptes, categories])` puis, ensuite seulement, `await getTransactions(...)`.
   - Impact : un aller-retour Supabase de plus sur le chemin critique de l'écran le plus consulté.
   - Recommandation : mettre `getTransactions` dans le même `Promise.all` (après `genererOccurrencesDues`, qui doit rester avant). Règle Vercel `async-parallel`.
   - Commande : `/impeccable optimize`

9. **[/categories] Supprimer une catégorie utilisée fait planter toute la page**
   - Où : `categories/CategoriesList.tsx:25-28,56-65` et `CategorieProgressCard.tsx:30-35` → `actions/categories-budget.ts:85-86` (`throw` sur l'erreur FK : `transactions.categorie_id` sans `on delete`, `migration-budget-2026-08-30.sql:45`). Un `throw` dans `startTransition` remonte à `(app)/error.tsx` (écran d'erreur générique, message masqué en production).
   - Impact : le contenu est remplacé par un `ErrorState` sans explication. Idem pour `supprimerTransaction`, `supprimerCompte` et `basculerActive` en cas d'erreur réseau.
   - Recommandation : retourner `{ error }` plutôt que `throw`, et afficher inline « Catégorie utilisée par N transactions : réaffectez-les d'abord ».
   - Commande : `/impeccable harden`

10. **[/statistiques] Graphique Tendance illisible sur mobile et muet pour les technologies d'assistance**
    - Où : `statistiques/TendanceChart.tsx:61` (`fontSize={8}` dans un viewBox de 320, soit environ 7,8px rendu sur une carte de 311px), `:25` (`preserveAspectRatio="none"`), `:27` (un seul `aria-label` générique, aucune valeur).
    - Impact : aucun montant lisible, ni à l'écran ni au lecteur d'écran. Impossible de répondre à « combien ai-je dépensé en juillet ? ».
    - Recommandation : libellés d'au moins 11px, valeurs au tap ou `<title>` par barre, liste visuellement masquée (ou tableau) des 6 mois, mois courant mis en évidence.
    - Commande : `/impeccable clarify`

11. **[transverse Budget] Cibles tactiles sous 44px sur des actions fréquentes**
    - Où : segments `transactions/TransactionModeForm.tsx:39`, `recurrentes/RecurrenceModeForm.tsx:43`, `categories/PeriodeSelector.tsx:46` (`py-1.5`, soit ~30px) ; `ghostButton`/`dangerButton` (≈32px) pour Modifier/Suppr./Précédent/Suivant (`TransactionsList.tsx:104-117`, `PeriodeNavigation.tsx:20-26`, `PeriodeSelector.tsx:55-80`) ; icônes d'en-tête en `h-[34px]` (`transactions/page.tsx:65,72`, `statistiques/page.tsx:53`, `calendrier/page.tsx:45`) ; « Définir » en texte seul (`CategorieProgressCard.tsx:102`).
    - Impact : ratés au pouce, à une main. « Suppr. » (32px) est collé à « Modifier » (gap de 8px).
    - Recommandation : `navArrowButton` (déjà dans `ui.ts`, 44×44) pour Précédent/Suivant et les icônes d'en-tête, segments en `py-2.5`, espacer l'action destructive.
    - Commande : `/impeccable adapt`

###### Mineur (P2)

- **[/transactions, /categories, /recurrentes] Segmented control non conforme à DESIGN.md** : actif en `bg-surface shadow-card`, et non `bg-kcal` plein avec texte blanc ; conteneur `rounded-xl` au lieu de 16px ; pas d'`aria-pressed` ni de `focus-visible:ring-kcal` (`TransactionModeForm.tsx:33-40`, `RecurrenceModeForm.tsx:37-44`, `PeriodeSelector.tsx:39-47`). `/impeccable polish`
- **[/transactions] Clavier et ordre de saisie du montant** : `type="number"` sans `inputMode="decimal"` (`TransactionForm.tsx:113-116`, `VirementForm.tsx`, `RecurrenceForm.tsx:114-117`, `CategorieProgressCard.tsx:87-89`). Montant en 3e position après deux `select`, sans focus initial. `/impeccable adapt`
- **[compute] Dates calculées en UTC** : `aujourdhuiISO()` utilise `toISOString()` (`lib/budget/compute.ts:204-206`), donc entre 0 h et 2 h, heure de Paris, la date préremplie (`TransactionForm.tsx:134`) est celle de la veille. `premierJourDuMois()` est appelé sur le serveur en UTC (`page.tsx:102`) : le 1er, avant 2 h, la vue d'ensemble montre encore le mois précédent. `/impeccable harden`
- **[/categories] Formulaire de budget ambigu** : champ sans label (`CategorieProgressCard.tsx:87-100`, placeholder seul). Valider vide enregistre une cible à 0 (`Number("") === 0`, `actions/budgets.ts:39`). Aucun moyen de retirer un budget (`supprimerBudget` jamais importé). Aucune confirmation de succès. `/impeccable clarify`
- **[/categories] Actions incohérentes selon le type** : les catégories principales de dépense n'ont ni bouton Suppr. ni renommage (`CategorieProgressCard.tsx:66-120`), contrairement aux catégories de revenus (`CategoriesList.tsx:53-66`). `modifierCategorie` n'est utilisée nulle part. `SousCategorieRow` est dupliqué à l'identique (`CategoriesList.tsx:13-35` et `CategorieProgressCard.tsx:21-43`). `/impeccable distill`
- **[/transactions, /recurrentes] Impasse sans compte ni catégorie** : `AddTransactionToggle.tsx:21-23` et `AddRecurrenceToggle.tsx` renvoient `null` sans rien expliquer ; la liste affiche seulement « Aucune transaction pour cette sélection ». `/impeccable onboard`
- **[/recurrentes] Date ISO brute et chunk chargé sans fallback** : « Prochaine échéance : 2026-10-01 » (`RecurrenceForm.tsx:143`). `RecurrenceForm` est chargé via `dynamic(..., { ssr: false })` sans `loading` (`RecurrenceModeForm.tsx:10-12`), d'où un bloc vide puis un saut de mise en page dans `AnimatedAddCard` à l'ouverture. `/impeccable polish`
- **[/statistiques] « Répartition par compte » ne dépend pas de la période choisie** (solde courant, `statistiques/page.tsx:87-92` et `128-130`), alors que la navigation par mois au-dessus laisse croire le contraire. `/impeccable clarify`
- **[theming] Seconde ombre et blanc codé en dur** : `boxShadow: "0 3px 8px …"` inline sur l'icône des cartes « Ajouter » (`AddTransactionToggle.tsx:32`, même motif dans `AddCompteToggle`, `AddCategorieToggle`, `AddRecurrenceToggle`), ce qui viole la Single Shadow Rule. `color-mix(… white 15%)` en dur. `/impeccable polish`
- **[a11y] Hiérarchie de titres et typographie** : titres de section en `<p>` sur la vue d'ensemble (`page.tsx:68,134,166`), `...` au lieu de `…` (« Enregistrement... », « Rechercher un libellé... »), aucun `tabular-nums` sur les colonnes de montants, SVG décoratifs sans `aria-hidden`, emoji « 🔁 » lu à voix haute (`TransactionsList.tsx:85`). `/impeccable typeset`
- **[perf] `formatMontant` recrée un `Intl.NumberFormat` à chaque appel** (`lib/budget/compute.ts:36-38`) : jusqu'à ~84 appels sur une grille de calendrier et N×2 pendant l'hydratation de `TransactionsList`. Une instance au niveau du module suffit. `/impeccable optimize`

##### Critique UX

**Verdict de spécificité design** : l'ossature suit bien le système Kilio (cartes 22px, tokens OKLCH, cartes « Ajouter » à icône dégradée, `PullToRefresh`, squelettes fidèles à la mise en page). Le module reste pourtant un CRUD générique, interchangeable avec n'importe quelle app de budget : listes Modifier/Suppr., formulaires à 5-8 champs. Il ne tire presque rien de la promesse « tableau de bord doux » : le rouge sature calendrier et statistiques, aucun geste rapide n'existe, et l'intégration inter-modules revendiquée par PRODUCT.md (Courses → Budget) n'apparaît nulle part.

| # | Heuristique | Score | Constat clé |
|---|-------------|-------|-------------|
| 1 | Visibilité de l'état du système | 2 | États pending sur les boutons et squelettes corrects. Rien après « Définir » un budget. La recherche perd des caractères. Suppression sans retrait optimiste. |
| 2 | Correspondance avec le monde réel | 3 | Français et € bien formatés. Mais « Suppr. », date ISO brute, « dépassement » pour une catégorie sans budget. |
| 3 | Contrôle et liberté | 1 | Aucune annulation après suppression. La cascade détruit l'historique. Pas de sous-navigation ni de retour visible entre les 7 écrans. L'historique est pollué par la recherche. |
| 4 | Cohérence et standards | 2 | Segmented control hors système. Rouge pour les dépenses normales. Suppression disponible pour les catégories de revenus mais pas pour les principales de dépense. |
| 5 | Prévention des erreurs | 1 | Suppression en cascade, validation vide qui donne 0, doublons de récurrences, date préremplie fausse la nuit. |
| 6 | Reconnaissance plutôt que rappel | 2 | Filtres identifiés par placeholder seul, pas de « aujourd'hui » dans le calendrier, budgets à ressaisir de mémoire chaque mois. |
| 7 | Flexibilité et efficacité | 1 | Aucun ajout rapide depuis `/budget` ni via QuickAddFab : Budget → Voir les transactions → Ajouter → onglet → 5 champs. Aucun défaut « dernier compte ou catégorie ». |
| 8 | Esthétique et minimalisme | 2 | Chaque ligne porte deux boutons. Chaque carte de catégorie empile barre, formulaire, sous-liste et « + Sous-catégorie ». |
| 9 | Récupération après erreur | 1 | Une erreur de clé étrangère mène à l'écran d'erreur générique. Messages Supabase bruts (`error.message`) affichés tels quels. |
| 10 | Aide et documentation | 2 | Quelques aides en ligne utiles (« Il faut au moins 2 comptes… », note sur la date de départ non modifiable), pas d'explication de « proche » ou « dépassé ». |
| **Total** | | **17/40** | **Faible** |

**Charge cognitive** : 4 échecs sur 8 (charge élevée). Échouent : découpage en blocs (cartes de catégorie à 4 sous-blocs), une chose à la fois (budget, sous-catégories et suppression sur la même carte), choix minimaux, mémoire de travail (budgets mensuels à reconduire de mémoire). Points de décision à plus de 4 options : formulaire de récurrence (3 onglets + 7 champs), formulaire de transaction (3 onglets + 5 champs), barre de filtres (recherche + 3 contrôles + ajout), ligne de récurrence (3 actions + infos).

**Points forts**
- La vue d'ensemble lance ses lectures en parallèle (`page.tsx:104-108`, `Promise.all`) sous `<Suspense>`, avec des squelettes calqués sur la mise en page. `chargerStatistiques` est partagé par `cache()` entre trois cartes (`statistiques/page.tsx:100-107`). C'est du streaming propre.
- Validation côté serveur rigoureuse : type dérivé de la catégorie (`actions/transactions.ts:20-23`), période recalée (`budgets.ts:44-55`), virement source ≠ destination, rattrapage de plusieurs occurrences en retard documenté.
- Formulaires cohérents entre eux (label, `role="alert"`, `useBackClose` pour fermer au geste retour, `AnimatedAddCard` qui respecte `prefers-reduced-motion`), `formatMontant` en `Intl` fr-FR/EUR partout.

###### Constats UX

**Bloquant (P0)**
- **Suppression de compte destructrice sans avertissement** : voir audit P0-1. Du point de vue de Vincent, un tap plus un « OK » réflexe suffisent à perdre des mois d'historique. `/impeccable harden`

**Important (P1)**
- **Aucun chemin rapide pour saisir une dépense** (`page.tsx:54-96` : pas de CTA d'ajout ; rien pour le budget dans `QuickAddFab`). Le principe produit n°4 (« saisie rapide avant tout ») n'est pas tenu : au moins 3 écrans ou taps avant le premier champ, et le montant arrive en 3e position. Recommandation : bouton « + Dépense » dans la carte du mois sur `/budget` et dans la QuickAddFab, montant en premier (`inputMode="decimal"`), compte et catégorie préremplis avec les derniers utilisés. `/impeccable adapt`
- **Pas de navigation interne au module** : les 6 sous-routes ne sont accessibles que par des pastilles-liens de la vue d'ensemble (`page.tsx:67-92`, `123-130`, `157-162`, `200-205`), sans segmented control ni retour. En PWA iOS autonome, sans geste de retour fiable, Vincent peut se retrouver coincé sur `/budget/calendrier`. Recommandation : sous-navigation segmentée (Vue d'ensemble · Transactions · Catégories · Plus) comme Journal/Recettes. `/impeccable layout`
- **Faux « dépassements » en début de mois** et **rouge omniprésent** (audit P1-3, P1-5) : l'émotion dominante devient la culpabilité, à l'opposé de « doux ». `/impeccable colorize`
- **Liste de transactions sans structure** (`TransactionsList.tsx:138-150`) : ni regroupement par jour, ni sous-total, ni limite, 2 boutons par ligne. Recommandation : sections par date avec total du jour, tap sur la ligne pour éditer, suppression dans l'éditeur (ou par balayage avec annulation). `/impeccable distill`

**Mineur (P2)**
- Les titres de période en minuscule (« septembre 2026 », `compute.ts:153-157`) servent de titre de section (`page.tsx:134`). `/impeccable typeset`
- « Suivant → » permet de naviguer indéfiniment vers des mois futurs vides (`PeriodeNavigation.tsx:28-30`). `/impeccable polish`
- Récurrence en pause rendue en `opacity-60` (`RecurrencesList.tsx:63`) : texte `ink-2` sous 4,5:1. `/impeccable polish`
- Le lien « Liste » du calendrier (`calendrier/page.tsx:43`) ouvre tout l'historique au lieu du mois affiché. `/impeccable clarify`

**Red flags personas**
- **Casey (mobile, une main)** : actions Modifier/Suppr. à 32px en bas à droite de chaque carte, collées l'une à l'autre. La recherche perd des lettres sur réseau 4G faible. Les segments de 30px du formulaire sont en haut de la carte, hors de la zone du pouce.
- **Sam (accessibilité)** : filtres et « budget cible » sans nom accessible. Labels qui visent le mauvais champ (IDs dupliqués). Graphique Tendance réduit à « Évolution des dépenses… » sans aucune valeur. Jours du calendrier lus « 12 -45,00 € » sans mois ni jour de semaine. Segments sans `aria-pressed`.
- **Vincent en caisse ou en cuisine** (saisie juste après un achat, téléphone dans une main, sac dans l'autre) : 4 taps avant de taper le montant, puis clavier non décimal. Après minuit, la date préremplie est celle de la veille. S'il ouvre `/budget` le 1er du mois, il voit toutes ses catégories « en dépassement » en rouge alors qu'il n'a rien dépassé.
- **Vincent en fin de mois** (bilan) : le calendrier chevauche ses montants, et le graphique n'affiche aucun chiffre. Le seul endroit où lire un total mensuel est la carte de la vue d'ensemble, et uniquement pour le mois courant.

---

#### Constats transverses observés

1. **Actions serveur qui lèvent une exception au lieu de retourner une erreur** (`supprimerTransaction`, `supprimerCompte`, `supprimerCategorie`, `supprimerRecurrence`, `basculerActive`, `supprimerBudget`) et sont appelées dans `startTransition` : toute erreur (clé étrangère, réseau) mène à l'écran d'erreur générique `(app)/error.tsx`. Même schéma probable dans d'autres modules.
2. **Toggle « Ajouter » dupliqué 4 fois dans le Budget** (`AddTransactionToggle`, `AddCompteToggle`, `AddCategorieToggle`, `AddRecurrenceToggle`) avec le même dégradé et une `boxShadow` inline (seconde ombre, Single Shadow Rule) plus un bouton « Annuler » souligné sans `focusRing`, d'environ 20px de haut. Il faudrait l'extraire dans un composant partagé (`AnimatedAddCard` ne couvre que l'animation).
3. **Segmented control « bg-surface + shadow-card »** au lieu du motif `bg-kcal` de DESIGN.md : 6 occurrences dans l'app, dont 3 dans le Budget.
4. **Styles interactifs écrits en ligne sans `focusRing`** (pastilles-liens de `/budget`, icônes d'en-tête de 34px, cellules du calendrier, « Définir », « Effacer ✕ », « Annuler ») : le focus retombe sur l'outline par défaut du navigateur. Ce n'est pas bloquant, mais c'est incohérent avec la règle `focus-visible:ring-kcal ring-offset-2`.
5. **`ghostButton`/`dangerButton` (≈32px) employés pour des actions de ligne fréquentes** alors que `navArrowButton` (44px) existe déjà : c'est le token lui-même qui pousse vers des cibles trop petites.
6. **`ink-3` (≈3,3:1 sur `surface`)** sert de texte informatif (sous-titres des cartes « Ajouter », `eyebrow`) : problème de contraste au niveau du système, pas propre au Budget.
7. **Idempotence des écritures pendant le rendu** : générer pendant le rendu, sans contrainte unique, est un risque de conception à vérifier dans d'autres modules qui « rattrapent » des occurrences (habitudes, tâches récurrentes ?).
8. **Couleurs sémantiques réutilisées hors contexte** (`--accent-carbs` pour l'avertissement, `--accent-alert` pour une dépense normale) : les règles Semantic-Only et Graduated Alert de DESIGN.md sont écrites pour la Nutrition et n'ont pas de déclinaison « Budget ». Il faudrait les étendre explicitement (avertissement = `--accent-warning`, dépense = neutre).


### 4.6 Notes, Documents, Collection, Carburants

_Source : Assessment A (agent isolé, lecture du code)._

Méthode : lecture intégrale des fichiers du périmètre + composants partagés importés (CheckToggle, AnimatedAddCard, useBackClose, confirm, PullToRefresh, GridSkeleton, TransitionLink, ImageLightbox/FadeInImage, `(app)/error.tsx`, `next.config.ts`, `lib/ui.ts`, `globals.css`). Détecteur non exécuté (réservé à l'Assessment B), pas de navigateur. Les Web Interface Guidelines Vercel ont bien été récupérées (le réseau a répondu). `node_modules/next/dist/docs/` est absent du checkout : aucune API Next n'est déclarée dépréciée sans preuve.
Contrastes calculés à partir des tokens OKLCH (luminance ≈ L³) : `ink-3` sur `background` ≈ 3,1:1 ; texte blanc sur un accent de module sombre (L 0,72) ≈ 2,5:1 ; le même en clair (L 0,55) ≈ 4,9:1.

---

#### Module Notes — `/notes`
Fichiers couverts : `notes/page.tsx`, `loading.tsx`, `NotesGrid.tsx`, `NoteCard.tsx`, `NoteForm.tsx`, `AddNoteToggle.tsx`, `lib/notes/palette.ts`, `actions/notes.ts`.

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Bouton épingle 18×18 sans anneau de focus, choix binaires (type, couleur, tags) sans `aria-pressed` |
| 2 | Performance | 3 | Filtrage client mémoïsé, mutations optimistes. `revalidatePath` inutile à chaque coche (le cache vient de TanStack) |
| 3 | Responsive | 2 | Le formulaire d'édition s'ouvre dans une demi-colonne `columns-2` → éditeur de checklist inutilisable sur téléphone |
| 4 | Theming | 3 | Palette `--note-*` bien tokenisée clair/sombre. Couleurs de tag en hex brut (`${couleur}1a`), sans variante sombre |
| 5 | Intégrité | 2 | `active:scale` sur une carte-groupe (contraire à DESIGN.md), contrôle segmenté réinventé, création non atomique |
| **Total** | | **12/20** | **Acceptable** |

**Constats audit**

*Important (P1)*
- **L'édition d'une note s'ouvre dans une demi-colonne** — `NoteCard.tsx:135` (le `<li>` d'édition reste dans `NotesGrid.tsx:109/121` `columns-2`) + `NoteForm.tsx:50-119`. Responsive. Une ligne d'item empile coche 20px, input `flex-1` et 3 `ghostButton` (↑ ↓ ×) dans environ 165px. L'input tombe à quelques pixels ou déborde de la carte, et les 9 pastilles de couleur passent sur 3 lignes. Reco : sortir l'édition de la grille (feuille plein écran ou `column-span: all` sur le `<li>` d'édition), ou passer par un écran de détail. `/impeccable adapt`
- **Épingler : cible de 18×18px, sans focus visible** — `NoteCard.tsx:175-183`. Responsive/A11y. C'est la deuxième action la plus fréquente sur une carte, pourtant la zone de tap se limite au SVG. Aucune classe `focusRing`. Reco : `h-11 w-11 -m-3 flex items-center justify-center` plus `focus-visible:ring-*`. `/impeccable harden`
- **Cocher un item depuis la carte : cible de 22px** — `NoteCard.tsx:197-205` (`size={18}`, `hitSlop={2}`). Responsive. C'est l'action principale d'une checklist, faite à une main, et le libellé à côté n'est pas cliquable. Reco : rendre toute la ligne (`<label>`/bouton) cliquable pour toggler, ce qui lève la contrainte hitSlop ≤ gap. `/impeccable adapt`
- **Une erreur réseau dans l'éditeur d'items fait planter toute la page** — `NoteForm.tsx:40-43, 53-57, 70-73, 82-85, 110-113`. Robustesse. `startTransition(async …)` sans try/catch : en React 19, une exception dans une transition remonte à l'error boundary (`(app)/error.tsx`), qui remplace la page entière, formulaire en cours compris. Contraste avec la file hors-ligne de `NoteCard.tsx:81-86`. Reco : try/catch + toast, voire `enqueueAction` comme sur la carte. `/impeccable harden`
- **`active:scale` sur une carte qui regroupe plusieurs contrôles** — `NoteCard.tsx:170`. Intégrité, violation nommée du DESIGN.md (« Don't add active:scale to group containers »). Épingle, coches, Modifier et Suppr. sont des enfants indépendants : chaque tap fait trembler toute la tuile. Le commentaire des lignes 160-162 assume l'exception, mais elle contredit la règle. Reco : retirer le scale ou le limiter à une zone « ouvrir la note ». `/impeccable polish`

*Mineur (P2)*
- **Contrôle segmenté Texte/Checklist hors système** — `NoteForm.tsx:240-259`. Intégrité/A11y. Il utilise `border p-1 rounded-xl/lg` au lieu du motif du DESIGN (`surface-alt` + onglets `rounded-xl`), sans `aria-pressed` ni focus ring, avec des segments d'environ 30px de haut. `/impeccable polish`
- **Pastilles de couleur (28px) et tags sans état exposé** — `NoteForm.tsx:296-315`, `324-333`. A11y : ni `aria-pressed` ni `role="radio"`, donc l'état sélectionné n'est porté que par la bordure. `/impeccable harden`
- **Création non atomique, doublon au 2ᵉ essai** — `actions/notes.ts:115-141`. Intégrité des données. La note est insérée avant les tags et les items. Si l'une de ces deux étapes échoue, l'action renvoie une erreur mais la note existe déjà, et un nouvel envoi la duplique. Reco : RPC transactionnelle, ou suppression compensatoire en cas d'erreur. `/impeccable harden`
- **L'item en cours de saisie est perdu à la création** — `NoteForm.tsx:178-194`. Un texte tapé sans « Ajouter » ni Entrée n'est pas soumis (seuls les `hidden item_libelle` le sont). Reco : inclure la saisie non vide au submit. `/impeccable harden`
- **« Annuler » n'annule pas les items** — `NoteForm.tsx:24-27` et `NoteCard.tsx:144-150`. Les items sont persistés en direct, alors que le titre et les tags attendent « Enregistrer ». Deux modèles de sauvegarde dans un même formulaire. `/impeccable clarify`
- **Contenu requis côté serveur mais pas côté client** — `NoteForm.tsx:274-280` vs `actions/notes.ts:36-38`. Il faut un aller-retour pour voir « Le contenu est requis ». `/impeccable harden`
- **Filtre de tag actif : classes contradictoires** — `NotesGrid.tsx:93` (`${pillTag} bg-kcal-soft text-kcal font-bold` alors que `pillTag` porte déjà `bg-surface-alt text-ink-2 font-semibold`). Theming. Le rendu dépend de l'ordre des utilitaires dans la CSS générée, pas de celui du className : le fond actif risque de ne pas s'appliquer. Reco : utiliser `kcalPillTag`, comme `DocumentsBrowser.tsx:110`. `/impeccable polish`
- **Couleur de tag en hex brut** — `NoteCard.tsx:23-26`. Theming. La couleur choisie au color-picker (`AddTagForm`) sert de texte sur un fond pastel `--note-*`, sans garantie de contraste ni variante sombre. `/impeccable colorize`
- **IDs statiques dans un formulaire réutilisable** — `NoteForm.tsx:263-266, 271-275, 340-343` (`titre`, `contenu`, `nouveaux_tags`). Si la création et une édition sont ouvertes en même temps, les IDs se dupliquent et les `htmlFor` visent le mauvais champ. Reco : `useId()`. `/impeccable harden`

**Critique UX**
Verdict de spécificité : c'est un clone de Google Keep assumé (masonry, pastels, épingle) proprement traduit en tokens Kilio. La palette `--note-*` et la file hors-ligne sont propres au produit. En revanche la composition carte → édition inline n'a pas été pensée pour la demi-colonne mobile.

| Heuristique | Score |
|---|---|
| 1 Visibilité de l'état | 3 (optimiste + toasts, barre de progression checklist) |
| 2 Correspondance monde réel | 4 |
| 3 Contrôle et liberté | 2 (Annuler partiel, pas d'annulation après suppression) |
| 4 Cohérence et standards | 2 (segmenté maison, deux modèles de sauvegarde) |
| 5 Prévention des erreurs | 2 (saisie d'item perdue, `required` absent) |
| 6 Reconnaissance plutôt que rappel | 3 |
| 7 Flexibilité et efficacité | 3 (recherche + filtres tags, `?action=new`) |
| 8 Esthétique et minimalisme | 3 |
| 9 Récupération après erreur | 2 (error boundary pleine page dans l'éditeur) |
| 10 Aide | n/a |
| **Total** | **24/36 → 27/40 renormalisé** |

Charge cognitive : 2/8 échecs (Choix minimaux : 9 pastilles + N tags + « nouveaux tags » visibles d'emblée dans le formulaire ; Une chose à la fois : les items se sauvent pendant que le reste attend). Points de décision > 4 options : sélecteur de couleur (9), tags.
Points forts : mutations optimistes avec rollback et file hors-ligne (`NoteCard.tsx:58-131`), `useReducedMotion` respecté sur la carte (`NoteCard.tsx:47, 165-169`), confirmation nommée avant suppression (`NoteCard.tsx:233`).
Constats UX : voir P1 ci-dessus (édition en demi-colonne, épingle, coches) ; P2 : ordre de lecture masonry vertical (les notes récentes descendent la colonne 1 avant la colonne 2), ce qui rend « plus récent d'abord » peu lisible. `/impeccable layout`
Red flags personas :
- *Casey (mobile, une main)* : épingle de 18px en haut à droite de chaque tuile et coches de 22px, soit des taps ratés sur les deux actions les plus fréquentes.
- *Sam (a11y)* : état des pastilles, tags et segments invisible au lecteur d'écran ; bouton épingle sans focus visible.
- *Vincent en cuisine* : il édite une liste de courses en checklist → le formulaire, écrasé dans une demi-colonne, le force à abandonner ou à zoomer ; un wifi instable pendant l'ajout d'un item fait planter la page.

---

#### Module Documents — `/documents`, `/documents/[id]`, `/documents/etiquettes`
Fichiers couverts : `documents/page.tsx`, `loading.tsx`, `DocumentsBrowser.tsx`, `DocumentsList.tsx`, `DocumentCard.tsx`, `DocumentForm.tsx`, `AddDocumentToggle.tsx`, `echeance.ts`, `champs.ts`, `[id]/*`, `etiquettes/*`, `actions/documents.ts`.

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Puces étiquette d'environ 22px, `×` de suppression de 20px, `<label>` + input `hidden` non focusables au clavier |
| 2 | Performance | 2 | Photos brutes envoyées au Server Action (compression seulement côté serveur), bloqué par le plafond de 4 Mo |
| 3 | Responsive | 2 | Cibles < 44px partout (puces, ×, Modifier/Suppr., lien retour) |
| 4 | Theming | 3 | Tokens respectés. Badge d'échéance en rouge unique (pas de gradation) |
| 5 | Intégrité | 2 | Création non atomique, suppression de fichier immédiate, page Étiquettes inaccessible sans étiquette |
| **Total** | | **11/20** | **Acceptable** |

**Constats audit**

*Bloquant (P0)*
- **Recto/verso ou plusieurs photos : envoi rejeté au-delà de 4 Mo** — `DocumentForm.tsx:339-349` et `114-121` (fichiers bruts dans le FormData), `next.config.ts` `serverActions.bodySizeLimit: "4mb"`. Intégrité/Perf. Le redimensionnement par sharp (`actions/documents.ts:40-52`) n'arrive qu'après réception. Deux photos d'appareil (2 à 5 Mo chacune, soit le cas nominal d'une étiquette `recto_verso`) dépassent la limite, la requête est rejetée (413) avant l'action, et `useActionState` fait remonter l'erreur à l'error boundary. Probable pour une carte d'identité recto/verso, à confirmer sur l'appareil. Reco : compresser côté client (canvas/`createImageBitmap` → JPEG 1600px) avant l'envoi, ou uploader directement vers Supabase Storage avec une URL signée. `/impeccable optimize`

*Important (P1)*
- **Supprimer un fichier existant : bouton de 20px, suppression immédiate et définitive** — `DocumentForm.tsx:66-74` (h-5 w-5 en coin), `202-207`, `actions/documents.ts:156-178`. Perte de données. Le fichier est retiré du Storage tout de suite, sans confirmation, et « Annuler » ne le restaure pas. Sans try/catch (`202-206`), une erreur renvoie à l'error boundary. Reco : marquer le fichier pour suppression et l'appliquer à « Enregistrer », ou passer par `confirmDelete` ; cible de 44px. `/impeccable harden`
- **Page Étiquettes inaccessible tant qu'aucune étiquette n'existe** — `DocumentsBrowser.tsx:92-103` : le seul lien vers `/documents/etiquettes` (vérifié par grep) n'est rendu que si `documents.length > 0 && etiquettes.length > 0`. Dans la PWA standalone, sans barre d'URL, il est impossible de créer la première étiquette, ou d'en recréer une après les avoir toutes supprimées. Reco : lien permanent (en-tête ou sous le select « Étiquette » de `DocumentForm.tsx:229-247`). `/impeccable onboard`
- **L'échéance ne distingue pas « expiré » de « dans 25 jours »** — `echeance.ts:24-33`, `DocumentCard.tsx:113-123`, `DocumentDetail.tsx:98-108`. Visibilité de l'état. Le même badge rouge `alert` couvre ≤ 30 jours, ≤ 7 jours et dépassé, avec une date absolue (« 3 mars 2026 ») : l'information clé, expiré ou non et dans combien de jours, reste à calculer de tête. Pas de gradation, contrairement à l'esprit du Graduated Alert Rule. Reco : libellé relatif (« expiré depuis 12 j », « dans 5 j ») et 2 niveaux visuels distincts. `/impeccable clarify`
- **Création non atomique, doublon au 2ᵉ essai** — `actions/documents.ts:318-330`. Le document est inséré, puis l'upload échoue, et l'action renvoie une erreur alors que la ligne existe (sans fichier). Un nouvel envoi crée un doublon. Reco : supprimer le document si l'upload échoue. `/impeccable harden`
- **Puces de filtre d'environ 22px de haut** — `DocumentsBrowser.tsx:104-115` (`pillTag` : `py-1 text-[11px]`), bouton étiquettes 36px (`:100`). Responsive. `/impeccable adapt`

*Mineur (P2)*
- **Suppression depuis la liste sans gestion d'erreur ni retour optimiste** — `DocumentCard.tsx:133-141` : `startTransition(() => deleteDocument(id))`. Un échec Storage renvoie à l'error boundary. Pendant l'attente, seul le bouton passe en `disabled`. Comparer avec `DocumentDetail.tsx:83-89`, qui attrape l'erreur. `/impeccable harden`
- **L'overlay de la lightbox se déforme au tap** — `DocumentCard.tsx:146-148` rend `ImageLightbox` (`fixed inset-0`) dans le `<li>` `listCard`, qui porte `active:scale-[0.97]` (`ui.ts:57`) et `layout` framer. Appuyer sur l'overlay déclenche `:active` sur le `<li>` ancêtre, le transform change le bloc conteneur du `fixed`, et l'overlay rétrécit ou saute pendant l'appui. Reco : `createPortal` vers `body` (vaut pour toutes les lightbox). `/impeccable polish`
- **Animations framer sans reduced-motion** — `DocumentCard.tsx:38-44, 66-72` (`layout`, `y`), contrairement à `NoteCard`. `/impeccable animate`
- **Date du jour prise en UTC** — `echeance.ts:12-14` (`toISOString().slice(0,10)`). Entre 0 h et 2 h à Paris, « aujourd'hui » vaut la veille, donc le décompte a un jour d'écart. Le rendu SSR (UTC) et le rendu client peuvent aussi différer : un mismatch de `className` n'est pas corrigé à l'hydratation. `/impeccable harden`
- **IDs statiques dupliqués** — `DocumentForm.tsx:223-226, 333-342` (`nom`, `document-fichiers`), `117` (`fichier_recto`). Si l'ajout et une édition sont ouverts ensemble, taper « Ajouter des fichiers » dans l'édition ouvre l'input du formulaire d'ajout (premier dans le DOM) et les fichiers partent dans le mauvais document. `/impeccable harden`
- **Pas de zoom dans la lightbox des documents** — `ImageLightbox.tsx:49, 71-73` : un tap n'importe où ferme. Pour lire un numéro de permis ou de contrat, il ne reste que le pinch-zoom de la page. `/impeccable adapt`
- **Libellés incohérents** — « Éditer » (`DocumentDetail.tsx:75`) vs « Modifier » (`DocumentCard.tsx:131`), « Enregistrement... » avec trois points (`DocumentForm.tsx:392`). `/impeccable clarify`

**Critique UX**
Verdict de spécificité : les concepts métier sont bien ancrés (étiquettes typées recto/verso ou période mensuelle, alertes d'échéance synchronisées avec le cron push, morph carte→détail), ce qui dépasse le gestionnaire de fichiers générique. La surface visuelle reste une liste Kilio standard, et le signal principal (échéance) est sous-exploité.

| Heuristique | Score |
|---|---|
| 1 Visibilité de l'état | 2 (échéance ambiguë, suppression sans retour) |
| 2 Correspondance monde réel | 3 |
| 3 Contrôle et liberté | 2 (fichier supprimé définitivement, Annuler inopérant) |
| 4 Cohérence et standards | 3 |
| 5 Prévention des erreurs | 1 (× de 20px destructif, limite d'upload, doublons) |
| 6 Reconnaissance plutôt que rappel | 2 (date absolue à interpréter) |
| 7 Flexibilité et efficacité | 3 (recherche, tri, filtres) |
| 8 Esthétique et minimalisme | 3 |
| 9 Récupération après erreur | 2 |
| 10 Aide | n/a |
| **Total** | **21/36 → 23/40 renormalisé** |

Charge cognitive : 2/8 échecs (Hiérarchie visuelle : l'échéance est au même niveau que la période ; Mémoire de travail : il faut connaître la date du jour pour lire l'urgence). Points de décision > 4 options : Catégorie (6 + vide), Tri (4, limite).
Points forts : `Promise.all` côté serveur (`page.tsx:7`, `[id]/page.tsx:11`) + `notFound()`, compression sharp et `.rotate()` EXIF, champs dynamiques par type d'étiquette (`DocumentForm.tsx:277-325`) qui évitent un formulaire universel surchargé.
Constats UX : voir P0/P1 ci-dessus. P2 : les étiquettes filtrent sur un seul axe, et les catégories (cf. `CATEGORIES`) ne sont pas filtrables alors qu'elles sont affichées sur chaque carte. `/impeccable distill`
Red flags personas :
- *Casey* : le `×` de 20px en coin de vignette, sous le pouce, supprime définitivement le recto d'une carte grise.
- *Sam* : ajouter un fichier passe par un `<label>` sur un input `className="hidden"` (`display:none`), donc hors de la tabulation clavier ; le badge d'échéance se distingue uniquement par la couleur.
- *Vincent en déplacement (contrôle routier, guichet)* : il doit montrer la carte d'identité recto/verso ; si l'ajout a échoué (limite des 4 Mo) ou si la lightbox ne zoome pas, le document est inutilisable au moment critique.

---

#### Module Collection — `/collection`, `/collection/[id]`, `/collection/partage/choisir`
Fichiers couverts : `collection/page.tsx`, `loading.tsx`, `CollectionsGrid.tsx`, `CollectionMosaic.tsx`, `AddCollectionToggle.tsx`, `[id]/*`, `app/collection/partage/route.ts`, `partage/choisir/*`, `lib/collection/{tiktok,youtube,video}.ts`, `actions/collections.ts`, `components/{ImageLightbox,TiktokLightbox,YoutubeLightbox,FadeInImage}.tsx`.

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Lightbox sans `role="dialog"`, Échap ni gestion du focus ; ajout photo non focusable au clavier ; champs sans label |
| 2 | Performance | 2 | Toutes les `collection_items` chargées pour 4 vignettes ; miniatures vidéo `unoptimized` ; upload brut |
| 3 | Responsive | 2 | `×` de suppression photo 28px ; boutons de lightbox 36px |
| 4 | Theming | 3 | Tokens respectés. Voiles `bg-black/xx` acceptables pour un média |
| 5 | Intégrité | 2 | Suppression sans confirmation, framer sans reduced-motion, miniatures TikTok périssables |
| **Total** | | **11/20** | **Acceptable** |

Images (point demandé) : `next/image` via `FadeInImage` partout ✓, lazy par défaut ✓, `fill` + `sizes` cohérents (`50vw` pour une tuile en 2 colonnes, `25vw` pour les quarts de mosaïque, `100vw` en lightbox) ✓, `alt=""` décoratif avec `aria-label` porté par le bouton parent ✓. Manques : aucune image `priority` pour les premières tuiles (LCP), miniatures TikTok/YouTube en `unoptimized` (JPEG pleine taille pour une tuile de 25vw), lightbox avec `alt` générique « Photo agrandie » (`PhotosGrid.tsx:150`) même quand un `titre` existe.

**Constats audit**

*Bloquant (P0)*
- **Supprimer une photo en un tap, sans confirmation ni annulation** — `PhotosGrid.tsx:128-138`. Perte de données. Un `×` de 28px est posé en coin de chaque tuile, là où le pouce se pose pour faire défiler ou ouvrir la photo. `deleteCollectionItem` (`actions/collections.ts:257-277`) supprime le fichier du Storage de manière irréversible. Tous les autres destructifs du périmètre passent par `confirmDelete`. Reco : confirmation, ou mieux un toast « Annuler » de 5 s avant l'appel serveur ; déplacer la suppression dans la lightbox ou derrière un appui long. `/impeccable harden`
- **Import de plusieurs photos (galerie `multiple`) au-delà de 4 Mo** — `AddPhotoButton.tsx:63-79` (FormData brut vers le Server Action), `next.config.ts` `bodySizeLimit: "4mb"`. Même cause que Documents : deux ou trois photos de téléphone font échouer l'envoi. Ici l'erreur est affichée (try/catch), mais le message est technique et rien n'est importé. Le flux de partage (`partage/route.ts:13-30`, Route Handler) bute sur la limite dure de 4,5 Mo des fonctions Vercel. À confirmer sur l'appareil. Reco : compression côté client et/ou upload direct vers Storage. `/impeccable optimize`

*Important (P1)*
- **Miniatures TikTok probablement périssables** — `tiktok.ts:57-66` → `actions/collections.ts:248`. La `thumbnail_url` oEmbed de TikTok pointe vers un CDN signé qui expire (paramètres `x-expires`/`x-signature`, à vérifier sur une ligne réelle). Elle est stockée telle quelle, puis affichée dans la mosaïque et la grille : tuiles vides après quelques jours. Reco : recopier la miniature dans le bucket `collection-images` à l'ajout. `/impeccable harden`
- **L'aperçu charge toutes les photos de toutes les collections** — `actions/collections.ts:73-92` : `select("*, collection_items(url, thumbnail_url, type, ordre)")` puis `slice(0, 4)` et `.length`. Perf. Le payload grossit avec la photothèque entière. Reco : sous-requête limitée (`collection_items(...).limit(4)` via `referencedTable`) + compte `count` séparé. `/impeccable optimize`
- **Lightbox sans sémantique de dialogue** — `ImageLightbox.tsx:49`, `TiktokLightbox.tsx:53`, `YoutubeLightbox.tsx:100` : ni `role="dialog"`/`aria-modal`, ni déplacement du focus, ni Échap. Boutons de 36px (`h-9 w-9`). A11y : le focus reste derrière l'overlay. `/impeccable harden`

*Mineur (P2)*
- **Animations framer sans reduced-motion** — `CollectionsGrid.tsx:22-29` (entrée échelonnée + `whileTap`), `PhotosGrid.tsx:102-110` (`layout`, scale, stagger rejoué à chaque montage). Aucun `MotionConfig reducedMotion="user"` global (vérifié par grep). `/impeccable animate`
- **Ajout photo invisible au clavier et sans focus ring** — `AddPhotoButton.tsx:103-132` (`<label>` pour un input `hidden`), `9-10` et `136-143` (`ADD_PHOTO_BUTTON` sans `focusRing`). `/impeccable harden`
- **Champs sans label** — `AddCollectionToggle.tsx:47` (placeholder seul), `CollectionHeader.tsx:63-68` (renommage). `/impeccable harden`
- **Double squelette et lien retour qui clignote** — `[id]/loading.tsx:10-12` affiche « ‹ Collection », puis le squelette client de `[id]/page.tsx:33-43` le retire pendant `isLoading`, avant qu'il ne revienne dans `CollectionHeader`. Saut visuel. `/impeccable polish`
- **Écran de partage : aucune sortie et des photos orphelines** — `partage/choisir/page.tsx` + `ChoisirCollectionForm.tsx` : pas d'« Annuler » (écran hors du layout `(app)`, donc sans barre de navigation). Les photos sont déjà uploadées par `route.ts:25-30` et restent orphelines dans le Storage si Vincent abandonne. Le bouton « Ajouter » reste actif sans sélection (erreur serveur au lieu d'un désactivé). Liste en `card` sans `role="radio"`/`aria-checked` (`ChoisirCollectionForm.tsx:169-198`). `/impeccable harden`
- **Lightbox TikTok/YouTube : la zone noire autour de la vidéo ne ferme pas** — `TiktokLightbox.tsx:64` (`stopPropagation` sur tout le conteneur plein écran), alors qu'`ImageLightbox` ferme au tap n'importe où. `/impeccable polish`

**Critique UX**
Verdict de spécificité : c'est le module le plus propre au produit (cible de partage Android, liens TikTok/YouTube résolus, morph couverture→détail via des `viewTransitionName` dédiés, mosaïque façon Raindrop à 1/2/3/4 vignettes). La couche d'actions (suppression, ajout) reste en retrait par rapport à ce soin visuel.

| Heuristique | Score |
|---|---|
| 1 Visibilité de l'état | 3 (« Envoi... », squelettes, optimiste) |
| 2 Correspondance monde réel | 4 (appareil photo / galerie / lien vidéo séparés) |
| 3 Contrôle et liberté | 1 (suppression irréversible en un tap, partage sans annulation) |
| 4 Cohérence et standards | 3 |
| 5 Prévention des erreurs | 1 |
| 6 Reconnaissance plutôt que rappel | 4 |
| 7 Flexibilité et efficacité | 3 (partage natif) |
| 8 Esthétique et minimalisme | 3 |
| 9 Récupération après erreur | 2 (messages techniques bruts) |
| 10 Aide | n/a |
| **Total** | **24/36 → 27/40 renormalisé** |

Charge cognitive : 1/8 échec (Une chose à la fois : l'écran de partage mélange la liste des collections existantes et la création d'une nouvelle sans hiérarchie). Aucun point de décision > 4 options hors liste de collections.
Points forts : `FadeInImage` + `sizes` cohérents, mosaïque adaptée au nombre de photos (`CollectionMosaic.tsx`), séparation caméra/galerie documentée (`AddPhotoButton.tsx:42-45`), morph de couverture/titre.
Constats UX : P0/P1 ci-dessus.
Red flags personas :
- *Casey* : il fait défiler la grille au pouce, frôle le `×` noir de 28px et la photo disparaît sans retour.
- *Sam* : lightbox sans focus trap, ajout photo inatteignable au clavier, champ de nom annoncé sans libellé.
- *Vincent en déplacement* : il partage trois photos depuis la galerie Android et l'écran d'erreur Vercel (413) remplace le choix de collection. S'il abandonne, les photos déjà uploadées restent orphelines.

---

#### Module Carburants — `/carburants`
Fichiers couverts : `carburants/page.tsx`, `CarburantsView.tsx`, `lib/carburants/compute.ts`, `actions/carburants.ts`.

**Audit technique**

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Segment actif blanc sur `bg-carburants` ≈ 2,5:1 en sombre ; segments sans `aria-pressed` |
| 2 | Performance | 3 | Nouvelle géolocalisation GPS à chaque changement de rayon (sans `maximumAge`) |
| 3 | Responsive | 3 | Segments d'environ 30px de haut ; cartes station pleine largeur ✓ |
| 4 | Theming | 2 | Couleur de module utilisée comme couleur interactive (One Accent Rule) |
| 5 | Intégrité | 2 | Mismatch d'hydratation sur rayon/tri, résultats plafonnés à 50 sans tri côté API, prix au format anglais |
| **Total** | | **12/20** | **Acceptable** |

**Constats audit**

*Important (P1)*
- **Le segment actif utilise la couleur du module** — `CarburantsView.tsx:170-172, 183-185, 192-194` (`bg-carburants text-white`). Theming, violation nommée : DESIGN.md réserve les couleurs de module « uniquement à colorer l'icône » et exige l'onglet actif en `bg-kcal`. En sombre, `--accent-carburants` (L 0,72) avec du texte blanc donne environ 2,5:1 (échec WCAG AA). Reco : `bg-kcal` (le problème de contraste sombre de `kcal`+blanc est système, voir transverses) ou un token `on-*`, comme `--on-agenda`. `/impeccable colorize`
- **Rayon et tri mémorisés : mauvais segment surligné après hydratation** — `CarburantsView.tsx:77-78`. L'initialiseur lit `localStorage` côté client, alors que le SSR a rendu les valeurs par défaut. Le premier rendu client diffère du HTML serveur uniquement par `className`, et React ne corrige pas les écarts d'attributs à l'hydratation : le segment « 10 km » peut rester surligné alors que la recherche part à 20 km (le commentaire des lignes 73-76 suppose le contraire). Reco : lire dans un `useEffect` ou avec `useSyncExternalStore` (règle `rendering-hydration-no-flicker`). `/impeccable harden`
- **Squelette infini si l'appel échoue** — `CarburantsView.tsx:92-105`. `getStationsProches` ne lève jamais côté serveur, mais l'appel au Server Action lui-même peut rejeter (hors-ligne, coupure réseau, 5xx) : la promesse `void` rejette sans être gérée et `statut` reste bloqué sur « chargement ». C'est justement le scénario « station-service en zone blanche ». Reco : try/catch dans `chercherStations` → `phase: "erreur"`. `/impeccable harden`
- **« Moins cher » calculé sur 50 stations arbitraires** — `actions/carburants.ts:40, 136-137` : `limit=50` sans `order_by`. À 20 ou 50 km autour de Marseille, bien plus de 50 stations correspondent, l'API renvoie 50 enregistrements dans un ordre non garanti, et le tri par prix ou par distance porte sur un échantillon. La station la plus proche ou la moins chère peut manquer, sans que l'interface le signale. Reco : `order_by=distance(geom, geom'POINT(lon lat)')` (ou tri par prix côté ODSQL), voire pagination. `/impeccable harden`

*Mineur (P2)*
- **Prix au format anglais** — `CarburantsView.tsx:246` (`toFixed(3)` → « 1.789 € »), alors que la distance passe par `Intl.NumberFormat("fr-FR")` (`compute.ts:303-311`). Pas de `tabular-nums` pour comparer les prix en colonne. `/impeccable typeset`
- **Segments sans état exposé et bas** — `CarburantsView.tsx:164-198` : pas d'`aria-pressed`, `py-1.5 text-[13px]` ≈ 30px de haut, sans focus ring. `/impeccable harden`
- **Relocalisation complète à chaque changement de rayon** — `CarburantsView.tsx:100-104, 110`. `getCurrentPosition` sans `maximumAge` : nouvelle fixation GPS (jusqu'à 10 s) alors que seul le rayon a changé. Reco : mémoriser la dernière position et passer `maximumAge: 60_000`. `/impeccable optimize`
- **Carburants de types différents comparés entre eux** — `compute.ts:271-280` : le « meilleur prix » d'une station mélange E10, SP95 et SP98, et le tri par prix compare donc de l'E10 à du SP98. Question produit : fixer le carburant du véhicule de Vincent. `/impeccable clarify`
- **Vouvoiement isolé** — `actions/carburants.ts:209` (« Vérifiez votre connexion »), alors que le reste de l'app tutoie (« Réessaie »). `/impeccable clarify`

**Critique UX**
Verdict de spécificité : l'écran répond bien à son intention (repli sur Marseille explicite avec action de relance, rayon et tri mémorisés, lien Maps sur toute la carte). Il sort pourtant de l'identité Kilio (accent de module utilisé comme couleur interactive), et c'est la fiabilité des données, plus que la mise en page, qui limite sa valeur.

| Heuristique | Score |
|---|---|
| 1 Visibilité de l'état | 3 (repli signalé, fraîcheur du prix) mais squelette infini hors-ligne |
| 2 Correspondance monde réel | 3 (types mélangés) |
| 3 Contrôle et liberté | 4 |
| 4 Cohérence et standards | 2 (couleur active, format de prix) |
| 5 Prévention des erreurs | 3 |
| 6 Reconnaissance plutôt que rappel | 4 |
| 7 Flexibilité et efficacité | 3 |
| 8 Esthétique et minimalisme | 3 |
| 9 Récupération après erreur | 2 |
| 10 Aide | n/a |
| **Total** | **27/36 → 30/40 renormalisé** |

Charge cognitive : 0/8 échec. Le choix de rayon affiche 4 options (limite acceptable).
Points forts : logique pure isolée et testable (`lib/carburants/compute.ts`), repli géoloc explicite avec « Réessayer » (`CarburantsView.tsx:201-208`), accès `localStorage` protégé par try/catch, carte station entière cliquable (une entité = un lien).
Red flags personas :
- *Casey* : segments de 30px de haut tapés du pouce en conduisant (à l'arrêt) ; le lien Maps occupe toute la carte, ce qui est bien.
- *Sam* : l'état des segments n'est porté que par la couleur, avec un contraste de 2,5:1 en sombre.
- *Vincent en déplacement* : en zone blanche, le squelette tourne indéfiniment ; en réseau correct, il voit « 10 km » surligné alors que la liste porte sur 20 km, et la station la moins chère peut être absente de l'échantillon de 50.

---

#### Constats transverses observés

1. **Cibles tactiles système sous 44px (P1)** : `ghostButton`/`dangerButton` (`ui.ts:39-49`, `py-1.5 text-sm` ≈ 32px) portent « Modifier / Suppr. » sur chaque carte (NoteCard, DocumentCard, EtiquettesManager, CollectionHeader). Les liens « Annuler » (`text-sm underline`, sans padding : `AddNoteToggle.tsx:53`, `AddDocumentToggle.tsx:43`, `AddCollectionToggle.tsx:59`…) et les retours `‹ Documents`/`‹ Collection` (`linkButton`, sans padding) mesurent environ 20px. Reco : variante `ghostButton` de 44px (sur le modèle de `navArrowButton`) pour les actions de carte. `/impeccable adapt`
2. **Les échecs de `startTransition(async)` font planter la page (P1)** : sans try/catch, l'erreur remonte à `(app)/error.tsx`, qui remplace tout le contenu, formulaire compris : `NoteForm.tsx` (éditeur d'items), `DocumentForm.tsx:202-207`, `DocumentCard.tsx:138`. Les composants qui l'attrapent (`DocumentDetail`, `CollectionHeader`, `EtiquettesManager`, `AddPhotoButton`) montrent le bon motif.
3. **Upload de photos brutes via Server Action plafonné à 4 Mo (P0)** : Documents et Collection compressent seulement côté serveur (sharp), après le passage de la limite `bodySizeLimit: "4mb"` / 4,5 Mo Vercel. Une compression client partagée (un utilitaire unique) règlerait les deux modules et `taches`.
4. **Framer-motion sans `MotionConfig reducedMotion="user"` global (P2)** : seuls `NoteCard` et `AnimatedAddCard` testent `useReducedMotion`. `DocumentCard`, `CollectionsGrid` et `PhotosGrid` animent `y`/`scale`/`layout` sans condition, ce qui contredit « prefers-reduced-motion systématiquement respecté » (DESIGN.md). Un `<MotionConfig reducedMotion="user">` dans le layout couvrirait tout.
5. **Choix binaires réimplémentés sans sémantique (P2)** : trois contrôles segmentés ad hoc aux styles divergents (`NoteForm.tsx:240`, `CarburantsView.tsx:164/179`), des pastilles et puces bascules, et la liste de collections du partage n'exposent pas d'`aria-pressed`/`role="radio"` et n'ont pas de focus ring. Il manque un composant `SegmentedControl` partagé conforme au DESIGN (`surface-alt`, actif `bg-kcal`).
6. **IDs statiques dans des formulaires rendus plusieurs fois (P2)** : `NoteForm` (`titre`, `contenu`), `DocumentForm` (`nom`, `document-fichiers`, `fichier_recto`). Création et édition inline peuvent coexister, et dans Documents un fichier peut alors partir dans le mauvais document. Reco : `useId()`.
7. **Créations non atomiques (P2)** : `createNote` et `createDocument` insèrent la ligne parente avant les dépendances (tags, items, fichiers) et renvoient une erreur sans compenser, donc un doublon au second envoi.
8. **Contraste de `ink-3` (P2)** : environ 3,1:1 sur `background`, utilisé 15 fois comme couleur de texte dans le périmètre (« N photos », sous-titres des cartes d'ajout, « Aucune note ne correspond… », légendes Recto/Verso). Échec AA pour du texte de 11 à 13px. Idem pour le texte blanc sur `kcal`/accents de module en thème sombre (≈ 2,5:1), qui touche `primaryButton` dans tout le système : à traiter au niveau des tokens (`--on-kcal`, comme `--on-agenda`).
9. **Lightbox (P2)** : aucune n'est rendue en portal (piège `fixed` sous un ancêtre transformé, visible dans `DocumentCard`) ; aucune n'a de sémantique de dialogue ; les comportements de fermeture divergent (image : tap partout ; vidéo : bouton seul).
10. **Micro-typographie (P3)** : libellés d'attente en « ... » (`Enregistrement...`, `Création...`, `Envoi...`, `Ajout...`) au lieu de « … », ce qui est incohérent avec les placeholders qui utilisent déjà « … ».


---

## 5. Recommandations et feuille de route (non implémentées)

Plan ordonné par impact pour Vincent, où chaque vague débloque la suivante. Rien de ceci n'a été appliqué dans cette session.

### Vague 1 : les bloquants (données et tâche principale)
1. **`/impeccable shape` puis mise en œuvre : saisie de repas dans le Journal.** Un bouton d'ajout dans la zone du pouce, un sélecteur aliment/recette avec recherche et récents, la quantité en g ou en pièces, la réutilisation de `addJournalEntry`, un « Ajouter au journal » sur la fiche recette relié au compteur de portions, et un raccourci « Repas » dans la QuickAddFab. Mémoriser le type de jour (repos / entraînement) et le propager au dashboard.
2. **`/impeccable harden` : garde-fous de suppression (T2).**
   - Confirmation explicite qui détaille la cascade pour la suppression d'un compte, ou mieux, archivage d'un compte plutôt que suppression.
   - Toast « Annuler » pour les photos, les fichiers de document et les sous-tâches.
   - Explication et confirmation avant d'activer le nettoyage auto.
   - Refus du champ vide dans Objectifs, et possibilité de supprimer une mesure.
3. **`/impeccable harden` : contrat d'erreur des Server Actions (T1).** Les actions retournent `{ ok, error }`, un wrapper client affiche un toast et restaure la saisie, et l'écran n'est plus jamais remplacé par `error.tsx`. Commencer par les sous-tâches (P0), puis Habitudes, Objectifs, Notes et Budget.
4. **`/impeccable optimize` : recherche de transactions.** État local + debounce (≈ 250 ms) + `router.replace` ; sortir `genererOccurrencesDues` du rendu.
5. **`/impeccable harden` : uploads.** Compression et redimensionnement côté client (canvas / `createImageBitmap`) avant envoi, ou upload direct vers Supabase Storage par URL signée ; un seul utilitaire partagé par Documents, Collection et le flux de partage.

### Vague 2 : les correctifs transverses à la source
6. **`/impeccable harden` :** helper de date `Europe/Paris` (T3), `useId()` dans tous les formulaires (T11), gestion du focus de `Modal` et des lightbox (T14).
7. **`/impeccable colorize` + `/impeccable typeset` :** tokens `--on-kcal` / `--on-<module>` (T4), `ink-3` relevé et plancher de 11 px (T5), champs en 16 px (T15).
8. **`/impeccable adapt` :** tokens de boutons à 44 px (T6), conflits de gestes (T13).
9. **`/impeccable polish` :** composant `<SegmentedControl>` unique (T7), `addCardIcon` factorisé (T9), `theme-color` (T16).
10. **`/impeccable document` :** mettre DESIGN.md à jour. Soit documenter les exceptions assumées (couleur interactive de l'Agenda, échelle de priorité des tâches, alertes Budget), soit les retirer du code (T8). Compléter aussi l'échelle typographique documentée (14 px, 17 px, 22 px ou non) : cela supprimerait les 45 faux positifs du détecteur (annexe A).
11. **`/impeccable animate` :** `MotionConfig reducedMotion="user"` global (T10).

### Vague 3 : la performance et la robustesse des données
12. **`/impeccable optimize` :**
    - lectures serveur parallèles plutôt que des Server Actions en série (T12) ;
    - `getTransactions` dans le `Promise.all` de `budget/transactions/page.tsx` ;
    - pagination et agrégats SQL pour les soldes et les séries d'habitudes ;
    - contrainte d'unicité sur les occurrences récurrentes ;
    - `order` + `limit` cohérents pour Carburants ;
    - pas de re-rendu complet par frame de pinch dans l'Agenda.

### Vague 4 : l'UX par module (voir §4)
13. **Budget** (le plus faible en UX, 17/40) :
    - `/impeccable distill` : ajout rapide d'une dépense depuis `/budget` et depuis la FAB ;
    - sous-navigation entre les 7 écrans ;
    - regroupement des transactions par jour ;
    - calendrier lisible (montants abrégés) ;
    - report des budgets cibles d'un mois à l'autre.
14. **Habitudes / Objectifs :** série conservée tant que le jour n'est pas terminé, progression correcte pour un objectif à la baisse (ex. perte de poids), avancement visible dans la liste des objectifs.
15. **Tâches / Agenda :** signal « en retard » sur les cartes, création d'une tâche en tapant un créneau vide de l'Agenda, densité de la vue Mois, drag désactivé pendant une recherche.
16. **Notes / Documents :** éditeur de note en pleine largeur (pas dans la demi-colonne), accès à `/documents/etiquettes` même sans étiquette, badge d'échéance gradué (expiré ≠ ≤ 30 j).
17. **Plus / Réglages :** personnalisation de la barre découvrable (pas seulement par appui long), anti-doublon d'épinglage côté serveur, thème de Réglages persisté en cookie.
18. **`/impeccable polish` :** passe de finition finale, puis **nouvel audit** (`/impeccable audit` + `/impeccable critique`) pour mesurer la progression.

---

## Annexe A : résultats du détecteur déterministe (Assessment B)

Les constats ci-dessous ont été vérifiés un à un dans le code (vrai ou faux positif).

- Lanceur : `sh $IMP/scripts/impeccable detect --json <cibles>` (cwd `/home/user/kilio`), avec `IMP=/root/.claude/skills/synced/e29d789e-…/impeccable`. Il a fonctionné du premier coup : aucun téléchargement, pas besoin du proxy. Les chemins avec parenthèses passent sans problème entre guillemets.
- Le détecteur a chargé automatiquement `DESIGN.md` et `.impeccable/design.json` (pas de `.impeccable/config*.json`, donc aucune règle ignorée).
- Sorties JSON brutes : conservées dans le conteneur de la session uniquement (non versionnées).
- **Visualisation navigateur non effectuée : pas d'environnement Supabase.**

### Clé de classification pour `design-system-font-size` (advisory)

Le détecteur compare les tailles uniquement à la rampe du **frontmatter** de DESIGN.md : display 24px, body 15px, label 12.5px, mono 12px. Or la section *Typography › Hierarchy* de DESIGN.md (l. 155-160) documente aussi Body 14.5px, **Label 12.5–13.5px** et **Caption 10–12px**. D'où :
- **Faux positif** : 10 / 10.5 / 11px (dans la plage Caption documentée) et 13.5px (dans la plage Label documentée).
- **Vrai positif** : 14px (ni Body 14.5 ni Title 15), <10px (8.5 / 9 / 9.5, sous le plancher Caption) et 17 / 22 / 25px (tailles display absentes de la rampe, qui prévoit 24px).

Toutes les règles `design-system-font-size` et `design-system-color` sont **advisory**. Elles ne changent pas le code de sortie, d'où le code 0 alors qu'il y a des constats.

---

### Dashboard `/`
Commande : `sh $IMP/scripts/impeccable detect --json src/app/(app)/Dashboard*.tsx "src/app/(app)/GlobalSearchBar.tsx" "src/app/(app)/QuickAddFab.tsx" "src/app/(app)/page.tsx" "src/app/(app)/layout.tsx" "src/app/(app)/error.tsx" src/app/layout.tsx`
Code de sortie : **0**. Constats : design-system-font-size ×20, design-system-color ×1.

Vrais positifs (15) :
- `src/app/(app)/DashboardHabitItem.tsx:77`, font-size, 9px (streak 🔥), sous le plancher Caption de 10px
- `src/app/(app)/DashboardHabitudesSection.tsx:18`, font-size, 14px (titre de section ; Title = 15px)
- `src/app/(app)/DashboardNutritionSection.tsx:41`, font-size, 14px (titre de section)
- `src/app/(app)/DashboardNutritionSection.tsx:61`, font-size, 9.5px (libellé macro), sous le plancher Caption
- `src/app/(app)/DashboardTachesSection.tsx:50`, font-size, 14px (titre de section)
- `src/app/(app)/DashboardTachesSection.tsx:97`, font-size, 14px en font-display (heure)
- `src/app/(app)/DashboardTachesSection.tsx:100`, font-size, **8.5px** (minutes de l'heure), le plus petit du projet
- `src/app/(app)/DashboardTachesSection.tsx:103`, font-size, 14px en font-display (« -- »)
- `src/app/(app)/DashboardTachesSection.tsx:108`, font-size, 14px (titre de l'événement)
- `src/app/(app)/DashboardTaskItem.tsx:67`, font-size, 14px (nom de tâche ; Body = 14.5px)
- `src/app/(app)/DashboardView.tsx:19`, font-size, 14px (« Aujourd'hui »)
- `src/app/(app)/DashboardView.tsx:32`, font-size, 14px (« Habitudes »)
- `src/app/(app)/GlobalSearchBar.tsx:168`, font-size, 14px (titre de résultat)
- `src/app/(app)/page.tsx:28`, font-size, 25px sur le h1 de salutation (Display = 24px)
- `src/app/layout.tsx:36`, design-system-color, `#292f2d` : `themeColor` sombre. L'hex est un format légitime pour `viewport.themeColor`, mais la valeur vaut ≈ oklch(0.30 0.009 173) alors que le `--background` sombre vaut oklch(0.17 0.016 195). La barre système sera donc nettement plus claire que le fond de l'app en mode sombre. La valeur claire `#f7f6f2` ≈ oklch(0.973 0.005 95) correspond bien au fond et n'est pas signalée.

Faux positifs (6) :
- `DashboardHabitItem.tsx:75` (10px), `DashboardTachesSection.tsx:107` (10px), `GlobalSearchBar.tsx:149` (11px) : plage Caption documentée
- `DashboardHabitudesSection.tsx:30`, `DashboardTachesSection.tsx:70`, `GlobalSearchBar.tsx:141` (13.5px) : plage Label documentée (remarque : il s'agit de textes d'état vide et non de libellés, mais la taille reste documentée)

### Plus `/plus`
Commande : `… detect --json "src/app/(app)/plus" src/components/ModulesGrid.tsx src/components/BottomNav.tsx`
Code de sortie : **0**. Constats : design-system-font-size ×2 (aucun dans `plus/` ni dans ModulesGrid).
- Vrais positifs : aucun
- Faux positifs : `src/components/BottomNav.tsx:102` et `:178` (10px) : libellés de la barre de nav, explicitement cités dans Caption

### Réglages
Commande : `… detect --json "src/app/(app)/reglages"`
Code de sortie : **0**. Constats : design-system-font-size ×5.
- Vrais positifs (5), tous à 14px sur les libellés de ligne de réglage : `reglages/AppearanceRow.tsx:24`, `reglages/NettoyageAutoRow.tsx:62`, `reglages/NotificationsRow.tsx:89`, `reglages/page.tsx:57`, `reglages/page.tsx:66`
- Faux positifs : aucun

### Nutrition
Commande : `… detect --json "src/app/(app)/nutrition" src/components/NutritionSubNav.tsx src/components/ProgressRing.tsx`
Code de sortie : **0**. Constats : design-system-font-size ×7.
- Vrai positif : `nutrition/recettes/[id]/RecetteHeader.tsx:47`, 22px font-display (titre de détail ; Display = 24px)
- Faux positifs :
  - `nutrition/journal/JournalEntriesList.tsx:38` (10.5px), `nutrition/journal/ResumeJour.tsx:126` (11px), `nutrition/recettes/[id]/RecetteMacros.tsx:83` (10px) : Caption
  - `nutrition/journal/JournalNavigationJour.tsx:53`, `nutrition/recettes/[id]/RecetteMacros.tsx:54`, `src/components/NutritionSubNav.tsx:23` (13.5px) : Label (les onglets de sous-nav sont explicitement cités)

### Tâches
Commande : `… detect --json "src/app/(app)/taches"`
Code de sortie : **0**. Constats : design-system-font-size ×6.
- Vrais positifs : aucun
- Faux positifs :
  - `taches/AddTaskForm.tsx:60` (11px, badge ×), `taches/TasksList.tsx:441` (11px, badge priorité) : Caption
  - `taches/TachesView.tsx:189`, `:201`, `:243` et `taches/TasksList.tsx:144` (13.5px) : Label

### Agenda
Commande : `… detect --json "src/app/(app)/agenda"`
Code de sortie : **0**. Constats : design-system-font-size ×9.
- Vrais positifs : aucun
- Faux positifs (9, tous en 10 ou 11px, donc Caption) : `agenda/MonthView.tsx:76`, `:111` ; `agenda/TacheBlock.tsx:77` ; `agenda/TimeGrid.tsx:180`, `:189` ; `agenda/WeekView.tsx:149`, `:150`, `:162`, `:168`

### Habitudes
Commande : `… detect --json "src/app/(app)/habitudes"`
Code de sortie : **0**. Constats : design-system-font-size ×1.
- Faux positif : `habitudes/HistoriqueView.tsx:123` (11px, en-têtes de jours) : Caption

### Objectifs
Commande : `… detect --json "src/app/(app)/objectifs"`
Code de sortie : **0**. Constats : design-system-font-size ×1.
- Vrai positif : `objectifs/[id]/ObjectifHeader.tsx:68`, 22px font-display (titre de détail)

### Courses
Commande : `… detect --json "src/app/(app)/courses"`
Code de sortie : **0**. **Aucun constat.**

### Budget
Commande : `… detect --json "src/app/(app)/budget"`
Code de sortie : **0**. Constats : design-system-font-size ×12.
- Vrai positif : `budget/page.tsx:179`, 14px (titre de carte)
- Faux positifs :
  - `budget/calendrier/page.tsx:58` (11px), `:93` (10px) et `budget/statistiques/page.tsx:73` (11px) : Caption
  - `budget/categories/CategorieProgressCard.tsx:26`, `budget/categories/CategoriesList.tsx:18` et `budget/page.tsx:72`, `:79`, `:86`, `:125`, `:159`, `:202` (13.5px, pilules/liens) : Label

### Notes
Commande : `… detect --json "src/app/(app)/notes"`
Code de sortie : **0**. **Aucun constat.**

### Documents
Commande : `… detect --json "src/app/(app)/documents"`
Code de sortie : **0**. Constats : design-system-font-size ×2.
- Vrai positif : `documents/[id]/DocumentDetail.tsx:64`, 22px font-display (titre de détail)
- Faux positif : `documents/DocumentForm.tsx:71` (11px, badge ×) : Caption

### Collection
Commande : `… detect --json "src/app/(app)/collection" src/app/collection`
Code de sortie : **0**. Constats : design-system-font-size ×3.
- Vrai positif : `src/app/(app)/collection/[id]/CollectionHeader.tsx:76`, 22px font-display (titre de détail)
- Faux positifs : `src/app/(app)/collection/[id]/PhotosGrid.tsx:38` et `src/app/collection/partage/choisir/page.tsx:68` (10px, badges sur photo) : Caption

### Carburants
Commande : `… detect --json "src/app/(app)/carburants"`
Code de sortie : **0**. Constats : design-system-font-size ×2.
- Vrai positif : `carburants/CarburantsView.tsx:238`, 17px font-display (prix)
- Faux positif : `carburants/CarburantsView.tsx:239` (11px) : Caption

### Composants partagés
Commande : `… detect --json src/components/{AnimatedAddCard,AppResumeRefresh,CheckToggle,ErrorState,FadeInImage,ImageLightbox,Modal,PullToRefresh,ServiceWorkerRegister,TabSwipeWrapper,ThemeToggle,TiktokLightbox,TransitionLink,YoutubeLightbox}.tsx src/components/skeletons src/components/toast`
Code de sortie : **2**. Constats : layout-transition ×1 (warning, **seul constat bloquant de tout l'audit**), design-system-font-size ×1.
- Vrais positifs :
  - `src/components/PullToRefresh.tsx:98`, **layout-transition** (warning) : `transition: isPulling ? "none" : "height 0.2s ease-out"` sur l'espaceur du pull-to-refresh. Animer `height` provoque un reflow à chaque frame pendant le retour élastique, alors qu'un `transform: translateY` ferait le même effet. Impact mineur (200ms, seulement au relâcher), mais le constat est réel.
  - `src/components/ErrorState.tsx:38`, font-size, 17px font-display (titre d'erreur)
- Faux positifs : aucun

---

### Récapitulatif règle × module (total, dont VP / FP)

| Module | Code de sortie | design-system-font-size | design-system-color | layout-transition | Total VP | Total FP |
|---|---|---|---|---|---|---|
| Dashboard | 0 | 20 (14 VP / 6 FP) | 1 (1 VP) | 0 | 15 | 6 |
| Plus | 0 | 2 (0 / 2) | 0 | 0 | 0 | 2 |
| Réglages | 0 | 5 (5 / 0) | 0 | 0 | 5 | 0 |
| Nutrition | 0 | 7 (1 / 6) | 0 | 0 | 1 | 6 |
| Tâches | 0 | 6 (0 / 6) | 0 | 0 | 0 | 6 |
| Agenda | 0 | 9 (0 / 9) | 0 | 0 | 0 | 9 |
| Habitudes | 0 | 1 (0 / 1) | 0 | 0 | 0 | 1 |
| Objectifs | 0 | 1 (1 / 0) | 0 | 0 | 1 | 0 |
| Courses | 0 | 0 | 0 | 0 | 0 | 0 |
| Budget | 0 | 12 (1 / 11) | 0 | 0 | 1 | 11 |
| Notes | 0 | 0 | 0 | 0 | 0 | 0 |
| Documents | 0 | 2 (1 / 1) | 0 | 0 | 1 | 1 |
| Collection | 0 | 3 (1 / 2) | 0 | 0 | 1 | 2 |
| Carburants | 0 | 2 (1 / 1) | 0 | 0 | 1 | 1 |
| Composants partagés | **2** | 1 (1 / 0) | 0 | 1 (1 / 0) | 2 | 0 |
| **Total** | | **71 (26 / 45)** | **1 (1 / 0)** | **1 (1 / 0)** | **28** | **45** |

Tendances parmi les vrais positifs :
- **14px est une taille « fantôme » répandue** (titres de section du dashboard, libellés de réglages, titre de carte budget, 16 occurrences). Elle n'apparaît nulle part dans DESIGN.md : il faut soit l'aligner sur Title 15 / Body 14.5, soit la documenter.
- **Titres d'écran de détail à 22px** (Recette, Objectif, Document, Collection, 4 occurrences), **h1 du dashboard à 25px**, et **17px** pour ErrorState et le prix carburant. Aucune de ces tailles display n'est documentée (la rampe prévoit 24px).
- **Micro-tailles sous 10px** sur le dashboard : 8.5 / 9 / 9.5px.
- **themeColor sombre** désaccordé avec le fond sombre.

### Erreurs et limitations
- Aucune erreur d'exécution. Les 15 scans ont abouti (stderr vide).
- Le détecteur ne lit que la rampe typographique du frontmatter de DESIGN.md, pas les plages documentées en prose (Label 12.5–13.5, Caption 10–12). C'est l'origine de la majorité des faux positifs (45 sur 73). On pourrait les supprimer via `detector.ignoreValues` ou en complétant le frontmatter.
- Les constats de font-size et de couleur sont advisory : un code de sortie 0 ne signifie pas « aucun constat ».
- Les fichiers `.ts` sans balisage (`today.ts`, `toast-store.ts`) et les CSS seuls (`globals.css`) ne sont pas scannés en tant que cibles, conformément à la consigne.
- Visualisation navigateur non effectuée : pas d'environnement Supabase. Le détecteur a donc tourné uniquement en mode statique (fichiers), pas en mode URL.
