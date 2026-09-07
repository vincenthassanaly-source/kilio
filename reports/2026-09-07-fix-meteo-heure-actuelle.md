# Météo — "Prochaines heures" affichait des heures passées — 2026-09-07

## Phase 1 — Constats

- `git checkout kilio && git fetch origin kilio && git reset --hard origin/kilio` : la session locale et `origin/kilio` avaient divergé (56 vs 50 commits) — resynchronisée sur `origin/kilio` (`ece24ff`, "Supprime le module Foot"), puis la branche de travail `claude/meteo-marseille-current-hour-d3cawd` a été recréée depuis ce point.
- Relecture de `src/app/actions/meteo.ts` (`getMeteoJour`), `src/lib/meteo/compute.ts`, `src/app/(app)/MeteoDetailModal.tsx` et `MeteoHeaderCard.tsx`/`MeteoHeaderWidget.tsx` : le bloc "Prochaines heures" mis en cause dans le rapport de bug correspond bien à `journee.previsionsHoraires` rendu dans `MeteoDetailModal.tsx` (ligne ~72-84), alimenté par `getMeteoJour()` côté `MeteoHeaderCard.tsx` (Server Component).
- **Tentative de vérification live impossible dans cet environnement** : `curl` direct vers `api.open-meteo.com` et `WebFetch` sont tous les deux bloqués par la politique réseau de sortie de la session (`EGRESS_BLOCKED` / `connect_rejected` côté proxy — domaine non autorisé). Je n'ai donc pas pu récupérer une réponse réelle d'Open-Meteo pour comparer `current_weather.time` à `hourly.time`.
- Diagnostic établi par lecture de code plutôt que par appel réseau : `data.hourly.time.findIndex((t) => t === data.current_weather.time)` compare deux chaînes provenant de deux champs distincts de l'API (`current_weather`, un champ **déprécié** selon la doc Open-Meteo, vs `hourly`). Que la valeur exacte de `current_weather.time` diverge de la grille `hourly.time` (arrondi différent, léger décalage de fraîcheur des données du modèle, ou tout changement de format côté API) suffit à faire échouer silencieusement le `findIndex` (retour `-1`), et le code retombe alors sur `debutAujourdhui = 0`, soit minuit — ce qui correspond exactement au symptôme rapporté (prévisions commençant à 03:00-07:00 alors qu'il est 08:36). Le point structurel du bug, indépendamment de la cause précise de la divergence, est que **le calcul de l'heure de départ dépendait d'un champ externe fragile et déprécié plutôt que de l'heure réelle**.

## Phase 2 — Correction apportée

Dans `getMeteoJour` (`src/app/actions/meteo.ts`), remplacement du calcul de `debutAujourdhui` :

- Avant : comparaison de chaînes entre `data.hourly.time` et `data.current_weather.time`.
- Après : calcul de l'heure actuelle à Paris directement côté serveur via `Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ... })` (aucune nouvelle dépendance — l'API `Intl` est native), reconstruction d'une chaîne `"YYYY-MM-DDTHH:00"` (même format que les entrées de `hourly.time`), puis recherche de cette chaîne via `indexOf` dans `data.hourly.time`.
- Fallback conservé à `0` si aucune correspondance n'est trouvée (cas qui ne devrait plus se produire en pratique), pour rester cohérent avec le reste de la fonction qui renvoie `null` en cas d'échec réseau et ne jamais faire planter le dashboard.
- Aucune modification de `HEURES_ECHANTILLON_JOUR_FUTUR` ni de la logique des jours futurs (`d > 0`) : seul le calcul du jour 0 (aujourd'hui) est concerné, conformément à la consigne.

## Phase 3 — Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur (après `npm install`, nécessaire car `node_modules` était absent au démarrage de la session ; une erreur `LayoutProps` préexistante et non liée à ce fix disparaît une fois les types générés par `next build`).
- `npm run lint` (ESLint) : ✅ aucune erreur.
- `npm run build` (`next build`) : ✅ build réussi, toutes les routes compilées sans erreur.
- Vérification manuelle de la logique (script Node reproduisant `calcIndex` avec un tableau `hourly.time` simulé sur 8 jours) : à l'heure réelle d'exécution (08:43 Europe/Paris), la chaîne calculée est `"2026-09-07T08:00"`, qui correspond à l'index `8` du tableau simulé — soit l'heure actuelle arrondie à l'heure inférieure, et non plus minuit. `previsionsHoraires[0]` correspondra donc bien à l'heure en cours (ou à l'heure pleine la plus proche déjà passée dans l'heure), jamais à une heure antérieure de plusieurs heures.
- Vérification live contre l'API Open-Meteo réelle non réalisable dans cet environnement (accès réseau sortant bloqué vers `api.open-meteo.com`, cf. Phase 1) — à confirmer en production/preview après déploiement si souhaité.
