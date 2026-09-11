# Sécurisation RLS + service_role — 2026-09-11

## Contexte

Alerte critique : les 39 tables du schéma `public` du projet Supabase Kilio
(`vsmtkopkqasrdnjceegp`) avaient Row-Level Security (RLS) désactivé.
N'importe qui disposant de la clé publique (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
exposée côté client) pouvait lire/modifier/supprimer toutes les données.

Constat de départ (confirmé) :
- `src/lib/supabase/client.ts` (client navigateur) n'est importé nulle part
  dans le repo — aucune requête directe depuis le browser.
- Les 23 fichiers de `src/app/actions/*.ts` passent tous par un client
  server-side utilisant la clé publique, sans session/auth réelle (app
  mono-utilisateur sans login).

## Ce qui a été fait

### 1. Nouveau client admin server-only

`src/lib/supabase/admin.ts` (nouveau) : `createClient` de
`@supabase/supabase-js` avec `SUPABASE_SERVICE_ROLE_KEY` — pas de gestion de
cookies (inutile, l'app n'a pas d'auth). Le `service_role` bypass RLS
nativement.

### 2. 23 fichiers `src/app/actions/*.ts` migrés vers le client admin

Import remplacé : `createClient` (`@/lib/supabase/server`) →
`createAdminClient` (`@/lib/supabase/admin`). Tous les appels
`await createClient()` → `createAdminClient()` (la fonction n'est plus
async), y compris les alias de type `Awaited<ReturnType<typeof createClient>>`
→ `ReturnType<typeof createAdminClient>`.

Fichiers modifiés :
- `budgets.ts`
- `categories-budget.ts`
- `collections.ts`
- `comptes.ts`
- `courses.ts`
- `documents.ts`
- `habitudes.ts`
- `journal.ts`
- `nettoyage.ts`
- `notes.ts`
- `notifications.ts`
- `objectifs-nutritionnels.ts`
- `objectifs.ts`
- `planning-travail.ts`
- `preferences-navigation.ts`
- `recette-etapes.ts`
- `recette-ingredients-libres.ts`
- `recette-ingredients.ts`
- `recettes.ts`
- `recherche.ts`
- `taches.ts`
- `transactions-recurrentes.ts`
- `transactions.ts`

### 3. Fichiers non touchés (vérifié, hors scope)

- `src/lib/supabase/server.ts` : conservé, encore utilisé par
  `src/lib/push/send.ts` (hors périmètre de cette tâche — pas un Server
  Action de `src/app/actions/`) et par deux Server Components
  (`nutrition/recettes/page.tsx`, `nutrition/recettes/[id]/page.tsx`,
  `nutrition/journal/page.tsx`).
- `src/lib/supabase/client.ts` : toujours inutilisé, laissé tel quel.

### 4. Migration RLS (appliquée)

`scripts/migration-enable-rls-deny-all-2026-09-11.sql` — `ENABLE ROW LEVEL
SECURITY` sur les 39 tables, sans policy (deny-all volontaire : cohérent
avec la convention Kilio « pas de RLS, pas de user_id », le `service_role`
bypass RLS nativement donc aucune policy à écrire/maintenir). Revert associé :
`scripts/migration-enable-rls-deny-all-2026-09-11-revert.sql`.

Appliquée via `mcp__Supabase__apply_migration` sur `vsmtkopkqasrdnjceegp`.
Vérifié après coup via `mcp__Supabase__list_tables` : les 39 tables ont
`rls_enabled: true`.

Tables migrées (39) :
`aliments`, `recettes`, `recette_ingredients`, `objectifs_nutritionnels`,
`journal_repas`, `notes`, `taches`, `courses_items`, `objectifs`,
`objectif_etapes`, `objectif_entries`, `comptes`, `categories_budget`,
`transactions`, `budgets`, `transactions_recurrentes`, `listes_taches`,
`tags`, `taches_tags`, `sous_taches`, `habitudes`, `habitude_entries`,
`recette_ingredients_libres`, `recette_etapes`, `tache_images`,
`push_subscriptions`, `horaires_travail_creneaux`, `note_items`,
`notes_tags`, `collections`, `collection_items`, `preferences_navigation`,
`horaires_travail_exceptions`, `documents`, `document_fichiers`,
`dossiers`, `documents_dossiers`, `etiquettes`, `reglages_nettoyage`.

## Vérifications

- **TypeScript** : `next build` → étape "Running TypeScript" → **0 erreur**
  sur les 23 fichiers modifiés (et sur le reste du repo).
- **ESLint** : `npx eslint .` → **0 erreur, 0 warning**.
- **RLS en base** : reconfirmé via `list_tables` — 39/39 tables à
  `rls_enabled: true`.
- **Build (`next build`)** : compile et type-check OK, mais échoue à
  l'étape de génération statique de `/agenda` avec `supabaseKey is
  required.` — **attendu** : `.env.local` local a été créé avec un
  placeholder vide pour `SUPABASE_SERVICE_ROLE_KEY` (la vraie valeur n'est
  récupérable que depuis le Dashboard Supabase, pas via les outils MCP
  disponibles ici, par conception). Ce n'est pas un défaut de code : ce
  layout (`src/app/(app)/layout.tsx`) appelait déjà la base pendant le
  build avant cette migration (comportement préexistant, inchangé). Avec la
  vraie clé renseignée, l'appel fonctionnera normalement — le
  `service_role` bypass RLS, donc un Server Action typique (ex. lecture de
  `notes` dans `getNotesAvecRelations`) continuera de fonctionner
  exactement comme avant, RLS activé ou non.

## Variable d'environnement à ajouter

`SUPABASE_SERVICE_ROLE_KEY` (secret serveur, **sans** préfixe
`NEXT_PUBLIC_`) :
- Ajoutée en local dans `.env.local` avec une valeur vide (placeholder) —
  **à remplir manuellement** depuis Supabase Dashboard → Project Settings →
  API → `service_role` key (jamais loggée/affichée par cette session).
- `.env.example` n'existe pas dans ce repo (`.env*` est gitignoré dans son
  ensemble) — rien à documenter là.

## ⚠️ Action requise avant le prochain déploiement

**Rien ne fonctionnera en production tant que `SUPABASE_SERVICE_ROLE_KEY`
n'est pas ajoutée manuellement sur Vercel** (Project Settings → Environment
Variables), pour tous les environnements concernés (Production/Preview).
Sans cette variable, tous les Server Actions de `src/app/actions/*.ts`
échoueront avec `supabaseKey is required.` — l'app est actuellement
cassée en l'état sur la branche tant que cette clé n'est pas configurée
sur Vercel.
