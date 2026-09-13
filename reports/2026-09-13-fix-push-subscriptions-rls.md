# Fix : `push_subscriptions` supprimées silencieusement (RLS sans policy) + suppression de code mort

Date : 2026-09-13

## Diagnostic

`src/lib/push/send.ts` (`envoyerNotificationPush`) utilisait `createClient()`
de `src/lib/supabase/server.ts` — un client **anon** (clé publique
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, soumis aux policies RLS) — pour faire
un `DELETE` sur `push_subscriptions` quand un endpoint push est mort (410/404).

Vérification base (`execute_sql` sur le projet Supabase `vsmtkopkqasrdnjceegp`) :

- `select rowsecurity from pg_tables where tablename='push_subscriptions'`
  → `rowsecurity = true`.
- `select * from pg_policies where tablename='push_subscriptions'` → **0 ligne**
  (aucune policy).

RLS activée sans aucune policy = **deny-all** : un client anon ne peut ni
lire, ni écrire, ni supprimer sur cette table. Le `DELETE` de `send.ts`
s'exécutait donc sans erreur mais sans effet (0 ligne affectée), ce qui
laissait les abonnements push morts s'accumuler indéfiniment en base au lieu
d'être purgés — un échec silencieux, cohérent avec le même motif RLS
deny-all déjà rencontré et corrigé ailleurs dans le repo (module Nutrition,
23 fichiers `src/app/actions/*.ts`) via `createAdminClient()` (clé
`service_role`, qui contourne RLS).

`grep -rn "supabase/client\|supabase/server" src` (avant modification) ne
retournait qu'une seule occurrence : l'import de `supabase/server` dans
`send.ts` lui-même. Aucun fichier n'importait `supabase/client.ts` —
confirmé code mort.

## Fichiers modifiés/supprimés

- **`src/lib/push/send.ts`** (modifié) : remplace l'import
  `createClient` (`@/lib/supabase/server`) par `createAdminClient`
  (`@/lib/supabase/admin`), et l'appel `await createClient()` par
  `createAdminClient()` (synchrone, comme dans tous les fichiers
  `src/app/actions/*.ts`). Le `DELETE` sur `push_subscriptions` passe
  désormais par la clé `service_role` et n'est plus bloqué par RLS.
- **`src/lib/supabase/client.ts`** (supprimé) : jamais importé nulle part
  dans le repo (vérifié par grep en Phase 1, ré-exécuté après coup — toujours
  aucune occurrence restante).

Aucun autre fichier ni logique métier touché.

## Vérifications (Phase 3)

`node_modules` était absent du sandbox (jamais installé) → `npm install`
exécuté au préalable (409 paquets, 0 vulnérabilité).

### `npx tsc --noEmit`

⚠️ Erreurs présentes, **toutes préexistantes et sans rapport avec ce
correctif** — confirmé en rejouant la même commande sur le HEAD non modifié
(`git stash` / `git stash pop`) : erreurs identiques (modules `react`,
`next/navigation`, `date-fns`, etc. non résolus sans build préalable, plus
`LayoutProps` non généré tant que `.next/types` n'existe pas). Aucune
nouvelle erreur introduite par les 2 fichiers touchés.

### `npx eslint .`

✅ **Vert.** 0 erreur, 0 warning sur tout le repo.

### `npx next build`

⚠️ Échec sur la génération statique de `/carburants` :
`Error: supabaseKey is required.` dans `src/lib/supabase/admin.ts`, appelé
depuis `src/app/actions/preferences-navigation.ts` (fichier non touché ici,
déjà migré vers `createAdminClient` le 11/09) via le layout partagé
`(app)/layout.tsx`. Confirmé **limitation d'environnement** en rejouant le
build sur le HEAD non modifié (stash) : erreur strictement identique. Cause :
aucune variable d'environnement Supabase (`NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`) n'est présente dans ce sandbox (aucun `.env*`).
La compilation Turbopack et le typecheck interne (`✓ Compiled successfully`,
`Finished TypeScript`) passent en revanche sans erreur, correctif inclus.
Ce n'est pas une régression : le même échec se produit à l'identique sans
le correctif.

## Confirmation Supabase (Phase 1)

- `push_subscriptions.rowsecurity` = `true`.
- `pg_policies` pour `push_subscriptions` = 0 ligne.
- → RLS deny-all confirmée, cohérente avec le diagnostic ci-dessus.

## Verdict

Correctif sain : `eslint` vert, `tsc`/`build` sans nouvelle erreur par
rapport au HEAD non modifié (erreurs 100 % préexistantes/environnementales).
Le patron `createAdminClient()` appliqué est identique à celui déjà en place
dans `src/app/actions/*.ts`.
