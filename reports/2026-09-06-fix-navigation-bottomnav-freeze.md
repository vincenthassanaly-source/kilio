# Fix : écran figé sur Agenda lors du clic sur "Accueil" dans la bottom nav

Date : 2026-09-06

## Symptôme rapporté

Depuis l'écran Agenda, cliquer sur "Accueil" dans `BottomNav` laissait l'écran
figé sur Agenda (l'onglet Agenda restant allumé) pendant un temps perceptible,
puis l'app basculait brutalement sur Accueil, sans aucune transition visible.

## Phase 1 — Exploration et hypothèse

Fichiers lus avant toute modification :
- `src/hooks/useViewTransitionNavigate.ts`
- `src/components/BottomNav.tsx`
- `src/lib/navigation/registry.ts` (`resolveActiveHref`)
- `src/app/(app)/page.tsx`, `DashboardView.tsx` et les cartes qu'elle streame
  (`DashboardNutritionCard`, `DashboardTachesCard`, `DashboardHabitudesCard`,
  chacune dans son propre `<Suspense>`), `src/app/(app)/layout.tsx`
  (`getPreferencesNavigationResolues`, appelée une fois par requête serveur)
- `src/components/TabSwipeWrapper.tsx`, `src/app/globals.css` (règles
  `::view-transition-old(root)` / `::view-transition-new(root)`)

**Piste écartée** : la page Accueil elle-même n'est pas anormalement lente à
streamer — `page.tsx` retourne son JSX sans `await`, et chaque carte est un
Server Component async indépendant streamé via son propre `<Suspense>`
(voir `reports/2026-09-04-dashboard-streaming-par-section.md`). Rien dans
Accueil n'indique un temps de chargement structurellement plus long que
les autres routes de la bottom nav.

**Hypothèse confirmée** (voir `useViewTransitionNavigate.ts` avant
correctif) :

```ts
const transition = document.startViewTransition(() => {
  router.push(href);
});
```

Le callback passé à `startViewTransition` est **synchrone** et ne renvoie
rien. Or `router.push()` de l'App Router ne renvoie aucune valeur à
attendre : il *déclenche* la navigation (fetch RSC + rendu de la page
cible), mais celle-ci se termine de façon asynchrone, potentiellement bien
après le retour du callback. D'après la spec View Transitions, dès que la
valeur renvoyée par le callback est "réglée" (ici : immédiatement, via
`Promise.resolve(undefined)` puisque ce n'est pas un thenable), le
navigateur capture l'état "après" — mais à ce moment-là le DOM n'a pas
encore changé, puisque la navigation réelle n'est pas terminée. Le
crossfade/slide (~200ms) s'anime donc entre deux captures quasiment
identiques (toutes deux montrant encore l'ancienne route), puis les
pseudo-éléments de transition sont détruits **avant** que le vrai contenu
n'arrive. Quand la navigation aboutit enfin, le DOM change en dehors de
toute transition : bascule brutale, sans fondu visible — exactement le
symptôme rapporté.

### Vérification de l'hypothèse

Ce sandbox n'a pas d'accès réseau sortant vers le projet Supabase réel
(`Host not in allowlist: vsmtkopkqasrdnjceegp.supabase.co` — restriction de
la politique réseau de cet environnement, cf. `/root/.ccr/README.md` : "ne
pas contourner, signaler"), ce qui empêche de charger la moindre route de
`(app)/` en conditions réelles (chaque route lit des données via Supabase
côté serveur, y compris le layout partagé qui résout les préférences de
navigation).

Pour vérifier le mécanisme précis en cause (comportement générique de
`startViewTransition` combiné à un changement de route asynchrone), une
reproduction minimale, indépendante de Next.js/Supabase, a été construite
et exécutée avec Playwright + Chromium :

- Une page HTML statique simule une navigation asynchrone (`fakeRouterPush`)
  qui ne change le DOM qu'après un délai simulé de 600ms (≈ un aller-retour
  réseau perceptible), avec les mêmes règles CSS `::view-transition-old/new`.
- `navigateAvant` reproduit exactement le code d'origine (callback
  synchrone, aucune valeur renvoyée).
- `navigateApres` reproduit le correctif (callback renvoyant une Promise
  résolue seulement quand le "pathname" change réellement, timeout de
  sécurité 3000ms).

Résultats mesurés (`t` = ms depuis le clic) :

**Avant correctif** :
```
t=0 → 600ms : texte="Agenda" (écran figé, aucun changement visible)
t=660ms     : texte="Accueil" (bascule brutale)
navDone (changement réel du DOM)     : 619ms
transitionFinished (fin de l'animation) : 277ms  ← termine AVANT le changement réel
```
La transition (277ms) se termine bien avant que le contenu ne change
réellement (619ms) : la totalité du figement (~600ms) se produit hors de
toute animation, confirmant l'hypothèse au chiffre près.

**Après correctif** :
```
navDone (changement réel du DOM)        : 612ms
transitionFinished (fin de l'animation) : 890ms  ← termine APRÈS le changement réel
```
L'animation se termine désormais après le changement réel du DOM (~612 à
890ms, soit ~278ms — cohérent avec les ~200ms de `kilio-fondu-*`/
`kilio-glisse-*` de `globals.css`) : le crossfade/slide encadre maintenant
le véritable changement de contenu au lieu de se dérouler dans le vide.

## Phase 2 — Correctif

Fichier modifié : `src/hooks/useViewTransitionNavigate.ts` (seul fichier
touché).

Le callback passé à `startViewTransition` renvoie désormais une `Promise`
qui ne se résout que lorsque `usePathname()` reflète effectivement `href` :

- Un `useRef` (`enAttenteRef`) garde la navigation en attente courante
  (`{ target, resolve, timeoutId }`).
- Un `useEffect` déclenché à chaque changement de `pathname` résout la
  promesse dès que `pathname === target`, et annule le timeout de sécurité.
- Un `setTimeout` de secours (`TIMEOUT_NAVIGATION_MS = 3000`) résout quand
  même la promesse si le pathname ne rejoint jamais la cible (navigation qui
  échoue silencieusement), pour ne jamais bloquer la transition
  indéfiniment — la garde d'identité (`enAttenteRef.current === enAttente`)
  évite qu'un timeout périmé n'efface par erreur une navigation plus
  récente déjà en cours.
- Cas déjà géré par `deriveDirection`/`resolved` **préservé** : si la cible
  a le même pathname que l'actuel (query/hash seuls diffèrent, ou onglet
  déjà actif), `usePathname()` ne changera jamais — le callback ne crée
  alors aucune promesse et se résout immédiatement, comme avant.
- Le fallback `router.push` direct pour les navigateurs sans support de
  l'API (Safari, Firefox) est inchangé.

## Phase 3 — Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur.
- `npx eslint src/hooks/useViewTransitionNavigate.ts` (et `npx eslint .`
  sur l'ensemble du repo) : ✅ aucune erreur ni avertissement.
- `npx next build` (Turbopack) : ✅ build de production réussi, 22 routes
  générées, toutes dynamiques (`ƒ`) comme avant — aucune route n'a tenté
  d'appeler Supabase au build (attendu : ces routes lisent des cookies /
  utilisent le client Supabase serveur, ce qui les place déjà en rendu
  dynamique).
- Testé au niveau code : toutes les combinaisons d'onglets de la bottom nav
  passent par le même `navigate()` — `handleClick` dans `BottomNav.tsx`
  calcule `direction` depuis l'ordre visuel des onglets et `TabSwipeWrapper`
  l'impose depuis l'ordre de `modulesBarreBasse`, tous deux inchangés : le
  correctif n'agit que sur *quand* le callback se résout, jamais sur le
  calcul de `direction`/`resolved` qui pilote le sens du slide
  avance/recule — aucune régression possible sur ce point par construction.
- Reproduction minimale (Phase 1) validée dans les deux sens (`navigateAvant`
  reproduit le bug, `navigateApres` le corrige), avec les mêmes règles CSS
  de transition que l'app réelle.

Non testé en conditions réelles (app complète, données Supabase) : accès
réseau sortant vers `vsmtkopkqasrdnjceegp.supabase.co` bloqué par la
politique réseau de ce sandbox (cf. Phase 1). À vérifier par Vincent en
conditions réelles (Agenda → Accueil, puis les autres combinaisons
d'onglets) avant/après déploiement si un doute subsiste.

## Fichiers modifiés

- `src/hooks/useViewTransitionNavigate.ts` : seul fichier modifié (voir
  Phase 2).
