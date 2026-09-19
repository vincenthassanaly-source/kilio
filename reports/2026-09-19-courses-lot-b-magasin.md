# Courses — Lot B : usage en magasin

Date : 2026-09-19
Base : `kilio` @ `261f4f8` (lot C, fiabilité de la file offline). Constats traités : #7, #8, #9, #10 de `reports/2026-09-19-audit-module-courses.md`, en tenant compte des observations laissées ouvertes par `reports/2026-09-19-courses-lot-c-fiabilite-offline.md`.
Aucune migration, aucune écriture en base hors des actions de l'application elle-même (la base réelle n'a été interrogée qu'en lecture seule, `list_tables`/`execute_sql` en `SELECT`).

> **Repli documenté (skill `impeccable`)** : comme aux lots précédents, aucun binaire `impeccable` n'était en cache dans cette session (`~/.impeccable` absent) et son lanceur télécharge un exécutable depuis GitHub avant de s'exécuter — ce téléchargement n'a pas été autorisé et n'a pas été lancé. Repli appliqué : relecture directe de `PRODUCT.md`/`DESIGN.md`, et application manuelle des principes `shape`/`harden`/`clarify` (cibles de tap, copy, états d'erreur) aux 4 interactions du lot pendant leur écriture, sans passe de détection automatisée. `web-design-guidelines` et `vercel-react-best-practices` ont, eux, été appliqués en lisant le code au fur et à mesure (pas seulement en relecture) : `networkMode`, dépendances des hooks, pas de composants inline, styles partagés (`ui.ts`) réutilisés sans les modifier.

## Synthèse

- **Suppression (#7)** : `window.confirm` retiré pour Courses (uniquement — `confirmDelete` reste utilisé par les autres modules). Suppression optimiste immédiate + toast « « Lait » supprimé » avec bouton « Annuler » (nouvelle brique `showActionToast`, aucun équivalent existant dans Kilio). « Annuler » réinsère l'article au même id et à la même position via `restoreCourseItems`.
- **Renommage (#8)** : tap sur le libellé (zone ≥44px, `aria-label` explicite) → `<input>` inline, 16px localement, `enterKeyHint="done"`, Entrée/perte de focus valident, Échap annule. Fonctionne hors ligne (`updateCourseItem` déclarée dans `ACTIONS.courses`), bloqué tant que l'article est `temp-` (garde-fou UI + défense en profondeur dans la `mutationFn`).
- **Vider les cochés (#9)** : bouton dans l'en-tête d'`ArchivedCoursesSection`, visible même section repliée, séparé du bouton de dépliage (plus de `<button>` imbriqué). Suppression immédiate des ids exacts affichés + toast « N articles supprimés » + Annuler global.
- **Compteur et état positif (#10)** : « N article(s) à prendre » au-dessus de la liste active, et « Tout est dans le chariot ! » quand tout est coché (`compterProgression`, nouvelle fonction pure).
- **`networkMode: "always"`** ajouté sur toutes les mutations Courses (create/toggle/delete/update/delete groupé), point laissé ouvert par le lot C.
- `tsc`, `eslint` et `npm run build` passent tous (une seule erreur `tsc` préexistante, hors périmètre). 26 scénarios scriptés, tous verts.

## Ce qui a été fait, fichier par fichier

### `src/components/toast/toast-store.ts` — commit `9720130`

- Nouvelle fonction `showActionToast(text, { label, onAction, dureeMs = 6000 })`, additive : `showToast(text, dureeMs)` garde exactement sa signature et son comportement (vérifié par grep, voir « Cohérence transverse »).
- `ToastMessage` gagne un champ optionnel `action?: ToastAction` (`{ label, onAction }`).

### `src/components/toast/ToastHost.tsx` — commit `9720130`

- Le rendu des toasts *sans* action est **strictement inchangé** (même bloc JSX, mêmes classes, même comportement de fermeture au tap).
- Nouveau bloc de rendu pour les toasts *avec* action : un `<div>` (pas un `<button>` englobant, pour éviter l'imbrication de boutons) contenant le texte et un `<button>` « Annuler » dédié — cible `h-11 min-w-[44px]` (44px), `aria-label` = `label` fourni par l'appelant (ex. « Annuler la suppression de « Lait » »). Le `role="status"`/`aria-live="polite"` existant sur le conteneur (inchangé) couvre déjà tous les toasts, action ou non. `useReducedMotion()` neutralise l'animation d'entrée/sortie du nouveau bloc uniquement (le bloc des toasts simples n'y touche pas — voir « Écarts », prefers-reduced-motion sur les toasts simples).
- Plusieurs toasts d'action coexistent naturellement (chacun a son `id`, sa clé React, son timer) — aucun état partagé entre eux.

### `src/app/actions/courses.ts` — commit `d1033f0`

Trois nouvelles Server Actions, `createCourseItem`/`toggleCourseItem`/`deleteCourseItem` inchangées :

- `updateCourseItem(id, libelle)` : trim, refuse le vide, `update({ libelle }).eq("id", id)`, `revalidatePath("/courses")`.
- `deleteCourseItems(ids: string[])` : `delete().in("id", ids)` — jamais `where coche = true`, pour que l'annulation restaure exactement l'ensemble vu par l'utilisateur au moment du tap (constat confirmé en base : pas de contrainte empêchant une suppression par liste d'ids exacts).
- `restoreCourseItems(items: CourseItemARestaurer[])` : `upsert(..., { onConflict: "id", ignoreDuplicates: true })` avec `id`, `libelle`, `coche`, `created_at`, `termine_le` d'origine — jamais `updated_at` (reflète la restauration, pas la création d'origine). Idempotent par construction (rejouer deux fois la même annulation ne duplique rien). Validation : libellé non vide, `id` au format UUID (regex locale, la validation existante la plus proche — aucune fonction de validation d'id partagée n'existait dans le repo).

### `src/lib/offline/queue.ts` / `src/lib/offline/flush-policy.ts` — commit `d1033f0`

- `updateCourseItem`, `deleteCourseItems`, `restoreCourseItems` déclarées dans `ACTIONS.courses`.
- `decisionAvantExecution` étendue : un `updateCourseItem` dont le premier argument est un id `temp-...` est purgé comme `toggleCourseItem`/`deleteCourseItem` (réutilise `estIdTemporaire`). En pratique ce cas ne devrait jamais se produire (le renommage est bloqué côté UI et dans sa `mutationFn` tant que l'article reste `temp-`) — défense en profondeur côté file, cohérente avec le reste de `flush-policy.ts`.
- Le rejeu de la file suit toujours l'ordre `created_at` (inchangé) : une suppression mise en file puis un « Annuler » mis en file (lui aussi mis en file s'il échoue hors ligne) sont donc rejoués dans cet ordre exact — vérifié par un scénario scripté (voir « Tests »).

### `src/lib/courses/compute.ts` — commit `120e14b`

- `compterProgression(items)` : `{ actifs, total, tousCoches }` — `tousCoches` est `true` seulement si `total > 0 && actifs === 0` (distingue « tout est coché » de « aucun article n'a jamais existé », qui garde le message générique existant de `CoursesList`).
- `trierCommeServeur(a, b)` : reproduit l'ordre exact de `getCoursesItems` (coche croissant, puis `created_at` décroissant), utilisée pour replacer un article restauré à sa position d'origine dans le cache optimiste sans attendre le refetch.

### `src/app/(app)/courses/undo.ts` (nouveau) — commit `120e14b`

- `restaurerArticlesCourses(queryClient, items)` : fonction **autonome**, pas un hook ni un `mutate` de composant. Met à jour le cache optimiste (réinsertion triée via `trierCommeServeur`, idempotente si l'article est déjà là), appelle `restoreCourseItems`, avec le même repli hors ligne (`enqueueAction`) que les autres mutations. Ne capture que le `queryClient` (instance stable pour toute la durée de vie de l'app, voir `providers.tsx`) et un instantané de données (`CourseItemARestaurer[]`) — **jamais un état React ni un `mutate` lié à `CourseItemRow`/`ArchivedCoursesSection`**, pour continuer à fonctionner si l'utilisateur a changé d'écran pendant les ~6s d'affichage du toast (ces deux composants sont alors démontés). Utilisée par les deux points d'annulation (suppression unitaire et « Vider les cochés »).

### `src/app/(app)/courses/CourseItemRow.tsx` — commit `120e14b`

- `toggleMutation`, `deleteMutation`, nouvelle `updateMutation` : toutes en `networkMode: "always"`.
- Suppression : `confirmDelete` retiré, suppression optimiste immédiate ; `onSuccess` affiche le toast d'action (`showActionToast`), `onAction` appelle `restaurerArticlesCourses`.
- Renommage : tap sur le libellé (`<button>` dédié, `min-h-[44px]`, `aria-label`) bascule vers un `<input>` inline (texte présélectionné au montage via `useEffect` + `.select()`, taille 16px locale via `text-base` — pas via le token partagé `input` de `ui.ts`, resté à 15px pour tous ses autres usages). Isolation tactile (`onTouchStart/Move/End` → `stopPropagation`, même motif que `Modal.tsx`) pour que la sélection de texte dans le champ ne déclenche pas le swipe de navigation entre onglets de `TabSwipeWrapper`. Un `ref` (`renameSettledRef`) empêche qu'Entrée (ou Échap) suivi du `blur` déclenché par le démontage de l'`<input>` ne déclenche une double validation/annulation.
- Blocage tant que `estIdTemporaire(item.id)` : le tap pour renommer est désactivé (`disabled`) côté UI, et la `mutationFn` de `updateMutation` relance l'erreur sans jamais appeler `enqueueAction` si `enAttenteDeCreation` est vrai (même motif que `toggleMutation`/`deleteMutation`).
- Aucune vibration ajoutée à la suppression (décision déjà actée dans `reports/2026-09-06-haptique-notes-courses-collection-objectifs.md`, non revisitée ici).
- Bouton « Suppr. » et sa cible de tap laissés tels quels (aucune passe `impeccable` disponible pour en justifier une évolution — voir bandeau en tête de rapport).

### `src/app/(app)/courses/ArchivedCoursesSection.tsx` — commit `120e14b`

- En-tête restructuré en deux contrôles frères (plus de `<button>` imbriqué) : le bouton de dépliage (titre + chevron) et le bouton « Vider les cochés », tous deux toujours visibles (y compris section repliée).
- `viderMutation` (`networkMode: "always"`) : capture un instantané complet (`CourseItemARestaurer[]`) des articles archivés affichés au moment du tap, supprime leurs ids exacts via `deleteCourseItems`, optimiste (retire ces ids du cache), puis `onSuccess` affiche le toast d'action pluriel/singulier correct + `restaurerArticlesCourses` en cas d'annulation.

### `src/app/(app)/courses/CoursesList.tsx` — commit `120e14b`

- Ajoute le texte de progression (« N article(s) à prendre », `text-ink-2`) au-dessus de la liste active quand `actifs.length > 0`, et le message positif « Tout est dans le chariot ! » quand `compterProgression(items).tousCoches` est vrai. L'état vide générique (`items.length === 0`, « Aucun article pour l'instant. ») est inchangé.

### `src/app/(app)/courses/AddCourseForm.tsx` — commit `120e14b`

- `networkMode: "always"` ajouté sur la mutation de création (seul changement de ce fichier).

## Écarts avec le prompt et justifications

### Compteur « N article(s) à prendre » plutôt que « x/y »

Le prompt suggère un exemple `« N article(s) à prendre »` dans le corps du texte, ce qui a été suivi tel quel — mais l'audit d'origine (constat #10) proposait plutôt un format `« 2/6 cochés »`. Le prompt de ce lot demandait explicitement de compter les **actifs restants** (`actifs.length`), pas un ratio coché/total : un ratio `x/y` mélangerait deux informations (progression relative ET nombre total), alors que le besoin exprimé — savoir combien il reste à prendre en rayon — est répondu plus directement par un compte simple. Retenu tel que demandé par le prompt, écart documenté par rapport à l'audit d'origine seulement.

### `onSettled` en file d'attente : pas de garde spécifique ajouté

Le prompt demandait de vérifier comment Tâches gère `onSettled` quand une action a été mise en file, pour qu'un refetch réussi n'écrase pas un état optimiste en attente. Lecture de `TasksList.tsx` (lignes ~310-373) : **`TaskCard` n'a aucun garde particulier dans son propre `onSettled`** — celui-ci appelle `invalidateTaches()` inconditionnellement, que la mutation ait réussi en ligne ou ait été mise en file hors ligne. La protection réelle contre l'écrasement vient d'ailleurs, à un niveau partagé et déjà en place avant ce lot :
1. Les **requêtes** (`useQuery`) gardent le `networkMode` par défaut (`"online"`) : `invalidateQueries` appelé hors ligne marque la requête « stale » mais son refetch reste **en pause** (`fetchStatus: "paused"`) tant que le réseau est indisponible — il n'écrase donc rien tout de suite.
2. Au retour en ligne, `useOnlineSync` rejoue la file (`flushQueue`) **avant** d'appeler `onSynced`, qui déclenche une invalidation globale dans `providers.tsx` — c'est ce correctif du lot B Tâches (`reports/2026-09-18-taches-lot-b-fiabilite.md`, §12) qui résout le risque réel (un refetch reparti à la reconnexion lisant le serveur avant le rejeu de la file).

Courses bénéficie déjà de ce même mécanisme partagé depuis le lot C (`flushQueue` retourne `{synced, abandoned}`, `useOnlineSync`/`providers.tsx` invalident après rejeu) — **aucune modification supplémentaire n'était donc nécessaire** : le pattern de Tâches a été reproduit à l'identique en ajoutant simplement `networkMode: "always"` sur les mutations Courses, sans toucher à `onSettled` (laissé inconditionnel, comme sur `TaskCard`) ni à `providers.tsx`/`useOnlineSync.ts` (non modifiés dans ce lot).

### `networkMode: "always"` sur la restauration : non applicable (fonction autonome, pas un `useMutation`)

Le prompt demande `networkMode: "always"` sur « toutes les mutations Courses (create, toggle, delete, update, delete groupé, restore) ». Les cinq premières sont bien des `useMutation` avec cette option. La restauration (`restaurerArticlesCourses`, `undo.ts`) est en revanche une **fonction autonome**, pas un `useMutation` — c'est le choix explicitement suggéré par le prompt lui-même pour éviter le piège du callback d'un composant démonté (« capture le `queryClient` et appelle une fonction autonome »). N'étant géré par aucun `useMutation`, elle n'est jamais mise en pause par TanStack Query : elle s'exécute **toujours**, ce qui est une garantie strictement plus forte que `networkMode: "always"` sur un hook. `networkMode` n'a donc pas de sens à lui appliquer littéralement ; le résultat recherché (l'appel réseau a bien lieu même hors ligne, avec repli `enqueueAction` en cas d'échec réseau) est obtenu par construction.

### `prefers-reduced-motion` sur les toasts simples : non touché

Le rendu des toasts *sans* action garde exactement son code existant (animation framer-motion non gardée par `useReducedMotion`, comme avant ce lot) : la consigne « `showToast(text, dureeMs)` doit rester inchangé dans sa signature et son rendu » l'imposait explicitement. Seul le nouveau bloc (toasts à action) respecte `prefers-reduced-motion`. **Observation, non corrigée** : les toasts simples (utilisés par tous les modules) n'ont donc toujours pas cette garantie — écart déjà présent avant ce lot, hors périmètre Courses, à traiter séparément si souhaité.

### Validation d'id dans `restoreCourseItems`

Aucune fonction de validation UUID partagée n'existait dans le repo (vérifié par recherche) : une regex locale à `courses.ts` a été ajoutée plutôt que d'introduire une nouvelle abstraction partagée pour un seul appelant.

### Aucun autre écart

Le reste du prompt a été suivi tel quel : pas de nouvelle dépendance, pas de migration, `createAdminClient()` dans chaque nouvelle action, `revalidatePath("/courses")` partout, fonctions pures dans `compute.ts`, `estIdTemporaire` réutilisée sans nouvelle définition.

## Vérifications (Phase 3)

### `npx tsc --noEmit`

Une seule erreur, préexistante et hors périmètre (confirmée identique aux lots précédents) :
```
src/app/layout.tsx(41,56): error TS2304: Cannot find name 'LayoutProps'.
```

### `npx eslint src`

Aucune sortie — 0 erreur, 0 avertissement.

### `npm run build`

Build Turbopack réussi (`✓ Compiled successfully in 10.1s`, `✓ Generating static pages using 3 workers (24/24)`), 24 routes générées dont `/courses` (route dynamique `ƒ`, inchangée).

### Tests scriptés

Script isolé, hors repo (scratchpad de session), aucune dépendance ajoutée au projet, aucune écriture en base. Deux niveaux, comme au lot C :
1. **Fonctions pures réelles**, importées directement depuis leur chemin dans le repo (`src/lib/courses/compute.ts`, `src/lib/offline/flush-policy.ts`) via un loader ESM qui réécrit l'alias `@/...` (le fichier source n'est pas modifié pour le test).
2. **Boucle reproduisant fidèlement le wiring de `flushQueue`** (relu au moment d'écrire le test), avec un faux `db` en mémoire et de fausses Server Actions couvrant les 3 nouvelles actions Courses en plus des actions existantes des 4 modules.

Sortie réelle (`node --experimental-strip-types --experimental-loader ./resolve-alias-loader.mjs test-lot-b.mjs`) :

```
ok   estIdTemporaire: id temp-
ok   estIdTemporaire: uuid réel
ok   estIdTemporaire: valeur non-string
ok   estIdTemporaire: undefined
ok   decisionAvantExecution: updateCourseItem sur id temp- -> purge
ok   decisionAvantExecution: updateCourseItem sur uuid réel -> exécuter
ok   decisionAvantExecution: toggleCourseItem sur id temp- -> purge (régression lot C)
ok   decisionAvantExecution: deleteCourseItem sur id temp- -> purge (régression lot C)
ok   decisionAvantExecution: createCourseItem (payload = libellé, jamais un id) -> exécuter
ok   decisionAvantExecution: deleteCourseItems (nouveau, ids groupés) -> jamais purgé (hors périmètre du garde-fou temp-)
ok   decisionAvantExecution: id temp- sur un AUTRE module -> exécuter (le court-circuit est spécifique à Courses)
ok   decisionApresEchec: erreur réseau -> reessayer, compteur inchangé
ok   decisionApresEchec: 3e échec non réseau (seuil=3) -> abandonner
ok   compterProgression: liste vide
ok   compterProgression: tout actif
ok   compterProgression: tout coché -> tousCoches
ok   compterProgression: mélange
ok   compterProgression: liste vide ne déclenche PAS l'état positif (distinct de « jamais eu d'article »)
ok   [scénario] suppression puis annulation : ordre exact delete -> restore
ok   [scénario] suppression puis annulation : les deux actions sont synchronisées, file vide
ok   [scénario régression lot C] toutes les actions sont traitées (synced+abandoned = 5), file vide
ok   [scénario régression lot C] les deux actions ciblant l'id temp- sont purgées avant tout appel serveur (jamais dans appels)
ok   [scénario régression lot C] les actions d'un AUTRE module après l'action bloquante s'exécutent bien (plus de blocage transverse)
ok   [scénario] updateCourseItem sur id temp- : purgé sans appel serveur, la suite de la file continue
ok   [scénario] file vide -> {synced:0, abandoned:0}
ok   [scénario] file entièrement synchronisable -> tout part, rien d'abandonné (régression)

26 passés, 0 échoués
```

### `git status`

Seuls les fichiers du périmètre modifiés/ajoutés (voir liste ci-dessus) et ce rapport ; `package.json`/`package-lock.json` inchangés après `npm ci` (nécessaire en début de session, `node_modules` absent). 3 commits locaux créés sur `claude/courses-lot-b-magasin-0rueo9` (branche identique à `origin/kilio` avant ce lot) :
- `9720130` — toast à action.
- `d1033f0` — Server Actions.
- `120e14b` — UI et mutations.

Aucun push effectué.

## Base réelle (lecture seule) et conclusions

- **Schéma `courses_items`** : identique à `src/lib/supabase/types.ts`, aucun décalage (`id uuid` par défaut `gen_random_uuid()`, `coche boolean not null default false`, `created_at`/`updated_at timestamptz not null default now()`, `termine_le timestamptz` nullable). Aucune contrainte au-delà de la clé primaire (`courses_items_pkey`) : un `INSERT` avec `id`/`created_at`/`termine_le` explicites (nécessaire à `restoreCourseItems`) est possible sans obstacle.
- **`set_termine_le()`** (corps lu via `pg_get_functiondef`) : `if nouveau and not ancien then new.termine_le := now(); elsif ancien and not nouveau then new.termine_le := null; end if;` — ne touche `termine_le` **que si `coche` change** entre l'ancienne et la nouvelle ligne. **Conclusion confirmée** : un `UPDATE` du seul `libelle` (renommage) laisse `termine_le` strictement intact, puisque `coche` ne change pas dans ce cas.
- **Triggers** : `trg_courses_items_termine_le` et `trg_courses_items_updated_at` sont tous les deux déclarés `BEFORE UPDATE` uniquement (`pg_get_triggerdef`) — **aucun des deux ne se déclenche sur un `INSERT`**. Conséquence directe pour `restoreCourseItems` : un `INSERT` avec `coche = true` et `termine_le` explicite n'est **jamais réécrit** par ces triggers ; la valeur fournie est conservée telle quelle. C'est ce qui garantit qu'annuler la suppression d'un article déjà coché restaure fidèlement son `termine_le` d'origine (pas de re-déclenchement du nettoyage automatique à une date différente).
- **Exécution séquentielle des Server Actions côté client** : confirmée par `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` (§ « Sequential dispatch on the client ») — *« Next.js dispatches Server Actions one at a time per client. If a user triggers three actions in quick succession, the second waits for the first to finish, then the third waits for the second. »* Une suppression suivie d'un « Annuler » déclenchés depuis le client arrivent donc bien dans l'ordre, sans recourir à `Promise.all`. Ce point s'ajoute à la garantie déjà établie côté file offline (rejeu strictement ordonné par `created_at`, vérifié par le scénario scripté ci-dessus) : les deux chemins (en ligne et hors ligne) préservent l'ordre suppression → restauration.

Aucun désaccord entre le code, la base et les rapports précédents n'a été trouvé lors de la Phase 1 : les hypothèses de l'audit (#7 à #10) et du lot C se sont toutes confirmées telles quelles.

## Limites et checklist de vérification manuelle sur appareil

Rien de ce qui suit n'a pu être testé dans cette session (pas de credentials Supabase pour `next dev`, pas d'appareil, pas de simulation fiable de mode avion/gestes tactiles/clavier virtuel) :

1. **Suppression en ligne + Annuler** : supprimer un article actif, taper « Annuler » dans les 6s → l'article revient au même endroit dans la liste (même position relative aux autres actifs), sans doublon.
2. **Suppression + Annuler en mode avion** : supprimer un article hors ligne (toast « Enregistré, sera synchronisé... » puis toast d'action), taper « Annuler » toujours hors ligne (l'annulation part aussi en file) ; revenir en ligne → la suppression puis la restauration se rejouent dans cet ordre exact (l'article réapparaît, pas de doublon, pas de suppression fantôme).
3. **Quitter `/courses` pendant les 6s du toast puis Annuler** : supprimer un article, naviguer immédiatement vers un autre module, taper « Annuler » sur le toast toujours visible → l'article doit être restauré même si `CourseItemRow`/`CoursesList` d'origine ne sont plus montés (le toast et son callback survivent, portés par `ToastHost`, monté globalement dans `providers.tsx`).
4. **Renommer en ligne** : tap sur un libellé, modifier le texte, Entrée → mise à jour visible immédiatement, persistée après rechargement.
5. **Renommer hors ligne puis reconnexion** : renommer un article en mode avion (toast « Enregistré, sera synchronisé... ») → au retour du réseau, le nouveau libellé se synchronise (toast « 1 action synchronisée »).
6. **Renommer un article `temp-` (bloqué)** : créer un article hors ligne, essayer de taper sur son libellé avant confirmation serveur → aucun `<input>` ne doit apparaître (le tap est désactivé), le texte « En attente de synchro » reste visible.
7. **« Vider les cochés » section repliée puis Annuler** : avec la section « Articles archivés » repliée, taper « Vider les cochés » → tous les articles cochés disparaissent (section repliée reste à 0), toast « N articles supprimés » ; taper « Annuler » → tous reviennent, section toujours repliée (ou dépliée si l'utilisateur l'a ouverte entre-temps — comportement non spécifié par le prompt, à confirmer avec Vincent si le résultat surprend).
8. **Compteur et état « tout est dans le chariot »** : cocher tous les articles actifs un par un → le texte de compte diminue (« 3 articles à prendre » → « 2 »… → disparaît), puis le message positif apparaît dès que le dernier actif est coché.
9. **Clavier virtuel pendant le renommage** : sur mobile, taper sur un libellé pour le renommer → vérifier que l'article édité reste visible au-dessus du clavier virtuel (pas de recouvrement empêchant de voir ce qu'on tape).
10. **Sélection de texte dans l'input de renommage** : vérifier qu'un geste de sélection/glissement dans le champ ne déclenche jamais un swipe de changement d'onglet (isolation tactile `stopPropagation`, à confirmer sur un vrai écran tactile — non simulable dans cette session).
11. **Non-régression Tâches/Notes/Habitudes** : cocher/supprimer une tâche, une note, une entrée d'habitude, en ligne et en mode avion → toasts et comportement de la file strictement identiques à avant ce lot (aucun fichier de ces modules n'a été touché).

## Ce qui reste pour le lot A, et observations laissées ouvertes

- **Lot A (saisie, priorité produit 2)** entièrement hors périmètre de ce lot : formulaire qui reste ouvert après ajout + toast de succès, ajout multiple (découpage virgule/lignes), avertissement de doublon, « habituels », `enterKeyHint` sur le formulaire d'ajout (l'`enterKeyHint="done"` ajouté dans ce lot ne concerne que l'`<input>` de renommage, pas `AddCourseForm.tsx`).
- **`prefers-reduced-motion` sur les toasts simples** : observation ouverte ci-dessus (« Écarts »), non corrigée, transverse à tout Kilio (pas seulement Courses).
- **Comportement de la section archivée après « Vider les cochés »** : non spécifié explicitement par le prompt (reste repliée avec 0 élément, ou se referme si elle était ouverte) — implémenté sans changement d'état d'ouverture (`open` n'est jamais modifié par `handleVider`), à confirmer visuellement sur appareil (point 7 de la checklist).
- **Cible de tap du bouton « Suppr. »** : laissée inchangée (~34px estimés), comme demandé (amélioration seulement si `impeccable` la justifie — non disponible cette session).
- **`restoreCourseItems` et RLS** : comme le reste du module, l'écriture passe par `createAdminClient()` (clé de service), donc RLS éventuellement active en base n'intervient pas — cohérent avec le reste de l'app, non revisité ici.
