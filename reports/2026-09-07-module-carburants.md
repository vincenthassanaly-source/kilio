# Module Carburants — stations sans plomb les moins chères autour de toi

## Objectif

Nouveau module accessible uniquement depuis la grille `/plus`, affichant les stations-service
les moins chères en carburant sans plomb (SP95, SP98, E10 — meilleur prix des trois disponibles
par station) dans un rayon de 10 km autour de la position GPS actuelle de l'utilisateur, à
partir du dataset officiel du Ministère de l'Économie (`data.economie.gouv.fr`, OpenDataSoft
Explore API v2.1, gratuit et sans clé).

## Blocage réseau en Phase 1 — décision prise avec Vincent

Le prompt demandait, avant tout code, un appel de test réel sur
`https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?limit=1`
pour découvrir le schéma exact des champs, plus un test du filtre géographique autour de
Marseille. **Cet appel a échoué** : la politique d'égress réseau de cette session Claude Code
bloque `data.economie.gouv.fr` (403 confirmé à la fois en `curl` via le proxy local et via l'outil
`WebFetch` — `EGRESS_BLOCKED`). Ce n'est pas une panne ponctuelle de l'API mais un blocage de
politique organisationnelle, donc pas quelque chose à contourner.

Vincent a été interrogé via une question à choix et a choisi de laisser coder le module avec le
schéma de champs documenté publiquement pour ce dataset (connu de ma base de connaissances,
dataset stable et largement utilisé), avec un **parsing défensif** (aucun champ supposé présent
sans vérification, aucun crash si un nom diffère) plutôt qu'attendre un déblocage réseau — le
code s'exécutera en production sur Vercel, où l'accès réseau n'est pas restreint, donc le
premier chargement réel du module vaudra vérification. **Le schéma ci-dessous n'a donc pas été
confirmé par un appel live** et reste à vérifier au premier usage réel.

### Schéma de champs supposé (non vérifié en live)

- Champ géographique : `geom` (parfois dupliqué en `geo_point_2d`), sous forme `{lat, lon}` ou
  GeoJSON `{coordinates: [lon, lat]}` — le parsing (`extraireGeoPoint` dans
  `src/app/actions/carburants.ts`) tente les deux formes sur les deux noms de champ possibles.
- Prix par carburant : `sp95_prix`, `sp98_prix`, `e10_prix` (et `gazole_prix`, `e85_prix`,
  `gplc_prix`, non utilisés ici), chacun accompagné d'un `<prefixe>_maj` (date de mise à jour).
- Adresse/ville : `adresse`, `ville`, et un nom de station `nom` (avec repli sur `adresse` si
  absent).
- `id` : identifiant de la station (chaîne ou nombre selon le format réel).

Toute valeur manquante ou de type inattendu est traitée comme absente (`null`) plutôt que de
lever une exception — une station sans aucun prix sans plomb exploitable est simplement exclue
du résultat (voir `meilleurPrixSansPlomb`/`trierParPrixCroissant`).

### Filtre géographique retenu

Paramètre `geofilter.distance=<lat>,<lon>,<rayon_metres>` sur l'endpoint `records` — syntaxe
compatible v1/v2.1 de l'API Explore OpenDataSoft, plus simple et plus robuste qu'une clause
`where=distance(...)` en ODSQL (qui suppose de connaître le nom exact et le type du champ
géométrique). **Non testée en live** pour la même raison de blocage réseau ; à confirmer au
premier chargement en prod. Rayon Kilio fixé à 10 km, converti en mètres avant l'appel.

## Fichiers créés

- **`src/lib/carburants/compute.ts`** — fonctions pures, sans accès réseau :
  - `meilleurPrixSansPlomb({sp95, sp98, e10})` → `{prix, type} | null`.
  - `trierParPrixCroissant(stations)` → trie par prix croissant, exclut les stations sans prix
    sans plomb (`meilleurPrix` nul).
  - `formaterDistance(metres)` → `"800 m"` en dessous d'1 km, `"3,2 km"` au-delà (virgule
    française, une décimale).
- **`src/app/actions/carburants.ts`** — Server Action `getStationsProches(lat, lon, rayonKm)` :
  appelle l'API avec `cache: "no-store"` (position variable à chaque appel), limite à 50
  résultats avant tri, parse chaque enregistrement de façon tolérante, réutilise les fonctions
  pures de `compute.ts` pour ne garder que les stations exploitables triées par prix. Ne lève
  jamais : renvoie `{ok: true, stations}` ou `{ok: false, erreur}` (échec réseau, statut HTTP
  non-2xx, JSON invalide — tous interceptés par un `try/catch` englobant).
- **`src/app/(app)/carburants/CarburantsView.tsx`** (`"use client"`) — logique de géolocalisation
  et affichage :
  - Au montage, `navigator.geolocation.getCurrentPosition` (timeout 10 s). Trois états gérés via
    un type `Statut` discriminé : `"chargement"`, `"prete"` (avec `positionParDefaut: boolean`),
    `"erreur"`.
  - Refus/indisponibilité de la géolocalisation → repli automatique sur Marseille
    (43.2965, 5.3698) avec bandeau "Position non disponible — résultats autour de Marseille." et
    bouton "Réessayer la géolocalisation".
  - Bouton "Actualiser" dans l'en-tête, désactivé pendant le chargement, qui relance
    `getCurrentPosition` puis l'appel serveur.
  - Chaque station est une carte-lien externe vers Google Maps
    (`https://www.google.com/maps/search/?api=1&query=<lat>,<lon>`), affichant nom, adresse,
    distance, délai de mise à jour ("mis à jour il y a Xh"/"Xj"), prix et type de carburant.
  - Détail d'implémentation : la géolocalisation est déclenchée par effet, mais l'appel
    `setState` correspondant a lieu uniquement à l'intérieur des callbacks asynchrones
    (`getCurrentPosition`, `await getStationsProches(...)`), jamais de façon synchrone dans le
    corps de l'effet — pattern repris de `HistoriqueView.tsx` (module Habitudes) pour rester
    conforme à la règle ESLint `react-hooks/set-state-in-effect`. Le bouton "Actualiser"
    redéclenche l'effet via un compteur `declencheur` plutôt que d'exposer une fonction
    mémoïsée appelée directement dans l'effet.
- **`src/app/(app)/carburants/page.tsx`** — Server Component minimal, rend `<CarburantsView />`
  (tout le fetch se fait côté client ici, seul module dans ce cas, à cause de la dépendance à la
  géolocalisation navigateur).

## Fichiers modifiés

- **`src/lib/navigation/registry.ts`** :
  - `CARBURANTS_ICON` (pompe à essence stylisée, tracés géométriques à la main, même convention
    que les autres icônes du fichier).
  - Entrée `{ href: "/carburants", label: "Carburants", ... }` ajoutée à la fin de `NAV_ITEMS`,
    après `Réglages` — c'est cette entrée, et uniquement elle, qui rend le module accessible
    (grille `/plus`, résolue automatiquement par `resolveOrdreGrillePlus` dans
    `src/app/actions/preferences-navigation.ts` sans autre changement nécessaire).
- **`src/app/globals.css`** : `--accent-carburants` (clair `oklch(0.55 0.14 120)`, sombre
  `oklch(0.72 0.13 120)` — teinte 120° inutilisée, dans le plus grand espace libre de la roue
  OKLCH entre les teintes déjà prises) + `--color-carburants` dans le mapping `@theme inline`.

## Non modifié (conforme au prompt)

`src/app/(app)/DashboardView.tsx` et `src/app/(app)/page.tsx` n'ont subi aucune modification
(`git diff` vide sur ces deux fichiers) — le module est invisible depuis l'accueil, accessible
uniquement via sa tuile dans `/plus`.

## Vérifications (Phase 3)

- `npm install` — le dépôt n'avait pas de `node_modules` au démarrage de la session.
- `npx tsc --noEmit` : ✅ (une seule erreur pré-existante et sans rapport,
  `layout.tsx(41,50): Cannot find name 'LayoutProps'`, confirmée présente aussi sur la branche
  `kilio` sans mes changements — type généré par `next build`, absent avant un premier build).
- `npx eslint .` : ✅ aucune erreur ni warning sur l'ensemble du dépôt.
- `npm run build` : ✅ build de production réussi, route `/carburants` générée (dynamique, `ƒ`).

## Limitations connues

- **Schéma de champs et syntaxe `geofilter.distance` non vérifiés par un appel API réel** (voir
  section "Blocage réseau" ci-dessus) — à valider au premier chargement du module en prod ; si
  un nom de champ diffère de ce qui est supposé, `getStationsProches` renverra une liste vide
  plutôt qu'une erreur franche (comportement défensif voulu, mais qui peut masquer un souci de
  parsing plutôt qu'une réelle absence de stations à proximité).
- Pas de vérification visuelle dans un navigateur réel (géolocalisation, rendu des cartes
  station) : validé uniquement par relecture de code, `tsc`, `eslint` et `next build`.
