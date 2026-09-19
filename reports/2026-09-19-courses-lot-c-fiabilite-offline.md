# Courses — Lot C : fiabilité de la file offline

Date : 2026-09-19
Base : `kilio` @ `6279c7a` (audit du 2026-09-19). Constats traités : #13, #14, #15 de `reports/2026-09-19-audit-module-courses.md`.
Aucune migration, aucune écriture en base hors des actions de l'application elle-même (la base n'a été interrogée qu'en lecture seule, pour relire la doc Next locale — aucune requête Supabase dans cette session).

## Synthèse

- **#13/#15** : une action `toggleCourseItem`/`deleteCourseItem` ciblant un id optimiste `temp-...` (article créé hors ligne, jamais confirmé par le serveur) est désormais **court-circuitée avant tout appel serveur** et retirée de la file. Côté UI, `CourseItemRow` **désactive** la case à cocher et le bouton « Suppr. » tant que l'article est dans cet état, avec un libellé visible « En attente de synchro » — l'action ne peut donc plus être déclenchée par l'utilisateur en usage normal, et ne peut plus, par construction, être mise en file.
- **#14** : `flushQueue` distingue maintenant une erreur réseau (comportement inchangé : on s'arrête, on retentera) d'une erreur non réseau (compteur de tentatives, abandon de l'action au 3ᵉ échec, **la file continue avec les actions suivantes** au lieu de rester bloquée indéfiniment). Un toast informe l'utilisateur quand des actions ont été abandonnées.
- Le scénario exact de l'audit (création Courses, `toggleTache`, `toggleCourseItem("temp-...")`, `deleteCourseItem("temp-...")`, `deleteTache`) passe de **3 actions restées bloquées** à **file vide**, vérifié par un banc d'essai qui exécute les vraies fonctions de décision (voir « Tests scriptés »).
- `tsc`, `eslint` et `npm run build` passent tous, sans rien corriger d'autre que le périmètre demandé.

## Ce qui a été fait, fichier par fichier

### `src/lib/offline/flush-policy.ts` (nouveau)

Politique de décision de `flushQueue`, extraite en fonctions **pures** (aucun import de Dexie ni de Server Action) :

- `decisionAvantExecution(action)` : renvoie `{ type: "purger_immediat" }` si `action.module === "courses"` et `action.action_name` est `toggleCourseItem`/`deleteCourseItem` et que `action.payload[0]` est un id `temp-...` (via `estIdTemporaire`, voir plus bas) ; `{ type: "executer" }` sinon.
- `decisionApresEchec(action, estErreurReseau)` : erreur réseau → `{ type: "reessayer_plus_tard", tentatives: <inchangé> }` ; erreur non réseau → incrémente `tentatives`, renvoie `abandonner_et_continuer` au 3ᵉ échec (`SEUIL_ABANDON_TENTATIVES = 3`), sinon `reessayer_plus_tard` avec le compteur mis à jour.

### `src/lib/courses/compute.ts`

Ajout de `estIdTemporaire(id: unknown): boolean` (`typeof id === "string" && id.startsWith("temp-")`), réutilisée à la fois par `flush-policy.ts` et par le garde-fou UI de `CourseItemRow` — une seule définition, comme demandé.

### `src/lib/offline/db.ts`

Ajout de `tentatives?: number` sur le type `PendingAction`. Champ optionnel, non indexé : **aucun bump de version Dexie** (le schéma `"++id, created_at"` ne déclare que la clé primaire et les index, Dexie stocke l'objet entier quel que soit le schéma déclaré — vérifié par la documentation Dexie et par le comportement observé dans les tests scriptés, qui lisent/écrivent ce champ sans erreur sur un magasin en mémoire équivalent).

### `src/lib/offline/queue.ts`

- `flushQueue()` retourne maintenant `{ synced: number; abandoned: number }` au lieu d'un simple `number`.
- Avant tout appel serveur, applique `decisionAvantExecution` : si `purger_immediat`, retire l'action et l'incrémente dans `abandoned` sans jamais appeler la Server Action (`console.warn` pour trace).
- Au premier échec d'une action exécutée, applique `decisionApresEchec` : `abandonner_et_continuer` → retire l'action, l'incrémente dans `abandoned`, **`continue`** la boucle (ne casse plus tout) ; `reessayer_plus_tard` → persiste le nouveau compteur de tentatives (`db.pending_actions.update`) puis `break` (comportement identique à avant pour les erreurs réseau, puisque leur compteur ne change jamais).
- Deux toasts distincts en fin de flush : succès (inchangé) et abandon (nouveau, singulier/pluriel correct, 5 s d'affichage).

### `src/lib/offline/useOnlineSync.ts` et `src/app/providers.tsx`

Adaptés au nouveau contrat `{ synced, abandoned }` : `onSynced` (qui invalide tout le cache TanStack Query) se déclenche désormais aussi quand des actions ont été **abandonnées**, pas seulement synchronisées — un abandon peut laisser un article optimiste fantôme à l'écran, qu'il faut aussi rafraîchir. Seul appelant de `flushQueue` recensé (`grep -rn "flushQueue" src`, un seul résultat hors définition) : le changement de signature ne casse aucun autre appelant.

### `src/app/(app)/courses/CourseItemRow.tsx`

- `enAttenteDeCreation = estIdTemporaire(item.id)`.
- `CheckToggle` et le bouton « Suppr. » reçoivent `disabled={... || enAttenteDeCreation}`.
- État visuel sobre : `opacity-60` sur la ligne de contrôles, `aria-busy` sur le `<li>`, libellé secondaire visible « En attente de synchro » (`text-xs text-ink-2`, pas de nouvelle couleur, pas de nouvelle animation — `motion.li` existant inchangé, donc `prefers-reduced-motion` reste respecté comme avant). Le libellé et l'opacité se lèvent seuls dès que le refetch remplace l'article optimiste par la ligne réelle (id serveur), puisque `enAttenteDeCreation` est recalculé à chaque rendu à partir de `item.id`.
- Défense en profondeur dans les deux `mutationFn` (`toggleMutation`, `deleteMutation`) : si un appel arrivait malgré tout (id encore temporaire) et échouait avec une erreur réseau, l'action n'est **jamais** mise en file (`if (enAttenteDeCreation) throw err;`) — l'erreur est relancée et déclenche le rollback + toast d'erreur habituels de `onError`, sans jamais écrire d'entrée irrécupérable dans Dexie.

## Écarts avec le prompt et justifications

### `networkMode` sur les mutations Courses : **non ajouté**

Conclusion de la Phase 1 (point 7) : l'absence de `networkMode: "always"` sur les mutations de `CourseItemRow`/`AddCourseForm` n'est **pas nécessaire à corriger dans ce lot**, pour deux raisons :

1. Le garde-fou UI de ce lot (désactiver cocher/supprimer tant que `estIdTemporaire(item.id)`) protège déjà contre le scénario de l'audit **indépendamment** du `networkMode` : que la mutation soit en pause (mode par défaut, vrai passage hors ligne) ou qu'elle s'exécute et échoue par un `fetch` raté (connexion instable, `navigator.onLine` toujours vrai), l'article reste affiché avec un id `temp-...` tant que sa création n'est pas confirmée, et les deux contrôles restent désactivés dans les deux cas.
2. Ajouter `networkMode: "always"` changerait un comportement plus large (le chemin exact par lequel une mutation Courses atteint ou non `enqueueAction` lors d'un vrai passage hors ligne du navigateur), non demandé explicitement par ce prompt et plus proche du périmètre du lot B (magasin) ou d'une passe dédiée sur les 4 modules — l'ajouter silencieusement ici aurait élargi le lot au-delà de « flushQueue + garde-fou Courses ».

**Signalé pour la suite** : l'asymétrie reste réelle (Tâches a reçu `networkMode: "always"` au lot B, pas Courses/Notes/Habitudes) et mériterait sa propre décision de périmètre plutôt qu'un ajout incident dans ce lot.

### Seuil de 3 tentatives avant abandon : confirmé nécessaire par la doc Next locale

Phase 1 (point 6) : `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` documente explicitement (§ `error.message`) que **« Errors forwarded from Server Components show a generic message with an identifier. This is to prevent leaking sensitive details »** — en production, le message d'une erreur qui traverse la couche Server Actions/Server Components est remplacé par un texte générique (un `digest` sert à retrouver l'erreur réelle dans les logs serveur, inaccessibles au client). Cette redaction ne s'applique qu'aux erreurs **levées côté serveur** (dont l'erreur Postgres `22P02` du constat #13) — elle ne concerne pas les erreurs `fetch` du navigateur (« Failed to fetch », etc.) que `isNetworkError` reconnaît, puisque celles-ci se produisent **avant** d'atteindre le serveur.

Conséquence directe pour la conception : en production, `flushQueue` **ne peut pas** distinguer une erreur métier permanente (id invalide, ligne supprimée entretemps) d'un incident serveur transitoire (5xx passager) par le **texte** de l'erreur non réseau — les deux arriveraient avec le même message générique. D'où le choix d'un compteur de tentatives plutôt qu'une classification par contenu : une erreur non réseau répétée 3 fois de suite est traitée comme définitive, qu'elle le soit réellement ou non. C'est un compromis assumé (voir « Limites » ci-dessous), pas une certitude absolue — le prompt anticipait déjà cette alternative (« Si la vérification du point 6 montre que le message est exploitable, propose un critère plus fin » — ici le message n'est pas exploitable en production, donc le compteur reste la meilleure option disponible sans changer l'architecture d'erreur des Server Actions).

### Aucun autre écart

Le reste du prompt a été suivi tel quel : pas de nouvelle Server Action, pas de nouvelle dépendance, pas de migration, `ACTIONS` de `queue.ts` non modifié, une seule définition d'`estIdTemporaire` réutilisée aux deux endroits prévus.

## Tests scriptés

Script isolé, hors repo (scratchpad de session), **aucune dépendance ajoutée au projet**. Deux niveaux :

1. **Fonctions pures réelles**, importées directement depuis leur chemin dans le repo (`src/lib/offline/flush-policy.ts`, `src/lib/courses/compute.ts`) via un petit loader ESM qui réécrit l'alias `@/...` (nécessaire uniquement pour que le script isolé résolve les imports internes du fichier — le fichier source lui-même n'a pas été modifié pour le test). Contrairement au script de reproduction de l'audit (qui recopiait la boucle), ce test **charge le vrai fichier** : un bug qui y serait introduit serait détecté ici.
2. **Boucle reproduisant fidèlement le wiring de `flushQueue`** (relu au moment d'écrire le test), avec un faux `db` en mémoire (même API que Dexie utilisée : `toArray`/`delete`/`update`) et de fausses Server Actions, pour vérifier l'intégration bout en bout sans toucher Supabase.

Sortie réelle de l'exécution (`node --experimental-loader ./resolve-alias-loader.mjs test-flush-policy.mjs`) :

```
ok   estIdTemporaire: id temp-
ok   estIdTemporaire: uuid réel
ok   estIdTemporaire: valeur non-string
ok   decisionAvantExecution: toggleCourseItem sur id temp- -> purge
ok   decisionAvantExecution: deleteCourseItem sur id temp- -> purge
ok   decisionAvantExecution: createCourseItem (payload = libellé, jamais un id) -> exécuter
ok   decisionAvantExecution: toggleCourseItem sur uuid réel -> exécuter
ok   decisionAvantExecution: id temp- sur un AUTRE module -> exécuter (le court-circuit est spécifique à Courses)
ok   decisionApresEchec: erreur réseau -> reessayer, compteur inchangé (0)
ok   decisionApresEchec: erreur réseau avec tentatives déjà à 2 -> inchangé
ok   decisionApresEchec: 1er échec non réseau -> reessayer, compteur à 1
ok   decisionApresEchec: 2e échec non réseau -> reessayer, compteur à 2
ok   decisionApresEchec: 3e échec non réseau (seuil = 3) -> abandonner
ok   [scénario] file vide -> {synced:0, abandoned:0}
ok   [scénario] file entièrement synchronisable -> tout part, rien d'abandonné (régression)
ok   [scénario] erreur réseau : l'action reste, tentatives inchangé, la boucle s'arrête
ok   [scénario] erreur non réseau 1ʳᵉ fois : l'action reste, tentatives=1, la boucle s'arrête
ok   [scénario] erreur non réseau 2ᵉ fois (déjà à 1) : l'action reste, tentatives=2, la boucle s'arrête
ok   [scénario] erreur non réseau 3ᵉ fois (déjà à 2) : l'action est retirée, la boucle CONTINUE
ok   [scénario] action courses sur id temp- : purgée sans appel serveur, la file se débloque pour d'AUTRES modules
ok   [scénario] scénario exact de l'audit (#13) : la file passe de 3 actions bloquées à 0

TOUT PASSE
```

Tous les scénarios demandés par le prompt sont couverts, y compris le scénario exact de l'audit et la régression (file vide / file entièrement synchronisable, comportement identique à avant).

## Vérifications (Phase 3)

- `npx tsc --noEmit` (après `npm ci`, `node_modules` absent en début de session) : **une seule erreur**, `src/app/layout.tsx(41,56): error TS2304: Cannot find name 'LayoutProps'` — préexistante, déjà documentée dans les rapports précédents (audit Tâches, audit Courses), sans rapport avec ce lot, non corrigée.
- `npx eslint src` : ✅ aucune erreur, aucun avertissement.
- `npm run build` : ✅ compilation Turbopack réussie, TypeScript interne inclus, 24 routes générées dont `/courses`.
- `git status` : seuls les fichiers du périmètre modifiés/ajoutés (`src/lib/offline/{queue,db,useOnlineSync,flush-policy}.ts`, `src/lib/courses/compute.ts`, `src/app/(app)/courses/CourseItemRow.tsx`, `src/app/providers.tsx`) et ce rapport. Aucune migration, aucun fichier hors périmètre. Commit local créé sur `kilio`, **non poussé**.

## Limites et points à vérifier sur appareil

- **Le compromis du compteur de 3 tentatives** (voir « Écarts ») signifie qu'un incident serveur réellement transitoire (mais qui se reproduit 3 fois de suite avant de se résoudre) ferait abandonner une action légitime. C'est un choix assumé par ce prompt, pas un bug : aucune correction alternative n'a été implémentée sans validation de Vincent.
- **Observation, non corrigée** (demandée explicitement par le prompt) : `AddCourseForm.onSettled` invalide inconditionnellement `queryKeys.courses`, y compris quand la création vient d'être mise en file (hors ligne). Si le réseau redevient disponible juste assez longtemps pour que ce refetch réussisse — sans que `flushQueue` ait encore rejoué la création en attente — la réponse serveur ne contient pas encore le nouvel article : l'article optimiste `temp-...` peut alors **disparaître de l'écran** avant d'avoir été synchronisé, alors que sa création reste bel et bien en file et aboutira normalement au prochain flush réussi. Rien dans le code actuel ne distingue ce cas d'un échec réel. Effet secondaire à noter : tant que l'article n'est pas affiché, l'utilisateur ne peut pas non plus le cocher/supprimer par erreur — ce scénario ne réintroduit donc pas le bug corrigé par ce lot, mais reste une source de confusion (« mon article a disparu ») à traiter séparément si Vincent le juge prioritaire.
- **Checklist de vérification manuelle sur appareil** (rendu, gestes, mode avion — non testables dans cette session cloud) :
  1. **Mode avion, Courses** : créer un article hors ligne (apparaît avec un état visuel identique à un article normal — pas de `temp-` visible en soi, seul l'id interne change) ; **essayer** de le cocher/supprimer : la case et le bouton « Suppr. » doivent apparaître grisés, avec le texte « En attente de synchro » sous le libellé. Revenir en ligne : l'article doit se synchroniser normalement (toast « 1 action synchronisée »), redevenir cochable/supprimable, et le libellé « En attente de synchro » doit disparaître.
  2. **Reproduire un id `temp-` déjà bloqué** (état antérieur à ce lot, s'il existe sur l'appareil de Vincent) : au prochain retour en ligne, un toast « 1 action hors ligne n'a pas pu être synchronisée et a été abandonnée » devrait apparaître une fois, et les autres modules (Tâches, Notes, Habitudes) devraient recommencer à synchroniser leurs propres actions en attente si elles existaient.
  3. **Tâches, Notes, Habitudes — non-régression** : cocher/supprimer une tâche, une note, une entrée d'habitude en mode avion, revenir en ligne : comportement inchangé (toast « N action(s) synchronisée(s) », pas de toast d'abandon).
  4. **Connexion instable plutôt que mode avion** (Wi-Fi capricieux, 4G en zone limite) : ajouter un article Courses pendant une coupure courte ; si l'ajout échoue avec un message réseau, vérifier que la case reste grisée jusqu'à confirmation, sans jamais pouvoir être cochée entre-temps.
  5. **Toast d'abandon en français correct** : singulier (« 1 action... a été abandonnée ») vs pluriel (« N actions... ont été abandonnées ») selon le nombre réel d'actions concernées.

## Ce qui reste pour les lots B et A

- **Ce que ce lot apporte** : toute nouvelle action offline (renommage envisagé au lot B, création multiple envisagée au lot A) peut désormais être déclarée dans `ACTIONS.courses` sans hériter du risque de blocage permanent de toute la file partagée — une erreur non réseau répétée s'auto-résout au bout de 3 tentatives au lieu de bloquer indéfiniment Tâches/Notes/Habitudes. Le garde-fou `estIdTemporaire` est réutilisable tel quel si une future action (ex. un renommage) doit elle aussi être bloquée tant qu'un article reste optimiste.
- **Ce qu'il ne règle pas** : le lot C ne traite ni la fermeture du formulaire après chaque ajout (#1), ni l'absence d'ajout multiple (#2), ni les doublons (#3), ni les « habituels » (#4) — tous du lot A — ni le remplacement du `window.confirm`, le renommage, le « vider les cochés » ou le compteur x/y (#7-#10, lot B). L'observation sur `onSettled` (voir « Limites ») reste ouverte et n'a pas été corrigée, conformément au prompt.
- **`networkMode`** : reste un point ouvert (voir « Écarts ») à trancher explicitement pour le lot B ou une passe dédiée, plutôt qu'à ajouter incidemment.
