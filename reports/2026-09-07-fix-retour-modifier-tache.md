# Fix : le bouton retour ferme "Modifier une tâche" au lieu de quitter la page

## Cause du bug

Dans `TaskCard` (module Tâches, `src/app/(app)/taches/TasksList.tsx`), le mode édition
(state local `editing`) affichait `AddTaskForm` avec un bouton "Annuler" qui fait
`setEditing(false)`, mais ce mode n'était pas synchronisé avec l'historique du
navigateur. Résultat : appuyer sur le bouton retour matériel/OS ne fermait pas le
formulaire d'édition comme le fait "Annuler" — il déclenchait la navigation
d'historique normale (retour à l'écran précédent) en laissant l'édition ouverte.

Le flux d'ajout de tâche (`AddTaskToggle.tsx`) n'a pas ce problème : il utilise déjà
le hook `useBackClose` (`src/hooks/useBackClose.ts`), qui pousse une entrée
d'historique tant que le panneau est ouvert et ferme le panneau (au lieu de laisser
le `popstate` remonter au routeur) quand cette entrée est quittée.

## Fichier modifié

`src/app/(app)/taches/TasksList.tsx` (composant `TaskCard`) :

```diff
+import { useBackClose } from "@/hooks/useBackClose";
 ...
   const [editing, setEditing] = useState(false);
+  useBackClose(editing, () => setEditing(false));
   const [expanded, setExpanded] = useState(false);
```

Aucun autre changement : le bouton "Annuler" et `onDone` restent inchangés.

`TaskCard` est le composant réellement utilisé pour afficher/éditer une tâche
partout dans le module — `DayView`, `ListView` et `ArchivedTasksSection` (agenda)
l'importent tous depuis `../taches/TasksList` et ne dupliquent pas la logique
d'édition. Cette correction s'applique donc automatiquement aux 4 écrans.

## Autres modes similaires repérés (à valider par Vincent)

Aucun autre state local de type "vue détaillée / mode édition plein écran" présentant
le même défaut n'a été trouvé dans `TasksList.tsx` ni dans `DayView.tsx`,
`ListView.tsx` ou `ArchivedTasksSection.tsx` :

- `expanded` (ligne ~267 de `TasksList.tsx`) contrôle uniquement l'affichage inline
  des sous-tâches (accordéon dans la carte, pas de remplacement de vue) — comportement
  différent de l'édition, pas traité comme un cas identique.
- `ArchivedTasksSection.tsx` a son propre `open` (repli/dépli de la section archivée),
  également un simple accordéon inline, pas un mode plein écran.

Aucun cas identique nécessitant correction n'a donc été trouvé ailleurs dans le module
Tâches.

## Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur (après `npm install` + `npm run build` pour
  générer les types Next.js manquants dans l'environnement).
- `npx eslint "src/app/(app)/taches/TasksList.tsx"` : ✅ aucune erreur.
- `npm run build` : ✅ build réussi (Next.js 16.3.3 / Turbopack), toutes les routes
  générées sans erreur.
