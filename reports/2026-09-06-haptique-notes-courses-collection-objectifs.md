# Extension du retour haptique — Notes, Courses, Collection, Objectifs

## Contexte

`src/lib/haptics.ts` (`vibrate()`) n'était appelé que dans 4 fichiers
(`DashboardHabitItem.tsx`, `DashboardTaskItem.tsx`, `HabitudeCard.tsx`,
`TasksList.tsx`), toujours en toute première ligne de `mutationFn`, avant
l'appel serveur — jamais dans `onMutate`/`onSettled`. Cette convention a été
reproduite à l'identique sur 5 nouveaux points d'ancrage, sans rien changer
d'autre au comportement des composants.

## Points d'ancrage ajoutés

1. **`src/app/(app)/notes/NoteCard.tsx` — `itemMutation.mutationFn`**
   `vibrate()` en première ligne, avant `toggleNoteItem(...)` (cocher/décocher
   un item de checklist).
2. **`src/app/(app)/notes/NoteCard.tsx` — `pinMutation.mutationFn`**
   `vibrate()` avant `toggleEpingle(...)` (épingler/désépingler). La
   `mutationFn` était une expression fléchée à corps unique
   (`() => toggleEpingle(...)`) ; passée en corps de bloc pour insérer l'appel
   avant le `return`.
3. **`src/app/(app)/courses/CoursesList.tsx` — `toggleMutation.mutationFn`**
   `vibrate()` en première ligne, avant `toggleCourseItem(...)` (cocher/décocher
   un article).
4. **`src/app/(app)/objectifs/[id]/ObjectifSuiviBinaire.tsx` — `onClick` du
   bouton "Marquer comme atteint" / "Remettre en cours"**
   Pas de `useMutation` ici (juste `useTransition` + server action) :
   `vibrate()` appelé de façon synchrone dans le `onClick`, avant
   `startTransition(...)`.
5. **`src/app/(app)/objectifs/[id]/ObjectifSuiviEtapes.tsx` — `onToggle` du
   `CheckToggle`**
   Même schéma : `vibrate()` avant `startTransition(() => toggleEtape(...))`.
6. **`src/app/(app)/collection/[id]/PhotosGrid.tsx` — `onClick` du bouton de
   suppression d'une photo (✕)**
   `vibrate()` avant `startTransition(() => deleteCollectionItem(...))`.

(6 points d'ancrage pour 5 fichiers, Notes en comptant deux.)

## Rationale — Collection : suppression plutôt que cochage

Le module Collection n'a aucune action de cochage (c'est une simple grille de
photos). Le commentaire de `haptics.ts` cite explicitement "confirmer une
suppression" comme second cas d'usage prévu pour `vibrate()` — la suppression
d'une photo (bouton ✕) est donc le geste tactile discret le plus proche de la
convention existante dans ce module, et le seul repéré.

## Rationale — exclusion volontaire de `ObjectifSuiviValeur.tsx`

Non modifié, comme demandé : son bouton "Enregistrer" valide une saisie
numérique dans un formulaire (submit), pas un geste de cochage/suppression
instantané. Ajouter `vibrate()` ici sortirait de la convention (qui ne couvre
que des interactions à un tap, sans étape de saisie intermédiaire) et
diluerait le signal haptique. Pour la même raison, les suppressions dans
Courses (`deleteCourseItem`) et Notes (`deleteNote`) n'ont pas été touchées :
seul le cochage y est couvert, en cohérence stricte avec la convention
observée sur Tâches/Habitudes.

## Vérifications effectuées

- `npx tsc --noEmit` : aucune erreur (après `npm ci` + `npx next build`
  pour régénérer les types Next.js — `node_modules` et `.next` absents en
  début de session).
- `npx eslint .` : aucune erreur ni warning.
- `npx next build` : build de production réussi, les 22 routes générées
  normalement, y compris `/notes`, `/courses`, `/collection/[id]`,
  `/objectifs/[id]`.
- Relecture des 6 diffs : dans chaque cas, `vibrate()` est le tout premier
  statement synchrone du handler/`mutationFn`, avant tout `await` ou
  `startTransition`, pour rester déclenché au plus près du geste utilisateur
  (condition nécessaire sur certains navigateurs pour que l'API Vibration
  accepte l'appel).
