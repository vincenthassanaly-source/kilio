# Lot A — Saisie rapide du module Tâches (constats #1 à #5)

Date : 2026-09-18
Base : `kilio` @ `9819c72` (rapport d'audit `reports/2026-09-18-audit-module-taches.md`).
Périmètre : constats #1 à #5 de l'audit. Aucune migration, aucune écriture en base, aucune dépendance ajoutée.

## Synthèse

Les cinq constats sont traités. Sur `/taches` :

- un **FAB** en bas à droite ouvre directement le formulaire de tâche (#1) ;
- après « Créer », un **toast « Tâche créée »**, un scroll vers la carte et une surbrillance temporaire s'affichent, sans jamais modifier les filtres (#2, option B) ;
- le formulaire n'affiche par défaut que **titre, liste, échéance (+ puce « Aujourd'hui »)** ; le reste est dans un bloc « Plus d'options » replié, dont les champs restent dans le DOM (#3) ;
- **Entrée valide** le formulaire, Maj+Entrée insère un saut de ligne, et le chunk du formulaire est **préchargé** (#4) ;
- la vue « Aujourd'hui » ou « 7 jours » **pré-remplit l'échéance du jour**, pour la carte comme pour le FAB (#5).

Vérifié : `tsc` (0 erreur), `lint` (0 erreur), `build` (24 routes, sans credentials), détecteur `impeccable` (aucun constat sur le code ajouté). **Rien n'a pu être testé dans une app lancée** (pas de credentials Supabase) : voir « À vérifier sur appareil ».

## Autorisation `impeccable`

- Moteur `impeccable` 0.1.5 téléchargé par le lanceur du skill (sha256 vérifié par le lanceur, qui aurait refusé de l'exécuter sinon), mis en cache dans `~/.impeccable/bin/0.1.5/`. Aucun autre téléchargement.
- `impeccable context` lancé une fois ; `craft-floor.md` et `layout.md` lus avant l'édition. Aucun hook activé, modifié ou désactivé ; `.impeccable/` non touché (`git status` le confirme).
- Détecteur lancé **une seule fois**, en fin de session, sur les 5 fichiers d'interface modifiés (voir « Détecteur »).

## Base de données (lecture seule)

- `taches` : les 19 colonnes réelles sont identiques à `src/lib/supabase/types.ts` (aucun décalage).
- **1 titre sur 163 contient déjà un saut de ligne** (`titre like E'%\n%'`, et un `\r`). Conséquence : Maj+Entrée doit rester possible (c'est le cas) ; un clavier mobile n'ayant pas de Maj+Entrée, un titre multi-ligne ne peut plus se saisir qu'au clavier physique.

## #1 — Point d'entrée persistant sur `/taches`

**Fichiers** : `src/app/(app)/QuickAddFab.tsx`, `src/app/(app)/taches/TachesView.tsx`.

- `QuickAddFab` reçoit une prop optionnelle `directTask` (`{ defaultListeId, defaultEcheance, onCreated }`). Sans elle, le comportement du dashboard est inchangé. Avec elle : le « + » ouvre tout de suite la feuille « Nouvelle tâche », les entrées Courses/Tâches/Notes ne sont pas rendues, `aria-label="Ajouter une tâche"`, `aria-haspopup="dialog"`. Même position (`right-4`, `bottom: safe-area + 90px`) et même visuel que le FAB du dashboard.
- **Historique** : en mode direct, une seule entrée `useBackClose` (celle du formulaire) ; retour ou fermeture → fermeture complète ; après création, `goBackSteps(1)` au lieu de `goBackSteps(2)`. Le mode menu garde ses deux entrées.
- Monté dans `TachesView`, **hors de `PullToRefresh`** (ni le bouton ni la feuille ne partagent ses gestes). Reçoit les mêmes valeurs par défaut que la carte : liste sélectionnée et échéance du #5.
- `pb-12` sur le conteneur de la liste : les dernières cartes (« Modifier / Suppr. » à droite) restent hors de portée du FAB (le FAB s'étend jusqu'à 146 px + zone de sécurité au-dessus du bas d'écran ; `<main>` réserve déjà 112 px + zone de sécurité, +48 px ici).
- **Ajout non demandé** : le FAB est masqué pendant que le formulaire inline de la carte « + Ajouter une tâche » est ouvert (nouvelle prop `onOpenChange` sur `AddTaskToggle`), pour ne pas avoir deux formulaires de création possibles en même temps.

## #2 — Retour après création (option B)

**Fichiers** : `src/app/actions/taches.ts`, `AddTaskForm.tsx`, `AddTaskToggle.tsx`, `TachesView.tsx`, `TasksList.tsx`.

- `TacheFormState` gagne un champ optionnel `id?: string` ; `createTache` renvoie `{ error: null, id: tache.id }` en cas de succès (seule modification de la fonction). `updateTache` et tous les états d'erreur sont inchangés.
- `AddTaskForm` transmet cet `id` à `onDone`, `AddTaskToggle` à `onSaved`. Les appelants qui l'ignorent (Agenda : `DayView`, `AgendaView` ; édition dans `TasksList`) compilent et se comportent comme avant.
- **Un seul handler** `handleCreated(id)` dans `TachesView`, utilisé par la carte et par le FAB : `showToast("Tâche créée")`, invalidation de `queryKeys.taches`, mémorisation de l'id à surligner. L'ordre d'insertion (`ordre = max + 1`) et le tri serveur sont inchangés (option B).
- Surbrillance : réutilise la prop `highlighted` de `TaskCard` (`scrollIntoView` + classe `tache-surbrillance`). **Correction nécessaire** : ce mécanisme n'existait que dans la branche *non réordonnable* de `TaskCard` ; dans la vue « Toutes » (par défaut, réordonnable) il n'avait aucun effet. Le `<li>` de la branche réordonnable reçoit désormais l'`id`, la classe (sur la carte) et un ref combiné avec celui de dnd-kit. Aucun impact sur l'Agenda, qui utilise la branche non réordonnable.
- La surbrillance est retirée 3 s après l'apparition de la carte dans la liste (6 s si elle n'apparaît jamais), pour que l'effet de scroll ne rejoue pas aux re-rendus suivants.
- **Si la carte n'est pas dans la liste affichée** (filtre de vue, de liste ou recherche) : toast seul, les filtres ne sont jamais modifiés.
- `prefers-reduced-motion` : scroll instantané (`behavior: "auto"`) ; l'animation CSS était déjà neutralisée dans `globals.css`.

## #3 — Formulaire progressif

**Fichiers** : `AddTaskForm.tsx`, `src/lib/taches/compute.ts` (nouveau).

- Visibles par défaut : titre, liste, échéance (+ puce « Aujourd'hui », 44 px de haut, qui écrit la date du jour directement dans l'input resté non contrôlé), barre « Créer ».
- Bloc « Plus d'options » (`<details>` natif, `<summary>` de 44 px minimum, libellé + rappel « Heure, rappel, notes, images… » pour que le contenu se découvre) dans l'ordre demandé : heure et heure de fin, rappel, notes, « Tâche du jour », images, priorité, « Toute la journée », tags / nouveaux tags, récurrence / fin de récurrence. La logique conditionnelle existante (heure ↔ toute la journée ↔ rappel, fin de récurrence ↔ fréquence) est conservée telle quelle. Aucun champ supprimé.
- **Piège des tags** : l'état d'ouverture n'est utilisé que pour l'attribut `open` (`optionsOuvertes` apparaît deux fois dans le fichier : son initialisation et `open=`). Aucun champ n'est rendu conditionnellement dessus ; les `tag_ids` sont des `<input type="hidden">` hors du `<details>`. Un commentaire dans le JSX l'interdit explicitement.
- **En édition**, le bloc est déplié d'office si un champ avancé est renseigné : fonction pure `champsAvancesRenseignes(tache)` dans `src/lib/taches/compute.ts` (dossier créé), testée sur 12 cas (script Node isolé, hors repo).
- **Écart utile** : en création avec `defaultHeure` (prop prévue pour un créneau d'Agenda), le bloc est aussi déplié d'office, sinon une heure pré-remplie serait cachée. Aucun appelant actuel ne passe `defaultHeure` (vérifié par recherche), mais la prop existe.
- Pas de carte imbriquée : le bloc est séparé par un simple `border-t`. Le caractère non contrôlé des champs (`defaultValue`) n'est pas touché (lot B).

## #4 — Clavier

**Fichiers** : `AddTaskForm.tsx`, `src/app/(app)/taches/preloadAddTaskForm.ts` (nouveau), `AddTaskToggle.tsx`, `QuickAddFab.tsx`, `TachesView.tsx`.

- **Entrée = enregistrer** (création et édition) : `onKeyDown` sur le titre — Entrée sans Maj, hors composition (`isComposing`, `keyCode 229`) → `requestSubmit()` ; Maj+Entrée reste un saut de ligne ; `enterKeyHint="done"`. Le formulaire est validé avant (`checkValidity`, sinon la bulle native « champ requis » s'affiche) ; un verrou et l'état `pending` empêchent toute seconde soumission pendant qu'une action est en cours.
- **Écart** (filet de sécurité non demandé) : un écouteur natif `beforeinput` (`insertLineBreak`) couvre les claviers mobiles dont le `keydown` de la touche Entrée n'arrive pas sous la forme `{ key: "Enter" }`. Si `keydown` a déjà traité Entrée, cet évènement n'est jamais émis : pas de double traitement.
- **Préchargement** : `preloadAddTaskForm()` (import dynamique du même module que les `dynamic()` existants, donc un seul chunk) au `pointerdown`/`focus` de la carte « + Ajouter une tâche » et du FAB, et **à l'inactivité du navigateur** après l'affichage de `/taches` (`requestIdleCallback`, repli `setTimeout` pour Safari). Sur le dashboard, seuls `pointerdown`/`focus` du FAB préchargent (pas de chargement à l'idle, pour ne pas alourdir l'accueil).

## #5 — Échéance par défaut selon la vue

**Fichiers** : `src/lib/taches/compute.ts`, `TachesView.tsx`.

- `echeanceParDefaut(vue, today)` : `aujourdhui` et `semaine` → date du jour ; `en_retard` et `toutes` → aucune (testée sur les 4 vues). `today` vient de `aujourdhuiISO()` (`@/lib/budget/compute`, non dupliqué) ; `VueTache` est défini dans `compute.ts` et réutilisé par `TachesView`.
- Passée à `AddTaskToggle` (`defaultEcheance`, prop qui existait déjà) et au FAB.
- **À noter** : `aujourdhuiISO()` utilise `toISOString()` (UTC) : entre minuit et 1 h/2 h en heure de Paris, « aujourd'hui » vaut encore la veille. C'est le comportement existant de toute l'app, y compris du filtre « Aujourd'hui » ; la puce et le défaut restent donc cohérents avec le filtre. Non corrigé (hors périmètre).

## Détecteur `impeccable` (une passe, en fin de session)

Cibles : `AddTaskForm.tsx`, `AddTaskToggle.tsx`, `TachesView.tsx`, `TasksList.tsx`, `QuickAddFab.tsx`. **6 constats, tous de niveau « advisory » et de la même règle** (`design-system-font-size` : tailles `11px` et `13.5px` hors de l'échelle de `DESIGN.md`), **tous sur des lignes préexistantes** (croix de suppression d'image `AddTaskForm.tsx:60`, puces « Toutes » et de liste `TachesView.tsx:186, 198`, message de recherche vide `TachesView.tsx:240`, texte des sous-tâches `TasksList.tsx:144`, badge de priorité `TasksList.tsx:432`). Aucun constat sur le code ajouté ; rien n'a été modifié en réponse. Ces tailles sont au-dessus du plancher de 10 px de la charte.

## Vérifications

- `npx tsc --noEmit` : 0 erreur (avant et après le build).
- `npm run lint` : 0 erreur, 0 avertissement.
- `npm run build` : réussi, 24 routes, aucun credential requis. Les classes Tailwind du nouveau bloc (`group-open:rotate-180`, `motion-reduce:transition-none`, `ring-kcal`, marqueur `<summary>` masqué) sont bien présentes dans le CSS produit.
- `git diff --stat` : uniquement `QuickAddFab.tsx`, `AddTaskForm.tsx`, `AddTaskToggle.tsx`, `TachesView.tsx`, `TasksList.tsx`, `taches.ts` (6 fichiers) + 2 fichiers créés (`src/lib/taches/compute.ts`, `preloadAddTaskForm.ts`). Aucune migration, aucun script, rien dans `.impeccable/`. (Git signale un avertissement LF/CRLF sur les fichiers réécrits, sans conséquence : les fins de ligne sont normalisées.)
- Appelants relus par recherche et lecture : `AgendaView.tsx:248-256` (`onDone={() => …}`), `DayView.tsx:164-170` (`onSaved={() => …}`), `TasksList.tsx` en édition (`onDone={() => …}`) ignorent l'argument `id` et compilent ; `DashboardView.tsx:93` monte `<QuickAddFab />` sans prop, donc en mode menu inchangé.
- Piège des tags relu (voir #3). **Limite** : je n'ai pas pu exécuter le formulaire dans un navigateur (les fichiers locaux s'ouvrent en aperçu statique dans le pane, sans JavaScript). Le fait que les champs d'un `<details>` fermé restent dans le `FormData` repose sur la spécification HTML, pas sur un test exécuté : c'est le point n° 4 ci-dessous.

## À vérifier sur appareil

1. **Clavier Android** : dans le titre, Entrée valide (création **et** édition) ; sur un clavier virtuel, l'icône de la touche est bien « valider » ; pendant la saisie d'un mot suggéré, Entrée ne soumet pas trop tôt ; Maj+Entrée (clavier physique) insère un saut de ligne ; un titre vide affiche la bulle « champ requis » sans rien envoyer.
2. **FAB face à la `BottomNav` et aux dernières cartes** : position identique à celle du dashboard, pas de chevauchement avec la barre du bas, dernière carte de « Toutes » entièrement accessible (boutons « Modifier / Suppr. » à droite), FAB masqué quand le formulaire inline est ouvert, retour arrière du téléphone qui ferme la feuille (une seule fois), fermeture par la croix ou le fond.
3. **Scroll + surbrillance après création dans « Toutes » (70+ cartes)** : la tâche créée est en fin de liste ; le scroll l'amène au centre, la surbrillance dure environ 3 s, le toast « Tâche créée » s'affiche sans masquer le FAB ; même comportement depuis la carte et depuis le FAB ; avec un filtre de liste ou une recherche qui exclut la tâche, seul le toast apparaît.
4. **Tags conservés** : « Enregistrer » une tâche taguée **sans ouvrir « Plus d'options »** ne doit effacer aucun tag (le point le plus sensible de ce lot) ; idem pour heure, rappel, notes, images, priorité, récurrence.
5. **Édition** : une tâche avec notes, heure ou tags s'ouvre avec « Plus d'options » déplié ; une tâche simple l'ouvre replié.
6. **Échéance par défaut** : sous « Aujourd'hui » et « 7 jours », le formulaire (carte et FAB) est pré-rempli avec la date du jour, et la tâche créée reste visible ; sous « Toutes » et « En retard », le champ est vide ; la puce « Aujourd'hui » remplit bien le champ.
7. **Création depuis l'Agenda** (jour sélectionné) : comportement inchangé (échéance pré-remplie, formulaire replié, « Créer » collant).
8. **Chargement du formulaire** : la première ouverture n'attend pas le réseau (préchargement au premier appui / à l'idle).

## Décisions laissées ouvertes

- **Insertion en fin de liste** conservée (option B). Le repérage repose sur le scroll + la surbrillance ; si l'usage montre que la nouvelle tâche reste difficile à retrouver, l'option A (insertion en tête) reste possible.
- **FAB visible au-dessus des formulaires d'édition** des cartes (seul le formulaire d'ajout inline le masque). À juger à l'usage.
- **Le titre multi-ligne n'est plus saisissable au clavier virtuel** (Entrée valide, pas de Maj+Entrée sur mobile). Une seule tâche sur 163 en a un ; à réévaluer si le besoin existe (ex. valider par la coche du clavier et garder le saut de ligne au collage).
- La puce « Aujourd'hui » ne propose pas « Demain » : non demandé.

## Points écartés volontairement

- **Viewport / `interactiveWidget`** et tailles de police à 16 px (points iOS de #4) : hors périmètre, l'utilisateur est sur Android.
- **Tout le lot B** : #6 (doublons de tâche après échec d'image, champs non contrôlés réinitialisés par React 19), #12 (hors-ligne), #17 (suppression de liste), #18 (suppression d'image). `createTache` n'a reçu qu'un ajout additif ; le formulaire garde ses champs non contrôlés.
- Lots C à F de l'audit (gestes, contrastes, cibles de tap, performance, états) : non touchés. Les nouveaux contrôles respectent néanmoins les seuils de leur propre périmètre (cibles ≥ 44 px, textes ≥ 12 px, `focus-visible`, `prefers-reduced-motion`).

## Impact sur le lot B

- **Forme du retour de `createTache`** : `TacheFormState = { error: string | null; id?: string }`. `id` n'est renseigné qu'en succès. Pour corriger le doublon du #6 (l'insertion réussit, puis l'upload d'image échoue), le plus simple est de **renvoyer aussi l'`id` dans l'état d'erreur d'image** : le formulaire pourra alors basculer en mode édition sur cet `id` au lieu de recréer la tâche. Le code de ce lot ne suppose pas l'absence d'`id` en cas d'erreur (`onDone` n'est appelé que si `!state.error`).
- **Contrat à préserver** : `AddTaskForm` appelle `onDone(state.id)` une seule fois, quand `pending` repasse à faux sans erreur ; `TachesView.handleCreated` et le FAB en dépendent.
- **`pending` et verrou de l'Entrée** : le verrou de soumission (`submitLockRef`) est libéré quand `pending` retombe à faux ; si le lot B change la forme de l'action ou du `useActionState`, garder cette transition.
- **Champs non contrôlés et puce « Aujourd'hui »** : la puce écrit dans l'input date (non contrôlé) ; si le lot B contrôle ce champ, remplacer l'écriture DOM de `definirEcheanceAujourdhui` par un `setState`. Le `<details>` conserve son état d'ouverture lors de la réinitialisation de formulaire de React 19 (elle ne touche que les contrôles), mais les champs qu'il contient sont concernés par le #6.
