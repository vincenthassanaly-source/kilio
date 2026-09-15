# Polish visuel du module Réglages (skill `impeccable`, mode `polish`)

Passe de design pure sur `/reglages` : hiérarchie visuelle, icônes cohérentes avec le reste de l'app, espacement, états interactifs (hover/pressed/focus) et accessibilité. **Aucun contenu, prop, action serveur ou logique n'a changé** — les 5 réglages existants (Apparence, Notifications, Nettoyage auto, Profil, Version) restent les 5 seules lignes de l'écran.

## Fichiers modifiés

- `src/app/(app)/reglages/page.tsx`
- `src/app/(app)/reglages/AppearanceRow.tsx`
- `src/app/(app)/reglages/NotificationsRow.tsx`
- `src/app/(app)/reglages/NettoyageAutoRow.tsx`
- `src/app/(app)/reglages/loading.tsx`

## Avant

Une seule carte (`rounded-[22px] border border-line bg-surface`) contenant les 5 lignes à plat, séparées par des `border-t`, sans icône ni regroupement — texte seul, alignement `justify-between`. Les boutons/toggles n'avaient ni `focus-visible`, ni `aria-label`, ni retour tactile (`active:scale`) dédié.

## Après

### 1. Hiérarchie et regroupement logique

Les 5 lignes sont réparties en deux groupes visuels (deux cartes distinctes précédées d'un `<h2 className={sectionTitle}>`), reprenant le motif déjà utilisé dans `CategoriesList.tsx` et `budget/page.tsx` :

- **Préférences** : Apparence, Notifications, Nettoyage automatique — les réglages actionnables.
- **À propos** : Profil, Version — les informations statiques.

Le conteneur racine passe de `gap-4` à `gap-5` (rythme "grandes sections d'écran" de `DESIGN.md`).

### 2. Icônes de ligne

Chaque ligne reçoit une icône SVG inline (viewBox 24×24, `strokeWidth={1.8}`, `strokeLinecap/Linejoin="round"`) au même standard que celles du registre de navigation (`src/lib/navigation/registry.ts`) et du hub Nutrition (`src/app/(app)/nutrition/page.tsx`) :

- **Préférences** (lignes actionnables) : icône dans une pastille `h-8 w-8 rounded-xl`, fond `color-mix(in oklch, var(--accent-kcal) 12%, transparent)`, trait `var(--accent-kcal)` — même recette que les tuiles de `ModulesGrid`/le hub Nutrition (« The One Accent Rule » : le vert Kcal reste la seule couleur "interactive").
  - Apparence : icône lune (croissant).
  - Notifications : icône cloche.
  - Nettoyage automatique : icône corbeille (littérale, cohérente avec l'action de suppression des items faits).
- **À propos** (lignes non actionnables) : icône simple `text-ink-3`, sans pastille teintée, pour marquer visuellement qu'il ne s'agit pas d'un réglage cliquable.
  - Profil : icône silhouette.
  - Version : icône info (cercle + `i`).

### 3. États interactifs

- Bouton Apparence (`Clair`/`Sombre`) : ajout de `transition active:scale-[0.97]`, `hover:bg-line` et l'anneau `focus-visible:ring-2 ring-kcal ring-offset-2` (`DESIGN.md` → Buttons : jamais `focus:` seul).
- Toggles Notifications / Nettoyage automatique : ajout du même anneau `focus-visible`, plus `aria-label` explicite (`Activer les notifications` / `Activer le nettoyage automatique`) — ces boutons n'avaient jusqu'ici qu'un `aria-pressed`, sans nom accessible propre puisque leur libellé visuel est un `<span>` frère, non lié par `aria-labelledby`.
- Retrait de l'indentation `pl-[42px]` initialement testée pour la ligne "Supprimer les items faits après (jours)" : elle cassait la ligne sur mobile (390px) — le regroupement dans le même bloc `flex-col` sous le toggle suffit à signaler la hiérarchie sans réduire la largeur disponible.

### 4. Skeleton (`loading.tsx`)

Réécrit pour refléter la nouvelle structure à deux groupes (3 lignes puis 2 lignes), chaque ligne simulant désormais la pastille d'icône (`h-8 w-8 rounded-xl`) en plus du libellé et de la valeur.

## Tokens `DESIGN.md` réutilisés (aucun nouveau token introduit)

- Couleurs : `--accent-kcal` (icônes + pastilles des réglages actionnables, focus ring), `--line` (hover du bouton Apparence), `ink` / `ink-2` / `ink-3` (textes, icônes info).
- Rayons : `rounded-xl` (12px, pastille d'icône — bracket "boutons icône" de `DESIGN.md#Shapes`), `rounded-[22px]` (cartes, inchangé).
- Typo : `sectionTitle` (titres de groupe), classes body existantes inchangées.
- Composants : anneau de focus `focus-visible:ring-2 ring-kcal ring-offset-2` (`DESIGN.md#Buttons`), pastille d'icône teintée à 12 % (`color-mix(in oklch, var(--accent-kcal) 12%, transparent)`) déjà utilisée dans `ModulesGrid.tsx` et le hub Nutrition.

## Vérification

- `npx tsc --noEmit` : aucune erreur introduite (une seule erreur pré-existante, sans rapport, dans `src/app/layout.tsx:41` — `LayoutProps` non généré avant `next build`, confirmée en dehors du diff de cette tâche).
- `npx eslint .` : aucun avertissement.
- `npm run build` : build de production réussi, les 30 routes (dont `/reglages`) compilent normalement.
- Vérification visuelle : les identifiants Supabase ne sont pas configurés dans cet environnement d'exécution (pas de `.env`), donc `/reglages` ne peut pas être chargée en conditions réelles ici (l'action serveur `getReglagesNettoyage` échoue sur `supabaseKey is required`). Pour valider le rendu malgré tout, une route de prévisualisation temporaire (`src/app/qa-preview-reglages/`, hors du groupe `(app)` pour éviter l'appel Supabase du layout partagé) a été créée avec des données factices respectant le type `Tables<"reglages_nettoyage">`, testée via `next dev` + Playwright (captures mobile 390px clair/sombre et desktop), puis **supprimée avant la fin de la tâche** — elle ne fait partie d'aucun commit.
  - Rendu confirmé conforme en clair et sombre, mobile et desktop (pastilles d'icônes lisibles, regroupement clair, alignement stable).
  - Interactions rejouées via clics/clavier : bascule du thème (`Clair` ↔ `Sombre`), toggle Notifications, toggle Nettoyage automatique (masque/affiche bien le champ délai selon l'état), anneau de focus visible au tab — toutes fonctionnent à l'identique d'avant la passe, aucune fonctionnalité modifiée.

## Confirmation

Aucune section, aucun réglage, aucune fonctionnalité n'a été ajouté ou retiré. Les props, hooks et actions serveur de `AppearanceRow`, `NotificationsRow` et `NettoyageAutoRow` sont inchangés — seul leur markup/habillage visuel a été modifié.
