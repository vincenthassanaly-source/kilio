# Rappels de tâches : options « 1h avant » et « la veille »

## Objectif

Ajouter deux nouvelles options de rappel push sur les tâches — `60` (1h avant) et `1440` (1 jour avant / la veille) — en plus des `5`/`15`/`30` existantes. Pour les tâches « toute la journée » (sans heure précise), seule l'option `1440` est proposée, jamais sélectionnée par défaut : la notification part alors la veille à 18h00 (Paris), faute d'heure précise sur la tâche.

## Migration SQL

`scripts/migration-rappel-taches-1h-veille-2026-09-07.sql` (+ `-revert.sql`) : la contrainte `taches_rappel_minutes_check` passe de `in (5, 15, 30)` à `in (5, 15, 30, 60, 1440)` (`rappel_minutes is null` toujours autorisé).

Appliquée via `mcp__Supabase__apply_migration` sur le projet `vsmtkopkqasrdnjceegp`, puis vérifiée par relecture de `pg_get_constraintdef` :
```
CHECK (((rappel_minutes IS NULL) OR (rappel_minutes = ANY (ARRAY[5, 15, 30, 60, 1440]))))
```
État de la base avant migration : 107 tâches, 4 avec un rappel actif, 0 « toute la journée » — aucune ligne existante n'était affectée par le changement de contrainte.

Le `-revert.sql` recrée la contrainte d'origine `in (5, 15, 30)` ; un commentaire y documente qu'il échouera si des lignes portent encore `60`/`1440` au moment du revert (non géré automatiquement, comme demandé).

## `src/app/actions/taches.ts`

- `RAPPEL_MINUTES_VALEURS` étendu à `[5, 15, 30, 60, 1440] as const`.
- `parseTacheInput` : la valeur brute est d'abord validée contre `RAPPEL_MINUTES_VALEURS` (`rappel_minutes_valide`), puis :
  - **Toute la journée** : `rappel_minutes` n'est conservé que s'il vaut exactement `1440`, sinon `null` — aucune autre valeur n'a de sens sans heure précise, et aucun défaut n'est appliqué côté serveur.
  - **Heure précise** : logique inchangée, avec un garde-fou défensif supplémentaire — `rappel_minutes` reste `null` si `heure` est vide, même si le client envoyait une valeur (un rappel sans heure ni « toute la journée » n'a pas de sens).
- `updateTache` : `rappelObsolete` (comparaison `echeance`/`heure`/`rappel_minutes`) inchangée — elle couvrait déjà, sans modification nécessaire, le cas d'une tâche « toute la journée » dont l'`echeance` change.

## `src/app/(app)/taches/AddTaskForm.tsx`

- Le `<select id="rappel_minutes">` existant (affiché quand `!touteLaJournee && heure`) gagne deux options après « 30 min avant » : `1h avant` (`60`) et `1 jour avant (la veille)` (`1440`).
- Un second `<select name="rappel_minutes" id="rappel_minutes">` est ajouté, affiché uniquement quand `touteLaJournee` est vrai, avec seulement `Aucun` et `La veille à 18h` (`1440`) — même `name`, donc pas de collision `FormData` (un seul des deux montés à la fois). Le state `rappelMinutes` est partagé entre les deux.
- **Pas de défaut automatique** : rien n'a été ajouté pour présélectionner `1440` quand `touteLaJournee` passe à `true` — Vincent doit la sélectionner manuellement à chaque fois, comme spécifié. L'auto-set existant sur le champ `heure` (`rappelMinutes === "" → "5"`) reste inchangé et ne concerne que ce champ.
- La checkbox `toute_la_journee` gagne un `onChange` : si elle passe à `true` et que `rappelMinutes` porte une valeur autre que `""`/`"1440"` (résidu d'une saisie avec heure — `5`/`15`/`30`/`60`), elle est réinitialisée à `""` pour ne pas être soumise silencieusement (ces valeurs n'existent pas dans le select « toute la journée »).

## `supabase/functions/envoyer-rappels-taches/index.ts`

- La requête `candidates` unique est remplacée par deux requêtes distinctes, fusionnées ensuite :
  - `candidatesAvecHeure` : `fait=false, toute_la_journee=false, heure not null, rappel_minutes not null, rappel_envoye_le is null` (inchangé).
  - `candidatesJournee` : `fait=false, toute_la_journee=true, rappel_minutes=1440, rappel_envoye_le is null` (pas de filtre sur `heure`).
- `TacheCandidate.heure` devient `string | null` ; `tacheHeureUtcMs` retombe sur une constante `RAPPEL_JOURNEE_HEURE_ANCRAGE = "18:00:00"` quand `heure` est `null`, puis applique le même calcul générique (`- rappel_minutes * 60_000`) — `18h - 1440 min` donne bien la veille à 18h.
- Le texte du payload (`body`) est maintenant dérivé de `rappel_minutes` : `1440` → `"demain"`, `60` → `"dans 1h"`, sinon `"dans ${rappel_minutes} min"` (comportement 5/15/30 inchangé).
- Reste inchangé : envoi push, purge des abonnements expirés (404/410), marquage `rappel_envoye_le`.

Ce fichier est du Deno (edge function), hors périmètre `tsc`/`eslint` du projet Next — vérifié par relecture uniquement, pas de test automatisé existant sur ce fichier.

## Vérifications techniques

- `npm install` (dépendances absentes après checkout frais).
- `npx tsc --noEmit` : 0 erreur.
- `npx eslint . --ext .ts,.tsx` : 0 erreur, 0 avertissement.
- `npm run build` : succès (`✓ Compiled successfully`, 22 pages générées).
- `git status` après build : aucun fichier généré parasite (le bloc AGENTS.md n'a pas bougé).

## Confirmation du comportement « toute la journée »

Aucun défaut automatique : ni dans `AddTaskForm.tsx` (aucun `setRappelMinutes("1440")` déclenché par le passage à `touteLaJournee`), ni côté serveur (`parseTacheInput` ne fait que *conserver* `1440` si envoyé, jamais le générer). Vincent doit sélectionner `La veille à 18h` manuellement à chaque tâche « toute la journée » où il veut un rappel.
