# Morph View Transitions : Objectifs, Recettes, Documents

Date : 2026-09-12

## Contexte

Extension du morph nommé (View Transitions API) posé sur Collection le
2026-09-06 (`reports/2026-09-06-morph-collection-carte-detail.md`) à 3
écrans liste → détail supplémentaires : Objectifs, Recettes, Documents.
Reprend le pattern à l'identique, sans y toucher.

## Phase 1 — Sync + relecture

`git checkout kilio && git fetch origin kilio && git reset --hard origin/kilio`
→ HEAD à `10845dc` (migration TanStack Query du jour même, déjà à jour).

Relu en entier le rapport du 06/09, `CollectionsGrid.tsx`,
`CollectionMosaic.tsx`, `PhotosGrid.tsx`, `CollectionHeader.tsx`, la règle
`::view-transition-group(*)` dans `globals.css` (normale + bloc
`prefers-reduced-motion`), puis les 6 fichiers cibles (carte + détail) des
3 modules.

**Constat important** : depuis la migration TanStack Query du jour même
(`10845dc`), Collection/Objectifs utilisent déjà `TransitionLink`
directement (plus le wrapper `onClick` manuel décrit dans le rapport du
06/09 — `TransitionLink` l'a depuis intégré nativement). **Aucun changement
de navigation nécessaire** dans aucun des 3 modules : les 6 fichiers cibles
utilisent déjà `TransitionLink` pour leurs liens carte↔détail. Seuls les
`style={{ viewTransitionName }}` ont été ajoutés, conformément au périmètre.

États d'édition inline vérifiés dans chaque carte/header (comme demandé,
même vigilance que pour `CollectionHeader.tsx`) :
- `ObjectifCard.tsx`/`ObjectifHeader.tsx` : branche `editing` retourne tôt
  et remplace tout le contenu par `ObjectifForm` — le titre ciblé n'existe
  que dans la branche non-`editing`, aucun risque de double-pose du nom.
- `RecetteHeader.tsx`/`RecettesList.tsx` : même structure (`RecetteForm` en
  édition), le titre carte (`RecettesList`) n'a pas de mode édition inline.
- `DocumentCard.tsx`/`DocumentDetail.tsx` : même structure (`DocumentForm`
  en édition).

## Noms posés par module

### 1. Objectifs (titre seul)
- `ObjectifCard.tsx` : `style={{ viewTransitionName: `objectif-title-${objectif.id}` }}` sur le `<p className={nameText}>`.
- `ObjectifHeader.tsx` : même nom sur le `<h1>`, branche non-`editing`.

### 2. Recettes (titre seul)
- `RecettesList.tsx` : `style={{ viewTransitionName: `recette-title-${recette.id}` }}` sur le `<p className={nameText}>`.
- `RecetteHeader.tsx` : même nom sur le `<h1>`, branche non-`editing`.

### 3. Documents (titre + vignette image conditionnelle)
- `DocumentCard.tsx` : `document-title-${document.id}` sur le `<p className={nameText}>` ; `document-cover-${document.id}` sur l'`<img>` de l'aperçu, **uniquement** dans la branche `apercu && apercu.fichier_type === "image"` — jamais sur le lien PDF générique (icône), jamais quand `apercu` est `null`.
- `DocumentDetail.tsx` : mêmes noms, sur le `<h1>` (branche non-`editing`) et sur l'`<img>` du **premier** fichier de la liste (`fichiers[index === 0]`) uniquement s'il est de type `"image"`.

Cohérence de l'index vérifiée en lisant `src/app/actions/documents.ts` :
`getDocuments` (liste) et `getDocument` (détail) trient toutes deux
`document_fichiers` par le même `order("ordre", { referencedTable:
"document_fichiers", ascending: true })` — l'élément d'index 0 désigne donc
la même pièce jointe des deux côtés, comme vérifié pour Collection le
06/09.

## Aucun changement CSS

Conformément à la consigne, `globals.css` n'a pas été touché : la règle
`::view-transition-group(*)` existante (220ms + variante
`prefers-reduced-motion`) est générique et couvre automatiquement les 6
nouveaux noms sans modification. Vérifié après build que la règle est bien
présente, à l'identique, dans le CSS compilé (`.next/static/chunks/*.css`)
— aucun piège de commentaire `*/` introduit (aucun commentaire CSS ajouté
du tout dans cette session).

## Phase 3 — Vérification

- `npx tsc --noEmit` : ✅ **0 erreur.**
- `npx eslint .` : ✅ **0 erreur, 0 warning.**
- `npm run build` : compilation Turbopack + typecheck interne verts
  (`✓ Compiled successfully`, `Finished TypeScript`), aucun warning CSS. La
  génération statique échoue toujours sur `/carburants`, même cause exacte
  que documentée dans les deux sessions précédentes du jour
  (`reports/2026-09-12-verification-fix-rls-nutrition.md`,
  `reports/2026-09-12-tanstack-query-objectifs-collection-agenda.md`) —
  accès réseau sortant vers Supabase bloqué dans ce sandbox, sans rapport
  avec cette session (aucun fichier de données touché ici).
- Règle `::view-transition-group(*)` confirmée présente et intacte (220ms +
  variante reduced-motion) dans `.next/static/chunks/*.css` après build.

### Vérification manuelle (Playwright + Chromium headless, mobile 390×844)

Mêmes mocks temporaires que le 06/09, le sandbox n'ayant toujours pas
d'accès réseau à Supabase (`Host not in allowlist`) : `getObjectifs`/
`getObjectif` (`src/app/actions/objectifs.ts`), `getDocuments`/
`getDocument`/`getEtiquettes` (`src/app/actions/documents.ts`) et
`getPreferencesNavigationResolues` (`src/app/actions/preferences-navigation.ts`,
partagé par toutes les routes de `(app)`) remplacés par des données en
mémoire (2 objectifs — étapes et binaire atteint —, 2 documents — un avec
aperçu image locale `public/icons/icon-512.png`, un avec un fichier PDF
sans image). **Mocks entièrement retirés après les tests** via
`git checkout -- src/app/actions/{documents,objectifs,preferences-navigation}.ts` —
`git status`/`git diff` confirment que seuls les 6 fichiers de morph listés
ci-dessus restent modifiés dans l'arbre final ; `tsc`/`eslint`/`build`
ré-exécutés après restauration (résultats ci-dessus) pour confirmer que
rien n'a été oublié.

Résultats (`reducedMotion: 'no-preference'` puis `'reduce'`, aucune
différence de comportement fonctionnel entre les deux, comme attendu) :
- **Objectifs** : `view-transition-name` cohérent entre la carte
  (`objectif-title-test-1`) et le `<h1>` du détail après clic — vérifié
  pour un objectif de type "étapes" et un de type "binaire" (`atteint`).
  Retour arrière fonctionnel. Aucune erreur console/page.
- **Documents, cas avec image** (`doc-1`) : `document-cover-doc-1` +
  `document-title-doc-1` cohérents entre carte et détail (sur le premier
  fichier). Aucune erreur.
- **Documents, cas sans image** (`doc-2`, un PDF) : **aucun** `<img>` sur
  la carte ni sur le détail (0 dans les deux cas) — le nom de couverture
  n'est jamais posé, conformément au garde-fou. Le titre garde son nom
  (`document-title-doc-2`) des deux côtés. Aucune erreur.
- Retour arrière (`‹ Documents`) fonctionnel dans les deux sens.
- **Recettes non testé dynamiquement** (voir "Écart" ci-dessous).

## Écart par rapport au périmètre

**Recettes non vérifié par Playwright**, contrairement à Objectifs et
Documents. `nutrition/recettes/page.tsx` et `.../[id]/page.tsx` appellent
`createAdminClient()` et construisent leurs requêtes Supabase **directement
dans le composant de page** (pas via une fonction dédiée dans un fichier
`actions/*.ts` comme pour Objectifs/Documents/Collection) : les mocker
proprement aurait nécessité soit un stub générique du client Supabase
chaîné (`.from().select().order()...`, risque d'erreur de fidélité plus
élevé pour un test censé rester temporaire et strictement réversible), soit
une restructuration temporaire de la page elle-même — les deux allant
au-delà d'un mock ponctuel de fonction comme fait pour les 2 autres
modules. Le changement apporté à Recettes est cependant **structurellement
identique, ligne pour ligne**, au patron déjà vérifié dynamiquement sur
Objectifs (`style={{ viewTransitionName }}` sur un `<p>`/`<h1>` texte
seul, aucune logique conditionnelle) : `tsc`/`eslint`/`build` verts plus
cette identité structurelle donnent une confiance raisonnable, mais **la
vérification manuelle réelle (clic carte → détail sur `/nutrition/recettes`)
reste à faire par Vincent en usage normal** — signalé plutôt que tranché
silencieusement.

## Fichiers modifiés

- `src/app/(app)/objectifs/ObjectifCard.tsx`
- `src/app/(app)/objectifs/[id]/ObjectifHeader.tsx`
- `src/app/(app)/nutrition/recettes/RecettesList.tsx`
- `src/app/(app)/nutrition/recettes/[id]/RecetteHeader.tsx`
- `src/app/(app)/documents/DocumentCard.tsx`
- `src/app/(app)/documents/[id]/DocumentDetail.tsx`

Aucun autre fichier modifié : `TransitionLink.tsx`,
`useViewTransitionNavigate.ts`, `globals.css` et toute logique de
navigation existante sont restés intacts, conformément à la consigne.
