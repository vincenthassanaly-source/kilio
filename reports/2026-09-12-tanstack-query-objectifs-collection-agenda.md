# Migration TanStack Query : Objectifs, Collection, Agenda

Date : 2026-09-12

## Contexte

Suite de la passe de fluidité UX du 2026-09-02
(`reports/2026-09-02-fluidite-ux-globale.md`), qui a migré
Dashboard/Tâches/Notes/Courses/Habitudes vers TanStack Query. Cette session
migre les 3 modules restants retenus (Objectifs, Collection, Agenda) —
Budget et Recettes sont volontairement exclus, non modifiés.

## Phase 1 — Sync + relecture

`git checkout kilio && git fetch origin kilio && git reset --hard origin/kilio`
→ HEAD à `6e498cd` (déjà à jour).

Relu en entier `src/lib/query/keys.ts`, `TachesView.tsx`/`TasksList.tsx`
(`TaskCard`) et `HabitudesView.tsx`/`HabitudeCard.tsx` avant toute
modification, pour reprendre exactement le patron optimiste déjà en place
(`useMutation` + `onMutate` : `cancelQueries` → snapshot → `setQueryData` →
`onError` : rollback + toast → `onSettled` : `invalidateQueries`).

Vérifié via `execute_sql` (projet `vsmtkopkqasrdnjceegp`) que `objectifs`,
`objectif_etapes`, `collections`, `collection_items`, `taches`,
`horaires_travail_creneaux`, `horaires_travail_exceptions` existent et sont
cohérentes avec le code lu (RLS deny-all + `service_role`, comme documenté
le 11/09 et vérifié le 12/09 dans la session précédente).

## Clés de query ajoutées (`src/lib/query/keys.ts`)

```ts
objectifs: ["objectifs"] as const,
objectif: (id: string) => ["objectif", id] as const,
collections: ["collections"] as const,
collection: (id: string) => ["collection", id] as const,
planningTravail: ["planning-travail"] as const,
planningTravailExceptions: ["planning-travail-exceptions"] as const,
```

`queryKeys.taches`/`listes`/`tags` (déjà existantes) sont réutilisées telles
quelles par Agenda — aucun doublon créé.

## Module 1 — Objectifs

- **Liste** (`page.tsx` + `ObjectifsList.tsx`) : `page.tsx` redevient un
  shell synchrone (titre seul). `ObjectifsList.tsx` absorbe désormais
  `AddObjectifToggle` + `PullToRefresh` et charge les objectifs via
  `useQuery(queryKeys.objectifs)`, avec skeleton (`ListItemSkeletonGroup`)
  pendant `isLoading` — même structure que `TachesView`/`HabitudesView`
  (`page.tsx` + un unique composant "vue" client), plutôt que de garder
  `AddObjectifToggle` en frère dans `page.tsx` comme avant. Lecture seule,
  aucune mutation fréquente identifiée en relisant `ObjectifCard.tsx` (seules
  actions : "Modifier"/"Suppr.", déjà couvertes ci-dessous).
- **Détail** (`page.tsx` + `ObjectifSuiviEtapes.tsx`) : `page.tsx` devient un
  Client Component (`use(params)` pour déballer l'id, cf. doc Next
  ci-dessous) qui charge `{objectif, etapes, entries}` en un seul
  `useQuery(queryKeys.objectif(id))` et distribue les données en props à
  `ObjectifHeader`/`ObjectifSuiviXxx`, inchangé côté signatures. `toggleEtape`
  passe en mutation optimiste (`setQueryData` sur le champ `etapes` du cache
  combiné + rollback), comme `TaskCard`/`HabitudeCard`. `ajouterEtape`/
  `deplacerEtape`/`supprimerEtape` restent en Server Action + `useTransition`,
  avec `invalidateQueries(queryKeys.objectif(id))` en fin d'action — le
  `useOptimistic` local qu'elles utilisaient a été retiré (voir "Écarts").
- **ObjectifSuiviBinaire.tsx** : action équivalente trouvée (bascule
  atteint/en_cours, un seul tap) → migrée au même mécanisme optimiste que
  `toggleEtape`.
- **ObjectifSuiviValeur.tsx** : pas d'action équivalente — "Enregistrer" est
  une saisie ponctuelle (au plus 1×/jour), pas une bascule répétée. Reste en
  Server Action + `useTransition`, `useOptimistic` retiré (voir "Écarts"),
  `invalidateQueries` ajouté.

## Module 2 — Collection

- **Liste** (`page.tsx` + `CollectionsGrid.tsx`) : même transformation que
  Objectifs — `CollectionsGrid.tsx` absorbe `AddCollectionToggle` +
  `PullToRefresh` + `useQuery(queryKeys.collections)`. Lecture seule.
- **Détail** (`page.tsx` + `PhotosGrid.tsx`) : `page.tsx` (Client Component,
  `use(params)`) charge la collection en un `useQuery(queryKeys.collection(id))`
  et distribue `collection`/`collectionId`/`photos` à
  `CollectionHeader`/`AddPhotoButton`/`PhotosGrid`, signatures inchangées.
  `deleteCollectionItem` (suppression d'une photo, action répétée) passe en
  mutation optimiste dans `PhotosGrid` — même mécanisme que `TaskCard`.
  `renameCollection`/`deleteCollection` (`CollectionHeader`) et
  `uploadCollectionPhotos`/`ajouterLienTiktok` (`AddPhotoButton`) restent en
  Server Action + `useTransition`, avec `invalidateQueries` ajouté sur
  `queryKeys.collection(id)` **et** `queryKeys.collections` (le nom/aperçu/
  nombre de photos affichés sur `/collection` dépendent aussi de ces
  actions).

## Module 3 — Agenda

- `page.tsx` redevient un shell synchrone (titre seul), délègue tout à
  `AgendaView`.
- `AgendaView.tsx` charge tâches/listes/tags via `useQuery`, en **réutilisant
  telles quelles** `queryKeys.taches`/`listes`/`tags` : cocher une tâche
  depuis l'agenda (via `TaskCard`, déjà réutilisé tel quel dans `DayView`)
  met donc à jour `/taches` et le dashboard instantanément et inversement,
  sans wiring supplémentaire (cache TanStack partagé par clé).
- `creneaux`/`exceptions` (planning de travail) : nouvelles clés
  `queryKeys.planningTravail`/`planningTravailExceptions`, avec
  **`staleTime: 0`** — délibéré, pas le défaut global (30 s). Contrairement à
  `taches` (dont les mutations in-app invalident déjà le cache), aucune
  action de l'app n'écrit sur `horaires_travail_creneaux`/`_exceptions` : la
  seule Server Action existante (`ajouterExceptionPlanningTravail`) n'est
  appelée nulle part dans l'UI (vérifié par recherche globale). Ces tables
  sont modifiées exclusivement hors app (skill `kilio-planning-travail`),
  exactement le cas que l'ancien `export const dynamic = "force-dynamic"`
  de cette route neutralisait : `staleTime: 0` reproduit cette garantie de
  fraîcheur pour ces deux lectures précises.
- Deep-link de notification (`?tache=<id>`) : ne peut plus être résolu dans
  l'état initial (donnée async, plus disponible dès le premier rendu) —
  déplacé dans un effet déclenché une fois `taches` chargé (voir "Écarts").

## Écarts par rapport au périmètre listé

1. **`force-dynamic` conservé sur `agenda/page.tsx`.** Retiré dans un premier
   temps (la page ne fait plus elle-même de fetch), puis **réintroduit après
   avoir reproduit un crash de build identique à celui corrigé le jour même
   pour `/agenda`** (`cc56040`) : `src/app/(app)/layout.tsx` (préférences de
   navigation, partagé par toutes les routes) appelle Supabase pour **toute**
   route sans `force-dynamic` lors d'une tentative de génération statique —
   indépendamment du fetch propre à la page elle-même. Sans ce flag, Next
   retente de pré-rendre `/agenda` au build et échoue pour la même raison
   structurelle. Documenté en commentaire dans le fichier.
2. **`notFound()` non utilisé dans les pages détail devenues Client
   Component** (`objectifs/[id]`, `collection/[id]`) : la documentation
   Next.js embarquée (`node_modules/next/dist/docs/.../not-found.md`) ne
   liste `notFound()` que pour Server Components/Server Functions/Route
   Handlers, pas les Client Components. Remplacé par un message inline
   ("Objectif introuvable"/"Collection introuvable" + lien retour) plutôt
   que la page 404 native — pas de `not-found.tsx` personnalisé existant de
   toute façon (vérifié, aucun dans le repo).
3. **`useOptimistic` retiré** des actions secondaires d'Objectifs
   (`ajouterEtape`/`deplacerEtape`/`supprimerEtape`, `enregistrerEntreeObjectif`) :
   son mécanisme de réconciliation reposait sur le rafraîchissement de la
   prop via `revalidatePath` (Server Component), qui n'a plus d'effet une
   fois la page détail chargée côté client. Remplacé par `invalidateQueries`
   en fin d'action, sans rendu optimiste local — même patron que
   `SousTachesList` dans `taches/TasksList.tsx` pour ses actions
   équivalentes (ajout/suppression/réordonnancement de sous-tâches). Les
   Server Actions elles-mêmes gardent leurs appels `revalidatePath`
   (inoffensifs, non retirés).
4. **`AddXToggle` absorbé dans le composant liste** (`ObjectifsList.tsx`,
   `CollectionsGrid.tsx`) plutôt que laissé en frère dans `page.tsx` — pour
   suivre à l'identique la forme canonique `TachesPage`/`HabitudesPage`
   (`page.tsx` ne rend qu'un titre + un unique composant "vue" client).
5. **Suppression d'un objectif depuis la liste (`ObjectifCard.tsx`)
   convertie en `useMutation` optimiste** plutôt qu'un simple
   `startTransition` + `invalidateQueries` après coup : `supprimerObjectif`
   se termine par `redirect("/objectifs")` (partagé avec la page détail),
   qui **jette** et empêche tout code placé après un `await` de s'exécuter —
   un `invalidateQueries()` après l'`await` ne se serait donc jamais
   exécuté. Le retrait optimiste du cache dans `onMutate` (avant l'appel
   serveur) contourne le problème proprement. Même raisonnement appliqué à
   `ObjectifHeader.tsx` (détail) : `invalidateQueries(queryKeys.objectifs)`
   déplacé **avant** l'appel à `supprimerObjectif`.
6. **`DayView.tsx` (Agenda) et le FAB de `AgendaView.tsx`** : leur
   `AddTaskToggle`/`AddTaskForm` ne déclenchaient auparavant aucun
   rafraîchissement explicite du cache (`revalidatePath` + rendu Server
   Component suffisait). Un `onSaved`/`onDone` invalidant
   `queryKeys.taches` a été ajouté aux deux, sans quoi une tâche ajoutée
   depuis l'agenda n'apparaîtrait pas avant 30 s (staleTime par défaut) ou
   la prochaine invalidation fortuite d'un autre module.
7. **Lint** : `react-hooks/set-state-in-effect` (règle non encore
   rencontrée dans ce repo) s'est déclenché sur l'effet de résolution du
   deep-link d'Agenda (`setSelectedDate` après chargement de `taches`) —
   cas légitime de synchronisation ponctuelle depuis une donnée externe
   asynchrone, gardé par une ref pour ne s'exécuter qu'une fois. Désactivé
   ligne par ligne avec commentaire, faute de précédent dans le repo pour
   ce cas précis.

Aucune action rapide supplémentaire non prévue n'a été découverte en
relisant `ObjectifCard.tsx` (Objectifs) — conforme à l'hypothèse du prompt.

## Phase 3 — Vérification

- `npx tsc --noEmit` : ✅ **0 erreur.**
- `npx eslint .` : ✅ **0 erreur, 0 warning** (après correction du point 7
  ci-dessus).
- `npm run build` : compilation Turbopack + typecheck interne verts
  (`✓ Compiled successfully`, `Finished TypeScript`). La génération statique
  échoue toujours sur `/carburants` — **même point d'échec, même cause
  exacte** (accès réseau sortant vers Supabase bloqué dans ce sandbox pour
  le processus de build, documenté dans
  `reports/2026-09-12-verification-fix-rls-nutrition.md`) **qu'avant cette
  session** : aucune régression introduite par cette migration. Vérifié en
  particulier que retirer puis rétablir `force-dynamic` sur `/agenda`
  ramène bien le point d'échec à `/carburants` (voir écart n°1).
- **Vérification manuelle (Playwright headless mobile)** : tentée via
  `next dev`, mais bloquée par la **même cause racine** que le build — le
  layout partagé `(app)/layout.tsx` échoue aussi **à l'exécution** (pas
  seulement au build) dans ce sandbox sans accès réseau à Supabase, avant
  même d'atteindre le contenu de page. Impossible d'exercer
  `ObjectifsList`/`CollectionsGrid`/`AgendaView` en conditions réelles dans
  cette session — aucune erreur distincte de celle du layout observée,
  mais ce n'est pas une confirmation positive. **À tester manuellement par
  Vincent après déploiement** : cocher une étape d'objectif, marquer un
  objectif "binaire" atteint, supprimer une photo de collection, cocher une
  tâche depuis l'agenda puis vérifier la mise à jour instantanée sur
  `/taches`.

## Fichiers modifiés

- `src/lib/query/keys.ts`
- `src/app/(app)/objectifs/page.tsx`, `ObjectifsList.tsx`, `ObjectifCard.tsx`,
  `AddObjectifToggle.tsx`
- `src/app/(app)/objectifs/[id]/page.tsx`, `ObjectifHeader.tsx`,
  `ObjectifSuiviBinaire.tsx`, `ObjectifSuiviEtapes.tsx`, `ObjectifSuiviValeur.tsx`
- `src/app/(app)/collection/page.tsx`, `CollectionsGrid.tsx`,
  `AddCollectionToggle.tsx`
- `src/app/(app)/collection/[id]/page.tsx`, `CollectionHeader.tsx`,
  `AddPhotoButton.tsx`, `PhotosGrid.tsx`
- `src/app/(app)/agenda/page.tsx`, `AgendaView.tsx`, `DayView.tsx`

Budget et Recettes : non touchés. `WeekView.tsx`/`MonthView.tsx`/`ListView.tsx`/
`ArchivedTasksSection.tsx`/`TimeGrid.tsx`/`date-utils.ts`/`useAgendaZoom.ts` :
non modifiés (props inchangées, aucun fetch propre).
