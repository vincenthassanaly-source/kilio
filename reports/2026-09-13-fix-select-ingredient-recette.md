# Fix : ingrédient pré-sélectionné par défaut dans le formulaire d'ajout

Date : 2026-09-13

## Problème

Dans le module Nutrition > Recettes, sur la page détail d'une recette, le
formulaire « + Ajouter l'ingrédient » (`AddIngredientForm`, dans
`src/app/(app)/nutrition/recettes/[id]/IngredientManager.tsx`) pré-sélectionnait
le premier aliment de la liste (ex. « Abricot ») dans le `<select>`, au lieu
de démarrer vide. Un utilisateur pouvait donc cliquer directement sur
« Ajouter » sans avoir volontairement choisi un ingrédient, et ajouter le
mauvais aliment sans s'en rendre compte.

## Correctif

Dans `AddIngredientForm` :

- `useState(aliments[0]?.id ?? "")` → `useState("")` : l'état `alimentId`
  démarre vide, aucun aliment n'est présélectionné.
- Ajout d'une option placeholder en tête du `<select>`, désactivée
  (`<option value="" disabled>Choisir un ingrédient…</option>`) et le
  `<select>` marqué `required`, pour empêcher toute soumission tant
  qu'aucun choix explicite n'a été fait.
- `selected = aliments.find((a) => a.id === alimentId) ?? aliments[0]`
  → `aliments.find((a) => a.id === alimentId)` (sans repli sur
  `aliments[0]`) : `selected` est désormais `undefined` tant que rien
  n'est choisi, au lieu de retomber silencieusement sur le premier aliment.
- Tout ce qui dépendait de `selected` adapté au cas `undefined` :
  - champ hidden `unite` : `value={selected?.unite ?? ""}`.
  - `placeholder` du champ quantité : texte générique « Quantité » tant
    qu'aucun ingrédient n'est choisi, sinon l'unité de l'aliment
    sélectionné (`g`, `ml`, `pièce`).
  - champ quantité désactivé (`disabled={!selected}`) tant qu'aucun
    ingrédient n'est choisi, pour guider l'utilisateur dans le bon ordre
    (choisir l'aliment, puis renseigner la quantité).
- Après un ajout réussi, le `useEffect` qui appelle `formRef.current?.reset()`
  réinitialise maintenant aussi l'état React `setAlimentId("")` : sans ça,
  le DOM du `<select>` revenait au placeholder après `reset()` mais l'état
  React `alimentId` restait sur la dernière valeur choisie (désynchronisation
  DOM/état), et `selected` restait donc calculé sur l'ancien aliment.

Aucune modification côté serveur : la garde existante dans
`src/app/actions/recette-ingredients.ts`
(`if (!recette_id || !aliment_id) { return { error: "Aliment requis." }; }`)
couvrait déjà le cas `aliment_id` vide et reste le filet de sécurité côté
serveur si le `required` HTML est contourné.

`IngredientsLibresManager.tsx` (formulaire des ingrédients libres, champ
texte libre sans `<select>`) non concerné, non touché.

## Vérification

- `npx tsc --noEmit` : aucune erreur (après `npm install`, les dépendances
  n'étaient pas installées dans cet environnement de session).
- `npx eslint .` : aucune erreur.
- `npm run build` (`next build`, Turbopack) : build réussi, toutes les
  routes compilent.
- Test manuel dans un navigateur non disponible dans cet environnement ;
  le comportement (select vide au chargement, bouton bloqué tant qu'aucun
  ingrédient n'est choisi, réinitialisation correcte après ajout) est à
  confirmer par Vincent une fois déployé.
