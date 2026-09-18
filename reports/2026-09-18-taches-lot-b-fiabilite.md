# Lot B — Fiabilité de la saisie du module Tâches (constats #6, #18, #12, #17)

Date : 2026-09-18
Base : `kilio` @ `2e0b560` (lot A). Constats traités : #6, #18, #12, #17 de `reports/2026-09-18-audit-module-taches.md`, en tenant compte de « Impact sur le lot B » du rapport du lot A.
Aucune migration, aucune écriture en base hors des actions de l'application elle-même (la base n'a été interrogée qu'en lecture seule).

## Synthèse

- **#6** : une création dont l'étape tags ou images échoue **n'est plus une erreur** : la tâche est conservée, l'utilisateur reçoit un avertissement en français, et le doublon au « Créer » suivant n'est plus possible. Les champs non contrôlés ne sont plus effacés après une erreur (`<form onSubmit>` + `startTransition`).
- **#18** : la croix d'une image existante ne supprime plus rien sur le serveur ; la suppression a lieu à « Enregistrer », et « Annuler » n'a plus rien à annuler.
- **#12** : cocher et supprimer une tâche atteignent maintenant la file Dexie hors ligne (`networkMode: "always"`), et les données sont rafraîchies après le rejeu ; créer et éditer affichent un message clair au lieu de planter vers `error.tsx`.
- **#17** : supprimer une liste affiche le nombre exact de tâches concernées, puis supprime la liste **et** ses tâches (fichiers d'images compris), sans exception ni message masqué.

Vérifié : `tsc` (0 erreur), `lint` (0 erreur), `build` (réussi, sans credentials), un banc d'essai qui exécute le vrai `taches.ts` contre un faux client Supabase en mémoire (**19 scénarios**), un test de plateforme dans Chrome, et une passe du détecteur `impeccable` (aucun constat sur le code ajouté). **Rien n'a pu être testé dans l'application lancée** (pas de credentials Supabase) : voir « À vérifier sur appareil ».

## Autorisation `impeccable`

- Le moteur 0.1.5 était déjà en cache (`~/.impeccable/bin/0.1.5/`, téléchargé et vérifié par sha256 lors de la session précédente) : **aucun téléchargement n'a eu lieu cette fois**. `impeccable context` lancé une fois ; références `harden.md` et `craft-floor.md` lues avant l'édition. Aucun hook activé, modifié ou désactivé ; `.impeccable/` et `.impeccable/config.json` non touchés (`git status` le confirme).
- Détecteur lancé **une seule fois**, en fin de session (voir « Détecteur »).

## Base de données (lecture seule)

- `taches` et `tache_images` : colonnes identiques à `src/lib/supabase/types.ts` (aucun décalage).
- **Toutes** les FK qui pointent vers `taches` : `sous_taches`, `tache_images`, `taches_tags`, toutes `ON DELETE CASCADE`. **Aucune autre table ne référence `taches`** : pas d'arrêt sur le #17. `taches_liste_id_fkey` (`taches` → `listes_taches`) est `NO ACTION`, et n'est pas modifiée.
- Tâches par liste (total / faites) : Général 57 / 36, Kilio 52 / 44, Officio 22 / 8, Vendre 11 / 2, Déco appartement 5 / 1, These 5 / 0, Heures Supp 3 / 0, Skills 8 / 0, Trucs à acheter 1 / 0. Les 5 images de tâches appartiennent toutes à des tâches de « Kilio ».
- Bucket `tache-images` : chemins `${tacheId}/${uuid}.jpg`, URL publique `…/storage/v1/object/public/tache-images/<chemin>` ; `extraireCheminStorage` les décode correctement.
- **Défaut existant** (voir plus bas) : le bucket contient 7 objets pour 5 lignes `tache_images` (2 orphelins).

## #6 — Création fiable (doublons et champs effacés)

**Fichiers** : `src/app/actions/taches.ts`, `src/lib/taches/compute.ts`, `AddTaskForm.tsx`, `AddTaskToggle.tsx`, `QuickAddFab.tsx`, `TachesView.tsx`, `agenda/DayView.tsx`, `agenda/AgendaView.tsx`, `toast-store.ts`.

**Serveur.**
- `TacheFormState` gagne `avertissement?: string`. `createTache` : après l'insertion, un échec des tags **ou** des images est journalisé (`console.error`) et converti en `{ error: null, id, avertissement }` ; `revalidateTachesPaths()` est appelé sur tous les chemins de sortie après insertion. Le texte vient de la fonction pure `messageAvertissementCreation` (« Tâche créée, mais l'envoi de l'image a échoué. Rouvre la tâche pour réessayer. » ; variantes tags seuls, images au pluriel, tags et image ensemble).
- `uploadTacheImages` : si l'insertion de la ligne `tache_images` échoue après un upload Storage réussi, l'objet orphelin est supprimé (au mieux : un échec de ce nettoyage est journalisé sans masquer l'erreur d'origine).
- `updateTache` garde `{ error }` en cas d'échec de tags/images (une mise à jour est rejouable) mais appelle `revalidateTachesPaths()` avant de retourner, la mise à jour principale étant déjà appliquée. Si la mise à jour principale elle-même échoue, rien n'est appliqué et rien n'est revalidé.

**Client.** `AddTaskForm` appelle `onDone(state.id, state.avertissement)` ; `TachesView.handleCreated` affiche l'avertissement à la place de « Tâche créée » (toast de 6,5 s : `showToast` accepte maintenant une durée optionnelle, additif) ; le FAB relaie l'argument.

**Champs effacés — preuve dans les sources de `react-dom` 19** (`node_modules/react-dom/cjs/react-dom-client.development.js`) :
- `requestFormReset$1(formFiber)` n'est appelé que dans `startHostTransition` (ligne 8955), juste avant `return action(formData)` : c'est le chemin d'un `<form action={fn}>`, et il s'exécute que l'action renvoie une erreur ou non. L'autre occurrence (ligne 27527) est l'API publique `ReactDOM.requestFormReset`, que rien n'appelle ici.
- Sans prop `action`, React n'intercepte pas la soumission : rien n'est réinitialisé. `AddTaskForm` utilise donc `<form onSubmit>` : `preventDefault()`, `new FormData(e.currentTarget)`, puis `startTransition(() => formAction(formData))`.
- `pending` reste vrai pendant l'action : dans `dispatchActionState`, `setPendingState(true)` n'est appelé que si `ReactSharedInternals.T !== null`, c'est-à-dire dans une transition. Le `startTransition` explicite est donc indispensable.
- Un verrou (`submitLockRef` + `pendingRef`) empêche deux envois simultanés (double tap, Entrée puis « Créer ») ; il est réarmé par un effet dédié qui ne dépend pas de `onDone` (identité instable) et qui dépend de `state`, pour le cas où l'action se résout aussitôt (hors ligne).
- Vérifié dans Chrome 152 sur une page de test (DOM natif, hors application) : avec un `<details>` **fermé**, `new FormData(form)` contient `nouveaux_tags`, `notes`, `rappel_minutes`, le fichier de l'input, `tag_ids` et `delete_image_ids` ; `requestSubmit()` déclenche bien le gestionnaire `submit` ; avec un titre requis vide, la validation native bloque `requestSubmit()` (aucun envoi). Les champs non contrôlés gardent leur valeur après l'envoi. **Limite** : ce test porte sur la plateforme, pas sur l'application elle-même.
- Le champ date reste non contrôlé (`defaultValue` + `ref`), et Entrée (`requestSubmit()`), le `<details>`, la puce « Aujourd'hui » et l'autofocus du lot A sont inchangés.

## #18 — Suppression d'image différée

- **`AddTaskForm`** : la croix retire la vignette et ajoute l'id à `imagesASupprimer` (état conservé si l'envoi échoue) ; chaque id part dans un `<input type="hidden" name="delete_image_ids">` **hors du `<details>`**. Plus aucun appel serveur à la croix (`useTransition` et `disabled` du bouton retirés).
- **`updateTache`** : après la mise à jour principale et les tags, `supprimerImagesDeTache` ne traite que les ids qui sont des UUID **et** qui appartiennent à la tâche (`tache_id`) ; l'objet Storage est supprimé **avant** la ligne (en cas d'échec Storage la ligne reste, l'opération est rejouable). « Annuler » ne supprime rien.
- **`deleteTacheImage`** n'avait plus d'autre appelant que `AddTaskForm` (vérifié par recherche) : la Server Action publique est **supprimée**. Le banc d'essai vérifie qu'elle n'existe plus.

## #12 — Hors ligne

**Mutations de `TaskCard`.** `networkMode: "always"` sur `toggleMutation` et `deleteMutation`. Test isolé avec `@tanstack/query-core` et les options de `providers.tsx` (script hors repo) :
- sans l'option, hors ligne : `mutationFn` **jamais appelée**, file Dexie vide ;
- avec l'option : le toggle est bien mis en file, la requête de rafraîchissement est en pause (`fetchStatus: "paused"`), `onMutate`/`onSettled` restent cohérents ;
- **écart découvert** : à la reconnexion, le refetch en pause repart et lit le serveur **avant** le rejeu de la file ; il écrase le cache optimiste avec l'ancien état (la coche « revient »), et rien ne rafraîchit ensuite (cache faux, serveur juste, jusqu'à la prochaine invalidation).

**Correctif (petit, sur une infrastructure partagée).** `flushQueue()` renvoie maintenant le nombre d'actions rejouées ; `useOnlineSync(onSynced)` appelle un rappel après un rejeu réussi ; `providers.tsx` y branche `queryClient.invalidateQueries()` (la file couvre aussi notes, courses et habitudes, d'où l'invalidation globale). Comportement inchangé quand la file est vide.

**Création/édition.** L'action passée à `useActionState` est enveloppée : si `navigator.onLine === false`, ou si l'appel échoue avec une erreur réseau (`isNetworkError`), le formulaire reçoit `{ error }` en français (« Connexion impossible : la tâche n'a pas été enregistrée. Vérifie ta connexion et réessaie. » ; variante « les modifications n'ont pas été enregistrées » en édition), affiché dans la zone `role="alert"` existante. La saisie est conservée (pas de reset, cf. #6) et il n'y a pas de crash vers `error.tsx`. Toute autre erreur est relancée, comme demandé. Aucune file hors ligne pour la création/édition.

## #17 — Suppression d'une liste avec avertissement

**Serveur — `deleteListe(id, supprimerTaches = false, totalAttendu?)`** renvoie `{ error: string | null; confirmation?: { total; faites } }` et **ne lève plus d'exception** (Next masque en production le message des exceptions d'une Server Action). Déroulé :
1. lecture de la liste ; « Général » refusée ;
2. comptage des tâches (`total`, `faites`) ;
3. `total > 0` sans `supprimerTaches` → **rien n'est supprimé**, retour de `confirmation` ;
4. sinon, si des tâches existent : fichiers Storage des images (chemins via `extraireCheminStorage`, lots de 100) ; **en cas d'échec Storage, retour d'erreur avant toute suppression en base** ; puis les tâches (les sous-tâches, lignes d'images et liens de tags partent par CASCADE, vérifié en base) par lots de 100 ; puis la liste ; `revalidateTachesPaths()` et `revalidatePath("/taches/listes")`.
5. Non transactionnel, rejouable. **États intermédiaires possibles**, à connaître : (a) images supprimées du bucket alors que leurs lignes existent encore (tâches sans fichier), si Storage réussit partiellement puis échoue ; (b) une partie des tâches supprimée alors que la liste existe encore, si la suppression échoue en cours de route ; dans les deux cas le message invite à réessayer et un nouvel essai termine le travail. Ni transaction ni migration ajoutées.

**Textes.** `messageSuppressionListe(nom, total, faites)` (fonction pure, accords singulier/pluriel) : « Supprimer la liste « Kilio » et ses 12 tâches (dont 9 faites) ? Cette action est définitive : les tâches, leurs sous-tâches et leurs images seront supprimées. » ; liste vide : « Supprimer la liste « X » ? ».

**Page et composant.** `listes/page.tsx` récupère les comptes par liste (`getComptesTachesParListe`, dans le `Promise.all` existant) et `ListesManager` affiche « 12 tâches » / « 1 tâche » / « Aucune tâche » sous chaque nom. `handleDelete` : confirmation avec le compte affiché → `deleteListe(id, total > 0, total)` ; si le serveur renvoie `confirmation` (compte périmé), nouvelle confirmation avec les chiffres réels puis `deleteListe(id, true, total réel)` ; refus = rien de supprimé ; succès → `invalidateQueries` sur `queryKeys.taches` et `queryKeys.listes` + `showToast("Liste supprimée")` ; erreurs dans le paragraphe existant, `role="alert"`. Seul appelant de `deleteListe` : `ListesManager`, mis à jour.

## Défaut existant signalé, non corrigé : `deleteTache` ne supprime pas les fichiers Storage

`deleteTache` (`taches.ts`) supprime uniquement la ligne ; les lignes `tache_images` partent par CASCADE mais les fichiers restent dans le bucket. **Constat en base** : 7 objets dans `tache-images` pour 5 lignes `tache_images`, dont 2 orphelins. La même limite s'applique à la suppression des « Tâches du jour » par `pg_cron` et à la fonction Edge `nettoyage-auto` (aucun appel Storage dans `supabase/functions/nettoyage-auto/index.ts`). Elle est **déjà documentée comme « limite héritée »** dans `reports/2026-09-13-taches-programme-jour.md` ; ce lot n'y change rien. À traiter à part, par exemple par un rapprochement périodique bucket ↔ table (l'action de ce lot supprime, elle, les fichiers dans `deleteListe`).

## Vérifications

- `npx tsc --noEmit` : 0 erreur (avant et après le build). `npm run lint` : 0 erreur, 0 avertissement. `npm run build` : réussi, aucun credential requis.
- `git diff --stat` : 15 fichiers modifiés, 513 insertions, 78 suppressions (fins de ligne LF/CRLF normalisées par git). Aucune migration, aucun script, rien dans `.impeccable/`.
- **Appelants** (recherche) : `createTache` / `updateTache` ne sont appelés que par `AddTaskForm` (via ses 3 points de montage : carte `AddTaskToggle`, édition `TasksList`, FAB ; l'Agenda passe par `AddTaskToggle` et `AddTaskForm`) ; `deleteListe` par `ListesManager` seul ; `deleteTacheImage` n'a plus aucun appelant. `DayView`, `AgendaView` et le dashboard compilent avec le nouvel argument.
- **Fonctions pures** (script Node isolé, hors repo, type-stripping natif) : `messageSuppressionListe` sur 9 cas — liste vide (0,0), 1 tâche non faite (1,0), 1 tâche faite (1,1), 2 (2,0), 5 (5,0), 11 dont 1 faite (11,1), 12 dont 9 faites (12,9), 3 toutes faites (3,3), total négatif ; `libelleNombreTaches` (0 / 1 / 12) ; `messageAvertissementCreation` (aucun échec, image seule, images au pluriel, tags seuls, tags et image) ; `messageHorsLigne` (création / édition).
- **Banc d'essai des Server Actions** (hors repo : il charge le vrai `taches.ts` avec un faux client Supabase en mémoire qui journalise chaque opération, `next/cache` et `sharp` remplacés par des stubs) — **19 scénarios, tous verts** :
  - `deleteListe` (8) : sans `supprimerTaches`, aucune suppression et compte exact renvoyé ; compte attendu périmé, aucune suppression ; chemin nominal, ordre exact `storage.remove` → `delete:taches` → `delete:listes_taches` avec les bons chemins de fichiers ; **échec Storage : seule la tentative Storage a lieu, aucune suppression en base, tâches et liste intactes** ; « Général » refusée sans aucune suppression ; liste vide supprimée sans Storage ; 250 tâches supprimées par lots de 100/100/50 ; échec de suppression des tâches, la liste n'est pas supprimée et les chemins sont revalidés. Conclusion : **aucune suppression en base avant l'échec possible de Storage, et aucune suppression de tâches sans `supprimerTaches` vrai**.
  - `createTache` (6) : succès complet (id, pas d'avertissement) ; tags en échec ; image en échec (sharp) ; échec d'insertion de la ligne image après upload (l'objet uploadé est supprimé) ; tags et image en échec (avertissement combiné) ; titre vide (erreur de formulaire, aucune insertion). Dans tous les cas où la tâche est insérée : `error: null`, `id` renvoyé, `/taches`, `/agenda` et `/` revalidés.
  - `updateTache` (4) : seule l'image de la tâche est supprimée (id étranger et id invalide ignorés) ; aucune opération sur les images sans `delete_image_ids` ; échec Storage (erreur renvoyée, ligne conservée, chemins revalidés) ; échec de la mise à jour principale (rien de supprimé, rien de revalidé).
  - Les scénarios d'échec écrivent des `console.error` attendus dans la sortie du banc.
- **Contrats du lot A** relus dans le code : `onDone` appelé une seule fois quand `pending` retombe à faux sans erreur ; `submitLockRef` libéré à la fin de l'action ; autofocus, Entrée, `<details>` (champs toujours dans le DOM, `tag_ids` en champs cachés hors du bloc), puce « Aujourd'hui » et `handleCreated` inchangés.

## Détecteur `impeccable` (une passe, en fin de session)

Cibles : `AddTaskForm`, `AddTaskToggle`, `TachesView`, `TasksList`, `QuickAddFab`, `ListesManager`, `listes/page`, `DayView`, `AgendaView`. **6 constats, tous « advisory » et de la même règle** (`design-system-font-size`), **tous sur des lignes préexistantes et non modifiées** : croix de suppression d'image `AddTaskForm.tsx:60`, puces `TachesView.tsx:189, 201`, message de recherche vide `TachesView.tsx:243`, sous-tâches `TasksList.tsx:144`, badge de priorité `TasksList.tsx:441`. Aucun constat sur le code ajouté ni sur `ListesManager`. Rien n'a été modifié en réponse (tailles au-dessus du plancher de 10 px de `DESIGN.md`).

## Écarts par rapport à la consigne

1. **`deleteListe` prend un troisième paramètre optionnel `totalAttendu`** (additif). Sans lui, un compte affiché **inférieur** au compte réel (tâches ajoutées depuis le chargement de la page) aurait supprimé plus de tâches que celles annoncées dans la confirmation. Avec lui, tout écart déclenche la nouvelle confirmation prévue.
2. **`showToast(text, dureeMs = 3200)`** : durée optionnelle, pour qu'un avertissement de deux lignes reste lisible.
3. **Avertissement affiché aussi hors de `/taches`** : `DayView`, `AgendaView` et le FAB du dashboard ignoraient l'argument ; ils affichent maintenant l'avertissement **seulement quand il existe** (une ligne chacun). Sans cela, un échec d'image ou de tags y aurait été perdu en silence, alors qu'il restait visible (dans le formulaire) avant ce lot.
4. **`flushQueue` / `useOnlineSync` / `providers.tsx`** modifiés (infrastructure partagée) : nécessaire d'après la simulation du #12 ; comportement inchangé quand il n'y a rien à rejouer.
5. **`revalidatePath("/taches/listes")`** ajouté dans `deleteListe` (fait partie du #19, qui n'est pas traité pour le reste).
6. **Suppression des tâches par `id in (…)`** (les tâches exactement comptées et confirmées) plutôt que par `liste_id`, pour qu'une tâche ajoutée entre-temps ne soit jamais supprimée sans avoir été annoncée : elle fait alors échouer la suppression de la liste (clé étrangère), avec un message de réessai.
7. Fonctions pures supplémentaires dans `compute.ts` : `messageAvertissementCreation`, `messageHorsLigne`, `libelleNombreTaches`, `DUREE_TOAST_AVERTISSEMENT_MS`.
8. `AddTaskForm` importe `isNetworkError` de `@/lib/offline/queue` : le chunk du formulaire référence donc Dexie, déjà présent dans le bundle principal (via `providers`) : pas de doublon attendu.

## Décisions laissées ouvertes

- **Échec partiel d'un lot d'images en édition** : si la 2e image d'un lot échoue après la 1re, la 1re est enregistrée ; comme le formulaire reste ouvert avec sa sélection, un nouvel « Enregistrer » renverrait aussi la 1re (doublon d'image). Non traité (cas rare, à trancher : vider la sélection réussie, ou dédoublonner).
- **Après un avertissement à la création**, la sélection d'images est perdue avec la fermeture du formulaire : il faut rouvrir la tâche et rechoisir la photo (c'est le texte du message).
- **`deleteListe` non transactionnelle** : voir les états intermédiaires (#17). Une fonction SQL transactionnelle demanderait une migration, exclue ici.
- **`uploadTacheImages` reste une Server Action exportée** (donc appelable publiquement), comme avant ce lot ; non modifié.
- **`extraireCheminStorage` est dupliquée** dans `taches.ts`, `collections.ts` et `documents.ts` ; non factorisée.
- **Même schéma « mutation + repli Dexie » sans `networkMode: "always"`** ailleurs : `DashboardTaskItem.tsx` (tâches du dashboard), `NoteCard.tsx`, `HabitudeCard.tsx`, `DashboardHabitItem.tsx`, `CourseItemRow.tsx`, `AddCourseForm.tsx` : hors périmètre, à traiter avec le même correctif.
- **Compte des tâches par liste** lu par un `select liste_id, fait` sur toute la table (agrégé en JS) : sans souci à 163 tâches, à revoir si le volume grandit.

## À vérifier sur appareil

1. **Création avec image en échec** (par exemple en coupant le réseau juste après l'envoi, ou avec un fichier non image renommé) : **une seule** tâche créée, toast d'avertissement de 6 s, pas de doublon, la tâche apparaît dans la liste (avec surbrillance) ; depuis le dashboard et l'Agenda, le toast apparaît aussi.
2. **Champs conservés après une erreur** : provoquer une erreur (hors ligne) après avoir rempli notes, échéance, liste, nouveaux tags et une image ; les champs, la sélection d'image et l'état du « Plus d'options » restent tels quels.
3. **Suppression d'une image puis « Annuler »** : l'image est toujours là (carte et formulaire rouvert).
4. **Suppression d'une image puis « Enregistrer »** : elle disparaît de la carte et du bucket.
5. **Mode avion** : cocher et supprimer une tâche affichent « Enregistré, sera synchronisé à la reconnexion » et gardent l'état affiché ; au retour du réseau, la file est rejouée (toast « N action(s) synchronisée(s) »), **la coche ne revient pas en arrière** et l'écran reflète l'état réel ; créer et éditer affichent le message « Connexion impossible… » **sans planter** vers `error.tsx`, saisie conservée ; « Créer » refonctionne au retour du réseau.
6. **Suppression d'une liste avec tâches** : la ligne affiche « N tâches » ; la confirmation donne les nombres exacts (« … et ses N tâches (dont M faites) ? Cette action est définitive… ») ; « Annuler » ne supprime rien ; « OK » supprime la liste et ses tâches, qui disparaissent aussi de `/taches`, de l'Agenda et du dashboard, avec le toast « Liste supprimée ». Avec une liste contenant une image, vérifier que le fichier a bien disparu du bucket.
7. **Suppression d'une liste vide** : confirmation simple « Supprimer la liste « X » ? ».
8. **Compte périmé** : ouvrir `/taches/listes` dans un onglet, ajouter une tâche à la liste dans un autre, puis supprimer la liste depuis le premier : une seconde confirmation avec le nombre réel doit apparaître.
9. **Entrée et double envoi** (lot A) : Entrée dans le titre envoie toujours ; taper deux fois vite sur « Créer » ne crée qu'une tâche.

## Points écartés volontairement

- Lots C à F (gestes, contrastes, cibles de tap, performance, états) ; correctif d'Entrée sur Android (en attente de test) ; `aujourdhuiISO()` en UTC ; nettoyage du Storage dans `deleteTache` (signalé ci-dessus) ; le reste du #19 (cache TanStack des listes/tags autres que la suppression de liste, harmonisation de `revalidatePath`).
- File hors ligne pour la création/édition (formulaire avec fichiers) : exclue par la consigne.
- Aucun changement de clé étrangère ni de migration ; aucune dépendance ajoutée.

## Impact éventuel sur le lot C

- **Gestes** : `AddTaskForm` est désormais un `<form onSubmit>` sans `action` ; rien ne change pour `data-swipe-ignore` ou l'isolation de `PullToRefresh` qu'on y ajouterait (mêmes éléments DOM). Les mutations de `TaskCard` (cocher, supprimer) sont passées en `networkMode: "always"` : le drag & drop (`enregistrerOrdreTaches`, appel direct) n'est pas concerné.
- **`ListesManager`** : les flèches ↑ ↓ de réordonnancement des listes sont inchangées (cibles minuscules, lot D) ; la ligne compte maintenant un second libellé (`text-xs`) sous le nom.
- **Toast** : les avertissements longs s'affichent sur deux lignes dans une pastille `rounded-full` ; à surveiller si le lot D retouche `ToastHost`.
