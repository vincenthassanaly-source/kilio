# Courses — Lot A : saisie rapide

Date : 2026-09-19
Base : `kilio` @ `eb6d9f2` (lot B, usage en magasin). Constats traités : #1, #2, #3, #4, #5, #6 de `reports/2026-09-19-audit-module-courses.md`, en tenant compte des observations laissées ouvertes par les rapports des lots C (`reports/2026-09-19-courses-lot-c-fiabilite-offline.md`) et B (`reports/2026-09-19-courses-lot-b-magasin.md`).
Aucune migration, aucune écriture en base hors des actions de l'application elle-même (base réelle interrogée en lecture seule uniquement, Supabase MCP, `SELECT`/introspection système).

> **Repli documenté (skill `impeccable`)** : comme aux lots précédents, aucun binaire `impeccable` n'était en cache dans cette session et son lanceur télécharge un exécutable depuis GitHub avant de s'exécuter — ce téléchargement n'a pas été autorisé et n'a pas été lancé. Repli appliqué : relecture directe de `PRODUCT.md`/`DESIGN.md`, et application manuelle des principes `shape`/`clarify`/`harden`/`adapt` (copy, focus, états d'erreur, cibles de tap, accessibilité combobox) pendant l'écriture du formulaire, pas seulement en relecture. `web-design-guidelines` et `vercel-react-best-practices` ont été appliqués au fil de l'écriture (pas de composants inline superflus, dépendances de hooks correctes, `mutationKey`/rollback ciblé conformes au motif TanStack v5).

## Synthèse

- **Formulaire qui reste ouvert (#1)** : plus d'`onDone`. `AddCourseToggle` et `QuickAddFab` (mode `course`) ne ferment plus qu'via leur bouton de fermeture (« Fermer », avant « Annuler ») ou le retour (`useBackClose`/`goBackSteps`, inchangés). Champ vidé **à la soumission**, refocus explicite, bouton « Ajouter » jamais désactivé pendant une mutation.
- **Ajout multiple (#2)** : `decouperLibellesMultiples` (virgules, retours ligne, `;`, exception décimale, puces/cases, dédoublonnage interne, plafond 30, longueur max 100). Interception du `paste` multi-ligne. Aperçu (« N articles : … ») et bouton « Ajouter N articles » dès que plusieurs articles sont détectés.
- **Doublons (#3)** : `planifierAjoutCourses` (actif → déjà présent, archivé → réactiver en tête, lot mixte, ordre conservé) exécutée côté client sur le cache partagé avec `CoursesList`, puis **rejouée côté serveur** dans la nouvelle action `ajouterArticlesCourses` — le serveur fait foi.
- **« Habituels » (#4)** : `suggererArticles`, autocomplétion combobox/listbox sur le dernier segment, à partir des articles **archivés déjà chargés dans le cache de la page** — aucune requête ni migration supplémentaire, conformément à l'hypothèse imposée. Limite consignée ci-dessous.
- **Saisie (#5)** : `enterKeyHint="send"`, texte 16px local (`text-base`), sans toucher au token partagé `input` de `ui.ts`.
- **Retour de succès (#6)** : message inline (`role="status"`, `aria-live="polite"`), une seule ligne qui se remplace à chaque ajout — pas de toast empilé.
- **Reliquat lot B** : bouton « Suppr. » de `CourseItemRow` porté à 44px de haut (`min-h-11`), sans modifier le token partagé `dangerButton`.
- `tsc`, `eslint` et `npm run build` passent tous (une seule erreur `tsc` préexistante, hors périmètre). 42 scénarios scriptés, tous verts.

## Ce qui a été fait, fichier par fichier

### `src/lib/courses/compute.ts` — commit `82f7825`

Ajouts (fonctions pures, testées avant écriture — voir « Tests scriptés ») :

- `cleDoublon(libelle)` : NFD, accents retirés, minuscules, espaces multiples réduits, trim. Point de définition unique, réutilisé côté client (planification optimiste, autocomplétion) et côté serveur (`ajouterArticlesCourses`).
- `decouperLibellesMultiples(saisie)` → `{ ok: true, libelles } | { ok: false, erreur }`. Découpe sur retours ligne et `;` toujours, sur la virgule sauf entre deux chiffres (protection temporaire du motif `\d,\d` par un caractère de contrôle avant `split(",")`, puis restauration). Retire puces/cases (`-`, `•`, `*`, `[ ]`, `[x]`, `1.`, `2)`), trim, filtre les entrées vides, dédoublonne à l'intérieur du lot par `cleDoublon` (garde la première occurrence). Plafond `PLAFOND_ARTICLES_COURSES = 30` et `LONGUEUR_MAX_LIBELLE_COURSE = 100` : renvoient une erreur exploitable par l'UI plutôt que de tronquer.
- `planifierAjoutCourses(libelles, itemsExistants)` → `{ aCreer, aReactiver, dejaPresents }`. Un actif identique (y compris `temp-…`) → `dejaPresents` ; un archivé identique → `aReactiver` (id + libelle d'origine, non renommé) ; sinon → `aCreer`. Un doublon interne au lot contre un élément déjà planifié (créé ou réactivé) part aussi en `dejaPresents`. **Ne compare aucune date** pour choisir le plus récent parmi plusieurs archivés identiques : suppose que `itemsExistants` est trié comme `getCoursesItems` (coche asc, created_at desc, le tri partagé par le cache client et la requête serveur), auquel cas le premier archivé rencontré pour une clé donnée EST le plus récent — voir « Écarts » pour la justification de ce choix.
- `suggererArticles(segment, itemsExistants, max = 4)` : uniquement les articles archivés, dédoublonnés par `cleDoublon` (garde le libellé du plus récent `termine_le`), filtrés sur le début du libellé ou d'un de ses mots (insensible casse/accents), classés par occurrences puis récence. Segment vide → `[]`.

### `src/app/actions/courses.ts` — commit `a63e069`

`createCourseItem`/`toggleCourseItem`/`deleteCourseItem`/`updateCourseItem`/`deleteCourseItems`/`restoreCourseItems` **inchangées**. Nouvelle action :

- `ajouterArticlesCourses(libelles: string[])` : valide 1 à 30 entrées, trim, non vide, longueur max (miroir des constantes de `compute.ts`) ; relit les articles existants (`id, libelle, coche`, même tri que `getCoursesItems`) ; rejoue `planifierAjoutCourses` **côté serveur** (source de vérité, y compris au rejeu de la file offline avec un cache client périmé) ; insère les nouveaux articles en **un seul `INSERT`** avec `created_at = maintenant + i ms` (strictement croissant, ordre de saisie) ; réactive chaque archivé identique par un `UPDATE` (`coche: false, created_at: maintenant + …`) — jamais d'upsert malin ; `revalidatePath("/courses")` ; renvoie `{ crees, reactives, dejaPresents }`.

### `src/lib/offline/queue.ts` — commit `a63e069`

`ajouterArticlesCourses` importée et déclarée dans `ACTIONS.courses`. `decisionAvantExecution` (`flush-policy.ts`) n'a **pas eu besoin d'être modifiée** : son garde-fou ne cible que `toggleCourseItem`/`deleteCourseItem`/`updateCourseItem` par nom d'action, jamais `ajouterArticlesCourses` — vérifié par deux tests dédiés, y compris avec un libellé commençant littéralement par `temp-` dans le tableau (son premier argument est un tableau de libellés, jamais un id).

### `src/app/(app)/courses/AddCourseForm.tsx` — réécrit, commit `0c4d06c`

Réécriture complète (plus de prop `onDone`). Points clés :

- `useQuery({ queryKey: queryKeys.courses, queryFn: getCoursesItems })` — même clé et même fonction que `CoursesList`, pour lire un cache déjà chargé sur `/courses`, ou déclencher son propre chargement quand le formulaire est monté seul (modale du FAB).
- Soumission : `decouperLibellesMultiples` puis, si `ok`, **vidage du champ immédiatement**, `planifierAjoutCourses` sur le cache, message inline défini de façon optimiste, puis `mutation.mutate(...)` seulement s'il y a quelque chose à créer/réactiver.
- Mutation : `mutationKey: ["courses", "ajouterArticlesCourses"]`, `networkMode: "always"` (même motif que les autres mutations Courses des lots B/C : sans cette option, une mutation hors ligne resterait en pause et n'atteindrait jamais le repli Dexie). `onMutate` insère des `temp-…` à `created_at` croissant pour les créations et remet `coche: false, termine_le: null, created_at: maintenant` pour chaque réactivation, en capturant dans le contexte les ids `temp-` créés et une copie de l'état d'origine de chaque article réactivé. `onError` retire **uniquement** ces ids-là et restaure **uniquement** ces articles-là à leur état d'origine (rollback ciblé, pas un instantané global qui écraserait un autre ajout encore en vol). `onSettled` n'invalide `queryKeys.courses` que si `queryClient.isMutating({ mutationKey }) <= 1` (voir « Vérifications de la Phase 1 » pour la justification du seuil à 1 et non 0).
- `onPaste` : si le texte collé contient des retours à la ligne, les remplace par `", "` à la position du curseur avant que le navigateur ne les perde.
- Aperçu et bouton dynamique : `decouperLibellesMultiples(texte)` recalculé à chaque frappe (`useMemo`) ; au-delà d'un article détecté, ligne d'aperçu (« N articles : Lait · Œufs · Pain ») et bouton « Ajouter N articles ». L'erreur de plafond/longueur s'affiche dès la frappe (pas seulement à la soumission), dans le même style que l'erreur de soumission.
- Autocomplétion : segmentation sur la simple présence d'une virgule (pas le découpage complet avec exception décimale — c'est cette présence qui distingue "un seul segment" de "plusieurs segments", conformément à l'énoncé). `suggererArticles(segmentCourant, items)` sur le dernier segment, jusqu'à 4 suggestions, rendues en `role="listbox"` de boutons `min-h-11` (44px), navigation clavier (flèches, Entrée, Échap), `aria-activedescendant`. Un seul segment → la sélection vide le champ et soumet immédiatement (réactivation) ; plusieurs segments → complète juste le dernier segment sans envoyer. `onPointerDown={preventDefault}` sur chaque suggestion et sur le bouton d'envoi pour ne jamais voler le focus du champ (clavier qui reste ouvert), complété par un refocus explicite après soumission.
- `input` local : `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `autoComplete="off"`, `enterKeyHint="send"`, classes reprenant le token partagé `input` de `ui.ts` mais en `text-base` (16px) au lieu de `text-[15px]` — chaîne de classes locale, le token partagé n'est pas modifié (même motif que le renommage inline du lot B).
- Placeholder : `"Ex. lait, œufs, pain"` (trois articles réels), remplace `"Ex. Pâtes, 2 avocats..."` qui se lisait comme deux articles.
- Restauration du texte en cas d'échec **seulement si le champ est vide** au moment de l'échec : `dernierTexteEnvoyeRef` capture ce qui a été soumis (texte brut pour un envoi classique, libellé exact pour une réactivation par suggestion), `texteRef` (synchronisé par `useEffect`) donne l'état courant du champ au moment de l'erreur.

### `src/app/(app)/courses/AddCourseToggle.tsx` — commit `0c4d06c`

`<AddCourseForm onDone={...} />` → `<AddCourseForm />`. Bouton « Annuler » → « Fermer » (n'annule plus rien en cours, puisqu'un ajout réussi ne referme plus le formulaire).

### `src/app/(app)/QuickAddFab.tsx` — commit `0c4d06c`

Mode `course` : `<AddCourseForm onDone={() => goBackSteps(2)} />` → `<AddCourseForm />`. La fermeture reste possible via le bouton « Fermer » de la `Modal` ou le retour (`useBackClose`/`goBackSteps`, tous deux toujours utilisés par les autres modes — `tache`/`note` inchangés).

### `src/app/(app)/courses/CourseItemRow.tsx` — commit `0c4d06c`

Reliquat lot B : bouton « Suppr. » → `` `${dangerButton} flex min-h-11 items-center justify-center` `` (44px de haut, sans modifier le token partagé `dangerButton` utilisé par une vingtaine d'écrans). Aucun autre changement à ce fichier.

## Écarts avec le prompt et justifications

### `planifierAjoutCourses` ne reçoit pas `created_at` et ne compare aucune date

Le prompt liste, pour `planifierAjoutCourses`, un paramètre `itemsExistants` sans préciser ses colonnes, mais demande explicitement à `ajouterArticlesCourses` de « lire les articles existants (`id, libelle, coche`) » — **sans `created_at`**. Ces deux exigences seraient contradictoires si `planifierAjoutCourses` devait comparer des dates pour choisir le plus récent parmi plusieurs archivés identiques. Résolu ainsi : la fonction pure suppose que `itemsExistants` est trié comme `getCoursesItems` (coche asc, created_at desc — le tri déjà partagé par le cache client, `CoursesList`, et par la requête que `ajouterArticlesCourses` exécute elle-même avec le même `order()`) ; dans un tel ordre, le **premier** archivé rencontré pour une clé donnée est nécessairement le plus récent, sans qu'aucune date n'ait besoin d'être comparée. Documenté dans le commentaire de la fonction. Testé (« plusieurs archivés identiques »).

### Copy des messages de succès et de fermeture

Le prompt propose des exemples de copy « à affiner » et un bouton « Fermer » « ou équivalent validé par `clarify` ». `impeccable`/`clarify` n'étant pas disponible cette session (repli documenté en tête de rapport), les exemples du prompt ont été repris tels quels ou combinés (`messageResultat` dans `AddCourseForm.tsx`), sans passe de validation automatisée dédiée à la copy — jugement manuel appliqué au fil de l'écriture.

### Suggestions rendues en flux normal, pas en overlay positionné

Le prompt demande de vérifier que la liste de suggestions ne masque pas le bouton d'envoi, y compris dans la modale du FAB avec le clavier ouvert, « sinon adapte ». Choix fait **en amont**, plutôt que de constater puis corriger un recouvrement : les suggestions sont rendues en flux normal (`flex flex-wrap`) directement sous le champ, poussant le reste du formulaire (aperçu, erreur, bouton) plus bas au lieu de se superposer en position absolue. Ce choix ne peut donc pas masquer le bouton, par construction, mais n'a pas pu être vérifié visuellement sur un vrai clavier virtuel (voir « Limites »).

### Aucun autre écart

Le reste du prompt a été suivi tel quel : pas de nouvelle dépendance, pas de migration, `createAdminClient()` dans `ajouterArticlesCourses`, `revalidatePath("/courses")`, fonctions pures dans `compute.ts` écrites et testées avant l'UI, `estIdTemporaire`/`cleDoublon` avec un seul point de définition chacun, commits locaux atomiques (4, un par étape de la Phase 2) sur `kilio`, sans push.

## Vérifications de la Phase 1

1. **Paste multi-ligne dans un `<input type="text">`** : comportement documenté des navigateurs (pas testable sur appareil dans cette session) — un texte collé contenant des retours à la ligne est aplati en une seule ligne par la plupart des navigateurs mobiles (les `\n` sont supprimés ou remplacés par des espaces) *avant* que la valeur ne soit committée dans l'`<input>`. Conséquence retenue : intercepter l'événement `paste` **avant** que ce comportement par défaut ne s'applique (`e.preventDefault()`), lire `clipboardData.getData("text")` directement (qui, lui, conserve les vrais `\n`), remplacer les retours ligne par `", "`, et insérer le résultat à la position du curseur (`selectionStart`/`selectionEnd`) — implémenté dans `handlePaste`. Non vérifié sur un vrai clavier mobile dans cette session (voir checklist).
2. **Ordre d'un insert groupé** : confirmé en base réelle, en lecture seule. `created_at` a bien `DEFAULT now()` (vérifié via `list_tables`). Une requête `select now() = now()` dans le même statement renvoie `true`, confirmant que `now()` est stable pour toute la durée d'une transaction/d'un statement Postgres — donc **toutes les lignes d'un même `INSERT` multi-valeurs reçoivent un `created_at` strictement identique**, rendant leur ordre relatif indéterminé au tri `created_at desc`. **Preuve supplémentaire trouvée dans les données réelles** : deux articles archivés existants (`Dosettes lave-vaisselle` et `Lingettes absorbantes lave-linge`) partagent exactement le même `created_at` à la microseconde près (`2026-08-31 09:45:38.692373+00`), confirmant que ce cas se produit déjà en pratique sur l'installation de Vincent. D'où l'assignation explicite de `created_at = maintenant + i ms` dans `ajouterArticlesCourses`.
3. **Motif TanStack v5 pour mutations concurrentes** : aucune doc Markdown embarquée pour `@tanstack/react-query` dans `node_modules` (contrairement à `next/dist/docs`) — vérifié par recherche de fichiers. Confirmé à la place par lecture directe du **code source installé** (`node_modules/@tanstack/query-core/build/modern/queryClient.js`) : `isMutating(filters)` renvoie le nombre de mutations dont le statut est `"pending"` et qui correspondent aux `filters` (ex. `{ mutationKey }`). Point important vérifié dans `mutation.js` : les callbacks `onSettled` s'exécutent **avant** le `dispatch` qui fait passer la mutation à `"success"`/`"error"` — la mutation elle-même est donc encore comptée comme `"pending"` par `isMutating` pendant l'exécution de son propre `onSettled`. D'où le garde `queryClient.isMutating({ mutationKey }) <= 1` (et non `=== 0`) : la mutation qui se termine se compte elle-même, le seuil à 1 signifie « aucune AUTRE mutation de cette clé n'est encore en vol ».

## Résultats des vérifications

### `npx tsc --noEmit`

```
src/app/layout.tsx(41,56): error TS2304: Cannot find name 'LayoutProps'.
```
Seule erreur, préexistante et hors périmètre (déjà documentée dans les rapports précédents : audit, lots C et B).

### `npx eslint src`

Aucune sortie — 0 erreur, 0 avertissement.

### `npm run build`

```
✓ Compiled successfully in 9.6s
  Running TypeScript ...
  Finished TypeScript in 7.5s ...
✓ Generating static pages using 3 workers (24/24) in 335ms
```
24 routes générées dont `/courses` (`ƒ`, dynamique, inchangée dans sa nature).

### Tests scriptés

Script isolé, hors repo (scratchpad de session), aucune dépendance ajoutée au projet, aucune écriture en base. Charge les **vrais fichiers** du repo (`src/lib/courses/compute.ts`, `src/lib/offline/flush-policy.ts`) via un loader ESM qui réécrit l'alias `@/...` (les fichiers sources ne sont pas modifiés pour le test) — écrits **avant** l'implémentation des fonctions pures (TDD : les 15 premiers tests échouaient à l'import avant l'écriture de `compute.ts`, confirmé par une exécution intermédiaire renvoyant `SyntaxError: ... does not provide an export named 'LONGUEUR_MAX_LIBELLE_COURSE'`).

Sortie réelle de l'exécution finale (`node --experimental-strip-types --experimental-loader ./resolve-alias-loader.mjs test-lot-a.mjs`) :

```
ok   cleDoublon: casse
ok   cleDoublon: accents (NFD)
ok   cleDoublon: espaces multiples + trim
ok   cleDoublon: distingue des mots différents
ok   decoupage: simple virgule
ok   decoupage: retours ligne
ok   decoupage: point-virgule
ok   decoupage: virgule décimale entre deux chiffres préservée
ok   decoupage: virgule décimale mélangée à une vraie liste
ok   decoupage: puces et cases collées depuis une note
ok   decoupage: entrées vides filtrées
ok   decoupage: doublons internes, on garde le premier
ok   decoupage: plafond de 30 articles dépassé -> erreur
ok   decoupage: exactement 30 articles -> ok
ok   decoupage: libellé trop long -> erreur exploitable
ok   decoupage: libellé à la limite exacte -> ok
ok   decoupage: saisie vide -> ok, liste vide (pas d'erreur)
ok   decoupage: un seul article simple (pas de virgule/ligne)
ok   planifier: actif identique -> déjà présent
ok   planifier: actif temp- identique -> déjà présent
ok   planifier: archivé identique -> à réactiver
ok   planifier: plusieurs archivés identiques -> le plus récent (premier dans l'ordre serveur)
ok   planifier: lot mixte, ordre de saisie conservé
ok   planifier: nouveau libellé sans correspondance -> à créer
ok   planifier: doublon interne du lot contre un archivé -> une seule réactivation
ok   suggererArticles: segment vide -> aucune suggestion
ok   suggererArticles: archivés uniquement (ignore les actifs)
ok   suggererArticles: match sur un mot du libellé, pas seulement le début
ok   suggererArticles: classement par occurrences puis récence
ok   suggererArticles: à égalité d'occurrences, le plus récent d'abord
ok   suggererArticles: dédoublonnées par cleDoublon
ok   suggererArticles: plafond par défaut à 4
ok   suggererArticles: plafond personnalisé
ok   suggererArticles: aucune correspondance -> []
ok   régression: estIdTemporaire toujours correct
ok   régression: compterProgression toujours correct
ok   régression: trierCommeServeur toujours correct
ok   flush-policy: ajouterArticlesCourses n'est JAMAIS purgée (payload = tableau de libellés)
ok   flush-policy: ajouterArticlesCourses avec un libellé commençant par 'temp-' n'est PAS purgée
ok   flush-policy: régression toggle/delete/update sur id temp- toujours purgés
ok   [intégration file] ajouterArticlesCourses (payload = tableau de libellés) n'est jamais purgée, même avec un libellé 'temp-...'
ok   [intégration file] file mixte (create/toggle/ajouterArticlesCourses) : ordre respecté, file vide après synchro

42 passés, 0 échoués
```

### Base réelle (lecture seule)

- **Schéma `courses_items`** : identique à `src/lib/supabase/types.ts` (`id uuid default gen_random_uuid()`, `libelle text` sans contrainte de longueur — `character_maximum_length` = `null`, confirmé par `information_schema.columns` —, `coche boolean default false`, `created_at`/`updated_at timestamptz default now()`, `termine_le timestamptz` nullable). Aucune contrainte au-delà de `courses_items_pkey` (clé primaire sur `id`) : pas de contrainte d'unicité sur `libelle`, confirmé.
- **Triggers** : `trg_courses_items_termine_le` et `trg_courses_items_updated_at`, tous deux `BEFORE UPDATE` uniquement (`pg_get_triggerdef`) — **aucun des deux ne se déclenche sur un `INSERT`**, confirmant que l'`INSERT` groupé de `ajouterArticlesCourses` (nouveaux articles) n'est jamais réécrit par ces triggers, et que l'`UPDATE` de réactivation déclenche normalement les deux (`updated_at` rafraîchi, `termine_le` remis à `null` par `set_termine_le()` puisque `coche` passe de `true` à `false` — comportement déjà confirmé par le lot B pour le sens inverse).
- **Volume et longueurs** : 15 lignes (6 actives, 9 archivées), longueur de `libelle` min 6, max 32, moyenne 17,4 caractères — confirme que le plafond de 100 caractères retenu pour `LONGUEUR_MAX_LIBELLE_COURSE` laisse une marge large par rapport à l'usage réel actuel.

## Limites

### Fenêtre de 30 jours des suggestions (« habituels »)

Conformément à l'hypothèse de départ imposée par ce prompt, la source des suggestions est l'historique des articles archivés **déjà chargés dans le cache de la page**, sans migration ni table d'historique dédiée. Cette source est plafonnée par le nettoyage automatique (`reglages_nettoyage`, `delai_jours = 30`, confirmé actif en base) : **un article acheté une fois toutes les 5 à 6 semaines ou moins souvent ne sera jamais suggéré**, puisqu'il aura été supprimé de la base avant de pouvoir resservir. C'est une limite structurelle assumée par ce lot, pas un bug — elle était déjà consignée comme telle dans l'audit (constat #4) et confirmée ici sans changement.

### Absence de test des nouvelles écritures en base

La contrainte de lecture seule (Supabase MCP, `SELECT` uniquement) interdit toute vérification par exécution réelle de :
- l'`INSERT` groupé de `ajouterArticlesCourses` (nouveaux articles, `created_at` explicite croissant) ;
- l'`UPDATE` de réactivation (`coche: false, created_at: …`) et son interaction réelle avec `set_termine_le()`/`set_updated_at()` sur des données live.

Ces deux points reposent sur : (a) la lecture du schéma et des triggers (confirmés compatibles, voir ci-dessus), (b) le comportement Postgres documenté de `now()` (vérifié en lecture seule), et (c) le comportement déjà confirmé par le lot B pour l'`UPDATE`/réactivation via `restoreCourseItems` (même mécanisme de triggers, sens inverse). Aucune de ces déductions n'a pu être confirmée par une écriture réelle dans cette session.

### Points « à vérifier sur appareil »

Rien de ce qui suit n'a pu être testé dans cette session (pas de credentials Supabase pour `next dev`, pas d'appareil, pas de simulation fiable de clavier virtuel/gestes tactiles/mode avion) :

1. **Ajouter 5 articles de suite depuis `/courses`** (`AddCourseToggle`) : le clavier doit rester ouvert, aucun re-tap sur le champ nécessaire entre deux ajouts.
2. **Idem depuis le FAB du dashboard** (`QuickAddFab`, mode `course`) : même comportement dans la modale, la liste de suggestions ne doit jamais masquer le bouton d'envoi une fois le clavier virtuel ouvert.
3. **Taper l'article suivant pendant que le précédent est encore en cours** : le texte tapé ne doit pas être effacé par la réponse du précédent ajout (vérifie le vidage à la soumission et non à `onSuccess`).
4. **Coller une liste multi-ligne** depuis l'app Notes (iOS et Android) : vérifie que les retours ligne sont bien convertis en `", "` par `handlePaste` malgré le comportement natif de l'`<input>` qui les aurait sinon aplatis en espaces/rien.
5. **« 1,5 L de lait »** : doit rester un seul article (pas coupé sur la virgule décimale).
6. **Ajouter un doublon actif** : message inline (« … déjà dans la liste »), pas de second article créé.
7. **Ajouter un doublon archivé** : l'article remonte en tête de la liste active, message « … remis dans la liste ».
8. **Autocomplétion** : tap sur une suggestion avec un seul segment dans le champ (ajout immédiat, champ vidé) puis avec plusieurs segments (complète juste le dernier, n'envoie rien) ; cibles de tap (44px) et clavier qui reste ouvert au tap sur une suggestion.
9. **Ajout multiple hors ligne puis reconnexion** : un seul rejeu de `ajouterArticlesCourses`, pas de doublon, ordre conservé (le serveur refait le plan à la reconnexion, sur les données alors à jour).
10. **Échec serveur pendant deux ajouts simultanés** : aucun des deux ajouts optimistes ne doit écraser l'autre (rollback ciblé, `mutationKey` partagé mais contexte par appel).
11. **Bouton « Suppr. » à 44px** : vérifier visuellement que la ligne d'article ne casse pas sa mise en page et que l'alignement avec la case et le libellé reste correct.
12. **Non-régression Tâches, Notes, Habitudes** : aucun fichier de ces modules n'a été touché par ce lot — à confirmer sur appareil comme aux lots précédents.

## Bilan du chantier Courses (audit + lots C, B, A)

### Ce qui est traité

- **Fiabilité offline (lot C)** : `flushQueue` distingue erreur réseau/permanente, ne bloque plus indéfiniment les autres modules sur un id `temp-` Courses.
- **Usage en magasin (lot B)** : suppression immédiate + Annuler, renommage inline, « Vider les cochés », compteur de progression.
- **Saisie rapide (lot A, ce rapport)** : formulaire qui reste ouvert, ajout multiple, doublons/réactivation, autocomplétion « habituels », retour de succès inline, cible de tap du bouton « Suppr. ».

Les 6 constats de l'audit visant spécifiquement la saisie (#1 à #6) sont désormais couverts, de même que les 4 constats magasin (#7 à #10) et les 3 constats de fiabilité offline (#13 à #15).

### Ce qui reste ouvert

- **Observation `onSettled` du lot C, toujours valable et non aggravée par ce lot** : `AddCourseForm` (comme les autres mutations Courses) invalide `queryKeys.courses` de façon inconditionnelle en cas de succès (sous réserve du garde `isMutating` ajouté par ce lot, qui ne change que le **moment** de l'invalidation, pas le mécanisme de protection contre un refetch prématuré après une reconnexion — celui-ci reste porté par `useOnlineSync`/`providers.tsx`, non modifiés ici).
- **`prefers-reduced-motion` des toasts simples** (observation du lot B, non corrigée) : reste ouverte, transverse à tout Kilio, hors périmètre de ce lot (aucun toast simple n'a été ajouté ou modifié ici — seul le message inline, statique, a été ajouté).
- **Historique dédié pour les « habituels »** : la fenêtre de 30 jours (voir « Limites ») reste une limitation structurelle assumée. Si Vincent constate en usage réel qu'elle est trop courte pour des achats occasionnels importants, les options b/c de l'audit original (historique dédié non purgé, ou délai de nettoyage détaché du réglage global) restent à trancher — aucune n'a été implémentée ici, conformément à la consigne de ne pas introduire de migration sans validation explicite.
- **Ordre exact d'un lot mixte create + réactivation** : `ajouterArticlesCourses` assigne un `created_at` croissant à l'ensemble des créations, **puis** à l'ensemble des réactivations (deux compteurs contigus, pas un entrelacement strict selon l'ordre de saisie d'origine). Concrètement, dans un lot mixte, les articles réactivés se retrouvent toujours au-dessus des articles nouvellement créés dans la même soumission, même si un article créé a été tapé après un article réactivé. Comportement mineur, non testé sur appareil, à surveiller si Vincent le remarque.

### Recommandation de suite

Le chantier Courses tel que découpé par l'audit (C → B → A) est maintenant complet sur les 15 constats identifiés. Aucune suite n'est nécessaire dans l'immédiat sauf si l'usage réel révèle l'un des deux points encore ouverts ci-dessus (fenêtre des habituels trop courte, ou ordre d'un lot mixte surprenant) — dans ce cas, un prompt ciblé sur ce seul point suffirait, plutôt qu'un nouveau lot complet.

## Vérifications (Phase 3)

- `git status` : seuls les 6 fichiers du périmètre (`src/lib/courses/compute.ts`, `src/app/actions/courses.ts`, `src/lib/offline/queue.ts`, `src/app/(app)/courses/AddCourseForm.tsx`, `src/app/(app)/courses/AddCourseToggle.tsx`, `src/app/(app)/QuickAddFab.tsx`, `src/app/(app)/courses/CourseItemRow.tsx`) et ce rapport ont été modifiés/ajoutés. `node_modules/`, `.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo` ignorés par `.gitignore`.
- 3 commits locaux atomiques sur `claude/courses-lot-a-saisie-99grgb` (contenu identique à `origin/kilio` avant ce lot) :
  - `82f7825` — fonctions pures de saisie (compute.ts).
  - `a63e069` — Server Action `ajouterArticlesCourses`.
  - `0c4d06c` — formulaire de saisie rapide + reliquat lot B.
- Aucun push effectué.
