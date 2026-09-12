# Fix build production — `/agenda` prérendu statiquement — 2026-09-12

## Cause du crash

Le déploiement production (commit `3742bb4`) échouait au build avec :

```
Error occurred prerendering page "/agenda"
Error: Gateway Timeout
  at B (src/app/actions/taches.ts:586:20)
  at async j (src/app/(app)/agenda/page.tsx:7:56)
```

`src/app/(app)/agenda/page.tsx` est un Server Component `async` qui fetch cinq
sources Supabase en parallèle (`getTachesAvecRelations`, `getListes`, `getTags`,
`getPlanningTravail`, `getPlanningTravailExceptions`) sans
`export const dynamic = "force-dynamic"`. En l'absence de ce flag, Next.js
tente de pré-rendre la route statiquement au build (SSG), ce qui déclenche ces
requêtes DB dans l'environnement de build — où elles finissent en timeout
(`Gateway Timeout`), faisant échouer tout le build.

C'était la seule page du projet à fetch la DB côté serveur sans ce flag ; le
pattern `export const dynamic = "force-dynamic"` est déjà en place dans
`budget/page.tsx`, `budget/transactions/page.tsx`,
`budget/statistiques/page.tsx`, `budget/calendrier/page.tsx` et
`nutrition/journal/page.tsx`, avec le même commentaire justificatif (écritures
directes en base hors Server Action ⇒ route jamais mise en cache).

## Vérification de `taches/page.tsx`

`src/app/(app)/taches/page.tsx` a été inspectée : elle ne fetch **pas** la DB
côté serveur. C'est un composant non-async qui rend uniquement le shell
(titre) et délègue tout le chargement des données à `TachesView` côté client
via TanStack Query (skeleton pendant `isLoading`). Elle n'a donc pas le même
défaut et n'a pas été modifiée.

## Fichier modifié

`src/app/(app)/agenda/page.tsx` — ajout, juste après les imports et avant le
composant, au même format que les fichiers de référence :

```diff
 import { AgendaView } from "./AgendaView";
 import { screenTitle } from "@/lib/ui";

+// Les tâches/créneaux sont ajoutés quasi exclusivement en écriture directe en
+// base (hors Server Action) : cette route ne doit jamais rester en cache
+// (cf. /nutrition/journal, même pattern).
+export const dynamic = "force-dynamic";
+
 export default async function AgendaPage() {
```

Aucun autre fichier modifié — pas de refactor, pas de changement fonctionnel.

## Phase 3 — Vérification

- `npm install` : `node_modules` absent au démarrage de la session ; 409
  paquets installés, 0 vulnérabilité.
- `npx tsc --noEmit` : 0 erreur (une erreur `Cannot find name 'LayoutProps'`
  apparaissait avant tout build — le temps que `.next/types` soit généré ;
  confirmée disparue et sans lien avec le changement, identique avec et sans
  le fix via `git stash`).
- `npx eslint .` : 0 erreur.
- `npm run build` : ne peut pas être validé de bout en bout dans cet
  environnement, faute de secret `SUPABASE_SERVICE_ROLE_KEY` configuré (non
  committé, absent du sandbox). Sans ce secret, `createAdminClient()`
  (`src/lib/supabase/admin.ts:5`) lève `Error: supabaseKey is required` dès
  qu'une route sous `(app)/layout.tsx` est pré-rendue (le layout partagé
  appelle lui-même `getPreferencesNavigation` en Server Action) — c'est un
  problème d'environnement local préexistant, sans rapport avec ce fix
  (déjà documenté dans `reports/2026-09-12-taches-vue-en-retard.md`).

  Preuve que le fix fonctionne malgré cette limitation, par comparaison
  `git stash` :
  - **Sans le fix** (code de base `origin/kilio`) : le build échoue en
    pré-rendant **`/agenda`** en premier, avec la stack trace remontant
    jusqu'à `agenda/page.tsx` — confirmant qu'elle est bien tentée en
    prérendu statique.
  - **Avec le fix** : `/agenda` n'apparaît plus du tout dans la trace
    d'erreur ; le build échoue désormais sur une page complètement
    différente (`/carburants`, qui ne fetch aucune donnée serveur — l'échec
    vient uniquement du layout partagé, cf. ci-dessus). Cela confirme que
    `/agenda` est bien sortie du prérendu statique une fois le flag posé.

  L'étape TypeScript du build (`Running TypeScript ... Finished
  TypeScript`) passe sans erreur avant cet échec de pré-rendu, dans les deux
  cas.

## Écarts par rapport au prompt

`taches/page.tsx` n'a pas le même défaut (fetch côté client, pas de Server
Component async) : aucun correctif appliqué là, comme prévu par le prompt en
cas d'absence du défaut. Le build complet (`npm run build`) ne peut pas être
validé de bout en bout dans cet environnement faute de
`SUPABASE_SERVICE_ROLE_KEY` — limitation d'environnement documentée
ci-dessus, sans lien avec le fix `/agenda`.
