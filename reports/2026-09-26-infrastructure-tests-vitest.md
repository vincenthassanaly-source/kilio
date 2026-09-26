# Infrastructure de tests (Vitest + RTL) — session du 2026-09-26

## Contexte

Les audits `2026-09-25-click-path-audit.md` et `2026-09-26-click-path-audit-medium.md`
ont corrigé 19 bugs liés aux mutations optimistes TanStack Query (rollback,
`cancelQueries`, invalidation) sans qu'aucune infrastructure de tests n'existe
dans le repo. Cette session pose Vitest + React Testing Library et couvre en
priorité les composants où ces bugs ont été corrigés, pour empêcher une
régression silencieuse.

Note sur `ecc:react-testing` : le prompt de session demandait de consulter
cette skill avant/pendant l'implémentation. Elle n'est pas présente dans
l'environnement de cette session (absente de la liste de skills disponibles
et introuvable sur le disque) — l'implémentation suit donc les patterns RTL
standards (rendu piloté par les rôles/labels ARIA, `userEvent`, assertions
`waitFor` sur l'état asynchrone) plutôt que ce guide spécifique.

## Phase 1 — État constaté

- `package.json` ne déclarait aucun framework de test (`test:instant` est un
  script shell pour le rig Playwright e2e, distinct).
- `node_modules` n'existait pas du tout dans l'environnement de session — un
  `npm install` complet a été nécessaire avant de pouvoir ajouter quoi que ce
  soit.
- `tsconfig.json` : alias unique `@/* -> ./src/*`, repris tel quel dans
  `vitest.config.ts`.
- `next.config.ts` : `cacheComponents` et `partialPrefetching` sont des
  réglages du serveur de dev/build Next, sans incidence sur Vitest (qui ne
  passe jamais par le pipeline Next — les composants sont importés et rendus
  directement via `@vitejs/plugin-react`).

## Phase 2 — Config posée

- **Dépendances ajoutées** (dev) : `vitest@3.2.7`, `@vitest/ui@3.2.7`,
  `@vitejs/plugin-react@4.7.0`, `jsdom`, `@testing-library/react`,
  `@testing-library/user-event`, `@testing-library/jest-dom`.
  - `vitest@5` a été écarté : son peer `@types/node` (`^22 || >=24`) entre en
    conflit avec le `^20` du projet (et avec `@types/web-push`, qui dépend
    aussi de `@types/node`). `vitest@3.2.7` accepte `^18 || ^20 || >=22` et
    installe proprement sans `--force`/`--legacy-peer-deps`.
  - `@vitejs/plugin-react@6` a été écarté pour la même raison : son peer
    `vite@^8` entre en conflit avec le `vite@7` que `vitest@3.2.7` embarque,
    ce qui produisait deux versions de Vite dédupliquées différemment et un
    échec `tsc --noEmit` sur `vitest.config.ts` (types `Plugin` incompatibles
    entre les deux résolutions de Vite). `@vitejs/plugin-react@4.7.0`
    accepte `vite@^7`, une seule version de Vite est installée.
  - MSW non retenu : les Server Actions ciblées (`@/app/actions/*`) sont
    mockées directement via `vi.mock(...)`, plus simple et suffisant pour le
    périmètre de cette session (pas de vrai réseau à intercepter).
- `package.json` : scripts `test` (`vitest`) et `test:ui` (`vitest --ui`)
  ajoutés à côté de `test:instant` existant.
- `vitest.config.ts` : environnement `jsdom`, alias `@/*` repris de
  `tsconfig.json`, `setupFiles: ["./vitest.setup.ts"]`, `include` restreint à
  `src/**/*.test.{ts,tsx}` — sans cette restriction, Vitest collecte aussi
  `e2e/*.spec.ts` (specs Playwright, `test.describe`/`test.beforeEach`
  incompatibles avec le runner Vitest) et échoue sur 6 fichiers hors
  périmètre.
- `vitest.setup.ts` : `@testing-library/jest-dom/vitest` (matchers
  `toBeInTheDocument`, `toHaveAttribute`, …) + polyfill minimal de
  `window.matchMedia` (absent de jsdom, requis par `useReducedMotion` de
  framer-motion utilisé dans `NoteCard`/`TaskCard`).
- Convention : tests colocalisés (`NoteCard.test.tsx` à côté de
  `NoteCard.tsx`), cohérent avec la structure existante du repo.
- `src/test/fixtures.ts` : builders `makeNote`/`makeTache` (valeurs par
  défaut + overrides) pour éviter de dupliquer la forme des types
  `NoteAvecRelations`/`TacheAvecRelations` dans chaque test.

## Fichiers testés et cas couverts

### `src/app/(app)/notes/NoteCard.test.tsx` (2 tests) — CLICK-PATH-603

Rollback scopé au seul champ concerné, pas à tout `queryKeys.notes` :
- `pinMutation` : simule un échec serveur sur l'épingle de `note-a` pendant
  qu'une mutation indépendante coche un item de `note-b` dans le même cache
  ; vérifie que le rollback ne restaure que `note-a.epingle` et laisse
  intact l'item coché de `note-b`.
- `itemMutation` : même scénario inversé (échec sur un item de `note-a`
  pendant qu'une épingle change sur `note-b`).

Ces deux tests échoueraient si le rollback repartait d'un snapshot de tout
le tableau `queryKeys.notes` au lieu du seul champ touché (régression que
CLICK-PATH-603 a corrigée).

### `src/app/(app)/notes/NoteForm.test.tsx` (1 test) — CLICK-PATH-602

Rend `NoteForm` via un harnais qui lit `queryKeys.notes` par `useQuery` (pour
reproduire le flux réel `NotesGrid -> useQuery -> NoteCard/NoteForm en
props` : sans ça, une écriture optimiste dans le cache ne se répercute dans
aucun rendu ici). La Server Action `toggleNoteItem` est mockée pour ne
jamais se résoudre ; le test clique la case de l'éditeur de checklist et
vérifie que `aria-pressed` bascule à `true` immédiatement (sans attendre la
promesse), donc que l'update optimiste s'applique bien dans le formulaire
d'édition et pas seulement sur la tuile `NoteCard`.

### `src/app/(app)/taches/TasksList.test.tsx` (2 tests) — CLICK-PATH-303

`handleDragEnd` (interne à `SortableTachesList`) est isolé du moteur dnd-kit
(indisponible en jsdom — pointer events réels requis par ses capteurs) : les
mocks de `@dnd-kit/core`/`@dnd-kit/sortable` remplacent `DndContext` par un
passe-plat qui capture son prop `onDragEnd`, appelé ensuite directement avec
un `DragEndEvent` construit à la main. Deux tests :
- Échec serveur : vérifie l'ordre exact des appels
  `cancelQueries -> setQueryData -> enregistrerOrdreTaches -> invalidateQueries`
  (le `finally` invalide même quand `enregistrerOrdreTaches` rejette) et que
  le toast d'échec s'affiche.
- Succès serveur : vérifie que `invalidateQueries` est aussi appelé côté
  succès (le `finally` n'est pas un chemin d'erreur seulement).

### `src/app/(app)/collection/[id]/CollectionHeader.test.tsx` (1 test) — CLICK-PATH-604

Ouvre le formulaire de renommage, déclenche `window.history.back()` (simule
le bouton retour matériel/navigateur) et vérifie que le formulaire se ferme
(le bouton « Renommer » réapparaît, l'input disparaît) **sans** que
`router.push` n'ait été appelé — soit `useBackClose` ferme bien la couche
UI locale au lieu de laisser le retour quitter la page.

## Phase 3 — Vérification

- `npx tsc --noEmit` : une seule erreur, `LayoutProps` introuvable dans
  `src/app/layout.tsx` — préexistante (confirmée par `git stash` sur les
  fichiers trackés avant ce chantier), un type généré par Next.js absent
  tant que `next dev`/`next build` n'a pas tourné dans cet environnement.
  Aucune erreur dans les fichiers ajoutés par cette session.
- `npx eslint .` : aucun avertissement/erreur.
- `npx next build` : le TypeScript du build (`Finished TypeScript`) passe
  sans erreur (les types générés existent à ce stade). Le build échoue
  ensuite à l'étape de prérendu (`/budget/comptes`) avec
  `Error: supabaseKey is required.` — `SUPABASE_SERVICE_ROLE_KEY` n'est pas
  défini dans cet environnement sandbox (aucune variable Supabase dans
  `env`), donc `createAdminClient()` échoue pour toute page qui prérend des
  données serveur. Sans rapport avec l'infrastructure de tests posée ici.
- `npm run test` : 4 fichiers, 6 tests, tous verts.

## Zones non couvertes (hors scope de cette session)

Conformément à la consigne « 4 à 6 tests ciblés valent mieux qu'une
couverture large » :

- **`AddTaskForm`, `CourseItemRow`, `ObjectifHeader`/`ObjectifSuiviBinaire`,
  Documents, notifications push** : autres mutations optimistes touchées par
  les audits, non testées ici (prochaine itération naturelle).
- **`SousTachesList`** (dans `TasksList.tsx`) et le drag réel via dnd-kit :
  seule la logique de `handleDragEnd` est testée (capteurs mockés) — aucun
  test n'exerce le drag physique lui-même (nécessiterait des capteurs
  `@dnd-kit` réels + polyfills `PointerEvent`, hors périmètre de cette
  session).
- **Items ambigus du rapport `2026-09-25-click-path-audit.md`** restés en
  attente de décision produit (non corrigés, donc volontairement non
  testés — un test figerait un comportement pas encore tranché) :
  - CLICK-PATH-104 (LOW) — drag annulé laisse le mode édition actif.
  - CLICK-PATH-204 (HIGH) — stale closure entre onglets Repos/Entraînement
    et formulaire objectif.
  - CLICK-PATH-306 (LOW) — input de valeur d'habitude non resynchronisé si
    le cache change en cours d'édition.
  - CLICK-PATH-401 (HIGH) — invalidation non coordonnée entre mutations
    Courses.
  - CLICK-PATH-404 (LOW) — pas de point d'entrée UI pour
    `ajouterExceptionPlanningTravail`.
  - CLICK-PATH-502 (MEDIUM) — deux contrôles de statut indépendants sur un
    objectif binaire, sans état pending partagé.
  - CLICK-PATH-503 (MEDIUM) — changer l'onglet Dépense/Revenu/Virement en
    cours d'édition transforme silencieusement l'édition en création.
  - CLICK-PATH-703 (MEDIUM/HIGH) — changer le type d'étiquette Documents en
    cours de sélection désynchronise l'`<input>` de fichiers.
  - CLICK-PATH-705 (MEDIUM) — abonnement/désabonnement notifications push en
    deux étapes non atomiques.

  (CLICK-PATH-603, listé ambigu dans ce même rapport, est en réalité déjà
  corrigé dans le code actuel — le rollback de `NoteCard` est bien scopé au
  champ modifié — et couvert par les tests `NoteCard.test.tsx` ci-dessus.)
