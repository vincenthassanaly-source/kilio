# Rappels d'échéances documents : migration vers pg_cron + pg_net

## Contexte

Le rappel des échéances de documents (module Documents) passait par un cron
GitHub Actions qui pingait une route API Next.js
(`/api/cron/echeances-documents`). Ce pattern était cassé (route en 404 sur
Production, secret GitHub `CRON_SECRET` vide) et reposait sur un
contournement de la limite des crons Vercel (plan Hobby).

Il est remplacé par le pattern déjà en place pour les rappels de tâches :
**pg_cron + pg_net dans Supabase, qui appelle directement une Edge
Function** — cf. `scripts/migration-cron-rappels-taches-2026-09-01.sql` et
`supabase/functions/envoyer-rappels-taches/index.ts`, repris à l'identique
dans leur structure.

## Fichiers ajoutés

- `supabase/functions/envoyer-rappels-documents/index.ts` — Edge Function
  Deno. Reprend la logique métier de l'ancienne route (seuils 30/7/1 jours
  avant `date_echeance`, garde anti-doublon via `derniere_alerte_envoyee_le`,
  envoi push via `web-push`, suppression des abonnements expirés en
  404/410), avec la même structure et le même style que
  `envoyer-rappels-taches` (garde `vapidConfigured`, client Supabase avec
  `SUPABASE_SERVICE_ROLE_KEY`). Contrairement à `envoyer-rappels-taches`,
  pas de gestion d'horaire fin (`isDue`/conversion de fuseau) : le job ne
  tourne qu'une fois par jour, donc une simple comparaison
  `date_echeance = aujourd'hui + N jours` suffit.
- `scripts/migration-cron-rappels-documents-2026-09-11.sql` — ajoute le job
  `rappels-documents` (`0 6 * * *`, soit 6h UTC) via `cron.schedule`. Ne
  recrée ni l'extension `pg_cron` ni les secrets Vault (`project_url`,
  `publishable_key`) : ils existent déjà depuis la migration
  `rappels-taches` et sont réutilisés tels quels.
- `scripts/migration-cron-rappels-documents-2026-09-11-revert.sql` —
  `cron.unschedule('rappels-documents')` uniquement (ne touche pas aux
  secrets Vault ni à l'extension, partagés avec `rappels-taches`).

## Fichiers supprimés

- `.github/workflows/echeances-documents.yml` (workflow GitHub Actions
  obsolète).
- `src/app/api/cron/echeances-documents/route.ts` — le dossier
  `src/app/api/cron/echeances-documents` a été supprimé, et comme il ne
  contenait que cette route, le dossier `src/app/api/cron` a également
  disparu (aucune autre route cron n'y résidait).

## Statut du déploiement Supabase (projet `vsmtkopkqasrdnjceegp`)

- **Edge Function** `envoyer-rappels-documents` déployée via
  `mcp__Supabase__deploy_edge_function` — statut `ACTIVE`, version 1,
  `verify_jwt: true` (confirmé via `list_edge_functions`).
- **Migration** appliquée via `mcp__Supabase__apply_migration` — le job
  `rappels-documents` (schedule `0 6 * * *`, actif) apparaît bien dans
  `cron.job` aux côtés de `rappels-taches` (confirmé via `execute_sql`).
- Secrets Vault `project_url` et `publishable_key` : déjà présents,
  réutilisés sans recréation (vérifié en amont).
- Secrets VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) :
  partagés au niveau du projet Supabase avec `envoyer-rappels-taches`,
  aucune reconfiguration nécessaire.

## Vérifications (Phase 3)

- `npx tsc --noEmit` : OK, aucune erreur.
- `npx eslint .` : OK, aucune erreur.
- `npm run build` : build de production réussi (Next.js/Turbopack) ; la
  route `/api/cron/echeances-documents` n'apparaît plus dans la liste des
  routes générées.

## À faire côté Vincent (hors périmètre de cette session)

`CRON_SECRET` n'est plus référencé nulle part dans le repo (recherche
`grep -r CRON_SECRET` sur `src/`, `.github/`, `scripts/`, `supabase/` : aucun
résultat, hormis une mention historique dans
`reports/2026-09-11-module-documents.md` qui documente l'ancien pattern et
n'a pas été modifiée). Il reste donc à supprimer manuellement, si plus
utilisée ailleurs :

- la variable d'environnement `CRON_SECRET` côté **Vercel** (Project
  Settings → Environment Variables) ;
- le secret GitHub Actions `CRON_SECRET` (repo → Settings → Secrets and
  variables → Actions).

Ces suppressions ne peuvent pas être faites depuis cette session (pas
d'accès à ces interfaces).
