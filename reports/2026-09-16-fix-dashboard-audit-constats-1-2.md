# Correctifs constats #1 et #2 de l'audit dashboard — 2026-09-16

Correction de 2 des 7 constats de `reports/2026-09-15-dashboard-audit.md`. Les constats #3 à #7 restent **ouverts et non traités** dans cette itération (voir rappel en fin de rapport).

## Fix 1 — Zone de tap `CheckToggle` (constat #1)

### Changement

`src/components/CheckToggle.tsx` : ajout d'une prop `hitSlop` (px) qui étend la zone de tap invisible au-delà du cercle visuel, via un `<span aria-hidden>` `position: absolute` (`inset: -hitSlop`) à l'intérieur du `<button>` désormais `position: relative`. Cette technique ne modifie pas la boîte du bouton dans le flux (un élément `absolute` est sorti du flux) : aucun `padding` réel, donc **aucun décalage de layout** dans les listes existantes — seul le cercle visuel (taille `size`, inchangée) reste dans le flux.

`hitSlop` par défaut = **11px** (cercle 22px par défaut → cible 44×44px, le minimum recommandé iOS/Material).

### Les 6 sites d'usage, espacement vertical relevé et décision retenue

Chaque liste a été inspectée pour l'espacement (`gap` Tailwind) entre deux `CheckToggle` consécutifs **dans une même carte**. Quand une checkbox est seule par carte (les cartes elles-mêmes séparées par du padding + un `gap` de liste), rien ne limite l'extension : le défaut (11px → 44×44) s'applique sans modification du site d'appel. Quand plusieurs checkboxes sont empilées dans une même carte avec un `gap` serré, un `hitSlop` réduit est passé explicitement, calculé pour que deux zones de tap voisines ne se touchent/chevauchent jamais (condition : `2 × hitSlop ≤ gap` entre les lignes, avec une petite marge de sécurité en plus).

| Site | Contexte d'empilement | `gap` relevé | `size` | `hitSlop` retenu | Cible tap résultante |
|---|---|---|---|---|---|
| `DashboardTaskItem.tsx` (carte "Aujourd'hui" du dashboard, via `DashboardTachesSection.tsx`) | plusieurs lignes dans **une seule** carte | `gap-2.5` (10px) | 22 | **4** | 30×30 |
| `ObjectifSuiviEtapes.tsx` | plusieurs `<li>` dans **une seule** carte | `gap-2` (8px) | 22 | **3** | 28×28 |
| `NoteForm.tsx` (`NoteItemsEditor`, édition d'une checklist existante) | plusieurs lignes dans **une seule** carte | `gap-1.5` (6px) | 20 | **2** | 24×24 |
| `NoteCard.tsx` (aperçu checklist sur la tuile) | plusieurs lignes dans **une seule** carte | `gap-1.5` (6px) | 18 | **2** | 22×22 |
| `TasksList.tsx` (`SousTachesList`, sous-tâches dépliées) | plusieurs `<li>` dans **une seule** carte, liste la plus dense | `gap-1` (4px) | 17 | **1** | 19×19 |
| `TasksList.tsx` (`TaskCard`, checkbox principale) et `CourseItemRow.tsx` | **une seule** checkbox par carte (`listCard`, padding 14px + `gap` de liste entre cartes) | large (checkbox isolée) | 22 | défaut (**11**) | **44×44** |

**Limite assumée** : sur les listes les plus denses (sous-tâches, items de note), l'espacement existant entre les lignes ne permet qu'un gain modeste (17→19px, 18/20→22/24px) sans risquer de faire chevaucher deux zones de tap voisines — exactement le compromis anticipé par la consigne ("réduire le débordement plutôt que laisser deux zones de tap se chevaucher"). Le dashboard lui-même (cible principale du constat #1) passe de 22×22 à 30×30 : une amélioration réelle (~36% de surface de tap en plus) mais qui ne rejoint pas le 44×44 idéal, faute de marge dans le `gap-2.5` existant. Agrandir ce `gap` irait au-delà du périmètre demandé (changement de layout, non requis ici) — à considérer comme piste séparée si Vincent souhaite aller plus loin.

Ces estimations reposent sur la lecture du code (classes Tailwind = valeurs px connues, hauteur de ligne dominée par la checkbox dans la quasi-totalité des cas) : elles n'ont **pas** été vérifiées pixel par pixel dans un navigateur réel (voir Phase 3 ci-dessous, pas de credentials Supabase disponibles dans cet environnement).

`aria-label`/`aria-pressed` existants non touchés, comme demandé.

## Fix 2 — Affordance carte "Aujourd'hui" (constat #2)

### Changement

`src/app/(app)/DashboardTachesSection.tsx` :
- Seule la **zone d'en-tête** ("Aujourd'hui" + compteur) est désormais enveloppée d'un `<Link href="/taches">` + `motion.div whileTap={{ scale: 0.98 }}` (même retour tactile que les cartes Nutrition et "Prochain événement"). La liste de tâches elle-même (qui contient déjà un `<button>` `CheckToggle` par ligne, via `DashboardTaskItem`) reste **en dehors** du `<Link>` — le piège explicitement signalé (bouton imbriqué dans un `<a>`) est évité : la carte englobante reste une `<div>` simple, seul l'en-tête est un lien.
- Nouveau calcul `tachesMasquees = tachesNonFaites.length - tachesAffichees.length` : quand des tâches du jour restent au-delà des 4 affichées, un badge **"+N"** apparaît dans l'en-tête, à côté du compteur `X/Y tâches`. Réutilise le token existant `kcalPillTag` (`src/lib/ui.ts`) — aucune nouvelle couleur ni nouveau rayon introduits, conforme à `DESIGN.md`.

### Comportement par cas (vérifié par lecture de code, voir Phase 3 pour les limites de test réel)

- **0 tâche du jour** : en-tête affiche "0/0 tâches", pas de badge (`tachesMasquees = 0 - 0 = 0`), message "Rien de prévu aujourd'hui." inchangé. L'en-tête reste cliquable (mène à `/taches`, comportement cohérent même si la liste du jour est vide).
- **1 à 4 tâches non faites** : toutes affichées (`tachesAffichees = tachesNonFaites`), `tachesMasquees = 0` → pas de badge.
- **5 tâches non faites ou plus** : `tachesAffichees` reste plafonné à 4 (`slice(0, 4)`, inchangé), `tachesMasquees = tachesNonFaites.length - 4 > 0` → badge "+N" visible.

## Phase 3 — Vérification

- `npx tsc --noEmit` : ✅ aucune erreur (après `npm run build`, nécessaire une première fois pour générer les types Next.js `LayoutProps`, absents avant tout build — non lié à ce chantier, déjà noté dans les rapports précédents).
- `npx eslint .` : ✅ aucune erreur ni avertissement.
- `npm run build` (`next build`, Turbopack) : ✅ compilation + type-check + génération des 24 routes réussies, y compris `/` (dashboard) et les 5 autres écrans touchés (objectifs, notes, tâches, courses).
- **Test manuel dans un navigateur (`next dev`) : non effectué.** Comme dans les rapports précédents (`2026-09-06-dashboard-taches-disparition.md`, `2026-09-15-view-transitions-budget-dashboard.md`), aucune variable d'environnement Supabase (`.env.local` absent) n'est disponible dans cet environnement d'exécution distant : impossible de lancer `next dev` contre des données réelles pour observer/cliquer dans l'UI. La vérification s'appuie sur :
  - la relecture attentive du JSX produit pour les deux fixes (structure DOM, imbrication `<button>`/`<a>`, calculs `tachesMasquees`) ;
  - le calcul d'espacement par site d'usage documenté ci-dessus ;
  - build + lint + typecheck verts sur l'ensemble du projet, pas seulement les fichiers touchés.

  **Recommandation** : un passage manuel en usage réel (staging/prod `kilio`) reste la validation definitive des points suivants, non vérifiables ici :
  1. Cocher/décocher une tâche depuis le dashboard, puis depuis `/taches`, `/objectifs/[id]`, une note (carte et formulaire d'édition) et `/courses` — confirmer qu'aucune interaction n'est cassée ni visuellement décalée dans aucune de ces 6 listes (le composant partagé `CheckToggle` étant touché, une régression toucherait potentiellement les 6 en même temps).
  2. Taper sur l'en-tête "Aujourd'hui" du dashboard → doit naviguer vers `/taches` avec le retour tactile (`scale 0.98`).
  3. Taper sur une case à cocher dans cette même carte → doit **uniquement** cocher la tâche, sans déclencher la navigation vers `/taches`.
  4. Affichage du badge "+N" avec 0, 1–4, puis 5+ tâches du jour (peut nécessiter de créer des tâches de test).
  5. Sur les listes les plus denses (sous-tâches, items de note), confirmer visuellement qu'aucun tap ne "déborde" perceptiblement sur la ligne voisine malgré le `hitSlop` réduit.

## Constats non traités dans cette itération

Les constats **#3 à #7** de `reports/2026-09-15-dashboard-audit.md` (habitude "quantifiée" sans retour visuel, reliquat de layout météo/`ThemeToggle`, tailles de police sous 10px, décalage skeleton "Aujourd'hui", absence de lien sur la section Habitudes) restent **ouverts**, hors périmètre de cette tâche.
