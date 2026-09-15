# Recherche full-text élargie du module Tâches (titre + notes + tags + nom de liste)

Extension du champ de recherche de `/taches` : il filtrait jusqu'ici uniquement sur le titre et les notes de chaque tâche ; il porte désormais aussi sur les noms des tags associés et le nom de la liste de la tâche.

## Fichier modifié

- `src/app/(app)/taches/TachesView.tsx`

## Logique ajoutée

Dans le bloc de filtrage par recherche du `useMemo` (`filtered`), deux conditions supplémentaires s'ajoutent à `titreMatch`/`notesMatch`, toutes passées par `normalizeSearch` (aucune duplication de logique de normalisation) :

```tsx
const tagsMatch = tache.tags.some((tag) => normalizeSearch(tag.nom).includes(rechercheNormalisee));
const listeMatch = tache.liste ? normalizeSearch(tache.liste.nom).includes(rechercheNormalisee) : false;
if (!titreMatch && !notesMatch && !tagsMatch && !listeMatch) return false;
```

- `tache.tags` (tableau de `Tables<"tags">`, jamais `null`) est parcouru avec `.some()`, sans garde supplémentaire.
- `tache.liste` (`{ id, nom, couleur } | null`) est gardé par un ternaire avant l'accès à `.nom`, comme `tache.notes`.
- Aucune requête Supabase supplémentaire : `getTachesAvecRelations()` charge déjà `tags` et `liste`.
- Aucun changement au filtrage par vue (`vue`) ni par liste sélectionnée (`listeId`) : ces filtres restent en amont et cumulatifs (ET logique) avec le filtre texte.
- Placeholder du champ (`"Rechercher une tâche…"`) et message d'absence de résultat inchangés.

## Vérifications (Phase 3)

- `npx tsc --noEmit` : aucune erreur introduite. Une seule erreur pré-existante et sans rapport (`src/app/layout.tsx:41` — `LayoutProps` non généré avant `next build`), confirmée en dehors du diff via `git stash` (présente aussi sans la modification). `npm run build` régénère les types Next.js et son propre passage TypeScript est propre (voir plus bas).
- `npx eslint "src/app/(app)/taches/TachesView.tsx"` : aucun avertissement.
- `npm run build` : build de production réussi, les 24 routes (dont `/taches`) compilent normalement.
- Vérification manuelle : identifiants Supabase absents de cet environnement d'exécution (pas de `.env`), donc `/taches` ne peut pas être chargée en conditions réelles ici. Cas à vérifier manuellement en environnement réel :
  - Recherche sur un mot présent uniquement dans le nom d'un tag → la tâche doit apparaître.
  - Recherche sur un mot présent uniquement dans le nom d'une liste → la tâche doit apparaître.
  - Recherche sur un mot présent dans le titre ou les notes → comportement inchangé.
  - Recherche combinée avec un filtre de vue (ex. « En retard ») ou de liste sélectionnée → les deux filtres restent cumulatifs (ET logique), pas de régression.

## Confirmation

Diff minimal et localisé au bloc de filtrage texte de `TachesView.tsx` : aucun changement de schéma, de requête, de placeholder ni de message d'absence de résultat.
