# Audit click-path — 2026-09-25

Skill utilisé : `.claude/skills/click-path-audit/SKILL.md` (installé en scope-projet dans ce même run, même logique que `frontend-design-direction` et `make-interfaces-feel-better` — voir commit "Ajoute le skill scope-projet click-path-audit"). Step 1 adaptée à l'architecture Kilio (ni Zustand ni Redux) : un seul Context partagé (`NavigationEditContext`) + le mécanisme Server Actions/`useActionState`/`revalidatePath` traité comme l'équivalent d'un store avec effets de bord.

## Total

| Sévérité | Trouvés | Corrigés (Phase 2) | Documentés seulement |
|---|---|---|---|
| CRITICAL | 3 | **3** | 0 |
| HIGH | 10 | **8** | 2 (ambigus — décision produit requise) |
| MEDIUM | 14 | 0 | 14 |
| LOW | 9 | 0 | 9 |
| **Total** | **36** | **11** | **25** |

Corrigés uniquement les bugs CRITICAL/HIGH dont le fix ne tranchait aucune question produit, conformément à la consigne. Les 2 HIGH non corrigés (CLICK-PATH-204, CLICK-PATH-401) et 1 finding classé MEDIUM/HIGH par son agent (CLICK-PATH-703) sont explicitement marqués « AMBIGUOUS — needs product decision » par l'agent qui les a trouvés : proposition de fix incluse, non appliquée.

---

## Cartographie d'état adaptée (Agent 1)

Kilio n'utilise ni Zustand ni Redux. L'état partagé côté client tient dans **un seul React Context** (mode édition de la navigation) + le mécanisme **Server Actions + revalidatePath**, traité comme le "store avec effets de bord" au sens du skill.

### STORE : NavigationEditContext (`src/lib/navigation/NavigationEditContext.tsx`)

État possédé par le provider : `ordreGrillePlus`, `modulesBarreBasse`, `isEditingRaw` (brut), `isEditing` (dérivé), `activeHref`.

```
setOrdreGrillePlus(next) [interne, appelé depuis handleDragEnd]
  → sets: {ordreGrillePlus}
  → déclenche aussi updateOrdreGrillePlus(next) (Server Action) ; en cas
    d'échec, ROLLBACK vers `previous` + toast. RACE : un second drag avant
    la résolution du premier peut être écrasé par le rollback du premier
    (Async Race — aucune sérialisation/annulation de requête à l'origine).

setModulesBarreBasse(next) [interne, appelé depuis handleDragEnd]
  → sets: {modulesBarreBasse}
  → même pattern optimiste-puis-rollback, même risque de race (deux drops
    de slot BottomNav rapprochés).
  → NOTE : ce même état pilote aussi l'effet de prefetch (ligne 74-78) —
    pas un "reset" mais un effet de bord latent à connaître.

handleDragStart(event) → sets: {isEditingRaw: true, activeHref}
handleDragCancel() → sets: {activeHref: null} — NE reset PAS isEditingRaw
  (le mode édition reste actif après un drag annulé — a priori
  intentionnel, cf. CLICK-PATH-104).
handleDragEnd(event) → sets: {activeHref: null} inconditionnellement, PUIS
  conditionnellement modulesBarreBasse OU ordreGrillePlus.
exitEditing() [bouton "Terminé" / tap dehors / retour Android]
  → sets: {isEditingRaw: false} — ne touche pas activeHref/ordres (correct).

isEditing (dérivé) = isEditingRaw && pathname === "/plus". Quitter /plus
  sans passer par exitEditing() laisse isEditingRaw à `true` en mémoire —
  au retour sur /plus, le mode édition se réactive sans appui long
  (CLICK-PATH-103).
```

**DANGEROUS RESETS** : aucun setter ne reset un champ possédé par un autre setter (pas de pattern `selectThread`-style ici, ce Context est petit et propre). Le vrai risque n'est pas les resets croisés mais les **races optimiste-vs-échec-serveur** sur `ordreGrillePlus`/`modulesBarreBasse`, et le **`isEditingRaw` périmé** qui survit à un changement de pathname.

### SERVER ACTIONS / revalidatePath — carte complète (23 fichiers)

Chaque Server Action mute via Supabase puis appelle `revalidatePath(...)`, invalidant le Router Cache Next.js pour ces chemins — ce qui peut écraser un état local optimiste pas encore réconcilié, exactement l'équivalent du pattern "Async Race"/"useEffect Interference" du skill dans un contexte Server Actions. Points instrumentés spécifiquement par agent (détail complet dans chaque section ci-dessous) :

- `preferences-navigation.ts` : `updateModulesBarreBasse` fait le `revalidatePath("/", "layout")` le plus large de l'app — c'est le pendant serveur du rollback `NavigationEditContext`.
- `taches.ts` : `/taches`, `/agenda`, `/`, `/taches/listes` coexistent ; `reordonnerListes`/`createListe`/`updateListe` ne revalidaient pas `/taches/listes` (CLICK-PATH-301/302).
- `journal.ts` : `removeJournalEntry` ne revalidait pas `/` contrairement à `addJournalEntry` (CLICK-PATH-202).
- `habitudes.ts` : aucune des 4 fonctions ne revalide `/` (CLICK-PATH-305, impact atténué par le cache TanStack Query partagé).
- `objectifs.ts` : le module est passé côté client à TanStack Query — `revalidatePath` n'a donc plus aucun effet sur `/objectifs` ni `/objectifs/[id]` (CLICK-PATH-501, deux clés de cache disjointes).
- `courses.ts`, `collections.ts`, `notes.ts` : ces trois modules pilotent leur état réel via TanStack Query (`onMutate`/`onError`/`onSettled`), `revalidatePath` n'y sert qu'au Router Cache pour la navigation dure.
- `documents.ts`, `recettes.ts` : `deleteDocument`/`deleteRecette` finissent par un `redirect()` après le `revalidatePath` — piège classique Next.js si l'appelant les enveloppe dans un try/catch générique (CLICK-PATH-201/701, corrigé de façon centrale dans `runAction.ts` + les deux call sites directs).

### CUSTOM HOOKS PAR MODULE

- **agenda** : `useAgendaZoom` (pinch-to-zoom partagé WeekView/DayView, `localStorage` + `useSyncExternalStore`, cross-tab) ; `useInitialScroll` (local, TimeGrid).
- **taches** : `useTaskDragSensors` (local, config dnd-kit).
- **nutrition** : `useAjoutRepasTermine` (invalidation + toast au succès d'un ajout, `AjoutRepasBouton.tsx`).
- **courses** : pas de hook dédié — la logique partagée vit dans le cache TanStack Query (`queryKeys.courses`) + `src/app/(app)/courses/undo.ts` (fonction impérative découplée du cycle de vie du composant, pour que "Annuler" survive à un unmount).
- **budget, collection, documents, habitudes, objectifs, notes, plus, réglages, carburants** : aucun hook `useXxx` dédié — état local dupliqué par composant.

### PURE `compute.ts` PAR MODULE

`agenda`, `budget`, `carburants`, `courses`, `nutrition`, `taches` ont chacun un `src/lib/<module>/compute.ts`. Le plus à risque a priori (`src/lib/courses/compute.ts`, `trierCommeServeur`, consommé par 4 endroits différents pour réconcilier l'ordre optimiste et l'ordre serveur) a été audité en détail par l'agent Agenda+Courses et **confirmé correct et cohérent partout** — ce n'est pas la source du bug réel de ce module (voir CLICK-PATH-401/402). Pas de `compute.ts` dans `collection`, `documents`, `habitudes`, `objectifs`, `notes`, `plus`, `réglages`.

---

## Findings par module

Légende : ✅ **Corrigé** (Phase 2) · 📋 **Documenté seulement** (MEDIUM/LOW, ou HIGH marqué ambigu par l'agent qui l'a trouvé — décision produit nécessaire).

### Agent 2 — Nav (BottomNav, ModulesGrid, /plus, NavigationEditContext)

**CLICK-PATH-101 — ✅ CORRIGÉ — [CRITICAL] — Async Race (rollback écrase un état plus récent)**
- Touchpoint : drag-reorder/drag-to-pin sur `/plus` — `handleDragEnd`, `NavigationEditContext.tsx:140-174`.
- Trace : drag A échoue après que drag B a déjà réussi → le `.catch()` de A revient inconditionnellement à l'état d'avant A, effaçant le changement de B, avec un toast qui ne parle que de l'échec de A.
- Expected : l'échec d'un drag ne doit jamais annuler un drag plus récent et réussi.
- Actual : rollback aveugle vers le snapshot "avant" du drag qui a échoué, sans corrélation avec ce qui s'est passé depuis.
- Fix appliqué : rollback fonctionnel (`setX((current) => (current === next ? previous : current))`) + sérialisation des appels serveur par champ (voir CLICK-PATH-102) dans `NavigationEditContext.tsx`.

**CLICK-PATH-102 — ✅ CORRIGÉ — [HIGH] — Race sur revalidatePath/updateTag (silencieuse)**
- Touchpoint : même zone que 101, drag A plus lent, drag B plus rapide.
- Trace : la requête de A (plus ancienne) peut écrire en base APRÈS celle de B (plus récente) qui a réussi en premier → la BDD garde l'ordre le plus ancien, sans erreur visible côté client.
- Expected : le dernier drag effectué par l'utilisateur doit être celui qui persiste.
- Actual : "dernière réponse réseau gagne" au lieu de "dernière action utilisateur gagne".
- Fix appliqué : chaînage (`ordreGrillePlusChainRef`/`modulesBarreBasseChainRef`) qui sérialise les appels serveur par champ — un drag n'envoie sa requête qu'une fois celle du drag précédent réglée, garantissant l'ordre d'écriture.

**CLICK-PATH-103 — 📋 [MEDIUM] — Missing State Transition (isEditingRaw jamais reset au changement de pathname)**
- Touchpoint : activation clavier (Tab + Entrée/Espace) d'un lien BottomNav pendant l'édition sur `/plus`.
- Trace : le tap souris/tactile reset `isEditingRaw` par effet de bord accidentel (listener `pointerdown`) ; l'activation clavier ne déclenche jamais ce `pointerdown` → `isEditingRaw` reste `true`, et revenir sur `/plus` réactive le mode édition sans appui long.
- Fix proposé (non appliqué, MEDIUM) : `useEffect(() => { if (pathname !== "/plus") setIsEditingRaw(false); }, [pathname])`.

**CLICK-PATH-104 — 📋 [LOW — ambigu] — Drag annulé laisse le mode édition actif**
- Fix proposé : option A (ne rien changer, documenter l'intention) ou option B (`setIsEditingRaw(false)` dans `handleDragCancel`) — décision produit.

### Agent 3 — Nutrition (journal + recettes)

**CLICK-PATH-201 — ✅ CORRIGÉ — [CRITICAL] — redirect() avalé par un try/catch générique**
- Touchpoint : "Suppr." (supprimer une recette), `RecetteHeader.tsx`.
- Trace : `deleteRecette` supprime la ligne, appelle `revalidatePath`, puis `redirect()` — qui lève un signal `NEXT_REDIRECT` devant remonter jusqu'au framework. Le `try/catch` générique du bouton l'intercepte et affiche "Erreur inconnue.".
- Actual : la recette EST supprimée en base, mais l'utilisateur reste bloqué sur une page de détail périmée avec un message d'échec qui est l'inverse de la réalité.
- Fix appliqué : rethrow explicite des erreurs de redirection (`isRedirectError`) avant de construire le message d'erreur, dans `RecetteHeader.tsx`.

**CLICK-PATH-202 — ✅ CORRIGÉ — [HIGH] — Invalidation manquante après suppression d'un repas**
- Touchpoint : "Suppr." dans `JournalEntriesList.tsx`.
- Trace : `removeJournalEntry` ne revalide que `/nutrition/journal`, contrairement à `addJournalEntry` qui invalide aussi `queryKeys.catalogueJournal`/`["resume-nutrition"]` côté client (via `useAjoutRepasTermine`) — la suppression, elle, n'invalidait rien côté TanStack Query.
- Actual : la carte nutrition du dashboard et le catalogue "Récents" continuent de compter le repas supprimé jusqu'à 30s.
- Fix appliqué : `JournalEntriesList.tsx` invalide `queryKeys.catalogueJournal` et `["resume-nutrition"]` après un `removeJournalEntry` réussi, symétrique au chemin d'ajout.

**CLICK-PATH-203 — ✅ CORRIGÉ — [HIGH] — Cache dashboard non invalidé après édition d'un objectif nutritionnel**
- Touchpoint : "Enregistrer l'objectif", `ObjectifForm.tsx` (nutrition/journal).
- Trace : `upsertObjectif` ne revalide que `/nutrition/journal` ; rien n'invalide `queryKeys.resumeNutrition` côté client (contrairement à `JourTypeBascule` qui le fait explicitement pour son propre setter).
- Fix appliqué : `useEffect` sur la transition pending→succès (même pattern que `RecetteForm`) qui invalide `["resume-nutrition"]`.

**CLICK-PATH-204 — 📋 [HIGH — ambigu] — Stale Closure entre les onglets Repos/Entraînement et le formulaire objectif**
- Touchpoint : `ObjectifForm.tsx` + `JourTypeBascule.tsx`.
- Trace : `ObjectifForm` n'est jamais remonté au changement d'onglet (pas de `key` sur `jourType`) — changer d'onglet pendant une édition en cours peut soumettre les valeurs saisies pour "Repos" sous `jour_type: "entrainement"`.
- Fix proposé (non appliqué — décision produit) : (a) clé `ObjectifForm` par `jourType` pour forcer un remount à chaque changement d'onglet (option recommandée par l'agent), ou (b) désactiver les onglets pendant l'édition.

**CLICK-PATH-205 — 📋 [MEDIUM] — Race sur `ordre` lors d'ajouts rapides d'ingrédients/étapes**
- Fix proposé : calculer `ordre` côté serveur (max+1) au lieu de faire confiance à `ingredients.length` côté client.

**CLICK-PATH-206 — 📋 [LOW — non-bug]** : les 4 formulaires concurrents de la page recette (flaggés par Agent 1) ne se clobber pas entre eux — vérifié, sans danger.

### Agent 4 — Tâches + Habitudes

**CLICK-PATH-301 — ✅ CORRIGÉ — [HIGH] — `reordonnerListes` revalide le mauvais chemin**
- Touchpoint : "↑"/"↓" sur `/taches/listes` (`ListesManager.tsx`).
- Trace : `reordonnerListes` ne revalide que `/taches` ; `/taches/listes` (la page réellement affichée, un Server Component sans refetch client) n'est jamais revalidée — contrairement à `deleteListe`, qui revalide les deux.
- Actual : l'écriture en base réussit, mais l'ordre visible ne bouge pas tant que l'utilisateur ne recharge pas.
- Fix appliqué : ajout de `revalidatePath("/taches/listes")` dans `reordonnerListes` (`src/app/actions/taches.ts`).

**CLICK-PATH-302 — 📋 [MEDIUM] — Même défaut sur `createListe`/`updateListe`** (non corrigé, hors scope CRITICAL/HIGH).

**CLICK-PATH-303/304 — 📋 [MEDIUM]** : drag-reorder de tâches sans `cancelQueries` préalable (flash possible) ; échec partiel de `enregistrerOrdreTaches` sans rollback complet (ambigu — RPC atomique vs. retry ciblé).

**CLICK-PATH-305 — 📋 [LOW]** : `habitudes.ts` ne revalide jamais `/` — impact réel atténué par le cache TanStack Query partagé entre dashboard et `/habitudes`.

**CLICK-PATH-306 — 📋 [LOW — ambigu]** : input de valeur d'habitude jamais resynchronisé si le cache change pendant l'édition.

> Correction au Step 1 : contrairement à ce que la cartographie de l'Agent 1 (grep automatique) laissait supposer, `enregistrerOrdreTaches` REVALIDE bien (`revalidateTachesPaths()`, ligne 531) — faux négatif du grep initial, confirmé par lecture directe du code par l'Agent 4.

### Agent 5 — Agenda + Courses

**CLICK-PATH-401 — 📋 [HIGH — ambigu] — Invalidation non coordonnée entre mutations Courses**
- Touchpoint : toggle/suppr./renommage/"Vider les cochés" pendant qu'un "Ajouter" est en vol.
- Trace : chaque mutation du module invalide `queryKeys.courses` sans condition dans `onSettled`, sauf `AddCourseForm` qui a son propre garde-fou `isMutating`. Un toggle déclenché pendant un ajout peut faire disparaître temporairement l'article `temp-` en cours d'ajout.
- Fix proposé (non appliqué — l'agent le marque explicitement ambigu sur la sémantique exacte du seuil de garde) : étendre le garde `isMutating` à toutes les mutations du module, ou centraliser en un "coordinateur de settle" pour `queryKeys.courses`.

**CLICK-PATH-402 — 📋 [MEDIUM]** : même risque sur le "Annuler" (undo) de suppression d'article — fenêtre plus étroite, auto-corrigée.

**CLICK-PATH-403 — 📋 [MEDIUM] — Race pinch-to-zoom (`useAgendaZoom`)**
- `onTouchEnd` ne annule pas le `requestAnimationFrame` en attente de `onTouchMove`, pouvant persister en `localStorage` une valeur de zoom en retard d'une frame.

**CLICK-PATH-404 — 📋 [LOW — ambigu]** : `ajouterExceptionPlanningTravail` n'a aucun point d'entrée UI (écrit uniquement par un skill externe) — intentionnel ou touchpoint manquant, à trancher.

> Vérifié et écarté : `trierCommeServeur` (`src/lib/courses/compute.ts`) n'est PAS la source d'un bug — comparateur cohérent avec l'ordre serveur réel sur les 4 consommateurs.

### Agent 6 — Budget + Objectifs

**CLICK-PATH-501 — ✅ CORRIGÉ — [HIGH] — Caches TanStack Query disjoints entre liste et détail d'objectif**
- Touchpoint : changer le statut/titre d'un objectif depuis sa page détail (`ObjectifHeader`, `ObjectifSuiviBinaire`) ou depuis la carte liste (`ObjectifCard`).
- Trace : `/objectifs` (liste) et `/objectifs/[id]` (détail) lisent deux clés TanStack Query disjointes (`objectifs` / `objectif(id)`) — `revalidatePath` côté Server Action n'a plus aucun effet depuis la migration en lecture client-side ; chaque composant n'invalidait que SA propre clé.
- Actual : éditer depuis le détail puis revenir à la liste (moins de 30s) montre l'objectif sous son ancien groupe de statut / ancien titre, et inversement.
- Fix appliqué : `ObjectifHeader.tsx`, `ObjectifCard.tsx` et `ObjectifSuiviBinaire.tsx` invalident désormais les deux clés (`queryKeys.objectif(id)` ET `queryKeys.objectifs`) à chaque mutation réussie.

**CLICK-PATH-502 — 📋 [MEDIUM — ambigu]** : deux contrôles de statut indépendants (`ObjectifHeader` + `ObjectifSuiviBinaire`) pour le même champ sur un objectif "binaire", sans état pending partagé — décision produit (masquer l'un ou fusionner la mutation).

**CLICK-PATH-503 — 📋 [MEDIUM — ambigu]** : changer l'onglet Dépense/Revenu/Virement en cours d'édition transforme silencieusement l'édition en création (perte des valeurs pré-remplies) — décision produit.

**CLICK-PATH-504 — 📋 [LOW]** : `confirmerSuppression` (ComptesList) est le seul handler de suppression du module non enveloppé dans `startTransition` — incohérence de style, pas de bug confirmé.

### Agent 7 — Collection + Notes

(Deux répertoires `collection` distincts : `src/app/collection/**` = flux Web Share Target uniquement, hors navigation in-app ; `src/app/(app)/collection/**` = module Collection réel accessible via la barre du bas.)

**CLICK-PATH-601 — ✅ CORRIGÉ — [HIGH] — "Réessayer" après échec partiel re-uploade tout depuis zéro**
- Touchpoint : bouton "Réessayer" dans `PhotosPartageesEnAttente.tsx` (flux de partage natif).
- Trace : si le lot 2/3 échoue, les URLs du lot 1 (déjà uploadées) sont perdues et le cache n'est jamais vidé (`oublierFichiersEnAttente` n'est appelé qu'après succès complet) → un "Réessayer" relit et ré-uploade TOUS les fichiers, y compris ceux déjà réussis, sous de nouvelles URLs.
- Actual : fuite de stockage (objets orphelins) + doublons potentiels proposés à l'écran de choix de collection.
- Fix appliqué : suivi des lots déjà réussis (`lotsReussisRef`/`urlsAcquisesRef`, persistants entre les essais) — un "Réessayer" ne renvoie que les lots restants au lieu de tout redemander.

**CLICK-PATH-602 — 📋 [MEDIUM]** : la checkbox de checklist se comporte différemment (optimiste sur la carte, non-optimiste dans le formulaire d'édition) — incohérence UX, non bloquante.

**CLICK-PATH-603 — 📋 [MEDIUM — ambigu]** : rollback `onError` sur TOUT le cache `queryKeys.notes` peut effacer transitoirement une mutation sœur indépendante réussie — décision produit sur le scope du rollback.

**CLICK-PATH-604 — 📋 [MEDIUM]** : renommage de collection sans `useBackClose` — le bouton retour quitte la page au lieu de fermer juste le formulaire de renommage (incohérent avec `NoteCard`/`AddCollectionToggle`).

**CLICK-PATH-605/606/607 — 📋 [LOW]** : erreur "lien vidéo" persistante hors formulaire ; bouton "Ajouter" du partage non désactivé sans sélection ; lightbox affichant un item déjà supprimé ailleurs.

### Agent 8 — Réglages + Carburants + Documents

**CLICK-PATH-701 — ✅ CORRIGÉ — [CRITICAL] — Même piège redirect() que CLICK-PATH-201, sur la suppression de document**
- Touchpoint : "Suppr." sur un document (`DocumentDetail.tsx`, `DocumentCard.tsx` via `runAction`).
- Trace : `deleteDocument` supprime réellement, revalide, puis `redirect()` — avalé par le try/catch générique des deux call sites.
- Fix appliqué : rethrow des erreurs de redirection dans `runAction.ts` (fix central, bénéficie à tous les consommateurs de ce helper, dont `DocumentCard.tsx`) et dans `DocumentDetail.tsx` (appel direct hors `runAction`).

**CLICK-PATH-702 — ✅ CORRIGÉ — [HIGH] — Étiquette éditée affiche l'ancien nom après un enregistrement réussi**
- Touchpoint : "Enregistrer" sur une ligne d'étiquette (`EtiquettesManager.tsx`).
- Trace : `updateEtiquette` réussit et revalide, mais l'arbre déjà monté ne se re-render jamais depuis cette revalidation (pas de `router.refresh()`) — le mode affichage lisait `etiquette.nom` (la prop d'origine) au lieu de l'état local `nom` déjà confirmé enregistré.
- Fix appliqué : le mode affichage lit désormais l'état local `nom`/`typeChamps` (déjà synchronisé avec ce qui vient d'être enregistré) au lieu de la prop périmée.

**CLICK-PATH-703 — 📋 [MEDIUM/HIGH — ambigu]** : changer le type d'étiquette en cours de sélection de fichiers (Documents) démonte/remonte l'`<input>` de fichiers, désynchronisant l'état "fichiers sélectionnés" affiché de ce qui sera réellement soumis — silencieux en édition. 3 options proposées par l'agent, aucune tranchée.

**CLICK-PATH-704 — ✅ CORRIGÉ — [HIGH] — Rollback incomplet du délai de nettoyage automatique**
- Touchpoint : champ "délai en jours", `NettoyageAutoRow.tsx`.
- Trace : en cas d'échec de `updateReglagesNettoyage`, seul `actif` est remis à sa valeur précédente — `delaiJours` (le champ que l'utilisateur vient de modifier) ne l'est jamais, contredisant le contrat documenté dans le code lui-même ("l'interrupteur reprend sa position précédente").
- Fix appliqué : `persister` reçoit et applique désormais aussi un rollback de `delaiJours` sur échec.

**CLICK-PATH-705 — 📋 [MEDIUM — ambigu]** : abonnement/désabonnement aux notifications push en deux étapes non atomiques (navigateur puis serveur) — un échec partiel peut désynchroniser l'état affiché de l'état réel côté serveur. Options de compensation proposées, non tranchées.

---

## Phase 3 — Vérification

- **`next typegen` puis `tsc --noEmit`** : ✅ propre (aucune erreur). Le typage `LayoutProps` de `src/app/layout.tsx` nécessite `next typegen` au préalable (génération de routes typées Next.js 16) — non lié aux changements de cet audit.
- **ESLint (`eslint .`)** : ✅ propre après correction d'un import `queryKeys` devenu inutile dans `ObjectifForm.tsx` (0 erreur, 0 warning).
- **`next build`** : ⚠️ n'a pas pu être vérifié jusqu'au bout dans ce conteneur — **aucune variable d'environnement Supabase n'est configurée** ici (`SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` absentes, pas de `.env*` dans le repo). Le build échoue dès la première page qui prérend via `createAdminClient()` (`/nutrition/recettes`, `/budget/comptes`, etc.) avec `Error: supabaseKey is required`. C'est une limite d'environnement de cette session, pas un bug de code : impossible dans ces conditions de confirmer isolément si l'échec `/budget/comptes` (`supabaseKey is required`) signalé par l'audit navigation précédent est toujours présent spécifiquement à cette page — tout le build échoue pour la même cause racine dès qu'une page tente un appel serveur. `tsc`/`ESLint`, qui ne dépendent pas de ces credentials, valident que le code lui-même est correct.

### Dette signalée

Pas d'infrastructure de tests dans le repo (vérifié : aucun test runner configuré), donc pas de tests de non-régression ajoutés pour les 11 bugs corrigés — comme pour l'audit navigation précédent. Avec 3 CRITICAL + 8 HIGH corrigés dans cette passe (dont deux occurrences indépendantes du même piège `redirect()`-avalé-par-try/catch, dans deux modules différents), ça commence à peser : au minimum un test e2e couvrant "supprimer une recette/un document depuis sa page détail redirige bien" éviterait une régression future sur ce pattern spécifiquement récurrent.
