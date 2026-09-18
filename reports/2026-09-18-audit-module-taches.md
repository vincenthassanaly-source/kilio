# Audit UX/technique — module Tâches

Date : 2026-09-18
Périmètre : `src/app/(app)/taches/` (dont `listes/`), `src/app/actions/taches.ts`, `src/components/CheckToggle.tsx` (hit area déjà corrigée, non re-signalée), file offline `src/lib/offline/`. Hors périmètre : cartes Tâches du dashboard, intégration des tâches dans l'Agenda.
Branche auditée : `kilio` @ `7d82cb4` (clone de `origin/kilio`, le dossier de travail ne contenait aucun dépôt).
Aucune modification de code, aucune migration, aucune écriture en base : ce fichier est le seul ajout.

> ⚠️ **DEGRADED: single-context** (format imposé par la référence `critique` du skill `impeccable`).
> - Le skill `impeccable` est bien disponible (`anthropic-skills:impeccable`, références `critique.md` et `audit.md` lues), mais :
> - **le détecteur automatique (`impeccable detect`) n'a pas été exécuté** : le lanceur du skill n'embarque aucun binaire et télécharge un `.exe` depuis GitHub (`pbakaus/impeccable`, `engine-v0.1.5`) avant de l'exécuter. Ce téléchargement n'a pas été autorisé, je ne l'ai pas lancé (repli documenté du skill : lecture directe de `PRODUCT.md`/`DESIGN.md`). Aucune vérification déterministe du détecteur n'est donc incluse ; les scores de l'annexe reposent sur la seule revue manuelle du code ;
> - **les deux évaluations (A design / B détecteur) n'ont pas été confiées à des sous-agents isolés** (aucun sous-agent lancé faute de demande explicite) : tout a été fait dans un seul contexte ;
> - le snapshot `.impeccable/critique/…` n'a pas été écrit (règle de la session : seul ce rapport est créé) et la question de clôture du skill est remplacée par la question de fin de session.

## Méthode et limites

- **Lu en entier** : `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`/`AGENTS.md`, `.impeccable/`, les 2 rapports de référence dashboard, tous les fichiers du périmètre, `ui.ts`, `providers.tsx`, `layout.tsx`, `TabSwipeWrapper`, `PullToRefresh`, `Modal`, `QuickAddFab`, `AnimatedAddCard`, `useBackClose`, `useSwipeHorizontal`, file offline.
- **Rapports `reports/*tache*.md` et rapports UX transverses** : une douzaine lus en détail (swipe filtres, latence, autofocus, textarea, sticky, drag & drop et ses correctifs, « en retard », « programmé jour », crash image, revue d'accessibilité, nettoyage auto, vue par défaut) ; les autres (rappels, notifications, agenda, recherche, couleurs…) ont été parcourus par recherche ciblée de mots-clés, pas relus intégralement. Un point écarté ici l'est donc uniquement s'il figure dans un rapport lu.
- **Skills appliqués pendant l'analyse** : `web-design-guidelines` (règles récupérées depuis le dépôt Vercel, appliquées aux fichiers du module) et `vercel-react-best-practices` (règles `rerender-memo`, `rerender-use-deferred-value`, `rendering-content-visibility`, `async-parallel`, `bundle-preload`, `rerender-no-inline-components` lues et confrontées au code ; React Compiler **non activé** dans `next.config.ts`).
- **Base réelle** (Supabase MCP, projet `vsmtkopkqasrdnjceegp`, `list_tables` + `SELECT` uniquement) : schéma, FK (`ON DELETE`), triggers, index, comptages et distributions sur `taches` (163 lignes), `sous_taches`, `listes_taches`, `tags`, `taches_tags`, `tache_images`, bucket `tache-images`.
- **Vérifications de comportement dans les sources installées** (aucune écriture dans le repo) : doc Next 16.3.3 embarquée (`node_modules/next/dist/docs`), code de `react-dom`, et un script isolé (scratchpad, hors repo) exécutant `@tanstack/query-core` avec les mêmes options que `providers.tsx`.
- **Contrastes** : calculés par un script (OKLCH → sRGB → luminance WCAG) à partir des tokens réels de `globals.css` et des couleurs de liste présentes en base. Les fonds semi-transparents sont mélangés en approximation (écart de l'ordre de 0,1).
- **Non testable dans cette session** (pas de credentials Supabase pour `next dev`, aucun appareil) : tout ce qui concerne le rendu réel, les gestes tactiles, le clavier virtuel et le mode avion est marqué **« à vérifier visuellement »**. Les hauteurs de cibles de tap sont des **estimations tirées des classes Tailwind** (line-height ≈ 1,5).

## Synthèse

**29 constats : 0 [Bloquant], 20 [Gênant], 9 [Cosmétique].** Aucun ne rend la création ou le cochage impossible ; les flux principaux fonctionnent. Les problèmes se concentrent sur la vitesse de saisie, la fiabilité en cas d'erreur, la lisibilité (contrastes) et une régression de rendu.

Les 3 plus importants pour le principe n°4 « saisie rapide avant tout » :

1. **#1 — Sur `/taches`, le seul bouton d'ajout est une carte dans le flux, sous trois rangées de filtres** : le FAB (`QuickAddFab`) n'est monté que sur le dashboard. Avec 73 tâches actives, ajouter une tâche depuis le bas de la liste impose de remonter en haut.
2. **#2 — Aucune confirmation après « Créer », et la nouvelle tâche est placée en fin de liste** (hors écran dans la vue par défaut) : on ne voit pas que la saisie a réussi.
3. **#3 et #4 — Le formulaire déploie 15 champs alors que 75 % des tâches réelles n'ont que titre + liste, et « Entrée » insère un saut de ligne au lieu de valider** : chaque création coûte des scrolls et un tap de validation après avoir fermé le clavier.

Autres points structurants : doublons de tâche et champs effacés après une erreur d'upload (#6), texte blanc à 2,34:1 sur le bouton principal en thème sombre (#9), noms de liste illisibles sur 61 tâches (#10), et **`/taches` est repassée en rendu dynamique (`ƒ`) alors que le rapport du 2026-09-02 l'avait rendue statique (`○`)** (#14).

## Constats

Niveaux : **[Gênant]** = friction réelle ou défaut vérifié à corriger avant tout polissage ; **[Cosmétique]** = écart mineur / cohérence.

### Gênants

#### 1. [Gênant] Sur `/taches`, l'ajout n'est accessible ni à une main ni en permanence

- **Où** : `src/app/(app)/DashboardView.tsx:93` (unique montage de `QuickAddFab`) ; `src/app/(app)/taches/TachesView.tsx:172-177` (`AddTaskToggle`) après onglets (`:102-115`), puces de liste (`:117-149`) et recherche (`:151-170`) ; `AddTaskToggle.tsx:33` (`addCard`).
- **Impact concret** : depuis `/taches`, l'ajout passe par une carte « + Ajouter une tâche » située dans le flux, environ au tiers supérieur de l'écran (hors zone du pouce) et qui défile avec la liste. Le FAB à portée du pouce n'existe que sur l'accueil. Contredit le principe n°4 et la contrainte « à une main » de `PRODUCT.md`. *(Position exacte à vérifier visuellement.)*
- **Recommandation** (non implémentée) : monter un point d'entrée d'ajout persistant en bas à droite sur `/taches` (réutiliser `QuickAddFab` en mode « tâche directe » ou un FAB dédié), sans remplacer la carte existante.

#### 2. [Gênant] Création silencieuse, et la tâche apparaît tout en bas de la liste

- **Où** : `AddTaskToggle.tsx:62-65` (`onDone` ferme le formulaire et invalide, aucun toast) ; `src/app/actions/taches.ts:194-204` (`ordre = max(ordre de la liste) + 1`) ; tri serveur `taches.ts:457-460` (`fait`, puis `ordre`).
- **Impact concret** : après « Créer », le formulaire se referme et rien n'indique le succès. Comme `ordre` est le plus grand de la liste, la tâche se place en fin de liste : en base, `Général` a des `ordre` actifs jusqu'à 50 ; en vue « Toutes », la tâche est près du bas d'une liste de 73 cartes. Aucun scroll vers la carte, aucune surbrillance (le mécanisme `highlighted`/`tache-surbrillance` existe pourtant, `TasksList.tsx:269, 510`). L'utilisateur ne sait pas si la saisie a réussi (principe n°4 : le retour fait partie de la rapidité).
- **Recommandation** : toast « Tâche créée » (`showToast` existe) et/ou scroll + surbrillance de la nouvelle carte ; envisager d'insérer en tête de liste plutôt qu'en fin (décision produit).

#### 3. [Gênant] Formulaire : 15 champs déployés (certains conditionnels), dont 6 jamais utilisés en base

- **Où** : `AddTaskForm.tsx:186-507` (titre, liste, priorité, échéance, « Tâche du jour », « Toute la journée », heure, heure de fin, rappel, notes, images, tags, nouveaux tags, récurrence, fin de récurrence).
- **Impact concret** : données réelles (163 tâches) — échéance sur 40 (25 %), heure 24, rappel 16, notes 15, « Tâche du jour » 7, images 4 tâches, heure de fin 1, et **priorité 0, récurrence (donc fin de récurrence) 0, « toute la journée » 0, tags (donc « nouveaux tags ») 0, sous-tâches 0** : six champs du formulaire ne servent jamais. Trois quarts des tâches sont « titre + liste ». Chaque création oblige à parcourir (ou ignorer en scrollant) un formulaire long ; charge cognitive élevée (checklist « progressive disclosure » non satisfaite). *(Échantillon d'un seul utilisateur : un champ inutilisé peut aussi être un champ non découvert.)*
- **Recommandation** : ne montrer par défaut que titre + liste (+ un raccourci « Aujourd'hui / date »), replier le reste derrière « Plus d'options », en ordonnant selon l'usage réel (échéance, heure, rappel, notes d'abord). Garder l'autofocus (décision du 2026-09-04). Fonction pure de règles d'affichage dans `src/lib/taches/compute.ts` si de la logique est nécessaire.

#### 4. [Gênant, à vérifier visuellement] Clavier mobile : « Entrée » n'envoie pas, et la barre « Créer » peut être masquée

- **Où** : `AddTaskForm.tsx:197-206` (titre en `<textarea>`, aucun `onKeyDown`, aucun `enterKeyHint`) ; `AddTaskForm.tsx:494-507` (barre `sticky bottom-0`) ; `src/app/layout.tsx:32-39` (`viewport` sans `interactiveWidget`) ; `src/lib/ui.ts:26` (`input` en `text-[15px]`) ; `TasksList.tsx:201` (champ sous-tâche `text-[13px]`).
- **Impact concret** : (a) vérifié dans le code — sur le clavier mobile la touche « Entrée » insère une nouvelle ligne dans le titre, au lieu de créer la tâche : il faut fermer le clavier puis taper « Créer ». (b) Sans `interactiveWidget`, les navigateurs mobiles laissent en général le clavier recouvrir les éléments `sticky`/`fixed` du bas : la barre « Créer » peut donc être cachée tant que le clavier est ouvert, et la modale du FAB (bottom sheet) aussi. (c) Champs à 15 px (< 16 px) : sur iOS Safari, le focus déclenche un zoom automatique de la page ; de plus le `focus()` d'autofocus est lancé après le chargement paresseux du formulaire (`dynamic(..., { ssr: false })`), donc hors du geste utilisateur à la première ouverture, ce que iOS peut refuser pour le clavier. *(b et c à confirmer sur appareil, l'OS de Vincent n'étant pas documenté.)*
- **Recommandation** : `onKeyDown` « Entrée » (sans Maj) → `requestSubmit()` et `enterKeyHint="done"` sur le titre ; tester `interactiveWidget: "resizes-content"` dans `viewport` ; passer les champs à 16 px. Précharger `AddTaskForm` au survol/focus du bouton d'ajout (`bundle-preload`).

#### 5. [Gênant] Onglet « Aujourd'hui » : la tâche créée n'hérite pas de la date du jour et disparaît

- **Où** : `TachesView.tsx:172-177` (transmet `defaultListeId`, jamais `defaultEcheance`) ; `AddTaskForm.tsx:82, 253` (la prop existe et est utilisée par l'Agenda) ; filtre `TachesView.tsx:69`.
- **Impact concret** : sur « Aujourd'hui » ou « 7 jours », une tâche ajoutée sans date est immédiatement filtrée hors de la vue. Le formulaire reprend pourtant la liste sélectionnée : le comportement est incohérent entre liste et date. Avec 123 tâches sur 163 sans échéance, le cas « je l'ai perdue » est plausible.
- **Recommandation** : passer `defaultEcheance = aujourdhuiISO()` quand `vue === "aujourdhui"` (fonction pure dans `src/lib/taches/compute.ts`, `date-fns` déjà utilisé).

#### 6. [Gênant] Erreur d'upload d'image : tâche déjà créée (doublon au retry) et champs effacés

- **Où** : `taches.ts:202-224` (insertion de la tâche, puis tags, puis images ; en cas d'erreur d'image, retour `{ error }` sans annuler l'insertion) ; `AddTaskForm.tsx:119-124` (`onDone` seulement si pas d'erreur) ; champs non contrôlés `AddTaskForm.tsx:216, 253, 377, 392-401, 456, 488`.
- **Impact concret** : (a) si l'envoi d'une image échoue après l'insertion, le formulaire reste ouvert avec l'erreur, alors que la tâche existe déjà : retaper « Créer » crée un **doublon**, et la liste n'est pas rafraîchie donc rien ne le laisse voir. (b) React 19 réinitialise les champs **non contrôlés** d'un `<form action>` à chaque action terminée, même avec un état d'erreur retourné (`requestFormReset` appelé avant l'action, `react-dom-client.development.js:8955`) : liste, échéance, notes, nouveaux tags, fin de récurrence et le champ fichier sont remis à zéro, alors que les vignettes d'images (état React) restent affichées — la relance enverrait donc la tâche sans image. Le rapport du 2026-09-18 traite le rejet 413, pas ces deux cas. *(Effet visuel de (b) à confirmer sur appareil ; le mécanisme est vérifié dans la source de React.)*
- **Recommandation** : rendre l'étape images idempotente/atomique (ne pas répondre « erreur » après insertion, ou renvoyer l'id créé et passer en mode édition) ; contrôler les champs concernés (`value`/`onChange`) ou ne pas laisser React les réinitialiser ; `revalidatePath("/taches")` inchangé.

#### 7. [Gênant, à vérifier visuellement] Conflits de gestes : swipe d'onglet sur le formulaire inline, pull-to-refresh sous le drag

- **Où** : `src/components/TabSwipeWrapper.tsx:53-54, 103` (handlers de swipe sur tout `<main>` de `/taches`) ; `src/components/Modal.tsx:41-46` (la modale les neutralise explicitement) ; `AddTaskToggle.tsx:54-75` et `TasksList.tsx:353-382` (formulaires inline, sans `data-swipe-ignore` ni `stopPropagation`) ; `TachesView.tsx:100` (`PullToRefresh` enveloppe tout, y compris la poignée `TasksList.tsx:461-472`) ; `src/components/PullToRefresh.tsx:42-85`.
- **Impact concret** : (a) un swipe horizontal de ≥ 50 px sur un champ du formulaire inline (par exemple en déplaçant le curseur dans le titre ou en survolant la rangée de tags) déclenche la navigation vers l'onglet voisin et **fait perdre la saisie non validée** (la protection existe pour la modale, pas pour les deux formulaires inline). (b) Le glisser d'une carte vers le bas depuis le haut de liste (`scrollTop === 0`) fait aussi remonter des événements tactiles à `PullToRefresh`, qui agrandit l'indicateur (jusqu'à 96 px) pendant le drag et déclenche un rafraîchissement au relâchement au-delà de 70 px : le contenu bouge sous dnd-kit pendant le geste. Les rapports du 2026-09-04/05 ont traité la rangée de filtres uniquement.
- **Recommandation** : `data-swipe-ignore` (ou arrêt de propagation) sur les conteneurs de formulaire ; ignorer `PullToRefresh` quand le geste part d'un élément marqué (ex. `data-no-pull`), ou ne l'armer qu'au-dessus de la zone de liste.

#### 8. [Gênant] Drag & drop incohérent dans la vue par défaut (« Toutes » + toutes les listes)

- **Où** : `TachesView.tsx:190` (`reordonnable={vue === "toutes"}`, indépendamment de `listeId`) ; tri serveur `taches.ts:457-460` ; `TasksList.tsx:598-630` (renumérotation par `liste_id`, `if (updates.length === 0) return` à `:617`).
- **Impact concret** : `ordre` est une séquence **par liste**. En base, chacune des 9 listes commence à `ordre = 0` (9 tâches actives à `ordre 0`) : la vue par défaut est donc un interclassement de 9 séquences (tri `ordre`, puis échéance, puis date de création), pas un ordre cohérent. Déplacer une carte entre deux tâches de listes différentes ne change aucun `ordre` par liste → `updates` vide → retour immédiat : le drop est **silencieusement annulé** (la carte revient). Entre deux tâches de la même liste, l'`ordre` change mais la carte ne se retrouve pas forcément là où elle a été lâchée (le tri stable ne regroupe pas par liste) *(à vérifier visuellement)*. Les rapports du 2026-09-05/06 ont corrigé d'autres cas (snap-back par tri du cache) mais supposent que l'ordre affiché est celui d'une seule liste.
- **Recommandation** : décision produit à trancher — regrouper visuellement la vue « Toutes/toutes listes » par liste (le drag n'a alors de sens qu'au sein d'un groupe), ou n'activer le drag que quand une liste est sélectionnée, ou introduire un ordre global. Cette dernière option demanderait une migration `scripts/migration-taches-ordre-global-YYYY-MM-DD.sql` + `-revert.sql` (attention : un `UPDATE` sur `taches` déclenche `trg_taches_updated_at`, donc bouge `updated_at` ; réutiliser `set_updated_at()` sans la recréer).

#### 9. [Gênant] Texte blanc sur les fonds d'accent : contraste insuffisant (2,34:1 en thème sombre)

- **Où** : `src/lib/ui.ts:30-31` (`primaryButton` : « Créer », « Enregistrer », « Créer la liste »…) ; `TachesView.tsx:109` (onglet de vue actif `bg-carbs text-white`) ; `AddTaskForm.tsx:71-74` (priorité active) et `:442` (tag actif `bg-kcal text-white`) ; tokens `globals.css:13, 16` (clair) et `:51, 54` (sombre).
- **Impact concret** (calculé) : blanc sur `bg-kcal` **2,34:1 en sombre** (accent éclairci à `oklch(0.72 …)`) et **4,39:1 en clair** ; blanc sur `bg-carbs` 2,24:1 (sombre) / 4,31:1 (clair) ; blanc sur `bg-agenda` 2,41:1 (sombre) ; blanc sur `bg-alert` 2,88:1 (sombre) ; blanc sur `bg-ink-3` 3,34:1 (clair). Le seuil AA est 4,5:1 pour du texte de cette taille. Le bouton principal du module, en thème sombre, est difficile à lire. Le défaut est systémique (tokens partagés), mais visible dans chaque écran du module.
- **Recommandation** : pour le thème sombre, utiliser une encre foncée sur les fonds d'accent (ou assombrir le fond du bouton) ; ajuster `--accent-kcal` en clair pour franchir 4,5:1. Décision de design-system à faire valider (`DESIGN.md` § Colors).

#### 10. [Gênant] Noms de liste illisibles sur les cartes pour les couleurs vives

- **Où** : `TasksList.tsx:66-69, 413-415, 430-432` (`couleurStyle` : texte = couleur choisie, fond = même couleur à ~10 %) ; sélecteur libre `listes/AddListeForm.tsx:43-49` (`type="color"`) ; données : `listes_taches.couleur`.
- **Impact concret** : en base, les couleurs sont des primaires pures. Contraste du nom de liste sur sa pastille, thème clair : `#ffff00` (Déco appartement, 5 tâches) **1,05:1**, `#00ff00` (Kilio 51 tâches, These 5) **1,32:1**, `#ff00ff` (Heures Supp) 2,88:1, `#4f7cff` (Officio, 22) 3,39:1, `#ff0000` (Vendre, 11) 3,64:1. **61 tâches sur 163** ont un nom de liste quasi invisible en clair, et les 97 tâches à liste colorée sont sous 4,5:1. En sombre, `#ff0000`/`#4f7cff`/`#ff00ff` restent sous 4,5:1 (3,25 à 3,79:1).
- **Recommandation** : calculer la couleur de texte à partir de la couleur de liste (fonction pure `couleurTexteLisible(hex, theme)` dans `src/lib/taches/compute.ts`, cible ≥ 4,5:1) et/ou proposer une palette restreinte de teintes plutôt qu'un sélecteur libre.

#### 11. [Gênant] Cibles de tap sous 44 px sur les contrôles fréquents (hors `CheckToggle`)

- **Où** *(hauteurs estimées d'après les classes Tailwind)* : « Modifier » / « Suppr. » `ghostButton`/`dangerButton` (`ui.ts:39-42`, `TasksList.tsx:474-487`) ≈ 34 px, séparés de 8 px ; onglets de vue `TachesView.tsx:108` ≈ 36 px ; puces de liste `:129, :141` ≈ 42 px et lien « Gérer les listes » `:122` 36 px ; poignée de drag `TasksList.tsx:464` 32 px ; pastille « + sous-tâches » `:434` ≈ 24 px ; dans le formulaire, tags `AddTaskForm.tsx:441` ≈ 24 px, priorités `:235` ≈ 31 px, cases natives `:265, :288` (16 px dans un `label` d'environ 20 px), croix de suppression d'image `:51` 20×20 px.
- **Impact concret** : usage à une main, doigt pressé ; « Suppr. » est adjacent à « Modifier » sur **chaque** carte (protégé par un `confirm`, mais l'erreur de tap coûte quand même un aller-retour). Principe n°4.
- **Recommandation** : porter ces contrôles à 44 px de zone de tap (même technique que le `hitSlop` de `CheckToggle` quand le visuel doit rester compact) ; pour « Modifier » / « Suppr. », envisager de rendre la carte entière tappable pour éditer et de regrouper « Suppr. » dans le formulaire d'édition.

#### 12. [Gênant, à vérifier visuellement] Hors-ligne : la file Dexie est contournée quand l'événement `offline` est reçu, et création/édition ne sont pas couvertes

- **Où** : `TasksList.tsx:302-326` (`mutationFn` contient la mise en file `enqueueAction`) ; `src/app/providers.tsx:14-24` (aucun `networkMode` : défaut « online ») ; `src/lib/offline/queue.ts:41-46` (`ACTIONS.taches` = `toggleTache`, `deleteTache` seulement) ; `AddTaskForm.tsx:94-95` (création/édition via `<form action>` sans `try/catch`).
- **Impact concret** : test isolé avec `@tanstack/query-core` et les mêmes options : quand l'app a reçu l'événement `offline`, `onMutate` (mise à jour optimiste) s'exécute mais `mutationFn` n'est **jamais appelée** (`isPaused: true`, `isPending: true`). Le repli Dexie (et son toast « sera synchronisé ») n'est donc pas atteint : la coche reste en mémoire, la case est désactivée (`disabled={toggleMutation.isPending}`, `:392`) et, si l'app est fermée avant le retour du réseau, l'action est perdue sans avoir été persistée. À l'inverse, si l'app démarre hors ligne (aucun événement reçu), le chemin Dexie s'active. Créer ou modifier une tâche hors ligne n'a aucune file : l'échec du `fetch` de l'action remonte à `error.tsx` (mécanisme décrit dans `reports/2026-09-18-fix-crash-image-tache.md`) et la saisie est perdue. *(Scénario bout en bout, mode avion, à vérifier sur appareil.)*
- **Recommandation** : `networkMode: "always"` pour ces mutations (ou tester `navigator.onLine` avant `mutate`) afin que la file Dexie fasse foi ; décider si `createTache`/`updateTache` doivent être mis en file (`ACTIONS`) et afficher un état « en attente de synchronisation » sur la carte.

#### 13. [Gênant] Lecture des données : 3 Server Actions séquentielles, plus un re-rendu serveur par action

- **Où** : `TachesView.tsx:54-59` (`getTachesAvecRelations`, `getListes`, `getTags` comme `queryFn` de 3 `useQuery`) ; `taches.ts:22-26` (`revalidateTachesPaths` : 3 `revalidatePath` par action) ; doc `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` (§ « Sequential dispatch on the client » et « A single response carries data and UI »).
- **Impact concret** : la doc de la version installée précise que Next envoie les Server Actions **une par une** (« do not rely on `Promise.all` to parallelize Server Actions from the client ») et que chaque `revalidatePath` fait re-rendre la route courante dans la même réponse. Au montage de `/taches`, trois lectures indépendantes s'enchaînent donc au lieu de partir ensemble (cascade, règle `async-parallel`), puis chaque coche/suppression paie le re-rendu serveur en plus du refetch TanStack qui suit. Durées non mesurées.
- **Recommandation** : regrouper les trois lectures dans une seule Server Action (un aller-retour, `Promise.all` côté serveur, comme le fait déjà `listes/page.tsx:10`) ; réduire `revalidateTachesPaths` aux chemins réellement rendus côté serveur, TanStack Query étant la source de vérité de `/taches`.

#### 14. [Gênant] Régression : `/taches` est de nouveau rendue dynamiquement (`ƒ`)

- **Où** : sortie de `npm run build` de cette session (`ƒ /taches`, `ƒ /habitudes`, `ƒ /plus`, `ƒ /reglages`… toutes les routes `ƒ`) vs `reports/2026-09-02-fix-latence-taches.md` (`○ /taches`) ; `src/app/layout.tsx:42-43` (`await cookies()`, commit `d074727`, 2026-09-13) ; `src/app/(app)/layout.tsx:20` (lecture des préférences de navigation par requête, commit `e4e1219`, 2026-09-05).
- **Impact concret** : le correctif du 2026-09-02 rendait `/taches` statique pour supprimer l'aller-retour serveur à chaque tap sur le bouton « Tâches » de la barre du bas. La doc Next confirme que `cookies()` dans un layout fait basculer la route en rendu dynamique (`cookies.md`). Deux changements postérieurs lisent des données par requête dans les layouts ; **je n'ai pas isolé lequel des deux est responsable**. Le rapport du 2026-09-13 ne mentionne pas cet effet. Le retour de la latence de navigation est probable mais **à confirmer sur appareil**.
- **Recommandation** : isoler la cause (build avec chacun des deux changements neutralisé), puis lire le thème et les préférences de navigation autrement que par `cookies()`/lecture DB dans le layout racine (script inline + attribut, ou état client hydraté) ; vérifier à nouveau `○ /taches` dans la sortie du build.

#### 15. [Gênant, à mesurer] 163 cartes montées à chaque rendu, dont 90 archivées invisibles, non mémoïsées

- **Où** : `TasksList.tsx:684-696` (les archivées sont rendues dans un `<details>` même fermé), `:240-549` (`TaskCard` : `useSortable`, 2 `useMutation`, `useBackClose`, `useReducedMotion` ; aucun `memo`), `TachesView.tsx:51, 61-85, 153-159` (l'état de recherche vit dans le parent), `taches.ts:449-471` (toutes les tâches, y compris archivées, avec relations, sans pagination).
- **Impact concret** : en base, 73 actives + 90 archivées (55 %) = 163 `TaskCard` toujours montées, soit ~326 observers de mutation et 163 écouteurs `popstate` (`useBackClose` enregistre son listener pour toute la durée de vie du composant, `useBackClose.ts:47-59`). Chaque frappe dans la recherche re-rend le parent, donc les 163 cartes (React Compiler n'est pas activé). Règles Vercel concernées : `rerender-memo`, `rerender-use-deferred-value`, `rendering-content-visibility` (impact HIGH) ; guideline Web « listes > 50 éléments : virtualiser ». Durées de rendu non mesurées.
- **Recommandation** : `memo(TaskCard)` avec callbacks stables ; `useDeferredValue(recherche)` ; ne monter les archivées qu'à l'ouverture du `<details>` (`onToggle`) ; `content-visibility: auto` avec `contain-intrinsic-size` sur les cartes.

#### 16. [Gênant] « Tâche du jour » : la suppression automatique n'est expliquée que par une infobulle

- **Où** : `TasksList.tsx:424-428` (`title="Sera supprimée automatiquement si non cochée à la fin de la journée"` sur la pastille) ; `:404-408` (`↻` avec `title` seul) ; contraste `kcalPillTag` (`ui.ts:50-51`) 3,93:1 en clair (11 px).
- **Impact concret** : une tâche non cochée est **supprimée définitivement** au passage de jour (choix assumé, `reports/2026-09-13-taches-programme-jour.md`), mais sur mobile l'infobulle `title` n'est pas affichable. L'utilisateur ne voit que « Tâche du jour », sans notion de disparition ; 7 tâches concernées en base. Le texte d'aide n'existe que dans le formulaire.
- **Recommandation** : rendre la mention visible (libellé de pastille « Du jour · supprimée si non faite » ou icône + texte court), et exposer l'information à `aria-label` ; ne pas dépendre de `title`.

#### 17. [Gênant] Suppression d'une liste : impossible dès qu'elle contient des tâches, sans avertissement clair

- **Où** : `listes/ListesManager.tsx:38-48, 87-91, 93` ; `taches.ts:533-552` ; base : `taches_liste_id_fkey` = `NO ACTION`.
- **Impact concret** : la suppression d'une liste rattachée à des tâches échoue au niveau de la base (FK sans cascade) ; le `confirm` (« Supprimer la liste « X » ? ») ne prévient pas, puis `e.message` est affiché tel quel. Les 9 listes ont des tâches (1 à 57) : **aucune liste n'est aujourd'hui supprimable**. En production, Next.js masque en général le message des erreurs levées dans une Server Action : l'utilisateur risque de voir un texte générique anglais *(à vérifier visuellement)*. Aucune indication du type « déplace ou supprime d'abord les N tâches ».
- **Recommandation** : contrôler côté action (compter les tâches, renvoyer un état `{ error }` en français avec le nombre) et proposer « Déplacer les tâches vers Général » ; `revalidatePath` inchangé.

#### 18. [Gênant] Suppression d'une image existante : immédiate et irréversible, même si l'on annule ensuite

- **Où** : `AddTaskForm.tsx:178-183` (`removeExistingImage` → `deleteTacheImage`) ; `taches.ts:354-374` (supprime l'objet Storage puis la ligne) ; `TasksList.tsx:373-379` (« Annuler » : `setEditing(false)` sans invalidation).
- **Impact concret** : dans le formulaire d'édition, la croix (20 px) supprime l'image sur le serveur au tap, sans confirmation, alors que le formulaire propose « Annuler » : l'annulation ne restaure rien. Le cache TanStack n'est pas invalidé, donc après « Annuler » la carte peut afficher une vignette dont le fichier n'existe plus. Guideline Web : « destructive actions need confirmation or undo window ».
- **Recommandation** : différer la suppression à « Enregistrer » (liste d'`id` à supprimer dans l'état du formulaire) ou confirmer ; invalider `queryKeys.taches` à la fermeture.

#### 19. [Gênant] Listes/tags modifiés dans `/taches/listes` : le cache TanStack (30 s) n'est pas invalidé, `revalidatePath` incohérent

- **Où** : `listes/*` (aucun `useQueryClient`) ; `providers.tsx:17-21` (`staleTime: 30_000`) ; `TachesView.tsx:58-59` ; `taches.ts:502, 525, 582, 613` (`createListe`, `updateListe`, `reordonnerListes`, `createTag` : `revalidatePath("/taches")` seul) contre `:551, 623` (`deleteListe`, `deleteTag` : `revalidateTachesPaths()`).
- **Impact concret** : après avoir créé, renommé ou recolorié une liste dans `/taches/listes` puis être revenu sur `/taches` en moins de 30 s, les puces de filtre et le sélecteur de liste du formulaire lisent le cache et peuvent ne pas refléter le changement (rafraîchissement possible par pull-to-refresh). Renommer ou recolorier ne revalide ni `/agenda` ni `/` alors que la suppression le fait. Aucune de ces actions ne revalide `/taches/listes` elle-même (page dynamique, donc sans effet visible aujourd'hui).
- **Recommandation** : invalider `queryKeys.listes` / `queryKeys.tags` / `queryKeys.taches` après chaque mutation de `listes/*` ; harmoniser `revalidatePath` sur `revalidateTachesPaths()` + `"/taches/listes"` pour toutes les actions listes/tags.

#### 20. [Gênant] Carte de tâche : notes non tronquées, échéance discrète, retard non signalé

- **Où** : `TasksList.tsx:441-443` (notes en `whitespace-pre-wrap`, aucun `line-clamp`), `:445-453` (échéance en `metaText`, `ui.ts:63` : 12 px `text-ink-2 font-mono`, phrase entière en police mono), `:411-439` (jusqu'à 5+ pastilles), `:460-489` (rangée « Modifier / Suppr. » permanente sur chaque carte).
- **Impact concret** : en base, 15 tâches ont des notes (jusqu'à 1 267 caractères) affichées en entier : une seule carte peut occuper plusieurs écrans dans une liste de 73. La date d'échéance, l'attribut qui porte l'urgence, est rendue avec le style le plus discret ; une tâche en retard (2 aujourd'hui) est identique à une tâche future dans « Toutes ». `DESIGN.md` réserve la police mono aux valeurs chiffrées alignées, pas à une phrase. Guideline Web : « les conteneurs de texte gèrent les contenus longs » (`line-clamp`).
- **Recommandation** : `line-clamp-3` avec « Voir plus » ; échéance relative (« Aujourd'hui », « Demain », « En retard de 2 j ») avec couleur `alert`/`warning` pour le retard ; regrouper pastilles secondaires ; libellé en Inter (pas mono).

### Cosmétiques

#### 21. [Cosmétique] Couleurs sémantiques détournées : le jaune « Glucides » sert d'accent d'interface

- **Où** : `TachesView.tsx:109` (onglet de vue actif `bg-carbs`), `TasksList.tsx:56-64` et `AddTaskForm.tsx:70-75` (priorités : `bg-agenda`, `bg-carbs`) ; `DESIGN.md` (« The One Accent Rule », « The Semantic-Only Macro Rule », § Navigation : onglet actif en `bg-kcal`).
- **Impact concret** : contredit deux règles écrites de la charte : l'onglet actif d'un contrôle segmenté doit être vert `kcal`, et le jaune Glucides ne désigne que les glucides. Incohérence visuelle avec les autres contrôles segmentés de l'app.
- **Recommandation** : onglet actif en `bg-kcal` ; pour les priorités, utiliser `warning`/`alert` (déjà définis) ou des indicateurs neutres.

#### 22. [Cosmétique] États vide, erreur et chargement peu informatifs

- **Où** : `TasksList.tsx:658-660` (« Aucune tâche pour l'instant. » pour tous les cas, sans style dédié) ; `TachesView.tsx:183-184` (erreur en simple `<p>` sans bouton « Réessayer », alors que `ErrorState` existe) ; `TachesView.tsx:178-182` et `loading.tsx` vs cartes réelles.
- **Impact concret** : (a) l'onglet « En retard » vide affiche le même message neutre qu'un module vide, sans le renforcement positif ni le rappel de l'action ; quand seules des tâches archivées existent, seule la section « archivées » apparaît, sans message « tout est fait ». (b) L'erreur de chargement masque aussi les données déjà en cache : le test `tachesError` précède le rendu de la liste ; avec `retry: 1` (`providers.tsx:20`), un échec de rafraîchissement d'arrière-plan peut donc remplacer la liste par le message d'erreur *(à vérifier visuellement)*. (c) Skeleton : une ligne de squelette (`ListItemSkeleton`, ~50 px estimés) remplace des cartes réelles d'environ 120 px (titre, rangée de pastilles avec « + sous-tâches » toujours présente, rangée d'actions) : saut de layout ≈ ×2,4 ; `loading.tsx` ne réserve que la moitié de la place de la recherche et de la carte d'ajout, avec des puces de 28 px au lieu de 36-42 px.
- **Recommandation** : messages d'état par vue (« Rien en retard 🎉 » / « Aucune tâche aujourd'hui »), `ErrorState`-like avec bouton et priorité aux données en cache (`isError && !taches`), squelette aligné sur la structure réelle (2-3 rangées).

#### 23. [Cosmétique] Accessibilité : états non exposés, `id` dupliqués, sens porté par `title`

- **Où** : `TachesView.tsx:104-113, 126-147` (onglets et puces de liste sans `aria-pressed`/`aria-current`) ; `AddTaskForm.tsx:231-240, 437-446` (priorités, tags sans `aria-pressed`) ; `TasksList.tsx:434` (bascule des sous-tâches sans `aria-expanded`) ; `TasksList.tsx:404-408` (`↻` sans `aria-label`) ; `listes/AddListeForm.tsx:33-36, 43-49` et `listes/AddTagForm.tsx:23-26, 33-39` (`id="nom"` / `id="couleur"` identiques dans deux formulaires de la même page).
- **Impact concret** : les lecteurs d'écran n'annoncent ni la vue/liste sélectionnée ni l'état déplié ; si les deux formulaires (liste et tag) sont ouverts ensemble, `htmlFor="nom"` cible le premier champ du document. `DESIGN.md` exige `aria-current` sur l'onglet actif. Le sens des pastilles cliquables/non cliquables n'est pas distinguable visuellement (`pillTag` sert aux deux, `TasksList.tsx:413, 430, 434`).
- **Recommandation** : ajouter `aria-pressed`/`aria-expanded`/`aria-current`, suffixer les `id` (`useId`), distinguer visuellement la pastille interactive.

#### 24. [Cosmétique] Sous-tâches : contrôles minuscules, sans mise à jour optimiste, erreurs avalées, fonctionnalité non utilisée

- **Où** : `TasksList.tsx:102-213` — boutons `↑ ↓ ×` sans dimensions (`:150-191`), « Ajouter » sans padding (`:203-208`), `handleAjouter` vide le champ avant la réponse (`:111-120`) sans `try/catch`, aucune mise à jour optimiste ni file offline.
- **Impact concret** : ajouter ou cocher une sous-tâche attend deux allers-retours séquentiels (action puis refetch, cf. #13) avant d'apparaître ; en cas d'échec, le titre saisi a déjà été effacé et l'erreur n'est pas affichée. Le `×` supprime sans confirmation (déjà signalé le 2026-09-13, non traité). **0 sous-tâche en base** : la fonctionnalité est très peu utilisée alors que la pastille « + sous-tâches » est affichée sur chaque carte (`:434`).
- **Recommandation** : mise à jour optimiste (comme `toggleTache`), gestion d'erreur avec toast, cibles ≥ 44 px ; envisager de ne montrer « + sous-tâches » qu'au tap sur la carte tant que l'usage reste nul.

#### 25. [Cosmétique, à vérifier visuellement] Retours du drag & drop : pas d'haptique, carte à 60 % d'opacité sans élévation, poignée à 32 px

- **Où** : `TasksList.tsx:534` (`opacity-60` quand `isDragging`), `:527-530` (aucun `zIndex` ni ombre pendant le drag), `:561-563` (`PointerSensor` seul, pas de `onDragStart`), `:304` (`vibrate()` seulement à la coche) ; `ui.ts:56-57` (`listCard` porte `active:scale-[0.97]` : la carte se réduit aussi quand on appuie sur la poignée).
- **Impact concret** : le début et la fin de drag n'ont aucun retour haptique (alors que la coche en a un) ; une carte déplacée vers le bas peut passer sous les cartes suivantes qui ont aussi un `transform` (pas de `z-index`), et la transparence laisse voir les cartes voisines.
- **Recommandation** : `vibrate()` au démarrage et à la fin du drag, `z-index`/ombre sur la carte active (ou un `DragOverlay`), poignée à 44 px.

#### 26. [Cosmétique] Archives : tri sur `updated_at` alors que `termine_le` existe, et 59 tâches faites ne seront jamais nettoyées

- **Où** : `TasksList.tsx:663-668` (commentaire « faute de colonne dédiée type fait_le », tri par `updated_at`) ; base : `taches.termine_le` + trigger `trg_taches_termine_le` (`set_termine_le()`) ; `supabase/functions/nettoyage-auto/index.ts` (supprime seulement `termine_le is not null and termine_le < now() - N jours`).
- **Impact concret** : le commentaire est périmé (la colonne existe depuis le 2026-09-11) et le tri par `updated_at` se décale dès qu'on modifie une tâche faite. Surtout, **59 des 90 tâches faites ont `termine_le` nul** (faites avant la migration : `updated_at` du 2026-08-31 au 2026-09-11) : le nettoyage automatique, actif avec un délai de 30 jours, ne les supprimera jamais et elles resteront à vie dans « Tâches archivées ».
- **Recommandation** : trier par `termine_le` avec repli sur `updated_at` ; rattrapage de données par migration (`scripts/migration-taches-backfill-termine-le-YYYY-MM-DD.sql` + `-revert.sql`) : `update taches set termine_le = updated_at where fait and termine_le is null` (l'expression lit l'ancienne valeur ; `trg_taches_updated_at` réécrira ensuite `updated_at` : réutiliser `set_updated_at()` tel quel, ne pas le recréer).

#### 27. [Cosmétique] Couleur de liste « optionnelle » impossible à retirer

- **Où** : `listes/AddListeForm.tsx:39-49`, `listes/AddTagForm.tsx:29-39` (`type="color"` avec valeur par défaut `#4f7cff`) ; `taches.ts:482, 519` (`couleur || null`).
- **Impact concret** : un champ `type="color"` ne peut jamais être vide, donc la couleur est toujours enregistrée : le libellé « (optionnel) » est trompeur et on ne peut pas revenir à « sans couleur » (les listes « Général », « Skills », « Trucs à acheter » n'en ont pas en base). Couplé à #10, la couleur imposée est souvent une couleur vive peu lisible.
- **Recommandation** : case « Aucune couleur » ou palette de pastilles incluant « aucune ».

#### 28. [Cosmétique] Photos > 3,8 Mo refusées sans compression côté client

- **Où** : `AddTaskForm.tsx:60-66, 147-165` ; `taches.ts:286-352` (compression `sharp` côté serveur, après réception) ; `next.config.ts` (`bodySizeLimit: "4mb"`).
- **Impact concret** : le serveur réduit déjà chaque image (1 600 px, JPEG 75), mais le corps de requête est limité à 4 Mo (limite Vercel) : une photo de téléphone de 4 à 8 Mo est refusée avec « Image trop volumineuse, réessayez avec une photo plus légère », alors qu'une réduction avant envoi la ferait passer. Usage réel très faible (5 images, 4 tâches) : priorité basse. Cette limite est la parade décidée le 2026-09-18, non re-signalée comme défaut ; seule l'absence de compression client est notée.
- **Recommandation** : réduire l'image côté client (canvas, `createImageBitmap`) avant l'ajout à l'input.

#### 29. [Cosmétique] Filtres non mémorisés et navigation sans transition vers `/taches/listes`

- **Où** : `TachesView.tsx:49-51` (`vue`, `listeId`, `recherche` en `useState`, remis à leurs valeurs par défaut à chaque retour sur `/taches`) ; `:118-125` (`Link` de `next/link` vers `/taches/listes` alors que la page de destination utilise `TransitionLink` pour le retour, `listes/page.tsx:17`) ; `useScrollRestoration.ts` (le scroll est restauré, pas les filtres).
- **Impact concret** : Vincent qui filtre sur « Officio », va ailleurs puis revient, retrouve « Toutes/Toutes » avec un scroll restauré pour une autre liste ; les guidelines Web demandent que l'URL reflète l'état des filtres. L'état local est une description factuelle du rapport du 2026-08-31, non une décision documentée. Le lien vers les listes n'applique pas la transition View Transitions utilisée ailleurs (généralisée le 2026-09-06) *(à vérifier visuellement)*.
- **Recommandation** : persister vue/liste (query string ou `sessionStorage`, comme `useScrollRestoration`) ; utiliser `TransitionLink` pour le lien « Gérer les listes ».

## Ce qui fonctionne bien

- Coche et suppression **optimistes avec rollback** et toast discret (`TasksList.tsx:302-351`) ; retour haptique à la coche.
- `CheckToggle` accessible (`aria-label`, `aria-pressed`) ; boutons icône du module dotés d'`aria-label` ; `<label htmlFor>` sur tous les champs du formulaire ; `role="alert"` sur les erreurs ; `prefers-reduced-motion` respecté partout dans le module.
- Barre « Créer » collante avec `env(safe-area-inset-bottom)` (rapport du 2026-09-01) ; Modal avec `role="dialog"`, `aria-modal`, `overscroll-behavior: contain` et isolation des gestes tactiles.
- **Aucun texte sous 10 px dans le module** (plancher de `DESIGN.md` respecté : minimum 11 px).
- Formulaire chargé à la demande (`dynamic`), `Promise.all` sur `listes/page.tsx:10`, images `next/image` avec dimensions, base saine : RLS activé, index adaptés (`idx_taches_a_faire`, `idx_taches_echeance`…), `ON DELETE CASCADE` cohérent sur `sous_taches`/`tache_images`/`taches_tags`, triggers `set_updated_at()` / `set_termine_le()` en place.
- Aucune régression détectée sur les correctifs précédents : `data-swipe-ignore` sur la rangée de filtres (`TachesView.tsx:117`), autofocus en création uniquement (`AddTaskForm.tsx:137-141`), `CSS.Translate` pendant le drag (`TasksList.tsx:528`), barre collante et gestion 413 (`AddTaskForm.tsx:66, 147-165`).

## Points écartés

**Déjà couverts par un rapport existant (non re-signalés) :**
- Zone de tap de `CheckToggle` (`2026-09-16-fix-dashboard-audit-constats-1-2.md`), y compris ses limites assumées sur les sous-tâches (19×19 px).
- Autofocus du titre en création (`2026-09-04`) : conservé ; seule l'interaction avec iOS est à vérifier (#4).
- Bouton « Créer » collant (`2026-09-01`), titre en `<textarea>` auto-agrandi (`2026-09-02`), swipe des filtres (`2026-09-04`).
- Drag & drop par poignée dédiée, limité à la vue « Toutes » (`2026-09-05`, `2026-09-06`) ; remplacement des flèches par le drag (demande explicite) — les correctifs de snap-back et d'étirement restent en place.
- Crash de page sur image lourde, `bodySizeLimit` 4 Mo et seuil client 3,8 Mo (`2026-09-18`).
- Suppression sans confirmation du `×` des sous-tâches : déjà signalée le 2026-09-13 et laissée ouverte (rappelée dans #24) ; choix du `confirm()` natif plutôt qu'un undo toast (même rapport).
- Vue par défaut « Toutes » (`2026-08-31`), règle de l'onglet « En retard » (`2026-09-12`), recherche élargie aux tags et à la liste (`2026-09-15`), suppression physique des « Tâches du jour » non cochées (`2026-09-13`).

**Assumés dans `PRODUCT.md` / `DESIGN.md` :**
- Absence d'authentification multi-utilisateur et accès par clé de service (`PRODUCT.md`, `2026-09-11-securisation-rls-service-role.md`) : non signalé comme faiblesse.
- Absence de contrainte d'accessibilité formelle : les constats d'accessibilité restent proportionnés à l'usage mobile d'un utilisateur unique.
- `active:scale-[0.97]` sur `listCard` pour une « ligne de liste unique » (`ui.ts`, `DESIGN.md`) : seule son interaction avec la poignée de drag est notée (#25).

**Hors périmètre :** cartes Tâches du dashboard, tâches dans l'Agenda (`DayView`, `WeekView`, `ListView`).

## Ordre de correction suggéré (lots pour d'éventuels prompts)

Contraintes communes à rappeler dans chaque prompt : ne jamais se fier au repo seul pour le schéma (la base réelle fait foi) ; Server Actions avec `useActionState` ; fonctions pures dans `src/lib/taches/compute.ts` ; `date-fns` pour les dates ; `revalidatePath` sur la route du module dans les Server Actions ; migrations sous `scripts/migration-<sujet>-YYYY-MM-DD.sql` + `-revert.sql` ; `set_updated_at()` réutilisée, jamais recréée ; `ALTER TYPE … ADD VALUE` et l'usage de la nouvelle valeur dans deux migrations distinctes (aucun enum n'est concerné ici).

| Lot | Constats | Contenu | Migration ? |
|---|---|---|---|
| **A. Saisie rapide** (priorité 1) | #1, #2, #3, #4, #5 | FAB/point d'entrée persistant sur `/taches`, toast + scroll/surbrillance après création, formulaire à champs repliables, `Entrée` = valider, `enterKeyHint`, échéance par défaut selon la vue, précharge du formulaire | Non |
| **B. Fiabilité de la saisie** (priorité 1) | #6, #18, #12, #17 | Création atomique/idempotente côté images, champs contrôlés, suppression d'image différée, `networkMode` + file Dexie pour les mutations de tâche, suppression de liste avec message et déplacement | Non |
| **C. Gestes tactiles** (priorité 2) | #7, #8, #25 | `data-swipe-ignore` sur les formulaires inline, isolation de `PullToRefresh` pendant le drag, décision produit sur l'ordre en vue « Toutes/toutes listes », retours du drag | Seulement si « ordre global » retenu |
| **D. Lisibilité** (priorité 2) | #9, #10, #11, #16, #20, #21, #27, #23 | Contraste des textes sur accents (clair/sombre), couleur de texte de liste calculée, cibles ≥ 44 px, pastille « Tâche du jour » explicite, notes tronquées et échéance relative, couleurs sémantiques, `aria-*` | Non |
| **E. Performance et données** (priorité 2) | #13, #14, #15, #19, #29 | Lecture groupée en une Server Action, réduction des `revalidatePath`, cause de `ƒ /taches` à isoler (`cookies()` du layout racine vs lecture de préférences), `memo` + `useDeferredValue` + montage différé des archivées, invalidation TanStack après mutations `listes/*`, persistance des filtres | Non |
| **F. États et finitions** (priorité 3) | #22, #24, #26, #28 | Messages d'état par vue, squelette aligné, sous-tâches optimistes, tri `termine_le` + rattrapage de données, compression d'image côté client | Oui : rattrapage `termine_le` (`scripts/migration-taches-backfill-termine-le-YYYY-MM-DD.sql` + revert) |

## Décalages repo/DB

**Aucun décalage de schéma.** Vérifié en lecture seule (`list_tables` + `SELECT`, aucune migration ni écriture) contre `src/lib/supabase/types.ts` :
- `taches` : 19 colonnes identiques (types, nullabilité, `termine_le`, `programme_jour`, `rappel_*`) ; `sous_taches`, `tache_images`, `listes_taches`, `tags`, `taches_tags` identiques ; enums `priorite_tache` et `frequence_recurrence` identiques ; FK cohérentes avec `Relationships`.
- Triggers présents : `trg_taches_updated_at`, `trg_taches_termine_le`, `trg_sous_taches_termine_le`, `trg_listes_taches_updated_at` ; fonctions `set_updated_at()` / `set_termine_le()` existantes.

Constats de base sans être des écarts de schéma :
- `taches_liste_id_fkey` est en `NO ACTION` (pas de cascade) : voir #17.
- 59 tâches faites sans `termine_le` (données antérieures au trigger) : voir #26.
- Le bucket `tache-images` est public, sans limite de taille ni de types MIME (`file_size_limit` et `allowed_mime_types` nuls) ; ces réglages n'apparaissent pas dans `types.ts` et la limite effective est celle de Next (4 Mo).

## Vérifications (Phase 3)

- `npx tsc --noEmit` : avant le build, une seule erreur, `src/app/layout.tsx(41,56): Cannot find name 'LayoutProps'` (type généré par `next build`, déjà documenté dans les rapports précédents, sans lien avec cet audit) ; **après le build : 0 erreur**.
- `npm run lint` : ✅ aucune erreur ni avertissement.
- `npm run build` : ✅ compilation Turbopack, TypeScript interne et génération des 24 routes réussies. **Aucun credential Supabase n'était nécessaire dans cet environnement** (pas de `.env*`) : le build n'a pas échoué. Sortie relevée : toutes les routes du groupe `(app)` sont `ƒ` (voir #14).
- `git status` : aucun fichier suivi modifié ; seul ce rapport est ajouté (`node_modules/`, `.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo` sont ignorés par `.gitignore`). Aucune migration, aucun code touché. Des scripts temporaires (calcul de contraste, test TanStack) ont été exécutés dans le dossier scratchpad de la session, hors du repo.

## Annexe — Scores `impeccable` (revue manuelle, sans détecteur)

**Heuristiques de Nielsen** (application mobile, mode « Operate » ; les 10 sont applicables) :

| # | Heuristique | Score | Constat clé |
|---|---|---|---|
| 1 | Visibilité de l'état du système | 2 | Création sans retour (#2), mutation en pause sans indication (#12), squelette trop court (#22) |
| 2 | Adéquation au monde réel | 3 | Libellés clairs en français ; « Tâche du jour » sous-expliqué (#16) |
| 3 | Contrôle et liberté | 2 | Suppression d'image irréversible malgré « Annuler » (#18), saisie perdue par swipe (#7) |
| 4 | Cohérence et standards | 2 | Couleurs sémantiques détournées (#21), flèches vs drag, `Link` vs `TransitionLink` (#29) |
| 5 | Prévention des erreurs | 2 | Doublons au retry (#6), suppression de liste vouée à l'échec (#17), cibles de tap étroites (#11) |
| 6 | Reconnaissance plutôt que rappel | 3 | Filtres visibles ; état non mémorisé (#29) |
| 7 | Flexibilité et efficacité | 2 | Pas de FAB sur le module (#1), pas d'`Entrée` pour valider (#4) |
| 8 | Design esthétique et minimaliste | 2 | Formulaire à 15 champs (#3), carte dense (#20) |
| 9 | Récupération après erreur | 2 | Message brut/masqué (#17), erreur sans bouton (#22) |
| 10 | Aide et documentation | 2 | Sens porté par des infobulles (#16, #23) |
| **Total** | | **22/40** | **Acceptable** (améliorations significatives à prévoir) |

**Audit technique (0-4)** :

| # | Dimension | Score | Constat clé |
|---|---|---|---|
| 1 | Accessibilité | 2 | Contrastes (#9, #10), états non exposés (#23), cibles < 44 px (#11) |
| 2 | Performance | 2 | Lectures séquentielles (#13), route redevenue dynamique (#14), 163 cartes non mémoïsées (#15) |
| 3 | Responsive / tactile | 2 | Conflits de gestes (#7), formulaire long sur mobile (#3), clavier (#4) |
| 4 | Thème | 2 | Tokens bien utilisés, mais fond d'accent blanc en sombre (#9), couleurs de liste libres (#10) |
| 5 | Intégrité d'implémentation | 3 | Système cohérent et documenté, correctifs précédents sans régression ; détecteur non exécuté, score partiel |
| **Total** | | **11/20** | **Acceptable** (les dimensions faibles sont l'accessibilité, la performance, le tactile et le thème) |

Commandes `impeccable` suggérées par lot (à lancer sur demande, non exécutées ici) : `adapt` (C), `harden` (B), `layout` (A, D), `clarify` (D, F), `optimize` (E), `polish` en dernier.
