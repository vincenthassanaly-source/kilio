# Carburants — pull-to-refresh natif casse le tri (toggle + ordre incohérents)

## Phase 1 — Diagnostic : hypothèse partiellement contredite par le repo

### Ce qui est confirmé

Aucun `overscroll-behavior` n'est défini dans `src/app/globals.css` ni dans les layouts racine
(`src/app/layout.tsx`, `src/app/(app)/layout.tsx`) **avant cette correction** : recherche `grep -rn
"overscroll"` limitée à un seul résultat avant modification, situé ailleurs (voir ci-dessous).
Sur ce point précis, l'hypothèse du prompt est confirmée.

### Ce qui contredit l'hypothèse

Le repo contredit clairement l'idée qu'**aucune** neutralisation n'existe nulle part :

- `src/components/TabSwipeWrapper.tsx` (le `<main>` commun à toutes les pages de `(app)`, y
  compris `/carburants`) porte déjà `overscrollBehaviorY: "contain"` en style inline (ligne 92).
  Cette valeur bloque la propagation du geste de `<main>` vers le document, ce qui est la
  technique standard pour neutraliser le pull-to-refresh natif d'un conteneur scrollable imbriqué.
- Un composant de pull-to-refresh maison, **`src/components/PullToRefresh.tsx`**, existe déjà et
  est utilisé par **13 pages/vues** de l'app (accueil, collection, objectifs, notes, habitudes,
  tâches, courses, nutrition/recettes, et tous les écrans du module budget). Son propre
  commentaire de tête cite d'ailleurs explicitement `overscroll-behavior-y: contain` sur `<main>`
  comme prérequis déjà en place.

**Root cause réelle identifiée** : `/carburants` (`src/app/(app)/carburants/page.tsx`) est la
seule page de navigation principale qui n'utilise **pas** `<PullToRefresh>` — `CarburantsView`
est rendue nue. C'est la page manquant le pattern déjà généralisé partout ailleurs dans l'app,
pas un repo totalement dépourvu de protection.

**Nuance à signaler à Vincent** : `overscroll-behavior-y: contain` scopé uniquement à `<main>`
(un `<div>` avec `overflow-y: auto`, pas le document racine) est la bonne pratique pour éviter le
*scroll chaining*, mais certaines versions de Chrome/WebView Android en PWA standalone ne
suppriment pas totalement le geste natif de rafraîchissement quand la règle n'est posée que sur un
conteneur imbriqué plutôt que sur `html`/`body` — la doc de référence (web.dev, "Overscroll
behavior") recommande de la poser aussi au niveau racine. C'est cohérent avec le bug 100%
reproductible que Vincent observe : la protection existante sur `<main>` seul n'a manifestement
pas suffi dans son cas précis (WebView PWA Android). D'où la Phase 2 : renforcement au niveau
`html`/`body` en plus de l'existant, sans y toucher.

### `public/sw.js`

Relu intégralement (105 lignes). Handler `fetch` en network-first pour les pages et les payloads
RSC (avec repli sur le cache puis sur `/` en cas d'échec réseau) : aucune interférence identifiée
avec un pull-to-refresh custom côté client — le service worker ne réagit à aucun événement de
geste tactile et ne fait rien de spécifique au premier plan/arrière-plan de l'app.

## Phase 2 — Implémentation

### 1. Neutralisation globale du geste natif

`src/app/globals.css`, ajout après le bloc `body { ... }` :

```css
html,
body {
  overscroll-behavior-y: contain;
}
```

- `contain` plutôt que `none` : cohérent avec la valeur déjà utilisée sur `<main>`
  (`TabSwipeWrapper.tsx`), et suffisant pour bloquer la propagation vers le "reload" natif du
  navigateur sans supprimer l'effet de rebond élastique normal d'un scroll interne — c'est
  exactement la recommandation standard pour ce cas d'usage (page PWA installée en standalone).
- Portée volontairement **globale** (`html`/`body`, pas seulement `/carburants`) : le geste natif
  incontrôlé est un risque pour n'importe quelle page de l'app ayant un état client local non
  re-synchronisé sur un rechargement complet, pas seulement Carburants. `<main>` conserve sa
  propre règle `contain` inchangée (défense en profondeur, aucune redondance nuisible).

### 2. Pull-to-refresh maison sur `/carburants`

Réutilisation du pattern déjà établi dans le repo (`PullToRefresh.tsx`) plutôt qu'une
réimplémentation — c'est exactement la référence trouvée en Phase 1. Aucune nouvelle dépendance
ajoutée.

`src/app/(app)/carburants/CarburantsView.tsx` :

- Import de `PullToRefresh` depuis `@/components/PullToRefresh`.
- Le `return` de `CarburantsView` est enveloppé dans `<PullToRefresh onRefresh={localiser}>`, à
  l'identique du pattern déjà utilisé dans `TachesView.tsx` / `NotesGrid.tsx` (la vue s'enveloppe
  elle-même, pas la page).
- **Aucune autre ligne de logique modifiée** : tri, rayon et géolocalisation restent identiques à
  avant — la seule modification est l'ajout de deux balises d'enveloppe autour du JSX déjà
  existant.
- `localiser()` est passée telle quelle en `onRefresh`. Elle n'est pas asynchrone (elle déclenche
  juste `setStatut({phase: "chargement"})` puis incrémente `declencheur`, ce qui relance l'effet
  de géolocalisation) : l'indicateur de swipe de `PullToRefresh` se referme donc après son délai
  interne fixe (~400 ms), pendant que l'indicateur déjà existant du state `chargement` (texte
  "Recherche…" + bouton désactivé + message "Recherche des stations les plus proches…") reste
  affiché jusqu'à la fin réelle de la requête — comportement cohérent avec celui du bouton
  "Actualiser" existant, qui ne bloquait déjà pas non plus sur la promesse.

## Phase 3 — Vérification

- `npx tsc --noEmit` : ✅ aucune erreur (après un premier `npm run build` pour générer les types
  Next.js `LayoutProps`, absents avant tout build — non lié à cette correction).
- `npx eslint .` : ✅ aucune erreur ni avertissement sur l'ensemble du dépôt.
- `npm run build` : ✅ build de production réussi, `/carburants` toujours généré (route
  dynamique, `ƒ`).
- **Scroll normal non cassé** : vérifié par lecture de code, pas de test manuel sur device.
  `overscroll-behavior-y: contain` (jamais `none`) ne modifie que le comportement en butée de
  scroll (haut/bas) — il n'affecte ni la possibilité de scroller normalement une longue liste, ni
  le rebond élastique interne d'un conteneur. C'est exactement la valeur déjà utilisée sans
  incident sur `<main>` par `TabSwipeWrapper.tsx` pour toutes les pages de l'app depuis son
  introduction — l'étendre à `html`/`body` avec la même valeur ne change pas cette propriété,
  seulement le périmètre où elle s'applique.

## Limitations connues

- Non testé en conditions réelles sur un appareil Android (pas d'accès à un device physique
  depuis cet environnement) : la correction est basée sur la lecture de la spec CSS
  `overscroll-behavior` et sur le pattern déjà éprouvé ailleurs dans l'app (13 pages), mais le
  100 % de reproductibilité annoncé par Vincent n'a pas pu être re-testé directement pour confirmer
  la disparition du bug.
- L'indicateur de swipe custom (spinner de `PullToRefresh`) se referme avant la fin réelle du
  chargement des stations (voir ci-dessus) : léger décalage visuel possible entre la fin du geste
  et la fin réelle du rafraîchissement, minimisé par le texte "Recherche…" qui reste visible
  pendant ce délai. Comportement identique à celui déjà en place sur les 13 autres pages utilisant
  `PullToRefresh`, donc pas une régression spécifique à Carburants.
- Le champ `<main>` (`TabSwipeWrapper.tsx`) n'a pas été touché : la règle `overscroll-behavior-y:
  contain` y était déjà présente et reste inchangée, en plus de celle désormais posée sur
  `html`/`body`.
