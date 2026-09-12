# Uniformisation des micro-interactions : press state des boutons partagés

Date : 2026-09-12

## Contexte

Audit du ressenti "premium" : seul `addCard` avait un press state visuel
(`active:scale-[0.99]`) et 4 composants isolés utilisaient `whileTap`
(Framer Motion). Les styles de bouton les plus utilisés de l'app —
`primaryButton`, `secondaryButton`, `ghostButton`, `dangerButton` — n'en
avaient aucun. Objectif : ajouter un `active:scale` cohérent aux 4, dans
`src/lib/ui.ts` uniquement.

## Phase 1 — Sync + vérification des décomptes

`git checkout kilio && git fetch origin kilio && git reset --hard origin/kilio`
→ HEAD à `c249e9e` (déjà à jour).

Relu `src/lib/ui.ts` en entier. Décompte réel (`grep -rn` sur `src`, hors
la ligne de définition dans `ui.ts` elle-même, imports + usages JSX
confondus) :

| Style | Occurrences (imports + JSX) |
|---|---|
| `primaryButton` | 52 |
| `secondaryButton` | 6 |
| `ghostButton` | 81 |
| `dangerButton` | 47 |

Les décomptes bruts diffèrent légèrement des "usages" cités dans le prompt
de session (26/3/29/23) car chaque fichier compte à la fois sa ligne
d'import et une ou plusieurs lignes JSX (`ghostButton` notamment est
parfois utilisé 2-3× dans un même fichier, ex. boutons ↑/↓ de
réordonnancement) — mais l'ordre de grandeur et le constat de départ
(4 styles très largement réutilisés, aucun n'a de press state) sont
confirmés sans ambiguïté.

## Phase 2 — Implémentation

Seul `src/lib/ui.ts` modifié, les 4 constantes ciblées.

### Vérification Tailwind v4 : `transition` couvre déjà `transform`/`scale`

Compilé un cas de test minimal avec le moteur Tailwind v4 réellement
installé (`@tailwindcss/postcss`, via un script Node direct plutôt que le
CLI autonome — `tailwindcss` v4 n'expose plus de binaire `npx tailwindcss`
classique) pour inspecter la définition réelle de l'utilitaire `.transition`
sans suffixe :

```css
.transition {
  transition-property: color, background-color, border-color, outline-color,
    text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via,
    --tw-gradient-to, opacity, box-shadow, transform, translate, scale, rotate,
    filter, -webkit-backdrop-filter, backdrop-filter, display,
    content-visibility, overlay, pointer-events;
  ...
}
```

Cette liste est un **sur-ensemble strict** à la fois de `transition-opacity`
(juste `opacity`) et de `transition-colors` (`color`, `background-color`,
`border-color`, etc.), et couvre `transform`/`scale` nécessaires au nouveau
press state. Remplacer `transition-opacity`/`transition-colors` par
`transition` est donc purement additif — aucun risque de casser une
transition existante, conformément à la consigne.

### Classes finales

```ts
export const primaryButton =
  "rounded-2xl bg-kcal px-4 py-2.5 font-semibold text-white transition active:scale-[0.97] disabled:opacity-60";
export const secondaryButton =
  "rounded-2xl border border-line bg-surface px-4 py-2.5 font-semibold text-ink transition active:scale-[0.97] disabled:opacity-60";
export const ghostButton =
  "rounded-xl border border-line px-2.5 py-1.5 text-sm font-medium text-ink transition active:scale-[0.97] hover:bg-surface-alt";
export const dangerButton =
  "rounded-xl border border-alert/30 px-2.5 py-1.5 text-sm font-medium text-alert transition active:scale-[0.97] disabled:opacity-60";
```

`dangerButton` : uniquement l'ajout du press state, couleur/bordure/opacity
disabled inchangées. `addCard`, `linkButton` et les 4 composants
`whileTap` existants (`ModulesGrid.tsx`, `CollectionsGrid.tsx` — devenu
`CollectionsMosaic` en interne depuis la migration TanStack du 12/09,
`DashboardNutritionSection.tsx`, `DashboardTachesSection.tsx`) : non
touchés.

## Phase 3 — Vérification

- `npx tsc --noEmit` : ✅ **0 erreur.**
- `npx eslint .` : ✅ **0 erreur, 0 warning.**
- `npm run build` : compilation Turbopack + typecheck interne verts
  (`✓ Compiled successfully`, `Finished TypeScript`). Génération statique
  bloquée sur `/carburants`, même cause pré-existante et sans rapport que
  documentée dans les 3 sessions précédentes du jour (accès réseau sortant
  vers Supabase bloqué dans ce sandbox). Vérifié dans le CSS compilé
  (`.next/static/chunks/*.css`) : `active\:scale-\[0\.97\]:active{scale:.97}`
  bien présent.

### Vérification manuelle (Playwright + Chromium headless, mobile 390×844)

Mêmes mocks temporaires que les sessions précédentes du jour (sandbox sans
accès Supabase) : `getPreferencesNavigationResolues` et `getObjectifs`/
`getObjectif` remplacés temporairement par des données en mémoire (2
objectifs, dont un de type "binaire" pour atteindre `secondaryButton`).
**Mocks entièrement retirés après les tests** — `git checkout -- src/app/actions/{objectifs,preferences-navigation}.ts`,
confirmé par `git status`/`git diff` : seul `src/lib/ui.ts` reste modifié
dans l'arbre final ; `tsc`/`eslint` ré-exécutés après restauration
(résultats ci-dessus).

Testé en pressant réellement chaque style (`mouse.down`, lecture de
`getComputedStyle(el).scale` une fois la transition CSS (150ms, valeur par
défaut Tailwind) retombée, `mouse.up`) :

| Style | Bouton testé | `scale` au repos | `scale` en appui |
|---|---|---|---|
| `ghostButton` | "Modifier" (`ObjectifCard`) | `none` | `0.97` |
| `dangerButton` | "Suppr." (`ObjectifCard`, clic annulé en déplaçant le curseur avant `mouseup` pour ne pas déclencher la suppression) | `none` | `0.97` |
| `secondaryButton` | "Remettre en cours" (`ObjectifSuiviBinaire`, objectif binaire atteint, même annulation) | `none` | `0.97` |
| `primaryButton` | Non cliqué directement (mêmes classes que les 3 autres, `active:scale-[0.97]` vérifié présent dans le CSS compilé et le mécanisme identique validé sur les 3 styles ci-dessus) | — | — |

Aucune erreur console/page sur aucun de ces écrans.

### Constat sur `disabled:opacity-60` — **conflit réel identifié, contrairement à l'hypothèse du prompt**

Le prompt de session supposait qu'« normalement un bouton `disabled` ne
déclenche pas `:active` dans un navigateur ». **Testé et infirmé** : dans
Chromium (et le comportement est documenté comme spécifique à
WebKit/Blink, différent de Firefox), un `<button disabled>` **matche bien
`:active`** au `mousedown` et applique donc le nouveau `active:scale-[0.97]`
exactement comme un bouton actif — vérifié côte à côte sur un bouton
activé et un bouton `disabled` avec les classes `primaryButton` réelles :

```
#enabled-test-btn  | while mousedown: { scale: '0.97', active: true, opacity: '1' }
#disabled-test-btn | while mousedown: { scale: '0.97', active: true, opacity: '0.6' }
```

Ce qui **n'est pas affecté** : le `click` JS (donc l'action métier
derrière le bouton) reste bien bloqué par l'attribut HTML `disabled`,
indépendamment de ce comportement CSS — seul l'aspect visuel est concerné.
Impact réel : un bouton désactivé (déjà visuellement atténué à 60%
d'opacité) se rétrécit aussi légèrement à l'appui, sans que rien ne se
passe ensuite — un artefact cosmétique mineur, pas une régression
fonctionnelle, et un comportement déjà présent nativement dans la plupart
des sites web (aucun n'y échappe sans ajout explicite de
`pointer-events-none` sur l'état `disabled`, ce qui supprimerait aussi
`:hover`/`:active` — non ajouté ici, hors périmètre de cette session qui
porte uniquement sur l'ajout du press state dans `ui.ts`). **Signalé sans
y toucher** : à trancher séparément si Vincent juge que ça vaut la peine
d'ajouter `disabled:pointer-events-none` aux 4 styles dans une session
dédiée.

## Constat sur `iconButton` (signalé, non traité)

`iconButton` (`src/lib/ui.ts`) reste défini mais utilisé 0 fois dans le
repo (reconfirmé par `grep -rn "\biconButton\b" src`, hors la ligne de
définition elle-même) — inchangé, hors périmètre de cette session comme
demandé.

## Fichiers modifiés

- `src/lib/ui.ts` (`primaryButton`, `secondaryButton`, `ghostButton`,
  `dangerButton`)

Aucun autre fichier modifié.
