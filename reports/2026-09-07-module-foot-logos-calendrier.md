# Module Foot — logos d'équipes + bande de dates J-7/J+7 (style Onefootball)

> **État final (voir Addendum 3 ci-dessous)** : la stratégie décrite dans le corps de ce rapport (13 appels `league`+`season`, un par compétition) a dû être abandonnée — elle est incompatible avec le plan gratuit API-Football. La stratégie réellement en place est **3 appels `date=<jour>` (hier/aujourd'hui/demain uniquement, sans `league` ni `season`)**, filtrés côté serveur sur les 13 compétitions suivies ; les 12 autres jours de la bande de navigation restent affichés mais non interrogés (`disponible: false`). Le corps du rapport ci-dessous documente le raisonnement initial et reste utile pour comprendre les choix (logos, bande de dates, regroupement par jour), mais la section "stratégie API" doit être lue à la lumière des Addendums 2 et 3.

## Addendum : correction post-déploiement (13 appels en parallèle → tous en erreur)

Vincent a testé la page réelle et est tombé sur "Impossible de contacter API-Football (quota dépassé ou problème réseau)" alors que son tableau de bord API-Football n'affichait que **3% d'utilisation du quota journalier** — donc clairement pas un quota de 100/jour dépassé.

**Cause identifiée** : `getResultatsFootFenetre()` envoyait ses 13 requêtes (une par compétition) via `Promise.all`, donc en rafale quasi simultanée. Or le plan gratuit API-Football est aussi limité à **10 requêtes par minute**, en plus des 100/jour (confirmé par plusieurs sources indépendantes : documentation API-Football elle-même, et des tiers documentant les paliers de plan — 10/min pour le plan gratuit, 300/min pour Pro, etc.). Une rafale de 13 appels simultanés dépasse cette limite par minute et fait échouer une grande partie, voire la totalité, des appels avec un `429` — sans consommer le quota journalier de façon visible, ce qui correspond exactement à ce que Vincent a observé.

**Correctif appliqué** (`src/app/actions/foot.ts`) : les 13 appels sont désormais **séquentiels**, espacés de 350 ms chacun (`DELAI_ENTRE_APPELS_MS`), au lieu d'un `Promise.all`. Cela réduit fortement le risque de tout casser d'un coup ; si malgré tout une poignée de compétitions se fait encore limiter en fin de séquence (rafale de 13 en quelques secondes, potentiellement encore au-dessus de 10/min selon la façon exacte dont la fenêtre glissante est appliquée côté API), le mécanisme d'erreurs partielles déjà en place absorbe le problème : ces compétitions sont simplement absentes des résultats et leur erreur apparaît en petit texte, sans faire planter toute la page — contrairement au scénario observé où la totalité des 13 échouait en même temps.

**Contrepartie** : le chargement de `/foot` prend maintenant quelques secondes de plus (environ 5 à 10 secondes au lieu d'un temps quasi instantané), le temps que les 13 appels s'enchaînent avec leur délai. Compromis assumé pour ne plus casser la page entière — cohérent avec le principe du module (un seul chargement à l'ouverture/rafraîchissement manuel, jamais de polling).

**Toujours non testé en direct** : cette correction n'a pas pu être re-testée dans cet environnement (mêmes limitations réseau que le reste du module). Vincent doit revalider que `/foot` charge correctement après ce correctif, et signaler si des compétitions individuelles continuent d'apparaître en erreur de façon récurrente (auquel cas le délai de 350 ms devra être augmenté).

## Addendum 2 : la sérialisation ne suffisait pas — vraie cause trouvée via diagnostic à l'écran

Le correctif ci-dessus n'a pas résolu le problème (toujours le même échec total). N'ayant pas accès aux logs serveur/Vercel depuis cette session, `chargerFixturesCompetition` a été modifié pour remonter le code HTTP réel et un extrait du corps de réponse directement dans le message d'erreur affiché à l'écran, afin d'obtenir un vrai diagnostic sans deviner davantage.

**Résultat** : le message réel renvoyé par API-Football pour `league=61&season=2026&from=...&to=...` (Ligue 1) était :

```
{"plan":"Free plans do not have access to this season, try from 2022 to 2024."}
```

**Cause réelle** : la combinaison `league=<id>&season=<année>` est une fonctionnalité payante sur API-Football — le plan gratuit ne donne accès qu'aux saisons 2022 à 2024 via ce filtre, quelle que soit la compétition. La stratégie "13 appels, un par compétition, avec `season=<année en cours>`" prévue en Phase 2 du prompt initial est donc **incompatible avec le plan gratuit**, indépendamment de tout problème de débit/rafale : chaque appel échouait avec ce message, systématiquement, dès le premier essai — la sérialisation n'y changeait rien.

**Correctif appliqué** (`src/app/actions/foot.ts`, `src/lib/foot/compute.ts`) : retour à une stratégie **par jour** plutôt que par compétition, seul filtrage réellement disponible sur le plan gratuit (c'est aussi celui de la V1 du 2026-09-06, qui n'utilisait ni `league` ni `season`) :
- **15 appels** `fixtures?date=<jour>` (sans `league` ni `season`), un par jour de la fenêtre J-7/J+7, filtrés côté serveur sur les 13 compétitions suivies après réception.
- `saisonCourante()` retirée de `compute.ts` (devenue inutile, plus aucun appel n'utilise `season`).
- Appels toujours séquentiels et espacés de 350 ms (`DELAI_ENTRE_APPELS_MS`) pour respecter la limite de 10 requêtes/minute du plan gratuit, cause probable d'un éventuel échec partiel résiduel (mais plus d'échec total garanti, contrairement au problème de `season`).
- Nouveauté : les 15 jours sont récupérés dans un **ordre "Aujourd'hui d'abord, puis en s'écartant"** (`ordreRecuperation`) plutôt que chronologique J-7→J+7, pour que si le débit limite malgré tout une partie des appels, ce soit les jours extrêmes (J-7/J+7) qui soient sacrifiés en priorité plutôt qu'"Aujourd'hui".
- Coût : 15 requêtes par chargement/rafraîchissement ⇒ ~6 rafraîchissements/jour max sur le plan gratuit (100/jour), légèrement revu à la baisse par rapport aux ~7/jour annoncés avec la stratégie à 13 appels.

**Enseignement pour la suite** : la documentation publique consultée pendant ce module (recherches web, sans accès direct aux pages officielles bloquées par le proxy réseau) ne mentionnait nulle part cette restriction de saison sur le plan gratuit — elle n'a été découverte qu'en récupérant le message d'erreur réel renvoyé en production. Toute stratégie d'appel API-Football future utilisant `league`+`season` devra être testée en conditions réelles (ou son message d'erreur explicitement vérifié) avant d'être considérée fiable sur ce plan gratuit.

**Toujours non testé en direct** par cette session (mêmes limitations réseau). Vincent doit revalider `/foot` après ce correctif.


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

## Addendum 3 : `date=` est aussi restreint sur le plan gratuit — retour à 3 jours réellement interrogés

Après le correctif de l'Addendum 2 (passage à 15 appels `date=<jour>`), Vincent a confirmé que la page fonctionnait — de vrais matchs s'affichaient (ex. Estac Troyes en Ligue 1). Mais un message diagnostic s'affichait au-dessus des résultats, listant 12 journées en erreur avec le même détail :

```
{"plan":"Free plans do not have access to this date, try from 2026-09-05 to 2026-09-07."}
```

**Cause** : le plan gratuit API-Football restreint aussi le filtre `date=` à une fenêtre glissante étroite autour d'aujourd'hui — hier, aujourd'hui, demain (3 jours), pas plus. Interroger les 12 autres jours de la bande J-7/J+7 échouait donc systématiquement, à chaque chargement, en pure perte de quota (12 des 15 appels ne pouvaient jamais réussir).

**Correctif appliqué** :
- `src/app/actions/foot.ts` n'interroge plus que les **3 jours réellement accessibles** (`JOURS_ACCESSIBLES_PLAN_GRATUIT = 1`, soit ±1 jour) au lieu des 15 jours de la bande affichée. Coût réel : **3 requêtes par chargement/rafraîchissement** ⇒ jusqu'à ~33 rafraîchissements/jour possibles sur le plan gratuit (100/jour), bien mieux que les ~6-7/jour des stratégies précédentes.
- Les 12 autres jours de la bande de navigation (J-7 à J-2 et J+2 à J+7) restent affichés dans l'interface — Vincent avait explicitement demandé le style Onefootball à 15 jours — mais ne déclenchent plus aucun appel réseau. `JourFoot` porte désormais un champ `disponible: boolean` : `grouperFixturesParJour()` le renseigne à partir de l'ensemble des dates réellement interrogées, et `FootDayNavigator` affiche un message dédié ("Ce jour n'est pas consultable sur le plan gratuit API-Football...") au lieu de "Aucun match ce jour-là", plus une chip visuellement atténuée (opacité réduite) pour les jours non disponibles.
- **Subtilité fuseau horaire** : le message d'erreur ("try from 2026-09-05 to 2026-09-07") a été observé un test fait vers 01h du matin heure de Paris le 2026-09-06/07, et correspond au jour **UTC**, pas Europe/Paris (qui aurait déjà basculé au jour suivant à cette heure-là). La fenêtre des 3 jours réellement interrogée (`genererFenetreAccessiblePlanGratuit` dans `actions/foot.ts`) est donc calculée sur le jour UTC du serveur, pas sur `formatDateParis` comme le reste du module. Paris étant toujours en avance ou égal à UTC (jamais en retard), le jour affiché comme "Aujourd'hui" (calculé en Europe/Paris pour l'affichage) tombe toujours dans cette fenêtre UTC — vérifié par le raisonnement mais pas par un test réel à l'heure de la bascule.

**Limite fonctionnelle à signaler à Vincent** : avec cette double restriction du plan gratuit (season sur `league`, fenêtre de 3 jours sur `date`), la "bande de navigation façon Onefootball allant de J-7 à J+7" demandée en Phase 2 du prompt initial **n'est consultable qu'à hauteur de 3 jours sur 15** avec la clé actuelle. Les 12 autres jours resteront vides avec le message "non consultable sur le plan gratuit" tant que le plan API-Football n'est pas mis à niveau (plan payant). L'interface reste prête à afficher ces jours automatiquement si Vincent passe un jour à un plan supérieur — aucun changement de code ne serait nécessaire au-delà d'augmenter `JOURS_ACCESSIBLES_PLAN_GRATUIT`.

**Toujours non re-testé en direct par cette session** (mêmes limitations réseau). Vincent doit revalider que `/foot` n'affiche plus le message diagnostic pour les 12 jours hors fenêtre, et que la fenêtre UTC couvre bien correctement "Aujourd'hui" à toute heure.
