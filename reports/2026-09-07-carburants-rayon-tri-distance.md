# Carburants — retrait de la description de tuile, rayon réglable, tri distance/prix

## Objectif

Corriger deux problèmes signalés par Vincent sur le module Carburants : le sous-titre indésirable
sous la tuile `/plus`, et des distances aberrantes (ex. 671 km) dans la liste des stations — dues
au fait que le filtre géographique de l'appel API (`geofilter.distance`) n'avait jamais été
vérifié en conditions réelles. Ajout au passage d'un rayon réglable (5/10/20/50 km) et d'un tri
distance/prix, comme demandé.

## Phase 1 — nouvelle tentative de vérification live de l'API

Le prompt indiquait que l'accès réseau sortant serait disponible dans cette session Claude Code,
contrairement à la session où le module a été écrit initialement. **Ce n'était pas le cas** :
`https://data.economie.gouv.fr/...` est toujours bloqué par la politique d'égress de
l'organisation — confirmé à nouveau par deux voies indépendantes :

- `curl` via le proxy local (`$HTTPS_PROXY`) → `CONNECT tunnel failed, response 403`.
- L'outil `WebFetch` → `{"error_type":"EGRESS_BLOCKED","domain":"data.economie.gouv.fr", ...}`.
- Le statut du proxy (`$HTTPS_PROXY/__agentproxy/status`) confirme un `connect_rejected` avec
  `"detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)"` pour
  `data.economie.gouv.fr:443`, identique au blocage rencontré lors de l'écriture initiale du
  module (voir `reports/2026-09-07-module-carburants.md`).

Ce n'est donc toujours pas une panne ponctuelle mais une politique organisationnelle stable sur ce
domaine, qui n'a pas à être contournée (pas d'essai d'un domaine miroir alternatif). **Le schéma
exact des champs et la syntaxe précise de `geofilter.distance` restent donc non vérifiés en
live**, pour la deuxième fois consécutive.

### Changement d'approche : ne plus dépendre de la vérification live pour la correctness

Plutôt que d'attendre un déblocage réseau hypothétique, la correction s'appuie sur un principe
différent : **ne plus jamais faire confiance au filtrage géographique de l'API**, quel que soit le
nom exact du paramètre ou sa syntaxe. `getStationsProches` recalcule désormais `distanceMetres`
pour chaque station à partir des coordonnées réellement extraites (`extraireGeoPoint`, inchangé)
et **exclut lui-même toute station au-delà du rayon demandé** (+ 10 % de marge pour absorber
l'imprécision de géocodage, pas pour couvrir un filtre API défaillant à grande échelle — voir
Phase 2.C). Résultat : que `geofilter.distance` fonctionne, soit ignoré silencieusement par l'API,
ou ait un nom de paramètre différent, un module toujours correct dans son rayon annoncé, le bug
des 671 km ne pouvant plus se reproduire quelle que soit la cause exacte côté API. Seule
l'extraction du point géographique (`extraireGeoPoint`) reste non vérifiée et donc potentiellement
en cause si aucune station n'apparaît jamais (plutôt qu'apparaître à une mauvaise distance).

## Phase 2 — Implémentation

### A. Retrait du sous-titre de la tuile

- `src/lib/navigation/registry.ts` : suppression de la propriété `description` sur l'entrée
  `href: "/carburants"` (les 10 autres entrées, toutes avec `description`, ne sont pas touchées).
- `src/components/ModulesGrid.tsx` : le `<p>` de description n'est désormais rendu que si
  `mod.description` est défini (`{mod.description && <p>...</p>}`), au lieu d'un `<p>` toujours
  présent (qui aurait affiché une chaîne vide sans casser visuellement la tuile, `description`
  étant déjà optionnelle côté type — mais un rendu conditionnel est plus correct que de compter
  sur `undefined` à l'intérieur d'un `<p>`). Aucune autre tuile n'est affectée puisque toutes les
  autres définissent `description`.

### B. Rayon réglable (5 / 10 / 20 / 50 km)

- `CarburantsView.tsx` : `RAYON_KM` (constante fixe) remplacé par un état `rayonKm`, initialisé
  via l'initialiseur paresseux de `useState` en lisant `localStorage` (clé
  `kilio-carburants-rayon`), avec repli sur `RAYON_DEFAUT_KM = 10` si la valeur stockée est
  absente, invalide, ou si `localStorage` est inaccessible (navigation privée stricte — lecture
  toujours entourée d'un `try/catch`).
- Sélecteur à 4 boutons (5/10/20/50 km) en pilule, même style que `NutritionSubNav.tsx`
  (conteneur `bg-surface-alt p-1`, bouton actif en `bg-carburants text-white` — la classe utilitaire
  `bg-carburants` provient de `--color-carburants` déjà ajouté dans `globals.css` lors de la
  création du module).
- `rayonKm` est dans le tableau de dépendances de l'effet de recherche : le changer redéclenche
  automatiquement la géolocalisation + l'appel serveur, exactement comme le bouton "Actualiser"
  (conforme à la consigne). Le message "Aucune station... dans un rayon de X km" utilise
  désormais `rayonKm` (dynamique) au lieu de l'ancienne constante.

### C. Filtrage défensif par distance côté serveur

- `src/app/actions/carburants.ts` : après calcul de `distanceMetres` pour chaque station
  exploitable, une étape de filtre exclut toute station dont `distanceMetres` dépasse
  `rayonKm * 1000 * 1.1` (marge de 10 %) — indépendamment de ce que l'API a réellement filtré
  côté serveur. C'est ce filtre, et non la correction du paramètre `geofilter.distance` (non
  vérifiable), qui règle concrètement le bug des stations à 671 km.
- Commentaire de tête de fichier mis à jour pour expliquer que la fiabilité du module ne dépend
  plus de la syntaxe exacte du filtre géographique côté API.

### D. Tri distance/prix

- `src/lib/carburants/compute.ts` — **changement de design par rapport au prompt initial** (voir
  "Décision technique" ci-dessous) : `trierParPrixCroissant` et la nouvelle
  `trierParDistanceCroissante` ne filtrent plus rien elles-mêmes ; une fonction séparée,
  `exclureSansPrixSansPlomb`, porte désormais l'exclusion des stations sans prix sans plomb
  (appliquée une seule fois, côté serveur, avant la construction de la liste finale). Les deux
  fonctions de tri opèrent sur des stations déjà résolues (`meilleurPrix: number`,
  `distanceMetres: number`), ce qui les rend réutilisables telles quelles côté client, sur le
  type `StationCarburant` final — sans quoi leur ancienne signature (`meilleurPrix: MeilleurPrix |
  null`) ne correspondait pas à la forme aplatie exposée par `getStationsProches`.
- `CarburantsView.tsx` : état `triPar: "distance" | "prix"` (défaut `"distance"`), persisté en
  `localStorage` (clé `kilio-carburants-tri`), même mécanisme d'initialisation paresseuse que le
  rayon. Toggle à deux boutons ("Trier par distance" / "Trier par prix"), même style de pilule que
  le sélecteur de rayon, juste en dessous. Le tri est appliqué sur `statut.stations` via
  `trierParDistanceCroissante`/`trierParPrixCroissant` juste avant le rendu de la liste — pas de
  nouvel appel serveur, la liste déjà chargée est simplement réordonnée côté client.

### Décision technique — pourquoi `exclureSansPrixSansPlomb` plutôt que réutiliser le filtre intégré aux deux tris

Le prompt suggérait d'ajouter `trierParDistanceCroissante` avec "même filtre que
`trierParPrixCroissant`" (donc en gardant sa signature d'origine, opérant sur
`{meilleurPrix: MeilleurPrix | null}` et filtrant les `null` avant de trier). En l'implémentant
ainsi, le typage ne collait plus avec l'usage réel prévu côté client : `CarburantsView` doit
re-trier `StationCarburant[]`, dont `meilleurPrix` est un simple `number` (déjà résolu, plus de
`null` possible à ce stade — l'exclusion a déjà eu lieu côté serveur). Réutiliser la fonction
"filtrante" telle quelle aurait nécessité de reconstruire artificiellement un objet
`{prix, type}` imbriqué juste pour satisfaire le type générique, puis de le déconstruire ensuite
pour l'affichage — complexité ajoutée sans bénéfice. Séparer clairement filtrage (une fois, tôt,
côté serveur) et tri (potentiellement plusieurs fois, y compris côté client) est plus simple et
plus conforme à l'esprit "fonctions pures réutilisables" du module.

## Phase 3 — Vérification

- `npx tsc --noEmit` : ✅ (même erreur pré-existante et sans rapport que lors de la création du
  module, `layout.tsx(41,50): Cannot find name 'LayoutProps'`, absente après un premier
  `next build`).
- `npx eslint .` : ✅ aucune erreur ni warning sur l'ensemble du dépôt. Point notable : la lecture
  de `localStorage` pour `rayonKm`/`triPar` a dû passer par l'initialiseur paresseux de
  `useState` plutôt que par un `useEffect` de montage — la règle `react-hooks/set-state-in-effect`
  (déjà rencontrée lors de la création du module pour la géolocalisation) rejette tout `setState`
  synchrone dans le corps d'un effet, y compris pour un chargement one-shot de préférences.
- `npm run build` : ✅ build de production réussi, route `/carburants` toujours générée
  (dynamique, `ƒ`).
- **Vérification manuelle de la cohérence distance/rayon** : non réalisable en conditions réelles
  (accès réseau à l'API toujours bloqué, voir Phase 1) — le filet de sécurité côté serveur
  (Phase 2.C) est une garantie *structurelle* (toute station renvoyée par `getStationsProches` a,
  par construction, `distanceMetres <= rayonKm * 1000 * 1.1`), vérifiable par lecture de code
  plutôt que par test live. Reste à confirmer en prod que des stations sont effectivement
  retournées (dépend de la correction d'`extraireGeoPoint`, toujours non vérifiée).

## Limitations connues

- Le schéma des champs (`geom`/`geo_point_2d`, `sp95_prix`, etc.) et la syntaxe de
  `geofilter.distance` restent non vérifiés par un appel API réel, pour la deuxième fois — la
  correction ne dépend plus d'eux pour la *distance* affichée (filet de sécurité), mais
  `extraireGeoPoint` reste le point unique de défaillance silencieuse : si le nom du champ
  géographique réel diffère de `geom`/`geo_point_2d`, toutes les stations seront simplement
  exclues (liste vide) plutôt que mal positionnées — comportement dégradé mais sans donnée fausse.
- Toujours pas de vérification visuelle dans un navigateur réel (sélecteurs, toggle, cartes
  station) : validé uniquement par relecture de code, `tsc`, `eslint` et `next build`.
