# Pull-to-refresh généralisé aux 10 pages restantes — 2026-09-06

## Constats de la Phase 1

- `git fetch origin kilio && git reset --hard origin/kilio` : session synchronisée sur `origin/kilio` (`93a60e0`, fermeture des formulaires "+ Ajouter" via le bouton retour), aucun rattrapage nécessaire.
- Relecture de `src/components/PullToRefresh.tsx` : `children` + `onRefresh` optionnel, `router.refresh()` toujours appelé en interne (dans le `finally` du geste de fin de tiré) — donc aucun `onRefresh` n'est requis pour de simples pages serveur qui ne font que relire leurs données via `router.refresh()`.
- Relecture de `src/app/(app)/page.tsx` (Dashboard) comme référence : composant serveur `async function` qui importe `PullToRefresh` depuis `@/components/PullToRefresh` et enveloppe directement le contenu à rafraîchir, sans `onRefresh`, sans boundary particulière.
- Les 10 fichiers cibles ont été relus intégralement avant modification. Deux profils s'en dégagent :
  - 6 pages simples (`collection`, `objectifs`, `nutrition/recettes`, `budget/comptes`, `budget/categories`, `budget/recurrentes`) : une seule fonction serveur `async`, un seul `<div className="flex flex-col gap-...">` racine.
  - 4 pages `budget/*` déjà marquées `export const dynamic = "force-dynamic"` (`budget`, `budget/transactions`, `budget/statistiques`, `budget/calendrier`) — directive laissée strictement inchangée, le pull-to-refresh vient en complément et non en remplacement.

## Implémentation (Phase 2)

Dans chacun des 10 fichiers : import de `PullToRefresh` depuis `@/components/PullToRefresh`, puis le `<div>` racine retourné par la page devient l'unique enfant de `<PullToRefresh>…</PullToRefresh>` (sans `onRefresh`). Aucune autre ligne modifiée : requêtes Supabase, Server Actions, `searchParams`, directives `dynamic`, structure JSX interne et logique métier restent identiques à l'avant-modification — seule l'indentation du contenu déjà présent a changé du fait de l'imbrication supplémentaire.

Fichiers migrés :

- `src/app/(app)/collection/page.tsx`
- `src/app/(app)/objectifs/page.tsx`
- `src/app/(app)/nutrition/recettes/page.tsx`
- `src/app/(app)/budget/page.tsx`
- `src/app/(app)/budget/transactions/page.tsx`
- `src/app/(app)/budget/comptes/page.tsx`
- `src/app/(app)/budget/categories/page.tsx`
- `src/app/(app)/budget/statistiques/page.tsx`
- `src/app/(app)/budget/recurrentes/page.tsx`
- `src/app/(app)/budget/calendrier/page.tsx`

Pour les 4 pages avec `searchParams` (`transactions`, `categories`, `statistiques`, `calendrier`), le wrapping ne touche ni la lecture ni la propagation des paramètres : `PullToRefresh` ne fait que déclencher `router.refresh()`, qui recharge les données de la route courante (URL et query string inchangées) — aucun risque de perte de filtre lors d'un tiré vers le bas.

## Vérification (Phase 3)

- `npm install` : `node_modules` absent au démarrage de la session (jamais installé dans ce conteneur), installation nécessaire avant tout `tsc`/`eslint`/`build`.
- `npx tsc --noEmit` : aucune erreur après installation des dépendances et un premier `next build` (qui régénère les types de routes Next.js). Une erreur `src/app/layout.tsx(41,50): Cannot find name 'LayoutProps'` observée avant le premier build a été confirmée préexistante et non liée via `git stash` (identique sur `HEAD` avant toute modification) ; elle disparaît après génération des types par `next build`.
- `npx eslint .` : aucune erreur, aucun avertissement.
- `npx next build` : build de production (Turbopack) réussi, les 10 routes concernées (`/collection`, `/objectifs`, `/nutrition/recettes`, `/budget`, `/budget/transactions`, `/budget/comptes`, `/budget/categories`, `/budget/statistiques`, `/budget/recurrentes`, `/budget/calendrier`) sont bien générées, toutes marquées dynamiques (ƒ) comme attendu.
- **Vérification manuelle Playwright (mobile, `next start` local) : non réalisable dans cette session.** `next start` démarre correctement, mais toute page qui interroge Supabase échoue avec `Error: Host not in allowlist: vsmtkopkqasrdnjceegp.supabase.co` — la politique d'egress réseau de cet environnement d'exécution distant bloque l'accès au projet Supabase. Ce blocage a été confirmé **indépendant de cette migration** : il reproduit à l'identique sur `/` (Dashboard) et `/notes`, deux pages déjà équipées de `PullToRefresh` avant ce chantier et non modifiées ici. Aucune page de l'app (modifiée ou non) ne peut donc être rendue avec ses données réelles dans ce sandbox, ce qui empêche tout test de geste tiré-vers-le-bas via Playwright ici.
  - Ce point n'a pas été contourné (pas de mock Supabase, pas de modification des Server Actions) conformément à la consigne de ne rien changer d'autre que le wrapping.
  - La correction structurelle du wrapping (JSX identique au pattern Dashboard déjà en production sur 5 pages, `tsc`/`eslint`/`build` verts) donne un niveau de confiance élevé, mais **le passage manuel en navigateur mobile reste à faire dans un environnement disposant de l'accès réseau Supabase** (poste de Vincent, ou session avec egress autorisé) avant de considérer la Phase 3 entièrement close.

## Fichiers modifiés

10 fichiers, uniquement l'ajout de l'import `PullToRefresh` et l'enveloppe du `<div>` racine existant — aucune autre ligne de logique, requête, ou directive modifiée.
