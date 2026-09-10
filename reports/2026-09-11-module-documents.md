# Module "Documents importants" — 2026-09-11

## Résumé

Nouveau module Kilio pour stocker les papiers importants (identité, véhicule,
logement, santé, assurance...) avec une échéance optionnelle, et une brique
d'infrastructure de notifications push (réutilisable pour d'autres modules)
qui alerte 30, 7 et 1 jour(s) avant l'échéance via GitHub Actions + une route
API Next.js — pas de Vercel Cron, pour rester sur le plan gratuit.

## Ce qui a été fait

### Base de données
- `scripts/migration-documents-2026-09-11.sql` (+ `-revert.sql`) : table
  `documents` (schéma plat, pas de RLS, pas de `user_id`, `updated_at` géré
  par le trigger `set_updated_at()` déjà existant) et bucket Storage public
  `documents-fichiers` (policies select/insert/delete permissives, même
  pattern que `tache-images`).
- **Migration appliquée directement sur le projet Supabase `vsmtkopkqasrdnjceegp`**
  via l'outil MCP (`apply_migration`), pas seulement écrite en fichier.
- `src/lib/supabase/types.ts` régénéré (table `documents` insérée) pour que
  les Server Actions soient typées.

### Server Actions — `src/app/actions/documents.ts`
- `uploadDocumentFichier` : compresse les images via `sharp` (resize 1600px
  max, JPEG qualité 75, même pattern que `compresserEtUploaderPhoto` dans
  `collections.ts`) ; les PDF sont uploadés tels quels (`sharp` ne les
  supporte pas). Upload vers `documents-fichiers`, retourne l'URL publique
  et le `fichier_type` déduit du MIME type.
- `createDocument` / `updateDocument` (`useActionState`, pattern
  `TacheFormState`/`ObjectifFormState`) / `deleteDocument` (supprime aussi le
  fichier Storage via `extraireCheminStorage`, et redirige vers `/documents`
  comme `supprimerObjectif`).
- Une échéance modifiée réinitialise `derniere_alerte_envoyee_le` (même
  logique que `rappel_envoye_le` sur les tâches), pour ne pas perdre une
  alerte legitimate après un déplacement de date.
- `getDocuments()` triée par `date_echeance` croissant (nulls en dernier) et
  `getDocument(id)`.
- `revalidatePath("/documents")` (+ `/documents/[id]`) dans chaque mutation.

### Pages — `/documents`
- `/documents` : liste triée par proximité d'échéance (via `getDocuments`),
  badge rouge (`bg-alert/10 text-alert`) si l'échéance est à moins de 30
  jours, bouton d'ajout (photo ou PDF, nom, catégorie, échéance optionnelle,
  notes) — pattern `AnimatedAddCard` + `useActionState`, cohérent avec
  Notes/Objectifs.
- `/documents/[id]` : détail (aperçu `<img>` pour une image, lien "Ouvrir le
  PDF" pour un PDF), édition inline, suppression — pattern
  `ObjectifHeader`/`ObjectifDetailPage`.
- `loading.tsx` sur les deux routes (skeletons cohérents avec le reste de
  l'app).

### Navigation — `src/lib/navigation/registry.ts`
- `NavItem` `/documents` ajouté (icône dossier + cadenas dessinée en tracés
  vectoriels, dans le style des autres icônes du fichier), avec une teinte
  dédiée `--accent-documents` ajoutée dans `globals.css` (comme chaque
  module secondaire a la sienne).
- **Non ajouté** à `DEFAULT_MODULES_BARRE_BASSE` : accessible uniquement
  depuis la grille "Plus", comme demandé (même traitement que Carburants).

### Infra notifications push
- Dépendances ajoutées : `web-push` + `@types/web-push` (dev).
- `src/lib/push/send.ts` : `envoyerNotificationPush(subscription, payload)`,
  configure les clés VAPID au premier appel, et supprime la ligne
  `push_subscriptions` correspondante si l'endpoint répond 410/404 (abonnement
  expiré/révoqué).
- `src/app/api/cron/echeances-documents/route.ts` : route `GET` protégée par
  un header `Authorization: Bearer <CRON_SECRET>`. Cherche les documents dont
  `date_echeance` tombe exactement dans 30, 7 ou 1 jour(s) et dont
  `derniere_alerte_envoyee_le` n'est pas déjà aujourd'hui, envoie une
  notification à tous les `push_subscriptions`, puis met à jour
  `derniere_alerte_envoyee_le`.
- `.github/workflows/echeances-documents.yml` : `schedule: cron: "0 6 * * *"`
  (6h UTC = 7h hiver / 8h été, heure de Paris — ajustable), appelle la route
  via `curl -f -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"`.

## Vérifications (Phase 3)

- `tsc --noEmit` : aucune erreur.
- `eslint` : aucune erreur ni warning (un warning `no-unused-vars` initial a
  été corrigé).
- `next build` (Turbopack) : build complet réussi, `/documents`,
  `/documents/[id]` et `/api/cron/echeances-documents` bien générées.

## Variables d'environnement / secrets à configurer

| Variable | Où | Statut |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Vercel | Déjà existante (réutilisée telle quelle) |
| `VAPID_PRIVATE_KEY` | Vercel (env serveur) | **À ajouter**, clé privée du même paire VAPID que la clé publique déjà en place |
| `CRON_SECRET` | Vercel (env serveur) | **À ajouter** — valeur au choix, secret partagé avec GitHub Actions |
| `CRON_SECRET` | GitHub → Settings → Secrets and variables → Actions | **À ajouter avec la même valeur que sur Vercel** |

Si aucune paire de clés VAPID n'a encore été générée pour `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`npx web-push generate-vapid-keys` en génère une nouvelle (public + privée) —
mais si la clé publique est déjà utilisée en prod par `subscribeToPush()`
(`src/lib/push/subscribe.ts`), il faut réutiliser sa clé privée d'origine,
pas en régénérer une nouvelle (ça invaliderait les abonnements déjà
enregistrés côté navigateur).

## Écarts constatés avec l'état réel du repo/DB

- **DB** : conforme aux attentes du prompt — aucune table `documents` ne
  préexistait, la fonction `set_updated_at()` existait déjà (créée par
  `migration-budget-2026-08-30.sql`), aucun bucket `documents-fichiers`
  n'existait. Aucun écrasement de données existantes.
- **Domaine Vercel de Kilio** : je n'ai pas trouvé de projet "kilio" dans
  l'équipe Vercel accessible (`Kila` / `kila4`, un seul projet visible :
  `officio`). Le workflow GitHub Actions utilise `kilio.vercel.app` comme
  domaine, trouvé référencé dans un rapport précédent
  (`reports/2026-09-02-fluidite-ux-globale.md`) — **à vérifier/corriger par
  Vincent** dans `.github/workflows/echeances-documents.yml` si le domaine
  réel de production diffère.
- **Cron existant** : Kilio utilise déjà `pg_cron` + `pg_net` + une Edge
  Function Supabase pour les rappels de tâches
  (`migration-cron-rappels-taches-2026-09-01.sql`), un mécanisme différent de
  celui demandé ici (GitHub Actions + route API Next.js). Les deux
  coexistent sans conflit : ce choix suit explicitement la contrainte du
  prompt (rester sur le plan gratuit Vercel, pas de Vercel Cron).
