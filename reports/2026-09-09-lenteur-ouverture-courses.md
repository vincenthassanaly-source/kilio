# Courses — lenteur d'ouverture mobile (pas de skeleton, écran figé)

## Phase 1 — Diagnostic

### Ce qui est confirmé

- **Courses n'est pas dans `DEFAULT_MODULES_BARRE_BASSE`** (`src/lib/navigation/registry.ts`,
  `= ["/", "/nutrition", "/taches", "/habitudes"]`) : accessible uniquement via la grille `/plus`
  (`ModulesGrid.tsx`), en `TransitionLink` = `next/link` standard.
- **Aucun prefetch anticipé n'existait** avant navigation vers `/plus` : les 4 modules épinglés
  restent prefetchés en continu parce que leurs `<Link>` de `BottomNav` sont toujours montés ; les
  7 modules secondaires (dont Courses) ne l'étaient qu'une fois `/plus` affichée (montage des
  `<Link>` de `ModulesGrid`), pas avant. Confirmé par lecture de code — aucun `router.prefetch()`
  anticipé nulle part dans le repo avant cette correction, aucun `prefetch={false}` non plus.
- **`useViewTransitionNavigate` gèle bien tout l'écran sans retour visuel** jusqu'à ce que
  `usePathname()` rejoigne la cible, avec un garde-fou à `TIMEOUT_NAVIGATION_MS = 3000` : le
  callback passé à `document.startViewTransition()` ne se résout qu'à ce moment-là, et **tant que
  ce callback est en attente, la spec View Transitions affiche un instantané figé (bitmap) de
  l'ancienne page en overlay** — toute mise à jour du DOM réel pendant ce délai (y compris
  l'affichage du `loading.tsx` de la route cible) est donc invisible pour l'utilisateur jusqu'à la
  résolution. C'est la cause directe du ressenti « écran figé, pas de skeleton visible » : le
  skeleton existe déjà mais est masqué par la View Transition tant qu'elle n'a pas capturé l'état
  « new ».

### Nuance par rapport à l'hypothèse initiale : latence Supabase infirmée

Requête `mcp__Supabase__query_logs` sur `edge_logs` du projet `vsmtkopkqasrdnjceegp`, dernières
24h, latence serveur (`response.origin_time`, en ms) groupée par module d'après le chemin de la
requête REST :

| Module    | Nb requêtes | Latence moy. | Latence max |
|-----------|------------:|--------------:|-------------:|
| taches    | 1498        | 146,2 ms      | 1316 ms      |
| nutrition | 28          | 171,1 ms      | 1031 ms      |
| habitudes | 28          | 167,8 ms      | 1004 ms      |
| **courses** | **9**     | **57,1 ms**   | **203 ms**   |

**Courses n'est pas plus lent côté Supabase — au contraire, c'est le module le plus rapide de
l'échantillon.** L'hypothèse « latence réseau/Supabase anormale sur `/courses` » (évoquée comme
piste alternative dans le prompt) est donc infirmée : la lenteur perçue est bien d'origine
purement client (Next.js/View Transitions), pas côté base de données. Le faible nombre de requêtes
(9 sur 24h) reflète simplement le fait que Courses est peu visité, cohérent avec un module non
épinglé.

Cette table `edge_logs` capture les appels REST vers Supabase (dont ceux faits en SSR par les
Server Components des pages), pas les temps de réponse des routes Vercel elles-mêmes (hors
périmètre des logs Supabase) — un éventuel cold start de la fonction serverless Vercel pour
`/courses` n'a donc pas pu être mesuré directement avec cet outil, mais n'est de toute façon plus
pertinent une fois le prefetch anticipé en place (Phase 2).

### Diagnostic retenu

Hypothèse du prompt **confirmée dans ses grandes lignes**, avec la précision Supabase ci-dessus :
Courses met du temps à s'ouvrir parce qu'il n'est jamais prefetché avant que Vincent tape
effectivement sur la tuile depuis `/plus`, et cette attente (fetch RSC + JS du segment) se déroule
entièrement derrière l'instantané figé de la View Transition, sans aucun retour visuel avant
`TIMEOUT_NAVIGATION_MS` (3000 ms) — alors même que `/courses` possède déjà un `loading.tsx` avec
skeleton dédié (`src/app/(app)/courses/loading.tsx`), qui reste invisible tant que la transition
n'a pas capturé le nouvel état.

## Phase 2 — Implémentation

### 1. Prefetch anticipé des modules non épinglés

`src/lib/navigation/NavigationEditContext.tsx` — `NavigationEditProvider` est monté une seule fois
au niveau du layout `(app)` et connaît déjà `modulesBarreBasse`. Ajout d'un effet au montage (et à
chaque changement de `modulesBarreBasse`, ex. re-épinglage) qui appelle `router.prefetch()` pour
tous les `NAV_ITEMS` absents de `modulesBarreBasse` — Courses, Agenda, Budget, Objectifs,
Collection, Notes, Réglages, Carburants :

```ts
useEffect(() => {
  for (const item of NAV_ITEMS) {
    if (!modulesBarreBasse.includes(item.href)) router.prefetch(item.href);
  }
}, [router, modulesBarreBasse]);
```

`router.prefetch()` est idempotent (no-op si déjà en cache), donc sans coût perceptible à chaque
re-render. Ces modules sont désormais prefetchés dès la première page visitée dans `(app)`, sans
attendre un passage par `/plus`.

### 2. Filet de sécurité visuel dans `useViewTransitionNavigate`

`src/hooks/useViewTransitionNavigate.ts` :

- Nouveau seuil court `SEUIL_INDICATEUR_MS = 180` (en plus du garde-fou existant
  `TIMEOUT_NAVIGATION_MS = 3000`, conservé tel quel comme filet ultime).
- Nouveau store externe minimal (`useSyncExternalStore`, pas de Context — `navigate()` peut être
  déclenché depuis `TransitionLink`, `BottomNav` ou `TabSwipeWrapper`, sans lien de parenté
  garanti avec le composant affichant l'indicateur) exposant `useNavigationEnCours()`.
- Si le pathname cible n'est pas atteint après 180 ms, la transition en cours est **résolue
  immédiatement** (au lieu d'attendre jusqu'à 3000 ms) via `flushSync(() => setNavigationEnCours(true))`
  puis `resolve()` : cela met fin au gel de la View Transition et révèle l'état courant du DOM
  (déjà le skeleton `loading.tsx` de la cible s'il a eu le temps de commencer à streamer, sinon
  encore l'ancienne page), surmonté de l'indicateur. La navigation réelle continue en tâche de
  fond et se termine désormais **hors** View Transition — donc visible en direct, sans nouveau gel
  — dès que `usePathname()` rejoint la cible.
- `flushSync` garantit que la mise à jour est bien peinte avant que `resolve()` ne déclenche la
  capture du nouvel état par la View Transition (un `setState` planifié dans un `setTimeout` est
  batché par défaut en React 18).

`src/components/TabSwipeWrapper.tsx` — lit `useNavigationEnCours()` et affiche, quand vrai, une
fine barre de progression indéterminée (3px, `var(--accent-kcal)`) fixée en haut de l'écran,
au-dessus de `<main>`.

`src/app/globals.css` — animation `kilio-barre-navigation-progression-anim` (translation en boucle,
900 ms), neutralisée sous `prefers-reduced-motion: reduce` comme les autres animations du fichier.

Le reste de la logique de View Transitions (slide directionnel, `useReplace`, `deriveDirection`,
`data-nav-direction`) n'a pas été touché.

## Phase 3 — Vérification

- `npx tsc --noEmit` : ✅ aucune erreur (après un premier `npx next build` pour générer les types
  Next.js `LayoutProps`, absents avant tout build — non lié à cette correction, déjà documenté dans
  de précédents rapports).
- `npx eslint .` : ✅ aucune erreur ni avertissement sur l'ensemble du dépôt.
- `npx next build` : ✅ build de production réussi, 27 routes générées y compris `/courses` et
  `/plus`.

## Comportement avant / après

- **Avant** : taper sur la tuile Courses depuis `/plus` (jamais prefetchée) déclenchait un fetch
  RSC à froid ; l'écran restait visuellement figé sur `/plus` (instantané de la View Transition)
  sans aucun changement jusqu'à ce que la navigation aboutisse — potentiellement plusieurs
  centaines de ms à quelques secondes, jusqu'au garde-fou de 3000 ms dans le pire cas.
- **Après** : Courses (comme les 7 autres modules secondaires) est prefetché dès l'arrivée sur
  `(app)`, donc la navigation depuis `/plus` devrait dans l'immense majorité des cas rester sous le
  seuil de 180 ms et bénéficier du crossfade/slide existant sans aucun gel perceptible. Dans les
  cas résiduels plus lents (cache de prefetch expiré, réseau mobile dégradé), l'écran cesse d'être
  figé au-delà de 180 ms : une fine barre de progression apparaît en haut de l'écran et le
  skeleton `loading.tsx` de Courses redevient visible dès qu'il commence à streamer, au lieu de
  rester masqué jusqu'à 3000 ms.

## Limitations connues

- Non testé sur device réel (pas d'accès à un appareil physique ni à un navigateur avec View
  Transitions depuis cet environnement) : la correction repose sur la lecture de la spec View
  Transitions (capture figée de l'état « old » jusqu'à résolution du callback) et sur la relecture
  attentive du code existant, pas sur une observation visuelle directe du avant/après.
- La latence des routes Vercel elles-mêmes (cold start de la fonction serverless pour `/courses`)
  n'a pas pu être mesurée directement — seule la latence Supabase l'a été, et elle est bonne. Le
  prefetch anticipé couvre ce risque indépendamment de sa cause exacte, en éliminant le besoin
  d'un aller-retour réseau synchrone au moment du tap.
