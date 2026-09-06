# Module Foot — résultats à la demande, sans polling

## Fichiers créés

- `src/lib/foot/compute.ts` — fonctions pures : liste des 13 compétitions retenues (`COMPETITIONS_FOOT`), `interpreterStatutFixture`, `grouperFixturesParCompetition`, plus deux petits helpers de fuseau horaire (`dateDuJourParis`, `formatHeureParis`).
- `src/app/actions/foot.ts` — `getResultatsFootDuJour()` : unique appel `fetch` vers `v3.football.api-sports.io/fixtures`, `cache: "no-store"`, filtrage sur les 13 IDs, gestion d'erreur (clé manquante, quota 429, `errors` renvoyé par l'API, échec réseau).
- `src/app/(app)/foot/page.tsx` — page `/foot`, Server Component async, `await getResultatsFootDuJour()` direct (pas de react-query), sections par compétition, ligne compacte par match, badge live rouge, état d'erreur avec bouton Réessayer.
- `src/app/(app)/foot/FootRetryButton.tsx` — petit client component : `router.refresh()` sur clic (même mécanisme que `PullToRefresh`), pour le bouton "Réessayer" de l'état d'erreur.
- `src/app/(app)/DashboardFootCard.tsx` — carte statique du dashboard (aucun Server Component async, aucun `fetch`), réutilise l'icône `FOOT_ICON` du registre de navigation via `findNavItem("/foot")`.

## Fichiers modifiés

- `src/app/(app)/DashboardView.tsx` — ajout de `<DashboardFootCard />` (sans `<Suspense>`).
- `src/lib/navigation/registry.ts` — ajout de `FOOT_ICON` (ballon, tracés géométriques à la main) et de l'entrée `{ href: "/foot", ... }` à la fin de `NAV_ITEMS`.
- `src/app/globals.css` — ajout de `--accent-foot` (clair : `oklch(0.55 0.14 135)`, sombre : `oklch(0.72 0.13 135)`, teinte verte non utilisée par un accent existant) et mapping `--color-foot`.

## ⚠️ IDs de compétitions : vérification en direct impossible depuis cette session

La consigne demandait d'interroger `/leagues?search=<nom>` avant de figer les IDs en dur. **Cette vérification en direct n'a pas pu être faite** :
- aucune clé `API_FOOTBALL_KEY` n'est présente dans cet environnement (normal, Vincent doit la renseigner) ;
- le proxy réseau sortant de cet environnement bloque `www.api-football.com` (confirmé : `WebFetch` → `EGRESS_BLOCKED`) et une requête directe vers `v3.football.api-sports.io` (même sans clé, juste pour tester l'accessibilité) time-out (`HTTP_STATUS:000`) — le domaine `api-sports.io` n'est pas joignable depuis ce sandbox.

À la place, les 13 IDs ont été recoupés via recherche web sur plusieurs sources publiques indépendantes (dont un projet tiers — `zxkane/agentcore-football-api` — dont le README liste explicitement les IDs API-Football "pre-configured ... reducing API calls by 50%"). Ces sources confirment **12 des 13 IDs** de façon concordante avec les valeurs "probablement correctes" du prompt initial :

| Compétition | ID retenu | Statut |
|---|---|---|
| Ligue 1 | 61 | confirmé (2 sources) |
| Premier League | 39 | confirmé (2 sources) |
| Liga | 140 | confirmé (2 sources) |
| Bundesliga | 78 | confirmé (2 sources) |
| Serie A | 135 | confirmé (2 sources) |
| Coupe de France | 66 | confirmé (2 sources) |
| FA Cup | 45 | confirmé (2 sources) |
| Copa del Rey | 143 | confirmé (2 sources) |
| DFB-Pokal | 81 | confirmé (2 sources) |
| Coppa Italia | 137 | confirmé (2 sources) |
| Ligue des Champions | 2 | confirmé (2 sources) |
| Europa League | 3 | confirmé (2 sources) |
| Conference League | 848 | **non recoupé par une 2ᵉ source indépendante** — seule la valeur connue à l'avance a été utilisée |

**Action recommandée pour Vincent** : une fois `API_FOOTBALL_KEY` renseignée (en local ou sur Vercel), lancer une requête `GET https://v3.football.api-sports.io/leagues?search=Conference` (header `x-apisports-key: ...`) pour confirmer le 13ᵉ ID avant de faire confiance aux résultats affichés sur cette compétition précise. Si l'ID diffère, il suffit de corriger la valeur dans `COMPETITIONS_FOOT` (`src/lib/foot/compute.ts`) — un seul endroit dans tout le code.

## Autres décisions techniques

- **`cache: "no-store"`** sur l'unique `fetch` : impose un nouvel appel réseau à chaque exécution de `getResultatsFootDuJour()`, jamais de cache Next.js qui masquerait un score qui évolue — cohérent avec le fait que le seul déclencheur voulu est l'ouverture/rafraîchissement manuel de `/foot`.
- Le dashboard (`DashboardFootCard.tsx`) est un composant purement statique : pas d'`async`, pas d'appel à `getResultatsFootDuJour`, aucun `fetch` — vérifié par relecture du code et par recherche (`grep`) de `fetch(` dans tous les fichiers du module : le seul résultat est `src/app/actions/foot.ts`.
- Retry manuel : un petit client component (`FootRetryButton`) appelle `router.refresh()`, qui relance `FootPage` côté serveur et donc un unique nouvel appel API — même mécanisme que `PullToRefresh`, qui est réutilisé tel quel (non modifié) pour le geste de tiré vers le bas.
- Le module est **aussi listé dans `/plus`** (comportement standard : `NAV_ITEMS` alimente la grille "Plus" pour tout module). Vincent peut demander à le retirer de cette grille s'il préfère un accès dashboard-only — cela nécessiterait un traitement spécial dans `resolveOrdreGrillePlus` (actuellement tous les items de `NAV_ITEMS` y apparaissent).

## Vérifications

- `tsc --noEmit` : ✅ aucune erreur.
- `eslint .` : ✅ aucune erreur.
- `npm run build` : ✅ build réussi, route `ƒ /foot` bien générée (dynamique, comme attendu pour un Server Component avec `fetch({ cache: "no-store" })`).
- Confirmation par relecture de code (pas d'inspection réseau navigateur possible dans cet environnement) que `DashboardFootCard.tsx` ne contient ni `await`, ni `fetch`, ni composant serveur asynchrone.

## Non testé

Le rendu visuel réel de `/foot` avec de vraies données (scores, matchs en direct) n'a pas pu être vérifié dans un navigateur, faute de clé `API_FOOTBALL_KEY` disponible dans cet environnement. À tester par Vincent une fois la clé renseignée en local (`.env.local`) et sur Vercel.
