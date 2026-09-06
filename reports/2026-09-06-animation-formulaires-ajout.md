# Animation d'ouverture/fermeture des 14 formulaires "+ Ajouter"

Date : 2026-09-06

## Objectif

Les 14 formulaires "+ Ajouter" de l'app partagent rigoureusement le même pattern présentationnel (`if (!open) return <bouton addCard>; return <div card>...</div>;`) mais basculaient instantanément entre les deux états, sans transition. Chantier : animer cette bascule (fondu + léger scale) partout, sans toucher à la logique métier (état, `useBackClose`, `onSaved`, `useActionState`, etc.) de chacun.

## Composant `AnimatedAddCard`

Nouveau fichier : `src/components/AnimatedAddCard.tsx`.

```tsx
export function AnimatedAddCard({
  open,
  trigger,
  children,
}: {
  open: boolean;
  trigger: ReactNode;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.18 };
  const initial = reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 };
  const animate = { opacity: 1, scale: 1 };
  const exit = reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {open ? (
        <motion.div key="content" initial={initial} animate={animate} exit={exit} transition={transition}>
          {children}
        </motion.div>
      ) : (
        <motion.div key="trigger" initial={initial} animate={animate} exit={exit} transition={transition}>
          {trigger}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

Choix techniques :

- **`AnimatePresence mode="wait"`** : le bouton fermé et le formulaire ouvert ont des hauteurs très différentes ; sans `mode="wait"`, les deux instances resteraient montées en parallèle pendant leur transition croisée (fade-out de l'une superposé au fade-in de l'autre), provoquant un chevauchement visuel disgracieux. `mode="wait"` attend la fin de la sortie (`exit`, 180 ms) avant de monter puis animer l'entrée (`enter`, 180 ms) du nouvel état — transition totale ~360 ms, propre et sans saut.
- **`initial={false}` sur `AnimatePresence`** : empêche l'état déjà monté au tout premier rendu de jouer une animation d'entrée — pas de fondu parasite au chargement initial de la page (vérifié visuellement en Phase 3, cf. ci-dessous).
- **`key="trigger"` / `key="content"`** distincts sur les deux `motion.div` : indispensable pour qu'`AnimatePresence` identifie correctement le démontage/remontage entre les deux états et déclenche l'`exit` du bon côté.
- **`useReducedMotion()`** (exactement comme dans `BottomNav.tsx`, cf. Phase 1) : neutralise la transition (`duration: 0`, pas de `scale`) si l'utilisateur préfère moins de mouvement — même limite documentée dans `BottomNav.tsx` : ces animations passent par les mutations directes de `transform`/`opacity` de framer-motion (Web Animations API), pas par `transition` CSS, donc les règles déjà présentes dans `globals.css` n'ont aucune prise dessus ; `useReducedMotion()` est la seule approche effective.
- Le composant est **présentationnel pur** : il ne connaît ni `useState`, ni `useBackClose`, ni aucune logique métier — il reçoit `open` en prop et se contente d'animer `trigger` / `children` autour de cette valeur.

## Fichiers migrés (14/14)

Dans chaque fichier, seul le `return` final a changé : `if (!open) return X; return Y;` devient `const trigger = X; return <AnimatedAddCard open={open} trigger={trigger}>{Y}</AnimatedAddCard>;`. Aucun state, hook ou callback n'a été touché.

| Fichier | Particularité conservée à l'identique |
|---|---|
| `collection/AddCollectionToggle.tsx` | `useActionState(createCollection, ...)`, `useEffect` de fermeture auto sur succès, `useBackClose` |
| `objectifs/AddObjectifToggle.tsx` | — |
| `notes/AddNoteToggle.tsx` | `defaultOpen`, `onSaved`, `useBackClose`, `dynamic(() => import(...), { ssr: false })` |
| `habitudes/AddHabitudeToggle.tsx` | `onSaved` |
| `taches/AddTaskToggle.tsx` | `onSaved`, prop `label` personnalisable |
| `taches/listes/AddListeToggle.tsx` | — |
| `taches/listes/AddTagToggle.tsx` | — |
| `budget/transactions/AddTransactionToggle.tsx` | early `return null` (avant le `if (!open)`) quand `comptes`/`categories` sont vides — **conservé tel quel, en dehors du wrapper** |
| `budget/comptes/AddCompteToggle.tsx` | — |
| `budget/categories/AddSousCategorieToggle.tsx` | pattern visuel différent (`ghostButton` + carte à bordure pointillée, pas `addCard`/`card`) — `AnimatedAddCard` étant agnostique du contenu, aucune adaptation nécessaire |
| `budget/categories/AddCategorieToggle.tsx` | — |
| `budget/recurrentes/AddRecurrenceToggle.tsx` | early `return null` (idem transactions) |
| `courses/AddCourseToggle.tsx` | — |
| `nutrition/recettes/AddRecetteToggle.tsx` | `dynamic(() => import(...), { ssr: false })` |

Pour les deux fichiers à early `return null` (`AddTransactionToggle`, `AddRecurrenceToggle`), ce garde-fou reste avant tout rendu du toggle — non touché par le chantier, puisqu'il court-circuite le composant avant même d'atteindre `AnimatedAddCard`.

## Vérifications (Phase 3)

### Vérifications statiques

- `npx tsc --noEmit` : ✅ aucune erreur (après `npm install`, les dépendances n'étaient pas installées au démarrage de la session ; installées via `npm install` sans autre changement).
- `npx eslint .` : ✅ aucune erreur ni avertissement sur tout le repo.
- `npx next build` : ✅ build de production (Turbopack) réussi, TypeScript vérifié en interne sans erreur, 22 routes générées, aucune régression.

### Vérification manuelle (Playwright + Chromium headless, viewport mobile 390×844)

Ce sandbox n'a pas d'accès réseau sortant vers le projet Supabase réel (`Host not in allowlist: vsmtkopkqasrdnjceegp.supabase.co`). Pour exécuter une vraie vérification E2E des pages compilées (et pas seulement d'un composant isolé), un stub HTTP local imitant l'API PostgREST a été lancé le temps des tests (`http://127.0.0.1:4321`, répond avec des listes/lignes fabriquées pour chaque requête REST), avec `NEXT_PUBLIC_SUPABASE_URL` repointé dessus **temporairement** dans `next.config.ts`. **Ce stub et ce repointage ont été entièrement retirés après les tests** — `git diff next.config.ts` est vide dans l'état final, et `git status` ne montre que les 14 fichiers migrés + `AnimatedAddCard.tsx`.

Résultats sur les 4 pages demandées, toutes servies par `next start` (build de production) :

- **Notes** (`/notes`) : ouverture → transition douce (fondu + scale, ~360 ms), formulaire visible. `useBackClose` : après ouverture, `page.goBack()` referme bien le formulaire (retour au bouton "+ Ajouter une note"). **Soumission réelle** (titre + contenu remplis, clic "Créer la note" via le stub qui simule un insert réussi) : le formulaire se referme, ET une requête de refetch vers `/notes` est bien observée juste après (5 requêtes réseau vers `/notes` après soumission contre 3 avant) — confirme que `onDone` → `setOpen(false)` + `onSaved?.()` (câblé à `queryClient.invalidateQueries({ queryKey: queryKeys.notes })` dans `NotesGrid.tsx`) se déclenche toujours correctement à travers le nouveau wrapper animé. Une première tentative de soumission sans remplir le champ "Contenu" a correctement affiché l'erreur de validation existante ("Le contenu est requis.") sans fermer le formulaire — comportement inchangé, bonus de confiance que l'affichage d'erreur reste compatible avec l'animation.
- **Objectifs** (`/objectifs`) : ouverture/fermeture ("Annuler") animées sans saut. Testé aussi avec `reducedMotion: 'reduce'` (contexte Playwright) : le formulaire est visible dès ~20 ms après le clic (transition neutralisée, pas d'attente de 360 ms) — confirme `useReducedMotion()` opérationnel sur une vraie page.
- **Budget/Transactions** (`/budget/transactions`) : avec un compte et une catégorie fournis par le stub (cas normal, `comptes.length > 0 && categories.length > 0`), ouverture/fermeture animées normalement. Le early `return null` (cas `comptes`/`categories` vides) n'a pas été re-testé en conditions réelles ici — confirmé par lecture de code : cette ligne est strictement inchangée par la migration (diff `git diff` la montre identique, seule la partie sous le `if (!open)` a bougé).
- **Collection** (`/collection`) : ouverture/fermeture animées. `useBackClose` : `page.goBack()` referme bien le formulaire de création de collection, comme avant.

Aucune exception JS dans la console sur les 4 pages, dans aucun des scénarios testés (ouverture, fermeture, retour navigateur, soumission réussie, soumission en erreur, reduced-motion).

### Vérification isolée du composant (complément)

Avant de mettre en place le stub PostgREST, `AnimatedAddCard` a d'abord été testé seul via une route temporaire (`src/app/anim-test-tmp/`, entièrement supprimée après usage) rendant le composant avec un trigger/contenu factices, hors de toute dépendance Supabase — confirmant indépendamment : pas d'animation parasite au premier montage (opacité 1 dès le chargement), transition ouverture/fermeture propre, et neutralisation complète du `transform` en mode `reducedMotion` (`transform: none` observé, apparition quasi instantanée).

## Résumé des exceptions rencontrées

- Aucune des 14 migrations n'a nécessité d'adaptation particulière au-delà du remplacement mécanique du `return` final — y compris le fichier visuellement différent (`AddSousCategorieToggle.tsx`, `ghostButton` + bordure pointillée) puisque `AnimatedAddCard` est agnostique du contenu qu'il anime.
- Seule contrainte réelle de l'environnement (pas du code) : absence d'accès réseau sortant vers Supabase dans ce sandbox, contournée par un stub PostgREST local strictement limité à la phase de vérification (jamais committé, aucune trace dans le diff final).

## Fichier créé

- `src/components/AnimatedAddCard.tsx`

## Fichiers modifiés (14)

- `src/app/(app)/collection/AddCollectionToggle.tsx`
- `src/app/(app)/objectifs/AddObjectifToggle.tsx`
- `src/app/(app)/notes/AddNoteToggle.tsx`
- `src/app/(app)/habitudes/AddHabitudeToggle.tsx`
- `src/app/(app)/taches/AddTaskToggle.tsx`
- `src/app/(app)/taches/listes/AddListeToggle.tsx`
- `src/app/(app)/taches/listes/AddTagToggle.tsx`
- `src/app/(app)/budget/transactions/AddTransactionToggle.tsx`
- `src/app/(app)/budget/comptes/AddCompteToggle.tsx`
- `src/app/(app)/budget/categories/AddSousCategorieToggle.tsx`
- `src/app/(app)/budget/categories/AddCategorieToggle.tsx`
- `src/app/(app)/budget/recurrentes/AddRecurrenceToggle.tsx`
- `src/app/(app)/courses/AddCourseToggle.tsx`
- `src/app/(app)/nutrition/recettes/AddRecetteToggle.tsx`
