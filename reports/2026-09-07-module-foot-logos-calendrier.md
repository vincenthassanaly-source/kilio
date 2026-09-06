# Module Foot — logos d'équipes + bande de dates J-7/J+7 (style Onefootball)

## Fichiers modifiés

- `src/lib/foot/compute.ts` — `FixtureApiFootball.teams.{home,away}.logo`, `MatchFoot.{logoDomicile,logoExterieur}`, `saisonCourante()`, `formatDateParis()`, `formatEtiquetteJour()`, `genererFenetreDates()`, `grouperFixturesParJour()` (regroupe par jour puis compétition, en réutilisant `grouperFixturesParCompetition` par jour).
- `src/app/actions/foot.ts` — remplace `getResultatsFootDuJour()` par `getResultatsFootFenetre()` : 13 appels `fetch` en parallèle (un par compétition, `league=<id>&season=<saisonCourante()>&from=<J-7>&to=<J+7>`), `cache: "no-store"`, erreurs partielles par compétition sans faire échouer toute la page.
- `src/app/(app)/foot/page.tsx` — appelle `getResultatsFootFenetre()`, passe les 15 jours au nouveau `FootDayNavigator`.
- `src/app/(app)/foot/FootRetryButton.tsx` — commentaire mis à jour (référence à `getResultatsFootFenetre`), comportement inchangé (`router.refresh()`).

## Fichiers créés

- `src/app/(app)/foot/FootDayNavigator.tsx` (`"use client"`) — bande horizontale scrollable des 15 jours (J-7 à J+7), "Aujourd'hui" mis en avant et centré au montage (`scrollIntoView({ inline: "center" })`), sélection au clic, filtrage **côté client** des matchs du jour sélectionné (aucun nouvel appel réseau), affichage discret des erreurs partielles le cas échéant.
- `src/app/(app)/foot/FootMatchRow.tsx` (`"use client"`) — ligne de match extraite de `page.tsx`, avec logo par équipe (`<img loading="lazy">`, masqué proprement via `onError` si l'URL est cassée).

## ⚠️ Vérifications en conditions réelles : toujours impossibles depuis cette session

Comme lors du module V1 (2026-09-06), **aucune vérification live n'a pu être faite** :
- pas de `API_FOOTBALL_KEY` dans cet environnement (confirmé : `process.env.API_FOOTBALL_KEY` → `undefined`, aucun `.env*` présent) ;
- réseau sortant vers `v3.football.api-sports.io` bloqué (confirmé à nouveau : `curl` → timeout, `HTTP_STATUS:000`).

**Vincent a explicitement demandé de procéder sans cette vérification live**, en se basant sur la documentation publique et en signalant clairement ce qui reste à confirmer. Détail des 4 points demandés en Phase 1 :

| Point à vérifier | Statut | Détail |
|---|---|---|
| 1. `teams.home.logo` / `teams.away.logo` présents dans `/fixtures` | Non testé en direct, très probable | Comportement documenté et largement utilisé (URLs `media.api-sports.io/football/teams/<id>.png`) ; le code traite `logo` comme `string \| null` et l'UI masque l'image proprement si absente ou cassée (`onError`), donc sans risque même si un champ est `null` sur certains matchs. |
| 2. Combinaison `league=<id>&season=<année>&from=<date>&to=<date>` sur `/fixtures` | Non testé en direct, confirmé par la doc | La page officielle de documentation API-Football (`api-football.com/documentation-v3`) liste explicitement le filtrage par plage `from`/`to` combiné à `league`/`season` comme un usage standard de l'endpoint `/fixtures` ("la plupart des paramètres de cet endpoint peuvent être combinés"). |
| 3. Valeur de `season` attendue en septembre 2026 | Non testé en direct, logique appliquée | `saisonCourante()` retourne l'année de début de saison (mois ≥ juillet ⇒ année courante, sinon année précédente) : **2026** pour toute date entre juillet 2026 et juin 2027. Vérifié par script (voir plus bas) sur plusieurs dates (sept. 2026 → 2026, mars 2027 → 2026). À confirmer par Vincent une fois la clé active : certaines compétitions (notamment les coupes nationales) utilisent parfois un `season` légèrement différent de celui des championnats — un simple test `/fixtures?league=66&season=2026&from=...&to=...` (Coupe de France) suffira à vérifier. |
| 4. ID Conference League (848) | **Toujours non recoupé par une 2ᵉ source indépendante** | Deux nouvelles recherches web n'ont trouvé aucune source tierce citant explicitement l'ID 848 pour l'API-Football (contrairement aux 12 autres IDs, chacun recoupé par au moins 2 sources). La valeur reste celle utilisée depuis le rapport du 2026-09-06. **Action recommandée inchangée** : `GET /leagues?search=Conference` une fois la clé disponible. |

## Nombre d'appels API par chargement complet de la page

**13 requêtes** par chargement ou rafraîchissement manuel de `/foot` — une par compétition suivie (`Promise.all` sur `COMPETITIONS_FOOT`), chacune couvrant toute la fenêtre de 15 jours en un seul appel (`from`/`to`). Sur le plan gratuit (100 requêtes/jour), cela permet **~7 rafraîchissements par jour maximum**. Ce coût est documenté dans un commentaire au-dessus de `getResultatsFootFenetre()`.

Alternative écartée : un appel par date (15 requêtes `date=<jour>`, sans filtre par compétition côté API, nécessitant de filtrer manuellement un volume de fixtures bien plus large parmi *toutes* les compétitions mondiales du jour) — plus coûteuse en quota (15 > 13) et plus lourde à traiter côté serveur.

## Compétitions en erreur lors des tests

Aucune — aucun test réel n'a pu être exécuté (cf. ci-dessus). La gestion d'erreur par compétition (`erreursPartielles`) n'a donc été validée que par relecture de code et par le typage, pas en conditions réelles.

## Décisions techniques

- **Logos en `<img>` classique**, pas `next/image` : `media.api-sports.io` n'est pas dans `images.remotePatterns` de `next.config.ts` (seul `vsmtkopkqasrdnjceegp.supabase.co` y figure). Ajouter ce domaine était possible mais risqué sans pouvoir confirmer en direct le(s) chemin(s) d'URL exact(s) que retourne l'API pour les logos — une balise `<img loading="lazy">` avec `onError` masquant l'image cassée est la solution de repli explicitement prévue par la consigne, sans configuration supplémentaire à valider à l'aveugle.
- **Regroupement par jour** : `grouperFixturesParJour` filtre les fixtures sur le **jour calendaire Europe/Paris du coup d'envoi** (`formatDateParis(new Date(fixture.date))`), pas sur la date UTC brute — important car un match à 21h Paris peut tomber le lendemain en UTC.
- **Génération de la fenêtre de dates** ancrée à midi UTC (`T12:00:00Z`) avant d'ajouter/soustraire des jours en UTC, pour ne jamais glisser d'un jour lors d'un changement d'heure (DST) : vérifié par script autour du 29 mars 2026 (bascule CET→CEST), aucune date dupliquée ni sautée sur les 15 jours générés.
- **Filtrage 100% client** dans `FootDayNavigator` : un seul chargement serveur pour toute la fenêtre, le clic sur un autre jour ne relance aucun `fetch`.

## Vérifications automatisées

- `tsc --noEmit` : ✅ aucune erreur.
- `eslint .` : ✅ aucune erreur (un avertissement de directive `eslint-disable` inutile a été corrigé pendant le développement).
- `npm run build` : ✅ build réussi, `/foot` reste une route dynamique (`ƒ`), cohérent avec `cache: "no-store"`.
- Script Node autonome (hors suite du projet, dans le scratchpad de session) validant `saisonCourante`, `genererFenetreDates` et `formatEtiquetteJour` sur plusieurs dates de référence, dont la bascule DST de mars 2026 : 15 dates uniques et consécutives, aucun décalage.

## Non testé

- Rendu visuel réel de la bande de dates et des logos avec de vraies données (toujours pas de clé `API_FOOTBALL_KEY` disponible dans cet environnement de session).
- Comportement réel de `/leagues` pour la Conference League et pour la valeur de `season` sur les coupes nationales — à faire par Vincent une fois la clé active, voir tableau ci-dessus.
- Défilement tactile / `scrollIntoView` de la bande de dates sur un vrai appareil mobile (pas de navigateur disponible dans cet environnement).
