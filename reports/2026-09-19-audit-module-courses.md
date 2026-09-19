# Audit UX/technique — module Courses

Date : 2026-09-19
Périmètre : `src/app/(app)/courses/*`, `src/app/actions/courses.ts`, `src/lib/courses/compute.ts`, la modale d'ajout Courses de `src/app/(app)/QuickAddFab.tsx`, la partie Courses de `src/app/actions/recherche.ts`, la file offline `src/lib/offline/queue.ts`/`db.ts` (globale à 4 modules), `src/components/CheckToggle.tsx`, `AnimatedAddCard.tsx`, `PullToRefresh.tsx`, `src/lib/confirm.ts`, `useBackClose`, `src/app/actions/nettoyage.ts` et `NettoyageAutoRow.tsx`. Hors périmètre (acté par Vincent) : lien Courses ↔ Recettes, quantité/rayon/catégorie sur un article (décision produit : un article reste du texte libre, `libelle` seul).
Branche auditée : `kilio` @ `dd4f842` (fast-forward depuis `origin/kilio`, aucun commit local en avance).
Aucune modification de code, aucune migration, aucune écriture en base : ce fichier est le seul ajout (vérifié en Phase 3).

> ⚠️ **DEGRADED: single-context** (format imposé par la référence `critique` du skill `impeccable`, comme dans `reports/2026-09-18-audit-module-taches.md`).
> - Le skill `impeccable` est disponible, mais **le détecteur (`impeccable detect`) n'a pas été exécuté** : aucun binaire n'est en cache dans cette session (`~/.impeccable` absent, contrairement à la session `taches lot B` qui en avait un en cache), et le lanceur du skill télécharge un `.exe` depuis GitHub avant de l'exécuter. Ce téléchargement n'a pas été autorisé et n'a pas été lancé. Repli documenté du skill appliqué : lecture directe de `PRODUCT.md`/`DESIGN.md` (`.impeccable/design.json`, déjà commité, a aussi été consulté). Aucune vérification déterministe du détecteur n'est donc incluse ; les constats reposent sur la seule revue manuelle du code + base réelle.
> - Les évaluations n'ont pas été confiées à des sous-agents isolés (aucun sous-agent lancé, faute de demande explicite) : tout a été fait dans un seul contexte.
> - Question de clôture du skill remplacée par la question de fin de session imposée par le prompt.

## Méthode et limites

- **Lu en entier** : `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`/`AGENTS.md`, `src/lib/ui.ts`, `src/app/globals.css` (tokens de couleur et `prefers-reduced-motion`), les 4 rapports `reports/*courses*.md` (archivage du 2026-09-13, lenteur d'ouverture du 2026-09-09, labels QuickAddFab du 2026-08-31, haptique du 2026-09-06) et `reports/2026-09-18-audit-module-taches.md` comme modèle de format. Tous les fichiers du périmètre ci-dessus, plus `src/app/providers.tsx` (config TanStack Query, `networkMode` par défaut), `src/lib/offline/useOnlineSync.ts`, `src/components/toast/toast-store.ts`, `src/components/Modal.tsx`, `src/app/actions/taches.ts`/`notes.ts`/`habitudes.ts` (pour comparer les 4 modules couverts par la file offline) et `supabase/functions/nettoyage-auto/index.ts`.
- **Rapports transverses lus en détail pour situer le contexte offline** : `reports/2026-09-03-feedback-tactile-offline-queue.md` (création de la file), `reports/2026-09-18-taches-lot-b-fiabilite.md` (seul module ayant reçu `networkMode: "always"` à ce jour — pas Courses, voir constat #14).
- **Skills appliqués** : `web-design-guidelines` et `vercel-react-best-practices` confrontés au code du périmètre (peu de surface : 15 lignes en base, pas de virtualisation nécessaire à ce volume — voir constat écarté). `impeccable` en mode dégradé (voir bandeau ci-dessus).
- **Base réelle** (Supabase MCP, projet `vsmtkopkqasrdnjceegp`, `list_tables` + `execute_sql`, **lecture seule** — aucune ligne modifiée) :
  - Schéma réel de `courses_items` (`id uuid`, `libelle text`, `coche bool`, `created_at`/`updated_at`/`termine_le timestamptz`) : **identique** à `src/lib/supabase/types.ts`, aucun décalage repo/DB.
  - Triggers : `trg_courses_items_updated_at` (`set_updated_at()`) et `trg_courses_items_termine_le` (`set_termine_le()`), tous deux déjà en place et partagés avec Tâches/Notes/Objectifs — à réutiliser tels quels pour tout futur lot (renommage, etc.), jamais à recréer.
  - Index : `courses_items_pkey` (id) et `idx_courses_items_coche_created_at` (coche, created_at desc) — couvre exactement le tri utilisé par `getCoursesItems`.
  - Comptages : **15 lignes** au total, **6 actives**, **9 archivées** (cochées). **0 doublon** de `libelle` actuellement (comparaison insensible à la casse, espaces ignorés). Longueur de `libelle` : min 6, max 32, moyenne 17,4 caractères — aucune contrainte de longueur en base ni côté client (pas de `maxLength` sur l'`<input>`), sans problème observé au volume actuel.
  - Ancienneté des cochés : le plus ancien `termine_le` date de **6 jours** (2026-09-13) ; `reglages_nettoyage` = `actif: true`, `delai_jours: 30`, `derniere_execution` = ce matin (2026-09-19 05:00 UTC, exécution quotidienne confirmée via `supabase/functions/nettoyage-auto/index.ts`, table `courses_items` incluse). **Aucun article coché n'a encore atteint 30 jours** : le nettoyage n'a donc rien supprimé côté Courses pour l'instant, mais le fera pour les 9 lignes actuelles dès qu'elles franchiront ce seuil — voir constat #4 (« habituels »).
- **Vérification du bug de file offline** (voir constat #13) : lecture du code, puis **une requête `SELECT` en lecture seule** confirmant le comportement Postgres exact (`select * from courses_items where id = 'temp-...'` → erreur `22P02`), puis **reproduction de la logique de `flushQueue` dans un script isolé** (`node`, hors repo, scratchpad de session) avec des mocks qui imitent ce comportement réel — aucune écriture, aucun accès réseau au projet Supabase depuis ce script.
- **Non testable dans cette session** (pas de credentials Supabase pour `next dev`, aucun appareil, pas de simulation fiable de mode avion/gestes tactiles) : tout ce qui concerne le rendu réel, le clavier virtuel, le geste de collage multi-lignes et le comportement exact en mode avion est marqué **« à vérifier visuellement »** ou **« à vérifier sur appareil »**. Les hauteurs de cibles de tap sont des **estimations tirées des classes Tailwind** (line-height ≈ 1,5), comme dans l'audit Tâches.

## Synthèse

**15 constats : 2 [Bloquant], 10 [Gênant], 3 [Cosmétique].** Le module fonctionne pour l'usage actuel (ajouter, cocher, supprimer un article), mais concentre ses défauts sur exactement les 3 axes demandés, dans l'ordre inverse de gravité technique par rapport à l'ordre de priorité produit énoncé par Vincent (magasin, puis saisie, puis fiabilité) : le bug de file offline (axe 3, priorité produit la plus basse) est le seul avéré **[Bloquant]**, transverse à tout Kilio.

**Top 3 pour le principe « saisie rapide avant tout »** (`PRODUCT.md`, principe n°4) :

1. **#1 — Le formulaire se ferme après chaque ajout**, dans `AddCourseToggle` comme dans la modale du FAB : ajouter 5 articles d'affilée coûte 5 réouvertures complètes du formulaire (voire du menu du FAB), alors qu'une liste de courses se saisit typiquement d'un coup, pas article par article dans le temps.
2. **#2 — Aucun ajout multiple** : coller « lait, œufs, pain » ou plusieurs lignes crée un seul article au libellé composite au lieu de trois articles séparés — aucun découpage n'existe.
3. **#4 — Pas de raccourci « habituels »**, et la profondeur d'historique exploitable pour en construire un est plafonnée à une fenêtre glissante de 30 jours par le nettoyage automatique (déjà actif, confirmé en base) : un article acheté une fois par mois ou moins sortirait de cette fenêtre avant de pouvoir servir de suggestion.

**Verdict sur le bug de file suspecté (constat #13) : CONFIRMÉ**, avec preuve par lecture de code + vérification Postgres en lecture seule + reproduction isolée (détail en fin de rapport).

## Constats détaillés

Niveaux : **[Bloquant]** = peut bloquer silencieusement une fonctionnalité pour tout le monde (pas seulement Courses) ; **[Gênant]** = friction réelle vérifiée ; **[Cosmétique]** = écart mineur ou déjà documenté ailleurs.

### Saisie

#### 1. [Gênant] Le formulaire se ferme après chaque ajout, dans les deux points d'entrée

- **Où** : `AddCourseForm.tsx:54-57` (`onSuccess: setLibelle(""); onDone?.()`) ; `AddCourseToggle.tsx:35` (`onDone={() => setOpen(false)}`, replie `AnimatedAddCard` vers le bouton déclencheur) ; `QuickAddFab.tsx:217` (`onDone={() => goBackSteps(2)}`, referme toute la modale **et** le menu du FAB, retour à un simple bouton « + »).
- **Impact concret** : pour ajouter 5 articles depuis `/courses` (`AddCourseToggle`), chaque ajout referme la carte de saisie ; il faut retaper sur « + Ajouter un article » à chaque fois (5 taps supplémentaires pour 5 articles). Depuis le FAB (dashboard), c'est pire : chaque ajout referme tout le menu à trois choix (Courses/Tâches/Notes) jusqu'au simple bouton « + » — ajouter 5 articles impose de rouvrir le menu et de re-sélectionner « Courses » 5 fois. Contredit le principe n°4 de `PRODUCT.md` (« réduire le nombre de taps et d'écrans »).
- **Recommandation** (non implémentée) : garder le formulaire ouvert après un ajout réussi (vider le champ, le refocaliser, laisser `AnimatedAddCard`/la modale ouverte) et remplacer la fermeture par un signal de succès discret (voir #6) ; ne fermer que sur « Annuler »/tap en dehors.

#### 2. [Gênant] Aucun ajout multiple (coller ou saisir plusieurs articles d'un coup)

- **Où** : `AddCourseForm.tsx:61-70` (`handleSubmit` prend `libelle.trim()` comme une seule chaîne) ; `courses.ts:19-29` (`createCourseItem(libelle: string)` insère une seule ligne, aucune séparation).
- **Impact concret** : coller un texte du type « lait, œufs, pain » (copié depuis une note ou un SMS) ou taper plusieurs lignes dans le champ crée **un seul** article au libellé complet, jamais trois articles distincts. Le champ étant un `<input>` simple (pas de `<textarea>`), un retour à la ligne n'est même pas saisissable au clavier — seul le collage peut introduire un `\n`.
- **Recommandation** : fonction pure `decouperLibellesMultiples(saisie: string): string[]` dans `src/lib/courses/compute.ts` (découpe sur virgule et/ou retour ligne, trim + filtre les entrées vides), un aperçu des N articles détectés avant validation, et soit N appels à `createCourseItem` soit une nouvelle action bulk `createCourseItems(libelles: string[])` (plus économe en aller-retours) — à déclarer dans `ACTIONS.courses` de `queue.ts` si elle doit aussi fonctionner hors ligne.

#### 3. [Gênant] Aucun contrôle de doublons à la création

- **Où** : `courses.ts:19-29` (`createCourseItem` insère sans vérifier l'existant) ; base réelle : 0 doublon aujourd'hui, mais rien ne l'empêche.
- **Impact concret** : retaper « Lait » (ou « lait », la casse n'étant pas contrôlée) alors qu'un article identique existe déjà — actif ou archivé (coché) — crée un second article séparé. Retrouver un article archivé identique pour le « redemander » (le décocher plutôt que d'en recréer un) suppose de le retrouver manuellement dans la section repliée « Articles archivés ».
- **Recommandation** : avant insertion, chercher un item existant au même libellé (comparaison `lower(trim(...))`, côté serveur) ; si un actif identique existe → avertir plutôt qu'insérer (« déjà dans la liste ») ; si seul un archivé identique existe → proposer de le décocher (réactiver) au lieu d'en créer un nouveau — décision produit à confirmer avec Vincent (voir Questions ouvertes).

#### 4. [Gênant] Pas de source « habituels », et profondeur d'historique plafonnée à 30 jours

- **Où** : aucune UI ni fonction existante pour un raccourci « articles fréquents »/« habituels » dans tout le périmètre lu. Source candidate la plus naturelle : l'historique des articles archivés (cochés) de `courses_items`. Base réelle : `reglages_nettoyage` (`actif: true`, `delai_jours: 30`, dernière exécution ce matin) purge quotidiennement, via `supabase/functions/nettoyage-auto/index.ts`, tout article dont `termine_le < now() - 30 jours` — **`courses_items` est explicitement dans la liste des tables purgées**. Les 9 articles archivés actuels ont tous un `termine_le` renseigné (contrairement au module Tâches, qui avait des données historiques sans cette colonne) : ils seront donc **physiquement supprimés** dès qu'ils dépasseront 30 jours, sans table d'archive séparée.
- **Impact concret** : si les « habituels » sont dérivés de l'historique des cochés, la fenêtre exploitable est une fenêtre glissante de 30 jours et 9 lignes aujourd'hui — un article acheté toutes les 5-6 semaines (produit d'entretien, ingrédient occasionnel) sort de cette fenêtre avant d'avoir pu resservir de suggestion. Ce plafond est un réglage déjà entre les mains de Vincent (`/reglages`, `NettoyageAutoRow.tsx`), mais changer sa valeur pour Courses changerait aussi la purge de Tâches/Notes/Objectifs (réglage global, une seule ligne `reglages_nettoyage`, pas de délai par module).
- **Recommandation** (décision produit à trancher par Vincent, aucune n'est implémentée ici) : (a) accepter la fenêtre de 30 jours glissante comme suffisante pour un premier jet d'« habituels » ; (b) ou introduire un historique dédié non soumis au nettoyage (nouvelle colonne/table conservant les libellés vus, migration `scripts/migration-courses-historique-YYYY-MM-DD.sql` + `-revert.sql`) ; (c) ou détacher le délai de nettoyage de Courses du réglage global (migration + UI dédiée, plus lourd). Emplacement UI suggéré : rangée de pastilles cliquables au-dessus ou sous le formulaire d'ajout, alimentée par une requête `distinct libelle` sur les archivés triés par fréquence/récence (coût : une requête supplémentaire, à ne déclencher qu'à l'ouverture du formulaire, pas au chargement de la page).

#### 5. [Cosmétique] Champ sous 16px, pas d'`enterKeyHint` — mais « Entrée » valide déjà (contrairement à Tâches)

- **Où** : `src/lib/ui.ts:26` (`input` en `text-[15px]`) ; `AddCourseForm.tsx:74-81` (`<input>` simple, sans `enterKeyHint`, sans `onKeyDown`).
- **Ce qui fonctionne déjà bien** : contrairement au module Tâches (titre en `<textarea>`, où « Entrée » insère un saut de ligne, cf. audit Tâches #4), le champ Courses est un **`<input>` simple** dans un `<form onSubmit>` : la touche « Entrée » du clavier mobile déclenche nativement la soumission du formulaire, sans code supplémentaire. Aucun bug ici.
- **Impact concret (résiduel)** : (a) sans `enterKeyHint="done"`, le clavier mobile affiche l'icône générique (souvent une flèche de retour à la ligne) plutôt qu'un « Ajouter »/« OK » explicite — *à vérifier visuellement, dépend du clavier du téléphone*. (b) `text-[15px]` (< 16px) peut déclencher un zoom automatique au focus sur iOS Safari — défaut déjà documenté à l'identique dans l'audit Tâches #4(c) (`ui.ts` partagé), non re-mesuré ici.
- **Recommandation** : `enterKeyHint="done"` sur l'`<input>` ; le passage à 16px est un changement de design-system partagé (tous les usages de `input`), à trancher globalement plutôt que localement à Courses.

#### 6. [Gênant] Aucun retour visuel de succès après un ajout

- **Où** : `AddCourseForm.tsx:54-57` (`onSuccess` ne fait que vider le champ et fermer — aucun `showToast`, contrairement au chemin d'erreur `onError` qui, lui, affiche `"Impossible d'ajouter l'article."`).
- **Impact concret** : dans le cas courant (succès), la seule confirmation est la fermeture du formulaire (constat #1) — combiné à #1, l'utilisateur n'a aucun signal positif tant qu'il n'a pas rouvert la liste pour voir le nouvel article en tête (le tri `created_at desc` place bien le nouvel article en haut de la liste active, ce qui est correct — contrairement au constat #2 de l'audit Tâches où la tâche partait en fin de liste).
- **Recommandation** : un `showToast` bref (« « Lait » ajouté ») en plus de (ou à la place de) la fermeture du formulaire — d'autant plus utile si #1 est corrigé et que le formulaire reste ouvert (le retour visuel devient alors la seule confirmation, puisque la liste n'est pas visible sous le clavier).

### Usage en magasin

#### 7. [Gênant] Suppression : `window.confirm` natif, aucun pattern d'annulation

- **Où** : `CourseItemRow.tsx:101-104` (`confirmDelete` avant `deleteMutation.mutate()`) ; `src/lib/confirm.ts` (`window.confirm`) ; recherche exhaustive de `Annuler`/`undo` dans `src/components/toast/toast-store.ts` → **aucun pattern d'annulation n'existe nulle part dans Kilio aujourd'hui** (le swipe-to-delete avait été tenté puis retiré début septembre pour un tout autre motif — rendu visuel raté sur mobile, `reports/2026-09-03-feedback-tactile-offline-queue.md` — sans jamais introduire de undo-toast en remplacement).
- **Impact concret** : chaque suppression déclenche une boîte de dialogue native du navigateur (rupture de ton avec le reste de l'app, qui utilise des modales maison), bloque le fil JS pendant l'attente, et impose un aller-retour de confirmation systématique. En magasin, avec une main occupée (chariot/panier), ce détour a un coût réel à chaque article coché par erreur qu'on veut retirer. Le bouton « Suppr. » (`dangerButton`, ~34px de hauteur estimée) est directement accolé au libellé, sans zone de séparation dédiée avec la case à cocher.
- **Recommandation** : remplacer par une suppression immédiate (le mécanisme optimiste existe déjà côté mutation) + un toast « « Lait » supprimé · Annuler », en retardant l'appel réel à `deleteCourseItem` le temps de la fenêtre d'annulation (ou en le laissant partir immédiatement et en recréant l'item si « Annuler » est pressé — à trancher selon le budget d'effort). **Aucun composant de ce type n'existe ailleurs dans Kilio à réutiliser tel quel** : c'est une brique nouvelle, pas un copier-coller (impact sur l'estimation d'effort du lot B, voir plus bas).

#### 8. [Gênant] Aucune possibilité de renommer un article

- **Où** : `CourseItemRow.tsx` — aucune UI d'édition du `libelle`, seuls cochage et suppression existent.
- **Impact concret** : corriger une faute de frappe ou préciser un article (« Deo » → « Déo homme ») impose de le supprimer puis d'en retaper un nouveau (2 actions au lieu d'une correction sur place), avec en prime le passage par la confirmation de suppression (#7).
- **Recommandation** : tap sur le libellé (`<p>{item.libelle}</p>`) → passage en `<input>` inline (état local), nouvelle Server Action `updateCourseItem(id, libelle)` avec mise à jour optimiste identique au toggle, `revalidatePath("/courses")`. Impact vérifié sur les mécanismes existants :
  - `updated_at` : le trigger `trg_courses_items_updated_at` (`set_updated_at()`) se déclenchera normalement sur l'`UPDATE` — à réutiliser tel quel, ne jamais le recréer.
  - `termine_le` : le trigger dédié (`set_termine_le()`) ne réagit qu'au changement de `coche` (comportement observé sur les données réelles, où `termine_le` reste stable entre deux mises à jour de `libelle`) — un renommage ne devrait donc **pas** perturber le nettoyage automatique, à confirmer par lecture du corps de la fonction si le lot est engagé (non lu ici, hors périmètre de cet audit en lecture seule sur les fonctions).
  - Recherche globale (`recherche.ts:54-58`) lit `libelle` directement à chaque requête : un renommage sera reflété sans changement côté recherche.
  - File offline : si le renommage doit fonctionner hors ligne (cohérent avec create/toggle/delete déjà couverts), déclarer `updateCourseItem` dans `ACTIONS.courses` de `queue.ts` — et se poser la même question que le constat #13/#14 (un renommage mis en file avec un id `temp-...` swallow silencieusement la file, tant que #14 n'est pas corrigé).

#### 9. [Gênant] Aucun moyen de vider les articles cochés en un geste

- **Où** : `ArchivedCoursesSection.tsx` — pas de bouton global, seul « Suppr. » par ligne (via `CourseItemRow`, hérité tel quel) ; nettoyage automatique (`nettoyage-auto`) à 30 jours, non déclenchable manuellement (`NettoyageAutoRow.tsx` ne fait qu'activer/désactiver et régler le délai, pas de bouton « nettoyer maintenant »).
- **Impact concret** : vider la liste de courses en sortant du magasin (le besoin exprimé par Vincent) suppose aujourd'hui de supprimer un par un les 9 articles actuellement archivés (9 taps « Suppr. » + 9 confirmations natives, #7), ou d'attendre jusqu'à 30 jours le nettoyage automatique — aucune des deux options ne correspond à « vider » au sens immédiat.
- **Recommandation** : bouton « Vider les cochés » dans l'en-tête d'`ArchivedCoursesSection` (visible seulement si `items.length > 0`), nouvelle Server Action `viderCoursesCochees()` (`delete from courses_items where coche = true`, `revalidatePath("/courses")`), avec confirmation groupée unique (« Supprimer les 9 articles cochés ? ») ou suppression immédiate + toast Annuler (cohérent avec #7, à trancher ensemble). Garder ce mécanisme manuel strictement indépendant du nettoyage automatique à 30 jours (l'un immédiat et volontaire, l'autre différé et systématique) plutôt que de les fusionner.

#### 10. [Gênant] Pas de compteur d'avancement, pas d'état positif « tout est coché »

- **Où** : `CoursesList.tsx:13-41` — aucun calcul de progression (x actifs / y total) ; quand `actifs.length === 0`, le `<ul>` de la liste active ne s'affiche pas du tout et seule la section « Articles archivés (N) » (repliée par défaut) reste visible.
- **Impact concret** : lorsque tous les articles sont cochés (scénario fréquent en fin de course), l'écran affiche seulement une section repliée avec un chiffre entre parenthèses — pas de confirmation positive explicite type « courses terminées ». À l'inverse de l'état vide générique (« Aucun article pour l'instant. », `CoursesList.tsx:22`), qui ne distingue pas non plus « aucun article n'a jamais existé » de « tout est coché ».
- **Recommandation** : petit texte de progression (« 2/6 cochés ») au-dessus de la liste active — fonction pure `compterProgression(items)` dans `compute.ts` — et un message dédié quand `actifs.length === 0 && archives.length > 0` (ton à définir avec Vincent, ex. « Tout est dans le chariot ! »).

#### 11. [Cosmétique, à vérifier visuellement] Cibles de tap et contraste hérités du design-system partagé

- **Où** *(hauteurs estimées d'après les classes Tailwind)* : bouton « Suppr. » (`dangerButton`, `ui.ts:48-49`) ≈ 34px, accolé au libellé sans séparation dédiée ; `CheckToggle` en configuration par défaut (`size=22`, `hitSlop=11`) → zone de tap effective ≈ 44×44px, **conforme**, contrairement à plusieurs contrôles de Tâches (audit Tâches #11). Texte blanc sur `bg-kcal` (bouton « Ajouter », `primaryButton`) hérite du même déficit de contraste que documenté dans l'audit Tâches (#9, 2,34:1 en thème sombre) : `ui.ts` est partagé entre les deux modules, non re-mesuré séparément ici.
- **Impact concret** : identique à ce qui a déjà été chiffré pour Tâches, sans particularité propre à Courses.
- **Recommandation** : ne pas corriger localement — aligner sur une éventuelle correction de contraste au niveau du design-system (`DESIGN.md` § Colors), qui bénéficierait aux deux modules (et à tous les autres utilisant `primaryButton`).

### Fiabilité offline

#### 12. [Cosmétique, écarté comme défaut propre à Courses] Couleur de module utilisée comme couleur interactive du `CheckToggle`

- **Où** : `CourseItemRow.tsx:92` (`color="var(--accent-courses)"`) contredit littéralement « The One Accent Rule » de `DESIGN.md` (seul le vert kcal devrait être une couleur interactive).
- **Écarté, car** : ce n'est pas une régression propre à Courses — le même choix existe à l'identique pour Objectifs (`ObjectifSuiviEtapes.tsx:127`, `color="var(--accent-objectifs)"`). C'est une convention déjà répandue dans l'app, hors périmètre d'un audit ciblé sur Courses ; à traiter, si souhaité, comme un chantier transverse de cohérence de charte.

#### 13. [Bloquant] Hypothèse du bug de file confirmée : un toggle/delete sur un id `temp-...` bloque `flushQueue` définitivement

**Verdict : CONFIRMÉ.**

- **Mécanisme, vérifié en trois étapes indépendantes :**

  1. **Lecture de code.** `AddCourseForm.tsx:31-48` (`onMutate`) affiche un article optimiste avec `id: \`temp-${crypto.randomUUID()}\`` **avant** toute confirmation serveur. Si l'app est hors ligne au moment de l'ajout, `createCourseItem` échoue avec une erreur réseau, l'action est mise en file (`enqueueAction("courses", "createCourseItem", [value])`, `AddCourseForm.tsx:24-29`) — **sans** l'id temporaire, seulement le libellé, donc pas de risque à ce stade précis. Le risque apparaît si, **pendant que cette création est encore en file** (donc que l'article temp- reste affiché, éventuellement pendant toute la durée d'une session hors ligne — voir note ci-dessous), l'utilisateur coche ou supprime cet article : `CourseItemRow.tsx:27-51` et `:53-76` mettent alors en file `toggleCourseItem(item.id, ...)` ou `deleteCourseItem(item.id)` **avec `item.id = "temp-..."`** (`enqueueAction("courses", "toggleCourseItem", [item.id, !item.coche])`, etc.).
  2. **Vérification Postgres, en lecture seule.** Une requête `select * from courses_items where id = 'temp-3f2504e0-...'` exécutée dans cette session renvoie : `ERROR: 22P02: invalid input syntax for type uuid: "temp-3f2504e0-..."`. `courses_items.id` est bien de type `uuid` (confirmé par `list_tables`), donc **tout appel `.eq("id", "temp-...")` — utilisé par `toggleCourseItem`/`deleteCourseItem`, `courses.ts:31-47` — échoue systématiquement avec cette erreur Postgres**, remontée par Supabase comme `{ error }`, puis relancée par la Server Action (`if (error) throw new Error(error.message)`).
  3. **Reproduction isolée de la boucle de `flushQueue`** (script Node, hors repo, scratchpad de session, copie fidèle de `src/lib/offline/queue.ts:54-84` avec Dexie remplacé par un tableau en mémoire et les Server Actions remplacées par des mocks reproduisant le comportement ci-dessus). Scénario : une création Courses en file, puis un `toggleTache` (Tâches, sans lien), puis un `toggleCourseItem("temp-...", true)`, puis un `deleteCourseItem("temp-...")`, puis un `deleteTache` (Tâches). Résultat exact de l'exécution :
     ```
     Appels effectués : createCourseItem(Pain), toggleTache(...), toggleCourseItem(temp-..., true)
     Actions synchronisées : 2
     Actions restées dans la file (jamais retirées) : 3
     ```
     Le `toggleCourseItem("temp-...")` échoue (comme démontré en étape 2), `flushQueue` s'arrête (`catch { break; }`, `queue.ts:72-74`) **avant même d'essayer** `deleteCourseItem("temp-...")` et, surtout, **avant le `deleteTache` d'un tout autre module, sans aucun rapport avec Courses**, mis en file *après* l'action bloquante.

- **Où** : `AddCourseForm.tsx:31-48` (origine de l'id temp), `CourseItemRow.tsx:27-76` (mise en file avec cet id), `courses.ts:31-47` (`.eq("id", id)` sur colonne `uuid`), `src/lib/offline/queue.ts:54-84` (`flushQueue`, catch non discriminant).
- **Impact concret** : (a) l'article dont la création était en file reste dans cet état indéfiniment (le toggle/delete voulu par l'utilisateur ne s'exécute jamais) ; (b) **toute action mise en file après elle, pour n'importe lequel des 4 modules couverts (Tâches, Notes, Courses, Habitudes), reste bloquée aussi** ; (c) chaque retour en ligne (évènement `online`, ou remontage de l'app déjà en ligne — `useOnlineSync.ts:24-33`) relance `flushQueue` depuis le début de la file (`orderBy("created_at")`), retombe sur la même action `temp-...`, échoue à nouveau, et s'arrête à nouveau — **blocage permanent**, sans mécanisme de purge ni d'expiration ; (d) rien ne permet à l'utilisateur de voir ou vider cette file bloquée depuis l'app (pas d'écran de diagnostic, pas de bouton, aucune UI ne référence `pending_actions`).
- **Plausibilité en usage réel** *(à vérifier sur appareil, non observable dans cette session sans device)* : le scénario ne nécessite pas un vrai mode avion — `isNetworkError` (`queue.ts:27-33`) déclenche aussi la mise en file sur un simple échec `fetch` (« Failed to fetch », etc.) alors que `navigator.onLine` reste `true`, ce qui est le cas courant d'une connexion mobile instable (ascenseur, sous-sol de magasin, zone mal couverte) — situation cohérente avec l'usage « en magasin » documenté dans `PRODUCT.md`. De plus, comme aucune mutation Courses n'a `networkMode: "always"` (voir #14), un vrai passage hors ligne (évènement navigateur `offline`) met en pause la requête `getCoursesItems` elle-même : l'article `temp-...` peut donc rester affiché, et donc « cochable »/« supprimable », **pendant toute la durée de la coupure**, pas seulement une fenêtre de quelques centaines de millisecondes.

#### 14. [Bloquant, transverse] `flushQueue` ne distingue jamais une erreur réseau d'une erreur métier permanente, et n'en informe jamais l'utilisateur

- **Où** : `src/lib/offline/queue.ts:62-74` — le `catch` à l'intérieur de la boucle est **nu** (`catch { break; }`), sans appeler `isNetworkError` (pourtant défini dans ce même fichier et utilisé par tous les appelants côté composants). Comparer avec `AddCourseForm.tsx:25-26`/`CourseItemRow.tsx:32-33` qui, eux, distinguent bien réseau vs métier — cette discrimination existe donc déjà comme convention dans le code, juste pas à l'intérieur de `flushQueue` lui-même.
- **Impact concret** : le constat #13 (id `temp-...`) n'est qu'**un exemple concret** d'un problème plus général — *n'importe quelle* erreur permanente (ligne supprimée entretemps depuis un autre appareil, valeur devenue invalide, etc. — risque déjà noté comme connu mais non traité dans `reports/2026-09-03-feedback-tactile-offline-queue.md`, section « Points de vigilance ») bloque la file de la même façon, pour tous les modules. Aucun `console.error`, aucun `showToast` d'échec n'est déclenché dans ce chemin : le seul retour utilisateur existant (`showToast` du nombre d'actions synchronisées, `queue.ts:77-79`) ne s'affiche que si `synced > 0` — dans le pire cas (blocage dès la première action), **aucun signal n'est jamais montré**, ni de succès ni d'échec.
- **Recommandation** : dans la boucle de `flushQueue`, catcher l'erreur avec `isNetworkError` : si erreur réseau → comportement actuel inchangé (`break`, retenter au prochain flush) ; si erreur non réseau (permanente) → journaliser, notifier l'utilisateur (« Une action n'a pas pu être synchronisée et a été abandonnée » ou plus précis si possible), **retirer l'action de la file** (`db.pending_actions.delete`) et **continuer** avec les actions suivantes au lieu de `break`.
- **Risque de régression transverse (à évaluer avant tout lot)** : `flushQueue` est partagée par Tâches, Notes, Courses et Habitudes (`ACTIONS`, `queue.ts:16-21`). Le changement proposé ne touche que le traitement de l'erreur (pas l'ordre de rejeu, toujours `created_at` croissant), donc le risque de régression sur les 3 autres modules est limité en théorie ; en pratique, il faut rejouer manuellement (pas de banc d'essai existant pour `queue.ts` à ce jour, contrairement à `taches.ts` qui en a un depuis le lot B) les scénarios de blocage déjà connus sur Tâches (id supprimé entretemps, cf. rapport du 2026-09-03) avant de livrer un correctif partagé.

#### 15. [Gênant] Asymétrie structurelle : Courses est le seul module dont la *création* est mise en file hors ligne

- **Où** : `queue.ts:16-21` (`ACTIONS`) — Tâches ne met en file que `toggleTache`/`deleteTache` (pas `createTache`/`updateTache`) ; Notes ne met en file que `toggleNoteItem`/`deleteNote` (pas `createNote`) ; Habitudes ne met en file que `enregistrerEntreeHabitude`/`supprimerHabitude`, et `enregistrerEntreeHabitude` opère toujours sur un `habitude_id` **déjà existant** (les habitudes elles-mêmes sont créées via un formulaire non couvert par la file) ; **Courses est seul à mettre en file `createCourseItem`**, qui génère côté client un id `temp-...` affiché immédiatement (`AddCourseForm.tsx:35-46`).
- **Impact concret** : cette asymétrie explique pourquoi le scénario du constat #13 est spécifique à Courses aujourd'hui — sur Tâches/Notes, une création hors ligne échoue directement avec un message d'erreur (pas de ligne optimiste avec id temporaire affichée dans la liste), donc rien de « temp- » n'existe qui puisse ensuite être ciblé par un toggle/delete mis en file. Corriger uniquement le symptôme (bloquer la création d'un toggle/delete sur un id `temp-` côté UI Courses, ex. griser la case le temps de la synchronisation) traiterait le cas actuel sans traiter la fragilité structurelle de `flushQueue` (#14), qui resterait exploitable par tout futur module ou toute future action mise en file générant elle aussi un id optimiste (le renommage du constat #8, par exemple, s'il était mis en file un jour).
- **Recommandation** : traiter #14 (robustesse de `flushQueue`) **et** ajouter un garde-fou local à Courses (désactiver cocher/supprimer tant que `item.id.startsWith("temp-")`, avec un état visuel « en attente d'enregistrement ») — les deux corrections sont complémentaires, pas substituables l'une à l'autre.

## Ce qui fonctionne bien

- Ajout, cochage, suppression : mutations optimistes avec rollback et toast discret en cas d'erreur (`AddCourseForm.tsx`, `CourseItemRow.tsx`) ; retour haptique au cochage (`vibrate()`, cohérent avec la convention Tâches/Habitudes).
- « Entrée » valide déjà l'ajout (voir #5) — pas de bug de saisie clavier contrairement à Tâches.
- Nouvel article correctement placé en tête de la liste active (tri `created_at desc` côté serveur) — pas de régression du type « nouvel élément hors écran » observée sur Tâches.
- Section « Articles archivés » repliable, sur le modèle exact d'`ArchivedTasksSection`, avec `aria-expanded` correct (`ArchivedCoursesSection.tsx`).
- `CheckToggle` avec zone de tap effective ≈ 44×44px par défaut (`hitSlop=11`) — conforme, sans les problèmes de cibles trop petites documentés ailleurs dans Tâches.
- `Modal` (FAB) : `role="dialog"`, `aria-modal`, isolation tactile (`stopPropagation` sur les événements touch) pour ne pas déclencher le swipe de navigation d'onglets.
- `prefers-reduced-motion` respecté (`AnimatedAddCard`, `ArchivedCoursesSection`, `PullToRefresh`).
- Aucun décalage de schéma repo/DB : `courses_items`, ses triggers et son index correspondent exactement à `src/lib/supabase/types.ts` et à l'usage réel du code.
- Volume actuel (15 lignes) trop faible pour tout souci de performance de rendu (pas de virtualisation nécessaire, contrairement aux 163 cartes de Tâches).

## Points écartés

**Hors périmètre acté par Vincent :**
- Lien Courses ↔ Recettes.
- Ajout de quantité/rayon/catégorie sur un article (décision produit : `libelle` texte libre uniquement).

**Déjà couverts par un rapport existant (non re-signalés) :**
- Archivage des articles cochés en section repliable (`reports/2026-09-13-archivage-courses.md`) — fonctionne comme documenté.
- Lenteur d'ouverture du module (prefetch anticipé + filet de sécurité visuel, `reports/2026-09-09-lenteur-ouverture-courses.md`) — non re-testée ici (nécessiterait un appareil), aucune régression suspectée dans le code relu.
- Labels texte et bouton « Courses » du FAB (`reports/2026-08-31-quickaddfab-labels-courses.md`).
- Retour haptique au cochage (`reports/2026-09-06-haptique-notes-courses-collection-objectifs.md`) — absence volontaire sur la suppression, déjà justifiée dans ce rapport (« diluerait le signal haptique »).

**Assumés dans `PRODUCT.md`/`DESIGN.md` ou communs à tout Kilio, non re-détaillés :**
- Contraste texte blanc sur `bg-kcal`/boutons d'accent en thème sombre : déjà chiffré dans l'audit Tâches (#9), `ui.ts` partagé — voir constat #11.
- Couleur de module utilisée comme couleur interactive du `CheckToggle` : convention déjà répandue (Objectifs) — voir constat #12, écarté.
- Absence d'authentification multi-utilisateur, accès par clé de service : assumé dans `PRODUCT.md`, non signalé comme faiblesse.

## Conventions à respecter dans les futurs lots

- **Pas de RLS ni de `user_id`** dans le code applicatif (l'app accède via le client de service, `createAdminClient()`, indépendamment du fait que RLS soit activé au niveau base — ne rien changer à ce mécanisme).
- **`revalidatePath("/courses")`** dans chaque nouvelle Server Action touchant `courses_items` (create/update/delete), comme le fait déjà chacune des trois actions existantes.
- **`set_updated_at()` et `set_termine_le()`** déjà en place sur `courses_items` (triggers `trg_courses_items_updated_at`/`trg_courses_items_termine_le`) : à réutiliser tels quels pour tout `UPDATE` (ex. renommage), **jamais** à recréer.
- **Fonctions pures** dans `src/lib/courses/compute.ts` (déjà le cas pour `grouperItemsCourses`) : y ajouter tout découpage/calcul (multi-ajout, progression x/y, dédoublonnage) sans effet de bord.
- **Migrations** sous `scripts/migration-<sujet>-YYYY-MM-DD.sql` + `-revert.sql` — nécessaires seulement si le lot « habituels » choisit un historique séparé (option (b)/(c) du constat #4) ; aucune autre recommandation de ce rapport n'en requiert.
- **Nouvelles actions offline** (renommage, vider les cochés, création multiple) à déclarer explicitement dans `ACTIONS.courses` de `src/lib/offline/queue.ts` si elles doivent fonctionner hors ligne — en gardant à l'esprit le constat #14 tant qu'il n'est pas corrigé (toute nouvelle action mise en file hérite du même risque de blocage permanent en cas d'erreur non réseau).

## Découpage proposé en lots

| Lot | Constats couverts | Contenu | Migration ? | Risques | Effort |
|---|---|---|---|---|---|
| **C. Fiabilité offline** | #13, #14, #15 | Corriger `flushQueue` (distinguer réseau/permanent via `isNetworkError`, continuer au lieu de `break`, notifier l'utilisateur) ; garde-fou local Courses (désactiver cocher/supprimer sur un id `temp-`) | Non | **Transverse à Tâches/Notes/Habitudes** — tout changement de `flushQueue` doit être revérifié sur les 4 modules, pas seulement Courses (pas de banc d'essai existant pour `queue.ts`, à créer ou au moins à tester manuellement) | S/M |
| **B. Magasin** (priorité produit 1) | #7, #8, #9, #10 | Suppression immédiate + toast Annuler (nouveau pattern, aucun équivalent à copier dans Kilio) ; renommage inline ; « Vider les cochés » ; compteur x/y + état positif « tout coché » | Non | Le pattern undo-toast est à concevoir from scratch (effort sous-estimé si traité comme un simple copier-coller d'un composant existant) ; le renommage doit être décliné dans `ACTIONS.courses` si l'on veut qu'il fonctionne hors ligne, en tenant compte de #14 | M |
| **A. Saisie** (priorité produit 2) | #1, #2, #3, #4, #5, #6 | Formulaire qui reste ouvert après ajout + toast succès ; ajout multiple (découpage virgule/lignes) ; avertissement de doublon (avec option de réactiver un archivé identique) ; « habituels » (décision de source à trancher par Vincent) ; `enterKeyHint` | Selon décision sur #4 (« habituels ») : **non** si fenêtre de 30 jours acceptée, **oui** si historique séparé retenu | Le multi-ajout et le doublon interagissent (un doublon détecté dans un lot collé doit être traité ligne par ligne, pas seulement au global) — à spécifier avant implémentation | M (L si migration « habituels ») |

### Ordre d'exécution recommandé : **C → B → A**

Le prompt de session demande explicitement si le lot C doit passer avant les autres parce qu'il touche la file globale : **oui, recommandé**, pour deux raisons techniques indépendantes de l'ordre de priorité produit énoncé par Vincent (magasin, puis saisie, puis fiabilité) :

1. Le bug #13/#14 est **déjà potentiellement actif aujourd'hui** sur l'installation réelle de Vincent (rien dans cet audit ne prouve qu'aucune action n'est bloquée en ce moment dans son IndexedDB — seule une inspection sur son appareil le confirmerait, hors de portée de cette session) et touche silencieusement Tâches/Notes/Habitudes, pas seulement Courses.
2. Tout ajout de nouvelle action offline dans les lots B (renommage, si mis en file) et A (création multiple) **hérite** de la fragilité de `flushQueue` tant qu'elle n'est pas corrigée — les livrer avant C ajouterait de la surface au problème plutôt que de la réduire.

Le lot C étant de petite taille (S/M) et sans dépendance sur B ou A, le traiter en premier ne retarde que peu le lot B (priorité produit n°1 de Vincent) — voir Questions ouvertes pour confirmation.

## Verdict — bug de file offline

**CONFIRMÉ.** Un article créé hors ligne (id optimiste `temp-<uuid>`) puis coché ou supprimé avant que sa création n'ait été synchronisée met en file une action `toggleCourseItem`/`deleteCourseItem` avec cet id `temp-`. Au rejeu, cette action échoue avec une erreur Postgres réelle et reproductible (`22P02: invalid input syntax for type uuid`, vérifiée par une requête `SELECT` en lecture seule sur la base réelle), et `flushQueue` — dont la boucle a été copiée à l'identique et exécutée dans un script isolé hors repo — s'arrête immédiatement (`catch { break; }`) sans discriminer cette erreur permanente d'une erreur réseau transitoire, bloquant **toute action suivante dans la file, y compris celles d'autres modules (Tâches, Notes, Habitudes)**, de façon persistante (chaque nouvelle tentative de `flushQueue` retombe sur la même action et échoue à nouveau) et **sans aucun retour visible pour l'utilisateur**. Aucune hypothèse de correctif n'est actée ici — les recommandations du lot C restent à valider par Vincent avant tout prompt d'implémentation.

## Questions ouvertes pour Vincent

1. **« Habituels » (#4)** : la fenêtre glissante de 30 jours du nettoyage automatique est-elle acceptable comme base d'un premier jet, ou souhaites-tu un historique dédié non purgé (implique une migration) ? Le réglage de délai (`/reglages`) est aujourd'hui global à 4 modules — veux-tu le garder ainsi si tu changes sa valeur pour raison Courses ?
2. **Doublons (#3)** : simple avertissement, blocage strict, ou réactivation automatique/proposée d'un archivé identique sans redemander confirmation ?
3. **Suppression (#7)** : confirmes-tu le remplacement du `window.confirm` par une suppression immédiate + toast « Annuler » ? C'est un pattern à concevoir (aucun équivalent existant dans Kilio), donc un effort réel, pas un simple ajustement.
4. **« Vider les cochés » (#9)** : suppression immédiate avec confirmation groupée, ou suppression immédiate + toast Annuler global (« 9 articles supprimés · Annuler ») ?
5. **Ordre d'exécution** : confirmes-tu de faire passer le lot C (fiabilité de la file partagée) avant B (magasin, ta priorité n°1 énoncée) et A, compte tenu du risque que le bug touche déjà silencieusement d'autres modules aujourd'hui ?
6. **Lot C, périmètre exact** : uniquement rendre `flushQueue` robuste aux erreurs permanentes (#14), ou aussi ajouter le garde-fou visuel côté Courses empêchant de cocher/supprimer un article encore `temp-` pendant sa synchronisation (#15) ? Les deux sont recommandés mais peuvent être scindés en deux prompts si tu préfères une revue plus incrémentale d'un correctif touchant une infrastructure partagée.

Toute hypothèse de diagnostic ci-dessus (notamment la plausibilité du scénario hors ligne en usage réel, constat #13) reste à valider par Vincent avant d'être actée dans un prompt de lot.

## Vérifications (Phase 3)

- `git status` : seul `reports/2026-09-19-audit-module-courses.md` ajouté (`??`), aucun autre fichier suivi modifié (`node_modules/`, `.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo` ignorés par `.gitignore`, non listés).
- `npx tsc --noEmit` (après `npm ci`, `node_modules` absent en début de session) : **une seule erreur**, `src/app/layout.tsx(41,56): error TS2304: Cannot find name 'LayoutProps'` — type généré par `next build`, déjà documenté comme préexistant et sans rapport avec ce périmètre dans les rapports précédents (dont l'audit Tâches du 2026-09-18). Consigné pour mémoire, non corrigé (hors périmètre de cette session).
- `npx eslint src` : ✅ aucune erreur, aucun avertissement.
- Script de reproduction du bug de file (`repro-flushqueue.mjs`) : écrit et exécuté uniquement dans le scratchpad de session (hors repo), aucune trace dans `git status`.
- Aucun secret ni clé dans ce rapport : l'identifiant de projet Supabase cité (`vsmtkopkqasrdnjceegp`) est un identifiant de projet, pas une clé d'API ; aucune clé, token ni URL de service n'a été inclus.
