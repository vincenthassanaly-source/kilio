# Documents — suppression complète de la fonctionnalité « dossiers »

## Contexte

Suite à la suppression de la création de dossier (rapport
`2026-09-11-fix-select-tri-documents.md`), le reste de la fonctionnalité
« dossiers » du module Documents (icône de gestion, filtre, affectation d'un
document à un ou plusieurs dossiers, page de gestion) devenait orpheline.
Vincent a demandé de supprimer également l'icône et toute la partie
dossiers.

## Fichiers modifiés / supprimés

**Supprimés :**
- `src/app/(app)/documents/dossiers/` (page de gestion, `DossiersManager`,
  `loading.tsx`)
- `src/app/(app)/documents/dossiers-tree.ts` (`aplatirDossiers`,
  `libelleDossier`)

**Modifiés — retrait de toute référence aux dossiers :**
- `src/app/(app)/documents/DocumentsBrowser.tsx` : suppression de l'icône
  "Gérer les dossiers" (lien vers `/documents/dossiers`) et de la rangée de
  pills de filtre par dossier, du state `dossierFilter`, de la fonction
  `toggleDossierFilter`, et du critère `matchesDossiers` dans la recherche.
- `src/app/(app)/documents/DocumentForm.tsx` : suppression du bloc
  "Dossiers (optionnel)" (sélection multiple de dossiers) et du state
  `dossierIds`.
- `src/app/(app)/documents/DocumentCard.tsx` et
  `src/app/(app)/documents/[id]/DocumentDetail.tsx` : suppression des
  badges de dossiers affichés sous le nom du document.
- `src/app/(app)/documents/AddDocumentToggle.tsx`,
  `src/app/(app)/documents/DocumentsList.tsx`,
  `src/app/(app)/documents/page.tsx`,
  `src/app/(app)/documents/[id]/page.tsx` : retrait de la prop `dossiers`
  devenue inutile dans toute la chaîne de composants.
- `src/app/actions/documents.ts` : suppression des actions serveur
  `getDossiers`, `renameDossier`, `deleteDossier`, de la fonction interne
  `syncDocumentDossiers` (sync de la table de jointure
  `documents_dossiers`), de `parseDossierIds`, et du champ `dossiers` sur
  le type `DocumentAvecFichiers` — la requête `getDocuments`/`getDocument`
  ne joint plus `documents_dossiers`.

## Ce qui n'a pas été touché

- **Base de données** : les tables Supabase `dossiers` et
  `documents_dossiers` n'ont pas été supprimées ni modifiées — seul le
  code applicatif qui les utilisait a été retiré. Le fichier généré
  `src/lib/supabase/types.ts` (miroir du schéma) continue donc de les
  lister, ce qui est normal et sans impact (aucun code ne les référence
  plus). Une suppression des tables elles-mêmes n'a pas été demandée et
  n'a pas été effectuée.
- Le module Étiquettes (`/documents/etiquettes`), fonctionnellement
  distinct (affectation exclusive, pas de hiérarchie), reste inchangé.

## Vérification

- `npx tsc --noEmit` : ✅ aucune erreur (après régénération de
  `.next/types` via `npm run build`, la route `/documents/dossiers`
  supprimée y laissait une référence obsolète le temps d'un rebuild).
- `npx eslint .` : ✅ aucune erreur ni avertissement sur l'ensemble du
  dépôt.
- `npm run build` : ✅ build de production réussi ; la route
  `/documents/dossiers` n'apparaît plus dans la liste des routes générées.
- Recherche exhaustive (`grep -rn` sur `src/`) : aucune référence
  résiduelle à `dossier`/`Dossier` dans le code applicatif en dehors du
  fichier de types généré par Supabase.

## Limitations connues

- Non testé sur le rendu réel de `/documents` (pas de variables
  d'environnement Supabase configurées dans cet environnement pour lancer
  `next dev` avec de vraies données) — vérifié par lecture de code et par
  le succès du build de production, qui type-check et prérend toutes les
  routes.
