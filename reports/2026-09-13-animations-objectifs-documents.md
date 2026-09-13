# Animations d'apparition/suppression — Objectifs & Documents — 2026-09-13

## Contexte

Réplication exacte du pattern d'animation déjà en place dans `src/app/(app)/nutrition/journal/JournalEntriesList.tsx` sur les listes **Objectifs** et **Documents**, sans rien inventer de nouveau. `AnimatedAddCard.tsx` (toggle d'ouverture des formulaires d'ajout) n'a pas été touché — il était déjà correct et hors scope.

## Pattern répliqué

Pour chaque item de liste (`ObjectifCard`, `DocumentCard`) :

```tsx
<motion.li
  layout
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.18 }}
  className={...}
>
```

Et la liste englobante enveloppée dans `<AnimatePresence initial={false}>` (comme dans `JournalEntriesList`) pour que l'animation `exit` se déclenche bien à la suppression.

Le fichier de référence `JournalEntriesList.tsx` n'utilise pas `useReducedMotion` sur ses items de liste (contrairement à `AnimatedAddCard.tsx`, qui l'utilise pour son propre toggle) : par cohérence stricte avec le pattern exact demandé, aucune logique de `prefers-reduced-motion` n'a été ajoutée aux items de liste d'Objectifs/Documents — ce serait ajouter à Objectifs/Documents une logique que Journal lui-même n'a pas.

## Fichiers modifiés

- `src/app/(app)/objectifs/ObjectifCard.tsx` — les deux `<li>` (mode édition et mode normal) deviennent `<motion.li>` avec les props ci-dessus.
- `src/app/(app)/objectifs/ObjectifsList.tsx` — chaque `<ul>` de sous-groupe (catégorie × statut) enveloppé dans `<AnimatePresence initial={false}>`. L'animation s'applique à chaque item individuel à l'intérieur de chaque groupe, pas au groupe lui-même (les groupes/sections ne sont pas animés, conformément à la consigne).
- `src/app/(app)/documents/DocumentCard.tsx` — les deux `<li>` (mode édition et mode normal) deviennent `<motion.li>`.
- `src/app/(app)/documents/DocumentsList.tsx` — ajout de `"use client"` (nécessaire pour `framer-motion`, absent jusqu'ici car le fichier n'avait pas de logique client) et `<ul>` enveloppé dans `<AnimatePresence initial={false}>`.

Aucun changement de schéma, de Server Action, ni de `AnimatedAddCard.tsx` / `AddObjectifToggle.tsx` / `AddDocumentToggle.tsx`.

## Aperçu du diff clé (`DocumentCard.tsx`, mode normal)

Avant :
```tsx
return (
  <li className={listCard}>
    <div className="flex items-center gap-3">
      ...
    </div>
    ...
  </li>
);
```

Après :
```tsx
return (
  <motion.li
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.18 }}
    className={listCard}
  >
    <div className="flex items-center gap-3">
      ...
    </div>
    ...
  </motion.li>
);
```

Et dans `DocumentsList.tsx` :
```tsx
// avant
<ul className="flex flex-col gap-2.5">
  {documents.map((document) => (
    <DocumentCard key={document.id} document={document} etiquettes={etiquettes} />
  ))}
</ul>

// après
<ul className="flex flex-col gap-2.5">
  <AnimatePresence initial={false}>
    {documents.map((document) => (
      <DocumentCard key={document.id} document={document} etiquettes={etiquettes} />
    ))}
  </AnimatePresence>
</ul>
```

## Skills consultées

- `vercel-react-best-practices` : aucune règle applicable à cette modification — pas de nouveau composant défini à l'intérieur d'un composant, pas d'effet ni de state ajouté, `layout`/`motion.li` de Framer Motion n'introduit pas de re-render supplémentaire côté React (l'animation est gérée par Framer Motion hors du cycle de rendu React).
- `web-design-guidelines` (Vercel) : la checklist mentionne le respect de `prefers-reduced-motion`. Écart assumé et documenté ci-dessus : le prompt demandait explicitement de ne pas ajouter de logique que Journal n'a pas — donc pas de `useReducedMotion` ajouté ici, par cohérence stricte avec le fichier de référence.
- Aucun bouton icône sans `aria-label` détecté dans `DocumentCard.tsx`/`ObjectifCard.tsx` (les boutons d'aperçu image/PDF avaient déjà leur `aria-label`, les boutons "Modifier"/"Suppr." ont un libellé textuel).

## Résultat des vérifications

- `npx tsc --noEmit` : **0 erreur** (après `npm install`, les dépendances n'étaient pas installées dans cet environnement de session ; l'erreur `LayoutProps` rencontrée avant tout `build` est pré-existante et liée aux types de routes Next.js générés par `next build`/`next dev`, sans rapport avec ce prompt — elle disparaît une fois `.next/types` généré).
- `npx eslint .` : **0 erreur, 0 warning**.
- `npm run build` : le build échoue en pré-rendu statique (`Host not in allowlist: ...supabase.co`), mais ce même échec est **reproductible à l'identique sur la tête de `kilio` avant toute modification** (vérifié via `git stash`) — c'est une limitation réseau propre à cet environnement de session (egress bloqué vers le projet Supabase), pas une régression introduite par ce prompt. La partie utile du build (`Compiled successfully`, `Running TypeScript` → `Finished TypeScript`) passe sans erreur sur les fichiers modifiés.

## Note pour le module Budget

Le module **Budget** est encore vide (pas de composant de liste) et n'a donc pas été touché, conformément à la consigne. Dès qu'il aura des composants de liste (items ajoutés/supprimés dynamiquement), le même pattern devra être appliqué :
- item de liste → `motion.li`, `layout`, `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0, y: -8 }}`, `transition={{ duration: 0.18 }}`
- liste englobante → `<AnimatePresence initial={false}>`

Référence à suivre : `src/app/(app)/nutrition/journal/JournalEntriesList.tsx` + ce rapport (notamment pour la question du `useReducedMotion`, volontairement absent des items de liste dans tout le codebase actuel).
