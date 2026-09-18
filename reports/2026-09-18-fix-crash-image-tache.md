# Fix crash page — création de tâche avec image jointe — 2026-09-18

## Diagnostic — confirmé

L'hypothèse de la consigne est confirmée par lecture de code et de la documentation Next.js embarquée dans `node_modules` (version installée : `16.3.3`, comme attendu).

- `next.config.ts` ne définissait effectivement aucune clé `experimental.serverActions.bodySizeLimit` (relu avant modification, seuls `env` et `images.remotePatterns` étaient présents).
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md` (doc correspondant à la version installée) confirme :
  > By default, the maximum size of the request body sent to a Server Action is 1MB [...] However, you can configure this limit using the `serverActions.bodySizeLimit` option.
  
  et que la syntaxe pour Next 16.3.3 reste bien `experimental.serverActions.bodySizeLimit` (pas encore stabilisée hors `experimental`).
- `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` confirme la même limite par défaut dans la section "Security" : *"Action requests are capped at 1MB by default."*
- `src/app/actions/taches.ts` (`createTache`, `updateTache`) : les erreurs venant de `uploadTacheImages` (sharp, Supabase Storage, insert `tache_images`) sont **déjà** interceptées par un `try/catch` et renvoyées proprement comme `TacheFormState.error` (lignes 218-224 et 272-278) — donc **aucune** erreur métier de ce flux ne pouvait déjà planter la page. Le crash ne pouvait donc venir que d'un échec **avant** l'exécution de la Server Action elle-même.
- `src/app/(app)/taches/AddTaskForm.tsx` utilise `useActionState` + `<form action={formAction}>` (le mécanisme standard React 19 / Next App Router). Quand la limite de taille du body est dépassée, Next.js rejette la requête HTTP (413) **avant** d'invoquer `createTache`/`updateTache` : le dispatcher interne de React pour les Server Actions ne reçoit alors pas le flux RSC attendu, ce qui se traduit par une exception non gérée côté client — remontée jusqu'à `src/app/(app)/error.tsx` (`ErrorState`), exactement le symptôme observé (crash generique, pas d'erreur inline dans le formulaire).
- Cohérent avec l'absence de toute erreur Postgres/Storage côté Supabase sur les dernières 24h : le code serveur (`createTache`/`uploadTacheImages`) ne s'exécute jamais dans ce cas, donc aucune requête n'atteint Supabase.

**Conclusion : cause racine confirmée**, sans réserve.

## Changement 1 — `next.config.ts`

Ajout de :

```ts
experimental: {
  serverActions: {
    bodySizeLimit: "4mb",
  },
},
```

### Justification de la valeur (4 Mo)

- Une photo prise directement avec l'appareil d'un téléphone dépasse très souvent 1 Mo (couramment 2 à 5 Mo pour une photo JPEG standard non compressée par l'app).
- Vercel impose une limite dure de **4,5 Mo** sur la taille du corps de requête pour ses Serverless Functions (Node.js), qui n'est **pas configurable** — elle s'applique indépendamment de `bodySizeLimit`. Une valeur Next.js supérieure à cette limite (ex. `10mb`, envisagée initialement dans la consigne) n'aurait donc rien changé en pratique une fois déployé sur Vercel : la requête aurait quand même été coupée à 4,5 Mo, potentiellement avec une erreur moins claire (rejet plateforme plutôt que rejet Next.js).
- `4mb` reste **sous** cette limite plateforme (marge de ~0,5 Mo pour l'overhead `multipart/form-data` — boundaries, en-têtes de partie — que la doc Next.js elle-même recommande de prendre en compte, de l'ordre de 10-20 Ko en temps normal, donc la marge est large), tout en couvrant la grande majorité des photos de téléphone réelles.
- Rappel : `uploadTacheImages` compresse déjà chaque image côté serveur avec `sharp` (redimensionnement à 1600px max, JPEG qualité 75) — mais **après** réception complète du body, donc cette compression n'aide en rien à éviter le rejet 413 en amont. Non modifié, comme demandé.

## Changement 2 — `src/app/(app)/taches/AddTaskForm.tsx`

Une image encore trop lourde après ce relèvement (HEIC très haute résolution, sélection multiple cumulée, etc.) déclencherait le même crash — ce échec-là ne peut **pas** être intercepté côté serveur (la requête n'atteint jamais `createTache`). La seule interception possible est **avant l'envoi**, côté client :

- Ajout d'une constante `MAX_IMAGES_TOTAL_BYTES = 3.8 Mo` (marge sous les 4 Mo configurés côté serveur).
- `handleFilesChange` calcule désormais la taille totale des fichiers sélectionnés (toutes les images du lot, `multiple` étant activé) et, si elle dépasse ce seuil :
  - affiche un message clair et dédié : *« Image trop volumineuse, réessayez avec une photo plus légère. »*, via un nouvel état local `imagesError` (indépendant de `state.error` issu de `useActionState`, donc **aucun changement** pour les erreurs métier existantes) ;
  - **restaure** la sélection précédente valide dans l'`<input type="file">` via `DataTransfer` (même technique déjà utilisée par `removeSelectedFile`) plutôt que de vider silencieusement l'input — sans ça, les vignettes affichées (état React `selectedFiles`, inchangé) auraient continué de montrer l'ancienne sélection alors que le `FileList` réellement soumis aurait été vide, un bug de désynchronisation UI/soumission.
- Le message s'affiche sous la zone d'ajout d'images, avec le même style (`errorText`) que l'erreur métier du formulaire, sans se substituer à elle.

Aucune modification de `createTache`/`updateTache`/`uploadTacheImages` (compression `sharp`, logique de rappel/heure) — le problème traité est strictement en amont, comme demandé.

## Vérification

- `npx tsc --noEmit` : ✅ aucune erreur (après un premier `npm run build`, nécessaire pour générer les types `LayoutProps`, absents avant tout build — non lié à ce chantier, déjà noté dans les rapports précédents).
- `npm run lint` (`eslint`) : ✅ aucune erreur ni avertissement.
- `npm run build` (`next build`, Turbopack) : ✅ compilation + type-check + génération des 24 routes réussies. Le log de build confirme explicitement la prise en compte de la config :
  ```
  - Experiments (use with caution):
    · serverActions
  ```
- Relecture du flux complet : une soumission avec une image simulée > 1 Mo (mais < 4 Mo) passera désormais la limite serveur et atteindra normalement `uploadTacheImages`. Une image > 3,8 Mo (seuil client) est bloquée avant l'envoi avec le message clair ; entre 3,8 Mo et 4 Mo (fenêtre de marge), la requête passerait la limite serveur sans avoir déclenché l'avertissement client — comportement attendu, cette marge existe pour absorber l'overhead multipart, pas pour laisser passer des cas limites au hasard.
- **Test manuel dans un navigateur (`next dev`) : non effectué**, comme dans les rapports précédents (`2026-09-06-dashboard-taches-disparition.md`, `2026-09-16-fix-dashboard-audit-constats-1-2.md`) — aucune variable d'environnement Supabase (`.env.local` absent) n'est disponible dans cet environnement d'exécution distant pour lancer `next dev` contre des données réelles.
  **Recommandation** : valider en usage réel (staging/prod `kilio`) :
  1. Créer une tâche avec une photo prise directement au téléphone (cas d'origine du bug) → doit réussir sans crash.
  2. Tenter une image délibérément énorme (> 3,8 Mo, ex. HEIC haute résolution) → doit afficher le message clair sans planter la page, et permettre de réessayer avec une image plus légère sans perdre le reste du formulaire déjà rempli.
  3. Confirmer qu'un flux normal (plusieurs photos raisonnables, retrait d'une image de la sélection avant envoi) reste inchangé.

## Rien d'autre ne dépend implicitement de l'ancienne limite de 1 Mo

- `experimental.serverActions.bodySizeLimit` est une config **globale** à `next.config.ts` : elle s'applique à toutes les Server Actions de l'app, pas seulement `createTache`/`updateTache`.
- Deux autres formulaires uploadent des fichiers via Server Actions et étaient exposés au **même** risque de crash (413 avant exécution de l'action) : `src/app/(app)/collection/[id]/AddPhotoButton.tsx` et `src/app/(app)/documents/DocumentForm.tsx` (tous deux `useActionState` + `<form action={formAction}>`). Le relèvement à 4 Mo les corrige eux aussi *au niveau de la limite serveur*, mais aucune validation client équivalente à celle ajoutée dans `AddTaskForm.tsx` n'a été ajoutée pour eux — **hors périmètre** de cette tâche (limitée au module Tâches), à considérer comme piste séparée si le même symptôme est rapporté sur Collection ou Documents.
- Aucun autre code du repo ne fait d'hypothèse explicite ou implicite sur une taille de body plafonnée à 1 Mo (pas de découpage manuel de payload, pas de retry conditionné à une taille, etc.).
