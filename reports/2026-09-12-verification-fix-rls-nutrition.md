# Vérification : correctif RLS nutrition (3 fichiers migrés le 12/09)

Date : 2026-09-12

## Contexte

Session de vérification pure (aucune implémentation prévue) du correctif
commité en `3742bb4` (« Corrige 3 pages Nutrition cassées par la migration
RLS deny-all du 11/09 ») :

- `src/app/(app)/nutrition/journal/page.tsx`
- `src/app/(app)/nutrition/recettes/page.tsx`
- `src/app/(app)/nutrition/recettes/[id]/page.tsx`

Ce correctif migre ces 3 pages de `createClient()` (client public, bloqué
par la RLS deny-all) vers `createAdminClient()` (`src/lib/supabase/admin.ts`),
à l'identique du patron déjà appliqué le 11/09 (`1fbb53b`) sur 23 fichiers de
`src/app/actions/*.ts`. Il n'avait jamais pu être vérifié par `tsc`/`eslint`/
`build` faute d'exécution de commandes possible dans les sessions précédentes.

## Phase 1 — Sync + relecture

`git checkout kilio && git fetch origin kilio && git reset --hard origin/kilio`
→ HEAD à `cc56040` (déjà à jour, rien à récupérer).

Relecture des 3 fichiers + `src/lib/supabase/admin.ts` + un exemple des 23
fichiers déjà migrés (`src/app/actions/journal.ts`) : le patron est respecté
à l'identique dans les 3 fichiers — même import `createAdminClient` depuis
`@/lib/supabase/admin`, même usage synchrone (pas d'`await` sur la création
du client, contrairement à l'ancien `createClient()` de `server.ts`), même
générique `Database`, et aucun appel Supabase resté sur l'ancien client dans
ces 3 fichiers (vérifié par lecture complète, pas seulement les imports).

Vérification base (`execute_sql` sur `vsmtkopkqasrdnjceegp`) : les 4 tables
`recettes`, `journal_repas`, `objectifs_nutritionnels`, `aliments` sont bien
toutes en `rls_enabled = true` avec **0 policy** — cohérent avec la migration
deny-all du 11/09, aucun décalage repo/DB.

## Phase 2 — Vérifications

`node_modules` était absent du sandbox (jamais installé) → `npm ci` exécuté
en préalable (409 paquets, 0 vulnérabilité) pour rendre `tsc`/`eslint`/`build`
exécutables.

### `npx tsc --noEmit`

✅ **Vert.** Une seule erreur en première exécution
(`src/app/layout.tsx(41,50): error TS2304: Cannot find name 'LayoutProps'`),
sans rapport avec le correctif : `LayoutProps<"/">` est un type global généré
par Next.js dans `.next/types/`, absent tant qu'aucun build n'a tourné dans
le sandbox. Confirmé faux positif : une fois `.next/types` généré (via
`npm run build`), un nouveau `tsc --noEmit` isolé passe sans aucune erreur.
Aucune correction nécessaire, aucun fichier touché.

### `npx eslint .`

✅ **Vert dès la première exécution.** 0 erreur, 0 warning sur tout le repo,
y compris les 3 fichiers du correctif.

### `npm run build`

⚠️ **Non vérifiable de bout en bout dans ce sandbox — limitation
d'environnement, sans rapport avec le correctif.**

- `✓ Compiled successfully` et `Finished TypeScript` (phase interne de
  `next build`) passent sans erreur — donc la compilation Turbopack et le
  typecheck complet du projet, correctif inclus, sont verts.
- La phase de génération statique (`Generating static pages`) échoue en
  revanche systématiquement sur `/carburants`, **avant même d'atteindre les
  routes Nutrition** dans l'ordre de traitement des workers : l'erreur vient
  de `src/app/(app)/layout.tsx` → `getPreferencesNavigationResolues()`
  (`src/app/actions/preferences-navigation.ts`, un des 23 fichiers déjà
  validés le 11/09, hors périmètre de cette session) qui appelle
  `createAdminClient()` sans qu'aucune variable d'environnement Supabase ne
  soit présente dans ce sandbox (`NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` absentes — aucun `.env*`, gitignorés comme
  attendu).
- Test complémentaire (env de test uniquement, jamais commité) : en fournissant
  la vraie URL du projet (`https://vsmtkopkqasrdnjceegp.supabase.co`, non
  sensible) et une clé service_role factice, l'erreur change de nature —
  `Host not in allowlist: vsmtkopkqasrdnjceegp.supabase.co` — confirmant que
  **l'accès réseau sortant vers Supabase est bloqué pour le processus de
  build dans ce sandbox**, indépendamment des identifiants. Ce n'est donc pas
  seulement un problème de secrets manquants : `npm run build` ne peut pas
  aboutir dans cette session quel que soit le correctif appliqué, dès qu'une
  route non explicitement dynamique tente une requête Supabase au moment du
  build.
- Conséquence : **impossible de confirmer dans cette session que le build
  atteint effectivement `/nutrition/recettes` et `/nutrition/recettes/[id]`
  sans erreur**, le build s'arrêtant avant sur `/carburants` (hors périmètre).

### Signalé sans y toucher (hors périmètre de cette session)

- L'échec de build sur `/carburants` (`preferences-navigation.ts` via le
  layout partagé `(app)/layout.tsx`) est indépendant du correctif Nutrition
  et touche un fichier déjà validé le 11/09 — non modifié, conformément à la
  consigne.
- **Point d'attention pour Vincent, à trancher séparément :**
  `src/app/(app)/nutrition/recettes/[id]/page.tsx` exécute **5 requêtes
  Supabase en parallèle** (`Promise.all` sur `recettes`, `recette_ingredients`,
  `aliments`, `recette_ingredients_libres`, `recette_etapes`) dans un Server
  Component async **sans** `export const dynamic = "force-dynamic"` — soit
  exactement le même motif que celui qui a fait planter le build production
  de `/agenda` plus tôt aujourd'hui (`cc56040`, « Server Component async
  fetchant 5 sources Supabase », corrigé par l'ajout de ce flag). Contrairement
  à `journal/page.tsx` (qui a déjà `force-dynamic`), ni `recettes/page.tsx`
  (1 requête) ni `recettes/[id]/page.tsx` (5 requêtes) ne l'ont. Ce risque
  n'a pas pu être confirmé dans cette session (le build s'arrête avant
  d'atteindre ces routes) et n'a **pas** été corrigé ici : ajouter ce flag
  serait sortir du périmètre strict de cette vérification (aucune erreur
  observée sur ces fichiers dans cette session) et relève d'un refactor, pas
  d'une correction a minima. À surveiller après déploiement, ou à traiter
  dans une session dédiée si Vincent le souhaite.

## Phase 3 — Vérification finale

- `tsc --noEmit` (avec `.next/types` généré) : **0 erreur.**
- `eslint .` : **0 erreur, 0 warning.**
- `build` : compilation + typecheck internes verts ; génération statique non
  vérifiable de bout en bout dans ce sandbox (limitation réseau, voir
  ci-dessus, sans rapport avec le correctif).

## Corrections apportées

**Aucune.** Les 3 fichiers passent `tsc` et `eslint` sans modification. Le
seul changement de cette session est l'installation de `node_modules` (non
committé, `.gitignore`) pour rendre les vérifications exécutables.

## Verdict

Le correctif (`3742bb4`) est **sain du point de vue statique** :
compilation, typecheck complet et lint sont verts, le patron `createAdminClient()`
est appliqué à l'identique du reste du codebase, et la RLS deny-all en base
est cohérente avec le repo. Il est **prêt pour déploiement** sur ce plan.

Réserve : la génération statique complète (`npm run build` de bout en bout)
n'a pas pu être confirmée verte dans ce sandbox pour des raisons
d'environnement (réseau sortant vers Supabase bloqué), sans lien avec ce
correctif. Vincent est invité à surveiller le build Vercel après déploiement,
en particulier `/nutrition/recettes/[id]` (voir point d'attention ci-dessus).

## Fichiers modifiés

- `reports/2026-09-12-verification-fix-rls-nutrition.md` (ce rapport)

Aucun fichier de code modifié.
