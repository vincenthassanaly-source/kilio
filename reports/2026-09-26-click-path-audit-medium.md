# Audit click-path — suite (bugs MEDIUM) — 2026-09-26

Suite de `reports/2026-09-25-click-path-audit.md` (36 bugs trouvés, 11 CRITICAL/HIGH corrigés le 25/09). Cette passe traite les **14 bugs MEDIUM** restants selon la même règle que la Phase 2 précédente : corriger ceux dont le fix ne tranche aucune question produit, documenter (sans corriger) ceux qui en dépendent.

## Total de cette passe

| | Nb |
|---|---|
| MEDIUM trouvés (audit du 25/09) | 14 |
| **Corrigés dans cette passe** | **8** |
| Restent documentés (ambigus — décision produit) | 6 |

## Corrigés

**CLICK-PATH-103** (Nav, `NavigationEditContext.tsx`) — `isEditingRaw` reste `true` en mémoire quand on quitte `/plus` sans passer par `exitEditing()` (ex. activation clavier d'un lien BottomNav, qui ne déclenche pas le `pointerdown` déjà géré). Fix : effet keyé sur `pathname` qui reset `isEditingRaw` à `false` en quittant `/plus`. Implémenté avec un `setTimeout(…, 0)` à l'intérieur de l'effet plutôt qu'un `setState` synchrone dans le corps de l'effet — la config ESLint de ce repo (règle `react-hooks/set-state-in-effect`) interdit un `setState` direct et synchrone dans un effet, et interdit aussi la variante alternative recommandée par React (ajuster l'état pendant le rendu via une ref, règle `react-hooks/refs`) ; le report au tick suivant est le seul chemin qui satisfait les deux règles sans réintroduire le bug (largement assez rapide pour que l'utilisateur n'ait pas eu le temps de revenir sur `/plus` entre-temps).

**CLICK-PATH-205** (Nutrition, `recette-ingredients-libres.ts` + `recette-etapes.ts`) — `ordre` calculé côté client (`ingredients.length`/`etapes.length`) pouvait produire deux lignes avec le même `ordre` lors d'ajouts rapprochés, les props du parent n'ayant pas eu le temps de se rafraîchir. Fix : `ordre` calculé côté serveur (`max(ordre) + 1` sur la recette) dans `addIngredientLibre` et `addEtape` ; le champ caché `ordre` et la prop `nextOrdre` correspondants, devenus inutiles, ont été retirés de `IngredientsLibresManager.tsx`/`EtapesManager.tsx`.

**CLICK-PATH-302** (Tâches, `taches.ts`) — `createListe`/`updateListe` ne revalidaient que `/taches`, jamais `/taches/listes` (la page réellement affichée par ce formulaire, un Server Component sans refetch client) — même défaut que `reordonnerListes` déjà corrigé le 25/09. Fix : ajout de `revalidatePath("/taches/listes")` aux deux fonctions.

**CLICK-PATH-303** (Tâches, `TasksList.tsx`) — le drag-reorder de tâches écrivait l'état optimiste sans `cancelQueries` préalable (contrairement à `toggleMutation`/`deleteMutation` dans le même fichier), et n'invalidait qu'en cas d'échec — une mutation concurrente sans rapport pouvait faire retomber la liste sur l'ordre pré-drag. Fix : `handleDragEnd` passé en async, `cancelQueries` avant l'écriture optimiste, et `invalidateQueries` dans un `finally` (succès et échec), pas seulement dans le `catch`.

**CLICK-PATH-403** (Agenda, `useAgendaZoom.ts`) — `onTouchEnd` ne annulait pas le `requestAnimationFrame` en attente de `onTouchMove`, pouvant persister en `localStorage` une valeur de zoom en retard d'une frame par rapport au pincement réellement relâché. Fix : `onTouchEnd` annule le rAF en attente et utilise sa valeur (`pendingZoomRef`) pour la persistance si elle existe, au lieu de lire `zoomRef.current` qui pouvait être périmé.

**CLICK-PATH-602** (Notes, `NoteForm.tsx`) — la checkbox de checklist dans le formulaire d'édition d'une note n'avait aucune mise à jour optimiste (contrairement à la même checkbox sur la tuile `NoteCard`), donnant une sensation de lenteur/incohérence. Fix : `NoteItemsEditor` a désormais son propre `useMutation` avec `onMutate`/`onError`/`onSettled`, même pattern que `NoteCard.itemMutation`.

**CLICK-PATH-603** (Notes, `NoteCard.tsx`) — le rollback `onError` de `pinMutation`/`itemMutation` restaurait tout le tableau `queryKeys.notes` depuis un snapshot pris avant la mutation, pouvant effacer une mutation sœur indépendante déjà appliquée entre-temps (ex. un item coché sur une autre note pendant qu'un pin échoue). Fix : snapshot et rollback réduits au seul champ concerné (`epingle` de cette note, `coche` de cet item), sur le modèle du fix déjà appliqué à `NavigationEditContext` (CLICK-PATH-101) le 25/09 — un rollback ne touche plus que ce qu'il a lui-même changé.

**CLICK-PATH-604** (Collection, `CollectionHeader.tsx`) — le formulaire de renommage inline n'était pas relié à `useBackClose` (contrairement à `NoteCard`/`AddCollectionToggle` dans le même module) : le bouton/geste retour quittait la page au lieu de fermer juste le formulaire, perdant silencieusement la saisie en cours. Fix : ajout de `useBackClose(editing, () => setEditing(false))`.

## Restent documentés (ambigus — décision produit nécessaire)

Aucun changement sur ces 6, toujours documentés avec trace complète et proposition de fix dans `reports/2026-09-25-click-path-audit.md` :

- **CLICK-PATH-304** (Tâches) — échec partiel de `enregistrerOrdreTaches` sans rollback complet : RPC atomique vs. retry ciblé des seules tâches en échec.
- **CLICK-PATH-402** (Courses) — le "Annuler" de suppression partage la même cause racine que CLICK-PATH-401 (HIGH, également documenté seulement) : invalidation `queryKeys.courses` non coordonnée entre mutations du module. Traiter 402 sans re-trancher 401 aurait laissé une correction à moitié cohérente ; les deux attendent la même décision d'architecture (garde `isMutating` étendue à tout le module, ou coordinateur de settle centralisé).
- **CLICK-PATH-502** (Budget/Objectifs) — deux contrôles de statut indépendants pour le même champ sur un objectif "binaire" : masquer l'un ou fusionner la mutation.
- **CLICK-PATH-503** (Budget) — changer l'onglet Dépense/Revenu/Virement en cours d'édition transforme silencieusement l'édition en création : désactiver les onglets en édition, ou rendre le changement de type explicite (confirmation + suppression de l'original).
- **CLICK-PATH-703** (Documents) — changer le type d'étiquette en cours de sélection de fichiers désynchronise l'état affiché de ce qui sera réellement soumis : 3 options proposées (vider la sélection au changement de type, bloquer/avertir, ou state File[] partagé entre les deux branches).
- **CLICK-PATH-705** (Réglages) — abonnement/désabonnement notifications push en deux étapes non atomiques (navigateur/serveur) : rollback compensatoire vs. vérification serveur au montage.

## Vérification

- `tsc --noEmit` : ✅ propre.
- `eslint .` : ✅ propre (a nécessité d'ajuster le fix CLICK-PATH-103, voir ci-dessus — la première version violait `react-hooks/set-state-in-effect`).
- `next build` : compilation + vérification TypeScript ✅ ; échoue ensuite au prérendu pour la même raison que le 25/09 (aucune variable d'environnement Supabase configurée dans ce conteneur) — non lié à ce lot de changements.

## Dette de tests

Toujours aucune infrastructure de tests dans le repo. 8 bugs supplémentaires corrigés dans cette passe (19 au total avec le 25/09) sans tests de non-régression — la dette mentionnée le 25/09 continue de grossir.
