# Audit de performance React/Next.js — Kilio

**Date :** 2026-09-26
**Portée :** modules actifs listés dans `src/lib/navigation/registry.ts` (registre unique consommé par `BottomNav` et `/plus`) — Accueil, Nutrition, Tâches, Agenda, Courses, Budget, Objectifs, Collection, Notes, Réglages, Carburants, Documents.
**Référentiel :** checklist `vercel-react-best-practices` (70 règles / 8 catégories — waterfalls `async-*`, bundle size `bundle-*`, server-side `server-*`, client fetching `client-*`, re-renders `rerender-*`, rendering `rendering-*`, micro-perf JS `js-*`, avancé `advanced-*`).
**Méthode :** lecture exhaustive des Server Actions (`src/app/actions/`), des pages/composants clients de chaque module et des fonctions `compute.ts`, sans exécution ni modification de code.
**⚠️ Aucun fichier de code n'a été modifié.** Ce rapport ne contient que des constats et des correctifs proposés.

---

## Résumé exécutif

- **Nutrition**, censé être la référence architecturale, tient globalement sa promesse (shell statique + `Suspense` par section, `Promise.all` pour les lectures indépendantes) mais **ne suit pas totalement son propre modèle** : `lireJourJournal()` est appelé indépendamment par 4 composants sous `Suspense` sur la même page, et retombe sur une requête Supabase non dédupliquée (`getJourTypeJournal`), qui s'exécute donc jusqu'à 4× par chargement de page.
- Le **Dashboard (Accueil)** est le module le mieux construit du repo : shell statique, une carte = un Server Component async sous son propre `Suspense`, `prefetchQuery` + `HydrationBoundary`, formulaires lourds en `next/dynamic` avec préchargement au survol. Aucun problème bloquant.
- **Budget** et **Habitudes** (vue "aujourd'hui") suivent correctement le pattern Nutrition/Dashboard (RSC + `Suspense` + `Promise.all` + `React.cache()`).
- **Tâches**, **Agenda**, **Objectifs**, **Courses** divergent du modèle de référence : ce sont des arbres 100 % client (`"use client"` en tête de page, aucun `prefetchQuery`/`HydrationBoundary` côté serveur), ce qui ajoute un waterfall hydratation → fetch à chaque visite, alors que le Dashboard prouve que le pattern inverse est déjà maîtrisé dans ce même repo.
- Plusieurs composants de ligne de liste (`TaskCard`, `ObjectifCard`, `CourseItemRow`, `HabitudeCard`) ne sont **pas mémoïsés** malgré un rendu en `.map()` avec state local, provoquant un re-render de toute la liste à chaque mutation optimiste d'un seul élément.
- Plusieurs **Server Actions d'upload** (Collection, Documents) et une **boucle de génération de récurrences** (Budget) traitent des opérations indépendantes en série (`for...await`) au lieu de `Promise.all`.
- `DocumentForm` (formulaire lourd) est importé statiquement partout, contrairement à `NoteForm` équivalent qui utilise déjà `next/dynamic(..., { ssr: false })` — incohérence directe et facilement corrigible.
- **Aucune authentification** n'existe sur les Server Actions (choix architectural mono-utilisateur assumé, cf. `AGENTS.md`/contexte produit) — signalé une fois pour mémoire, pas par module.

**Bilan sévérité :** 0 bloquant strict au sens "casse la fonctionnalité", mais plusieurs **notables** à fort impact perçu (waterfalls d'upload, absence de prefetch serveur sur 4 modules, requête dupliquée 4× sur Nutrition) qui méritent d'être traités avant les mineurs.

---

## 1. Nutrition (module de référence)

**Bilan :** Bonne architecture générale (shell statique + `Suspense` par section, `Promise.all` dans `JournalJour`), mais ne suit pas intégralement son propre modèle : une requête est dupliquée 4× par page.

| # | Sévérité | Fichier | Règle | Problème | Correctif proposé |
|---|----------|---------|-------|----------|---------------------|
| N1 | **Notable** | `src/app/(app)/nutrition/journal/jour.ts:24-31` (`lireJourJournal`), appelé depuis `JournalJour.tsx:22-38` (`JournalDateLibelle`, `JournalJourNavigation`, `JournalJourOnglets`, `JournalJour`) ; DB call dans `src/app/actions/journal.ts:39-46` (`lireJourTypeMemorise` / `getJourTypeJournal`) | `server-cache-react` | `lireJourJournal` est invoqué indépendamment par 4 Server Components sous `Suspense` sur le même rendu de page. Sans `?jour=`, chacun déclenche un `await getJourTypeJournal(date)` non caché → la même ligne `journal_jours` est lue jusqu'à 4 fois par chargement. | Envelopper `getJourTypeJournal` (ou `lireJourTypeMemorise`) dans `React.cache()` pour dédupliquer automatiquement les appels au sein de la même requête. |

---

## 2. Accueil / Dashboard

**Bilan :** Architecture exemplaire, aucun problème structurant trouvé. À utiliser comme référence à la place de "Nutrition" si un futur audit doit désigner un modèle canonique.

| # | Sévérité | Fichier | Règle | Problème | Correctif proposé |
|---|----------|---------|-------|----------|---------------------|
| D1 | Mineur (informatif) | `src/app/(app)/DashboardTaskItem.tsx`, `src/app/(app)/DashboardHabitItem.tsx` | `rerender-memo` | Même absence de mémoïsation que `TaskCard` (voir T2), mais impact faible : les listes du dashboard sont limitées à 4 éléments (`DashboardTachesSection.tsx:29`, `tachesAffichees.slice(0, 4)`). | Optionnel — `React.memo` par cohérence si la liste s'agrandit un jour ; priorité basse. |

Points positifs vérifiés (non actionnables) : `page.tsx` = shell statique ; chaque carte (`DashboardNutritionCard`, `DashboardTachesCard`, `DashboardHabitudesCard`) est un Server Component async sous son propre `Suspense`, avec `prefetchQuery` + `HydrationBoundary` vers une section client ; `QuickAddFab.tsx` charge tous les formulaires lourds via `next/dynamic({ ssr: false })` avec préchargement au survol/focus/idle.

---

## 3. Tâches

**Bilan :** Diverge du modèle de référence Dashboard/Nutrition — arbre 100 % client sans prefetch serveur. `TaskCard` non mémoïsé.

| # | Sévérité | Fichier | Règle | Problème | Correctif proposé |
|---|----------|---------|-------|----------|---------------------|
| T1 | **Notable** | `src/app/(app)/taches/page.tsx:1-17`, `TachesView.tsx:70-75` | `async-suspense-boundaries` / `server-parallel-fetching` | `taches`, `listes`, `tags` sont fetchés uniquement côté client via `useQuery` après hydratation, alors que le Dashboard préchauffe déjà `getTachesAvecRelations` côté serveur avec `HydrationBoundary`. Chaque visite de `/taches` attend le téléchargement JS + l'hydratation avant même de démarrer le fetch. | Faire de `page.tsx` un Server Component async qui appelle `queryClient.prefetchQuery` pour `taches`/`listes`/`tags` et enveloppe `TachesView` dans `<HydrationBoundary>`, en gardant `TachesView` comme consommateur client du cache pré-rempli. |
| T2 | **Notable** | `src/app/(app)/taches/TasksList.tsx:264-602` (`TaskCard`) | `rerender-memo` | `TaskCard` n'est pas enveloppé dans `React.memo`. Les mutations optimistes (toggle/suppression, lignes 358-371 et 384-397) recréent le tableau `taches` via `.map()`/`.filter()`, donc **toute** carte re-render à chaque mutation d'une seule tâche (re-instanciation de 2 `useMutation`, `useSortable`, calculs framer-motion). | Envelopper `TaskCard` avec `React.memo` ; les entrées non modifiées du tableau gardent la même référence après le `.map()`, ce qui suffit à stopper les re-renders inutiles. |
| T3 | Mineur | `src/app/actions/taches.ts:228-231` (`createTache`), `:294-297` (`updateTache`) | `async-dependencies` | `resolveTagIds(supabase, tagIds, nouveauxNoms)` ne dépend que de `formData` (disponible immédiatement), mais est attendu strictement après l'insert/update de la tâche, alors qu'il pourrait démarrer en parallèle. | Démarrer `resolveTagIds(...)` en parallèle de l'insert/update via `Promise.all`, puis injecter les IDs résolus dans `syncTachesTags`. |

---

## 4. Agenda

**Bilan :** Même pattern 100 % client que Tâches (pas de prefetch serveur). Bonne gestion du geste de zoom (refs + rAF), mais recalculs de layout non mémoïsés à chaque frame de zoom.

| # | Sévérité | Fichier | Règle | Problème | Correctif proposé |
|---|----------|---------|-------|----------|---------------------|
| A1 | **Notable** | `src/app/(app)/agenda/page.tsx:1-17`, `AgendaView.tsx:78-104` | `async-suspense-boundaries` / `server-parallel-fetching` | 5 requêtes (`taches`, `listes`, `tags`, `planningTravail`, `planningTravailExceptions`) sont fetchées uniquement côté client, sans prefetch/streaming serveur — même divergence que Tâches. | Prefetch serveur des 5 requêtes dans `page.tsx` + `HydrationBoundary`, comme pour Tâches. |
| A2 | **Notable** | `DayView.tsx:55-64` (`dayTachesJour`/`dayTaches`/`dayTachesArchivees`/`dayTachesAvecHeure`/`dayTachesSansHeure`/`positions`) ; `WeekView.tsx:127-133` (même pattern répété ×7 jours) | `rerender-memo` | Plusieurs `.filter()`/`.sort()` et l'algorithme `layoutChevauchements` (O(n log n)) sont recalculés à **chaque rendu**, y compris à chaque frame `requestAnimationFrame` du pinch-zoom (`useAgendaZoom`), alors qu'ils ne dépendent que de `taches`/`selectedDate`/`creneaux`, jamais de `zoom`. | Envelopper les listes dérivées et le résultat de `layoutChevauchements(...)` dans `useMemo` avec dépendances `[taches, selectedDate, creneaux, exceptions]`, indépendant de `zoom`. |
| A3 | Mineur | `useAgendaZoom.ts:34-38` (`readStoredZoom`), `:150` (`localStorage.setItem` dans `onTouchEnd`) | `client-localstorage-schema` | Accès `localStorage` sans `try/catch` : lève une exception en navigation privée Safari/Firefox ou stockage plein/désactivé, cassant le pinch-zoom au lieu de dégrader proprement. | Envelopper la lecture dans `readStoredZoom` et l'écriture dans `onTouchEnd` dans `try/catch`, avec repli sur `DEFAULT_ZOOM` / écriture silencieusement ignorée en cas d'échec. |

---

## 5. Budget

**Bilan :** Le module le plus abouti après le Dashboard — `Promise.all` pour les lectures indépendantes, `React.cache()` pour la dédup des occurrences récurrentes, `Suspense` pour le streaming. Un seul vrai défaut : boucle séquentielle sur le chemin critique.

| # | Sévérité | Fichier | Règle | Problème | Correctif proposé |
|---|----------|---------|-------|----------|---------------------|
| B1 | **Notable** | `src/app/actions/transactions-recurrentes.ts:318-353` (`for (const modele of recurrences) { ... }`, `await insert(occurrences)` L.337, `await update(...)` L.347-350) | `async-parallel` | Chaque modèle récurrent actif est traité en série (insert puis update awaités dans la boucle), alors que les modèles sont indépendants. Cette fonction est attendue **avant** que le contenu sous `Suspense` de la page Budget commence à fetcher (`requete.ts` → `budget/page.tsx:101`) — donc N récurrences en retard coûtent N allers-retours séquentiels à **chaque** chargement de `/budget` et `/budget/transactions`. | Construire une promesse insert/update par modèle et les lancer avec `Promise.all` au lieu de les attendre dans la boucle ; conserver la levée d'erreur DB via une vérification post-boucle des promesses résolues. |

Points positifs vérifiés (non actionnables) : `getComptesAvecSolde`, `getSuiviCategories`, `getImpactSuppressionCompte` batchent déjà correctement leurs appels Supabase indépendants via `Promise.all` ; `genererOccurrencesDuesPourLaRequete` est dédupliqué par requête via `React.cache()` ; la page Budget utilise `connection()` + `Suspense` pour garder le shell hors du waterfall.

---

## 6. Objectifs

**Bilan :** Fonctionnellement correct (TanStack Query + mutations optimistes) mais 100 % client sans prefetch serveur, et carte de liste non mémoïsée.

| # | Sévérité | Fichier | Règle | Problème | Correctif proposé |
|---|----------|---------|-------|----------|---------------------|
| O1 | **Notable** | `src/app/(app)/objectifs/page.tsx:1-14`, `ObjectifsList.tsx:66-91` | `async-suspense-boundaries` | Contrairement à Budget (fetch RSC streamé sous `Suspense`), la page Objectifs est un shell serveur statique qui ne rend rien d'utile, expédie le JS, hydrate, puis déclenche `useQuery(getObjectifs)` côté client — un waterfall hydratation → fetch complet ajouté à chaque chargement. | Précharger `getObjectifs()` côté serveur dans la page (`queryClient.prefetchQuery` + `HydrationBoundary`) pour que TanStack Query démarre avec un cache chaud, sans toucher aux mutations/offline-queue client existantes. |
| O2 | **Notable** | `ObjectifCard.tsx:29` (définition), utilisé depuis `ObjectifsList.tsx:51-53` | `rerender-memo` | `ObjectifCard` est rendu dans un `.map()` mais n'est pas enveloppé dans `memo()`. Toute mutation qui remplace le tableau du cache `objectifs` (refetch/invalidate) re-render toutes les cartes, pas seulement celle modifiée. | Exporter `const ObjectifCard = memo(function ObjectifCard(...) {...})` ; le prop `objectif` provient déjà d'un objet plat du cache, la stabilité référentielle tient pour les lignes non modifiées. |

---

## 7. Courses

**Bilan :** Même architecture 100 % client que Objectifs, plus un vrai waterfall séquentiel dans la réactivation d'articles archivés, et la même absence de mémoïsation sur la ligne de liste.

| # | Sévérité | Fichier | Règle | Problème | Correctif proposé |
|---|----------|---------|-------|----------|---------------------|
| C1 | **Notable** | `src/app/actions/courses.ts:133-140` (`ajouterArticlesCourses`) | `async-parallel` | Chaque article archivé correspondant à un libellé soumis est réactivé via une boucle `for` séquentielle (`await update` par article), au lieu de lancer les mises à jour indépendantes en parallèle. | Construire un tableau de promesses `update` à partir de `plan.aReactiver` et `await Promise.all(...)`, en vérifiant les erreurs après coup (pattern déjà utilisé correctement dans `deplacerEtape` de `objectifs.ts:266-269`). |
| C2 | **Notable** | `CourseItemRow.tsx:20` (définition), utilisé depuis `CoursesList.tsx:37-39` et `ArchivedCoursesSection.tsx:118-120` | `rerender-memo` | Même problème que `ObjectifCard` : `CourseItemRow` n'est pas mémoïsé bien qu'utilisé dans deux `.map()` différents et qu'il porte un state local (`renaming`/`draft`) qui bénéficierait de ne pas re-render sur des changements de fratrie sans rapport. | Envelopper avec `memo()` ; le prop `item` garde déjà des références stables pour les lignes non modifiées (cf. mises à jour optimistes dans `AddCourseForm.tsx`/`CourseItemRow.tsx`). |
| C3 | **Notable** | `src/app/(app)/courses/page.tsx:1-11`, `CoursesView.tsx`, `CoursesList.tsx:13-17` | `async-suspense-boundaries` | Même pattern 100 % client que Objectifs — `getCoursesItems` n'est appelé que via `useQuery` dans un arbre `"use client"`, sans prefetch serveur. | Précharger `getCoursesItems()` côté serveur dans `page.tsx` et hydrater le query client avant de rendre `CoursesView` (même correctif qu'Objectifs). |

---

## 8. Habitudes

**Bilan :** La vue "aujourd'hui" suit correctement le modèle Budget/Nutrition (RSC + `connection()` + `Suspense`). L'historique, en revanche, réimplémente son propre fetching à la main au lieu d'utiliser TanStack Query, et la carte de liste n'est pas mémoïsée.

| # | Sévérité | Fichier | Règle | Problème | Correctif proposé |
|---|----------|---------|-------|----------|---------------------|
| H1 | **Notable** | `HistoriqueView.tsx:46-57` | `client-swr-dedup` | `HistoriqueView` fetche `getHistoriqueHabitude` via un `useEffect` + `.then()` brut avec un garde-fou de course manuel (`annule`), au lieu du setup TanStack Query standardisé partout ailleurs (Objectifs, Courses, Habitudes du jour). Chaque changement d'habitude ou de mois déclenche une requête réseau non cachée, même si la paire `(habitudeId, mois)` a déjà été fetchée juste avant (ex. va-et-vient entre deux mois, ou entre onglets "Aujourd'hui"/"Historique" qui remonte le state). | Remplacer l'effet manuel par `useQuery({ queryKey: queryKeys.habitudeHistorique(habitudeId, debut, fin), queryFn: () => getHistoriqueHabitude(habitudeId, debut, fin) })`, ce qui apporte gratuitement cache/dédup/sécurité de course et supprime le flag d'annulation fait main. |
| H2 | **Notable** | `HabitudeCard.tsx:16` (définition), utilisé depuis `HabitudesView.tsx:62-64` | `rerender-memo` | Même absence de mémoïsation que `ObjectifCard`/`CourseItemRow` : `HabitudeCard` porte un state local (`editing`, `valeurInput`) et est rendu en `.map()`, mais n'est pas enveloppé dans `memo()`, donc toute invalidation de liste re-render toutes les cartes. | Envelopper avec `memo()` ; les objets `habitude` issus de `getHabitudesDuJour`/du cache gardent déjà une référence stable pour les lignes non modifiées via les mises à jour optimistes de ce même fichier. |

Points positifs vérifiés (non actionnables) : la vue "aujourd'hui" utilise déjà `connection()` + `Suspense`, même pattern gagnant que Budget.

---

## 9. Collection

**Bilan :** Aucun bloat de bundle côté client (pas de cropper/galerie lourde chargée en dur — `FadeInImage` en wrapper léger de `next/image`, lightboxes vidéo en iframes oEmbed officielles). Le vrai problème est côté serveur : upload de photos séquentiel.

| # | Sévérité | Fichier | Règle | Problème | Correctif proposé |
|---|----------|---------|-------|----------|---------------------|
| CO1 | **Notable** | `src/app/actions/collections.ts:209-218` (`uploadCollectionPhotos`) | `async-parallel` | Boucle `for (const fichier of fichiers) { await compresserEtUploaderPhoto(...); await insert(...) }` : chaque photo est compressée puis uploadée en série. Un upload de N photos prend N× la latence d'une seule compression+upload Supabase Storage. | Lancer `compresserEtUploaderPhoto` pour tous les fichiers via `Promise.all`, puis faire un seul `insert` groupé de toutes les lignes (calculer `ordre` pour chaque item à partir de son index avant l'insert groupé). |
| CO2 | **Notable** | `src/app/actions/collections.ts:285-292` (`uploaderPhotosPartagees`) | `async-parallel` | Même boucle séquentielle que ci-dessus pour le partage de photos. | `Promise.all(fichiers.map(f => compresserEtUploaderPhoto(supabase, f)))`. |
| CO3 | Mineur | `src/app/(app)/collection/[id]/PhotosGrid.tsx:10-12` (imports de `ImageLightbox`, `TiktokLightbox`, `YoutubeLightbox`) | `bundle-dynamic-imports` | Les 3 overlays lightbox ne sont rendus que sur interaction (state `lightboxItem`) mais sont importés statiquement — leur code est expédié même pour les utilisateurs qui n'ouvrent jamais de lightbox. Impact faible (pas de librairie tierce lourde), mais évitable. | Envelopper chacun dans `next/dynamic` avec `ssr: false`, cohérent avec le pattern Notes/Documents. |
| CO4 | Mineur | `src/app/collection/partage/route.ts:39-54` | `async-parallel` | L'upload photo (`uploaderPhotosPartagees`) et la résolution de métadonnées vidéo (`recupererLienVideoPartage`) sont indépendants mais attendus en série. Impact réel faible (un partage est presque toujours l'un ou l'autre), mais quand les deux sont présents les deux allers-retours sont sérialisés inutilement. | Démarrer les deux promesses immédiatement (`photosPromise`/`videoPromise` conditionnels) et les attendre ensemble avant de construire l'URL de redirection. |
| CO5 | Mineur | `src/app/(app)/collection/[id]/page.tsx:1-65` vs `src/app/(app)/documents/[id]/DocumentDetail.tsx` | Rendering — frontière Server/Client | La page détail Collection est entièrement `"use client"` avec fetch TanStack Query côté client (choix documenté en commentaire, pour partager le cache avec une mutation optimiste) — même le shell statique attend l'hydratation + un fetch client avant de peindre quoi que ce soit, contrairement à Documents qui fetche côté serveur (Server Component async) et passe les données en props. Choix architectural délibéré, pas un bug. | Si le bénéfice de cache partagé est conservé, aucun changement n'est strictement nécessaire ; si le temps de chargement perçu de `/collection/[id]` devient un problème, envisager un hybride : fetch initial côté serveur + hydratation du cache TanStack Query via `initialData`/dehydrate, en gardant les mutations client sur le même cache. |

---

## 10. Notes

**Bilan :** Module propre — aucune violation significative trouvée. `NoteForm` est déjà en `next/dynamic({ ssr: false })` depuis `NoteCard` et `AddNoteToggle`, les actions utilisent `Promise.all` pour le swap de réordonnancement, les snapshots de mise à jour optimiste sont scopés étroitement.

Aucun correctif proposé pour ce module.

---

## 11. Documents

**Bilan :** Fetch serveur parallèle correct (`Promise.all` en liste et détail), mais incohérence de bundle : `DocumentForm` (bien plus lourd que l'équivalent `NoteForm`) est importé statiquement partout, alors que `NoteForm` utilise déjà `next/dynamic`. Même waterfall d'upload que Collection.

| # | Sévérité | Fichier | Règle | Problème | Correctif proposé |
|---|----------|---------|-------|----------|---------------------|
| DO1 | **Notable** | `src/app/(app)/documents/DocumentCard.tsx:7` et `AddDocumentToggle.tsx:4` (`import { DocumentForm } from "./DocumentForm"`) | `bundle-dynamic-imports` | `DocumentForm` (400+ lignes : sélecteurs de fichiers, slots recto/verso, aperçus image, compression client) est importé statiquement dans chaque ligne de liste de documents et dans le toggle "Ajouter", donc tout son code est expédié dans le bundle initial alors que le formulaire n'apparaît que sur tap "Modifier"/"Ajouter". Contredit directement le pattern déjà correct de `NoteForm` équivalent (`next/dynamic(..., { ssr: false })` dans `NoteCard.tsx:19` et `AddNoteToggle.tsx:10`). | Remplacer les imports statiques par `const DocumentForm = dynamic(() => import("./DocumentForm").then(m => m.DocumentForm), { ssr: false })` dans les deux fichiers, à l'identique du pattern Notes. |
| DO2 | **Notable** | `src/app/actions/documents.ts:124-151` (`uploadDocumentFichiers`) | `async-parallel` | Deux boucles `for` séquentielles (recto/verso, puis `fichiers` génériques) attendent chacune `uploaderFichier` puis insèrent une ligne à la fois, sérialisant des uploads Supabase Storage (compression `sharp` + aller-retour storage par fichier) qui pourraient être concurrents. | Paralléliser chaque boucle avec `Promise.all`, en gardant l'assignation de `ordre` déterministe via un mapping sur l'index avant l'insert groupé. |

---

## 12. Carburants

**Bilan :** Propre. Un seul fetch externe, logique `compute.ts` entièrement synchrone et pure, la vue client ne re-fetch que sur action utilisateur explicite (changement de rayon/géoloc) via un effet bien scopé.

Aucun correctif proposé pour ce module.

---

## 13. Réglages

**Bilan :** Propre. Page triviale, un seul fetch serveur, îlots clients isolés et bien scopés (`AppearanceRow`, `NotificationsRow`, `NettoyageAutoRow`), aucune frontière `"use client"` excessive, aucun waterfall.

Aucun correctif proposé pour ce module.

---

## 14. Recherche globale / Recettes (support transverse)

**Bilan :** Propre. `rechercheGlobale` utilise déjà `Promise.allSettled` pour ses 6 requêtes de tables indépendantes. Les 4 fichiers `recette-*.ts` sont des CRUD simples sans chaînage d'awaits à signaler ; `reorderIngredientsLibres` parallélise déjà via `Promise.all`.

Aucun correctif proposé pour ce module.

---

## 15. Constat transverse — authentification des Server Actions

| # | Sévérité | Fichier | Règle | Problème | Correctif proposé |
|---|----------|---------|-------|----------|---------------------|
| X1 | Notable (contextuel) | Les 24 fichiers de `src/app/actions/` (aucune vérification de session/`auth()`, aucun `middleware.ts` dans le repo) | `server-auth-actions` | Aucune Server Action ne vérifie d'authentification/autorisation — chacune est un point d'entrée public non protégé (utilisant `createAdminClient`, donc la clé service-role Supabase). Cohérent avec le choix produit assumé "mono-utilisateur sans auth/RLS" (page Réglages avec "Vincent" en dur, tables sans `user_id`) — signalé une fois pour mémoire, pas comme un bug par module. | Si l'app reste strictement privée (non exposée publiquement), documenter explicitement ce choix (accès derrière un gate applicatif/VPN au niveau plateforme) ; si elle devient accessible publiquement, ajouter une vérification de session (même un cookie à secret partagé) dans chaque Server Action. |

---

## Récapitulatif par sévérité

**Notable (14) :**
N1 (Nutrition — requête dupliquée 4×), T1 (Tâches — pas de prefetch serveur), T2 (Tâches — `TaskCard` non mémoïsé), A1 (Agenda — pas de prefetch serveur), A2 (Agenda — layout non mémoïsé), B1 (Budget — boucle récurrences séquentielle), O1 (Objectifs — pas de prefetch serveur), O2 (Objectifs — `ObjectifCard` non mémoïsé), C1 (Courses — réactivation séquentielle), C2 (Courses — `CourseItemRow` non mémoïsé), C3 (Courses — pas de prefetch serveur), H1 (Habitudes — historique sans TanStack Query), H2 (Habitudes — `HabitudeCard` non mémoïsé), CO1/CO2 (Collection — upload séquentiel), DO1 (Documents — `DocumentForm` non dynamique), DO2 (Documents — upload séquentiel), X1 (absence d'auth, contextuel).

**Mineur (5) :** T3 (Tâches — `resolveTagIds` non parallélisé), A3 (Agenda — `localStorage` sans try/catch), CO3 (Collection — lightboxes non dynamiques), CO4 (Collection — partage séquentiel), CO5 (Collection — frontière Server/Client détail, choix documenté), D1 (Dashboard — items non mémoïsés, impact faible).

**Bloquant :** aucun.

---

*Rapport généré sans modification de code. Voir la question ci-dessous pour la suite.*
