# Fix alignement WeekView — bande "tâches sans heure"

## Bug

Dans `WeekView.tsx`, chaque colonne de jour affichait sa bande "tâches sans
heure" (`dayTachesSansHeure.length > 0`) **au-dessus** du conteneur de grille
horaire (`<button style={{ height: gridHeight(zoom) }}>`), mais seulement
quand le jour en avait. Cette bande occupant un espace réel dans le flux
(`border-b`, `py-0.5`, contenu), le conteneur de grille de ce jour-là
démarrait ~20-24px plus bas que celui des autres colonnes.

Or `TimeGutter` (la gouttière d'heures, sticky à gauche) n'avait, elle,
jamais de bande équivalente : son axe d'heures démarrait toujours juste après
l'en-tête (`h-11`). Résultat : pour un jour avec tâche(s) sans heure, les
créneaux de travail et tâches avec heure (positionnés en absolu via
`minutesToPx`, relatifs au conteneur de grille de leur colonne) apparaissaient
décalés vers le bas par rapport aux heures réelles affichées dans la
gouttière — et par rapport aux autres colonnes de la même semaine qui, elles,
n'avaient pas cette bande.

## Fichiers modifiés

- `src/app/(app)/agenda/TimeGrid.tsx` : ajout de la constante exportée
  `UNSCHEDULED_BAND_HEIGHT` (24px), avec commentaire expliquant pourquoi cette
  réservation doit être identique partout.
- `src/app/(app)/agenda/WeekView.tsx` :
  - la bande "tâches sans heure" de chaque jour est désormais **toujours**
    rendue (plus de `dayTachesSansHeure.length > 0 &&`), à hauteur fixe
    `UNSCHEDULED_BAND_HEIGHT`, avec `overflow-hidden` pour ne jamais dépasser
    cette hauteur même si le contenu (titres tronqués, `+N`) voulait passer à
    la ligne ;
  - un spacer de la même hauteur (`UNSCHEDULED_BAND_HEIGHT`, avec la même
    bordure `border-line/60`) a été ajouté dans la colonne sticky de
    `TimeGutter`, entre l'en-tête (`h-11`) et `<TimeGutter />`.

## Approche choisie et pourquoi

Le correctif proposé dans la consigne était : « réserver une hauteur fixe
identique pour cette zone sur tous les jours (même vide) ». C'était
nécessaire mais pas suffisant : réserver la hauteur uniquement dans les
colonnes de jour aurait rendu **tous** les jours cohérents entre eux, mais
tous désalignés de la même valeur par rapport à `TimeGutter` (qui, elle,
n'aurait toujours eu aucune bande). Le vrai point de référence pour
l'alignement, c'est la gouttière d'heures sticky : c'est elle qui affiche les
heures réelles, donc c'est elle qui doit aussi porter la même réservation
d'espace.

D'où la solution retenue : une constante unique `UNSCHEDULED_BAND_HEIGHT`
utilisée à la fois comme hauteur de bande dans chaque colonne de jour et
comme hauteur de spacer dans la colonne de la gouttière. Ainsi, le conteneur
de grille de **chaque** colonne (y compris la gouttière) démarre exactement
au même point vertical, qu'il y ait ou non des tâches sans heure ce jour-là.

Alternative écartée : sortir l'affichage des tâches sans heure de la colonne
verticale (bande commune au niveau de la semaine, ou overlay/tooltip). Rejetée
car plus invasive visuellement (change la disposition connue de l'utilisateur)
et plus risquée sur le comportement de clic (`onSelectDay`) par jour, alors
que la solution retenue est un correctif purement géométrique qui conserve à
l'identique le rendu (titres tronqués, `+N`, clic pour sélectionner le jour)
pour les jours qui avaient déjà une bande, et ajoute simplement un espace
vide (avec une fine bordure, cohérente avec le reste du design) sous l'en-tête
des jours qui n'en avaient pas — un changement visuel mineur, au bénéfice de
la cohérence de la grille.

## Vérifications

- `npx tsc --noEmit` : une seule erreur préexistante et sans rapport
  (`src/app/layout.tsx` — `Cannot find name 'LayoutProps'`, un type généré par
  Next.js absent tant que `next build`/`next dev` n'a pas tourné ; confirmée
  présente aussi sur `HEAD` avant modification via `git stash`). Le build
  Next.js (`next build`) exécute lui-même une vérification TypeScript à
  l'aide des types de routes générés, et celle-ci passe sans erreur.
- `npx eslint .` : aucune erreur.
- `npm run build` : build de production réussi (Turbopack), toutes les pages
  compilées.
- Lecture du code de positionnement (`minutesToPx`, `gridHeight`,
  `TimeGutter`, `HourLines`, `WorkHoursBand`) : avec la réservation
  identique, le `top: 0` du conteneur de grille de chaque jour coïncide
  maintenant avec le `top: 0` de `TimeGutter`, donc `minutesToPx(m, zoom)`
  pointe vers la même position verticale absolue dans toutes les colonnes et
  dans la gouttière, qu'un jour ait ou non des tâches sans heure.
