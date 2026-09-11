# Fix : navigation abandonnée après le timeout de sécurité (retaper plusieurs fois nécessaire)

Date : 2026-09-11

## Symptôme rapporté

En tapant un onglet de la bottom nav, un chargement apparaît puis l'app
reste finalement bloquée sur la page d'origine, obligeant à retaper
l'onglet plusieurs fois avant d'aboutir. Confirmé par Vincent : ça arrive
sur tous les onglets sans distinction, aussi bien en usage actif qu'après
une pause.

## Phase 1 — Exploration et hypothèses

Fichiers lus avant toute modification :
- `src/hooks/useViewTransitionNavigate.ts`
- `src/components/TabSwipeWrapper.tsx`
- `src/components/BottomNav.tsx`
- `reports/2026-09-06-fix-navigation-bottomnav-freeze.md` (fix précédent,
  lié mais différent : il traitait un écran figé *sans* indicateur visible,
  pas un abandon complet après affichage de l'indicateur)
- Documentation Next.js 16 (`node_modules/next/dist/docs/`) et code source
  interne du client App Router (`node_modules/next/dist/client/components/`),
  cf. Phase 1 bis ci-dessous

### Hypothèse 1 (indicateur coupé trop tôt) — confirmée

Dans `useViewTransitionNavigate.ts`, deux délais coexistaient :

- `SEUIL_INDICATEUR_MS = 180` : si la navigation n'a pas abouti après
  180ms, l'indicateur de chargement (`navigationEnCours`) s'allume et la
  View Transition animée se résout immédiatement (comportement du fix du
  2026-09-06, inchangé et correct).
- `TIMEOUT_NAVIGATION_MS = 3000` : si la navigation n'a **toujours** pas
  abouti après 3000ms, son callback :
  ```ts
  timeoutId: setTimeout(() => {
    if (enAttenteRef.current === enAttente) enAttenteRef.current = null;
    setNavigationEnCours(false); // <-- coupe l'indicateur
    resolve();
  }, TIMEOUT_NAVIGATION_MS),
  ```
  coupait l'indicateur **et** nullifiait `enAttenteRef`, alors même que
  `router.push`/`router.replace` (appelé dans le callback de
  `startViewTransition`, indépendant de cette promesse) continue en tâche
  de fond. Résultat : à 3s, si la navigation n'a pas encore abouti (latence
  réseau + Supabase + cold start de fonction serverless Vercel Hobby,
  couramment > 3s), l'indicateur disparaît et l'utilisateur se retrouve sur
  l'ancienne page sans aucun signe qu'un travail est en cours — donnant
  l'impression que le tap n'a rien fait. Quand la navigation finit par
  aboutir (parfois bien après), plus rien ne signale ce changement puisque
  `enAttenteRef` avait déjà été vidé : le `useEffect` de résolution sur
  changement de `pathname` s'exécute silencieusement, sans que l'UI n'ait
  laissé deviner qu'il fallait patienter.

  Un second bug latent, non mentionné dans la demande initiale mais
  découvert pendant l'exploration : ce même timeout appelait
  `setNavigationEnCours(false)` **sans aucune garde d'identité**
  (contrairement à `seuilId`, qui vérifie
  `enAttenteRef.current === enAttente`). Si une navigation A était
  remplacée par une navigation B avant que le timeout de A n'ait eu le
  temps de se déclencher, ce timeout de A pouvait couper l'indicateur de B
  à tort, en plein milieu de sa propre attente. Corrigé au passage par la
  même restructuration (voir Phase 2).

### Hypothèse 2 (retaper relance `push()` sur une navigation déjà en vol) — confirmée

Lecture du code interne de Next.js 16 (App Router,
`node_modules/next/dist/client/components/app-router-instance.js`,
fonction `dispatchAction`) :

```js
} else if (payload.type === ACTION_NAVIGATE || payload.type === ACTION_RESTORE) {
  // Navigations (including back/forward) take priority over any pending actions.
  // Mark the pending action as discarded (so the state is never applied) and start the navigation action immediately.
  actionQueue.pending.discarded = true;
  ...
  runAction({ actionQueue, action: newAction, setState });
}
```

Confirmé : l'App Router de Next.js 16 **ne fusionne ni n'annule** les
navigations concurrentes au niveau réseau. Quand un nouveau
`router.push()`/`replace()` est dispatché pendant qu'une navigation
précédente est encore en vol, cette dernière est marquée `discarded` (son
résultat, quand il arrivera, sera ignoré) et une **nouvelle** action
`navigateReducer` → `navigate()` démarre *immédiatement*, ce qui (faute de
prefetch valide en cache, cas courant pour ces routes qui lisent Supabase
dynamiquement) déclenche un tout nouvel appel à `fetchServerResponse()`
(`node_modules/next/dist/client/components/segment-cache/navigation.js`,
fonction `navigateToUnknownRoute`) — sans annuler la requête RSC
précédente au niveau réseau. Chaque retap pendant l'attente ajoute donc une
requête concurrente à la fonction serverless, sans jamais laisser la
première (ni la deuxième, etc.) le temps d'aboutir tranquillement — ce qui
explique qu'il fallait parfois plusieurs tentatives, et qu'un cold start
Vercel Hobby (déjà lent) est d'autant plus pénalisé par des requêtes
concurrentes répétées.

Combinée à l'hypothèse 1 : au moment précis où l'indicateur disparaissait
(3s) sans que rien n'ait visiblement changé, l'utilisateur était
naturellement poussé à retaper — ce qui, d'après ce qui précède,
n'accélérait rien et pouvait même aggraver la contention côté serveur.

## Phase 2 — Correctif

Fichier modifié : `src/hooks/useViewTransitionNavigate.ts` (seul fichier
touché).

### Piste 1 : ne plus couper l'indicateur au timeout de 3s

- `TIMEOUT_NAVIGATION_MS` (3000ms) ne pilote plus que l'abandon de
  l'*animation* (résolution de la promesse passée à
  `startViewTransition`) — il ne touche plus ni à `navigationEnCours` ni à
  `enAttenteRef`. En pratique ce filet ne joue quasiment jamais de rôle
  actif : `SEUIL_INDICATEUR_MS` (180ms, largement plus court) a déjà résolu
  cette même promesse bien avant.
- Nouveau garde-fou `TIMEOUT_ABANDON_MS = 12000` (12s) : c'est lui qui,
  désormais, coupe l'indicateur et vide `enAttenteRef` — mais seulement si
  le pathname réel n'a *toujours* pas rejoint la cible après ce délai
  nettement plus généreux, pour couvrir la latence réseau + Supabase + cold
  start sans donner une fausse impression d'échec. Garde d'identité
  (`enAttenteRef.current !== enAttente`) préservée, comme pour `seuilId`.
- Le `useEffect` de résolution sur changement de `pathname` nettoie
  désormais les trois timers (`seuilId`, `timeoutId`, `abandonId`).

### Piste 2 : no-op sur un retap de la même cible en attente

```ts
if (enAttenteRef.current?.target === target) return;
```

Ajouté en tête du callback `navigate()`, avant tout appel à
`push()`/`replace()`. Tant qu'une navigation vers `target` est en attente
(du tap initial jusqu'à son aboutissement réel ou jusqu'au garde-fou de
12s), un nouveau tap sur la même cible est ignoré : ni nouvelle requête
RSC, ni redémarrage de la View Transition. L'indicateur déjà affiché
(depuis `SEUIL_INDICATEUR_MS`) reste le seul retour visuel nécessaire
pendant l'attente.

### Piste 3

Confirmée comme cause racine du besoin de retaper plusieurs fois (voir
Hypothèse 2 ci-dessus) — d'où la priorité donnée au correctif de la Piste
2, qui l'adresse directement en empêchant l'utilisateur de déclencher lui
même des requêtes concurrentes.

## Phase 3 — Vérifications

- `npx tsc --noEmit` (après un premier `npx next build` pour générer
  `.next/types`, absent car `node_modules`/`.next` n'existaient pas encore
  dans ce sandbox) : ✅ aucune erreur.
- `npx eslint .` : ✅ aucune erreur ni avertissement.
- `npx next build` (Turbopack) : ✅ build de production réussi, 25 routes
  générées, `TypeScript` validé pendant le build lui-même.
- Ce sandbox n'a pas d'accès réseau sortant vers le projet Supabase réel
  (`vsmtkopkqasrdnjceegp.supabase.co` → `403` côté proxy sortant), comme
  déjà signalé dans le rapport du 2026-09-06 : impossible de charger une
  route de `(app)/` en conditions réelles. Une reproduction minimale,
  indépendante de Next.js/Supabase, a de nouveau été construite et exécutée
  avec Playwright + Chromium (binaire pré-installé du sandbox), reproduisant
  fidèlement la logique de `useViewTransitionNavigate.ts` (mêmes constantes
  `SEUIL_INDICATEUR_MS`/`TIMEOUT_NAVIGATION_MS`/`TIMEOUT_ABANDON_MS`) :

  **Scénario 1 — navigation lente (4000ms, > ancien TIMEOUT_NAVIGATION_MS) :**
  ```
  AVANT : t=183ms indicateur=true · t=3003ms indicateur=false (BUG : coupé
          alors que la navigation réelle n'aboutit qu'à ~4000ms)
  APRÈS : t=183ms indicateur=true · t=4003ms indicateur=false (coupé
          seulement une fois le pathname réel atteint)
  ```

  **Scénario 2 — navigation qui n'aboutit jamais (garde-fou) :**
  ```
  APRÈS : t=188ms indicateur=true · t=12008ms indicateur=false
          (TIMEOUT_ABANDON_MS déclenché comme prévu, pas de spinner infini)
  ```

  **Scénario 3 — 3 taps rapides sur la même cible pendant l'attente :**
  ```
  Sans garde (comportement avant piste 2) : 3 appels push() cumulés pour 3 taps
  Avec la garde ajoutée (piste 2)          : +1 seul appel push() pour 3 taps
  ```

  Les quatre assertions automatiques du script (bug reproduit avant
  correctif, fix confirmé, garde-fou confirmé, garde anti-retap confirmée)
  passent toutes à `true`.

## Ce qui reste à tester en conditions réelles

- Accès réseau sortant vers `vsmtkopkqasrdnjceegp.supabase.co` bloqué dans
  ce sandbox (cf. Phase 3) : à vérifier par Vincent sur l'app déployée,
  idéalement en throttling réseau (DevTools "Slow 3G" ou équivalent mobile)
  pour forcer des navigations > 3s et confirmer que l'indicateur reste bien
  visible jusqu'à l'arrivée réelle de la page, sur plusieurs combinaisons
  d'onglets et après une pause de l'app (cas explicitement signalé par
  Vincent).
- Vérifier qu'un retap répété sur un onglet pendant le chargement ne
  déclenche plus de requêtes visibles en double dans l'onglet Réseau des
  DevTools.
- Cas volontairement non couvert par ce correctif : le fallback sans
  `startViewTransition` (Safari/Firefox anciens) n'a pas de mécanisme
  d'indicateur ni de garde anti-retap — comportement inchangé, hors du
  périmètre du bug rapporté (qui dépend du mécanisme d'indicateur/timeout,
  propre au chemin View Transition).

## Fichiers modifiés

- `src/hooks/useViewTransitionNavigate.ts` : seul fichier modifié (voir
  Phase 2).
