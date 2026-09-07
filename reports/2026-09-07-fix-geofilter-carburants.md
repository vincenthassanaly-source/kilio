# Carburants — correction du filtre géographique (mauvaise syntaxe d'API)

## Cause racine confirmée

L'appel API utilisait `geofilter.distance=<lat>,<lon>,<rayonMetres>`, un paramètre de l'**API
Search v1** d'OpenDataSoft. Or l'URL appelée cible l'**Explore API v2.1**
(`/api/explore/v2.1/catalog/datasets/.../records`), qui ne connaît pas ce paramètre. Confirmé par
la doc officielle OpenDataSoft (changelog v2.0 → v2.1, help.opendatasoft.com/apis/ods-explore-v2/) :
`geofilter.distance` a été remplacé par le langage ODSQL, filtre géographique exprimé dans le
paramètre `where` via la fonction `within_distance(<champ_geo>, geom'POINT(<lon> <lat>)',
<distance>km)`.

Conséquence du bug : le paramètre `geofilter.distance` étant inconnu de cette version d'API, il
était **silencieusement ignoré** par le serveur — aucune erreur, juste un filtrage qui ne
filtrait rien. L'API renvoyait ses 50 premiers résultats dans un ordre non géographique (sans
doute alphabétique ou par identifiant), d'où des stations à plusieurs centaines de kilomètres. Le
filtrage défensif ajouté au tour précédent (recalcul de la distance réelle + exclusion hors
rayon) ne faisait alors que garder les rares stations tombées par hasard dans le rayon parmi ces
50 résultats non géolocalisés — d'où très peu, voire aucun résultat selon le tirage : un symptôme
cohérent avec ce diagnostic.

## Correction appliquée

`src/app/actions/carburants.ts`, dans `getStationsProches` :

```ts
const where = `within_distance(geom, geom'POINT(${lon} ${lat})', ${rayonKm}km)`;
const url = `${DATASET_URL}?limit=${LIMITE_RESULTATS}&where=${encodeURIComponent(where)}`;
```

- Remplace l'ancien `geofilter.distance=${lat},${lon},${rayonMetres}`.
- **Ordre `lon lat`** dans `POINT(...)` (et non `lat lon`) — point de vigilance explicite du
  prompt, respecté.
- `encodeURIComponent` appliqué uniquement à la valeur de `where`, pas à l'URL entière, pour ne
  pas casser le paramètre `limit` voisin. Vérifié par simulation locale (Node) : le `where`
  encodé produit bien `within_distance(geom%2C%20geom'POINT(5.3698%2043.2965)'%2C%2010km)`, avec
  `limit=50` intact juste avant.
- `limit=50` conservé tel quel — pas de changement, la remarque du prompt ("probable que 50 reste
  suffisant, la zone couverte sera plus dense en résultats pertinents") n'appelait pas de
  modification de code, seulement une vérification en conditions réelles qui reste à faire (voir
  ci-dessous).
- Le filtrage défensif par distance (`MARGE_DISTANCE = 1.1`, exclusion des stations hors rayon)
  est conservé **intégralement inchangé**, comme demandé : il reste un garde-fou utile si
  `within_distance` se comportait différemment de l'attendu, ou si le nom du champ géographique
  (`geom`) s'avérait finalement incorrect — auquel cas `extraireGeoPoint` échouerait à extraire un
  point, excluant la station de la liste plutôt que de l'afficher à une mauvaise distance.
- Commentaire en tête de fichier réécrit pour expliquer la cause racine réelle (mauvaise version
  d'API — paramètre v1 sur une API v2.1) plutôt que l'ancienne hypothèse ("jamais vérifié faute
  d'accès réseau") comme explication principale du bug. L'accès réseau bloqué reste mentionné,
  mais uniquement comme raison pour laquelle le **nom exact du champ géographique** et les **noms
  des champs de prix** restent non vérifiés — plus comme explication du bug de distance lui-même,
  qui est maintenant élucidé indépendamment de tout accès réseau (lecture de la documentation
  publique d'OpenDataSoft).

## Résultat de la vérification réseau — nouvel échec 403

Tentative en tout premier, avant toute modification de code, avec l'URL de test fournie dans le
prompt (`within_distance(geom, geom'POINT(5.3698 43.2965)', 10km)` autour de Marseille) :

- `curl` via le proxy local (`$HTTPS_PROXY`) → `CONNECT tunnel failed, response 403`.
- Outil `WebFetch` → `{"error_type":"EGRESS_BLOCKED","domain":"data.economie.gouv.fr", ...}`.

C'est la **troisième tentative consécutive**, sur trois sessions différentes, avec le même
résultat : blocage par la politique d'égress de l'organisation sur ce domaine, pas une panne
ponctuelle. Conformément à la consigne du prompt en cas de nouvel échec, le travail n'est pas resté
bloqué sur ce point : la correction a été implémentée avec `geom` comme hypothèse de nom de champ
géographique (déjà en place depuis la création du module, conservée telle quelle), sans nouvelle
tentative de contournement (pas de domaine miroir essayé).

## Statut du nom de champ géographique — toujours hypothétique

**Non vérifié.** `geom` reste une hypothèse documentée (cohérente avec un export GeoJSON standard
pour ce type de dataset), non confirmée par un appel réel. Deux conséquences pratiques si cette
hypothèse s'avérait fausse en prod :

1. Le champ géographique réel porte un autre nom (`geo_point_2d` est déjà tenté en repli par
   `extraireGeoPoint`, donc partiellement couvert) : `within_distance(geom, ...)` échouerait alors
   côté API (erreur ODSQL sur un champ inexistant) — visible immédiatement via un statut HTTP
   non-2xx, remonté proprement par `getStationsProches` sous forme de `{ok: false, erreur}`,
   jamais un plantage silencieux.
2. Le champ existe mais avec une forme de valeur imprévue : `extraireGeoPoint` ne trouve pas de
   coordonnées exploitables, la station est simplement exclue de la liste (comportement dégradé
   déjà en place, inchangé par cette correction).

Dans les deux cas, le comportement reste sûr (erreur explicite ou liste vide) plutôt qu'une donnée
fausse affichée à Vincent.

## Phase 3 — Vérification

- `npx tsc --noEmit` : ✅ (même erreur pré-existante et sans rapport,
  `layout.tsx(41,50): Cannot find name 'LayoutProps'`, déjà documentée dans les rapports
  précédents — absente après un premier `next build`).
- `npx eslint .` : ✅ aucune erreur ni warning sur l'ensemble du dépôt.
- `npm run build` : ✅ build de production réussi, route `/carburants` toujours générée
  (dynamique, `ƒ`).
- **Vérification "10 km depuis Marseille → stations ≤ 10 km, nombre raisonnable"** : non
  réalisable en conditions réelles (accès réseau à l'API toujours bloqué, voir ci-dessus). Reste à
  valider par Vincent lors du premier chargement réel en prod (Vercel, sans restriction réseau).

## Limitations connues

- Correction basée sur la documentation officielle OpenDataSoft (changelog + doc ODSQL), jamais
  exécutée contre l'API réelle du dataset — troisième tentative de vérification live infructueuse
  d'affilée.
- Le filtrage défensif par distance (garde-fou côté serveur ajouté au tour précédent) reste la
  seule garantie *vérifiable par lecture de code* que Vincent ne verra jamais de station hors
  rayon, indépendamment de la réussite ou non de `within_distance` côté API.
