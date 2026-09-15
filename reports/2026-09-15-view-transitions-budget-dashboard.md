# View Transitions — budget comptes/catégories + dashboard

Date : 2026-09-15
Branche : `claude/budget-view-transitions-d80lvv` (base `kilio`)

## Résumé en une phrase

Point 2 (morph dashboard → module) et point 3 (cross-fade Suspense du dashboard, via le vrai composant `<ViewTransition>` de React) sont implémentés comme demandé ; le point 1 (morph comptes/catégories → détail) est **volontairement non implémenté** — comptes et catégories n'ont ni route détail ni panneau/modal, seulement un formulaire d'édition en place dans la liste, donc aucune cible de morph n'existe (voir Écart n°1 ci-dessous, comme anticipé par la consigne).

---

## Vérification préalable de l'environnement

`node_modules` n'était pas installé (`npm install` exécuté en premier). Une fois installé :
- `react` (racine, 19.2.8) n'exporte **pas** `ViewTransition` — normal, c'est une version stable.
- Next.js 16.3.3 vendorise en interne (`node_modules/next/dist/compiled/react/`) un build React qui, lui, l'exporte (confirmé par `grep ViewTransition node_modules/next/dist/compiled/react/cjs/*.js`) — c'est ce build qui est résolu par le bundler App Router derrière `import { ViewTransition } from "react"`. Conforme à ce qu'indique `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` et au skill `vercel-react-view-transitions` : pas besoin d'installer `react@canary`.

## Écart n°1 (majeur, anticipé par la consigne) — Comptes/catégories n'ont pas de cible de morph

Exploré : `src/app/(app)/budget/comptes/ComptesList.tsx`, `AddCompteToggle.tsx`, `src/app/(app)/budget/categories/CategoriesList.tsx`.

Constat : ni les comptes ni les catégories n'ont de route `[id]` détail, ni de panneau/modal séparé. `ComptesList.tsx` bascule chaque `<li>` entre affichage et `<AddCompteForm>` **en place**, via un simple `useState(editing)` local, sans navigation ni Suspense ni `startTransition` — donc même en y posant un `viewTransitionName`, l'échange ne serait jamais capturé par une View Transition (« Regular `setState` calls do not trigger them », cf. skill `vercel-react-view-transitions`). Idem pour les lignes de `CategoriesList.tsx`.

Le pattern `ObjectifCard`/`ObjectifHeader` demandé comme référence repose sur une vraie navigation `TransitionLink` vers `/objectifs/[id]`, portée par `useViewTransitionNavigate`/`document.startViewTransition`. Rien d'équivalent n'existe pour comptes/catégories : pas de route à forcer (la consigne l'interdit explicitement), pas de panneau/modal à adapter non plus (il n'y en a pas — juste un remplacement de contenu inline).

**Décision : point 1 non implémenté.** Créer une route détail ou un panneau pour l'occasion aurait été une nouvelle fonctionnalité UI hors du périmètre d'une tâche de view transitions, et la consigne demandait explicitement de remonter ce cas plutôt que d'improviser.

---

## Implémenté

### Point 2 — Morph dashboard → module (Nutrition / Tâches / Habitudes)

Même mécanisme que `objectif-title-${id}` : `style={{ viewTransitionName }}` posé en clair (pas le composant `<ViewTransition>` de React) sur l'élément visuel principal de chaque côté, capturé par le `document.startViewTransition` déjà géré par `useViewTransitionNavigate` — logique de cette dernière non touchée.

| Module | Nom | Dashboard (source) | Page module (cible) |
|---|---|---|---|
| Nutrition | `nutrition-titre-dashboard` | `DashboardNutritionSection.tsx`, span « Nutrition » | `nutrition/page.tsx`, `<h1>` |
| Habitudes | `habitudes-titre-dashboard` | `DashboardHabitudesSection.tsx`, span « Habitudes » | `habitudes/page.tsx`, `<h1>` |
| Tâches | `taches-titre-dashboard` | `DashboardTachesSection.tsx`, span « Aujourd'hui » | `taches/page.tsx`, `<h1>` « Tâches » |

**Écart n°2 (mineur)** — Pour Nutrition et Habitudes, le texte de la carte dashboard correspond exactement au titre de la page cible (« Nutrition » → « Nutrition »). Pour Tâches, la carte dashboard n'affiche nulle part le mot « Tâches » : sa première carte s'intitule « Aujourd'hui » (tâches du jour), et sa seconde « Prochain événement » (le seul élément réellement cliquable vers `/taches`, via `Link`, pas `TransitionLink`). Aucune icône de module n'est présente non plus, ni côté dashboard ni côté page `/taches` (juste un `<h1>` texte). Faute de meilleur candidat, le nom a été posé sur le titre de section « Aujourd'hui » (le plus proche de « l'élément visuel principal » demandé), en gardant la convention `<module>-titre-dashboard`. Le morph fonctionne techniquement (le nom est présent dans le DOM « avant » quelle que soit la carte cliquée, l'API View Transitions ne l'exige pas dans le lien lui-même) mais anime un changement de texte « Aujourd'hui » → « Tâches », pas une continuité de contenu identique — à surveiller si le rendu visuel paraît moins net que sur Nutrition/Habitudes.

### Point 3 — Cross-fade Suspense du dashboard

`src/app/(app)/DashboardView.tsx` : chaque `<Suspense>` (Nutrition/Tâches/Habitudes) enrobe maintenant son fallback ET son contenu réel chacun dans un `<ViewTransition>` (composant React, cette fois), suivant le pattern « Directional reveal » du guide Next.js / skill `vercel-react-view-transitions`, adapté en simple fondu :

```tsx
<Suspense fallback={<ViewTransition exit="dashboard-reveal-exit" default="none"><CardSkeleton /></ViewTransition>}>
  <ViewTransition enter="dashboard-reveal-enter" default="none">
    <DashboardNutritionCard today={today} />
  </ViewTransition>
</Suspense>
```

- `default="none"` des deux côtés : évite que ce fondu se rejoue sur une transition sans rapport (ex. le slide racine posé par `useViewTransitionNavigate` lors d'une navigation vers `/`).
- Chaque `<ViewTransition>` est bien le premier enfant direct de `<Suspense>` (côté fallback) ou racine du fragment (côté contenu) — aucun `<div>` intercalé, donc `enter`/`exit` s'activent (règle de placement du skill).
- CSS ajoutée dans `globals.css` : `::view-transition-old(.dashboard-reveal-exit)` / `::view-transition-new(.dashboard-reveal-enter)`, timing asymétrique (sortie 150ms, entrée 210ms décalée de 150ms) cohérent avec `kilio-fondu-sortie`/`kilio-fondu-entree` déjà en place pour le slide racine. Entrée dans le bloc `@media (prefers-reduced-motion: reduce)` existant (duration 0.01ms).

**Note technique** — `TachesCardsSkeleton` (fallback) et `DashboardTachesSection` (contenu réel) retournent chacun un `Fragment` avec deux nœuds DOM racine (deux cartes). Le `<ViewTransition>` les enrobe globalement (un seul enfant JSX — le Fragment — passé à chaque `<ViewTransition>`), ce qui n'est explicitement documenté nulle part dans le skill (les exemples n'utilisent qu'un enfant unique), mais rien n'indique que ce soit interdit ; `tsc`/build passent sans erreur. Si le rendu réel s'avère décevant (ex. une seule des deux cartes anime), il faudrait scinder en deux `<Suspense>`/`<ViewTransition>` séparés — non fait ici faute de pouvoir tester visuellement (voir Phase 3 ci-dessous).

Ce mécanisme est indépendant de `useViewTransitionNavigate` : ce hook ne couvre que les clics `TransitionLink`/navigation programmatique, pas la résolution d'un `<Suspense>` pendant le streaming RSC du chargement initial du dashboard. Pas de risque de double `document.startViewTransition` : le composant `<ViewTransition>` de React ne l'appelle que lorsqu'une vraie Transition (ici, la résolution Suspense) est en cours — comportement géré nativement par React, non modifié.

---

## Phase 3 — Vérification

- `npx tsc --noEmit` : ✅ aucune erreur (après `npm run build`, nécessaire une première fois pour générer les types Next.js `LayoutProps` etc., absents avant tout build — sans rapport avec ce chantier).
- `npm run lint` (ESLint) : ✅ aucune erreur.
- `npm run build` (`next build`, Turbopack) : ✅ compile, type-check et génère les 24 routes sans erreur.
- **Test manuel dans un navigateur : non fait.** L'app nécessite une session Supabase authentifiée (`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` etc.) pour rendre le dashboard et les pages budget ; aucune credential n'est disponible dans cet environnement. Parcours à vérifier manuellement une fois déployé :
  1. **Dashboard → module** : depuis l'accueil, taper la carte Nutrition (ring de progression) — le titre « Nutrition » doit glisser/morph en douceur vers le `<h1>` de `/nutrition`. Idem pour Habitudes. Pour Tâches, taper la carte « Prochain événement » et observer si le morph « Aujourd'hui » → « Tâches » (textes différents) reste lisible ou paraît décousu (voir Écart n°2).
  2. **Chargement initial du dashboard** : recharger `/` à froid (cache vidé) en throttlant le réseau — les trois skeletons doivent céder la place à leur contenu par un fondu doux (~150–210ms), pas un pop instantané ; vérifier notamment que les deux cartes du bloc Tâches (Aujourd'hui + Prochain événement) apparaissent bien ensemble.
  3. **Réduction de mouvement** : activer « Réduire les animations » (OS) et revérifier les parcours 1 et 2 — aucune animation ne doit être perceptible (durée quasi nulle), contenu affiché instantanément.
  4. **Comptes/catégories** (point 1 non traité) : confirmer visuellement qu'aucune régression n'a été introduite — le clic « Modifier » doit toujours simplement remplacer la carte par le formulaire, sans tentative de morph ratée.

---

## Fichiers modifiés

- `src/app/(app)/DashboardView.tsx`
- `src/app/(app)/DashboardNutritionSection.tsx`
- `src/app/(app)/DashboardTachesSection.tsx`
- `src/app/(app)/DashboardHabitudesSection.tsx`
- `src/app/(app)/nutrition/page.tsx`
- `src/app/(app)/taches/page.tsx`
- `src/app/(app)/habitudes/page.tsx`
- `src/app/globals.css`

Aucun fichier du module `budget/comptes` ou `budget/categories` modifié (point 1 non implémenté, voir Écart n°1).
